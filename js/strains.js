// Strains

function filterStrains(type, el){
  document.querySelectorAll('#strainTabs .tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  renderStrains(type);
}

function renderStrains(filter='all'){
  const list = filter==='all' ? strains : strains.filter(s=>s.type===filter);
  document.getElementById('strainGrid').innerHTML = list.map(s=>`
    <div class="strain-card ${selectedStrain===s.id?'selected':''}" onclick="selectStrain('${s.id}')">
      <div class="strain-check"><i class="ti ti-check"></i></div>
      <span class="strain-type t-${s.type}">${s.typeName}</span>
      <div class="strain-name">${s.name}</div>
      <div class="strain-bank">${s.bank}</div>
      <div class="strain-stats">
        <div class="sstat"><span class="sstat-label">THC</span><span class="sstat-val hi">${s.thc}</span></div>
        <div class="sstat"><span class="sstat-label">Floración</span><span class="sstat-val">${s.flower}</span></div>
        <div class="sstat"><span class="sstat-label">Rendimiento</span><span class="sstat-val">${s.yieldIn} g/m²</span></div>
        <div class="sstat"><span class="sstat-label">Sistema</span><span class="sstat-val sstat-val--sm">${s.system.split('/')[0].trim()}</span></div>
        <div class="sstat"><span class="sstat-label">EC floración</span><span class="sstat-val hi">${s.ecFlower}–${s.ecPeak}</span></div>
      </div>
    </div>
  `).join('');
}

function selectStrain(id){
  selectedStrain = selectedStrain===id ? null : id;
  renderStrains(document.querySelector('#strainTabs .tab.active')?.dataset?.type||'all');
  const s = strains.find(x=>x.id===id);
  const det = document.getElementById('strainDetail');
  if(!selectedStrain||!s){det.innerHTML='';return;}
  det.innerHTML=`
    <div class="card">
      <div class="detail-header">
        <div>
          <span class="strain-type t-${s.type} strain-type--detail">${s.typeName}</span>
          <h2 class="strain-detail-title">${s.name}</h2>
          <p class="strain-detail-meta">${s.bank} · ${s.diff}</p>
        </div>
        <button type="button" class="btn btn-primary" onclick="startGrow('${s.id}')"><i class="ti ti-plant" aria-hidden="true"></i> Iniciar cultivo</button>
      </div>
      <div class="grid2 strain-detail-grid">
        <div>
          <p class="body-prose strain-detail-desc">${s.desc}</p>
          <div class="strain-amb-note"><i class="ti ti-map-pin" aria-hidden="true"></i><span>${s.ambNotes}</span></div>
        </div>
        <div>
          <div class="section-label">Parámetros técnicos</div>
          <div class="param-row"><span class="param-key">EC vegetación</span><span class="param-val green">${s.ecVeg}–${(s.ecVeg+0.4).toFixed(1)} mS/cm</span></div>
          <div class="param-row"><span class="param-key">EC floración</span><span class="param-val green">${s.ecFlower}–${s.ecPeak} mS/cm</span></div>
          <div class="param-row"><span class="param-key">EC pico (semanas 5-7)</span><span class="param-val amber">${s.ecPeak} mS/cm</span></div>
          <div class="param-row"><span class="param-key">pH vegetación</span><span class="param-val blue">${s.ph}</span></div>
          <div class="param-row"><span class="param-key">pH floración</span><span class="param-val blue">${s.phFlower}</span></div>
          <div class="param-row"><span class="param-key">Temp. agua óptima</span><span class="param-val purple">${s.tempWater}–${s.tempWater+2}°C</span></div>
          <div class="param-row"><span class="param-key">Sistema óptimo</span><span class="param-val">${s.system}</span></div>
          <div class="param-row"><span class="param-key">Técnica recomendada</span><span class="param-val">${s.technique}</span></div>
        </div>
      </div>
      <div class="grid2">
        <div>
          <div class="section-label">Nutrición recomendada</div>
          <p class="strain-nutri-line"><strong class="c-green">Vegetación:</strong> ${s.nutriProfile.veg}</p>
          <p class="strain-nutri-line"><strong class="c-purple">Floración:</strong> ${s.nutriProfile.flower}</p>
        </div>
        <div>
          <div class="section-label">Tags</div>
          <div class="pill-tag-row">${s.tags.map(t=>`<span class="strain-tag-pill">${t}</span>`).join('')}</div>
        </div>
      </div>
    </div>
  `;
}
