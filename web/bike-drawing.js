// The upper mass carries the body; the wheel masses move independently.
// All offsets are in game units. This geometry never feeds back into physics.
export function bikeGeometry(pose){
  const rear={x:pose[0],y:pose[1]},front={x:pose[2],y:pose[3]},upper={x:pose[4],y:pose[5]};
  const dx=front.x-rear.x,dy=front.y-rear.y,length=Math.hypot(dx,dy);
  const u=length?{x:dx/length,y:dy/length}:{x:1,y:0},up={x:-u.y,y:u.x};
  const body=(x,y)=>({x:upper.x+u.x*x+up.x*y,y:upper.y+u.y*x+up.y*y});
  return {rear,front,upper,u,
    rearMount:body(-.2,-.32),frontMount:body(.17,-.32),crank:body(-.015,-.32),
    seat:body(-.06,-.23),bar:body(.135,-.16),
    hip:body(-.095,-.16),shoulder:body(-.025,-.01),knee:body(.055,-.27),
    helmet:body(.015,.055),visorStart:body(.035,.055),visorEnd:body(.067,.055)};
}

export function drawBike(ctx,pose,sx,sy,scale,showPoints){
  const world=bikeGeometry(pose),p={};
  for(const key of Object.keys(world))p[key]={x:sx(world[key].x),y:sy(world[key].y)};
  function line(points,color,weight){ctx.strokeStyle=color;ctx.lineWidth=weight;ctx.beginPath();points.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.stroke();}
  // Wheels are drawn first so the body can travel over them on impact.
  for(const [q,a] of [[p.rear,pose[6]],[p.front,pose[7]]]){
    const radius=scale*.1;
    ctx.fillStyle='#0b1620';ctx.beginPath();ctx.arc(q.x,q.y,radius,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#d3dedc';ctx.lineWidth=2;ctx.stroke();
    for(let j=0;j<5;j++){const t=-a*Math.PI/180+j*Math.PI*2/5;line([q,{x:q.x+Math.cos(t)*radius*.8,y:q.y+Math.sin(t)*radius*.8}],'#77929d',1);}
    ctx.fillStyle='#d9f78d';ctx.beginPath();ctx.arc(q.x,q.y,2.4,0,Math.PI*2);ctx.fill();
  }
  // The swingarm and fork join the moving hubs to the upper-mass body.
  line([p.rear,p.seat],'#718d9b',Math.max(2,scale*.012));
  line([p.front,p.bar],'#b4c6ce',Math.max(2,scale*.012));
  line([p.rearMount,p.seat,p.frontMount],'#d9f78d',Math.max(3,scale*.018));
  line([p.rearMount,p.crank,p.seat],'#718d9b',2);
  line([p.hip,p.knee,p.crank],'#efeee4',Math.max(3,scale*.02));
  line([p.hip,p.shoulder,p.helmet],'#efeee4',Math.max(4,scale*.028));
  line([p.shoulder,p.bar],'#efeee4',Math.max(3,scale*.018));
  ctx.fillStyle='#f1b383';ctx.beginPath();ctx.arc(p.helmet.x,p.helmet.y,scale*.047,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#f7e9d1';ctx.lineWidth=scale*.014;ctx.stroke();
  line([p.visorStart,p.visorEnd],'#192736',scale*.02);
  if(showPoints){
    // The actual crash point stays below the visible helmet.
    line([p.rear,p.upper,p.front,p.rear],'#ffb98a99',1);
    for(const q of [p.rear,p.front,p.upper]){ctx.fillStyle='#ff866b';ctx.beginPath();ctx.arc(q.x,q.y,3,0,Math.PI*2);ctx.fill();}
  }
}
