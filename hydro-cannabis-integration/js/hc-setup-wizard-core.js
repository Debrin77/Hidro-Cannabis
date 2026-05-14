/**
 * Asistente de configuración: tipo de instalación, estado del wizard, NFT montaje/canal (hasta aplicar sistema).
 * Tras nutrientes-catalog.js; antes de hc-setup-wizard-dwc.js.
 */

// ══════════════════════════════════════════════════
// SETUP WIZARD — LÓGICA
// ══════════════════════════════════════════════════

let setupPagina = 0;
let setupTipoTorre = 'custom';
/** 'torre' | 'nft' | 'dwc' | 'rdwc' | '' (nueva instalación: hay que elegir en paso 0) */
let setupTipoInstalacion = 'torre';
let setupRdwcDraft = null;

function hcSetupClonePlain(value, fallback = null) {
  if (value == null) return fallback;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_) {
    return fallback;
  }
}

/** Normaliza tipo de instalación guardado en config. */
function tipoInstalacionNormalizado(cfg) {
  const t = cfg && cfg.tipoInstalacion;
  if (t === 'nft' || t === 'dwc' || t === 'rdwc' || t === 'torre') return t;
  return 'torre';
}

/** Etiqueta corta para avisos (recarga, calendario, notificaciones). */
function etiquetaSistemaHidroponicoBreve(cfg) {
  const t = tipoInstalacionNormalizado(cfg || {});
  if (t === 'nft') return 'NFT';
  if (t === 'rdwc') return 'RDWC';
  if (t === 'dwc') {
    if (typeof dwcGetModoCultivo === 'function' && dwcGetModoCultivo(cfg || {}) === 'kratky') return 'Kratky';
    return 'DWC';
  }
  return 'Torre vertical';
}

/**
 * RDWC v1 — defaults y saneado mínimo de esquema.
 * Se invoca desde el núcleo para estabilizar configuraciones antiguas o incompletas.
 */
function rdwcEnsureConfigDefaults(cfg) {
  const c = cfg || {};
  if (tipoInstalacionNormalizado(c) !== 'rdwc') return c;
  if (!Number.isFinite(Number(c.rdwcSites)) || Number(c.rdwcSites) < 2) c.rdwcSites = 4;
  if (!Number.isFinite(Number(c.rdwcRows)) || Number(c.rdwcRows) < 1) c.rdwcRows = 1;
  if (!Number.isFinite(Number(c.rdwcBucketVolL)) || Number(c.rdwcBucketVolL) < 5) c.rdwcBucketVolL = 20;
  if (!Number.isFinite(Number(c.rdwcControlVolL)) || Number(c.rdwcControlVolL) < 10) c.rdwcControlVolL = 40;
  if (!Number.isFinite(Number(c.rdwcNetPotMm)) || Number(c.rdwcNetPotMm) < 40) c.rdwcNetPotMm = 125;
  if (!Number.isFinite(Number(c.rdwcCenterSpacingCm)) || Number(c.rdwcCenterSpacingCm) < 20) c.rdwcCenterSpacingCm = 45;
  if (!Number.isFinite(Number(c.rdwcRecirculationLh)) || Number(c.rdwcRecirculationLh) < 200) c.rdwcRecirculationLh = 1200;
  if (!Number.isFinite(Number(c.rdwcAirLpm)) || Number(c.rdwcAirLpm) < 1) c.rdwcAirLpm = 20;
  if (!Number.isFinite(Number(c.rdwcTempObjetivoC))) c.rdwcTempObjetivoC = 19;
  if (!Number.isFinite(Number(c.rdwcHeadM))) c.rdwcHeadM = 1.2;
  if (!Number.isFinite(Number(c.rdwcLineLenM))) c.rdwcLineLenM = 12;
  if (!Number.isFinite(Number(c.rdwcFittings))) c.rdwcFittings = 12;
  if (c.rdwcHydroMode !== 'silencioso' && c.rdwcHydroMode !== 'alto_rendimiento') c.rdwcHydroMode = 'estandar';
  if (!Number.isFinite(Number(c.rdwcTempWarnHighC))) c.rdwcTempWarnHighC = 22;
  if (!Number.isFinite(Number(c.rdwcTempWarnLowC))) c.rdwcTempWarnLowC = 17;
  if (c.rdwcFlowMode !== 'continuous') c.rdwcFlowMode = 'continuous';
  if (c.rdwcTopFeedEnabled !== true) c.rdwcTopFeedEnabled = false;
  if (c.rdwcReturnMode !== 'gravity' && c.rdwcReturnMode !== 'forced') c.rdwcReturnMode = 'gravity';
  if (c.rdwcLayout !== 'line' && c.rdwcLayout !== 'double_row' && c.rdwcLayout !== 'u_shape') c.rdwcLayout = 'line';
  return c;
}

function rdwcParseLitrosTrabajo(raw) {
  const v = parseFloat(String(raw == null ? '' : raw).replace(',', '.').trim());
  if (!Number.isFinite(v) || v <= 0) return null;
  return Math.round(v * 10) / 10;
}

function rdwcParseCm(raw) {
  const v = parseFloat(String(raw == null ? '' : raw).replace(',', '.').trim());
  if (!Number.isFinite(v) || v <= 0) return null;
  return Math.round(v * 10) / 10;
}

/** Altura del cuerpo del net pot (mm), opcional; distinta de Ø del aro y de la prof. útil de agua bajo cesta. */
function rdwcParseNetPotHeightMm(raw) {
  const s = String(raw == null ? '' : raw).trim();
  if (!s) return null;
  const v = parseInt(s, 10);
  if (!Number.isFinite(v) || v < 30 || v > 200) return null;
  return v;
}

function getSetupRdwcDraftSeed() {
  const base = hcSetupClonePlain(
    setupRdwcDraft && typeof setupRdwcDraft === 'object'
      ? setupRdwcDraft
      : (state.configTorre || {}),
    {}
  ) || {};
  base.tipoInstalacion = 'rdwc';
  if (typeof rdwcEnsureConfigDefaults === 'function') rdwcEnsureConfigDefaults(base);
  return base;
}

function buildRdwcConfigFromForm(scope, seedCfg) {
  const prefix = scope === 'sys' ? 'sysRdwc' : 'setupRdwc';
  const c = hcSetupClonePlain(seedCfg, {}) || {};
  const gNum = (id, fb) => {
    const el = document.getElementById(id);
    const n = parseFloat(String((el && el.value) || '').replace(',', '.'));
    return Number.isFinite(n) ? n : fb;
  };
  c.tipoInstalacion = 'rdwc';
  c.rdwcCultivoPrevisto = String(document.getElementById(prefix + 'CultivoPrevisto')?.value || c.rdwcCultivoPrevisto || '').trim();
  if (!c.rdwcCultivoPrevisto) delete c.rdwcCultivoPrevisto;
  c.rdwcSites = Math.round(Math.max(2, Math.min(64, gNum(prefix + 'Sites', c.rdwcSites || 4))));
  c.rdwcRows = Math.round(Math.max(1, Math.min(4, gNum(prefix + 'Rows', c.rdwcRows || 1))));
  c.rdwcBucketVolL = Math.max(5, Math.min(200, gNum(prefix + 'BucketVolL', c.rdwcBucketVolL || 20)));
  const bucketTrabajo = rdwcParseLitrosTrabajo(document.getElementById(prefix + 'BucketTrabajoL')?.value);
  if (bucketTrabajo != null) c.rdwcBucketTrabajoL = Math.min(c.rdwcBucketVolL, bucketTrabajo);
  else delete c.rdwcBucketTrabajoL;
  const bucketDiam = rdwcParseCm(document.getElementById(prefix + 'BucketTrabajoDiamCm')?.value);
  if (bucketDiam != null) c.rdwcBucketTrabajoDiamCm = bucketDiam;
  else delete c.rdwcBucketTrabajoDiamCm;
  const bucketProf = rdwcParseCm(document.getElementById(prefix + 'BucketTrabajoProfCm')?.value);
  if (bucketProf != null) c.rdwcBucketTrabajoProfCm = bucketProf;
  else delete c.rdwcBucketTrabajoProfCm;
  c.rdwcControlVolL = Math.max(10, Math.min(800, gNum(prefix + 'ControlVolL', c.rdwcControlVolL || 40)));
  const controlTrabajo = rdwcParseLitrosTrabajo(document.getElementById(prefix + 'ControlTrabajoL')?.value);
  if (controlTrabajo != null) c.volMezclaLitros = Math.min(c.rdwcControlVolL, controlTrabajo);
  else delete c.volMezclaLitros;
  c.rdwcRecirculationLh = Math.max(200, Math.min(12000, gNum(prefix + 'RecirculationLh', c.rdwcRecirculationLh || 1200)));
  c.rdwcAirLpm = Math.max(1, Math.min(300, gNum(prefix + 'AirLpm', c.rdwcAirLpm || 20)));
  c.rdwcNetPotMm = Math.round(Math.max(40, Math.min(200, gNum(prefix + 'NetPotMm', c.rdwcNetPotMm || 125))));
  const netPotH = rdwcParseNetPotHeightMm(document.getElementById(prefix + 'NetPotHeightMm')?.value);
  if (netPotH != null) c.rdwcNetPotHeightMm = netPotH;
  else delete c.rdwcNetPotHeightMm;
  c.rdwcCenterSpacingCm = Math.max(20, Math.min(150, gNum(prefix + 'CenterSpacingCm', c.rdwcCenterSpacingCm || 45)));
  if (scope === 'sys') {
    c.rdwcTempObjetivoC = Math.max(10, Math.min(30, gNum(prefix + 'TempObjetivoC', c.rdwcTempObjetivoC || 19)));
    c.rdwcHeadM = Math.max(0, Math.min(6, gNum(prefix + 'HeadM', c.rdwcHeadM || 1.2)));
    c.rdwcLineLenM = Math.max(1, Math.min(60, gNum(prefix + 'LineLenM', c.rdwcLineLenM || 12)));
    c.rdwcFittings = Math.round(Math.max(0, Math.min(80, gNum(prefix + 'Fittings', c.rdwcFittings || 12))));
    const hm = document.getElementById(prefix + 'HydroMode');
    c.rdwcHydroMode = hm && hm.value ? hm.value : c.rdwcHydroMode || 'estandar';
    const lay = document.getElementById(prefix + 'Layout');
    c.rdwcLayout = lay && lay.value ? lay.value : c.rdwcLayout || 'line';
  }
  c.numNiveles = c.rdwcRows;
  c.numCestas = Math.max(1, Math.ceil(c.rdwcSites / c.rdwcRows));
  c.volDeposito = Math.round(c.rdwcControlVolL);
  if (typeof rdwcEnsureConfigDefaults === 'function') rdwcEnsureConfigDefaults(c);
  return c;
}

function getRdwcBucketVolumenTrabajoAutoLitros(cfg) {
  const c = cfg || {};
  const bucketNom = Math.max(5, Number(c.rdwcBucketVolL) || 20);
  // Auto conservador: deja una cámara de aire razonable bajo la cesta si el usuario no ha afinado el dato.
  const autoL = bucketNom * 0.7;
  const out = Math.min(bucketNom, Math.max(0.5, autoL));
  return Math.round(out * 10) / 10;
}

function getRdwcBucketVolumenTrabajoGeometriaLitros(cfg) {
  const c = cfg || {};
  if (tipoInstalacionNormalizado(c) !== 'rdwc') return null;
  const bucketNom = Math.max(5, Number(c.rdwcBucketVolL) || 20);
  const diam = rdwcParseCm(c.rdwcBucketTrabajoDiamCm);
  const prof = rdwcParseCm(c.rdwcBucketTrabajoProfCm);
  if (diam == null || prof == null) return null;
  const litros = (Math.PI * Math.pow(diam / 2, 2) * prof) / 1000;
  if (!Number.isFinite(litros) || litros <= 0) return null;
  return Math.min(bucketNom, Math.max(0.5, Math.round(litros * 10) / 10));
}

function getRdwcBucketVolumenTrabajoLitros(cfg) {
  const c = cfg || {};
  if (tipoInstalacionNormalizado(c) !== 'rdwc') return null;
  const bucketNom = Math.max(5, Number(c.rdwcBucketVolL) || 20);
  const manual = rdwcParseLitrosTrabajo(c.rdwcBucketTrabajoL);
  if (manual != null) {
    return Math.min(bucketNom, Math.max(0.5, Math.round(manual * 10) / 10));
  }
  const geom = getRdwcBucketVolumenTrabajoGeometriaLitros(c);
  if (geom != null) return geom;
  return getRdwcBucketVolumenTrabajoAutoLitros(c);
}

function getRdwcVolumenControlTrabajoLitros(cfg) {
  const c = cfg || {};
  if (tipoInstalacionNormalizado(c) !== 'rdwc') return null;
  const controlMax = Math.max(10, Number(c.rdwcControlVolL || c.volDeposito || 40));
  const mix = rdwcParseLitrosTrabajo(c.volMezclaLitros);
  if (mix != null) {
    return Math.min(controlMax, Math.max(0.5, Math.round(mix * 10) / 10));
  }
  return Math.round(controlMax * 10) / 10;
}

function getRdwcVolumenSolucionTotalLitros(cfg) {
  const c = cfg || {};
  if (tipoInstalacionNormalizado(c) !== 'rdwc') return null;
  if (typeof rdwcEnsureConfigDefaults === 'function') rdwcEnsureConfigDefaults(c);
  const sites = Math.max(2, Math.round(Number(c.rdwcSites) || 4));
  const controlL = getRdwcVolumenControlTrabajoLitros(c);
  const bucketL = getRdwcBucketVolumenTrabajoLitros(c);
  if (!Number.isFinite(controlL) || controlL <= 0 || !Number.isFinite(bucketL) || bucketL <= 0) return null;
  return Math.round((controlL + sites * bucketL) * 10) / 10;
}

function getRdwcBucketTrabajoResumen(cfg) {
  const c = cfg || {};
  const manual = rdwcParseLitrosTrabajo(c.rdwcBucketTrabajoL);
  if (manual != null) {
    return {
      litros: getRdwcBucketVolumenTrabajoLitros(c),
      fuente: 'manual',
      detalle: 'manual',
    };
  }
  const geom = getRdwcBucketVolumenTrabajoGeometriaLitros(c);
  if (geom != null) {
    const diam = rdwcParseCm(c.rdwcBucketTrabajoDiamCm);
    const prof = rdwcParseCm(c.rdwcBucketTrabajoProfCm);
    return {
      litros: geom,
      fuente: 'geometria',
      detalle: 'Ø ' + diam + ' cm × ' + prof + ' cm',
    };
  }
  return {
    litros: getRdwcBucketVolumenTrabajoLitros(c),
    fuente: 'auto',
    detalle: 'auto ~70 % nominal',
  };
}

function getRdwcControlTrabajoResumen(cfg) {
  const c = cfg || {};
  const controlMax = Math.max(10, Number(c.rdwcControlVolL || c.volDeposito || 40));
  const controlTrabajo = getRdwcVolumenControlTrabajoLitros(c);
  const margen = Math.max(0, Math.round((controlMax - controlTrabajo) * 10) / 10);
  return {
    maxL: Math.round(controlMax * 10) / 10,
    trabajoL: controlTrabajo,
    margenL: margen,
    tieneMargen: margen > 0.05,
  };
}

function rdwcCultivoPrevistoDesdeConfig(cfg) {
  const c = cfg || {};
  const id = String(c.rdwcCultivoPrevisto || '').trim();
  if (!id || typeof getCultivoDB !== 'function') return null;
  return getCultivoDB(id);
}

function rdwcGrupoObjetivoDesdeConfig(cfg) {
  const c = cfg || {};
  const cultPrev = rdwcCultivoPrevistoDesdeConfig(c);
  if (cultPrev && cultPrev.grupo) return String(cultPrev.grupo).trim().toLowerCase();
  try {
    const tor = state.torre || [];
    const count = {};
    for (let i = 0; i < tor.length; i++) {
      const row = tor[i] || [];
      for (let j = 0; j < row.length; j++) {
        const v = row[j] && row[j].variedad;
        if (!v || typeof getCultivoDB !== 'function') continue;
        const cult = getCultivoDB(v);
        const g = cult && cult.grupo ? String(cult.grupo).trim().toLowerCase() : '';
        if (!g) continue;
        count[g] = (count[g] || 0) + 1;
      }
    }
    let best = '';
    let bestN = -1;
    Object.keys(count).forEach(k => {
      if (count[k] > bestN) {
        best = k;
        bestN = count[k];
      }
    });
    if (best) return best;
  } catch (_) {}
  if (Array.isArray(c.cultivosIniciales) && typeof getCultivoDB === 'function') {
    const count = {};
    c.cultivosIniciales.forEach(v => {
      const cult = getCultivoDB(v);
      const g = cult && cult.grupo ? String(cult.grupo).trim().toLowerCase() : '';
      if (!g) return;
      count[g] = (count[g] || 0) + 1;
    });
    let best = '';
    let bestN = -1;
    Object.keys(count).forEach(k => {
      if (count[k] > bestN) {
        best = k;
        bestN = count[k];
      }
    });
    if (best) return best;
  }
  return 'lechugas';
}

