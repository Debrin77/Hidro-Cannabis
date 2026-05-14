/**
 * Riego nativo: ET₀, VPD, índice de demanda, pulsos ON/OFF orientativos.
 * Torre vertical, nocturno fino y NFT/DWC avanzado: vista extendida en Integración.
 */

function escRiego(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function riegoLocalDateStr(d) {
  const x = d instanceof Date ? d : new Date();
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function sumHourlyForCalendarDay(times, values, dateStr) {
  if (!Array.isArray(times) || !Array.isArray(values) || !dateStr) return null;
  let sum = 0;
  let n = 0;
  for (let i = 0; i < times.length; i++) {
    if (String(times[i]).slice(0, 10) !== dateStr) continue;
    const v = Number(values[i]);
    if (Number.isFinite(v)) {
      sum += v;
      n++;
    }
  }
  return n > 0 ? sum : null;
}

function meanHourlyForCalendarDay(times, values, dateStr) {
  if (!Array.isArray(times) || !Array.isArray(values) || !dateStr) return null;
  let sum = 0;
  let n = 0;
  for (let i = 0; i < times.length; i++) {
    if (String(times[i]).slice(0, 10) !== dateStr) continue;
    const v = Number(values[i]);
    if (Number.isFinite(v)) {
      sum += v;
      n++;
    }
  }
  return n > 0 ? sum / n : null;
}

async function riegoResolveCoords() {
  const sw = myGrow?.siteWeather;
  if (sw && Number.isFinite(sw.lat) && Number.isFinite(sw.lon)) {
    return { lat: sw.lat, lon: sw.lon, label: (sw.label || sw.query || '').trim() };
  }
  const label =
    typeof getClimaLocationLabel === 'function' ? (getClimaLocationLabel() || '').trim() : '';
  if (!label || typeof geocodeForClima !== 'function') return null;
  const geo = await geocodeForClima(label);
  return { lat: geo.lat, lon: geo.lon, label: geo.label };
}

async function riegoFetchEt0Hourly(lat, lon, cellSelection) {
  const cell =
    cellSelection && (cellSelection === 'nearest' || cellSelection === 'land')
      ? `&cell_selection=${encodeURIComponent(cellSelection)}`
      : '';
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    '&hourly=et0_fao_evapotranspiration,temperature_2m,relative_humidity_2m,wind_speed_10m' +
    '&forecast_days=4&timezone=auto' +
    cell;
  const r = await fetch(url);
  if (!r.ok) throw new Error('No se pudo consultar ET₀ (Open-Meteo).');
  return r.json();
}

/** Reutilizar hourly del bundle de Climatología si es reciente y coincide la rejilla. */
const RIEGO_REUSE_SITE_WEATHER_MAX_MS = 4 * 60 * 60 * 1000;
const RIEGO_REUSE_COORD_MATCH_DEG = 0.08;

function riegoHourlyFromSiteWeather(sw) {
  const h = sw?.hourly;
  if (!h || !Array.isArray(h.time) || h.time.length < 8) return null;
  const et0 = h.et0_fao_evapotranspiration;
  const tH = h.temperature_2m;
  const rhH = h.relative_humidity_2m;
  if (!Array.isArray(et0) || et0.length !== h.time.length) return null;
  if (!Array.isArray(tH) || tH.length !== h.time.length) return null;
  if (!Array.isArray(rhH) || rhH.length !== h.time.length) return null;
  const wH =
    Array.isArray(h.wind_speed_10m) && h.wind_speed_10m.length === h.time.length ? h.wind_speed_10m : null;
  return {
    time: h.time,
    et0_fao_evapotranspiration: et0,
    temperature_2m: tH,
    relative_humidity_2m: rhH,
    wind_speed_10m: wH || h.time.map(() => NaN),
  };
}

function riegoCanReuseSiteWeatherHourly(sw, coords, todayStr) {
  if (!sw || !coords || !sw.updatedAt) return false;
  if (Date.now() - new Date(sw.updatedAt).getTime() > RIEGO_REUSE_SITE_WEATHER_MAX_MS) return false;
  if (!Number.isFinite(sw.lat) || !Number.isFinite(sw.lon)) return false;
  if (
    Math.abs(sw.lat - coords.lat) > RIEGO_REUSE_COORD_MATCH_DEG ||
    Math.abs(sw.lon - coords.lon) > RIEGO_REUSE_COORD_MATCH_DEG
  ) {
    return false;
  }
  const block = riegoHourlyFromSiteWeather(sw);
  if (!block) return false;
  const et0Today = sumHourlyForCalendarDay(block.time, block.et0_fao_evapotranspiration, todayStr);
  return et0Today != null && Number.isFinite(et0Today);
}

function riegoHintsExterior({ et0Today, tmax, tmin, windMax, probRain, vpdMean }) {
  const lines = [];
  if (et0Today != null && Number.isFinite(et0Today)) {
    lines.push(
      `ET₀ hoy (referencia FAO, rejilla): <strong>${et0Today.toFixed(1)} mm/día</strong>. Valores altos suelen ir con más transpiración y sequedad en copa.`,
    );
  }
  if (Number.isFinite(tmax) && tmax >= 32) {
    lines.push(
      `Calor marcado (máx. ~${tmax.toFixed(0)} °C): vigila temperatura de <strong>solución</strong> y sombreo temporal si aplica.`,
    );
  }
  if (Number.isFinite(probRain) && probRain >= 60) {
    lines.push(
      `Lluvia probable (~${Math.round(probRain)} %): en floración exterior conviene ventilar tras la lluvia y evitar golpear cogollos mojados.`,
    );
  }
  if (vpdMean != null && vpdMean > 1.35) {
    lines.push(
      `VPD medio del día elevado (~${vpdMean.toFixed(2)} kPa): transpiración fuerte; revisa riego de <strong>nutriente</strong> sin adivinar solo por el tiempo.`,
    );
  } else if (vpdMean != null && vpdMean < 0.45) {
    lines.push(
      `VPD bajo (~${vpdMean.toFixed(2)} kPa): menos demanda atmosférica; atención a exceso de humedad en copa si no hay movimiento de aire.`,
    );
  }
  if (Number.isFinite(windMax) && windMax >= 35) {
    lines.push(`Viento fuerte (rachas ~${windMax.toFixed(0)} km/h): estrés mecánico y secado rápido en hoja.`);
  }
  if (!lines.length) {
    lines.push(
      'Con los datos actuales no hay disparadores fuertes: mantén registro en <strong>Medir</strong> (pH, EC, Tª agua, HR cerca del dosel).',
    );
  }
  return lines;
}

function persistRiegoNativeSnapshot(patch) {
  if (!myGrow) return;
  if (!myGrow.fusion || typeof myGrow.fusion !== 'object') myGrow.fusion = {};
  myGrow.fusion.riegoNative = {
    ...(myGrow.fusion.riegoNative && typeof myGrow.fusion.riegoNative === 'object'
      ? myGrow.fusion.riegoNative
      : {}),
    ...patch,
  };
  if (typeof saveGrowState === 'function') saveGrowState();
}

/** Tras guardar pronóstico en Climatología: recalcula riego nativo sin bloquear la UI. */
let fusionRiegoRefreshTimer = null;
function scheduleFusionRiegoRefresh() {
  if (typeof myGrow === 'undefined' || !myGrow) return;
  if (fusionRiegoRefreshTimer != null) clearTimeout(fusionRiegoRefreshTimer);
  fusionRiegoRefreshTimer = window.setTimeout(() => {
    fusionRiegoRefreshTimer = null;
    if (typeof myGrow === 'undefined' || !myGrow || riegoUiLoading) return;
    refreshRiegoNativeData();
  }, 450);
}

/** Al abrir la pestaña Riego: refresco suave si el cálculo falta o está viejo (>20 min) o hubo error. */
let riegoLastTabFocusKickMs = 0;
function refreshRiegoOnTabFocus() {
  if (typeof myGrow === 'undefined' || !myGrow || riegoUiLoading) return;
  const now = Date.now();
  if (now - riegoLastTabFocusKickMs < 48000) return;
  const snap = myGrow.fusion?.riegoNative;
  const age = snap?.updatedAt ? now - new Date(snap.updatedAt).getTime() : Infinity;
  const stale =
    !snap?.updatedAt ||
    snap.error === 'sin-coords' ||
    !!snap.error ||
    age > 20 * 60 * 1000;
  if (!stale) return;
  riegoLastTabFocusKickMs = now;
  refreshRiegoNativeData();
}

function repaintFusionSurfacesAfterRiego() {
  const h = typeof location !== 'undefined' && location.hash ? location.hash.slice(1) : '';
  if (h === 'historial' && typeof renderHistorial === 'function') renderHistorial();
  if (h === 'semanas' && typeof renderSemanas === 'function') renderSemanas();
  if (h === 'inicio' && typeof renderInicio === 'function') renderInicio();
}

let riegoUiLoading = false;

async function refreshRiegoNativeData() {
  const host = document.getElementById('riegoContent');
  if (!host || riegoUiLoading) return;
  if (!myGrow) {
    renderRiego();
    return;
  }
  riegoUiLoading = true;
  renderRiego();
  try {
    const coords = await riegoResolveCoords();
    if (!coords) {
      persistRiegoNativeSnapshot({
        updatedAt: new Date().toISOString(),
        error: 'sin-coords',
        hourlySeriesSource: null,
      });
      riegoUiLoading = false;
      renderRiego();
      repaintFusionSurfacesAfterRiego();
      return;
    }
    const today = riegoLocalDateStr(new Date());
    const sw = myGrow.siteWeather;
    let times;
    let et0;
    let tH;
    let rhH;
    let wH;
    let hourlySeriesSource = 'api_open_meteo';

    if (riegoCanReuseSiteWeatherHourly(sw, coords, today)) {
      const b = riegoHourlyFromSiteWeather(sw);
      times = b.time;
      et0 = b.et0_fao_evapotranspiration;
      tH = b.temperature_2m;
      rhH = b.relative_humidity_2m;
      wH = b.wind_speed_10m;
      hourlySeriesSource = 'site_weather_bundle';
    }

    let et0Today = sumHourlyForCalendarDay(times, et0, today);
    if (et0Today == null || !Number.isFinite(et0Today)) {
      const cellSel = sw?.gridPrimary?.mode === 'land' ? 'land' : 'nearest';
      const wx = await riegoFetchEt0Hourly(coords.lat, coords.lon, cellSel);
      times = wx.hourly?.time;
      et0 = wx.hourly?.et0_fao_evapotranspiration;
      tH = wx.hourly?.temperature_2m;
      rhH = wx.hourly?.relative_humidity_2m;
      wH = wx.hourly?.wind_speed_10m;
      hourlySeriesSource = 'api_open_meteo';
      et0Today = sumHourlyForCalendarDay(times, et0, today);
    }
    const tMean = meanHourlyForCalendarDay(times, tH, today);
    const rhMean = meanHourlyForCalendarDay(times, rhH, today);
    const wMean = meanHourlyForCalendarDay(times, wH, today);
    const vpdMean =
      Number.isFinite(tMean) && Number.isFinite(rhMean) && typeof hydroRiegoVPDkPa === 'function'
        ? hydroRiegoVPDkPa(tMean, rhMean)
        : null;

    const daily = myGrow.siteWeather?.daily;
    const tmax0 = Array.isArray(daily?.temperature_2m_max) ? Number(daily.temperature_2m_max[0]) : NaN;
    const tmin0 = Array.isArray(daily?.temperature_2m_min) ? Number(daily.temperature_2m_min[0]) : NaN;
    const windMax0 = Array.isArray(daily?.wind_speed_10m_max)
      ? Number(daily.wind_speed_10m_max[0])
      : NaN;
    const prob0 = Array.isArray(daily?.precipitation_probability_mean)
      ? Number(daily.precipitation_probability_mean[0])
      : NaN;
    const uv0 = Array.isArray(daily?.uv_index_max) ? Number(daily.uv_index_max[0]) : NaN;

    const placement = myGrow.placement === 'exterior' ? 'exterior' : 'interior';
    const windUse = Number.isFinite(wMean) ? wMean : 0;
    const uvUse = Number.isFinite(uv0) ? uv0 : 0;
    const probUse = Number.isFinite(prob0) ? prob0 : 0;

    let demandaRel = null;
    let pulseMinON = null;
    let pulseMinOFF = null;
    let kcUsed = null;
    const nPlants =
      typeof getConfiguredSiteCount === 'function' ? getConfiguredSiteCount(myGrow) : 1;

    if (typeof hydroRiegoIndiceDemanda === 'function' && vpdMean != null) {
      demandaRel = hydroRiegoIndiceDemanda({
        vpdKpa: vpdMean,
        vientoKmh: windUse,
        uvIdx: uvUse,
        toldo: false,
        probLluvia: probUse,
        et0DayMm: et0Today,
      });
    }

    const strain = myGrow.strain;
    const veg = Number(strain?.vegW) || 4;
    const fl = Number(strain?.flowerW) || 9;
    const totalD = Math.max(28, (veg + fl) * 7);
    const days = Math.floor((Date.now() - myGrow.startDate.getTime()) / 86400000);
    const pctCiclo = Math.max(0, Math.min(1.15, days / totalD));
    if (typeof hydroRiegoKcDesdePctYGrupo === 'function') {
      kcUsed = hydroRiegoKcDesdePctYGrupo(pctCiclo, 'frutos');
    }

    const esInterior = placement !== 'exterior';
    if (
      demandaRel != null &&
      kcUsed != null &&
      typeof hydroRiegoMinutosDesdeDemanda === 'function' &&
      typeof hydroDefaultRockwoolLikeSubstrate === 'function'
    ) {
      const pul = hydroRiegoMinutosDesdeDemanda(
        demandaRel,
        nPlants,
        kcUsed,
        hydroDefaultRockwoolLikeSubstrate(),
        esInterior,
      );
      pulseMinON = pul.minON;
      pulseMinOFF = pul.minOFF;
    }

    persistRiegoNativeSnapshot({
      updatedAt: new Date().toISOString(),
      error: null,
      lat: coords.lat,
      lon: coords.lon,
      label: coords.label,
      et0TodayMm: et0Today,
      vpdMeanKpa: vpdMean,
      tmeanDay: tMean,
      rhmeanDay: rhMean,
      tmaxDaily: Number.isFinite(tmax0) ? tmax0 : null,
      tminDaily: Number.isFinite(tmin0) ? tmin0 : null,
      windMaxDailyKmh: Number.isFinite(windMax0) ? windMax0 : null,
      probRainDaily: probUse,
      uvDailyMax: uvUse,
      demandaRel,
      riegoKc: kcUsed,
      riegoPlants: nPlants,
      pulseMinON,
      pulseMinOFF,
      riegoPctCiclo: pctCiclo,
      hourlySeriesSource,
    });
  } catch (e) {
    persistRiegoNativeSnapshot({
      updatedAt: new Date().toISOString(),
      error: String(e.message || e || 'error'),
      hourlySeriesSource: null,
    });
  } finally {
    riegoUiLoading = false;
    renderRiego();
    repaintFusionSurfacesAfterRiego();
  }
}

function renderRiego() {
  const host = document.getElementById('riegoContent');
  if (!host) return;

  if (!myGrow) {
    host.innerHTML = `
      <div class="card">
        <div class="card-header"><div class="card-title"><i class="ti ti-droplet"></i>Riego</div></div>
        <p class="body-prose">Activa un cultivo en <strong>Cultivo</strong> e indica ubicación (exterior o datos en <strong>Climatología</strong>) para orientar el riego con el tiempo.</p>
        <button type="button" class="btn btn-primary" onclick="navTo('cultivo')"><i class="ti ti-bucket"></i> Ir a Cultivo</button>
      </div>`;
    return;
  }

  const placement = myGrow.placement === 'exterior' ? 'exterior' : 'interior';
  const snap = myGrow.fusion?.riegoNative;
  const resL = Number.isFinite(myGrow.reservoirL) ? myGrow.reservoirL : null;
  const sys = myGrow.system || 'DWC';

  let dataBlock = '';
  if (riegoUiLoading) {
    dataBlock =
      '<div class="alert info"><i class="ti ti-refresh"></i><p>Calculando ET₀ y VPD (reutiliza pronóstico guardado si aplica)…</p></div>';
  } else if (snap?.error === 'sin-coords') {
    dataBlock = `<div class="alert warn"><i class="ti ti-map-pin"></i><p>Sin coordenadas: abre <strong>Climatología</strong> y pulsa <strong>Actualizar pronóstico</strong> (o indica ciudad en cultivo) para geolocalizar y calcular ET₀.</p></div>
      <button type="button" class="btn btn-ghost" onclick="navTo('climatologia')"><i class="ti ti-cloud-storm"></i> Climatología</button>`;
  } else if (snap?.error) {
    dataBlock = `<div class="alert warn"><i class="ti ti-alert-triangle"></i><p>${escRiego(snap.error)}</p></div>
      <div class="riego-toolbar riego-toolbar--after-alert">
        <button type="button" class="btn btn-primary btn--compact" onclick="refreshRiegoNativeData()" ${riegoUiLoading ? 'disabled' : ''}><i class="ti ti-refresh"></i> Reintentar</button>
        <button type="button" class="btn btn-ghost btn--compact" onclick="navTo('climatologia')"><i class="ti ti-cloud-storm"></i> Climatología</button>
      </div>`;
  } else if (snap?.updatedAt) {
    const et0 = Number.isFinite(snap.et0TodayMm) ? snap.et0TodayMm : null;
    const hints =
      placement === 'exterior'
        ? riegoHintsExterior({
            et0Today: et0,
            tmax: snap.tmaxDaily,
            tmin: snap.tminDaily,
            windMax: snap.windMaxDailyKmh,
            probRain: snap.probRainDaily,
            vpdMean: snap.vpdMeanKpa,
          })
        : [
            'En <strong>interior</strong> el riego del nutriente lo marca la lámpara, la transpiración del dosel y el tamaño del depósito; el tiempo exterior es secundario.',
            'Usa <strong>Medir</strong> para Tª/HR/pH/EC y ajusta recirculación o temporizador según tu sistema (' +
              escRiego(sys) +
              ').',
          ];
    const meta = snap.label ? escRiego(snap.label) : 'coordenadas guardadas';
    const tUp = new Date(snap.updatedAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
    dataBlock = `
      <div class="card">
        <div class="card-header"><div class="card-title"><i class="ti ti-sun"></i>Clima · ET₀ hoy</div></div>
        <p class="text-muted riego-meta">Ubicación: <strong>${meta}</strong> · Actualizado ${escRiego(tUp)}</p>
        ${
          et0 != null
            ? `<p class="body-prose">ET₀ acumulado hoy (FAO, suma horaria): <strong>${et0.toFixed(1)} mm/día</strong>.</p>`
            : '<p class="text-muted">No se pudo sumar ET₀ para el día local (serie incompleta).</p>'
        }
        ${Number.isFinite(snap.vpdMeanKpa) ? `<p class="text-muted">VPD medio estimado (modelo): ~${snap.vpdMeanKpa.toFixed(2)} kPa.</p>` : ''}
        ${
          snap.hourlySeriesSource === 'site_weather_bundle'
            ? '<p class="text-muted riego-reuse-hint"><i class="ti ti-database"></i> Serie horaria reutilizada del pronóstico guardado en <strong>Climatología</strong> (misma rejilla; sin petición duplicada a Open-Meteo).</p>'
            : ''
        }
        <ul class="riego-hint-list">${hints.map((h) => `<li>${h}</li>`).join('')}</ul>
      </div>
      ${
        Number.isFinite(snap.demandaRel)
          ? `<div class="card">
        <div class="card-header"><div class="card-title"><i class="ti ti-activity"></i>Demanda y pulsos (modelo de referencia, adaptado)</div></div>
        <p class="body-prose body-prose--tight">Índice de demanda relativa <strong>${snap.demandaRel.toFixed(2)}</strong> (≈0,48–1,58) con VPD medio, viento horario medio, UV máx. del día, probabilidad de lluvia y ET₀. Kc operativo ≈<strong>${Number.isFinite(snap.riegoKc) ? snap.riegoKc.toFixed(2) : '—'}</strong> (ciclo cannabis ~${snap.riegoPctCiclo != null ? (snap.riegoPctCiclo * 100).toFixed(0) : '—'} % del total veg+flor, grupo «frutos»).</p>
        ${
          Number.isFinite(snap.pulseMinON) && Number.isFinite(snap.pulseMinOFF)
            ? `<p class="body-prose">Pulsos <strong>orientativos</strong> (sustrato tipo lana/roca hidro): bomba ~<strong>${snap.pulseMinON} min ON</strong> / ~<strong>${snap.pulseMinOFF} min OFF</strong> · ${snap.riegoPlants || 1} sitio(s). En <strong>RDWC</strong> suele mandar el depósito común; ajusta siempre con <strong>Medir</strong> y fabricante.</p>`
            : '<p class="text-muted">Sin minutos de pulso calculables.</p>'
        }
        <p class="text-muted riego-disclaimer">No sustituye caudalímetro ni la app completa de torre; valida en <strong>Riego extendido (integración)</strong> si usas goteo programado.</p>
      </div>`
          : ''
      }`;
  } else {
    dataBlock =
      '<p class="text-muted">Pulsa «Actualizar datos» para traer ET₀ y VPD del día según tu ubicación.</p>';
  }

  const installScopeRiego =
    typeof getActiveInstallationScopeBannerHtml === 'function'
      ? getActiveInstallationScopeBannerHtml(myGrow, { compact: true })
      : '';

  host.innerHTML = `
    <div class="card">
      ${installScopeRiego}
      <div class="card-header"><div class="card-title"><i class="ti ti-droplet"></i>Tu instalación</div></div>
      <p class="body-prose">Emplazamiento: <strong>${escRiego(placement)}</strong> · Sistema: <strong>${escRiego(sys)}</strong>${
    resL != null ? ` · Depósito ~<strong>${resL} L</strong>` : ''
  }.</p>
      <p class="body-prose body-prose--tight">Incluye <strong>ET₀</strong>, <strong>VPD</strong>, demanda relativa y <strong>pulsos ON/OFF</strong> orientativos. Tras guardar en <strong>Climatología</strong>, el cálculo se sincroniza solo en unos instantes. Torre vertical y compatibilidad avanzada siguen en <strong>Riego extendido (integración)</strong>.</p>
      <div class="riego-toolbar">
        <button type="button" class="btn btn-primary" onclick="refreshRiegoNativeData()" ${riegoUiLoading ? 'disabled' : ''}>
          <i class="ti ti-refresh"></i> Actualizar datos
        </button>
        <button type="button" class="btn btn-ghost" onclick="navToHcEmbed('riego')"><i class="ti ti-external-link"></i> Riego extendido (integración)</button>
        <button type="button" class="btn btn-ghost" onclick="navTo('monitor')"><i class="ti ti-gauge"></i> Medir</button>
      </div>
    </div>
    ${dataBlock}
  `;
}

window.renderRiego = renderRiego;
window.refreshRiegoNativeData = refreshRiegoNativeData;
window.scheduleFusionRiegoRefresh = scheduleFusionRiegoRefresh;
window.refreshRiegoOnTabFocus = refreshRiegoOnTabFocus;
