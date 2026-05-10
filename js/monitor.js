// Monitor

function isMonitorRdwc(grow) {
  return grow && grow.system === 'RDWC';
}

function renderMonitor(){
  const mc = document.getElementById('monitorContent');
  if(!myGrow){
    mc.innerHTML=`<div class="empty-state"><div class="empty-icon"><i class="ti ti-gauge"></i></div><p>Aún no hay cultivo activo.</p><p class="empty-hint">Ve a <strong>Sistema</strong> y completa el checklist, o elige una variedad en <strong>Más → Variedades</strong>.</p><button type="button" class="btn btn-primary" onclick="navTo('cultivo')">Abrir Sistema</button></div>`;
    return;
  }
  const s = myGrow.strain;
    const daysSince = Math.floor((new Date()-myGrow.startDate)/86400000);
  const weekNum = Math.max(1,Math.ceil((daysSince+1)/7));
  const n = nutrients.find(x=>x.rank===myGrow.nutri)||nutrients[0];
  const selectedPlant = myGrow.selectedPlant || 1;
  const smartAlerts = buildSmartAlerts(myGrow, s, weekNum);
  const rdwc = isMonitorRdwc(myGrow);
  const latestCircuit = getLatestMeasurementForPlant(myGrow, selectedPlant);
  const phLive = latestCircuit && Number.isFinite(latestCircuit.ph) ? latestCircuit.ph : null;
  const ecLive = latestCircuit && Number.isFinite(latestCircuit.ec) ? latestCircuit.ec : null;
  const phaseRefQuick = getPhaseReference(s, weekNum);
  const phPct = phLive != null ? Math.min(100, Math.max(0, ((phLive - 4.5) / (8.5 - 4.5)) * 100)) : 72;
  const ecPct = ecLive != null ? Math.min(100, (ecLive / 3) * 100) : Math.min(100, s.ecFlower / 3 * 100);
  const climateCard = myGrow.climate
    ? `<div class="alert info"><i class="ti ti-cloud"></i><p><strong>${myGrow.location || 'Ubicación'} (${myGrow.placement})</strong> · ${myGrow.climate.summary} · ${myGrow.climate.temperature}°C · HR ${myGrow.climate.humidity}% · Viento ${myGrow.climate.wind} km/h · Fuente: ${myGrow.climate.source}</p></div>`
    : '';
  const rdwcSamplingNote = rdwc
    ? `<div class="alert info"><i class="ti ti-flask-2"></i><p><strong>RDWC:</strong> la solución es <strong>común a todo el circuito</strong>. El pH y la EC se miden en el <strong>depósito de control</strong> (o en el mismo volumen recirculado), no en cada cubo por separado. Aquí guardas una lectura representativa del circuito.</p></div>`
    : '';

  mc.innerHTML=`
    ${climateCard}
    ${rdwcSamplingNote}
    <div class="grid4 monitor-metrics">
      <div class="metric"><div class="metric-label">pH ${rdwc ? '(circuito)' : 'actual'}</div><div class="metric-val c-blue">${phLive != null ? phLive.toFixed(1) : '—'}</div><div class="metric-unit">${phaseRefQuick.phMin.toFixed(1)}–${phaseRefQuick.phMax.toFixed(1)} objetivo (${phaseRefQuick.phase})</div><div class="metric-bar"><div class="metric-fill metric-fill--ph" style="--fill-pct:${phPct.toFixed(0)}%"></div></div></div>
      <div class="metric"><div class="metric-label">EC ${rdwc ? '(circuito)' : 'actual'}</div><div class="metric-val c-green">${ecLive != null ? ecLive.toFixed(2) : s.ecFlower.toFixed(1)}</div><div class="metric-unit">mS/cm</div><div class="metric-bar"><div class="metric-fill metric-fill--ec" style="--fill-pct:${ecPct.toFixed(0)}%"></div></div></div>
      <div class="metric"><div class="metric-label">Temp. agua</div><div class="metric-val c-purple">${s.tempWater+1}°C</div><div class="metric-unit">óptimo ${s.tempWater}–${s.tempWater+2}°C</div></div>
      <div class="metric"><div class="metric-label">DO estimado</div><div class="metric-val c-blue">8.2</div><div class="metric-unit">mg/L (>6 óptimo)</div></div>
    </div>

    <div class="grid2">
      <div class="card">
        <div class="card-header"><div class="card-title"><i class="ti ti-list"></i>Registro de cultivo</div></div>
        <div class="log-list">
          ${myGrow.log.map(e=>`<div class="log-entry"><div class="log-icon ${e.type}"><i class="ti ti-${e.type==='ok'?'check':e.type==='warn'?'alert-triangle':'info-circle'}"></i></div><div><div class="log-text">${e.text}</div><div class="log-time">${new Date(e.date).toLocaleDateString('es-ES')} ${new Date(e.date).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}</div></div></div>`).join('')}
        </div>
        <div class="log-add-bar">
          <input id="logInput" class="input-grow" type="text" placeholder="Añadir observación...">
          <button class="btn btn-primary btn--compact" onclick="addLog()" type="button">Añadir</button>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title"><i class="ti ti-alert-triangle"></i>Alertas activas</div></div>
        ${myGrow.ambTemp>28?`<div class="alert warn"><i class="ti ti-thermometer"></i><p>Temperatura ambiente ${myGrow.ambTemp}°C detectada. Riesgo de solución caliente. Monitorear agua — no superar 23°C.</p></div>`:''}
        <div class="alert info"><i class="ti ti-calendar"></i><p>Próxima renovación de solución recomendada: en ${10-(daysSince%10)} días.</p></div>
        <div class="alert info"><i class="ti ti-droplet"></i><p>Calibrar medidor pH con tampón 7.0 cada 7 días. Último calibrado: verificar manualmente.</p></div>
        ${weekNum>=myGrow.strain.vegW+myGrow.strain.flowerW-2?`<div class="alert warn"><i class="ti ti-scissors"></i><p>Inicio del periodo de Flush recomendado. Cambiar a agua RO · EC 0.1–0.3 · pH 6.0</p></div>`:''}
        ${smartAlerts.length?smartAlerts.map(a=>`<div class="alert ${a.level==='danger'?'danger':a.level==='warn'?'warn':'info'}"><i class="ti ti-${a.icon}"></i><p>${a.message}</p></div>`).join(''):`<div class="alert info"><i class="ti ti-check"></i><p>Sin alertas críticas en la última medición registrada.</p></div>`}
      </div>
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title"><i class="ti ti-flask"></i>Nutriente activo: ${n.name}</div></div>
      <div class="grid2">
        <div>
          <div class="section-label">Dosis esta semana</div>
          <div class="body-prose body-prose--roomy">
            ${weekNum<=1?n.phases.germ:weekNum<=s.vegW?n.phases.veg:weekNum>=s.vegW+s.flowerW?n.phases.flush:n.phases.flower}
          </div>
        </div>
        <div>
          <div class="section-label">Aditivos recomendados</div>
          <div class="pill-tag-row">${n.aditivos.map(a=>`<span class="pill-tag">${a}</span>`).join('')}</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title"><i class="ti ti-report-analytics"></i>Registro diario de mediciones</div></div>
      <div class="grid4">
        <div class="form-group">${rdwc ? `<label>Sitio de la lectura</label><p class="form-static-text">Circuito RDWC (depósito de control / solución común)</p><input type="hidden" id="mPlant" value="0">` : `<label>Planta</label>
          <select id="mPlant">
            ${Array.from({length:getPlantCount(myGrow)},(_,i)=>`<option value="${i+1}" ${selectedPlant===i+1?'selected':''}>P${i+1}</option>`).join('')}
          </select>`}
        </div>
        <div class="form-group"><label>pH</label><input id="mPH" type="number" step="0.1" min="4.5" max="8.5" placeholder="6.0"></div>
        <div class="form-group"><label>EC (mS/cm)</label><input id="mEC" type="number" step="0.01" min="0" max="4" placeholder="1.85"></div>
        <div class="form-group"><label>Volumen (L)</label><input id="mVolume" type="number" step="0.1" min="1" max="2000" placeholder="${myGrow.reservoirL||60}"></div>
      </div>
      <div class="grid4">
        <div class="form-group"><label>Temp. agua (°C)</label><input id="mWaterTemp" type="number" step="0.1" min="10" max="35" placeholder="19.0"></div>
        <div class="form-group"><label>Temp. aire (°C)</label><input id="mAirTemp" type="number" step="0.1" min="10" max="45" placeholder="24.0"></div>
        <div class="form-group"><label>Humedad (%)</label><input id="mHumidity" type="number" step="1" min="20" max="95" placeholder="55"></div>
        <div class="form-group"><label>CO₂ (ppm)</label><input id="mCO2" type="number" step="10" min="300" max="2000" placeholder="${myGrow.co2==='si'?'1200':'400'}"></div>
      </div>
      <div class="grid2">
        <div class="form-group"><label>Notas</label><input id="mNote" type="text" placeholder="Observaciones del día"></div>
      </div>
      <button type="button" class="btn btn-primary" onclick="addMeasurement()"><i class="ti ti-plus"></i> Guardar medición</button>
      ${renderMeasurementsTable()}
      ${renderPlantTrendCard()}
    </div>
  `;
}

