/* Lootle client. Prompts come from the server; answers never ship in this file. */
(function () {
  "use strict";

  const TIERS = [
    { name: "NOTHING", k: 0, color: "#e2475b" },
    { name: "LOOSE CHANGE", k: 10, color: "#c9c3e6" },
    { name: "CASH", k: 20, color: "#7ef0c1" },
    { name: "GOLD BAR", k: 35, color: "#ffd166" },
    { name: "PAINTING", k: 50, color: "#ff8fa0" },
    { name: "CROWN JEWELS", k: 70, color: "#b98cf2" },
    { name: "THE BIG SCORE", k: 100, color: "#bff3ff" },
  ];
  const SAFES = 7;
  const SECONDS = 30;
  const SECONDS_RISK = 20;
  const TRIES = 3;
  const EPOCH = Date.UTC(2026, 10, 12);
  const STORE_KEY = "lootle:v1";
  const CIRC = 2 * Math.PI * 138;
  const SQUARES = ["\u{1F6A8}", "⬜", "\u{1F7E9}", "\u{1F7E8}", "\u{1F7E5}", "\u{1F7EA}", "\u{1F48E}"];

  const $ = (id) => document.getElementById(id);
  const el = {};
  for (const id of [
    "jobLabel", "mute", "muteWave", "muteX", "take", "safeNo", "tries", "haul", "intro", "ladder",
    "startDaily", "startFree", "statsLine", "play", "safeCat", "prompt", "risk", "answerForm", "answer",
    "spinBtn", "actions", "next", "again", "feedback", "dial", "segs", "zones", "zoneGreen", "zoneRed",
    "arc", "knob", "cTop", "cMain", "cSub", "summary", "sumRank", "sumTotal", "sumLine", "share",
    "freeAgain", "sumStats", "safeList",
  ]) el[id] = $(id);

  const money = (k) => "$" + k + "K";
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
    click() { this.tone(520, 0.05, "square", 0.05); },
    key() { this.tone(1300, 0.015, "square", 0.015); },
    miss() { this.tone(170, 0.22, "sawtooth", 0.07, 0, 80); },
    tick() { this.tone(880, 0.04, "square", 0.04); },
    heartbeat() { this.tone(60, 0.12, "sine", 0.3); this.tone(52, 0.14, "sine", 0.22, 0.16); },
    /** Dial clicks that start fast and slow down, then a clunk and a rising chime. */
    spin(seconds, tier) {
      const clicks = Math.max(4, Math.round(seconds * 14));
      for (let i = 0; i < clicks; i++) {
        const p = i / clicks;
        this.tone(1500 - p * 500, 0.03, "square", 0.035, seconds * (1 - Math.pow(1 - p, 2.2)));
      }
      this.tone(70, 0.25, "sine", 0.25, seconds);
      const notes = [392, 494, 587, 698, 784, 988, 1175];
      for (let n = 0; n <= tier; n++) this.tone(notes[n], 0.14, "square", 0.06, seconds + 0.06 + n * 0.07);
      if (tier === 6) this.tone(2093, 0.6, "triangle", 0.07, seconds + 0.6);
    },
    siren() {
      for (let i = 0; i < 4; i++) {
        this.tone(620, 0.22, "square", 0.07, i * 0.44, 880);
        this.tone(880, 0.22, "square", 0.07, i * 0.44 + 0.22, 620);
      }
    },
    lockout() { this.tone(140, 0.5, "sawtooth", 0.08, 0, 50); },
    fanfare() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.16, "square", 0.06, i * 0.13)); },
  };

  // ---------- The dial ----------
  function setArc(fraction, color, seconds) {
    const ease = seconds ? `${seconds}s cubic-bezier(.15,.8,.2,1)` : "0s";
    el.arc.style.transition = `stroke-dasharray ${ease}`;
    el.knob.style.transition = `transform ${ease}`;
    if (color) el.arc.style.stroke = color;
    el.arc.style.strokeDasharray = `${fraction * CIRC} ${CIRC + 1}`;
    el.knob.style.transform = `rotate(${fraction * 360}deg)`;
  }
  /** Sweep from zero to the tier. Rarer loot travels further and takes longer. */
  async function spinTo(tier) {
    setArc(0, TIERS[tier].color, 0);
    void el.arc.getBoundingClientRect();
    const seconds = reducedMotion ? 0 : 0.9 + tier * 0.3;
    Sfx.spin(seconds, tier);
    setArc(tier / 6, TIERS[tier].color, seconds);
    await wait(seconds * 1000 + 80);
    if (tier === 6) pulse("flash");
  }
  function pulse(name) {
    if (reducedMotion) return;
    el.dial.classList.remove(name);
    void el.dial.offsetWidth;
    el.dial.classList.add(name);
  }
  function centre(top, main, sub, color, subIsMoney) {
    el.cTop.textContent = top;
    el.cTop.style.color = color || "";
    el.cMain.textContent = main;
    el.cMain.className = "cmain" + (main.length > 16 ? " long" : main.length > 8 ? " mid" : "");
    el.cSub.textContent = sub;
    el.cSub.className = "csub" + (subIsMoney ? " money" : "");
  }
  function setAlarm(on, heldTier) {
    document.body.classList.toggle("alarm", on);
    el.zones.toggleAttribute("hidden", !on);
    el.segs.style.display = on ? "none" : "";
    if (on) {
      const held = (heldTier / 6) * CIRC;
      el.zoneRed.style.strokeDasharray = `${held} ${CIRC}`;
      el.zoneGreen.style.strokeDasharray = `${CIRC - held - 6} ${CIRC}`;
      el.zoneGreen.style.strokeDashoffset = `${-(held + 3)}`;
    }
  }

  // ---------- Game state ----------
  let game = null; // { daily, number, safes, results, index, tries, risk, busy }
  const clock = { raf: 0, ends: 0, left: 0, total: 0, lastSecond: -1, running: false };
  const takeOf = (results) => results.reduce((sum, r) => sum + TIERS[r.tier].k, 0);

  function syncHud() {
    const results = game ? game.results : [];
    el.take.textContent = money(takeOf(results));
    el.safeNo.textContent = game ? `${Math.min(game.index + 1, SAFES)} / ${SAFES}` : "- / 7";
    let html = "";
    for (let i = 0; i < SAFES; i++) {
      const r = results[i];
      if (r) html += r.tier ? `<i style="background:${TIERS[r.tier].color}"></i>` : '<i class="bust"></i>';
      else html += `<i class="${game && i === game.index ? "now" : ""}"></i>`;
    }
    el.haul.innerHTML = html;
    const done = results.filter((r) => r.tier).length;
    el.haul.setAttribute("aria-label", `${results.length} of ${SAFES} safes done, ${done} paid out`);
  }
  function drawTries() {
    const total = game.risk ? 1 : TRIES;
    let html = "";
    for (let i = 0; i < total; i++) html += `<i class="${i < game.tries ? "" : "used"}"></i>`;
    el.tries.innerHTML = html;
    el.tries.setAttribute("aria-label", `${game.tries} tries left`);
  }
  function show(name) {
    el.intro.hidden = name !== "intro";
    el.play.hidden = name !== "play";
    el.summary.hidden = name !== "summary";
    el.dial.hidden = name === "summary";
    document.body.classList.toggle("done", name === "summary");
  }
  function mode(answering) {
    el.answerForm.hidden = !answering;
    el.actions.hidden = answering;
  }
  function say(text, bad) {
    el.feedback.textContent = text;
    el.feedback.classList.toggle("bad", !!bad);
  }
  function persist() {
    if (!game.daily) return;
    saved.progress = { number: game.number, safes: game.safes, results: game.results };
    save();
  }

  async function start(daily) {
    Sfx.click();
    el.startDaily.disabled = el.startFree.disabled = el.freeAgain.disabled = true;
    try {
      const progress = daily && saved.progress && saved.progress.number === today ? saved.progress : null;
      const safes = progress
        ? progress.safes
        : (await api(daily ? `/api/job?n=${today}` : `/api/job?free=1&pid=${saved.pid}`)).seams;
      game = { daily, number: daily ? today : 0, safes, results: progress ? progress.results : [] };
      game.index = game.results.length;
      // A reload mid-decision counts as grabbing the last loot.
      const last = game.results[game.index - 1];
      if (last) api("/api/bank", { seam: last.id, pid: saved.pid, n: game.number }).catch(() => {});
      el.jobLabel.textContent = daily ? "JOB #" + String(today).padStart(3, "0") : "PRACTICE";
      if (game.index >= SAFES) finish(true);
      else openSafe(false);
    } catch (err) {
      el.statsLine.textContent = "Could not reach the vault. Check your connection and try again.";
      show("intro");
    } finally {
      el.startDaily.disabled = el.startFree.disabled = el.freeAgain.disabled = false;
    }
  }

  function openSafe(risk) {
    const safe = game.safes[game.index];
    const held = risk ? game.results[game.index] : null;
    game.risk = risk;
    game.tries = risk ? 1 : TRIES;
    game.busy = false;
    game.needsBank = false;
    el.safeCat.textContent = `SAFE ${game.index + 1} · ${risk ? "SECOND SPIN" : safe.cat.toUpperCase()}`;
    el.prompt.textContent = safe.prompt;
    el.answer.value = "";
    el.answer.placeholder = risk ? "Something rarer" : "Type your answer";
    el.spinBtn.textContent = risk ? "RISK IT" : "SPIN";
    el.spinBtn.disabled = false;
    say("");
    if (risk) {
      el.risk.innerHTML = `Beat <b>${esc(held.name)}</b>. Land in the green and you swap up. Land in the red, repeat yourself or miss, and this safe pays nothing.`;
      setAlarm(true, held.tier);
      setArc(held.tier / 6, TIERS[held.tier].color, 0);
      // Hide the held arc so the red alarm zone underneath it shows; the knob still marks the spot.
      el.arc.style.strokeDasharray = `0 ${CIRC + 1}`;
    } else {
      setAlarm(false);
      setArc(0, "#ffd166", 0);
    }
    el.risk.hidden = !risk;
    drawTries();
    syncHud();
    mode(true);
    show("play");
    el.answer.focus();
    startClock(risk ? SECONDS_RISK : SECONDS);
  }

  // ---------- Clock (pauses while a guess is being checked) ----------
  function startClock(seconds) {
    clock.total = seconds * 1000;
    clock.left = clock.total;
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
        const low = secs <= 5;
        centre(game.risk ? "ALARM IN" : "TIME LEFT", "0:" + String(secs).padStart(2, "0"),
          game.risk ? "HOLDING " + TIERS[game.results[game.index].tier].name : "RARER TURNS FURTHER",
          game.risk ? "#ff8fa0" : "");
        el.cMain.classList.toggle("low", low);
        if (secs > 0) {
          if (game.risk) Sfx.heartbeat();
          else if (low) Sfx.tick();
        }
      }
      if (clock.left <= 0) { clock.running = false; return outOfTime(); }
      clock.raf = requestAnimationFrame(tick);
    };
    clock.raf = requestAnimationFrame(tick);
  }
  function pauseClock() {
    clock.running = false;
    cancelAnimationFrame(clock.raf);
    clock.left = Math.max(0, clock.ends - performance.now());
  }

  // ---------- Answering ----------
  const playBody = (extra) => Object.assign({ seam: game.safes[game.index].id, pid: saved.pid, n: game.number }, extra);
  const lockSafe = () => api("/api/bank", playBody()).catch(() => {});

  async function onSubmit(event) {
    event.preventDefault();
    if (!game || el.play.hidden || el.answerForm.hidden || game.busy) return;
    const text = el.answer.value.trim();
    if (!text) return;
    game.busy = true;
    el.spinBtn.disabled = true;
    pauseClock();
    Sfx.wake();

    let hit;
    try {
      hit = await api("/api/answer", playBody({ guess: text, again: game.risk }));
    } catch (err) {
      game.busy = false;
      el.spinBtn.disabled = false;
      if (err.status === 409) {
        // The server already closed this safe (another tab, or a reload mid-safe).
        if (game.results[game.index]) return next();
        return bust("LOCKED OUT", "This safe was already settled on another screen.", false);
      }
      say(err.status === 429 ? "Too fast. Wait a few seconds, then try again. That try was not counted."
        : "Signal lost. That try was not counted. Try again.", true);
      resumeClock();
      return;
    }

    if (game.risk) {
      const held = game.results[game.index];
      if (hit.ok && hit.tier > held.tier) return win(hit, true);
      const why = !hit.ok ? `“${text}” is not in this safe.`
        : hit.name === held.name ? "Same answer twice."
        : `${hit.name} is only ${TIERS[hit.tier].name.toLowerCase()}.`;
      return bust("ALARM TRIPPED", `${why} You dropped the ${TIERS[held.tier].name.toLowerCase()}.`, true);
    }

    if (hit.ok) return win(hit, false);
    game.tries--;
    drawTries();
    Sfx.miss();
    pulse("wobble");
    if (game.tries <= 0) { lockSafe(); return bust("LOCKED OUT", "Three tries and it would not open.", false); }
    game.busy = false;
    el.spinBtn.disabled = false;
    say(`“${text}” is not in this safe.`, true);
    el.answer.value = "";
    el.answer.classList.remove("shake");
    void el.answer.offsetWidth;
    el.answer.classList.add("shake");
    el.answer.focus();
    resumeClock();
  }

  function outOfTime() {
    if (game.busy) return;
    game.busy = true;
    lockSafe();
    if (game.risk) {
      const held = game.results[game.index];
      bust("ALARM TRIPPED", `Out of time. You dropped the ${TIERS[held.tier].name.toLowerCase()}.`, true);
    } else {
      bust("LOCKED OUT", "Out of time.", false);
    }
  }

  async function win(hit, swapped) {
    const t = TIERS[hit.tier];
    el.answer.blur();
    mode(false);
    el.actions.hidden = true;
    el.risk.hidden = true;
    say("");
    setAlarm(false);
    centre(swapped ? "SWAPPING UP" : "CRACKING", "...", "", "");
    el.cMain.classList.remove("low");
    await spinTo(hit.tier);

    game.results[game.index] = { id: game.safes[game.index].id, name: hit.name, tier: hit.tier, pct: hit.pct };
    persist();
    syncHud();
    centre(t.name, hit.name, "+" + money(t.k), t.color, true);
    const read = hit.corrected ? `Read as ${hit.name}. ` : "";
    const share = read + (hit.measured ? `${hit.pct}% of crews said this.` : `About ${hit.pct}% of crews are expected to say this.`);
    const canRisk = !swapped && hit.deeper > 0;
    say(canRisk ? `${share} ${hit.deeper} rarer answer${hit.deeper === 1 ? "" : "s"} still in this safe.`
      : `${share}${hit.deeper ? "" : " Nothing rarer in this safe."}`);
    el.again.hidden = !canRisk;
    el.next.textContent = canRisk ? "GRAB IT AND GO" : game.index === SAFES - 1 ? "GETAWAY" : "NEXT SAFE";
    game.needsBank = !swapped;
    game.busy = false;
    el.actions.hidden = false;
    el.next.focus();
  }

  function bust(title, why, siren) {
    pauseClock();
    el.answer.blur();
    game.results[game.index] = { id: game.safes[game.index].id, name: null, tier: 0, pct: null };
    persist();
    syncHud();
    setAlarm(false);
    setArc(0, "#e2475b", reducedMotion ? 0 : 0.5);
    if (siren) {
      Sfx.siren();
      if (!reducedMotion) {
        document.body.classList.remove("siren");
        void document.body.offsetWidth;
        document.body.classList.add("siren");
      }
    } else {
      Sfx.lockout();
    }
    pulse("wobble");
    centre(title, "$0", "THIS SAFE PAYS NOTHING", "#ff8fa0");
    el.cMain.classList.remove("low");
    el.risk.hidden = true;
    say(why, true);
    el.again.hidden = true;
    el.next.textContent = game.index === SAFES - 1 ? "GETAWAY" : "NEXT SAFE";
    game.needsBank = false;
    game.busy = false;
    mode(false);
    el.next.focus();
  }

  function next() {
    Sfx.click();
    if (game.needsBank) lockSafe();
    game.index++;
    if (game.index >= SAFES) finish(false);
    else openSafe(false);
  }
  function spinAgain() {
    Sfx.click();
    openSafe(true);
  }

  // ---------- Summary ----------
  function rank(k) {
    if (k >= 600) return "MASTERMIND";
    if (k >= 450) return "SAFECRACKER";
    if (k >= 300) return "CAT BURGLAR";
    if (k >= 150) return "PICKPOCKET";
    return "LOOKOUT";
  }

  function finish(resumed) {
    pauseClock();
    setAlarm(false);
    const take = takeOf(game.results);
    if (game.daily && !resumed && saved.lastFinished !== game.number) {
      saved.streak = saved.lastFinished === game.number - 1 ? (saved.streak || 0) + 1 : 1;
      saved.lastFinished = game.number;
      saved.played = (saved.played || 0) + 1;
      saved.best = Math.max(saved.best || 0, take);
      save();
    }
    if (!resumed) Sfx.fanfare();
    game.index = SAFES;
    syncHud();

    const big = game.results.filter((r) => r.tier === 6).length;
    const busts = game.results.filter((r) => r.tier === 0).length;
    el.sumRank.textContent = rank(take);
    el.sumTotal.textContent = money(take);
    el.sumLine.textContent = `${big} big score${big === 1 ? "" : "s"}, ${busts} empty safe${busts === 1 ? "" : "s"}, out of a possible $700K.`;
    el.sumStats.style.whiteSpace = "";
    el.sumStats.textContent = game.daily
      ? `Streak ${saved.streak || 1} · Best ${money(saved.best || take)} · Jobs ${saved.played || 1}. New safes at midnight.`
      : "Practice runs do not count towards your streak or the rarity numbers.";
    el.share.textContent = "COPY RESULT";
    el.safeList.innerHTML = game.safes.map((safe, i) => {
      const r = game.results[i];
      const chip = r.tier ? `<i style="background:${TIERS[r.tier].color}"></i>` : '<i class="bust"></i>';
      return `<details data-safe="${esc(safe.id)}" data-mine="${esc(r.name || "")}"><summary>${chip}<span class="q">${esc(safe.prompt)}</span></summary><div class="answers">Loading...</div></details>`;
    }).join("");
    show("summary");
    el.sumRank.focus();
  }

  async function onToggle(event) {
    const box = event.target;
    if (!box.open || box.dataset.loaded) return;
    box.dataset.loaded = "1";
    const out = box.querySelector(".answers");
    try {
      const data = await api(`/api/reveal?seam=${encodeURIComponent(box.dataset.safe)}&pid=${saved.pid}`);
      const basis = data.measured
        ? `Shares from ${data.real.toLocaleString("en-GB")} real answers`
        : `Estimated shares, nudged by ${data.real.toLocaleString("en-GB")} real answer${data.real === 1 ? "" : "s"} so far`;
      out.innerHTML = data.answers.map((a) =>
        `<div class="${a.name === box.dataset.mine ? "mine-row" : ""}"><span class="v" style="color:${TIERS[a.tier].color}">${money(TIERS[a.tier].k)}</span>` +
        `<span class="n">${esc(a.name)}</span><span class="p">${a.pct}%</span></div>`).join("") +
        `<span class="note">${esc(basis)}.${data.note ? " " + esc(data.note) : ""}</span>`;
    } catch (err) {
      box.dataset.loaded = "";
      out.textContent = "Could not load this safe. Close and reopen to retry.";
    }
  }

  function shareText() {
    const head = game.daily ? `Lootle #${game.number}` : "Lootle practice run";
    return `${head}: ${money(takeOf(game.results))}\n${game.results.map((r) => SQUARES[r.tier]).join("")}\nhttps://lootle.app`;
  }
  async function share() {
    Sfx.click();
    const text = shareText();
    try {
      await navigator.clipboard.writeText(text);
      el.share.textContent = "COPIED";
    } catch (e) {
      el.sumStats.style.whiteSpace = "pre-line";
      el.sumStats.style.userSelect = "all";
      el.sumStats.textContent = text;
    }
  }

  // ---------- Boot ----------
  function setMuteLabel() {
    el.mute.setAttribute("aria-label", Sfx.muted ? "Sound off" : "Sound on");
    el.mute.setAttribute("aria-pressed", String(Sfx.muted));
    el.muteWave.toggleAttribute("hidden", Sfx.muted);
    el.muteX.toggleAttribute("hidden", !Sfx.muted);
  }

  function boot() {
    el.ladder.innerHTML = TIERS.slice(1)
      .map((t) => `<span><i style="background:${t.color}"></i>${t.name}<b>${money(t.k)}</b></span>`).join("");
    el.jobLabel.textContent = "JOB #" + String(today).padStart(3, "0");
    setMuteLabel();
    syncHud();

    const progress = saved.progress && saved.progress.number === today ? saved.progress : null;
    if (progress && progress.results.length >= SAFES) el.startDaily.textContent = "TONIGHT'S RESULT";
    else if (progress && progress.results.length) el.startDaily.textContent = "BACK TO THE JOB";
    if (saved.played) {
      const live = saved.lastFinished >= today - 1 ? saved.streak : 0;
      el.statsLine.textContent = `Streak ${live} · Best ${money(saved.best || 0)} · Jobs ${saved.played}`;
    }

    el.startDaily.addEventListener("click", () => start(true));
    el.startFree.addEventListener("click", () => start(false));
    el.freeAgain.addEventListener("click", () => start(false));
    el.answerForm.addEventListener("submit", onSubmit);
    el.answer.addEventListener("input", () => Sfx.key());
    el.next.addEventListener("click", next);
    el.again.addEventListener("click", spinAgain);
    el.share.addEventListener("click", share);
    el.safeList.addEventListener("toggle", onToggle, true);
    el.mute.addEventListener("click", () => {
      Sfx.muted = !Sfx.muted;
      saved.muted = Sfx.muted;
      save();
      setMuteLabel();
      Sfx.click();
    });
  }

  boot();
})();
