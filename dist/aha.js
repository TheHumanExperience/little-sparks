/* Aha track — five logical-reasoning questions a day (state indexes 3, 17, 18, 19, 20), drawn
   from ten category generators (number and logic groups alternate). Gentle/Medium are multiple
   choice; Tricky asks you to type the answer. A question is a pure function of (date, difficulty, slot).
   Every generator builds a puzzle, then brute-forces it with ahaSolve() and retries until
   exactly one answer survives. verify-aha.cjs re-runs the same solvers. */
const AHA_SLOTS = [3, 17, 18, 19, 20];
const AHA_CATS = [
  { id: "percent", name: "Profit & Percentages", group: "numbers", type: "Logical reasoning", art: "% ₹", blurb: "Mark-ups, discounts and the percentage traps that catch everyone." },
  { id: "order", name: "Seating Arrangement", group: "logic", type: "Logical reasoning", art: "▢ ▢ ▣ ▢", blurb: "A handful of clues, exactly one order." },
  { id: "tsd", name: "Speed, Time & Work", group: "numbers", type: "Logical reasoning", art: "⇢ ⏱", blurb: "Trains, boats, taps and teamwork." },
  { id: "liars", name: "Truth & Lies", group: "logic", type: "Logical reasoning", art: "☺ ☹ ?", blurb: "Some always tell the truth. Some never do." },
  { id: "numbers", name: "Number Puzzles", group: "numbers", type: "Logical reasoning", art: "7 ÷ 3 = 2 r1", blurb: "Remainders, divisors, cycles and LCMs." },
  { id: "di", name: "Read the Table", group: "logic", type: "Logical reasoning", art: "▤ ▥ ▦", blurb: "Read the table, dodge the trap." },
  { id: "ratio", name: "Ratios & Mixtures", group: "numbers", type: "Logical reasoning", art: "2 : 3", blurb: "Blends, ages and shares." },
  { id: "grid", name: "Logic Grid", group: "logic", type: "Logical reasoning", art: "✓ ✗ ✗", blurb: "Cross out the impossible." },
  { id: "guarantee", name: "Counting & Chance", group: "numbers", type: "Logical reasoning", art: "● ● ○", blurb: "Plan for the unluckiest draw." },
  { id: "clock", name: "Clocks & Calendars", group: "logic", type: "Logical reasoning", art: "◷ ▦", blurb: "Hands, hours and weekdays." },
];
const AHA_NAMES = ["Asha", "Bilal", "Chitra", "Dev", "Esha", "Farhan", "Gauri", "Hari", "Ira", "Jai", "Kavya", "Leela", "Manav", "Neel", "Ojas", "Pari", "Rhea", "Sahil", "Tara", "Uma", "Vikram", "Zoya", "Anya", "Kabir", "Meera", "Rohan", "Sana", "Arjun", "Diya", "Ishaan", "Naina", "Vihaan", "Aditi", "Kiran", "Mira", "Noor", "Tanvi", "Yash", "Ved", "Riya", "Om", "Lata", "Nikhil", "Pooja", "Sameer", "Tejas"];
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const ahaInt = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
const ahaPick = (r, a) => a[Math.floor(r() * a.length)];
const ahaOrd = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th");
const ahaFmt = (n) => Math.round(n).toLocaleString("en-IN");
const ahaUniq = (a) => [...new Set(a.map(String))];
function ahaPerms(n) {
  const out = [], go = (p, used) => { if (p.length === n) return out.push(p); for (let i = 0; i < n; i++) if (!(used >> i & 1)) go([...p, i], used | 1 << i); };
  go([], 0);
  return out;
}
const AHA_PERMS = new Map();
const permsOf = (n) => AHA_PERMS.get(n) || (AHA_PERMS.set(n, ahaPerms(n)), AHA_PERMS.get(n));

/* Which five categories a date shows: a window sliding through all ten (number and logic
   groups alternate in AHA_CATS, so every day mixes both), shuffled into slots. */
function ahaCategories(d) {
  const N = AHA_CATS.length, start = mod(calendarIndex(d) * 3 + difficulty * 7, N);
  return shuffle([0, 1, 2, 3, 4].map((j) => mod(start + j, N)), rng(puzzleSeed(d) + "|aha-order"));
}

/* ───────── Solvers: every one returns the list of distinct answers the data allows ───────── */
const LIAR_EVAL = {
  liar: (s, T) => !T(s.x), truth: (s, T) => T(s.x), same: (s, T) => T(s.x) === T(s.y), diff: (s, T) => T(s.x) !== T(s.y),
  count: (s, T, m, n) => [...Array(n).keys()].filter(T).length === s.k, oneLiar: (s, T) => !T(s.x) || !T(s.y),
};
const ORDER_EVAL = {
  at: (c, p) => p[c.a] === c.k, imm: (c, p) => p[c.a] + 1 === p[c.b], before: (c, p) => p[c.a] < p[c.b],
  end: (c, p, n) => p[c.a] === 1 || p[c.a] === n, apart: (c, p) => Math.abs(p[c.a] - p[c.b]) !== 1, gap: (c, p) => Math.abs(p[c.a] - p[c.b]) === c.k + 1,
};
function gridSolve(d) {
  const P = permsOf(d.n), out = new Set();
  const rec = (k, asg) => {
    if (k === d.attrs.length) {
      const has = (p, a, v) => asg[a][p] === v;
      const holder = (a, v) => asg[a].indexOf(v);
      const ok = d.clues.every((c) => c.t === "is" ? has(c.p, c.a, c.v) : c.t === "not" ? !has(c.p, c.a, c.v) : c.t === "link" ? holder(c.a, c.v) === holder(c.b, c.w) : holder(c.a, c.v) !== holder(c.b, c.w));
      if (ok) out.add(d.full ? asg.join("|") : d.names[holder(d.ask.a, d.ask.v)]);
      return;
    }
    for (const p of P) rec(k + 1, [...asg, p]);
  };
  rec(0, []);
  return [...out];
}
const AHA_SOLVE = {
  liars(d) {
    const out = new Set(), n = d.names.length;
    for (let m = 0; m < 1 << n; m++) {
      const T = (i) => !!(m >> i & 1);
      if (!d.stm.every((s, i) => LIAR_EVAL[s.t](s, T, m, n) === T(i))) continue;
      const pick = d.names.filter((_, i) => T(i) === (d.ask === "truth"));
      out.add(pick.length === 1 ? pick[0] : "×" + pick.join(","));
    }
    return [...out];
  },
  order(d) {
    const out = new Set(), n = d.names.length;
    for (const perm of permsOf(n)) {
      const p = []; perm.forEach((who, k) => (p[who] = k + 1));
      if (d.clues.every((c) => ORDER_EVAL[c.t](c, p, n))) out.add(d.names[perm[d.pos - 1]]);
    }
    return [...out];
  },
  guarantee(d) {
    if (d.t === "dice") { let n = 0; const go = (k, sum) => { if (k === d.n) { n += d.atLeast ? sum >= d.s : sum === d.s; return; } for (let f = 1; f <= 6; f++) go(k + 1, sum + f); }; go(0, 0); return [String(n)]; }
    if (d.t === "pigeon") { if (d.N) { let best = 0; for (let most = 1; most <= d.N; most++) if (most * d.boxes >= d.N) { best = most; break; } return [String(best)]; } let n = 1; while (Math.ceil(n / d.boxes) < d.k) n++; return [String(n)]; }
    if (d.t === "chance") { const g = (a, b) => (b ? g(b, a % b) : a), t = d.counts.reduce((a, b) => a + b, 0), c = d.counts[d.want], q = g(c, t); return [`${c / q}/${t / q}`]; }
    // Worst case, found by brute force: the longest draw that still misses the goal, plus one.
    let worst = 0;
    const draw = (j, took) => {
      if (j === d.counts.length) {
        const n = took.reduce((a, b) => a + b, 0), miss = d.t === "same" ? took.every((v) => v < d.k) : d.t === "every" ? took.some((v) => !v) : took.filter(Boolean).length < 2;
        if (miss) worst = Math.max(worst, n);
        return;
      }
      for (let v = 0; v <= d.counts[j]; v++) draw(j + 1, [...took, v]);
    };
    draw(0, []);
    return [String(worst + 1)];
  },
  clock(d) {
    if (d.t === "angle") { const a = Math.abs(30 * d.h - 5.5 * d.m) % 360; return [String(Math.min(a, 360 - a))]; }
    if (d.t === "weekday") return [WEEKDAYS[mod(d.from + d.e - d.s, 7)]];
    if (d.t === "elapsed") return [String(mod(d.h2 * 60 + d.m2 - d.h1 * 60 - d.m1, 1440))];
    return [String(d.loss * d.hours)];
  },
  grid: gridSolve,
};
function ahaSolve(cat, data) { return AHA_SOLVE[AHA_CATS[cat].id](data); }

