/**
 * Cálculo dinámico setup: volumen, cultivo, nutriente, EC, plántulas.
 * Tras los módulos hc-setup-wizard-*.js y nutrientes-catalog.js.
 */
// ══════════════════════════════════════════════════
// CÁLCULO DINÁMICO SETUP — volumen + cultivo + nutriente
// ══════════════════════════════════════════════════

// ── Nutriente de la torre activa ─────────────────────────────────────────
function getNutrienteTorre() {
  const cfg = state.configTorre || {};
  const tIdx = state.torreActiva || 0;
  const tCfg = state.torres && state.torres[tIdx] && state.torres[tIdx].config;
  const raw = tCfg ? (tCfg.nutriente || cfg.nutriente) : cfg.nutriente;
  const idNorm = raw && String(raw).trim() ? String(raw).trim() : null;
  if (!idNorm) {
    if (cfg.hcPlantillaAutogenerada) return null;
    const fb = 'canna_aqua';
    return NUTRIENTES_DB.find(n => n.id === fb) || NUTRIENTES_DB[0];
  }
  return NUTRIENTES_DB.find(n => n.id === idNorm) || NUTRIENTES_DB[0];
}

function aplicarAjusteEcObjetivoPorInstalacion(ecRange, cfg) {
  let r = ecRange;
  if (typeof torreAplicarObjetivoEcRango === 'function') r = torreAplicarObjetivoEcRango(r, cfg);
  if (typeof dwcAplicarObjetivoEcRango === 'function') r = dwcAplicarObjetivoEcRango(r, cfg);
  return r;
}

function getEcPhStrategy(cfg) {
  const c = cfg || state.configTorre || {};
  const s = String(c.ecPhEstrategia || '').toLowerCase();
  return s === 'manual' ? 'manual' : 'auto';
}

function getEcPhIntensity(cfg) {
  const c = cfg || state.configTorre || {};
  const raw = String(c.ecPhIntensidad || '').toLowerCase();
  if (raw === 'conservador' || raw === 'intensivo') return raw;
  return 'estandar';
}

function getEcObjetivoManualUs(cfg, opts) {
  const c = cfg || state.configTorre || {};
  const o = opts || {};
  const includeChecklistFallback = o.includeChecklistFallback === true;
  const a = Number(c.ecManualObjetivoUs);
  if (Number.isFinite(a) && a >= 200 && a <= 6000) return Math.round(a);
  if (includeChecklistFallback) {
    const b = Number(c.checklistEcObjetivoUs);
    if (Number.isFinite(b) && b >= 200 && b <= 6000) return Math.round(b);
  }
  return null;
}

function getPhObjetivoManualRango(cfg, nut) {
  const c = cfg || state.configTorre || {};
  const n = nut || getNutrienteTorre();
  const p0 = n && Array.isArray(n.pHRango) ? n.pHRango : [5.5, 6.5];
  const mn = Number(c.phManualObjetivoMin);
  const mx = Number(c.phManualObjetivoMax);
  if (Number.isFinite(mn) && Number.isFinite(mx) && mn >= 4.8 && mx <= 7.2 && mx >= mn + 0.1) {
    return [Math.round(mn * 10) / 10, Math.round(mx * 10) / 10];
  }
  return [p0[0], p0[1]];
}

/**
 * Días de ciclo biológico aproximados: días en hidro + media en plug de vivero si `origenPlanta === 'vivero'`.
 * La fecha de la ficha sigue siendo el trasplante al sistema; el offset alinea EC/pH y cosecha con edad real típica.
 * @param {object} c ficha cesta
 * @param {object|null} cultivo CULTIVOS_DB o null
 * @param {number} [refFinMs] instante final (ms); por defecto `Date.now()` (p. ej. día del calendario).
 */
function getDiasEfectivosCicloBiologico(c, cultivo, refFinMs) {
  if (!c || !c.fecha) return 0;
  const ms = new Date(c.fecha).getTime();
  if (!Number.isFinite(ms)) return 0;
  const fin = Number.isFinite(refFinMs) ? refFinMs : Date.now();
  let dias = Math.max(0, Math.floor((fin - ms) / 86400000));
  const cu = cultivo || (typeof getCultivoDB === 'function' ? getCultivoDB(c.variedad) : null);
  if (typeof normalizarOrigenPlanta === 'function' && normalizarOrigenPlanta(c.origenPlanta) === 'vivero') {
    dias += typeof getDiasPlantonViveroEstimado === 'function' ? getDiasPlantonViveroEstimado(cu) : 0;
  }
  return dias;
}

/**
 * Fase de cultivo según días transcurridos.
 * @param {object} opts desdeTrasplante (default true): la fecha en la ficha de torre/NFT es el **trasplante al sistema**;
 *   no se recorre la fase `germinacion` del catálogo (esa fase es previa al hidro). Solo `origenPlanta === 'germinacion'`
 *   y `desdeTrasplante === false` incluiría germinación (p. ej. semillero sin trasplantar aún).
 */
function cultivoFaseDesdeDias(cultivo, diasDesdeSiembra, opts) {
  const o = opts || {};
  const desdeTrasplante = o.desdeTrasplante !== false;
  const fases = cultivo && cultivo.fases ? cultivo.fases : null;
  if (!fases || !Number.isFinite(Number(diasDesdeSiembra)) || Number(diasDesdeSiembra) < 0) return null;
  const ordenFull = ['germinacion', 'plantula', 'vegetativo', 'prefloracion', 'floracion', 'fructificacion'];
  const orden = desdeTrasplante ? ordenFull.filter(k => k !== 'germinacion') : ordenFull;
  let acc = 0;
  for (let i = 0; i < orden.length; i++) {
    const k = orden[i];
    const f = fases[k];
    if (!f) continue;
    const d = Number(f.dias);
    if (!Number.isFinite(d) || d <= 0) continue;
    acc += d;
    if (Number(diasDesdeSiembra) <= acc) return { key: k, fase: f };
  }
  for (let i = orden.length - 1; i >= 0; i--) {
    const fk = orden[i];
    if (fases[fk]) return { key: fk, fase: fases[fk] };
  }
  return null;
}

/**
 * EC/pH «crudos» por ficha de cesta (sin cruce entre plantas ni ajuste instalación/contexto).
 * Misma base que el bucle de getRecomendacionEcPhTorre.
 */
function torreSliceEcPhCestaRaw(c, cfg) {
  cfg = cfg || state.configTorre || {};
  if (!c || !c.variedad) return null;
  const cultivo = getCultivoDB(c.variedad);
  if (!cultivo) return null;
  let ecMin = Number(cultivo.ecMin);
  let ecMax = Number(cultivo.ecMax);
  let phMin = Number(cultivo.phMin);
  let phMax = Number(cultivo.phMax);
  let faseKey = null;
  let conFasePorFecha = false;
  if (c.fecha) {
    const ms = new Date(c.fecha).getTime();
    if (Number.isFinite(ms)) {
      const dias = getDiasEfectivosCicloBiologico(c, cultivo, Date.now());
      const fd = cultivoFaseDesdeDias(cultivo, dias, { desdeTrasplante: true });
      if (fd && fd.fase) {
        conFasePorFecha = true;
        faseKey = fd.key;
        if (Array.isArray(fd.fase.ec) && fd.fase.ec.length >= 2) {
          ecMin = Number(fd.fase.ec[0]);
          ecMax = Number(fd.fase.ec[1]);
        }
        if (Array.isArray(fd.fase.ph) && fd.fase.ph.length >= 2) {
          phMin = Number(fd.fase.ph[0]);
          phMax = Number(fd.fase.ph[1]);
        }
      }
    }
  }
  if (!Number.isFinite(ecMin) || !Number.isFinite(ecMax)) return null;
  if (!Number.isFinite(phMin) || !Number.isFinite(phMax)) {
    phMin = 5.5;
    phMax = 6.5;
  }
  return { ec: { min: ecMin, max: ecMax }, ph: { min: phMin, max: phMax }, faseKey, conFasePorFecha };
}

/** EC/pH orientativos para mostrar en resumen de cesta (ajuste torre/DWC + clima), alineado con Medir. */
function torreRangoEcPhCestaParaMostrar(c, cfg) {
  const raw = torreSliceEcPhCestaRaw(c, cfg);
  if (!raw) return null;
  const ctx = getAjustesEcPhPorContexto(cfg);
  let ecRec = aplicarAjusteEcObjetivoPorInstalacion({ min: raw.ec.min, max: raw.ec.max }, cfg);
  ecRec = {
    min: Math.max(320, Math.round(ecRec.min * ctx.ecMult)),
    max: Math.max(420, Math.round(ecRec.max * ctx.ecMult)),
  };
  const phRec = {
    min: Math.round((Math.max(4.8, Math.min(6.9, raw.ph.min + ctx.phShift)) * 10)) / 10,
    max: Math.round((Math.max(5.0, Math.min(7.1, raw.ph.max + ctx.phShift)) * 10)) / 10,
  };
  return {
    ecMin: ecRec.min,
    ecMax: ecRec.max,
    phMin: phRec.min,
    phMax: phRec.max,
    faseKey: raw.faseKey,
    sinFecha: !c.fecha || !raw.conFasePorFecha,
  };
}

/** Hay al menos una cesta con variedad (para saber si los rangos EC/pH de cultivo aplican a esta instalación). */
function torreTieneAlgunaVariedadAsignada() {
  try {
    const cfg = state.configTorre || {};
    const nivelesActivos =
      typeof getNivelesActivos === 'function'
        ? getNivelesActivos()
        : Array.from({ length: cfg.numNiveles || NUM_NIVELES || 0 }, (_, i) => i);
    for (let i = 0; i < nivelesActivos.length; i++) {
      const n = nivelesActivos[i];
      const row = state.torre[n] || [];
      for (let j = 0; j < row.length; j++) {
        const c = row[j];
        if (c && String(c.variedad || '').trim()) return true;
      }
    }
  } catch (_) {}
  return false;
}

/** IDs de variedad distintos en cestas activas (solo cestas con variedad asignada). */
function torreVariedadesIdsAsignadas() {
  const set = new Set();
  try {
    const cfg = state.configTorre || {};
    const nivelesActivos =
      typeof getNivelesActivos === 'function'
        ? getNivelesActivos()
        : Array.from({ length: cfg.numNiveles || NUM_NIVELES || 0 }, (_, i) => i);
    for (let i = 0; i < nivelesActivos.length; i++) {
      const n = nivelesActivos[i];
      (state.torre[n] || []).forEach(c => {
        if (c && String(c.variedad || '').trim()) set.add(String(c.variedad).trim());
      });
    }
  } catch (_) {}
  return Array.from(set);
}

/** Si solo hay una variedad en la instalación, su id; si varias o ninguna, null. */
function torreVariedadUnicaSiSoloUna() {
  const ids = torreVariedadesIdsAsignadas();
  return ids.length === 1 ? ids[0] : null;
}

/**
 * Media aritmética de los EC mín/máx por fase en el catálogo (µS/cm), solo como referencia
 * para un objetivo manual fijo. No sustituye el rango por etapa ni la mezcla en torre.
 */
function cultivoEcMediaTodasFasesMicros(cultivo) {
  if (!cultivo || !cultivo.fases || typeof cultivo.fases !== 'object') return null;
  const orden = ['germinacion', 'plantula', 'vegetativo', 'prefloracion', 'floracion', 'fructificacion'];
  const mins = [];
  const maxs = [];
  for (let i = 0; i < orden.length; i++) {
    const f = cultivo.fases[orden[i]];
    if (!f || !Array.isArray(f.ec) || f.ec.length < 2) continue;
    const a = Number(f.ec[0]);
    const b = Number(f.ec[1]);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      mins.push(a);
      maxs.push(b);
    }
  }
  if (mins.length === 0) return null;
  const minAvg = Math.round(mins.reduce((s, x) => s + x, 0) / mins.length);
  const maxAvg = Math.round(maxs.reduce((s, x) => s + x, 0) / maxs.length);
  const midAvg = Math.round((minAvg + maxAvg) / 2);
  return { minAvg, maxAvg, midAvg, nFases: mins.length };
}

function getFirmaAvisoEcTransicion(rec) {
  if (!rec || !rec.ec || rec.estrategia !== 'auto') return '';
  const adv = rec.ec.advertencia ? '1' : '0';
  const mult = rec.contexto && Number.isFinite(rec.contexto.ecMult)
    ? Math.round(rec.contexto.ecMult * 1000)
    : 1000;
  return [rec.ec.min, rec.ec.max, rec.faseDominante || '', adv, mult].join('|');
}

/**
 * Cada cesta con variedad debe tener fecha de trasplante al hidro (modo EC automático)
 * para que checklist y metas de recarga usen EC/pH por etapa.
 */
