/**
 * Embebe la copia local de HidroCultivo (reference-hidrocultivo-web) con salto a pestaña vía ?hydroEmbedTab=
 */

const HC_EMBED_TAB_LABELS = {
  inicio: 'Inicio (panel torre, meteo exterior, operativa)',
  mediciones: 'Medir (versión HidroCultivo / cultivos alimentarios)',
  sistema: 'Cultivo e instalación (torre, NFT, DWC…)',
  calendario: 'Calendario (HidroCultivo)',
  riego: 'Riego (HidroCultivo)',
  meteo: 'Meteorología (HidroCultivo)',
  historial: 'Historial (HidroCultivo)',
  consejos: 'Consejos (HidroCultivo)',
  ayuda: 'Ayuda y manual (HidroCultivo)',
};

const HC_EMBED_SESSION_KEY = 'hydroCannabis.hcEmbedTab';

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
      frame.setAttribute('data-current-src', src);
      frame.src = src;
    }
  }
}

function navToHcEmbed(tab) {
  const t =
    tab && Object.prototype.hasOwnProperty.call(HC_EMBED_TAB_LABELS, tab) ? tab : 'inicio';
  try {
    sessionStorage.setItem(HC_EMBED_SESSION_KEY, t);
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
