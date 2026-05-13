/**
 * Inicio, dashboard, tiles, recarga, GPS meteo.
 * Tras meteo-forecast-meteo.js; antes de riego-calculo-helpers.js / riego-calculo-calcular.js.
 */

// ══════════════════════════════════════════════════
// DASHBOARD — LÓGICA
// ══════════════════════════════════════════════════

function updateDashboard() {
  try {
    if (typeof sincronizarUltimaMedicionYRecargaDesdeTorreActiva === 'function') {
      sincronizarUltimaMedicionYRecargaDesdeTorreActiva();
    }
  } catch (eSync) {}

  // Fecha y saludo
  const now = new Date();
  const hora = now.getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches';
  const greetEl = document.getElementById('dashGreeting');
  const fechaEl = document.getElementById('dashFecha');
  if (greetEl) greetEl.textContent = saludo;
  if (fechaEl) {
    fechaEl.textContent =
      now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  // Última medición
  const elUltima = document.getElementById('dashUltimaMedicion');
  if (elUltima) {
    if (state.ultimaMedicion) {
      const m = state.ultimaMedicion;
      elUltima.textContent = `Última medición: ${m.fecha} ${m.hora}`;
      updateTiles(m);
    } else {
      elUltima.textContent = 'Sin mediciones aún';
      updateTiles(null);
    }
  }

  // Torre stats
  updateDashTorre();

  // Recarga
  updateRecargaBar();

  actualizarAvisoCestasSinFecha();

  // Meteo (solo si instalación en exterior)
  try {
    applyInicioAmbienteExteriorVisibility();
  } catch (_) {}
  if (!(typeof instalacionEsUbicacionInterior === 'function' && instalacionEsUbicacionInterior())) {
    fetchMeteoAlert();
  }

  try { refreshUbicacionInstalacionUI(); } catch (_) {}

  try {
    actualizarQuickActionsNoviceMode();
  } catch (_) {}

  try { void refreshMeteoAlarmFlashDashboard(); } catch (_) {}

  try {
    if (typeof refreshDashNotificacionesUI === 'function') refreshDashNotificacionesUI();
  } catch (_) {}

  try {
    if (typeof refreshEcTransicionAvisoAll === 'function') refreshEcTransicionAvisoAll();
  } catch (_) {}

}

function getRecentMedicionesForWeekly(limit) {
  const src = Array.isArray(state.mediciones) ? state.mediciones : [];
  const only = src.filter((m) => m && (m.tipo === 'medicion' || !m.tipo));
  return only.slice(0, Math.max(1, limit || 8));
}

function getTrendDirection(values) {
  if (!Array.isArray(values) || values.length < 3) return 'flat';
  const v = values.filter((x) => Number.isFinite(Number(x))).map(Number);
  if (v.length < 3) return 'flat';
  const newest = v[0];
  const oldest = v[v.length - 1];
  const delta = newest - oldest;
  const eps = Math.max(0.01, Math.abs(oldest) * 0.03);
  if (delta > eps) return 'up';
  if (delta < -eps) return 'down';
  return 'flat';
}

function getWeeklyOutCount(entries) {
  let out = 0;
  entries.forEach((m) => {
    const ec = parseFloat(m.ec);
    const ph = parseFloat(m.ph);
    const temp = parseFloat(m.temp);
    const vol = parseFloat(m.vol);
    if (getTileClass('ec', ec) === 'bad') out++;
    if (getTileClass('ph', ph) === 'bad') out++;
    if (getTileClass('temp', temp) === 'bad') out++;
    if (getTileClass('vol', vol) === 'bad') out++;
  });
  return out;
}


function getTileClass(param, val) {
  if (param === 'ec' && typeof getDashTileClassEc === 'function') return getDashTileClassEc(val);
  if (param === 'vol' && typeof getDashTileClassVol === 'function') return getDashTileClassVol(val);
  if (isNaN(val)) return 'empty';
  const r = RANGOS[param];
  if (!r) return 'empty';
  if (val >= r.min && val <= r.max) return 'ok';
  if (val >= r.warnLow && val <= r.warnHigh) return 'warn';
  return 'bad';
}

/** Valor numérico solo en la zona grande; nombre y unidad van junto al icono. */
function formatMedicionTileValor(key, val) {
  if (val == null || (typeof val === 'number' && !Number.isFinite(val))) return '—';
  const n = typeof val === 'number' ? val : parseFloat(val);
  if (!Number.isFinite(n)) return '—';
  switch (key) {
    case 'ec':
      return String(Math.round(n));
    case 'ph':
    case 'temp':
    case 'vol':
      return (Math.round(n * 10) / 10).toFixed(1);
    default:
      return String(n);
  }
}

function updateTiles(m) {
  if (!m) {
    ['EC', 'PH', 'Temp', 'Vol'].forEach(id => {
      const tile = document.getElementById('tile' + id);
      const valEl = document.getElementById('tile' + id + 'Val');
      const statusEl = document.getElementById('tile' + id + 'Status');
      if (!tile || !valEl || !statusEl) return;
      tile.className = 'param-tile empty';
      tile.setAttribute('aria-label', 'Ir a mediciones: ' + id + ' sin datos');
      valEl.className = 'tile-value empty';
      valEl.textContent = '—';
      statusEl.className = 'tile-status empty';
      statusEl.textContent = 'Sin datos';
    });
    return;
  }
  const params = [
    { id: 'EC',   val: parseFloat(m.ec),   key: 'ec' },
    { id: 'PH',   val: parseFloat(m.ph),   key: 'ph' },
    { id: 'Temp', val: parseFloat(m.temp), key: 'temp' },
    { id: 'Vol',  val: parseFloat(m.vol),  key: 'vol' },
  ];

  const statusLabels = {
    ec:   { ok: 'Óptimo', warn: 'Vigilar', bad: 'Corregir' },
    ph:   { ok: 'Óptimo', warn: 'Vigilar', bad: 'Corregir' },
    temp: { ok: 'Óptimo', warn: 'Vigilar', bad: 'Verificar' },
    vol:  { ok: 'Correcto', warn: 'Bajo', bad: 'Reponer' },
  };

  params.forEach(p => {
    const tipo = getTileClass(p.key, p.val);
    const tile = document.getElementById('tile' + p.id);
    const valEl = document.getElementById('tile' + p.id + 'Val');
    const statusEl = document.getElementById('tile' + p.id + 'Status');
    if (!tile || !valEl || !statusEl) return;

    tile.className = `param-tile ${tipo}`;
    valEl.className = `tile-value ${tipo}`;
    valEl.textContent = formatMedicionTileValor(p.key, p.val);
    statusEl.className = `tile-status ${tipo}`;
    statusEl.textContent = statusLabels[p.key]?.[tipo] || (tipo === 'empty' ? 'Sin datos' : '');
    const valTxt = valEl.textContent || '—';
    const stTxt = statusEl.textContent || 'Sin datos';
    tile.setAttribute('aria-label', 'Ir a mediciones: ' + p.id + ' ' + valTxt + ', estado ' + stTxt);
  });
}

function updateDashTorre() {
  const elP = document.getElementById('dashPlantas');
  const elD = document.getElementById('dashDias');
  const elC = document.getElementById('dashCosecha');
  const elX = document.getElementById('dashProxCosecha');
  if (!elP || !elD || !elC || !elX) return;
  if (typeof getNivelesActivos !== 'function' || typeof getEstado !== 'function') return;

  let plantas = 0, totalDias = 0, plantasConFecha = 0, cosechas = 0, proxDias = 999;
  const nivelesActivos = getNivelesActivos();

  nivelesActivos.forEach(n => {
    (state.torre[n] || []).forEach(c => {
      if (c.variedad) {
        plantas++;
        if (cestaTieneFechaValida(c.fecha)) {
          const cultD = getCultivoDB(c.variedad);
          const dias =
            typeof getDiasEfectivosCicloBiologico === 'function'
              ? getDiasEfectivosCicloBiologico(c, cultD, Date.now())
              : getDias(c.fecha);
          totalDias += dias;
          plantasConFecha++;
          const estado = getEstado(c.variedad, dias);
          if (estado === 'cosecha') cosechas++;
          const totalDiasVariedad = DIAS_COSECHA[c.variedad] || 50;
          const diasRestantes = Math.max(0, totalDiasVariedad - dias);
          if (diasRestantes > 0 && diasRestantes < proxDias) proxDias = diasRestantes;
        }
      }
    });
  });

  elP.textContent = plantas;
  elD.textContent = plantasConFecha > 0 ? Math.round(totalDias / plantasConFecha) : '—';
  elC.textContent = cosechas;
  elX.textContent = proxDias < 999 ? proxDias + 'd' : '—';
}

function updateRecargaBar() {
  const diasEl = document.getElementById('recargaDias');
  const barEl  = document.getElementById('recargaBar');
  const notaEl = document.getElementById('recargaNota');
  if (!diasEl || !barEl || !notaEl) return;
  hydrateRecargaVolumenAvisoMedirUI();

  const sysLbl =
    typeof etiquetaSistemaHidroponicoBreve === 'function'
      ? etiquetaSistemaHidroponicoBreve(state.configTorre || {})
      : '—';
  const sisTag = document.getElementById('recargaSistemaTag');
  const sisNombre = document.getElementById('recargaSistemaNombre');
  if (sisTag) sisTag.textContent = 'Instalación: ' + sysLbl;
  if (sisNombre) sisNombre.textContent = sysLbl;

  const evalRec = evaluarFatigaRecargaOculta();
  const diasRecarga = Math.max(1, evalRec.diasObjetivo || 15);
  const diasTranscurridos = evalRec.diasTranscurridos || 0;
  const diasRestantes = Math.max(0, evalRec.diasRestantes || 0);
  const pct = Math.min(100, evalRec.pct || 0);

  diasEl.textContent = diasRestantes > 0 ? diasRestantes + 'd' : '¡HOY!';

  const sisHint = ' · ' + sysLbl;
  let color, nota;
  if (evalRec.level === 'change') {
    color = '#dc2626';
    nota =
      '🔴 Recarga completa recomendada en ' +
      sysLbl +
      ' por estabilidad del sistema';
  } else if (pct < 60) {
    color = '#16a34a';
    nota = 'Última recarga completa hace ' + diasTranscurridos + ' días' + sisHint;
  } else if (evalRec.level === 'watch') {
    color = '#d97706';
    nota = '⚠️ Conviene vigilar la solución en ' + sysLbl + ' — revisión de recarga en ~' + diasRestantes + ' días';
  } else if (pct < 85) {
    color = '#d97706';
    nota = '⚠️ Recarga completa próxima (' + sysLbl + ') — quedan ~' + diasRestantes + ' días';
  } else {
    color = '#d97706';
    nota =
      '⚠️ Revisión de recarga en ' +
      sysLbl +
      (diasRestantes === 0 ? ' — HOY' : ' — en ~' + diasRestantes + ' días');
  }

  try {
    const av =
      typeof getRecargaVolumenAvisoCfg === 'function'
        ? getRecargaVolumenAvisoCfg()
        : { activo: true, mult: 1, consejoDesdePct: 85 };
    if (state.ultimaRecarga && av.activo && (pct >= av.consejoDesdePct || evalRec.level === 'change')) {
      const vr = getRecargaVolumenReferenciaLitros();
      const acu = sumatorioReposicionLitrosDesdeRecargaCompleta();
      const cx = buildRecargaConsejoLitrosYPlazoPlain(pct, diasTranscurridos, vr, acu);
      if (cx) nota += ' — ' + cx;
    }
  } catch (_) {}

  diasEl.style.color = color;
  barEl.style.width = pct + '%';
  barEl.style.background = color;
  notaEl.textContent = nota;
  notaEl.style.color = evalRec.level === 'change' ? '#dc2626' : '#6b7280';

  // Depósito visual: mismo objetivo que Medir — litros de mezcla si los configuraste;
  // si no, tope seguro / depósito (getVolumenMezclaLitros ya hace ese fallback).
  const vol = state.ultimaMedicion?.vol ? parseFloat(state.ultimaMedicion.vol) : 0;
  const cfgRec = state.configTorre || {};
  const volObjetivo =
    typeof getVolumenMezclaLitros === 'function'
      ? Math.max(0.5, Number(getVolumenMezclaLitros(cfgRec)) || 20)
      : (typeof getVolumenDepositoMaxLitros === 'function'
        ? Math.max(0.5, Number(getVolumenDepositoMaxLitros(cfgRec)) || 20)
        : 20);
  const volPct = vol > 0 ? Math.min(100, (vol / volObjetivo) * 100) : 50;
  const volWarn = volObjetivo * 0.8;
  const volBad = volObjetivo * 0.7;
  const faltaL = vol > 0 ? Math.max(0, Math.round((volObjetivo - vol) * 10) / 10) : 0;
  const tankFill = document.getElementById('tankWaterFill');
  const tankLabel = document.getElementById('tankVolLabel');
  if (tankFill) {
    const fillHeight = Math.round((volPct / 100) * 44);
    const yPos = 58 - fillHeight;
    tankFill.setAttribute('y', yPos);
    tankFill.setAttribute('height', fillHeight);
    const waterColor = vol < volBad ? '#dc2626' : vol < volWarn ? '#d97706' : '#3b82f6';
    tankFill.setAttribute('fill', waterColor);
  }
  if (tankLabel) {
    tankLabel.textContent = vol > 0 ? vol + 'L' : '—L';
    tankLabel.style.color = vol < volBad ? '#dc2626' : vol < volWarn ? '#d97706' : '#1d4ed8';
  }
  const volSeguroEl = document.getElementById('recargaVolSeguroHint');
  if (volSeguroEl) {
    if (vol > 0 && faltaL > 0.05) {
      volSeguroEl.style.display = 'block';
      volSeguroEl.textContent = 'Reposición segura: +' + faltaL + ' L hasta ~' + volObjetivo + ' L';
    } else if (vol > 0) {
      volSeguroEl.style.display = 'block';
      volSeguroEl.textContent = 'Nivel en zona segura (~' + volObjetivo + ' L)';
    } else {
      volSeguroEl.style.display = 'none';
      volSeguroEl.textContent = '';
    }
  }

  if (!state.ultimaRecarga) {
    diasEl.textContent = '—';
    barEl.style.width = '0%';
    notaEl.textContent =
      'Registra cuándo hiciste la última recarga completa en ' +
      sysLbl +
      ' (checklist o interruptor al guardar medición).';
    notaEl.style.color = '#6b7280';
  }

  const nPlantasTorre = contarPlantasTorreConVariedad();
  updateRecargaReposTurnoverHint();
  updateRecargaConfirmUI(
    state.ultimaRecarga ? pct : 0,
    state.ultimaRecarga ? diasTranscurridos : 0,
    state.ultimaRecarga ? diasRestantes : diasRecarga,
    nPlantasTorre
  );
}

/**
 * Aviso si hace falta recarga completa o aclarar reposición parcial (checklist / botones / posponer).
 */
function updateRecargaConfirmUI(pct, diasTranscurridos, diasRestantes, nPlantas) {
  const banner = document.getElementById('recargaUrgenteBanner');
  const snoozeHint = document.getElementById('recargaSnoozeHint');
  if (!banner || !snoozeHint) return;

  const sysLbl =
    typeof etiquetaSistemaHidroponicoBreve === 'function'
      ? etiquetaSistemaHidroponicoBreve(state.configTorre || {})
      : '';

  const snoozeMs = state.recargaSnoozeHasta;
  const snooze = snoozeMs != null && Date.now() < snoozeMs;

  snoozeHint.style.display = snooze ? 'block' : 'none';
  if (snooze) {
    const horas = Math.max(1, Math.round((snoozeMs - Date.now()) / 3600000));
    snoozeHint.textContent =
      'Recordatorio pospuesto (unas ' + horas + ' h). Sigue disponible el checklist, reposición parcial y «Recordar mañana».';
  }

  const avUi =
    typeof getRecargaVolumenAvisoCfg === 'function'
      ? getRecargaVolumenAvisoCfg()
      : { activo: true, mult: 1, consejoDesdePct: 85 };
  const evalRec = evaluarFatigaRecargaOculta();
  let turnoverPendiente = false;
  let volRBanner = null;
  let acumBanner = null;
  try {
    if (state.ultimaRecarga && avUi.activo) {
      volRBanner = getRecargaVolumenReferenciaLitros();
      acumBanner = sumatorioReposicionLitrosDesdeRecargaCompleta();
      if (
        volRBanner &&
        acumBanner &&
        acumBanner.totalLitros >= volRBanner * avUi.mult - 1e-6
      ) {
        turnoverPendiente = true;
      }
    }
  } catch (_) {}
  const consejoBanner =
    state.ultimaRecarga && avUi.activo && (pct >= avUi.consejoDesdePct || evalRec.level === 'change')
      ? buildRecargaConsejoLitrosYPlazoPlain(pct, diasTranscurridos, volRBanner, acumBanner)
      : '';

  const urgente = !snooze && (
    (!state.ultimaRecarga && nPlantas > 0) ||
    (state.ultimaRecarga && evalRec.level === 'change')
  );

  if (!urgente) {
    banner.style.display = 'none';
    banner.textContent = '';
    banner.classList.remove('bad');
    return;
  }

  banner.style.display = 'block';
  const pref = sysLbl ? sysLbl + ' — ' : '';
  if (!state.ultimaRecarga && nPlantas > 0) {
    banner.classList.add('bad');
    banner.textContent =
      pref +
      '⚠️ No hay fecha de recarga completa. Si ya vaciaste y mezclaste de cero → checklist o interruptor «Recarga completa» al guardar. Si solo rellenaste volumen (plantas/evaporación) → reposición parcial; no reinicia este contador.';
  } else if (evalRec.level === 'change') {
    banner.classList.add('bad');
    let t =
      pref +
      '🔴 Conviene vaciar, limpiar y rehacer la solución con el checklist. ';
    if (evalRec.turnoverRatio >= 1.2) {
      t += 'Se ha repuesto mucho volumen desde la última recarga completa. ';
    } else if (evalRec.phSpan >= 0.9 || evalRec.ecSpanPct >= 0.35) {
      t += 'Las últimas mediciones muestran menos estabilidad de la deseable. ';
    } else if (evalRec.tempMax >= 24.5) {
      t += 'La temperatura del agua ha sido alta y acorta la vida útil de la solución. ';
    } else {
      t += 'La combinación de días, reposiciones y estabilidad ya no compensa seguir corrigiendo sin renovar. ';
    }
    t += 'Si solo faltaba agua en el mismo cultivo, usa reposición parcial.';
    if (turnoverPendiente) {
      t +=
        ' El volumen repuesto en suma ya alcanza el umbral configurado (≥' +
        fmtMultRecargaVolumen(avUi.mult) +
        '× el volumen útil de referencia).';
    }
    if (consejoBanner && !turnoverPendiente) t += ' ' + consejoBanner;
    banner.textContent = t;
  }
}

/** Fecha registro DD/MM/AAAA → timestamp local (mediodía). */
function parseFechaRegistroReposicionMs(fecha) {
  if (!fecha || typeof fecha !== 'string') return NaN;
  const p = fecha.split('/');
  if (p.length < 3) return NaN;
  const d = parseInt(p[0], 10);
  const m = parseInt(p[1], 10) - 1;
  const y = parseInt(p[2], 10);
  if (!y || m < 0 || m > 11 || d < 1 || d > 31) return NaN;
  const dt = new Date(y, m, d, 12, 0, 0, 0);
  return dt.getTime();
}

/** Inicio del día (local) de la última recarga completa (`ultimaRecarga` en ISO YYYY-MM-DD). */
function parseUltimaRecargaCompletaDayMs() {
  const iso = state.ultimaRecarga;
  if (!iso || typeof iso !== 'string') return null;
  const day = String(iso).split('T')[0];
  const p = day.split('-');
  if (p.length !== 3) return null;
  const y = parseInt(p[0], 10);
  const mo = parseInt(p[1], 10) - 1;
  const d = parseInt(p[2], 10);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  const dt = new Date(y, mo, d, 0, 0, 0, 0);
  const t = dt.getTime();
  return Number.isFinite(t) ? t : null;
}

function parseFechaHoraRegistroMs(fecha, hora) {
  if (!fecha || typeof fecha !== 'string') return NaN;
  const p = fecha.split('/');
  if (p.length < 3) return NaN;
  const d = parseInt(p[0], 10);
  const m = parseInt(p[1], 10) - 1;
  const y = parseInt(p[2], 10);
  if (!Number.isFinite(d) || !Number.isFinite(m) || !Number.isFinite(y)) return NaN;
  let hh = 12;
  let mm = 0;
  if (hora && typeof hora === 'string') {
    const hm = hora.split(':');
    const hN = parseInt(hm[0], 10);
    const mN = parseInt(hm[1], 10);
    if (Number.isFinite(hN)) hh = Math.max(0, Math.min(23, hN));
    if (Number.isFinite(mN)) mm = Math.max(0, Math.min(59, mN));
  }
  const dt = new Date(y, m, d, hh, mm, 0, 0);
  const t = dt.getTime();
  return Number.isFinite(t) ? t : NaN;
}

function recargaValorNum(raw) {
  const n = parseFloat(String(raw == null ? '' : raw).replace(',', '.').trim());
  return Number.isFinite(n) ? n : NaN;
}

function getMedicionesDesdeUltimaRecarga(limit) {
  const desde = parseUltimaRecargaCompletaDayMs();
  const arr = Array.isArray(state.mediciones) ? state.mediciones : [];
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    const m = arr[i];
    if (!m) continue;
    const ts = parseFechaHoraRegistroMs(m.fecha, m.hora);
    if (!Number.isFinite(ts)) continue;
    if (desde != null && ts < desde) continue;
    out.push({
      ts,
      ec: recargaValorNum(m.ec),
      ph: recargaValorNum(m.ph),
      temp: recargaValorNum(m.temp),
      vol: recargaValorNum(m.vol),
    });
  }
  out.sort((a, b) => a.ts - b.ts);
  if (limit && out.length > limit) return out.slice(-limit);
  return out;
}

