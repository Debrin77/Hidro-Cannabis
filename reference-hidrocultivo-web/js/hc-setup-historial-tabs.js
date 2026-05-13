/** Historial — pestañas y listados. Tras hc-setup-checklist.js. */
// ══════════════════════════════════════════════════
// HISTORIAL — LÓGICA
// ══════════════════════════════════════════════════

let histTabActiva = 'mediciones';
let histDatos = [];
let histRecargasDatos = [];

function histTab(tab) {
  histTabActiva = tab;
  const sinDatosEl = document.getElementById('histSinDatos');
  if (sinDatosEl) sinDatosEl.classList.add('setup-hidden');
  document.querySelectorAll('.hist-tab').forEach(t => {
    t.classList.remove('active');
    t.setAttribute('aria-selected', 'false');
    t.tabIndex = -1;
  });
  const btn = document.getElementById('htab-' + tab);
  if (btn) {
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    btn.tabIndex = 0;
  }

  const panelMap = {
    mediciones: 'histMediciones',
    recargas: 'histRecargas',
    registro: 'histRegistroPanel',
    diario: 'histDiarioPanel',
  };
  // Ocultar todos los paneles
  Object.entries(panelMap).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('setup-hidden');
    el.setAttribute('aria-hidden', 'true');
  });

  if (tab === 'mediciones') {
    const el = document.getElementById('histMediciones');
    if (el) { el.classList.remove('setup-hidden'); el.setAttribute('aria-hidden', 'false'); }
    try {
      const nMed = typeof recolectarMedicionesTodasInstalaciones === 'function'
        ? recolectarMedicionesTodasInstalaciones().length
        : 0;
      if (nMed === 0 && sinDatosEl) sinDatosEl.classList.remove('setup-hidden');
    } catch (_) {
      if (sinDatosEl) sinDatosEl.classList.remove('setup-hidden');
    }
  } else if (tab === 'recargas') {
    const el = document.getElementById('histRecargas');
    if (el) { el.classList.remove('setup-hidden'); el.setAttribute('aria-hidden', 'false'); }
  } else if (tab === 'registro') {
    const el = document.getElementById('histRegistroPanel');
    if (el) { el.classList.remove('setup-hidden'); el.setAttribute('aria-hidden', 'false'); }
    renderRegistro();
  } else if (tab === 'diario') {
    guardarEstadoTorreActual(); // asegurar que state.torre tiene las fotos recientes
    const el = document.getElementById('histDiarioPanel');
    if (el) { el.classList.remove('setup-hidden'); el.setAttribute('aria-hidden', 'false'); }
    renderDiarioSelector();
  }
  if (typeof window._hcSyncHistorialTabTabIndex === 'function') window._hcSyncHistorialTabTabIndex();
}

let filtroTorreActivo = null; // null = todas las instalaciones

function coincideFiltroTorre(entry) {
  if (filtroTorreActivo == null) return true;
  const tid = entry && entry.torreId;
  if (tid != null) return String(tid) === String(filtroTorreActivo);
  const t = state.torres && state.torres.find(x => x && String(x.id) === String(filtroTorreActivo));
  if (!t) return false;
  const nomEnt = String(entry.torreNombre || '').trim();
  const nomTor = String(t.nombre || '').trim();
  if (nomEnt && nomTor && nomEnt === nomTor) return true;
  return false;
}

/** Registro unificado (todas las torres) para Historial → Registro con filtro por instalación. */
function recolectarRegistroTodasInstalaciones() {
  initTorres();
  if (!state.torres || state.torres.length <= 1) {
    const ta = getTorreActiva();
    const tid = ta && ta.id != null ? ta.id : (state.torreActiva || 0);
    const slotIdx = state.torreActiva || 0;
    let rows = state.registro;
    const slotReg = state.torres && state.torres[slotIdx] && Array.isArray(state.torres[slotIdx].registro)
      ? state.torres[slotIdx].registro
      : null;
    if ((!rows || rows.length === 0) && slotReg && slotReg.length) {
      rows = slotReg;
    }
    return (rows || []).map(e => ({
      ...e,
      torreId: e.torreId != null ? e.torreId : tid,
      _slotIdx: slotIdx,
    }));
  }
  const todas = [];
  state.torres.forEach((tor, slotIdx) => {
    (tor.registro || []).forEach(e => {
      todas.push({
        ...e,
        torreId: e.torreId != null ? e.torreId : tor.id,
        torreNombre: e.torreNombre || tor.nombre,
        torreEmoji: e.torreEmoji || tor.emoji,
        _slotIdx: slotIdx,
      });
    });
  });
  todas.sort((a, b) => {
    const da = parseRegistroFechaHoraMs(a.fecha, a.hora);
    const db = parseRegistroFechaHoraMs(b.fecha, b.hora);
    return db - da;
  });
  return todas;
}