function rdwcRecoPerfilPorGrupo(grupo) {
  const g = String(grupo || '').trim().toLowerCase();
  if (g === 'microgreens') {
    return {
      grupo: 'microgreens',
      etiqueta: 'Microgreens / plántula muy joven',
      cestaMinMm: 27,
      cestaMaxMm: 50,
      cestaTxt: '27–50 mm',
      bucketMinL: 5,
      bucketMaxL: 12,
      bucketTxt: '5–12 L',
      sepMinCm: 20,
      sepMaxCm: 28,
      sepTxt: '20–28 cm',
      controlShare: 0.18,
      controlMinL: 10,
      controlMaxL: 20,
      controlTrabajoPct: 0.85,
      permite: true,
      nota: 'Solo si buscas ciclos muy cortos o vivero.',
    };
  }
  if (g === 'asiaticas') {
    return {
      grupo: 'asiaticas',
      etiqueta: 'Asiáticas',
      cestaMinMm: 50,
      cestaMaxMm: 75,
      cestaTxt: '50–75 mm',
      bucketMinL: 15,
      bucketMaxL: 25,
      bucketTxt: '15–25 L',
      sepMinCm: 35,
      sepMaxCm: 45,
      sepTxt: '35–45 cm',
      controlShare: 0.22,
      controlMinL: 20,
      controlMaxL: 50,
      controlTrabajoPct: 0.85,
      permite: true,
      nota: 'Rosetas y hojas medianas: mejor soporte que en baby leaf.',
    };
  }
  if (g === 'hojas' || g === 'hierbas') {
    return {
      grupo: g,
      etiqueta: g === 'hierbas' ? 'Hierbas aromáticas' : 'Hojas voluminosas',
      cestaMinMm: 50,
      cestaMaxMm: 75,
      cestaTxt: '50–75 mm',
      bucketMinL: g === 'hierbas' ? 12 : 20,
      bucketMaxL: g === 'hierbas' ? 20 : 35,
      bucketTxt: g === 'hierbas' ? '12–20 L' : '20–35 L',
      sepMinCm: g === 'hierbas' ? 30 : 35,
      sepMaxCm: g === 'hierbas' ? 40 : 50,
      sepTxt: g === 'hierbas' ? '30–40 cm' : '35–50 cm',
      controlShare: g === 'hierbas' ? 0.2 : 0.25,
      controlMinL: g === 'hierbas' ? 18 : 25,
      controlMaxL: g === 'hierbas' ? 40 : 70,
      controlTrabajoPct: 0.85,
      permite: true,
      nota: 'Buen compromiso entre soporte y cámara de aire.',
    };
  }
  if (g === 'fresas') {
    return {
      grupo: 'fresas',
      etiqueta: 'Fresas',
      cestaMinMm: 50,
      cestaMaxMm: 75,
      cestaTxt: '50–75 mm',
      bucketMinL: 12,
      bucketMaxL: 20,
      bucketTxt: '12–20 L',
      sepMinCm: 30,
      sepMaxCm: 40,
      sepTxt: '30–40 cm',
      controlShare: 0.2,
      controlMinL: 18,
      controlMaxL: 40,
      controlTrabajoPct: 0.85,
      permite: true,
      nota: 'Sistema dedicado y control fino de higiene y temperatura.',
    };
  }
  if (g === 'frutos' || g === 'raices') {
    return {
      grupo: g,
      etiqueta: g === 'raices' ? 'Raíces / tubérculos ligeros' : 'Frutos',
      cestaMinMm: 75,
      cestaMaxMm: 100,
      cestaTxt: '75–100 mm',
      bucketMinL: 25,
      bucketMaxL: 45,
      bucketTxt: '25–45 L',
      sepMinCm: 45,
      sepMaxCm: 65,
      sepTxt: '45–65 cm',
      controlShare: 0.3,
      controlMinL: 35,
      controlMaxL: 100,
      controlTrabajoPct: 0.85,
      permite: true,
      nota: 'Requiere sistema dedicado, más soporte y más volumen por planta.',
    };
  }
  return {
    grupo: 'lechugas',
    etiqueta: 'Lechugas / hojas ligeras',
    cestaMinMm: 50,
    cestaMaxMm: 50,
    cestaTxt: '50 mm',
    bucketMinL: 15,
    bucketMaxL: 25,
    bucketTxt: '15–25 L',
    sepMinCm: 30,
    sepMaxCm: 40,
    sepTxt: '30–40 cm',
    controlShare: 0.2,
    controlMinL: 20,
    controlMaxL: 45,
    controlTrabajoPct: 0.85,
    permite: true,
    nota: 'Medida más habitual para cubos RDWC domésticos con hoja ligera.',
  };
}

function rdwcRecomendacionCultivoDesdeConfig(cfg) {
  const c = cfg || {};
  if (tipoInstalacionNormalizado(c) !== 'rdwc') return null;
  const cultPrev = rdwcCultivoPrevistoDesdeConfig(c);
  const grupo = rdwcGrupoObjetivoDesdeConfig(c);
  const perfil = rdwcRecoPerfilPorGrupo(grupo);
  const netPotRaw = Number(c.rdwcNetPotMm);
  const netPot = Number.isFinite(netPotRaw) && netPotRaw >= 40 && netPotRaw <= 200 ? Math.round(netPotRaw) : null;
  let estado = 'warn';
  let veredicto = 'Indica el diámetro actual de la cesta para validarlo frente al cultivo previsto.';
  if (netPot == null) {
    estado = 'warn';
  } else if (netPot < perfil.cestaMinMm) {
    estado = 'warn';
    veredicto = 'Cesta pequeña para el cultivo previsto.';
  } else if (netPot > perfil.cestaMaxMm + 5) {
    estado = 'warn';
    veredicto = 'Cesta grande para la densidad habitual de este cultivo.';
  } else {
    estado = 'ok';
    veredicto = 'Cesta dentro del rango recomendado para este cultivo.';
  }
  return {
    cultivo: cultPrev,
    grupo,
    perfil,
    netPotMm: Number.isFinite(netPot) ? netPot : null,
    estado,
    veredicto,
    origen: cultPrev ? 'previsto' : 'auto',
  };
}

function rdwcRoundHalfLitros(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 2) / 2;
}

function rdwcRecomendacionBaseDesdeConfig(cfg) {
  const c = cfg || {};
  if (tipoInstalacionNormalizado(c) !== 'rdwc') return null;
  const recoCult = rdwcRecomendacionCultivoDesdeConfig(c);
  const perfil = recoCult ? recoCult.perfil : rdwcRecoPerfilPorGrupo(rdwcGrupoObjetivoDesdeConfig(c));
  const sites = Math.max(2, Math.round(Number(c.rdwcSites) || 4));
  const bucketBase = Number.isFinite(perfil.bucketMinL) && Number.isFinite(perfil.bucketMaxL)
    ? rdwcRoundHalfLitros((perfil.bucketMinL + perfil.bucketMaxL) / 2)
    : 20;
  const cestaBase = Number.isFinite(perfil.cestaMinMm) && Number.isFinite(perfil.cestaMaxMm)
    ? Math.round((perfil.cestaMinMm + perfil.cestaMaxMm) / 2)
    : 125;
  const sepBase = Number.isFinite(perfil.sepMinCm) && Number.isFinite(perfil.sepMaxCm)
    ? Math.round((perfil.sepMinCm + perfil.sepMaxCm) / 2)
    : 45;
  const controlShare = Number.isFinite(perfil.controlShare) ? perfil.controlShare : 0.2;
  const controlMinL = Number.isFinite(perfil.controlMinL) ? perfil.controlMinL : 20;
  const controlMaxL = Number.isFinite(perfil.controlMaxL) ? perfil.controlMaxL : 60;
  const controlTrabajoPct = Number.isFinite(perfil.controlTrabajoPct) ? perfil.controlTrabajoPct : 0.85;
  const controlNominalCalc = sites * bucketBase * controlShare;
  const controlMaxBase = rdwcRoundHalfLitros(Math.max(controlMinL, Math.min(controlMaxL, controlNominalCalc)));
  const controlTrabajoBase = rdwcRoundHalfLitros(Math.max(0.5, controlMaxBase * controlTrabajoPct));
  return {
    recoCult,
    perfil,
    sites,
    bucketBase,
    cestaBase,
    sepBase,
    controlMaxBase,
    controlTrabajoBase,
    controlMargenBase: rdwcRoundHalfLitros(Math.max(0, controlMaxBase - controlTrabajoBase)),
  };
}

function rdwcRecomendacionControlDesdeConfig(cfg) {
  const base = rdwcRecomendacionBaseDesdeConfig(cfg);
  if (!base) return null;
  return {
    maxL: base.controlMaxBase,
    trabajoL: base.controlTrabajoBase,
    margenL: base.controlMargenBase,
    txt: base.controlMaxBase + ' L máx · ~' + base.controlTrabajoBase + ' L útiles',
    recoCult: base.recoCult,
  };
}

function renderRdwcCultivoPrevistoSelect(selectId, selectedValue) {
  const el = document.getElementById(selectId);
  if (!el || typeof CULTIVOS_DB === 'undefined' || !Array.isArray(CULTIVOS_DB)) return;
  const selected = String(selectedValue || '').trim();
  el.innerHTML = '';
  const autoOpt = document.createElement('option');
  autoOpt.value = '';
  autoOpt.textContent = 'Auto según cultivos asignados / configuración';
  el.appendChild(autoOpt);
  CULTIVOS_DB.slice().sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es')).forEach(c => {
    if (!c || !c.id) return;
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = (c.emoji ? c.emoji + ' ' : '') + (typeof cultivoNombreLista === 'function' ? cultivoNombreLista(c, c.nombre) : (c.nombre || c.id));
    el.appendChild(opt);
  });
  el.value = selected;
}

function rdwcCompatChipHtml(estado) {
  const k = estado === 'ok' || estado === 'warn' || estado === 'bad' ? estado : 'warn';
  const txt = k === 'ok' ? 'OK' : k === 'warn' ? 'Ajustar' : 'No recomendado';
  return '<span class="cultivo-status-chip cultivo-status-chip--' + k + '">' + txt + '</span>';
}

function rdwcEvaluarCompatConfig(cfg) {
  const c = cfg || {};
  if (tipoInstalacionNormalizado(c) !== 'rdwc') return null;
  const sites = Math.max(2, Number(c.rdwcSites) || 4);
  const rows = Math.max(1, Number(c.rdwcRows) || 1);
  const bucketVol = Math.max(5, Number(c.rdwcBucketVolL) || 20);
  const controlVol = Math.max(10, Number(c.rdwcControlVolL || c.volDeposito || 40));
  const netPot = Math.max(40, Number(c.rdwcNetPotMm) || 125);
  const spacing = Math.max(20, Number(c.rdwcCenterSpacingCm) || 45);
  const perRow = Math.max(1, Math.ceil(sites / rows));

  const recoCult = rdwcRecomendacionCultivoDesdeConfig(c);
  const controlReco = rdwcRecomendacionControlDesdeConfig(c);
  const bucketMinL = recoCult && Number.isFinite(recoCult.perfil.bucketMinL) ? recoCult.perfil.bucketMinL : 15;
  const bucketMaxL = recoCult && Number.isFinite(recoCult.perfil.bucketMaxL) ? recoCult.perfil.bucketMaxL : 35;
  const bucketWarnMin = Math.max(5, Math.floor(bucketMinL * 0.8));
  const bucketWarnMax = Math.ceil(bucketMaxL * 1.2);
  const sepMinCm = recoCult && Number.isFinite(recoCult.perfil.sepMinCm) ? recoCult.perfil.sepMinCm : 35;
  const sepMaxCm = recoCult && Number.isFinite(recoCult.perfil.sepMaxCm) ? recoCult.perfil.sepMaxCm : 60;
  let potEstado = recoCult ? recoCult.estado : 'warn';
  if (!recoCult) {
    if (netPot >= 100 && netPot <= 160) potEstado = 'ok';
    else if ((netPot >= 75 && netPot < 100) || (netPot > 160 && netPot <= 180)) potEstado = 'warn';
    else potEstado = 'bad';
  }

  let bucketEstado = 'warn';
  if (bucketVol >= bucketMinL && bucketVol <= bucketMaxL) bucketEstado = 'ok';
  else if ((bucketVol >= bucketWarnMin && bucketVol < bucketMinL) || (bucketVol > bucketMaxL && bucketVol <= bucketWarnMax)) bucketEstado = 'warn';
  else bucketEstado = 'bad';

  let controlEstado = 'warn';
  if (controlReco) {
    const okMin = Math.max(10, controlReco.maxL * 0.85);
    const okMax = Math.max(controlReco.maxL + 2, controlReco.maxL * 1.15);
    const warnMin = Math.max(10, controlReco.maxL * 0.7);
    const warnMax = Math.max(controlReco.maxL + 10, controlReco.maxL * 1.6);
    if (controlVol >= okMin && controlVol <= okMax) controlEstado = 'ok';
    else if ((controlVol >= warnMin && controlVol < okMin) || controlVol > warnMax) controlEstado = 'warn';
    else if ((controlVol > okMax && controlVol <= warnMax) || controlVol < warnMin) controlEstado = 'warn';
    else controlEstado = 'bad';
  }

  let spacingEstado = 'warn';
  if (spacing >= sepMinCm && spacing <= sepMaxCm) spacingEstado = 'ok';
  else if ((spacing >= Math.max(20, sepMinCm - 5) && spacing < sepMinCm) || (spacing > sepMaxCm && spacing <= sepMaxCm + 10)) spacingEstado = 'warn';
  else spacingEstado = 'bad';

  let layoutEstado = 'ok';
  if (rows >= 3 && perRow >= 6) layoutEstado = 'warn';
  if (rows >= 4 && perRow >= 8) layoutEstado = 'bad';

  const prioridad = { ok: 0, warn: 1, bad: 2 };
  const globalEstado = [potEstado, bucketEstado, controlEstado, spacingEstado, layoutEstado].reduce(
    (acc, s) => (prioridad[s] > prioridad[acc] ? s : acc),
    'ok'
  );

  return {
    globalEstado,
    potEstado,
    bucketEstado,
    controlEstado,
    spacingEstado,
    layoutEstado,
    spacingRecoCm: recoCult ? recoCult.perfil.sepTxt : '35-60 cm',
    netPotRecoMm: recoCult ? recoCult.perfil.cestaTxt : '100-160 mm',
    bucketRecoL: recoCult ? recoCult.perfil.bucketTxt : '15-35 L',
    controlRecoL: controlReco ? controlReco.txt : '20-60 L máx',
    recoCultivo: recoCult,
    controlReco,
  };
}

function rdwcCompatTextoResumen(comp) {
  if (!comp) return '';
  const accion =
    comp.globalEstado === 'ok'
      ? 'Configuración equilibrada para operación general.'
      : comp.globalEstado === 'warn'
        ? 'Ajusta uno o más parámetros para mejorar estabilidad de raíces y mantenimiento.'
        : 'Ajuste recomendado antes de cerrar configuración para evitar estrés radicular.';
  return (
    'Compatibilidad RDWC ' +
    rdwcCompatChipHtml(comp.globalEstado) +
    ' · Cesta ' +
    rdwcCompatChipHtml(comp.potEstado) +
    ' · Cubo ' +
    rdwcCompatChipHtml(comp.bucketEstado) +
    ' · Control ' +
    rdwcCompatChipHtml(comp.controlEstado) +
    ' · Separación ' +
    rdwcCompatChipHtml(comp.spacingEstado) +
    ' · Distribución ' +
    rdwcCompatChipHtml(comp.layoutEstado) +
    '. Referencia: cesta ' +
    comp.netPotRecoMm +
    ', cubo ' +
    comp.bucketRecoL +
    ', control ' +
    comp.controlRecoL +
    ', separación ' +
    comp.spacingRecoCm +
    (comp.recoCultivo
      ? '. Cultivo ' +
        (comp.recoCultivo.cultivo
          ? '<strong>' + comp.recoCultivo.cultivo.nombre + '</strong>'
          : '<strong>auto</strong>') +
        ' · ' +
        comp.recoCultivo.perfil.etiqueta +
        ' · ' +
        comp.recoCultivo.veredicto
      : '') +
    '. ' +
    accion
  );
}

function rdwcFlowChip(estado) {
  const k = estado === 'ok' || estado === 'warn' || estado === 'bad' ? estado : 'warn';
  const txt = k === 'ok' ? 'Válido' : k === 'warn' ? 'Ajustar' : 'Sobredimensionado';
  return '<span class="cultivo-status-chip cultivo-status-chip--' + k + '">' + txt + '</span>';
}

function rdwcCalcularHidraulica(cfg) {
  const c = cfg || {};
  if (tipoInstalacionNormalizado(c) !== 'rdwc') return null;
  const sites = Math.max(2, Number(c.rdwcSites) || 4);
  const bucketVol = getRdwcBucketVolumenTrabajoLitros(c);
  const controlVol = getRdwcVolumenControlTrabajoLitros(c);
  const recUser = Math.max(100, Number(c.rdwcRecirculationLh) || 1200);
  const airUser = Math.max(1, Number(c.rdwcAirLpm) || 20);
  const headM = Math.max(0, Number(c.rdwcHeadM) || 1.2);
  const lineLenM = Math.max(1, Number(c.rdwcLineLenM) || 12);
  const fittings = Math.max(0, Number(c.rdwcFittings) || 12);
  const mode = c.rdwcHydroMode === 'silencioso' || c.rdwcHydroMode === 'alto_rendimiento' ? c.rdwcHydroMode : 'estandar';
  const totalVol = Math.max((Number(controlVol) || 0) + sites * (Number(bucketVol) || 0), Number(controlVol) || 0);

  const modeMult = mode === 'silencioso' ? 1.15 : mode === 'alto_rendimiento' ? 1.95 : 1.6;
  const modeMinMult = mode === 'silencioso' ? 1.0 : mode === 'alto_rendimiento' ? 1.35 : 1.2;
  const modeMaxMult = mode === 'silencioso' ? 1.75 : mode === 'alto_rendimiento' ? 2.7 : 2.3;

  // Regla práctica: 1.2-2 renovaciones/h del volumen total en RDWC.
  const recMin = Math.max(900, Math.round(totalVol * modeMinMult));
  const recObj = Math.max(recMin, Math.round(totalVol * modeMult));
  const recMax = Math.max(recObj + 200, Math.round(totalVol * modeMaxMult));

  // Aireación orientativa: 1 L/min por 8-10 L + margen por raíces.
  const airMin = Math.max(8, Math.round(totalVol / 10));
  const airObj = Math.max(airMin, Math.round(totalVol / 8));
  const airMax = Math.max(airObj + 4, Math.round(totalVol / 6));

  // Bomba sugerida con factor por altura + pérdidas lineales y accesorios.
  const lossFac = 1 + headM * 0.18 + lineLenM * 0.01 + fittings * 0.008;
  const pumpRec = Math.round(recObj * lossFac);
  const pumpMin = Math.round(recMin * lossFac);

  // Diámetros orientativos separados para impulsión y retorno.
  let tubeOutMm = 25;
  if (pumpRec > 2200) tubeOutMm = 32;
  if (pumpRec > 4200) tubeOutMm = 40;
  if (pumpRec > 7000) tubeOutMm = 50;
  let tubeRetMm = 32;
  if (pumpRec > 3200) tubeRetMm = 40;
  if (pumpRec > 6200) tubeRetMm = 50;
  if (pumpRec > 9000) tubeRetMm = 63;

  const estadoRec = recUser < recMin ? 'warn' : recUser > recMax * 1.2 ? 'bad' : 'ok';
  const estadoAir = airUser < airMin ? 'warn' : airUser > airMax * 1.3 ? 'bad' : 'ok';
  const estadoGlobal = (estadoRec === 'bad' || estadoAir === 'bad') ? 'bad' : (estadoRec === 'warn' || estadoAir === 'warn') ? 'warn' : 'ok';

  return {
    totalVol,
    controlVol,
    bucketVol,
    sites,
    recMin, recObj, recMax,
    airMin, airObj, airMax,
    pumpMin, pumpRec,
    tubeOutMm, tubeRetMm,
    mode,
    estadoRec, estadoAir, estadoGlobal,
  };
}

