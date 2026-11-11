const fs=require('fs'),vm=require('vm'),assert=require('assert');
// Stateful checks: persistence and legacy progress survive switching and reload.
const {context:ctx,storage}=require('./tests/load-app.cjs').loadApp();
vm.runInContext(`
changeDifficulty(1);state(0).guesses=['HELLO'];persist();let legacy=JSON.stringify(data);changeDifficulty(0);if(state(0).guesses)throw Error('Progress leaked');state(1).done=true;persist();changeDifficulty(2);if(state(1).done)throw Error('Progress leaked');changeDifficulty(1);if(JSON.stringify(data)!==legacy)throw Error('Legacy lost');changeDifficulty(0);if(!state(1).done)throw Error('Level progress lost');
for(let l=0;l<3;l++){changeDifficulty(l);for(let n=1;n<100;n++){let d='day'+n,m=sudokuModel(d);if(m.clues.filter(Boolean).length<(l===0?10:l===1?6:4))throw Error('Clue count too small');if(trailModel(d).anchors.length!==[6,4,2][l])throw Error('Wrong anchors');}openGame(0);if(!$('#rules').textContent.includes([8,6,5][l]+' guesses'))throw Error('Wrong guesses');}
`,ctx);
assert.equal(storage['little-sparks-difficulty'],'2');console.log('PASS: separate level progress, legacy progress, difficulty persistence, clues, anchors, word attempts');