function torreTodasLasCestasConVariedadTienenFechaValida() {
  try {
    const cfg = state.configTorre || {};
    const nivelesActivos =
      typeof getNivelesActivos === 'function'
        ? getNivelesActivos()
        : Array.from({ length: cfg.numNiveles || NUM_NIVELES || 0 }, (_, i) => i);
    for (let i = 0; i < nivelesActivos.length; i++) {
      const n = nivelesActivos[i];
      const row = state.torre[n] || [];
      for (let j = 0; j < row.length; j++) {
        const c = row[j];
        if (!c || !String(c.variedad || '').trim()) continue;
        const ms = c.fecha ? new Date(c.fecha).getTime() : NaN;
        if (!Number.isFinite(ms)) return false;
      }
    }
  } catch (_) {
    return false;
  }
  return true;
}

/** Modo EC automático: bloquear checklist hasta tener variedad y fechas en todas las cestas ocupadas. */
function torreBloqueaChecklistPorFaltaDatosCultivo() {
  const cfg = state.configTorre || {};
  if (typeof getEcPhStrategy === 'function' && getEcPhStrategy(cfg) === 'manual') return false;
  if (typeof torreTieneAlgunaVariedadAsignada !== 'function' || !torreTieneAlgunaVariedadAsignada()) return true;
  return !torreTodasLasCestasConVariedadTienenFechaValida();
}

function torreCultivoListoParaDosisEcEtapa() {
  return !torreBloqueaChecklistPorFaltaDatosCultivo();
}

/** Bloque HTML: ml orientativos para subir EC hacia la meta de recarga (misma lógica que corrección en Medir). */
function buildHtmlDosisSubirEcParaAviso(ecNum) {
  if (!Number.isFinite(ecNum)) return '';
  const cfg = state.configTorre || {};
  const nut = getNutrienteTorre();
  if (!nut) return '';
  const vol =
    typeof getVolumenNutrientesLitros === 'function' ? Number(getVolumenNutrientesLitros(cfg)) : NaN;
  if (!Number.isFinite(vol) || vol < 0.5) return '';
  const ecMeta =
    typeof getRecargaEcMetaMicroS === 'function' ? getRecargaEcMetaMicroS() : NaN;
  if (!Number.isFinite(ecMeta)) return '';
  const deficit = Math.max(0, ecMeta - ecNum);
  if (deficit < 35) return '';
  if (typeof mlCorreccionEcBaja !== 'function' || typeof ecSubePorMlCorreccion !== 'function') return '';
  const mlAB = mlCorreccionEcBaja(nut, vol, deficit);
  if (!mlAB || mlAB < 1) return '';
  const slopeEc = ecSubePorMlCorreccion(nut, vol);
  const suf = typeof dosisSufijoNutriente === 'function' ? dosisSufijoNutriente(nut) : ' ml';
  const orden = nut.orden || ['Parte A', 'Parte B'];
  const ecEst = Number.isFinite(slopeEc) ? Math.round(ecNum + mlAB * slopeEc) : null;
  const p = nut.partes || 2;
  let rows = '';
  if (p === 1) {
    rows =
      '<div class="ec-transicion-dosis-row"><span>' +
      (orden[0] || 'Nutriente') +
      '</span><span>+' +
      mlAB +
      suf +
      '</span></div>';
  } else if (p === 2) {
    rows =
      '<div class="ec-transicion-dosis-row"><span>' +
      (orden[0] || 'A') +
      '</span><span>+' +
      mlAB +
      suf +
      '</span></div>' +
      '<div class="ec-transicion-dosis-row"><span>' +
      (orden[1] || 'B') +
      '</span><span>+' +
      mlAB +
      suf +
      '</span></div>';
  } else {
    for (let i = 0; i < p; i++) {
      rows +=
        '<div class="ec-transicion-dosis-row"><span>' +
        (orden[i] || 'Parte ' + (i + 1)) +
        '</span><span>+' +
        mlAB +
        suf +
        '</span></div>';
    }
  }
  let out =
    '<div class="ec-transicion-dosis-box"><div class="ec-transicion-dosis-title">Subida orientativa hacia la meta de mezcla</div>';
  out +=
    '<p class="ec-transicion-dosis-meta">Meta alineada con checklist/recarga: <strong>' +
    ecMeta +
    ' µS/cm</strong> · volumen de referencia <strong>' +
    Math.round(vol * 10) / 10 +
    ' L</strong>. Añade las partes en bloque, homogeneiza y vuelve a medir.</p>';
  out += rows;
  if (ecEst != null) {
    out +=
      '<p class="ec-transicion-dosis-est">EC estimada tras esta adición: ~' +
      ecEst +
      ' µS/cm (orientativo).</p>';
  }
  out +=
    '<p class="ec-transicion-dosis-foot">No sustituye medir; si la mezcla estaba muy baja, sube en pasos y revisa pH.</p></div>';
  return out;
}

function buildEcTransicionAvisoHtml() {
  const cfg = state.configTorre || {};
  if (typeof getEcPhStrategy === 'function' && getEcPhStrategy(cfg) !== 'auto') return '';
  if (typeof torreTieneAlgunaVariedadAsignada === 'function' && !torreTieneAlgunaVariedadAsignada()) return '';
  const rec = getRecomendacionEcPhTorre();
  if (!rec || rec.estrategia !== 'auto' || !rec.conFaseReal) return '';
  const rawEc = state.ultimaMedicion && state.ultimaMedicion.ec != null ? String(state.ultimaMedicion.ec) : '';
  const ecNum = parseFloat(rawEc.replace(',', '.'));
  if (!Number.isFinite(ecNum)) return '';
  const umbral = Number(rec.ec.min) - 70;
  if (!(ecNum < umbral)) return '';
  const firma = getFirmaAvisoEcTransicion(rec);
  if (firma && cfg.ecAvisoEcTransicionDismissedSig === firma) return '';
  const faseMap = {
    germinacion: 'germinación',
    plantula: 'plántula',
    vegetativo: 'vegetativo',
    prefloracion: 'prefloración',
    floracion: 'floración',
    fructificacion: 'fructificación',
  };
  const faseTxt = rec.faseDominante ? (faseMap[rec.faseDominante] || rec.faseDominante) : 'actual';
  const homog =
    rec.variedadUnicaNombre &&
    !rec.mezclaFasesDistintas &&
    rec.ecAgregacion !== 'promedio_plantas' &&
    rec.ecAgregacion !== 'nutriente';
  const mismoDistintasEtapas =
    rec.variedadUnicaNombre && (rec.mezclaFasesDistintas || rec.ecAgregacion === 'promedio_plantas');
  let lead = '';
  if (homog) {
    lead =
      '<p class="ec-transicion-aviso-txt"><strong>EC por debajo de lo recomendado para tu cultivo.</strong> ' +
      'Instalación con <strong>' +
      rec.variedadUnicaNombre +
      '</strong> en fase <strong>' +
      faseTxt +
      '</strong>: la última medición es ~' +
      Math.round(ecNum) +
      ' µS/cm y el rango orientativo actual es <strong>' +
      rec.ec.min +
      '–' +
      rec.ec.max +
      ' µS/cm</strong>. Sube concentración hasta entrar en banda; el aviso permanece hasta que la medición lo confirme.</p>';
  } else if (mismoDistintasEtapas) {
    lead =
      '<p class="ec-transicion-aviso-txt"><strong>EC baja respecto al rango unido de la instalación.</strong> Misma variedad <strong>' +
      rec.variedadUnicaNombre +
      '</strong> pero distintas fechas o etapas por cesta: la última medición ~' +
      Math.round(ecNum) +
      ' µS/cm frente a <strong>' +
      rec.ec.min +
      '–' +
      rec.ec.max +
      ' µS/cm</strong>. Ajusta la mezcla y vuelve a medir.</p>';
  } else {
    lead =
      '<p class="ec-transicion-aviso-txt"><strong>EC por debajo de la etapa recomendada.</strong> Última medición ~' +
      Math.round(ecNum) +
      ' µS/cm; para la fase ' +
      faseTxt +
      ' conviene estar en torno a <strong>' +
      rec.ec.min +
      '–' +
      rec.ec.max +
      ' µS/cm</strong>. Sube concentración o dosifica hasta entrar en banda; el aviso se mantiene hasta que la medición lo refleje.</p>';
  }
  let sub = '';
  if (rec.mezclaFasesDistintas) {
    sub =
      '<p class="ec-transicion-aviso-sub">Varias etapas a la vez en la instalación: el rango mostrado une las necesidades vigentes de cada planta (no existe una «media por fase nominal» única para la mezcla).</p>';
  } else if (rec.ecAgregacion === 'promedio_plantas') {
    sub =
      '<p class="ec-transicion-aviso-sub">Rangos poco compatibles entre plantas: la app promedia el rango actual de cada una.</p>';
  }
  const dosisHtml = buildHtmlDosisSubirEcParaAviso(ecNum);
  const checklistBloqueado =
    typeof torreBloqueaChecklistPorFaltaDatosCultivo === 'function' &&
    torreBloqueaChecklistPorFaltaDatosCultivo();
  let checklistHint = '';
  if (checklistBloqueado) {
    checklistHint =
      '<p class="ec-transicion-aviso-sub">Para dosificación guiada con EC automático por etapa, completa <strong>Cultivo e instalación</strong> (variedad y fecha en cada cesta con cultivo); luego usa el checklist de recarga en Historial.</p>' +
      '<div class="ec-transicion-aviso-actions">' +
      '<button type="button" class="btn btn-primary btn-sm" onclick="goTab(\'sistema\')">Ir a Cultivo e instalación</button></div>';
  } else {
    checklistHint =
      '<div class="ec-transicion-aviso-actions">' +
      '<button type="button" class="btn btn-secondary btn-sm" onclick="goTab(\'sistema\')">Cultivo e instalación</button>' +
      '<button type="button" class="btn btn-primary btn-sm" onclick="intentarAbrirChecklistDesdeInicio(false)">Checklist depósito</button></div>';
  }
  return (
    '<div class="ec-transicion-aviso-inner">' +
    lead +
    sub +
    dosisHtml +
    checklistHint +
    '<button type="button" class="btn btn-secondary btn-sm ec-transicion-aviso-dismiss" onclick="dismissEcTransicionAviso(event)">Ocultar hasta que cambie el rango recomendado</button></div>'
  );
}

function refreshEcTransicionAvisoAll() {
  const html = typeof buildEcTransicionAvisoHtml === 'function' ? buildEcTransicionAvisoHtml() : '';
  ['ecTransicionAvisoInicio', 'ecTransicionAvisoMedir'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const show = Boolean(html);
    el.classList.toggle('setup-hidden', !show);
    el.innerHTML = show ? html : '';
  });
}

function dismissEcTransicionAviso(ev) {
  if (ev && ev.preventDefault) ev.preventDefault();
  const cfg = state.configTorre || {};
  if (typeof getEcPhStrategy === 'function' && getEcPhStrategy(cfg) !== 'auto') return;
  const rec = getRecomendacionEcPhTorre();
  const firma = getFirmaAvisoEcTransicion(rec);
  if (!firma) return;
  cfg.ecAvisoEcTransicionDismissedSig = firma;
  if (typeof guardarEstadoTorreActual === 'function') guardarEstadoTorreActual();
  if (typeof saveState === 'function') saveState();
  refreshEcTransicionAvisoAll();
}

/** Tras guardar medición: si EC entra en banda auto, quita el descarte para no bloquear futuros avisos. */
function intentarLimpiarEcAvisoTrasMedicion(ecStr) {
  if (!ecStr || !String(ecStr).trim()) return;
  const cfg = state.configTorre || {};
  if (typeof getEcPhStrategy === 'function' && getEcPhStrategy(cfg) !== 'auto') return;
  const ecNum = parseFloat(String(ecStr).replace(',', '.'));
  if (!Number.isFinite(ecNum)) return;
  const rec = getRecomendacionEcPhTorre();
  if (!rec || !rec.ec || rec.estrategia !== 'auto') return;
  if (ecNum >= Number(rec.ec.min) && ecNum <= Number(rec.ec.max)) {
    delete cfg.ecAvisoEcTransicionDismissedSig;
    if (typeof guardarEstadoTorreActual === 'function') guardarEstadoTorreActual();
  }
}

function getAjustesEcPhPorContexto(cfg) {
  const c = cfg || state.configTorre || {};
  let ecMult = 1;
  let phShift = 0;
  const meteo = state.meteoActual || {};
  const tempAmb = Number(meteo.temp);
  const uv = Number.isFinite(Number(meteo.uvMaxHoy)) ? Number(meteo.uvMaxHoy) : Number(meteo.uv);
  if (Number.isFinite(tempAmb)) {
    if (tempAmb >= 30) {
      ecMult *= 1.08;
      phShift += 0.1;
    } else if (tempAmb >= 26) {
      ecMult *= 1.04;
      phShift += 0.05;
    } else if (tempAmb <= 12) {
      ecMult *= 0.92;
      phShift -= 0.1;
    } else if (tempAmb <= 16) {
      ecMult *= 0.96;
      phShift -= 0.05;
    }
  }
  if ((c.ubicacion || 'exterior') === 'exterior' && Number.isFinite(uv)) {
    if (uv >= 8) {
      ecMult *= 1.04;
      phShift += 0.05;
    } else if (uv <= 2) {
      ecMult *= 0.97;
    }
  }
  if ((c.ubicacion || 'exterior') === 'interior') {
    const horasLuz = Number(c.horasLuz);
    if (Number.isFinite(horasLuz)) {
      if (horasLuz >= 17) ecMult *= 1.03;
      else if (horasLuz <= 12) ecMult *= 0.96;
    }
  }
  const out = {
    ecMult: Math.max(0.82, Math.min(1.2, ecMult)),
    phShift: Math.max(-0.2, Math.min(0.2, phShift)),
  };
  const intensity = getEcPhIntensity(c);
  if (intensity === 'conservador') {
    out.ecMult = Math.max(0.82, Math.min(1.2, out.ecMult * 0.96));
    out.phShift = out.phShift * 0.7;
  } else if (intensity === 'intensivo') {
    out.ecMult = Math.max(0.82, Math.min(1.2, out.ecMult * 1.04));
    out.phShift = out.phShift * 1.2;
  }
  return out;
}

