/**
 * calcularRiego (async) y lógica principal de la pestaña Riego.
 * Tras riego-calculo-helpers.js.
 *
 * Riego al aire libre — cadena de cálculo (orden):
 * 1) Open-Meteo: ECMWF IFS diario (tª mín/máx, viento máx, prob. y suma lluvia) + horario (tª, HR) alineado al **mismo día civil** que daily[0|1];
 *    UV (modelo best_match) y ET₀ FAO horaria sumada a mm/día de ese mismo día (no bloques fijos 24 h desde el inicio de la serie).
 * 2) Toldo: si activo, UV y ET₀ efectivos ↓, ΔT zona planta (VPD día) −2 °C.
 * 3) VPD (Magnus–Tetens) con tª media + ajuste toldo; VPD en franja 11–15 h (ISO local) + pico según UV para mediodía.
 * 4) Demanda relativa riegoIndiceDemanda (VPD, viento, UV, prob. lluvia, ET₀) → ~0.48–1.58; × fase cultivo; × sensor sustrato opcional.
 * 5) Kc medio (cultivo + edad): por cada cesta con cultivo y fecha, % de ciclo = días desde trasplante ÷ días totales del **cultivar** (p. ej. lechuga ~45 d vs tomate ~85–95 d); curva Kc tipo FAO simplificada y multiplicador por **grupo** (frutos > lechugas…). Se hace **media aritmética** entre plantas → 5 lechugas a 3 semanas ≠ 3 tomates a 3 semanas (distinto % de ciclo y distinto grupo).
 * 6) N plantas en pulsos: si hay ≥1 cesta con fecha válida → ese recuento; si no → valor del campo (manual / guardado).
 * 7) riegoMinutosDesdeDemanda: carga ∝ (N/15)×Kc, ON/OFF con √demanda y perfil de sustrato; interior: OFF mín. 10 min y factores sala.
 * 8) Nocturno (solo torre goteo): ventana 21:00–07:00. Demanda nocturna (torre exterior con Meteoclimatic cercano: factor conservador en ventana local). Minutos ON/OFF: modelo → corredor riegoNocCorredorTablaTorre(T noc, HR, viento tramo) + ajuste esponja/turba → clamp. Exterior: por defecto refresco fijo ~30 s (~04:00); noches muy exigentes usan programa calculado; se omite solo si riegoTorreExteriorOmiteNocturnoPorClima. Interior: demanda ≈ 0,52×demanda día; omitir con riegoNocUmbralesOmitir.
 * Verificación manual (ej. municipio con lat/lon conocidos · “Mañana” · 21 lechugas 7 días): comprobar datos en riegoClimaUsado y reproducir con la API el día elegido.
 * Hoy vs mañana: `idx` 0/1 en daily + hourly filtrados por `dailyDateStr` (mismo día civil). Si la previsión casi no varía, demanda y minutos ON/OFF redondeados pueden coincidir.
 * General vs mediodía: demanda día usa VPD con T media diaria + HR media; mediodía usa VPD en 11–15 h + refuerzo UV. Mismo viento/UV diario/ET₀ en ambos; si tras redondeo los minutos coinciden, la UI lo indica.
 */
