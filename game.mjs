import {API_URL,DIRS,TARGETS,SOURCE,hash,parseCore,sourceKey,makePuzzle,flow,turnTile,hintTile,score} from './engine.mjs';
const $=id=>document.getElementById(id), board=$('board');
let snapshot=null, game=makePuzzle(sourceKey(null)), initialKey=game.key, started=false, paused=false, fetching=false, lastTick=performance.now(), variant=0;
let stored={};try{const v=JSON.parse(localStorage.getItem('squeek-circuit-records-v1'));if(v&&typeof v==='object'&&!Array.isArray(v))stored=v;}catch{}
const formatTime=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
const status=text=>{$('action-status').textContent=text;};
const tileButtons=[];
function tileSvg(mask){const lines=DIRS.filter(d=>mask&d.bit).map(d=>`M 50 50 L ${50+d.dc*50} ${50+d.dr*50}`).join(' ');return `<svg viewBox="0 0 100 100" aria-hidden="true"><path class="pipe-shadow" d="${lines}"/><path class="pipe" d="${lines}"/><circle class="joint" cx="50" cy="50" r="8"/></svg>`;}
for(let i=0;i<25;i++){
 const b=document.createElement('button');b.type='button';b.className='tile';b.dataset.index=String(i);
 b.addEventListener('click',e=>{if(paused||fetching||game.won)return;if(!started)lastTick=performance.now();started=true;if(turnTile(game,i,e.shiftKey?-1:1)){status('Follow the glowing line from the wheel.');render();}});
 b.addEventListener('keydown',e=>{const offset={ArrowRight:1,ArrowLeft:-1,ArrowDown:5,ArrowUp:-5}[e.key];if(offset!==undefined){e.preventDefault();const n=i+offset;if(n>=0&&n<25&&(Math.abs(offset)===5||Math.floor(n/5)===Math.floor(i/5)))tileButtons[n].focus();}});
 board.append(b);tileButtons.push(b);
}
function render(){
 const f=flow(game.masks);
 game.masks.forEach((m,i)=>{const b=tileButtons[i];b.innerHTML=tileSvg(m);b.classList.toggle('powered',f.powered.has(i));b.classList.toggle('source-tile',i===SOURCE);b.classList.toggle('target-tile',TARGETS.includes(i));b.classList.toggle('delivered',TARGETS.includes(i)&&f.targets[TARGETS.indexOf(i)]);b.disabled=game.won||paused||fetching;b.setAttribute('aria-label',`Row ${Math.floor(i/5)+1}, column ${i%5+1}. Open ${DIRS.filter(d=>m&d.bit).map(d=>d.name).join(', ')}. ${f.powered.has(i)?'Powered. ':''}Rotate clockwise.`);});
 f.targets.forEach((lit,i)=>{$(`burrow-${i}`).classList.toggle('lit',lit);$(`burrow-${i}`).setAttribute('aria-label',`Burrow ${i+1}: ${lit?'connected':'waiting'}`);});
 $('connected-count').textContent=`${f.targets.filter(Boolean).length} / 3`;
 $('moves').textContent=String(game.moves).padStart(2,'0');$('timer').textContent=formatTime(game.seconds);
 $('hint').disabled=game.won||paused||fetching;$('pause').disabled=game.won||fetching||!started;
 $('reset').disabled=fetching;$('new-board').disabled=fetching;
 $('win-banner').hidden=!game.won;
 if(game.won){
  const points=score(game);$('final-score').textContent=points.toLocaleString('en-US');
  $('win-copy').textContent=`All three burrows connected in ${game.moves} turns and ${formatTime(game.seconds)}. ${game.hints?`${game.hints} hints used.`:'No hints. Nicely wired.'}`;
  if(!Number.isFinite(stored[game.key])||points>stored[game.key]){stored[game.key]=points;try{localStorage.setItem('squeek-circuit-records-v1',JSON.stringify(Object.fromEntries(Object.entries(stored).slice(-100))));}catch{}}
  status('Circuit complete! Your record is saved in this browser.');
 }
 $('best').textContent=Number.isFinite(stored[game.key])?stored[game.key].toLocaleString('en-US'):'—';
}
function describeSource(){
 $('board-code').textContent=`BOARD ${hash(game.key).toString(16).toUpperCase().padStart(8,'0')}`;
 $('mode-label').textContent=snapshot?`SEPOLIA · ROUND ${snapshot.round}${variant?` · VARIANT ${variant+1}`:''}`:'PRACTICE CIRCUIT';
 $('data-dot').classList.toggle('live',Boolean(snapshot));
 if(snapshot){
  const when=snapshot.settledAt?new Date(snapshot.settledAt).toLocaleString():'unknown';
  $('data-summary').textContent=`Round ${snapshot.round} · Recorded ${new Date(snapshot.fetchedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`;
  $('provenance').textContent=`This board is seeded by the official API's Core address (${snapshot.core}), settled round ${snapshot.round}, cumulative block units ${snapshot.units}, and difficulty ${snapshot.difficulty}. Settlement: ${when}. Snapshot read at Ethereum Sepolia block ${snapshot.block}. ${snapshot.paused?'Core reports paused. ':''}The board stays fixed while you play. This is API-reported data, not independent on-chain verification; lit pipes are game state, not real-time mining.`;
  $('core-link').href=`https://sepolia.etherscan.io/address/${snapshot.core}`;$('core-link').textContent='Core contract ↗';
  $('tx-link').href=snapshot.transaction?`https://sepolia.etherscan.io/tx/${snapshot.transaction}`:API_URL;$('tx-link').textContent=snapshot.transaction?'Settlement transaction ↗':'Official API ↗';
 }else{
  $('data-summary').textContent='Practice · No live source';$('provenance').textContent='This is a local practice blueprint. It is not generated from current blockchain activity. Load the latest round to try the official Squeekchain API. Points are personal game scores, not SQK, rewards or whitelist eligibility.';
 }
}
function resetGame(key=initialKey){game=makePuzzle(key);initialKey=key;started=false;paused=false;lastTick=performance.now();document.querySelector('.machine').classList.remove('paused');$('pause').textContent='Ⅱ Pause';tileButtons.forEach(b=>b.classList.remove('hinted'));render();describeSource();status('Your first turn starts the clock.');}
function pauseGame(){if(!started||game.won||paused)return;paused=true;document.querySelector('.machine').classList.add('paused');$('pause').textContent='▶ Resume';status('Shift paused. Press Resume when you are ready.');render();$('pause').disabled=false;}
function resumeGame(){if(!paused)return;paused=false;lastTick=performance.now();document.querySelector('.machine').classList.remove('paused');$('pause').textContent='Ⅱ Pause';status('Back to the circuit.');render();}
$('pause').addEventListener('click',()=>paused?resumeGame():pauseGame());
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseGame();});
window.addEventListener('blur',pauseGame);
document.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='p'&&!$('confirm-dialog').open){e.preventDefault();paused?resumeGame():pauseGame();}});
async function canDiscard(){if(!started||game.won)return true;const wasPaused=paused;pauseGame();const dialog=$('confirm-dialog');dialog.showModal();return new Promise(resolve=>dialog.addEventListener('close',()=>{if(!wasPaused)resumeGame();resolve(dialog.returnValue==='confirm');},{once:true}));}
$('reset').addEventListener('click',async()=>{if(await canDiscard())resetGame();});
$('hint').addEventListener('click',()=>{if(paused||game.won||fetching)return;if(!started)lastTick=performance.now();started=true;tileButtons.forEach(b=>b.classList.remove('hinted'));const i=hintTile(game);render();if(i>=0){tileButtons[i].classList.add('hinted');if(!game.won)status(`Tile ${Math.floor(i/5)+1}, ${i%5+1} is set to a working orientation. Hint cost: 150 points.`);}});
async function loadLatest(initial=false){
 if(fetching)return;
 if(!initial&&!await canDiscard())return;
 fetching=true;render();status('Reading the hamster’s latest settled round…');
 try{
  const r=await fetch(API_URL,{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('API unavailable');
  const next=parseCore(await r.json());
  if(snapshot&&next.core===snapshot.core&&BigInt(next.block)<BigInt(snapshot.block))throw Error('Older snapshot');
  const same=sourceKey(next)===sourceKey(snapshot);snapshot=next;variant=same?variant+1:0;
  resetGame(`${sourceKey(snapshot)}:variant${variant}`);
  status(same?'Same settled round. A new variant is ready.':'Fresh Sepolia blueprint loaded. Your first turn starts the clock.');
 }catch{
  if(initial){describeSource();status('API unavailable. Practice is ready — no wallet needed.');}
  else status('The API could not provide fresh data. Your current puzzle is unchanged.');
 }finally{fetching=false;render();}
}
$('new-board').addEventListener('click',()=>loadLatest());
setInterval(()=>{const now=performance.now();if(started&&!paused&&!game.won&&!fetching){game.seconds+=(now-lastTick)/1000;$('timer').textContent=formatTime(game.seconds);}lastTick=now;},200);
render();describeSource();loadLatest(true);
