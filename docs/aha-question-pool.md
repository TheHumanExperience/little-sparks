# Aha track: question pool

The Aha track isn't a fixed list of questions. Each day shows five of these 19 puzzle types, as a window sliding round `AHA_RING` in `dist/aha.js` (number and logic types alternate, so each day mixes both). Each type's generator then builds a fresh question from the date and level, and a brute-force solver checks that it has exactly one answer. Over a year that comes to about 20,900 questions (19 types × 3 levels × 366 days).

On Gentle and Medium, number questions are multiple choice. On Tricky you type the answer.

Sample questions below come from the real generators (seeded with a fixed sample key, not a real date).

## The 19 types

| # | Type | Group | What it is |
|---|---|---|---|
| 1 | Blood Relations | logic | Whose photo is it? Untangle the family tree. |
| 2 | Profit & Percentages | numbers | Mark-ups, discounts and the percentage traps that catch everyone. |
| 3 | Seating Arrangement | logic | A handful of clues, exactly one order. |
| 4 | Cube Painting | numbers | Paint the outside, cut it up, count the pieces. |
| 5 | Directions | logic | Left, right, sunrise shadows and the way home. |
| 6 | Speed, Time & Work | numbers | Trains, boats, taps and teamwork. |
| 7 | Truth & Lies | logic | Some always tell the truth. Some never do. |
| 8 | Number Series | numbers | Spot the pattern, find what comes next. |
| 9 | Odd One Out | logic | Four follow a rule. One doesn't. |
| 10 | Number Puzzles | numbers | Remainders, divisors, cycles and LCMs. |
| 11 | Read the Table | logic | Read the table, dodge the trap. |
| 12 | Coins & Weighings | numbers | One fake coin and a trusty pan balance. |
| 13 | Matchsticks | logic | Move one stick to make the sum true. |
| 14 | Ratios & Mixtures | numbers | Blends, ages and shares. |
| 15 | Logic Grid | logic | Cross out the impossible. |
| 16 | Tournaments | numbers | Fixtures, knockouts and who can still top the table. |
| 17 | Is the Info Enough? | logic | You don't need the answer, just whether you could get it. |
| 18 | Counting & Chance | numbers | Plan for the unluckiest draw. |
| 19 | Clocks & Calendars | logic | Hands, hours and weekdays. |

## Blood Relations

_Whose photo is it? Untangle the family tree._

**Gentle**

Pointing at a photo, Zoya says: “He is my mother's son.”

How is that person related to Zoya?

Options: cousin brother · son · son-in-law · brother

