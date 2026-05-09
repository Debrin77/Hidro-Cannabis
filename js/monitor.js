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

  mc.innerHTML=`
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
