/**
 * MeteoAlarm: orquestación (EMMA, Nominatim, feed Atom, banner inicio, panel meteo, heurísticas).
 * Requiere antes: meteo-alarm-utils/parse, meteo-forecast-meteo.js, meteo-forecast-dashboard.js, riego-calculo-helpers.js, riego-calculo-calcular.js,
 * script principal (state, saveState, tipoInstalacionNormalizado, goTab).
 * Siguiente en index: app-hc-medicion-toast.js → setup-onboarding → torres-badges-notifs → pwa-fotodb.
 */

// ── Avisos: MeteoAlarm (CAP en js/meteo-alarm-utils.js; parse/coincidencias en js/meteo-alarm-parse.js) ──
let _meteoEmmaZonasLista = null;
let _meteoEmmaZonasPromise = null;

async function meteoCargarZonasEmmaCentroides() {
  if (_meteoEmmaZonasLista) return _meteoEmmaZonasLista;
  if (_meteoEmmaZonasPromise) return _meteoEmmaZonasPromise;
  _meteoEmmaZonasPromise = fetch(
    (typeof URL !== 'undefined' && typeof window !== 'undefined' && window.location && window.location.href)
      ? new URL('data/meteoalarm-emma-centroids.json', window.location.href).href
      : 'data/meteoalarm-emma-centroids.json',
    { cache: 'force-cache' }
  )
    .then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then((j) => {
      const z = Array.isArray(j.zones) ? j.zones : [];
      _meteoEmmaZonasLista = z.filter((x) => x != null && Number.isFinite(x.lat) && Number.isFinite(x.lon));
      return _meteoEmmaZonasLista;
    })
    .catch(() => {
      _meteoEmmaZonasLista = [];
      return _meteoEmmaZonasLista;
    })
    .finally(() => {
      _meteoEmmaZonasPromise = null;
    });
  return _meteoEmmaZonasPromise;
}

/** Resuelve el EMMA_ID MeteoAlarm más cercano al municipio geocodificado (data/meteoalarm-emma-centroids.json). */
async function meteoEmmaIdParaUbicacion(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return '';
  const zonas = await meteoCargarZonasEmmaCentroides();
  if (!zonas || zonas.length === 0) return '';
  let best = '';
  let bestKm = Infinity;
  for (let i = 0; i < zonas.length; i++) {
    const z = zonas[i];
    const km = meteoHaversineKm(lat, lon, z.lat, z.lon);
    if (km < bestKm) {
      bestKm = km;
      best = z.emma;
    }
  }
  if (bestKm > 380) return '';
  return best;
}

/** Coordenadas asociadas al municipio de avisos (geocodificación del texto) o, si no hay, a la instalación. */
function getMeteoLatLonParaNominatim(cfg) {
  const c = cfg || state.configTorre || {};
  const gl = parseFloat(c.meteoGeoLat);
  const glo = parseFloat(c.meteoGeoLon);
  if (isFinite(gl) && isFinite(glo)) return { lat: gl, lon: glo };
  const l = parseFloat(c.lat);
  const o = parseFloat(c.lon);
  if (isFinite(l) && isFinite(o)) return { lat: l, lon: o };
  return { lat: NaN, lon: NaN };
}

function getMunicipioMeteoFiltro() {
  const cfg = state.configTorre || {};
  const ex = (cfg.localidadMeteo || '').trim();
  if (ex) return ex.split(',')[0].trim();
  const nom = (_meteoNomiMunicipio || '').trim();
  if (nom) return nom;
  const c = (cfg.ciudad || '').trim();
  return c ? c.split(',')[0].trim() : '';
}

/** Municipio/localidad efectiva (campo avisos, Nominatim con coords de la torre, o primera parte de «ciudad»). */
function getMeteoUbicacionTorreContexto() {
  const cfg = state.configTorre || {};
  const municipioFiltro = getMunicipioMeteoFiltro();
  const lat = parseFloat(cfg.lat);
  const lon = parseFloat(cfg.lon);
  return { municipioFiltro, lat, lon };
}

