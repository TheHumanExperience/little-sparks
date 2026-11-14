# Design update spec: "Enough is enough"

Status: in progress (§1 and §2 built; the rest pending) · Written 2026-11-14 · Source: Impeccable critique of `dist/` (score 25/40)

## Progress

**Built (2026-11-14)**
- **§1 First run:**
  - `autofocus` is removed.
  - The name sheet opens about 2.8s after the first real solve, never on load.
  - There is no welcome card (see Decisions).
- **§2 Counts:**
  - The note card reads "Today's note" with no zero tally before any solve, and "You made it through today · n sparks today" once something is solved.
  - The reward line is hidden at zero.
  - The note card's content is centred.
  - The chip has no "×N streak".
  - The header pill no longer shows 🔑 (reveals left show in the Reveal confirm).
  - The "0/16" first paint is fixed.
  - The "n/20" counts stay everywhere else.
- **Tests:**
  - `tests/smoke.mjs` covers the first open (no sheet, no zeros on the note) and the name prompt after the first solve.
  - The Next / day-sheet test now uses today's dated order. It used to fail on days when the warm-up opener moved cards.

**Pending, in suggested order**

| # | Section | What | Size | Notes |
|---|---|---|---|---|
| 1 | §3 Day sheet | Style the rows like cards (≥ 48px, sage/paper); "Next puzzle to play" prefers today and uses the live card title | S–M | Keep the "n/20 ✦" counts (Decisions) |
| 2 | §7 Accessibility | Darker Reveal answer / ↺ / kicker; 44px header pills, ✕, Mirror cells, numpad; 9px labels → 11px; Caslon sheet titles; off-palette fixes | S | Closes DESIGN.md Known Drift items |
| 3 | §2a Reveal dots | Dots under "Reveal answer" for reveals left on Medium and Tricky | S | The limit stays |
| 4 | §4 Long cards | "more ↓" overflow cue, shorter How to play, credits after the solve, one Letterlight input on touch | M | |
| 5 | §5 Duplicates | One clear, one reveal path, "Next spark ↓" everywhere, "Solved ✦" after a solve | M | |
| 6 | §6 Reasoning voice | Drop "Aha ·", story titles, softer wrong-answer copy | M | Keep the five-card block together unless decided otherwise |
| 7 | §8 Level sheet | Segmented Gentle / Medium / Tricky, new help text, © line moved | S | Optional |
| 8 | Desktop margin note | Date and love line beside the card at ≥ 1024px | S | Optional, lowest priority |

When this is picked up, re-run `$impeccable critique` at the end. The target is ≥ 30/40.

## Why this update

The feed card, the photo cards and the love note already feel like the "Handwritten Note" in DESIGN.md. The weak spots are the surfaces between the cards. They break two product principles: *A gift before a product* and *Enough is enough*.

- The first thing Nidhi sees is a form. The leaderboard name sheet opens over the first card, and its input is autofocused, so the iOS keyboard comes up.
- Every summary counts what she hasn't done:
  - The note card says "You made it through today" above "0 of 20 sparks today".
  - The look-back sheet is 31 rows of `0/20`.
  - The solve chip says "×N streak".
- On phones, some cards hide their main button below the fold, and the scrollbars are hidden.
- The reasoning cards still sound like an aptitude test: "Aha · Logical reasoning", "Profit & Percentages".

This update is a **refinement**. It keeps the visual world, tokens, storage keys and puzzle logic. It changes no saved field and no generator.

## Goals

1. Open on warmth, not on a form.
2. Make counts celebrate what she did (never a row of zeros on the note card or a streak).
3. On a 360px phone, every card's main action can be reached and is clearly signposted.
4. Bring the day sheet and other sheets up to the same finish as the cards.
5. Fix the contrast and touch-target failures that DESIGN.md already lists as drift.

## Decisions after review (2026-11-14)

These override the sections below where they disagree.

- **Counts with totals stay.** Nidhi likes seeing her history and "20/20". The header pill ("Today · 3/20"), the solve chip ("✦ Solved 3/20"), the day sheet rows ("12/20 ✦") and the past-day intro cards keep their "n of 20". Only the "×N streak" wording is dropped from the chip.
- **No welcome card.** The app is shared with friends, so the first open goes straight to a card, with no personal note in front of it. The name prompt still waits until after the first solve.
- **Note card:** once something is solved it reads "You made it through today" and "3 sparks today". Before any solve it reads "Today's note", with no zero tally.
- **Reveal limit (5 on Medium, 3 on Tricky) and the leaderboard stay** as they are; see §2a.

## Out of scope

New games, new puzzle content, leaderboard scoring, palette or typeface changes, and the desktop layout. Desktop gets one note at the end.

---

## 1. First run: welcome before the name (P1)

**Now:**
- `askName()` (`dist/leaderboard.js:152`) runs on the first visit.
- `#lbName` has `autofocus` (`dist/index.html:82`).

**Change:**
- Remove `autofocus` from `#lbName`.
- Don't ask for her name on the first load. Ask the first time either of these happens, whichever comes first:
  - she solves a card for the first time (not a reveal);
  - she opens 🏆.
