/**
 * Bienvenida, guía primeros pasos y hints de pestaña.
 * Tras hc-bootstrap-pin.js; antes de init/nav.
 */
// ══════════════════════════════════════════════════
// ONBOARDING — hints de contexto (PRP) + bienvenida + coach barra de pestañas
// ══════════════════════════════════════════════════
const HC_GUIDE_DISMISS_KEY = 'hc_guia_primer_dia_dismiss';
const HC_ONBOARD_RIEGO_VISIT_KEY = 'hc_onboarding_visit_riego';
const HC_HINT_CTX = { mediciones: 'hc_hint_ctx_med', sistema: 'hc_hint_ctx_sis', riego: 'hc_hint_ctx_riego' };
const HC_BIENVENIDA_KEY = 'hc_bienvenida_v2026_4';
const HC_TAB_BAR_COACH_KEY = 'hc_tab_bar_coach_dismiss_v2';
const HC_WELCOME_THEME_PREVIEW_KEY = 'hc_welcome_theme_preview';

let _tabCoachRetryTimer = null;

function _clearTabCoachRetryTimer() {
  if (_tabCoachRetryTimer) {
    try { clearTimeout(_tabCoachRetryTimer); } catch (_) {}
    _tabCoachRetryTimer = null;
  }
}

function initWelcomeValueCarousel() {
  const ov = document.getElementById('welcomeOverlay');
  if (!ov) return;
  const grid = ov.querySelector('.welcome-value-grid');
  const dotsWrap = document.getElementById('welcomeValueDots');
  if (!grid || !dotsWrap) return;

  const cards = Array.from(grid.querySelectorAll('.welcome-value-card'));
  if (cards.length <= 1) {
    dotsWrap.innerHTML = '';
    return;
  }

  // Crear dots (idempotente)
  if (dotsWrap.children.length !== cards.length) {
    dotsWrap.innerHTML = '';
    cards.forEach((_, idx) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'welcome-dot' + (idx === 0 ? ' is-active' : '');
      b.setAttribute('aria-label', 'Tarjeta ' + (idx + 1) + ' de ' + cards.length);
      b.setAttribute('aria-selected', idx === 0 ? 'true' : 'false');
      b.setAttribute('role', 'tab');
      b.tabIndex = idx === 0 ? 0 : -1;
      b.addEventListener('click', () => {
        try {
          cards[idx].scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
        } catch (_) {
          try { grid.scrollLeft = cards[idx].offsetLeft; } catch (_) {}
        }
      });
      dotsWrap.appendChild(b);
    });
  }

  let raf = 0;
  const update = () => {
    raf = 0;
    try {
      const gRect = grid.getBoundingClientRect();
      const mid = gRect.left + gRect.width / 2;
      let bestI = 0;
      let bestD = Infinity;
      for (let i = 0; i < cards.length; i++) {
        const r = cards[i].getBoundingClientRect();
        const cMid = r.left + r.width / 2;
        const d = Math.abs(cMid - mid);
        if (d < bestD) { bestD = d; bestI = i; }
      }
      const dots = Array.from(dotsWrap.children);
      dots.forEach((dEl, i) => {
        const on = i === bestI;
        dEl.classList.toggle('is-active', on);
        dEl.setAttribute('aria-selected', on ? 'true' : 'false');
        dEl.tabIndex = on ? 0 : -1;
      });
    } catch (_) {}
  };

  const onScroll = () => {
    if (raf) return;
    raf = requestAnimationFrame(update);
  };

  if (!grid._hcWelcomeDotsBound) {
    grid._hcWelcomeDotsBound = true;
    grid.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => { try { update(); } catch (_) {} }, { passive: true });
  }
  setTimeout(() => { try { update(); } catch (_) {} }, 80);
}

/**
 * Muestra el coach de la barra de pestañas (fase 2) si no se descartó y no hay bienvenida ni asistente encima.
 */
