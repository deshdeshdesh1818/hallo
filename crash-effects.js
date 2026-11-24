(() => {
  const cockpit = document.querySelector('.cockpit');
  const crashPanel = document.getElementById('crashPanel');
  if (!cockpit || !crashPanel) return;

  const restartButton = crashPanel.querySelector('#restartBtn');
  if (restartButton) {
    restartButton.textContent = '↻';
    restartButton.setAttribute('aria-label', 'Opnieuw starten');
    restartButton.title = 'Opnieuw starten';
  }

  let audioContext;
  let userGestureReady = false;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  async function unlockSound() {
    if (!AudioContextClass) return;
    if (!audioContext) audioContext = new AudioContextClass();
    if (audioContext.state === 'suspended') {
      try { await audioContext.resume(); } catch (_) {}
    }
    userGestureReady = audioContext.state === 'running';
  }

  // Browsers unlock Web Audio only after an explicit action.
  ['pointerdown', 'keydown', 'touchstart'].forEach(type => {
    document.addEventListener(type, unlockSound, { passive: true });
  });

  function noiseBurst(duration, volume, cutoff) {
    if (!audioContext) return;
    const now = audioContext.currentTime;
    const length = Math.floor(audioContext.sampleRate * duration);
    const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const position = i / length;
      // A short crack, then a longer low-frequency rumble.
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - position, 2.2);
    }

    const source = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();

    source.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, now);
    filter.frequency.exponentialRampToValueAtTime(55, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    source.connect(filter).connect(gain).connect(audioContext.destination);
    source.start(now);
  }

  function oscillatorThump() {
    if (!audioContext) return;
    const now = audioContext.currentTime;

    [58, 83, 118].forEach((startFrequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = index === 0 ? 'sine' : 'triangle';
      oscillator.frequency.setValueAtTime(startFrequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(index === 0 ? 24 : 38, now + 0.7);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(index === 0 ? 0.8 : 0.22, now + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.05);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + 1.08);
    });
  }

  function playImpactBoom() {
    if (!audioContext || !userGestureReady) {
      // Try to unlock once more; this is best-effort under strict browser autoplay rules.
      unlockSound().then(() => {
        if (userGestureReady) playImpactBoom();
      });
      return;
    }

    oscillatorThump();
    noiseBurst(0.18, 0.95, 1700);
    setTimeout(() => noiseBurst(0.9, 0.7, 420), 45);
  }

  let lastCrashState = false;
  function onCrashStateChanged() {
    const active = crashPanel.classList.contains('visible');
    if (active === lastCrashState) return;
    lastCrashState = active;

    cockpit.classList.toggle('crashed', active);
    if (!active) return;

    playImpactBoom();

    const viewport = document.getElementById('viewport');
    if (viewport) {
      viewport.classList.remove('impact-flash');
      void viewport.offsetWidth;
      viewport.classList.add('impact-flash');
      setTimeout(() => viewport.classList.remove('impact-flash'), 800);
    }
  }

  new MutationObserver(onCrashStateChanged)
    .observe(crashPanel, { attributes: true, attributeFilter: ['class'] });

  // Also catch crashes triggered before this script has finished loading.
  onCrashStateChanged();
})();
