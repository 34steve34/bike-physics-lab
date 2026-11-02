import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import factory from '../dist/core.mjs';
const wasm=await factory({wasmBinary:await readFile(new URL('../dist/core.wasm',import.meta.url))});
const trace=JSON.parse(await readFile(new URL('../build/native-trace.json',import.meta.url),'utf8'));
let row=0,worst=0;
for(let t=0;t<4;t++)for(let a=0;a<2;a++){
  wasm._lab_reset(t,a);
  let turn=0,previous=0,ceiling=false,leftWall=false,underpass=false;
  for(let n=0;n<(t===2?360:120);n++){
    const lean=t===2?0:n>=40&&n<65?0.09:n>=80&&n<95?-0.07:0;
    wasm._lab_step(lean,+(t===2||n<75),+(t!==2&&n>=100));
    if(t===2){
      const get=i=>wasm._lab_get(i),angle=get(11);
      let delta=angle-previous;while(delta>180)delta-=360;while(delta< -180)delta+=360;
      turn+=delta;previous=angle;
      underpass ||= !get(22)&&get(8)>5.3&&get(8)<6.3;
      ceiling ||= get(1)>2.7&&get(3)>2.7&&get(5)<get(1)&&get(5)<get(3)&&!!get(12)&&!!get(13);
      leftWall ||= !!get(22)&&get(8)<5.6&&!!get(12)&&!!get(13);
    }
    for(let i=0;i<22;i++)assert(Number.isFinite(wasm._lab_get(i)),'finite browser state');
    if(n%15===14){
      const ref=trace[row++];assert.deepEqual(ref.slice(0,3),[t,a,n]);
      for(let i=0;i<22;i++){
        const diff=Math.abs(wasm._lab_get(i)-ref[i+3]);worst=Math.max(worst,diff);
        // Decorative wheel angles can amplify tiny libm differences at contact.
        const tolerance=(i===6||i===7)?0.1:0.003;
        assert(diff<tolerance,`C/Wasm mismatch track=${t} bike=${a} frame=${n} field=${i}: ${diff}`);
      }
    }
  }
  if(t===2){
    assert.equal(wasm._lab_get(14),2,'browser finishes the loop');
    assert(underpass&&ceiling&&leftWall&&turn>340&&turn<380,'browser rides the inside for a complete turn');
    assert(wasm._lab_get(1)<-.6&&wasm._lab_get(3)<-.6,'browser reaches the lower exit');
    console.log(`PASS: browser ${a?'Acro':'Regular'} inside loop, ceiling contact and exit.`);
  }
}
assert.equal(row,trace.length);
console.log(`PASS: ${row} native C / WebAssembly snapshots; worst absolute difference ${worst}.`);
// Complete input replay must produce exactly the same browser state twice.
const replay=()=>{wasm._lab_reset(1,1);for(let n=0;n<600;n++)wasm._lab_step(Math.sin(n*.02)*.07,1,0);return Array.from({length:22},(_,i)=>wasm._lab_get(i));};
assert.deepEqual(replay(),replay());console.log('PASS: exact browser replay.');
