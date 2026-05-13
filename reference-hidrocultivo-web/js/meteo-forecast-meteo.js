/**
 * Meteorología: caché Open-Meteo, Meteoclimatic, UI previsión, alertas contextuales, GPS meteo.
 * Tras los módulos de setup/mediciones (p. ej. RANGOS). Siguiente: meteo-forecast-dashboard.js.
 */

// ══════════════════════════════════════════════════
// METEOROLOGÍA — LÓGICA
// ══════════════════════════════════════════════════

const DIAS_SEMANA = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
let meteoData = null;
let diaSeleccionado = 0;
let _meteoNomiKey = null;
let _meteoNomiContext = '';
let _meteoNomiMunicipio = '';
/** Texto normalizado (provincia, comarca, display_name) para cruzar con zonas MeteoAlarm «… de Provincia». */
let _meteoNomiBlobProvincia = '';
let _meteoalarmListaCache = { ts: 0, key: '', relevantes: null };
let _geocodificarLocalidadMeteoPromise = null;

function invalidateMeteoNomiCache() {
  _meteoNomiKey = null;
  _meteoNomiContext = '';
  _meteoNomiMunicipio = '';
  _meteoNomiBlobProvincia = '';
  _meteoalarmListaCache.ts = 0;
  _meteoalarmListaCache.key = '';
  _meteoalarmListaCache.relevantes = null;
}

/** Firma de coords de la instalación activa: evita usar caché de previsión de otra ubicación al cambiar de sistema. */
function meteoLocCacheSignature() {
  try {
    const g = getCoordsActivas();
    if (!g || !Number.isFinite(g.lat) || !Number.isFinite(g.lon)) return '';
    return String(Math.round(g.lat * 2000) / 2000) + '|' + String(Math.round(g.lon * 2000) / 2000);
  } catch (_) {
    return '';
  }
}

function condEmoji(precipProb, tempMax, uv) {
  if (precipProb > 70) return '🌧️';
  if (precipProb > 40) return '🌦️';
  if (uv > 7) return '☀️';
  if (uv > 3) return '⛅';
  if (tempMax < 10) return '🥶';
  return '🌤️';
}

/** Icono SVG en #meteoDetalleEmoji (sprite hc-i-* en index.html). */
function setMeteoDetalleIconSvg(precipProb, tempMax, uv) {
  const el = document.getElementById('meteoDetalleEmoji');
  if (!el) return;
  let sym = 'hc-i-cloud-sun';
  if (precipProb > 70) sym = 'hc-i-cloud-rain';
  else if (precipProb > 40) sym = 'hc-i-cloud-sun';
  else if (uv > 7) sym = 'hc-i-sun';
  else if (tempMax < 10) sym = 'hc-i-therm';
  el.innerHTML =
    '<svg class="hc-ico" aria-hidden="true" focusable="false"><use href="#' + sym + '"/></svg>';
}

function condTexto(precipProb, tempMax, uv, viento) {
  if (precipProb > 70) return 'Lluvia probable';
  if (precipProb > 40) return 'Chubascos posibles';
  if (viento > 40) return 'Viento fuerte';
  if (uv > 8) return 'Sol intenso';
  if (uv > 5) return 'Bastante soleado';
  if (uv > 2) return 'Parcialmente nublado';
  return 'Nublado';
}

function vpdColor(vpd) {
  if (vpd > 1.6) return 'var(--red)';
  if (vpd > 1.2) return 'var(--orange)';
  if (vpd > 0.8) return 'var(--gold)';
  if (vpd > 0.4) return 'var(--green)';
  return 'var(--blue)';
}

function vpdEstado(vpd) {
  if (vpd > 1.6) return { txt: 'Estrés severo', bg: 'rgba(248,113,113,0.15)', color: 'var(--red)' };
  if (vpd > 1.2) return { txt: 'Estrés moderado', bg: 'rgba(251,191,36,0.15)', color: 'var(--gold)' };
  if (vpd > 0.8) return { txt: 'Transpiración alta', bg: 'rgba(251,191,36,0.1)', color: 'var(--gold)' };
  if (vpd > 0.4) return { txt: 'Condiciones óptimas', bg: 'rgba(52,211,153,0.12)', color: 'var(--green)' };
  return { txt: 'Humedad muy alta', bg: 'rgba(96,165,250,0.12)', color: 'var(--blue)' };
}

// ── Open‑Meteo: fetch rápido con timeout + fallback + caché corta ───────────
const _meteoFastCache = new Map();
const _meteoFastInflight = new Map();
const METEO_LS_CACHE_PREFIX = 'hc_meteo_cache_v1:';

function meteoReadLsCache(cacheKey) {
  try {
    const raw = localStorage.getItem(METEO_LS_CACHE_PREFIX + cacheKey);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== 'object') return null;
    if (!Number.isFinite(obj.at) || !('data' in obj)) return null;
    return obj;
  } catch (_) {
    return null;
  }
}

function meteoWriteLsCache(cacheKey, payload) {
  try {
    localStorage.setItem(METEO_LS_CACHE_PREFIX + cacheKey, JSON.stringify(payload));
  } catch (_) {}
}

async function meteoFetchBackupUVFree(lat, lon, timeoutMs) {
  const url = 'https://currentuvindex.com/api/v1/uvi?latitude=' + lat + '&longitude=' + lon;
  const j = await meteoFetchJsonTimeout(url, Math.max(3000, timeoutMs || 6000));
  if (!j || j.ok === false) throw new Error(j?.message || 'UV backup no disponible');
  return j;
}

function meteoGroupDateMax(list) {
  const m = new Map();
  (list || []).forEach((x) => {
    const t = String(x?.time || '');
    const d = t.slice(0, 10);
    const v = Number(x?.uvi);
    if (!d || !Number.isFinite(v)) return;
    m.set(d, m.has(d) ? Math.max(m.get(d), v) : v);
  });
  return m;
}