function tryShowTabBarCoachDeferred(attempt) {
  _tabCoachRetryTimer = null;
  const max = 28;
  const n = typeof attempt === 'number' ? attempt : 0;
  let dismissed = false;
  try { dismissed = localStorage.getItem(HC_TAB_BAR_COACH_KEY) === '1'; } catch (_) {}
  if (dismissed) return;
  if (document.body.classList.contains('hc-welcome-open')) {
    if (n < max) _tabCoachRetryTimer = setTimeout(() => tryShowTabBarCoachDeferred(n + 1), 420);
    return;
  }
  const so = document.getElementById('setupOverlay');
  if (so && so.classList.contains('open')) {
    if (n < max) _tabCoachRetryTimer = setTimeout(() => tryShowTabBarCoachDeferred(n + 1), 420);
    return;
  }
  const el = document.getElementById('hcTabBarCoach');
  if (!el) return;
  el.classList.remove('setup-hidden');
  try { document.body.classList.add('hc-tab-coach-open'); } catch (_) {}
}

function scheduleTabBarCoach(delayMs) {
  let dismissed = false;
  try { dismissed = localStorage.getItem(HC_TAB_BAR_COACH_KEY) === '1'; } catch (_) {}
  if (dismissed) return;
  _clearTabCoachRetryTimer();
  const d = typeof delayMs === 'number' ? delayMs : 900;
  _tabCoachRetryTimer = setTimeout(() => tryShowTabBarCoachDeferred(0), d);
}

/** Primera instalación: aún no hay config guardada (solo plantilla), sin historial de mezcla/medición ni plantas en esquema. */
function hcEsPrimeraVezAsistenteInstalacion() {
  try {
    const cfg = state.configTorre;
    const plantilla = !!(cfg && cfg.hcPlantillaAutogenerada);
    const hayConfig = !!(cfg && !plantilla);
    const hayPlantas =
      typeof getNivelesActivos === 'function' &&
      getNivelesActivos().some(n => state.torre[n] && state.torre[n].some(c => c && c.variedad));
    return !hayConfig && !state.ultimaRecarga && !state.ultimaMedicion && !hayPlantas;
  } catch (_) {
    return false;
  }
}

function dismissTabBarCoach() {
  try { localStorage.setItem(HC_TAB_BAR_COACH_KEY, '1'); } catch (_) {}
  _clearTabCoachRetryTimer();
  const el = document.getElementById('hcTabBarCoach');
  if (el) el.classList.add('setup-hidden');
  try { document.body.classList.remove('hc-tab-coach-open'); } catch (_) {}
  setTimeout(() => {
    try {
      const so = document.getElementById('setupOverlay');
      if (so && so.classList.contains('open')) return;
    } catch (_) {}
    // No forzar de nuevo el asistente si ya hay instalación guardada (p. ej. tras configurar y cerrar flujos).
    try {
      if (typeof hcEsPrimeraVezAsistenteInstalacion === 'function' && !hcEsPrimeraVezAsistenteInstalacion()) {
        return;
      }
    } catch (_) {}
    if (typeof abrirSetup === 'function') abrirSetup();
  }, 450);
}

function welcomeCarouselSkip() {
  cerrarBienvenidaPrimeraVez();
}

function welcomeEmpezar() {
  cerrarBienvenidaPrimeraVez();
  try {
    if (typeof goTab === 'function') goTab('inicio');
  } catch (_) {}
}

function welcomeAbrirSetup() {
  cerrarBienvenidaPrimeraVez({ skipLanzarSetup: true });
  try {
    setTimeout(() => {
      if (typeof abrirSetup === 'function') abrirSetup();
    }, 450);
  } catch (_) {}
}