function getRegistroDesdeUltimaRecarga() {
  const desde = parseUltimaRecargaCompletaDayMs();
  const reg = Array.isArray(state.registro) ? state.registro : [];
  const out = [];
  for (let i = 0; i < reg.length; i++) {
    const e = reg[i];
    if (!e) continue;
    const ts = parseFechaHoraRegistroMs(e.fecha, e.hora);
    if (!Number.isFinite(ts)) continue;
    if (desde != null && ts < desde) continue;
    out.push({ ts, entry: e });
  }
  return out;
}

function getRecargaBaseDiasObjetivo(cfg, volRef) {
  const c = cfg || {};
  const tipo =
    typeof tipoInstalacionNormalizado === 'function' ? tipoInstalacionNormalizado(c) : c.tipoInstalacion;
  let dias = tipo === 'rdwc' ? 16 : tipo === 'nft' ? 14 : tipo === 'dwc' ? 13 : 12;
  const vol = Number(volRef) || 0;
  if (vol >= 200) dias += 5;
  else if (vol >= 120) dias += 3;
  else if (vol >= 80) dias += 1;
  else if (vol > 0 && vol <= 25) dias -= 2;
  else if (vol > 0 && vol <= 45) dias -= 1;
  return Math.max(9, Math.min(tipo === 'rdwc' ? 28 : 22, Math.round(dias)));
}

