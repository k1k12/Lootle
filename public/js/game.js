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
  const DECIDE_SECONDS = 10;
  const TRIES = 3;
  const EPOCH = Date.UTC(2026, 10, 12);
  const STORE_KEY = "lootle:v1";
  const CIRC = 2 * Math.PI * 138;
  const TIME_CIRC = 2 * Math.PI * 100;
  const SQUARES = ["\u{1F6A8}", "⬜", "\u{1F7E9}", "\u{1F7E8}", "\u{1F7E5}", "\u{1F7EA}", "\u{1F48E}"];

  const $ = (id) => document.getElementById(id);
  const el = {};
  for (const id of [
    "fx", "help", "how", "howClose", "howLink", "mute", "muteWave", "muteX", "take", "tries", "haul", "intro", "ladder",
    "startDaily", "startFree", "statsLine", "play", "safeCat", "prompt", "risk", "answerForm", "answer",
    "spinBtn", "actions", "next", "again", "feedback", "dial", "segs", "zones", "zoneGreen", "zoneRed",
    "arc", "knob", "ticks", "timeRing", "cTop", "cMain", "cSub", "summary", "sumRank", "sumTotal", "sumLine",
    "share", "freeAgain", "sumStats", "safeList",
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
    /** One dial click; pitch climbs as the dial turns further. */
    dialClick(fraction) { this.tone(900 + fraction * 1100, 0.022, "square", 0.03); },
    /** A segment lighting up as the arc passes into it. */
    segment(n) { this.tone([392, 494, 587, 698, 784, 988][n] || 988, 0.16, "triangle", 0.09); },
    clunk() { this.tone(70, 0.28, "sine", 0.3); this.tone(140, 0.08, "square", 0.05); },
    payout(tier) {
      const notes = [523, 659, 784, 1047, 1319, 1568];
      for (let n = 0; n < tier; n++) this.tone(notes[n], 0.13, "square", 0.055, 0.05 + n * 0.06);
      if (tier === 6) [2093, 2637, 3136].forEach((f, i) => this.tone(f, 0.5, "triangle", 0.06, 0.5 + i * 0.12));
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

  // ---------- Particles (one full-window canvas above everything) ----------
  const fx = {
    ctx: el.fx.getContext("2d"), parts: [], running: false,
    size() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      el.fx.width = innerWidth * dpr;
      el.fx.height = innerHeight * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    },
    burst(x, y, color, count, power) {
      if (reducedMotion) return;
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = power * (0.35 + Math.random());
        this.parts.push({
          x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - power * 0.45,
          size: 3 + Math.random() * 5, spin: Math.random() * 6, life: 50 + Math.random() * 40,
          color: Math.random() < 0.25 ? "#ffffff" : color,
        });
      }
      if (!this.running) { this.running = true; requestAnimationFrame(() => this.step()); }
    },
    step() {
      const c = this.ctx;
      c.clearRect(0, 0, innerWidth, innerHeight);
      this.parts = this.parts.filter((p) => p.life-- > 0 && p.y < innerHeight + 20);
      for (const p of this.parts) {
        p.vy += 0.32; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.spin += 0.25;
        c.globalAlpha = Math.min(1, p.life / 24);
        c.fillStyle = p.color;
        // chunky square "coins" that flip as they fall
        const w = p.size * Math.abs(Math.cos(p.spin));
        c.fillRect(p.x - w / 2, p.y - p.size / 2, Math.max(1, w), p.size);
      }
      c.globalAlpha = 1;
      if (this.parts.length) requestAnimationFrame(() => this.step());
      else { this.running = false; c.clearRect(0, 0, innerWidth, innerHeight); }
    },
  };
  fx.size();
  window.addEventListener("resize", () => fx.size());

  // ---------- The dial ----------
  const dial = { at: 0, color: "#ffd166" };
  /** Draw the dial at a fraction of a full turn (0 to 1). */
  function drawDial(fraction, color) {
    dial.at = fraction;
    if (color) {
      dial.color = color;
      el.arc.style.stroke = color;
      el.dial.style.setProperty("--glow", color);
    }
    el.arc.style.strokeDasharray = `${fraction * CIRC} ${CIRC + 1}`;
    el.knob.style.transform = `rotate(${fraction * 360}deg)`;
    el.ticks.style.transform = `rotate(${-fraction * 540}deg)`;
  }
  function knobPoint(fraction) {
    const r = el.dial.getBoundingClientRect();
    const a = fraction * Math.PI * 2 - Math.PI / 2;
    const radius = r.width * (138 / 340);
    return [r.left + r.width / 2 + Math.cos(a) * radius, r.top + r.height / 2 + Math.sin(a) * radius];
  }
  function lightSegments(upTo) {
    [...el.segs.children].forEach((seg, i) => seg.classList.toggle("lit", i < upTo));
  }
  function flashSegment(i) {
    const seg = el.segs.children[i];
    if (!seg) return;
    seg.classList.add("flash", "lit");
    setTimeout(() => seg.classList.remove("flash"), 140);
  }
  /** Move the dial from where it is to a target, calling back on every frame. */
  function turn(target, ms, color, onFrame) {
    return new Promise((resolve) => {
      const from = dial.at;
      if (reducedMotion || ms <= 0) { drawDial(target, color); return resolve(); }
      const start = performance.now();
      const frame = (now) => {
        const t = Math.min(1, (now - start) / ms);
        const eased = 1 - Math.pow(1 - t, 4);
        const prev = dial.at;
        drawDial(from + (target - from) * eased, color);
        if (onFrame) onFrame(prev, dial.at);
        if (t < 1) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
  }
  /**
   * The spin. The arc sweeps from zero; every 15 degrees clicks, every loot
   * segment it enters lights up with a rising note, and where it stops it
   * throws coins. Rarer loot travels further and takes longer, so the wait
   * itself tells you it is good.
   */
  async function spinTo(tier) {
    const color = TIERS[tier].color;
    lightSegments(0);
    drawDial(0, color);
    await turn(tier / 6, 1100 + tier * 420, color, (prev, now) => {
      if (Math.floor(now * 24) > Math.floor(prev * 24)) Sfx.dialClick(now);
      const seg = Math.floor(now * 6 - 1e-6);
      if (seg > Math.floor(prev * 6 - 1e-6) || (prev === 0 && now > 0)) {
        flashSegment(Math.floor(now * 6 - 1e-6));
        Sfx.segment(Math.floor(now * 6 - 1e-6));
      }
    });
    lightSegments(tier);
    Sfx.clunk();
    Sfx.payout(tier);
    pulse(el.dial, "boom");
    pulse(el.dial, "landed");
    const [x, y] = knobPoint(tier / 6);
    fx.burst(x, y, color, 14 + tier * 12, 4 + tier * 1.4);
    if (tier >= 5) pulse(document.body, "shake");
    if (tier === 6) {
      for (let i = 0; i < 6; i++) {
        setTimeout(() => { const [bx, by] = knobPoint(i / 6); fx.burst(bx, by, TIERS[i + 1].color, 26, 9); }, 120 + i * 90);
      }
    }
  }
  function pulse(node, name) {
    if (reducedMotion) return;
    node.classList.remove(name);
    void node.offsetWidth;
    node.classList.add(name);
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
    el.arc.style.visibility = on ? "hidden" : "";
    el.segs.style.display = on ? "none" : "";
    if (on) {
      const held = (heldTier / 6) * CIRC;
      el.zoneRed.style.strokeDasharray = `${held} ${CIRC}`;
      el.zoneGreen.style.strokeDasharray = `${CIRC - held - 6} ${CIRC}`;
      el.zoneGreen.style.strokeDashoffset = `${-(held + 3)}`;
    }
  }
  function setTimeRing(fraction) {
    el.timeRing.style.strokeDasharray = `${TIME_CIRC}`;
    el.timeRing.style.strokeDashoffset = `${TIME_CIRC * (1 - fraction)}`;
  }
  /** On the intro the dial breathes through the loot colours on its own. */
  let screen = "intro";
  function idle(now) {
    if (screen === "intro" && !reducedMotion) {
      const f = 0.08 + 0.42 * (0.5 + 0.5 * Math.sin(now / 2400));
      drawDial(f, TIERS[Math.min(6, 1 + Math.floor(f * 6))].color);
      lightSegments(Math.floor(f * 6));
    }
    requestAnimationFrame(idle);
  }

  // ---------- Game state ----------
  let game = null; // { daily, number, safes, results, index, tries, risk, busy }
  const clock = { raf: 0, ends: 0, left: 0, total: 0, lastSecond: -1, running: false };
  const takeOf = (results) => results.reduce((sum, r) => sum + TIERS[r.tier].k, 0);

  let shownTake = 0;
  function syncHud(animate) {
    const results = game ? game.results : [];
    const total = takeOf(results);
    if (animate && !reducedMotion && total !== shownTake) {
      const from = shownTake, start = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - start) / 600);
        el.take.textContent = money(Math.round(from + (total - from) * t));
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    } else {
      el.take.textContent = money(total);
    }
    shownTake = total;
    let html = "";
    for (let i = 0; i < SAFES; i++) {
      const r = results[i];
      const fresh = animate && game && i === game.index ? " pop" : "";
      if (r) html += r.tier ? `<i class="${fresh.trim()}" style="background:${TIERS[r.tier].color}"></i>` : `<i class="bust${fresh}"></i>`;
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
    screen = name;
    el.intro.hidden = name !== "intro";
    el.play.hidden = name !== "play";
    el.summary.hidden = name !== "summary";
    el.dial.hidden = name === "summary";
    document.body.classList.toggle("at-intro", name === "intro");
    document.body.classList.toggle("playing", name === "play");
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
    el.safeCat.textContent = `${game.daily ? "SAFE" : "PRACTICE"} ${game.index + 1} · ${risk ? "SECOND SPIN" : safe.cat.toUpperCase()}`;
    el.prompt.textContent = safe.prompt;
    el.answer.value = "";
    el.answer.placeholder = risk ? "Something rarer" : "Your answer";
    el.spinBtn.textContent = risk ? "RISK IT" : "SPIN";
    el.spinBtn.disabled = false;
    say("");
    if (risk) {
      el.risk.innerHTML = `Beat <b>${esc(held.name)}</b> or the alarm trips.`;
      setAlarm(true, held.tier);
      drawDial(held.tier / 6, TIERS[held.tier].color);
      // Hide the held arc so the red alarm zone underneath it shows; the knob still marks the spot.
      el.arc.style.strokeDasharray = `0 ${CIRC + 1}`;
    } else {
      setAlarm(false);
      lightSegments(0);
      turn(0, 450, "#ffd166");
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
    el.dial.classList.add("timing");
    const tick = (now) => {
      if (!clock.running) return;
      clock.left = Math.max(0, clock.ends - now);
      setTimeRing(clock.left / clock.total);
      const secs = Math.ceil(clock.left / 1000);
      if (secs !== clock.lastSecond) {
        clock.lastSecond = secs;
        const low = secs <= 5;
        centre(game.risk ? "ALARM IN" : "", String(secs), "", game.risk ? "#ff8fa0" : "");
        el.cMain.classList.toggle("low", low);
        el.dial.classList.toggle("low", low);
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
    el.dial.classList.remove("timing", "low");
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
    pulse(el.dial, "wobble");
    if (game.tries <= 0) { lockSafe(); return bust("LOCKED OUT", "Out of tries.", false); }
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
      bust("ALARM TRIPPED", "Out of time.", true);
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
    centre("", "", "", "");
    el.cMain.classList.remove("low");
    await spinTo(hit.tier);

    game.results[game.index] = { id: game.safes[game.index].id, name: hit.name, tier: hit.tier, pct: hit.pct };
    persist();
    syncHud(true);
    centre(t.name, hit.name, "+" + money(t.k), t.color, true);
    const canRisk = !swapped && hit.deeper > 0;
    const bits = [];
    if (hit.corrected) bits.push(`Read as ${hit.name}`);
    bits.push(hit.measured ? `${hit.pct}% of crews` : `~${hit.pct}% of crews`);
    if (canRisk) bits.push(`${hit.deeper} rarer left`);
    say(bits.join(" \u00b7 "));
    el.again.hidden = !canRisk;
    el.next.textContent = canRisk ? "GRAB IT" : game.index === SAFES - 1 ? "GETAWAY" : "NEXT";
    game.needsBank = !swapped;
    game.busy = false;
    el.actions.hidden = false;
    el.next.focus();
    if (canRisk) startDecision(DECIDE_SECONDS);
  }

  // ---------- Grab-or-risk countdown: no time to look anything up ----------
  let deciding = 0;
  function startDecision(seconds) {
    stopDecision();
    const total = seconds * 1000;
    const ends = performance.now() + total;
    let lastSecond = -1;
    el.dial.classList.add("timing");
    const tick = (now) => {
      const left = Math.max(0, ends - now);
      setTimeRing(left / total);
      const secs = Math.ceil(left / 1000);
      if (secs !== lastSecond) {
        lastSecond = secs;
        el.next.textContent = `GRAB IT \u00b7 ${secs}`;
        el.dial.classList.toggle("low", secs <= 3);
        if (secs <= 3 && secs > 0) Sfx.tick();
      }
      if (left <= 0) { deciding = 0; return next(); }
      deciding = requestAnimationFrame(tick);
    };
    deciding = requestAnimationFrame(tick);
  }
  function stopDecision() {
    if (deciding) cancelAnimationFrame(deciding);
    deciding = 0;
    el.dial.classList.remove("timing", "low");
  }

  function bust(title, why, siren) {
    pauseClock();
    el.answer.blur();
    game.results[game.index] = { id: game.safes[game.index].id, name: null, tier: 0, pct: null };
    persist();
    syncHud(true);
    setAlarm(false);
    lightSegments(0);
    const [x, y] = knobPoint(dial.at);
    fx.burst(x, y, "#e2475b", 30, 6);
    turn(0, 500, "#e2475b");
    if (siren) {
      Sfx.siren();
      pulse(document.body, "siren");
    } else {
      Sfx.lockout();
    }
    pulse(el.dial, "wobble");
    centre(title, "$0", "", "#ff8fa0");
    el.cMain.classList.remove("low");
    el.risk.hidden = true;
    say(why, true);
    el.again.hidden = true;
    el.next.textContent = game.index === SAFES - 1 ? "GETAWAY" : "NEXT";
    game.needsBank = false;
    game.busy = false;
    mode(false);
    el.next.focus();
  }

  function next() {
    stopDecision();
    Sfx.click();
    if (game.needsBank) lockSafe();
    game.index++;
    if (game.index >= SAFES) finish(false);
    else openSafe(false);
  }
  function spinAgain() {
    stopDecision();
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
    if (!resumed) {
      Sfx.fanfare();
      fx.burst(innerWidth / 2, innerHeight * 0.3, "#ffd166", 40 + Math.round(take / 8), 9);
    }
    game.index = SAFES;
    syncHud();

    const big = game.results.filter((r) => r.tier === 6).length;
    const busts = game.results.filter((r) => r.tier === 0).length;
    el.sumRank.textContent = rank(take);
    el.sumTotal.textContent = money(take);
    el.sumLine.textContent = `${big} big score${big === 1 ? "" : "s"} \u00b7 ${busts} empty \u00b7 max $700K`;
    el.sumStats.style.whiteSpace = "";
    el.sumStats.textContent = game.daily
      ? `Streak ${saved.streak || 1} · Best ${money(saved.best || take)} · New safes at midnight`
      : "Practice runs do not count.";
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
    centre("JOB #" + String(today).padStart(3, "0"), "7 SAFES", "", "");
    setMuteLabel();
    syncHud();
    requestAnimationFrame(idle);

    const progress = saved.progress && saved.progress.number === today ? saved.progress : null;
    if (progress && progress.results.length >= SAFES) el.startDaily.textContent = "RESULT";
    else if (progress && progress.results.length) el.startDaily.textContent = "CONTINUE";
    if (saved.played) {
      const live = saved.lastFinished >= today - 1 ? saved.streak : 0;
      el.statsLine.textContent = `Streak ${live} \u00b7 Best ${money(saved.best || 0)}`;
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
    const openHow = () => { Sfx.click(); el.how.showModal(); };
    el.help.addEventListener("click", openHow);
    el.howLink.addEventListener("click", openHow);
    el.howClose.addEventListener("click", () => el.how.close());
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
