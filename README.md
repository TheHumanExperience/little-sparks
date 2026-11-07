# Little Sparks

A daily puzzle app laid out as a vertical, snap-scrolling feed, like Reels. Each full-screen card holds a game you can play right there. Today's 17 sparks come first (12 games plus a block of five Aha reasoning cards), then a short "you made it" note. After that the feed keeps going into yesterday, the day before, and so on back 30 days. Each earlier day is loaded as you reach it. Every solve sets off a short celebration: a sparkle burst, a card glow, a "Solved n/21" count-up, and a vibration on phones that support it. With reduced motion turned on, you get a calm glow instead.

Tap the Little Sparks logo at any time to go back to the first card of today.

### Small rewards while playing

- **Escalating celebrations.** Solves less than 15 minutes apart build a streak. Each streak step adds more confetti to the burst. You also get bigger celebrations at the 5th and 10th solve of a day and when all 17 are solved.
- **Chimes.** Each solve plays a soft chime made with the Web Audio API. Its pitch climbs a pentatonic scale as your streak grows, up to a streak of 10. The 🔔 button in the header mutes it, and that setting is saved. Sound only starts after your first tap or key press, which iOS requires.
- **Flow bar.** The thin bar under the header fills by 1 for each puzzle you solve without a hint, up to 5. The first hint you use on a puzzle drains 2, never below 0, and that puzzle can no longer add flow. When the bar is full, cards turn golden for the rest of the day and stay golden even if you use hints. The bar resets at midnight.
- **Shiny cards.** About 1 card in 20 has a holographic look. Which cards are shiny depends only on the date and the game, so reloading the page doesn't change them. Solving a shiny card gives you a sticker, shown in a toast and counted on the note card.
- **Leaderboard (optional).** 🏆 at the top right opens Day / Week / Month rankings. You pick a name once. Using the same name on another device shares one score (ignoring case and spaces). Each first solve earns Gentle 1 · Medium 3 · Tricky 5 points (reveals and replays earn none), in India time with weeks starting Monday. It needs a free Supabase project: see [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md). With the config empty it stays hidden.
- **Reveal answer.** A quiet "Reveal answer" button at the bottom-right of each card shows the full solution after a confirm.
  - Gentle has unlimited reveals. Medium allows 5 cards and Tricky 3 cards per calendar day, per level; the confirm and the header pill next to the solved count (e.g. `3/17 · 🔑 4`) both show how many are left.
  - A revealed card counts as revealed, not solved. It gives no solve credit, streak, flow, sticker or milestone, and drains the flow meter like a hint.
  - ↺ lets you replay a revealed card, but solving it still doesn't count. Showing the same card's answer again that day is free.
  - Usage is stored in the rewards storage as `reveals: { date, used: [[…], […], […]] }` and resets on a new day.
- **Clear & retry.** The ↺ button at the bottom-left of each card resets that puzzle for that day and level only.
  - If the puzzle isn't solved yet, it clears at once and an Undo button stays for 5 seconds.
  - If the puzzle is solved, you're asked to confirm first. Your solve stays counted, so the solve count, streak, flow, stickers and milestones don't change.
  - Solving it again shows a small "Solved again" celebration and awards nothing, and hints you use while replaying don't drain the flow bar.

With reduced motion turned on there's no confetti and no shimmer, and the logo jumps straight to the top instead of scrolling.

Flow, stickers and the mute setting are saved in `localStorage` under `little-sparks-rewards-v1`. Puzzle progress is saved under the existing `little-sparks-v1` key. After you clear a solved puzzle, it's stored as `{ credit: true }`.

The games, in feed order. Each level shows one game from each family, so Gentle, Medium and Tricky feel different:

