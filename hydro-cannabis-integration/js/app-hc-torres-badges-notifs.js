/**
 * Multi-torre (initTorres, …), badges nutriente, notificaciones locales.
 * Tras app-hc-setup-onboarding.js. Siguiente: app-hc-pwa-fotodb.js.
 */
// ══════════════════════════════════════════════════
// SISTEMA MULTI-TORRE
// ══════════════════════════════════════════════════

const MAX_TORRES = 10;

function hcClonePlainData(value, fallback = null) {
  if (value == null) return fallback;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_) {
    return fallback;
  }
}

function hcEtiquetaTipoInstalacion(tipo) {
  if (tipo === 'nft') return 'NFT';
  if (tipo === 'dwc') return 'DWC';
  if (tipo === 'rdwc') return 'RDWC';
  return 'torre vertical';
}

function hcNormalizarConfigSegunTipo(cfg) {
  const c = hcClonePlainData(cfg, {}) || {};
  const tipo = tipoInstalacionNormalizado(c);
  const prefixes = [
    { tipo: 'nft', prefijo: 'nft' },
    { tipo: 'dwc', prefijo: 'dwc' },
    { tipo: 'rdwc', prefijo: 'rdwc' },
  ];
  const removedKeys = [];
  prefixes.forEach(rule => {
    if (rule.tipo === tipo) return;
    Object.keys(c).forEach(k => {
      if (!k || !k.startsWith(rule.prefijo)) return;
      if (c[k] == null || c[k] === '') {
        delete c[k];
        return;
      }
      removedKeys.push(k);
      delete c[k];
    });
  });
  return { tipo, config: c, removedKeys };
}

function hcEvaluarIntegridadGuardadoInstalacion(slot, candidateCfg) {
  const normalized = hcNormalizarConfigSegunTipo(candidateCfg);
  const prevCfg = slot && slot.config && typeof slot.config === 'object' ? slot.config : null;
  const prevTipo =
    prevCfg && prevCfg.tipoInstalacion
      ? tipoInstalacionNormalizado(prevCfg)
      : '';
  const nextTipo =
    normalized.config && normalized.config.tipoInstalacion
      ? tipoInstalacionNormalizado(normalized.config)
      : normalized.tipo;
  const prevConfirmada = !!(prevCfg && prevCfg.checklistInstalacionConfirmada === true);
  const blocked =
    !!(
      prevTipo &&
      nextTipo &&
      prevTipo !== nextTipo &&
      prevConfirmada
    );
  return {
    ok: !blocked,
    prevTipo,
    nextTipo,
    normalizedConfig: normalized.config,
    removedKeys: normalized.removedKeys,
    message: blocked
      ? 'Se bloqueó el guardado para proteger la instalación activa: era ' +
        hcEtiquetaTipoInstalacion(prevTipo) +
        ' y se intentaba guardar como ' +
        hcEtiquetaTipoInstalacion(nextTipo) +
        '.'
      : '',
  };
}

function hcCapturarSnapshotSeguridadTorre(idx, reason) {
  initTorres();
  const i = Number.isFinite(idx) && idx >= 0 ? idx : (state.torreActiva || 0);
  const slot = state.torres && state.torres[i];
  if (!slot) return false;
  const prev = slot.safetySnapshot;
  const now = Date.now();
  const prevTs = prev && prev.capturedAtMs ? Number(prev.capturedAtMs) : 0;
  const prevReason = prev && prev.reason ? String(prev.reason) : '';
  if (prevTs > 0 && now - prevTs < 90000 && prevReason === String(reason || 'manual')) {
    return false;
  }
  const activa = i === (state.torreActiva || 0);
  const cfgRaw = activa ? state.configTorre : slot.config;
  const norm = hcNormalizarConfigSegunTipo(cfgRaw);
  slot.safetySnapshot = {
    capturedAt: new Date(now).toISOString(),
    capturedAtMs: now,
    reason: String(reason || 'manual'),
    tipoInstalacion: norm.tipo,
    nombre: (String(slot.nombre || '').trim() || 'Instalación'),
    config: hcClonePlainData(norm.config, null),
    torre: hcClonePlainData(activa ? state.torre : slot.torre, []),
    modoActual: activa ? modoActual : slot.modoActual,
    fotosSistemaCompleto: hcClonePlainData(
      activa ? state.fotosSistemaCompleto : slot.fotosSistemaCompleto,
      { fotoKeys: [], fotos: [] }
    ),
  };
  return true;
}

function hcCrearNombreInstalacionPorTipo(tipo, ordinal) {
  const base =
    tipo === 'nft' ? 'NFT'
    : tipo === 'dwc' ? 'DWC'
    : tipo === 'rdwc' ? 'RDWC'
    : 'Torre';
  return base + ' ' + ordinal;
}

function hcAppendNuevaInstalacionDesdeEstado(opts) {
  initTorres();
  if (!Array.isArray(state.torres)) state.torres = [];
  if (state.torres.length >= MAX_TORRES) return -1;
  const o = opts || {};
  const tipo = tipoInstalacionNormalizado(state.configTorre || {});
  const nuevaTorre = {
    id: Date.now(),
    nombre: String(o.nombre || hcCrearNombreInstalacionPorTipo(tipo, state.torres.length + 1)).trim(),
    emoji: emojiMigracionPorTipoInstalacion({ tipoInstalacion: tipo }),
    config: hcClonePlainData(hcNormalizarConfigSegunTipo(state.configTorre || {}).config, null),
    torre: hcClonePlainData(state.torre, []),
    modoActual: modoActual || 'lechuga',
    mediciones: o.clearHistory === false ? hcClonePlainData(state.mediciones, []) : [],
    registro: o.clearHistory === false ? hcClonePlainData(state.registro, []) : [],
    ultimaMedicion: o.clearHistory === false && state.ultimaMedicion ? { ...state.ultimaMedicion } : null,
    ultimaRecarga: o.clearHistory === false ? (state.ultimaRecarga ?? null) : null,
    recargaSnoozeHasta: o.clearHistory === false ? (state.recargaSnoozeHasta ?? null) : null,
    notifOpciones:
      o.notifOpciones && typeof o.notifOpciones === 'object'
        ? {
            recarga: !!o.notifOpciones.recarga,
            medicion: !!o.notifOpciones.medicion,
            cosecha: !!o.notifOpciones.cosecha,
          }
        : { recarga: false, medicion: false, cosecha: false },
    fotosSistemaCompleto:
      o.clearHistory === false
        ? hcClonePlainData(state.fotosSistemaCompleto, { fotoKeys: [], fotos: [] })
        : { fotoKeys: [], fotos: [] },
  };
  state.torres.push(nuevaTorre);
  const newIdx = state.torres.length - 1;
  state.torreActiva = newIdx;
  cargarEstadoTorre(newIdx);
  return newIdx;
}

function emojiMigracionPorTipoInstalacion(cfg) {
  if (!cfg || !cfg.tipoInstalacion) return '🌿';
  if (cfg.tipoInstalacion === 'nft') return '🪴';
  if (cfg.tipoInstalacion === 'dwc') return '🫧';
  if (cfg.tipoInstalacion === 'rdwc') return '🧿';
  return '🌿';
}

function emojiSistemaUiPorTorre(t) {
  const cfg = t && t.config ? t.config : null;
  const tipo = tipoInstalacionNormalizado(cfg);
  if (tipo === 'rdwc') return '🧿';
  if (tipo === 'dwc') return '🫧';
  if (tipo === 'nft') return '🪴';
  return (t && t.emoji) || '🌿';
}

