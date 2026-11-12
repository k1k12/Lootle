/*
 * Lootle core: answer matching, rarity and daily seam selection.
 * Pure functions, shared by the Worker and the tests.
 */
export const TIER_NAMES = [null, "Loose change", "Cash", "Gold bar", "Painting", "Crown jewels", "The big score"];
export const SEAMS_PER_DIG = 7;
export const EPOCH = Date.UTC(2026, 10, 12); // Dig #1

export function normalise(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^the /, "");
}

export function editDistance(a, b) {
  if (a === b) return 0;
  const prev = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

// Typos forgiven depend on the shorter string, so "Iran" never slides into
// "Iraq" and "Australia" never becomes "Austria".
function allowance(a, b) {
  const n = Math.min(a.length, b.length);
  if (n >= 9) return 2;
  if (n >= 6) return 1;
  return 0;
}

/** Canonical answer name for a guess, or null. Typo matches must be unambiguous. */
export function matchAnswer(seam, input) {
  const guess = normalise(input);
  if (!guess) return null;
  let fuzzy = null;
  let fuzzyDist = Infinity;
  let tie = false;
  for (const [name, , ...aliases] of seam.answers) {
    for (const form of [name, ...aliases]) {
      const target = normalise(form);
      if (target === guess) return name;
      const limit = allowance(guess, target);
      if (!limit) continue;
      const d = editDistance(guess, target);
      if (d > limit) continue;
      if (d < fuzzyDist) { fuzzy = name; fuzzyDist = d; tie = false; }
      else if (d === fuzzyDist && fuzzy !== name) tie = true;
    }
  }
  return fuzzy && !tie ? fuzzy : null;
}

/*
 * Rarity.
 *
 * Each answer starts with a hand-set tier, which we turn into an expected
 * share of answers (each tier is half as likely as the one before). Real
 * answer counts are blended in with that estimate worth PRIOR_PLAYS answers,
 * so early on the seed dominates and after a thousand or so plays the data does.
 * An answer's gem then depends on how its share compares with the seam's
 * most common answer.
 */
export const PRIOR_PLAYS = 1000;
const SEED_WEIGHT = [0, 32, 16, 8, 4, 2, 1];
// Share relative to the top answer. Each cutoff sits midway (geometrically)
// between two seed tiers, so a handful of early answers cannot flip a gem.
const TIER_CUTOFFS = [0.707, 0.354, 0.177, 0.088, 0.044];

export function rarity(seam, counts = {}) {
  const seedTotal = seam.answers.reduce((sum, a) => sum + SEED_WEIGHT[a[1]], 0);
  let real = 0;
  for (const [name] of seam.answers) real += counts[name] || 0;

  const rows = seam.answers.map(([name, seedTier]) => {
    const prior = SEED_WEIGHT[seedTier] / seedTotal;
    const share = ((counts[name] || 0) + prior * PRIOR_PLAYS) / (real + PRIOR_PLAYS);
    return { name, share };
  });
  const top = Math.max(...rows.map((r) => r.share));
  for (const row of rows) {
    const rel = row.share / top;
    let tier = 6;
    for (let i = 0; i < TIER_CUTOFFS.length; i++) {
      if (rel > TIER_CUTOFFS[i]) { tier = i + 1; break; }
    }
    row.tier = tier;
    row.pct = Math.round(row.share * 1000) / 10;
  }
  rows.sort((a, b) => a.share - b.share);
  return { real, rows };
}

// Small deterministic PRNG so everyone gets the same seams each day.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(list, rand) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Dig number for a moment in time, by UTC calendar day (1 on launch day). */
export function utcDigNumber(now = Date.now()) {
  return Math.floor((now - EPOCH) / 86400000) + 1;
}

/** The bank is shuffled once per cycle and dealt out seven at a time. */
export function seamsForDig(bank, number) {
  const perCycle = Math.floor(bank.length / SEAMS_PER_DIG);
  const index = Math.max(0, number - 1);
  const cycle = Math.floor(index / perCycle);
  const slot = index % perCycle;
  const order = shuffled(bank, mulberry32(0xd1661e + cycle));
  return order.slice(slot * SEAMS_PER_DIG, (slot + 1) * SEAMS_PER_DIG);
}

export function randomSeams(bank) {
  return shuffled(bank, Math.random).slice(0, SEAMS_PER_DIG);
}