function evaluarFatigaRecargaOculta() {
  const cfg = state.configTorre || {};
  const volRef = getRecargaVolumenReferenciaLitros();
  const tipo =
    typeof tipoInstalacionNormalizado === 'function' ? tipoInstalacionNormalizado(cfg) : cfg.tipoInstalacion;
  const diasTranscurridos = state.ultimaRecarga
    ? Math.max(0, Math.floor((Date.now() - new Date(state.ultimaRecarga).getTime()) / 86400000))
    : 0;
  const baseDias = getRecargaBaseDiasObjetivo(cfg, volRef);
  const av =
    typeof getRecargaVolumenAvisoCfg === 'function'
      ? getRecargaVolumenAvisoCfg()
      : { activo: true, mult: 1, consejoDesdePct: 85 };
  const ac = state.ultimaRecarga ? sumatorioReposicionLitrosDesdeRecargaCompleta() : null;
  const turnoverRatio =
    volRef && ac && av.mult > 0
      ? ac.totalLitros / (volRef * av.mult)
      : 0;
  const meds = getMedicionesDesdeUltimaRecarga(8);
  const reg = getRegistroDesdeUltimaRecarga();
  const ecVals = meds.map(m => m.ec).filter(v => Number.isFinite(v) && v > 0);
  const phVals = meds.map(m => m.ph).filter(v => Number.isFinite(v) && v > 0);
  const tempVals = meds.map(m => m.temp).filter(v => Number.isFinite(v) && v > 0);
  const phSpan = phVals.length ? Math.max(...phVals) - Math.min(...phVals) : 0;
  const ecAvg = ecVals.length ? ecVals.reduce((s, v) => s + v, 0) / ecVals.length : 0;
  const ecSpanPct = ecVals.length && ecAvg > 0 ? (Math.max(...ecVals) - Math.min(...ecVals)) / ecAvg : 0;
  const tempMax = tempVals.length ? Math.max(...tempVals) : 0;
  const ajustesPh = reg.filter(r => {
    const e = r.entry || {};
    return e.tipo === 'apunte' && /ajuste de ph/i.test(String(e.apunteTexto || ''));
  }).length;
  const ajustesNut = reg.filter(r => {
    const e = r.entry || {};
    return (e.tipo === 'apunte' && /a[nñ]adidos nutrientes/i.test(String(e.apunteTexto || '')))
      || (e.tipo === 'reposicion' && e.modo === 'parcial_nutrientes');
  }).length;

  const estable =
    meds.length >= 3 &&
    phSpan <= 0.45 &&
    ecSpanPct <= 0.18 &&
    tempMax > 0 &&
    tempMax <= 22.5 &&
    ajustesPh <= 1 &&
    ajustesNut <= 1;

  let diasObjetivo = baseDias;
  if (estable && Number(volRef) >= 100) diasObjetivo += 2;
  if (estable && Number(volRef) >= 160) diasObjetivo += 1;
  if (phSpan >= 0.9 || ecSpanPct >= 0.35 || tempMax >= 25.5) diasObjetivo -= 2;
  else if (phSpan >= 0.65 || ecSpanPct >= 0.24 || tempMax >= 24) diasObjetivo -= 1;
  if (ajustesPh + ajustesNut >= 5) diasObjetivo -= 1;
  diasObjetivo = Math.max(9, Math.min(tipo === 'rdwc' ? 28 : 22, Math.round(diasObjetivo)));
  const diasMax = Math.max(diasObjetivo + (tipo === 'rdwc' ? 3 : 2), diasObjetivo);

  let pressure = 0;
  if (diasTranscurridos >= Math.round(diasObjetivo * 0.85)) pressure += 1;
  if (diasTranscurridos >= diasObjetivo) pressure += 2;
  if (diasTranscurridos >= diasMax) pressure += 2;
  if (turnoverRatio >= 0.85) pressure += 1;
  if (turnoverRatio >= 1) pressure += 2;
  if (turnoverRatio >= 1.2) pressure += 2;
  if (phSpan >= 0.6) pressure += 1;
  if (phSpan >= 0.9) pressure += 1;
  if (ecSpanPct >= 0.22) pressure += 1;
  if (ecSpanPct >= 0.35) pressure += 1;
  if (tempMax >= 24) pressure += 1;
  if (tempMax >= 26) pressure += 1;
  if (ajustesPh + ajustesNut >= 4) pressure += 1;
  if (ajustesPh + ajustesNut >= 7) pressure += 1;
  if (estable && Number(volRef) >= 100) pressure -= 1;
  if (estable && Number(volRef) >= 160) pressure -= 1;
  pressure = Math.max(0, pressure);

  const changeNeeded =
    !!state.ultimaRecarga && (
      diasTranscurridos >= diasMax ||
      turnoverRatio >= 1.2 ||
      pressure >= 5 ||
      (pressure >= 4 && diasTranscurridos >= Math.round(diasObjetivo * 0.7))
    );
  const watchOnly =
    !!state.ultimaRecarga && !changeNeeded && (
      pressure >= 2 ||
      diasTranscurridos >= diasObjetivo ||
      turnoverRatio >= 0.85
    );

  return {
    tipo,
    volRef,
    diasTranscurridos,
    diasObjetivo,
    diasMax,
    pct: diasObjetivo > 0 ? Math.min(100, (diasTranscurridos / diasObjetivo) * 100) : 0,
    diasRestantes: Math.max(0, diasObjetivo - diasTranscurridos),
    turnoverRatio,
    recargaLitros: ac && Number.isFinite(ac.totalLitros) ? ac.totalLitros : 0,
    recargaCount: ac && Number.isFinite(ac.count) ? ac.count : 0,
    phSpan,
    ecSpanPct,
    tempMax,
    ajustesPh,
    ajustesNut,
    medsCount: meds.length,
    estable,
    pressure,
    level: !state.ultimaRecarga ? 'no_data' : (changeNeeded ? 'change' : watchOnly ? 'watch' : 'ok'),
  };
}

