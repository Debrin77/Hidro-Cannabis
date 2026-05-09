// Init

function applyDevUrlParams() {
  try {
    const q = new URLSearchParams(window.location.search);
    if (q.get('dev') === '1' || q.get('skipWelcome') === '1') {
      setSkipInitialWelcome(true);
    }
  } catch (_) {
    /* ignore */
  }
}

initTheme();
loadAppConfig();
applyDevUrlParams();
renderStrains('all');
renderNutrientes();
loadGrowState();
renderCultivo();
renderMonitor();
renderSemanas();
