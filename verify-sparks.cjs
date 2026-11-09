// Checks the feed games (state 8–16 and 21): every level, every day of a year is
// deterministic, solvable by its own checker, unique where promised, and varied.
const fs = require("fs"), vm = require("vm");
const nodes = new Map();
function element() {
  return { textContent: "", innerHTML: "", value: "", open: false, children: [], dataset: {}, querySelectorAll: () => [], classList: { add() {}, remove() {}, toggle() {} }, append(b) { this.children.push(b); }, showModal() { this.open = true; }, close() { this.open = false; } };
}
const document = { querySelector(s) { if (!nodes.has(s)) nodes.set(s, element()); return nodes.get(s); }, querySelectorAll: () => [], createElement: () => element(), addEventListener() {} };
const context = { document, localStorage: { getItem: () => null, setItem: () => {} }, window: {}, setInterval: () => {} };
vm.createContext(context);
for (const f of ["valid-words.js", "app.js", "daily-content.js", "photos.js", "extras.js", "stories.js", "ladders.js", "sparks.js"]) vm.runInContext(fs.readFileSync("dist/" + f, "utf8"), context);
const t0 = Date.now();
const summary = vm.runInContext(`
const fail = (m) => { throw Error(m); };
const days = Array.from({ length: 366 }, (_, n) => new Date(Date.UTC(2026, 0, 1 + n)).toISOString().slice(0, 10));
const models = {
  8: storyModel, 9: alchemyModel, 10: mirrorModel, 11: sudokuSixModel,
  12: killerSixModel, 13: ladderModel, 14: bloomFiveModel, 15: duelModel, 16: goalModel,
  21: hardSixModel,
};
// Sudoku Six · Hard only appears on Tricky and ignores the level, so it is checked once.
const onlyTricky = new Set(["21"]);
const validSix = (g) => [0, 1, 2, 3, 4, 5].every((k) => [[0, 1, 2, 3, 4, 5].map((c) => g[k * 6 + c]), [0, 1, 2, 3, 4, 5].map((r) => g[r * 6 + k]), g.filter((_, i) => BOX6(i) === k)].every((grp) => new Set(grp).size === 6 && grp.every((v) => v >= 1 && v <= 6)));
const mirrorStats = [0, 1, 2].map(() => ({ nodes: 0, oldNodes: 0, oldUnique: 0 }));
const killerStats = { givens: 0, cages: 0, hidden: 0, n: 0 }, hardSix = { givens: 0, hidden: 0, n: 0, max: 0 }, killerGivens = [0, 0, 0];
const checks = {
  8: (m) => {
    const keys = m.accepted.map((o) => o.join(""));
    if (keys[0] !== "012345") fail("canonical story order must come first in accepted");
    if (new Set(keys).size !== keys.length) fail("duplicate accepted story order");
    for (const o of m.accepted) if (o.length !== 6 || [...o].sort().join("") !== "012345") fail("accepted order is not a permutation: " + o);
    if (!storyAccepted(m, [0, 1, 2, 3, 4, 5]) || storyAccepted(m, m.start)) fail("story starts solved or canonical rejected");
    if (m.cards.some((c) => "clues" in c)) fail("story cards still carry link clues");
    let o = m.start, hints = 0, step;
    while ((step = storyHintStep(m, o))) { o = step.order; if (++hints > 5) fail("hints don't finish the story"); }
    if (!storyAccepted(m, o)) fail("hints end on an unaccepted order");
  },
  9: (m) => { if (!alchemyMatch(m, m.target)) fail("recipe rejected"); if (alchemyMatch(m, m.bases.map(() => 0))) fail("empty pot matches"); },
  10: (m, d) => { if (!mirrorSolved(m, m.solution)) fail("mirror solution fails"); if (mirrorSolved(m, {})) fail("mirrors not needed"); if (Object.keys(m.solution).length !== m.budget) fail("mirror budget");
    if (m.n !== [5, 6, 7][difficulty]) fail("mirror garden size");
    // Exactly one layout of on-beam mirrors lights every flower, and it is the stored answer.
    const r = mirrorSolve(m, 2);
    if (r.count !== 1 || JSON.stringify(Object.entries(r.first).sort()) !== JSON.stringify(Object.entries(m.solution).sort())) fail("mirror garden not unique (" + r.count + ")");
    const all = mirrorSolve(m, Infinity), old = mirrorSolve(legacyMirrorModel(d), Infinity);
    mirrorStats[difficulty].nodes += all.nodes; mirrorStats[difficulty].oldNodes += old.nodes; mirrorStats[difficulty].oldUnique += old.count === 1 ? 1 : 0; },
  11: (m) => { if (!validSix(m.sol)) fail("bad sudoku"); if (m.givens.some((v, i) => v && v !== m.sol[i])) fail("bad givens"); if (sixCount(m.givens) !== 1) fail("sudoku not unique"); },
  12: (m) => { if (!validSix(m.sol)) fail("bad killer"); if (m.cages.flatMap((c) => c.cells).length !== 36) fail("cages incomplete"); if (m.cages.some((c) => c.sum !== c.cells.reduce((t, i) => t + m.sol[i], 0))) fail("cage sum"); if (sixCount(m.givens, m.cages) !== 1) fail("killer not unique");
    killerGivens[difficulty] += m.givens.filter(Boolean).length;
    // Gentle stays friendly: plenty of givens, and naked singles alone finish it.
    if (difficulty === 0 && (m.givens.filter(Boolean).length < 12 || sixSingles(m.givens, m.cages))) fail("gentle killer too hard");
    // Tricky must be genuinely harder: big cages, at most five givens, and naked singles alone stall,
    // yet hidden singles (with cage sums) always finish it, so it never needs guessing.
    if (difficulty === 2) {
      const givens = m.givens.filter(Boolean).length, singles = m.cages.filter((c) => c.cells.length === 1).length;
      if (singles) fail("tricky killer has single-cell cages");
      if (givens > 5) fail("tricky killer gives " + givens + " digits");
      if (!sixSingles(m.givens, m.cages)) fail("tricky killer falls to naked singles");
      if (sixSingles(m.givens, m.cages, true)) fail("tricky killer needs more than hidden singles");
      killerStats.givens += givens; killerStats.cages += m.cages.length; killerStats.hidden += sixSingles(m.givens, m.cages, true) ? 0 : 1; killerStats.n++;
    } },
  21: (m) => { checks[11](m); const n = m.givens.filter(Boolean).length;
    if (n > 11) fail("hard sudoku gives " + n + " digits");
    if (!sixSingles(m.givens)) fail("hard sudoku falls to naked singles");
    hardSix.givens += n; hardSix.max = Math.max(hardSix.max, n); hardSix.hidden += sixSingles(m.givens, null, true) ? 0 : 1; hardSix.n++; },
  13: (m) => { for (let k = 1; k < m.route.length; k++) if (ladderStepError(m.route[k - 1], m.route[k], m.route.slice(0, k))) fail("bad ladder step " + m.route); if (m.par !== [3, 4, 5][difficulty]) fail("ladder par"); },
  14: (m) => { if (!bloomFiveValid(m, m.path)) fail("bloom path invalid"); if (m.turns.length !== [4, 3, 2][difficulty]) fail("turn count"); },
  15: (m, d) => { const skip = photoSet(d).map((p) => p.image); if (new Set(m.photos).size !== 3 || m.photos.some((p) => skip.includes(p.image) || p.retired)) fail("duel photos"); if (!m.photos.some((p) => p.iconic)) fail("duel needs a history-shaping photo"); const old = legacyDuelModel(d); if (old.photos.some((p) => !LEGACY_PHOTO_BANK.includes(p) || legacyPhotoSet(d).includes(p))) fail("legacy duel photos"); if (!m.options.includes(m.decade)) fail("decade option"); },
  16: (m) => { if (happyPct(m.board, m.threshold) > m.target - 15) fail("goal start too easy"); if (happyPct(m.good, m.threshold) < m.target) fail("goal unreachable"); if (m.board.filter((v, i) => v !== m.good[i]).length / 2 > m.moves) fail("goal needs too many moves"); },
};
const out = [];
for (const lvl of [0, 1, 2]) {
  difficulty = lvl;
  for (const [i, make] of Object.entries(models)) {
    if (onlyTricky.has(i) && lvl !== 2) continue;
    const seen = new Set(), recent = [];
    for (const d of days) {
      let m;
      try { m = make(d); checks[i](m, d); } catch (e) { fail("game " + i + " level " + lvl + " " + d + ": " + e.message); }
      SHUFFLE_CACHE.clear(); mirrorCache.clear();
      if (JSON.stringify(make(d)) !== JSON.stringify(m)) fail("game " + i + " not deterministic on " + d);
      recent.push(JSON.stringify(m));
    }
    const distinct = new Set(recent.slice(0, 61)).size;
    // Colour Alchemy cycles a finite recipe pool, so it may only repeat once the pool is used up.
    if (distinct < (i === "9" ? Math.min(50, alchemyPool(lvl).length) : 50)) fail("game " + i + " level " + lvl + " only " + distinct + " distinct puzzles in 61 days");
    out.push(i + ":" + distinct);
  }
}
// Duels saved before photo pinning keep the legacy model; new ones pin their photos.
difficulty = 1;
{ const d = "2026-05-04", legacy = { picks: [0], misses: 0 }, fresh = {};
  if (JSON.stringify(savedDuel(d, legacy)) !== JSON.stringify(legacyDuelModel(d))) fail("legacy duel changed");
  if (JSON.stringify(savedDuel(d, fresh)) !== JSON.stringify(duelModel(d))) fail("fresh duel");
  if (JSON.stringify(savedDuel(d, JSON.parse(JSON.stringify(fresh)))) !== JSON.stringify(duelModel(d))) fail("pinned duel changed");
  // A save pinned to a photo since deleted from the bank still loads, with its same-year stand-in.
  const gone = Object.keys(REMOVED_PHOTOS)[0], pin = { duelIds: [gone, ...fresh.duelIds.slice(1)], duelDecade: fresh.duelDecade, duelOptions: fresh.duelOptions };
  if (savedDuel(d, pin).photos.some((p) => !p || p.image === gone)) fail("removed photo save must fall back"); }
// Tricky Killer saves started before the harder generator keep their original puzzle.
difficulty = 2;
{ const d = "2026-05-04", old = { values: legacyKillerModel(d, 2).givens.slice() }, fresh = {};
  if (JSON.stringify(savedKiller(d, old)) !== JSON.stringify(legacyKillerModel(d, 2))) fail("legacy killer changed");
  if (JSON.stringify(savedKiller(d, fresh)) !== JSON.stringify(killerSixModel(d)) || fresh.hard !== 2) fail("fresh killer should use the hard model");
  // Games started on the first Tricky generator (hard: 1) keep their puzzle.
  const v1 = { values: hardKillerModel(d, 1).givens.slice(), hard: 1 };
  if (JSON.stringify(savedKiller(d, v1)) !== JSON.stringify(hardKillerModel(d, 1)) || v1.hard !== 1) fail("hard v1 killer save changed");
  if (sixCount(hardKillerModel(d, 1).givens, hardKillerModel(d, 1).cages) !== 1) fail("hard v1 killer not unique"); }
// Gardens started on the first generator keep their puzzle; new ones use the harder one.
{ const d = "2026-05-04", old = { mirrors: { 7: "/" } }, done = { done: true, mirrors: {} }, fresh = {};
  if (JSON.stringify(savedMirror(d, old)) !== JSON.stringify(legacyMirrorModel(d, 2)) || old.v2) fail("legacy mirror save changed");
  if (JSON.stringify(savedMirror(d, done)) !== JSON.stringify(legacyMirrorModel(d, 2))) fail("solved legacy mirror changed");
  if (JSON.stringify(savedMirror(d, fresh)) !== JSON.stringify(mirrorModel(d)) || !fresh.v2) fail("fresh mirror should use the new model");
  fresh.mirrors = { 3: "/" };
  if (JSON.stringify(savedMirror(d, fresh)) !== JSON.stringify(mirrorModel(d))) fail("v2 mirror save switched back"); }
const mirrorAvg = mirrorStats.map((x) => x.nodes / days.length);
if (!(mirrorAvg[0] < mirrorAvg[1] && mirrorAvg[1] < mirrorAvg[2])) fail("mirror search effort must rise Gentle < Medium < Tricky: " + mirrorAvg);
mirrorStats.forEach((x, l) => { if (x.nodes < 2 * x.oldNodes) fail("mirror level " + l + " not noticeably harder than before"); });
out.push("mirrorSolverNodes{before:" + mirrorStats.map((x) => (x.oldNodes / days.length).toFixed(0)).join("/") + ",after:" + mirrorAvg.map((v) => v.toFixed(0)).join("/") + ",uniqueBefore:" + mirrorStats.map((x) => x.oldUnique).join("/") + ",uniqueAfter:366/366/366}");
if (!(killerGivens[0] > killerGivens[1] && killerGivens[1] > killerGivens[2])) fail("killer givens must fall Gentle > Medium > Tricky: " + killerGivens);
out.push("killerAvgGivens{" + killerGivens.map((g) => (g / days.length).toFixed(2)).join("/") + "}");
out.push("sudokuHard{avgGivens:" + (hardSix.givens / hardSix.n).toFixed(2) + ",maxGivens:" + hardSix.max + ",hiddenSinglesSolve:" + hardSix.hidden + "/" + hardSix.n + ",nakedSinglesSolve:0}");
out.push("killerTricky{avgGivens:" + (killerStats.givens / killerStats.n).toFixed(2) + ",avgCages:" + (killerStats.cages / killerStats.n).toFixed(1) + ",hiddenSinglesSolve:" + killerStats.hidden + "/" + killerStats.n + ",nakedSinglesSolve:0}");
// Smoke-render each game into the fake DOM and play a scripted solve.
difficulty = 1; day = "2026-05-04"; data = { games: {} };
for (const i of Object.keys(models)) { openSpark(+i); if (!$("#rules").textContent || !$("#board").innerHTML) fail("render " + i); }
out.join(" ");
`, context);
vm.runInContext(`const eq = (a, b) => a.join("") === b.join("");
if (!eq(storyMove([1, 2, 3, 4, 5, 6], 3, 1), [1, 4, 2, 3, 5, 6])) throw Error("story move up should insert and shift");
if (!eq(storyMove([1, 2, 3, 4, 5, 6], 1, 4), [1, 3, 4, 5, 2, 6])) throw Error("story move down should insert and shift");
if (!eq(storyMove([1, 2, 3, 4, 5, 6], 2, 2), [1, 2, 3, 4, 5, 6])) throw Error("story move in place");
const base = [1, 2, 3, 4, 5, 6]; storyMove(base, 0, 5); if (!eq(base, [1, 2, 3, 4, 5, 6])) throw Error("story move mutates input");
`, context);
vm.runInContext(`if (typeof starModel !== "undefined" || SPARKS[7]) throw Error("Starlines should be retired");
for (const st of STORIES) {
  if (!st.accepted || st.accepted[0].join("") !== "012345") throw Error("story needs accepted orders starting with the canonical one: " + st.title);
  for (const o of st.accepted) if (o.length !== 6 || [...o].sort().join("") !== "012345") throw Error("bad accepted order in " + st.title);
  if (st.beats.some(([tag, body]) => /Right (after|before)|Two cards after/.test(body))) throw Error("clue text left in " + st.title);
}`, context);
console.log(`PASS: 9 feed games × 3 levels + Sudoku Six · Hard on Tricky × 366 days — solvable, deterministic, unique where promised (${((Date.now() - t0) / 1000).toFixed(1)}s). Distinct puzzles per 61 days: ${summary}`);
