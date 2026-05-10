// Dimensionado hidráulico DWC / RDWC (orientativo, autoconsumo).
// Referencias de partida (literatura y guías de cultivo hidropónico):
// - DWC: regla habitual ~1 LPM de aire por galón US (~3,785 L) de solución por depósito (p. ej. guías tipo One Stop Grow Shop / YieldGrid).
// - RDWC: bomba de recirculación dimensionada para varios recambios del volumen total por hora; ejemplos de foros/cultivadores en rangos 200–1000+ GPH según número de cubos y volumen.
// Siempre verificar con el fabricante de la bomba y la altura manométrica real.

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

function readSystemHardwareFromOnboardingForm() {
  const sys = document.getElementById('onbSystem')?.value || 'RDWC';
  return {
    sites: parseInt(document.getElementById('onbSites')?.value, 10) || 4,
    volumePerSiteL: parseFloat(document.getElementById('onbVolumePerSite')?.value) || 20,
    controlReservoirL:
      sys === 'RDWC' ? parseFloat(document.getElementById('onbControlVol')?.value) || 0 : 0,
    airStoneType: document.getElementById('onbAirStone')?.value === 'fine' ? 'fine' : 'standard',
    airLineLengthM: parseFloat(document.getElementById('onbAirLineM')?.value) || 2,
    solutionTempC: parseFloat(document.getElementById('onbSolutionTemp')?.value),
    pipeMaterial: document.getElementById('onbPipeMaterial')?.value || 'pvc',
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
  appConfig.systemSizingResult = computeHydroSizing(appConfig.systemHardware, sys);
  saveAppConfig();
  renderInitialOnboarding();
}

function renderSystemSizingHtml(result) {
  if (!result || result.nft) {
    const hs = (result && result.hints) || [];
    const label = result?.systemType === 'AERO' ? 'Aeroponía' : 'NFT';
    return `
      <div class="sizing-result">
        <div class="alert info"><i class="ti ti-info-circle"></i><div><strong>${label}</strong><p>${result ? result.disclaimer : 'Selecciona sistema y pulsa «Calcular dimensionado».'}</p>${hs.length ? `<ul class="sizing-hint-list">${hs.map((h) => `<li>${h}</li>`).join('')}</ul>` : ''}</div></div>
      </div>`;
  }

  const wp = result.waterPump;
  const waterBlock = wp
    ? `<div class="sizing-block">
        <div class="sizing-label">Bomba de recirculación (RDWC)</div>
        <p>Objetivo ~<strong>${wp.lphTarget} L/h</strong> (~<strong>${wp.gphTarget} GPH</strong>), mínimo ~${wp.lphMin} L/h. Turnos referencia ~${wp.turnoversPerHour}/h del volumen total.</p>
      </div>`
    : `<div class="sizing-block"><div class="sizing-label">Bomba de agua</div><p>No aplica en DWC autónomo por cubos.</p></div>`;

  return `
    <div class="sizing-result">
      <div class="sizing-block">
        <div class="sizing-label">Oxigenación (aire)</div>
        <p>Bomba de aire recomendada: <strong>≥ ${result.airPumpLpmRecommended} L/min</strong> (mínimo prudente ~${result.airPumpLpmMinimum} L/min) para ${result.sites} depósito(s) de ${result.volumePerSiteL} L.</p>
      </div>
      ${waterBlock}
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
