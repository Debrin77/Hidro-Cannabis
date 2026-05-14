/**
 * Embebe la copia local en `hydro-cannabis-integration/` con salto a pestaña vía ?hydroEmbedTab=
 * El documento del iframe no se modifica desde aquí: el padre invoca goTab(tab) en el iframe (mismo origen)
 * cuando el bundle interno ya expone esa función.
 *
 * Port nativo «poco a poco» — orden de valor (cada fase puede sustituir el iframe de ese módulo):
 * 0) Modelo de datos: `fusion.growContext` (instalación, depósito, sitios, recinto) + metadatos riego/clima.
 * 1) Riego: ET₀/VPD nativos en esta app; torre y pulsos en iframe hasta port 1b.
 * 2) Meteo: pronóstico diario + tabla VPD horaria; widget «hoy» en Inicio lee el bundle guardado.
 * 3) Calendario: mallas en iframe; strip Medir, semana en curso, lista «próximos hitos» y calendario mensual nativos.
 * 4) Sistema: integración nativa prioriza RDWC/DWC (cannabis hidro con trayectoria clara); torre y formatos amplios siguen en iframe.
 * 5) Inicio (iframe): panel torre; en Hydro Cannabis: widget pronóstico hoy + bloque riego nativo.
 * 6) Historial: tarjeta cruce + última medición nativos; gráficos torre en iframe.
 * 7) Consejos: paso alimentario en iframe; paso 5 en Consejos nativo aclara alimentario vs cannabis.
 * 8) Ayuda: pantalla nativa + manual largo en iframe.
 * 9) Medición extendida (alimentario): opcional al final (Medir cannabis sigue siendo el principal).
 */
const EMBED_NATIVE_PORT_PHASES = [
  { phase: 0, embedTab: null, id: 'datos', title: 'Modelo de datos compartido' },
  { phase: 1, embedTab: 'riego', id: 'riego', title: 'Riego (ET₀ + demanda + pulsos nativos; torre en integración)' },
  { phase: 2, embedTab: 'meteo', id: 'meteo', title: 'Meteo (VPD horario en Clima; widget hoy en Inicio; vista extendida)' },
  { phase: 3, embedTab: 'calendario', id: 'calendario', title: 'Calendario (mallas en integración; semana nativa + próximos hitos)' },
  { phase: 4, embedTab: 'sistema', id: 'sistema', title: 'Sistema (RDWC/DWC nativos; torre e hidro amplio en integración)' },
  { phase: 5, embedTab: 'inicio', id: 'inicio', title: 'Inicio integración (panel torre; clima + riego en app nativa)' },
  { phase: 6, embedTab: 'historial', id: 'historial', title: 'Historial (Meteo+Riego+Medir nativos; torre en integración)' },
  { phase: 7, embedTab: 'consejos', id: 'consejos', title: 'Consejos (bloque alimentario en integración; paso 5 en Consejos nativo)' },
  { phase: 8, embedTab: 'ayuda', id: 'ayuda', title: 'Ayuda (nativa + manual extendido en integración)' },
  { phase: 9, embedTab: 'mediciones', id: 'mediciones', title: 'Medición extendida (alimentario)' },
];

const HC_EMBED_TAB_LABELS = {
  inicio: 'Inicio (panel torre, meteo exterior, operativa)',
  mediciones: 'Medir (cultivos alimentarios · vista extendida)',
  sistema: 'Cultivo e instalación (torre e hidro amplio en integración; RDWC/DWC nativo en app)',
  calendario: 'Calendario (vista extendida)',
  riego: 'Riego (vista extendida)',
  meteo: 'Meteorología (vista extendida)',
  historial: 'Historial (vista extendida)',
  consejos: 'Consejos (vista extendida)',
  ayuda: 'Ayuda y manual (vista extendida)',
};

const HC_EMBED_SESSION_KEY = 'hydroCannabis.hcEmbedTab';

let hcEmbedChildPollId = null;
let hcEmbedFallbackHideId = null;

function setHcEmbedLoading(on) {
  const wrap = document.getElementById('hcEmbedFrameWrap');
  if (wrap) wrap.classList.toggle('is-loading', !!on);
}