/**
 * Litros añadidos en reposiciones parciales registradas desde la fecha de última recarga completa.
 * Misma instalación activa si hay varias torres (por nombre).
 */
function sumatorioReposicionLitrosDesdeRecargaCompleta() {
  const desde = parseUltimaRecargaCompletaDayMs();
  if (desde == null) return null;
  const reg = state.registro || [];
  const tAct = typeof getTorreActiva === 'function' ? getTorreActiva() : null;
  const nombreTorre = (tAct && tAct.nombre) ? String(tAct.nombre).trim() : '';
  const multiTorre = state.torres && state.torres.length > 1;
  let totalLitros = 0;
  let count = 0;
  for (let i = 0; i < reg.length; i++) {
    const e = reg[i];
    if (e.tipo !== 'reposicion') continue;
    if (multiTorre && nombreTorre && e.torreNombre && String(e.torreNombre).trim() !== nombreTorre) continue;
    const ts = parseFechaRegistroReposicionMs(e.fecha);
    if (!isFinite(ts) || ts < desde) continue;
    const L = typeof e.litros === 'number' ? e.litros : parseFloat(e.litros);
    if (!isFinite(L) || L <= 0) continue;
    totalLitros += L;
    count++;
  }
  return { totalLitros: Math.round(totalLitros * 10) / 10, count };
}