| # | Gentle | Medium | Tricky |
|---|--------|--------|--------|
| 1 | Letterlight | Letterlight | Letterlight |
| 2 | Pocket Sudoku | Sudoku Six | Sudoku Six · Hard |
| 3 | Killer Six (easy) | Killer Six | Killer Six (hard) |
| 4 | Story Shuffle | Story Shuffle | Story Shuffle |
| 5–9 | **Aha track** (5 cards) | **Aha track** (5 cards) | **Aha track** (5 cards) |
| 10 | Dot & Match | Dot & Match | Dot & Match |
| 11 | Colour Alchemy | Colour Alchemy | Colour Alchemy |
| 12 | Bloom Trail | Bloom Trail 5×5 | Bloom Trail 5×5 |
| 13 | Time Lens | Time Lens | Time Lens |
| 14 | Mirror Garden | Mirror Garden | Mirror Garden |
| 15 | Letterlight Ladder | Letterlight Ladder | Letterlight Ladder |
| 16 | Little Neighbours | Neighbours Goal | Neighbours Goal |
| 17 | Time Lens Duel | Time Lens Duel | Time Lens Duel |

Each level has 17 cards. The families are set in `FEED_FAMILIES` in `dist/feed.js`. Starlines has been retired; old Starlines saves are simply ignored. Every card still gets harder from Gentle to Tricky, and progress is saved in the browser.

**The Aha track** replaces the old single Aha Moment card. Each day has five logical-reasoning cards, placed together as one block (cards 4–8) so the reasoning flow isn't broken up. They are drawn from ten categories that alternate between number puzzles and logic puzzles:

- Percentages and profit
- Arrangements
- Time, speed and distance
- Truth-tellers and liars
- Number puzzles
- Reading a table
- Ratio and mixtures
- 3×3 logic grids
- Pigeonhole and guarantee
- Clocks and calendars

Each date and level shows five consecutive categories from the ten, and the window rotates daily. Every question is generated in `dist/aha.js` from the date and difficulty. Its names and numbers are drawn fresh each time. A brute-force solver confirms the question has exactly one answer, and each question comes with a hint and a "why" explanation.

- **Formats.** Gentle and Medium are multiple choice. Tricky asks you to type the answer in a numeric field, or a name picker for grids and liars.
- **Skill badges.** A small badge on each card shows how many questions of that category you have solved.
- **Older saves.** Past days that have an old Aha Moment save in slot 3 still open the original puzzle.

**Swipe to draw.** In Bloom Trail and Bloom Trail 5×5 you can press a square and slide your finger (or mouse) across neighbouring squares to draw the trail. Sliding back onto the previous square undoes a step. Tapping squares one by one still works. The grid uses `touch-action: none`, so drawing never scrolls the feed.

**Sudokus finish themselves.** Pocket Sudoku, Sudoku Six, Sudoku Six · Hard and Killer Six celebrate the moment the last correct number goes in, with no "check" button. A full grid with a clash says so gently.

**Colour Alchemy always shows the match meter**, on every level.

**Story Shuffle moves, it doesn't swap.** Tap a card, then tap the spot it belongs in: the card slides there and the cards in between shift by one (moving card 4 to spot 2 gives 1, 4, 2, 3, 5, 6). You can also drag a card by its ⠿ grip; holding near the top or bottom edge scrolls the card so every spot is reachable. Only the grip has `touch-action: none`, so swiping on the story text still scrolls the feed. Cards glide into place, except with reduced motion. The hint slides one card into its correct place the same way.

Mobile browsers are the main target, and the feed was tested at 320, 360, 375 and 390 px wide:

- Each card is exactly one screen tall. Taller games scroll inside their own card, so in-card scrolling never moves the feed.
- The layout uses `100dvh`, falls back to `100vh` on older browsers, and stays clear of notches and home bars.
- Taps respond immediately and focusing an input never zooms the page.
- Tap targets are 44 px or larger.
- The vibration is skipped where the phone doesn't support it.

| File | Contents |
| --- | --- |
| `dist/app.js`, `dist/extras.js` | The original seven games |
| `dist/sparks.js` | The nine feed games |
| `dist/feed.js` | Feed, celebrations and rewards, clear & retry, day and level sheets, and midnight rollover |

## Run locally

Requires Python 3:

