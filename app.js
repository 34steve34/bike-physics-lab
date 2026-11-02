import createPhysics from './core.mjs';
import {Controls} from './input.js';
import {Presentation} from './presentation.js';

const $=s=>document.querySelector(s), canvas=$('#view'), ctx=canvas.getContext('2d');
const controls=new Controls(canvas), presentation=new Presentation(), VERSION='0.1.1';
const trackNames=['Flat / wheelies','Ramps / jumps','Loop','Air drop'];
let core, state=new Float32Array(22), boards=[], ready=false, running=false;
let track=0, acro=0, acc=0, last=0, width=0,height=0,dpr=1;
let viewWidth=5, showPoints=false, frames=[], saved=null,replaying=false,replayIndex=0;
let lastStatus=0,toastTimer, settingsBike=0;

function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2600);}
function snapshot(){for(let i=0;i<22;i++)state[i]=core._lab_get(i);}
function reset(){
  if(!ready)return;
  core._lab_reset(track,acro);snapshot();
  boards=Array.from({length:core._lab_board_count()},(_,i)=>Array.from({length:4},(_,j)=>core._lab_board_get(i,j)));
  presentation.reset(state);
  acc=0;last=0;frames=[];replaying=false;lastStatus=0;controls.clear();
  $('#result').classList.add('hidden');
}
function resize(){width=innerWidth;height=innerHeight;dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);}
window.addEventListener('resize',resize);resize();

