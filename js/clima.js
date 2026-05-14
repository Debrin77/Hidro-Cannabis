// Climatología — datos en la ubicación del cultivo hidropónico (cultivo activo o checklist).

let climaApiErrorMessage = '';

function escapeHtmlClima(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeHtmlAttrClima(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function getClimaLocationLabel() {
  const loc = (myGrow && myGrow.location) || (appConfig && appConfig.location) || '';
  return (loc || '').trim();
}

async function geocodeForClima(name) {
  const geoResp = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=5&language=es&format=json`,
  );
  const geoData = await geoResp.json();
  const results = geoData?.results || [];
  const place = results[0];
  if (!place) throw new Error('Ubicación no encontrada');
  const fmt = (p) =>
    `${p.name}${p.admin1 ? ', ' + p.admin1 : ''}${p.country ? ', ' + p.country : ''}`;
  const alternates = results.slice(1, 5).map((p) => ({
    label: fmt(p),
    lat: p.latitude,
    lon: p.longitude,
    elevation: p.elevation,
  }));
  return {
    lat: place.latitude,
    lon: place.longitude,
    label: fmt(place),
    alternates,
  };
}

const OPEN_METEO_CURRENT =
  'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index';
const OPEN_METEO_DAILY =
  'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_mean,wind_speed_10m_max,wind_direction_10m_dominant,uv_index_max,sunrise,sunset';
const OPEN_METEO_HOURLY =
  'temperature_2m,relative_humidity_2m,wind_speed_10m,uv_index,et0_fao_evapotranspiration';

async function fetchOpenMeteoForecast(lat, lon, cellSelection) {
  const cell = cellSelection ? `&cell_selection=${encodeURIComponent(cellSelection)}` : '';
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=${OPEN_METEO_CURRENT}&daily=${OPEN_METEO_DAILY}` +
    `&hourly=${OPEN_METEO_HOURLY}&forecast_days=8&timezone=auto${cell}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('No se pudo obtener el pronóstico');
  return resp.json();
}

async function fetchOpenMeteoElevation(lat, lon) {
  const resp = await fetch(
    `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`,
  );
  if (!resp.ok) return null;
  const j = await resp.json();
  const v = j?.elevation?.[0];
  return Number.isFinite(v) ? v : null;
}

function gridKeyFromForecast(wx) {
  if (!wx || !Number.isFinite(wx.latitude) || !Number.isFinite(wx.longitude)) return '';
  const el = Number.isFinite(wx.elevation) ? wx.elevation : 'na';
  return `${wx.latitude.toFixed(4)},${wx.longitude.toFixed(4)},${el}`;
}

function windDirLabel(deg) {
  if (!Number.isFinite(deg)) return '—';
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  return dirs[Math.round(deg / 45) % 8] + ` (${Math.round(deg)}°)`;
}

/** Código WMO (Open-Meteo) → icono Tabler, etiqueta ES y tono visual para la tarjeta. */
function getDailyWeatherVisual(code) {
  const c = Number(code);
  if (!Number.isFinite(c)) return { icon: 'ti-cloud-off', label: 'Sin datos', tone: 'neutral' };
  if (c === 0) return { icon: 'ti-sun', label: 'Despejado', tone: 'clear' };
  if (c === 1) return { icon: 'ti-sun', label: 'Poco nublado', tone: 'clear' };
  if (c === 2) return { icon: 'ti-cloud', label: 'Parcialmente nublado', tone: 'cloud' };
  if (c === 3) return { icon: 'ti-cloud', label: 'Nublado', tone: 'cloud' };
  if (c === 45 || c === 48) return { icon: 'ti-cloud-fog', label: 'Niebla', tone: 'fog' };
  if (c >= 51 && c <= 55) return { icon: 'ti-droplet', label: 'Llovizna', tone: 'rain' };
  if (c === 56 || c === 57) return { icon: 'ti-droplet', label: 'Llovizna helada', tone: 'rain' };
  if (c === 61 || c === 63 || c === 65) return { icon: 'ti-cloud-rain', label: 'Lluvia', tone: 'rain' };
  if (c === 66 || c === 67) return { icon: 'ti-cloud-rain', label: 'Lluvia helada', tone: 'rain' };
  if (c === 71 || c === 73 || c === 75) return { icon: 'ti-snowflake', label: 'Nieve', tone: 'snow' };
  if (c === 77) return { icon: 'ti-snowflake', label: 'Granizo fino', tone: 'snow' };
  if (c === 80 || c === 81) return { icon: 'ti-cloud-rain', label: 'Chubascos', tone: 'rain' };
  if (c === 82) return { icon: 'ti-cloud-storm', label: 'Chubascos fuertes', tone: 'storm' };
  if (c === 85 || c === 86) return { icon: 'ti-snowflake', label: 'Chubascos de nieve', tone: 'snow' };
  if (c === 95) return { icon: 'ti-bolt', label: 'Tormenta', tone: 'storm' };
  if (c === 96 || c === 99) return { icon: 'ti-bolt', label: 'Tormenta y granizo', tone: 'storm' };
  return { icon: 'ti-cloud', label: 'Variable', tone: 'cloud' };
}

function renderDailyForecastIconStrip(snap) {
  if (!snap?.daily?.time || !Array.isArray(snap.daily.time)) return { strip: '', detailTable: '' };

  const times = snap.daily.time.slice(0, 7);
  const todayKey = new Date().toDateString();
  const cards = times
    .map((day, i) => {
      const wcode = snap.daily.weather_code?.[i];
      const vis = getDailyWeatherVisual(wcode);
      const tmax = snap.daily.temperature_2m_max?.[i];
      const tmin = snap.daily.temperature_2m_min?.[i];
      const rain = snap.daily.precipitation_sum?.[i];
      const prob = snap.daily.precipitation_probability_mean?.[i];
      const wmax = snap.daily.wind_speed_10m_max?.[i];
      const uv = snap.daily.uv_index_max?.[i];
      const d = new Date(day);
      const isToday = d.toDateString() === todayKey;
      const weekday = d.toLocaleDateString('es-ES', { weekday: 'short' });
      const dayNum = d.getDate();
      const rainLine =
        Number.isFinite(rain) && rain >= 0.1
          ? `<span class="clima-day-meta__item" title="Precipitación"><i class="ti ti-droplet" aria-hidden="true"></i>${rain.toFixed(1)} mm</span>`
          : Number.isFinite(prob) && prob >= 40
            ? `<span class="clima-day-meta__item" title="Prob. lluvia"><i class="ti ti-droplet-half-2" aria-hidden="true"></i>${prob}%</span>`
            : '';
      const windLine = Number.isFinite(wmax)
        ? `<span class="clima-day-meta__item" title="Viento máx."><i class="ti ti-wind" aria-hidden="true"></i>${wmax.toFixed(0)}</span>`
        : '';
      const uvLine =
        Number.isFinite(uv) && uv >= 3
          ? `<span class="clima-day-meta__item clima-day-meta__uv" title="UV máx."><i class="ti ti-sun" aria-hidden="true"></i>${uv.toFixed(0)}</span>`
          : '';
      const temps =
        Number.isFinite(tmin) && Number.isFinite(tmax)
          ? `<div class="clima-day-temps"><span class="clima-day-tmax">${Math.round(tmax)}°</span><span class="clima-day-tmin">${Math.round(tmin)}°</span></div>`
          : '<div class="clima-day-temps">—</div>';

      return `<div class="clima-day-card clima-day-card--${vis.tone}${isToday ? ' clima-day-card--today' : ''}" title="${escapeHtmlClima(vis.label)}">
        <div class="clima-day-card__top">
          <span class="clima-day-name">${weekday}</span>
          <span class="clima-day-num">${dayNum}</span>
        </div>
        <div class="clima-day-icon" aria-hidden="true"><i class="ti ${vis.icon}"></i></div>
        <div class="clima-day-desc">${escapeHtmlClima(vis.label)}</div>
        ${temps}
        <div class="clima-day-meta">${rainLine}${windLine}${uvLine}</div>
      </div>`;
    })
    .join('');

  const hasUvDaily =
    Array.isArray(snap?.daily?.uv_index_max) &&
    snap.daily.uv_index_max.some((u) => Number.isFinite(u));
  const thUv = hasUvDaily ? '<th>UV máx</th>' : '';

  const dailyRows = times
    .map((day, i) => {
      const tmax = snap.daily.temperature_2m_max?.[i];
      const tmin = snap.daily.temperature_2m_min?.[i];
      const rain = snap.daily.precipitation_sum?.[i];
      const prob = snap.daily.precipitation_probability_mean?.[i];
      const wmax = snap.daily.wind_speed_10m_max?.[i];
      const uv = snap.daily.uv_index_max?.[i];
      const d = new Date(day);
      const dayStr = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
      const uvCell = hasUvDaily ? `<td data-label="UV máx">${Number.isFinite(uv) ? uv.toFixed(1) : '—'}</td>` : '';
      return `<tr>
        <td data-label="Día">${dayStr}</td>
        <td data-label="Tª mín / máx" class="ec-val">${Number.isFinite(tmin) && Number.isFinite(tmax) ? `${tmin.toFixed(0)} / ${tmax.toFixed(0)}°C` : '—'}</td>
        <td data-label="Lluvia">${Number.isFinite(rain) ? rain.toFixed(1) + ' mm' : '—'}</td>
        <td data-label="Prob.">${Number.isFinite(prob) ? prob + '%' : '—'}</td>
        <td data-label="Viento máx">${Number.isFinite(wmax) ? wmax.toFixed(0) + ' km/h' : '—'}</td>
        ${uvCell}
      </tr>`;
    })
    .join('');

  const strip = `<div class="clima-daily-scroll-wrap">
    <div class="clima-daily-scroll" role="list" aria-label="Pronóstico 7 días con iconos">
      ${cards}
    </div>
  </div>`;

  const detailTable = `<details class="clima-forecast-details">
    <summary class="clima-forecast-details__summary">Ver tabla numérica detallada</summary>
    <div class="table-scroll"><table class="week-table week-table--stack"><thead><tr><th>Día</th><th>Tª mín / máx</th><th>Lluvia</th><th>Prob.</th><th>Viento máx</th>${thUv}</tr></thead><tbody>${dailyRows}</tbody></table></div>
  </details>`;

  return { strip, detailTable };
}

/** El pronóstico guardado debe corresponder al texto de ubicación del cultivo (cada sistema/cultivo puede estar en un sitio distinto). */
function siteWeatherMatchesGrow(grow, snap) {
  if (!grow) return { ok: false, code: 'no-grow' };
  const loc = (grow.location || '').trim();
  if (!loc) {
    return {
      ok: false,
      code: 'no-location',
      message: 'Indica la localidad o zona del cultivo para vincular la meteorología y las recomendaciones de exterior.',
    };
  }
  if (!snap?.updatedAt) return { ok: false, code: 'no-data' };
  const q = (snap.query || '').trim().toLowerCase();
  if (q && q !== loc.toLowerCase()) {
    return {
      ok: false,
      code: 'stale',
      message: `El tiempo cargado es para «${snap.query}» y tu cultivo está en «${loc}». Abre Climatología para actualizar con la ubicación correcta.`,
    };
  }
  return { ok: true };
}

const EXTERIOR_SYSTEM_LINES = {
  RDWC: {
    heat:
      'Una solución caliente recircula por todas las plantas: sombrea el depósito de control, blanquea o aísla el depósito y vigila burbujeo; si el agua supera ~23 °C, valora pausar EC alta o sombreo de emergencia.',
    cold:
      'El volumen común enfría más lento pero también recupera peor: aísla tubos y depósito; evita corrientes frías directas sobre el líquido.',
    wind:
      'Asegura mangueras, skimmers y el depósito; el viento puede vaciar sifones o introducir aire en puntos bajos del circuito.',
    rain:
      'Evita que lluvia entre en skimmers o bocas abiertas; revisa dilución y pH/EC del depósito tras chaparrón.',
    uv: 'Cubierta translúcida o malla sobre el depósito reduce algas y calentamiento por sol directo.',
  },
  DWC: {
    heat:
      'Cada cubo se calienta solo: sombreo lateral, depósitos claros y aireación fuerte; rota el orden de inspección empezando por los más expuestos al sol.',
    cold:
      'Agrupa cubos y usa bandas térmicas bajo depósitos si hiela; EC muy alta con agua fría aumenta estrés.',
    wind:
      'Amarra macetas y tutores; cubos altos vuelcan con viento y sacudida mecánica al cogollo.',
    rain:
      'Tapar boca del cubo si diluye la solución; revisa pH/EC tras lluvia.',
    uv: 'Malla o sombreo móvil si hay quemadura foliar en zonas altas.',
  },
  FLOAT: {
    heat:
      'La balsa grande acumula calor: sombreo del perímetro, aireación potente y comprobar que la balsa no “cocine” bajo sol directo.',
    cold:
      'Superficie amplia pierde calor de noche: cortavientos alrededor del estanque de cultivo.',
    wind:
      'Fija la balsa y los flotadores; olas pueden mojar cogollos o desplazar macetas.',
    rain:
      'Lluvia sobre la balsa diluye el volumen común: mide pH/EC y compensa con nutriente diluido si procede.',
    uv: 'Algas en superficie: reducir luz directa sobre el agua.',
  },
  NFT: {
    heat:
      'El depósito de mezcla es pequeño y se calienta rápido: sombreo obligatorio del tanque; vigila que la película no se rompa por evaporación o burbujas.',
    cold:
      'Líquido frío en canal reduce actividad radicular; en frío intenso, valora recirculación sólo en horas cálidas.',
    wind:
      'Canales ligeros: sujeta soportes; viento puede torcer el canal y dejar tramos sin película.',
    rain:
      'Humectación de cogollos + canal húmedo = foco de hongos; secado al aire cuando escampe.',
    uv: 'Cubre depósito y, si aplica, parte superior del canal para limitar algas.',
  },
  AERO: {
    heat:
      'Raíces en cámara son sensibles al calor: sombrea la cámara y la reserva; revisa boquillas y ciclos para no secar raíces.',
    cold:
      'Niebla fría sobre raíces puede frenar absorción; temperatura de la reserva estable antes que picos de frío.',
    wind:
      'Cámara y tapa deben estar bien fijadas; entradas de polvo por viento tapan boquillas.',
    rain:
      'Mantén estanqueidad de la cámara; humedad exterior alta + fugas = riesgo de patógenos.',
    uv: 'Prioriza sombreo de la cámara; el dosel foliar no protege las raíces expuestas a calor radiante.',
  },
};

function getExteriorSystemLines(system) {
  return EXTERIOR_SYSTEM_LINES[system] || EXTERIOR_SYSTEM_LINES.DWC;
}

/**
 * Plan de acción hidropónico en exterior a partir del pronóstico y del tipo de sistema.
 * @returns {{ match: object, blocks: Array<{ level: string, title: string, actions: string[] }> }}
 */
function buildExteriorHydroSolutions(grow, snap) {
  const match = siteWeatherMatchesGrow(grow, snap);
  if (!grow || grow.placement !== 'exterior') return { match, blocks: [] };

  if (!match.ok) {
    const actions = [];
    if (match.code === 'no-data') {
      actions.push('Abre la pestaña Climatología: se descargará el pronóstico para la ubicación configurada en este cultivo.');
    } else if (match.message) {
      actions.push(match.message);
    } else {
      actions.push('Completa la ubicación y actualiza Climatología para generar recomendaciones.');
    }
    return {
      match,
      blocks: [{ level: 'warn', title: 'Vincular meteorología a este emplazamiento', actions }],
    };
  }

  if (!snap?.current) {
    return {
      match,
      blocks: [
        {
          level: 'warn',
          title: 'Sin datos meteorológicos actuales',
          actions: ['Abre Climatología y descarga el pronóstico para esta ubicación.'],
        },
      ],
    };
  }

  const sysKey = grow.system || 'DWC';
  const sysLabel = typeof getSystemProfile === 'function' ? getSystemProfile(sysKey).label : sysKey;
  const lines = getExteriorSystemLines(sysKey);
  const cur = snap.current;
  const daily = snap.daily;
  const strain = grow.strain;
  const daysSince = Math.floor((new Date() - grow.startDate) / 86400000);
  const weekNum = Math.max(1, Math.ceil((daysSince + 1) / 7));
  const inFlower = strain && weekNum > strain.vegW + 2;

  const tNow = cur?.temperature_2m;
  const tFeel = cur?.apparent_temperature;
  const rh = cur?.relative_humidity_2m;
  const wind = cur?.wind_speed_10m;
  const gust = cur?.wind_gusts_10m;
  const uv = cur?.uv_index;
  const cloud = cur?.cloud_cover;

  const tmax0 = daily?.temperature_2m_max?.[0];
  const tmin0 = daily?.temperature_2m_min?.[0];
  const tmax1 = daily?.temperature_2m_max?.[1];
  const rain0 = daily?.precipitation_sum?.[0];
  const rain1 = daily?.precipitation_sum?.[1];
  const prob0 = daily?.precipitation_probability_mean?.[0];
  const wmax0 = daily?.wind_speed_10m_max?.[0];
  const uvmax0 = daily?.uv_index_max?.[0];

  const blocks = [];

  const hot =
    (Number.isFinite(tmax0) && tmax0 >= 30) ||
    (Number.isFinite(tNow) && tNow >= 32) ||
    (Number.isFinite(tFeel) && tFeel >= 34);
  if (hot) {
    const bits = [
      lines.heat,
      Number.isFinite(tmax0)
        ? `Pronóstico hoy: máx. ~${tmax0.toFixed(0)} °C${Number.isFinite(tmax1) ? `, mañana ~${tmax1.toFixed(0)} °C` : ''}.`
        : null,
      Number.isFinite(rh) && rh >= 75 ? 'HR alta + calor: menos transpiración aparente; vigila encharcamientos foliares y botrytis si hay salpicadura.' : null,
      'Registra temperatura de solución en Medir; por encima de ~23–24 °C en raíz, prioriza enfriar antes de subir EC.',
    ].filter(Boolean);
    blocks.push({
      level: Number.isFinite(tmax0) && tmax0 >= 36 ? 'danger' : 'warn',
      title: `Calor en exterior · ${sysLabel}`,
      actions: bits,
    });
  }

  const cold =
    (Number.isFinite(tmin0) && tmin0 <= 7) || (Number.isFinite(tNow) && tNow <= 8);
  if (cold) {
    blocks.push({
      level: Number.isFinite(tmin0) && tmin0 <= 2 ? 'danger' : 'warn',
      title: `Frío / helada posible · ${sysLabel}`,
      actions: [
        lines.cold,
        Number.isFinite(tmin0) ? `Mínima prevista hoy ~${tmin0.toFixed(0)} °C.` : null,
        'Reduce estrés: EC moderada, sin trasplantes bruscos; en hidro, evita solución más fría que el ambiente si puedes.',
      ].filter(Boolean),
    });
  }

  const windy =
    (Number.isFinite(gust) && gust >= 45) ||
    (Number.isFinite(wind) && wind >= 40) ||
    (Number.isFinite(wmax0) && wmax0 >= 45);
  if (windy) {
    blocks.push({
      level: 'warn',
      title: `Viento fuerte · ${sysLabel}`,
      actions: [
        lines.wind,
        Number.isFinite(gust)
          ? `Rachas actuales modelo ~${gust.toFixed(0)} km/h${Number.isFinite(wmax0) ? `; máx. diaria ~${wmax0.toFixed(0)} km/h` : ''}.`
          : Number.isFinite(wmax0)
            ? `Viento máx. previsto hoy ~${wmax0.toFixed(0)} km/h.`
            : null,
        'Revisa anclajes de estructura, malla y macetas; en floración, reduce “vela” del dosel.',
      ].filter(Boolean),
    });
  }

  const wet =
    (inFlower && Number.isFinite(rain0) && rain0 >= 4) ||
    (inFlower && Number.isFinite(prob0) && prob0 >= 70 && Number.isFinite(rain0) && rain0 >= 1) ||
    (Number.isFinite(rain0) && rain0 >= 12) ||
    (Number.isFinite(rain1) && rain1 >= 15);
  if (wet) {
    blocks.push({
      level: inFlower && Number.isFinite(rain0) && rain0 >= 8 ? 'danger' : 'warn',
      title: `Lluvia / humedad ambiental · ${sysLabel}`,
      actions: [
        lines.rain,
        Number.isFinite(rain0) ? `Precipitación prevista hoy ~${rain0.toFixed(1)} mm${Number.isFinite(prob0) ? ` (prob. ${prob0}%)` : ''}.` : null,
        inFlower
          ? 'En floración exterior: ventilación al secar, evitar golpear plantas mojadas, retirar hojas que rocen cogollo húmedo.'
          : 'En vegetación: vigila salpicadura que suba EC local en hojas y entrada de polvo al depósito.',
      ].filter(Boolean),
    });
  }

  const uvHigh =
    (Number.isFinite(uv) && uv >= 8) ||
    (Number.isFinite(uvmax0) && uvmax0 >= 8) ||
    (cur?.is_day === 1 && Number.isFinite(cloud) && cloud < 15 && Number.isFinite(uv) && uv >= 6);
  if (uvHigh) {
    blocks.push({
      level: 'warn',
      title: `Radiación UV alta · ${sysLabel}`,
      actions: [
        lines.uv,
        Number.isFinite(uvmax0) ? `UV máx. previsto hoy ~${uvmax0.toFixed(1)}.` : null,
        'Malla sombreo 30–40 % o traslado temporal a sombra parcial en las horas centrales si hay síntomas de quemadura.',
      ].filter(Boolean),
    });
  }

  if (blocks.length === 0) {
    blocks.push({
      level: 'info',
      title: `Condiciones moderadas · ${sysLabel}`,
      actions: [
        `Sin disparadores fuertes en el modelo actual para ${snap.label || 'tu zona'}. Mantén registro en Medir (agua, aire, HR) y revisa Climatología ante cambios bruscos.`,
        `Cultivo semana ${weekNum}${inFlower ? ' (floración)' : ' (vegetación)'}.`,
      ],
    });
  }

  return { match, blocks };
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

function applyClimaBundleToGrowOrConfig(bundle, geoLabel) {
  if (myGrow) {
    myGrow.siteWeather = bundle;
    if (!myGrow.climate) myGrow.climate = {};
    const cur = bundle.current;
    if (cur) {
      myGrow.climate.summary = `Modelo (rejilla tierra): ${geoLabel}`;
      myGrow.climate.temperature =
        cur.temperature_2m != null ? Number(cur.temperature_2m).toFixed(1) : myGrow.climate.temperature;
      myGrow.climate.humidity =
        cur.relative_humidity_2m != null ? Math.round(cur.relative_humidity_2m) : myGrow.climate.humidity;
      myGrow.climate.wind =
        cur.wind_speed_10m != null ? Number(cur.wind_speed_10m).toFixed(1) : myGrow.climate.wind;
      myGrow.climate.source = 'Open-Meteo (rejilla + API elevación)';
    }
    saveGrowState();
    if (typeof window.scheduleFusionRiegoRefresh === 'function') window.scheduleFusionRiegoRefresh();
  } else {
    if (!appConfig) appConfig = {};
    appConfig.climaSnapshot = bundle;
    saveAppConfig();
  }
}

/**
 * @param {{ force?: boolean, manageButton?: boolean, notifyOnSuccess?: boolean }} opts
 * force: ignorar antirrebote (p. ej. botón Actualizar)
 * manageButton: deshabilitar botón mientras carga
 * notifyOnSuccess: aviso breve al terminar bien (solo acciones explícitas del usuario)
 */
async function refreshClimatologiaData(opts = {}) {
  const { force = false, manageButton = true, notifyOnSuccess = false } = opts;
  const label = getClimaLocationLabel();

  if (!label) {
    climaApiErrorMessage = force
      ? 'Sin ubicación: indícala en «Ubicación manual» y pulsa Aplicar y cargar, o en Cultivo / checklist.'
      : '';
    const btnEarly = document.getElementById('climaRefreshBtn');
    if (manageButton && btnEarly) {
      btnEarly.disabled = false;
      btnEarly.innerHTML = '<i class="ti ti-refresh"></i> Actualizar pronóstico';
    }
    renderClimatologia();
    return;
  }

  if (!force && label) {
    const snapEarly = myGrow?.siteWeather || appConfig?.climaSnapshot;
    const lastEarly = snapEarly?.updatedAt ? new Date(snapEarly.updatedAt).getTime() : 0;
    if (lastEarly && snapEarly.query === label && Date.now() - lastEarly < 45000) {
      return;
    }
  }

  const btn = document.getElementById('climaRefreshBtn');
  if (manageButton && btn) {
    btn.disabled = true;
    btn.textContent = 'Consultando API…';
  }
  try {
    climaApiErrorMessage = '';

    const geo = await geocodeForClima(label);
    const [wxLand, wxNearest, elevPoint] = await Promise.all([
      fetchOpenMeteoForecast(geo.lat, geo.lon, null),
      fetchOpenMeteoForecast(geo.lat, geo.lon, 'nearest'),
      fetchOpenMeteoElevation(geo.lat, geo.lon),
    ]);

    const landKey = gridKeyFromForecast(wxLand);
    const nearestKey = gridKeyFromForecast(wxNearest);
    const nearestDiffers = nearestKey && landKey && nearestKey !== landKey;

    const bundle = {
      updatedAt: new Date().toISOString(),
      lat: geo.lat,
      lon: geo.lon,
      label: geo.label,
      query: label,
      elevationQueryM: elevPoint,
      geocodeAlternates: geo.alternates || [],
      gridPrimary: {
        mode: 'land',
        latitude: wxLand.latitude,
        longitude: wxLand.longitude,
        elevation: wxLand.elevation,
      },
      gridNearest:
        nearestDiffers && wxNearest
          ? {
              mode: 'nearest',
              latitude: wxNearest.latitude,
              longitude: wxNearest.longitude,
              elevation: wxNearest.elevation,
              current: wxNearest.current || null,
            }
          : null,
      current: wxLand.current || null,
      daily: wxLand.daily || null,
      hourly: wxLand.hourly || null,
    };

    applyClimaBundleToGrowOrConfig(bundle, geo.label);
    if (notifyOnSuccess && typeof window.showHydroToast === 'function') {
      window.showHydroToast('Pronóstico guardado en este dispositivo');
    }
  } catch (e) {
    climaApiErrorMessage = e.message || 'Error al cargar clima.';
  } finally {
    if (manageButton && btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="ti ti-refresh"></i> Actualizar pronóstico';
    }
    renderClimatologia();
    if (typeof renderRiego === 'function') renderRiego();
  }
}

async function refreshClimatologiaFromUi() {
  await refreshClimatologiaData({ force: true, manageButton: true, notifyOnSuccess: true });
}

/**
 * Guarda la ubicación desde Climatología y consulta la API una sola vez (no hay recálculo al escribir).
 */
async function applyClimaManualLocationAndRefresh() {
  const inp = document.getElementById('climaManualLocation');
  const raw = (inp?.value || '').trim();
  if (!raw) {
    climaApiErrorMessage = 'Escribe una ciudad o lugar (p. ej. Valencia, España) y pulsa Aplicar y cargar.';
    renderClimatologia();
    return;
  }

  if (myGrow) {
    const prev = (myGrow.location || '').trim();
    const changed = raw !== prev;
    myGrow.location = raw;
    if (changed && typeof invalidateGrowWeatherSnapshot === 'function') {
      invalidateGrowWeatherSnapshot();
    }
    saveGrowState();
  }

  if (!appConfig) appConfig = {};
  appConfig.location = raw;
  saveAppConfig();

  climaApiErrorMessage = '';
  await refreshClimatologiaData({ force: true, manageButton: true, notifyOnSuccess: true });
  if (typeof renderMonitor === 'function') renderMonitor();
  if (typeof renderInicio === 'function') renderInicio();
  if (typeof renderCultivo === 'function') renderCultivo();
  if (typeof renderRiego === 'function') renderRiego();
}

function climaManualLocationKeydown(ev) {
  if (ev.key === 'Enter') {
    ev.preventDefault();
    applyClimaManualLocationAndRefresh();
  }
}

/** Llamado al abrir la pestaña Climatología: consulta APIs con la ubicación configurada. */
function refreshClimatologiaOnTabFocus() {
  refreshClimatologiaData({ force: false, manageButton: true });
}

/** Fecha local YYYY-MM-DD (zona del dispositivo). */
function climaLocalYmd(d) {
  const x = d instanceof Date ? d : new Date();
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

function buildClimaHourlyVpdBlock(snap) {
  if (!snap?.hourly?.time || typeof hydroRiegoVPDkPa !== 'function') {
    return '';
  }
  const times = snap.hourly.time;
  const temp = snap.hourly.temperature_2m;
  const rh = snap.hourly.relative_humidity_2m;
  const ymd = climaLocalYmd();
  const rows = [];
  for (let i = 0; i < times.length && rows.length < 24; i++) {
    if (String(times[i]).slice(0, 10) < ymd) continue;
    const tc = Number(temp?.[i]);
    const rhp = Number(rh?.[i]);
    if (!Number.isFinite(tc) || !Number.isFinite(rhp)) continue;
    rows.push({
      iso: times[i],
      t: tc,
      rh: rhp,
      vpd: hydroRiegoVPDkPa(tc, rhp),
    });
  }
  if (!rows.length) {
    return `<div class="card clima-hourly-vpd-card">
      <div class="card-header"><div class="card-title"><i class="ti ti-chart-line"></i>VPD horario (modelo)</div></div>
      <p class="text-muted">Pulsa <strong>Actualizar pronóstico</strong> para cargar la serie horaria (Tª, HR, ET₀) usada también en <strong>Riego</strong>.</p>
    </div>`;
  }
  const tableRows = rows
    .map((r) => {
      const d = new Date(r.iso);
      const hh = d.toLocaleString('es-ES', {
        weekday: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      const flag = r.vpd > 1.25 ? 'high' : r.vpd < 0.5 ? 'low' : '';
      return `<tr class="${flag ? 'clima-vpd-row--' + flag : ''}"><td>${escapeHtmlClima(hh)}</td><td>${r.t.toFixed(1)}</td><td>${Math.round(r.rh)}</td><td><strong>${r.vpd.toFixed(2)}</strong></td></tr>`;
    })
    .join('');
  return `<div class="card clima-hourly-vpd-card">
    <div class="card-header"><div class="card-title"><i class="ti ti-droplet-half-2"></i>VPD horario (desde hoy, modelo)</div></div>
    <p class="text-muted clima-hourly-vpd-hint">Magnus–Tetens (fórmula estándar). Cruza con <strong>Riego</strong> para demanda y pulsos orientativos.</p>
    <div class="clima-hourly-vpd-scroll">
      <table class="clima-hourly-vpd-table">
        <thead><tr><th>Hora</th><th>T (°C)</th><th>HR %</th><th>VPD kPa</th></tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
    <button type="button" class="btn btn-ghost" onclick="navTo('riego')"><i class="ti ti-droplet"></i> Ir a Riego</button>
  </div>`;
}

function renderClimatologia() {
  const host = document.getElementById('climatologiaContent');
  if (!host) return;

  const label = getClimaLocationLabel();
  const snap = myGrow?.siteWeather || appConfig?.climaSnapshot;
  const placement = myGrow?.placement || appConfig?.placement || 'interior';
  const growMatch = myGrow ? siteWeatherMatchesGrow(myGrow, snap) : { ok: true };
  const risks =
    myGrow && growMatch.ok && placement === 'exterior'
      ? summarizeOutdoorRisksForCannabis(myGrow, snap?.daily)
      : [];
  const exteriorPlan =
    myGrow && placement === 'exterior' ? buildExteriorHydroSolutions(myGrow, snap) : { match: growMatch, blocks: [] };

  const sysPlanLabel =
    myGrow && typeof getResolvedSystemDisplayName === 'function'
      ? escapeHtmlClima(getResolvedSystemDisplayName(myGrow, myGrow.system || 'DWC'))
      : myGrow && typeof getSystemProfile === 'function'
        ? escapeHtmlClima(getSystemProfile(myGrow.system || 'DWC').label)
        : myGrow
          ? escapeHtmlClima(myGrow.system || '')
          : '';
  const locPlanEsc = escapeHtmlClima((myGrow?.location || label || '').trim() || 'tu zona');

  const forecast7 = renderDailyForecastIconStrip(snap);

  const hourlyVpdBlock = buildClimaHourlyVpdBlock(snap);

  const cur0 = snap?.current;
  const curVis = cur0 && Number.isFinite(cur0.temperature_2m) ? getDailyWeatherVisual(cur0.weather_code) : null;
  const currentBlock =
    cur0 && Number.isFinite(cur0.temperature_2m)
      ? `<div class="clima-current-hero clima-current-hero--${curVis.tone}">
          <div class="clima-current-hero__icon" aria-hidden="true"><i class="ti ${curVis.icon}"></i></div>
          <div class="clima-current-hero__text">
            <div class="clima-current-hero__cond">${escapeHtmlClima(curVis.label)}</div>
            <div class="clima-current-hero__temp">${Number(cur0.temperature_2m).toFixed(1)}°C</div>
          </div>
        </div>
        <div class="grid4 monitor-metrics clima-current-extended">
          <div class="metric"><div class="metric-label">Temperatura</div><div class="metric-val c-amber">${Number(cur0.temperature_2m).toFixed(1)}°C</div></div>
          <div class="metric"><div class="metric-label">Sensación / aparente</div><div class="metric-val">${cur0.apparent_temperature != null ? Number(cur0.apparent_temperature).toFixed(1) + '°C' : '—'}</div></div>
          <div class="metric"><div class="metric-label">Humedad</div><div class="metric-val c-blue">${cur0.relative_humidity_2m ?? '—'}%</div></div>
          <div class="metric"><div class="metric-label">Nubosidad</div><div class="metric-val">${cur0.cloud_cover ?? '—'}%</div></div>
          <div class="metric"><div class="metric-label">Presión (msl)</div><div class="metric-val">${cur0.pressure_msl != null ? Math.round(cur0.pressure_msl) + ' hPa' : '—'}</div></div>
          <div class="metric"><div class="metric-label">Viento (10 m)</div><div class="metric-val">${cur0.wind_speed_10m != null ? Number(cur0.wind_speed_10m).toFixed(1) + ' km/h' : '—'}</div></div>
          <div class="metric"><div class="metric-label">Racha / dirección</div><div class="metric-val metric-val--compact">${cur0.wind_gusts_10m != null ? Number(cur0.wind_gusts_10m).toFixed(0) + ' km/h' : '—'} · ${windDirLabel(cur0.wind_direction_10m)}</div></div>
          <div class="metric"><div class="metric-label">Índice UV</div><div class="metric-val">${cur0.uv_index != null ? Number(cur0.uv_index).toFixed(1) : '—'}</div></div>
        </div>`
      : `<div class="alert info"><i class="ti ti-cloud-off"></i><p>Con ubicación configurada, los datos se cargan <strong>al abrir esta pestaña</strong> (geocodificación + pronóstico en dos rejillas del modelo + elevación). También puedes usar <strong>Actualizar pronóstico</strong> para forzar una nueva consulta.</p></div>`;

  const gridPrimary = snap?.gridPrimary;
  const gridRows =
    gridPrimary && Number.isFinite(gridPrimary.latitude)
      ? `<div class="param-row"><span class="param-key">Rejilla modelo (tierra)</span><span class="param-val">${gridPrimary.latitude.toFixed(3)}°, ${gridPrimary.longitude.toFixed(3)}° · elev. ~${Number.isFinite(gridPrimary.elevation) ? Math.round(gridPrimary.elevation) + ' m' : '—'}</span></div>`
      : '';
  const elevRow =
    Number.isFinite(snap?.elevationQueryM)
      ? `<div class="param-row"><span class="param-key">Elevación en tu coordenada</span><span class="param-val">~${Math.round(snap.elevationQueryM)} m (DEM 90 m, Open-Meteo)</span></div>`
      : '';

  const altList =
    Array.isArray(snap?.geocodeAlternates) && snap.geocodeAlternates.length
      ? `<div class="section-label section-label--block clima-section-spaced">Coincidencias cercanas en geocodificación</div><p class="text-muted clima-geo-note">No son lecturas de estación sinóptica; sirven para contrastar el topónimo buscado con otras localidades devueltas por la API.</p><ul class="clima-alt-list">${snap.geocodeAlternates
          .map(
            (a) =>
              `<li><strong>${a.label}</strong>${Number.isFinite(a.elevation) ? ` · ~${Math.round(a.elevation)} m` : ''} · ${a.lat.toFixed(3)}°, ${a.lon.toFixed(3)}°</li>`,
          )
          .join('')}</ul>`
      : '';

  const nearestBlock =
    snap?.gridNearest && snap.gridNearest.current && Number.isFinite(snap.gridNearest.current.temperature_2m)
      ? (() => {
          const gn = snap.gridNearest;
          const c = gn.current;
          return `<div class="card clima-nearest-card">
            <div class="card-header"><div class="card-title"><i class="ti ti-grid-dots"></i>Segundo punto de modelo (rejilla «nearest»)</div></div>
            <p class="body-prose clima-grid-note">Misma ubicación buscada, pero eligiendo la <strong>celda de modelo más cercana</strong> al punto (útil en costa/montaña). Si coincide con la rejilla «tierra», no se muestra esta tarjeta.</p>
            <div class="param-row"><span class="param-key">Coordenadas celda</span><span class="param-val">${gn.latitude.toFixed(3)}°, ${gn.longitude.toFixed(3)}° · ~${Number.isFinite(gn.elevation) ? Math.round(gn.elevation) + ' m' : '—'}</span></div>
            <div class="grid4 monitor-metrics">
              <div class="metric"><div class="metric-label">Tª ahora</div><div class="metric-val">${Number(c.temperature_2m).toFixed(1)}°C</div></div>
              <div class="metric"><div class="metric-label">HR</div><div class="metric-val">${c.relative_humidity_2m ?? '—'}%</div></div>
              <div class="metric"><div class="metric-label">Viento</div><div class="metric-val">${c.wind_speed_10m != null ? Number(c.wind_speed_10m).toFixed(1) + ' km/h' : '—'}</div></div>
              <div class="metric"><div class="metric-label">UV</div><div class="metric-val">${c.uv_index != null ? Number(c.uv_index).toFixed(1) : '—'}</div></div>
            </div>
          </div>`;
        })()
      : '';

  const installScopeClima =
    myGrow && typeof getActiveInstallationScopeBannerHtml === 'function'
      ? getActiveInstallationScopeBannerHtml(myGrow, { compact: true })
      : '';

  host.innerHTML = `
    <div class="card">
      ${installScopeClima}
      <div class="card-header card-header--split">
        <div class="card-title"><i class="ti ti-map-pin"></i>Ubicación del cultivo</div>
        <button type="button" class="btn btn-primary btn--compact" id="climaRefreshBtn" onclick="refreshClimatologiaFromUi()"><i class="ti ti-refresh"></i> Actualizar pronóstico</button>
      </div>
      <p class="body-prose">Los datos se obtienen para <strong>${label || '— (sin ubicación)'}</strong> (misma cadena que en checklist o cultivo activo). Con ubicación definida, <strong>al entrar en esta pestaña</strong> se consulta la API (geocodificación Open-Meteo, pronóstico en <strong>dos rejillas</strong> del modelo: tierra y «nearest», y elevación DEM). Los valores son salidas de modelos numéricos, no lecturas en tiempo real de una estación concreta.</p>
      <div class="form-group clima-manual-loc">
        <label for="climaManualLocation">Ubicación manual</label>
        <p class="text-muted clima-manual-loc-hint">Si borraste la zona o el checklist quedó vacío, escribe el lugar aquí. El pronóstico se recalcula <strong>solo al pulsar Aplicar</strong> (o Enter), no mientras escribes.</p>
        <div class="clima-manual-loc-row">
          <input type="text" id="climaManualLocation" value="${escapeHtmlAttrClima(label)}" placeholder="Ej: Valencia, España" autocomplete="address-level2" maxlength="120" onkeydown="climaManualLocationKeydown(event)">
          <button type="button" class="btn btn-primary btn--compact clima-manual-loc-btn" onclick="applyClimaManualLocationAndRefresh()"><i class="ti ti-check"></i> Aplicar y cargar</button>
        </div>
      </div>
      <div class="param-row"><span class="param-key">Instalación</span><span class="param-val">${placement === 'exterior' ? 'Exterior' : 'Interior'}</span></div>
      ${
        snap?.updatedAt
          ? `<div class="param-row"><span class="param-key">Última actualización</span><span class="param-val">${new Date(snap.updatedAt).toLocaleString('es-ES')}</span></div>`
          : ''
      }
      ${snap?.label ? `<div class="param-row"><span class="param-key">Topónimo resuelto</span><span class="param-val">${snap.label}</span></div>` : ''}
      ${
        myGrow && placement === 'exterior'
          ? `<div class="param-row"><span class="param-key">Cultivo activo</span><span class="param-val">${escapeHtmlClima(myGrow.strain?.name || '—')} · ${escapeHtmlClima((myGrow.location || '').trim() || 'sin ubicación')} · <strong>${sysPlanLabel}</strong></span></div>`
          : ''
      }
      ${
        myGrow && placement === 'exterior' && snap?.updatedAt && !growMatch.ok && growMatch.message
          ? `<div class="alert warn clima-match-warn"><i class="ti ti-alert-triangle"></i><p>${escapeHtmlClima(growMatch.message)}</p></div>`
          : ''
      }
      ${gridRows}
      ${elevRow}
      ${altList}
      <div id="climaError">${
        climaApiErrorMessage
          ? `<div class="alert danger"><i class="ti ti-alert-circle"></i><p>${escapeHtmlClima(climaApiErrorMessage)}</p></div>
        <div class="clima-error-actions">
          <button type="button" class="btn btn-primary btn--compact" onclick="refreshClimatologiaFromUi()"><i class="ti ti-refresh"></i> Reintentar</button>
          <button type="button" class="btn btn-ghost btn--compact" onclick="navTo('inicio')"><i class="ti ti-home"></i> Inicio</button>
        </div>`
          : ''
      }</div>
    </div>

    ${
      placement === 'exterior' && risks.length
        ? `<div class="card"><div class="card-header"><div class="card-title"><i class="ti ti-alert-triangle"></i>Riesgos orientativos (según pronóstico en tu ubicación)</div></div>${risks.map((r) => `<div class="alert ${r.level === 'danger' ? 'danger' : r.level === 'warn' ? 'warn' : 'info'}"><i class="ti ti-alert-triangle"></i><p>${r.text}</p></div>`).join('')}</div>`
        : ''
    }

    ${
      myGrow && placement === 'exterior' && exteriorPlan.blocks.length
        ? `<div class="card clima-exterior-plan-card">
      <div class="card-header"><div class="card-title"><i class="ti ti-tool"></i>Soluciones hidropónicas (exterior) · ${sysPlanLabel} · ${locPlanEsc}</div></div>
      <p class="body-prose clima-plan-intro">Cálculo acoplado al pronóstico mostrado y al cultivo activo en <strong>${locPlanEsc}</strong> (tipo <strong>${sysPlanLabel}</strong>). Cada cultivo guarda su propia ubicación y datos meteorológicos al actualizar Climatología.</p>
      ${exteriorPlan.blocks
        .map(
          (b) => `<div class="clima-solution-block clima-solution-block--${b.level}">
        <div class="clima-solution-title">${escapeHtmlClima(b.title)}</div>
        <ul class="clima-solution-actions">${b.actions.map((a) => `<li>${escapeHtmlClima(a)}</li>`).join('')}</ul>
      </div>`,
        )
        .join('')}
    </div>`
        : ''
    }

    <div class="card">
      <div class="card-header"><div class="card-title"><i class="ti ti-sun"></i>Condiciones actuales (API)</div></div>
      ${currentBlock}
    </div>

    ${nearestBlock}

    ${hourlyVpdBlock}

    <div class="card clima-forecast-card">
      <div class="card-header"><div class="card-title"><i class="ti ti-calendar-week"></i>Pronóstico 7 días</div></div>
      <p class="text-muted clima-forecast-hint">Desliza horizontalmente · iconos según código meteorológico WMO (Open-Meteo).</p>
      ${
        forecast7.strip
          ? `${forecast7.strip}${forecast7.detailTable}`
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
window.refreshClimatologiaOnTabFocus = refreshClimatologiaOnTabFocus;
window.applyClimaManualLocationAndRefresh = applyClimaManualLocationAndRefresh;
window.climaManualLocationKeydown = climaManualLocationKeydown;
window.renderClimatologia = renderClimatologia;
window.siteWeatherMatchesGrow = siteWeatherMatchesGrow;
window.getDailyWeatherVisual = getDailyWeatherVisual;
window.buildExteriorHydroSolutions = buildExteriorHydroSolutions;
window.geocodeForClima = geocodeForClima;
window.fetchOpenMeteoForecast = fetchOpenMeteoForecast;
