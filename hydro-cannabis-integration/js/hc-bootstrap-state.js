/**
 * Estado global, localStorage, backup/import y punto de restauración.
 * Tras hc-bootstrap-config.js; antes de PIN.
 */
// ══════════════════════════════════════════════════
// ESTADO
// ══════════════════════════════════════════════════
// Variables globales — declaradas ANTES de loadState
let currentTab = 'inicio';
let editingCesta = null;
/** 'editar' = abrir ficha · 'asignar' = colocar cultivo en cestas (tras elegirlo) */
let torreInteraccionModo = 'editar';
/** false = por defecto: marcar varias cestas y «Aplicar a selección». true = cada toque aplica ya. */
let torreAsignarInstantaneo = false;
let torreCestasMultiSel = new Set();
let modoActual = 'lechuga';
let state = null; // se inicializa después

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      // Validar que tiene estructura correcta
      if (!s.torre || !Array.isArray(s.torre)) {
        console.warn('State corrupto — reiniciando');
        return initState();
      }
      // Asegurar que torre tiene la estructura correcta (5 niveles x 5 cestas)
      while (s.torre.length < NUM_NIVELES) {
        s.torre.push(
          Array(NUM_CESTAS)
            .fill(null)
            .map(() => ({ variedad: '', fecha: '', notas: '', origenPlanta: '', fotos: [], fotoKeys: [] }))
        );
      }
      s.torre.forEach((nivel, n) => {
        while (nivel.length < NUM_CESTAS) {
          nivel.push({ variedad: '', fecha: '', notas: '', origenPlanta: '', fotos: [], fotoKeys: [] });
        }
      });
      s.torre.forEach(nivel => {
        (nivel || []).forEach(cell => asegurarCamposFilaTorre(cell));
      });
      if (s.modo) modoActual = s.modo;
      normalizarNotifOpcionesEnState(s);
      return s;
    }
  } catch(e) { console.error('Error loading state:', e); }
  return initState();
}

/** Recordatorios de cultivo (recarga / medición / cosecha): por instalación en `torres[i].notifOpciones`. Solo `panelInicioColapsado` queda en raíz. MeteoAlarm va aparte. */
function normalizarNotifOpcionesEnState(s) {
  if (!s || typeof s !== 'object') return;
  const p = s.notifOpciones && typeof s.notifOpciones === 'object' ? s.notifOpciones : {};
  const panelInicioColapsado = typeof p.panelInicioColapsado === 'boolean' ? p.panelInicioColapsado : false;
  const baseFlags = {
    recarga: typeof p.recarga === 'boolean' ? p.recarga : false,
    medicion: typeof p.medicion === 'boolean' ? p.medicion : false,
    cosecha: typeof p.cosecha === 'boolean' ? p.cosecha : false,
  };
  if (Array.isArray(s.torres) && s.torres.length) {
    s.torres.forEach((t) => {
      if (!t || typeof t !== 'object') return;
      if (!t.notifOpciones || typeof t.notifOpciones !== 'object') {
        t.notifOpciones = { ...baseFlags };
      } else {
        t.notifOpciones.recarga = !!t.notifOpciones.recarga;
        t.notifOpciones.medicion = !!t.notifOpciones.medicion;
        t.notifOpciones.cosecha = !!t.notifOpciones.cosecha;
      }
    });
    s.notifOpciones = { panelInicioColapsado };
  } else {
    s.notifOpciones = {
      ...baseFlags,
      panelInicioColapsado,
    };
  }
}

/** Origen de la planta en ficha: vivero | germinacion | '' */
function normalizarOrigenPlanta(v) {
  const s = String(v == null ? '' : v).trim().toLowerCase();
  if (s === 'germinacion' || s === 'germinación') return 'germinacion';
  if (s === 'vivero') return 'vivero';
  return '';
}

