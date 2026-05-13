/** Borrar entradas del historial. Tras hc-setup-diario-fotos.js. */
// ══════════════════════════════════════════════════
// BORRAR ENTRADAS DEL HISTORIAL
// ══════════════════════════════════════════════════

/** DD/MM/AAAA estable para comparar fechas de registro aunque vengan con o sin ceros a la izquierda. */
function normalizarFechaRegistroDdMmYyyy(s) {
  const raw = String(s ?? '').trim();
  if (!raw) return '';
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (iso) {
    const y = parseInt(iso[1], 10);
    const m = parseInt(iso[2], 10);
    const d = parseInt(iso[3], 10);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return raw;
    return [String(d).padStart(2, '0'), String(m).padStart(2, '0'), String(y)].join('/');
  }
  const p = raw.split('/');
  if (p.length !== 3) return raw;
  const d = parseInt(p[0], 10);
  const m = parseInt(p[1], 10);
  const y = parseInt(p[2], 10);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return raw;
  return [String(d).padStart(2, '0'), String(m).padStart(2, '0'), String(y)].join('/');
}

function horasCoincidenRegistro(hA, hB) {
  const a = String(hA ?? '').trim();
  const b = String(hB ?? '').trim();
  if (a === b) return true;
  return a.slice(0, 5) === b.slice(0, 5);
}

function normalizarTipoRegistroBorrado(t) {
  const s = String(t ?? '').trim().toLowerCase();
  if (!s) return 'medicion';
  return s;
}

function buscarIndiceRegistroEnTorre(registroArr, fecha, hora, tipoQ) {
  if (!Array.isArray(registroArr)) return -1;
  const fechaN = normalizarFechaRegistroDdMmYyyy(fecha);
  const fechaRaw = String(fecha || '').trim();
  const tipoNorm = normalizarTipoRegistroBorrado(tipoQ);
  return registroArr.findIndex(r => {
    if (!r) return false;
    const tipoR = normalizarTipoRegistroBorrado(r.tipo);
    if (tipoR !== tipoNorm) return false;
    const rfN = normalizarFechaRegistroDdMmYyyy(r.fecha);
    if (rfN !== fechaN && String(r.fecha || '').trim() !== fechaRaw) return false;
    return horasCoincidenRegistro(r.hora, hora);
  });
}

/**
 * Borrado desde el botón papelera (Historial → Registro).
 * Usa onclick en el propio botón para que `this` sea siempre el botón
 * (un clic en el emoji puede dar event.target = nodo texto sin .closest()).
 */
function borrarRegistroHistorialDesdeBtn(btn) {
  if (!btn) return;
  const slot = parseInt(String(btn.getAttribute('data-hc-slot') ?? ''), 10);
  if (!Number.isFinite(slot) || slot < 0) return;
  const fecha = btn.getAttribute('data-hc-fecha') || '';
  const hora = btn.getAttribute('data-hc-hora') || '';
  const tipo = btn.getAttribute('data-hc-tipo') || 'medicion';
  initTorres();
  if (!state.torres || slot >= state.torres.length) {
    if (typeof showToast === 'function') showToast('No se encontró la instalación', true);
    return;
  }
  borrarEntradaRegistroDesdeHistorial(slot, fecha, hora, tipo, false, false, false);
}

/** Un solo listener en #registroLista: sobrevive a innerHTML y encuentra el botón con closest (emoji / SVG). */
function ensureRegistroListaDeleteDelegation() {
  const lista = document.getElementById('registroLista');
  if (!lista || lista.dataset.hcRegDelBound === '1') return;
  lista.dataset.hcRegDelBound = '1';
  lista.addEventListener('click', function hcRegistroListaDelEv(ev) {
    const raw = ev.target;
    const applyBtn = raw && typeof raw.closest === 'function' ? raw.closest('button.js-reg-sug-apply') : null;
    if (applyBtn && lista.contains(applyBtn)) {
      ev.preventDefault();
      ev.stopPropagation();
      marcarSugerenciaRegistroAplicadaDesdeBtn(applyBtn);
      return;
    }
    const btn = raw && typeof raw.closest === 'function' ? raw.closest('button.registro-entry-delete') : null;
    if (!btn || !lista.contains(btn)) return;
    ev.preventDefault();
    ev.stopPropagation();
    borrarRegistroHistorialDesdeBtn(btn);
  });
}

