(() => {
  const viewport = document.getElementById('viewport');
  const canvas = document.getElementById('mountainLayer');
  if (!viewport || !canvas) return;

  const ctx = canvas.getContext('2d');
  let approach = 0;
  let previousTime = performance.now();
  let collisionTriggered = false;

  function resize() {
    const rect = viewport.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function seed(n) {
    const value = Math.sin(n * 127.1 + 41.7) * 43758.5453;
    return value - Math.floor(value);
  }

  function readNumber(id) {
    const text = document.getElementById(id)?.textContent || '0';
    return Number(text.replace(/,/g, '').replace(/[^0-9.+-]/g, '')) || 0;
  }

  function headingDifference(degrees) {
    return Math.abs(((degrees + 180) % 360) - 180);
  }

  function drawMountainLayer(width, height, horizon, approach, heading, altitude) {
    const headingShift = (headingDifference(heading) / 180) * width * 0.22;
    let nearestMountainBase = 0;
    let nearestMountainTop = height;

    for (let layer = 0; layer < 3; layer++) {
      const depth = (layer + 1) / 3;
      const growth = Math.pow(approach, 1.35) * (1.3 + depth * 3.8);
      const scale = 0.72 + depth * 0.35 + growth;
      const base = horizon + height * (0.035 + approach * (0.14 + depth * 0.20));
      const shift = headingShift * (layer - 1) * 0.48;
      const profile = [];

      // A stable, jagged skyline: landmarks enlarge continuously rather than popping.
      for (let i = 0; i <= 28; i++) {
        const x = -width * 0.16 + (width * 1.32 * i) / 28 + shift;
        const broadPeak = 0.12 + seed(i * 0.43 + layer * 29) * 0.22;
        const ridgeNoise = (seed(i * 2.71 + layer * 13) - 0.5) * 0.065;
        const peakHeight = height * Math.max(0.055, broadPeak + ridgeNoise) * scale;
        const y = base - peakHeight;
        profile.push({ x, y, peakHeight });
        if (layer === 2) {
          nearestMountainBase = Math.max(nearestMountainBase, base);
          nearestMountainTop = Math.min(nearestMountainTop, y);
        }
      }

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(profile[0].x, base);
      profile.forEach(point => ctx.lineTo(point.x, point.y));
      ctx.lineTo(profile[profile.length - 1].x, base);
      ctx.closePath();
      ctx.fillStyle = ['#7a8064', '#626e54', '#46533e'][layer];
      ctx.globalAlpha = [0.76, 0.87, 0.98][layer];
      ctx.fill();
      ctx.clip();

      // Rock faces, shadowed gullies, and high-altitude snow caps become clearer nearby.
      const detail = Math.floor(5 + approach * 22);
      for (let i = 0; i < detail; i++) {
        const p = (i / detail) * (profile.length - 2);
        const index = Math.floor(p);
        const point = profile[index];
        const next = profile[index + 1];
        const fraction = p - index;
        const ridgeY = point.y + (next.y - point.y) * fraction;
        const x = point.x + (next.x - point.x) * fraction;
        const facetWidth = width * (0.035 + seed(i + layer * 80) * 0.045) * (0.75 + approach);
        const facetDepth = Math.max(8, height * (0.07 + seed(i + 120 + layer * 30) * 0.16) * (0.55 + approach));
        ctx.beginPath();
        ctx.moveTo(x, ridgeY);
        ctx.lineTo(x - facetWidth, ridgeY + facetDepth);
        ctx.lineTo(x + facetWidth * 0.12, ridgeY + facetDepth * (0.52 + seed(i + 5) * 0.38));
        ctx.closePath();
        ctx.fillStyle = i % 2 ? '#343f32' : '#9a9272';
        ctx.globalAlpha = 0.08 + approach * 0.26;
        ctx.fill();

        if (approach > 0.48 && point.peakHeight > height * 0.32 && i % 3 === 0) {
          ctx.beginPath();
          ctx.moveTo(x, ridgeY);
          ctx.lineTo(x - facetWidth * 0.25, ridgeY + facetDepth * 0.35);
          ctx.lineTo(x + facetWidth * 0.30, ridgeY + facetDepth * 0.26);
          ctx.closePath();
          ctx.fillStyle = '#d7d4be';
          ctx.globalAlpha = Math.min(0.8, (approach - 0.35) * 1.2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    ctx.globalAlpha = 1;
    return { base: nearestMountainBase, top: nearestMountainTop };
  }

  function drawTopDownTrees(width, height, horizon, pitchValue, altitude, speed, now) {
    // Raising the nose tilts the view down over the cockpit: see a forest canopy
    // from above, with each crown rendered as an irregular, shaded cluster.
    const viewBlend = Math.max(0, Math.min(1, (pitchValue - 1) / 7));
    if (viewBlend <= 0.01 || altitude < 80) return;

    const startY = horizon + height * (0.30 - viewBlend * 0.21);
    const scroll = now * 0.00002 * Math.max(0.35, speed / 70);
    ctx.save();
    ctx.globalAlpha = 0.92 * viewBlend;
    ctx.fillStyle = '#526349';
    ctx.fillRect(0, startY, width, height - startY);

    const spacingX = Math.max(22, width / 22);
    const spacingY = Math.max(18, height / 15);
    for (let row = 0; row < 17; row++) {
      const rowPhase = ((row * spacingY + scroll * height) % (height - startY + spacingY));
      const y = startY + rowPhase;
      if (y > height + spacingY) continue;
      for (let col = -1; col < Math.ceil(width / spacingX) + 1; col++) {
        const n = row * 97 + col + 300;
        const x = col * spacingX + (row % 2) * spacingX * 0.48 + (seed(n) - 0.5) * spacingX * 0.34;
        const radius = 4 + seed(n + 11) * Math.min(13, spacingX * 0.34);
        const green = ['#314a32', '#3d5838', '#536c40', '#657348'][Math.floor(seed(n + 31) * 4)];
        ctx.fillStyle = green;
        ctx.beginPath();
        ctx.ellipse(x, y, radius * 1.13, radius * 0.78, seed(n + 8) * 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(177,174,112,.25)';
        ctx.beginPath();
        ctx.ellipse(x - radius * 0.24, y - radius * 0.2, radius * 0.46, radius * 0.28, -0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - previousTime) / 1000);
    previousTime = now;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    ctx.clearRect(0, 0, width, height);

    const speed = readNumber('speedHud');
    const altitude = readNumber('altHud');
    const heading = readNumber('flightHeading');
    const pitchValue = readNumber('pitchOut');
    const aligned = headingDifference(heading) < 48;

    if (speed > 0 && aligned) {
      // 1.6 km is only the visual approach distance; collision is triggered by
      // the mountain actually filling the view, not by elapsed time or this value.
      approach = Math.min(1.15, approach + speed * 0.000514444 * dt / 1.6);
    } else if (!aligned) {
      approach = Math.max(0, approach - dt * 0.12);
    }

    const horizon = height * (0.47 + Math.max(-8, Math.min(12, pitchValue)) * 0.012);
    const mountain = drawMountainLayer(width, height, horizon, approach, heading, altitude);
    drawTopDownTrees(width, height, horizon, pitchValue, altitude, speed, now);

    // Crash only when the nearby ridge has expanded across almost the entire
    // forward view, and the aircraft is low and still heading into it.
    const fillsView = mountain.base >= height * 0.88 && mountain.top <= height * 0.12;
    if (fillsView && altitude < 1800 && aligned && !collisionTriggered) {
      collisionTriggered = true;
      window.crashAircraft?.('mountain');
    }

    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  window.addEventListener('simulatorrestart', () => {
    approach = 0;
    collisionTriggered = false;
  });
  resize();
  requestAnimationFrame(frame);
})();
