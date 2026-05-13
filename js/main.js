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

  let secondsLeft = 2;
  if (timerText) timerText.textContent = `Entrando automáticamente en ${secondsLeft}s...`;
  window.hydroSplashCountdownId = setInterval(() => {
    secondsLeft -= 1;
    if (secondsLeft <= 0) return;
    if (timerText) timerText.textContent = `Entrando automáticamente en ${secondsLeft}s...`;
  }, 1000);

  window.hydroSplashTimerId = setTimeout(() => {
    enterApp();
  }, 2000);
}

let hydroToastTimerId = null;

function showHydroToast(message, variant) {
  const host = document.getElementById('hydroToastHost');
  if (!host) return;
  const v = variant === 'danger' ? 'danger' : 'ok';
  const esc = String(message ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
  host.innerHTML = `<div class="hydro-toast hydro-toast--${v}" role="status">${esc}</div>`;
  if (hydroToastTimerId) clearTimeout(hydroToastTimerId);
  hydroToastTimerId = window.setTimeout(() => {
    host.innerHTML = '';
    hydroToastTimerId = null;
  }, 3200);
}

initTheme();
if (typeof applyUiExperienceToDocument === 'function') applyUiExperienceToDocument();
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
if (typeof renderRiego === 'function') renderRiego();
renderHistorial();
renderClimatologia();
if (typeof renderConsejosPage === 'function') renderConsejosPage();

function hydroIsSecureOrLocalhost() {
  const { protocol, hostname } = location;
  if (protocol === 'https:') return true;
  const h = (hostname || '').toLowerCase();
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
}

if ('serviceWorker' in navigator && hydroIsSecureOrLocalhost()) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

window.enterApp = enterApp;
window.showHydroToast = showHydroToast;
