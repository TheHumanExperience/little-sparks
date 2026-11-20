/* Code Garden (state index 26): deduction from feedback, like Mastermind with flowers.
   A hidden row of flowers and a few earlier guesses, each scored with ● (right flower, right spot) and
   ○ (right flower, wrong spot). The marks are shown together, never lined up under flowers. A wrong
   check becomes a new clue row; checks are unlimited and never penalised.
   Gentle 3 spots from 4 flowers, Medium 4 from 5 (no repeats), Tricky 4 from 6 with repeats.
   Every garden has exactly one code that fits all the clues (checked by codeCount). */
const CODE_LEVELS = [
  { slots: 3, kinds: 4, repeats: false, rows: [3, 4] },
  { slots: 4, kinds: 5, repeats: false, rows: [3, 4] },
  { slots: 4, kinds: 6, repeats: true, rows: [4, 5] },
];
// Each flower differs by shape as well as colour, so the game never relies on colour alone.
const CODE_FLOWERS = [
  { name: "Tulip", svg: '<path d="M5 8l3.5-4 3.5 4 3.5-4 3.5 4v4.5a7 7 0 0 1-14 0z" fill="#d9658a"/>' },
  { name: "Daisy", svg: [0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<ellipse cx="12" cy="5.2" rx="2.4" ry="4.2" transform="rotate(${a} 12 12)" fill="#fffdf8"/>`).join("") + '<circle cx="12" cy="12" r="3.4" fill="#c99a3a"/>' },
  { name: "Rose", svg: '<circle cx="12" cy="12" r="8.6" fill="#b23a48"/><path d="M12 12.4c-1.4 0-1.6-2.2 0-2.6 2.6-.6 3.6 2.4 2.2 4.2-2 2.4-6.2 1.2-6.4-2.2-.2-3.6 4-6 7.2-4.2" fill="none" stroke="#fffdf8" stroke-width="1.3" stroke-linecap="round"/>' },
  { name: "Bluebell", svg: '<path d="M6 18.5c.2-7 2-12.5 6-12.5s5.8 5.5 6 12.5l-2-1.6-2 2-2-2-2 2-2-2z" fill="#4f6fb8"/><path d="M12 6V2.5" stroke="#385f48" stroke-width="1.6" stroke-linecap="round"/>' },
  { name: "Starflower", svg: '<path d="M12 2.5l2.6 6.3 6.8.5-5.2 4.4 1.7 6.6L12 16.6l-5.9 3.7 1.7-6.6-5.2-4.4 6.8-.5z" fill="#8657b8"/>' },
  { name: "Poppy", svg: '<circle cx="12" cy="6.6" r="4.6" fill="#e07a3a"/><circle cx="17.4" cy="12" r="4.6" fill="#e07a3a"/><circle cx="12" cy="17.4" r="4.6" fill="#e07a3a"/><circle cx="6.6" cy="12" r="4.6" fill="#e07a3a"/><circle cx="12" cy="12" r="2.6" fill="#243f32"/>' },
];
const codeFlowerSvg = (k) => `<svg class="cgflower" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g stroke="#24403299" stroke-width=".8">${CODE_FLOWERS[k].svg}</g></svg>`;
const codeNames = (row, mid = false) => row.map((k, j) => (j || mid ? CODE_FLOWERS[k].name.toLowerCase() : CODE_FLOWERS[k].name)).join(", ");
// [right spot, wrong spot] for a guess against the code.
function codeScore(guess, code) {
  let right = 0;
  const g = {}, c = {};
  guess.forEach((k, j) => { if (k === code[j]) right++; else { g[k] = (g[k] || 0) + 1; c[code[j]] = (c[code[j]] || 0) + 1; } });
  let wrong = 0;
  for (const k in g) wrong += Math.min(g[k], c[k] || 0);
  return [right, wrong];
}
const codeMarks = ([r, w]) => "●".repeat(r) + "○".repeat(w);
const codeMarksText = ([r, w]) => (r + w === 0 ? "no right flowers" : [r && `${r} right spot${r > 1 ? "s" : ""}`, w && `${w} wrong spot${w > 1 ? "s" : ""}`].filter(Boolean).join(", "));
// Every code the level allows: all orderings of distinct flowers, or every row with repeats.
const CODE_SPACE = new Map();
function codeSpace(lvl) {
  if (CODE_SPACE.has(lvl)) return CODE_SPACE.get(lvl);
  const { slots, kinds, repeats } = CODE_LEVELS[lvl], out = [];
  const go = (row) => {
    if (row.length === slots) return out.push(row);
    for (let k = 0; k < kinds; k++) if (repeats || !row.includes(k)) go([...row, k]);
  };
  go([]);
  CODE_SPACE.set(lvl, out);
  return out;
}
// The codes that fit every clue row (brute force over the whole space).
const codeFits = (rows, lvl) => codeSpace(lvl).filter((c) => rows.every((r) => codeScore(r.guess, c).join() === r.score.join()));
const codeCache = new Map();
function codeModel(d, lvl = difficulty) {
  const key = d + "|" + lvl;
  if (codeCache.has(key)) return codeCache.get(key);
  const L = CODE_LEVELS[lvl], space = codeSpace(lvl), r = rng(puzzleSeed(d) + "|code-v1");
  const pick = () => space[Math.floor(r() * space.length)];
  for (let attempt = 0; attempt < 500; attempt++) {
    const code = pick(), rows = [];
    let left = space;
    // Add random guesses that each rule something out, until one code is left or the level's limit is reached.
    for (let tries = 0; left.length > 1 && rows.length < L.rows[1] && tries < 60; tries++) {
      const guess = pick();
      if (guess.join() === code.join()) continue;
      const score = codeScore(guess, code), next = left.filter((c) => codeScore(guess, c).join() === score.join());
      if (next.length === left.length) continue;
      rows.push({ guess, score });
      left = next;
    }
    if (left.length !== 1 || rows.length < L.rows[0]) continue;
    // Every clue must matter: without any one of them, another code would fit too.
    if (rows.some((_, k) => codeFits(rows.filter((__, j) => j !== k), lvl).length < 2)) continue;
    const m = { code, rows, lvl, slots: L.slots, kinds: L.kinds, repeats: L.repeats };
    codeCache.set(key, m);
    return m;
  }
  throw Error("Code Garden generation failed for " + d);
}
// A wrong check adds her row as a new clue; a right one finishes the garden. Pure on (model, save).
function codeCheck(m, s) {
  const guess = s.cur.slice(), score = codeScore(guess, m.code);
  s.guesses.push(guess);
  return { score, solved: score[0] === m.slots };
}
// "Show one flower": fills the first wrong or empty spot with its right flower and locks it. Always leaves one to find.
function codeHint(m, s) {
  const open = [...Array(m.slots).keys()].filter((j) => !s.locked.includes(j));
  if (open.length <= 1) return -1;
  const j = open.find((k) => s.cur[k] !== m.code[k]) ?? open[0];
  s.cur[j] = m.code[j];
  s.locked.push(j);
  return j;
}
/* For the reveal: the code closest to the answer (fits the most clues, then shares the most spots),
   and one clue that rules it out. */
function codeWhy(m) {
  const fit = (c) => m.rows.filter((r) => codeScore(r.guess, c).join() === r.score.join()).length;
  const same = (c) => c.filter((k, j) => k === m.code[j]).length;
  const alt = codeSpace(m.lvl).filter((c) => c.join() !== m.code.join())
    .reduce((best, c) => (!best || fit(c) > fit(best) || (fit(c) === fit(best) && same(c) > same(best)) ? c : best), null);
  const row = m.rows.findIndex((r) => codeScore(r.guess, alt).join() !== r.score.join());
  return { alt, row, would: codeScore(m.rows[row].guess, alt), got: m.rows[row].score };
}
function codeGarden(i) {
  const m = codeModel(day), s = state(i), n = m.slots;
  s.guesses ||= [];
  s.locked ||= [];
  if (!Array.isArray(s.cur) || s.cur.length !== n) s.cur = Array(n).fill(null);
  let sel = s.cur.findIndex((k, j) => k == null && !s.locked.includes(j));
  $("#rules").innerHTML = `<span class="cgrule">A hidden row of flowers. Every clue rules something out.</span>`
    + `<span class="cgrule"><b>●</b> right flower, right spot · <b>○</b> right flower, wrong spot. The marks don't say which flower they belong to.</span>`
    + `<span class="cgrule">Tap a spot, pick a flower, then Check. A wrong check becomes a new clue, so check as often as you like. ${m.repeats ? "A flower can appear more than once." : "Each flower appears at most once."}</span>`;
  const row = (guess, score, label) => `<li class="cgrow" aria-label="${label}: ${codeNames(guess)}: ${codeMarksText(score)}"><span class="cgtag" aria-hidden="true">${label}</span><span class="cgflowers" aria-hidden="true">${guess.map((k) => `<span class="cgcell">${codeFlowerSvg(k)}</span>`).join("")}</span><span class="cgmarks" aria-hidden="true">${codeMarks(score) || "–"}</span></li>`;
  function draw() {
    const done = s.done, why = s.revealed ? codeWhy(m) : null;
    let html = `<ol class="cgclues">${m.rows.map((r, k) => row(r.guess, r.score, `Clue ${k + 1}`)).join("")}`
      + s.guesses.map((g, k) => row(g, codeScore(g, m.code), `Check ${k + 1}`)).join("") + `</ol>`;
    const shown = done ? (s.revealed ? m.code : s.guesses.at(-1) || m.code) : s.cur;
    html += `<div class="cganswer ${done ? "solved" : ""}" role="group" aria-label="Your answer">${shown.map((k, j) => {
      const locked = s.locked.includes(j);
      return `<button class="cgslot ${j === sel && !done ? "sel" : ""} ${locked ? "locked" : ""}" data-cs="${j}" ${done ? "disabled" : ""} aria-pressed="${j === sel && !done}" aria-label="Spot ${j + 1}: ${k == null ? "empty" : CODE_FLOWERS[k].name}${locked ? ", given by a hint" : ""}">${k == null ? `<span class="cgempty" aria-hidden="true">${j + 1}</span>` : codeFlowerSvg(k)}${locked ? '<i class="cglock" aria-hidden="true">✓</i>' : ""}</button>`;
    }).join("")}</div>`;
    if (!done) html += `<div class="cgpicker" role="group" aria-label="Flowers">${CODE_FLOWERS.slice(0, m.kinds).map((f, k) => `<button class="cgpick" data-ck="${k}" aria-label="${f.name}">${codeFlowerSvg(k)}<small aria-hidden="true">${f.name}</small></button>`).join("")}</div>`;
    if (why) html += `<div class="reveal cgwhy"><span class="eyebrow">THE CODE</span><p><strong>${codeNames(m.code)}</strong></p><p>Why not ${codeNames(why.alt, true)}? Against clue ${why.row + 1} it would score ${codeMarks(why.would) || "nothing"} (${codeMarksText(why.would)}), but the clue shows ${codeMarks(why.got) || "nothing"} (${codeMarksText(why.got)}).</p></div>`;
    $("#board").innerHTML = html;
    $("#board").querySelectorAll("[data-cs]").forEach((b) => (b.onclick = () => {
      const j = +b.dataset.cs;
      if (s.done || s.locked.includes(j)) return;
      sel = j;
      draw();
    }));
    $("#board").querySelectorAll("[data-ck]").forEach((b) => (b.onclick = () => {
      if (s.done) return;
      if (sel < 0 || s.locked.includes(sel)) sel = s.cur.findIndex((k, j) => !s.locked.includes(j));
      s.cur[sel] = +b.dataset.ck;
      persist();
      // Move on to the next spot still empty, or stay put once the row is full.
      const next = [...Array(n).keys()].map((t) => (sel + 1 + t) % n).find((j) => s.cur[j] == null && !s.locked.includes(j));
      if (next != null) sel = next;
      draw();
    }));
  }
  draw();
  action("Check", () => {
    if (s.done) return;
    if (s.cur.some((k) => k == null)) return msg("Fill every spot first.");
    const { score, solved } = codeCheck(m, s);
    persist();
    if (solved) { draw(); return sparkSolved(s.guesses.length === 1 ? "Every flower in its place, first check! ✦" : `Every flower in its place, found in ${s.guesses.length} checks!`); }
    draw();
    msg(`Not yet: ${codeMarks(score) || "no marks"} (${codeMarksText(score)}). That's a new clue.`);
  });
  action("Clear row", () => {
    if (s.done) return;
    s.cur = s.cur.map((k, j) => (s.locked.includes(j) ? k : null));
    sel = s.cur.findIndex((k, j) => k == null && !s.locked.includes(j));
    persist(); draw(); msg("");
  }, true);
  action("Hint: show one flower", () => {
    if (s.done) return;
    const j = codeHint(m, s);
    if (j < 0) return msg("That's every hint for this one. The last flower is yours to find!");
    persist();
    if (sel === j) sel = s.cur.findIndex((k, t) => k == null && !s.locked.includes(t));
    draw();
    msg(`Spot ${j + 1} is a ${CODE_FLOWERS[m.code[j]].name.toLowerCase()}.`);
  }, true);
}
SPARKS[26] = { name: "Code Garden", blurb: "A hidden row of flowers. Every clue rules something out.", type: "Deduction", art: "✿ ● ○", render: codeGarden };