/** Volumen de referencia (L) para la regla «~1× solución repuesta»: litros de dosis o, si no, tope de depósito. */
function getRecargaVolumenReferenciaLitros() {
  const cfg = state.configTorre || {};
  if (typeof getVolumenNutrientesLitros === 'function') {
    const vn = getVolumenNutrientesLitros(cfg);
    if (vn != null && Number.isFinite(vn) && vn > 0) return vn;
  }
  if (typeof getVolumenMezclaLitros === 'function') {
    const v = getVolumenMezclaLitros(cfg);
    if (v != null && Number.isFinite(v) && v > 0) return v;
  }
  if (typeof getVolumenDepositoMaxLitros === 'function') {
    const m = getVolumenDepositoMaxLitros(cfg);
    if (m != null && Number.isFinite(m) && m > 0) return m;
  }
  return null;
}

function fmtLitrosReposTurnover(n) {
  const r = Math.round(n * 10) / 10;
  return (Math.abs(r % 1) < 0.05) ? String(Math.round(r)) : String(r);
}

function fmtMultRecargaVolumen(mult) {
  const r = Math.round(mult * 100) / 100;
  return String(r).replace('.', ',');
}

function hydrateRecargaVolumenAvisoMedirUI() {
  const av =
    typeof getRecargaVolumenAvisoCfg === 'function'
      ? getRecargaVolumenAvisoCfg()
      : { activo: true, mult: 1, consejoDesdePct: 85 };
  const chk = document.getElementById('chkRecargaAvisoVolumen');
  const inp = document.getElementById('inputRecargaUmbralVolumenMult');
  const sel = document.getElementById('selectRecargaConsejoDesdePct');
  if (chk) chk.checked = !!av.activo;
  // No pisar el umbral mientras el usuario escribe (vista previa vía estado + updateRecargaBar).
  if (inp && document.activeElement !== inp) inp.value = String(av.mult);
  if (sel) {
    const v = String(av.consejoDesdePct);
    if (!sel.querySelector('option[value="' + v + '"]')) {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = v + ' % del ciclo (guardado)';
      sel.appendChild(o);
    }
    sel.value = v;
  }
}

/**
 * Lee Medir → avisos por volumen y aplica a `state.configTorre`.
 * @param {{ persistDisk?: boolean, normalizeInput?: boolean }} [opts]
 *   persistDisk: guardar torre + localStorage (por defecto true).
 *   normalizeInput: reescribir el campo umbral y tratar NaN como 1 (por defecto igual que persistDisk).
 */
function applyRecargaVolumenAvisoFromMedirInputs(opts) {
  const persistDisk = !opts || opts.persistDisk !== false;
  const normalizeInput = opts && opts.normalizeInput != null ? !!opts.normalizeInput : persistDisk;
  if (typeof initTorres !== 'function') return;
  initTorres();
  if (!state.configTorre) state.configTorre = {};
  const chk = document.getElementById('chkRecargaAvisoVolumen');
  const inp = document.getElementById('inputRecargaUmbralVolumenMult');
  const sel = document.getElementById('selectRecargaConsejoDesdePct');
  if (chk) {
    if (chk.checked) delete state.configTorre.recargaAvisoPorVolumen;
    else state.configTorre.recargaAvisoPorVolumen = false;
  }
  if (inp) {
    const raw = String(inp.value || '').replace(',', '.').trim();
    if (normalizeInput) {
      let m = parseFloat(raw);
      if (!Number.isFinite(m)) m = 1;
      m = Math.round(Math.max(0.8, Math.min(1.5, m)) * 100) / 100;
      inp.value = String(m);
      if (Math.abs(m - 1) < 0.021) delete state.configTorre.recargaUmbralVolumenMult;
      else state.configTorre.recargaUmbralVolumenMult = m;
    } else {
      const endsDecSep = /[.,]$/.test(String(inp.value || '').trim());
      if (raw !== '' && !endsDecSep) {
        let m = parseFloat(raw);
        if (Number.isFinite(m)) {
          m = Math.round(Math.max(0.8, Math.min(1.5, m)) * 100) / 100;
          if (Math.abs(m - 1) < 0.021) delete state.configTorre.recargaUmbralVolumenMult;
          else state.configTorre.recargaUmbralVolumenMult = m;
        }
      }
    }
  }
  if (sel) {
    const p = parseInt(String(sel.value || '85'), 10);
    const pc = Number.isFinite(p) ? Math.round(Math.max(72, Math.min(100, p))) : 85;
    if (pc === 85) delete state.configTorre.recargaConsejoCruceDesdePct;
    else state.configTorre.recargaConsejoCruceDesdePct = pc;
  }
  if (persistDisk) {
    if (typeof guardarEstadoTorreActual === 'function') guardarEstadoTorreActual();
    if (typeof saveState === 'function') saveState();
  }
  if (typeof updateRecargaBar === 'function') updateRecargaBar();
  try {
    if (typeof actualizarResumenReposicionParcialUI === 'function') actualizarResumenReposicionParcialUI();
  } catch (_) {}
}

/** Vista previa al teclear el umbral × (sin guardar disco hasta blur/change). */
function previewRecargaVolumenAvisoMultFromInput() {
  applyRecargaVolumenAvisoFromMedirInputs({ persistDisk: false, normalizeInput: false });
}

function persistRecargaVolumenAvisoOpts() {
  applyRecargaVolumenAvisoFromMedirInputs({ persistDisk: true, normalizeInput: true });
}

/**
 * Consejo breve (texto plano) cruzando plazo por días y litros repuestos desde la última recarga completa.
 * @param {number} pct Porcentaje del ciclo de días (0–100).
 * @param {number} diasTranscurridos Días desde ultimaRecarga.
 * @param {number|null} volRef Litros de referencia (mezcla / depósito).
 * @param {{ totalLitros: number, count: number }|null} ac Acumulado de reposiciones parciales.
 */
function buildRecargaConsejoLitrosYPlazoPlain(pct, diasTranscurridos, volRef, ac) {
  if (!volRef || !ac) return '';
  const av =
    typeof getRecargaVolumenAvisoCfg === 'function'
      ? getRecargaVolumenAvisoCfg()
      : { activo: true, mult: 1, consejoDesdePct: 85 };
  if (!av.activo) return '';
  const mult = av.mult;
  const desdePct = av.consejoDesdePct;
  const ratio = volRef > 0 ? ac.totalLitros / volRef : 0;
  const haciaUmbral = volRef > 0 && mult > 0 ? ac.totalLitros / (volRef * mult) : 0;
  const pctUmbral = Math.min(100, Math.round(haciaUmbral * 100));
  const x = fmtLitrosReposTurnover(ac.totalLitros);
  const y = fmtLitrosReposTurnover(volRef);
  const mTxt = fmtMultRecargaVolumen(mult);

  if (pct < desdePct) {
    if (haciaUmbral >= 1) {
      return 'Reposición acumulada ≥' + mTxt + '× el volumen útil (' + x + '/' + y + ' L ref.): conviene planificar vaciado + checklist.';
    }
    if (haciaUmbral >= 0.75) {
      return 'Reposición acumulada alta (~' + pctUmbral + '% del umbral ' + mTxt + '×; ' + x + '/' + y + ' L): revisa EC/pH y la recarga completa.';
    }
    return '';
  }

  if (ac.count === 0) {
    return 'Sin reposiciones con litros registradas no podemos cotejar el umbral ' + mTxt + '× volumen; anota cada rellenado en Medir.';
  }
  if (haciaUmbral >= 1) {
    return 'Recomendación: ~' + diasTranscurridos + ' d desde recarga completa y repuesto ' + x + '/' + y + ' L (≥' + mTxt + '× volumen ref.). Conviene recarga completa (checklist).';
  }
  if (haciaUmbral >= 0.75) {
    return 'Recomendación: plazo alto (' + diasTranscurridos + ' d) y repuesto ' + x + '/' + y + ' L (~' + pctUmbral + '% del umbral ' + mTxt + '×). Lo habitual es recarga completa; confirma EC/pH antes de posponer.';
  }
  return (
    'Recomendación: plazo alto (' + diasTranscurridos + ' d) y repuesto ' + x + '/' + y + ' L (~' + pctUmbral + '% del umbral ' + mTxt + '×). ' +
    'Por volumen aún no alcanzas ese multiplicador en reposiciones, pero por tiempo e higiene suele tocarse recarga completa: revisa EC/pH, olor y biofilm.'
  );
}

