/** Diario fotográfico por planta. Tras hc-setup-compat-modal.js. */
// ══════════════════════════════════════════════════
// DIARIO FOTOGRÁFICO — seguimiento visual por planta
// ══════════════════════════════════════════════════

/** Fotos completas de una cesta (IndexedDB + caché). Orden cronológico. */
async function getFotosCompletasParaCesta(nivel, cesta) {
  const cestaData = state.torre[nivel] && state.torre[nivel][cesta];
  if (!cestaData) return [];
  const keys = [...(cestaData.fotoKeys || [])];
  const out = [];
  const seen = new Set();
  for (const key of keys) {
    if (!key || seen.has(key)) continue;
    seen.add(key);
    let obj = (cestaData.fotos || []).find(f => f && f.key === key);
    if (obj && obj.data) {
      out.push({ ...obj, key });
      continue;
    }
    try {
      const fromDb = await leerFotoIDB(key);
      if (fromDb && fromDb.data) out.push({ ...fromDb, key });
    } catch (_) {}
  }
  (cestaData.fotos || []).forEach(f => {
    if (f && f.data && !f.key) out.push(f);
  });
  out.sort((a, b) => new Date(a.isoDate || a.fecha) - new Date(b.isoDate || b.fecha));
  return out;
}

function contarFotosCesta(cesta) {
  if (!cesta) return 0;
  const k = cesta.fotoKeys || [];
  if (k.length > 0) return k.length;
  return (cesta.fotos || []).filter(f => f && f.data).length;
}

const MAX_FOTOS_SISTEMA_COMPLETO = 50;

function ensureFotosSistemaCompletoState() {
  if (!state.fotosSistemaCompleto || typeof state.fotosSistemaCompleto !== 'object') {
    state.fotosSistemaCompleto = { fotoKeys: [], fotos: [] };
  }
  if (!Array.isArray(state.fotosSistemaCompleto.fotoKeys)) state.fotosSistemaCompleto.fotoKeys = [];
  if (!Array.isArray(state.fotosSistemaCompleto.fotos)) state.fotosSistemaCompleto.fotos = [];
}

function agregarFotoSistemaCompletoCatch(ev) {
  void agregarFotoSistemaCompleto(ev).catch(() => showToast('No se pudo guardar la foto', true));
}

