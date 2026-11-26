(() => {
  'use strict';
  const view = document.getElementById('view');
  if (!view) return;

  const guide = document.createElement('aside');
  guide.id = 'airportGuide';
  guide.setAttribute('aria-live', 'polite');
  guide.innerHTML = '<strong>BESTEMMING · TANKSTATION</strong><span class="airport-course">HAVIKVELD · BAAN 274°</span><span id="airportInstruction">Volg koers 274° naar het tankstation en land op baan 274.</span>';
  view.appendChild(guide);

  const refuel = document.createElement('button');
  refuel.id = 'refuelButton'; refuel.type = 'button'; refuel.hidden = true;
  refuel.textContent = '⛽ TANKEN OP HAVIKVELD';
  refuel.setAttribute('aria-label', 'Tank het vliegtuig op de landingsbaan 274 van Havikveld');
  view.appendChild(refuel);

  const instruction = document.getElementById('airportInstruction');
  const heading = document.getElementById('headingReadout');
  const altitude = document.getElementById('hudAltitude');
  const status = document.getElementById('statusText');
  const fuelValue = document.getElementById('fuelValue');
  const fuelMeter = document.getElementById('fuelMeter');
  let hasLandedAtFuelField = false;

  function updateGuide() {
    const statusText = status?.textContent || '';
    const isLanded = statusText.includes('LANDING · KLAAR OM OPNIEUW TE STARTEN');
    const fuel = Number((fuelValue?.textContent || '0').replace(',', '.')) || 0;
    const currentHeading = Number.parseInt(heading?.textContent || '0', 10) || 0;
    const feet = Number((altitude?.textContent || '0').replace(/[,.\s]/g, '')) || 0;
    const runwayDelta = Math.abs(((currentHeading - 274 + 540) % 360) - 180);
    const parkedAtFuelField = isLanded && runwayDelta < 22;
    refuel.hidden = !parkedAtFuelField;

    if (parkedAtFuelField) {
      hasLandedAtFuelField = true;
      instruction.textContent = fuel < 99 ? `Je staat op baan 274 bij het tankstation. Nog ${Math.round(fuel)}% brandstof; tank hier.` : 'Je staat op baan 274 bij het tankstation. De tank is vol.';
      return;
    }
    if (isLanded) {
      hasLandedAtFuelField = false;
      instruction.textContent = `Je bent geland op baan 000°. Het tankstation ligt bij baan 274°: stijg weer op en draai ongeveer ${Math.abs(Math.round(((274 - currentHeading + 540) % 360) - 180))}° naar koers 274°.`;
      return;
    }
    if (statusText.includes('VLUCHT BEËINDIGD')) {
      instruction.textContent = 'Vlucht beëindigd. Herstart en volg koers 274° naar het tankstation.';
      hasLandedAtFuelField = false;
      return;
    }
    const delta = ((274 - currentHeading + 540) % 360) - 180;
    const turn = Math.abs(delta) < 7 ? 'Koers goed: houd 274° aan.' : `Draai ${delta > 0 ? 'rechts' : 'links'} naar 274° (ongeveer ${Math.abs(Math.round(delta))}°).`;
    if (feet > 500) instruction.textContent = `${turn} Houd de snelheid veilig en daal geleidelijk richting 300–500 ft voor de nadering.`;
    else if (feet > 120) instruction.textContent = `${turn} Lijn uit met baan 274° en daal rustig verder.`;
    else instruction.textContent = `${turn} Nader baan 274° laag en rustig; trek niet hard op vlak voor de baan.`;
  }
  setInterval(updateGuide, 300);

  refuel.addEventListener('click', () => {
    if (refuel.hidden) return;
    // Refuel on the distinct 274-degree runway; do not move the aircraft or reset the flight.
    if (fuelValue) fuelValue.textContent = '100';
    if (fuelMeter) fuelMeter.style.width = '100%';
    refuel.hidden = true;
    hasLandedAtFuelField = false;
    instruction.textContent = 'Tank gevuld. Havikveld baan 274° is klaar voor vertrek.';
    updateGuide();
  });
})();
