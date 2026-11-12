/*
 * Lootle Worker.
 *
 * Static files in ./public are served by Cloudflare directly. Everything
 * under /api/ lands here. The answer bank lives only in this bundle, so the
 * browser never receives an answer it has not earned.
 *
 *   GET  /api/job?n=12        today's seven prompts (or ?free=1 for a random set)
 *   POST /api/answer          check a guess, record it, return its gem and rarity
 *   POST /api/bank            lock in a seam (also used when a seam is lost)
 *   GET  /api/reveal          every answer in a seam, once that seam is locked
 */
import { DurableObject } from "cloudflare:workers";
import { SEAMS } from "./seams/index.js";
import * as core from "./core.js";

const BY_ID = new Map(SEAMS.map((s) => [s.id, s]));
const PID = /^[a-z0-9-]{8,40}$/;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
const bad = (message, status = 400) => json({ error: message }, status);

/**
 * One instance per seam. Holds how often each answer has been given and
 * which players have dug this seam, in the instance's own SQLite database.
 */
export class SeamStore extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec("CREATE TABLE IF NOT EXISTS counts (answer TEXT PRIMARY KEY, c INTEGER NOT NULL)");
    this.sql.exec(
      "CREATE TABLE IF NOT EXISTS plays (pid TEXT NOT NULL, n INTEGER NOT NULL, done INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (pid, n))"
    );
  }

  counts() {
    const out = {};
    for (const row of this.sql.exec("SELECT answer, c FROM counts")) out[row.answer] = row.c;
    return out;
  }

  status(pid, n) {
    const rows = this.sql.exec("SELECT done FROM plays WHERE pid = ? AND n = ?", pid, n).toArray();
    return rows.length ? (rows[0].done ? "done" : "open") : "new";
  }

  /** First answer of a player on this seam for this dig. Counted at most once. */
  first(pid, n, answer, counted) {
    const state = this.status(pid, n);
    // Rarity is judged on the counts before this answer, so nobody demotes
    // their own gem by finding it.
    const counts = this.counts();
    if (state === "new") {
      this.sql.exec("INSERT INTO plays (pid, n, done) VALUES (?, ?, 0)", pid, n);
      if (counted) {
        this.sql.exec(
          "INSERT INTO counts (answer, c) VALUES (?, 1) ON CONFLICT (answer) DO UPDATE SET c = c + 1",
          answer
        );
      }
    }
    return { state, counts };
  }

  /** Lock the seam for this player: no more guesses, reveal allowed. */
  finish(pid, n) {
    const state = this.status(pid, n);
    this.sql.exec(
      "INSERT INTO plays (pid, n, done) VALUES (?, ?, 1) ON CONFLICT (pid, n) DO UPDATE SET done = 1",
      pid, n
    );
    return { state, counts: this.counts() };
  }

  /** Free digs reuse n = 0, so reopen the seam at the start of each one. */
  reopen(pid) {
    this.sql.exec("DELETE FROM plays WHERE pid = ? AND n = 0", pid);
  }

  canReveal(pid) {
    return this.sql.exec("SELECT 1 FROM plays WHERE pid = ? AND done = 1 LIMIT 1", pid).toArray().length > 0;
  }
}

const store = (env, seamId) => env.SEAM.get(env.SEAM.idFromName(seamId));

/**
 * If storage is unavailable (for example the free plan's daily quota is used
 * up) the game keeps running on the seed estimates instead of failing.
 */
async function orElse(promise, fallback) {
  try {
    return await promise;
  } catch (err) {
    console.error("storage unavailable:", err && err.message);
    return fallback;
  }
}

/** A daily dig number is accepted a day either side of UTC, to cover time zones. */
function validDaily(n) {
  const today = core.utcDigNumber();
  return Number.isInteger(n) && n >= 1 && n >= today - 1 && n <= today + 1;
}

function publicSeam(seam) {
  return { id: seam.id, cat: seam.cat, prompt: seam.prompt };
}