```sh
python3 -m http.server 8000 --directory dist
```

Open http://localhost:8000. No build or package installation is required.

## Validate puzzles

Requires Node.js:

```sh
for f in verify*.cjs; do node "$f"; done
```

Or run `npm run verify`. For a headless browser smoke test of every card at all three levels in WebKit and Chromium, run `npm install && npm run smoke` (it also tests the leaderboard against a mocked Supabase). Add `-- --shots` to save screenshots to `tests/shots/`; by default it saves them only on failure.

Contributors and coding agents should start with [AGENTS.md](AGENTS.md) and check [REVIEW.md](REVIEW.md) before handing off.

| Script | Checks |
| --- | --- |
| `verify-sparks.cjs` | The nine feed games plus Sudoku Six · Hard, every level, a full year of dates. Each puzzle must be deterministic, solvable by its own checker, unique where promised, and varied. For Story Shuffle it also checks that every accepted order is a valid permutation, that the canonical order is listed first, that the starting shuffle is never already solved, that a move inserts and shifts (4 → 2 gives 1, 4, 2, 3, 5, 6), and that repeated hints always finish the story. For Mirror Garden it checks every garden has exactly one solution, that solver effort rises Gentle < Medium < Tricky and is at least double the old generator, and that old saves keep their garden. For Killer Six on Tricky it checks there are no single-cell cages, at most 3 givens, and that naked singles alone stall; it prints the average givens, cages and how many fall to hidden singles. |
| `verify-aha.cjs` | Every Aha category at all three levels over 366 days. Each question must be deterministic, have exactly one answer (confirmed by brute force), have unique options that include the answer, and rarely repeat its wording within 61 days. Also checks the old slot-3 saves, the skill counts, and that clear & retry keeps credit. |
| `verify-feed.cjs` | Feed order, the 31-day window, and that `feed.js` does nothing on a page without the feed. |
| `verify-leaderboard.cjs` | Points 1/3/5, one claim per date × level × game, India-time day, Monday-week and month boundaries, the offline queue (round trip, pruning), name cleaning and escaping, same name = same player, the committed config being empty or a public publishable/anon key only, and that schema.sql keeps the same rules and lock-down. |
| `verify-assets.cjs` | Every local CSS/JS in `index.html` uses `?v=__BUILD__` and exists; the Pages workflow stamps the commit SHA in before upload, so returning visitors never get stale files. |
| `verify-rewards.cjs` | Which cards are shiny never changes, and about 5% of cards are shiny across 366 days. Also checks the flow-meter rules, burst and milestone sizes, the rising chime, that clear & retry only affects that one puzzle on that day and level, and the reveal limits (unlimited/5/3 per day, free re-reveal, refresh on a new day, revealed cards never count, every game's revealed state is complete). |

`dist/ladders.js` is generated. After editing the word list in `tools/build-ladders.cjs`, rebuild it:

```sh
node tools/build-ladders.cjs
```

## Original source history

The source files match Sites commit `bc750bf3ed629364f2c8761c1a031aba4b51758a`.
All four original commits, including their authors, timestamps and exact hashes, are preserved in `history/little-sparks-original.bundle`.

GitHub's connected API imported the current files as a new commit; the four original commits are inside the bundle, not ancestors of this repository's main branch. To restore them as a local branch:

```sh
git bundle verify history/little-sparks-original.bundle
git fetch history/little-sparks-original.bundle main:sites-history
git log sites-history
```

To make that original branch visible on GitHub, from an authenticated local clone:

```sh
git push origin sites-history
```

## Hosting and credits

The site is hosted on GitHub Pages at https://thehumanexperience.github.io/little-sparks/.
Every push to `main` runs the validation scripts and deploys `dist/` via `.github/workflows/pages.yml`.

The existing Sites hosting configuration is retained in `.openai/hosting.json`.
This GitHub copy is not automatically synchronized with future Sites changes.

Photo source links and credits are preserved in `dist/photos.js`. Third-party assets retain their applicable rights and attribution requirements.
