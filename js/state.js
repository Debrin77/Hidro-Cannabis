// State

let selectedStrain = null;
let myGrow = null;
let wizStep = 0;
let wizData = {};
let appConfig = null;

const STORAGE_KEY = 'hydrogrow-pro.v1.myGrow';
const APP_CONFIG_KEY = 'hydrogrow-pro.v1.appConfig';
const THEME_KEY = 'hydrogrow-pro.v1.theme';
/** `guided` o `learning` (texto técnico y contexto extra). Sin clave guardada: aprendizaje. */
const UI_EXPERIENCE_KEY = 'hydrogrow-pro.v1.uiExperience';
/** Si es true, se salta la bienvenida/checklist inicial y se usa el asistente clásico (útil al programar). */
const SKIP_INITIAL_WELCOME_KEY = 'hydrogrow-pro.v1.skipInitialWelcome';

function isSkipInitialWelcome() {
  try {
    return localStorage.getItem(SKIP_INITIAL_WELCOME_KEY) === '1';
  } catch {
    return false;
  }
}

function setSkipInitialWelcome(on) {
  try {
    if (on) localStorage.setItem(SKIP_INITIAL_WELCOME_KEY, '1');
    else localStorage.removeItem(SKIP_INITIAL_WELCOME_KEY);
  } catch (error) {
    console.warn('No se pudo guardar preferencia de bienvenida.', error);
  }
}

function getUiExperienceMode() {
  try {
    const v = localStorage.getItem(UI_EXPERIENCE_KEY);
    if (v === 'guided') return 'guided';
    if (v === 'learning') return 'learning';
    return 'learning';
  } catch {
    return 'guided';
  }
}

function applyUiExperienceToDocument() {
  document.documentElement.setAttribute('data-ui-experience', getUiExperienceMode());
}

function setUiExperienceMode(mode) {
  const m = mode === 'learning' ? 'learning' : 'guided';
  try {
    localStorage.setItem(UI_EXPERIENCE_KEY, m);
  } catch (error) {
    console.warn('No se pudo guardar el modo de experiencia.', error);
  }
  applyUiExperienceToDocument();
  if (typeof renderAccesibilidad === 'function') {
    const v = location.hash.slice(1) || 'inicio';
    if (v === 'accesibilidad') renderAccesibilidad();
  }
  if (typeof renderInicio === 'function') renderInicio();
  if (typeof renderCultivo === 'function') renderCultivo();
  if (typeof renderMonitor === 'function') renderMonitor();
  if (typeof renderSemanas === 'function') renderSemanas();
  if (typeof renderRiego === 'function') renderRiego();
  if (typeof renderConsejosPage === 'function') renderConsejosPage();
}

/** Metadatos opcionales (p. ej. caché de módulos fusionados con HidroCultivo). */
function normalizeGrowFusion(f) {
  if (!f || typeof f !== 'object' || Array.isArray(f)) return {};
  const out = { ...f };
  if (out.riegoNative != null && (typeof out.riegoNative !== 'object' || Array.isArray(out.riegoNative))) {
    delete out.riegoNative;
  }
  if (out.growContext != null && (typeof out.growContext !== 'object' || Array.isArray(out.growContext))) {
    delete out.growContext;
  }
  return out;
}

/**
 * Resumen estable del cultivo para alinear fase 0 (modelo compartido / HC).
 * Se actualiza al guardar estado; no sustituye el cultivo completo en JSON.
 */
