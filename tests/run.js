// Run with: node tests/run.js
import assert from "node:assert/strict";
import * as core from "../src/core.js";
import { PACKS, SEAMS as bank } from "../src/seams/index.js";
import { DECOYS } from "../src/lexicon.js";
import { ITEMS, MAX_BUY, catalogue } from "../src/shop.js";

const lexicon = core.buildLexicon(bank, DECOYS);

let checks = 0;
const ok = (cond, msg) => { checks++; assert.ok(cond, msg); };
const seam = (id) => bank.find((s) => s.id === id);

// --- Bank integrity -------------------------------------------------------
ok(bank.length >= 70, "bank holds at least ten days of safes");
const ids = new Set();
for (const s of bank) {
  ok(!ids.has(s.id), `duplicate seam id ${s.id}`);
  ids.add(s.id);
  ok(s.prompt.endsWith("."), `${s.id}: prompt ends with a full stop`);
  ok(typeof s.cat === "string" && s.cat.length > 0, `${s.id}: has a category`);
  ok(s.answers.length >= 3, `${s.id}: has at least three answers`);
  ok(s.answers.some((a) => a[1] === 6), `${s.id}: has a tier 6 answer`);
  ok(s.answers.some((a) => a[1] === 1), `${s.id}: has a tier 1 answer`);

  const seen = new Map();
  for (const [name, tier, ...aliases] of s.answers) {
    ok(Number.isInteger(tier) && tier >= 1 && tier <= 6, `${s.id}/${name}: bad tier`);
    for (const form of [name, ...aliases]) {
      const key = core.normalise(form);
      ok(key.length > 0, `${s.id}/${name}: empty form`);
      ok(!seen.has(key) || seen.get(key) === name,
        `${s.id}: "${form}" maps to both ${seen.get(key)} and ${name}`);
      seen.set(key, name);
    }
  }
  // Every canonical answer must resolve to itself.
  for (const [name, tier] of s.answers) {
    ok(core.matchAnswer(s, name) === name, `${s.id}: ${name} does not match itself`);
  }
}

// --- Matching -------------------------------------------------------------
const m = (id, text) => core.matchAnswer(seam(id), text, lexicon);
const tierOf = (id, text) => core.rarity(seam(id)).rows.find((r) => r.name === m(id, text)).tier;
ok(m("germany-borders", "  the NETHERLANDS ") === "Netherlands", "case/article/space");
ok(m("germany-borders", "Luxemburg") === "Luxembourg", "one-letter typo");
ok(m("germany-borders", "Czech Republic") === "Czechia", "alias");
ok(tierOf("equator", "Sao Tome and Principe") === 6, "diacritics");
ok(m("brazil-borders", "French Guiana") === "France", "alias to France");
ok(m("four-letter-countries", "Irap") === null, "no typos on short answers");
ok(m("danube", "Australia") === null, "Australia is not Austria");
ok(m("landlocked-africa", "Nigeria") === null, "Nigeria is not Niger");
ok(m("logic-gates", "nand") === "NAND", "NAND exact");
ok(m("logic-gates", "and") === "AND", "AND exact");
ok(m("henry-wives", "Catherine") === null, "ambiguous first name rejected");
ok(tierOf("henry-wives", "Katherine Parr") === 6, "spelling variant");
ok(m("china-borders", "Kyrgistan") === "Kyrgyzstan", "two typos on long name");
ok(m("germany-borders", "") === null, "empty input");
ok(m("germany-borders", "Spain") === null, "wrong answer");

// --- Spelling correction ---------------------------------------------------
ok(m("k-countries", "Kenia") === "Kenya", "one slip on a short name");
ok(m("china-borders", "Loas") === "Laos", "swapped letters");
ok(m("south-american-capitals", "Buenes Aires") === "Buenos Aires", "slip in a two-word name");
ok(m("canada-provinces", "Saskatchewen") === "Saskatchewan", "slip in a long name");
ok(m("emirates", "Ras al Kaimah") === "Ras Al Khaimah", "missing letter");
ok(core.matchDetail(seam("k-countries"), "Kenia", lexicon).corrected === true, "corrections are flagged");
ok(core.matchDetail(seam("k-countries"), "kenya", lexicon).corrected === false, "exact answers are not flagged");
// A different real place must never be "corrected" into a right answer.
ok(m("china-borders", "South Korea") === null, "South Korea is not North Korea");
ok(m("n-states", "South Dakota") === null, "South Dakota is not North Dakota");
ok(m("n-states", "South Carolina") === null, "South Carolina is not North Carolina");
ok(m("danube", "Slovenia") === null, "Slovenia is not Slovakia");
ok(m("landlocked-africa", "Nigeria") === null, "Nigeria is not Niger (lexicon)");
ok(m("a-countries", "Australia") === "Australia" && m("danube", "Australia") === null, "Australia vs Austria");
ok(m("olympians", "Hades") === null, "Hades stays out");
ok(m("logic-gates", "xnor") === "XNOR" && m("logic-gates", "nor") === "NOR", "short answers stay exact");
ok(core.editDistance("laos", "loas") === 1 && core.editDistance("kitten", "sitting") === 3, "distance");