function asegurarCamposFilaTorre(row) {
  if (!row || typeof row !== 'object') return;
  if (!Array.isArray(row.fotos)) row.fotos = [];
  if (!Array.isArray(row.fotoKeys)) row.fotoKeys = [];
  row.origenPlanta = normalizarOrigenPlanta(row.origenPlanta);
}

function hcOrientacionViveroHtml() {
  const inner =
    '<p class="hc-origen-hint-p"><strong>Plántula de vivero</strong>: suele traer algo de sustrato (turba, coco, etc.) en el pan de raíces. ' +
    'En hidroponía conviene <strong>retirar con cuidado lo suelto</strong> o seguir las indicaciones del vivero; evita meter tierra suelta al circuito.</p>' +
    '<p class="hc-origen-hint-p">La <strong>fecha</strong> sigue siendo el día en que entra al sistema. Con «vivero» marcado, la app suma una <strong>media de días en plug</strong> típica de ese cultivo para alinear <strong>EC/pH automáticos</strong>, riego y avisos de cosecha con una edad biológica aproximada (orientativo).</p>';
  return typeof hcWrapOrigenDetails === 'function'
    ? hcWrapOrigenDetails(inner, 'Plántula de vivero · sustrato y raíces', false)
    : inner;
}

function hcOrientacionGerminacionHtml(nombreVariedad) {
  if (typeof hcGerminacionPanelHtmlCompleto === 'function') {
    return hcGerminacionPanelHtmlCompleto(nombreVariedad || '');
  }
  const fb =
    '<p class="hc-origen-hint-p"><strong>Germinación propia</strong> — referencia orientativa (ajusta según semillero y variedad):</p>' +
    '<ol class="hc-origen-hint-ol">' +
    '<li>Coloca la semilla en <strong>sustrato hidropónico</strong> húmedo (lana de roca, coco, etc.), sin enterrar en exceso.</li>' +
    '<li>Bandeja en germinador <strong>a oscuras</strong> hasta que asome la radícula (suele ser unos <strong>2–4 días</strong> según especie y temperatura).</li>' +
    '<li>Pasa a <strong>luz de crecimiento</strong> (14–18 h/día, intensidad suave al inicio) hasta <strong>2–3 hojas reales</strong> y buen desarrollo radicular.</li>' +
    '<li><strong>Trasplanta al sistema</strong> (torre, NFT o DWC) y registra aquí la <strong>fecha de trasplante</strong>: es el día desde el que la app cuenta el ciclo.</li>' +
    '</ol>' +
    '<p class="hc-origen-hint-foot">Los días exactos dependen de la variedad y de la temperatura; revisa siempre el sobre del semillero.</p>';
  return typeof hcWrapOrigenDetails === 'function'
    ? hcWrapOrigenDetails(fb, 'Germinación propia · guía rápida', false)
    : fb;
}

function onTorreAssignOrigenChange() {
  const sel = document.getElementById('torreAssignOrigen');
  const box = document.getElementById('torreAssignOrigenHint');
  if (!box) return;
  const v = sel ? normalizarOrigenPlanta(sel.value) : '';
  if (v === 'germinacion') {
    box.classList.remove('setup-hidden');
    const nom = document.getElementById('torreAssignVariedad')?.value?.trim() || '';
    box.innerHTML = hcOrientacionGerminacionHtml(nom);
  } else if (v === 'vivero') {
    box.classList.remove('setup-hidden');
    box.innerHTML = hcOrientacionViveroHtml();
  } else {
    box.classList.add('setup-hidden');
    box.innerHTML = '';
  }
}

function onEditOrigenPlantaChange() {
  const sel = document.getElementById('editOrigenPlanta');
  const box = document.getElementById('editOrigenGerminacionHint');
  if (!box) return;
  const v = sel ? normalizarOrigenPlanta(sel.value) : '';
  if (v === 'germinacion') {
    box.classList.remove('setup-hidden');
    const nom = document.getElementById('editVariedad')?.value?.trim() || '';
    box.innerHTML = hcOrientacionGerminacionHtml(nom);
  } else if (v === 'vivero') {
    box.classList.remove('setup-hidden');
    box.innerHTML = hcOrientacionViveroHtml();
  } else {
    box.classList.add('setup-hidden');
    box.innerHTML = '';
  }
}

