// Monitor

function renderMonitor(){
  const mc = document.getElementById('monitorContent');
  if(!myGrow){
    mc.innerHTML=`<div class="alert info"><i class="ti ti-info-circle"></i><p>Activa un cultivo en <strong>Mi Cultivo</strong> para usar el monitor.</p></div>`;
    return;
  }
  const s = myGrow.strain;
  const daysSince = Math.floor((new Date()-myGrow.startDate)/86400000);
  const weekNum = Math.max(1,Math.ceil((daysSince+1)/7));
  const n = nutrients.find(x=>x.rank===myGrow.nutri)||nutrients[0];
  const selectedPlant = myGrow.selectedPlant || 1;
  const smartAlerts = buildSmartAlerts(myGrow, s, weekNum);
  const climateCard = myGrow.climate
    ? `<div class="alert info"><i class="ti ti-cloud"></i><p><strong>${myGrow.location || 'Ubicación'} (${myGrow.placement})</strong> · ${myGrow.climate.summary} · ${myGrow.climate.temperature}°C · HR ${myGrow.climate.humidity}% · Viento ${myGrow.climate.wind} km/h · Fuente: ${myGrow.climate.source}</p></div>`
    : '';

  mc.innerHTML=`
    ${climateCard}
    <div class="grid4" style="margin-bottom:1rem">
      <div class="metric"><div class="metric-label">pH actual</div><div class="metric-val c-blue">6.1</div><div class="metric-unit">5.8–6.5 objetivo</div><div class="metric-bar"><div class="metric-fill" style="width:72%;background:var(--b400)"></div></div></div>
      <div class="metric"><div class="metric-label">EC actual</div><div class="metric-val c-green">${s.ecFlower.toFixed(1)}</div><div class="metric-unit">mS/cm</div><div class="metric-bar"><div class="metric-fill" style="width:${Math.min(100,s.ecFlower/3*100).toFixed(0)}%;background:var(--g400)"></div></div></div>
      <div class="metric"><div class="metric-label">Temp. agua</div><div class="metric-val c-purple">${s.tempWater+1}°C</div><div class="metric-unit">óptimo ${s.tempWater}–${s.tempWater+2}°C</div></div>
      <div class="metric"><div class="metric-label">DO estimado</div><div class="metric-val c-blue">8.2</div><div class="metric-unit">mg/L (>6 óptimo)</div></div>
    </div>

    <div class="grid2">
      <div class="card">
        <div class="card-header"><div class="card-title"><i class="ti ti-list"></i>Registro de cultivo</div></div>
        <div class="log-list">
          ${myGrow.log.map(e=>`<div class="log-entry"><div class="log-icon ${e.type}"><i class="ti ti-${e.type==='ok'?'check':e.type==='warn'?'alert-triangle':'info-circle'}"></i></div><div><div class="log-text">${e.text}</div><div class="log-time">${new Date(e.date).toLocaleDateString('es-ES')} ${new Date(e.date).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}</div></div></div>`).join('')}
        </div>
        <div style="display:flex;gap:8px;margin-top:1rem">
          <input id="logInput" type="text" placeholder="Añadir observación..." style="flex:1;padding:8px 12px;border:1px solid var(--border2);border-radius:var(--radius);background:var(--surface2);color:var(--text);font-size:13px">
          <button class="btn btn-primary" onclick="addLog()" style="padding:8px 14px">Añadir</button>
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
          <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;font-family:'DM Mono';margin-bottom:8px">Dosis esta semana</div>
          <div style="font-size:13px;color:var(--text2);line-height:1.8">
            ${weekNum<=1?n.phases.germ:weekNum<=s.vegW?n.phases.veg:weekNum>=s.vegW+s.flowerW?n.phases.flush:n.phases.flower}
          </div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;font-family:'DM Mono';margin-bottom:8px">Aditivos recomendados</div>
          <div style="display:flex;flex-wrap:wrap;gap:5px">${n.aditivos.map(a=>`<span style="font-size:11px;background:var(--surface2);color:var(--text2);padding:3px 10px;border-radius:20px;border:1px solid var(--border)">${a}</span>`).join('')}</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title"><i class="ti ti-report-analytics"></i>Registro diario de mediciones</div></div>
      <div class="grid4">
        <div class="form-group"><label>Planta</label>
          <select id="mPlant">
            ${Array.from({length:getPlantCount(myGrow)},(_,i)=>`<option value="${i+1}" ${selectedPlant===i+1?'selected':''}>P${i+1}</option>`).join('')}
          </select>
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
      <button class="btn btn-primary" onclick="addMeasurement()"><i class="ti ti-plus"></i> Guardar medición</button>
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
  const plantId = parseInt(document.getElementById('mPlant')?.value, 10) || (myGrow.selectedPlant || 1);
  myGrow.selectedPlant = plantId;
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
  myGrow.log.unshift({
    date: new Date().toISOString(),
    text: `Medición diaria guardada (${`P${plantId}`}) · pH ${reading.ph.toFixed(1)} · EC ${reading.ec.toFixed(2)} · Vol ${reading.volume || myGrow.reservoirL}L`,
    type: 'ok',
  });
  saveGrowState();
  renderMonitor();
}

function renderMeasurementsTable() {
  const plantId = myGrow.selectedPlant || 1;
  const rows = getMeasurementsByPlant(myGrow, plantId).slice(0, 7);
  if (!rows.length) {
    return `<div class="alert info" style="margin-top:1rem"><i class="ti ti-info-circle"></i><p>Aún no hay mediciones diarias guardadas para la planta P${plantId}.</p></div>`;
  }
  return `
    <div style="margin-top:1rem;overflow-x:auto">
      <table class="week-table">
        <thead><tr><th>Fecha</th><th>Planta</th><th>pH</th><th>EC</th><th>Vol (L)</th><th>Tª agua</th><th>Tª aire</th><th>HR</th><th>CO₂</th><th>Notas</th></tr></thead>
        <tbody>
          ${rows.map(r=>`<tr>
            <td>${new Date(r.date).toLocaleDateString('es-ES')} ${new Date(r.date).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}</td>
            <td class="ec-val">P${r.plantId || 1}</td>
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
  const rows = getMeasurementsByPlant(myGrow, plantId).slice(0, 10).reverse();
  if (!rows.length) return '';
  const strain = myGrow.strain;
  const daysSince = Math.floor((new Date()-myGrow.startDate)/86400000);
  const weekNum = Math.max(1,Math.ceil((daysSince+1)/7));
  const phaseRef = getPhaseReference(strain, weekNum);
  return `
    <div class="card-sm" style="margin-top:1rem">
      <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;font-family:'DM Mono';margin-bottom:8px">
        Tendencia pH y EC · Planta P${plantId} · ${phaseRef.phase}
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
  const width = 780;
  const height = 220;
  const padL = 42;
  const padR = 16;
  const padT = 16;
  const padB = 34;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const phMin = 5.0;
  const phMax = 7.0;
  const ecMin = 0.0;
  const ecMax = 3.0;

  const toX = (i) => padL + (i / (valid.length - 1)) * innerW;
  const toY = (v, min, max) => padT + (1 - (Math.max(min, Math.min(max, v)) - min) / (max - min)) * innerH;
  const phPoints = valid.map((r, i) => `${toX(i)},${toY(r.ph, phMin, phMax)}`).join(' ');
  const ecPoints = valid.map((r, i) => `${toX(i)},${toY(r.ec, ecMin, ecMax)}`).join(' ');
  const phTargetY1 = toY(phaseRef.phMin, phMin, phMax);
  const phTargetY2 = toY(phaseRef.phMax, phMin, phMax);
  const ecTargetY1 = toY(phaseRef.ecMin, ecMin, ecMax);
  const ecTargetY2 = toY(phaseRef.ecMax, ecMin, ecMax);

  const labels = valid.map((r, i) => {
    const x = toX(i);
    const date = new Date(r.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
    return `<text x="${x}" y="${height-14}" class="trend-label">${date}</text>`;
  }).join('');

  return `
    <svg viewBox="0 0 ${width} ${height}" class="plant-trend-svg" role="img" aria-label="Tendencia de pH y EC">
      <rect x="0" y="0" width="${width}" height="${height}" rx="10" class="trend-bg"></rect>
      <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${height-padB}" class="trend-axis"></line>
      <line x1="${padL}" y1="${height-padB}" x2="${width-padR}" y2="${height-padB}" class="trend-axis"></line>

      <rect x="${padL}" y="${Math.min(phTargetY1, phTargetY2)}" width="${innerW}" height="${Math.abs(phTargetY2-phTargetY1)}" class="trend-ph-band"></rect>
      <rect x="${padL}" y="${Math.min(ecTargetY1, ecTargetY2)}" width="${innerW}" height="${Math.abs(ecTargetY2-ecTargetY1)}" class="trend-ec-band"></rect>

      <polyline points="${phPoints}" fill="none" class="trend-ph"></polyline>
      <polyline points="${ecPoints}" fill="none" class="trend-ec"></polyline>

      ${valid.map((r, i) => `<circle cx="${toX(i)}" cy="${toY(r.ph, phMin, phMax)}" r="3" class="trend-ph-dot"></circle>`).join('')}
      ${valid.map((r, i) => `<circle cx="${toX(i)}" cy="${toY(r.ec, ecMin, ecMax)}" r="3" class="trend-ec-dot"></circle>`).join('')}

      <text x="${padL}" y="12" class="trend-title">pH (azul) y EC (verde) · banda objetivo por fase</text>
      ${labels}
    </svg>
  `;
}

function buildSmartAlerts(grow, strain, weekNum) {
  const alerts = [];
  const plantId = grow.selectedPlant || 1;
  const latest = getLatestMeasurementForPlant(grow, plantId);
  if (!latest) {
    alerts.push({ level: 'info', icon: 'clipboard-text', message: `Añade una medición diaria para activar alertas inteligentes en P${plantId}.` });
    return alerts;
  }

  const phaseRef = getPhaseReference(strain, weekNum);
  if (Number.isFinite(latest.ph) && (latest.ph < phaseRef.phMin || latest.ph > phaseRef.phMax)) {
    alerts.push({
      level: 'warn',
      icon: 'beaker',
      message: `P${plantId}: pH fuera de rango para ${phaseRef.phase}: ${latest.ph.toFixed(1)} (objetivo ${phaseRef.phMin.toFixed(1)}-${phaseRef.phMax.toFixed(1)}).`,
    });
  }

  if (Number.isFinite(latest.ec) && latest.ec < phaseRef.ecMin) {
    alerts.push({
      level: 'warn',
      icon: 'battery-2',
      message: `P${plantId}: EC baja para ${phaseRef.phase}: ${latest.ec.toFixed(2)} mS/cm (mínimo recomendado ${phaseRef.ecMin.toFixed(2)}).`,
    });
  }
  if (Number.isFinite(latest.ec) && latest.ec > phaseRef.ecMax) {
    alerts.push({
      level: 'danger',
      icon: 'flame',
      message: `P${plantId}: EC alta para ${phaseRef.phase}: ${latest.ec.toFixed(2)} mS/cm (máximo recomendado ${phaseRef.ecMax.toFixed(2)}).`,
    });
  }

  if (Number.isFinite(latest.waterTemp) && latest.waterTemp > 23) {
    alerts.push({
      level: 'danger',
      icon: 'temperature',
      message: `P${plantId}: Temperatura de agua elevada (${latest.waterTemp.toFixed(1)}°C). Riesgo de bajo oxígeno disuelto y estrés radicular.`,
    });
  }
  if (Number.isFinite(latest.humidity) && latest.humidity > phaseRef.humidityMax) {
    alerts.push({
      level: 'warn',
      icon: 'droplet-filled',
      message: `P${plantId}: Humedad alta (${latest.humidity.toFixed(0)}%) para ${phaseRef.phase}. Riesgo de hongos/botrytis.`,
    });
  }
  if (Number.isFinite(latest.humidity) && latest.humidity < phaseRef.humidityMin) {
    alerts.push({
      level: 'warn',
      icon: 'wind',
      message: `P${plantId}: Humedad baja (${latest.humidity.toFixed(0)}%). Puede frenar crecimiento y aumentar estrés hídrico.`,
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
