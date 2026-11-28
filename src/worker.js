/*
 * Lootle Worker.
 *
 * Static files in ./public are served by Cloudflare directly. Everything
 * under /api/ lands here. The answer bank lives only in this bundle, so the
 * browser never receives an answer it has not earned. The server also keeps
 * the score: it decides what each safe paid and credits the player's stash.
 *
 *   GET  /api/job?n=12        a job's prompts (or ?free=1 for a random set)
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
import { PACKS, VAULTS, HARD, SHORT, SEAMS, EASY, MID, OPEN } from "./seams/index.js";
import { DECOYS } from "./lexicon.js";
import { ITEMS, MAX_BUY, RETIRED_ITEMS, catalogue, inStock } from "./shop.js";
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
    // Answers to open prompts that the judge has ruled on, so each is only asked once.
    this.sql.exec("CREATE TABLE IF NOT EXISTS judged (k TEXT PRIMARY KEY, name TEXT NOT NULL, ok INTEGER NOT NULL)");
    for (const column of [
      "answered INTEGER NOT NULL DEFAULT 1",
      "held INTEGER NOT NULL DEFAULT 0",
      "risking INTEGER NOT NULL DEFAULT 0",
      "assisted INTEGER NOT NULL DEFAULT 0",
    ]) {
      try { this.sql.exec(`ALTER TABLE plays ADD COLUMN ${column}`); } catch (err) { /* already there */ }
    }
  }

  /** Names the judge has accepted for this door, on top of the written list. */
  extras() {
    return this.sql.exec("SELECT name FROM judged WHERE ok = 1").toArray().map((r) => r.name);
  }

  /** The door as it stands now: the written answers plus the accepted ones, which count as rare. */
  seam(seamId) {
    const base = BY_ID.get(seamId);
    const extra = this.extras();
    return extra.length ? { ...base, answers: [...base.answers, ...extra.map((name) => [name, 5])] } : base;
  }

  verdict(key) {
    const rows = this.sql.exec("SELECT name, ok FROM judged WHERE k = ?", key).toArray();
    return rows[0] ? { name: rows[0].name, ok: !!rows[0].ok } : null;
  }

  saveVerdict(key, name, ok) {
    this.sql.exec("INSERT OR IGNORE INTO judged (k, name, ok) VALUES (?, ?, ?)", key, name, ok ? 1 : 0);
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
    const { real, rows } = core.rarity(this.seam(seamId), this.counts());
    const mine = rows.find((r) => r.name === answer);
    if (before.state === "new") {
      this.sql.exec(
        "INSERT INTO plays (pid, n, done, answered, held) VALUES (?, ?, 0, 1, ?) ON CONFLICT (pid, n) DO UPDATE SET answered = 1, held = excluded.held",
        pid, n, mine.score
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
    return core.rarity(this.seam(seamId), this.counts());
  }

  /** Practice runs reuse n = 0, so reopen the safe at the start of each one. */
  reopen(pid) {
    this.sql.exec("DELETE FROM plays WHERE pid = ? AND n = 0", pid);
  }

  canReveal(pid) {
    return this.sql.exec("SELECT 1 FROM plays WHERE pid = ? AND done = 1 LIMIT 1", pid).toArray().length > 0;
  }
}

const OLD_TOOL_PRICES = { hairpin: 15, hourglass: 10, scope: 25, dynamite: 60, key: 120 };

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
    this.sql.exec("CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v INTEGER NOT NULL)");
    // Doors pay a tenth of what they used to, so stashes built up under the
    // old prices are scaled down once, and the old throwable junk is cleared.
    if (this.sql.exec("INSERT OR IGNORE INTO meta (k, v) VALUES ('economy', 2)").rowsWritten > 0) {
      this.sql.exec("UPDATE wallet SET balance = balance / 10 WHERE id = 1");
      for (const id of RETIRED_ITEMS) this.sql.exec("DELETE FROM items WHERE item = ?", id);
    }
    // Tools left the shop when jobs went to five doors. Anything still in a bag is bought back at what it cost.
    if (this.sql.exec("INSERT OR IGNORE INTO meta (k, v) VALUES ('tools', 0)").rowsWritten > 0) {
      for (const [id, price] of Object.entries(OLD_TOOL_PRICES)) {
        this.sql.exec("UPDATE wallet SET balance = balance + ? * COALESCE((SELECT qty FROM items WHERE item = ?), 0) WHERE id = 1", price, id);
        this.sql.exec("DELETE FROM items WHERE item = ?", id);
      }
    }
  }

  state() {
    const balance = this.sql.exec("SELECT balance FROM wallet WHERE id = 1").one().balance;
    const items = {};
    for (const row of this.sql.exec("SELECT item, qty FROM items WHERE qty > 0")) items[row.item] = row.qty;
    return { balance, items };
  }

  /** Pay out one safe. A second call for the same safe and job changes nothing. */
  /** Claim something that can happen once per job (the risk, the hint). False if already claimed. */
  once(key) {
    return this.sql.exec("INSERT OR IGNORE INTO meta (k, v) VALUES (?, 1)", key).rowsWritten > 0;
  }

  /** Count one use of something capped per job. False once the cap is reached. */
  within(key, cap) {
    const rows = this.sql.exec("SELECT v FROM meta WHERE k = ?", key).toArray();
    if (rows[0] && rows[0].v >= cap) return false;
    this.sql.exec("INSERT INTO meta (k, v) VALUES (?, 1) ON CONFLICT (k) DO UPDATE SET v = v + 1", key);
    return true;
  }

  /** Practice runs reuse job 0, so their once-per-job flags are cleared at the start of each. */
  resetPractice() {
    this.sql.exec("DELETE FROM meta WHERE k IN ('risk:0', 'hint:0', 'judge:0', 'ck:0', 'cl:0')");
  }

  /** The chain for a job: the letter the next door needs ("" for any) and how long it is. */
  chain(n) {
    const get = (k) => (this.sql.exec("SELECT v FROM meta WHERE k = ?", k).toArray()[0] || { v: 0 }).v;
    const code = get(`ck:${n}`);
    return { key: code ? String.fromCharCode(code) : "", len: get(`cl:${n}`) };
  }

  setChain(n, key, len) {
    for (const [k, v] of [[`ck:${n}`, key ? key.charCodeAt(0) : 0], [`cl:${n}`, len]]) {
      this.sql.exec("INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT (k) DO UPDATE SET v = excluded.v", k, v);
    }
    return { key, len };
  }

  credit(n, seam, amount) {
    const fresh = this.sql.exec("INSERT OR IGNORE INTO credits (n, seam, amount) VALUES (?, ?, ?)", n, seam, amount).rowsWritten > 0;
    if (fresh && amount > 0) this.sql.exec("UPDATE wallet SET balance = balance + ? WHERE id = 1", amount);
    return { paid: fresh ? amount : 0, ...this.state() };
  }

  buy(item, price, qty, max = 0) {
    const cost = price * qty;
    const have = this.sql.exec("SELECT qty FROM items WHERE item = ?", item).toArray()[0];
    if (max && have && have.qty >= max) return { ok: false, owned: true, ...this.state() };
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

const POOLS = { packs: PACKS, vaults: VAULTS, short: SHORT, hard: HARD, easy: EASY, mid: MID, open: OPEN };
const BAND = new Map();
for (const [band, packs] of [["easy", EASY], ["mid", MID], ["hard", HARD], ["open", OPEN]]) for (const s of packs.flat()) BAND.set(s.id, band);
const VAULT_IDS = new Set(VAULTS.flat().map((s) => s.id));
const HARD_IDS = new Set(HARD.flat().map((s) => s.id));

/** What the browser may know about a safe. Big lists say how long they are; hard safes say so. */
function publicSeam(seam) {
  const out = { id: seam.id, cat: seam.cat, prompt: seam.prompt, band: BAND.get(seam.id) || "mid" };
  if (VAULT_IDS.has(seam.id)) out.size = seam.answers.length;
  if (HARD_IDS.has(seam.id)) out.hard = true;
  return out;
}

async function handleJob(url, env) {
  if (url.searchParams.get("free")) {
    const pid = url.searchParams.get("pid") || "";
    const seams = core.randomDoors(POOLS);
    if (PID.test(pid)) {
      await orElse(Promise.all([...seams.map((s) => store(env, s.id).reopen(pid)), player(env, pid).resetPractice()]), null);
    }
    return json({ number: 0, seams: seams.map(publicSeam) });
  }
  const n = Number(url.searchParams.get("n"));
  if (!playable(n)) return bad("That job is not open.", 404);
  const seams = core.jobDoors(POOLS, n);
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
    if (!core.jobDoors(POOLS, n).some((s) => s.id === seam.id)) return bad("Safe is not in that job.");
  }
  // Live means it pays and counts: today's job, not practice, not the archive.
  return { seam, pid, n, live: validDaily(n) && body.archive !== true };
}