/** Al cambiar el cultivo en «Asignar», refresca el panel de germinación si está activo. */
function onTorreAssignVariedadGerminHint() {
  const or = document.getElementById('torreAssignOrigen');
  if (!or || normalizarOrigenPlanta(or.value) !== 'germinacion') return;
  const box = document.getElementById('torreAssignOrigenHint');
  if (!box) return;
  const nom = document.getElementById('torreAssignVariedad')?.value?.trim() || '';
  box.innerHTML = hcOrientacionGerminacionHtml(nom);
}

// Inicializar state DESPUÉS de declarar todas las variables
state = loadState();

function initState() {
  const torre = [];
  for (let n = 0; n < NUM_NIVELES; n++) {
    torre.push([]);
    for (let c = 0; c < NUM_CESTAS; c++) {
      torre[n].push({ variedad: '', fecha: '', notas: '', origenPlanta: '', fotos: [], fotoKeys: [] });
    }
  }
  const st = {
    torre,
    modo: 'lechuga',
    ultimaMedicion: null,
    ultimaRecarga: null,
    /** epoch ms — oculta aviso urgente de recarga hasta esa hora */
    recargaSnoozeHasta: null,
    configAgua: 'destilada',
    configSustrato: 'esponja',
  };
  normalizarNotifOpcionesEnState(st);
  return st;
}


function saveState() {
  try {
    // Multi-torre: la copia en state.torres[idx] es la que se rehidrata al abrir la app.
    // Sin esto, guardar solo state.torre (p. ej. tras editar una cesta) deja el slot obsoleto
    // y al recargar cargarEstadoTorre() sobrescribe la torre vacía → desaparecen plantas y el Diario.
    if (state && state.torres && state.torres.length > 0) {
      const okSaveSlot = guardarEstadoTorreActual();
      if (okSaveSlot === false) return false;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    // Verificar que se guardó correctamente
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) console.error('Error: estado no guardado en localStorage');
    return true;
  } catch(e) {
    console.error('Error saving state:', e);
    // Si falla por cuota, intentar limpiar datos antiguos
    if (e.name === 'QuotaExceededError') {
      try {
        // Liberar espacio: eliminar base64 pesados del state (las fotos YA están en IndexedDB)
        compactarStateFotos();
        localStorage.removeItem('hc_auth');
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        return true;
      } catch(e2) { console.error('No se pudo guardar:', e2); }
    }
    return false;
  }
}

function compactarStateFotos() {
  try {
    // Cestas: dejar solo keys (fotoKeys) y máximo 1 thumbnail con data
    for (let n = 0; n < (state.torre || []).length; n++) {
      for (let c = 0; c < (state.torre[n] || []).length; c++) {
        const cesta = state.torre[n][c];
        if (!cesta) continue;
        if (Array.isArray(cesta.fotos) && cesta.fotos.length > 0) {
          // Asegurar fotoKeys
          if (!Array.isArray(cesta.fotoKeys)) cesta.fotoKeys = [];
          cesta.fotos.forEach(f => { if (f?.key && !cesta.fotoKeys.includes(f.key)) cesta.fotoKeys.push(f.key); });
          // Mantener solo la última con data (si existe), el resto sin data
          let lastWithData = null;
          for (let i = cesta.fotos.length - 1; i >= 0; i--) {
            if (cesta.fotos[i]?.data) { lastWithData = cesta.fotos[i]; break; }
          }
          cesta.fotos = lastWithData ? [{ ...lastWithData, data: lastWithData.data }] : [];
        }
      }
    }

    // Registro: eliminar fotoData base64, mantener fotoKey
    if (Array.isArray(state.registro)) {
      state.registro.forEach(e => {
        if (e && e.tipo === 'foto' && e.fotoData) delete e.fotoData;
        if (e && e.tipo === 'foto_sistema' && e.fotoData) delete e.fotoData;
      });
    }
    if (state.fotosSistemaCompleto && Array.isArray(state.fotosSistemaCompleto.fotos)) {
      const arr = state.fotosSistemaCompleto.fotos;
      let lastWithData = null;
      for (let i = arr.length - 1; i >= 0; i--) {
        if (arr[i]?.data) {
          lastWithData = arr[i];
          break;
        }
      }
      state.fotosSistemaCompleto.fotos = lastWithData
        ? [{ ...lastWithData, data: lastWithData.data }]
        : [];
    }
  } catch(_) {}
}