function tieneDatosUbicacionParaAvisosMeteo(ctx) {
  const m = (ctx.municipioFiltro || '').trim();
  return m.length >= 2;
}

/** GPS solo para completar ubicación de avisos si falta texto (no sustituye la ciudad que tú escribiste en la torre). */
let _meteoAvisosGpsPromise = null;

async function ensureGpsUbicacionMeteoAvisos() {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return;
  if (_meteoAvisosGpsPromise) return _meteoAvisosGpsPromise;
  const now = Date.now();
  const last = state._meteoAvisosGpsTryAt || 0;
  if (now - last < 90 * 1000) return;
  state._meteoAvisosGpsTryAt = now;

  _meteoAvisosGpsPromise = new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          if (!state.configTorre) state.configTorre = {};
          const teniaCiudad = !!(state.configTorre.ciudad && String(state.configTorre.ciudad).trim());
          state.configTorre.lat = lat;
          state.configTorre.lon = lon;
          if (!teniaCiudad) {
            try {
              const url = 'https://nominatim.openstreetmap.org/reverse?lat=' + encodeURIComponent(lat) +
                '&lon=' + encodeURIComponent(lon) + '&format=json&accept-language=es';
              const r = await fetch(url, {
                headers: {
                  Accept: 'application/json',
                  'Accept-Language': 'es',
                  'User-Agent': 'HydrocaruTorre/1.0'
                }
              });
              if (r.ok) {
                const data = await r.json();
                const ad = data.address || {};
                const ciudad = ad.city || ad.town || ad.village || ad.municipality || '';
                const prov = ad.state || ad.region || '';
                if (ciudad || prov) {
                  state.configTorre.ciudad = (ciudad ? ciudad : 'Ubicación GPS') + (prov ? ', ' + prov : '');
                  if (ciudad) {
                    const lm = (state.configTorre.localidadMeteo || '').trim();
                    if (!lm) state.configTorre.localidadMeteo = String(ciudad).trim();
                  }
                }
              }
            } catch (_) {}
          }
          invalidateMeteoNomiCache();
          saveState();
        } finally {
          resolve();
        }
      },
      () => resolve(),
      { timeout: 12000, maximumAge: 120000, enableHighAccuracy: true }
    );
  }).finally(() => { setTimeout(() => { _meteoAvisosGpsPromise = null; }, 100); });

  return _meteoAvisosGpsPromise;
}

async function refreshMeteoNominatimContext() {
  const cfg = state.configTorre || {};
  const { lat, lon } = getMeteoLatLonParaNominatim(cfg);
  if (!isFinite(lat) || !isFinite(lon)) {
    _meteoNomiContext = '';
    _meteoNomiMunicipio = '';
    _meteoNomiBlobProvincia = '';
    _meteoNomiKey = null;
    return;
  }
  const key = String(Math.round(lat * 5000)) + '_' + String(Math.round(lon * 5000));
  if (_meteoNomiKey === key && _meteoNomiMunicipio && _meteoNomiBlobProvincia) return;
  _meteoNomiKey = key;
  _meteoNomiContext = '';
  _meteoNomiMunicipio = '';
  _meteoNomiBlobProvincia = '';
  try {
    const url = 'https://nominatim.openstreetmap.org/reverse?lat=' + encodeURIComponent(lat) +
      '&lon=' + encodeURIComponent(lon) + '&format=json&accept-language=es';
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'es',
        'User-Agent': 'HydrocaruTorre/1.0'
      }
    });
    if (!res.ok) return;
    const d = await res.json();
    const a = d.address || {};
    const muni = String(a.city || a.town || a.village || a.municipality || '').trim();
    _meteoNomiMunicipio = muni;
    _meteoNomiContext = muni;
    const bits = [
      a.city, a.town, a.village, a.municipality, a.hamlet, a.county, a.state_district,
      a.region, a.state, a.province, a.country, d.display_name
    ].filter(Boolean).join(' | ');
    _meteoNomiBlobProvincia = meteoNormTxt(bits).replace(/\s+/g, ' ').trim();
  } catch (_) {
    _meteoNomiContext = '';
    _meteoNomiMunicipio = '';
    _meteoNomiBlobProvincia = '';
  }
}

