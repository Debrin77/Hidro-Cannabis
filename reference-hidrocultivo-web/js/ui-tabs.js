/**
 * Pestañas principales: teclado (← → Home End) y tabindex roving (WCAG tablist).
 * Depende de goTab(id) definido en el bundle principal.
 */
(function () {
  var ORDER = ['inicio', 'mediciones', 'sistema', 'calendario', 'riego', 'meteo', 'historial', 'consejos', 'ayuda'];

  function tabButtons() {
    return ORDER.map(function (t) {
      return document.getElementById('btn-' + t);
    }).filter(Boolean);
  }

  function syncTabIndex() {
    tabButtons().forEach(function (btn) {
      var sel = btn.getAttribute('aria-selected') === 'true';
      btn.tabIndex = sel ? 0 : -1;
    });
  }

  function initHidroCultivoTabBarA11y() {
    var bar = document.querySelector('.tab-bar');
    if (!bar || bar._hcTabA11y) return;
    bar._hcTabA11y = true;

    bar.addEventListener('keydown', function (e) {
      var tabs = tabButtons();
      var cur = tabs.indexOf(document.activeElement);
      if (cur < 0) return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        var next = e.key === 'ArrowRight' ? cur + 1 : cur - 1;
        var ni = ((next % tabs.length) + tabs.length) % tabs.length;
        var id = ORDER[ni];
        if (id && typeof goTab === 'function') goTab(id);
        if (typeof window._hcSyncMainTabTabIndex === 'function') window._hcSyncMainTabTabIndex();
        var after = tabButtons()[ni];
        if (after) after.focus();
        return;
      }
      if (e.key === 'Home') {
        e.preventDefault();
        if (typeof goTab === 'function') goTab(ORDER[0]);
        if (typeof window._hcSyncMainTabTabIndex === 'function') window._hcSyncMainTabTabIndex();
        var h0 = tabButtons()[0];
        if (h0) h0.focus();
        return;
      }
      if (e.key === 'End') {
        e.preventDefault();
        if (typeof goTab === 'function') goTab(ORDER[ORDER.length - 1]);
        if (typeof window._hcSyncMainTabTabIndex === 'function') window._hcSyncMainTabTabIndex();
        var he = tabButtons()[tabs.length - 1];
        if (he) he.focus();
        return;
      }
    });

    syncTabIndex();
  }

  window._hcSyncMainTabTabIndex = syncTabIndex;
  window.initHidroCultivoTabBarA11y = initHidroCultivoTabBarA11y;
})();

/** Subpestañas Historial (misma idea: ← → Home End). */
(function () {
  var HORDER = ['mediciones', 'recargas', 'registro', 'diario'];

  function histTabButtons() {
    return HORDER.map(function (t) {
      return document.getElementById('htab-' + t);
    }).filter(Boolean);
  }

  function syncHistTabIndex() {
    histTabButtons().forEach(function (btn) {
      btn.tabIndex = btn.getAttribute('aria-selected') === 'true' ? 0 : -1;
    });
  }

  function initHistorialTabBarA11y() {
    var bar = document.querySelector('.hist-tabs');
    if (!bar || bar._hcHistTabA11y) return;
    bar._hcHistTabA11y = true;

    bar.addEventListener('keydown', function (e) {
      var tabs = histTabButtons();
      var cur = tabs.indexOf(document.activeElement);
      if (cur < 0) return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        var next = e.key === 'ArrowRight' ? cur + 1 : cur - 1;
        var ni = ((next % tabs.length) + tabs.length) % tabs.length;
        var id = HORDER[ni];
        if (id && typeof histTab === 'function') histTab(id);
        syncHistTabIndex();
        var after = tabs[ni];
        if (after) after.focus();
        return;
      }
      if (e.key === 'Home') {
        e.preventDefault();
        if (typeof histTab === 'function') histTab(HORDER[0]);
        syncHistTabIndex();
        var h0 = tabs[0];
        if (h0) h0.focus();
        return;
      }
      if (e.key === 'End') {
        e.preventDefault();
        if (typeof histTab === 'function') histTab(HORDER[HORDER.length - 1]);
        syncHistTabIndex();
        var he = tabs[tabs.length - 1];
        if (he) he.focus();
        return;
      }
    });

    syncHistTabIndex();
  }

  window._hcSyncHistorialTabTabIndex = syncHistTabIndex;
  window.initHistorialTabBarA11y = initHistorialTabBarA11y;
})();