// Inicializar sistema de torres si no existe
function initTorres() {
  if (!state.torres) {
    // Migrar configuración actual como primera instalación
    state.torres = [{
      id: 1,
      nombre: 'Mi instalación',
      emoji: emojiMigracionPorTipoInstalacion(state.configTorre),
      config: hcClonePlainData(state.configTorre, null),
      torre: hcClonePlainData(state.torre, []),
      modoActual: modoActual || 'lechuga',
      mediciones: hcClonePlainData(state.mediciones, []),
      registro: hcClonePlainData(state.registro, []),
      notifOpciones: { recarga: false, medicion: false, cosecha: false },
      fotosSistemaCompleto: hcClonePlainData(state.fotosSistemaCompleto, { fotoKeys: [], fotos: [] }),
    }];
    state.torreActiva = 0; // índice en el array
    saveState();
  }
  // Guardarraíl: `torres: []` en localStorage rompía el arranque (getTorreActiva → undefined → .nombre).
  if (!Array.isArray(state.torres) || state.torres.length === 0) {
    state.torres = [{
      id: 1,
      nombre: 'Mi instalación',
      emoji: emojiMigracionPorTipoInstalacion(state.configTorre),
      config: hcClonePlainData(state.configTorre, null),
      torre: hcClonePlainData(state.torre, []),
      modoActual: modoActual || 'lechuga',
      mediciones: hcClonePlainData(state.mediciones, []),
      registro: hcClonePlainData(state.registro, []),
      notifOpciones: { recarga: false, medicion: false, cosecha: false },
      fotosSistemaCompleto: hcClonePlainData(state.fotosSistemaCompleto, { fotoKeys: [], fotos: [] }),
    }];
    state.torreActiva = 0;
    saveState();
  }
  let idSeq = Date.now();
  let idsReparados = false;
  let emojisMigrados = false;
  (state.torres || []).forEach(t => {
    if (t.id == null || t.id === '') {
      idSeq += 1;
      t.id = idSeq;
      idsReparados = true;
    }
    if (!t.fotosSistemaCompleto || typeof t.fotosSistemaCompleto !== 'object') {
      t.fotosSistemaCompleto = { fotoKeys: [], fotos: [] };
    } else {
      if (!Array.isArray(t.fotosSistemaCompleto.fotoKeys)) t.fotosSistemaCompleto.fotoKeys = [];
      if (!Array.isArray(t.fotosSistemaCompleto.fotos)) t.fotosSistemaCompleto.fotos = [];
    }
    const tipo = tipoInstalacionNormalizado(t && t.config ? t.config : null);
    if (tipo === 'dwc' && t.emoji === '🌊') {
      t.emoji = '🫧';
      emojisMigrados = true;
    }
  });
  if (idsReparados || emojisMigrados) saveState();
  if (typeof normalizarNotifOpcionesEnState === 'function') normalizarNotifOpcionesEnState(state);
}

function getTorreActiva() {
  initTorres();
  const idx = state.torreActiva || 0;
  const t = state.torres[idx] || state.torres[0];
  if (t) return t;
  return {
    id: 1,
    nombre: 'Instalación',
    emoji: '🌿',
    config: state.configTorre || null,
    torre: state.torre || [],
    mediciones: [],
    registro: [],
    fotosSistemaCompleto: { fotoKeys: [], fotos: [] },
  };
}

/**
 * Alinea `state.ultimaMedicion`, recarga y snooze con el **slot** de la instalación activa.
 * Evita mostrar en Inicio datos de otra instalación si el estado global quedó desincronizado.
 */
function sincronizarUltimaMedicionYRecargaDesdeTorreActiva() {
  initTorres();
  const idx = state.torreActiva || 0;
  const t = state.torres && state.torres[idx];
  if (!t) return;
  const umSlot = t.ultimaMedicion;
  if (umSlot && typeof umSlot === 'object') {
    state.ultimaMedicion = { ...umSlot };
  } else {
    const med0 = (t.mediciones || []).find(m => m && (m.tipo === 'medicion' || !m.tipo));
    state.ultimaMedicion = med0
      ? {
          fecha: med0.fecha,
          hora: med0.hora,
          ec: med0.ec,
          ph: med0.ph,
          temp: med0.temp,
          vol: med0.vol,
          humSustrato: med0.humSustrato,
        }
      : null;
  }
  state.ultimaRecarga = t.ultimaRecarga != null ? t.ultimaRecarga : null;
  state.recargaSnoozeHasta = t.recargaSnoozeHasta != null ? t.recargaSnoozeHasta : null;
}


// Actualizar todos los datos de la torre activa
function actualizarTorreActual() {
  if (state.configTorre) {
    try {
      delete state.configTorre.hcPlantillaAutogenerada;
    } catch (_) {}
    state.configTorre.checklistInstalacionConfirmada = true;
    if (state.configTorre.tipoInstalacion === 'dwc') {
      try {
        dwcPersistSnapshotMaxCestasEnCfg(state.configTorre);
      } catch (eD) {}
    }
  }
  hcCapturarSnapshotSeguridadTorre(state.torreActiva || 0, 'system-update');
  guardarEstadoTorreActual();
  saveState();
  aplicarConfigTorre();
  try {
    if (state.configTorre && state.configTorre.tipoInstalacion === 'dwc') refreshDwcSistemaMedidasUI();
  } catch (eDwUi) {}
  renderTorre();
  updateTorreStats();
  updateDashboard();
  actualizarBadgesNutriente();
  // Recalcular plantas y edad automáticamente
  if (document.getElementById('tab-riego')?.classList.contains('active')) {
    actualizarVistaRiegoPorTipoInstalacion();
    calcularRiego();
  }
  if (document.getElementById('tab-meteo')?.classList.contains('active')) {
    cargarMeteo();
  }
  if (document.getElementById('tab-calendario')?.classList.contains('active')) {
    renderCalendario();
  }
  showToast('🔄 Instalación actualizada · ' + ((getTorreActiva()?.nombre || '').trim() || 'Instalación'));
}

function cambiarTorreActiva(idx) {
  // Guardar estado actual en la torre activa
  guardarEstadoTorreActual();
  torreCestasMultiSel.clear();
  torreInteraccionModo = 'editar';

  // Cambiar a la nueva torre
  state.torreActiva = idx;
  cargarEstadoTorre(idx);
  saveState();
  cerrarModalTorres();
  actualizarHeaderTorre();
  renderTorre();
  updateTorreStats();
  updateDashboard();
  actualizarBadgesNutriente();
  const _bE = document.getElementById('torreModoEditar');
  const _bA = document.getElementById('torreModoAsignar');
  const _pA = document.getElementById('torreAssignPanel');
  if (_bE) { _bE.classList.add('active'); _bE.setAttribute('aria-pressed', 'true'); }
  if (_bA) { _bA.classList.remove('active'); _bA.setAttribute('aria-pressed', 'false'); }
  if (_pA) _pA.style.display = 'none';
  actualizarBarraMultiSel();
  try {
    if (typeof sincronizarInputsRiego === 'function') sincronizarInputsRiego();
  } catch (eRiegoSync) {}

  actualizarVistaRiegoPorTipoInstalacion();

  // Toast con nombre de la torre
  const t = state.torres[idx];
  const nombre = (t && t.nombre) ? String(t.nombre).trim() : '';
  showToast('🌿 Ahora en: ' + (nombre || 'Instalación'));
  // Marcar datos como obsoletos — se recargarán al abrir cada pestaña
  window._meteoObsoleto = true;
  window._riegoObsoleto  = true;
  try {
    if (typeof invalidateMeteoNomiCache === 'function') invalidateMeteoNomiCache();
  } catch (_) {}
  // Recargar si la pestaña ya está abierta (sincronizar primero)
  if (document.getElementById('tab-riego')?.classList.contains('active')) {
    sincronizarInputsRiego();
    actualizarVistaRiegoPorTipoInstalacion();
    calcularRiego({ forceRefresh: true });
  }
  if (document.getElementById('tab-meteo')?.classList.contains('active')) cargarMeteo();
  if (document.getElementById('tab-calendario')?.classList.contains('active')) renderCalendario();
  if (document.getElementById('tab-mediciones')?.classList.contains('active')) initConfigUI();
  if (typeof refreshDashNotificacionesUI === 'function') refreshDashNotificacionesUI();
}

/** Cestas con cultivo asignado (para detectar datos de torre más recientes en la raíz del state). */
function contarPlantasEnTorre(torreArr) {
  if (!torreArr || !Array.isArray(torreArr)) return 0;
  let n = 0;
  for (let ni = 0; ni < torreArr.length; ni++) {
    const row = torreArr[ni];
    if (!Array.isArray(row)) continue;
    for (let ci = 0; ci < row.length; ci++) {
      const c = row[ci];
      if (c && String(c.variedad || '').trim() !== '') n++;
    }
  }
  return n;
}

/**
 * Tras versiones antiguas o guardados sin sync, state.torre podía tener plantas y el slot
 * state.torres[idx].torre quedar vacío/obsoleto. Al cargar, se perdía la torre en pantalla.
 * Copia la raíz al slot si la raíz lleva más plantas registradas.
 */
