/* Little Sparks — nine newer games (state indexes 8–16; 7 was Starlines, now retired). Each model is a pure
   function of (date, difficulty); renderers draw into the live card's
   #rules/#board/#feedback/#actions like the original games. */
const SPARKS = {};
const SHUFFLE_CACHE = new Map();
function cycleIndex(len, key, d, offset = 0) {
  if (!SHUFFLE_CACHE.has(key)) SHUFFLE_CACHE.set(key, shuffle([...Array(len).keys()], rng(key)));
  return SHUFFLE_CACHE.get(key)[mod(calendarIndex(d) + offset, len)];
}
function sparkSolved(text) {
  if (!state(active).done) complete();
  if (text) msg(text);
}
function openSpark(i) {
  active = i;
  state(i).started = true;
  persist();
  const g = SPARKS[i];
  if ($("#gtype")) $("#gtype").textContent = g.type + " · " + levelName();
  if ($("#gtitle")) $("#gtitle").textContent = g.name;
  $("#board").innerHTML = "";
  $("#actions").innerHTML = "";
  msg("");
  window.sparkKeys = null;
  g.render(i);
  if (state(i).done && !$("#feedback").textContent) msg("✓ You completed this puzzle.");
}
document.addEventListener?.("keydown", (e) => {
  if (!window.sparkKeys || e.metaKey || e.ctrlKey || e.altKey) return;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "")) return;
  window.sparkKeys(e);
});

/* Swipe-to-draw for Bloom Trail grids: press a cell and slide across neighbours to extend
   the trail; slide back onto the previous cell to undo. Each step goes through the cell's
   normal tap handler, so all rules and messages stay the same. Plain taps still work. */
function swipeTrail(grid, attr, getPath) {
  if (!grid) return;
  grid.classList.add("swipe");
  grid.onpointerdown = (e) => {
    const first = e.target.closest?.(`[${attr}]`);
    if (!first || e.button > 0 || state(active).done) return;
    let cur = +first.getAttribute(attr), moved = false, lx = e.clientX, ly = e.clientY;
    const tap = (c) => document.querySelector(`#board [${attr}="${c}"]`)?.click();
    const visit = (x, y) => {
      const el = document.elementFromPoint(x, y)?.closest?.(`#board [${attr}]`);
      if (!el || +el.getAttribute(attr) === cur) return;
      const c = +el.getAttribute(attr);
      if (!moved) { moved = true; if (getPath().at(-1) !== cur) tap(cur); }
      const p = getPath();
      if (c === p.at(-2) && cur === p.at(-1)) tap(cur);
      else if (cur === p.at(-1)) tap(c);
      cur = c;
    };
    const move = (ev) => {
      if (state(active).done) return;
      const size = first.getBoundingClientRect().width || 40, n = Math.max(1, Math.ceil(Math.hypot(ev.clientX - lx, ev.clientY - ly) / (size / 4)));
      for (let k = 1; k <= n; k++) visit(lx + ((ev.clientX - lx) * k) / n, ly + ((ev.clientY - ly) * k) / n);
      lx = ev.clientX; ly = ev.clientY;
    };
    const end = () => {
      removeEventListener("pointermove", move); removeEventListener("pointerup", end); removeEventListener("pointercancel", end);
      if (!moved) return;
      const kill = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
      addEventListener("click", kill, true);
      setTimeout(() => removeEventListener("click", kill, true), 60);
    };
    addEventListener("pointermove", move); addEventListener("pointerup", end); addEventListener("pointercancel", end);
  };
}

/* ───────────── 8 · Story Shuffle ───────────── */
// No clue lines: the beats' own time and cause cues carry the order. A story is solved by
// any order in its `accepted` list. Tricky hides the card titles, leaving only the text.
function storyModel(d) {
  const lvl = difficulty,
    story = STORIES[cycleIndex(STORIES.length, "stories-v1-" + lvl, d, lvl * 7)],
    r = rng(puzzleSeed(d) + "story"),
    accepted = story.accepted.map((o) => o.join(""));
  let order;
  do order = shuffle([0, 1, 2, 3, 4, 5], r);
  while (accepted.includes(order.join("")) || order.filter((v, i) => v === i).length > 1);
  return { title: story.title, cards: story.beats.map(([tag, body]) => ({ tag, body })), accepted: story.accepted, start: order };
}
const storyAccepted = (m, order) => m.accepted.some((o) => o.every((v, k) => v === order[k]));
// The accepted order closest to the current one: [order, cards in place, length of the in-place opening run].
function storyBest(m, order) {
  return m.accepted.map((o) => {
    const placed = o.filter((v, k) => v === order[k]).length;
    let run = 0; while (run < 6 && o[run] === order[run]) run++;
    return [o, placed, run];
  }).sort((x, y) => y[1] - x[1] || y[2] - x[2])[0];
}
// Move the card at `from` to `to`; the cards in between shift by one (4→2: 1,4,2,3,5,6).
function storyMove(order, from, to) {
  const o = order.slice(), [k] = o.splice(from, 1);
  o.splice(to, 0, k);
  return o;
}
// One hint: follow the accepted order with the longest correct opening and slide its next
// card into place, so the opening grows by one each time. Null when already in order.
function storyHintStep(m, order) {
  const o = m.accepted.map((a) => { let r = 0; while (r < 6 && a[r] === order[r]) r++; return [a, r]; }).sort((x, y) => y[1] - x[1])[0][0];
  const pos = o.findIndex((v, p) => v !== order[p]);
  return pos < 0 ? null : { order: storyMove(order, order.indexOf(o[pos]), pos), card: o[pos], pos };
}
const calmMotion = () => !!globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
function storyShuffle(i) {
  const m = storyModel(day), s = state(i), titles = difficulty < 2;
  s.order ||= m.start.slice();
  let pick = null;
  $("#rules").textContent = "Put the six moments in order, top to bottom. Tap a card, then tap the spot it belongs in: it slides there and the others shift along. Or drag it by its ⠿ grip. Read for time and cause: what has to happen before what?" + (titles ? "" : " On Tricky the cards have no titles.");
  const label = (k) => titles ? `“${m.cards[k].tag}”` : `“${m.cards[k].body.split(" ").slice(0, 5).join(" ")}…”`;
  const commit = (order) => {
    s.order = order;
    pick = null;
    persist();
    if (storyAccepted(m, s.order)) sparkSolved("The story flows! Every moment in its place.");
    draw();
  };
  function draw() {
    const board = $("#board"), before = new Map([...board.querySelectorAll(".storycards li[data-k]")].map((li) => [li.dataset.k, li.getBoundingClientRect().top]));
    const placed = storyBest(m, s.order)[1];
    board.innerHTML = `<p class="storytitle">${m.title}</p><ol class="storycards">${s.order.map((k, p) => `<li data-k="${k}"><button class="storycard ${pick === p ? "picked" : ""} ${s.done ? "placed" : ""}" data-pos="${p}" aria-pressed="${pick === p}">${titles ? `<b>${m.cards[k].tag}</b>` : ""}<span>${m.cards[k].body}</span></button>${s.done ? "" : `<span class="storygrip" data-grip="${p}" aria-hidden="true">⠿</span>`}</li>`).join("")}</ol>` + (difficulty === 0 && !s.done ? `<p class="small">${placed} of 6 in a sensible place</p>` : "");
    // FLIP: cards that changed place glide from their old spot.
    if (before.size && !calmMotion()) board.querySelectorAll(".storycards li[data-k]").forEach((li) => {
      const dy = (before.get(li.dataset.k) ?? 0) - li.getBoundingClientRect().top;
      if (!dy) return;
      li.style.transition = "none"; li.style.transform = `translateY(${dy}px)`;
      li.getBoundingClientRect();
      li.style.transition = "transform .22s ease"; li.style.transform = "";
    });
    board.querySelectorAll("[data-pos]").forEach((b) => (b.onclick = () => {
      if (s.done) return;
      const p = +b.dataset.pos;
      if (pick === null || pick === p) { pick = pick === p ? null : p; return draw(); }
      commit(storyMove(s.order, pick, p));
    }));
    board.querySelectorAll("[data-grip]").forEach((g) => (g.onpointerdown = (e) => storyDrag(e, +g.dataset.grip)));
  }
  // Drag a card by its grip. The grip (and the list while dragging) has touch-action: none,
  // so the feed doesn't scroll; the rest of each card still scrolls the feed normally.
  function storyDrag(e, from) {
    if (s.done || e.button > 0) return;
    e.preventDefault();
    const list = $("#board .storycards"), items = [...list.children], li = items[from];
    const tops = items.map((x) => x.getBoundingClientRect().top), step = items.length > 1 ? tops[1] - tops[0] : li.offsetHeight;
    // Near the top or bottom edge, the card's own scroll area glides so off-screen spots are reachable.
    const box = li.closest(".sparkinner") || document.scrollingElement, s0 = box.scrollTop, calm = calmMotion();
    let to = from, moved = false, y = e.clientY, raf = 0;
    const y0 = e.clientY;
    list.classList.add("dragging"); li.classList.add("lifted");
    items.forEach((x) => (x.style.transition = calm ? "none" : "transform .18s ease"));
    li.style.transition = "none";
    const place = () => {
      const dy = y - y0 + box.scrollTop - s0;
      li.style.transform = `translateY(${dy}px)`;
      to = Math.max(0, Math.min(items.length - 1, Math.round((tops[from] + dy - tops[0]) / step)));
      items.forEach((x, k) => { if (x !== li) x.style.transform = from < to && k > from && k <= to ? `translateY(${-step}px)` : from > to && k >= to && k < from ? `translateY(${step}px)` : ""; });
    };
    const edge = () => {
      const r = box.getBoundingClientRect(), top = Math.max(r.top, 0), bottom = Math.min(r.bottom, innerHeight), zone = 56;
      const v = y > bottom - zone ? Math.min(1, (y - bottom + zone) / zone) : y < top + zone ? -Math.min(1, (top + zone - y) / zone) : 0;
      if (v) { const before = box.scrollTop; box.scrollTop += v * 9; if (box.scrollTop !== before) place(); }
      raf = requestAnimationFrame(edge);
    };
    const move = (ev) => {
      y = ev.clientY;
      if (!moved && Math.abs(y - y0) < 6) return;
      if (!moved) { moved = true; raf = requestAnimationFrame(edge); }
      place();
    };
    const end = () => {
      cancelAnimationFrame(raf);
      removeEventListener("pointermove", move); removeEventListener("pointerup", end); removeEventListener("pointercancel", end);
      list.classList.remove("dragging");
      items.forEach((x) => { x.style.transition = "none"; x.style.transform = ""; });
      li.classList.remove("lifted");
      if (!moved) { pick = pick === from ? null : from; return draw(); }
      if (to !== from) commit(storyMove(s.order, from, to)); else draw();
    };
    addEventListener("pointermove", move); addEventListener("pointerup", end); addEventListener("pointercancel", end);
  }
  draw();
  action("Check order", () => {
    if (s.done || storyAccepted(m, s.order)) return msg("The story flows!");
    const [, placed, run] = storyBest(m, s.order);
    msg(difficulty === 2 ? (run ? `The first ${run} ${run === 1 ? "card reads" : "cards read"} right. Something after that is out of place.` : "The story doesn't start there yet. What has to happen first?") : `${placed} of 6 cards are in a sensible place. Keep going!`);
  }, true);
  action("A gentle hint", () => {
    if (s.done) return msg("It's all in order!");
    const step = storyHintStep(m, s.order);
    if (!step) return msg("It's all in order!");
    commit(step.order);
    if (!s.done) msg(`Placed ${label(step.card)} as card ${step.pos + 1}.`);
  }, true);
}
SPARKS[8] = { name: "Story Shuffle", blurb: "Six little moments. One story.", type: "Stories", art: "❶ ❸ ❷", render: storyShuffle };

