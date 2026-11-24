const canvas=document.getElementById('world'),ctx=canvas.getContext('2d');
const throttle=document.getElementById('throttle'),pitch=document.getElementById('pitch'),heading=document.getElementById('heading');
let paused=false,altitude=0,speed=0,headingVal=0,pitchVal=0,vertical=0,onGround=true,lon=-4.76,lat=52.30,worldTravel=0,turnView=0,propSpin=0,seed=7;

function resize(){const d=devicePixelRatio||1,r=canvas.parentElement.getBoundingClientRect();canvas.width=r.width*d;canvas.height=r.height*d;ctx.setTransform(d,0,0,d,0,0)}addEventListener('resize',resize);resize();

function noise(n){return Math.sin(n*12.9898+seed*78.233)*43758.5453%1}
function line(x1,y1,x2,y2,color,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}

function drawWorld(){
 const w=canvas.clientWidth,h=canvas.clientHeight,horizon=h*.54+pitchVal*2.1;
 // Natural, hand-painted sky
 const sky=ctx.createLinearGradient(0,0,0,horizon);sky.addColorStop(0,'#6f94a5');sky.addColorStop(.65,'#b9c0b0');sky.addColorStop(1,'#d0d1b4');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
 ctx.fillStyle='rgba(248,238,177,.38)';ctx.beginPath();ctx.arc(w*.75,h*.18,58,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='rgba(238,235,210,.30)';for(let i=0;i<7;i++){const cx=((i*173+worldTravel*.025)% (w+260))-130,cy=70+(i%3)*38;ctx.beginPath();ctx.ellipse(cx,cy,55,10,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(cx+28,cy-7,35,8,0,0,Math.PI*2);ctx.fill()}

 ctx.save();ctx.translate(turnView*-w*.20,0);
 // Distant mountains and villages remain visually linked to the course
 ctx.fillStyle='#66715b';ctx.beginPath();ctx.moveTo(-w*.15,horizon);for(let x=-w*.15;x<w*1.15;x+=w*.055){const xx=x,peak=horizon-35-Math.abs(noise(Math.floor(x/w*.055)))*82;ctx.lineTo(xx,peak)}ctx.lineTo(w*1.15,horizon);ctx.closePath();ctx.fill();
 ctx.fillStyle='#4e5d48';ctx.beginPath();ctx.moveTo(-w*.15,horizon+8);for(let x=-w*.15;x<w*1.15;x+=w*.08){ctx.lineTo(x,horizon-12-Math.abs(noise(Math.floor(x/w*.08)+20))*58)}ctx.lineTo(w*1.15,horizon+8);ctx.closePath();ctx.fill();
 // Low perspective ground
 ctx.fillStyle='#6f744b';ctx.beginPath();ctx.moveTo(0,horizon);ctx.lineTo(w,horizon);ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.fill();

 // Moving hedgerows, trees and field boundaries
 ctx.save();ctx.beginPath();ctx.rect(0,horizon,w,h-horizon);ctx.clip();
 for(let i=-4;i<18;i++){
  const z=((i/18+worldTravel*.018)%1+1)%1;
  const y=horizon+z*z*(h-horizon);
  const side=(i%2?.55:.38);
  line(w*(.5-side*(1-z)),y,w*(.5+side*(1-z)),y,'rgba(68,76,45,.32)',1+z*2);
  if(i%3===0){const tx=w*(.12+(i%5)*.19),ty=y-10*z;ctx.fillStyle='#394a32';ctx.beginPath();ctx.arc(tx,ty,5+z*14,0,Math.PI*2);ctx.fill()}
 }
 // Perspective runway, always visible while on the ground
 if(onGround){
  const near=w*.31,far=w*.44,runwayTop=horizon+5;
  ctx.fillStyle='#69675a';ctx.beginPath();ctx.moveTo(w*.5-far*.28,runwayTop);ctx.lineTo(w*.5+far*.28,runwayTop);ctx.lineTo(w*.5+near*.72,h);ctx.lineTo(w*.5-near*.72,h);ctx.closePath();ctx.fill();
  ctx.fillStyle='#a0a28e';ctx.beginPath();ctx.moveTo(w*.5-far*.18,runwayTop);ctx.lineTo(w*.5+far*.18,runwayTop);ctx.lineTo(w*.5+near*.48,h);ctx.lineTo(w*.5-near*.48,h);ctx.closePath();ctx.fill();
  ctx.fillStyle='#777864';ctx.beginPath();ctx.moveTo(w*.5-far*.10,runwayTop);ctx.lineTo(w*.5+far*.10,runwayTop);ctx.lineTo(w*.5+near*.34,h);ctx.lineTo(w*.5-near*.34,h);ctx.closePath();ctx.fill();
  // Receding runway marks move toward the aircraft
  for(let i=0;i<12;i++){const z=((i/12+worldTravel*.032)%1+1)%1;const y=horizon+8+z*z*(h-horizon);const half=3+z*11;ctx.fillStyle='rgba(238,232,194,.92)';ctx.fillRect(w*.5-half,y,half*2,3+z*9)}
 }
 ctx.restore();ctx.restore();

 // Propeller animation and simple rudder movement
 const prop=document.querySelector('.propeller');if(prop)prop.style.transform=`rotate(${propSpin}deg)`;
}

function gauge(id,value,min,max,kind){const c=document.getElementById(id),x=c.getContext('2d'),w=c.width,h=c.height,r=58;x.clearRect(0,0,w,h);x.save();x.translate(w/2,h/2);x.strokeStyle='#526055';x.lineWidth=5;x.beginPath();x.arc(0,0,r,Math.PI*.72,Math.PI*2.28);x.stroke();for(let i=0;i<=20;i++){const a=Math.PI*.72+i*Math.PI*1.56/20,inner=r-8,outer=r-(i%5===0?14:10);x.beginPath();x.moveTo(Math.cos(a)*inner,-Math.sin(a)*inner);x.lineTo(Math.cos(a)*outer,-Math.sin(a)*outer);x.strokeStyle='#d4cfaa';x.stroke()}const p=Math.max(0,Math.min(1,(value-min)/(max-min))),a=Math.PI*.72+p*Math.PI*1.56;x.strokeStyle=kind==='v'?'#ece9c9':'#ccd08d';x.lineWidth=3;x.beginPath();x.moveTo(-Math.cos(a)*9,Math.sin(a)*9);x.lineTo(Math.cos(a)*44,-Math.sin(a)*44);x.stroke();x.restore()}

let last=performance.now();function loop(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(!paused){const power=+throttle.value;const target=power*1.45;speed+=(target-speed)*dt*.32;pitchVal+=(+pitch.value-pitchVal)*dt*1.8;const targetHeading=+heading.value;let diff=((targetHeading-headingVal+540)%360)-180;headingVal=(headingVal+diff*dt*.8+360)%360;turnView+=(diff*dt*.008-turnView)*dt*.8;worldTravel+=(speed*dt*.06);propSpin=(propSpin+speed*dt*2.2)%360;
 if(onGround){vertical=0;altitude=0;if(speed>=48&&pitchVal>=6){onGround=false;vertical=180}}
 else{vertical=pitchVal*360;altitude+=vertical*dt/60;if(altitude<=0){altitude=0;vertical=0;if(pitchVal<2){onGround=true;speed=Math.max(0,speed-22*dt)}}altitude=Math.min(14000,altitude)}
 lon+=(speed/3600)*dt*.018*Math.sin(headingVal*Math.PI/180);lat+=(speed/3600)*dt*.018*Math.cos(headingVal*Math.PI/180)}drawWorld();updateUI();requestAnimationFrame(loop)}

function updateUI(){const h=Math.round(headingVal)%360;document.getElementById('speedValue').textContent=Math.round(speed);document.getElementById('altValue').textContent=Math.round(altitude).toLocaleString('en-US');document.getElementById('vsValue').textContent=(vertical>=0?'+':'')+Math.round(vertical);document.getElementById('speedHud').textContent=Math.round(speed);document.getElementById('altHud').textContent=Math.round(altitude).toLocaleString('en-US');document.getElementById('headingTicker').textContent=String(h).padStart(3,'0')+'°';document.getElementById('flightHeading').textContent=String(h).padStart(3,'0')+'°';document.getElementById('headingOut').textContent=heading.value+'°';document.getElementById('pitchOut').textContent=(pitch.value>0?'+':'')+pitch.value+'°';document.getElementById('throttleOut').textContent=throttle.value+'%';document.getElementById('coordinates').innerHTML=Math.abs(lat).toFixed(2)+'° '+(lat>=0?'N':'S')+'&nbsp;&nbsp; '+Math.abs(lon).toFixed(2)+'° '+(lon>=0?'E':'W');gauge('speedGauge',speed,0,180);gauge('altGauge',altitude,0,14000);gauge('vsGauge',Math.abs(vertical),0,2000,'v');document.getElementById('utc').textContent=new Date().toISOString().slice(11,19)}

throttle.addEventListener('input',()=>document.getElementById('throttleOut').textContent=throttle.value+'%');pitch.addEventListener('input',()=>document.getElementById('pitchOut').textContent=(pitch.value>0?'+':'')+pitch.value+'°');heading.addEventListener('input',()=>document.getElementById('headingOut').textContent=heading.value+'°');document.getElementById('pauseBtn').addEventListener('click',()=>{paused=!paused;document.getElementById('pauseIcon').textContent=paused?'▶':'Ⅱ';document.querySelector('footer span').innerHTML=paused?'◆ VLIEGTUIG PAUZE':'<i class="status-dot"></i> VLIEGTUIG AKTIEF'});
requestAnimationFrame(loop);
