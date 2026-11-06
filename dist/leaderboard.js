/* Little leaderboard (optional, Supabase). Points per first solve: Gentle 1, Medium 3, Tricky 5.
   Reveals, replays and re-solves after ↺ never call lbSolved, and each date×level×game is sent once.
   Days, weeks (Monday start) and months follow India time (Asia/Kolkata). Failed sends wait in
   localStorage and retry. Empty config → everything here stays hidden and inert. */
const LB_KEY = "little-sparks-leaderboard-v1";
const LB_POINTS = [1, 3, 5];
const lbPoints = (lv) => LB_POINTS[lv] || 0;
const istDate = (now = new Date()) => new Date(now.getTime() + 330 * 60000).toISOString().slice(0, 10);
const lbAddDays = (d, n) => { const t = new Date(d + "T00:00:00Z"); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
const lbWeekStart = (d) => lbAddDays(d, -((new Date(d + "T00:00:00Z").getUTCDay() + 6) % 7));
const lbPeriodStart = (p, d) => (p === "day" ? d : p === "week" ? lbWeekStart(d) : d.slice(0, 8) + "01");
const lbSolveKey = (d, lv, g) => `${d}|${lv}|${g}`;
const lbCleanName = (s) => String(s || "").replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, "").replace(/\s+/g, " ").trim().slice(0, 20).trim();
const lbUuid = () => (crypto.randomUUID ? crypto.randomUUID() : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)));
function lbLoad(raw) {
  let s = {};
  try { s = JSON.parse(raw || "{}") || {}; } catch {}
  return { id: s.id || lbUuid(), name: lbCleanName(s.name), synced: !!s.synced, asked: !!s.asked, taken: !!s.taken, sent: { ...(s.sent || {}) }, queue: Array.isArray(s.queue) ? s.queue.slice() : [] };
}
/* Queue one first solve. Only today's, yesterday's or tomorrow's puzzles (India time) count,
   matching the server's ±1 day rule; anything already claimed is ignored. */
function lbAward(st, d, lv, g, today) {
  const k = lbSolveKey(d, lv, g);
  if (!LB_POINTS[lv] || d < lbAddDays(today, -1) || d > lbAddDays(today, 1) || st.sent[k]) return { st, item: null };
  const item = { k, d, lv, g, p: lbPoints(lv) };
  return { st: { ...st, sent: { ...st.sent, [k]: 1 }, queue: [...st.queue, item] }, item };
}
const lbAck = (st, k) => ({ ...st, queue: st.queue.filter((q) => q.k !== k) });
/* Drop queued solves the server would now reject and forget dedupe keys older than a week. */
function lbPrune(st, today) {
  const min = lbAddDays(today, -1), old = lbAddDays(today, -7);
  return { ...st, queue: st.queue.filter((q) => q.d >= min), sent: Object.fromEntries(Object.entries(st.sent).filter(([k]) => k.slice(0, 10) >= old)) };
}
/* Catch-up: queue every real first solve saved in little-sparks-v1 (all levels) that the server
   would still accept (±1 day) and that was never sent — e.g. a solve made while an old cached
   feed.js without the hook was running. Same rule as feedDone: revealed answers never count, a ↺
   reset keeps { credit: true } for the original solve, and `sent` stops any double claim. */
const lbProgressKey = (d, lv) => (lv === 1 ? d : d + "-level-" + lv);
function lbCatchUp(st, progress, today, orderFor) {
  for (const lv of [0, 1, 2]) for (const n of [-1, 0, 1]) {
    const d = lbAddDays(today, n), games = progress?.[lbProgressKey(d, lv)]?.games || {};
    const order = orderFor ? orderFor(lv) : Object.keys(games).map(Number);
    for (const g of order) {
      const s = games[g];
      if (s && ((s.done && !s.revealed) || s.credit)) st = lbAward(st, d, lv, g, today).st;
    }
  }
  return st;
}
/* How to treat a failed record_solve: "player" = the player row is missing (FK), recreate it and
   retry; "drop" = the server will never accept this item; anything else waits and retries later. */
