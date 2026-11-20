/* Little Sparks — 24 · Where in the World. One real photograph a day; which country was it taken in?
   Gentle shows famous landmarks, Medium recognisable places, Tricky everyday scenes where the clues are
   writing, people, buildings and landscape. Four country choices: Gentle mixes continents, Medium
   mixes near and far, Tricky offers near neighbours. Hint 1 names the continent, hint 2 points at a
   clue in the photo. Gentle lets you keep picking; Medium and Tricky give two tries, and running out
   ends the card as missed ({missed:1, revealed:1}), which never counts.
   From PLACE_V2_FROM, Tricky asks for the city whenever the photo shows one (the clues are in the
   streets): four cities from WORLD_CITIES, mixing the same country and its neighbours, and hint 1
   names the country. Nature photos (city null) keep the country question.
   Save: {placeId, options, wrong:[country or city], hints, pick, city?}. `city` (the answer city) is
   saved only on a city question; without it the game is a country question. The photo, options and
   question are pinned on first open, so later changes never alter a started game.
   Loaded after sparks.js and places.js. */
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
// Cities for the Tricky city question (from PLACE_V2_FROM): every city a Tricky photo shows, plus real
// cities of each country to offer as decoys. A city name appears once in the whole table. Adding or
// reordering cities changes v2 Tricky options, so only do it before PLACE_V2_FROM or behind a new cycle.
const WORLD_CITIES = {};
for (const line of `France: Paris, Lyon, Marseille, Bordeaux, Strasbourg
Germany: Rothenburg ob der Tauber, Berlin, Munich, Hamburg, Cologne, Heidelberg
Netherlands: Amsterdam, Rotterdam, Utrecht, The Hague, Delft
Belgium: Brussels, Bruges, Antwerp, Ghent
Switzerland: Zurich, Geneva, Bern, Lucerne
Austria: Vienna, Salzburg, Innsbruck, Graz
Luxembourg: Luxembourg City, Esch-sur-Alzette
United Kingdom: London, Edinburgh, Manchester, Bath, York
Ireland: Dublin, Galway, Cork, Limerick
Iceland: Reykjavík, Akureyri
Norway: Oslo, Bergen, Trondheim, Tromsø
Sweden: Stockholm, Gothenburg, Malmö, Uppsala
Finland: Helsinki, Turku, Tampere, Rovaniemi
Denmark: Copenhagen, Aarhus, Odense
Estonia: Tallinn, Tartu, Pärnu
Italy: Rome, Florence, Naples, Milan, Bologna
Spain: Madrid, Barcelona, Seville, Valencia, Granada
Portugal: Porto, Lisbon, Coimbra, Braga, Faro
Greece: Athens, Thessaloniki, Chania, Nafplio
Croatia: Zagreb, Split, Dubrovnik, Zadar
Malta: Valletta, Mdina, Sliema
Slovenia: Ljubljana, Piran, Maribor
Montenegro: Kotor, Podgorica, Budva
Albania: Tirana, Berat, Gjirokastër
Poland: Kraków, Warsaw, Gdańsk, Wrocław, Poznań
Czech Republic: Prague, Brno, Český Krumlov, Olomouc
Hungary: Budapest, Debrecen, Pécs, Szeged
Romania: Bucharest, Brașov, Sibiu, Cluj-Napoca
Bulgaria: Sofia, Plovdiv, Varna, Veliko Tarnovo
Slovakia: Bratislava, Košice, Banská Štiavnica
Russia: Moscow, Saint Petersburg, Kazan, Novosibirsk
Ukraine: Lviv, Kyiv, Odesa, Kharkiv
Turkey: Istanbul, Ankara, Izmir, Antalya, Bursa
Georgia: Tbilisi, Batumi, Kutaisi
Armenia: Yerevan, Gyumri, Dilijan
Azerbaijan: Baku, Ganja, Sheki
Iran: Qom, Tehran, Isfahan, Shiraz, Tabriz, Yazd
Jordan: Amman, Aqaba, Madaba, Irbid
United Arab Emirates: Dubai, Abu Dhabi, Sharjah
Oman: Nizwa, Muscat, Salalah, Sur
Saudi Arabia: Riyadh, Jeddah, Medina
Lebanon: Beirut, Byblos, Sidon
Qatar: Doha, Al Wakrah, Al Khor
Uzbekistan: Tashkent, Samarkand, Bukhara, Khiva
Kazakhstan: Almaty, Astana, Shymkent
Kyrgyzstan: Bishkek, Osh, Karakol
Tajikistan: Dushanbe, Khujand
Turkmenistan: Ashgabat, Türkmenabat
India: Delhi, Mysuru, Kolkata, Mumbai, Jaipur, Chennai, Varanasi, Hyderabad
Nepal: Kathmandu, Pokhara, Bhaktapur, Patan
Sri Lanka: Colombo, Kandy, Galle, Jaffna
Bangladesh: Dhaka, Chittagong, Sylhet, Khulna
Pakistan: Lahore, Karachi, Islamabad, Peshawar
Bhutan: Thimphu, Paro, Punakha
Maldives: Malé, Addu City
China: Hong Kong, Beijing, Shanghai, Chengdu, Xi'an, Guangzhou
Japan: Tokyo, Kyoto, Osaka, Nara, Sapporo
South Korea: Seoul, Busan, Gyeongju, Incheon
Taiwan: Taipei, Tainan, Kaohsiung, Taichung
Mongolia: Ulaanbaatar, Erdenet, Darkhan
Thailand: Bangkok, Chiang Mai, Ayutthaya, Phuket
Vietnam: Hanoi, Ho Chi Minh City, Hội An, Huế, Da Nang
Cambodia: Phnom Penh, Siem Reap, Battambang, Kampot
Laos: Luang Prabang, Vientiane, Pakse
Myanmar: Yangon, Mandalay, Bagan
Malaysia: Kuala Lumpur, George Town, Malacca, Kota Kinabalu
Singapore: Singapore
Indonesia: Jakarta, Yogyakarta, Bandung, Surabaya, Ubud
Philippines: Manila, Cebu City, Davao, Vigan
Egypt: Cairo, Luxor, Alexandria, Aswan
Morocco: Fes, Marrakesh, Casablanca, Chefchaouen, Rabat
Tunisia: Tunis, Sousse, Kairouan, Sfax
Algeria: Algiers, Oran, Constantine
Sudan: Khartoum, Omdurman, Port Sudan
Kenya: Nairobi, Mombasa, Kisumu, Lamu
Tanzania: Zanzibar City, Dar es Salaam, Arusha, Dodoma
Ethiopia: Addis Ababa, Gondar, Lalibela, Harar
Uganda: Kampala, Entebbe, Jinja, Gulu
Rwanda: Kigali, Huye, Musanze
Madagascar: Antananarivo, Toamasina, Fianarantsoa
Ghana: Accra, Kumasi, Cape Coast, Tamale
Nigeria: Lagos, Abuja, Ibadan, Kano
Senegal: Dakar, Saint-Louis, Touba, Ziguinchor
Côte d'Ivoire: Abidjan, Yamoussoukro, Bouaké
Mali: Bamako, Timbuktu, Mopti
Burkina Faso: Ouagadougou, Bobo-Dioulasso
South Africa: Cape Town, Johannesburg, Durban, Pretoria, Stellenbosch
Namibia: Windhoek, Swakopmund, Lüderitz
Botswana: Gaborone, Maun, Francistown
Zimbabwe: Harare, Bulawayo, Victoria Falls
Mozambique: Maputo, Beira, Inhambane
Zambia: Lusaka, Livingstone, Ndola
United States: New Orleans, New York, Chicago, San Francisco, Boston, Seattle
Canada: Quebec City, Montreal, Toronto, Vancouver, Halifax
Mexico: Mexico City, Oaxaca, Guadalajara, Puebla, Mérida
Guatemala: Guatemala City, Antigua Guatemala, Quetzaltenango
Cuba: Havana, Trinidad, Santiago de Cuba, Cienfuegos
Costa Rica: San José, Limón, Puntarenas
Belize: Belize City, Belmopan, San Ignacio
Panama: Panama City, Colón, David
Jamaica: Kingston, Montego Bay, Ocho Rios
Dominican Republic: Santo Domingo, Puerto Plata, Santiago de los Caballeros
Peru: Cusco, Lima, Arequipa, Trujillo
Bolivia: La Paz, Sucre, Potosí, Santa Cruz de la Sierra
Ecuador: Quito, Guayaquil, Cuenca
Colombia: Medellín, Bogotá, Cartagena, Cali
Chile: Valparaíso, Santiago, Punta Arenas, La Serena
Brazil: Rio de Janeiro, São Paulo, Salvador, Ouro Preto, Manaus
Argentina: Buenos Aires, Mendoza, Salta, Ushuaia
Uruguay: Colonia del Sacramento, Montevideo, Punta del Este, Salto
Paraguay: Asunción, Encarnación, Ciudad del Este
Venezuela: Caracas, Maracaibo, Ciudad Bolívar
Australia: Melbourne, Sydney, Perth, Brisbane, Hobart
New Zealand: Wellington, Auckland, Christchurch, Queenstown
Fiji: Suva, Nadi, Lautoka
Papua New Guinea: Port Moresby, Lae, Madang
Samoa: Apia, Salelologa`.split("\n")) { const [country, list] = line.split(": "); WORLD_CITIES[country] = list.split(", "); }

