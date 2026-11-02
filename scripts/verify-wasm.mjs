import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import factory from '../dist/core.mjs';
const wasm=await factory({wasmBinary:await readFile(new URL('../dist/core.wasm',import.meta.url))});
const trace=JSON.parse(await readFile(new URL('../build/native-trace.json',import.meta.url),'utf8'));
let row=0,worst=0;
for(let t=0;t<4;t++)for(let a=0;a<2;a++){
  wasm._lab_reset(t,a);
  for(let n=0;n<120;n++){
    const lean=n>=40&&n<65?0.09:n>=80&&n<95?-0.07:0;
    wasm._lab_step(lean,+(n<75),+(n>=100));
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
}
assert.equal(row,trace.length);
console.log(`PASS: ${row} native C / WebAssembly snapshots; worst absolute difference ${worst}.`);
// Complete input replay must produce exactly the same browser state twice.
const replay=()=>{wasm._lab_reset(1,1);for(let n=0;n<600;n++)wasm._lab_step(Math.sin(n*.02)*.07,1,0);return Array.from({length:22},(_,i)=>wasm._lab_get(i));};
assert.deepEqual(replay(),replay());console.log('PASS: exact browser replay.');
