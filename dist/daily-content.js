/* Versioned content keeps started legacy puzzles intact. Dates use UTC calendar
   arithmetic so DST and device timezone do not change a date's assignment. */
function calendarIndex(d){const [y,m,n]=d.split('-').map(Number);return Math.floor(Date.UTC(y,m-1,n)/86400000)}
function mod(n,m){return ((n%m)+m)%m}
function freshContent(d,i){const s=all[progressKey(d)]?.games?.[i];return !s?.started||s.contentVersion===2}
const WORD_CYCLE=shuffle(words,rng('little-sparks-words-v2'));
/* Letterlight answers (v3): everyday words a fluent non-native reader knows, no plurals, few rare letters and no big
   rhyme families. The cycle is longer than a year, and levels sit a third of the cycle apart (141 days). Started puzzles
   keep their word: no contentVersion → original random pick, contentVersion 2 without words:3 → the 96-word cycle. */
const WORD_ANSWERS=`ABOVE ADULT AFTER AGAIN ALBUM ANGEL APPLE AWAKE BADGE BAKER BASIC BEACH BEGIN BELOW BENCH BERRY BIRTH BLACK BLEND BLINK
BLOCK BLOOM BRAIN BRAVE BREAD BREAK BRICK BRIEF BRING BROAD BROOM BROWN BRUSH BUILD BUNCH BUNNY CABIN CABLE CAMEL CANDY
CANOE CARRY CHAIN CHAIR CHALK CHARM CHART CHASE CHECK CHEEK CHEER CHESS CHEST CHICK CHIEF CHILD CHILL CLASS CLEAN CLEAR
CLIMB CLOCK CLOSE CLOTH CLOUD CLOWN COACH COAST COCOA COMET CORAL COUCH COUNT COVER CRAFT CRANE CRAZY CREAM CRISP CROWD
CROWN CURRY CURVE CYCLE DAILY DAIRY DAISY DANCE DELAY DIARY DOUGH DOZEN DRAMA DREAM DRESS DRINK DRIVE EAGER EAGLE EARLY
EARTH ENJOY ENTER EQUAL EVENT EVERY EXTRA FAIRY FAITH FANCY FEAST FENCE FERRY FIELD FIFTY FINAL FIRST FLAME FLASH FLOAT
FLOOR FLOUR FLUTE FORTY FRAME FRESH FRONT FROST FRUIT FUNNY GIANT GLASS GLOBE GLORY GLOVE GOOSE GRACE GRADE GRAIN GRAND
GRAPE GRAPH GRASS GREAT GREEN GREET GRILL GROUP GUAVA GUESS GUEST GUIDE HANDY HAPPY HEART HEAVY HELLO HIPPO HOBBY HONEY
HORSE HOTEL HOUSE HUMAN HURRY IDEAL IMAGE JELLY JEWEL JOLLY JUICE KITTY KNOCK KOALA LABEL LARGE LATER LAUGH LAYER LEARN
LEMON LEVEL LIMIT LOCAL LOGIC LOTUS LOYAL LUCKY LUNAR LUNCH MAGIC MANGO MAPLE MARCH MEDAL MELON MERRY METAL METRO MINOR
MISTY MIXED MODEL MONEY MONTH MOTOR MOUSE MOUTH MOVIE MUSIC NIECE NOBLE NOISE NORTH NOVEL NURSE OCEAN OFFER OFTEN OLIVE
ONION ORBIT ORDER OTHER OTTER OWNER PAINT PANDA PANEL PAPER PARTY PASTA PAUSE PEACE PEACH PEARL PENNY PETAL PHONE PHOTO
PIANO PIECE PILOT PIZZA PLACE PLAIN PLATE POINT POPPY PORCH POWER PRESS PRICE PRIDE PRINT PRIZE PROOF PROUD PUPIL PUPPY
PURSE QUEEN QUICK QUIET RADIO RAINY RANGE RAPID REACH READY RELAX REPLY RHINO RIDER RIVER ROAST ROBIN ROBOT ROCKY ROUTE
ROYAL RULER SALAD SALTY SANDY SAUCE SCALE SCARF SCENE SCOOP SCORE SCOUT SEVEN SHARK SHARP SHEEP SHEET SHELF SHELL SHIFT
SHINE SHINY SHIRT SHORE SHORT SHOUT SILLY SKATE SKILL SKIRT SLEEP SLICE SLIDE SLOPE SMALL SMART SMELL SMILE SNACK SNAIL
SNAKE SNOWY SOLAR SOLID SOLVE SORRY SOUTH SPACE SPARK SPEAK SPEED SPELL SPEND SPICE SPICY SPOON SPORT STAIR STAMP STAND
START STEAM STICK STILL STONE STOOL STORE STORM STORY STOVE STRAW STUDY SUGAR SUNNY SUPER SWEEP SWEET SWIFT SWING SYRUP
TABLE TASTE TASTY TEACH TEDDY THANK THEME THING THINK THIRD THREE THROW THUMB TIGER TIRED TITLE TOAST TODAY TOOTH TOPIC
TORCH TOTAL TOUCH TOWEL TOWER TRACK TRADE TRAIL TRAIN TREAT TRICK TRUCK TRUST TRUTH TULIP TWICE TWIST UNCLE UNDER UNITY
UNTIL USUAL VALUE VIDEO VILLA VISIT VIVID VOICE WAGON WATER WEAVE WHALE WHEAT WHEEL WHITE WHOLE WINDY WOMAN WORLD WORTH
WRITE YOUNG YOUTH ZEBRA`.split(/\s+/);
const WORD_CYCLE3=shuffle(WORD_ANSWERS,rng('little-sparks-words-v3')),WORD_LEVEL_GAP=Math.floor(WORD_CYCLE3.length/3);
function wordAnswer(d){const s=all[progressKey(d)]?.games?.[0];if(!freshContent(d,0)){const r=rng(puzzleSeed(d)+'word');return words[Math.floor(r()*words.length)]}if(s?.started&&s.words!==3)return WORD_CYCLE[mod(calendarIndex(d)+difficulty*31,WORD_CYCLE.length)];return WORD_CYCLE3[mod(calendarIndex(d)+difficulty*WORD_LEVEL_GAP,WORD_CYCLE3.length)]}
const legacyLogicModel=logicModel;
logicModel=function(d){
 if(!freshContent(d,3))return legacyLogicModel(d);
 const index=calendarIndex(d),n=2+mod(index,61),type=mod(index,8),r=rng(puzzleSeed(d)+'reasoning-v2');
 const step=2+difficulty*2+mod(index,3);let q,a,hint,why;
 if(type===0){const gap=step;
  if(difficulty===0){q=`What comes next: ${n}, ${n+gap}, ${n+2*gap}, ${n+3*gap}, …?`;a=n+4*gap;hint='Compare two neighbouring numbers.';why=`Each step adds ${gap}. The next number is ${a}.`}
  else{const k=difficulty===2?2:1;q=`The gaps grow by ${k} each time. What comes next: ${n}, ${n+gap}, ${n+2*gap+k}, ${n+3*gap+3*k}, …?`;a=n+4*gap+6*k;hint=`The first gap is ${gap}. Find the next three gaps.`;why=`The gaps are ${gap}, ${gap+k}, ${gap+2*k}, ${gap+3*k}. The next number is ${a}.`}
 }else if(type===1){const total=n+8,front=2+mod(index,5);q=`There are ${total} people in a queue. Nidhi is ${front}${front===2?'nd':front===3?'rd':'th'} from the front. What is her position from the back?`;a=total-front+1;hint='Count Nidhi once, not twice.';why=`${total} − ${front} + 1 = ${a}.`;
 }else if(type===2){const colours=3+difficulty,target=2+difficulty;q=`A bag has ${colours} colours of beads, with ${n+target} of each colour. Without looking, how many beads guarantee ${target} of one colour?`;a=colours*(target-1)+1;hint=`In the worst case you take ${target-1} of every colour first.`;why=`You can take ${colours} × ${target-1} = ${a-1} beads without reaching ${target} of one colour. One more guarantees it.`;
 }else if(type===3){const sides=3+difficulty,rounds=n+2;q=`You arrange ${rounds} separate ${sides===3?'triangles':sides===4?'squares':'pentagons'} using matchsticks. No sides are shared. How many matchsticks are needed?`;a=rounds*sides;hint=`Each shape has ${sides} sides.`;why=`${rounds} shapes × ${sides} sides = ${a} matchsticks.`;
 }else if(type===4){const red=n+3,blue=n+step,total=red+blue;q=`A basket has ${total} flowers. ${red} are red and the rest are blue. You give away ${step} blue flowers. How many blue flowers remain?`;a=blue-step;hint='Find the number of blue flowers before subtracting the gift.';why=`${total} − ${red} − ${step} = ${a}.`;
 }else if(type===5){const start=3+mod(n,8),duration=n+4+difficulty*12;q=`A clock shows ${start}:00. What hour will it show ${duration} hours later? Use a 12-hour clock.`;a=mod(start+duration-1,12)+1;hint='Every full 12 hours returns to the same position.';why=`Advance ${duration%12} hours from ${start}:00 after removing full 12-hour cycles: ${a}:00.`;
 }else if(type===6){const people=n+2,per=2+difficulty;q=`${people} friends each send one postcard to ${per} different friends. How many postcards are sent altogether?`;a=people*per;hint='Count the postcards sent by each person.';why=`${people} people × ${per} postcards = ${a}.`;
 }else{const cost=n+3,extra=step*2,total=cost*2+extra;q=`A notebook and a pen cost ₹${total} together. The notebook costs ₹${extra} more than the pen. How much does the pen cost?`;a=cost;hint='Remove the price difference, then split what remains equally.';why=`(₹${total} − ₹${extra}) ÷ 2 = ₹${a}.`}
 const choices=[a,a+1,a+step+1,Math.max(0,a-1)];return{q,a,options:shuffle([...new Set(choices)],r),hint,why};
};

