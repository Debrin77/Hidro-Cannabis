// Dimensionado hidráulico DWC / RDWC (orientativo, autoconsumo).
// Referencias de partida (literatura, extensiones y guías de cultivo hidropónico):
// - DWC: regla habitual ~1 LPM de aire por galón US (~3,785 L) por depósito (consenso en guías comerciales y foros de cultivo; p. ej. tablas tipo “air pump per gallon”).
// - RDWC: recirculación con varios recambios del volumen total por hora (rangos habituales citados 200–1000+ GPH según tamaño de circuito).
// - Contrasta siempre con la curva Q-H del fabricante (pérdidas por altura y codos reducen L/h y L/min reales).

const GAL_US_L = 3.78541;

/**
 * @param {object} hw
 * @param {number} hw.sites
 * @param {number} hw.volumePerSiteL
 * @param {number} hw.controlReservoirL
 * @param {'standard'|'fine'} hw.airStoneType
 * @param {number} hw.airLineLengthM
 * @param {number} hw.solutionTempC
 * @param {'RDWC'|'DWC'|'NFT'|'FLOAT'|'AERO'} systemType
 */
function computeHydroSizing(hw, systemType) {
  const sites = Math.min(48, Math.max(1, parseInt(hw.sites, 10) || 1));
  const vSite = Math.min(200, Math.max(1, parseFloat(hw.volumePerSiteL) || 20));
  const vControl = Math.min(2000, Math.max(0, parseFloat(hw.controlReservoirL) || 0));
  const airStone = hw.airStoneType === 'fine' ? 'fine' : 'standard';
  const lineM = Math.min(30, Math.max(0, parseFloat(hw.airLineLengthM) || 0));
  const tempC = parseFloat(hw.solutionTempC);

  if (systemType === 'NFT') {
    return {
      systemType,
      nft: true,
      hints: [
        'NFT: pendiente de canal 1–3 %, película de nutriente continua. Caudal típico por canal ~1–2 L/min (depende del ancho y longitud).',
        'Comprueba que las raíces no sechen entre pulsos; en verano aumenta caudal o oscurece el depósito.',
        'Material: canaletas alimentarias o PVC perforado; bomba sumergible con filtro; depósito con tapa y oscurecido.',
      ],
      disclaimer:
        'El dimensionado fino de NFT depende del diseño del canal. Usa manual del fabricante o calculadora de caudal por longitud.',
    };
  }

  if (systemType === 'AERO') {
    return {
      systemType,
      nft: true,
      hints: [
        'Aeroponía: raíces en cámara oscura con nebulización o fumigación fina. Cannabis es viable con kits maduros y buena higiene.',
        'Riesgo principal: boquillas obstruidas y exceso de humedad en raíz — filtrado fino, limpiezas y ciclos húmedo/seco según diseño.',
        'pH/EC en reserva mezclada: revisa frecuencia alta; temperatura del líquido y de la cámara afecta al desarrollo radicular.',
      ],
      disclaimer:
        'El dimensionado depende de presión, nº de boquillas y volumen de cámara. Sigue la guía del fabricante del kit aeropónico.',
    };
  }

  const sizingSystem = systemType === 'FLOAT' ? 'DWC' : systemType;

  const galPerBucket = vSite / GAL_US_L;
  let lpmPerSite = galPerBucket;
  if (airStone === 'fine') lpmPerSite *= 0.9;

  let tempFactor = 1;
  if (Number.isFinite(tempC)) {
    if (tempC >= 28) tempFactor = 1.5;
    else if (tempC >= 26) tempFactor = 1.25;
    else if (tempC >= 22) tempFactor = 1.1;
  }

  let lineFactor = 1 + Math.max(0, lineM - 2) * 0.04;

  let airForSites = sites * lpmPerSite * tempFactor * lineFactor;
  let airControl = 0;
  if (sizingSystem === 'RDWC' && vControl > 0) {
    airControl = (vControl / GAL_US_L) * (airStone === 'fine' ? 0.9 : 1) * tempFactor * lineFactor;
  }

  const airRecommended = airForSites + airControl;
  const airMinimum = airForSites * 0.85 + airControl * 0.85;

  const totalSolutionL =
    sizingSystem === 'RDWC' ? sites * vSite + vControl : sites * vSite;

  let waterPump = null;
  if (sizingSystem === 'RDWC') {
    const turnoversPerHour = sites <= 4 ? 4 : sites <= 8 ? 3.5 : 3;
    const lhTarget = totalSolutionL * turnoversPerHour;
    const lhMin = totalSolutionL * 2.5;
    waterPump = {
      lphTarget: Math.round(lhTarget),
      lphMin: Math.round(lhMin),
      gphTarget: Math.round(lhTarget / GAL_US_L),
      gphMin: Math.round(lhMin / GAL_US_L),
      turnoversPerHour,
    };
  }

  const mainPipeMm =
    sizingSystem === 'RDWC' && waterPump
      ? waterPump.gphTarget > 400
        ? '32–40 mm (1¼") o equivalente'
        : '25 mm (1") / 20–25 mm según accesorios'
      : 'N/A recirculación (DWC independiente)';

  const hints = [];
  hints.push(
    `Volumen útil de solución estimado: ~${Math.round(totalSolutionL)} L (${sites} sitio(s) × ${vSite} L${
      sizingSystem === 'RDWC' && vControl > 0 ? ` + ${vControl} L depósito control` : ''
    }).`,
  );
  hints.push(
    `Piedras / difusores: uno por cubo + movimiento de superficie; en caliente sube la demanda de O₂ (factor temperatura ya aplicado si indicaste °C).`,
  );
  hints.push(
    `Manguera de aire: recortes cortos y distribuidor; si superas ~2 m por rama, compensa con bomba mayor (factor línea ~${lineFactor.toFixed(2)}).`,
  );
  if (sizingSystem === 'RDWC' && waterPump) {
    hints.push(
      `Bomba de agua (recirculación): apunta a ~${waterPump.lphTarget} L/h (~${waterPump.gphTarget} GPH) como referencia cómoda; mínimo razonable ~${waterPump.lphMin} L/h. Comprueba altura de elevación (cabeza) en la curva del fabricante.`,
    );
    hints.push(
      'Tubería retorno y mandante: evita codos innecesarios; purga de aire en el circuito maestro si procede.',
    );
  } else {
    hints.push(
      systemType === 'FLOAT'
        ? 'Mesa flotante / balsa DWC: la solución es común; oxigenación por aireación de todo el volumen y raíces sumergidas en balsa. Válido para cannabis con control de luz, pH/EC y temperatura de agua.'
        : 'DWC: no necesitas bomba de nutriente entre cubos si cada uno es autónomo; la clave es aireación suficiente por cubo.',
    );
  }
  if (Number.isFinite(tempC) && tempC > 24) {
    hints.push('Agua >24 °C: considera chiller, botellas congeladas o bajar temperatura ambiente; el O₂ disuelto cae rápido.');
  }

  return {
    systemType,
    sizingBasis: sizingSystem,
    sites,
    volumePerSiteL: vSite,
    controlReservoirL: vControl,
    totalSolutionL: Math.round(totalSolutionL),
    airPumpLpmMinimum: Math.round(airMinimum * 10) / 10,
    airPumpLpmRecommended: Math.round(airRecommended * 10) / 10,
    waterPump,
    mainPipeHint: mainPipeMm,
    materialHints: [
      'Depósitos: PP/PE alimentario oscurecido; evita translúcidos sin pintar.',
      'Conexiones: PVC presión o PP con juntas compatibles con pH ácido; revisa fugas bajo succión en la bomba.',
    ],
    hints,
    disclaimer:
      'Valores orientativos para autoconsumo. Ajusta según altura manométrica, pérdidas de carga, número de válvulas y calidad real de las piedras.',
  };
}