/** Pay a safe into the stash. Practice runs and archive jobs never pay. */
async function payOut(env, live, pid, n, seamId, score, chainLength = 1) {
  if (!live) return { paid: 0 };
  return orElse(player(env, pid).credit(n, seamId, core.chainPay(core.levelOf(score), chainLength)), { paid: 0 });
}

/** The letter the next door will need, or "" if that door has no answer starting with it. */
function nextKey(n, seamId, nextId, name) {
  const letter = core.lastLetter(name);
  let next = null;
  if (n === 0) next = BY_ID.get(String(nextId || ""));
  else {
    const doors = core.jobDoors(POOLS, n);
    next = doors[doors.findIndex((s) => s.id === seamId) + 1] || null;
  }
  if (!next) return "";
  return core.hasLetter(next, letter) ? letter : "";
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
  const me = player(env, pid);
  // Every door also accepts whatever the judge has let through before.
  const current = await orElse(db.seam(seam.id), seam);
  // The chain: after the first door, an answer has to start with the last letter of the one before.
  const chain = again ? { key: "", len: 0 } : await orElse(me.chain(n), { key: "", len: 0 });
  const key = core.hasLetter(current, chain.key) ? chain.key : "";
  if (key && core.firstLetter(guess) !== key) return json({ ok: false, wrongKey: true, key });
  let match = core.matchDetail(current, guess, LEXICON);
  if (!match) match = await judge(env, db, pid, n, seam, guess);
  // A tiny slip is fixed quietly. Anything bigger is offered, and the player has to accept it.
  if (match && match.corrected && body.sure !== true && !core.slip(match, guess)) return json({ ok: false, suggest: match.name });
  const name = match && match.name;

  if (again) {
    // Second spin: whatever happens, the safe is settled now.
    const before = await orElse(db.finish(pid, n), { state: "open", held: 0 });
    if (before.state !== "open") return bad("That safe is already settled.", 409);
    if (!name) {
      const bank = await payOut(env, live, pid, n, seam.id, 0);
      return json({ ok: false, won: false, balance: bank.balance });
    }
    const { real, rows } = await orElse(db.rarityNow(seam.id), core.rarity(current, {}));
    const mine = rows.find((r) => r.name === name) || { score: 0, tier: 0, pct: 0 };
    const won = mine.score > before.held;
    const bank = await payOut(env, live, pid, n, seam.id, won ? mine.score : 0);
    return json({
      ok: true, won, name, corrected: match.corrected, tier: mine.tier, score: mine.score, pct: mine.pct,
      real, measured: real >= core.PRIOR_PLAYS, deeper: 0, balance: bank.balance,
    });
  }

  // A missed first spin costs nothing here; the browser tracks the tries.
  if (!name) return json({ ok: false });

  const fallback = { state: "new", assisted: false, ...core.rarity(current, {}) };
  const result = await orElse(db.first(pid, n, seam.id, name, live), fallback);
  if (result.state === "done") return bad("That safe is already settled.", 409);
  const mine = result.rows.find((r) => r.name === name);
  // Opening a door extends the chain and pays straight away: its loot times the chain.
  let length = chain.len;
  let next = "";
  if (result.state === "new") {
    length = chain.len + 1;
    next = nextKey(n, seam.id, body.next, name);
    await orElse(me.setChain(n, next, length), null);
  }
  const bank = result.state === "new" ? await payOut(env, live, pid, n, seam.id, mine.score, length) : {};
  return json({
    ok: true,
    name,
    chain: length,
    next,
    paid: bank.paid || 0,
    balance: bank.balance,
    corrected: match.corrected,
    tier: mine.tier,
    score: mine.score,
    pct: mine.pct,
    real: result.real,
    measured: result.real >= core.PRIOR_PLAYS,
    deeper: result.rows.filter((r) => r.score > mine.score).length,
    assisted: result.assisted,
    judged: !!match.judged,
  });
}