function reconciliarSlotTorreActivaAntesDeCargar() {
  if (!state.torres || !state.torres.length) return;
  const idx = state.torreActiva || 0;
  const t = state.torres[idx];
  if (!t) return;
  const nSlot = contarPlantasEnTorre(t.torre);
  const nRoot = contarPlantasEnTorre(state.torre);
  if (nRoot > nSlot) {
    try {
      t.torre = JSON.parse(JSON.stringify(state.torre));
    } catch (e) {}
  }
  if (!t.config && state.configTorre && typeof state.configTorre === 'object' && Object.keys(state.configTorre).length) {
    try {
      t.config = JSON.parse(JSON.stringify(state.configTorre));
    } catch (e) {}
  }
}

function guardarEstadoTorreActual() {
  if (!state.torres) return;
  const idx = state.torreActiva || 0;
  if (!state.torres[idx]) return;
  const slot = state.torres[idx];
  const integrity = hcEvaluarIntegridadGuardadoInstalacion(slot, state.configTorre || null);
  if (!integrity.ok) {
    state.torre = hcClonePlainData(slot.torre, []);
    state.mediciones = hcClonePlainData(slot.mediciones, []);
    state.registro = hcClonePlainData(slot.registro, []);
    state.configTorre = hcClonePlainData(slot.config, null);
    if (slot.ultimaMedicion && typeof slot.ultimaMedicion === 'object') state.ultimaMedicion = { ...slot.ultimaMedicion };
    else state.ultimaMedicion = null;
    state.ultimaRecarga = slot.ultimaRecarga ?? null;
    state.recargaSnoozeHasta = slot.recargaSnoozeHasta ?? null;
    ensureFotosSistemaCompletoState();
    state.fotosSistemaCompleto = hcClonePlainData(slot.fotosSistemaCompleto, { fotoKeys: [], fotos: [] });
    try {
      if (typeof showToast === 'function') showToast(integrity.message, true);
    } catch (_) {}
    return false;
  }
  if (integrity.removedKeys && integrity.removedKeys.length) {
    state.configTorre = hcClonePlainData(integrity.normalizedConfig, null);
  }
  state.torres[idx].torre      = hcClonePlainData(state.torre, []);
  state.torres[idx].modoActual = modoActual;
  state.torres[idx].mediciones = hcClonePlainData(state.mediciones, []);
  state.torres[idx].registro   = hcClonePlainData(state.registro, []);
  state.torres[idx].ultimaMedicion = state.ultimaMedicion
    ? { ...state.ultimaMedicion }
    : null;
  state.torres[idx].ultimaRecarga = state.ultimaRecarga ?? null;
  state.torres[idx].recargaSnoozeHasta = state.recargaSnoozeHasta ?? null;
  state.torres[idx].config     = hcClonePlainData(integrity.normalizedConfig, null);
  ensureFotosSistemaCompletoState();
  state.torres[idx].fotosSistemaCompleto = hcClonePlainData(state.fotosSistemaCompleto, { fotoKeys: [], fotos: [] });
  // Guardar configuración de riego: no machacar con valores por defecto del HTML si el input va vacío o inválido
  const prevR = state.torres[idx].riego || {};
  const nEl = document.getElementById('riegoNPlantas');
  const eEl = document.getElementById('riegoEdad');
  const nRaw = nEl && String(nEl.value || '').trim() !== '' ? parseInt(String(nEl.value).trim(), 10) : NaN;
  const eRaw = eEl && String(eEl.value || '').trim() !== '' ? parseFloat(String(eEl.value).trim().replace(',', '.')) : NaN;
  state.torres[idx].riego = {
    nPlantas: Number.isFinite(nRaw) && nRaw >= 1 ? nRaw : (Number.isFinite(prevR.nPlantas) && prevR.nPlantas >= 1 ? prevR.nPlantas : 15),
    edadSem: Number.isFinite(eRaw) && eRaw > 0 ? eRaw : (Number.isFinite(prevR.edadSem) && prevR.edadSem > 0 ? prevR.edadSem : 4),
    toldo: toldoDesplegado,
    diaRiego: diaRiego,
  };
  return true;
}

function cargarEstadoTorre(idx) {
  const t = state.torres[idx];
  if (!t) return;
  // Restaurar datos de esta torre
  state.torre       = hcClonePlainData(t.torre, []);
  state.mediciones  = hcClonePlainData(t.mediciones, []);
  state.registro    = hcClonePlainData(t.registro, []);
  state.configTorre = hcClonePlainData(hcNormalizarConfigSegunTipo(t.config).config, null);
  const umSlot = t.ultimaMedicion;
  if (umSlot && typeof umSlot === 'object') {
    state.ultimaMedicion = { ...umSlot };
  } else {
    const med0 = (t.mediciones || []).find(m => m && (m.tipo === 'medicion' || !m.tipo));
    state.ultimaMedicion = med0
      ? {
          fecha: med0.fecha,
          hora: med0.hora,
          ec: med0.ec,
          ph: med0.ph,
          temp: med0.temp,
          vol: med0.vol,
          humSustrato: med0.humSustrato,
        }
      : null;
  }
  state.ultimaRecarga = t.ultimaRecarga != null ? t.ultimaRecarga : null;
  state.recargaSnoozeHasta = t.recargaSnoozeHasta != null ? t.recargaSnoozeHasta : null;
  const fsc = t.fotosSistemaCompleto;
  state.fotosSistemaCompleto =
    fsc && typeof fsc === 'object'
      ? {
          fotoKeys: Array.isArray(fsc.fotoKeys) ? fsc.fotoKeys.slice() : [],
          fotos: Array.isArray(fsc.fotos) ? fsc.fotos.slice() : [],
        }
      : { fotoKeys: [], fotos: [] };
  modoActual = typeof normalizeTorreModoActual === 'function'
    ? normalizeTorreModoActual(t.modoActual)
    : (MODOS_CULTIVO[t.modoActual] ? t.modoActual : 'lechuga');
  // Asegurar estructura COMPLETA siempre — rellenar niveles y cestas que falten
  const nivR = state.configTorre?.numNiveles || NUM_NIVELES;
  const cesR = state.configTorre?.numCestas  || NUM_CESTAS;
  if (!state.torre) state.torre = [];
  // Añadir niveles que falten
  while (state.torre.length < nivR) state.torre.push([]);
  // Añadir cestas que falten en cada nivel
  for (let n = 0; n < nivR; n++) {
    if (!state.torre[n]) state.torre[n] = [];
    while (state.torre[n].length < cesR) {
      state.torre[n].push({ variedad:'', fecha:'', notas:'', origenPlanta:'', fotos:[], fotoKeys:[] });
    }
  }
  for (let n = 0; n < nivR; n++) {
    (state.torre[n] || []).forEach(cell => {
      if (typeof asegurarCamposFilaTorre === 'function') asegurarCamposFilaTorre(cell);
    });
  }
  // Restaurar toldo / día de riego; plantas y edad vía sincronizarInputsRiego (torre activa + slot guardado)
  const riegoData = t.riego || {};
  const swToldo = document.getElementById('toldoSwitch');
  if (riegoData.toldo !== undefined) {
    toldoDesplegado = riegoData.toldo;
  } else {
    toldoDesplegado = false;
  }
  if (swToldo) {
    swToldo.className = 'toggle-switch' + (toldoDesplegado ? ' on' : '');
    swToldo.setAttribute('aria-checked', toldoDesplegado ? 'true' : 'false');
  }
  if (riegoData.diaRiego === 'hoy' || riegoData.diaRiego === 'manana') {
    setDiaRiego(riegoData.diaRiego);
  } else {
    setDiaRiego('hoy');
  }
  try {
    if (typeof sincronizarInputsRiego === 'function') sincronizarInputsRiego();
  } catch (eRiegoSync) {}
  // Aplicar constantes de la config de esta torre
  if (state.configTorre?.sustrato) state.configSustrato = state.configTorre.sustrato;
  aplicarConfigTorre();
  cargarUbicacionMedicionesUI();
  cargarInteriorGrowUI();
  if (typeof applyMedirCollapseUI === 'function') applyMedirCollapseUI();
  cargarLocalidadMeteoUI();
  try { refreshUbicacionInstalacionUI(); } catch (_) {}
  syncRiegoAvanzadoUI();
  if (document.getElementById('tab-mediciones')?.classList.contains('active')) initConfigUI();
  try {
    if (typeof updateRecargaBar === 'function') updateRecargaBar();
  } catch (_) {}
  try {
    if (typeof refreshModoInfoText === 'function') refreshModoInfoText();
  } catch (_) {}
}