const placeById = (id) => PLACES.find((p) => p.id === id);
const placePool = (lvl) => PLACES.filter((p) => p.level === lvl && !p.retired);
// Days before PLACE_V2_FROM keep the v1 cycle over the original 124 photos, pinned here by id in
// their original order, so growing PLACES never changes an archive day. From PLACE_V2_FROM each
// level cycles its whole pool ("place-v2-"), newer photos first so the switch repeats nothing.
const PLACE_V2_FROM = "2026-11-22";
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
// Three other cities plus the answer, shuffled: one or two more from the same country (so knowing the
// country still leaves a choice), then one city each from neighbouring countries in the same region,
// then the rest of the continent if the region runs short.
function placeCityOptions(place, r) {
  const home = WORLD_COUNTRY[place.country], pick = (list, n) => shuffle(list, r).slice(0, n);
  const same = WORLD_CITIES[place.country].filter((c) => c !== place.city);
  const others = Object.keys(WORLD_CITIES).filter((c) => c !== place.country && WORLD_COUNTRY[c].continent === home.continent);
  const out = pick(same, r() < 0.5 ? 1 : 2);
  for (const c of [...pick(others.filter((c) => WORLD_COUNTRY[c].region === home.region), 9), ...pick(others.filter((c) => WORLD_COUNTRY[c].region !== home.region), 99)])
    if (out.length < 3) out.push(pick(WORLD_CITIES[c], 1)[0]);
  return shuffle([place.city, ...out], r);
}
// The day's photo and four options. `city` (the answer) is set only on a Tricky city question.
function placeModel(d, lvl = difficulty, from = PLACE_V2_FROM) {
  const place = placePick(d, lvl, from);
  if (lvl === 2 && place.city && d >= from) return { place, options: placeCityOptions(place, rng(puzzleSeed(d) + "place-city")), city: place.city };
  return { place, options: placeOptions(place.country, lvl, rng(puzzleSeed(d) + "place")) };
}
const placeAnswer = (m) => m.city || m.place.country;
function savedPlace(d, s) {
  if (s.placeId && placeById(s.placeId)) return { place: placeById(s.placeId), options: s.options, ...(s.city ? { city: s.city } : {}) };
  const m = placeModel(d);
  Object.assign(s, { placeId: m.place.id, options: m.options.slice() }, m.city ? { city: m.city } : {});
  return m;
}
const PLACE_TRIES = [Infinity, 2, 2];
// Judges a pick (a country, or a city on a city question): "right", "wrong" (try again) or "out" (no
// tries left). Records it in the save.
function placeTry(s, m, pick) {
  s.wrong ||= [];
  if (pick === placeAnswer(m)) { s.pick = pick; return "right"; }
  if (!s.wrong.includes(pick)) s.wrong.push(pick);
  return s.wrong.length >= PLACE_TRIES[difficulty] ? "out" : "wrong";
}
// Hint 1 names the continent (on Tricky, the region too); on a city question it names the country,
// unless no other option is in that country (Singapore), where the country would give the answer away.
function placeHints(m) {
  const home = WORLD_COUNTRY[m.place.country], region = `It's in ${home.continent} (${home.region}).`;
  if (m.city) return [m.options.some((c) => c !== m.city && WORLD_CITIES[m.place.country]?.includes(c)) ? `It's in ${m.place.country}.` : region, m.place.clue];
  return [difficulty === 2 ? region : `It's in ${home.continent}.`, m.place.clue];
}
function whereWorld(i) {
  const s = state(i), m = savedPlace(day, s), p = m.place, hints = placeHints(m), tries = PLACE_TRIES[difficulty], answer = placeAnswer(m);
  const what = m.city ? "city" : "country", named = m.city && m.city !== p.country ? `${m.city}, ${p.country}` : answer;
  s.wrong ||= [];
  s.hints ||= 0;
  persist();
  $("#rules").textContent = "Where in the world was this photograph taken? Look for little clues: writing on signs, clothes, buildings, plants and the shape of the land. " +
    (m.city ? "On Tricky the clues are in the streets, so name the city. " : difficulty === 2 && day >= PLACE_V2_FROM ? "Out in nature there are no streets to read, so name the country. " : "") +
    (tries === Infinity ? "Pick a country; a wrong one fades so you can try again." : `Pick a ${what}. You have ${tries} tries.`);
  function draw() {
    const over = s.done;
    $("#board").innerHTML = `<div class="photoframe placeframe"><img id="placephoto" src="${p.image}" alt="${over ? p.alt : p.alt.replace(new RegExp(p.country, "gi"), "this country")}"></div>` +
      (s.hints ? `<aside class="photo-clue"><strong>${s.hints === 1 ? "A little hint" : "Little hints"}</strong>${hints.slice(0, s.hints).map((h) => `<p>${h}</p>`).join("")}</aside>` : "") +
      `<div class="placeopts">${m.options.map((c) => {
        const right = over && c === answer, ruled = s.wrong.includes(c);
        return `<button class="choice placeopt ${ruled ? "ruled" : ""} ${right ? "right" : ""}" data-place="${c}" ${over || ruled ? "disabled" : ""}>${c}${right ? " ✦" : ""}</button>`;
      }).join("")}</div>` +
      (!over && tries !== Infinity ? `<p class="small">${tries - s.wrong.length} ${tries - s.wrong.length === 1 ? "try" : "tries"} left</p>` : "") +
      (over ? `<div class="reveal ${s.missed ? "" : "found"}"><span class="eyebrow">${s.missed || s.revealed ? "IT WAS" : "YOU FOUND IT ✦"}</span><h2>${named}</h2><strong>${p.title}</strong><p>${p.story}</p><a href="${p.source}" target="_blank" rel="noopener">${p.credit} · Source ↗</a>${p.licenseUrl ? ` · <a href="${p.licenseUrl}" target="_blank" rel="noopener">${p.licence} ↗</a>` : ""}</div>` : "") +
      `<p class="credits">Photographs from Wikimedia Commons under free licences; credits appear after each round.</p>`;
    $("#board").querySelectorAll("[data-place]").forEach((b) => (b.onclick = () => {
      if (s.done) return;
      const c = b.dataset.place, got = placeTry(s, m, c);
      persist();
      if (got === "right") sparkSolved(s.wrong.length ? `Yes, ${c}! You got there.` : `Yes, ${c}, first try! A traveller's eye. ✦`);
      else if (got === "out") { Object.assign(s, { done: true, revealed: 1, missed: 1 }); persist(); setup(); msg(`Not this time. It was ${named}.`); }
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
