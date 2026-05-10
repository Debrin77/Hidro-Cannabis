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
      greenhouseReflectiveInterior: false,
      greenhouseAerationControl: false,
      greenhouseHumidityControl: false,
      greenhouseLedMode: 'none',
      greenhouseLedPowerW: null,
    };
  }
  const heater = !!raw.reservoirHeater;
  const setC = parseFloat(raw.heaterThermostatC);
  const ledRaw = parseFloat(raw.greenhouseLedPowerW);
  const ledMode = ['none', 'full', 'veg_bloom', 'supplement'].includes(raw.greenhouseLedMode)
    ? raw.greenhouseLedMode
    : 'none';
  return {
    reservoirHeater: heater,
    heaterThermostatC: heater && Number.isFinite(setC) ? Math.min(35, Math.max(15, setC)) : null,
    meterPhEc: raw.meterPhEc !== false,
    meterWaterTemp: raw.meterWaterTemp !== false,
    meterThermoHygro: raw.meterThermoHygro !== false,
    meterCo2: !!raw.meterCo2,
    meterPpfd: !!raw.meterPpfd,
    greenhouseReflectiveInterior: !!raw.greenhouseReflectiveInterior,
    greenhouseAerationControl: !!raw.greenhouseAerationControl,
    greenhouseHumidityControl: !!raw.greenhouseHumidityControl,
    greenhouseLedMode: ledMode,
    greenhouseLedPowerW: ledMode !== 'none' && Number.isFinite(ledRaw) ? Math.max(20, Math.min(3000, ledRaw)) : null,
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

window.HYDRO_SYSTEM_PROFILES = HYDRO_SYSTEM_PROFILES;
window.getSystemProfile = getSystemProfile;
window.normalizeHardwareComplements = normalizeHardwareComplements;
window.getFilteredChartModes = getFilteredChartModes;