/** Bloque informativo bajo la barra de días: reposición acumulada vs ~1× volumen de mezcla. */
function updateRecargaReposTurnoverHint() {
  const el = document.getElementById('recargaReposTurnoverHint');
  if (!el) return;
  el.classList.remove('recarga-repos-turnover--warn', 'recarga-repos-turnover--over');
  const av =
    typeof getRecargaVolumenAvisoCfg === 'function'
      ? getRecargaVolumenAvisoCfg()
      : { activo: true, mult: 1, consejoDesdePct: 85 };
  if (!av.activo) {
    el.style.display = 'none';
    el.textContent = '';
    el.innerHTML = '';
    return;
  }
  const mult = av.mult;
  const evalRec = evaluarFatigaRecargaOculta();
  if (!state.ultimaRecarga) {
    el.style.display = 'none';
    el.textContent = '';
    el.innerHTML = '';
    return;
  }
  const volRef = getRecargaVolumenReferenciaLitros();
  const ac = sumatorioReposicionLitrosDesdeRecargaCompleta();
  if (volRef == null || !ac) {
    el.style.display = 'none';
    el.textContent = '';
    el.innerHTML = '';
    return;
  }
  const ratio = volRef > 0 ? ac.totalLitros / volRef : 0;
  const haciaUmbral = volRef > 0 && mult > 0 ? ac.totalLitros / (volRef * mult) : 0;
  const diasTrHint = state.ultimaRecarga
    ? Math.floor((Date.now() - new Date(state.ultimaRecarga).getTime()) / 86400000)
    : 0;
  const diasRefHint = Math.max(1, evalRec.diasObjetivo || 15);
  const pctDiasHint = Math.min(100, (diasTrHint / diasRefHint) * 100);
  const mTxt = fmtMultRecargaVolumen(mult);
  el.style.display = 'block';
  if (haciaUmbral >= 1) el.classList.add('recarga-repos-turnover--over');
  else if (haciaUmbral >= 0.75) el.classList.add('recarga-repos-turnover--warn');
  else if (pctDiasHint >= 72 && ac.count > 0) el.classList.add('recarga-repos-turnover--warn');
  const base =
    '🔁 <strong>Reposición acumulada</strong> (orientativa): desde la última recarga completa llevas <strong>' +
    fmtLitrosReposTurnover(ac.totalLitros) +
    ' L</strong> en <strong>' +
    ac.count +
    '</strong> registro(s) de reposición parcial. Umbral configurado: <strong>' +
    mTxt +
    '×</strong> el volumen útil de referencia (<strong>' +
    fmtLitrosReposTurnover(volRef) +
    ' L</strong> en <strong>Instalación</strong>) ≈ <strong>' +
    fmtLitrosReposTurnover(Math.round(volRef * mult * 10) / 10) +
    ' L</strong> acumulados para disparar el aviso fuerte.';
  const tail =
    haciaUmbral >= 1
      ? ' <strong>Has alcanzado o superado ese umbral: planifica pronto vaciado + mezcla nueva</strong> (checklist) y revisa EC/pH.'
      : haciaUmbral >= 0.75
        ? ' Te acercas al umbral ' + mTxt + '×: vigila EC/pH y adelanta el cambio completo si la solución degrada.'
        : ac.count > 0
          ? ' Llevas ~' +
            Math.min(100, Math.round(haciaUmbral * 100)) +
            '% del umbral ' + mTxt + '×; si el plazo por días ya es alto (barra naranja/roja), prioriza recarga completa por higiene aunque no llegues al umbral en volumen.'
          : ' Sigue registrando litros en cada reposición para que el total sea fiel.';
  el.innerHTML = base + tail;
}

/** Suma litros y cuenta reposiciones parciales en los últimos `dias` (registro unificado). */
function sumatorioReposicionesParciales(dias) {
  const reg = state.registro || [];
  const ahora = Date.now();
  const limite = ahora - dias * 86400000;
  const tAct = getTorreActiva();
  const nombreTorre = (tAct && tAct.nombre) ? String(tAct.nombre).trim() : '';
  const multiTorre = state.torres && state.torres.length > 1;
  let totalLitros = 0;
  let count = 0;
  for (let i = 0; i < reg.length; i++) {
    const e = reg[i];
    if (e.tipo !== 'reposicion') continue;
    if (multiTorre && nombreTorre && e.torreNombre && String(e.torreNombre).trim() !== nombreTorre) continue;
    const ts = parseFechaRegistroReposicionMs(e.fecha);
    if (!isFinite(ts) || ts < limite) continue;
    const L = typeof e.litros === 'number' ? e.litros : parseFloat(e.litros);
    if (!isFinite(L) || L <= 0) continue;
    totalLitros += L;
    count++;
  }
  return { totalLitros: Math.round(totalLitros * 10) / 10, count };
}

/** Actualiza el texto de seguimiento bajo los botones de reposición parcial (Mediciones). */
function actualizarResumenReposicionParcialUI() {
  const el = document.getElementById('resumenReposicionParcialStats');
  if (!el) return;
  const s7 = sumatorioReposicionesParciales(7);
  const s30 = sumatorioReposicionesParciales(30);
  const multi = state.torres && state.torres.length > 1;
  const suf = multi ? ' · solo <strong>esta torre</strong>' : '';
  if (s7.count === 0 && s30.count === 0) {
    el.innerHTML =
      '📊 <span class="repos-resumen-muted">Cuando registres reposiciones con litros, aquí verás totales de <strong>7 y 30 días</strong>' +
      suf + ' para comparar ritmos (crecimiento de plantas, calor, etc.).</span>';
    return;
  }
  const fmt = function (n) {
    const r = Math.round(n * 10) / 10;
    return (Math.abs(r % 1) < 0.05) ? String(Math.round(r)) : String(r);
  };
  let extraTurn = '';
  try {
    const av =
      typeof getRecargaVolumenAvisoCfg === 'function'
        ? getRecargaVolumenAvisoCfg()
        : { activo: true, mult: 1, consejoDesdePct: 85 };
    if (state.ultimaRecarga && av.activo) {
      const volRef = getRecargaVolumenReferenciaLitros();
      const ac = sumatorioReposicionLitrosDesdeRecargaCompleta();
      if (volRef && ac && ac.count > 0 && av.mult > 0) {
        const hacia = ac.totalLitros / (volRef * av.mult);
        const pctH = Math.min(100, Math.round(hacia * 100));
        extraTurn =
          '<br><span class="repos-resumen-muted">Desde la última <strong>recarga completa</strong>: ' +
          fmt(ac.totalLitros) +
          ' L repuestos (~' +
          pctH +
          '% del umbral ' +
          String(av.mult).replace('.', ',') +
          '× sobre ' +
          fmt(volRef) +
          ' L de referencia).</span>';
      }
    }
  } catch (_) {}
  el.innerHTML =
    '📊 <strong class="repos-resumen-head">Tu rutina de reposición</strong>' + suf + ': ' +
    'últimos <strong>7 días</strong> → ' + fmt(s7.totalLitros) + ' L en <strong>' + s7.count + '</strong> vez(es) · ' +
    'últimos <strong>30 días</strong> → ' + fmt(s30.totalLitros) + ' L en <strong>' + s30.count + '</strong> · ' +
    '<span class="repos-resumen-muted">Orientativo: si sube el consumo con el tamaño del follaje o el verano, lo verás aquí.</span>' +
    extraTurn;
}