/* ───────────── 9 · Colour Alchemy ───────────── */
const PIGMENTS = { R: ["Red", [1, 0, 0]], Y: ["Yellow", [0, 1, 0]], B: ["Blue", [0, 0, 1]], W: ["White", null] };
const RYB_CORNERS = [[1, 1, 1], [1, 0, 0], [1, 1, 0], [1, 0.5, 0], [0.163, 0.373, 0.6], [0.5, 0, 0.5], [0, 0.66, 0.2], [0.2, 0.094, 0]];
function rybToRgb([r, y, b]) {
  const out = [0, 0, 0];
  RYB_CORNERS.forEach((c, k) => {
    const wgt = (k & 1 ? r : 1 - r) * (k & 2 ? y : 1 - y) * (k & 4 ? b : 1 - b);
    for (let n = 0; n < 3; n++) out[n] += wgt * c[n];
  });
  return out;
}
function mixRgb(bases, counts) {
  const total = counts.reduce((a, b) => a + b, 0);
  if (!total) return [0.97, 0.96, 0.93];
  const v = [0, 0, 0];
  let white = 0;
  bases.forEach((k, j) => { if (k === "W") white += counts[j]; else PIGMENTS[k][1].forEach((x, n) => (v[n] += x * counts[j])); });
  const max = Math.max(...v);
  if (!max) return [1, 1, 1];
  const lift = 1 - 0.75 * (white / total);
  return rybToRgb(v.map((x) => (x / max) * lift));
}
const rgbCss = (c) => `rgb(${c.map((x) => Math.round(x * 255)).join(",")})`;
const rgbGap = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
function alchemyCombos(n, max) {
  const out = [];
  const go = (a) => {
    if (a.length === n) { const t = a.reduce((x, y) => x + y, 0); if (t && t <= max && a.filter(Boolean).reduce(gcd) === 1) out.push(a); return; }
    for (let v = 0; v <= max; v++) go([...a, v]);
  };
  go([]);
  return out;
}
const ALCHEMY_POOLS = [];
// Every recipe that is distinguishable from all other mixes of the same pigments.
function alchemyPool(lvl) {
  if (ALCHEMY_POOLS[lvl]) return ALCHEMY_POOLS[lvl];
  const sets = lvl === 0 ? [["R", "Y"], ["Y", "B"], ["R", "B"]] : lvl === 1 ? [["R", "Y", "B"]] : [["R", "Y", "B", "W"]],
    [lo, hi] = [[2, 4], [3, 6], [4, 7]][lvl], minUsed = [2, 2, 3][lvl], pool = [];
  for (const bases of sets) {
    const combos = alchemyCombos(bases.length, hi), colours = combos.map((o) => mixRgb(bases, o));
    combos.forEach((t, j) => {
      const total = t.reduce((a, b) => a + b, 0);
      if (total < lo || t.filter(Boolean).length < minUsed) return;
      if (colours.some((c, k) => k !== j && rgbGap(c, colours[j]) < 0.05)) return;
      pool.push({ bases, target: t, par: total, rgb: colours[j] });
    });
  }
  return (ALCHEMY_POOLS[lvl] = pool);
}
function alchemyModel(d) {
  const pool = alchemyPool(difficulty);
  return pool[cycleIndex(pool.length, "alchemy-v1-" + difficulty, d, difficulty * 11)];
}
function alchemyMatch(m, pot) {
  const p = pot.reduce((a, b) => a + b, 0);
  return p > 0 && pot.every((v, j) => v * m.par === m.target[j] * p);
}
function colourAlchemy(i) {
  const m = alchemyModel(day), s = state(i);
  s.pot ||= m.bases.map(() => 0);
  s.drops ||= [];
  $("#rules").textContent = `Add drops of colour to your pot until it matches the target swatch exactly. Fewest drops earns three stars. ${difficulty === 0 ? `This recipe uses ${m.par} drops.` : difficulty === 1 ? "The match meter shows how close you are." : "The match meter shows how close you are. White softens any colour."}`;
  function draw() {
    const rgb = mixRgb(m.bases, s.pot), drops = s.pot.reduce((a, b) => a + b, 0), close = Math.max(0, Math.round(100 - rgbGap(rgb, m.rgb) * 120));
    $("#board").innerHTML = `<div class="swatches"><figure><div class="swatch" style="background:${rgbCss(m.rgb)}"></div><figcaption>Target</figcaption></figure><figure><div class="swatch pot ${s.done ? "matched" : ""}" style="background:${rgbCss(rgb)}"></div><figcaption>Your pot · ${drops} drop${drops === 1 ? "" : "s"}</figcaption></figure></div>` +
      (!s.done ? `<div class="meter" aria-label="Match ${close}%"><i style="width:${close}%"></i></div>` : "") +
      `<div class="pigments">${m.bases.map((k, j) => `<button class="pigment" data-pig="${j}" style="--pig:${rgbCss(k === "W" ? [1, 1, 1] : rybToRgb(PIGMENTS[k][1]))}" ${s.done ? "disabled" : ""}><span></span>${PIGMENTS[k][0]}<small>${s.pot[j]}</small></button>`).join("")}</div>` +
      (s.done ? `${s.revealed ? "" : `<p class="stars">${s.stars === 3 ? "★★★" : "★★☆"}</p>`}<p class="small">Recipe: ${m.bases.map((k, j) => m.target[j] ? m.target[j] + " " + PIGMENTS[k][0].toLowerCase() : "").filter(Boolean).join(" + ")}</p>` : "");
    $("#board").querySelectorAll("[data-pig]").forEach((b) => (b.onclick = () => {
      if (s.done) return;
      const j = +b.dataset.pig;
      s.pot[j]++;
      s.drops.push(j);
      persist();
      if (alchemyMatch(m, s.pot)) {
        s.stars = s.pot.reduce((a, b) => a + b, 0) === m.par ? 3 : 2;
        sparkSolved(s.stars === 3 ? "A perfect match in the fewest drops! ★★★" : "A perfect match! Try fewer drops next time. ★★");
      }
      draw();
    }));
  }
  draw();
  action("Undo drop", () => { if (s.done || !s.drops.length) return; s.pot[s.drops.pop()]--; persist(); draw(); msg(""); }, true);
  action("Empty pot", () => { if (s.done) return; s.pot = m.bases.map(() => 0); s.drops = []; persist(); draw(); msg("A clean pot."); }, true);
  action("A gentle hint", () => { const j = m.target.indexOf(Math.max(...m.target)); msg(`${PIGMENTS[m.bases[j]][0]} is the main ingredient.`); }, true);
}
SPARKS[9] = { name: "Colour Alchemy", blurb: "A drop of this, a dash of that.", type: "Colour", art: "● ● →", render: colourAlchemy };

