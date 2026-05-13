/**
 * Riego nativo: ET₀, VPD (núcleo HC), índice de demanda, pulsos ON/OFF orientativos.
 * Torre vertical, nocturno fino y NFT/DWC avanzado: «Riego completo (HC)».
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

async function riegoFetchEt0Hourly(lat, lon) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    '&hourly=et0_fao_evapotranspiration,temperature_2m,relative_humidity_2m,wind_speed_10m' +
    '&forecast_days=4&timezone=auto';
  const r = await fetch(url);
  if (!r.ok) throw new Error('No se pudo consultar ET₀ (Open-Meteo).');
  return r.json();
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
      });
      riegoUiLoading = false;
      renderRiego();
      return;
    }
    const wx = await riegoFetchEt0Hourly(coords.lat, coords.lon);
    const times = wx.hourly?.time;
    const et0 = wx.hourly?.et0_fao_evapotranspiration;
    const tH = wx.hourly?.temperature_2m;
    const rhH = wx.hourly?.relative_humidity_2m;
    const wH = wx.hourly?.wind_speed_10m;
    const today = riegoLocalDateStr(new Date());
    const et0Today = sumHourlyForCalendarDay(times, et0, today);
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
    });
  } catch (e) {
    persistRiegoNativeSnapshot({
      updatedAt: new Date().toISOString(),
      error: String(e.message || e || 'error'),
    });
  } finally {
    riegoUiLoading = false;
    renderRiego();
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
      '<div class="alert info"><i class="ti ti-refresh"></i><p>Consultando Open-Meteo (ET₀ horario)…</p></div>';
  } else if (snap?.error === 'sin-coords') {
    dataBlock = `<div class="alert warn"><i class="ti ti-map-pin"></i><p>Sin coordenadas: abre <strong>Climatología</strong> y pulsa <strong>Actualizar pronóstico</strong> (o indica ciudad en cultivo) para geolocalizar y calcular ET₀.</p></div>
      <button type="button" class="btn btn-ghost" onclick="navTo('climatologia')"><i class="ti ti-cloud-storm"></i> Climatología</button>`;
  } else if (snap?.error) {
    dataBlock = `<div class="alert warn"><i class="ti ti-alert-triangle"></i><p>${escRiego(snap.error)}</p></div>`;
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
        <ul class="riego-hint-list">${hints.map((h) => `<li>${h}</li>`).join('')}</ul>
      </div>
      ${
        Number.isFinite(snap.demandaRel)
          ? `<div class="card">
        <div class="card-header"><div class="card-title"><i class="ti ti-activity"></i>Demanda y pulsos (modelo HC, adaptado)</div></div>
        <p class="body-prose body-prose--tight">Índice de demanda relativa <strong>${snap.demandaRel.toFixed(2)}</strong> (≈0,48–1,58) con VPD medio, viento horario medio, UV máx. del día, probabilidad de lluvia y ET₀. Kc operativo ≈<strong>${Number.isFinite(snap.riegoKc) ? snap.riegoKc.toFixed(2) : '—'}</strong> (ciclo cannabis ~${snap.riegoPctCiclo != null ? (snap.riegoPctCiclo * 100).toFixed(0) : '—'} % del total veg+flor, grupo «frutos»).</p>
        ${
          Number.isFinite(snap.pulseMinON) && Number.isFinite(snap.pulseMinOFF)
            ? `<p class="body-prose">Pulsos <strong>orientativos</strong> (sustrato tipo lana/roca hidro): bomba ~<strong>${snap.pulseMinON} min ON</strong> / ~<strong>${snap.pulseMinOFF} min OFF</strong> · ${snap.riegoPlants || 1} sitio(s). En <strong>RDWC</strong> suele mandar el depósito común; ajusta siempre con <strong>Medir</strong> y fabricante.</p>`
            : '<p class="text-muted">Sin minutos de pulso calculables.</p>'
        }
        <p class="text-muted riego-disclaimer">No sustituye caudalímetro ni la app completa de torre; valida en <strong>Riego completo (HC)</strong> si usas goteo programado.</p>
      </div>`
          : ''
      }`;
  } else {
    dataBlock =
      '<p class="text-muted">Pulsa «Actualizar datos» para traer ET₀ y VPD del día según tu ubicación.</p>';
  }

  host.innerHTML = `
    <div class="card">
      <div class="card-header"><div class="card-title"><i class="ti ti-droplet"></i>Tu instalación</div></div>
      <p class="body-prose">Emplazamiento: <strong>${escRiego(placement)}</strong> · Sistema: <strong>${escRiego(sys)}</strong>${
    resL != null ? ` · Depósito ~<strong>${resL} L</strong>` : ''
  }.</p>
      <p class="body-prose body-prose--tight">Incluye <strong>ET₀</strong>, <strong>VPD</strong>, demanda tipo HC y <strong>pulsos ON/OFF</strong> orientativos. Torre vertical, nocturno fino y compatibilidad NFT/DWC avanzada siguen en <strong>Riego completo (HC)</strong>.</p>
      <div class="riego-toolbar">
        <button type="button" class="btn btn-primary" onclick="refreshRiegoNativeData()" ${riegoUiLoading ? 'disabled' : ''}>
          <i class="ti ti-refresh"></i> Actualizar datos
        </button>
        <button type="button" class="btn btn-ghost" onclick="navToHcEmbed('riego')"><i class="ti ti-external-link"></i> Riego completo (HC)</button>
        <button type="button" class="btn btn-ghost" onclick="navTo('monitor')"><i class="ti ti-gauge"></i> Medir</button>
      </div>
    </div>
    ${dataBlock}
  `;
}

window.renderRiego = renderRiego;
window.refreshRiegoNativeData = refreshRiegoNativeData;
