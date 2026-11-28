/* Lootle client. Prompts come from the server; answers never ship in this file. */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const three = (n) => String(n).padStart(3, "0");
  const money = (k) => (k >= 1000 ? "$" + (k / 1000).toFixed(2).replace(/\.?0+$/, "") + "M" : "$" + k + "K");
  const norm = (t) => String(t).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim().replace(/^the /, "").replace(/^an? (?=.{3})/, "");
  const firstLetter = (t) => (norm(t).match(/[a-z]/) || [""])[0];
  const lastLetter = (t) => (norm(t).match(/[a-z](?=[^a-z]*$)/) || [""])[0];

  const SECONDS = 25;
  const TRIES = 3;
  const EPOCH = Date.UTC(2026, 10, 12);
  const STORE_KEY = "lootle:v1";
  const PAY = [0, 1, 2, 4, 7, 10]; // thousands, by loot level; times the chain
  const SCORES = [12, 38, 64, 85, 100];
  const LEVELS = [
    { n: "BUSTED", hex: "#ff4d5e" },
    { n: "LOOSE CHANGE", hex: "#b8bfd6" },
    { n: "TIDY SUM", hex: "#5fd4a8" },
    { n: "RARE FIND", hex: "#6fa8ff" },
    { n: "BIG SCORE", hex: "#b48cff" },
    { n: "PERFECT CRIME", hex: "#ffc93d" },
  ];
  const QUIPS = [
    ["better luck next time.", "we don't talk about this one.", "that's the alarm. walk casually."],
    ["everyone and their nan said that.", "bold of you to say the obvious.", "well. it's money."],
    ["a tidy little sum.", "not bad. not good. fine.", "we take those."],
    ["now we're talking.", "someone's been reading.", "ooh. look at you."],
    ["who ARE you?", "okay, show-off.", "frame it."],
    ["nobody said that. NOBODY.", "the perfect crime.", "i'd follow you into any vault."],
  ];
  const NOTES = ["laser grid · armed", "night guard · asleep (probably)", "vault built 1923 · never robbed · yet", "motion sensor 4 · broken since tuesday",
    "the cat has been here before", "pressure plate · do not stand here", "insurance · underpriced", "air vent · cat-sized",
    "alarm · wired to a very loud bell", "safe deposit box 117 · smells of fish"];
  const RANKS = [[0.55, "MASTERMIND"], [0.3, "SAFECRACKER"], [0.15, "CAT BURGLAR"], [0.06, "PICKPOCKET"], [0, "LOOKOUT"]];

  // ---------- Storage (best effort) ----------
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { saved = {}; }
  const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(saved)); } catch (e) { /* private mode */ } };
  if (!saved.pid) saved.pid = window.crypto && crypto.randomUUID ? crypto.randomUUID() : "p-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  if (!saved.look4) { saved.look4 = 1; saved.muted = false; }
  save();
  const today = (() => { const d = new Date(); return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - EPOCH) / 86400000) + 1; })();

  async function api(path, body) {
    const res = await fetch(path, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : undefined);
    let data = null;
    try { data = await res.json(); } catch (e) { /* not json */ }
    if (!res.ok) { const err = new Error((data && data.error) || "Request failed"); err.status = res.status; throw err; }
    return data;
  }

  // ---------- Sound (all synthesised) ----------
  let AC = null;
  let muted = !!saved.muted;
  const ac = () => { if (muted) return null; try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) { AC = null; } return AC; };
  function tone(f, d, type, v, at, to) { const c = ac(); if (!c) return; const t = c.currentTime + (at || 0); const o = c.createOscillator(), g = c.createGain(); o.type = type || "square"; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + d); g.gain.setValueAtTime(v || 0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + 0.02); }
  function noise(d, v, cut, at, hp) { const c = ac(); if (!c) return; const t = c.currentTime + (at || 0); const b = c.createBuffer(1, Math.ceil(c.sampleRate * d), c.sampleRate); const x = b.getChannelData(0); for (let i = 0; i < x.length; i++) x[i] = Math.random() * 2 - 1; const s = c.createBufferSource(); s.buffer = b; const f = c.createBiquadFilter(); f.type = hp ? "highpass" : "lowpass"; f.frequency.value = cut; const g = c.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); s.connect(f).connect(g).connect(c.destination); s.start(t); }
  const sfx = {
    key() { noise(0.02, 0.06, 5000, 0, 1); },
    pin(i) { noise(0.035, 0.3, 7000, 0, 1); tone(900 + i * 260, 0.05, "square", 0.05); tone(70, 0.08, "sine", 0.25); },
    slide() { noise(0.3, 0.05, 1800); },
    jam() { noise(0.25, 0.18, 400); tone(110, 0.2, "sawtooth", 0.06, 0, 70); },
    open(l) { tone(60, 0.35, "sine", 0.4); noise(0.5, 0.12, 900, 0.05); [523, 659, 784, 1047, 1319].slice(0, l).forEach((f, i) => tone(f, 0.14, "square", 0.05, 0.25 + i * 0.08)); if (l === 5) [2093, 2637, 3136].forEach((f, i) => tone(f, 0.5, "triangle", 0.06, 0.7 + i * 0.12)); },
    miss() { tone(160, 0.25, "sawtooth", 0.07, 0, 80); },
    slam() { noise(0.4, 0.6, 450); tone(85, 0.35, "sawtooth", 0.15, 0, 40); for (let i = 0; i < 4; i++) { tone(640, 0.2, "square", 0.045, 0.3 + i * 0.4, 900); tone(900, 0.2, "square", 0.045, 0.5 + i * 0.4, 640); } },
    tick() { noise(0.02, 0.25, 6000, 0, 1); },
    count() { tone(440, 0.06, "square", 0.04); },
    link() { tone(1568, 0.12, "triangle", 0.07); tone(2093, 0.25, "triangle", 0.06, 0.09); },
  };

  // ---------- The room ----------
  const dust = $("dust"), dx = dust.getContext("2d");
  let motes = [];
  function sizeDust() { dust.width = innerWidth; dust.height = innerHeight; motes = Array.from({ length: 70 }, () => ({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, r: Math.random() * 1.6 + 0.3, v: Math.random() * 0.25 + 0.05, a: Math.random() * 0.5 + 0.1 })); }
  function drawDust() { dx.clearRect(0, 0, dust.width, dust.height); for (const m of motes) { m.y -= m.v; m.x += Math.sin((m.y + m.r * 99) / 60) * 0.15; if (m.y < -4) m.y = dust.height + 4; dx.fillStyle = `rgba(200,210,255,${m.a})`; dx.fillRect(m.x, m.y, m.r, m.r); } requestAnimationFrame(drawDust); }
  addEventListener("resize", sizeDust); sizeDust(); drawDust();
  function ambient() {
    document.querySelectorAll(".note").forEach((x) => x.remove());
    const n = document.createElement("div"); n.className = "note"; n.textContent = pick(NOTES);
    const left = Math.random() < 0.5, wide = innerWidth > 900;
    n.style[left ? "left" : "right"] = (2 + Math.random() * (wide ? 6 : 4)) + "%";
    n.style.top = wide ? (22 + Math.random() * 56) + "%" : (17 + Math.random() * 4) + "%";
    $("room").appendChild(n); requestAnimationFrame(() => n.classList.add("on"));
    setTimeout(() => n.classList.remove("on"), 5200);
  }
  setInterval(ambient, 4600); ambient();
  let camT = 2 * 3600 + 13 * 60 + 7;
  setInterval(() => { camT++; const p = (v) => String(v).padStart(2, "0"); $("clock").textContent = `${p(Math.floor(camT / 3600))}:${p(Math.floor(camT / 60) % 60)}:${p(camT % 60)}`; }, 1000);

  // ---------- Pixel sprites ----------
  const PAL = { b: "#d9a441", h: "#ffe08a", d: "#8c6420", w: "#e9ecff", c: "#5fd4a8", e: "#6fa8ff", p: "#b48cff", y: "#ffc93d", o: "#b8bfd6" };
  const SPR = {
    key: ["..hhbb..", ".hbbbbd.", "hbb..bbd", "hbb..bbd", ".bbbbbd.", "..bbbd..", "...bb...", "...bb...", "...bbd..", "...bb...", "...bbdd.", "...bb...", "...bbd..", "...bb...", "...bd...", "....d..."],
    loot1: ["............", "....oooo....", "...owwwoo...", "...oooooo...", "..oooooooo..", "..owwwwwoo..", "..oooooooo..", ".oooooooooo.", ".owwwwwwwoo.", ".oooooooooo.", "............", "............"],
    loot2: ["............", "............", "cccccccccccc", "cwwccccccwwc", "ccccwwwwcccc", "cccwccccwccc", "cccwccccwccc", "ccccwwwwcccc", "cwwccccccwwc", "cccccccccccc", "............", "............"],
    loot3: ["............", "............", "....eeee....", "...ewwwee...", "..eeeeeeee..", "............", "..eeee.eeee.", ".ewwee.ewwee", "eeeeeeeeeeee", "............", "............", "............"],
    loot4: ["yyyyyyyyyyyy", "yppppppppppy", "ypwwppppeepy", "ypppppppeepy", "yppppcpppppy", "ypppcccppppy", "yppcccccpppy", "ypcccccccppy", "yccccccccccy", "yyyyyyyyyyyy", "............", "............"],
    loot5: ["............", "...yyyyyy...", "..ywwyyyyy..", ".ywwyyyyyyy.", "yyyyyyyyyyyy", ".yyyyyyyyyy.", "..yyyyyyyy..", "...yyyyyy...", "....yyyy....", ".....yy.....", "............", "............"],
  };
  function sprite(name, x, y, px) {
    let s = `<g transform="translate(${x} ${y})">`;
    SPR[name].forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] !== ".") s += `<rect x="${i * px}" y="${j * px}" width="${px + 0.02}" height="${px + 0.02}" fill="${PAL[row[i]]}"/>`; });
    return s + "</g>";
  }

  // ---------- The lock: rarer answers go deeper ----------
  const LINE_Y = (i) => 100 + i * 60;
  function drawLock() {
    let s = `<rect x="140" y="40" width="80" height="350" fill="#141a3c" stroke="#3b4580" stroke-width="4" shape-rendering="crispEdges"/>`;
    for (let y = 48; y < 384; y += 16) s += `<rect x="144" y="${y}" width="72" height="2" fill="#1d2550" shape-rendering="crispEdges"/>`;
    s += `<rect x="170" y="40" width="20" height="350" fill="#0b0f24" shape-rendering="crispEdges"/>`;
    s += `<rect x="128" y="28" width="104" height="16" fill="#3b4580" shape-rendering="crispEdges"/><rect x="166" y="28" width="28" height="16" fill="#0b0f24"/>`;
    SCORES.forEach((sc, i) => {
      const y = LINE_Y(i), L = LEVELS[i + 1];
      s += `<g id="tl${i}" opacity=".35"><line x1="8" y1="${y}" x2="352" y2="${y}" stroke="${L.hex}" stroke-width="2" stroke-dasharray="6 6"/>
        <text x="352" y="${y - 8}" text-anchor="end" font-family="VT323,monospace" font-size="19" fill="${L.hex}" letter-spacing="2">${L.n} · ${sc}</text></g>`;
      s += `<g id="pin${i}"><rect x="198" y="${y - 10}" width="14" height="20" fill="#7d86b8" shape-rendering="crispEdges"/><rect x="190" y="${y - 6}" width="8" height="12" fill="#d9a441" shape-rendering="crispEdges"/></g>`;
    });
    s += `<g id="key"></g>`;
    $("lock").innerHTML = s;
  }
  function resetLock() {
    SCORES.forEach((_, i) => { $("tl" + i).setAttribute("opacity", ".35"); const p = $("pin" + i); p.style.transition = ""; p.style.transform = ""; });
    $("key").innerHTML = ""; $("lock").style.opacity = "1"; $("tag").hidden = true;
  }
  function setPin(i) {
    $("tl" + i).setAttribute("opacity", "1"); sfx.pin(i);
    const p = $("pin" + i); p.style.transition = "transform .1s steps(2)"; p.style.transform = "translateX(10px)";
    const lock = $("lock"); lock.style.transform = "translate(0,2px)"; setTimeout(() => { lock.style.transform = ""; }, 70);
  }
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  function dropKey(level, done) {
    const key = $("key");
    const stops = [-30, ...SCORES.slice(0, level).map((_, i) => LINE_Y(i) - 30)];
    const draw = (y) => { key.innerHTML = sprite("key", 168, y, 3); };
    let seg = 0;
    draw(stops[0]); sfx.slide();
    const run = () => {
      if (seg >= stops.length - 1) {
        if (level >= 5) return setTimeout(done, 250);
        // reach for the next pin and stop short
        const from = stops[stops.length - 1], t1 = performance.now();
        const jam = (now) => { const t = Math.min(1, (now - t1) / 300); draw(Math.round(from + Math.sin(t * Math.PI) * 22)); if (t < 1) requestAnimationFrame(jam); else { sfx.jam(); setTimeout(done, 280); } };
        return requestAnimationFrame(jam);
      }
      const a = stops[seg], b = stops[seg + 1], dur = 300 + seg * 120, ts = performance.now();
      const step = (now) => { const t = Math.min(1, (now - ts) / dur); draw(Math.round(a + (b - a) * ease(t))); if (t < 1) requestAnimationFrame(step); else { setPin(seg); seg++; setTimeout(run, 110 + seg * 60); } };
      requestAnimationFrame(step);
    };
    setTimeout(run, 150);
  }
  function teeth(flip) { let d = flip ? "M0 100H400V20" : "M0 0H400V80"; for (let x = 390; x >= 0; x -= 10) d += `L${x} ${flip ? (x / 10) % 2 ? 0 : 20 : (x / 10) % 2 ? 100 : 80}`; return d + "Z"; }

  // ---------- A night ----------
  let game = null;
  let timer = 0, left = 0, counting = 0;

  const ui = {
    msg(text, warn) { $("msg").textContent = text; $("msg").className = warn ? "warn" : ""; },
    pips() { $("pips").innerHTML = game.safes.map((s, i) => { const r = game.results[i]; return r ? `<i style="background:${LEVELS[r.level].hex};border-color:transparent"></i>` : `<i class="${i === game.index ? "now" : ""}"></i>`; }).join(""); },
    tries() { $("tries").innerHTML = [0, 1, 2].map((i) => `<i class="${i < game.tries ? "" : "off"}"></i>`).join(""); $("tries").setAttribute("aria-label", game.tries + " tries left"); },
    hud() { $("take").textContent = money(game.take); $("chain").textContent = "×" + game.chain; },
  };
  const persist = () => {
    if (game.kind === "free") return;
    const slot = game.kind === "past" ? "pastProgress" : "progress";
    saved[slot] = { number: game.number, safes: game.safes, results: game.results, key: game.key, chain: game.chain, take: game.take, live: game.live };
    save();
  };
  const body = (extra) => Object.assign({ seam: game.safes[game.index].id, pid: saved.pid, n: game.number }, game.kind === "past" ? { archive: true } : null, extra);

  async function start(kind, number) {
    closeAll();
    const n = kind === "daily" ? today : kind === "past" ? number : 0;
    const kept = kind === "daily" ? saved.progress : kind === "past" ? saved.pastProgress : null;
    const progress = kept && kept.number === n ? kept : null;
    let safes = progress && progress.safes;
    try {
      if (!safes) {
        const job = await api(n ? `/api/job?n=${n}&pid=${saved.pid}${kind === "past" ? "&archive=1" : ""}` : `/api/job?free=1&pid=${saved.pid}`);
        if (kind === "past" && job.played) { saved.archive = saved.archive || {}; saved.archive[n] = saved.archive[n] || { played: true }; save(); return openCases("You've already done case " + three(n) + "."); }
        safes = job.seams.slice(0, 5);
      }
    } catch (e) { ui.msg("couldn't reach the vault. check your connection.", true); return; }
    game = { kind, number: n, safes, results: progress ? progress.results : [], key: progress ? progress.key || "" : "", chain: progress ? progress.chain || 0 : 0, take: progress ? progress.take || 0 : 0, live: progress ? progress.live : null };
    game.index = game.results.length;
    ui.hud();
    if (game.index >= safes.length) return finish(true);
    openDoor();
  }

  function openDoor() {
    clearInterval(timer); clearInterval(counting);
    const d = game.safes[game.index];
    const live = game.live && game.live.index === game.index ? game.live : null;
    game.tries = live ? live.tries : TRIES;
    game.busy = true;
    $("stage").classList.remove("busted"); $("reveal").classList.remove("on"); resetLock();
    $("card").hidden = false; $("card").classList.remove("small");
    $("cardlab").textContent = `Door ${game.index + 1} of 5 · ${d.cat}`;
    $("q").textContent = d.prompt.replace(/\.$/, "");
    const chip = $("keychip");
    chip.className = "keychip" + (game.key ? "" : " any"); chip.textContent = game.key ? game.key.toUpperCase() : "ANY";
    $("keytext").textContent = game.key ? `your answer must start with ${game.key.toUpperCase()}` : game.index === 0 ? "first door's free. any letter." : "fresh lock. any letter.";
    $("doorlab").textContent = `Door ${game.index + 1} of 5`;
    ui.pips(); ui.tries(); ui.hud();
    $("form").hidden = false; $("next").hidden = true; $("pill").hidden = true; $("ans").value = ""; $("ans").disabled = true;
    ui.msg("rarer answers push the key deeper");
    $("tbar").style.transform = "scaleX(1)"; $("timer").classList.remove("low");
    // a short count-in, so the question gets read before the clock starts
    let c = live ? 0 : 3;
    const go = () => { game.busy = false; $("card").classList.add("small"); $("count").innerHTML = ""; $("ans").disabled = false; $("ans").focus(); startClock(live ? live.left : SECONDS * 10); };
    if (!c) return go();
    $("count").innerHTML = `the clock starts in <b>${c}</b>`;
    counting = setInterval(() => { c--; if (c > 0) { $("count").innerHTML = `the clock starts in <b>${c}</b>`; sfx.count(); } else { clearInterval(counting); go(); } }, 900);
  }

  function startClock(tenths) {
    clearInterval(timer); left = tenths;
    const total = SECONDS * 10;
    const tick = () => {
      left--;
      $("tbar").style.transform = `scaleX(${Math.max(0, left / total)})`;
      if (left % 10 === 0) {
        const sec = left / 10;
        if (game.kind === "daily") { game.live = { index: game.index, left, tries: game.tries }; persist(); }
        if (sec <= 5 && sec > 0) { $("timer").classList.add("low"); sfx.tick(); ui.msg("the guard's coming back", true); }
      }
      if (left <= 0) { clearInterval(timer); bust("too slow. the guard came back."); }
    };
    timer = setInterval(tick, 100);
  }

  async function submit(text, sure) {
    if (!game || game.busy || !text.trim()) return;
    ac();
    $("pill").hidden = true;
    const typed = text.trim();
    if (game.key && firstLetter(typed) !== game.key) { ui.msg(`that key won't fit. it needs ${game.key.toUpperCase()}`, true); sfx.miss(); shake($("bar")); return; }
    game.busy = true; $("go").disabled = true;
    const nextId = game.kind === "free" && game.safes[game.index + 1] ? game.safes[game.index + 1].id : undefined;
    let hit;
    try { hit = await api("/api/answer", body({ guess: typed, sure: sure === true, next: nextId })); }
    catch (err) {
      game.busy = false; $("go").disabled = false;
      if (err.status === 409) return bust("you've been through this door before.");
      return ui.msg(err.status === 429 ? "slow down a second." : "lost the signal. try that again.", true);
    }
    game.busy = false; $("go").disabled = false;
    if (hit.wrongKey) { game.key = hit.key; ui.msg(`that key won't fit. it needs ${hit.key.toUpperCase()}`, true); return shake($("bar")); }
    if (hit.suggest) { $("pill").innerHTML = `Did you mean <b>${esc(hit.suggest)}</b>?`; $("pill").dataset.name = hit.suggest; $("pill").hidden = false; return; }
    if (!hit.ok) {
      game.tries--; ui.tries(); sfx.miss(); shake($("bar")); $("ans").value = "";
      if (game.tries <= 0) return bust("three wrong. that's the alarm.");
      return ui.msg(`"${typed}" isn't one`, true);
    }
    win(hit);
  }

  function win(hit) {
    clearInterval(timer); game.busy = true; $("ans").disabled = true; $("ans").blur();
    const level = Math.max(1, Math.min(5, hit.tier | 0));
    const chain = hit.chain || game.chain + 1;
    const pay = game.kind === "daily" ? (hit.paid || PAY[level] * Math.min(5, chain)) : PAY[level] * Math.min(5, chain);
    game.chain = chain; game.take += pay; game.key = hit.next || "";
    game.results[game.index] = { name: hit.name, score: hit.score, level, pay, chain, prompt: game.safes[game.index].prompt };
    game.live = null; persist();
    $("tag").textContent = hit.name.toUpperCase(); $("tag").hidden = false;
    $("card").hidden = true;
    ui.msg("the key's going in...");
    dropKey(level, () => {
      const L = LEVELS[level];
      document.documentElement.style.setProperty("--lc", L.hex);
      $("lootart").innerHTML = sprite("loot" + level, 0, 0, 3); $("lootart").style.display = "";
      $("lvl").textContent = L.n; $("said").textContent = `"${hit.name}"`;
      $("gain").innerHTML = `+${money(PAY[level])}${chain > 1 ? ` <b>×${Math.min(5, chain)} chain</b> = ${money(pay)}` : ""}` + (game.kind === "daily" ? "" : " <small>(practice)</small>");
      $("quip").textContent = pick(QUIPS[level]);
      $("lock").style.opacity = ".12"; $("tag").hidden = true; $("reveal").classList.add("on"); sfx.open(level);
      ui.hud(); ui.pips();
      const last = game.index >= game.safes.length - 1;
      if (game.key && !last) setTimeout(sfx.link, 600);
      const end = lastLetter(hit.name);
      ui.msg(last ? "last door. get out."
        : !game.key ? "next door takes any letter"
        : game.key !== end ? `nothing on the next door starts with ${end.toUpperCase()}. the key slips back to ${game.key.toUpperCase()}`
        : `next key: ${game.key.toUpperCase()}`);
      $("form").hidden = true; $("next").hidden = false;
      $("next").textContent = last ? "GET OUT ▸" : game.key ? `NEXT · KEY ${game.key.toUpperCase()} ▸` : "NEXT · ANY KEY ▸";
      $("next").focus();
    });
  }

  function bust(why) {
    clearInterval(timer); game.busy = true; $("ans").disabled = true; $("pill").hidden = true; $("ans").blur();
    const d = game.safes[game.index];
    const wanted = game.key;
    game.results[game.index] = { name: "", score: 0, level: 0, pay: 0, chain: 0, prompt: d.prompt };
    game.chain = 0; game.key = ""; game.live = null; persist();
    ui.hud(); ui.pips();
    $("card").hidden = true;
    $("bustsub").textContent = why; $("stage").classList.add("busted");
    $("room").classList.remove("alarm"); void $("room").offsetWidth; $("room").classList.add("alarm");
    sfx.slam();
    const settle = api("/api/bank", body({})).catch(() => null);
    setTimeout(async () => {
      $("stage").classList.remove("busted"); $("lock").style.opacity = ".12";
      document.documentElement.style.setProperty("--lc", "#ff4d5e");
      $("lootart").style.display = "none";
      $("lvl").textContent = "CHAIN BROKEN";
      $("said").textContent = wanted ? `these would've opened it with ${wanted.toUpperCase()}` : "these would've opened it";
      $("gain").textContent = ""; $("quip").textContent = pick(QUIPS[0]);
      $("reveal").classList.add("on");
      $("form").hidden = true; $("next").hidden = false;
      const last = game.index >= game.safes.length - 1;
      $("next").textContent = last ? "GET OUT ▸" : "NEXT · ANY KEY ▸";
      ui.msg(last ? "that's the night." : "the chain's broken. next door takes any letter", true);
      $("next").focus();
      await settle;
      try {
        const data = await api(`/api/reveal?seam=${encodeURIComponent(d.id)}&pid=${saved.pid}`);
        const pool = data.answers.filter((a) => !wanted || firstLetter(a.name) === wanted).reverse();
        const some = pool.length <= 8 ? pool : Array.from({ length: 8 }, (_, i) => pool[Math.round((i * (pool.length - 1)) / 7)]);
        $("quip").innerHTML = `<div class="would">${some.map((a) => `<span><em style="background:${LEVELS[a.tier].hex}">${a.score}</em>${esc(a.name)}</span>`).join("")}</div>`;
      } catch (e) { /* the list is a nicety */ }
    }, 1700);
  }

  function nextDoor() { if (!game) return; game.index++; persist(); if (game.index >= game.safes.length) return finish(false); openDoor(); }
  function shake(el) { el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); }
  const rank = (take) => RANKS.find(([share]) => take / 150 >= share)[1];

  function finish(resumed) {
    clearInterval(timer);
    const r = rank(game.take);
    const longest = game.results.reduce((m, x) => Math.max(m, x.chain || 0), 0);
    if (game.kind === "daily" && !resumed && saved.lastFinished !== game.number) {
      saved.streak = saved.lastFinished === game.number - 1 ? (saved.streak || 0) + 1 : 1;
      saved.lastFinished = game.number; saved.best = Math.max(saved.best || 0, game.take);
    }
    if (game.kind !== "free") { saved.archive = saved.archive || {}; saved.archive[game.number] = { take: game.take }; }
    save();
    $("endlab").textContent = game.kind === "daily" ? `Case ${three(game.number)} · tonight you were a` : game.kind === "past" ? `Cold case ${three(game.number)} · you were a` : "Practice · you were a";
    $("rank").textContent = r;
    $("ring").innerHTML = game.results.map((x, i) => (i ? `<span class="link${x.chain > 1 ? "" : " off"}" aria-hidden="true"></span>` : "") +
      `<div class="row"><span class="s" style="background:${LEVELS[x.level].hex}">${x.level ? x.score : "×"}</span><span class="a">${x.level ? esc(x.name) : "Locked out"}<small>${esc(x.prompt)}</small></span><span class="k">${money(x.pay)}</span></div>`).join("");
    $("endline").textContent = `${money(game.take)} taken · longest chain ${longest}` + (game.kind === "daily" ? ` · streak ${saved.streak || 1} · new doors at midnight` : "");
    $("share").textContent = "COPY RESULT";
    $("end").classList.add("on"); $("rank").focus();
    if (!resumed) sfx.open(Math.max(1, Math.min(5, longest)));
    if (game.kind === "daily") api("/api/finish", { pid: saved.pid, n: game.number }).then((f) => {
      if (f && f.ok && f.players > 1) $("endline").textContent += ` · crew ${f.place} of ${f.players} tonight`;
    }).catch(() => {});
  }
  function shareText() {
    const sq = ["⬛", "⬜", "🟩", "🟦", "🟪", "🟨"];
    const longest = game.results.reduce((m, x) => Math.max(m, x.chain || 0), 0);
    const head = game.kind === "daily" ? `Lootle #${game.number}` : game.kind === "past" ? `Lootle #${game.number} (cold case)` : "Lootle practice";
    return `${head}: ${money(game.take)}, ${rank(game.take).toLowerCase()}\n${game.results.map((x) => sq[x.level]).join("")} chain ${longest}\nlootle.app`;
  }

  // ---------- Cold cases ----------
  function openCases(note) {
    const done = saved.archive || {};
    let html = "";
    for (let n = today - 1; n >= 1; n--) {
      const d = done[n];
      const when = new Date(EPOCH + (n - 1) * 86400000).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
      html += `<button type="button" data-job="${n}"${d ? " disabled" : ""}><span class="num">${three(n)}</span><span class="when">${when}</span><span class="go">${d ? (d.take != null ? money(d.take) : "DONE") : "PLAY"}</span></button>`;
    }
    $("jobs").innerHTML = html || '<p class="small">Nothing here yet. Come back tomorrow.</p>';
    if (note) $("cases").querySelector(".small").textContent = note;
    $("cases").classList.add("on");
  }
  function closeAll() { document.querySelectorAll(".over").forEach((o) => o.classList.remove("on")); }

  // ---------- Wiring ----------
  $("teethT").setAttribute("d", teeth(false)); $("teethB").setAttribute("d", teeth(true));
  drawLock();
  $("form").addEventListener("submit", (e) => { e.preventDefault(); submit($("ans").value, false); });
  $("ans").addEventListener("input", () => { sfx.key(); $("pill").hidden = true; });
  $("pill").addEventListener("click", () => { const n = $("pill").dataset.name; $("ans").value = n; submit(n, true); });
  $("next").addEventListener("click", nextDoor);
  $("share").addEventListener("click", async () => { try { await navigator.clipboard.writeText(shareText()); $("share").textContent = "COPIED"; } catch (e) { $("endline").textContent = shareText(); } });
  $("endclose").addEventListener("click", closeAll);
  $("mRules").addEventListener("click", () => $("rules").classList.add("on"));
  $("mCases").addEventListener("click", () => openCases());
  $("mPractice").addEventListener("click", () => start("free"));
  const setSound = () => { $("mSound").setAttribute("aria-pressed", String(!muted)); };
  $("mSound").addEventListener("click", () => { muted = !muted; saved.muted = muted; save(); setSound(); });
  setSound();
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) {
      closeAll();
      if ($("rules").dataset.then) { delete $("rules").dataset.then; start("daily"); }
    }
    const job = e.target.closest("[data-job]");
    if (job && !job.disabled) start("past", Number(job.dataset.job));
  });
  document.addEventListener("pointerdown", () => ac(), { once: true });
  // First visit: show the rules once, then straight into tonight's job.
  if (!saved.seenChain) { saved.seenChain = 1; save(); $("rules").classList.add("on"); $("rules").dataset.then = "start"; }
  else start("daily");
})();
