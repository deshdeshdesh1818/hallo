(() => {
  const canvas=document.getElementById('mountainLayer');
  let approach=0,previousTime=performance.now(),collisionTriggered=false;
  if(!canvas)return;

  function seed(n){const x=Math.sin(n*127.1+41.7)*43758.5453;return x-Math.floor(x)}
  function read(id){const t=document.getElementById(id)?.textContent||'0';return Number(t.replace(/,/g,''))||0}
  function headingDifference(d){return Math.abs(((d+180)%360)-180)}

  window.drawMountainIntoWorld=(ctx,w,h,horizon)=>{
    const dt=Math.min(.05,(performance.now()-previousTime)/1000);previousTime=performance.now();
    const speed=read('speedHud'),altitude=read('altHud'),heading=read('flightHeading'),pitch=read('pitchOut');
    const aligned=headingDifference(heading)<48;
    if(speed>0&&aligned&&!collisionTriggered) approach=Math.min(1.15,approach+speed*.000514444*dt/1.6);
    else if(!aligned) approach=Math.max(0,approach-dt*.12);

    let nearestBase=0,nearestTop=h;
    for(let layer=0;layer<3;layer++){
      const depth=(layer+1)/3,growth=Math.pow(approach,1.35)*(1.3+depth*3.8),scale=.72+depth*.35+growth;
      const base=horizon+h*(.035+approach*(.14+depth*.20));
      const shift=((headingDifference(heading)/180)*w*.22)*(layer-1)*.48;
      ctx.beginPath();ctx.moveTo(-w*.16+shift,base);
      for(let i=0;i<=28;i++){
        const x=-w*.16+(w*1.32*i/28)+shift;
        const peakHeight=h*Math.max(.055,.12+seed(i*.43+layer*29)*.22+(seed(i*2.71+layer*13)-.5)*.065)*scale;
        const y=base-peakHeight;ctx.lineTo(x,y);
        if(layer===2){nearestBase=Math.max(nearestBase,base);nearestTop=Math.min(nearestTop,y)}
      }
      ctx.lineTo(w*1.16+shift,base);ctx.closePath();ctx.fillStyle=['#7a8064','#626e54','#46533e'][layer];ctx.globalAlpha=[.76,.87,.98][layer];ctx.fill();
    }

    ctx.globalAlpha=1;
    const fillsView=nearestBase>=h*.88&&nearestTop<=h*.12;
    if(fillsView&&altitude<1800&&aligned&&!collisionTriggered){collisionTriggered=true;window.crashAircraft?.('mountain')}

    // Top-down forest canopy is visible when the nose is raised.
    const viewBlend=Math.max(0,Math.min(1,(pitch-1)/7));
    if(viewBlend>.01&&altitude>=80){
      const start=horizon+h*(.30-viewBlend*.21);ctx.save();ctx.fillStyle='#526349';ctx.globalAlpha=.92*viewBlend;ctx.fillRect(0,start,w,h-start);
      for(let row=0;row<17;row++)for(let col=-1;col<27;col++){
        const n=row*97+col+300,x=col*w/22+(row%2)*w/44+(seed(n)-.5)*w/70,y=start+row*h/15,r=4+seed(n+11)*12;
        const green=['#314a32','#3d5838','#536c40','#657348'][Math.floor(seed(n+31)*4)];ctx.fillStyle=green;ctx.beginPath();ctx.ellipse(x,y,r*1.13,r*.78,seed(n+8)*1.2,0,Math.PI*2);ctx.fill();
      }ctx.restore();
    }
    ctx.globalAlpha=1;
  };

  window.addEventListener('simulatorrestart',()=>{approach=0;collisionTriggered=false});
})();