function syncGrowFusionContext(grow) {
  if (!grow) return;
  if (!grow.fusion || typeof grow.fusion !== 'object') grow.fusion = {};
  let siteCount = 1;
  try {
    if (typeof getConfiguredSiteCount === 'function') siteCount = getConfiguredSiteCount(grow);
  } catch (_) {
    /* ignore */
  }
  const hc =
    grow.hardwareComplements && typeof grow.hardwareComplements === 'object' && !Array.isArray(grow.hardwareComplements)
      ? grow.hardwareComplements
      : {};
  grow.fusion.growContext = {
    syncedAt: new Date().toISOString(),
    system: grow.system || null,
    placement: grow.placement || null,
    reservoirL: Number.isFinite(grow.reservoirL) ? grow.reservoirL : null,
    water: grow.water || null,
    siteCount: Number.isFinite(siteCount) ? siteCount : 1,
    strainId: grow.strain && grow.strain.id ? grow.strain.id : null,
    enclosureType: hc.enclosureType || null,
    enclosureVolumeM3: Number.isFinite(hc.enclosureVolumeM3) ? hc.enclosureVolumeM3 : null,
    activeInstallationId:
      typeof grow.activeInstallationId === 'string' && grow.activeInstallationId.trim()
        ? grow.activeInstallationId.trim()
        : null,
    nutriRank: Number.isFinite(grow.nutri) ? grow.nutri : null,
    hydroCannabisPortTier:
      typeof getSystemProfile === 'function' && grow.system
        ? getSystemProfile(grow.system).cannabisPortTier || null
        : null,
  };
}

function serializeGrow(grow) {
  if (!grow) return null;
  const payload = { ...grow };
  payload.strainId = grow.strain ? grow.strain.id : null;
  payload.startDate = grow.startDate instanceof Date ? grow.startDate.toISOString() : grow.startDate;
  delete payload.strain;
  return payload;
}

function restoreGrow(payload) {
  if (!payload || !payload.strainId) return null;
  const strain = strains.find((item) => item.id === payload.strainId);
  if (!strain) return null;
  return {
    ...payload,
    strain,
    startDate: new Date(payload.startDate || new Date()),
    log: Array.isArray(payload.log) ? payload.log : [],
    measurements: (() => {
      let arr = Array.isArray(payload.measurements)
        ? payload.measurements.map((m) => ({
            ...m,
            plantId: Number.isFinite(m.plantId) ? m.plantId : 1,
          }))
        : [];
      if (payload.system === 'RDWC') {
        arr = arr.map((m) => ({ ...m, plantId: 0 }));
      }
      return arr;
    })(),
    plantProfiles:
      payload.plantProfiles && typeof payload.plantProfiles === 'object' ? payload.plantProfiles : {},
    selectedPlant: Number.isFinite(payload.selectedPlant) ? payload.selectedPlant : 1,
    systemDisplayNames:
      payload.systemDisplayNames &&
      typeof payload.systemDisplayNames === 'object' &&
      !Array.isArray(payload.systemDisplayNames)
        ? { ...payload.systemDisplayNames }
        : {},
    activeInstallationId:
      typeof payload.activeInstallationId === 'string' && payload.activeInstallationId.trim()
        ? payload.activeInstallationId.trim()
        : undefined,
    water: payload.water || 'RO',
    reservoirL: Number.isFinite(payload.reservoirL) ? payload.reservoirL : 60,
    sourceEC: Number.isFinite(payload.sourceEC) ? payload.sourceEC : 0.1,
    sourcePH: Number.isFinite(payload.sourcePH) ? payload.sourcePH : 6.1,
    hardwareComplements: (() => {
      let hc =
        typeof normalizeHardwareComplements === 'function'
          ? normalizeHardwareComplements(payload.hardwareComplements)
          : payload.hardwareComplements || undefined;
      if (hc && typeof sanitizeHardwareComplementsForContext === 'function') {
        const pl = payload.placement === 'exterior' ? 'exterior' : 'interior';
        const enc = pl === 'exterior' ? 'outdoor' : hc.enclosureType || 'cabinet';
        hc = normalizeHardwareComplements(sanitizeHardwareComplementsForContext(pl, enc, hc));
      }
      return hc;
    })(),
    fusion: normalizeGrowFusion(payload.fusion),
  };
}

function saveGrowState() {
  try {
    if (!myGrow) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    if (typeof syncCurrentSystemWorkspaceState === 'function') syncCurrentSystemWorkspaceState();
    syncGrowFusionContext(myGrow);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeGrow(myGrow)));
  } catch (error) {
    console.warn('No se pudo guardar el cultivo localmente.', error);
  }
}

