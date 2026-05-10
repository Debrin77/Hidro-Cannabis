// State

let selectedStrain = null;
let myGrow = null;
let wizStep = 0;
let wizData = {};
let appConfig = null;

const STORAGE_KEY = 'hydrogrow-pro.v1.myGrow';
const APP_CONFIG_KEY = 'hydrogrow-pro.v1.appConfig';
const THEME_KEY = 'hydrogrow-pro.v1.theme';
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
    water: payload.water || 'RO',
    reservoirL: Number.isFinite(payload.reservoirL) ? payload.reservoirL : 60,
    sourceEC: Number.isFinite(payload.sourceEC) ? payload.sourceEC : 0.1,
    sourcePH: Number.isFinite(payload.sourcePH) ? payload.sourcePH : 6.1,
    hardwareComplements:
      typeof normalizeHardwareComplements === 'function'
        ? normalizeHardwareComplements(payload.hardwareComplements)
        : payload.hardwareComplements || undefined,
  };
}

function saveGrowState() {
  try {
    if (!myGrow) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
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

function loadAppConfig() {
  try {
    const raw = localStorage.getItem(APP_CONFIG_KEY);
    appConfig = raw ? JSON.parse(raw) : null;
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
