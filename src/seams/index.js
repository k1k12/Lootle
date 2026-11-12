/*
 * The safe bank. Each pack is a plain list of seams; add a new pack file,
 * import it here and add it to PACKS. Nothing else needs to change.
 * Server only: this folder is never sent to the browser.
 */
import { PACK as pack01 } from "./pack-01.js";
import { PACK as pack02 } from "./pack-02.js";

const PACKS = [pack01, pack02];

export const SEAMS = PACKS.flat();