/* ───────── Generators ───────── */
function genLiars(r, lv) {
  const n = lv === 2 ? 4 : 3, place = ahaPick(r, ["On Riddle Island", "In the village of Sach-Jhooth", "At the midnight puzzle fair", "In the hall of mirrors", "On the ferry to Twin Rock"]);
  const kinds = ahaPick(r, [["truth-teller", "truth-tellers", "liar", "liars"], ["knight", "knights", "knave", "knaves"], ["honest guide", "honest guides", "trickster", "tricksters"]]);
  for (;;) {
    const names = shuffle(AHA_NAMES, r).slice(0, n), stm = names.map((_, s) => {
      const others = [...Array(n).keys()].filter((i) => i !== s), [x, y] = shuffle(others, r);
      const t = ahaPick(r, lv === 0 ? ["liar", "truth", "liar", "same", "diff"] : ["liar", "truth", "same", "diff", "count", "oneLiar"]);
      return { t, x, y, k: ahaInt(r, 0, n - 1) };
    });
    const ask = r() < 0.5 ? "truth" : "liar", sols = AHA_SOLVE.liars({ names, stm, ask });
    if (sols.length !== 1 || sols[0].startsWith("×")) continue;
    const say = (s) => {
      const X = names[s.x], Y = names[s.y];
      return {
        liar: ahaPick(r, [`${X} is a ${kinds[2]}.`, `Don't trust ${X}.`, `${X} never tells the truth.`]),
        truth: ahaPick(r, [`${X} is a ${kinds[0]}.`, `${X} always tells the truth.`, `You can trust ${X}.`]),
        same: ahaPick(r, [`${X} and ${Y} are the same kind.`, `${X} and ${Y} are both ${kinds[1]} or both ${kinds[3]}.`]),
        diff: ahaPick(r, [`${X} and ${Y} are different kinds.`, `Exactly one of ${X} and ${Y} is a ${kinds[0]}.`]),
        count: s.k === 0 ? `None of us is a ${kinds[0]}.` : `Exactly ${s.k} of us ${s.k === 1 ? "is a " + kinds[0] : "are " + kinds[1]}.`,
        oneLiar: `At least one of ${X} and ${Y} is a ${kinds[2]}.`,
      }[s.t];
    };
    const a = sols[0];
    const truthful = [];
    for (let m = 0; m < 1 << n; m++) if (stm.every((s, i) => LIAR_EVAL[s.t](s, (j) => !!(m >> j & 1), m, n) === !!(m >> i & 1))) names.forEach((nm, i) => m >> i & 1 && truthful.push(nm));
    return {
      data: { names, stm, ask }, kind: "name", options: names, a,
      intro: `${place}, every ${kinds[0]} always tells the truth and every ${kinds[2]} always lies. You meet ${names.slice(0, -1).join(", ")} and ${names.at(-1)}.`,
      clues: stm.map((s, i) => `${names[i]}: “${say(s)}”`),
      ask: ask === "truth" ? `Exactly one of them is a ${kinds[0]}. Who?` : `Exactly one of them is a ${kinds[2]}. Who?`,
      hint: `Suppose ${names[0]} is a ${kinds[0]}. Follow what that forces, and look for a contradiction.`,
      why: `Only one arrangement fits every statement: ${truthful.length ? truthful.join(" and ") + (truthful.length === 1 ? " tells" : " tell") + " the truth" : "nobody tells the truth"}, and the rest lie. So the answer is ${a}.`,
    };
  }
}

const ORDER_CTX = [
  { intro: (n) => `${n} friends sit in a row of seats numbered 1 to ${n} from the left.`, at: (a, k) => `${a} sits in seat ${k}.`, imm: (a, b) => `${a} sits immediately to the left of ${b}.`, before: (a, b) => `${a} sits somewhere to the left of ${b}.`, end: (a) => `${a} sits at one end of the row.`, apart: (a, b) => `${a} and ${b} don't sit next to each other.`, gap: (a, b, k) => `Exactly ${k} ${k === 1 ? "person sits" : "people sit"} between ${a} and ${b}.`, ask: (k) => `Who sits in seat ${k}?` },
  { intro: (n) => `${n} runners finish a park race, with no ties.`, at: (a, k) => `${a} finishes ${ahaOrd(k)}.`, imm: (a, b) => `${a} crosses the line just before ${b}.`, before: (a, b) => `${a} finishes ahead of ${b}.`, end: (a) => `${a} finishes either first or last.`, apart: (a, b) => `${a} and ${b} don't finish one straight after the other.`, gap: (a, b, k) => `Exactly ${k} ${k === 1 ? "runner finishes" : "runners finish"} between ${a} and ${b}.`, ask: (k) => `Who finishes ${ahaOrd(k)}?` },
  { intro: (n) => `${n} people wait in a queue at the chai stall. Place 1 is the front.`, at: (a, k) => `${a} is ${ahaOrd(k)} in the queue.`, imm: (a, b) => `${a} stands directly in front of ${b}.`, before: (a, b) => `${a} is somewhere ahead of ${b}.`, end: (a) => `${a} is at the very front or the very back.`, apart: (a, b) => `${a} and ${b} aren't standing next to each other.`, gap: (a, b, k) => `Exactly ${k} ${k === 1 ? "person stands" : "people stand"} between ${a} and ${b}.`, ask: (k) => `Who is ${ahaOrd(k)} in the queue?` },
  { intro: (n) => `${n} neighbours live in a lane of houses numbered 1 to ${n}.`, at: (a, k) => `${a} lives at number ${k}.`, imm: (a, b) => `${b} lives at the number just after ${a}.`, before: (a, b) => `${a}'s house number is lower than ${b}'s.`, end: (a) => `${a} lives at one end of the lane.`, apart: (a, b) => `${a} and ${b} aren't next-door neighbours.`, gap: (a, b, k) => `Exactly ${k} ${k === 1 ? "house lies" : "houses lie"} between ${a}'s and ${b}'s.`, ask: (k) => `Who lives at number ${k}?` },
];
function genOrder(r, lv) {
  const n = [4, 5, 6][lv], ctx = ahaPick(r, ORDER_CTX), names = shuffle(AHA_NAMES, r).slice(0, n);
  for (;;) {
    const perm = shuffle([...Array(n).keys()], r), p = []; perm.forEach((who, k) => (p[who] = k + 1));
    const pos = ahaInt(r, 1, n), hidden = perm[pos - 1], clues = [];
    for (let guard = 0; guard < 200 && AHA_SOLVE.order({ names, clues, pos }).length > 1; guard++) {
      const t = ahaPick(r, ["imm", "before", "before", "end", "apart", "gap", "gap", "at"]), [a, b] = shuffle([...Array(n).keys()], r);
      let c = null;
      if (t === "imm" && p[a] + 1 === p[b]) c = { t, a, b };
      if (t === "before") c = p[a] < p[b] ? { t, a, b } : { t, a: b, b: a };
      if (t === "end" && (p[a] === 1 || p[a] === n)) c = { t, a };
      if (t === "apart" && Math.abs(p[a] - p[b]) > 1) c = { t, a, b };
      if (t === "gap" && Math.abs(p[a] - p[b]) > 1) c = { t, a, b, k: Math.abs(p[a] - p[b]) - 1 };
      if (t === "at" && a !== hidden && !clues.some((q) => q.t === "at")) c = { t, a, k: p[a] };
      if (!c) continue;
      const before = AHA_SOLVE.order({ names, clues, pos }).length;
      if (AHA_SOLVE.order({ names, clues: [...clues, c], pos }).length < before || (clues.length < 2 && r() < 0.3)) clues.push(c);
    }
    if (AHA_SOLVE.order({ names, clues, pos }).length !== 1) continue;
    for (let k = clues.length - 1; k >= 0; k--) { const rest = clues.filter((_, j) => j !== k); if (AHA_SOLVE.order({ names, clues: rest, pos }).length === 1) clues.splice(k, 1); }
    if (clues.length < (lv === 2 ? 3 : 2)) continue;
    const a = names[hidden];
    return {
      data: { names, clues, pos }, kind: "name", options: names, a,
      intro: ctx.intro(n), clues: shuffle(clues, r).map((c) => ctx[c.t](names[c.a], c.b == null ? c.k : names[c.b], c.k)),
      ask: ctx.ask(pos), hint: "Start with the most fixed clue (an end, an exact gap or a neighbour), then try each place it allows.",
      why: `The only order that fits every clue is ${perm.map((i) => names[i]).join(", ")}. So ${ahaOrd(pos)} place goes to ${a}.`,
    };
  }
}

