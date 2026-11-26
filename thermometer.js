(() => {
  'use strict';
  const instruments = document.querySelector('.instruments');
  if (!instruments) return;

  const thermometer = document.createElement('section');
  thermometer.className = 'instrument compact-instrument thermometer';
  thermometer.setAttribute('aria-label', 'Buitentemperatuur');
  thermometer.innerHTML = `
    <div class="instrument-title">BUITENTEMPERATUUR</div>
    <div class="readout"><strong id="temperatureValue">15</strong><small>°C</small></div>
    <div class="temperature-track" aria-hidden="true"><i id="temperatureMarker"></i></div>
    <small class="temperature-caption" id="temperatureCaption">OP VELDHOOGTE</small>`;
  instruments.appendChild(thermometer);

  const style = document.createElement('style');
  style.textContent = `
    .thermometer .readout{margin-top:12px}
    .temperature-track{position:relative;height:7px;margin:17px 2px 8px;border-radius:8px;background:linear-gradient(90deg,#76a9d0 0%,#b4d2ce 34%,#d1d58a 62%,#e7a45c 82%,#dd7058 100%)}
    .temperature-track i{position:absolute;top:50%;left:58%;width:3px;height:15px;border:1px solid #f3ead0;border-radius:2px;background:#fff;box-shadow:0 0 5px #151b18;transform:translate(-50%,-50%);transition:left .5s ease}
    .temperature-caption{display:block;color:var(--muted);font:500 9px 'DM Mono',monospace;letter-spacing:.04em}
    @media(prefers-reduced-motion:reduce){.temperature-track i{transition:none}}`;
  document.head.appendChild(style);

  const readout = document.getElementById('temperatureValue');
  const marker = document.getElementById('temperatureMarker');
  const caption = document.getElementById('temperatureCaption');
  const altitude = document.getElementById('hudAltitude');
  const weather = document.getElementById('weatherSummary');

  function updateTemperature() {
    // Approximate standard-atmosphere lapse rate: about 2°C per 1,000 ft.
    const altitudeFeet = Number((altitude?.textContent || '0').replace(/[,.\s]/g, '')) || 0;
    const weatherText = (weather?.textContent || '').toLocaleLowerCase('nl');
    let weatherOffset = 0;
    if (weatherText.includes('winter')) weatherOffset -= 5;
    else if (weatherText.includes('regen') || weatherText.includes('grijs')) weatherOffset -= 2;
    else if (weatherText.includes('opklar')) weatherOffset += 1;
    const celsius = Math.round(15 - altitudeFeet * 0.00198 + weatherOffset);
    readout.textContent = `${celsius > 0 ? '+' : ''}${celsius}`;
    marker.style.left = `${Math.max(0, Math.min(100, (celsius + 20) / 55 * 100))}%`;
    caption.textContent = altitudeFeet > 1500 ? `OP ${Math.round(altitudeFeet).toLocaleString('nl-NL')} FT` : 'OP VELDHOOGTE';
    thermometer.setAttribute('aria-label', `Buitentemperatuur ${celsius} graden Celsius`);
  }
  updateTemperature();
  setInterval(updateTemperature, 1000);
})();