/** Claves opcionales de localStorage que acompañan al estado principal */
const LOCALSTORAGE_EXTRA_BACKUP_KEYS = [
  'hc_auth',
  AUTH_REMEMBER_MIN_KEY,
  TUTORIAL_ASIGNAR_LS,
  TUTORIAL_EDITAR_LS,
  TUTORIAL_TORRE_TAB_LS,
  TORRE_SWIPE_HINT_LS,
];

function crearPuntoRestauracionLocal(opts = {}) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw || raw.length < 2) return false;
    JSON.parse(raw);
    const extraKeys = {};
    LOCALSTORAGE_EXTRA_BACKUP_KEYS.forEach((k) => {
      try {
        const v = localStorage.getItem(k);
        if (v != null && v !== '') extraKeys[k] = v;
      } catch (_) {}
    });
    const snapshot = {
      hydroIntegrationAutoRestore: true,
      capturedAt: new Date().toISOString(),
      reason: opts.reason || 'version-change',
      fromVersion: opts.fromVersion || null,
      toVersion: opts.toVersion || APP_BUILD_VERSION,
      main: raw,
      extraKeys,
    };
    localStorage.setItem(AUTO_RESTORE_POINT_KEY, JSON.stringify(snapshot));
    if (opts.fromVersion || opts.toVersion) {
      localStorage.setItem(
        AUTO_RESTORE_POINT_TRANSITION_KEY,
        String((opts.fromVersion || 'none') + '->' + (opts.toVersion || APP_BUILD_VERSION))
      );
    }
    return true;
  } catch (_) {
    return false;
  }
}

function gestionarCambioVersionEnArranque() {
  try {
    const prev = localStorage.getItem(APP_BUILD_VERSION_KEY) || '';
    if (prev === APP_BUILD_VERSION) return;

    const transition = String((prev || 'none') + '->' + APP_BUILD_VERSION);
    const yaGuardada = localStorage.getItem(AUTO_RESTORE_POINT_TRANSITION_KEY) === transition;
    if (!yaGuardada) {
      crearPuntoRestauracionLocal({ reason: 'before-version-upgrade', fromVersion: prev || null, toVersion: APP_BUILD_VERSION });
    }

    localStorage.setItem(APP_BUILD_VERSION_KEY, APP_BUILD_VERSION);
    showToast('ℹ️ Nueva versión detectada. Recomendado: Exportar copia de seguridad ahora.');
  } catch (_) {}
}

