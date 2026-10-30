// Builds dist/ladders.js: five-letter word ladders whose shortest route uses only
// everyday words. Run: node tools/build-ladders.cjs
const fs = require("fs"), vm = require("vm"), path = require("path");
const root = path.join(__dirname, "..");
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, "dist/valid-words.js"), "utf8") + ";this.V=VALID_GUESSES", ctx);
const VALID = ctx.V;
const COMMON = `
about above actor acute admit adopt adult after again agent agree ahead alarm album alert alike alive allow alone along alter among anger angle angry apart apple apply arena argue arise armed aside asset audio avoid award aware awful bacon badge badly baker bales balls bands banks barge barks barns based basic basin basis batch beach beads beams beans beard bears beast beats beets began begin being bells belly below belts bench berry bikes bills birds birth black blade blame bland blank blast blaze bleak blend bless blind blink block blond blood bloom blown blows boats bolts bones bonus books boost boots bored bound bowls boxes brain brake brand brass brave bread break brick bride brief bring brisk broad broke brook broom brown brush build built bulbs bulls bumps bunch burns burst buyer cabin cable cakes calls calms camel camps candy canes canoe cards cared cares cargo carry carts cases catch cause caves cells chain chair chalk champ chant charm chart chase cheap check cheek cheer chess chest chick chief child chill chimp china chips choir chose cider cites civic claim clamp clams clang clank clash clasp class clean clear clerk click cliff climb cling cloak clock close cloth cloud clown clubs coach coast coats cocoa codes coins colds color comet comic cooks cools coral cords cores corns couch cough could count court cover crabs crack craft crane crank crash crate crawl crazy cream creek crest crews cried cries crime crisp crops cross crowd crown crude cruel crumb crush crust cubes cured curls curve cycle daily dairy daisy dance dared dares darts dates deals dealt dears death debut decay decks deeds delay dense depth desks diary diner dirty disco ditch dived diver dives dizzy docks dodge doing dolls donor doors doses doubt dough doves dozen draft drain drake drama drank drape drawn draws dread dream dress dried drift drill drink drive drops drove drums drunk ducks dunes dusty dwarf eager eagle early earns earth eased eases eaten eater edges eight elbow elder elect elite empty ended enemy enjoy enter entry equal error essay event every exact exist extra faced faces facts fails faint fairy faith falls false fancy fares farms fatal fault favor fears feast feeds feels fence ferry fetch fever fewer fiber field fifth fifty fight files fills films final finds fined fines fires firms first fists fixed flags flake flame flare flash flask flats flaws fleet flesh flies fling flint float flock flood floor flour flows fluid flute foams focus folds folks fonts foods fools force forms forth forty forum found frame frank fraud fresh fried fries frogs front frost froze fruit fuels fully funds funny gains games gangs gates gauge gears genre ghost giant gifts girls given gives glade gland glare glass gleam glide globe gloom glory glove glows goals goats going golds goods goose grace grade grain grand grant grape graph grasp grass grave gravy great greed green greet grief grill grind grins grips groan groom gross group grove grown grows guard guess guest guide guilt hairs halls hands handy hangs happy hardy harms harps haste hated hates hauls haunt haven hawks heads heals heaps heard hears heart heats heavy hedge heels hello helps herbs herds hides highs hikes hills hints hired hobby holds holes holly homes honey hoods hooks hoped hopes horns horse hosts hotel hound hours house hover howls human humor hunts hurry hurts ideal ideas image index inner input irony issue items ivory jeans jelly jewel joins joint jokes jolly judge juice jumps keeps kicks kills kinds kings kites knees knife knock known knows label labor laced lacks lakes lambs lamps lands lanes large laser later laugh layer leads leafy leaks leans leaps learn lease least leave ledge legal lemon level lever light liked likes limbs limit lined linen lines links lions lists lived liver lives loads loans local lodge logic looks loops loose lords loser loses lotus loved lover loves lower loyal lucky lunch lungs lying magic major maker males malls manor maple march marks marry marsh masks match mates meals means meant meats medal media meets melon melts mercy merge merit merry messy metal meter might miles milks mills minds mines minor minus mixed mixes model moist molds money monks month moods moons moral moths motor mound mount mouse mouth moved moves movie muddy mules music nails named names nasty naval needs nerve nests never newer newly night noble nodes noise north noted notes novel nurse oasis ocean offer often older olive onion opens opera orbit order organ other ought ounce outer owned owner oxide paced packs pages pains paint pairs palms panel panic pants paper parks parts party paste patch paths pause peace peach peaks pearl pears peels pence penny perch petal phase phone photo piano picks piece piles pills pilot pinch pines pinks pints pipes pitch pizza place plain plane plank plans plant plate plays plaza plead pleat plots plums plush poems poets point poles polls ponds pools porch ports poses posts pound pours power press price pride prime print prize probe prone proof proud prove pulse pumps punch pupil puppy purse queen query quest quick quiet quilt quite quote races racks radar radio rails rains raise rakes ranch range ranks rapid rates ratio reach reads ready realm rebel refer reign relax relay reply rider rides ridge rifle right rings rinse risen rises risks river roads roars roast robes robin robot rocks rocky roles rolls roofs rooms roots ropes roses rough round route royal rugby ruins ruled rules rural rusty sadly safer sails saint salad sales salon salty sands sandy sauce saved saves scale scare scarf scene scent scold scone scoop score scout scrap seals seams seats seeds seeks seems sells sends sense serve seven shade shake shall shame shape share shark sharp shave sheep sheet shelf shell shift shine shiny ships shirt shock shoes shone shook shoot shops shore short shots shout shown shows shred shrub sides sight signs silks silly since sings sinks sites sixth sixty sized sizes skate skill skins skirt skull slabs slate sleep slept slice slide slope slots small smart smell smile smoke snack snail snake sneak snore snowy soaps sober socks solar solid solve songs sorry sorts souls sound soups south space spare spark speak spear speed spell spend spent spice spill spine spoke spoon sport spots spray squad stack staff stage stain stair stake stale stall stamp stand stare stars start state stays steak steal steam steel steep steer stems steps stick stiff still sting stock stole stone stood stool stops store storm story stove strap straw stray strip stuck study stuff style sugar suits sunny super surge swamp swans swear sweat sweep sweet swell swept swift swing sword table tails taken takes tales talks tally tanks tapes taste tasty teach teams tears teeth tells tempo tends tenth tents terms tests thank theft their theme there these thick thief thing think third those three threw throw thumb tides tiger tight tiles timer times tired title toast today token tones tools tooth topic torch total touch tough tours towel tower towns toxic trace track trade trail train trait treat trees trend trial tribe trick tried tries trips truck truly trunk trust truth tubes tulip tunes turns tutor twice twins twist types uncle under union unite unity until upper upset urban usage users usual valid value valve vapor vault verse video views villa vinyl viral virus visit vital vivid vocal voice votes wages wagon waist waits wakes walks walls wants warms warns waste watch water waves wears weary weave weeds weeks weigh weird wells whale wheat wheel where which while white whole whose wider widow width winds wines wings wiped wires wiser witch wives woman women woods words works world worms worry worse worst worth would wound woven wrist write wrong wrote yards yearn years yeast yield young yours youth zebra zones
`.split(/\s+/).filter(w => w.length === 5).map(w => w.toUpperCase());
const words = [...new Set(COMMON)].filter(w => VALID.has(w)).sort();
const buckets = new Map();
for (const w of words) for (let i = 0; i < 5; i++) {
  const k = w.slice(0, i) + "_" + w.slice(i + 1);
  if (!buckets.has(k)) buckets.set(k, []);
  buckets.get(k).push(w);
}
const neighbours = w => {
  const out = new Set();
  for (let i = 0; i < 5; i++) for (const n of buckets.get(w.slice(0, i) + "_" + w.slice(i + 1)) || []) if (n !== w) out.add(n);
  return [...out];
};
function bfs(start) {
  const prev = new Map([[start, null]]), q = [start], dist = new Map([[start, 0]]);
  while (q.length) {
    const w = q.shift();
    for (const n of neighbours(w)) if (!prev.has(n)) { prev.set(n, w); dist.set(n, dist.get(w) + 1); q.push(n); }
  }
  return { prev, dist };
}
// The full dictionary must not offer a shorter route, so par is truly the fewest steps.
const fullBuckets = new Map();
for (const w of VALID) for (let i = 0; i < 5; i++) {
  const k = w.slice(0, i) + "_" + w.slice(i + 1);
  if (!fullBuckets.has(k)) fullBuckets.set(k, []);
  fullBuckets.get(k).push(w);
}
function fullDistance(a, b, limit) {
  let frontier = [a]; const seen = new Set([a]);
  for (let d = 0; d <= limit; d++) {
    if (frontier.includes(b)) return d;
    const next = [];
    for (const w of frontier) for (let i = 0; i < 5; i++) for (const n of fullBuckets.get(w.slice(0, i) + "_" + w.slice(i + 1)) || []) if (!seen.has(n)) { seen.add(n); next.push(n); }
    frontier = next;
  }
  return Infinity;
}
const targets = [3, 4, 5], banks = [[], [], []];
for (const start of words) {
  const { prev, dist } = bfs(start);
  for (const [end, d] of dist) {
    const level = targets.indexOf(d);
    if (level < 0 || end < start) continue;
    const route = [end];
    while (route[0] !== start) route.unshift(prev.get(route[0]));
    banks[level].push(route);
  }
}
let seed = 7;
const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const out = banks.map((bank, level) => {
  const picked = [], usedEnds = new Set();
  const shuffled = bank.map(p => [rand(), p]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  for (const p of shuffled) {
    const a = p[0], b = p.at(-1);
    if (usedEnds.has(a) || usedEnds.has(b)) continue;
    if (fullDistance(a, b, targets[level]) !== targets[level]) continue;
    picked.push(p); usedEnds.add(a); usedEnds.add(b);
    if (picked.length === 90) break;
  }
  return picked;
});
fs.writeFileSync(path.join(root, "dist/ladders.js"),
  "/* Generated by tools/build-ladders.cjs. Shortest routes of everyday words; [Gentle, Medium, Tricky]. */\n" +
  "const LADDER_COMMON=new Set(" + JSON.stringify(words.join(" ")) + ".split(' '));\n" +
  "const LADDERS=" + JSON.stringify(out.map(b => b.map(p => p.join(" ")))) + ";\n");
console.log("common words:", words.length, "ladders:", out.map(b => b.length).join("/"), "candidates:", banks.map(b => b.length).join("/"));
