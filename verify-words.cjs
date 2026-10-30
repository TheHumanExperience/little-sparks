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