Answer: **brother** (Zoya's mother → her son = Zoya's brother. So he is Zoya's brother.)

**Medium**

Flipping through the wedding album, Dev says: “He is my daughter's mother's son.”

How is that person related to Dev?

Options: brother-in-law · son · cousin brother · grandfather

Answer: **son** (Dev's daughter → her mother = Dev's wife → her son = Dev's son. So he is Dev's son.)

**Tricky**

Waving at someone on the station platform, Bilal says: “He is my daughter's mother's father.”

How is that person related to Bilal?

Options: grandson · nephew · father-in-law · grandfather

Answer: **father-in-law** (Bilal's daughter → her mother = Bilal's wife → her father = Bilal's father-in-law. So he is Bilal's father-in-law.)

## Profit & Percentages

_Mark-ups, discounts and the percentage traps that catch everyone._

**Gentle**

Sana's salary is 100% more than Leela's.

By what percentage is Leela's salary less than Sana's?

Answer: **50** (If Leela earns 100, Sana earns 200. The gap of 100 is 50% of 200.)

**Medium**

Sameer marks a fridge 40% above its cost price of ₹500, then gives a 15% discount on the marked price.

What is the profit percentage?

Answer: **19** (Cost 100 → marked 140 → after 15% off, 119. Profit = 19%, not 40 − 15 = 25%.)

**Tricky**

Meera marks a scooter 40% above its cost price of ₹5,300, then gives a 15% discount on the marked price.

What is the profit percentage?

Answer: **19** (Cost 100 → marked 140 → after 15% off, 119. Profit = 19%, not 40 − 15 = 25%.)

## Seating Arrangement

_A handful of clues, exactly one order._

**Gentle**

4 runners finish a park race, with no ties.

- Exactly 2 runners finish between Naina and Sana.
- Exactly 1 runner finishes between Naina and Tejas.
- Tejas finishes ahead of Sana.

Who finishes 3rd?

Options: Sana · Naina · Tejas · Aditi

Answer: **Tejas** (The only order that fits every clue is Naina, Aditi, Tejas, Sana. So 3rd place goes to Tejas.)

**Medium**

5 neighbours live in a lane of houses numbered 1 to 5.

- Ved lives at number 4.
- Exactly 2 houses lie between Sameer's and Tanvi's.
- Sameer lives at the number just after Bilal.

Who lives at number 5?

Options: Tanvi · Sameer · Ved · Om · Bilal

Answer: **Tanvi** (The only order that fits every clue is Bilal, Sameer, Om, Ved, Tanvi. So 5th place goes to Tanvi.)

**Tricky**

6 people wait in a queue at the chai stall. Place 1 is the front.

- Dev is somewhere ahead of Esha.
- Esha stands directly in front of Farhan.
- Exactly 2 people stand between Aditi and Esha.
- Rohan is somewhere ahead of Esha.
- Exactly 4 people stand between Rohan and Aditi.

Who is 5th in the queue?

Options: Naina · Aditi · Dev · Farhan · Rohan · Esha

Answer: **Naina** (The only order that fits every clue is Rohan, Dev, Esha, Farhan, Naina, Aditi. So 5th place goes to Naina.)

## Cube Painting

_Paint the outside, cut it up, count the pieces._

**Gentle**

Gauri makes a 3×3×3 block of jaggery for the school fair. It is dusted with cocoa on all six faces, then cut into 27 equal little cubes.

How many little cubes have exactly 3 faces dusted with cocoa?

Answer: **8** (Corner pieces touch 3 outside faces, edge pieces 2, face-centre pieces 1, and the hidden core 0. On a 3×3×3 cube that's the 8 cor3ers.)

**Medium**

Kiran makes a 3×7×5 clay block for the school fair. It is glazed on all six faces, then cut into 105 equal little cubes.

How many little cubes have no glaze at all?

Answer: **15** (Corner pieces touch 3 outside faces, edge pieces 2, face-centre pieces 1, and the hidden core 0. Counting the 3×7×5 clay block piece by piece gives 15.)

**Tricky**

Kabir makes a 8×8×8 block of jaggery for the school fair. It is dusted with cocoa on all six faces, then cut into 512 equal little cubes.

How many little cubes have exactly 3 faces dusted with cocoa?

Answer: **8** (Corner pieces touch 3 outside faces, edge pieces 2, face-centre pieces 1, and the hidden core 0. On a 8×8×8 cube that's the 8 cor8ers.)

## Directions

_Left, right, sunrise shadows and the way home._

**Gentle**

Naina starts a treasure hunt at the banyan tree: Naina walks 35 m west, turns right and goes 15 m, turns right and goes 5 m.

In which direction is Naina now from the starting point?

Options: East · North · South-West · North-West

Answer: **North-West** (Overall Naina ended up 30 m west and 15 m north of the start, which is North-West.)

**Medium**

Ved starts a treasure hunt at the banyan tree: Ved walks 35 m south, turns right and goes 35 m, turns right and goes 35 m.

How far is Ved from the starting point in a straight line?

Answer: **35** (Overall Ved ended up 35 m west and 0 m north of the start. Straight-line distance = √(1225 + 0) = 35 m.)

**Tricky**

Ved starts from the school gate: Ved walks 9 km west, turns around and goes 5 km, turns left and goes 6 km, turns around and goes 3 km.

How far is Ved from the starting point in a straight line?

Answer: **5** (Overall Ved ended up 4 km west and 3 km north of the start. Straight-line distance = √(16 + 9) = 5 km.)

## Speed, Time & Work

_Trains, boats, taps and teamwork._

**Gentle**

Uma drives to a hill town at 45 km/h and comes back on the same road at 30 km/h.

What is the average speed for the whole trip?

Answer: **36** (For equal distances the average is the harmonic mean: 2 ÷ (1/45 + 1/30) = 36 km/h, not the simple average 38.)

**Medium**

A boat goes 52 km downstream in 2 hours and 54 km upstream in 3 hours.

What is the boat's speed in still water?

Answer: **22** (Downstream 26 km/h, upstream 18 km/h. The boat's own speed is their average: 22 km/h (the current is 4).)

**Tricky**

A boat goes 18 km downstream in 1 hour and 32 km upstream in 4 hours.

What is the boat's speed in still water?

Answer: **13** (Downstream 18 km/h, upstream 8 km/h. The boat's own speed is their average: 13 km/h (the current is 5).)

## Truth & Lies

_Some always tell the truth. Some never do._

**Gentle**

In the hall of mirrors, every knight always tells the truth and every knave always lies. You meet Kabir, Diya and Dev.

- Kabir: “Exactly one of Dev and Diya is a knight.”
- Diya: “Dev never tells the truth.”
- Dev: “Don't trust Kabir.”

Exactly one of them is a knave. Who?

Options: Kabir · Diya · Dev

Answer: **Dev** (Only one arrangement fits every statement: Kabir and Diya tell the truth, and the rest lie. So the answer is Dev.)

**Medium**

On the ferry to Twin Rock, every truth-teller always tells the truth and every liar always lies. You meet Rhea, Zoya and Ved.

- Rhea: “Ved never tells the truth.”
- Zoya: “Ved and Rhea are the same kind.”
- Ved: “Zoya never tells the truth.”

Exactly one of them is a truth-teller. Who?

Options: Rhea · Zoya · Ved

Answer: **Ved** (Only one arrangement fits every statement: Ved tells the truth, and the rest lie. So the answer is Ved.)

**Tricky**

On the ferry to Twin Rock, every knight always tells the truth and every knave always lies. You meet Asha, Ira, Tara and Chitra.

- Asha: “At least one of Ira and Chitra is a knave.”
- Ira: “Tara always tells the truth.”
- Tara: “At least one of Asha and Ira is a knave.”
- Chitra: “Exactly one of Asha and Ira is a knight.”

Exactly one of them is a knave. Who?

Options: Asha · Ira · Tara · Chitra

Answer: **Asha** (Only one arrangement fits every statement: Ira and Tara and Chitra tell the truth, and the rest lie. So the answer is Asha.)

## Number Series

_Spot the pattern, find what comes next._

**Gentle**

Gauri writes a pattern with rangoli dots: 1, 3, 9, 27, 81, …

What comes next?

Answer: **243** (Each term is 3 times the one before. Next: 243.)

**Medium**

Dev writes a pattern on the fridge with magnets: 51, 66, 83, 102, 123, …

What comes next?

Answer: **146** (They are the squares 7², 8², 9², … plus 2. Next: 146.)

**Tricky**

Om writes a pattern with rangoli dots: 3, 8, 18, 38, 78, 158, …

What comes next?

Answer: **318** (Each term is 2 × the previous one plus 2. Next: 318.)

## Odd One Out

_Four follow a rule. One doesn't._

**Gentle**

Vihaan lays five cards on the table: 57, 23, 47, 16, 39.

Which card is the odd one out?

Options: 57 · 23 · 47 · 16 · 39

Answer: **16** (All the others are odd; 16 isn't.)

**Medium**

Sameer lays five cards on the table: 11, 77, 3, 161, 151.

Which card is the odd one out?

Options: 11 · 77 · 3 · 161 · 151

Answer: **3** (All the others read the same backwards; 3 doesn't.)

**Tricky**

Pooja lays five cards on the table: 2 → 5, 4 → 9, 6 → 13, 7 → 15, 3 → 10.

Which card is the odd one out?

Options: 2 → 5 · 4 → 9 · 6 → 13 · 7 → 15 · 3 → 10

Answer: **3 → 10** (In all the others the second number is double the first, plus one; in 3 → 10 it isn't.)

## Number Puzzles

_Remainders, divisors, cycles and LCMs._

**Gentle**

Look at the whole numbers from 1 to 850.

How many are divisible by 5?

Answer: **170** (By inclusion–exclusion the count is 170.)

**Medium**

Three temple bells ring every 28, 10 and 40 minutes. They all ring together at 6:00 am.

After how many minutes will they next ring together?

Answer: **280** (LCM(28, 10, 40) = 280 minutes.)

**Tricky**

481! means 481 × 480 × … × 2 × 1.

How many zeros does 481! end with?

Answer: **118** (⌊481/5⌋ + ⌊481/25⌋ + ⌊481/125⌋ + ⌊481/625⌋ = 118.)

## Read the Table

_Read the table, dodge the trap._

**Gentle**

Electric scooters sold (hundreds), 2020–2021:

|  | 2020 | 2021 |
|---|---|---|
| Chennai | 180 | 235 |
| Mumbai | 70 | 55 |
| Kolkata | 85 | 85 |

What is the combined total for 2020?

Answer: **335** (180 + 70 + 85 = 335.)

**Medium**

Students placed by college, 2021–2023:

|  | 2021 | 2022 | 2023 |
|---|---|---|---|
| Deodar | 165 | 200 | 260 |
| Cedar | 30 | 25 | 40 |
| Aster | 200 | 290 | 275 |
| Banyan | 140 | 155 | 185 |

Which had the highest absolute increase from 2022 to 2023?

Options: Deodar · Cedar · Aster · Banyan

Answer: **Deodar** (Deodar: 60, Cedar: 15, Aster: -15, Banyan: 30. Highest: Deodar.)

**Tricky**

Electric scooters sold (hundreds), 2018–2020:

|  | 2018 | 2019 | 2020 |
|---|---|---|---|
| Delhi | 200 | 270 | 295 |
| Kolkata | 135 | 110 | 170 |
| Chennai | 180 | 235 | 270 |
| Pune | 70 | 65 | 70 |

What is Delhi's average over the 3 years?

Answer: **255** ((200 + 270 + 295) ÷ 3 = 255.)

## Coins & Weighings

_One fake coin and a trusty pan balance._

**Gentle**

Kavya has 13 rice sacks that look identical, but one sack is a little heavier.

Using only a pan balance, what is the fewest weighings that always finds the heavy one?

Answer: **3** (One weighing can sort up to 3 suspects, two up to 9, three up to 27, four up to 81. 13 needs 3.)

**Medium**

Bilal has 8 laddoos (one hides an extra cashew), labelled A to H. One is fake: it is a little lighter. The pan balance shows:

- A C D H vs B E F G: the left pan goes down.
- B F vs G H: they balance.

Which one is fake?

Options: D · E · C · H

Answer: **E** (Only E fits every weighing: each result is exactly what E being lighter would produce.)

**Tricky**

Uma has 6 marbles, labelled A to F. One is fake: it is either heavier or lighter, nobody knows which. The pan balance shows:

- A F vs D E: the right pan goes down.
- A B vs D F: the right pan goes down.
- A vs F: the right pan goes down.

Which one is fake, and is it heavier or lighter?

Options: B, lighter · B, heavier · A, lighter · C, heavier

Answer: **A, lighter** (Only A, lighter fits every weighing: each result is exactly what A being lighter would produce.)

## Matchsticks

_Move one stick to make the sum true._

**Gentle**

Pooja lays out matchsticks at the chai stall: 0 − 4 = 2. That isn't true!

_(shown as a picture in the app)_

Move exactly one matchstick to make it true. What does it say now?

Answer: **6 − 4 = 2** (Move one stick inside the “0” to turn it into a “6”: 6 − 4 = 2 ✓)

**Medium**

Kiran lays out matchsticks at the chai stall: 6 + 5 = 5. That isn't true!

_(shown as a picture in the app)_

Move exactly one matchstick to make it true. What does it say now?

Answer: **0 + 5 = 5** (Move one stick inside the “6” to turn it into a “0”: 0 + 5 = 5 ✓)

**Tricky**

Mira lays out matchsticks on the dining table: 65 − 5 = 00. That isn't true!

_(shown as a picture in the app)_

Move exactly one matchstick to make it true. What does it say now?

Answer: **65 − 5 = 60** (Move one stick inside the “0” to turn it into a “6”: 65 − 5 = 60 ✓)

## Ratios & Mixtures

_Blends, ages and shares._

**Gentle**

₹46,500 is shared among Bilal, Leela and Kavya. Bilal : Leela = 6 : 1 and Leela : Kavya = 4 : 3.

How much does Kavya get?

Answer: **₹4500** (Bilal : Leela : Kavya = 24 : 4 : 3. Kavya gets 3/31 of ₹46,500 = ₹4,500.)

**Medium**

A grocer has 70 kg of cashews costing ₹65 per kg, and a cheaper kind costing ₹30.

How many kg of the cheaper kind must be mixed in so the blend costs ₹55 per kg?

Answer: **28** (Dearer : cheaper = 25 : 10. With 70 of the dearer one, the cheaper amount is 70 × 10 ÷ 25 = 28.)

**Tricky**

A grocer has 15 kg of cashews costing ₹115 per kg, and a cheaper kind costing ₹75.

How many kg of the cheaper kind must be mixed in so the blend costs ₹85 per kg?

Answer: **45** (Dearer : cheaper = 10 : 30. With 15 of the dearer one, the cheaper amount is 15 × 30 ÷ 10 = 45.)

## Logic Grid

_Cross out the impossible._

**Gentle**

Gauri, Sana and Dev each have a different drink: chai, coffee, cocoa.

- Dev drinks cocoa.
- Sana doesn't drink chai.

Who drinks coffee?

Options: Gauri · Sana · Dev

Answer: **Sana** (Only one full arrangement fits: Gauri: chai; Sana: coffee; Dev: cocoa. So the answer is Sana.)

**Medium**

Aditi, Sana and Diya each have a different hobby and a different kite colour: cricket, chess, painting · purple, orange, teal.

- Sana's kite is purple.
- Aditi doesn't do painting.
- The orange kite's flyer is not the one who loves cricket.
- The one who loves chess is also the teal kite's flyer.

Who flies the orange kite?

Options: Aditi · Sana · Diya

Answer: **Diya** (Only one full arrangement fits: Aditi: chess, teal; Sana: cricket, purple; Diya: painting, orange. So the answer is Diya.)

**Tricky**

Aditi, Tejas, Noor and Diya each have a different drink and a different hobby: lassi, coffee, cocoa, chai · painting, chess, dancing, baking.

- Aditi doesn't do chess.
- Tejas doesn't do chess.
- The cocoa drinker is also the one who loves chess.
- Noor's hobby is painting.

Who drinks cocoa?

Options: Aditi · Tejas · Noor · Diya

Answer: **Diya** (Only one full arrangement fits: Aditi: coffee, dancing; Tejas: lassi, baking; Noor: chai, painting; Diya: cocoa, chess. So the answer is Diya.)

## Tournaments

_Fixtures, knockouts and who can still top the table._

**Gentle**

In Zoya's colony antakshari league, 10 teams each play every other team exactly once.

How many matches are there in total?

Answer: **45** (Pairs of teams = 10 × 9 ÷ 2 = 45, so 45.)

**Medium**

Diya runs a knockout gully-cricket tournament for 48 players. Losers go out; when a round has an odd number, one player gets a free pass.

How many matches are played in all?

Answer: **47** (48 players, one champion: 47 players must lose once each, so 47 matches.)

**Tricky**

The chess league table, with every team due to play every other once (win 3, draw 1, loss 0):

- Still to play: Tiffin Tigers vs Kite Flyers
- Still to play: Lotus United vs Kite Flyers
- Still to play: Tiffin Tigers vs Mango Lane

| Team | Played | Points |
|---|---|---|
| Tiffin Tigers | 1 | 3 |
| Lotus United | 2 | 3 |
| Kite Flyers | 1 | 3 |
| Mango Lane | 2 | 0 |

Which team can no longer finish top, even sharing first place?

Options: Tiffin Tigers · Lotus United · Kite Flyers · Mango Lane

Answer: **Mango Lane** (Even winning all its games, Mango Lane can't catch the leaders; every other team has a way to finish top.)

## Is the Info Enough?

_You don't need the answer, just whether you could get it._

**Gentle**

The question: “How old is Mira?”

- Statement 1: The digits of Mira's age add up to 6.
- Statement 2: Mira is older than 49 but younger than 53.

Is the information enough to answer it?

Options: Statement 1 alone is enough · Statement 2 alone is enough · Either statement alone is enough · Both together are needed · Not enough even together

Answer: **Both together are needed** (Statement 1 alone still leaves many options. Statement 2 alone still leaves 50 or 51 or 52. Together they pin it down (51). So: both together are needed.)

**Medium**

Lata and Tejas share a box of sweets. The question: “How many sweets does Lata have?”

- Statement 1: Lata has 7 more than Tejas.
- Statement 2: Together they have 43 sweets.

Is the information enough to answer it?

Options: Statement 1 alone is enough · Statement 2 alone is enough · Either statement alone is enough · Both together are needed · Not enough even together

Answer: **Both together are needed** (Statement 1 alone still leaves many options. Statement 2 alone still leaves many options. Together they pin it down (25). So: both together are needed.)

**Tricky**

Hari and Ira share a box of sweets. The question: “How many sweets do Hari and Ira have together?”

- Statement 1: Together they have 37 sweets.
- Statement 2: Ira has fewer than 13.

Is the information enough to answer it?

Options: Statement 1 alone is enough · Statement 2 alone is enough · Either statement alone is enough · Both together are needed · Not enough even together

Answer: **Statement 1 alone is enough** (Statement 1 alone pins it down (37). Statement 2 alone still leaves many options. Together they pin it down (37). So: statement 1 alone is enough.)

## Counting & Chance

_Plan for the unluckiest draw._

**Gentle**

A closed tin holds 2 white and 9 red ribbons. You can't see the colours.

How many must you take out to be sure of at least 2 of the same colour?

Answer: **3** (The unluckiest draw can hold 2 ribbons and still miss at least 2 of the same colour. One more makes it certain: 3.)

**Medium**

A dark drawer holds 2 black, 9 pink and 2 red socks.

You take one without looking. What is the chance it is black?

Options: 2/11 · 2/14 · 2/13 · 1/3

Answer: **2/13** (2 of the 13 are black, which is 2/13.)

**Tricky**

A cloth bag holds 2 red, 4 green, 4 white and 7 black bangles. You can't see the colours.

How many must you take out to be sure of two of different colours?

Answer: **8** (The unluckiest draw can hold 7 bangles and still miss two of different colours. One more makes it certain: 8.)

## Clocks & Calendars

_Hands, hours and weekdays._

**Gentle**

A wristwatch shows 2:35.

What is the smaller angle between the hour hand and the minute hand, in degrees?

Answer: **132.5** (The minute hand is at 210°, the hour hand at 77.5°. The smaller gap is 132.5°.)

**Medium**

A cake goes into the oven at 05:35 and comes out at 07:52 the same day (24-hour clock).

How many minutes does it take?

Answer: **137** (From 05:35 to 07:52 is 2 h 17 min, which is 137 minutes.)

**Tricky**

The classroom clock shows 1:59.

What is the smaller angle between the hour hand and the minute hand, in degrees?

Answer: **65.5** (The minute hand is at 354°, the hour hand at 59.5°. The smaller gap is 65.5°.)