function renderRdwcCalculoStatus(cfg, elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  const cfgUse = cfg || state.configTorre || {};
  const calc = rdwcCalcularHidraulica(cfgUse);
  if (!calc) {
    el.innerHTML = '';
    return;
  }
  const bucketInfo = getRdwcBucketTrabajoResumen(cfgUse);
  const controlInfo = getRdwcControlTrabajoResumen(cfgUse);
  const recoCult = rdwcRecomendacionCultivoDesdeConfig(cfgUse);
  const controlReco = rdwcRecomendacionControlDesdeConfig(cfgUse);
  const controlTxt = controlInfo.tieneMargen
    ? ('<strong>' + controlInfo.trabajoL + ' L</strong> útiles en reservorio (máx ' + controlInfo.maxL + ' L · margen ' + controlInfo.margenL + ' L)')
    : ('<strong>' + controlInfo.trabajoL + ' L</strong> en reservorio de control');
  const bucketTxt =
    bucketInfo.fuente === 'manual'
      ? ('<strong>' + bucketInfo.litros + ' L</strong> por cubo útil (manual)')
      : bucketInfo.fuente === 'geometria'
        ? ('<strong>' + bucketInfo.litros + ' L</strong> por cubo útil (' + bucketInfo.detalle + ')')
        : ('<strong>' + bucketInfo.litros + ' L</strong> por cubo útil (' + bucketInfo.detalle + ')');
  const cultivoTxt =
    recoCult
      ? ' · Cultivo ' +
        (recoCult.cultivo ? '<strong>' + recoCult.cultivo.nombre + '</strong>' : '<strong>auto</strong>') +
        ': cesta <strong>' + recoCult.perfil.cestaTxt + '</strong>, cubo <strong>' + recoCult.perfil.bucketTxt + '</strong> y separación <strong>' + recoCult.perfil.sepTxt + '</strong>'
      : '';
  const controlRecoTxt =
    controlReco
      ? ' · Depósito control orientativo <strong>' + controlReco.maxL + ' L</strong> (útiles ~' + controlReco.trabajoL + ' L)'
      : '';
  el.innerHTML =
    'RDWC Pro ' + rdwcFlowChip(calc.estadoGlobal) +
    ' · Perfil <strong>' + (calc.mode === 'silencioso' ? 'silencioso' : calc.mode === 'alto_rendimiento' ? 'alto rendimiento' : 'estándar') + '</strong>' +
    ' · Agua útil total recomendada ≈ <strong>' + calc.totalVol + ' L</strong>' +
    ' (' + controlTxt + ' + ' + calc.sites + '×' + bucketTxt + ')' +
    ' · Recirculación objetivo <strong>' + calc.recObj + ' L/h</strong> (mín ' + calc.recMin + ')' +
    ' · Bomba recomendada <strong>' + calc.pumpRec + ' L/h</strong>' +
    ' · Aireación objetivo <strong>' + calc.airObj + ' L/min</strong> (mín ' + calc.airMin + ')' +
    ' · Impulsión <strong>Ø' + calc.tubeOutMm + ' mm</strong> · Retorno <strong>Ø' + calc.tubeRetMm + ' mm</strong>.' +
    cultivoTxt +
    controlRecoTxt +
    ' Recirculación ' + rdwcFlowChip(calc.estadoRec) + ' · Aire ' + rdwcFlowChip(calc.estadoAir) + '.' +
    ' La aireación principal conviene repartirla en los <strong>cubos de cultivo</strong> (zona radicular); el depósito de control puede llevar apoyo opcional.' +
    ' Para nutrientes, añade los productos en el <strong>depósito de control</strong> con la recirculación en marcha; la dosis se calcula sobre ese total útil.';
}

function renderRdwcCompatStatus(cfg, elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  const comp = rdwcEvaluarCompatConfig(cfg || state.configTorre || {});
  if (!comp) {
    el.innerHTML = '';
    return;
  }
  const btnHtml =
    elId === 'sysRdwcCompatStatus'
      ? '<button type="button" class="rdwc-compat-btn" onclick="aplicarRdwcRecomendacionBaseSistema()">Aplicar base según cultivo</button>'
      : '<button type="button" class="rdwc-compat-btn" onclick="aplicarRdwcRecomendacionBaseSetup()">Aplicar base según cultivo</button>';
  el.innerHTML =
    '<span class="rdwc-compat-text">' +
    rdwcCompatTextoResumen(comp) +
    '</span>' +
    btnHtml;
}

function bindRdwcCompatLive(scope) {
  const ids =
    scope === 'sys'
      ? [
          'sysRdwcCultivoPrevisto',
          'sysRdwcSites',
          'sysRdwcRows',
          'sysRdwcBucketVolL',
          'sysRdwcBucketTrabajoL',
          'sysRdwcBucketTrabajoDiamCm',
          'sysRdwcBucketTrabajoProfCm',
          'sysRdwcControlVolL',
          'sysRdwcControlTrabajoL',
          'sysRdwcRecirculationLh',
          'sysRdwcAirLpm',
          'sysRdwcNetPotMm',
          'sysRdwcNetPotHeightMm',
          'sysRdwcCenterSpacingCm',
          'sysRdwcTempObjetivoC',
          'sysRdwcLayout',
          'sysRdwcHeadM',
          'sysRdwcLineLenM',
          'sysRdwcFittings',
          'sysRdwcHydroMode',
        ]
      : [
          'setupRdwcCultivoPrevisto',
          'setupRdwcSites',
          'setupRdwcRows',
          'setupRdwcBucketVolL',
          'setupRdwcBucketTrabajoL',
          'setupRdwcBucketTrabajoDiamCm',
          'setupRdwcBucketTrabajoProfCm',
          'setupRdwcControlVolL',
          'setupRdwcControlTrabajoL',
          'setupRdwcRecirculationLh',
          'setupRdwcAirLpm',
          'setupRdwcNetPotMm',
          'setupRdwcNetPotHeightMm',
          'setupRdwcCenterSpacingCm',
        ];
  const render = () => {
    const c = scope === 'setup'
      ? (setupRdwcDraft || state.configTorre || {})
      : (state.configTorre || {});
    if (scope === 'sys') {
      const g = (id, fb) => {
        const el = document.getElementById(id);
        const n = parseFloat(String((el && el.value) || '').replace(',', '.'));
        return Number.isFinite(n) ? n : fb;
      };
      const lay = document.getElementById('sysRdwcLayout');
      const c2 = { ...c, tipoInstalacion: 'rdwc' };
      c2.rdwcCultivoPrevisto = String(document.getElementById('sysRdwcCultivoPrevisto')?.value || '').trim();
      c2.rdwcSites = g('sysRdwcSites', c.rdwcSites || 4);
      c2.rdwcRows = g('sysRdwcRows', c.rdwcRows || 1);
      c2.rdwcBucketVolL = g('sysRdwcBucketVolL', c.rdwcBucketVolL || 20);
      c2.rdwcBucketTrabajoL = rdwcParseLitrosTrabajo(document.getElementById('sysRdwcBucketTrabajoL')?.value);
      c2.rdwcBucketTrabajoDiamCm = rdwcParseCm(document.getElementById('sysRdwcBucketTrabajoDiamCm')?.value);
      c2.rdwcBucketTrabajoProfCm = rdwcParseCm(document.getElementById('sysRdwcBucketTrabajoProfCm')?.value);
      c2.rdwcControlVolL = g('sysRdwcControlVolL', c.rdwcControlVolL || 40);
      c2.volMezclaLitros = rdwcParseLitrosTrabajo(document.getElementById('sysRdwcControlTrabajoL')?.value);
      c2.rdwcRecirculationLh = g('sysRdwcRecirculationLh', c.rdwcRecirculationLh || 1200);
      c2.rdwcAirLpm = g('sysRdwcAirLpm', c.rdwcAirLpm || 20);
      c2.rdwcNetPotMm = g('sysRdwcNetPotMm', c.rdwcNetPotMm || 125);
      const hSys = rdwcParseNetPotHeightMm(document.getElementById('sysRdwcNetPotHeightMm')?.value);
      if (hSys != null) c2.rdwcNetPotHeightMm = hSys;
      else delete c2.rdwcNetPotHeightMm;
      c2.rdwcCenterSpacingCm = g('sysRdwcCenterSpacingCm', c.rdwcCenterSpacingCm || 45);
      c2.rdwcTempObjetivoC = g('sysRdwcTempObjetivoC', c.rdwcTempObjetivoC || 19);
      c2.rdwcHeadM = g('sysRdwcHeadM', c.rdwcHeadM || 1.2);
      c2.rdwcLineLenM = g('sysRdwcLineLenM', c.rdwcLineLenM || 12);
      c2.rdwcFittings = g('sysRdwcFittings', c.rdwcFittings || 12);
      const hMode = document.getElementById('sysRdwcHydroMode');
      c2.rdwcHydroMode = hMode && hMode.value ? hMode.value : c.rdwcHydroMode || 'estandar';
      c2.rdwcLayout = lay && lay.value ? lay.value : c.rdwcLayout || 'line';
      renderRdwcCompatStatus(c2, 'sysRdwcCompatStatus');
      renderRdwcCalculoStatus(c2, 'sysRdwcCalcStatus');
    } else {
      const g = (id, fb) => {
        const el = document.getElementById(id);
        const n = parseFloat(String((el && el.value) || '').replace(',', '.'));
        return Number.isFinite(n) ? n : fb;
      };
      const c2 = { ...c, tipoInstalacion: 'rdwc' };
      c2.rdwcCultivoPrevisto = String(document.getElementById('setupRdwcCultivoPrevisto')?.value || '').trim();
      c2.rdwcSites = g('setupRdwcSites', c.rdwcSites || 4);
      c2.rdwcRows = g('setupRdwcRows', c.rdwcRows || 1);
      c2.rdwcBucketVolL = g('setupRdwcBucketVolL', c.rdwcBucketVolL || 20);
      c2.rdwcBucketTrabajoL = rdwcParseLitrosTrabajo(document.getElementById('setupRdwcBucketTrabajoL')?.value);
      c2.rdwcBucketTrabajoDiamCm = rdwcParseCm(document.getElementById('setupRdwcBucketTrabajoDiamCm')?.value);
      c2.rdwcBucketTrabajoProfCm = rdwcParseCm(document.getElementById('setupRdwcBucketTrabajoProfCm')?.value);
      c2.rdwcControlVolL = g('setupRdwcControlVolL', c.rdwcControlVolL || 40);
      c2.volMezclaLitros = rdwcParseLitrosTrabajo(document.getElementById('setupRdwcControlTrabajoL')?.value);
      c2.rdwcRecirculationLh = g('setupRdwcRecirculationLh', c.rdwcRecirculationLh || 1200);
      c2.rdwcAirLpm = g('setupRdwcAirLpm', c.rdwcAirLpm || 20);
      c2.rdwcNetPotMm = g('setupRdwcNetPotMm', c.rdwcNetPotMm || 125);
      const hSetup = rdwcParseNetPotHeightMm(document.getElementById('setupRdwcNetPotHeightMm')?.value);
      if (hSetup != null) c2.rdwcNetPotHeightMm = hSetup;
      else delete c2.rdwcNetPotHeightMm;
      c2.rdwcCenterSpacingCm = g('setupRdwcCenterSpacingCm', c.rdwcCenterSpacingCm || 45);
      renderRdwcCompatStatus(c2, 'setupRdwcCompatStatus');
      renderRdwcCalculoStatus(c2, 'setupRdwcCalcStatus');
    }
  };
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el || el.dataset.rdwcCompatBound === '1') return;
    el.dataset.rdwcCompatBound = '1';
    el.addEventListener('input', render);
    el.addEventListener('change', render);
  });
}

function aplicarRdwcRecomendacionBaseSistema() {
  const c = state.configTorre || (state.configTorre = {});
  if (tipoInstalacionNormalizado(c) !== 'rdwc') return;
  const sites = Math.max(2, Math.round(Number(c.rdwcSites || 4)));
  const recirc = Math.max(1200, Math.round(sites * 220));
  const air = Math.max(10, Math.round(sites * 2.5));
  const cTmp = { ...c, tipoInstalacion: 'rdwc', rdwcCultivoPrevisto: String(document.getElementById('sysRdwcCultivoPrevisto')?.value || c.rdwcCultivoPrevisto || '').trim() };
  const base = rdwcRecomendacionBaseDesdeConfig(cTmp);
  const cestaBase = base ? base.cestaBase : 125;
  const bucketBase = base ? base.bucketBase : 20;
  const sepBase = base ? base.sepBase : 45;
  const controlBase = base ? base.controlMaxBase : 40;
  const controlTrabajoBase = base ? base.controlTrabajoBase : 34;
  const setVal = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.value = String(v);
  };
  setVal('sysRdwcBucketVolL', bucketBase);
  setVal('sysRdwcNetPotMm', cestaBase);
  setVal('sysRdwcCenterSpacingCm', sepBase);
  setVal('sysRdwcControlVolL', controlBase);
  setVal('sysRdwcControlTrabajoL', controlTrabajoBase);
  setVal('sysRdwcRecirculationLh', recirc);
  setVal('sysRdwcAirLpm', air);
  setVal('sysRdwcTempObjetivoC', 19);
  setVal('sysRdwcHeadM', 1.2);
  setVal('sysRdwcLineLenM', 12);
  setVal('sysRdwcFittings', 12);
  aplicarSistemaRdwcDesdeFormulario();
  showToast('RDWC: recomendación base aplicada según cultivo');
}

function aplicarRdwcRecomendacionBaseSetup() {
  if (setupTipoInstalacion !== 'rdwc') return;
  const c = getSetupRdwcDraftSeed();
  const sites = Math.max(2, Math.round(Number(c.rdwcSites || 4)));
  const recirc = Math.max(1200, Math.round(sites * 220));
  const air = Math.max(10, Math.round(sites * 2.5));
  const cTmp = { ...c, tipoInstalacion: 'rdwc', rdwcCultivoPrevisto: String(document.getElementById('setupRdwcCultivoPrevisto')?.value || c.rdwcCultivoPrevisto || '').trim() };
  const base = rdwcRecomendacionBaseDesdeConfig(cTmp);
  const cestaBase = base ? base.cestaBase : 125;
  const bucketBase = base ? base.bucketBase : 20;
  const sepBase = base ? base.sepBase : 45;
  const controlBase = base ? base.controlMaxBase : 40;
  const controlTrabajoBase = base ? base.controlTrabajoBase : 34;
  const setVal = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.value = String(v);
  };
  setVal('setupRdwcBucketVolL', bucketBase);
  setVal('setupRdwcNetPotMm', cestaBase);
  setVal('setupRdwcCenterSpacingCm', sepBase);
  setVal('setupRdwcControlVolL', controlBase);
  setVal('setupRdwcControlTrabajoL', controlTrabajoBase);
  setVal('setupRdwcRecirculationLh', recirc);
  setVal('setupRdwcAirLpm', air);
  setupRdwcDraft = applySetupRdwcDesdeFormulario();
  try { renderSetupPage(); } catch (_) {}
  showToast('RDWC (setup): recomendación base aplicada según cultivo');
}

function torreNormalizeObjetivoCultivo(raw) {
  const v = String(raw == null ? '' : raw).trim().toLowerCase();
  return v === 'baby' || v === 'babyleaf' || v === 'alta' ? 'baby' : 'final';
}

function torreGetObjetivoCultivo(cfg) {
  const c = cfg || state.configTorre || {};
  if (c.torreObjetivoCultivo) return torreNormalizeObjetivoCultivo(c.torreObjetivoCultivo);
  const mk = typeof normalizeTorreModoActual === 'function' ? normalizeTorreModoActual(modoActual) : modoActual;
  return mk === 'mini' ? 'baby' : 'final';
}

function torreGetObjetivoSpec(objetivo) {
  const k = torreNormalizeObjetivoCultivo(objetivo);
  if (k === 'baby') {
    return {
      key: 'baby',
      label: 'Alta densidad / baby leaf (cosecha joven)',
      densidadTxt: '8–12 cm c-c',
      cicloTxt: 'cosecha joven (aprox. 20–35 días)',
    };
  }
  return {
    key: 'final',
    label: 'Planta adulta (tamaño completo)',
    densidadTxt: '15–25 cm c-c',
    cicloTxt: 'cosecha completa (aprox. 35–60 días)',
  };
}

/**
 * Multiplicador de demanda de riego para torre vertical según objetivo.
 * Permite override técnico en config (sin exponer más UI por ahora):
 * - cfg.torreObjetivoMultBaby (por defecto 0.92)
 * - cfg.torreObjetivoMultFinal (por defecto 1.06)
 */
function torreObjetivoMultiplicadorDemanda(cfg, objetivo) {
  const c = cfg || state.configTorre || {};
  const obj = torreNormalizeObjetivoCultivo(objetivo || torreGetObjetivoCultivo(c));
  const bRaw = Number(c.torreObjetivoMultBaby);
  const fRaw = Number(c.torreObjetivoMultFinal);
  const multBaby = Number.isFinite(bRaw) ? Math.max(0.7, Math.min(1.2, bRaw)) : 0.92;
  const multFinal = Number.isFinite(fRaw) ? Math.max(0.7, Math.min(1.3, fRaw)) : 1.06;
  return obj === 'baby' ? multBaby : multFinal;
}

/**
 * Perfil agronómico orientativo para torre según objetivo de cosecha.
 * Basado en prácticas habituales (baby: algo menos de EC, ciclo más corto).
 */
