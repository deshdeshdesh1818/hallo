(() => {
  const canvas=document.getElementById('mountainLayer');
  if(!canvas)return;
  let approach=0,previousTime=performance.now(),collisionTriggered=false;
  function seed(n){const x=Math.sin(n*127.1+41.7)*43758.5453;return x-Math.floor(x)}
  function headingDifference(d){return Math.abs(((d+180)%360)-180)}

  window.drawMountainIntoWorld=(ctx,w,h,horizon,state={})=>{
    const now=performance.now(),dt=Math.min(.05,(now-previousTime)/1000);previousTime=now;
    const speed=state.speed||0,altitude=state.altitude||0,heading=state.heading||0,pitch=state.pitch||0,travel=state.travel||0;
    const aligned=headingDifference(heading)<48;
    if(speed>0&&aligned&&!collisionTriggered)approach=Math.min(1.15,approach+speed*.000514444*dt/1.6);
    else if(!aligned)approach=Math.max(0,approach-dt*.12);

    let nearestBase=0,nearestTop=h;
    for(let layer=0;layer<3;layer++){
      const depth=(layer+1)/3,scale=.72+depth*.35+Math.pow(approach,1.35)*(1.3+depth*3.8);
      const base=horizon+h*(.035+approach*(.14+depth*.20)),shift=((headingDifference(heading)/180)*w*.22)*(layer-1)*.48;
      const points=[];ctx.beginPath();ctx.moveTo(-w*.16+shift,base);
      for(let i=0;i<=28;i++){const x=-w*.16+w*1.32*i/28+shift,peak=h*Math.max(.055,.12+seed(i*.43+layer*29)*.22+(seed(i*2.71+layer*13)-.5)*.065)*scale,y=base-peak;points.push({x,y,peak});ctx.lineTo(x,y);if(layer===2){nearestBase=Math.max(nearestBase,base);nearestTop=Math.min(nearestTop,y)}}
      ctx.lineTo(w*1.16+shift,base);ctx.closePath();ctx.fillStyle=['#7a8064','#626e54','#46533e'][layer];ctx.globalAlpha=[.76,.87,.98][layer];ctx.fill();ctx.save();ctx.clip();
      const detail=Math.floor(5+approach*22);
      for(let i=0;i<detail;i++){const p=i/detail*(points.length-2),index=Math.floor(p),a=points[index],b=points[index+1],f=p-index,x=a.x+(b.x-a.x)*f,y=a.y+(b.y-a.y)*f,fw=w*(.035+seed(i+layer*80)*.045)*(.75+approach),fd=Math.max(8,h*(.07+seed(i+120+layer*30)*.16)*(.55+approach));ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-fw,y+fd);ctx.lineTo(x+fw*.12,y+fd*(.52+seed(i+5)*.38));ctx.closePath();ctx.fillStyle=i%2?'#343f32':'#9a9272';ctx.globalAlpha=.08+approach*.26;ctx.fill();if(approach>.48&&a.peak>h*.32&&i%3===0){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-fw*.25,y+fd*.35);ctx.lineTo(x+fw*.3,y+fd*.26);ctx.closePath();ctx.fillStyle='#d7d4be';ctx.globalAlpha=Math.min(.8,(approach-.35)*1.2);ctx.fill()}}
      ctx.restore();
    }

    // Runway shows up on some passes, swelling from a distant strip into a landing approach.
    const runwayCycle=((travel+7)%34+34)%34,runwayVisible=runwayCycle<13;
    const runwayApproach=runwayVisible?runwayCycle/13:0;
    const runwayReady=runwayVisible&&runwayApproach>.78;
    window.runwayInfo={visible:runwayVisible,ready:runwayReady,approach:runwayApproach};
    if(runwayVisible&&aligned){
      const top=horizon+8+runwayApproach*h*.08,bottom=horizon+Math.pow(runwayApproach,.72)*h*.72;
      const topWidth=w*(.008+runwayApproach*.018),bottomWidth=w*(.025+runwayApproach*.17),center=w*.5+((heading%36)-18)*w*.006;
      ctx.save();ctx.globalAlpha=.55+runwayApproach*.45;
      ctx.beginPath();ctx.moveTo(center-topWidth,top);ctx.lineTo(center+topWidth,top);ctx.lineTo(center+bottomWidth,bottom);ctx.lineTo(center-bottomWidth,bottom);ctx.closePath();ctx.fillStyle='#514f45';ctx.fill();
      ctx.strokeStyle='#e8dfb8';ctx.lineWidth=2+runwayApproach*2;ctx.setLineDash([5+runwayApproach*10,5+runwayApproach*7]);ctx.beginPath();ctx.moveTo(center,top+4);ctx.lineTo(center,bottom);ctx.stroke();ctx.setLineDash([]);
      for(let side of [-1,1])for(let i=0;i<4;i++){const t=(i+1)/5,y=top+(bottom-top)*t,x=center+side*(topWidth+(bottomWidth-topWidth)*t);ctx.fillStyle='#e5e0c6';ctx.fillRect(x-2,y-2,4,4)}
      ctx.restore();
    }

    // A nose-up view reveals tree crowns beneath the aircraft.
    const viewBlend=Math.max(0,Math.min(1,(pitch-1)/7));
    if(viewBlend>.01&&altitude>=80){const start=horizon+h*(.30-viewBlend*.21);ctx.save();ctx.fillStyle='#526349';ctx.globalAlpha=.92*viewBlend;ctx.fillRect(0,start,w,h-start);for(let row=0;row<17;row++)for(let col=-1;col<27;col++){const n=row*97+col+300,x=col*w/22+(row%2)*w/44+(seed(n)-.5)*w/70,y=start+row*h/15,r=4+seed(n+11)*12;ctx.fillStyle=['#314a32','#3d5838','#536c40','#657348'][Math.floor(seed(n+31)*4)];ctx.beginPath();ctx.ellipse(x,y,r*1.13,r*.78,seed(n+8)*1.2,0,Math.PI*2);ctx.fill()}ctx.restore()}
    ctx.globalAlpha=1;
    const fillsView=nearestBase>=h*.88&&nearestTop<=h*.12;
    if(fillsView&&altitude<1800&&aligned&&!collisionTriggered){collisionTriggered=true;window.crashAircraft?.('mountain')}
  };
  window.addEventListener('simulatorrestart',()=>{approach=0;collisionTriggered=false;window.runwayInfo={visible:false,ready:false,approach:0}});
})();
