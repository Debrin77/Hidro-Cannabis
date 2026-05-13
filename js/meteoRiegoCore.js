/**
 * Núcleo compartido Meteo + Riego (lógica adaptada de HidroCultivo / riego-calculo-helpers).
 * Sin DOM ni estado HC; sirve a Climatología (VPD horario) y a Riego nativo.
 */

/** VPD en kPa (Magnus–Tetens, mismo redondeo que HC). */
function hydroRiegoVPDkPa(tempC, rhPct) {
  const T = Math.max(-5, Math.min(50, Number(tempC) || 0));
  const rh = Math.max(5, Math.min(100, Number(rhPct) || 50));
  const es = 0.6108 * Math.exp((17.27 * T) / (T + 237.3));
  return Math.round(es * (1 - rh / 100) * 1000) / 1000;
}

/**
 * Demanda hídrica relativa (≈0.48–1.58) — misma filosofía que HC.
 */
function hydroRiegoIndiceDemanda(params) {
  const vpd = Math.max(0.08, Math.min(2.4, params.vpdKpa || 0.5));
  const viento = Math.max(0, params.vientoKmh || 0);
  const uv = Math.max(0, params.uvIdx || 0);
  const toldo = !!params.toldo;
  const probLluvia = Math.max(0, Math.min(100, params.probLluvia ?? 0));
  let d = 0.52 + vpd * 0.48;
  if (viento >= 10) d *= 1 + Math.min(0.22, (viento - 10) * 0.0055);
  if (!toldo && uv >= 3) d *= 1 + Math.min(0.14, (uv - 3) * 0.016);
  if (probLluvia >= 45) d *= 1 - 0.05 * ((probLluvia - 45) / 55);
  const et0 = params.et0DayMm;
  if (et0 != null && et0 > 0.05) {
    const r = et0 / 4.6;
    d *= Math.max(0.9, Math.min(1.14, 0.8 + 0.2 * Math.min(1.65, r)));
  }
  return Math.max(0.48, Math.min(1.58, d));
}

/** Kc FAO simplificado por % de ciclo y grupo (HC); cannabis ≈ grupo «frutos». */
function hydroRiegoKcDesdePctYGrupo(pct, grupo) {
  const g = grupo || 'lechugas';
  let k;
  if (pct < 0.12) k = 0.32 + (pct / 0.12) * (0.62 - 0.32);
  else if (pct < 0.35) k = 0.62 + ((pct - 0.12) / 0.23) * (0.95 - 0.62);
  else if (pct < 0.85) k = 0.95 + ((pct - 0.35) / 0.5) * (1.06 - 0.95);
  else k = 1.06 - Math.min(0.22, ((pct - 0.85) / 0.2) * 0.22);
  k = Math.max(0.3, Math.min(1.1, k));
  const mult = {
    lechugas: 1.0,
    hojas: 1.02,
    asiaticas: 0.98,
    hierbas: 0.84,
    frutos: 1.16,
    fresas: 1.06,
    raices: 0.76,
    microgreens: 0.64,
    otros: 0.94,
  };
  k *= mult[g] ?? 1;
  return Math.max(0.28, Math.min(1.32, k));
}

/** Sustrato tipo lana de roca / hidro medio (referencia HC onRef/minOFF/retención). */
function hydroDefaultRockwoolLikeSubstrate() {
  return { onRef: 4.5, minOFFRef: 11, retencion: 0.52 };
}

/**
 * Minutos ON/OFF por pulso (HC); interior: OFF mínimo 10 min como en HC.
 */
function hydroRiegoMinutosDesdeDemanda(demanda, nPlantas, kc, sustrato, esInterior) {
  const { onRef, minOFFRef, retencion } = sustrato;
  const k = Math.max(0.28, Math.min(1.35, kc));
  const carga = Math.max(0.35, Math.min(1.35, nPlantas / 15)) * k;
  const sPulso = 0.9 + retencion * 0.16;
  const raizDem = Math.sqrt(demanda);
  let minON = onRef * carga * sPulso * (0.78 + 0.38 * raizDem);
  let minOFF = minOFFRef * (1.48 - 0.48 * raizDem) * (0.88 + retencion * 0.2);
  if (esInterior) {
    minOFF *= 1.06;
    minON *= 0.94;
  }
  let offR = Math.max(5, Math.round(minOFF));
  const onR = Math.max(3, Math.round(minON));
  if (esInterior) offR = Math.max(10, offR);
  return { minON: onR, minOFF: offR };
}

/** Primeras `maxRows` filas horarias válidas con VPD (serie Open-Meteo). */
function hydroBuildHourlyVpdRows(hourly, maxRows) {
  if (!hourly || !Array.isArray(hourly.time)) return [];
  const t = hourly.time;
  const temp = hourly.temperature_2m;
  const rh = hourly.relative_humidity_2m;
  const lim = Math.min(maxRows || 24, t.length);
  const out = [];
  for (let i = 0; i < t.length && out.length < lim; i++) {
    const tc = Number(temp?.[i]);
    const rhp = Number(rh?.[i]);
    if (!Number.isFinite(tc) || !Number.isFinite(rhp)) continue;
    out.push({
      iso: t[i],
      t: tc,
      rh: rhp,
      vpd: hydroRiegoVPDkPa(tc, rhp),
    });
  }
  return out;
}

window.hydroRiegoVPDkPa = hydroRiegoVPDkPa;
window.hydroRiegoIndiceDemanda = hydroRiegoIndiceDemanda;
window.hydroRiegoKcDesdePctYGrupo = hydroRiegoKcDesdePctYGrupo;
window.hydroDefaultRockwoolLikeSubstrate = hydroDefaultRockwoolLikeSubstrate;
window.hydroRiegoMinutosDesdeDemanda = hydroRiegoMinutosDesdeDemanda;
window.hydroBuildHourlyVpdRows = hydroBuildHourlyVpdRows;