/** Geocodifica el municipio escrito en Medir (oculto) para alinear avisos con zonas MeteoAlarm por provincia. */
async function geocodificarLocalidadMeteoParaAvisos() {
  const v = (state.configTorre && state.configTorre.localidadMeteo) ? String(state.configTorre.localidadMeteo).trim() : '';
  if (!v) return;
  if (_geocodificarLocalidadMeteoPromise) return _geocodificarLocalidadMeteoPromise;
  _geocodificarLocalidadMeteoPromise = (async () => {
    try {
      const url = 'https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(v + ', España') +
        '&format=json&limit=1&countrycodes=es';
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'Accept-Language': 'es',
          'User-Agent': 'HydrocaruTorre/1.0'
        }
      });
      if (!res.ok) return;
      const arr = await res.json();
      if (!Array.isArray(arr) || !arr[0]) return;
      const la = parseFloat(arr[0].lat);
      const lo = parseFloat(arr[0].lon);
      if (!isFinite(la) || !isFinite(lo)) return;
      if (!state.configTorre) state.configTorre = {};
      state.configTorre.meteoGeoLat = la;
      state.configTorre.meteoGeoLon = lo;
      invalidateMeteoNomiCache();
      saveState();
      try { void refreshMeteoAlarmFlashDashboard(); } catch (_) {}
    } catch (_) {
    } finally {
      _geocodificarLocalidadMeteoPromise = null;
    }
  })();
  return _geocodificarLocalidadMeteoPromise;
}

function meteoAlarmCacheKey() {
  const ctx = getMeteoUbicacionTorreContexto();
  const m = (ctx.municipioFiltro || '').trim();
  const cfg = state.configTorre || {};
  const la = parseFloat(cfg.meteoGeoLat);
  const lo = parseFloat(cfg.meteoGeoLon);
  const useGeo = isFinite(la) && isFinite(lo);
  const latK = useGeo ? Math.round(la * 5000) : (Number.isFinite(ctx.lat) ? Math.round(ctx.lat * 5000) : 'x');
  const lonK = useGeo ? Math.round(lo * 5000) : (Number.isFinite(ctx.lon) ? Math.round(ctx.lon * 5000) : 'x');
  return m + '|' + latK + '|' + lonK;
}

async function obtenerMeteoalarmParaTorre() {
  await refreshMeteoNominatimContext();
  let ctx = getMeteoUbicacionTorreContexto();
  if (!ctx.municipioFiltro && (!Number.isFinite(ctx.lat) || !Number.isFinite(ctx.lon))) {
    await ensureGpsUbicacionMeteoAvisos();
    await refreshMeteoNominatimContext();
    ctx = getMeteoUbicacionTorreContexto();
  }
  if (!tieneDatosUbicacionParaAvisosMeteo(ctx)) {
    return { relevantes: [], error: null };
  }
  const cfg = state.configTorre || {};
  const { lat, lon } = getMeteoLatLonParaNominatim(cfg);
  const userEmma = await meteoEmmaIdParaUbicacion(lat, lon);
  const keyFresh = meteoAlarmCacheKey() + '|emma:' + (userEmma || '—');
  if (Date.now() - _meteoalarmListaCache.ts < 90000
    && _meteoalarmListaCache.key === keyFresh
    && Array.isArray(_meteoalarmListaCache.relevantes)) {
    return { relevantes: _meteoalarmListaCache.relevantes, error: null };
  }
  let xml;
  try {
    xml = await fetchMeteoalarmSpainProxied();
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    _meteoalarmListaCache = { ts: 0, key: '', relevantes: null };
    return { relevantes: [], error: msg };
  }
  const items = parseMeteoalarmAtomEntries(xml);
  const relevantes = items.filter(it => meteoalarmItemAfectaUbicacion(it, ctx, userEmma));
  const key = keyFresh;
  _meteoalarmListaCache = { ts: Date.now(), key, relevantes };
  return { relevantes, error: null };
}

