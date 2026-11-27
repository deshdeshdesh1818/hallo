(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const view = $('view');
  if (!view) return;

  // Draw a separate, clearly marked 274° airfield over the existing 000° runway scene.
  const canvas = document.createElement('canvas');
  canvas.id = 'airportCanvas';
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', zIndex: '2', pointerEvents: 'none' });
  view.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const guide = document.createElement('aside');
  guide.id = 'airportGuide';
  guide.setAttribute('aria-live', 'polite');
  guide.innerHTML = '<strong>BESTEMMING · TANKSTATION</strong><span class="airport-course">HAVIKVELD · BAAN 274°</span><span id="airportInstruction">Draai naar koers 274° om de aparte landingsbaan en het tankstation te vinden.</span>';
  view.appendChild(guide);

  const refuel = document.createElement('button');
  refuel.id = 'refuelButton'; refuel.type = 'button'; refuel.hidden = true;
  refuel.textContent = '⛽ TANKEN OP HAVIKVELD';
  refuel.setAttribute('aria-label', 'Tank het vliegtuig op de landingsbaan 274 van Havikveld');
  view.appendChild(refuel);

  const style = document.createElement('style');
  style.textContent = '#airportCanvas{display:block}#airportGuide,#refuelButton{z-index:7}#airportGuide{top:66px;left:16px;width:min(290px,calc(100% - 32px));padding:12px 14px;border:1px solid rgba(200,216,128,.5);border-radius:8px;background:rgba(20,27,24,.86);color:#e8e2c9;font:500 11px/1.5 "DM Mono",monospace;backdrop-filter:blur(8px);pointer-events:none}#airportGuide strong{display:block;color:#c8d880;font-size:12px;letter-spacing:.07em;margin-bottom:4px}#airportGuide .airport-course{display:block;color:#fff;font-size:13px;font-weight:700}#refuelButton{position:absolute;left:50%;bottom:54px;transform:translateX(-50%);padding:11px 16px;border:1px solid #c8d880;border-radius:7px;background:#202823;color:#e8e2c9;font:700 11px "DM Mono",monospace;cursor:pointer;box-shadow:0 6px 20px #0005}#refuelButton:hover,#refuelButton:focus-visible{background:#34402b;outline:2px solid #c8d880;outline-offset:2px}#refuelButton[hidden]{display:none}@media(max-width:600px){#airportGuide{top:58px;font-size:10px}#refuelButton{bottom:42px;width:max-content;max-width:calc(100% - 24px)}}';
  document.head.appendChild(style);

  const instruction = $('airportInstruction');
  const heading = $('headingReadout');
  const altitude = $('hudAltitude');
  const status = $('statusText');
  const fuelValue = $('fuelValue');
  const fuelMeter = $('fuelMeter');
  let landedAtFuelField = false, dpr = 1, width = 1, height = 1;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  function resize() {
    const rect = view.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, rect.width); height = Math.max(1, rect.height);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  }
  addEventListener('resize', resize); resize();

  function drawHangar(x, y, scale) {
    const w = 34 * scale, h = 21 * scale;
    ctx.fillStyle = '#6f5741'; ctx.fillRect(x - w / 2, y - h, w, h);
    ctx.fillStyle = '#b28a5e'; ctx.beginPath(); ctx.moveTo(x - w / 2 - 3 * scale, y - h); ctx.lineTo(x, y - h - 10 * scale); ctx.lineTo(x + w / 2 + 3 * scale, y - h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#31372f'; ctx.fillRect(x - 9 * scale, y - 14 * scale, 18 * scale, 14 * scale);
    ctx.strokeStyle = '#d1b68a'; ctx.lineWidth = Math.max(1, scale); ctx.strokeRect(x - 9 * scale, y - 14 * scale, 18 * scale, 14 * scale);
  }
  function drawAirport() {
    const rect = view.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
    const currentHeading = Number.parseInt(heading?.textContent || '0', 10) || 0;
    const delta = ((currentHeading - 274 + 540) % 360) - 180;
    const visibility = clamp(1 - Math.abs(delta) / 78, 0, 1);
    if (visibility <= 0) return;

    const w = width, h = height;
    const centerTop = w * .5 + Math.sin(delta * Math.PI / 180) * w * .28;
    const centerBottom = w * .5 + Math.sin(delta * Math.PI / 180) * w * .08;
    const perspective = Math.max(.22, Math.cos(delta * Math.PI / 180));
    const topY = h * .49, bottomY = h * .94;
    ctx.save(); ctx.globalAlpha = visibility;

    // Apron and connected taxiway lead from the grass field to the runway threshold.
    ctx.fillStyle = '#81816d'; ctx.beginPath(); ctx.ellipse(centerTop - w * .16, topY + h * .13, w * .095 * perspective, h * .035, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#686d60'; ctx.beginPath(); ctx.moveTo(centerTop - w*.13*perspective, topY+h*.12); ctx.lineTo(centerTop-w*.09*perspective, topY+h*.10); ctx.lineTo(centerBottom-w*.23*perspective, bottomY-h*.12); ctx.lineTo(centerBottom-w*.29*perspective, bottomY-h*.12); ctx.closePath(); ctx.fill();

    // A wide, paved runway with threshold bars, centerline, edge lights and runway numbers.
    ctx.fillStyle = '#4c514e'; ctx.beginPath(); ctx.moveTo(centerTop - w*.025*perspective, topY); ctx.lineTo(centerTop + w*.025*perspective, topY); ctx.lineTo(centerBottom + w*.31*perspective, bottomY); ctx.lineTo(centerBottom - w*.31*perspective, bottomY); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#d9d4bf'; ctx.lineWidth = Math.max(1, 2 * perspective); ctx.beginPath(); ctx.moveTo(centerTop-w*.025*perspective,topY);ctx.lineTo(centerBottom-w*.31*perspective,bottomY);ctx.moveTo(centerTop+w*.025*perspective,topY);ctx.lineTo(centerBottom+w*.31*perspective,bottomY);ctx.stroke();
    for (let i=0;i<8;i++) {
      const t = .035 + i * .012, y = topY + (bottomY-topY)*t, runwayWidth = w*(.05+t*.57)*perspective;
      ctx.fillStyle = '#eee9d6'; ctx.fillRect(centerTop+(centerBottom-centerTop)*t-runwayWidth*.38, y, runwayWidth*.12, Math.max(2,h*t*.018));
      ctx.fillRect(centerTop+(centerBottom-centerTop)*t+runwayWidth*.26, y, runwayWidth*.12, Math.max(2,h*t*.018));
    }
    ctx.setLineDash([Math.max(3, h*.012), Math.max(3,h*.013)]); ctx.strokeStyle = '#eee9d6'; ctx.lineWidth = Math.max(1, h*.003);
    ctx.beginPath(); ctx.moveTo(centerTop,topY+h*.055); ctx.lineTo(centerBottom,bottomY-h*.025); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#f3edda'; ctx.font = `bold ${Math.max(10, Math.min(20,w*.026))}px "DM Mono",monospace`; ctx.textAlign='center';
    ctx.save(); const numberX=centerTop+(centerBottom-centerTop)*.12, numberY=topY+h*.105; ctx.translate(numberX,numberY); ctx.rotate(Math.atan2(centerBottom-centerTop,bottomY-topY)); ctx.fillText('274',0,0); ctx.restore();

    // Threshold lights and PAPI approach lights identify the proper approach end.
    const lights = 9;
    for(let i=0;i<lights;i++){
      const f=i/(lights-1)-.5, x=centerTop+f*w*.047*perspective, y=topY-h*.014;
      ctx.fillStyle=i%2?'#f7f0d7':'#ffdd9b';ctx.beginPath();ctx.arc(x,y,Math.max(1.4,w*.002),0,Math.PI*2);ctx.fill();
    }
    for(let i=0;i<4;i++){ctx.fillStyle=i<2?'#e85e4d':'#f3eee0';ctx.fillRect(centerTop-w*.075+i*w*.012,topY-h*.035,Math.max(2,w*.005),Math.max(3,h*.016));}

    // Small airfield buildings, control tower, windsock and fuel pumps beside the apron.
    const sideX = centerTop - w*.22*perspective, buildingY = topY+h*.13;
    drawHangar(sideX, buildingY, clamp(w/900,.55,1.1));
    const towerX=sideX-w*.07, towerY=buildingY-2;
    ctx.fillStyle='#d2c8a9';ctx.fillRect(towerX-4,towerY-34,8,34);ctx.fillStyle='#526c70';ctx.fillRect(towerX-8,towerY-41,16,8);ctx.fillStyle='#e2d4a8';ctx.fillRect(towerX-10,towerY-44,20,3);
    ctx.strokeStyle='#e5dec7';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(towerX,towerY-44);ctx.lineTo(towerX,towerY-59);ctx.stroke();ctx.fillStyle='#e46d54';ctx.beginPath();ctx.arc(towerX,towerY-60,2.5,0,Math.PI*2);ctx.fill();
    // Fuel island: canopy, pump stands and bright fuel markers.
    const pumpX=sideX+w*.075, pumpY=buildingY+2;
    ctx.fillStyle='#bd9b60';ctx.fillRect(pumpX-17,pumpY-18,34,4);ctx.fillStyle='#51493b';ctx.fillRect(pumpX-14,pumpY-14,3,14);ctx.fillRect(pumpX+11,pumpY-14,3,14);
    for(let i=0;i<2;i++){ctx.fillStyle='#d7d1b7';ctx.fillRect(pumpX-8+i*12,pumpY-12,7,12);ctx.fillStyle='#e46d54';ctx.fillRect(pumpX-6+i*12,pumpY-9,3,3);}
    ctx.font=`bold ${Math.max(8,w*.011)}px "DM Mono",monospace`;ctx.fillStyle='#f1e7c7';ctx.textAlign='left';ctx.fillText('HAVIKVELD · TANKSTATION',sideX-w*.04,buildingY+h*.035);
    // Windsock on the opposite side helps the player identify the airfield.
    const sockX=centerTop+w*.16*perspective, sockY=topY+h*.12;
    ctx.strokeStyle='#d8d0bb';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(sockX,sockY);ctx.lineTo(sockX,sockY-28);ctx.stroke();
    ctx.fillStyle='#e4a95c';ctx.beginPath();ctx.moveTo(sockX,sockY-27);ctx.lineTo(sockX+24,sockY-24);ctx.lineTo(sockX+17,sockY-20);ctx.lineTo(sockX+24,sockY-16);ctx.lineTo(sockX,sockY-17);ctx.closePath();ctx.fill();
    ctx.restore();
  }

  const instruction = $('airportInstruction'), status = $('statusText'), fuelValue = $('fuelValue'), fuelMeter = $('fuelMeter');
  function updateGuide() {
    const statusText=status?.textContent||'', landed=statusText.includes('LANDING · KLAAR OM OPNIEUW TE STARTEN');
    const fuel=Number((fuelValue?.textContent||'0').replace(',','.'))||0;
    const currentHeading=Number.parseInt(heading?.textContent||'0',10)||0;
    const feet=Number((altitude?.textContent||'0').replace(/[,.\\s]/g,''))||0;
    const runwayDelta=Math.abs(((currentHeading-274+540)%360)-180);
    const parkedAtFuelField=landed&&runwayDelta<22;
    refuel.hidden=!parkedAtFuelField;
    if(parkedAtFuelField){landedAtFuelField=true;instruction.textContent=fuel<99?`Je staat op de verharde baan 274 naast het tankstation. Nog ${Math.round(fuel)}% brandstof; tank hier.`:'Je staat op de verharde baan 274 naast het tankstation. De tank is vol.';return;}
    if(landed){landedAtFuelField=false;instruction.textContent=`Je bent geland op baan 000°. Het aparte tankstation heeft een verharde baan 274°: stijg op en draai naar koers 274°.`;return;}
    if(statusText.includes('VLUCHT BEËINDIGD')){instruction.textContent='Vlucht beëindigd. Herstart en volg de koersaanwijzing naar Havikveld baan 274°.';landedAtFuelField=false;return;}
    const delta=((274-currentHeading+540)%360)-180;
    const turn=Math.abs(delta)<7?'Koers goed: houd 274° aan.':`Draai ${delta>0?'rechts':'links'} naar 274° (ongeveer ${Math.abs(Math.round(delta))}°).`;
    if(Math.abs(delta)>78) instruction.textContent=`${turn} Draai tot de aanwijzing voor Havikveld verschijnt.`;
    else if(feet>500) instruction.textContent=`${turn} Je ziet de verharde baan, verkeerstoren en tankstation. Daal geleidelijk richting 300–500 ft.`;
    else if(feet>120) instruction.textContent=`${turn} Lijn uit met de gemarkeerde baan 274° en daal rustig verder.`;
    else instruction.textContent=`${turn} Volg de witte baanmarkeringen; nader laag en rustig.`;
  }
  refuel.addEventListener('click',()=>{
    if(refuel.hidden)return;
    // Keep the plane on the runway while servicing it.
    if(fuelValue)fuelValue.textContent='100';if(fuelMeter)fuelMeter.style.width='100%';
    refuel.hidden=true;landedAtFuelField=false;instruction.textContent='Tank gevuld. Havikveld baan 274° is klaar voor vertrek.';updateGuide();
  });
  resize(); drawAirport(); setInterval(()=>{drawAirport();updateGuide();},150);
})();
