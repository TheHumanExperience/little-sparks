# Daily content and archive

- The archive offers today plus the previous 30 calendar days.
- Date-based generators supply future daily puzzles without a server job.
- Letterlight cycles through a fixed shuffled word list; no word repeats within a 61-day window at one difficulty.
- Reasoning uses eight templates with date-specific values, hints, and worked answers. Templates recur; the questions vary.
- Sudoku, dominoes, and Little Neighbours are generated from the date and difficulty. Bloom Trail rotates through full paths with distinct clue layouts, without repeats within 61 days at each difficulty.
- Time Lens uses 183 local photos in a fixed 61-day cycle, three per day, with at least one Indian-context photo. No image repeats within any 61 consecutive dates for newly started rounds. The same date uses the same photos across difficulty levels; the clues change.
- The photo cycle repeats after 61 days. It is not an indefinitely growing archive.
- Started puzzles preserve their old words, reasoning, and saved photo IDs. Those legacy photo sets may repeat images from the new schedule.
- Source catalogue dates, creator credits, and applicable licence links appear after guessing. Historical catalogue dates are not independently authenticated dates.
- Progress stays in browser-local storage. It is not shared between devices.

Run `node verify-window.cjs` and `node verify-levels.cjs` before changing the generators or photo bank.

## Photographs

`dist/photos.js` is the canonical image manifest. Every referenced image is bundled under `dist/photos/`; gameplay does not depend on Wikimedia or NASA image servers being available. Commons previews may be resized/re-encoded for delivery; no substantive image changes are intended. Original source pages and licence links remain attached to each entry.

Do not overwrite the manifest with the old six-photo starter script. `prepare_photos.py` now verifies the full local collection instead.
