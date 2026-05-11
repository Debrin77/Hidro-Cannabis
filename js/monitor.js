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

function escapeHtmlAttr(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
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
  const targets =
    typeof getStrainTargetsForWeek === 'function' ? getStrainTargetsForWeek(strain, weekNum, phaseRef) : phaseRef;

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
    } else if (grow.co2 === 'si' && reading.co2 < (targets.co2Min || 600) * 0.85) {
      out.push({
        level: 'info',
        icon: 'molecule',
        title: 'CO₂ bajo para recinto enriquecido',
        text: `Orientativo en ${phaseRef.phase}: ~${targets.co2Min}–${targets.co2Max} ppm con CO₂ activado.`,
      });
    }
  }

  if (Number.isFinite(reading.ppfd)) {
    if (reading.ppfd < (targets.ppfdMin || 300) * 0.75) {
      out.push({
        level: 'warn',
        icon: 'bulb',
        title: 'PPFD bajo',
        text: `~${reading.ppfd.toFixed(0)} µmol/m²/s · banda orientativa ~${targets.ppfdMin}–${targets.ppfdMax} µmol/m²/s en ${phaseRef.phase}. Revisa altura o potencia.`,
      });
    }
    if (reading.ppfd > (targets.ppfdMax || 900) * 1.2) {
      out.push({
        level: 'danger',
        icon: 'sun',
        title: 'PPFD muy alto',
        text: `~${reading.ppfd.toFixed(0)} µmol/m²/s supera la banda alta (~${targets.ppfdMin}–${targets.ppfdMax} µmol/m²/s en ${phaseRef.phase}). Riesgo de estrés luminoso.`,
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
  const serious = parts.filter((p) => p.level === 'danger' || p.level === 'warn');
  if (!serious.length) {
    host.innerHTML = '';
    host.hidden = true;
    return;
  }
  host.innerHTML = serious
    .map(
      (p) =>
        `<div class="alert ${p.level === 'danger' ? 'danger' : 'warn'} monitor-live-alert"><i class="ti ti-${p.icon}"></i><div class="monitor-live-alert__body"><strong class="monitor-live-alert__title">${escapeMonitorHtml(p.title)}</strong><p class="monitor-live-alert__text">${escapeMonitorHtml(p.text)}</p></div></div>`,
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
  if (!myGrow) return;
  const t = ev.target;
  if (!t || typeof t.closest !== 'function') return;
  const mc = document.getElementById('monitorContent');
  const hc = document.getElementById('historialContent');
  const inForm = (mc && mc.contains(t)) || (hc && hc.contains(t));
  if (!inForm) return;
  const id = t.id;
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

/** Tarjeta de alertas (última medición + exterior + fase) para Inicio y Sistema. Mantenimiento por fechas: Calendario. */
function renderGrowAlertsCardHtml(grow) {
  if (!grow || !grow.strain) return '';
  const s = grow.strain;
  const daysSince = Math.floor((new Date() - grow.startDate) / 86400000);
  const weekNum = Math.max(1, Math.ceil((daysSince + 1) / 7));
  const smartAlerts = buildSmartAlerts(grow, s, weekNum);
  return `
    <div class="card">
      <div class="card-header"><div class="card-title"><i class="ti ti-alert-triangle"></i>Alertas activas</div></div>
      ${grow.ambTemp > 28 ? `<div class="alert warn"><i class="ti ti-thermometer"></i><p>Temperatura ambiente ${grow.ambTemp}°C detectada. Riesgo de solución caliente. Monitorear agua — no superar 23°C.</p></div>` : ''}
      ${
        weekNum >= grow.strain.vegW + grow.strain.flowerW - 2
          ? `<div class="alert warn"><i class="ti ti-scissors"></i><p>Inicio del periodo de Flush recomendado. Cambiar a agua RO · EC 0.1–0.3 · pH 6.0</p></div>`
          : ''
      }
      ${
        smartAlerts.length
          ? smartAlerts
              .map(
                (a) =>
                  `<div class="alert ${a.level === 'danger' ? 'danger' : a.level === 'warn' ? 'warn' : 'info'}"><i class="ti ti-${a.icon}"></i><p>${a.message}</p></div>`,
              )
              .join('')
          : `<div class="alert info"><i class="ti ti-check"></i><p>Sin alertas críticas en la última medición registrada.</p></div>`
      }
    </div>`;
}

/** Franja superior en Medir: nombre guardado, tipo técnico, selector multi-sistema y edición de etiqueta. */
function renderMonitorActiveSystemStripHtml() {
  if (!myGrow) return '';
  const code = myGrow.system || 'RDWC';
  const pr = typeof getSystemProfile === 'function' ? getSystemProfile(code) : null;
  const resolved =
    typeof getResolvedSystemDisplayName === 'function'
      ? getResolvedSystemDisplayName(myGrow, code)
      : pr?.label || code;
  const name = escapeMonitorHtml(resolved);
  const sub = pr?.solutionSubtitle ? escapeMonitorHtml(pr.solutionSubtitle) : '';
  const defPlace = escapeMonitorHtml(pr?.label || code);
  const inst =
    typeof findInstallationById === 'function' && myGrow.activeInstallationId
      ? findInstallationById(myGrow.activeInstallationId)
      : null;
  const inputVal = escapeMonitorHtml(
    inst && String(inst.name || '').trim()
      ? String(inst.name).trim()
      : myGrow.systemDisplayNames && typeof myGrow.systemDisplayNames === 'object'
        ? String(myGrow.systemDisplayNames[code] ?? '').trim()
        : '',
  );

  const available =
    typeof getAvailableWorkSystems === 'function' ? getAvailableWorkSystems() : [myGrow.activeInstallationId || code];
  const canSwitch = available.length > 1;
  const selectOpts = available
    .map((id) => {
      const installation = typeof findInstallationById === 'function' ? findInstallationById(id) : null;
      if (!installation) return '';
      const lab =
        String(installation.name || '').trim() ||
        (typeof getSystemProfile === 'function'
          ? getSystemProfile(installation.type).label || installation.type
          : installation.type);
      return `<option value="${escapeHtmlAttr(id)}" ${id === myGrow.activeInstallationId ? 'selected' : ''}>${escapeMonitorHtml(lab)} · ${escapeMonitorHtml(installation.type)}</option>`;
    })
    .filter(Boolean)
    .join('');
  const selectHtml = canSwitch
    ? `<label class="monitor-active-system__select-label" for="monitorWorkSystemSelect">Instalación de trabajo</label>
        <select id="monitorWorkSystemSelect" class="monitor-active-system__select" onchange="onMonitorWorkSystemSelectChange(this)">${selectOpts}</select>`
    : '';

  return `<section class="monitor-active-system" aria-labelledby="monitorActiveSysEyebrow">
    <div class="monitor-active-system__row">
      <div class="monitor-active-system__copy">
        <span id="monitorActiveSysEyebrow" class="monitor-active-system__eyebrow">Instalación activa</span>
        <span class="monitor-active-system__name">${name}</span>
        <div class="monitor-active-system__meta">
          <span class="monitor-active-system__code">${escapeMonitorHtml(code)}</span>
          ${sub ? `<span class="monitor-active-system__dot" aria-hidden="true">·</span><span class="monitor-active-system__sub-inline">${sub}</span>` : ''}
        </div>
        <div class="monitor-active-system__name-edit">
          <label class="monitor-active-system__hint" for="monitorSystemNameInput">Nombre de esta instalación (único; se usa en Medir, Calendario, Climatología…)</label>
          <div class="monitor-active-system__name-edit-row">
            <input type="text" id="monitorSystemNameInput" class="monitor-active-system__input" maxlength="48" placeholder="${defPlace}" value="${inputVal}" autocomplete="off" />
            <button type="button" class="btn btn-primary btn--compact" onclick="saveMonitorActiveSystemDisplayName()">Guardar</button>
          </div>
        </div>
      </div>
      <div class="monitor-active-system__controls">${selectHtml}</div>
    </div>
  </section>`;
}

function onMonitorWorkSystemSelectChange(sel) {
  const v = sel && sel.value;
  if (!myGrow || !v || v === myGrow.activeInstallationId) return;
  if (typeof applyWorkSystemSelection === 'function') applyWorkSystemSelection(v);
  if (typeof confirmWorkSystemSelection === 'function') confirmWorkSystemSelection();
}

function saveMonitorActiveSystemDisplayName() {
  if (!myGrow || !appConfig) return;
  const code = myGrow.system || 'RDWC';
  const inp = document.getElementById('monitorSystemNameInput');
  if (!inp) return;
  let v = String(inp.value || '').trim();
  if (v.length > 48) v = v.slice(0, 48);
  const defLab =
    typeof getSystemProfile === 'function' ? getSystemProfile(code).label || code : code;
  const targetName = v || defLab;
  if (typeof ensureAppConfigInstallations === 'function') ensureAppConfigInstallations();
  const inst = typeof findInstallationById === 'function' ? findInstallationById(myGrow.activeInstallationId) : null;
  if (inst && typeof installationNameIsUnique === 'function') {
    if (!installationNameIsUnique(targetName, inst.id)) {
      myGrow.log.unshift({
        date: new Date().toISOString(),
        text: 'Ese nombre ya lo usa otra instalación. Elige otro distintivo.',
        type: 'warn',
      });
      saveGrowState();
      renderMonitor();
      return;
    }
    inst.name = targetName;
    saveAppConfig();
  } else {
    myGrow.systemDisplayNames =
      myGrow.systemDisplayNames &&
      typeof myGrow.systemDisplayNames === 'object' &&
      !Array.isArray(myGrow.systemDisplayNames)
        ? { ...myGrow.systemDisplayNames }
        : {};
    if (!v || v === defLab) {
      delete myGrow.systemDisplayNames[code];
    } else {
      myGrow.systemDisplayNames[code] = v;
    }
    if (!Object.keys(myGrow.systemDisplayNames).length) delete myGrow.systemDisplayNames;
  }
  saveGrowState();
  renderMonitor();
  if (typeof renderSemanas === 'function') renderSemanas();
  if (typeof renderClimatologia === 'function') renderClimatologia();
  if (typeof renderInicio === 'function') renderInicio();
  if (typeof renderCultivo === 'function') renderCultivo();
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
  const rdwc = isMonitorRdwc(myGrow);
  const latestCircuit = getLatestMeasurementForPlant(myGrow, selectedPlant);
  const phLive = latestCircuit && Number.isFinite(latestCircuit.ph) ? latestCircuit.ph : null;
  const ecLive = latestCircuit && Number.isFinite(latestCircuit.ec) ? latestCircuit.ec : null;
  const phaseRefQuick = getPhaseReference(s, weekNum);
  const band =
    typeof getStrainTargetsForWeek === 'function'
      ? getStrainTargetsForWeek(s, weekNum, phaseRefQuick)
      : phaseRefQuick;
  const phScaleLo = Math.max(4.5, band.phMin - 0.35);
  const phScaleHi = Math.min(8.5, band.phMax + 0.35);
  const phPct =
    phLive != null
      ? Math.min(100, Math.max(0, ((phLive - phScaleLo) / (phScaleHi - phScaleLo)) * 100))
      : Math.min(100, Math.max(0, (((band.phMin + band.phMax) / 2 - phScaleLo) / (phScaleHi - phScaleLo)) * 100));
  const ecScaleLo = Math.max(0, band.ecMin - 0.2);
  const ecScaleHi = Math.min(3.5, band.ecMax + 0.2);
  const ecPct =
    ecLive != null
      ? Math.min(100, Math.max(0, ((ecLive - ecScaleLo) / (ecScaleHi - ecScaleLo)) * 100))
      : Math.min(100, Math.max(0, (((band.ecMin + band.ecMax) / 2 - ecScaleLo) / (ecScaleHi - ecScaleLo)) * 100));
  const waterLive = latestCircuit && Number.isFinite(latestCircuit.waterTemp) ? latestCircuit.waterTemp : null;
  const hrLive = latestCircuit && Number.isFinite(latestCircuit.humidity) ? latestCircuit.humidity : null;
  const airLive = latestCircuit && Number.isFinite(latestCircuit.airTemp) ? latestCircuit.airTemp : null;
  const vpdLive = computeVpdKpa(latestCircuit?.airTemp, latestCircuit?.humidity);
  const dliLive = computeDliMolM2d(latestCircuit?.ppfd, latestCircuit?.lightHours);
  const ppfdLive = latestCircuit && Number.isFinite(latestCircuit.ppfd) ? latestCircuit.ppfd : null;
  const greenhouseCard = renderGreenhouseMonitoringCard(myGrow, latestCircuit, phaseRefQuick);
  const waterPct =
    waterLive != null
      ? Math.min(
          100,
          Math.max(
            0,
            ((waterLive - (band.waterTempMin - 2)) / (band.waterTempMax + 3 - (band.waterTempMin - 2))) * 100,
          ),
        )
      : 50;
  const rhCeilUi =
    weekNum > s.vegW + 2 && band.flowerRHMax != null
      ? Math.min(phaseRefQuick.humidityMax, band.flowerRHMax)
      : phaseRefQuick.humidityMax;
  const phBandLabel = `${band.phMin.toFixed(1)}–${band.phMax.toFixed(1)} · OK (${phaseRefQuick.phase})`;
  const ecBandLabel = `${band.ecMin.toFixed(2)}–${band.ecMax.toFixed(2)} mS/cm · OK`;
  const wtBandLabel = `${band.waterTempMin.toFixed(0)}–${band.waterTempMax.toFixed(0)}°C · agua raíz`;
  const airBandLabel =
    band.airTempMin != null && band.airTempMax != null
      ? `${band.airTempMin}–${band.airTempMax}°C · copa`
      : 'Microclima';
  const ppfdBandLabel =
    phaseRefQuick.ppfdMin != null && phaseRefQuick.ppfdMax != null
      ? `${phaseRefQuick.ppfdMin}–${phaseRefQuick.ppfdMax} µmol · fase`
      : 'sensor cuántico';
  const co2BandLabel =
    myGrow.co2 === 'si' && phaseRefQuick.co2Min != null && phaseRefQuick.co2Max != null
      ? `${phaseRefQuick.co2Min}–${phaseRefQuick.co2Max} ppm · CO₂`
      : '';
  mc.innerHTML=`
    ${renderMonitorActiveSystemStripHtml()}
    <div class="card monitor-snapshot-card">
      <div class="card-header"><div class="card-title"><i class="ti ti-activity-heartbeat"></i>Resumen · última medición</div></div>
      <p class="body-prose body-prose--tight monitor-snapshot-lead">Valores más recientes según planta o circuito. Las bandas <strong>OK</strong> cruzan la fase del cultivo con los rangos pH/EC de la cepa y límites de instrumentación donde aplica.</p>
      <div class="monitor-snapshot-inner">
    <div class="grid4 monitor-metrics">
      <div class="metric"><div class="metric-label">pH ${rdwc ? '(circuito)' : 'actual'}</div><div class="metric-val c-blue">${phLive != null ? phLive.toFixed(1) : '—'}</div><div class="metric-unit">${phBandLabel}</div><div class="metric-bar"><div class="metric-fill metric-fill--ph" style="--fill-pct:${phPct.toFixed(0)}%"></div></div></div>
      <div class="metric"><div class="metric-label">EC ${rdwc ? '(circuito)' : 'actual'}</div><div class="metric-val c-green">${ecLive != null ? ecLive.toFixed(2) : ((band.ecMin + band.ecMax) / 2).toFixed(2)}</div><div class="metric-unit">${ecBandLabel}</div><div class="metric-bar"><div class="metric-fill metric-fill--ec" style="--fill-pct:${ecPct.toFixed(0)}%"></div></div></div>
      <div class="metric"><div class="metric-label">Tª agua</div><div class="metric-val c-purple">${waterLive != null ? waterLive.toFixed(1) + '°C' : '—'}</div><div class="metric-unit">${wtBandLabel}</div><div class="metric-bar"><div class="metric-fill metric-fill--ec" style="--fill-pct:${waterPct.toFixed(0)}%"></div></div></div>
      <div class="metric"><div class="metric-label">VPD aire</div><div class="metric-val c-amber">${vpdLive != null ? vpdLive.toFixed(2) + ' kPa' : '—'}</div><div class="metric-unit">${phaseRefQuick.vpdMin != null ? phaseRefQuick.vpdMin.toFixed(2) + '–' + phaseRefQuick.vpdMax.toFixed(2) + ' kPa · OK' : 'Necesita Tª aire + HR'}</div></div>
    </div>
    <div class="grid4 monitor-metrics monitor-metrics--tight">
      <div class="metric"><div class="metric-label">Humedad</div><div class="metric-val c-blue">${hrLive != null ? hrLive.toFixed(0) + '%' : '—'}</div><div class="metric-unit">${phaseRefQuick.humidityMin}–${rhCeilUi}% · HR OK</div></div>
      <div class="metric"><div class="metric-label">Tª aire (copa)</div><div class="metric-val">${airLive != null ? airLive.toFixed(1) + '°C' : '—'}</div><div class="metric-unit">${airBandLabel}</div></div>
      <div class="metric"><div class="metric-label">DLI estimado</div><div class="metric-val">${dliLive != null ? dliLive.toFixed(1) + ' mol/m²/d' : '—'}</div><div class="metric-unit">PPFD × horas luz</div></div>
      <div class="metric"><div class="metric-label">PPFD último</div><div class="metric-val">${ppfdLive != null ? ppfdLive.toFixed(0) + ' µmol' : '—'}</div><div class="metric-unit">${ppfdBandLabel}${co2BandLabel ? '<br><span class="metric-unit-sub">' + co2BandLabel + '</span>' : ''}</div></div>
    </div>
      </div>
    </div>

    ${greenhouseCard}

    <details class="card monitor-nutrient-details">
      <summary class="monitor-nutrient-details__summary">
        <div class="monitor-nutrient-details__summary-text">
          <span class="monitor-nutrient-details__title"><i class="ti ti-flask" aria-hidden="true"></i> Nutriente activo: ${escapeMonitorHtml(n.name)}</span>
          <span class="monitor-nutrient-details__strain"><i class="ti ti-seedling" aria-hidden="true"></i> Variedad: ${escapeMonitorHtml(s.name)}${
            s.typeName ? ` · ${escapeMonitorHtml(s.typeName)}` : ''
          }</span>
        </div>
        <i class="ti ti-chevron-down monitor-nutrient-details__chev" aria-hidden="true"></i>
      </summary>
      <div class="monitor-nutrient-details__body">
      <div class="grid2">
        <div>
          <div class="section-label">Dosis esta semana</div>
          <div class="body-prose body-prose--roomy">
            ${weekNum<=1?n.phases.germ:weekNum<=s.vegW?n.phases.veg:weekNum>=s.vegW+s.flowerW?n.phases.flush:n.phases.flower}
          </div>
        </div>
        <div>
          <div class="section-label">Aditivos recomendados</div>
          <div class="pill-tag-row">${n.aditivos.map(a=>`<span class="pill-tag">${escapeMonitorHtml(a)}</span>`).join('')}</div>
        </div>
      </div>
      </div>
    </details>

    <div class="card monitor-measure-assistant-card">
      <div class="card-header"><div class="card-title"><i class="ti ti-clipboard-data"></i> Asistente de mediciones</div></div>
      <p class="body-prose body-prose--tight">Los campos dependen de la instrumentación y del perfil de espacio que configuraste en <strong>Sistema</strong>. Al guardar, la entrada queda en <strong>Historial</strong>.</p>
      ${renderMeasurementAssistantContextBanner()}
      ${renderMeasurementAssistantFormInnerHtml()}
    </div>
    ${renderPlantTrendCard()}
  `;
  requestAnimationFrame(() => {
    if (typeof initMonitorLiveValidation === 'function') initMonitorLiveValidation();
  });
}

function renderGreenhouseMonitoringCard(grow, latestCircuit, phaseRefQuick) {
  const c =
    typeof normalizeHardwareComplements === 'function'
      ? normalizeHardwareComplements(grow?.hardwareComplements)
      : null;
  if (!c) return '';
  const tags = [];
  if (c.greenhouseReflectiveInterior) tags.push('<span class="pill-tag">Interior reflectante</span>');
  if (c.greenhouseAerationControl) tags.push('<span class="pill-tag">Aireación controlada</span>');
  if (c.greenhouseHumidityControl) tags.push('<span class="pill-tag">Control de humedad</span>');
  if (c.greenhouseLedMode !== 'none') {
    const ledLabel =
      c.greenhouseLedMode === 'full'
        ? 'LED espectro completo'
        : c.greenhouseLedMode === 'veg_bloom'
          ? 'LED canales Veg/Bloom'
          : 'LED suplementario';
    tags.push(`<span class="pill-tag">${ledLabel}${Number.isFinite(c.greenhouseLedPowerW) ? ` · ${c.greenhouseLedPowerW}W` : ''}</span>`);
  }
  if (!tags.length) return '';
  const warns = [];
  if (!c.greenhouseAerationControl && Number.isFinite(latestCircuit?.airTemp) && latestCircuit.airTemp >= 29) {
    warns.push('Sin aireación activa y Tª aire alta: riesgo de estrés térmico.');
  }
  if (!c.greenhouseHumidityControl && Number.isFinite(latestCircuit?.humidity) && latestCircuit.humidity >= 75) {
    warns.push('Sin control de humedad y HR elevada: incrementa riesgo fúngico.');
  }
  if (
    c.greenhouseLedMode !== 'none' &&
    !c.meterPpfd &&
    !Number.isFinite(latestCircuit?.ppfd)
  ) {
    warns.push('Hay LED declarado sin seguimiento PPFD; conviene medir para ajustar DLI.');
  }
  return `<div class="card">
      <div class="card-header"><div class="card-title"><i class="ti ti-building"></i>Monitor del recinto (opcional)</div></div>
      <div class="pill-tag-row">${tags.join('')}</div>
      <p class="text-muted mt-8">Objetivo fase ${phaseRefQuick.phase}: HR ${phaseRefQuick.humidityMin}-${phaseRefQuick.humidityMax}% y balance aire/humedad estable según tabla.</p>
      ${warns.length ? warns.map((msg) => `<div class="alert warn"><i class="ti ti-alert-triangle"></i><p>${msg}</p></div>`).join('') : '<div class="alert info"><i class="ti ti-check"></i><p>Opciones del recinto registradas y disponibles para seguimiento.</p></div>'}
    </div>`;
}

function addLog() {
  const inp = document.getElementById('logInput');
  if (!inp || !inp.value.trim() || !myGrow) return;
  myGrow.log.unshift({ date: new Date().toISOString(), text: inp.value.trim(), type: 'info' });
  saveGrowState();
  inp.value = '';
  if (typeof renderHistorial === 'function') renderHistorial();
  if (typeof renderInicio === 'function') renderInicio();
  if (typeof renderCultivo === 'function') renderCultivo();
}

/** Texto de corrección calculado para persistir con la medición (Historial). */
function buildMeasurementCorrectionNote(reading, grow) {
  if (!grow?.strain || !reading) return '';
  const strain = grow.strain;
  const daysSince = Math.floor((new Date() - grow.startDate) / 86400000);
  const weekNum = Math.max(1, Math.ceil((daysSince + 1) / 7));
  const phaseRef = getPhaseReference(strain, weekNum);
  const lines = [];
  if (typeof buildStrainCorrectionPlan === 'function') {
    const plan = buildStrainCorrectionPlan(reading, strain, weekNum, phaseRef, grow);
    for (const st of plan.steps || []) {
      lines.push(`${st.title}: ${st.detail}`);
    }
  }
  if (!lines.length) {
    const hints = buildLiveMeasureHints(reading, grow).filter((h) => h.level === 'danger' || h.level === 'warn');
    for (const h of hints) {
      lines.push(`${h.title}: ${h.text}`);
    }
  }
  return lines.join('\n\n').trim();
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
    if (typeof renderHistorial === 'function') renderHistorial();
    if (typeof renderInicio === 'function') renderInicio();
    renderMonitor();
    return;
  }
  if (!Number.isFinite(reading.ec) || reading.ec < 0 || reading.ec > 4) {
    myGrow.log.unshift({ date: new Date().toISOString(), text: 'Medición rechazada: EC fuera de rango (0–4).', type: 'warn' });
    saveGrowState();
    if (typeof renderHistorial === 'function') renderHistorial();
    if (typeof renderInicio === 'function') renderInicio();
    renderMonitor();
    return;
  }

  const correctionNote = buildMeasurementCorrectionNote(reading, myGrow);
  if (correctionNote) reading.correctionNote = correctionNote;

  myGrow.measurements = Array.isArray(myGrow.measurements) ? myGrow.measurements : [];
  myGrow.measurements.unshift(reading);
  myGrow.measurements = myGrow.measurements.slice(0, 30);
  if (Number.isFinite(reading.volume) && reading.volume > 0) {
    myGrow.reservoirL = Math.max(5, Math.min(2000, reading.volume));
  }
  const scopeLabel = rdwc ? 'circuito RDWC' : `P${plantId}`;
  const summaryParts = [
    `pH ${reading.ph.toFixed(1)}`,
    `EC ${reading.ec.toFixed(2)}`,
    `Vol ${(Number.isFinite(reading.volume) && reading.volume > 0 ? reading.volume : myGrow.reservoirL)}L`,
  ];
  if (Number.isFinite(reading.waterTemp)) summaryParts.push(`Tª agua ${reading.waterTemp.toFixed(1)}°C`);
  if (Number.isFinite(reading.airTemp) && Number.isFinite(reading.humidity)) {
    const vpdStr = formatMeasurementVpd(reading);
    if (vpdStr !== '—') summaryParts.push(`VPD ${vpdStr} kPa`);
  }
  if (reading.note) summaryParts.push(`Nota: ${reading.note}`);
  let logLine = `Medición guardada (${scopeLabel}) · ${summaryParts.join(' · ')}`;
  if (correctionNote) logLine += ' · Corrección orientativa guardada en la fila (columna Corrección).';
  myGrow.log.unshift({
    date: new Date().toISOString(),
    text: logLine,
    type: correctionNote ? 'warn' : 'ok',
  });
  saveGrowState();
  if (typeof renderHistorial === 'function') renderHistorial();
  if (typeof renderInicio === 'function') renderInicio();
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
      <table class="week-table week-table--stack">
        <thead><tr><th>Fecha</th><th>${rdwc ? 'Sitio' : 'Planta'}</th><th>pH</th><th>EC</th><th>Vol</th><th>Tª agua</th><th>Tª aire</th><th>HR</th><th>VPD</th><th>CO₂</th><th>PPFD</th><th>h luz</th><th>Notas</th></tr></thead>
        <tbody>
          ${rows.map(r=>`<tr>
            <td data-label="Fecha">${new Date(r.date).toLocaleDateString('es-ES')} ${new Date(r.date).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}</td>
            <td data-label="${rdwc ? 'Sitio' : 'Planta'}" class="ec-val">${measurementSiteLabel(myGrow, r)}</td>
            <td data-label="pH" class="ec-val">${Number.isFinite(r.ph)?r.ph.toFixed(1):'—'}</td>
            <td data-label="EC" class="ec-val">${Number.isFinite(r.ec)?r.ec.toFixed(2):'—'}</td>
            <td data-label="Vol">${Number.isFinite(r.volume)?r.volume.toFixed(1):'—'}</td>
            <td data-label="Tª agua">${Number.isFinite(r.waterTemp)?r.waterTemp.toFixed(1)+'°C':'—'}</td>
            <td data-label="Tª aire">${Number.isFinite(r.airTemp)?r.airTemp.toFixed(1)+'°C':'—'}</td>
            <td data-label="HR">${Number.isFinite(r.humidity)?r.humidity.toFixed(0)+'%':'—'}</td>
            <td data-label="VPD" class="ec-val">${formatMeasurementVpd(r)}</td>
            <td data-label="CO₂">${Number.isFinite(r.co2)?r.co2.toFixed(0)+' ppm':'—'}</td>
            <td data-label="PPFD">${Number.isFinite(r.ppfd)?r.ppfd.toFixed(0):'—'}</td>
            <td data-label="h luz">${Number.isFinite(r.lightHours)?r.lightHours.toFixed(1):'—'}</td>
            <td data-label="Notas">${r.note || '—'}</td>
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
  const daysSince = Math.floor((new Date() - myGrow.startDate) / 86400000);
  const weekNum = Math.max(1, Math.ceil((daysSince + 1) / 7));
  const phaseRef = getPhaseReference(strain, weekNum);
  const rdwc = isMonitorRdwc(myGrow);
  const scopeTitle = rdwc ? 'Circuito (solución común)' : `Planta P${plantId}`;
  const prof = typeof getSystemProfile === 'function' ? getSystemProfile(myGrow.system) : { chartModes: [], label: myGrow.system };
  const resolvedSysLabel =
    typeof getResolvedSystemDisplayName === 'function'
      ? getResolvedSystemDisplayName(myGrow, myGrow.system)
      : prof.label || myGrow.system;
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
          Gráficos · ${escapeMonitorHtml(resolvedSysLabel)} · ${scopeTitle} · ${phaseRef.phase}
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
        ? 'Registra una medición del depósito en Medir (asistente de mediciones) para alertas sobre la solución común del RDWC.'
        : `Registra una medición en Medir (asistente de mediciones) para alertas inteligentes en P${plantId}.`,
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
      message: `${tag}: pH fuera de banda (${strain.name}): ${latest.ph.toFixed(1)} (orientativo ~${targets.phMin.toFixed(2)}–${targets.phMax.toFixed(2)}).`,
    });
  }

  if (Number.isFinite(latest.ec) && latest.ec < targets.ecMin) {
    alerts.push({
      level: 'warn',
      icon: 'battery-2',
      message: `${tag}: EC baja (${strain.name}): ${latest.ec.toFixed(2)} mS/cm (banda orientativa ~${targets.ecMin.toFixed(2)}–${targets.ecMax.toFixed(2)} mS/cm).`,
    });
  }
  if (Number.isFinite(latest.ec) && latest.ec > targets.ecMax) {
    alerts.push({
      level: 'danger',
      icon: 'flame',
      message: `${tag}: EC alta (${strain.name}): ${latest.ec.toFixed(2)} mS/cm (banda orientativa ~${targets.ecMin.toFixed(2)}–${targets.ecMax.toFixed(2)} mS/cm).`,
    });
  }

  if (
    Number.isFinite(latest.waterTemp) &&
    Number.isFinite(targets.waterTempMax) &&
    latest.waterTemp > targets.waterTempMax + 1.5
  ) {
    alerts.push({
      level: 'danger',
      icon: 'temperature',
      message: `${tag}: Temperatura de agua elevada (${latest.waterTemp.toFixed(1)}°C). Banda cómoda orientativa ~${targets.waterTempMin.toFixed(0)}–${targets.waterTempMax.toFixed(0)}°C para ${strain.name}; riesgo de bajo O₂ disuelto y estrés radicular.`,
    });
  } else if (
    Number.isFinite(latest.waterTemp) &&
    Number.isFinite(targets.waterTempMax) &&
    latest.waterTemp > targets.waterTempMax
  ) {
    alerts.push({
      level: 'warn',
      icon: 'temperature',
      message: `${tag}: Tª agua alta (${latest.waterTemp.toFixed(1)}°C). Objetivo orientativo ~${targets.waterTempMin.toFixed(0)}–${targets.waterTempMax.toFixed(0)}°C.`,
    });
  }
  if (
    Number.isFinite(latest.waterTemp) &&
    Number.isFinite(targets.waterTempMin) &&
    latest.waterTemp < targets.waterTempMin - 1
  ) {
    alerts.push({
      level: 'warn',
      icon: 'temperature',
      message: `${tag}: Tª agua baja (${latest.waterTemp.toFixed(1)}°C). Banda orientativa ~${targets.waterTempMin.toFixed(0)}–${targets.waterTempMax.toFixed(0)}°C; raíces muy frías frenan asimilación.`,
    });
  }
  const rhCeil = weekNum > strain.vegW + 2 && targets.flowerRHMax != null ? targets.flowerRHMax : phaseRef.humidityMax;
  if (Number.isFinite(latest.humidity) && latest.humidity > rhCeil) {
    alerts.push({
      level: 'warn',
      icon: 'droplet-filled',
      message: `${tag}: Humedad alta (${latest.humidity.toFixed(0)}%) — banda orientativa ~${phaseRef.humidityMin}–${rhCeil}% (${phaseRef.phase}${weekNum > strain.vegW + 2 ? ', cogollos' : ''}).`,
    });
  }
  if (Number.isFinite(latest.humidity) && latest.humidity < phaseRef.humidityMin) {
    alerts.push({
      level: 'warn',
      icon: 'wind',
      message: `${tag}: Humedad baja (${latest.humidity.toFixed(0)}%). Banda orientativa ~${phaseRef.humidityMin}–${phaseRef.humidityMax}% en ${phaseRef.phase}.`,
    });
  }

  if (
    Number.isFinite(latest.airTemp) &&
    Number.isFinite(targets.airTempMin) &&
    Number.isFinite(targets.airTempMax)
  ) {
    if (latest.airTemp < targets.airTempMin - 1.5) {
      alerts.push({
        level: 'warn',
        icon: 'thermometer',
        message: `${tag}: Tª copa baja (${latest.airTemp.toFixed(1)}°C). Banda orientativa ~${targets.airTempMin}–${targets.airTempMax}°C en ${phaseRef.phase}.`,
      });
    } else if (latest.airTemp > targets.airTempMax + 1.5) {
      alerts.push({
        level: 'warn',
        icon: 'thermometer',
        message: `${tag}: Tª copa alta (${latest.airTemp.toFixed(1)}°C). Banda orientativa ~${targets.airTempMin}–${targets.airTempMax}°C en ${phaseRef.phase}.`,
      });
    }
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
    if (grow.co2 === 'si' && latest.co2 < (targets.co2Min || 600) * 0.85) {
      alerts.push({
        level: 'info',
        icon: 'molecule',
        message: `${tag}: CO₂ ${latest.co2.toFixed(0)} ppm por debajo del rango orientativo ~${targets.co2Min}–${targets.co2Max} ppm (${phaseRef.phase}, enriquecimiento).`,
      });
    }
    if (latest.co2 < 350) {
      alerts.push({ level: 'warn', icon: 'alert-circle', message: `${tag}: CO₂ muy bajo (${latest.co2.toFixed(0)} ppm). Comprueba ventilación o medición.` });
    }
  }

  if (Number.isFinite(latest.ppfd)) {
    if (latest.ppfd < (targets.ppfdMin || 300) * 0.75) {
      alerts.push({
        level: 'warn',
        icon: 'bulb',
        message: `${tag}: PPFD bajo (${latest.ppfd.toFixed(0)} µmol/m²/s). Banda orientativa ~${targets.ppfdMin}–${targets.ppfdMax} µmol/m²/s en ${phaseRef.phase}.`,
      });
    }
    if (latest.ppfd > (targets.ppfdMax || 900) * 1.2) {
      alerts.push({
        level: 'danger',
        icon: 'sun',
        message: `${tag}: PPFD muy alto (${latest.ppfd.toFixed(0)} µmol/m²/s). Banda orientativa ~${targets.ppfdMin}–${targets.ppfdMax} µmol/m²/s en ${phaseRef.phase}.`,
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
      airTempMin: 22,
      airTempMax: 26,
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
      airTempMin: 23,
      airTempMax: 28,
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
      airTempMin: 22,
      airTempMax: 27,
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
      airTempMin: 20,
      airTempMax: 26,
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
      airTempMin: 19,
      airTempMax: 25,
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
    airTempMin: 18,
    airTempMax: 24,
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
    return `<div class="alert info"><i class="ti ti-info-circle"></i><p>No hay mediciones guardadas. Regístralas en <strong>Medir</strong> con el asistente de mediciones.</p></div>`;
  }
  const rdwc = isMonitorRdwc(myGrow);
  return `
    <div class="table-scroll table-scroll--mt-sm">
      <table class="week-table week-table--stack">
        <thead><tr><th>Fecha</th><th>${rdwc ? 'Sitio' : 'Pl.'}</th><th>pH</th><th>EC</th><th>Vol</th><th>Tª agua</th><th>Tª aire</th><th>HR</th><th>VPD</th><th>CO₂</th><th>PPFD</th><th>h</th><th>Notas</th><th>Corrección</th></tr></thead>
        <tbody>
          ${rows.map((r) => {
            const corr = typeof r.correctionNote === 'string' ? r.correctionNote.trim() : '';
            const corrCell = corr
              ? `<details class="meas-correction-details"><summary>Corrección</summary><div class="meas-correction-body">${escapeMonitorHtml(corr).replace(/\n/g, '<br>')}</div></details>`
              : '—';
            return `<tr>
            <td data-label="Fecha">${new Date(r.date).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
            <td data-label="${rdwc ? 'Sitio' : 'Pl.'}" class="ec-val">${measurementSiteLabel(myGrow, r)}</td>
            <td data-label="pH" class="ec-val">${Number.isFinite(r.ph) ? r.ph.toFixed(1) : '—'}</td>
            <td data-label="EC" class="ec-val">${Number.isFinite(r.ec) ? r.ec.toFixed(2) : '—'}</td>
            <td data-label="Vol">${Number.isFinite(r.volume) ? r.volume.toFixed(1) : '—'}</td>
            <td data-label="Tª agua">${Number.isFinite(r.waterTemp) ? r.waterTemp.toFixed(1) + '°C' : '—'}</td>
            <td data-label="Tª aire">${Number.isFinite(r.airTemp) ? r.airTemp.toFixed(1) + '°C' : '—'}</td>
            <td data-label="HR">${Number.isFinite(r.humidity) ? r.humidity.toFixed(0) + '%' : '—'}</td>
            <td data-label="VPD" class="ec-val">${formatMeasurementVpd(r)}</td>
            <td data-label="CO₂">${Number.isFinite(r.co2) ? r.co2.toFixed(0) + ' ppm' : '—'}</td>
            <td data-label="PPFD">${Number.isFinite(r.ppfd) ? r.ppfd.toFixed(0) : '—'}</td>
            <td data-label="h">${Number.isFinite(r.lightHours) ? r.lightHours.toFixed(1) : '—'}</td>
            <td data-label="Notas" class="table-cell-note">${r.note ? escapeMonitorHtml(r.note) : '—'}</td>
            <td data-label="Corrección" class="meas-correction-cell">${corrCell}</td>
          </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

const HISTORY_CHECKLIST_DEFAULT = [
  { id: 'measure-ph-ec', label: 'Medición pH y EC registrada' },
  { id: 'measure-temp', label: 'Temperatura de agua revisada' },
  { id: 'inspect-roots', label: 'Inspección visual de raíces / cubos' },
  { id: 'inspect-lines', label: 'Revisión de mangueras y conexiones' },
  { id: 'clean-tools', label: 'Limpieza / calibración de instrumentos' },
  { id: 'topup-change', label: 'Reposición o cambio de solución planificado' },
];

let historyDiaryPendingPhotos = [];

function ensureHistoryData(grow) {
  if (!grow || typeof grow !== 'object') return;
  if (!Array.isArray(grow.historyChecklist)) {
    grow.historyChecklist = HISTORY_CHECKLIST_DEFAULT.map((i) => ({ ...i, done: false, updatedAt: null }));
  }
  if (!Array.isArray(grow.diaryEntries)) grow.diaryEntries = [];
}

function toggleHistoryChecklistItem(itemId) {
  if (!myGrow) return;
  ensureHistoryData(myGrow);
  const row = myGrow.historyChecklist.find((x) => x.id === itemId);
  if (!row) return;
  row.done = !row.done;
  row.updatedAt = new Date().toISOString();
  saveGrowState();
  renderHistorial();
}

function removeHistoryDiaryPendingPhoto(idx) {
  historyDiaryPendingPhotos = historyDiaryPendingPhotos.filter((_, i) => i !== idx);
  renderHistorial();
}

function downscaleImageFileToDataUrl(file, maxEdge = 1200, quality = 0.82) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result || ''));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(String(reader.result || ''));
      img.src = String(reader.result || '');
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

async function onHistoryDiaryPhotosChange(ev) {
  const files = Array.from(ev?.target?.files || []);
  if (!files.length) return;
  const allowed = files.filter((f) => /^image\//i.test(f.type)).slice(0, 6);
  const dataUrls = [];
  for (const file of allowed) {
    const url = await downscaleImageFileToDataUrl(file);
    if (url) dataUrls.push(url);
  }
  historyDiaryPendingPhotos = [...historyDiaryPendingPhotos, ...dataUrls].slice(0, 6);
  renderHistorial();
}

function saveHistoryDiaryEntry() {
  if (!myGrow) return;
  ensureHistoryData(myGrow);
  const title = String(document.getElementById('histDiaryTitle')?.value || '').trim();
  const note = String(document.getElementById('histDiaryNote')?.value || '').trim();
  const kind = String(document.getElementById('histDiaryKind')?.value || 'seguimiento');
  if (!title && !note && !historyDiaryPendingPhotos.length) return;
  const entry = {
    id: `d${Date.now()}`,
    date: new Date().toISOString(),
    kind,
    title: title || 'Entrada de diario',
    note,
    photos: [...historyDiaryPendingPhotos],
  };
  myGrow.diaryEntries.unshift(entry);
  myGrow.diaryEntries = myGrow.diaryEntries.slice(0, 60);
  myGrow.log.unshift({
    date: new Date().toISOString(),
    type: 'info',
    text: `Diario: ${entry.title}${entry.photos.length ? ` · ${entry.photos.length} foto(s)` : ''}`,
  });
  historyDiaryPendingPhotos = [];
  saveGrowState();
  renderHistorial();
}

function renderHistoryChecklistSection(grow) {
  ensureHistoryData(grow);
  const rows = grow.historyChecklist || [];
  const done = rows.filter((x) => x.done).length;
  const pct = rows.length ? Math.round((done / rows.length) * 100) : 0;
  return `<div class="card">
      <div class="card-header"><div class="card-title"><i class="ti ti-checklist"></i> Checklist operativo</div></div>
      <p class="historial-quick-ref__hint">Control rápido de mantenimiento y revisión del sistema.</p>
      <div class="dash-mini-bar historial-check-bar" style="--dash-pct:${pct}%"><span></span></div>
      <p class="form-hint">Completado: ${done}/${rows.length}</p>
      <div class="expert-checklist">
        ${rows
          .map(
            (r) => `<label class="expert-item expert-item--compact">
            <input type="checkbox" ${r.done ? 'checked' : ''} onchange="toggleHistoryChecklistItem('${r.id}')">
            <span><span class="expert-item-title">${escapeMonitorHtml(r.label)}</span></span>
          </label>`,
          )
          .join('')}
      </div>
    </div>`;
}

function renderHistoryDiarySection(grow) {
  ensureHistoryData(grow);
  const entries = Array.isArray(grow.diaryEntries) ? grow.diaryEntries : [];
  const pending = historyDiaryPendingPhotos
    .map(
      (src, i) => `<div class="hist-diary-photo-chip">
      <img src="${src}" alt="Foto pendiente ${i + 1}">
      <button type="button" class="btn btn-ghost btn--tiny" onclick="removeHistoryDiaryPendingPhoto(${i})">Quitar</button>
    </div>`,
    )
    .join('');
  const feed = entries.length
    ? entries
        .map(
          (e) => `<article class="hist-diary-entry">
          <header>
            <strong>${escapeMonitorHtml(e.title || 'Entrada')}</strong>
            <span>${new Date(e.date).toLocaleString('es-ES')}</span>
          </header>
          <p class="hist-diary-kind">${escapeMonitorHtml(e.kind || 'seguimiento')}</p>
          ${e.note ? `<p class="historial-quick-ref__hint">${escapeMonitorHtml(e.note)}</p>` : ''}
          ${
            Array.isArray(e.photos) && e.photos.length
              ? `<div class="hist-diary-photo-grid">${e.photos
                  .map((p, idx) => `<img src="${p}" alt="Foto de diario ${idx + 1}">`)
                  .join('')}</div>`
              : ''
          }
        </article>`,
        )
        .join('')
    : `<div class="alert info"><i class="ti ti-info-circle"></i><p>Aún no hay entradas de diario. Añade notas y fotos de evolución.</p></div>`;

  return `<div class="card">
      <div class="card-header"><div class="card-title"><i class="ti ti-notebook"></i> Diario y evolución (con fotos)</div></div>
      <div class="grid2">
        <div class="form-group"><label>Título</label><input id="histDiaryTitle" class="input-grow" type="text" placeholder="Ej: Semana 4, ajuste de bomba"></div>
        <div class="form-group"><label>Tipo</label>
          <select id="histDiaryKind">
            <option value="seguimiento">Seguimiento</option>
            <option value="sistema">Sistema</option>
            <option value="planta">Planta</option>
            <option value="recuerdo">Recuerdo</option>
          </select>
        </div>
      </div>
      <div class="form-group"><label>Nota</label><textarea id="histDiaryNote" class="input-grow" rows="3" placeholder="Qué cambió hoy, observaciones, decisiones, etc."></textarea></div>
      <div class="form-group">
        <label>Fotos (máx 6)</label>
        <input id="histDiaryPhotos" type="file" accept="image/*" multiple onchange="onHistoryDiaryPhotosChange(event)">
        <span class="form-hint">Sirve para guardar imágenes del sistema y de cada planta para comparar evolución.</span>
      </div>
      ${pending ? `<div class="hist-diary-photo-grid hist-diary-photo-grid--pending">${pending}</div>` : ''}
      <button type="button" class="btn btn-primary" onclick="saveHistoryDiaryEntry()"><i class="ti ti-device-floppy"></i> Guardar entrada de diario</button>
      <div class="hist-diary-feed">${feed}</div>
    </div>`;
}

function renderMeasurementAssistantContextBanner() {
  if (!myGrow) return '';
  const m =
    typeof normalizeHardwareComplements === 'function'
      ? normalizeHardwareComplements(myGrow.hardwareComplements)
      : {};
  const enc =
    typeof effectiveEnclosureType === 'function'
      ? effectiveEnclosureType(myGrow, m)
      : myGrow.placement === 'exterior'
        ? 'outdoor'
        : 'cabinet';
  const encLab =
    enc === 'greenhouse'
      ? 'Espacio amplio / macro-carpa ventilada'
      : enc === 'open_room'
        ? 'Estancia o nave amplia'
        : enc === 'outdoor'
          ? 'Exterior'
          : 'Armario o carpa sellada';
  const chips = [
    m.meterPhEc ? 'pH+EC' : null,
    m.meterWaterTemp ? 'Tª agua' : null,
    m.meterThermoHygro ? 'Tª aire + HR' : null,
    m.meterCo2 ? 'CO₂' : null,
    m.meterPpfd ? 'Lux / PPFD' : null,
    m.greenhouseAerationControl ? 'Extractor / intractor' : null,
    m.greenhouseHumidityControl ? 'HR controlada' : null,
  ].filter(Boolean);
  const chipStr = chips.length ? chips.join(' · ') : 'ninguno marcado';
  const plLabel = myGrow.placement === 'exterior' ? 'Exterior' : 'Interior';
  const learnBanner = typeof getUiExperienceMode === 'function' && getUiExperienceMode() === 'learning';
  const learnPara = learnBanner
    ? `<p class="form-hint monitor-assistant-context__learn">En espacio acotado, <strong>Tª y HR</strong> del aire definen el balance hídrico del follaje (VPD). CO₂ y PAR tienen más sentido cuando ya dominas pH/EC y el volumen alrededor de las plantas está relativamente confinado; el perfil «espacio amplio» no obliga a un invernadero de cristal.</p>`
    : '';
  return `<div class="alert info monitor-assistant-context"><i class="ti ti-adjustments" aria-hidden="true"></i><div><p class="body-prose body-prose--tight"><strong>Emplazamiento:</strong> ${escapeMonitorHtml(plLabel)} · <strong>Perfil:</strong> ${escapeMonitorHtml(encLab)} · <strong>Instrumentación declarada:</strong> ${escapeMonitorHtml(chipStr)}.</p><p class="form-hint">Activa o configura sensores y <strong>opciones del recinto</strong> (extractor, humedad, LED) en <strong>Sistema</strong>. Sin marcar un sensor o variable, aquí no aparece su campo.</p>${learnPara}</div></div>`;
}

function renderMeasurementAssistantFormInnerHtml() {
  if (!myGrow) return '';
  const s = myGrow.strain;
  const daysSince = Math.floor((new Date() - myGrow.startDate) / 86400000);
  const weekNum = Math.max(1, Math.ceil((daysSince + 1) / 7));
  const rdwc = isMonitorRdwc(myGrow);
  const selectedPlant = myGrow.selectedPlant || 1;
  const m =
    typeof normalizeHardwareComplements === 'function'
      ? normalizeHardwareComplements(myGrow.hardwareComplements)
      : {};
  const enc =
    typeof effectiveEnclosureType === 'function'
      ? effectiveEnclosureType(myGrow, m)
      : myGrow.placement === 'exterior'
        ? 'outdoor'
        : 'cabinet';
  const learnM = typeof getUiExperienceMode === 'function' && getUiExperienceMode() === 'learning';
  const microTitle =
    enc === 'outdoor'
      ? 'Microclima (ambiente exterior)'
      : enc === 'greenhouse'
        ? learnM
          ? 'Microclima (espacio amplio / macro-carpa)'
          : 'Microclima (espacio amplio · renovación alta)'
        : learnM
          ? 'Microclima (interior — Tª aire, HR y VPD en copa)'
          : 'Microclima (interior — Tª aire y HR junto al dosel)';

  const phEcHint = m.meterPhEc
    ? ''
    : `<p class="form-hint">En el checklist no marcaste medidor pH/EC; igualmente puedes anotar valores si los obtienes (préstamo u otro medidor).</p>`;
  const waterHint = m.meterWaterTemp
    ? '<span class="form-hint">Raíz / depósito</span>'
    : `<span class="form-hint">Sin sonda de líquido declarada; opcional si mides con otro instrumento.</span>`;

  const thermoFields = m.meterThermoHygro
    ? `<div class="form-group"><label>Temp. aire en copa (°C)</label><input id="mAirTemp" type="number" step="0.1" min="10" max="45" placeholder="24.0"></div>
        <div class="form-group"><label>Humedad relativa (%)</label><input id="mHumidity" type="number" step="1" min="20" max="95" placeholder="55"></div>`
    : `<div class="form-group" style="grid-column:1/-1"><div class="alert warn"><i class="ti ti-info-circle"></i><p>Para registrar <strong>Tª aire</strong> y <strong>HR</strong> aquí, marca el <strong>termohigrómetro</strong> en <strong>Sistema → Configuración manual → Complementos</strong>.</p></div></div>`;

  const co2Block =
    m.meterCo2
      ? `<div class="form-group"><label>CO₂ (ppm)</label><input id="mCO2" type="number" step="10" min="300" max="2000" placeholder="${myGrow.co2 === 'si' ? '1200' : '400'}"><span class="form-hint">${myGrow.co2 === 'si' ? 'Recinto con CO₂ activado: orientativo más alto.' : 'Ambiente sin enriquecimiento: ~400 ppm referencia.'}</span></div>`
      : myGrow.placement === 'exterior'
        ? ''
        : `<div class="form-group" style="grid-column:1/-1"><div class="alert info"><i class="ti ti-molecule"></i><p>CO₂ no aparece porque no marcaste <strong>medidor de CO₂</strong> en Sistema. Actívalo si mides ppm en interior.</p></div></div>`;

  const luxBlock = m.meterPpfd
    ? `<div class="form-group"><label>Lux (opcional)</label><input id="mLux" type="number" step="100" min="0" max="200000" placeholder="35000"></div>`
    : '';

  const ppfdBlock = m.meterPpfd
    ? `<div class="form-group"><label>PPFD medio (µmol/m²/s)</label><input id="mPPFD" type="number" step="10" min="0" max="2500" placeholder="600"><span class="form-hint">Sensor cuántico / PAR</span></div>`
    : `<div class="form-group" style="grid-column:1/-1"><div class="alert info"><i class="ti ti-sun"></i><p>PPFD / lux no se muestran sin <strong>medidor de luz</strong> en Sistema. Las <strong>horas de luz</strong> siguen disponibles (fotoperiodo).</p></div></div>`;

  return `
      ${phEcHint}
      <div class="section-label section-label--block">Solución y volumen</div>
      <div class="grid4">
        <div class="form-group">${rdwc ? `<label>Sitio de la lectura</label><p class="form-static-text">Circuito RDWC (depósito de control / solución común)</p><input type="hidden" id="mPlant" value="0">` : `<label>Planta</label>
          <select id="mPlant">
            ${Array.from({ length: getPlantCount(myGrow) }, (_, i) => `<option value="${i + 1}" ${selectedPlant === i + 1 ? 'selected' : ''}>P${i + 1}</option>`).join('')}
          </select>`}
        </div>
        <div class="form-group"><label>pH</label><input id="mPH" type="number" step="0.1" min="4.5" max="8.5" placeholder="6.0"></div>
        <div class="form-group"><label>EC (mS/cm)</label><input id="mEC" type="number" step="0.01" min="0" max="4" placeholder="1.85"></div>
        <div class="form-group"><label>Volumen (L)</label><input id="mVolume" type="number" step="0.1" min="1" max="2000" placeholder="${myGrow.reservoirL || 60}"></div>
        <div class="form-group"><label>Temp. agua (°C)</label><input id="mWaterTemp" type="number" step="0.1" min="10" max="35" placeholder="19.0">${waterHint}</div>
      </div>

      <div class="section-label section-label--block">${escapeMonitorHtml(microTitle)}</div>
      <div class="grid4">
        ${thermoFields}
        ${co2Block}
        ${luxBlock}
      </div>

      <div class="section-label section-label--block">Luz (horas encendido → DLI; PPFD si tienes sensor)</div>
      <div class="grid4">
        ${ppfdBlock}
        <div class="form-group"><label>Horas luz encendida</label><input id="mLightHours" type="number" step="0.5" min="0" max="24" placeholder="${weekNum <= s.vegW ? '18' : '12'}"><span class="form-hint">Fotoperiodo hoy (útil aunque no midas PAR)</span></div>
      </div>

      <div class="grid2">
        <div class="form-group"><label>Notas</label><input id="mNote" type="text" placeholder="Observaciones del día"></div>
      </div>
      <div id="monitorLiveCorrectionHost" class="monitor-live-correction" hidden aria-live="polite" aria-atomic="true"></div>
      <button type="button" class="btn btn-primary" onclick="addMeasurement()"><i class="ti ti-plus"></i> Guardar medición</button>`;
}

function renderHistorialMeasurementsCardHtml() {
  if (!myGrow) return '';
  return `<div class="card historial-measure-card">
      <div class="card-header"><div class="card-title"><i class="ti ti-report-analytics"></i> Mediciones guardadas</div></div>
      <p class="body-prose body-prose--tight">Lecturas registradas desde <strong>Medir</strong>. La columna <strong>Corrección</strong> recoge el texto orientativo cuando la app detecta desvíos al guardar.</p>
      ${renderHistorialMeasurementsTable()}
    </div>`;
}

function renderHistorialQuickRefCard() {
  return `<div class="card historial-quick-ref">
      <div class="card-header"><div class="card-title"><i class="ti ti-book-2"></i> Referencia rápida</div></div>
      <p class="historial-quick-ref__hint">Consejos, catálogo de cepas y líneas de nutrientes (antes en Inicio).</p>
      <div class="dash-secondary historial-quick-ref__links">
        <button type="button" class="dash-link-btn" onclick="navTo('consejos')"><i class="ti ti-bulb" aria-hidden="true"></i> Consejos de uso</button>
        <button type="button" class="dash-link-btn" onclick="navTo('variedades')"><i class="ti ti-seedling" aria-hidden="true"></i> Variedades</button>
        <button type="button" class="dash-link-btn" onclick="navTo('nutrientes')"><i class="ti ti-flask" aria-hidden="true"></i> Nutrientes</button>
      </div>
    </div>`;
}

function renderHistorial() {
  const host = document.getElementById('historialContent');
  if (!host) return;
  const quickRef = renderHistorialQuickRefCard();
  if (!myGrow) {
    host.innerHTML = `${quickRef}
    <div class="empty-state"><div class="empty-icon"><i class="ti ti-history"></i></div><p>No hay bitácora ni mediciones sin un cultivo activo.</p><button type="button" class="btn btn-primary" onclick="navTo('cultivo')">Configurar en Sistema</button></div>`;
    return;
  }
  const logHtml = (myGrow.log || [])
    .slice(0, 50)
    .map(
      (e) => `<div class="log-entry">
      <div class="log-icon ${e.type}"><i class="ti ti-${e.type === 'ok' ? 'check' : e.type === 'warn' ? 'alert-triangle' : 'info-circle'}"></i></div>
      <div><div class="log-text">${escapeMonitorHtml(e.text)}</div><div class="log-time">${new Date(e.date).toLocaleString('es-ES')}</div></div>
    </div>`,
    )
    .join('');
  const checklistCard = renderHistoryChecklistSection(myGrow);
  const diaryCard = renderHistoryDiarySection(myGrow);
  const measureCard = renderHistorialMeasurementsCardHtml();
  host.innerHTML = `${quickRef}
    ${measureCard}
    <div class="card">
      <div class="card-header"><div class="card-title"><i class="ti ti-list"></i> Bitácora (${myGrow.strain.name})</div></div>
      <p class="body-prose body-prose--tight historial-bitacora-hint">Observaciones manuales y resumen de cada medición guardada.</p>
      <div class="log-add-bar">
        <input id="logInput" class="input-grow" type="text" placeholder="Añadir observación al historial…" autocomplete="off">
        <button class="btn btn-primary btn--compact" onclick="addLog()" type="button">Añadir</button>
      </div>
      <div class="log-list">${logHtml || '<p class="text-muted">Sin entradas.</p>'}</div>
    </div>
    ${checklistCard}
    ${diaryCard}
  `;
  requestAnimationFrame(() => {
    if (typeof initMonitorLiveValidation === 'function') initMonitorLiveValidation();
  });
}

window.toggleHistoryChecklistItem = toggleHistoryChecklistItem;
window.onHistoryDiaryPhotosChange = onHistoryDiaryPhotosChange;
window.removeHistoryDiaryPendingPhoto = removeHistoryDiaryPendingPhoto;
window.saveHistoryDiaryEntry = saveHistoryDiaryEntry;
window.renderHistorial = renderHistorial;
window.renderGrowAlertsCardHtml = renderGrowAlertsCardHtml;
window.onMonitorWorkSystemSelectChange = onMonitorWorkSystemSelectChange;
window.saveMonitorActiveSystemDisplayName = saveMonitorActiveSystemDisplayName;