- Store "asked" in the existing `asked` field of `little-sparks-leaderboard-v1`, so returning players are never asked again. This adds no new key.
- With no leaderboard configured, nothing changes.
- Today's feed gets the same `.dayintro` card that past days already have. It is shown on the very first visit only, and it carries one line of the love note's voice, for example "A little play for today. One card is plenty."

**Done when:**
- A fresh profile on an iPhone-sized viewport opens on a card with no modal and no keyboard showing.
- The name prompt appears once, after the first real solve.

## 2. Count what was done, never what is left (P1)

| Surface | Now | Change |
|---|---|---|
| Note card eyebrow | Always "You made it through today" | If solved ≥ 1, keep it. If 0, show "Today's note" instead. |
| Note card tally (`feed.js` ~162) | "0 of 20 sparks today" and "0 shiny stickers · flow 0/5" | Show "n sparks today" only when n ≥ 1, without "/20". Show stickers and flow only when they are above 0. If everything is 0, show just the love note. |
| Solve chip (`feed.js:330`) | "✦ Solved n/20 ×N streak" | Show "✦ n today". Drop the streak suffix. The burst and chime can still build with `streak` internally; only the visible word goes. |
| Day sheet rows | "0/20" on every row | Show "n ✦" when n ≥ 1, and nothing when n is 0. Keep the full-day `.full` wash. |
| Header today pill | "0 of 20 solved, 5 reveals" | Show the solved count only, as "n ✦" or "Today" when it is 0. Reveals left show in the Reveal confirm. The daily limit itself stays (Nidhi asked for it); see §2a. |
| Header first paint | `index.html:31` hard-codes "0/16" | Render "Today" until JS fills in the count. |

The note card also loses its empty bottom 40%. Centre the content vertically, or add the "Why this exists" link and a small dated sign-off.

**Done when:** a profile with nothing played shows no "0", "/20" or "streak" anywhere in the header, note card, chip or day sheet.

## 2a. Reveal allowance, shown where it's used (proposed)

The 5 / 3 daily limit stays. Its count moves out of the header, where it read as a score, and next to the button it governs:

- The card-foot "Reveal answer" on Medium and Tricky gets a row of small pips under its label, one per reveal left. They are filled Wax Seal dots, and a used one is a hollow Pencil Line ring. The pips are decorative (`aria-hidden`); the button's `aria-label` says "Reveal answer, 4 left today".
- With none left, the button reads "Reveals rest until tomorrow" in Margin Note and stays tappable. Tapping it explains, gently, the same way the current message does.
- On Gentle (unlimited) there are no pips.

## 3. Day sheet: same finish as the cards (P1)

**Now:**
- The `#days button` rows (`style.css:2`, `:72`) render as native grey buttons about 27px tall.
- There are 31 rows with no grouping.
- "Next puzzle to play" can point to yesterday's card while today's cards are untouched, and it uses the old title "The Aha Moment".

**Change:**
- Restyle the rows as list items:
  - Fresh Sheet background, 1px Pencil Line border, 12px radius.
  - At least 48px tall.
  - Date on the left, in DM Sans 15px; solved count on the right, in tabular numerals.
  - Today keeps its Wax Seal "Today" marker.
- Group the rows under quiet weekday-range labels in the 11px uppercase Label style ("This week", "Last week", "Earlier"). The look-back stays 31 days.
- "Next puzzle to play" prefers the first unplayed card *today*, and only falls back to earlier days when today is done.
- It uses the card's live title, the same one as the feed `h2`.

**Done when:** at 360px every row is at least 48px tall, there are no browser-default buttons, and the next-puzzle label matches the card it opens.

## 4. Fit the card to the screen, and signpost overflow (P1)

Measured `.sparkinner` scroll height vs visible height:

| Card | Width | Scroll height | Visible height | What's below the fold |
|---|---|---|---|---|
| Time Lens | 390px | 1102 | 753 | "Check my year" and the card foot |
| Letterlight | 360px | 949 | 657 | Keyboard and card foot |
| Where in the World | 390px | 798 | 753 | Card foot |

**Change:**
- **Overflow cue.** When `.sparkinner` can scroll, show a soft Letter Paper fade at the bottom with a small "more ↓" in Margin Note. Hide it once the player scrolls to the end. Under reduced motion it is static.
- **How to play.** It is already a `<details>`. Once a game has been seen on any day, open it collapsed. Trim the Time Lens how-to to only the current level's mechanic.
- **Credits and licence lines** move from inside cards to the post-solve or reveal state, where they are still shown. Attribution stays visible, as CONTENT.md requires.
- **Letterlight** keeps one input path. On touch devices, hide the text field and Guess button and use the on-screen keyboard, so iOS doesn't open its own keyboard on top. Keep the field for hardware keyboards (`(pointer: fine)`). Size the keys to at least 32px wide at 360px.

**Done when:** at 390×844 and 360×740, every card either fits on one screen or shows the overflow cue, and no card's main action is hidden without a cue.

## 5. One way to do each thing (P2)

