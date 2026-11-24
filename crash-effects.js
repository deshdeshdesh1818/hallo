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
  let soundReady = false;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  async function unlockSound() {
    if (!AudioContextClass) return;
    if (!audioContext) audioContext = new AudioContextClass();
    try {
      await audioContext.resume();
      soundReady = audioContext.state === 'running';
    } catch (_) {
      soundReady = false;
    }
  }

  document.addEventListener('pointerdown', unlockSound, { passive: true });
  document.addEventListener('keydown', unlockSound);
  document.addEventListener('input', unlockSound, { passive: true });

  function playImpactBoom() {
    if (!audioContext || !soundReady || audioContext.state !== 'running') return;
    const now = audioContext.currentTime;

    // Low thump plus a short filtered noise burst makes a punchy, synthesized impact.
    const oscillator = audioContext.createOscillator();
    const thumpGain = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(82, now);
    oscillator.frequency.exponentialRampToValueAtTime(31, now + 0.72);
    thumpGain.gain.setValueAtTime(0.0001, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.9, now + 0.025);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);
    oscillator.connect(thumpGain).connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 1);

    const length = Math.floor(audioContext.sampleRate * 0.8);
    const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      const fade = Math.pow(1 - i / length, 3);
      data[i] = (Math.random() * 2 - 1) * fade;
    }
    const noise = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const noiseGain = audioContext.createGain();
    noise.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(420, now);
    filter.frequency.exponentialRampToValueAtTime(90, now + 0.65);
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.65, now + 0.018);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
    noise.connect(filter).connect(noiseGain).connect(audioContext.destination);
    noise.start(now);
    noise.stop(now + 0.82);
  }

  function onCrash(active) {
    cockpit.classList.toggle('crashed', active);
    if (!active) return;
    playImpactBoom();
    const viewport = document.getElementById('viewport');
    if (viewport) {
      viewport.classList.remove('impact-flash');
      void viewport.offsetWidth;
      viewport.classList.add('impact-flash');
      window.setTimeout(() => viewport.classList.remove('impact-flash'), 800);
    }
  }

  new MutationObserver(() => onCrash(crashPanel.classList.contains('visible')))
    .observe(crashPanel, { attributes: true, attributeFilter: ['class'] });
})();