function parseRegistroFechaHoraMs(fecha, hora) {
  const p = String(fecha || '').split('/');
  if (p.length !== 3) return 0;
  const d = parseInt(p[0], 10);
  const m = parseInt(p[1], 10) - 1;
  const y = parseInt(p[2], 10);
  const t = String(hora || '00:00').split(':');
  const h = parseInt(t[0], 10) || 0;
  const mi = parseInt(t[1], 10) || 0;
  if (!y || m < 0 || m > 11) return 0;
  return new Date(y, m, d, h, mi).getTime();
}

/** Mediciones unificadas: una sola instalación o todas, con torreId/torreNombre para filtro e importación. */
function recolectarMedicionesTodasInstalaciones() {
  initTorres();
  if (!state.torres || state.torres.length <= 1) {
    const ta = getTorreActiva();
    const tid = ta && ta.id != null ? ta.id : null;
    return (state.mediciones || []).map(m => ({
      ...m,
      torreId: m.torreId != null ? m.torreId : tid,
      torreNombre: m.torreNombre || (ta && ta.nombre) || '',
      torreEmoji: m.torreEmoji || (ta && ta.emoji) || '🌿',
    }));
  }
  const todas = [];
  state.torres.forEach(t => {
    (t.mediciones || []).forEach(m => {
      todas.push({
        ...m,
        torreId: m.torreId != null ? m.torreId : t.id,
        torreNombre: m.torreNombre || t.nombre,
        torreEmoji: m.torreEmoji || t.emoji || '🌿',
      });
    });
  });
  todas.sort((a, b) => {
    const da = String(a.fecha || '').split('/').reverse().join('') + String(a.hora || '');
    const db = String(b.fecha || '').split('/').reverse().join('') + String(b.hora || '');
    return db.localeCompare(da);
  });
  return todas;
}

function cargarHistorial() {
  document.getElementById('histLoader').style.display = 'none';
  document.getElementById('histSinDatos').classList.add('setup-hidden');
  ['histMediciones', 'histRecargas', 'histRegistroPanel', 'histDiarioPanel'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.classList.add('setup-hidden'); el.setAttribute('aria-hidden', 'true'); }
  });

  guardarEstadoTorreActual();
  const todasMediciones = recolectarMedicionesTodasInstalaciones();
  if (state.torres && state.torres.length > 1) {
    renderFiltroTorres();
  } else {
    const fw = document.getElementById('filtroTorreWrapGlobal');
    if (fw) fw.style.display = 'none';
  }

  if (todasMediciones.length === 0) {
    document.getElementById('histSinDatos').classList.remove('setup-hidden');
    return;
  }

  histDatos = todasMediciones;
  renderHistMediciones();
  renderHistRecargas();
  const hm = document.getElementById('histMediciones');
  if (hm) { hm.classList.remove('setup-hidden'); hm.setAttribute('aria-hidden', 'false'); }
}

function renderFiltroTorres() {
  const wrap = document.getElementById('filtroTorreWrapGlobal');
  const rowTodas = document.getElementById('filtroTorreBtnTodas');
  const rowInst = document.getElementById('filtroTorreBtnsInstalaciones');
  if (!wrap || !rowTodas || !rowInst || !state.torres || state.torres.length <= 1) {
    if (wrap) wrap.style.display = 'none';
    return;
  }
  wrap.style.display = 'block';
  const tAll = { id: null, nombre: 'Todas las instalaciones', emoji: '📊' };
  rowTodas.innerHTML =
    '<button type="button" onclick="setFiltroTorre(' + JSON.stringify(tAll.id) + ')" ' +
    'class="hist-torre-filter-btn hist-torre-filter-btn--todas' + (filtroTorreActivo === null ? ' active' : '') + '">' +
    (tAll.emoji || '📊') + ' ' + tAll.nombre + '</button>';
  rowInst.innerHTML = state.torres.map(t =>
    '<button type="button" onclick="setFiltroTorre(' + JSON.stringify(t.id) + ')" ' +
    'class="hist-torre-filter-btn' + (filtroTorreActivo === t.id ? ' active' : '') + '">' +
    (t.emoji || '🌿') + ' ' + t.nombre + '</button>'
  ).join('');
}

function setFiltroTorre(id) {
  filtroTorreActivo = id;
  renderFiltroTorres();
  renderHistMediciones();
  renderHistRecargas();
  renderRegistro();
  if (histTabActiva === 'diario') renderDiarioSelector();
}


