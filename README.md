# Little Sparks

A daily puzzle app laid out as a vertical, snap-scrolling feed, like Reels. Each full-screen card holds a game you can play right there. Today's 19 sparks come first (14 games plus a block of five Aha reasoning cards), then a short "you made it" note. After that the feed keeps going into yesterday, the day before, and so on back 30 days. Each earlier day is loaded as you reach it. Every solve sets off a short celebration: a sparkle burst, a card glow, a "Solved n/19" count-up, and a vibration on phones that support it. With reduced motion turned on, you get a calm glow instead.

Tap the Little Sparks logo at any time to go back to the first card of today.

### Small rewards while playing

- **Escalating celebrations.** Solves less than 15 minutes apart build a streak. Each streak step adds more confetti to the burst. You also get bigger celebrations at the 5th and 10th solve of a day and when all 20 are solved.
- **Chimes.** Each solve plays a soft chime made with the Web Audio API. Its pitch climbs a pentatonic scale as your streak grows, up to a streak of 10. The 🔔 button in the header mutes it, and that setting is saved. Sound only starts after your first tap or key press, which iOS requires.
- **Flow bar.** The thin bar under the header fills by 1 for each puzzle you solve without a hint, up to 5. The first hint you use on a puzzle drains 2, never below 0, and that puzzle can no longer add flow. When the bar is full, cards turn golden for the rest of the day and stay golden even if you use hints. The bar resets at midnight.
- **Shiny cards.** About 1 card in 20 has a holographic look. Which cards are shiny depends only on the date and the game, so reloading the page doesn't change them. Solving a shiny card gives you a sticker, shown in a toast and counted on the note card.
- **Leaderboard (optional).** 🏆 at the top right opens Day / Week / Month rankings. You pick a name once. Using the same name on another device shares one score (ignoring case and spaces). Each first solve earns Gentle 1 · Medium 3 · Tricky 5 points (reveals and replays earn none), in India time with weeks starting Monday. It needs a free Supabase project: see [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md). With the config empty it stays hidden.
- **Reveal answer.** A quiet "Reveal answer" button at the bottom-right of each card shows the full solution after a confirm.
  - Gentle has unlimited reveals. Medium allows 5 cards and Tricky 3 cards per calendar day, per level; the confirm and the header pill next to the solved count (e.g. `3/19 · 🔑 4`) both show how many are left.
  - A revealed card counts as revealed, not solved. It gives no solve credit, streak, flow, sticker or milestone, and drains the flow meter like a hint.
  - ↺ lets you replay a revealed card, but solving it still doesn't count. Showing the same card's answer again that day is free.
  - Usage is stored in the rewards storage as `reveals: { date, used: [[…], […], […]] }` and resets on a new day.
- **Clear & retry.** The ↺ button at the bottom-left of each card resets that puzzle for that day and level only.
  - If the puzzle isn't solved yet, it clears at once and an Undo button stays for 5 seconds.
  - If the puzzle is solved, you're asked to confirm first. Your solve stays counted, so the solve count, streak, flow, stickers and milestones don't change.
  - Solving it again shows a small "Solved again" celebration and awards nothing, and hints you use while replaying don't drain the flow bar.
- **Next puzzle to play.** Tap the today count in the header to open the day sheet. Its top button, "Next puzzle to play", names the next card that isn't solved yet, after the card you're on (older days next, then back round to today), and takes you there. Tapping a day opens its first card still to play. On a solved card, "Next spark ↓" becomes "Next to play ↓" and skips the solved cards in between. Revealed answers count as still to play. Day rows show only what's solved, never what's "left", so the archive never reads as a backlog. `feedNextUnsolved` in `dist/feed.js` finds the card; `verify-feed.cjs` and the smoke test check it.

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
| 15 | Lantern Lanes (5×5, bulb budget) | Lantern Lanes (6×6, numbers + budget) | Lantern Lanes (7×7, numbers) |
| 16 | Letterlight Ladder | Letterlight Ladder | Letterlight Ladder |
| 17 | Garden Beds (5×5) | Garden Beds (6×6) | Garden Beds (7×7, bigger beds) |
| 18 | Little Neighbours | Neighbours Goal | Neighbours Goal |
| 19 | Time Lens Duel | Time Lens Duel | Time Lens Duel |
| 20 | Where in the World (famous landmarks) | Where in the World (recognisable places) | Where in the World (everyday scenes) |

