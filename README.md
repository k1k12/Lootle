# Lootle

[![checks](https://github.com/k1k12/Lootle/actions/workflows/ci.yml/badge.svg?branch=dev)](https://github.com/k1k12/Lootle/actions/workflows/ci.yml)

A daily trivia game with a heist theme. Play it at [lootle.app](https://lootle.app).

Everyone gets the same five vault doors each night. Each door is a question
with a lot of right answers, and the answer fewer people give is worth more.
The catch: every answer is the key to the next door. Its last letter is the
letter the next answer has to start with.

## Contents

- [How to play](#how-to-play)
- [Running it locally](#running-it-locally)
- [How it is built](#how-it-is-built)
- [Adding questions](#adding-questions)
- [Deploying](#deploying)
- [Known limits](#known-limits)
- [Contributing](#contributing)

## How to play

- You only see a door when you reach it. Door 1 takes any answer. After
  that, the next answer has to start with the last letter of your previous
  one: say Saluki, and the next door only opens for an I.
- Each door has 25 seconds and three tries. A guess with the wrong first
  letter is turned away without costing a try.
- Every answer scores from 12 to 100 for how rare it is. Rarer answers push
  the key deeper into the lock: loose change ($1K), a tidy sum ($2K), a rare
  find ($4K), a big score ($7K) or the perfect crime ($10K, only for 100).
- Keep the chain going and each door pays more: the loot is multiplied by
  how many doors in a row you have opened, up to five. A perfect night is
  $150K.
- Three wrong or out of time and the chain breaks. That door pays nothing,
  the multiplier goes back to one and the next door takes any letter.
- The chain only breaks when you lose a door. If nothing on the next door
  starts with your last letter, the key slips back to the letter before it
  (Turkey with no Y answers gives an E), and further back if it has to.
- Loot from the daily job goes into your stash. Old jobs ("cold cases") can
  each be played once for fun, and practice deals five random doors. Neither
  pays or counts towards the rarity numbers.

## Running it locally

You need Node.js 22 or newer.

```
git clone https://github.com/k1k12/Lootle.git
cd Lootle
npm install
npm test       # checks the question bank, matching and rarity maths
npm run dev    # serves the game at http://localhost:8787
```

`npm run dev` keeps storage on your machine. The judge (below) runs on Cloudflare even in local development, so Wrangler asks you
to log in once with `npx wrangler login`. A free account is enough.

## How it is built

The site is a Cloudflare Worker. The front end is plain HTML, CSS and
JavaScript with no build step, and the sound effects are synthesised in the
browser rather than loaded from files.

| Path | What is in it |
| --- | --- |
| `public/` | The front end. `js/game.js` is the whole game: the lock, the pixel loot and the sounds. No answers. |
| `src/worker.js` | The Worker: `/api/*` routes and the per-safe store |
| `src/core.js` | Spelling correction, rarity maths and the daily schedule |
| `src/seams/` | The question bank, in packs. Never sent to the browser. |
| `src/shop.js` | The wardrobe: clothes, prices and which rare ones are in stock on a given night |
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

Guesses are checked on the server. Case, accents and punctuation are
ignored. A single slip in a word of five letters or more is fixed without
asking ("Dalmation" counts). Anything further off, up to three typos
depending on the length, is offered back as a "did you mean" first, and
only counts if you take it. A guess is never corrected
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

### The judge

The chain means you are often hunting for an answer that starts with one
letter, so the lists have to be long. Doors are only dealt from lists of 60
answers or more, plus the open prompts ("name something you would find in a
fridge"), which nobody can list in full. When an answer is not on the list,
the Worker asks a small language model on Workers AI one yes-or-no
question: would a quiz host accept this?

- Each answer is only ever asked about once per door. The verdict is stored,
  and a yes joins that door's answers as a rare one.
- Only short, plain answers are put to the model (up to four words, letters
  and digits), which also keeps instructions out of the question.
- A player can put at most eight new answers to the judge per job.
- If the model is slow, unavailable or unsure, the answer is simply wrong, as
  it would have been without a judge. The game never depends on it.

### Storage

Each safe has its own small SQLite database (a Durable Object) holding the
answer counts and which anonymous player ids have played it. A third store per daily job keeps
every finisher's total, which is how the results screen can say where you
placed. A second store per player
id holds the stash and the chain (the letter you owe the next door and how
long the run is), so neither can be edited in the browser. Streaks and
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

Packs sit on four shelves in `src/seams/index.js`. From job 19 a night is
dealt in this order:

| Door | Taken from |
| --- | --- |
| 1 and 2 | `EASY`: broad questions with 60 or more answers |
| 3 and 5 | `OPEN`: prompts with no fixed list |
| 4 | `MID` and `VAULTS` lists with 60 or more answers |

`HARD` lists are too short for the chain and are not dealt at the moment.

To stop a safe being dealt without breaking old jobs in the archive, add its
id to `RETIRED` in `src/seams/index.js` rather than deleting it.

Always add packs at the end. The schedule deals each pack in order, so
appending a pack never changes which doors earlier days had. Jobs 1 to 10 had seven safes, job 11 had ten doors and jobs 12 to 18 used
the v3 deal. They are still dealt the old way, so the archive plays as it did.

## Deploying

```
npm run deploy
```

This publishes the Worker to lootle.app. Only `main` should be deployed.
Releases go through a pull request from `dev` into `main`, as described in
[CONTRIBUTING.md](CONTRIBUTING.md).

## Known limits

- Workers AI gives 10,000 "Neurons" a day free. A verdict costs a handful, so
  that is well over a thousand new answers a day; past it, unlisted answers
  are marked wrong until the next day.
- Player ids are random values created in the browser. Someone determined
  can make new ones to see answers early or skew the counts. That is fine
  for a casual game, but it would need bot protection before adding prizes
  or a public leaderboard.
- Cloudflare's free plan allows about 100,000 storage requests a day, which
  is roughly 5,000 full games. Past that the game carries on using the
  estimates until the quota resets at midnight UTC.

## Contributing

Branch names, commit messages and the release process are in
[CONTRIBUTING.md](CONTRIBUTING.md). Bugs and question suggestions are welcome
as [issues](https://github.com/k1k12/Lootle/issues).

## Licence

No licence has been granted. The code and question bank are all rights
reserved.