const COLOURS = ["red", "blue", "green", "yellow", "white", "black", "pink"];
function genGuarantee(r, lv) {
  const things = ahaPick(r, ["socks", "marbles", "bangles", "ribbons", "pencils", "toffees"]), where = ahaPick(r, ["a dark drawer", "a cloth bag", "a closed tin", "a box in a power cut"]);
  const t = ahaPick(r, lv === 0 ? ["same", "pigeon", "chance", "every"] : lv === 1 ? ["same", "every", "pigeon", "dice", "chance", "two"] : ["same", "every", "pigeon", "dice", "two"]);
  if (t === "dice") {
    const n = lv === 2 || (lv === 1 && r() < 0.5) ? 3 : 2, atLeast = lv > 0 && r() < 0.4, s = ahaInt(r, n + 1, 6 * n - 1), data = { t, n, s, atLeast }, a = +AHA_SOLVE.guarantee(data)[0], ways = 6 ** n;
    const who = ahaPick(r, AHA_NAMES), game = ahaPick(r, ["a board game", "Ludo night", "a carnival stall", "a maths fair", "a family game", "a dice challenge"]);
    return { data, kind: "number", a, near: [a + 1, a - 1, a + n, s - 1], intro: `At ${game}, ${who} rolls ${n === 2 ? "two" : "three"} fair six-sided dice. Counting order, there are ${ways} equally likely outcomes.`, ask: `In how many of those ${ways} outcomes is the total ${atLeast ? "at least " : ""}${s}?`, hint: n === 2 ? "Fix the first die from 1 to 6 and count what the second must be." : "Fix the first die, then count pairs for the other two that make up the rest.", why: `Counting every ordered outcome gives ${a} of the ${ways}.` };
  }
  if (t === "pigeon") {
    const [boxes, what, who] = ahaPick(r, [[12, "birth month", "people"], [7, "weekday of birth", "people"], [26, "first letter of their name (A–Z)", "children"], [10, "last digit of their phone number", "people"], [8, "blood group", "donors"], [24, "hour of birth", "babies"], [12, "zodiac sign", "guests"], [6, "favourite of 6 ice-cream flavours", "students"], [5, "house colour (5 houses)", "pupils"], [31, "day of the month they were born", "employees"]]);
    const place = ahaPick(r, ["A wedding hall", "A school assembly", "A cricket stadium stand", "An office party", "A train coach", "A coaching class", "A hostel mess", "A conference room"]);
    if (lv > 0 && r() < 0.5) {
      const N = ahaInt(r, boxes + 2, boxes * 15), data = { t, boxes, N }, a = +AHA_SOLVE.guarantee(data)[0];
      return { data, kind: "number", a, near: [Math.floor(N / boxes), a + 1, a - 1, boxes], intro: `${place} has ${N} ${who}.`, ask: `What is the largest number k for which you can be sure at least k of them share the same ${what}?`, hint: `Spread them as evenly as possible over the ${boxes} options. The fullest option must hold at least ⌈${N}/${boxes}⌉.`, why: `${N} ÷ ${boxes} = ${(N / boxes).toFixed(2)}, rounded up is ${a}. An even spread shows you can't guarantee more.` };
    }
    const k = ahaInt(r, 2, lv + 4), data = { t, boxes, k }, a = +AHA_SOLVE.guarantee(data)[0];
    return { data, kind: "number", a, near: [a - 1, boxes * k, boxes + k, a + 1], intro: `${place} slowly fills up with ${who}.`, ask: `What is the smallest number of ${who} that guarantees at least ${k} share the same ${what}?`, hint: `Imagine the unluckiest room: everything spread out as evenly as possible across the ${boxes} options.`, why: `With ${boxes} options you can fit ${k - 1} ${who} in each, ${boxes * (k - 1)} in all, without ${k} matching. One more forces it: ${a}.` };
  }
  const nc = lv === 0 ? 2 : ahaInt(r, 3, lv + 2), cols = shuffle(COLOURS, r).slice(0, nc), counts = cols.map(() => ahaInt(r, 2, 9));
  const list = cols.map((c, j) => `${counts[j]} ${c}`).join(", ").replace(/, ([^,]*)$/, " and $1");
  if (t === "chance") {
    const want = ahaInt(r, 0, nc - 1), a = AHA_SOLVE.guarantee({ t, counts, want })[0], tot = counts.reduce((x, y) => x + y, 0);
    const [p, q] = a.split("/").map(Number), near = ahaUniq([`${counts[want]}/${tot - counts[want]}`, `1/${nc}`, `${p}/${q + 1}`, `${counts[want] + 1}/${tot}`, `${p + 1}/${q}`]).filter((x) => x !== a && !(x.split("/")[0] / x.split("/")[1] === p / q));
    return { data: { t, counts, want }, kind: "choice", a, options: shuffle([a, ...near.slice(0, 3)], r), intro: `${where[0].toUpperCase() + where.slice(1)} holds ${list} ${things}.`, ask: `You take one without looking. What is the chance it is ${cols[want]}?`, hint: "Chance = matching ones ÷ all of them.", why: `${counts[want]} of the ${tot} are ${cols[want]}, which is ${a}.` };
  }
  const k = t === "same" ? ahaInt(r, 2, Math.min(4, Math.max(...counts))) : 0, data = { t, counts, k };
  if (t === "same" && !counts.some((c) => c >= k)) return genGuarantee(r, lv);
  const a = +AHA_SOLVE.guarantee(data)[0], tot = counts.reduce((x, y) => x + y, 0);
  const goal = t === "same" ? `at least ${k} of the same colour` : t === "every" ? "at least one of every colour" : "two of different colours";
  return { data, kind: "number", a, near: [a - 1, a + 1, t === "every" ? tot : nc * k, tot - a + 1, k + 1], intro: `${where[0].toUpperCase() + where.slice(1)} holds ${list} ${things}. You can't see the colours.`, ask: `How many must you take out to be sure of ${goal}?`, hint: "Picture the unluckiest possible draw, then take one more.", why: `The unluckiest draw can hold ${a - 1} ${things} and still miss ${goal}. One more makes it certain: ${a}.` };
}

