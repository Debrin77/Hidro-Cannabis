// Gráficos de tendencia según modo (por sistema hidropónico).

function _vpdRow(r) {
  if (typeof computeVpdKpa !== 'function') return null;
  return computeVpdKpa(r.airTemp, r.humidity);
}

function _trendLayout() {
  return {
    width: 820,
    height: 268,
    padL: 52,
    padR: 54,
    padT: 44,
    padB: 46,
  };
}

function _svgShell(innerSvg, aria) {
  return `<div class="plant-trend-scroll">
    <svg viewBox="0 0 820 268" preserveAspectRatio="xMidYMid meet" class="plant-trend-svg" role="img" aria-label="${aria}">${innerSvg}</svg>
  </div>`;
}

function renderTrendSolution(rows, phaseRef, strainTargets) {
  const band = strainTargets && Number.isFinite(strainTargets.phMin) ? strainTargets : phaseRef;
  const valid = rows.filter((r) => Number.isFinite(r.ph) && Number.isFinite(r.ec));
  if (valid.length < 2) {
    return `<div class="alert info"><i class="ti ti-info-circle"></i><p>Necesitas al menos 2 mediciones con pH y EC.</p></div>`;
  }
  const { width, height, padL, padR, padT, padB } = _trendLayout();
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const baseY = height - padB;
  const phMin = 5.0;
  const phMax = 7.0;
  const ecMin = 0.0;
  const ecMax = 3.0;
  const denom = Math.max(1, valid.length - 1);
  const toX = (i) => padL + (i / denom) * innerW;
  const toYPh = (v) => padT + (1 - (Math.max(phMin, Math.min(phMax, v)) - phMin) / (phMax - phMin)) * innerH;
  const toYEc = (v) => padT + (1 - (Math.max(ecMin, Math.min(ecMax, v)) - ecMin) / (ecMax - ecMin)) * innerH;
  const phPts = valid.map((r, i) => ({ x: toX(i), y: toYPh(r.ph), r }));
  const ecPts = valid.map((r, i) => ({ x: toX(i), y: toYEc(r.ec), r }));
  const phPoints = phPts.map((p) => `${p.x},${p.y}`).join(' ');
  const ecPoints = ecPts.map((p) => `${p.x},${p.y}`).join(' ');
  const phTargetY1 = toYPh(band.phMin);
  const phTargetY2 = toYPh(band.phMax);
  const ecTargetY1 = toYEc(band.ecMin);
  const ecTargetY2 = toYEc(band.ecMax);
  const pathArea = (pts) => {
    if (!pts.length) return '';
    const first = pts[0];
    const last = pts[pts.length - 1];
    const seg = pts.map((p) => `L ${p.x} ${p.y}`).join(' ');
    return `M ${first.x} ${baseY} ${seg} L ${last.x} ${baseY} Z`;
  };
  const labels = valid
    .map((row, i) => {
      const x = toX(i);
      const date = new Date(row.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
      return `<text x="${x}" y="${height - 18}" class="trend-label">${date}</text>`;
    })
    .join('');
  const dots = valid
    .map((r, i) => {
      const x = toX(i);
      const tip = `${new Date(r.date).toLocaleString('es-ES')} · pH ${r.ph.toFixed(2)} · EC ${r.ec.toFixed(2)}`;
      return `<circle cx="${x}" cy="${toYPh(r.ph)}" r="4.5" class="trend-ph-dot"><title>${tip}</title></circle>
        <circle cx="${x}" cy="${toYEc(r.ec)}" r="4.5" class="trend-ec-dot"><title>${tip}</title></circle>`;
    })
    .join('');
  const body = `
      <defs>
        <linearGradient id="trendPhFill2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--b400)" stop-opacity="0.22"/>
          <stop offset="100%" stop-color="var(--b400)" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="trendEcFill2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--g400)" stop-opacity="0.18"/>
          <stop offset="100%" stop-color="var(--g400)" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${width}" height="${height}" rx="12" class="trend-bg"></rect>
      <text x="${padL}" y="22" class="trend-chart-title">pH / EC</text>
      <text x="${padL}" y="36" class="trend-chart-sub">Bandas = rango óptimo (fase ∩ cepa) · ${phaseRef.phase}</text>
      <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${baseY}" class="trend-axis trend-axis--main"></line>
      <line x1="${width - padR}" y1="${padT}" x2="${width - padR}" y2="${baseY}" class="trend-axis trend-axis--secondary"></line>
      <line x1="${padL}" y1="${baseY}" x2="${width - padR}" y2="${baseY}" class="trend-axis trend-axis--main"></line>
      <text x="${padL}" y="${padT - 6}" class="trend-axis-caption">pH (5–7)</text>
      <text x="${width - padR - 72}" y="${padT - 6}" class="trend-axis-caption trend-axis-caption--right">EC (0–3)</text>
      <rect x="${padL}" y="${Math.min(phTargetY1, phTargetY2)}" width="${innerW}" height="${Math.abs(phTargetY2 - phTargetY1)}" class="trend-ph-band"></rect>
      <rect x="${padL}" y="${Math.min(ecTargetY1, ecTargetY2)}" width="${innerW}" height="${Math.abs(ecTargetY2 - ecTargetY1)}" class="trend-ec-band"></rect>
      <path d="${pathArea(phPts)}" fill="url(#trendPhFill2)" class="trend-ph-area"></path>
      <path d="${pathArea(ecPts)}" fill="url(#trendEcFill2)" class="trend-ec-area"></path>
      <polyline points="${phPoints}" fill="none" class="trend-ph-line"></polyline>
      <polyline points="${ecPoints}" fill="none" class="trend-ec-line"></polyline>
      ${dots}
      ${labels}`;
  return _svgShell(body, 'Tendencia pH y EC');
}

function renderTrendThermal(rows, phaseRef, strainTargets) {
  const valid = rows.filter((r) => Number.isFinite(r.ec) && Number.isFinite(r.waterTemp));
  if (valid.length < 2) {
    return `<div class="alert info"><i class="ti ti-info-circle"></i><p>Necesitas al menos 2 mediciones con EC y temperatura de agua.</p></div>`;
  }
  const { width, height, padL, padR, padT, padB } = _trendLayout();
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const baseY = height - padB;
  const wtMin = 14;
  const wtMax = 30;
  const ecMin = 0;
  const ecMax = 3;
  const denom = Math.max(1, valid.length - 1);
  const toX = (i) => padL + (i / denom) * innerW;
  const toYWt = (v) => padT + (1 - (Math.max(wtMin, Math.min(wtMax, v)) - wtMin) / (wtMax - wtMin)) * innerH;
  const toYEc = (v) => padT + (1 - (Math.max(ecMin, Math.min(ecMax, v)) - ecMin) / (ecMax - ecMin)) * innerH;
  const tLow = strainTargets.waterTempMin;
  const tHigh = strainTargets.waterTempMax;
  const ecT1 = toYEc(strainTargets.ecMin);
  const ecT2 = toYEc(strainTargets.ecMax);
  const wtT1 = toYWt(tLow);
  const wtT2 = toYWt(tHigh);
  const wtPts = valid.map((r, i) => ({ x: toX(i), y: toYWt(r.waterTemp), r }));
  const ecPts = valid.map((r, i) => ({ x: toX(i), y: toYEc(r.ec), r }));
  const pathArea = (pts) => {
    if (!pts.length) return '';
    const first = pts[0];
    const last = pts[pts.length - 1];
    const seg = pts.map((p) => `L ${p.x} ${p.y}`).join(' ');
    return `M ${first.x} ${baseY} ${seg} L ${last.x} ${baseY} Z`;
  };
  const labels = valid
    .map((row, i) => {
      const x = toX(i);
      const date = new Date(row.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
      return `<text x="${x}" y="${height - 18}" class="trend-label">${date}</text>`;
    })
    .join('');
  const dots = valid
    .map((r, i) => {
      const x = toX(i);
      const tip = `${new Date(r.date).toLocaleString('es-ES')} · Tª agua ${r.waterTemp.toFixed(1)}°C · EC ${r.ec.toFixed(2)}`;
      return `<circle cx="${x}" cy="${toYWt(r.waterTemp)}" r="4.5" class="trend-watertemp-dot"><title>${tip}</title></circle>
        <circle cx="${x}" cy="${toYEc(r.ec)}" r="4.5" class="trend-ec-dot"><title>${tip}</title></circle>`;
    })
    .join('');
  const body = `
      <defs>
        <linearGradient id="trendWtFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--purple-400, #a78bfa)" stop-opacity="0.2"/>
          <stop offset="100%" stop-color="var(--purple-400, #a78bfa)" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="trendEcFillT" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--g400)" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="var(--g400)" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${width}" height="${height}" rx="12" class="trend-bg"></rect>
      <text x="${padL}" y="22" class="trend-chart-title">EC + temperatura de agua</text>
      <text x="${padL}" y="36" class="trend-chart-sub">Banda violeta = Tª agua objetivo cepa · verde = EC óptimo (fase ∩ cepa)</text>
      <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${baseY}" class="trend-axis trend-axis--main"></line>
      <line x1="${width - padR}" y1="${padT}" x2="${width - padR}" y2="${baseY}" class="trend-axis trend-axis--secondary"></line>
      <line x1="${padL}" y1="${baseY}" x2="${width - padR}" y2="${baseY}" class="trend-axis trend-axis--main"></line>
      <text x="${padL}" y="${padT - 6}" class="trend-axis-caption">Tª agua (°C)</text>
      <text x="${width - padR - 52}" y="${padT - 6}" class="trend-axis-caption trend-axis-caption--right">EC</text>
      <rect x="${padL}" y="${Math.min(wtT1, wtT2)}" width="${innerW}" height="${Math.abs(wtT2 - wtT1)}" class="trend-watertemp-band"></rect>
      <rect x="${padL}" y="${Math.min(ecT1, ecT2)}" width="${innerW}" height="${Math.abs(ecT2 - ecT1)}" class="trend-ec-band"></rect>
      <path d="${pathArea(wtPts)}" fill="url(#trendWtFill)" class="trend-ph-area"></path>
      <path d="${pathArea(ecPts)}" fill="url(#trendEcFillT)" class="trend-ec-area"></path>
      <polyline points="${wtPts.map((p) => `${p.x},${p.y}`).join(' ')}" fill="none" class="trend-watertemp-line"></polyline>
      <polyline points="${ecPts.map((p) => `${p.x},${p.y}`).join(' ')}" fill="none" class="trend-ec-line"></polyline>
      ${dots}
      ${labels}`;
  return _svgShell(body, 'Tendencia EC y temperatura de agua');
}

function renderTrendClimate(rows, phaseRef) {
  const valid = rows.filter((r) => _vpdRow(r) != null && Number.isFinite(r.humidity));
  if (valid.length < 2) {
    return `<div class="alert info"><i class="ti ti-info-circle"></i><p>Necesitas al menos 2 mediciones con temperatura de aire y humedad (para VPD).</p></div>`;
  }
  const { width, height, padL, padR, padT, padB } = _trendLayout();
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const baseY = height - padB;
  const vpdMin = 0.2;
  const vpdMax = 2.2;
  const rhMin = 35;
  const rhMax = 95;
  const denom = Math.max(1, valid.length - 1);
  const toX = (i) => padL + (i / denom) * innerW;
  const toYVpd = (v) => padT + (1 - (Math.max(vpdMin, Math.min(vpdMax, v)) - vpdMin) / (vpdMax - vpdMin)) * innerH;
  const toYRh = (v) => padT + (1 - (Math.max(rhMin, Math.min(rhMax, v)) - rhMin) / (rhMax - rhMin)) * innerH;
  const vpdPts = valid.map((r, i) => ({ x: toX(i), y: toYVpd(_vpdRow(r)), r }));
  const rhPts = valid.map((r, i) => ({ x: toX(i), y: toYRh(r.humidity), r }));
  const v1 = toYVpd(phaseRef.vpdMin);
  const v2 = toYVpd(phaseRef.vpdMax);
  const pathArea = (pts) => {
    if (!pts.length) return '';
    const first = pts[0];
    const last = pts[pts.length - 1];
    const seg = pts.map((p) => `L ${p.x} ${p.y}`).join(' ');
    return `M ${first.x} ${baseY} ${seg} L ${last.x} ${baseY} Z`;
  };
  const labels = valid
    .map((row, i) => {
      const x = toX(i);
      const date = new Date(row.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
      return `<text x="${x}" y="${height - 18}" class="trend-label">${date}</text>`;
    })
    .join('');
  const dots = valid
    .map((r, i) => {
      const x = toX(i);
      const v = _vpdRow(r);
      const tip = `${new Date(r.date).toLocaleString('es-ES')} · VPD ${v.toFixed(2)} · HR ${r.humidity}%`;
      return `<circle cx="${x}" cy="${toYVpd(v)}" r="4.5" class="trend-vpd-dot"><title>${tip}</title></circle>
        <circle cx="${x}" cy="${toYRh(r.humidity)}" r="4.5" class="trend-rh-dot"><title>${tip}</title></circle>`;
    })
    .join('');
  const body = `
      <rect x="0" y="0" width="${width}" height="${height}" rx="12" class="trend-bg"></rect>
      <text x="${padL}" y="22" class="trend-chart-title">VPD + humedad relativa</text>
      <text x="${padL}" y="36" class="trend-chart-sub">Banda = VPD objetivo fase · ${phaseRef.phase}</text>
      <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${baseY}" class="trend-axis trend-axis--main"></line>
      <line x1="${width - padR}" y1="${padT}" x2="${width - padR}" y2="${baseY}" class="trend-axis trend-axis--secondary"></line>
      <line x1="${padL}" y1="${baseY}" x2="${width - padR}" y2="${baseY}" class="trend-axis trend-axis--main"></line>
      <text x="${padL}" y="${padT - 6}" class="trend-axis-caption">VPD (kPa)</text>
      <text x="${width - padR - 40}" y="${padT - 6}" class="trend-axis-caption trend-axis-caption--right">HR %</text>
      <rect x="${padL}" y="${Math.min(v1, v2)}" width="${innerW}" height="${Math.abs(v2 - v1)}" class="trend-vpd-band"></rect>
      <path d="${pathArea(vpdPts)}" fill="rgba(245,158,11,0.12)" class="trend-ph-area"></path>
      <path d="${pathArea(rhPts)}" fill="rgba(52,144,220,0.1)" class="trend-ec-area"></path>
      <polyline points="${vpdPts.map((p) => `${p.x},${p.y}`).join(' ')}" fill="none" class="trend-vpd-line"></polyline>
      <polyline points="${rhPts.map((p) => `${p.x},${p.y}`).join(' ')}" fill="none" class="trend-rh-line"></polyline>
      ${dots}
      ${labels}`;
  return _svgShell(body, 'Tendencia VPD y humedad');
}

function renderTrendBySystemMode(rows, grow, phaseRef, strain, weekNum, modeId) {
  const targets = getStrainTargetsForWeek(strain, weekNum, phaseRef);
  if (modeId === 'thermal') return renderTrendThermal(rows, phaseRef, targets);
  if (modeId === 'climate') return renderTrendClimate(rows, phaseRef);
  return renderTrendSolution(rows, phaseRef, targets);
}

function getStoredTrendMode(system) {
  try {
    const k = 'hydrogrow-pro.v1.trendMode.' + (system || 'DWC');
    return localStorage.getItem(k) || 'solution';
  } catch {
    return 'solution';
  }
}

function setStoredTrendMode(system, modeId) {
  try {
    localStorage.setItem('hydrogrow-pro.v1.trendMode.' + (system || 'DWC'), modeId);
  } catch (_) {
    /* ignore */
  }
}

function onTrendModeChange(selectEl) {
  if (!myGrow || !selectEl) return;
  setStoredTrendMode(myGrow.system, selectEl.value);
  if (typeof renderHistorial === 'function') renderHistorial();
  if (typeof renderMonitor === 'function') renderMonitor();
}

window.renderTrendBySystemMode = renderTrendBySystemMode;
window.getStoredTrendMode = getStoredTrendMode;
window.setStoredTrendMode = setStoredTrendMode;
window.onTrendModeChange = onTrendModeChange;