function renderMeteoFlashBanner(relevantes, opts) {
  const el = document.getElementById('meteoFlashAviso');
  if (!el) return;
  el.classList.remove('meteo-flash-aviso--error');
  const errMsg = opts && opts.error ? String(opts.error) : '';
  if (errMsg) {
    el.classList.add('meteo-flash-aviso--error');
    el.innerHTML =
      '<div class="meteo-flash-inner meteo-flash-inner--error">' +
      '<div class="meteo-flash-kicker">Avisos oficiales (MeteoAlarm)</div>' +
      '<div class="meteo-flash-row meteo-flash-row--error">' +
      '<span class="meteo-flash-text"><span class="meteo-flash-title">' +
      meteoEscHtml('No se pudo cargar el feed: ' + errMsg) +
      '</span></span></div>' +
      '<button type="button" class="meteo-flash-cta" onclick="goTab(\'meteo\')">Meteorología</button>' +
      '</div>';
    el.classList.remove('setup-hidden');
    return;
  }
  if (!relevantes || relevantes.length === 0) {
    el.classList.add('setup-hidden');
    el.innerHTML = '';
    return;
  }
  const primeros = ordenarMeteoalarmPorRelevancia(relevantes).slice(0, 2);
  const rows = primeros.map((a) => {
    const rango = meteoFormateaRangoAvisoCaps(a);
    return '<div class="meteo-flash-row">' +
      '<span class="meteo-flash-icon" aria-hidden="true">' + a.icon + '</span>' +
      '<span class="meteo-flash-text">' +
      '<span class="meteo-flash-title">' + meteoEscHtml(a.titulo) + '</span>' +
      (rango ? '<span class="meteo-flash-dates">' + meteoEscHtml(rango) + '</span>' : '') +
      '</span></div>';
  });
  el.innerHTML =
    '<div class="meteo-flash-inner">' +
    '<div class="meteo-flash-kicker">Aviso meteorológico (AEMET / MeteoAlarm)</div>' +
    rows.join('') +
    '<button type="button" class="meteo-flash-cta" onclick="goTab(\'meteo\')">Ver en Meteorología</button>' +
    '</div>';
  el.classList.remove('setup-hidden');
}

let _meteoFlashDashPromise = null;
async function refreshMeteoAlarmFlashDashboard() {
  if (typeof instalacionEsUbicacionInterior === 'function' && instalacionEsUbicacionInterior()) {
    renderMeteoFlashBanner([]);
    return;
  }
  if (!tieneDatosUbicacionParaAvisosMeteo(getMeteoUbicacionTorreContexto())) {
    renderMeteoFlashBanner([]);
    return;
  }
  if (_meteoFlashDashPromise) return _meteoFlashDashPromise;
  _meteoFlashDashPromise = (async () => {
    try {
      const { relevantes, error } = await obtenerMeteoalarmParaTorre();
      if (error) renderMeteoFlashBanner([], { error });
      else renderMeteoFlashBanner(relevantes || []);
    } catch (_) {
      renderMeteoFlashBanner([]);
    } finally {
      setTimeout(() => { _meteoFlashDashPromise = null; }, 800);
    }
  })();
  return _meteoFlashDashPromise;
}

