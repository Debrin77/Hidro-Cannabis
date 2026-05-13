/**
 * Parseo y reglas de coincidencia MeteoAlarm / CAP (sin estado de la app).
 * Requiere js/meteo-alarm-utils.js (meteoCapTag, meteoCapExtractEmmaId, meteoEscHtml, meteoNormTxt).
 */

/**
 * Variantes normalizadas del nombre de municipio para MeteoAlarm (avisos en castellano/valenciano/inglés).
 * Ej.: Castelló de la Plana ↔ Castellón de la Plana; Alacant ↔ Alicante.
 */
function meteoMunicipioVariantesNormalizadas(mFullNorm) {
  const m = String(mFullNorm || '').replace(/\s+/g, ' ').trim();
  const set = new Set([m]);
  const add = (s) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); if (t) set.add(t); };

  if (/^castellon?\s+de\s+la\s+plana$/.test(m)) {
    add('castello de la plana');
    add('castellon de la plana');
    add('castello');
    add('castellon');
  } else if (m === 'castello' || m === 'castellon') {
    add('castello de la plana');
    add('castellon de la plana');
    add('castello');
    add('castellon');
  }

  if (m === 'alicante' || m === 'alacant') {
    add('alicante');
    add('alacant');
  }
  if (m === 'valencia') {
    add('valencia');
  }
  if (m === 'vitoria-gasteiz' || m === 'vitoria' || m === 'gasteiz') {
    add('vitoria-gasteiz');
    add('vitoria');
    add('gasteiz');
  }
  return [...set];
}

function meteoExtraeRegionTrasUltimoDe(areaDesc) {
  const s = String(areaDesc || '').trim();
  const low = s.toLowerCase();
  const idx = low.lastIndexOf(' de ');
  if (idx >= 0) {
    return s.slice(idx + 4).trim().replace(/\s*\([^)]*\)\s*$/g, '').trim();
  }
  if (/\bcosta\s*[-–]\s*/i.test(s)) {
    const parts = s.split(/\s*[-–]\s*/);
    const last = parts[parts.length - 1].trim();
    if (last.length >= 2) return last.replace(/\s*\([^)]*\)\s*$/g, '').trim();
  }
  return '';
}

/** MeteoAlarm España usa subzonas tipo «Litoral sur de Alicante», no siempre el nombre del pueblo. */
function meteoAreaPareceZonaAemetEsp(areaDesc) {
  const s = meteoNormTxt(areaDesc);
  if (/\b(litoral|interior|prelitoral|costa|campo|marina|vega|valle|altiplano|pirine|serra|axarquia|guadalhorce|ampurd|emporda)\b/.test(s)) return true;
  if (/\b(sur|norte|este|oeste|central|noroeste|sureste|noreste|suroeste)\s+de\s+\w/.test(s)) return true;
  if (/(-|–)\s*sur\s+de\s+/.test(s)) return true;
  return false;
}

function meteoNormParaCoincidenciaProvincia(s) {
  return meteoNormTxt(String(s || ''))
    .replace(/\s+/g, ' ')
    .replace(/\bcastello\b/g, 'castellon')
    .trim();
}

/**
 * Respaldo si no hay coords o no se pudo cargar centroides EMMA: provincia/comarca en el geocoding
 * frente al texto de la zona del CAP (puede ser impreciso con varios sectores en la misma provincia).
 * @param {string} nomiBlobProvincia Texto normalizable de Nominatim (provincia/CCAA), p. ej. _meteoNomiBlobProvincia
 */
function meteoalarmCoincideZonaProvinciaNominatim(areaDesc, _title, nomiBlobProvincia) {
  const ad = String(areaDesc || '').trim();
  if (!ad) return false;
  if (!meteoAreaPareceZonaAemetEsp(ad)) return false;

  let region = meteoExtraeRegionTrasUltimoDe(ad);
  if (!region || region.length < 2) region = ad;
  let provN = meteoNormParaCoincidenciaProvincia(region);
  if (provN.length < 3) return false;
  const blob = String(nomiBlobProvincia || '').replace(/\s+/g, ' ').trim();
  if (!blob || blob.length < 5) return false;
  const b = meteoNormParaCoincidenciaProvincia(blob);
  if (b.includes(provN)) return true;
  const parts = provN.split(/\s+/).filter(t => t.length >= 4);
  if (parts.length >= 1 && parts.every(p => b.includes(p))) return true;
  const parts3 = provN.split(/\s+/).filter(t => t.length === 3);
  if (parts3.length && parts3.every(p => b.includes(p))) return true;
  return false;
}