function getRecomendacionEcPhTorre() {
  const cfg = state.configTorre || {};
  const strategy = getEcPhStrategy(cfg);
  let nut = getNutrienteTorre();
  if (!nut && Array.isArray(NUTRIENTES_DB) && NUTRIENTES_DB.length) {
    nut = NUTRIENTES_DB.find(n => n && n.id === 'canna_aqua') || NUTRIENTES_DB[0];
  }
  if (!nut) {
    return {
      ec: { min: 900, max: 1400 },
      ph: { min: 5.5, max: 6.5 },
      faseDominante: null,
      conFaseReal: false,
      contexto: { ecMult: 1, phShift: 0 },
      estrategia: strategy,
      ecAgregacion: 'sin_nutriente',
      mezclaFasesDistintas: false,
      ecMediaFasesCatalogo: null,
      variedadUnicaId: null,
      variedadUnicaNombre: null,
    };
  }
  if (strategy === 'manual') {
    const ecM = getEcObjetivoManualUs(cfg);
    const phM = getPhObjetivoManualRango(cfg, nut);
    const ecLo = ecM != null ? Math.max(250, ecM - 60) : (nut.ecObjetivo?.[0] || 900);
    const ecHi = ecM != null ? Math.min(6200, ecM + 60) : (nut.ecObjetivo?.[1] || 1400);
    const varUnicaMan = torreVariedadUnicaSiSoloUna();
    let ecMediaFasesCatalogo = null;
    let variedadUnicaNombre = null;
    if (varUnicaMan && typeof getCultivoDB === 'function') {
      const cuMan = getCultivoDB(varUnicaMan);
      ecMediaFasesCatalogo = cultivoEcMediaTodasFasesMicros(cuMan);
      if (cuMan) variedadUnicaNombre = cuMan.nombre || varUnicaMan;
    }
    return {
      ec: { min: ecLo, max: ecHi },
      ph: { min: phM[0], max: phM[1] },
      faseDominante: 'manual',
      conFaseReal: false,
      contexto: { ecMult: 1, phShift: 0 },
      estrategia: 'manual',
      ecAgregacion: 'manual',
      mezclaFasesDistintas: false,
      ecMediaFasesCatalogo,
      variedadUnicaId: varUnicaMan || null,
      variedadUnicaNombre,
    };
  }
  const nivelesActivos = typeof getNivelesActivos === 'function'
    ? getNivelesActivos()
    : Array.from({ length: (cfg.numNiveles || NUM_NIVELES) }, (_, i) => i);
  const rangosEc = [];
  const rangosPh = [];
  const fases = {};
  let totalConFecha = 0;
  for (let i = 0; i < nivelesActivos.length; i++) {
    const n = nivelesActivos[i];
    (state.torre[n] || []).forEach(c => {
      if (!c || !c.variedad) return;
      const slice = torreSliceEcPhCestaRaw(c, cfg);
      if (!slice) return;
      if (slice.conFasePorFecha && slice.faseKey) {
        fases[slice.faseKey] = (fases[slice.faseKey] || 0) + 1;
        totalConFecha++;
      }
      if (Number.isFinite(slice.ec.min) && Number.isFinite(slice.ec.max)) rangosEc.push({ min: slice.ec.min, max: slice.ec.max });
      if (Number.isFinite(slice.ph.min) && Number.isFinite(slice.ph.max)) rangosPh.push({ min: slice.ph.min, max: slice.ph.max });
    });
  }

  let ecRec;
  if (rangosEc.length === 0) {
    ecRec = { min: nut.ecObjetivo?.[0] || 900, max: nut.ecObjetivo?.[1] || 1400 };
  } else {
    const ecMin = Math.max(...rangosEc.map(r => r.min));
    const ecMax = Math.min(...rangosEc.map(r => r.max));
    ecRec = ecMax >= ecMin + 80
      ? { min: ecMin, max: ecMax }
      : {
          min: Math.round(rangosEc.reduce((s, r) => s + r.min, 0) / rangosEc.length),
          max: Math.round(rangosEc.reduce((s, r) => s + r.max, 0) / rangosEc.length),
          advertencia: true,
        };
  }
  ecRec = aplicarAjusteEcObjetivoPorInstalacion(ecRec, cfg);
  const ctx = getAjustesEcPhPorContexto(cfg);
  ecRec = {
    ...ecRec,
    min: Math.max(320, Math.round(ecRec.min * ctx.ecMult)),
    max: Math.max(420, Math.round(ecRec.max * ctx.ecMult)),
  };
  if (ecRec.min > ecRec.max) {
    const t = ecRec.min;
    ecRec.min = ecRec.max;
    ecRec.max = t;
  }

  let phRec;
  if (rangosPh.length === 0) {
    const b = nut && Array.isArray(nut.pHRango) ? nut.pHRango : [5.5, 6.5];
    phRec = { min: b[0], max: b[1] };
  } else {
    const pMin = Math.max(...rangosPh.map(r => r.min));
    const pMax = Math.min(...rangosPh.map(r => r.max));
    phRec = pMax >= pMin + 0.15
      ? { min: pMin, max: pMax }
      : {
          min: Math.round((rangosPh.reduce((s, r) => s + r.min, 0) / rangosPh.length) * 10) / 10,
          max: Math.round((rangosPh.reduce((s, r) => s + r.max, 0) / rangosPh.length) * 10) / 10,
          advertencia: true,
        };
  }
  phRec = {
    ...phRec,
    min: Math.round((Math.max(4.8, Math.min(6.9, Number(phRec.min) + ctx.phShift)) * 10)) / 10,
    max: Math.round((Math.max(5.0, Math.min(7.1, Number(phRec.max) + ctx.phShift)) * 10)) / 10,
  };

  const dom = Object.entries(fases).sort((a, b) => b[1] - a[1])[0];
  const ecAgregacion =
    rangosEc.length === 0
      ? 'nutriente'
      : rangosEc.length === 1
        ? 'una_planta'
        : ecRec.advertencia
          ? 'promedio_plantas'
          : 'interseccion';
  const mezclaFasesDistintas = Object.keys(fases).length > 1;
  const varUnica = torreVariedadUnicaSiSoloUna();
  let ecMediaFasesCatalogo = null;
  let variedadUnicaNombre = null;
  if (varUnica && typeof getCultivoDB === 'function') {
    const cuU = getCultivoDB(varUnica);
    ecMediaFasesCatalogo = cultivoEcMediaTodasFasesMicros(cuU);
    if (cuU) variedadUnicaNombre = cuU.nombre || varUnica;
  }
  return {
    ec: ecRec,
    ph: phRec,
    faseDominante: dom ? dom[0] : null,
    conFaseReal: totalConFecha > 0,
    contexto: ctx,
    estrategia: 'auto',
    ecAgregacion,
    mezclaFasesDistintas,
    ecMediaFasesCatalogo,
    variedadUnicaId: varUnica || null,
    variedadUnicaNombre,
  };
}

// EC óptima según cultivos plantados en la torre ACTIVA (no setup)
function getECOptimaTorre() {
  return getRecomendacionEcPhTorre().ec;
}

function getPhOptimaTorre(nut, cfg) {
  const rec = getRecomendacionEcPhTorre();
  if (rec && rec.ph) return [rec.ph.min, rec.ph.max];
  const n = nut || getNutrienteTorre();
  const b = n && Array.isArray(n.pHRango) ? n.pHRango : [5.5, 6.5];
  return [b[0], b[1]];
}

// ══════════════════════════════════════════════════
// AVISO: nutriente veg vs floración (cultivos de fruto)
// ══════════════════════════════════════════════════

function torreTieneAlgunaPlantaDeFrutoActiva() {
  try {
    const tor = state.torre || [];
    for (let n = 0; n < tor.length; n++) {
      const row = tor[n] || [];
      for (let i = 0; i < row.length; i++) {
        const c = row[i];
        if (!c || !c.variedad) continue;
        const cu = typeof getCultivoDB === 'function' ? getCultivoDB(c.variedad) : null;
        if (cu && cu.fructificacion) return true;
      }
    }
  } catch (_) {}
  return false;
}

function hcNutrienteFaseUso(nut) {
  if (!nut) return 'unknown';
  if (nut.faseUso === 'veg' || nut.faseUso === 'bloom' || nut.faseUso === 'both') return nut.faseUso;
  const nom = String(nut.nombre || '').toLowerCase();
  if (/flores|bloom|fruto|floraci|fructi|engorde|madur/.test(nom)) return 'bloom';
  if (/vega|grow|crecimiento|hoja|veg\b/.test(nom)) return 'veg';
  return 'both';
}

function hcNutrienteAlternativaFloracionId(nutId) {
  const map = {
    canna_aqua: 'canna_aqua_flores',
    canna_hydro_vega: 'canna_hydro_flores',
    campeador: 'campeador_fruto',
    vitalink_hydro_max: 'vitalink_hydro_max_bloom',
    green_planet_hydro_fuel: 'green_planet_hydro_fuel_bloom',
    ionic_grow_hydro: 'ionic_hydro_bloom',
    hesi_hidro: 'hesi_hydro_bloom',
    biobizz_bio_grow: 'biobizz_bio_bloom',
    fox_farm_grow_big: 'fox_farm_tiger_bloom',
  };
  return map[String(nutId || '')] || null;
}

function hcNutrienteAlternativaVegetativaId(nutId) {
  const map = {
    canna_aqua_flores: 'canna_aqua',
    canna_hydro_flores: 'canna_hydro_vega',
    campeador_fruto: 'campeador',
    vitalink_hydro_max_bloom: 'vitalink_hydro_max',
    green_planet_hydro_fuel_bloom: 'green_planet_hydro_fuel',
    ionic_hydro_bloom: 'ionic_grow_hydro',
    hesi_hydro_bloom: 'hesi_hidro',
    biobizz_bio_bloom: 'biobizz_bio_grow',
    fox_farm_tiger_bloom: 'fox_farm_grow_big',
  };
  return map[String(nutId || '')] || null;
}

