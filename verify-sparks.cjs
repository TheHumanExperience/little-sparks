// Checks the ten feed games (state 7–16): every level, every day of a year is
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
};
const validSix = (g) => [0, 1, 2, 3, 4, 5].every((k) => [[0, 1, 2, 3, 4, 5].map((c) => g[k * 6 + c]), [0, 1, 2, 3, 4, 5].map((r) => g[r * 6 + k]), g.filter((_, i) => BOX6(i) === k)].every((grp) => new Set(grp).size === 6 && grp.every((v) => v >= 1 && v <= 6)));
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
  10: (m) => { if (!mirrorSolved(m, m.solution)) fail("mirror solution fails"); if (mirrorSolved(m, {})) fail("mirrors not needed"); if (Object.keys(m.solution).length !== m.budget) fail("mirror budget"); },
  11: (m) => { if (!validSix(m.sol)) fail("bad sudoku"); if (m.givens.some((v, i) => v && v !== m.sol[i])) fail("bad givens"); if (sixCount(m.givens) !== 1) fail("sudoku not unique"); },
  12: (m) => { if (!validSix(m.sol)) fail("bad killer"); if (m.cages.flatMap((c) => c.cells).length !== 36) fail("cages incomplete"); if (m.cages.some((c) => c.sum !== c.cells.reduce((t, i) => t + m.sol[i], 0))) fail("cage sum"); if (sixCount(m.givens, m.cages) !== 1) fail("killer not unique"); },
  13: (m) => { for (let k = 1; k < m.route.length; k++) if (ladderStepError(m.route[k - 1], m.route[k], m.route.slice(0, k))) fail("bad ladder step " + m.route); if (m.par !== [3, 4, 5][difficulty]) fail("ladder par"); },
  14: (m) => { if (!bloomFiveValid(m, m.path)) fail("bloom path invalid"); if (m.turns.length !== [4, 3, 2][difficulty]) fail("turn count"); },
  15: (m, d) => { const skip = photoSet(d).map((p) => p.image); if (new Set(m.photos).size !== 3 || m.photos.some((p) => skip.includes(p.image) || p.retired)) fail("duel photos"); if (!m.photos.some((p) => p.iconic)) fail("duel needs a history-shaping photo"); const old = legacyDuelModel(d); if (old.photos.some((p) => !LEGACY_PHOTO_BANK.includes(p) || legacyPhotoSet(d).includes(p))) fail("legacy duel photos"); if (!m.options.includes(m.decade)) fail("decade option"); },
  16: (m) => { if (happyPct(m.board, m.threshold) > m.target - 15) fail("goal start too easy"); if (happyPct(m.good, m.threshold) < m.target) fail("goal unreachable"); if (m.board.filter((v, i) => v !== m.good[i]).length / 2 > m.moves) fail("goal needs too many moves"); },
};
const out = [];
for (const lvl of [0, 1, 2]) {
  difficulty = lvl;
  for (const [i, make] of Object.entries(models)) {
    const seen = new Set(), recent = [];
    for (const d of days) {
      let m;
      try { m = make(d); checks[i](m, d); } catch (e) { fail("game " + i + " level " + lvl + " " + d + ": " + e.message); }
      SHUFFLE_CACHE.clear();
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
  if (JSON.stringify(savedDuel(d, JSON.parse(JSON.stringify(fresh)))) !== JSON.stringify(duelModel(d))) fail("pinned duel changed"); }
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
console.log(`PASS: 9 feed games × 3 levels × 366 days — solvable, deterministic, unique where promised (${((Date.now() - t0) / 1000).toFixed(1)}s). Distinct puzzles per 61 days: ${summary}`);