| Duplicate | Keep | Remove or merge |
|---|---|---|
| Clear: ↺ in the foot, plus "Clear mirrors" / "Clear my numbers" in the game | ↺ in the foot, which has Undo | The in-game clear buttons |
| Reveal: "Reveal one cell" plus "Reveal answer" | "A gentle hint" (no credit lost) and "Reveal answer" | Fold "Reveal one cell" into the hint button's behaviour on Killer Six |
| Next labels: "Next spark ↓" / "Next to play ↓" / "Next puzzle to play ✦" | "Next spark ↓" in the foot, and "Next puzzle to play" in the sheet | "Next to play ↓" becomes "Next spark ↓" |
| After a solve, "Check my answer" stays active | — | Disable the primary check button and relabel it "Solved ✦" |

The Killer Six lower zone goes from 12 controls to 9.

## 6. Reasoning cards in the gift's voice (P2)

- Drop `"Aha · "` from the eyebrow (`feed.js:31`). The eyebrow becomes "08 / 20 · Reasoning".
- Remove the "✦ Logical reasoning · 0 solved" badge. Its job is done by the eyebrow.
- Titles name the situation, not the syllabus. For example, "Profit & Percentages" becomes "Tanvi's gym fee", and "Is the Info Enough?" becomes "Enough to tell?". Each category generator returns a title from a small pool chosen with `rng(puzzleSeed(d)+'title')`, so it is deterministic and existing saves are unaffected.
- Feedback copy: replace "…which is wrong" with "Not quite. Look again at …", naming the clue to check.
- Separating the five-card block is a `FEED_PLAN` change and touches the "five Aha cards sit together" rule. **This needs Devansh's decision before it is built.**

## 7. Accessibility and drift fixes (P2)

| Item | Now | Change |
|---|---|---|
| `.revealbtn`, `.retry` (`style.css:295`, `:330`) | `#8a9586`, 3.1:1 | Margin Note `#6b7a67` → darken to `#5f6e5c` (≥ 4.8:1 on Fresh Sheet) |
| `.nextspark`, card kicker | `#6b7a67`, 4.49:1 | Same darker token |
| Header pills | 30–33px tall | Min 44px hit area (padding or `::before` hit-slop), visual size unchanged |
| Sheet close ✕ | 32×39 | 44×44 |
| Mirror Garden `.mcell` | 41–42px | 44px, or 4px gap that counts toward the target |
| Killer Six numpad | 40×45 at 360 | Min 44 wide; let the row wrap to 4+3 if needed |
| Killer Six cage sums, `.eyebrow` | 9px | 11px minimum |
| Sheet titles | Georgia 36px uppercase | Libre Caslon Display 26px, sentence case (closes DESIGN.md Known Drift #1) |
| Off-palette | `.duelyear` `#000a`, `.cell.absent` `#777e73`, `.toast` `#0003` | Fountain Ink alpha, Soft Stone / Faded Ink, Fountain Ink alpha |
| `.shinytag` gradient text | `background-clip:text` | Solid Wax Seal text; the holo stays on the card border only |
| `.photo-clue` left stripe | 3px border-left on rounded box | Linen panel, no side stripe |

Promote the colours used here to CSS variables in `:root`, as the first step of closing Known Drift #2. Only the tokens this update touches move into variables. There is no bulk refactor.

## 8. Level sheet (P3)

- Replace the 3-stop range slider with a three-button segmented control: Gentle / Medium / Tricky. Each button is at least 44px, and the selected one is Pressed Fern.
- `#difficulty` keeps its saved values (0/1/2) and the same storage key.
- Rewrite the stale help line ("Six word guesses, a compact Sudoku…"). Use one line per level that names how it *feels*.
- Move the © line to the bottom of the sheet in 11px Faded Ink, below a Pencil Line rule.

## Optional: desktop

At 1280px, the 560px card sits in empty paper. A quiet margin note could fill it: the day's date in Caslon, plus the love line. It would show only at ≥ 1024px. This is low priority.

---

## Build order

1. §2 Counts, and §1 First run. These are the smallest diffs with the largest emotional effect.
2. §3 Day sheet.
3. §7 Accessibility and drift.
4. §4 Overflow, and §5 Duplicates.
5. §6 Reasoning voice, without the `FEED_PLAN` change until it is decided.
6. §8 Level sheet.

## Verification

- `npm run verify` and `npm run smoke -- --shots` pass. Check the shots at 390 and 360 for every card × 3 levels.
- Fresh profile: no modal on load. No "0", "/20" or "streak" on the note card, chip, pill or day sheet.
- Old profile (copy a `little-sparks-v1` blob from before the change): every count matches the counts before the change.
- Re-run `$impeccable critique`. The target is ≥ 30/40, with heuristics 2, 4 and 8 each at 3 or above.
- Reduced motion: the overflow cue and the "Solved ✦" state have still fallbacks.

## Open decisions

1. Separate the five reasoning cards (§6), or keep them as one block?
2. ~~Keep the daily reveal allowance?~~ **Decided: keep it.** Nidhi asked for the limit. Design how it shows in §2a.
3. ~~Leaderboard?~~ **Decided: keep it as it is**, points included.
