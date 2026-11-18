# New games spec: retire Time Lens, add Last Petal, Code Garden and Who Knows?

Status: ready to build · Written 2026-11-19 · Owner: Devansh

Read `AGENTS.md` first (especially "Add a game", "Remove a game", "Determinism rules" and the storage rules), then `CONTENT.md`. This spec doesn't repeat those rules; it says how they apply here.

## Why

Time Lens (game 5) and Time Lens Duel (game 15) don't earn their place. Dating old photographs is mostly guesswork, the Duel's "which came first" can feel unfair, and the photos aren't interesting enough to carry a card. The day already has plenty of words, number grids, spatial paths and textbook reasoning. What it lacks is thinking that the other cards never ask for:

- **Outthinking an opponent** (game theory) → **Last Petal**
- **Reasoning from feedback**, ruling possibilities out until one is left → **Code Garden**
- **Reasoning about what other people know** → **Who Knows?** as a new Aha category

Where in the World stays, and its photo pool grows (§5).

## Summary of changes

| # | Change | Cards per day |
|---|---|---|
| 1 | Retire Time Lens (5) and Time Lens Duel (15) from the cutover date | −2 |
| 2 | Add **Last Petal** as `SPARKS[25]`, in Time Lens's place in the feed | +1 |
| 3 | Add **Code Garden** as `SPARKS[26]`, in Time Lens Duel's place | +1 |
| 4 | Add **Who Knows?** as the 20th Aha category (the track stays 5 cards) | 0 |
| 5 | Grow the Where in the World pool: more cities, streets and interesting places | 0 |

The day stays at **20 cards** on every level.

## Decisions

- **Cutover date, not a rewrite of the archive.** Days before the cutover date (`NEW_GAMES_FROM`, set to the day this ships) keep Time Lens and Time Lens Duel exactly as they are. From that date on, those two slots show Last Petal and Code Garden. This follows the `FEED_SINCE` precedent (Where in the World, 2026-11-10) and the determinism rule that archive days never change. The old cards age out of the 31-day archive on their own.
- **Retired indices are never reused.** 5 and 15 join 7 as retired forever. New games take the next unused indices: 25 and 26.
- **Past solves keep counting** for the days they were done on, because those days still show the Time Lens cards.
- **No points or scoring changes.** First solves of the new games earn the usual 1/3/5 through `lbSolved`. The leaderboard schema already allows game indices up to 40, so it needs no change.
- **Who Knows? goes in the Aha track**, not as a separate card, so the five-card Aha block stays together and the day stays at 20.

## 1. Retire Time Lens and Time Lens Duel

- Add a `FEED_UNTIL = { 5: NEW_GAMES_FROM, 15: NEW_GAMES_FROM }` beside `FEED_SINCE` in `dist/feed.js`, and add `25` and `26` to `FEED_SINCE` with the same date. `feedOrder(lv, d)` filters on both. `feedOrder(lv)` without a date returns today's order (the new games).
- In `FEED_PLAN`, the new games sit where the old ones were: Last Petal right after `"bloom"`, Code Garden right after `"neighbours"`. On a given day, a slot shows either the old or the new game, never both. The cleanest way is to keep one plan entry per slot that resolves to the old or new index by date. Whatever the mechanism, `verify-feed.cjs` must prove every day still has exactly 20 cards (19 before 2026-11-10).
- Keep all Time Lens code, `dist/photos.js` and `dist/photos/` for now. Old days inside the archive still render them, and saves pin photo ids.
- **Later cleanup (not part of this build):** 31 days after the cutover, nothing in the archive shows Time Lens any more. A follow-up can then remove the renderers, `PHOTO_BANK` and `dist/photos/`, keeping index 5 and 15 saves loading harmlessly and never counting. Record that date in `CONTENT.md` at cutover.

## 2. Last Petal (`SPARKS[25]`, game theory)

**Pitch:** "Take turns with the bee. Whoever takes the last petal wins." Type label: `Strategy`.

**Play:**
- One or more flowers, each with a number of petals. On her turn she taps a flower and chooses how many petals to take, within the allowed moves. Then the bee moves.
- The bee plays perfectly. The only way to win is to find the winning strategy and keep to it.
- She always moves first, from a position that can be won. Every day is winnable.
- Losing is gentle: "The bee took the last petal. Try again ↺". A **Try again** button restarts from the day's starting position. There's no penalty and no limit on tries. Winning on any try counts as solved.

**Levels** (the strategy to discover gets deeper each level):

| Level | Position | Moves | Win | The idea she discovers |
|---|---|---|---|---|
| Gentle | One flower, 10–21 petals | Take 1, 2 or 3 | Take the last petal | Leave the bee a multiple of 4 |
| Medium | Three flowers, 1–7 petals each | Any number from one flower | Take the last petal | Nim: leave a nim-sum of zero |
| Tricky | Alternate by day (seeded): misère Nim (taking the last petal **loses**), or two flowers with take {1, 3, 4} | As stated on the card | As stated | Endgame twist / non-obvious pattern |

