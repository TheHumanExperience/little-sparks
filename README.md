# Little Sparks

A daily puzzle app laid out as a vertical, snap-scrolling feed, like Reels. Each full-screen card holds a game you can play right there. Today's 17 sparks come first, then a short "you made it" note. After that the feed keeps going into yesterday, the day before, and so on back 30 days. Each earlier day is loaded as you reach it. Every solve sets off a short celebration: a sparkle burst, a card glow, a "Solved n/17" count-up, and a vibration on phones that support it. With reduced motion turned on, you get a calm glow instead.

Tap the Little Sparks logo at any time to go back to the first card of today.

### Small rewards while playing

- **Escalating celebrations.** Solves less than 15 minutes apart build a streak. Each streak step adds more confetti to the burst. You also get bigger celebrations at the 5th and 10th solve of a day and when all 17 are solved.
- **Chimes.** Each solve plays a soft chime made with the Web Audio API. Its pitch climbs a pentatonic scale as your streak grows, up to a streak of 10. The 🔔 button in the header mutes it, and that setting is saved. Sound only starts after your first tap or key press, which iOS requires.
- **Flow bar.** The thin bar under the header fills by 1 for each puzzle you solve without a hint, up to 5. The first hint you use on a puzzle drains 2, never below 0, and that puzzle can no longer add flow. When the bar is full, cards turn golden for the rest of the day and stay golden even if you use hints. The bar resets at midnight.
- **Shiny cards.** About 1 card in 20 has a holographic look. Which cards are shiny depends only on the date and the game, so reloading the page doesn't change them. Solving a shiny card gives you a sticker, shown in a toast and counted on the note card.
- **Clear & retry.** The ↺ button at the bottom-left of each card resets that puzzle for that day and level only.
  - If the puzzle isn't solved yet, it clears at once and an Undo button stays for 5 seconds.
  - If the puzzle is solved, you're asked to confirm first. Your solve stays counted, so the solve count, streak, flow, stickers and milestones don't change.
  - Solving it again shows a small "Solved again" celebration and awards nothing, and hints you use while replaying don't drain the flow bar.

With reduced motion turned on there's no confetti and no shimmer, and the logo jumps straight to the top instead of scrolling.

Flow, stickers and the mute setting are saved in `localStorage` under `little-sparks-rewards-v1`. Puzzle progress is saved under the existing `little-sparks-v1` key. After you clear a solved puzzle, it's stored as `{ credit: true }`.

The games, in feed order:

1. Letterlight
2. Starlines
3. Pocket Sudoku
4. Story Shuffle
5. Dot & Match
6. Colour Alchemy
7. The Aha Moment
8. Mirror Garden
9. Bloom Trail
10. Sudoku Six
11. Time Lens
12. Letterlight Ladder
13. Little Neighbours
14. Bloom Trail 5×5
15. Killer Six
16. Time Lens Duel
17. Neighbours Goal

All 17 games have three difficulty levels and hints, and progress is saved in the browser.

Mobile browsers are the main target, and the feed was tested at 320, 360, 375 and 390 px wide:

- Each card is exactly one screen tall. Taller games scroll inside their own card, so in-card scrolling never moves the feed.
- The layout uses `100dvh`, falls back to `100vh` on older browsers, and stays clear of notches and home bars.
- Taps respond immediately and focusing an input never zooms the page.
- Tap targets are 44 px or larger.
- The vibration is skipped where the phone doesn't support it.

| File | Contents |
| --- | --- |
| `dist/app.js`, `dist/extras.js` | The original seven games |
| `dist/sparks.js` | The ten feed games |
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

| Script | Checks |
| --- | --- |
| `verify-sparks.cjs` | The ten feed games, every level, a full year of dates. Each puzzle must be deterministic, solvable by its own checker, unique where promised, and varied. |
| `verify-feed.cjs` | Feed order, the 31-day window, and that `feed.js` does nothing on a page without the feed. |
| `verify-rewards.cjs` | Which cards are shiny never changes, and about 5% of cards are shiny across 366 days. Also checks the flow-meter rules, burst and milestone sizes, the rising chime, and that clear & retry only affects that one puzzle on that day and level. |

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
