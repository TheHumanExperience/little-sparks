/* Little Sparks feed — a vertical, snap-scrolling stream of playable cards.
   Today's 17 games come first, then each earlier day back to 30 days ago.
   Exactly one card is "live" at a time: it owns the #rules/#board/#feedback/#actions
   ids the game renderers draw into. Other cards are frozen snapshots or covers. */
const FEED_ORDER = [0, 7, 1, 8, 2, 9, 3, 10, 4, 11, 5, 13, 6, 14, 12, 15, 16];
const FEED_DAYS = 31;
function feedGame(i) {
  if (i < 5) return { name: games[i][0], blurb: games[i][1], type: games[i][2], art: games[i][5] };
  if (i < 7) return { name: extraGames[i - 5][0], blurb: extraGames[i - 5][1], type: extraGames[i - 5][2], art: extraGames[i - 5][5] };
  return SPARKS[i];
}
function feedDate(offset, from = today()) {
  const d = new Date(from + "T12:00:00");
  d.setDate(d.getDate() - offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const feedDone = (d, i) => { const g = all[progressKey(d)]?.games?.[i]; return !!(g?.done || g?.credit); };
/* Clear & retry: wipes one puzzle (this date + level only). A solved puzzle keeps a
   { credit: true } marker so its solve still counts and can't be earned twice. */
function clearPuzzle(store, d, i) {
  const key = progressKey(d), games = (store[key] ||= { games: {} }).games ||= {}, prev = games[i];
  if (prev?.done || prev?.credit) games[i] = { credit: true };
  else delete games[i];
  return { key, i, prev: prev === undefined ? undefined : JSON.parse(JSON.stringify(prev)) };
}
const feedCount = (d) => FEED_ORDER.filter((i) => feedDone(d, i)).length;
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
const burstSize = (streak) => Math.min(28 + 8 * (Math.max(1, streak) - 1), 76);
const milestoneFor = (n) => (n === FEED_ORDER.length ? "all" : n === 10 ? "ten" : n === 5 ? "five" : null);
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

  const cardHtml = (d, offset, i, n) => {
    const g = feedGame(i), done = feedDone(d, i), shiny = isShiny(d, i);
    return `<section class="spark ${done ? "is-done" : ""} ${shiny ? "shiny" : ""}" data-day="${d}" data-idx="${i}" aria-label="${g.name}, ${feedDayName(offset, d)}"><div class="sparkinner"><div class="sparkhead"><span>${String(n + 1).padStart(2, "0")} / ${FEED_ORDER.length} · ${g.type}</span><span class="sparkday">${shiny ? `<b class="shinytag">✧ Shiny</b> ` : ""}${feedDayName(offset, d)}</span></div><h2 class="sparktitle">${g.name} <span class="donebadge" ${done ? "" : "hidden"}>✓</span></h2><div class="stage">${coverHtml(g, done)}</div><div class="sparkfoot"><button class="retry" type="button" aria-label="Clear and retry ${g.name}" title="Clear &amp; retry"><span aria-hidden="true">↺</span></button><span class="retrybar" role="status"></span><button class="nextspark" type="button">Next spark ↓</button></div></div></section>`;
  };
  const coverHtml = (g, done) => `<div class="cover"><div class="coverart" aria-hidden="true">${g.art}</div><p>${g.blurb}</p><span class="coverhint">${done ? "✓ Solved — scroll here to see it again" : "Settle here to play"}</span></div>`;
  const introHtml = (d, offset) => `<section class="spark dayintro" data-day="${d}" data-intro="1"><div class="sparkinner"><span class="eyebrow">${offset === 1 ? "Yesterday" : offset + " days ago"}</span><h2>${new Date(d + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</h2><p class="introcount"><b>${feedCount(d)}</b> of ${FEED_ORDER.length} sparks solved</p><div class="introdots">${FEED_ORDER.map((i) => `<i class="${feedDone(d, i) ? "done" : ""}"></i>`).join("")}</div><p class="small">Every puzzle from that day, waiting just below. ↓</p></div></section>`;
  const noteHtml = () => `<section class="spark notecard" data-note="1"><div class="sparkinner"><div class="coverart" aria-hidden="true">✳ ✴ ✦</div><span class="eyebrow">You made it through today</span><h2 class="notehero">A little play.<br>A lovely little pause.</h2><p class="todaycount"><b class="todaycountnum">${feedCount(feedToday)}</b> of ${FEED_ORDER.length} sparks today</p><p class="rewardline"><span class="stickercount">${rewards.stickers.length}</span> shiny stickers · flow <span class="flowcount">${flowNow().value}</span>/${FLOW_MAX}</p><p class="lovenote"><span aria-hidden="true">♡</span> Created with love from Devansh</p><p class="small">Keep scrolling for yesterday’s sparks ↓</p></div></section>`;
  const endHtml = () => `<section class="spark endcard" data-end="1"><div class="sparkinner"><div class="coverart" aria-hidden="true">✿ ✳ ✿</div><h2>That’s the whole garden.</h2><p>You’ve reached ${FEED_DAYS - 1} days back. New sparks arrive every morning.</p><button class="btn" type="button" data-top="1">Back to today ↑</button></div></section>`;

  function appendDay() {
    if (loadedDays >= FEED_DAYS) return false;
    const offset = loadedDays, d = feedDate(offset, feedToday);
    let html = offset ? introHtml(d, offset) : "";
    html += FEED_ORDER.map((i, n) => cardHtml(d, offset, i, n)).join("");
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
      if (i < 5) openGame(i);
      else if (i < 7) openExtra(i);
      else openSpark(i);
    } catch (e) {
      console.error(e);
      msg("This puzzle couldn't load. Try another level or day.");
    }
    liveWasDone = !!state(i).done;
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
      while (!(target = findCard(keepDay, keepIdx)) && appendDay());
    }
    appendDay();
    target ||= cards()[0];
    requestAnimationFrame(() => scrollToCard(target, false));
    refreshHeader();
    refreshRewards();
  }

  function refreshHeader() {
    const n = feedCount(feedToday);
    $("#todayCount").textContent = `${n}/${FEED_ORDER.length}`;
    $("#levelPill").textContent = levelName();
    feed.querySelectorAll(".todaycountnum").forEach((b) => (b.textContent = n));
  }
  function refreshCard(card) {
    const done = feedDone(card.dataset.day, +card.dataset.idx);
    card.classList.toggle("is-done", done);
    card.querySelector(".donebadge").hidden = !done;
    const intro = feed.querySelector(`.dayintro[data-day="${card.dataset.day}"]`);
    if (intro) {
      intro.querySelector(".introcount b").textContent = feedCount(card.dataset.day);
      intro.querySelectorAll(".introdots i").forEach((dot, n) => dot.classList.toggle("done", feedDone(card.dataset.day, FEED_ORDER[n])));
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
    $("#announce").textContent = `Solved! ${n} of ${FEED_ORDER.length} sparks ${isToday ? "today" : "that day"}.`;
    const chip = document.createElement("div");
    chip.className = "solvedchip";
    chip.innerHTML = `✦ Solved <b>${Math.max(0, n - 1)}</b>/${FEED_ORDER.length}${streak > 1 ? ` <small>×${streak} streak</small>` : ""}`;
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

  function celebrateReplay(card) {
    card.classList.remove("celebrating");
    void card.offsetWidth;
    card.classList.add("celebrating");
    setTimeout(() => card.classList.remove("celebrating"), 1600);
    $("#announce").textContent = "Solved again! Your original solve was already counted.";
    const chip = document.createElement("div");
    chip.className = "solvedchip";
    chip.textContent = "✦ Solved again";
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
    all: [`All ${FEED_ORDER.length}!`, "The whole garden is in bloom ✿", ["✿", "❀", "✦", "★", "♡"]],
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
    if (g?.done) {
      retryBar(card, `Replay? Your solve stays counted. <button type="button" data-yes="1">Replay</button><button type="button" data-no="1">Keep</button>`);
      card.querySelector("[data-yes]").onclick = () => doClear(card);
      card.querySelector("[data-no]").onclick = () => retryBar(card, "");
      undoTimer = setTimeout(() => retryBar(card, ""), 8000);
    } else doClear(card);
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
      if (done && !liveWasDone) { liveWasDone = true; refreshHeader(); if (state(+live.dataset.idx).credit) celebrateReplay(live); else celebrate(live); }
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
    $("#days").innerHTML = Array.from({ length: FEED_DAYS }, (_, k) => { const d = feedDate(k, feedToday), n = feedCount(d); return `<button data-jump="${d}" class="${n === FEED_ORDER.length ? "full" : ""}"><span>${feedDayName(k, d)}</span><span>${n}/${FEED_ORDER.length} ${n ? "✦" : ""}</span></button>`; }).join("");
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