async function calcularRiego(opts = {}) {
  if (typeof sistemaEstaOperativa === 'function' && !sistemaEstaOperativa()) {
    const loader = document.getElementById('riegoLoader');
    if (loader) loader.classList.add('setup-hidden');
    if (opts && opts.manual) {
      showToast(typeof getMensajeStandbyContinuar === 'function'
        ? getMensajeStandbyContinuar()
        : '⏸ Instalación en stand-by / descanso. Reactiva modo operativa para continuar.', true);
    }
    return;
  }
  /** Recalcular a mano o forzar refresco: siempre nueva petición a la API y sin devolver meteo obsoleto si falla la red. */
  const refetchMeteo = !!opts.forceRefresh || !!opts.manual;
  const riegoNPl = document.getElementById('riegoNPlantas');
  if (!riegoNPl) return; // pestaña no activa

  // Sincronizar siempre con la torre activa antes de calcular
  sincronizarInputsRiego();

  const nConFecha = contarPlantasTorreConFechaValida();
  const nPlantasInp = parseInt(riegoNPl.value, 10) || 15;
  const nPlantas = nConFecha > 0 ? nConFecha : nPlantasInp;
  const edadSem = parseFloat(document.getElementById('riegoEdad').value) || 4;

  const riegoLoaderEl = document.getElementById('riegoLoader');
  const riegoResultEl = document.getElementById('riegoResultado');
  const riegoClimaNftEl = document.getElementById('riegoClimaUsadoNft');
  const riegoClimaDwcEl = document.getElementById('riegoClimaUsadoDwc');
  const riegoClimaRdwcEl = document.getElementById('riegoClimaUsadoRdwc');
  const btnCalc = document.getElementById('btnCalcRiego');
  const elHorarioHint = document.getElementById('riegoHorarioRecomendado');
  let btnCalcPrevTxt = '';
  if (btnCalc) {
    btnCalcPrevTxt = btnCalc.textContent || '🔄 Calcular riego ahora';
    btnCalc.disabled = true;
    btnCalc.textContent = '⏳ Calculando riego...';
  }
  ocultarRiegoToldoRecoUI();
  if (elHorarioHint) {
    elHorarioHint.textContent = '⏳ Calculando franja de mayor intensidad solar según el clima del día elegido…';
  }
  if (riegoLoaderEl) riegoLoaderEl.classList.remove('setup-hidden');
  if (riegoResultEl) riegoResultEl.classList.add('setup-hidden');
  if (riegoClimaNftEl) {
    riegoClimaNftEl.innerHTML = '';
    riegoClimaNftEl.classList.add('setup-hidden');
  }
  if (riegoClimaDwcEl) {
    riegoClimaDwcEl.innerHTML = '';
    riegoClimaDwcEl.classList.add('setup-hidden');
  }
  if (riegoClimaRdwcEl) {
    riegoClimaRdwcEl.innerHTML = '';
    riegoClimaRdwcEl.classList.add('setup-hidden');
  }

  try {
    // ── Obtener datos Open-Meteo ──────────────────────────────────────────
    const tipoRiego = tipoInstalacionNormalizado(state.configTorre || {});
    const objetivoTorre =
      tipoRiego === 'torre' && typeof torreGetObjetivoCultivo === 'function'
        ? torreGetObjetivoCultivo(state.configTorre || {})
        : 'final';
    const multObjetivoTorre =
      tipoRiego !== 'torre'
        ? 1
        : (typeof torreObjetivoMultiplicadorDemanda === 'function'
            ? torreObjetivoMultiplicadorDemanda(state.configTorre || {}, objetivoTorre)
            : (objetivoTorre === 'baby' ? 0.92 : 1.06));
    const idx = (tipoRiego === 'nft' || tipoRiego === 'dwc' || tipoRiego === 'rdwc') ? 0 : (diaRiego === 'manana' ? 1 : 0);
    const offsetHoras = idx * 24;

    /* ≥3 días: cubre mañana completa a cualquier hora; evita que "hoy"/"mañana" compartan el mismo trozo horario cuando la serie no empieza a medianoche. */
    const diasForecast = 3;

    let coords = getCoordsActivas();
    if (!coords || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lon)) {
      if (typeof ensureMeteoCoordsAuto === 'function') {
        await ensureMeteoCoordsAuto();
      }
      coords = getCoordsActivas();
    }
    if (!coords || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lon)) {
      if (riegoLoaderEl) riegoLoaderEl.classList.add('setup-hidden');
      if (elHorarioHint) {
        elHorarioHint.textContent =
          'Indica municipio o coordenadas en Medir (o en el asistente) para calcular el riego con clima de tu zona.';
      }
      showToast(
        '⛅ Sin ubicación: indica municipio o GPS del sistema para calcular el riego con datos meteorológicos.',
        true
      );
      throw new Error('sin-coords-riego');
    }

    const urlECMWFBase = 'https://api.open-meteo.com/v1/forecast?' +
      'latitude=' + coords.lat + '&longitude=' + coords.lon +
      '&daily=temperature_2m_max,temperature_2m_min,wind_speed_10m_max,precipitation_probability_max,precipitation_sum' +
      '&hourly=relative_humidity_2m,temperature_2m,wind_speed_10m' +
      `&forecast_days=${diasForecast}&timezone=auto`;
    const urlECMWFCoreBase = 'https://api.open-meteo.com/v1/forecast?' +
      'latitude=' + coords.lat + '&longitude=' + coords.lon +
      '&daily=temperature_2m_max,temperature_2m_min' +
      '&hourly=relative_humidity_2m,temperature_2m' +
      `&forecast_days=${diasForecast}&timezone=auto`;

    // Modelo default para UV (ECMWF IFS no expone uv_index_max en daily). Mismos días que en Meteo (7)
    // para poder cruzar por fecha con el `daily.time` de ECMWF sin depender del índice posicional.
    const urlUV = 'https://api.open-meteo.com/v1/forecast?' +
      'latitude=' + coords.lat + '&longitude=' + coords.lon +
      '&daily=uv_index_max' +
      '&forecast_days=7&timezone=auto';

    const urlET0 = 'https://api.open-meteo.com/v1/forecast?' +
      'latitude=' + coords.lat + '&longitude=' + coords.lon +
      '&hourly=et0_fao_evapotranspiration' +
      `&forecast_days=${diasForecast}&timezone=auto`;

    const roMeteo = (extra) => Object.assign({}, extra, {
      forceRefresh: refetchMeteo,
      allowStaleFallback: !refetchMeteo,
    });
    const mcPromise = meteoclimaticObservacionCercana(coords.lat, coords.lon, {
      timeoutMs: refetchMeteo ? 7000 : 5600,
    }).catch(() => null);
    const [data, dataUV, dEt0] = await Promise.all([
      meteoFetchConFallback(urlECMWFBase, roMeteo({ cacheKey: 'riego:ecmwf:' + urlECMWFBase, timeoutMs: 4300, ttlMs: 70 * 1000 }))
        .catch(() => meteoFetchConFallback(urlECMWFCoreBase, roMeteo({ cacheKey: 'riego:core:' + urlECMWFCoreBase, timeoutMs: 4300, ttlMs: 70 * 1000 }))),
      meteoFetchConFallback(urlUV, roMeteo({ cacheKey: 'riego:uv:' + urlUV, timeoutMs: 3600, ttlMs: 8 * 60 * 1000 })).catch(() => ({})),
      meteoFetchConFallback(urlET0, roMeteo({ cacheKey: 'riego:et0:' + urlET0, timeoutMs: 4200, ttlMs: 70 * 1000 })).catch(() => ({})),
    ]);
    const mcNear = await mcPromise;
    let mcRiegoLineaAjuste = '';
    let factorMcDiaRiego = 1;
    let factorMcNocRiego = 1;
    try {
      state._ultimoMeteoclimaticCercano = mcNear;
    } catch (_) {}
    const daily = data.daily;
    if (
      !daily ||
      !Array.isArray(daily.time) ||
      !Array.isArray(daily.temperature_2m_max) ||
      !Array.isArray(daily.temperature_2m_min)
    ) {
      throw new Error('Respuesta meteorológica incompleta (sin datos diarios).');
    }
    if (idx < 0 || idx >= daily.time.length) {
      throw new Error('Día de previsión fuera de rango.');
    }

    const tempMax  = daily.temperature_2m_max[idx];
    const tempMin  = daily.temperature_2m_min[idx];
    const tempMedia = (tempMax + tempMin) / 2;
    const vientoArr = Array.isArray(daily.wind_speed_10m_max)
      ? daily.wind_speed_10m_max
      : daily.windspeed_10m_max;
    const viento = Array.isArray(vientoArr) ? vientoArr[idx] : 0;
    const probArr = Array.isArray(daily.precipitation_probability_max) ? daily.precipitation_probability_max : [];
    const probLluvia = Number.isFinite(Number(probArr[idx])) ? Number(probArr[idx]) : 0;

    const dailyDateStr = (daily.time[idx] != null) ? String(daily.time[idx]).slice(0, 10) : null;

    const uvAlineado = riegoUvMaxAlineado(dataUV, dailyDateStr, idx);
    const meteoActual = state.meteoActual || {};
    const uvFallbackMeteo =
      Number.isFinite(Number(meteoActual.uvMaxHoy)) ? Number(meteoActual.uvMaxHoy)
      : (Number.isFinite(Number(meteoActual.uv)) ? Number(meteoActual.uv) : null);
    const uvMax = uvAlineado != null ? uvAlineado : (uvFallbackMeteo != null ? uvFallbackMeteo : 0);

    const times = data.hourly?.time;
    const rhArr = data.hourly?.relative_humidity_2m;
    const tempHArr = data.hourly?.temperature_2m;
    const windHArr = data.hourly?.wind_speed_10m || data.hourly?.windspeed_10m;

    let etArrHourly = dEt0?.hourly?.et0_fao_evapotranspiration || null;
    let etTimesHourly = dEt0?.hourly?.time || null;

    let et0Day = null;
    let et0NightSum = null;

    let dayHourIdx = riegoHourlyIndicesPorFecha(times, dailyDateStr);
    if (!dayHourIdx && Array.isArray(rhArr) && rhArr.length >= offsetHoras + 24) {
      dayHourIdx = [];
      for (let k = 0; k < 24; k++) dayHourIdx.push(offsetHoras + k);
    }

    let humMedia;
    let temp1315;
    let hum1315;
    let medHIni = 11;
    let medHFin = 15;

    if (dayHourIdx && dayHourIdx.length && Array.isArray(rhArr) && Array.isArray(tempHArr)) {
      const hm = riegoMediaDeIndices(rhArr, dayHourIdx);
      humMedia = Number.isFinite(hm) ? Math.round(hm) : 55;
      const winMed = riegoVentanaMediodiaDinamica(dayHourIdx, times, tempHArr, rhArr, uvMax, null);
      const midI = winMed.indices;
      medHIni = winMed.hIni;
      medHFin = winMed.hFin;
      if (midI.length) {
        const tM = riegoMediaDeIndices(tempHArr, midI);
        const hM = riegoMediaDeIndices(rhArr, midI);
        temp1315 = Number.isFinite(tM) ? Math.round(tM) : Math.round(tempMedia);
        hum1315 = Number.isFinite(hM) ? Math.round(hM) : humMedia;
      } else {
        const tD = riegoMediaDeIndices(tempHArr, dayHourIdx);
        temp1315 = Number.isFinite(tD) ? Math.round(tD) : Math.round(tempMedia);
        hum1315 = humMedia;
      }
    } else if (Array.isArray(rhArr) && Array.isArray(tempHArr) && rhArr.length >= offsetHoras + 24) {
      const humHoras = rhArr.slice(offsetHoras, offsetHoras + 24);
      humMedia = Math.round(humHoras.reduce((a, b) => a + b, 0) / humHoras.length);
      const tempHoras = tempHArr.slice(offsetHoras, offsetHoras + 24);
      temp1315 = Math.round((tempHoras[13] + tempHoras[14] + tempHoras[15]) / 3);
      hum1315 = Math.round((humHoras[13] + humHoras[14] + humHoras[15]) / 3);
    } else {
      humMedia = 55;
      temp1315 = Math.round(tempMedia);
      hum1315 = humMedia;
    }

    if (Array.isArray(etArrHourly) && etArrHourly.length && etTimesHourly) {
      let etIdx = riegoHourlyIndicesPorFecha(etTimesHourly, dailyDateStr);
      if (!etIdx && etArrHourly.length >= offsetHoras + 24) {
        etIdx = [];
        for (let k = 0; k < 24; k++) etIdx.push(offsetHoras + k);
      }
      if (etIdx && etIdx.length) {
        et0Day = etIdx.reduce((a, i) => a + (typeof etArrHourly[i] === 'number' ? etArrHourly[i] : 0), 0);
        const nightEtI = riegoIndicesNocturnosPorIso(etIdx, etTimesHourly);
        if (nightEtI.length) {
          const s = nightEtI.reduce((a, i) => a + (typeof etArrHourly[i] === 'number' ? etArrHourly[i] : 0), 0);
          et0NightSum = Math.round(s * 1000) / 1000;
        }
      }
    }

    const toldoAct = toldoDesplegado;
    const adjToldo = riegoAjustesToldoActivos(uvMax, et0Day, toldoAct);
    const uvEfectivo = adjToldo.uvEfectivo;
    const et0Riego = adjToldo.et0Efectivo;
    const dTempPlanta = adjToldo.deltaTempZonaPlanta;

    // ── VPD (kPa) Magnus–Tetens; con toldo: temp. zona planta y pico radiativo reducidos ──
    const vpd = riegoVPDkPa(tempMedia + dTempPlanta, humMedia);
    const deltaTMedio = uvEfectivo >= 6 ? 1.2 : uvEfectivo >= 4 ? 0.7 : uvEfectivo >= 3 ? 0.35 : 0;
    const vpdMediodia = riegoVPDkPa(temp1315 + dTempPlanta + deltaTMedio, hum1315);

    const esInterior = (state.configTorre?.ubicacion === 'interior');
    const { kc: kcMedio } = calcularKcMedioRiego(edadSem);

    const sustrato = riegoSustratoPerfil();

    const multFase = riegoFaseCultivoMult(edadSem);
    let demandaDia;
    let vpdInterior = null;
    if (esInterior) {
      const horasLuz = state.configTorre?.horasLuz || 16;
      const cfgIn = state.configTorre || {};
      const tIn = parseFloat(cfgIn.interiorTempC);
      const hIn = parseFloat(cfgIn.interiorHumedadAmbPct);
      const T = Number.isFinite(tIn) ? tIn : 22;
      const H = Number.isFinite(hIn) ? hIn : 55;
      vpdInterior = riegoVPDkPa(T, H);
      demandaDia = 0.48 + vpdInterior * 0.38 + (horasLuz - 14) * 0.028;
      const luzTipo = cfgIn.luz || 'led';
      const multLuz = {
        natural: 0.94, led: 1, mixto: 1.03, fluorescente: 0.92, hps: 1.12, sin_luz: 0.62
      }[luzTipo] ?? 1;
      const inten = cfgIn.interiorIntensidadLuz || 'media';
      const multInt = { baja: 0.9, media: 1, alta: 1.1 }[inten] ?? 1;
      demandaDia *= multLuz * multInt;
      if (cfgIn.interiorCirculacionAire) demandaDia *= 1.065;
      demandaDia = Math.max(0.52, Math.min(1.22, demandaDia));
    } else {
      demandaDia = riegoIndiceDemanda({
        vpdKpa: vpd,
        vientoKmh: viento,
        uvIdx: uvEfectivo,
        toldo: toldoAct,
        probLluvia,
        et0DayMm: et0Riego
      });
      demandaDia *= riegoAjusteClimaPorSustrato({
        retencion: sustrato.retencion,
        humMediaPct: humMedia,
        probLluviaPct: probLluvia,
        uvIdx: uvEfectivo,
        vpdKpa: vpd,
        et0DayMm: et0Riego
      });
      demandaDia *= riegoMargenSeguridadDinamico({
        tramo: 'dia',
        retencion: sustrato.retencion,
        vpdKpa: vpd,
        vientoKmh: viento,
        uvIdx: uvEfectivo,
        et0DayMm: et0Riego,
        probLluviaPct: probLluvia,
        faseMult: multFase
      });
    }
    if (esInterior) {
      demandaDia = Math.max(0.52, Math.min(1.22, demandaDia * multFase));
    } else {
      demandaDia = Math.max(0.48, Math.min(1.58, demandaDia * multFase));
    }
    const sensRiego = riegoMultSensorSustrato();
    if (sensRiego.mult !== 1) {
      demandaDia = Math.max(0.48, Math.min(1.58, demandaDia * sensRiego.mult));
    }
    if (tipoRiego === 'torre') {
      demandaDia = Math.max(0.48, Math.min(1.58, demandaDia * multObjetivoTorre));
    }

    if (!esInterior && tipoRiego === 'torre' && mcNear) {
      const refH = meteoclimaticRiegoModeloHoraEnDia(times, dayHourIdx, tempHArr, rhArr, temp1315, hum1315);
      const anaD = meteoclimaticFactorVpdDesdeMc(
        mcNear,
        refH.t,
        refH.rh,
        dTempPlanta,
        MC_RIEGO_FAC_DIA_MIN,
        MC_RIEGO_FAC_DIA_MAX
      );
      if (anaD) {
        factorMcDiaRiego = anaD.factor;
        demandaDia *= factorMcDiaRiego;
        demandaDia = Math.max(0.48, Math.min(1.58, demandaDia));
        mcRiegoLineaAjuste +=
          '<br><span class="riego-clima-mc-ajuste">⚖️ <strong>Ajuste conservador Meteoclimatic (día):</strong> discrepancia fuerte (≥' +
          MC_RIEGO_DIF_T_C + ' °C y/o ≥' + MC_RIEGO_DIF_RH_PP + ' pp HR) vs hora del modelo en el día elegido · lectura &lt;45 min · demanda ×' +
          (Math.round(factorMcDiaRiego * 1000) / 1000) + ' <span class="riego-clima-mc-ajuste-sub">(tope ' + MC_RIEGO_FAC_DIA_MIN + '–' + MC_RIEGO_FAC_DIA_MAX + ' sobre VPD)</span>.</span>';
      }
    }

    const esNftRiego = tipoRiego === 'nft';
    const esDwcRiego = tipoRiego === 'dwc';
    const esRdwcRiego = tipoRiego === 'rdwc';
    if (esNftRiego || esDwcRiego || esRdwcRiego) {
      const panelNft = document.getElementById('riegoNftPanel');
      const panelDwc = document.getElementById('riegoDwcPanel');
      const panelRdwc = document.getElementById('riegoRdwcPanel');
      const climaNft = document.getElementById('riegoClimaUsadoNft');
      const climaDwc = document.getElementById('riegoClimaUsadoDwc');
      const climaRdwc = document.getElementById('riegoClimaUsadoRdwc');
      const blockTorre = document.getElementById('riegoTorreResultBlock');
      if (panelNft) panelNft.classList.toggle('setup-hidden', !esNftRiego);
      if (panelDwc) panelDwc.classList.toggle('setup-hidden', !esDwcRiego);
      if (panelRdwc) panelRdwc.classList.toggle('setup-hidden', !esRdwcRiego);
      if (blockTorre) blockTorre.classList.add('setup-hidden');

      const precipMmN = Math.round((Number(daily.precipitation_sum?.[idx]) || 0) * 10) / 10;
      const uvVisibleN = Number.isFinite(Number(uvEfectivo))
        ? Math.round(Number(uvEfectivo) * 10) / 10
        : (uvFallbackMeteo != null ? Math.round(Number(uvFallbackMeteo) * 10) / 10 : null);
      const uvClimaStrN = esInterior
        ? '—'
        : (uvVisibleN == null ? '—' : String(uvVisibleN));
      const lineaClimaN =
        '🌡️ Temperatura: ' + Math.round(tempMin) + '–' + Math.round(tempMax) + ' °C' +
        ' · 💧 Humedad media: ' + humMedia + '%' +
        ' · ☀️ Índice UV: ' + uvClimaStrN +
        ' · 🌧️ Prob. lluvia: ' + probLluvia + '% · ' + precipMmN + ' mm';
      const uvTipNft =
        !esInterior && Number.isFinite(Number(uvEfectivo)) && Number(uvEfectivo) >= 7
          ? '<br><br><span class="riego-clima-tip-uv">💡 <strong>UV elevado:</strong> conviene <strong>toldo</strong>, <strong>malla sombra</strong> (p. ej. 30–50 %) o sombra parcial para moderar estrés y calor en el follaje.</span>'
          : '';
      const lineaMcNft = meteoclimaticFormatLineaHtml(mcNear);
      const bloqueClima =
        '<span class="riego-clima-bloque">' + lineaClimaN + '</span>' +
        (esInterior
          ? '<br><br><span class="riego-clima-nota-int">🏠 Interior — datos de la ubicación guardada (referencia).</span>'
          : '') +
        uvTipNft +
        (lineaMcNft || '');
      if (esNftRiego && climaNft) {
        climaNft.innerHTML = bloqueClima;
        climaNft.classList.remove('setup-hidden');
      }
      if (esDwcRiego && climaDwc) {
        climaDwc.innerHTML = bloqueClima;
        climaDwc.classList.remove('setup-hidden');
      }
      if (esRdwcRiego && climaRdwc) {
        climaRdwc.innerHTML = bloqueClima;
        climaRdwc.classList.remove('setup-hidden');
      }

      ['resMinON', 'resMinOFF', 'resCiclos', 'resTotalON', 'resEspaciado', 'resDutyCiclo', 'resMedioON', 'resMedioOFF', 'resMedioCiclos', 'resMedioTotal', 'resMedioDutyCiclo', 'resNocON', 'resNocOFF', 'resNocCiclos', 'resNocTotal', 'resNocEspaciado', 'resNocDuty'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '—';
      });
      const nocNotaNft = document.getElementById('resNocNota');
      if (nocNotaNft) {
        nocNotaNft.classList.add('setup-hidden');
        nocNotaNft.textContent = '';
      }

      state.ultimoRiego = {
        nftContinuo24h: esNftRiego,
        dwcOxigenacion24h: esDwcRiego,
        fecha: new Date().toLocaleDateString('es-ES'),
        vpd,
        vpdMediodia: Math.round(vpdMediodia * 100) / 100,
        sustratoPerfilNombre: sustrato.nombre,
      };
      saveState();
      if (elHorarioHint) {
        const pieMeteo = refetchMeteo
          ? '\n\n🌐 Previsión meteorológica pedida a la API en esta consulta (' + new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) + ').'
          : '\n\n🌐 Meteo: puede usarse caché reciente (~1 min). Pulsa «Calcular riego ahora» para traer datos nuevos del modelo.';
        elHorarioHint.textContent = (esNftRiego
          ? '🪴 NFT: riego continuo — no hay bloque de intensidad solar por pulsos; el clima sirve de referencia para vigilar estrés.'
          : esRdwcRiego
            ? '🔁 RDWC: recirculación y aireación continuas — no es riego por goteo ni por impulsos como en torre; el clima solo orienta el follaje.'
            : '💧 DWC: oxigenación continua — no hay bloque de intensidad solar por pulsos como en torre; el clima resume tu ubicación.') + pieMeteo;
      }
      try {
        actualizarRiegoToldoRecoUI(esInterior, tempMax, uvMax);
      } catch (_) {}
      document.getElementById('riegoLoader').classList.add('setup-hidden');
      document.getElementById('riegoResultado').classList.remove('setup-hidden');
      return;
    }

    const panelNftT = document.getElementById('riegoNftPanel');
    const panelDwcT = document.getElementById('riegoDwcPanel');
    const panelRdwcT = document.getElementById('riegoRdwcPanel');
    const blockTorreT = document.getElementById('riegoTorreResultBlock');
    if (panelNftT) panelNftT.classList.add('setup-hidden');
    if (panelDwcT) panelDwcT.classList.add('setup-hidden');
    if (panelRdwcT) panelRdwcT.classList.add('setup-hidden');
    if (blockTorreT) blockTorreT.classList.remove('setup-hidden');

    const ciclo = riegoMinutosDesdeDemanda(
      demandaDia, nPlantas, kcMedio, sustrato, esInterior
    );
    let minON = ciclo.minON;
    let minOFF = esInterior ? Math.max(10, ciclo.minOFF) : ciclo.minOFF;

    const factorON = Math.round(demandaDia * 100) / 100;
    const offBaseNeutral = riegoOffBaseNeutral(sustrato, esInterior);
    const factorOFF = Math.round((minOFF / offBaseNeutral) * 100) / 100;
    const dutyCicloPct = Math.round((100 * minON) / (minON + minOFF));

    // ── Sección C: ciclos ─────────────────────────────────────────────────
    const minCiclo    = minON + minOFF;
    const ciclos      = Math.floor(840 / minCiclo);
    const espaciado   = Math.round(840 / ciclos);
    const totalON     = minON * ciclos;

    // ── Programa mediodía (11–15 h)
    let demandaMed;
    if (esInterior) {
      demandaMed = demandaDia;
    } else {
      demandaMed = riegoIndiceDemanda({
        vpdKpa: vpdMediodia,
        vientoKmh: viento,
        uvIdx: uvEfectivo,
        toldo: toldoAct,
        probLluvia,
        et0DayMm: et0Riego
      });
      demandaMed *= riegoAjusteClimaPorSustrato({
        retencion: sustrato.retencion,
        humMediaPct: humMedia,
        probLluviaPct: probLluvia,
        uvIdx: uvEfectivo,
        vpdKpa: vpdMediodia,
        et0DayMm: et0Riego
      });
      demandaMed *= riegoMargenSeguridadDinamico({
        tramo: 'dia',
        retencion: sustrato.retencion,
        vpdKpa: vpdMediodia,
        vientoKmh: viento,
        uvIdx: uvEfectivo,
        et0DayMm: et0Riego,
        probLluviaPct: probLluvia,
        faseMult: multFase
      });
      demandaMed = Math.max(0.48, Math.min(1.58, demandaMed * multFase));
    }
    if (sensRiego.mult !== 1) {
      demandaMed = Math.max(0.48, Math.min(1.58, demandaMed * sensRiego.mult));
    }
    if (tipoRiego === 'torre') {
      demandaMed = Math.max(0.48, Math.min(1.58, demandaMed * multObjetivoTorre));
    }

    if (!esInterior && tipoRiego === 'torre' && factorMcDiaRiego !== 1) {
      demandaMed *= factorMcDiaRiego;
      demandaMed = Math.max(0.48, Math.min(1.58, demandaMed));
    }

    const cicloMed = riegoMinutosDesdeDemanda(
      demandaMed, nPlantas, kcMedio, sustrato, esInterior
    );
    const minONMedio = cicloMed.minON;
    const minOFFMedio = esInterior ? Math.max(10, cicloMed.minOFF) : cicloMed.minOFF;
    const durMedMin = ((typeof medHIni === 'number' && typeof medHFin === 'number') ? (medHFin - medHIni + 1) : 4) * 60;
    const ciclosMedio  = Math.floor(durMedMin / (minONMedio + minOFFMedio));
    const totalONMedio = minONMedio * ciclosMedio;
    const dutyMedioPct = Math.round((100 * minONMedio) / (minONMedio + minOFFMedio));

    // ── Programa nocturno 21:00–07:00 (recarga sustrato; ON 3–5 min) ─────────
    const statsNoct = riegoStatsNocturnosFromHourly(dayHourIdx, times, tempHArr, rhArr, windHArr);
    const dTNocPlanta = dTempPlanta * 0.38;
    let tempNocUse;
    let rhNocUse;
    let vientoNocKmh;
    if (statsNoct) {
      tempNocUse = statsNoct.temp + dTNocPlanta + (toldoAct ? -0.35 : 0);
      rhNocUse = statsNoct.rh;
      vientoNocKmh = Number.isFinite(statsNoct.vientoMax) && statsNoct.vientoMax > 0
        ? statsNoct.vientoMax
        : viento * 0.62;
    } else {
      tempNocUse = tempMin + dTNocPlanta + 0.6 + (toldoAct ? -0.35 : 0);
      rhNocUse = Math.min(94, humMedia + 9);
      vientoNocKmh = viento * 0.55;
    }
    let demandaNocRaw;
    let vpdNocVal;
    let demandaNoc;
    if (esInterior) {
      vpdNocVal = vpdInterior;
      demandaNocRaw = Math.max(0.42, Math.min(0.95, demandaDia * 0.52));
      demandaNoc = Math.max(0.38, Math.min(1.02, demandaNocRaw));
    } else {
      vpdNocVal = riegoVPDkPa(tempNocUse, rhNocUse);
      demandaNocRaw = riegoIndiceDemandaNocturna({
        vpdKpa: vpdNocVal,
        vientoKmh: vientoNocKmh,
        tempMin,
        probLluvia,
        et0NightMm: et0NightSum,
        toldo: toldoAct
      });
      demandaNoc = demandaNocRaw * multFase;
      demandaNoc *= riegoMargenSeguridadDinamico({
        tramo: 'noche',
        retencion: sustrato.retencion,
        vpdKpa: vpdNocVal,
        vientoKmh: vientoNocKmh,
        uvIdx: 0,
        et0DayMm: et0NightSum != null ? et0NightSum * 11 : 0,
        probLluviaPct: probLluvia,
        faseMult: multFase
      });
      demandaNoc = Math.max(0.38, Math.min(1.12, demandaNoc));
      if (sensRiego.mult !== 1) {
        demandaNoc = Math.max(0.38, Math.min(1.12, demandaNoc * sensRiego.mult));
      }
    }
    const cfgRiegoNoc = state.configTorre || {};
    const interiorTNoc = parseFloat(cfgRiegoNoc.interiorTempC);
    const tempAireNocProxy =
      esInterior && Number.isFinite(interiorTNoc) ? interiorTNoc : tempNocUse;
    const tempAguaNocUse = riegoTempAguaNocheEfectiva(cfgRiegoNoc, state.ultimaMedicion, tempAireNocProxy);
    const fNocTempAgua = riegoFactorDemandaNocPorTempAgua(tempAguaNocUse);
    const fNocDifusor = riegoFactorDemandaNocPorDifusor(cfgRiegoNoc.equipamiento);
    demandaNoc *= fNocTempAgua * fNocDifusor;
    if (tipoRiego === 'torre') {
      demandaNoc *= multObjetivoTorre;
    }
    demandaNoc = esInterior
      ? Math.max(0.38, Math.min(1.02, demandaNoc))
      : Math.max(0.38, Math.min(1.12, demandaNoc));

    if (!esInterior && tipoRiego === 'torre' && mcNear) {
      const anaN = meteoclimaticFactorNocDesdeMc(mcNear, tempNocUse, rhNocUse, dTempPlanta, 0.38);
      if (anaN) {
        factorMcNocRiego = anaN.factor;
        demandaNoc *= factorMcNocRiego;
        demandaNoc = Math.max(0.38, Math.min(1.12, demandaNoc));
        mcRiegoLineaAjuste +=
          '<br><span class="riego-clima-mc-ajuste">⚖️ <strong>Ajuste conservador Meteoclimatic (noche):</strong> solo en horario local 20:00–07:59 · misma regla ΔT/ΔHR y lectura reciente vs noche modelo · demanda nocturna ×' +
          (Math.round(factorMcNocRiego * 1000) / 1000) + ' <span class="riego-clima-mc-ajuste-sub">(tope ' + MC_RIEGO_FAC_NOC_MIN + '–' + MC_RIEGO_FAC_NOC_MAX + ')</span>.</span>';
      }
    }

    const windSkipProxy = statsNoct && Number.isFinite(statsNoct.vientoMax) && statsNoct.vientoMax > 0
      ? statsNoct.vientoMax
      : viento * 0.52;
    const umbNocSkip = riegoNocUmbralesOmitir(tempMin, probLluvia, et0NightSum);
    const secaNocEt =
      et0NightSum != null && typeof et0NightSum === 'number' && et0NightSum >= 0.19;
    let nocSkip = false;
    let nocSkipClave = '';
    if (!esInterior) {
      const omitNoc = riegoTorreExteriorOmiteNocturnoPorClima({
        tempMin,
        tempNoc: tempNocUse,
        rhNoc: rhNocUse,
        vpdNoc: vpdNocVal,
      });
      if (omitNoc.omit) {
        nocSkip = true;
        nocSkipClave = omitNoc.clave;
      }
    } else {
      if (
        !secaNocEt &&
        demandaNoc < umbNocSkip.demMax &&
        vpdNocVal < umbNocSkip.vpdMax &&
        windSkipProxy < umbNocSkip.windMax
      ) {
        nocSkip = true;
      }
    }
    const kcNoc = Math.max(0.25, Math.min(0.48, kcMedio * 0.36));
    const cicloNoc0 = riegoMinutosDesdeDemanda(demandaNoc, nPlantas, kcNoc, sustrato, esInterior);
    let minONNoc = Math.min(4, Math.max(3, cicloNoc0.minON));
    let minOFFNoc = Math.max(
      esInterior ? 28 : 42,
      Math.round(cicloNoc0.minOFF * (1.1 + sustrato.retencion * 0.07))
    );
    try {
      let envN = riegoNocCorredorTablaTorre(tempNocUse, rhNocUse, vientoNocKmh);
      envN = riegoNocAjusteCorredorEsponja(envN, riegoSustratoKey());
      const clN = riegoNocClampModeloACorredor(minONNoc, minOFFNoc, envN);
      minONNoc = clN.minON;
      minOFFNoc = clN.minOFF;
    } catch (eCorN) {}
    let minCicloNoc = minONNoc + minOFFNoc;
    let ciclosNoc = nocSkip ? 0 : Math.floor(600 / minCicloNoc);
    ciclosNoc = Math.min(8, Math.max(0, ciclosNoc));
    let usarNocCalculadoExt = false;
    if (!esInterior && !nocSkip) {
      const nocheCalidaExt =
        (Number.isFinite(tempMin) && tempMin >= 23.5) ||
        (Number.isFinite(tempNocUse) && tempNocUse >= 24);
      const olaCalorExt =
        Number.isFinite(tempMax) &&
        tempMax >= 28 &&
        ((Number.isFinite(tempMin) && tempMin >= 23) ||
          (Number.isFinite(tempNocUse) && tempNocUse >= 23.5));
      usarNocCalculadoExt =
        secaNocEt || demandaNoc >= 0.72 || nocheCalidaExt || olaCalorExt;
      if (!usarNocCalculadoExt) {
        minONNoc = RIEGO_NOC_REFRESCO_TORRE_EXT_SEG / 60;
        minCicloNoc = minONNoc + minOFFNoc;
        ciclosNoc = 1;
      } else {
        if (ciclosNoc === 0 && minCicloNoc <= 600) ciclosNoc = 1;
      }
    } else if (!esInterior && nocSkip) {
      ciclosNoc = 0;
    } else if (
      esInterior &&
      !nocSkip &&
      ciclosNoc === 0 &&
      minCicloNoc <= 600 &&
      demandaNoc >= riegoNocDemandaMin1Ciclo(tempMin)
    ) {
      ciclosNoc = 1;
    }
    const esNocRefrescoTorreExt = !esInterior && !nocSkip && ciclosNoc > 0 && !usarNocCalculadoExt;
    const totalONNoc = esNocRefrescoTorreExt
      ? (RIEGO_NOC_REFRESCO_TORRE_EXT_SEG / 60) * ciclosNoc
      : minONNoc * ciclosNoc;
    const espNoc = ciclosNoc > 0 ? Math.round(600 / ciclosNoc) : 0;
    let dutyNocPct = null;
    if (ciclosNoc > 0 && !esNocRefrescoTorreExt) {
      dutyNocPct = Math.round((100 * minONNoc) / minCicloNoc);
    }

    // ── Mostrar resultados ────────────────────────────────────────────────
    document.getElementById('resMinON').textContent    = minON;
    document.getElementById('resMinOFF').textContent   = minOFF;
    document.getElementById('resCiclos').textContent   = ciclos;
    document.getElementById('resTotalON').textContent  = totalON;
    document.getElementById('resEspaciado').textContent = espaciado;
    const elDuty = document.getElementById('resDutyCiclo');
    if (elDuty) elDuty.textContent = dutyCicloPct + '%';

    document.getElementById('resMedioON').textContent    = minONMedio;
    document.getElementById('resMedioOFF').textContent   = minOFFMedio;
    document.getElementById('resMedioCiclos').textContent = ciclosMedio;
    document.getElementById('resMedioTotal').textContent  = totalONMedio;
    const medHead = document.getElementById('mediodiaHeader');
    const hhMed = function (n) { return String(n).padStart(2, '0') + ':00'; };
    if (typeof medHIni === 'number' && typeof medHFin === 'number') {
      if (medHead) {
        medHead.textContent = '☀️ Riego de mayor intensidad solar — ' + hhMed(medHIni) + ' a ' + hhMed(medHFin) + 'h';
      }
      if (elHorarioHint) {
        const diaTxt = diaRiego === 'manana' ? 'mañana (previsión)' : 'hoy';
        let hint =
          '🕐 Horario recomendado para programar el bloque de mayor intensidad solar: de ' + hhMed(medHIni) + ' a ' + hhMed(medHFin) +
          ' (4 h), según pico de estrés del día en el modelo (' + diaTxt + ').';
        if (esInterior) {
          hint += ' En instalación interior es referencia del clima de tu ubicación; cuádralo con tu fotoperiodo real.';
        }
        const pieMeteo = refetchMeteo
          ? '\n\n🌐 Previsión meteorológica pedida a la API en esta consulta (' + new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) + ').'
          : '\n\n🌐 Meteo: puede usarse caché reciente (~1 min). Pulsa «Calcular riego ahora» para traer datos nuevos del modelo.';
        elHorarioHint.textContent = hint + pieMeteo;
      }
    }
    const elMedDuty = document.getElementById('resMedioDutyCiclo');
    if (elMedDuty) elMedDuty.textContent = dutyMedioPct + '%';

    const elNocON = document.getElementById('resNocON');
    const elNocOFF = document.getElementById('resNocOFF');
    const elNocC = document.getElementById('resNocCiclos');
    const elNocT = document.getElementById('resNocTotal');
    const elNocE = document.getElementById('resNocEspaciado');
    const elNocD = document.getElementById('resNocDuty');
    const elNocNota = document.getElementById('resNocNota');
    const elNocLabelA = document.getElementById('resNocLabelA');
    const elNocLabelB = document.getElementById('resNocLabelB');
    const nocSinResultado = esInterior ? (nocSkip || ciclosNoc === 0) : (ciclosNoc === 0);
    if (elNocLabelA) elNocLabelA.textContent = esNocRefrescoTorreExt ? 'Refresco' : 'min ON';
    if (elNocLabelB) elNocLabelB.textContent = esNocRefrescoTorreExt ? 'Hora' : 'min OFF';
    if (elNocON) {
      elNocON.textContent =
        nocSinResultado ? '—' : esNocRefrescoTorreExt ? RIEGO_NOC_REFRESCO_TORRE_EXT_SEG + ' s' : String(minONNoc);
    }
    if (elNocOFF) {
      elNocOFF.textContent =
        nocSinResultado ? '—' : esNocRefrescoTorreExt ? '04:00' : String(minOFFNoc);
    }
    if (elNocC) elNocC.textContent = nocSinResultado ? '—' : String(ciclosNoc);
    if (elNocT) {
      elNocT.textContent =
        nocSinResultado ? '—' : esNocRefrescoTorreExt ? RIEGO_NOC_REFRESCO_TORRE_EXT_SEG + ' s' : String(totalONNoc);
    }
    if (elNocE) {
      elNocE.textContent =
        nocSinResultado ? '—' : esNocRefrescoTorreExt ? '04' : String(espNoc);
      elNocE.style.fontSize = esNocRefrescoTorreExt ? '28px' : '';
      elNocE.style.whiteSpace = esNocRefrescoTorreExt ? 'normal' : '';
      elNocE.style.lineHeight = esNocRefrescoTorreExt ? '1.05' : '';
    }
    const elNocEspLabel = document.querySelector('#resNocEspaciado')?.nextElementSibling;
    if (elNocEspLabel) {
      elNocEspLabel.textContent = esNocRefrescoTorreExt ? 'AM' : 'Espaciado';
      elNocEspLabel.style.fontWeight = esNocRefrescoTorreExt ? '900' : '';
    }
    if (elNocD) {
      elNocD.textContent =
        nocSinResultado || dutyNocPct == null ? '—' : dutyNocPct + '%';
    }
    if (elNocNota) {
      // Mantener lógica interna, pero ocultar razones técnicas al usuario final.
      elNocNota.classList.add('setup-hidden');
      elNocNota.textContent = '';
    }

    const etiquetaDia = diaRiego === 'manana' ? '📅 Mañana' : '📅 Hoy';
    const precipMm = Math.round((Number(daily.precipitation_sum?.[idx]) || 0) * 10) / 10;
    const uvVisible = Number.isFinite(Number(uvEfectivo))
      ? Math.round(Number(uvEfectivo) * 10) / 10
      : (uvFallbackMeteo != null ? Math.round(Number(uvFallbackMeteo) * 10) / 10 : null);
    const uvClimaStr = esInterior ? '—' : (uvVisible == null ? '—' : String(uvVisible));
    const lineaClima =
      '🌡️ Temperatura: ' + Math.round(tempMin) + '–' + Math.round(tempMax) + ' °C' +
      ' · 💧 Humedad media: ' + humMedia + '%' +
      ' · ☀️ Índice UV: ' + uvClimaStr +
      ' · 🌧️ Prob. lluvia: ' + probLluvia + '% · ' + precipMm + ' mm';
    const lineaTramo1315 = !esInterior
      ? '<br>🕐 Mediodía modelo (' + String(medHIni).padStart(2, '0') + '–' + String(medHFin).padStart(2, '0') + ' h): ' + temp1315 + ' °C · ' + hum1315 + '% HR'
      : '';
    const vpdDiaTxt = Math.round(vpd * 1000) / 1000;
    const vpdMedTxt = Math.round(vpdMediodia * 1000) / 1000;
    const demDiaTxt = Math.round(demandaDia * 100) / 100;
    const demMedTxt = Math.round(demandaMed * 100) / 100;
    const demNocTxt = Math.round(demandaNoc * 100) / 100;
    const facNocAguaDifTxt =
      'T agua modelo ~' + Math.round(tempAguaNocUse * 10) / 10 + ' °C · ajuste noct. ×' +
      Math.round(fNocTempAgua * fNocDifusor * 1000) / 1000;
    const vpdNocTxt = Math.round(vpdNocVal * 1000) / 1000;
    const et0NocTxt = et0NightSum != null && Number.isFinite(et0NightSum) ? String(et0NightSum) : '—';
    const windNocTxt = Math.round(vientoNocKmh * 10) / 10;
    const tempNocTxt = Math.round(tempNocUse * 10) / 10;
    const rhNocTxt = Math.round(rhNocUse);
    const fechaModTxt = escHtmlUi(dailyDateStr || '—');
    let notaRedondeo = '';
    if (!esInterior && (demDiaTxt !== demMedTxt || vpdDiaTxt !== vpdMedTxt) && minON === minONMedio && minOFF === minOFFMedio) {
      notaRedondeo =
        '<br><span class="riego-clima-nota-peq">ℹ️ La demanda o el VPD cambian entre «día» y «franja de mayor intensidad solar», pero al <strong>redondear a minutos enteros</strong> el pulso ON/OFF puede salir igual.</span>';
    }
    const lineaNocClima = esInterior
      ? '<br>🌙 Nocturno (interior): VPD sala ~' + vpdNocTxt + ' kPa · demanda rel. ~' + demNocTxt + ' (sin ET₀/viento exterior en el índice). · ' + facNocAguaDifTxt
      : '<br>🌙 Nocturno (21–07 h): ~' + tempNocTxt + ' °C · ' + rhNocTxt + '% HR · VPD ~' + vpdNocTxt + ' kPa · viento máx. horario ~' + windNocTxt + ' km/h · Σ ET₀ noche ~' + et0NocTxt + ' mm · demanda rel. ~' + demNocTxt + '. · ' + facNocAguaDifTxt;
    const lineaMcRiego = meteoclimaticFormatLineaHtml(mcNear) + (mcRiegoLineaAjuste || '');
    document.getElementById('riegoClimaUsado').innerHTML =
      '<strong class="u-text-white">' + etiquetaDia + '</strong><br>' + lineaClima + lineaTramo1315 +
      lineaNocClima +
      lineaMcRiego +
      '<br><span class="riego-clima-meta-line">📆 Día en el modelo: <strong>' + fechaModTxt +
      '</strong> · VPD ~' + vpdDiaTxt + ' / ~' + vpdMedTxt + ' kPa (24 h vs ventana dinámica de mayor intensidad solar + pico radiación) · Demanda rel. ' +
      demDiaTxt + ' / ' + demMedTxt + ' (general / intensidad solar).</span>' +
      '<br><span class="riego-clima-nota-peq">Si <strong>hoy</strong> y <strong>mañana</strong> dan el mismo programa, suele ser previsión muy parecida en la API + mismos redondeos; comprueba que cambian temperatura/UV arriba y la fecha del modelo.</span>' +
      notaRedondeo +
      (esInterior
        ? '<br><span class="riego-clima-int-torre">🏠 Torre en interior — estos valores son de la ubicación en previsión; el cálculo usa también luz y ambiente de sala (bloque de intensidad solar = mismo índice que el día).</span>'
        : '');

    // Guardar en state para uso en otros módulos
    state.ultimoRiego = { minON, minOFF, ciclos, totalON, espaciado,
      minONMedio, minOFFMedio, ciclosMedio, totalONMedio,
      dutyCicloPct, dutyMedioPct,
      minONNoc: nocSkip || ciclosNoc === 0 ? null : minONNoc,
      minOFFNoc: nocSkip || ciclosNoc === 0 || esNocRefrescoTorreExt ? null : minOFFNoc,
      ciclosNoc: nocSkip || ciclosNoc === 0 ? 0 : ciclosNoc,
      totalONNoc: nocSkip || ciclosNoc === 0 ? 0 : totalONNoc,
      espaciadoNoc: nocSkip || ciclosNoc === 0 || esNocRefrescoTorreExt ? null : espNoc,
      espaciadoNocRefrescoHora: esNocRefrescoTorreExt ? '04:00' : null,
      nocRefrescoSeg: esNocRefrescoTorreExt ? RIEGO_NOC_REFRESCO_TORRE_EXT_SEG : null,
      dutyNocPct: nocSkip || ciclosNoc === 0 || dutyNocPct == null ? null : dutyNocPct,
      demandaNoc: Math.round(demandaNoc * 1000) / 1000,
      vpdNoc: Math.round(vpdNocVal * 1000) / 1000,
      nocSkip,
      factorON: Math.round(factorON*100)/100,
      factorOFF: Math.round(factorOFF*100)/100,
      kcMedio,
      kcNoc: Math.round(kcNoc * 1000) / 1000,
      faseCultivoRiego: riegoFaseCultivoKeyEfectiva(edadSem),
      faseCultivoRiegoAuto: state.configTorre?.faseCultivoRiegoAuto !== false,
      multFaseCultivo: Math.round(multFase * 100) / 100,
      sustratoPerfilNombre: sustrato.nombre,
      vpd, vpdMediodia: Math.round(vpdMediodia*100)/100,
      fecha: new Date().toLocaleDateString('es-ES'),
      mcRiegoFactorDia: factorMcDiaRiego !== 1 ? Math.round(factorMcDiaRiego * 1000) / 1000 : null,
      mcRiegoFactorNoc: factorMcNocRiego !== 1 ? Math.round(factorMcNocRiego * 1000) / 1000 : null,
      objetivoTorreCultivo: tipoRiego === 'torre' ? objetivoTorre : null,
      multObjetivoTorre: tipoRiego === 'torre' ? Math.round(multObjetivoTorre * 100) / 100 : null,
    };
    saveState();

    try {
      actualizarRiegoToldoRecoUI(esInterior, tempMax, uvMax);
    } catch (_) {}

    document.getElementById('riegoLoader').classList.add('setup-hidden');
    document.getElementById('riegoResultado').classList.remove('setup-hidden');

  } catch(e) {
    ocultarRiegoToldoRecoUI();
    document.getElementById('riegoLoader').classList.add('setup-hidden');
    const elH = document.getElementById('riegoHorarioRecomendado');
    if (elH && !(e && String(e.message || '') === 'sin-coords-riego')) {
      elH.textContent = 'No se pudo calcular el horario de mayor intensidad solar. Revisa conexión y ubicación, y pulsa de nuevo «Calcular riego ahora».';
    }
    if (!(e && String(e.message || '') === 'sin-coords-riego')) {
      showToast('❌ Error al obtener datos meteorológicos', true);
    }
  } finally {
    if (btnCalc) {
      btnCalc.disabled = false;
      btnCalc.textContent = btnCalcPrevTxt;
    }
  }
}

