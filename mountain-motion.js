(() => {
  const canvas = document.getElementById('mountainLayer');
  const viewport = document.getElementById('viewport');
  if (!canvas || !viewport) return;

  let approach = 0;
  let previousTime = performance.now();
  let collisionTriggered = false;
  let landscapePan = 0;
  let cloudDrift = 0;

  const seed = n => {
    const value = Math.sin(n * 127.1 + 41.7) * 43758.5453;
    return value - Math.floor(value);
  };
  const headingDifference = degrees => Math.abs(((degrees + 180) % 360) - 180);

  // A separate scenery control lets the player look/steer the landscape without
  // changing the flight controls. The ridges, forests, and clouds all respond.
  const sceneryControl = document.createElement('label');
  sceneryControl.className = 'scenery-control';
  sceneryControl.innerHTML = '<span>LANDSCHAP</span><input type="range" min="-100" max="100" value="0" aria-label="Landschap links of rechts verschuiven"><output>0</output>';
  viewport.appendChild(sceneryControl);
  const scenerySlider = sceneryControl.querySelector('input');
  const sceneryOutput = sceneryControl.querySelector('output');
  scenerySlider.addEventListener('input', () => {
    landscapePan = Number(scenerySlider.value) / 100;
    sceneryOutput.value = scenerySlider.value;
    sceneryOutput.textContent = scenerySlider.value;
  });

  function drawClouds(ctx, width, height, horizon, now) {
    cloudDrift += 0.12;
    const skyHeight = Math.max(50, horizon);
    for (let i = 0; i < 10; i++) {
      const x = ((i * width * 0.19 + cloudDrift + landscapePan * width * 0.55) % (width * 1.35)) - width * 0.15;
      const y = skyHeight * (0.12 + seed(i + 90) * 0.48);
      const size = width * (0.035 + seed(i + 110) * 0.035);
      const puffCount = 3 + Math.floor(seed(i + 23) * 3);
      ctx.save();
      ctx.globalAlpha = 0.23 + seed(i + 33) * 0.18;
      ctx.fillStyle = '#f5f2df';
      for (let puff = 0; puff < puffCount; puff++) {
        const offset = (puff - (puffCount - 1) / 2) * size * 0.42;
        ctx.beginPath();
        ctx.ellipse(x + offset, y - Math.sin(puff * 1.7) * size * 0.13,
          size * (0.35 + seed(i * 7 + puff) * 0.16),
          size * (0.13 + seed(i * 11 + puff) * 0.06), 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawForestPatches(ctx, width, height, horizon, travel, pan) {
    const colors = ['#263d2b', '#345039', '#405a3c', '#526744', '#62714a'];
    // Large deterministic patches produce woods, open fields and sparse edges,
    // instead of the previous evenly-spaced rows of identical trees.
    for (let patch = 0; patch < 24; patch++) {
      const worldRow = patch % 8;
      const worldCol = Math.floor(patch / 8);
      const z = (worldRow / 8 + travel * 0.0025) % 1;
      const y = horizon + z * z * (height - horizon);
      const patchX = ((worldCol * 0.39 + seed(patch + 300) * 0.28 + pan * 0.7 + 1) % 1) * width;
      const patchWidth = width * (0.10 + seed(patch + 350) * 0.19) * (0.65 + z);
      const treeCount = Math.floor(2 + seed(patch + 400) * 30);
      const treeSize = 2 + z * (7 + seed(patch + 450) * 15);
      for (let tree = 0; tree < treeCount; tree++) {
        const tx = patchX + (seed(patch * 71 + tree * 3) - 0.5) * patchWidth;
        const ty = y + (seed(patch * 43 + tree * 9) - 0.5) * height * (0.025 + z * 0.07);
        if (tx < -treeSize || tx > width + treeSize || ty < horizon || ty > height) continue;
        const radius = treeSize * (0.55 + seed(tree + patch * 19) * 0.8);
        ctx.fillStyle = colors[Math.floor(seed(tree * 13 + patch * 29) * colors.length)];
        ctx.beginPath();
        ctx.ellipse(tx, ty, radius, radius * (0.68 + seed(tree + 777) * 0.32), seed(tree + patch) * 2, 0, Math.PI * 2);
        ctx.fill();
        if (z > 0.45 && seed(tree + patch * 5) > 0.45) {
          ctx.fillStyle = 'rgba(190,176,112,.25)';
          ctx.beginPath();
          ctx.ellipse(tx - radius * 0.25, ty - radius * 0.22, radius * 0.35, radius * 0.2, -0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  window.drawMountainIntoWorld = (ctx, width, height, horizon, state = {}) => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - previousTime) / 1000);
    previousTime = now;
    const speed = state.speed || 0;
    const altitude = state.altitude || 0;
    const heading = state.heading || 0;
    const pitch = state.pitch || 0;
    const travel = state.travel || 0;
    const aligned = headingDifference(heading) < 48;

    // Mountains begin farther away and grow with actual forward movement.
    const clearance = Math.max(0, Math.min(1, (altitude - 450) / 4050));
    if (speed > 0 && aligned && clearance < 0.55) {
      approach = Math.min(1.25, approach + speed * 0.000514444 * dt / 3.4);
    } else if (!aligned || clearance >= 0.55) {
      approach = Math.max(0, approach - dt * (0.3 + clearance * 0.8));
    }

    drawClouds(ctx, width, height, horizon, now);

    let nearestBase = 0;
    let nearestTop = height;
    for (let layer = 0; layer < 3; layer++) {
      const depth = (layer + 1) / 3;
      const scale = (0.62 + depth * 0.34 + Math.pow(approach, 1.55) * (1.0 + depth * 3.1)) * (1 - clearance * 0.76);
      const base = horizon + height * (0.02 + Math.max(0, approach - clearance * 0.7) * (0.12 + depth * 0.19)) + clearance * height * 0.36;
      const shift = landscapePan * width * (0.4 + depth * 0.25) + ((heading + 180) % 360 - 180) / 180 * width * 0.12 * depth;
      const points = [];
      for (let i = 0; i <= 36; i++) {
        const x = -width * 0.17 + width * 1.34 * i / 36 + shift;
        const profile = 0.12 + seed(i * 0.43 + layer * 29) * 0.22 + (seed(i * 2.71 + layer * 13) - 0.5) * 0.07;
        const y = base - height * Math.max(0.05, profile) * Math.max(0.13, scale);
        points.push({ x, y });
        if (layer === 2) {
          nearestBase = Math.max(nearestBase, base);
          nearestTop = Math.min(nearestTop, y);
        }
      }

      ctx.beginPath();
      ctx.moveTo(points[0].x, base);
      points.forEach(point => ctx.lineTo(point.x, point.y));
      ctx.lineTo(points[points.length - 1].x, base);
      ctx.closePath();
      ctx.fillStyle = ['#82846a', '#646e55', '#46533e'][layer];
      ctx.globalAlpha = [0.68, 0.82, 0.97][layer] * (1 - clearance * 0.25);
      ctx.fill();
      ctx.save();
      ctx.clip();

      const detailCount = Math.floor(5 + approach * (1 - clearance * 0.6) * 28);
      for (let i = 0; i < detailCount; i++) {
        const index = Math.floor(i / detailCount * (points.length - 1));
        const point = points[index];
        const next = points[Math.min(index + 1, points.length - 1)];
        const fraction = seed(i + layer * 71);
        const x = point.x + (next.x - point.x) * fraction;
        const y = point.y + (next.y - point.y) * fraction;
        const facetWidth = width * (0.018 + seed(i + 80 + layer * 13) * 0.05) * (0.6 + approach);
        const facetHeight = height * (0.05 + seed(i + 100 + layer * 19) * 0.17) * (0.5 + approach);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - facetWidth, y + facetHeight);
        ctx.lineTo(x + facetWidth * 0.18, y + facetHeight * 0.58);
        ctx.closePath();
        ctx.fillStyle = i % 2 ? '#343f32' : '#aaa184';
        ctx.globalAlpha = 0.08 + approach * 0.3;
        ctx.fill();
      }
      ctx.restore();
    }

    drawForestPatches(ctx, width, height, horizon, travel, landscapePan);
    ctx.globalAlpha = 1;

    // The impact condition follows the rendered ridge: when it fills the view,
    // there is no remaining sky or foreground visible in the forward direction.
    const mountainFillsView = nearestTop <= height * 0.04 && nearestBase >= height * 0.96;
    if (mountainFillsView && altitude < 450 && aligned && !collisionTriggered) {
      collisionTriggered = true;
      window.crashAircraft?.('mountain');
    }
  };

  window.addEventListener('simulatorrestart', () => {
    approach = 0;
    collisionTriggered = false;
  });
})();