function hcFmtFechaDMY(ms) {
  if (!Number.isFinite(ms)) return '';
  const d = new Date(ms);
  if (!Number.isFinite(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  return dd + '/' + mm + '/' + yy;
}

/** Días catálogo plántula + vegetativo (fin de ventana vegetativa antes de prefloración/floración). */
function hcDiasAcumPlantulaVegetativo(cultivo) {
  const f = cultivo && cultivo.fases ? cultivo.fases : {};
  const dPlant = Number(f.plantula && f.plantula.dias) || 0;
  const dVeg = Number(f.vegetativo && f.vegetativo.dias) || 0;
  const n = Math.round(dPlant) + Math.round(dVeg);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Días calendario desde trasplante al hidro hasta alcanzar la misma edad biológica que plántula+vegetativo
 * en el catálogo: con vivero se resta la media estimada en plug (misma referencia que getDiasEfectivosCicloBiologico).
 */
function hcDiasCalendarioHastaFinVegetativoNutriente(c, cultivo) {
  const finVeg = hcDiasAcumPlantulaVegetativo(cultivo);
  if (finVeg <= 0) return 0;
  let offset = 0;
  if (
    c &&
    typeof normalizarOrigenPlanta === 'function' &&
    normalizarOrigenPlanta(c.origenPlanta) === 'vivero' &&
    cultivo
  ) {
    const v =
      typeof getDiasPlantonViveroEstimado === 'function' ? getDiasPlantonViveroEstimado(cultivo) : 0;
    offset = Number.isFinite(v) && v > 0 ? Math.round(v) : 0;
  }
  return Math.max(0, finVeg - offset);
}

/** Fecha (ms) sugerida cambio nutriente veg→bloom: alineada con edad efectiva (vivero = media plug en cultivos-db). */
function hcGetFechaSugeridaCambioVegABloomMs() {
  try {
    const nut = typeof getNutrienteTorre === 'function' ? getNutrienteTorre() : null;
    if (!nut) return null;
    const faseUso = hcNutrienteFaseUso(nut);
    if (faseUso === 'bloom') return null;
    if (faseUso !== 'veg' && faseUso !== 'both' && faseUso !== 'unknown') return null;
    if (!torreTieneAlgunaPlantaDeFrutoActiva()) return null;
    let msMin = null;
    const cfg = state.configTorre || {};
    const idxNivel =
      typeof getNivelesActivos === 'function' ? getNivelesActivos() : [];
    const nPorCfg = Math.max(0, Math.round(Number(cfg.numNiveles) || 0));
    const nPorIdx = idxNivel.length ? Math.max(...idxNivel) + 1 : 0;
    const nPorTorre = Array.isArray(state.torre) ? state.torre.length : 0;
    const nMax = Math.max(nPorCfg, nPorIdx, nPorTorre, 1);
    for (let n = 0; n < nMax; n++) {
      const row = (state.torre && state.torre[n]) || [];
      for (let ci = 0; ci < row.length; ci++) {
        const c = row[ci];
        if (!c || !c.variedad || !c.fecha) continue;
        const cultivo = typeof getCultivoDB === 'function' ? getCultivoDB(c.variedad) : null;
        if (!cultivo || !cultivo.fructificacion || !cultivo.fases) continue;
        const t0 = new Date(c.fecha).getTime();
        if (!Number.isFinite(t0)) continue;
        const dCal = hcDiasCalendarioHastaFinVegetativoNutriente(c, cultivo);
        const msCambio = t0 + Math.max(0, dCal) * 86400000;
        if (msMin == null || msCambio < msMin) msMin = msCambio;
      }
    }
    return msMin;
  } catch (_) {
    return null;
  }
}

function hcGetRecomendacionNutrienteContexto() {
  const nut = typeof getNutrienteTorre === 'function' ? getNutrienteTorre() : null;
  const uso = hcNutrienteFaseUso(nut);
  const rec = typeof getRecomendacionEcPhTorre === 'function' ? getRecomendacionEcPhTorre() : null;
  const fase = rec && rec.faseDominante ? String(rec.faseDominante) : '';
  const conFaseReal = !!(rec && rec.conFaseReal);
  const faseFlor = fase === 'prefloracion' || fase === 'floracion' || fase === 'fructificacion';
  const hayFruto = torreTieneAlgunaPlantaDeFrutoActiva();
  const fechaCambioMs = hcGetFechaSugeridaCambioVegABloomMs();
  let recomendadoBloomPorFecha = false;
  if (hayFruto && Number.isFinite(fechaCambioMs)) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fc = new Date(fechaCambioMs);
    fc.setHours(0, 0, 0, 0);
    recomendadoBloomPorFecha = hoy.getTime() >= fc.getTime();
  }
  const recomendado = hayFruto
    ? ((conFaseReal && faseFlor) || recomendadoBloomPorFecha ? 'bloom' : 'veg')
    : 'veg';
  return {
    actual: uso,
    recomendado,
    hayFruto,
    fase,
    conFaseReal,
    faseFlor,
    fechaCambioMs,
    fechaCambioTxt: hcFmtFechaDMY(fechaCambioMs),
    recomendadoBloomPorFecha,
  };
}

/**
 * Devuelve un aviso (texto) si hay cultivo de fruto y el nutriente activo es "veg" pero la fase está en floración/fruto
 * (o no hay fechas pero conviene recordar el cambio al abrir checklist/medir).
 */
function hcGetAvisoCambioNutrientePorFase(contexto) {
  const cfg = state.configTorre || {};
  const nut = typeof getNutrienteTorre === 'function' ? getNutrienteTorre() : null;
  if (!nut) return null;

  const uso = hcNutrienteFaseUso(nut);
  const hayFruto = torreTieneAlgunaPlantaDeFrutoActiva();
  if (!hayFruto && uso !== 'bloom') return null;
  if (hayFruto && uso === 'bloom') return null;

  // Caso inverso: cultivo sin fruto con nutriente de floración/fruto.
  if (!hayFruto && uso === 'bloom') {
    const altVegId = hcNutrienteAlternativaVegetativaId(nut.id);
    const altVegNut = altVegId && typeof NUTRIENTES_DB !== 'undefined'
      ? (NUTRIENTES_DB.find(n => n && n.id === altVegId) || null)
      : null;
    const altVegTxt = altVegNut ? (' → ' + altVegNut.nombre) : (altVegId ? (' → ' + altVegId) : '');
    return '🌿 Recomendación: en cultivos de hoja/vegetativos, este nutriente de floración/fruto (' +
      (nut.nombre || 'Bloom') +
      ') no es el más adecuado como base. Mejor usar un nutriente vegetativo/de hoja' + altVegTxt +
      '. Si vas a cambiar, aprovecha la próxima recarga.';
  }

  const rec = typeof getRecomendacionEcPhTorre === 'function' ? getRecomendacionEcPhTorre() : null;
  const fase = rec && rec.faseDominante ? String(rec.faseDominante) : null;
  const conFaseReal = !!(rec && rec.conFaseReal);
  const faseFlor = fase === 'prefloracion' || fase === 'floracion' || fase === 'fructificacion';

  const altId = hcNutrienteAlternativaFloracionId(nut.id);
  const altNut = altId && typeof NUTRIENTES_DB !== 'undefined'
    ? (NUTRIENTES_DB.find(n => n && n.id === altId) || null)
    : null;
  const altTxt = altNut ? (' → ' + altNut.nombre) : (altId ? (' → ' + altId) : '');

  const ctxNut =
    typeof hcGetRecomendacionNutrienteContexto === 'function'
      ? hcGetRecomendacionNutrienteContexto()
      : null;
  if (
    ctxNut &&
    ctxNut.recomendadoBloomPorFecha &&
    (!conFaseReal || !faseFlor) &&
    (uso === 'veg' || uso === 'both' || uso === 'unknown')
  ) {
    const lead = (contexto === 'checklist' ? '⚠️ IMPRESCINDIBLE: ' : '');
    const agua = cfg.agua || state.configAgua || 'destilada';
    const calmagTxt =
      (agua !== 'grifo' && typeof usarPreferenciaCalMagRecargaGlobal === 'function' && usarPreferenciaCalMagRecargaGlobal())
        ? ' Si usas agua destilada/ósmosis, mantén CalMag también en floración: preacondiciona el agua base hasta ~0,4 mS/cm (≈400 µS/cm) antes de añadir nutrientes para evitar carencias de Ca/Mg.'
        : '';
    const fTxt = ctxNut.fechaCambioTxt || 'la fecha indicada';
    return (
      lead +
      'Cultivo de fruto: por calendario de trasplante corresponde nutriente de floración desde el ' +
      fTxt +
      '. Sigues en base vegetativa o mixta (' +
      (nut.nombre || 'actual') +
      '). Cambia a BLOOM' +
      altTxt +
      ' en esta recarga (marca el cambio en checklist PC·2).' +
      calmagTxt
    );
  }

  if (conFaseReal && faseFlor) {
    const faseMap = { prefloracion: 'prefloración', floracion: 'floración', fructificacion: 'fructificación' };
    const faseTxt = faseMap[fase] || fase;
    const lead = (contexto === 'checklist' ? '⚠️ IMPRESCINDIBLE: ' : '');
    const agua = cfg.agua || state.configAgua || 'destilada';
    const calmagTxt =
      (agua !== 'grifo' && typeof usarPreferenciaCalMagRecargaGlobal === 'function' && usarPreferenciaCalMagRecargaGlobal())
        ? ' Si usas agua destilada/ósmosis, mantén CalMag también en floración: preacondiciona el agua base hasta ~0,4 mS/cm (≈400 µS/cm) antes de añadir nutrientes para evitar carencias de Ca/Mg.'
        : '';
    // En esta fase el nutriente de floración/fruto es crítico para rendimiento y calidad.
    return lead + 'Cultivo de fruto en ' + faseTxt +
      ': estás con nutriente de crecimiento (' + (nut.nombre || 'Vega') + '). ' +
      'Cambia a un nutriente de floración/fruto' + altTxt + ' aprovechando esta recarga.' + calmagTxt;
  }

  // Antes de floración: en Inicio no molestamos; en checklist sí lo recordamos como planificación.
  if (contexto === 'inicio') return null;
  return '🍅 Cultivo de fruto: opción 1) usar nutriente de floración/fruto desde el trasplante; opción 2) empezar con crecimiento y, al entrar en prefloración/floración, cambiar a uno de floración/fruto (idealmente misma marca' +
    altTxt + ') aprovechando una recarga.';
}

/**
 * Menor «edad de ciclo» entre plantas con fecha: días en hidro + vivero si aplica (misma base que EC automático y checklist).
 */
function getMenorDiasDesdeTrasplanteEnTorreActiva() {
  let best = Infinity;
  try {
    const tor = state.torre || [];
    for (let n = 0; n < tor.length; n++) {
      const row = tor[n] || [];
      for (let i = 0; i < row.length; i++) {
        const c = row[i];
        if (!c || !c.variedad || !c.fecha) continue;
        const ms = new Date(c.fecha).getTime();
        if (!Number.isFinite(ms)) continue;
        const d =
          typeof getDiasEfectivosCicloBiologico === 'function'
            ? getDiasEfectivosCicloBiologico(c, getCultivoDB(c.variedad), Date.now())
            : Math.floor((Date.now() - ms) / 86400000);
        if (d >= 0) best = Math.min(best, d);
      }
    }
  } catch (_) {}
  return best === Infinity ? null : best;
}

/** ~12 días tras plantar: reduce EC meta y CalMag (arranque suave en hidro). Sin plantas con fecha → 1. */
const DIAS_ARRANQUE_PLANTULA_HIDRO = 12;

function getFactorArranquePlantulaHidro() {
  const d = getMenorDiasDesdeTrasplanteEnTorreActiva();
  if (d == null || d > DIAS_ARRANQUE_PLANTULA_HIDRO) return 1;
  const t = d / DIAS_ARRANQUE_PLANTULA_HIDRO;
  return Math.max(0.52, Math.min(1, 0.52 + t * 0.48));
}

/** EC meta (µS/cm) para recarga / checklist: manual en torre o intermedio óptimo automático */
function getRecargaEcMetaMicroS() {
  const cfg = state.configTorre || {};
  const strategy = getEcPhStrategy(cfg);
  if (strategy === 'manual') {
    const m = getEcObjetivoManualUs(cfg);
    if (m != null) return m;
  }
  const checklistManual = Number(cfg.checklistEcObjetivoUs);
  if (Number.isFinite(checklistManual) && checklistManual >= 200 && checklistManual <= 6000) {
    return Math.round(checklistManual);
  }
  const o = getECOptimaTorre();
  const ecLo = Number(o.min);
  const ecHi = Number(o.max);
  const mid =
    Number.isFinite(ecLo) && Number.isFinite(ecHi) && ecHi >= ecLo
      ? Math.round((ecLo + ecHi) / 2)
      : Math.round(Number(o.min) || 900);
  const fa = getFactorArranquePlantulaHidro();
  let meta = mid;
  if (fa < 1 && Number.isFinite(ecLo) && Number.isFinite(ecHi) && ecHi >= ecLo) {
    // Arranque suave: interpolar entre el suelo del rango recomendado y el punto medio — nunca por debajo de ecLo (cuadra con Medir / Cultivo e instalación)
    meta = Math.round(ecLo + (mid - ecLo) * fa);
    meta = Math.max(Math.round(ecLo), Math.min(Math.round(ecHi), meta));
  }
  return meta;
}

/**
 * Preferencia global CalMag (checklist / tipo de agua), sin mirar una marca concreta.
 * Usar en tablas que listan todas las marcas (p. ej. Consejos).
 */
function usarPreferenciaCalMagRecargaGlobal() {
  const cfg = state.configTorre || {};
  const v = cfg.checklistUsarCalMag;
  if (v === true) return true;
  if (v === false) return false;
  const agua = cfg.agua || state.configAgua || 'destilada';
  if (agua === 'grifo') return false;
  return true;
}

/**
 * ¿Incluir CalMag en esta fila de Consejos (columna destilada/ósmosis)? Respeta marca + config torre.
 * Si tu agua en Mediciones es **grifo**, las columnas blandas siguen mostrando la guía «agua blanda + CalMag».
 */
function usarCalMagConsejosFilaBlanda(nut) {
  if (!nut || !nut.calmagNecesario) return false;
  const cfg = state.configTorre || {};
  const agua = cfg.agua || state.configAgua || 'destilada';
  if (agua === 'grifo') return true;
  return usarPreferenciaCalMagRecargaGlobal();
}

/**
 * CalMag opcional: el usuario puede marcarlo en el checklist; si no ha tocado el ajuste,
 * por defecto ON con agua blanda (destilada/ósmosis) y OFF con grifo — si la línea no lleva CalMag, siempre false.
 */
function usarCalMagEnRecarga() {
  const nut = getNutrienteTorre();
  if (!nut.calmagNecesario) return false;
  return usarPreferenciaCalMagRecargaGlobal();
}

function getSetupVolumenMaxLitros() {
  if (typeof setupTipoInstalacion !== 'undefined' && setupTipoInstalacion === 'dwc') {
    const dwcCap = getDwcCapacidadLitrosFromSetupInputs();
    if (dwcCap != null && dwcCap > 0) {
      return Math.min(800, Math.max(1, Math.round(dwcCap * 10) / 10));
    }
  }
  if (typeof setupTipoInstalacion !== 'undefined' && setupTipoInstalacion === 'rdwc') {
    const ctl = parseFloat(String(document.getElementById('setupRdwcControlVolL')?.value || '40').replace(',', '.'));
    if (Number.isFinite(ctl) && ctl > 0) {
      return Math.min(800, Math.max(1, Math.round(ctl * 10) / 10));
    }
  }
  return parseInt(document.getElementById('sliderVol')?.value || 20, 10);
}

function getSetupVolumenMezclaLitros() {
  const maxL = getSetupVolumenMaxLitros();
  const raw = document.getElementById('setupVolMezclaL')?.value;
  const m = parseFloat(String(raw || '').replace(',', '.'));
  if (!Number.isFinite(m) || m <= 0) return maxL;
  if (m >= maxL - 0.02) return maxL;
  return Math.min(maxL, Math.max(0.5, Math.round(m * 10) / 10));
}

function getSetupVolumenNutrientesLitros() {
  const volMezcla = getSetupVolumenMezclaLitros();
  if (!(typeof setupTipoInstalacion !== 'undefined' && setupTipoInstalacion === 'rdwc')) return volMezcla;
  const cfgRdwc = {
    tipoInstalacion: 'rdwc',
    rdwcSites: Math.max(2, Math.min(64, parseInt(String(document.getElementById('setupRdwcSites')?.value || '4'), 10) || 4)),
    rdwcBucketVolL: Math.max(5, Math.min(200, parseFloat(String(document.getElementById('setupRdwcBucketVolL')?.value || '20').replace(',', '.')) || 20)),
    rdwcBucketTrabajoL: (function() {
      const raw = String(document.getElementById('setupRdwcBucketTrabajoL')?.value || '').replace(',', '.').trim();
      const n = parseFloat(raw);
      return Number.isFinite(n) && n > 0 ? Math.round(n * 10) / 10 : undefined;
    })(),
    rdwcControlVolL: getSetupVolumenMaxLitros(),
    volMezclaLitros: volMezcla,
  };
  if (typeof getRdwcVolumenSolucionTotalLitros === 'function') {
    const total = getRdwcVolumenSolucionTotalLitros(cfgRdwc);
    if (Number.isFinite(total) && total > 0) return total;
  }
  return volMezcla;
}

function getSetupECObjetivo() {
  // EC óptima según cultivos seleccionados en spage6
  if (setupPlantasSeleccionadas.size === 0) {
    // Sin cultivos → usar EC del nutriente
    const nut = NUTRIENTES_DB.find(n => n.id === setupNutriente) || NUTRIENTES_DB[0];
    let out = { min: nut.ecObjetivo?.[0] || 900, max: nut.ecObjetivo?.[1] || 1400, fuente: 'nutriente' };
    if (setupTipoInstalacion === 'torre' || setupTipoInstalacion === 'dwc') {
      const adj = aplicarAjusteEcObjetivoPorInstalacion(out, state.configTorre || {});
      out = { ...out, min: adj.min, max: adj.max };
    }
    return out;
  }
  // Con cultivos → calcular intersección de rangos
  const rangos = [];
  setupPlantasSeleccionadas.forEach(gKey => {
    const g = GRUPOS_CULTIVO[gKey];
    if (!g) return;
    const partes = g.ec.split('-').map(Number);
    if (partes.length === 2) rangos.push({ min: partes[0], max: partes[1] });
  });
  if (rangos.length === 0) {
    let out = { min: 900, max: 1400, fuente: 'default' };
    if (setupTipoInstalacion === 'torre' || setupTipoInstalacion === 'dwc') {
      const adj = aplicarAjusteEcObjetivoPorInstalacion(out, state.configTorre || {});
      out = { ...out, min: adj.min, max: adj.max };
    }
    return out;
  }
  const ecMin = Math.max(...rangos.map(r => r.min));
  const ecMax = Math.min(...rangos.map(r => r.max));
  if (ecMax >= ecMin + 100) {
    let out = { min: ecMin, max: ecMax, fuente: 'cultivos' };
    if (setupTipoInstalacion === 'torre' || setupTipoInstalacion === 'dwc') {
      const adj = aplicarAjusteEcObjetivoPorInstalacion(out, state.configTorre || {});
      out = { ...out, min: adj.min, max: adj.max };
    }
    return out;
  }
  // Sin intersección → promedio
  const avgMin = Math.round(rangos.reduce((s,r) => s+r.min,0) / rangos.length);
  const avgMax = Math.round(rangos.reduce((s,r) => s+r.max,0) / rangos.length);
  let out = { min: avgMin, max: avgMax, fuente: 'promedio', advertencia: true };
  if (setupTipoInstalacion === 'torre' || setupTipoInstalacion === 'dwc') {
    const adj = aplicarAjusteEcObjetivoPorInstalacion(out, state.configTorre || {});
    out = { ...out, min: adj.min, max: adj.max };
  }
  return out;
}

function calcularDosisSetup(nutId, vol, ecObj) {
  const nut = NUTRIENTES_DB.find(n => n.id === nutId) || NUTRIENTES_DB[0];
  const ecObjetivo = ecObj || getSetupECObjetivo();
  const ecMeta = Math.round((ecObjetivo.min + ecObjetivo.max) / 2); // EC central del rango

  const mlCalMag = usarCalMagEnRecarga()
    ? Math.round(nut.calmagMl * (vol / 18) * 10) / 10
    : 0;
  const ecCalMag = estimarEcCalMagMicroS(mlCalMag, vol);

  const partes = nut.partes || 2;
  const mlPorParte = [];
  for (let i = 0; i < partes; i++) {
    mlPorParte.push(mlNutrientePorParte(nut.id, i, vol));
  }
  const mlAB = mlPorParte[0];

  return { nut, vol, mlCalMag, ecCalMag, mlAB, mlPorParte, ecMeta, ecObjetivo };
}

function renderDosisSetup() {
  const preview = document.getElementById('nutProtocoloPreview');
  if (!preview) return;

  const volMax = getSetupVolumenMaxLitros();
  const vol    = getSetupVolumenNutrientesLitros();
  const volRes = getSetupVolumenMezclaLitros();
  const ecObj  = getSetupECObjetivo();
  const d      = calcularDosisSetup(setupNutriente, vol, ecObj);
  const nut    = d.nut;
  const orden  = (nut.orden && nut.orden.length >= nut.partes) ? nut.orden : ['Parte A', 'Parte B', 'Parte C'];

  let html = '<div class="nut-dosis-titulo">📋 Dosis calculadas para esta instalación</div>';

  // Contexto del cálculo
  html += '<div class="nut-dosis-ctx">' +
    (
      setupTipoInstalacion === 'rdwc'
        ? '📦 Reservorio control: <strong>' + volMax + ' L</strong>' +
          (volRes < volMax - 0.05 ? ' · mezcla en reservorio <strong>' + volRes + ' L</strong>' : '') +
          ' · solución total para dosis <strong>' + vol + ' L</strong>'
        : '📦 Depósito máx.: <strong>' + volMax + ' L</strong>' +
          (vol < volMax - 0.05 ? ' · mezcla <strong>' + vol + ' L</strong>' : '')
    ) + ' · ' +
    '⚡ EC objetivo: <strong>' + ecObj.min + '–' + ecObj.max + ' µS/cm</strong>' +
    (ecObj.fuente === 'cultivos' ? ' <span class="nut-dosis-ctx-tag--ok">(según cultivos)</span>' :
     ecObj.fuente === 'promedio' ? ' <span class="nut-dosis-ctx-tag--warn">⚠️ cultivos con EC diferente</span>' :
     ' <span class="nut-dosis-ctx-tag--muted">(según nutriente)</span>') +
    '</div>';

  // Pasos de adición en orden
  let paso = 1;
  if (usarCalMagEnRecarga() && d.mlCalMag > 0) {
    html += '<div class="nut-dosis-row">' +
      '<span class="nut-dosis-lab"><strong>' + paso++ + '.</strong> CalMag</span>' +
      '<span class="nut-dosis-val-green">' + d.mlCalMag + ' ml</span></div>';
  }

  const mPart = d.mlPorParte || [d.mlAB];
  if (nut.partes === 1) {
    html += '<div class="nut-dosis-row">' +
      '<span class="nut-dosis-lab"><strong>' + paso++ + '.</strong> ' + orden[0] + '</span>' +
      '<span class="nut-dosis-val-green">' + mPart[0] + ' ml</span></div>';
  } else if (nut.partes === 2) {
    html += '<div class="nut-dosis-row">' +
      '<span class="nut-dosis-lab"><strong>' + paso++ + '.</strong> ' + orden[0] + '</span>' +
      '<span class="nut-dosis-val-green">' + mPart[0] + ' ml</span></div>';
    html += '<div class="nut-dosis-row">' +
      '<span class="nut-dosis-lab"><strong>' + paso++ + '.</strong> ' + orden[1] + '</span>' +
      '<span class="nut-dosis-val-green">' + mPart[1] + ' ml</span></div>';
  } else if (nut.partes === 3) {
    [orden[0], orden[1], orden[2]].forEach((parte, idx) => {
      html += '<div class="nut-dosis-row">' +
        '<span class="nut-dosis-lab"><strong>' + paso++ + '.</strong> ' + parte + '</span>' +
        '<span class="nut-dosis-val-green">' + (mPart[idx] || d.mlAB) + ' ml</span></div>';
    });
  }

  // pH
  const pHRango =
    typeof torreGetPhRangoObjetivo === 'function' ? torreGetPhRangoObjetivo(nut, state.configTorre || {}) : (nut.pHRango || [5.5, 6.5]);
  html += '<div class="nut-dosis-row nut-dosis-row--ph">' +
    '<span class="nut-dosis-lab"><strong>' + paso + '.</strong> pH objetivo</span>' +
    '<span class="nut-dosis-val-blue">' + pHRango[0] + '–' + pHRango[1] + '</span></div>';

  if (nut.pHBuffer) {
    html += '<div class="nut-dosis-buffer">⚠️ Buffer integrado: sube pH solo hasta ' +
      pHRango[0] + ' y deja actuar los buffers</div>';
  }

  // Advertencia especial para GHE Flora (Micro siempre primero)
  if (nut.id === 'ghe_flora') {
    html += '<div class="nut-dosis-ghe">⚠️ GHE: añadir FloraMicro SIEMPRE PRIMERO. ' +
      'Nunca mezclar Micro directamente con Bloom.</div>';
  }
  html += '<div class="nut-dosis-foot">' +
    '* Dosis finales se confirman en el checklist tras medir EC real</div>';

  preview.classList.remove('setup-hidden');
  preview.innerHTML = html;
}

function selNutriente(id) {
  setupNutriente = id;
  document.querySelectorAll('.nutriente-card').forEach(c => {
    c.classList.remove('selected');
    c.setAttribute('aria-pressed', c.id === 'nut-' + id ? 'true' : 'false');
  });
  document.getElementById('nut-' + id)?.classList.add('selected');
  // Recalcular dosis con volumen actual y cultivos seleccionados
  renderDosisSetup();
}

function buscarCiudadSetup(query) {
  const res = buscarMunicipio(query);
  const el = document.getElementById('setupCiudadResults');
  window._setupMunicipioResultados = res;
  if (!query || query.length < 2 || res.length === 0) {
    el.classList.add('setup-hidden'); return;
  }
  el.classList.remove('setup-hidden');
  el.innerHTML = res.map(([nombre, data], idx) => `
    <button type="button" onclick="selMunicipioSetupIdx(${idx})"
      class="setup-city-option">
      <span>
        <span class="setup-city-option-name">${nombre}</span>
        <span class="setup-city-option-note">${data.nota}</span>
      </span>
      <span class="setup-city-option-ec">${data.ec} µS</span>
    </button>`).join('');
}

function selMunicipioSetupIdx(idx) {
  if (!window._setupMunicipioResultados) return;
  const [nombre, data] = window._setupMunicipioResultados[idx];
  setupCoordenadas = { lat: null, lon: null, ciudad: nombre, ec: data.ec };
  const cIn = document.getElementById('setupCiudad');
  if (cIn) cIn.value = nombre;
  document.getElementById('setupCiudadResults')?.classList.add('setup-hidden');
  document.getElementById('setupCiudadSeleccionada')?.classList.remove('setup-hidden');
  const selTxt = document.getElementById('setupCiudadSeleccionada');
  if (selTxt) {
    selTxt.textContent =
      '✅ ' + nombre + ' · EC agua: ' + data.ec + ' µS/cm · ' + data.dureza;
  }
}

async function detectarCiudadSetup() {
  if (!navigator.geolocation) return;
  try {
    const pos = await new Promise((res, rej) =>
      navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 }));
    const { latitude, longitude } = pos.coords;
    const url = 'https://nominatim.openstreetmap.org/reverse?lat=' + latitude +
      '&lon=' + longitude + '&format=json&accept-language=es';
    const data = await (await fetch(url, { headers: { 'User-Agent': 'HydroCannabis-embed/1.0' } })).json();
    const ad = data.address || {};
    const ciudad = ad.city || ad.town || ad.village || ad.municipality || '';
    const prov = ad.state || ad.region || '';
    const country = ad.country || '';
    if (ciudad) {
      const nombre = [ciudad, prov, country].filter(Boolean).join(', ');
      selCiudadSetup(nombre, latitude, longitude);
      const sel = document.getElementById('ciudadSeleccionadaSetup');
      if (sel) {
        sel.classList.remove('setup-hidden');
        sel.textContent = '📍 ' + nombre + ' (GPS)';
      }
    } else {
      showToast('No se pudo obtener el municipio desde el GPS', true);
    }
  } catch (e) {
    showToast('No se pudo detectar la ubicación', true);
  }
}

