(() => {
  const viewport = document.getElementById('viewport');
  const canvas = document.getElementById('mountainLayer');
  if (!viewport || !canvas) return;

  const ctx = canvas.getContext('2d');
  const DISTANCE_TO_MOUNTAINS_KM = 8;
  let distanceTravelledKm = 0;
  let previousTime = performance.now();
  let collisionTriggered = false;

  function resize() {
    const rect = viewport.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function seed(index) {
    const value = Math.sin(index * 12.9898 + 41.7) * 43758.5453;
    return value - Math.floor(value);
  }

  function headingDifference(degrees) {
    return Math.abs(((degrees + 180) % 360) - 180);
  }

  function draw(now) {
    const dt = Math.min(0.05, (now - previousTime) / 1000);
    previousTime = now;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    ctx.clearRect(0, 0, width, height);

    const speed = Number(document.getElementById('speedHud')?.textContent) || 0;
    const altitudeText = document.getElementById('altHud')?.textContent || '0';
    const altitude = Number(altitudeText.replace(/,/g, '')) || 0;
    const heading = Number(document.getElementById('flightHeading')?.textContent) || 0;
    const alignedWithMountains = headingDifference(heading) < 48;

    // Convert indicated knots to kilometres travelled; this makes contact happen
    // after a visible approach instead of after an arbitrary few seconds.
    if (speed > 0 && alignedWithMountains) {
      distanceTravelledKm += speed * 0.000514444 * dt;
    }

    const approach = Math.min(1, distanceTravelledKm / DISTANCE_TO_MOUNTAINS_KM);
    const horizon = height * 0.47;
    const mountainBase = horizon + height * (0.025 + approach * 0.20);

    // Separate ridges have different depths, shapes, and growth rates.
    for (let layer = 0; layer < 3; layer++) {
      const depth = (layer + 1) / 3;
      const farScale = 0.72 + depth * 0.32;
      const nearGrowth = approach * (1.1 + depth * 2.4);
      const altitudeFactor = altitude > 8000 ? 0.68 : 1;
      const scale = (farScale + nearGrowth) * altitudeFactor;
      const base = mountainBase + layer * height * 0.022;
      const headingShift = ((heading + 180) % 360 - 180) / 180 * width * 0.20 * depth;
      const points = [];

      for (let i = 0; i <= 20; i++) {
        const x = -width * 0.15 + (width * 1.3 * i) / 20 + headingShift;
        const peakHeight = height * (0.12 + seed(i + layer * 31) * 0.18) * scale;
        points.push([x, base - peakHeight]);
      }

      ctx.beginPath();
      ctx.moveTo(-width * 0.15 + headingShift, base);
      for (const [x, y] of points) ctx.lineTo(x, y);
      ctx.lineTo(width * 1.15 + headingShift, base);
      ctx.closePath();
      ctx.fillStyle = ['#718066', '#5b6d50', '#485b43'][layer];
      ctx.globalAlpha = 0.88 - layer * 0.13;
      ctx.fill();

      // Add irregular lit ridgelines to make growth and depth easy to see.
      ctx.globalAlpha = 0.32;
      ctx.strokeStyle = '#e2dfbd';
      ctx.lineWidth = 1.5 + approach * 2;
      ctx.beginPath();
      points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Only crash when the simulated 8 km approach is complete, while low and
    // still pointed into the ridge. Turning away or climbing provides a way out.
    if (approach >= 1 && altitude < 8000 && alignedWithMountains && !collisionTriggered) {
      collisionTriggered = true;
      window.crashAircraft?.('mountain');
    }

    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  window.addEventListener('simulatorrestart', () => {
    distanceTravelledKm = 0;
    collisionTriggered = false;
  });

  resize();
  requestAnimationFrame(draw);
})();