function actualizarHeaderTorre() {
  const t = getTorreActiva();
  const btn = document.getElementById('torreActivaNombre');
  if (btn) {
    const nom = t && typeof t.nombre === 'string' ? t.nombre.trim() : '';
    btn.textContent = emojiSistemaUiPorTorre(t) + ' ' + (nom || 'Instalación');
  }
  // Mostrar/ocultar botón añadir según límite
  const btnCrear = document.getElementById('btnCrearTorre');
  if (btnCrear) {
    const nTorres = Array.isArray(state.torres) ? state.torres.length : 0;
    btnCrear.style.display = nTorres >= MAX_TORRES ? 'none' : 'block';
  }
}

function sistemaEstaOperativa(cfg) {
  const c = cfg || state.configTorre || {};
  return c.operativa !== false;
}

function getMensajeStandbyContinuar() {
  return '⏸ Instalación en stand-by / descanso. Reactiva modo operativa para continuar.';
}

function setStandbyLockDisabled(el, on) {
  if (!el) return;
  const canDisable =
    (el instanceof HTMLButtonElement) ||
    (el instanceof HTMLInputElement) ||
    (el instanceof HTMLSelectElement) ||
    (el instanceof HTMLTextAreaElement);
  if (!canDisable) return;
  if (on) {
    if (!el.disabled) {
      el.disabled = true;
      el.dataset.standbyLocked = '1';
    }
    if (
      (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) &&
      !el.readOnly
    ) {
      el.readOnly = true;
      el.dataset.standbyReadonly = '1';
    }
    el.classList.add('is-standby-disabled');
    el.setAttribute('aria-disabled', 'true');
    return;
  }
  if (el.dataset.standbyLocked === '1') {
    el.disabled = false;
    delete el.dataset.standbyLocked;
  }
  if (el.dataset.standbyReadonly === '1') {
    el.readOnly = false;
    delete el.dataset.standbyReadonly;
  }
  el.classList.remove('is-standby-disabled');
  el.setAttribute('aria-disabled', el.disabled ? 'true' : 'false');
}

function aplicarBloqueosStandbyPorTab(on) {
  const tabMediciones = document.getElementById('tab-mediciones');
  if (tabMediciones) {
    tabMediciones.querySelectorAll('input, textarea, select').forEach(el => {
      setStandbyLockDisabled(el, !on);
    });
  }
  const tabSistema = document.getElementById('tab-sistema');
  if (tabSistema) {
    tabSistema.querySelectorAll('button, input, textarea, select').forEach(el => {
      if (el.id === 'sistemaOperativaSwitch') return;
      setStandbyLockDisabled(el, !on);
    });
  }
}

function aplicarEstadoStandbyUI() {
  const on = sistemaEstaOperativa();
  const appRoot = document.getElementById('app');
  if (appRoot) appRoot.classList.toggle('is-standby-active', !on);
  ['tab-inicio', 'tab-mediciones', 'tab-sistema', 'tab-riego'].forEach(id => {
    const tab = document.getElementById(id);
    if (tab) tab.classList.toggle('is-standby', !on);
  });
  const globalStandby = document.getElementById('globalStandbyBanner');
  if (globalStandby) {
    globalStandby.classList.toggle('setup-hidden', on);
  }
  const estadoRow = document.querySelector('.dash-operativa-row');
  if (estadoRow) estadoRow.classList.toggle('is-standby-active', !on);
  const btnGuardar = document.getElementById('btnGuardarMedicion');
  if (btnGuardar) {
    btnGuardar.disabled = !on;
    btnGuardar.setAttribute('aria-disabled', on ? 'false' : 'true');
  }
  const btnRiego = document.getElementById('btnCalcRiego');
  if (btnRiego) {
    btnRiego.disabled = !on;
    btnRiego.setAttribute('aria-disabled', on ? 'false' : 'true');
  }
  const dashSistemaInfo = document.getElementById('dashSistemaInfo');
  if (dashSistemaInfo) {
    dashSistemaInfo.classList.toggle('is-standby-blocked', !on);
    dashSistemaInfo.setAttribute('aria-disabled', on ? 'false' : 'true');
    dashSistemaInfo.setAttribute('tabindex', on ? '0' : '-1');
  }
  ['tileEC', 'tilePH', 'tileTemp', 'tileVol'].forEach(id => {
    const btn = document.getElementById(id);
    if (!(btn instanceof HTMLButtonElement)) return;
    setStandbyLockDisabled(btn, !on);
  });
  aplicarBloqueosStandbyPorTab(on);
  // Reaplicar tras renders diferidos de la pestaña para evitar que otros módulos reactiven campos.
  requestAnimationFrame(() => {
    if (!sistemaEstaOperativa()) aplicarBloqueosStandbyPorTab(false);
  });
  setTimeout(() => {
    if (!sistemaEstaOperativa()) aplicarBloqueosStandbyPorTab(false);
  }, 180);
  const accionesCriticas = [
    '[onclick*="intentarAbrirChecklistDesdeInicio(false)"]',
    '[onclick*="confirmarReposicionDeposito"]',
    '#recargaSwitch',
  ];
  accionesCriticas.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      if (!(el instanceof HTMLButtonElement)) return;
      el.disabled = !on;
      el.classList.toggle('is-standby-disabled', !on);
      el.setAttribute('aria-disabled', on ? 'false' : 'true');
    });
  });
}

function actualizarEstadoOperativaUI() {
  const on = sistemaEstaOperativa();
  const tag = document.getElementById('medirEstadoOperativaTag');
  if (tag) {
    tag.textContent = on ? 'Operativa' : 'Stand-by / descanso';
    tag.classList.toggle('dash-operativa-sub--off', !on);
  }
  const sw = document.getElementById('sistemaOperativaSwitch');
  if (sw) {
    sw.classList.toggle('on', on);
    sw.setAttribute('aria-checked', on ? 'true' : 'false');
  }
  aplicarEstadoStandbyUI();
}

function toggleSistemaOperativa() {
  initTorres();
  if (!state.configTorre) state.configTorre = {};
  const on = sistemaEstaOperativa();
  state.configTorre.operativa = !on;
  guardarEstadoTorreActual();
  saveState();
  actualizarEstadoOperativaUI();
  actualizarBadgesNutriente();
  if (document.getElementById('tab-riego')?.classList.contains('active') && typeof calcularRiego === 'function') {
    calcularRiego({ forceRefresh: true });
  }
  showToast(state.configTorre.operativa === false
    ? '⏸ Instalación en stand-by / descanso'
    : '✅ Instalación en modo operativa');
}

function textoTipoInstalacionTorre(cfg) {
  return typeof etiquetaSistemaHidroponicoBreve === 'function'
    ? etiquetaSistemaHidroponicoBreve(cfg)
    : (cfg && cfg.tipoInstalacion === 'nft'
      ? 'NFT'
      : cfg && cfg.tipoInstalacion === 'dwc'
        ? 'DWC'
        : cfg && cfg.tipoInstalacion === 'rdwc'
          ? 'RDWC'
        : 'Torre vertical');
}

/** Actualiza el botón de dos líneas (nombre + tipo) de la instalación activa en la pestaña Torre. */
function renderTorreInstalacionPicker() {
  initTorres();
  const btn = document.getElementById('torreInstalacionPickerBtn');
  const elEmoji = document.getElementById('torreInstalacionPickerEmoji');
  const elNom = document.getElementById('torreInstalacionPickerNombre');
  const elTipo = document.getElementById('torreInstalacionPickerTipo');
  if (!btn || !elNom || !elTipo) return;
  const torres = state.torres || [];
  const n = torres.length;
  const activa = n ? Math.min(Math.max(0, state.torreActiva || 0), n - 1) : 0;
  const t = n ? torres[activa] : null;
  const nom = t ? (((t.nombre || '').trim()) || ('Instalación ' + (activa + 1))) : '—';
  const emoji = t ? emojiSistemaUiPorTorre(t) : '🌿';
  const tipoTxt = t ? textoTipoInstalacionTorre(t.config) : '—';
  if (elEmoji) elEmoji.textContent = emoji;
  elNom.textContent = nom;
  elTipo.textContent = tipoTxt;
  btn.setAttribute('aria-label',
    'Instalación actual: ' + nom + ', ' + tipoTxt + '. Abrir lista para elegir otra instalación');
}

