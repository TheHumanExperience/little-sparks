# New games build, 2026-11

Decisions made while building [`docs/new-games-spec.md`](../new-games-spec.md) (spec added at `0f137a3`). Work happens on the local branch `new-games`, one commit per spec step, not pushed until Devansh asks. Related: [Working rules](working-rules.md), [Environment findings](environment-findings.md).

## 2026-11-21

- **Who Knows? scope:** one puzzle family only, the split secret: two friends each told one half of a secret, then a short dialogue. Six themes (birthday month/day, garden flower/colour, café drink/cake, cinema row/seat, playing card suit/value, two-digit number tens/units) and six dialogue shapes, two per level:
  - Gentle: "A: I don't know. B: Now I know." and "A: I don't know. B: I knew from the start."
  - Medium: "A: I don't know. B: Now I know. A: Then I know too." and "A: I don't know. B: Me neither. A: Now I know."
  - Tricky: the Cheryl's-birthday shape ("I don't know, but I knew B didn't either"), and four lines with two rounds of "still don't know".
  - Sum-and-product, hat and ages-of-children puzzles were set aside for later.
  - Reason: Who Knows? appears on about 1 day in 4 (5 of 20 Aha categories per day), so about 90 questions a year per level; themes × shapes keep it varied while one solver keeps uniqueness provable.
- **Cutover date (`NEW_GAMES_FROM`):** a placeholder while building; set to the planned push date in spec step 6. *Superseded later on 2026-11-21, see below.*
- **Downloads approved:** Playwright with Chromium for `npm run smoke`, and about 176 new Wikimedia photos for Where in the World. Kept photos are committed; rejected ones are deleted.
- **No issue tracker:** the spec's "Order of work" serves as the ticket list; nothing is published outside the repo.

## 2026-11-21, later

- **Time Lens and Time Lens Duel go with today's deploy.** `NEW_GAMES_FROM` is `2026-11-21`, so today's feed switches to Last Petal and Code Garden as soon as the deploy is live, including for anyone who already played Time Lens today. Supersedes the placeholder decision above. The step 1 commit (`9209642`) used the placeholder `9999-12-31`; step 6 sets the real date.
- **Archive days keep Time Lens,** as the spec says. Its code and photos are removed in a follow-up once it has aged out of the 31-day archive (on or after 2026-12-22).
- **The photo pool may ship later.** If step 5 isn't ready when the games are, deploy the games without it; `PLACE_V2_FROM` is a separate date, so the pool can follow in its own deploy.
- **Deploying still needs Devansh's go-ahead** to push to `main` ([Working rules](working-rules.md)).
