// Inicio — hub visual y checklist experto

const EXPERT_CHECKLIST_STORAGE_KEY = 'hydrogrow-pro.v1.expertChecklist';

const expertChecklistItems = [
  {
    id: 'oxigenacion',
    title: 'Oxigenación y recirculación',
    text:
      'En DWC cada cubo necesita piedra o difusor 24/7. En RDWC el circuito maestro debe mantener solución en movimiento y raíces suspendidas sin anoxia.',
  },
  {
    id: 'volumen',
    title: 'Volumen de depósito y densidad',
    text:
      'Orientativo: 15–25 L de solución por planta en DWC; evita amontonar macetas sin espacio foliar.',
  },
  {
    id: 'agua',
    title: 'Calidad de agua y calibración',
    text:
      'Prioriza ósmosis o destilada; grifo solo si conoces dureza y ajustas. Calibra medidor de pH cada 7–10 días.',
  },
  {
    id: 'temperatura',
    title: 'Temperatura de solución',
    text:
      'Mantén el líquido entre ~18 y 20 °C; por encima de ~23 °C baja el oxígeno disuelto.',
  },
  {
    id: 'luz',
    title: 'Luz y genética',
    text:
      'Ajusta potencia y fotoperíodo a la variedad. Sube EC y luz de forma progresiva.',
  },
  {
    id: 'nutricion',
    title: 'Nutrición por fases',
    text:
      'Germinación: EC baja; sube en vegetación; estabiliza en floración según tabla de la cepa.',
  },
  {
    id: 'instrumentacion',
    title: 'Instrumentación y recinto',
    text:
      'Marca medidores (pH/EC, Tª líquido, termohigrómetro…) y opciones del espacio en el checklist o en Cultivo → desplegable «Complementos e instrumentación» si añades equipo después.',
  },
  {
    id: 'registro',
    title: 'Registro diario',
    text:
      'Anota pH, EC, temperatura de agua, aire, humedad (VPD), CO₂ y luz (PPFD/horas). Las tendencias importan más que un valor aislado.',
  },
  {
    id: 'legal',
    title: 'Entorno y legalidad (España)',
    text:
      'Cultivo privado para autoconsumo; evita visibilidad desde vía pública.',
  },
];