/* ───────────── 10 · Mirror Garden ───────────── */
const BOUNCE = { "/": ([dx, dy]) => [-dy, -dx], "\\": ([dx, dy]) => [dy, dx] };
function mirrorTrace(m, mirrors) {
  const lit = [];
  let x = m.entry.x, y = m.entry.y, dir = m.entry.dir;
  for (let steps = 0; steps < m.n * m.n * 4; steps++) {
    if (x < 0 || y < 0 || x >= m.n || y >= m.n) break;
    const c = y * m.n + x;
    if (m.rocks.includes(c)) break;
    lit.push(c);
    if (mirrors[c]) dir = BOUNCE[mirrors[c]](dir);
    x += dir[0]; y += dir[1];
  }
  return lit;
}
function mirrorSolved(m, mirrors) {
  const lit = new Set(mirrorTrace(m, mirrors));
  return Object.keys(mirrors).length <= m.budget && m.flowers.every((f) => lit.has(f));
}
function mirrorModel(d) {
  const lvl = difficulty, n = [4, 5, 6][lvl], budget = [2, 3, 4][lvl], r = rng(puzzleSeed(d) + "mirrors");
  const DIRS4 = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  for (let attempt = 0; attempt < 2000; attempt++) {
    const side = Math.floor(r() * 4), k = Math.floor(r() * n), dir = DIRS4[side];
    const entry = { x: dir[0] === 1 ? 0 : dir[0] === -1 ? n - 1 : k, y: dir[1] === 1 ? 0 : dir[1] === -1 ? n - 1 : k, dir };
    let x = entry.x, y = entry.y, dx = dir, left = budget;
    const seen = new Set(), mirrors = {}, segs = [[]];
    let fail = false;
    while (x >= 0 && y >= 0 && x < n && y < n) {
      const c = y * n + x;
      if (seen.has(c)) { fail = true; break; }
      seen.add(c);
      if (left && segs.at(-1).length >= 1 && r() < 0.5) {
        const type = r() < 0.5 ? "/" : "\\", nd = BOUNCE[type](dx), nx = x + nd[0], ny = y + nd[1];
        if (nx >= 0 && ny >= 0 && nx < n && ny < n && !seen.has(ny * n + nx)) {
          mirrors[c] = type; dx = nd; left--; segs.push([]);
          x = nx; y = ny; continue;
        }
      }
      segs.at(-1).push(c);
      x += dx[0]; y += dx[1];
    }
    if (fail || left || segs.some((sg) => !sg.length)) continue;
    const flowers = segs.map((sg, j) => sg[j === 0 ? Math.floor(r() * sg.length) : sg.length - 1 - Math.floor(r() * Math.min(2, sg.length))]);
    const free = [...Array(n * n).keys()].filter((c) => !seen.has(c));
    const rocks = shuffle(free, r).slice(0, [0, 1, 3][lvl]);
    const m = { n, budget, entry, flowers, rocks, solution: mirrors };
    if (mirrorSolved(m, {})) continue;
    if (!mirrorSolved(m, mirrors)) continue;
    return m;
  }
  throw Error("Mirror Garden generation failed for " + d);
}
function mirrorGarden(i) {
  const m = mirrorModel(day), s = state(i);
  s.mirrors ||= {};
  $("#rules").textContent = `Light shines in from the lamp. Tap a square to place a mirror (tap again to turn it, a third time to remove it). Use up to ${m.budget} mirrors so the beam reaches every flower.${m.rocks.length ? " Stones block the light." : ""}`;
  function draw() {
    const lit = new Set(mirrorTrace(m, s.mirrors)), used = Object.keys(s.mirrors).length, N = m.n + 2;
    const lampX = m.entry.x - m.entry.dir[0] + 1, lampY = m.entry.y - m.entry.dir[1] + 1;
    let html = `<div class="mirrorgrid ${s.done ? "solved" : ""}" style="grid-template-columns:repeat(${N},1fr)">`;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const inside = x > 0 && y > 0 && x <= m.n && y <= m.n, c = (y - 1) * m.n + (x - 1);
      if (!inside) { html += x === lampX && y === lampY ? `<span class="lamp" aria-label="Lamp">☀</span>` : "<span></span>"; continue; }
      const flower = m.flowers.includes(c), rock = m.rocks.includes(c), mir = s.mirrors[c];
      html += `<button class="mcell ${lit.has(c) ? "lit" : ""} ${flower ? "mflower" : ""} ${rock ? "rock" : ""}" data-mc="${c}" aria-label="Row ${y}, column ${x}${flower ? ", flower" + (lit.has(c) ? " in light" : "") : ""}${rock ? ", stone" : ""}${mir ? ", mirror " + (mir === "/" ? "rising" : "falling") : ""}">${rock ? "◆" : flower ? (lit.has(c) ? "✿" : "❀") : mir ? (mir === "/" ? "╱" : "╲") : ""}</button>`;
    }
    $("#board").innerHTML = html + `</div><p class="small">Mirrors: ${used} / ${m.budget} · Flowers in light: ${m.flowers.filter((f) => lit.has(f)).length} / ${m.flowers.length}</p>`;
    $("#board").querySelectorAll("[data-mc]").forEach((b) => (b.onclick = () => {
      if (s.done) return;
      const c = +b.dataset.mc;
      if (m.rocks.includes(c)) return msg("Stones can't hold mirrors.");
      if (m.flowers.includes(c)) return msg("Flowers need the light, not a mirror.");
      const cur = s.mirrors[c];
      if (!cur && used >= m.budget) return msg(`You only have ${m.budget} mirrors. Tap one to turn or remove it.`);
      if (!cur) s.mirrors[c] = "/";
      else if (cur === "/") s.mirrors[c] = "\\";
      else delete s.mirrors[c];
      persist();
      if (mirrorSolved(m, s.mirrors)) sparkSolved("The whole garden is glowing!");
      else msg("");
      draw();
    }));
  }
  draw();
  action("Clear mirrors", () => { if (s.done) return; s.mirrors = {}; persist(); draw(); msg(""); }, true);
  action("A gentle hint", () => {
    const [c, t] = Object.entries(m.solution).find(([c, t]) => s.mirrors[c] !== t) || [];
    if (c === undefined) return msg("Your mirrors are perfect.");
    msg(`Try a ${t === "/" ? "╱" : "╲"} mirror on row ${Math.floor(c / m.n) + 1}, column ${(c % m.n) + 1}.`);
  }, true);
}
SPARKS[10] = { name: "Mirror Garden", blurb: "Bend the light. Wake the flowers.", type: "Light", art: "☀ ╲ ✿", render: mirrorGarden };

