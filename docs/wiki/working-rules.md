# Working rules

Rules Devansh has given agents working on this repo. See also [Cleanup ledger](cleanup-ledger.md).

- **2026-11-21: delete artifacts as soon as their purpose is done.** Nothing an agent creates may stay in temp folders, scratchpads, caches or anywhere outside the deliverable. Screenshots, downloaded photos that were rejected, worktrees, installed browsers and `node_modules` are removed when no longer needed. Anything installed outside the repo is recorded in the [Cleanup ledger](cleanup-ledger.md) first.
- **2026-11-21: no persistent notes outside the repo.** This wiki lives in `docs/wiki/` and is committed; agents don't write to Claude's memory folder for this project.
- **2026-11-21: commit identity.** Commits in this repo use `Devansh Sanghvi <devanshns92@gmail.com>`, set in the repo's local git config. The global config holds a work address, which must never appear in this repo's history; one commit made with it was removed before pushing.
- **2026-11-21: push only when asked.** Pushes go through the `TheHumanExperience` GitHub account and trigger the GitHub Pages deploy.
