/* Little Sparks — 25 · Last Petal (game theory). Take turns with the bee; she always moves first, from a
   position she can win. The bee plays perfectly: if it has a winning move it plays the first one (flowers in
   order, smallest take first), otherwise it takes 1 petal from the largest flower. Losing is gentle: Try again
   restarts the day's position, with no limit; winning on any try counts as solved.
   Gentle: one flower of 10–21 petals, take 1–3. Medium: Nim on three flowers of 1–7. Tricky alternates by day
   between misère Nim (taking the last petal loses) and two flowers with take {1, 3, 4}.
   Save: {moves: [[flower, taken], ...], tries, done}. Moves alternate her, bee, her, ...; the start position
   is derived from the date and level, and replaying the moves rebuilds the board. Loaded after globe.js. */
const PETAL_RULES = {
  four: { take: [1, 2, 3], misere: false, how: "On each turn, take 1, 2 or 3 petals.", win: "Whoever takes the last petal wins.",
    idea: "Leave the bee a multiple of 4 each turn.", found: "You kept leaving the bee a multiple of 4. That's the secret! ✦" },
  nim: { take: null, misere: false, how: "On each turn, pick one flower and take as many petals from it as you like.", win: "Whoever takes the last petal wins.",
    idea: "Split every flower into 4s, 2s and 1s, and leave the bee each size in pairs.", found: "Every size in pairs: you found the Nim secret! ✦" },
  misere: { take: null, misere: true, how: "On each turn, pick one flower and take as many petals from it as you like.", win: "Careful: whoever takes the last petal loses.",
    idea: "Pair up the 4s, 2s and 1s as in ordinary Nim, but at the very end leave the bee an odd number of single petals.", found: "Pairs all the way, then an odd number of single petals at the end. Clever! ✦" },
  take134: { take: [1, 3, 4], misere: false, how: "On each turn, pick one flower and take 1, 3 or 4 petals from it.", win: "Whoever takes the last petal wins.",
    idea: "Count each flower in sevens. What's left over gives it a weight: 0 or 2 weigh 0, 1 or 3 weigh 1, 4 or 6 weigh 2, 5 weighs 3. Leave the bee two flowers of equal weight.",
    found: "Equal weights, counting in sevens: you outfoxed the bee! ✦" },
};
const PETAL_ORDINAL = ["first", "second", "third"];
// Every legal move [flower, taken], flowers in order and smallest take first (the bee's fixed order).
function petalMoves(pos, rules) {
  const out = [];
  pos.forEach((n, f) => { for (const t of rules.take || Array.from({ length: n }, (_, k) => k + 1)) if (t <= n) out.push([f, t]); });
  return out;
}
const petalAfter = (pos, [f, t]) => pos.map((n, k) => (k === f ? n - t : n));
const PETAL_MEMO = new Map();
// True when the player to move can force a win. With no petals left the previous player took the last one.
function petalWins(pos, rules) {
  if (pos.every((n) => !n)) return !!rules.misere;
  const key = (rules.misere ? "m" : "n") + (rules.take || "any") + ":" + [...pos].sort((a, b) => a - b).join(",");
  if (PETAL_MEMO.has(key)) return PETAL_MEMO.get(key);
  const w = petalMoves(pos, rules).some((mv) => !petalWins(petalAfter(pos, mv), rules));
  PETAL_MEMO.set(key, w);
  return w;
}
const petalWinningMoves = (pos, rules) => petalMoves(pos, rules).filter((mv) => !petalWins(petalAfter(pos, mv), rules));
function petalBee(pos, rules) {
  const win = petalWinningMoves(pos, rules);
  if (win.length) return win[0];
  const big = pos.indexOf(Math.max(...pos));
  return [big, 1];
}
// Replays a move list from the start: the board, whose turn it is (0 her, 1 bee) and, once empty, who won.
function petalReplay(m, moves) {
  let pos = m.flowers.slice();
  for (const mv of moves) pos = petalAfter(pos, mv);
  const over = pos.every((n) => !n), last = (moves.length - 1) % 2;
  return { pos, turn: moves.length % 2, over, won: over && (m.rules.misere ? last === 1 : last === 0) };
}
const petalCache = new Map();
function petalModel(d, lvl = difficulty) {
  const key = d + "|" + lvl;
  if (petalCache.has(key)) return petalCache.get(key);
  const base = puzzleSeed(d) + "|petal-v1";
  const kind = lvl === 0 ? "four" : lvl === 1 ? "nim" : rng(base + "|kind")() < 0.5 ? "misere" : "take134";
  const rules = PETAL_RULES[kind], fair = (fl) => {
    if (!petalWins(fl, rules)) return false;
    if (kind === "four") return true;
    // No flower holds most of the petals, and no two flowers match (that makes the first move too plain).
    if (new Set(fl).size !== fl.length) return false;
    if (kind === "take134") return true;
    return 2 * Math.max(...fl) <= fl.reduce((a, b) => a + b, 0) && (kind !== "misere" || fl.filter((n) => n > 1).length >= 2);
  };
  let flowers = null;
  // Re-roll the seed tag until the start is winnable and not trivial.
  for (let k = 0; k < 400 && !flowers; k++) {
    const r = rng(base + (k ? "|" + k : "")), fl = kind === "four" ? [10 + Math.floor(r() * 12)]
      : kind === "take134" ? [0, 1].map(() => 5 + Math.floor(r() * 11)) : [0, 1, 2].map(() => 1 + Math.floor(r() * 7));
    if (fair(fl)) flowers = fl;
  }
  if (!flowers) throw Error("Last Petal generation failed for " + d);
  const m = { kind, flowers, rules };
  petalCache.set(key, m);
  return m;
}
const petalWhere = (m, f) => (m.flowers.length === 1 ? "the flower" : `the ${PETAL_ORDINAL[f]} flower`);
const petalTake = (t) => `${t} petal${t === 1 ? "" : "s"}`;