function torreGetObjetivoAjustes(cfg, objetivo) {
  const c = cfg || state.configTorre || {};
  const obj = torreNormalizeObjetivoCultivo(objetivo || torreGetObjetivoCultivo(c));
  const ecBabyRaw = Number(c.torreObjetivoEcMultBaby);
  const ecFinalRaw = Number(c.torreObjetivoEcMultFinal);
  const phBabyRaw = Number(c.torreObjetivoPhShiftBaby);
  const diasBabyRaw = Number(c.torreObjetivoDiasMultBaby);
  const diasFinalRaw = Number(c.torreObjetivoDiasMultFinal);
  return {
    objetivo: obj,
    ecMult: obj === 'baby'
      ? (Number.isFinite(ecBabyRaw) ? Math.max(0.7, Math.min(1.15, ecBabyRaw)) : 0.88)
      : (Number.isFinite(ecFinalRaw) ? Math.max(0.8, Math.min(1.25, ecFinalRaw)) : 1),
    phShift: obj === 'baby'
      ? (Number.isFinite(phBabyRaw) ? Math.max(-0.3, Math.min(0.4, phBabyRaw)) : 0.1)
      : 0,
    diasMult: obj === 'baby'
      ? (Number.isFinite(diasBabyRaw) ? Math.max(0.5, Math.min(1.1, diasBabyRaw)) : 0.72)
      : (Number.isFinite(diasFinalRaw) ? Math.max(0.8, Math.min(1.4, diasFinalRaw)) : 1),
  };
}

function torreAplicarObjetivoEcRango(ecRange, cfg, objetivo) {
  const c = cfg || state.configTorre || {};
  if (tipoInstalacionNormalizado(c) !== 'torre') return ecRange;
  const baseMin = Number(ecRange && ecRange.min);
  const baseMax = Number(ecRange && ecRange.max);
  if (!Number.isFinite(baseMin) || !Number.isFinite(baseMax)) return ecRange;
  const adj = torreGetObjetivoAjustes(c, objetivo);
  const minAdj = Math.max(350, Math.round(baseMin * adj.ecMult));
  const maxAdj = Math.max(minAdj + 80, Math.round(baseMax * adj.ecMult));
  return { min: minAdj, max: maxAdj };
}

function torreGetPhRangoObjetivo(nut, cfg, objetivo) {
  const c = cfg || state.configTorre || {};
  const n = nut || getNutrienteTorre();
  const base = (n && Array.isArray(n.pHRango) && n.pHRango.length >= 2) ? n.pHRango : [5.5, 6.5];
  if (tipoInstalacionNormalizado(c) !== 'torre') return [base[0], base[1]];
  const adj = torreGetObjetivoAjustes(c, objetivo);
  const pMin = Math.round((Math.max(4.8, Math.min(6.9, Number(base[0]) + adj.phShift))) * 10) / 10;
  const pMax = Math.round((Math.max(pMin + 0.2, Math.min(7.2, Number(base[1]) + adj.phShift))) * 10) / 10;
  return [pMin, pMax];
}

function torreGetDiasCosechaObjetivo(diasBase, cfg, objetivo) {
  const c = cfg || state.configTorre || {};
  const d = Number(diasBase);
  if (!Number.isFinite(d) || d <= 0) return 45;
  if (tipoInstalacionNormalizado(c) !== 'torre') return Math.max(18, Math.round(d));
  const adj = torreGetObjetivoAjustes(c, objetivo);
  return Math.max(14, Math.round(d * adj.diasMult));
}

function nftNormalizeObjetivoCultivo(raw) {
  const v = String(raw == null ? '' : raw).trim().toLowerCase();
  return v === 'baby' || v === 'babyleaf' || v === 'alta' ? 'baby' : 'final';
}

function nftGetObjetivoCultivo(cfg) {
  const c = cfg || state.configTorre || {};
  if (c.nftObjetivoCultivo) return nftNormalizeObjetivoCultivo(c.nftObjetivoCultivo);
  if (c.torreObjetivoCultivo) return torreNormalizeObjetivoCultivo(c.torreObjetivoCultivo);
  const mk = typeof normalizeTorreModoActual === 'function' ? normalizeTorreModoActual(modoActual) : modoActual;
  return mk === 'mini' ? 'baby' : 'final';
}

function nftGetObjetivoSpec(objetivo) {
  const k = nftNormalizeObjetivoCultivo(objetivo);
  if (k === 'baby') {
    return {
      key: 'baby',
      label: 'Alta densidad / baby leaf (cosecha joven)',
      densidadTxt: '8–12 cm c-c',
      cicloTxt: 'cosecha joven (aprox. 20–35 días)',
    };
  }
  return {
    key: 'final',
    label: 'Planta adulta (tamaño completo)',
    densidadTxt: '15–25 cm c-c',
    cicloTxt: 'cosecha completa (aprox. 35–60 días)',
  };
}

/** Etiquetas de nivel y plaza según tipo de instalación (índices 1-based en texto). */
function labelsUbicacionInstalacion(tipoInstal) {
  const t = (tipoInstal === 'nft' || tipoInstal === 'dwc' || tipoInstal === 'rdwc' || tipoInstal === 'torre') ? tipoInstal : 'torre';
  return {
    lblPlaza: t === 'nft' ? 'hueco' : t === 'dwc' ? 'maceta' : t === 'rdwc' ? 'cubo' : 'cesta',
    lblNivel: t === 'nft' ? 'Canal' : t === 'rdwc' ? 'Fila' : 'Nivel',
  };
}

/** Texto tipo «Canal 2, hueco 3» desde valores 1-based guardados en registro / diario. */
function formatoUbicacionEnRegistro(tipoInstal, nivel1Based, plaza1Based) {
  if (nivel1Based == null || plaza1Based == null || nivel1Based === '' || plaza1Based === '') return '';
  const n = parseInt(String(nivel1Based), 10);
  const p = parseInt(String(plaza1Based), 10);
  if (!Number.isFinite(n) || !Number.isFinite(p)) return '';
  const { lblPlaza, lblNivel } = labelsUbicacionInstalacion(tipoInstal);
  return lblNivel + ' ' + n + ', ' + lblPlaza + ' ' + p;
}

/** Tipo de instalación para mostrar una entrada antigua: snapshot; si no, config de la torre del registro; si no, activa. */
function tipoInstalParaEntradaRegistro(e) {
  const s = e && e.tipoInstalSnap;
  if (s === 'nft' || s === 'dwc' || s === 'rdwc' || s === 'torre') return s;
  const tid = e && e.torreId;
  if (tid != null && Array.isArray(state.torres)) {
    const tr = state.torres.find(t => t.id === tid);
    if (tr && tr.config) return tipoInstalacionNormalizado(tr.config);
  }
  return tipoInstalacionNormalizado(state.configTorre || {});
}

/** Nombre/emoji del sistema para entradas históricas (registro/mediciones/recargas). */
function infoSistemaEntrada(e) {
  const fallback = { nombre: 'Instalación', emoji: '🌿' };
  if (!e || typeof e !== 'object') return fallback;
  const nombreDirecto = String(e.torreNombre || '').trim();
  const emojiDirecto = e.torreEmoji || '🌿';
  if (nombreDirecto) return { nombre: nombreDirecto, emoji: emojiDirecto };
  const tid = e.torreId;
  if (tid != null && Array.isArray(state.torres)) {
    const tr = state.torres.find(t => t.id === tid);
    if (tr) return {
      nombre: (String(tr.nombre || '').trim() || 'Instalación'),
      emoji: tr.emoji || '🌿',
    };
  }
  const ta = getTorreActiva ? getTorreActiva() : null;
  if (ta) return {
    nombre: (String(ta.nombre || '').trim() || 'Instalación'),
    emoji: ta.emoji || '🌿',
  };
  return fallback;
}
let setupEquipamiento = new Set(['difusor', 'calentador', 'bomba']);
/** NFT: Ø interior línea de alimentación/distribución desde bomba (no el canal de cultivo 75–110 mm), mm — 16–40 */
let setupNftTuboMm = 25;
let setupNftCanalDiamMm = 90;

function readNftCanalGeomFromSetupUi() {
  const rect = document.getElementById('nftCanalFormaRect')?.classList.contains('selected');
  const lamRaw = parseFloat(String(document.getElementById('sliderNftLamina')?.value ?? '3'));
  const laminaMm = Number.isFinite(lamRaw) ? Math.min(6, Math.max(2, lamRaw)) : 3;
  const longRaw = parseFloat(String(document.getElementById('nftLongCanalM')?.value || '').replace(',', '.'));
  const anchoRaw = parseInt(String(document.getElementById('nftCanalAnchoMm')?.value || '100'), 10);
  return {
    forma: rect ? 'rectangular' : 'redondo',
    diamMm: Math.min(160, Math.max(50, setupNftCanalDiamMm || 90)),
    anchoMm: Number.isFinite(anchoRaw) ? Math.min(220, Math.max(40, anchoRaw)) : 100,
    laminaMm,
    longCanalM: Number.isFinite(longRaw) && longRaw > 0 ? Math.min(15, Math.max(0.5, longRaw)) : null,
  };
}

function onSliderNftLaminaInput() {
  const s = document.getElementById('sliderNftLamina');
  const v = document.getElementById('valNftLamina');
  if (v && s) v.innerHTML = s.value + '<span class="setup-inline-unit-mm"> mm</span>';
  updateNftSetupPreview();
}

function seleccionarNftCanalForma(which) {
  const rect = which !== 'redondo';
  const rd = document.getElementById('nftCanalFormaRedondo');
  const rt = document.getElementById('nftCanalFormaRect');
  const wrapR = document.getElementById('nftCanalRedondoWrap');
  const wrapRt = document.getElementById('nftCanalRectWrap');
  if (rd) {
    rd.classList.toggle('selected', !rect);
    rd.setAttribute('aria-pressed', !rect ? 'true' : 'false');
  }
  if (rt) {
    rt.classList.toggle('selected', rect);
    rt.setAttribute('aria-pressed', rect ? 'true' : 'false');
  }
  if (wrapR) wrapR.style.display = rect ? 'none' : 'block';
  if (wrapRt) wrapRt.style.display = rect ? 'block' : 'none';
  if (setupTipoInstalacion === 'nft') updateNftSetupPreview();
}

function seleccionarNftCanalDiam(mm) {
  setupNftCanalDiamMm = Math.max(50, Math.min(160, parseInt(String(mm), 10) || 90));
  [75, 90, 110].forEach(d => {
    const el = document.getElementById('nftCanalDiam' + d);
    if (el) el.classList.toggle('selected', d === setupNftCanalDiamMm);
  });
  if (setupTipoInstalacion === 'nft') updateNftSetupPreview();
  try {
    renderNftCultivoRecoStatus('setup');
  } catch (_) {}
}
let setupUbicacion = 'exterior';
let setupNutriente = 'canna_aqua';
let setupCoordenadas = { lat: null, lon: null, ciudad: '' };

const SETUP_TOTAL_PAGES = 8; // 0=bienvenida, 1=torre, 2=equipo, 3=nutrientes

function abrirSetup() {
  // Reconfigurar instalación existente (no crear ranura nueva) salvo que se abra «Nuevo sistema»
  setupEsNuevaTorre = false;
  setupPagina = 0;
  try {
    if (typeof resetSetupCestaVariedadDraft === 'function') resetSetupCestaVariedadDraft();
  } catch (_) {}
  const sh = (state.configTorre && state.configTorre.sensoresHardware) || {};
  setupData.sensoresHardware = {
    ec: !!sh.ec,
    ph: !!sh.ph,
    humedad: !!sh.humedad,
  };
  const c = state.configTorre || {};
  syncSetupEquipamientoDesdeConfig(c);
  setupTipoInstalacion = tipoInstalacionNormalizado(c);
  setupRdwcDraft = setupTipoInstalacion === 'rdwc' ? hcSetupClonePlain(c, {}) : null;
  if (setupTipoInstalacion === 'rdwc') {
    try { syncSetupRdwcFieldsDesdeConfig(c); } catch (_) {}
  }
  const snc = document.getElementById('sliderNftCanales');
  const snh = document.getElementById('sliderNftHuecos');
  const snp = document.getElementById('sliderNftPendiente');
  const dispN = nftDisposicionNormalizada(c.nftDisposicion);
  let sliderCanales = Math.max(1, Math.min(24, c.nftNumCanales || c.numNiveles || 4));
  if (dispN === 'escalera' && c.nftEscaleraNivelesCara != null && Number(c.nftEscaleraNivelesCara) > 0) {
    sliderCanales = Math.max(1, Math.min(12, Math.round(Number(c.nftEscaleraNivelesCara))));
  }
  if (snc) snc.value = String(sliderCanales);
  if (snh) snh.value = String(Math.max(2, Math.min(30, c.nftHuecosPorCanal || c.numCestas || 8)));
  if (snp) snp.value = String(Math.max(1, Math.min(4, c.nftPendientePct != null ? Math.round(c.nftPendientePct) : 2)));
  const altB = document.getElementById('nftAlturaBombeoCm');
  if (altB) {
    altB.value =
      c.nftAlturaBombeoCm != null && Number(c.nftAlturaBombeoCm) > 0 ? String(Math.round(Number(c.nftAlturaBombeoCm))) : '';
  }
  seleccionarNftDisposicion(c.nftDisposicion || 'mesa');
  const mmChk = document.getElementById('nftMesaMultinivelChk');
  if (mmChk) mmChk.checked = c.nftMesaMultinivel === true;
  const mmGridW = document.getElementById('nftMesaTubosPorNivelGrid');
  if (mmChk && mmChk.checked) {
    const tiersW = parseNftMesaTubosPorNivelStr(c.nftMesaTubosPorNivelStr || '');
    rebuildNftMesaMultinivelGrid('nft', tiersW.length >= 2 ? tiersW : [1, 2]);
  } else if (mmGridW) {
    mmGridW.innerHTML = '';
  }
  const mmSep = document.getElementById('nftMesaSepNivelesCm');
  if (mmSep) {
    mmSep.value =
      c.nftMesaSeparacionNivelesCm != null && Number(c.nftMesaSeparacionNivelesCm) > 0
        ? String(Math.round(Number(c.nftMesaSeparacionNivelesCm)))
        : '';
  }
  seleccionarNftEscaleraCaras(c.nftEscaleraCaras === 2 ? 2 : 1);
  onNftMesaMultinivelToggle();
  refrescarNftMontajeSubpanels();
  setupNftTuboMm = Math.max(16, Math.min(40, parseInt(String(c.nftTuboInteriorMm), 10) || 25));
  seleccionarTuboNft(setupNftTuboMm);
  setupNftCanalDiamMm = Math.max(50, Math.min(160, parseInt(String(c.nftCanalDiamMm), 10) || 90));
  const anchEl = document.getElementById('nftCanalAnchoMm');
  if (anchEl) anchEl.value = String(c.nftCanalAnchoMm != null ? c.nftCanalAnchoMm : 100);
  const lcmEl = document.getElementById('nftLongCanalM');
  if (lcmEl) lcmEl.value = c.nftLongCanalM != null && c.nftLongCanalM !== '' ? String(c.nftLongCanalM) : '';
  seleccionarNftCanalForma(c.nftCanalForma === 'rectangular' ? 'rectangular' : 'redondo');
  seleccionarNftCanalDiam(setupNftCanalDiamMm);
  const rimNftIn = document.getElementById('setupNftPotRimMm');
  const hNftIn = document.getElementById('setupNftPotHmm');
  if (rimNftIn) {
    const rNv =
      c.nftNetPotRimMm != null && Number(c.nftNetPotRimMm) > 0
        ? Math.round(Number(c.nftNetPotRimMm))
        : c.dwcNetPotRimMm != null && Number(c.dwcNetPotRimMm) > 0
          ? Math.round(Number(c.dwcNetPotRimMm))
          : '';
    rimNftIn.value = rNv !== '' ? String(rNv) : '';
  }
  if (hNftIn) {
    const hNv =
      c.nftNetPotHeightMm != null && Number(c.nftNetPotHeightMm) > 0
        ? Math.round(Number(c.nftNetPotHeightMm))
        : c.dwcNetPotHeightMm != null && Number(c.dwcNetPotHeightMm) > 0
          ? Math.round(Number(c.dwcNetPotHeightMm))
          : '';
    hNftIn.value = hNv !== '' ? String(hNv) : '';
  }
  try {
    syncNftPotRimChipsFromInput();
  } catch (_) {}
  const lamEl = document.getElementById('sliderNftLamina');
  if (lamEl) {
    const lm = Number.isFinite(parseFloat(String(c.nftLaminaAguaMm)))
      ? Math.min(5, Math.max(2, parseFloat(String(c.nftLaminaAguaMm))))
      : 3;
    lamEl.value = String(lm);
    onSliderNftLaminaInput();
  }
  const sv = document.getElementById('sliderVol');
  const svm = document.getElementById('setupVolMezclaL');
  if (sv) {
    const vmax = Number(c.volDeposito);
    const snapped = Number.isFinite(vmax) && vmax > 0
      ? Math.max(5, Math.min(100, Math.round(vmax / 5) * 5))
      : 20;
    sv.value = String(snapped);
  }
  if (svm) {
    const maxL = parseInt(sv?.value || '20', 10);
    const mez = Number(c.volMezclaLitros);
    if (Number.isFinite(mez) && mez > 0 && mez < maxL - 0.02) {
      svm.value = String(Math.round(mez * 10) / 10);
    } else {
      svm.value = '';
    }
  }
  try {
    syncDwcFormInputsDesdeConfig(c, DWC_FORM_IDS_SETUP);
  } catch (eDwc) {}

  const latC = parseFloat(c.lat);
  const lonC = parseFloat(c.lon);
  setupCoordenadas = {
    ciudad: (c.ciudad && String(c.ciudad).trim()) || '',
    lat: Number.isFinite(latC) ? latC : null,
    lon: Number.isFinite(lonC) ? lonC : null
  };
  setupData.ciudad = setupCoordenadas.ciudad || null;
  setupData.lat = setupCoordenadas.lat;
  setupData.lon = setupCoordenadas.lon;
  setupData.consejosModoUi = c.consejosModoUi === 'avanzado' ? 'avanzado' : 'principiante';

  const o = document.getElementById('setupOverlay');
  o.classList.add('open');
  renderNutrientesGrid();
  if (setupTipoInstalacion === 'nft') updateNftSetupPreview();
  else updateTorreBuilder();
  renderSetupPage();
  setTimeout(function () {
    const lhIn = document.getElementById('nftBombaUsuarioLh');
    const wIn = document.getElementById('nftBombaUsuarioW');
    if (lhIn) {
      lhIn.value =
        c.nftBombaUsuarioCaudalLh != null && c.nftBombaUsuarioCaudalLh !== ''
          ? String(c.nftBombaUsuarioCaudalLh)
          : '';
    }
    if (wIn) {
      wIn.value =
        c.nftBombaUsuarioPotenciaW != null && c.nftBombaUsuarioPotenciaW !== ''
          ? String(c.nftBombaUsuarioPotenciaW)
          : '';
    }
    if (setupTipoInstalacion === 'nft') refrescarUIMensajeBombaUsuarioNft('setup');
  }, 0);
  a11yDialogOpened(o);
}