/** Coincidencia estricta con municipio/localidad (no provincia ni CCAA solas). */
function meteoalarmMunicipioCoincide(municipio, areaDesc, title) {
  const raw = String(municipio || '').split(',')[0].trim();
  if (!raw) return false;
  const mFull = meteoNormTxt(raw).replace(/\s+/g, ' ').trim();
  const blob = (meteoNormTxt(areaDesc) + ' ' + meteoNormTxt(title)).replace(/\s+/g, ' ').trim();
  if (!blob) return false;

  const variantes = meteoMunicipioVariantesNormalizadas(mFull);
  for (let vi = 0; vi < variantes.length; vi++) {
    const vf = variantes[vi];
    if (vf.length >= 12 && blob.includes(vf)) return true;
  }

  if ((mFull === 'alicante' || mFull === 'alacant') &&
      (blob.includes('alicante') || blob.includes('alacant'))) return true;

  if (mFull.length >= 6 && blob.includes(mFull)) return true;

  const stop = { de:1, la:1, el:1, las:1, los:1, del:1, les:1, els:1, en:1, y:1, i:1, al:1, sa:1 };
  const tokens = mFull.split(/\s+/).filter(t => t.length >= 3 && !stop[t]);
  const significant = tokens.filter(t => t.length >= 4);
  const toCheck = significant.length ? significant : tokens;
  if (toCheck.length === 0) {
    return mFull.length >= 3 && blob.includes(mFull);
  }

  if (toCheck.length === 1 && toCheck[0].length < 10) {
    const broad = /\b(provincia|comarca|comunitat|comunidad autonoma|comunitat autonoma|costera|costa|litoral|prelitoral|interior|illes|islas|illa de|camp de|camp del|marina|ribera|altiplano|pirine|serrania|muntanya)\b/;
    if (broad.test(blob)) return false;
  }

  for (let i = 0; i < toCheck.length; i++) {
    if (!blob.includes(toCheck[i])) return false;
  }
  return true;
}

/**
 * El Atom MeteoAlarm España suele traer &lt;title&gt; y &lt;cap:event&gt; en inglés; &lt;cap:areaDesc&gt; ya va en español.
 * Construimos un título legible en español; si el título ya parece español, lo respetamos.
 */
function meteoAvisoTituloEs(tipo, title, event, areaDesc) {
  const t0 = String(title || '').trim();
  const pareceIngles =
    /\b(Yellow|Orange|Red|Warning issued|Moderate wind|Moderate rain|coastalevent)\b/i.test(t0) ||
    /\b(Moderate|Severe|Minor|Extreme)\s+(wind|rain|snow|thunderstorm|coastalevent|fog)\s+warning\b/i.test(String(event || ''));
  if (t0 && !pareceIngles && /\b(Aviso|Advertencia|Alerta|Amarillo|Naranja|Rojo)\b/i.test(t0)) {
    return t0;
  }
  const nivel = tipo === 'bad' ? 'rojo' : tipo === 'severe' ? 'naranja' : 'amarillo';
  const blob = (String(event || '') + ' ' + t0).toLowerCase();
  const temas = [
    [/wind|viento/, 'viento'],
    [/rain|lluvia|precipitation|shower/, 'lluvia'],
    [/thunderstorm|tormenta|storm/, 'tormentas'],
    [/snow|nieve/, 'nieve'],
    [/fog|niebla|mist/, 'niebla'],
    [/heat|high temperature|temperature|calor|ola de calor/, 'temperaturas'],
    [/cold|frost|freeze|fr[ií]o|helada/, 'frío'],
    [/coastal|coastalevent|oleaje|wave|rough sea/, 'fenómenos costeros'],
    [/avalanche|alud/, 'aludes'],
    [/flood|inundaci|flash flood/, 'inundaciones'],
    [/forest fire|incendio|wildfire/, 'incendios'],
    [/ice|hielo|icing/, 'hielo'],
    [/tornado/, 'tornados'],
    [/lightning|rayo/, 'rayos'],
  ];
  let tema = 'fenómenos meteorológicos adversos';
  for (let i = 0; i < temas.length; i++) {
    if (temas[i][0].test(blob)) {
      tema = temas[i][1];
      break;
    }
  }
  const zona = String(areaDesc || '').trim();
  if (zona) return 'Aviso ' + nivel + ' por ' + tema + ' — ' + zona;
  return 'Aviso ' + nivel + ' por ' + tema;
}

function meteoAvisoDetalleEs(event, areaDesc) {
  const zona = String(areaDesc || '').trim();
  const e = String(event || '').toLowerCase();
  let tipoEv = '';
  if (/wind/.test(e)) tipoEv = 'Viento';
  else if (/rain|shower|precipitation/.test(e)) tipoEv = 'Lluvia';
  else if (/thunderstorm/.test(e)) tipoEv = 'Tormentas';
  else if (/snow/.test(e)) tipoEv = 'Nieve';
  else if (/fog|mist/.test(e)) tipoEv = 'Niebla';
  else if (/heat|temperature/.test(e)) tipoEv = 'Temperatura';
  else if (/cold|frost/.test(e)) tipoEv = 'Frío';
  else if (/coastal|coastalevent|wave/.test(e)) tipoEv = 'Costeros';
  else if (e) tipoEv = event.trim();
  const partes = [];
  if (zona) partes.push('Zona: ' + zona);
  if (tipoEv) partes.push('Tipo: ' + tipoEv);
  return partes.join(' · ') || (zona || 'Aviso meteorológico oficial (AEMET / MeteoAlarm)');
}

