# Lootle

A daily trivia heist. Seven safes a night, the same for everyone. Every safe
has many correct answers: the fewer crews who give yours, the further the
dial turns and the bigger the loot.

## How it plays

- 30 seconds and three tries per safe.
- Six loot levels, from loose change ($10K) to the big score ($100K). A
  perfect night is $700K.
- **Grab it, or spin again.** After a win you may answer the same safe once
  more. Something rarer swaps your loot up. Something more common, a repeat
  or a miss trips the alarm and that safe pays nothing.
- A practice run deals seven random safes. It does not touch streaks or the
  rarity numbers.

## How it works

| Path | What it holds |
| --- | --- |
| `public/` | The whole front end: page, styles, dial, synthesised sound. No answers. |
| `src/worker.js` | Cloudflare Worker: the `/api/*` routes and the per-safe store |
| `src/seams/` | The question bank, in packs. Server only. |
| `src/core.js` | Spelling correction, rarity maths, daily selection |
| `src/lexicon.js` | Look-alike names that must not be auto-corrected |
| `tests/run.js` | Checks on the bank, matching, rarity and selection |
| `wrangler.jsonc` | Cloudflare configuration |
| `.github/workflows/ci.yml` | Runs the checks on every push and pull request |

(In the code a safe is called a "seam", a name left over from an earlier theme.)

**Answers stay on the server.** The browser receives prompts only. A guess is
sent to `/api/answer`, and a safe's full answer list is only returned once
that player has finished the safe.

**Spelling.** Guesses are corrected on the server: case, accents and
punctuation are ignored, and one to three slips are forgiven depending on
length ("Kenia", "Loas", "Saskatchewen"). A guess is never corrected if it is
itself the name of something else, so "South Korea" does not become "North
Korea". The look-alike list lives in `src/lexicon.js`.

**Rarity.** Each answer starts from a hand-set estimate. Every first answer
in a daily job is counted, and counts are blended with the estimate, which
carries the weight of 1,000 answers. The game says "expected" until a safe
has at least that many real answers, then reports measured shares.

**Storage.** Each safe has its own small SQLite database (a Cloudflare
Durable Object) holding answer counts and which anonymous player ids have
played it, so load is spread across safes instead of one shared database.
Streaks and progress live in the player's browser. There are no accounts
and no personal data.

## Security and operations

- Answers never reach the browser until a safe is finished.
- Two rate limits: 300 requests a minute per network address, and 30 guesses
  a minute per player. Requests over 2 KB are rejected.
- Security headers on every page (`public/_headers`), including a content
  security policy that only allows the site's own scripts.
- `GET /api/health` returns a small status object for uptime monitors.
- GitHub Actions runs the checks on every push; Dependabot proposes
  dependency updates weekly.
- The site is served only on lootle.app and www.lootle.app.

## Run it

```
npm install
npm test          # bank, matching and rarity checks
npm run dev       # local copy at http://localhost:8787
npm run deploy    # publish to Cloudflare
```

## Adding questions

1. Create `src/seams/pack-03.js` exporting `PACK`, in the same format as the
   existing packs.
2. Import it in `src/seams/index.js` and add it to `PACKS`.
3. Run `npm test`. It checks every safe is a closed set with at least three
   answers, a tier 1 and a tier 6, and no alias pointing at two answers.

The daily line-up is a shuffle of the whole bank, so adding a pack changes
which safes appear on which day. Deploy new packs just after midnight UTC so
nobody's job changes halfway through.

## Known limits

- Player ids are random values made in the browser, so a determined person
  can make new ones to see answers or skew the counts. Fine for a casual
  game; add bot protection and rate limits before running anything with
  prizes or a public leaderboard.
- Cloudflare's free plan allows about 100,000 storage requests a day,
  roughly 4,000 full jobs. Past that the game keeps working on the seed
  estimates until the quota resets at midnight UTC.
