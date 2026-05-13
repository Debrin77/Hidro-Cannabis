/**
 * Constantes de app, Sheets, torre, helpers de cultivo y grupos (GRUPOS_CULTIVO, MODOS_CULTIVO).
 * Tras cultivos-db.js; antes de estado.
 */
// ══════════════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════════════
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyzhqlYED_glpvCQQC-ZhCHKiwrzcuyvKUYbvfd_F6X8IpVD9x6dmudRcfKWfPs4pPC/exec';

/** Aviso si falla el envío opcional a Google Sheets (datos locales ya guardados). */
function hcSheetsNotifyFailure() {
  try {
    if (typeof showToast === 'function') {
      showToast('Sin conexión o error al enviar a la hoja. Los datos siguen en este dispositivo.', true);
    }
  } catch (_) {}
}

/**
 * POST a Apps Script (no-cors: no se lee respuesta). Offline o fallo de red → toast.
 * @returns {Promise<boolean>} true si se lanzó fetch sin throw
 */
async function hcPostSheets(payload) {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    hcSheetsNotifyFailure();
    return false;
  }
  try {
    await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body
    });
    return true;
  } catch (e) {
    console.error('HidroCultivo Sheets:', e);
    hcSheetsNotifyFailure();
    return false;
  }
}

const PIN = '2506';
const AUTH_REMEMBER_MIN_KEY = 'hc_auth_remember_min';
const AUTH_TS_KEY = 'hc_auth';
const STORAGE_KEY = 'cultiva_v1';
const APP_BUILD_VERSION = '2026-05-12-integridad-instalaciones';
const APP_BUILD_VERSION_KEY = 'hc_app_build_version';
const AUTO_RESTORE_POINT_KEY = 'hc_auto_restore_point_v1';
const AUTO_RESTORE_POINT_TRANSITION_KEY = 'hc_auto_restore_transition_v1';
/** Tutorial contextual “Asignar cultivo” (1 = usuario pidió no volver a mostrar) */
const TUTORIAL_ASIGNAR_LS = 'cultiva_tutorial_asignar_v1';
const TUTORIAL_EDITAR_LS = 'cultiva_tutorial_editar_v1';
/** Bienvenida pestaña Torre (1 = ya no auto-mostrar al entrar en Torre) */
const TUTORIAL_TORRE_TAB_LS = 'cultiva_tutorial_torre_pestana_v1';
/** Ocultar texto “desliza para girar” tras primera interacción con el esquema */
const TORRE_SWIPE_HINT_LS = 'cultiva_torre_swipe_hint_v1';

// Torre: 5 niveles, 5 cestas cada uno
// Niveles activos: 1, 3 y 5 (índice 0, 2, 4)
const NIVELES_ACTIVOS = [0, 2, 4];
const NUM_NIVELES = 5;
const NUM_CESTAS = 5;

// CULTIVOS_DB — ver js/cultivos-db.js
/**
 * Icono en UI = emoji de CULTIVOS_DB. Texto en listas = cultivoNombreLista (abrev · nombre si hay abrev).
 */
function escOptionHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escHtmlUi(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Desplegable técnico unificado (&lt;details&gt;): NFT, guías de origen, tablas largas.
 * @param {string} innerHtml
 * @param {string} [summaryLabel]
 * @param {boolean} [openDefault]
 * @param {string} [variant] '' neutro (pizarra) | 'origen' acento cultivo/agua
 */
function hcWrapDetailsTech(innerHtml, summaryLabel, openDefault, variant) {
  const defLab = variant === 'origen' ? 'Ver guía' : 'Ver detalle técnico y cifras';
  const lab =
    summaryLabel != null && String(summaryLabel).trim() !== ''
      ? String(summaryLabel).trim()
      : defLab;
  const op = openDefault ? ' open' : '';
  const mod = variant === 'origen' ? ' hc-details-tech--origen' : '';
  return (
    '<details class="hc-details-tech' + mod + '"' + op + '>' +
    '<summary class="hc-details-tech-sum">' +
    escHtmlUi(lab) +
    '</summary>' +
    '<div class="hc-details-tech-body">' +
    innerHtml +
    '</div></details>'
  );
}

/**
 * @param {string} innerHtml
 * @param {string} [summaryLabel]
 * @param {boolean} [openDefault]
 */
function hcWrapOrigenDetails(innerHtml, summaryLabel, openDefault) {
  return hcWrapDetailsTech(innerHtml, summaryLabel, openDefault, 'origen');
}

/** Etiqueta en listas/selects/torre; state.variedad sigue siendo el nombre canónico (sin prefijo). */
function cultivoNombreLista(cultivo, variedadGuardada) {
  if (cultivo && cultivo.abrev) return cultivo.abrev + ' · ' + cultivo.nombre;
  if (cultivo) return cultivo.nombre;
  const v = variedadGuardada != null ? String(variedadGuardada).trim() : '';
  return v || '—';
}

function cultivoEmoji(cultivo) {
  if (!cultivo) return '⚪';
  return cultivo.emoji || '🌱';
}

/** @param {object|null} cultivo fila CULTIVOS_DB; @param {number} [fontRem] tamaño relativo en rem */
function cultivoEmojiHtml(cultivo, fontRem) {
  const em = cultivoEmoji(cultivo);
  if (!fontRem) return '<span class="cultivo-emoji-mark" aria-hidden="true">' + em + '</span>';
  if (fontRem === 1.05) return '<span class="cultivo-emoji-mark cultivo-emoji-mark--105" aria-hidden="true">' + em + '</span>';
  if (fontRem === 1.35) return '<span class="cultivo-emoji-mark cultivo-emoji-mark--135" aria-hidden="true">' + em + '</span>';
  if (fontRem === 1.4) return '<span class="cultivo-emoji-mark cultivo-emoji-mark--140" aria-hidden="true">' + em + '</span>';
  if (fontRem === 1.5) return '<span class="cultivo-emoji-mark cultivo-emoji-mark--150" aria-hidden="true">' + em + '</span>';
  return '<span class="cultivo-emoji-mark" aria-hidden="true" style="--cultivo-emoji-rem:' + fontRem + 'rem">' + em + '</span>';
}

const GRUPO_EMOJI_REP = {
  lechugas: '🥬', hojas: '🌿', asiaticas: '🍃', hierbas: '🌿', fresas: '🍓',
  frutos: '🍅', raices: '🥕', microgreens: '🌱',
};

function grupoEmojiHtml(grupoKey) {
  const em = GRUPO_EMOJI_REP[grupoKey] || '🌱';
  return '<span class="setup-grupo-icon" aria-hidden="true">' + em + '</span>';
}

function refEcPhRowEmojiHtml(row) {
  const s = String(row.cultivo || '');
  const byId = function(id) {
    const c = id ? CULTIVOS_DB.find(x => x.id === id) : null;
    if (!c) return '<span class="cultivo-emoji-mark cultivo-emoji-mark--135" aria-hidden="true">🌱</span>';
    return cultivoEmojiHtml(c, 1.35);
  };
  if (/Tomate/i.test(s)) return byId('tomate');
  if (/Pimiento|berenjena/i.test(s)) return byId('pimiento');
  if (/Pepino/i.test(s)) return byId('pepino');
  if (/Judía|guisante/i.test(s)) return byId('microgreens_mezcla');
  if (/Fresa|fresón/i.test(s)) return byId('fresa');
  if (/Brócoli|coliflor/i.test(s)) return byId('col_rizada');
  if (/Zanahoria|microverdura/i.test(s)) return byId('zanahoria');
  if (/Melón|sandía/i.test(s)) return byId('calabacin');
  /* Flores de corte: icono de flores, no lavanda (💜) */
  if (/Flores/i.test(s)) {
    return '<span class="cultivo-emoji-mark cultivo-emoji-mark--135" aria-hidden="true">🌸</span>';
  }
  if (/Cilantro|eneldo/i.test(s)) return byId('cilantro');
  if (/Albahaca|menta|perejil/i.test(s)) return byId('albahaca');
  if (/Lechuga/i.test(s)) return byId('romana');
  if (/Espinaca|acelga|kale/i.test(s)) return byId('espinaca');
  /* Una sola fila mezcla rúcula + canónigos + mostaza: hoja (🌿), nunca chile */
  if (/Rúcula|canónig|canonigo|mostaza/i.test(s)) return byId('rucula');
  return byId(null);
}

// Grupos con colores y compatibilidad
const GRUPOS_CULTIVO = {
  lechugas:    { nombre:'Lechugas',           color:'#22c55e', ec:'800-1400',   ph:'5.5-6.5',
    plantas: CULTIVOS_DB.filter(c=>c.grupo==='lechugas').map(c=>c.nombre),
    nota:'Perfectamente compatibles entre sí. El cultivo más fácil en hidroponía.' },
  hojas:       { nombre:'Hojas verdes',        color:'#84cc16', ec:'1200-2300',  ph:'6.0-7.0',
    plantas: CULTIVOS_DB.filter(c=>c.grupo==='hojas').map(c=>c.nombre),
    nota:'Rango EC variable. Espinaca y acelga necesitan EC más alta que rúcula.' },
  asiaticas:   { nombre:'Asiáticas / Mostaza', color:'#60a5fa', ec:'1200-2500',  ph:'5.5-7.0',
    plantas: CULTIVOS_DB.filter(c=>c.grupo==='asiaticas').map(c=>c.nombre),
    nota:'Mizuna y komatsuna compatibles con lechugas. Pak choi y menta necesitan torre separada.' },
  hierbas:     { nombre:'Hierbas aromáticas',  color:'#f59e0b', ec:'800-2400',   ph:'5.5-7.0',
    plantas: CULTIVOS_DB.filter(c=>c.grupo==='hierbas').map(c=>c.nombre),
    nota:'Rango EC muy variable. Menta y orégano incompatibles con lechugas. Albahaca sí.' },
  frutos:      { nombre:'Frutos',              color:'#f97316', ec:'1500-3500',  ph:'5.5-6.5',
    plantas: CULTIVOS_DB.filter(c=>c.grupo==='frutos').map(c=>c.nombre),
    nota:'EC incompatible con lechugas. Sistema dedicado obligatorio. Requieren polinización.' },
  fresas:      { nombre:'Fresas',              color:'#f43f5e', ec:'1500-2500',  ph:'5.5-6.5',
    plantas: CULTIVOS_DB.filter(c=>c.grupo==='fresas').map(c=>c.nombre),
    nota:'Compatibles con lechugas en fase vegetativa. EC aumenta en fructificación.' },
  raices:      { nombre:'Raíces',              color:'#a78bfa', ec:'1600-2200',  ph:'6.0-7.0',
    plantas: CULTIVOS_DB.filter(c=>c.grupo==='raices').map(c=>c.nombre),
    nota:'Necesitan sustrato profundo. Difíciles en torres verticales estándar.' },
  microgreens: { nombre:'Microgreens',         color:'#2dd4bf', ec:'800-1600',   ph:'5.5-6.5',
    plantas: CULTIVOS_DB.filter(c=>c.grupo==='microgreens').map(c=>c.nombre),
    nota:'Sin nutrientes los primeros días. Cosecha muy rápida (7-14 días).' },
};

// Compatibilidad: grupos que SÍ pueden compartir depósito
const COMPAT_MATRIZ = {
  lechugas:   ['lechugas','asiaticas','hierbas'], // albahaca ok, menta no
  asiaticas:  ['lechugas','asiaticas'],
  hojas:      ['hojas'],
  hierbas:    ['lechugas'],  // solo algunas
  frutos:     ['frutos'],
  fresas:     ['fresas','lechugas'],
  raices:     ['raices'],
  microgreens:['microgreens'],
};

// ALIAS por compatibilidad con código anterior (GRUPOS_CULTIVO keys A,B,C,D)
const GRUPOS_CULTIVO_OLD = {
  A: GRUPOS_CULTIVO.lechugas,
  B: GRUPOS_CULTIVO.asiaticas,
  C: GRUPOS_CULTIVO.hojas,
  D: GRUPOS_CULTIVO.hierbas,
};

// DIAS_COSECHA — definido después de CULTIVOS_DB
const DIAS_COSECHA = Object.fromEntries(
  CULTIVOS_DB.map(c => [c.nombre, c.dias])
);
DIAS_COSECHA['Pak Choi'] = 40;
DIAS_COSECHA['Bok Choy'] = 40;

// Compatibilidad entre grupos (qué mezclar y qué no)
const COMPATIBILIDAD = {
  'A-A': { ok: true,  icono: '✅', texto: 'Perfectamente compatibles' },
  'A-B': { ok: true,  icono: '✅', texto: 'Compatibles — mismo depósito' },
  'A-C': { ok: true,  icono: '⚠️', texto: 'Compatibles pero ajustar EC a 1400' },
  'A-D': { ok: true,  icono: '✅', texto: 'Compatibles — albahaca protege de plagas' },
  'B-B': { ok: true,  icono: '✅', texto: 'Perfectamente compatibles' },
  'B-C': { ok: true,  icono: '✅', texto: 'Compatibles' },
  'B-D': { ok: true,  icono: '✅', texto: 'Compatibles' },
  'C-C': { ok: true,  icono: '✅', texto: 'Compatibles' },
  'C-D': { ok: true,  icono: '✅', texto: 'Compatibles' },
  'D-D': { ok: true,  icono: '⚠️', texto: 'Compatibles — evitar mezclar menta con perejil' },
};

// Número de niveles activos según modo cultivo
const MODOS_CULTIVO = {
  lechuga:   { niveles: [0,2,4], nombre: 'Lechugas (3 niveles)', desc: 'Óptimo para EC 1300-1400 µS/cm' },
  intensivo: { niveles: [0,1,2,3,4], nombre: 'Intensivo (5 niveles)', desc: 'Solo hojas verdes compatibles' },
  mixto:     { niveles: [0,2,4], nombre: 'Mixto (3 niveles)', desc: 'Lechugas + asiáticas + hierbas' },
  mini:      { niveles: [0,2], nombre: 'Compacto (2 niveles)', desc: 'Producción reducida o plántulas' },
};

