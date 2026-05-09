// Inicio — hub principal y checklist experto (hidro + cannabis)

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
      'Orientativo: 15–25 L de solución por planta en DWC; evita amontonar macetas sin espacio foliar. Más plantas no siempre es más rendimiento.',
  },
  {
    id: 'agua',
    title: 'Calidad de agua y calibración',
    text:
      'Prioriza ósmosis o destilada; grifo solo si conoces dureza y ajustas. Calibra medidor de pH cada 7–10 días y limpia sondas de EC.',
  },
  {
    id: 'temperatura',
    title: 'Temperatura de solución',
    text:
      'Mantén el líquido entre ~18 y 20 °C; por encima de ~23 °C baja el oxígeno disuelto y aumenta riesgo de patógenos en raíz.',
  },
  {
    id: 'luz',
    title: 'Luz y genética',
    text:
      'Ajusta potencia y fotoperíodo a la variedad (foto vs auto). Sube EC y luz de forma progresiva; evita picos bruscos en plántulas.',
  },
  {
    id: 'nutricion',
    title: 'Nutrición por fases',
    text:
      'Germinación/early veg: EC baja; sube en vegetación; estabiliza en floración según tabla de la cepa. Flush solo al final si tu línea lo recomienda.',
  },
  {
    id: 'registro',
    title: 'Registro diario',
    text:
      'Anota pH, EC, volumen, temperatura de agua y síntomas. Las tendencias importan más que un único valor puntual.',
  },
  {
    id: 'legal',
    title: 'Entorno y legalidad (España)',
    text:
      'Cultivo privado para autoconsumo; evita visibilidad desde vía pública. Esta app es orientativa, no sustituye normativa ni asesoría jurídica.',
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
  const el = document.querySelector('.nav-item[data-view="inicio"]');
  if (el) nav(el, 'inicio');
}

function goToConfigChecklist() {
  const el = document.querySelector('.nav-item[data-view="cultivo"]');
  if (el) nav(el, 'cultivo');
}

function goToVariedades() {
  const el = document.querySelector('.nav-item[data-view="variedades"]');
  if (el) nav(el, 'variedades');
}

function goToNutrientes() {
  const el = document.querySelector('.nav-item[data-view="nutrientes"]');
  if (el) nav(el, 'nutrientes');
}

function goToMonitor() {
  const el = document.querySelector('.nav-item[data-view="monitor"]');
  if (el) nav(el, 'monitor');
}

function goToSemanas() {
  const el = document.querySelector('.nav-item[data-view="semanas"]');
  if (el) nav(el, 'semanas');
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

  let statusClass = 'info';
  let statusTitle = 'Siguiente paso';
  let statusText =
    'Ejecuta el checklist de configuración: sistema, ubicación, clima, variedad y nutrición. Después podrás monitorizar y ver el calendario.';

  if (hasGrow) {
    statusClass = 'info';
    statusTitle = 'Cultivo activo';
    statusText = `Tienes un cultivo en curso: ${myGrow.strain.name}. Usa Monitor para mediciones y alertas, y Calendario para la planificación semanal.`;
  } else if (appDone || skipWelcome) {
    statusClass = 'warn';
    statusTitle = 'Configuración rápida o asistente clásico';
    statusText =
      skipWelcome && !appDone
        ? 'Tienes activado el modo desarrollo (sin bienvenida). En Mi Cultivo completa el asistente o vuelve a marcar la bienvenida para el checklist completo.'
        : 'Puedes elegir una variedad en Variedades y pulsar «Iniciar cultivo», o abrir Mi Cultivo para el flujo guiado.';
  }

  const checklistRows = expertChecklistItems
    .map(
      (item) => `
    <label class="expert-item">
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
    <div class="home-hero card">
      <div>
        <p class="home-kicker"><i class="ti ti-droplet"></i> Hidrocultivo · Cannabis · Autoconsumo</p>
        <h2 class="home-title">Tu centro de control</h2>
        <p class="home-lead">Un solo lugar para configurar el sistema como recomiendan cultivadores hidropónicos, calcular nutrición según el agua y llevar un registro serio del cultivo.</p>
        <div class="home-cta-row">
          <button type="button" class="btn btn-primary" onclick="goToConfigChecklist()"><i class="ti ti-list-check"></i> Ejecutar checklist de configuración</button>
          <button type="button" class="btn btn-ghost" onclick="goToVariedades()"><i class="ti ti-seedling"></i> Elegir variedad</button>
          <button type="button" class="btn btn-ghost" onclick="goToNutrientes()"><i class="ti ti-flask"></i> Nutrientes top 10</button>
          <button type="button" class="btn btn-ghost" ${hasGrow ? '' : 'disabled title="Activa un cultivo primero"'} onclick="goToMonitor()"><i class="ti ti-dashboard"></i> Monitor</button>
        </div>
      </div>
      <div class="home-side">
        <div class="alert ${statusClass} home-status"><i class="ti ti-info-circle"></i><div><strong>${statusTitle}</strong><p>${statusText}</p></div></div>
        <div class="home-progress">
          <div class="expert-progress-label">Checklist experto (referencia)</div>
          <div class="expert-progress-bar"><span style="width:${pct}%"></span></div>
          <div class="expert-progress-meta">${done} / ${total} revisados · no sustituye tu criterio</div>
          <button type="button" class="btn btn-ghost expert-reset" onclick="resetExpertChecklist()">Reiniciar lista</button>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title"><i class="ti ti-clipboard-check"></i> Checklist de buenas prácticas (expertos hidro + cannabis)</div>
      </div>
      <p class="home-checklist-intro">Marca cada punto cuando lo tengas claro en tu instalación. Es una guía; el botón principal arriba abre el <strong>checklist operativo</strong> (formularios, clima y activación del cultivo).</p>
      <div class="expert-checklist">${checklistRows}</div>
    </div>
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
