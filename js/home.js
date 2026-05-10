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
      'Anota pH, EC, volumen y síntomas. Las tendencias importan más que un valor aislado.',
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
  let statusDetail = 'Pulsa Sistema y completa el checklist con datos reales de bomba, aire y depósitos.';
  if (hasGrow) {
    statusLabel = myGrow.strain.name;
    statusDetail = `Semana activa en curso · Usa Medir para registrar pH/EC y Historial para la bitácora.`;
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

  host.innerHTML = `
    <section class="dash-hero">
      <div class="dash-hero-bg"></div>
      <div class="dash-hero-inner">
        <p class="dash-eyebrow">Cannabis · Hidrocultivo</p>
        <h1 class="dash-headline">Hydro Cannabis</h1>
        <p class="dash-tagline">Planifica el sistema, mide con método y conserva el historial en un solo lugar.</p>
        <div class="dash-pill-row">
          <span class="dash-pill"><i class="ti ti-droplet"></i> RDWC / DWC</span>
          <span class="dash-pill"><i class="ti ti-cloud"></i> Clima</span>
          <span class="dash-pill"><i class="ti ti-flask"></i> Nutrición</span>
        </div>
      </div>
    </section>

    <section class="dash-status-card">
      <div class="dash-status-icon"><i class="ti ti-plant"></i></div>
      <div>
        <div class="dash-status-label">${statusLabel}</div>
        <p class="dash-status-text">${statusDetail}</p>
      </div>
    </section>

    <section class="dash-actions">
      <button type="button" class="dash-tile dash-tile--primary" onclick="navTo('cultivo')">
        <i class="ti ti-adjustments"></i>
        <span class="dash-tile-title">Sistema</span>
        <span class="dash-tile-sub">Checklist e ingeniería</span>
      </button>
      <button type="button" class="dash-tile" onclick="navTo('monitor')" ${hasGrow ? '' : 'disabled'}>
        <i class="ti ti-gauge"></i>
        <span class="dash-tile-title">Medir</span>
        <span class="dash-tile-sub">${hasGrow ? 'pH · EC · volumen' : 'Tras activar cultivo'}</span>
      </button>
      <button type="button" class="dash-tile" onclick="navTo('semanas')" ${hasGrow ? '' : 'disabled'}>
        <i class="ti ti-calendar-stats"></i>
        <span class="dash-tile-title">Calendario</span>
        <span class="dash-tile-sub">${hasGrow ? 'Plan semanal' : 'Con cultivo activo'}</span>
      </button>
      <button type="button" class="dash-tile" onclick="navTo('historial')" ${hasGrow ? '' : 'disabled'}>
        <i class="ti ti-history"></i>
        <span class="dash-tile-title">Historial</span>
        <span class="dash-tile-sub">${hasGrow ? 'Bitácora' : 'Con cultivo activo'}</span>
      </button>
    </section>

    <section class="dash-secondary">
      <button type="button" class="dash-link-btn" onclick="navTo('consejos')"><i class="ti ti-bulb"></i> Consejos de uso</button>
      <button type="button" class="dash-link-btn" onclick="navTo('variedades')"><i class="ti ti-seedling"></i> Variedades</button>
      <button type="button" class="dash-link-btn" onclick="navTo('nutrientes')"><i class="ti ti-flask"></i> Nutrientes</button>
    </section>

    <section class="dash-check-section">
      <div class="dash-check-head">
        <div>
          <h2 class="dash-section-title">Buenas prácticas</h2>
          <p class="dash-section-sub">Referencia rápida · ${done}/${total} revisados</p>
        </div>
        <div class="dash-mini-bar" style="--dash-pct:${pct}%"><span></span></div>
        <button type="button" class="btn btn-ghost btn--tiny" onclick="resetExpertChecklist()">Reiniciar</button>
      </div>
      <div class="expert-checklist expert-checklist--inset">${checklistRows}</div>
    </section>
  `;
}

window.toggleExpertChecklistItem = toggleExpertChecklistItem;
window.resetExpertChecklist = resetExpertChecklist;
window.goToInicio = goToInicio;
window.goToConfigChecklist = goToConfigChecklist;
window.goToVariedades = goToVariedades;
window.goToNutrientes = goToNutrientes;
window.goToMonitor = goToMonitor;
window.goToSemanas = goToSemanas;
window.goToHistorial = goToHistorial;
