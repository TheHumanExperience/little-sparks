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
  // Always opens the card fresh. If it's already live (the day's warm-up opener is live on load), step to the
  // next card first, so a model a test pinned after load (e.g. Matchsticks in AHA_CACHE) is actually drawn.
  const goTo = async (idx) => {
    if (await page.evaluate((i) => +document.querySelector(".spark.live")?.dataset.idx === i, idx)) {
      await page.evaluate(() => { const c = document.querySelector(".spark.live").nextElementSibling; feed.scrollTo(0, c.offsetTop); });
      await page.waitForFunction((i) => +document.querySelector(".spark.live")?.dataset.idx !== i, idx, { timeout: 5000 });
    }
    await page.evaluate((i) => { const c = document.querySelector(`.spark[data-day="${today()}"][data-idx="${i}"]`); feed.scrollTo(0, c.offsetTop); }, idx);
    await page.waitForSelector(`.spark.live[data-idx="${idx}"] .stage #board`, { timeout: 5000 });
  };
  let cards = 0;
  await page.goto(PAGE);
  // Her very first open (nothing saved): straight to a card, no sheet, and no zeros on the note.
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector(".spark.live .stage");
  await page.waitForTimeout(900);
  const first = await page.evaluate(() => ({ modal: document.querySelectorAll("dialog[open]").length, note: document.querySelector(".notecard")?.innerText || "" }));
  check(first.modal === 0, `${engine} first open has no sheet`);
  check(!/\b0\b|streak/.test(first.note) && /today’s note/i.test(first.note) && /For every mom doing the thinking for two/.test(first.note) && !/Devansh/.test(first.note), `${engine} note card shows no zeros before any play`, first.note);
  for (const lv of [0, 1, 2]) {
    await fresh(lv);
    check(await page.evaluate((l) => difficulty === l, lv), `${engine} L${lv} level applied`);
    const order = await page.evaluate(() => feedOrder());
    const shown = await page.evaluate(() => document.querySelectorAll(`.spark[data-day="${today()}"]`).length);
    check(shown === order.length, `${engine} L${lv} today shows ${order.length} cards`, `got ${shown}`);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${engine} L${lv} no page overflow`);
    const pill = await page.evaluate(() => document.querySelector("#todayPill").textContent.trim());
    check(/^Today · 0\/\d+$/.test(pill), `${engine} L${lv} header shows today's count, no reveals`, pill);
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
    check(/· 0\//.test(await page.evaluate(() => document.querySelector("#todayPill").textContent)), `${engine} L${lv} reveals leave the header count at 0`);
    if (lv) {
      // Reveals left now live in the Reveal confirm, and drop after a reveal.
      await goTo(order[1]);
      await page.locator(".spark.live .revealbtn").tap();
      const ask = await page.locator(".spark.live").innerText();
      check(ask.includes(`${[0, 4, 2][lv]} reveal${lv === 2 ? "s" : "s"} left today`), `${engine} L${lv} Reveal confirm shows reveals left`, ask.slice(-160));
      await page.locator(".spark.live [data-no]").tap();
    }
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
  // A solved card's Next skips solved cards; the day sheet jumps to the next unsolved one.
  check((await page.locator(".spark.live .nextspark").innerText()).includes("Next to play"), `${engine} solved card offers Next to play`);
  // Use today's dated order (the warm-up opener moves cards around), starting one before the live card.
  const order = await page.evaluate(() => { const o = feedOrder(difficulty, today()), k = o.indexOf(+document.querySelector(".spark.live").dataset.idx); all[progressKey(today())].games[o[k + 1]] = { done: true }; persist(); return o.slice(k - 1); });
  await page.locator(".spark.live .nextspark").tap();
  await page.waitForSelector(`.spark.live[data-idx="${order[3]}"]`, { timeout: 5000 }).catch(() => {});
  check(await page.evaluate((i) => +document.querySelector(".spark.live")?.dataset.idx === i, order[3]), `${engine} Next unsolved skips a solved card`);
  await page.locator("#todayPill").tap();
  check((await page.locator("#nextUnsolved .btn").innerText()).includes("Next puzzle to play"), `${engine} day sheet offers the next puzzle to play`);
  await page.locator("#nextUnsolved .btn").tap();
  await page.waitForSelector(`.spark.live[data-idx="${order[4]}"]`, { timeout: 5000 }).catch(() => {});
  check(await page.evaluate((i) => +document.querySelector(".spark.live")?.dataset.idx === i && !document.querySelector("#daysSheet").open, order[4]), `${engine} day sheet jumps to the next unsolved card`, await page.evaluate(() => [document.querySelector(".spark.live")?.dataset.idx, document.querySelector("#daysSheet").open, document.querySelector("#nameSheet")?.open]).then(JSON.stringify));
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
  // Lantern Lanes on Tricky (7 × 7): 44px squares on an iPhone SE; tap cycles bulb → dot → empty, long press drops a dot.
  await fresh(2); await goTo(22);
  const ll = await page.evaluate(() => { const c = document.querySelector(".spark.live .lcell").getBoundingClientRect(), g = document.querySelector(".spark.live .lantgrid").getBoundingClientRect(), card = document.querySelector(".spark.live").getBoundingClientRect();
    return { w: c.width, h: c.height, inside: g.left >= card.left && g.right <= card.right, overflow: document.documentElement.scrollWidth > innerWidth }; });
  check(ll.w >= 44 && ll.h >= 44 && ll.inside && !ll.overflow, `${engine} 375×667 Tricky Lantern Lanes squares ${ll.w.toFixed(0)}px, fits`);
  const firstCell = page.locator(".spark.live .lcell").first(), lc = await firstCell.getAttribute("data-lc");
  await firstCell.tap(); check(await page.evaluate((c) => state(22).bulbs.includes(+c), lc), `${engine} lantern tap places a bulb`);
  await page.locator(`.spark.live [data-lc="${lc}"]`).tap(); check(await page.evaluate((c) => !state(22).bulbs.includes(+c) && state(22).dots.includes(+c), lc), `${engine} lantern second tap leaves a dot`);
  await page.locator(`.spark.live [data-lc="${lc}"]`).tap(); check(await page.evaluate((c) => !state(22).dots.includes(+c), lc), `${engine} lantern third tap clears`);
  const box = await page.locator(`.spark.live [data-lc="${lc}"]`).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.waitForTimeout(650); await page.mouse.up();
  await page.waitForTimeout(100);
  check(await page.evaluate((c) => state(22).dots.includes(+c) && !state(22).bulbs.includes(+c), lc), `${engine} lantern long press drops a dot`);
  await page.setViewportSize(vp); await fresh(1); await goTo(22);
  check(await page.locator(".spark.live #rules .lanstep").count() === 3 && /not diagonals/.test(await page.locator(".spark.live #rules").innerText()), `${engine} lantern How to play has the 3 steps`);
  const lsol = await page.evaluate(() => lanternModel(day).solution);
  for (const c of lsol.slice(0, -1)) await page.locator(`.spark.live [data-lc="${c}"]`).tap();
  check(await page.evaluate(() => !state(22).done), `${engine} lantern not solved early`);
  await page.locator(`.spark.live [data-lc="${lsol.at(-1)}"]`).tap(); await page.waitForTimeout(300);
  check(await page.evaluate(() => state(22).done && !state(22).revealed), `${engine} Lantern Lanes solves itself by tap`);
  // Garden Beds on Tricky (7 × 7): 44px squares on an iPhone SE; drag corner to corner, the feed stays put, tap clears.
  await page.setViewportSize({ width: 375, height: 667 }); await fresh(2); await goTo(23);
  const gb = await page.evaluate(() => { const c = document.querySelector(".spark.live .bcell").getBoundingClientRect(), g = document.querySelector(".spark.live .bedgrid"), r = g.getBoundingClientRect(), card = document.querySelector(".spark.live").getBoundingClientRect();
    return { w: c.width, h: c.height, inside: r.left >= card.left && r.right <= card.right, overflow: document.documentElement.scrollWidth > innerWidth, ta: getComputedStyle(g).touchAction }; });
  check(gb.w >= 44 && gb.h >= 44 && gb.inside && !gb.overflow && gb.ta === "none", `${engine} 375×667 Tricky Garden Beds squares ${gb.w.toFixed(0)}px, fits, touch-action none`);
  const bedDrag = async (a, b) => {
    await page.locator(`.spark.live [data-bc="${b}"]`).scrollIntoViewIfNeeded(); await page.locator(`.spark.live [data-bc="${a}"]`).scrollIntoViewIfNeeded();
    const p = await page.locator(`.spark.live [data-bc="${a}"]`).boundingBox(), q = await page.locator(`.spark.live [data-bc="${b}"]`).boundingBox();
    await page.mouse.move(p.x + p.width / 2, p.y + p.height / 2); await page.mouse.down();
    await page.mouse.move(q.x + q.width / 2, q.y + q.height / 2, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(80);
  };
  const scroller = await page.evaluate(() => feed.scrollTop);
  await bedDrag(0, 8);
  check(await page.evaluate(() => JSON.stringify(state(23).beds) === "[[0,0,2,2]]"), `${engine} beds drag marks a 2 × 2 bed`);
  check(await page.evaluate((y) => (feed.scrollTop) === y, scroller), `${engine} beds drag doesn't scroll the feed`);
  await bedDrag(1, 2);
  check(await page.evaluate(() => JSON.stringify(state(23).beds) === "[[0,1,1,2]]"), `${engine} an overlapping drag replaces the old bed`);
  check(await page.evaluate(() => { const m = bedsModel(day), ok = bedsCheck(m, state(23).beds).verdict[0]; return document.querySelectorAll(".spark.live .bed." + (ok ? "ok" : "bad")).length === 1; }), `${engine} bed shows its verdict`);
  await page.locator('.spark.live [data-bc="2"]').tap(); await page.waitForTimeout(80);
  check(await page.evaluate(() => state(23).beds.length === 0), `${engine} tapping a bed clears it`);
  await page.setViewportSize(vp); await fresh(1); await goTo(23);
  check(/seed packet/.test(await page.locator(".spark.live #rules").innerText()) && await page.locator(".spark.live #rules .bmini").count() === 2, `${engine} beds How to play has the sentence and the 3 × 3 example`);
  const rects = await page.evaluate(() => bedsModel(day).rects), bn = await page.evaluate(() => bedsModel(day).n);
  for (const [k, [y, x, h, w]] of rects.entries()) {
    if (k === rects.length - 1) check(await page.evaluate(() => !state(23).done), `${engine} beds not solved early`);
    const a = y * bn + x, b = (y + h - 1) * bn + x + w - 1;
    if (a === b) { await page.locator(`.spark.live [data-bc="${a}"]`).tap(); await page.waitForTimeout(60); } else await bedDrag(a, b);
  }
  await page.waitForTimeout(300);
  check(await page.evaluate(() => state(23).done && !state(23).revealed), `${engine} Garden Beds solves itself by drag` + (await page.evaluate(() => state(23).done ? "" : " " + JSON.stringify(state(23).beds) + " want " + JSON.stringify(bedsModel(day).rects))));
  // Where in the World (Medium, iPhone SE): four tappable countries, continent hint, a miss fades, the answer solves and counts.
  await page.setViewportSize({ width: 375, height: 667 }); await fresh(1); await goTo(24);
  const wf = await page.evaluate(() => { const card = document.querySelector(".spark.live").getBoundingClientRect(), opts = [...document.querySelectorAll(".spark.live .placeopt")];
    return { n: opts.length, minH: Math.min(...opts.map((o) => o.getBoundingClientRect().height)), inside: opts.every((o) => { const r = o.getBoundingClientRect(); return r.left >= card.left && r.right <= card.right; }), overflow: document.documentElement.scrollWidth > innerWidth }; });
  check(wf.n === 4 && wf.minH >= 44 && wf.inside && !wf.overflow, `${engine} Where in the World shows four 44px countries inside the card ` + JSON.stringify(wf));
  await page.locator(".spark.live .stage button", { hasText: "A gentle hint" }).tap();
  check(/It's in /.test(await page.locator(".spark.live #feedback").innerText()), `${engine} first place hint names the continent`);
  const wp = await page.evaluate(() => { const m = savedPlace(day, state(24)); return { right: m.place.country, wrong: m.options.filter((c) => c !== m.place.country) }; });
  await page.locator(`.spark.live [data-place="${wp.wrong[0]}"]`).tap();
  check(await page.evaluate((c) => { const b = document.querySelector(`.spark.live [data-place="${c}"]`); return b.classList.contains("ruled") && b.disabled && !state(24).done; }, wp.wrong[0]), `${engine} a wrong country fades and doesn't solve`);
  await page.locator(`.spark.live [data-place="${wp.right}"]`).tap(); await page.waitForTimeout(300);
  check(await page.evaluate(() => state(24).done && !state(24).revealed && feedDone(day, 24)), `${engine} the right country solves Where in the World`);
  check(/(^|[\s·])1\/20\b/.test(await page.locator("#todayPill").innerText()), `${engine} the place solve is counted`);
  // Tricky: two misses end the round as missed, which never counts.
  await fresh(2); await goTo(24);
  const wt = await page.evaluate(() => { const m = savedPlace(day, state(24)); return m.options.filter((c) => c !== m.place.country); });
  for (const c of wt.slice(0, 2)) { await page.locator(`.spark.live [data-place="${c}"]`).tap(); await page.waitForTimeout(150); }
  check(await page.evaluate(() => state(24).done && state(24).missed && state(24).revealed && !feedDone(day, 24)), `${engine} two misses on Tricky end the round without counting`);
  check(/(^|[\s·])0\/20\b/.test(await page.locator("#todayPill").innerText()), `${engine} a missed place round isn't counted`);
  // Code Garden (26) shows only from NEW_GAMES_FROM, so it gets its own page whose clock starts on that day
  // (an init script shifts Date; today is kept if it is later). Tricky on an iPhone SE: one wrong check, then solve by touch.
  {
    const from = (await readFile(join(root, "daily-content.js"), "utf8")).match(/NEW_GAMES_FROM\s*=\s*'(\d{4}-\d{2}-\d{2})'/)[1];
    const cg = await (await browser.newContext(ctxOpts)).newPage();
    await cg.addInitScript((d) => {
      const Real = Date, shift = new Real(d + "T12:00:00").getTime() - Real.now();
      if (shift > 0) globalThis.Date = class extends Real { constructor(...a) { super(...(a.length ? a : [Real.now() + shift])); } static now() { return Real.now() + shift; } };
    }, from);
    await cg.route("**/leaderboard-config.js*", (r) => r.fulfill({ contentType: "text/javascript", body: 'const SUPABASE_URL = ""; const SUPABASE_ANON_KEY = "";' }));
    cg.on("pageerror", (e) => errors.push("code garden page: " + e.message));
    await cg.setViewportSize({ width: 375, height: 667 });
    await cg.goto(PAGE);
    const open = async (lv) => {
      await cg.evaluate((l) => { localStorage.clear(); localStorage.setItem("little-sparks-difficulty", String(l)); }, lv);
      await cg.reload(); await cg.waitForSelector(".spark.live .stage");
      await cg.evaluate(() => { const c = document.querySelector(`.spark[data-day="${today()}"][data-idx="26"]`); feed.scrollTo(0, c.offsetTop); });
      await cg.waitForSelector('.spark.live[data-idx="26"] .stage #board .cganswer', { timeout: 5000 });
    };
    const fill = async (row) => { for (const [j, k] of row.entries()) { await cg.locator(`.spark.live [data-cs="${j}"]`).tap(); await cg.locator(`.spark.live [data-ck="${k}"]`).tap(); } };
    try {
      await open(2);
      const lay = await cg.evaluate(() => { const card = document.querySelector(".spark.live").getBoundingClientRect(), btns = [...document.querySelectorAll(".spark.live .cgslot, .spark.live .cgpick")];
        return { n: btns.length, minH: Math.min(...btns.map((b) => b.getBoundingClientRect().height)), minW: Math.min(...btns.map((b) => b.getBoundingClientRect().width)), inside: btns.every((b) => { const r = b.getBoundingClientRect(); return r.left >= card.left && r.right <= card.right; }), overflow: document.documentElement.scrollWidth > innerWidth }; });
      check(lay.n === 10 && lay.minH >= 44 && lay.minW >= 44 && lay.inside && !lay.overflow, `${engine} 375×667 Tricky Code Garden: 4 spots and 6 flowers, 44px, inside the card`, JSON.stringify(lay));
      const m = await cg.evaluate(() => { const m = codeModel(day); return { code: m.code, kinds: m.kinds, rows: m.rows.length }; });
      await fill(m.code.map((k, j) => (j ? k : (k + 1) % m.kinds)));
      await cg.locator(".spark.live #actions .btn", { hasText: "Check" }).tap(); await cg.waitForTimeout(100);
      const after = await cg.evaluate(() => ({ s: state(26), rows: document.querySelectorAll(".spark.live .cgrow").length, fb: document.querySelector(".spark.live #feedback").textContent }));
      check(!after.s.done && after.s.guesses.length === 1 && after.rows === m.rows + 1 && /right spot|wrong spot|no right/.test(after.fb), `${engine} a wrong Code Garden check becomes a clue row`, JSON.stringify(after));
      await fill(m.code);
      await cg.locator(".spark.live #actions .btn", { hasText: "Check" }).tap(); await cg.waitForTimeout(300);
      check(await cg.evaluate(() => state(26).done && !state(26).revealed && feedDone(day, 26) && state(26).guesses.length === 2), `${engine} Code Garden solves by touch after one wrong check`);
      await open(1);
      await cg.locator(".spark.live .revealbtn").tap(); await cg.locator(".spark.live [data-yes]").tap(); await cg.waitForTimeout(200);
      check(await cg.evaluate(() => state(26).revealed === 1 && !feedDone(day, 26) && /Why not/.test(document.querySelector(".spark.live .cgwhy")?.textContent || "")), `${engine} Code Garden reveal shows the code and why, and doesn't count`);
    } catch (e) { check(false, `${engine} Code Garden on the cutover day`, e.message.split("\n")[0]); }
    if (SHOTS) await cg.screenshot({ path: join(shotsDir, `${engine}-codegarden.png`) }).catch(() => {});
    await cg.context().close();
  }
  // Matchsticks (Medium, iPhone SE): no options, a typed equation that fits, rejects a wrong one and accepts any spacing/signs.
  await page.setViewportSize({ width: 375, height: 667 }); await fresh(1);
  const ms = await page.evaluate(() => { const cat = AHA_CATS.findIndex((c) => c.id === "matchsticks"), d = today(), m = { cat, ...AHA_GEN[cat](rng(puzzleSeed(d) + "|smoke"), 1) };
    AHA_CACHE.set(`${puzzleSeed(d)}|0|${ahaRotation(d)}`, m); return { idx: AHA_SLOTS[0], a: m.a, s: m.data.s }; });
  await goTo(ms.idx);
  const mf = await page.evaluate(() => { const inp = document.querySelector(".spark.live #ahaInput"), r = inp.getBoundingClientRect(), card = document.querySelector(".spark.live").getBoundingClientRect(), svg = document.querySelector(".spark.live .matchsvg").getBoundingClientRect();
    return { choices: document.querySelectorAll(".spark.live [data-aha]").length, fs: parseFloat(getComputedStyle(inp).fontSize), h: r.height, inside: r.left >= card.left && r.right <= card.right && svg.right <= card.right, overflow: document.documentElement.scrollWidth > innerWidth, ph: inp.placeholder }; });
  check(mf.choices === 0 && mf.fs >= 16 && mf.h >= 44 && mf.inside && !mf.overflow && /=/.test(mf.ph), `${engine} 375×667 Matchsticks is a typed equation that fits`, JSON.stringify(mf));
  await page.locator(".spark.live #ahaInput").tap(); await page.keyboard.type(ms.s); await page.keyboard.press("Enter");
  check(await page.evaluate((i) => !state(i).done, ms.idx), `${engine} Matchsticks rejects the untouched equation`);
  await page.locator(".spark.live #ahaInput").fill(" " + ms.a.replace(/−/g, "-").replace(/ /g, "") + " "); await page.locator(".spark.live #ahaInput").press("Enter");
  await page.waitForTimeout(200);
  check(await page.evaluate((i) => state(i).done && !state(i).revealed, ms.idx), `${engine} Matchsticks solves by typing ${ms.a}`);
  // Who Knows? (iPhone SE): NEW_GAMES_FROM is rewritten to today so the Aha block uses rotation 3. The first level whose
  // block shows Who Knows? today is used; if none does, its question is pinned to slot 0 like Matchsticks above.
  const cutover = await page.evaluate(() => today());
  await page.route("**/daily-content.js*", async (r) => { const res = await r.fetch(); await r.fulfill({ response: res, body: (await res.text()).replace(/const NEW_GAMES_FROM='[^']*'/, `const NEW_GAMES_FROM='${cutover}'`) }); });
  let wk = null;
  for (const lv of [0, 1, 2]) {
    await fresh(lv);
    wk = await page.evaluate((last) => { const cat = AHA_CATS.findIndex((c) => c.id === "knows"), d = today(); let slot = ahaCategories(d).indexOf(cat);
      if (slot < 0 && !last) return null;
      if (slot < 0) { slot = 0; AHA_CACHE.set(`${puzzleSeed(d)}|0|${ahaRotation(d)}`, { cat, ...AHA_GEN[cat](rng(puzzleSeed(d) + "|smoke"), difficulty), kind: "choice" }); }
      const m = ahaModel(d, slot); return { rot: ahaRotation(d), idx: AHA_SLOTS[slot], k: m.options.indexOf(m.a), n: m.options.length, lines: m.clues.length }; }, lv === 2);
    if (wk) break;
  }
  check(wk.rot === 3, `${engine} NEW_GAMES_FROM switches the Aha block to rotation 3`);
  await goTo(wk.idx);
  const kf = await page.evaluate(() => { const card = document.querySelector(".spark.live").getBoundingClientRect(), opts = [...document.querySelectorAll(".spark.live [data-aha]")];
    return { n: opts.length, lines: document.querySelectorAll(".spark.live .ahaclues li").length, rows: document.querySelectorAll(".spark.live .ahatable tbody tr").length, minH: Math.min(...opts.map((o) => o.getBoundingClientRect().height)), inside: opts.every((o) => { const r = o.getBoundingClientRect(); return r.left >= card.left && r.right <= card.right; }), overflow: document.documentElement.scrollWidth > innerWidth }; });
  check(kf.n === wk.n && kf.lines === wk.lines && kf.rows >= 3 && kf.minH >= 44 && kf.inside && !kf.overflow, `${engine} 375×667 Who Knows? shows the list, the dialogue and every candidate as a 44px button`, JSON.stringify(kf));
  await page.locator(`.spark.live [data-aha="${wk.k}"]`).tap();
  await page.locator(".spark.live .stage button", { hasText: "Check my answer" }).tap(); await page.waitForTimeout(200);
  check(await page.evaluate((i) => state(i).done && !state(i).revealed && state(i).aha === 3, wk.idx), `${engine} Who Knows? solves by tapping the answer and saves aha: 3`);
  await page.unroute("**/daily-content.js*");
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
  // Last Petal (25). NEW_GAMES_FROM may still be a far-future placeholder, so this runs in its own context whose
  // init script moves the cutover to today, the moment feed.js looks for #feed (after its FEED_SINCE/FEED_UNTIL
  // exist, before the first card is drawn), the way verify-feed.cjs moves it with a test date.
  {
    const ctx = await browser.newContext(ctxOpts), pp = await ctx.newPage();
    await ctx.route("**/leaderboard-config.js*", (r) => r.fulfill({ contentType: "text/javascript", body: 'const SUPABASE_URL = ""; const SUPABASE_ANON_KEY = "";' }));
    await ctx.route("https://*.supabase.co/**", (r) => r.abort());
    await ctx.addInitScript(() => {
      const get = Document.prototype.getElementById;
      Document.prototype.getElementById = function (id) {
        if (id === "feed" && !window.petalCutover) try { FEED_UNTIL[5] = FEED_SINCE[25] = today(); window.petalCutover = 1; } catch {}
        return get.call(this, id);
      };
    });
    pp.on("pageerror", (e) => errors.push(e.message));
    const openPetal = async (lv) => {
      await pp.goto(PAGE);
      await pp.evaluate((l) => { localStorage.clear(); localStorage.setItem("little-sparks-difficulty", String(l)); }, lv);
      await pp.reload();
      await pp.waitForSelector(".spark.live .stage");
      await pp.evaluate(() => { const c = document.querySelector(`.spark[data-day="${today()}"][data-idx="25"]`); feed.scrollTo(0, c.offsetTop); });
      await pp.waitForSelector('.spark.live[data-idx="25"] .stage #board .pflower', { timeout: 5000 });
    };
    const petalGame = () => pp.evaluate(() => { const m = petalModel(day), s = state(25), g = petalReplay(m, s.moves); return { ...g, done: !!s.done, n: s.moves.length, tries: s.tries, win: petalWinningMoves(g.pos, m.rules), give: petalMoves(g.pos, m.rules).find((mv) => petalWins(petalAfter(g.pos, mv), m.rules)) }; });
    // One move by touch: tap the flower, then its Take button; then wait for the bee's beat to pass.
    const petalMove = async ([f, t]) => {
      await pp.locator(`.spark.live [data-pf="${f}"]`).tap();
      await pp.locator(`.spark.live [data-pt="${t}"]`).tap();
      await pp.waitForFunction(() => { const s = state(25), g = petalReplay(petalModel(day), s.moves); return s.done || g.over || g.turn === 0; }, null, { timeout: 4000 });
      await pp.waitForTimeout(50);
    };
    try {
      await openPetal(2);
      check(await pp.evaluate(() => feedOrder(difficulty, today()).includes(25) && !feedOrder(difficulty, today()).includes(5)), `${engine} Last Petal takes Time Lens's slot from the cutover`);
      const pf = await pp.evaluate(() => { const card = document.querySelector(".spark.live").getBoundingClientRect(), els = [...document.querySelectorAll(".spark.live .pflower")];
        return { flowers: els.length, inside: els.every((e) => { const r = e.getBoundingClientRect(); return r.left >= card.left && r.right <= card.right; }), overflow: document.documentElement.scrollWidth > innerWidth, rules: document.querySelector(".spark.live #rules").textContent }; });
      check(pf.flowers >= 2 && pf.inside && !pf.overflow && /you go first/.test(pf.rules), `${engine} Tricky Last Petal flowers fit the card`, JSON.stringify(pf));
      let g = await petalGame(), guard = 0;
      await pp.locator(`.spark.live [data-pf="${g.win[0][0]}"]`).tap();
      const takeH = await pp.evaluate(() => Math.min(...[...document.querySelectorAll(".spark.live .ptake")].map((b) => b.getBoundingClientRect().height)));
      check(takeH >= 44, `${engine} Last Petal take buttons are 44px`, String(takeH));
      while (!g.done && !g.over && guard++ < 40) { await petalMove(g.win[0]); g = await petalGame(); }
      check(g.done && await pp.evaluate(() => !state(25).revealed && feedDone(today(), 25)), `${engine} Last Petal wins by touch with the solver's moves`, JSON.stringify(g));
      check(await pp.locator(".spark.live .donebadge:not([hidden])").count() === 1, `${engine} Last Petal shows the solved badge`);
      // Gentle: a hint highlights a move; then hand the bee the game, lose, and Try again restarts with nothing counted.
      await openPetal(0);
      await pp.locator(".spark.live .stage button", { hasText: "Hint: show me a winning move" }).tap();
      check(await pp.locator(".spark.live .ptake.hinted").count() === 1 && /^Try taking/.test(await pp.locator(".spark.live #feedback").innerText()), `${engine} Last Petal hint highlights a winning move`);
      g = await petalGame(); guard = 0;
      while (!g.over && guard++ < 40) { await petalMove(g.give || g.win[0]); g = await petalGame(); }
      check(g.over && !g.won && !g.done && /The bee took the last petal\. Try again/.test(await pp.locator(".spark.live #feedback").innerText()), `${engine} Last Petal loss is gentle`, JSON.stringify(g));
      await pp.locator(".spark.live #actions button", { hasText: "Try again" }).tap();
      g = await petalGame();
      check(g.n === 0 && g.tries === 1 && !g.done && !(await pp.evaluate(() => feedDone(today(), 25))) && await pp.locator(".spark.live .ptake").count() === 3, `${engine} Last Petal Try again restarts from the day's start`, JSON.stringify(g));
    } catch (e) { check(false, `${engine} Last Petal by touch`, e.message.split("\n")[0]); }
    if (failures > before) await pp.screenshot({ path: join(await mkdir(shotsDir, { recursive: true }).then(() => shotsDir), `${engine}-petal.png`) }).catch(() => {});
    await ctx.close();
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
  await page.waitForTimeout(1200);
  check(await page.locator("#nameSheet[open]").count() === 0, `${engine} no name sheet on load`);
  offline = true;
  await solvePocket();
  try { await page.waitForSelector("#nameSheet[open]", { timeout: 5000 }); } catch { check(false, `${engine} first solve asks for a name`); }
  await page.locator("#lbName").fill("   ");
  await page.locator("#lbNameForm .lbsave").tap();
  check(await page.locator("#nameSheet[open]").count() === 1 && /1 to 20/.test(await page.locator("#lbNameError").innerText()), `${engine} blank name is refused`);
  await page.locator("#lbName").fill("  Nidhi  ");
  await page.locator("#lbNameForm .lbsave").tap();
  await page.waitForTimeout(300);
  check(await page.locator("#nameSheet[open]").count() === 0 && (await lbStore()).name === "Nidhi", `${engine} name kept offline (trimmed)`);
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
  check(calls.some((c) => c.fn === "join_or_create" && c.body.p_name === "Nidhi" && c.auth === undefined && c.apikey === "sb_publishable_test"), `${engine} name saved to Supabase (publishable key only in apikey, no Bearer)`);
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