/** How many new answers one player may put to the judge per job. */
const JUDGE_CAP = 8;
const JUDGE_MODEL = "@cf/meta/llama-3.1-8b-instruct";

/**
 * Ask Workers AI whether an unlisted answer to an open prompt is a fair one.
 * Each answer is only ever asked about once per door: the verdict is kept and
 * a yes joins the door's answers as a rare one. Any doubt, error or missing
 * binding counts as a no, so the game still runs without it.
 */
async function judge(env, db, pid, n, seam, guess) {
  const tidy = core.judgeable(guess);
  if (!tidy || !tidy.key || !env.AI) return null;
  try {
    const known = await db.verdict(tidy.key);
    if (known) return known.ok ? { name: known.name, corrected: false, judged: true } : null;
    if (!(await player(env, pid).within(`judge:${n}`, JUDGE_CAP))) return null;
    const model = env.JUDGE_MODEL || JUDGE_MODEL;
    const reply = await Promise.race([
      env.AI.run(model, { messages: core.judgePrompt(seam.prompt, tidy.name), max_tokens: 4, temperature: 0 }),
      new Promise((resolve) => setTimeout(() => resolve(null), 6000)),
    ]);
    if (reply === null) return null; // too slow: no verdict, so it can be asked again
    const ok = core.judgeSaysYes(reply);
    await db.saveVerdict(tidy.key, tidy.name, ok);
    return ok ? { name: tidy.name, corrected: false, judged: true } : null;
  } catch (err) {
    console.log(JSON.stringify({ event: "judge_failed", seam: seam.id, message: String(err && err.message) }));
    return null;
  }
}

