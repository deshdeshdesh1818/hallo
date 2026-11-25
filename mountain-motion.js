(() => {
  const canvas=document.getElementById('mountainLayer');
  if(!canvas)return;
  let approach=0,previousTime=performance.now(),collisionTriggered=false,cloudDrift=0;
  let biome='valley';window.landscapeBiome=biome;window.landscapePan=0;
  const seed=n=>{const x=Math.sin(n*127.1+41.7)*43758.5453;return x-Math.floor(x)};
  const headingDifference=d=>Math.abs(((d+180)%360)-180);
  function drawClouds(ctx,w,h,horizon,pan){cloudDrift+=.22;for(let i=0;i<11;i++){const x=((i*w*.17+cloudDrift+pan*w*.55)%(w*1.3))-w*.15,y=horizon*(.12+seed(i+91)*.43),r=w*(.024+seed(i+114)*.025);ctx.save();ctx.fillStyle='#f7f5e8';ctx.globalAlpha=.24+seed(i+313)*.2;for(let j=0;j<4;j++){ctx.beginPath();ctx.ellipse(x+(j-1.5)*r*.54,y-Math.sin(j*1.8)*r*.18,r*(.5+seed(i*13+j)*.22),r*(.2+seed(i*17+j)*.08),0,0,Math.PI*2);ctx.fill()}ctx.restore()}}
  window.drawMountainIntoWorld=(ctx,w,h,horizon,state={})=>{
    const now=performance.now(),dt=Math.min(.05,(now-previousTime)/1000);previousTime=now;const speed=state.speed||0,altitude=state.altitude||0,heading=state.heading||0,travel=state.travel||0,pan=window.landscapePan||0,aligned=headingDifference(heading)<60,clearance=Math.max(0,Math.min(1,(altitude-350)/2500));
    if(speed>4&&aligned&&clearance<.65)approach=Math.min(1.4,Math.max(approach,travel/28));else if(!aligned)approach=Math.max(0,approach-dt*.025);
    if(approach>1.02&&clearance>.18)biome='alpine';if(approach>1.28&&clearance>.45)biome='alpine';window.landscapeBiome=biome;
    drawClouds(ctx,w,h,horizon,pan);let nearestTop=h,nearestBase=0;const panShift=pan*w*.42;
    for(let layer=0;layer<3;layer++){
      const depth=(layer+1)/3,scale=(.58+depth*.32+Math.pow(Math.min(1.2,approach),1.45)*(1+depth*3.1))*(1-clearance*.82),base=horizon+h*(.018+Math.min(1,approach)*(.12+depth*.18))+clearance*h*.32,shift=panShift*(.65+depth*.35)+((heading+180)%360-180)/180*w*.14*depth,points=[];
      for(let i=0;i<=40;i++){const x=-w*.2+w*1.4*i/40+shift,profile=.13+seed(i*.43+layer*29)*.23+(seed(i*2.71+layer*13)-.5)*.07,y=base-h*Math.max(.055,profile)*Math.max(.12,scale);points.push({x,y});if(layer===2){nearestTop=Math.min(nearestTop,y);nearestBase=Math.max(nearestBase,base)}}
      ctx.beginPath();ctx.moveTo(points[0].x,base);points.forEach(p=>ctx.lineTo(p.x,p.y));ctx.lineTo(points[points.length-1].x,base);ctx.closePath();ctx.fillStyle=biome==='alpine'?['#777f78','#68736f','#53625f'][layer]:['#82846a','#646e55','#46533e'][layer];ctx.globalAlpha=[.68,.84,.97][layer];ctx.fill();ctx.save();ctx.clip();
      const details=Math.floor(5+approach*22);for(let i=0;i<details;i++){const index=Math.floor(seed(i+layer*91)*(points.length-1)),p=points[index],q=points[Math.min(index+1,points.length-1)],f=seed(i+layer*47),x=p.x+(q.x-p.x)*f,y=p.y+(q.y-p.y)*f,fw=w*(.02+seed(i+layer*31)*.045)*(.6+approach),fh=h*(.05+seed(i+layer*59)*.16)*(.5+approach);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-fw,y+fh);ctx.lineTo(x+fw*.16,y+fh*.58);ctx.closePath();ctx.fillStyle=i%2?'#34413b':'#a9a58c';ctx.globalAlpha=.08+Math.min(.3,approach*.23);ctx.fill();if(approach>.55&&i%4===0){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-fw*.24,y+fh*.31);ctx.lineTo(x+fw*.3,y+fh*.27);ctx.closePath();ctx.fillStyle='#e2e0d1';ctx.globalAlpha=.46;ctx.fill()}}ctx.restore();
    }
    if(biome==='valley')for(let patch=0;patch<30;patch++){const row=patch%10,z=(row/10+travel*.006)%1,y=horizon+z*z*(h-horizon),x=((seed(patch+400)+pan*.8+1)%1)*w,density=seed(patch+500),count=density<.30?0:Math.floor(4+seed(patch+600)*34),patchWidth=w*(.04+seed(patch+700)*.13)*(.5+z);for(let t=0;t<count;t++){const tx=x+(seed(patch*71+t*3)-.5)*patchWidth,ty=y+(seed(patch*43+t*9)-.5)*h*(.02+z*.06),size=2+z*(5+seed(patch*17+t)*21);if(tx<-size||tx>w+size||ty<horizon||ty>h)continue;ctx.fillStyle=['#263d2b','#345039','#405a3c','#526744','#62714a'][Math.floor(seed(patch*19+t*13)*5)];ctx.beginPath();ctx.ellipse(tx,ty,size*(.55+seed(t+patch)*.65),size*(.45+seed(t+patch+33)*.45),seed(t*2+patch),0,Math.PI*2);ctx.fill()}}
    else{ctx.fillStyle='rgba(193,196,177,.72)';ctx.fillRect(0,horizon+h*.18,w,h);for(let i=0;i<20;i++){const x=((i*173+panShift+travel*2)%(w+80))-40,y=horizon+h*(.2+seed(i+77)*.65),r=8+seed(i+88)*38;ctx.fillStyle=i%2?'rgba(104,116,111,.58)':'rgba(230,225,199,.72)';ctx.beginPath();ctx.ellipse(x,y,r,r*.35,seed(i+98),0,Math.PI*2);ctx.fill()}}
    ctx.globalAlpha=1;const fillsView=nearestTop<=h*.035&&nearestBase>=h*.97;if(fillsView&&altitude<450&&aligned&&!collisionTriggered){collisionTriggered=true;window.crashAircraft?.('mountain')}
  };
  window.addEventListener('simulatorrestart',()=>{approach=0;collisionTriggered=false;biome='valley';window.landscapeBiome=biome});
})();
