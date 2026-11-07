# Daily content and archive

- The archive offers today plus the previous 30 calendar days.
- Date-based generators supply future daily puzzles without a server job.
- Letterlight cycles through a fixed shuffled word list; no word repeats within a 61-day window at one difficulty.
- Reasoning uses eight templates with date-specific values, hints, and worked answers. Templates recur; the questions vary.
- Sudoku, dominoes, and Little Neighbours are generated from the date and difficulty. Bloom Trail rotates through full paths with distinct clue layouts, without repeats within 61 days at each difficulty.
- Time Lens uses 183 active local photos in a fixed 61-day cycle, three per day: one history-shaping photo (`iconic: true`, for example the first flight, the Solvay Conference, Earthrise, independence in 1947, Kargil, Chandrayaan-3), one Indian-context photo and one more scene, shown in a shuffled order. No image repeats within any 61 consecutive dates for newly started rounds. The same date uses the same photos across difficulty levels; the clues change.
- Time Lens has no points or score: each reveal just shows how many years away the guess was. Time Lens hints never give a year. Every active photo has a curated `clue` (required by `verify-window.cjs`), shown at every level. Easy adds a "world back then" line for the photo's decade (`ERA_DECADE` in `dist/extras.js`), Medium adds a broader generation line (`ERA_GENERATION`, 25-year bands), and Hard adds nothing. `verify-window.cjs` checks that these lines cover every active photo and contain no digits.
- Photos judged inappropriate are deleted outright (entry and image) and listed in `REMOVED_PHOTOS` in `dist/extras.js` with a same-year active stand-in, so saves that name them still load with the same answer. Removed so far: "Chema women (1930)" (Basel Mission ethnographic portrait), replaced by C. V. Raman's Nobel-year photo (1930, also in its legacy slot); the Copley Square streetcars (1920) were brought back from retirement to keep 183 active photos.
- The photo cycle repeats after 61 days. It is not an indefinitely growing archive.
- Started puzzles preserve their old words, reasoning, and saved photo IDs. Those legacy photo sets may repeat images from the new schedule. Weaker entries are marked `retired: true` rather than deleted, so saved IDs still resolve; retired photos never enter new rounds.
- Source catalogue dates, creator credits, and applicable licence links appear after guessing. Historical catalogue dates are not independently authenticated dates.
- Progress stays in browser-local storage. It is not shared between devices.

## Feed games

Like the original games, the nine feed games are built from the date and the difficulty level, so past days look the same every time you open them.

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

- **Mirror Garden**, **Sudoku Six**, **Sudoku Six · Hard**, **Killer Six**, **Bloom Trail 5×5** and **Neighbours Goal** are generated from scratch each day.
- **Mirror Garden** (`mirrorModel`) grows to 5×5 / 6×6 / 7×7 with 3 / 4 / 5 mirrors and 1 / 3 / 5 stones. Every garden has exactly one way to light all the flowers (checked by `mirrorSolve`), and of several unique candidates the day keeps the one the solver works hardest on. Average solver nodes over 2026 went from 18 / 42 / 104 to about 49 / 153 / 580; before, only 311 and 300 of 366 Medium and Tricky gardens were unique. Gardens already started on the old generator keep it (`savedMirror`, `legacyMirrorModel`).
- **Killer Six on Tricky** uses its own generator (`hardKillerModel`): cages of 3–4 cells (never a single cell), at most 2 given digits when possible (never more than 3), a unique solution, and naked singles alone never finish it. Over 2026 it averages about 1.6 givens and 10 cages; Gentle and Medium keep the original generator; Gentle starts from 12 givens and keeps adding until naked singles alone finish it (about 13 givens), Medium averages about 8.6.
- **Sudoku Six · Hard** (Tricky only, `hardSixModel`) strips clues to a minimal unique grid (at most 11, about 9.7 on average, against 11 for Sudoku Six on Tricky before) and keeps only grids that naked singles alone can't finish; about 1 in 9 days also needs more than hidden singles. Tricky Killers started before this change keep their original puzzle (`savedKiller`).
- **Time Lens Duel** reuses the active Time Lens photos in `dist/photos.js`, always includes at least one history-shaping photo and never uses today's Time Lens photos. A started Duel pins its photo IDs; Duels saved before pinning use the original 183-photo model (`legacyDuelModel`).
- Shiny cards are picked with `rng(`${date}|shiny|${game}`)() < 0.05`, so the same cards are shiny every time you load a day. Changing that formula changes which past cards are shiny.
- The feed counts 17 cards for each day and level: 12 games (one per family: Pocket Sudoku / Sudoku Six / Sudoku Six · Hard, Killer Six on all three, Bloom Trail / 5×5 / 5×5, Little Neighbours / Neighbours Goal / Neighbours Goal) plus five Aha track cards in one block, generated in `dist/aha.js`. The original five games keep their own progress records, so older saves still work.

Run `node verify-window.cjs`, `node verify-levels.cjs` and `node verify-sparks.cjs` before changing the generators or the content banks.

## Photographs

`dist/photos.js` is the canonical image manifest. Every referenced image is bundled under `dist/photos/`; gameplay does not depend on Wikimedia or NASA image servers being available. Commons previews may be resized/re-encoded for delivery; no substantive image changes are intended. Original source pages and licence links remain attached to each entry.

Entry fields: `image`, `year`, `title`, `alt`, `story`, `credit`, `source`, `licenseUrl`, `sourceDate`, `india`, plus `clue` (required for active photos; shown before the guess and must not contain a year), optional `iconic`, `why` (one-line "why it mattered", shown after the guess) and `retired`. Keep the first 183 entries in their original order (legacy schedules depend on it) and append new photos. Only freely licensed images (public domain, CC0, CC BY, CC BY-SA, GODL-India, Flickr Commons no known restrictions) are allowed; press-agency photos (AP, Reuters, Getty, etc.) and fair-use files are not. `tools/fetch-historic.py` checks the Commons licence, then downloads and resizes an image (800 px, JPEG q80) and prints its credit metadata.

Do not overwrite the manifest with the old six-photo starter script. `python3 tools/check-photos.py` verifies the full local collection instead (needs Pillow).