function renderMiniChart(containerId, datos, min, max, color, colorBad) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = '';

  const ultimos = datos.slice(-14);
  if (ultimos.length === 0) {
    el.innerHTML = '<div class="chart-empty-msg">Sin datos</div>';
    return;
  }

  const vals = ultimos.map(d => parseFloat(d.val) || 0).filter(v => !isNaN(v));
  if (vals.length === 0) return;

  const maxVal = Math.max(...vals, max);
  const minVal = Math.min(...vals, min * 0.9);
  const rango = maxVal - minVal || 1;

  ultimos.forEach((d, i) => {
    const v = parseFloat(d.val);
    if (isNaN(v)) return;
    const pct = Math.max(4, ((v - minVal) / rango) * 100);
    const enRango = v >= min && v <= max;
    const c = enRango ? color : colorBad;
    const showDate = i === 0 || i === ultimos.length - 1 || i % 4 === 0;
    // fecha ya limpia (DD/MM)
    const fechaLabel = d.fecha ? String(d.fecha).slice(0, 5) : '';

    const col = document.createElement('div');
    col.className = 'chart-bar-col';
    col.innerHTML = `
      <div class="chart-bar-inner" style="--ch-h:${pct}%;--ch-bg:${c}"></div>
      <div class="chart-date">${showDate ? fechaLabel : ''}</div>
    `;
    el.appendChild(col);
  });
}

function getClaseVal(param, val) {
  const v = parseFloat(val);
  if (isNaN(v)) return '';
  if (param === 'ec' && typeof getDashTileClassEc === 'function') {
    const t = getDashTileClassEc(v);
    return t === 'empty' ? '' : t;
  }
  if (param === 'vol' && typeof getDashTileClassVol === 'function') {
    const t = getDashTileClassVol(v);
    return t === 'empty' ? '' : t;
  }
  const r = RANGOS[param];
  if (!r) return '';
  if (v >= r.min && v <= r.max) return 'ok';
  if (v >= r.warnLow && v <= r.warnHigh) return 'warn';
  return 'bad';
}

// Limpia un valor de Google Sheets — elimina fechas ISO, convierte a número
function limpiarVal(v) {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v).trim();
  // Si parece fecha ISO (contiene T y Z o tiene formato YYYY-MM-DD largo) → descartar
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s) && s.length === 10) return null;
  // Si es número válido → devolver número
  const n = parseFloat(s);
  if (!isNaN(n)) return n;
  // Si es texto corto (fecha legible como "15/03/2026") → devolver string
  if (s.length < 20) return s;
  return null;
}