/**
 * Contrasta caudales declarados por el usuario con el dimensionado (guías tipo ~1 LPM/gal US en DWC y recirculación RDWC).
 * @param {object} hw hardware + userAirLpm, userWaterLph, buildType
 * @param {ReturnType<typeof computeHydroSizing>} sizingResult
 */
function validateUserDeclaredPumps(hw, sizingResult) {
  const buildType = hw.buildType === 'commercial' ? 'commercial' : 'diy';
  const out = { buildType, issues: [], commercialNote: null };

  if (!sizingResult || sizingResult.nft) {
    out.commercialNote =
      buildType === 'commercial'
        ? 'NFT / aeroponía comercial: sigue el manual del kit (caudal de película o presión de niebla). El dimensionado fino depende del fabricante.'
        : null;
    return out;
  }

  const minAir = sizingResult.airPumpLpmMinimum;
  const recAir = sizingResult.airPumpLpmRecommended;
  const userAir = parseFloat(hw.userAirLpm);

  if (buildType === 'commercial' && !Number.isFinite(userAir)) {
    out.commercialNote =
      'Kit comercial: los fabricantes suelen dimensionar bomba y aireador de forma coherente con el volumen. Revisa la ficha técnica. Si quieres que la app contraste cifras, elige «Montaje propio / DIY» e introduce el caudal nominal de la placa (L/min y L/h).';
  }

  if (Number.isFinite(userAir)) {
    if (userAir < minAir * 0.92) {
      out.issues.push({
        level: 'danger',
        key: 'air-low',
        title: 'Bomba de aire por debajo del rango orientativo',
        text: `Indicas ${userAir} L/min; con tu montaje el mínimo prudente es ~${minAir} L/min y el objetivo cómodo ≥${recAir} L/min (base habitual ~1 L/min por galón US por depósito, con ajustes por temperatura y manguera).`,
        suggestMin: Math.round(minAir * 10) / 10,
        suggestTarget: Math.round(recAir * 10) / 10,
        unit: 'L/min',
      });
    } else if (userAir < recAir * 0.96) {
      out.issues.push({
        level: 'warn',
        key: 'air-borderline',
        title: 'Aireación algo justa',
        text: `~${userAir} L/min queda por debajo del objetivo ~${recAir} L/min. Puede valer con agua fría y buenos difusores; en calor sube el riesgo de anoxia.`,
        suggestMin: Math.round(minAir * 10) / 10,
        suggestTarget: Math.round(recAir * 10) / 10,
        unit: 'L/min',
      });
    }
  } else if (buildType === 'diy') {
    out.issues.push({
      level: 'info',
      key: 'air-missing',
      title: 'Montaje propio: añade el caudal de tu aireador',
      text: `Introduce los L/min nominales de la bomba de aire (placa del equipo) y vuelve a calcular. Referencia para tu volumen: mínimo ~${minAir} L/min, recomendado ≥${recAir} L/min.`,
      suggestMin: Math.round(minAir * 10) / 10,
      suggestTarget: Math.round(recAir * 10) / 10,
      unit: 'L/min',
    });
  }

  const wp = sizingResult.waterPump;
  const userWat = parseFloat(hw.userWaterLph);
  if (wp && sizingResult.sizingBasis === 'RDWC') {
    if (Number.isFinite(userWat)) {
      if (userWat < wp.lphMin * 0.88) {
        out.issues.push({
          level: 'danger',
          key: 'water-low',
          title: 'Recirculación RDWC baja',
          text: `Indicas ${userWat} L/h; el mínimo razonable calculado es ~${wp.lphMin} L/h y el objetivo cómodo ~${wp.lphTarget} L/h (~${wp.turnoversPerHour} vuelcos/h del volumen total).`,
          suggestMin: wp.lphMin,
          suggestTarget: wp.lphTarget,
          unit: 'L/h',
        });
      } else if (userWat < wp.lphTarget * 0.9) {
        out.issues.push({
          level: 'warn',
          key: 'water-borderline',
          title: 'Caudal de recirculación ajustado',
          text: `${userWat} L/h puede quedarse corto con codos y tubería larga; valor de trabajo cómodo ~${wp.lphTarget} L/h.`,
          suggestMin: wp.lphMin,
          suggestTarget: wp.lphTarget,
          unit: 'L/h',
        });
      }
    } else if (buildType === 'diy') {
      out.issues.push({
        level: 'info',
        key: 'water-missing',
        title: 'RDWC DIY: añade L/h de la bomba de recirculación',
        text: `Introduce el caudal nominal (L/h a poca altura). Referencia: mínimo ~${wp.lphMin} L/h, objetivo ~${wp.lphTarget} L/h.`,
        suggestMin: wp.lphMin,
        suggestTarget: wp.lphTarget,
        unit: 'L/h',
      });
    }
  }

  return out;
}