function marcarSugerenciaRegistroAplicadaDesdeBtn(btn) {
  if (!btn) return;
  initTorres();
  const slot = parseInt(String(btn.getAttribute('data-hc-slot') ?? ''), 10);
  const fecha = String(btn.getAttribute('data-hc-fecha') || '');
  const hora = String(btn.getAttribute('data-hc-hora') || '');
  const sugId = String(btn.getAttribute('data-hc-sug-id') || '');
  const slotBase = Number.isFinite(slot) && slot >= 0 ? slot : (state.torreActiva || 0);

  const isMatch = (r) => {
    if (!r || r.tipo !== 'apunte' || r.apunteTipo !== 'sugerencia_correccion') return false;
    if (sugId && String(r.sugerenciaId || '') === sugId) return true;
    const mismaFecha = normalizarFechaRegistroDdMmYyyy(r.fecha) === normalizarFechaRegistroDdMmYyyy(fecha);
    const mismaHora = horasCoincidenRegistro(r.hora, hora);
    return mismaFecha && mismaHora;
  };

  let t = state.torres[slotBase];
  let i = t && Array.isArray(t.registro) ? t.registro.findIndex(isMatch) : -1;
  let slotUsed = slotBase;
  if (i < 0) {
    for (let s = 0; s < (state.torres || []).length; s++) {
      const ts = state.torres[s];
      if (!ts || !Array.isArray(ts.registro)) continue;
      const ix = ts.registro.findIndex(isMatch);
      if (ix >= 0) {
        t = ts;
        i = ix;
        slotUsed = s;
        break;
      }
    }
  }
  if (!t || i < 0) {
    if (typeof showToast === 'function') showToast('No se encontró la sugerencia', true);
    return;
  }
  const r = t.registro[i];
  r.sugerenciaEstado = 'aplicado';
  const prev = String(r.apunteTexto || '');
  if (prev.indexOf('✅ Aplicada') === -1) {
    r.apunteTexto = '✅ Aplicada · ' + prev;
  }
  if ((state.torreActiva || 0) === slotUsed) state.registro = t.registro;
  try { guardarEstadoTorreActual(); } catch (_) {}
  saveState();
  renderRegistro();
  if (typeof showToast === 'function') showToast('✅ Sugerencia marcada como aplicada');
}

if (typeof window !== 'undefined') {
  window.borrarRegistroHistorialDesdeBtn = borrarRegistroHistorialDesdeBtn;
  window.ensureRegistroListaDeleteDelegation = ensureRegistroListaDeleteDelegation;
  window.marcarSugerenciaRegistroAplicadaDesdeBtn = marcarSugerenciaRegistroAplicadaDesdeBtn;
}

/** Delegación para Historial → Mediciones (evita onclick inline frágil en móvil). */
function ensureHistMedicionesDeleteDelegation() {
  const tabla = document.getElementById('histTabla');
  if (!tabla || tabla.dataset.hcHistMedDelBound === '1') return;
  tabla.dataset.hcHistMedDelBound = '1';
  tabla.addEventListener('click', function hcHistMedDelEv(ev) {
    const raw = ev.target;
    const btn = raw && typeof raw.closest === 'function' ? raw.closest('button.js-hist-med-del') : null;
    if (!btn || !tabla.contains(btn)) return;
    ev.preventDefault();
    ev.stopPropagation();
    const fecha = btn.getAttribute('data-hc-fecha') || '';
    const hora = btn.getAttribute('data-hc-hora') || '';
    const torreRaw = btn.getAttribute('data-hc-torre-id');
    const torreId = torreRaw == null || torreRaw === '' ? null : torreRaw;
    borrarMedicion(fecha, hora, torreId);
  });
}

if (typeof window !== 'undefined') {
  window.ensureHistMedicionesDeleteDelegation = ensureHistMedicionesDeleteDelegation;
}

