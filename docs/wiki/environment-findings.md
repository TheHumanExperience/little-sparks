# Environment findings

Gaps in tooling and conventions that make agents' work harder or let mistakes through. Each entry is dated; mark it resolved with a date and commit rather than deleting it. Related: [New games build](new-games-build.md).

- **2026-11-21, at `705bf3a`: Google Fonts breaks the "no CDNs" rule.** `dist/style.css` begins with an `@import` from fonts.googleapis.com, although AGENTS.md and REVIEW.md say no CDNs and relative URLs only. Fonts don't load offline. Open.
- **2026-11-21, at `705bf3a`: the smoke test isn't in CI.** `.github/workflows/pages.yml` runs only `verify*.cjs`, so a browser-only regression can reach the live site. Open.
- **2026-11-21, at `705bf3a`: `verify-sparks.cjs` takes about 65 s,** which slows `npm run verify` in every agent loop. Open.
- **2026-11-21: Playwright from worktrees.** `playwright` is installed once in the main checkout's `node_modules`. Node resolves packages by walking up directories, so worktrees under `.claude/worktrees/` find it without their own install.
