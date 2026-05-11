// Perfiles por tipo de sistema: gráficos, checklist y pistas de nutrientes.

const HYDRO_SYSTEM_PROFILES = {
  RDWC: {
    label: 'RDWC',
    solutionSubtitle: 'Circuito recirculante · una solución común',
    chartModes: [
      { id: 'solution', label: 'pH + EC (circuito)' },
      { id: 'thermal', label: 'EC + temperatura agua' },
      { id: 'climate', label: 'VPD + humedad' },
    ],
    checklistNotes: [
      'Vigilar depósito de control: ahí se toman pH/EC representativos del circuito.',
      'Recirculación estable: purga de aire y comprobación de fugas en válvulas.',
    ],
    nutrientModifier: 1,
    optimalHint: 'EC estable en todo el circuito; subidas bruscas afectan a todas las plantas.',
  },
  DWC: {
    label: 'DWC',
    solutionSubtitle: 'Depósito independiente por sitio',
    chartModes: [
      { id: 'solution', label: 'pH + EC por cubo' },
      { id: 'thermal', label: 'EC + temperatura agua' },
      { id: 'climate', label: 'VPD + humedad' },
    ],
    checklistNotes: [
      'Oxigenación 24/7 por cubo; caída de burbuja = riesgo de anoxia radicular.',
      'pH/EC pueden variar ligeramente entre cubos: registra por planta si ajustas por sitio.',
    ],
    nutrientModifier: 1,
    optimalHint: 'Cada cubo es un mini-ecosistema: anota qué planta muestra primero el desajuste.',
  },
  FLOAT: {
    label: 'Mesa flotante',
    solutionSubtitle: 'Balsa · volumen común · macetas flotantes',
    chartModes: [
      { id: 'solution', label: 'pH + EC (balsa)' },
      { id: 'thermal', label: 'EC + Tª agua (oxígeno)' },
      { id: 'climate', label: 'VPD + Tª aire' },
    ],
    checklistNotes: [
      'Gran volumen de agua: la mezcla tarda más en homogeneizarse; remueve antes de medir.',
      'Aireación de toda la balsa es crítica; superficie quietas = menos O₂ disuelto.',
    ],
    nutrientModifier: 0.95,
    optimalHint: 'Evita stagnación: el agua debe verse en movimiento o con burbujeo uniforme.',
  },
  NFT: {
    label: 'NFT',
    solutionSubtitle: 'Película en canal · depósito mezclado',
    chartModes: [
      { id: 'solution', label: 'pH + EC (depósito)' },
      { id: 'thermal', label: 'EC + Tª agua depósito' },
      { id: 'climate', label: 'VPD (copa)' },
    ],
    checklistNotes: [
      'Caudal y pendiente del canal: raíces no deben secarse entre pasadas de película.',
      'Depósito más pequeño: pH/EC pueden oscilar más — revisa con frecuencia en calor.',
    ],
    nutrientModifier: 0.92,
    optimalHint: 'En NFT suele funcionar EC ligeramente más conservadora que en DWC masivo.',
  },
  AERO: {
    label: 'Aeroponía',
    solutionSubtitle: 'Cámara de raíces · nebulización',
    chartModes: [
      { id: 'solution', label: 'pH + EC (reserva)' },
      { id: 'thermal', label: 'Tª agua + EC' },
      { id: 'climate', label: 'Humedad / VPD copa' },
    ],
    checklistNotes: [
      'Filtros y boquillas limpias; obstrucción = raíces secas en zonas de la cámara.',
      'Reserva: comprobar pH/EC varias veces al día en verano.',
    ],
    nutrientModifier: 0.9,
    optimalHint: 'Prioriza higiene y ciclos húmedo/seco del diseño; EC muy alta aumenta riesgo de quemadura radicular.',
  },
};

function getSystemProfile(system) {
  return HYDRO_SYSTEM_PROFILES[system] || HYDRO_SYSTEM_PROFILES.DWC;
}

/** Nombre visible del tipo de sistema (p. ej. «Depósito A»); si no hay etiqueta guardada, el del catálogo. */
function getResolvedSystemDisplayName(grow, systemCode) {
  const raw = systemCode || (grow && grow.system) || 'DWC';
  const code = HYDRO_SYSTEM_PROFILES[raw] ? raw : 'DWC';
  if (grow && typeof findInstallationById === 'function' && grow.activeInstallationId) {
    const inst = findInstallationById(grow.activeInstallationId);
    if (inst && inst.type === code) {
      const n = String(inst.name || '').trim();
      if (n) return n;
    }
  }
  const map = grow && grow.systemDisplayNames;
  if (map && typeof map === 'object') {
    const v = map[code];
    if (typeof v === 'string') {
      const t = v.trim();
      if (t) return t;
    }
  }
  const p = getSystemProfile(code);
  return (p && p.label) || code;
}

