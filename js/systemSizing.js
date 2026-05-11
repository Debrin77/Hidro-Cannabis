// Dimensionado hidráulico DWC / RDWC (orientativo, autoconsumo).
// Referencias de partida (literatura, extensiones y guías de cultivo hidropónico):
// - DWC: regla habitual ~1 LPM de aire por galón US (~3,785 L) por depósito (consenso en guías comerciales y foros de cultivo; p. ej. tablas tipo “air pump per gallon”).
// - RDWC: recirculación con varios recambios del volumen total por hora (rangos habituales citados 200–1000+ GPH según tamaño de circuito).
// - Contrasta siempre con la curva Q-H del fabricante (pérdidas por altura y codos reducen L/h y L/min reales).

const GAL_US_L = 3.78541;

/**
 * Ventilación del recinto (extractor), no confundir con bomba de aire del nutriente.
 * Si `userRoomM3` es un número entre 0,05 y 80, sustituye la heurística por sitios + litros de solución.
 */
function computeVentilationSizingHint(sites, totalSolutionL, userRoomM3) {
  const s = Math.min(48, Math.max(1, parseInt(sites, 10) || 1));
  const solutionLoadL = Number.isFinite(totalSolutionL) ? Math.max(1, totalSolutionL) : s * 20;
  const u = parseFloat(userRoomM3);
  let spaceM3;
  let usedUserSuppliedVolume = false;
  if (Number.isFinite(u) && u >= 0.05 && u <= 80) {
    spaceM3 = Math.min(80, Math.max(0.05, u));
    usedUserSuppliedVolume = true;
  } else {
    spaceM3 = Math.min(12, Math.max(0.35, s * 0.32 + solutionLoadL / 850));
  }
  const achComfort = 4;
  const achMin = 2.5;
  const m3hComfort = Math.round(spaceM3 * achComfort);
  const m3hMin = Math.round(spaceM3 * achMin);
  const cfmComfort = Math.round(m3hComfort * 0.588);
  const cfmMin = Math.round(m3hMin * 0.588);
  return {
    sitesUsed: s,
    solutionLoadL: Math.round(solutionLoadL),
    spaceAssumedM3: Math.round(spaceM3 * 1000) / 1000,
    usedUserSuppliedVolume,
    extractorM3hMin: m3hMin,
    extractorM3hComfort: m3hComfort,
    cfmMin,
    cfmComfort,
    hint: usedUserSuppliedVolume
      ? 'Usamos el volumen de recinto que indicaste. Si llevas filtro antiolor o conductos largos, el extractor real suele ir algo por encima del mínimo orientativo.'
      : 'Es una primera aproximación. El extractor adecuado depende del tamaño real de tu armario o carpa, del filtro y de la tubería; revisa siempre la ficha del equipo.',
  };
}

function peekEnclosureVolumeM3ForSizing(hardwareComplements) {
  if (typeof normalizeHardwareComplements !== 'function') return null;
  const v = normalizeHardwareComplements(hardwareComplements).enclosureVolumeM3;
  return Number.isFinite(v) ? v : null;
}

/** Recalcula solo la fila de ventilación cuando cambia el volumen del recinto (cultivo activo). */
function refreshVentilationInSizingResult(sizingResult, hardwareComplements) {
  if (!sizingResult) return sizingResult;
  const sitesNum = Number.isFinite(sizingResult.sites) ? sizingResult.sites : parseInt(sizingResult.sites, 10);
  const sites = Math.min(48, Math.max(1, Number.isFinite(sitesNum) ? sitesNum : 1));
  const totalL = Number.isFinite(sizingResult.totalSolutionL)
    ? sizingResult.totalSolutionL
    : sites * 20;
  const volM3 = peekEnclosureVolumeM3ForSizing(hardwareComplements);
  const ventilation = computeVentilationSizingHint(sites, totalL, volM3);
  return { ...sizingResult, ventilation };
}

function renderVentilationSizingHtml(vent) {
  if (!vent || !Number.isFinite(vent.extractorM3hComfort)) return '';
  const basis = vent.usedUserSuppliedVolume
    ? `los <strong>${vent.spaceAssumedM3} m³</strong> de recinto que indicaste`
    : `un tamaño orientativo del montaje (~${vent.sitesUsed} sitio(s), ~${vent.solutionLoadL} L de solución)`;
  const learning = typeof getUiExperienceMode === 'function' && getUiExperienceMode() === 'learning';
  const techExtra = learning
    ? `<p class="sizing-vent-tech">Equivalente aproximado: <strong>${vent.cfmMin}–${vent.cfmComfort} CFM</strong>. Referencia doméstica: del orden de <strong>2,5–4 renovaciones/hora</strong> del volumen de aire del recinto; invernaderos comerciales o climatización industrial se dimensionan con otros criterios (pérdidas de carga del filtro, curva Q–H del extractor).</p>`
    : '';
  return `<div class="sizing-block sizing-block--ventilation">
        <div class="sizing-label">Aire del cuarto (extractor)</div>
        <p>Para renovar el aire del <strong>espacio de cultivo</strong> (no del líquido), una referencia cómoda suele rondar <strong>${vent.extractorM3hMin}–${vent.extractorM3hComfort} m³/h</strong>, calculada a partir de ${basis}.</p>
        <p class="sizing-vent-hint">${vent.hint}</p>${techExtra}
      </div>`;
}

