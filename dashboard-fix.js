(() => {
  const controls = document.querySelector('.controls');
  const wheel = document.querySelector('.steering-wheel');
  const heading = document.getElementById('heading');
  const headingRow = heading?.closest('.control-row');
  const gauges = document.querySelector('.instruments');
  const panel = document.querySelector('.instrument-panel');
  if (!controls || !wheel || !heading) return;

  // Keep the speed/altitude/vertical instruments visible and put the wheel in
  // the dashboard control section beside the throttle and pitch controls.
  headingRow?.remove();
  controls.appendChild(wheel);
  gauges?.classList.remove('hidden');
  panel?.classList.remove('hidden');

  // Replace horizontal-drag steering with a natural turn-the-wheel gesture.
  const activeWheel = wheel.cloneNode(true);
  wheel.replaceWith(activeWheel);
  const rim = activeWheel.querySelector('.wheel-rim');
  let pointerId = null;
  let previousAngle = 0;
  let wheelRotation = 0;

  function pointerAngle(event) {
    const rect = activeWheel.getBoundingClientRect();
    return Math.atan2(event.clientY - (rect.top + rect.height / 2), event.clientX - (rect.left + rect.width / 2));
  }
  function updateCourse(degrees) {
    const current = Number(heading.value) || 0;
    heading.value = String((current + degrees + 360) % 360);
    const output = document.getElementById('headingOut');
    if (output) output.value = output.textContent = `${Math.round(Number(heading.value))}°`;
    wheelRotation += degrees * 2.2;
    rim.style.transform = `rotate(${wheelRotation}deg)`;
    window.landscapePan = Math.max(-1, Math.min(1, ((Number(heading.value) + 180) % 360 - 180) / 180));
    heading.dispatchEvent(new Event('input', { bubbles: true }));
  }
  activeWheel.addEventListener('pointerdown', event => {
    pointerId = event.pointerId;
    previousAngle = pointerAngle(event);
    activeWheel.setPointerCapture(pointerId);
    event.preventDefault();
  });
  activeWheel.addEventListener('pointermove', event => {
    if (event.pointerId !== pointerId) return;
    let angle = pointerAngle(event);
    let delta = angle - previousAngle;
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;
    previousAngle = angle;
    updateCourse(delta * 65);
  });
  const endDrag = event => { if (event.pointerId === pointerId) pointerId = null; };
  activeWheel.addEventListener('pointerup', endDrag);
  activeWheel.addEventListener('pointercancel', endDrag);
  activeWheel.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      updateCourse(event.key === 'ArrowLeft' ? -5 : 5);
      event.preventDefault();
    }
  });

  // Make sure the existing dashboard instruments render even after the control
  // layout changes, and keep their canvases at usable dimensions.
  document.querySelectorAll('.instrument canvas').forEach(canvas => {
    canvas.style.display = 'block';
    canvas.style.visibility = 'visible';
  });
})();
