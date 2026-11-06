# Review checklist

Run `npm run verify` and `npm run smoke` first. Then check:

- **Mobile and touch**
  - Works on iPhone SE (375×667) through 390×844, plus Chromium at 360×740.
  - Tap targets are at least 44px and inputs at least 16px (no iOS zoom).
  - There is no horizontal overflow.
  - In-card drags (Bloom, Story Shuffle) use `touch-action: none` and don't scroll the feed.
  - Safe areas and `100dvh` are respected, and nothing depends on hover.
- **Reduced motion:** with `prefers-reduced-motion`, there are no particles, shimmer or smooth scrolls; instant, calm fallbacks are used instead.
- **Old saves**
  - Existing `little-sparks-v1` and rewards data still load.
  - Retired indexes (7) and legacy shapes don't crash or count.
  - `credit` and `revealed` markers survive ↺.
  - Other days and levels are untouched.
- **Determinism and answers**
  - The same date and level always gives the same puzzle.
  - Each puzzle has exactly one answer, verified by brute force where possible.
  - Options are unique and include the answer, and the start state isn't already solved.
- **Rewards integrity:** reveals, replays and hints can't farm credit, streak, flow, stickers or milestones.
- **Wording**
  - No exam labels ("CAT", "Quant", "LRDI", "MCQ", "TITA"). Present cards as logical reasoning puzzles.
  - The note reads "Created with love from Devansh".
- **Photos:** only free licences (public domain or CC). Each has `credit`, `source` and `licenseUrl`, and hints never show the year.
- **Static app:** no build step, no script CDNs or frameworks, relative URLs only (GitHub Pages subpath).
- **Docs:** README, CONTENT and AGENTS are updated when rules, files or storage change.