/** Litros añadidos en reposición parcial (obligatorio para registrar). */
function leerLitrosReposicionParcial() {
  const el = document.getElementById('inputReposicionParcialLitros');
  const raw = el ? String(el.value || '').trim().replace(',', '.') : '';
  const v = parseFloat(raw);
  if (!isFinite(v) || v <= 0) {
    showToast('Indica los litros añadidos (una estimación vale) para guardar la reposición en el registro.', true);
    if (el) {
      el.setAttribute('aria-invalid', 'true');
      el.focus();
    }
    return null;
  }
  if (v > 2000) {
    showToast('Cantidad fuera de rango (máx. 2000 L por registro). Si vaciaste el depósito, usa recarga completa (checklist).', true);
    if (el) {
      el.setAttribute('aria-invalid', 'true');
      el.focus();
    }
    return null;
  }
  if (el) el.removeAttribute('aria-invalid');
  return Math.round(v * 100) / 100;
}

function confirmarReposicionDeposito(modo) {
  if (typeof sistemaEstaOperativa === 'function' && !sistemaEstaOperativa()) {
    showToast(typeof getMensajeStandbyContinuar === 'function'
      ? getMensajeStandbyContinuar()
      : '⏸ Instalación en stand-by / descanso. Reactiva modo operativa para continuar.', true);
    return;
  }
  if (modo === 'con_nutrientes') {
    if (typeof intentarAbrirChecklistDesdeInicio === 'function' && !intentarAbrirChecklistDesdeInicio(false)) {
      return;
    }
    showToast('📋 Checklist de la instalación activa: vaciado, limpieza y mezcla completa (reinicia el contador al finalizar)');
    return;
  }
  const litros = leerLitrosReposicionParcial();
  if (litros == null) return;

  if (modo === 'solo_agua') {
    state.recargaSnoozeHasta = null;
    addRegistro('reposicion', { modo: 'solo_agua', icono: '💧', litros });
    guardarEstadoTorreActual();
    saveState();
    updateRecargaBar();
    const inp = document.getElementById('inputReposicionParcialLitros');
    if (inp) inp.value = '';
    if (document.getElementById('tab-historial')?.classList.contains('active')) {
      cargarHistorial();
      if (typeof histTabActiva !== 'undefined' && histTabActiva === 'registro') renderRegistro();
    }
    showToast('✅ +' + litros + ' L · reposición parcial (solo agua). Contador de recarga completa sin cambios.');
    actualizarResumenReposicionParcialUI();
    return;
  }
  if (modo === 'parcial_nutrientes') {
    state.recargaSnoozeHasta = null;
    addRegistro('reposicion', { modo: 'parcial_nutrientes', icono: '🧪', litros });
    guardarEstadoTorreActual();
    saveState();
    updateRecargaBar();
    const inp = document.getElementById('inputReposicionParcialLitros');
    if (inp) inp.value = '';
    if (document.getElementById('tab-historial')?.classList.contains('active')) {
      cargarHistorial();
      if (typeof histTabActiva !== 'undefined' && histTabActiva === 'registro') renderRegistro();
    }
    showToast('✅ +' + litros + ' L · reposición parcial con nutrientes. Mide EC/pH cuando puedas.');
    actualizarResumenReposicionParcialUI();
    return;
  }
}

function posponerRecordatorioRecarga() {
  state.recargaSnoozeHasta = Date.now() + 86400000;
  guardarEstadoTorreActual();
  saveState();
  updateRecargaBar();
  showToast('⏰ Te volvemos a avisar en 24 h');
}

let _meteoAlertInFlight = null;
let _meteoAlertRetryTimer = null;
let _meteoAlertRetryStep = 0;
const METEO_ALERT_RETRY_MS = [15000, 30000, 60000, 120000, 300000];

function clearMeteoAlertRetry() {
  if (_meteoAlertRetryTimer) {
    clearTimeout(_meteoAlertRetryTimer);
    _meteoAlertRetryTimer = null;
  }
}

/** Inicio: oculta condiciones meteorológicas y localidad si la instalación está en interior (Medir). */
function applyInicioAmbienteExteriorVisibility() {
  const wrap = document.getElementById('dashBloqueAmbienteExterior');
  if (!wrap) return;
  const int = typeof instalacionEsUbicacionInterior === 'function' && instalacionEsUbicacionInterior();
  wrap.classList.toggle('setup-hidden', !!int);
}

function programarReintentoMeteoAlert() {
  if (_meteoAlertRetryTimer) return;
  const idx = Math.min(_meteoAlertRetryStep, METEO_ALERT_RETRY_MS.length - 1);
  const espera = METEO_ALERT_RETRY_MS[idx];
  _meteoAlertRetryTimer = setTimeout(() => {
    _meteoAlertRetryTimer = null;
    void fetchMeteoAlert();
  }, espera);
  _meteoAlertRetryStep = Math.min(_meteoAlertRetryStep + 1, METEO_ALERT_RETRY_MS.length - 1);
}

