/*
 * Lootle Worker.
 *
 * Static files in ./public are served by Cloudflare directly. Everything
 * under /api/ lands here. The answer bank lives only in this bundle, so the
 * browser never receives an answer it has not earned. The server also keeps
 * the score: it decides what each safe paid and credits the player's stash.
 *
 *   GET  /api/job?n=12        today's seven prompts (or ?free=1 for a random set)
 *   POST /api/answer          check a guess, record it, return its loot and rarity
 *   POST /api/risk            declare a second spin on a safe
 *   POST /api/bank            lock in a safe (also used when a safe is lost)
 *   GET  /api/reveal          every answer in a safe, once that safe is locked
 *   GET  /api/me              stash, items owned and the shop catalogue
 *   POST /api/buy             buy an item with the stash
 *   POST /api/use             use an item on the current safe
 *   POST /api/finish          record a finished job and say how it ranks
 *   GET  /api/health          liveness check for uptime monitors
 */
import { DurableObject } from "cloudflare:workers";
import { PACKS, VAULTS, HARD, SHORT, RETIRED, SEAMS } from "./seams/index.js";
import { DECOYS } from "./lexicon.js";
import { ITEMS, MAX_BUY, catalogue } from "./shop.js";
import * as core from "./core.js";

const BY_ID = new Map(SEAMS.map((s) => [s.id, s]));
const LEXICON = core.buildLexicon(SEAMS, DECOYS);
const PID = /^[a-z0-9-]{8,40}$/;
const MAX_BODY = 2048;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
const bad = (message, status = 400) => json({ error: message }, status);

/**
 * One instance per safe. Holds how often each answer has been given and
 * where every player is with this safe, in the instance's own SQLite database.
 *
 * A player's row moves through: (none) -> answered -> done.
 *   held      the loot tier of their first answer
 *   risking   they chose a second spin, so banking now pays nothing
 *   assisted  an item revealed an answer, so their answer is not counted
 */
export class SeamStore extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec("CREATE TABLE IF NOT EXISTS counts (answer TEXT PRIMARY KEY, c INTEGER NOT NULL)");
    this.sql.exec(
      "CREATE TABLE IF NOT EXISTS plays (pid TEXT NOT NULL, n INTEGER NOT NULL, done INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (pid, n))"
    );
    // Columns added after launch. Rows from before then were all answered.
    for (const column of [
      "answered INTEGER NOT NULL DEFAULT 1",
      "held INTEGER NOT NULL DEFAULT 0",
      "risking INTEGER NOT NULL DEFAULT 0",
      "assisted INTEGER NOT NULL DEFAULT 0",
    ]) {
      try { this.sql.exec(`ALTER TABLE plays ADD COLUMN ${column}`); } catch (err) { /* already there */ }
    }
  }

  counts() {
    const out = {};
    for (const row of this.sql.exec("SELECT answer, c FROM counts")) out[row.answer] = row.c;
    return out;
  }

  row(pid, n) {
    const rows = this.sql.exec("SELECT done, answered, held, risking, assisted FROM plays WHERE pid = ? AND n = ?", pid, n).toArray();
    const r = rows[0];
    if (!r) return { state: "new", held: 0, risking: false, assisted: false };
    return {
      state: r.done ? "done" : r.answered ? "open" : "new",
      held: r.held, risking: !!r.risking, assisted: !!r.assisted,
    };
  }

  /**
   * First answer of a player on this safe for this job. Rarity is judged on
   * the counts before this answer, so nobody demotes their own find. The
   * answer is counted at most once, and never if an item revealed it.
   */
  first(pid, n, seamId, answer, counted) {
    const before = this.row(pid, n);
    const { real, rows } = core.rarity(BY_ID.get(seamId), this.counts());
    const mine = rows.find((r) => r.name === answer);
    if (before.state === "new") {
      this.sql.exec(
        "INSERT INTO plays (pid, n, done, answered, held) VALUES (?, ?, 0, 1, ?) ON CONFLICT (pid, n) DO UPDATE SET answered = 1, held = excluded.held",
        pid, n, mine.tier
      );
      if (counted && !before.assisted) {
        this.sql.exec(
          "INSERT INTO counts (answer, c) VALUES (?, 1) ON CONFLICT (answer) DO UPDATE SET c = c + 1",
          answer
        );
      }
    }
    return { state: before.state, assisted: before.assisted, real, rows };
  }

  /** The player chose a second spin. From here, banking pays nothing. */
  risk(pid, n) {
    const before = this.row(pid, n);
    if (before.state === "open") this.sql.exec("UPDATE plays SET risking = 1 WHERE pid = ? AND n = ?", pid, n);
    return before;
  }

  /** Lock the safe for this player: no more guesses, reveal allowed. */
  finish(pid, n) {
    const before = this.row(pid, n);
    this.sql.exec(
      "INSERT INTO plays (pid, n, done, answered) VALUES (?, ?, 1, 0) ON CONFLICT (pid, n) DO UPDATE SET done = 1",
      pid, n
    );
    return before;
  }

  /** An item is about to reveal an answer. Only allowed before the first answer. */
  assist(pid, n) {
    const before = this.row(pid, n);
    if (before.state !== "new") return false;
    this.sql.exec(
      "INSERT INTO plays (pid, n, done, answered, assisted) VALUES (?, ?, 0, 0, 1) ON CONFLICT (pid, n) DO UPDATE SET assisted = 1",
      pid, n
    );
    return true;
  }

  rarityNow(seamId) {
    return core.rarity(BY_ID.get(seamId), this.counts());
  }

  /** Practice runs reuse n = 0, so reopen the safe at the start of each one. */
  reopen(pid) {
    this.sql.exec("DELETE FROM plays WHERE pid = ? AND n = 0", pid);
  }

  canReveal(pid) {
    return this.sql.exec("SELECT 1 FROM plays WHERE pid = ? AND done = 1 LIMIT 1", pid).toArray().length > 0;
  }
}