/* ───────────── 11 & 12 · Sudoku Six / Killer Six ───────────── */
const BOX6 = (i) => Math.floor(Math.floor(i / 6) / 2) * 2 + Math.floor((i % 6) / 3);
function sixSolution(r) {
  const digits = shuffle([1, 2, 3, 4, 5, 6], r),
    rows = shuffle([0, 1, 2], r).flatMap((b) => shuffle([0, 1], r).map((x) => b * 2 + x)),
    cols = shuffle([0, 1], r).flatMap((s) => shuffle([0, 1, 2], r).map((x) => s * 3 + x));
  return Array.from({ length: 36 }, (_, i) => {
    const R = rows[Math.floor(i / 6)], C = cols[i % 6];
    return digits[(3 * (R % 2) + Math.floor(R / 2) + C) % 6];
  });
}
// Counts solutions (stopping at `limit`). Optional cages add sum + distinct rules.
// SIX_SETS[n][sum] lists the digit masks (bit v = digit v) of n distinct digits 1–6 adding to sum.
const SIX_SETS = (() => {
  const t = [...Array(7)].map(() => ({}));
  for (let m = 0; m < 64; m++) {
    let n = 0, sum = 0;
    for (let v = 1; v <= 6; v++) if (m & (1 << (v - 1))) { n++; sum += v; }
    (t[n][sum] ||= []).push(m << 1);
  }
  return t;
})();
function sixCount(grid, cages = null, limit = 2, found = null) {
  const g = grid.slice(), rowM = Array(6).fill(0), colM = Array(6).fill(0), boxM = Array(6).fill(0);
  const cageOf = [], cageMask = [], cageSets = [];
  if (cages) cages.forEach((c, k) => { cageMask[k] = 0; cageSets[k] = SIX_SETS[c.cells.length]?.[c.sum] || []; c.cells.forEach((i) => (cageOf[i] = k)); });
  const place = (i, v) => {
    const b = 1 << v;
    rowM[Math.floor(i / 6)] ^= b; colM[i % 6] ^= b; boxM[BOX6(i)] ^= b;
    if (cages) cageMask[cageOf[i]] ^= b;
  };
  for (let i = 0; i < 36; i++) if (g[i]) place(i, g[i]);
  // Digits a cage can still take: those in some digit set that holds every digit already in it.
  const cageAllow = (k) => {
    const used = cageMask[k];
    let m = 0;
    for (const set of cageSets[k]) if (!(used & ~set)) m |= set;
    return m & ~used;
  };
  let count = 0;
  const go = () => {
    const allow = cages ? cages.map((_, k) => cageAllow(k)) : null;
    let best = -1, bestMask = 0, bestN = 7;
    for (let i = 0; i < 36; i++) if (!g[i]) {
      let m = 126 & ~(rowM[Math.floor(i / 6)] | colM[i % 6] | boxM[BOX6(i)]);
      if (allow) m &= allow[cageOf[i]];
      if (!m) return;
      let n = 0;
      for (let x = m; x; x &= x - 1) n++;
      if (n < bestN) { best = i; bestMask = m; bestN = n; if (n === 1) break; }
    }
    if (best < 0) { count++; found?.push(g.slice()); return; }
    for (let v = 1; v <= 6; v++) if (bestMask & (1 << v)) {
      g[best] = v; place(best, v);
      go();
      place(best, v); g[best] = 0;
      if (count >= limit) return;
    }
  };
  go();
  return count;
}
// Human-style solve: repeatedly fill singles. A candidate must avoid its row, column, box and
// cage digits, and leave a cage sum the remaining cells can still reach with distinct digits.
// Naked singles only, or with `hidden` also hidden singles. Returns how many cells stay empty.
function sixSingles(givens, cages = null, hidden = false) {
  const g = givens.slice(), cageOf = [];
  if (cages) cages.forEach((c, k) => c.cells.forEach((i) => (cageOf[i] = k)));
  const reach = (left, need, used) => {
    if (!left) return need === 0;
    for (let x = 1; x <= 6; x++) if (!(used & (1 << x)) && x <= need && reach(left - 1, need - x, used | (1 << x))) return true;
    return false;
  };
  const cands = (i) => {
    const out = [], r = Math.floor(i / 6), c = i % 6;
    for (let v = 1; v <= 6; v++) {
      let ok = true;
      for (let j = 0; j < 36 && ok; j++) if (g[j] === v && (Math.floor(j / 6) === r || j % 6 === c || BOX6(j) === BOX6(i))) ok = false;
      if (ok && cages) {
        const cage = cages[cageOf[i]];
        let used = 1 << v, sum = v, left = 0;
        for (const j of cage.cells) if (j !== i) { if (g[j]) { if (used & (1 << g[j])) ok = false; used |= 1 << g[j]; sum += g[j]; } else left++; }
        ok = ok && reach(left, cage.sum - sum, used);
      }
      if (ok) out.push(v);
    }
    return out;
  };
  const units = [];
  for (let k = 0; k < 6; k++) units.push([0, 1, 2, 3, 4, 5].map((c) => k * 6 + c), [0, 1, 2, 3, 4, 5].map((r) => r * 6 + k), [...Array(36).keys()].filter((i) => BOX6(i) === k));
  for (let progress = true; progress; ) {
    progress = false;
    const cs = g.map((v, i) => (v ? null : cands(i)));
    for (let i = 0; i < 36; i++) if (cs[i] && cs[i].length === 1) { g[i] = cs[i][0]; progress = true; }
    if (progress || !hidden) continue;
    for (const u of units) for (let v = 1; v <= 6 && !progress; v++) {
      if (u.some((i) => g[i] === v)) continue;
      const spots = u.filter((i) => cs[i] && cs[i].includes(v));
      if (spots.length === 1) { g[spots[0]] = v; progress = true; }
    }
  }
  return g.filter((v) => !v).length;
}
function sudokuSixModel(d) {
  const r = rng(puzzleSeed(d) + "sudoku-six"), sol = sixSolution(r), givens = sol.slice(), want = [20, 15, 11][difficulty];
  for (const i of shuffle([...Array(36).keys()], r)) {
    if (givens.filter(Boolean).length <= want) break;
    const keep = givens[i];
    givens[i] = 0;
    if (sixCount(givens) !== 1) givens[i] = keep;
  }
  return { sol, givens, cages: null };
}
function killerSixModel(d) {
  const lvl = difficulty;
  return lvl === 2 ? hardKillerModel(d) : legacyKillerModel(d, lvl);
}
// Gentle and Medium (and Tricky games started before the harder generator) use this one.
function legacyKillerModel(d, lvl = difficulty) {
  const r = rng(puzzleSeed(d) + "killer-six"), sol = sixSolution(r), sizes = [[2, 2, 3], [2, 3, 3], [2, 3, 4]][lvl];
  const cageId = Array(36).fill(-1), cages = [];
  for (const start of shuffle([...Array(36).keys()], r)) {
    if (cageId[start] >= 0) continue;
    const size = sizes[Math.floor(r() * sizes.length)], cells = [start], k = cages.length;
    cageId[start] = k;
    while (cells.length < size) {
      const opts = cells.flatMap((c) => adjacent(c, 6, 36)).filter((c) => cageId[c] < 0 && !cells.some((x) => sol[x] === sol[c]));
      if (!opts.length) break;
      const c = opts[Math.floor(r() * opts.length)];
      cageId[c] = k; cells.push(c);
    }
    cells.sort((a, b) => a - b);
    cages.push({ cells, sum: cells.reduce((t, c) => t + sol[c], 0) });
  }
  const givens = Array(36).fill(0), order = shuffle([...Array(36).keys()], r);
  let n = 0;
  for (; n < [6, 2, 0][lvl]; n++) givens[order[n]] = sol[order[n]];
  while (sixCount(givens, cages) !== 1) { givens[order[n]] = sol[order[n]]; n++; }
  return { sol, givens, cages, cageId };
}
// Tricky: big cages (3–4 cells, never a single), very few givens, unique, and naked
// singles alone must stall. Seeded attempts run in order, so the pick is deterministic:
// the first attempt with ≤2 givens wins, otherwise the one with the fewest givens.
const KILLER_HARD = { sizes: [3, 3, 3, 4], maxGivens: 2, cap: 6, attempts: 30 };
function hardKillerModel(d) {
  let best = null;
  for (let attempt = 0; attempt < KILLER_HARD.attempts; attempt++) {
    const r = rng(puzzleSeed(d) + "killer-hard-" + attempt), sol = sixSolution(r);
    const cageId = Array(36).fill(-1), cages = [];
    for (const start of shuffle([...Array(36).keys()], r)) {
      if (cageId[start] >= 0) continue;
      const size = KILLER_HARD.sizes[Math.floor(r() * KILLER_HARD.sizes.length)], cells = [start];
      cageId[start] = cages.length;
      while (cells.length < size) {
        const opts = cells.flatMap((c) => adjacent(c, 6, 36)).filter((c) => cageId[c] < 0 && !cells.some((x) => sol[x] === sol[c]));
        if (!opts.length) break;
        const c = opts[Math.floor(r() * opts.length)];
        cageId[c] = cages.length; cells.push(c);
      }
      cages.push({ cells });
    }
    // Fold any one- or two-cell leftovers into a neighbouring cage that can take them.
    let ok = true;
    for (let k = 0; k < cages.length && ok; k++) {
      if (cages[k].cells.length > 2 || !cages[k].cells.length) continue;
      const near = [...new Set(cages[k].cells.flatMap((c) => adjacent(c, 6, 36)).map((c) => cageId[c]))].filter((j) => j !== k && cages[j].cells.length && cages[j].cells.length + cages[k].cells.length <= 6 && !cages[j].cells.some((x) => cages[k].cells.some((y) => sol[x] === sol[y])));
      if (!near.length) { ok = false; break; }
      const j = near.sort((a, b) => cages[a].cells.length - cages[b].cells.length)[0];
      for (const c of cages[k].cells) { cageId[c] = j; cages[j].cells.push(c); }
      cages[k].cells = [];
    }
    if (!ok) continue;
    const live = cages.filter((c) => c.cells.length), id = Array(36);
    live.forEach((c, k) => { c.cells.sort((a, b) => a - b); c.sum = c.cells.reduce((t, x) => t + sol[x], 0); c.cells.forEach((x) => (id[x] = k)); });
    const givens = Array(36).fill(0);
    let n = 0, unique = false;
    for (; n <= KILLER_HARD.cap; n++) {
      const found = [];
      if (sixCount(givens, live, 2, found) === 1) { unique = true; break; }
      if (n === KILLER_HARD.cap) break;
      const diff = [...Array(36).keys()].filter((i) => found[0][i] !== found[1][i]);
      const i = diff[Math.floor(r() * diff.length)];
      givens[i] = sol[i];
    }
    if (!unique) continue;
    const m = { sol, givens, cages: live, cageId: id };
    const stall = sixSingles(givens, live) > 0, score = n + (stall ? 0 : 100);
    if (stall && n <= KILLER_HARD.maxGivens) return m;
    if (!best || score < best.score) best = { score, m };
  }
  return best ? best.m : legacyKillerModel(d, 2);
}
// A Killer Six game keeps the generator it was started with.
function savedKiller(d, s) {
  if (difficulty === 2 && s.values && !s.hard) return legacyKillerModel(d, 2);
  if (difficulty === 2) s.hard = 1;
  return killerSixModel(d);
}
function sixGame(i, m, intro) {
  const s = state(i);
  s.values ||= m.givens.slice();
  let sel = s.values.findIndex((v) => !v);
  $("#rules").textContent = intro;
  const set = (v) => {
    if (s.done || sel < 0 || m.givens[sel]) return;
    s.values[sel] = v;
    persist();
    if (s.values.every((x, k) => x === m.sol[k])) sparkSolved("Every row, column and box sings. Beautiful!");
    else if (s.values.every(Boolean)) msg("The grid is full, but something repeats. Look again!");
    draw();
  };
  function draw() {
    $("#board").innerHTML = `<div class="sixgrid ${m.cages ? "killer" : ""} ${s.done ? "solved" : ""}">${s.values.map((v, k) => {
      const r = Math.floor(k / 6), c = k % 6, cage = m.cages && m.cages[m.cageId[k]];
      const edges = m.cages ? ["t", "r", "b", "l"].filter((e, j) => { const nb = [k - 6, c < 5 ? k + 1 : -1, k + 6, c ? k - 1 : -1][j]; return nb < 0 || nb > 35 || m.cageId[nb] !== m.cageId[k]; }).map((e) => "c" + e).join(" ") : "";
      return `<button class="six ${m.givens[k] ? "fixed" : ""} ${sel === k ? "sel" : ""} ${c === 2 ? "br" : ""} ${r % 2 === 1 && r < 5 ? "bb" : ""}" data-six="${k}" aria-label="Row ${r + 1}, column ${c + 1}${v ? ", " + v : ", empty"}${cage && cage.cells[0] === k ? ", cage sum " + cage.sum : ""}">${m.cages ? `<i class="cage ${edges}"></i>` : ""}${cage && cage.cells[0] === k ? `<small>${cage.sum}</small>` : ""}<b>${v || ""}</b></button>`;
    }).join("")}</div><div class="numpad">${[1, 2, 3, 4, 5, 6].map((v) => `<button data-num="${v}" ${s.done ? "disabled" : ""}>${v}</button>`).join("")}<button data-num="0" aria-label="Erase" ${s.done ? "disabled" : ""}>⌫</button></div>`;
    $("#board").querySelectorAll("[data-six]").forEach((b) => (b.onclick = () => { sel = +b.dataset.six; draw(); }));
    $("#board").querySelectorAll("[data-num]").forEach((b) => (b.onclick = () => set(+b.dataset.num)));
  }
  window.sparkKeys = (e) => {
    if (/^[1-6]$/.test(e.key)) set(+e.key);
    else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") set(0);
    else {
      const mv = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -6, ArrowDown: 6 }[e.key];
      if (!mv) return;
      e.preventDefault();
      sel = Math.max(0, Math.min(35, (sel < 0 ? 0 : sel) + mv));
      draw();
    }
  };
  draw();
  action("Reveal one cell", () => {
    if (s.done) return;
    const k = s.values.findIndex((v, k) => v !== m.sol[k]);
    sel = k;
    set(m.sol[k]);
    if (!s.done) msg("One little nudge. You can take it from here.");
  }, true);
  action("Clear my numbers", () => { if (s.done) return; s.values = m.givens.slice(); persist(); draw(); msg(""); }, true);
}
SPARKS[11] = {
  name: "Sudoku Six", blurb: "A roomier grid for a calm mind.", type: "Numbers", art: "1 6 ┃ 4",
  render: (i) => sixGame(i, sudokuSixModel(day), "Fill the 6 × 6 grid with 1–6. Each row, column and 2 × 3 box holds every number once. Tap a square, then a number."),
};
SPARKS[12] = {
  name: "Killer Six", blurb: "Sums in dotted cages.", type: "Numbers", art: "⁽¹¹⁾ ┆ ⁽⁷⁾",
  render: (i) => sixGame(i, savedKiller(day, state(i)), "Fill the 6 × 6 grid with 1–6 so each row, column and 2 × 3 box holds every number once. The digits in each dotted cage add up to its small number, with no repeats inside a cage."),
};

