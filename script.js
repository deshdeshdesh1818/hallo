(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const canvas = $('scene');
  const ctx = canvas.getContext('2d');
  const controls = { throttle: $('throttle'), elevator: $('elevator'), aileron: $('aileron'), rudder: $('rudder') };
  const outputIds = { throttle: 'throttleOut', elevator: 'elevatorOut', aileron: 'aileronOut', rudder: 'rudderOut' };
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const radians = (deg) => deg * Math.PI / 180;
  const state = { speed: 0, altitude: 0, heading: 0, pitch: 0, bank: 0, vertical: 0, travel: 0, fuel: 100, onGround: true, paused: false, crashed: false, view: 'cockpit', wind: 6, windDirection: 270, prop: 0, time: 0, landing: false };
  let width = 0, height = 0, dpr = 1, lastFrame = performance.now(), audio = null, engineOsc = null, engineGain = null;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, rect.width); height = Math.max(1, rect.height);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize); resize();

  function polygon(points, color) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.closePath(); ctx.fill();
  }
  function ellipse(x, y, rx, ry, color, rotation = 0) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2); ctx.fill();
  }
  function drawCloud(x, y, size, alpha) {
    ctx.fillStyle = `rgba(246,244,221,${alpha})`;
    ctx.beginPath(); ctx.ellipse(x, y, size * 1.25, size * .20, 0, 0, Math.PI * 2);
    ctx.ellipse(x - size * .35, y - size * .08, size * .48, size * .24, -.1, 0, Math.PI * 2);
    ctx.ellipse(x + size * .12, y - size * .14, size * .52, size * .31, .05, 0, Math.PI * 2); ctx.fill();
  }
  function drawWorld() {
    const w = width, h = height;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    const horizon = h * (.47 + clamp(state.pitch * .0025, -.11, .11) - clamp(state.altitude / 50000, 0, .1));
    ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(-radians(state.bank) * .34); ctx.translate(-w / 2, -h / 2);
    const sky = ctx.createLinearGradient(0, 0, 0, horizon + h * .12);
    sky.addColorStop(0, '#78a3b2'); sky.addColorStop(.66, '#bfd0c5'); sky.addColorStop(1, '#e3d8b8');
    ctx.fillStyle = sky; ctx.fillRect(-w, -h, w * 3, h * 3);
    ellipse(w * .77, h * .18, 30, 30, 'rgba(255,235,172,.48)');
    for (let i = 0; i < 9; i++) {
      let x = ((i * w * .19 - state.travel * .025 + w * 2) % (w * 1.35)) - w * .15;
      drawCloud(x, h * (.08 + (i % 3) * .07), w * (.035 + (i % 2) * .012), .35);
    }
    polygon([[-w * .1, horizon + 16], [w * .1, horizon - 25], [w * .26, horizon + 6], [w * .43, horizon - 38], [w * .59, horizon + 8], [w * .78, horizon - 21], [w * 1.1, horizon + 20], [w * 1.1, h * 2], [-w * .1, h * 2]], '#7d896f');
    ctx.fillStyle = '#91a071'; ctx.fillRect(-w, horizon + 22, w * 3, h * 2);
    // Patchwork fields move toward the aircraft to create a perspective ground flow.
    ctx.save(); ctx.beginPath(); ctx.rect(-w, horizon + 22, w * 3, h * 2); ctx.clip();
    for (let i = 0; i < 18; i++) {
      const z = ((i / 18 + state.travel * .0008) % 1 + 1) % 1;
      const y = horizon + 28 + z * z * h * 1.45;
      const half = w * (.025 + z * .68);
      const shift = Math.sin(i * 19.13) * w * .12 + state.heading * w * .0009;
      polygon([[w / 2 + shift - half, y], [w / 2 + shift + half, y], [w / 2 + shift + half * 1.25, y + h * .17], [w / 2 + shift - half * 1.25, y + h * .17]], i % 2 ? '#82936c' : '#9a9d70');
      if (i % 3 === 0) {
        ctx.strokeStyle = 'rgba(226,211,162,.35)'; ctx.lineWidth = Math.max(1, z * 2);
        ctx.beginPath(); ctx.moveTo(w / 2 + shift - half, y); ctx.lineTo(w / 2 + shift + half, y); ctx.stroke();
      }
    }
    // Runway perspective and centerline, straight ahead on the home heading.
    const runwayDx = Math.sin(radians(state.heading)) * w * .62;
    const runwayTop = horizon + h * .035 + Math.min(state.altitude / 9000, .16) * h;
    const runwayBottom = h * 1.35;
    if (Math.abs(state.heading) < 70 || state.onGround) {
      const rwTop = w * .008, rwBottom = w * .24;
      polygon([[w / 2 + runwayDx - rwTop, runwayTop], [w / 2 + runwayDx + rwTop, runwayTop], [w / 2 + runwayDx + rwBottom, runwayBottom], [w / 2 + runwayDx - rwBottom, runwayBottom]], '#555b51');
      polygon([[w / 2 + runwayDx - rwTop * .62, runwayTop], [w / 2 + runwayDx + rwTop * .62, runwayTop], [w / 2 + runwayDx + rwBottom * .82, runwayBottom], [w / 2 + runwayDx - rwBottom * .82, runwayBottom]], '#77796c');
      for (let i = 0; i < 10; i++) {
        const t = ((i / 10 + state.travel * .004) % 1);
        const y = runwayTop + (runwayBottom - runwayTop) * t * t;
        const markW = Math.max(1, t * w * .012);
        ctx.fillStyle = '#e7e1c9'; ctx.fillRect(w / 2 + runwayDx - markW / 2, y, markW, Math.max(2, t * h * .018));
      }
      ctx.strokeStyle = '#ece6cf'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(w / 2 + runwayDx - rwTop * 1.8, runwayTop + 3); ctx.lineTo(w / 2 + runwayDx - rwBottom * .9, runwayBottom); ctx.moveTo(w / 2 + runwayDx + rwTop * 1.8, runwayTop + 3); ctx.lineTo(w / 2 + runwayDx + rwBottom * .9, runwayBottom); ctx.stroke();
    }
    // Small tree clusters give scale and movement cues.
    for (let i = 0; i < 44; i++) {
      const t = ((i / 44 + state.travel * .0014) % 1 + 1) % 1;
      const side = i % 2 ? -1 : 1;
      const x = w / 2 + side * w * (.08 + ((i * 37) % 100) / 130) * (.2 + t);
      const y = horizon + 20 + t * t * h * 1.2;
      const size = 2 + t * 13;
      ellipse(x, y, size * .65, size, i % 3 ? '#405d43' : '#526744');
    }
    ctx.restore(); ctx.restore();
    if (state.view === 'cockpit') drawCockpit(w, h);
    else drawExternalPlane(w, h);
    if (state.crashed) { ctx.fillStyle = 'rgba(44,23,16,.22)'; ctx.fillRect(0, 0, w, h); }
  }
  function drawCockpit(w, h) {
    // Upper wing, interplane struts, bracing wires and the open-cockpit nose.
    const roll = clamp(state.bank, -35, 35) * .35;
    ctx.save(); ctx.translate(w / 2, h * .64); ctx.rotate(radians(roll));
    polygon([[-w * .52, -h * .20], [-w * .43, -h * .27], [w * .43, -h * .27], [w * .52, -h * .20], [w * .48, -h * .16], [-w * .48, -h * .16]], '#a75631');
    ctx.fillStyle = '#d39350'; ctx.fillRect(-w * .47, -h * .187, w * .94, 3);
    ctx.strokeStyle = '#4c3a2a'; ctx.lineWidth = 3;
    for (const x of [-w * .28, w * .28]) { ctx.beginPath(); ctx.moveTo(x, -h * .19); ctx.lineTo(x * .72, h * .04); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(238,220,172,.8)'; ctx.lineWidth = 1;
    for (const x of [-w * .3, w * .3]) { ctx.beginPath(); ctx.moveTo(x, -h * .19); ctx.lineTo(-x * .72, h * .04); ctx.stroke(); }
    // Cowling, blurred spinning propeller and leather cockpit coaming.
    const cx = 0, cy = h * .06;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(state.prop);
    ctx.fillStyle = 'rgba(36,34,27,.48)'; ctx.fillRect(-3, -h * .26, 6, h * .52); ctx.fillRect(-w * .12, -3, w * .24, 6); ctx.restore();
    ellipse(cx, cy, w * .045, h * .045, '#58432d'); ellipse(cx, cy, w * .022, h * .025, '#c38d51');
    polygon([[-w * .13, h * .06], [w * .13, h * .06], [w * .21, h * .48], [-w * .21, h * .48]], '#4a3928');
    polygon([[-w * .105, h * .08], [w * .105, h * .08], [w * .16, h * .44], [-w * .16, h * .44]], '#795638');
    ctx.strokeStyle = '#342a20'; ctx.lineWidth = Math.max(8, w * .025); ctx.beginPath(); ctx.ellipse(0, h * .31, w * .16, h * .13, 0, Math.PI, 0); ctx.stroke();
    ctx.restore();
    // Subtle aiming mark.
    ctx.strokeStyle = 'rgba(255,246,211,.62)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(w / 2 - 20, h * .49); ctx.lineTo(w / 2 - 7, h * .49); ctx.moveTo(w / 2 + 7, h * .49); ctx.lineTo(w / 2 + 20, h * .49); ctx.moveTo(w / 2, h * .49 - 5); ctx.lineTo(w / 2, h * .49 + 5); ctx.stroke();
  }
  function drawExternalPlane(w, h) {
    const x = w * .5, y = h * .59;
    ctx.save(); ctx.translate(x, y); ctx.rotate(radians(clamp(state.bank, -45, 45) * .55));
    // Side-on 3D-ish biplane illustration with two wings, wires, tail and spinning prop.
    ctx.strokeStyle = 'rgba(30,35,29,.28)'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(-w * .26, h * .07); ctx.lineTo(w * .26, h * .07); ctx.stroke();
    polygon([[-w * .38, -h * .08], [-w * .27, -h * .13], [w * .36, -h * .13], [w * .4, -h * .08], [w * .34, -h * .045], [-w * .36, -h * .045]], '#ba633a');
    polygon([[-w * .33, h * .02], [-w * .24, h * -.02], [w * .32, h * -.02], [w * .36, h * .02], [w * .29, h * .055], [-w * .31, h * .055]], '#d18a4d');
    ctx.strokeStyle = '#503c2a'; ctx.lineWidth = 3;
    for (const px of [-w * .18, w * .19]) { ctx.beginPath(); ctx.moveTo(px, -h * .08); ctx.lineTo(px * .75, h * .02); ctx.stroke(); }
    polygon([[-w * .38, -h * .02], [-w * .48, -h * .10], [-w * .45, h * .03], [-w * .39, h * .04]], '#9b5736');
    ellipse(w * .04, 0, w * .24, h * .035, '#483a29'); ellipse(w * .15, -h * .01, w * .075, h * .065, '#a95832');
    ctx.save(); ctx.translate(w * .25, 0); ctx.rotate(state.prop); ctx.fillStyle = '#322c24'; ctx.fillRect(-2, -h * .14, 4, h * .28); ctx.restore();
    ellipse(-w * .20, h * .055, w * .028, h * .028, '#302d25'); ellipse(w * .13, h * .052, w * .028, h * .028, '#302d25');
    ctx.restore();
  }

  function drawDial(id, value, max, label) {
    const c = $(id), g = c.getContext('2d'), cw = c.width, ch = c.height, cx = cw / 2, cy = ch / 2 + 5, r = 48;
    g.clearRect(0, 0, cw, ch); g.save(); g.translate(cx, cy);
    g.beginPath(); g.arc(0, 0, r, Math.PI * .78, Math.PI * 2.22); g.strokeStyle = '#66715f'; g.lineWidth = 5; g.stroke();
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI * (.78 + 1.44 * i / 10), x1 = Math.cos(a) * (r - 5), y1 = Math.sin(a) * (r - 5);
      g.beginPath(); g.moveTo(x1, y1); g.lineTo(Math.cos(a) * (r - (i % 2 ? 1 : 10)), Math.sin(a) * (r - (i % 2 ? 1 : 10)));
      g.strokeStyle = i > 8 && label === 'speed' ? '#d8755b' : '#d5d0b4'; g.lineWidth = i % 2 ? 1 : 2; g.stroke();
    }
    const a = Math.PI * (.78 + 1.44 * clamp(value / max, 0, 1));
    g.beginPath(); g.moveTo(0, 7); g.lineTo(Math.cos(a) * (r - 13), Math.sin(a) * (r - 13)); g.strokeStyle = '#d98c51'; g.lineWidth = 2; g.stroke();
    g.beginPath(); g.arc(0, 0, 3, 0, Math.PI * 2); g.fillStyle = '#e7dfc3'; g.fill(); g.restore();
  }
  function drawAttitude() {
    const c = $('attitude'), g = c.getContext('2d'), s = c.width;
    g.clearRect(0, 0, s, s); g.save(); g.beginPath(); g.arc(s / 2, s / 2, s * .47, 0, Math.PI * 2); g.clip();
    g.translate(s / 2, s / 2); g.rotate(-radians(state.bank)); g.translate(0, clamp(state.pitch, -25, 25) * 1.2);
    g.fillStyle = '#668b99'; g.fillRect(-s, -s, s * 2, s); g.fillStyle = '#927e59'; g.fillRect(-s, 0, s * 2, s);
    g.strokeStyle = '#f2ebd1'; g.lineWidth = 2; g.beginPath(); g.moveTo(-s, 0); g.lineTo(s, 0); g.stroke();
    for (let i = -2; i <= 2; i++) { if (!i) continue; g.beginPath(); g.moveTo(-13, i * 12); g.lineTo(13, i * 12); g.stroke(); }
    g.restore(); g.strokeStyle = '#d8d1b3'; g.lineWidth = 2; g.beginPath(); g.arc(s / 2, s / 2, s * .47, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(s * .22, s * .5); g.lineTo(s * .42, s * .5); g.moveTo(s * .58, s * .5); g.lineTo(s * .78, s * .5); g.stroke();
  }

  const knotsToFpm = (mps) => Math.round(mps * 196.85);
  function updateReadouts() {
    const speed = Math.round(state.speed), feet = Math.round(state.altitude * 3.28084), climb = knotsToFpm(state.vertical);
    $('speedValue').textContent = speed; $('altValue').textContent = feet.toLocaleString('nl-NL');
    $('hudSpeed').textContent = speed; $('hudAltitude').textContent = feet.toLocaleString('nl-NL'); $('hudClimb').textContent = `${climb > 0 ? '+' : ''}${climb}`;
    $('headingReadout').textContent = `${String(Math.round(state.heading + 360) % 360).padStart(3, '0')}°`;
    $('rpmValue').textContent = Math.round(700 + Number(controls.throttle.value) * 20).toLocaleString('nl-NL');
    $('rpmMeter').style.width = `${controls.throttle.value}%`;
    $('fuelValue').textContent = Math.round(state.fuel); $('fuelMeter').style.width = `${state.fuel}%`;
    $('statusText').textContent = state.crashed ? 'VLUCHT BEËINDIGD' : state.onGround ? (state.speed > 5 ? 'TAXI · STARTBAAN' : Number(controls.throttle.value) > 0 ? 'MOTOR DRAAIT · OP DE STARTBAAN' : 'MOTOR UIT · OP DE STARTBAAN') : 'IN VLUCHT · VISUEEL WEER';
    $('statusDot').style.background = state.crashed ? '#e46d54' : state.onGround ? '#e4a95c' : '#c8d880';
    $('coordinates').innerHTML = `${(52.30 + state.travel / 800000).toFixed(2)}° N&nbsp; ${(4.76 + Math.sin(radians(state.heading)) * state.travel / 800000).toFixed(2)}° E`;
    drawDial('speedDial', state.speed, 120, 'speed'); drawDial('altDial', feet, 10000, 'alt'); drawAttitude();
    if (state.crashed) return;
    let message = 'IN VLUCHT · HOUD DE NEUS LICHT OMHOOG EN DE VLEUGELS WATERPAS';
    if (state.onGround) {
      if (state.speed < 5 && Number(controls.throttle.value) === 0) message = 'KLAAR VOOR START · GEEF GAS EN TREK LICHT AAN DE STICK';
      else if (state.speed < 40) message = 'STARTBAAN · GEEF MEER GAS OM OP TE STIJGEN';
      else message = 'ROTATIESNELHEID · TREK LICHT AAN DE STICK OM OP TE STIJGEN';
    } else if (state.speed < 35) message = 'WAARSCHUWING · TE WEINIG SNELHEID — NEUS OMLAAG';
    else if (state.altitude < 35 && state.speed > 35) message = 'NADERING · LIJN OP DE BAAN UIT EN MAAK EEN ZACHTE LANDING';
    $('message').textContent = message;
  }

  function setCrash(title, text) {
    if (state.crashed) return;
    state.crashed = true; state.paused = true;
    $('crashTitle').textContent = title; $('crashText').textContent = text;
    $('crashOverlay').hidden = false; $('pausedOverlay').hidden = true; updateReadouts();
    playImpact();
  }
  function reset() {
    Object.assign(state, { speed: 0, altitude: 0, heading: 0, pitch: 0, bank: 0, vertical: 0, travel: 0, fuel: 100, onGround: true, paused: false, crashed: false, landing: false, prop: 0 });
    Object.values(controls).forEach((input) => { input.value = input === controls.throttle ? 0 : 0; input.dispatchEvent(new Event('input', { bubbles: true })); });
    $('crashOverlay').hidden = true; $('pausedOverlay').hidden = true; $('pauseButton').textContent = 'Ⅱ';
    $('message').textContent = 'KLAAR VOOR START · GEEF GAS EN TREK LICHT AAN DE STICK';
    lastFrame = performance.now();
  }

  function simulate(dt) {
    if (state.paused || state.crashed) return;
    const throttle = Number(controls.throttle.value) / 100;
    const elevator = Number(controls.elevator.value) / 100;
    const aileron = Number(controls.aileron.value) / 100;
    const rudder = Number(controls.rudder.value) / 100;
    state.time += dt;
    const desiredSpeed = throttle * 62;
    const drag = .00043 * state.speed * state.speed;
    state.speed = Math.max(0, state.speed + (throttle * 8.3 - drag - state.speed * .025) * dt);
    state.speed = Math.min(120, state.speed);
    state.fuel = Math.max(0, state.fuel - throttle * .00125 * dt);
    if (state.fuel <= 0) { controls.throttle.value = 0; }
    state.prop += dt * (5 + state.speed * .18);
    state.travel += state.speed * dt;
    // Biplane flight controls have inertia: inputs command attitudes, not instant movement.
    const targetBank = aileron * 48;
    state.bank += (targetBank - state.bank) * Math.min(1, dt * 1.9);
    const turnRate = Math.sin(radians(state.bank)) * (state.speed / 38) * 24 + rudder * (state.onGround ? 9 : 5);
    state.heading = (state.heading + turnRate * dt + 360) % 360;
    const targetPitch = elevator * 17;
    state.pitch += (targetPitch - state.pitch) * Math.min(1, dt * 1.6);
    if (state.onGround) {
      state.altitude = 0; state.vertical = 0;
      if (state.speed > 43 && state.pitch > 4) { state.onGround = false; state.vertical = 2; }
      if (state.speed > 0 && Math.abs(state.heading) > 115) { state.heading = 0; }
    } else {
      const stallSpeed = 34;
      const liftFactor = clamp((state.speed - stallSpeed) / 24, 0, 1.15);
      const targetVertical = (state.pitch - 2.2) * .34 * liftFactor - (state.speed < stallSpeed ? (stallSpeed - state.speed) * .65 : 0);
      state.vertical += (targetVertical - state.vertical) * Math.min(1, dt * (state.speed < stallSpeed ? .9 : 1.3));
      // A modest gust makes the light fabric airframe feel alive without taking control away.
      state.vertical += Math.sin(state.time * 1.4) * .025;
      state.altitude += state.vertical * dt;
      if (state.speed < 26 && state.altitude < 70) { setCrash('OVERTREK', 'De tweedekker verloor lift. Houd boven de overtreksnelheid voldoende snelheid.'); return; }
      if (state.altitude <= 0) {
        const aligned = Math.min(Math.abs(state.heading), 360 - Math.abs(state.heading)) < 18;
        const safe = aligned && state.speed >= 35 && state.speed <= 65 && state.pitch > -4 && state.pitch < 12 && state.vertical > -3.2;
        if (safe) { state.onGround = true; state.altitude = 0; state.vertical = 0; state.speed *= .82; state.landing = true; controls.throttle.value = 0; $('message').textContent = 'LANDING GESLAAGD · MOOI GEDAAN, PILOOT'; }
        else { setCrash('LANDING MISLUKT', 'Raak de baan recht aan, met beheerste snelheid en een zachte daalvlucht.'); return; }
      }
      state.altitude = Math.min(state.altitude, 4500);
    }
    updateReadouts();
  }

  function drawFrame(now) {
    const dt = Math.min(.04, Math.max(0, (now - lastFrame) / 1000)); lastFrame = now;
    simulate(dt); drawWorld(); requestAnimationFrame(drawFrame);
  }

  function syncControl(name) {
    const input = controls[name], n = Number(input.value);
    $(outputIds[name]).textContent = `${n > 0 && name !== 'throttle' ? '+' : ''}${n}%`;
    const pct = name === 'throttle' ? n : (n + 100) / 2;
    input.style.setProperty('--fill', `${pct}%`);
  }
  Object.entries(controls).forEach(([name, input]) => {
    syncControl(name); input.addEventListener('input', () => syncControl(name));
  });

  function setControl(name, value) { controls[name].value = String(clamp(value, Number(controls[name].min), Number(controls[name].max))); syncControl(name); }
  const held = new Set();
  window.addEventListener('keydown', (event) => {
    if (['INPUT', 'BUTTON'].includes(document.activeElement?.tagName)) return;
    const key = event.key.toLowerCase();
    if (['w','s','a','d','q','e',' ','arrowup','arrowdown','arrowleft','arrowright'].includes(key) || event.key === 'Shift' || event.key === 'Control') event.preventDefault();
    if (event.repeat && ['v',' '].includes(key)) return;
    held.add(key);
    if (key === 'v') toggleView();
    if (key === ' ') togglePause();
    if (event.key === 'Shift') setControl('throttle', Number(controls.throttle.value) + 3);
    if (event.key === 'Control') setControl('throttle', Number(controls.throttle.value) - 3);
  });
  window.addEventListener('keyup', (event) => held.delete(event.key.toLowerCase()));
  window.addEventListener('blur', () => held.clear());
  function applyKeys() {
    for (const key of held) {
      if (key === 'w' || key === 'arrowup') setControl('elevator', Number(controls.elevator.value) + 2.5);
      if (key === 's' || key === 'arrowdown') setControl('elevator', Number(controls.elevator.value) - 2.5);
      if (key === 'a' || key === 'arrowleft') setControl('aileron', Number(controls.aileron.value) - 3);
      if (key === 'd' || key === 'arrowright') setControl('aileron', Number(controls.aileron.value) + 3);
      if (key === 'q') setControl('rudder', Number(controls.rudder.value) - 4);
      if (key === 'e') setControl('rudder', Number(controls.rudder.value) + 4);
    }
  }
  const originalSimulate = simulate;
  simulate = function (dt) { applyKeys(); originalSimulate(dt); };

  function toggleView() {
    state.view = state.view === 'cockpit' ? 'external' : 'cockpit';
    $('viewButton').innerHTML = state.view === 'cockpit' ? '◉ <span>BUITENZICHT</span>' : '◉ <span>COCKPIT</span>';
    $('viewTag').textContent = state.view === 'cockpit' ? 'COCKPIT · OPEN CABINE' : 'BUITENBEELD · LUCHTVAARTUIG';
  }
  function togglePause() {
    if (state.crashed) return;
    state.paused = !state.paused; $('pausedOverlay').hidden = !state.paused;
    $('pauseButton').textContent = state.paused ? '▶' : 'Ⅱ';
  }

  async function enableAudio() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!audio) {
      audio = new AudioContext(); engineOsc = audio.createOscillator(); engineGain = audio.createGain();
      const filter = audio.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 520;
      engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 75; engineGain.gain.value = 0;
      engineOsc.connect(filter).connect(engineGain).connect(audio.destination); engineOsc.start();
    }
    if (audio.state === 'suspended') await audio.resume();
    $('soundButton').setAttribute('aria-pressed', 'true'); $('soundButton').innerHTML = '♫ <span>GELUID AAN</span>';
  }
  function playImpact() {
    if (!audio || audio.state !== 'running') return;
    const osc = audio.createOscillator(), gain = audio.createGain(); osc.type = 'triangle';
    osc.frequency.setValueAtTime(110, audio.currentTime); osc.frequency.exponentialRampToValueAtTime(38, audio.currentTime + .45);
    gain.gain.setValueAtTime(.35, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .5);
    osc.connect(gain).connect(audio.destination); osc.start(); osc.stop(audio.currentTime + .5);
  }
  $('soundButton').addEventListener('click', async () => {
    if (audio && audio.state === 'running') {
      await audio.suspend(); $('soundButton').setAttribute('aria-pressed', 'false'); $('soundButton').innerHTML = '♫ <span>GELUID</span>';
    } else await enableAudio();
  });
  document.addEventListener('pointerdown', () => { if ($('soundButton').getAttribute('aria-pressed') === 'true') enableAudio(); }, { once: true });
  setInterval(() => {
    if (audio && audio.state === 'running' && engineOsc) {
      engineOsc.frequency.setTargetAtTime(65 + Number(controls.throttle.value) * 1.25, audio.currentTime, .12);
      engineGain.gain.setTargetAtTime(state.crashed ? 0 : .012 + Number(controls.throttle.value) * .00035, audio.currentTime, .15);
    }
  }, 100);

  $('viewButton').addEventListener('click', toggleView);
  $('pauseButton').addEventListener('click', togglePause);
  $('restartButton').addEventListener('click', reset);
  $('resetButton').addEventListener('click', reset);
  $('helpButton').addEventListener('click', () => {
    const open = $('helpPopover').hidden; $('helpPopover').hidden = !open; $('helpButton').setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && !state.paused && !state.crashed) togglePause(); });
  requestAnimationFrame(drawFrame);
})();
