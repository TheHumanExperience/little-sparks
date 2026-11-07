// Checks Lantern Lanes (state 22): every level × 366 days is deterministic, varied, solved by its
// stored answer and by nothing else (solver-verified), shaped as promised per level, and graded.
const fs = require("fs"), vm = require("vm");
const nodes = new Map();
function element() {
  return { textContent: "", innerHTML: "", value: "", open: false, children: [], dataset: {}, querySelectorAll: () => [], classList: { add() {}, remove() {}, toggle() {} }, append(b) { this.children.push(b); }, showModal() { this.open = true; }, close() { this.open = false; } };
}
const document = { querySelector(s) { if (!nodes.has(s)) nodes.set(s, element()); return nodes.get(s); }, querySelectorAll: () => [], createElement: () => element(), addEventListener() {}, getElementById: () => null };
const context = { document, localStorage: { getItem: () => null, setItem: () => {} }, window: {}, setInterval: () => {} };
vm.createContext(context);
for (const f of ["valid-words.js", "app.js", "daily-content.js", "photos.js", "extras.js", "stories.js", "ladders.js", "sparks.js", "lanterns.js", "beds.js", "aha.js", "feed.js"]) vm.runInContext(fs.readFileSync("dist/" + f, "utf8"), context);
const t0 = Date.now();
const summary = vm.runInContext(`
const fail = (m) => { throw Error(m); };
const days = Array.from({ length: 366 }, (_, n) => new Date(Date.UTC(2026, 0, 1 + n)).toISOString().slice(0, 10));
const stats = [0, 1, 2].map(() => ({ nodes: 0, numbers: 0, walls: 0, bulbs: 0 }));
for (const lvl of [0, 1, 2]) {
  difficulty = lvl;
  const recent = [];
  for (const d of days) {
    const m = lanternModel(d), tag = "level " + lvl + " " + d + ": ";
    lanternCache.clear(); lanternSightCache.clear();
    if (JSON.stringify(lanternModel(d)) !== JSON.stringify(m)) fail(tag + "not deterministic");
    if (m.n !== [5, 6, 7][lvl]) fail(tag + "size");
    const numbers = Object.values(m.walls).filter((k) => k >= 0).length;
    if (lvl === 0 && (numbers || m.budget !== m.solution.length)) fail(tag + "Gentle has no numbers and a budget of exactly the answer's bulbs");
    if (lvl === 1 && (numbers < 2 || m.budget !== m.solution.length)) fail(tag + "Medium shows some numbers and the bulb budget");
    if (lvl === 2 && (numbers < 1 || m.budget != null)) fail(tag + "Tricky has numbers and no budget");
    if (!lanternCheck(m, m.solution).solved) fail(tag + "stored answer doesn't solve it");
    if (lanternCheck(m, []).solved) fail(tag + "empty board counts as solved");
    const r = lanternSolve(m, 2);
    if (r.count !== 1 || r.first.join() !== [...m.solution].sort((a, b) => a - b).join()) fail(tag + "not unique (" + r.count + ")");
    // Gentle's budget is the true minimum: no layout with fewer bulbs lights everything.
    if (lvl === 0 && lanternSolve(m, 1, m.budget - 1).count) fail(tag + "budget isn't the fewest bulbs");
    const st = stats[lvl]; st.nodes += m.nodes; st.numbers += numbers; st.walls += Object.keys(m.walls).length; st.bulbs += m.solution.length;
    recent.push(JSON.stringify(m));
  }
  const distinct = new Set(recent.slice(0, 61)).size;
  if (distinct < 58) fail("level " + lvl + " only " + distinct + " distinct puzzles in 61 days");
}
const avg = stats.map((s) => s.nodes / days.length);
if (!(avg[0] < avg[1] && avg[1] < avg[2])) fail("solver effort must rise Gentle < Medium < Tricky: " + avg);
// Rules the board shows live.
difficulty = 1;
const t = { n: 3, walls: { 1: -1, 4: 2 }, budget: null };
if (lanternCheck(t, [0, 2]).clash.size) fail("a wall between two bulbs stops the clash");
if (lanternCheck(t, [6, 8]).clash.size !== 2) fail("two bulbs in one open row clash");
if (lanternCheck(t, [3, 7]).counts[4] !== 2 || lanternCheck(t, [0, 8]).counts[4] !== 0) fail("numbers count the 4 sides only, never diagonals");
// Render each level into the fake DOM, then a revealed card is solved and flagged.
day = "2026-05-04"; data = { games: {} };
for (const lvl of [0, 1, 2]) {
  difficulty = lvl; data = { games: {} };
  openSpark(22);
  const rules = $("#rules").innerHTML;
  if (!rules.includes("not diagonals") || (rules.match(/lanstep/g) || []).length < 3 || !$("#board").innerHTML.includes("lantgrid")) fail("render level " + lvl);
  if ((lvl < 2) !== $("#board").innerHTML.includes("Bulbs left")) fail("bulbs-left counter only on Gentle and Medium");
  const s = revealState(day, 22, {});
  if (!s.revealed || !lanternCheck(lanternModel(day), s.bulbs).solved) fail("reveal must show the solved board");
}
stats.map((s, l) => ["Gentle", "Medium", "Tricky"][l] + "{" + [5, 6, 7][l] + "×" + [5, 6, 7][l] + ",avgSolverNodes:" + (s.nodes / days.length).toFixed(0) + ",walls:" + (s.walls / days.length).toFixed(1) + ",numbers:" + (s.numbers / days.length).toFixed(1) + ",bulbs:" + (s.bulbs / days.length).toFixed(1) + "}").join(" ");
`, context);
console.log("PASS: Lantern Lanes — 3 levels × 366 days unique (solver-verified), deterministic, varied, graded (" + ((Date.now() - t0) / 1000).toFixed(1) + "s). " + summary);
