// Navegación — barra inferior tipo app + hash

const MORE_VIEWS = [
  'consejos',
  'variedades',
  'nutrientes',
  'ambiental',
  'legal',
  'accesibilidad',
];

function closeMoreMenu() {
  const m = document.getElementById('moreMenu');
  if (m) {
    m.classList.remove('open');
    m.setAttribute('aria-hidden', 'true');
  }
  const btn = document.getElementById('moreNavBtn');
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

function toggleMoreMenu() {
  const m = document.getElementById('moreMenu');
  if (!m) return;
  const open = m.classList.toggle('open');
  m.setAttribute('aria-hidden', open ? 'false' : 'true');
  const btn = document.getElementById('moreNavBtn');
  if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (open && btn) {
    window.requestAnimationFrame(() => {
      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });
  }
}

function scrollBottomNavToActive(view) {
  const nav = document.querySelector('.bottom-nav');
  const key = MORE_VIEWS.includes(view) ? 'more' : view;
  const btn = document.querySelector(`.bottom-nav-item[data-nav-view="${key}"]`);
  if (!nav || !btn) return;
  window.requestAnimationFrame(() => {
    btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  });
}

function openAccesibilidadFromMore() {
  closeMoreMenu();
  navTo('accesibilidad');
}

/** Vuelve a Inicio desde pantallas de referencia (Más) o Apariencia. */
function closeMoreHubView() {
  navTo('inicio');
}

function closeAccesibilidadView() {
  closeMoreHubView();
}

function renderAccesibilidad() {
  const host = document.getElementById('accesibilidadContent');
  if (!host) return;
  const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  const exp = typeof getUiExperienceMode === 'function' ? getUiExperienceMode() : 'guided';
  host.innerHTML = `
    <div class="card">
      <div class="card-header"><div class="card-title"><i class="ti ti-contrast"></i> Esquema de color</div></div>
      <p class="body-prose body-prose--tight">Modo oscuro reduce el brillo en ambientes con poca luz; modo claro mejora la lectura bajo luz intensa.</p>
      <div class="a11y-theme-seg" role="radiogroup" aria-label="Tema de la interfaz">
        <button type="button" role="radio" aria-checked="${current === 'dark' ? 'true' : 'false'}" class="a11y-theme-btn ${current === 'dark' ? 'is-active' : ''}" onclick="setAppTheme('dark')">
          <i class="ti ti-moon" aria-hidden="true"></i> Oscuro
        </button>
        <button type="button" role="radio" aria-checked="${current === 'light' ? 'true' : 'false'}" class="a11y-theme-btn ${current === 'light' ? 'is-active' : ''}" onclick="setAppTheme('light')">
          <i class="ti ti-sun" aria-hidden="true"></i> Claro
        </button>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title"><i class="ti ti-school"></i> Experiencia de uso</div></div>
      <p class="body-prose body-prose--tight"><strong>Guiado</strong> prioriza pasos claros y poca jerga. <strong>Aprendizaje · avanzado</strong> muestra contexto técnico extra (VPD, perfiles de espacio, extractor, cuándo compensa más equipo).</p>
      <div class="a11y-theme-seg a11y-exp-seg" role="radiogroup" aria-label="Modo de experiencia">
        <button type="button" role="radio" aria-checked="${exp === 'guided' ? 'true' : 'false'}" class="a11y-theme-btn ${exp === 'guided' ? 'is-active' : ''}" onclick="setUiExperienceMode('guided')">
          <i class="ti ti-hand-stop" aria-hidden="true"></i> Guiado
        </button>
        <button type="button" role="radio" aria-checked="${exp === 'learning' ? 'true' : 'false'}" class="a11y-theme-btn ${exp === 'learning' ? 'is-active' : ''}" onclick="setUiExperienceMode('learning')">
          <i class="ti ti-book" aria-hidden="true"></i> Aprendizaje
        </button>
      </div>
    </div>`;
}

function updateTopbarBackVisibility() {
  /* Barra superior retirada: sin cromo de «atrás» propio. */
}

function applyNavView(view) {
  closeMoreMenu();
  document.querySelectorAll('[data-nav-view]').forEach((n) => {
    const nv = n.getAttribute('data-nav-view');
    if (!nv) return;
    const active = nv === view || (nv === 'more' && MORE_VIEWS.includes(view));
    n.classList.toggle('active', active);
  });

  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  const target = document.getElementById('view-' + view);
  if (target) target.classList.add('active');

  scrollBottomNavToActive(view);

  if (view === 'inicio' && typeof renderInicio === 'function') renderInicio();
  if (view === 'cultivo' && typeof renderCultivo === 'function') renderCultivo();
  if (view === 'monitor' && typeof renderMonitor === 'function') renderMonitor();
  if (view === 'semanas' && typeof renderSemanas === 'function') renderSemanas();
  if (view === 'nutrientes' && typeof renderNutrientes === 'function') renderNutrientes();
  if (view === 'historial' && typeof renderHistorial === 'function') renderHistorial();
  if (view === 'climatologia') {
    if (typeof renderClimatologia === 'function') renderClimatologia();
    window.requestAnimationFrame(() => {
      if (typeof refreshClimatologiaOnTabFocus === 'function') refreshClimatologiaOnTabFocus();
    });
  }
  if (view === 'consejos' && typeof renderConsejosPage === 'function') renderConsejosPage();
  if (view === 'accesibilidad' && typeof renderAccesibilidad === 'function') renderAccesibilidad();
}

function navTo(view) {
  if (!document.getElementById('view-' + view)) view = 'inicio';
  if ((location.hash.slice(1) || 'inicio') === view) {
    applyNavView(view);
    updateTopbarBackVisibility();
    return;
  }
  location.hash = view;
}

function nav(el, view) {
  navTo(view);
}

function initNavigationFromHash() {
  let v = location.hash.slice(1);
  if (!v) {
    applyNavView('inicio');
    updateTopbarBackVisibility();
    return;
  }
  if (!document.getElementById('view-' + v)) v = 'inicio';
  applyNavView(v);
  updateTopbarBackVisibility();
}

window.addEventListener('hashchange', () => {
  let v = location.hash.slice(1);
  if (!v) v = 'inicio';
  if (!document.getElementById('view-' + v)) v = 'inicio';
  applyNavView(v);
  updateTopbarBackVisibility();
});

window.navTo = navTo;
window.nav = nav;
window.toggleMoreMenu = toggleMoreMenu;
window.closeMoreMenu = closeMoreMenu;
window.initNavigationFromHash = initNavigationFromHash;
window.applyNavView = applyNavView;
window.openAccesibilidadFromMore = openAccesibilidadFromMore;
window.closeAccesibilidadView = closeAccesibilidadView;
window.closeMoreHubView = closeMoreHubView;
window.renderAccesibilidad = renderAccesibilidad;