function lastPetal(i) {
  const d = day, m = petalModel(d), s = state(i), board = $("#board"), calm = calmMotion();
  s.moves ||= [];
  s.tries ||= 0;
  $("#rules").textContent = `Take turns with the bee, and you go first. ${m.rules.how} ${m.rules.win} The bee plays perfectly, so look for the pattern that wins. If the bee wins, try again as often as you like.`;
  let pick = m.flowers.length === 1 ? 0 : null, hinted = null, fallen = null, busy = false;
  const still = () => $("#board") === board && active === i && day === d;
  function draw() {
    const g = petalReplay(m, s.moves), size = [150, 128, 96][m.flowers.length - 1], show = s.revealed && s.done ? m.flowers : g.pos;
    const firstWin = petalWinningMoves(m.flowers, m.rules)[0];
    let html = `<div class="petalrow">${show.map((n, f) => {
      const gone = fallen && fallen[0] === f ? fallen[1] : 0, slots = n + gone, R = size * 0.32, pw = Math.max(5, Math.min(14, ((2 * Math.PI * R) / Math.max(slots, 1)) * 0.75));
      const petals = Array.from({ length: slots }, (_, k) => `<i class="petal ${k >= n ? "gone" : ""}" style="--a:${((360 * k) / Math.max(slots, 6)).toFixed(1)}deg"></i>`).join("");
      const mark = s.revealed && s.done && firstWin && firstWin[0] === f ? " shown" : "";
      return `<button type="button" class="pflower ${pick === f && !s.done ? "picked" : ""}${hinted && hinted[0] === f ? " hinted" : ""}${mark}" data-pf="${f}" style="--s:${size}px;--r:${R.toFixed(1)}px;--pw:${pw.toFixed(1)}px" aria-label="${petalWhere(m, f).replace(/^the /, "")}, ${petalTake(n)}"${s.done || !n ? " disabled" : ""}>${petals}<b class="pcore">${n}</b></button>`;
    }).join("")}</div>`;
    if (s.done && s.revealed && firstWin) html += `<div class="reveal"><span class="eyebrow">A WINNING FIRST MOVE</span><h3>Take ${petalTake(firstWin[1])} from ${petalWhere(m, firstWin[0])}</h3><p>${m.rules.idea}</p></div>`;
    else if (s.done) html += `<div class="reveal found"><span class="eyebrow">YOU BEAT THE BEE ✦</span><p>${m.rules.idea}</p></div>`;
    else if (g.over) html += `<p class="petalturn">The bee won this round.</p>`;
    else {
      const f = pick, n = f == null ? 0 : g.pos[f], takes = f == null ? [] : (m.rules.take || Array.from({ length: n }, (_, k) => k + 1)).filter((t) => t <= n);
      html += `<p class="petalturn">${busy || g.turn ? "The bee is thinking…" : f == null ? "Your turn: tap a flower." : `Your turn: take from ${petalWhere(m, f)}.`}${s.tries ? ` · Try ${s.tries + 1}` : ""}</p>`;
      html += `<div class="petaltakes">${takes.map((t) => `<button type="button" class="choice ptake${hinted && hinted[0] === f && hinted[1] === t ? " hinted" : ""}" data-pt="${t}"${busy ? " disabled" : ""}>Take ${t}</button>`).join("")}</div>`;
    }
    board.innerHTML = html;
    fallen = null;
    board.querySelectorAll("[data-pf]").forEach((b) => (b.onclick = () => { if (s.done || busy) return; pick = +b.dataset.pf; hinted = hinted && hinted[0] === pick ? hinted : null; draw(); }));
    board.querySelectorAll("[data-pt]").forEach((b) => (b.onclick = () => play([pick, +b.dataset.pt])));
    buttons(g);
  }
  function buttons(g) {
    $("#actions").innerHTML = "";
    if (s.done) return;
    if (g.over) return action("Try again", restart);
    action("Hint: show me a winning move", hint, true);
    if (s.moves.length) action("Start over", restart, true);
  }
  function restart() {
    if (s.done) return;
    s.moves = []; s.tries++; busy = false; hinted = null; pick = m.flowers.length === 1 ? 0 : null;
    persist(); draw(); msg("Back to the start. Your move.");
  }
  function hint() {
    const g = petalReplay(m, s.moves);
    if (s.done || g.over || g.turn || busy) return;
    const win = petalWinningMoves(g.pos, m.rules);
    if (!win.length) { hinted = null; draw(); return msg("No winning move from here. Try again ↺"); }
    hinted = win[0]; pick = hinted[0]; draw();
    msg(`Try taking ${petalTake(hinted[1])} from ${petalWhere(m, hinted[0])}.`);
  }
  function play(mv) {
    const g = petalReplay(m, s.moves);
    if (s.done || busy || g.over || g.turn || mv[0] == null || !petalMoves(g.pos, m.rules).some((x) => x[0] === mv[0] && x[1] === mv[1])) return;
    s.moves.push(mv); persist(); fallen = mv; hinted = null;
    if (finish()) return;
    busy = !calm; draw();
    msg(`You took ${petalTake(mv[1])} from ${petalWhere(m, mv[0])}.${calm ? "" : " The bee is thinking…"}`);
    if (calm) bee(); else setTimeout(() => { if (still()) { busy = false; bee(); } }, 700);
  }
  function bee() {
    const g = petalReplay(m, s.moves);
    if (s.done || g.over || !g.turn) return;
    const mv = petalBee(g.pos, m.rules);
    s.moves.push(mv); persist(); fallen = mv;
    const said = `The bee took ${petalTake(mv[1])} from ${petalWhere(m, mv[0])}.`;
    if (finish()) return;
    if (m.flowers.length > 1 && !petalReplay(m, s.moves).pos[pick]) pick = null;
    draw(); msg(said + " Your move.");
  }
  // Ends a round once the flowers are bare: a win solves the card, a loss offers Try again.
  function finish() {
    const g = petalReplay(m, s.moves);
    if (!g.over) return false;
    if (g.won) { draw(); sparkSolved(m.rules.found); return true; }
    draw();
    msg(m.rules.misere ? "You took the last petal, so the bee wins this round. Try again ↺" : "The bee took the last petal. Try again ↺");
    return true;
  }
  draw();
  // A bee move saved as pending (she left mid-turn) plays straight away.
  if (!s.done && !petalReplay(m, s.moves).over && petalReplay(m, s.moves).turn) bee();
}
SPARKS[25] = { name: "Last Petal", blurb: "Take turns with the bee. Whoever takes the last petal wins.", type: "Strategy", art: "✿ ✿ ✿", render: lastPetal };
