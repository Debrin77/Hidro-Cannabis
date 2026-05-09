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
  document.getElementById('cultivoContent').innerHTML=`
    <div class="wizard-progress">${[0,1,2,3].map(i=>`<div class="wiz-step ${i<wizStep?'done':i===wizStep?'active':''}"></div>`).join('')}</div>
    <div id="wizBody"></div>
  `;
  renderWizStep();
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
