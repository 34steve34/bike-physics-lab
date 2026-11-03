// Records are local to this browser; rules/map IDs keep replays comparable.
const STORAGE_KEY='bike-lab-fast-times-v1', RULES='drive0855-lean090-110-v1';
// Regular physics are unchanged; keep its existing times and recordings.
const rulesFor=bike=>bike==='acro'?'drive0855-lean100-v1':RULES;
const validTicks=t=>Number.isInteger(t)&&t>0&&t<=36000;
function clean(value){
  if(!Array.isArray(value))return [];
  const unique=new Map();
  for(const raw of value){
    const e=typeof raw==='number'?{ticks:raw}:raw;
    if(!e||!validTicks(e.ticks))continue;
    if(!unique.has(e.ticks)||(!unique.get(e.ticks).run&&e.run))unique.set(e.ticks,{ticks:e.ticks,run:e.run});
  }
  return [...unique.values()].sort((a,b)=>a.ticks-b.ticks).slice(0,5);
}
function pack(run,map,bike,ticks){
  if(!run||!Array.isArray(run.frames)||run.frames.length>36000||!run.frames.length||
     !Number.isInteger(run.track)||run.track<0||run.track>4||run.acro!==(bike==='acro'?1:0)||
     run.physicsHz!==60||!Array.isArray(run.final)||run.final.length!==22||
     !run.final.every(Number.isFinite)||run.final[14]!==2||Math.round(run.final[15]*60)!==ticks)return null;
  const first=run.frames.findIndex(f=>Array.isArray(f)&&(f[1]===1||f[2]===1));
  if(first<0||run.frames.length-first!==ticks||run.final[19]!==run.track)return null;
  const blocks=[];
  for(const f of run.frames){
    if(!Array.isArray(f)||f.length!==3||!Number.isFinite(f[0])||Math.abs(f[0])>.5||![0,1].includes(f[1])||![0,1].includes(f[2]))return null;
    const last=blocks.at(-1);
    if(last&&last[1]===f[0]&&last[2]===f[1]&&last[3]===f[2])last[0]++;
    else blocks.push([1,...f]);
  }
  return {schema:1,rules:rulesFor(bike),map,track:run.track,acro:run.acro,physicsHz:60,blocks,final:run.final.slice()};
}
function unpack(run,map,bike,ticks){
  if(!run||run.schema!==1||run.rules!==rulesFor(bike)||run.map!==map||!Array.isArray(run.blocks)||run.blocks.length>36000)return null;
  const frames=[];
  for(const b of run.blocks){
    if(!Array.isArray(b)||b.length!==4||!validTicks(b[0])||frames.length+b[0]>36000)return null;
    for(let i=0;i<b[0];i++)frames.push(b.slice(1));
  }
  const decoded={track:run.track,acro:run.acro,physicsHz:60,frames,final:run.final};
  return pack(decoded,map,bike,ticks)?decoded:null;
}
export function createTimes(getStorage){
  let memory={},persistent=true;
  function read(){
    if(!persistent)return memory;
    try{
      const value=JSON.parse(getStorage().getItem(STORAGE_KEY)||'{}');
      memory=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
    }catch{persistent=false;}
    return memory;
  }
  const key=(map,bike)=>JSON.stringify([rulesFor(bike),map,bike]);
  const entries=(map,bike)=>clean(read()[key(map,bike)]).map(e=>({seconds:e.ticks/60,hasReplay:!!unpack(e.run,map,bike,e.ticks)}));
  const list=(map,bike)=>clean(read()[key(map,bike)]).map(e=>e.ticks/60);
  function replay(map,bike,rank){
    const e=clean(read()[key(map,bike)])[rank];
    return e?unpack(e.run,map,bike,e.ticks):null;
  }
  function record(map,bike,seconds,status,replaying=false,run=null){
    if(status!==2||replaying||!Number.isFinite(seconds)||seconds<=0||seconds>600)return null;
    const ticks=Math.round(seconds*60);if(!validTicks(ticks))return null;
    const data=read(),id=key(map,bike),before=clean(data[id]);
    const newBest=!before.length||ticks<before[0].ticks;
    const packed=pack(run,map,bike,ticks);
    data[id]=clean([...before,{ticks,run:packed}]);memory=data;
    try{getStorage().setItem(STORAGE_KEY,JSON.stringify(data));persistent=true;}catch{persistent=false;}
    return {newBest,persistent,times:data[id].map(e=>e.ticks/60)};
  }
  return {list,entries,replay,record,get persistent(){return persistent;}};
}