/** Instrumentación y complementos (checklist / Sistema). Legacy: null = todo disponible. */
function normalizeHardwareComplements(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      reservoirHeater: false,
      heaterThermostatC: null,
      meterPhEc: true,
      meterWaterTemp: true,
      meterThermoHygro: true,
      meterCo2: false,
      meterPpfd: false,
      enclosureType: 'cabinet',
      greenhouseReflectiveInterior: false,
      greenhouseAerationControl: false,
      greenhouseHumidityControl: false,
      greenhouseLedMode: 'none',
      greenhouseLedPowerW: null,
      enclosureVolumeM3: null,
    };
  }
  const heater = !!raw.reservoirHeater;
  const setC = parseFloat(raw.heaterThermostatC);
  const ledRaw = parseFloat(raw.greenhouseLedPowerW);
  const ev = parseFloat(raw.enclosureVolumeM3);
  const ledMode = ['none', 'full', 'veg_bloom', 'supplement'].includes(raw.greenhouseLedMode)
    ? raw.greenhouseLedMode
    : 'none';
  const enc = raw.enclosureType;
  const enclosureType = ['cabinet', 'greenhouse', 'open_room', 'outdoor'].includes(enc) ? enc : 'cabinet';
  return {
    reservoirHeater: heater,
    heaterThermostatC: heater && Number.isFinite(setC) ? Math.min(35, Math.max(15, setC)) : null,
    meterPhEc: raw.meterPhEc !== false,
    meterWaterTemp: raw.meterWaterTemp !== false,
    meterThermoHygro: raw.meterThermoHygro !== false,
    meterCo2: !!raw.meterCo2,
    meterPpfd: !!raw.meterPpfd,
    enclosureType,
    greenhouseReflectiveInterior: !!raw.greenhouseReflectiveInterior,
    greenhouseAerationControl: !!raw.greenhouseAerationControl,
    greenhouseHumidityControl: !!raw.greenhouseHumidityControl,
    greenhouseLedMode: ledMode,
    greenhouseLedPowerW: ledMode !== 'none' && Number.isFinite(ledRaw) ? Math.max(20, Math.min(3000, ledRaw)) : null,
    enclosureVolumeM3: Number.isFinite(ev) && ev >= 0.05 && ev <= 80 ? Math.round(ev * 1000) / 1000 : null,
  };
}

/** Modos de gráfico en Medir según instrumentos declarados. */
function getFilteredChartModes(grow) {
  const prof = getSystemProfile(grow?.system);
  const modes = prof.chartModes || [];
  const c = normalizeHardwareComplements(grow?.hardwareComplements);
  const out = [];
  if (c.meterPhEc) {
    const m = modes.find((x) => x.id === 'solution');
    if (m) out.push(m);
  }
  if (c.meterWaterTemp) {
    const m = modes.find((x) => x.id === 'thermal');
    if (m) out.push(m);
  }
  if (c.meterThermoHygro) {
    const m = modes.find((x) => x.id === 'climate');
    if (m) out.push(m);
  }
  return out.length ? out : modes;
}

/** Perfil físico del espacio (microclima): en exterior se asume outdoor; si no, lo guardado en complementos. */
function effectiveEnclosureType(grow, complements) {
  const c = complements || normalizeHardwareComplements(grow?.hardwareComplements);
  if (grow && grow.placement === 'exterior') return 'outdoor';
  if (['cabinet', 'greenhouse', 'open_room', 'outdoor'].includes(c.enclosureType)) return c.enclosureType;
  return 'cabinet';
}

/** Exterior o perfil «vivero al aire» → checklist de recinto cerrado no aplica. */
function isOpenAirGrowingContext(placement, enclosureType) {
  if (placement === 'exterior') return true;
  return enclosureType === 'outdoor';
}

/**
 * Qué instrumentación encaja con el contexto (evita CO₂ de recinto en aire libre, etc.).
 * @returns {{ openAir: boolean, meterCo2: boolean, meterCo2Hint: string, meterCo2OpenRoomHint: string, meterPpfdHint: string, meterThermoHygroHint: string, greenhouseToggles: boolean, greenhouseTogglesHint: string }}
 */
