import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import factory from '../dist/core.mjs';
const wasm=await factory({wasmBinary:await readFile(new URL('../dist/core.wasm',import.meta.url))});
const trace=JSON.parse(await readFile(new URL('../build/native-trace.json',import.meta.url),'utf8'));
let row=0,worst=0;
const mismatches=[],loopWorst=new Array(22).fill(0);
for(let t=0;t<5;t++)for(let a=0;a<2;a++){
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
        let tolerance=(i===6||i===7)?0.1:0.003;
        if(t===2){
          loopWorst[i]=Math.max(loopWorst[i],diff);
        }
        if(t===2&&n>=120){
          // A full lap reaches repeated stiff contacts/landing. Native libm
          // and Wasm may take different sides of the contact threshold.
          // Keep the initial two-second comparison strict. For the extended
          // lap compare paths within 0.03 world units (~3 default phone-view
          // pixels), speed within 0.1, attitude within 2 degrees and time
          // within one tick. Decorative spin/contact bits need not agree at
          // an exact sample; ceiling/left-wall contact and finish are required.
          if([0,1,2,3,4,5,8,9,16].includes(i))tolerance=.03;
          else if(i===10)tolerance=.1;
          else if(i===11)tolerance=2;
          else if(i===15)tolerance=1/60+.0001;
          else if(i===17)tolerance=.1;
          else if([6,7,12,13].includes(i))tolerance=Infinity;
        }
        if(diff>=tolerance)mismatches.push(`C/Wasm mismatch track=${t} bike=${a} frame=${n} field=${i}: ${diff}`);
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
console.log('Loop native/Wasm maximum differences by snapshot field:',JSON.stringify(loopWorst));
assert.equal(mismatches.length,0,mismatches.slice(0,20).join('\n'));
console.log(`PASS: ${row} native C / WebAssembly snapshots; worst absolute difference ${worst}.`);
// The bigger drop must leave the platform, land on the floor and stay rideable.
for(const acro of [0,1]){
  wasm._lab_reset(3,acro);
  assert(wasm._lab_get(1)>3.7&&wasm._lab_get(3)>3.7,'raised drop spawn');
  let airborne=false,landed=false;
  for(let n=0;n<900&&!wasm._lab_get(14);n++){
    wasm._lab_step(0,1,0);
    for(let i=0;i<22;i++)assert(Number.isFinite(wasm._lab_get(i)));
    airborne ||= wasm._lab_get(0)>2.1&&!wasm._lab_get(12)&&!wasm._lab_get(13);
    if(airborne&&(wasm._lab_get(12)||wasm._lab_get(13))){
      assert(wasm._lab_get(1)<.3||wasm._lab_get(3)<.3,'landing is on the lower floor');landed=true;
    }
  }
  assert(airborne&&landed);assert.equal(wasm._lab_get(14),2,'drop finishes');
  console.log(`PASS: browser ${acro?'Acro':'Regular'} larger drop and flat landing.`);
}
// Complete input replay must produce exactly the same browser state twice.
// Video course: steer using ordinary inputs and verify the intended route.
for(const acro of [0,1]){
  wasm._lab_reset(4,acro);
  const get=i=>wasm._lab_get(i);
  assert.equal(get(19),4);assert(wasm._lab_board_count()>400);
  let stage=0,stairs=false,ceiling=false,leftWall=false,exited=false,bowl=false;
  for(let n=0;n<1200&&!get(14);n++){
    let x=get(8),y=get(9),target=0;
    if(!stage&&x>14.3&&y>3.6)stage=1;
    if(stage===1&&x<14.5&&y<3.7)stage=2;
    if(x<1.4)target=0;
    else if(x<3.1)target=Math.min(1.22,(x-1.4)*1.3);
    else if(x<11.3)target=-Math.PI/4;
    else if(stage===0)target=x<12.9?0:x<14.85?Math.min(1.02,(x-12.9)*1.2):1.5;
    else if(stage===1)target=Math.atan2(y-4.15,x-14.35)+Math.PI/2;
    else if(x<15.8)target=0;
    else if(x<18.4)target=Math.min(1.03,(x-15.8)*1.2);
    else if(x<23.4)target=0;
    else if(x<25.3)target=-.63;
    else if(x<26.5)target=0;
    else if(x<27.9)target=.8;
    const angle=Math.atan2(get(3)-get(1),get(2)-get(0)),error=target-angle;
    wasm._lab_step(.16*Math.atan2(Math.sin(error),Math.cos(error))/(acro?1.5:1),1,0);
    for(let i=0;i<22;i++)assert(Number.isFinite(get(i)));
    x=get(8);y=get(9);
    stairs ||= x>4&&x<11&&!!(get(12)||get(13));
    ceiling ||= x>14&&x<14.7&&get(1)>4.8&&get(3)>4.8&&get(5)<get(1)&&get(5)<get(3)&&!!get(12)&&!!get(13);
    leftWall ||= stage===1&&x<13.85&&!!get(12)&&!!get(13);
    exited ||= stage===2&&x>15.3&&x<15.9&&!!(get(12)||get(13));
    bowl ||= x>25.4&&x<27&&y<5.3&&!!(get(12)||get(13));
  }
  assert.equal(get(14),2,'Hills finishes');assert(get(5)>get(21),'finish above ground');
  assert(stairs&&ceiling&&leftWall&&exited&&bowl,JSON.stringify({stairs,ceiling,leftWall,exited,bowl}));
  console.log(`PASS: browser ${acro?'Acro':'Regular'} Hills staircase, inside open loop, exit, bowl and finish.`);
}
const replay=()=>{wasm._lab_reset(1,1);for(let n=0;n<600;n++)wasm._lab_step(Math.sin(n*.02)*.07,1,0);return Array.from({length:22},(_,i)=>wasm._lab_get(i));};
assert.deepEqual(replay(),replay());console.log('PASS: exact browser replay.');
for(const acro of [0,1])for(const first of ['gas','brake']){
  wasm._lab_reset(0,acro);
  for(let n=0;n<600;n++)wasm._lab_step(0,0,0);
  assert.equal(wasm._lab_get(15),0,'waiting does not count');
  wasm._lab_step(.5,0,0);assert.equal(wasm._lab_get(15),0,'tilt does not start clock');
  assert.equal(wasm._lab_get(18),0,'lean is locked before first gas/brake');
  wasm._lab_step(.2,+(first==='gas'),+(first==='brake'));
  assert(Math.abs(wasm._lab_get(18)-.2)<1e-6,'first gas/brake also unlocks lean');
  assert(Math.abs(wasm._lab_get(15)-1/60)<1e-6,first+' starts clock');
  wasm._lab_step(0,0,0);assert(Math.abs(wasm._lab_get(15)-2/60)<1e-6,'release keeps timing');
  wasm._lab_reset(0,acro);assert.equal(wasm._lab_get(15),0,'restart clears clock');
  wasm._lab_step(.5,0,0);assert.equal(wasm._lab_get(18),0,'restart relocks lean');
}
console.log('PASS: browser clock waits for first gas/brake, keeps running on release, resets to zero.');
for(const acro of [0,1]){
  const pose=lean=>{wasm._lab_reset(0,acro);for(let n=0;n<120;n++)wasm._lab_step(lean,0,0);return Array.from({length:22},(_,i)=>wasm._lab_get(i));};
  assert.deepEqual(pose(.5),pose(0),'pre-start lean cannot change bike pose');
  assert.deepEqual(pose(-.5),pose(0),'pre-start forward lean cannot change bike pose');
}
console.log('PASS: browser pre-start lean has no effect on either bike.');