function addLog(){
  const inp=document.getElementById('logInput');
  if(!inp||!inp.value.trim()||!myGrow)return;
  myGrow.log.unshift({date:new Date().toISOString(),text:inp.value.trim(),type:'info'});
  saveGrowState();
  inp.value='';
  renderMonitor();
}

function addMeasurement() {
  if (!myGrow) return;
  const rdwc = isMonitorRdwc(myGrow);
  const plantId = rdwc ? 0 : parseInt(document.getElementById('mPlant')?.value, 10) || (myGrow.selectedPlant || 1);
  if (!rdwc) myGrow.selectedPlant = plantId;
  const reading = {
    date: new Date().toISOString(),
    plantId,
    ph: parseFloat(document.getElementById('mPH')?.value),
    ec: parseFloat(document.getElementById('mEC')?.value),
    volume: parseFloat(document.getElementById('mVolume')?.value),
    waterTemp: parseFloat(document.getElementById('mWaterTemp')?.value),
    airTemp: parseFloat(document.getElementById('mAirTemp')?.value),
    humidity: parseFloat(document.getElementById('mHumidity')?.value),
    co2: parseFloat(document.getElementById('mCO2')?.value),
    note: (document.getElementById('mNote')?.value || '').trim(),
  };

  if (!Number.isFinite(reading.ph) || reading.ph < 4.5 || reading.ph > 8.5) {
    myGrow.log.unshift({ date: new Date().toISOString(), text: 'Medición rechazada: pH fuera de rango (4.5–8.5).', type: 'warn' });
    saveGrowState();
    renderMonitor();
    return;
  }
  if (!Number.isFinite(reading.ec) || reading.ec < 0 || reading.ec > 4) {
    myGrow.log.unshift({ date: new Date().toISOString(), text: 'Medición rechazada: EC fuera de rango (0–4).', type: 'warn' });
    saveGrowState();
    renderMonitor();
    return;
  }

  myGrow.measurements = Array.isArray(myGrow.measurements) ? myGrow.measurements : [];
  myGrow.measurements.unshift(reading);
  myGrow.measurements = myGrow.measurements.slice(0, 30);
  const scopeLabel = rdwc ? 'circuito RDWC' : `P${plantId}`;
  myGrow.log.unshift({
    date: new Date().toISOString(),
    text: `Medición diaria guardada (${scopeLabel}) · pH ${reading.ph.toFixed(1)} · EC ${reading.ec.toFixed(2)} · Vol ${reading.volume || myGrow.reservoirL}L`,
    type: 'ok',
  });
  saveGrowState();
  renderMonitor();
}