async function meteoFetchBackupMetNo(baseUrl, timeoutMs) {
  const q = String(baseUrl.split('?')[1] || '');
  const sp = new URLSearchParams(q);
  const lat = parseFloat(sp.get('latitude'));
  const lon = parseFloat(sp.get('longitude'));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error('Lat/lon inválidas backup meteo');
  const forecastDays = Math.max(1, Math.min(7, parseInt(sp.get('forecast_days') || '3', 10) || 3));
  const wantCurrent = /(?:^|&)current=/.test(q);
  const wantDaily = /(?:^|&)daily=/.test(q);
  const wantHourly = /(?:^|&)hourly=/.test(q);
  const dailyFields = String(sp.get('daily') || '');
  const onlyUvDaily = wantDaily && dailyFields.replace(/\s/g, '') === 'uv_index_max' && !wantHourly && !wantCurrent;

  if (onlyUvDaily) {
    const uv = await meteoFetchBackupUVFree(lat, lon, timeoutMs);
    const series = [uv.now].concat(Array.isArray(uv.forecast) ? uv.forecast : []);
    const byDate = meteoGroupDateMax(series);
    const dates = Array.from(byDate.keys()).sort().slice(0, forecastDays);
    return {
      latitude: lat, longitude: lon, timezone: 'UTC', timezone_abbreviation: 'UTC', utc_offset_seconds: 0,
      daily: { time: dates, uv_index_max: dates.map(d => byDate.get(d) ?? 0) },
    };
  }

  const url = 'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=' + lat + '&lon=' + lon;
  const j = await meteoFetchJsonTimeout(url, Math.max(4500, timeoutMs || 8000));
  const ts = j?.properties?.timeseries;
  if (!Array.isArray(ts) || !ts.length) throw new Error('met.no sin timeseries');

  const hourlyRaw = ts.slice(0, Math.min(ts.length, forecastDays * 24 + 16));
  const dates = [];
  for (let i = 0; i < hourlyRaw.length; i++) {
    const d = String(hourlyRaw[i].time || '').slice(0, 10);
    if (d && !dates.includes(d)) dates.push(d);
    if (dates.length >= forecastDays) break;
  }
  const useDates = dates.slice(0, forecastDays);
  const daySet = new Set(useDates);
  const hourly = hourlyRaw.filter(x => daySet.has(String(x.time || '').slice(0, 10)));

  const out = {
    latitude: lat, longitude: lon, timezone: 'UTC', timezone_abbreviation: 'UTC', utc_offset_seconds: 0,
  };
  if (wantHourly) {
    out.hourly = {
      time: hourly.map(x => x.time),
      temperature_2m: hourly.map(x => Number(x?.data?.instant?.details?.air_temperature ?? NaN)),
      relative_humidity_2m: hourly.map(x => Number(x?.data?.instant?.details?.relative_humidity ?? NaN)),
      wind_speed_10m: hourly.map(x => Number(x?.data?.instant?.details?.wind_speed ?? 0) * 3.6),
      et0_fao_evapotranspiration: hourly.map(() => null),
    };
  }
  if (wantCurrent) {
    const c0 = ts[0];
    out.current = {
      time: String(c0.time || ''),
      temperature_2m: Number(c0?.data?.instant?.details?.air_temperature ?? NaN),
      relative_humidity_2m: Number(c0?.data?.instant?.details?.relative_humidity ?? NaN),
      wind_speed_10m: Number(c0?.data?.instant?.details?.wind_speed ?? 0) * 3.6,
      uv_index: 0,
    };
  }
  if (wantCurrent && !wantDaily) {
    try {
      const uvBk = await meteoFetchBackupUVFree(lat, lon, timeoutMs);
      const uNow = Number(uvBk?.now?.uvi);
      if (Number.isFinite(uNow) && out.current) out.current.uv_index = uNow;
    } catch (_) { /* sin respaldo UV */ }
  }
  if (wantDaily) {
    const dTempMax = [];
    const dTempMin = [];
    const dWindMax = [];
    const dProb = [];
    const dPrec = [];
    for (const d of useDates) {
      const dayRows = hourly.filter(x => String(x.time || '').slice(0, 10) === d);
      const tArr = dayRows.map(x => Number(x?.data?.instant?.details?.air_temperature)).filter(Number.isFinite);
      const wArr = dayRows.map(x => Number(x?.data?.instant?.details?.wind_speed) * 3.6).filter(Number.isFinite);
      const pArr = dayRows.map(x => Number(x?.data?.next_1_hours?.details?.precipitation_amount || 0)).filter(Number.isFinite);
      dTempMax.push(tArr.length ? Math.max(...tArr) : NaN);
      dTempMin.push(tArr.length ? Math.min(...tArr) : NaN);
      dWindMax.push(wArr.length ? Math.max(...wArr) : 0);
      dPrec.push(pArr.reduce((a, b) => a + b, 0));
      const rainy = pArr.filter(v => v > 0.03).length;
      dProb.push(pArr.length ? Math.round((rainy / pArr.length) * 100) : 0);
    }
    out.daily = {
      time: useDates,
      temperature_2m_max: dTempMax,
      temperature_2m_min: dTempMin,
      precipitation_probability_max: dProb,
      precipitation_sum: dPrec,
      wind_speed_10m_max: dWindMax,
      uv_index_max: new Array(useDates.length).fill(0),
    };
    try {
      const uv = await meteoFetchBackupUVFree(lat, lon, timeoutMs);
      const series = [uv.now].concat(Array.isArray(uv.forecast) ? uv.forecast : []);
      const byDate = meteoGroupDateMax(series);
      out.daily.uv_index_max = useDates.map(dd => byDate.get(dd) ?? 0);
      if (out.current) {
        const uNow = Number(uv?.now?.uvi);
        if (Number.isFinite(uNow)) out.current.uv_index = uNow;
      }
    } catch (_) {}
  }
  return out;
}

async function meteoFetchJsonTimeout(url, timeoutMs) {
  if (typeof AbortController === 'undefined') {
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  } finally {
    clearTimeout(to);
  }
}

async function meteoFetchConFallback(baseUrl, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 8000;
  const ttlMs = opts.ttlMs ?? 120000;
  const staleMs = opts.staleMs ?? (24 * 60 * 60 * 1000);
  const cacheKey = opts.cacheKey || baseUrl;
  const forceRefresh = !!opts.forceRefresh;
  /** Si false, ante error de red no se devuelve copia antigua (p. ej. recalcular riego a mano). */
  const allowStaleFallback = opts.allowStaleFallback !== false;
  const now = Date.now();
  const cMem = _meteoFastCache.get(cacheKey);
  const cLs = meteoReadLsCache(cacheKey);
  const c = cMem || cLs;
  if (!forceRefresh && c && now - c.at < ttlMs) return c.data;
  if (!forceRefresh && _meteoFastInflight.has(cacheKey)) return _meteoFastInflight.get(cacheKey);

  const p = (async () => {
    let lastErr = null;
    // Primero intento rápido sin fijar modelo; si falla, pruebo modelo explícito.
    for (const url of [baseUrl, baseUrl + '&models=ecmwf_ifs']) {
      try {
        const j = await meteoFetchJsonTimeout(url, timeoutMs);
        if (j && !j.error) {
          const pack = { at: Date.now(), data: j };
          _meteoFastCache.set(cacheKey, pack);
          meteoWriteLsCache(cacheKey, pack);
          state._meteoFuenteActiva = 'open-meteo';
          refreshMeteoFuenteActivaUI();
          return j;
        }
        const r = j && j.reason;
        lastErr = new Error(typeof r === 'string' ? r : (r ? JSON.stringify(r) : 'Respuesta meteo inválida'));
      } catch (e) {
        lastErr = e;
      }
    }
    try {
      const b = await meteoFetchBackupMetNo(baseUrl, timeoutMs + 1200);
      if (b && !b.error) {
        const pack = { at: Date.now(), data: b };
        _meteoFastCache.set(cacheKey, pack);
        meteoWriteLsCache(cacheKey, pack);
        state._meteoFuenteActiva = 'metno';
        refreshMeteoFuenteActivaUI();
        return b;
      }
    } catch (e) {
      lastErr = e;
    }
    if (allowStaleFallback && c && now - c.at < staleMs) {
      state._meteoFuenteActiva = 'cache';
      refreshMeteoFuenteActivaUI();
      return c.data;
    }
    throw (lastErr || new Error('Sin datos meteorológicos'));
  })();
  _meteoFastInflight.set(cacheKey, p);
  try {
    return await p;
  } finally {
    _meteoFastInflight.delete(cacheKey);
  }
}

// ── Meteoclimatic: estación aficionada más cercana (RSS regional; CORS vía allorigins si hace falta) ──
const METEOCLIMATIC_ZONAS = [
  { code: 'ESPV', minLat: 37.55, maxLat: 40.98, minLon: -1.05, maxLon: 0.52, cLat: 39.25, cLon: -0.55 },
  { code: 'ESCAT', minLat: 40.35, maxLat: 42.95, minLon: 0.12, maxLon: 3.55, cLat: 41.65, cLon: 1.52 },
  { code: 'ESAND', minLat: 35.05, maxLat: 38.85, minLon: -7.55, maxLon: -1.05, cLat: 37.2, cLon: -4.25 },
  { code: 'ESCYL', minLat: 40.05, maxLat: 43.25, minLon: -6.85, maxLon: -1.42, cLat: 41.75, cLon: -4.25 },
  { code: 'ESMUR', minLat: 37.32, maxLat: 38.72, minLon: -2.55, maxLon: -0.62, cLat: 37.95, cLon: -1.55 },
  { code: 'ESMAD', minLat: 39.85, maxLat: 41.25, minLon: -4.15, maxLon: -2.85, cLat: 40.42, cLon: -3.7 },
  { code: 'ESGAL', minLat: 41.75, maxLat: 43.95, minLon: -9.35, maxLon: -6.42, cLat: 42.65, cLon: -7.85 },
  { code: 'ESEXT', minLat: 37.85, maxLat: 40.25, minLon: -7.55, maxLon: -4.55, cLat: 39.05, cLon: -6.35 },
  { code: 'ESIBA', minLat: 38.55, maxLat: 40.25, minLon: 1.05, maxLon: 4.45, cLat: 39.6, cLon: 2.9 },
  { code: 'ESARA', minLat: 39.75, maxLat: 43.05, minLon: -1.85, maxLon: 0.55, cLat: 41.35, cLon: -0.8 },
];

function meteoclimaticHaversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toR = x => (x * Math.PI) / 180;
  const dLat = toR(lat2 - lat1);
  const dLon = toR(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(a))) * 10) / 10;
}

function meteoclimaticFeedCodesPriorizados(lat, lon) {
  const inside = [];
  for (let i = 0; i < METEOCLIMATIC_ZONAS.length; i++) {
    const z = METEOCLIMATIC_ZONAS[i];
    if (lat >= z.minLat && lat <= z.maxLat && lon >= z.minLon && lon <= z.maxLon) inside.push(z.code);
  }
  if (inside.length) return inside;
  const scored = METEOCLIMATIC_ZONAS.map(z => ({
    code: z.code,
    d: (lat - z.cLat) * (lat - z.cLat) + (lon - z.cLon) * (lon - z.cLon),
  })).sort((a, b) => a.d - b.d);
  const out = [];
  if (scored[0]) out.push(scored[0].code);
  if (scored[1] && scored[1].code !== scored[0].code) out.push(scored[1].code);
  return out;
}

function meteoclimaticMcParseFloat(s) {
  if (s == null || s === '') return null;
  const v = parseFloat(String(s).replace(',', '.'));
  if (!Number.isFinite(v)) return null;
  if (v === -99) return null;
  return v;
}

