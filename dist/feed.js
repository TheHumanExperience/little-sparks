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
const feedDone = (d, i) => !!all[progressKey(d)]?.games?.[i]?.done;
const feedCount = (d) => FEED_ORDER.filter((i) => feedDone(d, i)).length;
function feedDayName(offset, d) {
  if (offset === 0) return "Today";
  if (offset === 1) return "Yesterday";
  return new Date(d + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

if (document.getElementById?.("feed")) {
  window.FEED_MODE = true;
  const feed = $("#feed"), reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let feedToday = today(), feedLevel = difficulty, loadedDays = 0, live = null, liveWasDone = false;

  const cardHtml = (d, offset, i, n) => {
    const g = feedGame(i), done = feedDone(d, i);
    return `<section class="spark ${done ? "is-done" : ""}" data-day="${d}" data-idx="${i}" aria-label="${g.name}, ${feedDayName(offset, d)}"><div class="sparkinner"><div class="sparkhead"><span>${String(n + 1).padStart(2, "0")} / ${FEED_ORDER.length} · ${g.type}</span><span class="sparkday">${feedDayName(offset, d)}</span></div><h2 class="sparktitle">${g.name} <span class="donebadge" ${done ? "" : "hidden"}>✓</span></h2><div class="stage">${coverHtml(g, done)}</div><div class="sparkfoot"><button class="nextspark" type="button">Next spark ↓</button></div></div></section>`;
  };
  const coverHtml = (g, done) => `<div class="cover"><div class="coverart" aria-hidden="true">${g.art}</div><p>${g.blurb}</p><span class="coverhint">${done ? "✓ Solved — scroll here to see it again" : "Settle here to play"}</span></div>`;
  const introHtml = (d, offset) => `<section class="spark dayintro" data-day="${d}" data-intro="1"><div class="sparkinner"><span class="eyebrow">${offset === 1 ? "Yesterday" : offset + " days ago"}</span><h2>${new Date(d + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</h2><p class="introcount"><b>${feedCount(d)}</b> of ${FEED_ORDER.length} sparks solved</p><div class="introdots">${FEED_ORDER.map((i) => `<i class="${feedDone(d, i) ? "done" : ""}"></i>`).join("")}</div><p class="small">Every puzzle from that day, waiting just below. ↓</p></div></section>`;
  const noteHtml = () => `<section class="spark notecard" data-note="1"><div class="sparkinner"><div class="coverart" aria-hidden="true">✳ ✴ ✦</div><span class="eyebrow">You made it through today</span><h2 class="notehero">A little play.<br>A lovely little pause.</h2><p class="todaycount"><b class="todaycountnum">${feedCount(feedToday)}</b> of ${FEED_ORDER.length} sparks today</p><p class="lovenote"><span aria-hidden="true">♡</span> Created with love from Devansh</p><p class="small">Keep scrolling for yesterday’s sparks ↓</p></div></section>`;
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
    const pill = $("#todayPill");
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
    chip.innerHTML = `✦ Solved <b>${Math.max(0, n - 1)}</b>/${FEED_ORDER.length}`;
    card.querySelector(".sparkinner").append(chip);
    setTimeout(() => (chip.querySelector("b").textContent = n), reduceMotion.matches ? 0 : 350);
    setTimeout(() => chip.remove(), 2600);
    if (reduceMotion.matches) return;
    try { if ("vibrate" in navigator) navigator.vibrate([20, 40, 20]); } catch {}
    const burst = document.createElement("div"), glyphs = ["✦", "✿", "●", "★", "✳", "♡"], colours = ["#e9a23b", "#d56d4c", "#7da26c", "#5a8fb5", "#c57bb0", "#f2c94c"];
    burst.className = "burst";
    burst.setAttribute("aria-hidden", "true");
    for (let k = 0; k < 28; k++) {
      const p = document.createElement("i"), ang = (k / 28) * Math.PI * 2 + Math.random() * 0.4, dist = 90 + Math.random() * 120;
      p.textContent = glyphs[k % glyphs.length];
      p.style.cssText = `--dx:${Math.cos(ang) * dist}px;--dy:${Math.sin(ang) * dist - 40}px;--rot:${Math.random() * 540 - 270}deg;--delay:${Math.random() * 120}ms;color:${colours[k % colours.length]};font-size:${12 + Math.random() * 14}px`;
      burst.append(p);
    }
    card.append(burst);
    setTimeout(() => burst.remove(), 1500);
  }

  const legacySetup = setup;
  setup = function () {
    legacySetup();
    if (difficulty !== feedLevel) {
      const keep = live ? [live.dataset.day, +live.dataset.idx] : [];
      closeSheets();
      return rebuild(...keep);
    }
    if (live) {
      const done = feedDone(live.dataset.day, +live.dataset.idx);
      refreshCard(live);
      if (done && !liveWasDone) { liveWasDone = true; refreshHeader(); celebrate(live); }
    }
    refreshHeader();
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

  rebuild();
}