/**
 * One instance per player (an anonymous id made in their browser). Holds
 * the stash, the items they own, and which safes have already paid out so
 * no safe can ever be credited twice.
 */
export class PlayerStore extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec("CREATE TABLE IF NOT EXISTS wallet (id INTEGER PRIMARY KEY CHECK (id = 1), balance INTEGER NOT NULL)");
    this.sql.exec("INSERT OR IGNORE INTO wallet (id, balance) VALUES (1, 0)");
    this.sql.exec("CREATE TABLE IF NOT EXISTS items (item TEXT PRIMARY KEY, qty INTEGER NOT NULL)");
    this.sql.exec("CREATE TABLE IF NOT EXISTS credits (n INTEGER NOT NULL, seam TEXT NOT NULL, amount INTEGER NOT NULL, PRIMARY KEY (n, seam))");
  }

  state() {
    const balance = this.sql.exec("SELECT balance FROM wallet WHERE id = 1").one().balance;
    const items = {};
    for (const row of this.sql.exec("SELECT item, qty FROM items WHERE qty > 0")) items[row.item] = row.qty;
    return { balance, items };
  }

  /** Pay out one safe. A second call for the same safe and job changes nothing. */
  credit(n, seam, amount) {
    const fresh = this.sql.exec("INSERT OR IGNORE INTO credits (n, seam, amount) VALUES (?, ?, ?)", n, seam, amount).rowsWritten > 0;
    if (fresh && amount > 0) this.sql.exec("UPDATE wallet SET balance = balance + ? WHERE id = 1", amount);
    return { paid: fresh ? amount : 0, ...this.state() };
  }

  buy(item, price, qty) {
    const cost = price * qty;
    if (this.state().balance < cost) return { ok: false, ...this.state() };
    this.sql.exec("UPDATE wallet SET balance = balance - ? WHERE id = 1", cost);
    this.sql.exec("INSERT INTO items (item, qty) VALUES (?, ?) ON CONFLICT (item) DO UPDATE SET qty = qty + excluded.qty", item, qty);
    return { ok: true, ...this.state() };
  }

  /** What a job paid in total, and how many of its safes are settled. */
  takeFor(n) {
    const row = this.sql.exec("SELECT COUNT(*) AS safes, COALESCE(SUM(amount), 0) AS take FROM credits WHERE n = ?", n).one();
    return { safes: row.safes, take: row.take };
  }

  /** Take items out of the bag. Not ok if they do not own that many. */
  use(item, qty) {
    const used = this.sql.exec("UPDATE items SET qty = qty - ? WHERE item = ? AND qty >= ?", qty, item, qty).rowsWritten > 0;
    return { ok: used, ...this.state() };
  }
}

const store = (env, seamId) => env.SEAM.get(env.SEAM.idFromName(seamId));
const player = (env, pid) => env.PLAYER.get(env.PLAYER.idFromName(pid));

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

/** A daily job number is accepted a day either side of UTC, to cover time zones. */
function validDaily(n) {
  const today = core.utcDigNumber();
  return Number.isInteger(n) && n >= 1 && n >= today - 1 && n <= today + 1;
}

/**
 * Any job up to today can be opened. Older ones are the archive: they can
 * be played once for fun, but pay nothing and are not counted.
 */