async function fetchMeteoAlert() {
  if (_meteoAlertInFlight) return _meteoAlertInFlight;
  _meteoAlertInFlight = (async () => {
  const alertEl   = document.getElementById('meteoAlert');
  const iconEl    = document.getElementById('meteoAlertIcon');
  const titleEl   = document.getElementById('meteoAlertTitle');
  const textEl    = document.getElementById('meteoAlertText');

  if (typeof instalacionEsUbicacionInterior === 'function' && instalacionEsUbicacionInterior()) {
    clearMeteoAlertRetry();
    _meteoAlertRetryStep = 0;
    try {
      applyInicioAmbienteExteriorVisibility();
    } catch (_) {}
    return;
  }

  try {
    let cAlert = getCoordsActivas();
    if (!cAlert || !Number.isFinite(cAlert.lat) || !Number.isFinite(cAlert.lon)) {
      await ensureMeteoCoordsAuto();
      cAlert = getCoordsActivas();
    }
    if (!cAlert || !Number.isFinite(cAlert.lat) || !Number.isFinite(cAlert.lon)) {
      clearMeteoAlertRetry();
      _meteoAlertRetryStep = 0;
      if (alertEl && titleEl && textEl && iconEl) {
        alertEl.className = 'meteo-alert warn';
        iconEl.innerHTML = '<svg class="hc-ico hc-ico--meteo" aria-hidden="true" focusable="false"><use href="#hc-i-pin-mapa"/></svg>';
        titleEl.textContent = 'Ubicación climática no definida';
        textEl.textContent =
          'Indica municipio o coordenadas en Medir o en el asistente de configuración para ver aquí temperatura, humedad y avisos de confort (VPD).';
      }
      return;
    }

    // No bloquear la alerta por geolocalización (coords ya válidas o intentadas arriba).
    void ensureMeteoCoordsAuto();

    const baseUrl = 'https://api.open-meteo.com/v1/forecast?latitude=' + cAlert.lat + '&longitude=' + cAlert.lon +
      '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,uv_index' +
      '&hourly=temperature_2m,relative_humidity_2m' +
      '&daily=uv_index_max&forecast_days=1&timezone=auto';

    const data = await meteoFetchConFallback(baseUrl, {
      cacheKey: 'alert:current:' + baseUrl,
      timeoutMs: 3200,
      ttlMs: 45 * 1000,
    });
    if (!data || !data.current) throw new Error('Sin datos meteorológicos actuales');

    const temp = data.current.temperature_2m;
    const hum  = data.current.relative_humidity_2m;
    const viento = data.current.wind_speed_10m ?? data.current.windspeed_10m;
    const uvAhora = data.current.uv_index;
    const uvMaxHoyRaw = Array.isArray(data.daily?.uv_index_max) ? data.daily.uv_index_max[0] : null;
    const uvAhoraN = uvAhora != null && Number.isFinite(Number(uvAhora)) ? Number(uvAhora) : null;
    const uvMaxN = uvMaxHoyRaw != null && Number.isFinite(Number(uvMaxHoyRaw)) ? Number(uvMaxHoyRaw) : null;
    const fmtUv = (x) => (Math.round(x * 10) / 10).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
    /** Misma fuente que Meteo: Open‑Meteo (índice UV máx. diario); respaldo met.no + currentuvindex.com vía meteoFetchConFallback. */
    let uvTxt;
    if (uvMaxN != null && Number.isFinite(uvMaxN)) {
      if (uvMaxN > 0) {
        uvTxt = 'máx. hoy ' + fmtUv(uvMaxN);
        if (uvAhoraN != null && uvAhoraN > 0.05 && Math.abs(uvAhoraN - uvMaxN) > 0.2) {
          uvTxt += ' · ahora ' + fmtUv(uvAhoraN);
        }
      } else {
        uvTxt = 'máx. hoy 0 (muy nublado o ya cerró el día solar)';
      }
    } else if (uvAhoraN != null && Number.isFinite(uvAhoraN) && uvAhoraN > 0.05) {
      uvTxt = fmtUv(uvAhoraN);
    } else {
      uvTxt = '—';
    }
    const uv = uvAhoraN != null ? uvAhoraN : uvMaxN;

    // Calcular VPD actual (solo para lógica interna y guardado; no se muestra en título)
    const pvs = 0.6108 * Math.pow(1 + temp / 100, 8.827);
    const vpd = Math.round(pvs * (1 - hum / 100) * 100) / 100;

    let tipo, titulo, texto;

    if (vpd > 1.6) {
      tipo = 'bad';
      titulo = 'Ambiente muy seco para las hojas';
      texto = `Temp ${temp}°C · Humedad ${hum}% · UV ${uvTxt} · Viento ${viento} km/h
Riego de mayor intensidad solar activo. Revisar que las plantas no están lacias.`;
    } else if (vpd > 1.2) {
      tipo = 'warn';
      titulo = 'Transpiración alta — vigilar riego';
      texto = `Temp ${temp}°C · Humedad ${hum}% · UV ${uvTxt} · Viento ${viento} km/h
Condiciones de estrés moderado. Verificar riego de mayor intensidad solar.`;
    } else if (vpd < 0.4) {
      tipo = 'warn';
      titulo = 'Humedad ambiental muy alta';
      texto = `Temp ${temp}°C · Humedad ${hum}% · UV ${uvTxt} · Viento ${viento} km/h
Riesgo de hongos y enfermedades fúngicas. Buena ventilación recomendada.`;
    } else {
      tipo = 'ok';
      titulo = 'Condiciones favorables';
      texto = `Temp ${temp}°C · Humedad ${hum}% · UV ${uvTxt} · Viento ${viento} km/h
Las plantas están en condiciones ideales de crecimiento.`;
    }

    alertEl.className = `meteo-alert ${tipo}`;
    if (iconEl) {
      const sym = tipo === 'bad' ? 'hc-i-alert-bad' : tipo === 'warn' ? 'hc-i-alert-warn' : 'hc-i-alert-ok';
      iconEl.innerHTML = '<svg class="hc-ico hc-ico--meteo" aria-hidden="true" focusable="false"><use href="#' + sym + '"/></svg>';
    }
    titleEl.textContent = titulo;
    textEl.textContent = texto;

    // Guardar en estado para uso en riego
    state.meteoActual = { temp, hum, viento, uv, uvMaxHoy: uvMaxN, vpd };
    saveState();
    clearMeteoAlertRetry();
    _meteoAlertRetryStep = 0;

  } catch(e) {
    alertEl.className = 'meteo-alert warn';
    if (iconEl) {
      iconEl.innerHTML = '<svg class="hc-ico hc-ico--meteo" aria-hidden="true" focusable="false"><use href="#hc-i-signal"/></svg>';
    }
    const offline = (typeof navigator !== 'undefined' && navigator.onLine === false);
    titleEl.textContent = offline ? 'Sin conexión meteorológica' : 'Datos meteorológicos no disponibles ahora';
    textEl.textContent = offline
      ? 'No hay conexión a internet. Revisa la red y vuelve a intentarlo.'
      : 'Open-Meteo no ha respondido correctamente por ahora. Reintentaremos automáticamente.';
    console.warn('[MeteoAlert] fetchMeteoAlert:', e && e.message ? e.message : e);
    programarReintentoMeteoAlert();
  }
  })().finally(() => {
    _meteoAlertInFlight = null;
  });
  return _meteoAlertInFlight;
}

// ── Meteo: ubicación automática (GPS) ────────────────────────────────────────
let _meteoGeoInFlight = null;
async function ensureMeteoCoordsAuto() {
  // Evitar pedir GPS si ya se intentó hace poco (para no molestar y no repetir prompts)
  const now = Date.now();
  const last = state._meteoGeoLastTry || 0;
  if (now - last < 10 * 60 * 1000) return; // 10 min
  state._meteoGeoLastTry = now;
  saveState();

  if (!navigator.geolocation) return;
  if (_meteoGeoInFlight) return _meteoGeoInFlight;

  _meteoGeoInFlight = new Promise((resolve) => {
    const done = () => {
      try {
        resolve();
      } catch (_) {}
    };
    const hardMaxMs = 12000;
    const tHard = setTimeout(done, hardMaxMs);
    const clearHard = () => {
      clearTimeout(tHard);
    };

    navigator.geolocation.getCurrentPosition(
      pos => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          if (!state.configTorre) state.configTorre = {};

          const prevLat = parseFloat(state.configTorre.lat);
          const prevLon = parseFloat(state.configTorre.lon);
          const changed = !isFinite(prevLat) || !isFinite(prevLon) ||
            Math.abs(prevLat - lat) > 0.005 || Math.abs(prevLon - lon) > 0.005;

          state.configTorre.lat = lat;
          state.configTorre.lon = lon;

          if (changed) {
            invalidateMeteoNomiCache();
            const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=es`;
            const nomOpts = { headers: { 'User-Agent': 'HidroCultivo/1.0' } };
            if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
              nomOpts.signal = AbortSignal.timeout(6500);
            }
            fetch(url, nomOpts)
              .then(r => r.json())
              .then(data => {
                const ciudad = data.address?.city || data.address?.town || data.address?.village || data.address?.municipality || '';
                const prov = data.address?.state || data.address?.region || '';
                if (ciudad || prov) {
                  state.configTorre.ciudad = (ciudad ? ciudad : 'Ubicación actual') + (prov ? `, ${prov}` : '');
                  if (ciudad && !(state.configTorre.localidadMeteo && String(state.configTorre.localidadMeteo).trim())) {
                    state.configTorre.localidadMeteo = String(ciudad).trim();
                  }
                  saveState();
                }
              })
              .catch(() => {});
          }

          saveState();
        } finally {
          clearHard();
          done();
        }
      },
      () => {
        clearHard();
        done();
      },
      { timeout: 8000, maximumAge: 10 * 60 * 1000, enableHighAccuracy: false }
    );
  }).finally(() => { _meteoGeoInFlight = null; });

  return _meteoGeoInFlight;
}