/* ───────────── 13 · Letterlight Ladder ───────────── */
function ladderModel(d) {
  const list = LADDERS[difficulty], route = list[cycleIndex(list.length, "ladder-v1-" + difficulty, d, difficulty * 3)].split(" ");
  return { start: route[0], end: route.at(-1), par: route.length - 1, route };
}
const oneApart = (a, b) => a.length === b.length && [...a].filter((ch, k) => ch !== b[k]).length === 1;
function ladderStepError(prev, word, used) {
  if (word.length !== 5) return "Words need five letters.";
  if (!VALID_GUESSES.has(word)) return `${word} isn't in our word list.`;
  if (!oneApart(prev, word)) return "Change exactly one letter at a time.";
  if (used.includes(word)) return "You've already used that word.";
  return "";
}
function ladderNext(from, to) {
  for (const dict of [LADDER_COMMON, VALID_GUESSES]) {
    const prev = new Map([[from, null]]), queue = [from];
    while (queue.length) {
      const w = queue.shift();
      if (w === to) { let x = w; while (prev.get(x) !== from) x = prev.get(x); return x; }
      for (let k = 0; k < 5; k++) for (let c = 65; c < 91; c++) {
        const n = w.slice(0, k) + String.fromCharCode(c) + w.slice(k + 1);
        if (!prev.has(n) && (dict.has(n) || n === to)) { prev.set(n, w); queue.push(n); }
      }
    }
  }
  return null;
}
function letterLadder(i) {
  const m = ladderModel(day), s = state(i);
  s.steps ||= [m.start];
  let buf = "";
  $("#rules").textContent = `Climb from ${m.start} to ${m.end}. Change one letter per step, and every step must be a real word. Reach it in ${m.par} steps for three stars.`;
  const submit = () => {
    if (s.done) return;
    const word = buf.toUpperCase(), err = ladderStepError(s.steps.at(-1), word, s.steps);
    if (err) return msg(err);
    s.steps.push(word);
    buf = "";
    persist();
    if (word === m.end) {
      const n = s.steps.length - 1;
      s.stars = n <= m.par ? 3 : n <= m.par + 2 ? 2 : 1;
      sparkSolved(`${m.end} in ${n} step${n === 1 ? "" : "s"}! ${"★".repeat(s.stars)}${"☆".repeat(3 - s.stars)}`);
    } else msg("");
    draw();
  };
  const type = (k) => {
    if (s.done) return;
    if (k === "ENTER") return submit();
    if (k === "⌫") buf = buf.slice(0, -1);
    else if (buf.length < 5) buf += k;
    draw();
  };
  function draw() {
    const last = s.steps.at(-1);
    $("#board").innerHTML = `<div class="ladder">${s.steps.map((w, k) => `<div class="rung ${k ? "" : "first"} ${w === m.end ? "goal" : ""}">${[...w].map((ch, j) => `<span class="${k && ch !== s.steps[k - 1][j] ? "changed" : ""}">${ch}</span>`).join("")}</div>`).join("")}` +
      (s.done ? "" : `<div class="rung typing">${[0, 1, 2, 3, 4].map((j) => `<span class="${buf[j] && buf[j] !== last[j] ? "changed" : ""}">${buf[j] || ""}</span>`).join("")}</div><div class="rung target">${[...m.end].map((ch) => `<span>${ch}</span>`).join("")}</div>`) +
      `</div><p class="small">${s.steps.length - 1} step${s.steps.length === 2 ? "" : "s"} · par ${m.par}</p>` +
      (s.done ? "" : `<div class="keys">${["QWERTYUIOP", "ASDFGHJKL", "⏎ZXCVBNM⌫"].map((row) => `<div>${[...row].map((k) => `<button data-key="${k === "⏎" ? "ENTER" : k}" class="${k === "⏎" || k === "⌫" ? "wide" : ""}" aria-label="${k === "⏎" ? "Enter" : k === "⌫" ? "Delete" : k}">${k}</button>`).join("")}</div>`).join("")}</div>`);
    $("#board").querySelectorAll("[data-key]").forEach((b) => (b.onclick = () => type(b.dataset.key)));
  }
  window.sparkKeys = (e) => {
    if (e.key === "Enter") type("ENTER");
    else if (e.key === "Backspace") type("⌫");
    else if (/^[a-z]$/i.test(e.key)) type(e.key.toUpperCase());
  };
  draw();
  action("Undo step", () => { if (s.done || s.steps.length < 2) return; s.steps.pop(); persist(); draw(); msg(""); }, true);
  action("A gentle hint", () => {
    if (s.done) return;
    const next = ladderNext(s.steps.at(-1), m.end);
    if (!next) return msg("This path is stuck — try undoing a step.");
    const k = [...next].findIndex((ch, j) => ch !== s.steps.at(-1)[j]);
    msg(difficulty === 0 ? `Try ${next}.` : `Change letter ${k + 1}${difficulty === 1 ? ` to ${next[k]}` : ""}.`);
  }, true);
}
SPARKS[13] = { name: "Letterlight Ladder", blurb: "One letter at a time, from here to there.", type: "Words", art: "W A R M ↓", render: letterLadder };

