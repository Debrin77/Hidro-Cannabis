// Cultivo wizard and active grow

function startGrow(id){
  wizData.strainId = id;
  wizStep = 1;
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.querySelectorAll('.nav-item')[2].classList.add('active');
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-cultivo').classList.add('active');
  renderCultivo();
}

function renderCultivo(){
  if(myGrow){ renderActiveGrow(); return; }
  if(!appConfig?.completed){ renderInitialOnboarding(); return; }
  document.getElementById('cultivoContent').innerHTML=`
    <div class="wizard-progress">${[0,1,2,3].map(i=>`<div class="wiz-step ${i<wizStep?'done':i===wizStep?'active':''}"></div>`).join('')}</div>
    <div id="wizBody"></div>
  `;
  renderWizStep();
}

function renderInitialOnboarding() {
  const cfg = appConfig || {};
  const errorBox = cfg.error ? `<div class="alert danger"><i class="ti ti-alert-circle"></i><p>${cfg.error}</p></div>` : '';
  const weatherBox = cfg.climate
    ? `<div class="alert info"><i class="ti ti-cloud"></i><p><strong>Clima detectado:</strong> ${cfg.climate.summary} · ${cfg.climate.temperature}°C · HR ${cfg.climate.humidity}% · Viento ${cfg.climate.wind} km/h · Fuente: ${cfg.climate.source}</p></div>`
    : `<div class="alert info"><i class="ti ti-info-circle"></i><p>Aún sin análisis climático. Pulsa "Analizar clima" tras indicar ubicación.</p></div>`;

  document.getElementById('cultivoContent').innerHTML = `
    <div class="card">
      <div class="card-header"><div class="card-title"><i class="ti ti-rocket"></i>Bienvenida Pro · Primer inicio</div></div>
      <p style="font-size:13px;color:var(--text2);line-height:1.7;margin-bottom:0.8rem">HydroGrow Pro centraliza configuración, clima, nutrición y monitorización para minimizar errores y mejorar consistencia del cultivo.</p>
      <div class="grid3">
        <div class="card-sm"><div class="metric-label">Ventaja</div><div style="font-size:12px;color:var(--text2)">Checklist guiado de sistema</div></div>
        <div class="card-sm"><div class="metric-label">Ventaja</div><div style="font-size:12px;color:var(--text2)">Cálculo de mezcla por tipo de agua</div></div>
        <div class="card-sm"><div class="metric-label">Ventaja</div><div style="font-size:12px;color:var(--text2)">Alertas inteligentes por planta</div></div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title"><i class="ti ti-list-check"></i>Checklist de configuración inicial</div></div>
      ${errorBox}
      <div class="grid2">
        <div class="form-group">
          <label>Sistemas disponibles (elige uno o varios)</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${['RDWC','DWC','NFT'].map(s=>`<label class="nutri-tag tag-level" style="cursor:pointer"><input type="checkbox" value="${s}" ${Array.isArray(cfg.systems)&&cfg.systems.includes(s)?'checked':''} onchange="toggleSystemType('${s}',this.checked)" style="margin-right:6px">${s}</label>`).join('')}
          </div>
        </div>
        <div class="form-group">
          <label>Sistema activo inicial</label>
          <select id="onbSystem"><option value="RDWC" ${(cfg.system||'RDWC')==='RDWC'?'selected':''}>RDWC</option><option value="DWC" ${cfg.system==='DWC'?'selected':''}>DWC</option><option value="NFT" ${cfg.system==='NFT'?'selected':''}>NFT</option></select>
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
      <button class="btn btn-ghost" onclick="analyzeClimateContext()"><i class="ti ti-cloud-search"></i> Analizar clima (AEMET/Open-Meteo)</button>
      ${weatherBox}
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title"><i class="ti ti-seedling"></i>Cultivo y nutrición inicial</div></div>
      <div class="grid2">
        <div class="form-group"><label>Variedad</label><select id="onbStrain">${strains.map(s=>`<option value="${s.id}" ${(cfg.strainId||'ww')===s.id?'selected':''}>${s.name}</option>`).join('')}</select></div>
        <div class="form-group"><label>Edad (días)</label><input id="onbAge" type="number" min="0" max="120" value="${Number.isFinite(cfg.ageDays)?cfg.ageDays:0}"></div>
        <div class="form-group"><label>Origen (semilla/esqueje/proveedor)</label><input id="onbOrigin" type="text" value="${cfg.origin||''}" placeholder="Ej: Esqueje propio"></div>
        <div class="form-group"><label>Fecha trasplante al sistema</label><input id="onbTransplantDate" type="date" value="${cfg.transplantDate||new Date().toISOString().split('T')[0]}"></div>
        <div class="form-group"><label>Nutriente principal</label><select id="onbNutri">${nutrients.map(n=>`<option value="${n.rank}" ${(cfg.nutri||1)===n.rank?'selected':''}>${n.rank}. ${n.name}</option>`).join('')}</select></div>
        <div class="form-group"><label>Tipo de agua</label><select id="onbWater"><option value="RO" ${(cfg.water||'RO')==='RO'?'selected':''}>Ósmosis</option><option value="destilada" ${cfg.water==='destilada'?'selected':''}>Destilada</option><option value="red" ${cfg.water==='red'?'selected':''}>Grifo</option></select></div>
      </div>
      <button class="btn btn-primary" onclick="completeInitialSetup()"><i class="ti ti-check"></i> Finalizar checklist y activar monitorización</button>
    </div>
  `;
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
  appConfig.system = document.getElementById('onbSystem')?.value || 'RDWC';
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

  wizData = {
    strainId: appConfig.strainId,
    plants: 2,
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
  };
  activateGrow();
}

