const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const nodes=new Map();const el=()=>({innerHTML:'',textContent:'',value:'',children:[],open:false,append(b){this.children.push(b)},querySelectorAll(){return[]},setAttribute(){},showModal(){this.open=true},close(){this.open=false}});
const ctx={document:{querySelector(k){if(!nodes.has(k))nodes.set(k,el());return nodes.get(k)},querySelectorAll(){return[]},createElement:el},window:{},localStorage:{getItem(){return null},setItem(){}},setInterval(){}};vm.createContext(ctx);
for(const f of ['app.js','daily-content.js','photos.js','extras.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),ctx);
vm.runInContext(`
if(PHOTO_BANK.length!==183)throw Error('Expected 183 photos');
if(new Set(PHOTO_BANK.map(p=>p.image)).size!==183)throw Error('Duplicate image IDs');
for(let level=0;level<3;level++){
 difficulty=level;
 for(const centre of ['2026-10-30','2026-12-31','2027-03-28']){
  const start=calendarIndex(centre)-30,images=new Set(),answers=new Set(),questions=new Set(),gardens=new Set();
  for(let n=0;n<61;n++){
   const d=new Date((start+n)*86400000).toISOString().slice(0,10),photos=photoSet(d),q=logicModel(d);
   if(photos.length!==3||!photos.some(p=>p.india))throw Error('Invalid photo round');
   for(const p of photos){if(images.has(p.image))throw Error('Photo repeated within 61 days');images.add(p.image);if(!Number.isInteger(p.year)||p.year<1850||p.year>2025||!p.source||!p.credit)throw Error('Invalid metadata')}
   const garden=JSON.stringify(trailModel(d).anchors);if(gardens.has(garden))throw Error('Repeated garden clues');gardens.add(garden);const answer=wordAnswer(d);if(answers.has(answer))throw Error('Word repeated within 61 days');answers.add(answer);
   if(questions.has(q.q))throw Error('Reasoning question repeated');questions.add(q.q);
   if(q.options.filter(x=>x===q.a).length!==1||new Set(q.options).size!==q.options.length)throw Error('Bad answer choices');
   if(countSolutions(sudokuModel(d).clues)!==1)throw Error('Non-unique Sudoku');
  }
  if(images.size!==183)throw Error('Window not filled');
 }
}
// Started legacy puzzles keep their old word and reasoning model.
difficulty=1;day='2026-10-29';all[progressKey(day)]={games:{0:{started:true,guesses:['HELLO']},3:{started:true,answer:3},5:{started:true,photoIds:PHOTO_BANK.slice(0,3).map(p=>p.image)}}};setup();
const legacyAnswer=words[Math.floor(rng(puzzleSeed(day)+'word')()*words.length)];
if(wordAnswer(day)!==legacyAnswer)throw Error('Legacy word changed');
if(JSON.stringify(logicModel(day))!==JSON.stringify(legacyLogicModel(day)))throw Error('Legacy reasoning changed');
const oldIds=state(5).photoIds.slice();openExtra(5);if(JSON.stringify(state(5).photoIds)!==JSON.stringify(oldIds))throw Error('Legacy photos changed');
// Fresh puzzle remains the same after marking it started and after reloading state.
day='2026-11-25';setup();const a=wordAnswer(day),q=JSON.stringify(logicModel(day));state(0).started=true;state(3).started=true;all=JSON.parse(JSON.stringify(all));setup();
if(wordAnswer(day)!==a||JSON.stringify(logicModel(day))!==q)throw Error('Fresh content changed on resume');
$('#past').onclick();if(($('#days').innerHTML.match(/data-date=/g)||[]).length!==31)throw Error('Archive must include today plus 30 days');
`,ctx);
const bank=vm.runInContext('PHOTO_BANK',ctx);const hashes=new Set();const crypto=require('crypto');for(const p of bank){const f=path.join('dist',p.image);assert(fs.existsSync(f),f);const hash=crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');assert(!hashes.has(hash),'Duplicate image bytes');hashes.add(hash)}
console.log('PASS: 61-day windows at all levels; 183 distinct local photos; Indian context daily; unique words/questions; legacy and new save continuity; 30-day archive.');