function cerrarSetup() {
  const o = document.getElementById('setupOverlay');
  o.classList.remove('open');
  a11yDialogClosed(o);
  try {
    if (typeof scheduleTabBarCoach === 'function') scheduleTabBarCoach(500);
  } catch (_) {}
}

function iniciarConfiguracionTorre() {
  if (setupEsNuevaTorre && setupTipoInstalacion !== 'torre' && setupTipoInstalacion !== 'nft' && setupTipoInstalacion !== 'dwc' && setupTipoInstalacion !== 'rdwc') {
    showToast('Elige Torre, NFT, DWC o RDWC antes de continuar', true);
    return;
  }
  setupTipoTorre = 'custom';
  setupPagina = 1;
  renderSetupPage();
}

function seleccionarTipoInstalacionSetup(tipo) {
  if (tipo === 'nft') setupTipoInstalacion = 'nft';
  else if (tipo === 'dwc') setupTipoInstalacion = 'dwc';
  else if (tipo === 'rdwc') setupTipoInstalacion = 'rdwc';
  else setupTipoInstalacion = 'torre';
  if (setupTipoInstalacion === 'rdwc' && (!setupRdwcDraft || tipoInstalacionNormalizado(setupRdwcDraft) !== 'rdwc')) {
    const base = !setupEsNuevaTorre && tipoInstalacionNormalizado(state.configTorre || {}) === 'rdwc'
      ? state.configTorre
      : { tipoInstalacion: 'rdwc' };
    setupRdwcDraft = hcSetupClonePlain(base, {}) || {};
    setupRdwcDraft.tipoInstalacion = 'rdwc';
    if (typeof rdwcEnsureConfigDefaults === 'function') rdwcEnsureConfigDefaults(setupRdwcDraft);
  }
  refrescarSetupTipoInstalacionUI();
}

function refrescarSetupTipoInstalacionUI() {
  const torreCard = document.getElementById('setupCardTipoTorre');
  const nftCard = document.getElementById('setupCardTipoNft');
  const dwcCard = document.getElementById('setupCardTipoDwc');
  const rdwcCard = document.getElementById('setupCardTipoRdwc');
  [torreCard, nftCard, dwcCard, rdwcCard].forEach(card => {
    if (!card) return;
    card.classList.remove('selected');
    card.setAttribute('aria-pressed', 'false');
  });
  if (setupTipoInstalacion === 'torre' && torreCard) {
    torreCard.classList.add('selected');
    torreCard.setAttribute('aria-pressed', 'true');
  } else if (setupTipoInstalacion === 'nft' && nftCard) {
    nftCard.classList.add('selected');
    nftCard.setAttribute('aria-pressed', 'true');
  } else if (setupTipoInstalacion === 'dwc' && dwcCard) {
    dwcCard.classList.add('selected');
    dwcCard.setAttribute('aria-pressed', 'true');
  } else if (setupTipoInstalacion === 'rdwc' && rdwcCard) {
    rdwcCard.classList.add('selected');
    rdwcCard.setAttribute('aria-pressed', 'true');
  }
  const inlTorre = document.getElementById('setupInlineTipoTorre');
  const inlNft = document.getElementById('setupInlineTipoNft');
  const inlDwc = document.getElementById('setupInlineTipoDwc');
  const inlRdwc = document.getElementById('setupInlineTipoRdwc');
  [inlTorre, inlNft, inlDwc, inlRdwc].forEach(btn => {
    if (!btn) return;
    btn.classList.remove('selected');
    btn.setAttribute('aria-pressed', 'false');
  });
  if (setupTipoInstalacion === 'torre' && inlTorre) {
    inlTorre.classList.add('selected');
    inlTorre.setAttribute('aria-pressed', 'true');
  } else if (setupTipoInstalacion === 'nft' && inlNft) {
    inlNft.classList.add('selected');
    inlNft.setAttribute('aria-pressed', 'true');
  } else if (setupTipoInstalacion === 'dwc' && inlDwc) {
    inlDwc.classList.add('selected');
    inlDwc.setAttribute('aria-pressed', 'true');
  } else if (setupTipoInstalacion === 'rdwc' && inlRdwc) {
    inlRdwc.classList.add('selected');
    inlRdwc.setAttribute('aria-pressed', 'true');
  }
  const dn = document.getElementById('setupTorreDimNivel');
  const dc = document.getElementById('setupTorreDimCesta');
  if (dn && dc) {
    if (setupTipoInstalacion === 'dwc' || setupTipoInstalacion === 'rdwc') {
      dn.textContent = 'Filas en la tapa';
      dc.textContent = 'Cestas por fila';
    } else {
      dn.textContent = 'Niveles';
      dc.textContent = 'Cestas por nivel';
    }
  }
  const cestaBlk = document.getElementById('setupBloqueTamanoCestas');
  if (cestaBlk) cestaBlk.style.display = (setupTipoInstalacion === 'dwc' || setupTipoInstalacion === 'rdwc') ? 'none' : '';
  if (setupPagina !== 1) {
    try {
      refreshDwcTapHintSetup();
    } catch (eTapEarly) {}
    return;
  }
  const isNft = setupTipoInstalacion === 'nft';
  const isRdwc = setupTipoInstalacion === 'rdwc';
  const tw = document.getElementById('setupTorreBuilderWrap');
  const nw = document.getElementById('setupNftBuilderWrap');
  if (tw) tw.style.display = (isNft || isRdwc) ? 'none' : 'block';
  if (nw) nw.classList.toggle('setup-hidden', !isNft);
  const t1 = document.getElementById('spage1Title');
  const st = document.getElementById('spage1Subtitle');
  if (t1) {
    t1.textContent = isNft ? '🪴 Tu montaje NFT'
      : setupTipoInstalacion === 'dwc' ? '🫧 Tu DWC'
      : isRdwc ? '🧿 Tu RDWC'
      : '🌿 Tu torre vertical';
  }
  if (st) {
    st.textContent = isNft
      ? 'Canales en paralelo, huecos por canal y pendiente. La rejilla usa un nivel por canal.'
      : setupTipoInstalacion === 'dwc'
        ? 'Cubo con tapa: filas × cestas = orificios; litros = solución. Abajo: medidas del depósito, diámetro y altura de cesta, cúpulas y aire (también en Cultivo e instalación).'
        : isRdwc
          ? 'RDWC: módulos conectados y recirculación continua. Ajusta sitios, volúmenes y aireación.'
        : 'Configura las dimensiones de tu torre hidropónica vertical';
  }
  const dwcWizard = document.getElementById('setupDwcDetalleWrap');
  if (dwcWizard) dwcWizard.classList.toggle('setup-hidden', !(setupTipoInstalacion === 'dwc' || isRdwc));
  const rdwcWizard = document.getElementById('setupRdwcDetalleWrap');
  if (rdwcWizard) rdwcWizard.classList.toggle('setup-hidden', !isRdwc);
  const dwcSoloWizard = document.getElementById('setupDwcSoloBloque');
  if (dwcSoloWizard) dwcSoloWizard.classList.toggle('setup-hidden', isRdwc);
  if (isRdwc) {
    try { syncSetupRdwcFieldsDesdeConfig(setupRdwcDraft || state.configTorre || {}); } catch (_) {}
  }
  const capMaxWrap = document.getElementById('setupVolCapacidadMaxWrap');
  if (capMaxWrap) capMaxWrap.style.display = (setupTipoInstalacion === 'dwc' || isRdwc) ? 'none' : '';
  const dwcCapHint = document.getElementById('setupDwcCapacidadEstimada');
  if (dwcCapHint && setupTipoInstalacion !== 'dwc') {
    dwcCapHint.classList.add('setup-hidden');
    dwcCapHint.textContent = '';
  }
  const mezLab = document.getElementById('setupVolMezclaLabel');
  const mezAyuda = document.getElementById('setupVolMezclaAyuda');
  if (mezLab && mezAyuda) {
    if (setupTipoInstalacion === 'dwc') {
      mezLab.textContent = 'Litros con los que vas a trabajar (opcional)';
      mezAyuda.textContent =
        'Vacío = usamos la capacidad calculada con las medidas del depósito. Si aún no las pusiste, un valor orientativo interno. Si llenas menos, las dosis usan esos litros.';
    } else {
      mezLab.textContent = 'Litros de mezcla (opcional)';
      mezAyuda.textContent =
        'Vacío = llenar hasta el máximo. Si rellenas a menos (p. ej. 19 L en depósito de 20 L), las dosis se calculan sobre esos litros.';
    }
  }
  if (setupTipoInstalacion === 'dwc') {
    try {
      onSetupDwcMedidasInput();
    } catch (eDwcVol) {}
  }
  syncSetupPreviewDiagramPorTipoInstalacion();
  if (isNft) {
    refrescarDocTuberiaNftSetup();
    try {
      refrescarNftMontajeSubpanels();
      refrescarNftCanalesSliderEtiqueta();
    } catch (e) {}
  }
}

/** Actualiza el gráfico del paso 1 según Torre vs NFT (asistente). */
function syncSetupPreviewDiagramPorTipoInstalacion() {
  if (typeof setupPagina === 'undefined' || setupPagina !== 1) return;
  if (setupTipoInstalacion === 'nft') updateNftSetupPreview();
  else updateTorreBuilder();
}

function onSetupVolSliderInput() {
  if (setupTipoInstalacion === 'nft') updateNftSetupPreview();
  else updateTorreBuilder();
  const mezEl = document.getElementById('setupVolMezclaL');
  if (mezEl && mezEl.value.trim()) {
    const maxL = getSetupVolumenMaxLitros();
    const m = parseFloat(String(mezEl.value).replace(',', '.'));
    if (Number.isFinite(m) && m > maxL) mezEl.value = String(maxL);
  }
  if (typeof setupPagina !== 'undefined' && setupPagina >= 4) renderDosisSetup();
  if (typeof setupPagina !== 'undefined' && setupPagina === 7) actualizarResumenSetup();
}

function onSetupVolMezclaInput() {
  const maxL = getSetupVolumenMaxLitros();
  const el = document.getElementById('setupVolMezclaL');
  if (!el) return;
  const raw = el.value.trim();
  if (raw) {
    const m = parseFloat(String(raw).replace(',', '.'));
    if (Number.isFinite(m) && m > maxL) el.value = String(maxL);
    if (Number.isFinite(m) && m > 0 && m < 0.5) el.value = '0.5';
  }
  if (typeof setupPagina !== 'undefined' && setupPagina >= 4) renderDosisSetup();
  if (typeof setupPagina !== 'undefined' && setupPagina === 7) actualizarResumenSetup();
}

/**
 * Geometría del canal de cultivo (no la línea de alimentación).
 * @param {object} cfg state.configTorre o fragmento
 */
function nftCanalGeomDesdeConfig(cfg) {
  const c = cfg || {};
  const forma = c.nftCanalForma === 'rectangular' ? 'rectangular' : 'redondo';
  const lamRaw = parseFloat(String(c.nftLaminaAguaMm));
  const laminaMm = Number.isFinite(lamRaw) ? Math.min(6, Math.max(2, lamRaw)) : 3;
  const longRaw = parseFloat(String(c.nftLongCanalM));
  const longCanalM =
    Number.isFinite(longRaw) && longRaw > 0 ? Math.min(15, Math.max(0.5, longRaw)) : null;
  const diamRaw = parseInt(String(c.nftCanalDiamMm), 10);
  const diamMm = Number.isFinite(diamRaw) ? Math.min(160, Math.max(50, diamRaw)) : 90;
  const anchoRaw = parseInt(String(c.nftCanalAnchoMm), 10);
  const anchoMm = Number.isFinite(anchoRaw) ? Math.min(220, Math.max(40, anchoRaw)) : 100;
  return { forma, laminaMm, longCanalM, diamMm, anchoMm };
}

/** Área efectiva (mm²) del flujo con lámina de agua en el fondo del canal. */
function nftAreaFlujoLaminaMm2(g) {
  const lam = Math.min(6, Math.max(2, g.laminaMm || 3));
  if (g.forma === 'rectangular') {
    const w = Math.min(220, Math.max(40, g.anchoMm || 100));
    return Math.max(1, w * lam);
  }
  const D = Math.min(160, Math.max(50, g.diamMm || 90));
  const R = D / 2;
  const h = Math.min(lam, Math.max(0.3, R - 0.25));
  const dy = R - h;
  const halfW = Math.sqrt(Math.max(0, R * R - dy * dy));
  const wMm = 2 * halfW;
  return Math.max(1, wMm * lam);
}

/** NFT: mesa (horizontal), escalera/inclinado (peldaños), pared (tubos horizontales en zigzag en muro). */
function nftDisposicionNormalizada(v) {
  const s = String(v == null ? '' : v).toLowerCase();
  if (s === 'escalera') return 'escalera';
  if (s === 'pared' || s === 'mural' || s === 'vertical') return 'pared';
  return 'mesa';
}

/** @returns {number[]} tubos por franja de arriba a abajo */
function parseNftMesaTubosPorNivelStr(str) {
  const s = String(str == null ? '' : str).trim();
  if (!s) return [];
  const parts = s.split(/[,;\s]+/).filter(Boolean);
  const out = [];
  for (const p of parts) {
    const n = parseInt(p, 10);
    if (Number.isFinite(n) && n >= 1 && n <= 12) out.push(n);
  }
  return out.slice(0, 8);
}

/** Serializa tubos por nivel desde la cuadrícula del asistente (nft) o Cultivo e instalación (sys). */
function getNftMesaTubosPorNivelStrFromGrid(prefix) {
  const isSys = prefix === 'sys';
  const nEl = document.getElementById(isSys ? 'sysNftMesaNumNiveles' : 'nftMesaNumNiveles');
  let n = parseInt(String(nEl && nEl.value != null ? nEl.value : ''), 10);
  if (!Number.isFinite(n) || n < 2) n = 2;
  n = Math.min(8, n);
  const parts = [];
  for (let i = 0; i < n; i++) {
    const id = (isSys ? 'sysNftMesaTubosNivel_' : 'nftMesaTubosNivel_') + i;
    const v = parseInt(String(document.getElementById(id)?.value || ''), 10);
    parts.push(Math.min(12, Math.max(1, Number.isFinite(v) ? v : 1)));
  }
  return parts.join(',');
}

function rebuildNftMesaMultinivelGrid(prefix, tiersInit) {
  const isSys = prefix === 'sys';
  const gridId = isSys ? 'sysNftMesaTubosPorNivelGrid' : 'nftMesaTubosPorNivelGrid';
  const numId = isSys ? 'sysNftMesaNumNiveles' : 'nftMesaNumNiveles';
  const grid = document.getElementById(gridId);
  const numInp = document.getElementById(numId);
  if (!grid || !numInp) return;
  let tiers = [];
  if (Array.isArray(tiersInit)) {
    tiers = tiersInit.map(t => Math.min(12, Math.max(1, parseInt(String(t), 10) || 1)));
  } else {
    tiers = parseNftMesaTubosPorNivelStr(String(tiersInit || ''));
  }
  if (tiers.length < 2) tiers = [1, 2];
  tiers = tiers.slice(0, 8);
  numInp.value = String(Math.min(8, Math.max(2, tiers.length)));
  const n = parseInt(String(numInp.value), 10) || 2;
  while (tiers.length < n) tiers.push(1);
  tiers = tiers.slice(0, n);
  let html = '';
  for (let i = 0; i < n; i++) {
    const id = (isSys ? 'sysNftMesaTubosNivel_' : 'nftMesaTubosNivel_') + i;
    const val = tiers[i] != null ? tiers[i] : 1;
    let lab = 'Nivel ' + (i + 1) + ' (de arriba a abajo)';
    if (i === 0) lab = 'Nivel superior — tubos';
    if (i === n - 1 && n > 1) lab = 'Nivel inferior — tubos';
    const ev = isSys ? '' : ' oninput="updateNftSetupPreview()"';
    html +=
      '<div class="nft-tier-row">' +
      '<label class="form-label" for="' +
      id +
      '" class="nft-tier-label">' +
      escHtmlUi(lab) +
      '</label>' +
      '<input type="number" id="' +
      id +
      '" min="1" max="12" step="1" value="' +
      val +
      '" inputmode="numeric" autocomplete="off"' +
      ev +
      ' class="nft-tier-input"/>' +
      '</div>';
  }
  grid.innerHTML = html;
}

function onNftWizardMesaNumNivelesChange() {
  const want = Math.min(8, Math.max(2, parseInt(String(document.getElementById('nftMesaNumNiveles')?.value || ''), 10) || 2));
  const prev = [];
  for (let i = 0; i < 8; i++) {
    const el = document.getElementById('nftMesaTubosNivel_' + i);
    if (el) prev.push(Math.min(12, Math.max(1, parseInt(String(el.value), 10) || 1)));
  }
  while (prev.length < want) prev.push(1);
  rebuildNftMesaMultinivelGrid('nft', prev.slice(0, want));
  document.getElementById('nftMesaNumNiveles').value = String(want);
  if (typeof updateNftSetupPreview === 'function') updateNftSetupPreview();
}

function onSistemaNftMesaNumNivelesChange() {
  const want = Math.min(8, Math.max(2, parseInt(String(document.getElementById('sysNftMesaNumNiveles')?.value || ''), 10) || 2));
  const prev = [];
  for (let i = 0; i < 8; i++) {
    const el = document.getElementById('sysNftMesaTubosNivel_' + i);
    if (el) prev.push(Math.min(12, Math.max(1, parseInt(String(el.value), 10) || 1)));
  }
  while (prev.length < want) prev.push(1);
  rebuildNftMesaMultinivelGrid('sys', prev.slice(0, want));
  document.getElementById('sysNftMesaNumNiveles').value = String(want);
}

function nftEscaleraCarasNormalizada(v) {
  const n = parseInt(String(v), 10);
  return n === 2 ? 2 : 1;
}

