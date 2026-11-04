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

## Feed games

Like the original games, the ten feed games are built from the date and the difficulty level, so past days look the same every time you open them.

- **Starlines** draws from the 18 constellations in `dist/constellations.js`. Every clue must lead to only one star, and `verify-sparks.cjs` checks that.
- **Story Shuffle** draws from the 22 stories in `dist/stories.js`.
  - There are no clue lines. The order has to come from the story text itself, so each beat needs natural time and cause cues ("That evening…", "Once it's baked…").
  - Each story has an `accepted` list of orders. The canonical order comes first. Add other orders only when two middle beats really could happen either way round (for example Paper boat, Garden swing and Moving in).
  - Any accepted order solves the puzzle.
  - Tricky hides the card titles, so the cues must still work from the body text alone.
  - On Gentle and Medium, "Check order" says how many cards are in a sensible place. On Tricky it says how many opening cards read right.
  - The hint moves one card into its correct place.
- **Letterlight Ladder** uses `dist/ladders.js`, which holds 90 shortest-route ladders per level. Every step must be an everyday word.
- **Colour Alchemy** works through a shuffled cycle of every recipe at the day's level:

  | Level | Drops | Recipes |
  | --- | --- | --- |
  | Gentle | 2–4 | 15 |
  | Medium | 3–6 | 35 |
  | Tricky | 4–7 | 124 |

- **Mirror Garden**, **Sudoku Six**, **Killer Six**, **Bloom Trail 5×5** and **Neighbours Goal** are generated from scratch each day.
- **Time Lens Duel** reuses the Time Lens photo bank in `dist/photos.js`.
- Shiny cards are picked with `rng(`${date}|shiny|${game}`)() < 0.05`, so the same cards are shiny every time you load a day. Changing that formula changes which past cards are shiny.
- The feed counts all 21 cards for each day: 16 games plus five Aha track cards, generated in `dist/aha.js`. The original five games keep their own progress records, so older saves still work.

Run `node verify-window.cjs`, `node verify-levels.cjs` and `node verify-sparks.cjs` before changing the generators or the content banks.

## Photographs

`dist/photos.js` is the canonical image manifest. Every referenced image is bundled under `dist/photos/`; gameplay does not depend on Wikimedia or NASA image servers being available. Commons previews may be resized/re-encoded for delivery; no substantive image changes are intended. Original source pages and licence links remain attached to each entry.

Do not overwrite the manifest with the old six-photo starter script. `prepare_photos.py` now verifies the full local collection instead.