// Enumerate full garden paths once, then select distinct clue layouts by date.
const legacyTrailModel=trailModel,TRAIL_CYCLES=new Map();
function trailCycle(level){
 if(TRAIL_CYCLES.has(level))return TRAIL_CYCLES.get(level);
 const points=[0,...(level===0?[2,5,8,12]:level===1?[4,9]:[]),15],seen=new Set(),paths=[];
 function visit(path,used){const i=path.at(-1);if(path.length===16){const key=points.map(j=>path[j]).join(',');if(!seen.has(key)){seen.add(key);paths.push(path)}return}
  for(const j of [i-4,i+4,i%4?i-1:-1,i%4<3?i+1:-1])if(j>=0&&j<16&&!(used&(1<<j)))visit([...path,j],used|(1<<j));
 }
 for(let i=0;i<16;i++)visit([i],1<<i);
 const cycle=shuffle(paths,rng('garden-cycle-v2-'+level));TRAIL_CYCLES.set(level,cycle);return cycle;
}
trailModel=function(d){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!freshContent(d,4))return legacyTrailModel(d);
 const cycle=trailCycle(difficulty),path=cycle[mod(calendarIndex(d),cycle.length)],points=difficulty===0?[0,2,5,8,12,15]:difficulty===1?[0,4,9,15]:[0,15];
 return{path:path.slice(),anchors:points.map((p,i)=>({cell:path[p],number:i+1}))};
};