/**
 * Canales hidráulicos efectivos y metadatos de montaje para cálculo y SVG.
 * @returns {{ nCh: number, nHx: number, mesaTiers?: number[], escaleraNiveles?: number, escaleraCaras?: number }}
 */
function getNftHidraulicaDesdeConfig(cfg) {
  cfg = cfg || {};
  const disp = nftDisposicionNormalizada(cfg.nftDisposicion);
  const hx = Math.min(30, Math.max(2, parseInt(String(cfg.nftHuecosPorCanal ?? cfg.numCestas ?? 8), 10) || 8));
  if (disp === 'mesa' && cfg.nftMesaMultinivel) {
    const tiers = parseNftMesaTubosPorNivelStr(cfg.nftMesaTubosPorNivelStr);
    if (tiers.length >= 2) {
      const sumT = tiers.reduce((a, b) => a + b, 0);
      return { nCh: Math.min(24, Math.max(1, sumT)), nHx: hx, mesaTiers: tiers };
    }
  }
  if (disp === 'escalera') {
    const caras = nftEscaleraCarasNormalizada(cfg.nftEscaleraCaras);
    let nv = parseInt(String(cfg.nftEscaleraNivelesCara ?? ''), 10);
    if (!Number.isFinite(nv) || nv < 1) {
      const total = parseInt(String(cfg.nftNumCanales ?? cfg.numNiveles ?? 4), 10) || 4;
      nv = Math.max(1, Math.ceil(total / Math.max(1, caras)));
    }
    nv = Math.min(12, Math.max(1, nv));
    const nCh = Math.min(24, Math.max(1, nv * caras));
    return { nCh, nHx: hx, escaleraNiveles: nv, escaleraCaras: caras };
  }
  const nCh = Math.min(24, Math.max(1, parseInt(String(cfg.nftNumCanales ?? cfg.numNiveles ?? 4), 10) || 4));
  return { nCh, nHx: hx };
}

/** Altura estática efectiva (cm) para el cálculo de bomba: manual o estimada en mesa multinivel. */
function getNftAlturaBombeoEfectivaCm(cfg) {
  cfg = cfg || {};
  const raw = cfg.nftAlturaBombeoCm;
  if (raw != null && Number.isFinite(Number(raw)) && Number(raw) > 0) {
    return Math.min(500, Math.max(0, Math.round(Number(raw))));
  }
  const disp = nftDisposicionNormalizada(cfg.nftDisposicion);
  if (disp === 'mesa' && cfg.nftMesaMultinivel) {
    const tiers = parseNftMesaTubosPorNivelStr(cfg.nftMesaTubosPorNivelStr);
    if (tiers.length >= 2) {
      let sep = parseFloat(String(cfg.nftMesaSeparacionNivelesCm ?? '').replace(',', '.'));
      if (!Number.isFinite(sep) || sep <= 0) sep = 28;
      sep = Math.min(150, Math.max(10, sep));
      return Math.round((tiers.length - 1) * sep);
    }
  }
  return 0;
}

function readNftMontajeFromSetupUi() {
  let dispo = 'mesa';
  if (document.getElementById('nftDispEscalera')?.classList.contains('selected')) dispo = 'escalera';
  else if (document.getElementById('nftDispPared')?.classList.contains('selected')) dispo = 'pared';
  const raw = parseFloat(String(document.getElementById('nftAlturaBombeoCm')?.value || '').replace(',', '.'));
  const altCm =
    Number.isFinite(raw) && raw > 0 ? Math.min(500, Math.round(raw)) : 0;
  const mesaMultinivel = document.getElementById('nftMesaMultinivelChk')?.checked === true;
  const mesaTubosStr = mesaMultinivel ? getNftMesaTubosPorNivelStrFromGrid('nft') : '';
  const sepRaw = parseFloat(String(document.getElementById('nftMesaSepNivelesCm')?.value || '').replace(',', '.'));
  const mesaSepCm =
    Number.isFinite(sepRaw) && sepRaw > 0 ? Math.min(150, Math.round(sepRaw)) : 0;
  let escaleraCaras = 1;
  if (document.getElementById('nftEscCara2')?.classList.contains('selected')) escaleraCaras = 2;
  return {
    disposicion: dispo,
    alturaBombeoCm: altCm,
    mesaMultinivel,
    mesaTubosStr,
    mesaSepCm,
    escaleraCaras,
  };
}

function refrescarNftMontajeSubpanels() {
  const d = readNftMontajeFromSetupUi().disposicion;
  const mesaW = document.getElementById('nftMesaExtraWrap');
  const escW = document.getElementById('nftEscaleraExtraWrap');
  const hint = document.getElementById('nftAlturaBombeoHint');
  if (mesaW) mesaW.classList.toggle('setup-hidden', d !== 'mesa');
  if (escW) escW.classList.toggle('setup-hidden', d !== 'escalera');
  if (hint) {
    hint.innerHTML =
      d === 'mesa'
        ? 'Opcional en mesa plana; <strong>imprescindible</strong> en pared y escalera. En mesa multinivel puedes usar la separación entre niveles si no pones altura total.'
        : d === 'pared' || d === 'escalera'
          ? '<strong>Imprescindible</strong> en este montaje: sin altura (cm) el cálculo de bomba solo usa pérdidas orientativas.'
          : '';
  }
  const mf = document.getElementById('nftMesaMultinivelFields');
  const chk = document.getElementById('nftMesaMultinivelChk');
  if (mf && chk) mf.classList.toggle('setup-hidden', !(d === 'mesa' && chk.checked));
}

function onNftMesaMultinivelToggle() {
  const mf = document.getElementById('nftMesaMultinivelFields');
  const chk = document.getElementById('nftMesaMultinivelChk');
  if (mf && chk) mf.classList.toggle('setup-hidden', !chk.checked);
  if (chk && chk.checked && !document.getElementById('nftMesaTubosPorNivelGrid')?.innerHTML) {
    rebuildNftMesaMultinivelGrid('nft', [1, 2]);
  }
  updateNftSetupPreview();
}

function seleccionarNftEscaleraCaras(n) {
  const caras = n === 2 ? 2 : 1;
  const b1 = document.getElementById('nftEscCara1');
  const b2 = document.getElementById('nftEscCara2');
  if (b1) {
    b1.classList.toggle('selected', caras === 1);
    b1.setAttribute('aria-pressed', caras === 1 ? 'true' : 'false');
  }
  if (b2) {
    b2.classList.toggle('selected', caras === 2);
    b2.setAttribute('aria-pressed', caras === 2 ? 'true' : 'false');
  }
  if (setupTipoInstalacion === 'nft') updateNftSetupPreview();
}

function seleccionarNftDisposicion(which) {
  const w = nftDisposicionNormalizada(which);
  const ids = { mesa: 'nftDispMesa', escalera: 'nftDispEscalera', pared: 'nftDispPared' };
  Object.keys(ids).forEach(k => {
    const el = document.getElementById(ids[k]);
    if (!el) return;
    const on = k === w;
    el.classList.toggle('selected', on);
    el.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  refrescarNftMontajeSubpanels();
  if (setupTipoInstalacion === 'nft') updateNftSetupPreview();
}

function onSistemaNftMesaMultinivelToggle() {
  const mf = document.getElementById('sysNftMesaMultinivelFields');
  const chk = document.getElementById('sysNftMesaMultinivelChk');
  if (mf && chk) mf.style.display = chk.checked ? 'block' : 'none';
  if (chk && chk.checked && !document.getElementById('sysNftMesaTubosPorNivelGrid')?.innerHTML) {
    rebuildNftMesaMultinivelGrid('sys', [1, 2]);
  }
  refrescarSistemaNftMontajeSubpanels();
}

function seleccionarSistemaNftEscaleraCaras(n) {
  const caras = n === 2 ? 2 : 1;
  const b1 = document.getElementById('sysNftEscCara1');
  const b2 = document.getElementById('sysNftEscCara2');
  if (b1) {
    b1.classList.toggle('selected', caras === 1);
    b1.setAttribute('aria-pressed', caras === 1 ? 'true' : 'false');
  }
  if (b2) {
    b2.classList.toggle('selected', caras === 2);
    b2.setAttribute('aria-pressed', caras === 2 ? 'true' : 'false');
  }
}

function seleccionarSistemaNftDisposicion(which) {
  const w = nftDisposicionNormalizada(which);
  const ids = { mesa: 'sysNftDispMesa', escalera: 'sysNftDispEscalera', pared: 'sysNftDispPared' };
  Object.keys(ids).forEach(k => {
    const el = document.getElementById(ids[k]);
    if (!el) return;
    const on = k === w;
    el.classList.toggle('selected', on);
    el.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  refrescarSistemaNftMontajeSubpanels();
}

function refrescarSistemaNftMontajeSubpanels() {
  const mesaW = document.getElementById('sysNftMesaExtraWrap');
  const escW = document.getElementById('sysNftEscaleraExtraWrap');
  const rowC = document.getElementById('sysNftRowNumCanales');
  let d = 'mesa';
  if (document.getElementById('sysNftDispEscalera')?.classList.contains('selected')) d = 'escalera';
  else if (document.getElementById('sysNftDispPared')?.classList.contains('selected')) d = 'pared';
  if (mesaW) mesaW.style.display = d === 'mesa' ? 'block' : 'none';
  if (escW) escW.style.display = d === 'escalera' ? 'block' : 'none';
  if (rowC) {
    const mm = document.getElementById('sysNftMesaMultinivelChk')?.checked === true;
    rowC.style.display = d === 'escalera' ? 'none' : 'block';
    if (d === 'mesa' && mm) rowC.style.display = 'none';
  }
  const mf = document.getElementById('sysNftMesaMultinivelFields');
  const chk = document.getElementById('sysNftMesaMultinivelChk');
  if (mf && chk) mf.style.display = d === 'mesa' && chk.checked ? 'block' : 'none';
}

/** Redimensiona state.torre a la hidráulica NFT conservando huecos existentes cuando sea posible. */
function redimensionarMatrizTorreNftPreservando(cfg) {
  if (!cfg || cfg.tipoInstalacion !== 'nft') return;
  const hyd = getNftHidraulicaDesdeConfig(cfg);
  const nCh = hyd.nCh;
  const nHx = Math.min(30, Math.max(2, parseInt(String(cfg.nftHuecosPorCanal ?? cfg.numCestas ?? 8), 10) || 8));
  const empty = () => ({ variedad: '', fecha: '', notas: '', origenPlanta: '', fotos: [], fotoKeys: [] });
  const copy = o => {
    if (!o || typeof o !== 'object') return empty();
    return {
      variedad: o.variedad || '',
      fecha: o.fecha || '',
      notas: o.notas || '',
      origenPlanta:
        typeof normalizarOrigenPlanta === 'function'
          ? normalizarOrigenPlanta(o.origenPlanta)
          : (o.origenPlanta || ''),
      fotos: Array.isArray(o.fotos) ? o.fotos.slice() : [],
      fotoKeys: Array.isArray(o.fotoKeys) ? o.fotoKeys.slice() : [],
    };
  };
  const prev = state.torre || [];
  const nue = [];
  for (let i = 0; i < nCh; i++) {
    const row = [];
    const pi = prev[i];
    for (let j = 0; j < nHx; j++) {
      row.push(pi && pi[j] ? copy(pi[j]) : empty());
    }
    nue.push(row);
  }
  state.torre = nue;
  cfg.numNiveles = nCh;
  cfg.numCestas = nHx;
}

function textoResumenMontajeNftSistema(cfg) {
  if (!cfg || cfg.tipoInstalacion !== 'nft') return '';
  const d = nftDisposicionNormalizada(cfg.nftDisposicion || 'mesa');
  const dTxt = d === 'mesa' ? 'Mesa' : d === 'escalera' ? 'Escalera' : 'Pared';
  let nCh = cfg.nftNumCanales ?? cfg.numNiveles ?? 4;
  try {
    const hyd = getNftHidraulicaDesdeConfig(cfg);
    if (hyd && Number.isFinite(hyd.nCh)) nCh = hyd.nCh;
  } catch (_) {}
  const hx = cfg.nftHuecosPorCanal ?? cfg.numCestas ?? 8;
  const pend = cfg.nftPendientePct ?? 2;
  let rim =
    cfg.nftNetPotRimMm != null && Number(cfg.nftNetPotRimMm) > 0
      ? Math.round(Number(cfg.nftNetPotRimMm))
      : cfg.dwcNetPotRimMm != null && Number(cfg.dwcNetPotRimMm) > 0
        ? Math.round(Number(cfg.dwcNetPotRimMm))
        : null;
  const cestaShort = rim != null ? ' · cesta Ø' + rim + ' mm' : '';
  const objLbl = nftGetObjetivoSpec(nftGetObjetivoCultivo(cfg)).key === 'baby' ? 'baby' : 'final';
  return dTxt + ' · ' + nCh + ' tubos × ' + hx + ' huecos · ' + pend + '% pend. · obj ' + objLbl + cestaShort;
}

const SISTEMA_NFT_POT_RIM_PRESETS_MM = [27, 38, 40, 50, 75];

function syncSistemaNftPotRimChipsFromInput() {
  const el = document.getElementById('sysNftPotRimMm');
  const raw = parseInt(String(el && el.value != null ? el.value : '').trim(), 10);
  SISTEMA_NFT_POT_RIM_PRESETS_MM.forEach(d => {
    const b = document.getElementById('sysNftPotRim' + d);
    if (b) b.classList.toggle('selected', Number.isFinite(raw) && raw === d);
  });
}

function seleccionarSistemaNftPotRimPreset(mm) {
  const v = Math.max(25, Math.min(120, parseInt(String(mm), 10) || 50));
  const inp = document.getElementById('sysNftPotRimMm');
  if (inp) inp.value = String(v);
  syncSistemaNftPotRimChipsFromInput();
}

function textoResumenSistemaDwcPanel(cfg) {
  if (!cfg || cfg.tipoInstalacion !== 'dwc') return '';
  const L = cfg.dwcDepositoLargoCm;
  const W = cfg.dwcDepositoAnchoCm;
  const P = cfg.dwcDepositoProfCm;
  const forma =
    typeof dwcNormalizeDepositoForma === 'function'
      ? dwcNormalizeDepositoForma(cfg.dwcDepositoForma)
      : (cfg.dwcDepositoForma || 'prismatico');
  const n = Math.max(1, parseInt(String(cfg.numNiveles || 1), 10) || 1);
  const c = Math.max(1, parseInt(String(cfg.numCestas || 1), 10) || 1);
  const parts = [];
  const formaTxt =
    forma === 'cilindrico'
      ? 'cilíndrico'
      : forma === 'troncopiramidal'
        ? 'troncopiramidal'
        : 'prismático';
  parts.push(formaTxt);
  if (forma === 'troncopiramidal') {
    if (L && W) {
      parts.push(Math.round(Number(L)) + '×' + Math.round(Number(W)) + ' cm (tapa)');
    }
  } else if (L && W && P) {
    if (forma === 'cilindrico') {
      const dNum =
        typeof dwcDiametroInteriorCmDesdeLW === 'function'
          ? dwcDiametroInteriorCmDesdeLW(L, W)
          : (Math.abs(Number(L) - Number(W)) < 0.05 ? Number(L) : (Number(L) + Number(W)) / 2);
      const d = dNum != null && Number.isFinite(dNum) ? Math.round(dNum) : Math.round((Number(L) + Number(W)) / 2);
      parts.push('Ø' + d + ' × ' + Math.round(Number(P)) + ' cm');
    } else {
      parts.push(
        Math.round(Number(L)) + '×' + Math.round(Number(W)) + '×' + Math.round(Number(P)) + ' cm'
      );
    }
  }
  if (forma === 'troncopiramidal') {
    const vm = Number(cfg.dwcDepositoVolManualL);
    parts.push(Number.isFinite(vm) && vm > 0 ? 'útil ~' + vm + ' L' : 'indica litros útiles');
  }
  if (cfg.dwcNetPotRimMm != null && Number(cfg.dwcNetPotRimMm) > 0) {
    parts.push('Ø' + Math.round(Number(cfg.dwcNetPotRimMm)) + ' mm');
  }
  parts.push(n + '×' + c + ' macetas');
  let line = parts.join(' · ');
  if (typeof dwcTextoResumenLlenadoCm === 'function') {
    const ll = dwcTextoResumenLlenadoCm(cfg);
    if (ll) line += ll;
  }
  return line;
}

function textoResumenSistemaRdwcPanel(cfg) {
  if (!cfg || cfg.tipoInstalacion !== 'rdwc') return '';
  const s = Math.max(2, parseInt(String(cfg.rdwcSites || 4), 10) || 4);
  const r = Math.max(1, parseInt(String(cfg.rdwcRows || 1), 10) || 1);
  const b = Math.max(5, Math.round(Number(cfg.rdwcBucketVolL || 20)));
  const v = Math.max(10, Math.round(Number(cfg.rdwcControlVolL || 40)));
  const vu = rdwcParseLitrosTrabajo(cfg.volMezclaLitros);
  const q = Math.max(200, Math.round(Number(cfg.rdwcRecirculationLh || 1200)));
  const air = Math.max(1, Math.round(Number(cfg.rdwcAirLpm || 20)));
  const depTxt = vu != null ? ('depósito ' + vu + '/' + v + ' L') : ('depósito ' + v + ' L');
  return s + ' sitios · ' + r + ' fila(s) · cubo ' + b + ' L · ' + depTxt + ' · recirc ' + q + ' L/h · aire ' + air + ' L/min';
}

function applySistemaTipoPanelesColapsablesUI() {
  const cfg = state.configTorre;
  const nftCard = document.getElementById('sistemaNftMontajeCard');
  const nftBtn = document.getElementById('btnToggleSistemaNftMontaje');
  const nftBody = document.getElementById('sistemaNftMontajeBody');
  const nftRes = document.getElementById('sistemaNftMontajeResumen');
  if (nftCard && nftBtn && nftBody && cfg && cfg.tipoInstalacion === 'nft' && nftCard.style.display === 'block') {
    if (nftRes) nftRes.textContent = textoResumenMontajeNftSistema(cfg);
    const col = cfg.uiSistemaNftMontajeColapsado === true;
    nftBody.hidden = col;
    nftBtn.setAttribute('aria-expanded', col ? 'false' : 'true');
  }
  const dwcCard = document.getElementById('sistemaDwcAyudaCard');
  const dwcBtn = document.getElementById('btnToggleSistemaDwc');
  const dwcBody = document.getElementById('sistemaDwcAyudaBody');
  const dwcRes = document.getElementById('sistemaDwcResumen');
  if (dwcCard && dwcBtn && dwcBody && cfg && (cfg.tipoInstalacion === 'dwc' || cfg.tipoInstalacion === 'rdwc') && dwcCard.style.display === 'block') {
    if (dwcRes) dwcRes.textContent = cfg.tipoInstalacion === 'rdwc' ? textoResumenSistemaRdwcPanel(cfg) : textoResumenSistemaDwcPanel(cfg);
    const colD = cfg.uiSistemaDwcColapsado === true;
    dwcBody.hidden = colD;
    dwcBtn.setAttribute('aria-expanded', colD ? 'false' : 'true');
  }
}

function toggleSistemaNftMontajePanel() {
  if (!state.configTorre || state.configTorre.tipoInstalacion !== 'nft') return;
  state.configTorre.uiSistemaNftMontajeColapsado = !state.configTorre.uiSistemaNftMontajeColapsado;
  guardarEstadoTorreActual();
  saveState();
  applySistemaTipoPanelesColapsablesUI();
}

function toggleSistemaDwcPanel() {
  if (
    !state.configTorre ||
    (state.configTorre.tipoInstalacion !== 'dwc' && state.configTorre.tipoInstalacion !== 'rdwc')
  ) return;
  state.configTorre.uiSistemaDwcColapsado = !state.configTorre.uiSistemaDwcColapsado;
  guardarEstadoTorreActual();
  saveState();
  applySistemaTipoPanelesColapsablesUI();
}

function syncSistemaEcPhStrategyUI() {
  const cfg = state.configTorre || {};
  const selE = document.getElementById('sysEcPhEstrategia');
  const selI = document.getElementById('sysEcPhIntensidad');
  const ecM = document.getElementById('sysEcManualObjetivoUs');
  const phMin = document.getElementById('sysPhManualObjetivoMin');
  const phMax = document.getElementById('sysPhManualObjetivoMax');
  const hint = document.getElementById('sysEcPhStrategyHint');
  const hintMedia = document.getElementById('sysEcManualMediaFasesHint');
  const wrap = document.getElementById('sysEcPhManualWrap');
  const strategy = typeof getEcPhStrategy === 'function' ? getEcPhStrategy(cfg) : 'auto';
  const intensity = typeof getEcPhIntensity === 'function' ? getEcPhIntensity(cfg) : 'estandar';
  if (selE) selE.value = strategy;
  if (selI) selI.value = intensity;
  if (ecM) ecM.value = cfg.ecManualObjetivoUs != null ? String(cfg.ecManualObjetivoUs) : '';
  if (phMin) phMin.value = cfg.phManualObjetivoMin != null ? String(cfg.phManualObjetivoMin) : '';
  if (phMax) phMax.value = cfg.phManualObjetivoMax != null ? String(cfg.phManualObjetivoMax) : '';
  if (wrap) wrap.classList.toggle('setup-hidden', strategy !== 'manual');
  const rec =
    typeof getRecomendacionEcPhTorre === 'function' ? getRecomendacionEcPhTorre() : null;
  if (hint) {
    hint.classList.remove('setup-hidden');
    if (strategy === 'manual') {
      const ecTxt = cfg.ecManualObjetivoUs != null ? String(Math.round(Number(cfg.ecManualObjetivoUs))) : '—';
      const p0 = cfg.phManualObjetivoMin != null ? String(cfg.phManualObjetivoMin) : '—';
      const p1 = cfg.phManualObjetivoMax != null ? String(cfg.phManualObjetivoMax) : '—';
      hint.textContent = 'Modo manual activo: EC ' + ecTxt + ' µS/cm · pH ' + p0 + '–' + p1 + '.';
    } else {
      let t = rec
        ? 'Modo automático por etapa: EC ' + rec.ec.min + '–' + rec.ec.max + ' µS/cm · pH ' + rec.ph.min + '–' + rec.ph.max + '.'
        : 'Modo automático por etapa activo.';
      if (rec && rec.estrategia === 'auto') {
        if (rec.mezclaFasesDistintas) {
          t +=
            ' Varias etapas a la vez: no hay una media «por fase nominal» única; se unen los rangos vigentes de cada planta (intersección o promedio si no encajan).';
        } else if (rec.ecAgregacion === 'promedio_plantas') {
          t += ' Rangos poco compatibles entre plantas: se promedia el rango actual de cada una.';
        }
        if (rec.ecMediaFasesCatalogo && rec.ecMediaFasesCatalogo.midAvg != null) {
          t +=
            ' Referencia (una sola variedad en la instalación): media aproximada entre fases del catálogo ~' +
            rec.ecMediaFasesCatalogo.midAvg +
            ' µS/cm.';
        }
      }
      hint.textContent = t;
    }
  }
  if (hintMedia) {
    if (strategy === 'manual') {
      hintMedia.classList.remove('setup-hidden');
      const nVar =
        typeof torreVariedadesIdsAsignadas === 'function' ? torreVariedadesIdsAsignadas().length : 0;
      if (nVar > 1) {
        hintMedia.textContent =
          'Varias variedades en la instalación: no hay una media entre fases del catálogo aplicable a todo el depósito; revisa el objetivo manual con cada cultivo o usa modo automático por etapa.';
      } else if (rec && rec.ecMediaFasesCatalogo && rec.ecMediaFasesCatalogo.midAvg != null) {
        const m = rec.ecMediaFasesCatalogo;
        hintMedia.textContent =
          'Una sola variedad: media aproximada entre fases del catálogo (orientativa) ≈ ' +
          m.midAvg +
          ' µS/cm (medias de mínimos ~' +
          m.minAvg +
          ', de máximos ~' +
          m.maxAvg +
          '). Útil como referencia si quieres un EC manual fijo; el cultivo real sigue variando por etapa.';
      } else if (nVar === 0) {
        hintMedia.textContent =
          'Sin variedades asignadas en Cultivo e instalación: define plantas y fecha para alinear el manual con el catálogo, o usa solo tu criterio.';
      } else {
        hintMedia.textContent =
          'Esta variedad no define fases EC en el catálogo; usa el rango de la ficha o la tabla de variedades como referencia.';
      }
    } else {
      hintMedia.classList.add('setup-hidden');
      hintMedia.textContent = '';
    }
  }
}

function syncSistemaRdwcDesdeConfig(cfg) {
  const c = cfg || state.configTorre || {};
  if (typeof rdwcEnsureConfigDefaults === 'function') rdwcEnsureConfigDefaults(c);
  renderRdwcCultivoPrevistoSelect('sysRdwcCultivoPrevisto', c.rdwcCultivoPrevisto);
  const map = {
    sysRdwcSites: c.rdwcSites,
    sysRdwcRows: c.rdwcRows,
    sysRdwcBucketVolL: c.rdwcBucketVolL,
    sysRdwcBucketTrabajoL: c.rdwcBucketTrabajoL,
    sysRdwcBucketTrabajoDiamCm: c.rdwcBucketTrabajoDiamCm,
    sysRdwcBucketTrabajoProfCm: c.rdwcBucketTrabajoProfCm,
    sysRdwcControlVolL: c.rdwcControlVolL,
    sysRdwcControlTrabajoL: c.volMezclaLitros,
    sysRdwcRecirculationLh: c.rdwcRecirculationLh,
    sysRdwcAirLpm: c.rdwcAirLpm,
    sysRdwcNetPotMm: c.rdwcNetPotMm,
    sysRdwcNetPotHeightMm: c.rdwcNetPotHeightMm,
    sysRdwcCenterSpacingCm: c.rdwcCenterSpacingCm,
    sysRdwcTempObjetivoC: c.rdwcTempObjetivoC,
    sysRdwcHeadM: c.rdwcHeadM,
    sysRdwcLineLenM: c.rdwcLineLenM,
    sysRdwcFittings: c.rdwcFittings,
  };
  Object.keys(map).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = map[id] != null ? String(map[id]) : '';
  });
  const l = document.getElementById('sysRdwcLayout');
  if (l) l.value = c.rdwcLayout || 'line';
  const hm = document.getElementById('sysRdwcHydroMode');
  if (hm) hm.value = c.rdwcHydroMode || 'estandar';
  bindRdwcCompatLive('sys');
  renderRdwcCompatStatus(c, 'sysRdwcCompatStatus');
  renderRdwcCalculoStatus(c, 'sysRdwcCalcStatus');
}

function applySetupRdwcDesdeFormulario() {
  const c = buildRdwcConfigFromForm('setup', getSetupRdwcDraftSeed());
  setupRdwcDraft = hcSetupClonePlain(c, {});
  renderRdwcCompatStatus(c, 'setupRdwcCompatStatus');
  renderRdwcCalculoStatus(c, 'setupRdwcCalcStatus');
  return c;
}

function syncSetupRdwcFieldsDesdeConfig(cfg) {
  const c = hcSetupClonePlain(cfg || setupRdwcDraft || state.configTorre || {}, {}) || {};
  c.tipoInstalacion = 'rdwc';
  if (typeof rdwcEnsureConfigDefaults === 'function') rdwcEnsureConfigDefaults(c);
  setupRdwcDraft = hcSetupClonePlain(c, {});
  renderRdwcCultivoPrevistoSelect('setupRdwcCultivoPrevisto', c.rdwcCultivoPrevisto);
  const map = {
    setupRdwcSites: c.rdwcSites,
    setupRdwcRows: c.rdwcRows,
    setupRdwcBucketVolL: c.rdwcBucketVolL,
    setupRdwcBucketTrabajoL: c.rdwcBucketTrabajoL,
    setupRdwcBucketTrabajoDiamCm: c.rdwcBucketTrabajoDiamCm,
    setupRdwcBucketTrabajoProfCm: c.rdwcBucketTrabajoProfCm,
    setupRdwcControlVolL: c.rdwcControlVolL,
    setupRdwcControlTrabajoL: c.volMezclaLitros,
    setupRdwcRecirculationLh: c.rdwcRecirculationLh,
    setupRdwcAirLpm: c.rdwcAirLpm,
    setupRdwcNetPotMm: c.rdwcNetPotMm,
    setupRdwcNetPotHeightMm: c.rdwcNetPotHeightMm,
    setupRdwcCenterSpacingCm: c.rdwcCenterSpacingCm,
  };
  Object.keys(map).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = map[id] != null ? String(map[id]) : '';
  });
  bindRdwcCompatLive('setup');
  renderRdwcCompatStatus(c, 'setupRdwcCompatStatus');
  renderRdwcCalculoStatus(c, 'setupRdwcCalcStatus');
}

