(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('scene'), ctx = canvas.getContext('2d');
  const controls = { throttle: $('throttle'), elevator: $('elevator'), aileron: $('aileron'), rudder: $('rudder') };
  const out = { throttle: 'throttleOut', elevator: 'elevatorOut', aileron: 'aileronOut', rudder: 'rudderOut' };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rad = d => d * Math.PI / 180;
  const s = { speed: 0, altitude: 0, heading: 0, pitch: 0, bank: 0, vertical: 0, travel: 0, fuel: 100, onGround: true, paused: false, crashed: false, view: 'cockpit', prop: 0, time: 0, landed: false };
  let w = 1, h = 1, dpr = 1, last = performance.now(), audio, oscillator, engineGain;
  function resize() { const r = canvas.getBoundingClientRect(); dpr = Math.min(devicePixelRatio || 1, 2); w = Math.max(1, r.width); h = Math.max(1, r.height); canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  addEventListener('resize', resize); resize();
  function poly(points, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(...points[0]); points.slice(1).forEach(p => ctx.lineTo(...p)); ctx.closePath(); ctx.fill(); }
  function oval(x, y, rx, ry, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    const horizon = h * (.47 + clamp(s.pitch * .0025, -.11, .11) - clamp(s.altitude / 50000, 0, .1));
    ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(-rad(s.bank) * .34); ctx.translate(-w / 2, -h / 2);
    const sky = ctx.createLinearGradient(0, 0, 0, horizon + h * .12); sky.addColorStop(0, '#78a3b2'); sky.addColorStop(.7, '#c2d0c3'); sky.addColorStop(1, '#e5d7b4'); ctx.fillStyle = sky; ctx.fillRect(-w, -h, w * 3, h * 3);
    oval(w * .77, h * .18, 30, 30, 'rgba(255,235,172,.48)');
    for (let i = 0; i < 8; i++) { const x = ((i * w * .2 - s.travel * .025 + w * 2) % (w * 1.35)) - w * .15, y = h * (.12 + i % 3 * .08), r = w * .04; oval(x, y, r, r * .19, 'rgba(246,244,221,.4)'); oval(x - r * .3, y - 5, r * .43, r * .22, 'rgba(246,244,221,.4)'); oval(x + r * .2, y - 7, r * .42, r * .26, 'rgba(246,244,221,.4)'); }
    poly([[-w * .1, horizon + 16], [w * .1, horizon - 25], [w * .26, horizon + 6], [w * .43, horizon - 38], [w * .59, horizon + 8], [w * .78, horizon - 21], [w * 1.1, horizon + 20], [w * 1.1, h * 2], [-w * .1, h * 2]], '#75836a');
    ctx.fillStyle = '#91a071'; ctx.fillRect(-w, horizon + 22, w * 3, h * 2);
    ctx.save(); ctx.beginPath(); ctx.rect(-w, horizon + 22, w * 3, h * 2); ctx.clip();
    for (let i = 0; i < 18; i++) { const z = ((i / 18 + s.travel * .0008) % 1 + 1) % 1, y = horizon + 28 + z * z * h * 1.45, half = w * (.025 + z * .68), x = w / 2 + Math.sin(i * 19) * w * .12 + s.heading * w * .0009; poly([[x - half, y], [x + half, y], [x + half * 1.25, y + h * .17], [x - half * 1.25, y + h * .17]], i % 2 ? '#82936c' : '#9a9d70'); }
    const dx = Math.sin(rad(s.heading)) * w * .62, top = horizon + h * .035 + Math.min(s.altitude / 9000, .16) * h, bottom = h * 1.35;
    if (Math.abs(s.heading) < 70 || s.onGround) {
      poly([[w / 2 + dx - w * .008, top], [w / 2 + dx + w * .008, top], [w / 2 + dx + w * .24, bottom], [w / 2 + dx - w * .24, bottom]], '#555b51');
      poly([[w / 2 + dx - w * .005, top], [w / 2 + dx + w * .005, top], [w / 2 + dx + w * .19, bottom], [w / 2 + dx - w * .19, bottom]], '#77796c');
      for (let i = 0; i < 10; i++) { const t = (i / 10 + s.travel * .004) % 1, y = top + (bottom - top) * t * t; ctx.fillStyle = '#e7e1c9'; ctx.fillRect(w / 2 + dx - Math.max(1, t * w * .006), y, Math.max(2, t * w * .012), Math.max(2, t * h * .018)); }
    }
    for (let i = 0; i < 38; i++) { const z = ((i / 38 + s.travel * .0014) % 1 + 1) % 1, side = i % 2 ? -1 : 1, x = w / 2 + side * w * (.1 + ((i * 37) % 100) / 130) * (.2 + z), y = horizon + 20 + z * z * h * 1.2; oval(x, y, 2 + z * 8, 2 + z * 12, i % 3 ? '#405d43' : '#526744'); }
    ctx.restore(); ctx.restore();
    if (s.view === 'cockpit') {
      ctx.save(); ctx.translate(w / 2, h * .64); ctx.rotate(rad(clamp(s.bank, -35, 35) * .35));
      poly([[-w*.52,-h*.20],[-w*.43,-h*.27],[w*.43,-h*.27],[w*.52,-h*.20],[w*.48,-h*.16],[-w*.48,-h*.16]], '#a75631'); ctx.fillStyle = '#d39350'; ctx.fillRect(-w*.47,-h*.187,w*.94,3);
      ctx.strokeStyle = '#4c3a2a'; ctx.lineWidth = 3; [-w*.28,w*.28].forEach(x=>{ctx.beginPath();ctx.moveTo(x,-h*.19);ctx.lineTo(x*.72,h*.04);ctx.stroke();});
      ctx.save();ctx.translate(0,h*.06);ctx.rotate(s.prop);ctx.fillStyle='rgba(36,34,27,.45)';ctx.fillRect(-3,-h*.24,6,h*.48);ctx.fillRect(-w*.12,-3,w*.24,6);ctx.restore();
      oval(0,h*.06,w*.045,h*.045,'#58432d'); poly([[-w*.13,h*.06],[w*.13,h*.06],[w*.21,h*.48],[-w*.21,h*.48]],'#4a3928'); poly([[-w*.105,h*.08],[w*.105,h*.08],[w*.16,h*.44],[-w*.16,h*.44]],'#795638');
      ctx.strokeStyle='#342a20';ctx.lineWidth=Math.max(8,w*.025);ctx.beginPath();ctx.ellipse(0,h*.31,w*.16,h*.13,0,Math.PI,0);ctx.stroke();ctx.restore();
    } else {
      ctx.save();ctx.translate(w*.5,h*.59);ctx.rotate(rad(clamp(s.bank,-45,45)*.55));
      poly([[-w*.38,-h*.08],[-w*.27,-h*.13],[w*.36,-h*.13],[w*.4,-h*.08],[w*.34,-h*.045],[-w*.36,-h*.045]],'#ba633a');poly([[-w*.33,h*.02],[-w*.24,-h*.02],[w*.32,-h*.02],[w*.36,h*.02],[w*.29,h*.055],[-w*.31,h*.055]],'#d18a4d');
      ctx.strokeStyle='#503c2a';ctx.lineWidth=3;[-w*.18,w*.19].forEach(x=>{ctx.beginPath();ctx.moveTo(x,-h*.08);ctx.lineTo(x*.75,h*.02);ctx.stroke();});poly([[-w*.38,-h*.02],[-w*.48,-h*.1],[-w*.45,h*.03],[-w*.39,h*.04]],'#9b5736');oval(w*.04,0,w*.24,h*.035,'#483a29');oval(w*.15,-h*.01,w*.075,h*.065,'#a95832');ctx.save();ctx.translate(w*.25,0);ctx.rotate(s.prop);ctx.fillStyle='#322c24';ctx.fillRect(-2,-h*.14,4,h*.28);ctx.restore();oval(-w*.2,h*.055,w*.028,h*.028,'#302d25');oval(w*.13,h*.052,w*.028,h*.028,'#302d25');ctx.restore();
    }
  }
  function dial(id, value, max, red = false) { const c = $(id), g = c.getContext('2d'), r = 48; g.clearRect(0,0,c.width,c.height); g.save();g.translate(60,65);g.beginPath();g.arc(0,0,r,Math.PI*.78,Math.PI*2.22);g.strokeStyle='#66715f';g.lineWidth=5;g.stroke();for(let i=0;i<=10;i++){let a=Math.PI*(.78+1.44*i/10);g.beginPath();g.moveTo(Math.cos(a)*(r-5),Math.sin(a)*(r-5));g.lineTo(Math.cos(a)*(r-(i%2?1:10)),Math.sin(a)*(r-(i%2?1:10)));g.strokeStyle=red&&i>8?'#d8755b':'#d5d0b4';g.lineWidth=2;g.stroke();}let a=Math.PI*(.78+1.44*clamp(value/max,0,1));g.beginPath();g.moveTo(0,7);g.lineTo(Math.cos(a)*(r-13),Math.sin(a)*(r-13));g.strokeStyle='#d98c51';g.lineWidth=2;g.stroke();g.restore(); }
  function attitude() { const c=$('attitude'),g=c.getContext('2d'),z=c.width;g.clearRect(0,0,z,z);g.save();g.beginPath();g.arc(z/2,z/2,z*.47,0,Math.PI*2);g.clip();g.translate(z/2,z/2);g.rotate(-rad(s.bank));g.translate(0,clamp(s.pitch,-25,25)*1.2);g.fillStyle='#668b99';g.fillRect(-z,-z,z*2,z);g.fillStyle='#927e59';g.fillRect(-z,0,z*2,z);g.strokeStyle='#f2ebd1';g.beginPath();g.moveTo(-z,0);g.lineTo(z,0);g.stroke();g.restore();g.strokeStyle='#d8d1b3';g.beginPath();g.arc(z/2,z/2,z*.47,0,Math.PI*2);g.stroke(); }
  function update() {
    const feet=Math.round(s.altitude*3.28084), climb=Math.round(s.vertical*196.85), sp=Math.round(s.speed);
    $('speedValue').textContent=sp;$('altValue').textContent=feet.toLocaleString('nl-NL');$('hudSpeed').textContent=sp;$('hudAltitude').textContent=feet.toLocaleString('nl-NL');$('hudClimb').textContent=(climb>0?'+':'')+climb;
    $('headingReadout').textContent=String(Math.round(s.heading)%360).padStart(3,'0')+'°';$('rpmValue').textContent=Math.round(700+Number(controls.throttle.value)*20).toLocaleString('nl-NL');$('rpmMeter').style.width=controls.throttle.value+'%';$('fuelValue').textContent=Math.round(s.fuel);$('fuelMeter').style.width=s.fuel+'%';
    $('statusText').textContent=s.crashed?'VLUCHT BEËINDIGD':s.onGround?(s.landed?(sp>5?'LANDING · UITROLLEN':'LANDING · KLAAR OM OPNIEUW TE STARTEN'):sp>5?'TAXI · STARTBAAN':Number(controls.throttle.value)>0?'MOTOR DRAAIT · OP DE STARTBAAN':'MOTOR UIT · OP DE STARTBAAN'):'IN VLUCHT · VISUEEL WEER';$('statusDot').style.background=s.crashed?'#e46d54':s.onGround?'#e4a95c':'#c8d880';
    dial('speedDial',s.speed,120,true);dial('altDial',feet,10000);attitude();
    if(!s.crashed){$('message').textContent=s.onGround?(s.landed?(sp>5?'UITROLLEN · REM AF, GEEF DAN WEER GAS':'LANDING GESLAAGD · GEEF GAS OM OPNIEUW OP TE STIJGEN'):'STARTBAAN · GEEF GAS EN TREK LICHT AAN DE STICK'):s.speed<35?'WAARSCHUWING · TE WEINIG SNELHEID — NEUS OMLAAG':s.altitude<35?'NADERING · LIJN OP DE BAAN UIT EN MAAK EEN ZACHTE LANDING':'IN VLUCHT · HOUD DE NEUS LICHT OMHOOG EN DE VLEUGELS WATERPAS';}
  }
  function crash(title,text){s.crashed=true;s.paused=true;$('crashTitle').textContent=title;$('crashText').textContent=text;$('crashOverlay').hidden=false;$('pausedOverlay').hidden=true;update();}
  function reset(){Object.assign(s,{speed:0,altitude:0,heading:0,pitch:0,bank:0,vertical:0,travel:0,fuel:100,onGround:true,paused:false,crashed:false,landed:false,prop:0});Object.entries(controls).forEach(([k,v])=>{v.value='0';sync(k);});$('crashOverlay').hidden=true;$('pausedOverlay').hidden=true;$('pauseButton').textContent='Ⅱ';last=performance.now();update();}
  function sync(k){const n=Number(controls[k].value),pct=k==='throttle'?n:(n+100)/2;$(out[k]).textContent=(n>0&&k!=='throttle'?'+':'')+n+'%';controls[k].style.setProperty('--fill',pct+'%');}
  Object.keys(controls).forEach(k=>{sync(k);controls[k].addEventListener('input',()=>sync(k));});
  function step(dt){if(s.paused||s.crashed)return;const throttle=Number(controls.throttle.value)/100,elev=Number(controls.elevator.value)/100,ail=Number(controls.aileron.value)/100,rud=Number(controls.rudder.value)/100;s.time+=dt;
    s.speed=clamp(s.speed+(throttle*8.3-.00043*s.speed*s.speed-s.speed*.025)*dt,0,120);s.fuel=Math.max(0,s.fuel-throttle*.00125*dt);if(!s.fuel){controls.throttle.value=0;sync('throttle');}s.prop+=dt*(5+s.speed*.18);s.travel+=s.speed*dt;
    s.bank+=(ail*48-s.bank)*Math.min(1,dt*1.9);s.heading=(s.heading+(Math.sin(rad(s.bank))*(s.speed/38)*24+rud*(s.onGround?9:5))*dt+360)%360;s.pitch+=(elev*17-s.pitch)*Math.min(1,dt*1.6);
    if(s.onGround){s.altitude=0;s.vertical=0;
      // Landed aircraft may roll to a stop, then accelerate again and take off normally.
      if(s.landed){
        if(throttle>.08&&s.speed>5){s.landed=false;}
        else{s.pitch+=(0-s.pitch)*Math.min(1,dt*2);if(throttle<.02)s.speed=Math.max(0,s.speed-(1.1)*dt);}
      }
      if(!s.landed&&throttle>=.72&&s.speed>43&&s.pitch>4){s.onGround=false;s.vertical=1.5;}
    }else{
      const stall=34,lift=clamp((s.speed-stall)/24,0,1.15),target=(s.pitch-2.2)*.34*lift-(s.speed<stall?(stall-s.speed)*.65:0);s.vertical+=(target-s.vertical)*Math.min(1,dt*(s.speed<stall?.9:1.3));s.vertical+=Math.sin(s.time*1.4)*.025;s.altitude+=s.vertical*dt;
      if(s.speed<26&&s.altitude<70){crash('OVERTREK','De tweedekker verloor lift. Houd boven de overtreksnelheid voldoende snelheid.');return;}
      if(s.altitude<=0){
        const heading=Math.abs(((s.heading+180)%360)-180),aligned=heading<22;
        const safe=aligned&&s.speed>=30&&s.speed<=72&&s.pitch>-8&&s.pitch<16&&s.vertical>-5.5;
        if(safe){s.onGround=true;s.altitude=0;s.vertical=0;s.speed=Math.min(s.speed,42);s.landed=true;s.pitch=clamp(s.pitch,0,3);controls.throttle.value=0;sync('throttle');controls.elevator.value=0;sync('elevator');}
        else{crash('LANDING MISLUKT','Raak de baan recht aan, met beheerste snelheid en een zachte daalvlucht.');return;}
      }s.altitude=Math.min(s.altitude,4500);
    }update();}
  let held=new Set();function keyDown(e){if(['INPUT','BUTTON'].includes(document.activeElement?.tagName))return;const k=e.key.toLowerCase();if(['w','s','a','d','q','e',' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k)||e.key==='Shift'||e.key==='Control')e.preventDefault();if(e.repeat&&['v',' '].includes(k))return;held.add(k);if(k==='v')toggleView();if(k===' ')togglePause();if(e.key==='Shift')controls.throttle.value=clamp(+controls.throttle.value+3,0,100);if(e.key==='Control')controls.throttle.value=clamp(+controls.throttle.value-3,0,100);}
  addEventListener('keydown',keyDown);addEventListener('keyup',e=>held.delete(e.key.toLowerCase()));addEventListener('blur',()=>held.clear());
  function applyKeys(){for(const k of held){if(k==='w'||k==='arrowup')controls.elevator.value=clamp(+controls.elevator.value+2.5,-100,100);if(k==='s'||k==='arrowdown')controls.elevator.value=clamp(+controls.elevator.value-2.5,-100,100);if(k==='a'||k==='arrowleft')controls.aileron.value=clamp(+controls.aileron.value-3,-100,100);if(k==='d'||k==='arrowright')controls.aileron.value=clamp(+controls.aileron.value+3,-100,100);if(k==='q')controls.rudder.value=clamp(+controls.rudder.value-4,-100,100);if(k==='e')controls.rudder.value=clamp(+controls.rudder.value+4,-100,100);}Object.keys(controls).forEach(sync);}
  function toggleView(){s.view=s.view==='cockpit'?'external':'cockpit';$('viewButton').innerHTML=s.view==='cockpit'?'◉ <span>BUITENZICHT</span>':'◉ <span>COCKPIT</span>';$('viewTag').textContent=s.view==='cockpit'?'COCKPIT · OPEN CABINE':'BUITENBEELD · LUCHTVAARTUIG';}
  function togglePause(){if(s.crashed)return;s.paused=!s.paused;$('pausedOverlay').hidden=!s.paused;$('pauseButton').textContent=s.paused?'▶':'Ⅱ';}
  async function enableSound(){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;if(!audio){audio=new AC();oscillator=audio.createOscillator();engineGain=audio.createGain();const filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=520;oscillator.type='sawtooth';oscillator.frequency.value=75;engineGain.gain.value=0;oscillator.connect(filter).connect(engineGain).connect(audio.destination);oscillator.start();}if(audio.state==='suspended')await audio.resume();$('soundButton').setAttribute('aria-pressed','true');$('soundButton').innerHTML='♫ <span>GELUID AAN</span>';}
  $('soundButton').addEventListener('click',async()=>{if(audio?.state==='running'){await audio.suspend();$('soundButton').setAttribute('aria-pressed','false');$('soundButton').innerHTML='♫ <span>GELUID</span>';}else await enableSound();});setInterval(()=>{if(audio?.state==='running'){oscillator.frequency.setTargetAtTime(65+Number(controls.throttle.value)*1.25,audio.currentTime,.12);engineGain.gain.setTargetAtTime(s.crashed?0:.012+Number(controls.throttle.value)*.00035,audio.currentTime,.15);}},100);
  $('viewButton').addEventListener('click',toggleView);$('pauseButton').addEventListener('click',togglePause);$('restartButton').addEventListener('click',reset);$('resetButton').addEventListener('click',reset);$('helpButton').addEventListener('click',()=>{$('helpPopover').hidden=!$('helpPopover').hidden;$('helpButton').setAttribute('aria-expanded',String(!$('helpPopover').hidden));});document.addEventListener('visibilitychange',()=>{if(document.hidden&&!s.paused&&!s.crashed)togglePause();});
  function frame(now){const dt=Math.min(.04,Math.max(0,(now-last)/1000));last=now;if(!s.paused&&!s.crashed){applyKeys();step(dt);}draw();requestAnimationFrame(frame);}update();requestAnimationFrame(frame);
})();