function abrirSelectorTorres() {
  initTorres();
  renderListaTorres();
  const mt = document.getElementById('modalTorres');
  mt.classList.add('open');
  a11yDialogOpened(mt);
}

function cerrarModalTorres(e) {
  const mt = document.getElementById('modalTorres');
  if (!e || e.target === mt) {
    mt.classList.remove('open');
    a11yDialogClosed(mt);
  }
}

function renderListaTorres() {
  const lista = document.getElementById('listaTorres');
  const activa = state.torreActiva || 0;
  const EMOJIS = ['🌿','🌱','🥬','🌿','🍃','🌾','🪴','🌻','🫛','🎍'];

  lista.innerHTML = state.torres.map((t, i) => {
    const isActiva = i === activa;
    const plantasCount = (t.torre || []).reduce((sum, nivel) =>
      sum + (nivel || []).filter(c => c && c.variedad).length, 0);
    const cfgT = t.config || {};
    const geomTxt = cfgT.tipoInstalacion === 'nft'
      ? ((cfgT.nftNumCanales || cfgT.numNiveles || 4) + ' canales × ' + (cfgT.nftHuecosPorCanal || cfgT.numCestas || 8) + ' huecos')
      : cfgT.tipoInstalacion === 'dwc'
        ? ((cfgT.numNiveles || 5) + ' filas × ' + (cfgT.numCestas || 5) + ' cestas')
        : cfgT.tipoInstalacion === 'rdwc'
          ? ((cfgT.rdwcRows || 1) + ' filas × ' + (cfgT.rdwcSites || 4) + ' sitios')
        : ((cfgT.numNiveles || 5) + 'N × ' + (cfgT.numCestas || 5) + 'C');

    return `<div class="torre-list-row${isActiva ? ' torre-list-row--active' : ''}">
      <button type="button" class="torre-list-main"
        onclick="cambiarTorreActiva(${i})"
        aria-pressed="${isActiva ? 'true' : 'false'}"
        aria-label="Activar ${String((t.nombre || '').trim() || 'instalación').replace(/"/g, '&quot;')}${isActiva ? ', instalación actual' : ''}">
      <span class="torre-list-emoji" aria-hidden="true">${emojiSistemaUiPorTorre(t)}</span>
      <span class="torre-list-body">
        <span class="torre-list-name">${(t.nombre || '').trim() || 'Instalación'}</span>
        <span class="torre-list-meta">
          ${cfgT.tipoInstalacion === 'nft' ? '🪴 NFT · ' : cfgT.tipoInstalacion === 'dwc' ? '🫧 DWC · ' : cfgT.tipoInstalacion === 'rdwc' ? '🧿 RDWC · ' : ''}${plantasCount} plantas · ${t.config ? geomTxt : '5N × 5C'}
          ${isActiva ? ' · <strong class="torre-list-active-tag">Activa</strong>' : ''}
        </span>
      </span>
      </button>
      <div class="torre-list-actions">
        <button type="button" onclick="editarNombreTorre(${i})"
          class="torre-list-btn-icon" aria-label="Editar nombre de la instalación">✏️</button>
        ${state.torres.length > 1 && !isActiva ? `
        <button type="button" onclick="borrarTorre(${i})"
          class="torre-list-btn-del" aria-label="Borrar esta instalación">🗑</button>` : ''}
      </div>
    </div>`;
  }).join('');

  actualizarHeaderTorre();
}

function abrirSetupNuevaTorre() {
  // Marcar que es una torre nueva (no reconfiguración)
  setupEsNuevaTorre = true;
  setupNombreNuevaTorre = '';
  if (typeof setupRdwcDraft !== 'undefined') setupRdwcDraft = null;

  // Preconfigurar sliders con valores razonables para torre nueva
  setupPagina = 0;
  setupTipoInstalacion = '';
  setupTipoTorre = 'custom';
  setupEquipamiento = new Set(['difusor','calentador','bomba','timer','medidorEC']);
  refreshSetupEquipamientoCardsDesdeSet();
  const ccNew = document.getElementById('setupCalentadorConsignaC');
  if (ccNew) ccNew.value = '20';
  refreshSetupCalentadorConsignaVis();
  setupNutriente = 'canna_aqua';
  setupUbicacion = 'exterior';
  setupPlantasSeleccionadas = new Set();
  try {
    if (typeof resetSetupCestaVariedadDraft === 'function') resetSetupCestaVariedadDraft();
  } catch (_) {}
  setupNumTorres = 'una'; // no relevante para nueva torre
  setupData.sensoresHardware = { ec: false, ph: false, humedad: false };
  setupData.consejosModoUi = 'principiante';

  setupCoordenadas = { lat: null, lon: null, ciudad: '' };
  setupData.ciudad = null;
  setupData.lat = null;
  setupData.lon = null;
  const c2n = document.getElementById('setupCiudad2');
  if (c2n) c2n.value = '';
  document.getElementById('ciudadResultadosSetup')?.classList.add('setup-hidden');
  const csel = document.getElementById('ciudadSeleccionadaSetup');
  if (csel) {
    csel.classList.add('setup-hidden');
    csel.textContent = '';
  }

  const so = document.getElementById('setupOverlay');
  so.classList.add('open');
  document.getElementById('sliderNftCanales') && (document.getElementById('sliderNftCanales').value = '4');
  document.getElementById('sliderNftHuecos') && (document.getElementById('sliderNftHuecos').value = '8');
  document.getElementById('sliderNftPendiente') && (document.getElementById('sliderNftPendiente').value = '2');
  const svNew = document.getElementById('sliderVol');
  if (svNew) svNew.value = '20';
  const svmNew = document.getElementById('setupVolMezclaL');
  if (svmNew) svmNew.value = '';
  renderNutrientesGrid();
  updateTorreBuilder();
  renderSetupPage();
  a11yDialogOpened(so);

  // Actualizar el título para indicar que es una torre nueva
  setTimeout(() => {
    const titulo = document.querySelector('.setup-header-title');
    if (titulo) titulo.textContent = '🌿 Nueva instalación';
  }, 50);
}


function crearNuevaTorre() {
  if (state.torres.length >= MAX_TORRES) {
    showToast('Máximo ' + MAX_TORRES + ' instalaciones', true); return;
  }
  cerrarModalTorres();
  abrirSetupNuevaTorre();
}

function editarNombreTorre(idx) {
  const t = state.torres[idx];
  const nuevoNombre = prompt('Nombre de la instalación:', t.nombre || '');
  if (nuevoNombre && nuevoNombre.trim()) {
    state.torres[idx].nombre = nuevoNombre.trim().slice(0, 40);
    saveState();
    renderListaTorres();
    actualizarHeaderTorre();
    updateTorreStats();
    updateDashboard();
  }
}

/** Desde la pestaña Torre: abre el diálogo para editar el nombre de la instalación activa. */
function cambiarNombreInstalacionActivaDesdeTorre() {
  initTorres();
  const idx = state.torreActiva || 0;
  if (!state.torres[idx]) return;
  editarNombreTorre(idx);
}

function borrarTorre(idx) {
  if (state.torres.length <= 1) return;
  if (!confirm('¿Borrar ' + state.torres[idx].nombre + '? Se perderán todos sus datos.')) return;
  state.torres.splice(idx, 1);
  if (state.torreActiva >= state.torres.length) {
    state.torreActiva = state.torres.length - 1;
  }
  cargarEstadoTorre(state.torreActiva);
  saveState();
  renderListaTorres();
  renderTorre();
  actualizarHeaderTorre();
  showToast('🗑 Instalación eliminada');
}

// ══════════════════════════════════════════════════
// BADGE NUTRIENTE — visible en dashboard y medir
// ══════════════════════════════════════════════════