function guardarSetupYContinuar() {
  if (setupEsNuevaTorre) {
    const inpNom = document.getElementById('setupNombreInstalacionInput');
    if (inpNom) setupNombreNuevaTorre = (inpNom.value || '').trim().slice(0, 40);
    if (!setupNombreNuevaTorre) {
      showToast('Escribe un nombre para esta instalación (paso de dimensiones)', true);
      setupPagina = 1;
      renderSetupPage();
      document.getElementById('setupNombreInstalacionInput')?.focus();
      return;
    }
    if (setupTipoInstalacion !== 'torre' && setupTipoInstalacion !== 'nft' && setupTipoInstalacion !== 'dwc' && setupTipoInstalacion !== 'rdwc') {
      showToast('Elige Torre, NFT, DWC o RDWC en el primer paso del asistente', true);
      setupPagina = 0;
      renderSetupPage();
      return;
    }
  }

  const isNft = setupTipoInstalacion === 'nft';
  const isDwc = setupTipoInstalacion === 'dwc';
  const isRdwc = setupTipoInstalacion === 'rdwc';
  let niveles = parseInt(document.getElementById('sliderNiveles')?.value || 5, 10);
  let cestas  = parseInt(document.getElementById('sliderCestas')?.value  || 5, 10);
  let nftNvSlider = 4;
  if (isNft) {
    const nftMont = readNftMontajeFromSetupUi();
    if ((nftMont.disposicion === 'pared' || nftMont.disposicion === 'escalera') && nftMont.alturaBombeoCm <= 0) {
      showToast('Indica la altura de bombeo (cm) hasta el 1.º tubo: en pared y escalera es imprescindible para calcular la bomba.', true);
      setupPagina = 1;
      renderSetupPage();
      document.getElementById('nftAlturaBombeoCm')?.focus();
      return;
    }
    nftNvSlider = parseInt(document.getElementById('sliderNftCanales')?.value || 4, 10);
    cestas = parseInt(document.getElementById('sliderNftHuecos')?.value || 8, 10);
    niveles = Math.max(1, Math.min(24, nftNvSlider));
    if (nftMont.disposicion === 'mesa' && nftMont.mesaMultinivel) {
      const tiers = parseNftMesaTubosPorNivelStr(nftMont.mesaTubosStr);
      if (tiers.length >= 2) niveles = Math.min(24, tiers.reduce((a, b) => a + b, 0));
    } else if (nftMont.disposicion === 'escalera') {
      niveles = Math.min(24, Math.max(1, nftNvSlider * nftMont.escaleraCaras));
    }
  }
  let vol       = parseInt(document.getElementById('sliderVol')?.value     || 20, 10);
  const nftPend = isNft ? parseInt(document.getElementById('sliderNftPendiente')?.value || 2, 10) : null;
  if (isDwc) {
    const dwcCapG = getDwcCapacidadLitrosFromSetupInputs();
    if (dwcCapG != null && dwcCapG > 0) {
      vol = Math.min(800, Math.max(1, Math.round(dwcCapG)));
    }
  }
  if (isRdwc) {
    const cR = typeof applySetupRdwcDesdeFormulario === 'function'
      ? (applySetupRdwcDesdeFormulario() || {})
      : {};
    niveles = Math.max(1, Math.min(4, Math.round(Number(cR.rdwcRows || 1))));
    cestas = Math.max(1, Math.ceil(Number(cR.rdwcSites || 4) / niveles));
    vol = Math.max(1, Math.round(Number(cR.rdwcControlVolL || 40)));
  }

  const tipoNuevoPrevio = isNft ? 'nft' : isDwc ? 'dwc' : isRdwc ? 'rdwc' : 'torre';

  initTorres();
  const idxSlotGuardar = state.torreActiva || 0;
  /** Guardar la instalación activa tal como está en memoria antes de que el asistente la sobrescriba. */
  guardarEstadoTorreActual();

  const cfgSlotAntesGuardar = state.torres[idxSlotGuardar]?.config;
  const tipoEnSlotAntes = tipoInstalacionNormalizado(cfgSlotAntesGuardar);
  /** Solo duplicar ranura si ya hubo una configuración guardada con el asistente; la plantilla inicial (o reset) no cuenta. */
  const instalacionSlotYaConfirmada = !!(cfgSlotAntesGuardar && cfgSlotAntesGuardar.checklistInstalacionConfirmada === true);

  let crearNuevaPorCambioTipo = false;
  if (!setupEsNuevaTorre && state.torres[idxSlotGuardar] && instalacionSlotYaConfirmada && tipoEnSlotAntes !== tipoNuevoPrevio) {
    if (state.torres.length >= MAX_TORRES) {
      showToast(
        'Cambiar el tipo de instalación crearía una instalación nueva, pero ya tienes el máximo (' +
          MAX_TORRES +
          '). Elimina una con la papelera en la lista de instalaciones o ajusta el tipo en otra ranura libre.',
        true
      );
      return;
    }
    const etiquetas = { torre: 'torre vertical', nft: 'NFT', dwc: 'DWC', rdwc: 'RDWC' };
    const nomAnt = etiquetas[tipoEnSlotAntes] || tipoEnSlotAntes;
    const nomNuevo = etiquetas[tipoNuevoPrevio] || tipoNuevoPrevio;
    if (
      !confirm(
        'La instalación activa es ' +
          nomAnt +
          ' y en el asistente has elegido ' +
          nomNuevo +
          '.\n\n' +
          'Para no borrar la instalación anterior, se creará una instalación nueva con estos datos; la de ' +
          nomAnt +
          ' seguirá en la lista (selector de instalación arriba).\n\n¿Continuar?'
      )
    ) {
      return;
    }
    crearNuevaPorCambioTipo = true;
    const pref = tipoNuevoPrevio === 'dwc' ? 'DWC' : tipoNuevoPrevio === 'nft' ? 'NFT' : tipoNuevoPrevio === 'rdwc' ? 'RDWC' : 'Torre';
    setupNombreNuevaTorre = pref + ' ' + (state.torres.length + 1);
  }

  const usarNuevaEntrada = setupEsNuevaTorre || crearNuevaPorCambioTipo;
  if (typeof hcCapturarSnapshotSeguridadTorre === 'function' && state.torres && state.torres[idxSlotGuardar]) {
    hcCapturarSnapshotSeguridadTorre(
      idxSlotGuardar,
      usarNuevaEntrada ? 'setup-before-new-installation' : 'setup-before-reconfigure'
    );
  }

  const sensHwGuardar = {
    ec: !!(setupData.sensoresHardware && setupData.sensoresHardware.ec),
    ph: !!(setupData.sensoresHardware && setupData.sensoresHardware.ph),
    humedad: !!(setupData.sensoresHardware && setupData.sensoresHardware.humedad),
  };

  const prevLocMet = (!setupEsNuevaTorre && state.configTorre && state.configTorre.localidadMeteo)
    ? String(state.configTorre.localidadMeteo).trim() : '';
  const ciudadWizard = String(setupCoordenadas.ciudad || setupData.ciudad || '').trim();
  const parseCoord = (a, b) => {
    const tryN = (v) => {
      if (v == null || v === '') return NaN;
      const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
      return Number.isFinite(n) ? n : NaN;
    };
    const na = tryN(a);
    if (Number.isFinite(na)) return na;
    return tryN(b);
  };
  const latWizard = parseCoord(setupCoordenadas.lat, setupData.lat);
  const lonWizard = parseCoord(setupCoordenadas.lon, setupData.lon);
  const locWizard = ciudadWizard.split(',')[0].trim();
  const ubicEffGuardar = setupData.ubicacion || setupUbicacion || 'exterior';
  if (ubicEffGuardar === 'exterior') {
    if (!ciudadWizard || !Number.isFinite(latWizard) || !Number.isFinite(lonWizard)) {
      showToast(
        'En exterior indica la ciudad del mapa en el paso de luz y ubicación: cada instalación usa el clima de su municipio.',
        true
      );
      setupPagina = 5;
      renderSetupPage();
      return;
    }
  }

  // Guardar configuración en state
  const horasLuzGuardar = Math.max(12, Math.min(20,
    parseInt(String(document.getElementById('sliderHorasLuz')?.value || setupData.horasLuz || 16), 10) || 16));
  setupData.horasLuz = horasLuzGuardar;

  state.configTorre = {
    tipoInstalacion: isNft ? 'nft' : isDwc ? 'dwc' : isRdwc ? 'rdwc' : 'torre',
    tipoTorre:    'custom',
    numNiveles:   niveles,
    numCestas:    cestas,
    volDeposito:  vol,
    agua:         setupData.agua || 'destilada',
    checklistInstalacionConfirmada: true,
    ubicacion:    setupData.ubicacion || setupUbicacion || 'exterior',
    luz:          setupData.luz || 'led',
    horasLuz:     horasLuzGuardar,
    equipamiento: [...setupEquipamiento],
    nutriente:    setupNutriente,
    tamanoCesta:  setupTamanoCesta,
    tamanoCestaCustom: document.getElementById('cestaCmCustom')?.value || '',
    diametroTubo:  setupDiametroTubo,
    antiRaices:    setupAntiRaices,
    alturaTorre:   setupAlturaTorre,
    bombaCalculada: window.setupBombaCalculada || null,
    ciudad:       ubicEffGuardar === 'interior' ? (ciudadWizard || '') : ciudadWizard,
    lat:          Number.isFinite(latWizard) ? latWizard : null,
    lon:          Number.isFinite(lonWizard) ? lonWizard : null,
    localidadMeteo: usarNuevaEntrada ? (locWizard || '') : (locWizard || prevLocMet || ''),
    sensoresHardware: sensHwGuardar,
    consejosModoUi: setupData.consejosModoUi === 'avanzado' ? 'avanzado' : 'principiante',
    torreObjetivoCultivo:
      ((state.configTorre && state.configTorre.torreObjetivoCultivo) || 'final'),
    ...(isRdwc
      ? {
          rdwcSites: Math.max(2, Math.min(64, parseInt(String(document.getElementById('setupRdwcSites')?.value || '4'), 10) || 4)),
          rdwcRows: Math.max(1, Math.min(4, parseInt(String(document.getElementById('setupRdwcRows')?.value || '1'), 10) || 1)),
          rdwcBucketVolL: Math.max(5, Math.min(200, parseFloat(String(document.getElementById('setupRdwcBucketVolL')?.value || '20').replace(',', '.')) || 20)),
          rdwcBucketTrabajoL: (function() {
            const raw = String(document.getElementById('setupRdwcBucketTrabajoL')?.value || '').replace(',', '.').trim();
            const n = parseFloat(raw);
            return Number.isFinite(n) && n > 0 ? Math.round(n * 10) / 10 : undefined;
          })(),
          rdwcControlVolL: Math.max(10, Math.min(800, parseFloat(String(document.getElementById('setupRdwcControlVolL')?.value || '40').replace(',', '.')) || 40)),
          rdwcRecirculationLh: Math.max(200, Math.min(12000, parseFloat(String(document.getElementById('setupRdwcRecirculationLh')?.value || '1200').replace(',', '.')) || 1200)),
          rdwcAirLpm: Math.max(1, Math.min(300, parseFloat(String(document.getElementById('setupRdwcAirLpm')?.value || '20').replace(',', '.')) || 20)),
          rdwcNetPotMm: Math.max(40, Math.min(200, parseInt(String(document.getElementById('setupRdwcNetPotMm')?.value || '125'), 10) || 125)),
          rdwcCenterSpacingCm: Math.max(20, Math.min(150, parseFloat(String(document.getElementById('setupRdwcCenterSpacingCm')?.value || '45').replace(',', '.')) || 45)),
          ...(function () {
            const raw = String(document.getElementById('setupRdwcNetPotHeightMm')?.value || '').trim();
            if (!raw) return {};
            const n = parseInt(raw, 10);
            if (!Number.isFinite(n) || n < 30 || n > 200) return {};
            return { rdwcNetPotHeightMm: n };
          })(),
        }
      : {}),
  };
  const ccSetup = parseFloat(String(document.getElementById('setupCalentadorConsignaC')?.value || '').replace(',', '.'));
  if (setupEquipamiento.has('calentador') && Number.isFinite(ccSetup) && ccSetup >= 10 && ccSetup <= 35) {
    state.configTorre.calentadorConsignaC = Math.round(ccSetup * 10) / 10;
  } else {
    delete state.configTorre.calentadorConsignaC;
  }
  if (isNft) {
    state.configTorre.nftNumCanales = niveles;
    state.configTorre.nftHuecosPorCanal = cestas;
    state.configTorre.nftPendientePct = Math.max(1, Math.min(4, nftPend != null ? nftPend : 2));
    state.configTorre.nftTuboInteriorMm = setupNftTuboMm;
    const geomSv = readNftCanalGeomFromSetupUi();
    state.configTorre.nftCanalForma = geomSv.forma;
    state.configTorre.nftCanalDiamMm = geomSv.diamMm;
    state.configTorre.nftCanalAnchoMm = geomSv.anchoMm;
    state.configTorre.nftLaminaAguaMm = geomSv.laminaMm;
    if (geomSv.longCanalM != null) state.configTorre.nftLongCanalM = geomSv.longCanalM;
    else delete state.configTorre.nftLongCanalM;
    delete state.configTorre.nftMesaMultinivel;
    delete state.configTorre.nftMesaTubosPorNivelStr;
    delete state.configTorre.nftMesaSeparacionNivelesCm;
    delete state.configTorre.nftEscaleraCaras;
    delete state.configTorre.nftEscaleraNivelesCara;
    const montSv = readNftMontajeFromSetupUi();
    state.configTorre.nftDisposicion = montSv.disposicion;
    if (montSv.alturaBombeoCm > 0) state.configTorre.nftAlturaBombeoCm = montSv.alturaBombeoCm;
    else delete state.configTorre.nftAlturaBombeoCm;
    if (montSv.disposicion === 'mesa' && montSv.mesaMultinivel) {
      const tiersSv = parseNftMesaTubosPorNivelStr(montSv.mesaTubosStr);
      if (tiersSv.length >= 2) {
        state.configTorre.nftMesaMultinivel = true;
        state.configTorre.nftMesaTubosPorNivelStr = tiersSv.join(',');
        if (montSv.mesaSepCm > 0) state.configTorre.nftMesaSeparacionNivelesCm = montSv.mesaSepCm;
      }
    }
    if (montSv.disposicion === 'escalera') {
      state.configTorre.nftEscaleraCaras = montSv.escaleraCaras;
      state.configTorre.nftEscaleraNivelesCara = Math.max(1, Math.min(12, nftNvSlider));
    }
    state.configTorre.nftBombaEstimada = getNftBombaDesdeConfig(state.configTorre);
    const lhInp = document.getElementById('nftBombaUsuarioLh');
    const wInp = document.getElementById('nftBombaUsuarioW');
    const uLh = lhInp ? parseFloat(String(lhInp.value).replace(',', '.')) : NaN;
    const uW = wInp ? parseFloat(String(wInp.value).replace(',', '.')) : NaN;
    if (Number.isFinite(uLh) && uLh > 0) state.configTorre.nftBombaUsuarioCaudalLh = Math.round(uLh);
    else delete state.configTorre.nftBombaUsuarioCaudalLh;
    if (Number.isFinite(uW) && uW > 0) state.configTorre.nftBombaUsuarioPotenciaW = Math.round(uW);
    else delete state.configTorre.nftBombaUsuarioPotenciaW;
    const vPump = validarBombaUsuarioNftVsCalculo(
      state.configTorre.nftBombaEstimada,
      lhInp ? lhInp.value : '',
      wInp ? wInp.value : ''
    );
    if (vPump.tipo === 'error' && vPump.toast) showToast(vPump.toast, true);
    state.configTorre.nftObjetivoCultivo =
      typeof nftGetObjetivoCultivo === 'function'
        ? nftGetObjetivoCultivo(state.configTorre)
        : 'final';
    const potRimEl = document.getElementById('setupNftPotRimMm');
    const potHEl = document.getElementById('setupNftPotHmm');
    const rimParsed = parseInt(String(potRimEl?.value ?? '').trim(), 10);
    const hParsed = parseInt(String(potHEl?.value ?? '').trim(), 10);
    if (Number.isFinite(rimParsed) && rimParsed >= 25 && rimParsed <= 120) {
      state.configTorre.nftNetPotRimMm = rimParsed;
    } else {
      delete state.configTorre.nftNetPotRimMm;
    }
    if (Number.isFinite(hParsed) && hParsed >= 30 && hParsed <= 200) {
      state.configTorre.nftNetPotHeightMm = hParsed;
    } else {
      delete state.configTorre.nftNetPotHeightMm;
    }
  } else {
    delete state.configTorre.nftNumCanales;
    delete state.configTorre.nftHuecosPorCanal;
    delete state.configTorre.nftPendientePct;
    delete state.configTorre.nftTuboInteriorMm;
    delete state.configTorre.nftBombaEstimada;
    delete state.configTorre.nftBombaUsuarioCaudalLh;
    delete state.configTorre.nftBombaUsuarioPotenciaW;
    delete state.configTorre.nftCanalForma;
    delete state.configTorre.nftCanalDiamMm;
    delete state.configTorre.nftCanalAnchoMm;
    delete state.configTorre.nftLaminaAguaMm;
    delete state.configTorre.nftLongCanalM;
    delete state.configTorre.nftDisposicion;
    delete state.configTorre.nftAlturaBombeoCm;
    delete state.configTorre.nftMesaMultinivel;
    delete state.configTorre.nftMesaTubosPorNivelStr;
    delete state.configTorre.nftMesaSeparacionNivelesCm;
    delete state.configTorre.nftEscaleraCaras;
    delete state.configTorre.nftEscaleraNivelesCara;
    delete state.configTorre.nftNetPotRimMm;
    delete state.configTorre.nftNetPotHeightMm;
    delete state.configTorre.nftObjetivoCultivo;
  }
  if (isDwc) {
    dwcMergeCamposFormularioEnCfg(state.configTorre, DWC_FORM_IDS_SETUP);
    if (
      typeof dwcValidarVolumenManualSegunForma === 'function' &&
      !dwcValidarVolumenManualSegunForma(state.configTorre, 'setup')
    ) {
      return;
    }
    dwcSincronizarTamanoCestaDesdeRim(state.configTorre);
    try {
      dwcSyncVolDepositoDesdeCapacidadEstimada(state.configTorre);
    } catch (eSync) {}
  }
  if (isRdwc) {
    if (typeof rdwcEnsureConfigDefaults === 'function') rdwcEnsureConfigDefaults(state.configTorre);
    state.configTorre.numNiveles = Math.max(1, Math.min(4, Math.round(Number(state.configTorre.rdwcRows || 1))));
    state.configTorre.numCestas = Math.max(1, Math.ceil(Number(state.configTorre.rdwcSites || 4) / state.configTorre.numNiveles));
    state.configTorre.volDeposito = Math.max(1, Math.round(Number(state.configTorre.rdwcControlVolL || vol)));
    if (!Array.isArray(state.configTorre.equipamiento)) state.configTorre.equipamiento = [];
    ['bomba', 'difusor'].forEach(eq => {
      if (!state.configTorre.equipamiento.includes(eq)) state.configTorre.equipamiento.push(eq);
    });
  }
  const volEfectivo =
    isDwc && Number(state.configTorre.volDeposito) > 0
      ? Number(state.configTorre.volDeposito)
      : vol;
  const mezParsed = parseFloat(String(document.getElementById('setupVolMezclaL')?.value || '').replace(',', '.'));
  if (Number.isFinite(mezParsed) && mezParsed > 0 && mezParsed < volEfectivo - 0.02) {
    state.configTorre.volMezclaLitros = Math.min(volEfectivo, Math.max(0.5, Math.round(mezParsed * 10) / 10));
  } else {
    delete state.configTorre.volMezclaLitros;
  }
  invalidateMeteoNomiCache();
  const su = normalizaSustratoKey(setupData.sustrato);
  state.configTorre.sustrato = su;
  state.configSustrato = su;

  // Aplicar constantes del nutriente seleccionado
  const nut = NUTRIENTES_DB.find(n => n.id === setupNutriente) || NUTRIENTES_DB[0];
  // Las constantes se usarán dinámicamente en evalEC y checklist

  // Reinicializar torre con nueva configuración
  state.torre = [];
  for (let n = 0; n < niveles; n++) {
    state.torre.push([]);
    for (let c = 0; c < cestas; c++) {
      state.torre[n].push({ variedad: '', fecha: '', notas: '', origenPlanta: '', fotos: [], fotoKeys: [] });
    }
  }
  try {
    if (typeof aplicarSetupCestaVariedadDraftATorre === 'function') {
      aplicarSetupCestaVariedadDraftATorre(state.torre, niveles, cestas);
    }
  } catch (_) {}

  // Guardar cultivos seleccionados en el setup
  state.configTorre.cultivosIniciales = [...setupPlantasSeleccionadas];
  state.configTorre.multiplesT = setupNumTorres;

  if (usarNuevaEntrada) {
    // ── NUEVA ENTRADA EN state.torres (nueva instalación o cambio de tipología) ──
    setupEsNuevaTorre = false;
    const EMOJIS = ['🌿','🌱','🥬','🍃','🌾','🪴','🌻','🫛','🎍'];
    const nTorres = (state.torres || []).length;
    const prevSlot = state.torres && state.torres[state.torreActiva || 0];
    const notifSeed =
      prevSlot && prevSlot.notifOpciones && typeof prevSlot.notifOpciones === 'object'
        ? {
            recarga: !!prevSlot.notifOpciones.recarga,
            medicion: !!prevSlot.notifOpciones.medicion,
            cosecha: !!prevSlot.notifOpciones.cosecha,
          }
        : { recarga: false, medicion: false, cosecha: false };
    const nuevaTorre = {
      id: Date.now(),
      nombre: setupNombreNuevaTorre,
      emoji: isNft ? '🪴' : isDwc ? '🫧' : EMOJIS[nTorres % EMOJIS.length],
      config: { ...state.configTorre },
      torre: JSON.parse(JSON.stringify(state.torre)),
      modoActual: 'lechuga',
      mediciones: [],
      registro: [],
      ultimaMedicion: null,
      ultimaRecarga: null,
      recargaSnoozeHasta: null,
      notifOpciones: notifSeed,
      fotosSistemaCompleto: { fotoKeys: [], fotos: [] },
    };
    if (!state.torres) state.torres = [];
    state.torres.push(nuevaTorre);
    const newIdx = state.torres.length - 1;
    state.torreActiva = newIdx;
    try {
      cargarEstadoTorre(newIdx);
    } catch (eCarga) {
      state.torre = nuevaTorre.torre;
      state.mediciones = [];
      state.registro = [];
      state.ultimaMedicion = null;
      state.ultimaRecarga = null;
      state.recargaSnoozeHasta = null;
    }
  } else {
    // ── RECONFIGURAR TORRE EXISTENTE ──────────────────────────────────────
    // No escribir directamente en el slot: el persist central valida y clona.
  }

  try {
    state.hcPostSetupChecklistPendiente = true;
  } catch (_) {}
  try {
    window._hcPostSetupPrevListo = false;
  } catch (_) {}
  try {
    window._hcChecklistGuidedFlow = true;
  } catch (_) {}

  saveState();
  aplicarConfigTorre();
  actualizarHeaderTorre();
  actualizarBadgesNutriente();
  renderTorre();
  updateTorreStats();
  updateDashboard();

  // Cerrar asistente primero para que el paso a Cultivo / checklist sea continuo (sin solapamiento visual).
  try {
    if (typeof cerrarSetup === 'function') cerrarSetup();
  } catch (_) {}
  // Tras configurar: pestaña Cultivo e instalación para cultivos; el checklist se ofrece cuando el usuario confirme.
  if (typeof iniciarFlujoSistemaAntesChecklistPostSetup === 'function') {
    iniciarFlujoSistemaAntesChecklistPostSetup();
  } else {
    preguntarIniciarChecklist();
  }
}

