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
          <div class="body-prose" style="margin-bottom:12px">${n.desc}</div>
          <div class="grid2" style="margin-bottom:12px;font-size:12px">
            <div><div class="section-label">Dosis por fase</div>
              <div class="body-prose" style="line-height:1.85"><span class="c-green">Germ:</span> ${n.phases.germ}<br><span class="c-green">Veg:</span> ${n.phases.veg}<br><span class="c-purple">Flor:</span> ${n.phases.flower}<br><span class="c-blue">Flush:</span> ${n.phases.flush}</div>
            </div>
            <div><div class="section-label">Parámetros</div>
              <div class="body-prose" style="line-height:1.85">pH: <span class="c-blue" style="font-family:'DM Mono',monospace">${n.pHrange}</span><br>EC: <span class="c-green" style="font-family:'DM Mono',monospace">${n.ECrange}</span></div>
              <div class="section-label" style="margin-top:10px">Aditivos complementarios</div>
              <div class="pill-tag-row">${n.aditivos.map(a=>`<span class="pill-tag" style="font-size:10px">${a}</span>`).join('')}</div>
            </div>
          </div>
          <div class="grid2" style="font-size:12px">
            <div class="nutri-pros-box"><strong>✓ Pros</strong><div style="margin-top:4px">${n.pros}</div></div>
            <div class="nutri-cons-box"><strong>✕ Contras</strong><div style="margin-top:4px">${n.cons}</div></div>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function toggleNutri(el){
  el.classList.toggle('expanded');
}
