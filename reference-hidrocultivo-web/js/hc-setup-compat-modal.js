/** Compatibilidad en modal de edición. Tras hc-setup-rotacion.js. */
// ══════════════════════════════════════════════════
// COMPATIBILIDAD INFO EN MODAL
// ══════════════════════════════════════════════════
function showCompatInfo() {
  const variedad = document.getElementById('editVariedad').value;
  const infoEl   = document.getElementById('editCompatInfo');
  if (!variedad) { infoEl.style.display = 'none'; return; }

  const cultivo = getCultivoDB(variedad);
  const grupo   = getGrupoCultivo(variedad);

  if (!cultivo && !grupo) { infoEl.style.display = 'none'; return; }

  infoEl.style.display = 'block';

  let html = '';

  // Info del cultivo específico
  if (cultivo) {
    const dif   = { fácil:'🟢 Fácil', media:'🟡 Media', difícil:'🔴 Avanzado' };
    html += '<div class="edit-compat-head">';
    html += '<span class="edit-compat-emoji" aria-hidden="true">' + cultivoEmoji(cultivo) + '</span>';
    html += '<div class="edit-compat-main">';
    html += '<div class="edit-compat-title">' +
      escHtmlUi(cultivoNombreLista(cultivo, variedad)) + '</div>';
    html += '<div class="edit-compat-chips">' +
      '<span class="edit-compat-chip edit-compat-chip--ec">⚡ EC ' + cultivo.ecMin + '–' + cultivo.ecMax + ' µS/cm</span>' +
      '<span class="edit-compat-chip edit-compat-chip--ph">🧪 pH ' + cultivo.phMin + '–' + cultivo.phMax + '</span>' +
      '<span class="edit-compat-chip edit-compat-chip--days">⏱ ~' + cultivo.dias + ' días</span>' +
      '<span class="edit-compat-chip edit-compat-chip--diff">' + (dif[cultivo.dificultad]||'') + '</span>' +
    '</div>';

    if (cultivo.nota) {
      html += '<div class="edit-compat-nota">💡 ' + cultivo.nota + '</div>';
    }

    // Fases si tiene fructificación
    if (cultivo.fructificacion && cultivo.fases) {
      html += '<div class="edit-compat-fases-kicker">🌸 Fases de cultivo:</div>';
      Object.entries(cultivo.fases).forEach(([fase, datos]) => {
        const nombres = {plantula:'Plántula',vegetativo:'Vegetativo',floracion:'Floración',fructificacion:'Fructificación'};
        html += '<div class="edit-compat-fase-line">' +
          '<strong>' + (nombres[fase]||fase) + '</strong>: EC ' + datos.ec[0] + '–' + datos.ec[1] +
          ' · pH ' + datos.ph[0] + '–' + datos.ph[1] + ' · ~' + datos.dias + 'd</div>';
      });
    }
    html += '</div></div>';
  }

  // Compatibilidad con otros cultivos en la misma torre
  if (editingCesta) {
    const { nivel } = editingCesta;
    const otrosGrupos = new Set();
    state.torre[nivel]?.forEach((c, i) => {
      if (c.variedad && c.variedad !== variedad) {
        const g = getGrupoCultivo(c.variedad);
        if (g) otrosGrupos.add(g.key);
      }
    });

    if (otrosGrupos.size > 0 && grupo) {
      const compatibles = COMPAT_MATRIZ[grupo.key] || [];
      const incomp = [...otrosGrupos].filter(g => !compatibles.includes(g));
      if (incomp.length > 0) {
        const nombresIncomp = incomp.map(g => GRUPOS_CULTIVO[g]?.nombre || g).join(', ');
        html += '<div class="edit-compat-banner edit-compat-banner--bad">' +
          '⚠️ Incompatible con ' + nombresIncomp + ' en esta torre — EC diferente</div>';
      } else {
        html += '<div class="edit-compat-banner edit-compat-banner--ok">' +
          '✅ Compatible con los cultivos actuales de esta torre</div>';
      }
    }
  }

  infoEl.className = 'edit-compat-box ' + (cultivo?.fructificacion ? 'edit-compat-box--fruit' : 'edit-compat-box--leaf');
  infoEl.innerHTML = html;
}