function renderWizStep(){
  const s = strains.find(x=>x.id===wizData.strainId);
  const errorBox = wizData.error ? `<div class="alert danger"><i class="ti ti-alert-circle"></i><p>${wizData.error}</p></div>` : '';
  const bodies = [
    // 0
    `<div class="card" style="text-align:center;padding:3rem 2rem">
      <div style="font-size:48px;margin-bottom:1rem">🌿</div>
      <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:700;margin-bottom:8px">Configurar nuevo cultivo</div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:2rem;max-width:360px;margin-left:auto;margin-right:auto">Sigue el asistente para obtener tu plan completo con parámetros exactos semana a semana.</div>
      <button class="btn btn-primary" onclick="wizStep=1;renderWizStep()">Comenzar <i class="ti ti-arrow-right"></i></button>
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
        <button class="btn btn-ghost" onclick="wizStep=0;renderWizStep()">Atrás</button>
        <button class="btn btn-primary" onclick="goStep2()">Siguiente <i class="ti ti-arrow-right"></i></button>
      </div>
    </div>`,
    // 2 sistema
    `<div class="card">
      <div class="card-header"><div class="card-title"><i class="ti ti-settings-2"></i>Paso 2 · Sistema y espacio</div></div>
      ${errorBox}
      <div class="grid2">
        <div class="form-group"><label>Sistema hidropónico</label>
          <select id="wSys"><option value="RDWC" ${wizData.system==='RDWC'?'sel':''}>RDWC (recomendado)</option><option value="DWC" ${wizData.system==='DWC'?'sel':''}>DWC</option><option value="NFT">NFT</option></select>
        </div>
        <div class="form-group"><label>Metros cuadrados</label>
          <input type="number" id="wM2" min="0.5" max="10" step="0.25" value="${wizData.m2||1.2}">
        </div>
        <div class="form-group"><label>Iluminación</label>
          <select id="wLight"><option value="LED">LED Full Spectrum (recomendado)</option><option value="LEC">LEC CMH 315W</option><option value="HPS">HPS 600W</option></select>
        </div>
        <div class="form-group"><label>Técnica de entrenamiento</label>
          <select id="wTech"><option value="ScrOG">ScrOG</option><option value="SOG">SOG</option><option value="LST">LST + Topping</option><option value="Sin técnica">Sin técnica</option></select>
        </div>
        <div class="form-group"><label>Nutriente principal</label>
          <select id="wNutri">${nutrients.map(n=>`<option value="${n.rank}">${n.rank}. ${n.name}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>Tipo de agua</label>
          <select id="wWater"><option value="RO">Ósmosis inversa (recomendado)</option><option value="red">Agua de red filtrada</option><option value="destilada">Agua destilada</option></select>
        </div>
      </div>
      <div class="btn-row">
        <button class="btn btn-ghost" onclick="wizData.error='';wizStep=1;renderWizStep()">Atrás</button>
        <button class="btn btn-primary" onclick="goStep3()">Siguiente <i class="ti ti-arrow-right"></i></button>
      </div>
    </div>`,
    // 3 ambiente
    `<div class="card">
      <div class="card-header"><div class="card-title"><i class="ti ti-temperature"></i>Paso 3 · Parámetros ambientales</div></div>
      ${errorBox}
      <div class="grid2">
        <div class="form-group"><label>Temperatura ambiente habitual</label>
          <input type="number" id="wTemp" min="15" max="35" value="${wizData.ambTemp||22}"> <span style="font-size:11px;color:var(--text3);margin-top:3px;display:block">°C</span>
        </div>
        <div class="form-group"><label>Humedad base del espacio</label>
          <input type="number" id="wHum" min="30" max="80" value="${wizData.ambHum||55}"> <span style="font-size:11px;color:var(--text3);margin-top:3px;display:block">%</span>
        </div>
        <div class="form-group"><label>Fecha inicio germinación</label>
          <input type="date" id="wDate" value="${wizData.startDate||new Date().toISOString().split('T')[0]}">
        </div>
        <div class="form-group"><label>CO₂ adicional</label>
          <select id="wCO2"><option value="no">No (400 ppm ambiente)</option><option value="si">Sí (enriquecimiento 1000-1500 ppm)</option></select>
        </div>
      </div>
      <div class="alert warn"><i class="ti ti-map-pin"></i><p>Castelló de la Plana: veranos calurosos (35°C+). Si inicias en primavera, la floración caerá en verano — refrigeración de agua imprescindible. Mejor inicio en agosto para florar en octubre-noviembre.</p></div>
      <div class="btn-row">
        <button class="btn btn-ghost" onclick="wizData.error='';wizStep=2;renderWizStep()">Atrás</button>
        <button class="btn btn-primary" onclick="goStep4()">Siguiente <i class="ti ti-arrow-right"></i></button>
      </div>
    </div>`,
    // 4 confirm
    `<div class="card">
      <div class="card-header"><div class="card-title"><i class="ti ti-check"></i>Paso 4 · Confirmar y activar</div></div>
      ${errorBox}
      ${buildConfirmSummary()}
      <div class="btn-row">
        <button class="btn btn-ghost" onclick="wizData.error='';wizStep=3;renderWizStep()">Atrás</button>
        <button class="btn btn-primary" onclick="activateGrow()"><i class="ti ti-plant"></i> Activar cultivo</button>
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
    <div style="background:var(--surface2);border:1px solid var(--border2);border-radius:var(--radius2);padding:1.5rem;margin-bottom:1rem">
      <div class="grid2" style="gap:1.5rem">
        <div>
          <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;font-family:'DM Mono';margin-bottom:10px">Variedad y sistema</div>
          <div class="param-row"><span class="param-key">Variedad</span><span class="param-val">${s.name}</span></div>
          <div class="param-row"><span class="param-key">Plantas</span><span class="param-val">${wizData.plants||2}</span></div>
          <div class="param-row"><span class="param-key">Sistema</span><span class="param-val">${wizData.system||'RDWC'}</span></div>
          <div class="param-row"><span class="param-key">Técnica</span><span class="param-val">${wizData.technique||'ScrOG'}</span></div>
          <div class="param-row"><span class="param-key">Espacio</span><span class="param-val">${wizData.m2||1.2} m²</span></div>
          <div class="param-row"><span class="param-key">Iluminación</span><span class="param-val">~${watts}W ${wizData.light||'LED'}</span></div>
        </div>
        <div>
          <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;font-family:'DM Mono';margin-bottom:10px">Parámetros y estimaciones</div>
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
    reservoirL: 60,
    sourceEC: (waterProfiles[wizData.water||'RO']||waterProfiles.RO).baseEC,
    sourcePH: (waterProfiles[wizData.water||'RO']||waterProfiles.RO).basePH,
    selectedPlant: 1,
    measurements: [],
    log: [
      {date:new Date().toISOString(),text:'Cultivo activado: '+s.name+' en '+wizData.system,type:'ok'},
      {date:new Date().toISOString(),text:'Germinación iniciada. Solución EC 0.3 mS/cm · pH 5.5',type:'info'}
    ]
  };
  saveGrowState();
  document.getElementById('sideStatus').textContent = s.name + ' · S1';
  renderActiveGrow();
  renderMonitor();
  renderSemanas();
}

