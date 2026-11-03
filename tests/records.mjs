import test from 'node:test';
import assert from 'node:assert/strict';
import {createTimes} from '../web/records.js';

function storage(){const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};}
test('finished times survive a new instance and stay separate by map and bike',()=>{
  const disk=storage(),a=createTimes(()=>disk);
  a.record('hills-v1','regular',12,2);a.record('flat-v1','regular',7,2);a.record('hills-v1','acro',11,2);
  const b=createTimes(()=>disk);
  assert.deepEqual(b.list('hills-v1','regular'),[12]);
  assert.deepEqual(b.list('flat-v1','regular'),[7]);
  assert.deepEqual(b.list('hills-v1','acro'),[11]);
});
test('only fastest five distinct tick times count; slower finishes do not replace best',()=>{
  const disk=storage(),b=createTimes(()=>disk);
  for(const t of [9,8,7,6,5,4,4])b.record('map','regular',t,2);
  assert.deepEqual(b.list('map','regular'),[4,5,6,7,8]);
  assert.equal(b.record('map','regular',10,2).newBest,false);
  assert.equal(b.record('map','regular',3,2).newBest,true);
});
test('crashes, unfinished runs, replays and invalid times never save',()=>{
  const disk=storage(),a=createTimes(()=>disk);
  for(const status of [0,1,3])assert.equal(a.record('map','regular',1,status),null);
  assert.equal(a.record('map','regular',1,2,true),null);
  for(const seconds of [NaN,Infinity,-1,0,601])assert.equal(a.record('map','regular',seconds,2),null);
  assert.deepEqual(a.list('map','regular'),[]);
});
test('damaged data cannot break play; unavailable storage retains session times',()=>{
  const disk=storage();disk.setItem('bike-lab-fast-times-v1','broken JSON');
  const a=createTimes(()=>disk);assert.deepEqual(a.list('map','regular'),[]);
  assert.equal(a.record('map','regular',6,2).persistent,true);
  assert.deepEqual(a.list('map','regular'),[6]);
  const b=createTimes(()=>{throw Error('blocked');});
  assert.equal(b.record('map','regular',5,2).persistent,false);
  assert.deepEqual(b.list('map','regular'),[5]);
  const full={getItem:()=>null,setItem:()=>{throw Error('quota');}};
  const c=createTimes(()=>full);
  assert.equal(c.record('map','regular',7,2).persistent,false);
  assert.deepEqual(c.list('map','regular'),[7]);
});
test('consecutive writers preserve other maps and corrupted times are filtered',()=>{
  const disk=storage(),a=createTimes(()=>disk),b=createTimes(()=>disk);
  a.record('one','regular',4,2);b.record('two','regular',5,2);a.record('one','regular',3,2);
  assert.deepEqual(b.list('one','regular'),[3,4]);assert.deepEqual(b.list('two','regular'),[5]);
  disk.setItem('bike-lab-fast-times-v1',JSON.stringify({'["drive0855-lean090-110-v1","one","regular"]':[0,-2,null,300,300,120,1.4,'90']}));
  assert.deepEqual(a.list('one','regular'),[2,5]);
});

function run(seconds,track=4,acro=0,lean=.123456789){
  const final=Array(22).fill(0);final[14]=2;final[15]=seconds;final[19]=track;
  return {track,acro,physicsHz:60,frames:Array.from({length:seconds*60},()=>[lean,1,0]),final};
}
test('recordings survive reload and decode every original input without quantization',()=>{
 const disk=storage(),a=createTimes(()=>disk),original=run(2);
 original.frames.unshift([0,0,0],[0,0,0]);
 a.record('hills-v2','regular',2,2,false,original);
 const b=createTimes(()=>disk),saved=b.replay('hills-v2','regular',0);
 assert.deepEqual(saved,original);assert.equal(b.entries('hills-v2','regular')[0].hasReplay,true);
 assert.equal(b.replay('hills-v2','acro',0),null);assert.equal(b.replay('flat-v1','regular',0),null);
 assert.ok(disk.getItem('bike-lab-fast-times-v1').length<1000,'constant input compressed');
});
test('five fastest recordings stay attached after sorting; tie and replay cannot replace them',()=>{
 const disk=storage(),a=createTimes(()=>disk);
 for(const t of [9,8,7,6,5,4])a.record('hills-v2','regular',t,2,false,run(t));
 assert.deepEqual(a.list('hills-v2','regular'),[4,5,6,7,8]);
 for(let i=0;i<5;i++)assert.equal(a.replay('hills-v2','regular',i).final[15],i+4);
 a.record('hills-v2','regular',4,2,false,run(4,4,0,-.2));
 assert.equal(a.replay('hills-v2','regular',0).frames[0][0],.123456789);
 a.record('hills-v2','regular',1,2,true,run(1));assert.equal(a.list('hills-v2','regular')[0],4);
});
test('truncated or damaged recordings cannot be replayed, while time remains visible',()=>{
 const disk=storage(),a=createTimes(()=>disk),bad=run(2);bad.frames.pop();
 a.record('hills-v2','regular',2,2,false,bad);assert.equal(a.replay('hills-v2','regular',0),null);
 assert.deepEqual(a.list('hills-v2','regular'),[2]);
 const good=run(1);a.record('hills-v2','regular',1,2,false,good);
 const data=JSON.parse(disk.getItem('bike-lab-fast-times-v1'));
 const id=Object.keys(data)[0];data[id][0].run.blocks[0][0]=999999;
 disk.setItem('bike-lab-fast-times-v1',JSON.stringify(data));
 assert.equal(createTimes(()=>disk).replay('hills-v2','regular',0),null);
});
test('storage failure retains replay during visit and does not throw',()=>{
 const a=createTimes(()=>({getItem:()=>null,setItem:()=>{throw Error('quota');}}));
 assert.equal(a.record('hills-v2','regular',1,2,false,run(1)).persistent,false);
 assert.deepEqual(a.replay('hills-v2','regular',0),run(1));
});

test('Acro retuning preserves Regular recordings and leaves old Acro records separate',()=>{
 const disk=storage(),a=createTimes(()=>disk),original=run(2);
 a.record('hills-v2','regular',2,2,false,original);
 const oldId=JSON.stringify(['drive0855-lean090-110-v1','hills-v2','acro']);
 const data=JSON.parse(disk.getItem('bike-lab-fast-times-v1'));
 const oldAcro={...Object.values(data)[0][0].run,acro:1};
 data[oldId]=[{ticks:120,run:oldAcro}];
 disk.setItem('bike-lab-fast-times-v1',JSON.stringify(data));
 const b=createTimes(()=>disk);
 assert.deepEqual(b.replay('hills-v2','regular',0),original);
 assert.deepEqual(b.list('hills-v2','acro'),[]);
 assert.equal(b.replay('hills-v2','acro',0),null);
 b.record('hills-v2','acro',3,2,false,run(3,4,1));
 const c=createTimes(()=>disk);
 assert.deepEqual(c.replay('hills-v2','acro',0),run(3,4,1));
 assert.deepEqual(c.replay('hills-v2','regular',0),original);
 assert.deepEqual(JSON.parse(disk.getItem('bike-lab-fast-times-v1'))[oldId],data[oldId]);
});