function aplicarSistemaRdwcDesdeFormulario() {
  initTorres();
  const idxAct = state.torreActiva || 0;
  const slotAct = state.torres && state.torres[idxAct] ? state.torres[idxAct] : null;
  const tipoPrevio = tipoInstalacionNormalizado((slotAct && slotAct.config) || state.configTorre || {});
  if (slotAct && slotAct.config && slotAct.config.tipoInstalacion && tipoPrevio !== 'rdwc') {
    showToast('Esta instalación no es RDWC. Para crear un RDWC nuevo usa "Nueva instalación" o el asistente.', true);
    try { syncSistemaRdwcDesdeConfig(slotAct.config); } catch (_) {}
    return;
  }
  if (typeof hcCapturarSnapshotSeguridadTorre === 'function') {
    hcCapturarSnapshotSeguridadTorre(idxAct, 'rdwc-system-save');
  }
  const c = state.configTorre || (state.configTorre = {});
  c.tipoInstalacion = 'rdwc';
  const gNum = (id, fb) => {
    const el = document.getElementById(id);
    const n = parseFloat(String(el && el.value || '').replace(',', '.'));
    return Number.isFinite(n) ? n : fb;
  };
  const cultPrevSys = String(document.getElementById('sysRdwcCultivoPrevisto')?.value || '').trim();
  if (cultPrevSys) c.rdwcCultivoPrevisto = cultPrevSys;
  else delete c.rdwcCultivoPrevisto;
  c.rdwcSites = Math.round(Math.max(2, Math.min(64, gNum('sysRdwcSites', c.rdwcSites || 4))));
  c.rdwcRows = Math.round(Math.max(1, Math.min(4, gNum('sysRdwcRows', c.rdwcRows || 1))));
  c.rdwcBucketVolL = Math.max(5, Math.min(200, gNum('sysRdwcBucketVolL', c.rdwcBucketVolL || 20)));
  const bucketTrabajoSys = rdwcParseLitrosTrabajo(document.getElementById('sysRdwcBucketTrabajoL')?.value);
  if (bucketTrabajoSys != null) c.rdwcBucketTrabajoL = Math.min(c.rdwcBucketVolL, bucketTrabajoSys);
  else delete c.rdwcBucketTrabajoL;
  const bucketTrabajoDiamSys = rdwcParseCm(document.getElementById('sysRdwcBucketTrabajoDiamCm')?.value);
  if (bucketTrabajoDiamSys != null) c.rdwcBucketTrabajoDiamCm = bucketTrabajoDiamSys;
  else delete c.rdwcBucketTrabajoDiamCm;
  const bucketTrabajoProfSys = rdwcParseCm(document.getElementById('sysRdwcBucketTrabajoProfCm')?.value);
  if (bucketTrabajoProfSys != null) c.rdwcBucketTrabajoProfCm = bucketTrabajoProfSys;
  else delete c.rdwcBucketTrabajoProfCm;
  c.rdwcControlVolL = Math.max(10, Math.min(800, gNum('sysRdwcControlVolL', c.rdwcControlVolL || 40)));
  const controlTrabajoSys = rdwcParseLitrosTrabajo(document.getElementById('sysRdwcControlTrabajoL')?.value);
  if (controlTrabajoSys != null) c.volMezclaLitros = Math.min(c.rdwcControlVolL, controlTrabajoSys);
  else delete c.volMezclaLitros;
  c.rdwcRecirculationLh = Math.max(200, Math.min(12000, gNum('sysRdwcRecirculationLh', c.rdwcRecirculationLh || 1200)));
  c.rdwcAirLpm = Math.max(1, Math.min(300, gNum('sysRdwcAirLpm', c.rdwcAirLpm || 20)));
  c.rdwcNetPotMm = Math.round(Math.max(40, Math.min(200, gNum('sysRdwcNetPotMm', c.rdwcNetPotMm || 125))));
  const netPotHeightSys = rdwcParseNetPotHeightMm(document.getElementById('sysRdwcNetPotHeightMm')?.value);
  if (netPotHeightSys != null) c.rdwcNetPotHeightMm = netPotHeightSys;
  else delete c.rdwcNetPotHeightMm;
  c.rdwcCenterSpacingCm = Math.max(20, Math.min(150, gNum('sysRdwcCenterSpacingCm', c.rdwcCenterSpacingCm || 45)));
  c.rdwcTempObjetivoC = Math.max(10, Math.min(30, gNum('sysRdwcTempObjetivoC', c.rdwcTempObjetivoC || 19)));
  c.rdwcHeadM = Math.max(0, Math.min(6, gNum('sysRdwcHeadM', c.rdwcHeadM || 1.2)));
  c.rdwcLineLenM = Math.max(1, Math.min(60, gNum('sysRdwcLineLenM', c.rdwcLineLenM || 12)));
  c.rdwcFittings = Math.round(Math.max(0, Math.min(80, gNum('sysRdwcFittings', c.rdwcFittings || 12))));
  const hm = document.getElementById('sysRdwcHydroMode');
  c.rdwcHydroMode = hm && hm.value ? hm.value : (c.rdwcHydroMode || 'estandar');
  const lay = document.getElementById('sysRdwcLayout');
  c.rdwcLayout = lay && lay.value ? lay.value : (c.rdwcLayout || 'line');
  c.numNiveles = c.rdwcRows;
  c.numCestas = Math.max(1, Math.ceil(c.rdwcSites / c.rdwcRows));
  c.volDeposito = Math.round(c.rdwcControlVolL);
  if (typeof rdwcEnsureConfigDefaults === 'function') rdwcEnsureConfigDefaults(c);
  guardarEstadoTorreActual();
  saveState();
  aplicarConfigTorre();
  try { actualizarHeaderTorre(); } catch (_) {}
  try { actualizarBadgesNutriente(); } catch (_) {}
  try { updateDashboard(); } catch (_) {}
  renderRdwcCompatStatus(c, 'sysRdwcCompatStatus');
  renderRdwcCalculoStatus(c, 'sysRdwcCalcStatus');
  showToast('✅ Datos RDWC guardados');
}