async function fetchMeteoalarmSpainProxied() {
  const atomUrl = 'https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-spain';
  const url = 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(atomUrl);
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 14000);
  try {
    const res = await fetch(url, { signal: ac.signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    let text = await res.text();
    if (text.charAt(0) === '{') {
      try {
        const j = JSON.parse(text);
        if (typeof j.contents === 'string') text = j.contents;
      } catch (_) {}
    }
    return text;
  } finally {
    clearTimeout(to);
  }
}

function buildAvisosMeteoHeuristicas() {
  if (!meteoData?.daily) return [];
  const tMw = tipoInstalacionNormalizado(state.configTorre || {});
  const txtVientoExtremo = tMw === 'nft'
    ? 'Asegura tubos, depósito y soportes del NFT; revisa anclajes.'
    : tMw === 'dwc'
      ? 'Asegura tapa, macetas y depósito DWC; revisa que no basculen.'
      : 'Asegura la torre vertical y el depósito; revisa estabilidad y sujeciones.';
  const P =
    typeof meteoInstalacionPerfilCultivo === 'function'
      ? meteoInstalacionPerfilCultivo()
      : { vacio: true, tieneHojaBolting: true, tieneFrutos: false, tieneFresas: false };
  const avisarHoja = P.vacio || P.tieneHojaBolting;
  const avisarFrutos = !P.vacio && (P.tieneFrutos || P.tieneFresas);
  const d = meteoData.daily;
  const tMax = Math.round(d.temperature_2m_max?.[0] ?? NaN);
  const tMin = Math.round(d.temperature_2m_min?.[0] ?? NaN);
  const viento = Math.round((d.wind_speed_10m_max?.[0] ?? d.windspeed_10m_max?.[0]) ?? NaN);
  const uv = Math.round(d.uv_index_max?.[0] ?? 0);
  const prob = Math.round(d.precipitation_probability_max?.[0] ?? NaN);
  const mm = Math.round((d.precipitation_sum?.[0] ?? 0) * 10) / 10;
  const alertas = [];

  if (isFinite(viento)) {
    if (viento >= 70) alertas.push({ tipo: 'bad', icon: '💨', titulo: 'Viento muy fuerte (' + viento + ' km/h)', txt: txtVientoExtremo });
    else if (viento >= 40) alertas.push({ tipo: 'warn', icon: '💨', titulo: 'Viento fuerte (' + viento + ' km/h)', txt: 'Aumenta transpiración y estrés. Vigila riego y anclajes.' });
  }
  if (isFinite(prob)) {
    if (prob >= 85 && mm >= 15) alertas.push({ tipo: 'warn', icon: '🌧️', titulo: 'Lluvia probable (' + prob + '%)', txt: 'Acumulado estimado ~' + mm + ' mm. Protege nutrientes/electricidad si estás en exterior.' });
    else if (prob >= 70) alertas.push({ tipo: 'warn', icon: '🌦️', titulo: 'Chubascos posibles (' + prob + '%)', txt: 'Planifica toldo/cobertura en horas de lluvia.' });
  }
  if (isFinite(tMax)) {
    if (avisarHoja) {
      if (tMax >= 36) {
        alertas.push({
          tipo: 'bad',
          icon: '🌡️',
          titulo: 'Calor extremo (' + tMax + '°C)',
          txt: 'Riesgo de bolting (hoja) y agua muy caliente. Toldo + vigilar temp del depósito.',
        });
      } else if (tMax >= 32) {
        alertas.push({
          tipo: 'warn',
          icon: '🌡️',
          titulo: 'Día muy caluroso (' + tMax + '°C)',
          txt: 'Vigila VPD y temperatura del agua. Sombra recomendada.',
        });
      }
    } else if (avisarFrutos) {
      if (tMax >= 36) {
        alertas.push({
          tipo: 'bad',
          icon: '🌡️',
          titulo: 'Calor extremo (' + tMax + '°C)',
          txt: 'Estrés térmico en flor/fruto, aborto floral o calidad baja. Sombra, ventilación y agua del circuito lo más fresca posible.',
        });
      } else if (tMax >= 32) {
        alertas.push({
          tipo: 'warn',
          icon: '🌡️',
          titulo: 'Día muy caluroso (' + tMax + '°C)',
          txt: 'Vigila polinización, cuajado y temperatura del depósito; sombrear en las horas centrales ayuda.',
        });
      }
    } else if (tMax >= 36) {
      alertas.push({
        tipo: 'bad',
        icon: '🌡️',
        titulo: 'Calor extremo (' + tMax + '°C)',
        txt: 'El líquido del sistema puede calentarse. Toldo o sombra y medir temperatura de agua.',
      });
    } else if (tMax >= 32) {
      alertas.push({
        tipo: 'warn',
        icon: '🌡️',
        titulo: 'Día muy caluroso (' + tMax + '°C)',
        txt: 'Vigila transpiración y temperatura del agua.',
      });
    }
  }
  if (isFinite(tMin) && tMin <= 1) {
    alertas.push({ tipo: 'warn', icon: '🥶', titulo: 'Noche fría (' + tMin + '°C)', txt: 'Posible estrés en raíces. Revisa calentador/aislamiento.' });
  }
  if (isFinite(uv) && uv >= 8) {
    const uvTxt = avisarFrutos && !avisarHoja
      ? 'Flor y fruto son sensibles; sombrear o filtrar UV intenso en las horas centrales.'
      : 'Evita sol directo prolongado; toldo recomendado.';
    alertas.push({ tipo: (tMax >= 30 ? 'bad' : 'warn'), icon: '☀️', titulo: 'UV alto (' + uv + ')', txt: uvTxt });
  }
  return alertas;
}

function enviarNotificacionSiAcordado(titulo, cuerpo, icono) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(titulo, {
      body: cuerpo || '',
      icon: icono || 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      tag: 'hidrocultivo-meteo',
    });
  } catch (_) {}
}

