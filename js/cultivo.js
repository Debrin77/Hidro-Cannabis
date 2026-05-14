// Cultivo wizard and active grow

/** Máximo de sitios de cultivo (cubos) alineado con el checklist `onbSites`. */
const MAX_HYDRO_SITE_COUNT = 48;
const WORK_SYSTEM_OPTIONS = ['RDWC', 'DWC', 'NFT', 'FLOAT', 'AERO'];
let pendingWorkSystemTarget = null;

/**
 * Cubos / sitios configurados: prioriza `systemHardware.sites` en RDWC, si no `plants`.
 */
function getConfiguredSiteCount(grow) {
  if (!grow) return 1;
  const hw = parseInt(grow.systemHardware?.sites, 10);
  const p = parseInt(grow.plants, 10);
  const useHw = grow.system === 'RDWC' && Number.isFinite(hw) && hw >= 1;
  const raw = useHw ? hw : Number.isFinite(p) && p >= 1 ? p : 1;
  return Math.min(MAX_HYDRO_SITE_COUNT, Math.max(1, raw));
}

function escapeHtmlAttr(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function escapeHtmlText(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getCultivoHydroChipOrder() {
  return typeof getOrderedCannabisHydroSystemCodesForChips === 'function'
    ? getOrderedCannabisHydroSystemCodesForChips()
    : WORK_SYSTEM_OPTIONS.slice();
}

/** Evita mezclar lecturas si hubiera filas huérfanas; las nuevas llevan `installationId`. */
function measurementBelongsToActiveInstallation(grow, m) {
  if (!grow || !m) return true;
  const aid = grow.activeInstallationId;
  if (!aid) return true;
  if (m.installationId == null || m.installationId === '') return true;
  return m.installationId === aid;
}

/**
 * Aviso UI: cada instalación hidro tiene su propio depósito, clima guardado, fusion/riego y mediciones.
 * La variedad y fechas del ciclo siguen siendo únicas del cultivo activo.
 */
function getActiveInstallationScopeBannerHtml(grow, opts) {
  if (!grow) return '';
  const compact = opts && opts.compact;
  const inst =
    typeof findInstallationById === 'function' && grow.activeInstallationId
      ? findInstallationById(grow.activeInstallationId)
      : null;
  const disp =
    typeof getResolvedSystemDisplayName === 'function'
      ? getResolvedSystemDisplayName(grow, grow.system || 'DWC')
      : inst?.type || grow.system || '';
  const typ = inst?.type || grow.system || '';
  const multi =
    typeof getAvailableWorkSystems === 'function' ? getAvailableWorkSystems().length > 1 : false;
  const core = multi
    ? `Depósito, emplazamiento, pronóstico guardado, riego nativo y tabla de mediciones son <strong>independientes por instalación</strong>. Ahora trabajas en <strong>${escapeHtmlText(disp)}</strong> (${escapeHtmlText(typ)}). Cambia de instalación en <strong>Medir</strong> o en el esquema de <strong>Cultivo</strong>.`
    : `Instalación activa: <strong>${escapeHtmlText(disp)}</strong> (${escapeHtmlText(typ)}).`;
  const tail = ' La variedad y el calendario de fases son <strong>comunes</strong> a todo el cultivo activo.';
  const body = core + tail;
  if (compact) {
    return `<p class="form-hint install-scope-banner install-scope-banner--compact"><i class="ti ti-folders" aria-hidden="true"></i> ${body}</p>`;
  }
  return `<div class="alert info install-scope-banner" role="status"><i class="ti ti-folders" aria-hidden="true"></i><p class="body-prose body-prose--tight">${body}</p></div>`;
}

/** Tarjeta fase 4: contexto nativo por tier (RDWC/DWC núcleo vs resto). */
function buildCultivoNativeHydroContextCardHtml(grow) {
  if (!grow) return '';
  const prof = typeof getSystemProfile === 'function' ? getSystemProfile(grow.system) : null;
  const tier = (prof && prof.cannabisPortTier) || 'core';
  const tierLabel =
    tier === 'core' ? 'Núcleo cannabis' : tier === 'extended' ? 'Extendido (más práctica)' : 'Avanzado';
  const tierClass =
    tier === 'core' ? 'cannabis-tier-pill--core' : tier === 'extended' ? 'cannabis-tier-pill--extended' : 'cannabis-tier-pill--advanced';
  const displayName =
    typeof getResolvedSystemDisplayName === 'function'
      ? getResolvedSystemDisplayName(grow, grow.system)
      : prof?.label || grow.system || '';
  const notes = Array.isArray(prof?.checklistNotes) ? prof.checklistNotes : [];
  const notesHtml = notes.map((h) => `<li>${escapeHtmlText(h)}</li>`).join('');
  const hint = prof?.optimalHint
    ? `<p class="body-prose body-prose--tight cultivo-native-hydro-hint">${escapeHtmlText(prof.optimalHint)}</p>`
    : '';
  const typeLabel = escapeHtmlText(prof?.label || grow.system || '');
  const foot =
    tier === 'core'
      ? `<div class="cultivo-native-hydro-foot"><p class="form-hint">Calendario, mezclas, esquema cenital y dimensionado están alineados con <strong>${typeLabel}</strong>. La vista de <strong>integración</strong> aporta <strong>torre</strong>, cultivos alimentarios y checklist NFT con diagramas de referencia.</p></div>`
      : `<div class="cultivo-native-hydro-foot"><p class="form-hint">Este tipo exige más control de caudal, raíces y EC. Aquí tienes resumen, alertas y <strong>Medir</strong> por planta; usa la tarjeta de <strong>integración</strong> de abajo para diagramas y procedimientos al estilo «instalación completa».</p></div>`;

  return `<article class="card cultivo-native-hydro-card" aria-labelledby="cultivo-native-hydro-title">
    ${getActiveInstallationScopeBannerHtml(grow, { compact: true })}
    <div class="card-header card-header--split">
      <h2 id="cultivo-native-hydro-title" class="card-title"><i class="ti ti-droplet"></i> Sistema hidro · cannabis</h2>
      <span class="cannabis-tier-pill ${tierClass}">${escapeHtmlText(tierLabel)}</span>
    </div>
    <p class="body-prose body-prose--tight">Instalación activa: <strong>${escapeHtmlText(displayName)}</strong>.</p>
    <ul class="legal-list cultivo-native-hydro-checklist">${notesHtml}</ul>
    ${hint}
    ${foot}
  </article>`;
}

function buildCultivoHcFusionBannerHtml(grow) {
  const tier =
    typeof getCannabisHydroPortTier === 'function' && grow?.system
      ? getCannabisHydroPortTier(grow.system)
      : 'core';
  const actions = `<div class="cultivo-hc-fusion-banner__actions">
        <button type="button" class="btn btn-primary btn--compact" onclick="navToHcEmbed('sistema')"><i class="ti ti-external-link"></i> Sistema (integración)</button>
        <button type="button" class="btn btn-ghost btn--compact" onclick="navToHcEmbed('inicio')"><i class="ti ti-home"></i> Inicio (integración)</button>
      </div>`;
  if (tier === 'core') {
    return `<div class="card cultivo-hc-fusion-banner cultivo-hc-fusion-banner--muted">
      <div class="card-header"><div class="card-title"><i class="ti ti-layout-grid"></i> Integración · complemento</div></div>
      <p class="body-prose body-prose--tight">Con <strong>RDWC/DWC</strong>, el núcleo operativo vive en esta app. Abre la vista de integración para <strong>torre</strong>, cultivos <strong>alimentarios</strong> o checklist NFT con diagramas de referencia comercial.</p>
      ${actions}
    </div>`;
  }
  if (tier === 'extended') {
    return `<div class="card cultivo-hc-fusion-banner">
      <div class="card-header"><div class="card-title"><i class="ti ti-layout-grid"></i> Integración · canales, NFT y torre</div></div>
      <p class="body-prose body-prose--tight">Tu montaje es habitual en cannabis con más atención al caudal y a la homogeneidad. En integración hay <strong>NFT avanzado</strong>, cálculos de depósito y el hilo de <strong>torre</strong> que aquí no replicamos al mismo nivel.</p>
      ${actions}
    </div>`;
  }
  return `<div class="card cultivo-hc-fusion-banner cultivo-hc-fusion-banner--warn">
      <div class="card-header"><div class="card-title"><i class="ti ti-layout-grid"></i> Integración · aeroponía y referencias</div></div>
      <p class="body-prose body-prose--tight">La aeroponía exige higiene y temporalización finos. Usa la vista de integración para boquillas, cámaras y biblioteca alimentaria; aquí prioriza pH/EC y lecturas frecuentes en <strong>Medir</strong>.</p>
      ${actions}
    </div>`;
}

/** Volumen útil del espacio de cultivo (m³) para afinar solo la fila del extractor; vacío = estimación automática. */
function parseEnclosureVolumeM3Input(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return null;
  const t = String(el.value ?? '').trim();
  if (t === '') return null;
  const v = parseFloat(t.replace(',', '.'));
  if (!Number.isFinite(v) || v < 0.05 || v > 80) return null;
  return Math.round(v * 1000) / 1000;
}

function setSideStatusText(text) {
  const el = document.getElementById('sideStatus');
  if (el) el.textContent = text;
}

/** Elimina pronóstico y clima de API al cambiar ubicación o interior/exterior. */
function invalidateGrowWeatherSnapshot() {
  if (!myGrow) return;
  delete myGrow.siteWeather;
  const c = myGrow.climate;
  if (c && typeof c === 'object' && typeof c.source === 'string' && /Open-Meteo|Climatología|rejilla/i.test(c.source)) {
    myGrow.climate = null;
  }
}

function onOnboardingPlacementEnclosureSync() {
  const pl = document.getElementById('onbPlacement')?.value;
  const enc = document.getElementById('onbEnclosureType');
  if (!enc) return;
  if (pl === 'exterior') {
    enc.value = 'outdoor';
    enc.disabled = true;
  } else {
    enc.disabled = false;
    if (enc.value === 'outdoor') enc.value = 'cabinet';
  }
  syncInstrumentComplementsUi('onb');
}

function onCfgGrowPlacementEnclosureSync() {
  const pl = document.getElementById('cfgGrowPlacement')?.value;
  const enc = document.getElementById('cfgGrowEnclosure');
  if (!enc) return;
  if (pl === 'exterior') {
    enc.value = 'outdoor';
    enc.disabled = true;
  } else {
    enc.disabled = false;
    if (enc.value === 'outdoor') enc.value = 'cabinet';
  }
  syncInstrumentComplementsUi('cfg');
}

/** Habilita / deshabilita checkboxes de instrumentación según interior|exterior y perfil de espacio. */
function syncInstrumentComplementsUi(which) {
  if (typeof getInstrumentPolicy !== 'function') return;
  const pre = which === 'onb' ? 'onb' : 'cfg';
  const plEl = document.getElementById(pre === 'onb' ? 'onbPlacement' : 'cfgGrowPlacement');
  const encEl = document.getElementById(pre === 'onb' ? 'onbEnclosureType' : 'cfgGrowEnclosure');
  if (!plEl || !encEl) return;
  const placement = plEl.value === 'exterior' ? 'exterior' : 'interior';
  let enclosureType = encEl.value;
  if (placement === 'exterior') enclosureType = 'outdoor';
  const pol = getInstrumentPolicy(placement, enclosureType);

  function bindCo2(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.disabled = !pol.meterCo2;
    if (!pol.meterCo2) el.checked = false;
    const lab = el.closest('label');
    if (lab) {
      lab.classList.toggle('checkbox-label--muted', !pol.meterCo2);
      lab.title = pol.meterCo2 ? pol.meterCo2OpenRoomHint || '' : pol.meterCo2Hint;
    }
  }
  bindCo2(pre === 'onb' ? 'onbCompCo2' : 'cfgCompCo2');

  const ppfd = document.getElementById(pre === 'onb' ? 'onbCompPpfd' : 'cfgCompPpfd');
  if (ppfd) {
    ppfd.disabled = false;
    const lab = ppfd.closest('label');
    if (lab) {
      lab.classList.remove('checkbox-label--muted');
      lab.title = pol.meterPpfdHint || '';
    }
  }
  const th = document.getElementById(pre === 'onb' ? 'onbCompThermoHygro' : 'cfgCompThermoHygro');
  if (th) {
    th.disabled = false;
    const lab = th.closest('label');
    if (lab) {
      lab.classList.remove('checkbox-label--muted');
      lab.title = pol.meterThermoHygroHint || '';
    }
  }

  const ghPairs = [
    pre === 'onb' ? 'onbGhReflective' : 'cfgGhReflective',
    pre === 'onb' ? 'onbGhAeration' : 'cfgGhAeration',
    pre === 'onb' ? 'onbGhHumidity' : 'cfgGhHumidity',
  ];
  for (const id of ghPairs) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.disabled = !pol.greenhouseToggles;
    if (!pol.greenhouseToggles) el.checked = false;
    const lab = el.closest('label');
    if (lab) {
      lab.classList.toggle('checkbox-label--muted', !pol.greenhouseToggles);
      lab.title = pol.greenhouseToggles ? '' : pol.greenhouseTogglesHint;
    }
  }
  const ledMode = document.getElementById(pre === 'onb' ? 'onbGhLedMode' : 'cfgGhLedMode');
  const ledW = document.getElementById(pre === 'onb' ? 'onbGhLedPowerW' : 'cfgGhLedPowerW');
  if (!pol.greenhouseToggles) {
    if (ledMode) {
      ledMode.disabled = true;
      ledMode.value = 'none';
    }
    if (ledW) {
      ledW.disabled = true;
      ledW.value = '';
    }
  } else {
    if (ledMode) ledMode.disabled = false;
    if (ledW) ledW.disabled = false;
  }
}

function saveGrowLocationAndPlacement() {
  if (!myGrow) return;
  const locInp = document.getElementById('cfgGrowLocation');
  const placeInp = document.getElementById('cfgGrowPlacement');
  const newLoc = (locInp?.value || '').trim();
  const newPlace = placeInp?.value === 'exterior' ? 'exterior' : 'interior';
  const prevLoc = (myGrow.location || '').trim();
  const prevPlace = myGrow.placement === 'exterior' ? 'exterior' : 'interior';
  const changed = newLoc !== prevLoc || newPlace !== prevPlace;
  if (changed) {
    invalidateGrowWeatherSnapshot();
    myGrow.log.unshift({
      date: new Date().toISOString(),
      text:
        newLoc !== prevLoc
          ? `Ubicación actualizada («${prevLoc || '—'}» → «${newLoc || '—'}»). Pronóstico guardado invalidado: abre Climatología para cargar la nueva zona.`
          : `Instalación ${prevPlace === 'exterior' ? 'exterior' : 'interior'} → ${newPlace === 'exterior' ? 'exterior' : 'interior'}. Pronóstico guardado invalidado: abre Climatología si usas tiempo exterior.`,
      type: 'info',
    });
  }
  myGrow.location = newLoc;
  myGrow.placement = newPlace;
  if (typeof normalizeHardwareComplements === 'function') {
    let hc = normalizeHardwareComplements(myGrow.hardwareComplements);
    if (newPlace === 'exterior') {
      hc = { ...hc, enclosureType: 'outdoor' };
    } else if (hc.enclosureType === 'outdoor') {
      hc = { ...hc, enclosureType: 'cabinet' };
    }
    if (typeof sanitizeHardwareComplementsForContext === 'function') {
      hc = sanitizeHardwareComplementsForContext(newPlace, hc.enclosureType, hc);
    }
    const volM3 = parseEnclosureVolumeM3Input('cfgEnclosureVolumeM3');
    myGrow.hardwareComplements = normalizeHardwareComplements({ ...hc, enclosureVolumeM3: volM3 });
  }
  if (myGrow.systemSizing && typeof refreshVentilationInSizingResult === 'function') {
    myGrow.systemSizing = refreshVentilationInSizingResult(myGrow.systemSizing, myGrow.hardwareComplements);
  }
  if (typeof appConfig === 'object' && appConfig) {
    appConfig.location = newLoc;
    appConfig.placement = newPlace;
    saveAppConfig();
  }
  saveGrowState();
  if (typeof window.showHydroToast === 'function') window.showHydroToast('Ubicación e instalación guardadas');
  renderActiveGrow();
  if (typeof renderMonitor === 'function') renderMonitor();
  if (typeof renderClimatologia === 'function') renderClimatologia();
  if (typeof renderInicio === 'function') renderInicio();
}

function startGrow(id){
  wizData.strainId = id;
  wizStep = 1;
  navTo('cultivo');
}

function onOnboardingSystemTypeChange() {
  if (!appConfig) appConfig = {};
  snapshotSystemHardwareToAppConfig();
  const sel = document.getElementById('onbSystem');
  if (sel) appConfig.system = sel.value;
  saveAppConfig();
  renderInitialOnboarding();
}

function renderCultivo(){
  if(myGrow){ renderActiveGrow(); return; }
  updateSystemSwitchTriggerState();
  if(!appConfig?.completed && !isSkipInitialWelcome()){ renderInitialOnboarding(); return; }
  document.getElementById('cultivoContent').innerHTML=`
    <div class="wizard-progress">${[0,1,2,3].map(i=>`<div class="wiz-step ${i<wizStep?'done':i===wizStep?'active':''}"></div>`).join('')}</div>
    <div id="wizBody"></div>
  `;
  renderWizStep();
}

const SYSTEM_WORKSPACE_EXCLUDED_KEYS = new Set([
  'strain',
  'startDate',
  'system',
  'systemWorkspaces',
  'systemDisplayNames',
  'activeInstallationId',
]);

function genInstallationId() {
  return 'ins_' + Math.random().toString(36).slice(2, 11);
}

function ensureAppConfigInstallations() {
  if (!appConfig) return [];
  if (Array.isArray(appConfig.systemInstallations) && appConfig.systemInstallations.length) {
    syncSystemsArrayFromInstallations();
    return appConfig.systemInstallations;
  }
  const types =
    Array.isArray(appConfig.systems) && appConfig.systems.length
      ? [...new Set(appConfig.systems)]
      : [appConfig.system || 'RDWC'];
  const counts = {};
  appConfig.systemInstallations = types.map((type) => {
    counts[type] = (counts[type] || 0) + 1;
    const base = typeof getSystemProfile === 'function' ? getSystemProfile(type).label : type;
    const name = counts[type] > 1 ? `${base} (${counts[type]})` : base;
    return { id: genInstallationId(), type, name: String(name) };
  });
  syncSystemsArrayFromInstallations();
  saveAppConfig();
  return appConfig.systemInstallations;
}

function syncSystemsArrayFromInstallations() {
  if (!appConfig || !Array.isArray(appConfig.systemInstallations)) return;
  appConfig.systems = [...new Set(appConfig.systemInstallations.map((i) => i.type))];
}

function findInstallationById(id) {
  if (!id || !appConfig) return null;
  ensureAppConfigInstallations();
  return appConfig.systemInstallations.find((x) => x.id === id) || null;
}

function uniqueDefaultInstallationName(type) {
  ensureAppConfigInstallations();
  const base = typeof getSystemProfile === 'function' ? getSystemProfile(type).label || type : type;
  const taken = new Set(
    appConfig.systemInstallations.map((i) => String(i.name || '').trim().toLowerCase()).filter(Boolean),
  );
  let candidate = base;
  let n = 2;
  while (taken.has(candidate.trim().toLowerCase())) {
    candidate = `${base} (${n})`;
    n += 1;
  }
  return candidate;
}

function installationNameIsUnique(name, exceptId) {
  if (!appConfig || !Array.isArray(appConfig.systemInstallations)) return true;
  const t = String(name || '').trim().toLowerCase();
  if (!t) return false;
  return !appConfig.systemInstallations.some(
    (i) => i.id !== exceptId && String(i.name || '').trim().toLowerCase() === t,
  );
}

function getWorkspaceSnapshotKey(grow) {
  if (!grow || !grow.systemWorkspaces) return null;
  if (grow.activeInstallationId && grow.systemWorkspaces[grow.activeInstallationId]) {
    return grow.activeInstallationId;
  }
  const t = grow.system;
  if (t && grow.systemWorkspaces[t]) return t;
  return grow.activeInstallationId || t || null;
}

function migrateGrowWorkspacesAndActiveInstall(grow) {
  if (!grow || !appConfig) return;
  ensureSystemWorkspaces(grow);
  ensureAppConfigInstallations();
  const insts = appConfig.systemInstallations;
  const ws = grow.systemWorkspaces;
  const keys = Object.keys(ws);
  const legacyOnly = keys.length > 0 && keys.every((k) => WORK_SYSTEM_OPTIONS.includes(k));
  if (legacyOnly && !grow.activeInstallationId) {
    const newWs = {};
    const consumed = new Set();
    insts.forEach((inst) => {
      if (ws[inst.id]) {
        newWs[inst.id] = ws[inst.id];
        return;
      }
      if (ws[inst.type] && !consumed.has(inst.type)) {
        newWs[inst.id] = ws[inst.type];
        consumed.add(inst.type);
      } else {
        newWs[inst.id] = buildDefaultWorkspaceForSystem(grow, inst.type);
      }
    });
    grow.systemWorkspaces = newWs;
  }
  if (!grow.activeInstallationId && insts.length) {
    const pick = insts.find((i) => i.type === grow.system) || insts[0];
    grow.activeInstallationId = pick.id;
    grow.system = pick.type;
  } else if (grow.activeInstallationId) {
    const cur = findInstallationById(grow.activeInstallationId);
    if (cur) grow.system = cur.type;
  }
}

function deepCloneWorkspaceValue(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;
  return JSON.parse(JSON.stringify(value));
}

function ensureSystemWorkspaces(grow) {
  if (!grow || typeof grow !== 'object') return;
  if (!grow.systemWorkspaces || typeof grow.systemWorkspaces !== 'object') grow.systemWorkspaces = {};
}

function buildSystemWorkspaceSnapshot(grow) {
  if (!grow || typeof grow !== 'object') return null;
  const snapshot = {};
  Object.keys(grow).forEach((key) => {
    if (SYSTEM_WORKSPACE_EXCLUDED_KEYS.has(key)) return;
    snapshot[key] = deepCloneWorkspaceValue(grow[key]);
  });
  return snapshot;
}

function applySystemWorkspaceSnapshot(grow, snapshot) {
  if (!grow || !snapshot || typeof snapshot !== 'object') return;
  Object.keys(grow).forEach((key) => {
    if (SYSTEM_WORKSPACE_EXCLUDED_KEYS.has(key)) return;
    delete grow[key];
  });
  Object.entries(snapshot).forEach(([key, val]) => {
    if (SYSTEM_WORKSPACE_EXCLUDED_KEYS.has(key)) return;
    grow[key] = deepCloneWorkspaceValue(val);
  });
}

function buildDefaultWorkspaceForSystem(grow, systemName) {
  const isTargetOnboardingSystem = appConfig?.system === systemName;
  const hwBase = isTargetOnboardingSystem ? appConfig?.systemHardware : null;
  const sizingBase = isTargetOnboardingSystem ? appConfig?.systemSizingResult : null;
  const source = waterProfiles[grow?.water || 'RO'] || waterProfiles.RO;
  const siteCount = Math.min(48, Math.max(1, parseInt(hwBase?.sites, 10) || parseInt(grow?.plants, 10) || 2));
  return {
    plants: siteCount,
    technique: grow?.technique || 'ScrOG',
    m2: grow?.m2 || 1.2,
    light: grow?.light || 'LED',
    nutri: Number.isFinite(grow?.nutri) ? grow.nutri : 1,
    water: grow?.water || 'RO',
    ambTemp: Number.isFinite(grow?.ambTemp) ? grow.ambTemp : 22,
    ambHum: Number.isFinite(grow?.ambHum) ? grow.ambHum : 55,
    co2: grow?.co2 || 'no',
    ageDays: Number.isFinite(grow?.ageDays) ? grow.ageDays : 0,
    origin: grow?.origin || 'No especificado',
    transplantDate: grow?.transplantDate || new Date().toISOString().split('T')[0],
    location: grow?.location || appConfig?.location || '',
    placement: grow?.placement || appConfig?.placement || 'interior',
    climate: grow?.climate || appConfig?.climate || null,
    systemHardware: hwBase ? deepCloneWorkspaceValue(hwBase) : null,
    systemSizing: sizingBase ? deepCloneWorkspaceValue(sizingBase) : null,
    hardwareComplements:
      typeof normalizeHardwareComplements === 'function'
        ? normalizeHardwareComplements(grow?.hardwareComplements ?? appConfig?.hardwareComplements)
        : grow?.hardwareComplements || appConfig?.hardwareComplements,
    reservoirL:
      Number.isFinite(sizingBase?.totalSolutionL) && sizingBase.totalSolutionL > 0
        ? Math.round(sizingBase.totalSolutionL)
        : Math.max(20, siteCount * 20),
    sourceEC: source.baseEC,
    sourcePH: source.basePH,
    selectedPlant: 1,
    measurements: [],
    plantProfiles: {},
    historyChecklist: Array.isArray(grow?.historyChecklist) ? [] : undefined,
    diaryEntries: Array.isArray(grow?.diaryEntries) ? [] : undefined,
    log: [{ date: new Date().toISOString(), text: `Espacio de trabajo creado para ${systemName}.`, type: 'info' }],
    cultivationPaused: false,
  };
}

function syncCurrentSystemWorkspaceState() {
  if (!myGrow || !WORK_SYSTEM_OPTIONS.includes(myGrow.system)) return;
  const key = getWorkspaceSnapshotKey(myGrow);
  if (!key) return;
  ensureSystemWorkspaces(myGrow);
  const snapshot = buildSystemWorkspaceSnapshot(myGrow);
  if (!snapshot) return;
  myGrow.systemWorkspaces[key] = snapshot;
}

function getAvailableWorkSystems() {
  ensureAppConfigInstallations();
  return appConfig.systemInstallations.map((i) => i.id);
}

function updateSystemSwitchTriggerState() {
  const el = document.getElementById('sideStatus');
  if (!el) return;
  el.classList.remove('topbar-status--switchable');
  el.removeAttribute('title');
  el.setAttribute('role', 'status');
  el.tabIndex = -1;
  const t = (el.textContent || '').trim();
  el.setAttribute('aria-label', t ? `Estado del cultivo: ${t}` : 'Estado del cultivo');
}

function closeSystemWorkspaceSelector() {
  const m = document.getElementById('workSystemModal');
  if (!m) return;
  pendingWorkSystemTarget = null;
  m.classList.remove('work-system-modal--open');
  m.setAttribute('aria-hidden', 'true');
}

function applyWorkSystemSelection(installationId) {
  if (!myGrow || !findInstallationById(installationId)) return;
  pendingWorkSystemTarget = installationId;
  const list = document.getElementById('workSystemList');
  if (list) {
    list.querySelectorAll('.work-system-item').forEach((btn) => {
      const id = btn.getAttribute('data-installation');
      btn.classList.toggle('work-system-item--active', id === pendingWorkSystemTarget);
    });
  }
  const inst = findInstallationById(installationId);
  const helper = document.getElementById('workSystemPendingLabel');
  if (helper && inst) {
    const lab = String(inst.name || '').trim() || inst.type;
    helper.textContent =
      myGrow.activeInstallationId === installationId
        ? `Instalación activa: ${lab} (${inst.type}).`
        : `Seleccionada: ${lab} (${inst.type}). Pulsa «Confirmar cambio» para trabajar en ella.`;
  }
  const confirmBtn = document.getElementById('workSystemConfirmBtn');
  if (confirmBtn) confirmBtn.disabled = myGrow.activeInstallationId === installationId;
}

function confirmWorkSystemSelection() {
  const installationId = pendingWorkSystemTarget;
  if (!myGrow || !installationId) return;
  const inst = findInstallationById(installationId);
  if (!inst || !WORK_SYSTEM_OPTIONS.includes(inst.type)) return;
  if (myGrow.activeInstallationId === installationId) {
    closeSystemWorkspaceSelector();
    return;
  }
  syncCurrentSystemWorkspaceState();
  ensureSystemWorkspaces(myGrow);
  const prevInst = findInstallationById(myGrow.activeInstallationId);
  const prevLabel =
    prevInst && String(prevInst.name || '').trim()
      ? prevInst.name.trim()
      : prevInst
        ? prevInst.type
        : myGrow.system;
  myGrow.activeInstallationId = installationId;
  myGrow.system = inst.type;
  const nextLabel = String(inst.name || '').trim() || inst.type;
  const targetWorkspace =
    myGrow.systemWorkspaces[installationId] || buildDefaultWorkspaceForSystem(myGrow, inst.type);
  myGrow.systemWorkspaces[installationId] = targetWorkspace;
  applySystemWorkspaceSnapshot(myGrow, targetWorkspace);
  if (typeof ensureHistoryData === 'function') ensureHistoryData(myGrow);
  appConfig.system = inst.type;
  saveAppConfig();
  myGrow.log.unshift({
    date: new Date().toISOString(),
    type: 'info',
    text: `Instalación activa: ${prevLabel} → ${nextLabel} (${inst.type}). Los datos de depósito, ubicación/clima guardado, riego nativo y mediciones mostrados corresponden solo a «${nextLabel}»; la variedad y las semanas del cultivo no cambian.`,
  });
  saveGrowState();
  closeSystemWorkspaceSelector();
  renderCultivo();
  if (typeof renderMonitor === 'function') renderMonitor();
  if (typeof renderSemanas === 'function') renderSemanas();
  if (typeof renderHistorial === 'function') renderHistorial();
  if (typeof renderClimatologia === 'function') renderClimatologia();
  if (typeof renderInicio === 'function') renderInicio();
}

function openSystemWorkspaceSelector() {
  if (!myGrow) return;
  const available = getAvailableWorkSystems();
  if (available.length <= 1) return;
  let m = document.getElementById('workSystemModal');
  if (!m) {
    document.body.insertAdjacentHTML(
      'beforeend',
      `<div id="workSystemModal" class="work-system-modal" aria-hidden="true">
        <div class="work-system-modal__scrim" onclick="closeSystemWorkspaceSelector()"></div>
        <div class="work-system-modal__panel" role="dialog" aria-labelledby="workSystemTitle">
          <div class="work-system-modal__head">
            <div id="workSystemTitle" class="work-system-modal__title">Seleccionar cultivo hidropónico activo</div>
            <button type="button" class="work-system-modal__close" onclick="closeSystemWorkspaceSelector()" aria-label="Cerrar"><i class="ti ti-x"></i></button>
          </div>
          <p class="form-hint">Elige con claridad el cultivo hidropónico sobre el que vas a trabajar ahora.</p>
          <div id="workSystemList" class="work-system-modal__list"></div>
          <p id="workSystemPendingLabel" class="form-hint">Selecciona un cultivo hidropónico y confirma el cambio.</p>
          <div class="work-system-modal__actions">
            <button type="button" class="btn btn-ghost btn--compact" onclick="closeSystemWorkspaceSelector()">Cancelar</button>
            <button type="button" id="workSystemConfirmBtn" class="btn btn-primary btn--compact" onclick="confirmWorkSystemSelection()" disabled>Confirmar cambio</button>
          </div>
        </div>
      </div>`,
    );
    m = document.getElementById('workSystemModal');
  }
  const list = document.getElementById('workSystemList');
  if (list) {
    list.innerHTML = available
      .map((id) => {
        const inst = findInstallationById(id);
        if (!inst) return '';
        const label =
          String(inst.name || '').trim() ||
          (typeof getSystemProfile === 'function' ? getSystemProfile(inst.type).label : inst.type);
        const active = myGrow.activeInstallationId === id;
        return `<button type="button" class="work-system-item ${active ? 'work-system-item--active' : ''}" data-installation="${id}" onclick="applyWorkSystemSelection('${id}')">
          <span class="work-system-item__name">${escapeHtmlText(label)}</span>
          <span class="work-system-item__code">${inst.type}</span>
        </button>`;
      })
      .filter(Boolean)
      .join('');
  }
  pendingWorkSystemTarget = myGrow.activeInstallationId;
  const helper = document.getElementById('workSystemPendingLabel');
  if (helper) {
    const cur = findInstallationById(myGrow.activeInstallationId);
    const curLab =
      cur && String(cur.name || '').trim()
        ? cur.name.trim()
        : cur
          ? cur.type
          : myGrow.system;
    helper.textContent = cur
      ? `Instalación activa: ${curLab} (${cur.type}).`
      : 'Selecciona una instalación y confirma el cambio.';
  }
  const confirmBtn = document.getElementById('workSystemConfirmBtn');
  if (confirmBtn) confirmBtn.disabled = myGrow.activeInstallationId === pendingWorkSystemTarget;
  m.classList.add('work-system-modal--open');
  m.setAttribute('aria-hidden', 'false');
}

window.openSystemWorkspaceSelector = openSystemWorkspaceSelector;
window.closeSystemWorkspaceSelector = closeSystemWorkspaceSelector;
window.applyWorkSystemSelection = applyWorkSystemSelection;
window.confirmWorkSystemSelection = confirmWorkSystemSelection;
window.syncCurrentSystemWorkspaceState = syncCurrentSystemWorkspaceState;
window.migrateGrowWorkspacesAndActiveInstall = migrateGrowWorkspacesAndActiveInstall;
window.addSystemInstallationOfType = addSystemInstallationOfType;
window.onOnboardingPlacementEnclosureSync = onOnboardingPlacementEnclosureSync;
window.onCfgGrowPlacementEnclosureSync = onCfgGrowPlacementEnclosureSync;
window.syncInstrumentComplementsUi = syncInstrumentComplementsUi;
window.parseEnclosureVolumeM3Input = parseEnclosureVolumeM3Input;
window.measurementBelongsToActiveInstallation = measurementBelongsToActiveInstallation;
window.getActiveInstallationScopeBannerHtml = getActiveInstallationScopeBannerHtml;

function renderInitialOnboarding() {
  if (appConfig) ensureAppConfigInstallations();
  const cfg = appConfig || {};
  const hw = cfg.systemHardware || {};
  const sysActive = cfg.system || 'RDWC';
  const sites = Number.isFinite(hw.sites) ? hw.sites : 4;
  const vps = Number.isFinite(hw.volumePerSiteL) ? hw.volumePerSiteL : 20;
  const vctl = Number.isFinite(hw.controlReservoirL) ? hw.controlReservoirL : 40;
  const stone = hw.airStoneType === 'fine' ? 'fine' : 'standard';
  const lineM = Number.isFinite(hw.airLineLengthM) ? hw.airLineLengthM : 2;
  const solT = Number.isFinite(hw.solutionTempC) ? hw.solutionTempC : '';
  const pipeMat = hw.pipeMaterial || 'pvc';
  const buildType = hw.buildType === 'commercial' ? 'commercial' : 'diy';
  const userAir = Number.isFinite(hw.userAirLpm) ? hw.userAirLpm : '';
  const userWat = Number.isFinite(hw.userWaterLph) ? hw.userWaterLph : '';
  const rdwcDiagram = hw.rdwcDiagramStyle === 'rear_kit' ? 'rear_kit' : 'side';
  const dwcBucketTopCm = Number.isFinite(hw.dwcBucketTopDiameterCm) ? hw.dwcBucketTopDiameterCm : 35;
  const dwcLidHoleCm = Number.isFinite(hw.dwcLidHoleDiameterCm) ? hw.dwcLidHoleDiameterCm : 20;
  const floatTankL = Number.isFinite(hw.floatTankLengthCm) ? hw.floatTankLengthCm : 120;
  const floatTankW = Number.isFinite(hw.floatTankWidthCm) ? hw.floatTankWidthCm : 80;
  const floatRaftHoleCm = Number.isFinite(hw.floatRaftHoleDiameterCm) ? hw.floatRaftHoleDiameterCm : 20;
  const floatRaftMm = Number.isFinite(hw.floatRaftThicknessMm) ? hw.floatRaftThicknessMm : 30;
  const floatNetPotCm = Number.isFinite(hw.floatNetPotBelowRaftCm) ? hw.floatNetPotBelowRaftCm : 8;
  const floatSubCm = Number.isFinite(hw.floatSubstrateColumnCm) ? hw.floatSubstrateColumnCm : 5;
  const ctlDisabled = sysActive !== 'RDWC';
  const sizingHtml = cfg.systemSizingResult
    ? renderSystemSizingHtml(cfg.systemSizingResult)
    : `<div class="sizing-result"><p class="sizing-disclaimer sizing-disclaimer--flush">Pulsa <strong>Calcular dimensionado</strong> para estimar bomba de aire, recirculación (RDWC) y diámetro de tubería orientativo.</p></div>`;

  const errorBox = cfg.error ? `<div class="alert danger"><i class="ti ti-alert-circle"></i><p>${cfg.error}</p></div>` : '';
  const comp =
    typeof normalizeHardwareComplements === 'function'
      ? normalizeHardwareComplements(cfg.hardwareComplements)
      : {
          reservoirHeater: false,
          heaterThermostatC: null,
          meterPhEc: true,
          meterWaterTemp: true,
          meterThermoHygro: true,
          meterCo2: false,
          meterPpfd: false,
          enclosureType: 'cabinet',
          enclosureVolumeM3: null,
        };
  const weatherBox = cfg.climate
    ? `<div class="alert info"><i class="ti ti-cloud"></i><p><strong>Clima detectado:</strong> ${cfg.climate.summary} · ${cfg.climate.temperature}°C · HR ${cfg.climate.humidity}% · Viento ${cfg.climate.wind} km/h · Fuente: ${cfg.climate.source}</p></div>`
    : `<div class="alert info"><i class="ti ti-info-circle"></i><p>Aún sin análisis climático. Pulsa "Analizar clima" tras indicar ubicación.</p></div>`;

  const learnUi = typeof getUiExperienceMode === 'function' && getUiExperienceMode() === 'learning';
  const placementCfg = (cfg.placement || 'interior') === 'exterior' ? 'exterior' : 'interior';
  const minSnip = typeof getMinimumHydroInstrumentSnippets === 'function' ? getMinimumHydroInstrumentSnippets(placementCfg) : [];
  const minKitOnboardingBlock =
    minSnip.length > 0
      ? `<div class="alert info complements-min-kit"><i class="ti ti-checklist"></i><div><strong>Mínimo razonable (${placementCfg === 'exterior' ? 'exterior' : 'interior'})</strong><ul class="legal-list">${minSnip.map((t) => `<li>${escapeHtmlText(t)}</li>`).join('')}</ul>${
          learnUi && typeof getLearningRecintoEquipmentNarrativeHtml === 'function'
            ? getLearningRecintoEquipmentNarrativeHtml()
            : `<p class="form-hint complements-min-kit-hint">¿Cuándo compensa más equipo o el perfil «espacio amplio»? Activa <strong>Aprendizaje</strong> en Apariencia y accesibilidad.</p>`
        }</div></div>`
      : '';

  document.getElementById('cultivoContent').innerHTML = `
    <div class="card">
      <div class="card-header"><div class="card-title"><i class="ti ti-rocket"></i>Checklist experto · Primer inicio</div></div>
      <p class="body-prose cultivo-intro"><strong>Hydro Cannabis</strong> centraliza tu cultivo hidropónico, clima, nutrición (según tipo de agua) y monitorización diaria, alineado con buenas prácticas en RDWC/DWC.</p>
      <div class="grid3 cultivo-highlights">
        <div class="card-sm"><div class="metric-label">Ventaja</div><p class="body-prose">Checklist guiado del cultivo hidropónico</p></div>
        <div class="card-sm"><div class="metric-label">Ventaja</div><p class="body-prose">Cálculo de mezcla por tipo de agua</p></div>
        <div class="card-sm"><div class="metric-label">Ventaja</div><p class="body-prose">Alertas inteligentes por planta</p></div>
      </div>
      <div class="cultivo-divider">
        <label class="checkbox-label">
          <input type="checkbox" ${isSkipInitialWelcome()?'checked':''} onchange="toggleSkipInitialWelcome(this.checked)">
          <span><strong>Modo desarrollo:</strong> saltar bienvenida y checklist e ir al asistente clásico. El registro del monitor (historial) no incluye este mensaje. Desmarca para recuperar la bienvenida.</span>
        </label>
        <p class="cultivo-dev-hint">Atajo URL: <code>?dev=1</code> o <code>?skipWelcome=1</code></p>
      </div>
    </div>

    <nav class="onboarding-progress" aria-label="Pasos del checklist">
      <ol class="onboarding-progress__track">
        <li><a href="#onbStepSystem" class="onboarding-progress__link">1 · Instalación</a></li>
        <li><a href="#onbEngineeringCard" class="onboarding-progress__link">2 · Ingeniería</a></li>
        <li><a href="#onbStepComplements" class="onboarding-progress__link">3 · Instrumentos</a></li>
        <li><a href="#onbStepVariety" class="onboarding-progress__link">4 · Cultivo</a></li>
      </ol>
    </nav>

    <details class="card onboarding-acc" id="onbStepSystem" open>
      <summary class="onboarding-acc__summary">
        <span class="onboarding-acc__step-num" aria-hidden="true">1</span>
        <span class="onboarding-acc__summary-title"><i class="ti ti-list-check"></i> Paso 1–2 · Instalación, ubicación y clima</span>
        <i class="ti ti-chevron-down onboarding-acc__chev" aria-hidden="true"></i>
      </summary>
      <div class="onboarding-acc__body">
      ${errorBox}
      <div class="grid2">
        <div class="form-group">
          <label>Tipos de cultivo hidropónico disponibles (elige uno o varios)</label>
          <div class="pill-tag-row pill-tag-row--install-chips">
            ${getCultivoHydroChipOrder()
              .map((s) => {
                const insts = Array.isArray(cfg.systemInstallations) ? cfg.systemInstallations : [];
                const n = insts.filter((i) => i.type === s).length;
                const checked = n > 0 ? 'checked' : '';
                const addBtn =
                  n > 0
                    ? `<button type="button" class="btn btn-ghost btn--compact chip-add-install" onclick="event.preventDefault();addSystemInstallationOfType('${s}')" title="Añadir otra instalación ${s}">+</button>`
                    : '';
                return `<span class="chip-check-wrap"><label class="nutri-tag tag-level chip-check"><input type="checkbox" value="${s}" ${checked} onchange="toggleSystemType('${s}',this.checked)">${s}${n > 1 ? ` (${n})` : ''}</label>${addBtn}</span>`;
              })
              .join('')}
          </div>
          <p class="form-hint">Varias instalaciones del mismo tipo reciben nombres distintos (p. ej. «RDWC (2)»). Puedes renombrarlas en <strong>Medir</strong>.</p>
        </div>
        <div class="form-group">
          <label>Cultivo hidropónico activo al inicio</label>
          <select id="onbSystem" onchange="onOnboardingSystemTypeChange()">${typeof buildCannabisHydroSystemOptionsHtml === 'function' ? buildCannabisHydroSystemOptionsHtml(cfg.system || 'RDWC') : '<option value="RDWC" selected>RDWC</option>'}</select>
        </div>
        <p class="form-hint">Fusión cannabis: <strong>RDWC</strong> y <strong>DWC</strong> son el núcleo que integraremos primero en pantallas nativas. NFT, mesa flotante y aeroponía siguen disponibles (compatibilidad y comparación con la vista extendida).</p>
        <div class="form-group">
          <label>Ubicación (ciudad o zona)</label>
          <input id="onbLocation" type="text" value="${cfg.location||''}" placeholder="Ej: Castelló de la Plana" autocomplete="address-level2">
        </div>
        <div class="form-group">
          <label>Tipo de instalación</label>
          <select id="onbPlacement" onchange="onOnboardingPlacementEnclosureSync()"><option value="interior" ${(cfg.placement||'interior')==='interior'?'selected':''}>Interior</option><option value="exterior" ${cfg.placement==='exterior'?'selected':''}>Exterior</option></select>
        </div>
        <div class="form-group">
          <label>Perfil del espacio (microclima y asistente de mediciones)</label>
          <select id="onbEnclosureType" onchange="syncInstrumentComplementsUi('onb')">
            <option value="cabinet" ${(comp.enclosureType||'cabinet')==='cabinet'?'selected':''}>Armario o carpa sellada (extracción / intracción típica)</option>
            <option value="greenhouse" ${comp.enclosureType==='greenhouse'?'selected':''}>Espacio amplio / macro-carpa (microclima tipo invernadero)</option>
            <option value="open_room" ${comp.enclosureType==='open_room'?'selected':''}>Estancia o nave amplia (renovación de aire alta)</option>
            <option value="outdoor" ${comp.enclosureType==='outdoor'?'selected':''}>Exterior / vivero al aire libre</option>
          </select>
          <span class="form-hint">Si eliges <strong>Exterior</strong> arriba, el perfil pasa a aire libre: no se usará CO₂ de recinto y se desactivan opciones de recinto cerrado (extractor, humedad forzada, LED suplemento). El asistente de <strong>Medir</strong> se adapta a eso.</span>
        </div>
        <div class="form-group">
          <label>Volumen del recinto (m³, opcional)</label>
          <input id="onbEnclosureVolumeM3" type="number" min="0.05" max="80" step="0.01" inputmode="decimal" placeholder="Ej. 1.2" value="${Number.isFinite(comp.enclosureVolumeM3) ? comp.enclosureVolumeM3 : ''}" onchange="scheduleOnboardingSizingRecalc()">
          <span class="form-hint">Si conoces los m³ útiles de armario, carpa o cuarto, la sugerencia de <strong>extractor</strong> en el paso 2 usa este dato; si lo dejas vacío, se estima por sitios y litros de solución.</span>
        </div>
      </div>
      <button type="button" class="btn btn-ghost" onclick="analyzeClimateContext()"><i class="ti ti-cloud-search"></i> Analizar clima (AEMET/Open-Meteo)</button>
      ${weatherBox}
      </div>
    </details>

    <details class="card onboarding-acc" id="onbEngineeringCard" open>
      <summary class="onboarding-acc__summary">
        <span class="onboarding-acc__step-num" aria-hidden="true">2</span>
        <span class="onboarding-acc__summary-title"><i class="ti ti-tool"></i> Ingeniería del cultivo hidropónico · datos de montaje</span>
        <i class="ti ti-chevron-down onboarding-acc__chev" aria-hidden="true"></i>
      </summary>
      <div class="onboarding-acc__body">
      <p class="body-prose mb-text-block">Introduce <strong>volumen por cubo</strong>, <strong>número de sitios</strong> y, en RDWC, el <strong>depósito de control</strong>. La app calcula caudales orientativos de <strong>aire en el líquido</strong>, <strong>recirculación</strong> y una fila aparte de <strong>extractor del recinto</strong> (m³/h, distinto de la bomba de burbuja). Valida <strong>geometría</strong> (tapas DWC, balsa, depósito NFT) cuando corresponda. <strong>Al cambiar cualquier dato</strong> de este bloque se <strong>vuelve a calcular</strong> automáticamente (debounce corto). En DWC ~1 L/min de aire por galón US; en RDWC, varios vuelcos del volumen/hora. Montaje <strong>DIY</strong>: introduce L/min y L/h; <strong>kit comercial</strong>: puedes contrastar con la placa.</p>
      ${(() => {
        const pr = typeof getSystemProfile === 'function' ? getSystemProfile(sysActive) : null;
        if (!pr) return '';
        return `<div class="alert info"><i class="ti ti-bucket"></i><div><strong>${pr.label} — checklist técnico</strong><ul class="legal-list">${pr.checklistNotes.map((h) => `<li>${h}</li>`).join('')}</ul><p class="body-prose">${pr.optimalHint}</p></div></div>`;
      })()}
      <div class="alert warn"><i class="ti ti-alert-triangle"></i><p>Resultados <strong>orientativos</strong>: altura manométrica, codos y pérdidas reales pueden exigir una bomba mayor. Contrasta siempre con la hoja del fabricante.</p></div>
      <div class="grid2">
        <div class="form-group"><label>Número de sitios (cubos / macetas)</label><input id="onbSites" type="number" min="1" max="48" inputmode="numeric" value="${sites}"></div>
        <div class="form-group"><label>Volumen de solución por sitio (L)</label><input id="onbVolumePerSite" type="number" min="5" max="200" step="1" inputmode="numeric" value="${vps}"></div>
        <div class="form-group"><label>Volumen depósito de control (L) — solo RDWC</label><input id="onbControlVol" type="number" min="0" max="2000" step="1" inputmode="numeric" value="${ctlDisabled ? 0 : vctl}" ${ctlDisabled ? 'disabled' : ''}></div>
        <div class="form-group"><label>Tipo de difusor / piedra de aire</label><select id="onbAirStone"><option value="standard" ${stone === 'standard' ? 'selected' : ''}>Estándar / burbuja media</option><option value="fine" ${stone === 'fine' ? 'selected' : ''}>Fina (mejor transferencia de O₂)</option></select></div>
        <div class="form-group"><label>Longitud aprox. manguera de aire (m)</label><input id="onbAirLineM" type="number" min="0" max="30" step="0.5" inputmode="decimal" value="${lineM}"></div>
        <div class="form-group"><label>Temperatura típica del líquido (°C, opcional)</label><input id="onbSolutionTemp" type="number" min="10" max="35" step="0.5" inputmode="decimal" placeholder="p. ej. 20" value="${solT === '' ? '' : solT}"></div>
        <div class="form-group"><label>Material línea de líquido</label><select id="onbPipeMaterial"><option value="pvc" ${pipeMat === 'pvc' ? 'selected' : ''}>PVC presión / rígido</option><option value="pe" ${pipeMat === 'pe' ? 'selected' : ''}>PE / polietileno</option><option value="reinforced" ${pipeMat === 'reinforced' ? 'selected' : ''}>Manguera reforzada</option></select></div>
        <div class="form-group">
          <label>Esquema RDWC en la app (referencia visual)</label>
          <select id="onbRdwcDiagram" ${ctlDisabled ? 'disabled' : ''}>
            <option value="side" ${rdwcDiagram === 'side' ? 'selected' : ''}>Depósito al costado · genérico</option>
            <option value="rear_kit" ${rdwcDiagram === 'rear_kit' ? 'selected' : ''}>Kit comercial · depósito trasero y perímetro (p. ej. Growrilla)</option>
          </select>
          <span class="form-hint">Solo cambia el dibujo cenital; el cálculo de caudales sigue igual. Útil si tu kit lleva el depósito de control integrado al fondo del circuito.</span>
        </div>
        <div class="form-group">
          <label>Tipo de montaje (DIY o kit)</label>
          <select id="onbBuildType" onchange="onOnboardingBuildTypeChange()">
            <option value="diy" ${buildType === 'diy' ? 'selected' : ''}>Montaje propio (DIY) — validar caudales</option>
            <option value="commercial" ${buildType === 'commercial' ? 'selected' : ''}>Kit comercial / tienda</option>
          </select>
          <span class="form-hint">DIY: introduce bombas para contrastarlas con el cálculo. Kit: confía en el manual; puedes validar con la placa del equipo.</span>
        </div>
        <div class="form-group">
          <label>Bomba de aire — caudal nominal (L/min)</label>
          <input id="onbUserAirLpm" type="number" min="0" max="500" step="0.1" inputmode="decimal" placeholder="Ej: 12" value="${userAir === '' ? '' : userAir}">
          <span class="form-hint">Dato de la placa; el caudal útil baja con contrapresión y manguera larga.</span>
        </div>
        <div class="form-group">
          <label>Bomba recirculación — caudal nominal (L/h), solo RDWC</label>
          <input id="onbUserWaterLph" type="number" min="0" max="20000" step="1" inputmode="numeric" placeholder="Ej: 800" value="${userWat === '' ? '' : userWat}" ${ctlDisabled ? 'disabled' : ''}>
          <span class="form-hint">Vacío en DWC, NFT, balsa o aeroponía.</span>
        </div>
        ${
          sysActive === 'DWC'
            ? `<div class="grid2 onboarding-dwc-lid">
          <div class="form-group">
            <label>DWC · Diámetro tapa cenital (cm)</label>
            <input id="onbDwcBucketTopCm" type="number" min="15" max="120" step="0.5" inputmode="decimal" value="${dwcBucketTopCm}">
            <span class="form-hint">Vista cenital del cubo: borde útil de la tapa.</span>
          </div>
          <div class="form-group">
            <label>DWC · Diámetro hueco para cesta (cm)</label>
            <input id="onbDwcLidHoleCm" type="number" min="5" max="50" step="0.5" inputmode="decimal" value="${dwcLidHoleCm}">
            <span class="form-hint">Broca / aro donde apoya el collarín de la redonda.</span>
          </div>
        </div>`
            : ''
        }
        ${
          sysActive === 'FLOAT'
            ? `<div class="grid2 onboarding-float-geom">
          <div class="form-group">
            <label>Balsa · Largo recipiente interior (cm)</label>
            <input id="onbFloatTankL" type="number" min="40" max="500" step="1" inputmode="numeric" value="${floatTankL}">
          </div>
          <div class="form-group">
            <label>Balsa · Ancho recipiente interior (cm)</label>
            <input id="onbFloatTankW" type="number" min="40" max="500" step="1" inputmode="numeric" value="${floatTankW}">
          </div>
          <div class="form-group">
            <label>Balsa · Diámetro agujeros en corcho/XPS (cm)</label>
            <input id="onbFloatRaftHoleCm" type="number" min="5" max="40" step="0.5" inputmode="decimal" value="${floatRaftHoleCm}">
            <span class="form-hint">Coincide con nº de sitios del checklist; huecos en planta.</span>
          </div>
          <div class="form-group">
            <label>Balsa · Espesor losa flotante (mm)</label>
            <input id="onbFloatRaftMm" type="number" min="10" max="120" step="1" inputmode="numeric" value="${floatRaftMm}">
          </div>
          <div class="form-group">
            <label>Profundidad cesta bajo la balsa (cm)</label>
            <input id="onbFloatNetPotDepth" type="number" min="3" max="40" step="0.5" inputmode="decimal" value="${floatNetPotCm}">
            <span class="form-hint">Desde cara inferior de la balsa al fondo de la cesta.</span>
          </div>
          <div class="form-group">
            <label>Columna de sustrato en cesta (cm)</label>
            <input id="onbFloatSubstrateH" type="number" min="2" max="35" step="0.5" inputmode="decimal" value="${floatSubCm}">
            <span class="form-hint">Base del sustrato ≈ fondo cesta si rellenas desde abajo; la app estima separación respecto a la lámina.</span>
          </div>
        </div>`
            : ''
        }
      </div>
      <div class="btn-row">
        <button type="button" class="btn btn-primary" onclick="runSystemSizingCalculation()"><i class="ti ti-calculator"></i> Calcular / refrescar dimensionado</button>
      </div>
      <div id="systemSizingMount">${sizingHtml}</div>
      </div>
    </details>

    <details class="card onboarding-acc" id="onbStepComplements" open>
      <summary class="onboarding-acc__summary">
        <span class="onboarding-acc__step-num" aria-hidden="true">3</span>
        <span class="onboarding-acc__summary-title"><i class="ti ti-tools"></i> Complementos e instrumentación</span>
        <i class="ti ti-chevron-down onboarding-acc__chev" aria-hidden="true"></i>
      </summary>
      <div class="onboarding-acc__body">
      <p class="body-prose mb-text-block">Marca <strong>solo lo que vas a medir de verdad</strong>. El contexto <strong>interior / exterior / perfil de espacio</strong> desactiva opciones incoherentes (p. ej. CO₂ de recinto en aire libre). En <strong>Medir</strong> solo verás campos que correspondan. En hidro de cannabis lo habitual es: <strong>pH y EC</strong>, <strong>Tª del líquido</strong> y <strong>Tª + HR</strong> cerca del dosel. CO₂ y lux/PAR solo si tienes el instrumento y el recinto lo justifica. <strong>Ventilación</strong> y <strong>humedad</strong> marcadas abajo son opcionales y sirven para alertas más finas.</p>
      ${minKitOnboardingBlock}
      <div class="grid2 onboarding-complements">
        <label class="checkbox-label chip-check-line"><input type="checkbox" id="onbCompPhEc" ${comp.meterPhEc ? 'checked' : ''}><span>Medidor <strong>pH</strong> y <strong>EC</strong> (pen o continuo)</span></label>
        <label class="checkbox-label chip-check-line"><input type="checkbox" id="onbCompWaterTemp" ${comp.meterWaterTemp ? 'checked' : ''}><span>Sonda / termómetro <strong>temperatura del líquido</strong></span></label>
        <label class="checkbox-label chip-check-line"><input type="checkbox" id="onbCompThermoHygro" ${comp.meterThermoHygro ? 'checked' : ''}><span><strong>Termohigrómetro</strong> (Tª aire + HR) copa / sala</span></label>
        <label class="checkbox-label chip-check-line"><input type="checkbox" id="onbCompCo2" ${comp.meterCo2 ? 'checked' : ''}><span>Medidor <strong>CO₂</strong> (interior)</span></label>
        <label class="checkbox-label chip-check-line"><input type="checkbox" id="onbCompPpfd" ${comp.meterPpfd ? 'checked' : ''}><span>Medidor de <strong>luz</strong> (lux o PAR/PPFD)</span></label>
        <label class="checkbox-label chip-check-line"><input type="checkbox" id="onbCompHeater" ${comp.reservoirHeater ? 'checked' : ''} onchange="toggleOnbHeaterSetpoint(this.checked)"><span><strong>Calentador</strong> en depósito (sumergible o similar) con termostato</span></label>
      </div>
      <div class="section-label section-label--block">Opciones del recinto (opcional)</div>
      <p class="form-hint">En interior <strong>no hace falta</strong> un invernadero de cristal: un armario o carpa con luz y renovación razonable del aire suele bastar. Marca reflectante, extractor, humedad o LED suplemento <strong>solo si los tienes</strong>; sirven para alertas y texto en Medir, no implican montaje “semi profesional”.</p>
      <div class="grid2 onboarding-complements">
        <label class="checkbox-label chip-check-line"><input type="checkbox" id="onbGhReflective" ${comp.greenhouseReflectiveInterior ? 'checked' : ''}><span>Interior <strong>reflectante</strong> (mylar/similar)</span></label>
        <label class="checkbox-label chip-check-line"><input type="checkbox" id="onbGhAeration" ${comp.greenhouseAerationControl ? 'checked' : ''}><span><strong>Aireación/ventilación</strong> controlada (extractor, intractor, recirculación)</span></label>
        <label class="checkbox-label chip-check-line"><input type="checkbox" id="onbGhHumidity" ${comp.greenhouseHumidityControl ? 'checked' : ''}><span>Control de <strong>humedad</strong> (humidificador/deshumidificador)</span></label>
        <div class="form-group">
          <label>LED suplementario o mezcla con luz natural</label>
          <select id="onbGhLedMode">
            <option value="none" ${comp.greenhouseLedMode === 'none' ? 'selected' : ''}>No / solo luz natural</option>
            <option value="full" ${comp.greenhouseLedMode === 'full' ? 'selected' : ''}>LED espectro completo</option>
            <option value="veg_bloom" ${comp.greenhouseLedMode === 'veg_bloom' ? 'selected' : ''}>LED con canales Veg/Bloom</option>
            <option value="supplement" ${comp.greenhouseLedMode === 'supplement' ? 'selected' : ''}>LED suplementario</option>
          </select>
        </div>
        <div class="form-group">
          <label>Potencia LED instalada (W)</label>
          <input type="number" id="onbGhLedPowerW" min="20" max="3000" step="10" inputmode="numeric" value="${Number.isFinite(comp.greenhouseLedPowerW) ? comp.greenhouseLedPowerW : ''}">
          <span class="form-hint">Opcional. Útil para monitorizar consistencia de fotoperiodo y carga térmica.</span>
        </div>
      </div>
      <div class="form-group onboarding-heater-setpoint" id="onbHeaterSetpointWrap" style="${comp.reservoirHeater ? '' : 'opacity:0.55'}">
        <label>Temperatura del termostato del calentador (°C)</label>
        <input type="number" id="onbCompHeaterSetC" min="15" max="32" step="0.5" inputmode="decimal" value="${Number.isFinite(comp.heaterThermostatC) ? comp.heaterThermostatC : 22}" ${comp.reservoirHeater ? '' : 'disabled'}>
        <span class="form-hint">Activa el calentador arriba para editar. Contrasta siempre con la sonda en el líquido.</span>
      </div>
      </div>
    </details>

    <details class="card onboarding-acc" id="onbStepVariety" open>
      <summary class="onboarding-acc__summary">
        <span class="onboarding-acc__step-num" aria-hidden="true">4</span>
        <span class="onboarding-acc__summary-title"><i class="ti ti-seedling"></i> Paso 3 · Variedad, trasplante, nutriente y dosificación</span>
        <i class="ti ti-chevron-down onboarding-acc__chev" aria-hidden="true"></i>
      </summary>
      <div class="onboarding-acc__body">
      <p class="body-prose mb-text-block">El <strong>nutriente principal</strong> define la base de la mezcla en toda la app (Germ / Veg / Flor / Flush). Los <strong>aditivos</strong> mostrados son los que suele combinar esa línea: úsalos según tabla del fabricante y tus mediciones de pH/EC.</p>
      <div class="grid2">
        <div class="form-group"><label>Variedad</label><select id="onbStrain">${strains.map(s=>`<option value="${s.id}" ${(cfg.strainId||'ww')===s.id?'selected':''}>${s.name}</option>`).join('')}</select></div>
        <div class="form-group"><label>Edad (días)</label><input id="onbAge" type="number" min="0" max="120" inputmode="numeric" value="${Number.isFinite(cfg.ageDays)?cfg.ageDays:0}"></div>
        <div class="form-group"><label>Origen (semilla/esqueje/proveedor)</label><input id="onbOrigin" type="text" value="${cfg.origin||''}" placeholder="Ej: Esqueje propio"></div>
        <div class="form-group"><label>Fecha trasplante al cultivo hidropónico</label><input id="onbTransplantDate" type="date" value="${cfg.transplantDate||new Date().toISOString().split('T')[0]}"></div>
        <div class="form-group">
          <label>Nutriente principal (dosificación en la app)</label>
          <select id="onbNutri" onchange="updateOnboardingNutrientHint()">${nutrients.map(n=>`<option value="${n.rank}" ${(cfg.nutri||1)===n.rank?'selected':''}>${n.rank}. ${n.name}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>Tipo de agua</label><select id="onbWater"><option value="RO" ${(cfg.water||'RO')==='RO'?'selected':''}>Ósmosis</option><option value="destilada" ${cfg.water==='destilada'?'selected':''}>Destilada</option><option value="red" ${cfg.water==='red'?'selected':''}>Grifo</option></select></div>
      </div>
      <div id="onbNutriHint" class="onboarding-nutri-hint-host"></div>
      <button type="button" class="btn btn-primary" onclick="completeInitialSetup()"><i class="ti ti-check"></i> Finalizar checklist y activar monitorización</button>
      </div>
    </details>
  `;
  requestAnimationFrame(() => {
    updateOnboardingNutrientHint();
    if (typeof onOnboardingPlacementEnclosureSync === 'function') onOnboardingPlacementEnclosureSync();
    if (typeof toggleOnbHeaterSetpoint === 'function') {
      toggleOnbHeaterSetpoint(!!document.getElementById('onbCompHeater')?.checked);
    }
    const eng = document.getElementById('onbEngineeringCard');
    if (eng && !eng._hydroSizingAutoBound) {
      eng._hydroSizingAutoBound = true;
      const runAuto = () => {
        if (typeof scheduleOnboardingSizingRecalc === 'function') scheduleOnboardingSizingRecalc();
      };
      eng.addEventListener('input', runAuto);
      eng.addEventListener('change', runAuto);
    }
    if (typeof scheduleOnboardingSizingRecalc === 'function') scheduleOnboardingSizingRecalc();
    initOnboardingAccordionNarrow();
  });
}

function setupOnboardingProgressAnchors() {
  document.querySelectorAll('.onboarding-progress__link').forEach((a) => {
    a.addEventListener('click', () => {
      const id = a.getAttribute('href')?.slice(1);
      const d = id && document.getElementById(id);
      if (d && d.tagName === 'DETAILS') d.open = true;
    });
  });
}

function initOnboardingAccordionNarrow() {
  const acc = document.querySelectorAll('.onboarding-acc');
  if (!acc.length) return;
  setupOnboardingProgressAnchors();
  const narrow = window.matchMedia('(max-width: 640px)').matches;
  acc.forEach((el, i) => {
    el.open = narrow ? i === 0 : true;
  });
}

let hydroOnboardingSizingTimer = null;
function scheduleOnboardingSizingRecalc() {
  clearTimeout(hydroOnboardingSizingTimer);
  hydroOnboardingSizingTimer = setTimeout(() => {
    if (typeof runSystemSizingCalculation === 'function') runSystemSizingCalculation();
  }, 420);
}

function toggleSkipInitialWelcome(checked) {
  setSkipInitialWelcome(!!checked);
  renderCultivo();
}

function toggleSystemType(systemName, enabled) {
  if (!appConfig) appConfig = {};
  ensureAppConfigInstallations();
  const count = appConfig.systemInstallations.filter((i) => i.type === systemName).length;
  if (enabled) {
    if (count === 0) {
      appConfig.systemInstallations.push({
        id: genInstallationId(),
        type: systemName,
        name: uniqueDefaultInstallationName(systemName),
      });
      syncSystemsArrayFromInstallations();
    }
  } else {
    appConfig.systemInstallations = appConfig.systemInstallations.filter((i) => i.type !== systemName);
    if (!appConfig.systemInstallations.length) {
      const fallback = appConfig.system || 'RDWC';
      appConfig.systemInstallations = [
        {
          id: genInstallationId(),
          type: fallback,
          name: uniqueDefaultInstallationName(fallback),
        },
      ];
    }
    syncSystemsArrayFromInstallations();
  }
  saveAppConfig();
  renderInitialOnboarding();
}

function addSystemInstallationOfType(systemName) {
  if (!WORK_SYSTEM_OPTIONS.includes(systemName)) return;
  if (!appConfig) appConfig = {};
  ensureAppConfigInstallations();
  appConfig.systemInstallations.push({
    id: genInstallationId(),
    type: systemName,
    name: uniqueDefaultInstallationName(systemName),
  });
  syncSystemsArrayFromInstallations();
  saveAppConfig();
  renderInitialOnboarding();
}

function onOnboardingBuildTypeChange() {
  if (!appConfig) appConfig = {};
  snapshotSystemHardwareToAppConfig();
  saveAppConfig();
  renderInitialOnboarding();
}

function updateOnboardingNutrientHint() {
  const host = document.getElementById('onbNutriHint');
  if (!host || typeof nutrients === 'undefined') return;
  const rank = parseInt(document.getElementById('onbNutri')?.value, 10);
  const n = nutrients.find((x) => x.rank === rank) || nutrients[0];
  if (!n) {
    host.innerHTML = '';
    return;
  }
  const adds = (n.aditivos || []).map((a) => `<span class="pill-tag pill-tag--sm">${a}</span>`).join('');
  const nameShort = n.name.split(' ').slice(0, 4).join(' ');
  host.innerHTML = `<div class="onboarding-nutri-box card-sm">
    <div class="section-label">Línea elegida · dosificación</div>
    <p class="body-prose"><strong>${nameShort}</strong> · pH orientativo <span class="c-blue">${n.pHrange}</span> · EC <span class="c-green">${n.ECrange}</span></p>
    <div class="section-label section-label--block">Aditivos complementarios habituales</div>
    <div class="pill-tag-row">${adds || '<span class="text-muted">Sin lista en datos — revisa envase.</span>'}</div>
    <p class="text-muted onboarding-nutri-foot">En <strong>Medir</strong> y <strong>Cultivo</strong> la app usará esta base para mezclas; los aditivos son orientativos, no sustituyen al fabricante.</p>
  </div>`;
}

async function analyzeClimateContext() {
  if (!appConfig) appConfig = {};
  appConfig.error = '';
  snapshotSystemHardwareToAppConfig();
  appConfig.location = (document.getElementById('onbLocation')?.value || '').trim();
  appConfig.placement = document.getElementById('onbPlacement')?.value || 'interior';
  appConfig.system = document.getElementById('onbSystem')?.value || 'RDWC';
  saveAppConfig();
  if (!appConfig.location) {
    appConfig.error = 'Debes indicar una ubicación para analizar clima.';
    saveAppConfig();
    renderInitialOnboarding();
    return;
  }
  try {
    const geoResp = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(appConfig.location)}&count=1&language=es&format=json`);
    const geoData = await geoResp.json();
    const place = geoData?.results?.[0];
    if (!place) throw new Error('Ubicación no encontrada');
    const lat = place.latitude;
    const lon = place.longitude;
    const wxResp = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`);
    const wxData = await wxResp.json();
    const current = wxData?.current || {};
    appConfig.climate = {
      source: 'Open-Meteo (fallback AEMET)',
      lat,
      lon,
      station: place.name,
      temperature: Number.isFinite(current.temperature_2m) ? current.temperature_2m.toFixed(1) : '—',
      humidity: Number.isFinite(current.relative_humidity_2m) ? current.relative_humidity_2m : '—',
      wind: Number.isFinite(current.wind_speed_10m) ? current.wind_speed_10m.toFixed(1) : '—',
      summary: `Estación cercana: ${place.name}, ${place.country || ''}`,
      weatherCode: current.weather_code,
    };
  } catch (error) {
    appConfig.error = 'No se pudo obtener clima automático. Puedes continuar y configurar interior/exterior manualmente.';
  }
  saveAppConfig();
  renderInitialOnboarding();
}

function completeInitialSetup() {
  if (!appConfig) appConfig = {};
  appConfig.error = '';
  snapshotSystemHardwareToAppConfig();
  appConfig.system = document.getElementById('onbSystem')?.value || 'RDWC';
  appConfig.location = (document.getElementById('onbLocation')?.value || '').trim();
  appConfig.placement = document.getElementById('onbPlacement')?.value || 'interior';
  appConfig.strainId = document.getElementById('onbStrain')?.value || 'ww';
  appConfig.ageDays = parseInt(document.getElementById('onbAge')?.value, 10) || 0;
  appConfig.origin = (document.getElementById('onbOrigin')?.value || '').trim();
  appConfig.transplantDate = document.getElementById('onbTransplantDate')?.value || new Date().toISOString().split('T')[0];
  appConfig.nutri = parseInt(document.getElementById('onbNutri')?.value, 10) || 1;
  appConfig.water = document.getElementById('onbWater')?.value || 'RO';
  if (!Array.isArray(appConfig.systems) || !appConfig.systems.length) appConfig.systems = [appConfig.system];

  if (!appConfig.location) {
    appConfig.error = 'Debes indicar la ubicación del cultivo hidropónico.';
    saveAppConfig();
    renderInitialOnboarding();
    return;
  }
  if (!appConfig.origin) {
    appConfig.error = 'Debes indicar el origen del cultivo (semilla/esqueje/proveedor).';
    saveAppConfig();
    renderInitialOnboarding();
    return;
  }
  appConfig.completed = true;
  ensureAppConfigInstallations();
  const hardwareComplements = readOnboardingHardwareComplements();
  appConfig.hardwareComplements = hardwareComplements;
  const sz = computeHydroSizing(appConfig.systemHardware, appConfig.system, hardwareComplements);
  sz.userPumpValidation = validateUserDeclaredPumps(appConfig.systemHardware, sz);
  if (typeof attachGeometryToSizingResult === 'function') {
    attachGeometryToSizingResult(sz, appConfig.systemHardware, appConfig.system);
  }
  appConfig.systemSizingResult = sz;
  saveAppConfig();

  const siteCount = Math.min(48, Math.max(1, parseInt(appConfig.systemHardware?.sites, 10) || 2));
  wizData = {
    strainId: appConfig.strainId,
    plants: siteCount,
    system: appConfig.system,
    m2: 1.2,
    light: 'LED',
    technique: 'ScrOG',
    nutri: appConfig.nutri,
    water: appConfig.water,
    ambTemp: 22,
    ambHum: appConfig.placement === 'exterior' ? 60 : 55,
    startDate: appConfig.transplantDate,
    co2: appConfig.placement === 'interior' ? 'si' : 'no',
    ageDays: appConfig.ageDays,
    origin: appConfig.origin,
    location: appConfig.location,
    placement: appConfig.placement,
    climate: appConfig.climate || null,
    systemHardware: { ...appConfig.systemHardware },
    systemSizing: appConfig.systemSizingResult,
    hardwareComplements,
  };
  activateGrow();
}

function renderWizStep(){
  const s = strains.find(x=>x.id===wizData.strainId);
  const errorBox = wizData.error ? `<div class="alert danger"><i class="ti ti-alert-circle"></i><p>${wizData.error}</p></div>` : '';
  const bodies = [
    // 0
    `<div class="card cultivo-wizard-start">
      <div class="cultivo-wizard-emoji" aria-hidden="true">🌿</div>
      <div class="cultivo-wizard-title">Configurar nuevo cultivo</div>
      <p class="cultivo-wizard-sub">Sigue el asistente para obtener tu plan completo con parámetros exactos semana a semana.</p>
      <button type="button" class="btn btn-primary" onclick="wizStep=1;renderWizStep()">Comenzar <i class="ti ti-arrow-right"></i></button>
    </div>`,
    // 1 variedad
    `<div class="card">
      <div class="card-header"><div class="card-title"><i class="ti ti-seedling"></i>Paso 1 · Variedad</div></div>
      ${errorBox}
      <div class="grid2">
        <div class="form-group"><label>Variedad</label>
          <select id="wStrain">${strains.map(s=>`<option value="${s.id}" ${wizData.strainId===s.id?'selected':''}>${s.name} (${s.typeName} · ${s.thc} THC)</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>Número de plantas</label>
          <input type="number" id="wPlants" min="1" max="12" value="${wizData.plants||2}">
        </div>
      </div>
      ${s?`<div class="alert info"><i class="ti ti-info-circle"></i><p>Seleccionada: <strong>${s.name}</strong> — EC floración: ${s.ecFlower} mS/cm · pH: ${s.phFlower} · Duración: ${s.vegW+s.flowerW} semanas</p></div>`:''}
      <div class="btn-row">
        <button type="button" class="btn btn-ghost" onclick="wizStep=0;renderWizStep()">Atrás</button>
        <button type="button" class="btn btn-primary" onclick="goStep2()">Siguiente <i class="ti ti-arrow-right"></i></button>
      </div>
    </div>`,
    // 2 cultivo
    `<div class="card">
      <div class="card-header"><div class="card-title"><i class="ti ti-settings-2"></i>Paso 2 · Instalación y espacio</div></div>
      ${errorBox}
      <div class="grid2">
        <div class="form-group"><label>Tipo de cultivo hidropónico</label>
          <select id="wSys">${typeof buildCannabisHydroSystemOptionsHtml === 'function' ? buildCannabisHydroSystemOptionsHtml(wizData.system || 'RDWC') : '<option value="RDWC" selected>RDWC</option>'}</select>
        </div>
        <p class="form-hint form-hint--full-width">La app prioriza <strong>RDWC/DWC</strong> para cannabis; torre y formatos alimentarios amplios siguen en la <strong>vista de integración</strong>.</p>
        <div class="form-group"><label>Metros cuadrados</label>
          <input type="number" id="wM2" min="0.5" max="10" step="0.25" value="${wizData.m2||1.2}">
        </div>
        <div class="form-group"><label>Iluminación</label>
          <select id="wLight"><option value="LED" ${(wizData.light||'LED')==='LED'?'selected':''}>LED Full Spectrum (recomendado)</option><option value="LEC" ${wizData.light==='LEC'?'selected':''}>LEC CMH 315W</option><option value="HPS" ${wizData.light==='HPS'?'selected':''}>HPS 600W</option></select>
        </div>
        <div class="form-group"><label>Técnica de entrenamiento</label>
          <select id="wTech"><option value="ScrOG" ${(wizData.technique||'ScrOG')==='ScrOG'?'selected':''}>ScrOG</option><option value="SOG" ${wizData.technique==='SOG'?'selected':''}>SOG</option><option value="LST" ${wizData.technique==='LST'?'selected':''}>LST + Topping</option><option value="Sin técnica" ${wizData.technique==='Sin técnica'?'selected':''}>Sin técnica</option></select>
        </div>
        <div class="form-group"><label>Nutriente principal</label>
          <select id="wNutri">${nutrients.map(n=>`<option value="${n.rank}" ${wizData.nutri===n.rank?'selected':''}>${n.rank}. ${n.name}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>Tipo de agua</label>
          <select id="wWater"><option value="RO" ${wizData.water==='RO'||!wizData.water?'selected':''}>Ósmosis inversa (recomendado)</option><option value="red" ${wizData.water==='red'?'selected':''}>Agua de red filtrada</option><option value="destilada" ${wizData.water==='destilada'?'selected':''}>Agua destilada</option></select>
        </div>
      </div>
      <div class="btn-row">
        <button type="button" class="btn btn-ghost" onclick="wizData.error='';wizStep=1;renderWizStep()">Atrás</button>
        <button type="button" class="btn btn-primary" onclick="goStep3()">Siguiente <i class="ti ti-arrow-right"></i></button>
      </div>
    </div>`,
    // 3 ambiente
    `<div class="card">
      <div class="card-header"><div class="card-title"><i class="ti ti-temperature"></i>Paso 3 · Parámetros ambientales</div></div>
      ${errorBox}
      <div class="grid2">
        <div class="form-group"><label>Temperatura ambiente habitual</label>
          <input type="number" id="wTemp" min="15" max="35" value="${wizData.ambTemp||22}">
          <span class="form-hint">°C</span>
        </div>
        <div class="form-group"><label>Humedad base del espacio</label>
          <input type="number" id="wHum" min="30" max="80" value="${wizData.ambHum||55}">
          <span class="form-hint">%</span>
        </div>
        <div class="form-group"><label>Fecha inicio germinación</label>
          <input type="date" id="wDate" value="${wizData.startDate||new Date().toISOString().split('T')[0]}">
        </div>
        <div class="form-group"><label>CO₂ adicional</label>
          <select id="wCO2"><option value="no" ${wizData.co2!=='si'?'selected':''}>No (400 ppm ambiente)</option><option value="si" ${wizData.co2==='si'?'selected':''}>Sí (enriquecimiento 1000-1500 ppm)</option></select>
        </div>
      </div>
      <div class="alert warn"><i class="ti ti-map-pin"></i><p>Castelló de la Plana: veranos calurosos (35°C+). Si inicias en primavera, la floración caerá en verano — refrigeración de agua imprescindible. Mejor inicio en agosto para florar en octubre-noviembre.</p></div>
      <div class="btn-row">
        <button type="button" class="btn btn-ghost" onclick="wizData.error='';wizStep=2;renderWizStep()">Atrás</button>
        <button type="button" class="btn btn-primary" onclick="goStep4()">Siguiente <i class="ti ti-arrow-right"></i></button>
      </div>
    </div>`,
    // 4 confirm
    `<div class="card">
      <div class="card-header"><div class="card-title"><i class="ti ti-check"></i>Paso 4 · Confirmar y activar</div></div>
      ${errorBox}
      ${buildConfirmSummary()}
      <div class="btn-row">
        <button type="button" class="btn btn-ghost" onclick="wizData.error='';wizStep=3;renderWizStep()">Atrás</button>
        <button type="button" class="btn btn-primary" onclick="activateGrow()"><i class="ti ti-plant"></i> Activar cultivo</button>
      </div>
    </div>`
  ];
  document.getElementById('wizBody').innerHTML = bodies[wizStep]||bodies[0];
}

function buildConfirmSummary(){
  const s = strains.find(x=>x.id===wizData.strainId);
  const n = nutrients.find(x=>x.rank===wizData.nutri);
  if(!s) return '<div class="alert danger"><i class="ti ti-x"></i><p>Por favor selecciona una variedad primero.</p></div>';
  const watts = Math.round((wizData.m2||1.2)*400);
  const estYield = Math.round((wizData.m2||1.2)*parseInt(s.yieldIn)*0.85);
  const totalW = s.vegW + s.flowerW + 2;
  const startD = new Date(wizData.startDate||new Date());
  const endD = new Date(startD.getTime() + totalW*7*86400000);
  return `
    <div class="confirm-summary-box">
      <div class="grid2 confirm-summary-grid">
        <div>
          <div class="section-label section-label--block">Variedad y tipo de cultivo hidropónico</div>
          <div class="param-row"><span class="param-key">Variedad</span><span class="param-val">${s.name}</span></div>
          <div class="param-row"><span class="param-key">Plantas</span><span class="param-val">${wizData.plants||2}</span></div>
          <div class="param-row"><span class="param-key">Tipo hidropónico</span><span class="param-val">${wizData.system||'RDWC'}</span></div>
          <div class="param-row"><span class="param-key">Técnica</span><span class="param-val">${wizData.technique||'ScrOG'}</span></div>
          <div class="param-row"><span class="param-key">Espacio</span><span class="param-val">${wizData.m2||1.2} m²</span></div>
          <div class="param-row"><span class="param-key">Iluminación</span><span class="param-val">~${watts}W ${wizData.light||'LED'}</span></div>
        </div>
        <div>
          <div class="section-label section-label--block">Parámetros y estimaciones</div>
          <div class="param-row"><span class="param-key">Nutriente elegido</span><span class="param-val">${n?n.name.split(' ')[0]+' '+n.name.split(' ')[1]:'—'}</span></div>
          <div class="param-row"><span class="param-key">Duración total</span><span class="param-val">${totalW} semanas</span></div>
          <div class="param-row"><span class="param-key">Inicio germinación</span><span class="param-val">${startD.toLocaleDateString('es-ES')}</span></div>
          <div class="param-row"><span class="param-key">Cosecha estimada</span><span class="param-val c-amber">${endD.toLocaleDateString('es-ES')}</span></div>
          <div class="param-row"><span class="param-key">Rendimiento est.</span><span class="param-val c-green">${estYield} g</span></div>
          <div class="param-row"><span class="param-key">Temp. ambiente</span><span class="param-val">${wizData.ambTemp||22}°C</span></div>
        </div>
      </div>
    </div>
  `;
}

function activateGrow(){
  const s = strains.find(x=>x.id===wizData.strainId);
  if(!s){wizData.error='Debes seleccionar una variedad válida antes de activar el cultivo.';renderWizStep();return;}
  wizData.error = '';
  const sizing = wizData.systemSizing || null;
  const reservoirFromSizing =
    sizing && Number.isFinite(sizing.totalSolutionL) && sizing.totalSolutionL > 0
      ? Math.round(sizing.totalSolutionL)
      : Math.max(20, (wizData.plants || 2) * 20);
  myGrow = {
    strain: s,
    plants: wizData.plants||2,
    system: wizData.system||'RDWC',
    technique: wizData.technique||'ScrOG',
    m2: wizData.m2||1.2,
    light: wizData.light||'LED',
    nutri: wizData.nutri||1,
    water: wizData.water||'RO',
    ambTemp: wizData.ambTemp||22,
    ambHum: wizData.ambHum||55,
    co2: wizData.co2||'no',
    startDate: new Date(wizData.startDate||new Date()),
    ageDays: wizData.ageDays || 0,
    origin: wizData.origin || 'No especificado',
    transplantDate: wizData.startDate || new Date().toISOString().split('T')[0],
    location: wizData.location || appConfig?.location || '',
    placement: wizData.placement || appConfig?.placement || 'interior',
    climate: wizData.climate || appConfig?.climate || null,
    systemHardware: wizData.systemHardware || null,
    systemSizing: sizing,
    hardwareComplements:
      typeof normalizeHardwareComplements === 'function'
        ? normalizeHardwareComplements(wizData.hardwareComplements ?? appConfig?.hardwareComplements)
        : wizData.hardwareComplements || appConfig?.hardwareComplements,
    reservoirL: reservoirFromSizing,
    sourceEC: (waterProfiles[wizData.water||'RO']||waterProfiles.RO).baseEC,
    sourcePH: (waterProfiles[wizData.water||'RO']||waterProfiles.RO).basePH,
    selectedPlant: 1,
    measurements: [],
    plantProfiles: {},
    log: [
      {date:new Date().toISOString(),text:'Cultivo activado: '+s.name+' en '+wizData.system,type:'ok'},
      {date:new Date().toISOString(),text:'Germinación iniciada. Solución EC 0.3 mS/cm · pH 5.5',type:'info'}
    ],
    systemDisplayNames: {},
  };
  ensureAppConfigInstallations();
  const pickInst =
    appConfig.systemInstallations.find((i) => i.type === myGrow.system) || appConfig.systemInstallations[0];
  if (pickInst) {
    myGrow.activeInstallationId = pickInst.id;
    myGrow.system = pickInst.type;
  }
  ensureSystemWorkspaces(myGrow);
  migrateGrowWorkspacesAndActiveInstall(myGrow);
  if (sizing && !sizing.nft && Number.isFinite(sizing.airPumpLpmRecommended)) {
    const recirc = sizing.waterPump
      ? ` Recirculación ~${sizing.waterPump.lphTarget} L/h.`
      : '';
    myGrow.log.push({
      date: new Date().toISOString(),
      text: `Dimensionado checklist: bomba de aire ≥ ${sizing.airPumpLpmRecommended} L/min.${recirc}`,
      type: 'info',
    });
  }
  syncCurrentSystemWorkspaceState();
  saveGrowState();
  setSideStatusText(s.name + ' · S1');
  renderActiveGrow();
  renderMonitor();
  renderSemanas();
  if (typeof renderInicio === 'function') renderInicio();
}

function renderActiveGrow(){
  ensurePlantProfiles(myGrow);
  const s = myGrow.strain;
  const n = nutrients.find(x=>x.rank===myGrow.nutri)||nutrients[0];
  const daysSince = Math.floor((new Date()-myGrow.startDate)/86400000);
  const weekNum = Math.max(1,Math.ceil((daysSince+1)/7));
  const totalW = s.vegW+s.flowerW+2;
  setSideStatusText(s.name+' · S'+weekNum);
  updateSystemSwitchTriggerState();

  let phase='Germinación',phClass='ph-germ',currentEC=0.4,currentPH='5.5–5.8',lightSched='18/6',humidity='70–90%',tempRange='22–26°C',co2='400 ppm';
  if(weekNum<=1){phase='Germinación';phClass='ph-germ';currentEC=0.4;currentPH='5.5–5.8';lightSched='18/6';humidity='70–90%';tempRange='22–26°C';}
  else if(weekNum<=s.vegW){phase='Vegetación';phClass='ph-veg';currentEC=s.ecVeg+(weekNum/s.vegW)*0.3;currentPH=s.ph;lightSched='18/6';humidity='55–70%';tempRange='24–28°C';}
  else if(weekNum<=s.vegW+2){phase='Prefloración';phClass='ph-pre';currentEC=(s.ecVeg+s.ecFlower)/2;currentPH='5.8–6.2';lightSched='12/12';humidity='50–60%';tempRange='22–26°C';}
  else if(weekNum<=s.vegW+s.flowerW-2){phase='Floración plena';phClass='ph-flower';currentEC=s.ecFlower;currentPH=s.phFlower;lightSched='12/12';humidity='40–55%';tempRange='20–26°C';}
  else if(weekNum<=s.vegW+s.flowerW){phase='Engorde';phClass='ph-engorde';currentEC=s.ecPeak;currentPH=s.phFlower;lightSched='12/12';humidity='35–50%';tempRange='18–24°C';}
  else{phase='Flush / Cosecha';phClass='ph-flush';currentEC=0.2;currentPH='6.0–6.5';lightSched='12/12';humidity='35–45%';tempRange='18–22°C';}
  currentEC = Math.round(currentEC*10)/10;
  const mixPlan = calculateMixPlan(myGrow, n, phase);
  const compGrow =
    typeof normalizeHardwareComplements === 'function'
      ? normalizeHardwareComplements(myGrow.hardwareComplements)
      : {};
  const learnUiGrow = typeof getUiExperienceMode === 'function' && getUiExperienceMode() === 'learning';
  const placementCfgGrow = myGrow.placement === 'exterior' ? 'exterior' : 'interior';
  const minSnipGrow =
    typeof getMinimumHydroInstrumentSnippets === 'function' ? getMinimumHydroInstrumentSnippets(placementCfgGrow) : [];
  const minKitCfgBlock =
    minSnipGrow.length > 0
      ? `<div class="alert info complements-min-kit"><i class="ti ti-checklist"></i><div><strong>Mínimo razonable (${placementCfgGrow === 'exterior' ? 'exterior' : 'interior'})</strong><ul class="legal-list">${minSnipGrow.map((t) => `<li>${escapeHtmlText(t)}</li>`).join('')}</ul>${
          learnUiGrow && typeof getLearningRecintoEquipmentNarrativeHtml === 'function'
            ? getLearningRecintoEquipmentNarrativeHtml()
            : `<p class="form-hint complements-min-kit-hint">Con <strong>Aprendizaje</strong> en Apariencia verás cuándo compensa el perfil «espacio amplio» o más equipo.</p>`
        }</div></div>`
      : '';
  const systemSvg = renderSystemSvg(myGrow, s, weekNum, phase);
  const allPlantsSummaryHtml = renderAllPlantsSystemSummaryHtml(myGrow, s, phase);
  const activeSystemButtonLabel =
    typeof getResolvedSystemDisplayName === 'function'
      ? escapeHtmlText(getResolvedSystemDisplayName(myGrow, myGrow.system))
      : escapeHtmlText(myGrow.system);
  const placementAlertsHtml =
    typeof renderGrowAlertSlotHtml === 'function' ? renderGrowAlertSlotHtml(myGrow, 'placement') : '';
  const sz = myGrow.systemSizing;
  const ventLine =
    sz?.ventilation && Number.isFinite(sz.ventilation.extractorM3hComfort)
      ? sz.ventilation.usedUserSuppliedVolume
        ? `<p><strong>Extractor (recinto, orientativo):</strong> ~${sz.ventilation.extractorM3hMin}–${sz.ventilation.extractorM3hComfort} m³/h, según los <strong>${sz.ventilation.spaceAssumedM3} m³</strong> que indicaste.</p><p class="form-hint cultivo-sizing-vent-note">Si cambias el volumen del recinto, guarda emplazamiento o instrumentación para actualizar esta fila.</p>`
        : `<p><strong>Extractor (recinto, orientativo):</strong> ~${sz.ventilation.extractorM3hMin}–${sz.ventilation.extractorM3hComfort} m³/h (~${sz.ventilation.cfmMin}–${sz.ventilation.cfmComfort} CFM).</p><p class="form-hint cultivo-sizing-vent-note">Estimación por sitios y volumen de solución; indica m³ del recinto en emplazamiento para afinar.</p>`
      : '';
  const sizingBodyNonNft = `
          ${
            Number.isFinite(sz.airPumpLpmRecommended)
              ? `<p><strong>Bomba de aire (referencia):</strong> ≥ ${sz.airPumpLpmRecommended} L/min</p>`
              : ''
          }
          ${
            sz.waterPump
              ? `<p><strong>Recirculación RDWC:</strong> ~${sz.waterPump.lphTarget} L/h (~${sz.waterPump.gphTarget} GPH)</p>`
              : `<p><strong>Recirculación:</strong> no aplica en DWC autónomo por cubos.</p>`
          }
          ${Number.isFinite(sz.totalSolutionL) ? `<p><strong>Volumen útil estimado:</strong> ~${sz.totalSolutionL} L</p>` : ''}
          ${sz.mainPipeHint ? `<p class="cultivo-pipe-hint"><strong>Tubería:</strong> ${sz.mainPipeHint}</p>` : ''}
          ${ventLine}`;
  const sizingBodyNft = `
          ${Number.isFinite(sz.totalSolutionL) ? `<p><strong>Volumen de solución orientativo:</strong> ~${sz.totalSolutionL} L</p>` : ''}
          ${ventLine}`;
  const sizingRecall =
    sz && !sz.nft
      ? `<details class="card cultivo-fold-card">
        <summary class="cultivo-fold-card__summary">
          <span class="cultivo-fold-card__summary-title"><i class="ti ti-tool" aria-hidden="true"></i> Dimensionado del cultivo hidropónico (desde checklist)</span>
          <i class="ti ti-chevron-down cultivo-fold-card__chev" aria-hidden="true"></i>
        </summary>
        <div class="cultivo-fold-card__body cultivo-sizing-body">${sizingBodyNonNft}
        </div>
      </details>`
      : sz && sz.nft && (ventLine || Number.isFinite(sz.totalSolutionL))
        ? `<details class="card cultivo-fold-card">
        <summary class="cultivo-fold-card__summary">
          <span class="cultivo-fold-card__summary-title"><i class="ti ti-tool" aria-hidden="true"></i> Referencias de escala (${escapeHtmlText(sz.systemType || '')})</span>
          <i class="ti ti-chevron-down cultivo-fold-card__chev" aria-hidden="true"></i>
        </summary>
        <div class="cultivo-fold-card__body cultivo-sizing-body">${sizingBodyNft}
        </div>
      </details>`
        : '';

  const segs = Array.from({length:totalW},(_,i)=>{
    let cls='tl-veg';
    if(i===0)cls='tl-germ';
    else if(i>=s.vegW&&i<s.vegW+2)cls='tl-pre';
    else if(i>=s.vegW+2&&i<s.vegW+s.flowerW)cls='tl-flower';
    else if(i>=s.vegW+s.flowerW)cls='tl-flush';
    return `<div class="tl-seg ${cls} ${i<weekNum-1?'past':''}" title="S${i+1}: ${i===0?'Germinación':i<s.vegW?'Vegetación':i<s.vegW+2?'Prefloración':i<s.vegW+s.flowerW?'Floración':'Flush'}"></div>`;
  }).join('');

  const cultivoNativeHydroCard = buildCultivoNativeHydroContextCardHtml(myGrow);
  const cultivoHcFusionBanner = buildCultivoHcFusionBannerHtml(myGrow);

  document.getElementById('cultivoContent').innerHTML=`${cultivoNativeHydroCard}
${cultivoHcFusionBanner}
    <div class="card">
      <div class="grow-summary">
        <div class="grow-summary-main">
          <span class="strain-type t-${s.type}">${s.typeName}</span>
          <div class="grow-title">${s.name}</div>
          <p class="grow-sub">Inicio: ${myGrow.startDate.toLocaleDateString('es-ES')} · Semana ${weekNum} de ${totalW}</p>
        </div>
        <div class="grow-summary-aside">
          <span class="phase-pill ${phClass}">${phase}</span>
          <span class="strain-tag-pill">Variedad: ${s.name}</span>
          <div class="grow-nutri-hint">Nutriente: ${n.name.split(' ').slice(0,2).join(' ')}</div>
        </div>
      </div>
      <div class="timeline-bar">${segs}</div>
      <div class="timeline-legend">
        <span>Germ</span><span>Veg (${s.vegW}s)</span><span>Floración (${s.flowerW}s)</span><span>Flush</span>
      </div>
    </div>

    ${sizingRecall}

    <details class="card cultivo-fold-card cultivo-site-card">
      <summary class="cultivo-fold-card__summary">
        <span class="cultivo-fold-card__summary-title"><i class="ti ti-map-pin" aria-hidden="true"></i> Emplazamiento y clima</span>
        <i class="ti ti-chevron-down cultivo-fold-card__chev" aria-hidden="true"></i>
      </summary>
      <div class="cultivo-fold-card__body">
      <p class="body-prose cultivo-site-lead">La pestaña <strong>Climatología</strong> y las alertas de <strong>exterior</strong> usan esta ubicación. Si la cambias (o pasas de interior a exterior), se borra el pronóstico guardado para no mezclar datos de otra zona.</p>
      <div class="grid2 cultivo-site-grid">
        <div class="form-group">
          <label>Ubicación del cultivo hidropónico</label>
          <input id="cfgGrowLocation" type="text" value="${escapeHtmlAttr(myGrow.location || '')}" placeholder="Ej: Madrid, Vigo, Castelló de la Plana" autocomplete="address-level2">
          <span class="form-hint">Misma cadena que se geocodifica en Climatología.</span>
        </div>
        <div class="form-group">
          <label>Instalación</label>
          <select id="cfgGrowPlacement" onchange="onCfgGrowPlacementEnclosureSync()">
            <option value="interior" ${myGrow.placement === 'exterior' ? '' : 'selected'}>Interior</option>
            <option value="exterior" ${myGrow.placement === 'exterior' ? 'selected' : ''}>Exterior</option>
          </select>
          <span class="form-hint">Exterior activa el plan hidropónico según tiempo y viento/lluvia.</span>
        </div>
        <div class="form-group">
          <label>Perfil del espacio (microclima · Medir)</label>
          <select id="cfgGrowEnclosure" onchange="syncInstrumentComplementsUi('cfg')">
            <option value="cabinet" ${(compGrow.enclosureType || 'cabinet') === 'cabinet' ? 'selected' : ''}>Armario o carpa sellada</option>
            <option value="greenhouse" ${compGrow.enclosureType === 'greenhouse' ? 'selected' : ''}>Espacio amplio / macro-carpa (microclima tipo invernadero)</option>
            <option value="open_room" ${compGrow.enclosureType === 'open_room' ? 'selected' : ''}>Estancia o nave amplia</option>
            <option value="outdoor" ${compGrow.enclosureType === 'outdoor' ? 'selected' : ''}>Exterior / vivero al aire libre</option>
          </select>
          <span class="form-hint">Con <strong>Exterior</strong> en Instalación, este selector queda en exterior. Guárdalo junto con la instrumentación abajo.</span>
        </div>
        <div class="form-group">
          <label>Volumen del recinto (m³, opcional)</label>
          <input id="cfgEnclosureVolumeM3" type="number" min="0.05" max="80" step="0.01" inputmode="decimal" placeholder="Ej. 1.2" value="${Number.isFinite(compGrow.enclosureVolumeM3) ? compGrow.enclosureVolumeM3 : ''}">
          <span class="form-hint">Solo para afinar la fila del <strong>extractor</strong> en el resumen de dimensionado. Vacío = estimación por sitios y litros de solución.</span>
        </div>
      </div>
      <div class="cultivo-site-actions">
        <button type="button" class="btn btn-primary btn--compact" onclick="saveGrowLocationAndPlacement()"><i class="ti ti-device-floppy"></i> Guardar emplazamiento</button>
      </div>
      ${placementAlertsHtml}
      </div>
    </details>

    ${typeof renderGrowAlertsCardHtml === 'function' ? renderGrowAlertsCardHtml(myGrow) : ''}

    <div class="grid2">
      <div class="card">
        <div class="card-header"><div class="card-title"><i class="ti ti-flask"></i>Dosis nutriente hoy</div></div>
        <div class="body-prose">
          ${phase.includes('Germ')?n.phases.germ:phase.includes('Veg')?n.phases.veg:phase.includes('Flush')?n.phases.flush:n.phases.flower}
        </div>
        <p class="text-muted cultivo-card-foot">Fuente: ${n.name}</p>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title"><i class="ti ti-bulb"></i>Acción recomendada</div></div>
        <div class="body-prose">
          ${phase.includes('Germ')?'Mantener humedad >70%. Temperatura cúpula 24°C. Luz tenue 18/6.':
            phase.includes('Veg')?s.phaseDesc?s.nutriProfile.veg:'Aplicar técnica '+myGrow.technique+'. Revisar EC y pH cada 48h.':
            phase.includes('Pre')?'Cambiar a 12/12. Subir EC gradualmente. Stretch esperado: 50-100% de altura.':
            phase.includes('Flush')?'Solo agua RO, EC 0.1–0.3. Tricomas: iniciar con lupa 60x.':
            'Floración plena. '+s.nutriProfile.flower}
        </div>
      </div>
    </div>

    <div class="grid2">
      <div class="card">
        <div class="card-header"><div class="card-title"><i class="ti ti-adjustments"></i>Configuración manual del cultivo hidropónico</div></div>
        <div class="grid2">
          <div class="form-group">
            <label>Tipo de agua</label>
            <select id="cfgWater" onchange="updateMixConfig()">
              <option value="RO" ${myGrow.water==='RO'?'selected':''}>Ósmosis</option>
              <option value="destilada" ${myGrow.water==='destilada'?'selected':''}>Destilada</option>
              <option value="red" ${myGrow.water==='red'?'selected':''}>Grifo</option>
            </select>
          </div>
          <div class="form-group">
            <label>Volumen depósito (L)</label>
            <input id="cfgReservoir" type="number" min="5" max="1000" step="1" value="${myGrow.reservoirL||60}" onchange="updateMixConfig()">
          </div>
          <div class="form-group">
            <label>EC agua base (mS/cm)</label>
            <input id="cfgSourceEC" type="number" min="0" max="2.5" step="0.01" value="${myGrow.sourceEC||0.1}" onchange="updateMixConfig()">
          </div>
          <div class="form-group">
            <label>pH agua base</label>
            <input id="cfgSourcePH" type="number" min="4.5" max="9" step="0.1" value="${myGrow.sourcePH||6.1}" onchange="updateMixConfig()">
          </div>
          ${
            myGrow.system === 'RDWC'
              ? `<div class="form-group">
            <label>Número de cubos de cultivo (sin el depósito de control)</label>
            <input type="number" id="cfgGrowSites" min="1" max="${MAX_HYDRO_SITE_COUNT}" step="1" value="${getConfiguredSiteCount(myGrow)}" onchange="saveGrowSiteCountFromUi()">
            <span class="form-hint">Mismo rango que el checklist (1–${MAX_HYDRO_SITE_COUNT}). Actualiza el esquema y los sitios P1…Pn.</span>
          </div>
          <div class="form-group">
            <label>Esquema RDWC (vista cenital)</label>
            <select id="cfgRdwcDiagram" onchange="saveRdwcDiagramStyleFromUi()">
              <option value="side" ${myGrow.systemHardware?.rdwcDiagramStyle === 'rear_kit' ? '' : 'selected'}>Depósito al costado · genérico</option>
              <option value="rear_kit" ${myGrow.systemHardware?.rdwcDiagramStyle === 'rear_kit' ? 'selected' : ''}>Kit comercial · depósito trasero (Growrilla y similares)</option>
            </select>
            <span class="form-hint">Solo cambia el dibujo; caudales y volumen no se alteran.</span>
          </div>`
              : ''
          }
        </div>
        <details class="cultivo-complements-details">
        <summary class="cultivo-fold-card__summary cultivo-complements-details__summary">
          <span class="cultivo-fold-card__summary-title"><i class="ti ti-tools" aria-hidden="true"></i> Complementos e instrumentación</span>
          <i class="ti ti-chevron-down cultivo-fold-card__chev" aria-hidden="true"></i>
        </summary>
        <div class="cultivo-complements-details__body">
        <p class="text-muted complements-section-hint">Lo mismo que en el <strong>checklist inicial</strong>; ábrelo si añades medidores o cambias el recinto. El <strong>asistente de Medir</strong> usa estas marcas.</p>
        ${minKitCfgBlock}
        <div class="grid2 onboarding-complements">
          <label class="checkbox-label chip-check-line"><input type="checkbox" id="cfgCompPhEc" ${compGrow.meterPhEc ? 'checked' : ''}><span>Medidor <strong>pH</strong> y <strong>EC</strong></span></label>
          <label class="checkbox-label chip-check-line"><input type="checkbox" id="cfgCompWaterTemp" ${compGrow.meterWaterTemp ? 'checked' : ''}><span>Sonda <strong>Tª líquido</strong></span></label>
          <label class="checkbox-label chip-check-line"><input type="checkbox" id="cfgCompThermoHygro" ${compGrow.meterThermoHygro ? 'checked' : ''}><span><strong>Termohigrómetro</strong> (Tª + HR)</span></label>
          <label class="checkbox-label chip-check-line"><input type="checkbox" id="cfgCompCo2" ${compGrow.meterCo2 ? 'checked' : ''}><span>Medidor <strong>CO₂</strong></span></label>
          <label class="checkbox-label chip-check-line"><input type="checkbox" id="cfgCompPpfd" ${compGrow.meterPpfd ? 'checked' : ''}><span>Medidor <strong>luz</strong> (lux/PAR)</span></label>
          <label class="checkbox-label chip-check-line"><input type="checkbox" id="cfgCompHeater" ${compGrow.reservoirHeater ? 'checked' : ''} onchange="toggleCfgHeaterSetpoint(this.checked)"><span><strong>Calentador</strong> depósito + termostato</span></label>
        </div>
        <div class="section-label section-label--block">Opciones del recinto (opcional)</div>
        <p class="form-hint">En interior <strong>no hace falta</strong> invernadero de cristal: armario o carpa con luz y aire razonable suele bastar. Marca solo lo que tengas; extractor, humedad y LED inciden en alertas y en el asistente de <strong>Medir</strong>.</p>
        <div class="grid2 onboarding-complements">
          <label class="checkbox-label chip-check-line"><input type="checkbox" id="cfgGhReflective" ${compGrow.greenhouseReflectiveInterior ? 'checked' : ''}><span>Interior <strong>reflectante</strong></span></label>
          <label class="checkbox-label chip-check-line"><input type="checkbox" id="cfgGhAeration" ${compGrow.greenhouseAerationControl ? 'checked' : ''}><span><strong>Aireación/ventilación</strong> controlada</span></label>
          <label class="checkbox-label chip-check-line"><input type="checkbox" id="cfgGhHumidity" ${compGrow.greenhouseHumidityControl ? 'checked' : ''}><span>Control de <strong>humedad</strong></span></label>
          <div class="form-group">
            <label>LED suplementario o mezcla con luz natural</label>
            <select id="cfgGhLedMode">
              <option value="none" ${compGrow.greenhouseLedMode === 'none' ? 'selected' : ''}>No / natural</option>
              <option value="full" ${compGrow.greenhouseLedMode === 'full' ? 'selected' : ''}>Espectro completo</option>
              <option value="veg_bloom" ${compGrow.greenhouseLedMode === 'veg_bloom' ? 'selected' : ''}>Canales Veg/Bloom</option>
              <option value="supplement" ${compGrow.greenhouseLedMode === 'supplement' ? 'selected' : ''}>Suplementario</option>
            </select>
          </div>
          <div class="form-group">
            <label>Potencia LED (W)</label>
            <input type="number" id="cfgGhLedPowerW" min="20" max="3000" step="10" inputmode="numeric" value="${Number.isFinite(compGrow.greenhouseLedPowerW) ? compGrow.greenhouseLedPowerW : ''}">
          </div>
        </div>
        <div class="form-group onboarding-heater-setpoint" id="cfgHeaterSetpointWrap" style="${compGrow.reservoirHeater ? '' : 'opacity:0.55'}">
          <label>Termostato calentador (°C)</label>
          <input type="number" id="cfgCompHeaterSetC" min="15" max="32" step="0.5" value="${Number.isFinite(compGrow.heaterThermostatC) ? compGrow.heaterThermostatC : 22}" ${compGrow.reservoirHeater ? '' : 'disabled'}>
        </div>
        <button type="button" class="btn btn-primary btn--compact" onclick="saveGrowHardwareComplements()"><i class="ti ti-device-floppy"></i> Guardar instrumentación</button>
        <div class="section-label section-label--block">Resumen del recinto (opcional)</div>
        <div class="pill-tag-row">
          ${compGrow.greenhouseReflectiveInterior ? '<span class="pill-tag">Interior reflectante</span>' : ''}
          ${compGrow.greenhouseAerationControl ? '<span class="pill-tag">Aireación controlada</span>' : ''}
          ${compGrow.greenhouseHumidityControl ? '<span class="pill-tag">Control de humedad</span>' : ''}
          ${
            compGrow.greenhouseLedMode !== 'none'
              ? `<span class="pill-tag">LED ${
                  compGrow.greenhouseLedMode === 'full'
                    ? 'espectro completo'
                    : compGrow.greenhouseLedMode === 'veg_bloom'
                      ? 'Veg/Bloom'
                      : 'suplementario'
                }${Number.isFinite(compGrow.greenhouseLedPowerW) ? ` · ${compGrow.greenhouseLedPowerW}W` : ''}</span>`
              : '<span class="text-muted">Sin LED suplementario declarado.</span>'
          }
        </div>
        </div>
        </details>
        <div class="alert info"><i class="ti ti-database"></i><p>Estos valores se guardan en memoria local para tus próximos cálculos.</p></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title"><i class="ti ti-calculator"></i>Cálculo automático de mezcla</div></div>
        <div class="param-row"><span class="param-key">Fase</span><span class="param-val">${phase}</span></div>
        <div class="param-row"><span class="param-key">Agua</span><span class="param-val">${mixPlan.waterLabel}</span></div>
        <div class="param-row"><span class="param-key">Nutriente base</span><span class="param-val green">${mixPlan.baseMl} mL</span></div>
        <div class="param-row"><span class="param-key">CalMag recomendado</span><span class="param-val amber">${mixPlan.calmagMl} mL</span></div>
        <div class="param-row"><span class="param-key">Aditivos</span><span class="param-val">${mixPlan.additivesMl} mL</span></div>
        <div class="param-row"><span class="param-key">EC estimada final</span><span class="param-val blue">${mixPlan.estimatedEC} mS/cm</span></div>
        <div class="param-row"><span class="param-key">pH objetivo sugerido</span><span class="param-val purple">${mixPlan.targetPH}</span></div>
        ${
          mixPlan.heaterHint
            ? `<div class="param-row"><span class="param-key">Calentador</span><span class="param-val">${mixPlan.heaterHint}</span></div>`
            : ''
        }
      </div>
    </div>

    <div class="card">
      <div class="card-header card-header--split">
        <div class="card-title"><i class="ti ti-vector"></i>Esquema cenital del cultivo hidropónico (<button type="button" class="btn btn-ghost btn--tiny" ${getAvailableWorkSystems().length > 1 ? 'onclick="openSystemWorkspaceSelector()"' : 'disabled'}>${activeSystemButtonLabel}</button>)</div>
        <button type="button" class="btn btn-ghost btn--compact" onclick="exportSystemSvg()"><i class="ti ti-download"></i> Exportar SVG</button>
      </div>
      <div class="system-svg-wrap">${systemSvg}</div>
      <div class="svg-panel-grid svg-panel-grid--single">
        <div class="card-sm plant-system-summary-card">
          <div class="section-label">Plantas del cultivo hidropónico</div>
          ${allPlantsSummaryHtml}
        </div>
      </div>
      <div class="alert info"><i class="ti ti-info-circle"></i><p>Vista cenital: cada sitio lleva un <strong>icono de planta</strong> (plántula si germinación o &lt;18 días; hoja tipo cannabis si planta establecida o esqueje de proveedor). Toca el <strong>cubo o cesta</strong> para seleccionar P1…Pn; toca el <strong>icono</strong> para la ficha (variedad, edad, procedencia). ${myGrow.system === 'RDWC' ? 'En RDWC, pH/EC son de la solución común (depósito de control).' : ''}</p></div>
    </div>

    <button type="button" class="btn btn-ghost reset-grow-btn" onclick="resetGrow()">
      <i class="ti ti-trash"></i> Reiniciar cultivo
    </button>
  `;
  requestAnimationFrame(() => {
    if (typeof onCfgGrowPlacementEnclosureSync === 'function') onCfgGrowPlacementEnclosureSync();
  });
}

function resetWizardAndSessionChrome() {
  wizStep = 0;
  wizData = { error: '' };
  pendingWorkSystemTarget = null;
  closeSystemWorkspaceSelector();
  setSideStatusText('Sin cultivo activo');
  updateSystemSwitchTriggerState();
}

function resetGrow() {
  clearGrowState();
  resetWizardAndSessionChrome();
  renderCultivo();
  renderMonitor();
  renderSemanas();
}

function goStep2() {
  const strainId = document.getElementById('wStrain')?.value;
  const plants = parseInt(document.getElementById('wPlants')?.value, 10);
  if (!strainId) {
    wizData.error = 'Selecciona una variedad para continuar.';
    renderWizStep();
    return;
  }
  if (Number.isNaN(plants) || plants < 1 || plants > 12) {
    wizData.error = 'El número de plantas debe estar entre 1 y 12.';
    renderWizStep();
    return;
  }
  wizData.error = '';
  wizData.strainId = strainId;
  wizData.plants = plants;
  wizStep = 2;
  renderWizStep();
}

function goStep3() {
  const m2 = parseFloat(document.getElementById('wM2')?.value);
  const nutrientRank = parseInt(document.getElementById('wNutri')?.value, 10);
  if (Number.isNaN(m2) || m2 < 0.5 || m2 > 10) {
    wizData.error = 'Los metros cuadrados deben estar entre 0.5 y 10.';
    renderWizStep();
    return;
  }
  if (!nutrients.find((item) => item.rank === nutrientRank)) {
    wizData.error = 'Selecciona un nutriente principal válido.';
    renderWizStep();
    return;
  }
  wizData.error = '';
  wizData.system = document.getElementById('wSys')?.value || 'RDWC';
  wizData.m2 = m2;
  wizData.light = document.getElementById('wLight')?.value || 'LED';
  wizData.technique = document.getElementById('wTech')?.value || 'ScrOG';
  wizData.nutri = nutrientRank;
  wizData.water = document.getElementById('wWater')?.value || 'RO';
  wizStep = 3;
  renderWizStep();
}

function goStep4() {
  const ambTemp = parseInt(document.getElementById('wTemp')?.value, 10);
  const ambHum = parseInt(document.getElementById('wHum')?.value, 10);
  const startDate = document.getElementById('wDate')?.value;
  if (Number.isNaN(ambTemp) || ambTemp < 15 || ambTemp > 35) {
    wizData.error = 'La temperatura ambiente debe estar entre 15 y 35°C.';
    renderWizStep();
    return;
  }
  if (Number.isNaN(ambHum) || ambHum < 30 || ambHum > 80) {
    wizData.error = 'La humedad base debe estar entre 30% y 80%.';
    renderWizStep();
    return;
  }
  if (!startDate) {
    wizData.error = 'Debes indicar una fecha de inicio de germinación.';
    renderWizStep();
    return;
  }
  wizData.error = '';
  wizData.ambTemp = ambTemp;
  wizData.ambHum = ambHum;
  wizData.startDate = startDate;
  wizData.co2 = document.getElementById('wCO2')?.value || 'no';
  wizStep = 4;
  renderWizStep();
}

function updateMixConfig() {
  if (!myGrow) return;
  const water = document.getElementById('cfgWater')?.value || 'RO';
  const profile = waterProfiles[water] || waterProfiles.RO;
  const reservoirL = parseFloat(document.getElementById('cfgReservoir')?.value);
  const sourceEC = parseFloat(document.getElementById('cfgSourceEC')?.value);
  const sourcePH = parseFloat(document.getElementById('cfgSourcePH')?.value);
  myGrow.water = water;
  myGrow.reservoirL = Number.isFinite(reservoirL) ? Math.max(5, reservoirL) : 60;
  myGrow.sourceEC = Number.isFinite(sourceEC) ? Math.max(0, sourceEC) : profile.baseEC;
  myGrow.sourcePH = Number.isFinite(sourcePH) ? sourcePH : profile.basePH;
  saveGrowState();
  renderActiveGrow();
}

function calculateMixPlan(grow, nutrient, phaseName) {
  const water = waterProfiles[grow.water] || waterProfiles.RO;
  const dose = doseByNutrientRank[nutrient.rank] || { baseMlL: 3, supplementsMlL: 0.5 };
  const sysMod = typeof getSystemProfile === 'function' ? getSystemProfile(grow.system).nutrientModifier : 1;
  const phaseMultiplier =
    (phaseName.includes('Germ') ? 0.35 : phaseName.includes('Veg') ? 0.85 : phaseName.includes('Flush') ? 0.1 : 1) * sysMod;
  const reservoirL = Number.isFinite(grow.reservoirL) ? grow.reservoirL : 60;
  const sourceEC = Number.isFinite(grow.sourceEC) ? grow.sourceEC : water.baseEC;
  const baseMl = (dose.baseMlL * phaseMultiplier * reservoirL).toFixed(1);
  const calmagMl = (water.calmagMlL * reservoirL * (phaseName.includes('Flush') ? 0 : 1)).toFixed(1);
  const additivesMl = (dose.supplementsMlL * phaseMultiplier * reservoirL).toFixed(1);
  const estimatedEC = (sourceEC + (dose.baseMlL * phaseMultiplier * 0.35) + (water.calmagMlL * 0.2)).toFixed(2);
  const targetPH = phaseName.includes('Veg') ? '5.7–6.0' : phaseName.includes('Flush') ? '6.0–6.2' : '5.8–6.2';
  const hc =
    typeof normalizeHardwareComplements === 'function'
      ? normalizeHardwareComplements(grow.hardwareComplements)
      : { reservoirHeater: false, heaterThermostatC: null };
  let heaterHint = '';
  if (hc.reservoirHeater && Number.isFinite(hc.heaterThermostatC)) {
    heaterHint = `Calentador ~${hc.heaterThermostatC}°C: verifica con la sonda en el líquido que no superas el rango radicular de la fase.`;
  }
  return {
    waterLabel: water.label,
    baseMl,
    calmagMl,
    additivesMl,
    estimatedEC,
    targetPH,
    heaterHint,
  };
}

function readOnboardingHardwareComplements() {
  const heater = !!document.getElementById('onbCompHeater')?.checked;
  const setRaw = parseFloat(document.getElementById('onbCompHeaterSetC')?.value);
  const ledMode =
    document.getElementById('onbGhLedMode')?.value && ['none', 'full', 'veg_bloom', 'supplement'].includes(document.getElementById('onbGhLedMode')?.value)
      ? document.getElementById('onbGhLedMode')?.value
      : 'none';
  const ledPowerRaw = parseFloat(document.getElementById('onbGhLedPowerW')?.value);
  const encSel = document.getElementById('onbEnclosureType')?.value;
  let enclosureType = ['cabinet', 'greenhouse', 'open_room', 'outdoor'].includes(encSel) ? encSel : 'cabinet';
  const placement = document.getElementById('onbPlacement')?.value === 'exterior' ? 'exterior' : 'interior';
  if (placement === 'exterior') enclosureType = 'outdoor';
  const raw = {
    reservoirHeater: heater,
    heaterThermostatC: heater && Number.isFinite(setRaw) ? Math.min(35, Math.max(15, setRaw)) : null,
    meterPhEc: !!document.getElementById('onbCompPhEc')?.checked,
    meterWaterTemp: !!document.getElementById('onbCompWaterTemp')?.checked,
    meterThermoHygro: !!document.getElementById('onbCompThermoHygro')?.checked,
    meterCo2: !!document.getElementById('onbCompCo2')?.checked,
    meterPpfd: !!document.getElementById('onbCompPpfd')?.checked,
    enclosureType,
    greenhouseReflectiveInterior: !!document.getElementById('onbGhReflective')?.checked,
    greenhouseAerationControl: !!document.getElementById('onbGhAeration')?.checked,
    greenhouseHumidityControl: !!document.getElementById('onbGhHumidity')?.checked,
    greenhouseLedMode: ledMode,
    greenhouseLedPowerW: ledMode !== 'none' && Number.isFinite(ledPowerRaw) ? Math.max(20, Math.min(3000, ledPowerRaw)) : null,
    enclosureVolumeM3: parseEnclosureVolumeM3Input('onbEnclosureVolumeM3'),
  };
  if (typeof sanitizeHardwareComplementsForContext === 'function') {
    return sanitizeHardwareComplementsForContext(placement, enclosureType, raw);
  }
  return raw;
}

function toggleOnbHeaterSetpoint(checked) {
  const w = document.getElementById('onbHeaterSetpointWrap');
  const inp = document.getElementById('onbCompHeaterSetC');
  if (w) w.style.opacity = checked ? '1' : '0.55';
  if (inp) inp.disabled = !checked;
}

function toggleCfgHeaterSetpoint(checked) {
  const w = document.getElementById('cfgHeaterSetpointWrap');
  const inp = document.getElementById('cfgCompHeaterSetC');
  if (w) w.style.opacity = checked ? '1' : '0.55';
  if (inp) inp.disabled = !checked;
}

function readCfgHardwareComplements() {
  const heater = !!document.getElementById('cfgCompHeater')?.checked;
  const setRaw = parseFloat(document.getElementById('cfgCompHeaterSetC')?.value);
  const ledMode =
    document.getElementById('cfgGhLedMode')?.value && ['none', 'full', 'veg_bloom', 'supplement'].includes(document.getElementById('cfgGhLedMode')?.value)
      ? document.getElementById('cfgGhLedMode')?.value
      : 'none';
  const ledPowerRaw = parseFloat(document.getElementById('cfgGhLedPowerW')?.value);
  const encSel = document.getElementById('cfgGrowEnclosure')?.value;
  let enclosureType = ['cabinet', 'greenhouse', 'open_room', 'outdoor'].includes(encSel) ? encSel : 'cabinet';
  if (document.getElementById('cfgGrowPlacement')?.value === 'exterior') enclosureType = 'outdoor';
  const placement = document.getElementById('cfgGrowPlacement')?.value === 'exterior' ? 'exterior' : 'interior';
  const raw = {
    reservoirHeater: heater,
    heaterThermostatC: heater && Number.isFinite(setRaw) ? Math.min(35, Math.max(15, setRaw)) : null,
    meterPhEc: !!document.getElementById('cfgCompPhEc')?.checked,
    meterWaterTemp: !!document.getElementById('cfgCompWaterTemp')?.checked,
    meterThermoHygro: !!document.getElementById('cfgCompThermoHygro')?.checked,
    meterCo2: !!document.getElementById('cfgCompCo2')?.checked,
    meterPpfd: !!document.getElementById('cfgCompPpfd')?.checked,
    enclosureType,
    greenhouseReflectiveInterior: !!document.getElementById('cfgGhReflective')?.checked,
    greenhouseAerationControl: !!document.getElementById('cfgGhAeration')?.checked,
    greenhouseHumidityControl: !!document.getElementById('cfgGhHumidity')?.checked,
    greenhouseLedMode: ledMode,
    greenhouseLedPowerW: ledMode !== 'none' && Number.isFinite(ledPowerRaw) ? Math.max(20, Math.min(3000, ledPowerRaw)) : null,
    enclosureVolumeM3: parseEnclosureVolumeM3Input('cfgEnclosureVolumeM3'),
  };
  if (typeof sanitizeHardwareComplementsForContext === 'function') {
    return sanitizeHardwareComplementsForContext(placement, enclosureType, raw);
  }
  return raw;
}

function saveGrowHardwareComplements() {
  if (!myGrow) return;
  myGrow.hardwareComplements =
    typeof normalizeHardwareComplements === 'function'
      ? normalizeHardwareComplements(readCfgHardwareComplements())
      : readCfgHardwareComplements();
  if (myGrow.systemSizing && typeof refreshVentilationInSizingResult === 'function') {
    myGrow.systemSizing = refreshVentilationInSizingResult(myGrow.systemSizing, myGrow.hardwareComplements);
  }
  saveGrowState();
  renderActiveGrow();
  if (typeof renderMonitor === 'function') renderMonitor();
  if (typeof renderHistorial === 'function') renderHistorial();
}

function saveRdwcDiagramStyleFromUi() {
  if (!myGrow || myGrow.system !== 'RDWC') return;
  if (!myGrow.systemHardware || typeof myGrow.systemHardware !== 'object') myGrow.systemHardware = {};
  myGrow.systemHardware.rdwcDiagramStyle =
    document.getElementById('cfgRdwcDiagram')?.value === 'rear_kit' ? 'rear_kit' : 'side';
  saveGrowState();
  renderActiveGrow();
}

function saveGrowSiteCountFromUi() {
  if (!myGrow || myGrow.system !== 'RDWC') return;
  const raw = parseInt(document.getElementById('cfgGrowSites')?.value, 10);
  const n = Math.min(MAX_HYDRO_SITE_COUNT, Math.max(1, Number.isFinite(raw) ? raw : 1));
  myGrow.plants = n;
  if (!myGrow.systemHardware || typeof myGrow.systemHardware !== 'object') myGrow.systemHardware = {};
  myGrow.systemHardware.sites = n;
  if (Number.isFinite(myGrow.selectedPlant) && myGrow.selectedPlant > n) myGrow.selectedPlant = n;
  saveGrowState();
  renderActiveGrow();
  if (typeof renderMonitor === 'function') renderMonitor();
  if (typeof renderHistorial === 'function') renderHistorial();
  if (typeof renderInicio === 'function') renderInicio();
}

function renderSystemSvg(grow, strain, weekNum, phaseName) {
  const plantCount = getConfiguredSiteCount(grow);
  if (grow.system === 'RDWC') return renderRdwcSvg(grow, strain, plantCount, weekNum, phaseName);
  if (grow.system === 'FLOAT') return renderFloatSvg(grow, strain, plantCount, weekNum, phaseName);
  if (grow.system === 'NFT') return renderNftSvg(grow, strain, plantCount, weekNum, phaseName);
  if (grow.system === 'AERO') return renderAeroSvg(grow, strain, plantCount, weekNum, phaseName);
  return renderDwcSvg(grow, strain, plantCount, weekNum, phaseName);
}

/** Rejilla de centros (cenital) para agujeros en balsa / tapa. */
function layoutHoleCentersInRect(n, left, top, w, h, pad) {
  if (n <= 0) return [];
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const iw = Math.max(1, w - 2 * pad);
  const ih = Math.max(1, h - 2 * pad);
  const out = [];
  let k = 0;
  for (let r = 0; r < rows && k < n; r++) {
    for (let c = 0; c < cols && k < n; c++, k++) {
      out.push({
        x: left + pad + (c + 0.5) * (iw / cols),
        y: top + pad + (r + 0.5) * (ih / rows),
      });
    }
  }
  return out;
}

/** RDWC patrón tipo kit comercial: cuadrícula de cubos + depósito de control al fondo (vista cenital) y tubo perimetral. */
function renderRdwcSvgRearKit(grow, strain, plantCount, weekNum, phaseName) {
  const perRow = Math.ceil(plantCount / 2);
  const bottomCount = plantCount - perRow;
  const maxCols = Math.max(perRow, bottomCount, 1);
  const nodeSpacing =
    maxCols <= 1 ? 80 : Math.min(88, Math.max(26, Math.floor(600 / (maxCols - 1))));
  const gridW = (maxCols - 1) * nodeSpacing;
  const startX = 95 + Math.max(0, (620 - gridW) / 2);
  const southOffset = perRow > bottomCount ? ((perRow - bottomCount) * nodeSpacing) / 2 : 0;
  const northY = 178;
  const southY = 272;
  const nodes = [];
  for (let i = 0; i < plantCount; i++) {
    const row = i < perRow ? 0 : 1;
    const col = row === 0 ? i : i - perRow;
    const x = row === 0 ? startX + col * nodeSpacing : startX + southOffset + col * nodeSpacing;
    const y = row === 0 ? northY : southY;
    nodes.push({ x, y, label: `P${i + 1}`, index: i + 1 });
  }
  const leftN = startX;
  const rightN = startX + (perRow - 1) * nodeSpacing;
  const midX = (leftN + rightN) / 2;
  const leftS = startX + southOffset;
  const rightS = startX + southOffset + Math.max(0, bottomCount - 1) * nodeSpacing;
  const midS = bottomCount > 0 ? (leftS + rightS) / 2 : midX;
  const resW = 108;
  const resH = 74;
  const resX = midX - resW / 2;
  const resY = 62;
  const resBottom = resY + resH;
  const pipes = [];
  if (perRow > 1) {
    pipes.push(`<line x1="${leftN - 22}" y1="${northY}" x2="${rightN + 22}" y2="${northY}" class="pipe" />`);
  }
  if (bottomCount > 1) {
    pipes.push(`<line x1="${leftS - 22}" y1="${southY}" x2="${rightS + 22}" y2="${southY}" class="pipe" />`);
  }
  const leftRail = Math.min(leftN, bottomCount > 0 ? leftS : leftN) - 28;
  const rightRail = Math.max(rightN, bottomCount > 0 ? rightS : rightN) + 28;
  if (bottomCount > 0) {
    pipes.push(`<line x1="${leftRail}" y1="${northY + 18}" x2="${leftRail}" y2="${southY - 18}" class="pipe" />`);
    pipes.push(`<line x1="${rightRail}" y1="${northY + 18}" x2="${rightRail}" y2="${southY - 18}" class="pipe" />`);
  }
  pipes.push(
    `<line x1="${midX}" y1="${resBottom}" x2="${midX}" y2="${northY - 26}" class="pipe flow" marker-end="url(#arrowBlue)"></line>`,
  );
  const cultivar = strain.name.split(' ').slice(0, 2).join(' ');
  const frontInline =
    bottomCount > 0
      ? `<g>
        <rect x="${midS - 26}" y="${southY + 26}" width="52" height="20" rx="5" class="pump"></rect>
        <text x="${midS}" y="${southY + 40}" class="pump-label" text-anchor="middle">BOMBA / VÁLV.</text>
      </g>`
      : '';
  return `
    <svg viewBox="0 0 860 360" preserveAspectRatio="xMidYMid meet" class="system-svg system-svg--rdwc-kit" role="img" aria-label="Diagrama cenital RDWC tipo kit comercial">
      <defs>
        <marker id="arrowBlue" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#3490dc"></path>
        </marker>
      </defs>
      <rect x="12" y="12" width="836" height="336" rx="14" class="svg-bg"></rect>
      <text x="28" y="38" class="svg-title">RDWC · Patrón kit (depósito trasero)</text>
      <text x="28" y="58" class="svg-sub">Semana ${weekNum} · ${phaseName} · ${cultivar} · ${plantCount} cubo(s) · Referencia tipo circuito cerrado con control al fondo</text>

      ${pipes.join('')}

      <g>
        <rect x="${resX}" y="${resY}" width="${resW}" height="${resH}" rx="11" class="reservoir"></rect>
        <text x="${midX}" y="${resY + 42}" class="reservoir-label" text-anchor="middle">DEPÓSITO</text>
        <text x="${midX}" y="${resY + 60}" class="reservoir-sub" text-anchor="middle">${grow.reservoirL || 60} L</text>
      </g>

      ${nodes
        .map((node) => {
          const slotLabel = getCultivarShortLabelForSlot(grow, node.index);
          return `
        <g class="plant-node" data-plant="${node.index}">
          <g class="plant-node-hit" onclick="selectPlantInDiagram(${node.index})">
            <rect x="${node.x - 24}" y="${node.y - 24}" width="48" height="48" rx="8" class="bucket ${grow.selectedPlant === node.index ? 'bucket-selected' : ''}"></rect>
            <circle cx="${node.x}" cy="${node.y}" r="11" class="netpot"></circle>
            <text x="${node.x}" y="${node.y + 4}" class="bucket-label">${node.label}</text>
            <text x="${node.x}" y="${node.y + 35}" class="cultivar-label">${slotLabel}</text>
          </g>
          ${renderPlantSiteMarker(node, grow, weekNum, -38)}
        </g>`;
        })
        .join('')}

      ${frontInline}
    </svg>
  `;
}

function renderRdwcSvgSide(grow, strain, plantCount, weekNum, phaseName) {
  const perRow = Math.ceil(plantCount / 2);
  const bottomCount = plantCount - perRow;
  const maxCols = Math.max(perRow, bottomCount, 1);
  const nodeSpacing =
    maxCols <= 1 ? 80 : Math.min(86, Math.max(26, Math.floor(600 / (maxCols - 1))));
  const gridW = (maxCols - 1) * nodeSpacing;
  const startX = 56 + Math.max(0, (620 - gridW) / 2);
  const southOffset = perRow > bottomCount ? ((perRow - bottomCount) * nodeSpacing) / 2 : 0;
  const topY = 95;
  const bottomY = 235;
  const nodes = [];
  for (let i = 0; i < plantCount; i++) {
    const row = i < perRow ? 0 : 1;
    const col = row === 0 ? i : i - perRow;
    const x = row === 0 ? startX + col * nodeSpacing : startX + southOffset + col * nodeSpacing;
    const y = row === 0 ? topY : bottomY;
    nodes.push({ x, y, label: `P${i + 1}`, index: i + 1 });
  }

  const leftT = startX;
  const rightT = startX + (perRow - 1) * nodeSpacing;
  const leftB = startX + southOffset;
  const rightB = startX + southOffset + Math.max(0, bottomCount - 1) * nodeSpacing;
  const leftRail = Math.min(leftT, bottomCount > 0 ? leftB : leftT) - 28;
  const rightRail = Math.max(rightT, bottomCount > 0 ? rightB : rightT) + 28;

  const pipes = [];
  for (let i = 0; i < perRow - 1; i++) {
    const x1 = startX + i * nodeSpacing + 24;
    const x2 = startX + (i + 1) * nodeSpacing - 24;
    pipes.push(`<line x1="${x1}" y1="${topY}" x2="${x2}" y2="${topY}" class="pipe" />`);
  }
  for (let i = 0; i < Math.max(0, bottomCount - 1); i++) {
    const x1 = startX + southOffset + i * nodeSpacing + 24;
    const x2 = startX + southOffset + (i + 1) * nodeSpacing - 24;
    pipes.push(`<line x1="${x1}" y1="${bottomY}" x2="${x2}" y2="${bottomY}" class="pipe" />`);
  }
  if (bottomCount > 0) {
    pipes.push(`<line x1="${leftRail}" y1="${topY + 24}" x2="${leftRail}" y2="${bottomY - 24}" class="pipe" />`);
    pipes.push(`<line x1="${rightRail}" y1="${topY + 24}" x2="${rightRail}" y2="${bottomY - 24}" class="pipe" />`);
  }

  const reservoirX = rightRail + 32;
  const cultivar = strain.name.split(' ').slice(0, 2).join(' ');
  return `
    <svg viewBox="0 0 860 360" preserveAspectRatio="xMidYMid meet" class="system-svg" role="img" aria-label="Diagrama cenital RDWC">
      <defs>
        <marker id="arrowBlue" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#3490dc"></path>
        </marker>
      </defs>
      <rect x="12" y="12" width="836" height="336" rx="14" class="svg-bg"></rect>
      <text x="28" y="38" class="svg-title">RDWC · Circuito recirculante cenital</text>
      <text x="28" y="58" class="svg-sub">Semana ${weekNum} · ${phaseName} · Cultivar ${cultivar} · ${plantCount} cubo(s)</text>

      ${pipes.join('')}
      <line x1="${reservoirX - 15}" y1="${topY}" x2="${reservoirX - 15}" y2="${bottomY}" class="pipe flow" marker-end="url(#arrowBlue)" />

      ${nodes.map(node=>{
        const slotLabel = getCultivarShortLabelForSlot(grow, node.index);
        return `
        <g class="plant-node" data-plant="${node.index}">
          <g class="plant-node-hit" onclick="selectPlantInDiagram(${node.index})">
            <rect x="${node.x-24}" y="${node.y-24}" width="48" height="48" rx="8" class="bucket ${grow.selectedPlant===node.index?'bucket-selected':''}"></rect>
            <circle cx="${node.x}" cy="${node.y}" r="11" class="netpot"></circle>
            <text x="${node.x}" y="${node.y+4}" class="bucket-label">${node.label}</text>
            <text x="${node.x}" y="${node.y+35}" class="cultivar-label">${slotLabel}</text>
          </g>
          ${renderPlantSiteMarker(node, grow, weekNum, -38)}
        </g>`;
      }).join('')}

      <g>
        <rect x="${reservoirX}" y="140" width="90" height="110" rx="10" class="reservoir"></rect>
        <text x="${reservoirX+45}" y="188" class="reservoir-label">DEPÓSITO</text>
        <text x="${reservoirX+45}" y="218" class="reservoir-sub">${grow.reservoirL || 60} L</text>
      </g>

      <g>
        <rect x="${reservoirX+112}" y="182" width="48" height="28" rx="6" class="pump"></rect>
        <text x="${reservoirX+136}" y="200" class="pump-label">BOMBA</text>
      </g>
    </svg>
  `;
}

function renderRdwcSvg(grow, strain, plantCount, weekNum, phaseName) {
  if (grow.systemHardware?.rdwcDiagramStyle === 'rear_kit') {
    return renderRdwcSvgRearKit(grow, strain, plantCount, weekNum, phaseName);
  }
  return renderRdwcSvgSide(grow, strain, plantCount, weekNum, phaseName);
}

function renderDwcSvg(grow, strain, plantCount, weekNum, phaseName) {
  const cultivar = strain.name.split(' ').slice(0, 2).join(' ');
  const hw = grow.systemHardware || {};
  const bucketCm = Math.min(120, Math.max(15, parseFloat(hw.dwcBucketTopDiameterCm) || 35));
  const holeCm = Math.min(50, Math.max(5, parseFloat(hw.dwcLidHoleDiameterCm) || 20));
  const ratio = holeCm / Math.max(1, bucketCm);
  const dout = Math.min(58, Math.max(26, bucketCm * 0.82 + 10));
  const rout = dout / 2;
  const rhole = Math.min(rout - 3, Math.max(6, (dout * Math.min(0.98, ratio)) / 2));
  const perRow = Math.ceil(plantCount / 2);
  const bottomCount = plantCount - perRow;
  const maxCols = Math.max(perRow, bottomCount, 1);
  const nodeSpacing =
    maxCols <= 1 ? 92 : Math.min(98, Math.max(rout * 2 + 14, Math.floor(640 / (maxCols - 1))));
  const gridW = (maxCols - 1) * nodeSpacing;
  const startX = 72 + Math.max(0, (716 - gridW) / 2);
  const southOffset = perRow > bottomCount ? ((perRow - bottomCount) * nodeSpacing) / 2 : 0;
  const northY = 176;
  const southY = 268;
  const nodes = [];
  for (let i = 0; i < plantCount; i++) {
    const row = i < perRow ? 0 : 1;
    const col = row === 0 ? i : i - perRow;
    const x = row === 0 ? startX + col * nodeSpacing : startX + southOffset + col * nodeSpacing;
    const y = row === 0 ? northY : southY;
    nodes.push({ x, y, label: `P${i + 1}`, index: i + 1 });
  }
  const markerOff = -Math.round(rout + 22);
  return `
    <svg viewBox="0 0 860 360" preserveAspectRatio="xMidYMid meet" class="system-svg system-svg--dwc-lids" role="img" aria-label="Diagrama DWC · tapas cenitales con huecos para cesta">
      <rect x="12" y="12" width="836" height="336" rx="14" class="svg-bg"></rect>
      <text x="28" y="38" class="svg-title">DWC · Tapas cenitales (cestas / aireador)</text>
      <text x="28" y="58" class="svg-sub">Semana ${weekNum} · ${phaseName} · ${cultivar} · Tapa Ø ~${bucketCm} cm · hueco Ø ~${holeCm} cm · ${plantCount} sitio(s)</text>

      <text x="28" y="78" class="svg-geom-caption">Vista superior: anillo = tapa; centro = perforación para redonda. Depósito total orientativo: ${grow.reservoirL || 60} L.</text>

      ${nodes
        .map((node) => {
          const idx = node.index;
          const slotLabel = getCultivarShortLabelForSlot(grow, idx);
          const sel = grow.selectedPlant === idx ? ' dwc-lid-ring--selected' : '';
          return `
        <g class="plant-node" data-plant="${idx}">
          <g class="plant-node-hit" onclick="selectPlantInDiagram(${idx})">
            <circle cx="${node.x}" cy="${node.y}" r="${rout + 10}" fill="transparent"></circle>
            <circle cx="${node.x}" cy="${node.y}" r="${rout}" class="dwc-lid-ring${sel}"></circle>
            <circle cx="${node.x}" cy="${node.y}" r="${rhole}" class="dwc-lid-hole"></circle>
            <text x="${node.x}" y="${node.y + 4}" class="bucket-label">${node.label}</text>
            <text x="${node.x}" y="${node.y + rout + 14}" class="cultivar-label">${slotLabel}</text>
          </g>
          ${renderPlantSiteMarker(node, grow, weekNum, markerOff)}
        </g>`;
        })
        .join('')}

      <g>
        <rect x="698" y="248" width="66" height="44" rx="8" class="pump"></rect>
        <line x1="698" y1="270" x2="${Math.min(650, nodes[0] ? nodes[0].x + rout + 8 : 650)}" y2="270" class="pipe flow"></line>
        <text x="731" y="275" class="pump-label">AIRE</text>
      </g>
    </svg>
  `;
}

function renderFloatSvg(grow, strain, plantCount, weekNum, phaseName) {
  const cultivar = strain.name.split(' ').slice(0, 2).join(' ');
  const hw = grow.systemHardware || {};
  const L = Math.min(500, Math.max(40, parseFloat(hw.floatTankLengthCm) || 120));
  const W = Math.min(500, Math.max(40, parseFloat(hw.floatTankWidthCm) || 80));
  const dHoleCm = Math.min(40, Math.max(5, parseFloat(hw.floatRaftHoleDiameterCm) || 20));
  const raftMm = Math.min(120, Math.max(10, parseFloat(hw.floatRaftThicknessMm) || 30));
  const raftCm = raftMm / 10;
  const fs = grow.systemSizing?.floatGeometrySummary;
  const basketD = parseFloat(hw.floatNetPotBelowRaftCm) || 8;
  const subst = parseFloat(hw.floatSubstrateColumnCm) || 5;
  const subBelow =
    fs && Number.isFinite(fs.substrateBelowRaftCm)
      ? fs.substrateBelowRaftCm
      : Math.round(Math.max(0, basketD - subst) * 10) / 10;
  const raftThCmDisp = fs && Number.isFinite(fs.raftThicknessCm) ? fs.raftThicknessCm : Math.round(raftCm * 10) / 10;

  const maxTW = 600;
  const maxTH = 210;
  const scale = Math.min(maxTW / L, maxTH / W);
  const tankW = L * scale;
  const tankH = W * scale;
  const cx = 400;
  const cy = 200;
  const tx = cx - tankW / 2;
  const ty = cy - tankH / 2;
  const inset = 16;
  const ix = tx + inset;
  const iy = ty + inset;
  const innerW = tankW - 2 * inset;
  const innerH = tankH - 2 * inset;
  const airTop = 0.07;
  const waterTopY = iy + innerH * airTop;
  const waterH = innerH * (1 - airTop - 0.05);
  const raftDrawH = Math.max(12, Math.min(28, raftCm * scale * 0.95));
  const waterSurfaceY = waterTopY + waterH * 0.04;
  const raftY = waterSurfaceY - raftDrawH;
  const padHole = Math.max(8, (dHoleCm / 2) * scale * 0.85);
  const holeR = Math.max(4.5, (dHoleCm / 2) * scale);
  const centers = layoutHoleCentersInRect(plantCount, ix, raftY, innerW, raftDrawH, padHole);

  const holeEls = centers
    .map((p, i) => `<circle cx="${p.x}" cy="${p.y}" r="${holeR}" class="float-raft-hole"></circle>`)
    .join('');
  const plantEls = centers
    .map((p, i) => {
      const idx = i + 1;
      const node = { x: p.x, y: p.y, index: idx };
      const slotLabel = getCultivarShortLabelForSlot(grow, idx);
      const hitR = Math.max(holeR + 6, 14);
      return `
        <g class="plant-node" data-plant="${idx}">
          <g class="plant-node-hit" onclick="selectPlantInDiagram(${idx})">
            <circle cx="${p.x}" cy="${p.y}" r="${hitR}" fill="transparent"></circle>
            <text x="${p.x}" y="${p.y + 4}" class="bucket-label">P${idx}</text>
            <text x="${p.x}" y="${p.y - holeR - 8}" class="cultivar-label">${slotLabel}</text>
          </g>
          ${renderPlantSiteMarker(node, grow, weekNum, -Math.round(holeR + 28))}
        </g>`;
    })
    .join('');

  return `
    <svg viewBox="0 0 860 360" preserveAspectRatio="xMidYMid meet" class="system-svg system-svg--float" role="img" aria-label="Diagrama mesa flotante · recipiente y balsa">
      <rect x="12" y="12" width="836" height="336" rx="14" class="svg-bg"></rect>
      <text x="28" y="38" class="svg-title">Mesa flotante · recipiente y losa</text>
      <text x="28" y="58" class="svg-sub">Semana ${weekNum} · ${phaseName} · ${cultivar} · ~${L}×${W} cm útil · Ø hueco ~${dHoleCm} cm · ${plantCount} sitio(s)</text>

      <text x="28" y="78" class="svg-geom-caption">Lámina de agua al ras de la cara inferior de la balsa (modelo simplificado). Base del sustrato ~${subBelow} cm por debajo de esa cara · espesor losa ~${raftThCmDisp} cm.</text>

      <g class="float-tank-group">
        <rect x="${tx}" y="${ty}" width="${tankW}" height="${tankH}" rx="12" class="float-tank-shell"></rect>
        <rect x="${ix}" y="${waterTopY}" width="${innerW}" height="${waterH}" rx="8" class="float-water"></rect>
        <rect x="${ix}" y="${raftY}" width="${innerW}" height="${raftDrawH}" rx="4" class="float-raft"></rect>
        ${holeEls}
      </g>

      ${plantEls}

      <g>
        <rect x="698" y="248" width="66" height="44" rx="8" class="pump"></rect>
        <line x1="698" y1="270" x2="${ix + innerW - 8}" y2="${iy + innerH * 0.5}" class="pipe flow"></line>
        <text x="731" y="275" class="pump-label">AIRE</text>
      </g>
    </svg>
  `;
}

function renderNftSvg(grow, strain, plantCount, weekNum, phaseName) {
  const cultivar = strain.name.split(' ').slice(0, 2).join(' ');
  const maxV = Math.max(1, Math.min(8, plantCount));
  const canalY = 158;
  const basketY = 128;
  const span = 560;
  const startXN = 120;
  const gap = maxV <= 1 ? 0 : span / (maxV - 1);
  const sites = [];
  for (let i = 0; i < maxV; i++) {
    const x = maxV === 1 ? 400 : startXN + i * gap;
    sites.push({ x, y: basketY, index: i + 1 });
  }
  return `
    <svg viewBox="0 0 860 360" preserveAspectRatio="xMidYMid meet" class="system-svg" role="img" aria-label="Diagrama NFT">
      <rect x="12" y="12" width="836" height="336" rx="14" class="svg-bg"></rect>
      <text x="28" y="38" class="svg-title">NFT · Película de nutriente</text>
      <text x="28" y="58" class="svg-sub">Semana ${weekNum} · ${phaseName} · ${cultivar}</text>
      <rect x="80" y="140" width="620" height="36" rx="8" class="water"></rect>
      <line x1="100" y1="${canalY}" x2="760" y2="${canalY}" class="pipe flow"></line>
      <rect x="720" y="120" width="100" height="70" rx="10" class="reservoir"></rect>
      <text x="770" y="152" class="reservoir-label" text-anchor="middle">DEPÓSITO</text>
      <text x="770" y="176" class="reservoir-sub" text-anchor="middle">${grow.reservoirL || 60} L</text>
      ${sites
        .map((node) => {
          const slotLabel = getCultivarShortLabelForSlot(grow, node.index);
          return `
        <g class="plant-node" data-plant="${node.index}">
          <g class="plant-node-hit" onclick="selectPlantInDiagram(${node.index})">
            <rect x="${node.x - 18}" y="${node.y - 8}" width="36" height="24" rx="6" class="netpot ${grow.selectedPlant === node.index ? 'bucket-selected' : ''}"></rect>
            <text x="${node.x}" y="${node.y + 36}" class="bucket-label">P${node.index}</text>
            <text x="${node.x}" y="${node.y + 52}" class="cultivar-label">${slotLabel}</text>
            <line x1="${node.x}" y1="${node.y + 18}" x2="${node.x}" y2="168" class="root-line"></line>
          </g>
          ${renderPlantSiteMarker(node, grow, weekNum, -34)}
        </g>`;
        })
        .join('')}
      <text x="400" y="255" class="cultivar-label">Icono: germinado o material de proveedor — pulsa la planta para la ficha del sitio.</text>
    </svg>
  `;
}

function renderAeroSvg(grow, strain, plantCount, weekNum, phaseName) {
  const cultivar = strain.name.split(' ').slice(0, 2).join(' ');
  const maxV = Math.max(1, Math.min(6, plantCount));
  const lidY = 102;
  const chamberX = 200;
  const chamberW = 420;
  const sites = [];
  for (let i = 0; i < maxV; i++) {
    const x = chamberX + ((i + 1) / (maxV + 1)) * chamberW;
    sites.push({ x, y: lidY, index: i + 1 });
  }
  return `
    <svg viewBox="0 0 860 360" preserveAspectRatio="xMidYMid meet" class="system-svg" role="img" aria-label="Diagrama aeroponía">
      <rect x="12" y="12" width="836" height="336" rx="14" class="svg-bg"></rect>
      <text x="28" y="38" class="svg-title">Aeroponía · Raíces en cámara</text>
      <text x="28" y="58" class="svg-sub">Semana ${weekNum} · ${phaseName} · ${cultivar}</text>
      <rect x="200" y="110" width="420" height="160" rx="16" class="reservoir"></rect>
      <rect x="200" y="102" width="420" height="14" rx="4" class="aero-lid"></rect>
      <text x="410" y="200" class="reservoir-label">CÁMARA OSCURA</text>
      ${sites
        .map((node) => {
          const slotLabel = getCultivarShortLabelForSlot(grow, node.index);
          return `
        <g class="plant-node" data-plant="${node.index}">
          <g class="plant-node-hit" onclick="selectPlantInDiagram(${node.index})">
            <circle cx="${node.x}" cy="${node.y + 8}" r="16" class="netpot ${grow.selectedPlant === node.index ? 'bucket-selected' : ''}"></circle>
            <text x="${node.x}" y="${node.y + 52}" class="bucket-label">P${node.index}</text>
            <text x="${node.x}" y="${node.y + 68}" class="cultivar-label">${slotLabel}</text>
          </g>
          ${renderPlantSiteMarker({ x: node.x, y: node.y + 2 }, grow, weekNum, -36)}
        </g>`;
        })
        .join('')}
      <text x="410" y="288" class="reservoir-sub">Reserva / mezcla · ${grow.reservoirL || 60} L</text>
    </svg>
  `;
}

function selectPlantInDiagram(index) {
  if (!myGrow) return;
  const maxPlants = getConfiguredSiteCount(myGrow);
  myGrow.selectedPlant = Math.max(1, Math.min(maxPlants, index));
  saveGrowState();
  renderActiveGrow();
  if (typeof renderHistorial === 'function') renderHistorial();
}

/** Resumen bajo el esquema: todas las plantas / circuito y últimas lecturas por sitio. */
function renderAllPlantsSystemSummaryHtml(grow, strain, phaseName) {
  if (!grow || !strain) return '';
  const n = getConfiguredSiteCount(grow);
  const yieldIn = parseInt(strain.yieldIn, 10);
  const totalYield = Math.round(grow.m2 * (Number.isFinite(yieldIn) ? yieldIn : 0) * 0.85);
  const perPlant = n > 0 ? Math.round(totalYield / n) : 0;
  const esc = escapeHtmlText;
  if (isRdwcSharedSolution(grow)) {
    const latest = getLatestMeasurementForPlant(grow, 1);
    const ph = latest && Number.isFinite(latest.ph) ? latest.ph.toFixed(1) : '—';
    const ec = latest && Number.isFinite(latest.ec) ? latest.ec.toFixed(2) : '—';
    return `
      <p class="form-hint plant-system-summary-lead">RDWC: <strong>${n}</strong> sitio(s), <strong>solución común</strong>. Última medición de circuito (Medir): pH <strong>${ph}</strong> · EC <strong>${ec}</strong> mS/cm.</p>
      <div class="param-row"><span class="param-key">Fase</span><span class="param-val">${esc(phaseName)}</span></div>
      <div class="param-row"><span class="param-key">Cultivar de referencia</span><span class="param-val">${esc(strain.name)}</span></div>
      <div class="param-row"><span class="param-key">Rendimiento orientativo / sitio</span><span class="param-val c-amber">~${perPlant} g</span></div>`;
  }
  const blocks = [];
  for (let i = 1; i <= n; i++) {
    const slotStrain = getStrainForPlantSlot(grow, i);
    const latest = getLatestMeasurementForPlant(grow, i);
    const ph = latest && Number.isFinite(latest.ph) ? latest.ph.toFixed(1) : '—';
    const ec = latest && Number.isFinite(latest.ec) ? latest.ec.toFixed(2) : '—';
    const nameShort = esc((slotStrain.name || '').split(' ').slice(0, 2).join(' ') || slotStrain.name);
    blocks.push(
      `<div class="plant-system-summary-row"><span class="plant-system-summary-pid"><strong>P${i}</strong></span><span class="plant-system-summary-name">${nameShort}</span><span class="plant-system-summary-meas text-muted">pH ${ph} · EC ${ec}</span></div>`,
    );
  }
  return `
    <p class="form-hint plant-system-summary-lead"><strong>${n}</strong> planta(s). Última lectura por sitio (Medir).</p>
    <div class="plant-system-summary-list">${blocks.join('')}</div>
    <div class="param-row"><span class="param-key">Fase</span><span class="param-val">${esc(phaseName)}</span></div>
    <div class="param-row"><span class="param-key">Rendimiento total estimado</span><span class="param-val c-amber">${totalYield} g</span> <span class="text-muted">(~${perPlant} g/planta)</span></div>`;
}

function getPlantCount(grow) {
  return getConfiguredSiteCount(grow);
}

function isRdwcSharedSolution(grow) {
  return grow && grow.system === 'RDWC';
}

function measurementSiteLabel(grow, m) {
  if (isRdwcSharedSolution(grow)) return 'Circuito';
  const pid = Number.isFinite(m.plantId) ? m.plantId : 1;
  return `P${pid}`;
}

function getMeasurementsByPlant(grow, plantId) {
  const list = Array.isArray(grow?.measurements)
    ? grow.measurements.filter((m) => measurementBelongsToActiveInstallation(grow, m))
    : [];
  if (isRdwcSharedSolution(grow)) {
    return [...list].sort((a, b) => new Date(b.date) - new Date(a.date));
  }
  return list.filter((m) => (m.plantId ?? 1) === plantId);
}

function getLatestMeasurementForPlant(grow, plantId) {
  const list = getMeasurementsByPlant(grow, plantId);
  return list.length ? list[0] : null;
}

function ensurePlantProfiles(grow) {
  if (!grow) return;
  if (!grow.plantProfiles || typeof grow.plantProfiles !== 'object') grow.plantProfiles = {};
  const n = getPlantCount(grow);
  for (let i = 1; i <= n; i++) {
    const k = String(i);
    if (!grow.plantProfiles[k]) grow.plantProfiles[k] = {};
  }
}

function getPlantSlotProfile(grow, index) {
  ensurePlantProfiles(grow);
  return grow.plantProfiles[String(index)] || {};
}

function plantSlotHasCustomCrop(grow, index) {
  const p = getPlantSlotProfile(grow, index);
  if (!p || typeof p !== 'object') return false;
  if (p.strainId && p.strainId !== grow.strain?.id) return true;
  if ((p.nickname || '').trim()) return true;
  if ((p.origin || '').trim()) return true;
  if (Number.isFinite(p.ageDays) && p.ageDays !== (grow.ageDays ?? 0)) return true;
  return false;
}

function getStrainForPlantSlot(grow, index) {
  const p = getPlantSlotProfile(grow, index);
  if (p.strainId) {
    const found = strains.find((s) => s.id === p.strainId);
    if (found) return found;
  }
  return grow.strain;
}

function getCultivarShortLabelForSlot(grow, index) {
  const s = getStrainForPlantSlot(grow, index);
  return s.name.split(' ').slice(0, 2).join(' ');
}

function getEffectivePlantAgeDays(grow, index) {
  const p = getPlantSlotProfile(grow, index);
  if (Number.isFinite(p.ageDays)) return p.ageDays;
  const daysSince = Math.floor((new Date() - grow.startDate) / 86400000);
  return Number.isFinite(grow.ageDays) ? grow.ageDays : daysSince;
}

/** Icono SVG nativo (plántula recién germinada / esqueje o planta establecida). */
function renderPlantSiteMarkerSvgInner(isYoung) {
  if (isYoung) {
    return `
      <line x1="0" y1="10" x2="0" y2="22" class="plant-marker-stem"/>
      <ellipse cx="-7" cy="6" rx="5" ry="8" transform="rotate(-25 -7 6)" class="plant-marker-cotyl plant-marker-cotyl--l"/>
      <ellipse cx="7" cy="6" rx="5" ry="8" transform="rotate(25 7 6)" class="plant-marker-cotyl plant-marker-cotyl--r"/>
      <circle cx="0" cy="-2" r="3" class="plant-marker-meristem"/>`;
  }
  return `
    <path class="plant-marker-cannabis" d="M0,-22 C-16,-10 -14,8 -2,14 C-6,6 -8,-4 -2,-12 C-4,-2 -2,4 0,14 C2,4 4,-2 2,-12 C8,-4 6,6 2,14 C14,8 16,-10 0,-22 Z"/>
    <path class="plant-marker-cannabis-accent" d="M0,-18 Q6,-8 4,6 Q0,-2 0,12 Q-4,-2 -4,6 Q-6,-8 0,-18" fill="none"/>
    <line x1="0" y1="12" x2="0" y2="22" class="plant-marker-stem"/>`;
}

/**
 * Marcador gráfico en cada cubo / cesta / sitio (germinado, esqueje de proveedor, etc.).
 * Clic abre la ficha del sitio; no interferir con la selección del cubo (plant-node-hit).
 */
function renderPlantSiteMarker(node, grow, weekNum, yOffset = -40) {
  const custom = plantSlotHasCustomCrop(grow, node.index);
  const age = getEffectivePlantAgeDays(grow, node.index);
  const isYoung = weekNum <= 1 || age < 18;
  const cls = `plant-site-marker${custom ? ' plant-site-marker--custom' : ''}${isYoung ? ' plant-site-marker--young' : ''}`;
  const labelHint = isYoung ? 'Plántula / recién en cultivo hidropónico' : 'Planta en sitio';
  const inner = renderPlantSiteMarkerSvgInner(isYoung);
  return `
    <g transform="translate(${node.x},${node.y + yOffset})">
      <g class="${cls}" role="button" focusable="true" tabindex="0"
        aria-label="Ficha cultivo P${node.index} · ${labelHint}"
        onclick="event.stopPropagation();openPlantSiteModal(${node.index})">
        <title>Sitio P${node.index} · ${labelHint} · pulsa para editar cultivo, edad, procedencia</title>
        <circle cx="0" cy="0" r="24" class="plant-site-marker__halo"/>
        <g transform="translate(0,2)">${inner}</g>
      </g>
    </g>`;
}

let plantSiteModalIndex = null;

function openPlantSiteModal(index) {
  if (!myGrow) return;
  plantSiteModalIndex = Math.max(1, parseInt(index, 10) || 1);
  ensurePlantProfiles(myGrow);
  const p = getPlantSlotProfile(myGrow, plantSiteModalIndex);
  const host = document.getElementById('plantSiteModal');
  if (!host) return;
  const strainSel = host.querySelector('#psmStrain');
  const ageInp = host.querySelector('#psmAge');
  const originInp = host.querySelector('#psmOrigin');
  const nickInp = host.querySelector('#psmNickname');
  const titleEl = host.querySelector('#psmTitle');
  if (strainSel) {
    strainSel.innerHTML = strains.map((st) => `<option value="${st.id}" ${(p.strainId || myGrow.strain.id) === st.id ? 'selected' : ''}>${st.name}</option>`).join('');
  }
  if (ageInp) ageInp.value = Number.isFinite(p.ageDays) ? p.ageDays : myGrow.ageDays ?? 0;
  if (originInp) originInp.value = p.origin != null && p.origin !== '' ? p.origin : myGrow.origin || '';
  if (nickInp) nickInp.value = p.nickname || '';
  if (titleEl) titleEl.textContent = `Sitio P${plantSiteModalIndex}`;
  host.classList.add('plant-site-modal--open');
  host.setAttribute('aria-hidden', 'false');
}

function closePlantSiteModal() {
  const host = document.getElementById('plantSiteModal');
  if (host) {
    host.classList.remove('plant-site-modal--open');
    host.setAttribute('aria-hidden', 'true');
  }
  plantSiteModalIndex = null;
}

function savePlantSiteModal() {
  if (!myGrow || plantSiteModalIndex == null) return;
  ensurePlantProfiles(myGrow);
  const strainId = document.getElementById('psmStrain')?.value || myGrow.strain.id;
  const ageDays = parseInt(document.getElementById('psmAge')?.value, 10);
  const origin = (document.getElementById('psmOrigin')?.value || '').trim();
  const nickname = (document.getElementById('psmNickname')?.value || '').trim();
  myGrow.plantProfiles[String(plantSiteModalIndex)] = {
    strainId,
    ageDays: Number.isFinite(ageDays) ? ageDays : myGrow.ageDays ?? 0,
    origin,
    nickname,
  };
  saveGrowState();
  closePlantSiteModal();
  renderActiveGrow();
  if (typeof renderMonitor === 'function') renderMonitor();
}

function exportSystemSvg() {
  const svgNode = document.querySelector('.system-svg-wrap .system-svg');
  if (!svgNode) return;
  const serializer = new XMLSerializer();
  const svgMarkup = serializer.serializeToString(svgNode);
  const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hydro-cannabis-${(myGrow?.system||'cultivo-hidro').toLowerCase()}-${new Date().toISOString().slice(0,10)}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
