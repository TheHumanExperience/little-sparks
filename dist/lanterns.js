/* Lantern Lanes (state index 22) — Light Up / Akari on every level.
   A bulb lights its own square and shines along its row and column until a wall stops it.
   Every open square must be lit, no two bulbs may shine on each other, and a numbered wall
   needs exactly that many bulbs on its four sides (diagonals don't count).
   Gentle 5×5: no numbers, a fixed bulb budget. Medium 6×6: some numbers, budget shown.
   Tricky 7×7: fewer numbers, no budget. Every puzzle has exactly one solution. */
const LANTERN_SIZE = [5, 6, 7];
const lanternSightCache = new Map();
// For every open square, the open squares a bulb there would light (itself included).
function lanternSight(m) {
  const key = m.n + ":" + Object.keys(m.walls).join(",");
  if (lanternSightCache.has(key)) return lanternSightCache.get(key);
  const sight = [];
  for (let c = 0; c < m.n * m.n; c++) {
    if (c in m.walls) { sight.push(null); continue; }
    const x0 = c % m.n, y0 = Math.floor(c / m.n), seen = [c];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      for (let x = x0 + dx, y = y0 + dy; x >= 0 && y >= 0 && x < m.n && y < m.n && !(y * m.n + x in m.walls); x += dx, y += dy) seen.push(y * m.n + x);
    }
    sight.push(seen);
  }
  lanternSightCache.set(key, sight);
  return sight;
}
const lanternSides = (m, c) => {
  const x = c % m.n, y = Math.floor(c / m.n), out = [];
  if (x > 0) out.push(c - 1);
  if (x < m.n - 1) out.push(c + 1);
  if (y > 0) out.push(c - m.n);
  if (y < m.n - 1) out.push(c + m.n);
  return out;
};
const lanternOpen = (m) => [...Array(m.n * m.n).keys()].filter((c) => !(c in m.walls));
// Everything the board shows: lit squares, clashing bulbs, each number's bulb count, solved or not.
function lanternCheck(m, bulbs) {
  const sight = lanternSight(m), on = new Set(bulbs), lit = new Set(), clash = new Set(), counts = {};
  for (const b of on) for (const c of sight[b] || []) { lit.add(c); if (c !== b && on.has(c)) clash.add(b); }
  for (const [w, k] of Object.entries(m.walls)) if (k >= 0) counts[w] = lanternSides(m, +w).filter((c) => on.has(c)).length;
  const open = lanternOpen(m);
  const solved = !clash.size && open.every((c) => lit.has(c)) && Object.entries(counts).every(([w, k]) => k === m.walls[w]) && (m.budget == null || on.size <= m.budget);
  return { lit, clash, counts, solved, open };
}
/* Counts solutions (up to `limit`) and search nodes. Branches on the unlit square with the fewest
   places a bulb could light it from; candidates before the chosen one are ruled out, so each
   solution is found exactly once. Numbers prune as soon as they're over or can't be reached. */
