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
  await fresh(0);
  await goTo(1);
  const sol = await page.evaluate(() => sudokuModel(day).sol);
  const empties = await page.evaluate(() => [...document.querySelectorAll(".spark.live input.cell")].map((e, i) => (e.readOnly ? -1 : i)).filter((i) => i >= 0));
  for (const i of empties) { await page.locator(".spark.live input.cell").nth(i).tap(); await page.keyboard.type(String(sol[i])); }
  await page.waitForTimeout(400);
  check(await page.locator(".spark.live .donebadge:not([hidden])").count() === 1, `${engine} Pocket Sudoku solves by touch`);
  check(/·\s*1\/\d+/.test(await page.locator("#todayPill").innerText()), `${engine} header counts the solve`);
  // The brand returns to today's first card.
  await page.locator(".brand").tap();
  await page.waitForTimeout(1000);
  check(await page.evaluate(() => feed.scrollTop <= 2), `${engine} brand scrolls back to the top`);
  check(errors.length === 0, `${engine} no page errors`, errors.slice(0, 3).join(" | "));
  if (failures > before) await shot("last-state");
  summary.push(`${engine}: ${cards} cards checked at 3 levels, ${failures - before ? `${failures - before} problem(s)` : "ok"}`);
  await browser.close();
}
server.close();
console.log([...summary, ...lines].join("\n"));
console.log(failures ? `SMOKE FAIL: ${failures} problem(s) · screenshots in tests/shots/` : "SMOKE PASS");
process.exit(failures ? 1 : 0);