/* ───────────── 14 · Bloom Trail 5×5 ───────────── */
const stepDir = (a, b) => (b - a === 1 ? "R" : b - a === -1 ? "L" : b - a === 5 ? "D" : "U");
function bloomFiveValid(m, path) {
  if (path.length !== 25 || new Set(path).size !== 25) return false;
  for (let k = 1; k < 25; k++) if (!adjacent(path[k - 1], 5, 25).includes(path[k])) return false;
  for (let k = 3; k < 25; k++) { const d = stepDir(path[k - 1], path[k]); if (d === stepDir(path[k - 2], path[k - 1]) && d === stepDir(path[k - 3], path[k - 2])) return false; }
  for (const t of m.turns) { const k = path.indexOf(t); if (k <= 0 || k >= 24 || stepDir(path[k - 1], t) === stepDir(t, path[k + 1])) return false; }
  const at = m.anchors.map((a) => path.indexOf(a));
  return at[0] === 0 && at.at(-1) === 24 && at.every((v, k) => !k || v > at[k - 1]);
}
function bloomFiveModel(d) {
  const lvl = difficulty, r = rng(puzzleSeed(d) + "bloom-five");
  const connected = (seen, from) => {
    const free = [...Array(25).keys()].filter((c) => !seen.has(c));
    if (!free.length) return true;
    const reach = new Set([free[0]]), q = [free[0]];
    while (q.length) for (const n of adjacent(q.pop(), 5, 25)) if (!seen.has(n) && !reach.has(n)) { reach.add(n); q.push(n); }
    return reach.size === free.length && adjacent(from, 5, 25).some((n) => !seen.has(n));
  };
  for (let attempt = 0; attempt < 200; attempt++) {
    const start = Math.floor(r() * 25), path = [start], seen = new Set(path);
    let budget = 4000;
    const dfs = () => {
      if (path.length === 25) return true;
      if (--budget < 0) return false;
      const cur = path.at(-1);
      for (const n of shuffle(adjacent(cur, 5, 25).filter((n) => !seen.has(n)), r)) {
        if (path.length >= 3) { const d = stepDir(cur, n); if (d === stepDir(path.at(-2), cur) && d === stepDir(path.at(-3), path.at(-2))) continue; }
        path.push(n); seen.add(n);
        if ((path.length === 25 || connected(seen, n)) && dfs()) return true;
        path.pop(); seen.delete(n);
      }
      return false;
    };
    if (!dfs()) continue;
    const anchors = [[0, 6, 12, 18, 24], [0, 8, 16, 24], [0, 12, 24]][lvl].map((k) => path[k]);
    const turnIdx = [...Array(23).keys()].map((k) => k + 1).filter((k) => !anchors.includes(path[k]) && stepDir(path[k - 1], path[k]) !== stepDir(path[k], path[k + 1]));
    const turns = shuffle(turnIdx, r).slice(0, [4, 3, 2][lvl]).map((k) => path[k]);
    return { path, anchors, turns };
  }
  throw Error("Bloom Trail 5×5 generation failed for " + d);
}
function bloomFive(i) {
  const m = bloomFiveModel(day), s = state(i);
  s.path ||= [];
  $("#rules").textContent = `Start at bloom 1 and visit every square once, moving up, down, left or right. Collect the ${m.anchors.length} blooms in order and finish on the last. On a ↻ square the trail must turn, and it can never run straight through more than 3 squares. Drag across the squares or tap them one by one; slide back or tap your last square to undo.`;
  function tryStep(c) {
    const p = s.path, last = p.at(-1);
    if (!p.length) return c === m.anchors[0] ? "" : "Begin at bloom 1.";
    if (p.includes(c)) return "That square is already in your trail.";
    if (!adjacent(last, 5, 25).includes(c)) return "Move to a square next to your last one.";
    const d = stepDir(last, c);
    if (p.length >= 3 && d === stepDir(p.at(-2), last) && d === stepDir(p.at(-3), p.at(-2))) return "No straight run longer than 3 squares — turn somewhere!";
    if (p.length >= 2 && m.turns.includes(last) && d === stepDir(p.at(-2), last)) return "The ↻ square asks you to turn.";
    const a = m.anchors.indexOf(c);
    if (a >= 0 && m.anchors[a - 1] !== undefined && !p.includes(m.anchors[a - 1])) return "Collect the numbered blooms in order.";
    if (a === m.anchors.length - 1 && p.length !== 24) return "Save the final bloom until every square has been visited.";
    return "";
  }
  function draw() {
    $("#board").innerHTML = `<div class="grid bloomfive ${s.done ? "solved" : ""}" style="grid-template-columns:repeat(5,1fr)">${Array.from({ length: 25 }, (_, c) => {
      const a = m.anchors.indexOf(c), at = s.path.indexOf(c), t = m.turns.includes(c);
      return `<button class="cell ${at >= 0 ? "chosen" : ""} ${t ? "turn" : ""}" data-bloom="${c}" aria-label="Row ${1 + Math.floor(c / 5)} column ${1 + (c % 5)}${a >= 0 ? ", bloom " + (a + 1) : ""}${t ? ", must turn" : ""}${at >= 0 ? ", step " + (at + 1) : ""}">${a >= 0 ? "✿" + (a + 1) : at >= 0 ? at + 1 : t ? "↻" : "·"}</button>`;
    }).join("")}</div><p class="small">${s.path.length} / 25 squares visited</p>`;
    $("#board").querySelectorAll("[data-bloom]").forEach((b) => (b.onclick = () => {
      if (s.done) return;
      const c = +b.dataset.bloom;
      if (c === s.path.at(-1)) { s.path.pop(); persist(); draw(); return msg(""); }
      const err = tryStep(c);
      if (err) return msg(err);
      s.path.push(c);
      persist();
      if (bloomFiveValid(m, s.path)) sparkSolved("The whole garden is in bloom!");
      else msg("");
      draw();
    }));
    swipeTrail($("#board .grid"), "data-bloom", () => s.path);
  }
  draw();
  action("Start over", () => { if (s.done) return; s.path = []; persist(); draw(); msg("A fresh trail."); }, true);
  action("A gentle hint", () => {
    if (s.done) return;
    const k = s.path.findIndex((c, k) => c !== m.path[k]);
    if (k >= 0) return msg(`Your trail wanders off at step ${k + 1}. Try undoing back to there.`);
    const next = m.path[s.path.length];
    msg(`Next, try row ${1 + Math.floor(next / 5)}, column ${1 + (next % 5)}.`);
  }, true);
}
SPARKS[14] = { name: "Bloom Trail 5×5", blurb: "A bigger garden, with a few twists.", type: "Paths", art: "✿ ↻ ✿", render: bloomFive };

