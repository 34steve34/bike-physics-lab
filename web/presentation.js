// Draw the bike and its camera at the same point between fixed physics ticks.
// This changes presentation only; it never feeds positions back to the C core.
const BLEND = 1 - Math.exp(-8 / 60);
const POSITION_FIELDS = [0, 1, 2, 3, 4, 5, 8, 9];

export class Presentation {
  constructor() {
    this.previous = new Float64Array(22);
    this.current = new Float64Array(22);
    this.draw = new Float64Array(22);
    this.previousCamera = {x: 0, y: 0};
    this.currentCamera = {x: 0, y: 0};
    this.camera = {x: 0, y: 0};
  }
  reset(state) {
    this.previous.set(state);
    this.current.set(state);
    this.currentCamera.x = state[8] + 0.6;
    this.currentCamera.y = state[9] + 0.35;
    Object.assign(this.previousCamera, this.currentCamera);
    this.sample(1);
  }
  push(state) {
    this.previous.set(this.current);
    this.current.set(state);
    Object.assign(this.previousCamera, this.currentCamera);
    this.currentCamera.x += (state[8] + 0.6 - this.currentCamera.x) * BLEND;
    this.currentCamera.y += (state[9] + 0.27 - this.currentCamera.y) * BLEND;
  }
  sample(alpha) {
    alpha = Math.max(0, Math.min(1, alpha));
    this.draw.set(this.current);
    for (const i of POSITION_FIELDS)
      this.draw[i] = this.previous[i] + (this.current[i] - this.previous[i]) * alpha;
    // Wheel angles wrap at 360 degrees; cross the seam by the shortest arc.
    for (const i of [6, 7]) {
      const delta = ((this.current[i] - this.previous[i] + 540) % 360 + 360) % 360 - 180;
      this.draw[i] = this.previous[i] + delta * alpha;
    }
    for (const axis of ['x', 'y'])
      this.camera[axis] = this.previousCamera[axis] + (this.currentCamera[axis] - this.previousCamera[axis]) * alpha;
    return this.draw;
  }
}
