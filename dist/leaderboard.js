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
  return { id: s.id || lbUuid(), name: lbCleanName(s.name), synced: !!s.synced, asked: !!s.asked, sent: { ...(s.sent || {}) }, queue: Array.isArray(s.queue) ? s.queue.slice() : [] };
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
const lbEsc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

let lbSolved = () => {};
(() => {
  const url = (typeof SUPABASE_URL === "string" ? SUPABASE_URL : "").trim().replace(/\/+$/, "");
  const key = (typeof SUPABASE_ANON_KEY === "string" ? SUPABASE_ANON_KEY : "").trim();
  const pill = typeof document !== "undefined" && document.querySelector?.("#lbPill");
  if (!url || !key || !pill || typeof fetch !== "function") return;
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
    if (!r.ok) { const e = new Error(`${fn} ${r.status}`); e.status = r.status; throw e; }
    const t = await r.text();
    return t ? JSON.parse(t) : null;
  }
  const permanent = (e) => e.status >= 400 && e.status < 500 && e.status !== 408 && e.status !== 429;
  let flushing = null;
  function flush() {
    if (!st.name) return Promise.resolve();
    return (flushing ||= (async () => {
      try {
        st = lbPrune(st, istDate());
        if (!st.synced) { await rpc("upsert_player", { p_id: st.id, p_name: st.name }); st.synced = true; save(); }
        for (const q of st.queue.slice()) {
          try { await rpc("record_solve", { p_player: st.id, p_date: q.d, p_level: q.lv, p_game: q.g }); }
          catch (e) { if (!permanent(e)) throw e; }
          st = lbAck(st, q.k);
          save();
        }
      } catch {} finally { flushing = null; }
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
  const nameSheet = $("#nameSheet"), nameInput = $("#lbName");
  function askName() {
    nameInput.value = st.name;
    $("#lbNameError").textContent = "";
    if (!nameSheet.open) nameSheet.showModal();
  }
  $("#lbNameForm").onsubmit = (e) => {
    e.preventDefault();
    const n = lbCleanName(nameInput.value);
    if (!n) { $("#lbNameError").textContent = "Pick a name with 1 to 20 characters."; return; }
    st = { ...st, name: n, synced: n === st.name && st.synced, asked: true };
    save();
    nameSheet.close();
    flush().then(() => $("#lbSheet").open && show(current));
    renderMe();
  };
  nameSheet.addEventListener("close", () => { if (!st.asked) { st.asked = true; save(); } });

  /* Leaderboard sheet with Day / Week / Month tabs. */
  let current = "day";
  const tabs = [...document.querySelectorAll("#lbTabs [data-period]")];
  function renderMe() {
    $("#lbMe").innerHTML = st.name
      ? `Playing as <b>${lbEsc(st.name)}</b> <button type="button" class="linkish" id="lbEdit">Edit name</button>`
      : `<button type="button" class="linkish" id="lbEdit">Add your name to join the board</button>`;
    $("#lbEdit").onclick = askName;
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
  flush();
  if (!st.name && !st.asked) setTimeout(askName, 600);
})();
