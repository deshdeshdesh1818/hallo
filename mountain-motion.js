(() => {
  const viewport=document.getElementById('viewport');
  const canvas=document.getElementById('mountainLayer');
  if(!viewport||!canvas)return;
  const ctx=canvas.getContext('2d');
  let approach=0,collisionTriggered=false,previousTime=performance.now();

  function resize(){const r=viewport.getBoundingClientRect(),d=window.devicePixelRatio||1;canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d);ctx.setTransform(d,0,0,d,0,0)}
  function seed(n){const x=Math.sin(n*127.1+41.7)*43758.5453;return x-Math.floor(x)}
  function readNumber(id){const text=document.getElementById(id)?.textContent||'0';return Number(text.replace(/,/g,''))||0}
  function headingDifference(d){return Math.abs(((d+180)%360)-180)}

  window.drawMountainIntoWorld=(context,w,h,horizon,state={})=>{
    const now=performance.now(),dt=Math.min(.05,(now-previousTime)/1000);previousTime=now;
    const speed=state.speed||0,altitude=state.altitude||0,heading=state.heading||0,pitch=state.pitch||0,travel=state.travel||0;
    const aligned=headingDifference(heading)<48;

    // 4,500 ft is the visual crossing altitude. Below this height the ridge
    // remains solid; above it the ridge drops below the aircraft and is passed.
    const mountainClearance=Math.max(0,Math.min(1,(altitude-450)/4050));

    if(speed>0&&aligned&&!collisionTriggered&&mountainClearance<.55){
      approach=Math.min(1.15,approach+speed*0.000514444*dt/1.2);
    }else if(!aligned||mountainClearance>=.55){
      approach=Math.max(0,approach-dt*(.35+mountainClearance*.9));
    }

    let nearestBase=0,nearestTop=h;
    for(let layer=0;layer<3;layer++){
      const depth=(layer+1)/3;
      const rawScale=.72+depth*.35+Math.pow(approach,1.35)*(1.3+depth*3.8);
      const scale=rawScale*(1-mountainClearance*.78);
      const base=horizon+h*(.035+Math.max(0,approach-mountainClearance*.72)*(.14+depth*.20))+mountainClearance*h*.42;
      const shift=((headingDifference(heading)/180)*w*.22)*(layer-1)*.48;

      context.beginPath();context.moveTo(-w*.16+shift,base);
      for(let i=0;i<=28;i++){
        const x=-w*.16+w*1.32*i/28+shift;
        const peakHeight=h*Math.max(.055,.12+seed(i*.43+layer*29)*.22+(seed(i*2.71+layer*13)-.5)*.065)*Math.max(.12,scale);
        const y=base-peakHeight;context.lineTo(x,y);
        if(layer===2){nearestBase=Math.max(nearestBase,base);nearestTop=Math.min(nearestTop,y)}
      }
      context.lineTo(w*1.16+shift,base);context.closePath();context.fillStyle=['#7a8064','#626e54','#46533e'][layer];context.globalAlpha=[.76,.87,.98][layer]*(1-mountainClearance*.30);context.fill();

      context.save();context.clip();
      const detail=Math.floor(5+approach*(1-mountainClearance*.65)*26);
      for(let i=0;i<detail;i++){
        const p=i/detail*26,index=Math.floor(p),q=p-index;
        const xa=-w*.16+(w*1.32*index/28)+shift,xb=-w*.16+(w*1.32*(index+1)/28)+shift;
        const ya=base-h*Math.max(.055,.12+seed(index*.43+layer*29)*.22+(seed(index*2.71+layer*13)-.5)*.065)*Math.max(.12,scale);
        const yb=base-h*Math.max(.055,.12+seed((index+1)*.43+layer*29)*.22+(seed((index+1)*2.71+layer*13)-.5)*.065)*Math.max(.12,scale);
        const x=xa+(xb-xa)*q,y=ya+(yb-ya)*q;
        const fw=w*(.035+seed(i+layer*80)*.045)*(.75+approach*(1-mountainClearance));
        const fd=Math.max(8,h*(.07+seed(i+120+layer*30)*.16)*(.55+approach*(1-mountainClearance)));
        context.beginPath();context.moveTo(x,y);context.lineTo(x-fw,y+fd);context.lineTo(x+fw*.12,y+fd*(.52+seed(i+5)*.38));context.closePath();context.fillStyle=i%2?'#343f32':'#9a9272';context.globalAlpha=.08+approach*(1-mountainClearance)*.26;context.fill();
        if(approach>.48&&i%3===0&&mountainClearance<.55){context.beginPath();context.moveTo(x,y);context.lineTo(x-fw*.25,y+fd*.35);context.lineTo(x+fw*.3,y+fd*.26);context.closePath();context.fillStyle='#d7d4be';context.globalAlpha=Math.min(.8,(approach-.35)*(1-mountainClearance)*1.2);context.fill()}
      }
      context.restore();
    }

    // Occasional runway approach strip.
    const runwayCycle=((travel+7)%34+34)%34,runwayVisible=runwayCycle<13;
    const runwayApproach=runwayVisible?runwayCycle/13:0;
    window.runwayInfo={visible:runwayVisible,ready:runwayVisible&&runwayApproach>.78,approach:runwayApproach};
    if(runwayVisible&&aligned&&altitude<9000){
      const top=horizon+8+runwayApproach*h*.08,bottom=horizon+Math.pow(runwayApproach,.72)*h*.72;
      const topWidth=w*(.008+runwayApproach*.018),bottomWidth=w*(.025+runwayApproach*.17),center=w*.5+((heading%36)-18)*w*.006;
      context.save();context.globalAlpha=.55+runwayApproach*.45;context.beginPath();context.moveTo(center-topWidth,top);context.lineTo(center+topWidth,top);context.lineTo(center+bottomWidth,bottom);context.lineTo(center-bottomWidth,bottom);context.closePath();context.fillStyle='#514f45';context.fill();context.strokeStyle='#e8dfb8';context.lineWidth=2+runwayApproach*2;context.setLineDash([5+runwayApproach*10,5+runwayApproach*7]);context.beginPath();context.moveTo(center,top+4);context.lineTo(center,bottom);context.stroke();context.setLineDash([]);context.restore();
    }

    // Nose-up view shows the tree canopy from above.
    const viewBlend=Math.max(0,Math.min(1,(pitch-1)/7));
    if(viewBlend>.01&&altitude>=80){const start=horizon+h*(.30-viewBlend*.21);context.save();context.fillStyle='#526349';context.globalAlpha=.92*viewBlend;context.fillRect(0,start,w,h-start);for(let row=0;row<17;row++)for(let col=-1;col<27;col++){const n=row*97+col+300,x=col*w/22+(row%2)*w/44+(seed(n)-.5)*w/70,y=start+row*h/15,r=4+seed(n+11)*12;context.fillStyle=['#314a32','#3d5838','#536c40','#657348'][Math.floor(seed(n+31)*4)];context.beginPath();context.ellipse(x,y,r*1.13,r*.78,seed(n+8)*1.2,0,Math.PI*2);context.fill()}context.restore()}

    context.globalAlpha=1;
    const fillsView=nearestBase>=h*.88&&nearestTop<=h*.12;
    // There must be a real near-ridge impact and very low altitude. A climb above
    // 4,500 ft clearly lowers and passes the ridge instead of causing a crash.
    if(fillsView&&altitude<450&&aligned&&!collisionTriggered&&mountainClearance<.08){collisionTriggered=true;window.crashAircraft?.('mountain')}
  };
  window.addEventListener('resize',resize);window.addEventListener('simulatorrestart',()=>{approach=0;collisionTriggered=false;window.runwayInfo={visible:false,ready:false,approach:0}});resize();
})();
