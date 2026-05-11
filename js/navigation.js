// Navegación — barra inferior tipo app + hash (botón atrás del sistema)

const MORE_VIEWS = ['consejos', 'variedades', 'nutrientes', 'ambiental', 'legal'];

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

function updateTopbarBackVisibility() {
  const btn = document.getElementById('topbarBackBtn');
  if (!btn) return;
  const raw = location.hash.slice(1);
  const show = raw !== '' && raw !== 'inicio';
  btn.hidden = !show;
  btn.setAttribute('aria-hidden', show ? 'false' : 'true');
}

function toggleThemeFromMenu() {
  closeMoreMenu();
  if (typeof toggleTheme === 'function') toggleTheme();
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
window.toggleThemeFromMenu = toggleThemeFromMenu;