function readSystemHardwareFromOnboardingForm() {
  const sys = document.getElementById('onbSystem')?.value || 'RDWC';
  const airRaw = document.getElementById('onbUserAirLpm')?.value;
  const watRaw = document.getElementById('onbUserWaterLph')?.value;
  const userAirLpm = airRaw != null && String(airRaw).trim() !== '' ? parseFloat(String(airRaw).replace(',', '.')) : NaN;
  const userWaterLph = watRaw != null && String(watRaw).trim() !== '' ? parseFloat(String(watRaw).replace(',', '.')) : NaN;
  return {
    sites: parseInt(document.getElementById('onbSites')?.value, 10) || 4,
    volumePerSiteL: parseFloat(document.getElementById('onbVolumePerSite')?.value) || 20,
    controlReservoirL:
      sys === 'RDWC' ? parseFloat(document.getElementById('onbControlVol')?.value) || 0 : 0,
    airStoneType: document.getElementById('onbAirStone')?.value === 'fine' ? 'fine' : 'standard',
    airLineLengthM: parseFloat(document.getElementById('onbAirLineM')?.value) || 2,
    solutionTempC: parseFloat(document.getElementById('onbSolutionTemp')?.value),
    pipeMaterial: document.getElementById('onbPipeMaterial')?.value || 'pvc',
    buildType: document.getElementById('onbBuildType')?.value === 'commercial' ? 'commercial' : 'diy',
    userAirLpm: Number.isFinite(userAirLpm) ? userAirLpm : undefined,
    userWaterLph: Number.isFinite(userWaterLph) ? userWaterLph : undefined,
  };
}

