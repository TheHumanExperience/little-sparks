# Little Sparks — agent guide

**Intent.** A cosy daily puzzle gift for Nidhi. The love note reads exactly "Created with love from Devansh". Keep the tone warm and calm: no exam or test language, no pressure, no ads. It is mobile-first (iOS Safari is the main target) and is a static, zero-build app in `dist/`. It is served from the GitHub Pages subpath, so use relative URLs only, with no CDNs or frameworks.

Read this file first. Open README.md (player-facing rules) or CONTENT.md (content rules) only when you need them.

## Commands
```sh
npm run verify                         # all verify*.cjs (CI runs the same loop); verify-sparks takes about 65s
npm i && npm run smoke                 # headless WebKit + Chromium smoke test of every card × 3 levels
npm run smoke -- --shots               # add screenshots to tests/shots/ (gitignored); default = only on failure
python3 -m http.server 8000 --directory dist   # manual run
node tools/build-ladders.cjs           # rebuild dist/ladders.js after editing its word list
python3 tools/check-photos.py          # validate photo files and credits (needs Pillow)
```
Prefer `npm run smoke` over manual screenshots. Take screenshots only when a human must see a visual change.

## File map
| File | Role |
|---|---|
| `dist/index.html` | Shell: header (brand, today pill, sound, level), `#feed`, level and day sheets. Script order matters. Every local CSS/JS is referenced as `file?v=__BUILD__` (CI stamps the commit SHA; checked by verify-assets). |
| `dist/app.js` | Minified core: `LEVELS`, `difficulty`, storage (`all`, `persist`, `state`), `rng`/`shuffle`/`puzzleSeed`, games 0–4 (`games` array). |
| `dist/daily-content.js` | Day-indexed content windows (`calendarIndex`, `freshContent`, `wordAnswer`). |
| `dist/photos.js` | `PHOTO_BANK` (credits, licences, clues). `retired: true` entries stay for old saves. |
| `dist/extras.js` | Games 5 (Time Lens) and 6 (Little Neighbours); `photoSet`. |
| `dist/stories.js` | Story Shuffle stories with `accepted` beat orders. |
| `dist/ladders.js` | Generated word-ladder routes (do not hand-edit). |
| `dist/sparks.js` | Games 8–16 and 21 (`SPARKS[i]`): pure `*Model(d)` generators plus renderers. |
| `dist/lanterns.js` | Lantern Lanes (`SPARKS[22]`): `lanternModel(d,lvl)`, `lanternSolve`, `lanternCheck`, renderer. Loaded after sparks.js. |
| `dist/aha.js` | Logical-reasoning track: `AHA_SLOTS = [3,17,18,19,20]`, category generators, `ahaModel(d,slot)`, legacy Aha card. |
| `dist/feed.js` | Feed (`FEED_PLAN`, `FEED_FAMILIES`), live card, celebrations, rewards, flow, shiny cards, ↺ clear, Reveal answer. |
| `dist/leaderboard.js`, `dist/leaderboard-config.js` | Optional Supabase leaderboard (🏆, name sheet, offline queue, same name = same player). Config holds the live project URL and its public `sb_publishable_` key (sent only as `apikey`, never as Bearer); never commit a secret/service_role key. Empty config hides it. Tests stub the config and never call the live project. Schema: `supabase/schema.sql`, setup: `docs/SUPABASE_SETUP.md`. |
| `dist/style.css` | All styles; respects `prefers-reduced-motion`. |
| `dist/valid-words.js`, `WORD-LIST-LICENSE.txt` | Word list for Letterlight and Ladder validation. |
| `verify*.cjs` | Node vm checks (see the README table). `tests/smoke.mjs` is the browser smoke test. |
| `tools/` | Offline content tools. `history/*.bundle` holds the original Sites commits (archival). |

