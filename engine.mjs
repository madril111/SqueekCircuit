export const API_URL = 'https://api.squeekchain.com/v1/core';
export const SIZE = 5;
export const SOURCE = 10;
export const TARGETS = [4, 14, 24];
export const DIRS = [{bit:1, opposite:4, dr:-1, dc:0, name:'north'}, {bit:2, opposite:8, dr:0, dc:1, name:'east'}, {bit:4, opposite:1, dr:1, dc:0, name:'south'}, {bit:8, opposite:2, dr:0, dc:-1, name:'west'}];
const uint = v => typeof v === 'string' && /^\d{1,78}$/.test(v);
export function parseCore(raw) {
  const c = raw?.core;
  if (raw?.schemaVersion !== 1 || raw.status !== 'available' || raw.chain?.target !== 'sepolia' || String(raw.chain.chainId) !== '11155111') throw Error('Unsupported or unavailable source');
  if (!/^0x[\da-fA-F]{40}$/.test(raw.identities?.core) || ![c?.settledThroughRound,c?.cumulativeBlockUnits,c?.workPerThousandBlocks,c?.blockHeight,raw.chain.safeThroughBlock].every(uint)) throw Error('Invalid source fields');
  const timestamp = Number(raw.source?.blockTimestamp);
  return { core:raw.identities.core.toLowerCase(), round:c.settledThroughRound, units:c.cumulativeBlockUnits, difficulty:c.workPerThousandBlocks,
    height:c.blockHeight, block:raw.chain.safeThroughBlock, paused:c.paused===true,
    settledAt:Number.isFinite(timestamp) && timestamp>0 ? timestamp*1000 : null, fetchedAt:Date.now(),
    transaction:/^0x[\da-fA-F]{64}$/.test(raw.source?.transactionHash) ? raw.source.transactionHash : null };
}
export const sourceKey = s => s ? `circuit1:${s.core}:${s.round}:${s.units}:${s.difficulty}` : 'circuit1:practice';
export function hash(text) { let h=2166136261; for (const c of text) { h^=c.charCodeAt(0); h=Math.imul(h,16777619); } return h>>>0; }
function rng(seed) { let n=hash(seed); return () => { n+=0x6d2b79f5; let t=Math.imul(n^(n>>>15),1|n); t^=t+Math.imul(t^(t>>>7),61|t); return ((t^(t>>>14))>>>0)/4294967296; }; }
export function neighbor(index, dir) { const r=Math.floor(index/SIZE)+dir.dr, c=index%SIZE+dir.dc; return r>=0&&r<SIZE&&c>=0&&c<SIZE?r*SIZE+c:-1; }
export function rotate(mask, turns=1) { const t=((turns%4)+4)%4; return ((mask<<t)|(mask>>(4-t)))&15; }
export function flow(masks) {
  const powered=new Set();
  if (masks[SOURCE]&8) {
    const queue=[SOURCE]; powered.add(SOURCE);
    for (let k=0;k<queue.length;k++) { const i=queue[k]; for (const d of DIRS) { const j=neighbor(i,d); if(j>=0&&(masks[i]&d.bit)&&(masks[j]&d.opposite)&&!powered.has(j)) {powered.add(j);queue.push(j);} } }
  }
  const targets=TARGETS.map(i=>powered.has(i)&&Boolean(masks[i]&2));
  return {powered, targets, won:targets.every(Boolean)};
}
export function makePuzzle(key) {
  const random=rng(key), solved=Array(25).fill(0), seen=new Set([SOURCE]), stack=[SOURCE];
  // A randomized spanning tree guarantees a connected solution without wraparound edges.
  while(stack.length) {
    const i=stack[stack.length-1], choices=DIRS.map(d=>({d,j:neighbor(i,d)})).filter(x=>x.j>=0&&!seen.has(x.j));
    if(!choices.length) {stack.pop();continue;}
    const {d,j}=choices[Math.floor(random()*choices.length)]; solved[i]|=d.bit;solved[j]|=d.opposite;seen.add(j);stack.push(j);
  }
  solved[SOURCE]|=8;TARGETS.forEach(i=>solved[i]|=2);
  const masks=solved.map(m=>rotate(m,Math.floor(random()*4)));
  // Prevent the rare already-completed scramble.
  if(flow(masks).won) { let turns=1; while(turns<4&&(rotate(masks[TARGETS[0]],turns)&2))turns++; masks[TARGETS[0]]=rotate(masks[TARGETS[0]],turns); }
  return {key, solved, masks, moves:0, hints:0, seconds:0, won:false};
}
export function turnTile(game, index, turns=1) {
  if(game.won || !Number.isInteger(index) || index<0 || index>=25) return false;
  const next=rotate(game.masks[index],turns);
  if(next===game.masks[index]) return false;
  game.masks[index]=next;game.moves++;game.won=flow(game.masks).won;return true;
}
export function hintTile(game) {
  if(game.won) return -1;
  const i=game.masks.findIndex((m,i)=>m!==game.solved[i]);
  if(i<0)return -1;
  game.masks[i]=game.solved[i];game.moves++;game.hints++;game.won=flow(game.masks).won;return i;
}
export function score(game) { return Math.max(100, 3000-game.moves*15-Math.floor(game.seconds)*2-game.hints*150); }
