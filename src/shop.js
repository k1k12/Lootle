/*
 * The wardrobe. Prices are in thousands of dollars.
 *
 * Everything here is clothing for the cat (kind "wear"): bought once, kept
 * for good, and no help at all in the game. The tools the shop used to sell
 * are gone; every player gets one free hint a night instead.
 *
 * An item with `rare` only turns up some nights. `rare` is the chance it is
 * in stock on any given job, the same for every player.
 */
export const ITEMS = {
  tux: { name: "Tuxedo coat", price: 250, kind: "wear", slot: "coat", blurb: "Black tie, white bib." },
  ginger: { name: "Ginger tabby", price: 250, kind: "wear", slot: "coat", blurb: "Loud. Proud. Easy to spot." },
  siamese: { name: "Siamese", price: 400, kind: "wear", slot: "coat", blurb: "Old money." },
  cap: { name: "Flat cap", price: 60, kind: "wear", slot: "hat", blurb: "Proper wrong'un." },
  beret: { name: "Beret", price: 60, kind: "wear", slot: "hat", blurb: "For art jobs." },
  tophat: { name: "Top hat", price: 150, kind: "wear", slot: "hat", blurb: "Overdressed for crime." },
  crown: { name: "Crown", price: 1000, kind: "wear", slot: "hat", rare: 0.12, blurb: "For cats with ideas above their station." },
  bow: { name: "Bow tie", price: 40, kind: "wear", slot: "neck", blurb: "Sharp." },
  pearls: { name: "Pearls", price: 200, kind: "wear", slot: "neck", blurb: "Borrowed. Sort of." },
  scarf: { name: "Scarf", price: 40, kind: "wear", slot: "neck", blurb: "It gets cold on roofs." },
};

/** Things the shop no longer sells. Any still in a bag are ignored. */
export const RETIRED_ITEMS = ["tomato", "egg", "duck", "hammer", "hairpin", "hourglass", "scope", "dynamite", "key"];

export const MAX_BUY = 20;

function chance(job, id) {
  let h = 2166136261;
  const text = job + ":" + id;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}

/** Is this item on the shelf for a given job? Ordinary stock always is. */
export function inStock(id, job) {
  const item = ITEMS[id];
  return !!item && (!item.rare || chance(job, id) < item.rare);
}

/**
 * What the browser is allowed to know about the shop on a given job. Rare
 * items are always listed so people know they exist: `rare` marks them and
 * `out` says they are not on the shelf tonight.
 */
export function catalogue(job) {
  return Object.entries(ITEMS).map(([id, item]) => ({
    id, name: item.name, price: item.price, kind: item.kind, blurb: item.blurb,
    slot: item.slot || "", rare: !!item.rare, out: !inStock(id, job),
  }));
}
