// Checks Last Petal (state 25): every level × 366 days is deterministic, shaped as promised per level and
// always winnable for the first player (cross-checked by an independent solver); the bee plays the stated
// rule; perfect play beats the bee; replaying a saved move list rebuilds the same board; Try again restarts;
// the hint label drains flow; hints and reveals never count; and the feed shows it only from NEW_GAMES_FROM.
const fs = require("fs"), vm = require("vm");
const { context } = require("./tests/load-app.cjs").loadApp();
const t0 = Date.now();
const summary = vm.runInContext(`
const fail = (m) => { throw Error(m); };
const days = Array.from({ length: 366 }, (_, n) => new Date(Date.UTC(2026, 0, 1 + n)).toISOString().slice(0, 10));
// An independent solver: plain recursion over the position as given (no sorting), its own memo.
const memo = new Map();
const wins = (pos, take, misere) => {
  if (pos.every((n) => !n)) return misere;
  const key = misere + "|" + take + "|" + pos.join(",");
  if (memo.has(key)) return memo.get(key);
  let w = false;
  for (let f = 0; f < pos.length && !w; f++) for (let t = 1; t <= pos[f] && !w; t++) {
    if (take && !take.includes(t)) continue;
    const next = pos.slice(); next[f] -= t;
    if (!wins(next, take, misere)) w = true;
  }
  memo.set(key, w);
  return w;
};
const stats = [0, 1, 2].map(() => ({ petals: 0, kinds: {}, beeTurns: 0, recent: [] }));
for (const lvl of [0, 1, 2]) {
  difficulty = lvl;
  for (const d of days) {
    const m = petalModel(d), tag = "level " + lvl + " " + d + ": ", r = m.rules, fl = m.flowers, sum = fl.reduce((a, b) => a + b, 0);
    petalCache.clear();
    if (JSON.stringify(petalModel(d)) !== JSON.stringify(m)) fail(tag + "not deterministic");
    if (r !== PETAL_RULES[m.kind]) fail(tag + "rules must be the named rule set");
    if (lvl === 0 && (m.kind !== "four" || fl.length !== 1 || fl[0] < 10 || fl[0] > 21)) fail(tag + "Gentle is one flower of 10–21, take 1–3");
    if (lvl === 1 && (m.kind !== "nim" || fl.length !== 3 || fl.some((n) => n < 1 || n > 7) || 2 * Math.max(...fl) > sum)) fail(tag + "Medium is Nim on three balanced flowers of 1–7");
    if (lvl === 2 && !(m.kind === "misere" ? fl.length === 3 && fl.every((n) => n >= 1 && n <= 7) && 2 * Math.max(...fl) <= sum : m.kind === "take134" && fl.length === 2 && fl.every((n) => n >= 5 && n <= 15))) fail(tag + "Tricky is misère Nim or two flowers with take {1, 3, 4}");
    if (lvl && new Set(fl).size !== fl.length) fail(tag + "no two flowers match");
    if (!wins(fl, r.take, r.misere) || !petalWins(fl, r)) fail(tag + "the first player must be able to win");
    if (!petalWinningMoves(fl, r).length) fail(tag + "a winning first move must exist");
    // Perfect play (her first winning move each turn) against the bee always wins, and the bee keeps to its rule.
    let moves = [], g = petalReplay(m, moves), guard = 0;
    while (!g.over && guard++ < 200) {
      if (g.turn) {
        const mv = petalBee(g.pos, r), legal = petalMoves(g.pos, r), win = legal.filter(([f, t]) => { const p = g.pos.slice(); p[f] -= t; return !wins(p, r.take, r.misere); });
        const want = win.length ? win[0] : [g.pos.indexOf(Math.max(...g.pos)), 1];
        if (mv.join() !== want.join()) fail(tag + "bee broke its rule at " + g.pos + ": " + mv + " not " + want);
        moves.push(mv); stats[lvl].beeTurns++;
      } else {
        const win = petalWinningMoves(g.pos, r);
        if (!win.length) fail(tag + "perfect play lost its winning move at " + g.pos);
        moves.push(win[0]);
      }
      g = petalReplay(m, moves);
    }
    if (!g.won) fail(tag + "perfect play must beat the bee");
    // Replaying any prefix rebuilds the same board as applying the moves one by one.
    let pos = fl.slice();
    moves.forEach((mv, k) => { pos = petalAfter(pos, mv); if (petalReplay(m, moves.slice(0, k + 1)).pos.join() !== pos.join()) fail(tag + "replay differs after move " + k); });
    const st = stats[lvl]; st.petals += sum; st.kinds[m.kind] = (st.kinds[m.kind] || 0) + 1; st.recent.push(fl.join(","));
  }
  const distinct = new Set(stats[lvl].recent.slice(0, 61)).size;
  if (distinct < [8, 40, 40][lvl]) fail("level " + lvl + " only " + distinct + " distinct starts in 61 days");
}
if (!(stats[2].kinds.misere > 120 && stats[2].kinds.take134 > 120)) fail("Tricky should alternate between misère Nim and take {1, 3, 4}: " + JSON.stringify(stats[2].kinds));
// The bee's rule on hand-made positions: first winning move in flower-then-take order; else 1 from the largest.
const nim = PETAL_RULES.nim, mis = PETAL_RULES.misere, four = PETAL_RULES.four;
if (petalWinningMoves([1, 2, 3], nim).length) fail("1, 2, 3 is a lost Nim position");
if (petalBee([1, 2, 3], nim).join() !== "2,1") fail("with no winning move the bee takes 1 from the largest flower");
if (petalBee([3, 5, 5], nim).join() !== "0,3") fail("the bee plays its first winning move");
if (petalBee([7], four).join() !== "0,3" || petalBee([8], four).join() !== "0,1") fail("Gentle bee leaves a multiple of 4, or takes 1");
if (petalWins([1, 1, 1], mis) || !petalWins([1, 1], mis) || petalWins([0, 0, 1], mis)) fail("misère: an odd number of single petals loses for the player to move");
if (petalWins([2, 0], PETAL_RULES.take134) || !petalWins([3, 0], PETAL_RULES.take134) || petalWins([7, 0], PETAL_RULES.take134)) fail("take {1, 3, 4}: 2 and 7 are lost, 3 is won");
// Renderer in the fake DOM: rules per level, a pending bee move plays on open, Try again and the hint label.
const actions = () => $("#actions").children.map((b) => b.textContent);
const press = (label) => $("#actions").children.find((b) => b.textContent === label).onclick();
for (const lvl of [0, 1, 2]) {
  difficulty = lvl; day = "2026-05-04"; data = { games: {} }; all[progressKey(day)] = data;
  const m = petalModel(day), reset = () => { $("#actions").children = []; };
  reset(); openSpark(25);
  if (!$("#rules").textContent.includes("you go first") || !$("#rules").textContent.includes(m.rules.win)) fail("render rules level " + lvl);
  if (!$("#board").innerHTML.includes("pflower") || ($("#board").innerHTML.match(/class="pflower/g) || []).length !== m.flowers.length) fail("render flowers level " + lvl);
  const hintLabel = actions().find((t) => /winning move/.test(t));
  if (!hintLabel || !HINT_LABEL.test(hintLabel)) fail("the hint button must match HINT_LABEL so it drains flow: " + actions());
  press(hintLabel);
  if (!/^Try taking/.test($("#feedback").textContent) || state(25).moves.length) fail("a hint names a move and changes nothing saved");
  // Her saved move with the bee's reply still pending: opening the card plays the bee at once.
  const first = petalWinningMoves(m.flowers, m.rules)[0];
  data.games[25] = { started: true, contentVersion: 2, moves: [first], tries: 0 };
  reset(); openSpark(25);
  const s = state(25), bee = petalBee(petalAfter(m.flowers, first), m.rules);
  if (s.moves.length !== 2 || s.moves[1].join() !== bee.join() || !/The bee took/.test($("#feedback").textContent)) fail("a pending bee move plays and is announced on open, level " + lvl);
  if (!$("#board").innerHTML.includes('class="pcore">' + petalReplay(m, s.moves).pos[first[0]] + "<")) fail("the board shows the replayed counts, level " + lvl);
  // A lost round: the bee empties the flowers. Try again restarts from the day's start and counts the try.
  let lose = [], g = petalReplay(m, lose);
  // She hands the bee a winning position every turn (any move that does), so the perfect bee must win.
  while (!g.over) { lose.push(g.turn ? petalBee(g.pos, m.rules) : petalMoves(g.pos, m.rules).find((mv) => petalWins(petalAfter(g.pos, mv), m.rules)) || [g.pos.indexOf(Math.max(...g.pos)), 1]); g = petalReplay(m, lose); }
  if (g.won) fail("a perfect bee must win once she gives it a winning position, level " + lvl);
  data.games[25] = { started: true, contentVersion: 2, moves: lose, tries: 0 };
  reset(); openSpark(25);
  if (actions().join() !== "Try again" || state(25).done || feedDone(day, 25)) fail("a lost round offers only Try again and doesn't count: " + actions());
  press("Try again");
  if (state(25).moves.length || state(25).tries !== 1 || !$("#board").innerHTML.includes('class="pcore">' + m.flowers[0] + "<")) fail("Try again restarts the day's position");
  // A finished winning list counts; a revealed card never does.
  data.games[25] = { started: true, contentVersion: 2, moves: [], tries: 2, done: true };
  if (!feedDone(day, 25)) fail("a win counts");
  const rv = revealState(day, 25, { moves: lose, tries: 2 });
  if (!rv.done || rv.revealed !== 1 || rv.moves.length || rv.tries !== 2) fail("reveal marks the card revealed and keeps the tries");
  data.games[25] = rv;
  if (feedDone(day, 25)) fail("a revealed card never counts");
  reset(); openSpark(25);
  if (!/A WINNING FIRST MOVE/.test($("#board").innerHTML) || !$("#board").innerHTML.includes(m.rules.idea) || actions().length) fail("reveal shows the winning first move and the idea, level " + lvl);
}
// The feed: Last Petal takes Time Lens's slot only from the cutover (checked with a test date, as in verify-feed).
{ const real = NEW_GAMES_FROM, T = "2026-12-01", set = (t) => { FEED_UNTIL[5] = FEED_SINCE[25] = t; };
  set(T);
  for (const lv of [0, 1, 2]) {
    if (!feedOrder(lv, T).includes(25) || feedOrder(lv, T).includes(5)) fail("Last Petal from the cutover at level " + lv);
    if (feedOrder(lv, "2026-11-30").includes(25) || !feedOrder(lv, "2026-11-30").includes(5)) fail("Time Lens before the cutover at level " + lv);
    const p = feedPlan(lv, T); if (p[p.indexOf(25) - 1] !== FEED_FAMILIES.bloom[lv]) fail("Last Petal sits right after bloom");
  }
  set(real);
  if (real > "2027-01-01" && feedOrder(1, "2026-12-15").includes(25)) fail("with the placeholder date, live days keep Time Lens"); }
stats.map((s, l) => ["Gentle", "Medium", "Tricky"][l] + "{avgPetals:" + (s.petals / days.length).toFixed(1) + ",beeTurns:" + (s.beeTurns / days.length).toFixed(1) + ",kinds:" + JSON.stringify(s.kinds).replace(/"/g, "") + "}").join(" ");
`, context);
console.log("PASS: Last Petal — 3 levels × 366 days deterministic and winnable (solver-checked), bee keeps its rule, replay, Try again, hint and reveal (" + ((Date.now() - t0) / 1000).toFixed(1) + "s). " + summary);