function lanternSolve(m, limit = 2, budget = m.budget) {
  const sight = lanternSight(m), N = m.n * m.n, open = lanternOpen(m);
  const bulb = new Uint8Array(N), banned = new Uint8Array(N), litN = new Uint8Array(N);
  const nums = Object.entries(m.walls).filter(([, k]) => k >= 0).map(([w, k]) => [lanternSides(m, +w).filter((c) => sight[c]), k]);
  let count = 0, nodes = 0, placed = 0, first = null;
  const free = (c) => !bulb[c] && !banned[c] && !litN[c];
  const numbersOk = () => nums.every(([sides, k]) => { let on = 0, can = 0; for (const c of sides) { if (bulb[c]) on++; else if (free(c)) can++; } return on <= k && on + can >= k; });
  function go() {
    nodes++;
    if (!numbersOk()) return;
    let pick = null;
    for (const c of open) {
      if (litN[c]) continue;
      const cand = sight[c].filter(free);
      if (!pick || cand.length < pick.length) pick = cand;
      if (!cand.length) return;
    }
    if (!pick) {
      count++;
      if (!first) first = open.filter((c) => bulb[c]);
      return;
    }
    if (budget != null && placed >= budget) return;
    const ruled = [];
    for (const b of pick) {
      bulb[b] = 1; placed++;
      for (const c of sight[b]) litN[c]++;
      go();
      for (const c of sight[b]) litN[c]--;
      bulb[b] = 0; placed--;
      if (count >= limit) break;
      banned[b] = 1; ruled.push(b);
    }
    for (const b of ruled) banned[b] = 0;
  }
  go();
  return { count, nodes, first };
}
const lanternCache = new Map();
function lanternModel(d, lvl = difficulty) {
  const key = d + "|" + lvl;
  if (lanternCache.has(key)) return lanternCache.get(key);
  const n = LANTERN_SIZE[lvl], r = rng(puzzleSeed(d) + "lanterns"), [wMin, wMax] = [[4, 6], [6, 9], [9, 13]][lvl];
  // Gentle keeps the gentlest of a few gardens; Medium and Tricky keep the one the solver works hardest on.
  const wanted = [3, 4, 8][lvl], better = (a, b) => (lvl === 0 ? a.nodes < b.nodes : a.nodes > b.nodes);
  let best = null, found = 0;
  for (let attempt = 0; attempt < 600 && found < wanted; attempt++) {
    const walls = {};
    const wallCount = wMin + Math.floor(r() * (wMax - wMin + 1));
    for (const c of shuffle([...Array(n * n).keys()], r).slice(0, wallCount)) walls[c] = -1;
    const m = { n, walls, budget: null };
    if (lanternOpen(m).length < n * n - wMax) continue;
    // A random full lighting: keep dropping a bulb on a random dark square.
    const sight = lanternSight(m), lit = new Set(), bulbs = [];
    for (const c of shuffle(lanternOpen(m), r)) if (!lit.has(c)) { bulbs.push(c); sight[c].forEach((x) => lit.add(x)); }
    let model;
    if (lvl === 0) {
      // No numbers: the budget is the fewest bulbs that light the garden, and that layout must be the only one.
      const fewest = lanternFewest(m);
      if (!fewest) continue;
      model = { n, walls, budget: fewest.size, solution: fewest.bulbs };
    } else {
      const sol = bulbs.sort((a, b) => a - b), on = new Set(sol);
      for (const w of Object.keys(walls)) walls[w] = lanternSides(m, +w).filter((c) => on.has(c)).length;
      model = { n, walls, budget: lvl === 1 ? sol.length : null, solution: sol };
      if (lanternSolve(model, 2).count !== 1) continue;
      // Hide numbers one by one while the answer stays unique; Medium keeps a few more.
      const keep = lvl === 1 ? 2 : 1;
      for (const w of shuffle(Object.keys(walls), r)) {
        if (Object.values(walls).filter((k) => k >= 0).length <= keep) break;
        const k = walls[w];
        walls[w] = -1;
        if (lanternSolve(model, 2).count !== 1) walls[w] = k;
      }
    }
    model.nodes = lanternSolve(model, Infinity).nodes;
    found++;
    if (!best || better(model, best)) best = model;
  }
  if (!best) throw Error("Lantern Lanes generation failed for " + d);
  if (lanternSightCache.size > 400) lanternSightCache.clear();
  lanternCache.set(key, best);
  return best;
}
// The fewest bulbs that light every square, if exactly one layout achieves it.
function lanternFewest(m) {
  for (let b = 1; b <= m.n * m.n; b++) {
    const r = lanternSolve(m, 2, b);
    if (r.count === 1) return { size: b, bulbs: r.first };
    if (r.count > 1) return null;
  }
  return null;
}

