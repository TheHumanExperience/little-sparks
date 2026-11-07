/* Garden Beds (state index 23) — Rectangles / Shikaku on every level.
   Each number is a seed packet. Split the allotment into rectangular beds so every bed holds
   exactly one packet and has exactly that many squares. Drag corner to corner to mark a bed,
   tap a bed to clear it. Gentle 5×5 small beds, Medium 6×6, Tricky 7×7 with bigger beds.
   Every garden has exactly one answer (checked by bedsSolve). */
const BEDS_SIZE = [5, 6, 7];
const BEDS_AREA = [[2, 4], [2, 6], [2, 9]];
const BEDS_FLOWER = { 2: "🌷", 3: "🌼", 4: "🌻", 5: "🌸", 6: "🌹", 7: "🌺", 8: "💐", 9: "🌷", 10: "🌼", 11: "🌻", 12: "🌸" };
const bedsFlower = (k) => BEDS_FLOWER[k] || "🌸";
// A bed is [row, col, height, width].
const bedCells = (n, [y, x, h, w]) => { const out = []; for (let r = y; r < y + h; r++) for (let c = x; c < x + w; c++) out.push(r * n + c); return out; };
const bedHas = ([y, x, h, w], cell, n) => { const r = Math.floor(cell / n), c = cell % n; return r >= y && r < y + h && c >= x && c < x + w; };
const bedsOverlap = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
// Every rectangle of the right size that holds this packet and no other one.
function bedsOptions(m, ci) {
  const [cell, k] = m.clues[ci], n = m.n, cy = Math.floor(cell / n), cx = cell % n, out = [];
  for (let h = 1; h <= k; h++) {
    if (k % h) continue;
    const w = k / h;
    if (h > n || w > n) continue;
    for (let y = Math.max(0, cy - h + 1); y <= Math.min(cy, n - h); y++)
      for (let x = Math.max(0, cx - w + 1); x <= Math.min(cx, n - w); x++) {
        const bed = [y, x, h, w];
        if (m.clues.every(([c2], j) => j === ci || !bedHas(bed, c2, n))) out.push(bed);
      }
  }
  return out;
}
/* Counts solutions (up to `limit`) and search nodes. Always branches on the empty square with the
   fewest beds that could still cover it, so forced squares cost one node each. */
function bedsSolve(m, limit = 2) {
  const n = m.n, N = n * n, opts = m.clues.map((_, i) => bedsOptions(m, i).map((b) => ({ b, cells: bedCells(n, b) })));
  const owner = new Int16Array(N).fill(-1), used = new Uint8Array(m.clues.length), pick = new Array(m.clues.length);
  const byCell = Array.from({ length: N }, () => []);
  opts.forEach((list, i) => list.forEach((o) => o.cells.forEach((c) => byCell[c].push([i, o]))));
  let count = 0, nodes = 0, first = null;
  const fits = (o) => o.cells.every((c) => owner[c] < 0);
  function go() {
    nodes++;
    let best = null;
    for (let c = 0; c < N; c++) {
      if (owner[c] >= 0) continue;
      const cand = byCell[c].filter(([i, o]) => !used[i] && fits(o));
      if (!cand.length) return;
      if (!best || cand.length < best.length) best = cand;
      if (best.length === 1) break;
    }
    if (!best) { count++; if (!first) first = pick.slice(); return; }
    for (const [i, o] of best) {
      used[i] = 1; pick[i] = o.b; o.cells.forEach((c) => (owner[c] = i));
      go();
      used[i] = 0; o.cells.forEach((c) => (owner[c] = -1));
      if (count >= limit) return;
    }
  }
  go();
  return { count, nodes, first };
}
// What the board shows: each bed's verdict, planted squares and whether the garden is finished.
function bedsCheck(m, beds) {
  const n = m.n, verdict = beds.map((b) => {
    const inside = m.clues.filter(([c]) => bedHas(b, c, n));
    return inside.length === 1 && inside[0][1] === b[2] * b[3];
  });
  const covered = new Set(beds.flatMap((b) => bedCells(n, b)));
  return { verdict, planted: covered.size, solved: covered.size === n * n && verdict.every(Boolean) && beds.length === m.clues.length };
}
const bedsCache = new Map();
function bedsModel(d, lvl = difficulty) {
  const key = d + "|" + lvl;
  if (bedsCache.has(key)) return bedsCache.get(key);
  const n = BEDS_SIZE[lvl], [aMin, aMax] = BEDS_AREA[lvl], r = rng(puzzleSeed(d) + "beds");
  // Gentle keeps the gentlest of a few gardens; Medium and Tricky keep the one the solver works hardest on.
  // Ties go to the garden with more decoy beds (rectangles that fit a packet but aren't the answer).
  const wanted = [3, 10, 24][lvl], score = (m) => m.nodes + m.decoys / 100, better = (a, b) => (lvl === 0 ? score(a) < score(b) : score(a) > score(b));
  let best = null, found = 0;
  for (let attempt = 0; attempt < 2000 && found < wanted; attempt++) {
    // Fill the allotment from the top-left: the first empty square is always a new bed's corner.
    const owner = new Array(n * n).fill(-1), rects = [];
    let ok = true;
    for (let c = 0; c < n * n && ok; c++) {
      if (owner[c] >= 0) continue;
      const y = Math.floor(c / n), x = c % n, shapes = [];
      for (let h = 1; y + h <= n; h++)
        for (let w = 1; x + w <= n; w++) {
          const k = h * w;
          if (k > aMax) break;
          if (k < aMin) continue;
          if (bedCells(n, [y, x, h, w]).some((q) => owner[q] >= 0)) break;
          // Tricky leans towards bigger beds; thin 1 × k strips longer than 4 are kept rare.
          const weight = (lvl === 2 ? k : 1) * (Math.min(h, w) === 1 && k > 4 ? 0.3 : 1);
          shapes.push([[y, x, h, w], weight]);
        }
      if (!shapes.length) { ok = false; break; }
      let t = r() * shapes.reduce((s, [, wt]) => s + wt, 0), bed = shapes[0][0];
      for (const [b, wt] of shapes) { t -= wt; if (t <= 0) { bed = b; break; } }
      rects.push(bed);
      bedCells(n, bed).forEach((q) => (owner[q] = rects.length - 1));
    }
    if (!ok) continue;
    const clues = rects.map((b) => { const cs = bedCells(n, b); return [cs[Math.floor(r() * cs.length)], b[2] * b[3]]; });
    const model = { n, clues, rects };
    const res = bedsSolve(model, 2);
    if (res.count !== 1) continue;
    model.nodes = res.nodes;
    model.decoys = clues.reduce((t, _, j) => t + bedsOptions(model, j).length - 1, 0);
    found++;
    if (!best || better(model, best)) best = model;
  }
  if (!best) throw Error("Garden Beds generation failed for " + d);
  bedsCache.set(key, best);
  return best;
}

