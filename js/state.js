// State

let selectedStrain = null;
let myGrow = null;
let wizStep = 0;
let wizData = {};

const STORAGE_KEY = 'hydrogrow-pro.v1.myGrow';
const THEME_KEY = 'hydrogrow-pro.v1.theme';

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
    measurements: Array.isArray(payload.measurements) ? payload.measurements.map((m) => ({ ...m, plantId: m.plantId || 1 })) : [],
    selectedPlant: Number.isFinite(payload.selectedPlant) ? payload.selectedPlant : 1,
    water: payload.water || 'RO',
    reservoirL: Number.isFinite(payload.reservoirL) ? payload.reservoirL : 60,
    sourceEC: Number.isFinite(payload.sourceEC) ? payload.sourceEC : 0.1,
    sourcePH: Number.isFinite(payload.sourcePH) ? payload.sourcePH : 6.1,
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
    myGrow = restoreGrow(parsed);
  } catch (error) {
    console.warn('No se pudo recuperar el cultivo guardado.', error);
    myGrow = null;
  }
}

function clearGrowState() {
  myGrow = null;
  localStorage.removeItem(STORAGE_KEY);
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