function snapshotSystemHardwareToAppConfig() {
  if (!appConfig) appConfig = {};
  appConfig.systemHardware = readSystemHardwareFromOnboardingForm();
  appConfig.system = document.getElementById('onbSystem')?.value || appConfig.system || 'RDWC';
}

function runSystemSizingCalculation() {
  if (!appConfig) appConfig = {};
  snapshotSystemHardwareToAppConfig();
  const sys = appConfig.system;
  const result = computeHydroSizing(appConfig.systemHardware, sys);
  result.userPumpValidation = validateUserDeclaredPumps(appConfig.systemHardware, result);
  appConfig.systemSizingResult = result;
  saveAppConfig();
  renderInitialOnboarding();
}

function renderUserPumpValidationHtml(validation, sizingResult) {
  if (!validation) return '';
  let html = '';
  if (validation.commercialNote) {
    html += `<div class="alert info sizing-user-pump-note"><i class="ti ti-building-store"></i><p>${validation.commercialNote}</p></div>`;
  }
  const order = { danger: 0, warn: 1, info: 2 };
  const issues = [...(validation.issues || [])].sort((a, b) => (order[a.level] ?? 3) - (order[b.level] ?? 3));
  for (const iss of issues) {
    const cls = iss.level === 'danger' ? 'danger' : iss.level === 'warn' ? 'warn' : 'info';
    const sug =
      iss.suggestTarget != null
        ? `<p class="sizing-suggest"><strong>Rango orientativo:</strong> ${iss.suggestMin}–${iss.suggestTarget} ${iss.unit || ''} (nominal de placa; confirma curva del fabricante a tu altura real).</p>
          <button type="button" class="btn btn-ghost btn--compact sizing-apply-btn" onclick="applyOnboardingPumpSuggestion('${iss.key}')">Usar ${iss.suggestTarget} ${iss.unit || ''}</button>`
        : '';
    html += `<div class="alert ${cls} sizing-user-pump-issue"><i class="ti ti-gauge"></i><div><strong>${iss.title}</strong><p>${iss.text}</p>${sug}</div></div>`;
  }
  if (!validation.commercialNote && !issues.length && sizingResult && !sizingResult.nft) {
    html += `<div class="alert info sizing-user-pump-note"><i class="ti ti-check"></i><p>Caudales declarados coherentes con el dimensionado (o sin datos que contrastar). Ajusta si la altura manométrica real reduce el caudal efectivo.</p></div>`;
  }
  return html;
}

