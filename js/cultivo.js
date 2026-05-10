// Cultivo wizard and active grow

function startGrow(id){
  wizData.strainId = id;
  wizStep = 1;
  navTo('cultivo');
}

function onOnboardingSystemTypeChange() {
  if (!appConfig) appConfig = {};
  snapshotSystemHardwareToAppConfig();
  const sel = document.getElementById('onbSystem');
  if (sel) appConfig.system = sel.value;
  saveAppConfig();
  renderInitialOnboarding();
}

function renderCultivo(){
  if(myGrow){ renderActiveGrow(); return; }
  if(!appConfig?.completed && !isSkipInitialWelcome()){ renderInitialOnboarding(); return; }
  document.getElementById('cultivoContent').innerHTML=`
    <div class="wizard-progress">${[0,1,2,3].map(i=>`<div class="wiz-step ${i<wizStep?'done':i===wizStep?'active':''}"></div>`).join('')}</div>
    <div id="wizBody"></div>
  `;
  renderWizStep();
}

function renderInitialOnboarding() {
  const cfg = appConfig || {};
  const hw = cfg.systemHardware || {};
  const sysActive = cfg.system || 'RDWC';
  const sites = Number.isFinite(hw.sites) ? hw.sites : 4;
  const vps = Number.isFinite(hw.volumePerSiteL) ? hw.volumePerSiteL : 20;
  const vctl = Number.isFinite(hw.controlReservoirL) ? hw.controlReservoirL : 40;
  const stone = hw.airStoneType === 'fine' ? 'fine' : 'standard';
  const lineM = Number.isFinite(hw.airLineLengthM) ? hw.airLineLengthM : 2;
  const solT = Number.isFinite(hw.solutionTempC) ? hw.solutionTempC : '';
  const pipeMat = hw.pipeMaterial || 'pvc';
  const ctlDisabled = sysActive !== 'RDWC';
  const sizingHtml = cfg.systemSizingResult
    ? renderSystemSizingHtml(cfg.systemSizingResult)
    : `<div class="sizing-result"><p class="sizing-disclaimer sizing-disclaimer--flush">Pulsa <strong>Calcular dimensionado</strong> para estimar bomba de aire, recirculación (RDWC) y diámetro de tubería orientativo.</p></div>`;

  const errorBox = cfg.error ? `<div class="alert danger"><i class="ti ti-alert-circle"></i><p>${cfg.error}</p></div>` : '';
  const weatherBox = cfg.climate
    ? `<div class="alert info"><i class="ti ti-cloud"></i><p><strong>Clima detectado:</strong> ${cfg.climate.summary} · ${cfg.climate.temperature}°C · HR ${cfg.climate.humidity}% · Viento ${cfg.climate.wind} km/h · Fuente: ${cfg.climate.source}</p></div>`
    : `<div class="alert info"><i class="ti ti-info-circle"></i><p>Aún sin análisis climático. Pulsa "Analizar clima" tras indicar ubicación.</p></div>`;

  document.getElementById('cultivoContent').innerHTML = `
    <div class="card">
      <div class="card-header"><div class="card-title"><i class="ti ti-rocket"></i>Checklist experto · Primer inicio</div></div>
      <p class="body-prose cultivo-intro"><strong>Hydro Cannabis</strong> centraliza sistema hidropónico, clima, nutrición (según tipo de agua) y monitorización diaria, alineado con buenas prácticas de cultivo en RDWC/DWC.</p>
      <div class="grid3 cultivo-highlights">
        <div class="card-sm"><div class="metric-label">Ventaja</div><p class="body-prose">Checklist guiado de sistema</p></div>
        <div class="card-sm"><div class="metric-label">Ventaja</div><p class="body-prose">Cálculo de mezcla por tipo de agua</p></div>
        <div class="card-sm"><div class="metric-label">Ventaja</div><p class="body-prose">Alertas inteligentes por planta</p></div>
      </div>
      <div class="cultivo-divider">
        <label class="checkbox-label">
          <input type="checkbox" ${isSkipInitialWelcome()?'checked':''} onchange="toggleSkipInitialWelcome(this.checked)">
          <span><strong>Modo desarrollo:</strong> saltar bienvenida y checklist e ir al asistente clásico. El registro del monitor (historial) no incluye este mensaje. Desmarca para recuperar la bienvenida.</span>
        </label>
        <p class="cultivo-dev-hint">Atajo URL: <code>?dev=1</code> o <code>?skipWelcome=1</code></p>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title"><i class="ti ti-list-check"></i>Paso 1–2 · Sistema, ubicación y clima</div></div>
      ${errorBox}
      <div class="grid2">
        <div class="form-group">
          <label>Sistemas disponibles (elige uno o varios)</label>
          <div class="pill-tag-row">
            ${['RDWC','DWC','NFT','FLOAT','AERO'].map(s=>`<label class="nutri-tag tag-level chip-check"><input type="checkbox" value="${s}" ${Array.isArray(cfg.systems)&&cfg.systems.includes(s)?'checked':''} onchange="toggleSystemType('${s}',this.checked)">${s}</label>`).join('')}
          </div>
        </div>
        <div class="form-group">
          <label>Sistema activo inicial</label>
          <select id="onbSystem" onchange="onOnboardingSystemTypeChange()"><option value="RDWC" ${(cfg.system||'RDWC')==='RDWC'?'selected':''}>RDWC</option><option value="DWC" ${cfg.system==='DWC'?'selected':''}>DWC</option><option value="NFT" ${cfg.system==='NFT'?'selected':''}>NFT</option><option value="FLOAT" ${cfg.system==='FLOAT'?'selected':''}>Mesa flotante</option><option value="AERO" ${cfg.system==='AERO'?'selected':''}>Aeroponía</option></select>
        </div>
        <div class="form-group">
          <label>Ubicación (ciudad o zona)</label>
          <input id="onbLocation" type="text" value="${cfg.location||''}" placeholder="Ej: Castelló de la Plana">
        </div>
        <div class="form-group">
          <label>Tipo de instalación</label>
          <select id="onbPlacement"><option value="interior" ${(cfg.placement||'interior')==='interior'?'selected':''}>Interior</option><option value="exterior" ${cfg.placement==='exterior'?'selected':''}>Exterior</option></select>
        </div>
      </div>
      <button type="button" class="btn btn-ghost" onclick="analyzeClimateContext()"><i class="ti ti-cloud-search"></i> Analizar clima (AEMET/Open-Meteo)</button>
      ${weatherBox}
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title"><i class="ti ti-tool"></i>Ingeniería del sistema · datos de montaje</div></div>
      <p class="body-prose mb-text-block">Introduce <strong>volumen por cubo</strong>, <strong>número de sitios</strong> y, en RDWC, el <strong>depósito de control</strong>. La app calcula caudales orientativos de <strong>aire</strong> (regla habitual ~1 L/min por galón US por depósito en DWC) y de <strong>recirculación</strong> en RDWC (varios volúmenes/hora del circuito), además de pistas de tubería y materiales.</p>
      ${(() => {
        const pr = typeof getSystemProfile === 'function' ? getSystemProfile(sysActive) : null;
        if (!pr) return '';
        return `<div class="alert info"><i class="ti ti-bucket"></i><div><strong>${pr.label} — checklist técnico</strong><ul class="legal-list">${pr.checklistNotes.map((h) => `<li>${h}</li>`).join('')}</ul><p class="body-prose">${pr.optimalHint}</p></div></div>`;
      })()}
      <div class="alert warn"><i class="ti ti-alert-triangle"></i><p>Resultados <strong>orientativos</strong>: altura manométrica, codos y pérdidas reales pueden exigir una bomba mayor. Contrasta siempre con la hoja del fabricante.</p></div>
      <div class="grid2">
        <div class="form-group"><label>Número de sitios (cubos / macetas)</label><input id="onbSites" type="number" min="1" max="48" value="${sites}"></div>
        <div class="form-group"><label>Volumen de solución por sitio (L)</label><input id="onbVolumePerSite" type="number" min="5" max="200" step="1" value="${vps}"></div>
        <div class="form-group"><label>Volumen depósito de control (L) — solo RDWC</label><input id="onbControlVol" type="number" min="0" max="2000" step="1" value="${ctlDisabled ? 0 : vctl}" ${ctlDisabled ? 'disabled' : ''}></div>
        <div class="form-group"><label>Tipo de difusor / piedra de aire</label><select id="onbAirStone"><option value="standard" ${stone === 'standard' ? 'selected' : ''}>Estándar / burbuja media</option><option value="fine" ${stone === 'fine' ? 'selected' : ''}>Fina (mejor transferencia de O₂)</option></select></div>
        <div class="form-group"><label>Longitud aprox. manguera de aire (m)</label><input id="onbAirLineM" type="number" min="0" max="30" step="0.5" value="${lineM}"></div>
        <div class="form-group"><label>Temperatura típica del líquido (°C, opcional)</label><input id="onbSolutionTemp" type="number" min="10" max="35" step="0.5" placeholder="p. ej. 20" value="${solT === '' ? '' : solT}"></div>
        <div class="form-group"><label>Material línea de líquido</label><select id="onbPipeMaterial"><option value="pvc" ${pipeMat === 'pvc' ? 'selected' : ''}>PVC presión / rígido</option><option value="pe" ${pipeMat === 'pe' ? 'selected' : ''}>PE / polietileno</option><option value="reinforced" ${pipeMat === 'reinforced' ? 'selected' : ''}>Manguera reforzada</option></select></div>
      </div>
      <div class="btn-row">
        <button type="button" class="btn btn-primary" onclick="runSystemSizingCalculation()"><i class="ti ti-calculator"></i> Calcular dimensionado</button>
      </div>
      <div id="systemSizingMount">${sizingHtml}</div>
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title"><i class="ti ti-seedling"></i>Paso 3 · Variedad, trasplante y nutrición</div></div>
      <div class="grid2">
        <div class="form-group"><label>Variedad</label><select id="onbStrain">${strains.map(s=>`<option value="${s.id}" ${(cfg.strainId||'ww')===s.id?'selected':''}>${s.name}</option>`).join('')}</select></div>
        <div class="form-group"><label>Edad (días)</label><input id="onbAge" type="number" min="0" max="120" value="${Number.isFinite(cfg.ageDays)?cfg.ageDays:0}"></div>
        <div class="form-group"><label>Origen (semilla/esqueje/proveedor)</label><input id="onbOrigin" type="text" value="${cfg.origin||''}" placeholder="Ej: Esqueje propio"></div>
        <div class="form-group"><label>Fecha trasplante al sistema</label><input id="onbTransplantDate" type="date" value="${cfg.transplantDate||new Date().toISOString().split('T')[0]}"></div>
        <div class="form-group"><label>Nutriente principal</label><select id="onbNutri">${nutrients.map(n=>`<option value="${n.rank}" ${(cfg.nutri||1)===n.rank?'selected':''}>${n.rank}. ${n.name}</option>`).join('')}</select></div>
        <div class="form-group"><label>Tipo de agua</label><select id="onbWater"><option value="RO" ${(cfg.water||'RO')==='RO'?'selected':''}>Ósmosis</option><option value="destilada" ${cfg.water==='destilada'?'selected':''}>Destilada</option><option value="red" ${cfg.water==='red'?'selected':''}>Grifo</option></select></div>
      </div>
      <button type="button" class="btn btn-primary" onclick="completeInitialSetup()"><i class="ti ti-check"></i> Finalizar checklist y activar monitorización</button>
    </div>
  `;
}