function agregarFotoCesta(event) {
  const file = event.target && event.target.files && event.target.files[0];
  if (!file) return Promise.resolve();
  const inputEl = event.target;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => {
      try { if (inputEl) inputEl.value = ''; } catch (_) {}
      reject(reader.error);
    };
    reader.onload = function(e) {
      const base64 = e.target.result;
      const img = new Image();
      img.onerror = () => {
        try { if (inputEl) inputEl.value = ''; } catch (_) {}
        reject(new Error('No se pudo leer la imagen'));
      };
      img.onload = async function() {
        try {
          const canvas = document.createElement('canvas');
          const maxW = 400;
          const ratio = Math.min(maxW / img.width, maxW / img.height, 1);
          canvas.width  = Math.round(img.width  * ratio);
          canvas.height = Math.round(img.height * ratio);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressed = canvas.toDataURL('image/jpeg', 0.5);

          if (!editingCesta) { resolve(); return; }
          const { nivel, cesta } = editingCesta;
          if (!state.torre[nivel]) state.torre[nivel] = [];
          if (!state.torre[nivel][cesta]) state.torre[nivel][cesta] = { variedad:'', fecha:'', notas:'', origenPlanta:'', fotos:[], fotoKeys:[] };
          const cestaData = state.torre[nivel][cesta];
          if (!cestaData.fotos) cestaData.fotos = [];

          const now = new Date();
          const diasDesdeTrasplante = cestaData.fecha
            ? Math.floor((now - new Date(cestaData.fecha)) / 86400000)
            : null;

          const foto = {
            data:     compressed,
            fecha:    now.toLocaleDateString('es-ES'),
            hora:     now.toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'}),
            isoDate:  now.toISOString(),
            variedad: cestaData.variedad || '',
            nivel:    nivel + 1,
            cesta:    cesta + 1,
            diasCultivo: diasDesdeTrasplante,
            notas:    '',
          };

          const torreIdx = state.torreActiva || 0;
          const fotoKey  = 'foto_t' + torreIdx + '_n' + nivel + '_c' + cesta + '_' +
                           now.toISOString().replace(/[:.]/g,'_');
          await guardarFotoIDB(fotoKey, { ...foto, key: fotoKey });
          if (!cestaData.fotoKeys) cestaData.fotoKeys = [];
          cestaData.fotoKeys.push(fotoKey);
          if (!cestaData.fotos) cestaData.fotos = [];
          cestaData.fotos.push({ ...foto, key: fotoKey });
          while (cestaData.fotos.length > 2) {
            const old = cestaData.fotos.shift();
            if (old) old.data = null;
          }

          addRegistro('foto', {
            variedad:    cestaData.variedad || 'Planta',
            nivel:       nivel + 1,
            cesta:       cesta + 1,
            diasCultivo: diasDesdeTrasplante,
            fotoKey:     fotoKey,
            fotoFecha:   foto.fecha,
            icono:       '📸'
          });

          saveState();
          void renderFotosCesta();
          showToast('📸 Foto guardada en el diario · Día ' + (diasDesdeTrasplante || 0));
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      img.src = base64;
    };
    reader.readAsDataURL(file);
    try { if (inputEl) inputEl.value = ''; } catch (_) {}
  });
}

async function renderFotosCesta() {
  const preview = document.getElementById('fotosPreview');
  if (!preview || !editingCesta) return;
  const { nivel, cesta } = editingCesta;
  const cestaData = state.torre[nivel] && state.torre[nivel][cesta];
  if (!cestaData) return;
  const lista = await getFotosCompletasParaCesta(nivel, cesta);
  if (lista.length === 0) { preview.innerHTML = ''; return; }
  preview.innerHTML = '';
  const renderOne = (f, i, src) => {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;flex-shrink:0';

    const img = document.createElement('img');
    img.src = src || '';
    img.alt = 'Foto ' + (f.fecha || '');
    img.style.cssText = 'width:72px;height:72px;object-fit:cover;border-radius:10px;border:2px solid #86efac;cursor:pointer;display:block';
    img.addEventListener('click', () => void verFotoCompleta(i));

    const btn = document.createElement('button');
    btn.textContent = '✕';
    btn.setAttribute('aria-label', 'Borrar foto ' + (i+1));
    btn.style.cssText = 'position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:#dc2626;color:white;border:none;font-size:11px;cursor:pointer;font-weight:900';
    btn.addEventListener('click', () => void borrarFotoCesta(i));

    const fecha = document.createElement('div');
    fecha.style.cssText = 'font-size:9px;color:#6b7280;text-align:center;margin-top:2px';
    fecha.textContent = f.fecha || '';

    wrap.appendChild(img);
    wrap.appendChild(btn);
    wrap.appendChild(fecha);
    preview.appendChild(wrap);
  };
  for (let i = 0; i < lista.length; i++) {
    const f = lista[i];
    let src = f.data || '';
    if (!src && f.key) {
      try {
        const o = await leerFotoIDB(f.key);
        if (o && o.data) src = o.data;
      } catch (_) {}
    }
    if (src) renderOne(f, i, src);
  }
}


