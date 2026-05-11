// Objetivos por variedad + fase y planes de corrección orientativos.

function parsePhRangeStr(str) {
  if (!str || typeof str !== 'string') return { min: 5.8, max: 6.2 };
  const norm = str.replace(/–|−/g, '-').replace(/\s/g, '');
  const m = norm.match(/(\d+\.?\d*)-(\d+\.?\d*)/);
  if (m) {
    const a = parseFloat(m[1]);
    const b = parseFloat(m[2]);
    return { min: Math.min(a, b), max: Math.max(a, b) };
  }
  const single = parseFloat(norm);
  if (Number.isFinite(single)) return { min: single - 0.25, max: single + 0.25 };
  return { min: 5.8, max: 6.2 };
}

function getStrainRules(strain) {
  return strain.cultivarRules || {};
}

/** Objetivos numéricos para validación (combina fase + límites de la cepa). */
function getStrainTargetsForWeek(strain, weekNum, phaseRef) {
  const rules = getStrainRules(strain);
  let phRange = { min: phaseRef.phMin, max: phaseRef.phMax };
  if (weekNum <= strain.vegW) {
    const p = parsePhRangeStr(strain.ph);
    phRange = {
      min: Math.max(phaseRef.phMin, p.min),
      max: Math.min(phaseRef.phMax, p.max),
    };
  } else {
    const p = parsePhRangeStr(strain.phFlower);
    phRange = {
      min: Math.max(phaseRef.phMin, p.min),
      max: Math.min(phaseRef.phMax, p.max),
    };
  }
  if (!Number.isFinite(phRange.min) || !Number.isFinite(phRange.max) || phRange.min > phRange.max) {
    phRange = { min: phaseRef.phMin, max: phaseRef.phMax };
  }

  let ecMin = phaseRef.ecMin;
  let ecMax = phaseRef.ecMax;
  if (Number.isFinite(rules.ecHardCap)) ecMax = Math.min(ecMax, rules.ecHardCap);
  if (Number.isFinite(rules.ecVegSoftCap) && weekNum <= strain.vegW) {
    ecMax = Math.min(ecMax, rules.ecVegSoftCap);
  }
  ecMax = Math.min(ecMax, strain.ecPeak + 0.15);

  const tw = Number.isFinite(strain.tempWater) ? strain.tempWater : 19;
  const waterMin = Number.isFinite(rules.waterTempMin) ? rules.waterTempMin : tw - 1;
  const waterMax = Number.isFinite(rules.waterTempMax) ? rules.waterTempMax : tw + 2.5;

  return {
    phMin: phRange.min,
    phMax: phRange.max,
    ecMin,
    ecMax,
    waterTempMin: waterMin,
    waterTempMax: waterMax,
    airTempMin: Number.isFinite(phaseRef.airTempMin) ? phaseRef.airTempMin : null,
    airTempMax: Number.isFinite(phaseRef.airTempMax) ? phaseRef.airTempMax : null,
    nightAirMinC: rules.nightAirMinC != null ? rules.nightAirMinC : null,
    flowerRHMax: rules.flowerRHMax != null ? rules.flowerRHMax : phaseRef.humidityMax,
    vpdMin: phaseRef.vpdMin,
    vpdMax: phaseRef.vpdMax,
    co2Min: phaseRef.co2Min,
    co2Max: phaseRef.co2Max,
    ppfdMin: phaseRef.ppfdMin,
    ppfdMax: phaseRef.ppfdMax,
  };
}

function estimateDilutionLitersRO(currentEc, targetEc, volumeL) {
  if (!Number.isFinite(currentEc) || !Number.isFinite(targetEc) || !Number.isFinite(volumeL) || volumeL <= 0)
    return null;
  if (currentEc <= targetEc + 0.02) return 0;
  const factor = currentEc / targetEc;
  if (factor <= 1) return 0;
  const add = volumeL * (factor - 1);
  return Math.round(add * 10) / 10;
}

function estimateConcentrateBumpPercent(currentEc, targetEc) {
  if (!Number.isFinite(currentEc) || !Number.isFinite(targetEc) || currentEc <= 0) return null;
  if (currentEc >= targetEc - 0.03) return 0;
  const pct = ((targetEc - currentEc) / currentEc) * 100;
  return Math.min(80, Math.round(pct * 10) / 10);
}

/**
 * Plan de corrección accionable (orientativo, no sustituye medición tras ajuste).
 */
