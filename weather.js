(() => {
  'use strict';
  const canvas = document.getElementById('weatherCanvas');
  const view = document.getElementById('view');
  if (!canvas || !view) return;
  const ctx = canvas.getContext('2d');
  const $ = id => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const weatherTypes = [
    { name: 'OPKLAREND', icon: '☼', cloud: 'cirrus', coverage: .16, overcast: 0, rain: 0, snow: 0, fog: .015, wind: 5, gust: 2, tint: [160, 190, 195] },
    { name: 'CUMULUS', icon: '☁', cloud: 'cumulus', coverage: .43, overcast: 0, rain: 0, snow: 0, fog: .025, wind: 7, gust: 4, tint: [183, 199, 193] },
    { name: 'HOGE SLUIERBEWOLKING', icon: '☁', cloud: 'cirrus', coverage: .62, overcast: .12, rain: 0, snow: 0, fog: .05, wind: 10, gust: 5, tint: [170, 183, 185] },
    { name: 'GRIJS EN BEWOLKT', icon: '☁', cloud: 'stratus', coverage: .94, overcast: .54, rain: 0, snow: 0, fog: .1, wind: 9, gust: 3, tint: [139, 151, 153] },
    { name: 'REGENBUIEN', icon: '🌧', cloud: 'nimbus', coverage: .9, overcast: .45, rain: .42, snow: 0, fog: .16, wind: 16, gust: 8, tint: [111, 127, 137] },
    { name: 'WINTERSE BUIEN', icon: '❄', cloud: 'nimbus', coverage: .86, overcast: .38, rain: 0, snow: .56, fog: .18, wind: 14, gust: 7, tint: [151, 169, 178] },
    { name: 'ONWEER IN DE BUURT', icon: '⛈', cloud: 'storm', coverage: .96, overcast: .68, rain: .78, snow: 0, fog: .22, wind: 23, gust: 14, tint: [80, 95, 110] }
  ];
  let width = 1, height = 1, dpr = 1, previous = performance.now();
  let current = { ...weatherTypes[1], direction: 260 };
  let target = weatherTypes[0], elapsed = 0, transition = 12, nextChange = 25, cloudOffset = 0, flash = 0;
  let windDirection = 260;
  let rain = Array.from({ length: 95 }, () => ({ x: Math.random(), y: Math.random(), length: 8 + Math.random() * 15, speed: .7 + Math.random() * 1.2 }));
  let flakes = Array.from({ length: 52 }, () => ({ x: Math.random(), y: Math.random(), size: 1 + Math.random() * 2.5, speed: .12 + Math.random() * .28, phase: Math.random() * 8 }));
  function resize() { const r = view.getBoundingClientRect(); dpr = Math.min(devicePixelRatio || 1, 2); width = Math.max(1, r.width); height = Math.max(1, r.height); canvas.width = width * dpr; canvas.height = height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  addEventListener('resize', resize); resize();
  function chooseWeather() {
    const options = weatherTypes.filter(item => item.name !== target.name);
    target = options[Math.floor(Math.random() * options.length)];
    transition = 18 + Math.random() * 18; elapsed = 0;
    windDirection = (windDirection + (Math.random() * 100 - 50) + 360) % 360;
  }
  function cloudShape(x, y, rx, kind, alpha, index) {
    ctx.save(); ctx.globalAlpha = alpha;
    if (kind === 'cirrus') {
      ctx.strokeStyle = '#fffdf0'; ctx.lineWidth = Math.max(1, rx * .018); ctx.lineCap = 'round';
      for (let j = 0; j < 5; j++) { const yy = y + (j - 2) * rx * .055; ctx.beginPath(); ctx.moveTo(x - rx, yy + Math.sin(index + j) * 4); ctx.bezierCurveTo(x - rx * .35, yy - rx * .11, x + rx * .2, yy + rx * .09, x + rx, yy - rx * .05); ctx.stroke(); }
    } else if (kind === 'stratus') {
      const grad = ctx.createLinearGradient(0, y - rx * .22, 0, y + rx * .2); grad.addColorStop(0, 'rgba(248,248,237,.78)'); grad.addColorStop(1, 'rgba(221,226,218,.35)');
      ctx.fillStyle = grad; ctx.beginPath(); ctx.ellipse(x, y, rx * 1.5, rx * .19, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x - rx * .45, y - rx * .08, rx * .64, rx * .2, 0, 0, Math.PI * 2); ctx.ellipse(x + rx * .48, y - rx * .06, rx * .72, rx * .2, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      const storm = kind === 'storm' || kind === 'nimbus';
      const base = kind === 'storm' ? 'rgba(57,68,80,.92)' : kind === 'nimbus' ? 'rgba(105,117,127,.83)' : 'rgba(248,247,229,.86)';
      const shade = kind === 'storm' ? 'rgba(90,102,115,.95)' : kind === 'nimbus' ? 'rgba(152,163,168,.85)' : 'rgba(255,254,241,.88)';
      ctx.fillStyle = base; ctx.beginPath(); ctx.ellipse(x, y + rx * .08, rx * 1.35, rx * .25, 0, 0, Math.PI * 2); ctx.fill();
      const puffs = kind === 'storm' ? 7 : 5;
      for (let j = 0; j < puffs; j++) {
        const px = x + (j - (puffs - 1) / 2) * rx * .36;
        const py = y - rx * (.07 + ((j * 17 + index) % 4) * .035);
        ctx.fillStyle = j % 2 ? base : shade;
        const puff = rx * (.29 + ((j * 13 + index) % 3) * .055);
        ctx.beginPath(); ctx.ellipse(px, py, puff, puff * (kind === 'storm' ? 1.04 : .82), 0, 0, Math.PI * 2); ctx.fill();
      }
      if (kind === 'storm') { ctx.fillStyle = 'rgba(48,58,68,.65)'; ctx.beginPath(); ctx.ellipse(x, y + rx * .24, rx * .92, rx * .16, 0, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
  }
  function draw(dt) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
    const horizon = height * .47;
    const windRad = windDirection * Math.PI / 180;
    const windX = Math.cos(windRad);
    cloudOffset += dt * (.012 + current.wind * .0011);
    // Cloud layers stay in the sky band so the cockpit instruments and aircraft remain readable.
    const count = Math.round(3 + current.coverage * 13);
    for (let layer = 0; layer < 2; layer++) {
      const parallax = layer === 0 ? .42 : 1;
      for (let i = 0; i < count; i++) {
        const seed = i * 127.1 + layer * 311.7;
        const rx = width * (.035 + (Math.sin(seed) + 1) * .012) * (layer ? 1 : .68);
        let x = ((i * width * .19 + Math.sin(seed * .17) * width * .1 + cloudOffset * width * windX * parallax) % (width * 1.4) + width * 1.4) % (width * 1.4) - width * .2;
        const y = height * (.08 + ((Math.sin(seed * .51) + 1) * .12)) + (layer ? height * .05 : 0);
        const alpha = clamp(current.coverage * (layer ? .48 : .69), 0, .8);
        cloudShape(x, y, rx, current.cloud, alpha, i + layer * 3);
      }
    }
    // Gradually changing overcast and distant haze.
    if (current.overcast > .01) {
      const g = ctx.createLinearGradient(0, 0, 0, horizon * 1.3);
      g.addColorStop(0, `rgba(117,128,137,${current.overcast * .48})`); g.addColorStop(1, `rgba(202,204,194,${current.overcast * .12})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, width, horizon * 1.25);
    }
    if (current.fog > .02) { const g = ctx.createLinearGradient(0, horizon * .48, 0, height); g.addColorStop(0, `rgba(210,216,210,${current.fog * .38})`); g.addColorStop(1, `rgba(218,220,207,${current.fog * .1})`); ctx.fillStyle = g; ctx.fillRect(0, horizon * .48, width, height * .52); }
    if (current.rain > .01) {
      ctx.strokeStyle = `rgba(226,237,242,${.22 + current.rain * .38})`; ctx.lineWidth = 1;
      for (const drop of rain) { drop.x -= windX * dt * .12; drop.y += dt * drop.speed * (1 + current.rain); if (drop.y > 1.05) { drop.y = -.05; drop.x = Math.random(); } if (drop.x < -.05) drop.x = 1.05; if (drop.x > 1.05) drop.x = -.05; const x = drop.x * width, y = drop.y * height; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 4, y + drop.length * current.rain); ctx.stroke(); }
    }
    if (current.snow > .01) {
      ctx.fillStyle = 'rgba(255,255,248,.78)';
      for (const flake of flakes) { flake.y += dt * flake.speed * (1 + current.snow); flake.x += Math.sin(performance.now() / 900 + flake.phase) * dt * .025 - windX * dt * .035; if (flake.y > 1.03) { flake.y = -.03; flake.x = Math.random(); } if (flake.x < 0) flake.x = 1; if (flake.x > 1) flake.x = 0; ctx.beginPath(); ctx.arc(flake.x * width, flake.y * height, flake.size, 0, Math.PI * 2); ctx.fill(); }
    }
    if (flash > 0) { ctx.fillStyle = `rgba(247,249,255,${flash})`; ctx.fillRect(0, 0, width, height); flash = Math.max(0, flash - dt * 2.8); }
    if (current.cloud === 'storm' && Math.random() < dt * .018) flash = .52;
  }
  function updateReadout() {
    const dir = Math.round(windDirection + 360) % 360;
    const label = current.name;
    $('weatherSummary').textContent = `${label} · ${Math.round(current.wind)} KT`;
    $('windReadout').textContent = `${String(dir).padStart(3, '0')}° · ${Math.round(current.wind)} kt`;
    $('weatherIcon').textContent = current.icon;
    $('weatherIcon').classList.toggle('weather-front', current.rain > .1 || current.snow > .1 || current.cloud === 'storm');
    document.querySelector('.sky-label')?.classList.toggle('weather-poor', current.fog > .14 || current.overcast > .5);
  }
  function frame(now) {
    const dt = Math.min(.05, Math.max(0, (now - previous) / 1000)); previous = now;
    nextChange -= dt; elapsed += dt;
    if (nextChange <= 0) { chooseWeather(); nextChange = 42 + Math.random() * 38; }
    const blend = clamp(dt / Math.max(1, transition), 0, 1);
    for (const key of ['coverage', 'overcast', 'rain', 'snow', 'fog', 'wind']) current[key] = lerp(current[key], target[key], blend);
    current.cloud = elapsed > transition * .65 ? target.cloud : current.cloud;
    current.name = elapsed > transition * .65 ? target.name : current.name;
    current.icon = elapsed > transition * .65 ? target.icon : current.icon;
    windDirection = (windDirection + 360) % 360;
    draw(dt); updateReadout(); requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
