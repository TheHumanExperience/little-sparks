// Checks Where in the World (state 24): every photo has a free licence, a credit, a clue and a story,
// and its country is in the country table; each level's pool covers the 31-day archive without
// repeats; every day × level is deterministic, offers four distinct countries with the answer exactly
// once, graded by level; tries, misses and pinned saves behave.
const fs = require("fs"), vm = require("vm");
function element() {
  return { textContent: "", innerHTML: "", value: "", dataset: {}, children: [], querySelectorAll: () => [], classList: { add() {}, remove() {}, toggle() {} }, append(b) { this.children.push(b); } };
}
const nodes = new Map();
const document = { querySelector(s) { if (!nodes.has(s)) nodes.set(s, element()); return nodes.get(s); }, querySelectorAll: () => [], createElement: () => element(), addEventListener() {} };
const context = { document, localStorage: { getItem: () => null, setItem: () => {} }, window: {}, setInterval: () => {}, fs };
vm.createContext(context);
for (const f of ["valid-words.js", "app.js", "daily-content.js", "photos.js", "extras.js", "stories.js", "ladders.js", "sparks.js", "places.js", "globe.js"]) vm.runInContext(fs.readFileSync("dist/" + f, "utf8"), context);
const out = vm.runInContext(`
const fail = (m) => { throw Error(m); };
const FREE = /^(public domain|pd\\b|pd-|cc0|cc by(-sa)? \\d\\.\\d|cc by(-sa)?$|cc-by(-sa)?-\\d\\.\\d)/i;
const ids = new Set();
for (const p of PLACES) {
  if (ids.has(p.id)) fail("duplicate place " + p.id); ids.add(p.id);
  if (!WORLD_COUNTRY[p.country]) fail(p.id + ": country not in WORLD_REGIONS: " + p.country);
  if (!fs.existsSync("dist/" + p.image)) fail(p.id + ": missing image " + p.image);
  if (!FREE.test(p.licence) || !p.source.startsWith("https://commons.wikimedia.org/") || !p.credit) fail(p.id + ": licence or credit " + p.licence);
  for (const k of ["title", "alt", "clue", "story"]) if (!p[k] || p[k].length < 8) fail(p.id + ": missing " + k);
  if (new RegExp("\\\\b" + p.country + "\\\\b", "i").test(p.alt + " " + p.clue)) fail(p.id + ": alt or clue names the country");
  if (![0, 1, 2].includes(p.level)) fail(p.id + ": level");
}
const days = Array.from({ length: 366 }, (_, n) => new Date(Date.UTC(2026, 0, 1 + n)).toISOString().slice(0, 10));
const stats = [];
for (const lvl of [0, 1, 2]) {
  difficulty = lvl;
  const pool = placePool(lvl), seen = [];
  if (pool.length < FEED_DAYS_MIN) fail("level " + lvl + " needs at least " + FEED_DAYS_MIN + " photos, has " + pool.length);
  let sameContinent = 0;
  for (const d of days) {
    const m = placeModel(d), again = placeModel(d), home = WORLD_COUNTRY[m.place.country];
    if (JSON.stringify(m) !== JSON.stringify(again)) fail("not deterministic " + d);
    if (m.options.length !== 4 || new Set(m.options).size !== 4 || m.options.filter((c) => c === m.place.country).length !== 1) fail("bad options " + d + " " + m.options);
    if (m.options.some((c) => !WORLD_COUNTRY[c])) fail("unknown option country " + m.options);
    const others = m.options.filter((c) => c !== m.place.country).map((c) => WORLD_COUNTRY[c]);
    if (lvl === 0 && new Set([home.continent, ...others.map((o) => o.continent)]).size !== 4) fail("Gentle options must span four continents " + m.options);
    if (lvl === 1 && (others.filter((o) => o.continent === home.continent).length !== 2)) fail("Medium options: two near, one far " + m.options);
    if (lvl === 2 && others.some((o) => o.continent !== home.continent)) fail("Tricky options must share the continent " + m.options);
    sameContinent += others.filter((o) => o.continent === home.continent).length;
    seen.push(m.place.id);
  }
  for (let k = 0; k + 31 <= seen.length; k++) if (new Set(seen.slice(k, k + 31)).size !== 31) fail("level " + lvl + " repeats a photo within 31 days near " + days[k]);
  stats.push(pool.length + " photos, " + (sameContinent / days.length).toFixed(1) + " same-continent decoys");
}
// Tries: Gentle never runs out; Medium and Tricky end after two misses. A pick is remembered.
difficulty = 0; { const m = placeModel(days[0]), s = {}, wrong = m.options.filter((c) => c !== m.place.country);
  for (const c of wrong) if (placeTry(s, m, c) !== "wrong") fail("Gentle should never run out");
  if (placeTry(s, m, m.place.country) !== "right" || s.pick !== m.place.country) fail("Gentle right pick"); }
for (const lvl of [1, 2]) { difficulty = lvl; const m = placeModel(days[5]), s = {}, wrong = m.options.filter((c) => c !== m.place.country);
  if (placeTry(s, m, wrong[0]) !== "wrong" || placeTry(s, m, wrong[0]) !== "wrong" || s.wrong.length !== 1) fail("a repeated miss must not use a try");
  if (placeTry(s, m, wrong[1]) !== "out") fail("two misses end the round at level " + lvl); }
// A started game keeps its photo and options even if the pool changes later.
difficulty = 1; { const d = "2026-05-04", s = {}, m = savedPlace(d, s);
  if (s.placeId !== m.place.id || JSON.stringify(s.options) !== JSON.stringify(m.options)) fail("place save not pinned");
  const pinned = { placeId: PLACES.find((p) => p.id !== m.place.id).id, options: ["A", "B", "C", "D"] };
  if (savedPlace(d, pinned).place.id !== pinned.placeId || savedPlace(d, pinned).options[0] !== "A") fail("pinned place changed"); }
// Render into the fake DOM, take both hints, and solve.
difficulty = 2; day = "2026-05-04"; data = { games: {} }; openSpark(24);
if (!$("#board").innerHTML.includes("placeopt") || !$("#rules").textContent) fail("render 24");
$("#actions").children.find((b) => b.textContent === "A gentle hint").onclick();
if (!/It's in /.test($("#feedback").textContent)) fail("first hint should name the continent");
$("#actions").children.find((b) => b.textContent === "A gentle hint").onclick();
if (state(24).hints !== 2) fail("second hint");
stats.join(" · ");
`, Object.assign(context, { FEED_DAYS_MIN: 31 }));
console.log("PASS: Where in the World — free-licence photos with credits, clues and stories; no repeat within 31 days; 3 levels × 366 days deterministic with graded options; tries, misses, hints and pinned saves. " + out);
