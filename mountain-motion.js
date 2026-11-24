(() => {
  const viewport = document.getElementById('viewport');
  const canvas = document.getElementById('mountainLayer');
  if (!viewport || !canvas) return;

  const ctx = canvas.getContext('2d');
  let progress = 0;
  let lastAltitude = 0;
  let previousTime = performance.now();

  function resize() {
    const rect = viewport.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function seed(index) {
    const x = Math.sin(index * 12.9898 + 41.7) * 43758.5453;
    return x - Math.floor(x);
  }

  function draw(now) {
    const dt = Math.min(0.05, (now - previousTime) / 1000);
    previousTime = now;

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    const speedText = document.getElementById('speedHud')?.textContent || '0';
    const altText = document.getElementById('altHud')?.textContent?.replace(/,/g, '') || '0';
    const speed = Number(speedText) || 0;
    const altitude = Number(altText) || 0;

    progress += speed * dt * 0.0018;
    lastAltitude = altitude;

    // Higher altitude makes distant peaks pass below the horizon less quickly.
    const altitudeScale = 1 / (1 + Math.max(0, altitude) / 9000);
    const approach = Math.min(1, progress % 1);
    const horizon = h * (0.47 + (pitchValForDisplay() * 0.01));
    const mountainBase = horizon + h * 0.055 + approach * h * 0.10;

    for (let layer = 0; layer < 3; layer++) {
      const depth = (layer + 1) / 3;
      const phase = (progress * depth * 0.35) % 1;
      const scale = (0.55 + depth * 0.58 + phase * 0.12) * altitudeScale;
      const base = mountainBase + layer * h * 0.018;

      ctx.beginPath();
      ctx.moveTo(-w * 0.12, base);
      for (let i = 0; i <= 12; i++) {
        const lane = i / 12;
        const x = -w * 0.12 + lane * w * 1.24;
        const peak = base - h * (0.10 + seed(i + layer * 17) * 0.19) * scale;
        ctx.lineTo(x, peak);
      }
      ctx.lineTo(w * 1.12, base);
      ctx.closePath();

      const colors = ['#68755f', '#596951', '#485743'];
      ctx.fillStyle = colors[layer];
      ctx.globalAlpha = 0.72 - layer * 0.10;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(-w * 0.12, base);
      for (let i = 0; i <= 12; i++) {
        const lane = i / 12;
        const x = -w * 0.12 + lane * w * 1.24;
        const peak = base - h * (0.10 + seed(i + layer * 17) * 0.19) * scale;
        ctx.lineTo(x, peak);
      }
      ctx.strokeStyle = 'rgba(225,225,190,.16)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }

  function pitchValForDisplay() {
    const element = document.getElementById('pitchOut');
    if (!element) return 0;
    const value = parseFloat(element.textContent);
    return Number.isFinite(value) ? value : 0;
  }

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(draw);
})();