function getExpertChecklistState() {
  try {
    const raw = localStorage.getItem(EXPERT_CHECKLIST_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function toggleExpertChecklistItem(id) {
  const state = getExpertChecklistState();
  state[id] = !state[id];
  try {
    localStorage.setItem(EXPERT_CHECKLIST_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('No se pudo guardar el checklist experto.', e);
  }
  renderInicio();
}

function resetExpertChecklist() {
  try {
    localStorage.removeItem(EXPERT_CHECKLIST_STORAGE_KEY);
  } catch (e) {
    console.warn(e);
  }
  renderInicio();
}

function requestFullSystemReset() {
  const step1 =
    'Se borrarán en este dispositivo: cultivo e historial de medidas, configuración del cultivo hidropónico (checklist inicial), checklist de buenas prácticas de Inicio y preferencias de gráficos. No se borra el tema claro/oscuro.\n\n¿Quieres continuar?';
  if (!window.confirm(step1)) return;
  const step2 =
    'Confirmación final: no hay deshacer. ¿Eliminar todos estos datos locales ahora?';
  if (!window.confirm(step2)) return;
  purgeAllLocalAppDataExceptTheme();
  if (typeof resetWizardAndSessionChrome === 'function') resetWizardAndSessionChrome();
  const strainDetail = document.getElementById('strainDetail');
  if (strainDetail) strainDetail.innerHTML = '';
  if (typeof renderStrains === 'function') renderStrains('all');
  if (typeof renderNutrientes === 'function') renderNutrientes();
  renderInicio();
  if (typeof renderCultivo === 'function') renderCultivo();
  if (typeof renderMonitor === 'function') renderMonitor();
  if (typeof renderSemanas === 'function') renderSemanas();
  if (typeof renderRiego === 'function') renderRiego();
  if (typeof renderHistorial === 'function') renderHistorial();
  if (typeof renderClimatologia === 'function') renderClimatologia();
  if (typeof renderConsejosPage === 'function') renderConsejosPage();
  if (typeof navTo === 'function') navTo('inicio');
}

function goToInicio() {
  navTo('inicio');
}

function goToConfigChecklist() {
  navTo('cultivo');
}

function goToVariedades() {
  navTo('variedades');
}

function goToNutrientes() {
  navTo('nutrientes');
}

function goToMonitor() {
  navTo('monitor');
}

function goToSemanas() {
  navTo('semanas');
}

function goToHistorial() {
  navTo('historial');
}

function escapeHomeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderConsejosPage() {
  const host = document.getElementById('consejosStrainSpecs');
  if (!host || typeof renderStrainSpecsTableHtml !== 'function') return;
  const learnC = typeof getUiExperienceMode === 'function' && getUiExperienceMode() === 'learning';
  const learnBlock = learnC
    ? `<div class="alert info consejos-learning-block"><i class="ti ti-school"></i><p><strong>Modo Aprendizaje:</strong> interior no implica invernadero de cristal; con pH, EC, Tª del líquido y termohigrómetro en copa suele bastar en armario o carpa. CO₂, deshumidificador fijo o sensor PAR compensan cuando el espacio está acotado y ya llevas estable la solución. En <strong>Cultivo</strong> el perfil «espacio amplio» describe macro-carpa o sala grande, no un requisito para cultivar en pequeño.</p></div>`
    : `<div class="alert info"><i class="ti ti-hand-stop"></i><p>¿Prefieres menos jerga? En <strong>Apariencia y accesibilidad</strong> puedes dejar <strong>Guiado</strong>; si quieres el bloque anterior sobre recintos y equipo mínimo, activa <strong>Aprendizaje</strong>.</p></div>`;
  host.innerHTML = `
    <div class="card">
      <div class="card-header"><div class="card-title"><i class="ti ti-info-circle"></i>Consejos de uso</div></div>
      <p class="body-prose consejos-lead">La app está pensada para quien cultiva en <strong>hidroponía en casa</strong>: eliges el tipo de cultivo hidropónico que ofrece la app, la variedad, el nutriente y el emplazamiento. Según lo que marques de <strong>medidores y equipo</strong>, verás sugerencias de mezcla y rangos acordes; en exterior se tiene en cuenta la <strong>meteorología de tu zona</strong>. Los detalles difíciles quedan en segundo plano: lo importante son pasos claros y poder anotar qué hiciste tras cada lectura.</p>
      <div class="alert info"><i class="ti ti-flask-2"></i><p><strong>Circuito RDWC:</strong> toda la planta comparte el mismo agua con abono. Mide pH y sales (EC) en el depósito de control o donde indique tu kit: no hace falta repetir en cada cubo.</p></div>
      <div class="alert info"><i class="ti ti-gauge"></i><p><strong>Qué conviene medir:</strong> pH y EC del líquido y, si puedes, temperatura del agua. En el aire, temperatura y humedad cerca de las plantas. El CO₂ solo aporta en espacio cerrado; la luz (lux o PAR) ayuda a regular la lámpara. Marca en <strong>Cultivo</strong> solo lo que de verdad tienes: así las pantallas no te abruman.</p></div>
      <div class="alert info"><i class="ti ti-wind"></i><p><strong>Dos “aires” distintos:</strong> la bomba de burbujas oxigena el <strong>nutriente</strong>; el extractor renueva el <strong>aire del cuarto o armario</strong>. En <strong>Cultivo</strong> verás referencias para ambos. Los kits de tienda se rellenan como un montaje casero: caudales y litros según la ficha o la placa del equipo.</p></div>
      ${learnBlock}
    </div>
    ${renderStrainSpecsTableHtml()}
  `;
}

function buildInicioFusionStatusHtml() {
  if (!myGrow) return '';
  const bits = [];
  const sw = myGrow.siteWeather;
  if (sw?.updatedAt) {
    bits.push('Clima · ' + new Date(sw.updatedAt).toLocaleDateString('es-ES'));
  }
  const r = myGrow.fusion && myGrow.fusion.riegoNative;
  if (r?.updatedAt) {
    const dr = Number.isFinite(r.demandaRel) ? r.demandaRel.toFixed(2) : '—';
    bits.push('Riego · demanda ' + dr + ' (' + new Date(r.updatedAt).toLocaleDateString('es-ES') + ')');
  }
  if (!bits.length) return '';
  return `<section class="dash-fusion-status" aria-label="Estado Meteo y Riego">
    <p class="dash-fusion-status__text">${escapeHomeHtml(bits.join(' · '))}</p>
    <div class="dash-fusion-status__row">
      <button type="button" class="btn btn-ghost btn--tiny" onclick="navTo('riego')">Riego</button>
      <button type="button" class="btn btn-ghost btn--tiny" onclick="navTo('climatologia')">Clima</button>
      <button type="button" class="btn btn-ghost btn--tiny" onclick="navTo('ayuda')">Ayuda</button>
    </div>
  </section>`;
}

function buildInicioHcOpsRowHtml() {
  if (!myGrow) return '';
  const snap = myGrow.fusion && myGrow.fusion.riegoNative;
  if (!snap || !snap.updatedAt || snap.error) {
    return `<section class="dash-hc-ops" aria-label="Operativa de riego">
      <h3 class="dash-hc-ops__title"><i class="ti ti-droplet"></i> Riego y torre</h3>
      <p class="dash-hc-ops__text">Abre <strong>Riego</strong> para calcular ET₀, demanda y pulsos con el tiempo, o el módulo completo de HidroCultivo si usas <strong>torre</strong> u otro esquema.</p>
      <div class="dash-hc-ops__btns">
        <button type="button" class="btn btn-primary btn--compact" onclick="navTo('riego')">Riego (nativo)</button>
        <button type="button" class="btn btn-ghost btn--compact" onclick="navToHcEmbed('riego')">Riego HC</button>
      </div>
    </section>`;
  }
  const parts = [];
  if (Number.isFinite(snap.et0TodayMm)) parts.push('ET₀ hoy ~' + snap.et0TodayMm.toFixed(2) + ' mm');
  if (Number.isFinite(snap.vpdMeanKpa)) parts.push('VPD ~' + snap.vpdMeanKpa.toFixed(2) + ' kPa');
  if (Number.isFinite(snap.demandaRel)) parts.push('Demanda ' + snap.demandaRel.toFixed(2));
  if (Number.isFinite(snap.pulseMinON) && Number.isFinite(snap.pulseMinOFF)) {
    parts.push('Pulso ~' + snap.pulseMinON + '/' + snap.pulseMinOFF + ' min');
  }
  const line = escapeHomeHtml(parts.join(' · ') || 'Cálculo guardado');
  return `<section class="dash-hc-ops" aria-label="Resumen riego nativo">
    <h3 class="dash-hc-ops__title"><i class="ti ti-droplet"></i> Riego (último cálculo)</h3>
    <p class="dash-hc-ops__text">${line}</p>
    <div class="dash-hc-ops__btns">
      <button type="button" class="btn btn-primary btn--compact" onclick="navTo('riego')">Abrir Riego</button>
      <button type="button" class="btn btn-ghost btn--compact" onclick="navToHcEmbed('riego')">Torre · HC</button>
      <button type="button" class="btn btn-ghost btn--compact" onclick="navToHcEmbed('inicio')">Panel HC</button>
    </div>
  </section>`;
}

function buildInicioForecastWidgetHtml() {
  if (!myGrow?.siteWeather?.daily?.time?.length) return '';
  const snap = myGrow.siteWeather;
  const d = snap.daily;
  const tmax = d.temperature_2m_max?.[0];
  const tmin = d.temperature_2m_min?.[0];
  const rainMm = d.precipitation_sum?.[0];
  const pcode = d.weather_code?.[0];
  const prob = d.precipitation_probability_mean?.[0];
  const viz =
    typeof window.getDailyWeatherVisual === 'function'
      ? window.getDailyWeatherVisual(pcode)
      : { icon: 'ti ti-cloud', label: 'Pronóstico hoy', tone: 'neutral' };
  const loc = escapeHomeHtml(snap.label || myGrow.location || 'Ubicación');
  const sub = [];
  if (Number.isFinite(tmin) && Number.isFinite(tmax)) {
    sub.push(`${Math.round(tmin)}–${Math.round(tmax)}°C`);
  }
  if (Number.isFinite(prob)) sub.push(`prob. lluvia ~${Math.round(prob)}%`);
  if (Number.isFinite(rainMm) && rainMm > 0.05) sub.push(`~${rainMm.toFixed(1)} mm`);
  const subline = escapeHomeHtml(sub.join(' · ') || 'Pronóstico del modelo');
  const when = snap.updatedAt ? escapeHomeHtml(new Date(snap.updatedAt).toLocaleString('es-ES')) : '';
  const tit = escapeHomeHtml(viz.label);
  const tone = /^[a-z]+$/i.test(viz.tone) ? viz.tone : 'neutral';
  return `<section class="dash-clima-widget dash-clima-widget--${tone}" aria-label="Hoy en el pronóstico">
    <div class="dash-clima-widget__row">
      <div class="dash-clima-widget__icon" aria-hidden="true"><i class="ti ${escapeHomeHtml(viz.icon)}"></i></div>
      <div class="dash-clima-widget__body">
        <div class="dash-clima-widget__title">Hoy · ${loc}</div>
        <div class="dash-clima-widget__viz">${tit}</div>
        <p class="dash-clima-widget__metrics">${subline}</p>
        ${when ? `<p class="dash-clima-widget__meta">Actualizado ${when}</p>` : ''}
        <button type="button" class="btn btn-ghost btn--compact" onclick="navTo('climatologia')"><i class="ti ti-cloud-storm"></i> Climatología</button>
      </div>
    </div>
  </section>`;
}

function renderInicio() {
  const host = document.getElementById('inicioContent');
  if (!host) return;

  const checkedMap = getExpertChecklistState();
  const total = expertChecklistItems.length;
  const done = expertChecklistItems.filter((item) => checkedMap[item.id]).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const hasGrow = !!myGrow;
  const skipWelcome = isSkipInitialWelcome();
  const appDone = !!appConfig?.completed;

  let statusLabel = 'Configura tu instalación';
  let statusSublineHtml =
    '<p class="dash-status-text">En <strong>Cultivo</strong> indicas el hidro (RDWC, DWC, NFT…), la variedad, el nutriente y si está dentro o fuera. Con eso las pantallas te guían con números y recordatorios acordes a tu equipo, sin obligarte a ser técnico.</p>';
  if (hasGrow) {
    const rank = Number.isFinite(myGrow.nutri) ? myGrow.nutri : 1;
    const n =
      typeof nutrients !== 'undefined'
        ? nutrients.find((x) => x.rank === rank) || nutrients[0]
        : null;
    if (n) {
      statusLabel = `Nutriente · ${n.name} — ${n.brand}`;
      statusSublineHtml = '';
    } else {
      statusLabel = 'Cultivo activo';
      statusSublineHtml =
        '<p class="dash-status-text">' +
        escapeHomeHtml('Sigue la semana en curso, registra en Medir y revisa Cultivo para el resumen.') +
        '</p>';
    }
  } else if (appDone || skipWelcome) {
    statusLabel = 'Listo para arrancar';
    statusSublineHtml =
      skipWelcome && !appDone
        ? '<p class="dash-status-text">' +
          escapeHomeHtml('Modo desarrollo activo. Entra en Cultivo para el asistente completo.') +
          '</p>'
        : '<p class="dash-status-text">Abre <strong>Cultivo</strong> o <strong>Variedades</strong> para empezar; los kits de tienda se configuran igual que un montaje casero: introduces lo que pone en la caja o la placa de la bomba.</p>';
  }

  const checklistRows = expertChecklistItems
    .map(
      (item) => `
    <label class="expert-item expert-item--compact">
      <input type="checkbox" ${checkedMap[item.id] ? 'checked' : ''} onchange="toggleExpertChecklistItem('${item.id}')">
      <span>
        <span class="expert-item-title">${item.title}</span>
        <span class="expert-item-text">${item.text}</span>
      </span>
    </label>
  `,
    )
    .join('');

  const weatherLabel = myGrow?.climate
    ? `<div class="alert info"><i class="ti ti-cloud"></i><p><strong>${escapeHomeHtml(myGrow.location || 'Ubicación')} (${escapeHomeHtml(myGrow.placement || 'interior')})</strong> · ${escapeHomeHtml(myGrow.climate.summary || 'Clima')} · ${escapeHomeHtml(myGrow.climate.temperature)}°C · HR ${escapeHomeHtml(myGrow.climate.humidity)}% · Viento ${escapeHomeHtml(myGrow.climate.wind)} km/h</p></div>`
    : '';

  const weatherAlerts = (() => {
    try {
      if (!myGrow || myGrow.placement !== 'exterior') return '';
      if (typeof buildExteriorHydroSolutions !== 'function') return '';
      const snap = myGrow.siteWeather;
      const plan = buildExteriorHydroSolutions(myGrow, snap);
      const risky = (plan.blocks || []).filter((b) => b.level === 'danger' || b.level === 'warn');
      if (!risky.length) return '';
      return risky
        .slice(0, 2)
        .map((b) => {
          const text = Array.isArray(b.actions) && b.actions.length ? b.actions[0] : b.title;
          return `<div class="alert ${b.level === 'danger' ? 'danger' : 'warn'}"><i class="ti ti-alert-triangle"></i><p><strong>${escapeHomeHtml(b.title)}</strong> · ${escapeHomeHtml(text)}</p></div>`;
        })
        .join('');
    } catch (e) {
      console.warn('Inicio: alertas de clima exterior omitidas.', e);
      return '';
    }
  })();

  let growAlertsHtml = '';
  try {
    if (hasGrow && typeof renderGrowAlertsCardHtml === 'function') {
      growAlertsHtml = renderGrowAlertsCardHtml(myGrow);
    }
  } catch (e) {
    console.warn('Inicio: tarjeta de alertas omitida.', e);
  }

  let inicioPriorityHtml = '';
  if (!hasGrow) {
    inicioPriorityHtml = `<section class="dash-priority-card" aria-labelledby="dash-priority-title">
      <h2 id="dash-priority-title" class="dash-priority-card__title">Primer paso</h2>
      <p class="dash-priority-card__lead">Indica instalación, variedad, nutriente y emplazamiento para activar <strong>Medir</strong>, <strong>Calendario</strong> e <strong>Historial</strong>.</p>
      <button type="button" class="btn btn-primary dash-priority-card__cta" onclick="navTo('cultivo')"><i class="ti ti-bucket" aria-hidden="true"></i> Configurar mi cultivo</button>
    </section>`;
  } else {
    const ms = Array.isArray(myGrow.measurements) ? myGrow.measurements : [];
    let lastIso = '';
    for (let i = ms.length - 1; i >= 0; i--) {
      if (ms[i] && ms[i].date) {
        lastIso = ms[i].date;
        break;
      }
    }
    const last = lastIso ? new Date(lastIso) : null;
    const daysSince = last ? (Date.now() - last.getTime()) / 86400000 : 999;
    const stale = !last || daysSince > 2;
    const hint = stale
      ? 'Llevas varios días sin lecturas nuevas: <strong>Medir</strong> sitúa pH/EC frente a la cepa y la fase.'
      : 'Si ajustaste solución, luz o clima, <strong>vuelve a Medir</strong> para ver el cambio en <strong>Historial</strong>.';
    const climaBtn =
      myGrow.placement === 'exterior'
        ? `<button type="button" class="btn btn-ghost" onclick="navTo('climatologia')"><i class="ti ti-cloud-storm" aria-hidden="true"></i> Climatología</button>`
        : '';
    inicioPriorityHtml = `<section class="dash-priority-card" aria-labelledby="dash-priority-title">
      <h2 id="dash-priority-title" class="dash-priority-card__title">Rutina recomendada</h2>
      <p class="dash-priority-card__lead">${hint}</p>
      <div class="dash-priority-card__row">
        <button type="button" class="btn btn-primary" onclick="navTo('monitor')"><i class="ti ti-droplet-half-2" aria-hidden="true"></i> Medir</button>
        <button type="button" class="btn btn-ghost" onclick="navTo('semanas')"><i class="ti ti-calendar-event" aria-hidden="true"></i> Calendario</button>
        ${climaBtn}
      </div>
    </section>`;
  }

  try {
    host.innerHTML = `
    <section class="dash-hero">
      <div class="dash-hero-bg"></div>
      <div class="dash-hero-inner">
        <p class="dash-eyebrow">Cannabis · Hidrocultivo</p>
        <h1 class="dash-headline">Hydro Cannabis</h1>
        <p class="dash-tagline">Guía para cultivar en hidroponía en casa: tú indicas tipo de cultivo hidropónico, variedad, nutriente y si está dentro o fuera; la app orienta recargas, valores razonables y qué vigilar según tus medidores, con el tiempo local cuando cultivas fuera. Puedes registrar cada medida y corrección sin liarte con tecnicismos.</p>
      </div>
    </section>

    <section class="dash-status-card">
      <div class="dash-status-icon"><i class="ti ti-plant"></i></div>
      <div>
        <div class="dash-status-label">${escapeHomeHtml(statusLabel)}</div>
        ${statusSublineHtml}
      </div>
    </section>

    ${inicioPriorityHtml}

    ${buildInicioFusionStatusHtml()}

    ${buildInicioHcOpsRowHtml()}

    <section class="dash-hc-strip" aria-labelledby="dash-hc-title">
      <h2 id="dash-hc-title" class="dash-hc-strip__title"><i class="ti ti-layout-dashboard" aria-hidden="true"></i> HidroCultivo (referencia)</h2>
      <p class="dash-hc-strip__lead">Mismas pantallas que HidroCultivo; el port nativo irá en este orden de valor (1→9). El <strong>Medir</strong> de cannabis sigue en la barra inferior.</p>
      <div class="dash-hc-grid">
        <button type="button" class="dash-hc-btn" onclick="navTo('riego')">1 Riego</button>
        <button type="button" class="dash-hc-btn" onclick="navToHcEmbed('meteo')">2 Meteo</button>
        <button type="button" class="dash-hc-btn" onclick="navToHcEmbed('calendario')">3 Cal.</button>
        <button type="button" class="dash-hc-btn" onclick="navToHcEmbed('sistema')">4 Sistema</button>
        <button type="button" class="dash-hc-btn" onclick="navToHcEmbed('inicio')">5 Inicio</button>
        <button type="button" class="dash-hc-btn" onclick="navToHcEmbed('historial')">6 Hist.</button>
      </div>
    </section>

    ${weatherLabel}
    ${buildInicioForecastWidgetHtml()}

    ${weatherAlerts}
    ${growAlertsHtml}

    <details class="dash-check-section">
      <summary class="dash-check-summary">
        <div class="dash-check-summary__grow">
          <div class="dash-check-summary__topline">
            <div>
              <h2 class="dash-section-title">Buenas prácticas</h2>
              <p class="dash-section-sub">Referencia rápida · ${done}/${total} revisados</p>
            </div>
            <i class="ti ti-chevron-down dash-check-chev" aria-hidden="true"></i>
          </div>
          <div class="dash-mini-bar dash-mini-bar--in-summary" style="--dash-pct:${pct}%"><span></span></div>
        </div>
      </summary>
      <div class="dash-check-section__toolbar">
        <button type="button" class="btn btn-ghost btn--tiny" onclick="resetExpertChecklist()">Reiniciar</button>
      </div>
      <div class="dash-check-section__body expert-checklist expert-checklist--inset">${checklistRows}</div>
    </details>

    <section class="inicio-system-reset" id="inicio-system-reset" aria-labelledby="inicio-reset-heading">
      <h2 id="inicio-reset-heading" class="inicio-system-reset__title">Zona sensible</h2>
      <p class="inicio-system-reset__text">Reinicia la app en este navegador como si fuera la primera vez (cultivo hidropónico, registros y checklist de inicio). El tema elegido en Apariencia se mantiene.</p>
      <button type="button" class="btn btn-ghost inicio-system-reset__btn" onclick="requestFullSystemReset()">
        <i class="ti ti-refresh" aria-hidden="true"></i> RESET SISTEMA
      </button>
    </section>
  `;
  } catch (e) {
    console.error('renderInicio', e);
    host.innerHTML = `
    <div class="card">
      <div class="card-header"><div class="card-title">Inicio</div></div>
      <p class="body-prose">No se pudo cargar la pantalla de inicio. Prueba a recargar (F5). Si abres la app desde archivo local, usa un servidor local (p. ej. Live Server) en lugar de <code>file://</code>.</p>
    </div>`;
  }
}

window.toggleExpertChecklistItem = toggleExpertChecklistItem;
window.resetExpertChecklist = resetExpertChecklist;
window.requestFullSystemReset = requestFullSystemReset;
window.goToInicio = goToInicio;
window.goToConfigChecklist = goToConfigChecklist;
window.goToVariedades = goToVariedades;
window.goToNutrientes = goToNutrientes;
window.goToMonitor = goToMonitor;
window.goToSemanas = goToSemanas;
window.goToHistorial = goToHistorial;
window.renderConsejosPage = renderConsejosPage;
