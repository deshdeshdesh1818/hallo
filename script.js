const canvas=document.getElementById('world'), ctx=canvas.getContext('2d');
const throttle=document.getElementById('throttle'),pitch=document.getElementById('pitch'),heading=document.getElementById('heading');
let paused=false, altitude=0, speed=0, headingVal=0, pitchVal=0, vertical=0, lon=-4.76, lat=52.30, onGround=true, clouds=[], rollDistance=0, flightDistance=0;

function resize(){const d=devicePixelRatio||1,r=canvas.parentElement.getBoundingClientRect();canvas.width=r.width*d;canvas.height=r.height*d;ctx.setTransform(d,0,0,d,0,0)}
window.addEventListener('resize',resize);resize();
for(let i=0;i<18;i++)clouds.push({x:Math.random()*1400,y:20+Math.random()*300,s:30+Math.random()*90,a:.08+Math.random()*.12});

function drawWorld(t){
 const w=canvas.clientWidth,h=canvas.clientHeight,horizon=h*.58+pitchVal*2;
 const sky=ctx.createLinearGradient(0,0,0,h*.68);sky.addColorStop(0,'#315c72');sky.addColorStop(.55,'#75aec0');sky.addColorStop(1,'#d0d9d2');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
 const rg=ctx.createRadialGradient(w*.78,h*.22,10,w*.78,h*.22,150);rg.addColorStop(0,'rgba(255,245,194,.7)');rg.addColorStop(1,'rgba(255,245,194,0)');ctx.fillStyle=rg;ctx.fillRect(w*.55,0,w*.5,h*.5);
 const drift=((headingVal+180)%360-180)*1.3;
 ctx.save();ctx.translate(drift,0);for(const c of clouds){let x=(c.x+t*.004*(speed/240))%(w+300)-150;ctx.globalAlpha=c.a;ctx.fillStyle='#eff8f6';ctx.beginPath();ctx.ellipse(x,c.y+c.y*.08*(pitchVal/10),c.s*1.5,c.s*.32,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(x+c.s*.7,c.y,c.s,c.s*.25,0,0,Math.PI*2);ctx.fill()}ctx.restore();ctx.globalAlpha=1;
 // Terrain fills the lower view; the moving field bands give a forward-motion cue.
 ctx.fillStyle='#75835a';ctx.beginPath();ctx.moveTo(0,horizon);for(let x=0;x<=w;x+=40)ctx.lineTo(x,horizon-18-Math.sin(x*.012+headingVal*.01)*12-Math.sin(x*.031)*7);ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.fill();
 ctx.fillStyle='#9a9d64';ctx.fillRect(0,horizon+Math.max(0,(h-horizon)*.12),w,h);
 ctx.save();ctx.beginPath();ctx.rect(0,horizon,w,h-horizon);ctx.clip();ctx.translate(drift,0);
 for(let i=0;i<16;i++){const p=((i/16+flightDistance*.015)%1);const y=horizon+10+p*p*(h-horizon);ctx.strokeStyle=i%2?'rgba(230,218,156,.20)':'rgba(55,91,55,.24)';ctx.lineWidth=1+p*3;ctx.beginPath();ctx.moveTo(w*.5-250*p,y);ctx.lineTo(w*.5+250*p,y);ctx.stroke()}
 if(onGround){
  const rw=w*.065;ctx.fillStyle='#505a52';ctx.beginPath();ctx.moveTo(w*.5-rw*.15,horizon+4);ctx.lineTo(w*.5+rw*.15,horizon+4);ctx.lineTo(w*.5+rw,h);ctx.lineTo(w*.5-rw,h);ctx.closePath();ctx.fill();
  ctx.strokeStyle='rgba(235,240,225,.7)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(w*.5-rw*.15,horizon+4);ctx.lineTo(w*.5-rw,h);ctx.moveTo(w*.5+rw*.15,horizon+4);ctx.lineTo(w*.5+rw,h);ctx.stroke();
  for(let i=0;i<8;i++){const p=((i/8+rollDistance*.035)%1);const y=horizon+8+p*p*(h-horizon);const dashW=2+p*5,dashH=3+p*24;ctx.fillStyle='rgba(255,255,255,.82)';ctx.fillRect(w*.5-dashW/2,y,dashW,dashH)}
 }
 ctx.restore();
}

function gauge(canvasId,value,min,max,kind){const c=document.getElementById(canvasId),x=c.getContext('2d'),w=c.width,h=c.height,cx=w/2,cy=h/2,r=58;x.clearRect(0,0,w,h);x.save();x.translate(cx,cy);x.strokeStyle='#34464b';x.lineWidth=5;x.beginPath();x.arc(0,0,r,Math.PI*.72,Math.PI*2.28);x.stroke();x.strokeStyle='#aebbb8';x.lineWidth=1;for(let i=0;i<=20;i++){let a=Math.PI*.72+i*(Math.PI*1.56/20),inner=r-8,outer=r-(i%5===0?14:10);x.beginPath();x.moveTo(Math.cos(a)*inner,-Math.sin(a)*inner);x.lineTo(Math.cos(a)*outer,-Math.sin(a)*outer);x.stroke()}const p=Math.max(0,Math.min(1,(value-min)/(max-min))),a=Math.PI*.72+p*Math.PI*1.56;x.strokeStyle=kind==='v'?'#dfe7df':'#baff5a';x.lineWidth=3;x.beginPath();x.moveTo(-Math.cos(a)*9,Math.sin(a)*9);x.lineTo(Math.cos(a)*44,-Math.sin(a)*44);x.stroke();x.fillStyle='#cfdad7';x.beginPath();x.arc(0,0,5,0,Math.PI*2);x.fill();x.restore()}

let last=performance.now();
function loop(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(!paused){const power=+throttle.value;const desiredSpeed=power*3.2;speed+=(desiredSpeed-speed)*dt*.38;pitchVal+=(+pitch.value-pitchVal)*dt*2;headingVal=+heading.value;
 if(onGround){vertical=0;altitude=0;rollDistance+=speed*dt*.04;if(speed>=55&&pitchVal>=7){onGround=false;vertical=250}}
 else{vertical=pitchVal*420;altitude+=vertical*dt/60;if(altitude<=0){altitude=0;vertical=0;if(pitchVal<2){onGround=true;speed=Math.max(0,speed-35*dt)}}altitude=Math.min(14000,altitude);flightDistance+=speed*dt*.001}
 lon+=(speed/3600)*dt*.018;lat+=pitchVal*dt*.00008}
 drawWorld(now);updateUI();requestAnimationFrame(loop)}

function updateUI(){document.getElementById('speedValue').textContent=Math.round(speed);document.getElementById('altValue').textContent=Math.round(altitude).toLocaleString('en-US');document.getElementById('vsValue').textContent=(vertical>=0?'+':'')+Math.round(vertical);document.getElementById('speedHud').textContent=Math.round(speed);document.getElementById('altHud').textContent=Math.round(altitude).toLocaleString('en-US');document.getElementById('groundSpeed').textContent=Math.round(speed);document.getElementById('headingTicker').textContent=String(Math.round(headingVal)%360).padStart(3,'0')+'°';document.getElementById('headingOut').textContent=heading.value+'°';document.getElementById('pitchOut').textContent=(pitch.value>0?'+':'')+pitch.value+'°';document.getElementById('throttleOut').textContent=throttle.value+'%';document.getElementById('coordinates').innerHTML=Math.abs(lat).toFixed(2)+'° '+(lat>=0?'N':'S')+'&nbsp;&nbsp; '+Math.abs(lon).toFixed(2)+'° '+(lon>=0?'E':'W');gauge('speedGauge',speed,0,320);gauge('altGauge',altitude,0,14000);gauge('vsGauge',Math.abs(vertical),0,2000,'v');document.getElementById('utc').textContent=new Date().toISOString().slice(11,19)}

throttle.addEventListener('input',()=>document.getElementById('throttleOut').textContent=throttle.value+'%');pitch.addEventListener('input',()=>document.getElementById('pitchOut').textContent=(pitch.value>0?'+':'')+pitch.value+'°');heading.addEventListener('input',()=>document.getElementById('headingOut').textContent=heading.value+'°');
document.getElementById('pauseBtn').addEventListener('click',()=>{paused=!paused;document.getElementById('pauseIcon').textContent=paused?'▶':'Ⅱ';document.querySelector('footer span').innerHTML=paused?'◆ SIMULATION PAUSED':'<i class="status-dot"></i> SIMULATION ACTIVE'});
requestAnimationFrame(loop);
