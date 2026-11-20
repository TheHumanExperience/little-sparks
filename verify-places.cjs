// Checks Where in the World (state 24): every photo has a free licence, a credit, a clue and a story,
// and its country is in the country table; each level's pool covers the 31-day archive without
// repeats; every day × level is deterministic, offers four distinct countries with the answer exactly
// once, graded by level; days before PLACE_V2_FROM keep the original v1 picks, and the v2 cycle over
// the larger pool never repeats within 31 days; under v2, Tricky city photos ask for the city (four cities
// from WORLD_CITIES, same country and neighbours), with a country hint and city saves that reload and reveal;
// tries, misses and pinned saves behave.
const fs = require("fs"), vm = require("vm");
const { context } = require("./tests/load-app.cjs").loadApp({ globals: { fs } });
const out = vm.runInContext(`
const fail = (m) => { throw Error(m); };
const FREE = /^(public domain|pd\\b|pd-|cc0|cc by(-sa)? \\d\\.\\d|cc by(-sa)?$|cc-by(-sa)?-\\d\\.\\d)/i;
const ids = new Set();
for (const p of PLACES) {
  if (ids.has(p.id)) fail("duplicate place " + p.id); ids.add(p.id);
  if (!WORLD_COUNTRY[p.country]) fail(p.id + ": country not in WORLD_REGIONS: " + p.country);
  if (!fs.existsSync("dist/" + p.image)) fail(p.id + ": missing image " + p.image);
  if (!FREE.test(p.licence) || !p.source.startsWith("https://commons.wikimedia.org/") || !p.credit) fail(p.id + ": licence or credit " + p.licence);
  // CC BY and BY-SA need the author: an empty artist builds to "Unknown photographer / ...".
  const author = p.credit.replace(" / Wikimedia Commons", "").trim();
  if (!/^(public domain|pd|cc0)/i.test(p.licence) && (!author || author === "Unknown photographer")) fail(p.id + ": " + p.licence + " needs its author in the credit (fill artist in tools/places-meta.json)");
  for (const k of ["title", "alt", "clue", "story"]) if (!p[k] || p[k].length < 8) fail(p.id + ": missing " + k);
  if (new RegExp("\\\\b" + p.country + "\\\\b", "i").test(p.alt + " " + p.clue)) fail(p.id + ": alt or clue names the country");
  if (![0, 1, 2].includes(p.level)) fail(p.id + ": level");
  // Tricky photos carry the city they show (common English name), or null for nature and rural scenes.
  if (p.level === 2 && !(p.city === null || (typeof p.city === "string" && p.city.length > 1))) fail(p.id + ": Tricky needs a city (a name or null)");
  if (p.city && new RegExp("\\\\b" + p.city + "\\\\b", "i").test(p.alt + " " + p.clue)) fail(p.id + ": alt or clue names the city");
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
// v1 is pinned to the original 124 photos and must pick exactly what it picked before the pool grew:
// photo and options for every 2026 day on every level (FNV-1a of them). Days before PLACE_V2_FROM use v1.
if (PLACE_V1.map((l) => l.length).join() !== "40,43,41") fail("PLACE_V1 must hold the original 40/43/41 photos");
for (const lvl of [0, 1, 2]) for (const id of PLACE_V1[lvl]) if (!placeById(id) || placeById(id).level !== lvl || placeById(id).retired) fail("v1 photo missing or moved: " + id);
{ const s = [0, 1, 2].map((l) => { difficulty = l; return days.map((d) => { const m = placeModel(d, l, "9999-12-31"); if (d < PLACE_V2_FROM && JSON.stringify(m) !== JSON.stringify(placeModel(d))) fail("a day before PLACE_V2_FROM left v1: " + d); return m.place.id + ":" + m.options.join(","); }).join("|"); }).join("#");
  let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  if (h.toString(16) !== "24be9365") fail("v1 picks changed for 2026: " + h.toString(16)); }
// v2: try the cycle from a test cutover. No repeat within 31 days on each level, every photo appears
// within one full cycle, and when a level has 31 or more newer photos the switch repeats nothing
// from the last 31 days of v1.
for (const lvl of [0, 1, 2]) {
  const from = "2026-06-01", pool = placePool(lvl), seq = [];
  for (let n = -31; n < pool.length + 62; n++) seq.push(placeModel(new Date(Date.UTC(2026, 5, 1 + n)).toISOString().slice(0, 10), lvl, from).place.id);
  const v2 = seq.slice(31);
  for (let k = 0; k + 31 <= v2.length; k++) if (new Set(v2.slice(k, k + 31)).size !== 31) fail("v2 level " + lvl + " repeats within 31 days");
  if (new Set(v2.slice(0, pool.length)).size !== pool.length) fail("v2 level " + lvl + " must show every photo once per cycle");
  if (pool.length - PLACE_V1[lvl].length >= 31) for (let k = 0; k + 31 <= 62; k++) if (new Set(seq.slice(k, k + 31)).size !== 31) fail("v2 level " + lvl + " repeats a v1 photo across the switch");
  if (pool.length > PLACE_V1[lvl].length && PLACE_V1[lvl].includes(v2[0])) fail("v2 level " + lvl + " should open with a newer photo");
}
// City table: every country is in WORLD_REGIONS, no city appears twice, and every Tricky photo's city is
// listed under its own country.
{ const seenCity = new Map();
  for (const [c, list] of Object.entries(WORLD_CITIES)) {
    if (!WORLD_COUNTRY[c]) fail("WORLD_CITIES country not in WORLD_REGIONS: " + c);
    for (const city of list) { if (seenCity.has(city)) fail("city listed twice: " + city + " (" + c + ", " + seenCity.get(city) + ")"); seenCity.set(city, c); }
  }
  for (const p of placePool(2)) if (p.city && seenCity.get(p.city) !== p.country) fail(p.id + ": city " + p.city + " must be listed under " + p.country + " in WORLD_CITIES"); }
// Tricky city question (v2 only): on a city photo, four distinct cities with the answer once, all from the
// photo's continent, at least one more from the same country when the table has one, and hint 1 names the
// country (the region for a city-state). Nature photos keep the country question. Deterministic over 366
// days; Gentle and Medium never ask for a city.
const V2T = "2026-06-01", v2days = Array.from({ length: 366 }, (_, n) => new Date(Date.UTC(2026, 5, 1 + n)).toISOString().slice(0, 10));
let cityDays = 0, cityFirst31 = 0, localDecoys = 0;
for (const lvl of [0, 1, 2]) { difficulty = lvl;
  for (const [n, d] of v2days.entries()) {
    const m = placeModel(d, lvl, V2T), p = m.place;
    if (JSON.stringify(m) !== JSON.stringify(placeModel(d, lvl, V2T))) fail("v2 not deterministic " + d);
    if (lvl < 2 || !p.city) { if (m.city || m.options.some((c) => !WORLD_COUNTRY[c]) || !m.options.includes(p.country)) fail("level " + lvl + " " + p.id + " must keep the country question"); continue; }
    cityDays++; if (n < 31) cityFirst31++;
    if (m.city !== p.city || m.options.length !== 4 || new Set(m.options).size !== 4 || m.options.filter((c) => c === p.city).length !== 1) fail("bad city options " + d + " " + m.options);
    const country = (c) => Object.keys(WORLD_CITIES).find((k) => WORLD_CITIES[k].includes(c));
    if (m.options.some((c) => !country(c) || WORLD_COUNTRY[country(c)].continent !== WORLD_COUNTRY[p.country].continent)) fail("city options must be known cities on the same continent " + d + " " + m.options);
    const local = m.options.filter((c) => c !== p.city && country(c) === p.country).length;
    if (WORLD_CITIES[p.country].length > 1 && local < 1) fail("city question needs a same-country decoy " + d + " " + m.options);
    if (m.options.filter((c) => c !== p.city && country(c) !== p.country).length < 1) fail("city question needs a neighbouring-country decoy " + d + " " + m.options);
    localDecoys += local;
    const h = placeHints(m);
    if (h[0] !== (local ? "It's in " + p.country + "." : "It's in " + WORLD_COUNTRY[p.country].continent + " (" + WORLD_COUNTRY[p.country].region + ").") || h[1] !== p.clue) fail("city hints " + d + " " + h);
    // Save round-trip: a saved city question reloads as the same question; a wrong city uses a try, the city solves.
    const pinned = JSON.parse(JSON.stringify({ placeId: p.id, options: m.options, city: m.city })), back = savedPlace(d, pinned);
    if (JSON.stringify(back) !== JSON.stringify(m)) fail("a saved city question must reload unchanged " + d);
    if (placeTry(pinned, back, m.options.find((c) => c !== p.city)) !== "wrong" || placeTry(pinned, back, p.city) !== "right" || pinned.pick !== p.city) fail("city tries " + d);
  }
}
if (!cityDays) fail("no Tricky city days");
// A country save made without a city (any save from before v2) stays a country question on reload.
difficulty = 2; { const p = placePool(2).find((p) => p.city), back = savedPlace(V2T, { placeId: p.id, options: ["A", "B", "C", p.country] });
  if (back.city || placeAnswer(back) !== p.country || placeHints(back)[0].includes(p.country)) fail("a pinned country save must stay a country question"); }
// Wrong city picks and the city answer survive a reload; reveal picks the city; render shows the city
// question, its How to play line and the country hint.
{ const d = v2days.find((d) => placeModel(d, 2, V2T).city), m = placeModel(d, 2, V2T), wrong = m.options.find((c) => c !== m.city);
  difficulty = 2; day = d; data = { games: {} };
  Object.assign(state(24), { placeId: m.place.id, options: m.options.slice(), city: m.city });
  openSpark(24);
  if (!/name the city/.test($("#rules").textContent) || !/Pick a city/.test($("#rules").textContent) || !$("#board").innerHTML.includes('data-place="' + m.city + '"')) fail("city question render");
  $("#actions").children.find((b) => b.textContent === "A gentle hint").onclick();
  if (!/It's in /.test($("#feedback").textContent) || !$("#feedback").textContent.includes(placeHints(m)[0])) fail("city hint 1");
  const s = state(24); placeTry(s, m, wrong);
  const saved = JSON.parse(JSON.stringify(s)), again = savedPlace(d, saved);
  if (again.city !== m.city || saved.wrong[0] !== wrong || placeTry(saved, again, m.city) !== "right" || saved.pick !== m.city) fail("city save round-trip");
  const r = revealState(d, 24, JSON.parse(JSON.stringify({ placeId: m.place.id, options: m.options, city: m.city })));
  if (r.pick !== m.city || r.revealed !== 1 || !r.done) fail("reveal must pick the city");
  const fresh = revealState(d, 24, {});
  if (d >= PLACE_V2_FROM || fresh.city || !WORLD_COUNTRY[fresh.pick]) fail("before PLACE_V2_FROM a fresh reveal stays a country question");
  $("#actions").children.length = 0; } // the fake DOM keeps buttons across openSpark; start the next render clean
stats.push("Tricky city questions on " + cityDays + " of 366 v2 days (" + cityFirst31 + " of the first 31), " + (localDecoys / cityDays).toFixed(1) + " same-country decoys");
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
// No photo or place twice: ids, Commons source files and image bytes are unique, and so is the
// place itself. The place key is the id without its level prefix (g-taj → taj), so the same landmark
// can't sit at two levels under one name; PLACE_ALIASES maps other names for a place already in the
// pool onto its key, so it can't come back under a new id either. Add to it when a new id could be
// another name for an existing place.
const PLACE_ALIASES = {
  tajmahal: "taj", pyramids: "giza", sphinx: "giza", angkorwat: "angkor", stbasil: "basil", stbasils: "basil", kremlin: "basil",
  christ: "redeemer", corcovado: "redeemer", parthenon: "acropolis", harbour: "opera", sydney: "opera", operahouse: "opera",
  everest: "everest", sagarmatha: "everest", hagiasophia: "hagia", bluemosque: "bluemosque", sultanahmet: "bluemosque",
  forbiddencity: "forbidden", greatwallofchina: "greatwall", mutianyu: "greatwall", victoriafalls: "victoria", mosioatunya: "victoria",
  goldengatebridge: "goldengate", statueofliberty: "liberty", bigbenlondon: "bigben", westminster: "bigben", eiffeltower: "eiffel",
  leaningtower: "pisa", stpeters: "vatican", sistine: "vatican", sagradafamilia: "sagrada", machupicchu: "machu", easterisland: "moai",
  rapanui: "moai", petronastowers: "petronas", burjkhalifa: "burj", hawa: "hawamahal", windspalace: "hawamahal", halongbay: "halong",
  salar: "uyuni", uyunisalt: "uyuni", twelveapostles: "apostles", ayersrock: "uluru", cliffsofmoher: "moher", monumentvalley: "monument",
  tigernest: "tigersnest", taktsang: "tigersnest", registansquare: "registan", stonetown: "zanzibar", grandplace: "brussels",
  amritsar: "goldentemple", harmandir: "goldentemple", indiagate: "gateway", qutbminar: "qutub", qutb: "qutub",
};
{
  const crypto = require("crypto"), seen = new Map();
  const once = (kind, key, id) => { if (seen.has(kind + ":" + key)) throw Error(`duplicate ${kind}: ${id} and ${seen.get(kind + ":" + key)} (${key})`); seen.set(kind + ":" + key, id); };
  for (const p of vm.runInContext("PLACES", context)) {
    once("id", p.id, p.id);
    once("Commons file", decodeURIComponent(p.source.split("/wiki/")[1]).replace(/_/g, " ").toLowerCase(), p.id);
    once("image", crypto.createHash("sha256").update(fs.readFileSync("dist/" + p.image)).digest("hex"), p.id);
    const slug = p.id.replace(/^[gmt]-/, "");
    once("place", PLACE_ALIASES[slug] || slug, p.id);
  }
}
console.log("PASS: Where in the World — free-licence photos with credits, clues and stories; no duplicate id, Commons file, image or place; no repeat within 31 days; 3 levels × 366 days deterministic with graded options; v1 picks unchanged; v2 cycle checked; Tricky city questions (cities, decoys, hints, saves, reveal); tries, misses, hints and pinned saves. " + out);