## Game registry (state index → game)
0 Letterlight · 1 Pocket Sudoku · 2 Dot & Match · 3 Aha (legacy single card / track slot 0) · 4 Bloom Trail · 5 Time Lens · 6 Little Neighbours · 7 *retired (Starlines; ignore old saves)* · 8 Story Shuffle · 9 Colour Alchemy · 10 Mirror Garden · 11 Sudoku Six · 12 Killer Six · 13 Letterlight Ladder · 14 Bloom Trail 5×5 · 15 Time Lens Duel · 16 Neighbours Goal · 17–20 Aha track slots 1–4 · 21 Sudoku Six · Hard · 22 Lantern Lanes.

- **Feed order** comes from `FEED_PLAN` in feed.js. It has 18 cards per level (Lantern Lanes, 22, sits right after Mirror Garden), and the five Aha cards sit together as one block.
- **Families:** one game per level (`FEED_FAMILIES`), as [Gentle, Medium, Tricky]:
  - sudoku: [1, 11, 21]
  - killer: [12, 12, 12] (Killer Six on every level, graded by `killerSixModel`; placed right after sudoku)
  - bloom: [4, 14, 14]
  - neighbours: [6, 16, 16]
- **Add a game:**
  1. Write a pure `xModel(d)` that is seeded from `puzzleSeed(d)` and reads `difficulty`, plus a renderer that draws into `#rules/#board/#feedback/#actions` and calls `sparkSolved()`.
  2. Register it as `SPARKS[n]` with the next unused index (never reuse 7).
  3. Add it to `FEED_PLAN`.
  4. Add a reveal branch in `revealState` (feed.js).
  5. Add checks for it in verify-sparks.cjs (or its own verify file, like verify-lanterns.cjs) and update the expected card counts in verify-feed.cjs.
- **Remove a game:** take it out of `FEED_PLAN` and its code, and retire its index forever. Old saves must load harmlessly and must not count.

## Levels, storage and migration
- Levels are 0 Gentle, 1 Medium, 2 Tricky (`little-sparks-difficulty`). Progress lives in `little-sparks-v1` as `all[progressKey(d)].games[i]`. Medium uses the bare date as its key; the other levels use `d-level-N`.
- The leaderboard lives in `little-sparks-leaderboard-v1`: `{id, name, synced, asked, sent, queue}`. Names are saved only through `join_or_create(p_from, p_name)`: a name matching another player (ignoring case and spaces) switches this device to that id, keeping `queue`/`sent`. Schema changes: `supabase/schema.sql` (safe to re-run), and a one-time wipe in `supabase/reset.sql`. Points (1/3/5) come only from feed.js's first-solve branch (`lbSolved`), never from reveals or replays.
- Rewards live in `little-sparks-rewards-v1`: `{muted, flow, stickers, reveals:{date, used:[[],[],[]]}}`.
- Never rename keys or change the meaning of saved fields. Migrate by reading old shapes, for example:
  - Story Shuffle `order`.
  - The legacy Killer save without `hard`.
  - The legacy Mirror Garden save (mirrors placed or solved) without `v2`.
  - The legacy Aha card at index 3 (`ahaLegacy`).
  - Time Lens `photoIds`; its old `answers[].points` are ignored (Time Lens has no score).
- Markers:
  - `{credit:true}` means solved before a ↺ clear; it still counts.
  - `{revealed:1}` means the answer was revealed; it never counts, even after a re-solve.
  - `feedDone` is the single source of "counts as solved".
- Retired photos stay while saves inside the 31-day archive might reference them (they were retired on 2026-11-02).

## Determinism rules
- Every puzzle is a pure function of (date, difficulty). Use `rng(puzzleSeed(d)+'tag')` and never `Math.random` for content.
- Archive days (`FEED_DAYS = 31`) must regenerate the same puzzle forever. Change a generator only behind a versioned seed tag or a save-shape check, so that existing saves stay valid.
- Answers must be unique (brute-forced in verify), options must include the answer exactly once, and the starting state must not already be solved.
- Shiny cards (~5%) are deterministic per date and game.

## Workflow
- Use plain, descriptive commit subjects (see `git log`).
- Do not push unless asked. Before committing, run `npm run verify` and `npm run smoke`. Use REVIEW.md before handing off.