function borrarMedicion(fecha, hora, torreId) {
  if (!confirm('¿Borrar esta entrada del historial?')) return;
  initTorres();
  const hhmm = String(hora || '').slice(0, 5);
  const matchMed = (m) => {
    if (!m || m.fecha !== fecha) return false;
    const mh = String(m.hora || '');
    return mh === String(hora || '') || mh.slice(0, 5) === hhmm;
  };
  let slot = state.torres.findIndex(t => t && String(t.id) === String(torreId));
  if (slot < 0) slot = state.torreActiva || 0;
  let t = state.torres[slot];
  let i = t && Array.isArray(t.mediciones) ? t.mediciones.findIndex(matchMed) : -1;
  // Fallback robusto: buscar en cualquier instalación si no aparece en el slot esperado.
  if (i < 0) {
    for (let s = 0; s < (state.torres || []).length; s++) {
      const ts = state.torres[s];
      if (!ts || !Array.isArray(ts.mediciones)) continue;
      const ix = ts.mediciones.findIndex(matchMed);
      if (ix >= 0) {
        slot = s;
        t = ts;
        i = ix;
        break;
      }
    }
  }
  if (!t || !Array.isArray(t.mediciones)) {
    showToast('No se encontró la instalación', true);
    return;
  }
  if (i < 0) {
    showToast('No se encontró el dato', true);
    return;
  }
  const row = t.mediciones[i];
  const torreNombreBorrada = (t && t.nombre ? String(t.nombre).trim() : '') || 'Instalación';
  const tipoReg = (function inferTipoRegBorradoMedicion(r) {
    if (!r) return 'medicion';
    if (r.tipo === 'cosecha') return 'cosecha';
    if (r.tipo === 'reposicion') return 'reposicion';
    if (r.tipo === 'recarga') return 'recarga';
    if (String(r.notas || '').indexOf('Recarga completa') >= 0) return 'recarga';
    return 'medicion';
  })(row);

  borrarEntradaRegistroDesdeHistorial(slot, fecha, hora, tipoReg, true, true, true);

  t.mediciones.splice(i, 1);
  const um0 = t.mediciones.find(m => m && (m.tipo === 'medicion' || !m.tipo || m.tipo === ''));
  let ult = null;
  if (um0) {
    ult = {
      fecha: um0.fecha,
      hora: um0.hora,
      ec: um0.ec,
      ph: um0.ph,
      temp: um0.temp,
      vol: um0.vol,
      humSustrato: um0.humSustrato,
    };
  }
  t.ultimaMedicion = ult;
  if ((state.torreActiva || 0) === slot) {
    state.mediciones = t.mediciones;
    state.ultimaMedicion = ult ? { ...ult } : null;
  }
  // Refrescar caché agregada de historial (si no, la fila borrada puede seguir visible).
  if (typeof recolectarMedicionesTodasInstalaciones === 'function') {
    histDatos = recolectarMedicionesTodasInstalaciones();
  } else {
    histDatos = state.mediciones || [];
  }
  saveState();
  renderHistMediciones();
  if (document.getElementById('tab-inicio')?.classList.contains('active')) updateDashboard();
  showToast('🗑 Entrada borrada · ' + torreNombreBorrada);
}

/** Borrado desde lista agregada del historial (multi-torre). */
function borrarEntradaRegistroDesdeHistorial(slotIdx, fecha, hora, tipo, skipConfirm, suppressToast, silentOnMissing) {
  if (!skipConfirm && !confirm('¿Borrar esta entrada del registro?')) return false;
  initTorres();
  /** No llamar guardarEstadoTorreActual() antes del findIndex: copia state.registro → slot activo. */
  let t = state.torres[slotIdx];
  if (!t) {
    if (!silentOnMissing) showToast('No se encontró la instalación', true);
    return false;
  }
  /**
   * Instalación única: alinear `state.registro` y `state.torres[slot].registro` (la UI usa uno
   * y el findIndex el otro; si solo uno tiene filas, unificamos referencias sin machacar con []).
   */
  if ((state.torreActiva || 0) === slotIdx) {
    const g = Array.isArray(state.registro) ? state.registro : [];
    const s = Array.isArray(t.registro) ? t.registro : [];
    if (g.length > 0) {
      t.registro = g;
    } else if (s.length > 0) {
      state.registro = s;
      t.registro = s;
    } else {
      t.registro = [];
      if (!Array.isArray(state.registro)) state.registro = t.registro;
    }
  } else if (!Array.isArray(t.registro)) {
    t.registro = [];
  }
  const tipoQ = tipo == null || tipo === '' ? 'medicion' : String(tipo);
  let slotUsed = slotIdx;
  let i = buscarIndiceRegistroEnTorre(t.registro, fecha, hora, tipoQ);
  if (i < 0 && Array.isArray(state.torres)) {
    for (let s = 0; s < state.torres.length; s++) {
      if (s === slotIdx) continue;
      const t2 = state.torres[s];
      if (!t2) continue;
      if (!Array.isArray(t2.registro)) continue;
      const j = buscarIndiceRegistroEnTorre(t2.registro, fecha, hora, tipoQ);
      if (j >= 0) {
        t = t2;
        slotUsed = s;
        i = j;
        break;
      }
    }
  }
  if (i < 0) {
    if (!silentOnMissing) showToast('No se encontró la entrada', true);
    return false;
  }
  const entry = t.registro[i];
  if (entry && entry.tipo === 'foto_sistema' && entry.fotoKey) {
    void borrarFotoIDB(entry.fotoKey);
    ensureFotosSistemaCompletoState();
    const k = entry.fotoKey;
    state.fotosSistemaCompleto.fotoKeys = (state.fotosSistemaCompleto.fotoKeys || []).filter(x => x !== k);
    state.fotosSistemaCompleto.fotos = (state.fotosSistemaCompleto.fotos || []).filter(f => !f || f.key !== k);
  }
  t.registro.splice(i, 1);
  if ((state.torreActiva || 0) === slotUsed) state.registro = t.registro;
  try { guardarEstadoTorreActual(); } catch (_) {}
  saveState();
  renderRegistro();
  const diarioPanel = document.getElementById('histDiarioPanel');
  if (diarioPanel && !diarioPanel.classList.contains('setup-hidden')) renderDiarioBloqueSistema();
  if (document.getElementById('tab-mediciones')?.classList.contains('active') && typeof actualizarResumenReposicionParcialUI === 'function') {
    actualizarResumenReposicionParcialUI();
  }
  if (!suppressToast) showToast('🗑 Entrada borrada');
  return true;
}

