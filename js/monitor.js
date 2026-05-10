// Monitor

function isMonitorRdwc(grow) {
  return grow && grow.system === 'RDWC';
}

/** VPD aire (kPa), aprox. ecuación Magnus · T en °C, HR en %. */
function computeVpdKpa(airC, rhPct) {
  if (!Number.isFinite(airC) || !Number.isFinite(rhPct)) return null;
  const es = 0.6108 * Math.exp((17.27 * airC) / (airC + 237.3));
  return Math.round(es * (1 - rhPct / 100) * 1000) / 1000;
}

/** DLI mol/m²/d a partir de PPFD (µmol/m²/s) y horas de luz encendida. */
function computeDliMolM2d(ppfd, hoursLight) {
  if (!Number.isFinite(ppfd) || !Number.isFinite(hoursLight) || ppfd <= 0 || hoursLight <= 0) return null;
  return Math.round(((ppfd * hoursLight * 3600) / 1e6) * 10) / 10;
}

function escapeMonitorHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseMeasureInputFloat(id) {
  const el = document.getElementById(id);
  if (!el) return null;
  const t = String(el.value ?? '')
    .trim()
    .replace(/,/g, '.');
  if (t === '' || t === '-' || t === '.' || t === '-.') return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

function collectMonitorFormReading() {
  const reading = {};
  const ph = parseMeasureInputFloat('mPH');
  const ec = parseMeasureInputFloat('mEC');
  const vol = parseMeasureInputFloat('mVolume');
  const wt = parseMeasureInputFloat('mWaterTemp');
  const at = parseMeasureInputFloat('mAirTemp');
  const rh = parseMeasureInputFloat('mHumidity');
  const co2 = parseMeasureInputFloat('mCO2');
  const ppfd = parseMeasureInputFloat('mPPFD');
  const lh = parseMeasureInputFloat('mLightHours');
  if (ph != null) reading.ph = ph;
  if (ec != null) reading.ec = ec;
  if (vol != null) reading.volume = vol;
  if (wt != null) reading.waterTemp = wt;
  if (at != null) reading.airTemp = at;
  if (rh != null) reading.humidity = rh;
  if (co2 != null) reading.co2 = co2;
  if (ppfd != null) reading.ppfd = ppfd;
  if (lh != null) reading.lightHours = lh;
  return reading;
}

/** Avisos y soluciones calculadas mientras se rellena el formulario (sin guardar). */
function buildLiveMeasureHints(reading, grow) {
  const out = [];
  const strain = grow.strain;
  const daysSince = Math.floor((new Date() - grow.startDate) / 86400000);
  const weekNum = Math.max(1, Math.ceil((daysSince + 1) / 7));
  const phaseRef = getPhaseReference(strain, weekNum);

  const hardPh = Number.isFinite(reading.ph) && (reading.ph < 4.5 || reading.ph > 8.5);
  const hardEc = Number.isFinite(reading.ec) && (reading.ec < 0 || reading.ec > 4);

  if (hardPh) {
    out.push({
      level: 'danger',
      icon: 'alert-circle',
      title: 'pH fuera del rango permitido',
      text: `El valor ${reading.ph.toFixed(2)} no se puede guardar (límites 4,5–8,5). Corrige antes de guardar la medición.`,
    });
  }
  if (hardEc) {
    out.push({
      level: 'danger',
      icon: 'alert-circle',
      title: 'EC fuera del rango permitido',
      text: `El valor ${reading.ec.toFixed(2)} mS/cm no se puede guardar (límites 0–4).`,
    });
  }

  if (typeof buildStrainCorrectionPlan === 'function' && Object.keys(reading).length > 0) {
    const plan = buildStrainCorrectionPlan(reading, strain, weekNum, phaseRef, grow);
    for (const step of plan.steps) {
      if (hardPh && (step.key === 'ph-low' || step.key === 'ph-high')) continue;
      if (hardEc && (step.key === 'ec-low' || step.key === 'ec-high')) continue;
      const level =
        step.key === 'ec-high' || step.key === 'water-hot' || step.key === 'rh-flower' ? 'danger' : 'warn';
      out.push({
        level,
        icon: 'tool',
        title: step.title,
        text: step.detail,
      });
    }
  }

  if (Number.isFinite(reading.co2)) {
    if (reading.co2 < 350) {
      out.push({
        level: 'warn',
        icon: 'molecule',
        title: 'CO₂ muy bajo',
        text: `Lectura ~${reading.co2.toFixed(0)} ppm. Comprueba ventilación o calibración del sensor.`,
      });
    } else if (grow.co2 === 'si' && reading.co2 < (phaseRef.co2Min || 600) * 0.85) {
      out.push({
        level: 'info',
        icon: 'molecule',
        title: 'CO₂ bajo para recinto enriquecido',
        text: `Orientativo en ${phaseRef.phase}: ~${phaseRef.co2Min}–${phaseRef.co2Max} ppm con CO₂ activado.`,
      });
    }
  }

  if (Number.isFinite(reading.ppfd)) {
    if (reading.ppfd < (phaseRef.ppfdMin || 300) * 0.75) {
      out.push({
        level: 'warn',
        icon: 'bulb',
        title: 'PPFD bajo',
        text: `~${reading.ppfd.toFixed(0)} µmol/m²/s para ${phaseRef.phase} (mínimo orientativo ~${phaseRef.ppfdMin}). Revisa altura o potencia de la luminaria.`,
      });
    }
    if (reading.ppfd > (phaseRef.ppfdMax || 900) * 1.2) {
      out.push({
        level: 'danger',
        icon: 'sun',
        title: 'PPFD muy alto',
        text: `~${reading.ppfd.toFixed(0)} µmol/m²/s supera el techo orientativo (~${phaseRef.ppfdMax}). Riesgo de estrés luminoso.`,
      });
    }
  }

  const ord = { danger: 0, warn: 1, info: 2 };
  out.sort((a, b) => (ord[a.level] ?? 3) - (ord[b.level] ?? 3));
  return out;
}

let monitorLiveValidationTimer = null;

function updateMonitorLiveCorrection() {
  const host = document.getElementById('monitorLiveCorrectionHost');
  if (!host || !myGrow) return;
  const reading = collectMonitorFormReading();
  if (Object.keys(reading).length === 0) {
    host.innerHTML = '';
    host.hidden = true;
    return;
  }
  const parts = buildLiveMeasureHints(reading, myGrow);
  const strain = myGrow.strain;
  const daysSince = Math.floor((new Date() - myGrow.startDate) / 86400000);
  const weekNum = Math.max(1, Math.ceil((daysSince + 1) / 7));
  const phaseRef = getPhaseReference(strain, weekNum);

  if (!parts.length) {
    host.innerHTML = `<div class="alert info monitor-live-ok"><i class="ti ti-check"></i><p><strong>En rango (${phaseRef.phase}):</strong> los valores introducidos encajan en los objetivos orientativos de <strong>${escapeMonitorHtml(strain.name)}</strong>. Tras cualquier corrección en depósito, vuelve a medir.</p></div>`;
    host.hidden = false;
    return;
  }
  host.innerHTML = parts
    .map(
      (p) =>
        `<div class="alert ${p.level === 'danger' ? 'danger' : p.level === 'warn' ? 'warn' : 'info'} monitor-live-alert"><i class="ti ti-${p.icon}"></i><div class="monitor-live-alert__body"><strong class="monitor-live-alert__title">${escapeMonitorHtml(p.title)}</strong><p class="monitor-live-alert__text">${escapeMonitorHtml(p.text)}</p></div></div>`,
    )
    .join('');
  host.hidden = false;
}

function scheduleMonitorLiveCorrection() {
  clearTimeout(monitorLiveValidationTimer);
  monitorLiveValidationTimer = setTimeout(updateMonitorLiveCorrection, 150);
}

const MONITOR_LIVE_FIELD_IDS = new Set([
  'mPH',
  'mEC',
  'mVolume',
  'mWaterTemp',
  'mAirTemp',
  'mHumidity',
  'mCO2',
  'mLux',
  'mPPFD',
  'mLightHours',
  'mPlant',
]);

function onMonitorFormLiveEvent(ev) {
  const mc = document.getElementById('monitorContent');
  if (!mc || !myGrow || !mc.contains(ev.target)) return;
  const id = ev.target.id;
  if (!id || !MONITOR_LIVE_FIELD_IDS.has(id)) return;
  scheduleMonitorLiveCorrection();
}

function initMonitorLiveValidation() {
  if (!window.__hydroMonitorLiveDelegation) {
    document.addEventListener('input', onMonitorFormLiveEvent);
    document.addEventListener('change', onMonitorFormLiveEvent);
    window.__hydroMonitorLiveDelegation = true;
  }
  requestAnimationFrame(() => updateMonitorLiveCorrection());
}

function formatMeasurementVpd(r) {
  const v = computeVpdKpa(r.airTemp, r.humidity);
  return v != null ? v.toFixed(2) : '—';
}

function parseClimateTemperature(val) {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string') {
    const n = parseFloat(String(val).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Alertas de contexto exterior usando pronóstico guardado o clima del checklist. */
function buildOutdoorPlacementAlerts(grow, strain, weekNum) {
  const out = [];
  if (!grow || grow.placement !== 'exterior') return out;
  const snap = grow.siteWeather;
  const match =
    typeof siteWeatherMatchesGrow === 'function' ? siteWeatherMatchesGrow(grow, snap) : { ok: true };
  if (match.code === 'stale' && match.message) {
    out.push({
      level: 'warn',
      icon: 'refresh',
      message: match.message,
    });
    return out;
  }
  if (match.code === 'no-location' && match.message) {
    out.push({
      level: 'warn',
      icon: 'map-pin',
      message: match.message,
    });
    return out;
  }
  const useSnap = match.ok;
  const cur = grow.climate;
  let tAir = null;
  let rh = null;
  let wind = null;
  if (useSnap && snap?.current && Number.isFinite(snap.current.temperature_2m)) {
    tAir = snap.current.temperature_2m;
    rh = snap.current.relative_humidity_2m;
    wind = snap.current.wind_speed_10m;
  } else if (!useSnap) {
    tAir = null;
  } else {
    tAir = parseClimateTemperature(cur?.temperature);
    rh = Number.isFinite(cur?.humidity) ? cur.humidity : null;
    wind = parseClimateTemperature(cur?.wind);
  }
  if (tAir != null && tAir >= 36) {
    out.push({
      level: 'danger',
      icon: 'sun-high',
      message: `Exterior: temperatura actual muy alta (${tAir.toFixed(1)}°C). Riesgo de estrés y parada de transpiración; sombreo temporal y revisa solución.`,
    });
  } else if (tAir != null && tAir >= 32) {
    out.push({
      level: 'warn',
      icon: 'sun',
      message: `Exterior: calor (${tAir.toFixed(1)}°C). Vigila temperatura de agua y HR foliar.`,
    });
  }
  if (tAir != null && tAir <= 5) {
    out.push({
      level: 'danger',
      icon: 'snowflake',
      message: `Exterior: frío intenso (${tAir.toFixed(1)}°C). Protección antiheladas o retirada temporal si aplica.`,
    });
  }
  if (Number.isFinite(wind) && wind >= 45) {
    out.push({
      level: 'warn',
      icon: 'wind',
      message: `Exterior: viento fuerte (~${wind.toFixed(0)} km/h). Refuerza amarres y evita daño mecánico al follaje.`,
    });
  }
  const inFlower = weekNum > strain.vegW + 2;
  const rain0 = useSnap ? snap?.daily?.precipitation_sum?.[0] : null;
  const prob0 = useSnap ? snap?.daily?.precipitation_probability_mean?.[0] : null;
  if (useSnap && inFlower && Number.isFinite(rain0) && rain0 >= 6) {
    out.push({
      level: 'warn',
      icon: 'cloud-rain',
      message: `Pronóstico: lluvia considerable hoy (~${rain0.toFixed(1)} mm) en floración exterior — riesgo de botrytis; mejora ventilación al secar.`,
    });
  } else if (useSnap && inFlower && Number.isFinite(prob0) && prob0 >= 75) {
    out.push({
      level: 'info',
      icon: 'cloud-fog',
      message: `Alta probabilidad de lluvia (${prob0}%). Prepara cubierta o retirada temporal si el espacio lo permite.`,
    });
  }
  if (!snap?.updatedAt && grow.placement === 'exterior' && match.code !== 'no-location') {
    out.push({
      level: 'info',
      icon: 'cloud-search',
      message: 'Abre la pestaña Climatología: se consulta sola la API para tu ubicación; puedes repetir con «Actualizar pronóstico» si hace falta.',
    });
  }

  if (
    useSnap &&
    typeof buildExteriorHydroSolutions === 'function' &&
    grow.placement === 'exterior'
  ) {
    const plan = buildExteriorHydroSolutions(grow, snap);
    const top = plan.blocks.find((b) => b.level === 'danger') || plan.blocks[0];
    if (top && top.actions && top.actions.length) {
      const preview = top.actions.slice(0, 2).join(' ');
      out.push({
        level: top.level === 'danger' ? 'danger' : 'warn',
        icon: 'tool',
        message: `${top.title}: ${preview} Ver plan completo en Climatología.`,
      });
    }
  }

  return out;
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
  const waterLive = latestCircuit && Number.isFinite(latestCircuit.waterTemp) ? latestCircuit.waterTemp : null;
  const hrLive = latestCircuit && Number.isFinite(latestCircuit.humidity) ? latestCircuit.humidity : null;
  const airLive = latestCircuit && Number.isFinite(latestCircuit.airTemp) ? latestCircuit.airTemp : null;
  const vpdLive = computeVpdKpa(latestCircuit?.airTemp, latestCircuit?.humidity);
  const dliLive = computeDliMolM2d(latestCircuit?.ppfd, latestCircuit?.lightHours);
  const ppfdLive = latestCircuit && Number.isFinite(latestCircuit.ppfd) ? latestCircuit.ppfd : null;
  const waterPct =
    waterLive != null ? Math.min(100, Math.max(0, ((waterLive - 15) / (24 - 15)) * 100)) : 50;
  const climateCard = myGrow.climate
    ? `<div class="alert info"><i class="ti ti-cloud"></i><p><strong>${myGrow.location || 'Ubicación'} (${myGrow.placement})</strong> · ${myGrow.climate.summary} · ${myGrow.climate.temperature}°C · HR ${myGrow.climate.humidity}% · Viento ${myGrow.climate.wind} km/h · Fuente: ${myGrow.climate.source}</p></div>`
    : '';
  const rdwcSamplingNote = rdwc
    ? `<div class="alert info"><i class="ti ti-flask-2"></i><p><strong>RDWC:</strong> la solución es <strong>común a todo el circuito</strong>. El pH y la EC se miden en el <strong>depósito de control</strong> (o en el mismo volumen recirculado), no en cada cubo por separado. Aquí guardas una lectura representativa del circuito.</p></div>`
    : '';

  mc.innerHTML=`
    ${climateCard}
    ${rdwcSamplingNote}
    <div class="alert info monitor-measure-intro"><i class="ti ti-gauge"></i><p><strong>Medición resolutiva:</strong> además de pH/EC y temperatura de agua, registra <strong>aire, humedad</strong> (para VPD), <strong>CO₂</strong> y, si puedes, <strong>PPFD + horas de luz</strong> (DLI). Las alertas usan la última lectura y la fase actual (${phaseRefQuick.phase}). En exterior, cruza con la pestaña <strong>Climatología</strong>.</p></div>
    <button type="button" class="btn btn-ghost btn--compact monitor-clima-link" onclick="navTo('climatologia')"><i class="ti ti-cloud-storm"></i> Climatología del emplazamiento</button>

    <div class="grid4 monitor-metrics">
      <div class="metric"><div class="metric-label">pH ${rdwc ? '(circuito)' : 'actual'}</div><div class="metric-val c-blue">${phLive != null ? phLive.toFixed(1) : '—'}</div><div class="metric-unit">${phaseRefQuick.phMin.toFixed(1)}–${phaseRefQuick.phMax.toFixed(1)} (${phaseRefQuick.phase})</div><div class="metric-bar"><div class="metric-fill metric-fill--ph" style="--fill-pct:${phPct.toFixed(0)}%"></div></div></div>
      <div class="metric"><div class="metric-label">EC ${rdwc ? '(circuito)' : 'actual'}</div><div class="metric-val c-green">${ecLive != null ? ecLive.toFixed(2) : s.ecFlower.toFixed(1)}</div><div class="metric-unit">mS/cm</div><div class="metric-bar"><div class="metric-fill metric-fill--ec" style="--fill-pct:${ecPct.toFixed(0)}%"></div></div></div>
      <div class="metric"><div class="metric-label">Tª agua</div><div class="metric-val c-purple">${waterLive != null ? waterLive.toFixed(1) + '°C' : '—'}</div><div class="metric-unit">óptimo ~18–20 · alerta &gt;23°C</div><div class="metric-bar"><div class="metric-fill metric-fill--ec" style="--fill-pct:${waterPct.toFixed(0)}%"></div></div></div>
      <div class="metric"><div class="metric-label">VPD aire</div><div class="metric-val c-amber">${vpdLive != null ? vpdLive.toFixed(2) + ' kPa' : '—'}</div><div class="metric-unit">${phaseRefQuick.vpdMin != null ? phaseRefQuick.vpdMin.toFixed(2) + '–' + phaseRefQuick.vpdMax.toFixed(2) + ' kPa' : 'Necesita Tª aire + HR'}</div></div>
    </div>
    <div class="grid4 monitor-metrics monitor-metrics--tight">
      <div class="metric"><div class="metric-label">Humedad</div><div class="metric-val c-blue">${hrLive != null ? hrLive.toFixed(0) + '%' : '—'}</div><div class="metric-unit">${phaseRefQuick.humidityMin}-${phaseRefQuick.humidityMax}% fase</div></div>
      <div class="metric"><div class="metric-label">Tª aire (copa)</div><div class="metric-val">${airLive != null ? airLive.toFixed(1) + '°C' : '—'}</div><div class="metric-unit">Microclima</div></div>
      <div class="metric"><div class="metric-label">DLI estimado</div><div class="metric-val">${dliLive != null ? dliLive.toFixed(1) + ' mol/m²/d' : '—'}</div><div class="metric-unit">PPFD × horas luz</div></div>
      <div class="metric"><div class="metric-label">PPFD último</div><div class="metric-val">${ppfdLive != null ? ppfdLive.toFixed(0) + ' µmol' : '—'}</div><div class="metric-unit">sensor cuántico</div></div>
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
      <div class="section-label section-label--block">Solución y volumen</div>
      <div class="grid4">
        <div class="form-group">${rdwc ? `<label>Sitio de la lectura</label><p class="form-static-text">Circuito RDWC (depósito de control / solución común)</p><input type="hidden" id="mPlant" value="0">` : `<label>Planta</label>
          <select id="mPlant">
            ${Array.from({length:getPlantCount(myGrow)},(_,i)=>`<option value="${i+1}" ${selectedPlant===i+1?'selected':''}>P${i+1}</option>`).join('')}
          </select>`}
        </div>
        <div class="form-group"><label>pH</label><input id="mPH" type="number" step="0.1" min="4.5" max="8.5" placeholder="6.0"></div>
        <div class="form-group"><label>EC (mS/cm)</label><input id="mEC" type="number" step="0.01" min="0" max="4" placeholder="1.85"></div>
        <div class="form-group"><label>Volumen (L)</label><input id="mVolume" type="number" step="0.1" min="1" max="2000" placeholder="${myGrow.reservoirL||60}"></div>
        <div class="form-group"><label>Temp. agua (°C)</label><input id="mWaterTemp" type="number" step="0.1" min="10" max="35" placeholder="19.0"><span class="form-hint">Raíz / depósito</span></div>
      </div>

      <div class="section-label section-label--block">Microclima (VPD con Tª aire + HR)</div>
      <div class="grid4">
        <div class="form-group"><label>Temp. aire en copa (°C)</label><input id="mAirTemp" type="number" step="0.1" min="10" max="45" placeholder="24.0"></div>
        <div class="form-group"><label>Humedad relativa (%)</label><input id="mHumidity" type="number" step="1" min="20" max="95" placeholder="55"></div>
        <div class="form-group"><label>CO₂ (ppm)</label><input id="mCO2" type="number" step="10" min="300" max="2000" placeholder="${myGrow.co2==='si'?'1200':'400'}"></div>
        <div class="form-group"><label>Lux (opcional)</label><input id="mLux" type="number" step="100" min="0" max="200000" placeholder="35000"></div>
      </div>

      <div class="section-label section-label--block">Luz (PPFD + horas encendido → DLI)</div>
      <div class="grid4">
        <div class="form-group"><label>PPFD medio (µmol/m²/s)</label><input id="mPPFD" type="number" step="10" min="0" max="2500" placeholder="600"><span class="form-hint">Sensor cuántico</span></div>
        <div class="form-group"><label>Horas luz encendida</label><input id="mLightHours" type="number" step="0.5" min="0" max="24" placeholder="${weekNum <= myGrow.strain.vegW ? '18' : '12'}"><span class="form-hint">Fotoperiodo hoy</span></div>
      </div>

      <div class="grid2">
        <div class="form-group"><label>Notas</label><input id="mNote" type="text" placeholder="Observaciones del día"></div>
      </div>
      <div id="monitorLiveCorrectionHost" class="monitor-live-correction" hidden aria-live="polite" aria-atomic="true"></div>
      <button type="button" class="btn btn-primary" onclick="addMeasurement()"><i class="ti ti-plus"></i> Guardar medición</button>
      ${renderMeasurementsTable()}
      ${renderCorrectionPlanCard()}
      ${renderPlantTrendCard()}
    </div>
  `;
  requestAnimationFrame(() => initMonitorLiveValidation());
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
    lux: parseFloat(document.getElementById('mLux')?.value),
    ppfd: parseFloat(document.getElementById('mPPFD')?.value),
    lightHours: parseFloat(document.getElementById('mLightHours')?.value),
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
  if (Number.isFinite(reading.volume) && reading.volume > 0) {
    myGrow.reservoirL = Math.max(5, Math.min(2000, reading.volume));
  }
  const scopeLabel = rdwc ? 'circuito RDWC' : `P${plantId}`;
  myGrow.log.unshift({
    date: new Date().toISOString(),
    text: `Medición diaria guardada (${scopeLabel}) · pH ${reading.ph.toFixed(1)} · EC ${reading.ec.toFixed(2)} · Vol ${reading.volume || myGrow.reservoirL}L`,
    type: 'ok',
  });
  saveGrowState();
  renderMonitor();
  if (typeof renderCultivo === 'function' && myGrow) renderCultivo();
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
        <thead><tr><th>Fecha</th><th>${rdwc ? 'Sitio' : 'Planta'}</th><th>pH</th><th>EC</th><th>Vol</th><th>Tª agua</th><th>Tª aire</th><th>HR</th><th>VPD</th><th>CO₂</th><th>PPFD</th><th>h luz</th><th>Notas</th></tr></thead>
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
            <td class="ec-val">${formatMeasurementVpd(r)}</td>
            <td>${Number.isFinite(r.co2)?r.co2.toFixed(0)+' ppm':'—'}</td>
            <td>${Number.isFinite(r.ppfd)?r.ppfd.toFixed(0):'—'}</td>
            <td>${Number.isFinite(r.lightHours)?r.lightHours.toFixed(1):'—'}</td>
            <td>${r.note || '—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderCorrectionPlanCard() {
  if (!myGrow || typeof buildStrainCorrectionPlan !== 'function') return '';
  const plantId = myGrow.selectedPlant || 1;
  const latest = getLatestMeasurementForPlant(myGrow, plantId);
  if (!latest) return '';
  const strain = myGrow.strain;
  const daysSince = Math.floor((new Date() - myGrow.startDate) / 86400000);
  const weekNum = Math.max(1, Math.ceil((daysSince + 1) / 7));
  const phaseRef = getPhaseReference(strain, weekNum);
  const plan = buildStrainCorrectionPlan(latest, strain, weekNum, phaseRef, myGrow);
  if (!plan.steps.length) {
    return `
    <div class="card-sm trend-card">
      <div class="section-label section-label--block">Validación ${strain.name} · ${phaseRef.phase}</div>
      <div class="alert info"><i class="ti ti-check"></i><p>La última medición encaja en los rangos orientativos de la cepa y la fase. Mantén el registro para detectar derivas.</p></div>
    </div>`;
  }
  return `
    <div class="card-sm trend-card">
      <div class="section-label section-label--block">Corrección orientativa · ${strain.name} · ${phaseRef.phase}</div>
      <p class="body-prose body-prose--tight">Pasos calculados a partir de tu última lectura. Ajusta en pequeñas dosis y <strong>vuelve a medir</strong> antes de seguir.</p>
      ${plan.steps.map((s) => `<div class="correction-step"><div class="correction-step__title"><i class="ti ti-tool"></i> ${s.title}</div><p class="correction-step__text">${s.detail}</p></div>`).join('')}
    </div>`;
}

function renderPlantTrendCard() {
  const plantId = myGrow.selectedPlant || 1;
  const rows = getMeasurementsByPlant(myGrow, plantId).slice(0, 14).reverse();
  if (!rows.length) return '';
  const strain = myGrow.strain;
  const daysSince = Math.floor((new Date() - myGrow.startDate) / 86400000);
  const weekNum = Math.max(1, Math.ceil((daysSince + 1) / 7));
  const phaseRef = getPhaseReference(strain, weekNum);
  const rdwc = isMonitorRdwc(myGrow);
  const scopeTitle = rdwc ? 'Circuito (solución común)' : `Planta P${plantId}`;
  const prof = typeof getSystemProfile === 'function' ? getSystemProfile(myGrow.system) : { chartModes: [], label: myGrow.system };
  const modesList =
    typeof getFilteredChartModes === 'function' ? getFilteredChartModes(myGrow) : prof.chartModes || [];
  let mode = typeof getStoredTrendMode === 'function' ? getStoredTrendMode(myGrow.system) : 'solution';
  if (!modesList.some((m) => m.id === mode)) {
    mode = modesList[0]?.id || 'solution';
    if (typeof setStoredTrendMode === 'function') setStoredTrendMode(myGrow.system, mode);
  }
  const modeOpts = modesList
    .map((m) => `<option value="${m.id}" ${mode === m.id ? 'selected' : ''}>${m.label}</option>`)
    .join('');
  const chartBody =
    typeof renderTrendBySystemMode === 'function'
      ? renderTrendBySystemMode(rows, myGrow, phaseRef, strain, weekNum, mode)
      : '';
  return `
    <div class="card-sm trend-card">
      <div class="trend-card-head">
        <div class="section-label section-label--block trend-card-head__title">
          Gráficos · ${prof.label || myGrow.system} · ${scopeTitle} · ${phaseRef.phase}
        </div>
        <div class="form-group trend-mode-select">
          <label for="trendModeSel">Tipo de gráfico</label>
          <select id="trendModeSel" onchange="onTrendModeChange(this)">${modeOpts}</select>
        </div>
      </div>
      <p class="form-hint trend-profile-hint">${prof.optimalHint || ''}</p>
      ${chartBody}
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
  const targets =
    typeof getStrainTargetsForWeek === 'function' ? getStrainTargetsForWeek(strain, weekNum, phaseRef) : phaseRef;

  if (Number.isFinite(latest.ph) && (latest.ph < targets.phMin || latest.ph > targets.phMax)) {
    alerts.push({
      level: 'warn',
      icon: 'beaker',
      message: `${tag}: pH fuera de rango (${strain.name}): ${latest.ph.toFixed(1)} (objetivo ~${targets.phMin.toFixed(2)}–${targets.phMax.toFixed(2)}).`,
    });
  }

  if (Number.isFinite(latest.ec) && latest.ec < targets.ecMin) {
    alerts.push({
      level: 'warn',
      icon: 'battery-2',
      message: `${tag}: EC baja (${strain.name}): ${latest.ec.toFixed(2)} mS/cm (mínimo ~${targets.ecMin.toFixed(2)}).`,
    });
  }
  if (Number.isFinite(latest.ec) && latest.ec > targets.ecMax) {
    alerts.push({
      level: 'danger',
      icon: 'flame',
      message: `${tag}: EC alta (${strain.name}): ${latest.ec.toFixed(2)} mS/cm (techo orientativo ~${targets.ecMax.toFixed(2)}).`,
    });
  }

  if (Number.isFinite(latest.waterTemp) && latest.waterTemp > 23) {
    alerts.push({
      level: 'danger',
      icon: 'temperature',
      message: `${tag}: Temperatura de agua elevada (${latest.waterTemp.toFixed(1)}°C). Riesgo de bajo oxígeno disuelto y estrés radicular.`,
    });
  }
  const rhCeil = weekNum > strain.vegW + 2 && targets.flowerRHMax != null ? targets.flowerRHMax : phaseRef.humidityMax;
  if (Number.isFinite(latest.humidity) && latest.humidity > rhCeil) {
    alerts.push({
      level: 'warn',
      icon: 'droplet-filled',
      message: `${tag}: Humedad alta (${latest.humidity.toFixed(0)}%) — límite orientativo ~${rhCeil}% (${phaseRef.phase}${weekNum > strain.vegW + 2 ? ', cogollos' : ''}).`,
    });
  }
  if (Number.isFinite(latest.humidity) && latest.humidity < phaseRef.humidityMin) {
    alerts.push({
      level: 'warn',
      icon: 'wind',
      message: `${tag}: Humedad baja (${latest.humidity.toFixed(0)}%). Puede frenar crecimiento y aumentar estrés hídrico.`,
    });
  }

  const vpd = computeVpdKpa(latest.airTemp, latest.humidity);
  if (vpd != null && Number.isFinite(phaseRef.vpdMin) && vpd < phaseRef.vpdMin * 0.88) {
    alerts.push({
      level: 'warn',
      icon: 'droplet',
      message: `${tag}: VPD bajo (${vpd.toFixed(2)} kPa) para ${phaseRef.phase}. Transpiración lenta; vigilar enfermedades foliares si persiste.`,
    });
  }
  if (vpd != null && Number.isFinite(phaseRef.vpdMax) && vpd > phaseRef.vpdMax * 1.12) {
    alerts.push({
      level: 'warn',
      icon: 'flame',
      message: `${tag}: VPD alto (${vpd.toFixed(2)} kPa) para ${phaseRef.phase}. Mayor demanda transpirativa; revisa riego de raíz y punta de hojas.`,
    });
  }

  if (Number.isFinite(latest.co2)) {
    if (grow.co2 === 'si' && latest.co2 < (phaseRef.co2Min || 600) * 0.85) {
      alerts.push({
        level: 'info',
        icon: 'molecule',
        message: `${tag}: CO₂ ${latest.co2.toFixed(0)} ppm por debajo del rango orientativo para ${phaseRef.phase} con enriquecimiento.`,
      });
    }
    if (latest.co2 < 350) {
      alerts.push({ level: 'warn', icon: 'alert-circle', message: `${tag}: CO₂ muy bajo (${latest.co2.toFixed(0)} ppm). Comprueba ventilación o medición.` });
    }
  }

  if (Number.isFinite(latest.ppfd)) {
    if (latest.ppfd < (phaseRef.ppfdMin || 300) * 0.75) {
      alerts.push({
        level: 'warn',
        icon: 'bulb',
        message: `${tag}: PPFD bajo (${latest.ppfd.toFixed(0)} µmol/m²/s) para ${phaseRef.phase}. Revisa altura de luminaria o potencia.`,
      });
    }
    if (latest.ppfd > (phaseRef.ppfdMax || 900) * 1.2) {
      alerts.push({
        level: 'danger',
        icon: 'sun',
        message: `${tag}: PPFD muy alto (${latest.ppfd.toFixed(0)} µmol/m²/s). Riesgo de fotobleaching o estrés luminoso.`,
      });
    }
  }

  alerts.push(...buildOutdoorPlacementAlerts(grow, strain, weekNum));
  return alerts;
}

function getPhaseReference(strain, weekNum) {
  if (weekNum <= 1) {
    return {
      phase: 'Germinación',
      ecMin: 0.3,
      ecMax: 0.6,
      phMin: 5.5,
      phMax: 5.8,
      humidityMin: 70,
      humidityMax: 90,
      vpdMin: 0.35,
      vpdMax: 0.85,
      co2Min: 400,
      co2Max: 800,
      ppfdMin: 200,
      ppfdMax: 450,
    };
  }
  if (weekNum <= strain.vegW) {
    return {
      phase: 'Vegetación',
      ecMin: strain.ecVeg,
      ecMax: strain.ecVeg + 0.5,
      phMin: 5.6,
      phMax: 6.0,
      humidityMin: 55,
      humidityMax: 70,
      vpdMin: 0.75,
      vpdMax: 1.25,
      co2Min: 600,
      co2Max: 1200,
      ppfdMin: 400,
      ppfdMax: 700,
    };
  }
  if (weekNum <= strain.vegW + 2) {
    return {
      phase: 'Prefloración',
      ecMin: (strain.ecVeg + strain.ecFlower) / 2,
      ecMax: strain.ecFlower + 0.2,
      phMin: 5.8,
      phMax: 6.2,
      humidityMin: 50,
      humidityMax: 60,
      vpdMin: 0.95,
      vpdMax: 1.45,
      co2Min: 800,
      co2Max: 1200,
      ppfdMin: 550,
      ppfdMax: 900,
    };
  }
  if (weekNum <= strain.vegW + strain.flowerW - 2) {
    return {
      phase: 'Floración',
      ecMin: strain.ecFlower - 0.1,
      ecMax: strain.ecPeak,
      phMin: 6.0,
      phMax: 6.5,
      humidityMin: 40,
      humidityMax: 55,
      vpdMin: 1.1,
      vpdMax: 1.65,
      co2Min: 900,
      co2Max: 1500,
      ppfdMin: 650,
      ppfdMax: 950,
    };
  }
  if (weekNum <= strain.vegW + strain.flowerW) {
    return {
      phase: 'Engorde',
      ecMin: strain.ecFlower,
      ecMax: strain.ecPeak,
      phMin: 6.0,
      phMax: 6.5,
      humidityMin: 35,
      humidityMax: 50,
      vpdMin: 1.05,
      vpdMax: 1.6,
      co2Min: 800,
      co2Max: 1400,
      ppfdMin: 600,
      ppfdMax: 900,
    };
  }
  return {
    phase: 'Flush',
    ecMin: 0.1,
    ecMax: 0.4,
    phMin: 6.0,
    phMax: 6.5,
    humidityMin: 35,
    humidityMax: 45,
    vpdMin: 0.85,
    vpdMax: 1.35,
    co2Min: 400,
    co2Max: 600,
    ppfdMin: 350,
    ppfdMax: 550,
  };
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
        <thead><tr><th>Fecha</th><th>${rdwc ? 'Sitio' : 'Pl.'}</th><th>pH</th><th>EC</th><th>Vol</th><th>Tª agua</th><th>Tª aire</th><th>HR</th><th>VPD</th><th>CO₂</th><th>PPFD</th><th>h</th><th>Notas</th></tr></thead>
        <tbody>
          ${rows.map((r) => `<tr>
            <td>${new Date(r.date).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
            <td class="ec-val">${measurementSiteLabel(myGrow, r)}</td>
            <td class="ec-val">${Number.isFinite(r.ph) ? r.ph.toFixed(1) : '—'}</td>
            <td class="ec-val">${Number.isFinite(r.ec) ? r.ec.toFixed(2) : '—'}</td>
            <td>${Number.isFinite(r.volume) ? r.volume.toFixed(1) : '—'}</td>
            <td>${Number.isFinite(r.waterTemp) ? r.waterTemp.toFixed(1) + '°C' : '—'}</td>
            <td>${Number.isFinite(r.airTemp) ? r.airTemp.toFixed(1) + '°C' : '—'}</td>
            <td>${Number.isFinite(r.humidity) ? r.humidity.toFixed(0) + '%' : '—'}</td>
            <td class="ec-val">${formatMeasurementVpd(r)}</td>
            <td>${Number.isFinite(r.co2) ? r.co2.toFixed(0) + ' ppm' : '—'}</td>
            <td>${Number.isFinite(r.ppfd) ? r.ppfd.toFixed(0) : '—'}</td>
            <td>${Number.isFinite(r.lightHours) ? r.lightHours.toFixed(1) : '—'}</td>
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