function loadGrowState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const hadLegacyRdwcIds =
      parsed.system === 'RDWC' &&
      Array.isArray(parsed.measurements) &&
      parsed.measurements.some((m) => !Number.isFinite(m.plantId) || m.plantId !== 0);
    myGrow = restoreGrow(parsed);
    if (myGrow && typeof migrateGrowWorkspacesAndActiveInstall === 'function') {
      migrateGrowWorkspacesAndActiveInstall(myGrow);
    }
    if (myGrow && typeof ensureSystemWorkspaces === 'function') ensureSystemWorkspaces(myGrow);
    if (myGrow && typeof syncCurrentSystemWorkspaceState === 'function') syncCurrentSystemWorkspaceState();
    if (myGrow) syncGrowFusionContext(myGrow);
    if (myGrow && hadLegacyRdwcIds) saveGrowState();
  } catch (error) {
    console.warn('No se pudo recuperar el cultivo guardado.', error);
    myGrow = null;
  }
}

function clearGrowState() {
  myGrow = null;
  localStorage.removeItem(STORAGE_KEY);
}

/** Cultivo, checklist inicial, appConfig, checklist experto, modos de gráfico. No borra el tema ni otras claves ajenas al prefijo. */
function purgeAllLocalAppDataExceptTheme() {
  clearGrowState();
  appConfig = null;
  selectedStrain = null;
  try {
    localStorage.removeItem(APP_CONFIG_KEY);
    localStorage.removeItem(SKIP_INITIAL_WELCOME_KEY);
    localStorage.removeItem('hydrogrow-pro.v1.expertChecklist');
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.indexOf('hydrogrow-pro.v1.trendMode.') === 0) localStorage.removeItem(k);
    }
  } catch (err) {
    console.warn('No se pudo limpiar almacenamiento local.', err);
  }
}

function loadAppConfig() {
  try {
    const raw = localStorage.getItem(APP_CONFIG_KEY);
    appConfig = raw ? JSON.parse(raw) : null;
    if (
      appConfig?.hardwareComplements &&
      typeof sanitizeHardwareComplementsForContext === 'function' &&
      typeof normalizeHardwareComplements === 'function'
    ) {
      const pl = appConfig.placement === 'exterior' ? 'exterior' : 'interior';
      const hc0 = normalizeHardwareComplements(appConfig.hardwareComplements);
      const enc = pl === 'exterior' ? 'outdoor' : hc0.enclosureType || 'cabinet';
      const hc1 = normalizeHardwareComplements(sanitizeHardwareComplementsForContext(pl, enc, hc0));
      if (JSON.stringify(hc0) !== JSON.stringify(hc1)) appConfig.hardwareComplements = hc1;
    }
  } catch (error) {
    console.warn('No se pudo recuperar la configuración inicial.', error);
    appConfig = null;
  }
}

function saveAppConfig() {
  try {
    if (!appConfig) {
      localStorage.removeItem(APP_CONFIG_KEY);
      return;
    }
    localStorage.setItem(APP_CONFIG_KEY, JSON.stringify(appConfig));
  } catch (error) {
    console.warn('No se pudo guardar la configuración inicial.', error);
  }
}

function applyTheme(theme) {
  const resolvedTheme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', resolvedTheme);
  const btnText = document.getElementById('themeToggleText');
  if (btnText) {
    btnText.textContent = resolvedTheme === 'light' ? 'Claro' : 'Oscuro';
  }
}

function initTheme() {
  try {
    const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
    applyTheme(savedTheme);
  } catch (error) {
    applyTheme('dark');
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  const next = current === 'light' ? 'dark' : 'light';
  applyTheme(next);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch (error) {
    console.warn('No se pudo guardar el tema.', error);
  }
}

/** Tema explícito (pantalla Apariencia y accesibilidad). */
function setAppTheme(theme) {
  const t = theme === 'light' ? 'light' : 'dark';
  applyTheme(t);
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch (error) {
    console.warn('No se pudo guardar el tema.', error);
  }
  if (typeof renderAccesibilidad === 'function') {
    const v = location.hash.slice(1) || 'inicio';
    if (v === 'accesibilidad') renderAccesibilidad();
  }
}
window.setAppTheme = setAppTheme;
window.getUiExperienceMode = getUiExperienceMode;
window.setUiExperienceMode = setUiExperienceMode;
window.applyUiExperienceToDocument = applyUiExperienceToDocument;