function borrarEntradaRegistro(idx) {
  if (!confirm('¿Borrar esta entrada del registro?')) return;
  if (!state.registro) return;
  const entry = state.registro[idx];
  if (!entry) return;
  borrarEntradaRegistroDesdeHistorial(
    state.torreActiva || 0,
    entry.fecha,
    entry.hora,
    entry.tipo,
    true,
    false,
    false
  );
}

function borrarRecargaLocal(idx) {
  if (!confirm('¿Borrar esta recarga?')) return;
  if (!Array.isArray(state.recargasLocal) || idx < 0 || idx >= state.recargasLocal.length) return;

  const borrada = state.recargasLocal[idx];
  state.recargasLocal.splice(idx, 1);

  // Si se borra la última recarga de la instalación activa, recalcular marcador.
  try {
    const tAct = getTorreActiva();
    const tIdAct = tAct && tAct.id != null ? tAct.id : (state.torreActiva || 0);
    const bId = borrada && (borrada.torreId != null ? borrada.torreId : null);
    const mismaTorre = bId == null || String(bId) === String(tIdAct);
    if (mismaTorre) {
      const fechaIsoBorrada = (borrada && typeof borrada.fecha === 'string' && borrada.fecha.includes('/'))
        ? borrada.fecha.split('/').reverse().join('-')
        : null;
      if (fechaIsoBorrada && state.ultimaRecarga === fechaIsoBorrada) {
        const restantes = (state.recargasLocal || []).filter(r => {
          const rid = r && (r.torreId != null ? r.torreId : null);
          return rid == null || String(rid) === String(tIdAct);
        });
        if (!restantes.length) {
          state.ultimaRecarga = null;
        } else {
          const toTs = (r) => {
            if (!r || typeof r.fecha !== 'string') return 0;
            const p = r.fecha.split('/');
            if (p.length !== 3) return 0;
            const d = parseInt(p[0], 10);
            const m = parseInt(p[1], 10) - 1;
            const y = parseInt(p[2], 10);
            if (!y || m < 0 || m > 11 || d < 1 || d > 31) return 0;
            const hm = String(r.hora || '').split(':');
            const hh = Math.max(0, Math.min(23, parseInt(hm[0], 10) || 0));
            const mm = Math.max(0, Math.min(59, parseInt(hm[1], 10) || 0));
            return new Date(y, m, d, hh, mm, 0, 0).getTime();
          };
          const recReciente = restantes.slice().sort((a, b) => toTs(b) - toTs(a))[0];
          const p = String(recReciente.fecha || '').split('/');
          state.ultimaRecarga = p.length === 3 ? [p[2], p[1], p[0]].join('-') : state.ultimaRecarga;
        }
      }
    }
  } catch (_) {}

  saveState();
  renderHistRecargas();
  if (typeof renderRegistro === 'function' && histTabActiva === 'registro') renderRegistro();
  if (document.getElementById('tab-mediciones')?.classList.contains('active')) {
    try { updateRecargaBar(); } catch (_) {}
  }
  showToast('🗑 Recarga borrada');
}