function buildStrainCorrectionPlan(reading, strain, weekNum, phaseRef, grow) {
  const targets = getStrainTargetsForWeek(strain, weekNum, phaseRef);
  const vol = Number.isFinite(reading.volume) ? reading.volume : grow?.reservoirL;
  const steps = [];

  if (Number.isFinite(reading.ph)) {
    if (reading.ph < targets.phMin - 0.05) {
      const tgt = ((targets.phMin + targets.phMax) / 2).toFixed(2);
      steps.push({
        key: 'ph-low',
        title: 'pH bajo para esta cepa',
        detail: `Medido ${reading.ph.toFixed(2)} · objetivo cepa ~${targets.phMin.toFixed(2)}–${targets.phMax.toFixed(2)}. Eleva pH con elevador (KOH / “pH+”) en dosis muy pequeñas, mezcla 10–15 min y vuelve a medir. Evita sobrecorregir.`,
      });
    } else if (reading.ph > targets.phMax + 0.05) {
      steps.push({
        key: 'ph-high',
        title: 'pH alto para esta cepa',
        detail: `Medido ${reading.ph.toFixed(2)} · objetivo ~${targets.phMin.toFixed(2)}–${targets.phMax.toFixed(2)}. Baja con ácido fosfórico o “pH-” al 10% del volumen habitual del fabricante; remezcla y mide de nuevo.`,
      });
    }
  }

  if (Number.isFinite(reading.ec)) {
    if (reading.ec < targets.ecMin - 0.06) {
      const bump = estimateConcentrateBumpPercent(reading.ec, targets.ecMin);
      const nutHint =
        weekNum <= strain.vegW
          ? strain.nutriProfile?.veg
          : strain.nutriProfile?.flower;
      const nutShort = nutHint ? nutHint.slice(0, 140) + (nutHint.length > 140 ? '…' : '') : '';
      steps.push({
        key: 'ec-low',
        title: 'EC baja',
        detail: `Medido ${reading.ec.toFixed(2)} mS/cm · mínimo fase/cepa ~${targets.ecMin.toFixed(2)}. Sube A+B (o 3-partes) ~${bump != null && bump > 0 ? bump + '%' : '5–10%'} respecto a la última mezcla, o añade nutriente hasta siguiente medición.${nutShort ? ' Cepa: ' + nutShort : ''}`,
      });
    } else if (reading.ec > targets.ecMax + 0.08) {
      const addL = estimateDilutionLitersRO(reading.ec, targets.ecMax, vol);
      steps.push({
        key: 'ec-high',
        title: 'EC alta (riesgo de bloqueo / quema)',
        detail: `Medido ${reading.ec.toFixed(2)} mS/cm · techo orientativo ~${targets.ecMax.toFixed(2)}. ${addL != null && addL > 0.5 ? `Dilución orientativa: añade ~${addL} L de agua RO/osmosis al depósito (~${vol ? Math.round(vol) : '?'} L) y remezcla; mide de nuevo.` : 'Diluye con agua de baja EC hasta bajar ~0.1–0.2 mS/cm por paso.'} ${getStrainRules(strain).ecHardCap ? 'Esta genética es sensible al exceso: prioriza bajar antes que subir más.' : ''}`,
      });
    }
  }

  if (Number.isFinite(reading.waterTemp)) {
    if (reading.waterTemp > targets.waterTempMax) {
      steps.push({
        key: 'water-hot',
        title: 'Agua caliente',
        detail: `Tª ${reading.waterTemp.toFixed(1)}°C · rango cómodo para ${strain.name}: ~${targets.waterTempMin.toFixed(0)}–${targets.waterTempMax.toFixed(0)}°C. Enfría depósito (chiller, intercambiador, botellas de hielo controladas) y mejora ventilación del armario.`,
      });
    } else if (reading.waterTemp < targets.waterTempMin - 1) {
      steps.push({
        key: 'water-cold',
        title: 'Agua fría',
        detail: `Tª ${reading.waterTemp.toFixed(1)}°C · por debajo del rango habitual. Sube gradualmente temperatura ambiente del depósito o reduce enfriamiento; raíces muy frías frenan la asimilación.`,
      });
    }
  }

  if (Number.isFinite(reading.humidity) && weekNum > strain.vegW + 2) {
    const rhMax = targets.flowerRHMax;
    if (reading.humidity > rhMax + 5) {
      steps.push({
        key: 'rh-flower',
        title: 'Humedad alta en floración',
        detail: `HR ${reading.humidity.toFixed(0)}% · para esta cepa conviene no superar ~${rhMax}% en flor (cogollos densos = botrytis). Ventila más, deshumidifica o defolia estratégicamente.`,
      });
    }
  }

  if (Number.isFinite(reading.airTemp) && targets.nightAirMinC != null && reading.airTemp < targets.nightAirMinC) {
    steps.push({
      key: 'night-cold',
      title: 'Temperatura nocturna baja',
      detail: `Aire ${reading.airTemp.toFixed(1)}°C · ${strain.name} es sensible por debajo de ~${targets.nightAirMinC}°C. Mejora aislamiento o calefacción suave nocturna.`,
    });
  }

  const vpd = typeof computeVpdKpa === 'function' ? computeVpdKpa(reading.airTemp, reading.humidity) : null;
  if (vpd != null && Number.isFinite(targets.vpdMax) && vpd > targets.vpdMax * 1.15) {
    steps.push({
      key: 'vpd-high',
      title: 'VPD alto',
      detail: `VPD ${vpd.toFixed(2)} kPa · sube HR ligeramente (humidificador) o baja temperatura de copa para acercarte a ${targets.vpdMin.toFixed(2)}–${targets.vpdMax.toFixed(2)} kPa.`,
    });
  }
  if (vpd != null && Number.isFinite(targets.vpdMin) && vpd < targets.vpdMin * 0.85) {
    steps.push({
      key: 'vpd-low',
      title: 'VPD bajo',
      detail: `VPD ${vpd.toFixed(2)} kPa · mejora extracción (ventilar) o baja HR excesiva con deshumidificación puntual.`,
    });
  }

  return { targets, steps };
}