Each level has 20 cards. Where in the World joined on 10 November 2026, so earlier days keep their 19 cards and any day already finished stays finished (`FEED_SINCE` in `dist/feed.js`). The families are set in `FEED_FAMILIES` in `dist/feed.js`. Starlines has been retired; old Starlines saves are simply ignored.

**Lantern Lanes** is Light Up (Akari). Tap a square for a 💡; it lights its row and column until a wall stops it. Light every square, never let two bulbs see each other, and give each numbered wall exactly that many bulbs on its 4 sides (diagonals don't count). Tapping cycles bulb → dot ("no bulb here") → empty, and a long press drops a dot. How to play opens with that number rule in one line and a 3-step mini tutorial with tiny example boards. Numbers turn green when exact and red when over, lit squares glow, and clashing bulbs flash red. Gentle (5×5) has no numbers and exactly the fewest bulbs that can do it; Medium (6×6) adds some numbers and keeps the bulbs-left counter; Tricky (7×7) has fewer numbers and no counter. Every puzzle has exactly one answer.

**Time Lens** shows three archive photos. For each one you have 3 tries to guess the year, and a guess within 5 years (Gentle), 3 (Medium) or 2 (Tricky) counts as found. A miss says earlier or later, and roughly how far off it is. A year you've already tried uses no try. Find 2 of the 3 photos to complete the card. If you find fewer, the round ends as "not this time": it doesn't count, like a revealed answer, and you keep the stories.

**Time Lens Duel**: put three photos in order from oldest to newest, then pick the middle photo's decade. Only the right decade solves the card. A wrong decade is crossed out, tells you to go earlier or later, and you try again (★★★ first try, ★★ second, ★ after).

**Where in the World 🌍** shows one real photograph a day: which country was it taken in? Pick from four countries. Gentle shows famous landmarks, and its four countries come from four different continents. Medium shows recognisable places, with two countries from the same continent and one from elsewhere. Tricky shows everyday scenes, where the clues are writing on signs, clothes, buildings and landscape, and all four countries share a continent. The first hint gives the continent (on Tricky, the region too), and the second points at a clue in the photo. Gentle lets you keep picking until you find it. Medium and Tricky give two tries; running out ends the round as "not this time", which doesn't count. Credits and licences appear after each round.

**Garden Beds 🌷** is Rectangles (Shikaku) as a little allotment. Each number is a seed packet: mark out a bed with exactly that many squares around it, so every square is in a bed and every bed holds exactly one packet. Drag from corner to corner to mark a bed; a drag over an existing bed replaces it, and a tap on a bed clears it. Dragging on the board never scrolls the feed. A bed that fits fills with blooms (the flower depends on its size: 🌷 2, 🌼 3, 🌻 4, 🌸 5, 🌹 6…), and a bed that doesn't gets a red, wobbling frame (it stays still when reduced motion is on). How to play shows a 3×3 example where the 6 packet becomes a 2×3 bed. Gentle (5×5) uses beds of 2–4 squares, Medium (6×6) beds up to 6, and Tricky (7×7) bigger beds up to 9 with more decoy rectangles. Every garden has exactly one answer.

Every card still gets harder from Gentle to Tricky, and progress is saved in the browser.

**The Aha track** replaces the old single Aha Moment card. Each day has five logical-reasoning cards, placed together as one block (cards 5–9) so the reasoning flow isn't broken up. They are drawn from nineteen categories, mixing number puzzles and logic puzzles:

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
- Blood relations ("Pointing at a photo, Riya says…")
- Directions (walks, turns and morning/evening shadows)
- Cube painting (paint the outside, cut it up, count the pieces)
- Odd one out (numbers, number pairs and letter trios)
- Number series (find the next term)
- Coins and weighings (the fake coin, and balance weights)
- Matchsticks (move one stick to fix a seven-segment equation, drawn as a board)
- Tournaments (knockouts, leagues and who can still top the table)
- Is the info enough? (would statement 1, 2, either or both pin the answer down?)

Each date and level shows five consecutive categories from a fixed ring of all nineteen (`AHA_RING`, which alternates number and logic groups except at one wrap-around), and the window rotates daily, so every category comes up about equally often. Every question is generated in `dist/aha.js` from the date and difficulty. Its names and numbers are drawn fresh each time. A brute-force solver confirms the question has exactly one answer, and each question comes with a hint and a "why" explanation.

- **Formats.** Gentle and Medium are multiple choice. Tricky asks you to type the answer in a numeric field, or a name picker for grids and liars. Matchsticks has no options on any level, because they gave the answer away. You type the corrected equation instead. Spaces, −/–, ×/x/* and full-width signs all count the same, and only the one-move answer is accepted.
- **Skill badges.** A small badge on each card shows how many questions of that category you have solved.
- **Older saves.** Past days that have an old Aha Moment save in slot 3 still open the original puzzle. A date × level whose Aha cards were played before the ring grew to nineteen (saves with `aha: 1`, or no flag) keeps its original ten-category rotation and questions; new plays are stamped `aha: 2`.

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
| `dist/lanterns.js` | Lantern Lanes (state 22): generator, solver and renderer |
| `dist/beds.js` | Garden Beds (state 23): generator, solver and renderer |
| `dist/globe.js`, `dist/places.js`, `dist/places/` | Where in the World (state 24): country table, options, renderer; generated photo list and photos |
| `dist/aha.js` | The Aha track: 19 logical-reasoning categories with brute-force solvers |
| `dist/feed.js` | Feed, celebrations and rewards, clear & retry, day and level sheets, and midnight rollover |
| `dist/leaderboard.js`, `dist/leaderboard-config.js` | The optional Supabase leaderboard |
| `dist/favicon.svg`, `dist/favicon-32.png`, `dist/apple-touch-icon.png` | Browser-tab and iPhone home-screen icons |
| `brand/` | Logo masters and exports (not deployed) |

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

Contributors and coding agents should start with [AGENTS.md](AGENTS.md) and check [REVIEW.md](REVIEW.md) before handing off. Who the app is for and what it must protect are in [PRODUCT.md](PRODUCT.md), and its visual system is in [DESIGN.md](DESIGN.md).

| Script | Checks |
| --- | --- |
| `verify.cjs` | The original daily sets over 366 days: unique Sudoku, valid full garden paths, solvable dominoes and correct logic choices. |
| `verify-extras.cjs` | Little Neighbours and Time Lens over 365 days: solvable targets, the full photo round and resume, misses that nudge earlier or later, a repeated year using no try, 1 of 3 found ending as missed and 2 of 3 completing the card with no points, daily-five isolation, and sandbox moves preserving inventory. |
| `verify-levels.cjs` | Re-runs `verify.cjs` and `verify-extras.cjs` at every level, then checks separate level progress, legacy progress, difficulty persistence, clues, anchors and word attempts. |
| `verify-window.cjs` | The 61-day content windows at all levels, active and retired photos, history-shaping and Indian photo days, unique words and questions, save continuity, and the 30-day archive. |
| `verify-words.cjs` | Letterlight guess handling and keyboard feedback, plus the answer list: all valid guesses, none rare or plural, no repeat within 365 days per level, and started puzzles keeping their word. |
| `verify-sparks.cjs` | The nine feed games plus Sudoku Six · Hard, every level, a full year of dates. Each puzzle must be deterministic, solvable by its own checker, unique where promised, and varied. For Story Shuffle it also checks that every accepted order is a valid permutation, that the canonical order is listed first, that the starting shuffle is never already solved, that a move inserts and shifts (4 → 2 gives 1, 4, 2, 3, 5, 6), and that repeated hints always finish the story. For Mirror Garden it checks every garden has exactly one solution, that solver effort rises Gentle < Medium < Tricky and is at least double the old generator, and that old saves keep their garden. For Killer Six on Tricky it checks there are no single-cell cages, at most 5 givens, that naked singles alone stall and that hidden singles always finish it, and that games started on the first Tricky generator keep their puzzle; it prints the average givens, cages and how many fall to hidden singles. |
| `verify-lanterns.cjs` | Lantern Lanes at every level over 366 days: deterministic, varied, solved by its stored answer and by nothing else (solver-checked), Gentle's budget is the true minimum, numbers and counter per level, solver effort rising Gentle < Medium < Tricky, the clash and number rules, the tutorial and reveal. |
| `verify-beds.cjs` | Garden Beds at every level over 366 days: deterministic, varied, packet sizes per level, solved by its stored beds and by nothing else (solver-checked), Gentle never needs a guess, solver effort and decoy beds rising Gentle < Medium < Tricky, the bed verdicts, the How to play example, and reveal. |
| `verify-aha.cjs` | Every Aha category at all three levels over 366 days. Each question must be deterministic, have exactly one answer (confirmed by brute force), have unique options that include the answer, and rarely repeat its wording within 61 days. Also checks no exam labels, the old slot-3 saves, that days played before the 19-category ring keep their original rotation, the skill counts, and that clear & retry keeps credit. |
| `verify-places.cjs` | Where in the World: every photo has a free licence, a credit, a clue and a story, and its country is in the table; no photo repeats within 31 days at a level; 3 levels × 366 days are deterministic, with four distinct countries graded by level and the answer exactly once; tries, misses, hints and pinned saves. |
| `verify-feed.cjs` | Feed order, the 31-day window, and that `feed.js` does nothing on a page without the feed. |
| `verify-leaderboard.cjs` | Points 1/3/5, one claim per date × level × game, India-time day, Monday-week and month boundaries, the offline queue (round trip, pruning), name cleaning and escaping, same name = same player, the committed config being empty or a public publishable/anon key only, and that schema.sql keeps the same rules and lock-down. |
| `verify-assets.cjs` | Every local CSS, JS and icon reference in `index.html` uses `?v=__BUILD__` and exists; the Pages workflow stamps the commit SHA in before upload, so returning visitors never get stale files. |
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

The site is live at https://little-sparks.in and hosted on GitHub Pages. Every push to `main` runs the validation scripts and deploys `dist/` via `.github/workflows/pages.yml`.

- **Domain:** DNS is managed at GoDaddy: four `A` and four `AAAA` records on `@` point to GitHub Pages, and `www` is a CNAME to `thehumanexperience.github.io`. A `_github-pages-challenge-TheHumanExperience` TXT record keeps the domain verified, so leave it in place.
- **Custom domain setting:** it lives in the repository's Settings → Pages. Deploys go through GitHub Actions, so there is no `CNAME` file.
- **Old address:** https://thehumanexperience.github.io/little-sparks/ redirects to the domain.
- **Saved progress:** browsers keep it per site address, so anything saved on the old address did not move to the domain. Changing the address again would strand progress the same way.

The existing Sites hosting configuration is retained in `.openai/hosting.json`.
This GitHub copy is not automatically synchronized with future Sites changes.

Photo source links and credits are preserved in `dist/photos.js`. Third-party assets retain their applicable rights and attribution requirements.

## Copyright

© 2026 Devansh Sanghvi. All rights reserved. This code is public so it can be viewed, but it isn't open source: see [LICENSE](LICENSE) for what that covers and for the third-party material it excludes.
