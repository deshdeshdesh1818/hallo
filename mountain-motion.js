(() => {
  const viewport=document.getElementById('viewport'),canvas=document.getElementById('mountainLayer');
  if(!viewport||!canvas)return;
  const ctx=canvas.getContext('2d');
  let approach=0,last=performance.now(),impactTriggered=false;
  const STUMBLE=0.98;
  function resize(){const r=viewport.getBoundingClientRect(),d=window.devicePixelRatio||1;canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d);ctx.setTransform(d,0,0,d,0,0)}
  function seed(n){const x=Math.sin(n*127.1+41.7)*43758.5453;return x-Math.floor(x)}
  function headingDifference(deg){return Math.abs(((deg+180)%360)-180)}
  function draw(now){const dt=Math.min(.05,(now-last)/1000);last=now;const w=canvas.clientWidth,h=canvas.clientHeight;ctx.clearRect(0,0,w,h);
    const speed=Number(document.getElementById('speedHud')?.textContent)||0;
    const altitude=Number((document.getElementById('altHud')?.textContent||'0').replace(/,/g,''))||0;
    const heading=Number(document.getElementById('flightHeading')?.textContent)||0;
    const airborne=altitude>0;
    const onCourse=headingDifference(heading)<48;
    if(airborne&&onCourse&&!impactTriggered){approach=Math.min(1,approach+speed*dt/4200)}
    const horizon=h*.47;
    // As the aircraft closes in, mountain ridges grow substantially and slide down toward the cockpit.
    for(let layer=0;layer<3;layer++){
      const depth=(layer+1)/3;
      const scale=(.62+depth*.34+approach*(1.0+depth*2.25))*(altitude>8000?.62:1);
      const base=horizon+h*(.035+approach*(.12+depth*.09));
      const shift=((heading-180)/180)*w*.16*(.35+depth);
      ctx.beginPath();ctx.moveTo(-w*.15+shift,base);
      for(let i=0;i<=16;i++){const x=-w*.15+shift+(w*1.3*i/16),peak=base-h*(.10+seed(i+layer*31)*.17)*scale;ctx.lineTo(x,peak)}
      ctx.lineTo(w*1.2+shift,base);ctx.closePath();ctx.fillStyle=['#718066','#5b6d50','#485b43'][layer];ctx.globalAlpha=.82-layer*.12;ctx.fill();
      ctx.globalAlpha=.23;ctx.strokeStyle='#e2dfbd';ctx.lineWidth=1;ctx.stroke();
    }
    ctx.globalAlpha=1;
    // Straight flight at low altitude leads into the mountain face; turning away or climbing over it avoids impact.
    if(approach>=STUMBLE&&altitude<8000&&!impactTriggered){impactTriggered=true;window.crashAircraft?.('mountain')}
    requestAnimationFrame(draw)
  }
  window.addEventListener('resize',resize);window.addEventListener('simulatorrestart',()=>{approach=0;impactTriggered=false});resize();requestAnimationFrame(draw)
})();
