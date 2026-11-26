(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('scene'), ctx = canvas.getContext('2d');
  const controls = { throttle: $('throttle'), elevator: $('elevator'), aileron: $('aileron'), rudder: $('rudder') };
  const outputs = { throttle: 'throttleOut', elevator: 'elevatorOut', aileron: 'aileronOut', rudder: 'rudderOut' };
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const rad = n => n * Math.PI / 180;
  const state = { speed: 0, altitude: 0, heading: 0, pitch: 0, bank: 0, vertical: 0, travel: 0, fuel: 100, onGround: true, landed: false, paused: false, crashed: false, view: 'cockpit', prop: 0, time: 0 };
  let width = 1, height = 1, dpr = 1, last = performance.now(), audio, oscillator, engineGain;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, rect.width); height = Math.max(1, rect.height);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener('resize', resize); resize();
  function polygon(points, color) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]);
    points.slice(1).forEach(point => ctx.lineTo(point[0], point[1])); ctx.closePath(); ctx.fill();
  }
  function oval(x, y, rx, ry, color) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  }
  function drawWorld() {
    const w = width, h = height;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    const horizon = h * (.47 + clamp(state.pitch * .0025, -.11, .11) - clamp(state.altitude / 50000, 0, .1));
    ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(-rad(state.bank) * .34); ctx.translate(-w / 2, -h / 2);
    const sky = ctx.createLinearGradient(0, 0, 0, horizon + h * .12);
    sky.addColorStop(0, '#78a3b2'); sky.addColorStop(.7, '#c2d0c3'); sky.addColorStop(1, '#e5d7b4');
    ctx.fillStyle = sky; ctx.fillRect(-w, -h, w * 3, h * 3); oval(w * .77, h * .18, 30, 30, 'rgba(255,235,172,.48)');
    for (let i = 0; i < 8; i++) {
      const x = ((i * w * .2 - state.travel * .025 + w * 2) % (w * 1.35)) - w * .15;
      const y = h * (.12 + (i % 3) * .08), r = w * .04;
      oval(x, y, r, r * .19, 'rgba(246,244,221,.4)'); oval(x-r*.3,y-5,r*.43,r*.22,'rgba(246,244,221,.4)'); oval(x+r*.2,y-7,r*.42,r*.26,'rgba(246,244,221,.4)');
    }
    polygon([[-w*.1,horizon+16],[w*.1,horizon-25],[w*.26,horizon+6],[w*.43,horizon-38],[w*.59,horizon+8],[w*.78,horizon-21],[w*1.1,horizon+20],[w*1.1,h*2],[-w*.1,h*2]], '#75836a');
    ctx.fillStyle = '#91a071'; ctx.fillRect(-w, horizon + 22, w * 3, h * 2);
    ctx.save(); ctx.beginPath(); ctx.rect(-w, horizon+22, w*3, h*2); ctx.clip();
    for (let i=0;i<18;i++) {
      const z=((i/18+state.travel*.0008)%1+1)%1, y=horizon+28+z*z*h*1.45, half=w*(.025+z*.68), x=w/2+Math.sin(i*19)*w*.12+state.heading*w*.0009;
      polygon([[x-half,y],[x+half,y],[x+half*1.25,y+h*.17],[x-half*1.25,y+h*.17]],i%2?'#82936c':'#9a9d70');
    }
    const dx=Math.sin(rad(state.heading))*w*.62, top=horizon+h*.035+Math.min(state.altitude/9000,.16)*h, bottom=h*1.35;
    if (Math.abs(state.heading)<70 || state.onGround) {
      polygon([[w/2+dx-w*.008,top],[w/2+dx+w*.008,top],[w/2+dx+w*.24,bottom],[w/2+dx-w*.24,bottom]],'#555b51');
      polygon([[w/2+dx-w*.005,top],[w/2+dx+w*.005,top],[w/2+dx+w*.19,bottom],[w/2+dx-w*.19,bottom]],'#77796c');
      for(let i=0;i<10;i++){const t=(i/10+state.travel*.004)%1,y=top+(bottom-top)*t*t;ctx.fillStyle='#e7e1c9';ctx.fillRect(w/2+dx-Math.max(1,t*w*.006),y,Math.max(2,t*w*.012),Math.max(2,t*h*.018));}
    }
    for(let i=0;i<38;i++){const z=((i/38+state.travel*.0014)%1+1)%1,side=i%2?-1:1,x=w/2+side*w*(.1+((i*37)%100)/130)*(.2+z),y=horizon+20+z*z*h*1.2;oval(x,y,2+z*8,2+z*12,i%3?'#405d43':'#526744');}
    ctx.restore(); ctx.restore();
    if (state.view === 'cockpit') drawCockpit(w,h); else drawExternalPlane(w,h);
    if (state.crashed) { ctx.fillStyle='rgba(44,23,16,.22)';ctx.fillRect(0,0,w,h); }
  }
  function drawCockpit(w,h) {
    ctx.save();ctx.translate(w/2,h*.64);ctx.rotate(rad(clamp(state.bank,-35,35)*.35));
    polygon([[-w*.52,-h*.20],[-w*.43,-h*.27],[w*.43,-h*.27],[w*.52,-h*.20],[w*.48,-h*.16],[-w*.48,-h*.16]],'#a75631');ctx.fillStyle='#d39350';ctx.fillRect(-w*.47,-h*.187,w*.94,3);
    ctx.strokeStyle='#4c3a2a';ctx.lineWidth=3;[-w*.28,w*.28].forEach(x=>{ctx.beginPath();ctx.moveTo(x,-h*.19);ctx.lineTo(x*.72,h*.04);ctx.stroke();});
    ctx.save();ctx.translate(0,h*.06);ctx.rotate(state.prop);ctx.fillStyle='rgba(36,34,27,.45)';ctx.fillRect(-3,-h*.24,6,h*.48);ctx.fillRect(-w*.12,-3,w*.24,6);ctx.restore();
    oval(0,h*.06,w*.045,h*.045,'#58432d');polygon([[-w*.13,h*.06],[w*.13,h*.06],[w*.21,h*.48],[-w*.21,h*.48]],'#4a3928');polygon([[-w*.105,h*.08],[w*.105,h*.08],[w*.16,h*.44],[-w*.16,h*.44]],'#795638');
    ctx.strokeStyle='#342a20';ctx.lineWidth=Math.max(8,w*.025);ctx.beginPath();ctx.ellipse(0,h*.31,w*.16,h*.13,0,Math.PI,0);ctx.stroke();ctx.restore();
  }
  function drawExternalPlane(w,h) {
    ctx.save();ctx.translate(w*.5,h*.59);ctx.rotate(rad(clamp(state.bank,-45,45)*.55));
    polygon([[-w*.38,-h*.08],[-w*.27,-h*.13],[w*.36,-h*.13],[w*.4,-h*.08],[w*.34,-h*.045],[-w*.36,-h*.045]],'#ba633a');
    polygon([[-w*.33,h*.02],[-w*.24,-h*.02],[w*.32,-h*.02],[w*.36,h*.02],[w*.29,h*.055],[-w*.31,h*.055]],'#d18a4d');
    ctx.strokeStyle='#503c2a';ctx.lineWidth=3;[-w*.18,w*.19].forEach(x=>{ctx.beginPath();ctx.moveTo(x,-h*.08);ctx.lineTo(x*.75,h*.02);ctx.stroke();});
    polygon([[-w*.38,-h*.02],[-w*.48,-h*.1],[-w*.45,h*.03],[-w*.39,h*.04]],'#9b5736');oval(w*.04,0,w*.24,h*.035,'#483a29');oval(w*.15,-h*.01,w*.075,h*.065,'#a95832');
    ctx.save();ctx.translate(w*.25,0);ctx.rotate(state.prop);ctx.fillStyle='#322c24';ctx.fillRect(-2,-h*.14,4,h*.28);ctx.restore();oval(-w*.2,h*.055,w*.028,h*.028,'#302d25');oval(w*.13,h*.052,w*.028,h*.028,'#302d25');ctx.restore();
  }
  function drawDial(id,value,max,red=false) {
    const c=$(id),g=c.getContext('2d'),r=48;g.clearRect(0,0,c.width,c.height);g.save();g.translate(60,65);g.beginPath();g.arc(0,0,r,Math.PI*.78,Math.PI*2.22);g.strokeStyle='#66715f';g.lineWidth=5;g.stroke();
    for(let i=0;i<=10;i++){const a=Math.PI*(.78+1.44*i/10);g.beginPath();g.moveTo(Math.cos(a)*(r-5),Math.sin(a)*(r-5));g.lineTo(Math.cos(a)*(r-(i%2?1:10)),Math.sin(a)*(r-(i%2?1:10)));g.strokeStyle=red&&i>8?'#d8755b':'#d5d0b4';g.lineWidth=2;g.stroke();}
    const a=Math.PI*(.78+1.44*clamp(value/max,0,1));g.beginPath();g.moveTo(0,7);g.lineTo(Math.cos(a)*(r-13),Math.sin(a)*(r-13));g.strokeStyle='#d98c51';g.lineWidth=2;g.stroke();g.restore();
  }
  function drawAttitude(){const c=$('attitude'),g=c.getContext('2d'),z=c.width;g.clearRect(0,0,z,z);g.save();g.beginPath();g.arc(z/2,z/2,z*.47,0,Math.PI*2);g.clip();g.translate(z/2,z/2);g.rotate(-rad(state.bank));g.translate(0,clamp(state.pitch,-25,25)*1.2);g.fillStyle='#668b99';g.fillRect(-z,-z,z*2,z);g.fillStyle='#927e59';g.fillRect(-z,0,z*2,z);g.strokeStyle='#f2ebd1';g.beginPath();g.moveTo(-z,0);g.lineTo(z,0);g.stroke();g.restore();g.strokeStyle='#d8d1b3';g.beginPath();g.arc(z/2,z/2,z*.47,0,Math.PI*2);g.stroke();}
  function update(){
    const feet=Math.round(state.altitude*3.28084),climb=Math.round(state.vertical*196.85),speed=Math.round(state.speed);
    $('speedValue').textContent=speed;$('altValue').textContent=feet.toLocaleString('nl-NL');$('hudSpeed').textContent=speed;$('hudAltitude').textContent=feet.toLocaleString('nl-NL');$('hudClimb').textContent=(climb>0?'+':'')+climb;
    $('headingReadout').textContent=String(Math.round(state.heading)%360).padStart(3,'0')+'°';$('rpmValue').textContent=Math.round(700+Number(controls.throttle.value)*20).toLocaleString('nl-NL');$('rpmMeter').style.width=controls.throttle.value+'%';$('fuelValue').textContent=Math.ceil(state.fuel);$('fuelMeter').style.width=state.fuel+'%';
    $('statusText').textContent=state.crashed?'VLUCHT BEËINDIGD':state.onGround?(state.landed?(speed>5?'LANDING · UITROLLEN':'LANDING · KLAAR OM OPNIEUW TE STARTEN'):speed>5?'TAXI · STARTBAAN':Number(controls.throttle.value)>0?'MOTOR DRAAIT · OP DE STARTBAAN':'MOTOR UIT · OP DE STARTBAAN'):'IN VLUCHT · VISUEEL WEER';$('statusDot').style.background=state.crashed?'#e46d54':state.onGround?'#e4a95c':'#c8d880';
    drawDial('speedDial',state.speed,120,true);drawDial('altDial',feet,10000);drawAttitude();
    if(!state.crashed){$('message').textContent=state.onGround?(state.landed?(speed>5?'UITROLLEN · REM AF, GEEF DAN WEER GAS':'LANDING GESLAAGD · GEEF GAS OM OPNIEUW OP TE STIJGEN'):'STARTBAAN · GEEF GAS EN TREK LICHT AAN DE STICK'):state.speed<35?'WAARSCHUWING · TE WEINIG SNELHEID — NEUS OMLAAG':state.altitude<35?'NADERING · LIJN OP DE BAAN UIT EN MAAK EEN ZACHTE LANDING':'IN VLUCHT · HOUD DE NEUS LICHT OMHOOG EN DE VLEUGELS WATERPAS';}
  }
  function sync(k){const n=Number(controls[k].value),pct=k==='throttle'?n:(n+100)/2;$(outputs[k]).textContent=(n>0&&k!=='throttle'?'+':'')+n+'%';controls[k].style.setProperty('--fill',pct+'%');}
  Object.keys(controls).forEach(k=>{sync(k);controls[k].addEventListener('input',()=>sync(k));});
  function crash(title,text){if(state.crashed)return;state.crashed=true;state.paused=true;$('crashTitle').textContent=title;$('crashText').textContent=text;$('crashOverlay').hidden=false;$('pausedOverlay').hidden=true;update();playImpact();}
  function reset(){
    // Keep the remaining fuel after a crash; a manual reset during normal play gives a fresh tank.
    const fuelAtRestart = state.crashed ? state.fuel : 100;
    Object.assign(state,{speed:0,altitude:0,heading:0,pitch:0,bank:0,vertical:0,travel:0,fuel:fuelAtRestart,onGround:true,landed:false,paused:false,crashed:false,prop:0,time:0});
    Object.entries(controls).forEach(([k,input])=>{input.value='0';sync(k);});
    $('crashOverlay').hidden=true;$('pausedOverlay').hidden=true;$('pauseButton').textContent='Ⅱ';last=performance.now();update();
  }
  function step(dt){
    if(state.paused||state.crashed)return;
    const throttle=Number(controls.throttle.value)/100,elevator=Number(controls.elevator.value)/100,aileron=Number(controls.aileron.value)/100,rudder=Number(controls.rudder.value)/100;
    state.time+=dt;
    const fuelUsedPerSecond=throttle>0?.045+throttle*.12:.008;
    state.fuel=Math.max(0,state.fuel-fuelUsedPerSecond*dt);
    if(state.fuel<=0){controls.throttle.value='0';sync('throttle');crash('BRANDSTOF OP','De motor is afgeslagen: de brandstof is op.');return;}
    state.speed=clamp(state.speed+(throttle*8.3-.00043*state.speed*state.speed-state.speed*.025)*dt,0,120);
    state.prop+=dt*(5+state.speed*.18);state.travel+=state.speed*dt;
    state.bank+=(aileron*48-state.bank)*Math.min(1,dt*1.9);
    state.heading=(state.heading+(Math.sin(rad(state.bank))*(state.speed/38)*24+rudder*(state.onGround?9:5))*dt+360)%360;
    state.pitch+=(elevator*17-state.pitch)*Math.min(1,dt*1.6);
    if(state.onGround){
      state.altitude=0;state.vertical=0;
      if(state.landed&&throttle>.08)state.landed=false;
      if(state.landed&&throttle<=.08){state.pitch+=(0-state.pitch)*Math.min(1,dt*2);state.speed=Math.max(0,state.speed-1.1*dt);}
      if(throttle>=.65&&state.speed>=39&&state.pitch>2.5){state.onGround=false;state.landed=false;state.vertical=1.2;}
    }else{
      const stall=34,lift=clamp((state.speed-stall)/24,0,1.15);
      const targetVertical=(state.pitch-2.2)*.34*lift-(state.speed<stall?(stall-state.speed)*.65:0);
      state.vertical+=(targetVertical-state.vertical)*Math.min(1,dt*(state.speed<stall?.9:1.3));
      state.vertical+=Math.sin(state.time*1.4)*.025;state.altitude+=state.vertical*dt;
      if(state.speed<26&&state.altitude<70){crash('OVERTREK','De tweedekker verloor lift. Houd boven de overtreksnelheid voldoende snelheid.');return;}
      if(state.altitude<=0){
        const heading=Math.abs(((state.heading+180)%360)-180),aligned=heading<22;
        const safe=aligned&&state.speed>=30&&state.speed<=72&&state.pitch>-8&&state.pitch<16&&state.vertical>-5.5;
        if(safe){state.onGround=true;state.altitude=0;state.vertical=0;state.speed=Math.min(state.speed,42);state.landed=true;state.pitch=clamp(state.pitch,0,3);controls.throttle.value='0';sync('throttle');controls.elevator.value='0';sync('elevator');}
        else{crash('LANDING MISLUKT','Raak de baan recht aan, met beheerste snelheid en een zachte daalvlucht.');return;}
      }
      state.altitude=Math.min(state.altitude,4500);
    }
    update();
  }
  const held=new Set();
  function keyDown(event){if(['INPUT','BUTTON'].includes(document.activeElement?.tagName))return;const key=event.key.toLowerCase();if(['w','s','a','d','q','e',' ','arrowup','arrowdown','arrowleft','arrowright'].includes(key)||event.key==='Shift'||event.key==='Control')event.preventDefault();if(event.repeat&&['v',' '].includes(key))return;held.add(key);if(key==='v')toggleView();if(key===' ')togglePause();if(event.key==='Shift'){controls.throttle.value=String(clamp(+controls.throttle.value+3,0,100));sync('throttle');}if(event.key==='Control'){controls.throttle.value=String(clamp(+controls.throttle.value-3,0,100));sync('throttle');}}
  addEventListener('keydown',keyDown);addEventListener('keyup',event=>held.delete(event.key.toLowerCase()));addEventListener('blur',()=>held.clear());
  function applyKeys(){for(const key of held){if(key==='w'||key==='arrowup')controls.elevator.value=String(clamp(+controls.elevator.value+2.5,-100,100));if(key==='s'||key==='arrowdown')controls.elevator.value=String(clamp(+controls.elevator.value-2.5,-100,100));if(key==='a'||key==='arrowleft')controls.aileron.value=String(clamp(+controls.aileron.value-3,-100,100));if(key==='d'||key==='arrowright')controls.aileron.value=String(clamp(+controls.aileron.value+3,-100,100));if(key==='q')controls.rudder.value=String(clamp(+controls.rudder.value-4,-100,100));if(key==='e')controls.rudder.value=String(clamp(+controls.rudder.value+4,-100,100));}Object.keys(controls).forEach(sync);}
  function toggleView(){state.view=state.view==='cockpit'?'external':'cockpit';$('viewButton').innerHTML=state.view==='cockpit'?'◉ <span>BUITENZICHT</span>':'◉ <span>COCKPIT</span>';$('viewTag').textContent=state.view==='cockpit'?'COCKPIT · OPEN CABINE':'BUITENBEELD · LUCHTVAARTUIG';}
  function togglePause(){if(state.crashed)return;state.paused=!state.paused;$('pausedOverlay').hidden=!state.paused;$('pauseButton').textContent=state.paused?'▶':'Ⅱ';}
  async function enableSound(){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;if(!audio){audio=new AC();oscillator=audio.createOscillator();engineGain=audio.createGain();const filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=520;oscillator.type='sawtooth';oscillator.frequency.value=75;engineGain.gain.value=0;oscillator.connect(filter).connect(engineGain).connect(audio.destination);oscillator.start();}if(audio.state==='suspended')await audio.resume();$('soundButton').setAttribute('aria-pressed','true');$('soundButton').innerHTML='♫ <span>GELUID AAN</span>';}
  function playImpact(){if(!audio||audio.state!=='running')return;const osc=audio.createOscillator(),gain=audio.createGain();osc.type='triangle';osc.frequency.setValueAtTime(110,audio.currentTime);osc.frequency.exponentialRampToValueAtTime(38,audio.currentTime+.45);gain.gain.setValueAtTime(.3,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.5);osc.connect(gain).connect(audio.destination);osc.start();osc.stop(audio.currentTime+.5);}
  $('soundButton').addEventListener('click',async()=>{if(audio?.state==='running'){await audio.suspend();$('soundButton').setAttribute('aria-pressed','false');$('soundButton').innerHTML='♫ <span>GELUID</span>';}else await enableSound();});
  setInterval(()=>{if(audio?.state==='running'){oscillator.frequency.setTargetAtTime(65+Number(controls.throttle.value)*1.25,audio.currentTime,.12);engineGain.gain.setTargetAtTime(state.crashed?0:.012+Number(controls.throttle.value)*.00035,audio.currentTime,.15);}},100);
  $('viewButton').addEventListener('click',toggleView);$('pauseButton').addEventListener('click',togglePause);$('restartButton').addEventListener('click',reset);$('resetButton').addEventListener('click',reset);
  $('helpButton').addEventListener('click',()=>{$('helpPopover').hidden=!$('helpPopover').hidden;$('helpButton').setAttribute('aria-expanded',String(!$('helpPopover').hidden));});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&!state.paused&&!state.crashed)togglePause();});
  function frame(now){const dt=Math.min(.04,Math.max(0,(now-last)/1000));last=now;if(!state.paused&&!state.crashed){applyKeys();step(dt);}drawWorld();requestAnimationFrame(frame);}
  update();requestAnimationFrame(frame);
})();
