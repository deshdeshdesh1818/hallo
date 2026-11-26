(() => {
  'use strict';
  const view = document.getElementById('view');
  if (!view) return;

  const guide = document.createElement('aside');
  guide.id = 'airportGuide';
  guide.setAttribute('aria-live', 'polite');
  guide.innerHTML = '<strong>BESTEMMING · HAVIKVELD</strong><span class="airport-course">BAAN 000° · NOORD</span><span id="airportInstruction">Houd koers 000° en vlieg rechtuit naar het veld.</span>';
  view.appendChild(guide);

  const refuel = document.createElement('button');
  refuel.id = 'refuelButton';
  refuel.type = 'button';
  refuel.hidden = true;
  refuel.textContent = '⛽ TANKEN OP HAVIKVELD';
  refuel.setAttribute('aria-label', 'Tank het vliegtuig op Havikveld en maak het klaar voor de volgende vlucht');
  view.appendChild(refuel);

  const instruction = document.getElementById('airportInstruction');
  const heading = document.getElementById('headingReadout');
  const altitude = document.getElementById('hudAltitude');
  const status = document.getElementById('statusText');
  const fuelValue = document.getElementById('fuelValue');
  const fuelMeter = document.getElementById('fuelMeter');
  const throttle = document.getElementById('throttle');
  let landedAtField = false;

  function updateGuide() {
    const statusText = status?.textContent || '';
    const landed = statusText.includes('LANDING · KLAAR OM OPNIEUW TE STARTEN');
    const fuel = Number((fuelValue?.textContent || '0').replace(',', '.')) || 0;
    const currentHeading = Number.parseInt(heading?.textContent || '0', 10) || 0;
    const feet = Number((altitude?.textContent || '0').replace(/[,.\s]/g, '')) || 0;
    refuel.hidden = !landed;
    if (landed) {
      landedAtField = true;
      instruction.textContent = fuel < 99 ? `Je staat op de baan. Er is ${Math.round(fuel)}% brandstof over; tank hier voor je volgende vlucht.` : 'Je staat op de baan. Je tank is al vol.';
      return;
    }
    if (statusText.includes('VLUCHT BEËINDIGD')) {
      instruction.textContent = 'Vlucht beëindigd. Herstart en volg daarna de koersaanwijzing.';
      landedAtField = false;
      return;
    }
    if (landedAtField && !statusText.includes('TAXI') && !statusText.includes('MOTOR DRAAIT')) landedAtField = false;
    const delta = ((360 - currentHeading + 540) % 360) - 180;
    const turn = Math.abs(delta) < 7 ? 'Koers goed: houd 000° aan.' : `Draai ${delta > 0 ? 'rechts' : 'links'} naar 000° (ongeveer ${Math.abs(Math.round(delta))}°).`;
    if (feet > 500) {
      instruction.textContent = `${turn} Daal geleidelijk richting 300–500 ft en houd de baan in zicht.`;
    } else if (feet > 120) {
      instruction.textContent = `${turn} Blijf uitgelijnd met de baan en daal rustig verder.`;
    } else {
      instruction.textContent = `${turn} Nader laag en rustig; trek niet hard op vlak voor de baan.`;
    }
  }
  setInterval(updateGuide, 300);

  refuel.addEventListener('click', () => {
    if (refuel.hidden) return;
    // On-field reset is the simulator's ground-service turn-around: the plane remains at Havikveld.
    const resetButton = document.getElementById('resetButton');
    if (!resetButton) return;
    resetButton.click();
    window.setTimeout(() => {
      if (fuelValue) fuelValue.textContent = '100';
      if (fuelMeter) fuelMeter.style.width = '100%';
      refuel.hidden = true;
      landedAtField = false;
      instruction.textContent = 'Tank gevuld. Havikveld is klaar voor vertrek; volg baan 000°.';
      updateGuide();
    }, 0);
  });
})();
