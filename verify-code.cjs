// Checks Code Garden (state 26): every level × 366 days is deterministic, varied, shaped as promised per level,
// and has exactly one code that fits its clues (brute force over every code). Also the scoring, a wrong check
// adding a correct clue row, the hint, the reveal and its "why not", and the card's place in the feed from
// NEW_GAMES_FROM (checked with a test date and on the real cutover).
const vm = require("vm");
const { context } = require("./tests/load-app.cjs").loadApp();
const t0 = Date.now();
const summary = vm.runInContext(`
const fail = (m) => { throw Error(m); };
const days = Array.from({ length: 366 }, (_, n) => new Date(Date.UTC(2026, 0, 1 + n)).toISOString().slice(0, 10));
const stats = [0, 1, 2].map(() => ({ rows: 0, repeats: 0 }));
// Scoring: ● right flower in the right spot, ○ right flower in the wrong spot, repeats counted once each.
const sc = (g, c) => codeScore(g, c).join();
if (sc([0, 1, 2, 3], [0, 1, 2, 3]) !== "4,0" || sc([0, 1, 2, 3], [3, 2, 1, 0]) !== "0,4" || sc([0, 0, 1, 1], [0, 1, 0, 2]) !== "1,2" || sc([0, 0, 0, 0], [0, 1, 2, 3]) !== "1,0" || sc([4, 4, 5, 5], [0, 1, 2, 3]) !== "0,0") fail("codeScore");
if (codeSpace(0).length !== 24 || codeSpace(1).length !== 120 || codeSpace(2).length !== 1296) fail("code space sizes");
if (CODE_FLOWERS.length < 6 || new Set(CODE_FLOWERS.map((f) => f.svg)).size !== CODE_FLOWERS.length) fail("every flower needs its own shape");
for (const lvl of [0, 1, 2]) {
  difficulty = lvl;
  const L = CODE_LEVELS[lvl], seen = [];
  for (const d of days) {
    const m = codeModel(d), tag = "level " + lvl + " " + d + ": ";
    codeCache.clear();
    if (JSON.stringify(codeModel(d)) !== JSON.stringify(m)) fail(tag + "not deterministic");
    if (m.code.length !== L.slots || m.code.some((k) => k < 0 || k >= L.kinds)) fail(tag + "code shape");
    if (!L.repeats && new Set(m.code).size !== L.slots) fail(tag + "Gentle and Medium codes never repeat a flower");
    if (m.rows.length < L.rows[0] || m.rows.length > L.rows[1]) fail(tag + m.rows.length + " clue rows");
    for (const r of m.rows) {
      if (sc(r.guess, m.code) !== r.score.join()) fail(tag + "a clue row is scored wrongly");
      if (r.score[0] === L.slots) fail(tag + "a clue gives the answer away");
      if (!L.repeats && new Set(r.guess).size !== L.slots) fail(tag + "clue guesses follow the level's no-repeat rule");
    }
    const fits = codeFits(m.rows, lvl);
    if (fits.length !== 1 || fits[0].join() !== m.code.join()) fail(tag + "not unique (" + fits.length + " codes fit)");
    // Every clue rules something out: without any one row, more than one code fits.
    if (m.rows.some((_, k) => codeFits(m.rows.filter((__, j) => j !== k), lvl).length < 2)) fail(tag + "a clue row adds nothing");
    stats[lvl].rows += m.rows.length; stats[lvl].repeats += new Set(m.code).size < L.slots;
    seen.push(m.code.join() + "|" + m.rows.map((r) => r.guess.join()).join(";"));
  }
  const distinct = new Set(seen.slice(0, 61)).size;
  if (distinct < 58) fail("level " + lvl + " only " + distinct + " distinct gardens in 61 days");
}
if (!stats[2].repeats) fail("Tricky codes should sometimes repeat a flower");
// A wrong check adds her row as a clue with the right marks; the right row solves.
day = "2026-05-04";
for (const lvl of [0, 1, 2]) {
  difficulty = lvl; data = { games: {} };
  const m = codeModel(day), s = { guesses: [], locked: [], cur: m.code.slice() };
  s.cur[0] = (s.cur[0] + 1) % m.kinds;
  if (!m.repeats && s.cur.slice(1).includes(s.cur[0])) s.cur = s.cur.slice().reverse();
  const wrong = codeCheck(m, s);
  if (wrong.solved || s.guesses.length !== 1 || wrong.score.join() !== sc(s.guesses[0], m.code)) fail("a wrong check must add a correctly scored row at level " + lvl);
  if (codeFits([...m.rows, { guess: s.guesses[0], score: wrong.score }], lvl).map((c) => c.join()).join() !== m.code.join()) fail("the new clue keeps the answer");
  s.cur = m.code.slice();
  if (!codeCheck(m, s).solved || s.guesses.length !== 2) fail("the right row solves at level " + lvl);
  // Hint: each fills a right flower and locks it, and the last spot is always left to find.
  const h = { guesses: [], locked: [], cur: Array(m.slots).fill(null) };
  for (let k = 0; k < m.slots - 1; k++) { const j = codeHint(m, h); if (j < 0 || h.cur[j] !== m.code[j] || !h.locked.includes(j)) fail("hint must fill and lock a right flower"); }
  if (codeHint(m, h) !== -1 || h.cur.filter((k) => k == null).length !== 1) fail("hints must leave the last flower to find");
  // Render: the clues and the answer row, each clue row labelled in words (never colour alone).
  openSpark(26);
  const board = $("#board").innerHTML, rules = $("#rules").innerHTML;
  if ((board.match(/class="cgrow"/g) || []).length !== m.rows.length || (board.match(/data-cs=/g) || []).length !== m.slots || (board.match(/data-ck=/g) || []).length !== m.kinds) fail("render level " + lvl);
  if (!m.rows.every((r, k) => board.includes('aria-label="Clue ' + (k + 1) + ": " + codeNames(r.guess) + ": " + codeMarksText(r.score) + '"'))) fail("each clue row needs a text label");
  if (!rules.includes("●") || !rules.includes("○") || !/right spot/.test(rules)) fail("How to play explains the marks");
  // Reveal: the code, solved and flagged, with one clue that rules out the closest alternative.
  const st = revealState(day, 26, { guesses: [[...m.code].reverse()], locked: [] });
  if (!st.done || st.revealed !== 1 || st.cur.join() !== m.code.join() || st.guesses.length !== 1) fail("reveal must show the code and keep her checks");
  const w = codeWhy(m);
  if (w.alt.join() === m.code.join() || w.row < 0 || sc(m.rows[w.row].guess, w.alt) !== w.would.join() || w.would.join() === w.got.join()) fail("reveal why-not must name a clue that rules the alternative out");
  data = { games: { 26: st } }; openSpark(26);
  if (!$("#board").innerHTML.includes("Why not " + codeNames(w.alt, true))) fail("revealed card explains the closest alternative");
}
// The feed: Code Garden takes Time Lens Duel's slot from the cutover (test date), never before; solves count, reveals don't.
{ const T = "2026-12-01", real = FEED_SINCE[26], keep = JSON.stringify(all);
  FEED_UNTIL[15] = FEED_SINCE[26] = T;
  for (const lv of [0, 1, 2]) {
    const o = feedOrder(lv, T), b = feedOrder(lv, "2026-11-30");
    if (o.length !== 20 || !o.includes(26) || o.includes(15)) fail("Code Garden is in the feed from the cutover at level " + lv);
    if (b.length !== 20 || b.includes(26) || !b.includes(15)) fail("days before the cutover keep Time Lens Duel at level " + lv);
  }
  difficulty = 1;
  all[progressKey(T)] = { games: { 26: { done: true } } };
  if (feedCount(T) !== 1) fail("a solved Code Garden counts");
  all[progressKey(T)] = { games: { 26: revealState(T, 26, {}) } };
  if (feedCount(T) !== 0) fail("a revealed Code Garden never counts");
  FEED_UNTIL[15] = FEED_SINCE[26] = real;
  for (const lv of [0, 1, 2]) if (!feedOrder(lv, real).includes(26) || feedOrder(lv, real).includes(15) || feedOrder(lv, feedDate(1, real)).includes(26) || !feedOrder(lv, feedDate(1, real)).includes(15)) fail("on the real cutover Code Garden replaces Time Lens Duel, and the day before keeps it, at level " + lv);
  for (const k of Object.keys(all)) delete all[k]; Object.assign(all, JSON.parse(keep)); }
stats.map((s, l) => ["Gentle", "Medium", "Tricky"][l] + "{" + CODE_LEVELS[l].slots + " of " + CODE_LEVELS[l].kinds + ",avgClues:" + (s.rows / days.length).toFixed(2) + (CODE_LEVELS[l].repeats ? ",repeatDays:" + s.repeats : "") + "}").join(" ");
`, context);
console.log("PASS: Code Garden — 3 levels × 366 days unique (brute force), deterministic, varied, graded; checks, hints, reveal and feed cutover (" + ((Date.now() - t0) / 1000).toFixed(1) + "s). " + summary);