// --- Daily selection ------------------------------------------------------
const firstPass = PACKS.reduce((sum, pack) => sum + Math.floor(pack.length / 7), 0);
{
  const used = new Set();
  for (let d = 1; d <= firstPass; d++) {
    const picks = core.seamsForDig(PACKS, d);
    ok(picks.length === 7, "seven safes per job");
    ok(new Set(picks.map((p) => p.id)).size === 7, "no repeats within a job");
    picks.forEach((p) => { ok(!used.has(p.id), `safe ${p.id} repeated in the first pass`); used.add(p.id); });
  }
  ok(firstPass >= 21, "at least three weeks before any repeat");
  // Later passes: still seven a day, no repeats within a pass.
  const perPass = Math.floor(bank.length / 7);
  const seen = new Set();
  for (let d = firstPass + 1; d <= firstPass + perPass; d++) {
    const picks = core.seamsForDig(PACKS, d);
    ok(picks.length === 7, "seven safes per job in later passes");
    picks.forEach((p) => { ok(!seen.has(p.id), "no repeats within a later pass"); seen.add(p.id); });
  }
  // Appending a pack must not change any day already dealt.
  const before = Array.from({ length: firstPass }, (_, i) => core.seamsForDig(PACKS, i + 1).map((s) => s.id).join());
  const extra = Array.from({ length: 14 }, (_, i) => ({ id: "x" + i, cat: "Test", prompt: "x.", answers: [["a", 1], ["b", 3], ["c", 6]] }));
  const grown = [...PACKS, extra];
  const after = Array.from({ length: firstPass }, (_, i) => core.seamsForDig(grown, i + 1).map((s) => s.id).join());
  ok(JSON.stringify(before) === JSON.stringify(after), "adding a pack keeps earlier days unchanged");
  ok(core.seamsForDig(grown, firstPass + 1).every((s) => s.id.startsWith("x")), "new pack is dealt next");
}
ok(core.utcDigNumber(Date.UTC(2026, 10, 12, 9)) === 1, "launch day is dig #1");
ok(core.utcDigNumber(Date.UTC(2026, 10, 13, 0, 0, 1)) === 2, "next day is dig #2");

// --- Rarity ---------------------------------------------------------------
for (const s of bank) {
  // With no real answers, the blended tiers must equal the hand-set ones.
  const { real, rows } = core.rarity(s);
  ok(real === 0, "no real plays yet");
  for (const [name, tier] of s.answers) {
    ok(rows.find((r) => r.name === name).tier === tier, `${s.id}/${name}: seed tier drifted`);
  }
  const total = rows.reduce((sum, r) => sum + r.share, 0);
  ok(Math.abs(total - 1) < 1e-9, `${s.id}: shares sum to 1`);
}
{
  // Real data overrides the seed: if everyone says Luxembourg it stops being rare.
  const g = seam("germany-borders");
  const flipped = core.rarity(g, { Luxembourg: 20000, France: 3 }).rows;
  ok(flipped.find((r) => r.name === "Luxembourg").tier === 1, "popular answer becomes Quartz");
  ok(flipped.find((r) => r.name === "France").tier === 6, "unpopular answer becomes Diamond");
  ok(core.rarity(g, { NotAnAnswer: 99 }).real === 0, "unknown keys are ignored");
  // A few early answers must not knock a Diamond down.
  ok(core.rarity(g, { Luxembourg: 2 }).rows.find((r) => r.name === "Luxembourg").tier === 6, "early answers do not flip a gem");
}

{
  // The shop: loot values line up with the tiers, and nothing is free or a sure thing.
  ok(core.TIER_K.length === 7 && core.TIER_K[0] === 0, "one payout per tier, nothing for a bust");
  for (let t = 1; t < 7; t++) ok(core.TIER_K[t] > core.TIER_K[t - 1], `tier ${t} pays more than tier ${t - 1}`);
  for (const [id, item] of Object.entries(ITEMS)) {
    ok(Number.isInteger(item.price) && item.price > 0, `${id} has a whole, positive price`);
    ok(["throw", "time", "blast"].includes(item.kind), `${id} has a known kind`);
    if (item.kind === "throw") ok(item.luck > 0 && item.luck <= 0.01, `${id} is a long shot`);
    if (item.kind === "time") ok(item.seconds >= 1 && item.seconds <= 5, `${id} adds a few seconds`);
  }
  const perfectDay = 7 * core.TIER_K[6];
  ok(ITEMS.dynamite.price > core.TIER_K[6], "dynamite costs more than the best safe pays");
  ok(ITEMS.dynamite.price <= perfectDay, "a perfect day can afford dynamite");
  ok(catalogue().length === Object.keys(ITEMS).length && catalogue().every((i) => !("luck" in i)), "the catalogue lists everything without the odds table");
  ok(MAX_BUY >= 10, "handfuls of ten can be bought");
}

console.log(`All ${checks} checks passed across ${bank.length} safes.`);
