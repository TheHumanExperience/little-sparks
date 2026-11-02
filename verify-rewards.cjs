// Checks the small-rewards rules in feed.js: deterministic ~5% shiny cards, the daily flow
// meter, escalating bursts, milestone mapping and the rising chime.
const fs = require("fs"), vm = require("vm");
function element() {
  return { textContent: "", innerHTML: "", value: "", open: false, children: [], dataset: {}, querySelectorAll: () => [], classList: { add() {}, remove() {}, toggle() {} }, append(b) { this.children.push(b); }, showModal() {}, close() {} };
}
const nodes = new Map();
const document = { querySelector(s) { if (!nodes.has(s)) nodes.set(s, element()); return nodes.get(s); }, querySelectorAll: () => [], createElement: () => element(), addEventListener() {}, getElementById: () => null };
const context = { document, localStorage: { getItem: () => null, setItem: () => {} }, window: {}, setInterval: () => {} };
vm.createContext(context);
for (const f of ["valid-words.js", "app.js", "daily-content.js", "photos.js", "extras.js", "constellations.js", "stories.js", "ladders.js", "sparks.js", "aha.js", "feed.js"]) vm.runInContext(fs.readFileSync("dist/" + f, "utf8"), context);
const result = vm.runInContext(`
const fail = (m) => { throw Error(m); };
// Shiny cards
let shiny = 0, total = 0, days = new Set(), perDay = [];
const start = new Date("2026-01-01T12:00:00");
for (let o = 0; o < 366; o++) {
  const t = new Date(start); t.setDate(t.getDate() + o);
  const d = t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0");
  days.add(d);
  const set = FEED_ORDER.filter((i) => isShiny(d, i));
  for (const i of FEED_ORDER) { total++; if (isShiny(d, i) !== isShiny(d, i)) fail("shiny not deterministic " + d + " " + i); }
  shiny += set.length; perDay.push(set.join(","));
}
if (days.size !== 366) fail("expected 366 distinct days");
const rate = shiny / total;
if (rate < 0.035 || rate > 0.065) fail("shiny rate out of range: " + rate);
if (new Set(perDay.filter(Boolean)).size < 40) fail("shiny cards barely vary across days");
for (const i of FEED_ORDER) if (!perDay.some((s) => s.split(",").includes(String(i)))) fail("game " + i + " is never shiny");
// Flow meter
const D = "2026-05-05";
let f = flowStep(null, {}, D);
if (f.value !== 0 || f.golden || f.date !== D) fail("fresh flow must be empty");
for (let k = 1; k <= 4; k++) { f = flowStep(f, { type: "solve", key: "a" + k }, D); if (f.value !== k || f.golden) fail("solve should add 1"); }
const before = JSON.stringify(f);
let h = flowStep(f, { type: "hint", key: "b" }, D);
if (JSON.stringify(f) !== before) fail("flowStep mutated its input");
if (h.value !== 2) fail("hint should drain 2");
h = flowStep(h, { type: "hint", key: "b" }, D);
if (h.value !== 2) fail("second hint on the same puzzle must not drain again");
h = flowStep(h, { type: "solve", key: "b" }, D);
if (h.value !== 2) fail("a hinted puzzle must not add flow");
let z = flowStep(flowStep(null, { type: "hint", key: "x" }, D), { type: "hint", key: "y" }, D);
if (z.value !== 0) fail("flow must not go below 0");
f = flowStep(f, { type: "solve", key: "a5" }, D);
if (f.value !== FLOW_MAX || !f.golden) fail("full bar must turn golden");
f = flowStep(f, { type: "hint", key: "c" }, D);
if (!f.golden || f.value !== FLOW_MAX) fail("golden must not drain");
if (flowStep(f, { type: "solve", key: "q" }, D).value > FLOW_MAX) fail("flow capped at max");
const next = flowStep(f, {}, "2026-05-06");
if (next.golden || next.value !== 0 || next.hinted.length) fail("flow must reset on a new day");
// Bursts, milestones, chimes
let prev = 0;
for (let s = 1; s <= 30; s++) { const b = burstSize(s); if (b < prev || b > 76) fail("burst not monotonic/capped"); prev = b; }
if (burstSize(1) !== 28 || burstSize(30) !== 76) fail("burst bounds changed");
if (milestoneFor(5) !== "five" || milestoneFor(10) !== "ten" || milestoneFor(FEED_ORDER.length) !== "all" || milestoneFor(17) || milestoneFor(4) || milestoneFor(11)) fail("milestones wrong");
for (let s = 2; s <= 10; s++) if (!(chimeFreq(s) > chimeFreq(s - 1))) fail("chime must rise up to streak 10");
if (chimeFreq(15) !== chimeFreq(10)) fail("chime must cap at streak 10");
// Clear & retry isolation
const snap = (o) => JSON.stringify(o);
const lvl = difficulty;
difficulty = 1;
const A = "2026-05-05", B = "2026-05-04";
all[progressKey(A)] = { games: { 7: { started: true, pot: [1, 0, 2] }, 8: { done: true, stars: 3, moves: [1] }, 9: { started: true } } };
all[progressKey(B)] = { games: { 7: { started: true, pot: [4] } } };
difficulty = 2; all[progressKey(A)] = { games: { 7: { done: true } } }; difficulty = 1;
const other = snap({ b: all[progressKey(B)], t: all[A + "-level-2"], g9: all[progressKey(A)].games[9] });
let u = clearPuzzle(all, A, 7);
if (7 in all[progressKey(A)].games || feedDone(A, 7)) fail("unsolved clear must remove the puzzle state");
if (snap(u.prev) !== snap({ started: true, pot: [1, 0, 2] })) fail("clear must return the previous state for undo");
all[u.key].games[u.i] = u.prev;
if (all[progressKey(A)].games[7].pot[2] !== 2) fail("undo must restore the state");
u = clearPuzzle(all, A, 8);
if (snap(all[progressKey(A)].games[8]) !== snap({ credit: true })) fail("solved clear must leave only a credit marker");
if (!feedDone(A, 8) || feedCount(A) !== 1) fail("solved credit must still count after clear");
all[progressKey(A)].games[8].done = true; clearPuzzle(all, A, 8);
if (snap(all[progressKey(A)].games[8]) !== snap({ credit: true }) || feedCount(A) !== 1) fail("replay solve must not add another credit");
if (snap({ b: all[progressKey(B)], t: all[A + "-level-2"], g9: all[progressKey(A)].games[9] }) !== other) fail("clear touched another day, level or game");
clearPuzzle(all, "2026-05-01", 3);
if (snap(all[progressKey("2026-05-01")]) !== snap({ games: {} })) fail("clearing an untouched puzzle must be harmless");
difficulty = lvl;
(rate * 100).toFixed(2) + "% shiny (" + shiny + "/" + total + ")";
`, context);
const html = fs.readFileSync("dist/index.html", "utf8");
for (const id of ["soundPill", "flowBar"]) if (!html.includes(`id="${id}"`)) throw Error("missing #" + id);
console.log("PASS: rewards —", result, "; flow meter, bursts, milestones, chimes and clear & retry isolation");