// Formatea fecha de Google Sheets a formato legible DD/MM
function formatFecha(v) {
  if (!v) return '—';
  const s = String(v).trim();
  // Fecha ISO → convertir
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d)) return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}`;
  }
  // Fecha ISO simple
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const parts = s.split('-');
    return `${parts[2]}/${parts[1]}`;
  }
  // Ya es legible — devolver tal cual (max 10 chars)
  return s.slice(0, 10);
}

// Formatea hora
function formatHora(v) {
  if (!v) return '';
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d)) return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  }
  return s.slice(0, 5);
}

/** Rellena el registro unificado desde mediciones ya guardadas (solo si registro vacío). Incluye todas las instalaciones si hay varias. */
function importarMedicionesAlRegistro() {
  initRegistro();
  guardarEstadoTorreActual();
  const meds = recolectarMedicionesTodasInstalaciones();
  if (meds.length === 0) {
    showToast('No hay mediciones guardadas para importar', true);
    return;
  }
  if ((state.registro || []).length > 0) {
    showToast('El registro ya tiene datos. Esta acción solo aplica con registro vacío.', true);
    return;
  }
  const nInst = state.torres && state.torres.length > 1 ? state.torres.length : 1;
  const msgExtra = nInst > 1 ? ' (' + nInst + ' instalaciones)' : '';
  if (!confirm('¿Añadir ' + meds.length + ' entradas desde «Mediciones» al registro unificado' + msgExtra + '? No borra el historial de mediciones.')) return;

  const tActiva = getTorreActiva();

  for (const m of [...meds].reverse()) {
    const torreOrigen =
      m.torreId != null && Array.isArray(state.torres)
        ? state.torres.find(t => t.id === m.torreId)
        : null;
    const tO = torreOrigen || tActiva;
    const tipoInstalSnap = tipoInstalacionNormalizado(tO.config || state.configTorre || {});
    const base = {
      torreId: m.torreId != null ? m.torreId : tO.id,
      torreNombre: (m.torreNombre || tO.nombre || '').trim() || 'Instalación',
      torreEmoji: m.torreEmoji || tO.emoji || '🌿',
      tipoInstalSnap,
    };
    const notas = String(m.notas || '');
    const esRecarga = /recarga completa/i.test(notas);
    let entry;
    if (m.tipo === 'cosecha') {
      const orImp =
        typeof normalizarOrigenPlanta === 'function'
          ? normalizarOrigenPlanta(m.origenPlanta)
          : '';
      entry = {
        tipo: 'cosecha', fecha: m.fecha, hora: m.hora, ...base,
        variedad: '', notas, icono: '✂️',
        origenPlanta: orImp,
      };
    } else if (esRecarga) {
      entry = {
        tipo: 'recarga', fecha: m.fecha, hora: m.hora, ...base,
        ecFinal: m.ec || '', phFinal: m.ph || '', tempAgua: m.temp || '', volFinal: m.vol || '',
        calmagMl: '', vegaAMl: '', phMasMl: '', phMenosMl: '',
        notas, icono: '🔄',
      };
    } else {
      entry = {
        tipo: 'medicion', fecha: m.fecha, hora: m.hora, ...base,
        ec: m.ec, ph: m.ph, temp: m.temp, vol: m.vol,
        humSustrato: m.humSustrato || '', notas, icono: '📊',
      };
    }
    state.registro.unshift(entry);
  }
  if (state.registro.length > 200) state.registro = state.registro.slice(0, 200);
  saveState();
  guardarEstadoTorreActual();
  renderRegistro();
  showToast('✅ ' + meds.length + ' entradas importadas al registro');
}

function escRegistroAttr(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function escRegistroHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Miniaturas de entradas tipo «foto» cargadas desde IndexedDB */
async function hydrateRegistroFotoThumbs(container) {
  if (!container) return;
  for (const slot of container.querySelectorAll('.registro-foto-thumb')) {
    const key = slot.getAttribute('data-foto-key');
    if (!key) continue;
    try {
      const o = await leerFotoIDB(key);
      if (!o || !o.data) continue;
      const variedad = slot.getAttribute('data-variedad') || 'Planta';
      const fecha = slot.getAttribute('data-fecha') || '';
      const img = document.createElement('img');
      img.src = o.data;
      img.alt = 'Foto: ' + variedad;
      img.className = 'registro-foto-img';
      img.addEventListener('click', () => verFotoCompletaDiario(o.data, variedad, fecha));
      slot.replaceWith(img);
    } catch (_) { /* clave ausente en IDB */ }
  }
}

function renderRegistro() {
  if (typeof ensureRegistroListaDeleteDelegation === 'function') ensureRegistroListaDeleteDelegation();
  const lista   = document.getElementById('registroLista');
  const entries = recolectarRegistroTodasInstalaciones().filter(coincideFiltroTorre).slice(0, 100);
  const nMeds   = recolectarMedicionesTodasInstalaciones().length;

  if (entries.length === 0) {
    let extra = '';
    if (nMeds > 0) {
      const nInst = state.torres && state.torres.length > 1 ? state.torres.length : 0;
      const sufInst = nInst > 1 ? ' (' + nInst + ' instalaciones)' : '';
      extra =
        '<div class="registro-empty-actions">' +
        '<button type="button" onclick="importarMedicionesAlRegistro()" ' +
        'class="btn btn-primary registro-import-btn">' +
        '↓ Importar ' + nMeds + ' mediciones al registro' + sufInst + '</button>' +
        '<div class="registro-empty-help">' +
        'Útil si empezaste a medir antes de usar esta lista. Las nuevas acciones se añaden solas.' +
        (nInst > 1 ? ' Con varias instalaciones se incluyen todas las mediciones guardadas en cada una.' : '') +
        '</div></div>';
    }
    lista.innerHTML =
      '<div class="registro-empty-box">' +
      '📋 El registro agrupa mediciones, <strong>recargas completas</strong>, <strong>reposiciones parciales</strong>, <strong>apuntes</strong> (texto y números a mano), cosechas y fotos en una línea de tiempo.' +
      extra + '</div>';
    return;
  }

  const colores = {
    medicion: { bg:'#f0fdf4', border:'#16a34a', color:'#15803d',  icon:'📊' },
    recarga:  { bg:'#eff6ff', border:'#2563eb', color:'#1d4ed8',  icon:'🔄' },
    cosecha:  { bg:'#fef3c7', border:'#d97706', color:'#b45309',  icon:'✂️' },
    foto:       { bg:'#faf5ff', border:'#9333ea', color:'#7e22ce',  icon:'📸' },
    foto_sistema: { bg:'#ecfdf5', border:'#059669', color:'#047857', icon:'🏗' },
    reposicion: { bg:'#ecfeff', border:'#06b6d4', color:'#0e7490',  icon:'💧' },
    apunte: { bg:'#f5f3ff', border:'#7c3aed', color:'#5b21b6', icon:'📝' },
  };

  // Agrupar por fecha
  const porFecha = {};
  entries.forEach(e => {
    const key = e.fecha || '—';
    if (!porFecha[key]) porFecha[key] = [];
    porFecha[key].push(e);
  });

  lista.innerHTML = Object.entries(porFecha).map(([fecha, evs]) => {
    const cols = evs.map(e => {
      const c = colores[e.tipo] || { bg:'#f8fafc', border:'#94a3b8', color:'#475569', icon:'📌' };
      const badgeIcon = (e.tipo === 'reposicion' && e.icono) ? e.icono : c.icon;
      const sis = infoSistemaEntrada(e);
      let detalle = '';
      if (e.tipo === 'medicion') {
        detalle = [
          e.ec   ? '⚡ ' + e.ec + ' µS' : '',
          e.ph   ? '🧪 ' + e.ph         : '',
          e.temp ? '🌡️ ' + e.temp + '°C'  : '',
          e.vol  ? '🪣 ' + e.vol + 'L'   : '',
        ].filter(Boolean).join(' · ');
        if (e.notas) detalle += '<br><span class="registro-note-sub">📝 ' + e.notas + '</span>';
      } else if (e.tipo === 'recarga') {
        detalle = [
          e.ecFinal  ? '⚡ EC final: ' + e.ecFinal + ' µS' : '',
          e.phFinal  ? '🧪 pH: ' + e.phFinal              : '',
          e.calmagMl ? '💊 CalMag: ' + e.calmagMl + 'ml'   : '',
          e.vegaAMl  ? '🌿 ' + [e.vegaAMl, e.vegaBMl, e.vegaCMl].filter(x => x != null && String(x).trim() !== '').join(' + ') + ' ml' : '',
          (e.phMasMl != null && String(e.phMasMl).trim() !== '') ? '⬆️ pH+: ' + e.phMasMl + ' ml' : '',
          (e.phMenosMl != null && String(e.phMenosMl).trim() !== '') ? '⬇️ pH−: ' + e.phMenosMl + ' ml' : '',
        ].filter(Boolean).join(' · ');
        if (e.notas) detalle += '<br><span class="registro-note-sub">📝 ' + e.notas + '</span>';
      } else if (e.tipo === 'cosecha') {
        detalle = e.variedad || '';
        const ubiC = formatoUbicacionEnRegistro(tipoInstalParaEntradaRegistro(e), e.nivel, e.cesta);
        if (ubiC) detalle += ' · ' + ubiC;
        if (e.fechaSiembra) detalle += ' · 🌱 ' + e.fechaSiembra;
        if (e.diasCultivo) detalle += ' · ' + e.diasCultivo + ' días';
        if (typeof etiquetaOrigenPlantaBreve === 'function') {
          const orL = etiquetaOrigenPlantaBreve(e.origenPlanta);
          if (orL) detalle += ' · ' + orL;
        }
        if (e.notas) detalle += '<br><span class="registro-note-sub">📝 ' + e.notas + '</span>';
      } else if (e.tipo === 'foto_sistema') {
        detalle = 'Vista completa de la instalación';
        if (e.fotoFecha) detalle += ' · 📅 ' + e.fotoFecha;
        if (e.fotoKey) {
          detalle +=
            '<div class="registro-foto-thumb" data-foto-key="' + escRegistroAttr(e.fotoKey) + '" ' +
            'data-variedad="' + escRegistroAttr('Vista del sistema') + '" ' +
            'data-fecha="' + escRegistroAttr(e.fotoFecha || e.fecha || '') + '" ' +
            'class="registro-foto-thumb registro-foto-thumb--placeholder">🏗</div>';
        }
      } else if (e.tipo === 'foto') {
        detalle = (e.variedad || 'Planta');
        if (e.nivel != null && e.cesta != null) {
          const ubiF = formatoUbicacionEnRegistro(tipoInstalParaEntradaRegistro(e), e.nivel, e.cesta);
          if (ubiF) detalle += ' · ' + ubiF;
        }
        if (e.diasCultivo != null && e.diasCultivo !== '') detalle += ' · día ' + e.diasCultivo;
        if (e.fotoFecha) detalle += ' · 📅 ' + e.fotoFecha;
        if (e.fotoKey) {
          detalle +=
            '<div class="registro-foto-thumb" data-foto-key="' + escRegistroAttr(e.fotoKey) + '" ' +
            'data-variedad="' + escRegistroAttr(e.variedad || 'Planta') + '" ' +
            'data-fecha="' + escRegistroAttr(e.fotoFecha || e.fecha || '') + '" ' +
            'class="registro-foto-thumb registro-foto-thumb--placeholder">📸</div>';
        }
      } else if (e.tipo === 'reposicion') {
        const Lnum = typeof e.litros === 'number' ? e.litros : parseFloat(e.litros);
        const Ltxt = isFinite(Lnum) && Lnum > 0 ? '<strong>🪣 +' + Lnum + ' L</strong> añadidos. ' : '';
        if (e.modo === 'solo_agua') {
          detalle = Ltxt + 'Reposición parcial: solo agua (sin vaciar). Mantiene nivel para plantas, bomba y calefactor sumergidos. No es recarga completa — conviene medir volumen total y EC/pH al medir.';
        } else if (e.modo === 'parcial_nutrientes') {
          detalle = Ltxt + 'Reposición parcial: agua + nutrientes sin vaciar. Mismo objetivo de nivel mínimo; no reinicia el ciclo de recarga completa — mide EC/pH cuando puedas.';
        } else {
          detalle = (Ltxt || '') + (e.notas || 'Reposición registrada');
        }
      } else if (e.tipo === 'apunte') {
        const bloques = [];
        const esSugerencia = e.apunteTipo === 'sugerencia_correccion';
        const estadoSug = String(e.sugerenciaEstado || 'sugerido').toLowerCase();
        if (esSugerencia) {
          const slotSug = typeof e._slotIdx === 'number' ? e._slotIdx : (state.torreActiva || 0);
          const titleSug = escRegistroHtml(e.sugerenciaTitulo || 'Correcciones sugeridas');
          const chipTxt = estadoSug === 'aplicado' ? '✅ Aplicado' : '🧭 Sugerido';
          bloques.push(
            '<div class="registro-sugerencia-head">' +
              '<span class="registro-sugerencia-chip ' + (estadoSug === 'aplicado' ? 'is-aplicado' : 'is-sugerido') + '">' + chipTxt + '</span>' +
              '<strong class="registro-sugerencia-title">' + titleSug + '</strong>' +
            '</div>'
          );
          if (estadoSug !== 'aplicado') {
            bloques.push(
              '<button type="button" class="registro-sugerencia-apply js-reg-sug-apply" ' +
                'data-hc-slot="' + slotSug + '" ' +
                'data-hc-fecha="' + escRegistroAttr(e.fecha || '') + '" ' +
                'data-hc-hora="' + escRegistroAttr(e.hora || '') + '" ' +
                'data-hc-sug-id="' + escRegistroAttr(e.sugerenciaId || '') + '" ' +
                'aria-label="Marcar sugerencia como aplicada">' +
                'Marcar como aplicada' +
              '</button>'
            );
          }
        }
        if (e.apunteTexto) {
          bloques.push(
            '<div class="registro-apunte-txt">' +
              escRegistroHtml(e.apunteTexto).replace(/\r\n|\n|\r/g, '<br>') +
              '</div>'
          );
        }
        const bits = [];
        if (e.ec) bits.push('⚡ ' + escRegistroHtml(e.ec) + ' µS/cm');
        if (e.ph) bits.push('🧪 pH ' + escRegistroHtml(e.ph));
        if (e.temp) bits.push('🌡️ ' + escRegistroHtml(e.temp) + ' °C');
        if (e.vol) bits.push('🪣 ' + escRegistroHtml(e.vol) + ' L');
        if (bits.length) bloques.push('<div class="registro-apunte-nums">' + bits.join(' · ') + '</div>');
        if (e.apunteEtiqueta1 && e.apunteValor1) {
          bloques.push(
            '<div class="registro-apunte-extra"><strong>' +
              escRegistroHtml(e.apunteEtiqueta1) +
              '</strong>: ' +
              escRegistroHtml(e.apunteValor1) +
              '</div>'
          );
        }
        detalle = bloques.length ? bloques.join('') : '<span class="registro-note-sub">(sin detalle)</span>';
      }
      const slotIdx = typeof e._slotIdx === 'number' ? e._slotIdx : (state.torreActiva || 0);
      const tipoDel = e.tipo == null || e.tipo === '' ? 'medicion' : String(e.tipo);
      return '<div class="registro-entry-card" style="--reg-bg:' + c.bg + ';--reg-bd:' + c.border + ';--reg-badge:' + c.color + '">' +
        '<div class="registro-entry-head">' +
          '<div class="registro-entry-left">' +
            '<span class="registro-entry-badge">' +
              badgeIcon + ' ' +
              (e.tipo === 'foto_sistema'
                ? 'Foto sistema'
                : e.tipo === 'foto'
                  ? 'Foto'
                  : e.tipo === 'reposicion'
                    ? 'Reposición parcial'
                    : e.tipo === 'recarga'
                      ? 'Recarga completa'
                      : e.tipo === 'apunte'
                        ? 'Apunte'
                        : (String(e.tipo || 'medicion').charAt(0).toUpperCase() + String(e.tipo || 'medicion').slice(1))) +
            '</span>' +
            (sis && sis.nombre ?
              '<span class="registro-entry-torre-chip">' +
              (sis.emoji||'🌿') + ' ' + sis.nombre + '</span>' : '') +
          '</div>' +
          '<div class="registro-entry-right">' +
            '<span class="registro-entry-time">' + (e.hora||'') + '</span>' +
            '<button type="button" class="registro-entry-delete" ' +
              'data-hc-slot="' + slotIdx + '" ' +
              'data-hc-fecha="' + escRegistroAttr(e.fecha || '') + '" ' +
              'data-hc-hora="' + escRegistroAttr(e.hora || '') + '" ' +
              'data-hc-tipo="' + escRegistroAttr(tipoDel) + '" ' +
              'title="Borrar entrada" aria-label="Borrar entrada">🗑</button>' +
          '</div>' +
        '</div>' +
        '<div class="registro-entry-detail">' + detalle + '</div>' +
        '</div>';
    }).join('');

    return '<div class="registro-dia-wrap">' +
      '<div class="registro-dia-title">' + fecha + '</div>' +
      cols + '</div>';
  }).join('');
  void hydrateRegistroFotoThumbs(lista);
}


function renderHistMediciones() {
  if (typeof ensureHistMedicionesDeleteDelegation === 'function') ensureHistMedicionesDeleteDelegation();
  // Aplicar filtro por torre si está activo
  let mediciones = histDatos || state.mediciones || [];
  if (filtroTorreActivo !== null) {
    mediciones = mediciones.filter(coincideFiltroTorre);
  }
  mediciones = mediciones.slice(0, 20);
  if (mediciones.length === 0) {
    document.getElementById('histSinDatos').classList.remove('setup-hidden');
    return;
  }

  // Actualizar valores actuales (primera = más reciente)
  const ult = mediciones[0];
  document.getElementById('histECActual').textContent   = ult.ec   || '—';
  document.getElementById('histPHActual').textContent   = ult.ph   || '—';
  document.getElementById('histTempActual').textContent = ult.temp || '—';
  document.getElementById('histVolActual').textContent  = ult.vol  || '—';

  // Tabla
  const tabla = document.getElementById('histTabla');
    tabla.innerHTML = mediciones.map((m, i) => `
    <div class="hist-row${i===0 ? ' hist-row--latest' : ''}">
      <span class="hist-fecha"><span class="hist-fecha-dia">${m.fecha}</span><br>
        <span class="hist-fecha-hora">${m.hora}</span>
        ${(() => { const sis = infoSistemaEntrada(m); return `<span class="hist-torre-chip">${sis.emoji||'🌿'} ${sis.nombre}</span>`; })()}
      </span>
      <span class="hist-val ${getClaseVal('ec',   m.ec)}">${m.ec   || '—'}</span>
      <span class="hist-val ${getClaseVal('ph',   m.ph)}">${m.ph   || '—'}</span>
      <span class="hist-val ${getClaseVal('temp', m.temp)}">${m.temp || '—'}</span>
      <span class="hist-val ${getClaseVal('vol',  m.vol)}">${m.vol  || '—'}</span>
      <span class="hist-action-cell">
        <button type="button" class="hist-btn-delete js-hist-med-del"
          data-hc-fecha="${escRegistroAttr(m.fecha || '')}"
          data-hc-hora="${escRegistroAttr(m.hora || '')}"
          data-hc-torre-id="${escRegistroAttr(m.torreId == null ? '' : String(m.torreId))}"
          aria-label="Borrar esta medición">🗑</button>
      </span>
      ${m.notas ? `<span class="hist-val hist-note-line">📝 ${m.notas}</span>` : ''}
    </div>
  `).join('');
}


function renderHistRecargas() {
  // Mostrar recargas locales (siempre disponibles)
  const localSection = document.getElementById('recargasLocalSection');
  const recargasConIdx = (state.recargasLocal || [])
    .map((r, idx) => ({ r, idx }))
    .filter(x => coincideFiltroTorre(x.r));
  const recargas = recargasConIdx.map(x => x.r);

  if (recargas.length === 0 && (!histRecargasDatos || histRecargasDatos.length === 0)) {
    if (localSection) localSection.innerHTML =
      '<div class="hist-recargas-empty">' +
      '🔄 Sin recargas registradas aún.<br>Completa el checklist de recarga para ver el historial.</div>';
    return;
  }

  // Recargas locales — tarjetas detalladas
  if (localSection && recargas.length > 0) {
    localSection.innerHTML = recargasConIdx.slice(0, 10).map((it, i) => {
      const r = it.r;
      const globalIdx = it.idx;
      const sis = infoSistemaEntrada(r);
      return `
      <div class="hist-recarga-card">
        <!-- Cabecera -->
        <div class="hist-recarga-head">
          <div>
            <div class="hist-recarga-title">
              🔄 Recarga #${recargas.length - i}
            </div>
            <div class="hist-recarga-date">${r.fecha} · ${r.hora}</div>
            <div class="hist-recarga-nutriente">${sis.emoji || '🌿'} ${sis.nombre}</div>
            ${r.nutrienteNombre ? '<div class="hist-recarga-nutriente">🧪 ' + r.nutrienteNombre + '</div>' : ''}
            ${(r.cambioNutriente === 'sí' || (r.nutrientePrevioNombre && r.nutrienteNombre))
              ? ('<div class="hist-recarga-nutriente">🔁 Cambio nutriente: ' +
                (r.nutrientePrevioNombre || 'anterior') + ' → ' + (r.nutrienteNombre || 'nuevo') +
                '</div>')
              : ''}
          </div>
          <div class="hist-action-cell">
            ${r.ecFinal ? '<div class="hist-recarga-ec">' + r.ecFinal + '<span class="hist-recarga-ec-unit"> µS</span></div>' : ''}
            <button onclick="borrarRecargaLocal(${globalIdx})"
              class="hist-btn-delete" aria-label="Borrar esta recarga">🗑</button>
          </div>
        </div>

        <!-- Grid parámetros -->
        <div class="hist-recarga-grid">
          <div class="hist-recarga-cell">
            <div class="hist-recarga-cell-lab">CalMag</div>
            <div class="hist-recarga-cell-val hist-recarga-cell-val--green">${r.calmagMl || '—'}<span class="hist-recarga-cell-unit">ml</span></div>
          </div>
          <div class="hist-recarga-cell">
            <div class="hist-recarga-cell-lab">Abono</div>
            <div class="hist-recarga-cell-val hist-recarga-cell-val--blue hist-recarga-cell-val--abono">${[r.vegaAMl, r.vegaBMl, r.vegaCMl].filter(x => x != null && String(x).trim() !== '').join(' + ') || '—'}<span class="hist-recarga-cell-unit">ml</span></div>
          </div>
          <div class="hist-recarga-cell">
            <div class="hist-recarga-cell-lab">pH+</div>
            <div class="hist-recarga-cell-val hist-recarga-cell-val--gold">${r.phMasMl || '—'}<span class="hist-recarga-cell-unit">ml</span></div>
          </div>
          <div class="hist-recarga-cell">
            <div class="hist-recarga-cell-lab">pH−</div>
            <div class="hist-recarga-cell-val hist-recarga-cell-val--sky">${r.phMenosMl || '—'}<span class="hist-recarga-cell-unit">ml</span></div>
          </div>
          <div class="hist-recarga-cell">
            <div class="hist-recarga-cell-lab">pH final</div>
            <div class="hist-recarga-cell-val hist-recarga-cell-val--blue">${r.phFinal || '—'}</div>
          </div>
        </div>

        <!-- Observaciones si las hay -->
        ${r.colorAgua || r.estadoPlantas ? `
        <div class="hist-recarga-obs">
          ${r.colorAgua ? '🎨 Agua: ' + r.colorAgua + ' · ' : ''}
          ${r.estadoPlantas ? '🌿 Plantas: ' + r.estadoPlantas : ''}
        </div>` : ''}
      </div>
    `;
    }).join('');
  }

  // Recargas de Sheets si disponibles (solo vista global; no trae torreId fiable para filtrar)
  if (histRecargasDatos && histRecargasDatos.length > 0 && filtroTorreActivo == null) {
    const sheetsSection = document.getElementById('sheetsRecargasSection');
    if (sheetsSection) {
      sheetsSection.classList.remove('setup-hidden');
      const tabla = document.getElementById('histRecargasTabla');
      tabla.innerHTML = histRecargasDatos.slice(-10).reverse().map(r => {
        const fecha  = formatFecha(r[0]);
        const ec     = limpiarVal(r[1]);
        const ph     = limpiarVal(r[2]);
        const calmag = limpiarVal(r[4]);
        const phmas  = limpiarVal(r[7]);
        return '<div class="hist-row hist-row--recargas-sheets">' +
          '<span class="hist-fecha">' + fecha + '</span>' +
          '<span class="hist-val ' + getClaseVal('ec', ec) + '">' + (ec !== null ? ec : '—') + '</span>' +
          '<span class="hist-val ' + getClaseVal('ph', ph) + '">' + (ph !== null ? ph : '—') + '</span>' +
          '<span class="hist-val hist-val--green">' + (calmag !== null ? calmag+'ml' : '—') + '</span>' +
          '<span class="hist-val hist-val--muted">' + (phmas !== null ? phmas+'ml' : '0ml') + '</span>' +
          '</div>';
      }).join('');
    }
  } else {
    const sheetsSection = document.getElementById('sheetsRecargasSection');
    if (sheetsSection) sheetsSection.classList.add('setup-hidden');
  }
}