function toggleSkipInitialWelcome(checked) {
  setSkipInitialWelcome(!!checked);
  renderCultivo();
}

function toggleSystemType(systemName, enabled) {
  if (!appConfig) appConfig = {};
  const list = Array.isArray(appConfig.systems) ? [...appConfig.systems] : [];
  const exists = list.includes(systemName);
  if (enabled && !exists) list.push(systemName);
  if (!enabled && exists) list.splice(list.indexOf(systemName), 1);
  appConfig.systems = list;
  saveAppConfig();
}

async function analyzeClimateContext() {
  if (!appConfig) appConfig = {};
  appConfig.error = '';
  snapshotSystemHardwareToAppConfig();
  appConfig.location = (document.getElementById('onbLocation')?.value || '').trim();
  appConfig.placement = document.getElementById('onbPlacement')?.value || 'interior';
  appConfig.system = document.getElementById('onbSystem')?.value || 'RDWC';
  saveAppConfig();
  if (!appConfig.location) {
    appConfig.error = 'Debes indicar una ubicación para analizar clima.';
    saveAppConfig();
    renderInitialOnboarding();
    return;
  }
  try {
    const geoResp = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(appConfig.location)}&count=1&language=es&format=json`);
    const geoData = await geoResp.json();
    const place = geoData?.results?.[0];
    if (!place) throw new Error('Ubicación no encontrada');
    const lat = place.latitude;
    const lon = place.longitude;
    const wxResp = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`);
    const wxData = await wxResp.json();
    const current = wxData?.current || {};
    appConfig.climate = {
      source: 'Open-Meteo (fallback AEMET)',
      lat,
      lon,
      station: place.name,
      temperature: Number.isFinite(current.temperature_2m) ? current.temperature_2m.toFixed(1) : '—',
      humidity: Number.isFinite(current.relative_humidity_2m) ? current.relative_humidity_2m : '—',
      wind: Number.isFinite(current.wind_speed_10m) ? current.wind_speed_10m.toFixed(1) : '—',
      summary: `Estación cercana: ${place.name}, ${place.country || ''}`,
      weatherCode: current.weather_code,
    };
  } catch (error) {
    appConfig.error = 'No se pudo obtener clima automático. Puedes continuar y configurar interior/exterior manualmente.';
  }
  saveAppConfig();
  renderInitialOnboarding();
}

function completeInitialSetup() {
  if (!appConfig) appConfig = {};
  appConfig.error = '';
  snapshotSystemHardwareToAppConfig();
  appConfig.system = document.getElementById('onbSystem')?.value || 'RDWC';
  appConfig.systemSizingResult = computeHydroSizing(appConfig.systemHardware, appConfig.system);
  appConfig.location = (document.getElementById('onbLocation')?.value || '').trim();
  appConfig.placement = document.getElementById('onbPlacement')?.value || 'interior';
  appConfig.strainId = document.getElementById('onbStrain')?.value || 'ww';
  appConfig.ageDays = parseInt(document.getElementById('onbAge')?.value, 10) || 0;
  appConfig.origin = (document.getElementById('onbOrigin')?.value || '').trim();
  appConfig.transplantDate = document.getElementById('onbTransplantDate')?.value || new Date().toISOString().split('T')[0];
  appConfig.nutri = parseInt(document.getElementById('onbNutri')?.value, 10) || 1;
  appConfig.water = document.getElementById('onbWater')?.value || 'RO';
  if (!Array.isArray(appConfig.systems) || !appConfig.systems.length) appConfig.systems = [appConfig.system];

  if (!appConfig.location) {
    appConfig.error = 'Debes indicar ubicación del sistema.';
    saveAppConfig();
    renderInitialOnboarding();
    return;
  }
  if (!appConfig.origin) {
    appConfig.error = 'Debes indicar el origen del cultivo (semilla/esqueje/proveedor).';
    saveAppConfig();
    renderInitialOnboarding();
    return;
  }
  appConfig.completed = true;
  saveAppConfig();

  const siteCount = Math.min(48, Math.max(1, parseInt(appConfig.systemHardware?.sites, 10) || 2));
  wizData = {
    strainId: appConfig.strainId,
    plants: siteCount,
    system: appConfig.system,
    m2: 1.2,
    light: 'LED',
    technique: 'ScrOG',
    nutri: appConfig.nutri,
    water: appConfig.water,
    ambTemp: 22,
    ambHum: appConfig.placement === 'exterior' ? 60 : 55,
    startDate: appConfig.transplantDate,
    co2: appConfig.placement === 'interior' ? 'si' : 'no',
    ageDays: appConfig.ageDays,
    origin: appConfig.origin,
    location: appConfig.location,
    placement: appConfig.placement,
    climate: appConfig.climate || null,
    systemHardware: { ...appConfig.systemHardware },
    systemSizing: appConfig.systemSizingResult,
  };
  activateGrow();
}