function preguntarIniciarChecklist() {
  try {
  const nut        = getNutrienteTorre();
  const cfg        = state.configTorre || {};
  const torre      = state.torres?.[state.torreActiva || 0];
  const nombreTorre = (torre?.nombre || '').trim() || 'Instalación';
  const volMax     = getVolumenDepositoMaxLitros(cfg);
  const vol        = typeof getVolumenNutrientesLitros === 'function' ? getVolumenNutrientesLitros(cfg) : getVolumenMezclaLitros(cfg);
  if (!nut || vol == null || !Number.isFinite(vol) || vol <= 0) return;
  const ecObj      = getECOptimaTorre();
  const faArr      = typeof getFactorArranquePlantulaHidro === 'function' ? getFactorArranquePlantulaHidro() : 1;
  const ecMetaRec  = typeof getRecargaEcMetaMicroS === 'function' ? getRecargaEcMetaMicroS() : Math.round((ecObj.min + ecObj.max) / 2);

  const mlCalMag   = calcularMlCalMag();
  const ecCalMag   = estimarEcCalMagMicroS(mlCalMag, vol);
  const orden      = (nut.orden && nut.orden.length >= nut.partes) ? nut.orden : ['Parte A','Parte B','Parte C'];
  const mlCadaParte = [];
  for (let i = 0; i < (nut.partes || 2); i++) {
    mlCadaParte.push(typeof calcularMlParteNutriente === 'function' ? calcularMlParteNutriente(i) : mlNutrientePorParte(nut.id, i, vol));
  }

  let dosisLineas = '';
  if (mlCalMag > 0) {
    dosisLineas += '<div class="check-dosis-row">' +
      '<span>1. CalMag</span><span class="check-dosis-val-green">' + mlCalMag + ' ml</span></div>';
  }
  let paso = mlCalMag > 0 ? 2 : 1;
  if (nut.partes === 1) {
    dosisLineas += '<div class="check-dosis-row">' +
      '<span>' + paso++ + '. ' + orden[0] + '</span><span class="check-dosis-val-green">' + mlCadaParte[0] + ' ml</span></div>';
  } else if (nut.partes === 2) {
    dosisLineas += '<div class="check-dosis-row">' +
      '<span>' + paso++ + '. ' + orden[0] + '</span><span class="check-dosis-val-green">' + mlCadaParte[0] + ' ml</span></div>';
    dosisLineas += '<div class="check-dosis-row">' +
      '<span>' + paso++ + '. ' + orden[1] + '</span><span class="check-dosis-val-green">' + mlCadaParte[1] + ' ml</span></div>';
  } else if (nut.partes >= 3) {
    for (let i = 0; i < nut.partes; i++) {
      dosisLineas += '<div class="check-dosis-row">' +
        '<span>' + paso++ + '. ' + (orden[i]||'Parte '+(i+1)) + '</span>' +
        '<span class="check-dosis-val-green">' + (mlCadaParte[i]||0) + ' ml</span></div>';
    }
  }
  const pHR = typeof torreGetPhRangoObjetivo === 'function'
    ? torreGetPhRangoObjetivo(nut, cfg)
    : (nut.pHRango || [5.5, 6.5]);
  const pHMin = pHR[0] || 5.5;
  const pHMax = pHR[1] || 6.5;
  dosisLineas += '<div class="check-dosis-row check-dosis-row--last">' +
    '<span>' + paso + '. pH objetivo</span>' +
    '<span class="check-dosis-val-blue">' + (nut.pHBuffer ? pHMin + ' (buffers hacen el resto)' : pHMin + '–' + pHMax) + '</span></div>';

  const overlay = document.createElement('div');
  overlay.id = 'checklistPreguntaOverlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute(
    'aria-label',
    cfg.tipoInstalacion === 'nft' ? 'Iniciar checklist NFT'
      : cfg.tipoInstalacion === 'dwc' ? 'Iniciar checklist DWC'
      : 'Iniciar checklist — torre vertical'
  );
  const clGuiadoPostSetup =
    !!(typeof window !== 'undefined' && window._hcChecklistGuidedFlow) ||
    !!(state && state.hcPostSetupChecklistPendiente);
  overlay.className = clGuiadoPostSetup
    ? 'checklist-pregunta-overlay checklist-pregunta-overlay--guided'
    : 'checklist-pregunta-overlay';

  const sheetCls = 'checklist-pregunta-sheet' + (clGuiadoPostSetup ? ' checklist-pregunta-sheet--guided' : '');
  const stripGuiado = clGuiadoPostSetup
    ? '<div class="checklist-pregunta-guided-strip" aria-hidden="true">' +
      '<span class="checklist-pregunta-guided-logo">HIDRO</span><span class="checklist-pregunta-guided-logo-alt">Cultivo</span>' +
      '<span class="checklist-pregunta-guided-sep">·</span>' +
      '<span class="checklist-pregunta-guided-step">Paso 3 de 3 · Depósito</span>' +
      '</div>'
    : '';

  overlay.innerHTML =
    '<div class="' + sheetCls + '">' +

      // Handle
      '<div class="checklist-pregunta-handle"></div>' +

      stripGuiado +

      // Cabecera
      '<div class="checklist-pregunta-head">' +
        '<div class="checklist-pregunta-emoji">🌿</div>' +
        '<div>' +
          '<div class="checklist-pregunta-title">' +
            '¡' + nombreTorre + ' lista!' +
          '</div>' +
          '<div class="checklist-pregunta-subtitle">' +
            (vol < volMax - 0.05 ? vol + ' L mezcla · máx ' + volMax + ' L · ' : vol + ' L · ') +
            (faArr < 1
              ? 'EC orientativa recarga ~' + ecMetaRec + ' µS/cm (arranque plántula; rango cultivo ' + ecObj.min + '–' + ecObj.max + ')'
              : 'EC objetivo ' + ecObj.min + '–' + ecObj.max + ' µS/cm') +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="checklist-pregunta-nota-pasos">' +
        'Las dosis de abajo usan el volumen de mezcla, el nutriente y el <strong>EC/pH recomendados según la etapa</strong> ' +
        'registrada en <strong>Cultivo e instalación</strong> (variedad y fecha de trasplante al hidro en cada cesta con cultivo). ' +
        'Con modo EC automático, si cambias fechas o plantas, revisa de nuevo antes de dosificar.' +
      '</div>' +

      // Badge nutriente destacado
      '<div class="checklist-pregunta-nutri">' +
        '<span class="checklist-pregunta-nutri-icon">' + (nut.bandera||'🧪') + '</span>' +
        '<div>' +
          '<div class="checklist-pregunta-nutri-kicker">Nutriente configurado</div>' +
          '<div class="checklist-pregunta-nutri-name">' +
            nut.nombre + '</div>' +
          '<div class="checklist-pregunta-nutri-detalle">' +
            nut.detalle + '</div>' +
        '</div>' +
      '</div>' +

      // Dosis calculadas
      '<div class="checklist-pregunta-dosis-box">' +
        '<div class="checklist-pregunta-dosis-title">💊 Dosis calculadas para esta recarga</div>' +
        '<div class="checklist-pregunta-dosis-body">' + dosisLineas + '</div>' +
        (nut.pHBuffer
          ? '<div class="checklist-pregunta-dosis-warn">⚠️ Subir pH solo hasta ' + pHMin +
            ' — los buffers de ' + nut.nombre + ' completarán el ajuste solos en 2-3h</div>'
          : '') +
      '</div>' +

      // Pregunta tipo de checklist
      '<div class="checklist-pregunta-q">¿Para qué ocasión?</div>' +

      '<div class="checklist-pregunta-opciones">' +
        // Primer uso
        '<div id="optPrimerUso" data-tipo="primer_uso" class="tipo-checklist-opt tipo-checklist-opt--active">' +
          '<div class="tipo-checklist-opt-icon">🆕</div>' +
          '<div class="tipo-checklist-opt-title">' +
            'Primer uso</div>' +
          '<div class="tipo-checklist-opt-text">' +
            'Instalación nueva o primer llenado del depósito (sin cultivo previo en esta mezcla)' +
          '</div>' +
        '</div>' +
        // Tras limpieza
        '<div id="optTrasLimpieza" data-tipo="tras_limpieza" class="tipo-checklist-opt">' +
          '<div class="tipo-checklist-opt-icon">🧹</div>' +
          '<div class="tipo-checklist-opt-title">' +
            'Tras limpieza</div>' +
          '<div class="tipo-checklist-opt-text">' +
            'Depósito vaciado, limpiado y enjuagado completamente' +
          '</div>' +
        '</div>' +
      '</div>' +

      // Botones acción
      '<button id="btnIniciarChecklist" ' +
        'class="checklist-pregunta-btn-main">' +
        '📋 Iniciar checklist' +
      '</button>' +
      '<button id="btnChecklistDespues" ' +
        'class="checklist-pregunta-btn-later">' +
        'Más tarde — ir a la app' +
      '</button>' +
    '</div>';

  document.body.appendChild(overlay);
  a11yDialogOpened(overlay);

  // Event delegation para opciones tipo checklist
  overlay.querySelectorAll('.tipo-checklist-opt').forEach(el => {
    el.addEventListener('click', function() {
      seleccionarTipoChecklist(this, this.getAttribute('data-tipo'));
    });
  });

  // Tipo de checklist seleccionado (primer_uso por defecto)
  window._tipoChecklist = 'primer_uso';

  document.getElementById('btnIniciarChecklist').addEventListener('click', () => {
    try {
      delete state.hcPostSetupChecklistPendiente;
      if (typeof saveState === 'function') saveState();
    } catch (_) {}
    try {
      if (typeof actualizarPostSetupChecklistRail === 'function') actualizarPostSetupChecklistRail();
    } catch (_) {}
    a11yDialogClosed(overlay);
    overlay.remove();
    const t = window._tipoChecklist;
    clRutaChecklist = t === 'tras_limpieza' ? 'recarga' : 'primer_llenado';
    abrirChecklist(false, { saltarPreguntaRuta: true });
  });
  document.getElementById('btnChecklistDespues').addEventListener('click', () => {
    try {
      delete state.hcPostSetupChecklistPendiente;
      if (typeof saveState === 'function') saveState();
    } catch (_) {}
    try {
      delete window._hcChecklistGuidedFlow;
    } catch (_) {}
    try {
      if (typeof actualizarPostSetupChecklistRail === 'function') actualizarPostSetupChecklistRail();
    } catch (_) {}
    a11yDialogClosed(overlay);
    overlay.remove();
    showToast('✅ ' + nombreTorre + ' lista · Checklist en pestaña Historial cuando quieras');
  });
  } catch(e) {
    console.error('preguntarIniciarChecklist error:', e);
    showToast('⚠️ Error al mostrar panel checklist: ' + e.message, true);
  }
}

