// Loads Little Sparks into a Node vm context exactly as the browser does: every <script> in
// dist/index.html, in page order, against one small fake DOM. Every verify*.cjs builds its app
// through this, so the checks always run the same program the player loads.
//
//   const { run, context, storage, nodes } = loadApp({ level, storage, dom, globals });
//
// - level:   starting level (0 Gentle, 1 Medium, 2 Tricky), set through the saved setting the
//            app itself reads. Omit it to start as a new player does (Medium).
// - storage: starting localStorage contents ({ key: string }). The same object is updated as
//            the app saves, and is returned, so a second loadApp can share it ("reload").
// - dom:     { defaults, onCreate }. `defaults` is merged into every fake element (for example
//            { value: "1950" }); `onCreate(tag, el)` sees each document.createElement call.
// - globals: extra globals for the context (for example fs, fetch or crypto stubs).
//
// The leaderboard always loads with an empty config and no fetch, so it switches itself off
// and no check can ever reach the live project. feed.js stays inert because there is no #feed.
const fs = require("fs"), path = require("path"), vm = require("vm");

const DIST = path.join(__dirname, "..", "dist");
const PAGE_SCRIPTS = [...fs.readFileSync(path.join(DIST, "index.html"), "utf8").matchAll(/<script\s+src="([^"?]+)(?:\?[^"]*)?"\s*><\/script>/g)].map((m) => m[1]);
if (!PAGE_SCRIPTS.includes("app.js") || !PAGE_SCRIPTS.includes("feed.js")) throw Error("load-app: could not read the script list from dist/index.html");
const SOURCES = new Map();
const source = (f) => {
  if (!SOURCES.has(f)) {
    let src = fs.readFileSync(path.join(DIST, f), "utf8");
    if (f === "leaderboard-config.js") src = src.replace(/(SUPABASE_URL|SUPABASE_ANON_KEY) = "[^"]*"/g, '$1 = ""');
    SOURCES.set(f, src);
  }
  return SOURCES.get(f);
};

function loadApp({ level, storage = {}, dom = {}, globals = {} } = {}) {
  const nodes = new Map(), defaults = dom.defaults || {};
  const element = (tag) => {
    const el = {
      tagName: tag ? String(tag).toUpperCase() : undefined, textContent: "", innerHTML: "", value: "", open: false, disabled: false,
      complete: true, naturalWidth: 100, children: [], dataset: {}, style: {},
      classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
      querySelectorAll: () => [], setAttribute() {}, addEventListener() {},
      append(...items) { this.children.push(...items); },
      showModal() { this.open = true; }, close() { this.open = false; },
      ...defaults,
    };
    if (tag && dom.onCreate) dom.onCreate(tag, el);
    return el;
  };
  const document = {
    querySelector(s) { if (!nodes.has(s)) nodes.set(s, element()); return nodes.get(s); },
    querySelectorAll: () => [],
    createElement: (tag) => element(tag),
    getElementById: () => null,
    addEventListener() {},
  };
  if (level !== undefined) storage["little-sparks-difficulty"] = String(level);
  const localStorage = { getItem: (k) => (k in storage ? storage[k] : null), setItem: (k, v) => { storage[k] = String(v); }, removeItem: (k) => { delete storage[k]; } };
  const context = vm.createContext({ console, document, localStorage, window: {}, setInterval() {}, clearInterval() {}, ...globals });
  for (const f of PAGE_SCRIPTS) vm.runInContext(source(f), context, { filename: "dist/" + f });
  return { context, run: (code) => vm.runInContext(code, context), storage, nodes, element };
}

module.exports = { loadApp, PAGE_SCRIPTS };