async function handleDig(url, env) {
  if (url.searchParams.get("free")) {
    const pid = url.searchParams.get("pid") || "";
    const seams = core.randomSeams(SEAMS);
    if (PID.test(pid)) await orElse(Promise.all(seams.map((s) => store(env, s.id).reopen(pid))), null);
    return json({ number: 0, seams: seams.map(publicSeam) });
  }
  const n = Number(url.searchParams.get("n"));
  if (!validDaily(n)) return bad("That job is not open.", 404);
  return json({ number: n, seams: core.seamsForDig(SEAMS, n).map(publicSeam) });
}

async function readBody(request) {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? body : null;
  } catch (e) {
    return null;
  }
}

/** Shared checks for the POST routes. Returns { seam, pid, n } or a Response. */
function parsePlay(body) {
  if (!body) return bad("Bad request.");
  const seam = BY_ID.get(String(body.seam || ""));
  const pid = String(body.pid || "");
  const n = Number(body.n);
  if (!seam) return bad("Unknown safe.");
  if (!PID.test(pid)) return bad("Bad player id.");
  if (n !== 0) {
    if (!validDaily(n)) return bad("That job is not open.", 404);
    if (!core.seamsForDig(SEAMS, n).some((s) => s.id === seam.id)) return bad("Safe is not in that job.");
  }
  return { seam, pid, n };
}

async function handleAnswer(request, env) {
  const body = await readBody(request);
  const play = parsePlay(body);
  if (play instanceof Response) return play;
  const { seam, pid, n } = play;
  const guess = typeof body.guess === "string" ? body.guess.slice(0, 60) : "";
  const again = body.again === true;
  const db = store(env, seam.id);

  const name = core.matchAnswer(seam, guess);
  if (!name) {
    // A missed second swing ends the seam; a missed first swing costs nothing here.
    if (again) await orElse(db.finish(pid, n), null);
    return json({ ok: false });
  }

  let result;
  if (again) {
    result = await orElse(db.finish(pid, n), { state: "open", counts: {} });
    if (result.state !== "open") return bad("That safe is already settled.", 409);
  } else {
    result = await orElse(db.first(pid, n, name, n !== 0), { state: "new", counts: {} });
    if (result.state === "done") return bad("That safe is already settled.", 409);
  }

  const { real, rows } = core.rarity(seam, result.counts);
  const mine = rows.find((r) => r.name === name);
  return json({
    ok: true,
    name,
    tier: mine.tier,
    pct: mine.pct,
    real,
    measured: real >= core.PRIOR_PLAYS,
    deeper: rows.filter((r) => r.tier > mine.tier).length,
  });
}

async function handleBank(request, env) {
  const play = parsePlay(await readBody(request));
  if (play instanceof Response) return play;
  await orElse(store(env, play.seam.id).finish(play.pid, play.n), null);
  return json({ ok: true });
}

async function handleReveal(url, env) {
  const seam = BY_ID.get(url.searchParams.get("seam") || "");
  const pid = url.searchParams.get("pid") || "";
  if (!seam || !PID.test(pid)) return bad("Bad request.");
  const db = store(env, seam.id);
  if (!(await orElse(db.canReveal(pid), true))) return bad("Finish that safe first.", 403);
  const { real, rows } = core.rarity(seam, await orElse(db.counts(), {}));
  return json({
    id: seam.id,
    real,
    measured: real >= core.PRIOR_PLAYS,
    note: seam.note || "",
    answers: rows.map((r) => ({ name: r.name, tier: r.tier, pct: r.pct })),
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return new Response("Not found", { status: 404 });
    try {
      if (request.method === "GET" && url.pathname === "/api/job") return await handleDig(url, env);
      if (request.method === "GET" && url.pathname === "/api/reveal") return await handleReveal(url, env);
      if (request.method === "POST" && url.pathname === "/api/answer") return await handleAnswer(request, env);
      if (request.method === "POST" && url.pathname === "/api/bank") return await handleBank(request, env);
      return bad("Not found.", 404);
    } catch (err) {
      console.error(err);
      return bad("The vault is jammed. Try again in a moment.", 500);
    }
  },
};
