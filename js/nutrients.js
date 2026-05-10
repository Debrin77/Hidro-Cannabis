// Nutrients

function renderNutrientes(){
  document.getElementById('nutriList').innerHTML = nutrients.map(n=>`
    <div class="nutri-item" onclick="toggleNutri(this)">
      <div class="nutri-rank-num">${n.rank}</div>
      <div class="nutri-body">
        <div class="nutri-name">${n.name}</div>
        <div class="nutri-brand">${n.brand}</div>
        <div class="nutri-tags">
          <span class="nutri-tag tag-system"><i class="ti ti-droplet nutri-icon-sm" aria-hidden="true"></i> ${n.system.split('/')[0].trim()}</span>
          <span class="nutri-tag tag-level">${n.level}</span>
          ${n.organic?'<span class="nutri-tag tag-organic">100% Orgánico</span>':''}
          <span class="nutri-tag nutri-tag--price">${n.price}</span>
        </div>
        <div class="nutri-score">${Array.from({length:5},(_,i)=>`<div class="score-dot ${i<n.score?'on':'off'}"></div>`).join('')}</div>
        <div class="nutri-desc">
          <div class="body-prose body-prose--spaced">${n.desc}</div>
          <div class="grid2 nutri-meta-grid">
            <div><div class="section-label">Dosis por fase</div>
              <div class="body-prose body-prose--roomy"><span class="c-green">Germ:</span> ${n.phases.germ}<br><span class="c-green">Veg:</span> ${n.phases.veg}<br><span class="c-purple">Flor:</span> ${n.phases.flower}<br><span class="c-blue">Flush:</span> ${n.phases.flush}</div>
            </div>
            <div><div class="section-label">Parámetros</div>
              <div class="body-prose body-prose--roomy">pH: <span class="c-blue ec-val">${n.pHrange}</span><br>EC: <span class="c-green ec-val">${n.ECrange}</span></div>
              <div class="section-label section-label--after">Aditivos complementarios</div>
              <div class="pill-tag-row">${n.aditivos.map(a=>`<span class="pill-tag pill-tag--sm">${a}</span>`).join('')}</div>
            </div>
          </div>
          <div class="grid2 nutri-meta-grid">
            <div class="nutri-pros-box"><strong>✓ Pros</strong><div class="nutri-pro-con-text body-prose">${n.pros}</div></div>
            <div class="nutri-cons-box"><strong>✕ Contras</strong><div class="nutri-pro-con-text body-prose">${n.cons}</div></div>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function toggleNutri(el){
  el.classList.toggle('expanded');
}