**Model and rules:**
- `petalModel(d, lvl)` is pure, seeded from `puzzleSeed(d) + "|petal-v1"`, and returns the starting position, the move set and the win rule.
- A solver (`petalWins(position, rules)`, memoised win/lose search) proves the starting position is a win for the player to move. Re-roll the seed tag until it is. Avoid trivial positions: Gentle shouldn't start on a number where the first move is the only thing that matters, and Medium shouldn't have one flower holding most of the petals.
- **Bee's move:** if it has a winning move, play the first one in a fixed order. If it doesn't, take 1 petal from the largest flower. That keeps it deterministic and gives her room to recover.
- **Save shape:** `{ moves: [[flower, taken], ...], tries, done }`. The start position isn't saved; it's derived from the date and level. Replaying the moves rebuilds the board.
- **Hint** (label must match `HINT_LABEL`, so it drains flow): "Show me a winning move". It highlights one winning move without explaining why. If she is in a losing position, it says so ("No winning move from here. Try again ↺").
- **Reveal answer** (`revealState` branch in `dist/feed.js`): shows the winning first move and one line on the idea ("Leave the bee a multiple of 4 each turn").
- **After a solve:** one line that names the idea she found, in the same voice.

**Feel:** petals drop as they're taken, and the bee's move happens after a short beat (instant with reduced motion). The bee's move is announced in `#feedback` for screen readers. Touch targets are at least 44px.

## 3. Code Garden (`SPARKS[26]`, deduction from feedback)

**Pitch:** "A hidden row of flowers. Every clue rules something out." Type label: `Deduction`.

**Play:**
- A hidden row of flowers. Above it, a few earlier guesses, each with its feedback: **●** = right flower in the right spot, **○** = right flower in the wrong spot. The ● and ○ marks are shown together, not lined up under particular flowers.
- She builds her answer by tapping a slot and picking a flower, then taps **Check**.
- A wrong check adds her guess as a new clue row, with its own feedback. Wrong checks are allowed without limit and are never penalised. That's how the game naturally teaches.

**Levels:**

| Level | Slots | Flower kinds | Repeats in the code | Clue rows given |
|---|---|---|---|---|
| Gentle | 3 | 4 | No | 3–4 |
| Medium | 4 | 5 | No | 3–4 |
| Tricky | 4 | 6 | Yes | 4–5 |

**Model and rules:**
- `codeModel(d, lvl)` is pure, seeded from `puzzleSeed(d) + "|code-v1"`, and returns the hidden code and the clue rows.
- **Uniqueness is required:** a brute-force solver over every possible code (at most 6⁴ = 1,296) must find exactly one code consistent with all the clues. Generate clue guesses at random, keep adding until exactly one code is left, and re-roll if the count goes over the level's limit. Avoid a clue that gives the answer away (a row that's all ●).
- **Save shape:** `{ guesses: [[...], ...], done }`. The current unfinished row is also saved, so she doesn't lose it on scroll.
- **Hint:** "Show one flower". It fills one correct slot and locks it.
- **Reveal answer:** shows the code, and for one clue, why it rules out the closest alternative.

**Accessibility:** flowers differ by **shape as well as colour** (e.g. tulip, daisy, rose, bell, star, poppy), so it works for colour-blind players. Each clue row has a text label ("Tulip, daisy, rose: one right spot, one wrong spot"). Feedback marks are never colour-only.

## 4. Who Knows? (Aha category 20, reasoning about knowledge)

**Pitch:** "Two friends, half a secret each. What they don't know tells you everything." Group: `logic`.

**Shape of a question:**
- A short list of candidates, for example 8–12 birthdays (month and day) or flower-and-colour pairs.
- One friend is told one half (the month), the other the other half (the day). Both know the full list.
- A short dialogue, for example: "Asha: I don't know the birthday. Ben: I didn't know either, until now. Asha: Then I know it too."
- The question: which candidate is the secret? On every level the options are the candidates (choice buttons), since the candidates are the full answer set.

**Generator and solver:**
- Add `genKnows` to `AHA_GEN` and a `knows` entry to `AHA_CATS`, like the other 19 categories.
- The solver works over the set of possible secrets. Each statement filters that set by what the speaker could or couldn't know given their half. "I don't know" keeps the secrets whose half is shared by more than one remaining candidate. "Now I know" keeps the secrets whose half is unique in the remaining set. "I knew you didn't know" means *every* secret sharing the speaker's half leaves the other friend unsure.
- Generate random candidate lists and dialogue templates until exactly one secret survives.
- Levels change the number of candidates (Gentle 6–8, Medium 8–10, Tricky 10–12) and the dialogue length (Gentle 2 lines, Medium 3, Tricky 3–4, including an "I knew you didn't know").
- Write `why` (shown after a reveal) as the chain of eliminations, one short sentence per line of dialogue.
- Names come from a short, warm list of first names of mixed origin. Keep the tone everyday and kind (birthdays, a garden visit, a café order).