function actualizarBadgesNutriente() {
  const nut = getNutrienteTorre();
  const cfg = state.configTorre || {};

  // Actualizar rangos dinámicos en las cards de Medir
  const ecOptimaCultivos = getECOptimaTorre();
  const ecMin = ecOptimaCultivos.min;
  const ecMax = ecOptimaCultivos.max;
  const phMin = nut && nut.pHRango ? nut.pHRango[0] : 5.5;
  const phMax = nut && nut.pHRango ? nut.pHRango[1] : 6.5;

  const rangeEC = document.getElementById('paramRangeEC');
  const rangePH = document.getElementById('paramRangePH');
  if (rangeEC) {
    const o = typeof getEcObjetivoManualUs === 'function' ? getEcObjetivoManualUs(cfg) : null;
    const strategyEc = typeof getEcPhStrategy === 'function' ? getEcPhStrategy(cfg) : 'auto';
    const tieneVariedades =
      typeof torreTieneAlgunaVariedadAsignada === 'function' && torreTieneAlgunaVariedadAsignada();
    if (o != null) {
      rangeEC.textContent =
        'Objetivo ' + o + ' ±' + EC_MEDICION_TOLERANCIA_OBJETIVO_US + ' µS/cm · cultivo ' + ecMin + '–' + ecMax;
      rangeEC.removeAttribute('title');
    } else if (!tieneVariedades && strategyEc !== 'manual') {
      rangeEC.textContent =
        'Sin variedad en la instalación: asigna cultivo y fecha en Cultivo e instalación para un EC por fase (o EC manual en checklist).';
      rangeEC.title =
        'La fecha de la ficha es el trasplante al hidro. Si marcaste <strong>vivero</strong>, el rango EC/pH y la fase usan también una media de días en plug típica de ese cultivo (como en el resumen de cestas).';
    } else {
      const rec = typeof getRecomendacionEcPhTorre === 'function' ? getRecomendacionEcPhTorre() : null;
      const faseMapEc = {
        germinacion: 'germinación',
        plantula: 'plántula',
        vegetativo: 'vegetativo',
        prefloracion: 'prefloración',
        floracion: 'floración',
        fructificacion: 'fructificación',
      };
      const faseTxt =
        rec && rec.faseDominante ? ' · fase ' + (faseMapEc[rec.faseDominante] || rec.faseDominante) : '';
      rangeEC.textContent = ecMin + ' – ' + ecMax + ' µS/cm' + faseTxt;
      rangeEC.removeAttribute('title');
    }
  }
  if (rangePH) {
    const strategyPh = typeof getEcPhStrategy === 'function' ? getEcPhStrategy(cfg) : 'auto';
    const tieneVariedadesPh =
      typeof torreTieneAlgunaVariedadAsignada === 'function' && torreTieneAlgunaVariedadAsignada();
    if (!tieneVariedadesPh && strategyPh !== 'manual') {
      rangePH.textContent = 'Misma lógica que EC: define plantas en Cultivo e instalación o pH manual en checklist.';
      rangePH.title = 'Con plantas y fecha, el pH se ajusta al catálogo por fase y al nutriente activo.';
    } else {
      const phOpt =
        nut && typeof getPhOptimaTorre === 'function' ? getPhOptimaTorre(nut, cfg) : [phMin, phMax];
      rangePH.textContent = phOpt[0] + ' – ' + phOpt[1];
      rangePH.removeAttribute('title');
    }
  }

  const rangeVol = document.getElementById('paramRangeVol');
  const inputVol = document.getElementById('inputVol');
  if (rangeVol && typeof getVolumenDepositoMaxLitros === 'function') {
    const vrRaw = getVolumenDepositoMaxLitros(cfg);
    const vr = Math.round(Number(vrRaw) * 10) / 10;
    if (Number.isFinite(vr) && vr > 0) {
      if (cfg.tipoInstalacion === 'dwc') {
        let capG = null;
        if (typeof getDwcCapacidadLitrosDesdeConfig === 'function') {
          capG = getDwcCapacidadLitrosDesdeConfig(cfg);
        }
        let vSafe = null;
        if (typeof getDwcVolumenSeguroMaxLitrosDesdeConfig === 'function') {
          vSafe = getDwcVolumenSeguroMaxLitrosDesdeConfig(cfg);
        }
        if (
          capG != null &&
          vSafe != null &&
          Number.isFinite(capG) &&
          Number.isFinite(vSafe) &&
          capG > vSafe + 0.4
        ) {
          rangeVol.textContent =
            '~' +
            Math.round(vSafe * 10) / 10 +
            ' L útil seguro (geom. ~' +
            Math.round(capG * 10) / 10 +
            ' L)';
        } else {
          rangeVol.textContent = '~' + vr + ' L (referencia DWC · bajo sustrato)';
        }
      } else if (cfg.tipoInstalacion === 'rdwc') {
        rangeVol.textContent =
          '~' + vr + ' L (depósito de control RDWC; mezcla y medición ahí; rango habitual en app 10–800 L)';
      } else {
        const vm =
          typeof getVolumenMezclaLitros === 'function' ? getVolumenMezclaLitros(cfg) : vr;
        const vmR = Number.isFinite(vm) && vm > 0 ? Math.round(vm * 10) / 10 : vr;
        const capR = Math.round(Number(vrRaw) * 10) / 10;
        if (Number.isFinite(capR) && capR > vmR + 0.35) {
          rangeVol.textContent =
            '~' + vmR + ' L en uso (dosis); capacidad máx. del depósito ≈ ' + capR + ' L';
        } else {
          rangeVol.textContent = '~' + vmR + ' L (volumen de mezcla y referencia para dosis)';
        }
      }
      if (inputVol) {
        const vm = typeof getVolumenMezclaLitros === 'function' ? getVolumenMezclaLitros(cfg) : vr;
        const ph = Number.isFinite(vm) && vm > 0 ? Math.round(vm * 10) / 10 : vr;
        inputVol.placeholder = String(ph);
        const capIn = Math.min(800, Math.max(Math.ceil(vr + 2), 20));
        inputVol.setAttribute('max', String(capIn));
      }
    } else if (cfg.hcPlantillaAutogenerada) {
      rangeVol.textContent = 'Indica capacidad del depósito en Torre o asistente';
      rangeVol.removeAttribute('title');
      if (inputVol) {
        inputVol.placeholder = '—';
        inputVol.removeAttribute('max');
      }
    }
  }

  // Dashboard
  const dashNombre  = document.getElementById('dashNutrienteNombre');
  const dashDetalle = document.getElementById('dashNutrienteDetalle');
  const dashEstado = document.getElementById('dashNutrienteEstado');
  const dashTagEstado = document.getElementById('dashNutrienteTagEstado');
  const dashRecomendado = document.getElementById('dashNutrienteRecomendado');
  const dashFuente = document.getElementById('dashNutrienteFuente');
  const dashRazon = document.getElementById('dashNutrienteRazon');
  const dashAviso   = document.getElementById('dashNutrienteAviso');
  const dashAvisoGlobal = document.getElementById('dashCambioNutrienteAviso');
  if (dashNombre) dashNombre.textContent = nut ? nut.nombre : 'Nutriente sin elegir';
  if (dashDetalle) dashDetalle.textContent = nut ? nut.detalle : 'Elige marca en Cultivo e instalación o Medir';
  if (dashEstado || dashRecomendado || dashRazon || dashFuente) {
    const usoRaw =
      nut && typeof hcNutrienteFaseUso === 'function'
        ? hcNutrienteFaseUso(nut)
        : 'unknown';
    const usoMap = { veg: 'VEG', bloom: 'BLOOM', both: 'BOTH', unknown: '—' };
    const usoTxt = usoMap[usoRaw] || '—';
    const ctx = typeof hcGetRecomendacionNutrienteContexto === 'function'
      ? hcGetRecomendacionNutrienteContexto()
      : null;
    const recomendado = ctx ? (ctx.recomendado === 'bloom' ? 'BLOOM' : 'VEG') : 'VEG';
    const recomendadoSub = ctx
      ? (ctx.hayFruto
          ? (ctx.recomendado === 'bloom' ? ' (fruto en fase floral)' : ' (fruto aún en vegetativo)')
          : ' (hoja/vegetativo)')
      : '';
    const faseMap = {
      germinacion: 'germinación',
      plantula: 'plántula',
      vegetativo: 'vegetativo',
      prefloracion: 'prefloración',
      floracion: 'floración',
      fructificacion: 'fructificación',
      manual: 'manual',
    };
    let motivo = 'Motivo: sin datos suficientes aún.';
    let fuente = 'Fuente: estimación general';
    if (ctx) {
      if (!ctx.hayFruto) {
        motivo = 'Motivo: no hay cultivos de fruto activos en esta instalación.';
        fuente = 'Fuente: cultivo activo (sin fruto)';
      } else if (ctx.conFaseReal && ctx.fase) {
        const faseTxt = faseMap[ctx.fase] || ctx.fase;
        motivo = 'Motivo: fase detectada ' + faseTxt + '.';
        fuente = 'Fuente: fase automática por fechas';
      } else {
        motivo = 'Motivo: hay fruto activo, pero aún sin fase real por fechas.';
        fuente = 'Fuente: estimación (faltan fechas)';
      }
      if (ctx.fechaCambioTxt) {
        motivo += ' Cambio sugerido desde: ' + ctx.fechaCambioTxt + '.';
      }
    }

    if (dashEstado) dashEstado.textContent = 'Actual: ' + usoTxt;
    if (dashRecomendado) dashRecomendado.textContent = 'Recomendado ahora: ' + recomendado + recomendadoSub;
    if (dashTagEstado) {
      dashTagEstado.classList.remove('is-match', 'is-mismatch');
      if ((usoRaw === 'veg' || usoRaw === 'bloom') && (recomendado === 'VEG' || recomendado === 'BLOOM')) {
        dashTagEstado.classList.add(usoRaw.toUpperCase() === recomendado ? 'is-match' : 'is-mismatch');
      }
    }
    if (dashFuente) dashFuente.textContent = fuente;
    if (dashRazon) dashRazon.textContent = motivo;
  }
  if (dashAviso) {
    const msg =
      typeof hcGetAvisoCambioNutrientePorFase === 'function'
        ? hcGetAvisoCambioNutrientePorFase('inicio')
        : null;
    if (msg) {
      dashAviso.textContent = msg;
      dashAviso.classList.remove('setup-hidden');
    } else {
      dashAviso.textContent = '';
      dashAviso.classList.add('setup-hidden');
    }
  }
  if (dashAvisoGlobal) {
    const msgGlobal =
      typeof hcGetAvisoCambioNutrientePorFase === 'function'
        ? hcGetAvisoCambioNutrientePorFase('inicio')
        : null;
    if (msgGlobal) {
      dashAvisoGlobal.textContent = msgGlobal;
      dashAvisoGlobal.classList.remove('setup-hidden');
    } else {
      dashAvisoGlobal.textContent = '';
      dashAvisoGlobal.classList.add('setup-hidden');
    }
  }
  // Dashboard inicio — banner torre
  const dashTorreEmoji  = document.getElementById('dashTorreEmoji');
  const dashTorreNombre = document.getElementById('dashTorreNombre');
  const dashTorreInfo   = document.getElementById('dashTorreInfo');
  const torre = getTorreActiva();
  if (dashTorreEmoji)  dashTorreEmoji.textContent  = emojiSistemaUiPorTorre(torre);
  if (dashTorreNombre) dashTorreNombre.textContent  = (torre.nombre || '').trim() || 'Instalación';
  if (dashTorreInfo) {
    const niv = cfg.numNiveles || 5;
    const ces = cfg.numCestas  || 5;
    const vMax = getVolumenDepositoMaxLitros(cfg);
    const vMez = getVolumenMezclaLitros(cfg);
    const volTxt =
      vMax != null && Number.isFinite(vMax) && vMax > 0
        ? vMez != null && Number.isFinite(vMez) && vMez < vMax - 0.05
          ? vMax + 'L máx · ' + vMez + 'L mezcla'
          : vMax + 'L'
        : 'L depósito por indicar';
    const nutTxt = nut ? nut.nombre : 'nutriente por elegir';
    const estadoTxt = sistemaEstaOperativa(cfg) ? 'operativa' : 'stand-by';
    dashTorreInfo.textContent = niv + ' niveles · ' + ces + ' cestas · ' + volTxt + ' · ' + nutTxt + ' · ' + estadoTxt;
  }

  // Pestaña Medir — banner torre
  const medirTorreEmoji  = document.getElementById('medirTorreEmoji');
  const medirTorreNombre = document.getElementById('medirTorreNombre');
  if (medirTorreEmoji)  medirTorreEmoji.textContent  = emojiSistemaUiPorTorre(torre);
  if (medirTorreNombre) medirTorreNombre.textContent  = (torre.nombre || '').trim() || 'Instalación';
  actualizarEstadoOperativaUI();

  try { refreshUbicacionInstalacionUI(); } catch (_) {}

  try {
    if (typeof refreshEcTransicionAvisoAll === 'function') refreshEcTransicionAvisoAll();
  } catch (_) {}

  refreshConsejosSiVisible();
}