function agregarFotoSistemaCompleto(event) {
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
          initTorres();
          const canvas = document.createElement('canvas');
          const maxW = 1000;
          const ratio = Math.min(maxW / img.width, maxW / img.height, 1);
          canvas.width = Math.round(img.width * ratio);
          canvas.height = Math.round(img.height * ratio);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressed = canvas.toDataURL('image/jpeg', 0.52);

          ensureFotosSistemaCompletoState();
          const slot = state.fotosSistemaCompleto;
          while (slot.fotoKeys.length >= MAX_FOTOS_SISTEMA_COMPLETO) {
            const oldKey = slot.fotoKeys.shift();
            if (oldKey) {
              try { await borrarFotoIDB(oldKey); } catch (_) {}
              slot.fotos = (slot.fotos || []).filter(f => f && f.key !== oldKey);
              if (state.registro) {
                state.registro = state.registro.filter(
                  r => !(r.tipo === 'foto_sistema' && r.fotoKey === oldKey)
                );
              }
            }
          }

          const now = new Date();
          const torreIdx = state.torreActiva || 0;
          const fotoKey =
            'foto_sistema_t' + torreIdx + '_' + now.toISOString().replace(/[:.]/g, '_');
          const foto = {
            data: compressed,
            fecha: now.toLocaleDateString('es-ES'),
            hora: now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            isoDate: now.toISOString(),
            tipo: 'sistema_completo',
            notas: '',
          };
          await guardarFotoIDB(fotoKey, { ...foto, key: fotoKey });
          slot.fotoKeys.push(fotoKey);
          if (!slot.fotos) slot.fotos = [];
          slot.fotos.push({ ...foto, key: fotoKey });
          while (slot.fotos.length > 2) {
            const old = slot.fotos.shift();
            if (old) old.data = null;
          }

          addRegistro('foto_sistema', {
            fotoKey,
            fotoFecha: foto.fecha,
            icono: '🏗',
          });
          guardarEstadoTorreActual();
          saveState();
          renderDiarioBloqueSistema();
          showToast('🏗 Foto de la instalación guardada');
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

async function hydrateDiarioSistemaThumbs(wrap) {
  if (!wrap) return;
  for (const slot of wrap.querySelectorAll('.diario-sistema-thumb')) {
    const key = slot.getAttribute('data-foto-key');
    if (!key) continue;
    try {
      const o = await leerFotoIDB(key);
      if (!o || !o.data) continue;
      const img = document.createElement('img');
      img.src = o.data;
      img.alt = 'Instalación ' + (o.fecha || '');
      img.className = 'diario-sistema-thumb-img';
      img.addEventListener('click', () =>
        verFotoCompletaDiario(o.data, 'Vista de la instalación', o.fecha || '')
      );
      slot.innerHTML = '';
      slot.appendChild(img);
    } catch (_) {}
  }
}

function renderDiarioBloqueSistema() {
  const wrap = document.getElementById('diarioSistemaCompletoWrap');
  if (!wrap) return;
  ensureFotosSistemaCompletoState();
  const sisAct = infoSistemaEntrada(getTorreActiva() || {});
  const keys = [...state.fotosSistemaCompleto.fotoKeys].reverse();
  const n = keys.length;
  const tDiario = tipoInstalacionNormalizado(state.configTorre || {});
  const msgDiarioVacío =
    tDiario === 'nft'
      ? 'Aún no hay fotos de conjunto. <strong>Aléjate un poco</strong> para que salgan canales, depósito y entorno; conviene repetir desde la <strong>misma esquina</strong> para comparar.'
      : tDiario === 'dwc'
        ? 'Aún no hay fotos de conjunto. <strong>Aléjate un poco</strong> para que salgan macetas, tapa, depósito y entorno; repetir desde la <strong>misma esquina</strong> ayuda a comparar.'
        : 'Aún no hay fotos de conjunto. <strong>Aléjate un poco</strong> para que salgan la torre vertical, el depósito y el entorno; conviene repetir desde la <strong>misma esquina</strong> para comparar.';
  const filasTimel =
    n === 0
      ? '<div class="diario-sistema-empty-msg">' + msgDiarioVacío + '</div>'
      : '<div class="diario-sistema-timeline">' +
        keys
          .map(function(key, i) {
            const safe = String(key)
              .replace(/&/g, '&amp;')
              .replace(/"/g, '&quot;')
              .replace(/</g, '&lt;');
            return (
              '<div class="diario-sistema-slot-wrap">' +
              '<div class="diario-sistema-thumb" data-foto-key="' +
              safe +
              '">🏗</div>' +
              '<button type="button" class="diario-sistema-remove-btn" onclick="borrarFotoSistemaCompletoDes(' +
              i +
              ')">Quitar</button></div>'
            );
          })
          .join('') +
        '</div>';

  wrap.innerHTML =
    '<div class="diario-sistema-panel">' +
    '<div class="diario-sistema-title">🏗 Vista completa de la instalación</div>' +
    '<div class="hist-recarga-nutriente">' + (sisAct.emoji || '🌿') + ' ' + sisAct.nombre + '</div>' +
    '<div class="diario-sistema-intro">Registra la <strong>evolución de toda la instalación</strong> (no una sola maceta). Las fotos por cultivo siguen en cada <strong>ficha de planta</strong>. Estas entradas también salen en <strong>Historial → Registro</strong>.</div>' +
    '<div class="hc-foto-grid hc-foto-grid--mb">' +
    '<label class="hc-label-foto hc-label-foto--green" aria-label="Foto de la instalación con la cámara">' +
    '<span class="hc-foto-emoji" aria-hidden="true">📷</span><span>Cámara</span>' +
    '<input type="file" accept="image/*" capture="environment" class="hc-sr-file-input" onchange="agregarFotoSistemaCompletoCatch(event)">' +
    '</label>' +
    '<label class="hc-label-foto hc-label-foto--blue" aria-label="Foto de la instalación desde galería">' +
    '<span class="hc-foto-emoji" aria-hidden="true">🖼</span><span>Galería</span>' +
    '<input type="file" accept="image/*" class="hc-sr-file-input" onchange="agregarFotoSistemaCompletoCatch(event)">' +
    '</label></div>' +
    (n > 0
      ? '<div class="diario-sistema-kicker">Línea de tiempo (' +
        n +
        ')</div>'
      : '') +
    filasTimel +
    '</div>';
  void hydrateDiarioSistemaThumbs(wrap);
}

async function borrarFotoSistemaCompletoDes(idxDesdeReciente) {
  ensureFotosSistemaCompletoState();
  const keys = [...state.fotosSistemaCompleto.fotoKeys];
  const ordered = keys.slice().reverse();
  const key = ordered[idxDesdeReciente];
  if (!key) return;
  if (!confirm('¿Quitar esta foto de la instalación?')) return;
  try {
    await borrarFotoIDB(key);
  } catch (_) {}
  state.fotosSistemaCompleto.fotoKeys = keys.filter(k => k !== key);
  state.fotosSistemaCompleto.fotos = (state.fotosSistemaCompleto.fotos || []).filter(f => f && f.key !== key);
  if (state.registro) {
    state.registro = state.registro.filter(r => !(r.tipo === 'foto_sistema' && r.fotoKey === key));
  }
  guardarEstadoTorreActual();
  saveState();
  renderDiarioBloqueSistema();
  const rp = document.getElementById('histRegistroPanel');
  if (rp && !rp.classList.contains('setup-hidden') && typeof renderRegistro === 'function') renderRegistro();
  showToast('🗑 Foto de la instalación eliminada');
}

async function renderDiarioSelector() {
  renderDiarioBloqueSistema();
  const sel = document.getElementById('diarioPlantaSelector');
  const contenido = document.getElementById('diarioContenido');
  if (!sel) return;
  if (filtroTorreActivo != null && Array.isArray(state.torres) && state.torres.length > 1) {
    const idxObjetivo = state.torres.findIndex(t => String(t.id) === String(filtroTorreActivo));
    if (idxObjetivo >= 0 && idxObjetivo !== (state.torreActiva || 0)) {
      const tObj = state.torres[idxObjetivo];
      sel.innerHTML =
        '<div class="diario-selector-empty">' +
        '📌 El filtro de Historial está en <strong>' + escHtmlUi((tObj.emoji || '🌿') + ' ' + ((tObj.nombre || '').trim() || 'Instalación')) + '</strong>.<br>' +
        '<button type="button" class="btn btn-primary setup-mt-8" onclick="cambiarAlSistemaFiltradoDiario(' + idxObjetivo + ')">Cambiar a la instalación filtrada</button>' +
        '</div>';
      if (contenido) contenido.innerHTML = '';
      return;
    }
  }

  const cfg = state.configTorre || {};
  const sisAct = infoSistemaEntrada(getTorreActiva() || {});
  const numNiveles = cfg.numNiveles || NUM_NIVELES;
  const numCestas  = cfg.numCestas  || NUM_CESTAS;
  const plantas = [];

  for (let n = 0; n < numNiveles; n++) {
    for (let c = 0; c < (state.torre[n] || []).length; c++) {
      const cesta = state.torre[n][c];
      if (!cesta || !cesta.variedad) continue;
      const fotos = cesta.fotos || [];
      const numFotos = contarFotosCesta(cesta);
      const ultimaFechaMeta = (() => {
        const rev = [...fotos].reverse().find(f => f && f.data && f.fecha);
        if (rev) return rev.fecha;
        return '';
      })();
      const diasDesde = cesta.fecha
        ? Math.floor((new Date() - new Date(cesta.fecha)) / 86400000)
        : null;
      plantas.push({ n, c, variedad: cesta.variedad, fotos, diasDesde, notas: cesta.notas,
        numFotos, ultimaFechaMeta, keys: cesta.fotoKeys || [] });
    }
  }

  if (plantas.length === 0) {
    sel.innerHTML = '<div class="diario-selector-empty">' +
      '🌱 No hay plantas registradas aún.<br>Añade plantas a las cestas desde la pestaña <strong>Torre</strong>.</div>';
    if (contenido) contenido.innerHTML = '';
    return;
  }

  sel.innerHTML = plantas.map(p => {
    const tieneFotos = p.numFotos > 0;
    const ultimaTxt = p.ultimaFechaMeta || '—';
    const nomDiarioSel = escHtmlUi(cultivoNombreLista(getCultivoDB(p.variedad), p.variedad));
    return '<div class="diario-planta-item" data-n="' + p.n + '" data-c="' + p.c + '">' +

      // Miniatura: placeholder siempre, imagen se inserta con JS (evita truncamiento base64)
      '<div class="diario-thumb-slot' + (tieneFotos ? ' diario-thumb-slot--photos' : ' diario-thumb-slot--empty') + '" data-n="' + p.n + '" data-c="' + p.c + '">' +
        (tieneFotos ? '📸' : '🌱') + '</div>' +
      '<div class="diario-item-body">' +
        '<div class="diario-item-title">' + nomDiarioSel + '</div>' +
        '<div class="diario-item-meta">' + (sisAct.emoji || '🌿') + ' ' + sisAct.nombre + '</div>' +
        '<div class="diario-item-meta">' +
          'Nivel ' + (p.n+1) + ' · Cesta ' + (p.c+1) +
          (p.diasDesde !== null ? ' · <strong class="diario-item-dia">Día ' + p.diasDesde + '</strong>' : '') +
        '</div>' +
        '<div class="diario-item-meta">' +
          (tieneFotos
            ? '📸 ' + p.numFotos + ' foto' + (p.numFotos>1?'s':'') + ' · última: ' + ultimaTxt
            : '📷 Sin fotos aún — toca para añadir') +
        '</div>' +
      '</div>' +
      '<div class="diario-item-chevron">›</div>' +
    '</div>';
  }).join('');

  // Event delegation para abrir el diario de cada planta
  sel.querySelectorAll('.diario-planta-item').forEach(el => {
    el.addEventListener('click', function() {
      const n = parseInt(this.getAttribute('data-n'));
      const c = parseInt(this.getAttribute('data-c'));
      renderDiarioPlanta(n, c);
    });
  });

    // Miniaturas: caché local o última clave en IndexedDB
  sel.querySelectorAll('.diario-thumb-slot').forEach(slot => {
    const n = parseInt(slot.getAttribute('data-n'));
    const c = parseInt(slot.getAttribute('data-c'));
    const cestaData = (state.torre[n] || [])[c];
    if (!cestaData) return;
    const keys = cestaData.fotoKeys || [];
    const ultimaKey = keys.length > 0 ? keys[keys.length - 1] : null;
    const uf = [...(cestaData.fotos || [])].reverse().find(f => f && f.data);
    const ponerImg = (src) => {
      if (!src) return;
      const img = document.createElement('img');
      img.src = src;
      img.className = 'diario-thumb-img';
      img.alt = cestaData.variedad || '';
      slot.replaceWith(img);
    };
    if (uf && uf.data) {
      ponerImg(uf.data);
      return;
    }
    if (ultimaKey) {
      leerFotoIDB(ultimaKey).then(o => { if (o && o.data) ponerImg(o.data); }).catch(() => {});
    }
  });
}

function cambiarAlSistemaFiltradoDiario(idxObjetivo) {
  cambiarTorreActiva(idxObjetivo);
  setTimeout(() => {
    if (histTabActiva === 'diario') renderDiarioSelector();
  }, 120);
}

async function renderDiarioPlanta(nivel, cesta) {
  try {
  const contenido = document.getElementById('diarioContenido');
  const sel = document.getElementById('diarioPlantaSelector');
  if (!contenido) return;

  const cestaData = state.torre[nivel] && state.torre[nivel][cesta];
  if (!cestaData) return;

  const fotos = await getFotosCompletasParaCesta(nivel, cesta);
  const variedad = cestaData.variedad || 'Planta';
  const diasDesde = cestaData.fecha
    ? Math.floor((new Date() - new Date(cestaData.fecha)) / 86400000)
    : null;
  const cultivo = getCultivoDB(variedad);
  const tituloDiario = escHtmlUi(cultivoNombreLista(cultivo, variedad));

  // Ocultar selector, mostrar diario
  if (sel) sel.style.display = 'none';

  let html = '';

  // ── Cabecera ────────────────────────────────────────────────────────────
  html += '<div class="diario-det-head">' +
    '<button type="button" class="diario-det-back" onclick="volverDiarioSelector()" aria-label="Volver al selector">‹</button>' +
    '<div class="diario-det-title-wrap">' +
      '<div class="diario-det-title">' +
        tituloDiario + '</div>' +
      '<div class="diario-det-sub">' +
        'Nivel ' + (nivel+1) + ' · Cesta ' + (cesta+1) +
        (diasDesde !== null ? ' · <strong class="diario-item-dia">Día ' + diasDesde + ' de cultivo</strong>' : '') +
      '</div>' +
    '</div>' +
    // Botón añadir foto rápido
    '<label class="diario-det-add-foto" aria-label="Añadir foto">' +
      '📷 <span>Foto</span>' +
      '<input type="file" accept="image/*" capture="environment" class="hc-sr-file-input" ' +
        'onchange="agregarFotoDesdeDiario(event,' + nivel + ',' + cesta + ')">' +
    '</label>' +
  '</div>';

  // ── Barra de progreso del cultivo ────────────────────────────────────────
  if (cultivo && diasDesde !== null) {
    const progreso = Math.min(100, Math.round((diasDesde / cultivo.dias) * 100));
    const color = progreso >= 100 ? '#16a34a' : progreso >= 70 ? '#f59e0b' : '#3b82f6';
    html += '<div class="diario-prog-box" style="--diario-prog-c:' + color + ';--diario-prog-pct:' + progreso + '%">' +
      '<div class="diario-prog-row">' +
        '<span>🌱 Progreso de cultivo</span>' +
        '<span class="diario-prog-pct">' + progreso + '% — día ' + diasDesde + '/' + cultivo.dias + '</span>' +
      '</div>' +
      '<div class="diario-prog-track">' +
        '<div class="diario-prog-fill"></div>' +
      '</div>' +
      (progreso >= 100
        ? '<div class="diario-prog-done">✅ ¡Lista para cosechar!</div>'
        : '<div class="diario-prog-pending">~' + (cultivo.dias - diasDesde) + ' días hasta cosecha estimada</div>'
      ) +
    '</div>';
  }

  // ── Stats rápidos ────────────────────────────────────────────────────────
  if (cultivo) {
    html += '<div class="diario-stats-grid">' +
      '<div class="diario-stat-cell diario-stat-cell--green">' +
        '<div class="diario-stat-lab">EC óptima</div>' +
        '<div class="diario-stat-val diario-stat-val--green">' +
          cultivo.ecMin + '–' + cultivo.ecMax + '</div>' +
      '</div>' +
      '<div class="diario-stat-cell diario-stat-cell--blue">' +
        '<div class="diario-stat-lab">pH óptimo</div>' +
        '<div class="diario-stat-val diario-stat-val--blue">' +
          cultivo.phMin + '–' + cultivo.phMax + '</div>' +
      '</div>' +
      '<div class="diario-stat-cell diario-stat-cell--amber">' +
        '<div class="diario-stat-lab">Fotos</div>' +
        '<div class="diario-stat-val diario-stat-val--amber">' +
          fotos.length + '</div>' +
      '</div>' +
    '</div>';
  }

  // ── Línea de tiempo fotográfica ──────────────────────────────────────────
  if (fotos.length === 0) {
    html += '<div class="diario-fotos-empty">' +
      '<div class="diario-fotos-empty-icon">📷</div>' +
      '<div class="diario-fotos-empty-title">' +
        'Sin fotos aún</div>' +
      '<div class="diario-fotos-empty-text">' +
        'Añade la primera foto para empezar el seguimiento visual.<br>' +
        'Ideal hacerlo en el día de trasplante y cada 3-5 días.' +
      '</div>' +
    '</div>';
  } else {
    html += '<div class="diario-tl-heading">' +
      '📅 Línea de tiempo</div>';

    // Ordenar fotos por fecha
    const fotasOrdenadas = [...fotos].sort((a,b) => new Date(a.isoDate||a.fecha) - new Date(b.isoDate||b.fecha));

    fotasOrdenadas.forEach((f, i) => {
      html += '<div class="diario-tl-row">' +
        // Columna izquierda: línea + punto
        '<div class="diario-tl-rail">' +
          '<div class="diario-tl-dot"></div>' +
          (i < fotasOrdenadas.length-1
            ? '<div class="diario-tl-line"></div>'
            : '') +
        '</div>' +
        // Contenido
        '<div class="diario-tl-body">' +
          // Fecha y día
          '<div class="diario-tl-date">' +
            f.fecha + (f.hora ? ' · ' + f.hora : '') +
            (f.diasCultivo !== null && f.diasCultivo !== undefined
              ? ' <span class="diario-tl-dia-badge">Día ' + f.diasCultivo + '</span>'
              : '') +
          '</div>' +
          // Foto — placeholder, la imagen real se inserta con JS después (clave IDB si existe)
          '<div class="diario-foto-slot" data-foto-idx="' + i + '" ' +
            'data-foto-key="' + (f.key || '') + '" ' +
            'data-variedad="' + variedad.replace(/"/g,"'") + '" data-fecha="' + f.fecha + '">📸</div>' +
          // Notas de la foto si las tiene
          (f.notas
            ? '<div class="diario-tl-notas">💬 ' + f.notas + '</div>'
            : '') +
        '</div>' +
      '</div>';
    });

    // Comparador antes/después si hay ≥2 fotos
    if (fotos.length >= 2) {
      const primera = fotasOrdenadas[0];
      const ultima  = fotasOrdenadas[fotasOrdenadas.length-1];
      html += '<div class="diario-compare-wrap">' +
        '<div class="diario-compare-title">' +
          '🔍 Comparativa inicio/ahora</div>' +
        '<div class="diario-compare-grid">' +
          '<div>' +
            '<div class="compat-foto-slot" data-alt="Inicio">📸</div>' +
            '<div class="diario-compare-caption">' +
              '📅 ' + primera.fecha + (primera.diasCultivo !== null && primera.diasCultivo !== undefined ? ' · Día ' + primera.diasCultivo : '') +
            '</div>' +
          '</div>' +
          '<div>' +
            '<div class="compat-foto-slot" data-alt="Ahora">📸</div>' +
            '<div class="diario-compare-caption">' +
              '📅 ' + ultima.fecha + (ultima.diasCultivo !== null && ultima.diasCultivo !== undefined ? ' · Día ' + ultima.diasCultivo : '') +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    }
  }

  contenido.innerHTML = html;

  // Insertar imágenes reales en los placeholders (evita truncamiento de base64 en innerHTML)
  const fotasParaInsertar = [...fotos].sort((a,b) => new Date(a.isoDate||a.fecha) - new Date(b.isoDate||b.fecha));
  const resolverDataFoto = async (foto) => {
    if (foto && foto.data) return foto.data;
    if (foto && foto.key) {
      try {
        const o = await leerFotoIDB(foto.key);
        return o && o.data ? o.data : '';
      } catch (_) { return ''; }
    }
    return '';
  };

  for (const slot of contenido.querySelectorAll('.diario-foto-slot')) {
    const idx = parseInt(slot.getAttribute('data-foto-idx'), 10);
    const foto = fotasParaInsertar[idx];
    const src = await resolverDataFoto(foto);
    if (!src) continue;
    const img = document.createElement('img');
    img.src = src;
    img.alt = variedad + ' día ' + (foto && foto.diasCultivo != null ? foto.diasCultivo : idx);
    img.className = 'diario-foto-img';
    img.setAttribute('data-variedad', (foto && foto.variedad) || variedad);
    img.setAttribute('data-fecha', (foto && foto.fecha) || '');
    img.addEventListener('click', function() {
      verFotoCompletaDiario(this.src, this.getAttribute('data-variedad'), this.getAttribute('data-fecha'));
    });
    slot.replaceWith(img);
  }

  const compatSlots = contenido.querySelectorAll('.compat-foto-slot');
  if (compatSlots.length === 2 && fotosParaInsertar.length >= 2) {
    const prim = fotosParaInsertar[0];
    const ult  = fotosParaInsertar[fotosParaInsertar.length - 1];
    const src0 = await resolverDataFoto(prim);
    const src1 = await resolverDataFoto(ult);
    const pairs = [[compatSlots[0], src0], [compatSlots[1], src1]];
    for (const [slot, src] of pairs) {
      if (!src) continue;
      const img = document.createElement('img');
      img.src = src;
      img.alt = slot.getAttribute('data-alt') || '';
      img.className = 'diario-compat-img';
      slot.replaceWith(img);
    }
  }

  // Scroll al principio
  contenido.scrollIntoView({ behavior:'smooth', block:'start' });
  } catch(e) { console.error('renderDiarioPlanta error:', e); if(contenido) contenido.innerHTML = '<div class="diario-error-msg">Error cargando diario: ' + e.message + '</div>'; }
}

function volverDiarioSelector() {
  const sel = document.getElementById('diarioPlantaSelector');
  const contenido = document.getElementById('diarioContenido');
  if (sel) sel.style.display = 'flex';
  if (contenido) contenido.innerHTML = '';
  if (sel) sel.style.flexDirection = 'column';
}

async function agregarFotoDesdeDiario(event, nivel, cesta) {
  const prevEditing = editingCesta;
  editingCesta = { nivel, cesta };
  try {
    await agregarFotoCesta(event);
    await renderDiarioPlanta(nivel, cesta);
  } catch (e) {
    console.error(e);
    showToast('No se pudo guardar la foto', true);
  } finally {
    editingCesta = prevEditing;
  }
}

function verFotoCompletaDiario(dataUrl, variedad, fecha) {
  const labFoto = escHtmlUi(cultivoNombreLista(getCultivoDB(variedad), variedad));
  const altFoto = escHtmlUi(String(variedad || ''));
  const feFoto = escHtmlUi(String(fecha || ''));
  const overlay = document.createElement('div');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Foto del diario');
  overlay.className = 'diario-lightbox diario-lightbox--solid';
  overlay.innerHTML =
    '<div class="diario-lightbox-title">' + labFoto + ' · ' + feFoto + '</div>' +
    '<img src="' + dataUrl + '" alt="' + altFoto + '" class="diario-lightbox-img diario-lightbox-img--75">' +
    '<button type="button" class="diario-lightbox-btn">' +
      'Cerrar</button>';
  const cerrarOv = () => {
    a11yDialogClosed(overlay);
    overlay.remove();
  };
  overlay.querySelector('button')?.addEventListener('click', cerrarOv);
  overlay.onclick = e => { if (e.target === overlay) cerrarOv(); };
  document.body.appendChild(overlay);
  a11yDialogOpened(overlay);
}


async function verFotoCompleta(idx) {
  if (!editingCesta) return;
  const { nivel, cesta } = editingCesta;
  const lista = await getFotosCompletasParaCesta(nivel, cesta);
  const f = lista[idx];
  if (!f) return;
  let dataUrl = f.data || '';
  if (!dataUrl && f.key) {
    try {
      const o = await leerFotoIDB(f.key);
      if (o && o.data) dataUrl = o.data;
    } catch (_) {}
  }
  if (!dataUrl) return;
  const overlay = document.createElement('div');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Foto de la planta');
  overlay.className = 'diario-lightbox diario-lightbox--plant';
  overlay.innerHTML =
    '<img src="" alt="Foto planta" class="diario-lightbox-img diario-lightbox-img--80">' +
    '<div class="diario-lightbox-cap"></div>' +
    '<button type="button" class="diario-lightbox-btn diario-lightbox-btn--round">Cerrar</button>';
  const img = overlay.querySelector('img');
  const cap = overlay.querySelector('div');
  const cerrar = overlay.querySelector('button');
  if (img) img.src = dataUrl;
  if (cap) cap.textContent = (f.fecha || '') + (f.hora ? ' · ' + f.hora : '');
  const cerrarOv = () => {
    a11yDialogClosed(overlay);
    overlay.remove();
  };
  if (cerrar) cerrar.addEventListener('click', cerrarOv);
  overlay.onclick = (e) => { if (e.target === overlay) cerrarOv(); };
  document.body.appendChild(overlay);
  a11yDialogOpened(overlay);
}

async function borrarFotoCesta(idx) {
  if (!editingCesta || !confirm('¿Borrar esta foto?')) return;
  const { nivel, cesta } = editingCesta;
  const cestaData = state.torre[nivel][cesta];
  if (!cestaData) return;
  const lista = await getFotosCompletasParaCesta(nivel, cesta);
  const target = lista[idx];
  if (!target) return;
  if (target.key) {
    try { await borrarFotoIDB(target.key); } catch (_) {}
    const k = cestaData.fotoKeys;
    if (Array.isArray(k)) {
      const i = k.indexOf(target.key);
      if (i >= 0) k.splice(i, 1);
    }
  }
  const fotosArr = cestaData.fotos;
  if (fotosArr && fotosArr.length) {
    const j = fotosArr.findIndex(
      f => f && (target.key ? f.key === target.key : !f.key && f.isoDate === target.isoDate && f.fecha === target.fecha));
    if (j >= 0) fotosArr.splice(j, 1);
  }
  saveState();
  void renderFotosCesta();
}

function poblarSelectVariedades() {
  const sel = document.getElementById('editVariedad');
  if (!sel) return;
  // Guardar valor actual
  const valActual = sel.value;
  sel.innerHTML = '<option value="">— Vacía —</option>';

  // Agrupar por grupo
  const grupos = {};
  CULTIVOS_DB.forEach(c => {
    if (!grupos[c.grupo]) grupos[c.grupo] = [];
    grupos[c.grupo].push(c);
  });

  const nombreGrupos = {
    lechugas:'Lechugas', hojas:'Hojas verdes', asiaticas:'Asiáticas / Mostaza',
    hierbas:'Hierbas', frutos:'Frutos', fresas:'Fresas',
    raices:'Raíces', microgreens:'Microgreens'
  };

  Object.entries(grupos).forEach(([gKey, cultivos]) => {
    const og = document.createElement('optgroup');
    og.label = nombreGrupos[gKey] || gKey;
    cultivos.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.nombre;
      opt.innerHTML = cultivoEmojiHtml(c, 1.05) + ' ' + escOptionHtml(cultivoNombreLista(c, c.nombre));
      og.appendChild(opt);
    });
    sel.appendChild(og);
  });

  // Restaurar valor
  if (valActual) sel.value = valActual;
}

function openModal(nivel, cesta) {
  editingCesta = { nivel, cesta };
  const data = state.torre[nivel][cesta];
  document.getElementById('modalTitle').textContent = `Nivel ${nivel + 1} — Cesta ${cesta + 1}`;
  document.getElementById('editVariedad').value = data.variedad || '';
  poblarSelectVariedades();
  document.getElementById('editFecha').value = data.fecha || '';
  document.getElementById('editNotas').value = data.notas || '';
  const eo = document.getElementById('editOrigenPlanta');
  if (eo) {
    eo.value =
      typeof normalizarOrigenPlanta === 'function'
        ? normalizarOrigenPlanta(data.origenPlanta)
        : (data.origenPlanta || '');
    if (typeof onEditOrigenPlantaChange === 'function') onEditOrigenPlantaChange();
  }
  const mo = document.getElementById('modalOverlay');
  mo.classList.add('open');
  a11yDialogOpened(mo);
  // Renderizar fotos si las hay
  setTimeout(renderFotosCesta, 50);
}

function closeModal(e) {
  const mo = document.getElementById('modalOverlay');
  if (!e || e.target === mo) {
    mo.classList.remove('open');
    editingCesta = null;
    a11yDialogClosed(mo);
  }
}