function playable(n) {
  return Number.isInteger(n) && n >= 1 && n <= core.utcDigNumber() + 1;
}

const POOLS = { packs: PACKS, vaults: VAULTS, short: SHORT, hard: HARD };
const IN_PLAY = SEAMS.filter((s) => !RETIRED.has(s.id));
const VAULT_IDS = new Set(VAULTS.flat().map((s) => s.id));
const HARD_IDS = new Set(HARD.flat().map((s) => s.id));

/** What the browser may know about a safe. Big lists say how long they are; hard safes say so. */
function publicSeam(seam) {
  const out = { id: seam.id, cat: seam.cat, prompt: seam.prompt };
  if (VAULT_IDS.has(seam.id)) out.size = seam.answers.length;
  if (HARD_IDS.has(seam.id)) out.hard = true;
  return out;
}

async function handleJob(url, env) {
  if (url.searchParams.get("free")) {
    const pid = url.searchParams.get("pid") || "";
    const seams = core.randomSeams(IN_PLAY);
    if (PID.test(pid)) await orElse(Promise.all(seams.map((s) => store(env, s.id).reopen(pid))), null);
    return json({ number: 0, seams: seams.map(publicSeam) });
  }
  const n = Number(url.searchParams.get("n"));
  if (!playable(n)) return bad("That job is not open.", 404);
  const seams = core.jobSafes(POOLS, n);
  const out = { number: n, seams: seams.map(publicSeam) };
  // For an archive job, say whether this player has already been through it.
  const pid = url.searchParams.get("pid") || "";
  if ((url.searchParams.get("archive") || !validDaily(n)) && PID.test(pid)) {
    out.archive = true;
    const rows = await orElse(Promise.all(seams.map((s) => store(env, s.id).row(pid, n))), []);
    out.played = rows.some((r) => r.state !== "new");
  }
  return json(out);
}

async function readBody(request) {
  try {
    if (Number(request.headers.get("content-length") || 0) > MAX_BODY) return null;
    const text = await request.text();
    if (text.length > MAX_BODY) return null;
    const body = JSON.parse(text);
    return body && typeof body === "object" && !Array.isArray(body) ? body : null;
  } catch (e) {
    return null;
  }
}

/**
 * Rate limits. Two layers: a generous one per network address (shared wifi
 * can hold many honest players) and a tight one per player on guesses, which
 * is what stops someone brute-forcing a safe. Skipped if the bindings are
 * missing, so local development and tests still run.
 */
async function overLimit(limiter, key) {
  if (!limiter) return false;
  try {
    const { success } = await limiter.limit({ key });
    return !success;
  } catch (err) {
    return false;
  }
}
const tooMany = () => bad("Too many requests. Wait a few seconds and try again.", 429);

/** Shared checks for the play routes. Returns { seam, pid, n } or a Response. */
function parsePlay(body) {
  if (!body) return bad("Bad request.");
  const seam = BY_ID.get(String(body.seam || ""));
  const pid = String(body.pid || "");
  const n = Number(body.n);
  if (!seam) return bad("Unknown safe.");
  if (!PID.test(pid)) return bad("Bad player id.");
  if (n !== 0) {
    if (!playable(n)) return bad("That job is not open.", 404);
    if (!core.jobSafes(POOLS, n).some((s) => s.id === seam.id)) return bad("Safe is not in that job.");
  }
  // Live means it pays and counts: today's job, not practice, not the archive.
  return { seam, pid, n, live: validDaily(n) && body.archive !== true };
}

/** Pay a safe into the stash. Practice runs and archive jobs never pay. */
async function payOut(env, live, pid, n, seamId, tier) {
  if (!live) return { paid: 0 };
  return orElse(player(env, pid).credit(n, seamId, core.TIER_K[tier] || 0), { paid: 0 });
}