function renderWizStep(){
  const s = strains.find(x=>x.id===wizData.strainId);
  const errorBox = wizData.error ? `<div class="alert danger"><i class="ti ti-alert-circle"></i><p>${wizData.error}</p></div>` : '';
  const bodies = [
    // 0
    `<div class="card cultivo-wizard-start">
      <div class="cultivo-wizard-emoji" aria-hidden="true">🌿</div>
      <div class="cultivo-wizard-title">Configurar nuevo cultivo</div>
      <p class="cultivo-wizard-sub">Sigue el asistente para obtener tu plan completo con parámetros exactos semana a semana.</p>
      <button type="button" class="btn btn-primary" onclick="wizStep=1;renderWizStep()">Comenzar <i class="ti ti-arrow-right"></i></button>
    </div>`,
    // 1 variedad
    `<div class="card">
      <div class="card-header"><div class="card-title"><i class="ti ti-seedling"></i>Paso 1 · Variedad</div></div>
      ${errorBox}
      <div class="grid2">
        <div class="form-group"><label>Variedad</label>
          <select id="wStrain">${strains.map(s=>`<option value="${s.id}" ${wizData.strainId===s.id?'selected':''}>${s.name} (${s.typeName} · ${s.thc} THC)</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>Número de plantas</label>
          <input type="number" id="wPlants" min="1" max="12" value="${wizData.plants||2}">
        </div>
      </div>
      ${s?`<div class="alert info"><i class="ti ti-info-circle"></i><p>Seleccionada: <strong>${s.name}</strong> — EC floración: ${s.ecFlower} mS/cm · pH: ${s.phFlower} · Duración: ${s.vegW+s.flowerW} semanas</p></div>`:''}
      <div class="btn-row">
        <button type="button" class="btn btn-ghost" onclick="wizStep=0;renderWizStep()">Atrás</button>
        <button type="button" class="btn btn-primary" onclick="goStep2()">Siguiente <i class="ti ti-arrow-right"></i></button>
      </div>
    </div>`,
    // 2 sistema
    `<div class="card">
      <div class="card-header"><div class="card-title"><i class="ti ti-settings-2"></i>Paso 2 · Sistema y espacio</div></div>
      ${errorBox}
      <div class="grid2">
        <div class="form-group"><label>Sistema hidropónico</label>
          <select id="wSys"><option value="RDWC" ${wizData.system==='RDWC'?'selected':''}>RDWC (recomendado)</option><option value="DWC" ${wizData.system==='DWC'?'selected':''}>DWC</option><option value="NFT" ${wizData.system==='NFT'?'selected':''}>NFT</option><option value="FLOAT" ${wizData.system==='FLOAT'?'selected':''}>Mesa flotante</option><option value="AERO" ${wizData.system==='AERO'?'selected':''}>Aeroponía</option></select>
        </div>
        <div class="form-group"><label>Metros cuadrados</label>
          <input type="number" id="wM2" min="0.5" max="10" step="0.25" value="${wizData.m2||1.2}">
        </div>
        <div class="form-group"><label>Iluminación</label>
          <select id="wLight"><option value="LED" ${(wizData.light||'LED')==='LED'?'selected':''}>LED Full Spectrum (recomendado)</option><option value="LEC" ${wizData.light==='LEC'?'selected':''}>LEC CMH 315W</option><option value="HPS" ${wizData.light==='HPS'?'selected':''}>HPS 600W</option></select>
        </div>
        <div class="form-group"><label>Técnica de entrenamiento</label>
          <select id="wTech"><option value="ScrOG" ${(wizData.technique||'ScrOG')==='ScrOG'?'selected':''}>ScrOG</option><option value="SOG" ${wizData.technique==='SOG'?'selected':''}>SOG</option><option value="LST" ${wizData.technique==='LST'?'selected':''}>LST + Topping</option><option value="Sin técnica" ${wizData.technique==='Sin técnica'?'selected':''}>Sin técnica</option></select>
        </div>
        <div class="form-group"><label>Nutriente principal</label>
          <select id="wNutri">${nutrients.map(n=>`<option value="${n.rank}" ${wizData.nutri===n.rank?'selected':''}>${n.rank}. ${n.name}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>Tipo de agua</label>
          <select id="wWater"><option value="RO" ${wizData.water==='RO'||!wizData.water?'selected':''}>Ósmosis inversa (recomendado)</option><option value="red" ${wizData.water==='red'?'selected':''}>Agua de red filtrada</option><option value="destilada" ${wizData.water==='destilada'?'selected':''}>Agua destilada</option></select>
        </div>
      </div>
      <div class="btn-row">
        <button type="button" class="btn btn-ghost" onclick="wizData.error='';wizStep=1;renderWizStep()">Atrás</button>
        <button type="button" class="btn btn-primary" onclick="goStep3()">Siguiente <i class="ti ti-arrow-right"></i></button>
      </div>
    </div>`,
    // 3 ambiente
    `<div class="card">
      <div class="card-header"><div class="card-title"><i class="ti ti-temperature"></i>Paso 3 · Parámetros ambientales</div></div>
      ${errorBox}
      <div class="grid2">
        <div class="form-group"><label>Temperatura ambiente habitual</label>
          <input type="number" id="wTemp" min="15" max="35" value="${wizData.ambTemp||22}">
          <span class="form-hint">°C</span>
        </div>
        <div class="form-group"><label>Humedad base del espacio</label>
          <input type="number" id="wHum" min="30" max="80" value="${wizData.ambHum||55}">
          <span class="form-hint">%</span>
        </div>
        <div class="form-group"><label>Fecha inicio germinación</label>
          <input type="date" id="wDate" value="${wizData.startDate||new Date().toISOString().split('T')[0]}">
        </div>
        <div class="form-group"><label>CO₂ adicional</label>
          <select id="wCO2"><option value="no" ${wizData.co2!=='si'?'selected':''}>No (400 ppm ambiente)</option><option value="si" ${wizData.co2==='si'?'selected':''}>Sí (enriquecimiento 1000-1500 ppm)</option></select>
        </div>
      </div>
      <div class="alert warn"><i class="ti ti-map-pin"></i><p>Castelló de la Plana: veranos calurosos (35°C+). Si inicias en primavera, la floración caerá en verano — refrigeración de agua imprescindible. Mejor inicio en agosto para florar en octubre-noviembre.</p></div>
      <div class="btn-row">
        <button type="button" class="btn btn-ghost" onclick="wizData.error='';wizStep=2;renderWizStep()">Atrás</button>
        <button type="button" class="btn btn-primary" onclick="goStep4()">Siguiente <i class="ti ti-arrow-right"></i></button>
      </div>
    </div>`,
    // 4 confirm
    `<div class="card">
      <div class="card-header"><div class="card-title"><i class="ti ti-check"></i>Paso 4 · Confirmar y activar</div></div>
      ${errorBox}
      ${buildConfirmSummary()}
      <div class="btn-row">
        <button type="button" class="btn btn-ghost" onclick="wizData.error='';wizStep=3;renderWizStep()">Atrás</button>
        <button type="button" class="btn btn-primary" onclick="activateGrow()"><i class="ti ti-plant"></i> Activar cultivo</button>
      </div>
    </div>`
  ];
  document.getElementById('wizBody').innerHTML = bodies[wizStep]||bodies[0];
}

function buildConfirmSummary(){
  const s = strains.find(x=>x.id===wizData.strainId);
  const n = nutrients.find(x=>x.rank===wizData.nutri);
  if(!s) return '<div class="alert danger"><i class="ti ti-x"></i><p>Por favor selecciona una variedad primero.</p></div>';
  const watts = Math.round((wizData.m2||1.2)*400);
  const estYield = Math.round((wizData.m2||1.2)*parseInt(s.yieldIn)*0.85);
  const totalW = s.vegW + s.flowerW + 2;
  const startD = new Date(wizData.startDate||new Date());
  const endD = new Date(startD.getTime() + totalW*7*86400000);
  return `
    <div class="confirm-summary-box">
      <div class="grid2 confirm-summary-grid">
        <div>
          <div class="section-label section-label--block">Variedad y sistema</div>
          <div class="param-row"><span class="param-key">Variedad</span><span class="param-val">${s.name}</span></div>
          <div class="param-row"><span class="param-key">Plantas</span><span class="param-val">${wizData.plants||2}</span></div>
          <div class="param-row"><span class="param-key">Sistema</span><span class="param-val">${wizData.system||'RDWC'}</span></div>
          <div class="param-row"><span class="param-key">Técnica</span><span class="param-val">${wizData.technique||'ScrOG'}</span></div>
          <div class="param-row"><span class="param-key">Espacio</span><span class="param-val">${wizData.m2||1.2} m²</span></div>
          <div class="param-row"><span class="param-key">Iluminación</span><span class="param-val">~${watts}W ${wizData.light||'LED'}</span></div>
        </div>
        <div>
          <div class="section-label section-label--block">Parámetros y estimaciones</div>
          <div class="param-row"><span class="param-key">Nutriente elegido</span><span class="param-val">${n?n.name.split(' ')[0]+' '+n.name.split(' ')[1]:'—'}</span></div>
          <div class="param-row"><span class="param-key">Duración total</span><span class="param-val">${totalW} semanas</span></div>
          <div class="param-row"><span class="param-key">Inicio germinación</span><span class="param-val">${startD.toLocaleDateString('es-ES')}</span></div>
          <div class="param-row"><span class="param-key">Cosecha estimada</span><span class="param-val c-amber">${endD.toLocaleDateString('es-ES')}</span></div>
          <div class="param-row"><span class="param-key">Rendimiento est.</span><span class="param-val c-green">${estYield} g</span></div>
          <div class="param-row"><span class="param-key">Temp. ambiente</span><span class="param-val">${wizData.ambTemp||22}°C</span></div>
        </div>
      </div>
    </div>
  `;
}

function activateGrow(){
  const s = strains.find(x=>x.id===wizData.strainId);
  if(!s){wizData.error='Debes seleccionar una variedad válida antes de activar el cultivo.';renderWizStep();return;}
  wizData.error = '';
  const sizing = wizData.systemSizing || null;
  const reservoirFromSizing =
    sizing && Number.isFinite(sizing.totalSolutionL) && sizing.totalSolutionL > 0
      ? Math.round(sizing.totalSolutionL)
      : Math.max(20, (wizData.plants || 2) * 20);
  myGrow = {
    strain: s,
    plants: wizData.plants||2,
    system: wizData.system||'RDWC',
    technique: wizData.technique||'ScrOG',
    m2: wizData.m2||1.2,
    light: wizData.light||'LED',
    nutri: wizData.nutri||1,
    water: wizData.water||'RO',
    ambTemp: wizData.ambTemp||22,
    ambHum: wizData.ambHum||55,
    co2: wizData.co2||'no',
    startDate: new Date(wizData.startDate||new Date()),
    ageDays: wizData.ageDays || 0,
    origin: wizData.origin || 'No especificado',
    transplantDate: wizData.startDate || new Date().toISOString().split('T')[0],
    location: wizData.location || appConfig?.location || '',
    placement: wizData.placement || appConfig?.placement || 'interior',
    climate: wizData.climate || appConfig?.climate || null,
    systemHardware: wizData.systemHardware || null,
    systemSizing: sizing,
    reservoirL: reservoirFromSizing,
    sourceEC: (waterProfiles[wizData.water||'RO']||waterProfiles.RO).baseEC,
    sourcePH: (waterProfiles[wizData.water||'RO']||waterProfiles.RO).basePH,
    selectedPlant: 1,
    measurements: [],
    plantProfiles: {},
    log: [
      {date:new Date().toISOString(),text:'Cultivo activado: '+s.name+' en '+wizData.system,type:'ok'},
      {date:new Date().toISOString(),text:'Germinación iniciada. Solución EC 0.3 mS/cm · pH 5.5',type:'info'}
    ]
  };
  if (sizing && !sizing.nft && Number.isFinite(sizing.airPumpLpmRecommended)) {
    const recirc = sizing.waterPump
      ? ` Recirculación ~${sizing.waterPump.lphTarget} L/h.`
      : '';
    myGrow.log.push({
      date: new Date().toISOString(),
      text: `Dimensionado checklist: bomba de aire ≥ ${sizing.airPumpLpmRecommended} L/min.${recirc}`,
      type: 'info',
    });
  }
  saveGrowState();
  document.getElementById('sideStatus').textContent = s.name + ' · S1';
  renderActiveGrow();
  renderMonitor();
  renderSemanas();
  if (typeof renderInicio === 'function') renderInicio();
}

function renderActiveGrow(){
  ensurePlantProfiles(myGrow);
  const s = myGrow.strain;
  const n = nutrients.find(x=>x.rank===myGrow.nutri)||nutrients[0];
  const daysSince = Math.floor((new Date()-myGrow.startDate)/86400000);
  const weekNum = Math.max(1,Math.ceil((daysSince+1)/7));
  const totalW = s.vegW+s.flowerW+2;
  document.getElementById('sideStatus').textContent = s.name+' · S'+weekNum;

  let phase='Germinación',phClass='ph-germ',currentEC=0.4,currentPH='5.5–5.8',lightSched='18/6',humidity='70–90%',tempRange='22–26°C',co2='400 ppm';
  if(weekNum<=1){phase='Germinación';phClass='ph-germ';currentEC=0.4;currentPH='5.5–5.8';lightSched='18/6';humidity='70–90%';tempRange='22–26°C';}
  else if(weekNum<=s.vegW){phase='Vegetación';phClass='ph-veg';currentEC=s.ecVeg+(weekNum/s.vegW)*0.3;currentPH=s.ph;lightSched='18/6';humidity='55–70%';tempRange='24–28°C';}
  else if(weekNum<=s.vegW+2){phase='Prefloración';phClass='ph-pre';currentEC=(s.ecVeg+s.ecFlower)/2;currentPH='5.8–6.2';lightSched='12/12';humidity='50–60%';tempRange='22–26°C';}
  else if(weekNum<=s.vegW+s.flowerW-2){phase='Floración plena';phClass='ph-flower';currentEC=s.ecFlower;currentPH=s.phFlower;lightSched='12/12';humidity='40–55%';tempRange='20–26°C';}
  else if(weekNum<=s.vegW+s.flowerW){phase='Engorde';phClass='ph-engorde';currentEC=s.ecPeak;currentPH=s.phFlower;lightSched='12/12';humidity='35–50%';tempRange='18–24°C';}
  else{phase='Flush / Cosecha';phClass='ph-flush';currentEC=0.2;currentPH='6.0–6.5';lightSched='12/12';humidity='35–45%';tempRange='18–22°C';}
  currentEC = Math.round(currentEC*10)/10;
  const mixPlan = calculateMixPlan(myGrow, n, phase);
  const systemSvg = renderSystemSvg(myGrow, s, weekNum, phase);
  const selectedPlantInfo = getSelectedPlantInfo(myGrow, s);
  const sz = myGrow.systemSizing;
  const sizingRecall =
    sz && !sz.nft
      ? `<div class="card">
        <div class="card-header"><div class="card-title"><i class="ti ti-tool"></i>Dimensionado del sistema (desde checklist)</div></div>
        <div class="cultivo-sizing-body">
          ${
            Number.isFinite(sz.airPumpLpmRecommended)
              ? `<p><strong>Bomba de aire (referencia):</strong> ≥ ${sz.airPumpLpmRecommended} L/min</p>`
              : ''
          }
          ${
            sz.waterPump
              ? `<p><strong>Recirculación RDWC:</strong> ~${sz.waterPump.lphTarget} L/h (~${sz.waterPump.gphTarget} GPH)</p>`
              : `<p><strong>Recirculación:</strong> no aplica en DWC autónomo por cubos.</p>`
          }
          ${Number.isFinite(sz.totalSolutionL) ? `<p><strong>Volumen útil estimado:</strong> ~${sz.totalSolutionL} L</p>` : ''}
          ${sz.mainPipeHint ? `<p class="cultivo-pipe-hint"><strong>Tubería:</strong> ${sz.mainPipeHint}</p>` : ''}
        </div>
      </div>`
      : '';

  const segs = Array.from({length:totalW},(_,i)=>{
    let cls='tl-veg';
    if(i===0)cls='tl-germ';
    else if(i>=s.vegW&&i<s.vegW+2)cls='tl-pre';
    else if(i>=s.vegW+2&&i<s.vegW+s.flowerW)cls='tl-flower';
    else if(i>=s.vegW+s.flowerW)cls='tl-flush';
    return `<div class="tl-seg ${cls} ${i<weekNum-1?'past':''}" title="S${i+1}: ${i===0?'Germinación':i<s.vegW?'Vegetación':i<s.vegW+2?'Prefloración':i<s.vegW+s.flowerW?'Floración':'Flush'}"></div>`;
  }).join('');

  document.getElementById('cultivoContent').innerHTML=`
    <div class="card">
      <div class="grow-summary">
        <div class="grow-summary-main">
          <span class="strain-type t-${s.type}">${s.typeName}</span>
          <div class="grow-title">${s.name}</div>
          <p class="grow-sub">Inicio: ${myGrow.startDate.toLocaleDateString('es-ES')} · Semana ${weekNum} de ${totalW}</p>
        </div>
        <div class="grow-summary-aside">
          <span class="phase-pill ${phClass}">${phase}</span>
          <div class="grow-nutri-hint">Nutriente: ${n.name.split(' ').slice(0,2).join(' ')}</div>
        </div>
      </div>
      <div class="timeline-bar">${segs}</div>
      <div class="timeline-legend">
        <span>Germ</span><span>Veg (${s.vegW}s)</span><span>Floración (${s.flowerW}s)</span><span>Flush</span>
      </div>
    </div>

    ${sizingRecall}

    <div class="gauge-grid">
      <div class="gauge"><div class="gauge-label">EC solución</div><div class="gauge-value c-green">${currentEC}</div><div class="gauge-range">mS/cm</div><span class="gauge-status status-ok">En rango</span></div>
      <div class="gauge"><div class="gauge-label">pH objetivo</div><div class="gauge-value c-blue">${currentPH.split('–')[0]}</div><div class="gauge-range">${currentPH}</div><span class="gauge-status status-ok">En rango</span></div>
      <div class="gauge"><div class="gauge-label">Fotoperiodo</div><div class="gauge-value gauge-value--compact">${lightSched}</div><div class="gauge-range">h luz/oscuridad</div></div>
      <div class="gauge"><div class="gauge-label">Temp. agua</div><div class="gauge-value c-purple">${s.tempWater}</div><div class="gauge-range">°C objetivo</div><span class="gauge-status ${myGrow.ambTemp>28?'status-warn':'status-ok'}">${myGrow.ambTemp>28?'Vigilar':'OK'}</span></div>
      <div class="gauge"><div class="gauge-label">Humedad (HR)</div><div class="gauge-value gauge-value--compact">${humidity}</div></div>
      <div class="gauge"><div class="gauge-label">Temp. aire día</div><div class="gauge-value gauge-value--compact">${tempRange}</div></div>
      <div class="gauge"><div class="gauge-label">CO₂</div><div class="gauge-value gauge-value--compact">${myGrow.co2==='si'?'1200':'400'}</div><div class="gauge-range">ppm</div></div>
      <div class="gauge"><div class="gauge-label">Rendimiento est.</div><div class="gauge-value c-amber gauge-value--yield">${Math.round(myGrow.m2*parseInt(s.yieldIn)*0.85)}</div><div class="gauge-range">g total</div></div>
    </div>

    <div class="grid2">
      <div class="card">
        <div class="card-header"><div class="card-title"><i class="ti ti-flask"></i>Dosis nutriente hoy</div></div>
        <div class="body-prose">
          ${phase.includes('Germ')?n.phases.germ:phase.includes('Veg')?n.phases.veg:phase.includes('Flush')?n.phases.flush:n.phases.flower}
        </div>
        <p class="text-muted cultivo-card-foot">Fuente: ${n.name}</p>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title"><i class="ti ti-bulb"></i>Acción recomendada</div></div>
        <div class="body-prose">
          ${phase.includes('Germ')?'Mantener humedad >70%. Temperatura cúpula 24°C. Luz tenue 18/6.':
            phase.includes('Veg')?s.phaseDesc?s.nutriProfile.veg:'Aplicar técnica '+myGrow.technique+'. Revisar EC y pH cada 48h.':
            phase.includes('Pre')?'Cambiar a 12/12. Subir EC gradualmente. Stretch esperado: 50-100% de altura.':
            phase.includes('Flush')?'Solo agua RO, EC 0.1–0.3. Tricomas: iniciar con lupa 60x.':
            'Floración plena. '+s.nutriProfile.flower}
        </div>
      </div>
    </div>

    <div class="grid2">
      <div class="card">
        <div class="card-header"><div class="card-title"><i class="ti ti-adjustments"></i>Configuración manual del sistema</div></div>
        <div class="grid2">
          <div class="form-group">
            <label>Tipo de agua</label>
            <select id="cfgWater" onchange="updateMixConfig()">
              <option value="RO" ${myGrow.water==='RO'?'selected':''}>Ósmosis</option>
              <option value="destilada" ${myGrow.water==='destilada'?'selected':''}>Destilada</option>
              <option value="red" ${myGrow.water==='red'?'selected':''}>Grifo</option>
            </select>
          </div>
          <div class="form-group">
            <label>Volumen depósito (L)</label>
            <input id="cfgReservoir" type="number" min="5" max="1000" step="1" value="${myGrow.reservoirL||60}" onchange="updateMixConfig()">
          </div>
          <div class="form-group">
            <label>EC agua base (mS/cm)</label>
            <input id="cfgSourceEC" type="number" min="0" max="2.5" step="0.01" value="${myGrow.sourceEC||0.1}" onchange="updateMixConfig()">
          </div>
          <div class="form-group">
            <label>pH agua base</label>
            <input id="cfgSourcePH" type="number" min="4.5" max="9" step="0.1" value="${myGrow.sourcePH||6.1}" onchange="updateMixConfig()">
          </div>
        </div>
        <div class="alert info"><i class="ti ti-database"></i><p>Estos valores se guardan en memoria local para tus próximos cálculos.</p></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title"><i class="ti ti-calculator"></i>Cálculo automático de mezcla</div></div>
        <div class="param-row"><span class="param-key">Fase</span><span class="param-val">${phase}</span></div>
        <div class="param-row"><span class="param-key">Agua</span><span class="param-val">${mixPlan.waterLabel}</span></div>
        <div class="param-row"><span class="param-key">Nutriente base</span><span class="param-val green">${mixPlan.baseMl} mL</span></div>
        <div class="param-row"><span class="param-key">CalMag recomendado</span><span class="param-val amber">${mixPlan.calmagMl} mL</span></div>
        <div class="param-row"><span class="param-key">Aditivos</span><span class="param-val">${mixPlan.additivesMl} mL</span></div>
        <div class="param-row"><span class="param-key">EC estimada final</span><span class="param-val blue">${mixPlan.estimatedEC} mS/cm</span></div>
        <div class="param-row"><span class="param-key">pH objetivo sugerido</span><span class="param-val purple">${mixPlan.targetPH}</span></div>
      </div>
    </div>

    <div class="card">
      <div class="card-header card-header--split">
        <div class="card-title"><i class="ti ti-vector"></i>Esquema cenital del sistema (${myGrow.system})</div>
        <button type="button" class="btn btn-ghost btn--compact" onclick="exportSystemSvg()"><i class="ti ti-download"></i> Exportar SVG</button>
      </div>
      <div class="system-svg-wrap">${systemSvg}</div>
      <div class="grid2 svg-panel-grid">
        <div class="card-sm">
          <div class="section-label">Planta seleccionada</div>
          <div class="param-row"><span class="param-key">ID planta</span><span class="param-val">${selectedPlantInfo.plantLabel}</span></div>
          <div class="param-row"><span class="param-key">Cultivar</span><span class="param-val">${selectedPlantInfo.cultivar}</span></div>
          <div class="param-row"><span class="param-key">Estado semanal</span><span class="param-val">${phase}</span></div>
          <div class="param-row"><span class="param-key">Rendimiento estimado/planta</span><span class="param-val c-amber">${selectedPlantInfo.estimatedPlantYield} g</span></div>
        </div>
        <div class="card-sm">
          <div class="section-label">Última medición ${myGrow.system === 'RDWC' ? '(circuito)' : 'asociada'}</div>
          <div class="param-row"><span class="param-key">pH</span><span class="param-val blue">${selectedPlantInfo.latestPH}</span></div>
          <div class="param-row"><span class="param-key">EC</span><span class="param-val green">${selectedPlantInfo.latestEC}</span></div>
          <div class="param-row"><span class="param-key">Temp. agua</span><span class="param-val purple">${selectedPlantInfo.latestWaterTemp}</span></div>
          <div class="param-row"><span class="param-key">Fecha medición</span><span class="param-val">${selectedPlantInfo.latestDate}</span></div>
        </div>
      </div>
      <div class="alert info"><i class="ti ti-info-circle"></i><p>Vista cenital: cada sitio lleva un <strong>icono de planta</strong> (plántula si germinación o &lt;18 días; hoja tipo cannabis si planta establecida o esqueje de proveedor). Toca el <strong>cubo o cesta</strong> para seleccionar P1…Pn; toca el <strong>icono</strong> para la ficha (variedad, edad, procedencia). ${myGrow.system === 'RDWC' ? 'En RDWC, pH/EC son de la solución común (depósito de control).' : ''}</p></div>
    </div>

    <button type="button" class="btn btn-ghost reset-grow-btn" onclick="resetGrow()">
      <i class="ti ti-trash"></i> Reiniciar cultivo
    </button>
  `;
}

function resetGrow() {
  clearGrowState();
  wizStep = 0;
  wizData = { error: '' };
  document.getElementById('sideStatus').textContent = 'Sin cultivo activo';
  renderCultivo();
  renderMonitor();
  renderSemanas();
}

function goStep2() {
  const strainId = document.getElementById('wStrain')?.value;
  const plants = parseInt(document.getElementById('wPlants')?.value, 10);
  if (!strainId) {
    wizData.error = 'Selecciona una variedad para continuar.';
    renderWizStep();
    return;
  }
  if (Number.isNaN(plants) || plants < 1 || plants > 12) {
    wizData.error = 'El número de plantas debe estar entre 1 y 12.';
    renderWizStep();
    return;
  }
  wizData.error = '';
  wizData.strainId = strainId;
  wizData.plants = plants;
  wizStep = 2;
  renderWizStep();
}

function goStep3() {
  const m2 = parseFloat(document.getElementById('wM2')?.value);
  const nutrientRank = parseInt(document.getElementById('wNutri')?.value, 10);
  if (Number.isNaN(m2) || m2 < 0.5 || m2 > 10) {
    wizData.error = 'Los metros cuadrados deben estar entre 0.5 y 10.';
    renderWizStep();
    return;
  }
  if (!nutrients.find((item) => item.rank === nutrientRank)) {
    wizData.error = 'Selecciona un nutriente principal válido.';
    renderWizStep();
    return;
  }
  wizData.error = '';
  wizData.system = document.getElementById('wSys')?.value || 'RDWC';
  wizData.m2 = m2;
  wizData.light = document.getElementById('wLight')?.value || 'LED';
  wizData.technique = document.getElementById('wTech')?.value || 'ScrOG';
  wizData.nutri = nutrientRank;
  wizData.water = document.getElementById('wWater')?.value || 'RO';
  wizStep = 3;
  renderWizStep();
}

function goStep4() {
  const ambTemp = parseInt(document.getElementById('wTemp')?.value, 10);
  const ambHum = parseInt(document.getElementById('wHum')?.value, 10);
  const startDate = document.getElementById('wDate')?.value;
  if (Number.isNaN(ambTemp) || ambTemp < 15 || ambTemp > 35) {
    wizData.error = 'La temperatura ambiente debe estar entre 15 y 35°C.';
    renderWizStep();
    return;
  }
  if (Number.isNaN(ambHum) || ambHum < 30 || ambHum > 80) {
    wizData.error = 'La humedad base debe estar entre 30% y 80%.';
    renderWizStep();
    return;
  }
  if (!startDate) {
    wizData.error = 'Debes indicar una fecha de inicio de germinación.';
    renderWizStep();
    return;
  }
  wizData.error = '';
  wizData.ambTemp = ambTemp;
  wizData.ambHum = ambHum;
  wizData.startDate = startDate;
  wizData.co2 = document.getElementById('wCO2')?.value || 'no';
  wizStep = 4;
  renderWizStep();
}

function updateMixConfig() {
  if (!myGrow) return;
  const water = document.getElementById('cfgWater')?.value || 'RO';
  const profile = waterProfiles[water] || waterProfiles.RO;
  const reservoirL = parseFloat(document.getElementById('cfgReservoir')?.value);
  const sourceEC = parseFloat(document.getElementById('cfgSourceEC')?.value);
  const sourcePH = parseFloat(document.getElementById('cfgSourcePH')?.value);
  myGrow.water = water;
  myGrow.reservoirL = Number.isFinite(reservoirL) ? Math.max(5, reservoirL) : 60;
  myGrow.sourceEC = Number.isFinite(sourceEC) ? Math.max(0, sourceEC) : profile.baseEC;
  myGrow.sourcePH = Number.isFinite(sourcePH) ? sourcePH : profile.basePH;
  saveGrowState();
  renderActiveGrow();
}

function calculateMixPlan(grow, nutrient, phaseName) {
  const water = waterProfiles[grow.water] || waterProfiles.RO;
  const dose = doseByNutrientRank[nutrient.rank] || { baseMlL: 3, supplementsMlL: 0.5 };
  const sysMod = typeof getSystemProfile === 'function' ? getSystemProfile(grow.system).nutrientModifier : 1;
  const phaseMultiplier =
    (phaseName.includes('Germ') ? 0.35 : phaseName.includes('Veg') ? 0.85 : phaseName.includes('Flush') ? 0.1 : 1) * sysMod;
  const reservoirL = Number.isFinite(grow.reservoirL) ? grow.reservoirL : 60;
  const sourceEC = Number.isFinite(grow.sourceEC) ? grow.sourceEC : water.baseEC;
  const baseMl = (dose.baseMlL * phaseMultiplier * reservoirL).toFixed(1);
  const calmagMl = (water.calmagMlL * reservoirL * (phaseName.includes('Flush') ? 0 : 1)).toFixed(1);
  const additivesMl = (dose.supplementsMlL * phaseMultiplier * reservoirL).toFixed(1);
  const estimatedEC = (sourceEC + (dose.baseMlL * phaseMultiplier * 0.35) + (water.calmagMlL * 0.2)).toFixed(2);
  const targetPH = phaseName.includes('Veg') ? '5.7–6.0' : phaseName.includes('Flush') ? '6.0–6.2' : '5.8–6.2';
  return {
    waterLabel: water.label,
    baseMl,
    calmagMl,
    additivesMl,
    estimatedEC,
    targetPH,
  };
}

function renderSystemSvg(grow, strain, weekNum, phaseName) {
  const plantCount = Math.max(1, Math.min(8, parseInt(grow.plants, 10) || 1));
  if (grow.system === 'RDWC') return renderRdwcSvg(grow, strain, plantCount, weekNum, phaseName);
  if (grow.system === 'FLOAT') return renderFloatSvg(grow, strain, plantCount, weekNum, phaseName);
  if (grow.system === 'NFT') return renderNftSvg(grow, strain, plantCount, weekNum, phaseName);
  if (grow.system === 'AERO') return renderAeroSvg(grow, strain, plantCount, weekNum, phaseName);
  return renderDwcSvg(grow, strain, plantCount, weekNum, phaseName);
}

function renderRdwcSvg(grow, strain, plantCount, weekNum, phaseName) {
  const perRow = Math.ceil(plantCount / 2);
  const nodeSpacing = 85;
  const startX = 80;
  const topY = 95;
  const bottomY = 235;
  const nodes = [];
  for (let i = 0; i < plantCount; i++) {
    const row = i < perRow ? 0 : 1;
    const col = row === 0 ? i : i - perRow;
    const x = startX + col * nodeSpacing;
    const y = row === 0 ? topY : bottomY;
    nodes.push({ x, y, label: `P${i + 1}`, index: i + 1 });
  }

  const pipes = [];
  for (let i = 0; i < perRow - 1; i++) {
    const x1 = startX + i * nodeSpacing + 24;
    const x2 = startX + (i + 1) * nodeSpacing - 24;
    pipes.push(`<line x1="${x1}" y1="${topY}" x2="${x2}" y2="${topY}" class="pipe" />`);
  }
  const bottomCount = plantCount - perRow;
  for (let i = 0; i < Math.max(0, bottomCount - 1); i++) {
    const x1 = startX + i * nodeSpacing + 24;
    const x2 = startX + (i + 1) * nodeSpacing - 24;
    pipes.push(`<line x1="${x1}" y1="${bottomY}" x2="${x2}" y2="${bottomY}" class="pipe" />`);
  }
  if (bottomCount > 0) {
    pipes.push(`<line x1="${startX + 8}" y1="${topY + 24}" x2="${startX + 8}" y2="${bottomY - 24}" class="pipe" />`);
    const rightX = startX + (Math.max(perRow, bottomCount) - 1) * nodeSpacing + 8;
    pipes.push(`<line x1="${rightX}" y1="${topY + 24}" x2="${rightX}" y2="${bottomY - 24}" class="pipe" />`);
  }

  const reservoirX = startX + Math.max(perRow, bottomCount, 1) * nodeSpacing + 30;
  const cultivar = strain.name.split(' ').slice(0, 2).join(' ');
  return `
    <svg viewBox="0 0 860 360" class="system-svg" role="img" aria-label="Diagrama cenital RDWC">
      <defs>
        <marker id="arrowBlue" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#3490dc"></path>
        </marker>
      </defs>
      <rect x="12" y="12" width="836" height="336" rx="14" class="svg-bg"></rect>
      <text x="28" y="38" class="svg-title">RDWC · Circuito recirculante cenital</text>
      <text x="28" y="58" class="svg-sub">Semana ${weekNum} · ${phaseName} · Cultivar ${cultivar}</text>

      ${pipes.join('')}
      <line x1="${reservoirX - 15}" y1="${topY}" x2="${reservoirX - 15}" y2="${bottomY}" class="pipe flow" marker-end="url(#arrowBlue)" />

      ${nodes.map(node=>{
        const slotLabel = getCultivarShortLabelForSlot(grow, node.index);
        return `
        <g class="plant-node" data-plant="${node.index}">
          <g class="plant-node-hit" onclick="selectPlantInDiagram(${node.index})">
            <rect x="${node.x-24}" y="${node.y-24}" width="48" height="48" rx="8" class="bucket ${grow.selectedPlant===node.index?'bucket-selected':''}"></rect>
            <circle cx="${node.x}" cy="${node.y}" r="11" class="netpot"></circle>
            <text x="${node.x}" y="${node.y+4}" class="bucket-label">${node.label}</text>
            <text x="${node.x}" y="${node.y+35}" class="cultivar-label">${slotLabel}</text>
          </g>
          ${renderPlantSiteMarker(node, grow, weekNum, -38)}
        </g>`;
      }).join('')}

      <g>
        <rect x="${reservoirX}" y="140" width="90" height="110" rx="10" class="reservoir"></rect>
        <text x="${reservoirX+45}" y="192" class="reservoir-label">DEPÓSITO</text>
        <text x="${reservoirX+45}" y="210" class="reservoir-sub">${grow.reservoirL || 60} L</text>
        <text x="${reservoirX+45}" y="232" class="reservoir-sample-hint">pH / EC · muestreo</text>
        <text x="${reservoirX+45}" y="246" class="reservoir-sample-note">Solución común del circuito</text>
      </g>

      <g>
        <rect x="${reservoirX+112}" y="182" width="48" height="28" rx="6" class="pump"></rect>
        <text x="${reservoirX+136}" y="200" class="pump-label">BOMBA</text>
      </g>
    </svg>
  `;
}

function renderDwcSvg(grow, strain, plantCount, weekNum, phaseName) {
  const cultivar = strain.name.split(' ').slice(0, 2).join(' ');
  const maxVisible = Math.min(plantCount, 5);
  const spacing = 130;
  const startX = 150;
  const y = 120;
  const waterY = 178;
  return `
    <svg viewBox="0 0 860 360" class="system-svg" role="img" aria-label="Diagrama cenital DWC">
      <rect x="12" y="12" width="836" height="336" rx="14" class="svg-bg"></rect>
      <text x="28" y="38" class="svg-title">DWC · Depósito único cenital</text>
      <text x="28" y="58" class="svg-sub">Semana ${weekNum} · ${phaseName} · Cultivar ${cultivar}</text>

      <rect x="70" y="85" width="600" height="190" rx="24" class="reservoir"></rect>
      <rect x="90" y="${waterY}" width="560" height="80" rx="12" class="water"></rect>
      <text x="370" y="305" class="reservoir-sub">Depósito ${grow.reservoirL || 60} L · Agua ${waterProfiles[grow.water]?.label || 'Ósmosis'} · pH/EC por depósito</text>

      ${Array.from({length:maxVisible}, (_,i)=>{
        const x = startX + i * spacing;
        const idx = i + 1;
        const node = { x, y, index: idx };
        const slotLabel = getCultivarShortLabelForSlot(grow, idx);
        return `
          <g class="plant-node" data-plant="${idx}">
            <g class="plant-node-hit" onclick="selectPlantInDiagram(${idx})">
              <circle cx="${x}" cy="${y}" r="22" class="netpot ${grow.selectedPlant===idx?'bucket-selected':''}"></circle>
              <text x="${x}" y="${y+5}" class="bucket-label">P${i+1}</text>
              <text x="${x}" y="${y+42}" class="cultivar-label">${slotLabel}</text>
              <line x1="${x}" y1="${y+24}" x2="${x}" y2="${waterY+18}" class="root-line"></line>
            </g>
            ${renderPlantSiteMarker(node, grow, weekNum, -40)}
          </g>
        `;
      }).join('')}

      <g>
        <rect x="700" y="170" width="66" height="44" rx="8" class="pump"></rect>
        <line x1="700" y1="192" x2="650" y2="192" class="pipe flow"></line>
        <text x="733" y="197" class="pump-label">AIRE</text>
      </g>
    </svg>
  `;
}

function renderFloatSvg(grow, strain, plantCount, weekNum, phaseName) {
  const cultivar = strain.name.split(' ').slice(0, 2).join(' ');
  const maxVisible = Math.min(plantCount, 5);
  const spacing = 130;
  const startX = 150;
  const y = 120;
  const waterY = 178;
  return `
    <svg viewBox="0 0 860 360" class="system-svg" role="img" aria-label="Diagrama mesa flotante">
      <rect x="12" y="12" width="836" height="336" rx="14" class="svg-bg"></rect>
      <text x="28" y="38" class="svg-title">Mesa flotante · DWC en balsa</text>
      <text x="28" y="58" class="svg-sub">Semana ${weekNum} · ${phaseName} · ${cultivar} · Solución común, macetas flotando</text>

      <rect x="70" y="85" width="600" height="190" rx="24" class="reservoir"></rect>
      <rect x="90" y="${waterY}" width="560" height="80" rx="12" class="water"></rect>
      <text x="370" y="305" class="reservoir-sub">Balsa ~${grow.reservoirL || 60} L · pH/EC en el volumen común · válido para cannabis con buena luz y oxigenación</text>

      ${Array.from({ length: maxVisible }, (_, i) => {
        const x = startX + i * spacing;
        const idx = i + 1;
        const node = { x, y, index: idx };
        const slotLabel = getCultivarShortLabelForSlot(grow, idx);
        return `
          <g class="plant-node" data-plant="${idx}">
            <g class="plant-node-hit" onclick="selectPlantInDiagram(${idx})">
              <rect x="${x - 20}" y="${y - 18}" width="40" height="28" rx="6" class="netpot ${grow.selectedPlant === idx ? 'bucket-selected' : ''}"></rect>
              <text x="${x}" y="${y + 2}" class="bucket-label">P${i + 1}</text>
              <text x="${x}" y="${y + 42}" class="cultivar-label">${slotLabel}</text>
              <line x1="${x}" y1="${y + 14}" x2="${x}" y2="${waterY + 18}" class="root-line"></line>
            </g>
            ${renderPlantSiteMarker(node, grow, weekNum, -36)}
          </g>`;
      }).join('')}

      <g>
        <rect x="700" y="170" width="66" height="44" rx="8" class="pump"></rect>
        <line x1="700" y1="192" x2="650" y2="192" class="pipe flow"></line>
        <text x="733" y="197" class="pump-label">AIRE</text>
      </g>
    </svg>
  `;
}

function renderNftSvg(grow, strain, plantCount, weekNum, phaseName) {
  const cultivar = strain.name.split(' ').slice(0, 2).join(' ');
  const maxV = Math.max(1, Math.min(8, plantCount));
  const canalY = 158;
  const basketY = 128;
  const span = 560;
  const startXN = 120;
  const gap = maxV <= 1 ? 0 : span / (maxV - 1);
  const sites = [];
  for (let i = 0; i < maxV; i++) {
    const x = maxV === 1 ? 400 : startXN + i * gap;
    sites.push({ x, y: basketY, index: i + 1 });
  }
  return `
    <svg viewBox="0 0 860 360" class="system-svg" role="img" aria-label="Diagrama NFT">
      <rect x="12" y="12" width="836" height="336" rx="14" class="svg-bg"></rect>
      <text x="28" y="38" class="svg-title">NFT · Película de nutriente</text>
      <text x="28" y="58" class="svg-sub">Semana ${weekNum} · ${phaseName} · ${cultivar}</text>
      <rect x="80" y="140" width="620" height="36" rx="8" class="water"></rect>
      <line x1="100" y1="${canalY}" x2="760" y2="${canalY}" class="pipe flow"></line>
      <rect x="720" y="120" width="100" height="70" rx="10" class="reservoir"></rect>
      <text x="770" y="162" class="reservoir-label" text-anchor="middle">DEPÓSITO</text>
      ${sites
        .map((node) => {
          const slotLabel = getCultivarShortLabelForSlot(grow, node.index);
          return `
        <g class="plant-node" data-plant="${node.index}">
          <g class="plant-node-hit" onclick="selectPlantInDiagram(${node.index})">
            <rect x="${node.x - 18}" y="${node.y - 8}" width="36" height="24" rx="6" class="netpot ${grow.selectedPlant === node.index ? 'bucket-selected' : ''}"></rect>
            <text x="${node.x}" y="${node.y + 36}" class="bucket-label">P${node.index}</text>
            <text x="${node.x}" y="${node.y + 52}" class="cultivar-label">${slotLabel}</text>
            <line x1="${node.x}" y1="${node.y + 18}" x2="${node.x}" y2="168" class="root-line"></line>
          </g>
          ${renderPlantSiteMarker(node, grow, weekNum, -34)}
        </g>`;
        })
        .join('')}
      <text x="400" y="220" class="reservoir-sub">Canal inclinado · cestas / cubos en cada sitio · pH/EC en depósito</text>
      <text x="400" y="255" class="cultivar-label">Icono: germinado o material de proveedor — pulsa la planta para la ficha del sitio.</text>
    </svg>
  `;
}

function renderAeroSvg(grow, strain, plantCount, weekNum, phaseName) {
  const cultivar = strain.name.split(' ').slice(0, 2).join(' ');
  const maxV = Math.max(1, Math.min(6, plantCount));
  const lidY = 102;
  const chamberX = 200;
  const chamberW = 420;
  const sites = [];
  for (let i = 0; i < maxV; i++) {
    const x = chamberX + ((i + 1) / (maxV + 1)) * chamberW;
    sites.push({ x, y: lidY, index: i + 1 });
  }
  return `
    <svg viewBox="0 0 860 360" class="system-svg" role="img" aria-label="Diagrama aeroponía">
      <rect x="12" y="12" width="836" height="336" rx="14" class="svg-bg"></rect>
      <text x="28" y="38" class="svg-title">Aeroponía · Raíces en cámara</text>
      <text x="28" y="58" class="svg-sub">Semana ${weekNum} · ${phaseName} · ${cultivar}</text>
      <rect x="200" y="110" width="420" height="160" rx="16" class="reservoir"></rect>
      <rect x="200" y="102" width="420" height="14" rx="4" class="aero-lid"></rect>
      <text x="410" y="200" class="reservoir-label">CÁMARA OSCURA</text>
      ${sites
        .map((node) => {
          const slotLabel = getCultivarShortLabelForSlot(grow, node.index);
          return `
        <g class="plant-node" data-plant="${node.index}">
          <g class="plant-node-hit" onclick="selectPlantInDiagram(${node.index})">
            <circle cx="${node.x}" cy="${node.y + 8}" r="16" class="netpot ${grow.selectedPlant === node.index ? 'bucket-selected' : ''}"></circle>
            <text x="${node.x}" y="${node.y + 52}" class="bucket-label">P${node.index}</text>
            <text x="${node.x}" y="${node.y + 68}" class="cultivar-label">${slotLabel}</text>
          </g>
          ${renderPlantSiteMarker({ x: node.x, y: node.y + 2 }, grow, weekNum, -36)}
        </g>`;
        })
        .join('')}
      <text x="410" y="300" class="reservoir-sub">Nebulización fina · tapa con portanet / cestas · icono en cada sitio</text>
    </svg>
  `;
}

function selectPlantInDiagram(index) {
  if (!myGrow) return;
  const maxPlants = Math.max(1, Math.min(8, parseInt(myGrow.plants, 10) || 1));
  myGrow.selectedPlant = Math.max(1, Math.min(maxPlants, index));
  saveGrowState();
  renderActiveGrow();
}

function getSelectedPlantInfo(grow, strain) {
  const selected = grow.selectedPlant || 1;
  const totalPlants = Math.max(1, parseInt(grow.plants, 10) || 1);
  const totalYield = Math.round(grow.m2 * parseInt(strain.yieldIn) * 0.85);
  const perPlant = Math.round(totalYield / totalPlants);
  const slotStrain = getStrainForPlantSlot(grow, selected);
  const latest = getLatestMeasurementForPlant(grow, selected);
  return {
    plantLabel: `P${selected} / ${totalPlants}`,
    cultivar: slotStrain.name,
    estimatedPlantYield: perPlant,
    latestPH: latest && Number.isFinite(latest.ph) ? latest.ph.toFixed(1) : '—',
    latestEC: latest && Number.isFinite(latest.ec) ? `${latest.ec.toFixed(2)} mS/cm` : '—',
    latestWaterTemp: latest && Number.isFinite(latest.waterTemp) ? `${latest.waterTemp.toFixed(1)}°C` : '—',
    latestDate: latest ? `${new Date(latest.date).toLocaleDateString('es-ES')} ${new Date(latest.date).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}` : 'Sin registros',
  };
}

function getPlantCount(grow) {
  return Math.max(1, Math.min(8, parseInt(grow?.plants, 10) || 1));
}

function isRdwcSharedSolution(grow) {
  return grow && grow.system === 'RDWC';
}

function measurementSiteLabel(grow, m) {
  if (isRdwcSharedSolution(grow)) return 'Circuito';
  const pid = Number.isFinite(m.plantId) ? m.plantId : 1;
  return `P${pid}`;
}

function getMeasurementsByPlant(grow, plantId) {
  const list = Array.isArray(grow?.measurements) ? grow.measurements : [];
  if (isRdwcSharedSolution(grow)) {
    return [...list].sort((a, b) => new Date(b.date) - new Date(a.date));
  }
  return list.filter((m) => (m.plantId ?? 1) === plantId);
}

function getLatestMeasurementForPlant(grow, plantId) {
  const list = getMeasurementsByPlant(grow, plantId);
  return list.length ? list[0] : null;
}

function ensurePlantProfiles(grow) {
  if (!grow) return;
  if (!grow.plantProfiles || typeof grow.plantProfiles !== 'object') grow.plantProfiles = {};
  const n = getPlantCount(grow);
  for (let i = 1; i <= n; i++) {
    const k = String(i);
    if (!grow.plantProfiles[k]) grow.plantProfiles[k] = {};
  }
}

function getPlantSlotProfile(grow, index) {
  ensurePlantProfiles(grow);
  return grow.plantProfiles[String(index)] || {};
}

function plantSlotHasCustomCrop(grow, index) {
  const p = getPlantSlotProfile(grow, index);
  if (!p || typeof p !== 'object') return false;
  if (p.strainId && p.strainId !== grow.strain?.id) return true;
  if ((p.nickname || '').trim()) return true;
  if ((p.origin || '').trim()) return true;
  if (Number.isFinite(p.ageDays) && p.ageDays !== (grow.ageDays ?? 0)) return true;
  return false;
}

function getStrainForPlantSlot(grow, index) {
  const p = getPlantSlotProfile(grow, index);
  if (p.strainId) {
    const found = strains.find((s) => s.id === p.strainId);
    if (found) return found;
  }
  return grow.strain;
}

function getCultivarShortLabelForSlot(grow, index) {
  const s = getStrainForPlantSlot(grow, index);
  return s.name.split(' ').slice(0, 2).join(' ');
}

function getEffectivePlantAgeDays(grow, index) {
  const p = getPlantSlotProfile(grow, index);
  if (Number.isFinite(p.ageDays)) return p.ageDays;
  const daysSince = Math.floor((new Date() - grow.startDate) / 86400000);
  return Number.isFinite(grow.ageDays) ? grow.ageDays : daysSince;
}

/** Icono SVG nativo (plántula recién germinada / esqueje o planta establecida). */
function renderPlantSiteMarkerSvgInner(isYoung) {
  if (isYoung) {
    return `
      <line x1="0" y1="10" x2="0" y2="22" class="plant-marker-stem"/>
      <ellipse cx="-7" cy="6" rx="5" ry="8" transform="rotate(-25 -7 6)" class="plant-marker-cotyl plant-marker-cotyl--l"/>
      <ellipse cx="7" cy="6" rx="5" ry="8" transform="rotate(25 7 6)" class="plant-marker-cotyl plant-marker-cotyl--r"/>
      <circle cx="0" cy="-2" r="3" class="plant-marker-meristem"/>`;
  }
  return `
    <path class="plant-marker-cannabis" d="M0,-22 C-16,-10 -14,8 -2,14 C-6,6 -8,-4 -2,-12 C-4,-2 -2,4 0,14 C2,4 4,-2 2,-12 C8,-4 6,6 2,14 C14,8 16,-10 0,-22 Z"/>
    <path class="plant-marker-cannabis-accent" d="M0,-18 Q6,-8 4,6 Q0,-2 0,12 Q-4,-2 -4,6 Q-6,-8 0,-18" fill="none"/>
    <line x1="0" y1="12" x2="0" y2="22" class="plant-marker-stem"/>`;
}

/**
 * Marcador gráfico en cada cubo / cesta / sitio (germinado, esqueje de proveedor, etc.).
 * Clic abre la ficha del sitio; no interferir con la selección del cubo (plant-node-hit).
 */
function renderPlantSiteMarker(node, grow, weekNum, yOffset = -40) {
  const custom = plantSlotHasCustomCrop(grow, node.index);
  const age = getEffectivePlantAgeDays(grow, node.index);
  const isYoung = weekNum <= 1 || age < 18;
  const cls = `plant-site-marker${custom ? ' plant-site-marker--custom' : ''}${isYoung ? ' plant-site-marker--young' : ''}`;
  const labelHint = isYoung ? 'Plántula / recién en sistema' : 'Planta en sitio';
  const inner = renderPlantSiteMarkerSvgInner(isYoung);
  return `
    <g transform="translate(${node.x},${node.y + yOffset})">
      <g class="${cls}" role="button" focusable="true" tabindex="0"
        aria-label="Ficha cultivo P${node.index} · ${labelHint}"
        onclick="event.stopPropagation();openPlantSiteModal(${node.index})">
        <title>Sitio P${node.index} · ${labelHint} · pulsa para editar cultivo, edad, procedencia</title>
        <circle cx="0" cy="0" r="24" class="plant-site-marker__halo"/>
        <g transform="translate(0,2)">${inner}</g>
      </g>
    </g>`;
}

let plantSiteModalIndex = null;

function openPlantSiteModal(index) {
  if (!myGrow) return;
  plantSiteModalIndex = Math.max(1, parseInt(index, 10) || 1);
  ensurePlantProfiles(myGrow);
  const p = getPlantSlotProfile(myGrow, plantSiteModalIndex);
  const host = document.getElementById('plantSiteModal');
  if (!host) return;
  const strainSel = host.querySelector('#psmStrain');
  const ageInp = host.querySelector('#psmAge');
  const originInp = host.querySelector('#psmOrigin');
  const nickInp = host.querySelector('#psmNickname');
  const titleEl = host.querySelector('#psmTitle');
  if (strainSel) {
    strainSel.innerHTML = strains.map((st) => `<option value="${st.id}" ${(p.strainId || myGrow.strain.id) === st.id ? 'selected' : ''}>${st.name}</option>`).join('');
  }
  if (ageInp) ageInp.value = Number.isFinite(p.ageDays) ? p.ageDays : myGrow.ageDays ?? 0;
  if (originInp) originInp.value = p.origin != null && p.origin !== '' ? p.origin : myGrow.origin || '';
  if (nickInp) nickInp.value = p.nickname || '';
  if (titleEl) titleEl.textContent = `Sitio P${plantSiteModalIndex}`;
  host.classList.add('plant-site-modal--open');
  host.setAttribute('aria-hidden', 'false');
}

function closePlantSiteModal() {
  const host = document.getElementById('plantSiteModal');
  if (host) {
    host.classList.remove('plant-site-modal--open');
    host.setAttribute('aria-hidden', 'true');
  }
  plantSiteModalIndex = null;
}

function savePlantSiteModal() {
  if (!myGrow || plantSiteModalIndex == null) return;
  ensurePlantProfiles(myGrow);
  const strainId = document.getElementById('psmStrain')?.value || myGrow.strain.id;
  const ageDays = parseInt(document.getElementById('psmAge')?.value, 10);
  const origin = (document.getElementById('psmOrigin')?.value || '').trim();
  const nickname = (document.getElementById('psmNickname')?.value || '').trim();
  myGrow.plantProfiles[String(plantSiteModalIndex)] = {
    strainId,
    ageDays: Number.isFinite(ageDays) ? ageDays : myGrow.ageDays ?? 0,
    origin,
    nickname,
  };
  saveGrowState();
  closePlantSiteModal();
  renderActiveGrow();
  if (typeof renderMonitor === 'function') renderMonitor();
}

function exportSystemSvg() {
  const svgNode = document.querySelector('.system-svg-wrap .system-svg');
  if (!svgNode) return;
  const serializer = new XMLSerializer();
  const svgMarkup = serializer.serializeToString(svgNode);
  const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hydro-cannabis-${(myGrow?.system||'sistema').toLowerCase()}-${new Date().toISOString().slice(0,10)}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