async function startRide(){
  if(!ready)return;
  // Request motion/fullscreen during the user's gesture; either may be refused.
  const permission=controls.enable();
  if(matchMedia('(pointer:coarse)').matches&&!document.fullscreenElement){
    try{await document.documentElement.requestFullscreen();}catch{}
    try{await screen.orientation.lock('landscape-primary');}catch{}
  }
  await permission;
  $('#welcome').classList.add('hidden');running=true;last=0;
  if(controls.lastSensor)controls.calibrate();
  else if(matchMedia('(pointer:coarse)').matches)toast('Hold neutral, then tap Zero tilt. Left side down should lift the front.');
}
$('#ride').addEventListener('click',startRide);
$('#reset').addEventListener('click',()=>{reset();});
$('#retry').addEventListener('click',()=>{reset();running=true;});
$('#zero').addEventListener('click',()=>toast(controls.calibrate()?'Neutral tilt set.': 'No motion reading yet. Enable phone tilt in Settings.'));
$('#track').addEventListener('change',e=>{track=+e.target.value;reset();});
$('#settings').addEventListener('click',()=>{settingsBike=acro;controls.clear();$('#options').showModal();});
$('#save-settings').addEventListener('click',()=>$('#options').close());
$('#options').addEventListener('close',()=>{last=0;controls.clear();if(acro!==settingsBike)reset();});
$('#bike').addEventListener('change',e=>{acro=+e.target.value;});
$('#sensitivity').addEventListener('change',e=>controls.sensitivity=+e.target.value);
$('#invert').addEventListener('change',e=>controls.invert=e.target.checked);
$('#zoom').addEventListener('input',e=>viewWidth=+e.target.value);
$('#show-points').addEventListener('change',e=>showPoints=e.target.checked);
$('#enable-tilt').addEventListener('click',async()=>{const ok=await controls.enable();toast(ok?'Tilt enabled. Hold neutral and tap Zero tilt.':'Motion access unavailable or denied. Check browser permissions.');});
window.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='r'&&!$('#options').open)reset();});
document.addEventListener('visibilitychange',()=>{last=0;controls.clear();});
window.addEventListener('blur',()=>{
  if(running&&!state[14]&&!$('#options').open){running=false;$('#ride').textContent='Resume ride';$('#loading-note').textContent='Your ride is paused.';$('#welcome').classList.remove('hidden');}
});
$('#replay').addEventListener('click',()=>{
  if(!saved)return;
  const recording=saved;
  track=recording.track;acro=recording.acro;
  $('#track').value=track;$('#bike').value=acro;
  reset();saved=recording;replaying=true;replayIndex=0;running=true;toast('Replaying the recorded controls');
});
$('#download').addEventListener('click',()=>{
  if(!saved)return;
  const url=URL.createObjectURL(new Blob([JSON.stringify(saved)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=`bike-lab-${VERSION}-${Date.now()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});

function finish(status){
  if(!replaying)saved={version:VERSION,upstream:'a697be26244cddfb294f147055b7ea0eb5c04fc6',track,acro,physicsHz:60,frames:frames.slice(),final:Array.from(state),input:{sensitivity:controls.sensitivity,invert:controls.invert},userAgent:navigator.userAgent};
  $('#result-tag').textContent=replaying?'REPLAY COMPLETE':status===2?'TRACK COMPLETE':'TRY AGAIN';
  $('#result-title').textContent=status===2?'Nice ride.':status===3?'Physics stopped.':'One more ride?';
  $('#result-detail').textContent=status===3?'A non-finite state was detected. Save this run for debugging.':`${trackNames[track]} · ${acro?'Acro':'Regular'} · ${state[15].toFixed(2)} seconds`;
  $('#result').classList.remove('hidden');controls.clear();
}

function tick(){
  let input;
  if(replaying){
    const f=saved.frames[replayIndex++];
    if(!f){lastStatus=state[14]||1;finish(lastStatus);running=false;return;}
    input={lean:f[0],gas:!!f[1],brake:!!f[2]};
  }else{
    input=controls.read();
    if(frames.length<36000)frames.push([input.lean,+input.gas,+input.brake]);
    else{running=false;toast('Recording limit reached. Restart for another ride.');return;}
  }
  core._lab_step(input.lean,+input.gas,+input.brake);snapshot();presentation.push(state);
  if(state[14]&&!lastStatus){lastStatus=state[14];finish(lastStatus);}
}

function render(alpha){
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const sky=ctx.createLinearGradient(0,0,0,height);sky.addColorStop(0,'#142638');sky.addColorStop(1,'#263a46');ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
  if(!ready)return;
  const pose=presentation.sample(alpha), cam=presentation.camera;
  const scale=width/viewWidth, anchorY=height*0.61;
  const sx=x=>(x-cam.x)*scale+width*0.43;
  const sy=y=>anchorY-(y-cam.y)*scale;
  // Quiet parallax silhouettes leave the track and bike easy to judge.
  ctx.fillStyle='#1b2f3c';ctx.beginPath();ctx.moveTo(0,height);
  for(let i=-1;i<=12;i++){const x=i*width/10-(cam.x*12)%(width/10);ctx.lineTo(x,height*.56+Math.sin(i*2.1)*height*.08);}
  ctx.lineTo(width,height);ctx.fill();
  ctx.strokeStyle='#ffffff08';ctx.lineWidth=1;
  for(let x=Math.floor(cam.x-viewWidth);x<cam.x+viewWidth;x++){ctx.beginPath();ctx.moveTo(sx(x),50);ctx.lineTo(sx(x),height);ctx.stroke();}
  ctx.lineCap='round';
  // Each segment is drawn exactly at the geometry used by the C engine.
  for(const b of boards){
    if(Math.max(b[0],b[2])<cam.x-viewWidth||Math.min(b[0],b[2])>cam.x+viewWidth)continue;
    ctx.strokeStyle='#081520';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(sx(b[0]),sy(b[1])+3);ctx.lineTo(sx(b[2]),sy(b[3])+3);ctx.stroke();
    ctx.strokeStyle='#c6d5ca';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(sx(b[0]),sy(b[1]));ctx.lineTo(sx(b[2]),sy(b[3]));ctx.stroke();
  }
  const fx=sx(state[20]),fy=sy(track===0||track===1||track===2||track===3?0:state[21]);
  ctx.strokeStyle='#d9f78d';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(fx,fy);ctx.lineTo(fx,fy-scale*.8);ctx.stroke();
  ctx.fillStyle='#d9f78d';ctx.beginPath();ctx.moveTo(fx,fy-scale*.8);ctx.lineTo(fx+scale*.25,fy-scale*.7);ctx.lineTo(fx,fy-scale*.6);ctx.fill();
  // A new, simple rider drawing follows the actual three masses.
  const r={x:sx(pose[0]),y:sy(pose[1])},f={x:sx(pose[2]),y:sy(pose[3])},h={x:sx(pose[4]),y:sy(pose[5])};
  const axle={x:f.x-r.x,y:f.y-r.y},len=Math.hypot(axle.x,axle.y)||1;
  const u={x:axle.x/len,y:axle.y/len},up={x:u.y,y:-u.x};
  const center={x:(r.x+f.x)/2,y:(r.y+f.y)/2};
  const seat={x:center.x-u.x*scale*.045+up.x*scale*.09,y:center.y-u.y*scale*.045+up.y*scale*.09};
  const bar={x:f.x-u.x*scale*.035+up.x*scale*.16,y:f.y-u.y*scale*.035+up.y*scale*.16};
  function line(points,color,weight){ctx.strokeStyle=color;ctx.lineWidth=weight;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();}
  line([r,seat,f],'#d9f78d',Math.max(3,scale*.018));
  line([f,bar],'#b4c6ce',Math.max(2,scale*.012));
  line([r,{x:center.x+u.x*scale*.03,y:center.y+u.y*scale*.03},seat],'#718d9b',2);
  for(const [p,a] of [[r,pose[6]],[f,pose[7]]]){
    const radius=scale*.1;
    ctx.fillStyle='#0b1620';ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#d3dedc';ctx.lineWidth=2;ctx.stroke();
    for(let j=0;j<5;j++){const t=-a*Math.PI/180+j*Math.PI*2/5;line([p,{x:p.x+Math.cos(t)*radius*.8,y:p.y+Math.sin(t)*radius*.8}],'#77929d',1);}
    ctx.fillStyle='#d9f78d';ctx.beginPath();ctx.arc(p.x,p.y,2.4,0,Math.PI*2);ctx.fill();
  }
  const hip={x:seat.x-u.x*scale*.035+up.x*scale*.07,y:seat.y-u.y*scale*.035+up.y*scale*.07};
  const shoulder={x:h.x-u.x*scale*.04-up.x*scale*.065,y:h.y-u.y*scale*.04-up.y*scale*.065};
  const knee={x:center.x+u.x*scale*.07+up.x*scale*.05,y:center.y+u.y*scale*.07+up.y*scale*.05};
  line([hip,knee,center],'#efeee4',Math.max(3,scale*.02));line([hip,shoulder,h],'#efeee4',Math.max(4,scale*.028));line([shoulder,bar],'#efeee4',Math.max(3,scale*.018));
  ctx.fillStyle='#f1b383';ctx.beginPath();ctx.arc(h.x,h.y,scale*.047,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#f7e9d1';ctx.lineWidth=scale*.014;ctx.stroke();
  line([{x:h.x+u.x*scale*.02,y:h.y+u.y*scale*.02},{x:h.x+u.x*scale*.052,y:h.y+u.y*scale*.052}],'#192736',scale*.02);
  if(showPoints){line([r,h,f,r],'#ffb98a99',1);for(const p of [r,f,h]){ctx.fillStyle='#ff866b';ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fill();}}
  const input=replaying?{lean:state[18],gas:false,brake:false}:controls.read();
  $('#tilt-dot').style.left=`${60+input.lean*112}px`;
  $('#gas-hint').classList.toggle('active',input.gas);$('#brake-hint').classList.toggle('active',input.brake);
  $('#speed').textContent=state[10].toFixed(1);$('#timer').textContent=state[15].toFixed(2);
  const fresh=controls.enabled&&performance.now()-controls.lastSensor<1500;
  $('#sensor').textContent=replaying?'Replay':fresh?'Tilt on':controls.permission==='denied'?'Tilt denied':matchMedia('(pointer:fine)').matches?'Keyboard ready':'Tilt waiting';
  $('#sensor').classList.toggle('ready',fresh);
}
function frame(now){
  const dt=last?Math.min((now-last)/1000,0.05):0;last=now;
  if(ready&&running&&!$('#options').open&&!document.hidden&&!state[14]){
    acc+=dt;let n=0;while(acc>=1/60&&n++<4){tick();acc-=1/60;if(state[14])break;}
  }
  // On pause keep the last fractional pose rather than snapping backwards.
  // Terminal states show the final snapshot immediately beneath the result.
  render(state[14]?1:acc*60);requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

try{
  const response=await fetch(new URL('./core.wasm',import.meta.url));
  if(!response.ok)throw new Error(`Physics download failed (${response.status})`);
  core=await createPhysics({wasmBinary:await response.arrayBuffer()});
  ready=true;reset();$('#version').textContent=VERSION;$('#ride').disabled=false;$('#ride').textContent='Ride · enable tilt';
  $('#loading-note').textContent=`v${VERSION} · Start with Regular, then try Acro in Settings.`;
  if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js').catch(()=>{});}
}catch(error){$('#loading-note').textContent=`Could not load physics. Reload while online. ${error.message}`;$('#ride').textContent='Physics unavailable';console.error(error);}