/* How to play: one sentence and a 3 × 3 example where the 6 packet fills a 2 × 3 bed. */
function bedsHowTo() {
  const mini = (cells, beds) => `<span class="bmini" aria-hidden="true">${cells.map((t, i) => `<span style="grid-area:${Math.floor(i / 3) + 1}/${(i % 3) + 1}">${t}</span>`).join("")}${beds.map(([y, x, h, w]) => `<i style="grid-area:${y + 1}/${x + 1}/span ${h}/span ${w}"></i>`).join("")}</span>`;
  return `<span class="bedrule">Each number is a seed packet: mark out a bed with exactly that many squares around it.</span>`
    + `<span class="bedpair">${mini(["", "6", "", "", "", "", "", "3", ""], [])}<span class="bedarrow">→</span>${mini(["🌹", "6", "🌹", "🌹", "🌹", "🌹", "🌼", "3", "🌼"], [[0, 0, 2, 3], [2, 0, 1, 3]])}</span>`
    + `<span class="bedrule">Drag from corner to corner to mark a bed. Tap a bed to clear it. Every square needs a bed, and each bed holds exactly one packet.</span>`;
}
function gardenBeds(i) {
  const m = bedsModel(day), s = state(i), n = m.n;
  s.beds ||= [];
  $("#rules").innerHTML = bedsHowTo();
  const at = (row, col) => `grid-row:${row + 1};grid-column:${col + 1}`;
  const clueAt = new Map(m.clues.map(([c, k]) => [c, k]));
  let anchor = null;
  function draw() {
    const v = bedsCheck(m, s.beds), owner = new Map();
    s.beds.forEach((b, j) => bedCells(n, b).forEach((c) => owner.set(c, j)));
    let html = `<div class="bedgrid ${s.done ? "solved" : ""}" style="grid-template-columns:repeat(${n},1fr);grid-template-rows:repeat(${n},1fr)">`;
    for (let c = 0; c < n * n; c++) {
      const row = Math.floor(c / n), col = c % n, k = clueAt.get(c), j = owner.get(c), good = j != null && v.verdict[j];
      const bloom = good ? bedsFlower(s.beds[j][2] * s.beds[j][3]) : "";
      html += `<button class="bcell ${k ? "packet" : ""} ${anchor === c ? "anchor" : ""}" style="${at(row, col)}" data-bc="${c}" aria-label="Row ${row + 1}, column ${col + 1}${k ? `, seed packet ${k}` : ""}${j != null ? (good ? ", in a finished bed" : ", in a bed that doesn't fit yet") : ""}">${k ? `<b>${k}</b>` : bloom}</button>`;
    }
    s.beds.forEach((b, j) => (html += `<i class="bed ${v.verdict[j] ? "ok" : "bad"}" style="grid-area:${b[0] + 1}/${b[1] + 1}/span ${b[2]}/span ${b[3]}"></i>`));
    html += `<i class="bed preview" hidden></i>`;
    $("#board").innerHTML = html + `</div><p class="small">Beds: ${s.beds.length} / ${m.clues.length} · Squares planted: ${v.planted} / ${n * n}</p>`;
    const grid = $("#board .bedgrid");
    grid.onpointerdown = down;
    // Keyboard: Enter on one corner, then on the opposite corner.
    grid.querySelectorAll("[data-bc]").forEach((b) => (b.onclick = (e) => {
      if (e.detail !== 0 || s.done) return;
      const c = +b.dataset.bc;
      if (anchor == null) { const j = s.beds.findIndex((bd) => bedHas(bd, c, n)); if (j >= 0) return clear(j); anchor = c; draw(); return document.querySelector(`#board [data-bc="${c}"]`)?.focus(); }
      const a = anchor; anchor = null; plant(rectOf(a, c));
    }));
  }
  const rectOf = (a, b) => { const y = Math.min(Math.floor(a / n), Math.floor(b / n)), x = Math.min(a % n, b % n); return [y, x, Math.abs(Math.floor(a / n) - Math.floor(b / n)) + 1, Math.abs((a % n) - (b % n)) + 1]; };
  function clear(j) { s.beds.splice(j, 1); after("Bed cleared."); }
  function plant(bed) {
    s.beds = s.beds.filter((b) => !bedsOverlap(b, bed));
    s.beds.push(bed);
    const inside = m.clues.filter(([c]) => bedHas(bed, c, n)), k = bed[2] * bed[3];
    after(inside.length === 0 ? "That bed has no seed packet." : inside.length > 1 ? "One packet per bed, please." : inside[0][1] !== k ? `That bed has ${k} square${k === 1 ? "" : "s"}; the packet asks for ${inside[0][1]}.` : "");
  }
  function after(text) {
    persist();
    draw();
    if (!s.done && bedsCheck(m, s.beds).solved) sparkSolved("The whole allotment is in bloom!");
    else if (!s.done) msg(text);
  }
  function down(e) {
    const first = e.target.closest?.("[data-bc]");
    if (!first || e.button > 0 || s.done) return;
    e.preventDefault();
    anchor = null;
    const start = +first.dataset.bc;
    let cur = start;
    const move = (ev) => {
      const el = document.elementFromPoint(ev.clientX, ev.clientY)?.closest?.("#board [data-bc]");
      if (!el || +el.dataset.bc === cur) return;
      cur = +el.dataset.bc;
      // Only the preview frame moves while dragging; the squares under the finger stay put.
      const p = document.querySelector("#board .bed.preview"), b = rectOf(start, cur);
      if (p) { p.hidden = false; p.style.gridArea = `${b[0] + 1}/${b[1] + 1}/span ${b[2]}/span ${b[3]}`; }
    };
    const end = (ev) => {
      removeEventListener("pointermove", move); removeEventListener("pointerup", end); removeEventListener("pointercancel", end);
      const kill = (k) => { k.stopPropagation(); k.preventDefault(); };
      addEventListener("click", kill, true);
      setTimeout(() => removeEventListener("click", kill, true), 60);
      if (ev.type === "pointercancel") return draw();
      if (cur === start) {
        const j = s.beds.findIndex((b) => bedHas(b, start, n));
        if (j >= 0) return clear(j);
        if (clueAt.get(start) === 1) return plant([Math.floor(start / n), start % n, 1, 1]);
        draw();
        return msg("Drag from one corner of a bed to the opposite corner.");
      }
      plant(rectOf(start, cur));
    };
    addEventListener("pointermove", move); addEventListener("pointerup", end); addEventListener("pointercancel", end);
  }
  draw();
  action("Clear garden", () => { if (s.done) return; s.beds = []; anchor = null; persist(); draw(); msg(""); }, true);
  action("A gentle hint", () => {
    if (s.done) return;
    const key = (b) => b.join(","), want = new Set(m.rects.map(key));
    const wrong = s.beds.find((b) => !want.has(key(b)));
    const where = (c) => `row ${Math.floor(c / n) + 1}, column ${(c % n) + 1}`;
    if (wrong) return msg(`The bed starting on ${where(wrong[0] * n + wrong[1])} isn't part of the answer.`);
    const j = m.rects.findIndex((b) => !s.beds.some((x) => key(x) === key(b)));
    if (j < 0) return msg("Your beds are perfect.");
    const [c, k] = m.clues[j], [, , h, w] = m.rects[j];
    msg(`The ${k} on ${where(c)} wants a bed ${h} tall and ${w} wide.`);
  }, true);
}
SPARKS[23] = { name: "Garden Beds", blurb: "Mark out a bed for every seed packet.", type: "Garden", art: "🌷 ▭ 🌻", render: gardenBeds };
