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
    'Se borrarán en este dispositivo: cultivo e historial de medidas, configuración del sistema (checklist inicial), checklist de buenas prácticas de Inicio y preferencias de gráficos. No se borra el tema claro/oscuro.\n\n¿Quieres continuar?';
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

function renderConsejosPage() {
  const host = document.getElementById('consejosStrainSpecs');
  if (!host || typeof renderStrainSpecsTableHtml !== 'function') return;
  host.innerHTML = `
    <div class="card">
      <div class="card-header"><div class="card-title"><i class="ti ti-info-circle"></i>Consejos operativos (movidos desde Medir)</div></div>
      <div class="alert info"><i class="ti ti-flask-2"></i><p><strong>RDWC:</strong> la solución es común a todo el circuito. El pH y la EC se miden en el depósito de control (o en el mismo volumen recirculado), no en cada cubo por separado.</p></div>
      <div class="alert info"><i class="ti ti-gauge"></i><p><strong>Medición resolutiva:</strong> además de pH/EC y temperatura de agua, registra aire, humedad (VPD), CO₂ y, si puedes, PPFD + horas de luz (DLI). Ajusta siempre en pasos pequeños y vuelve a medir.</p></div>
    </div>
    ${renderStrainSpecsTableHtml()}
  `;
}

function renderInicio() {
  const host = document.getElementById('inicioContent');
  if (!host) return;

  const checkedMap = getExpertChecklistState();
  const total = expertChecklistItems.length;
  const done = expertChecklistItems.filter((item) => checkedMap[item.id]).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const hasGrow = !!myGrow;
  const skipWelcome = isSkipInitialWelcome();
  const appDone = !!appConfig?.completed;

  let statusLabel = 'Configura tu instalación';
  let statusDetail = 'Abre Sistema en la barra inferior y completa el checklist con datos reales de bomba, aire y depósitos.';
  if (hasGrow) {
    const rank = Number.isFinite(myGrow.nutri) ? myGrow.nutri : 1;
    const n =
      typeof nutrients !== 'undefined'
        ? nutrients.find((x) => x.rank === rank) || nutrients[0]
        : null;
    if (n) {
      statusLabel = n.name;
      statusDetail = `${n.brand} · Nutriente principal: mezclas y calendario siguen esta línea.`;
    } else {
      statusLabel = 'Cultivo activo';
      statusDetail = 'Semana en curso · Usa Medir y Sistema para seguimiento.';
    }
  } else if (appDone || skipWelcome) {
    statusLabel = 'Listo para arrancar';
    statusDetail =
      skipWelcome && !appDone
        ? 'Modo desarrollo activo. Entra en Sistema para el asistente completo.'
        : 'Elige Variedades (menú Más) o abre Sistema para el flujo guiado.';
  }

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

  const weatherLabel = myGrow?.climate
    ? `<div class="alert info"><i class="ti ti-cloud"></i><p><strong>${escapeHomeHtml(myGrow.location || 'Ubicación')} (${escapeHomeHtml(myGrow.placement || 'interior')})</strong> · ${escapeHomeHtml(myGrow.climate.summary || 'Clima')} · ${escapeHomeHtml(myGrow.climate.temperature)}°C · HR ${escapeHomeHtml(myGrow.climate.humidity)}% · Viento ${escapeHomeHtml(myGrow.climate.wind)} km/h</p></div>`
    : '';

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

  try {
    host.innerHTML = `
    <section class="dash-hero">
      <div class="dash-hero-bg"></div>
      <div class="dash-hero-inner">
        <p class="dash-eyebrow">Cannabis · Hidrocultivo</p>
        <h1 class="dash-headline">Hydro Cannabis</h1>
        <p class="dash-tagline">Planifica el sistema, mide con método y conserva el historial en un solo lugar.</p>
      </div>
    </section>

    <section class="dash-status-card">
      <div class="dash-status-icon"><i class="ti ti-plant"></i></div>
      <div>
        <div class="dash-status-label">${escapeHomeHtml(statusLabel)}</div>
        <p class="dash-status-text">${escapeHomeHtml(statusDetail)}</p>
      </div>
    </section>

    ${weatherLabel}
    ${weatherAlerts}
    ${growAlertsHtml}

    <details class="dash-check-section">
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
      <p class="inicio-system-reset__text">Reinicia la app en este navegador como si fuera la primera vez (cultivo, sistema, registros y checklist de inicio). El tema elegido en Apariencia se mantiene.</p>
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