function parseMeteoalarmAtomEntries(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');
  if (doc.querySelector('parsererror')) return [];
  const now = new Date();
  const out = [];
  const seenId = new Set();

  doc.querySelectorAll('entry').forEach(entry => {
    const msgType = meteoCapTag(entry, 'message_type');
    if (msgType === 'Cancel') return;
    const st = meteoCapTag(entry, 'status');
    if (st && st !== 'Actual') return;
    const expiresStr = meteoCapTag(entry, 'expires');
    if (expiresStr) {
      const ex = new Date(expiresStr);
      if (!isNaN(ex.getTime()) && ex < now) return;
    }
    const titleEl = entry.querySelector('title');
    const title = titleEl ? titleEl.textContent.trim() : '';
    const sev = meteoCapTag(entry, 'severity');
    const areaDesc = meteoCapTag(entry, 'areaDesc');
    const event = meteoCapTag(entry, 'event');
    if (!title && !areaDesc) return;

    let tipo = '';
    const titleS = title || '';
    if (/\bRed\b|\bRojo\b/i.test(titleS) || sev === 'Extreme') tipo = 'bad';
    else if (/\bOrange\b|\bNaranja\b/i.test(titleS) || sev === 'Severe') tipo = 'severe';
    else if (/\bYellow\b|\bAmarillo\b/i.test(titleS) || sev === 'Moderate') tipo = 'warn';
    if (!tipo) return;

    const ident = meteoCapTag(entry, 'identifier') || title + areaDesc;
    if (seenId.has(ident)) return;
    seenId.add(ident);

    const effective = meteoCapTag(entry, 'effective');
    const onset = meteoCapTag(entry, 'onset');
    const emmaId = meteoCapExtractEmmaId(entry);
    const icon = tipo === 'bad' ? '🔴' : tipo === 'severe' ? '🟠' : '🟡';
    const titulo = meteoAvisoTituloEs(tipo, title, event, areaDesc);
    const txt = meteoAvisoDetalleEs(event, areaDesc);
    out.push({
      tipo, icon, titulo, txt, areaDesc, title, identifier: ident, emmaId,
      effective, onset, expires: expiresStr || ''
    });
  });
  return out;
}

/**
 * Aviso aplicable: por EMMA_ID (centroide más cercano al municipio geocodificado) o, si falla, por texto.
 * Usa la variable global _meteoNomiBlobProvincia si existe (rellenada tras geocoding).
 */
function meteoalarmItemAfectaUbicacion(it, ctx, userEmma) {
  const m = (ctx.municipioFiltro || '').trim();
  if (m.length < 2) return false;
  const nomiBlob = typeof _meteoNomiBlobProvincia !== 'undefined' ? _meteoNomiBlobProvincia : '';
  if (userEmma && it.emmaId) {
    return it.emmaId === userEmma;
  }
  if (userEmma && !it.emmaId) {
    return meteoalarmMunicipioCoincide(m, it.areaDesc, it.title);
  }
  return meteoalarmMunicipioCoincide(m, it.areaDesc, it.title)
    || meteoalarmCoincideZonaProvinciaNominatim(it.areaDesc, it.title, nomiBlob);
}

function ordenarMeteoalarmPorRelevancia(items) {
  const pri = { bad: 0, severe: 1, warn: 2 };
  return items.slice().sort((a, b) => (pri[a.tipo] ?? 3) - (pri[b.tipo] ?? 3));
}

function meteoFormateaRangoAvisoCaps(a) {
  const o = a.onset || a.effective || '';
  const e = a.expires || '';
  const fmt = (s) => {
    const d = new Date(s);
    return !isNaN(d.getTime())
      ? d.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
      : '';
  };
  const lo = o ? fmt(o) : '';
  const le = e ? fmt(e) : '';
  if (lo && le) return lo + ' → ' + le;
  if (lo) return 'desde ' + lo;
  if (le) return 'hasta ' + le;
  return '';
}

function meteoAlertaRowHtml(a) {
  const rango = meteoFormateaRangoAvisoCaps(a);
  const sub = rango ? (meteoEscHtml(a.txt) + '<br><span class="meteo-alerta-fechas">' + meteoEscHtml(rango) + '</span>')
    : meteoEscHtml(a.txt);
  return '<div class="meteo-alerta-item ' + a.tipo + '">' +
    '<span class="meteo-alerta-icon">' + a.icon + '</span>' +
    '<span><strong>' + meteoEscHtml(a.titulo) + '</strong><br>' +
    '<span class="meteo-alerta-desc">' + sub + '</span></span>' +
    '</div>';
}