/* Tiny example boards for How to play. Codes: . dark, o lit, B bulb, X clashing bulb, # wall, digit numbered wall. */
function lanternMini(rows, cls = "") {
  const cells = rows.join("").split("").map((ch) => {
    if (ch === "#") return `<span class="lw"></span>`;
    if (/\d/.test(ch)) return `<span class="lw lwok">${ch}</span>`;
    if (ch === "B") return `<span class="lb">💡</span>`;
    if (ch === "X") return `<span class="lb lx">💡</span>`;
    if (ch === "d") return `<span class="lb ldiag">💡</span>`;
    return `<span class="${ch === "o" ? "lo" : ""}"></span>`;
  });
  return `<span class="lmini ${cls}" style="grid-template-columns:repeat(${rows[0].length},1fr)" aria-hidden="true">${cells.join("")}</span>`;
}
function lanternHowTo(m) {
  return `<span class="lanrule">A number counts bulbs touching its 4 sides (not diagonals).</span>`
    + `<span class="lansteps">`
    + `<span class="lanstep"><b>1 · Light every square.</b> A bulb lights its whole row and column until a wall stops it.${lanternMini(["Boo", "o#.", "o.."])}</span>`
    + `<span class="lanstep"><b>2 · Bulbs can't see each other.</b> Two bulbs in one line clash (red) unless a wall sits between them.<span class="lanpair">${lanternMini(["XoX"])}<span class="lanok">✓</span>${lanternMini(["B#B"])}</span></span>`
    + `<span class="lanstep"><b>3 · Numbers count neighbours${m.budget != null && !Object.values(m.walls).some((k) => k >= 0) ? " (from Medium on)" : ""}.</b> This 2 has a bulb above and one to its left. The corner bulb is diagonal, so it doesn't count.${lanternMini(["oBo", "B2.", "o.d"])}</span>`
    + `</span>`
    + `<span class="lanrule">Tap a square: 💡 bulb, tap again: • (no bulb here), again: empty. A long press drops a dot too.${m.budget != null ? ` You have exactly ${m.budget} bulbs.` : ""}</span>`;
}
function lanternLanes(i) {
  const m = lanternModel(day), s = state(i);
  s.bulbs ||= [];
  s.dots ||= [];
  $("#rules").innerHTML = lanternHowTo(m);
  let pressTimer = 0, longPressed = false;
  function draw() {
    const v = lanternCheck(m, s.bulbs), on = new Set(s.bulbs), dots = new Set(s.dots);
    let html = `<div class="lantgrid ${s.done ? "solved" : ""}" style="grid-template-columns:repeat(${m.n},1fr)">`;
    for (let c = 0; c < m.n * m.n; c++) {
      const row = Math.floor(c / m.n) + 1, col = (c % m.n) + 1;
      if (c in m.walls) {
        const k = m.walls[c], have = v.counts[c];
        const cls = k < 0 ? "" : have === k ? "ok" : have > k ? "over" : "";
        html += `<span class="lwall ${cls}" aria-label="Row ${row}, column ${col}, wall${k >= 0 ? ` numbered ${k}, ${have} bulb${have === 1 ? "" : "s"} beside it` : ""}">${k >= 0 ? k : ""}</span>`;
        continue;
      }
      const b = on.has(c), clash = v.clash.has(c), lit = v.lit.has(c);
      html += `<button class="lcell ${lit ? "lit" : ""} ${b ? "bulb" : ""} ${clash ? "clash" : ""}" data-lc="${c}" aria-label="Row ${row}, column ${col}${b ? ", bulb" + (clash ? ", sees another bulb" : "") : dots.has(c) ? ", marked no bulb" : ""}${lit && !b ? ", lit" : ""}">${b ? "💡" : dots.has(c) ? "•" : ""}</button>`;
    }
    const left = m.budget == null ? "" : `Bulbs left: ${m.budget - s.bulbs.length} · `;
    $("#board").innerHTML = html + `</div><p class="small">${left}Squares lit: ${v.open.filter((c) => v.lit.has(c)).length} / ${v.open.length}</p>`;
    $("#board").querySelectorAll("[data-lc]").forEach((btn) => {
      const c = +btn.dataset.lc;
      btn.onpointerdown = () => { longPressed = false; clearTimeout(pressTimer); pressTimer = setTimeout(() => { longPressed = true; toggleDot(c); }, 450); };
      btn.onpointerup = btn.onpointerleave = btn.onpointercancel = () => clearTimeout(pressTimer);
      btn.oncontextmenu = (e) => e.preventDefault();
      btn.onclick = () => { clearTimeout(pressTimer); if (longPressed) { longPressed = false; return; } cycle(c); };
    });
  }
  function after() {
    persist();
    if (!s.done && lanternCheck(m, s.bulbs).solved) sparkSolved("Every lane is glowing!");
    else if (!s.done) {
      const v = lanternCheck(m, s.bulbs);
      msg(v.clash.size ? "Two bulbs can see each other. Move one, or put a wall between them." : Object.entries(v.counts).some(([w, k]) => k > m.walls[w]) ? "A number has too many bulbs beside it." : "");
    }
    draw();
  }
  function toggleDot(c) {
    if (s.done) return;
    s.bulbs = s.bulbs.filter((b) => b !== c);
    s.dots = s.dots.includes(c) ? s.dots.filter((x) => x !== c) : [...s.dots, c];
    after();
  }
  function cycle(c) {
    if (s.done) return;
    if (s.bulbs.includes(c)) { s.bulbs = s.bulbs.filter((b) => b !== c); s.dots = [...s.dots, c]; }
    else if (s.dots.includes(c)) s.dots = s.dots.filter((x) => x !== c);
    else if (m.budget != null && s.bulbs.length >= m.budget) { s.dots = [...s.dots, c]; persist(); draw(); return msg(`That's all ${m.budget} bulbs. Tap a bulb to move it.`); }
    else s.bulbs = [...s.bulbs, c];
    after();
  }
  draw();
  action("Clear bulbs", () => { if (s.done) return; s.bulbs = []; s.dots = []; persist(); draw(); msg(""); }, true);
  action("A gentle hint", () => {
    if (s.done) return;
    const want = new Set(m.solution), wrong = s.bulbs.find((b) => !want.has(b));
    const where = (c) => `row ${Math.floor(c / m.n) + 1}, column ${(c % m.n) + 1}`;
    if (wrong !== undefined) return msg(`The bulb on ${where(wrong)} isn't part of the answer.`);
    const missing = m.solution.find((b) => !s.bulbs.includes(b));
    msg(missing === undefined ? "Your bulbs are perfect." : `Try a bulb on ${where(missing)}.`);
  }, true);
}
SPARKS[22] = { name: "Lantern Lanes", blurb: "Light every lane. Keep the lanterns apart.", type: "Light", art: "💡 ▦ ✦", render: lanternLanes };
