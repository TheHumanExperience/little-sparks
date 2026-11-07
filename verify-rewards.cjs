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
for (const f of ["valid-words.js", "app.js", "daily-content.js", "photos.js", "extras.js", "stories.js", "ladders.js", "sparks.js", "lanterns.js", "beds.js", "aha.js", "feed.js"]) vm.runInContext(fs.readFileSync("dist/" + f, "utf8"), context);
const result = vm.runInContext(`
const fail = (m) => { throw Error(m); };
// Shiny cards
let shiny = 0, total = 0, days = new Set(), perDay = [];
const start = new Date("2026-01-01T12:00:00");
for (let o = 0; o < 366; o++) {
  const t = new Date(start); t.setDate(t.getDate() + o);
  const d = t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0");
  days.add(d);
  const set = feedOrder().filter((i) => isShiny(d, i));
  for (const i of feedOrder()) { total++; if (isShiny(d, i) !== isShiny(d, i)) fail("shiny not deterministic " + d + " " + i); }
  shiny += set.length; perDay.push(set.join(","));
}
if (days.size !== 366) fail("expected 366 distinct days");
const rate = shiny / total;
if (rate < 0.035 || rate > 0.065) fail("shiny rate out of range: " + rate);
if (new Set(perDay.filter(Boolean)).size < 40) fail("shiny cards barely vary across days");
for (const i of feedOrder()) if (!perDay.some((s) => s.split(",").includes(String(i)))) fail("game " + i + " is never shiny");
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
if (milestoneFor(5) !== "five" || milestoneFor(10) !== "ten" || milestoneFor(feedOrder().length) !== "all" || milestoneFor(feedOrder().length + 1) || milestoneFor(16) || milestoneFor(4) || milestoneFor(11)) fail("milestones wrong");
for (let s = 2; s <= 10; s++) if (!(chimeFreq(s) > chimeFreq(s - 1))) fail("chime must rise up to streak 10");
if (chimeFreq(15) !== chimeFreq(10)) fail("chime must cap at streak 10");
// Clear & retry isolation
const snap = (o) => JSON.stringify(o);
const lvl = difficulty;
difficulty = 1;
const A = "2026-05-05", B = "2026-05-04";
all[progressKey(A)] = { games: { 10: { started: true, pot: [1, 0, 2] }, 8: { done: true, stars: 3, moves: [1] }, 9: { started: true } } };
all[progressKey(B)] = { games: { 10: { started: true, pot: [4] } } };
difficulty = 2; all[progressKey(A)] = { games: { 10: { done: true } } }; difficulty = 1;
const other = snap({ b: all[progressKey(B)], t: all[A + "-level-2"], g9: all[progressKey(A)].games[9] });
let u = clearPuzzle(all, A, 10);
if (10 in all[progressKey(A)].games || feedDone(A, 10)) fail("unsolved clear must remove the puzzle state");
if (snap(u.prev) !== snap({ started: true, pot: [1, 0, 2] })) fail("clear must return the previous state for undo");
all[u.key].games[u.i] = u.prev;
if (all[progressKey(A)].games[10].pot[2] !== 2) fail("undo must restore the state");
u = clearPuzzle(all, A, 8);
if (snap(all[progressKey(A)].games[8]) !== snap({ credit: true })) fail("solved clear must leave only a credit marker");
if (!feedDone(A, 8) || feedCount(A) !== 1) fail("solved credit must still count after clear");
all[progressKey(A)].games[8].done = true; clearPuzzle(all, A, 8);
if (snap(all[progressKey(A)].games[8]) !== snap({ credit: true }) || feedCount(A) !== 1) fail("replay solve must not add another credit");
if (snap({ b: all[progressKey(B)], t: all[A + "-level-2"], g9: all[progressKey(A)].games[9] }) !== other) fail("clear touched another day, level or game");
clearPuzzle(all, "2026-05-01", 3);
if (snap(all[progressKey("2026-05-01")]) !== snap({ games: {} })) fail("clearing an untouched puzzle must be harmless");
// Reveal answer: Gentle unlimited, Medium 5, Tricky 3 per calendar day and level; never counts.
const T = "2026-05-06";
let rv = null;
for (let k = 0; k < 40; k++) { const st = revealStep(rv, 0, A + ":" + k, T); if (!st.ok) fail("Gentle reveals must be unlimited"); rv = st.r; }
if (revealsLeft(rv, 0, T) !== Infinity) fail("Gentle should show no reveal count");
for (const [lv, lim] of [[1, 5], [2, 3]]) {
  if (revealsLeft(rv, lv, T) !== lim) fail("level " + lv + " should start with " + lim + " reveals");
  for (let k = 0; k < lim; k++) { const st = revealStep(rv, lv, A + ":" + k, T); if (!st.ok) fail("reveal " + k + " refused early"); rv = st.r; }
  if (revealsLeft(rv, lv, T) !== 0 || revealStep(rv, lv, A + ":99", T).ok) fail("level " + lv + " must stop at " + lim);
  if (!revealStep(rv, lv, A + ":0", T).ok || revealsLeft(rv, lv, T, A + ":0") <= 0) fail("re-revealing the same card must be free");
}
const rvBefore = snap(rv); revealStep(rv, 1, A + ":50", T);
if (snap(rv) !== rvBefore) fail("revealStep must not mutate its input");
if (revealsLeft(rv, 2, "2026-05-07") !== 3 || !revealStep(rv, 2, A + ":99", "2026-05-07").ok) fail("reveals must refresh on a new calendar day");
const R = "2026-05-08";
for (const lv of [0, 1, 2]) {
  difficulty = lv;
  for (let o = 0; o < 20; o++) {
    const t = new Date("2026-03-01T12:00:00"); t.setDate(t.getDate() + o * 3);
    const d = t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0");
    for (const i of feedOrder()) {
      const st = revealState(d, i, {});
      if (!st.done || st.revealed !== 1 || "stars" in st) fail("revealState " + d + " #" + i + " L" + lv);
      if (i === 2 && !(st.slots?.length === 4)) fail("domino reveal found no layout " + d);
      if (i === 1 && snap(st.values) !== snap(sudokuModel(d).sol)) fail("sudoku reveal mismatch");
      if (i === 0 && st.guesses.at(-1) !== wordAnswer(d)) fail("word reveal mismatch");
    }
  }
}
difficulty = 1;
all[progressKey(R)] = { games: { 9: revealState(R, 9, { started: true, pot: [1, 0, 0] }), 13: { done: true } } };
if (feedDone(R, 9) || feedCount(R) !== 1) fail("a revealed card must not count as solved");
clearPuzzle(all, R, 9);
if (snap(all[progressKey(R)].games[9]) !== snap({ revealed: 1 })) fail("clear on a revealed card must keep only the revealed marker");
all[progressKey(R)].games[9].done = true;
if (feedDone(R, 9) || feedCount(R) !== 1) fail("solving after a reveal must still not count");
all[progressKey(R)].games[13] = { credit: true, aha: 1, done: true, revealed: 1 }; clearPuzzle(all, R, 13);
if (snap(all[progressKey(R)].games[13]) !== snap({ credit: true, aha: 1, revealed: 1 }) || !feedDone(R, 13)) fail("earned credit must survive a later reveal");
difficulty = lvl;
(rate * 100).toFixed(2) + "% shiny (" + shiny + "/" + total + ")";
`, context);
const html = fs.readFileSync("dist/index.html", "utf8");
for (const id of ["soundPill", "flowBar"]) if (!html.includes(`id="${id}"`)) throw Error("missing #" + id);
console.log("PASS: rewards —", result, "; flow meter, bursts, milestones, chimes, clear & retry isolation and reveal limits");
