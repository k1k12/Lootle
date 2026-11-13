# Working on Lootle

## Branches

| Branch | Purpose |
| --- | --- |
| `main` | The live site. Releases only. |
| `dev` | The default branch. All work lands here first. |
| `type/short-name` | One branch per piece of work, created from `dev`. |

Branch prefixes match commit types: `feat/`, `fix/`, `chore/`, `docs/`, `ci/`.
Names are lowercase with hyphens, for example `feat/question-pack-3`.

## Commits

- Format: `type: short description`, lowercase, present tense, no full stop.
  Example: `feat: add spelling correction for answers`.
- Types: `feat`, `fix`, `chore`, `docs`, `ci`.
- One small idea per commit.
- Run `git status --short -uall` before `git add`. `.dev.vars` and
  `node_modules` must never appear.

## Pull requests

1. Branch from `dev`, commit in small pieces, push, open a PR into `dev`.
2. Title the PR in commit style.
3. Fill in the template: What, How I checked it, and `Closes #N` if there is
   an issue.
4. The `check` job must be green before merging.
5. Merge with a merge commit, not squash or rebase.

## Releases

1. Open a PR from `dev` into `main` titled `release: vX.Y.Z`.
2. Merge it with a merge commit.
3. Deploy from an up to date `main`: `git checkout main && git pull && npm run deploy`.
4. Tag it: `git tag -a vX.Y.Z -m "..."` on `main`, then push the tag, and
   publish a GitHub release from the tag with a short list of what changed.

New question packs change the daily line-up, so release them just after
midnight UTC.

## Safety

- Unpushed mistake: `git commit --amend` or `git reset`.
- Mistake already on `main` or `dev`: `git revert`. Never rewrite their history.
- Your own unmerged branch: tidy it, then push with `--force-with-lease`.
- Never backdate commits.

## Before you push

```
npm test
npx wrangler deploy --dry-run
```