function clearHcEmbedLoadingFallback() {
  if (hcEmbedFallbackHideId != null) {
    clearTimeout(hcEmbedFallbackHideId);
    hcEmbedFallbackHideId = null;
  }
}

function scheduleHcEmbedLoadingFallbackHide() {
  clearHcEmbedLoadingFallback();
  hcEmbedFallbackHideId = setTimeout(() => {
    hcEmbedFallbackHideId = null;
    setHcEmbedLoading(false);
  }, 8000);
}

function clearHcEmbedChildPoll() {
  if (hcEmbedChildPollId != null) {
    clearInterval(hcEmbedChildPollId);
    hcEmbedChildPollId = null;
  }
}

/**
 * Tras cargar el documento del iframe, invoca goTab(tab) en su contexto (mismo origen).
 */
function pollHcEmbedChildTab(frame) {
  clearHcEmbedChildPoll();
  if (!frame?.contentWindow) return;
  const tab = getHcEmbedTab();
  if (!tab || !Object.prototype.hasOwnProperty.call(HC_EMBED_TAB_LABELS, tab)) return;
  let tries = 0;
  hcEmbedChildPollId = setInterval(() => {
    tries += 1;
    try {
      const w = frame.contentWindow;
      if (w && typeof w.goTab === 'function') {
        w.goTab(tab);
        clearHcEmbedChildPoll();
        clearHcEmbedLoadingFallback();
        window.setTimeout(() => setHcEmbedLoading(false), 350);
        return;
      }
    } catch (_) {
      /* file:// u origen distinto: no se puede acceder al iframe */
    }
    if (tries >= 120) {
      clearHcEmbedChildPoll();
      clearHcEmbedLoadingFallback();
      setHcEmbedLoading(false);
    }
  }, 100);
}

function getHcEmbedTab() {
  try {
    const t = sessionStorage.getItem(HC_EMBED_SESSION_KEY);
    return t && Object.prototype.hasOwnProperty.call(HC_EMBED_TAB_LABELS, t) ? t : 'inicio';
  } catch (_) {
    return 'inicio';
  }
}

function applyHcEmbedView() {
  const tab = getHcEmbedTab();
  const frame = document.getElementById('hcEmbedFrame');
  const sub = document.getElementById('hcEmbedSubtitle');
  if (sub) sub.textContent = HC_EMBED_TAB_LABELS[tab] || tab;
  if (frame) {
    const src =
      'hydro-cannabis-integration/index.html?hydroEmbedTab=' + encodeURIComponent(tab);
    if (frame.getAttribute('data-current-src') !== src) {
      setHcEmbedLoading(true);
      frame.setAttribute('data-current-src', src);
      frame.src = src;
    } else {
      setHcEmbedLoading(true);
      pollHcEmbedChildTab(frame);
      scheduleHcEmbedLoadingFallbackHide();
    }
    if (frame.dataset.hcEmbedLoadHook !== '1') {
      frame.dataset.hcEmbedLoadHook = '1';
      frame.addEventListener('load', () => {
        pollHcEmbedChildTab(frame);
        scheduleHcEmbedLoadingFallbackHide();
      });
      frame.addEventListener('error', () => {
        clearHcEmbedLoadingFallback();
        setHcEmbedLoading(false);
      });
    }
  }
}

function navToHcEmbed(tab) {
  const t =
    tab && Object.prototype.hasOwnProperty.call(HC_EMBED_TAB_LABELS, tab) ? tab : 'inicio';
  try {
    sessionStorage.setItem(HC_EMBED_SESSION_KEY, t);
    sessionStorage.setItem('hydroCannabis.hcEmbedVisited', '1');
  } catch (_) {}
  if (typeof closeMoreMenu === 'function') closeMoreMenu();
  const cur = location.hash.slice(1);
  if (cur === 'hc-embed') {
    applyHcEmbedView();
    return;
  }
  if (typeof navTo === 'function') navTo('hc-embed');
}

window.applyHcEmbedView = applyHcEmbedView;
window.navToHcEmbed = navToHcEmbed;
window.getHcEmbedTab = getHcEmbedTab;
window.EMBED_NATIVE_PORT_PHASES = EMBED_NATIVE_PORT_PHASES;
