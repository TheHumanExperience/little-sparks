// Checks the feed wiring: every game appears exactly once, every card has metadata,
// the archive window is 31 distinct days, and feed.js stays inert without a #feed element.
const fs = require("fs"), vm = require("vm");
const nodes = new Map();
function element() {
  return { textContent: "", innerHTML: "", value: "", open: false, children: [], dataset: {}, querySelectorAll: () => [], classList: { add() {}, remove() {}, toggle() {} }, append(b) { this.children.push(b); }, showModal() { this.open = true; }, close() { this.open = false; } };
}
const document = { querySelector(s) { if (!nodes.has(s)) nodes.set(s, element()); return nodes.get(s); }, querySelectorAll: () => [], createElement: () => element(), addEventListener() {}, getElementById: () => null };
const context = { document, localStorage: { getItem: () => null, setItem: () => {} }, window: {}, setInterval: () => {} };
vm.createContext(context);
for (const f of ["valid-words.js", "app.js", "daily-content.js", "photos.js", "extras.js", "constellations.js", "stories.js", "ladders.js", "sparks.js", "feed.js"]) vm.runInContext(fs.readFileSync("dist/" + f, "utf8"), context);
const result = vm.runInContext(`
const fail = (m) => { throw Error(m); };
const sorted = [...FEED_ORDER].sort((a, b) => a - b).join(",");
if (sorted !== Array.from({ length: 17 }, (_, i) => i).join(",")) fail("FEED_ORDER must hold games 0–16 exactly once: " + sorted);
for (const i of FEED_ORDER) { const g = feedGame(i); if (!g || !g.name || !g.type || !g.art) fail("missing metadata for game " + i); }
for (let i = 7; i <= 16; i++) if (typeof SPARKS[i].render !== "function") fail("no renderer for spark " + i);
for (const from of ["2026-01-01", "2026-03-29", "2026-10-25", "2026-12-31"]) {
  const ds = Array.from({ length: FEED_DAYS }, (_, o) => feedDate(o, from));
  if (ds[0] !== from) fail("offset 0 must be the start day");
  if (new Set(ds).size !== FEED_DAYS) fail("feed days repeat around " + from);
  for (let k = 1; k < ds.length; k++) if (!(ds[k] < ds[k - 1])) fail("feed days not descending around " + from);
}
if (window.FEED_MODE) fail("feed.js must stay inert without #feed");
const d = "2026-05-05"; all[progressKey(d)] = { games: { 0: { done: true }, 3: { done: true }, 9: { done: true }, 16: { done: true } } };
if (feedCount(d) !== 4) fail("feedCount should count all 17 games");
if (Object.entries(all[progressKey(d)].games).filter(([i, g]) => +i < 5 && g.done).length !== 2) fail("legacy 5-game count changed");
FEED_ORDER.length + " cards × " + FEED_DAYS + " days";
`, context);
if (!fs.readFileSync("dist/feed.js", "utf8").includes("Created with love from Devansh")) throw Error("note card message missing");
console.log("Feed OK:", result);