function renderActiveGrow(){
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
  const selectedPlantInfo = getSelectedPlantInfo(myGrow, s, weekNum, phase);

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
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1rem">
        <div>
          <span class="strain-type t-${s.type}">${s.typeName}</span>
          <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:700;margin:4px 0">${s.name}</div>
          <div style="font-size:12px;color:var(--text3)">Inicio: ${myGrow.startDate.toLocaleDateString('es-ES')} · Semana ${weekNum} de ${totalW}</div>
        </div>
        <div style="text-align:right">
          <span class="phase-pill ${phClass}">${phase}</span>
          <div style="font-size:11px;color:var(--text3);margin-top:6px">Nutriente: ${n.name.split(' ').slice(0,2).join(' ')}</div>
        </div>
      </div>
      <div class="timeline-bar">${segs}</div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text3);font-family:'DM Mono'">
        <span>Germ</span><span>Veg (${s.vegW}s)</span><span>Floración (${s.flowerW}s)</span><span>Flush</span>
      </div>
    </div>

    <div class="gauge-grid">
      <div class="gauge"><div class="gauge-label">EC solución</div><div class="gauge-value c-green">${currentEC}</div><div class="gauge-range">mS/cm</div><span class="gauge-status status-ok">En rango</span></div>
      <div class="gauge"><div class="gauge-label">pH objetivo</div><div class="gauge-value c-blue">${currentPH.split('–')[0]}</div><div class="gauge-range">${currentPH}</div><span class="gauge-status status-ok">En rango</span></div>
      <div class="gauge"><div class="gauge-label">Fotoperiodo</div><div class="gauge-value" style="font-size:18px">${lightSched}</div><div class="gauge-range">h luz/oscuridad</div></div>
      <div class="gauge"><div class="gauge-label">Temp. agua</div><div class="gauge-value c-purple">${s.tempWater}</div><div class="gauge-range">°C objetivo</div><span class="gauge-status ${myGrow.ambTemp>28?'status-warn':'status-ok'}">${myGrow.ambTemp>28?'Vigilar':'OK'}</span></div>
      <div class="gauge"><div class="gauge-label">Humedad (HR)</div><div class="gauge-value" style="font-size:18px">${humidity}</div></div>
      <div class="gauge"><div class="gauge-label">Temp. aire día</div><div class="gauge-value" style="font-size:18px">${tempRange}</div></div>
      <div class="gauge"><div class="gauge-label">CO₂</div><div class="gauge-value" style="font-size:18px">${myGrow.co2==='si'?'1200':'400'}</div><div class="gauge-range">ppm</div></div>
      <div class="gauge"><div class="gauge-label">Rendimiento est.</div><div class="gauge-value c-amber" style="font-size:20px">${Math.round(myGrow.m2*parseInt(s.yieldIn)*0.85)}</div><div class="gauge-range">g total</div></div>
    </div>

    <div class="grid2">
      <div class="card">
        <div class="card-header"><div class="card-title"><i class="ti ti-flask"></i>Dosis nutriente hoy</div></div>
        <div style="font-size:13px;color:var(--text2);line-height:1.7">
          ${phase.includes('Germ')?n.phases.germ:phase.includes('Veg')?n.phases.veg:phase.includes('Flush')?n.phases.flush:n.phases.flower}
        </div>
        <div style="margin-top:10px;font-size:12px;color:var(--text3)">Fuente: ${n.name}</div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title"><i class="ti ti-bulb"></i>Acción recomendada</div></div>
        <div style="font-size:13px;color:var(--text2);line-height:1.7">
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
      <div class="card-header">
        <div class="card-title"><i class="ti ti-vector"></i>Esquema cenital del sistema (${myGrow.system})</div>
        <button class="btn btn-ghost" onclick="exportSystemSvg()" style="padding:7px 12px;font-size:11px"><i class="ti ti-download"></i> Exportar SVG</button>
      </div>
      <div class="system-svg-wrap">${systemSvg}</div>
      <div class="grid2" style="margin-top:0.75rem">
        <div class="card-sm">
          <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;font-family:'DM Mono';margin-bottom:8px">Planta seleccionada</div>
          <div class="param-row"><span class="param-key">ID planta</span><span class="param-val">${selectedPlantInfo.plantLabel}</span></div>
          <div class="param-row"><span class="param-key">Cultivar</span><span class="param-val">${selectedPlantInfo.cultivar}</span></div>
          <div class="param-row"><span class="param-key">Estado semanal</span><span class="param-val">${phase}</span></div>
          <div class="param-row"><span class="param-key">Rendimiento estimado/planta</span><span class="param-val c-amber">${selectedPlantInfo.estimatedPlantYield} g</span></div>
        </div>
        <div class="card-sm">
          <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;font-family:'DM Mono';margin-bottom:8px">Última medición asociada</div>
          <div class="param-row"><span class="param-key">pH</span><span class="param-val blue">${selectedPlantInfo.latestPH}</span></div>
          <div class="param-row"><span class="param-key">EC</span><span class="param-val green">${selectedPlantInfo.latestEC}</span></div>
          <div class="param-row"><span class="param-key">Temp. agua</span><span class="param-val purple">${selectedPlantInfo.latestWaterTemp}</span></div>
          <div class="param-row"><span class="param-key">Fecha medición</span><span class="param-val">${selectedPlantInfo.latestDate}</span></div>
        </div>
      </div>
      <div class="alert info"><i class="ti ti-info-circle"></i><p>Vista prototipo cenital. Se adapta al sistema elegido y al número de plantas configurado.</p></div>
    </div>

    <button class="btn btn-ghost" style="margin-top:0.5rem" onclick="resetGrow()">
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
  const phaseMultiplier = phaseName.includes('Germ') ? 0.35 : phaseName.includes('Veg') ? 0.85 : phaseName.includes('Flush') ? 0.1 : 1;
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
  return grow.system === 'RDWC'
    ? renderRdwcSvg(grow, strain, plantCount, weekNum, phaseName)
    : renderDwcSvg(grow, strain, plantCount, weekNum, phaseName);
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

      ${nodes.map(node=>`
        <g class="plant-node" onclick="selectPlantInDiagram(${node.index})">
          <rect x="${node.x-24}" y="${node.y-24}" width="48" height="48" rx="8" class="bucket ${grow.selectedPlant===node.index?'bucket-selected':''}"></rect>
          <circle cx="${node.x}" cy="${node.y}" r="11" class="netpot"></circle>
          <text x="${node.x}" y="${node.y+4}" class="bucket-label">${node.label}</text>
          <text x="${node.x}" y="${node.y+35}" class="cultivar-label">${cultivar}</text>
        </g>
      `).join('')}

      <g>
        <rect x="${reservoirX}" y="140" width="90" height="110" rx="10" class="reservoir"></rect>
        <text x="${reservoirX+45}" y="198" class="reservoir-label">DEPÓSITO</text>
        <text x="${reservoirX+45}" y="216" class="reservoir-sub">${grow.reservoirL || 60} L</text>
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
      <text x="370" y="305" class="reservoir-sub">Depósito ${grow.reservoirL || 60} L · Agua ${waterProfiles[grow.water]?.label || 'Ósmosis'}</text>

      ${Array.from({length:maxVisible}, (_,i)=>{
        const x = startX + i * spacing;
        const idx = i + 1;
        return `
          <g class="plant-node" onclick="selectPlantInDiagram(${idx})">
            <circle cx="${x}" cy="${y}" r="22" class="netpot ${grow.selectedPlant===idx?'bucket-selected':''}"></circle>
            <text x="${x}" y="${y+5}" class="bucket-label">P${i+1}</text>
            <text x="${x}" y="${y+42}" class="cultivar-label">${cultivar}</text>
            <line x1="${x}" y1="${y+24}" x2="${x}" y2="${waterY+18}" class="root-line"></line>
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
  const latest = getLatestMeasurementForPlant(grow, selected);
  return {
    plantLabel: `P${selected} / ${totalPlants}`,
    cultivar: strain.name,
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

function getMeasurementsByPlant(grow, plantId) {
  const list = Array.isArray(grow?.measurements) ? grow.measurements : [];
  return list.filter((m) => (m.plantId || 1) === plantId);
}

function getLatestMeasurementForPlant(grow, plantId) {
  const list = getMeasurementsByPlant(grow, plantId);
  return list.length ? list[0] : null;
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
  a.download = `hydrogrow-${(myGrow?.system||'sistema').toLowerCase()}-${new Date().toISOString().slice(0,10)}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
