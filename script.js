const canvas=document.getElementById('world');
const ctx=canvas.getContext('2d');
const throttle=document.getElementById('throttle');
const pitch=document.getElementById('pitch');
const heading=document.getElementById('heading');
let paused=false,crashed=false,crashTime=0,altitude=0,speed=0,headingVal=0,pitchVal=0,vertical=0,onGround=true,lon=-4.76,lat=52.30,travel=0,prop=0,stalling=false;
const STALL_SPEED=34,TAKEOFF_SPEED=48;

// Replace the old course slider with a draggable control-wheel. Wheel movement
// controls heading and also pans the scenery, so both respond together.
heading.closest('.control-row')?.remove();
const viewport=document.getElementById('viewport');
const wheel=document.createElement('div');
wheel.className='steering-wheel';
wheel.setAttribute('role','slider');
wheel.setAttribute('aria-label','Stuur links of rechts');
wheel.setAttribute('tabindex','0');
wheel.innerHTML='<div class="wheel-rim"><div class="wheel-spoke spoke-a"></div><div class="wheel-spoke spoke-b"></div><div class="wheel-hub"></div></div><span>STUUR</span>';
viewport.appendChild(wheel);
let steeringPointer=null,lastPointerX=0;
function steerBy(delta){
  const value=(Number(heading.value)+delta+360)%360;
  heading.value=String(Math.round(value));
  document.getElementById('headingOut').textContent=heading.value+'°';
  wheel.style.setProperty('--wheel-turn',`${((Number(heading.value)+180)%360-180)*1.5}deg`);
  window.landscapePan=(((Number(heading.value)+180)%360-180)/180);
}
wheel.addEventListener('pointerdown',event=>{steeringPointer=event.pointerId;lastPointerX=event.clientX;wheel.setPointerCapture(event.pointerId);event.preventDefault()});
wheel.addEventListener('pointermove',event=>{if(steeringPointer!==event.pointerId)return;const delta=event.clientX-lastPointerX;lastPointerX=event.clientX;steerBy(delta*.55)});
wheel.addEventListener('pointerup',event=>{if(steeringPointer===event.pointerId)steeringPointer=null});
wheel.addEventListener('pointercancel',()=>steeringPointer=null);
wheel.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){steerBy(event.key==='ArrowLeft'?-5:5);event.preventDefault()}});

const crashPanel=document.createElement('div');
crashPanel.id='crashPanel';
crashPanel.innerHTML='<div class="crash-card"><strong>NEERGESTORT</strong><span>Het vliegtuig is neergestort.</span><button id="restartBtn">↻</button></div>';
viewport.appendChild(crashPanel);
const stallWarning=document.createElement('div');
stallWarning.id='stallWarning';stallWarning.textContent='STALL — TE WEINIG SNELHEID';viewport.appendChild(stallWarning);
window.runwayInfo={visible:false,ready:false,approach:0};

function resize(){const d=devicePixelRatio||1,r=canvas.parentElement.getBoundingClientRect();canvas.width=r.width*d;canvas.height=r.height*d;ctx.setTransform(d,0,0,d,0,0)}
addEventListener('resize',resize);resize();
function seeded(a,b=0){const x=Math.sin(a*127.1+b*311.7)*43758.5453;return x-Math.floor(x)}
function ellipse(x,y,rw,rh,color,tilt=0){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rw,rh,tilt,0,Math.PI*2);ctx.fill()}
function polygon(points,color){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);ctx.closePath();ctx.fill()}
function crashAircraft(cause='crash'){if(crashed)return;crashed=true;crashTime=0;onGround=false;speed=0;vertical=-600;stalling=false;crashPanel.dataset.cause=cause;crashPanel.classList.add('visible')}
window.crashAircraft=crashAircraft;

