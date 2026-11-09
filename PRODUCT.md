# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary: Nidhi.** Little Sparks is a personal gift made for her, and she is the person every design decision serves first.

**Secondary: a small circle of friends or family** who play alongside her and appear on the optional leaderboard. They are welcome guests, not a growth audience. Nothing should be designed around strangers discovering the app.

Her job is to open a small, kind daily moment, play as many puzzles as she feels like, and leave feeling warm.

## Product Purpose

Little Sparks is a cosy daily puzzle gift. Each day brings 19 playable cards ("sparks") in a vertical, snap-scrolling feed, followed by a short note, and the feed continues back through the previous 30 days.

**Success is a small daily ritual:** she opens it most days, plays a few cards, and leaves feeling warm. Finishing all 19 is optional and must never feel like the expected outcome.

## Positioning

It was made by one person for one person. A puzzle app can copy the feed, the games, and the rewards; it cannot truthfully copy the fact that this one is a love letter that renews every day.

## Operating Context

- Played on a phone, with iOS Safari as the main target. Each card is full-screen and played in place in the feed.
- Day-based: a new set each calendar day, with a 31-day archive that always regenerates the same puzzles.
- Three levels, chosen by the player: Gentle, Medium, Tricky. Each level shows one game per family, so the levels feel different.
- Served as a static site from GitHub Pages at https://little-sparks.in. Progress stays in the browser. The leaderboard is optional and hidden when unconfigured.
- Sound and haptics are optional; chimes can be muted and only start after a first tap.

## Capabilities and Constraints

**Capabilities:** word, number, logic, and photo-dating puzzles; the five-card Aha logical-reasoning block; per-card Clear & retry and Reveal answer; escalating solve celebrations, chimes, the flow bar, shiny cards and stickers; a look-back day picker; an optional Day/Week/Month leaderboard.

**Terminology:** a *spark* or *card* is one puzzle; the *feed* is the scroll of cards; levels are *Gentle / Medium / Tricky*; *flow* is the no-hints meter; *shiny* cards award *stickers*; *Reveal answer* gives the solution without credit.

**Constraints:**

- Static, zero-build app in `dist/`: no frameworks, no script CDNs, relative URLs only.
- Saved progress must keep loading; storage keys and saved field meanings never change.
- Every puzzle is a pure function of date and level, with exactly one answer.
- Reveals, replays, and hints can never earn credit, streak, flow, stickers, or milestones.

## Brand Commitments

- **Name:** Little Sparks, with a wax seal pressed with a spark and a small heart as its logo (`brand/`), and the ✳ spark as its in-app mark.
- **The love note is the emotional heart of the product and stays prominent.** It reads exactly: "Created with love from Devansh".
- **Voice:** warm and calm, with no pressure. Never exam or test language; no "CAT", "Quant", "LRDI", "MCQ", or "TITA" labels. Reasoning cards are presented as logical reasoning puzzles.
- **No ads, ever.**

## Evidence on Hand

- Real content: daily word lists, stories, generated ladders, and photographs in `dist/photos/`, all free-licence (public domain or CC) with credit, source, and licence recorded in `dist/photos.js`.
- There are no testimonials, user numbers, press, or pricing. None should be invented.

## Product Principles

1. **A gift before a product.** When a choice trades intimacy for reach or engagement, keep the intimacy.
2. **Enough is enough.** One card is a good day. Nothing may guilt, nag, or imply she has fallen behind.
3. **Rewards are earned and gentle.** Delight follows a real solve and never pressures the next one.
4. **The puzzle is honest.** Every puzzle is fair, has one answer, and is the same puzzle tomorrow.
5. **Thumb-first and calm.** Everything must work by touch on a phone, and calm fallbacks stand in whenever motion is reduced.

## Accessibility & Inclusion

- `prefers-reduced-motion` is honoured with no particles, shimmer, or smooth scrolling, using instant, calm fallbacks.
- Touch targets are at least 44px and inputs at least 16px; layouts hold from 360px wide with no horizontal overflow, respecting safe areas and `100dvh`; nothing depends on hover.
