// Checks the feed wiring: every game appears exactly once, every card has metadata,
// the archive window is 31 distinct days, and feed.js stays inert without a #feed element.
const fs = require("fs"), vm = require("vm");
const nodes = new Map();
function element() {
  return { textContent: "", innerHTML: "", value: "", open: false, children: [], dataset: {}, querySelectorAll: () => [], classList: { add() {}, remove() {}, toggle() {} }, append(b) { this.children.push(b); }, showModal() { this.open = true; }, close() { this.open = false; } };
}
const document = { querySelector(s) { if (!nodes.has(s)) nodes.set(s, element()); return nodes.get(s); }, querySelectorAll: () => [], createElement: () => element(), addEventListener() {}, getElementById: () => null };
const context = { document, localStorage: { getItem: () => null, setItem: () => {} }, window: {}, setInterval: () => {} };
vm.createContext(context);
for (const f of ["valid-words.js", "app.js", "daily-content.js", "photos.js", "extras.js", "stories.js", "ladders.js", "sparks.js", "lanterns.js", "beds.js", "places.js", "globe.js", "aha.js", "feed.js"]) vm.runInContext(fs.readFileSync("dist/" + f, "utf8"), context);
const result = vm.runInContext(`
const fail = (m) => { throw Error(m); };
const expect = [[0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 12, 13, 15, 17, 18, 19, 20, 22, 23, 24], [0, 2, 3, 5, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 23, 24], [0, 2, 3, 5, 8, 9, 10, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]];
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
if (window.FEED_MODE) fail("feed.js must stay inert without #feed");
const d = "2026-05-05"; all[progressKey(d)] = { games: { 0: { done: true }, 3: { done: true }, 9: { done: true }, 16: { done: true } } };
if (feedCount(d) !== 4) fail("feedCount should count all 20 cards");
// Next unsolved: skips solved cards, ignores revealed answers, moves on to older days, wraps to today.
{ const from = "2026-06-10", order = feedOrder(), y = feedDate(1, from), keep = JSON.stringify(all);
  for (const k of Object.keys(all)) delete all[k];
  let n = feedNextUnsolved(undefined, undefined, from);
  if (n.d !== from || n.i !== order[0] || n.offset !== 0) fail("next unsolved should start at today's first card");
  all[progressKey(from)] = { games: { [order[1]]: { done: true }, [order[2]]: { credit: true }, [order[3]]: { done: true, revealed: 1 } } };
  n = feedNextUnsolved(from, order[0], from);
  if (n.i !== order[3]) fail("next unsolved should skip solved and credit cards but not revealed ones: " + n.i);
  all[progressKey(from)].games = Object.fromEntries(order.map((i) => [i, { done: true }]));
  n = feedNextUnsolved(from, order[5], from);
  if (n.d !== y || n.i !== order[0] || n.offset !== 1) fail("next unsolved should move on to yesterday");
  all[progressKey(y)] = { games: Object.fromEntries(order.slice(0, 4).map((i) => [i, { done: true }])) };
  delete all[progressKey(from)].games[order[2]];
  n = feedNextUnsolved(feedDate(FEED_DAYS - 1, from), order.at(-1), from);
  if (n.d !== from || n.i !== order[2]) fail("next unsolved should wrap round to today");
  for (let k = 0; k < FEED_DAYS; k++) all[progressKey(feedDate(k, from))] = { games: Object.fromEntries(order.map((i) => [i, { done: true }])) };
  if (feedNextUnsolved(from, order[0], from) !== null) fail("next unsolved should be null when everything is solved");
  for (const k of Object.keys(all)) delete all[k]; Object.assign(all, JSON.parse(keep)); }
all[progressKey(d)].games[7] = { done: true };
if (feedCount(d) !== 4) fail("old Starlines saves must not count or break");
if (Object.entries(all[progressKey(d)].games).filter(([i, g]) => +i < 5 && g.done).length !== 2) fail("legacy 5-game count changed");
feedOrder(0).length + "/" + feedOrder(1).length + "/" + feedOrder(2).length + " cards (Gentle/Medium/Tricky) × " + FEED_DAYS + " days";
`, context);
if (!fs.readFileSync("dist/feed.js", "utf8").includes("Created with love from Devansh")) throw Error("note card message missing");
console.log("Feed OK:", result);
