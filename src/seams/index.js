/*
 * The safe bank. Each pack is a plain list of seams. To add questions,
 * create a new pack file, import it here and add it to the END of PACKS.
 * Appending never changes which safes earlier days were dealt.
 * Server only: this folder is never sent to the browser.
 */
import { PACK as pack01 } from "./pack-01.js";
import { PACK as pack02 } from "./pack-02.js";
import { PACK as pack03 } from "./pack-03.js";
import { PACK as pack04 } from "./pack-04.js";
import { PACK as vault01 } from "./vault-01.js";
import { PACK as vault02 } from "./vault-02.js";
import { PACK as vault03 } from "./vault-03.js";
import { PACK as hard01 } from "./hard-01.js";

export const PACKS = [pack01, pack02, pack03, pack04];

/*
 * Vault packs are the big lists (every country in Africa, every element).
 * New ones also go on the END of this list.
 */
export const VAULTS = [vault01, vault02, vault03];

/* Hard packs are specialist lists. One closes each job. */
export const HARD = [hard01];

/*
 * Retired safes are too small or too obvious to be worth a slot. They stay
 * in the bank so jobs in the archive still work, but are never dealt again.
 */
export const RETIRED = new Set([
  "planets", "ringed-planets", "galilean-moons", "halogens", "tastes", "forces", "quarks", "nucleobases",
  "vitamins", "senses", "teeth", "leg-bones", "brain-lobes", "platonic-solids", "triangles",
  "primes-under-20", "roman-numerals", "http-methods", "cmyk", "qwerty-top-row", "parts-of-speech",
  "swiss-languages", "solfege", "string-section", "beatles", "deadly-sins", "rainbow", "horsemen",
  "chess-pieces", "card-suits", "mother-sauces", "march-sisters", "turtle-artists", "olympic-rings",
  "tennis-slams", "golf-majors", "six-nations", "rushmore", "assassinated-presidents", "good-emperors",
  "continents", "oceans", "nordic-countries", "nordic-capitals", "uk-countries", "unsc-permanent",
  "brics-founders", "nyc-boroughs", "japan-islands", "borneo", "noble-gases", "alkali-metals", "osi",
  "atmosphere", "logic-gates", "states-of-matter", "blood-groups", "rock-types", "great-apes",
  "moon-phases", "skin-layers", "heart-chambers", "bee-castes", "insect-body", "conic-sections", "angles",
  "fibonacci", "squares", "storage-units", "home-row", "cia-triad", "vowels", "norse-days", "musketeers",
  "orchestra-families", "voice-types", "guitar-strings", "three-tenors", "classical-elements",
  "axis-powers", "apollo-11", "swimming-strokes", "triathlon", "tennis-scores", "five-spice", "balearics",
  "baltic-states", "baltic-capitals", "benelux",
]);

/* The short general knowledge safes still in play, pack by pack. */
export const SHORT = PACKS.map((pack) => pack.filter((s) => !RETIRED.has(s.id)));

export const SEAMS = [...PACKS.flat(), ...VAULTS.flat(), ...HARD.flat()];
