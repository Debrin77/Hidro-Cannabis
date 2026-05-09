// Nutrients

function renderNutrientes(){
  document.getElementById('nutriList').innerHTML = nutrients.map(n=>`
    <div class="nutri-item" onclick="toggleNutri(this)">
      <div class="nutri-rank-num">${n.rank}</div>
      <div class="nutri-body">
        <div class="nutri-name">${n.name}</div>
        <div class="nutri-brand">${n.brand}</div>
        <div class="nutri-tags">
          <span class="nutri-tag tag-system"><i class="ti ti-droplet" style="font-size:9px"></i> ${n.system.split('/')[0].trim()}</span>
          <span class="nutri-tag tag-level">${n.level}</span>
          ${n.organic?'<span class="nutri-tag tag-organic">100% Orgánico</span>':''}
          <span class="nutri-tag" style="background:rgba(255,255,255,0.05);color:var(--text3);border:1px solid var(--border2)">${n.price}</span>
        </div>
        <div class="nutri-score">${Array.from({length:5},(_,i)=>`<div class="score-dot ${i<n.score?'on':'off'}"></div>`).join('')}</div>
        <div class="nutri-desc">
          <div style="font-size:12px;color:var(--text2);line-height:1.7;margin-bottom:10px">${n.desc}</div>
          <div class="grid2" style="margin-bottom:10px;font-size:12px">
            <div><div style="color:var(--text3);font-size:10px;text-transform:uppercase;letter-spacing:0.08em;font-family:'DM Mono';margin-bottom:6px">Dosis por fase</div>
              <div style="color:var(--text2);line-height:1.8"><span style="color:var(--g400)">Germ:</span> ${n.phases.germ}<br><span style="color:var(--g400)">Veg:</span> ${n.phases.veg}<br><span style="color:var(--p400)">Flor:</span> ${n.phases.flower}<br><span style="color:var(--b400)">Flush:</span> ${n.phases.flush}</div>
            </div>
            <div><div style="color:var(--text3);font-size:10px;text-transform:uppercase;letter-spacing:0.08em;font-family:'DM Mono';margin-bottom:6px">Parámetros</div>
              <div style="line-height:1.8;color:var(--text2)">pH: <span style="color:var(--b400);font-family:'DM Mono'">${n.pHrange}</span><br>EC: <span style="color:var(--g400);font-family:'DM Mono'">${n.ECrange}</span></div>
              <div style="margin-top:8px;color:var(--text3);font-size:10px;text-transform:uppercase;letter-spacing:0.08em;font-family:'DM Mono';margin-bottom:4px">Aditivos complementarios</div>
              <div style="display:flex;flex-wrap:wrap;gap:4px">${n.aditivos.map(a=>`<span style="font-size:10px;background:var(--surface3);color:var(--text3);padding:2px 8px;border-radius:20px;border:1px solid var(--border)">${a}</span>`).join('')}</div>
            </div>
          </div>
          <div class="grid2" style="font-size:12px">
            <div style="background:rgba(76,175,48,0.07);border:1px solid rgba(76,175,48,0.2);border-radius:8px;padding:8px 10px"><span style="color:var(--g400);font-weight:600">✓ Pros:</span><div style="color:var(--text2);margin-top:3px;line-height:1.6">${n.pros}</div></div>
            <div style="background:rgba(226,75,74,0.05);border:1px solid rgba(226,75,74,0.15);border-radius:8px;padding:8px 10px"><span style="color:#e88;font-weight:600">✕ Contras:</span><div style="color:var(--text2);margin-top:3px;line-height:1.6">${n.cons}</div></div>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function toggleNutri(el){
  el.classList.toggle('expanded');
}
