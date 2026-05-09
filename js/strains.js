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
        <div class="sstat"><span class="sstat-label">Sistema</span><span class="sstat-val" style="font-size:10px">${s.system.split('/')[0].trim()}</span></div>
        <div class="sstat"><span class="sstat-label">EC floración</span><span class="sstat-val hi">${s.ecFlower} mS/cm</span></div>
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
          <span class="strain-type t-${s.type}" style="margin-bottom:8px;display:inline-block">${s.typeName}</span>
          <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:700;color:var(--text);margin-bottom:4px">${s.name}</div>
          <div style="font-size:13px;color:var(--text3)">${s.bank} · ${s.diff}</div>
        </div>
        <button class="btn btn-primary" onclick="startGrow('${s.id}')"><i class="ti ti-plant"></i> Iniciar cultivo</button>
      </div>
      <div class="grid2" style="margin-bottom:1.25rem">
        <div>
          <div style="font-size:12px;color:var(--text3);margin-bottom:10px;line-height:1.7">${s.desc}</div>
          <div style="font-size:11px;color:var(--a200);background:rgba(245,184,0,0.08);border:1px solid rgba(245,184,0,0.2);border-radius:8px;padding:8px 10px;line-height:1.6"><i class="ti ti-map-pin" style="font-size:12px"></i> ${s.ambNotes}</div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;font-family:'DM Mono',monospace;margin-bottom:8px">Parámetros técnicos</div>
          <div class="param-row"><span class="param-key">EC vegetación</span><span class="param-val green">${s.ecVeg}–${(s.ecVeg+0.4).toFixed(1)} mS/cm</span></div>
          <div class="param-row"><span class="param-key">EC floración</span><span class="param-val green">${s.ecFlower} mS/cm</span></div>
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
          <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;font-family:'DM Mono',monospace;margin-bottom:8px">Nutrición recomendada</div>
          <div style="font-size:12px;color:var(--text2);line-height:1.7"><strong style="color:var(--g400)">Vegetación:</strong> ${s.nutriProfile.veg}</div>
          <div style="font-size:12px;color:var(--text2);line-height:1.7;margin-top:6px"><strong style="color:var(--p400)">Floración:</strong> ${s.nutriProfile.flower}</div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;font-family:'DM Mono',monospace;margin-bottom:8px">Tags</div>
          <div style="display:flex;flex-wrap:wrap;gap:5px">${s.tags.map(t=>`<span style="font-size:10px;background:rgba(76,175,48,0.12);color:var(--g300);padding:3px 10px;border-radius:20px;border:1px solid rgba(76,175,48,0.25);font-family:'DM Mono',monospace">${t}</span>`).join('')}</div>
        </div>
      </div>
    </div>
  `;
}