async function handleAnswer(request, env) {
  const body = await readBody(request);
  const play = parsePlay(body);
  if (play instanceof Response) return play;
  const { seam, pid, n, live } = play;
  if (await overLimit(env.LIMIT_ANSWER, pid)) return tooMany();
  const guess = typeof body.guess === "string" ? body.guess.slice(0, 60) : "";
  const again = body.again === true;
  const db = store(env, seam.id);
  const match = core.matchDetail(seam, guess, LEXICON);
  const name = match && match.name;

  if (again) {
    // Second spin: whatever happens, the safe is settled now.
    const before = await orElse(db.finish(pid, n), { state: "open", held: 0 });
    if (before.state !== "open") return bad("That safe is already settled.", 409);
    if (!name) {
      const bank = await payOut(env, live, pid, n, seam.id, 0);
      return json({ ok: false, won: false, balance: bank.balance });
    }
    const { real, rows } = await orElse(db.rarityNow(seam.id), core.rarity(seam, {}));
    const mine = rows.find((r) => r.name === name);
    const won = mine.tier > before.held;
    const bank = await payOut(env, live, pid, n, seam.id, won ? mine.tier : 0);
    return json({
      ok: true, won, name, corrected: match.corrected, tier: mine.tier, pct: mine.pct,
      real, measured: real >= core.PRIOR_PLAYS, deeper: 0, balance: bank.balance,
    });
  }

  // A missed first spin costs nothing here; the browser tracks the tries.
  if (!name) return json({ ok: false });

  const fallback = { state: "new", assisted: false, ...core.rarity(seam, {}) };
  const result = await orElse(db.first(pid, n, seam.id, name, live), fallback);
  if (result.state === "done") return bad("That safe is already settled.", 409);
  const mine = result.rows.find((r) => r.name === name);
  return json({
    ok: true,
    name,
    corrected: match.corrected,
    tier: mine.tier,
    pct: mine.pct,
    real: result.real,
    measured: result.real >= core.PRIOR_PLAYS,
    deeper: result.rows.filter((r) => r.tier > mine.tier).length,
    assisted: result.assisted,
  });
}

async function handleRisk(request, env) {
  const play = parsePlay(await readBody(request));
  if (play instanceof Response) return play;
  const before = await orElse(store(env, play.seam.id).risk(play.pid, play.n), { state: "open" });
  if (before.state !== "open") return bad("Nothing to risk on that safe.", 409);
  return json({ ok: true });
}

async function handleBank(request, env) {
  const play = parsePlay(await readBody(request));
  if (play instanceof Response) return play;
  const { seam, pid, n, live } = play;
  const before = await orElse(store(env, seam.id).finish(pid, n), { state: "done", held: 0, risking: false });
  // Banking pays the held loot, unless they had already chosen to risk it.
  const tier = before.state === "open" && !before.risking ? before.held : 0;
  const bank = before.state === "done" ? {} : await payOut(env, live, pid, n, seam.id, tier);
  return json({ ok: true, paid: bank.paid || 0, balance: bank.balance });
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

// ---------- Stash and shop ----------

async function handleMe(url, env) {
  const pid = url.searchParams.get("pid") || "";
  if (!PID.test(pid)) return bad("Bad player id.");
  const state = await orElse(player(env, pid).state(), { balance: 0, items: {} });
  return json({ ...state, shop: catalogue() });
}

async function handleBuy(request, env) {
  const body = await readBody(request);
  if (!body) return bad("Bad request.");
  const pid = String(body.pid || "");
  const item = ITEMS[String(body.item || "")];
  const qty = Number(body.qty || 1);
  if (!PID.test(pid)) return bad("Bad player id.");
  if (!item) return bad("No such item.");
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_BUY) return bad("Bad quantity.");
  const result = await player(env, pid).buy(String(body.item), item.price, qty);
  if (!result.ok) return json({ error: "Not enough in the stash.", balance: result.balance, items: result.items }, 402);
  return json(result);
}

/** Two believable wrong answers: real answers from other safes of the same kind. */
const wordsOf = (text) => new Set(core.normalise(text).split(" ").filter((w) => w.length > 3));

/**
 * Two wrong answers for the dynamite. They come from the safes most like
 * this one (same category, similar wording), so they are not obviously wrong.
 */
function decoys(seam) {
  const mine = wordsOf(seam.prompt);
  const ranked = SEAMS.filter((other) => other.id !== seam.id)
    .map((other) => {
      let score = other.cat === seam.cat ? 2 : 0;
      for (const w of wordsOf(other.prompt)) if (mine.has(w)) score++;
      return { other, score: score + Math.random() * 0.5 };
    })
    .sort((x, y) => y.score - x.score);
  const pool = [];
  for (const { other } of ranked) {
    for (const [name] of other.answers) {
      if (!core.matchDetail(seam, name, null) && !pool.includes(name)) pool.push(name);
    }
    if (pool.length >= 12) break;
  }
  const picks = new Set();
  for (let guard = 0; picks.size < 2 && guard < 200; guard++) picks.add(pool[Math.floor(Math.random() * pool.length)]);
  return [...picks];
}