/**
 * Si hay permiso de notificaciones, comprueba MeteoAlarm al abrir la app (sin pasar por la pestaña).
 */
async function refrescarAvisosMeteoalarmEnSegundoPlano() {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  if (typeof instalacionEsUbicacionInterior === 'function' && instalacionEsUbicacionInterior()) return;
  try {
    const { relevantes, error } = await obtenerMeteoalarmParaTorre();
    if (!error && relevantes && relevantes.length) maybeNotificarMeteoalarmRelevantes(relevantes);
  } catch (_) {}
}

/** Una notificación por conjunto de avisos/día (si ya hay permiso). */
function maybeNotificarMeteoalarmRelevantes(relevantes) {
  if (!relevantes || relevantes.length === 0) return;
  const ids = relevantes.map(r => r.identifier || r.titulo).slice().sort().join('¦');
  const day = new Date().toISOString().slice(0, 10);
  const key = day + '|' + ids;
  if (state._meteoAlarmUltimoPushKey === key) return;
  state._meteoAlarmUltimoPushKey = key;
  saveState();
  const iconoNivel = relevantes.some(r => r.tipo === 'bad') ? '🔴'
    : relevantes.some(r => r.tipo === 'severe') ? '🟠' : '🟡';
  const cuerpo = relevantes.map(r => r.titulo).slice(0, 3).join(' · ');
  enviarNotificacionSiAcordado(
    iconoNivel + ' HidroCultivo — Aviso meteorológico (tu zona)',
    cuerpo + (relevantes.length > 3 ? '…' : ''),
    'icons/icon-192.png'
  );
}

async function renderMeteoPanelOficialMeteoalarmSiAplica() {
  const wrap = document.getElementById('meteoAvisosOficiales');
  if (!wrap) return;
  if (typeof instalacionEsUbicacionInterior === 'function' && instalacionEsUbicacionInterior()) {
    wrap.classList.add('setup-hidden');
    wrap.innerHTML = '';
    return;
  }
  wrap.classList.add('setup-hidden');
  wrap.innerHTML = '';

  let relevantes;
  let feedError = null;
  try {
    const r = await obtenerMeteoalarmParaTorre();
    relevantes = r.relevantes;
    feedError = r.error || null;
  } catch (_) {
    return;
  }
  if (feedError) {
    wrap.innerHTML =
      '<div class="meteo-alerta-item warn">' +
      '<span class="meteo-alerta-icon" aria-hidden="true">⚠️</span>' +
      '<span><strong>No se pudieron cargar los avisos oficiales</strong><br>' +
      '<span class="meteo-alerta-desc">' + meteoEscHtml(feedError) + '</span></span>' +
      '</div>';
    wrap.classList.remove('setup-hidden');
    return;
  }
  if (!relevantes || relevantes.length === 0) return;

  try {
    maybeNotificarMeteoalarmRelevantes(relevantes);
    const fuertes = relevantes.filter(it => it.tipo === 'severe' || it.tipo === 'bad');
    const amarillas = relevantes.filter(it => it.tipo === 'warn');
    let mostrar = ordenarMeteoalarmPorRelevancia(fuertes).slice(0, 8);
    const ya = new Set(mostrar.map(x => x.titulo));
    amarillas.forEach(y => {
      if (!ya.has(y.titulo) && mostrar.length < 10) {
        mostrar.push(y);
        ya.add(y.titulo);
      }
    });
    const parts = [];
    mostrar.forEach(a => {
      parts.push(meteoAlertaRowHtml(a));
    });
    wrap.innerHTML = parts.join('');
    wrap.classList.remove('setup-hidden');
  } catch (_) {
    /* Sin panel: evitamos ruido si el feed falla; AEMET sigue enlazable desde la web. */
  }
}