function applyOnboardingPumpSuggestion(key) {
  const r = appConfig?.systemSizingResult;
  const v = r?.userPumpValidation;
  if (!v || !Array.isArray(v.issues)) return;
  const iss = v.issues.find((x) => x.key === key);
  if (!iss || iss.suggestTarget == null) return;
  if (key === 'air-low' || key === 'air-borderline' || key === 'air-missing') {
    const el = document.getElementById('onbUserAirLpm');
    if (el) el.value = iss.suggestTarget;
  }
  if (key === 'water-low' || key === 'water-borderline' || key === 'water-missing') {
    const el = document.getElementById('onbUserWaterLph');
    if (el) el.value = iss.suggestTarget;
  }
  runSystemSizingCalculation();
}

function renderSystemSizingHtml(result) {
  if (!result || result.nft) {
    const hs = (result && result.hints) || [];
    const label = result?.systemType === 'AERO' ? 'Aeroponía' : 'NFT';
    const uv =
      result && !result.userPumpValidation && typeof appConfig !== 'undefined' && appConfig?.systemHardware
        ? validateUserDeclaredPumps(appConfig.systemHardware, result)
        : result?.userPumpValidation;
    const pumpExtra = uv ? renderUserPumpValidationHtml(uv, result) : '';
    return `
      <div class="sizing-result">
        <div class="alert info"><i class="ti ti-info-circle"></i><div><strong>${label}</strong><p>${result ? result.disclaimer : 'Selecciona sistema y pulsa «Calcular dimensionado».'}</p>${hs.length ? `<ul class="sizing-hint-list">${hs.map((h) => `<li>${h}</li>`).join('')}</ul>` : ''}</div></div>
        ${pumpExtra ? `<div class="sizing-block sizing-block--validation"><div class="sizing-label">Equipo declarado</div>${pumpExtra}</div>` : ''}
      </div>`;
  }

  const wp = result.waterPump;
  const waterBlock = wp
    ? `<div class="sizing-block">
        <div class="sizing-label">Bomba de recirculación (RDWC)</div>
        <p>Objetivo ~<strong>${wp.lphTarget} L/h</strong> (~<strong>${wp.gphTarget} GPH</strong>), mínimo ~${wp.lphMin} L/h. Turnos referencia ~${wp.turnoversPerHour}/h del volumen total.</p>
      </div>`
    : `<div class="sizing-block"><div class="sizing-label">Bomba de agua</div><p>No aplica en DWC autónomo por cubos.</p></div>`;

  const uvMerged =
    result.userPumpValidation ||
    (typeof appConfig !== 'undefined' && appConfig?.systemHardware
      ? validateUserDeclaredPumps(appConfig.systemHardware, result)
      : null);
  const pumpValHtml = renderUserPumpValidationHtml(uvMerged, result);

  return `
    <div class="sizing-result">
      <div class="sizing-block">
        <div class="sizing-label">Oxigenación (aire)</div>
        <p>Bomba de aire recomendada: <strong>≥ ${result.airPumpLpmRecommended} L/min</strong> (mínimo prudente ~${result.airPumpLpmMinimum} L/min) para ${result.sites} depósito(s) de ${result.volumePerSiteL} L.</p>
      </div>
      ${waterBlock}
      ${pumpValHtml ? `<div class="sizing-block sizing-block--validation"><div class="sizing-label">Contraste con tu equipo (DIY / kit)</div>${pumpValHtml}</div>` : ''}
      <div class="sizing-block">
        <div class="sizing-label">Tubería principal (orientativo)</div>
        <p>${result.mainPipeHint}</p>
      </div>
      <div class="sizing-block">
        <div class="sizing-label">Materiales y montaje</div>
        <ul class="sizing-hint-list">${result.materialHints.map((m) => `<li>${m}</li>`).join('')}</ul>
      </div>
      <div class="sizing-block">
        <div class="sizing-label">Checklist técnico</div>
        <ul class="sizing-hint-list">${result.hints.map((h) => `<li>${h}</li>`).join('')}</ul>
      </div>
      <p class="sizing-disclaimer">${result.disclaimer}</p>
    </div>`;
}

window.computeHydroSizing = computeHydroSizing;
window.runSystemSizingCalculation = runSystemSizingCalculation;
window.snapshotSystemHardwareToAppConfig = snapshotSystemHardwareToAppConfig;
window.validateUserDeclaredPumps = validateUserDeclaredPumps;
window.applyOnboardingPumpSuggestion = applyOnboardingPumpSuggestion;
