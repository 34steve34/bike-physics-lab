import test from 'node:test';
import assert from 'node:assert/strict';
import {bikeGeometry} from '../web/bike-drawing.js';

const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-12,`${a} != ${b}`);
const pose=[0,.1,.37,.1,.2,.42,0,0];
const bodyKeys=['rearMount','frontMount','crank','seat','bar','hip','shoulder','knee','helmet','visorStart','visorEnd'];

test('impact motion moves the entire body with the upper mass and leaves hubs independent',()=>{
  const before=bikeGeometry(pose),compressed=pose.slice();
  compressed[4]+=.07;compressed[5]-=.16;
  const after=bikeGeometry(compressed);
  for(const key of bodyKeys){close(after[key].x-before[key].x,.07);close(after[key].y-before[key].y,-.16);}
  assert.deepEqual(after.rear,before.rear);assert.deepEqual(after.front,before.front);
  assert.ok(before.helmet.y>before.upper.y);
});

test('wheelbase compression cannot resize the body',()=>{
  const before=bikeGeometry(pose),compressed=pose.slice();compressed[2]=.25;
  const after=bikeGeometry(compressed);
  for(const key of bodyKeys)assert.deepEqual(after[key],before[key]);
  assert.notDeepEqual(after.front,before.front);
});

test('the complete body rotates with the axle, including an inverted bike',()=>{
  const before=bikeGeometry(pose);
  for(const angle of [Math.PI/2,Math.PI,-Math.PI/3]){
    const c=Math.cos(angle),s=Math.sin(angle),turned=pose.slice();
    for(let i=0;i<6;i+=2){turned[i]=pose[i]*c-pose[i+1]*s;turned[i+1]=pose[i]*s+pose[i+1]*c;}
    const after=bikeGeometry(turned);
    for(const key of bodyKeys){close(after[key].x,before[key].x*c-before[key].y*s);close(after[key].y,before[key].x*s+before[key].y*c);}
  }
});

test('geometry leaves the simulation snapshot unchanged',()=>{
  const frozen=Object.freeze(pose.slice());bikeGeometry(frozen);assert.deepEqual(frozen,pose);
});