/* ───────────── 15 · Time Lens Duel ───────────── */
const hideYears = (t) => t.replace(/\b(?:18|19|20)\d{2}s?\b/g, "[year hidden]");
function duelPick(d, pool, needIconic) {
  const lvl = difficulty, r = rng(puzzleSeed(d) + "duel"), [lo, hi] = [[25, 999], [12, 40], [5, 20]][lvl];
  for (let attempt = 0; attempt < 5000; attempt++) {
    const pick = shuffle(pool.slice(), r).slice(0, 3), sorted = pick.slice().sort((a, b) => a.year - b.year);
    const g1 = sorted[1].year - sorted[0].year, g2 = sorted[2].year - sorted[1].year;
    if (g1 < lo || g2 < lo || g1 > hi || g2 > hi || (needIconic && !pick.some((p) => p.iconic))) continue;
    const decade = Math.floor(sorted[1].year / 10) * 10, n = [3, 4, 6][lvl], first = decade - 10 * Math.floor(r() * n);
    return duelFrom(pick, decade, Array.from({ length: n }, (_, k) => first + 10 * k));
  }
  throw Error("Time Lens Duel generation failed for " + d);
}
function duelFrom(pick, decade, options) {
  const sorted = pick.slice().sort((a, b) => a.year - b.year);
  return { photos: pick, order: sorted.map((p) => pick.indexOf(p)), middle: pick.indexOf(sorted[1]), decade, options };
}
// At least one history-shaping photo, never one of today's Time Lens photos, never a retired entry.
function duelModel(d) {
  const skip = new Set(photoSet(d).map((p) => p.image));
  return duelPick(d, ACTIVE_PHOTOS.filter((p) => !skip.has(p.image)), true);
}
// Duels saved before photo IDs were pinned keep the original 183-photo model.
function legacyDuelModel(d) {
  const skip = new Set(legacyPhotoSet(d).map((p) => p.image));
  return duelPick(d, LEGACY_PHOTO_BANK.filter((p) => !skip.has(p.image)), false);
}
function savedDuel(d, s) {
  if (s.duelIds) return duelFrom(s.duelIds.map((id) => PHOTO_BANK.find((p) => p.image === id)), s.duelDecade, s.duelOptions);
  const m = s.picks?.length || s.misses || s.ordered || s.done ? legacyDuelModel(d) : duelModel(d);
  Object.assign(s, { duelIds: m.photos.map((p) => p.image), duelDecade: m.decade, duelOptions: m.options });
  return m;
}
function timeDuel(i) {
  const s = state(i), m = savedDuel(day, s);
  s.picks ||= [];
  s.misses ??= 0;
  $("#rules").textContent = "Three real archive photographs. Tap them from oldest to newest. Then guess the decade of the middle one — you get one try.";
  function draw() {
    const ordered = s.ordered || s.done, mid = m.photos[m.middle];
    $("#board").innerHTML = `<div class="duel">${m.photos.map((p, k) => {
      const at = s.picks.indexOf(k), rank = m.order.indexOf(k);
      return `<button class="duelphoto ${at >= 0 ? "picked" : ""} ${ordered && k === m.middle ? "middle" : ""}" data-duel="${k}" ${ordered ? "disabled" : ""}><img src="${p.image}" alt="${hideYears(p.alt)}" loading="lazy"><span class="duelbadge">${ordered ? rank + 1 : at >= 0 ? at + 1 : ""}</span>${s.done ? `<span class="duelyear">${p.year}</span>` : ""}</button>`;
    }).join("")}</div>` +
      (ordered && !s.done ? `<p class="instruction">Now: which decade is the middle photo (<b>2</b>) from?</p><div class="decades">${m.options.map((y) => `<button class="btn secondary" data-decade="${y}">${y}s</button>`).join("")}</div>` : "") +
      (s.done ? `<div class="reveal"><p>${s.revealed ? `The middle photo is from the ${m.decade}s.` : s.guess === m.decade ? "Right decade! ★★★" : `It was the ${m.decade}s.${s.misses ? "" : " Your order was perfect though!"}`}</p>${m.order.map((k) => `<p class="small"><b>${m.photos[k].year} · ${m.photos[k].title}</b> — ${m.photos[k].story}${m.photos[k].why ? ` <i>Why it mattered: ${m.photos[k].why}</i>` : ""}<br><a href="${m.photos[k].source}" target="_blank" rel="noopener">${m.photos[k].credit}</a></p>`).join("")}</div>` : "") +
      (!ordered ? `<p class="small">${s.picks.length ? `${s.picks.length} of 3 chosen` : "Tap the oldest first"}${s.misses ? ` · ${s.misses} reshuffle${s.misses === 1 ? "" : "s"}` : ""}</p>` : "");
    $("#board").querySelectorAll("[data-duel]").forEach((b) => (b.onclick = () => {
      if (ordered) return;
      const k = +b.dataset.duel;
      s.picks = s.picks.includes(k) ? s.picks.filter((x) => x !== k) : [...s.picks, k];
      if (s.picks.length === 3) {
        const right = s.picks.filter((v, j) => v === m.order[j]).length;
        if (right === 3) { s.ordered = true; msg("Perfect order! Now for the decade…"); }
        else { s.misses++; s.picks = []; msg(`${right} of 3 were in the right place. Try again!`); }
      }
      persist();
      draw();
    }));
    $("#board").querySelectorAll("[data-decade]").forEach((b) => (b.onclick = () => {
      s.guess = +b.dataset.decade;
      persist();
      sparkSolved(s.guess === m.decade ? `Yes — the ${m.decade}s! A sharp eye.` : `So close — it was the ${m.decade}s.`);
      draw();
    }));
  }
  draw();
}
SPARKS[15] = { name: "Time Lens Duel", blurb: "Three photographs. Which came first?", type: "Observation", art: "◉ ◉ ◉", render: timeDuel };

