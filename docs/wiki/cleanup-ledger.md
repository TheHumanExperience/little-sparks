# Cleanup ledger

Everything created outside the committed deliverable, so it can be removed once its purpose is done ([Working rules](working-rules.md)). Add a row before creating the thing; fill in "Removed" when it is gone.

| Added | What | Where | Why | Removed |
|---|---|---|---|---|
| 2026-11-21 | `node_modules/` (playwright 1.65.0) | repo root (gitignored) | `npm run smoke` | Kept by decision on 2026-11-21 ([Working rules](working-rules.md)) |
| 2026-11-21 | `chromium-1254`, `chromium_headless_shell-1254` | `~/Library/Caches/ms-playwright/` | Chromium for the smoke test | Kept by decision on 2026-11-21 |

Already there before 2026-11-21 and not ours to remove: `ffmpeg-1013` and `webkit-2388` in `~/Library/Caches/ms-playwright/`.

Agent worktrees under `.claude/worktrees/` are removed after their branch is merged into `new-games`.