function renderStrainSpecsTableHtml() {
  if (typeof strains === 'undefined' || !strains.length) return '';
  const rows = strains
    .map((s) => {
      const pV = parsePhRangeStr(s.ph);
      const pF = parsePhRangeStr(s.phFlower);
      const rules = getStrainRules(s);
      const extras = [
        rules.ecHardCap != null ? `EC máx ${rules.ecHardCap}` : '',
        rules.nightAirMinC != null ? `Tª noche ≥${rules.nightAirMinC}°C` : '',
        rules.flowerRHMax != null ? `HR flor ≤${rules.flowerRHMax}%` : '',
      ]
        .filter(Boolean)
        .join(' · ');
      return `<tr>
        <td data-label="Variedad"><strong>${s.name}</strong><br><span class="text-muted">${s.typeName}</span></td>
        <td data-label="EC veg (ref.)" class="ec-val">${s.ecVeg}–${(s.ecVeg + 0.4).toFixed(1)}</td>
        <td data-label="EC flor / pico" class="ec-val">${s.ecFlower}–${s.ecPeak}</td>
        <td data-label="pH veg / flor">${pV.min.toFixed(1)}–${pV.max.toFixed(1)} / ${pF.min.toFixed(1)}–${pF.max.toFixed(1)}</td>
        <td data-label="Tª agua">${s.tempWater}–${s.tempWater + 2}°C</td>
        <td data-label="Sistema ideal">${s.system}</td>
        <td data-label="Notas" class="table-cell-note">${extras || s.ambNotes.slice(0, 90)}${s.ambNotes.length > 90 ? '…' : ''}</td>
      </tr>`;
    })
    .join('');
  return `
    <div class="card consejos-strain-card">
      <div class="card-header"><div class="card-title"><i class="ti ti-seedling"></i>Condiciones objetivo por variedad (validación en Medir)</div></div>
      <p class="body-prose">La app cruza tu última medición con estos rangos y la fase actual. Las correcciones sugeridas son <strong>orientativas</strong>: vuelve a medir tras cada ajuste pequeño.</p>
      <div class="table-scroll">
        <table class="week-table week-table--stack">
          <thead>
            <tr>
              <th>Variedad</th>
              <th>EC veg (ref.)</th>
              <th>EC flor / pico</th>
              <th>pH veg / flor</th>
              <th>Tª agua</th>
              <th>Sistema ideal</th>
              <th>Notas / límites</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
}

window.parsePhRangeStr = parsePhRangeStr;
window.getStrainRules = getStrainRules;
window.getStrainTargetsForWeek = getStrainTargetsForWeek;
window.buildStrainCorrectionPlan = buildStrainCorrectionPlan;
window.renderStrainSpecsTableHtml = renderStrainSpecsTableHtml;
