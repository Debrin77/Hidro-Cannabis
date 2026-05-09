// Navegación — barra inferior tipo app

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

function navTo(view) {
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

  if (view === 'inicio') renderInicio();
  if (view === 'cultivo') renderCultivo();
  if (view === 'monitor') renderMonitor();
  if (view === 'semanas') renderSemanas();
  if (view === 'nutrientes') renderNutrientes();
  if (view === 'historial') renderHistorial();
}

function nav(el, view) {
  navTo(view);
}

window.navTo = navTo;
window.nav = nav;
window.toggleMoreMenu = toggleMoreMenu;
window.closeMoreMenu = closeMoreMenu;