function drawWorld(){
 const d=devicePixelRatio||1,w=canvas.clientWidth,h=canvas.clientHeight,horizon=h*.47+pitchVal*3;
 ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,w,h);
 if(crashed){const shake=Math.min(12,crashTime*3);ctx.save();ctx.translate(Math.sin(crashTime*19)*shake,Math.cos(crashTime*15)*shake*.45)}
 const alpine=window.landscapeBiome==='alpine';
 const sky=ctx.createLinearGradient(0,0,0,horizon);
 sky.addColorStop(0,alpine?'#8aa9b5':'#6e94a2');sky.addColorStop(.72,alpine?'#c5d0c4':'#b7c1b0');sky.addColorStop(1,alpine?'#d8d7c3':'#deddbd');
 ctx.fillStyle=sky;ctx.fillRect(-20,-20,w+40,h+40);ellipse(w*.76,h*.15,42,42,'rgba(255,238,158,.42)');
 for(let i=0;i<8;i++){const cx=((i*205-travel*.08)%(w+300))-150,cy=65+(i%3)*42;ellipse(cx,cy,48,9,'rgba(245,243,218,.26)',-.03);ellipse(cx+30,cy-8,28,8,'rgba(245,243,218,.22)',-.03)}
 ctx.save();ctx.translate(-headingVal*.15,0);
 polygon([[-w*.2,horizon],[w*.1,horizon-80],[w*.22,horizon-26],[w*.36,horizon-105],[w*.52,horizon-38],[w*.68,horizon-88],[w*.84,horizon-25],[w*1.2,horizon]],alpine?'#89917b':'#657158');ctx.restore();
 ctx.fillStyle=alpine?'#89917b':'#69734d';ctx.fillRect(0,horizon,w,h-horizon);
 ctx.fillStyle=alpine?'#a29d7e':'#8a7d55';ctx.fillRect(0,horizon+18,w,h-horizon);
 polygon([[0,horizon],[w*.28,horizon],[w*.38,h],[0,h]],alpine?'#737f70':'#59694b');polygon([[w*.62,horizon],[w,horizon],[w,h],[w*.74,h]],alpine?'#9c987b':'#7a7952');
 // Terrain and ridge scene is rendered in the same canvas, behind trees and aircraft.
 window.drawMountainIntoWorld?.(ctx,w,h,horizon,{travel,speed,altitude,heading:headingVal,pitch:pitchVal,onGround});
 ctx.save();ctx.beginPath();ctx.rect(0,horizon,w,h-horizon);ctx.clip();
 for(let i=0;i<18;i++){const z=((i/18+travel*.005)%1+1)%1,y=horizon+z*z*(h-horizon),width=40+z*w*.30;polygon([[w*.5-width,y],[w*.5+width,y],[w*.5+width*1.45,h],[w*.5-width*1.45,h]],alpine?'rgba(208,207,184,.22)':(i%2?'rgba(125,111,70,.20)':'rgba(74,105,60,.18)'))}
 if(onGround&&!crashed){const top=horizon+5;polygon([[w*.445,top],[w*.555,top],[w*.69,h],[w*.31,h]],'#9a7d57');polygon([[w*.463,top],[w*.537,top],[w*.62,h],[w*.38,h]],'#c1a77a');for(let i=0;i<14;i++){const z=((i/14+travel*.018)%1+1)%1,y=top+z*z*(h-top),size=2+z*8;ctx.fillStyle='rgba(245,228,171,.92)';ctx.fillRect(w*.5-size*.7,y,size*1.4,size*.65)}}
 // Irregular trees, with large forest/open-land changes supplied by deterministic clusters.
 if(!alpine){for(let i=0;i<68;i++){const lane=i%2===0?-1:1,col=Math.floor(i/2),z=((col/34+travel*.009*(.55+(i%4)*.12))%1+1)%1;const patch=Math.floor((travel*.002+col*.11)%1*12),density=seeded(patch,81);if(density<.24&&seeded(i,92)>.22)continue;const spread=(.05+z*.47)*lane,noise=(seeded(i,12)-.5)*.24,x=w*(.5+spread+noise),y=horizon+z*z*(h-horizon),size=2+z*(5+seeded(i,73)*27);if(x<-size||x>w+size)continue;ctx.fillStyle='#4c3b25';ctx.fillRect(x-size*.07,y-size*.55,size*.14,size*.38);const colors=['#263d2b','#345039','#405a3c','#526744','#62714a'];for(let lobe=0;lobe<3;lobe++){const r=size*(.25+seeded(i,lobe+30)*.22),ox=(seeded(i,lobe+40)-.5)*size*.62;ellipse(x+ox,y-size*(.82+seeded(i,lobe+50)*.5),r,r*(.75+seeded(i,lobe+60)*.4),colors[Math.floor(seeded(i,lobe+70)*colors.length)],seeded(i,lobe+80))}}}
 ctx.restore();
 // Fixed cockpit/propeller foreground stays above the landscape.
 const cw=w*.82,left=(w-cw)/2;polygon([[left,-10],[left+cw,-10],[left+cw*.88,70],[left+cw*.12,70]],'#8f8460');ctx.fillStyle='#3a3325';ctx.fillRect(left+cw*.12,64,cw*.76,9);
 ctx.save();ctx.translate(w/2,h*.71);ctx.rotate(prop);ctx.fillStyle='#30291f';ctx.fillRect(-w*.49,-5,w*.98,10);ctx.fillRect(-5,-w*.44,10,w*.88);ctx.restore();ctx.fillStyle='#463a2a';ctx.beginPath();ctx.arc(w/2,h*.71,18,0,Math.PI*2);ctx.fill();ctx.fillStyle='#4a3d2b';ctx.fillRect(w*.11,h*.63,w*.018,h*.37);ctx.fillRect(w*.872,h*.63,w*.018,h*.37);
 if(crashed){ctx.fillStyle='rgba(90,42,24,.32)';ctx.beginPath();ctx.ellipse(w*.5,h*.86,170,35,0,0,Math.PI*2);ctx.fill();ctx.restore()}
}
function gauge(id,value,min,max,kind){const c=document.getElementById(id);if(!c)return;const x=c.getContext('2d'),w=c.width,h=c.height,r=58;x.clearRect(0,0,w,h);x.save();x.translate(w/2,h/2);x.strokeStyle='#526055';x.lineWidth=5;x.beginPath();x.arc(0,0,r,Math.PI*.72,Math.PI*2.28);x.stroke();for(let i=0;i<=20;i++){const a=Math.PI*.72+i*Math.PI*1.56/20,inner=r-8,outer=r-(i%5===0?14:10);x.beginPath();x.moveTo(Math.cos(a)*inner,-Math.sin(a)*inner);x.lineTo(Math.cos(a)*outer,-Math.sin(a)*outer);x.strokeStyle='#d4cfaa';x.stroke()}const p=Math.max(0,Math.min(1,(value-min)/(max-min))),a=Math.PI*.72+p*Math.PI*1.56;x.strokeStyle=kind==='v'?'#ece9c9':'#ccd08d';x.lineWidth=3;x.beginPath();x.moveTo(-Math.cos(a)*9,Math.sin(a)*9);x.lineTo(Math.cos(a)*44,-Math.sin(a)*44);x.stroke();x.restore()}