async function exportarEstadoIntegracion() {
  try {
    if (state && state.torres && state.torres.length > 0) guardarEstadoTorreActual();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw || raw.length < 2) {
      showToast('No hay datos que exportar', true);
      return;
    }
    JSON.parse(raw);
    const extraKeys = {};
    LOCALSTORAGE_EXTRA_BACKUP_KEYS.forEach((k) => {
      try {
        const v = localStorage.getItem(k);
        if (v != null && v !== '') extraKeys[k] = v;
      } catch (e) {}
    });
    const bundle = {
      hydroCannabisIntegrationBackup: true,
      version: 1,
      exportedAt: new Date().toISOString(),
      app: 'Hydro Cannabis · integración',
      main: raw,
      extraKeys,
    };
    const json = JSON.stringify(bundle, null, 2);
    const fname = 'hydro-cannabis-integracion-backup-' + new Date().toISOString().slice(0, 10) + '.json';

    const cap = window.hcCapacitorBackup;
    if (cap && typeof cap.isNative === 'function' && typeof cap.exportAndShare === 'function') {
      try {
        if (await cap.isNative()) {
          await cap.exportAndShare(json, fname);
          showToast('✅ Copia lista (todas las instalaciones) — elige dónde guardarla o compartir');
          return;
        }
      } catch (e) {
        showToast('Compartir (nativo): ' + (e && e.message ? e.message : e) + ' — probando descarga', true);
      }
    }

    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = fname;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('✅ Copia descargada — incluye todas las instalaciones; guárdala en un lugar seguro');
  } catch (e) {
    showToast('Error al exportar: ' + (e && e.message ? e.message : e), true);
  }
}

async function onImportEstadoFileSelected(ev) {
  const input = ev.target;
  const f = input && input.files && input.files[0];
  if (input) input.value = '';
  if (!f) return;
  try {
    const text = await f.text();
    const parsed = JSON.parse(text);
    let mainStr = null;
    if (
      parsed &&
      (parsed.hydroCannabisIntegrationBackup === true || parsed.hidrocultivoBackup === true) &&
      typeof parsed.main === 'string'
    ) {
      mainStr = parsed.main;
    } else if (parsed && Array.isArray(parsed.torre)) {
      mainStr = JSON.stringify(parsed);
    }
    if (!mainStr) {
      showToast('Archivo no reconocido (usa una copia exportada desde esta app o el JSON completo del estado)', true);
      return;
    }
    JSON.parse(mainStr);
    if (!confirm('Se reemplazará todo el estado actual en este navegador (todas las instalaciones, mediciones y ajustes) por la copia. ¿Continuar?')) return;
    if (!confirm('Segunda confirmación — no se puede deshacer.')) return;
    localStorage.setItem(STORAGE_KEY, mainStr);
    if (parsed.extraKeys && typeof parsed.extraKeys === 'object') {
      Object.keys(parsed.extraKeys).forEach((k) => {
        try {
          const v = parsed.extraKeys[k];
          if (v != null && String(v) !== '') localStorage.setItem(k, String(v));
        } catch (e2) {}
      });
    }
    showToast('✅ Copia importada — recargando…');
    setTimeout(() => { location.reload(); }, 500);
  } catch (e) {
    showToast('Error al importar: ' + (e && e.message ? e.message : e), true);
  }
}

function restaurarPuntoAutomaticoLocal() {
  try {
    const raw = localStorage.getItem(AUTO_RESTORE_POINT_KEY);
    if (!raw) {
      showToast('No hay punto automático disponible en este dispositivo', true);
      return;
    }
    const snap = JSON.parse(raw);
    if (!snap || !snap.main || typeof snap.main !== 'string') {
      showToast('Punto automático inválido', true);
      return;
    }
    JSON.parse(snap.main);
    const fecha = snap.capturedAt ? new Date(snap.capturedAt).toLocaleString() : 'fecha desconocida';
    if (!confirm('Se restaurará el último punto automático local (' + fecha + '). ¿Continuar?')) return;
    if (!confirm('Segunda confirmación — reemplazará el estado actual.')) return;
    localStorage.setItem(STORAGE_KEY, snap.main);
    if (snap.extraKeys && typeof snap.extraKeys === 'object') {
      Object.keys(snap.extraKeys).forEach((k) => {
        try {
          const v = snap.extraKeys[k];
          if (v != null && String(v) !== '') localStorage.setItem(k, String(v));
        } catch (_) {}
      });
    }
    showToast('✅ Punto automático restaurado — recargando…');
    setTimeout(() => location.reload(), 500);
  } catch (e) {
    showToast('No se pudo restaurar el punto automático: ' + (e && e.message ? e.message : e), true);
  }
}

