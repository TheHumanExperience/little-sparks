const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const nodes=new Map();const el=()=>({innerHTML:'',textContent:'',value:'',children:[],open:false,append(b){this.children.push(b)},querySelectorAll(){return[]},setAttribute(){},showModal(){this.open=true},close(){this.open=false}});
const ctx={document:{querySelector(k){if(!nodes.has(k))nodes.set(k,el());return nodes.get(k)},querySelectorAll(){return[]},createElement:el},window:{},localStorage:{getItem(){return null},setItem(){}},setInterval(){}};vm.createContext(ctx);
for(const f of ['app.js','daily-content.js','photos.js','extras.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),ctx);
vm.runInContext(`
if(ACTIVE_PHOTOS.length!==183)throw Error('Expected 183 active photos');
if(new Set(PHOTO_BANK.map(p=>p.image)).size!==PHOTO_BANK.length)throw Error('Duplicate image IDs');
if(PHOTO_BANK.slice(0,182).some(p=>p.image.startsWith('photos/hist-'))||LEGACY_PHOTO_BANK.length!==183||LEGACY_PHOTO_BANK[114]!==photoById('photos/archive-20372670.jpg'))throw Error('Original 183 slots must keep their order for legacy saves');
for(const [gone,alt] of Object.entries(REMOVED_PHOTOS)){if(PHOTO_BANK.some(p=>p.image===gone))throw Error('Removed photo still in bank: '+gone);const f=photoById(gone),o=PHOTO_BANK.find(p=>p.image===alt);if(!o||o.retired||f!==o)throw Error('Removed photo needs an active stand-in: '+gone);}
if(photoById('photos/archive-20372670.jpg').year!==1930)throw Error('Stand-in must keep the removed photo year');
for(const p of PHOTO_BANK){if(p.iconic&&(!p.why||!p.clue))throw Error('Iconic photo needs why and clue: '+p.image);if(!p.retired&&!p.clue)throw Error('Active photo needs a curated clue: '+p.image);if(p.clue&&/\b(?:18|19|20)\d{2}s?\b/.test(p.clue))throw Error('Clue reveals a year: '+p.image);if(p.image.startsWith('photos/hist-')&&!(p.licenseUrl||/public domain|no known copyright/.test(p.credit)))throw Error('New photo needs a licence: '+p.image)}
for(const p of ACTIVE_PHOTOS){for(let level=0;level<3;level++){difficulty=level;const parts=photoClue(p).split('<em class="era-whisper">');const w=parts[1]?parts[1].split('<')[0]:'';if(level<2&&!w)throw Error('Missing era hint: '+p.image+' level '+level);if(level===2&&w)throw Error('Hard shows an era hint');if(/[0-9]/.test(w))throw Error('Era hint shows a number: '+w)}}
for(let level=0;level<3;level++){
 difficulty=level;
 for(const centre of ['2026-10-30','2026-12-31','2027-03-28']){
  const start=calendarIndex(centre)-30,images=new Set(),answers=new Set(),questions=new Set(),gardens=new Set();
  for(let n=0;n<61;n++){
   const d=new Date((start+n)*86400000).toISOString().slice(0,10),photos=photoSet(d),q=logicModel(d);
   if(photos.length!==3||!photos.some(p=>p.india)||!photos.some(p=>p.iconic)||photos.some(p=>p.retired))throw Error('Invalid photo round');
   const old=legacyPhotoSet(d);if(old.length!==3||!old.some(p=>p.india)||old.some(p=>!LEGACY_PHOTO_BANK.includes(p)))throw Error('Invalid legacy photo round');
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
// The 31-day archive (today plus 30 days) is checked in verify-feed.cjs.
`,ctx);
const bank=vm.runInContext('PHOTO_BANK',ctx);const hashes=new Set();const crypto=require('crypto');for(const p of bank){const f=path.join('dist',p.image);assert(fs.existsSync(f),f);const hash=crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');assert(!hashes.has(hash),'Duplicate image bytes');hashes.add(hash)}
console.log('PASS: 61-day windows at all levels; 183 active of '+bank.length+' distinct local photos (retired kept for saves); history-shaping and Indian photo daily; unique words/questions; legacy and new save continuity; 30-day archive.');