/* ───────────── 16 · Neighbours Goal ───────────── */
const happyPct = (board, threshold) => { const st = neighbourStats(board, 5, threshold, false); return Math.round((st.happy / st.total) * 100); };
function moveShape(board, from, to) { const b = board.slice(); b[to] = b[from]; b[from] = 0; return b; }
function goalModel(d) {
  const lvl = difficulty, r = rng(puzzleSeed(d) + "neighbour-goal"), [a, b, e] = [[9, 9, 7], [10, 10, 5], [11, 11, 3]][lvl], threshold = [34, 50, 67][lvl], K = [3, 4, 5][lvl];
  const randMove = (board) => { const shapes = board.flatMap((v, i) => (v ? [i] : [])), empty = board.flatMap((v, i) => (v ? [] : [i])); return [shapes[Math.floor(r() * shapes.length)], empty[Math.floor(r() * empty.length)]]; };
  for (let attempt = 0; attempt < 200; attempt++) {
    let good = shuffle([...Array(a).fill(1), ...Array(b).fill(2), ...Array(e).fill(0)], r);
    for (let k = 0; k < 600; k++) { const [f, t] = randMove(good), next = moveShape(good, f, t); if (happyPct(next, threshold) >= happyPct(good, threshold)) good = next; }
    const target = Math.floor(happyPct(good, threshold) / 5) * 5;
    if (target < 60) continue;
    for (let tries = 0; tries < 60; tries++) {
      let board = good;
      for (let k = 0; k < K; k++) { const [f, t] = randMove(board); board = moveShape(board, f, t); }
      if (happyPct(board, threshold) <= target - 15) return { board, target, threshold, moves: K + [2, 1, 0][lvl], good };
    }
  }
  throw Error("Neighbours Goal generation failed for " + d);
}
function neighbourGoal(i) {
  const m = goalModel(day), s = state(i);
  s.board ||= m.board.slice();
  s.history ||= [];
  let sel = null;
  $("#rules").textContent = `A shape is content when at least ${m.threshold}% of its neighbours (up, down, left, right) share its shape. Move shapes into empty squares to make ${m.target}% of everyone content within ${m.moves} moves.`;
  function draw() {
    const st = neighbourStats(s.board, 5, m.threshold, false), pct = Math.round((st.happy / st.total) * 100), left = m.moves - s.history.length;
    $("#board").innerHTML = `<div class="neighbourmetrics"><span><strong>${pct}%</strong> content · goal ${m.target}%</span><span><strong>${left}</strong> move${left === 1 ? "" : "s"} left</span></div><div class="meter goal"><i style="width:${Math.min(100, pct)}%"></i><b style="left:${m.target}%"></b></div><div class="neighbourgrid ${s.done ? "solved" : ""}" style="grid-template-columns:repeat(5,1fr)">${s.board.map((v, k) => `<button class="neighbour ${v ? "shape" + v : "empty"} ${st.statuses[k]?.happy ? "content" : ""} ${sel === k ? "selected" : ""}" data-goal="${k}" aria-label="Row ${Math.floor(k / 5) + 1}, column ${(k % 5) + 1}: ${v ? (v === 1 ? "triangle" : "square") + ", " + (st.statuses[k].happy ? "content" : "unhappy") : "empty space"}">${v ? neighbourFace(v, st.statuses[k].happy) : '<span aria-hidden="true">+</span>'}</button>`).join("")}</div>`;
    $("#board").querySelectorAll("[data-goal]").forEach((b) => (b.onclick = () => {
      if (s.done) return;
      const k = +b.dataset.goal;
      if (s.board[k]) { sel = sel === k ? null : k; return draw(); }
      if (sel === null) return msg("Tap a shape first, then an empty square.");
      if (s.history.length >= m.moves) return msg("Out of moves — undo one or start over.");
      s.history.push([sel, k]);
      s.board = moveShape(s.board, sel, k);
      sel = null;
      persist();
      const now = happyPct(s.board, m.threshold);
      if (now >= m.target) sparkSolved(`${now}% content — goal reached!`);
      else msg(s.history.length >= m.moves ? "Out of moves — undo one or start over." : "");
      draw();
    }));
  }
  draw();
  action("Undo move", () => { if (s.done || !s.history.length) return; const [f, t] = s.history.pop(); s.board = moveShape(s.board, t, f); persist(); draw(); msg(""); }, true);
  action("Start over", () => { if (s.done) return; s.board = m.board.slice(); s.history = []; persist(); draw(); msg("Back to the beginning."); }, true);
}
SPARKS[16] = { name: "Neighbours Goal", blurb: "Reach the goal in just a few moves.", type: "Experiment", art: "▲ ■ ▲", render: neighbourGoal };