function renderMeasurementsTable() {
  const plantId = myGrow.selectedPlant || 1;
  const rows = getMeasurementsByPlant(myGrow, plantId).slice(0, 7);
  const rdwc = isMonitorRdwc(myGrow);
  if (!rows.length) {
    const hint = rdwc ? 'el circuito RDWC (depósito de control).' : `la planta P${plantId}.`;
    return `<div class="alert info alert--mt"><i class="ti ti-info-circle"></i><p>Aún no hay mediciones diarias guardadas para ${hint}</p></div>`;
  }
  return `
    <div class="table-scroll table-scroll--mt">
      <table class="week-table">
        <thead><tr><th>Fecha</th><th>${rdwc ? 'Sitio' : 'Planta'}</th><th>pH</th><th>EC</th><th>Vol (L)</th><th>Tª agua</th><th>Tª aire</th><th>HR</th><th>CO₂</th><th>Notas</th></tr></thead>
        <tbody>
          ${rows.map(r=>`<tr>
            <td>${new Date(r.date).toLocaleDateString('es-ES')} ${new Date(r.date).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}</td>
            <td class="ec-val">${measurementSiteLabel(myGrow, r)}</td>
            <td class="ec-val">${Number.isFinite(r.ph)?r.ph.toFixed(1):'—'}</td>
            <td class="ec-val">${Number.isFinite(r.ec)?r.ec.toFixed(2):'—'}</td>
            <td>${Number.isFinite(r.volume)?r.volume.toFixed(1):'—'}</td>
            <td>${Number.isFinite(r.waterTemp)?r.waterTemp.toFixed(1)+'°C':'—'}</td>
            <td>${Number.isFinite(r.airTemp)?r.airTemp.toFixed(1)+'°C':'—'}</td>
            <td>${Number.isFinite(r.humidity)?r.humidity.toFixed(0)+'%':'—'}</td>
            <td>${Number.isFinite(r.co2)?r.co2.toFixed(0)+' ppm':'—'}</td>
            <td>${r.note || '—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderPlantTrendCard() {
  const plantId = myGrow.selectedPlant || 1;
  const rows = getMeasurementsByPlant(myGrow, plantId).slice(0, 14).reverse();
  if (!rows.length) return '';
  const strain = myGrow.strain;
  const daysSince = Math.floor((new Date()-myGrow.startDate)/86400000);
  const weekNum = Math.max(1,Math.ceil((daysSince+1)/7));
  const phaseRef = getPhaseReference(strain, weekNum);
  const rdwc = isMonitorRdwc(myGrow);
  const scopeTitle = rdwc ? 'Circuito (solución común)' : `Planta P${plantId}`;
  return `
    <div class="card-sm trend-card">
      <div class="section-label section-label--block">
        Tendencia pH y EC · ${scopeTitle} · ${phaseRef.phase}
      </div>
      ${renderPlantTrendSvg(rows, phaseRef)}
    </div>
  `;
}

function renderPlantTrendSvg(rows, phaseRef) {
  const valid = rows.filter((r) => Number.isFinite(r.ph) && Number.isFinite(r.ec));
  if (valid.length < 2) {
    return `<div class="alert info"><i class="ti ti-info-circle"></i><p>Necesitas al menos 2 mediciones válidas para ver la tendencia.</p></div>`;
  }
  const width = 820;
  const height = 268;
  const padL = 52;
  const padR = 54;
  const padT = 44;
  const padB = 46;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const baseY = height - padB;
  const phMin = 5.0;
  const phMax = 7.0;
  const ecMin = 0.0;
  const ecMax = 3.0;

  const denom = Math.max(1, valid.length - 1);
  const toX = (i) => padL + (i / denom) * innerW;
  const toYPh = (v) => padT + (1 - (Math.max(phMin, Math.min(phMax, v)) - phMin) / (phMax - phMin)) * innerH;
  const toYEc = (v) => padT + (1 - (Math.max(ecMin, Math.min(ecMax, v)) - ecMin) / (ecMax - ecMin)) * innerH;

  const phPts = valid.map((r, i) => ({ x: toX(i), y: toYPh(r.ph), r }));
  const ecPts = valid.map((r, i) => ({ x: toX(i), y: toYEc(r.ec), r }));
  const phPoints = phPts.map((p) => `${p.x},${p.y}`).join(' ');
  const ecPoints = ecPts.map((p) => `${p.x},${p.y}`).join(' ');
  const phTargetY1 = toYPh(phaseRef.phMin);
  const phTargetY2 = toYPh(phaseRef.phMax);
  const ecTargetY1 = toYEc(phaseRef.ecMin);
  const ecTargetY2 = toYEc(phaseRef.ecMax);

  const phAreaD = (() => {
    if (!phPts.length) return '';
    const first = phPts[0];
    const last = phPts[phPts.length - 1];
    const seg = phPts.map((p) => `L ${p.x} ${p.y}`).join(' ');
    return `M ${first.x} ${baseY} ${seg} L ${last.x} ${baseY} Z`;
  })();
  const ecAreaD = (() => {
    if (!ecPts.length) return '';
    const first = ecPts[0];
    const last = ecPts[ecPts.length - 1];
    const seg = ecPts.map((p) => `L ${p.x} ${p.y}`).join(' ');
    return `M ${first.x} ${baseY} ${seg} L ${last.x} ${baseY} Z`;
  })();

  const phGridTicks = [5, 5.5, 6, 6.5, 7];
  const phGrid = phGridTicks
    .map((v) => {
      const y = toYPh(v);
      return `<line x1="${padL}" y1="${y}" x2="${width - padR}" y2="${y}" class="trend-grid-line"></line><text x="${padL - 8}" y="${y + 3}" class="trend-axis-num trend-axis-num--left">${v.toFixed(1)}</text>`;
    })
    .join('');

  const ecTicks = [0, 0.5, 1, 1.5, 2, 2.5, 3];
  const ecGrid = ecTicks
    .map((v) => {
      const y = toYEc(v);
      return `<text x="${width - padR + 8}" y="${y + 3}" class="trend-axis-num trend-axis-num--right">${v.toFixed(1)}</text>`;
    })
    .join('');

  const vGrid = valid
    .map((_, i) => {
      const x = toX(i);
      return `<line x1="${x}" y1="${padT}" x2="${x}" y2="${baseY}" class="trend-grid-line trend-grid-line--vert"></line>`;
    })
    .join('');

  const labels = valid
    .map((row, i) => {
      const x = toX(i);
      const date = new Date(row.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
      return `<text x="${x}" y="${height - 18}" class="trend-label">${date}</text>`;
    })
    .join('');

  const legend = `
    <g class="trend-legend" transform="translate(${padL + innerW - 168}, ${padT - 28})">
      <rect x="0" y="-10" width="168" height="36" rx="8" class="trend-legend-box"></rect>
      <line x1="12" y1="8" x2="28" y2="8" class="trend-legend-line trend-legend-line--ph"></line>
      <text x="34" y="11" class="trend-legend-text">pH</text>
      <line x1="78" y1="8" x2="94" y2="8" class="trend-legend-line trend-legend-line--ec"></line>
      <text x="100" y="11" class="trend-legend-text">EC</text>
    </g>`;

  const titleBlock = `
    <text x="${padL}" y="22" class="trend-chart-title">Evolución pH / EC</text>
    <text x="${padL}" y="36" class="trend-chart-sub">Bandas = rango objetivo · ${phaseRef.phase}</text>`;

  const dots = valid
    .map((r, i) => {
      const x = toX(i);
      const yp = toYPh(r.ph);
      const ye = toYEc(r.ec);
      const tip = `${new Date(r.date).toLocaleString('es-ES')} · pH ${r.ph.toFixed(2)} · EC ${r.ec.toFixed(2)}`;
      return `<circle cx="${x}" cy="${yp}" r="4.5" class="trend-ph-dot"><title>${tip}</title></circle>
        <circle cx="${x}" cy="${ye}" r="4.5" class="trend-ec-dot"><title>${tip}</title></circle>`;
    })
    .join('');

  return `
    <div class="plant-trend-scroll">
    <svg viewBox="0 0 ${width} ${height}" class="plant-trend-svg" role="img" aria-label="Tendencia de pH y EC">
      <defs>
        <linearGradient id="trendPhFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--b400)" stop-opacity="0.22"/>
          <stop offset="100%" stop-color="var(--b400)" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="trendEcFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--g400)" stop-opacity="0.18"/>
          <stop offset="100%" stop-color="var(--g400)" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${width}" height="${height}" rx="12" class="trend-bg"></rect>
      ${titleBlock}
      ${legend}
      <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${baseY}" class="trend-axis trend-axis--main"></line>
      <line x1="${width - padR}" y1="${padT}" x2="${width - padR}" y2="${baseY}" class="trend-axis trend-axis--secondary"></line>
      <line x1="${padL}" y1="${baseY}" x2="${width - padR}" y2="${baseY}" class="trend-axis trend-axis--main"></line>
      <text x="${padL}" y="${padT - 6}" class="trend-axis-caption">pH (5–7)</text>
      <text x="${width - padR - 72}" y="${padT - 6}" class="trend-axis-caption trend-axis-caption--right">EC mS/cm (0–3)</text>

      ${phGrid}
      ${vGrid}
      ${ecGrid}

      <rect x="${padL}" y="${Math.min(phTargetY1, phTargetY2)}" width="${innerW}" height="${Math.abs(phTargetY2 - phTargetY1)}" class="trend-ph-band"></rect>
      <rect x="${padL}" y="${Math.min(ecTargetY1, ecTargetY2)}" width="${innerW}" height="${Math.abs(ecTargetY2 - ecTargetY1)}" class="trend-ec-band"></rect>

      <path d="${phAreaD}" fill="url(#trendPhFill)" class="trend-ph-area"></path>
      <path d="${ecAreaD}" fill="url(#trendEcFill)" class="trend-ec-area"></path>

      <polyline points="${phPoints}" fill="none" class="trend-ph-line"></polyline>
      <polyline points="${ecPoints}" fill="none" class="trend-ec-line"></polyline>

      ${dots}
      ${labels}
    </svg>
    </div>
  `;
}

function buildSmartAlerts(grow, strain, weekNum) {
  const alerts = [];
  const plantId = grow.selectedPlant || 1;
  const rdwc = isMonitorRdwc(grow);
  const tag = rdwc ? 'Circuito' : `P${plantId}`;
  const latest = getLatestMeasurementForPlant(grow, plantId);
  if (!latest) {
    alerts.push({
      level: 'info',
      icon: 'clipboard-text',
      message: rdwc
        ? 'Añade una medición del depósito de control para activar alertas sobre la solución común del RDWC.'
        : `Añade una medición diaria para activar alertas inteligentes en P${plantId}.`,
    });
    return alerts;
  }

  const phaseRef = getPhaseReference(strain, weekNum);
  if (Number.isFinite(latest.ph) && (latest.ph < phaseRef.phMin || latest.ph > phaseRef.phMax)) {
    alerts.push({
      level: 'warn',
      icon: 'beaker',
      message: `${tag}: pH fuera de rango para ${phaseRef.phase}: ${latest.ph.toFixed(1)} (objetivo ${phaseRef.phMin.toFixed(1)}-${phaseRef.phMax.toFixed(1)}).`,
    });
  }

  if (Number.isFinite(latest.ec) && latest.ec < phaseRef.ecMin) {
    alerts.push({
      level: 'warn',
      icon: 'battery-2',
      message: `${tag}: EC baja para ${phaseRef.phase}: ${latest.ec.toFixed(2)} mS/cm (mínimo recomendado ${phaseRef.ecMin.toFixed(2)}).`,
    });
  }
  if (Number.isFinite(latest.ec) && latest.ec > phaseRef.ecMax) {
    alerts.push({
      level: 'danger',
      icon: 'flame',
      message: `${tag}: EC alta para ${phaseRef.phase}: ${latest.ec.toFixed(2)} mS/cm (máximo recomendado ${phaseRef.ecMax.toFixed(2)}).`,
    });
  }

  if (Number.isFinite(latest.waterTemp) && latest.waterTemp > 23) {
    alerts.push({
      level: 'danger',
      icon: 'temperature',
      message: `${tag}: Temperatura de agua elevada (${latest.waterTemp.toFixed(1)}°C). Riesgo de bajo oxígeno disuelto y estrés radicular.`,
    });
  }
  if (Number.isFinite(latest.humidity) && latest.humidity > phaseRef.humidityMax) {
    alerts.push({
      level: 'warn',
      icon: 'droplet-filled',
      message: `${tag}: Humedad alta (${latest.humidity.toFixed(0)}%) para ${phaseRef.phase}. Riesgo de hongos/botrytis.`,
    });
  }
  if (Number.isFinite(latest.humidity) && latest.humidity < phaseRef.humidityMin) {
    alerts.push({
      level: 'warn',
      icon: 'wind',
      message: `${tag}: Humedad baja (${latest.humidity.toFixed(0)}%). Puede frenar crecimiento y aumentar estrés hídrico.`,
    });
  }
  return alerts;
}

function getPhaseReference(strain, weekNum) {
  if (weekNum <= 1) {
    return { phase: 'Germinación', ecMin: 0.3, ecMax: 0.6, phMin: 5.5, phMax: 5.8, humidityMin: 70, humidityMax: 90 };
  }
  if (weekNum <= strain.vegW) {
    return { phase: 'Vegetación', ecMin: strain.ecVeg, ecMax: strain.ecVeg + 0.5, phMin: 5.6, phMax: 6.0, humidityMin: 55, humidityMax: 70 };
  }
  if (weekNum <= strain.vegW + 2) {
    return { phase: 'Prefloración', ecMin: (strain.ecVeg + strain.ecFlower) / 2, ecMax: strain.ecFlower + 0.2, phMin: 5.8, phMax: 6.2, humidityMin: 50, humidityMax: 60 };
  }
  if (weekNum <= strain.vegW + strain.flowerW - 2) {
    return { phase: 'Floración', ecMin: strain.ecFlower - 0.1, ecMax: strain.ecPeak, phMin: 6.0, phMax: 6.5, humidityMin: 40, humidityMax: 55 };
  }
  if (weekNum <= strain.vegW + strain.flowerW) {
    return { phase: 'Engorde', ecMin: strain.ecFlower, ecMax: strain.ecPeak, phMin: 6.0, phMax: 6.5, humidityMin: 35, humidityMax: 50 };
  }
  return { phase: 'Flush', ecMin: 0.1, ecMax: 0.4, phMin: 6.0, phMax: 6.5, humidityMin: 35, humidityMax: 45 };
}

function renderHistorialMeasurementsTable() {
  const meas = Array.isArray(myGrow.measurements) ? [...myGrow.measurements] : [];
  meas.sort((a, b) => new Date(b.date) - new Date(a.date));
  const rows = meas.slice(0, 40);
  if (!rows.length) {
    return `<div class="alert info"><i class="ti ti-info-circle"></i><p>No hay mediciones guardadas. Regístralas en <strong>Medir</strong>.</p></div>`;
  }
  const rdwc = isMonitorRdwc(myGrow);
  return `
    <div class="table-scroll table-scroll--mt-sm">
      <table class="week-table">
        <thead><tr><th>Fecha</th><th>${rdwc ? 'Sitio' : 'Pl.'}</th><th>pH</th><th>EC</th><th>Vol</th><th>Tª agua</th><th>Notas</th></tr></thead>
        <tbody>
          ${rows.map((r) => `<tr>
            <td>${new Date(r.date).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
            <td class="ec-val">${measurementSiteLabel(myGrow, r)}</td>
            <td class="ec-val">${Number.isFinite(r.ph) ? r.ph.toFixed(1) : '—'}</td>
            <td class="ec-val">${Number.isFinite(r.ec) ? r.ec.toFixed(2) : '—'}</td>
            <td>${Number.isFinite(r.volume) ? r.volume.toFixed(1) : '—'}</td>
            <td>${Number.isFinite(r.waterTemp) ? r.waterTemp.toFixed(1) + '°C' : '—'}</td>
            <td class="table-cell-note">${r.note || '—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function renderHistorial() {
  const host = document.getElementById('historialContent');
  if (!host) return;
  if (!myGrow) {
    host.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="ti ti-history"></i></div><p>No hay historial sin un cultivo activo.</p><button type="button" class="btn btn-primary" onclick="navTo('cultivo')">Configurar en Sistema</button></div>`;
    return;
  }
  const logHtml = (myGrow.log || [])
    .slice(0, 50)
    .map(
      (e) => `<div class="log-entry">
      <div class="log-icon ${e.type}"><i class="ti ti-${e.type === 'ok' ? 'check' : e.type === 'warn' ? 'alert-triangle' : 'info-circle'}"></i></div>
      <div><div class="log-text">${e.text}</div><div class="log-time">${new Date(e.date).toLocaleString('es-ES')}</div></div>
    </div>`,
    )
    .join('');
  host.innerHTML = `
    <div class="card">
      <div class="card-header"><div class="card-title"><i class="ti ti-list"></i> Bitácora (${myGrow.strain.name})</div></div>
      <div class="log-list">${logHtml || '<p class="text-muted">Sin entradas.</p>'}</div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title"><i class="ti ti-table"></i> Mediciones recientes (${isMonitorRdwc(myGrow) ? 'circuito RDWC' : 'todas las plantas'})</div></div>
      ${renderHistorialMeasurementsTable()}
      <button type="button" class="btn btn-ghost historial-actions" onclick="navTo('monitor')"><i class="ti ti-plus"></i> Añadir medición en Medir</button>
    </div>
  `;
}

window.renderHistorial = renderHistorial;
