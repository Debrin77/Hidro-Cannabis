/**
 * Embebe la copia local de HidroCultivo (reference-hidrocultivo-web) con salto a pestaña vía ?hydroEmbedTab=
 * No se modifica el código de HidroCultivo: el salto a la pestaña se aplica desde el padre (mismo origen)
 * llamando a goTab() en el iframe cuando el bundle HC ya lo ha definido.
 *
 * Port nativo «poco a poco» — orden de valor (cada fase puede sustituir el iframe de ese módulo):
 * 0) Modelo de datos: `fusion.growContext` (instalación, depósito, sitios, recinto) + metadatos riego/clima.
 * 1) Riego: ET₀/VPD nativos en esta app; torre y pulsos en iframe (HC) hasta port 1b.
 * 2) Meteo: pronóstico diario + tabla VPD horaria; widget «hoy» en Inicio lee el bundle guardado.
 * 3) Calendario HC: mallas; strip Medir, semana en curso, lista «próximos hitos» y calendario mensual nativos.
 * 4) Sistema: integración nativa prioriza RDWC/DWC (cannabis hidro con trayectoria clara); HC sigue cubriendo torre y formatos alimentarios amplios (NFT, multi-instalación…).
 * 5) Inicio HC: panel torre; en Hydro Cannabis: widget pronóstico hoy + bloque riego nativo.
 * 6) Historial HC: tarjeta cruce + última medición; gráficos torre en iframe.
 * 7) Consejos HC: paso 5 en pantalla Consejos nativo aclara alimentario vs cannabis.
 * 8) Ayuda: pantalla nativa + manual largo en iframe HC.
 * 9) Medir HC: opcional al final (tu Medir cannabis sigue siendo el principal).
 */
const HC_NATIVE_PORT_PHASES = [
  { phase: 0, embedTab: null, id: 'datos', title: 'Modelo de datos compartido' },
  { phase: 1, embedTab: 'riego', id: 'riego', title: 'Riego (ET₀ + demanda + pulsos nativos; HC torre)' },
  { phase: 2, embedTab: 'meteo', id: 'meteo', title: 'Meteo (VPD horario en Clima; widget hoy en Inicio; HC avanzado)' },
  { phase: 3, embedTab: 'calendario', id: 'calendario', title: 'Calendario (HC mallas; semana en curso + próximos hitos nativos)' },
  { phase: 4, embedTab: 'sistema', id: 'sistema', title: 'Sistema (RDWC/DWC nativos; torre y hidro amplio en HC)' },
  { phase: 5, embedTab: 'inicio', id: 'inicio', title: 'Inicio HC (panel torre; widget clima + riego en Inicio nativo)' },
  { phase: 6, embedTab: 'historial', id: 'historial', title: 'Historial (Meteo+Riego+Medir nativos; HC torre)' },
  { phase: 7, embedTab: 'consejos', id: 'consejos', title: 'Consejos HC (paso 5 en Consejos nativo)' },
  { phase: 8, embedTab: 'ayuda', id: 'ayuda', title: 'Ayuda (nativa + manual HC)' },
  { phase: 9, embedTab: 'mediciones', id: 'mediciones', title: 'Medir HC (alimentario)' },
];

const HC_EMBED_TAB_LABELS = {
  inicio: 'Inicio (panel torre, meteo exterior, operativa)',
  mediciones: 'Medir (versión HidroCultivo / cultivos alimentarios)',
  sistema: 'Cultivo e instalación (HC: torre y hidro amplio; nativo: RDWC/DWC cannabis)',
  calendario: 'Calendario (HidroCultivo)',
  riego: 'Riego (HidroCultivo)',
  meteo: 'Meteorología (HidroCultivo)',
  historial: 'Historial (HidroCultivo)',
  consejos: 'Consejos (HidroCultivo)',
  ayuda: 'Ayuda y manual (HidroCultivo)',
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
 * Tras cargar el documento HC, invoca goTab(tab) en el contexto del iframe (mismo origen).
 * Sustituye cualquier script dentro de la copia de referencia de HC.
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
      'reference-hidrocultivo-web/index.html?hydroEmbedTab=' + encodeURIComponent(tab);
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
window.HC_NATIVE_PORT_PHASES = HC_NATIVE_PORT_PHASES;
