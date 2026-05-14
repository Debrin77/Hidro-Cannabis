/**
 * Apariencia: modo claro/oscuro/auto (sistema) persistido en localStorage (hcAppearance).
 */
(function () {
  var KEY = 'hcAppearance';
  var _mql = null;

  function readStored() {
    try {
      var v = localStorage.getItem(KEY);
      if (v === 'dark' || v === 'light' || v === 'auto') return v;
      return 'auto';
    } catch (e) {
      return 'auto';
    }
  }

  function getSystemPrefersDark() {
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    } catch (e) {
      return false;
    }
  }

  function resolveTheme(mode) {
    if (mode === 'dark') return 'dark';
    if (mode === 'light') return 'light';
    return getSystemPrefersDark() ? 'dark' : 'light';
  }

  function applyMode(mode) {
    var resolved = resolveTheme(mode);
    var dark = resolved === 'dark';
    document.documentElement.classList.toggle('hc-theme-dark', dark);
    var cs = document.querySelector('meta[name="color-scheme"]');
    if (cs) cs.setAttribute('content', dark ? 'dark' : 'light');
    try {
      localStorage.setItem(KEY, mode);
    } catch (e) {}
  }

  window.getHcAppearance = function () {
    return readStored();
  };

  window.setHcAppearance = function (mode) {
    var safe = (mode === 'dark' || mode === 'light' || mode === 'auto') ? mode : 'auto';
    applyMode(safe);
    syncHcAppearanceUi();
  };

  window.onHcAppearanceChange = function (value) {
    setHcAppearance(value);
  };

  function syncHcAppearanceUi() {
    var sel = document.getElementById('hcAppearanceSelect');
    if (sel) sel.value = getHcAppearance();
  }
  window.syncHcAppearanceUi = syncHcAppearanceUi;

  function bindSystemSchemeListener() {
    try {
      if (!window.matchMedia) return;
      _mql = window.matchMedia('(prefers-color-scheme: dark)');
      var onChange = function () {
        if (readStored() === 'auto') applyMode('auto');
      };
      if (typeof _mql.addEventListener === 'function') _mql.addEventListener('change', onChange);
      else if (typeof _mql.addListener === 'function') _mql.addListener(onChange);
    } catch (e) {}
  }

  document.addEventListener('DOMContentLoaded', syncHcAppearanceUi);
  bindSystemSchemeListener();
  applyMode(readStored());
})();