/**
 * @param {object} hw
 * @param {number} hw.sites
 * @param {number} hw.volumePerSiteL
 * @param {number} hw.controlReservoirL
 * @param {'standard'|'fine'} hw.airStoneType
 * @param {number} hw.airLineLengthM
 * @param {number} hw.solutionTempC
 * @param {'RDWC'|'DWC'|'NFT'|'FLOAT'|'AERO'} systemType
 * @param {object} [hardwareComplements] complementos del checklist (p. ej. volumen del recinto en m³ para el extractor)
 */
function computeHydroSizing(hw, systemType, hardwareComplements) {
  const roomVol = peekEnclosureVolumeM3ForSizing(hardwareComplements);
  const sites = Math.min(48, Math.max(1, parseInt(hw.sites, 10) || 1));
  const vSite = Math.min(200, Math.max(1, parseFloat(hw.volumePerSiteL) || 20));
  const vControl = Math.min(2000, Math.max(0, parseFloat(hw.controlReservoirL) || 0));
  const airStone = hw.airStoneType === 'fine' ? 'fine' : 'standard';
  const lineM = Math.min(30, Math.max(0, parseFloat(hw.airLineLengthM) || 0));
  const tempC = parseFloat(hw.solutionTempC);

  if (systemType === 'NFT') {
    const sitesNft = Math.min(48, Math.max(1, parseInt(hw.sites, 10) || 1));
    const vPerNft = Math.min(200, Math.max(1, parseFloat(hw.volumePerSiteL) || 20));
    const totalLNft = sitesNft * vPerNft;
    const ventilation = computeVentilationSizingHint(sitesNft, totalLNft, roomVol);
    return {
      systemType,
      nft: true,
      sites: sitesNft,
      totalSolutionL: Math.round(totalLNft),
      ventilation,
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
    const sitesAe = Math.min(48, Math.max(1, parseInt(hw.sites, 10) || 1));
    const vPerAe = Math.min(200, Math.max(1, parseFloat(hw.volumePerSiteL) || 15));
    const totalLAe = sitesAe * vPerAe;
    const ventilation = computeVentilationSizingHint(sitesAe, totalLAe, roomVol);
    return {
      systemType,
      nft: true,
      sites: sitesAe,
      totalSolutionL: Math.round(totalLAe),
      ventilation,
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

  const ventilation = computeVentilationSizingHint(sites, totalSolutionL, roomVol);

  return {
    systemType,
    sizingBasis: sizingSystem,
    sites,
    volumePerSiteL: vSite,
    controlReservoirL: vControl,
    totalSolutionL: Math.round(totalSolutionL),
    ventilation,
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
    geometryIssues: [],
    floatGeometrySummary: null,
  };
}

/**
 * Validación de geometría (tapas DWC, balsa, NFT depósito) + resumen flotante.
 * @param {object} hw
 * @param {string} systemType
 * @param {ReturnType<typeof computeHydroSizing>|null} sizingResult
 */
function validateHydroGeometry(hw, systemType, sizingResult) {
  const issues = [];
  const sites = sizingResult?.sites ?? Math.min(48, Math.max(1, parseInt(hw?.sites, 10) || 1));

  if (systemType === 'DWC') {
    const bucket = Math.min(120, Math.max(15, parseFloat(hw.dwcBucketTopDiameterCm) || 30));
    const hole = Math.min(50, Math.max(5, parseFloat(hw.dwcLidHoleDiameterCm) || 20));
    const margin = (bucket - hole) / 2;
    if (hole >= bucket) {
      issues.push({
        level: 'danger',
        title: 'Boca de cesta mayor que la tapa',
        text: `El agujero (${hole} cm) no puede ser ≥ diámetro útil de la tapa (${bucket} cm).`,
      });
    } else if (margin < 2) {
      issues.push({
        level: 'danger',
        title: 'Cantos de tapa muy finos (DWC)',
        text: `Con boca ${hole} cm y tapa ${bucket} cm queda ~${margin.toFixed(1)} cm de canto: riesgo de fisuras; usa tapa más ancha o broca menor (collar de cesta).`,
      });
    } else if (margin < 3.5) {
      issues.push({
        level: 'warn',
        title: 'Cantos de tapa ajustados',
        text: `~${margin.toFixed(1)} cm de canto: refuerza el perímetro o valora cubo de boca superior.`,
      });
    }
  }

  if (systemType === 'FLOAT') {
    const L = parseFloat(hw.floatTankLengthCm) || 0;
    const W = parseFloat(hw.floatTankWidthCm) || 0;
    const dHole = Math.min(40, Math.max(5, parseFloat(hw.floatRaftHoleDiameterCm) || 20));
    const cols = Math.ceil(Math.sqrt(sites));
    const rows = Math.ceil(sites / cols);
    const cell = dHole + 5;
    const needL = cols * cell + 8;
    const needW = rows * cell + 8;
    if (L > 0 && W > 0 && (needL > L || needW > W)) {
      issues.push({
        level: 'warn',
        title: 'Retícula de agujeros vs. recipiente',
        text: `Para ~${sites} huecos de Ø${dHole} cm (rejilla ~${cols}×${rows} y márgenes orientativos) se pide ~${needL.toFixed(0)}×${needW.toFixed(0)} cm en la balsa; tu recipiente útil es ${L}×${W} cm: menos sitios, recipiente mayor o redistribución más compacta (vigila cantos entre perforaciones).`,
      });
    }
    const basketD = parseFloat(hw.floatNetPotBelowRaftCm) || 8;
    const subst = parseFloat(hw.floatSubstrateColumnCm) || 5;
    const baseBelowRaft = Math.max(0, basketD - subst);
    if (baseBelowRaft > 14) {
      issues.push({
        level: 'info',
        title: 'Profundidad bajo la balsa',
        text: `La base del sustrato queda ~${baseBelowRaft.toFixed(1)} cm bajo la cara inferior de la balsa: comprueba que el nivel de solución mantenga capilaridad hasta el taco (suele bastar que la lámina llegue al borde inferior de la cesta).`,
      });
    }
  }

  if (systemType === 'NFT') {
    const vDep = parseFloat(hw.volumePerSiteL) || 20;
    if (vDep < 12) {
      issues.push({
        level: 'warn',
        title: 'Depósito de mezcla NFT pequeño',
        text: 'Volúmenes por debajo de ~12 L oscilan mucho en pH/EC con el calor; valora más capacidad o revisiones más frecuentes.',
      });
    }
  }

  const floatSummary =
    systemType === 'FLOAT'
      ? (() => {
          const basketD = parseFloat(hw.floatNetPotBelowRaftCm) || 8;
          const subst = parseFloat(hw.floatSubstrateColumnCm) || 5;
          const raftCm = (parseFloat(hw.floatRaftThicknessMm) || 30) / 10;
          const baseBelowRaft = Math.max(0, basketD - subst);
          return {
            substrateBelowRaftCm: Math.round(baseBelowRaft * 10) / 10,
            raftThicknessCm: Math.round(raftCm * 10) / 10,
            note:
              'Modelo simplificado: lámina de agua al ras de la cara inferior de la balsa. La base del sustrato queda a la profundidad indicada bajo esa cara; el agua debe alcanzar al menos el borde inferior de la cesta para capilaridad con coco/lana de roca.',
          };
        })()
      : null;

  return { issues, floatSummary };
}

function attachGeometryToSizingResult(result, hw, systemType) {
  if (!result) return null;
  const g = validateHydroGeometry(hw, systemType, result);
  result.geometryIssues = g.issues;
  result.floatGeometrySummary = g.floatSummary;
  return result;
}

function renderGeometrySizingHtml(result) {
  if (!result) return '';
  const issues = Array.isArray(result.geometryIssues) ? result.geometryIssues : [];
  const issueHtml = issues
    .map((i) => {
      const cls = i.level === 'danger' ? 'danger' : i.level === 'warn' ? 'warn' : 'info';
      return `<div class="alert ${cls} sizing-geom-issue"><i class="ti ti-ruler"></i><div><strong>${i.title}</strong><p>${i.text}</p></div></div>`;
    })
    .join('');
  const fs = result.floatGeometrySummary;
  const floatHtml = fs
    ? `<div class="sizing-block">
        <div class="sizing-label">Mesa flotante · lámina de agua y sustrato</div>
        <p>Profundidad orientativa <strong>base del sustrato</strong> bajo la cara inferior de la balsa: <strong>~${fs.substrateBelowRaftCm} cm</strong>. Espesor balsa (corcho / XPS): <strong>~${fs.raftThicknessCm} cm</strong>.</p>
        <p class="sizing-geom-note">${fs.note}</p>
      </div>`
    : '';
  if (!issueHtml && !floatHtml) return '';
  return `<div class="sizing-block sizing-block--geometry"><div class="sizing-label">Geometría y componentes</div>${issueHtml}${floatHtml}</div>`;
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
    rdwcDiagramStyle:
      sys === 'RDWC' && document.getElementById('onbRdwcDiagram')?.value === 'rear_kit'
        ? 'rear_kit'
        : 'side',
    dwcBucketTopDiameterCm: parseFloat(document.getElementById('onbDwcBucketTopCm')?.value) || 35,
    dwcLidHoleDiameterCm: parseFloat(document.getElementById('onbDwcLidHoleCm')?.value) || 20,
    floatTankLengthCm: parseFloat(document.getElementById('onbFloatTankL')?.value) || 120,
    floatTankWidthCm: parseFloat(document.getElementById('onbFloatTankW')?.value) || 80,
    floatRaftHoleDiameterCm: parseFloat(document.getElementById('onbFloatRaftHoleCm')?.value) || 20,
    floatRaftThicknessMm: parseFloat(document.getElementById('onbFloatRaftMm')?.value) || 30,
    floatNetPotBelowRaftCm: parseFloat(document.getElementById('onbFloatNetPotDepth')?.value) || 8,
    floatSubstrateColumnCm: parseFloat(document.getElementById('onbFloatSubstrateH')?.value) || 5,
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
  let complementsForVent = appConfig.hardwareComplements;
  if (typeof document !== 'undefined' && document.getElementById('onbEnclosureVolumeM3')) {
    const parseVol = typeof window.parseEnclosureVolumeM3Input === 'function' ? window.parseEnclosureVolumeM3Input : null;
    if (parseVol) {
      const v = parseVol('onbEnclosureVolumeM3');
      const base =
        typeof normalizeHardwareComplements === 'function'
          ? normalizeHardwareComplements(appConfig.hardwareComplements)
          : {};
      complementsForVent = { ...base, enclosureVolumeM3: v };
    }
  }
  const result = computeHydroSizing(appConfig.systemHardware, sys, complementsForVent);
  result.userPumpValidation = validateUserDeclaredPumps(appConfig.systemHardware, result);
  attachGeometryToSizingResult(result, appConfig.systemHardware, sys);
  appConfig.systemSizingResult = result;
  saveAppConfig();
  const mount = document.getElementById('systemSizingMount');
  if (mount && document.getElementById('onbEngineeringCard')) {
    mount.innerHTML = renderSystemSizingHtml(result);
  } else {
    renderInitialOnboarding();
  }
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
    const geomExtra = result ? renderGeometrySizingHtml(result) : '';
    const ventExtra = result?.ventilation ? renderVentilationSizingHtml(result.ventilation) : '';
    return `
      <div class="sizing-result">
        <div class="alert info"><i class="ti ti-info-circle"></i><div><strong>${label}</strong><p>${result ? result.disclaimer : 'Selecciona el tipo de cultivo hidropónico y pulsa «Calcular dimensionado».'}</p>${hs.length ? `<ul class="sizing-hint-list">${hs.map((h) => `<li>${h}</li>`).join('')}</ul>` : ''}</div></div>
        ${ventExtra}
        ${geomExtra}
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
  const geomHtml = renderGeometrySizingHtml(result);
  const ventHtml = result.ventilation ? renderVentilationSizingHtml(result.ventilation) : '';

  return `
    <div class="sizing-result">
      <div class="sizing-block">
        <div class="sizing-label">Oxigenación (aire)</div>
        <p>Bomba de aire recomendada: <strong>≥ ${result.airPumpLpmRecommended} L/min</strong> (mínimo prudente ~${result.airPumpLpmMinimum} L/min) para ${result.sites} depósito(s) de ${result.volumePerSiteL} L.</p>
      </div>
      ${waterBlock}
      ${ventHtml}
      ${geomHtml}
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
window.computeVentilationSizingHint = computeVentilationSizingHint;
window.peekEnclosureVolumeM3ForSizing = peekEnclosureVolumeM3ForSizing;
window.refreshVentilationInSizingResult = refreshVentilationInSizingResult;
window.runSystemSizingCalculation = runSystemSizingCalculation;
window.snapshotSystemHardwareToAppConfig = snapshotSystemHardwareToAppConfig;
window.validateUserDeclaredPumps = validateUserDeclaredPumps;
window.applyOnboardingPumpSuggestion = applyOnboardingPumpSuggestion;
window.attachGeometryToSizingResult = attachGeometryToSizingResult;
window.validateHydroGeometry = validateHydroGeometry;
