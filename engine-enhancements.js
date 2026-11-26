(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const throttle = $('throttle'), view = $('view');
  if (!throttle || !view) return;

  // Failures are uncommon per departure, but when one happens the player gets a short warning.
  const notice = document.createElement('div');
  notice.id = 'engineNotice'; notice.setAttribute('role', 'alert'); notice.setAttribute('aria-live', 'assertive');
  view.appendChild(notice);
  let airborne = false, failurePlanned = false, failureTimer = 0, warningSeconds = 0;
  let failed = false, frozenThrottle = false, soundContext = null, soundOscillator = null, soundGain = null;
  let previous = performance.now();
  const showNotice = (title, text, isFailure = false) => {
    notice.innerHTML = `<strong>${title}</strong>${text}`;
    notice.classList.add('visible'); notice.classList.toggle('failed', isFailure);
  };
  const hideNotice = () => { notice.classList.remove('visible', 'failed'); };
  const restart = () => {
    airborne = false; failurePlanned = false; failureTimer = 0; warningSeconds = 0; failed = false; frozenThrottle = false;
    throttle.disabled = false; hideNotice();
  };
  $('resetButton')?.addEventListener('click', () => setTimeout(restart, 0));
  $('restartButton')?.addEventListener('click', () => setTimeout(restart, 0));

  function updateFailures(now) {
    const dt = Math.min(.25, Math.max(0, (now - previous) / 1000)); previous = now;
    const status = $('statusText')?.textContent || '';
    const inAir = status.includes('IN VLUCHT') || status.includes('NADERING') || status.includes('OVERTREK');
    if (!inAir) {
      airborne = false;
      if (!failed) { failurePlanned = false; failureTimer = 0; warningSeconds = 0; }
      return;
    }
    if (!airborne && !failed) {
      airborne = true;
      // Roughly one in three departures gets a simulated mechanical problem.
      failurePlanned = Math.random() < .34;
      failureTimer = failurePlanned ? 35 + Math.random() * 75 : 0;
    }
    if (!failurePlanned || failed) return;
    failureTimer -= dt;
    if (failureTimer <= 7 && warningSeconds === 0) {
      warningSeconds = 7;
      showNotice('MOTORSTORING · CONTROLEER DE MOTOR', 'Het toerental schommelt. Houd snelheid, zoek een landingsplek en bereid je voor op motorverlies.');
    }
    if (warningSeconds > 0) {
      warningSeconds -= dt;
      if (warningSeconds <= 0) {
        failed = true; failurePlanned = false; frozenThrottle = true;
        throttle.value = '0'; throttle.disabled = true;
        throttle.dispatchEvent(new Event('input', { bubbles: true }));
        showNotice('MOTOR UITGEVALLEN', 'Geen motorvermogen meer. Houd de neus rustig, behoud snelheid en probeer een noodlanding.', true);
      }
    }
  }
  setInterval(() => updateFailures(performance.now()), 100);

  // An additional warm engine layer makes the existing engine sound more audible.
  async function syncSound() {
    const button = $('soundButton');
    if (!button) return;
    const enabled = button.getAttribute('aria-pressed') === 'true';
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    if (!soundContext) {
      soundContext = new Audio();
      soundOscillator = soundContext.createOscillator();
      const filter = soundContext.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 360;
      soundGain = soundContext.createGain(); soundGain.gain.value = 0;
      soundOscillator.type = 'triangle'; soundOscillator.frequency.value = 82;
      soundOscillator.connect(filter).connect(soundGain).connect(soundContext.destination); soundOscillator.start();
    }
    if (enabled && soundContext.state !== 'running') await soundContext.resume();
    if (!enabled && soundContext.state === 'running') await soundContext.suspend();
  }
  $('soundButton')?.addEventListener('click', () => setTimeout(() => { syncSound().catch(() => {}); }, 120));
  setInterval(() => {
    if (!soundContext || soundContext.state !== 'running') return;
    const amount = Number(throttle.value) / 100;
    soundOscillator.frequency.setTargetAtTime(58 + amount * 62, soundContext.currentTime, .14);
    // Higher than the original quiet engine layer, but still bounded to avoid an abrupt loud spike.
    soundGain.gain.setTargetAtTime(failed ? .002 : .075 + amount * .00055, soundContext.currentTime, .18);
  }, 100);
})();