function cambiarNutriente() {
  // Abrir modal rápido de selección de nutriente
  const overlay = document.createElement('div');
  overlay.className = 'nut-quick-overlay';
  overlay.id = 'nutrienteQuickModal';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Nutriente de esta torre');

  const nutCur = typeof getNutrienteTorre === 'function' ? getNutrienteTorre() : null;
  const nutActual = (nutCur && nutCur.id) || '';

  overlay.innerHTML = '<div class="nut-quick-sheet">' +
    '<div class="nut-quick-handle"></div>' +
    '<div class="nut-quick-title">🧪 Nutriente de esta torre</div>' +
    NUTRIENTES_DB.filter(n => n.id !== 'otro').map(n => {
      const activo = n.id === nutActual;
      const check = activo ? '<span class="nut-quick-check">&#10003;</span>' : '';
      return [
        '<div data-nut-id="' + n.id + '" class="nut-quick-row' + (activo ? ' nut-quick-row--active' : '') + '">',
        '<span class="nut-quick-flag">' + n.bandera + '</span>',
        '<div class="nut-quick-body"><div class="nut-quick-name">' + n.nombre + '</div>',
        '<div class="nut-quick-detail">' + n.detalle + '</div></div>',
        check + '</div>'
      ].join('');
    }).join('')
    +
    '<div id="nutOtroBtn" class="nut-quick-otro">' +
      '<span class="nut-quick-flag">🔬</span>' +
      '<div class="nut-quick-body"><div class="nut-quick-name">Otra marca</div>' +
      '<div class="nut-quick-detail">Configurar manualmente</div></div></div>' +
    '<button id="nutCancelarBtn" type="button" class="nut-quick-cancel">' +
      'Cancelar</button>' +
    '</div>';

  const cerrarNutModal = () => {
    a11yDialogClosed(overlay);
    overlay.remove();
  };
  overlay.onclick = (e) => { if (e.target === overlay) cerrarNutModal(); };
  document.body.appendChild(overlay);
  a11yDialogOpened(overlay);
  // Event delegation for nutriente cards
  overlay.querySelectorAll('[data-nut-id]').forEach(el => {
    el.addEventListener('click', function() {
      seleccionarNutrienteRapido(this.getAttribute('data-nut-id'));
    });
  });
  const otroBtn    = document.getElementById('nutOtroBtn');
  const cancelarBtn = document.getElementById('nutCancelarBtn');
  if (otroBtn) otroBtn.addEventListener('click', () => seleccionarNutrienteRapido('otro'));
  if (cancelarBtn) cancelarBtn.addEventListener('click', cerrarNutModal);
}

function seleccionarNutrienteRapido(id) {
  if (!state.configTorre) state.configTorre = {};
  state.configTorre.nutriente = id;
  saveState();
  const nutM = document.getElementById('nutrienteQuickModal');
  if (nutM) {
    a11yDialogClosed(nutM);
    nutM.remove();
  }
  aplicarConfigTorre();
  actualizarBadgesNutriente();
  updateDashboard();
  updateTorreStats();
  const nut = getNutrienteTorre();
  showToast(
    nut
      ? 'Nutriente activo: ' + nut.nombre + ' · dosis y checklist actualizados'
      : 'Nutriente guardado'
  );
}

// ══════════════════════════════════════════════════
// NOTIFICACIONES LOCALES
// ══════════════════════════════════════════════════

async function pedirPermisoNotificaciones() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  const perm = await Notification.requestPermission();
  return perm === 'granted';
}

async function enviarNotificacion(titulo, cuerpo, icono) {
  const ok = await pedirPermisoNotificaciones();
  if (!ok) return;
  new Notification(titulo, {
    body:  cuerpo,
    icon:  icono || '/icon-192.png',
    badge: '/icon-72.png',
    tag:   'hydro-cannabis-' + Date.now(),
  });
}

function ensureNotifOpciones() {
  if (typeof normalizarNotifOpcionesEnState === 'function') {
    normalizarNotifOpcionesEnState(state);
  }
  if (!state.notifOpciones || typeof state.notifOpciones !== 'object') {
    state.notifOpciones = { panelInicioColapsado: false };
  } else if (typeof state.notifOpciones.panelInicioColapsado !== 'boolean') {
    state.notifOpciones.panelInicioColapsado = false;
  }
}

