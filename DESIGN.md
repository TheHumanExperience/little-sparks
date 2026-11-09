---
name: Little Sparks
description: A cosy daily puzzle gift, delivered like a handwritten note.
colors:
  fountain-ink: "#243f32"
  letter-paper: "#f8f6ef"
  fresh-sheet: "#fffdf8"
  wax-seal: "#a45a2b"
  pressed-fern: "#385f48"
  deep-fern: "#355a40"
  solved-sage: "#52775a"
  candle-gold: "#e9c46a"
  warm-amber: "#e9a23b"
  gold-wash: "#f6e3b5"
  lamplight: "#fbefc4"
  sage-tint: "#e3ecda"
  linen: "#f0f2e8"
  soft-stone: "#e6e9de"
  pencil-line: "#d3dccb"
  faded-ink: "#607063"
  margin-note: "#6b7a67"
  garden-soil: "#f4ecd9"
  bed-timber: "#7c5a2f"
  slate-wall: "#3f4a45"
  gentle-no: "#b5483d"
typography:
  display:
    fontFamily: "Libre Caslon Display, Georgia, serif"
    fontSize: "34px"
    fontWeight: 400
  headline:
    fontFamily: "Libre Caslon Display, Georgia, serif"
    fontSize: "30px"
    fontWeight: 400
  love-note:
    fontFamily: "Libre Caslon Display, Georgia, serif"
    fontSize: "24px"
    fontWeight: 400
  sheet-title:
    fontFamily: "Georgia, serif"
    fontSize: "26px"
    fontWeight: 400
    letterSpacing: "1px"
  body:
    fontFamily: "DM Sans, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
  body-small:
    fontFamily: "DM Sans, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.55
  control:
    fontFamily: "DM Sans, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 600
  label:
    fontFamily: "DM Sans, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    letterSpacing: "1.2px"
rounded:
  tile: "6px"
  button: "8px"
  soft: "12px"
  field: "14px"
  card: "22px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "14px"
  lg: "18px"
components:
  button-primary:
    backgroundColor: "{colors.pressed-fern}"
    textColor: "#ffffff"
    rounded: "{rounded.button}"
    padding: "12px 18px"
  button-secondary:
    backgroundColor: "{colors.soft-stone}"
    textColor: "{colors.fountain-ink}"
    rounded: "{rounded.button}"
    padding: "12px 18px"
  button-save:
    backgroundColor: "{colors.pressed-fern}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    height: "48px"
  pill:
    backgroundColor: "#fffdf7"
    textColor: "{colors.fountain-ink}"
    typography: "{typography.control}"
    rounded: "{rounded.pill}"
    padding: "7px 12px"
  choice:
    backgroundColor: "{colors.fresh-sheet}"
    textColor: "{colors.fountain-ink}"
    rounded: "9px"
    padding: "15px"
  choice-right:
    backgroundColor: "{colors.solved-sage}"
    textColor: "#ffffff"
    rounded: "9px"
  spark-card:
    backgroundColor: "{colors.fresh-sheet}"
    textColor: "{colors.fountain-ink}"
    rounded: "{rounded.card}"
    padding: "16px 18px 14px"
  field:
    backgroundColor: "#ffffff"
    textColor: "{colors.fountain-ink}"
    rounded: "{rounded.field}"
    padding: "10px 14px"
    height: "48px"
  solved-chip:
    backgroundColor: "{colors.deep-fern}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
  puzzle-cell:
    backgroundColor: "#fffef9"
    textColor: "{colors.fountain-ink}"
    rounded: "{rounded.tile}"
---

# Design System: Little Sparks

## Overview

**Creative North Star: "The Handwritten Note"**

Each day of Little Sparks is a small letter left for someone. The page is cream, the ink is a deep green, and the serif headings take their time. Nothing on a resting screen is trying to win attention, because the person reading it is already loved and already here.

The system is quiet, then delighted. At rest it is still and papery. Color, motion, and glow arrive only in response to something real: a solved puzzle, a lit square, a flow bar that has filled. A celebration feels earned because the sheet it lands on was calm a moment before.

Every touchable part is soft and tactile, like rounded paper tiles and good stationery. The screen is one sheet at a time, sized for a thumb on a phone, with its density set by the puzzle it holds.

**Key Characteristics:**

- Cream paper and deep green ink, with no pure black and no cold greys.
- A high-contrast Caslon display face over a friendly geometric sans.
- One full-screen sheet per puzzle, with a single faint shadow.
- Gold belongs to reward; rust belongs to small human accents.
- Each puzzle world keeps its own small palette inside the shared sheet.

## Colors

A warm, botanical stationery palette: greens and creams at rest, candlelight golds when something goes right.

### Primary

