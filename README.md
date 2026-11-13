# Lootle

[![checks](https://github.com/k1k12/Lootle/actions/workflows/ci.yml/badge.svg?branch=dev)](https://github.com/k1k12/Lootle/actions/workflows/ci.yml)

A daily trivia game with a heist theme. Play it at [lootle.app](https://lootle.app).

Everyone gets the same seven safes each day. Each safe is a question with
several right answers, and the answer fewer people give is worth more. Say
"France" for a country bordering Germany and you get loose change. Say
"Luxembourg" and you get the big score.

## Contents

- [How to play](#how-to-play)
- [Running it locally](#running-it-locally)
- [How it is built](#how-it-is-built)
- [Adding questions](#adding-questions)
- [Deploying](#deploying)
- [Known limits](#known-limits)
- [Contributing](#contributing)

## How to play

- You have 30 seconds and three tries on each safe.
- There are six loot levels, from $10K to $100K. A perfect day is $700K.
- After a correct answer you can grab the loot or spin again. A rarer second
  answer swaps your loot up. A more common one, a repeat or a miss trips the
  alarm and the safe pays nothing.
- The daily job can be played once. Practice runs deal seven random safes
  and do not count towards your streak or the rarity numbers.

## Running it locally

You need Node.js 22 or newer.

```
git clone https://github.com/k1k12/Lootle.git
cd Lootle
npm install
npm test       # checks the question bank, matching and rarity maths
npm run dev    # serves the game at http://localhost:8787
```

`npm run dev` uses Wrangler's local mode, so storage works on your machine
without a Cloudflare account.

## How it is built

The site is a Cloudflare Worker. The front end is plain HTML, CSS and
JavaScript with no build step, and the sound effects are synthesised in the
browser rather than loaded from files.

| Path | What is in it |
| --- | --- |
| `public/` | The front end: page, styles, dial animation and sound. No answers. |
| `src/worker.js` | The Worker: `/api/*` routes and the per-safe store |
| `src/core.js` | Spelling correction, rarity maths and the daily schedule |
| `src/seams/` | The question bank, split into packs. Never sent to the browser. |
| `src/lexicon.js` | Names that must not be auto-corrected into an answer |
| `tests/run.js` | Checks on the bank, matching, rarity and schedule |
| `wrangler.jsonc` | Cloudflare configuration |

A safe is called a "seam" in the code. The name is left over from an earlier
mining theme.

### Answers stay on the server

The browser only ever receives the prompts. Each guess goes to `/api/answer`,
and the full answer list for a safe is returned only after that player has
finished it. Nothing in the page source gives an answer away.

### Spelling

Guesses are corrected on the server. Case, accents and punctuation are
ignored, and one to three typos are forgiven depending on the length of the
answer, so "Kenia" and "Saskatchewen" both count. A guess is never corrected
if it is the name of something else, which stops "South Korea" being
accepted as "North Korea".

### Rarity

Every answer starts with a hand-set estimate of how common it is. Each
player's first answer in the daily job is counted, and the counts are blended
with the estimate, which carries the weight of 1,000 answers. Until a safe
has that many real answers the game labels its numbers as expected rather
than measured.

### Storage

Each safe has its own small SQLite database (a Durable Object) holding the
answer counts and which anonymous player ids have played it. Streaks and
progress are kept in the player's browser. There are no accounts and no
personal data is collected.

### Security

- Two rate limits: 300 requests a minute per IP address and 30 guesses a
  minute per player. Request bodies over 2 KB are rejected.
- A content security policy and other headers are set in `public/_headers`.
- `GET /api/health` returns a small status object for uptime checks.

To report a security problem, see [SECURITY.md](SECURITY.md).

## Adding questions

1. Create the next pack file in `src/seams/`, for example `pack-04.js`,
   exporting `PACK` in the same format as the existing ones. Each answer is
   `[name, tier, ...other accepted spellings]`, where tier 1 is the answer
   most people give and tier 6 is the one almost nobody does.
2. Import it in `src/seams/index.js` and add it to the end of `PACKS`.
3. Run `npm test`. It checks that every safe has at least three answers, a
   tier 1 and a tier 6, and that no spelling points at two different answers.

Always add packs at the end. The schedule deals each pack in order, so
appending a pack never changes which safes earlier days had.

## Deploying

```
npm run deploy
```

This publishes the Worker to lootle.app. Only `main` should be deployed.
Releases go through a pull request from `dev` into `main`, as described in
[CONTRIBUTING.md](CONTRIBUTING.md).

## Known limits

- Player ids are random values created in the browser. Someone determined
  can make new ones to see answers early or skew the counts. That is fine
  for a casual game, but it would need bot protection before adding prizes
  or a public leaderboard.
- Cloudflare's free plan allows about 100,000 storage requests a day, which
  is roughly 4,000 full games. Past that the game carries on using the
  estimates until the quota resets at midnight UTC.

## Contributing

Branch names, commit messages and the release process are in
[CONTRIBUTING.md](CONTRIBUTING.md). Bugs and question suggestions are welcome
as [issues](https://github.com/k1k12/Lootle/issues).

## Licence

No licence has been granted. The code and question bank are all rights
reserved.
