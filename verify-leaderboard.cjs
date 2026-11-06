const fs = require("fs"), vm = require("vm");
const fail = (m) => { throw Error(m); };
let fetched = 0;
const cfgSrc = fs.readFileSync("dist/leaderboard-config.js", "utf8");
const ctx = { console, crypto: require("crypto").webcrypto, fetch: () => { fetched++; return Promise.reject(Error("offline")); }, document: { querySelector: () => null }, localStorage: { getItem: () => null, setItem() {} } };
vm.createContext(ctx);
// Tests run against an empty config so nothing ever reaches the live project.
vm.runInContext(cfgSrc.replace(/(SUPABASE_URL|SUPABASE_ANON_KEY) = "[^"]*"/g, '$1 = ""'), ctx);
vm.runInContext(fs.readFileSync("dist/leaderboard.js", "utf8"), ctx);
const run = (code) => vm.runInContext(code, ctx);

// Points mapping: Gentle 1, Medium 3, Tricky 5; anything else 0.
if (JSON.stringify([0, 1, 2, 3, -1].map((l) => run(`lbPoints(${l})`))) !== "[1,3,5,0,0]") fail("points mapping");

// India time: 23:59:59 IST is still that day, 00:00 IST is the next.
if (run(`istDate(new Date("2026-11-06T18:29:59Z"))`) !== "2026-11-06") fail("IST before midnight");
if (run(`istDate(new Date("2026-11-06T18:30:00Z"))`) !== "2026-11-07") fail("IST midnight");
// Weeks start on Monday, also across an IST midnight: Sunday 23:59 IST vs Monday 00:00 IST.
if (run(`lbWeekStart(istDate(new Date("2026-11-08T18:29:00Z")))`) !== "2026-11-02") fail("Sunday belongs to the previous Monday");
if (run(`lbWeekStart(istDate(new Date("2026-11-08T18:30:00Z")))`) !== "2026-11-09") fail("Monday starts a new week");
for (let k = 0; k < 400; k++) {
  const d = run(`lbAddDays("2026-01-01", ${k})`), w = run(`lbWeekStart("${d}")`);
  if (new Date(w + "T00:00:00Z").getUTCDay() !== 1 || w > d || run(`lbAddDays("${w}", 6)`) < d) fail(`week start for ${d}`);
  if (run(`lbPeriodStart("month", "${d}")`) !== d.slice(0, 8) + "01" || run(`lbPeriodStart("day", "${d}")`) !== d) fail(`period start for ${d}`);
}
if (run(`lbWeekStart("2027-01-01")`) !== "2026-12-28") fail("week across a year end");

// Dedupe: each date×level×game is claimed once; only today ±1 (IST) counts.
run(`var st = lbLoad(null), t = "2026-11-07", r;`);
if (!/^[0-9a-f-]{36}$/.test(run("st.id")) || run("st.queue.length")) fail("fresh state");
run(`r = lbAward(st, t, 2, 12, t); st = r.st;`);
if (run("r.item.p") !== 5 || run("st.queue.length") !== 1) fail("first Tricky solve queues 5 points");
if (run("lbAward(st, t, 2, 12, t).item") !== null) fail("second solve of the same card must not count");
if (run("lbAward(lbAck(st, st.queue[0].k), t, 2, 12, t).item") !== null) fail("a synced solve must not count again");
if (run("lbAward(st, t, 0, 12, t).item.p") !== 1 || run("lbAward(st, t, 1, 12, t).item.p") !== 3) fail("other levels of the same game are separate");
if (run(`lbAward(st, "2026-11-06", 1, 1, t).item?.p`) !== 3 || run(`lbAward(st, "2026-11-08", 1, 1, t).item?.p`) !== 3) fail("yesterday and tomorrow count");
if (run(`lbAward(st, "2026-11-05", 1, 1, t).item`) !== null || run(`lbAward(st, "2026-10-07", 1, 1, t).item`) !== null) fail("archive days don't count");
if (run(`lbAward(st, t, 3, 1, t).item`) !== null) fail("unknown level");

// Queue: survives a reload, ack removes one, prune drops what the server would reject.
run(`st = lbAward(st, t, 0, 4, t).st; st = lbAward(st, "2026-11-06", 1, 8, t).st; var back = lbLoad(JSON.stringify(st));`);
if (run("back.id") !== run("st.id") || run("back.queue.length") !== 3 || run("Object.keys(back.sent).length") !== 3) fail("queue round trip");
if (run("lbAck(back, back.queue[0].k).queue.length") !== 2) fail("ack");
run(`var later = lbPrune(back, "2026-11-08");`);
if (run("later.queue.length") !== 2 || run(`later.queue.some(q => q.d === "2026-11-06")`)) fail("prune keeps today ±1 only");
if (run(`lbAward(later, "2026-11-07", 2, 12, "2026-11-08").item`) !== null) fail("dedupe keys survive pruning within a week");
if (run(`Object.keys(lbPrune(back, "2026-11-20").sent).length`) !== 0) fail("old dedupe keys are forgotten");
if (run(`lbLoad("{oops").queue.length`) !== 0) fail("corrupt storage");

// Names and escaping.
if (run(`lbCleanName("   Nidhi   the   great  puzzler  ")`) !== "Nidhi the great puzz" || run(`lbCleanName("abcdefghijklmnopqrs tu")`) !== "abcdefghijklmnopqrs") fail("name clean");
if (run(`lbCleanName("Ni\\u202Edhi\\u0000 \\u200B")`) !== "Nidhi") fail("hidden characters are stripped from names");
if (run(`lbEsc('<img src=x onerror="1">')`).includes("<")) fail("escape");

// Empty config: hidden, inert, no network.
// The committed config is either empty or a project URL plus a public (publishable or anon) key — never a secret.
const cfg = vm.createContext({}); vm.runInContext(cfgSrc + ";globalThis.c=[SUPABASE_URL,SUPABASE_ANON_KEY]", cfg);
const [url, key] = cfg.c;
if (url || key) {
  if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url)) fail("SUPABASE_URL must be https://<ref>.supabase.co");
  const role = key.startsWith("eyJ") ? JSON.parse(Buffer.from(key.split(".")[1] || "", "base64url").toString() || "{}").role : null;
  if (!(key.startsWith("sb_publishable_") || role === "anon")) fail("SUPABASE_ANON_KEY must be a publishable/anon key, never service_role or sb_secret_");
}
if (run(`lbSolved("2026-11-07", 1, 1)`) !== undefined || fetched) fail("disabled leaderboard must do nothing");

// The feed awards points only from the first-solve branch; schema agrees on the rules.
const feed = fs.readFileSync("dist/feed.js", "utf8");
if (!/if \(st\.credit \|\| st\.revealed\) celebrateReplay\([^;]*\); else \{ celebrate\(live\); if \(typeof lbSolved === "function"\) lbSolved\(/.test(feed) || feed.split("lbSolved(").length !== 2) fail("feed must call lbSolved only for first solves");
const sql = fs.readFileSync("supabase/schema.sql", "utf8");
for (const s of ["primary key (player_id, date, level, game)", "points in (1, 3, 5)", "case p_level when 0 then 1 when 1 then 3 when 2 then 5", "'Asia/Kolkata'", "date_trunc('week'", "ist_today() - 1 and ist_today() + 1", "enable row level security", "security definer", "set search_path = public", "from public, anon, authenticated", "[[:cntrl:]"]) if (!sql.includes(s)) fail("schema.sql missing: " + s);
console.log("PASS: leaderboard — points 1/3/5, dedupe per date×level×game, IST day/week(Mon)/month boundaries, offline queue round trip and pruning, inert without config, committed key is public-only");
