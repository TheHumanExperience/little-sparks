// Checks the feed wiring: every game appears exactly once, every card has metadata,
// the daily warm-up opener rotates, the archive window is 31 distinct days, and feed.js stays inert without a #feed element.
const fs = require("fs"), vm = require("vm");
const { context } = require("./tests/load-app.cjs").loadApp();
const result = vm.runInContext(`
const fail = (m) => { throw Error(m); };
// Without a date the feed is today's set: Time Lens (5) and Time Lens Duel (15) before NEW_GAMES_FROM, their slots' new games from it.
const expect = [[0, 1, 2, 3, 4, 6, 8, 9, 10, 12, 13, 17, 18, 19, 20, 22, 23, 24], [0, 2, 3, 8, 9, 10, 11, 12, 13, 14, 16, 17, 18, 19, 20, 22, 23, 24], [0, 2, 3, 8, 9, 10, 12, 13, 14, 16, 17, 18, 19, 20, 21, 22, 23, 24]]
  .map((a, lv) => [...a, feedSlot([5, 25], lv, today()), feedSlot([15, 26], lv, today())].sort((x, y) => x - y));
for (const lv of [0, 1, 2]) {
  const order = feedOrder(lv), sorted = [...order].sort((a, b) => a - b).join(",");
  if (sorted !== expect[lv].join(",")) fail("level " + lv + " feed must hold " + expect[lv] + " exactly once: " + sorted);
  if (order.includes(7)) fail("Starlines must be retired");
  for (const i of order) { const g = feedGame(i); if (!g || !g.name || !g.type || !g.art) fail("missing metadata for game " + i); }
  const ahaPos = AHA_SLOTS.map((i) => order.indexOf(i)).sort((a, b) => a - b);
  if (ahaPos.some((p, k) => k && p - ahaPos[k - 1] !== 1)) fail("Aha cards must sit together as one block at level " + lv);
  for (const [fam, ids] of Object.entries(FEED_FAMILIES)) {
    if (order.filter((i) => ids.includes(i)).length !== 1) fail(fam + " must show exactly one variant at level " + lv);
    for (const i of ids) if (feedSibling(i, lv) !== ids[lv]) fail("feedSibling maps " + i + " wrongly at level " + lv);
  }
}
const names = (lv) => feedOrder(lv).filter((i) => !AHA_SLOTS.includes(i)).map((i) => feedGame(i).name).join("|");
if (!names(0).includes("Pocket Sudoku") || !names(1).includes("Sudoku Six") || !names(2).includes("Sudoku Six · Hard")) fail("sudoku family per level");
for (const lv of [0, 1, 2]) { const o = feedOrder(lv), k = o.indexOf(12); if (k < 1 || o[k - 1] !== FEED_FAMILIES.sudoku[lv]) fail("Killer Six must follow the sudoku card at level " + lv); }
if (feedOrder(0).length !== 20) fail("20 cards per level");
for (const lv of [0, 1, 2]) { const o = feedOrder(lv); if (o[o.indexOf(10) + 1] !== 22) fail("Lantern Lanes follows Mirror Garden at level " + lv); if (o[o.indexOf(13) + 1] !== 23) fail("Garden Beds follows Letterlight Ladder at level " + lv); }
if (!names(0).includes("Bloom Trail|") && !names(0).includes("|Bloom Trail")) fail("Gentle needs Bloom Trail");
if (!names(1).includes("Bloom Trail 5×5") || !names(2).includes("Bloom Trail 5×5") || !names(0).includes("Little Neighbours") || !names(2).includes("Neighbours Goal")) fail("bloom/neighbours family per level");
for (const i of [8, 9, 10, 11, 12, 13, 14, 15, 16, 21, 22, 23, 24]) if (typeof SPARKS[i].render !== "function") fail("no renderer for spark " + i);
for (const from of ["2026-01-01", "2026-03-29", "2026-10-25", "2026-12-31"]) {
  const ds = Array.from({ length: FEED_DAYS }, (_, o) => feedDate(o, from));
  if (ds[0] !== from) fail("offset 0 must be the start day");
  if (new Set(ds).size !== FEED_DAYS) fail("feed days repeat around " + from);
  for (let k = 1; k < ds.length; k++) if (!(ds[k] < ds[k - 1])) fail("feed days not descending around " + from);
}
// Daily opener: a warm-up leads (the Aha block moves whole), Letterlight takes its old place, nothing else moves.
if (FEED_PLAN[0] !== 0) fail("FEED_PLAN must start with Letterlight (the opener takes its place)");
for (const x of FEED_OPENERS) if (x !== "aha" && !FEED_PLAN.includes(x)) fail("opener " + x + " must be in FEED_PLAN or be aha");
const openerChecks = (end) => { for (const lv of [0, 1, 2]) {
  const seen = new Set();
  for (let k = 0; k < 400; k++) {
    const d = feedDate(k, end), o = feedOrder(lv, d), pick = feedOpener(d, lv), base = feedPlan(lv, d);
    const lead = pick === "aha" ? base.filter((i) => AHA_SLOTS.includes(i)) : [typeof pick === "string" ? FEED_FAMILIES[pick][lv] : pick];
    if (o.join() !== feedOrder(lv, d).join()) fail("opener not deterministic on " + d);
    if (o.slice(0, lead.length).join() !== lead.join()) fail("opener " + pick + " must lead on " + d + " level " + lv);
    if (o[0] === 0) fail("Letterlight must not open on " + d);
    if ([...o].sort((a, b) => a - b).join() !== [...base].sort((a, b) => a - b).join()) fail("dated order lost a card on " + d);
    const ahaPos = AHA_SLOTS.map((i) => o.indexOf(i)).sort((a, b) => a - b);
    if (ahaPos.some((p, j) => j && p - ahaPos[j - 1] !== 1)) fail("Aha block split on " + d);
    if (o[o.indexOf(12) - 1] !== FEED_FAMILIES.sudoku[lv]) fail("Killer Six must follow sudoku on " + d);
    const others = (a) => a.filter((i) => i !== 0 && !lead.includes(i)).join();
    if (others(o) !== others(base)) fail("only the opener and Letterlight may move on " + d);
    const after = base.slice(base.indexOf(lead.at(-1)) + 1).find((i) => i !== 0);
    if (after !== undefined && o[o.indexOf(0) + 1] !== after) fail("Letterlight must take the opener's old place on " + d);
    if (k && pick === feedOpener(feedDate(k - 1, end), lv)) fail("same opener two days running at level " + lv);
    if (k < FEED_OPENERS.length) seen.add(pick);
  }
  if (seen.size !== FEED_OPENERS.length) fail("every opener must come round within " + FEED_OPENERS.length + " days");
} };
openerChecks("2026-12-31");
if (window.FEED_MODE) fail("feed.js must stay inert without #feed");
const d = "2026-05-05"; all[progressKey(d)] = { games: { 0: { done: true }, 3: { done: true }, 9: { done: true }, 16: { done: true } } };
if (feedCount(d) !== 4) fail("feedCount should count all 20 cards");
// Next unsolved: skips solved cards, ignores revealed answers, moves on to older days, wraps to today.
{ const from = "2026-06-10", order = feedOrder(difficulty, from), y = feedDate(1, from), yOrder = feedOrder(difficulty, y), keep = JSON.stringify(all);
  for (const k of Object.keys(all)) delete all[k];
  let n = feedNextUnsolved(undefined, undefined, from);
  if (n.d !== from || n.i !== order[0] || n.offset !== 0) fail("next unsolved should start at today's first card");
  all[progressKey(from)] = { games: { [order[1]]: { done: true }, [order[2]]: { credit: true }, [order[3]]: { done: true, revealed: 1 } } };
  n = feedNextUnsolved(from, order[0], from);
  if (n.i !== order[3]) fail("next unsolved should skip solved and credit cards but not revealed ones: " + n.i);
  all[progressKey(from)].games = Object.fromEntries(order.map((i) => [i, { done: true }]));
  n = feedNextUnsolved(from, order[5], from);
  if (n.d !== y || n.i !== yOrder[0] || n.offset !== 1) fail("next unsolved should move on to yesterday");
  all[progressKey(y)] = { games: Object.fromEntries(yOrder.slice(0, 4).map((i) => [i, { done: true }])) };
  delete all[progressKey(from)].games[order[2]];
  n = feedNextUnsolved(feedDate(FEED_DAYS - 1, from), feedOrder(difficulty, feedDate(FEED_DAYS - 1, from)).at(-1), from);
  if (n.d !== from || n.i !== order[2]) fail("next unsolved should wrap round to today");
  // A card's own Next stays inside its day: it wraps back to the day's gaps and is null once the day is complete.
  all[progressKey(from)].games = Object.fromEntries(order.filter((_, n) => n !== 2 && n !== order.length - 1).map((i) => [i, { done: true }]));
  if (feedNextInDay(from, order[5]) !== order.at(-1)) fail("next in day should go to the day's later gap");
  all[progressKey(from)].games[order.at(-1)] = { done: true };
  if (feedNextInDay(from, order.at(-1)) !== order[2]) fail("solving the last card should wrap back to the day's earlier gap, not another day");
  all[progressKey(from)].games[order[2]] = { done: true };
  if (feedNextInDay(from, order.at(-1)) !== null) fail("a complete day has no next in day (Next goes on to the note card)");
  for (let k = 0; k < FEED_DAYS; k++) all[progressKey(feedDate(k, from))] = { games: Object.fromEntries(feedOrder(difficulty, feedDate(k, from)).map((i) => [i, { done: true }])) };
  if (feedNextUnsolved(from, order[0], from) !== null) fail("next unsolved should be null when everything is solved");
  for (const k of Object.keys(all)) delete all[k]; Object.assign(all, JSON.parse(keep)); }
// Where in the World joins on 2026-11-10: earlier days keep their 19 cards and their full-day count.
for (const lv of [0, 1, 2]) {
  if (feedOrder(lv, "2026-11-09").length !== 19 || feedOrder(lv, "2026-11-09").includes(24)) fail("days before 2026-11-10 keep 19 cards at level " + lv);
  if (feedOrder(lv, "2026-11-10").length !== 20 || feedOrder(lv, "2026-11-10").at(-1) !== 24) fail("Where in the World joins on 2026-11-10 at level " + lv);
}
{ const old = "2026-11-08", keep = JSON.stringify(all);
  all[progressKey(old)] = { games: Object.fromEntries(feedOrder(difficulty, old).map((i) => [i, { done: true }])) };
  if (feedCount(old) !== 19 || milestoneFor(19, old) !== "all" || milestoneFor(19, "2026-11-10") === "all") fail("a finished earlier day still counts as all solved");
  const n = feedNextUnsolved(old, feedOrder(difficulty, old)[0], "2026-11-12");
  if (n && n.d === old) fail("next to play must not send you to a card an earlier day never had");
  for (const k of Object.keys(all)) delete all[k]; Object.assign(all, JSON.parse(keep)); }
// New-games cutover: on NEW_GAMES_FROM, Last Petal (25) and Code Garden (26) take the slots of Time Lens (5) and
// Time Lens Duel (15). Both sides are checked on the real date (2026-11-21) and, across 400 days, with a test date.
{ const real = NEW_GAMES_FROM, T = "2026-12-01", keep = JSON.stringify(all), slots = FEED_PLAN.filter(Array.isArray);
  const setCutover = (t) => { FEED_UNTIL[5] = FEED_UNTIL[15] = FEED_SINCE[25] = FEED_SINCE[26] = t; };
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(real)) fail("NEW_GAMES_FROM must be a YYYY-MM-DD date: " + real);
  if ([FEED_UNTIL[5], FEED_UNTIL[15], FEED_SINCE[25], FEED_SINCE[26]].some((t) => t !== real)) fail("FEED_UNTIL 5/15 and FEED_SINCE 25/26 must all be NEW_GAMES_FROM");
  if (slots.map((x) => x.join(">")).join() !== "5>25,15>26") fail("FEED_PLAN needs one slot each: 5>25 and 15>26");
  if (FEED_PLAN[FEED_PLAN.indexOf(slots[0]) - 1] !== "bloom" || FEED_PLAN[FEED_PLAN.indexOf(slots[1]) - 1] !== "neighbours") fail("Last Petal follows bloom and Code Garden follows neighbours");
  if (FEED_PLAN.flat().filter((x) => [5, 15, 25, 26].includes(x)).length !== 4) fail("5, 15, 25 and 26 must each appear once in FEED_PLAN");
  if (FEED_PLAN.flat().includes(7)) fail("retired index 7 must never be reused");
  const days = Array.from({ length: 400 }, (_, k) => feedDate(k, "2027-03-31"));
  // Each day's order without the new games (cutover moved past every test day), and with the real cutover.
  const orders = () => Object.fromEntries([0, 1, 2].map((lv) => [lv, days.map((d) => feedOrder(lv, d).join())]));
  setCutover("9999-12-31"); const before = orders(); setCutover(real); const live = orders();
  const swap = (o) => o.split(",").map(Number).map((i) => (i === 5 ? 25 : i === 15 ? 26 : i)).join();
  for (const lv of [0, 1, 2]) days.forEach((d, k) => { if (live[lv][k] !== (d < real ? before[lv][k] : swap(before[lv][k]))) fail("with the real cutover, days before it keep their order and later days swap in the new games: " + d + " at level " + lv); });
  // Real date: the day before NEW_GAMES_FROM keeps Time Lens, and from it the new games take its slots.
  const stubbed = [25, 26].filter((i) => !SPARKS[i]);
  for (const lv of [0, 1, 2]) for (const day of [feedDate(1, real), real]) {
    const o = feedOrder(lv, day);
    if (o.length !== 20) fail("20 cards on " + day + " at level " + lv);
    if (day < real && (!o.includes(5) || !o.includes(15) || o.includes(25) || o.includes(26))) fail("days before NEW_GAMES_FROM keep Time Lens at level " + lv);
    if (day === real && (o.includes(5) || o.includes(15) || !o.includes(25) || !o.includes(26))) fail("NEW_GAMES_FROM shows Last Petal and Code Garden in place of Time Lens at level " + lv);
    if (stubbed.some((i) => o.includes(i))) fail("a game that does not exist yet must never be in the feed: " + day);
  }
  if (stubbed.length) fail("Last Petal and Code Garden must both exist once NEW_GAMES_FROM is set");
  setCutover(T);
  if (stubbed.length === 2) for (const lv of [0, 1, 2]) { const o = feedOrder(lv, "2026-12-05"); if (o.length !== 20 || !o.includes(5) || !o.includes(15) || o.includes(25) || o.includes(26)) fail("before the new games exist their slots keep Time Lens at level " + lv); }
  for (const i of stubbed) SPARKS[i] = { name: "Stub " + i, type: "Stub", art: "·", render() {} };
  for (const lv of [0, 1, 2]) days.forEach((d, k) => {
    const o = feedOrder(lv, d), p = feedPlan(lv, d), n = d < "2026-11-10" ? 19 : 20, now = d >= T;
    if (o.length !== n || new Set(o).size !== n) fail(n + " distinct cards on " + d + " at level " + lv);
    if (now ? o.includes(5) || o.includes(15) || !o.includes(25) || !o.includes(26) : o.includes(25) || o.includes(26) || !o.includes(5) || !o.includes(15)) fail("wrong side of the cutover on " + d + " at level " + lv);
    if (!now && o.join() !== before[lv][k]) fail("days before the cutover must not change: " + d + " at level " + lv);
    if (now && o.join() !== swap(before[lv][k])) fail("the new games must take the old slots exactly on " + d + " at level " + lv);
    if (now && (p[p.indexOf(25) - 1] !== FEED_FAMILIES.bloom[lv] || p[p.indexOf(26) - 1] !== FEED_FAMILIES.neighbours[lv])) fail("slot positions on " + d);
  });
  openerChecks("2027-03-31");
  // Next to play across the cutover: today's new games and an earlier day's Time Lens are both reachable; stale saves don't count.
  const from = "2026-12-03", pre = feedDate(3, from);
  for (const k of Object.keys(all)) delete all[k];
  for (let k = 0; k < FEED_DAYS; k++) { const day = feedDate(k, from); all[progressKey(day)] = { games: Object.fromEntries(feedOrder(difficulty, day).map((i) => [i, { done: true }])) }; }
  delete all[progressKey(from)].games[26];
  let n = feedNextUnsolved(undefined, undefined, from);
  if (!n || n.d !== from || n.i !== 26) fail("next unsolved should find today's Code Garden");
  if (feedNextInDay(from, 25) !== 26 || feedNextInDay(from, 26) !== null) fail("next in day should handle the new games");
  all[progressKey(from)].games[26] = { done: true }; delete all[progressKey(pre)].games[5];
  n = feedNextUnsolved(from, feedOrder(difficulty, from)[0], from);
  if (!n || n.d !== pre || n.i !== 5) fail("next unsolved should reach an earlier day's Time Lens");
  if (feedNextInDay(pre, 15) !== 5) fail("next in day should handle Time Lens before the cutover");
  delete all[progressKey(from)].games[25]; all[progressKey(from)].games[5] = { done: true }; all[progressKey(from)].games[15] = { done: true };
  if (feedCount(from) !== 19 || milestoneFor(19, from) === "all") fail("Time Lens saves on a new-games day must not count");
  for (const i of stubbed) delete SPARKS[i];
  setCutover(real);
  for (const k of Object.keys(all)) delete all[k]; Object.assign(all, JSON.parse(keep));
  for (const lv of [0, 1, 2]) if (days.some((d, k) => feedOrder(lv, d).join() !== live[lv][k])) fail("restoring the real cutover must restore every day"); }
all[progressKey(d)].games[7] = { done: true };
if (feedCount(d) !== 4) fail("old Starlines saves must not count or break");
if (Object.entries(all[progressKey(d)].games).filter(([i, g]) => +i < 5 && g.done).length !== 2) fail("legacy 5-game count changed");
feedOrder(0).length + "/" + feedOrder(1).length + "/" + feedOrder(2).length + " cards (Gentle/Medium/Tricky) × " + FEED_DAYS + " days";
`, context);
if (!fs.readFileSync("dist/feed.js", "utf8").includes("For every mom doing the thinking for two")) throw Error("note card message missing");
console.log("Feed OK:", result);