async function handleRisk(request, env) {
  const play = parsePlay(await readBody(request));
  if (play instanceof Response) return play;
  const db = store(env, play.seam.id);
  if ((await orElse(db.row(play.pid, play.n), { state: "open" })).state !== "open") return bad("Nothing to risk on that door.", 409);
  // One risk per job, for the whole night.
  if (!(await orElse(player(env, play.pid).once(`risk:${play.n}`), true))) return bad("You have used your risk tonight.", 409);
  await orElse(db.risk(play.pid, play.n), null);
  return json({ ok: true });
}

async function handleBank(request, env) {
  const play = parsePlay(await readBody(request));
  if (play instanceof Response) return play;
  const { seam, pid, n, live } = play;
  const before = await orElse(store(env, seam.id).finish(pid, n), { state: "done", held: 0, risking: false });
  // An opened door was paid when it opened. A door that was never opened breaks the chain and pays nothing.
  if (before.state === "new") await orElse(player(env, pid).setChain(n, "", 0), null);
  const bank = before.state === "done" ? {} : await payOut(env, live, pid, n, seam.id, 0);
  return json({ ok: true, paid: bank.paid || 0, balance: bank.balance });
}

async function handleReveal(url, env) {
  const seam = BY_ID.get(url.searchParams.get("seam") || "");
  const pid = url.searchParams.get("pid") || "";
  if (!seam || !PID.test(pid)) return bad("Bad request.");
  const db = store(env, seam.id);
  if (!(await orElse(db.canReveal(pid), true))) return bad("Finish that safe first.", 403);
  const { real, rows } = await orElse(db.rarityNow(seam.id), core.rarity(seam, {}));
  return json({
    id: seam.id,
    real,
    measured: real >= core.PRIOR_PLAYS,
    note: seam.note || "",
    answers: rows.map((r) => ({ name: r.name, tier: r.tier, score: r.score, pct: r.pct })),
  });
}

// ---------- Stash and shop ----------

async function handleMe(url, env) {
  const pid = url.searchParams.get("pid") || "";
  if (!PID.test(pid)) return bad("Bad player id.");
  const state = await orElse(player(env, pid).state(), { balance: 0, items: {} });
  const job = core.utcDigNumber();
  return json({ ...state, job, shop: catalogue(job) });
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
  if (!inStock(String(body.item), core.utcDigNumber())) return bad("That is not on the shelf tonight.", 409);
  // Clothes are bought once. Tools stack.
  const result = await player(env, pid).buy(String(body.item), item.price, item.kind === "wear" ? 1 : qty, item.kind === "wear" ? 1 : 0);
  if (!result.ok && result.owned) return json({ error: "You already have that.", balance: result.balance, items: result.items }, 409);
  if (!result.ok) return json({ error: "Not enough in the stash.", balance: result.balance, items: result.items }, 402);
  return json(result);
}

/**
 * The one free hint of the night: the first letter of a decent answer. It
 * has to be asked for before answering, and a door opened with it is not
 * counted towards the rarity numbers.
 */
async function handleUse(request, env) {
  const body = await readBody(request);
  const play = parsePlay(body);
  if (play instanceof Response) return play;
  const { seam, pid, n } = play;
  if (String(body.item || "") !== "hint") return bad("No such item.");
  if (await overLimit(env.LIMIT_ANSWER, pid)) return tooMany();

  const db = store(env, seam.id);
  if ((await db.row(pid, n)).state !== "new") return bad("Too late for a hint on this door.", 409);
  if (!(await player(env, pid).once(`hint:${n}`))) return bad("You have used your hint tonight.", 409);
  await db.assist(pid, n);
  // A decent answer, not the best one: something in the "rare find" range.
  const { rows } = await db.rarityNow(seam.id);
  const decent = rows.filter((r) => r.tier === 3);
  const pool = decent.length ? decent : rows;
  return json({ ok: true, kind: "letter", letter: pool[Math.floor(Math.random() * pool.length)].name[0].toUpperCase() });
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
  if (done.safes < core.jobDoors(POOLS, n).length) return json({ ok: false });
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
