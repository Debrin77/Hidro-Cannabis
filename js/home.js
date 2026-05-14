// Inicio — hub visual y checklist experto

const EXPERT_CHECKLIST_STORAGE_KEY = 'hydrogrow-pro.v1.expertChecklist';

const expertChecklistItems = [
  {
    id: 'oxigenacion',
    title: 'Oxigenación y recirculación',
    text:
      'En DWC cada cubo necesita piedra o difusor 24/7. En RDWC el circuito maestro debe mantener solución en movimiento y raíces suspendidas sin anoxia.',
  },
  {
    id: 'volumen',
    title: 'Volumen de depósito y densidad',
    text:
      'Orientativo: 15–25 L de solución por planta en DWC; evita amontonar macetas sin espacio foliar.',
  },
  {
    id: 'agua',
    title: 'Calidad de agua y calibración',
    text:
      'Prioriza ósmosis o destilada; grifo solo si conoces dureza y ajustas. Calibra medidor de pH cada 7–10 días.',
  },
  {
    id: 'temperatura',
    title: 'Temperatura de solución',
    text:
      'Mantén el líquido entre ~18 y 20 °C; por encima de ~23 °C baja el oxígeno disuelto.',
  },
  {
    id: 'luz',
    title: 'Luz y genética',
    text:
      'Ajusta potencia y fotoperíodo a la variedad. Sube EC y luz de forma progresiva.',
  },
  {
    id: 'nutricion',
    title: 'Nutrición por fases',
    text:
      'Germinación: EC baja; sube en vegetación; estabiliza en floración según tabla de la cepa.',
  },
  {
    id: 'instrumentacion',
    title: 'Instrumentación y recinto',
    text:
      'Marca medidores (pH/EC, Tª líquido, termohigrómetro…) y opciones del espacio en el checklist o en Cultivo → desplegable «Complementos e instrumentación» si añades equipo después.',
  },
  {
    id: 'registro',
    title: 'Registro diario',
    text:
      'Anota pH, EC, temperatura de agua, aire, humedad (VPD), CO₂ y luz (PPFD/horas). Las tendencias importan más que un valor aislado.',
  },
  {
    id: 'legal',
    title: 'Entorno y legalidad (España)',
    text:
      'Cultivo privado para autoconsumo; evita visibilidad desde vía pública.',
  },
];

