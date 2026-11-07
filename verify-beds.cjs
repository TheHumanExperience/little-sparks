// Checks Garden Beds (state 23): every level × 366 days is deterministic, varied, solved by its
// stored beds and by nothing else (solver-verified), sized as promised per level, and graded.
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
const stats = [0, 1, 2].map(() => ({ nodes: 0, beds: 0, biggest: 0, decoys: 0, guess: 0 }));
for (const lvl of [0, 1, 2]) {
  difficulty = lvl;
  const recent = [];
  for (const d of days) {
    const m = bedsModel(d), tag = "level " + lvl + " " + d + ": ", n = [5, 6, 7][lvl];
    bedsCache.clear();
    if (JSON.stringify(bedsModel(d)) !== JSON.stringify(m)) fail(tag + "not deterministic");
    if (m.n !== n) fail(tag + "size");
    if (m.clues.length !== m.rects.length) fail(tag + "one packet per bed");
    const [lo, hi] = BEDS_AREA[lvl];
    if (m.clues.some(([, k]) => k < lo || k > hi)) fail(tag + "packet sizes outside " + lo + "–" + hi);
    m.clues.forEach(([c, k], j) => { const b = m.rects[j]; if (!bedHas(b, c, n) || b[2] * b[3] !== k) fail(tag + "packet " + j + " doesn't match its bed"); });
    if (!bedsCheck(m, m.rects).solved) fail(tag + "stored beds don't solve it");
    if (bedsCheck(m, m.rects.slice(1)).solved || bedsCheck(m, []).solved) fail(tag + "an unfinished garden counts as solved");
    const r = bedsSolve(m, 2);
    if (r.count !== 1 || JSON.stringify(r.first) !== JSON.stringify(m.rects)) fail(tag + "not unique (" + r.count + ")");
    const st = stats[lvl];
    st.nodes += m.nodes; st.beds += m.clues.length; st.biggest += Math.max(...m.clues.map(([, k]) => k)); st.decoys += m.decoys / m.clues.length;
    if (m.nodes > m.clues.length + 1) st.guess++;
    recent.push(JSON.stringify(m.clues));
  }
  const distinct = new Set(recent.slice(0, 61)).size;
  if (distinct < 60) fail("level " + lvl + " only " + distinct + " distinct gardens in 61 days");
}
const avg = stats.map((s) => s.nodes / days.length), dec = stats.map((s) => s.decoys / days.length);
if (!(avg[0] < avg[1] && avg[1] < avg[2])) fail("solver effort must rise Gentle < Medium < Tricky: " + avg);
if (!(dec[0] < dec[1] && dec[1] < dec[2])) fail("decoy beds per packet must rise Gentle < Medium < Tricky: " + dec);
if (stats[0].guess) fail("Gentle gardens must be solvable square by square, without a guess");
// Verdicts the board shows live.
const t = { n: 3, clues: [[1, 6], [7, 3]], rects: [[0, 0, 2, 3], [2, 0, 1, 3]] };
const v = bedsCheck(t, [[0, 0, 1, 3], [0, 0, 3, 3], [1, 0, 1, 1], [0, 0, 2, 3]]).verdict;
if (v.join() !== "false,false,false,true") fail("bed verdicts: wrong area, two packets, no packet, right bed");
if (!bedsCheck(t, t.rects).solved || bedsSolve(t, 2).count !== 1) fail("the How to play example is a unique garden");
// Render each level into the fake DOM; a revealed card is solved and flagged.
for (const lvl of [0, 1, 2]) {
  difficulty = lvl; day = "2026-05-04"; data = { games: {} };
  openSpark(23);
  if (!$("#rules").innerHTML.includes("seed packet") || !$("#board").innerHTML.includes("bedgrid")) fail("render level " + lvl);
  const s = revealState(day, 23, {});
  if (!s.revealed || !bedsCheck(bedsModel(day), s.beds).solved) fail("reveal must show the finished garden");
}
stats.map((s, l) => ["Gentle", "Medium", "Tricky"][l] + "{" + [5, 6, 7][l] + "×" + [5, 6, 7][l] + ",avgSolverNodes:" + (s.nodes / days.length).toFixed(1) + ",beds:" + (s.beds / days.length).toFixed(1) + ",biggestBed:" + (s.biggest / days.length).toFixed(1) + ",decoysPerPacket:" + (s.decoys / days.length).toFixed(2) + ",needGuess:" + Math.round((100 * s.guess) / days.length) + "%}").join(" ");
`, context);
console.log("PASS: Garden Beds — 3 levels × 366 days unique (solver-verified), deterministic, varied, graded (" + ((Date.now() - t0) / 1000).toFixed(1) + "s). " + summary);