- **Fountain Ink** (#243f32): All primary text and headings. It is the darkest color in the system and stands in for black.
- **Pressed Fern** (#385f48): Primary buttons, selected tabs, and the save action.
- **Deep Fern** (#355a40): The solved chip, and hover or focus color on quiet controls.
- **Solved Sage** (#52775a): The confirmed state: correct letters, right answers, finished pieces.

### Secondary

- **Wax Seal** (#a45a2b): The small human accent. Used for the "Today" marker, turn numbers, cage sums, and the focus ring.

### Tertiary

- **Candle Gold** (#e9c46a): Celebration borders and matched states.
- **Warm Amber** (#e9a23b): The end of the flow-bar gradient and golden-day warmth.
- **Gold Wash** (#f6e3b5): Selected cells and changed ladder letters.
- **Lamplight** (#fbefc4): Lit squares in light-based puzzles.

### Neutral

- **Letter Paper** (#f8f6ef): The app background behind every sheet, and the bottom sheets.
- **Fresh Sheet** (#fffdf8): The card surface. Slightly brighter than the page, so a card reads as a sheet laid on top.
- **Linen** (#f0f2e8): Day intro cards and inset panels.
- **Sage Tint** (#e3ecda): Soft selected rows and completed days.
- **Soft Stone** (#e6e9de): Secondary buttons and meter tracks.
- **Pencil Line** (#d3dccb): Borders on cells, tiles, and pills.
- **Faded Ink** (#607063): Help text and how-to copy.
- **Margin Note** (#6b7a67): Eyebrows, card metadata, and the next-card link.

### Puzzle Worlds

- **Garden Soil** (#f4ecd9) and **Bed Timber** (#7c5a2f): The allotment in Garden Beds.
- **Slate Wall** (#3f4a45): Walls in Lantern Lanes and other solid puzzle pieces.
- **Gentle No** (#b5483d): A clash or an over-limit piece. Always paired with a shape or motion cue, and only inside puzzle feedback.

### Named Rules

**The Earned Gold Rule.** Gold and amber appear only as a response to play: a solve, a lit square, a filled flow bar. A resting screen never wears gold for decoration.

**The Warm Neutral Rule.** Every neutral leans cream or sage. Pure black and cool greys do not belong on the paper.

## Typography

**Display Font:** Libre Caslon Display (with Georgia, serif)
**Body Font:** DM Sans (with Arial, sans-serif)

**Character:** An elegant, high-contrast old-style face says the sentimental part, and a round, friendly sans does the work of explaining the puzzle. Together they read like a card written carefully with clear instructions tucked inside.

### Hierarchy

- **Display** (400, 34px): Note-card and day-intro headlines such as "A little play." Milestone cards scale this up to 38px and 46px.
- **Headline** (400, 30px, 26px at 380px wide and below): The puzzle title on every card.
- **Love Note** (400, 24px): The line "Created with love from Devansh", set in the display face.
- **Sheet Title** (400, 26px, uppercase, 1px tracking): Headings on bottom sheets, currently set in Georgia.
- **Body** (400, 16px; 14–15px with 1.5 line height for puzzle prose): Puzzle text and clues.
- **Body Small** (400, 13px, 1.55 line height): How-to copy and helper notes.
- **Control** (600, 13px): Pills and quiet card-foot controls. Solved counts use tabular numerals.
- **Label** (700, 11px, 1.2px tracking, uppercase): The card eyebrow, for example "05 / 19 · Light".

### Named Rules

**The Serif Speaks Softly Rule.** The display face is for titles and sentiment, always at weight 400. Instructions and controls belong to DM Sans.

**The Steady Numbers Rule.** Counts and answer values use tabular numerals, so a changing score never shifts.

## Layout

The app is a single vertical, snap-scrolling feed. Each spark fills exactly one screen below a 56px header that respects the safe area, and every layout uses `100dvh`. A card is centered and capped at 560px wide, with a 14px page gutter on phones and 8–10px at 380px and below. A long puzzle scrolls inside its own card, so snapping never fights the player.

Puzzle boards cap at roughly 320–360px wide and center inside the card. Spacing is tight and practical, mostly in 6, 8, 14, and 18px steps. The card foot keeps a fixed three-part arrangement: clear on the left, next spark in the center, Reveal answer on the right. Sheets rise from the bottom edge. Layout tightens at 520, 430, 380, and 360px, and must hold down to 360px with no horizontal overflow.

## Elevation & Depth

Depth is a sheet resting on a desk. Every card gets one barely-there shadow to lift it off the page, and tone does most of the remaining work. Stronger depth and glow are reserved for state, drag, and celebration.

### Shadow Vocabulary

- **Sheet at rest** (`box-shadow: 0 6px 24px #24403210`): The spark card.
- **Lifted piece** (`box-shadow: 0 6px 18px rgba(40, 60, 40, .18)`): A story card while it is being dragged.
- **Floating chip** (`box-shadow: 0 6px 18px #24403240`): The solved chip.
- **Milestone** (`box-shadow: 0 20px 60px #24403240`): Milestone cards, the only deep shadow.
- **Solve glow** (`box-shadow: 0 0 0 6px #f2c94c88, 0 0 40px 12px #f2c94c55`): The peak of the 1.4s celebration, settling back to the resting shadow.

### Named Rules

**The One Sheet Rule.** A resting screen has one lifted surface: the card. Elements inside it stay flat, separated by borders and tone.

## Shapes

The form language is soft rounded rectangles, tightening as pieces get smaller: large sheets at 22px, fields at 14px, inner panels at 12px, buttons at 8px, and puzzle tiles at 6px. Pills are fully round and hold navigation, status, and quiet actions. Bottom sheets round only their top corners. The ✳ spark is the recurring mark inside the app, and hand-drawn-feeling glyphs such as ♡ carry the sentiment. The logo is a slightly uneven Wax Seal disc pressed with an eight-ray spark and a small heart; below 48px it drops the ring and heart so it stays clear. Its masters are in `brand/`, and the browser-tab and home-screen icons in `dist/` are copied from them.

## Components

### Buttons

Soft, unglossy, and pressable, like card stock.

- **Shape:** Gently rounded (8px); the sheet save action is a full pill at 48px tall.
- **Primary:** Pressed Fern with white text and 12px by 18px padding.
- **Secondary:** Soft Stone with Fountain Ink, used for "A gentle hint".
- **Quiet:** Transparent text controls for next spark, ↺, and Reveal answer, at least 44px tall. Hover and focus warm them to Deep Fern on a pale sage circle.
- **Focus:** A 3px Wax Seal outline with 4px offset.

### Chips and Pills

- **Header pills:** Near-white with a Pencil Line border, 13px semibold. On a new solve, the count pill bumps in Gold Wash for 0.6s.
- **Badges:** Small pale pills that name the logical reasoning category, 11px with light tracking.

### Cards / Containers

- **Corner Style:** Very rounded (22px).
- **Background:** Fresh Sheet; Linen for day-intro cards.
- **Shadow Strategy:** Sheet at rest. See Elevation & Depth.
- **Border:** 1px pale sage, deepening slightly once the puzzle is done.
- **Internal Padding:** 16px by 18px, reduced to 12px at 380px and below.

### Inputs / Fields

- **Style:** White, 1px sage border, 14px radius, 48px tall, with 16px text so iOS does not zoom.
- **Focus:** The shared Wax Seal outline.
- **Error:** A short rust-toned line beneath the field, never a red box.

### Navigation

The header holds the lowercase ✳ little sparks wordmark on the left and a row of pills on the right. A 4px flow bar sits on its bottom edge. Pills tighten and the "Today" label drops away on the narrowest phones. The wordmark shrinks to 16px at 400px wide and below, and at 380px and below only the ✳ remains, in a 44px tap area with the full name kept for screen readers.

### Choice Tiles

Full-width or two-up tiles on Fresh Sheet, with a 1px sage border and a 9px radius. A right answer fills with Solved Sage and white text.

### Puzzle Cells

Square tiles with a 6px radius and a thin Pencil Line border, spaced 3–6px apart. State changes through fill: Gold Wash when selected, Lamplight when lit, Solved Sage when confirmed.

### The Note Card

A full, centered sheet with a row of small spark glyphs, a Display headline, the day's tally, and the love note beneath a ♡ in soft terracotta. It sits after today's final puzzle and is the emotional close of the day.

### Solve Celebration

A sparkle burst of 1.15s from the board's center, a Candle Gold card glow of 1.4s, and a Deep Fern count-up chip of 2.6s. With reduced motion, these become a steady 3px Candle Gold ring and no particles.

### Shiny Card and Golden Day

A shiny card carries a slow 4s holographic border, the only multicolor treatment in the system. A golden day washes cards from warm cream to pale gold once flow is full.

## Do's and Don'ts

### Do:

- **Do** keep resting screens cream, green, and still, so that the first burst of gold means something.
- **Do** set the love note in the display face and keep it prominent on the note card, reading exactly "Created with love from Devansh".
- **Do** use Fountain Ink instead of black, and warm neutrals instead of grey.
- **Do** keep touchable controls at least 44px tall and text inputs at 16px or larger.
- **Do** give every animation a calm, still fallback under reduced motion.
- **Do** pair every Gentle No red with a shape, icon, or motion cue.

### Don't:

- **Don't** use gold, amber, or multicolor gradients on a resting element.
- **Don't** add a second lifted surface to a resting screen.
- **Don't** put instructions or controls in the display face.
- **Don't** introduce a new typeface, script CDN, or framework to reach a visual effect.
- **Don't** use a red error treatment outside puzzle feedback.
- **Don't** let design imply pressure: no countdowns, urgent colors, or nagging empty-streak treatments.

### Known Drift

The incumbent code departs from this system in a few places. Treat these as cleanup candidates, not patterns to copy:

- Sheet Title renders in Georgia uppercase while every other title uses Libre Caslon Display.
- Only three colors exist as CSS variables (`--ink`, `--paper`, `--green`); the rest are hard-coded, and several near-duplicate greens and radii remain.
- Quiet controls such as Reveal answer and ↺ use #8a9586, about 3.1:1 on Fresh Sheet, below the 4.5:1 target for 12–13px text.
- The ♡ above the love note uses #b07d5b at about 3.5:1. It is decorative, but it is the closest neighbour to the most important line in the app.
