# Lootle

[![checks](https://github.com/k1k12/Lootle/actions/workflows/ci.yml/badge.svg?branch=dev)](https://github.com/k1k12/Lootle/actions/workflows/ci.yml)

A daily trivia game with a heist theme. Play it at [lootle.app](https://lootle.app).

Everyone gets the same five vault doors each night. Each door is a question
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

- The lock on each door is the clock: 25 seconds and three tries.
- Every answer scores from 12 to 100 for how rare it is, and the score
  decides what is behind the door: loose change ($1K), a wad of cash ($2K),
  gold bars ($4K), a painting ($7K) or a diamond ($10K, only for a score of
  100). A perfect night is $50K.
- Once a night you can risk a door instead of taking the loot. You get one
  more answer: a rarer one trades up, anything else and the shutters come
  down on nothing.
- Once a night Chess (the cat) will give you the first letter of a decent
  answer. A door opened with a hint is marked in your shared result.
- A job gets harder as it goes: two broad questions (name a country, name a
  dog breed), one narrower list, one open prompt (name something you would
  find in a fridge), then a hard specialist list.
- Loot from the daily job goes into your stash, and the stash buys clothes
  for the cat. They do nothing. One of them only turns up some nights.
- Old jobs ("cold cases") can each be played once for fun. They pay nothing
  and do not count towards streaks or the rarity numbers.
- The daily job can be played once. Practice deals five random doors and
  does not count either.

## Running it locally

You need Node.js 22 or newer.

```
git clone https://github.com/k1k12/Lootle.git
cd Lootle
npm install
npm test       # checks the question bank, matching and rarity maths
npm run dev    # serves the game at http://localhost:8787
```

`npm run dev` keeps storage on your machine. The judge for open prompts
(below) runs on Cloudflare even in local development, so Wrangler asks you
to log in once with `npx wrangler login`. A free account is enough.

## How it is built

The site is a Cloudflare Worker. The front end is plain HTML, CSS and
JavaScript with no build step, and the sound effects are synthesised in the
browser rather than loaded from files.

| Path | What is in it |
| --- | --- |
| `public/` | The front end. `js/game.js` is the game, `js/art.js` draws the cat, her wardrobe and the loot as SVG. No answers. |
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

### The judge

Four doors in five are checked against a written list. The open prompts
("name something you would find in a fridge") cannot be: nobody can list
every sensible answer. So when an answer to an open prompt is not on the
list, the Worker asks a small language model on Workers AI one yes-or-no
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

Packs sit on four shelves in `src/seams/index.js`, and a five-door job takes
from each in order:

| Shelf | Doors | What goes on it |
| --- | --- | --- |
| `EASY` | 1 and 2 | Broad questions with 100 or more answers (`easy-NN.js`) |
| `MID` | 3 | Narrower lists (`pack-NN.js`, `vault-NN.js`, `mid-NN.js`) |
| `OPEN` | 4 | Prompts with no fixed list (`open-NN.js`) |
| `HARD` | 5 | Specialist lists (`hard-NN.js`) |

To stop a safe being dealt without breaking old jobs in the archive, add its
id to `RETIRED` in `src/seams/index.js` rather than deleting it.

Always add packs at the end. The schedule deals each pack in order, so
appending a pack never changes which doors earlier days had. Jobs 1 to 10 had seven safes and job 11 had ten doors. They are still dealt
the old way, so the archive plays as it did.

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
  to open prompts are marked wrong until the next day.
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
