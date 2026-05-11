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

function enterApp() {
  const splash = document.getElementById('splashScreen');
  if (window.hydroSplashTimerId) {
    clearTimeout(window.hydroSplashTimerId);
    window.hydroSplashTimerId = null;
  }
  if (window.hydroSplashCountdownId) {
    clearInterval(window.hydroSplashCountdownId);
    window.hydroSplashCountdownId = null;
  }
  if (splash) splash.classList.add('hidden');
  window.setTimeout(() => {
    document.body.classList.remove('app-locked');
  }, 220);
}

function initSplashScreen() {
  const splash = document.getElementById('splashScreen');
  if (!splash) return;
  const timerText = document.getElementById('splashTimer');

  const q = new URLSearchParams(window.location.search);
  if (q.get('nosplash') === '1') {
    enterApp();
    return;
  }

  document.body.classList.add('app-locked');

  let secondsLeft = 3;
  if (timerText) timerText.textContent = `Entrando automaticamente en ${secondsLeft}s...`;
  window.hydroSplashCountdownId = setInterval(() => {
    secondsLeft -= 1;
    if (secondsLeft <= 0) return;
    if (timerText) timerText.textContent = `Entrando automaticamente en ${secondsLeft}s...`;
  }, 1000);

  window.hydroSplashTimerId = setTimeout(() => {
    enterApp();
  }, 3000);
}

initTheme();
loadAppConfig();
applyDevUrlParams();
initSplashScreen();
renderStrains('all');
renderNutrientes();
loadGrowState();
if (typeof initNavigationFromHash === 'function') {
  initNavigationFromHash();
}
renderInicio();
renderCultivo();
renderMonitor();
renderSemanas();
renderHistorial();
renderClimatologia();
if (typeof renderConsejosPage === 'function') renderConsejosPage();

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js?v=6').catch(() => {});
  });
}

window.enterApp = enterApp;