function persistNotifOpciones() {
  ensureNotifOpciones();
  initTorres();
  const i = state.torreActiva || 0;
  const slot = state.torres && state.torres[i];
  if (!slot) return;
  if (!slot.notifOpciones || typeof slot.notifOpciones !== 'object') {
    slot.notifOpciones = { recarga: false, medicion: false, cosecha: false };
  }
  const nr = document.getElementById('notifOptRecarga');
  const nm = document.getElementById('notifOptMedicion');
  const nc = document.getElementById('notifOptCosecha');
  slot.notifOpciones.recarga = !!(nr && nr.checked);
  slot.notifOpciones.medicion = !!(nm && nm.checked);
  slot.notifOpciones.cosecha = !!(nc && nc.checked);
  saveState();
}

function refreshDashNotificacionesUI() {
  ensureNotifOpciones();
  initTorres();
  const fs = document.getElementById('dashNotifPrefsFieldset');
  const hint = document.getElementById('dashNotifPrefsHint');
  const panel = document.getElementById('panelNotifPrefsInicio');
  const btn = document.getElementById('btnNotifPrefsInicio');
  const nr = document.getElementById('notifOptRecarga');
  const nm = document.getElementById('notifOptMedicion');
  const nc = document.getElementById('notifOptCosecha');
  const panelCol = !!state.notifOpciones.panelInicioColapsado;
  const i = state.torreActiva || 0;
  const slot = state.torres && state.torres[i];
  const o =
    slot && slot.notifOpciones && typeof slot.notifOpciones === 'object'
      ? slot.notifOpciones
      : { recarga: false, medicion: false, cosecha: false };
  if (panel) panel.hidden = panelCol;
  if (btn) btn.setAttribute('aria-expanded', panelCol ? 'false' : 'true');
  if (nr) nr.checked = !!o.recarga;
  if (nm) nm.checked = !!o.medicion;
  if (nc) nc.checked = !!o.cosecha;
  const granted = 'Notification' in window && Notification.permission === 'granted';
  if (fs) fs.disabled = !granted;
  if (hint) hint.classList.toggle('setup-hidden', granted);
}

function programarRecordatorios() {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  ensureNotifOpciones();
  initTorres();
  const ahora = new Date();
  const torres = state.torres;
  if (!Array.isArray(torres) || torres.length === 0) return;

  torres.forEach((slot, slotIdx) => {
    if (!slot || !slot.notifOpciones) return;
    const prefs = slot.notifOpciones;
    const nombreTorre = (slot.nombre && String(slot.nombre).trim()) || 'Instalación ' + (slotIdx + 1);
    const cfg = slot.config || {};
    const sis =
      typeof etiquetaSistemaHidroponicoBreve === 'function' ? etiquetaSistemaHidroponicoBreve(cfg) : '';
    const sisTxt = sis ? 'Instalación ' + sis + ': ' : '';

    if (prefs.recarga && slot.ultimaRecarga) {
      const ultima = new Date(slot.ultimaRecarga);
      const diasDesde = Math.floor((ahora - ultima) / 86400000);
      if (diasDesde >= 14) {
        enviarNotificacion(
          '💧 Hydro Cannabis — Recarga pendiente · ' + nombreTorre,
          sisTxt +
            'En «' +
            nombreTorre +
            '» han pasado ' +
            diasDesde +
            ' días desde la última recarga completa (vaciado + mezcla). Revisa el checklist en la app.',
          ''
        );
      }
    }

    if (prefs.medicion && slot.mediciones && slot.mediciones.length > 0) {
      const ultimaMed = slot.mediciones[0];
      const hoy = ahora.toLocaleDateString('es-ES');
      if (ultimaMed.fecha !== hoy) {
        const diasSinMedir = slot.mediciones[0].fecha
          ? Math.floor(
              (ahora - new Date(slot.mediciones[0].fecha.split('/').reverse().join('-'))) / 86400000
            )
          : 0;
        if (diasSinMedir >= 2) {
          enviarNotificacion(
            '📊 Hydro Cannabis — Mide hoy · ' + nombreTorre,
            'En «' +
              nombreTorre +
              '» llevas ' +
              diasSinMedir +
              ' días sin registrar mediciones. Mide EC, pH y temperatura.',
            ''
          );
        }
      }
    }

    if (prefs.cosecha && Array.isArray(slot.torre)) {
      const numN = cfg.numNiveles || (typeof NUM_NIVELES !== 'undefined' ? NUM_NIVELES : 8);
      const numC = cfg.numCestas || (typeof NUM_CESTAS !== 'undefined' ? NUM_CESTAS : 5);
      let cultivosListos = 0;
      const muestras = [];
      for (let n = 0; n < numN && n < slot.torre.length; n++) {
        const row = slot.torre[n] || [];
        for (let ci = 0; ci < Math.min(numC, row.length); ci++) {
          const c = row[ci];
          if (!c || !c.variedad || !c.fecha) continue;
          const cultN = getCultivoDB(c.variedad);
          const dias =
            typeof getDiasEfectivosCicloBiologico === 'function'
              ? getDiasEfectivosCicloBiologico(c, cultN, ahora)
              : Math.floor((ahora - new Date(c.fecha)) / 86400000);
          const diasBase = DIAS_COSECHA[c.variedad] || 50;
          const diasTotal =
            typeof torreGetDiasCosechaObjetivo === 'function'
              ? torreGetDiasCosechaObjetivo(diasBase, cfg)
              : diasBase;
          if (dias >= diasTotal) {
            cultivosListos++;
            if (muestras.length < 2) {
              const labN = cultivoNombreLista(getCultivoDB(c.variedad), c.variedad);
              muestras.push(labN + ' (N' + (n + 1) + '·C' + (ci + 1) + ')');
            }
          }
        }
      }
      if (cultivosListos > 0) {
        const detalle =
          muestras.length > 0
            ? ' Ejemplos: ' + muestras.join(', ') + (cultivosListos > muestras.length ? '…' : '') + '.'
            : '';
        enviarNotificacion(
          '✂️ Hydro Cannabis — Cosecha lista · ' + nombreTorre,
          'En «' +
            nombreTorre +
            '» tienes ' +
            cultivosListos +
            ' cultivo' +
            (cultivosListos === 1 ? '' : 's') +
            ' listos para cosechar.' +
            detalle,
          ''
        );
      }
    }
  });

  if (typeof getRecomendacionEcPhTorre !== 'function') return;
  const prevT = state.torre;
  const prevC = state.configTorre;
  try {
    torres.forEach((slot, i) => {
      if (!slot || !slot.notifOpciones || !slot.notifOpciones.medicion) return;
      if (!slot.config) slot.config = {};
      state.torre = hcClonePlainData(slot.torre, []);
      state.configTorre = hcClonePlainData(hcNormalizarConfigSegunTipo(slot.config).config, {});
      const rec = getRecomendacionEcPhTorre();
      if (!rec || !rec.ec || !rec.ph) return;
      const firma =
        String(rec.faseDominante || 'general') +
        '|' +
        rec.ec.min +
        '-' +
        rec.ec.max +
        '|' +
        rec.ph.min +
        '-' +
        rec.ph.max;
      const prev = slot.config.ecPhRecomendacionFirma || '';
      if (prev && prev !== firma) {
        const nombreTorre = (slot.nombre && String(slot.nombre).trim()) || 'Instalación ' + (i + 1);
        enviarNotificacion(
          '🧪 Ajuste recomendado EC/pH · ' + nombreTorre,
          'En «' +
            nombreTorre +
            '»: nueva etapa detectada (' +
            (rec.faseDominante || 'general') +
            '). EC ' +
            rec.ec.min +
            '–' +
            rec.ec.max +
            ' µS/cm · pH ' +
            rec.ph.min +
            '–' +
            rec.ph.max +
            '.',
          ''
        );
      }
      slot.config.ecPhRecomendacionFirma = firma;
    });
  } finally {
    state.torre = prevT;
    state.configTorre = prevC;
  }
  saveState();
}

// Botón para activar notificaciones en pestaña inicio
function mostrarBtnNotificaciones() {
  if (!('Notification' in window)) return;
  const btn = document.getElementById('btnActivarNotif');
  if (Notification.permission === 'granted') {
    if (btn) btn.style.display = 'none';
  } else if (btn) {
    btn.style.display = 'flex';
  }
  if (typeof refreshDashNotificacionesUI === 'function') refreshDashNotificacionesUI();
}

try {
  refreshDashNotificacionesUI();
} catch (_) {}
