const fs=require('fs'),vm=require('vm'),assert=require('assert');
const nodes=new Map();let form,input={value:''};
function el(){return {innerHTML:'',textContent:'',children:[],append(b){this.children.push(b)},querySelectorAll(){return[]},querySelector(){return input},setAttribute(){},showModal(){},close(){}}}
const ctx={document:{querySelector(s){if(!nodes.has(s))nodes.set(s,el());return nodes.get(s)},querySelectorAll(){return[]},createElement(t){const e=el();if(t==='form')form=e;return e}},localStorage:{getItem(){return null},setItem(){}},window:{},setInterval(){}};
vm.createContext(ctx);
for(const f of ['valid-words.js','app.js','daily-content.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),ctx);
function submit(v){input.value=v;form.onsubmit({preventDefault(){}})}
vm.runInContext('setup();openGame(0)',ctx);
submit('ZZZZZ');assert.equal(vm.runInContext('state(0).guesses.length',ctx),0);assert.match(nodes.get('#feedback').textContent,/no guess used/);
submit('crane');assert.equal(vm.runInContext('state(0).guesses[0]',ctx),'CRANE');
submit('CRANE');assert.equal(vm.runInContext('state(0).guesses.length',ctx),1);
const answer=vm.runInContext('wordAnswer(day)',ctx);submit(answer);assert.equal(vm.runInContext('state(0).done',ctx),true);
const keyboard=nodes.get('#board').children.at(-1).innerHTML;assert(keyboard.includes('letterkey correct'));assert(keyboard.includes('disabled'));
assert(vm.runInContext("words.every(w=>VALID_GUESSES.has(w)||words.includes(w))",ctx));
console.log('Passed: invalid guess consumes no attempt; valid lowercase accepted; duplicate rejected; answer completes puzzle.');

vm.runInContext("all={};setup();wordAnswer=()=> 'APPLE';openGame(0)",ctx);
submit('ALLEY');
const repeated=nodes.get('#board').children.at(-1).innerHTML;
assert.match(repeated,/class="letterkey present " data-letter="L"/);
submit('AMPLE');
assert.match(nodes.get('#board').children.at(-1).innerHTML,/class="letterkey correct " data-letter="L"/);
console.log('Passed: duplicate letters retain their strongest keyboard feedback.');

// Letterlight answer list (v3): size, no duplicates, valid guesses, no rare words, plurals or rhyme traps,
// no repeat within 365 days on a level, levels well apart, and started puzzles keep their word.
const ctx2={document:ctx.document,localStorage:ctx.localStorage,window:{},setInterval(){}};vm.createContext(ctx2);for(const f of ['valid-words.js','app.js','daily-content.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),ctx2);
vm.runInContext(`
const fail=(m)=>{throw Error(m)};
const RARE=new Set('NYMPH QUALM FJORD GLYPH KNOLL TRYST VAPID WRUNG ABYSS EPOCH SPRIG PLUME THYME TWIRL LILAC POUCH LIGHT NIGHT STARS FIGHT MIGHT SIGHT RIGHT TIGHT SOUND FOUND MOUND POUND HOUND WOUND ROUND'.split(' '));
const FAMILIAR_RARE_LETTERS=new Set('ZEBRA PIZZA PRIZE CRAZY DOZEN JELLY JUICE JOLLY ENJOY JEWEL QUEEN QUICK QUIET EXTRA MIXED RELAX EQUAL'.split(' '));
if(WORD_ANSWERS.length<380||WORD_ANSWERS.length>450)fail('answer list should hold about 400 words: '+WORD_ANSWERS.length);
if(new Set(WORD_ANSWERS).size!==WORD_ANSWERS.length)fail('duplicate answers');
for(const w of WORD_ANSWERS){
  if(!/^[A-Z]{5}$/.test(w)||!VALID_GUESSES.has(w))fail('answer is not a valid guess: '+w);
  if(RARE.has(w))fail('rare or rhyme-trap word in answers: '+w);
  if(/[QXZJ]/.test(w)&&!FAMILIAR_RARE_LETTERS.has(w))fail('rare letter in an unfamiliar answer: '+w);
  if(/[^S]S$/.test(w)&&!['LOTUS','OASIS','FOCUS'].includes(w))fail('plural answer: '+w);
}
all={};const start=calendarIndex('2026-01-01'),seen=[new Map(),new Map(),new Map()];let minCross=Infinity;
const iso=(n)=>new Date(n*86400000).toISOString().slice(0,10);
for(let n=start;n<start+800;n++)for(let lv=0;lv<3;lv++){
  difficulty=lv;const w=wordAnswer(iso(n));
  if(seen[lv].has(w)&&n-seen[lv].get(w)<366)fail('word repeats within 365 days on level '+lv+': '+w);
  seen[lv].set(w,n);
  for(let o=0;o<3;o++)if(o!==lv&&seen[o].has(w))minCross=Math.min(minCross,n-seen[o].get(w));
}
if(minCross<133)fail('the same word comes up on two levels only '+minCross+' days apart');
// Started puzzles keep the word they began with.
difficulty=1;const d='2026-11-07',k=progressKey(d),v2=WORD_CYCLE[mod(calendarIndex(d)+31,WORD_CYCLE.length)],legacy=words[Math.floor(rng(puzzleSeed(d)+'word')()*words.length)];
all={[k]:{games:{0:{started:true,contentVersion:2}}}};if(wordAnswer(d)!==v2)fail('started 96-word puzzle changed its word');
all={[k]:{games:{0:{started:true}}}};if(wordAnswer(d)!==legacy)fail('started legacy puzzle changed its word');
all={[k]:{games:{0:{started:true,contentVersion:2,words:3}}}};if(wordAnswer(d)!==WORD_CYCLE3[mod(calendarIndex(d)+WORD_LEVEL_GAP,WORD_CYCLE3.length)])fail('new puzzles use the v3 list');
all={};day=d;setup();if(state(0).words!==3||wordAnswer(d)!==WORD_CYCLE3[mod(calendarIndex(d)+WORD_LEVEL_GAP,WORD_CYCLE3.length)])fail('fresh state is stamped words:3');
globalThis.wordStats={n:WORD_ANSWERS.length,minCross};
`,ctx2);
const ws=vm.runInContext('wordStats',ctx2);
console.log(`Passed: ${ws.n} Letterlight answers, no duplicates, all valid guesses, none rare/plural; no repeat within 365 days per level; same word on two levels at least ${ws.minCross} days apart; started puzzles keep their word.`);
