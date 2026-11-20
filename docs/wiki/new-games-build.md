# New games build, 2026-11

Decisions made while building [`docs/new-games-spec.md`](../new-games-spec.md) (spec added at `0f137a3`). Work happens on the local branch `new-games`, one commit per spec step, not pushed until Devansh asks. Related: [Working rules](working-rules.md), [Environment findings](environment-findings.md).

## 2026-11-21

- **Who Knows? scope:** one puzzle family only, the split secret: two friends each told one half of a secret, then a short dialogue. Six themes (birthday month/day, garden flower/colour, café drink/cake, cinema row/seat, playing card suit/value, two-digit number tens/units) and six dialogue shapes, two per level:
  - Gentle: "A: I don't know. B: Now I know." and "A: I don't know. B: I knew from the start."
  - Medium: "A: I don't know. B: Now I know. A: Then I know too." and "A: I don't know. B: Me neither. A: Now I know."
  - Tricky: the Cheryl's-birthday shape ("I don't know, but I knew B didn't either"), and four lines with two rounds of "still don't know".
  - Sum-and-product, hat and ages-of-children puzzles were set aside for later.
  - Reason: Who Knows? appears on about 1 day in 4 (5 of 20 Aha categories per day), so about 90 questions a year per level; themes × shapes keep it varied while one solver keeps uniqueness provable.
- **Cutover date (`NEW_GAMES_FROM`):** a placeholder while building; set to the planned push date in spec step 6.
- **Downloads approved:** Playwright with Chromium for `npm run smoke`, and about 176 new Wikimedia photos for Where in the World. Kept photos are committed; rejected ones are deleted.
- **No issue tracker:** the spec's "Order of work" serves as the ticket list; nothing is published outside the repo.
- **Where in the World pool (spec step 5):** v1 is pinned by id (`PLACE_V1` in `dist/globe.js`) rather than by order, so build-places can keep sorting by id. `PLACE_V2_FROM` stays the placeholder `9999-12-31` until step 6. The pool grew from 40 / 43 / 41 to 90 / 99 / 88 (Gentle / Medium / Tricky); every downloaded photo was looked at and roughly a third were rejected (wrong subject, readable place names, flags, dull or badly cropped). Added on request along the way: no repeated id, Commons file, image or place (`PLACE_ALIASES` in verify-places.cjs); CC photos must name their author (four were blank and were filled from their file pages); every Tricky photo records a `city` (69 named, 19 null) for a city question to be built later.
