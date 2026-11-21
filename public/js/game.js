/* Lootle client. Prompts come from the server; answers never ship in this file. */
(function () {
  "use strict";

  const Art = window.LootleArt;
  const LEVELS = Art.TIERS; // five loot levels; LEVELS[0] is level 1
  const PAY = [0, 1, 2, 4, 7, 10]; // thousands of dollars, by level
  const COLOR = ["#f0485a"].concat(LEVELS.map((t) => t.c));
  const SQUARES = ["⬛", "⬜", "\u{1F7E9}", "\u{1F7E6}", "\u{1F7EA}", "\u{1F7E8}"];
  const SECONDS = 30;
  const SECONDS_RISK = 20;
  const TRIES = 3;
  const EPOCH = Date.UTC(2026, 10, 12);
  const STORE_KEY = "lootle:v1";
  const SCREENS = ["front", "play", "result", "shop", "wardrobe", "archive", "how"];
  const TOOLS = { hairpin: "Hairpin", hourglass: "Hourglass", scope: "Stethoscope", dynamite: "Dynamite", key: "Skeleton key" };

  const $ = (id) => document.getElementById(id);
  const money = (k) => (k >= 1000 ? "$" + (Math.round(k / 10) / 100).toFixed(2).replace(/\.?0+$/, "") + "M" : "$" + k + "K");
  const two = (n) => String(n).padStart(2, "0");
  const three = (n) => String(n).padStart(3, "0");
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const between = (a, b) => a + Math.random() * (b - a);
  const level = (n) => Math.max(0, Math.min(5, n | 0));
  /** Restart a CSS animation that is driven by a class. */
  function replay(node, name) {
    node.classList.remove(name);
    void node.offsetWidth;
    node.classList.add(name);
  }

  // ---------- Storage (best effort) ----------
  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(saved)); } catch (e) { /* private mode */ }
  }
  let saved = load();
  if (!saved.pid) {
    saved.pid = window.crypto && crypto.randomUUID
      ? crypto.randomUUID()
      : "p-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    save();
  }
  if (saved.fit) Art.fit(saved.fit);

  function localJobNumber() {
    const d = new Date();
    return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - EPOCH) / 86400000) + 1;
  }
  const today = localJobNumber();

  // ---------- Server ----------
  async function api(path, body) {
    const res = await fetch(path, body
      ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }
      : undefined);
    let data = null;
    try { data = await res.json(); } catch (e) { /* not json */ }
    if (!res.ok) {
      const err = new Error((data && data.error) || "Request failed");
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  // ---------- Sound (all synthesised, no audio files) ----------
  const Sfx = {
    ctx: null,
    muted: !!saved.muted,
    wake() {
      if (this.muted) return null;
      try {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (this.ctx.state === "suspended") this.ctx.resume();
      } catch (e) { this.ctx = null; }
      return this.ctx;
    },
    tone(freq, dur, type, vol, delay, slideTo) {
      const ctx = this.wake();
      if (!ctx) return;
      const t = ctx.currentTime + (delay || 0);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || "square";
      osc.frequency.setValueAtTime(freq, t);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      gain.gain.setValueAtTime(vol || 0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    },
    noise(dur, vol, cutoff, delay) {
      const ctx = this.wake();
      if (!ctx) return;
      const t = ctx.currentTime + (delay || 0);
      const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = cutoff;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(filter).connect(gain).connect(ctx.destination);
      src.start(t);
    },
    click() { this.tone(520, 0.05, "square", 0.05); },
    key() { this.tone(1300, 0.015, "square", 0.015); },
    miss() { this.tone(170, 0.22, "sawtooth", 0.07, 0, 80); this.pin(0.02); },
    tick() { this.tone(880, 0.04, "square", 0.04); },
    heartbeat() { this.tone(60, 0.12, "sine", 0.3); this.tone(52, 0.14, "sine", 0.22, 0.16); },
    /** One pin of the lock setting: a dry metallic tick. */
    pin(delay, pitch) { this.noise(0.03, 0.18, 6500, delay); this.tone(pitch || 2100, 0.025, "square", 0.025, delay); },
    /** The lock being worked: pins click faster and higher, then the bolts go. */
    pickLock(score) {
      const pins = 8 + Math.round(score / 9);
      for (let i = 0; i < pins; i++) this.pin(1.7 * Math.pow(i / pins, 0.8), 1500 + (i / pins) * 1500);
      this.tone(70, 0.3, "sine", 0.3, 1.75);
      this.tone(140, 0.08, "square", 0.05, 1.75);
      this.noise(0.5, 0.12, 900, 1.8);
    },
    payout(lvl) {
      const notes = [523, 659, 784, 1047, 1319];
      for (let n = 0; n < lvl; n++) this.tone(notes[n], 0.13, "square", 0.055, 2 + n * 0.07);
      if (lvl === 5) [2093, 2637, 3136].forEach((f, i) => this.tone(f, 0.5, "triangle", 0.06, 2.5 + i * 0.12));
    },
    slam() {
      this.noise(0.35, 0.5, 400);
      this.tone(90, 0.3, "sawtooth", 0.14, 0, 40);
      for (let i = 0; i < 3; i++) {
        this.tone(620, 0.2, "square", 0.05, 0.3 + i * 0.4, 880);
        this.tone(880, 0.2, "square", 0.05, 0.5 + i * 0.4, 620);
      }
    },
    coin() { this.tone(988, 0.07, "square", 0.05); this.tone(1319, 0.2, "square", 0.05, 0.07); },
    boom() { this.noise(1.1, 0.45, 260, 0.6); this.tone(90, 0.9, "sawtooth", 0.12, 0.6, 30); },
    no() { this.tone(140, 0.3, "sawtooth", 0.07, 0, 60); },
    fanfare() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.16, "square", 0.06, i * 0.13)); },
  };

  // ---------- State ----------
  let game = null; // { kind: "daily" | "past" | "free", number, safes, results, index, tries, risk, ... }
  let bag = { balance: 0, items: {}, shop: [] };
  let screen = "front";
  let cameFrom = "front";
  const clock = { left: 0, total: 0, ends: 0, running: false, raf: 0, lastSecond: -1 };

  const takeOf = (results) => results.reduce((sum, r) => sum + (r.k || 0), 0);

  function show(id) {
    if (id === "back") id = game && game.done && cameFrom === "result" ? "result" : "front";
    if (screen === "front" || screen === "result") cameFrom = screen;
    if (id === "front") drawFront();
    if (id === "shop") drawShop();
    if (id === "wardrobe") drawCloset();
    if (id === "archive") drawArchive();
    for (const name of SCREENS) $(name).classList.toggle("on", name === id);
    $(id).scrollTop = 0;
    window.scrollTo(0, 0);
    screen = id;
  }

  // ---------- Front page ----------
  function drawFront() {
    $("jobChip").textContent = "Job " + three(today);
    const streak = saved.lastFinished >= today - 1 ? saved.streak || 0 : 0;
    $("streakWrap").hidden = streak < 1;
    $("streakChip").textContent = streak + "-night streak";
    const progress = saved.progress && saved.progress.number === today ? saved.progress : null;
    $("breakin").textContent = progress && progress.results.length >= progress.safes.length ? "THE TAKE"
      : progress && (progress.results.length || progress.live) ? "BACK IN" : "BREAK IN";
  }
  function setBalance(balance) {
    if (typeof balance !== "number") return;
    bag.balance = balance;
    document.querySelectorAll(".stash").forEach((e) => { e.textContent = money(balance); });
  }
  async function loadBag() {
    try {
      const me = await api(`/api/me?pid=${saved.pid}`);
      bag = { balance: me.balance, items: me.items || {}, shop: me.shop || [] };
      setBalance(me.balance);
      if (screen === "shop") drawShop();
      if (screen === "wardrobe") drawCloset();
      if (screen === "play") drawBelt();
    } catch (e) { /* the game still runs without the shop */ }
  }
  function setMute() {
    $("mute").textContent = Sfx.muted ? "Sound off" : "Sound on";
    $("mute").setAttribute("aria-pressed", String(Sfx.muted));
  }

  // ---------- Starting a job ----------
  /** kind is "daily", "free" (practice) or "past" (an old job, by number). */
  async function start(kind, past) {
    Sfx.click();
    const buttons = [$("breakin"), $("practice"), $("practice2")];
    if (buttons[0].disabled) return;
    buttons[0].disabled = true;
    try {
      const number = kind === "daily" ? today : kind === "past" ? past : 0;
      const kept = kind === "daily" ? saved.progress : kind === "past" ? saved.pastProgress : null;
      const progress = kept && kept.number === number ? kept : null;
      let safes = progress && progress.safes;
      if (!safes) {
        const job = await api(number
          ? `/api/job?n=${number}&pid=${saved.pid}${kind === "past" ? "&archive=1" : ""}`
          : `/api/job?free=1&pid=${saved.pid}`);
        if (kind === "past" && job.played) {
          // Played before on this player id but not saved here: mark it and stay put.
          saved.archive = saved.archive || {};
          saved.archive[past] = saved.archive[past] || { played: true };
          save();
          drawArchive("You've already done job " + three(past) + ".");
          return;
        }
        safes = job.seams;
      }
      game = { kind, number, safes, results: progress ? progress.results : [], done: false };
      game.index = game.results.length;
      // A reload mid-decision counts as taking whatever was on the table.
      const last = game.results[game.index - 1];
      if (last) bank(last.id);
      if (game.index >= safes.length) return finish(true);
      show("play");
      $("stage").className = "stage";
      openDoor(false);
    } catch (err) {
      if (screen === "archive") drawArchive("Couldn't load that job. Try again.");
      else $("pitch").textContent = "Couldn't reach the vault. Check your connection and try again.";
    } finally {
      buttons[0].disabled = false;
    }
  }

  function persist() {
    if (game.kind === "free") return;
    const slot = game.kind === "past" ? "pastProgress" : "progress";
    const live = saved[slot] && saved[slot].number === game.number ? saved[slot].live : undefined;
    saved[slot] = { number: game.number, safes: game.safes, results: game.results, live };
    save();
  }
  const playBody = (extra) => Object.assign(
    { seam: game.safes[game.index].id, pid: saved.pid, n: game.number },
    game.kind === "past" ? { archive: true } : null, extra);
  /** Lock a door on the server. This is also what pays it. */
  function bank(seamId) {
    const body = { seam: seamId, pid: saved.pid, n: game.number };
    if (game.kind === "past") body.archive = true;
    return api("/api/bank", body).then((r) => { if (r) setBalance(r.balance); }).catch(() => {});
  }

  // ---------- A door ----------
  function mood(m) { $("wrap").dataset.s = m; }
  function say(text) {
    const e = $("say");
    e.textContent = text;
    e.style.animation = "none";
    void e.offsetWidth;
    e.style.animation = "";
  }
  function drawTicks() {
    let html = "";
    game.safes.forEach((s, i) => {
      const r = game.results[i];
      html += `<i style="background:${r ? COLOR[level(r.tier)] : i === game.index ? "var(--paper)" : ""}"></i>`;
    });
    $("ticks").innerHTML = html;
    $("tonight").textContent = game.kind === "daily" ? money(takeOf(game.results)) + " tonight"
      : game.kind === "past" ? "Old job " + three(game.number) : "Practice";
  }
  function drawTries() {
    let html = "";
    const total = game.risk ? 1 : Math.max(TRIES, game.tries);
    for (let i = 0; i < total; i++) html += `<i class="${i < game.tries ? "" : "off"}"></i>`;
    $("tries").innerHTML = html;
    $("tries").setAttribute("aria-label", game.tries + (game.tries === 1 ? " go left" : " goes left"));
  }
  function drawBelt() {
    const usable = game && game.kind === "daily" && !game.risk;
    let html = "";
    if (usable) {
      for (const id of Object.keys(TOOLS)) {
        const n = bag.items[id] || 0;
        if (n) html += `<button type="button" class="chip tool" data-use="${id}"${id === "dynamite" ? ' style="color:var(--alarm)"' : ""}>${TOOLS[id]} ${n}</button>`;
      }
      if (!html) html = '<span class="chip" style="opacity:.6">No tools. The fence sells them.</span>';
    }
    $("belt").innerHTML = html;
  }
  function label(safe) {
    if (safe.band === "open") return "Anything goes";
    if (safe.hard || safe.band === "hard") return "Hard one · " + safe.cat;
    return safe.cat;
  }

  function openDoor(risk) {
    const safe = game.safes[game.index];
    game.risk = !!risk;
    game.busy = false;
    let left = 0;
    if (!risk) {
      game.tries = TRIES;
      game.helped = false;
      game.held = null;
      const live = game.kind === "daily" && saved.progress && saved.progress.live;
      if (live && live.index === game.index) {
        game.tries = Math.max(1, Math.min(live.tries, TRIES + 5));
        left = Math.max(2000, live.left);
      }
    } else {
      game.tries = 1;
    }
    $("doorN").textContent = two(game.index + 1);
    $("doorT").textContent = game.safes.length;
    for (const id of ["bigN", "bigN2"]) if ($(id)) $(id).textContent = two(game.index + 1);
    drawTicks();
    $("qcat").textContent = risk ? `Beat ${game.held.score} or lose the lot` : label(safe);
    $("q").textContent = safe.prompt;
    $("hint").textContent = risk ? `One go. It has to be rarer than “${game.held.name}”.` : "";
    $("opts").style.display = "none";
    $("opts").innerHTML = "";
    $("ans").value = "";
    $("crack").disabled = false;
    $("panel").classList.toggle("risk", !!risk);
    $("panel").dataset.s = "idle";
    mood("idle");
    if (!risk) say(pick(["Go on then.", "Think weird.", "No pressure.", "What wouldn't they say?", "Easy money.", "Don't say the first thing."]));
    drawTries();
    drawBelt();
    startClock(risk ? SECONDS_RISK : SECONDS, left);
    // Keep the keyboard up between doors on phones.
    $("ans").focus({ preventScroll: true });
  }

  // ---------- The clock ----------
  function startClock(seconds, leftMs) {
    clock.total = seconds * 1000;
    clock.left = leftMs ? Math.min(leftMs, clock.total + 30000) : clock.total;
    clock.lastSecond = -1;
    resumeClock();
  }
  function resumeClock() {
    cancelAnimationFrame(clock.raf);
    clock.ends = performance.now() + clock.left;
    clock.running = true;
    const tick = (now) => {
      if (!clock.running) return;
      clock.left = Math.max(0, clock.ends - now);
      const secs = Math.ceil(clock.left / 1000);
      if (secs !== clock.lastSecond) {
        clock.lastSecond = secs;
        saveLive();
        $("clock").textContent = Math.floor(secs / 60) + ":" + two(secs % 60);
        $("clock").classList.toggle("low", secs <= 5 || game.risk);
        if (secs > 0) {
          if (game.risk) Sfx.heartbeat();
          else if (secs <= 5) Sfx.tick();
        }
      }
      if (clock.left <= 0) { clock.running = false; return outOfTime(); }
      clock.raf = requestAnimationFrame(tick);
    };
    clock.raf = requestAnimationFrame(tick);
  }
  function pauseClock() {
    if (!clock.running) return;
    clock.running = false;
    cancelAnimationFrame(clock.raf);
    clock.left = Math.max(0, clock.ends - performance.now());
    $("clock").classList.remove("low");
  }
  /** Remember the clock and tries so a refresh cannot buy more time. */
  function saveLive() {
    if (!game || game.kind !== "daily" || game.risk || !saved.progress || saved.progress.number !== game.number) return;
    saved.progress.live = { index: game.index, left: clock.left, tries: game.tries };
    save();
  }

  // ---------- Answering ----------
  async function submitGuess(text) {
    if (!game || screen !== "play" || game.busy || !text) return;
    game.busy = true;
    $("crack").disabled = true;
    pauseClock();
    Sfx.wake();
    if (!saved.progress || game.kind !== "daily") { /* nothing to keep */ } else saveLive();

    let hit;
    try {
      hit = await api("/api/answer", playBody({ guess: text, again: game.risk }));
    } catch (err) {
      if (err.status === 409) return bust("Already done.", "You've been through this door before, on this job.");
      $("hint").textContent = err.status === 429 ? "Slow down a second." : "Lost the signal. Try that again.";
      game.busy = false;
      $("crack").disabled = false;
      resumeClock();
      return;
    }
    if (game.risk) {
      setBalance(hit.balance);
      if (hit.ok && hit.won) return win(hit, true);
      return bust("Busted.", hit.ok
        ? `“${hit.name}” scores ${hit.score}. You needed more than ${game.held.score}, so the lot's gone.`
        : `Wrong answer. You had ${game.held.score} in your hands and you dropped it.`, true);
    }
    if (hit.ok) return win(hit, false);

    game.tries--;
    drawTries();
    Sfx.miss();
    replay($("form"), "nope");
    replay($("lock"), "pulse");
    if (game.tries <= 0) return bust("Busted.", "Three wrong and the shutters come down. This door pays nothing.");
    say(pick(["Nope.", "Not on the list.", "Try again.", "Hmm. No.", "Close? No."]));
    $("hint").textContent = `“${text}” isn't one.`;
    $("ans").value = "";
    game.busy = false;
    $("crack").disabled = false;
    resumeClock();
    $("ans").focus({ preventScroll: true });
  }

  function outOfTime() {
    if (!game || game.busy) return;
    game.busy = true;
    if (game.risk) return bust("Too slow.", `The alarm beat you to it. You had ${game.held.score} and now you don't.`);
    bust("Too slow.", "The clock ran out. This door pays nothing.");
  }

  /** A door that opened. `swapped` means it was the second, riskier answer. */
  function win(hit, swapped) {
    const lvl = level(hit.tier);
    const T = LEVELS[lvl - 1];
    const result = { id: game.safes[game.index].id, name: hit.name, tier: lvl, score: hit.score, k: PAY[lvl], helped: game.helped || !!hit.assisted };
    if (swapped) game.results[game.index] = result;
    else game.results.push(result);
    game.settled = swapped; // a second answer is paid by the server straight away
    game.held = { name: hit.name, score: hit.score };
    if (saved.progress && game.kind === "daily") saved.progress.live = undefined;
    persist();

    mood("open");
    Art.haul(lvl - 1);
    $("play").style.setProperty("--tc", T.c);
    $("tname").textContent = T.n;
    $("tscore").textContent = hit.score;
    $("said").textContent = hit.name;
    $("tsaid").textContent = hit.score >= 100 ? "Almost nobody says that"
      : hit.pct >= 1 ? `About ${Math.round(hit.pct)} in 100 say that` : "Fewer than 1 in 100 say that";
    $("tpay").textContent = game.kind === "daily" ? "+" + money(PAY[lvl]) : game.kind === "past" ? "old job, no pay" : "practice, no pay";
    const canRisk = !swapped && hit.score < 100 && hit.deeper > 0;
    $("deeper").textContent = swapped ? "Traded up. Nice."
      : canRisk ? `${hit.deeper} rarer answer${hit.deeper === 1 ? "" : "s"} still in there.` : "That's as rare as it gets.";
    $("luck").hidden = !canRisk;
    $("thru").textContent = game.index + 1 >= game.safes.length ? "Take it and go" : "Take it";
    $("stage").style.setProperty("--spin", (-720 - hit.score * 3.6) + "deg");
    $("stage").className = "stage open" + (lvl === 5 ? " top5" : "");
    $("panel").dataset.s = "open";
    $("ans").blur();
    drawTicks();
    Sfx.pickLock(hit.score);
    Sfx.payout(lvl);
    const here = game;
    setTimeout(() => { if (game === here && $("panel").dataset.s === "open") say(swapped ? "Greedy. I like it." : T.q); }, 1900);
    if (lvl === 5) setTimeout(() => sparks(26, [20, 80], [120, 220], 120), 1800);
    $("thru").focus({ preventScroll: true });
  }

  function sparks(count, xs, ys, spread) {
    for (let i = 0; i < count; i++) {
      const sp = document.createElement("span");
      sp.className = "spark";
      sp.style.left = between(xs[0], xs[1]) + "%";
      sp.style.top = between(ys[0], ys[1]) + "px";
      sp.style.setProperty("--dx", between(-spread, spread) + "px");
      sp.style.setProperty("--dy", between(-140, 60) + "px");
      $("stage").appendChild(sp);
      setTimeout(() => sp.remove(), 700);
    }
  }

  /** A door that is lost: three misses, the clock, or a risk that did not come off. */
  function bust(title, why, alreadySettled) {
    pauseClock();
    const safe = game.safes[game.index];
    const result = { id: safe.id, name: "", tier: 0, score: 0, k: 0, helped: game.helped };
    if (game.results.length > game.index) game.results[game.index] = result;
    else game.results.push(result);
    if (saved.progress && game.kind === "daily") saved.progress.live = undefined;
    persist();
    drawTicks();

    mood("shut");
    say(pick(["Leg it!", "Run!", "That's the alarm.", "Time to go."]));
    $("shutTitle").textContent = title;
    $("shutWhy").textContent = why;
    $("shutLabel").hidden = true;
    $("shutRows").innerHTML = "";
    $("nextd").textContent = game.index + 1 >= game.safes.length ? "SEE THE TAKE" : "NEXT DOOR";
    $("opts").style.display = "none";
    $("stage").className = "stage slam";
    $("panel").dataset.s = "shut";
    $("ans").blur();
    replay($("phone"), "shake");
    sparks(18, [5, 95], [168, 168], 70);
    Sfx.slam();
    game.settled = true;

    // Lock it on the server, then show two answers that would have opened it.
    const here = game;
    const index = game.index;
    (alreadySettled ? Promise.resolve() : bank(safe.id))
      .then(() => api(`/api/reveal?seam=${encodeURIComponent(safe.id)}&pid=${saved.pid}`))
      .then((data) => {
        if (game !== here || game.index !== index || !data.answers.length) return;
        const rarest = data.answers[0];
        // Lists are written most-obvious first, so take the first of the commonest answers.
        const low = data.answers[data.answers.length - 1].score;
        const common = data.answers.find((a) => a.score === low);
        const row = (a, note) => `<div class="would"><span class="mini disp" style="background:${COLOR[level(a.tier)]}">${a.score}</span><span>${esc(a.name)}<small>${note}</small></span></div>`;
        $("shutRows").innerHTML = row(common, "the one everybody says") + (rarest.name !== common.name ? row(rarest, "the one nobody says") : "");
        $("shutLabel").hidden = false;
      })
      .catch(() => {});
    $("nextd").focus({ preventScroll: true });
  }

  function takeIt() {
    if (!game || $("panel").dataset.s !== "open") return;
    Sfx.coin();
    if (!game.settled) bank(game.safes[game.index].id);
    advance(true);
  }

  function riskIt() {
    if (!game || $("panel").dataset.s !== "open" || game.settled) return;
    Sfx.click();
    api("/api/risk", playBody()).catch(() => {});
    // From here the held loot is gone unless the next answer beats it.
    game.results[game.index] = { id: game.safes[game.index].id, name: "", tier: 0, score: 0, k: 0, helped: game.helped };
    persist();
    $("stage").className = "stage";
    say("Bold. One go.");
    openDoor(true);
  }

  /** Move on to the next door, or to the results after the last one. */
  function advance(through) {
    game.index++;
    persist();
    const stage = $("stage");
    const next = () => {
      if (game.index >= game.safes.length) return finish(false);
      openDoor(false);
    };
    if (!through) {
      stage.className = "stage";
      return next();
    }
    stage.classList.add("thru");
    setTimeout(() => {
      stage.className = "stage snap";
      requestAnimationFrame(() => requestAnimationFrame(() => { stage.className = "stage"; }));
      next();
    }, 560);
  }

  // ---------- Tools ----------
  async function useTool(button) {
    const id = button.dataset.use;
    if (!game || game.busy || game.risk || game.kind !== "daily" || $("panel").dataset.s !== "idle") return;
    button.disabled = true;
    let out;
    try {
      out = await api("/api/use", playBody({ item: id }));
    } catch (err) {
      if (err.data && err.data.items) bag.items = err.data.items;
      $("hint").textContent = err.message;
      Sfx.no();
      drawBelt();
      return;
    }
    bag.items = out.items || bag.items;
    setBalance(out.balance);
    drawBelt();
    if ($("panel").dataset.s !== "idle") return;
    if (out.kind === "time") {
      clock.ends += out.seconds * 1000;
      clock.left += out.seconds * 1000;
      clock.lastSecond = -1;
      replay($("clock"), "bump");
      Sfx.coin();
      say("Breathe.");
    } else if (out.kind === "try") {
      game.tries++;
      drawTries();
      replay($("tries"), "pulse");
      Sfx.pin(0);
      say("One more go.");
    } else if (out.kind === "letter") {
      game.helped = true;
      replay($("lock"), "pulse");
      Sfx.pin(0); Sfx.pin(0.18); Sfx.pin(0.3);
      $("hint").textContent = `Click... click. One of the good ones starts with ${out.letter}.`;
      say("Hear that?");
    } else if (out.kind === "key") {
      game.helped = true;
      say("Shh. Watch this.");
      $("ans").value = out.answer;
      submitGuess(out.answer);
    } else if (out.kind === "blast") {
      game.helped = true;
      const fuse = document.createElement("span");
      fuse.className = "fuse";
      $("stage").appendChild(fuse);
      replay($("phone"), "shake");
      Sfx.boom();
      say("Cover your ears.");
      const here = game;
      const index = game.index;
      setTimeout(() => {
        fuse.remove();
        if (game !== here || game.index !== index || $("panel").dataset.s !== "idle") return;
        $("hint").textContent = "One of these is the rarest answer going. The other two are wrong.";
        $("opts").innerHTML = out.options.map((o) => `<button type="button">${esc(o)}</button>`).join("");
        $("opts").style.display = "flex";
      }, 700);
    }
  }

  // ---------- The fence ----------
  function card(it) {
    const wear = it.kind === "wear";
    const has = bag.items[it.id] || 0;
    const fit = Art.fit();
    const on = wear && fit[it.slot] === it.id;
    const cls = "item" + (it.rare ? (it.price >= 500 ? " legend" : " rare") : "") + (on ? " on" : "") + (it.out && !has ? " gone" : "");
    const rib = it.rare ? `<span class="rib" style="color:${it.out ? "var(--dim)" : it.price >= 500 ? "var(--gold)" : "#b78cff"}">${it.out ? "Not in tonight" : "Tonight only"}</span>` : "";
    const note = wear ? (on ? "Wearing" : has ? "Put on" : "") : has ? "Got " + has : "";
    return `<button type="button" class="${cls}" data-buy="${it.id}">${rib}<span class="art">${wear ? Art.mini(it.id) : Art.ICON[it.id] || ""}</span>` +
      `<b>${esc(it.name)}</b><small>${esc(it.blurb)}</small><span class="tag"><span>${wear && has ? "" : money(it.price)}</span><em>${note}</em></span></button>`;
  }
  function drawShop() {
    const shop = bag.shop;
    $("gNight").innerHTML = shop.filter((i) => i.rare).map(card).join("") || '<p class="why">Nothing special in tonight.</p>';
    $("gTools").innerHTML = shop.filter((i) => !i.rare && i.kind !== "wear").map(card).join("");
    $("gWear").innerHTML = shop.filter((i) => !i.rare && i.kind === "wear").map(card).join("");
    setBalance(bag.balance);
  }
  function wearIt(slot, id, model) {
    const fit = Object.assign({}, Art.fit());
    fit[slot] = id;
    saved.fit = fit;
    save();
    Art.fit(fit);
    replay($(model), "swap");
  }
  function coins(from) {
    const a = from.getBoundingClientRect();
    const b = $("model").getBoundingClientRect();
    const frame = $("phone").getBoundingClientRect();
    for (let i = 0; i < 10; i++) {
      const c = document.createElement("span");
      c.className = "coin";
      c.style.left = (a.left - frame.left + a.width / 2) + "px";
      c.style.top = (a.top - frame.top + 20) + "px";
      c.style.setProperty("--dx", (b.left - a.left + b.width / 2 - a.width / 2 + between(-20, 20)) + "px");
      c.style.setProperty("--dy", (b.top - a.top + 60 + between(-20, 20)) + "px");
      c.style.animationDelay = (i * 40) + "ms";
      $("phone").appendChild(c);
      setTimeout(() => c.remove(), 1300);
    }
  }
  async function buy(button) {
    const it = bag.shop.find((i) => i.id === button.dataset.buy);
    if (!it || button.disabled) return;
    const wear = it.kind === "wear";
    const flag = (text) => { replay(button, "no"); button.querySelector("em").textContent = text; Sfx.no(); };
    if (wear && bag.items[it.id]) {
      Sfx.click();
      wearIt(it.slot, Art.fit()[it.slot] === it.id ? (it.slot === "coat" ? "black" : "") : it.id, "model");
      return drawShop();
    }
    if (it.out) return flag("Back another night");
    if (bag.balance < it.price) return flag("Short " + money(it.price - bag.balance));
    button.disabled = true;
    try {
      const out = await api("/api/buy", { pid: saved.pid, item: it.id, qty: 1 });
      bag.items = out.items;
      bag.balance = out.balance;
      Sfx.coin();
      coins(button);
      if (wear) wearIt(it.slot, it.id, "model");
      setTimeout(drawShop, wear ? 0 : 350);
    } catch (err) {
      if (err.data && typeof err.data.balance === "number") { bag.balance = err.data.balance; bag.items = err.data.items || bag.items; }
      button.disabled = false;
      flag(err.status === 402 ? "Not enough" : err.status === 409 ? "Can't tonight" : "Try again");
    }
  }

  // ---------- Wardrobe ----------
  const GROUPS = { coat: ["black", "tux", "ginger", "siamese"], hat: ["", "cap", "beret", "tophat", "crown"], neck: ["", "bow", "pearls", "scarf"] };
  const WEAR_NAME = { black: "Black", "": "None", tux: "Tuxedo", ginger: "Ginger", siamese: "Siamese", cap: "Flat cap", beret: "Beret", tophat: "Top hat", crown: "Crown", bow: "Bow tie", pearls: "Pearls", scarf: "Scarf" };
  const BARE = '<svg viewBox="0 0 62 62" aria-hidden="true"><circle cx="31" cy="31" r="18" fill="none" stroke="#aab0d6" stroke-width="2"/><path d="M19 43l24-24" stroke="#aab0d6" stroke-width="2"/></svg>';
  function drawCloset() {
    const fit = Art.fit();
    for (const [slot, box] of [["coat", "wCoat"], ["hat", "wHat"], ["neck", "wNeck"]]) {
      $(box).innerHTML = GROUPS[slot].map((id) => {
        const has = id === "" || id === "black" || bag.items[id];
        const it = bag.shop.find((i) => i.id === id);
        return `<button type="button" class="sw${fit[slot] === id ? " on" : ""}${has ? "" : " priced"}" data-slot="${slot}" data-wear="${id}">` +
          `${id === "" ? BARE : Art.mini(id)}<span>${has ? WEAR_NAME[id] : it ? money(it.price) : "At the fence"}</span></button>`;
      }).join("");
    }
  }

  // ---------- Old jobs ----------
  const jobDate = (n) => new Date(EPOCH + (n - 1) * 86400000)
    .toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  function drawArchive(note) {
    if (note) $("archiveNote").textContent = note;
    const done = saved.archive || {};
    let html = "";
    for (let n = today - 1; n >= 1; n--) {
      const d = done[n];
      const midway = saved.pastProgress && saved.pastProgress.number === n && !d;
      const status = d ? (d.take != null ? money(d.take) : "Played") : midway ? "Back in" : "Play";
      html += `<button type="button" data-job="${n}" class="${d ? "done" : ""}"${d ? " disabled" : ""}>` +
        `<span class="num">${three(n)}</span><span class="when">${jobDate(n)}</span><span class="go">${status}</span></button>`;
    }
    $("jobs").innerHTML = html || '<p class="why">Nothing here yet. Come back tomorrow.</p>';
  }

  // ---------- Results ----------
  function rank(k, doors) {
    const share = k / (doors * 10);
    if (share >= 0.6) return "Mastermind";
    if (share >= 0.4) return "Safecracker";
    if (share >= 0.25) return "Cat Burglar";
    if (share >= 0.1) return "Pickpocket";
    return "Lookout";
  }
  const statsLine = () => `Streak ${saved.streak || 1} · Best ${money(saved.best || 0)} · Stash ${money(bag.balance)}. New doors at midnight.`;

  function finish(resumed) {
    pauseClock();
    const take = takeOf(game.results);
    const doors = game.safes.length;
    game.done = true;
    game.index = doors;
    if (game.kind === "daily" && !resumed && saved.lastFinished !== game.number) {
      saved.streak = saved.lastFinished === game.number - 1 ? (saved.streak || 0) + 1 : 1;
      saved.lastFinished = game.number;
      saved.played = (saved.played || 0) + 1;
      saved.best = Math.max(saved.best || 0, take);
    }
    if (game.kind !== "free") {
      saved.archive = saved.archive || {};
      saved.archive[game.number] = { take, levels: game.results.map((r) => r.tier) };
    }
    save();
    if (!resumed) Sfx.fanfare();

    const opened = game.results.filter((r) => r.tier > 0).length;
    const perfect = game.results.filter((r) => r.tier === 5).length;
    $("rLabel").textContent = game.kind === "daily" ? `Job ${three(game.number)} · not bad for a`
      : game.kind === "past" ? `Old job ${three(game.number)} · you played like a` : "Practice run · you played like a";
    $("rStamp").textContent = rank(take, doors);
    $("rTake").textContent = money(take);
    $("rLine").textContent = `${opened} door${opened === 1 ? "" : "s"} out of ${doors}` +
      (perfect ? ` · ${perfect === 1 ? "one perfect 100" : perfect + " perfect 100s"}` : "");
    $("rNote").textContent = game.kind === "daily" ? statsLine()
      : game.kind === "past" ? "From the archive, so none of this went in the stash." : "Practice doesn't pay. The real job does.";
    $("share").textContent = "Brag about it";
    game.crowd = "";
    $("rlist").innerHTML = game.safes.map((safe, i) => {
      const r = game.results[i] || { tier: 0, k: 0, name: "" };
      const chip = r.tier > 0
        ? `<span class="mini disp" style="background:${COLOR[level(r.tier)]}">${r.score}</span>`
        : '<span class="out" role="img" aria-label="Locked out"></span>';
      return `<li data-safe="${esc(safe.id)}" data-mine="${esc(r.name || "")}"><button type="button" class="rrow" aria-expanded="false">` +
        `<span class="n">${two(i + 1)}</span>${chip}<span class="a"${r.tier > 0 ? "" : ' style="opacity:.7"'}>${r.tier > 0 ? esc(r.name) : "Locked out"}<small>${esc(safe.prompt)}</small></span>` +
        `<span class="m">${money(r.k || 0)}</span></button><div class="answers" hidden></div></li>`;
    }).join("");
    show("result");
    const stamp = $("rStamp");
    stamp.style.animation = "none";
    void stamp.offsetWidth;
    stamp.style.animation = "";
    if (game.kind === "daily") {
      const here = game;
      setTimeout(() => showCrowd(here, 2), 700);
      // The last door may still be paying in; refresh the stash once it has.
      setTimeout(() => loadBag().then(() => { if (game === here && screen === "result") $("rNote").textContent = statsLine() + (here.crowdLine ? " " + here.crowdLine : ""); }), 900);
    } else {
      loadBag();
    }
  }

  /** Tapping a door in the results lists every answer it would have taken. */
  async function toggleAnswers(row) {
    const li = row.closest("li");
    const box = li.querySelector(".answers");
    const open = box.hidden;
    box.hidden = !open;
    row.setAttribute("aria-expanded", String(open));
    if (!open || li.dataset.loaded) return;
    li.dataset.loaded = "1";
    box.textContent = "Having a look...";
    try {
      const data = await api(`/api/reveal?seam=${encodeURIComponent(li.dataset.safe)}&pid=${saved.pid}`);
      const basis = data.measured
        ? `Going by ${data.real.toLocaleString("en-GB")} real answers.`
        : `Mostly our best guess for now, nudged by ${data.real.toLocaleString("en-GB")} real answer${data.real === 1 ? "" : "s"}. It sharpens as people play.`;
      box.innerHTML = data.answers.map((a) =>
        `<div class="${a.name === li.dataset.mine ? "mine" : ""}"><b style="background:${COLOR[level(a.tier)]}">${a.score}</b><span>${esc(a.name)}</span><i>${a.pct}%</i></div>`).join("") +
        `<p>${data.answers.length} answers. ${esc(basis)}${data.note ? " " + esc(data.note) : ""}</p>`;
    } catch (err) {
      li.dataset.loaded = "";
      box.textContent = "Couldn't load these. Tap again to retry.";
    }
  }

  /** Ask where this job stands against everyone else who has finished tonight. */
  async function showCrowd(job, tries) {
    try {
      const r = await api("/api/finish", { pid: saved.pid, n: job.number });
      if (job !== game || screen !== "result") return;
      if (!r.ok) {
        if (tries > 1) setTimeout(() => showCrowd(job, tries - 1), 1500);
        return;
      }
      const crews = r.players.toLocaleString("en-GB");
      // With only a handful of players a percentage means nothing, so say less.
      job.crowd = r.players >= 5 && r.place === 1 ? `Top take so far out of ${crews} crews` : "";
      job.crowdLine = r.players < 5 ? `Crew number ${crews} through the door tonight.`
        : r.place === 1 ? `Top take so far tonight, out of ${crews} crews.`
        : `Place ${r.place} of ${crews} crews so far tonight.`;
      $("rNote").textContent = statsLine() + " " + job.crowdLine;
    } catch (err) { /* the results stand without it */ }
  }

  function shareText() {
    const head = game.kind === "daily" ? `Lootle #${game.number}` : game.kind === "past" ? `Lootle #${game.number} (old job)` : "Lootle practice run";
    const take = takeOf(game.results);
    return `${head}: ${money(take)}, ${rank(take, game.safes.length)}${game.crowd ? "\n" + game.crowd : ""}\n` +
      `${game.results.map((r) => SQUARES[level(r.tier)] + (r.helped ? "\u{1F9E8}" : "")).join("")}\nhttps://lootle.app`;
  }
  async function share() {
    Sfx.click();
    const text = shareText();
    try {
      await navigator.clipboard.writeText(text);
      $("share").textContent = "Copied";
    } catch (e) {
      $("rNote").style.whiteSpace = "pre-line";
      $("rNote").style.userSelect = "all";
      $("rNote").textContent = text;
    }
  }

  // ---------- Boot ----------
  function boot() {
    $("steps").innerHTML = Art.STEPS.map((x) =>
      `<div class="step"><div class="pic" aria-hidden="true">${Art.PIC[x[0]]}</div><div><h3>${x[1]}</h3><p>${x[2]}</p></div></div>`).join("");
    $("ladder").innerHTML = LEVELS.map((t, i) =>
      `<div><i style="background:${t.c}">${t.s}</i>${t.n}<small>${money(PAY[i + 1])}</small></div>`).join("");
    setMute();
    drawFront();
    Art.dress();

    $("breakin").addEventListener("click", () => start("daily"));
    for (const id of ["practice", "practice2"]) $(id).addEventListener("click", (e) => { e.preventDefault(); start("free"); });
    $("form").addEventListener("submit", (e) => { e.preventDefault(); submitGuess($("ans").value.trim()); });
    $("ans").addEventListener("input", () => Sfx.key());
    $("thru").addEventListener("click", takeIt);
    $("luck").addEventListener("click", riskIt);
    $("nextd").addEventListener("click", () => { if (game && $("panel").dataset.s === "shut") { Sfx.click(); advance(false); } });
    $("share").addEventListener("click", share);
    $("mute").addEventListener("click", () => {
      Sfx.muted = !Sfx.muted;
      saved.muted = Sfx.muted;
      save();
      setMute();
      Sfx.click();
    });
    $("opts").addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (b) { $("ans").value = b.textContent; submitGuess(b.textContent); }
    });
    $("jobs").addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (b && !b.disabled) start("past", Number(b.dataset.job));
    });
    $("rlist").addEventListener("click", (e) => {
      const row = e.target.closest(".rrow");
      if (row) toggleAnswers(row);
    });
    document.addEventListener("click", (e) => {
      const go = e.target.closest("[data-go]");
      if (go) { e.preventDefault(); Sfx.click(); return show(go.dataset.go); }
      const use = e.target.closest("[data-use]");
      if (use) return useTool(use);
      const item = e.target.closest("[data-buy]");
      if (item) return buy(item);
      const sw = e.target.closest("[data-wear]");
      if (sw) {
        const id = sw.dataset.wear;
        if (id && id !== "black" && !bag.items[id]) return show("shop");
        Sfx.click();
        wearIt(sw.dataset.slot, id, "model2");
        drawCloset();
      }
    });
    loadBag();
  }

  boot();
})();
