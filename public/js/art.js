/*
 * Lootle drawings: Chess the cat and her wardrobe, what sits behind the
 * doors, and the teeth on the shutters. All small inline SVG, no game rules.
 */
window.LootleArt = (function () {
  "use strict";

  const INK = "#141a44";
  const PAPER = "#fbf6ea";
  const GOLD = "#d99a1c";
  const COAT = {
    black: { body: INK },
    tux: { body: INK, bib: PAPER },
    ginger: { body: "#d9822b", stripes: "#a85a14" },
    siamese: { body: "#efe2c6", points: "#5a3d2b" },
  };
  const HAT = {
    cap: '<path d="M11 12q21-17 42 0l7 5H9z" fill="#6b7a4a" stroke="#141a44" stroke-width="1.500" stroke-linejoin="round"/><path d="M9 17h20" stroke="#141a44" stroke-width="1.500"/>',
    beret: '<ellipse cx="29" cy="7" rx="21" ry="8" fill="#cf3f2b" stroke="#141a44" stroke-width="1.500"/><path d="M31 -1v-5" stroke="#141a44" stroke-width="2" stroke-linecap="round"/>',
    tophat: '<rect x="20" y="-15" width="24" height="22" rx="1" fill="#070919"/><rect x="20" y="1" width="24" height="5" fill="#f5b82e"/><rect x="11" y="6" width="42" height="5" rx="2.500" fill="#070919"/>',
    crown: '<path d="M14 11l2-20 9 11 7-16 7 16 9-11 2 20z" fill="#f5b82e" stroke="#141a44" stroke-width="1.500" stroke-linejoin="round"/><circle cx="32" cy="4" r="2.500" fill="#cf3f2b"/><circle cx="21" cy="6" r="1.800" fill="#6f9fe0"/><circle cx="43" cy="6" r="1.800" fill="#62c4a7"/>',
  };
  const NECK = {
    bow: '<path d="M32 54l-11-6v12zM32 54l11-6v12z" fill="#cf3f2b" stroke="#141a44" stroke-width="1.200" stroke-linejoin="round"/><circle cx="32" cy="54" r="3" fill="#cf3f2b" stroke="#141a44" stroke-width="1.200"/>',
    pearls: [16, 21, 26.500, 32, 37.500, 43, 48].map((x, i) => `<circle cx="${x}" cy="${51.500 + [0, 2.600, 4.200, 4.800, 4.200, 2.600, 0][i]}" r="2.600" fill="#fbf6ea" stroke="#141a44" stroke-width="1"/>`).join(""),
    scarf: '<path d="M14 48q18 9 36 0v7q-18 9-36 0z" fill="#62c4a7" stroke="#141a44" stroke-width="1.200"/><path d="M40 55l3 10 6-2-3-9z" fill="#62c4a7" stroke="#141a44" stroke-width="1.200" stroke-linejoin="round"/>',
  };

  let fit = { coat: "black", hat: "", neck: "" };

  /** Chess, in whatever she is wearing. `wear` overrides the saved outfit (for wardrobe swatches). */
  function cat(size, wear) {
    const f = wear || fit;
    const c = COAT[f.coat] || COAT.black;
    const dark = c.body === INK;
    return (
      `<svg width="${size}" height="${Math.round(size * 1.250)}" viewBox="0 -16 64 80" aria-hidden="true">` +
      `<path d="M12 26L14 6l14 12h8L50 6l2 20v18q0 14-20 14T12 44z" fill="${c.body}" stroke="${INK}" stroke-width="${dark ? 0 : 1.500}" stroke-linejoin="round"/>` +
      (c.points ? `<path d="M14.500 7.500l10 8.500-11 6zM49.500 7.500l-10 8.500 11 6z" fill="${c.points}"/>` : "") +
      (c.stripes ? `<path d="M28 19l1.500 5M32 18v6M36 19l-1.500 5M13 41h6M13 46h5M51 41h-6M51 46h-5" stroke="${c.stripes}" stroke-width="2" stroke-linecap="round"/>` : "") +
      (c.bib ? `<path d="M22 57q10-17 20 0-10 2.500-20 0z" fill="${c.bib}"/>` : "") +
      `<rect x="14" y="25" width="36" height="13" rx="6.500" fill="${GOLD}" stroke="${INK}" stroke-width="${dark ? 0 : 1.200}"/>` +
      `<ellipse cx="24" cy="31.500" rx="4" ry="3.500" fill="${PAPER}"/><ellipse cx="40" cy="31.500" rx="4" ry="3.500" fill="${PAPER}"/>` +
      `<ellipse cx="24" cy="31.500" rx="1.200" ry="3" fill="${INK}"/><ellipse cx="40" cy="31.500" rx="1.200" ry="3" fill="${INK}"/>` +
      `<path d="M30 44l2 2 2-2z" fill="#f0485a"/>` +
      (NECK[f.neck] || "") + (HAT[f.hat] || "") +
      "</svg>"
    );
  }

  /** Fill every mugshot frame on the page with the cat as she is dressed now. */
  function dress() {
    document.querySelectorAll("[data-cat]").forEach(function (frame) {
      const plate = frame.dataset.plate;
      frame.innerHTML = cat(Number(frame.dataset.cat)) + (plate ? `<span class="plate">${plate}</span>` : "");
    });
  }

  // What sits behind a door, by loot level (1 to 5).
  const S = `stroke="${INK}" stroke-width="3" stroke-linejoin="round"`;
  const LOOT = [
    "",
    `<svg width="150" height="110" viewBox="0 0 150 110"><g ${S} fill="#e9ebf2"><ellipse cx="52" cy="92" rx="34" ry="11"/><path d="M18 92V80a34 11 0 0068 0v12"/><ellipse cx="52" cy="80" rx="34" ry="11"/><path d="M18 80V68a34 11 0 0068 0v12"/><ellipse cx="52" cy="68" rx="34" ry="11"/><ellipse cx="106" cy="94" rx="30" ry="10"/><path d="M76 94V84a30 10 0 0060 0v10"/><ellipse cx="106" cy="84" rx="30" ry="10"/></g></svg>`,
    `<svg width="150" height="110" viewBox="0 0 150 110"><g ${S}><rect x="20" y="62" width="110" height="40" rx="3" fill="#bfe8da"/><rect x="14" y="48" width="110" height="40" rx="3" fill="#d8f3ea"/><rect x="26" y="30" width="110" height="46" rx="3" fill="#f2fbf7"/><circle cx="81" cy="53" r="13" fill="#62c4a7"/><path d="M36 40v26M126 40v26" fill="none"/></g></svg>`,
    `<svg width="150" height="110" viewBox="0 0 150 110"><g ${S} fill="#f5c64a"><path d="M8 100l10-26h44l10 26z"/><path d="M78 100l10-26h44l10 26z"/><path d="M43 72l10-26h44l10 26z"/></g><g fill="none" stroke="#fbf6ea" stroke-width="3" stroke-linecap="round"><path d="M24 82h30M94 82h30M59 54h30"/></g></svg>`,
    `<svg width="150" height="118" viewBox="0 0 150 118"><rect x="2" y="2" width="146" height="114" rx="3" fill="#e5ad2a" ${S}/><rect x="14" y="14" width="122" height="90" fill="#6f9fe0" stroke="${INK}" stroke-width="2.500"/><circle cx="108" cy="38" r="12" fill="#fbf6ea"/><path d="M14 104L52 54l24 30 18-20 42 40z" fill="#62c4a7" stroke="${INK}" stroke-width="2.500" stroke-linejoin="round"/></svg>`,
    `<svg width="150" height="118" viewBox="0 0 150 118"><g ${S}><path d="M12 44l26-32h74l26 32-63 68z" fill="#fff6d6"/><path d="M12 44h126M38 12l14 32 23 68 23-68 14-32M52 44L75 12l23 32" fill="none"/></g><g fill="none" stroke="#fbf6ea" stroke-width="4" stroke-linecap="round"><path d="M120 6v12M114 12h12M22 84v10M17 89h10"/></g></svg>`,
  ];
  const LOOT_NAME = ["nothing", "loose change", "a wad of cash", "gold bars", "a painting, apparently", "a diamond the size of a fist"];
  const LEVEL_NAME = ["Busted", "Loose change", "Tidy sum", "Rare find", "Big score", "The perfect crime"];
  const LEGEND = [
    ["Coins", '<circle cx="14" cy="22" r="8"/><circle cx="26" cy="16" r="8"/>'],
    ["Cash", '<rect x="5" y="11" width="30" height="18" rx="2"/><circle cx="20" cy="20" r="4.500"/>'],
    ["Gold", '<path d="M9 28l4-10h14l4 10zM14 17l3-8h6l3 8z"/>'],
    ["Art", '<rect x="7" y="9" width="26" height="22" rx="1"/><path d="M11 27l8-9 5 6 3-3 4 6z"/>'],
    ["Diamond", '<path d="M8 16l6-7h12l6 7-12 15zM8 16h24"/>'],
  ];
  function legend(pay) {
    return LEGEND.map(function (item, i) {
      return `<div style="background:var(--l${i + 1})"><svg viewBox="0 0 40 40" fill="${PAPER}" stroke="${INK}" stroke-width="2.200" stroke-linejoin="round" aria-hidden="true">${item[1]}</svg>${item[0]}<br>${pay(i + 1)}</div>`;
    }).join("");
  }

  /** The zig-zag edge of a shutter, as an SVG path 312 wide. */
  function teeth(flip) {
    const n = 8, w = 312, h = 22, step = w / n;
    let d = flip ? `M0 ${h * 2}H${w}V${h}` : `M0 0H${w}V${h}`;
    for (let i = 0; i < n; i++) d += `L${(w - step * (i + 0.500)).toFixed(1)} ${flip ? 0 : h * 2}L${(w - step * (i + 1)).toFixed(1)} ${h}`;
    return d + "Z";
  }

  return {
    cat: cat, dress: dress, legend: legend, teeth: teeth,
    loot: function (level) { return LOOT[level] || ""; },
    lootName: function (level) { return LOOT_NAME[level] || ""; },
    levelName: function (level) { return LEVEL_NAME[level] || ""; },
    /** Get or set what the cat is wearing: { coat, hat, neck }. */
    fit: function (next) { if (next) { fit = next; dress(); } return fit; },
  };
})();