async function handleUse(request, env) {
  const body = await readBody(request);
  const play = parsePlay(body);
  if (play instanceof Response) return play;
  const { seam, pid, n, live } = play;
  const id = String(body.item || "");
  const item = ITEMS[id];
  if (!item) return bad("No such item.");
  if (!live) return bad("Items only work on the daily job.");
  if (await overLimit(env.LIMIT_ANSWER, pid)) return tooMany();

  const db = store(env, seam.id);
  if ((await db.row(pid, n)).state !== "new") return bad("Too late for that on this safe.", 409);
  // Junk can be thrown by the handful; everything else is used one at a time.
  const wanted = Number(body.qty || 1);
  const qty = item.kind === "throw" && Number.isInteger(wanted) && wanted >= 1 && wanted <= MAX_BUY ? wanted : 1;
  const bag = await player(env, pid).use(id, qty);
  if (!bag.ok) return json({ error: "You do not have enough of those.", items: bag.items }, 402);

  const out = { ok: true, item: id, kind: item.kind, qty, items: bag.items, balance: bag.balance };
  if (item.kind === "time") {
    out.seconds = item.seconds;
  } else if (item.kind === "throw") {
    out.hit = Math.random() < 1 - Math.pow(1 - item.luck, qty);
    if (out.hit && (await db.assist(pid, n))) {
      // A lucky hit shows a middling answer, not the best one.
      const { rows } = await db.rarityNow(seam.id);
      const middling = rows.filter((r) => r.tier >= 2 && r.tier <= 4);
      const pool = middling.length ? middling : rows;
      out.hint = pool[Math.floor(Math.random() * pool.length)].name;
    }
  } else if (item.kind === "blast") {
    await db.assist(pid, n);
    const { rows } = await db.rarityNow(seam.id);
    const options = [rows[0].name, ...decoys(seam)];
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    out.options = options;
  }
  return json(out);
}

/**
 * One per daily job: the final take of every player who finished it, so a
 * player can be told how they did against everyone else.
 */
export class JobStore extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec("CREATE TABLE IF NOT EXISTS scores (pid TEXT PRIMARY KEY, take INTEGER NOT NULL)");
  }

  /** Record a finished job (once per player) and return where it stands. */
  submit(pid, take) {
    this.sql.exec("INSERT OR IGNORE INTO scores (pid, take) VALUES (?, ?)", pid, take);
    const mine = this.sql.exec("SELECT take FROM scores WHERE pid = ?", pid).one().take;
    const row = this.sql.exec(
      "SELECT COUNT(*) AS players, COALESCE(SUM(take < ?), 0) AS below, COALESCE(SUM(take > ?), 0) AS above FROM scores", mine, mine,
    ).one();
    return { players: row.players, below: row.below, above: row.above, take: mine };
  }
}

/** A finished daily job: work out the take from what was actually paid, then rank it. */
async function handleFinish(request, env) {
  const body = await readBody(request);
  if (!body) return bad("Bad request.");
  const pid = String(body.pid || "");
  const n = Number(body.n);
  if (!PID.test(pid)) return bad("Bad player id.");
  if (!validDaily(n)) return bad("That job is not open.", 404);
  if (await overLimit(env.LIMIT_ANSWER, pid)) return tooMany();
  const done = await orElse(player(env, pid).takeFor(n), { safes: 0, take: 0 });
  // Every safe has to be settled first, or people could rank half a job.
  if (done.safes < core.SEAMS_PER_DIG) return json({ ok: false });
  const rank = await orElse(env.JOB.get(env.JOB.idFromName("job-" + n)).submit(pid, done.take), null);
  if (!rank) return json({ ok: false });
  const others = rank.players - 1;
  return json({
    ok: true,
    players: rank.players,
    place: rank.above + 1,
    beat: others > 0 ? Math.round((rank.below / others) * 100) : 0,
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return new Response("Not found", { status: 404 });
    if (url.pathname === "/api/health") {
      return json({ ok: true, safes: SEAMS.length, job: core.utcDigNumber() });
    }
    const ip = request.headers.get("cf-connecting-ip") || "local";
    if (await overLimit(env.LIMIT_IP, ip)) return tooMany();
    try {
      const route = `${request.method} ${url.pathname}`;
      if (route === "GET /api/job") return await handleJob(url, env);
      if (route === "GET /api/reveal") return await handleReveal(url, env);
      if (route === "GET /api/me") return await handleMe(url, env);
      if (route === "POST /api/answer") return await handleAnswer(request, env);
      if (route === "POST /api/risk") return await handleRisk(request, env);
      if (route === "POST /api/bank") return await handleBank(request, env);
      if (route === "POST /api/buy") return await handleBuy(request, env);
      if (route === "POST /api/use") return await handleUse(request, env);
      if (route === "POST /api/finish") return await handleFinish(request, env);
      return bad("Not found.", 404);
    } catch (err) {
      console.error(err);
      return bad("The vault is jammed. Try again in a moment.", 500);
    }
  },
};