function renderMeteoPrevisionCultivoDia() {
  const wrap = document.getElementById('meteoPrevisionDia');
  if (!wrap) return;
  const parts = [];
  parts.push(
    '<div class="meteo-aviso-kicker meteo-aviso-kicker--spaced">Consejos para el cultivo (previsión de hoy)</div>'
  );
  if (!meteoData?.daily) {
    parts.push(
      '<div class="meteo-alerta-item warn"><span class="meteo-alerta-icon">📡</span><span>Sin datos suficientes para este bloque todavía.</span></div>'
    );
    wrap.innerHTML = parts.join('');
    wrap.classList.remove('setup-hidden');
    return;
  }
  const heur = buildAvisosMeteoHeuristicas();
  if (heur.length === 0) {
    parts.push(
      '<div class="meteo-alerta-item ok"><span class="meteo-alerta-icon">✅</span><span>Sin condiciones destacables para hoy según temperatura, viento, lluvia y UV.</span></div>'
    );
  } else {
    heur.slice(0, 6).forEach(a => {
      parts.push(meteoAlertaRowHtml(a));
    });
  }
  wrap.innerHTML = parts.join('');
  wrap.classList.remove('setup-hidden');
}

async function renderMeteoAvisosPanelCompleto() {
  if (typeof instalacionEsUbicacionInterior === 'function' && instalacionEsUbicacionInterior()) {
    const wo = document.getElementById('meteoAvisosOficiales');
    const prev = document.getElementById('meteoPrevisionDia');
    const ali = document.getElementById('meteoAlertas');
    const mc = document.getElementById('meteoMeteoclimaticBox');
    if (wo) {
      wo.classList.add('setup-hidden');
      wo.innerHTML = '';
    }
    if (mc) {
      mc.classList.add('setup-hidden');
      const mcIn = document.getElementById('meteoMeteoclimaticInner');
      if (mcIn) mcIn.innerHTML = '';
    }
    if (prev) {
      prev.innerHTML =
        '<div class="meteo-aviso-kicker meteo-aviso-kicker--spaced">Instalación en interior</div>' +
        '<div class="meteo-alerta-item ok"><span class="meteo-alerta-icon" aria-hidden="true">🏠</span><span>Los avisos de <strong>viento, lluvia y sol directo</strong> de la previsión exterior no aplican a tu cultivo en interior. El ambiente útil lo registras en <strong>Medir</strong> (y el historial de mediciones).</span></div>';
      prev.classList.remove('setup-hidden');
    }
    if (ali) {
      ali.innerHTML =
        '<div class="meteo-alerta-item ok"><span class="meteo-alerta-icon" aria-hidden="true">📅</span><span>La previsión de <strong>7 días</strong> debajo es solo referencia de temperaturas en la zona; no sustituye el control de sala o armario.</span></div>';
      ali.classList.remove('setup-hidden');
    }
    return;
  }
  await renderMeteoPanelOficialMeteoalarmSiAplica();
  renderMeteoPrevisionCultivoDia();
}
