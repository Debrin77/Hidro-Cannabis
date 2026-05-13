/**
 * Utilidades CAP 1.2 / MeteoAlarm (sin estado de la app).
 * Se carga antes del bloque principal en index.html; las funciones quedan en el ámbito global.
 */
var CAP_NS_METEO = 'urn:oasis:names:tc:emergency:cap:1.2';

function meteoEscHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function meteoCapTag(entry, localName) {
  const list = entry.getElementsByTagNameNS(CAP_NS_METEO, localName);
  return list.length ? list[0].textContent.trim() : '';
}

function meteoCapExtractEmmaId(entry) {
  const ns = CAP_NS_METEO;
  const geos = entry.getElementsByTagNameNS(ns, 'geocode');
  for (let gi = 0; gi < geos.length; gi++) {
    const geo = geos[gi];
    const kids = geo.children;
    for (let k = 0; k < kids.length; k++) {
      const el = kids[k];
      if (el.localName !== 'valueName' || el.textContent.trim() !== 'EMMA_ID') continue;
      const next = kids[k + 1];
      if (next && next.localName === 'value') {
        const id = next.textContent.trim();
        if (id) return id;
      }
      const valsNs = geo.getElementsByTagNameNS(ns, 'value');
      if (valsNs.length) return valsNs[0].textContent.trim();
      const valsAny = geo.getElementsByTagName('value');
      if (valsAny.length) return valsAny[0].textContent.trim();
    }
  }
  return '';
}

function meteoHaversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toR = (d) => (d * Math.PI) / 180;
  const dLat = toR(lat2 - lat1);
  const dLon = toR(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function meteoNormTxt(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
