/*
 * Lootle core: answer matching, rarity and daily seam selection.
 * Pure functions, shared by the Worker and the tests.
 */
export const TIER_NAMES = [null, "Loose change", "Cash", "Gold bar", "Painting", "Crown jewels", "The big score"];
// What each loot tier pays, in thousands of dollars. Tier 0 is an empty safe.
export const TIER_K = [0, 10, 20, 35, 50, 70, 100];
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

/**
 * Edit distance that also counts swapping two neighbouring letters as one
 * slip ("Loas" for "Laos"), since that is the most common typing mistake.
 */
export function editDistance(a, b) {
  if (a === b) return 0;
  const rows = [];
  for (let i = 0; i <= a.length; i++) {
    rows.push(new Array(b.length + 1).fill(0));
    rows[i][0] = i;
  }
  for (let j = 0; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let best = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        best = Math.min(best, rows[i - 2][j - 2] + 1);
      }
      rows[i][j] = best;
    }
  }
  return rows[a.length][b.length];
}

// How many slips we forgive depends on the shorter of the two strings.
function allowance(a, b) {
  const n = Math.min(a.length, b.length);
  if (n >= 14) return 3;
  if (n >= 9) return 2;
  if (n >= 4) return 1;
  return 0;
}

/**
 * Spelling correction for one safe.
 *
 * An exact match (after normalising case, accents and punctuation) always
 * wins. Otherwise we look for the closest accepted spelling, with three
 * guards so a wrong answer is never "corrected" into a right one:
 *   1. the first letter must match (people rarely mistype it, and it keeps
 *      North/South pairs apart);
 *   2. the guess must not itself be a known name of something else
 *      (`lexicon`: every answer in the bank plus a list of look-alikes);
 *   3. if two different answers are equally close, we accept neither.
 *
 * Returns { name, corrected } or null.
 */
export function matchDetail(seam, input, lexicon) {
  const guess = normalise(input);
  if (!guess) return null;
  let fuzzy = null;
  let fuzzyDist = Infinity;
  let tie = false;
  for (const [name, , ...aliases] of seam.answers) {
    for (const form of [name, ...aliases]) {
      const target = normalise(form);
      if (target === guess) return { name, corrected: false };
      const limit = allowance(guess, target);
      if (!limit || target[0] !== guess[0]) continue;
      const d = editDistance(guess, target);
      if (d > limit) continue;
      if (d < fuzzyDist) { fuzzy = name; fuzzyDist = d; tie = false; }
      else if (d === fuzzyDist && fuzzy !== name) tie = true;
    }
  }
  if (!fuzzy || tie) return null;
  if (lexicon && lexicon.has(guess)) return null;
  return { name: fuzzy, corrected: true };
}

/** Canonical answer name for a guess, or null. */
export function matchAnswer(seam, input, lexicon) {
  const hit = matchDetail(seam, input, lexicon);
  return hit ? hit.name : null;
}

/** Every accepted spelling in the bank, plus look-alike names, normalised. */
export function buildLexicon(bank, extra = []) {
  const words = new Set(extra.map(normalise));
  for (const seam of bank) {
    for (const [name, , ...aliases] of seam.answers) {
      for (const form of [name, ...aliases]) words.add(normalise(form));
    }
  }
  return words;
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

/**
 * Deal a list into days of seven, shuffled, with at most three safes from one
 * category in a day where the list allows it. Leftovers (fewer than seven)
 * are dropped.
 */
export function deal(list, rand) {
  const pool = shuffled(list, rand);
  const days = [];
  while (pool.length >= SEAMS_PER_DIG) {
    const day = [];
    const perCat = {};
    for (let cap = 3; day.length < SEAMS_PER_DIG; cap++) {
      for (let i = 0; i < pool.length && day.length < SEAMS_PER_DIG; ) {
        const cat = pool[i].cat;
        if ((perCat[cat] || 0) < cap) {
          perCat[cat] = (perCat[cat] || 0) + 1;
          day.push(pool.splice(i, 1)[0]);
        } else {
          i++;
        }
      }
    }
    days.push(day);
  }
  return days;
}

const scheduleCache = new WeakMap();

/**
 * The schedule.
 *
 * First pass: each pack is dealt on its own, in pack order, so adding a new
 * pack to the end only adds days and never changes a day already dealt.
 * After every pack has been played once, later passes deal the whole bank
 * together with a fresh shuffle each time.
 */
export function seamsForDig(packs, number) {
  let first = scheduleCache.get(packs);
  if (!first) {
    first = packs.flatMap((pack, i) => deal(pack, mulberry32(0xd1661e + i)));
    scheduleCache.set(packs, first);
  }
  const index = Math.max(0, number - 1);
  if (index < first.length) return first[index];
  const all = packs.flat();
  const perPass = Math.floor(all.length / SEAMS_PER_DIG);
  const later = index - first.length;
  const pass = Math.floor(later / perPass);
  return deal(all, mulberry32(0x5afe00 + pass))[later % perPass];
}

/** The first job that ends on a vault safe. Earlier jobs stay as they were. */
export const VAULT_FROM = 4;

const vaultCache = new WeakMap();

/**
 * A full job: six ordinary safes, then one vault safe (a big list) to finish.
 * Vault packs are shuffled one at a time in order, so adding a pack to the
 * end never changes a job that has already been played. Once every vault
 * safe has been used, later rounds reshuffle them all together.
 */
export function safesForJob(packs, vaults, number) {
  const day = seamsForDig(packs, number);
  const total = vaults.reduce((sum, v) => sum + v.length, 0);
  if (!total || number < VAULT_FROM) return day;
  let first = vaultCache.get(vaults);
  if (!first) {
    first = vaults.flatMap((v, i) => shuffled(v, mulberry32(0xb16000 + i)));
    vaultCache.set(vaults, first);
  }
  const index = number - VAULT_FROM;
  const round = Math.floor(index / total);
  const order = round === 0 ? first : shuffled(vaults.flat(), mulberry32(0xb16f00 + round));
  return [...day.slice(0, SEAMS_PER_DIG - 1), order[index % total]];
}

export function randomSeams(bank) {
  return shuffled(bank, Math.random).slice(0, SEAMS_PER_DIG);
}
