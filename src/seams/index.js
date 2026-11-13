/*
 * The safe bank. Each pack is a plain list of seams. To add questions,
 * create a new pack file, import it here and add it to the END of PACKS.
 * Appending never changes which safes earlier days were dealt.
 * Server only: this folder is never sent to the browser.
 */
import { PACK as pack01 } from "./pack-01.js";
import { PACK as pack02 } from "./pack-02.js";
import { PACK as pack03 } from "./pack-03.js";
import { PACK as vault01 } from "./vault-01.js";

export const PACKS = [pack01, pack02, pack03];

/*
 * Vault safes are the big lists (every country in Africa, every element).
 * One closes each job. New vault packs also go on the END of this list.
 */
export const VAULTS = [vault01];

export const SEAMS = [...PACKS.flat(), ...VAULTS.flat()];