function setWelcomeTheme(theme) {
  const ov = document.getElementById('welcomeOverlay');
  if (!ov) return;
  const t = theme === 'dark' ? 'dark' : 'light';
  ov.setAttribute('data-welcome-theme', t);
  const lightBtn = document.getElementById('welcomeThemeBtnLight');
  const darkBtn = document.getElementById('welcomeThemeBtnDark');
  if (lightBtn) {
    const on = t === 'light';
    lightBtn.classList.toggle('is-active', on);
    lightBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  if (darkBtn) {
    const on = t === 'dark';
    darkBtn.classList.toggle('is-active', on);
    darkBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  try { localStorage.setItem(HC_WELCOME_THEME_PREVIEW_KEY, t); } catch (_) {}
}

function applyWelcomeScrollLock(open) {
  try {
    const v = open ? 'auto' : '';
    const x = open ? 'hidden' : '';
    try {
      document.documentElement.classList.toggle('hc-welcome-open', !!open);
    } catch (_) {}
    document.documentElement.style.overflowY = v;
    document.documentElement.style.overflowX = x;
    document.documentElement.style.overscrollBehaviorY = open ? 'auto' : '';
    document.documentElement.style.overscrollBehaviorX = open ? 'none' : '';
    document.documentElement.style.touchAction = open ? 'pan-y' : '';
    document.body.style.overflowY = v;
    document.body.style.overflowX = x;
    document.body.style.overscrollBehaviorY = open ? 'auto' : '';
    document.body.style.overscrollBehaviorX = open ? 'none' : '';
    document.body.style.touchAction = open ? 'pan-y' : '';
  } catch (_) {}
}

function resetBienvenidaParaPruebas() {
  try { localStorage.removeItem(HC_BIENVENIDA_KEY); } catch (_) {}
  try {
    const ov = document.getElementById('welcomeOverlay');
    if (!ov) {
      if (typeof showToast === 'function') showToast('No se encontró la bienvenida', true);
      return;
    }
    if (!ov.classList.contains('setup-hidden')) {
      if (typeof showToast === 'function') showToast('La bienvenida ya está abierta');
      return;
    }
    // Apertura forzada para pruebas en móvil: evita bloqueos por reglas de "ya hay datos".
    ov.classList.remove('setup-hidden');
    ov.setAttribute('aria-hidden', 'false');
    try {
      const tSaved = localStorage.getItem(HC_WELCOME_THEME_PREVIEW_KEY);
      setWelcomeTheme(tSaved === 'dark' ? 'dark' : 'light');
    } catch (_) {
      setWelcomeTheme('light');
    }
    try { document.body.classList.add('hc-welcome-open'); } catch (_) {}
    applyWelcomeScrollLock(true);
    try { initWelcomeValueCarousel(); } catch (_) {}
    try { document.addEventListener('keydown', _welcomeGuideOnKeydown); } catch (_) {}
    try {
      const nb = document.getElementById('welcomeBtnEmpezar');
      if (nb && typeof nb.focus === 'function') setTimeout(() => nb.focus(), 50);
    } catch (_) {}
    const abierta = !ov.classList.contains('setup-hidden');
    if (typeof showToast === 'function') {
      showToast(abierta ? 'Guia de bienvenida reabierta' : 'No se pudo reabrir la bienvenida', !abierta);
    }
  } catch (_) {
    if (typeof showToast === 'function') showToast('No se pudo reabrir la bienvenida', true);
  }
}

/**
 * Si ya hay cultivo / mediciones / registro guardados, no forzar la bienvenida:
 * evita bloquear la app cuando falta la clave en localStorage (cambio de navegador, borrado parcial, etc.).
 * No usamos solo `configTorre` con claves: en arranque puede existir un borrador mínimo sin ser “usuario ya configurado”.
 */
function _medicionObjetoTieneDatosReales(u) {
  if (!u || typeof u !== 'object') return false;
  if (String(u.fecha || '').trim()) return true;
  const ec = u.ec;
  const ph = u.ph;
  const vol = u.vol;
  const temp = u.temp;
  const n = v => v != null && v !== '' && Number.isFinite(Number(v));
  if (n(ec) && Number(ec) > 50) return true;
  if (n(ph) && Number(ph) >= 3 && Number(ph) <= 10) return true;
  if (n(vol) && Number(vol) > 0) return true;
  if (n(temp)) return true;
  return false;
}

function hayDatosHidrocultivoRelevantes() {
  try {
    if (!state || typeof state !== 'object') return false;
    const plantilla = !!(state.configTorre && state.configTorre.hcPlantillaAutogenerada);
    if (!plantilla) {
      if (Array.isArray(state.mediciones) && state.mediciones.length > 0) return true;
      if (Array.isArray(state.registro) && state.registro.length > 0) return true;
    }
    if (state.ultimaMedicion && typeof state.ultimaMedicion === 'object') {
      if (_medicionObjetoTieneDatosReales(state.ultimaMedicion)) return true;
    }
    if (state.ultimaRecarga && typeof state.ultimaRecarga === 'object') {
      const r = state.ultimaRecarga;
      if (String(r.fecha || '').trim()) return true;
      if (r.volumen != null && r.volumen !== '' && Number.isFinite(Number(r.volumen)) && Number(r.volumen) > 0) return true;
    }
    if (typeof initTorres === 'function') {
      try { initTorres(); } catch (_) {}
    }
    if (Array.isArray(state.torres)) {
      for (let i = 0; i < state.torres.length; i++) {
        const tor = state.torres[i];
        if (!tor || typeof tor !== 'object') continue;
        if (Array.isArray(tor.mediciones) && tor.mediciones.length) return true;
        if (Array.isArray(tor.registro) && tor.registro.length) return true;
      }
    }
    if (typeof getNivelesActivos === 'function' && state.torre) {
      const nivs = getNivelesActivos();
      for (let ni = 0; ni < nivs.length; ni++) {
        const row = state.torre[nivs[ni]];
        if (row && row.some(c => c && String(c.variedad || '').trim())) return true;
      }
    }
  } catch (_) {}
  return false;
}

function _welcomeGuideOnKeydown(e) {
  if (!document.body.classList.contains('hc-welcome-open')) return;
  if (e.key === 'Escape') {
    welcomeCarouselSkip();
    e.preventDefault();
  }
}

function tabBarCoachYaDescartado() {
  try {
    return localStorage.getItem(HC_TAB_BAR_COACH_KEY) === '1';
  } catch (_) {
    return true;
  }
}

function lanzarSetupOChecklistSiCorresponde() {
  if (!hcEsPrimeraVezAsistenteInstalacion()) return;
  // Tras la bienvenida: primero el coach de la barra («Entendido»); al cerrarlo se abre el asistente (ver dismissTabBarCoach).
  if (tabBarCoachYaDescartado()) {
    setTimeout(() => {
      if (typeof abrirSetup === 'function') abrirSetup();
    }, 450);
  }
  // No abrir el checklist automáticamente en cada arranque.
}

function mostrarBienvenidaOContinuarArranque(opts) {
  const forceShow = !!(opts && opts.forceShow);
  let visto = false;
  try { visto = localStorage.getItem(HC_BIENVENIDA_KEY) === '1'; } catch (_) {}
  if (visto && !forceShow) {
    lanzarSetupOChecklistSiCorresponde();
    scheduleTabBarCoach(1100);
    return;
  }
  if (!forceShow && hayDatosHidrocultivoRelevantes()) {
    try { localStorage.setItem(HC_BIENVENIDA_KEY, '1'); } catch (_) {}
    lanzarSetupOChecklistSiCorresponde();
    scheduleTabBarCoach(1100);
    return;
  }
  const ov = document.getElementById('welcomeOverlay');
  if (ov) {
    ov.classList.remove('setup-hidden');
    ov.setAttribute('aria-hidden', 'false');
    try { document.body.classList.add('hc-welcome-open'); } catch (_) {}
    applyWelcomeScrollLock(true);
    try { initWelcomeValueCarousel(); } catch (_) {}
    try {
      const tSaved = localStorage.getItem(HC_WELCOME_THEME_PREVIEW_KEY);
      setWelcomeTheme(tSaved === 'dark' ? 'dark' : 'light');
    } catch (_) {
      setWelcomeTheme('light');
    }
    try { document.addEventListener('keydown', _welcomeGuideOnKeydown); } catch (_) {}
    try {
      const nb = document.getElementById('welcomeBtnEmpezar');
      if (nb && typeof nb.focus === 'function') setTimeout(() => nb.focus(), 50);
    } catch (_) {}
    return;
  }
  lanzarSetupOChecklistSiCorresponde();
}

/**
 * @param {{ skipLanzarSetup?: boolean }} [opts] — si el usuario elige abrir el asistente desde la guía, evitar doble `abrirSetup`.
 */
function cerrarBienvenidaPrimeraVez(opts) {
  const chk = document.getElementById('welcomeChkNoMas');
  const recordarCerrar = !chk || chk.checked;
  if (recordarCerrar) {
    try { localStorage.setItem(HC_BIENVENIDA_KEY, '1'); } catch (_) {}
  }
  const ov = document.getElementById('welcomeOverlay');
  if (ov) {
    ov.classList.add('setup-hidden');
    ov.setAttribute('aria-hidden', 'true');
  }
  try { document.body.classList.remove('hc-welcome-open'); } catch (_) {}
  applyWelcomeScrollLock(false);
  try { document.removeEventListener('keydown', _welcomeGuideOnKeydown); } catch (_) {}
  if (!opts || !opts.skipLanzarSetup) {
    lanzarSetupOChecklistSiCorresponde();
  }
  scheduleTabBarCoach(1300);
}

function dismissTabContextHint(which) {
  const k = HC_HINT_CTX[which];
  if (k) {
    try { localStorage.setItem(k, '1'); } catch (_) {}
  }
  const id = which === 'mediciones' ? 'tabContextHintMediciones' : which === 'sistema' ? 'tabContextHintSistema' : which === 'riego' ? 'tabContextHintRiego' : null;
  const el = id ? document.getElementById(id) : null;
  if (el) el.classList.add('setup-hidden');
}

function actualizarTabContextHints(tab) {
  const map = {
    mediciones: 'tabContextHintMediciones',
    sistema: 'tabContextHintSistema',
    riego: 'tabContextHintRiego',
  };
  const id = map[tab];
  if (!id) return;
  const el = document.getElementById(id);
  if (!el) return;
  const key = HC_HINT_CTX[tab];
  let seen = false;
  try { seen = key && localStorage.getItem(key) === '1'; } catch (_) {}
  if (seen) el.classList.add('setup-hidden');
  else el.classList.remove('setup-hidden');
}

function actualizarQuickActionsNoviceMode() {
  const wrap = document.getElementById('quickActionsWrap');
  const more = document.getElementById('quickActionsMore');
  if (!wrap || !more) return;
  const exp = !!(state && state.configTorre && state.ultimaMedicion);
  wrap.classList.toggle('quick-actions-wrap--experienced', exp);
  more.open = exp;
}

// ══════════════════════════════════════════════════
// Tras el asistente: Sistema (cultivos) → oferta de checklist
// ══════════════════════════════════════════════════

/** El rail va en el flujo del documento (debajo del título), no fijo abajo, para no tapar el esquema / modales de cesta. */
function hcMountPostSetupChecklistRailInTabSistema() {
  const rail = document.getElementById('hcPostSetupChecklistRail');
  const tab = document.getElementById('tab-sistema');
  if (!rail || !tab) return;
  const h1 = tab.querySelector('h1.section-title');
  if (h1) {
    if (rail.previousElementSibling !== h1) {
      h1.insertAdjacentElement('afterend', rail);
    }
    return;
  }
  if (rail.parentNode !== tab) tab.insertBefore(rail, tab.firstChild);
}

function ensurePostSetupChecklistRail() {
  let el = document.getElementById('hcPostSetupChecklistRail');
  if (el) {
    hcMountPostSetupChecklistRailInTabSistema();
    return el;
  }
  el = document.createElement('div');
  el.id = 'hcPostSetupChecklistRail';
  el.className = 'hc-post-setup-rail setup-hidden';
  el.setAttribute('role', 'region');
  el.setAttribute('aria-label', 'Siguiente paso: cultivos y checklist');
  el.innerHTML =
    '<div class="hc-post-setup-rail-inner">' +
      '<div class="hc-post-setup-rail-track" aria-hidden="true">' +
        '<span class="hc-post-setup-rail-chip hc-post-setup-rail-chip--done">1 · Instalación</span>' +
        '<span class="hc-post-setup-rail-arrow" aria-hidden="true">→</span>' +
        '<span class="hc-post-setup-rail-chip hc-post-setup-rail-chip--active">2 · Cultivo</span>' +
        '<span class="hc-post-setup-rail-arrow" aria-hidden="true">→</span>' +
        '<span class="hc-post-setup-rail-chip hc-post-setup-rail-chip--next">3 · Depósito</span>' +
      '</div>' +
      '<div class="hc-post-setup-rail-title">Cultivos en el esquema</div>' +
      '<p class="hc-post-setup-rail-text" id="hcPostSetupRailText">' +
        'Desplázate al <strong>esquema más abajo</strong> y completa cada cesta: variedad, <strong>fecha de trasplante al hidro</strong> y procedencia. ' +
        'Cuando los datos estén listos, se abre solo el <strong>checklist del depósito</strong> (misma línea visual que el asistente).' +
      '</p>' +
      '<p class="hc-post-setup-rail-status setup-hidden" id="hcPostSetupRailStatus" role="status"></p>' +
      '<div class="hc-post-setup-rail-actions">' +
        '<button type="button" class="btn btn-primary hc-post-setup-rail-btn-main" id="hcPostSetupBtnChecklist">' +
          'Continuar al checklist' +
        '</button>' +
        '<button type="button" class="btn btn-ghost hc-post-setup-rail-btn-later" id="hcPostSetupBtnLater">' +
          'Más tarde' +
        '</button>' +
      '</div>' +
    '</div>';
  const tabSistema = document.getElementById('tab-sistema');
  const h1Sistema = tabSistema && tabSistema.querySelector('h1.section-title');
  if (h1Sistema) {
    h1Sistema.insertAdjacentElement('afterend', el);
  } else if (tabSistema) {
    tabSistema.insertBefore(el, tabSistema.firstChild);
  } else {
    document.body.appendChild(el);
  }
  hcMountPostSetupChecklistRailInTabSistema();
  const b1 = document.getElementById('hcPostSetupBtnChecklist');
  const b2 = document.getElementById('hcPostSetupBtnLater');
  if (b1) b1.addEventListener('click', () => hcAccionChecklistPostSetupDesdeSistema());
  if (b2) b2.addEventListener('click', () => hcPostSetupChecklistMasTarde());
  return el;
}

function actualizarPostSetupChecklistRail() {
  const el = document.getElementById('hcPostSetupChecklistRail');
  if (!state || !state.hcPostSetupChecklistPendiente) {
    if (el) el.classList.add('setup-hidden');
    return;
  }
  if (typeof currentTab !== 'undefined' && currentTab !== 'sistema') {
    if (el) el.classList.add('setup-hidden');
    return;
  }
  ensurePostSetupChecklistRail();
  hcMountPostSetupChecklistRailInTabSistema();
  const rail = document.getElementById('hcPostSetupChecklistRail');
  if (!rail) return;
  rail.classList.remove('setup-hidden');
  const st = document.getElementById('hcPostSetupRailStatus');
  const bloqueado =
    typeof torreBloqueaChecklistPorFaltaDatosCultivo === 'function' &&
    torreBloqueaChecklistPorFaltaDatosCultivo();
  const sinVariedad =
    typeof torreTieneAlgunaVariedadAsignada === 'function' && !torreTieneAlgunaVariedadAsignada();
  const bloqueadoUi = !!bloqueado || sinVariedad;
  if (st) {
    if (bloqueadoUi) {
      const sinNinguna = sinVariedad;
      st.textContent = sinNinguna
        ? 'Indica al menos un cultivo en el esquema; luego completa fechas si usas EC automático. Al estar listo, el checklist se abre solo.'
        : 'Revisa las cestas con cultivo: falta fecha u origen según lo que marques en cada ficha. Cuando quede listo, el checklist se abrirá solo.';
      st.classList.remove('setup-hidden');
    } else {
      st.textContent = '';
      st.classList.add('setup-hidden');
    }
  }
  const btn = document.getElementById('hcPostSetupBtnChecklist');
  if (btn) {
    btn.disabled = !!bloqueadoUi;
    btn.setAttribute('aria-disabled', bloqueadoUi ? 'true' : 'false');
  }
}

/** Tras el asistente: al menos un cultivo y sin bloqueo de checklist (en automático: fechas/origen; en manual: siempre listo). */
function _hcPostSetupListoParaChecklistGuiado() {
  try {
    if (!state || !state.hcPostSetupChecklistPendiente) return false;
    if (typeof torreTieneAlgunaVariedadAsignada !== 'function' || !torreTieneAlgunaVariedadAsignada()) return false;
    if (typeof torreBloqueaChecklistPorFaltaDatosCultivo === 'function' && torreBloqueaChecklistPorFaltaDatosCultivo()) return false;
    return true;
  } catch (_) {
    return false;
  }
}

function hcNotificarCambioCultivoSistema() {
  try {
    if (!state || !state.hcPostSetupChecklistPendiente) {
      try {
        delete window._hcPostSetupPrevListo;
      } catch (_) {}
      if (typeof actualizarPostSetupChecklistRail === 'function') actualizarPostSetupChecklistRail();
      return;
    }
    const listo = _hcPostSetupListoParaChecklistGuiado();
    let prevListo = false;
    try {
      prevListo = window._hcPostSetupPrevListo === true;
    } catch (_) {}
    try {
      window._hcPostSetupPrevListo = listo;
    } catch (_) {}
    const transicion = listo && !prevListo;
    if (typeof actualizarPostSetupChecklistRail === 'function') actualizarPostSetupChecklistRail();
    if (transicion) hcEjecutarChecklistPostSetupTrasCultivosListos();
  } catch (_) {}
}

function hcEjecutarChecklistPostSetupTrasCultivosListos() {
  try {
    window._hcChecklistGuidedFlow = true;
  } catch (_) {}
  try {
    delete window._hcPostSetupPrevListo;
  } catch (_) {}
  try {
    delete state.hcPostSetupChecklistPendiente;
    if (typeof saveState === 'function') saveState();
  } catch (_) {}
  actualizarPostSetupChecklistRail();
  try {
    if (typeof goTab === 'function') goTab('inicio');
  } catch (_) {}
  setTimeout(() => {
    try {
      if (typeof preguntarIniciarChecklist === 'function') preguntarIniciarChecklist();
    } catch (e) {
      console.error(e);
    }
  }, 280);
}

function hcPostSetupChecklistMasTarde() {
  try {
    delete window._hcPostSetupPrevListo;
  } catch (_) {}
  try {
    delete window._hcChecklistGuidedFlow;
  } catch (_) {}
  try {
    delete state.hcPostSetupChecklistPendiente;
    if (typeof saveState === 'function') saveState();
  } catch (_) {}
  actualizarPostSetupChecklistRail();
  if (typeof showToast === 'function') {
    showToast('Cuando quieras: Inicio → recarga o Historial → checklist');
  }
}

function hcAccionChecklistPostSetupDesdeSistema() {
  if (typeof torreTieneAlgunaVariedadAsignada === 'function' && !torreTieneAlgunaVariedadAsignada()) {
    if (typeof showToast === 'function') {
      showToast('Indica al menos un cultivo en el esquema antes del checklist.', true);
    }
    actualizarPostSetupChecklistRail();
    return;
  }
  if (
    typeof torreBloqueaChecklistPorFaltaDatosCultivo === 'function' &&
    torreBloqueaChecklistPorFaltaDatosCultivo()
  ) {
    if (typeof mostrarChecklistBloqueadoCultivoSistema === 'function') {
      mostrarChecklistBloqueadoCultivoSistema({ desdeWizard: true, desdePostSetupRail: true });
    } else if (typeof showToast === 'function') {
      showToast('Completa variedad y fecha en las cestas con planta (Cultivo e instalación).', true);
    }
    actualizarPostSetupChecklistRail();
    return;
  }
  hcEjecutarChecklistPostSetupTrasCultivosListos();
}

function hcAbrirPrimeraFichaCultivoTrasWizard() {
  try {
    if (!state || !state.hcPostSetupChecklistPendiente) return;
    const so = document.getElementById('setupOverlay');
    if (so && so.classList.contains('open')) return;
    if (typeof getNivelesActivos !== 'function' || typeof openModal !== 'function') return;
    const niveles = getNivelesActivos();
    for (let i = 0; i < niveles.length; i++) {
      const n = niveles[i];
      const row = state.torre[n];
      if (!row || !row.length) continue;
      openModal(n, 0);
      return;
    }
  } catch (_) {}
}

function iniciarFlujoSistemaAntesChecklistPostSetup() {
  try {
    if (typeof goTab === 'function') goTab('sistema');
  } catch (_) {}
  setTimeout(() => {
    ensurePostSetupChecklistRail();
    actualizarPostSetupChecklistRail();
    try {
      const torreWrap = document.querySelector('#tab-sistema .torre-container');
      if (torreWrap && typeof torreWrap.scrollIntoView === 'function') {
        torreWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (_) {}
  }, 120);
  setTimeout(() => {
    hcAbrirPrimeraFichaCultivoTrasWizard();
  }, 520);
  setTimeout(() => {
    try {
      if (typeof hcNotificarCambioCultivoSistema === 'function') hcNotificarCambioCultivoSistema();
    } catch (_) {}
  }, 900);
  if (typeof showToast === 'function') {
    showToast(
      'Completa las cestas con cultivo (variedad, fecha, procedencia). Al estar listo, se abre el checklist del depósito en la misma línea visual que el asistente.'
    );
  }
}

