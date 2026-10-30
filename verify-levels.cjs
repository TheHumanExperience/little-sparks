const fs=require('fs'),vm=require('vm'),assert=require('assert');
for(let level=0;level<3;level++){
 let src=fs.readFileSync('verify.cjs','utf8').replace('for(let n=0;n<366;n++)',`vm.runInContext('difficulty=${level}',context);for(let n=0;n<366;n++)`);
 vm.runInNewContext(src,{require,console});
 let extra=fs.readFileSync('verify-extras.cjs','utf8').replace('for(let n=1;n<=365;n++)',`difficulty=${level};setup();for(let n=1;n<=365;n++)`).replace("if(new Set(photos).size!==3)","if(!photos.some(p=>p.india))throw Error('Missing Indian photo');if(new Set(photos).size!==3)");
 vm.runInNewContext(extra,{require,console});
 console.log('Level',level,'passed');
}
// Stateful checks: persistence and legacy progress survive switching and reload.
const nodes=new Map(),storage={};function el(){return{textContent:'',innerHTML:'',value:'',open:false,children:[],append(b){this.children.push(b)},setAttribute(){},querySelectorAll:()=>[],showModal(){this.open=true}}}
const ctx={document:{querySelector(s){if(!nodes.has(s))nodes.set(s,el());return nodes.get(s)},querySelectorAll:()=>[],createElement:()=>el()},localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=String(v)},window:{},setInterval(){}};
vm.createContext(ctx);for(const f of ['app.js','photos.js','extras.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),ctx);
vm.runInContext(`
changeDifficulty(1);state(0).guesses=['HELLO'];persist();let legacy=JSON.stringify(data);changeDifficulty(0);if(state(0).guesses)throw Error('Progress leaked');state(1).done=true;persist();changeDifficulty(2);if(state(1).done)throw Error('Progress leaked');changeDifficulty(1);if(JSON.stringify(data)!==legacy)throw Error('Legacy lost');changeDifficulty(0);if(!state(1).done)throw Error('Level progress lost');
for(let l=0;l<3;l++){changeDifficulty(l);for(let n=1;n<100;n++){let d='day'+n,m=sudokuModel(d);if(m.clues.filter(Boolean).length<(l===0?10:l===1?6:4))throw Error('Clue count too small');if(trailModel(d).anchors.length!==[6,4,2][l])throw Error('Wrong anchors');}openGame(0);if(!$('#rules').textContent.includes([8,6,5][l]+' guesses'))throw Error('Wrong guesses');}
`,ctx);
assert.equal(storage['little-sparks-difficulty'],'2');console.log('PASS: separate level progress, legacy progress, difficulty persistence, clues, anchors, word attempts');
