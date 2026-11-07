/* Little Sparks feed — a vertical, snap-scrolling stream of playable cards.
   Today's 17 cards (12 games + a 5-card Aha track) come first, then each earlier day back to 30 days ago.
   Exactly one card is "live" at a time: it owns the #rules/#board/#feedback/#actions
   ids the game renderers draw into. Other cards are frozen snapshots or covers. */
/* Each level shows one game per family, so Gentle/Medium/Tricky feel distinct:
   Sudoku → Pocket Sudoku / Sudoku Six / Sudoku Six · Hard; Killer Six on every level (graded);
   Bloom → Bloom Trail / 5×5 / 5×5;
   Neighbours → Little Neighbours / Neighbours Goal / Neighbours Goal.
   The five Aha cards (3, 17–20) sit together as one block. */
const FEED_FAMILIES = { sudoku: [1, 11, 21], killer: [12, 12, 12], bloom: [4, 14, 14], neighbours: [6, 16, 16] };
const FEED_PLAN = [0, "sudoku", "killer", 8, 3, 17, 18, 19, 20, 2, 9, "bloom", 5, 10, 13, "neighbours", 15];
const feedOrder = (lv = difficulty) => FEED_PLAN.map((x) => (typeof x === "string" ? FEED_FAMILIES[x][lv] : x));
const feedSibling = (i, lv = difficulty) => Object.values(FEED_FAMILIES).find((f) => f.includes(i))?.[lv] ?? i;
const FEED_DAYS = 31;
// Tells leaderboard.js this feed reports first solves through lbSolved (see the setup override).
const FEED_LB_HOOK = 1;
function feedGame(i, d) {
  if (AHA_SLOTS.includes(i)) { const c = d && ahaMeta(d, i); if (c) return { name: c.name, blurb: c.blurb, type: "Aha · " + c.type, art: c.art }; if (i !== 3) return { name: "Aha Moment", blurb: "A fresh reasoning puzzle.", type: "Aha", art: "✧ ? ✧" }; }
  if (i < 5) return { name: games[i][0], blurb: games[i][1], type: games[i][2], art: games[i][5] };
  if (i < 7) return { name: extraGames[i - 5][0], blurb: extraGames[i - 5][1], type: extraGames[i - 5][2], art: extraGames[i - 5][5] };
  return SPARKS[i];
}
function feedDate(offset, from = today()) {
  const d = new Date(from + "T12:00:00");
  d.setDate(d.getDate() - offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
/* A card counts once it was solved for real. A revealed answer ({ revealed: 1 }) never counts. */
const feedDone = (d, i) => { const g = all[progressKey(d)]?.games?.[i]; return !!((g?.done && !g.revealed) || g?.credit); };
/* Clear & retry: wipes one puzzle (this date + level only). A solved puzzle keeps a
   { credit: true } marker so its solve still counts and can't be earned twice; a revealed
   puzzle keeps { revealed: 1 } so solving it again still earns nothing. */
function clearPuzzle(store, d, i) {
  const key = progressKey(d), games = (store[key] ||= { games: {} }).games ||= {}, prev = games[i];
  const credit = !!(prev?.credit || (prev?.done && !prev.revealed));
  if (credit || prev?.revealed) {
    games[i] = {};
    if (credit) games[i].credit = true;
    if (prev.aha) games[i].aha = 1;
    if (prev.revealed) games[i].revealed = 1;
  } else delete games[i];
  return { key, i, prev: prev === undefined ? undefined : JSON.parse(JSON.stringify(prev)) };
}
const feedCount = (d) => feedOrder().filter((i) => feedDone(d, i)).length;
function feedDayName(offset, d) {
  if (offset === 0) return "Today";
  if (offset === 1) return "Yesterday";
  return new Date(d + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

/* Small rewards: pure rules (also checked by verify-rewards.cjs). */
const REWARD_KEY = "little-sparks-rewards-v1", FLOW_MAX = 5, FLOW_DRAIN = 2, SHINY_RATE = 0.05;
const isShiny = (d, i) => rng(`${d}|shiny|${i}`)() < SHINY_RATE;
/* Flow is per calendar day. A solve with no hint on that puzzle adds 1; the first hint on a
   puzzle drains 2 (never below 0) and that puzzle no longer adds flow. Full bar = golden
   cards for the rest of the day; golden never drains. */
function flowStep(f, ev, date) {
  f = f && f.date === date ? { ...f, hinted: [...f.hinted] } : { date, value: 0, golden: false, hinted: [] };
  if (f.golden) return f;
  if (ev.type === "hint" && !f.hinted.includes(ev.key)) { f.hinted.push(ev.key); f.value = Math.max(0, f.value - FLOW_DRAIN); }
  if (ev.type === "solve" && !f.hinted.includes(ev.key)) f.value = Math.min(FLOW_MAX, f.value + 1);
  f.golden = f.value >= FLOW_MAX;
  return f;
}
/* Reveal answer: Gentle unlimited, Medium 5 and Tricky 3 cards per calendar day and level.
   rewards.reveals = { date, used: [[keys], [keys], [keys]] }. A card already revealed today
   (e.g. after ↺) can be shown again without using another reveal. */
const REVEAL_LIMIT = [Infinity, 5, 3];
const revealUse = (r, date) => (r && r.date === date ? { date, used: [0, 1, 2].map((k) => [...(r.used?.[k] || [])]) } : { date, used: [[], [], []] });
const revealsLeft = (r, lv, date, key) => (key && revealUse(r, date).used[lv].includes(key) ? Infinity : REVEAL_LIMIT[lv] - revealUse(r, date).used[lv].length);
function revealStep(r, lv, key, date) {
  r = revealUse(r, date);
  const u = r.used[lv];
  if (u.includes(key)) return { r, ok: true };
  if (u.length >= REVEAL_LIMIT[lv]) return { r, ok: false };
  u.push(key);
  return { r, ok: true };
}
/* The finished state each game draws as solved, built from that day's own model. */
function revealState(d, i, s = {}) {
  const set = (o) => Object.assign(s, o, { started: true, done: true, revealed: 1 });
  delete s.stars;
  if (i === 0) { const a = wordAnswer(d), n = [8, 6, 5][difficulty]; return set({ guesses: [...(s.guesses || []).filter((g) => g !== a).slice(0, n - 1), a] }); }
  if (i === 1) return set({ values: sudokuModel(d).sol.slice() });
  if (i === 2) {
    const m = dominoModel(d), t = (o) => o.map((k) => m.tiles[k]);
    const fits = (o) => { const x = t(o); return x[0][0] + x[0][1] + x[1][0] + x[1][1] === m.row[0] && x[2][0] + x[2][1] + x[3][0] + x[3][1] === m.row[1] && [x[0][0] + x[2][0], x[0][1] + x[2][1], x[1][0] + x[3][0], x[1][1] + x[3][1]].every((v, k) => v === m.col[k]); };
    const perms = [[]];
    for (let n = 0; n < 4; n++) perms.splice(0, perms.length, ...perms.flatMap((p) => [0, 1, 2, 3].filter((k) => !p.includes(k)).map((k) => [...p, k])));
    return set({ slots: perms.filter(fits).sort((a, b) => (b[0] === m.first) - (a[0] === m.first))[0] });
  }
  if (i === 3 && ahaLegacy(d, 3)) return set({ answer: logicModel(d).a });
  if (AHA_SLOTS.includes(i)) { const m = ahaModel(d, AHA_SLOTS.indexOf(i)); return set({ aha: 1, answer: m.kind === "choice" ? m.a : String(m.a) }); }
  if (i === 4) return set({ path: trailModel(d).path.slice() });
  if (i === 5) {
    const ids = s.photoIds || (s.answers?.length ? shuffle(PHOTO_BANK.slice(0, 6), rng(d + "photographs")).slice(0, 3) : photoSet(d)).map((p) => p.image);
    return set({ photoIds: ids, answers: ids.map((id) => ({ guess: PHOTO_BANK.find((p) => p.image === id).year, revealed: 1 })) });
  }
  if (i === 6) return set({ mode: "challenge", board: neighbourModel(d).solution.slice(), history: [] });
  if (i === 8) return set({ order: [0, 1, 2, 3, 4, 5] });
  if (i === 9) { const m = alchemyModel(d); return set({ pot: m.target.slice(), drops: [] }); }
  if (i === 10) return set({ mirrors: { ...mirrorModel(d).solution } });
  if (i === 11) return set({ values: sudokuSixModel(d).sol.slice() });
  if (i === 21) return set({ values: hardSixModel(d).sol.slice() });
  if (i === 12) return set({ values: savedKiller(d, s).sol.slice() });
  if (i === 13) return set({ steps: ladderModel(d).route.slice() });
  if (i === 14) return set({ path: bloomFiveModel(d).path.slice() });
  if (i === 15) { const m = savedDuel(d, s); return set({ picks: m.order.slice(), ordered: true, guess: m.decade }); }
  if (i === 16) return set({ board: goalModel(d).good.slice(), history: [] });
  return set({});
}
const burstSize = (streak) => Math.min(28 + 8 * (Math.max(1, streak) - 1), 76);
const milestoneFor = (n) => (n === feedOrder().length ? "all" : n === 10 ? "ten" : n === 5 ? "five" : null);
/* Soft chime: a pentatonic note that climbs one step per consecutive solve. */
const PENTA = [0, 2, 4, 7, 9];
const chimeFreq = (streak) => { const k = Math.min(Math.max(1, streak), 10) - 1; return 523.25 * 2 ** ((12 * Math.floor(k / 5) + PENTA[k % 5]) / 12); };
const HINT_LABEL = /hint|reveal/i;

if (document.getElementById?.("feed")) {
  window.FEED_MODE = true;
  const feed = $("#feed"), reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let feedToday = today(), feedLevel = difficulty, loadedDays = 0, live = null, liveWasDone = false;
  let rewards = { muted: false, flow: null, stickers: [] }, streak = 0, lastSolve = 0, actx = null;
  try { rewards = { ...rewards, ...JSON.parse(localStorage.getItem(REWARD_KEY) || "{}") }; } catch {}
  const saveRewards = () => { try { localStorage.setItem(REWARD_KEY, JSON.stringify(rewards)); } catch {} };
  const flowNow = () => flowStep(rewards.flow, {}, today());

  const revealedNow = (d, i) => { const g = all[progressKey(d)]?.games?.[i]; return !!(g?.revealed && g.done); };
  const cardHtml = (d, offset, i, n) => {
    const g = feedGame(i, d), done = feedDone(d, i), shiny = isShiny(d, i);
    return `<section class="spark ${done ? "is-done" : ""} ${shiny ? "shiny" : ""}" data-day="${d}" data-idx="${i}" aria-label="${g.name}, ${feedDayName(offset, d)}"><div class="sparkinner"><div class="sparkhead"><span>${String(n + 1).padStart(2, "0")} / ${feedOrder().length} · ${g.type}</span><span class="sparkday">${shiny ? `<b class="shinytag">✧ Shiny</b> ` : ""}${feedDayName(offset, d)}</span></div><h2 class="sparktitle">${g.name} <span class="donebadge" ${done ? "" : "hidden"}>✓</span></h2><div class="stage">${coverHtml(g, done)}</div><div class="sparkfoot"><button class="retry" type="button" aria-label="Clear and retry ${g.name}" title="Clear &amp; retry"><span aria-hidden="true">↺</span></button><button class="revealbtn" type="button" ${done || revealedNow(d, i) ? "hidden" : ""}>Reveal answer</button><span class="retrybar" role="status"></span><button class="nextspark" type="button">Next spark ↓</button></div></div></section>`;
  };
  const coverHtml = (g, done) => `<div class="cover"><div class="coverart" aria-hidden="true">${g.art}</div><p>${g.blurb}</p><span class="coverhint">${done ? "✓ Solved — scroll here to see it again" : "Settle here to play"}</span></div>`;
  const introHtml = (d, offset) => `<section class="spark dayintro" data-day="${d}" data-intro="1"><div class="sparkinner"><span class="eyebrow">${offset === 1 ? "Yesterday" : offset + " days ago"}</span><h2>${new Date(d + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</h2><p class="introcount"><b>${feedCount(d)}</b> of ${feedOrder().length} sparks solved</p><div class="introdots">${feedOrder().map((i) => `<i class="${feedDone(d, i) ? "done" : ""}"></i>`).join("")}</div><p class="small">Every puzzle from that day, waiting just below. ↓</p></div></section>`;
  const noteHtml = () => `<section class="spark notecard" data-note="1"><div class="sparkinner"><div class="coverart" aria-hidden="true">✳ ✴ ✦</div><span class="eyebrow">You made it through today</span><h2 class="notehero">A little play.<br>A lovely little pause.</h2><p class="todaycount"><b class="todaycountnum">${feedCount(feedToday)}</b> of ${feedOrder().length} sparks today</p><p class="rewardline"><span class="stickercount">${rewards.stickers.length}</span> shiny stickers · flow <span class="flowcount">${flowNow().value}</span>/${FLOW_MAX}</p><p class="lovenote"><span aria-hidden="true">♡</span> Created with love from Devansh</p><p class="small">Keep scrolling for yesterday’s sparks ↓</p></div></section>`;
  const endHtml = () => `<section class="spark endcard" data-end="1"><div class="sparkinner"><div class="coverart" aria-hidden="true">✿ ✳ ✿</div><h2>That’s the whole garden.</h2><p>You’ve reached ${FEED_DAYS - 1} days back. New sparks arrive every morning.</p><button class="btn" type="button" data-top="1">Back to today ↑</button></div></section>`;

  function appendDay() {
    if (loadedDays >= FEED_DAYS) return false;
    const offset = loadedDays, d = feedDate(offset, feedToday);
    let html = offset ? introHtml(d, offset) : "";
    html += feedOrder().map((i, n) => cardHtml(d, offset, i, n)).join("");
    if (!offset) html += noteHtml();
    loadedDays++;
    if (loadedDays === FEED_DAYS) html += endHtml();
    feed.insertAdjacentHTML("beforeend", html);
    return true;
  }
  const cards = () => [...feed.querySelectorAll(".spark")];
  const findCard = (d, i) => feed.querySelector(`.spark[data-day="${d}"][data-idx="${i}"]`);

  function freeze(card) {
    const stage = card.querySelector(".stage");
    stage.querySelectorAll("*").forEach((el) => [...el.attributes].forEach((a) => { if (a.name === "id" || a.name.startsWith("data-")) el.removeAttribute(a.name); }));
    stage.inert = true;
    card.classList.remove("live");
  }
  function activate(card) {
    if (card === live) return;
    if (live) freeze(live);
    live = null;
    window.sparkKeys = null;
    if (!card.dataset.idx) return;
    live = card;
    const i = +card.dataset.idx, stage = card.querySelector(".stage");
    day = card.dataset.day;
    data = all[progressKey(day)] || (all[progressKey(day)] = { games: {} });
    stage.inert = false;
    stage.innerHTML = `<span id="gtype" hidden></span><h3 id="gtitle" hidden></h3><details class="howto" ${state(i).started ? "" : "open"}><summary>How to play</summary><p id="rules"></p></details><div id="board"></div><p id="feedback" role="status" aria-live="polite"></p><div id="actions"></div>`;
    liveWasDone = !!state(i).done;
    card.classList.add("live");
    try {
      if (AHA_SLOTS.includes(i)) openAha(i);
      else if (i < 5) openGame(i);
      else if (i < 7) openExtra(i);
      else openSpark(i);
    } catch (e) {
      console.error(e);
      msg("This puzzle couldn't load. Try another level or day.");
    }
    liveWasDone = !!state(i).done;
    if (state(i).revealed && state(i).done) {
      card.classList.add("is-revealed");
      const why = AHA_SLOTS.includes(i) && !ahaLegacy(day, i) ? " " + ahaModel(day, AHA_SLOTS.indexOf(i)).why : "";
      msg("Answer revealed — it doesn't count as solved. Tap ↺ to try it yourself." + why);
    } else card.classList.remove("is-revealed");
  }

  function current() {
    const top = feed.getBoundingClientRect().top + feed.clientHeight * 0.4;
    return cards().find((c) => { const r = c.getBoundingClientRect(); return r.top <= top && r.bottom > top; });
  }
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const c = current();
      if (c) activate(c);
      const list = cards();
      if (c && list.length - list.indexOf(c) < 8) appendDay();
    });
  }
  feed.addEventListener("scroll", onScroll, { passive: true });

  function scrollToCard(card, smooth) {
    if (!card) return;
    feed.scrollTo({ top: card.offsetTop, behavior: smooth && !reduceMotion.matches ? "smooth" : "auto" });
    if (!smooth) activate(card);
  }
  feed.addEventListener("click", (e) => {
    const next = e.target.closest(".nextspark");
    if (next) { const list = cards(), c = next.closest(".spark"); scrollToCard(list[list.indexOf(c) + 1], true); }
    if (e.target.closest("[data-top]")) scrollToCard(cards()[0], true);
  });

  function rebuild(keepDay, keepIdx) {
    if (live) freeze(live);
    live = null;
    feed.innerHTML = "";
    loadedDays = 0;
    feedLevel = difficulty;
    appendDay();
    let target = null;
    if (keepDay) {
      while (!(target = findCard(keepDay, feedSibling(keepIdx))) && appendDay());
    }
    appendDay();
    target ||= cards()[0];
    requestAnimationFrame(() => scrollToCard(target, false));
    refreshHeader();
    refreshRewards();
  }

  function refreshHeader() {
    const n = feedCount(feedToday);
    $("#todayCount").textContent = `${n}/${feedOrder().length}`;
    const left = revealsLeft(rewards.reveals, difficulty, today()), rc = $("#revealCount");
    rc.hidden = left === Infinity;
    $("#todayPill").classList.toggle("hasreveals", left !== Infinity);
    rc.textContent = left === Infinity ? "" : ` · 🔑 ${left}`;
    rc.title = `${left} reveal${left === 1 ? "" : "s"} left today`;
    $("#todayPill").setAttribute("aria-label", `Today: ${n} of ${feedOrder().length} solved${left === Infinity ? "" : `, ${left} reveal${left === 1 ? "" : "s"} left`}. Jump to a day`);
    $("#levelPill").textContent = levelName();
    feed.querySelectorAll(".todaycountnum").forEach((b) => (b.textContent = n));
  }
  function refreshCard(card) {
    const done = feedDone(card.dataset.day, +card.dataset.idx);
    card.classList.toggle("is-done", done);
    card.querySelector(".donebadge").hidden = !done;
    card.querySelector(".revealbtn").hidden = done || revealedNow(card.dataset.day, +card.dataset.idx);
    const intro = feed.querySelector(`.dayintro[data-day="${card.dataset.day}"]`);
    if (intro) {
      intro.querySelector(".introcount b").textContent = feedCount(card.dataset.day);
      intro.querySelectorAll(".introdots i").forEach((dot, n) => dot.classList.toggle("done", feedDone(card.dataset.day, feedOrder()[n])));
    }
  }

  function celebrate(card) {
    const pill = $("#todayPill"), key = `${card.dataset.day}:${card.dataset.idx}`;
    streak = Date.now() - lastSolve < 15 * 60000 ? streak + 1 : 1;
    lastSolve = Date.now();
    const wasGolden = flowNow().golden;
    rewards.flow = flowStep(rewards.flow, { type: "solve", key }, today());
    const sticker = card.classList.contains("shiny") && !rewards.stickers.includes(key);
    if (sticker) rewards.stickers.push(key);
    saveRewards();
    refreshRewards();
    card.classList.remove("celebrating");
    void card.offsetWidth;
    card.classList.add("celebrating");
    setTimeout(() => card.classList.remove("celebrating"), 1600);
    pill.classList.remove("bump");
    void pill.offsetWidth;
    pill.classList.add("bump");
    const isToday = card.dataset.day === feedToday, n = feedCount(card.dataset.day);
    $("#announce").textContent = `Solved! ${n} of ${feedOrder().length} sparks ${isToday ? "today" : "that day"}.`;
    const chip = document.createElement("div");
    chip.className = "solvedchip";
    chip.innerHTML = `✦ Solved <b>${Math.max(0, n - 1)}</b>/${feedOrder().length}${streak > 1 ? ` <small>×${streak} streak</small>` : ""}`;
    card.querySelector(".sparkinner").append(chip);
    setTimeout(() => (chip.querySelector("b").textContent = n), reduceMotion.matches ? 0 : 350);
    setTimeout(() => chip.remove(), 2600);
    const milestone = milestoneFor(n);
    chime(milestone ? [chimeFreq(streak), chimeFreq(streak + 2), chimeFreq(streak + 4), chimeFreq(streak + 5)] : [chimeFreq(streak)]);
    if (sticker) toast(`✧ Shiny sticker! You have ${rewards.stickers.length}.`, "sticker");
    if (!wasGolden && rewards.flow.golden) toast("Flow full! Golden cards for the rest of today ✦", "gold", sticker ? 1400 : 0);
    if (milestone) celebrateMilestone(milestone);
    if (reduceMotion.matches) return;
    try { if ("vibrate" in navigator) navigator.vibrate(milestone ? [30, 50, 30, 50, 60] : [20, 40, 20]); } catch {}
    card.append(makeBurst(burstSize(streak), 1 + Math.min(streak - 1, 6) * 0.12));
  }

  function celebrateReplay(card, revealed) {
    card.classList.remove("celebrating");
    void card.offsetWidth;
    card.classList.add("celebrating");
    setTimeout(() => card.classList.remove("celebrating"), 1600);
    $("#announce").textContent = revealed ? "Solved! The answer was revealed earlier, so this one doesn't count." : "Solved again! Your original solve was already counted.";
    const chip = document.createElement("div");
    chip.className = "solvedchip";
    chip.textContent = revealed ? "✦ Solved · not counted" : "✦ Solved again";
    card.querySelector(".sparkinner").append(chip);
    setTimeout(() => chip.remove(), 2200);
    chime([chimeFreq(1)]);
    if (!reduceMotion.matches) card.append(makeBurst(20, 0.8));
  }

  function makeBurst(count, reach = 1, glyphs = ["✦", "✿", "●", "★", "✳", "♡"]) {
    const burst = document.createElement("div"), colours = ["#e9a23b", "#d56d4c", "#7da26c", "#5a8fb5", "#c57bb0", "#f2c94c"];
    burst.className = "burst";
    burst.setAttribute("aria-hidden", "true");
    for (let k = 0; k < count; k++) {
      const p = document.createElement("i"), ang = (k / count) * Math.PI * 2 + Math.random() * 0.4, dist = (90 + Math.random() * 120) * reach;
      p.textContent = glyphs[k % glyphs.length];
      p.style.cssText = `--dx:${Math.cos(ang) * dist}px;--dy:${Math.sin(ang) * dist - 40}px;--rot:${Math.random() * 540 - 270}deg;--delay:${Math.random() * 120}ms;color:${colours[k % colours.length]};font-size:${12 + Math.random() * 14}px`;
      burst.append(p);
    }
    setTimeout(() => burst.remove(), 1500);
    return burst;
  }

  const MILESTONES = {
    five: ["Five sparks!", "You’re glowing ✦", ["★", "✦"]],
    ten: ["Ten sparks!", "Look at you go ✦✦", ["★", "✿", "✦"]],
    all: [`All ${feedOrder().length}!`, "The whole garden is in bloom ✿", ["✿", "❀", "✦", "★", "♡"]],
  };
  function celebrateMilestone(kind) {
    const [title, sub, glyphs] = MILESTONES[kind], el = document.createElement("div");
    el.className = `milestone ms-${kind}`;
    el.setAttribute("role", "status");
    el.innerHTML = `<div class="mscard"><b>${title}</b><span>${sub}</span></div>`;
    document.body.append(el);
    $("#announce").textContent = `${title} ${sub}`;
    setTimeout(() => el.classList.add("out"), kind === "all" ? 3200 : 2200);
    setTimeout(() => el.remove(), kind === "all" ? 3800 : 2800);
    if (reduceMotion.matches) return;
    const waves = kind === "all" ? 6 : kind === "ten" ? 3 : 1;
    for (let w = 0; w < waves; w++) setTimeout(() => {
      const b = makeBurst(kind === "five" ? 44 : 56, kind === "all" ? 1.5 : 1.3, glyphs);
      b.style.cssText = `position:fixed;left:${waves > 1 ? 20 + Math.random() * 60 : 50}%;top:${waves > 1 ? 25 + Math.random() * 45 : 45}%`;
      el.append(b);
    }, w * 380);
  }

  function toast(text, kind = "", delay = 0) {
    setTimeout(() => {
      const t = document.createElement("div");
      t.className = `toast ${kind}`;
      t.setAttribute("role", "status");
      t.textContent = text;
      document.body.append(t);
      setTimeout(() => t.classList.add("out"), 2600);
      setTimeout(() => t.remove(), 3100);
    }, delay);
  }

  /* Sound: synthesized chimes. iOS needs the AudioContext to start inside a user gesture. */
  function unlockAudio() {
    if (actx || rewards.muted) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    try { actx = new Ctx(); if (actx.state === "suspended") actx.resume(); } catch { actx = null; }
  }
  document.addEventListener("pointerdown", unlockAudio, { capture: true, passive: true });
  document.addEventListener("keydown", unlockAudio, { capture: true });
  function chime(freqs) {
    if (rewards.muted || !actx) return;
    if (actx.state === "suspended") actx.resume();
    const t0 = actx.currentTime + 0.02;
    freqs.forEach((f, k) => [[f, 0.05], [f * 2, 0.012]].forEach(([hz, vol]) => {
      const o = actx.createOscillator(), g = actx.createGain(), t = t0 + k * 0.11;
      o.type = "sine";
      o.frequency.value = hz;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
      o.connect(g).connect(actx.destination);
      o.start(t);
      o.stop(t + 1.2);
    }));
  }
  const soundPill = $("#soundPill");
  function refreshSound() {
    soundPill.setAttribute("aria-pressed", String(!rewards.muted));
    soundPill.setAttribute("aria-label", rewards.muted ? "Sound off. Turn chimes on" : "Sound on. Turn chimes off");
    soundPill.querySelector("span").textContent = rewards.muted ? "🔕" : "🔔";
  }
  soundPill.onclick = () => {
    rewards.muted = !rewards.muted;
    saveRewards();
    refreshSound();
    if (!rewards.muted) { unlockAudio(); chime([chimeFreq(1)]); }
  };

  /* Flow meter and golden day. */
  function refreshRewards() {
    const f = flowNow(), bar = $("#flowBar");
    bar.style.setProperty("--flow", f.value / FLOW_MAX);
    bar.setAttribute("aria-valuenow", f.value);
    bar.title = f.golden ? "Flow full — golden day!" : `Flow ${f.value} of ${FLOW_MAX}: solve without hints to fill it`;
    document.body.classList.toggle("golden", f.golden);
    feed.querySelectorAll(".stickercount").forEach((b) => (b.textContent = rewards.stickers.length));
    feed.querySelectorAll(".flowcount").forEach((b) => (b.textContent = f.value));
  }
  feed.addEventListener("click", (e) => {
    const b = e.target.closest(".spark.live .stage button");
    if (!b || !HINT_LABEL.test(b.textContent)) return;
    const card = b.closest(".spark");
    if (feedDone(card.dataset.day, +card.dataset.idx)) return;
    rewards.flow = flowStep(rewards.flow, { type: "hint", key: `${card.dataset.day}:${card.dataset.idx}` }, today());
    saveRewards();
    refreshRewards();
  }, true);

  /* Clear & retry */
  let undoTimer = 0;
  function rerender(card) {
    if (live) freeze(live);
    live = null;
    activate(card);
    refreshCard(card);
    refreshHeader();
  }
  function retryBar(card, html) {
    feed.querySelectorAll(".retrybar").forEach((b) => (b.innerHTML = ""));
    clearTimeout(undoTimer);
    const bar = card.querySelector(".retrybar");
    bar.innerHTML = html;
    if (html) { const inner = card.querySelector(".sparkinner"); inner.scrollTop = inner.scrollHeight; }
  }
  function doClear(card) {
    const undo = clearPuzzle(all, card.dataset.day, +card.dataset.idx);
    persist();
    rerender(card);
    if (undo.prev && !undo.prev.done && !undo.prev.credit) {
      retryBar(card, `Cleared. <button type="button" data-undo="1">Undo</button>`);
      card.querySelector("[data-undo]").onclick = () => {
        all[undo.key].games[undo.i] = undo.prev;
        persist();
        retryBar(card, "");
        rerender(card);
      };
      undoTimer = setTimeout(() => retryBar(card, ""), 5000);
    } else retryBar(card, "Fresh start ✦");
    if (!undo.prev || undo.prev.done || undo.prev.credit) undoTimer = setTimeout(() => retryBar(card, ""), 2000);
  }
  feed.addEventListener("click", (e) => {
    const r = e.target.closest(".retry");
    if (!r) return;
    const card = r.closest(".spark"), g = all[progressKey(card.dataset.day)]?.games?.[card.dataset.idx];
    if (g?.done && !g.revealed) {
      retryBar(card, `Replay? Your solve stays counted. <button type="button" data-yes="1">Replay</button><button type="button" data-no="1">Keep</button>`);
      card.querySelector("[data-yes]").onclick = () => doClear(card);
      card.querySelector("[data-no]").onclick = () => retryBar(card, "");
      undoTimer = setTimeout(() => retryBar(card, ""), 8000);
    } else doClear(card);
  });

  /* Reveal answer */
  feed.addEventListener("click", (e) => {
    const btn = e.target.closest(".revealbtn");
    if (!btn) return;
    const card = btn.closest(".spark"), d = card.dataset.day, i = +card.dataset.idx, key = `${d}:${i}`, lv = difficulty;
    if (card !== live) activate(card);
    const left = revealsLeft(rewards.reveals, lv, today(), key);
    if (left <= 0) {
      retryBar(card, `No reveals left today on ${levelName()}. Fresh ones arrive tomorrow.`);
      undoTimer = setTimeout(() => retryBar(card, ""), 4000);
      return;
    }
    const note = left === Infinity ? "" : ` ${left} reveal${left === 1 ? "" : "s"} left today.`;
    retryBar(card, `Show the answer? It won't count as solved.${note} <button type="button" data-yes="1">Reveal</button><button type="button" data-no="1">Keep trying</button>`);
    card.querySelector("[data-no]").onclick = () => retryBar(card, "");
    card.querySelector("[data-yes]").onclick = () => {
      const step = revealStep(rewards.reveals, lv, key, today());
      if (!step.ok) return retryBar(card, "No reveals left today.");
      rewards.reveals = step.r;
      rewards.flow = flowStep(rewards.flow, { type: "hint", key }, today());
      saveRewards();
      const games = (all[progressKey(d)] ||= { games: {} }).games;
      games[i] = revealState(d, i, games[i] || {});
      persist();
      rerender(card);
      refreshRewards();
      refreshHeader();
      const after = revealsLeft(rewards.reveals, lv, today());
      retryBar(card, after === Infinity ? "Answer revealed." : `Answer revealed · ${after} left today.`);
      undoTimer = setTimeout(() => retryBar(card, ""), 3000);
      $("#announce").textContent = "Answer revealed. It doesn't count as solved.";
    };
    undoTimer = setTimeout(() => retryBar(card, ""), 8000);
  });

  const legacySetup = setup;
  setup = function () {
    legacySetup();
    if (difficulty !== feedLevel) {
      const keep = live ? [live.dataset.day, +live.dataset.idx] : [];
      closeSheets();
      return rebuild(...keep);
    }
    if (live) {
      const done = !!state(+live.dataset.idx).done;
      refreshCard(live);
      if (done && !liveWasDone) { liveWasDone = true; refreshHeader(); const st = state(+live.dataset.idx); if (st.credit || st.revealed) celebrateReplay(live, !st.credit); else { celebrate(live); if (typeof lbSolved === "function") lbSolved(live.dataset.day, difficulty, +live.dataset.idx); } }
    }
    refreshHeader();
  };

  $(".feedbar .brand").onclick = (e) => {
    e.preventDefault();
    closeSheets();
    if (feed.scrollTop > 2 * feed.clientHeight) feed.scrollTo({ top: feed.clientHeight, behavior: "auto" });
    scrollToCard(cards()[0], true);
  };

  /* Sheets: level and day jump. */
  const closeSheets = () => document.querySelectorAll("dialog.sheet[open]").forEach((d) => d.close());
  $("#levelPill").onclick = () => { difficultyUI(); $("#levelSheet").showModal(); };
  $("#todayPill").onclick = () => {
    $("#days").innerHTML = Array.from({ length: FEED_DAYS }, (_, k) => { const d = feedDate(k, feedToday), n = feedCount(d); return `<button data-jump="${d}" class="${n === feedOrder().length ? "full" : ""}"><span>${feedDayName(k, d)}</span><span>${n}/${feedOrder().length} ${n ? "✦" : ""}</span></button>`; }).join("");
    $("#days").querySelectorAll("[data-jump]").forEach((b) => (b.onclick = () => {
      const d = b.dataset.jump;
      while (!feed.querySelector(`.spark[data-day="${d}"]`) && appendDay());
      appendDay();
      closeSheets();
      scrollToCard(feed.querySelector(`.spark[data-day="${d}"]`), false);
    }));
    $("#daysSheet").showModal();
  };
  document.querySelectorAll("dialog.sheet").forEach((dlg) => {
    dlg.querySelector("[data-close]").onclick = () => dlg.close();
    dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  });

  /* A fresh day arrives at midnight; rebuild unless someone is mid-typing. */
  setInterval(() => {
    if (today() === feedToday || /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || "")) return;
    feedToday = today();
    rebuild(live?.dataset.day, live ? +live.dataset.idx : undefined);
  }, 30000);

  refreshSound();
  rebuild();
}
