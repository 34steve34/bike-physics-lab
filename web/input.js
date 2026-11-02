// Raw gravity input only. No accumulated gyro, automatic zero drift or physics patches.
export class Controls {
  constructor(canvas) {
    this.pointers=new Map(); this.keys=new Set(); this.raw=0; this.zero=0;
    this.lastSensor=0; this.enabled=false; this.permission='waiting';
    this.sensitivity=0.5; this.invert=false;
    canvas.addEventListener('pointerdown',e=>{
      e.preventDefault(); canvas.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId,e.clientX>=innerWidth/2?'gas':'brake');
    });
    for(const type of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(type,e=>this.pointers.delete(e.pointerId));
    window.addEventListener('keydown',e=>{
      if(/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName)||document.querySelector('dialog[open]'))return;
      if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();
      this.keys.add(e.key.toLowerCase());
    });
    window.addEventListener('keyup',e=>this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur',()=>this.clear());
    document.addEventListener('visibilitychange',()=>this.clear());
    window.addEventListener('devicemotion',e=>{
      const a=e.accelerationIncludingGravity;
      if(!this.enabled||!a||!Number.isFinite(a.y))return;
      // Phone landscape with charging port on the right; -Y gives nose-up.
      this.raw=-a.y/9.80665;
      this.lastSensor=performance.now();this.permission='ready';
    });
  }
  clear(){this.pointers.clear();this.keys.clear();}
  async enable(){
    if(typeof DeviceMotionEvent==='undefined'){this.permission='unavailable';return false;}
    try{
      if(typeof DeviceMotionEvent.requestPermission==='function'){
        const p=await DeviceMotionEvent.requestPermission();
        if(p!=='granted'){this.permission='denied';return false;}
      }
      this.enabled=true;this.permission='waiting';return true;
    }catch{this.permission='denied';return false;}
  }
  calibrate(){if(performance.now()-this.lastSensor<2000){this.zero=this.raw;return true;}return false;}
  read(){
    let lean=0;
    if(this.enabled&&performance.now()-this.lastSensor<1000) lean=(this.raw-this.zero)/this.sensitivity*(this.invert?-1:1);
    const left=this.keys.has('arrowleft')||this.keys.has('a');
    const right=this.keys.has('arrowright')||this.keys.has('d');
    if(left||right)lean=(left?1:0)-(right?1:0);
    const touches=[...this.pointers.values()];
    return {lean:Math.max(-1,Math.min(1,lean))*0.5,
      gas:touches.includes('gas')||this.keys.has('arrowup')||this.keys.has('w')||this.keys.has(' '),
      brake:touches.includes('brake')||this.keys.has('arrowdown')||this.keys.has('s')};
  }
}
