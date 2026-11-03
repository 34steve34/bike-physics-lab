// Stable map/rules IDs keep future geometry or physics changes from mixing records.
const STORAGE_KEY='bike-lab-fast-times-v1', RULES='standard-drive0855-v1';
const validTicks=t=>Number.isInteger(t)&&t>0&&t<=36000;
const clean=value=>Array.isArray(value)?[...new Set(value.filter(validTicks))].sort((a,b)=>a-b).slice(0,5):[];

export function createTimes(getStorage){
  let memory={},persistent=true;
  function read(){
    if(!persistent)return memory;
    try{
      const value=JSON.parse(getStorage().getItem(STORAGE_KEY)||'{}');
      memory=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
      persistent=true;
    }catch{persistent=false;}
    return memory;
  }
  const key=(map,bike)=>JSON.stringify([RULES,map,bike]);
  function list(map,bike){return clean(read()[key(map,bike)]).map(t=>t/60);}
  function record(map,bike,seconds,status,replaying=false){
    if(status!==2||replaying||!Number.isFinite(seconds)||seconds<=0||seconds>600)return null;
    const ticks=Math.round(seconds*60);
    if(!validTicks(ticks))return null;
    const data=read(),id=key(map,bike),before=clean(data[id]);
    const newBest=!before.length||ticks<before[0];
    data[id]=clean([...before,ticks]);memory=data;
    try{getStorage().setItem(STORAGE_KEY,JSON.stringify(data));persistent=true;}
    catch{persistent=false;}
    return {newBest,persistent,times:data[id].map(t=>t/60)};
  }
  return {list,record,get persistent(){return persistent;}};
}
