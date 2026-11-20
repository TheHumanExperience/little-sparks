/* Little Sparks — 24 · Where in the World. One real photograph a day; which country was it taken in?
   Gentle shows famous landmarks, Medium recognisable places, Tricky everyday scenes where the clues are
   writing, people, buildings and landscape. Four country choices: Gentle mixes continents, Medium
   mixes near and far, Tricky offers near neighbours. Hint 1 names the continent, hint 2 points at a
   clue in the photo. Gentle lets you keep picking; Medium and Tricky give two tries, and running out
   ends the card as missed ({missed:1, revealed:1}), which never counts.
   Save: {placeId, options, wrong:[country], hints, pick}. The photo and options are pinned on first
   open, so later changes to PLACES never alter a started game. Loaded after sparks.js and places.js. */
const WORLD_REGIONS = {
  Europe: {
    "Western Europe": ["France", "Germany", "Netherlands", "Belgium", "Switzerland", "Austria", "Luxembourg"],
    "Northern Europe": ["United Kingdom", "Ireland", "Iceland", "Norway", "Sweden", "Finland", "Denmark", "Estonia"],
    "Southern Europe": ["Italy", "Vatican City", "Spain", "Portugal", "Greece", "Croatia", "Malta", "Slovenia", "Montenegro", "Albania"],
    "Eastern Europe": ["Poland", "Czech Republic", "Hungary", "Romania", "Bulgaria", "Slovakia", "Russia", "Ukraine"],
  },
  Asia: {
    "West Asia": ["Turkey", "Georgia", "Armenia", "Azerbaijan", "Iran", "Jordan", "United Arab Emirates", "Oman", "Saudi Arabia", "Lebanon", "Qatar"],
    "Central Asia": ["Uzbekistan", "Kazakhstan", "Kyrgyzstan", "Tajikistan", "Turkmenistan"],
    "South Asia": ["India", "Nepal", "Sri Lanka", "Bangladesh", "Pakistan", "Bhutan", "Maldives"],
    "East Asia": ["China", "Japan", "South Korea", "Taiwan", "Mongolia"],
    "Southeast Asia": ["Thailand", "Vietnam", "Cambodia", "Laos", "Myanmar", "Malaysia", "Singapore", "Indonesia", "Philippines"],
  },
  Africa: {
    "North Africa": ["Egypt", "Morocco", "Tunisia", "Algeria", "Sudan"],
    "East Africa": ["Kenya", "Tanzania", "Ethiopia", "Uganda", "Rwanda", "Madagascar"],
    "West Africa": ["Ghana", "Nigeria", "Senegal", "Côte d'Ivoire", "Mali", "Burkina Faso"],
    "Southern Africa": ["South Africa", "Namibia", "Botswana", "Zimbabwe", "Mozambique", "Zambia"],
  },
  "North America": {
    "Northern America": ["United States", "Canada"],
    "Central America and the Caribbean": ["Mexico", "Guatemala", "Cuba", "Costa Rica", "Belize", "Panama", "Jamaica", "Dominican Republic"],
  },
  "South America": {
    "Andes": ["Peru", "Bolivia", "Ecuador", "Colombia", "Chile"],
    "Eastern South America": ["Brazil", "Argentina", "Uruguay", "Paraguay", "Venezuela"],
  },
  Oceania: { Oceania: ["Australia", "New Zealand", "Fiji", "Papua New Guinea", "Samoa"] },
};
const WORLD_COUNTRY = {};
for (const [continent, regions] of Object.entries(WORLD_REGIONS))
  for (const [region, list] of Object.entries(regions)) for (const c of list) WORLD_COUNTRY[c] = { continent, region };

