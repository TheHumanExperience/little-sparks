// Headless smoke test: every card at all three levels in WebKit (iPhone 13) and Chromium
// (360×740), with touch. Asserts DOM and saved state, not pixels, and prints a short summary.
//   npm run smoke                  # both engines
//   npm run smoke -- --shots       # also save every card to tests/shots/
//   npm run smoke -- --only=webkit
// Without --shots, screenshots are written only when something fails.
import { webkit, chromium, devices } from "playwright";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../dist/", import.meta.url));
const shotsDir = fileURLToPath(new URL("./shots/", import.meta.url));
const args = process.argv.slice(2), SHOTS = args.includes("--shots"), ONLY = args.find((a) => a.startsWith("--only="))?.slice(7);
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".jpg": "image/jpeg", ".png": "image/png", ".txt": "text/plain" };

const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^[/\\]+/, "") || "index.html";
  if (path.startsWith("..")) return res.writeHead(403).end();
  try { res.writeHead(200, { "content-type": TYPES[extname(path)] || "application/octet-stream" }).end(await readFile(join(root, path))); }
  catch { res.writeHead(404).end(); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const PAGE = `http://127.0.0.1:${server.address().port}/index.html`;

const launchChromium = async () => { try { return await chromium.launch(); } catch { return chromium.launch({ channel: "chrome" }); } };
const engines = [
  ["webkit", () => webkit.launch(), { ...devices["iPhone 13"] }],
  ["chromium", launchChromium, { viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
].filter(([n]) => !ONLY || n === ONLY);

const lines = [], summary = [];
let failures = 0;
const check = (ok, name, detail = "") => { if (!ok) { failures++; lines.push(`  ✗ ${name}${detail ? " — " + detail : ""}`); } return ok; };

for (const [engine, launch, ctxOpts] of engines) {
  const browser = await launch(), page = await (await browser.newContext(ctxOpts)).newPage();
  const errors = [], before = failures;
  // Never touch the live Supabase project from tests: start with an empty config and block real calls.
  await page.route("**/leaderboard-config.js*", (r) => r.fulfill({ contentType: "text/javascript", body: 'const SUPABASE_URL = ""; const SUPABASE_ANON_KEY = "";' }));
  await page.route("https://*.supabase.co/**", (r) => r.abort());
  page.on("pageerror", (e) => errors.push(e.message));
  const shot = async (name) => { await mkdir(shotsDir, { recursive: true }); await page.screenshot({ path: join(shotsDir, `${engine}-${name}.png`) }); };
  const fresh = async (lv) => {
    await page.evaluate((l) => { localStorage.clear(); localStorage.setItem("little-sparks-difficulty", String(l)); }, lv);
    await page.reload();
    await page.waitForSelector(".spark.live .stage");
  };
  const goTo = async (idx) => {
    await page.evaluate((i) => { const c = document.querySelector(`.spark[data-day="${today()}"][data-idx="${i}"]`); feed.scrollTo(0, c.offsetTop); }, idx);
    await page.waitForSelector(`.spark.live[data-idx="${idx}"] .stage #board`, { timeout: 5000 });
  };
  let cards = 0;
  await page.goto(PAGE);
  for (const lv of [0, 1, 2]) {
    await fresh(lv);
    check(await page.evaluate((l) => difficulty === l, lv), `${engine} L${lv} level applied`);
    const order = await page.evaluate(() => feedOrder());
    const shown = await page.evaluate(() => document.querySelectorAll(`.spark[data-day="${today()}"]`).length);
    check(shown === order.length, `${engine} L${lv} today shows ${order.length} cards`, `got ${shown}`);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${engine} L${lv} no page overflow`);
    const pillReveals = () => page.evaluate(() => { const r = document.querySelector("#revealCount"); return r.hidden ? "hidden" : r.textContent.trim(); });
    check(await pillReveals() === ["hidden", "· 🔑 5", "· 🔑 3"][lv], `${engine} L${lv} header shows reveals left`, await pillReveals());
    for (const idx of order) {
      const tag = `${engine} L${lv} #${idx}`;
      try { await goTo(idx); } catch { check(false, `${tag} becomes live`); await shot(`L${lv}-${idx}-fail`); continue; }
      const info = await page.evaluate(() => {
        const c = document.querySelector(".spark.live"), inner = c.querySelector(".sparkinner");
        return {
          board: c.querySelector("#board").innerHTML.length, title: c.querySelector(".sparktitle").textContent.trim(),
          overflow: inner.scrollWidth - inner.clientWidth, retry: !!c.querySelector(".retry[aria-label]"), reveal: !!c.querySelector(".revealbtn:not([hidden])"),
          tinyInputs: [...c.querySelectorAll("input:not([type=range])")].filter((e) => parseFloat(getComputedStyle(e).fontSize) < 16).length,
        };
      });
      const ok = [
        check(info.board > 20, `${tag} renders a board`),
        check(info.title.length > 2, `${tag} has a title`),
        check(info.overflow <= 1, `${tag} no horizontal overflow`, `${info.overflow}px`),
        check(info.retry && info.reveal, `${tag} has ↺ and Reveal answer`),
        check(info.tinyInputs === 0, `${tag} inputs ≥16px (no iOS zoom)`),
      ].every(Boolean);
      // Gentle reveals are unlimited, so reveal every card there; on Medium/Tricky only the first.
      if (lv === 0 || idx === order[0]) {
        await page.locator(".spark.live .revealbtn").tap();
        const yes = page.locator(".spark.live [data-yes]");
        if (await yes.count()) await yes.tap();
        await page.waitForTimeout(120);
        const st = await page.evaluate((i) => ({ s: state(i), counted: feedDone(today(), i) }), idx);
        check(st.s.done && st.s.revealed === 1 && !st.counted, `${tag} reveal shows the answer and doesn't count`);
      }
      if (SHOTS || !ok) await shot(`L${lv}-${idx}`);
      cards++;
    }
    check(await page.evaluate(() => feedOrder().every((i) => !feedDone(today(), i))), `${engine} L${lv} reveals never count`);
    if (lv) check(await pillReveals() === ["", "· 🔑 4", "· 🔑 2"][lv], `${engine} L${lv} header reveal count drops after a reveal`, await pillReveals());
  }
  // A real solve by touch: Pocket Sudoku on Gentle → solved badge and header count.
  const solvePocket = async () => {
    await goTo(1);
    const sol = await page.evaluate(() => sudokuModel(day).sol);
    const empties = await page.evaluate(() => [...document.querySelectorAll(".spark.live input.cell")].map((e, i) => (e.readOnly ? -1 : i)).filter((i) => i >= 0));
    for (const i of empties) { await page.locator(".spark.live input.cell").nth(i).tap(); await page.keyboard.type(String(sol[i])); }
    await page.waitForTimeout(400);
  };
  await fresh(0);
  check(await page.locator("#lbPill").isHidden(), `${engine} leaderboard hidden without config`);
  await solvePocket();
  check(await page.locator(".spark.live .donebadge:not([hidden])").count() === 1, `${engine} Pocket Sudoku solves by touch`);
  check(/·\s*1\/\d+/.test(await page.locator("#todayPill").innerText()), `${engine} header counts the solve`);
  // The brand returns to today's first card.
  await page.locator(".brand").tap();
  await page.waitForTimeout(1000);
  check(await page.evaluate(() => feed.scrollTop <= 2), `${engine} brand scrolls back to the top`);
  // Letterlight Ladder: a big Submit word button, on screen without scrolling (iPhone SE too), by tap and by Enter.
  const ladderSubmitVisible = () => page.evaluate(() => { const b = document.querySelector(".spark.live .ladsubmit"), r = b.getBoundingClientRect(), c = document.querySelector(".spark.live").getBoundingClientRect();
    return r.height >= 44 && r.top >= c.top && r.bottom <= Math.min(innerHeight, c.bottom) + 0.5 && b.textContent.includes("Submit word"); });
  const vp = page.viewportSize();
  for (const size of [{ width: 375, height: 667 }, vp]) {
    await page.setViewportSize(size); await fresh(0); await goTo(13);
    check(await ladderSubmitVisible(), `${engine} ${size.width}×${size.height} ladder Submit word visible without scrolling`);
  }
  // Mirror Garden on Tricky (7 × 7): fits an iPhone SE card with roomy cells, and solves by tap.
  await page.setViewportSize({ width: 375, height: 667 }); await fresh(2); await goTo(10);
  const mg = await page.evaluate(() => { const g = document.querySelector(".spark.live .mirrorgrid"), c = document.querySelector(".spark.live .mcell").getBoundingClientRect(), card = document.querySelector(".spark.live").getBoundingClientRect(), r = g.getBoundingClientRect();
    return { cells: document.querySelectorAll(".spark.live .mcell").length, w: c.width, inside: r.left >= card.left && r.right <= card.right, overflow: document.documentElement.scrollWidth > innerWidth }; });
  check(mg.cells === 49 && mg.w >= 36 && mg.inside && !mg.overflow, `${engine} 375×667 Tricky Mirror Garden fits (${mg.cells} cells, ${mg.w.toFixed(0)}px)`);
  for (const [c, t] of Object.entries(await page.evaluate(() => mirrorModel(day).solution))) {
    for (let k = 0; k < (t === "/" ? 1 : 2); k++) await page.locator(`.spark.live [data-mc="${c}"]`).tap();
  }
  await page.waitForTimeout(300);
  check(await page.evaluate(() => state(10).done && state(10).v2 === 1), `${engine} Mirror Garden solves by tap`);
  await page.setViewportSize(vp); await fresh(0); await goTo(13);
  const ladderNextWord = () => page.evaluate(() => { const m = ladderModel(day), s = state(13); return ladderNext(s.steps.at(-1), m.end); });
  for (const ch of await ladderNextWord()) await page.locator(`.spark.live .keys [data-key="${ch}"]`).tap();
  check(await page.locator(".spark.live .ladsubmit.ready").count() === 1, `${engine} ladder Submit lights up at 5 letters`);
  await page.locator(".spark.live .ladsubmit").tap();
  check(await page.evaluate(() => state(13).steps.length) === 2, `${engine} ladder Submit word tap adds a step`);
  const w2 = await ladderNextWord();
  if (w2 && !(await page.evaluate(() => state(13).done))) {
    await page.keyboard.type(w2.toLowerCase()); await page.keyboard.press("Enter");
    check(await page.evaluate(() => state(13).steps.length) === 3, `${engine} ladder Enter key still submits`);
  }
  // Leaderboard against a mocked Supabase (route interception): name, offline queue, sync, tabs, same-name join.
  const calls = [];
  let offline = false, fkOnce = false;
  const DEV = "11111111-1111-4111-8111-111111111111";
  await page.route("**/leaderboard-config.js*", (r) => r.fulfill({ contentType: "text/javascript", body: 'const SUPABASE_URL = "https://lb.test"; const SUPABASE_ANON_KEY = "sb_publishable_test";' }));
  await page.route("https://lb.test/**", async (r) => {
    if (offline) return r.abort("internetdisconnected");
    const fn = r.request().url().split("/rpc/")[1], body = JSON.parse(r.request().postData() || "{}");
    calls.push({ fn, body, auth: r.request().headers().authorization, apikey: r.request().headers().apikey });
    if (fn === "record_solve" && fkOnce) { fkOnce = false; return r.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ code: "23503", message: 'insert or update on table "solves" violates foreign key constraint "solves_player_id_fkey"' }) }); }
    // Same name = same player: "Devansh" already exists (any case, any spaces).
    if (fn === "join_or_create") return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([body.p_name.replace(/\s/g, "").toLowerCase() === "devansh" ? { id: DEV, name: "Devansh" } : { id: body.p_from, name: body.p_name }]) });
    const json = fn === "leaderboard" ? [{ rank: 1, name: "Asha <b>", points: 9, is_me: false }, { rank: 2, name: "Nidhi", points: 1, is_me: true }] : fn === "record_solve" ? 1 : null;
    return r.fulfill({ status: json === null ? 204 : 200, contentType: "application/json", body: json === null ? "" : JSON.stringify(json) });
  });
  await fresh(0);
  const lbStore = () => page.evaluate(() => JSON.parse(localStorage.getItem("little-sparks-leaderboard-v1") || "{}"));
  check(await page.locator("#lbPill").isVisible(), `${engine} 🏆 shown with config`);
  check(await page.evaluate(() => { const r = document.querySelector("#lbPill").getBoundingClientRect(); return document.documentElement.scrollWidth <= innerWidth && r.right <= innerWidth && r.right > innerWidth - 80; }), `${engine} 🏆 sits top-right without overflow`);
  try { await page.waitForSelector("#nameSheet[open]", { timeout: 3000 }); } catch { check(false, `${engine} first visit asks for a name`); }
  await page.locator("#lbName").fill("   ");
  await page.locator("#lbNameForm .lbsave").tap();
  check(await page.locator("#nameSheet[open]").count() === 1 && /1 to 20/.test(await page.locator("#lbNameError").innerText()), `${engine} blank name is refused`);
  await page.locator("#lbName").fill("  Nidhi  ");
  await page.locator("#lbNameForm .lbsave").tap();
  await page.waitForTimeout(300);
  check(calls.some((c) => c.fn === "join_or_create" && c.body.p_name === "Nidhi" && c.auth === undefined && c.apikey === "sb_publishable_test"), `${engine} name saved to Supabase (trimmed; publishable key only in apikey, no Bearer)`);
  offline = true;
  await solvePocket();
  const reveal = await page.evaluate(() => feedOrder()[2]);
  await goTo(reveal);
  await page.locator(".spark.live .revealbtn").tap();
  await page.locator(".spark.live [data-yes]").tap();
  await page.waitForTimeout(300);
  const queued = (await lbStore()).queue || [];
  check(queued.length === 1 && queued[0].lv === 0 && queued[0].g === 1 && queued[0].p === 1, `${engine} offline solve queued once (Gentle = 1 point), reveal gives none`, JSON.stringify(queued));
  offline = false;
  await page.locator("#lbPill").tap();
  await page.waitForSelector("#lbList li.me", { timeout: 4000 }).catch(() => {});
  check(calls.filter((c) => c.fn === "record_solve").length === 1 && calls.some((c) => c.fn === "record_solve" && c.body.p_level === 0 && c.body.p_game === 1), `${engine} queued solve syncs once when back online`, JSON.stringify(calls.map((c) => c.fn + ":" + JSON.stringify(c.body))) + " open=" + await page.evaluate(() => [...document.querySelectorAll("dialog[open]")].map((d) => d.id)));
  check(((await lbStore()).queue || []).length === 0, `${engine} queue empties after sync`);
  check(/Nidhi/.test(await page.locator("#lbList li.me").innerText().catch(() => "")) && (await page.locator("#lbList").innerHTML()).includes("Asha &lt;b&gt;"), `${engine} board highlights you and escapes names`);
  await page.locator('#lbTabs [data-period="week"]').tap();
  await page.waitForTimeout(300);
  check(calls.at(-1)?.fn === "leaderboard" && calls.at(-1).body.p_period === "week" && (await page.getAttribute('#lbTabs [data-period="week"]', "aria-selected")) === "true", `${engine} Week tab loads the weekly board`);
  await page.locator("#lbSheet [data-close]").tap();
  // Catch-up + recovery: a Tricky solve saved by a feed that never reported it, and a player row
  // deleted on the server (FK error) → re-create the player and still record the solve, once.
  const tricky = await page.evaluate(() => feedOrder(2)[1]);
  await page.evaluate((g) => {
    const d = today(), lb = JSON.parse(localStorage.getItem("little-sparks-leaderboard-v1"));
    localStorage.setItem("little-sparks-leaderboard-v1", JSON.stringify({ ...lb, queue: [] }));
    const p = JSON.parse(localStorage.getItem("little-sparks-v1") || "{}");
    p[d + "-level-2"] = { games: { [g]: { done: true }, [feedOrder(2)[2]]: { done: true, revealed: 1 } } };
    localStorage.setItem("little-sparks-v1", JSON.stringify(p));
  }, tricky);
  calls.length = 0;
  fkOnce = true;
  await page.reload();
  await page.waitForSelector(".spark.live .stage");
  await page.waitForTimeout(800);
  const seq = calls.map((c) => c.fn + (c.fn === "record_solve" ? `:${c.body.p_level}/${c.body.p_game}` : "")).join(",");
  check(seq === `record_solve:2/${tricky},join_or_create,record_solve:2/${tricky}`, `${engine} unsent Tricky solve is caught up; deleted player is re-created and the solve retried (revealed card skipped)`, seq);
  check(((await lbStore()).queue || []).length === 0, `${engine} catch-up queue drains`);
  await page.reload();
  await page.waitForSelector(".spark.live .stage");
  await page.waitForTimeout(500);
  check(!calls.slice(3).some((c) => c.fn === "record_solve"), `${engine} caught-up solve is never sent twice`);
  // Same name on another device joins that player: the id switches, queue and sent carry over.
  const myId = (await lbStore()).id;
  await page.locator("#lbPill").tap();
  await page.locator("#lbEdit").tap();
  check(/Same name on another device\? You'll share one score\./.test(await page.locator("#nameSheet").innerText()) && (await page.locator("#lbSync, #lbLinkForm, #lbCodeIn").count()) === 0, `${engine} name sheet explains shared names; no sync-code UI`);
  check(await page.evaluate(() => { const r = document.querySelector("#lbName").getBoundingClientRect(), b = document.querySelector("#lbNameForm .lbsave").getBoundingClientRect(); return r.height >= 44 && b.height >= 44 && getComputedStyle(document.querySelector("#lbName")).fontSize === "16px"; }), `${engine} name field is touch-friendly`);
  const pend = await page.evaluate(() => feedOrder(0)[5]);
  offline = true;
  await page.evaluate((g) => lbSolved(istDate(), 0, g), pend);
  await page.waitForTimeout(200);
  offline = false;
  await page.locator("#lbName").fill(" de VANSH ");
  await page.locator("#lbNameForm .lbsave").tap();
  await page.waitForTimeout(500);
  const joined = await lbStore();
  check(joined.id === DEV && joined.name === "Devansh" && joined.synced && (await page.locator("#nameSheet[open]").count()) === 0 && calls.some((c) => c.fn === "join_or_create" && c.body.p_from === myId && c.body.p_name === "de VANSH"), `${engine} same name (any case/spaces) joins the existing player`);
  check(/Welcome back, Devansh/.test(await page.locator(".toast").last().innerText().catch(() => "")), `${engine} welcome-back toast`);
  check(calls.some((c) => c.fn === "record_solve" && c.body.p_player === DEV && c.body.p_game === pend) && (joined.queue || []).length === 0, `${engine} pending solves carry over to the joined player`);
  await page.locator("#lbSheet [data-close]").tap().catch(() => {});
  // A device stuck in the old sync-code "taken" state recovers on load with no steps.
  calls.length = 0;
  await page.evaluate(() => { const lb = JSON.parse(localStorage.getItem("little-sparks-leaderboard-v1")); localStorage.setItem("little-sparks-leaderboard-v1", JSON.stringify({ ...lb, id: "22222222-2222-4222-8222-222222222222", name: "Devansh", synced: false, taken: true })); });
  await page.reload();
  await page.waitForSelector(".spark.live .stage");
  await page.waitForTimeout(600);
  const healed = await lbStore();
  check(healed.id === DEV && healed.synced && !("taken" in healed) && (await page.locator("dialog[open]").count()) === 0, `${engine} old "name taken" device rejoins automatically on load`);
  await page.unroute("**/leaderboard-config.js*");
  await page.unroute("https://lb.test/**");
  check(errors.length === 0, `${engine} no page errors`, errors.slice(0, 3).join(" | "));
  if (failures > before) await shot("last-state");
  summary.push(`${engine}: ${cards} cards checked at 3 levels, ${failures - before ? `${failures - before} problem(s)` : "ok"}`);
  await browser.close();
}
server.close();
console.log([...summary, ...lines].join("\n"));
console.log(failures ? `SMOKE FAIL: ${failures} problem(s) · screenshots in tests/shots/` : "SMOKE PASS");
process.exit(failures ? 1 : 0);
