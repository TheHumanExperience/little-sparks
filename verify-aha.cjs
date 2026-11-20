// Checks the logical-reasoning Aha track (dist/aha.js): every category × level × 366 days generates
// deterministically, the brute-force solver finds exactly one answer and it matches, multiple-choice
// options are unique and contain the answer, each day shows five different categories,
// wording barely repeats within 61 days, old index-3 progress stays on the legacy card,
// days played before the nineteen-category ring keep their original rotation, every day before
// NEW_GAMES_FROM keeps its rotation-2 categories, and rotation 3 (with Who Knows?) runs from that date.
const fs = require("fs"), vm = require("vm");
const { context } = require("./tests/load-app.cjs").loadApp();
const t0 = Date.now();
const result = vm.runInContext(`
const fail = (m) => { throw Error(m); };
const N = AHA_CATS.length, dates = [], start = new Date("2026-01-01T12:00:00");
for (let o = 0; o < 366; o++) { const t = new Date(start); t.setDate(t.getDate() + o); dates.push(t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0")); }
if (AHA_GEN.length !== N || new Set(AHA_CATS.map((c) => c.id)).size !== N) fail("one generator per category");
for (const c of AHA_CATS) if (!["numbers", "logic"].includes(c.group) || !c.blurb || /CAT|Quant|LRDI|MCQ|TITA/.test(c.name + c.type + c.blurb)) fail("category needs a group, a blurb and no exam labels: " + c.id);
const text = (q) => [q.intro, JSON.stringify(q.table || ""), ...(q.clues || []), q.ask].join(" | ");
let questions = 0, repeats = 0, eqChecked = 0;
for (let lv = 0; lv < 3; lv++) {
  difficulty = lv;
  const seenCats = new Set();
  for (let c = 0; c < N; c++) {
    const history = [];
    for (const d of dates) {
      const seed = puzzleSeed(d) + "|verify|" + c, q = AHA_GEN[c](rng(seed), lv), again = AHA_GEN[c](rng(seed), lv);
      if (JSON.stringify(q) !== JSON.stringify(again)) fail("not deterministic: " + AHA_CATS[c].id + " " + d + " L" + lv);
      for (const k of ["intro", "ask", "hint", "why"]) if (!q[k] || /undefined|NaN|Infinity|[a-z][0-9]+[a-z]/.test(q[k])) fail("bad " + k + " in " + AHA_CATS[c].id + " " + d + ": " + q[k]);
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
  // Before NEW_GAMES_FROM an unplayed day keeps rotation 2, with exactly the categories the nineteen-category ring gave.
  const OLD_RING = [10, 0, 1, 12, 11, 2, 3, 14, 13, 4, 5, 15, 16, 6, 7, 17, 18, 8, 9];
  all = {};
  for (const d of dates) {
    if (d >= NEW_GAMES_FROM) continue;
    const s0 = mod(calendarIndex(d) * 3 + lv * 7, 19), old = shuffle([0, 1, 2, 3, 4].map((j) => OLD_RING[mod(s0 + j, 19)]), rng(puzzleSeed(d) + "|aha-order-v2"));
    if (ahaRotation(d) !== 2 || JSON.stringify(ahaCategories(d)) !== JSON.stringify(old)) fail("days before NEW_GAMES_FROM must keep their categories: " + d + " L" + lv);
  }
  // The real per-slot questions shown in the feed, under rotation 3 (pinned through the saved flag, since
  // NEW_GAMES_FROM may still be a far-future placeholder).
  const catDays = new Map();
  for (const d of dates) {
    all = { [progressKey(d)]: { games: { [AHA_SLOTS[0]]: { aha: 3 } } } };
    if (ahaRotation(d) !== 3) fail("a saved aha: 3 flag must pin rotation 3: " + d);
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
      if (AHA_CATS[m.cat].id === "matchsticks") {
        // Matchsticks is typed on every level: no options to give the answer away.
        if (m.kind !== "equation" || m.options) fail("matchsticks must be a typed equation: " + d);
        const raw = m.a.replace(/−/g, "-").replace(/ /g, ""), others = ahaUniq(matchMoves(m.data.s).map((mv) => mv.to)).filter((t) => t !== raw);
        for (const ok of [m.a, raw, " " + raw.replace(/-/g, " – ") + " ", raw.split("=").join("＝").split("+").join("＋")]) if (!ahaCheck(m, ok)) fail("matchsticks should accept " + JSON.stringify(ok) + " for " + m.a);
        for (const bad of [m.data.s, "", raw + "1", ...others]) if (ahaCheck(m, bad)) fail("matchsticks accepted a wrong equation " + bad + " for " + m.a);
        eqChecked++;
        continue;
      }
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
  all = {};
  if (seenCats.size !== N) fail("level " + lv + " never shows some categories");
  const counts = [...catDays.values()];
  if (Math.min(...counts) < 366 * 5 / N * 0.7) fail("categories are unevenly rotated: " + counts);
}
// Who Knows?: candidates are the options on every level, sized by level, and the dialogue has the agreed shapes.
const KN = AHA_CATS.findIndex((c) => c.id === "knows");
if (KN < 0 || AHA_CATS[KN].group !== "logic" || AHA_GEN[KN] !== genKnows) fail("knows must be a logic category with genKnows");
let knows = 0;
for (let lv = 0; lv < 3; lv++) {
  difficulty = lv;
  const [lo, hi] = [[6, 8], [8, 10], [10, 12]][lv], shapes = new Set(), themes = new Set();
  for (const d of dates) {
    all = { [progressKey(d)]: { games: { [AHA_SLOTS[0]]: { aha: 3 } } } };
    const q = AHA_GEN[KN](rng(puzzleSeed(d) + "|verify|" + KN), lv), n = q.data.cands.length, L = q.data.lines;
    if (n < lo || n > hi || q.options.length !== n || q.options.join() !== q.data.labels.join()) fail("knows candidates must be the options: " + d + " L" + lv);
    if (!KNOWS_SHAPES[lv].some((sh) => JSON.stringify(sh.map(({ w, ops }) => ({ w, ops }))) === JSON.stringify(L))) fail("knows dialogue must be one of the level's shapes: " + d);
    const tr = knowsTrace(q.data, true);
    if (tr.some((t, k) => k && t.length >= tr[k - 1].length)) fail("every line of a knows dialogue must rule something out: " + d);
    if (q.clues.length !== L.length || q.why.split(". ").length < L.length) fail("knows needs one clue and one why sentence per line: " + d);
    shapes.add(JSON.stringify(L)); themes.add(q.table.head[0]);
    const cats = ahaCategories(d), slot = cats.indexOf(KN);
    if (slot >= 0) { AHA_CACHE.clear(); const m = ahaModel(d, slot); if (m.kind !== "choice" || m.options.length !== m.data.cands.length || !ahaCheck(m, m.a)) fail("knows must be a choice card on every level: " + d); knows++; }
  }
  if (shapes.size !== 2 || themes.size < (lv === 2 ? 5 : 6)) fail("knows level " + lv + " should use both shapes and its themes: " + shapes.size + " " + themes.size);
}
// Rotation by date and saved flag: empty days before NEW_GAMES_FROM use 2, from it 3; flags 1, 2 and 3 pin a played day.
difficulty = 1;
all = {};
// (The day after the 9999-12-31 placeholder would be year 10000, which sorts before it, so it is checked only once the date is real.)
const dayBefore = feedDate(1, NEW_GAMES_FROM), after = [feedDate(-5, NEW_GAMES_FROM)].filter((x) => x > NEW_GAMES_FROM);
if (ahaRotation(dayBefore) !== 2 || ahaRotation(NEW_GAMES_FROM) !== 3 || after.some((x) => ahaRotation(x) !== 3)) fail("rotation 3 starts on NEW_GAMES_FROM");
for (const [dd, flag, want] of [[NEW_GAMES_FROM, 2, 2], [NEW_GAMES_FROM, 1, 1], [dayBefore, 3, 3], ...after.map((x) => [x, 2, 2])]) {
  all = { [progressKey(dd)]: { games: { [AHA_SLOTS[3]]: { aha: flag, done: true } } } };
  if (ahaRotation(dd) !== want) fail("saved aha: " + flag + " must keep rotation " + want + " on " + dd);
}
all = {};
if (JSON.stringify([...AHA_RING_V3].sort((a, b) => a - b)) !== JSON.stringify([...Array(N).keys()]) || AHA_RING_V3.filter((c) => c !== KN).join() !== AHA_RING.join()) fail("AHA_RING_V3 is AHA_RING with knows added");
if (AHA_RING_V3.some((c, k) => AHA_CATS[c].group === "numbers" && AHA_CATS[AHA_RING_V3[(k + 1) % N]].group === "numbers")) fail("AHA_RING_V3 must never put two number categories side by side");
if (!knows) fail("no Who Knows? card was shown under rotation 3");
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
// Days played before the ring grew keep their original ten-category rotation.
for (const dd of dates.slice(0, 40)) {
  const k = progressKey(dd), oldStart = mod(calendarIndex(dd) * 3 + difficulty * 7, 10);
  const old = shuffle([0, 1, 2, 3, 4].map((j) => mod(oldStart + j, 10)), rng(puzzleSeed(dd) + "|aha-order"));
  for (const g of [{ aha: 1, started: true }, { started: true }, { done: true, revealed: 1 }]) {
    all = { [k]: { games: { [AHA_SLOTS[2]]: g } } };
    if (ahaRotation(dd) !== 1 || JSON.stringify(ahaCategories(dd)) !== JSON.stringify(old)) fail("old Aha progress must keep the ten-category rotation " + dd);
  }
  all = { [k]: { games: { [AHA_SLOTS[2]]: { aha: 2, started: true } } } };
  if (ahaRotation(dd) !== 2) fail("rotation 2 saves stay on the ring");
}
all = {};
if (!eqChecked) fail("no Matchsticks card was checked");
({ questions, repeats, N, eqChecked, knows });
`, context);
console.log(`Aha track OK: ${result.questions} generated questions (${result.N} categories × 3 levels × 366 days), ${result.repeats} wording repeats within 61 days, ${result.eqChecked} typed Matchsticks cards accept only the one-move answer, ${result.knows} Who Knows? cards shown under rotation 3, in ${Date.now() - t0} ms`);