function sincronizarSistemaNftMontajeUI() {
  const card = document.getElementById('sistemaNftMontajeCard');
  const dwcInfo = document.getElementById('sistemaDwcAyudaCard');
  const torreObj = document.getElementById('sistemaTorreObjetivoCard');
  const ecphCard = document.getElementById('sistemaEcPhStrategyCard');
  const cfg = state.configTorre;
  if (ecphCard) {
    if (cfg) ecphCard.style.display = 'block';
    else ecphCard.style.display = 'none';
  }
  if (cfg) syncSistemaEcPhStrategyUI();
  if (torreObj) {
    if (cfg && cfg.tipoInstalacion === 'torre') {
      torreObj.style.display = 'block';
      const sel = document.getElementById('sysTorreObjetivoCultivo');
      if (sel) sel.value = torreGetObjetivoCultivo(cfg);
    } else {
      torreObj.style.display = 'none';
    }
  }
  if (dwcInfo) {
    if (cfg && (cfg.tipoInstalacion === 'dwc' || cfg.tipoInstalacion === 'rdwc')) {
      dwcInfo.style.display = 'block';
      const rdwcBloque = document.getElementById('sistemaRdwcBloque');
      const dwcBodyHost = document.getElementById('sistemaDwcAyudaBody');
      if (cfg.tipoInstalacion === 'rdwc') {
        if (rdwcBloque) rdwcBloque.classList.remove('setup-hidden');
        if (dwcBodyHost) {
          Array.from(dwcBodyHost.children).forEach(ch => {
            if (rdwcBloque && ch === rdwcBloque) return;
            ch.classList.add('setup-hidden');
          });
        }
        syncSistemaRdwcDesdeConfig(cfg);
      } else {
        if (rdwcBloque) rdwcBloque.classList.add('setup-hidden');
        if (dwcBodyHost) {
          Array.from(dwcBodyHost.children).forEach(ch => ch.classList.remove('setup-hidden'));
        }
        syncDwcFormInputsDesdeConfig(cfg, DWC_FORM_IDS_SISTEMA);
        try {
          refreshDwcSistemaMedidasUI();
        } catch (eDwcHint) {}
      }
    } else {
      dwcInfo.style.display = 'none';
    }
  }
  if (!card) {
    try {
      renderNftCultivoRecoStatus('sys');
    } catch (_) {}
    applySistemaTipoPanelesColapsablesUI();
    return;
  }
  if (!cfg || cfg.tipoInstalacion !== 'nft') {
    card.style.display = 'none';
    try {
      renderNftCultivoRecoStatus('sys');
    } catch (_) {}
    applySistemaTipoPanelesColapsablesUI();
    return;
  }
  card.style.display = 'block';
  const dispN = nftDisposicionNormalizada(cfg.nftDisposicion);
  seleccionarSistemaNftDisposicion(dispN);
  const altInp = document.getElementById('sysNftAlturaBombeoCm');
  if (altInp) {
    altInp.value =
      cfg.nftAlturaBombeoCm != null && Number(cfg.nftAlturaBombeoCm) > 0 ? String(Math.round(Number(cfg.nftAlturaBombeoCm))) : '';
  }
  const hxEl = document.getElementById('sysNftHuecos');
  if (hxEl) hxEl.value = String(Math.max(2, Math.min(30, cfg.nftHuecosPorCanal || cfg.numCestas || 8)));
  const pendEl = document.getElementById('sysNftPendiente');
  if (pendEl) pendEl.value = String(Math.max(1, Math.min(4, Math.round(Number(cfg.nftPendientePct)) || 2)));
  const objSel = document.getElementById('sysNftObjetivoCultivo');
  if (objSel) objSel.value = nftGetObjetivoCultivo(cfg);
  const objHint = document.getElementById('sysNftObjetivoHint');
  if (objHint) {
    const spN = nftGetObjetivoSpec(nftGetObjetivoCultivo(cfg));
    objHint.classList.remove('setup-hidden');
    objHint.textContent = 'Referencia: ' + spN.densidadTxt + ' · ' + spN.cicloTxt + '.';
  }
  const rimSysIn = document.getElementById('sysNftPotRimMm');
  const hSysIn = document.getElementById('sysNftPotHmm');
  if (rimSysIn) {
    const rNv =
      cfg.nftNetPotRimMm != null && Number(cfg.nftNetPotRimMm) > 0
        ? Math.round(Number(cfg.nftNetPotRimMm))
        : cfg.dwcNetPotRimMm != null && Number(cfg.dwcNetPotRimMm) > 0
          ? Math.round(Number(cfg.dwcNetPotRimMm))
          : '';
    rimSysIn.value = rNv !== '' ? String(rNv) : '';
  }
  if (hSysIn) {
    const hNv =
      cfg.nftNetPotHeightMm != null && Number(cfg.nftNetPotHeightMm) > 0
        ? Math.round(Number(cfg.nftNetPotHeightMm))
        : cfg.dwcNetPotHeightMm != null && Number(cfg.dwcNetPotHeightMm) > 0
          ? Math.round(Number(cfg.dwcNetPotHeightMm))
          : '';
    hSysIn.value = hNv !== '' ? String(hNv) : '';
  }
  try {
    syncSistemaNftPotRimChipsFromInput();
  } catch (_) {}
  const mmChk = document.getElementById('sysNftMesaMultinivelChk');
  if (mmChk) mmChk.checked = cfg.nftMesaMultinivel === true;
  const mmGridS = document.getElementById('sysNftMesaTubosPorNivelGrid');
  if (mmChk && mmChk.checked) {
    const tiersS = parseNftMesaTubosPorNivelStr(cfg.nftMesaTubosPorNivelStr || '');
    rebuildNftMesaMultinivelGrid('sys', tiersS.length >= 2 ? tiersS : [1, 2]);
  } else if (mmGridS) {
    mmGridS.innerHTML = '';
  }
  const bhSys = document.getElementById('sysNftBombaLh');
  const bwSys = document.getElementById('sysNftBombaW');
  if (bhSys) {
    bhSys.value =
      cfg.nftBombaUsuarioCaudalLh != null && cfg.nftBombaUsuarioCaudalLh !== ''
        ? String(cfg.nftBombaUsuarioCaudalLh)
        : '';
  }
  if (bwSys) {
    bwSys.value =
      cfg.nftBombaUsuarioPotenciaW != null && cfg.nftBombaUsuarioPotenciaW !== ''
        ? String(cfg.nftBombaUsuarioPotenciaW)
        : '';
  }
  const mmSep = document.getElementById('sysNftMesaSepCm');
  if (mmSep) {
    mmSep.value =
      cfg.nftMesaSeparacionNivelesCm != null && Number(cfg.nftMesaSeparacionNivelesCm) > 0
        ? String(Math.round(Number(cfg.nftMesaSeparacionNivelesCm)))
        : '';
  }
  seleccionarSistemaNftEscaleraCaras(cfg.nftEscaleraCaras === 2 ? 2 : 1);
  let nvEsc = 4;
  if (dispN === 'escalera' && cfg.nftEscaleraNivelesCara != null && Number(cfg.nftEscaleraNivelesCara) > 0) {
    nvEsc = Math.max(1, Math.min(12, Math.round(Number(cfg.nftEscaleraNivelesCara))));
  }
  const peld = document.getElementById('sysNftPeldaños');
  if (peld) peld.value = String(nvEsc);
  const ncEl = document.getElementById('sysNftNumCanales');
  if (ncEl) {
    let nc = Math.max(1, Math.min(24, parseInt(String(cfg.nftNumCanales ?? cfg.numNiveles ?? 4), 10) || 4));
    if (dispN === 'escalera') nc = Math.max(1, Math.min(24, nvEsc * (cfg.nftEscaleraCaras === 2 ? 2 : 1)));
    ncEl.value = String(nc);
  }
  onSistemaNftMesaMultinivelToggle();
  refrescarSistemaNftMontajeSubpanels();
  applySistemaTipoPanelesColapsablesUI();
  try {
    renderNftCultivoRecoStatus('sys');
  } catch (_) {}
}

function aplicarSistemaTorreObjetivoDesdeFormulario() {
  if (!state.configTorre || state.configTorre.tipoInstalacion !== 'torre') return;
  const sel = document.getElementById('sysTorreObjetivoCultivo');
  const objetivo = torreNormalizeObjetivoCultivo(sel && sel.value);
  state.configTorre.torreObjetivoCultivo = objetivo;
  guardarEstadoTorreActual();
  saveState();
  try { renderTorreSistemaResumenTabla(state.configTorre); } catch (_) {}
  try { refreshConsejosSiVisible(); } catch (_) {}
  showToast('Objetivo de torre guardado: ' + (objetivo === 'baby' ? 'Alta densidad / baby leaf' : 'Planta adulta (tamaño completo)'));
}

/** Checklist recarga (paso T·obj): mismo criterio que Cultivo e instalación, sincroniza el select del sistema si existe. */
function persistTorreObjetivoDesdeChecklist() {
  if (!state.configTorre || tipoInstalacionNormalizado(state.configTorre) !== 'torre') return;
  const sel = document.getElementById('clTorreObjetivoCultivo');
  if (!sel) return;
  const objetivo = torreNormalizeObjetivoCultivo(sel.value);
  state.configTorre.torreObjetivoCultivo = objetivo;
  try {
    const sysSel = document.getElementById('sysTorreObjetivoCultivo');
    if (sysSel) sysSel.value = objetivo;
  } catch (_) {}
  try {
    guardarEstadoTorreActual();
  } catch (_) {}
  try {
    saveState();
  } catch (_) {}
  try {
    renderTorreSistemaResumenTabla(state.configTorre);
  } catch (_) {}
  try {
    refreshConsejosSiVisible();
  } catch (_) {}
  try {
    evalParam();
  } catch (_) {}
  showToast(
    'Objetivo de torre: ' + (objetivo === 'baby' ? 'Alta densidad / baby leaf' : 'Planta adulta (tamaño completo)')
  );
  try {
    if (typeof renderChecklist === 'function') renderChecklist();
  } catch (_) {}
}

function aplicarSistemaEcPhStrategyDesdeFormulario() {
  if (!state.configTorre) return;
  const cfg = state.configTorre;
  const selE = document.getElementById('sysEcPhEstrategia');
  const selI = document.getElementById('sysEcPhIntensidad');
  const ecM = document.getElementById('sysEcManualObjetivoUs');
  const phMin = document.getElementById('sysPhManualObjetivoMin');
  const phMax = document.getElementById('sysPhManualObjetivoMax');
  const strategy = String(selE?.value || 'auto') === 'manual' ? 'manual' : 'auto';
  const intensityRaw = String(selI?.value || 'estandar');
  const intensity = intensityRaw === 'conservador' || intensityRaw === 'intensivo' ? intensityRaw : 'estandar';
  cfg.ecPhEstrategia = strategy;
  cfg.ecPhIntensidad = intensity;
  if (strategy === 'manual') {
    const ecN = parseInt(String(ecM?.value || '').trim(), 10);
    const p0 = parseFloat(String(phMin?.value || '').replace(',', '.'));
    const p1 = parseFloat(String(phMax?.value || '').replace(',', '.'));
    if (Number.isFinite(ecN) && ecN >= 200 && ecN <= 6000) {
      cfg.ecManualObjetivoUs = Math.round(ecN);
    } else {
      delete cfg.ecManualObjetivoUs;
    }
    if (Number.isFinite(p0) && Number.isFinite(p1) && p0 >= 4.8 && p1 <= 7.2 && p1 >= p0 + 0.1) {
      cfg.phManualObjetivoMin = Math.round(p0 * 10) / 10;
      cfg.phManualObjetivoMax = Math.round(p1 * 10) / 10;
    } else {
      delete cfg.phManualObjetivoMin;
      delete cfg.phManualObjetivoMax;
    }
  } else {
    delete cfg.ecManualObjetivoUs;
    delete cfg.phManualObjetivoMin;
    delete cfg.phManualObjetivoMax;
  }
  guardarEstadoTorreActual();
  saveState();
  try { syncSistemaEcPhStrategyUI(); } catch (_) {}
  try { actualizarBadgesNutriente(); } catch (_) {}
  try { updateDashboard(); } catch (_) {}
  try { evalParam(); } catch (_) {}
  showToast(
    strategy === 'manual'
      ? 'Estrategia guardada: EC/pH manuales bajo tu criterio.'
      : 'Estrategia guardada: EC/pH automáticos por etapa y contexto.'
  );
}

/** Desde Cultivo e instalación: mismo overlay que «configurar», saltando al paso 1 (NFT: canal, tubo Ø, lámina, bomba). */
function abrirAsistenteNftCanalYTuboDesdeSistema() {
  if (!state.configTorre || state.configTorre.tipoInstalacion !== 'nft') return;
  guardarEstadoTorreActual();
  saveState();
  abrirSetup();
  setupTipoInstalacion = 'nft';
  setupPagina = 1;
  renderSetupPage();
  try {
    updateNftSetupPreview();
  } catch (e) {}
}

function aplicarSistemaNftMontajeDesdeFormulario() {
  if (!state.configTorre || state.configTorre.tipoInstalacion !== 'nft') return;
  const cfg = state.configTorre;
  let dispo = 'mesa';
  if (document.getElementById('sysNftDispEscalera')?.classList.contains('selected')) dispo = 'escalera';
  else if (document.getElementById('sysNftDispPared')?.classList.contains('selected')) dispo = 'pared';
  cfg.nftDisposicion = dispo;
  const altRaw = parseFloat(String(document.getElementById('sysNftAlturaBombeoCm')?.value || '').replace(',', '.'));
  if (Number.isFinite(altRaw) && altRaw > 0) cfg.nftAlturaBombeoCm = Math.min(500, Math.round(altRaw));
  else delete cfg.nftAlturaBombeoCm;
  const pendSel = parseInt(String(document.getElementById('sysNftPendiente')?.value || '2'), 10);
  cfg.nftPendientePct = Math.max(1, Math.min(4, Number.isFinite(pendSel) ? pendSel : 2));
  cfg.nftObjetivoCultivo = nftNormalizeObjetivoCultivo(document.getElementById('sysNftObjetivoCultivo')?.value || cfg.nftObjetivoCultivo);
  const hxInp = parseInt(String(document.getElementById('sysNftHuecos')?.value || ''), 10);
  cfg.nftHuecosPorCanal = Math.max(2, Math.min(30, Number.isFinite(hxInp) ? hxInp : cfg.nftHuecosPorCanal || 8));
  const rimSys = parseInt(String(document.getElementById('sysNftPotRimMm')?.value ?? '').trim(), 10);
  const hSys = parseInt(String(document.getElementById('sysNftPotHmm')?.value ?? '').trim(), 10);
  if (Number.isFinite(rimSys) && rimSys >= 25 && rimSys <= 120) cfg.nftNetPotRimMm = rimSys;
  else delete cfg.nftNetPotRimMm;
  if (Number.isFinite(hSys) && hSys >= 30 && hSys <= 200) cfg.nftNetPotHeightMm = hSys;
  else delete cfg.nftNetPotHeightMm;
  const lhSys = parseFloat(String(document.getElementById('sysNftBombaLh')?.value || '').replace(',', '.'));
  const wSys = parseFloat(String(document.getElementById('sysNftBombaW')?.value || '').replace(',', '.'));
  if (Number.isFinite(lhSys) && lhSys > 0) cfg.nftBombaUsuarioCaudalLh = Math.round(lhSys);
  else delete cfg.nftBombaUsuarioCaudalLh;
  if (Number.isFinite(wSys) && wSys > 0) cfg.nftBombaUsuarioPotenciaW = Math.round(wSys);
  else delete cfg.nftBombaUsuarioPotenciaW;
  delete cfg.nftMesaMultinivel;
  delete cfg.nftMesaTubosPorNivelStr;
  delete cfg.nftMesaSeparacionNivelesCm;
  delete cfg.nftEscaleraCaras;
  delete cfg.nftEscaleraNivelesCara;
  if (dispo === 'mesa') {
    const mm = document.getElementById('sysNftMesaMultinivelChk')?.checked === true;
    const tiersStr = getNftMesaTubosPorNivelStrFromGrid('sys');
    const sepRaw = parseFloat(String(document.getElementById('sysNftMesaSepCm')?.value || '').replace(',', '.'));
    if (mm) {
      const tiers = parseNftMesaTubosPorNivelStr(tiersStr);
      if (tiers.length < 2) {
        showToast('Multinivel: elige al menos dos niveles y un tubo por nivel en la cuadrícula.', true);
        return;
      }
      cfg.nftMesaMultinivel = true;
      cfg.nftMesaTubosPorNivelStr = tiers.join(',');
      if (Number.isFinite(sepRaw) && sepRaw > 0) cfg.nftMesaSeparacionNivelesCm = Math.min(150, Math.round(sepRaw));
      else delete cfg.nftMesaSeparacionNivelesCm;
      cfg.nftNumCanales = getNftHidraulicaDesdeConfig(cfg).nCh;
    } else {
      const nc = parseInt(String(document.getElementById('sysNftNumCanales')?.value || ''), 10);
      cfg.nftNumCanales = Math.max(1, Math.min(24, Number.isFinite(nc) ? nc : 4));
    }
  } else if (dispo === 'escalera') {
    const caras = document.getElementById('sysNftEscCara2')?.classList.contains('selected') ? 2 : 1;
    cfg.nftEscaleraCaras = caras;
    const nv = parseInt(String(document.getElementById('sysNftPeldaños')?.value || ''), 10);
    cfg.nftEscaleraNivelesCara = Math.max(1, Math.min(12, Number.isFinite(nv) ? nv : 4));
    cfg.nftNumCanales = cfg.nftEscaleraNivelesCara * caras;
  } else {
    const nc = parseInt(String(document.getElementById('sysNftNumCanales')?.value || ''), 10);
    cfg.nftNumCanales = Math.max(1, Math.min(24, Number.isFinite(nc) ? nc : 4));
  }
  cfg.nftBombaEstimada = getNftBombaDesdeConfig(cfg);
  redimensionarMatrizTorreNftPreservando(cfg);
  cfg.uiSistemaNftMontajeColapsado = true;
  guardarEstadoTorreActual();
  saveState();
  aplicarConfigTorre();
  renderTorre();
  updateTorreStats();
  updateDashboard();
  actualizarBadgesNutriente();
  try {
    refrescarUIMensajeBombaUsuarioNft('checklist');
  } catch (e) {}
  if (document.getElementById('tab-consejos')?.classList.contains('active')) {
    try {
      renderConsejos();
    } catch (e2) {}
  }
  showToast('Montaje NFT aplicado');
  try {
    renderTorreSistemaResumenTabla(cfg);
  } catch (_) {}
  try {
    applySistemaTipoPanelesColapsablesUI();
  } catch (_) {}
}

const DWC_FORM_IDS_SISTEMA = {
  largo: 'sysDwcLargoCm',
  ancho: 'sysDwcAnchoCm',
  diametro: 'sysDwcDiametroCm',
  prof: 'sysDwcProfCm',
  forma: 'sysDwcDepositoForma',
  volManual: 'sysDwcVolumenManualL',
  rim: 'sysDwcPotRimMm',
  alt: 'sysDwcPotHmm',
  modo: 'sysDwcModoCultivo',
  objetivo: 'sysDwcObjetivoCultivo',
  rejillaModo: 'sysDwcRejillaPreferida',
  cupulas: 'sysDwcCupulas',
  aire: 'sysDwcEntradaAire',
};
const DWC_FORM_IDS_SETUP = {
  largo: 'setupDwcLargoCm',
  ancho: 'setupDwcAnchoCm',
  diametro: 'setupDwcDiametroCm',
  prof: 'setupDwcProfCm',
  forma: 'setupDwcDepositoForma',
  volManual: 'setupDwcVolumenManualL',
  rim: 'setupDwcPotRimMm',
  alt: 'setupDwcPotHmm',
  modo: 'setupDwcModoCultivo',
  objetivo: 'setupDwcObjetivoCultivo',
  rejillaModo: 'setupDwcRejillaPreferida',
  marco: 'setupDwcTapaMarcoMm',
  hueco: 'setupDwcTapaHuecoMm',
  cupulas: 'setupDwcCupulas',
  aire: 'setupDwcEntradaAire',
};


