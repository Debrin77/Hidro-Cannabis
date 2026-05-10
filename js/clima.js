// Climatología — datos en la ubicación del sistema (cultivo activo o checklist).

function getClimaLocationLabel() {
  const loc = (myGrow && myGrow.location) || (appConfig && appConfig.location) || '';
  return (loc || '').trim();
}

async function geocodeForClima(name) {
  const geoResp = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=es&format=json`,
  );
  const geoData = await geoResp.json();
  const place = geoData?.results?.[0];
  if (!place) throw new Error('Ubicación no encontrada');
  return {
    lat: place.latitude,
    lon: place.longitude,
    label: `${place.name}${place.country ? ', ' + place.country : ''}`,
  };
}

async function fetchOpenMeteoForecast(lat, lon) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    '&current=temperature_2m,relative_humidity_2m,is_day,precipitation,weather_code,cloud_cover,wind_speed_10m' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_mean,wind_speed_10m_max' +
    '&forecast_days=8&timezone=auto';
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('No se pudo obtener el pronóstico');
  return resp.json();
}

function summarizeOutdoorRisksForCannabis(grow, daily) {
  const hints = [];
  if (!Array.isArray(daily?.time) || !grow) return hints;
  const strain = grow.strain;
  const daysSince = Math.floor((new Date() - grow.startDate) / 86400000);
  const weekNum = Math.max(1, Math.ceil((daysSince + 1) / 7));
  const inFlower = weekNum > strain.vegW + 2;

  const tmax0 = daily.temperature_2m_max?.[0];
  const tmin0 = daily.temperature_2m_min?.[0];
  const rain0 = daily.precipitation_sum?.[0];
  const prob0 = daily.precipitation_probability_mean?.[0];

  if (Number.isFinite(tmax0) && tmax0 >= 34) {
    hints.push({
      level: 'danger',
      text: `Calor extremo previsto (${tmax0.toFixed(0)}°C máx.). Estrés y parada de transpiración; busca sombra temporal y revisa riego de la solución.`,
    });
  } else if (Number.isFinite(tmax0) && tmax0 >= 30) {
    hints.push({
      level: 'warn',
      text: `Días calurosos (${tmax0.toFixed(0)}°C máx.). Sube la vigilancia de temperatura de agua y HR alrededor del follaje.`,
    });
  }

  if (Number.isFinite(tmin0) && tmin0 <= 6) {
    hints.push({
      level: 'danger',
      text: `Mínimas bajas (${tmin0.toFixed(0)}°C). Riesgo de daño foliar o parada de crecimiento en exterior.`,
    });
  }

  if (inFlower && Number.isFinite(rain0) && rain0 >= 5) {
    hints.push({
      level: 'warn',
      text: `Lluvia prevista (~${rain0.toFixed(1)} mm) en floración exterior: riesgo de botrytis; mejora ventilación cuando escampe y evita golpear cogollos mojados.`,
    });
  } else if (Number.isFinite(prob0) && prob0 >= 70 && Number.isFinite(rain0) && rain0 >= 2) {
    hints.push({
      level: 'info',
      text: `Alta probabilidad de precipitación (${prob0}%). Planifica protección o cubierta ligera.`,
    });
  }

  return hints;
}

async function refreshClimatologiaFromUi() {
  const btn = document.getElementById('climaRefreshBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Actualizando…';
  }
  const label = getClimaLocationLabel();
  const errEl = document.getElementById('climaError');
  if (errEl) errEl.innerHTML = '';
  try {
    if (!label) throw new Error('Indica la ubicación del sistema en el checklist (Sistema) o en el cultivo activo.');
    const geo = await geocodeForClima(label);
    const wx = await fetchOpenMeteoForecast(geo.lat, geo.lon);
    const bundle = {
      updatedAt: new Date().toISOString(),
      lat: geo.lat,
      lon: geo.lon,
      label: geo.label,
      query: label,
      current: wx.current || null,
      daily: wx.daily || null,
    };
    if (myGrow) {
      myGrow.siteWeather = bundle;
      if (!myGrow.climate) myGrow.climate = {};
      const cur = bundle.current;
      if (cur) {
        myGrow.climate.summary = `Estación: ${geo.label}`;
        myGrow.climate.temperature =
          cur.temperature_2m != null ? Number(cur.temperature_2m).toFixed(1) : myGrow.climate.temperature;
        myGrow.climate.humidity =
          cur.relative_humidity_2m != null ? Math.round(cur.relative_humidity_2m) : myGrow.climate.humidity;
        myGrow.climate.wind =
          cur.wind_speed_10m != null ? Number(cur.wind_speed_10m).toFixed(1) : myGrow.climate.wind;
        myGrow.climate.source = 'Open-Meteo (pestaña Climatología)';
      }
      saveGrowState();
    } else {
      if (!appConfig) appConfig = {};
      appConfig.climaSnapshot = bundle;
      saveAppConfig();
    }
  } catch (e) {
    if (errEl) {
      errEl.innerHTML = `<div class="alert danger"><i class="ti ti-alert-circle"></i><p>${e.message || 'Error al cargar clima.'}</p></div>`;
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="ti ti-refresh"></i> Actualizar pronóstico';
    }
    renderClimatologia();
  }
}

function renderClimatologia() {
  const host = document.getElementById('climatologiaContent');
  if (!host) return;

  const label = getClimaLocationLabel();
  const snap = myGrow?.siteWeather || appConfig?.climaSnapshot;
  const placement = myGrow?.placement || appConfig?.placement || 'interior';
  const risks = myGrow ? summarizeOutdoorRisksForCannabis(myGrow, snap?.daily) : [];

  const dailyRows =
    snap?.daily?.time && Array.isArray(snap.daily.time)
      ? snap.daily.time
          .slice(0, 7)
          .map((day, i) => {
            const tmax = snap.daily.temperature_2m_max?.[i];
            const tmin = snap.daily.temperature_2m_min?.[i];
            const rain = snap.daily.precipitation_sum?.[i];
            const prob = snap.daily.precipitation_probability_mean?.[i];
            const wmax = snap.daily.wind_speed_10m_max?.[i];
            const d = new Date(day);
            const dayStr = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
            return `<tr>
              <td>${dayStr}</td>
              <td class="ec-val">${Number.isFinite(tmin) && Number.isFinite(tmax) ? `${tmin.toFixed(0)} / ${tmax.toFixed(0)}°C` : '—'}</td>
              <td>${Number.isFinite(rain) ? rain.toFixed(1) + ' mm' : '—'}</td>
              <td>${Number.isFinite(prob) ? prob + '%' : '—'}</td>
              <td>${Number.isFinite(wmax) ? wmax.toFixed(0) + ' km/h' : '—'}</td>
            </tr>`;
          })
          .join('')
      : '';

  const currentBlock =
    snap?.current && Number.isFinite(snap.current.temperature_2m)
      ? `<div class="grid4 monitor-metrics">
          <div class="metric"><div class="metric-label">Temperatura</div><div class="metric-val c-amber">${Number(snap.current.temperature_2m).toFixed(1)}°C</div></div>
          <div class="metric"><div class="metric-label">Humedad</div><div class="metric-val c-blue">${snap.current.relative_humidity_2m ?? '—'}%</div></div>
          <div class="metric"><div class="metric-label">Viento (10 m)</div><div class="metric-val">${snap.current.wind_speed_10m != null ? Number(snap.current.wind_speed_10m).toFixed(1) + ' km/h' : '—'}</div></div>
          <div class="metric"><div class="metric-label">Nubosidad</div><div class="metric-val">${snap.current.cloud_cover ?? '—'}%</div></div>
        </div>`
      : `<div class="alert info"><i class="ti ti-cloud-off"></i><p>Pulsa <strong>Actualizar pronóstico</strong> para cargar datos de Open-Meteo en esta ubicación.</p></div>`;

  host.innerHTML = `
    <div class="card">
      <div class="card-header card-header--split">
        <div class="card-title"><i class="ti ti-map-pin"></i>Ubicación del sistema</div>
        <button type="button" class="btn btn-primary btn--compact" id="climaRefreshBtn" onclick="refreshClimatologiaFromUi()"><i class="ti ti-refresh"></i> Actualizar pronóstico</button>
      </div>
      <p class="body-prose">Los datos meteorológicos se calculan para <strong>${label || '— (sin ubicación)'}</strong>: es la misma ubicación que indicaste en el checklist o en el cultivo activo. Si en el futuro tuvieras varios sistemas en ciudades distintas, cada cultivo activo llevaría su propia ubicación.</p>
      <div class="param-row"><span class="param-key">Instalación</span><span class="param-val">${placement === 'exterior' ? 'Exterior' : 'Interior'}</span></div>
      ${
        snap?.updatedAt
          ? `<div class="param-row"><span class="param-key">Última actualización</span><span class="param-val">${new Date(snap.updatedAt).toLocaleString('es-ES')}</span></div>`
          : ''
      }
      ${snap?.label ? `<div class="param-row"><span class="param-key">Estación referencia</span><span class="param-val">${snap.label}</span></div>` : ''}
      <div id="climaError"></div>
    </div>

    ${
      placement === 'exterior' && risks.length
        ? `<div class="card">${risks.map((r) => `<div class="alert ${r.level === 'danger' ? 'danger' : r.level === 'warn' ? 'warn' : 'info'}"><i class="ti ti-alert-triangle"></i><p>${r.text}</p></div>`).join('')}</div>`
        : ''
    }

    <div class="card">
      <div class="card-header"><div class="card-title"><i class="ti ti-sun"></i>Condiciones actuales (API)</div></div>
      ${currentBlock}
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title"><i class="ti ti-calendar-week"></i>Pronóstico 7 días</div></div>
      ${
        dailyRows
          ? `<div class="table-scroll"><table class="week-table"><thead><tr><th>Día</th><th>Tª mín / máx</th><th>Lluvia</th><th>Prob.</th><th>Viento máx</th></tr></thead><tbody>${dailyRows}</tbody></table></div>`
          : `<p class="text-muted">Sin datos diarios todavía.</p>`
      }
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title"><i class="ti ti-leaf"></i>Microclima e interior</div></div>
      <p class="body-prose">La climatología abierta describe el entorno exterior. El <strong>microclima</strong> bajo cobertura (HR, temperatura de aire, CO₂, luz) debes registrarlo en <strong>Medir</strong> para VPD, alertas de hongo y seguimiento resolutivo.</p>
      <button type="button" class="btn btn-ghost" onclick="navTo('monitor')"><i class="ti ti-gauge"></i> Ir a Medir</button>
    </div>
  `;
}

window.refreshClimatologiaFromUi = refreshClimatologiaFromUi;
window.renderClimatologia = renderClimatologia;