function getInstrumentPolicy(placement, enclosureType) {
  const enc = ['cabinet', 'greenhouse', 'open_room', 'outdoor'].includes(enclosureType) ? enclosureType : 'cabinet';
  const openAir = isOpenAirGrowingContext(placement, enc);
  return {
    openAir,
    meterCo2: !openAir,
    meterCo2Hint: openAir
      ? 'En exterior o vivero al aire el CO₂ es el del ambiente (~400 ppm); no es una variable de recinto cerrado.'
      : '',
    meterCo2OpenRoomHint:
      !openAir && enc === 'open_room'
        ? 'En estancias muy abiertas el ppm solo es útil si mides cerca del dosel y el espacio está razonablemente confinado o enriqueces CO₂.'
        : '',
    meterPpfdHint: openAir
      ? 'Útil para seguir DLI con el sol (nubes, sombra, orientación).'
      : enc === 'greenhouse'
        ? 'Muy útil con LED suplementario o para homogeneizar zonas con distinta PAR.'
        : 'Recomendado bajo LED para ajustar altura y fotoperiodo.',
    meterThermoHygroHint: openAir
      ? 'El microclima en copa o junto al follaje puede diferir mucho del tiempo «general». '
      : '',
    greenhouseToggles: !openAir,
    greenhouseTogglesHint: openAir
      ? 'Extractor forzado, interior reflectante o LED suplemento solo si el cultivo va en recinto cerrado o semi-cerrado; en aire libre no aplican.'
      : 'Marca solo lo que tengas: reflectante, extractor, humedad o LED suplemento son mejoras; en un armario pequeño no equivalen a “invernadero profesional”.',
  };
}

/** Limpia flags imposibles antes de normalizar (p. ej. CO₂ exterior). */
function sanitizeHardwareComplementsForContext(placement, enclosureType, raw) {
  const enc = ['cabinet', 'greenhouse', 'open_room', 'outdoor'].includes(enclosureType) ? enclosureType : 'cabinet';
  const pol = getInstrumentPolicy(placement, enc);
  const out = { ...raw, enclosureType: enc };
  if (!pol.meterCo2) out.meterCo2 = false;
  if (!pol.greenhouseToggles) {
    out.greenhouseReflectiveInterior = false;
    out.greenhouseAerationControl = false;
    out.greenhouseHumidityControl = false;
    out.greenhouseLedMode = 'none';
    out.greenhouseLedPowerW = null;
  }
  return out;
}

/** Listas breves de instrumentación mínima razonable (orientación doméstica). */
function getMinimumHydroInstrumentSnippets(placement) {
  if (placement === 'exterior') {
    return [
      'pH y EC del líquido (imprescindible en hidro)',
      'Temperatura del agua en calor',
      'Protección u oscurecimiento del depósito al sol directo',
      'Seguimiento del tiempo local (la app enlaza pronóstico en exterior)',
    ];
  }
  return [
    'pH y EC del líquido (pen o continuo)',
    'Temperatura del agua de nutriente',
    'Termohigrómetro junto al dosel (Tª y HR del aire)',
    'Renovación básica del aire del recinto (extractor modesto o ventilación efectiva)',
  ];
}

/** Bloque HTML (modo aprendizaje): cuándo encaja cada perfil de espacio y el equipo “extra”. */
function getLearningRecintoEquipmentNarrativeHtml() {
  return `<div class="learning-recinto-detail"><p class="body-prose body-prose--tight"><strong>Perfiles</strong>: «Armario o carpa sellada» es el caso habitual en casa. «Espacio amplio / macro-carpa» describe <strong>volúmenes grandes o carpa muy ventilada</strong> donde el microclima se parece más a un túnel o sala de cultivo — no obliga a invernadero de cristal ni a montaje “semi profesional” para triunfar en un armario pequeño.</p><p class="body-prose body-prose--tight">«Estancia amplia»: el aire se mezcla con la vivienda; CO₂ o control fino de HR solo compensan si el volumen útil alrededor del dosel está <em>razonablemente</em> acotado.</p><p class="body-prose body-prose--tight text-muted">CO₂, deshumidificador fijo o sensor PAR caro suelen rentar cuando ya llevas estable pH, EC y temperatura del líquido; antes, el coste por resultado suele ser alto.</p></div>`;
}

window.HYDRO_SYSTEM_PROFILES = HYDRO_SYSTEM_PROFILES;
window.getSystemProfile = getSystemProfile;
window.getResolvedSystemDisplayName = getResolvedSystemDisplayName;
window.normalizeHardwareComplements = normalizeHardwareComplements;
window.getFilteredChartModes = getFilteredChartModes;
window.effectiveEnclosureType = effectiveEnclosureType;
window.isOpenAirGrowingContext = isOpenAirGrowingContext;
window.getInstrumentPolicy = getInstrumentPolicy;
window.sanitizeHardwareComplementsForContext = sanitizeHardwareComplementsForContext;
window.getMinimumHydroInstrumentSnippets = getMinimumHydroInstrumentSnippets;
window.getLearningRecintoEquipmentNarrativeHtml = getLearningRecintoEquipmentNarrativeHtml;