const METEOCLIMATIC_BLOCK_RE = /\[\[<(\w+);\((-?[0-9,]+);(-?[0-9,]+);(-?[0-9,]+);(\w*)\);\((-?[0-9,]*);(-?[0-9,]*);(-?[0-9,]*)\);\((-?[0-9,]*);(-?[0-9,]*);(-?[0-9,]*)\);\((-?[0-9,]*);(-?[0-9,]*);(-?[0-9,]*)\);\((-?[0-9,]*)\);/;

function meteoclimaticParseBlockFromDescription(desc) {
  const m = METEOCLIMATIC_BLOCK_RE.exec(desc || '');
  if (!m) return null;
  return {
    stationCode: m[1],
    temp: meteoclimaticMcParseFloat(m[2]),
    tempMax: meteoclimaticMcParseFloat(m[3]),
    tempMin: meteoclimaticMcParseFloat(m[4]),
    condition: m[5] || '',
    rh: meteoclimaticMcParseFloat(m[6]),
    pressure: meteoclimaticMcParseFloat(m[9]),
    wind: meteoclimaticMcParseFloat(m[12]),
    windMax: meteoclimaticMcParseFloat(m[13]),
    windBearing: meteoclimaticMcParseFloat(m[14]),
    rain24h: meteoclimaticMcParseFloat(m[15]),
  };
}

function meteoclimaticPointFromItemXml(xmlSlice) {
  let lat = NaN;
  let lon = NaN;
  const p1 = /<georss:point>\s*([\d.-]+)\s+([\d.-]+)\s*<\/georss:point>/i.exec(xmlSlice);
  if (p1) {
    lat = parseFloat(p1[1]);
    lon = parseFloat(p1[2]);
  } else {
    const plat = /<geo:lat>\s*([\d.-]+)\s*<\/geo:lat>/i.exec(xmlSlice);
    const plon = /<geo:long>\s*([\d.-]+)\s*<\/geo:long>/i.exec(xmlSlice);
    if (plat && plon) {
      lat = parseFloat(plat[1]);
      lon = parseFloat(plon[1]);
    }
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

async function meteoclimaticFetchRssText(feedCode, timeoutMs) {
  const url = 'https://www.meteoclimatic.net/feed/rss/' + encodeURIComponent(feedCode);
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    let txt = null;
    try {
      const r = await fetch(url, { signal: ctrl.signal, mode: 'cors' });
      if (r.ok) txt = await r.text();
    } catch (_) { /* CORS en navegador */ }
    if (txt == null) {
      const proxy = 'https://api.allorigins.win/get?url=' + encodeURIComponent(url);
      const r2 = await fetch(proxy, { signal: ctrl.signal });
      if (!r2.ok) throw new Error('Meteoclimatic proxy');
      const j = await r2.json();
      if (typeof j.contents !== 'string') throw new Error('Meteoclimatic body');
      txt = j.contents;
    }
    return txt;
  } finally {
    clearTimeout(tid);
  }
}

function meteoclimaticNearestFromRssXml(rssText, lat0, lon0) {
  const reItem = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let best = null;
  let m;
  while ((m = reItem.exec(rssText)) !== null) {
    const chunk = m[1];
    const titleM = /<title>([\s\S]*?)<\/title>/i.exec(chunk);
    const linkM = /<link>([\s\S]*?)<\/link>/i.exec(chunk);
    const descM = /<description>([\s\S]*?)<\/description>/i.exec(chunk);
    const pubM = /<pubDate>([\s\S]*?)<\/pubDate>/i.exec(chunk);
    if (!descM) continue;
    const desc = descM[1].replace(/<!\[CDATA\[|\]\]>/g, '');
    const obs = meteoclimaticParseBlockFromDescription(desc);
    if (!obs) continue;
    const pt = meteoclimaticPointFromItemXml(chunk);
    if (!pt) continue;
    const dist = meteoclimaticHaversineKm(lat0, lon0, pt.lat, pt.lon);
    const title = titleM ? titleM[1].replace(/<[^>]+>/g, '').trim() : '';
    const link = linkM ? linkM[1].trim() : '';
    const pubDate = pubM ? pubM[1].trim() : '';
    const cand = { title, link, pubDate, distKm: dist, lat: pt.lat, lon: pt.lon, feedObs: obs };
    if (!best || dist < best.distKm) best = cand;
  }
  return best;
}

async function meteoclimaticObservacionCercana(lat, lon, opts) {
  const timeoutMs = opts && opts.timeoutMs != null ? opts.timeoutMs : 6000;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const perFetch = Math.max(1200, Math.min(5000, timeoutMs - 300));
  const codes = meteoclimaticFeedCodesPriorizados(lat, lon);
  if (!codes.length) return null;
  for (let i = 0; i < codes.length; i++) {
    try {
      const xml = await meteoclimaticFetchRssText(codes[i], perFetch);
      const best = meteoclimaticNearestFromRssXml(xml, lat, lon);
      if (best) {
        const o = best.feedObs;
        return {
          zonaRss: codes[i],
          title: best.title,
          link: best.link,
          pubDate: best.pubDate,
          distKm: best.distKm,
          stationLat: best.lat,
          stationLon: best.lon,
          stationCode: o.stationCode,
          temp: o.temp,
          tempMax: o.tempMax,
          tempMin: o.tempMin,
          condition: o.condition,
          rh: o.rh,
          pressure: o.pressure,
          wind: o.wind,
          windMax: o.windMax,
          windBearing: o.windBearing,
          rain24h: o.rain24h,
        };
      }
    } catch (_) { /* siguiente zona */ }
  }
  return null;
}

function meteoclimaticFormatLineaHtml(mc) {
  if (!mc || mc.temp == null) return '';
  const t = Math.round(mc.temp * 10) / 10;
  const rh = mc.rh != null ? Math.round(mc.rh) + '%' : '—';
  const w = mc.wind != null ? Math.round(mc.wind * 10) / 10 + ' km/h' : '—';
  const rain = mc.rain24h != null ? Math.round(mc.rain24h * 10) / 10 + ' mm' : '—';
  const dist = mc.distKm != null ? ' · ~' + Math.round(mc.distKm * 10) / 10 + ' km' : '';
  const nom = escHtmlUi(mc.title || 'Estación');
  return (
    '<br><span class="riego-clima-meteoclimatic">📡 <strong>Meteoclimatic</strong> (observación reciente, red de estaciones)' + dist +
    ': <strong>' + nom + '</strong> · T <strong>' + t + '</strong> °C · HR ' + rh + ' · viento ' + w + ' · precip. 24 h ' + rain +
    ' · <span class="riego-clima-mc-pub">' + escHtmlUi(mc.pubDate || '') + '</span>. Complemento observacional; el modelo sigue siendo la base del cálculo.</span>'
  );
}

function renderMeteoclimaticPanelMeteo(mc) {
  const box = document.getElementById('meteoMeteoclimaticBox');
  const inner = document.getElementById('meteoMeteoclimaticInner');
  if (!box || !inner) return;
  if (typeof instalacionEsUbicacionInterior === 'function' && instalacionEsUbicacionInterior()) {
    box.classList.add('setup-hidden');
    inner.innerHTML = '';
    return;
  }
  if (!mc || mc.temp == null) {
    box.classList.add('setup-hidden');
    inner.innerHTML = '';
    return;
  }
  box.classList.remove('setup-hidden');
  const href = mc.link ? escHtmlUi(mc.link) : '';
  const linkHtml = href
    ? '<a href="' + href + '" target="_blank" rel="noopener noreferrer">Ver ficha en meteoclimatic.net</a>'
    : '';
  inner.innerHTML =
    '<div class="meteo-mc-title">📡 Estación cercana (Meteoclimatic)</div>' +
    '<div class="meteo-mc-body"><strong>' + escHtmlUi(mc.title || '') + '</strong> · ~' + Math.round(mc.distKm * 10) / 10 + ' km' +
    '<br>T actual: <strong>' + (Math.round(mc.temp * 10) / 10) + '</strong> °C · HR: ' + (mc.rh != null ? Math.round(mc.rh) + '%' : '—') +
    ' · Viento: ' + (mc.wind != null ? Math.round(mc.wind * 10) / 10 + ' km/h' : '—') +
    ' · Lluvia 24 h: ' + (mc.rain24h != null ? Math.round(mc.rain24h * 10) / 10 + ' mm' : '—') +
    '<br><span class="meteo-mc-small">' + escHtmlUi(mc.pubDate || '') + '</span>' + (linkHtml ? ' · ' + linkHtml : '') +
    '<br><span class="meteo-mc-note">Red de estaciones aficionadas en la península y archipiélagos (gratis). Si no ves datos, la red puede estar saturada o el navegador bloquea el acceso: prueba más tarde.</span></div>';
}

/** Texto de contexto: alertas de cultivo ligadas a la instalación activa (cada sistema hidropónico tiene su matriz y config). */
function actualizarMeteoCaptionInstalacionActiva() {
  const el = document.getElementById('meteoPerfilInstalacionLine');
  if (!el) return;
  let nom = 'Instalación activa';
  try {
    if (typeof getTorreActiva === 'function') {
      const t = getTorreActiva();
      if (t && t.nombre && String(t.nombre).trim()) nom = String(t.nombre).trim();
    }
  } catch (_) {}
  const cfg = state.configTorre || {};
  const locTxt =
    (cfg.localidadMeteo && String(cfg.localidadMeteo).trim()) ||
    (cfg.ciudad && String(cfg.ciudad).split(',')[0].trim()) ||
    'coordenadas de esta instalación (Medir / municipio)';
  el.textContent =
    'Previsión y avisos usan la ubicación de «' +
    locTxt +
    '» (cada instalación puede tener otra en Medir). Cultivo y alertas: instalación activa «' +
    nom +
    '». Cambia de instalación en Inicio o en Cultivo e instalación para otra matriz y zona meteorológica.';
}

async function cargarMeteo() {
  const meteoLoader = document.getElementById('meteoLoader');
  if (!meteoLoader) return; // pestaña no activa — no hacer nada
  const METEO_LDR_DEFAULT =
    '<svg class="hc-ico hc-ico--inline hc-ico--spin" aria-hidden="true" focusable="false"><use href="#hc-i-refresh"/></svg><span>Cargando previsión 7 días...</span>';
  meteoLoader.innerHTML = METEO_LDR_DEFAULT;
  const meteoUbicEl = document.getElementById('meteoUbicacionActual');
  const labelUbic = (() => {
    const cfg = state.configTorre || {};
    const m = (cfg.localidadMeteo || '').trim();
    if (m) return m;
    const c = (cfg.ciudad || '').trim();
    if (c) return c.split(',')[0].trim();
    return 'No definida';
  })();
  if (meteoUbicEl) meteoUbicEl.textContent = labelUbic;
  actualizarMeteoCaptionInstalacionActiva();
  try {
    if (typeof refreshAvisoUbicacionExteriorPendiente === 'function') refreshAvisoUbicacionExteriorPendiente();
  } catch (_) {}
  const locSigAhora = meteoLocCacheSignature();
  const meteoForzarPorUbicacion =
    !!(state._meteoForecastCacheLocSig && locSigAhora && state._meteoForecastCacheLocSig !== locSigAhora);
  if (meteoForzarPorUbicacion) {
    try {
      state._ultimoMeteoclimaticCercano = null;
    } catch (_) {}
  }
  meteoLoader.style.display = 'flex';
  const meteoDias = document.getElementById('meteoDias');
  const meteoDetalle = document.getElementById('meteoDetalle');
  const meteoAlertas = document.getElementById('meteoAlertas');
  const meteoAvisosOficiales = document.getElementById('meteoAvisosOficiales');
  const mcBoxLoad = document.getElementById('meteoMeteoclimaticBox');
  if (meteoDias) meteoDias.classList.add('setup-hidden');
  if (meteoDetalle) meteoDetalle.classList.add('setup-hidden');
  if (meteoAlertas) meteoAlertas.classList.add('setup-hidden');
  if (meteoAvisosOficiales) meteoAvisosOficiales.classList.add('setup-hidden');
  if (mcBoxLoad) mcBoxLoad.classList.add('setup-hidden');

  try {
    // No bloquear la carga por geolocalización (puede tardar varios segundos en algunos móviles).
    void ensureMeteoCoordsAuto();

    let coordsM = getCoordsActivas();
    if (!coordsM || !Number.isFinite(coordsM.lat) || !Number.isFinite(coordsM.lon)) {
      if (typeof ensureMeteoCoordsAuto === 'function') {
        await ensureMeteoCoordsAuto();
      }
      coordsM = getCoordsActivas();
    }
    if (!coordsM || !Number.isFinite(coordsM.lat) || !Number.isFinite(coordsM.lon)) {
      meteoLoader.style.display = 'flex';
      meteoLoader.innerHTML =
        '<svg class="hc-ico hc-ico--inline" aria-hidden="true" focusable="false"><use href="#hc-i-pin-mapa"/></svg>' +
        '<span>Para ver la previsión, indica <strong>municipio o coordenadas</strong> del sistema en el paso de ubicación del asistente o en <strong>Medir</strong>.</span>';
      if (meteoDias) meteoDias.classList.add('setup-hidden');
      if (meteoDetalle) meteoDetalle.classList.add('setup-hidden');
      if (meteoAlertas) meteoAlertas.classList.add('setup-hidden');
      if (meteoAvisosOficiales) meteoAvisosOficiales.classList.add('setup-hidden');
      if (mcBoxLoad) mcBoxLoad.classList.add('setup-hidden');
      return;
    }

    // ECMWF para temp/humedad + modelo default para UV
    const urlMBase = 'https://api.open-meteo.com/v1/forecast?' +
      'latitude=' + coordsM.lat + '&longitude=' + coordsM.lon +
      '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max' +
      '&hourly=temperature_2m,relative_humidity_2m' +
      '&forecast_days=7&timezone=auto';
    const urlMCoreBase = 'https://api.open-meteo.com/v1/forecast?' +
      'latitude=' + coordsM.lat + '&longitude=' + coordsM.lon +
      '&daily=temperature_2m_max,temperature_2m_min' +
      '&hourly=temperature_2m,relative_humidity_2m' +
      '&forecast_days=7&timezone=auto';
    const urlMUV = 'https://api.open-meteo.com/v1/forecast?' +
      'latitude=' + coordsM.lat + '&longitude=' + coordsM.lon +
      '&daily=uv_index_max&forecast_days=7&timezone=auto';

    const fetchOpts = { forceRefresh: meteoForzarPorUbicacion };
    const [meteoRaw, meteoUV] = await Promise.all([
      meteoFetchConFallback(urlMBase, {
        cacheKey: 'meteo:main:' + urlMBase,
        timeoutMs: 4200,
        ttlMs: 2 * 60 * 1000,
        ...fetchOpts,
      }).catch(() =>
        meteoFetchConFallback(urlMCoreBase, {
          cacheKey: 'meteo:core:' + urlMCoreBase,
          timeoutMs: 4200,
          ttlMs: 2 * 60 * 1000,
          ...fetchOpts,
        })
      ),
      meteoFetchConFallback(urlMUV, {
        cacheKey: 'meteo:uv:' + urlMUV,
        timeoutMs: 3800,
        ttlMs: 8 * 60 * 1000,
        ...fetchOpts,
      }),
    ]);
    meteoData = meteoRaw;
    // Compatibilidad Open-Meteo: unificar nombres de viento legacy/nuevo
    if (!Array.isArray(meteoData.daily.windspeed_10m_max) && Array.isArray(meteoData.daily.wind_speed_10m_max)) {
      meteoData.daily.windspeed_10m_max = meteoData.daily.wind_speed_10m_max;
    }
    const nDays = Array.isArray(meteoData.daily?.time) ? meteoData.daily.time.length : 7;
    if (!Array.isArray(meteoData.daily.windspeed_10m_max)) {
      meteoData.daily.windspeed_10m_max = new Array(nDays).fill(0);
    }
    if (!Array.isArray(meteoData.daily.precipitation_probability_max)) {
      meteoData.daily.precipitation_probability_max = new Array(nDays).fill(0);
    }
    if (!Array.isArray(meteoData.daily.precipitation_sum)) {
      meteoData.daily.precipitation_sum = new Array(nDays).fill(0);
    }
    // Combinar UV en meteoData
    if (meteoUV.daily?.uv_index_max) {
      meteoData.daily.uv_index_max = meteoUV.daily.uv_index_max;
    } else {
      meteoData.daily.uv_index_max = new Array(7).fill(0);
    }
    state._meteoForecastCache = meteoData;
    state._meteoForecastCacheLocSig = meteoLocCacheSignature();
    saveState();

    renderMeteoDias();
    seleccionarDia(0);

    document.getElementById('meteoLoader').style.display = 'none';
    document.getElementById('meteoDias').classList.remove('setup-hidden');
    document.getElementById('meteoDetalle').classList.remove('setup-hidden');
    document.getElementById('meteoAlertas').classList.remove('setup-hidden');

    await renderMeteoAvisosPanelCompleto();

    const mcCached = state._ultimoMeteoclimaticCercano;
    if (mcCached && mcCached.temp != null) renderMeteoclimaticPanelMeteo(mcCached);
    void meteoclimaticObservacionCercana(coordsM.lat, coordsM.lon, { timeoutMs: 7200 })
      .then((mc) => {
        try {
          state._ultimoMeteoclimaticCercano = mc;
        } catch (_) {}
        renderMeteoclimaticPanelMeteo(mc);
      })
      .catch(() => renderMeteoclimaticPanelMeteo(null));

  } catch(e) {
    const cached = state._meteoForecastCache;
    const cacheUbicacionOk =
      cached &&
      cached.daily &&
      cached.hourly &&
      state._meteoForecastCacheLocSig &&
      state._meteoForecastCacheLocSig === meteoLocCacheSignature();
    if (cacheUbicacionOk) {
      meteoData = cached;
      try {
        renderMeteoDias();
        seleccionarDia(0);
        document.getElementById('meteoLoader').style.display = 'none';
        document.getElementById('meteoDias').classList.remove('setup-hidden');
        document.getElementById('meteoDetalle').classList.remove('setup-hidden');
        document.getElementById('meteoAlertas').classList.remove('setup-hidden');
        void renderMeteoAvisosPanelCompleto();
        return;
      } catch (_) {}
    }
    document.getElementById('meteoLoader').innerHTML =
      '<span>❌</span><span>Error al cargar datos. Revisa conexión o espera unos segundos.</span>';
  }
}

function renderMeteoDias() {
  const dias = document.getElementById('meteoDias');
  dias.innerHTML = '';

  meteoData.daily.time.forEach((fecha, i) => {
    const d = new Date(fecha);
    const nombre = i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : DIAS_SEMANA[d.getDay()];
    const tMax = Math.round(meteoData.daily.temperature_2m_max[i]);
    const tMin = Math.round(meteoData.daily.temperature_2m_min[i]);
    const prob = meteoData.daily.precipitation_probability_max[i];
    const uv   = meteoData.daily.uv_index_max[i];
    const viento = meteoData.daily.windspeed_10m_max[i];
    const emoji = condEmoji(prob, tMax, uv);

    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'dia-card' + (i === 0 ? ' selected' : '');
    card.id = 'diaCard' + i;
    card.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
    const lluviaTxt = prob > 20 ? ', lluvia ' + prob + ' por ciento' : '';
    card.setAttribute(
      'aria-label',
      nombre + ', temperatura máxima ' + tMax + ' grados, mínima ' + tMin + ' grados' + lluviaTxt
    );
    card.innerHTML = `
      <div class="dia-nombre">${nombre}</div>
      <div class="dia-emoji">${emoji}</div>
      <div class="dia-temp">${tMax}° <span>${tMin}°</span></div>
      ${prob > 20 ? `<div class="dia-lluvia">${prob}%</div>` : ''}
    `;
    card.onclick = () => seleccionarDia(i);
    dias.appendChild(card);
  });
}

/**
 * Plazas con variedad en la instalación activa (torre, NFT, DWC, RDWC: misma matriz `state.torre`),
 * agrupadas por `grupo` del catálogo. `vacio: true` si no hay variedades → avisos conservadores.
 */
function meteoInstalacionPerfilCultivo() {
  const perf = {
    vacio: true,
    n: 0,
    lechugas: 0,
    hojas: 0,
    asiaticas: 0,
    frutos: 0,
    fresas: 0,
    hierbas: 0,
    raices: 0,
    microgreens: 0,
    tieneHojaBolting: false,
    tieneFrutos: false,
    tieneFresas: false,
    tieneHierbasRaizMicro: false,
    /** Hoja + fruto a la vez (depósito compartido; compatibilidad ya la avisa Sistema). */
    mezclaHojaYFruto: false,
  };
  if (!state.torre || !Array.isArray(state.torre)) return perf;
  const cfg = state.configTorre || {};
  const numN =
    typeof cfg.numNiveles === 'number' && cfg.numNiveles > 0
      ? cfg.numNiveles
      : typeof NUM_NIVELES !== 'undefined'
        ? NUM_NIVELES
        : 8;
  const numCCfg =
    typeof cfg.numCestas === 'number' && cfg.numCestas > 0
      ? cfg.numCestas
      : typeof NUM_CESTAS !== 'undefined'
        ? NUM_CESTAS
        : null;
  for (let n = 0; n < numN && n < state.torre.length; n++) {
    const row = state.torre[n] || [];
    const numC = numCCfg != null ? Math.min(numCCfg, row.length) : row.length;
    for (let c = 0; c < numC; c++) {
      const cel = row[c];
      if (!cel || !cel.variedad) continue;
      perf.n++;
      const db = typeof getCultivoDB === 'function' ? getCultivoDB(cel.variedad) : null;
      const g = db && db.grupo ? String(db.grupo) : 'lechugas';
      if (g === 'lechugas') perf.lechugas++;
      else if (g === 'hojas') perf.hojas++;
      else if (g === 'asiaticas') perf.asiaticas++;
      else if (g === 'frutos') perf.frutos++;
      else if (g === 'fresas') perf.fresas++;
      else if (g === 'hierbas') perf.hierbas++;
      else if (g === 'raices') perf.raices++;
      else if (g === 'microgreens') perf.microgreens++;
      else perf.lechugas++;
    }
  }
  if (perf.n === 0) return perf;
  perf.vacio = false;
  perf.tieneHojaBolting = perf.lechugas + perf.hojas + perf.asiaticas > 0;
  perf.tieneFrutos = perf.frutos > 0;
  perf.tieneFresas = perf.fresas > 0;
  perf.tieneHierbasRaizMicro = perf.hierbas + perf.raices + perf.microgreens > 0;
  perf.mezclaHojaYFruto =
    perf.tieneHojaBolting && (perf.tieneFrutos || perf.tieneFresas);
  return perf;
}

/** Máximo de tarjetas de alerta por día (evita lista interminable en torre mixta + NFT). */
const METEO_ALERTAS_MAX = 16;

/**
 * Fusiona avisos muy parecidos (p. ej. varios «VPD alto» seguidos) y quita duplicados exactos.
 * @returns {{ items: Array<{tipo:string,icon:string,txt:string}>, recortados: number }} recortados = avisos omitidos por el tope diario.
 */
function fusionarAlertasMeteo(list) {
  if (!list || !list.length) return { items: [], recortados: 0 };
  const out = [];
  let i = 0;
  while (i < list.length) {
    const a = list[i];
    const t = a && a.txt ? String(a.txt) : '';
    if (a && a.tipo === 'bad' && t.indexOf('VPD alto') === 0) {
      const parts = [t];
      i++;
      while (i < list.length) {
        const b = list[i];
        const tb = b && b.txt ? String(b.txt) : '';
        if (b && b.tipo === 'bad' && tb.indexOf('VPD alto') === 0) {
          parts.push(tb);
          i++;
        } else break;
      }
      out.push({
        tipo: 'bad',
        icon: '🔴',
        txt: parts.length === 1 ? parts[0] : parts.join('<br>'),
      });
      continue;
    }
    if (a && a.tipo === 'warn' && t.indexOf('VPD moderado-alto') === 0) {
      const parts = [t];
      i++;
      while (i < list.length) {
        const b = list[i];
        const tb = b && b.txt ? String(b.txt) : '';
        if (b && b.tipo === 'warn' && tb.indexOf('VPD moderado-alto') === 0) {
          parts.push(tb);
          i++;
        } else break;
      }
      out.push({
        tipo: 'warn',
        icon: '🟡',
        txt: parts.length === 1 ? parts[0] : parts.join('<br>'),
      });
      continue;
    }
    if (a && a.tipo === 'bad' && a.icon === '☀️' && /^UV\s+\d/.test(t)) {
      const parts = [t];
      i++;
      while (i < list.length) {
        const b = list[i];
        const tb = b && b.txt ? String(b.txt) : '';
        if (b && b.tipo === 'bad' && b.icon === '☀️' && /^UV\s+\d/.test(tb)) {
          parts.push(tb);
          i++;
        } else break;
      }
      out.push({
        tipo: 'bad',
        icon: '☀️',
        txt: parts.length === 1 ? parts[0] : parts.join('<br>'),
      });
      continue;
    }
    out.push(a);
    i++;
  }
  const seen = new Set();
  const dedup = [];
  for (let j = 0; j < out.length; j++) {
    const k = out[j].tipo + '\0' + out[j].txt;
    if (seen.has(k)) continue;
    seen.add(k);
    dedup.push(out[j]);
  }
  if (dedup.length <= METEO_ALERTAS_MAX) return { items: dedup, recortados: 0 };
  const okList = dedup.filter(x => x.tipo === 'ok');
  const nonOk = dedup.filter(x => x.tipo !== 'ok');
  let trimmed =
    okList.length > 1
      ? nonOk.concat([{ tipo: 'ok', icon: '✅', txt: okList.map(o => o.txt).join('<br>') }])
      : dedup;
  if (trimmed.length <= METEO_ALERTAS_MAX) return { items: trimmed, recortados: 0 };
  const recortados = trimmed.length - METEO_ALERTAS_MAX;
  return { items: trimmed.slice(0, METEO_ALERTAS_MAX), recortados };
}

function seleccionarDia(idx) {
  diaSeleccionado = idx;
  document.querySelectorAll('.dia-card').forEach((c, i) => {
    const on = i === idx;
    c.classList.toggle('selected', on);
    c.setAttribute('aria-pressed', on ? 'true' : 'false');
  });

  const d     = new Date(meteoData.daily.time[idx]);
  const nombre = idx === 0 ? 'Hoy' : idx === 1 ? 'Mañana' :
    `${DIAS_SEMANA[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`;

  const tMax   = Math.round(meteoData.daily.temperature_2m_max[idx]);
  const tMin   = Math.round(meteoData.daily.temperature_2m_min[idx]);
  const tMedia = (tMax + tMin) / 2;
  const prob   = meteoData.daily.precipitation_probability_max[idx];
  const precip = Math.round(meteoData.daily.precipitation_sum[idx] * 10) / 10;
  const viento = Math.round(meteoData.daily.windspeed_10m_max[idx]);
  const uvRaw  = meteoData.daily.uv_index_max?.[idx];
  const uv     = Number.isFinite(Number(uvRaw)) ? Math.round(Number(uvRaw)) : null;

  // Humedad media del día seleccionado
  const offset = idx * 24;
  const humHoras = meteoData.hourly.relative_humidity_2m.slice(offset, offset + 24);
  const humMedia = Math.round(humHoras.reduce((a,b) => a+b,0) / humHoras.length);

  // VPD medio
  const tempHoras = meteoData.hourly.temperature_2m.slice(offset, offset + 24);
  let sumVpd = 0;
  tempHoras.forEach((t, i) => {
    const h = humHoras[i] || humMedia;
    const pvs = 0.6108 * Math.pow(1 + t/100, 8.827);
    sumVpd += pvs * (1 - h/100);
  });
  const vpd = Math.round(sumVpd / 24 * 100) / 100;

  // Actualizar UI detalle
  setMeteoDetalleIconSvg(prob, tMax, uv ?? -1);
  document.getElementById('meteoDetalleDia').textContent   = nombre;
  document.getElementById('meteoDetalleCond').textContent  = condTexto(prob, tMax, uv ?? -1, viento);
  document.getElementById('mdTemp').textContent   = `${tMin}-${tMax}`;
  document.getElementById('mdHum').textContent    = humMedia + '%';
  document.getElementById('mdViento').textContent = viento;
  document.getElementById('mdUV').textContent     = uv != null ? uv : '—';
  document.getElementById('mdLluvia').textContent = prob + '%';
  document.getElementById('mdLitros').textContent = precip;

  // Alertas cultivo (vpd sigue calculado para heurísticas)
  renderAlertas(tMax, tMin, humMedia, viento, uv ?? 0, prob, vpd);
  actualizarMeteoCaptionInstalacionActiva();
}

function renderAlertas(tMax, tMin, hum, viento, uv, prob, vpd) {
  const alertas = [];
  const P = meteoInstalacionPerfilCultivo();
  const sinCultivo = P.vacio;
  /** Sin datos en torre → mensajes como si hubiera hoja (conservador). */
  const avisarHoja = sinCultivo || P.tieneHojaBolting;
  const avisarFrutos = !sinCultivo && (P.tieneFrutos || P.tieneFresas);
  const avisarHierbasRaizMicro =
    !sinCultivo && !P.tieneHojaBolting && !P.tieneFrutos && !P.tieneFresas && P.tieneHierbasRaizMicro;

  const cfgMet = state.configTorre || {};
  const tMet =
    typeof tipoInstalacionNormalizado === 'function' ? tipoInstalacionNormalizado(cfgMet) : 'torre';
  const labSis =
    typeof etiquetaSistemaHidroponicoBreve === 'function'
      ? etiquetaSistemaHidroponicoBreve(cfgMet)
      : 'Torre vertical';
  const sufCalorDeposito =
    tMet === 'nft'
      ? ' En NFT el canal expuesto calienta la lámina de agua con rapidez: agua de aporte más fresca si puedes y sombra del túnel/cañón.'
      : tMet === 'dwc' || tMet === 'rdwc'
        ? ' En ' +
          labSis +
          ' la cubeta al sol calienta el líquido: cubierta opaca, sombra lateral o cambio parcial de agua fría ayudan.'
        : ' En torre el depósito suele ir apartado del dosel; aun así vigila temperatura del líquido en olas de calor.';

  const ventVpdTxt =
    tMet === 'nft'
      ? 'buena ventilación alrededor del cultivo y del circuito NFT'
      : tMet === 'dwc' || tMet === 'rdwc'
        ? 'buena ventilación alrededor del follaje y del depósito / cubeta'
        : 'buena ventilación alrededor de la torre vertical y del follaje';
  const m = state.ultimaMedicion;
  const tempAgua = m?.temp ? parseFloat(m.temp) : null;
  const ecActual = m?.ec   ? parseFloat(m.ec)   : null;

  if (P.mezclaHojaYFruto) {
    alertas.push({
      tipo: 'ok',
      icon: 'ℹ️',
      txt: `Varias familias en tu ${labSis}: las alertas van por grupo (hoja vs fruto). Si comparten nutriente, valida «Compatibilidad de cultivos» en Cultivo e instalación; aquí solo clima y correcciones por tipo.`,
    });
  }

  // ── 🦠 PYTHIUM — todo hidro (torre, NFT, DWC); más urgente con agua caliente
  if (tempAgua !== null && tempAgua > 25) {
    alertas.push({ tipo:'bad', icon:'🦠', txt:`🚨 ALERTA PYTHIUM: Agua a ${tempAgua}°C — temperatura crítica. El hongo Pythium destruye raíces en horas. Enfriar el depósito urgente con agua fría o hielo.` });
  } else if (tempAgua !== null && tempAgua > 22) {
    alertas.push({ tipo:'warn', icon:'🦠', txt:`⚠️ Riesgo Pythium: Agua a ${tempAgua}°C — zona de peligro (>22°C). Vigilar raíces diariamente. Asegurar difusor 24h y depósito opaco.` });
  } else if (tMax > 30) {
    alertas.push({
      tipo: 'warn',
      icon: '🦠',
      txt: `⚠️ Temp ambiente ${tMax}°C — el líquido del circuito puede calentarse (${labSis}). Medir agua y cubrir depósito/canal.${sufCalorDeposito}`,
    });
  }

  // ── 🌿 Calor: espigado (lechuga / hoja / asiáticas p. ej. mostaza) — no frutos
  if (avisarHoja) {
    const asiatTxt = P.asiaticas > 0 ? ' Mostaza, mizuna y asiáticas suelen pasar pronto a flor con calor.' : '';
    if (tMax > 28)
      alertas.push({
        tipo: 'bad',
        icon: '🌿',
        txt: `🌡️ ${tMax}°C (hoja, ${labSis}) — bolting (espigado) muy probable en lechuga, rúcula, espinaca…${asiatTxt} Toldo u horario suave en horas centrales.`,
      });
    else if (tMax > 24)
      alertas.push({
        tipo: 'warn',
        icon: '🌿',
        txt: `🌡️ ${tMax}°C (hoja) — vigilar espigado y alargamiento; toldo 12–16 h o sombra parcial.${asiatTxt}`,
      });
  }

  // ── 🍅 Calor: frutos / fresas (pepino, tomate…) — no espigado; sí flor/fruto
  if (avisarFrutos) {
    const etiqueta = P.tieneFresas && !P.tieneFrutos ? 'fresas' : P.tieneFrutos && !P.tieneFresas ? 'frutos' : 'frutos o fresas';
    const sufNftPep =
      tMet === 'nft' && P.tieneFrutos
        ? ' NFT: raíces en aire + lámina fina; calor seco quema puntas — nebulización suave o sombrear malla si aplica.'
        : '';
    if (tMax > 34)
      alertas.push({
        tipo: 'bad',
        icon: '🍅',
        txt: `🌡️ ${tMax}°C (${etiqueta}, ${labSis}) — golpe de calor: marchitez, aborto floral o fruto joven dañado. Sombra fuerte mediodía, riego estable, ventilación.${sufNftPep}`,
      });
    else if (tMax > 30)
      alertas.push({
        tipo: 'warn',
        icon: '🍅',
        txt: `🌡️ ${tMax}°C (${etiqueta}) — estrés térmico: polinización (viento/vibración), riego uniforme y calcio; toldo si quema el follaje.${sufNftPep}`,
      });
    else if (tMax > 26)
      alertas.push({
        tipo: 'warn',
        icon: '🍅',
        txt: `🌡️ ${tMax}°C (${etiqueta}) — más transpiración; evita secar de golpe el medio (podredumbre apical en tomate/pepino).${sufNftPep}`,
      });
  }

  if (avisarHierbasRaizMicro) {
    if (tMax > 32)
      alertas.push({
        tipo: 'warn',
        icon: '🌿',
        txt: `🌡️ ${tMax}°C (hierbas / microgreens / raíces, ${labSis}) — calor intenso: sombra parcial y no secar bandeja; vigilar aromáticas y brotes.`,
      });
    else if (tMax > 27)
      alertas.push({
        tipo: 'warn',
        icon: '🌿',
        txt: `🌡️ ${tMax}°C (${labSis}) — día caluroso para hierbas/micro/raíces; riego ligero y ${ventVpdTxt}.`,
      });
  }

  // ── 🐛 Humedad / plagas — matices por grupo ───────────────────────────────
  if (hum > 85 && tMax > 20) {
    if (sinCultivo) {
      alertas.push({
        tipo: 'warn',
        icon: '🐛',
        txt: `💧 Humedad ${hum}% + calor — riesgo de mildiú y botritis en hoja y frutos. Mejorar ${ventVpdTxt} y evitar mojar follaje al atardecer.`,
      });
    } else {
      const partes = [];
      if (P.tieneFresas) partes.push('fresas: Botrytis y mildiú si hay rocío en flor/fruto');
      if (P.tieneHojaBolting) partes.push('hoja densa: mildiú en envés y hojas inferiores');
      if (P.tieneFrutos) partes.push('frutos: mildiú foliar u hongos si el dosel está cerrado');
      if (partes.length === 0)
        partes.push('hongos foliares si el follaje queda húmedo mucho tiempo');
      alertas.push({
        tipo: 'warn',
        icon: '🐛',
        txt: `💧 Humedad ${hum}% + calor — ${partes.join(' · ')}. Mejorar ${ventVpdTxt}.`,
      });
    }
  }
  if (hum < 30 && tMax > 25) {
    let detAra = 'revisa envés de hojas por araña o trips';
    if (avisarFrutos) detAra = 'en tomate/pepino/pimiento la araña roja es frecuente; revisa envés y tallos';
    else if (avisarHierbasRaizMicro && !avisarHoja) detAra = 'hierbas y brotes: revisa envés y puntas por trips o araña';
    alertas.push({
      tipo: 'warn',
      icon: '🐛',
      txt: `🌵 Humedad ${hum}% y calor — ambiente seco; ${detAra}.`,
    });
  }

  // ── 💧 EC respecto al rango del cultivo (misma lógica que Sistema/Medir), no umbrales fijos de «hoja» ──
  if (ecActual !== null) {
    let ecMinRef = 900;
    let ecMaxRef = 1600;
    try {
      if (typeof initTorres === 'function') initTorres();
      if (typeof getRecomendacionEcPhTorre === 'function') {
        const rec = getRecomendacionEcPhTorre();
        if (rec && rec.ec && Number.isFinite(rec.ec.min) && Number.isFinite(rec.ec.max)) {
          let lo = Math.round(Number(rec.ec.min));
          let hi = Math.round(Number(rec.ec.max));
          if (lo > hi) {
            const x = lo;
            lo = hi;
            hi = x;
          }
          if (hi >= lo) {
            ecMinRef = lo;
            ecMaxRef = hi;
          }
        }
      }
    } catch (_) {}
    const band = Math.max(1, ecMaxRef - ecMinRef);
    const margenUs = Math.max(80, Math.min(200, Math.round(band * 0.12)));
    if (ecActual > ecMaxRef + margenUs) {
      alertas.push({
        tipo: 'bad',
        icon: '⚡',
        txt:
          `EC ${ecActual} µS/cm — por encima del rango orientativo en tu ${labSis} (~${ecMinRef}–${ecMaxRef} µS/cm). Conviene diluir y volver a medir.`,
      });
    } else if (ecActual < ecMinRef - margenUs) {
      alertas.push({
        tipo: 'warn',
        icon: '⚡',
        txt: `EC ${ecActual} µS/cm — por debajo del rango orientativo en ${labSis} (~${ecMinRef}–${ecMaxRef} µS/cm). Puede haber hambre de nutrientes; corrige y vuelve a medir.`,
      });
    }
  }

  // (Aviso de plántulas nuevas: está en Consejos para no duplicar en Meteorología)

  // ── 🌊 VPD (transpiración) — distinto en hoja rápida vs frutos con fruto ───
  if (vpd > 1.6) {
    if (sinCultivo || avisarHoja)
      alertas.push({
        tipo: 'bad',
        icon: '🔴',
        txt: `VPD alto (hoja, ${labSis}) — lacio rápido al mediodía. Riego/sombra según instalación; revisar ~13 h.`,
      });
    if (avisarFrutos)
      alertas.push({
        tipo: 'bad',
        icon: '🔴',
        txt: `VPD alto (frutos, ${labSis}) — marchitez, fruto raído y bloqueo de calcio. Riego uniforme + sombra; en NFT vigila raíces y lámina; en DWC cubeta estable.`,
      });
    if (avisarHierbasRaizMicro && !avisarHoja && !avisarFrutos)
      alertas.push({
        tipo: 'bad',
        icon: '🔴',
        txt: `VPD alto (${labSis}) — brotes y hierbas pierden turgencia en seguida; sombra ligera y nebulización suave si aplica.`,
      });
  } else if (vpd > 1.2) {
    if (sinCultivo || avisarHoja)
      alertas.push({
        tipo: 'warn',
        icon: '🟡',
        txt: `VPD moderado-alto (hoja, ${labSis}) — lacio y bordes secos; riego o sombra.`,
      });
    if (avisarFrutos)
      alertas.push({
        tipo: 'warn',
        icon: '🟡',
        txt: `VPD moderado-alto (frutos, ${labSis}) — más demanda de agua; riego estable (podredumbre apical, estrés floral).`,
      });
    if (avisarHierbasRaizMicro && !avisarHoja && !avisarFrutos)
      alertas.push({
        tipo: 'warn',
        icon: '🟡',
        txt: `VPD moderado-alto (${labSis}) — hierbas/microgreens: evitar sequedad extrema del sustrato o bandeja.`,
      });
  } else if (vpd < 0.4) {
    let vpdBajo = 'Humedad muy alta — poco VPD: riesgo de hongos foliares. Asegura ' + ventVpdTxt + '.';
    if (avisarFrutos && !sinCultivo) vpdBajo += ' En frutos favorece oidio / manchas si el dosel está cerrado.';
    if ((P.tieneFresas || P.tieneHojaBolting) && !sinCultivo) vpdBajo += ' Fresas y hoja densa son muy sensibles al rocío prolongado.';
    if ((tMet === 'dwc' || tMet === 'rdwc') && avisarFrutos) vpdBajo += ' En DWC vigila también gotas sobre la cubeta y floración.';
    alertas.push({ tipo: 'warn', icon: '💧', txt: vpdBajo });
  } else {
    alertas.push({
      tipo: 'ok',
      icon: '✅',
      txt: `VPD del día razonable para tus cultivos en ${labSis} (ajusta por planta si el dosel está muy abierto o cerrado).`,
    });
  }

  if (uv >= 8 && tMax > 28) {
    if (avisarFrutos && !sinCultivo)
      alertas.push({
        tipo: 'bad',
        icon: '☀️',
        txt: `UV ${uv} + ${tMax}°C (frutos, ${labSis}) — quemadura en fruto y hoja; toldo o malla. Revisa Riego si usas sombra programada.`,
      });
    if (avisarHoja || sinCultivo)
      alertas.push({
        tipo: 'bad',
        icon: '☀️',
        txt: `UV ${uv} + ${tMax}°C (hoja, ${labSis}) — toldo o sombra en horas centrales; tipburn y lacio si el dosel recibe pleno sol.`,
      });
    if (avisarHierbasRaizMicro && !avisarHoja && !avisarFrutos && !sinCultivo)
      alertas.push({
        tipo: 'warn',
        icon: '☀️',
        txt: `UV ${uv} + ${tMax}°C — proteger hierbas/microgreens del pleno sol intenso.`,
      });
  } else if (uv >= 6) {
    alertas.push({
      tipo: 'warn',
      icon: '☀️',
      txt:
        avisarFrutos && !sinCultivo
          ? `UV ${uv} — con frutos en desarrollo conviene sombra parcial si la máxima supera ~28°C (piel de fruto y hoja).`
          : `UV ${uv} — considerar toldo o sombra si la temperatura supera ~28°C.`,
    });
  }

  if (tMin < 5)
    alertas.push({ tipo:'bad', icon:'🥶', txt:`Temperatura mínima ${tMin}°C — riesgo de estrés por frío en raíces. Verificar calentador.` });
  else if (tMin < 10)
    alertas.push({ tipo:'warn', icon:'🌡️', txt:`Noche fría (${tMin}°C) — el calentador del depósito es importante esta noche.` });

  if (viento > 40)
    alertas.push({ tipo:'warn', icon:'💨', txt:`Viento fuerte ${viento} km/h — aumenta la transpiración. El riego se ajusta automáticamente.` });

  const el = document.getElementById('meteoAlertas');
  if (!el) return;
  const pack = fusionarAlertasMeteo(alertas);
  let html = pack.items.map(a => `
    <div class="meteo-alerta-item ${a.tipo}">
      <span class="meteo-alerta-icon">${a.icon}</span>
      <span>${a.txt}</span>
    </div>
  `).join('');
  if (pack.recortados > 0) {
    const nR = pack.recortados;
    const avTxt = nR === 1 ? 'aviso' : 'avisos';
    const moTxt = nR === 1 ? 'no mostrado' : 'no mostrados';
    html +=
      '<div class="meteo-alertas-recorte" role="status" aria-live="polite">+' +
      nR +
      ' ' +
      avTxt +
      ' ' +
      moTxt +
      ' (máx. ' +
      METEO_ALERTAS_MAX +
      ' por día tras fusionar duplicados).</div>';
  }
  el.innerHTML = html;
}