function getExpertChecklistState() {
  try {
    const raw = localStorage.getItem(EXPERT_CHECKLIST_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function toggleExpertChecklistItem(id) {
  const state = getExpertChecklistState();
  state[id] = !state[id];
  try {
    localStorage.setItem(EXPERT_CHECKLIST_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('No se pudo guardar el checklist experto.', e);
  }
  renderInicio();
}

function resetExpertChecklist() {
  try {
    localStorage.removeItem(EXPERT_CHECKLIST_STORAGE_KEY);
  } catch (e) {
    console.warn(e);
  }
  renderInicio();
}

function requestFullSystemReset() {
  const step1 =
    'Se borrarán en este dispositivo: cultivo e historial de medidas, configuración del cultivo hidropónico (checklist inicial), checklist de buenas prácticas de Inicio y preferencias de gráficos. No se borra el tema claro/oscuro.\n\n¿Quieres continuar?';
  if (!window.confirm(step1)) return;
  const step2 =
    'Confirmación final: no hay deshacer. ¿Eliminar todos estos datos locales ahora?';
  if (!window.confirm(step2)) return;
  purgeAllLocalAppDataExceptTheme();
  if (typeof resetWizardAndSessionChrome === 'function') resetWizardAndSessionChrome();
  const strainDetail = document.getElementById('strainDetail');
  if (strainDetail) strainDetail.innerHTML = '';
  if (typeof renderStrains === 'function') renderStrains('all');
  if (typeof renderNutrientes === 'function') renderNutrientes();
  renderInicio();
  if (typeof renderCultivo === 'function') renderCultivo();
  if (typeof renderMonitor === 'function') renderMonitor();
  if (typeof renderSemanas === 'function') renderSemanas();
  if (typeof renderRiego === 'function') renderRiego();
  if (typeof renderHistorial === 'function') renderHistorial();
  if (typeof renderClimatologia === 'function') renderClimatologia();
  if (typeof renderConsejosPage === 'function') renderConsejosPage();
  if (typeof navTo === 'function') navTo('inicio');
}

function goToInicio() {
  navTo('inicio');
}

function goToConfigChecklist() {
  navTo('cultivo');
}

function goToVariedades() {
  navTo('variedades');
}

function goToNutrientes() {
  navTo('nutrientes');
}

function goToMonitor() {
  navTo('monitor');
}

function goToSemanas() {
  navTo('semanas');
}

function goToHistorial() {
  navTo('historial');
}

function escapeHomeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getInicioCourtesyGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Buenos días.';
  if (h >= 12 && h < 21) return 'Buenas tardes.';
  return 'Buenas noches.';
}

function formatInicioLongDate() {
  return new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Semana y fase alineadas con Cultivo; nutPhaseKey enlaza con `nutrients[].phases`. */
function getGrowPhaseSummaryForInicio(grow) {
  if (!grow || !grow.strain || !grow.startDate) {
    return { weekNum: 1, phaseLabel: 'Sin ciclo', nutPhaseKey: 'veg' };
  }
  const s = grow.strain;
  const sd = grow.startDate instanceof Date ? grow.startDate : new Date(grow.startDate);
  const daysSince = Math.floor((Date.now() - sd.getTime()) / 86400000);
  const weekNum = Math.max(1, Math.ceil((daysSince + 1) / 7));
  let phaseLabel = '';
  let nutPhaseKey = 'veg';
  if (weekNum <= 1) {
    phaseLabel = 'Germinación · semana 1';
    nutPhaseKey = 'germ';
  } else if (weekNum <= s.vegW) {
    phaseLabel = `Vegetación · semana ${weekNum}`;
    nutPhaseKey = 'veg';
  } else if (weekNum <= s.vegW + 2) {
    phaseLabel = `Prefloración · semana ${weekNum}`;
    nutPhaseKey = 'flower';
  } else if (weekNum <= s.vegW + s.flowerW - 2) {
    phaseLabel = `Floración / fructificación · semana ${weekNum}`;
    nutPhaseKey = 'flower';
  } else if (weekNum <= s.vegW + s.flowerW) {
    phaseLabel = `Engorde · semana ${weekNum}`;
    nutPhaseKey = 'flower';
  } else {
    phaseLabel = `Flush / lavado · semana ${weekNum}`;
    nutPhaseKey = 'flush';
  }
  return { weekNum, phaseLabel, nutPhaseKey };
}

function getNutrientPhaseDoseLine(n, nutPhaseKey) {
  if (!n || !n.phases || typeof n.phases !== 'object') return '';
  const k =
    nutPhaseKey === 'germ' ? 'germ' : nutPhaseKey === 'veg' ? 'veg' : nutPhaseKey === 'flush' ? 'flush' : 'flower';
  return n.phases[k] || n.phases.veg || '';
}

function inicioStrainNutriHint(strain, nutPhaseKey) {
  if (!strain || !strain.nutriProfile) return '';
  if (nutPhaseKey === 'veg' || nutPhaseKey === 'germ') return strain.nutriProfile.veg || '';
  return strain.nutriProfile.flower || '';
}

function buildInicioHeroV2Html() {
  return `<header class="inicio-hero-v2" role="banner">
    <div class="inicio-hero-v2__bg" aria-hidden="true"></div>
    <div class="inicio-hero-v2__inner">
      <h1 class="inicio-hero-v2__title">${escapeHomeHtml('Hydro Cannabis')}</h1>
      <p class="inicio-hero-v2__meta">
        <span class="inicio-hero-v2__date">${escapeHomeHtml(formatInicioLongDate())}</span>
        <span class="inicio-hero-v2__greet">${escapeHomeHtml(getInicioCourtesyGreeting())}</span>
      </p>
    </div>
  </header>`;
}

function buildInicioInstallAndControlsHtml() {
  if (!myGrow) {
    return `<div class="inicio-install-card">
      <p class="inicio-install-card__sub" style="margin:0">Aún no hay cultivo activo. Cada instalación hidropónica guarda su propio depósito, ubicación, clima y mediciones sin mezclarse con otras.</p>
      <div class="inicio-install-card__row">
        <button type="button" class="btn btn-primary btn--compact" onclick="navTo('cultivo')"><i class="ti ti-bucket"></i> Configurar cultivo</button>
      </div>
    </div>`;
  }
  const inst =
    typeof findInstallationById === 'function' && myGrow.activeInstallationId
      ? findInstallationById(myGrow.activeInstallationId)
      : null;
  const label =
    typeof getResolvedSystemDisplayName === 'function'
      ? getResolvedSystemDisplayName(myGrow, myGrow.system || 'DWC')
      : String(inst?.name || '').trim() || inst?.type || myGrow.system || '—';
  const typ = inst?.type || myGrow.system || '';
  const loc = (myGrow.location || '').trim() || 'Sin ubicación indicada';
  const place = myGrow.placement === 'exterior' ? 'Exterior' : 'Interior';
  let multi = false;
  try {
    multi = typeof getAvailableWorkSystems === 'function' && getAvailableWorkSystems().length > 1;
  } catch (_) {
    multi = false;
  }
  const changeBtn = multi
    ? `<button type="button" class="btn btn-ghost btn--compact" onclick="openSystemWorkspaceSelector()" title="Elegir otra instalación"><i class="ti ti-switch-horizontal"></i> Cambiar instalación</button>`
    : '';
  return `<div class="inicio-install-card">
    <p class="inicio-install-card__label">Instalación activa</p>
    <h2 class="inicio-install-card__name">${escapeHomeHtml(label)}</h2>
    <p class="inicio-install-card__sub"><strong>${escapeHomeHtml(typ)}</strong> · ${escapeHomeHtml(place)} · ${escapeHomeHtml(loc)}</p>
    ${changeBtn ? `<div class="inicio-install-card__row">${changeBtn}</div>` : ''}
  </div>`;
}

function buildInicioCultivationToggleHtml() {
  if (!myGrow) return '';
  const paused = !!myGrow.cultivationPaused;
  const stateLabel = paused ? 'Desactivado' : 'Activado';
  const stateClass = paused ? 'inicio-toggle-row__state inicio-toggle-row__state--off' : 'inicio-toggle-row__state inicio-toggle-row__state--on';
  return `<div class="inicio-toggle-row" role="group" aria-labelledby="inicio-cult-toggle-label">
    <div class="inicio-toggle-row__text">
      <p id="inicio-cult-toggle-label" class="inicio-toggle-row__title">Estado del sistema</p>
      <p class="${stateClass}" aria-live="polite">${escapeHomeHtml(stateLabel)}</p>
    </div>
    <button type="button" class="inicio-switch" role="switch" aria-checked="${paused ? 'false' : 'true'}" aria-label="Estado del sistema: ${paused ? 'desactivado' : 'activado'}. Pulsa para cambiar." onclick="toggleInicioCultivationPaused()"></button>
  </div>`;
}

function buildInicioMeteoMiniHtml() {
  if (!myGrow) return '';
  const paused = !!myGrow.cultivationPaused;
  const cls = paused ? 'inicio-meteo-strip inicio-meteo-strip--muted' : 'inicio-meteo-strip';
  const sw = myGrow.siteWeather;
  if (sw?.daily?.time?.length) {
    const d = sw.daily;
    const tmax = d.temperature_2m_max?.[0];
    const tmin = d.temperature_2m_min?.[0];
    const rainMm = d.precipitation_sum?.[0];
    const prob = d.precipitation_probability_mean?.[0];
    const loc = escapeHomeHtml(sw.label || myGrow.location || 'Ubicación');
    const bits = [];
    if (Number.isFinite(tmin) && Number.isFinite(tmax)) bits.push(`${Math.round(tmin)}–${Math.round(tmax)} °C`);
    if (Number.isFinite(prob)) bits.push(`lluvia ~${Math.round(prob)} %`);
    if (Number.isFinite(rainMm) && rainMm > 0.05) bits.push(`~${rainMm.toFixed(1)} mm`);
    const sub = escapeHomeHtml(bits.join(' · ') || '—');
    const when = sw.updatedAt ? escapeHomeHtml(new Date(sw.updatedAt).toLocaleString('es-ES')) : '';
    return `<section class="${cls}" aria-label="Resumen meteorológico">
      <h3 class="inicio-meteo-strip__title">Clima · esta instalación</h3>
      <p class="inicio-meteo-strip__line"><strong>${loc}</strong> — Hoy: ${sub}</p>
      ${when ? `<p class="form-hint" style="margin:0.35rem 0 0">Actualizado ${when}</p>` : ''}
      <div class="inicio-meteo-strip__actions"><button type="button" class="btn btn-ghost btn--compact" onclick="navTo('climatologia')">Detalle y pronóstico</button></div>
    </section>`;
  }
  if (myGrow.climate?.summary) {
    const loc = escapeHomeHtml(myGrow.location || 'Ubicación');
    return `<section class="${cls}" aria-label="Clima simplificado">
      <h3 class="inicio-meteo-strip__title">Clima · esta instalación</h3>
      <p class="inicio-meteo-strip__line"><strong>${loc}</strong> — ${escapeHomeHtml(myGrow.climate.summary)} · ${escapeHomeHtml(String(myGrow.climate.temperature ?? '—'))} °C · HR ${escapeHomeHtml(String(myGrow.climate.humidity ?? '—'))} %</p>
      <div class="inicio-meteo-strip__actions"><button type="button" class="btn btn-ghost btn--compact" onclick="navTo('climatologia')">Abrir climatología</button></div>
    </section>`;
  }
  return `<section class="${cls}" aria-label="Sin datos de clima">
    <h3 class="inicio-meteo-strip__title">Clima · esta instalación</h3>
    <p class="inicio-meteo-strip__line">Aún no hay pronóstico guardado para esta ubicación.</p>
    <div class="inicio-meteo-strip__actions"><button type="button" class="btn btn-primary btn--compact" onclick="navTo('climatologia')">Configurar climatología</button></div>
  </section>`;
}

function buildInicioNutrientBlockHtml() {
  if (!myGrow || !myGrow.strain) return '';
  const paused = !!myGrow.cultivationPaused;
  const cls = paused ? 'inicio-nutri-card inicio-nutri-card--muted' : 'inicio-nutri-card';
  const rank = Number.isFinite(myGrow.nutri) ? myGrow.nutri : 1;
  const n = typeof nutrients !== 'undefined' ? nutrients.find((x) => x.rank === rank) || nutrients[0] : null;
  if (!n) return '';
  const phSum = getGrowPhaseSummaryForInicio(myGrow);
  const doseLine = getNutrientPhaseDoseLine(n, phSum.nutPhaseKey);
  const strainHint = inicioStrainNutriHint(myGrow.strain, phSum.nutPhaseKey);
  const phaseHuman =
    phSum.nutPhaseKey === 'veg' || phSum.nutPhaseKey === 'germ'
      ? 'vegetativo / arranque'
      : phSum.nutPhaseKey === 'flush'
        ? 'lavado final'
        : 'floración y fructificación';
  return `<section class="${cls}" aria-labelledby="inicio-nutri-h">
    <p id="inicio-nutri-h" class="inicio-nutri-card__label">Nutriente seleccionado</p>
    <h2 class="inicio-nutri-card__name">${escapeHomeHtml(n.name)}</h2>
    <p class="inicio-nutri-card__brand">${escapeHomeHtml(n.brand)}</p>
    <p class="inicio-nutri-card__phase">Fase del calendario: <strong>${escapeHomeHtml(phSum.phaseLabel)}</strong>. En fase de <strong>${escapeHomeHtml(phaseHuman)}</strong> conviene priorizar la pauta de abono correspondiente (más énfasis en N en vegetación; más P-K en floración / fructificación).</p>
    ${doseLine ? `<div class="inicio-nutri-card__rec"><strong>${escapeHomeHtml(n.name)}</strong> (${escapeHomeHtml(phaseHuman)}): ${escapeHomeHtml(doseLine)}</div>` : ''}
    ${strainHint ? `<p class="form-hint" style="margin:0.5rem 0 0"><strong>Cepa:</strong> ${escapeHomeHtml(strainHint)}</p>` : ''}
    <div style="margin-top:0.65rem"><button type="button" class="btn btn-ghost btn--compact" onclick="navTo('nutrientes')">Ver líneas y catálogo</button></div>
  </section>`;
}

function toggleInicioCultivationPaused() {
  if (!myGrow) return;
  myGrow.cultivationPaused = !myGrow.cultivationPaused;
  if (typeof syncCurrentSystemWorkspaceState === 'function') syncCurrentSystemWorkspaceState();
  saveGrowState();
  renderInicio();
}

function getGrowReadinessFlags(grow) {
  const checklistTotal = expertChecklistItems.length;
  if (!grow) {
    return {
      strainOk: false,
      locOk: false,
      climaOk: false,
      medirOk: false,
      checklistDone: 0,
      checklistTotal,
      checklistPct: 0,
    };
  }
  const locOk = (grow.location || '').trim().length >= 2;
  const ext = grow.placement === 'exterior';
  const climaOk = !ext || !!(grow.siteWeather && grow.siteWeather.updatedAt);
  const strainOk = !!(grow.strain && grow.strain.name);
  const msRaw = Array.isArray(grow.measurements) ? grow.measurements : [];
  const ms = msRaw.filter(
    (m) =>
      typeof measurementBelongsToActiveInstallation !== 'function' || measurementBelongsToActiveInstallation(grow, m),
  );
  const medirOk = ms.length > 0;
  const map = getExpertChecklistState();
  const checklistDone = expertChecklistItems.filter((x) => map[x.id]).length;
  const checklistPct = checklistTotal ? Math.round((checklistDone / checklistTotal) * 100) : 0;
  return { strainOk, locOk, climaOk, medirOk, checklistDone, checklistTotal, checklistPct };
}

function hcEmbedHasBeenVisited() {
  try {
    return sessionStorage.getItem('hydroCannabis.hcEmbedVisited') === '1';
  } catch {
    return false;
  }
}

/** Alineado con la lista de fases del módulo de integración (js/hcEmbed.js), según datos guardados en el dispositivo. */
function getHcNativePortPhaseHits(grow) {
  const phases = window.EMBED_NATIVE_PORT_PHASES || [];
  if (!phases.length) return { hits: 0, total: 0, pct: 0 };
  if (!grow) return { hits: 0, total: phases.length, pct: 0 };

  const sw = grow.siteWeather;
  const rn = grow.fusion && grow.fusion.riegoNative;
  const msRaw = Array.isArray(grow.measurements) ? grow.measurements : [];
  const ms = msRaw.filter(
    (m) =>
      typeof measurementBelongsToActiveInstallation !== 'function' || measurementBelongsToActiveInstallation(grow, m),
  );
  const map = getExpertChecklistState();
  const chk = expertChecklistItems.filter((x) => map[x.id]).length;
  const fusion = grow.fusion && typeof grow.fusion === 'object' ? grow.fusion : {};
  const fusionTouched = Object.keys(fusion).some((k) => fusion[k] != null);
  const ext = grow.placement === 'exterior';

  let hits = 0;
  for (const ph of phases) {
    let ok = false;
    switch (ph.id) {
      case 'datos':
        ok =
          fusionTouched ||
          !!(grow.fusion?.growContext && typeof grow.fusion.growContext.syncedAt === 'string');
        break;
      case 'riego':
        ok = !!(rn && rn.updatedAt && !rn.error);
        break;
      case 'meteo':
        ok = !!(sw && sw.updatedAt && sw.daily && sw.daily.time && sw.daily.time.length);
        break;
      case 'calendario':
        ok = !!(sw && sw.hourly && sw.hourly.time && sw.hourly.time.length);
        break;
      case 'sistema':
        ok = !!(grow.system && grow.strain);
        break;
      case 'inicio':
        ok = !!(
          (rn && rn.updatedAt && !rn.error) ||
          (sw && sw.daily && sw.daily.time && sw.daily.time.length && (!ext || sw.updatedAt))
        );
        break;
      case 'historial':
        ok = ms.length > 0 || (Array.isArray(grow.log) && grow.log.length > 2);
        break;
      case 'consejos':
        ok = chk >= 2;
        break;
      case 'ayuda':
        ok = chk >= 6;
        break;
      case 'mediciones':
        ok = hcEmbedHasBeenVisited();
        break;
      default:
        ok = false;
    }
    if (ok) hits += 1;
  }
  const total = phases.length;
  const pct = total ? Math.round((hits / total) * 100) : 0;
  return { hits, total, pct };
}

function buildInicioCultivoSetupPct(gf) {
  const four = [gf.strainOk, gf.locOk, gf.climaOk, gf.medirOk].filter(Boolean).length;
  const base = (four / 4) * 78 + (gf.checklistPct / 100) * 22;
  return Math.min(100, Math.round(base));
}

function buildInicioAppProgressCardHtml() {
  if (!myGrow) {
    return `<section class="dash-progress-card" aria-labelledby="dash-progress-title">
      <h2 id="dash-progress-title" class="dash-progress-title"><i class="ti ti-progress"></i> Progreso en la app</h2>
      <p class="dash-progress-lead">Activa un cultivo en <strong>Cultivo</strong> para ver el progreso de configuración, la migración a pantallas nativas y los avisos al guardar medidas o clima.</p>
      <div class="dash-progress-meter-wrap" aria-hidden="true">
        <div class="dash-progress-meter"><span style="width:0%"></span></div>
      </div>
      <button type="button" class="btn btn-primary btn--compact" onclick="navTo('cultivo')"><i class="ti ti-bucket"></i> Configurar cultivo</button>
    </section>`;
  }

  const gf = getGrowReadinessFlags(myGrow);
  const cultivoPct = buildInicioCultivoSetupPct(gf);
  const port = getHcNativePortPhaseHits(myGrow);
  const fourOk = [gf.strainOk, gf.locOk, gf.climaOk, gf.medirOk].filter(Boolean).length;
  const hydroTier =
    typeof getCannabisHydroPortTier === 'function' && myGrow.system
      ? getCannabisHydroPortTier(myGrow.system)
      : 'core';
  const hydroTierHint =
    hydroTier === 'extended'
      ? '<p class="dash-progress-hint dash-progress-hint--tier">Hidro <strong>extendido</strong> (NFT/mesa): medición frecuente; diagramas y checklist detallado en la vista de <strong>Más → Integración</strong>.</p>'
      : hydroTier === 'advanced'
        ? '<p class="dash-progress-hint dash-progress-hint--tier">Hidro <strong>avanzado</strong> (aeroponía): revisa boquillas y ciclos; la vista de integración aporta referencias técnicas amplias.</p>'
        : '';

  return `<section class="dash-progress-card" aria-labelledby="dash-progress-title">
    <h2 id="dash-progress-title" class="dash-progress-title"><i class="ti ti-progress"></i> Progreso en la app</h2>
    <p class="dash-progress-lead">Resumen en este dispositivo: checklist operativo y avance del port a pantallas nativas (orden en <strong>Más → Integración</strong>).</p>
    <div class="dash-progress-rows">
      <div>
        <div class="dash-progress-row__head">
          <span class="dash-progress-row__label">Tu cultivo</span>
          <span class="dash-progress-row__val">${cultivoPct}% · ${fourOk}/4 pasos</span>
        </div>
        <div class="dash-progress-meter-wrap">
          <div class="dash-progress-meter"><span style="width:${cultivoPct}%"></span></div>
        </div>
        <p class="dash-progress-hint">${escapeHomeHtml(`Buenas prácticas: ${gf.checklistDone}/${gf.checklistTotal} · ${gf.checklistPct}%.`)}</p>
      </div>
      <div>
        <div class="dash-progress-row__head">
          <span class="dash-progress-row__label">Port a pantallas nativas</span>
          <span class="dash-progress-row__val">${port.hits}/${port.total} · ${port.pct}%</span>
        </div>
        <div class="dash-progress-meter-wrap">
          <div class="dash-progress-meter dash-progress-meter--secondary"><span style="width:${port.pct}%"></span></div>
        </div>
        <p class="dash-progress-hint">Abre al menos una vez la vista de integración (<strong>Más</strong>) para contar la fase de medición extendida (cultivos no cannabis).</p>
      </div>
    </div>
    ${hydroTierHint}
    <div class="dash-progress-actions">
      <button type="button" class="btn btn-ghost btn--tiny" onclick="document.getElementById('dash-ready-card')?.scrollIntoView({behavior:'smooth',block:'nearest'})">Listo para cultivar</button>
      <button type="button" class="btn btn-ghost btn--tiny" onclick="document.getElementById('dash-expert-check-section')?.scrollIntoView({behavior:'smooth',block:'nearest'})">Checklist buenas prácticas</button>
    </div>
  </section>`;
}

function renderConsejosPage() {
  const host = document.getElementById('consejosStrainSpecs');
  if (!host || typeof renderStrainSpecsTableHtml !== 'function') return;
  const learnC = typeof getUiExperienceMode === 'function' && getUiExperienceMode() === 'learning';
  const learnBlock = learnC
    ? `<div class="alert info consejos-learning-block"><i class="ti ti-school"></i><p><strong>Modo Aprendizaje:</strong> interior no implica invernadero de cristal; con pH, EC, Tª del líquido y termohigrómetro en copa suele bastar en armario o carpa. CO₂, deshumidificador fijo o sensor PAR compensan cuando el espacio está acotado y ya llevas estable la solución. En <strong>Cultivo</strong> el perfil «espacio amplio» describe macro-carpa o sala grande, no un requisito para cultivar en pequeño.</p></div>`
    : `<div class="alert info"><i class="ti ti-hand-stop"></i><p>¿Prefieres menos jerga? En <strong>Apariencia y accesibilidad</strong> puedes dejar <strong>Guiado</strong>; si quieres el bloque anterior sobre recintos y equipo mínimo, activa <strong>Aprendizaje</strong>.</p></div>`;
  host.innerHTML = `
    <div class="card">
      <div class="card-header"><div class="card-title"><i class="ti ti-info-circle"></i>Consejos de uso</div></div>
      <p class="body-prose consejos-lead">La app está pensada para quien cultiva en <strong>hidroponía en casa</strong>: eliges el tipo de cultivo hidropónico que ofrece la app, la variedad, el nutriente y el emplazamiento. Según lo que marques de <strong>medidores y equipo</strong>, verás sugerencias de mezcla y rangos acordes; en exterior se tiene en cuenta la <strong>meteorología de tu zona</strong>. Los detalles difíciles quedan en segundo plano: lo importante son pasos claros y poder anotar qué hiciste tras cada lectura.</p>
      <div class="alert info"><i class="ti ti-flask-2"></i><p><strong>Circuito RDWC:</strong> toda la planta comparte el mismo agua con abono. Mide pH y sales (EC) en el depósito de control o donde indique tu kit: no hace falta repetir en cada cubo.</p></div>
      <div class="alert info"><i class="ti ti-gauge"></i><p><strong>Qué conviene medir:</strong> pH y EC del líquido y, si puedes, temperatura del agua. En el aire, temperatura y humedad cerca de las plantas. El CO₂ solo aporta en espacio cerrado; la luz (lux o PAR) ayuda a regular la lámpara. Marca en <strong>Cultivo</strong> solo lo que de verdad tienes: así las pantallas no te abruman.</p></div>
      <div class="alert info"><i class="ti ti-wind"></i><p><strong>Dos “aires” distintos:</strong> la bomba de burbujas oxigena el <strong>nutriente</strong>; el extractor renueva el <strong>aire del cuarto o armario</strong>. En <strong>Cultivo</strong> verás referencias para ambos. Los kits de tienda se rellenan como un montaje casero: caudales y litros según la ficha o la placa del equipo.</p></div>
      ${learnBlock}
    </div>
    <div class="card consejos-fusion-card">
      <div class="card-header"><div class="card-title"><i class="ti ti-link"></i> Integración con módulos extendidos</div></div>
      <p class="body-prose body-prose--tight">Aquí tienes el flujo <strong>cannabis</strong> (Medir, variedades, calendario por cepa). Desde <strong>Más → Integración</strong> puedes abrir torre, mallas agrícolas y otros módulos generales: la misma <strong>ubicación y pronóstico</strong> alimentan ET₀, VPD y riego nativo en esta app.</p>
      <p class="body-prose body-prose--tight">Al guardar en <strong>Climatología</strong>, el riego nativo se recalcula solo unos instantes después para mantener <strong>Historial</strong>, <strong>Calendario</strong> y <strong>Riego</strong> alineados.</p>
      <div class="consejos-fusion-actions">
        <button type="button" class="btn btn-primary btn--compact" onclick="navTo('riego')"><i class="ti ti-droplet"></i> Riego nativo</button>
        <button type="button" class="btn btn-ghost btn--compact" onclick="navTo('historial')"><i class="ti ti-history"></i> Historial</button>
        <button type="button" class="btn btn-ghost btn--compact" onclick="navToHcEmbed('inicio')"><i class="ti ti-layout-dashboard"></i> Panel integración</button>
      </div>
    </div>
    ${renderStrainSpecsTableHtml()}
  `;
}

/** Recomendaciones de producto para seguir acercando módulos nativos sin depender del embebido en el día a día. */
function buildInicioFusionRoadmapHtml() {
  return `<section class="dash-fusion-roadmap" aria-labelledby="dash-fusion-roadmap-title">
    <h2 id="dash-fusion-roadmap-title" class="dash-fusion-roadmap__title"><i class="ti ti-route" aria-hidden="true"></i> Siguiente oleada de fusión</h2>
    <ul class="dash-fusion-roadmap__list">
      <li><strong>Calendario:</strong> densificar hitos nativos (recarga, calibración, tareas por fase) y dejar la malla embebida solo para casos complejos o torre.</li>
      <li><strong>Sistema (fase 4):</strong> checklist y dimensionado ya separados por instalación; siguiente paso es profundizar UI nativa solo para núcleo RDWC/DWC y enlazar lo demás como «extendido».</li>
      <li><strong>Historial / exportación:</strong> trazabilidad por <code>installationId</code> en mediciones (ya guardado) y, más adelante, PDF o CSV que respete la instalación activa.</li>
      <li><strong>Clima ↔ Riego:</strong> documentar en ayuda los criterios de «misma rejilla» y pruebas automáticas cuando cambie la ciudad entre instalaciones.</li>
    </ul>
    <p class="form-hint">Para desarrollo, la lista ordenada de fases vive en <code>js/hcEmbed.js</code> (<code>EMBED_NATIVE_PORT_PHASES</code>).</p>
  </section>`;
}

function buildInicioFusionStatusHtml() {
  if (!myGrow) return '';
  const bits = [];
  const sw = myGrow.siteWeather;
  if (sw?.updatedAt) {
    bits.push('Clima · ' + new Date(sw.updatedAt).toLocaleDateString('es-ES'));
  }
  const r = myGrow.fusion && myGrow.fusion.riegoNative;
  if (r?.updatedAt) {
    const dr = Number.isFinite(r.demandaRel) ? r.demandaRel.toFixed(2) : '—';
    bits.push('Riego · demanda ' + dr + ' (' + new Date(r.updatedAt).toLocaleDateString('es-ES') + ')');
  }
  if (!bits.length) return '';
  return `<section class="dash-fusion-status" aria-label="Estado Meteo y Riego">
    <p class="dash-fusion-status__text">${escapeHomeHtml(bits.join(' · '))}</p>
    <div class="dash-fusion-status__row">
      <button type="button" class="btn btn-ghost btn--tiny" onclick="navTo('riego')">Riego</button>
      <button type="button" class="btn btn-ghost btn--tiny" onclick="navTo('climatologia')">Clima</button>
      <button type="button" class="btn btn-ghost btn--tiny" onclick="navTo('ayuda')">Ayuda</button>
    </div>
  </section>`;
}

function buildInicioHcOpsRowHtml() {
  if (!myGrow) return '';
  const snap = myGrow.fusion && myGrow.fusion.riegoNative;
  if (!snap || !snap.updatedAt || snap.error) {
    return `<section class="dash-hc-ops" aria-label="Operativa de riego">
      <h3 class="dash-hc-ops__title"><i class="ti ti-droplet"></i> Riego y torre</h3>
      <p class="dash-hc-ops__text">Abre <strong>Riego</strong> para ET₀, demanda y pulsos con el tiempo de tu ubicación. Si usas <strong>torre</strong> u otro esquema fino, entra en <strong>Más → Integración</strong> al riego extendido.</p>
      <div class="dash-hc-ops__btns">
        <button type="button" class="btn btn-primary btn--compact" onclick="navTo('riego')">Riego (nativo)</button>
        <button type="button" class="btn btn-ghost btn--compact" onclick="navToHcEmbed('riego')">Riego extendido</button>
      </div>
    </section>`;
  }
  const parts = [];
  if (Number.isFinite(snap.et0TodayMm)) parts.push('ET₀ hoy ~' + snap.et0TodayMm.toFixed(2) + ' mm');
  if (Number.isFinite(snap.vpdMeanKpa)) parts.push('VPD ~' + snap.vpdMeanKpa.toFixed(2) + ' kPa');
  if (Number.isFinite(snap.demandaRel)) parts.push('Demanda ' + snap.demandaRel.toFixed(2));
  if (Number.isFinite(snap.pulseMinON) && Number.isFinite(snap.pulseMinOFF)) {
    parts.push('Pulso ~' + snap.pulseMinON + '/' + snap.pulseMinOFF + ' min');
  }
  const line = escapeHomeHtml(parts.join(' · ') || 'Cálculo guardado');
  return `<section class="dash-hc-ops" aria-label="Resumen riego nativo">
    <h3 class="dash-hc-ops__title"><i class="ti ti-droplet"></i> Riego (último cálculo)</h3>
    <p class="dash-hc-ops__text">${line}</p>
    <div class="dash-hc-ops__btns">
      <button type="button" class="btn btn-primary btn--compact" onclick="navTo('riego')">Abrir Riego</button>
      <button type="button" class="btn btn-ghost btn--compact" onclick="navToHcEmbed('riego')">Torre / detalle</button>
      <button type="button" class="btn btn-ghost btn--compact" onclick="navToHcEmbed('inicio')">Panel torre</button>
    </div>
  </section>`;
}

function buildInicioForecastWidgetHtml() {
  if (!myGrow?.siteWeather?.daily?.time?.length) return '';
  const snap = myGrow.siteWeather;
  const d = snap.daily;
  const tmax = d.temperature_2m_max?.[0];
  const tmin = d.temperature_2m_min?.[0];
  const rainMm = d.precipitation_sum?.[0];
  const pcode = d.weather_code?.[0];
  const prob = d.precipitation_probability_mean?.[0];
  const viz =
    typeof window.getDailyWeatherVisual === 'function'
      ? window.getDailyWeatherVisual(pcode)
      : { icon: 'ti ti-cloud', label: 'Pronóstico hoy', tone: 'neutral' };
  const loc = escapeHomeHtml(snap.label || myGrow.location || 'Ubicación');
  const sub = [];
  if (Number.isFinite(tmin) && Number.isFinite(tmax)) {
    sub.push(`${Math.round(tmin)}–${Math.round(tmax)}°C`);
  }
  if (Number.isFinite(prob)) sub.push(`prob. lluvia ~${Math.round(prob)}%`);
  if (Number.isFinite(rainMm) && rainMm > 0.05) sub.push(`~${rainMm.toFixed(1)} mm`);
  const subline = escapeHomeHtml(sub.join(' · ') || 'Pronóstico del modelo');
  const when = snap.updatedAt ? escapeHomeHtml(new Date(snap.updatedAt).toLocaleString('es-ES')) : '';
  const tit = escapeHomeHtml(viz.label);
  const tone = /^[a-z]+$/i.test(viz.tone) ? viz.tone : 'neutral';
  return `<section class="dash-clima-widget dash-clima-widget--${tone}" aria-label="Hoy en el pronóstico">
    <div class="dash-clima-widget__row">
      <div class="dash-clima-widget__icon" aria-hidden="true"><i class="ti ${escapeHomeHtml(viz.icon)}"></i></div>
      <div class="dash-clima-widget__body">
        <div class="dash-clima-widget__title">Hoy · ${loc}</div>
        <div class="dash-clima-widget__viz">${tit}</div>
        <p class="dash-clima-widget__metrics">${subline}</p>
        ${when ? `<p class="dash-clima-widget__meta">Actualizado ${when}</p>` : ''}
        <button type="button" class="btn btn-ghost btn--compact" onclick="navTo('climatologia')"><i class="ti ti-cloud-storm"></i> Climatología</button>
      </div>
    </div>
  </section>`;
}

function buildInicioReadinessCardHtml() {
  if (!myGrow) return '';
  const gf = getGrowReadinessFlags(myGrow);
  const { strainOk, locOk, climaOk, medirOk, checklistDone: done, checklistTotal: total, checklistPct: pct } = gf;
  const ext = myGrow.placement === 'exterior';
  const sys = myGrow.system || 'DWC';

  function row(ok, title, hintHtml, view, btnLabel) {
    const icon = ok ? 'ti-check' : 'ti-circle';
    const cls = ok ? 'dash-ready-row dash-ready-row--ok' : 'dash-ready-row';
    const btn =
      !ok && view
        ? `<button type="button" class="btn btn-ghost btn--tiny" onclick="navTo('${view}')">${escapeHomeHtml(btnLabel)}</button>`
        : '';
    return `<li class="${cls}"><i class="ti ${icon}" aria-hidden="true"></i><div class="dash-ready-row__text"><strong>${escapeHomeHtml(title)}</strong><span class="dash-ready-hint">${hintHtml}</span></div>${btn}</li>`;
  }

  const strainHint = strainOk
    ? escapeHomeHtml(`${myGrow.strain.name} · ${sys}`)
    : escapeHomeHtml('Completa variedad, nutriente y sistema en Cultivo.');
  const locHint = locOk
    ? escapeHomeHtml('Ubicación lista para geocódigo y APIs.')
    : escapeHomeHtml('Indica ciudad o zona en Cultivo o Climatología.');
  const climaHint = ext
    ? climaOk
      ? escapeHomeHtml('Pronóstico guardado para exterior.')
      : escapeHomeHtml('Actualiza el pronóstico en Climatología.')
    : escapeHomeHtml('En interior el pronóstico exterior es opcional.');
  const medirHint = medirOk
    ? escapeHomeHtml('Ya hay lecturas para tendencias y alertas.')
    : escapeHomeHtml('Registra pH y EC para cruzar con el plan semanal.');

  const rows = [
    row(strainOk, 'Cultivo configurado', strainHint, 'cultivo', 'Cultivo'),
    row(locOk, 'Ubicación', locHint, 'cultivo', 'Cultivo'),
    row(climaOk, 'Clima', climaHint, 'climatologia', 'Clima'),
    row(medirOk, 'Medir', medirHint, 'monitor', 'Medir'),
  ].join('');

  return `<section id="dash-ready-card" class="dash-ready-card" aria-labelledby="dash-ready-title">
    <h2 id="dash-ready-title" class="dash-ready-title"><i class="ti ti-checklist"></i> Listo para cultivar</h2>
    <p class="dash-ready-lead">${escapeHomeHtml(`Buenas prácticas (más abajo): ${done}/${total} · ${pct}%.`)}</p>
    <ul class="dash-ready-list">${rows}</ul>
  </section>`;
}

function renderInicio() {
  const host = document.getElementById('inicioContent');
  if (!host) return;

  const checkedMap = getExpertChecklistState();
  const total = expertChecklistItems.length;
  const done = expertChecklistItems.filter((item) => checkedMap[item.id]).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const hasGrow = !!myGrow;

  const checklistRows = expertChecklistItems
    .map(
      (item) => `
    <label class="expert-item expert-item--compact">
      <input type="checkbox" ${checkedMap[item.id] ? 'checked' : ''} onchange="toggleExpertChecklistItem('${item.id}')">
      <span>
        <span class="expert-item-title">${item.title}</span>
        <span class="expert-item-text">${item.text}</span>
      </span>
    </label>
  `,
    )
    .join('');

  const weatherAlerts = (() => {
    try {
      if (!myGrow || myGrow.placement !== 'exterior') return '';
      if (typeof buildExteriorHydroSolutions !== 'function') return '';
      const snap = myGrow.siteWeather;
      const plan = buildExteriorHydroSolutions(myGrow, snap);
      const risky = (plan.blocks || []).filter((b) => b.level === 'danger' || b.level === 'warn');
      if (!risky.length) return '';
      return risky
        .slice(0, 2)
        .map((b) => {
          const text = Array.isArray(b.actions) && b.actions.length ? b.actions[0] : b.title;
          return `<div class="alert ${b.level === 'danger' ? 'danger' : 'warn'}"><i class="ti ti-alert-triangle"></i><p><strong>${escapeHomeHtml(b.title)}</strong> · ${escapeHomeHtml(text)}</p></div>`;
        })
        .join('');
    } catch (e) {
      console.warn('Inicio: alertas de clima exterior omitidas.', e);
      return '';
    }
  })();

  let growAlertsHtml = '';
  try {
    if (hasGrow && typeof renderGrowAlertsCardHtml === 'function') {
      growAlertsHtml = renderGrowAlertsCardHtml(myGrow);
    }
  } catch (e) {
    console.warn('Inicio: tarjeta de alertas omitida.', e);
  }

  let inicioPriorityHtml = '';
  if (!hasGrow) {
    inicioPriorityHtml = `<section class="dash-priority-card" aria-labelledby="dash-priority-title">
      <h2 id="dash-priority-title" class="dash-priority-card__title">Primer paso</h2>
      <p class="dash-priority-card__lead">Indica instalación, variedad, nutriente y emplazamiento para activar <strong>Medir</strong>, <strong>Calendario</strong> e <strong>Historial</strong>.</p>
      <button type="button" class="btn btn-primary dash-priority-card__cta" onclick="navTo('cultivo')"><i class="ti ti-bucket" aria-hidden="true"></i> Configurar mi cultivo</button>
    </section>`;
  } else {
    const msRaw = Array.isArray(myGrow.measurements) ? myGrow.measurements : [];
    const ms = msRaw.filter(
      (m) =>
        typeof measurementBelongsToActiveInstallation !== 'function' ||
        measurementBelongsToActiveInstallation(myGrow, m),
    );
    let lastIso = '';
    for (let i = ms.length - 1; i >= 0; i--) {
      if (ms[i] && ms[i].date) {
        lastIso = ms[i].date;
        break;
      }
    }
    const last = lastIso ? new Date(lastIso) : null;
    const daysSince = last ? (Date.now() - last.getTime()) / 86400000 : 999;
    const stale = !last || daysSince > 2;
    const hint = stale
      ? 'Llevas varios días sin lecturas nuevas: <strong>Medir</strong> sitúa pH/EC frente a la cepa y la fase.'
      : 'Si ajustaste solución, luz o clima, <strong>vuelve a Medir</strong> para ver el cambio en <strong>Historial</strong>.';
    const climaBtn =
      myGrow.placement === 'exterior'
        ? `<button type="button" class="btn btn-ghost" onclick="navTo('climatologia')"><i class="ti ti-cloud-storm" aria-hidden="true"></i> Climatología</button>`
        : '';
    inicioPriorityHtml = `<section class="dash-priority-card" aria-labelledby="dash-priority-title">
      <h2 id="dash-priority-title" class="dash-priority-card__title">Rutina recomendada</h2>
      <p class="dash-priority-card__lead">${hint}</p>
      <div class="dash-priority-card__row">
        <button type="button" class="btn btn-primary" onclick="navTo('monitor')"><i class="ti ti-droplet-half-2" aria-hidden="true"></i> Medir</button>
        <button type="button" class="btn btn-ghost" onclick="navTo('semanas')"><i class="ti ti-calendar-event" aria-hidden="true"></i> Calendario</button>
        ${climaBtn}
      </div>
    </section>`;
  }

  try {
    host.innerHTML = `
    ${buildInicioHeroV2Html()}

    ${buildInicioInstallAndControlsHtml()}

    ${buildInicioCultivationToggleHtml()}

    ${buildInicioMeteoMiniHtml()}

    ${buildInicioNutrientBlockHtml()}

    <details class="dash-check-section" id="dash-inicio-more-section">
      <summary class="dash-check-summary">
        <div class="dash-check-summary__grow">
          <div class="dash-check-summary__topline">
            <div>
              <h2 class="dash-section-title">Progreso, checklist y más</h2>
              <p class="dash-section-sub">Resumen de configuración, integración y buenas prácticas</p>
            </div>
            <i class="ti ti-chevron-down dash-check-chev" aria-hidden="true"></i>
          </div>
        </div>
      </summary>
      <div class="dash-check-section__body dash-check-section__body--loose">
    ${buildInicioAppProgressCardHtml()}

    ${inicioPriorityHtml}

    ${buildInicioReadinessCardHtml()}

    ${buildInicioFusionRoadmapHtml()}

    ${buildInicioFusionStatusHtml()}

    ${buildInicioHcOpsRowHtml()}

    <section class="dash-hc-strip" aria-labelledby="dash-hc-title">
      <h2 id="dash-hc-title" class="dash-hc-strip__title"><i class="ti ti-layout-grid" aria-hidden="true"></i> Accesos rápidos</h2>
      <p class="dash-hc-strip__lead">Prioridad <strong>RDWC/DWC</strong> en pantallas nativas. Los botones 2–6 abren la <strong>vista de integración</strong> (menú <strong>Más</strong>) para meteo detallado, mallas, instalación completa, panel tipo torre e historial ampliado, sin mezclar datos con tu <strong>Medir</strong> de cannabis en la barra inferior.</p>
      <div class="dash-hc-grid">
        <button type="button" class="dash-hc-btn" onclick="navTo('riego')">1 Riego nativo</button>
        <button type="button" class="dash-hc-btn" onclick="navToHcEmbed('meteo')">2 Meteo</button>
        <button type="button" class="dash-hc-btn" onclick="navToHcEmbed('calendario')">3 Cal.</button>
        <button type="button" class="dash-hc-btn" onclick="navToHcEmbed('sistema')">4 Sistema</button>
        <button type="button" class="dash-hc-btn" onclick="navToHcEmbed('inicio')">5 Torre / panel</button>
        <button type="button" class="dash-hc-btn" onclick="navToHcEmbed('historial')">6 Hist.</button>
      </div>
    </section>

    ${weatherAlerts}
    ${growAlertsHtml}

      </div>
    </details>

    <details class="dash-check-section" id="dash-expert-check-section">
      <summary class="dash-check-summary">
        <div class="dash-check-summary__grow">
          <div class="dash-check-summary__topline">
            <div>
              <h2 class="dash-section-title">Buenas prácticas</h2>
              <p class="dash-section-sub">Referencia rápida · ${done}/${total} revisados</p>
            </div>
            <i class="ti ti-chevron-down dash-check-chev" aria-hidden="true"></i>
          </div>
          <div class="dash-mini-bar dash-mini-bar--in-summary" style="--dash-pct:${pct}%"><span></span></div>
        </div>
      </summary>
      <div class="dash-check-section__toolbar">
        <button type="button" class="btn btn-ghost btn--tiny" onclick="resetExpertChecklist()">Reiniciar</button>
      </div>
      <div class="dash-check-section__body expert-checklist expert-checklist--inset">${checklistRows}</div>
    </details>

    <section class="inicio-system-reset" id="inicio-system-reset" aria-labelledby="inicio-reset-heading">
      <h2 id="inicio-reset-heading" class="inicio-system-reset__title">Zona sensible</h2>
      <p class="inicio-system-reset__text">Reinicia la app en este navegador como si fuera la primera vez (cultivo hidropónico, registros y checklist de inicio). El tema elegido en Apariencia se mantiene.</p>
      <button type="button" class="btn btn-ghost inicio-system-reset__btn" onclick="requestFullSystemReset()">
        <i class="ti ti-refresh" aria-hidden="true"></i> RESET SISTEMA
      </button>
    </section>
  `;
  } catch (e) {
    console.error('renderInicio', e);
    host.innerHTML = `
    <div class="card">
      <div class="card-header"><div class="card-title">Inicio</div></div>
      <p class="body-prose">No se pudo cargar la pantalla de inicio. Prueba a recargar (F5). Si abres la app desde archivo local, usa un servidor local (p. ej. Live Server) en lugar de <code>file://</code>.</p>
    </div>`;
  }
}

window.toggleExpertChecklistItem = toggleExpertChecklistItem;
window.resetExpertChecklist = resetExpertChecklist;
window.requestFullSystemReset = requestFullSystemReset;
window.goToInicio = goToInicio;
window.goToConfigChecklist = goToConfigChecklist;
window.goToVariedades = goToVariedades;
window.goToNutrientes = goToNutrientes;
window.goToMonitor = goToMonitor;
window.goToSemanas = goToSemanas;
window.goToHistorial = goToHistorial;
window.renderConsejosPage = renderConsejosPage;
window.toggleInicioCultivationPaused = toggleInicioCultivationPaused;
