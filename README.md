# Lootle

[![checks](https://github.com/k1k12/Lootle/actions/workflows/ci.yml/badge.svg?branch=dev)](https://github.com/k1k12/Lootle/actions/workflows/ci.yml)

A daily trivia game with a heist theme. Play it at [lootle.app](https://lootle.app).

Everyone gets the same ten vault doors each night. Each door is a question
with a lot of right answers, and the answer fewer people give is worth more.
Asked to name a country, "France" gets you loose change. "Djibouti" might be
the perfect crime.

## Contents

- [How to play](#how-to-play)
- [Running it locally](#running-it-locally)
- [How it is built](#how-it-is-built)
- [Adding questions](#adding-questions)
- [Deploying](#deploying)
- [Known limits](#known-limits)
- [Contributing](#contributing)

## How to play

- You have 30 seconds and three goes on each door.
- Every answer scores from 12 to 100 for how rare it is. The score sets the
  loot: loose change ($1K), a tidy sum ($2K), a rare find ($4K), a big score
  ($7K) or the perfect crime ($10K, only for a score of 100). A perfect night
  is $100K.
- After a right answer you can take the loot or risk it. A rarer second
  answer trades up. Anything else and the shutters come down on nothing.
- A job starts easy and gets harder: four broad questions (name a country,
  name a dog breed), two narrower ones (name an island in the Caribbean),
  one hard specialist list, then three open prompts (name something you
  would find in a fridge).
- Loot from the daily job goes into your stash. The fence sells tools to use
  mid-job (a hairpin for one more go, an hourglass, a stethoscope that gives
  a first letter, dynamite that shows three answers of which one is the
  rarest, and a skeleton key) and clothes for the cat, which do nothing. A
  couple of items only turn up on some nights. A door opened with help is
  marked in your shared result.
- Old jobs can each be played once for fun. They pay nothing and do not
  count towards streaks or the rarity numbers.
- The daily job can be played once. Practice deals ten random doors and does
  not count either.

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
| `public/` | The front end. `js/game.js` is the game, `js/art.js` draws everything (the skyline, the vault door, the cat) as SVG. No answers. |
| `src/worker.js` | The Worker: `/api/*` routes and the per-safe store |
| `src/core.js` | Spelling correction, rarity maths and the daily schedule |
| `src/seams/` | The question bank, in packs. Never sent to the browser. |
| `src/shop.js` | Shop items, prices and which rare items are in stock on a given night |
| `src/lexicon.js` | Names that must not be auto-corrected into an answer |
| `tests/run.js` | Checks on the bank, matching, rarity and schedule |
| `wrangler.jsonc` | Cloudflare configuration |

A door is called a "seam" or a "safe" in the code. The names are left over
from earlier themes (mining, then safes).

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

Every answer starts with a hand-set estimate of how common it is (tier 1 to
6 in the pack files). Each player's first answer in the daily job is
counted, and the counts are blended with the estimate, which carries the
weight of 1,000 answers. An answer's score is 12 for the one everybody gives,
rising towards 96 as it gets rarer. About one in forty of the least-said
answers on each door scores a perfect 100. Until a door has 1,000 real
answers the results screen says its numbers are mostly an estimate.

### Storage

Each safe has its own small SQLite database (a Durable Object) holding the
answer counts and which anonymous player ids have played it. A third store per daily job keeps
every finisher's total, which is how the results screen can say where you
placed. A second store per player
id holds the stash and bought items, so they cannot be edited in the
browser. Streaks and
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
2. Import it in `src/seams/index.js` and add it to the end of the right
   shelf (see below), and to `SEAMS`.
3. Run `npm test`. It checks that every door has at least three answers, a
   tier 1 and a tier 6, and that no spelling points at two different answers.

Packs sit on four shelves in `src/seams/index.js`, and a ten-door job takes
from each in order:

| Shelf | Doors | What goes on it |
| --- | --- | --- |
| `EASY` | 1 to 4 | Broad questions with 100 or more answers (`easy-NN.js`) |
| `MID` | 5 and 6 | Narrower lists (`pack-NN.js`, `vault-NN.js`, `mid-NN.js`) |
| `HARD` | 7 | Specialist lists (`hard-NN.js`) |
| `OPEN` | 8 to 10 | Prompts with no fixed list (`open-NN.js`) |

The open prompts are still checked against a list for now, so a sensible
answer nobody thought of is marked wrong. Those lists are meant to grow.

To stop a safe being dealt without breaking old jobs in the archive, add its
id to `RETIRED` in `src/seams/index.js` rather than deleting it.

Always add packs at the end. The schedule deals each pack in order, so
appending a pack never changes which doors earlier days had. Jobs before
number 11 had seven safes and are still dealt the old way, so the archive
plays as it did.

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
  is roughly 2,500 full games. Past that the game carries on using the
  estimates until the quota resets at midnight UTC.

## Contributing

Branch names, commit messages and the release process are in
[CONTRIBUTING.md](CONTRIBUTING.md). Bugs and question suggestions are welcome
as [issues](https://github.com/k1k12/Lootle/issues).

## Licence

No licence has been granted. The code and question bank are all rights
reserved.