const placeById = (id) => PLACES.find((p) => p.id === id);
const placePool = (lvl) => PLACES.filter((p) => p.level === lvl && !p.retired);
// Days before PLACE_V2_FROM keep the v1 cycle over the original 124 photos, pinned here by id in
// their original order, so growing PLACES never changes an archive day. From PLACE_V2_FROM each
// level cycles its whole pool ("place-v2-"), newer photos first so the switch repeats nothing.
const PLACE_V2_FROM = "9999-12-31";
const PLACE_V1 = [
  "g-acropolis g-alhambra g-angkor g-basil g-bigben g-borobudur g-burj g-charles g-chichen g-cntower g-colosseum g-eiffel g-forbidden g-fuji g-giza g-goldengate g-greatwall g-gyeongbok g-hagia g-kilimanjaro g-kinderdijk g-liberty g-machu g-marina g-milford g-moai g-montstmichel g-neuschwanstein g-opera g-perito g-petra g-petronas g-pisa g-redeemer g-sagrada g-table g-taj g-vatican g-victoria g-watarun",
  "m-angel m-apostles m-bagan m-baobab m-bled m-boudha m-brussels m-budapest m-cappadocia m-cartagena m-chefchaouen m-chocolate m-djenne m-dubrovnik m-galapagos m-geiranger m-hallstatt m-halong m-havana m-hawamahal m-iceland m-inari m-isfahan m-landwasser m-lisbon m-london m-maldives m-matterhorn m-moher m-monument m-moraine m-registan m-santorini m-sigiriya m-sossusvlei m-stonehenge m-taipei m-tigersnest m-tikal m-uluru m-uyuni m-venice m-zhangjiajie",
  "t-accra t-addis t-bali t-bangkok t-bokaap t-cairo t-colombo t-colonia t-cusco t-dhaka t-greekvillage t-hanoi t-ireland t-istanbul t-japanstreet t-jeepney t-jiufen t-kolkata t-krakow t-lagos t-laos t-lapaz t-malta t-marrakech t-mongolia t-moscow t-nairobi t-nizwa t-oaxaca t-okavango t-pakistan t-porto t-quebec t-rothenburg t-seoul t-sweden t-tallinn t-tbilisi t-valparaiso t-yerevan t-zanzibar",
].map((ids) => ids.split(" "));
const PLACE_V2_ORDER = new Map();
// The v2 order: up to 31 newer photos (shuffled), then the rest of the pool (shuffled).
function placeV2Order(lvl) {
  if (!PLACE_V2_ORDER.has(lvl)) {
    const r = rng("place-v2-" + lvl), v1 = new Set(PLACE_V1[lvl]), pool = placePool(lvl);
    const fresh = shuffle(pool.filter((p) => !v1.has(p.id)), r), lead = fresh.slice(0, 31);
    PLACE_V2_ORDER.set(lvl, [...lead, ...shuffle([...fresh.slice(31), ...pool.filter((p) => v1.has(p.id))], r)]);
  }
  return PLACE_V2_ORDER.get(lvl);
}
// The day's photo. `from` is only overridden by verify-places.cjs to test the v2 cycle.
function placePick(d, lvl, from = PLACE_V2_FROM) {
  if (d < from) return placeById(PLACE_V1[lvl][cycleIndex(PLACE_V1[lvl].length, "place-v1-" + lvl, d, lvl * 7)]);
  const order = placeV2Order(lvl);
  return order[mod(calendarIndex(d) - calendarIndex(from), order.length)];
}
// Three other countries plus the answer, shuffled. Gentle: three other continents. Medium: one from
// the same region, one more from the same continent, one from elsewhere. Tricky: same region first.
function placeOptions(country, lvl, r) {
  const home = WORLD_COUNTRY[country], pick = (list, n) => shuffle(list, r).slice(0, n);
  const others = Object.keys(WORLD_COUNTRY).filter((c) => c !== country);
  const sameRegion = others.filter((c) => WORLD_COUNTRY[c].region === home.region);
  const sameContinent = others.filter((c) => WORLD_COUNTRY[c].continent === home.continent && WORLD_COUNTRY[c].region !== home.region);
  let out;
  if (lvl === 0) out = pick(Object.keys(WORLD_REGIONS).filter((k) => k !== home.continent), 3).map((k) => pick(others.filter((c) => WORLD_COUNTRY[c].continent === k), 1)[0]);
  else if (lvl === 1) {
    const near = pick(sameRegion.length ? sameRegion : sameContinent, 1);
    const mid = pick([...sameRegion, ...sameContinent].filter((c) => !near.includes(c)), 1);
    out = [...near, ...mid, ...pick(others.filter((c) => WORLD_COUNTRY[c].continent !== home.continent), 1)];
  } else out = [...pick(sameRegion, 3), ...pick(sameContinent, 3)].slice(0, 3);
  return shuffle([country, ...out], r);
}
function placeModel(d, lvl = difficulty, from = PLACE_V2_FROM) {
  const place = placePick(d, lvl, from);
  return { place, options: placeOptions(place.country, lvl, rng(puzzleSeed(d) + "place")) };
}
function savedPlace(d, s) {
  if (s.placeId && placeById(s.placeId)) return { place: placeById(s.placeId), options: s.options };
  const m = placeModel(d);
  Object.assign(s, { placeId: m.place.id, options: m.options.slice() });
  return m;
}
const PLACE_TRIES = [Infinity, 2, 2];
// Judges a pick: "right", "wrong" (try again) or "out" (no tries left). Records it in the save.
function placeTry(s, m, country) {
  s.wrong ||= [];
  if (country === m.place.country) { s.pick = country; return "right"; }
  if (!s.wrong.includes(country)) s.wrong.push(country);
  return s.wrong.length >= PLACE_TRIES[difficulty] ? "out" : "wrong";
}
function placeHints(m) {
  const home = WORLD_COUNTRY[m.place.country];
  return [`It's in ${home.continent}${difficulty === 2 ? ` (${home.region})` : ""}.`, m.place.clue];
}
function whereWorld(i) {
  const s = state(i), m = savedPlace(day, s), p = m.place, hints = placeHints(m), tries = PLACE_TRIES[difficulty];
  s.wrong ||= [];
  s.hints ||= 0;
  persist();
  $("#rules").textContent = "Where in the world was this photograph taken? Look for little clues: writing on signs, clothes, buildings, plants and the shape of the land. " +
    (tries === Infinity ? "Pick a country; a wrong one fades so you can try again." : `Pick a country. You have ${tries} tries.`);
  function draw() {
    const over = s.done;
    $("#board").innerHTML = `<div class="photoframe placeframe"><img id="placephoto" src="${p.image}" alt="${over ? p.alt : p.alt.replace(new RegExp(p.country, "gi"), "this country")}"></div>` +
      (s.hints ? `<aside class="photo-clue"><strong>${s.hints === 1 ? "A little hint" : "Little hints"}</strong>${hints.slice(0, s.hints).map((h) => `<p>${h}</p>`).join("")}</aside>` : "") +
      `<div class="placeopts">${m.options.map((c) => {
        const right = over && c === p.country, ruled = s.wrong.includes(c);
        return `<button class="choice placeopt ${ruled ? "ruled" : ""} ${right ? "right" : ""}" data-place="${c}" ${over || ruled ? "disabled" : ""}>${c}${right ? " ✦" : ""}</button>`;
      }).join("")}</div>` +
      (!over && tries !== Infinity ? `<p class="small">${tries - s.wrong.length} ${tries - s.wrong.length === 1 ? "try" : "tries"} left</p>` : "") +
      (over ? `<div class="reveal ${s.missed ? "" : "found"}"><span class="eyebrow">${s.missed || s.revealed ? "IT WAS" : "YOU FOUND IT ✦"}</span><h2>${p.country}</h2><strong>${p.title}</strong><p>${p.story}</p><a href="${p.source}" target="_blank" rel="noopener">${p.credit} · Source ↗</a>${p.licenseUrl ? ` · <a href="${p.licenseUrl}" target="_blank" rel="noopener">${p.licence} ↗</a>` : ""}</div>` : "") +
      `<p class="credits">Photographs from Wikimedia Commons under free licences; credits appear after each round.</p>`;
    $("#board").querySelectorAll("[data-place]").forEach((b) => (b.onclick = () => {
      if (s.done) return;
      const c = b.dataset.place, got = placeTry(s, m, c);
      persist();
      if (got === "right") sparkSolved(s.wrong.length ? `Yes, ${c}! You got there.` : `Yes, ${c}, first try! A traveller's eye. ✦`);
      else if (got === "out") { Object.assign(s, { done: true, revealed: 1, missed: 1 }); persist(); setup(); msg(`Not this time. It was ${p.country}.`); }
      else msg(`Not ${c}. Look again${s.hints < hints.length ? ", or take a hint" : ""}.`);
      draw();
    }));
  }
  draw();
  action("A gentle hint", () => {
    if (s.done) return;
    if (s.hints >= hints.length) return msg("That's every hint for this one. Trust your eyes!");
    s.hints++;
    persist();
    draw();
    msg(hints[s.hints - 1]);
  }, true);
}
SPARKS[24] = { name: "Where in the World", blurb: "One photograph. Which country?", type: "Observation", art: "◍ ? ◍", render: whereWorld };
