/* Lootle client. Prompts come from the server; answers never ship in this file. */
(function () {
  "use strict";

  const Art = window.LootleArt;
  const PAY = [0, 1, 2, 4, 7, 10]; // thousands of dollars, by loot level
  const SQUARES = ["⬛", "⬜", "\u{1F7E9}", "\u{1F7E6}", "\u{1F7EA}", "\u{1F7E8}"];
  const SECONDS = 25;
  const SECONDS_RISK = 15;
  const TRIES = 3;
  const EPOCH = Date.UTC(2026, 10, 12);
  const STORE_KEY = "lootle:v1";
  const SCREENS = ["front", "play", "result", "wardrobe", "archive", "how"];

  const $ = (id) => document.getElementById(id);
  const money = (k) => (k >= 1000 ? "$" + (Math.round(k / 10) / 100).toFixed(2).replace(/\.?0+$/, "") + "M" : "$" + k + "K");
  const three = (n) => String(n).padStart(3, "0");
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const level = (n) => Math.max(0, Math.min(5, n | 0));
  const colour = (lvl) => (lvl ? `var(--l${lvl})` : "var(--red)");
  /** Restart a CSS animation that is driven by a class. */
  function replay(node, name) {
    node.classList.remove(name);
    void node.offsetWidth;
    node.classList.add(name);
  }

  // ---------- What Chess scribbles on the file ----------
  const NOTES = {
    start: ["think weird.", "what wouldn't they say?", "go on then, impress me.", "no pressure. (some pressure.)", "first thing in your head? bin it.", "be niche.", "the obvious one pays peanuts."],
    open: ["anything goes. make it odd.", "there are no wrong answers. (there are.)", "say something only you would say."],
    hard: ["this one's mean. sorry.", "deep breath.", "nobody said crime was easy."],
    topic: [
      [/geograph|countr|capital|island|river|mountain|cit(y|ies)|lake/, ["someone owns an atlas, right?", "not france. never france.", "been anywhere nice?"]],
      [/nature|animal|bird|plant|flower|tree/, ["channel your inner attenborough.", "touch grass, then answer."]],
      [/food|drink|cook/, ["now i'm hungry.", "don't say chips."]],
      [/histor|royal|war|king|queen/, ["were you listening in school?", "history. the original gossip."]],
      [/scien|space|chem|physic|math|tech/, ["nerds, this is your moment.", "show your working. (don't.)"]],
      [/sport|football|olymp/, ["i only do cat-letics.", "no sweat. literally none."]],
      [/music|film|tv|book|art|cultur|literat/, ["very cultured. allegedly.", "popcorn's on you."]],
      [/word|languag|letter/, ["use your words. the weird ones."]],
    ],
    miss: ["nope.", "not a thing.", "try again, sherlock.", "spelling? or lying?", "the door did not budge.", "bold. wrong, but bold."],
    win: [
      [],
      ["groundbreaking.", "everyone and their nan said that.", "well, it's money.", "bold of you to say the obvious."],
      ["not bad. not good. fine.", "a tidy little sum.", "we take those."],
      ["ooh. look at you.", "now we're talking.", "someone's been reading."],
      ["did someone say genius?", "who ARE you?", "okay, show-off.", "frame it. literally."],
      ["the perfect crime. i'm not crying, you are.", "nobody said that. NOBODY.", "i'd follow you into any vault."],
    ],
    // For a good answer (rare find or better) on a particular door.
    door: {
      "dog-breeds": "did someone say dog whisperer?", cheeses: "very brie-lliant.", "all-countries": "well travelled, are we?",
      cocktails: "it's five o'clock somewhere.", pasta: "pasta la vista.", dinosaurs: "rawr.", birds: "a little bird told you?",
      flowers: "how romantic.", trees: "barking up the right tree.", "sea-creatures": "something fishy about that. i like it.",
      fruits: "fruity.", mammals: "fellow mammal. respect.", insects: "you're bugging me. in a good way.",
      colours: "colour me impressed.", sports: "good sport.", jobs: "nice work if you can get it.", instruments: "music to my ears.",
      "body-parts": "that took guts.", "car-makes": "vroom.", "in-a-fridge": "cool answer.", "pizza-toppings": "controversial topping. approved.",
      superpowers: "mine is napping.", "mythical-creatures": "i'm also a legend.", "in-a-bank-vault": "you'd know.", gemstones: "shiny.",
      "board-games": "i don't play games. (i do.)", lakes: "deep.", rivers: "going with the flow.", mountains: "peak performance.",
      "capital-cities": "capital idea.", elements: "you're in your element.", currencies: "money talks.", "us-states": "united, apparently.",
      vegetables: "five a day. sorted.", "seas-oceans": "sea what you did there.", "caribbean-islands": "holiday's on you.",
      dances: "smooth moves.", "ice-cream-flavours": "sweet.", "sandwich-fillings": "best thing since sliced bread.",
      breakfast: "most important answer of the day.", "things-that-fly": "you're flying.", "round-things": "well rounded.",
      "things-you-lose": "you'd lose your own tail.", "reasons-to-be-late": "i've used that one.", "at-a-wedding": "i do.",
    },
    bust: ["better luck next time.", "we don't talk about this one.", "that's the alarm. walk casually.", "i saw nothing.", "happens to the best of us. and you."],
    slow: ["too slow, slowcoach.", "tick tock, you got locked.", "the lock got bored."],
    riskStart: ["bold. i respect it.", "ooh, greedy.", "one shot. make it weird."],
    riskWon: ["greedy AND right.", "worth it.", "never doubted you. (i did.)"],
    riskLost: ["greed. it gets us all.", "should've taken the money.", "and that's why we don't gamble."],
    rank: {
      Mastermind: ["teach me your ways.", "i'm putting you in charge."],
      Safecracker: ["smooth. very smooth.", "professional work."],
      "Cat Burglar": ["not bad. same time tomorrow?", "one of us."],
      Pickpocket: ["small-time. it's a start.", "we all start somewhere."],
      Lookout: ["you kept watch beautifully.", "tomorrow, we ride again."],
    },
  };
  function startNote(safe) {
    if (safe.band === "open") return pick(NOTES.open);
    if (safe.band === "hard" || safe.hard) return pick(NOTES.hard);
    const about = (safe.cat + " " + safe.prompt).toLowerCase();
    const topic = NOTES.topic.find((t) => t[0].test(about));
    return topic && Math.random() < 0.6 ? pick(topic[1]) : pick(NOTES.start);
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
  }
  // Sound is on for everyone the first time they see this version.
  if (!saved.look3) { saved.look3 = 1; saved.muted = false; }
  save();
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
    key() { this.pin(0, 1400, 0.4); },
    miss() { this.tone(170, 0.22, "sawtooth", 0.07, 0, 80); this.pin(0.02); },
    /** One click of the lock: a dry metallic tick. */
    pin(delay, pitch, quiet) { this.noise(0.03, 0.18 * (quiet || 1), 6500, delay); this.tone(pitch || 2100, 0.025, "square", 0.025 * (quiet || 1), delay); },
    tick(urgent) { this.pin(0, urgent ? 2600 : 1800, urgent ? 1.4 : 0.7); },
    heartbeat() { this.tone(60, 0.12, "sine", 0.3); this.tone(52, 0.14, "sine", 0.22, 0.16); },
    /** The lock giving way: clicks that speed up, then the bolts, then the doors rolling apart. */
    crack(score) {
      const pins = 6 + Math.round(score / 12);
      for (let i = 0; i < pins; i++) this.pin(0.34 * Math.pow(i / pins, 0.7), 1500 + (i / pins) * 1500);
      this.tone(70, 0.3, "sine", 0.3, 0.36);
      this.tone(140, 0.08, "square", 0.05, 0.36);
      this.noise(0.7, 0.14, 700, 0.4);
    },
    payout(lvl) {
      const notes = [523, 659, 784, 1047, 1319];
      for (let n = 0; n < lvl; n++) this.tone(notes[n], 0.13, "square", 0.055, 1.05 + n * 0.07);
      if (lvl === 5) [2093, 2637, 3136].forEach((f, i) => this.tone(f, 0.5, "triangle", 0.06, 1.5 + i * 0.12));
    },
    stamp(delay) { this.noise(0.09, 0.5, 900, delay); this.tone(110, 0.1, "sine", 0.3, delay); },
    slam() {
      this.noise(0.35, 0.55, 420);
      this.tone(90, 0.3, "sawtooth", 0.14, 0, 40);
      this.stamp(0.24);
      for (let i = 0; i < 3; i++) {
        this.tone(620, 0.2, "square", 0.045, 0.45 + i * 0.4, 880);
        this.tone(880, 0.2, "square", 0.045, 0.65 + i * 0.4, 620);
      }
    },
    coin() { this.tone(988, 0.07, "square", 0.05); this.tone(1319, 0.2, "square", 0.05, 0.07); },
    no() { this.tone(140, 0.3, "sawtooth", 0.07, 0, 60); },
    fanfare() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.16, "square", 0.06, i * 0.13)); this.stamp(0.2); },
  };

  // ---------- State ----------
  let game = null; // { kind: "daily" | "past" | "free", number, safes, results, index, tries, risk, ... }
  let bag = { balance: 0, items: {}, shop: [] };
  let screen = "front";
  let cameFrom = "front";
  const clock = { left: 0, total: 0, ends: 0, running: false, raf: 0, lastSecond: -1 };

  const takeOf = (results) => results.reduce((sum, r) => sum + (r.k || 0), 0);
  function rank(k, doors) {
    const share = k / (doors * 10);
    if (share >= 0.6) return "Mastermind";
    if (share >= 0.4) return "Safecracker";
    if (share >= 0.25) return "Cat Burglar";
    if (share >= 0.1) return "Pickpocket";
    return "Lookout";
  }

  function show(id) {
    if (id === "back") id = game && game.done && cameFrom === "result" ? "result" : "front";
    if (screen === "front" || screen === "result") cameFrom = screen;
    if (id === "front") drawFront();
    if (id === "wardrobe") drawWardrobe();
    if (id === "archive") drawArchive();
    for (const name of SCREENS) $(name).classList.toggle("on", name === id);
    window.scrollTo(0, 0);
    screen = id;
  }

  // ---------- Front page ----------
  function drawFront() {
    $("caseNo").textContent = "CASE No. " + three(today);
    const streak = saved.lastFinished >= today - 1 ? saved.streak || 0 : 0;
    $("streak").hidden = streak < 1;
    $("streak").textContent = streak + (streak === 1 ? " NIGHT RUNNING" : " NIGHTS RUNNING");
    $("rank").textContent = saved.rank || "Lookout";
    const progress = saved.progress && saved.progress.number === today ? saved.progress : null;
    $("breakin").textContent = progress && progress.results.length >= progress.safes.length ? "See the take"
      : progress && (progress.results.length || progress.live) ? "Back in" : "Break in";
    document.querySelector("#front .mug").dataset.plate = "No. " + three(today);
    Art.dress();
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
      if (screen === "wardrobe") drawWardrobe();
    } catch (e) { /* the game still runs without the wardrobe */ }
  }
  function setMute() {
    $("mute").classList.toggle("off", Sfx.muted);
    $("mute").querySelector("span").textContent = Sfx.muted ? "Muted" : "Sound";
    $("mute").setAttribute("aria-pressed", String(!Sfx.muted));
  }

  // ---------- Starting a job ----------
  /** kind is "daily", "free" (practice) or "past" (an old job, by number). */
  async function start(kind, past) {
    Sfx.click();
    if ($("breakin").disabled) return;
    $("breakin").disabled = true;
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
          saved.archive = saved.archive || {};
          saved.archive[past] = saved.archive[past] || { played: true };
          save();
          drawArchive("You've already done case " + three(past) + ".");
          return;
        }
        safes = job.seams;
      }
      game = {
        kind, number, safes, results: progress ? progress.results : [], done: false,
        riskUsed: !!(progress && progress.riskUsed), hintUsed: !!(progress && progress.hintUsed),
      };
      game.index = game.results.length;
      // A reload mid-decision counts as taking whatever was on the table.
      const last = game.results[game.index - 1];
      if (last) bank(last.id);
      if (game.index >= safes.length) return finish(true);
      show("play");
      openDoor(false);
    } catch (err) {
      if (screen === "archive") drawArchive("Couldn't load that case. Try again.");
      else $("pitch").textContent = "Couldn't reach the vault. Check your connection and try again.";
    } finally {
      $("breakin").disabled = false;
    }
  }

  function persist() {
    if (game.kind === "free") return;
    const slot = game.kind === "past" ? "pastProgress" : "progress";
    const live = saved[slot] && saved[slot].number === game.number ? saved[slot].live : undefined;
    saved[slot] = { number: game.number, safes: game.safes, results: game.results, live, riskUsed: game.riskUsed, hintUsed: game.hintUsed };
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
  const exhibit = () => document.querySelector(".exhibit");
  function setState(s) { $("play").dataset.s = s; }
  function note(text, id) {
    $(id || "note").textContent = text;
  }
  function drawPips() {
    $("pips").classList.toggle("many", game.safes.length > 6);
    $("pips").innerHTML = game.safes.map((s, i) => {
      const r = game.results[i];
      return r ? `<i style="background:${colour(level(r.tier))};border-color:${colour(level(r.tier))}"></i>` : `<i class="${i === game.index ? "now" : ""}"></i>`;
    }).join("");
    $("tonight").textContent = game.kind === "daily" ? money(takeOf(game.results)) + " TONIGHT"
      : game.kind === "past" ? "COLD CASE " + three(game.number) : "PRACTICE";
  }
  function drawTries() {
    let html = "";
    const total = game.risk ? 1 : TRIES;
    for (let i = 0; i < total; i++) html += `<i class="${i < game.tries ? "" : "off"}"></i>`;
    $("tries").innerHTML = html;
    $("tries").setAttribute("aria-label", game.tries + (game.tries === 1 ? " try left" : " tries left"));
  }
  function drawTickets() {
    const hint = $("hint");
    hint.disabled = game.hintUsed || game.risk;
    hint.classList.toggle("used", game.hintUsed);
    hint.textContent = game.hintUsed ? "Hint · used" : "Hint · 1 left";
    $("riskLeft").classList.toggle("used", game.riskUsed);
    $("riskLeft").textContent = game.riskUsed ? "Risk · used" : "Risk · 1 left";
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
        game.tries = Math.max(1, Math.min(live.tries, TRIES));
        left = Math.max(2000, live.left);
      }
    } else {
      game.tries = 1;
    }
    const box = exhibit();
    box.classList.add("snap");
    box.classList.remove("is-open", "is-shut", "through");
    void box.offsetWidth;
    box.classList.remove("snap");
    $("doorNo").textContent = risk ? `DOOR ${game.index + 1} · ONE GO · BEAT ${game.held.score}` : `DOOR ${game.index + 1} OF ${game.safes.length}`;
    $("q").textContent = safe.prompt;
    $("miss").textContent = "";
    $("help").textContent = risk ? `It has to be rarer than “${game.held.name}” or this door pays nothing.` : "";
    $("ans").value = "";
    $("crack").disabled = false;
    setState("idle");
    note(risk ? pick(NOTES.riskStart) : startNote(safe));
    drawPips();
    drawTries();
    drawTickets();
    startClock(risk ? SECONDS_RISK : SECONDS, left);
    // Keep the keyboard up between doors on phones.
    $("ans").focus({ preventScroll: true });
  }

  // ---------- The lock is the clock ----------
  function startClock(seconds, leftMs) {
    clock.total = seconds * 1000;
    clock.left = leftMs ? Math.min(leftMs, clock.total) : clock.total;
    clock.lastSecond = -1;
    resumeClock();
  }
  function resumeClock() {
    cancelAnimationFrame(clock.raf);
    clock.ends = performance.now() + clock.left;
    clock.running = true;
    const dial = $("dial");
    const tick = (now) => {
      if (!clock.running) return;
      clock.left = Math.max(0, clock.ends - now);
      dial.style.setProperty("--p", (clock.left / clock.total).toFixed(4));
      const secs = Math.ceil(clock.left / 1000);
      if (secs !== clock.lastSecond) {
        clock.lastSecond = secs;
        saveLive();
        $("secs").textContent = secs;
        dial.classList.toggle("low", secs <= 5);
        dial.setAttribute("aria-label", secs + " seconds left");
        if (secs > 0 && secs < clock.total / 1000) {
          if (game.risk) Sfx.heartbeat();
          else Sfx.tick(secs <= 5);
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
    saveLive();

    let hit;
    try {
      hit = await api("/api/answer", playBody({ guess: text, again: game.risk }));
    } catch (err) {
      if (err.status === 409) return bust("You've been through this door before.", NOTES.bust);
      $("miss").textContent = err.status === 429 ? "Slow down a second." : "Lost the signal. Try that again.";
      game.busy = false;
      $("crack").disabled = false;
      resumeClock();
      return;
    }
    if (game.risk) {
      setBalance(hit.balance);
      if (hit.ok && hit.won) return win(hit, true);
      return bust(hit.ok
        ? `“${hit.name}” scores ${hit.score}. You needed more than ${game.held.score}, so this door pays nothing.`
        : `Wrong answer. You had ${game.held.score} in your paws and dropped it.`, NOTES.riskLost, true);
    }
    if (hit.ok) return win(hit, false);

    game.tries--;
    drawTries();
    Sfx.miss();
    replay($("form"), "nope");
    if (game.tries <= 0) return bust("Three wrong and the shutters come down. This door pays nothing.", NOTES.bust);
    note(pick(NOTES.miss));
    $("miss").textContent = `“${text}” isn't one.`;
    $("ans").value = "";
    game.busy = false;
    $("crack").disabled = false;
    resumeClock();
    $("ans").focus({ preventScroll: true });
  }

  function outOfTime() {
    if (!game || game.busy) return;
    game.busy = true;
    if (game.risk) return bust(`The lock ran down. You had ${game.held.score} and now you don't.`, NOTES.slow);
    bust("The lock ran down before you cracked it. This door pays nothing.", NOTES.slow);
  }

  /** A door that opened. `swapped` means it was the risked second answer. */
  function win(hit, swapped) {
    const safe = game.safes[game.index];
    const lvl = level(hit.tier);
    const result = { id: safe.id, name: hit.name, tier: lvl, score: hit.score, k: PAY[lvl], helped: game.helped || !!hit.assisted };
    if (swapped) game.results[game.index] = result;
    else game.results.push(result);
    game.settled = swapped; // a risked answer is paid by the server straight away
    game.busy = false;
    game.held = { name: hit.name, score: hit.score };
    if (saved.progress && game.kind === "daily") saved.progress.live = undefined;
    persist();

    $("play").style.setProperty("--lc", colour(lvl));
    $("loot").innerHTML = Art.loot(lvl);
    $("levelStamp").textContent = Art.levelName(lvl);
    $("levelStamp").style.fontSize = lvl === 5 ? "17px" : "";
    $("score").textContent = hit.score;
    $("said").textContent = hit.name;
    $("lootName").textContent = Art.lootName(lvl);
    $("pay").textContent = game.kind === "daily" ? "+" + money(PAY[lvl]) : game.kind === "past" ? "cold case, no pay" : "practice, no pay";
    const canRisk = !swapped && !game.riskUsed && hit.score < 100 && hit.deeper > 0;
    $("risk").hidden = !canRisk;
    $("riskHelp").textContent = canRisk
      ? `One risk a night. Use it here and you get one more answer: rarer than ${hit.score} trades up, anything else and this door pays nothing.`
      : swapped ? "Traded up. That was your risk for tonight."
      : game.riskUsed ? "You've used tonight's risk, so this one's banked."
      : "That's as rare as it gets. Nothing to risk it for.";
    $("take").textContent = game.index + 1 >= game.safes.length ? "Take it and go" : "Take it";
    exhibit().classList.add("is-open");
    setState("open");
    $("ans").blur();
    drawPips();
    Sfx.crack(hit.score);
    Sfx.payout(lvl);
    Sfx.stamp(1.25);
    const line = swapped ? pick(NOTES.riskWon)
      : lvl >= 3 && NOTES.door[safe.id] && Math.random() < 0.7 ? NOTES.door[safe.id]
      : pick(NOTES.win[lvl] || NOTES.win[1]);
    note("");
    const here = game;
    const index = game.index;
    setTimeout(() => { if (game === here && game.index === index && $("play").dataset.s === "open") note(line); }, 1100);
    $("take").focus({ preventScroll: true });
  }

  /** A door that is lost: three misses, the clock, or a risk that did not come off. */
  function bust(why, lines, alreadySettled) {
    pauseClock();
    const safe = game.safes[game.index];
    const result = { id: safe.id, name: "", tier: 0, score: 0, k: 0, helped: game.helped };
    if (game.results.length > game.index) game.results[game.index] = result;
    else game.results.push(result);
    if (saved.progress && game.kind === "daily") saved.progress.live = undefined;
    persist();
    drawPips();

    $("shutQ").textContent = safe.prompt.replace(/\.$/, "");
    $("shutWhy").textContent = why;
    $("wouldLabel").hidden = true;
    $("seeAll").hidden = true;
    $("would").className = "would";
    $("would").innerHTML = "";
    $("next").textContent = game.index + 1 >= game.safes.length ? "See the take" : "Next door";
    const box = exhibit();
    box.classList.remove("is-open");
    box.classList.add("is-shut");
    setState("shut");
    $("ans").blur();
    replay($("app"), "shake");
    Sfx.slam();
    note(pick(lines));
    game.settled = true;

    // Lock it on the server, then show a spread of answers that would have opened it.
    const here = game;
    const index = game.index;
    (alreadySettled ? Promise.resolve() : bank(safe.id))
      .then(() => api(`/api/reveal?seam=${encodeURIComponent(safe.id)}&pid=${saved.pid}`))
      .then((data) => {
        if (game !== here || game.index !== index || !data.answers.length) return;
        const all = data.answers.slice().reverse(); // most obvious first
        const chip = (a) => `<div><b style="background:${colour(level(a.tier))}">${a.score}</b><span>${esc(a.name)}</span></div>`;
        const count = all.length <= 10 ? all.length : 8;
        const some = [];
        for (let i = 0; i < count; i++) some.push(all[Math.round((i * (all.length - 1)) / Math.max(1, count - 1))]);
        $("would").innerHTML = some.map(chip).join("");
        $("wouldLabel").textContent = `These would've worked · ${count} of ${all.length}`;
        $("wouldLabel").hidden = false;
        $("seeAll").hidden = all.length <= count;
        $("seeAll").textContent = `See all ${all.length}`;
        $("seeAll").onclick = () => {
          $("would").className = "would all";
          $("would").innerHTML = all.map(chip).join("");
          $("seeAll").hidden = true;
        };
      })
      .catch(() => {});
    $("next").focus({ preventScroll: true });
  }

  function takeIt() {
    if (!game || $("play").dataset.s !== "open") return;
    Sfx.coin();
    if (!game.settled) bank(game.safes[game.index].id);
    advance(true);
  }

  async function riskIt() {
    if (!game || $("play").dataset.s !== "open" || game.settled || game.riskUsed || game.busy) return;
    game.busy = true;
    Sfx.click();
    try {
      await api("/api/risk", playBody());
    } catch (err) {
      game.busy = false;
      game.riskUsed = err.status === 409 && /risk/i.test(err.message);
      $("risk").hidden = true;
      $("riskHelp").textContent = game.riskUsed ? "You've already used tonight's risk." : "Couldn't reach the vault, so this one's banked.";
      persist();
      return;
    }
    // From here the held loot is gone unless the next answer beats it.
    game.riskUsed = true;
    game.results[game.index] = { id: game.safes[game.index].id, name: "", tier: 0, score: 0, k: 0, helped: game.helped };
    persist();
    openDoor(true);
  }

  /** Move on to the next door, or to the results after the last one. */
  function advance(through) {
    game.index++;
    persist();
    const next = () => {
      if (game.index >= game.safes.length) return finish(false);
      openDoor(false);
    };
    if (!through) return next();
    exhibit().classList.add("through");
    setTimeout(next, 460);
  }

  // ---------- The one hint of the night ----------
  async function useHint() {
    if (!game || game.busy || game.risk || game.hintUsed || $("play").dataset.s !== "idle") return;
    $("hint").disabled = true;
    try {
      const out = await api("/api/use", playBody({ item: "hint" }));
      game.hintUsed = true;
      game.helped = true;
      persist();
      Sfx.pin(0); Sfx.pin(0.18); Sfx.pin(0.3);
      note(`psst. try something starting with ${out.letter}.`);
    } catch (err) {
      if (err.status === 409 && /used/i.test(err.message)) { game.hintUsed = true; persist(); }
      $("miss").textContent = err.message;
      Sfx.no();
    }
    drawTickets();
  }

  // ---------- Wardrobe ----------
  const GROUPS = { coat: ["black", "tux", "ginger", "siamese"], hat: ["", "cap", "beret", "tophat", "crown"], neck: ["", "bow", "pearls", "scarf"] };
  const WEAR_NAME = { black: "Black", "": "None", tux: "Tuxedo", ginger: "Ginger", siamese: "Siamese", cap: "Flat cap", beret: "Beret", tophat: "Top hat", crown: "Crown", bow: "Bow tie", pearls: "Pearls", scarf: "Scarf" };
  let wanted = null;
  const owns = (id) => id === "" || id === "black" || !!bag.items[id];
  function drawWardrobe() {
    const fit = Art.fit();
    for (const [slot, box] of [["coat", "wCoat"], ["hat", "wHat"], ["neck", "wNeck"]]) {
      $(box).innerHTML = GROUPS[slot].map((id) => {
        const it = bag.shop.find((i) => i.id === id);
        const out = !owns(id) && it && it.out;
        const look = Object.assign({ coat: "black", hat: "", neck: "" }, { [slot]: id });
        return `<button type="button" class="sw${fit[slot] === id ? " on" : ""}${owns(id) ? "" : " priced"}${out ? " out" : ""}" data-slot="${slot}" data-wear="${id}">` +
          `${Art.cat(46, look)}<span>${owns(id) ? WEAR_NAME[id] : out ? "Not tonight" : it ? money(it.price) : "..."}</span></button>`;
      }).join("");
    }
    setBalance(bag.balance);
    const it = wanted && bag.shop.find((i) => i.id === wanted);
    $("offer").hidden = !it || owns(wanted);
    if (it && !owns(wanted)) {
      const short = it.price - bag.balance;
      $("offerText").textContent = `${it.name}. ${it.blurb} ${money(it.price)}.` + (short > 0 ? ` You're ${money(short)} short.` : "");
      $("buy").disabled = short > 0;
    }
    Art.dress();
  }
  function wear(slot, id) {
    const fit = Object.assign({}, Art.fit());
    fit[slot] = id;
    saved.fit = fit;
    save();
    Art.fit(fit);
  }
  function pickWear(button) {
    const id = button.dataset.wear;
    const slot = button.dataset.slot;
    Sfx.click();
    if (owns(id)) {
      wanted = null;
      wear(slot, id);
      note(pick(["very me.", "i look expensive.", "yes. this.", "don't laugh."]), "wNote");
    } else {
      const it = bag.shop.find((i) => i.id === id);
      wanted = it && !it.out ? id : null;
      note(it && it.out ? "not in tonight. check back." : "ooh. buy me that.", "wNote");
    }
    drawWardrobe();
  }
  async function buy() {
    const it = bag.shop.find((i) => i.id === wanted);
    if (!it) return;
    $("buy").disabled = true;
    try {
      const out = await api("/api/buy", { pid: saved.pid, item: it.id, qty: 1 });
      bag.items = out.items;
      bag.balance = out.balance;
      Sfx.coin();
      wear(it.slot, it.id);
      wanted = null;
      note("money well spent.", "wNote");
    } catch (err) {
      if (err.data && typeof err.data.balance === "number") { bag.balance = err.data.balance; bag.items = err.data.items || bag.items; }
      note(err.status === 402 ? "we can't afford it. yet." : "the till's jammed. try again.", "wNote");
      Sfx.no();
    }
    drawWardrobe();
  }

  // ---------- Old cases ----------
  const jobDate = (n) => new Date(EPOCH + (n - 1) * 86400000)
    .toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  function drawArchive(text) {
    if (text) $("archiveNote").textContent = text;
    const done = saved.archive || {};
    let html = "";
    for (let n = today - 1; n >= 1; n--) {
      const d = done[n];
      const midway = saved.pastProgress && saved.pastProgress.number === n && !d;
      const status = d ? (d.take != null ? money(d.take) : "Closed") : midway ? "Back in" : "Open";
      html += `<button type="button" data-job="${n}" class="${d ? "done" : ""}"${d ? " disabled" : ""}>` +
        `<span class="num">${three(n)}</span><span class="when">${jobDate(n)}</span><span class="go">${status}</span></button>`;
    }
    $("jobs").innerHTML = html || '<p class="ty small dim">Nothing here yet. Come back tomorrow.</p>';
  }

  // ---------- Results ----------
  const statsLine = () => `Streak ${saved.streak || 1} · Best ${money(saved.best || 0)} · Stash ${money(bag.balance)}. New doors at midnight.`;

  function finish(resumed) {
    pauseClock();
    const take = takeOf(game.results);
    const doors = game.safes.length;
    const title = rank(take, doors);
    game.done = true;
    game.index = doors;
    if (game.kind === "daily" && !resumed && saved.lastFinished !== game.number) {
      saved.streak = saved.lastFinished === game.number - 1 ? (saved.streak || 0) + 1 : 1;
      saved.lastFinished = game.number;
      saved.played = (saved.played || 0) + 1;
      saved.best = Math.max(saved.best || 0, take);
    }
    if (game.kind === "daily") saved.rank = title;
    if (game.kind !== "free") {
      saved.archive = saved.archive || {};
      saved.archive[game.number] = { take, levels: game.results.map((r) => r.tier) };
    }
    save();
    if (!resumed) Sfx.fanfare();

    $("rCase").textContent = game.kind === "daily" ? `CASE No. ${three(game.number)} · CLOSED`
      : game.kind === "past" ? `COLD CASE ${three(game.number)} · CLOSED` : "PRACTICE RUN";
    $("rTake").textContent = money(take);
    $("rStamp").textContent = title;
    $("rNote").textContent = pick(NOTES.rank[title]);
    $("rStats").textContent = game.kind === "daily" ? statsLine()
      : game.kind === "past" ? "From the cold cases, so none of this went in the stash." : "Practice doesn't pay. The real job does.";
    $("share").textContent = "Brag about it";
    game.crowd = "";
    $("rows").innerHTML = game.safes.map((safe, i) => {
      const r = game.results[i] || { tier: 0, k: 0, name: "" };
      const lvl = level(r.tier);
      return `<li data-safe="${esc(safe.id)}" data-mine="${esc(r.name || "")}"><button type="button" class="row" aria-expanded="false">` +
        `<span class="chip" style="background:${colour(lvl)};color:${lvl ? "var(--ink)" : "var(--paper)"}">${lvl ? r.score : "×"}</span>` +
        `<span class="a">${lvl ? esc(r.name) : "Locked out"}<small>${esc(safe.prompt)}</small></span>` +
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
      setTimeout(() => loadBag().then(() => { if (game === here && screen === "result") $("rStats").textContent = statsLine() + (here.crowdLine ? " " + here.crowdLine : ""); }), 900);
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
      box.innerHTML = data.answers.map((a) =>
        `<div class="${a.name === li.dataset.mine ? "mine" : ""}"><b style="background:${colour(level(a.tier))}">${a.score}</b><span>${esc(a.name)}</span></div>`).join("") +
        `<p>${data.answers.length} answers, rarest first.${data.note ? " " + esc(data.note) : ""}</p>`;
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
      // With only a handful of players a ranking means nothing, so say less.
      job.crowd = r.players >= 5 && r.place === 1 ? `Top take so far out of ${crews} crews` : "";
      job.crowdLine = r.players < 5 ? `Crew number ${crews} through the door tonight.`
        : r.place === 1 ? `Top take so far tonight, out of ${crews} crews.`
        : `Place ${r.place} of ${crews} crews so far tonight.`;
      $("rStats").textContent = statsLine() + " " + job.crowdLine;
    } catch (err) { /* the results stand without it */ }
  }

  function shareText() {
    const head = game.kind === "daily" ? `Lootle #${game.number}` : game.kind === "past" ? `Lootle #${game.number} (cold case)` : "Lootle practice run";
    const take = takeOf(game.results);
    return `${head}: ${money(take)}, ${rank(take, game.safes.length)}${game.crowd ? "\n" + game.crowd : ""}\n` +
      `${game.results.map((r) => SQUARES[level(r.tier)] + (r.helped ? "\u{1F4A1}" : "")).join("")}\nhttps://lootle.app`;
  }
  async function share() {
    Sfx.click();
    const text = shareText();
    try {
      await navigator.clipboard.writeText(text);
      $("share").textContent = "Copied";
    } catch (e) {
      $("rStats").style.whiteSpace = "pre-line";
      $("rStats").style.userSelect = "all";
      $("rStats").textContent = text;
    }
  }

  // ---------- Boot ----------
  function boot() {
    let ticks = "";
    for (let i = 0; i < 25; i++) ticks += `<i class="${i % 5 === 0 ? "major" : ""}" style="transform:translate(-50%,-50%) rotate(${i * 14.4}deg) translateY(-49px)"></i>`;
    $("ticks").innerHTML = ticks;
    $("teethA").setAttribute("d", Art.teeth(false));
    $("teethB").setAttribute("d", Art.teeth(true));
    const legend = Art.legend((lvl) => money(PAY[lvl]));
    $("legend").innerHTML = legend;
    $("legend2").innerHTML = legend;
    setMute();
    drawFront();

    $("breakin").addEventListener("click", () => start("daily"));
    for (const id of ["practice", "practice2"]) $(id).addEventListener("click", () => start("free"));
    $("form").addEventListener("submit", (e) => { e.preventDefault(); submitGuess($("ans").value.trim()); });
    $("ans").addEventListener("input", () => Sfx.key());
    $("take").addEventListener("click", takeIt);
    $("risk").addEventListener("click", riskIt);
    $("hint").addEventListener("click", useHint);
    $("next").addEventListener("click", () => { if (game && $("play").dataset.s === "shut") { Sfx.click(); advance(false); } });
    $("share").addEventListener("click", share);
    $("buy").addEventListener("click", buy);
    $("mute").addEventListener("click", () => {
      Sfx.muted = !Sfx.muted;
      saved.muted = Sfx.muted;
      save();
      setMute();
      Sfx.click();
    });
    $("jobs").addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (b && !b.disabled) start("past", Number(b.dataset.job));
    });
    $("rows").addEventListener("click", (e) => {
      const row = e.target.closest(".row");
      if (row) toggleAnswers(row);
    });
    document.addEventListener("click", (e) => {
      const go = e.target.closest("[data-go]");
      if (go) { e.preventDefault(); Sfx.click(); return show(go.dataset.go); }
      const sw = e.target.closest("[data-wear]");
      if (sw) pickWear(sw);
    });
    // Browsers only allow sound after a tap, so wake it on the first one.
    document.addEventListener("pointerdown", () => Sfx.wake(), { once: true });
    loadBag();
  }

  boot();
})();