**Rotation (determinism):**
- Adding a category to `AHA_RING` changes which categories every unplayed day shows, including archive days. So this needs a third rotation: `AHA_RING_V3`, with `knows` placed so number and logic groups still alternate as far as possible.
- Days before `NEW_GAMES_FROM` keep rotation 1 or 2 exactly as now. From that date, unplayed days use rotation 3.
- Extend `ahaRotation` and the saved `aha` flag (which already records 1 or 2) to record 3, so a day's categories never change once its Aha cards are played.
- `verify-aha.cjs` must show that every day before the cutover has the same categories as before, and that `knows` appears from the cutover on.

**Docs:** add Who Knows? to `docs/aha-question-pool.md` (20 types, with sample questions from the real generator) and update the count in `AGENTS.md`.

## 5. A bigger Where in the World pool

**Goal:** a pool that feels more varied and more surprising. Today there are 124 photos (40 Gentle, 43 Medium, 41 Tricky). The aim is **at least 100 per level, about 300 in total**, with variety:

- **Cities:** skylines and old towns beyond the obvious capitals (e.g. Porto, Hanoi, Valparaíso, Tbilisi, Zanzibar's Stone Town, Jaipur, Kyoto).
- **Streets:** everyday street scenes with signs, scripts, vehicles, shopfronts, markets. These are the best Tricky clues (e.g. a Lisbon tram street, a Seoul alley, a Marrakech souk, a Havana street, a Mumbai local station).
- **Interesting places:** natural wonders and less-famous marvels (e.g. Zhangjiajie, Salar de Uyuni, Cappadocia, Socotra, Rainbow Mountain, Giant's Causeway, Hampi, Ha Long Bay).
- **Spread:** every continent, and more of Africa, South America, Central Asia and Oceania. Each level should have about 8–12 photos from India.

**Process (existing tools, same rules):**
1. Add rows to `tools/places-list.tsv`: `id`, level, country, search terms, optional exact `File:` title.
2. Run `python3 tools/fetch-places.py tools/places-list.tsv tools/places-meta.json`. It only accepts free licences (public domain, CC0, CC BY, CC BY-SA) and saves 800px JPEGs to `dist/places/`.
3. **Look at every photo before keeping it.** Reject dull, dark, badly cropped or watermarked shots, and any photo with a visible country name, flag-as-giveaway or readable place name, using `--skip`.
4. Hand-write the `title`, `alt`, `clue` and `story` for every new id in `tools/places-text.json`. Alt text and clues never name the country. Stories are 1–2 warm, true sentences.
5. Run `python3 tools/build-places.py` and check its counts.

**Determinism:**
- The daily pick uses `cycleIndex(pool.length, "place-v1-" + lvl, ...)`, so growing the pool would change which photo every unplayed archive day shows. Add `PLACE_V2_FROM` (the cutover date) and a `"place-v2-"` cycle over the larger pool from that date. Days before it keep the v1 cycle over the original 124 photos, in their original order.
- Keep the original 124 entries first in each level's pool, or pin the v1 pool by id, so v1 stays exactly the same.
- `verify-places.cjs` must check that days before the cutover pick the same photos as before and that there's no repeat within 31 days on v2.
- Keep the site light: 800px JPEGs at the existing quality. Note the new total size of `dist/places/` in the PR.

## Tests and checks

- `verify-feed.cjs`: 20 cards on every day and level from the cutover; old days unchanged; 5 and 15 only before the cutover; 25 and 26 only from it; openers still work; `feedNextUnsolved` and `feedNextInDay` handle the new indices.
- New `verify-petal.cjs`: 3 levels × 366 days are deterministic and always winnable for the first player; the bee plays the stated rule; replaying a saved move list rebuilds the same board; hints and reveals never count.
- New `verify-code.cjs`: 3 levels × 366 days are deterministic, with exactly one consistent code; clue counts are within the level limits; a wrong check adds a correct feedback row.
- `verify-aha.cjs`: `knows` has a unique answer for 366 days × 3 levels; archive categories before the cutover are unchanged.
- `verify-places.cjs`: as in §5.
- `tests/smoke.mjs`: play Last Petal to a win by touch (using the solver's moves) and a loss followed by Try again; solve Code Garden by touch after one wrong check; open a Who Knows? question. All on WebKit and Chromium.
- `npm run verify` and `npm run smoke` both pass before handing off. Follow `REVIEW.md`.

## Docs to update

`AGENTS.md` (game registry: retire 5 and 15, add 25 and 26; file map; the Aha category count), `README.md` (player rules for the new games), `CONTENT.md` (the cutover, the photo pool, the later-cleanup date) and `docs/aha-question-pool.md`.

## Order of work

Each step lands on its own and passes `npm run verify`:

1. Feed cutover mechanism (`FEED_UNTIL`) with placeholder entries, plus `verify-feed.cjs`.
2. Last Petal.
3. Code Garden.
4. Who Knows? with Aha rotation 3.
5. Where in the World pool and `place-v2`. Content-heavy and independent, so it can run in parallel with 2–4.
6. Set `NEW_GAMES_FROM` to the ship date, update the docs, and run the full smoke test.

## Open questions

- **Ship date:** `NEW_GAMES_FROM` is the day this ships. Everything before it stays as it is.
- **Pool size:** 100 per level is the target. Fewer is fine if quality would drop to reach it.
