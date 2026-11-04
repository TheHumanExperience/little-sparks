// Checks the logical-reasoning Aha track (dist/aha.js): every category × level × 366 days generates
// deterministically, the brute-force solver finds exactly one answer and it matches, multiple-choice
// options are unique and contain the answer, each day shows five different categories,
// wording barely repeats within 61 days, and old index-3 progress stays on the legacy card.
const fs = require("fs"), vm = require("vm");
function element() {
  return { textContent: "", innerHTML: "", value: "", open: false, children: [], dataset: {}, querySelectorAll: () => [], classList: { add() {}, remove() {}, toggle() {} }, append(b) { this.children.push(b); }, showModal() {}, close() {} };
}
const nodes = new Map();
const document = { querySelector(s) { if (!nodes.has(s)) nodes.set(s, element()); return nodes.get(s); }, querySelectorAll: () => [], createElement: () => element(), addEventListener() {}, getElementById: () => null };
const context = { document, localStorage: { getItem: () => null, setItem: () => {} }, window: {}, setInterval: () => {} };
vm.createContext(context);
for (const f of ["valid-words.js", "app.js", "daily-content.js", "photos.js", "extras.js", "stories.js", "ladders.js", "sparks.js", "aha.js", "feed.js"]) vm.runInContext(fs.readFileSync("dist/" + f, "utf8"), context);
const t0 = Date.now();
const result = vm.runInContext(`
const fail = (m) => { throw Error(m); };
const N = AHA_CATS.length, dates = [], start = new Date("2026-01-01T12:00:00");
for (let o = 0; o < 366; o++) { const t = new Date(start); t.setDate(t.getDate() + o); dates.push(t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0")); }
if (AHA_GEN.length !== N || new Set(AHA_CATS.map((c) => c.id)).size !== N) fail("one generator per category");
for (const c of AHA_CATS) if (!["numbers", "logic"].includes(c.group) || !c.blurb || /CAT|Quant|LRDI|MCQ|TITA/.test(c.name + c.type + c.blurb)) fail("category needs a group, a blurb and no exam labels: " + c.id);
const text = (q) => [q.intro, JSON.stringify(q.table || ""), ...(q.clues || []), q.ask].join(" | ");
let questions = 0, repeats = 0;
for (let lv = 0; lv < 3; lv++) {
  difficulty = lv;
  const seenCats = new Set();
  for (let c = 0; c < N; c++) {
    const history = [];
    for (const d of dates) {
      const seed = puzzleSeed(d) + "|verify|" + c, q = AHA_GEN[c](rng(seed), lv), again = AHA_GEN[c](rng(seed), lv);
      if (JSON.stringify(q) !== JSON.stringify(again)) fail("not deterministic: " + AHA_CATS[c].id + " " + d + " L" + lv);
      for (const k of ["intro", "ask", "hint", "why"]) if (!q[k] || /undefined|NaN|Infinity/.test(q[k])) fail("bad " + k + " in " + AHA_CATS[c].id + " " + d + ": " + q[k]);
      if ((q.clues || []).some((x) => /undefined|NaN/.test(x))) fail("bad clue in " + AHA_CATS[c].id + " " + d);
      const sol = ahaSolve(c, q.data);
      if (sol.length !== 1) fail("expected exactly one answer, got " + JSON.stringify(sol) + " for " + AHA_CATS[c].id + " " + d + " L" + lv + " " + JSON.stringify(q.data));
      if (sol[0] !== String(q.a)) fail("answer mismatch " + AHA_CATS[c].id + " " + d + " L" + lv + ": " + sol[0] + " vs " + q.a);
      if (q.kind === "number" && !Number.isInteger(q.a * 2)) fail("typed answers should be whole or half numbers: " + AHA_CATS[c].id + " " + q.a);
      if (q.options && (new Set(q.options).size !== q.options.length || !q.options.includes(q.a))) fail("options must be unique and include the answer: " + AHA_CATS[c].id + " " + d);
      const tx = text(q);
      if (history.slice(-60).includes(tx)) repeats++;
      history.push(tx); questions++;
    }
  }
  // The real per-slot questions shown in the feed.
  const catDays = new Map();
  for (const d of dates) {
    const cats = ahaCategories(d);
    if (cats.length !== 5 || new Set(cats).size !== 5) fail("a day needs five different categories: " + d);
    if (!cats.some((x) => AHA_CATS[x].group === "numbers") || !cats.some((x) => AHA_CATS[x].group === "logic")) fail("each day should mix number and logic puzzles: " + d);
    cats.forEach((x) => { seenCats.add(x); catDays.set(x, (catDays.get(x) || 0) + 1); });
    AHA_CACHE.clear();
    const first = AHA_SLOTS.map((_, slot) => JSON.stringify(ahaModel(d, slot)));
    AHA_CACHE.clear();
    for (let slot = 0; slot < 5; slot++) {
      const m = ahaModel(d, slot);
      if (JSON.stringify(m) !== first[slot]) fail("ahaModel not deterministic " + d + " slot " + slot);
      if (m.cat !== cats[slot]) fail("slot category mismatch " + d);
      if (lv < 2 && m.kind !== "choice") fail("Gentle/Medium must be multiple choice: " + d + " " + AHA_CATS[m.cat].id);
      if (m.kind === "choice") {
        if (m.options.length < 3 || new Set(m.options).size !== m.options.length || !m.options.includes(m.a)) fail("bad options " + d + " " + AHA_CATS[m.cat].id + " " + JSON.stringify(m.options) + " a=" + m.a);
        if (!ahaCheck(m, m.a) || m.options.some((o) => o !== m.a && ahaCheck(m, o))) fail("choice check wrong " + d);
      } else {
        const typed = (m.pre || "") + Number(m.a).toLocaleString("en-IN") + (m.unit ? " " + m.unit : "");
        if (!ahaCheck(m, String(m.a)) || !ahaCheck(m, typed) || ahaCheck(m, String(m.a + 1)) || ahaCheck(m, "")) fail("typed check wrong " + d + " " + typed);
      }
    }
  }
  if (seenCats.size !== N) fail("level " + lv + " never shows some categories");
  const counts = [...catDays.values()];
  if (Math.min(...counts) < 366 * 5 / N * 0.7) fail("categories are unevenly rotated: " + counts);
}
if (repeats / questions > 0.01) fail("wording repeats too often within 61 days: " + repeats + "/" + questions);
// Legacy index 3, skill badges and reset.
difficulty = 1;
const d = dates[10], key = progressKey(d);
all = { [key]: { games: { 3: { started: true, answer: 1 } } } };
if (!ahaLegacy(d, 3) || ahaMeta(d, 3)) fail("old Aha progress must stay on the legacy card");
if (ahaLegacy(d, 17) || !ahaMeta(d, 17)) fail("new slots are never legacy");
all = { [key]: { games: { 3: { started: true, aha: 1 } } } };
if (ahaLegacy(d, 3) || !ahaMeta(d, 3)) fail("index 3 with the aha flag is a track card");
all = { [key]: { games: { 17: { done: true, aha: 1 }, 18: { credit: true, aha: 1 }, 19: { done: true } } } };
const skill = ahaSkillCounts(), cats = ahaCategories(d);
if (skill.reduce((a, b) => a + b, 0) !== 2 || skill[cats[1]] !== 1 || skill[cats[2]] !== 1) fail("skill badges miscounted: " + skill);
clearPuzzle(all, d, 17);
if (!all[key].games[17].credit || !all[key].games[17].aha || ahaSkillCounts()[cats[1]] !== 1) fail("reset must keep solved credit and the skill badge");
({ questions, repeats });
`, context);
console.log(`Aha track OK: ${result.questions} generated questions (10 categories × 3 levels × 366 days), ${result.repeats} wording repeats within 61 days, in ${Date.now() - t0} ms`);
