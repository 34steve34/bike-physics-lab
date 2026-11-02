import test from 'node:test';
import assert from 'node:assert/strict';
import {Presentation} from '../web/presentation.js';

function stateAt(t) {
  const s = new Float64Array(22);
  s[0] = t * 8 - .2; s[2] = t * 8 + .17; s[4] = t * 8;
  s[1] = s[3] = .1; s[5] = .42; s[8] = t * 8; s[9] = .207;
  s[6] = s[7] = (t * -2000) % 360;
  return s;
}

for (const hz of [60, 90, 120, 144]) test(`smooth relative bike/camera motion at ${hz} Hz`, () => {
  const p = new Presentation();
  p.reset(stateAt(0));
  const dt = 1 / 60;
  let acc = 0, ticks = 0, before = null, worst = 0;
  const input = stateAt(0);
  const untouched = Array.from(input);
  for (let f = 1; f <= hz * 8; f++) {
    acc += 1 / hz;
    while (acc + 1e-12 >= dt) {
      ticks++; input.set(stateAt(ticks * dt)); p.push(input); acc -= dt;
    }
    const pose = p.sample(Math.max(0, acc) / dt);
    // Every mass should travel continuously even on frames with no C tick.
    const expectedTime = Math.max(0, f / hz - dt);
    assert(Math.abs(pose[0] - (expectedTime * 8 - .2)) < 1e-9);
    const screenX = (pose[0] - p.camera.x) * (844 / 5);
    if (f > hz * 4 && before !== null) worst = Math.max(worst, Math.abs(screenX - before));
    before = screenX;
  }
  // At constant speed, a settled camera must not make the bike shake sideways.
  assert(worst < .001, `screen jump ${worst} px`);
  assert.deepEqual(Array.from(stateAt(0)), untouched);
});

test('angle seam, restart and presentation never change the simulation state', () => {
  const p = new Presentation(), a = stateAt(0), b = stateAt(1);
  a[6] = 359; b[6] = 1; a[7] = -359; b[7] = -1;
  const originalA = Array.from(a), originalB = Array.from(b);
  p.reset(a); p.push(b);
  const middle = p.sample(.5);
  assert.equal(middle[6], 360); assert.equal(middle[7], -360);
  assert.equal(middle[0], (a[0] + b[0]) / 2);
  assert.deepEqual(Array.from(a), originalA); assert.deepEqual(Array.from(b), originalB);
  p.reset(a);
  assert.equal(p.sample(0)[0], a[0]); assert.equal(p.sample(1)[0], a[0]);
  assert.equal(p.camera.x, a[8] + .6);
});