function genClock(r, lv) {
  const t = ahaPick(r, lv === 0 ? ["angle", "weekday", "elapsed"] : ["angle", "weekday", "elapsed", "slow"]);
  if (t === "angle") {
    const h = ahaInt(r, 1, 12), m = lv === 0 ? ahaInt(r, 0, 11) * 5 : ahaInt(r, 0, 59), a = +AHA_SOLVE.clock({ t, h, m })[0];
    return { data: { t, h, m }, kind: "number", a, unit: "°", near: [Math.abs(30 * h - 6 * m) % 360, 360 - a, a + 15, a - 15].map((v) => Math.min(v, 360 - v)), intro: `${ahaPick(r, ["An ordinary wall clock", "The railway-station clock", "A wristwatch", "The classroom clock", "A clock tower"])} shows ${h}:${String(m).padStart(2, "0")}.`, ask: "What is the smaller angle between the hour hand and the minute hand, in degrees?", hint: "The hour hand moves too: half a degree every minute. The minute hand moves 6° a minute.", why: `The minute hand is at ${6 * m}°, the hour hand at ${30 * (h % 12) + m / 2}°. The smaller gap is ${a}°.` };
  }
  if (t === "weekday") {
    const s = ahaInt(r, 1, 12), e = s + ahaInt(r, lv ? 9 : 3, lv ? 40 : 20), from = ahaInt(r, 0, 6), month = ahaPick(r, ["January", "March", "May", "July", "August", "October", "December"]);
    const a = AHA_SOLVE.clock({ t, s, e, from })[0], i = WEEKDAYS.indexOf(a);
    const day = (n) => (n > 31 ? `${ahaOrd(n - 31)} of the next month` : `${ahaOrd(n)}`);
    return { data: { t, s, e, from }, kind: "name", options: lv === 2 ? WEEKDAYS : shuffle([a, WEEKDAYS[mod(i + 1, 7)], WEEKDAYS[mod(i - 1, 7)], WEEKDAYS[mod(i + 3, 7)]], r), a, intro: `In ${month} (a 31-day month), the ${ahaOrd(s)} falls on a ${WEEKDAYS[from]}.`, ask: `What day of the week is the ${day(e)}?`, hint: "Weekdays repeat every 7 days. How many days apart are the two dates?", why: `They are ${e - s} days apart. ${e - s} = ${Math.floor((e - s) / 7)} weeks and ${(e - s) % 7} days, so move ${(e - s) % 7} days on from ${WEEKDAYS[from]}: ${a}.` };
  }
  if (t === "elapsed") {
    const h1 = ahaInt(r, 5, 14), m1 = ahaInt(r, 0, 11) * 5 + (lv === 2 ? ahaInt(r, 0, 4) : 0), dur = ahaInt(r, lv ? 50 : 20, lv ? 400 : 150), end = h1 * 60 + m1 + dur, h2 = Math.floor(end / 60) % 24, m2 = end % 60;
    const tm = (h, m) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`, what = ahaPick(r, [["A train leaves at", "and arrives at"], ["A film starts at", "and ends at"], ["A cake goes into the oven at", "and comes out at"], ["A bus sets off at", "and reaches the hills at"]]);
    const a = +AHA_SOLVE.clock({ t, h1, m1, h2, m2 })[0];
    return { data: { t, h1, m1, h2, m2 }, kind: "number", a, unit: "minutes", near: [a + 60, a - 60, a + 10, a - 10, (h2 - h1) * 100 + m2 - m1], intro: `${what[0]} ${tm(h1, m1)} ${what[1]} ${tm(h2, m2)} the same day (24-hour clock).`, ask: "How many minutes does it take?", hint: `Count up to the next whole hour first, then add whole hours and the leftover minutes.`, why: `From ${tm(h1, m1)} to ${tm(h2, m2)} is ${Math.floor(a / 60)} h ${a % 60} min, which is ${a} minutes.` };
  }
  const loss = ahaInt(r, 1, 12), hours = ahaInt(r, 2, 24), set = ahaInt(r, 5, 11), a = +AHA_SOLVE.clock({ t, loss, hours })[0];
  return { data: { t, loss, hours }, kind: "number", a, unit: "minutes", near: [a + loss, a - loss, loss + hours, a * 2], intro: `${ahaPick(r, ["An old clock", "Grandpa's pocket watch", "A cheap alarm clock", "The hall clock", "A wind-up clock"])} loses ${loss} minutes every hour. It is set exactly right at ${set}:00 in the morning.`, ask: `How many minutes behind is it ${hours} hours later?`, hint: "The lost minutes pile up evenly, hour after hour.", why: `${hours} hours × ${loss} minutes = ${a} minutes behind.` };
}

const GRID_ATTRS = [
  { key: "pet", vals: ["cat", "dog", "parrot", "rabbit", "goldfish"], is: (p, v) => `${p} owns the ${v}.`, not: (p, v) => `${p} doesn't own the ${v}.`, who: (v) => `the ${v}'s owner`, ask: (v) => `Who owns the ${v}?` },
  { key: "drink", vals: ["chai", "lassi", "coffee", "nimbu pani", "cocoa"], is: (p, v) => `${p} drinks ${v}.`, not: (p, v) => `${p} doesn't drink ${v}.`, who: (v) => `the ${v} drinker`, ask: (v) => `Who drinks ${v}?` },
  { key: "hobby", vals: ["chess", "painting", "cricket", "dancing", "baking"], is: (p, v) => `${p}'s hobby is ${v}.`, not: (p, v) => `${p} doesn't do ${v}.`, who: (v) => `the one who loves ${v}`, ask: (v) => `Whose hobby is ${v}?` },
  { key: "colour", label: "kite colour", vals: ["red", "teal", "yellow", "purple", "orange"], is: (p, v) => `${p}'s kite is ${v}.`, not: (p, v) => `${p}'s kite isn't ${v}.`, who: (v) => `the ${v} kite's flyer`, ask: (v) => `Who flies the ${v} kite?` },
];
function genGrid(r, lv) {
  const n = lv === 2 ? 4 : 3, A = lv === 0 ? 1 : 2, names = shuffle(AHA_NAMES, r).slice(0, n), kinds = shuffle(GRID_ATTRS, r).slice(0, A), vals = kinds.map((k) => shuffle(k.vals, r).slice(0, n));
  for (;;) {
    const attrs = kinds.map(() => shuffle([...Array(n).keys()], r)), ask = { a: ahaInt(r, 0, A - 1), v: ahaInt(r, 0, n - 1) }, clues = [];
    const holder = (a, v) => attrs[a].indexOf(v), d = () => ({ n, names, attrs: kinds, clues, ask });
    for (let g = 0; g < 300 && gridSolve(d()).length > 1; g++) {
      const t = ahaPick(r, A > 1 ? ["is", "not", "not", "link", "link", "unlink", "unlink"] : ["is", "not", "not"]), a = ahaInt(r, 0, A - 1), b = 1 - a, p = ahaInt(r, 0, n - 1), v = ahaInt(r, 0, n - 1), w = ahaInt(r, 0, n - 1);
      let c = null;
      if (t === "is" && !(a === ask.a && v === ask.v) && attrs[a][p] === v) c = { t, p, a, v };
      if (t === "not" && !(a === ask.a && v === ask.v) && attrs[a][p] !== v) c = { t, p, a, v };
      if (t === "link" && holder(a, v) === holder(b, w)) c = { t, a, v, b, w };
      if (t === "unlink" && holder(a, v) !== holder(b, w)) c = { t, a, v, b, w };
      if (!c || (lv === 2 && (t === "is" || t === "not") && a === ask.a)) continue;
      const full = () => gridSolve({ ...d(), full: true }).length, before = full();
      clues.push(c);
      if (full() === before) clues.pop();
    }
    if (gridSolve(d()).length !== 1) continue;
    for (let k = clues.length - 1; k >= 0; k--) { const c = clues.splice(k, 1)[0]; if (gridSolve(d()).length !== 1) clues.splice(k, 0, c); }
    if (clues.length < (lv === 2 ? 3 : 2) || (lv > 0 && !clues.some((c) => c.t === "link" || c.t === "unlink"))) continue;
    const say = (c) => {
      if (c.t === "is") return kinds[c.a].is(names[c.p], vals[c.a][c.v]);
      if (c.t === "not") return kinds[c.a].not(names[c.p], vals[c.a][c.v]);
      const X = kinds[c.a].who(vals[c.a][c.v]), Y = kinds[c.b].who(vals[c.b][c.w]);
      return c.t === "link" ? `${X[0].toUpperCase() + X.slice(1)} is also ${Y}.` : `${X[0].toUpperCase() + X.slice(1)} is not ${Y}.`;
    };
    const data = { n, names, attrs: kinds.map((k) => k.key), clues, ask }, a = gridSolve(data)[0];
    const table = names.map((nm, p) => `${nm}: ${kinds.map((k, j) => vals[j][attrs[j][p]]).join(", ")}`).join("; ");
    return {
      data, kind: "name", options: names, a,
      intro: `${names.slice(0, -1).join(", ")} and ${names.at(-1)} each have a different ${kinds.map((k) => k.label || k.key).join(" and a different ")}: ${kinds.map((k, j) => vals[j].join(", ")).join(" · ")}.`,
      clues: shuffle(clues.map(say), r), ask: kinds[ask.a].ask(vals[ask.a][ask.v]),
      hint: "Use the grid: cross out every pairing a clue rules out. A row with one blank left is solved.",
      why: `Only one full arrangement fits: ${table}. So the answer is ${a}.`,
    };
  }
}

/* ───────── Number and table puzzles: each solver searches for the answer from the raw data ───────── */
const ahaGcd = (a, b) => (b ? ahaGcd(b, a % b) : Math.abs(a));
const ahaRs = (n) => "₹" + ahaFmt(n);
const ahaSeek = (lo, hi, ok) => { const out = []; for (let v = lo; v <= hi && out.length < 2; v++) if (ok(v)) out.push(String(v)); return out; };
Object.assign(AHA_SOLVE, {
  percent(d) {
    if (d.t === "succ") { let num = d.P, den = 1; for (const s of d.steps) { num *= 100 + s; den *= 100; } return num % den ? [] : [String(num / den)]; }
    if (d.t === "pl") return ahaSeek(-100, 300, (x) => d.C * (100 + d.m) * (100 - d.d) === d.C * 100 * (100 + x) * 100 / 100);
    if (d.t === "rev") return ahaSeek(1, d.Q * 3, (o) => o * (100 + d.x) === d.Q * 100);
    if (d.t === "comp") return ahaSeek(1, 1000, (y) => d.more ? 100 * d.x === y * (100 + d.x) : y * (100 - d.x) === 100 * d.x);
    return ahaSeek(1, d.M * 100, (T) => T * (2 * d.w - 100) === d.M * 100);
  },
  tsd(d) {
    if (d.t === "avg") return ahaSeek(1, 200, (v) => v * d.v.reduce((a, s) => a + d.v.reduce((p, q) => p * q, 1) / s, 0) === d.v.length * d.v.reduce((p, q) => p * q, 1));
    if (d.t === "train") return ahaSeek(1, 3000, (t) => t * (d.same ? d.s1 - d.s2 : d.s1 + d.s2) * 5 === (d.L1 + d.L2) * 18);
    if (d.t === "work") { const P = d.days.reduce((p, q) => p * q, 1); return ahaSeek(1, 400, (T) => d.days.reduce((a, x) => a + T * P / x, 0) === P); }
    if (d.t === "pipe") return ahaSeek(1, 1000, (T) => T * (d.b - d.a) === d.a * d.b);
    if (d.t === "boat") return ahaSeek(1, 200, (v) => 2 * v * d.t1 * d.t2 === d.D * d.t2 + d.U * d.t1);
    return ahaSeek(1, 500, (D) => D * (d.s2 - d.s1) * 60 === (d.m1 + d.m2) * d.s1 * d.s2);
  },
  numbers(d) {
    if (d.t === "crt") return ahaSeek(d.lo, d.lo + 5000, (x) => d.div.every((p, j) => x % p === d.rem[j])).slice(0, 1); // "smallest"
    if (d.t === "bells") { if (d.hours) { let n = 0; for (let t = 0; t <= d.hours * 60; t++) if (d.gap.every((g) => t % g === 0)) n++; return [String(n)]; } return ahaSeek(1, 20000, (t) => d.gap.every((g) => t % g === 0)).slice(0, 1); }
    if (d.t === "power") { let x = 1; for (let k = 0; k < d.e; k++) x = (x * d.b) % d.m; return [String(x)]; }
    if (d.t === "count") { let n = 0; for (let x = 1; x <= d.N; x++) { const hit = d.by.some((p) => x % p === 0); if (d.neither ? !hit : hit) n++; } return [String(n)]; }
    if (d.t === "factors") { let n = 0; for (let x = 1; x <= d.N; x++) if (d.N % x === 0) n++; return [String(n)]; }
    let z = 0; for (let k = 1; k <= d.n; k++) for (let x = k; x % 5 === 0; x /= 5) z++; return [String(z)];
  },
  ratio(d) {
    if (d.t === "allig") return ahaSeek(1, 2000, (y) => d.x * d.a + y * d.b === d.mix * (d.x + y));
    if (d.t === "ages") { const out = new Set(); for (let A = 1; A < 100; A++) for (let B = 1; B < 100; B++) if (A * d.q === B * d.p && (A + d.n) * d.s === (B + d.n) * d.r) out.add(String(d.ask === "sum" ? A + B : A)); return [...out]; }
    if (d.t === "partner") return ahaSeek(1, d.P, (s) => s * (d.x * 12 + d.y * d.mo) === d.P * d.y * d.mo);
    if (d.t === "milk") return ahaSeek(1, 1000, (w) => (d.V * d.q + w * (d.p + d.q)) * d.r === d.V * d.p * d.s);
    const out = []; for (let x = 1; x < d.N; x++) { if ((x * d.b) % d.a) continue; const y = (x * d.b) / d.a, z = d.N - x - y; if (z > 0 && y * d.d === z * d.c) out.push(String(z)); } return out;
  },
  di(d) {
    const v = d.rows, last = v[0].length - 1, tot = (c) => v.reduce((s, row) => s + row[c], 0);
    if (d.t === "growth" || d.t === "jump") {
      const g = v.map((row) => d.t === "jump" ? row[d.c2] - row[d.c1] : (row[d.c2] - row[d.c1]) / row[d.c1]), best = Math.max(...g);
      return d.names.filter((_, j) => Math.abs(g[j] - best) < 1e-9);
    }
    if (d.t === "rose") return [String(v.filter((row) => row.every((x, c) => !c || x > row[c - 1])).length)];
    if (d.t === "total") return [String(tot(d.c1))];
    if (d.t === "avg") return ahaSeek(1, 10000, (a) => a * v[d.e].length === v[d.e].reduce((s, x) => s + x, 0));
    if (d.t === "share") return ahaSeek(1, 100, (p) => p * tot(d.c1) === 100 * v[d.e][d.c1]);
    return ahaSeek(-100, 400, (p) => tot(0) * (100 + p) === 100 * tot(last));
  },
});

function genPercent(r, lv) {
  const t = ahaPick(r, [["succ", "pl", "comp"], ["succ", "pl", "rev", "comp", "elect"], ["succ", "pl", "rev", "elect", "comp"]][lv]);
  const who = ahaPick(r, AHA_NAMES), item = ahaPick(r, ["phone", "scooter", "laptop", "sofa", "bicycle", "silk saree", "watch", "fridge", "guitar"]);
  for (;;) {
    if (t === "succ") {
      const k = lv === 2 ? 3 : 2, steps = [...Array(k)].map((_, j) => (j % 2 ? -1 : 1) * ahaInt(r, 1, lv ? 8 : 4) * 5);
      if (r() < 0.5) steps.forEach((s, j) => (steps[j] = -s));
      const P = k === 3 ? ahaInt(r, 1, 12) * 8000 : ahaInt(r, 2, 40) * 400, data = { t, P, steps }, sol = AHA_SOLVE.percent(data);
      if (sol.length !== 1) continue;
      const a = +sol[0], said = steps.map((s, j) => `${j ? "then " : ""}${s > 0 ? "raised" : "cut"} by ${Math.abs(s)}%`).join(", ");
      return { data, kind: "number", a, pre: "₹", near: [P + P * steps.reduce((x, y) => x + y, 0) / 100, P, a + P / 20, a - P / 50], intro: `A ${item} is priced at ${ahaRs(P)}. Over the season its price is ${said}.`, ask: "What is the final price?", hint: "Successive percentage changes multiply; they never simply add up.", why: `${ahaRs(P)} × ${steps.map((s) => ((100 + s) / 100).toFixed(2)).join(" × ")} = ${ahaRs(a)}. Adding the percentages would wrongly give ${ahaRs(P + P * steps.reduce((x, y) => x + y, 0) / 100)}.` };
    }
    if (t === "pl") {
      const m = ahaInt(r, 2, 14) * 5, dd = ahaInt(r, 1, 8) * 5, x = (100 + m) * (100 - dd) - 10000;
      if (x <= 0 || x % 100 || dd >= m) continue;
      const C = ahaInt(r, 4, 60) * 100, data = { t, C, m, d: dd }, a = +AHA_SOLVE.percent(data)[0];
      return { data, kind: "number", a, unit: "%", near: [m - dd, a + 5, a - 2, m], intro: `${who} marks a ${item} ${m}% above its cost price of ${ahaRs(C)}, then gives a ${dd}% discount on the marked price.`, ask: "What is the profit percentage?", hint: "Take cost = 100. Mark it up, then take the discount off the marked price, not the cost.", why: `Cost 100 → marked ${100 + m} → after ${dd}% off, ${(100 + m) * (100 - dd) / 100}. Profit = ${a}%, not ${m} − ${dd} = ${m - dd}%.` };
    }
    if (t === "rev") {
      const x = ahaPick(r, [10, 20, 25, 40, 50, 60, 75]), O = ahaInt(r, 3, 120) * 20, Q = (O * (100 + x)) / 100, data = { t, x, Q }, a = +AHA_SOLVE.percent(data)[0];
      return { data, kind: "number", a, pre: "₹", near: [Math.round(Q * (100 - x) / 100), Q - x, Math.round(Q / (1 + x / 50))], intro: `After a ${x}% price rise, ${who}'s monthly gym fee is ${ahaRs(Q)}.`, ask: "What was the fee before the rise?", hint: `The ${x}% is of the old fee, so ${ahaRs(Q)} is ${100 + x}% of it.`, why: `${ahaRs(Q)} ÷ ${(100 + x) / 100} = ${ahaRs(a)}. Taking ${x}% off ${ahaRs(Q)} would give ${ahaRs(Math.round(Q * (100 - x) / 100))}, which is wrong.` };
    }
    if (t === "comp") {
      const more = r() < 0.5, x = more ? ahaPick(r, [25, 100, 150, 300, 400, 900]) : ahaPick(r, [20, 50, 60, 75, 80, 90]), data = { t, more, x }, a = +AHA_SOLVE.percent(data)[0], [A, B] = shuffle(AHA_NAMES, r);
      return { data, kind: "number", a, unit: "%", near: [x, 100 - x, Math.round((a + x) / 2)], intro: `${A}'s salary is ${x}% ${more ? "more" : "less"} than ${B}'s.`, ask: `By what percentage is ${B}'s salary ${more ? "less" : "more"} than ${A}'s?`, hint: `Give ${B} a salary of 100 and work out ${A}'s. Then compare against ${A}'s figure.`, why: `If ${B} earns 100, ${A} earns ${more ? 100 + x : 100 - x}. The gap of ${x} is ${a}% of ${more ? 100 + x : 100 - x}.` };
    }
    const w = ahaInt(r, 51, lv === 2 ? 64 : 70), T = ahaInt(r, 10, 500) * 100, M = (T * (2 * w - 100)) / 100, data = { t: "elect", w, M }, a = +AHA_SOLVE.percent(data)[0];
    return { data, kind: "number", a, near: [Math.round((M * 100) / w), M * 2, Math.round((M * 100) / (w - 50))], intro: `In a two-way college election, the winner got ${w}% of the valid votes and won by ${ahaFmt(M)} votes.`, ask: "How many valid votes were cast?", hint: `The loser got ${100 - w}%, so the winning margin is ${2 * w - 100}% of all votes.`, why: `${w}% − ${100 - w}% = ${2 * w - 100}% of the votes is ${ahaFmt(M)}, so the total is ${ahaFmt(M)} × 100 ÷ ${2 * w - 100} = ${ahaFmt(a)}.` };
  }
}

function genTsd(r, lv) {
  const t = ahaPick(r, [["avg", "work", "train"], ["avg", "work", "train", "pipe", "boat"], ["avg", "work", "train", "boat", "late", "pipe"]][lv]), [A, B, C] = shuffle(AHA_NAMES, r);
  for (;;) {
    if (t === "avg") {
      const n = lv === 2 && r() < 0.5 ? 3 : 2, v = [...Array(n)].map(() => ahaInt(r, 2, 18) * 5);
      if (new Set(v).size < n) continue;
      const data = { t, v }, sol = AHA_SOLVE.tsd(data);
      if (sol.length !== 1) continue;
      const a = +sol[0], mean = v.reduce((x, y) => x + y, 0) / n;
      if (mean === a) continue;
      return { data, kind: "number", a, unit: "km/h", near: [Math.round(mean), a + 5, a - 3], intro: n === 2 ? `${A} drives to a hill town at ${v[0]} km/h and comes back on the same road at ${v[1]} km/h.` : `${A} cycles three equal stretches of a route at ${v.join(", ")} km/h.`, ask: "What is the average speed for the whole trip?", hint: "Average speed is total distance ÷ total time. Pick a handy distance, such as a multiple of every speed.", why: `For equal distances the average is the harmonic mean: ${n} ÷ (${v.map((s) => "1/" + s).join(" + ")}) = ${a} km/h, not the simple average ${Math.round(mean)}.` };
    }
    if (t === "work") {
      const n = lv === 2 ? 3 : 2, days = [...Array(n)].map(() => ahaInt(r, 2, 40));
      if (new Set(days).size < n) continue;
      const data = { t, days }, sol = AHA_SOLVE.tsd(data);
      if (sol.length !== 1) continue;
      const a = +sol[0], ppl = [A, B, C].slice(0, n), job = ahaPick(r, ["paint a house", "build a wall", "type a report", "harvest a field", "tile a floor"]);
      return { data, kind: "number", a, unit: "days", near: [Math.round(days.reduce((x, y) => x + y, 0) / n), a + 1, Math.min(...days) - 1, a * 2], intro: `${ppl.map((p, j) => `${p} can ${j ? "do it" : job} alone in ${days[j]} days`).join(", ")}.`, ask: `Working together, how many days do they take to ${job}?`, hint: "Add up the work each person does in one day.", why: `In one day they finish ${days.map((x) => "1/" + x).join(" + ")} = 1/${a} of the job, so together it takes ${a} days.` };
    }
    if (t === "pipe") {
      const a0 = ahaInt(r, 2, 40), b = ahaInt(r, a0 + 1, 150), data = { t, a: a0, b }, sol = AHA_SOLVE.tsd(data);
      if (sol.length !== 1) continue;
      const a = +sol[0];
      return { data, kind: "number", a, unit: "hours", near: [b - a0, Math.round((a0 * b) / (a0 + b)) || 1, a + 2], intro: `${ahaPick(r, ["A tap fills a tank", "A pump fills a swimming pool", "An inlet pipe fills a cistern", "A hose fills a garden pond", "A motor fills the rooftop tank"])} in ${a0} hours. A leak at the bottom alone would empty it in ${b} hours.`, ask: "Starting empty, with both working, how many hours until it is full?", hint: "Per hour, the tank gains what the tap adds minus what the leak loses.", why: `Each hour the level rises by 1/${a0} − 1/${b} = 1/${a}, so it fills in ${a} hours.` };
    }
    if (t === "train") {
      const single = lv === 0 && r() < 0.5, same = !single && r() < 0.4, k = ahaInt(r, same ? 1 : 3, same ? 3 : 8), rel = 18 * k;
      let s1, s2;
      if (single) { s1 = rel; s2 = 0; } else if (same) { s2 = ahaInt(r, 6, 12) * 6; s1 = s2 + rel; } else { s1 = ahaInt(r, Math.ceil(rel / 12), Math.floor(rel / 8)) * 6; s2 = rel - s1; if (s2 < 24) continue; }
      const tt = ahaInt(r, 6, 40), L = 5 * k * tt, L1 = single ? L : Math.round((L * ahaInt(r, 3, 7)) / 10 / 5) * 5, L2 = L - L1;
      if (L1 < 60 || (!single && L2 < 60)) continue;
      const data = { t, s1, s2, L1, L2, same }, sol = AHA_SOLVE.tsd(data);
      if (sol.length !== 1) continue;
      const a = +sol[0];
      return { data, kind: "number", a, unit: "seconds", near: single ? [Math.round(L / s1), a * 2, a + 4] : [Math.round(((L1 + L2) * 18) / ((same ? s1 + s2 : Math.abs(s1 - s2)) * 5)) || a + 7, Math.round((L1 * 18) / (rel * 5)), a + 6], intro: single ? `A ${L1} m long train runs at ${s1} km/h.` : `A ${L1} m train at ${s1} km/h and a ${L2} m train at ${s2} km/h run on parallel tracks ${same ? "in the same direction" : "towards each other"}.`, ask: single ? "How many seconds does it take to pass a signal pole?" : same ? "How many seconds does the faster train take to completely overtake the slower one?" : "From the moment their fronts meet, how many seconds until they have completely passed each other?", hint: `Convert km/h to m/s by × 5/18. ${single ? "" : same ? "Same direction: subtract the speeds." : "Opposite directions: add the speeds."} The distance is the total length.`, why: `Relative speed ${rel} km/h = ${5 * k} m/s. Distance ${L} m ÷ ${5 * k} m/s = ${a} s.` };
    }
    if (t === "boat") {
      const v = ahaInt(r, 6, 30), c = ahaInt(r, 1, Math.min(8, v - 2)), t1 = ahaInt(r, 1, 5), t2 = ahaInt(r, 1, 5), D = (v + c) * t1, U = (v - c) * t2, data = { t, D, U, t1, t2 }, sol = AHA_SOLVE.tsd(data);
      if (sol.length !== 1) continue;
      return { data, kind: "number", a: v, unit: "km/h", near: [c, v + c, v - c, Math.round((D + U) / (t1 + t2))], intro: `A boat goes ${D} km downstream in ${t1} hour${t1 > 1 ? "s" : ""} and ${U} km upstream in ${t2} hour${t2 > 1 ? "s" : ""}.`, ask: "What is the boat's speed in still water?", hint: "Downstream speed = boat + current; upstream = boat − current.", why: `Downstream ${v + c} km/h, upstream ${v - c} km/h. The boat's own speed is their average: ${v} km/h (the current is ${c}).` };
    }
    const s1 = ahaInt(r, 2, 8), s2 = s1 + ahaInt(r, 1, 4), D = ahaInt(r, 2, 30), tot = (60 * D * (s2 - s1)) / (s1 * s2);
    if (tot % 1 || tot < 6 || tot > 120) continue;
    const m1 = ahaInt(r, 1, tot - 1), m2 = tot - m1, data = { t: "late", s1, s2, m1, m2 }, sol = AHA_SOLVE.tsd(data);
    if (sol.length !== 1) continue;
    return { data, kind: "number", a: D, unit: "km", near: [D + 2, Math.round(D / 2), s1 + s2], intro: `If ${A} walks to the station at ${s1} km/h, ${A} is ${m1} minutes late for the train. At ${s2} km/h, ${A} is ${m2} minutes early.`, ask: "How far is the station?", hint: `The two journey times differ by ${m1} + ${m2} = ${tot} minutes.`, why: `D/${s1} − D/${s2} = ${tot}/60 hours, so D = ${D} km.` };
  }
}

function genNumbers(r, lv) {
  const t = ahaPick(r, [["crt", "bells", "power", "count"], ["crt", "bells", "power", "count", "factors", "zeros"], ["crt", "bells", "power", "count", "factors", "zeros"]][lv]);
  for (;;) {
    if (t === "crt") {
      if (lv === 0) {
        const div = shuffle([2, 3, 4, 5, 6, 8, 9, 10, 12], r).slice(0, 3), k = ahaInt(r, 1, Math.min(...div) - 1), data = { t, div, rem: div.map(() => k), lo: k + 1 }, a = +AHA_SOLVE.numbers(data)[0], L = a - k;
        return { data, kind: "number", a, near: [div.reduce((x, y) => x * y, 1) + k, L, a + L], intro: `A number leaves remainder ${k} when divided by each of ${div.join(", ")}.`, ask: `What is the smallest such number greater than ${k}?`, hint: "Take away the remainder: what's left is divisible by all of them.", why: `It must be LCM(${div.join(", ")}) + ${k} = ${L} + ${k} = ${a}.` };
      }
      const [p, q] = shuffle([3, 4, 5, 7, 8, 9, 11, 13], r);
      if (ahaGcd(p, q) !== 1) continue;
      const rem = [ahaInt(r, 1, p - 1), ahaInt(r, 1, q - 1)], lo = lv === 2 ? ahaPick(r, [100, 200, 500, 1000]) : 1, data = { t, div: [p, q], rem, lo }, a = +AHA_SOLVE.numbers(data)[0];
      return { data, kind: "number", a, near: [a + p * q, a - 1, p * q + rem[0], a + p], intro: `A number leaves remainder ${rem[0]} when divided by ${p} and remainder ${rem[1]} when divided by ${q}.`, ask: lo > 1 ? `What is the smallest such number that is at least ${lo}?` : "What is the smallest such positive number?", hint: `List numbers that leave ${rem[1]} on division by ${q}, and test each against ${p}.`, why: `Solutions repeat every ${p} × ${q} = ${p * q}. The first one ${lo > 1 ? "from " + lo : ""} is ${a}.` };
    }
    if (t === "bells") {
      const n = lv ? 3 : 2, gap = [...Array(n)].map(() => ahaPick(r, [4, 5, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 24, 25, 28, 30, 36, 40, 45]));
      if (new Set(gap).size < n) continue;
      const L = +AHA_SOLVE.numbers({ t, gap })[0];
      if (L > 720 || L === Math.max(...gap)) continue;
      const hours = lv === 2 ? ahaInt(r, 2, 8) : 0, data = { t, gap, hours }, a = +AHA_SOLVE.numbers(data)[0];
      return { data, kind: "number", a, unit: hours ? "times" : "minutes", near: hours ? [a - 1, a + 1, Math.floor((hours * 60) / Math.max(...gap))] : [gap.reduce((x, y) => x * y, 1), L * 2, Math.max(...gap) * 2], intro: `${n === 2 ? "Two" : "Three"} temple bells ring every ${gap.join(", ").replace(/, ([^,]*)$/, " and $1")} minutes. They all ring together at 6:00 am.`, ask: hours ? `How many times do they ring together from 6:00 am to ${6 + hours}:00 am, counting both ends?` : "After how many minutes will they next ring together?", hint: "They meet again after the lowest common multiple of the gaps.", why: hours ? `LCM = ${L} minutes. In ${hours * 60} minutes that's ${Math.floor((hours * 60) / L)} gaps, so ${a} rings including 6:00.` : `LCM(${gap.join(", ")}) = ${a} minutes.` };
    }
    if (t === "power") {
      const b = ahaInt(r, 2, lv ? 29 : 9), e = ahaInt(r, lv ? 30 : 10, lv ? 999 : 199), m = lv === 2 ? ahaPick(r, [7, 9, 11, 13]) : 10, data = { t, b, e, m }, a = +AHA_SOLVE.numbers(data)[0];
      if (b % m === 0 || b % 10 === 0) continue;
      return { data, kind: "number", a, near: [b % m, (a + 1) % m, (a + 3) % m, e % m, (a + m - 1) % m], intro: `Consider the number ${b}^${e}.`, ask: m === 10 ? "What is its last (units) digit?" : `What is the remainder when it is divided by ${m}?`, hint: "Powers repeat in a short cycle. Find the cycle length, then see where the exponent lands in it.", why: `Remainders of ${b}^1, ${b}^2, … (mod ${m}) repeat in a cycle; following it to ${b}^${e} gives ${a}.` };
    }
    if (t === "count") {
      const N = ahaInt(r, 6, 100) * 10, by = shuffle([2, 3, 4, 5, 6, 7, 9, 11], r).slice(0, lv === 2 ? 3 : lv ? 2 : 1), neither = lv > 0 && r() < 0.5, data = { t, N, by, neither }, a = +AHA_SOLVE.numbers(data)[0];
      if (by.some((p, j) => by.some((q, k) => j !== k && q % p === 0))) continue;
      const naive = by.reduce((s, p) => s + Math.floor(N / p), 0);
      return { data, kind: "number", a, near: [neither ? N - naive : naive, a + 1, a - 1, Math.floor(N / by[0])], intro: `Look at the whole numbers from 1 to ${N}.`, ask: `How many are divisible by ${neither ? "none of" : by.length > 1 ? "at least one of" : ""} ${by.join(by.length > 1 ? (neither ? ", " : " or ") : "")}?`.replace(/  +/g, " "), hint: by.length > 1 ? "Inclusion–exclusion: add the single counts, subtract the overlaps (multiples of the LCMs), add back triple overlaps." : `Divide ${N} by ${by[0]} and drop the remainder.`, why: `By inclusion–exclusion the count is ${a}.` };
    }
    if (t === "factors") {
      const x = ahaInt(r, 1, 7), y = ahaInt(r, 0, 4), z = ahaInt(r, 0, 3), w = lv ? ahaInt(r, 0, 2) : 0, N = 2 ** x * 3 ** y * 5 ** z * 7 ** w;
      if (N < 30 || N > 200000) continue;
      const data = { t, N }, a = +AHA_SOLVE.numbers(data)[0];
      return { data, kind: "number", a, near: [x + y + z + w, a - 1, a + 2, a * 2], intro: `${ahaPick(r, ["Think about the number", "A locker code is", "A stadium seats exactly", "A warehouse stores exactly", "A batch has"])} ${ahaFmt(N)}${ahaPick(r, [".", " — a number worth factorising."])}`, ask: "How many positive divisors does it have (including 1 and itself)?", hint: "Write it as a product of primes. Each prime's power can be used 0, 1, … times.", why: `${N} = ${[[2, x], [3, y], [5, z], [7, w]].filter(([, e]) => e).map(([p, e]) => (e > 1 ? `${p}^${e}` : p)).join(" × ")}, so it has ${[x, y, z, w].filter(Boolean).map((e) => e + 1).join(" × ")} = ${a} divisors.` };
    }
    const n = ahaInt(r, 25, lv === 2 ? 999 : 200), data = { t: "zeros", n }, a = +AHA_SOLVE.numbers(data)[0];
    return { data, kind: "number", a, near: [Math.floor(n / 5), a + 1, a - 1, Math.floor(n / 10)], intro: `${n}! means ${n} × ${n - 1} × … × 2 × 1.`, ask: `How many zeros does ${n}! end with?`, hint: "Each trailing zero needs a 2 and a 5. Fives are scarcer: count them, including the extra fives in 25, 125, …", why: `⌊${n}/5⌋ + ⌊${n}/25⌋ + ⌊${n}/125⌋ + ⌊${n}/625⌋ = ${a}.` };
  }
}

function genRatio(r, lv) {
  const t = ahaPick(r, [["allig", "chain", "partner"], ["allig", "ages", "partner", "milk", "chain"], ["allig", "ages", "milk", "partner", "chain"]][lv]), [A, B, C] = shuffle(AHA_NAMES, r);
  for (;;) {
    if (t === "allig") {
      const b = ahaInt(r, 4, 20) * 5, a0 = b + ahaInt(r, 2, 12) * 5, mix = ahaInt(r, b / 5 + 1, a0 / 5 - 1) * 5, x = ahaInt(r, 2, 20) * 5, data = { t, a: a0, b, x, mix }, sol = AHA_SOLVE.ratio(data);
      if (sol.length !== 1) continue;
      const a = +sol[0], what = ahaPick(r, [["rice", "kg"], ["tea leaves", "kg"], ["cashews", "kg"], ["oil", "litres"]]);
      return { data, kind: "number", a, unit: what[1], near: [Math.round((x * (mix - b)) / (a0 - mix)) || a + 5, x, a + 5], intro: `A grocer has ${x} ${what[1]} of ${what[0]} costing ₹${a0} per ${what[1] === "kg" ? "kg" : "litre"}, and a cheaper kind costing ₹${b}.`, ask: `How many ${what[1]} of the cheaper kind must be mixed in so the blend costs ₹${mix} per ${what[1] === "kg" ? "kg" : "litre"}?`, hint: `Alligation: the quantities are in the ratio of the opposite price gaps, (${mix} − ${b}) : (${a0} − ${mix}).`, why: `Dearer : cheaper = ${mix - b} : ${a0 - mix}. With ${x} of the dearer one, the cheaper amount is ${x} × ${a0 - mix} ÷ ${mix - b} = ${a}.` };
    }
    if (t === "ages") {
      const k = ahaInt(r, 2, 12), p = ahaInt(r, 1, 7), q = ahaInt(r, 1, 7), n = ahaInt(r, 2, 15), ask = r() < 0.5 ? "A" : "sum";
      if (p === q || ahaGcd(p, q) !== 1 || p * k > 80 || q * k > 80) continue;
      const g = ahaGcd(p * k + n, q * k + n), rr = (p * k + n) / g, s = (q * k + n) / g, data = { t, p, q, n, r: rr, s, ask }, sol = AHA_SOLVE.ratio(data);
      if (sol.length !== 1 || (rr === p && s === q)) continue;
      const a = +sol[0];
      return { data, kind: "number", a, unit: "years", near: ask === "sum" ? [(p + q) * n, a + p + q, a - 2 * (p + q)] : [p * n, a + p, a + n, q * k], intro: `The ages of ${A} and ${B} are in the ratio ${p} : ${q}. In ${n} years the ratio will be ${rr} : ${s}.`, ask: ask === "sum" ? `What is the sum of their present ages?` : `What is ${A}'s present age?`, hint: `Call the ages ${p}k and ${q}k. Then (${p}k + ${n}) : (${q}k + ${n}) = ${rr} : ${s}.`, why: `Cross-multiplying gives k = ${k}, so the ages are ${p * k} and ${q * k}. Answer: ${a}.` };
    }
    if (t === "partner") {
      const x = ahaInt(r, 2, 20) * 5000, y = ahaInt(r, 2, 20) * 5000, mo = ahaInt(r, 3, 11), P = ahaInt(r, 1, 30) * 6000;
      if ((P * y * mo) % (x * 12 + y * mo)) continue;
      const data = { t, x, y, mo, P }, sol = AHA_SOLVE.ratio(data);
      if (sol.length !== 1) continue;
      const a = +sol[0];
      return { data, kind: "number", a, pre: "₹", near: [Math.round((P * y) / (x + y)), P - a, Math.round(P / 2)], intro: `${A} starts a café with ${ahaRs(x)}. ${mo} months before the year ends, ${B} joins with ${ahaRs(y)}. The year's profit is ${ahaRs(P)}.`, ask: `What is ${B}'s share of the profit?`, hint: "Profit is shared in the ratio of money × months invested.", why: `${A}: ${ahaFmt(x)} × 12, ${B}: ${ahaFmt(y)} × ${mo}. ${B}'s share = ${ahaRs(P)} × ${y * mo} ÷ ${x * 12 + y * mo} = ${ahaRs(a)}.` };
    }
    if (t === "milk") {
      const p = ahaInt(r, 2, 9), q = ahaInt(r, 1, 4), V = (p + q) * ahaInt(r, 2, 12), rr = ahaInt(r, 1, 4), s = ahaInt(r, 1, 4);
      if (ahaGcd(p, q) !== 1 || ahaGcd(rr, s) !== 1 || rr * q >= s * p) continue;
      const data = { t, p, q, V, r: rr, s }, sol = AHA_SOLVE.ratio(data);
      if (sol.length !== 1) continue;
      const a = +sol[0];
      return { data, kind: "number", a, unit: "litres", near: [a + 2, Math.round(V / (rr + s)), V * s / (rr + s) - V * q / (p + q) + 1], intro: `A ${V}-litre can holds milk and water in the ratio ${p} : ${q}.`, ask: `How many litres of water must be added to make the ratio ${rr} : ${s}?`, hint: "The amount of milk doesn't change. Fix it, then find the water it needs.", why: `Milk = ${(V * p) / (p + q)} L, water = ${(V * q) / (p + q)} L. For ${rr} : ${s} the water must be ${((V * p) / (p + q)) * s / rr} L, so add ${a} L.` };
    }
    const a1 = ahaInt(r, 1, 7), b1 = ahaInt(r, 1, 7), c1 = ahaInt(r, 1, 7), d1 = ahaInt(r, 1, 7);
    if (ahaGcd(a1, b1) !== 1 || ahaGcd(c1, d1) !== 1 || a1 === b1 || c1 === d1) continue;
    const parts = [a1 * c1, b1 * c1, b1 * d1], g = ahaGcd(ahaGcd(parts[0], parts[1]), parts[2]), sum = parts.reduce((x, y) => x + y, 0) / g, N = sum * ahaInt(r, 2, 40) * 100;
    const data = { t: "chain", a: a1, b: b1, c: c1, d: d1, N }, sol = AHA_SOLVE.ratio(data);
    if (sol.length !== 1) continue;
    const a = +sol[0];
    return { data, kind: "number", a, pre: "₹", near: [Math.round((N * d1) / (c1 + d1)), Math.round(N / 3), a + N / sum], intro: `${ahaRs(N)} is shared among ${A}, ${B} and ${C}. ${A} : ${B} = ${a1} : ${b1} and ${B} : ${C} = ${c1} : ${d1}.`, ask: `How much does ${C} get?`, hint: `Make ${B}'s part the same in both ratios, then combine them into one ${A} : ${B} : ${C} ratio.`, why: `${A} : ${B} : ${C} = ${parts.map((x) => x / g).join(" : ")}. ${C} gets ${parts[2] / g}/${sum} of ${ahaRs(N)} = ${ahaRs(a)}.` };
  }
}

const DI_SETS = [
  { rows: ["North", "South", "East", "West", "Central"], what: "Regional sales of a tea brand (₹ crore)" },
  { rows: ["Aster", "Banyan", "Cedar", "Deodar", "Elm"], what: "Students placed by five colleges" },
  { rows: ["Mumbai", "Delhi", "Pune", "Chennai", "Kolkata"], what: "Electric scooters sold (hundreds)" },
  { rows: ["Phones", "Laptops", "Tablets", "Watches", "Speakers"], what: "Units shipped by a store (thousands)" },
  { rows: ["Alpha", "Beta", "Gamma", "Delta", "Omega"], what: "Revenue of five start-ups (₹ lakh)" },
];
function genDi(r, lv) {
  const set = ahaPick(r, DI_SETS), y0 = ahaInt(r, 2016, 2021), n = lv === 0 ? 3 : 4, cols = lv === 0 ? 2 : 3, names = shuffle(set.rows, r).slice(0, n);
  const t = ahaPick(r, [["growth", "jump", "total"], ["growth", "jump", "rose", "avg"], ["growth", "share", "change", "rose", "avg"]][lv]);
  for (let tries = 0; ; tries++) {
    const rows = names.map(() => { const out = [ahaInt(r, 6, 40) * 5]; for (let c = 1; c < cols; c++) out.push(Math.max(5, Math.round((out[c - 1] * (1 + ahaInt(r, -4, 12) / 20)) / 5) * 5)); return out; });
    const c1 = ahaInt(r, 0, cols - 2), c2 = cols - 1 > c1 ? ahaInt(r, c1 + 1, cols - 1) : c1 + 1, e = ahaInt(r, 0, n - 1);
    const data = { t, names, rows, c1: t === "total" || t === "share" ? ahaInt(r, 0, cols - 1) : c1, c2, e }, sol = AHA_SOLVE.di(data);
    if (sol.length !== 1) continue;
    const yr = (c) => String(y0 + c), base = { data, intro: `${set.what}, ${yr(0)}–${yr(cols - 1)}:`, table: { head: ["", ...[...Array(cols).keys()].map(yr)], rows: names.map((nm, j) => [nm, ...rows[j]]) } };
    if (t === "growth" || t === "jump") {
      const other = AHA_SOLVE.di({ ...data, t: t === "growth" ? "jump" : "growth" });
      if (lv && tries < 40 && other.length === 1 && other[0] === sol[0]) continue;
      return { ...base, kind: "name", options: names, a: sol[0], ask: `Which had the highest ${t === "growth" ? "percentage growth" : "absolute increase"} from ${yr(data.c1)} to ${yr(c2)}?`, hint: t === "growth" ? "Percentage growth = increase ÷ starting value. A big jump from a big base can still be a small percentage." : "Subtract the earlier year from the later one for each row.", why: `${names.map((nm, j) => `${nm}: ${t === "growth" ? Math.round(((rows[j][c2] - rows[j][data.c1]) / rows[j][data.c1]) * 1000) / 10 + "%" : rows[j][c2] - rows[j][data.c1]}`).join(", ")}. Highest: ${sol[0]}.` };
    }
    if (t === "total") { const a = +sol[0]; return { ...base, kind: "number", a, near: [a + 5, a - 10, a + 20], ask: `What is the combined total for ${yr(data.c1)}?`, hint: "Add one column.", why: `${rows.map((row) => row[data.c1]).join(" + ")} = ${a}.` }; }
    if (t === "rose") { const a = +sol[0]; return { ...base, kind: "number", a, near: [a + 1, a - 1, a + 2, n], ask: "How many of the rows increased every single year?", hint: "Check each row left to right; one dip rules a row out.", why: `Rows that rose each year: ${names.filter((_, j) => rows[j].every((x, c) => !c || x > rows[j][c - 1])).join(", ") || "none"}. That's ${a}.` }; }
    if (t === "avg") { const a = +sol[0]; return { ...base, kind: "number", a, near: [a + 5, a - 5, rows[e][cols - 1]], ask: `What is ${names[e]}'s average over the ${cols} years?`, hint: "Add the row, then divide by the number of years.", why: `(${rows[e].join(" + ")}) ÷ ${cols} = ${a}.` }; }
    if (t === "share") { const a = +sol[0]; return { ...base, kind: "number", a, unit: "%", near: [a + 5, a - 4, Math.round(100 / n)], ask: `What percentage of the ${yr(data.c1)} total came from ${names[e]}?`, hint: "Its value ÷ the column total × 100.", why: `${rows[e][data.c1]} ÷ ${rows.reduce((s, row) => s + row[data.c1], 0)} × 100 = ${a}%.` }; }
    const a = +sol[0], T0 = rows.reduce((s, row) => s + row[0], 0), T1 = rows.reduce((s, row) => s + row[cols - 1], 0);
    return { ...base, kind: "number", a, unit: "%", near: [a + 5, a - 5, T1 - T0], ask: `By what percentage did the overall total change from ${yr(0)} to ${yr(cols - 1)}? (Use − for a fall.)`, hint: "Total both columns first, then (new − old) ÷ old × 100.", why: `${T0} → ${T1}: (${T1} − ${T0}) ÷ ${T0} × 100 = ${a}%.` };
  }
}

const AHA_GEN = [genPercent, genOrder, genTsd, genLiars, genNumbers, genDi, genRatio, genGrid, genGuarantee, genClock];
const AHA_CACHE = new Map();
/* The question for a date's slot (0–4) at the current difficulty. */
function ahaModel(d, slot) {
  const key = `${puzzleSeed(d)}|${slot}`;
  if (AHA_CACHE.has(key)) return AHA_CACHE.get(key);
  const cat = ahaCategories(d)[slot], r = rng(`${puzzleSeed(d)}|aha|${slot}|${AHA_CATS[cat].id}`), m = { cat, ...AHA_GEN[cat](r, difficulty) };
  if (m.kind === "number" && difficulty < 2) {
    const opts = [m.a];
    for (const v of [...(m.near || []), m.a + 1, m.a - 1, m.a + 2, m.a + 3, m.a * 2].map(Math.round)) if (v >= 0 && !opts.includes(v) && opts.length < 4) opts.push(v);
    m.kind = "choice";
    m.numeric = true;
    m.options = shuffle(opts, r).map(String);
    m.a = String(m.a);
  }
  if (m.kind === "name") m.kind = "choice";
  if (m.kind === "choice") m.a = String(m.a);
  delete m.near;
  AHA_CACHE.set(key, m);
  return m;
}
/* Typed answers: units, commas and ₹ are ignored; the number must match exactly. */
function ahaCheck(m, raw) {
  if (m.kind === "choice") return String(raw) === m.a;
  const txt = String(raw).replace(/[−–]/g, "-").replace(/[^\d.\-]/g, ""), v = Number(txt);
  if (!Number.isFinite(v) || txt === "" || txt === "-") return false;
  return v === m.a;
}
/* Old Aha Moment progress (index 3 saved before the track existed) keeps its old question. */
function ahaLegacy(d, i) {
  if (i !== 3) return false;
  const s = all[progressKey(d)]?.games?.[3];
  return !!s && !s.aha && !!(s.started || s.done) && !s.credit;
}
function ahaMeta(d, i) {
  if (ahaLegacy(d, i)) return null;
  return AHA_CATS[ahaCategories(d)[AHA_SLOTS.indexOf(i)]];
}
/* Solved Aha cards per category, across every saved day and level. */
function ahaSkillCounts(store = all) {
  const out = AHA_CATS.map(() => 0), lv = difficulty;
  try {
    for (const [key, rec] of Object.entries(store)) {
      const mm = /^(\d{4}-\d{2}-\d{2})(?:-level-(\d))?(?:-refresh-1)?$/.exec(key);
      if (!mm) continue;
      difficulty = mm[2] ? +mm[2] : 1;
      if (progressKey(mm[1]) !== key) continue;
      const cats = ahaCategories(mm[1]);
      AHA_SLOTS.forEach((i, slot) => { const g = rec?.games?.[i]; if (((g?.done && !g.revealed) || g?.credit) && g.aha) out[cats[slot]]++; });
    }
  } finally { difficulty = lv; }
  return out;
}

function ahaRender(i) {
  const slot = AHA_SLOTS.indexOf(i), m = ahaModel(day, slot), s = state(i), cat = AHA_CATS[m.cat];
  s.aha = 1;
  persist();
  $("#rules").textContent = `Logical reasoning · ${m.kind === "number" ? "Type your answer, no options to lean on." : "Pick the one right answer."}`;
  const label = (v) => (m.numeric ? `${m.pre || ""}${Number(v).toLocaleString("en-IN")}${m.unit ? (/^[%°]$/.test(m.unit) ? "" : " ") + m.unit : ""}` : v);
  const table = m.table ? `<div class="ahatable"><table><thead><tr>${m.table.head.map((h) => `<th scope="col">${h}</th>`).join("")}</tr></thead><tbody>${m.table.rows.map((row) => `<tr>${row.map((c, k) => (k ? `<td>${c}</td>` : `<th scope="row">${c}</th>`)).join("")}</tr>`).join("")}</tbody></table></div>` : "";
  function draw() {
    const skill = ahaSkillCounts()[m.cat], done = !!s.done;
    const clues = m.clues ? `<ul class="ahaclues">${m.clues.map((c) => `<li>${c}</li>`).join("")}</ul>` : "";
    const answer = m.kind === "choice"
      ? `<div class="ahachoices">${m.options.map((v, k) => `<button class="choice ${s.answer === v ? "selected" : ""} ${done && v === m.a ? "right" : ""}" data-aha="${k}" ${done ? "disabled" : ""}>${label(v)}</button>`).join("")}</div>`
      : `<label class="ahaentry"><span class="visually-hidden">Your answer</span><input id="ahaInput" type="text" inputmode="${m.a < 0 || m.unit === "%" ? "text" : "numeric"}" autocomplete="off" enterkeyhint="done" value="${s.answer ?? ""}" ${done ? "disabled" : ""} placeholder="Your answer">${m.unit ? `<span>${m.unit}</span>` : ""}</label>`.replace("<input", `${m.pre ? `<span>${m.pre}</span>` : ""}<input`);
    $("#board").innerHTML = `<p class="ahabadge" title="Aha cards solved in this category">✦ ${cat.type} · ${skill} solved</p><p class="ahaintro">${m.intro}</p>${table}${clues}<h3 class="ahaask">${m.ask}</h3>${answer}`;
    $("#board").querySelectorAll("[data-aha]").forEach((b) => (b.onclick = () => {
      if (s.done) return;
      s.answer = m.options[+b.dataset.aha];
      persist();
      $("#board").querySelectorAll("[data-aha]").forEach((el) => el.classList.toggle("selected", el === b));
    }));
    const inp = $("#ahaInput");
    if (inp) {
      inp.oninput = () => { s.answer = inp.value; persist(); };
      inp.onkeydown = (e) => { if (e.key === "Enter") check(); };
    }
  }
  function check() {
    if (s.done) return;
    if (s.answer === undefined || String(s.answer).trim() === "") return msg(m.kind === "choice" ? "Choose an answer first." : "Type an answer first.");
    if (ahaCheck(m, s.answer)) {
      complete();
      draw();
      msg("Aha! " + m.why);
    } else {
      s.tries = (s.tries || 0) + 1;
      persist();
      msg(s.tries > 1 ? "Not quite. The hint below might unlock it." : "Not quite. Try a different angle.");
    }
  }
  draw();
  action("Check my answer", check);
  action("A gentle hint", () => msg(m.hint), true);
  if (s.done) msg("✓ " + m.why);
}
function openAha(i) {
  if (ahaLegacy(day, i)) return openGame(3);
  active = i;
  state(i).started = true;
  persist();
  $("#board").innerHTML = "";
  $("#actions").innerHTML = "";
  msg("");
  window.sparkKeys = null;
  ahaRender(i);
}