function lbErrorKind(status, body) {
  const code = body?.code || "", text = String(body?.message || "");
  if (code === "23503" || /foreign key|unknown player/i.test(text)) return "player";
  if (/date out of range|bad level/i.test(text) || code === "23514" || code === "22P02" || code === "22007" || code === "22008") return "drop";
  return "retry";
}
/* Sync codes: 8 Crockford base32 characters shown as XXXX-XXXX; lookalikes fold (O→0, I/L→1). */
const lbNormCode = (c) => String(c || "").toUpperCase().replace(/[^0-9A-Z]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
const lbFmtCode = (c) => { const n = lbNormCode(c); return n.length === 8 ? n.slice(0, 4) + "-" + n.slice(4) : n; };
const lbIsTaken = (body) => body?.code === "23505" || /name taken/i.test(String(body?.message || ""));
const lbEsc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

let lbSolved = () => {};
function lbInit() {
  const url = (typeof SUPABASE_URL === "string" ? SUPABASE_URL : "").trim().replace(/\/+$/, "");
  const key = (typeof SUPABASE_ANON_KEY === "string" ? SUPABASE_ANON_KEY : "").trim();
  const pill = typeof document !== "undefined" && document.querySelector?.("#lbPill");
  if (!url || !key || !pill || typeof fetch !== "function") return;
  // Guard: only run next to a feed.js that reports solves (a stale cached copy would lose points).
  if (typeof FEED_LB_HOOK === "undefined") { pill.hidden = true; return; }
  const $ = (q) => document.querySelector(q);
  let st = lbLoad(localStorage.getItem(LB_KEY));
  const save = () => { try { localStorage.setItem(LB_KEY, JSON.stringify(st)); } catch {} };
  st = lbPrune(st, istDate());
  save();
  pill.hidden = false;

  async function rpc(fn, body) {
    const headers = { apikey: key, "Content-Type": "application/json" };
    if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;
    const r = await fetch(`${url}/rest/v1/rpc/${fn}`, { method: "POST", headers, body: JSON.stringify(body) });
    if (!r.ok) {
      const e = new Error(`${fn} ${r.status}`);
      e.status = r.status;
      try { e.body = await r.json(); } catch {}
      throw e;
    }
    const t = await r.text();
    return t ? JSON.parse(t) : null;
  }
  const upsert = async () => {
    try { await rpc("upsert_player", { p_id: st.id, p_name: st.name }); }
    catch (e) { if (lbIsTaken(e.body)) { st.taken = true; st.synced = false; save(); } throw e; }
    st.synced = true;
    st.taken = false;
    save();
  };
  const catchUp = () => {
    let progress = {};
    try { progress = JSON.parse(localStorage.getItem("little-sparks-v1") || "{}") || {}; } catch {}
    const before = st.queue.length;
    st = lbCatchUp(st, progress, istDate(), typeof feedOrder === "function" ? (lv) => feedOrder(lv) : null);
    if (st.queue.length !== before) save();
  };
  let flushing = null;
  function flush() {
    if (!st.name) return Promise.resolve();
    return (flushing ||= (async () => {
      await 0; // yield first, so `finally` can't clear `flushing` before it's assigned
      try {
        st = lbPrune(st, istDate());
        if (!st.synced) await upsert();
        for (const q of st.queue.slice()) {
          const send = () => rpc("record_solve", { p_player: st.id, p_date: q.d, p_level: q.lv, p_game: q.g });
          try { await send(); }
          catch (e) {
            const kind = e.status ? lbErrorKind(e.status, e.body) : "retry";
            if (kind === "player") { st.synced = false; await upsert(); await send(); }
            else if (kind === "retry") throw e;
          }
          st = lbAck(st, q.k);
          save();
        }
      } catch { if (st.taken) promptTaken(); } finally { flushing = null; }
    })());
  }

  lbSolved = (d, lv, g) => {
    const r = lbAward(st, d, lv, g, istDate());
    if (!r.item) return 0;
    st = r.st;
    save();
    pill.classList.remove("bump");
    void pill.offsetWidth;
    pill.classList.add("bump");
    pill.setAttribute("aria-label", `Leaderboard. +${r.item.p} point${r.item.p > 1 ? "s" : ""} just now`);
    flush();
    return r.item.p;
  };

  /* Name: asked once on the first visit, editable from the leaderboard sheet. */
  const nameSheet = $("#nameSheet"), nameInput = $("#lbName"), nameForm = $("#lbNameForm"), linkForm = $("#lbLinkForm"), codeIn = $("#lbCodeIn");
  // "name" = pick a name; "link" = enter a sync code; "taken" = link, because the name is in use.
  function mode(m) {
    nameForm.hidden = m !== "name";
    linkForm.hidden = m === "name";
    $("#lbNameError").textContent = "";
    $("#lbCodeError").textContent = "";
    $("#lbLinkLead").textContent = m === "taken"
      ? `That name's taken. Is it you? Enter your sync code`
      : "Enter the sync code from your other device (🏆 → Use on another device).";
    (m === "name" ? nameInput : codeIn).focus?.();
  }
  function askName(m = "name") {
    nameInput.value = st.name;
    codeIn.value = "";
    if (!nameSheet.open) nameSheet.showModal();
    mode(m);
  }
  let promptedTaken = false;
  function promptTaken() {
    if (promptedTaken || document.querySelector("dialog[open]")) return;
    promptedTaken = true;
    askName("taken");
  }
  const after = () => { nameSheet.close(); catchUp(); flush().then(() => $("#lbSheet").open && show(current)); renderMe(); };
  nameForm.onsubmit = async (e) => {
    e.preventDefault();
    const n = lbCleanName(nameInput.value);
    if (!n) { $("#lbNameError").textContent = "Pick a name with 1 to 20 characters."; return; }
    st = { ...st, name: n, synced: n === st.name && st.synced, asked: true, taken: false };
    save();
    if (!st.synced) {
      try { await upsert(); }
      catch (err) { if (st.taken) { mode("taken"); return; } } // offline: keep the name, sync later
    }
    after();
  };
  $("#lbLinkToggle").onclick = () => mode("link");
  $("#lbPickOther").onclick = () => { nameInput.value = ""; mode("name"); };
  linkForm.onsubmit = async (e) => {
    e.preventDefault();
    const code = lbNormCode(codeIn.value), err = $("#lbCodeError");
    if (code.length !== 8) { err.textContent = "Sync codes have 8 letters and numbers, like ABCD-EFGH."; return; }
    err.textContent = "Linking…";
    try {
      const rows = await rpc("claim_code", { p_code: code, p_from: st.id });
      const p = rows?.[0];
      if (!p?.id) { err.textContent = "That code didn't match. Codes work once, for 24 hours. Make a fresh one on your other device."; return; }
      // Same player everywhere now: pending solves and `sent` keys carry over; the server dedupes overlaps.
      st = { ...st, id: p.id, name: lbCleanName(p.name), synced: true, taken: false, asked: true };
      save();
      after();
    } catch (x) {
      err.textContent = /too many/i.test(String(x.body?.message || "")) ? "Too many tries just now. Please try again in a while." : "Can't reach the leaderboard right now. Try again in a moment.";
    }
  };
  nameSheet.addEventListener("close", () => { if (!st.asked) { st.asked = true; save(); } });

  /* Leaderboard sheet with Day / Week / Month tabs. */
  let current = "day";
  const tabs = [...document.querySelectorAll("#lbTabs [data-period]")];
  function renderMe() {
    $("#lbMe").innerHTML = st.name
      ? `Playing as <b>${lbEsc(st.name)}</b> <button type="button" class="linkish" id="lbEdit">Edit name</button>`
      : `<button type="button" class="linkish" id="lbEdit">Add your name to join the board</button>`;
    $("#lbEdit").onclick = () => askName(st.taken ? "taken" : "name");
    if (st.taken) $("#lbMe").insertAdjacentHTML("beforeend", ` <span class="lberror">That name is in use, so your points are waiting.</span>`);
    $("#lbSync").hidden = !(st.name && st.synced);
    $("#lbSyncBox").hidden = true;
    const n = st.queue.length;
    $("#lbPending").textContent = n ? `${n} solve${n > 1 ? "s" : ""} waiting to sync.` : "";
  }
  let ticket = 0;
  async function show(period) {
    current = period;
    tabs.forEach((t) => t.setAttribute("aria-selected", String(t.dataset.period === period)));
    const list = $("#lbList"), my = ++ticket;
    list.innerHTML = `<li class="lbmsg">Loading…</li>`;
    await flush();
    renderMe();
    try {
      const rows = await rpc("leaderboard", { p_period: period, p_player: st.id });
      if (my !== ticket) return;
      list.innerHTML = rows?.length
        ? rows.map((r) => `<li class="${r.is_me ? "me" : ""}"${r.is_me ? ' aria-current="true"' : ""}><span class="lbrank">${+r.rank}</span><span class="lbname">${lbEsc(r.name)}${r.is_me ? " <small>(you)</small>" : ""}</span><b>${+r.points}</b></li>`).join("")
        : `<li class="lbmsg">No points yet ${period === "day" ? "today" : `this ${period}`}. Solve a puzzle to get on the board!</li>`;
    } catch {
      if (my === ticket) list.innerHTML = `<li class="lbmsg">Can't reach the leaderboard right now. Your points are kept and will sync later.</li>`;
    }
  }
  tabs.forEach((t) => (t.onclick = () => show(t.dataset.period)));
  // A fresh, single-use code each time; it's never stored on this device.
  $("#lbSyncBtn").onclick = async () => {
    const box = $("#lbSyncBox");
    box.hidden = false;
    box.textContent = "Making a code…";
    try {
      const code = await rpc("sync_code", { p_id: st.id });
      if (!code) { st.synced = false; save(); flush(); box.textContent = "Couldn't find you on the board yet. Try again in a moment."; return; }
      box.innerHTML = `Your sync code<b class="lbcode">${lbEsc(lbFmtCode(code))}</b>On your other phone or browser, open 🏆 → name → “Use a sync code”. It works once, for 24 hours. Keep it to yourself.`;
    } catch { box.textContent = "Can't reach the leaderboard right now. Try again in a moment."; }
  };
  pill.onclick = () => {
    document.querySelectorAll("dialog.sheet[open]").forEach((d) => d.close());
    pill.setAttribute("aria-label", "Leaderboard");
    renderMe();
    $("#lbSheet").showModal();
    show(current);
  };

  addEventListener("online", flush);
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && flush());
  setInterval(() => st.queue.length && flush(), 60000);
  catchUp();
  flush();
  if (!st.name && !st.asked) setTimeout(askName, 600);
}
// Runs once every script (including feed.js) has loaded.
if (typeof document !== "undefined" && document.readyState === "loading") document.addEventListener("DOMContentLoaded", lbInit);
else lbInit();
