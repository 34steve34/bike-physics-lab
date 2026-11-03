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
  disk.setItem('bike-lab-fast-times-v1',JSON.stringify({'["standard-drive095-v1","one","regular"]':[0,-2,null,300,300,120,1.4,'90']}));
  assert.deepEqual(a.list('one','regular'),[2,5]);
});
