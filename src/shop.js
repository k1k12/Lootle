/*
 * The shop. Prices and loot values are in thousands of dollars.
 *
 * kind "throw":  junk to hurl at the safe. `luck` is the chance one throw
 *                jams the lock and reveals an answer.
 * kind "time":   adds `seconds` to the current safe.
 * kind "blast":  shows three answers, one of them the rarest in the safe.
 */
export const ITEMS = {
  tomato: { name: "Tomato", emoji: "\u{1F345}", price: 1, kind: "throw", luck: 1 / 2000, blurb: "Splat. 1 in 2,000 hits the lock." },
  egg: { name: "Egg", emoji: "\u{1F95A}", price: 2, kind: "throw", luck: 1 / 1000, blurb: "Messier. 1 in 1,000 hits the lock." },
  duck: { name: "Rubber duck", emoji: "\u{1F986}", price: 5, kind: "throw", luck: 1 / 400, blurb: "Squeaks on impact. 1 in 400." },
  hammer: { name: "Hammer", emoji: "\u{1F528}", price: 20, kind: "throw", luck: 1 / 100, blurb: "A proper clang. 1 in 100." },
  hourglass: { name: "Hourglass", emoji: "⏳", price: 30, kind: "time", seconds: 3, blurb: "Three more seconds on this safe." },
  dynamite: { name: "Dynamite", emoji: "\u{1F9E8}", price: 300, kind: "blast", blurb: "Blows the door: three answers, one is the rarest." },
};

export const MAX_BUY = 99;

/** What the browser is allowed to know about the shop. */
export function catalogue() {
  return Object.entries(ITEMS).map(([id, item]) => ({
    id, name: item.name, emoji: item.emoji, price: item.price, kind: item.kind, blurb: item.blurb,
  }));
}