let last=performance.now();
function loop(now){
 const dt=Math.min(.05,(now-last)/1000);last=now;
 if(!paused&&!crashed){
  const power=+throttle.value,target=power*1.45;speed+=(target-speed)*dt*(onGround?.55:.20);
  pitchVal+=(+pitch.value-pitchVal)*dt*1.8;
  const targetHeading=+heading.value;let diff=((targetHeading-headingVal+540)%360)-180;headingVal=(headingVal+diff*dt*.8+360)%360;
  travel+=speed*dt*.06;prop+=speed*dt*8;
  if(onGround){vertical=0;altitude=0;if(speed>=TAKEOFF_SPEED&&pitchVal>=6){onGround=false;vertical=100}}
  else{
   if(speed<STALL_SPEED){stalling=true;vertical=-220-Math.min(520,(STALL_SPEED-speed)*22)}else{stalling=false;const lift=Math.min(1,(speed-STALL_SPEED)/30);vertical=pitchVal*38*lift}
   altitude+=vertical*dt/60;
   if(altitude<=0){altitude=0;const runway=window.runwayInfo,aligned=Math.abs(((headingVal+180)%360)-180)<18,safe=runway?.ready&&aligned&&speed>=STALL_SPEED&&speed<=95&&Math.abs(pitchVal)<=5;if(safe){onGround=true;vertical=0;stalling=false;speed=Math.min(speed,52);throttle.value=0;pitch.value=0;pitchVal=0;window.dispatchEvent(new Event('simulatorlanding'))}else crashAircraft('ground')}
   altitude=Math.min(14000,altitude);
  }
  lon+=(speed/3600)*dt*.018*Math.sin(headingVal*Math.PI/180);lat+=(speed/3600)*dt*.018*Math.cos(headingVal*Math.PI/180);
 }
 if(crashed)crashTime+=dt;stallWarning.classList.toggle('visible',stalling&&!crashed);drawWorld();updateUI();requestAnimationFrame(loop)
}
function updateUI(){const h=Math.round(headingVal)%360;document.getElementById('speedValue').textContent=Math.round(speed);document.getElementById('altValue').textContent=Math.round(altitude).toLocaleString('en-US');document.getElementById('vsValue').textContent=(vertical>=0?'+':'')+Math.round(vertical);document.getElementById('speedHud').textContent=Math.round(speed);document.getElementById('altHud').textContent=Math.round(altitude).toLocaleString('en-US');document.getElementById('headingTicker').textContent=String(h).padStart(3,'0')+'°';document.getElementById('flightHeading').textContent=String(h).padStart(3,'0')+'°';document.getElementById('headingOut').textContent=heading.value+'°';document.getElementById('pitchOut').textContent=(pitch.value>0?'+':'')+pitch.value+'°';document.getElementById('throttleOut').textContent=throttle.value+'%';document.getElementById('coordinates').innerHTML=Math.abs(lat).toFixed(2)+'° '+(lat>=0?'N':'S')+'&nbsp;&nbsp; '+Math.abs(lon).toFixed(2)+'° '+(lon>=0?'E':'W');gauge('speedGauge',speed,0,180);gauge('altGauge',altitude,0,14000);gauge('vsGauge',Math.abs(vertical),0,2000,'v');document.getElementById('utc').textContent=new Date().toISOString().slice(11,19)}
throttle.addEventListener('input',()=>document.getElementById('throttleOut').textContent=throttle.value+'%');pitch.addEventListener('input',()=>document.getElementById('pitchOut').textContent=(pitch.value>0?'+':'')+pitch.value+'°');heading.addEventListener('input',()=>document.getElementById('headingOut').textContent=heading.value+'°');
document.getElementById('pauseBtn').addEventListener('click',()=>{paused=!paused;document.getElementById('pauseIcon').textContent=paused?'▶':'Ⅱ';document.querySelector('footer span').innerHTML=paused?'◆ VLIEGTUIG PAUZE':'<i class="status-dot"></i> VLIEGTUIG AKTIEF'});
crashPanel.querySelector('#restartBtn').addEventListener('click',()=>{crashed=false;crashTime=0;onGround=true;altitude=0;speed=0;pitchVal=0;pitch.value=0;throttle.value=0;vertical=0;stalling=false;crashPanel.classList.remove('visible');stallWarning.classList.remove('visible');window.landscapeBiome='valley';window.dispatchEvent(new Event('simulatorrestart'))});
requestAnimationFrame(loop);