function seleccionarTipoChecklist(el, tipo) {
  window._tipoChecklist = tipo;
  ['optPrimerUso','optTrasLimpieza'].forEach(id => {
    const e = document.getElementById(id);
    if (!e) return;
    e.classList.remove('tipo-checklist-opt--active');
  });
  el.classList.add('tipo-checklist-opt--active');
}



// Niveles activos basados en la torre real (no en modos fijos)
function getNivelesActivos() {
  const cfg = state.configTorre || {};
  const numNiveles = cfg.numNiveles || window.NUM_NIVELES_ACTIVO || NUM_NIVELES;
  // Generar array [0, 1, 2, ..., numNiveles-1]
  return Array.from({length: numNiveles}, (_, i) => i);
}

function aplicarConfigTorre() {
  // Si no hay config, plantilla mínima solo para cálculos de rejilla/volumen (sin ciudad GPS ficticia).
  // `hcPlantillaAutogenerada` evita tratar el sistema como “ya configurado” (bienvenida / asistente) hasta que el usuario guarde o complete el asistente.
  if (!state.configTorre) {
    state.configTorre = {
      tipoInstalacion: 'torre',
      numNiveles: NUM_NIVELES,
      numCestas:  NUM_CESTAS,
      agua: state.configAgua || 'destilada',
      checklistInstalacionConfirmada: false,
      torreObjetivoCultivo: 'final',
      hcPlantillaAutogenerada: true,
    };
  }
  if (!state.configTorre.tipoInstalacion) state.configTorre.tipoInstalacion = 'torre';
  if (!state.configTorre.torreObjetivoCultivo) state.configTorre.torreObjetivoCultivo = 'final';
  const cfg = state.configTorre;
  if (typeof rdwcEnsureConfigDefaults === 'function') rdwcEnsureConfigDefaults(cfg);

  // Sincronizar nutriente global con la torre activa (cada torre puede tener el mar suyo)
  const tIdx = state.torreActiva || 0;
  if (state.torres && state.torres[tIdx] && state.torres[tIdx].config) {
    const idT = state.torres[tIdx].config.nutriente;
    if (idT) cfg.nutriente = idT;
  }

  // Actualizar constantes dinámicas — NUM_NIVELES y NUM_CESTAS ahora son variables
  window.NUM_NIVELES_ACTIVO = cfg.numNiveles;
  window.NUM_CESTAS_ACTIVO  = cfg.numCestas;
  const vMezAct =
    typeof getVolumenNutrientesLitros === 'function' ? getVolumenNutrientesLitros(cfg) : getVolumenMezclaLitros(cfg);
  window.VOL_OBJETIVO_ACTIVO =
    vMezAct != null && Number.isFinite(vMezAct) && vMezAct > 0 ? vMezAct : VOL_OBJETIVO;

  // Constantes de cálculo según nutriente activo (no solo cfg.nutriente por si quedó desincronizado)
  const nut = getNutrienteTorre();
  if (nut) {
    const vAct = vMezAct != null && Number.isFinite(vMezAct) && vMezAct > 0 ? vMezAct : VOL_OBJETIVO;
    window.EC_POR_ML_AB_ACTIVO = ecSubePorMlCorreccion(nut, vAct);
  }
  actualizarVisibilidadPanelInteriorGrow();
  try { actualizarVisibilidadPanelCalentadorConsigna(); } catch (_) {}
  try { sincronizarTextosPanelInteraccionSistema(); } catch (_) {}
}

// ── Detectar si hay plántulas nuevas (< 5 días) en la torre ─────────────────
function hayPlantulasNuevas() {
  const nivelesActivos = getNivelesActivos();
  return nivelesActivos.some(n =>
    (state.torre[n] || []).some(c => {
      if (!cestaCuentaParaRiegoYMetricas(c)) return false;
      const dias = Math.floor((Date.now() - new Date(c.fecha)) / 86400000);
      return dias <= 5;
    })
  );
}


