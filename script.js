const canvas=document.getElementById('world'), ctx=canvas.getContext('2d');
const throttle=document.getElementById('throttle'),pitch=document.getElementById('pitch'),heading=document.getElementById('heading');
let paused=false, altitude=10500, speed=240, headingVal=0, pitchVal=0, vertical=0, lon=-4.76, lat=52.30, clouds=[];

function resize(){ const d=devicePixelRatio||1,r=canvas.getBoundingRect?.() || canvas.parentElement.getBoundingClientRect(); canvas.width=r.width*d;canvas.height=r.height*d;ctx.setTransform(d,0,0,d,0,0); }
window.addEventListener('resize',resize); resize();
for(let i=0;i<18;i++) clouds.push({x:Math.random()*1400,y:20+Math.random()*300,s:30+Math.random()*90,a:.08+Math.random()*.12});

function drawWorld(t){
 const w=canvas.clientWidth,h=canvas.clientHeight;
 const sky=ctx.createLinearGradient(0,0,0,h*.68); sky.addColorStop(0,'#315c72');sky.addColorStop(.55,'#75aec0');sky.addColorStop(1,'#d0d9d2');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
 // sun glow
 const rg=ctx.createRadialGradient(w*.78,h*.22,10,w*.78,h*.22,150);rg.addColorStop(0,'rgba(255,245,194,.7)');rg.addColorStop(1,'rgba(255,245,194,0)');ctx.fillStyle=rg;ctx.fillRect(w*.55,0,w*.5,h*.5);
 // distant clouds
 ctx.save();ctx.translate(pitchVal*-1.5,0);for(const c of clouds){let x=(c.x+t*.004*(speed/240))%(w+300)-150;ctx.globalAlpha=c.a;ctx.fillStyle='#eff8f6';ctx.beginPath();ctx.ellipse(x,c.y+c.y*.08*(pitchVal/10),c.s*1.5,c.s*.32,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(x+c.s*.7,c.y,c.s,c.s*.25,0,0,Math.PI*2);ctx.fill()}ctx.restore();ctx.globalAlpha=1;
 // horizon and terrain
 const horizon=h*.58+pitchVal*2;
 ctx.fillStyle='#75835a';ctx.beginPath();ctx.moveTo(0,horizon);for(let x=0;x<=w;x+=40){ctx.lineTo(x,horizon-18-Math.sin(x*.012+headingVal*.01)*12-Math.sin(x*.031)*7)}ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.fill();
 // rolling fields
 ctx.fillStyle='#9a9d64';ctx.beginPath();ctx.moveTo(0,horizon+20);ctx.lineTo(w,horizon+12);ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.fill();
 ctx.strokeStyle='rgba(238,218,153,.25)';ctx.lineWidth=2;for(let i=-2;i<12;i++){ctx.beginPath();ctx.moveTo(w*.5+i*w*.11,horizon+25);ctx.lineTo(w*.5+i*w*.28,h);ctx.stroke()}
 // runway / town hints
 ctx.fillStyle='#505a52';ctx.beginPath();ctx.moveTo(w*.47,horizon+5);ctx.lineTo(w*.53,horizon+5);ctx.lineTo(w*.66,h);ctx.lineTo(w*.34,h);ctx.fill();
 ctx.fillStyle='#ced0ba';for(let i=0;i<14;i++){let yy=horizon+30+i*i*1.8;if(yy<h){ctx.fillRect(w*(.43+i*.009),yy,2,1)}}
}

function gauge(canvasId,value,min,max,kind){const c=document.getElementById(canvasId),x=c.getContext('2d'),w=c.width,h=c.height,cx=w/2,cy=h/2,r=58;x.clearRect(0,0,w,h);x.save();x.translate(cx,cy);x.strokeStyle='#34464b';x.lineWidth=5;x.beginPath();x.arc(0,0,r,Math.PI*.72,Math.PI*2.28);x.stroke();x.strokeStyle='#aebbb8';x.lineWidth=1;for(let i=0;i<=20;i++){let a=Math.PI*.72+i*(Math.PI*1.56/20),inner=r-8,outer=r-(i%5===0?14:10);x.beginPath();x.moveTo(Math.cos(a)*inner,-Math.sin(a)*inner);x.lineTo(Math.cos(a)*outer,-Math.sin(a)*outer);x.stroke()}let p=(value-min)/(max-min),a=Math.PI*.72+p*Math.PI*1.56;x.strokeStyle=kind==='v'? '#dfe7df':'#baff5a';x.lineWidth=3;x.beginPath();x.moveTo(-Math.cos(a)*9,Math.sin(a)*9);x.lineTo(Math.cos(a)*44,-Math.sin(a)*44);x.stroke();x.fillStyle='#cfdad7';x.beginPath();x.arc(0,0,5,0,Math.PI*2);x.fill();x.restore()}

let last=performance.now();function loop(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(!paused){speed+=(throttle.value*1.75-altitude/90-3*speed/240)*dt*.12;speed=Math.max(120,Math.min(320,speed));pitchVal+=(+pitch.value-pitchVal)*dt*2;headingVal=+heading.value+(speed*.001*Math.sin(now*.0002));vertical=pitchVal*420 + Math.sin(now*.001)*20;altitude+=vertical*dt/60;if(altitude<1000)altitude=1000;if(altitude>14000)altitude=14000;lon+=(speed/3600)*dt*.018;lat+=pitchVal*dt*.00008;}drawWorld(now);updateUI(now);requestAnimationFrame(loop)}

function updateUI(now){document.getElementById('speedValue').textContent=Math.round(speed);document.getElementById('altValue').textContent=Math.round(altitude).toLocaleString('en-US');document.getElementById('vsValue').textContent=(vertical>=0?'+' :'')+Math.round(vertical);document.getElementById('speedHud').textContent=Math.round(speed);document.getElementById('altHud').textContent=Math.round(altitude).toLocaleString('en-US');document.getElementById('groundSpeed').textContent=Math.round(speed);document.getElementById('headingTicker').textContent=String(Math.round(headingVal)%360).padStart(3,'0')+'°';document.getElementById('headingOut').textContent=heading.value+'°';document.getElementById('pitchOut').textContent=(pitch.value>0?'+' :'')+pitch.value+'°';document.getElementById('throttleOut').textContent=throttle.value+'%';document.getElementById('coordinates').innerHTML=Math.abs(lat).toFixed(2)+'° '+(lat>=0?'N':'S')+'&nbsp;&nbsp; '+Math.abs(lon).toFixed(2)+'° '+(lon>=0?'E':'W');gauge('speedGauge',speed,120,320);gauge('altGauge',altitude,1000,14000);gauge('vsGauge',Math.abs(vertical),0,2000,'v');const d=new Date();document.getElementById('utc').textContent=d.toISOString().slice(11,19)}

throttle.addEventListener('input',()=>document.getElementById('throttleOut').textContent=throttle.value+'%');pitch.addEventListener('input',()=>document.getElementById('pitchOut').textContent=(pitch.value>0?'+' :'')+pitch.value+'°');heading.addEventListener('input',()=>document.getElementById('headingOut').textContent=heading.value+'°');
document.getElementById('pauseBtn').addEventListener('click',()=>{paused=!paused;document.getElementById('pauseIcon').textContent=paused?'▶':'Ⅱ';document.querySelector('footer span').innerHTML=paused?'◆ SIMULATION PAUSED':'<i class="status-dot"></i> SIMULATION ACTIVE'});

requestAnimationFrame(loop);
