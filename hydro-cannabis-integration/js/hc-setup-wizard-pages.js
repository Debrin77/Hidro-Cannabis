/** buildNftActiveDiagramSvg, preview, páginas del asistente, grid nutrientes. Tras hc-setup-wizard-nft-diagrams.js. */
/** Elige SVG NFT según config (mesa multinivel, escalera, serpentín mesa/pared). */
function buildNftActiveDiagramSvg(canales, huecos, pendPct, volL, svgIdSuffix, equipOpts) {
  if (typeof HC_DIAG === 'undefined' || !HC_DIAG.nft) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 72" role="img" aria-label="Error de carga del diagrama"><text x="12" y="40" font-family="system-ui,sans-serif" font-size="13" fill="#b91c1c">Recarga forzada (Ctrl+F5) o borra caché del sitio.</text></svg>';
  }
  const EO = equipOpts || {};
  const cfg = EO.cfgSnapshot || {};
  const disp = nftDisposicionNormalizada(EO.nftDisposicion != null ? EO.nftDisposicion : cfg.nftDisposicion);
  let tiers = EO.mesaTiers && EO.mesaTiers.length >= 2 ? EO.mesaTiers : null;
  if (!tiers && disp === 'mesa' && cfg.nftMesaMultinivel) {
    tiers = parseNftMesaTubosPorNivelStr(cfg.nftMesaTubosPorNivelStr);
    if (tiers.length < 2) tiers = null;
  }
  if (disp === 'mesa' && tiers) {
    return buildNftMesaMultinivelDiagramSvg(tiers, huecos, pendPct, volL, svgIdSuffix, equipOpts);
  }
  if (disp === 'escalera') {
    const caras = EO.escaleraCaras != null ? EO.escaleraCaras : nftEscaleraCarasNormalizada(cfg.nftEscaleraCaras);
    let nv = EO.escaleraNiveles;
    if (nv == null || !Number.isFinite(nv)) nv = parseInt(String(cfg.nftEscaleraNivelesCara), 10);
    if (!Number.isFinite(nv) || nv < 1) nv = Math.max(1, Math.ceil(canales / Math.max(1, caras)));
    nv = Math.min(12, Math.max(1, nv));
    return buildNftEscaleraDiagramSvg(nv, caras, huecos, pendPct, volL, svgIdSuffix, equipOpts);
  }
  return buildNftSerpentineDiagramSvg(canales, huecos, pendPct, volL, svgIdSuffix, equipOpts);
}

/**
 * NFT en serpentín (como esquema clásico): tubos apilados, flujo en zigzag,
 * línea discontinua azul = sentido del agua, depósito con volumen y datos de bomba.
 */
function buildNftSerpentineDiagramSvg(canales, huecos, pendPct, volL, svgIdSuffix, equipOpts) {
  const EO = equipOpts || {};
  const cfg = EO.cfgSnapshot || {};
  const interactive = EO.interactive === true;
  const showCalentador = EO.calentador === true;
  const showDifusor = EO.difusor === true;
  const bomb = EO.bombaInfo || null;
  const dispLayout = nftDisposicionNormalizada(EO.nftDisposicion != null ? EO.nftDisposicion : cfg.nftDisposicion);

  const suf = (svgIdSuffix != null && String(svgIdSuffix).trim() !== '')
    ? String(svgIdSuffix).replace(/[^a-zA-Z0-9_-]/g, '')
    : '';
  const gidCh = 'nftSerpCh' + suf;
  const gidTank = 'nftSerpTk' + suf;
  const gidAqua = 'nftSerpAq' + suf;
  const tid = 'nftSerpTitle' + suf;

  const nCh = Math.min(Math.max(parseInt(String(canales), 10) || 1, 1), 24);
  const huecosN = Math.min(Math.max(parseInt(String(huecos), 10) || 2, 2), 30);
  const pend = Math.min(Math.max(parseInt(String(pendPct), 10) || 2, 1), 4);
  const vol = Math.min(200, Math.max(5, parseInt(String(volL), 10) || 20));

  const isParedSerp = dispLayout === 'pared';
  const W0 = nftDiagramCanvasW0();
  const compactSerpHeader = nCh * huecosN > 20;
  const hdrSerpPad = nftDiagramHeaderTypography(W0, { compact: compactSerpHeader, withLegend: false });
  const rowStep = Math.max(
    isParedSerp ? 58 : 54,
    Math.min(74, Math.floor((isParedSerp ? 840 : 820) / Math.max(nCh, 1)))
  );
  /** Cabecera: espacio mínimo según tamaño de título (serpentín no lleva leyenda Canal/Cesta bajo el subtítulo). */
  const topPad = Math.max(isParedSerp ? 80 : 38, hdrSerpPad.topPadMin);
  const botTank = 162;
  const stairExtra = dispLayout === 'escalera' ? Math.max(0, nCh - 1) * 28 : 0;
  const H = topPad + nCh * rowStep + botTank + stairExtra;
  const cx = W0 / 2;
  const marginX = 34;
  const xL = marginX;
  const xR = W0 - marginX;
  const tubeH = dispLayout === 'pared' ? 17 : 25;
  const padFlow = 14;
  const serpChStroke = dispLayout === 'pared' ? 1.05 : 1.3;
  const tankY = H - botTank + 4;
  const tankH = 102;
  const tankW = Math.min(400, Math.round(152 + vol * 0.72));
  const tx = (W0 - tankW) / 2;
  const waterTop = tankY + 6;
  const waterH = tankH - 16;
  const altCmSerp =
    EO.nftAlturaBombeoCm != null && Number(EO.nftAlturaBombeoCm) > 0 ? Math.round(Number(EO.nftAlturaBombeoCm)) : null;
  const legHintSerp = { volL: vol, nCanales: nCh, nTubosTotal: nCh, alturaBadgeNTubos: nCh };
  const legTierSerp = nftDiagramLegibilityHint(legHintSerp);
  const volFsSerp = nftTankVolumeFontSize(vol, legTierSerp);
  const altBadgeSerp = nftAlturaBadgeBesideTank(altCmSerp, tx, tankY, tankW, tankH, W0, legHintSerp);
  const Wsvg = altBadgeSerp.canvasW;

  const yRow = i =>
    topPad + i * rowStep + Math.floor(rowStep / 2) + (dispLayout === 'escalera' ? i * 14 : 0);

  const P = HC_DIAG.nft;
  const flowDash = 'stroke-dasharray="11 9" stroke-linecap="round" stroke-linejoin="round"';
  const flowSt = 'stroke="' + P.flow + '" fill="none" ' + flowDash;

  /**
   * Dos columnas en C: alimentación sale abajo del depósito y sube por el eje más EXTERIOR (más a la izquierda);
   * retorno en el eje más INTERIOR (pegado al sistema) y entra arriba al depósito — xSupplyOut < xReturnIn → sin cruces.
   */
  const xReturnIn = Math.max(22, Math.min(xL - 4, tx - 12));
  const xSupplyOut = Math.max(12, xReturnIn - 20);
  const yPump = waterTop + Math.min(18, waterH * 0.45);
  const xPump = tx + 14;
  const yOutlet = tankY + tankH - 18;
  const yInlet = tankY + 22;

  let flowD = '';
  flowD += 'M ' + xPump + ' ' + yPump;
  flowD += ' L ' + (tx + 6) + ' ' + yPump;
  flowD += ' L ' + (tx + 6) + ' ' + yOutlet;
  flowD += ' L ' + tx + ' ' + yOutlet;
  flowD += ' L ' + xSupplyOut + ' ' + yOutlet;
  flowD += ' L ' + xSupplyOut + ' ' + yRow(0);
  flowD += ' L ' + (xL + padFlow) + ' ' + yRow(0);
  for (let i = 0; i < nCh; i++) {
    const y = yRow(i);
    if (i % 2 === 0) {
      flowD += ' L ' + (xR - padFlow) + ' ' + y;
      if (i < nCh - 1) flowD += ' L ' + (xR - padFlow) + ' ' + yRow(i + 1);
    } else {
      flowD += ' L ' + (xL + padFlow) + ' ' + y;
      if (i < nCh - 1) flowD += ' L ' + (xL + padFlow) + ' ' + yRow(i + 1);
    }
  }
  const yLast = yRow(nCh - 1);
  const endsRightSerp = (nCh - 1) % 2 === 0;
  const retMargSerp = endsRightSerp ? xR + 14 : xL - 14;
  let yDuctRun = yLast + tubeH / 2 + 14;
  if (yDuctRun > tankY - 8) yDuctRun = Math.max(yLast + tubeH / 2 + 8, tankY - 10);

  flowD += ' L ' + retMargSerp + ' ' + yLast;
  if (endsRightSerp) {
    flowD += ' L ' + retMargSerp + ' ' + yDuctRun;
    flowD += ' L ' + xReturnIn + ' ' + yDuctRun;
  } else {
    if (retMargSerp !== xReturnIn) flowD += ' L ' + xReturnIn + ' ' + yLast;
  }
  flowD += ' L ' + xReturnIn + ' ' + yInlet;
  flowD += ' L ' + (tx + 4) + ' ' + yInlet;
  flowD += ' L ' + (tx + 6) + ' ' + yInlet;
  flowD += ' L ' + (tx + 6) + ' ' + yPump;
  flowD += ' L ' + xPump + ' ' + yPump;

  let back = '';
  back +=
    '<path d="' +
    flowD +
    '" stroke="' +
    P.flowGhost +
    '" stroke-width="4" fill="none" opacity="0.45" stroke-linecap="round" stroke-linejoin="round"/>';

  let channels = '';
  const tLabelFsSerpBase = nCh >= 10 ? 12 : nCh >= 6 ? 13 : 14;
  const tLabelFsSerp = isParedSerp ? tLabelFsSerpBase + 2.25 : tLabelFsSerpBase;
  const cxTubeSerp = (xL + xR) / 2;
  for (let i = 0; i < nCh; i++) {
    const yRi = yRow(i);
    const yc = yRi - tubeH / 2;
    const peNone = interactive ? ' pointer-events="none"' : '';
    channels +=
      '<rect x="' +
      xL +
      '" y="' +
      yc +
      '" width="' +
      (xR - xL) +
      '" height="' +
      tubeH +
      '" rx="11" fill="url(#' +
      gidCh +
      ')" stroke="' +
      P.canalStroke +
      '" stroke-width="' +
      serpChStroke +
      '"' +
      peNone +
      '/>';
    channels +=
      '<text x="' +
      cxTubeSerp +
      '" y="' +
      (yc - 6) +
      '" text-anchor="middle" dominant-baseline="auto" font-size="' +
      tLabelFsSerp +
      '" class="svg-paint-order-stroke" font-weight="900" fill="' +
      P.labelHole +
      '" stroke="' +
      P.textHalo +
      '" stroke-width="0.45" stroke-opacity="0.9"' +
      peNone +
      '>T' +
      (i + 1) +
      '</text>';
  }

  const nftFlowAnim = torreSvgAnimacionesActivas();
  let flowLayer =
    '<path d="' + flowD + '" ' + flowSt + ' stroke-width="2.2" opacity="0.95"' +
    (nftFlowAnim
      ? '><animate attributeName="stroke-dashoffset" from="0" to="-24" dur="1.35s" repeatCount="indefinite" calcMode="linear"/></path>'
      : '/>');
  const bombaFsSerp = nCh >= 10 ? 9 : 10;
  const bombaYSerp = Math.min(yRow(0) - tubeH - 16, yOutlet - 26);
  flowLayer +=
    '<text x="' +
    (xSupplyOut - 3) +
    '" y="' +
    bombaYSerp +
    '" text-anchor="end" font-size="' +
    bombaFsSerp +
    '" font-weight="800" fill="' +
    P.bombaText +
    '">BOMBA ↑</text>';

  const spanTube = xR - xL - 2 * padFlow;
  const hr = Math.max(
    dispLayout === 'pared' ? 6.2 : 5.6,
    Math.min(dispLayout === 'pared' ? 13.2 : 12.5, (spanTube / Math.max(huecosN - 1, 1)) * (dispLayout === 'pared' ? 0.51 : 0.48))
  );
  const holeNumFsSerp = (nCh >= 10 ? 8.5 : nCh >= 6 ? 9.25 : 10) + (isParedSerp ? 0.85 : 0);
  const compactSerp = nCh * huecosN > 20;
  let plants = '';
  for (let i = 0; i < nCh; i++) {
    const y = yRow(i);
    const rtl = i % 2 === 1;
    const spanH = spanTube;
    const slotAlongRow = huecosN <= 1 ? spanH : spanH / Math.max(1, huecosN - 1);

    for (let j = 0; j < huecosN; j++) {
      const t = huecosN <= 1 ? 0.5 : j / (huecosN - 1);
      const gx = rtl ? xR - padFlow - t * spanH : xL + padFlow + t * spanH;
      const gy = y;
      const numShow = j + 1;
      let dat = { variedad: '', fecha: '' };
      if (interactive && state.torre[i] && state.torre[i][j]) dat = state.torre[i][j];
      const cult = dat.variedad ? getCultivoDB(dat.variedad) : null;
      const col = interactive ? torreListaColorCesta(i, j) : { bg: P.plantEmptyBg, border: P.plantEmptyBorder };
      const multiKey = i + ',' + j;
      const isMulti = interactive && torreInteraccionModo === 'asignar' && torreCestasMultiSel.has(multiKey);
      const isEd =
        interactive &&
        typeof editingCesta !== 'undefined' &&
        editingCesta &&
        editingCesta.nivel === i &&
        editingCesta.cesta === j;
      const dias =
        dat.fecha && typeof torreDiasCicloVisual === 'function'
          ? torreDiasCicloVisual(dat)
          : dat.fecha
            ? Math.max(0, Math.floor((Date.now() - new Date(dat.fecha)) / 86400000))
            : null;
      let ariaTxt = 'Canal T' + (i + 1) + ', hueco ' + (j + 1) + ', ' + (dat.variedad ? cultivoNombreLista(cult, dat.variedad) : 'vacío');
      if (dias !== null) ariaTxt += ', día ' + dias;
      ariaTxt += '. Pulsa para ficha o asignar cultivo.';

      if (interactive) {
        plants +=
          '<g class="hc-cesta hc-nft-hueco" data-n="' + i + '" data-c="' + j + '" role="button" tabindex="0" aria-label="' +
          escAriaAttr(ariaTxt) +
          '">';
      }
      plants += '<circle cx="' + gx.toFixed(2) + '" cy="' + gy + '" r="' + hr.toFixed(2) + '" fill="' + col.bg + '" stroke="' + col.border + '" stroke-width="' + (interactive ? '1.35' : '1.1') + '"/>';
      if (isMulti) {
        plants +=
          '<circle cx="' +
          gx.toFixed(2) +
          '" cy="' +
          gy +
          '" r="' +
          (hr + 3.5).toFixed(2) +
          '" fill="none" stroke="' +
          P.ringMulti +
          '" stroke-width="1.2" stroke-dasharray="3 2"/>';
      }
      if (isEd) {
        plants +=
          '<circle cx="' +
          gx.toFixed(2) +
          '" cy="' +
          gy +
          '" r="' +
          (hr + 3).toFixed(2) +
          '" fill="none" stroke="' +
          P.ringEdit +
          '" stroke-width="1.25"/>';
      }
      plants += nftSvgHuecoEmojiOnly(dat, cult, gx, gy, hr, compactSerp);
      plants += nftSvgHuecoNumBelowHole(
        gx,
        gy,
        hr,
        numShow,
        Math.max(7, holeNumFsSerp - 0.75),
        compactSerp,
        isParedSerp ? 5 : 3
      );
      if (interactive) {
        const ptrR = nftHuecoPointerRadius(hr, true, slotAlongRow);
        plants +=
          '<circle cx="' + gx.toFixed(2) + '" cy="' + gy + '" r="' + ptrR.toFixed(2) + '" fill="rgba(0,0,0,0.001)" pointer-events="all"/>';
        plants += '</g>';
      }
    }
  }

  let tankLayer = '';
  tankLayer +=
    '<rect x="' +
    tx +
    '" y="' +
    tankY +
    '" width="' +
    tankW +
    '" height="' +
    tankH +
    '" rx="12" fill="url(#' +
    gidTank +
    ')" stroke="' +
    P.tankStroke +
    '" stroke-width="1.3"/>';
  tankLayer += '<rect x="' + (tx + 4) + '" y="' + waterTop + '" width="' + (tankW - 8) + '" height="' + waterH + '" rx="8" fill="url(#' + gidAqua + ')" opacity="0.9"/>';
  tankLayer += altBadgeSerp.html;
  /* Depósito: solo volumen + CAL/AIR si el usuario los tiene en equipamiento (el resto de la config va al pie). */
  const volTextY = tankY + Math.floor(tankH / 2) + 5;
  const volCxSerp = tx + tankW / 2;
  tankLayer +=
    '<text x="' +
    volCxSerp +
    '" y="' +
    volTextY +
    '" text-anchor="middle" fill="' +
    P.volWhite +
    '" font-size="' +
    volFsSerp +
    '" font-weight="900" font-family="system-ui,sans-serif">' +
    vol +
    ' L</text>';
  if (showCalentador) {
    const hx = tx + 18;
    tankLayer +=
      '<rect x="' +
      (hx - 5) +
      '" y="' +
      (tankY + tankH - 36) +
      '" width="10" height="30" rx="5" fill="' +
      P.calFill +
      '" stroke="' +
      P.calStroke +
      '" stroke-width="1.2"/>';
    tankLayer += '<circle cx="' + hx + '" cy="' + (tankY + tankH - 42) + '" r="3.5" fill="' + P.calGlow + '"/>';
    tankLayer +=
      '<text x="' +
      hx +
      '" y="' +
      (tankY + tankH - 2) +
      '" text-anchor="middle" font-size="7.5" font-weight="800" fill="' +
      P.calText +
      '">CAL</text>';
  }
  if (showDifusor) {
    const ax = tx + tankW - 18;
    const ay = tankY + tankH - 16;
    tankLayer +=
      '<line x1="' +
      ax +
      '" y1="' +
      (tankY - 2) +
      '" x2="' +
      ax +
      '" y2="' +
      (ay - 12) +
      '" stroke="' +
      P.airLine +
      '" stroke-width="1.5" stroke-dasharray="3 2" opacity="0.95"/>';
    tankLayer +=
      '<ellipse cx="' +
      ax +
      '" cy="' +
      ay +
      '" rx="13" ry="7" fill="' +
      P.airStoneFill +
      '" stroke="' +
      P.airStoneStroke +
      '" stroke-width="1.2"/>';
    for (let bi = 0; bi < 5; bi++) {
      const bx = ax + (bi % 3 - 1) * 4;
      tankLayer += '<circle cx="' + bx + '" cy="' + (ay - 7 - bi * 3) + '" r="1.7" fill="' + P.bubble + '" opacity="0.9"/>';
    }
    tankLayer +=
      '<text x="' +
      ax +
      '" y="' +
      (tankY + tankH - 2) +
      '" text-anchor="middle" font-size="7.5" font-weight="800" fill="' +
      P.airText +
      '">AIR</text>';
  }

  const pumpLines = '';

  if (interactive) {
    back = '<g pointer-events="none">' + back + '</g>';
    channels = '<g pointer-events="none">' + channels + '</g>';
    flowLayer = '<g pointer-events="none">' + flowLayer + '</g>';
    tankLayer = '<g pointer-events="none">' + tankLayer + '</g>';
  }

  const layoutFoot =
    dispLayout === 'escalera' ? 'Escalera' : dispLayout === 'pared' ? 'Pared (zigzag)' : 'Mesa';
  let foot =
    'NFT ' +
    layoutFoot +
    ' · línea azul = agua · ' +
    nCh +
    ' tubos · ' +
    huecosN +
    ' huecos/tubo · ' +
    pend +
    '% pendiente';
  if (bomb) {
    const minV = bomb.volMinDepositoSugeridoL;
    const recV = bomb.volDepositoRecomendadoL != null ? bomb.volDepositoRecomendadoL : minV;
    if (vol < minV) {
      foot += ' · ⚠ revisar depósito (orientativo: por debajo del mínimo útil)';
    } else if (vol < recV) {
      foot += ' · ⚠ revisar margen de depósito en panel';
    }
  }
  try {
    const recoTxt = nftRecomendacionCultivoTextoCorto(cfg);
    if (recoTxt) foot += ' · ' + recoTxt;
  } catch (_) {}
  foot += NFT_SVG_FOOT_ORIENT_HINT;

  return (
    '<svg class="torre-svg-diagram nft-serpentine-svg nft-diagram--scroll' +
    (isParedSerp ? ' nft-serpentine--pared' : '') +
    '" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' +
    Wsvg +
    ' ' +
    H +
    '" width="100%" class="svg-fit-block" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="' +
    tid +
    '">' +
    '<title id="' +
    tid +
    '">' +
    escSvgText(
      'Diagrama NFT en serpentín: recorrido del agua desde el depósito por los tubos y retorno. ' + foot
    ) +
    '</title>' +
    '<defs>' +
    '<linearGradient id="' +
    gidCh +
    '" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="' +
    P.canalGrad0 +
    '"/><stop offset="100%" stop-color="' +
    P.canalGrad1 +
    '"/></linearGradient>' +
    '<linearGradient id="' +
    gidTank +
    '" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="' +
    P.tankGrad0 +
    '"/><stop offset="100%" stop-color="' +
    P.tankGrad1 +
    '"/></linearGradient>' +
    '<linearGradient id="' +
    gidAqua +
    '" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="' +
    P.waterGrad0 +
    '" stop-opacity="' +
    P.waterOp0 +
    '"/><stop offset="100%" stop-color="' +
    P.waterGrad1 +
    '" stop-opacity="' +
    P.waterOp1 +
    '"/></linearGradient>' +
    '</defs>' +
    back +
    channels +
    flowLayer +
    plants +
    tankLayer +
    (!interactive ? pumpLines : '') +
    '</svg>'
  );
}

function escSvgText(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Esquema NFT: tubos con todos los huecos, recorrido de agua (subida → manifold → canales → retorno) y CAL/AIR en depósito si aplica. */
function buildNftSchematicSvg(canales, huecos, pendPct, volL, svgIdSuffix, equipOpts) {
  const EO = equipOpts || {};
  const showCalentador = EO.calentador === true;
  const showDifusor = EO.difusor === true;
  const interactive = EO.interactive === true;
  const bomb = EO.bombaInfo || null;

  const suf = (svgIdSuffix != null && String(svgIdSuffix).trim() !== '')
    ? String(svgIdSuffix).replace(/[^a-zA-Z0-9_-]/g, '')
    : '';
  const gidFilm = 'nftFilmG' + suf;
  const gidTank = 'nftTankG' + suf;
  const gidAqua = 'nftAquaG' + suf;
  const tid = 'nftSvgTitle' + suf;
  const W0 = 500;
  const H = 278;
  const nCh = Math.min(Math.max(parseInt(String(canales), 10) || 1, 1), 10);
  const huecosN = Math.min(Math.max(parseInt(String(huecos), 10) || 2, 2), 30);
  const pend = Math.min(Math.max(parseInt(String(pendPct), 10) || 2, 1), 4);
  const vol = Math.min(100, Math.max(5, parseInt(String(volL), 10) || 20));
  const altCmSch =
    EO.nftAlturaBombeoCm != null && Number(EO.nftAlturaBombeoCm) > 0 ? Math.round(Number(EO.nftAlturaBombeoCm)) : null;

  const cx = W0 / 2;
  const x0 = 32;
  const x1 = W0 - 32;
  const span = (x1 - x0) / nCh;
  const yMan = 40;
  const yTop = 52;
  const yBot = 106;
  const sk = 1.75 + pend * 0.55;

  const tankTop = 172;
  const tankH = 52;
  const tankW = Math.min(172, Math.round(92 + vol * 0.42));
  const tx = (W0 - tankW) / 2;
  const tankMid = tankTop + tankH / 2;
  const altBadgeSch = nftAlturaBadgeBesideTank(altCmSch, tx, tankTop, tankW, tankH, W0);
  const Wsvg = altBadgeSch.canvasW;
  const cxTitle = Wsvg / 2;
  const volCxSch = tx + tankW / 2;
  const waterFill = 0.82;
  const waterTop = tankTop + 6 + (1 - waterFill) * (tankH - 14);
  const retEndX = tx + tankW - 10;
  const retEndY = waterTop + 8;

  const schFlowAnim = torreSvgAnimacionesActivas();
  const P = HC_DIAG.nft;
  const flowDash = 'stroke-dasharray="11 9" stroke-linecap="round" stroke-linejoin="round"';
  const flowSt = 'stroke="' + P.flow + '" fill="none" ' + flowDash;
  const pipeGrey = 'stroke="' + P.pipeGrey + '" stroke-width="2.8" fill="none" stroke-linecap="round" stroke-linejoin="round"';

  let back = '';
  const retPath =
    'M ' + (x1 - 2) + ' ' + (yBot - 6) +
    ' C ' + (W0 - 8) + ' ' + (yBot + 28) + ', ' + (W0 - 12) + ' ' + (tankTop - 18) + ', ' + retEndX + ' ' + retEndY;
  back += '<path d="' + retPath + '" ' + pipeGrey + ' opacity="0.55"/>';
  back +=
    '<path d="' + retPath + '" ' + flowSt + ' stroke-width="1.85" opacity="0.92"' +
    (schFlowAnim
      ? '><animate attributeName="stroke-dashoffset" from="0" to="-24" dur="1.35s" repeatCount="indefinite" calcMode="linear"/></path>'
      : '/>');
  back +=
    '<text x="' + (W0 - 8) + '" y="' + (yBot + 14) + '" text-anchor="end" fill="' + P.retornoLabel + '" font-size="8" font-weight="800">Agua retorno</text>';

  let tankLayer = '';
  tankLayer +=
    '<rect x="' +
    tx +
    '" y="' +
    tankTop +
    '" width="' +
    tankW +
    '" height="' +
    tankH +
    '" rx="10" fill="url(#' +
    gidTank +
    ')" stroke="' +
    P.tankStroke +
    '" stroke-width="1.2"/>';
  tankLayer += '<rect x="' + (tx + 4) + '" y="' + waterTop + '" width="' + (tankW - 8) + '" height="' + (tankTop + tankH - 8 - waterTop) + '" rx="6" fill="url(#' + gidAqua + ')" opacity="0.88"/>';
  tankLayer += altBadgeSch.html;
  tankLayer +=
    '<text x="' +
    volCxSch +
    '" y="' +
    (tankMid + 5) +
    '" text-anchor="middle" fill="' +
    P.volWhite +
    '" font-size="12" font-weight="900" font-family="system-ui,sans-serif">' +
    vol +
    ' L</text>';
  tankLayer +=
    '<text x="' +
    volCxSch +
    '" y="' +
    (tankTop + tankH + 14) +
    '" text-anchor="middle" fill="' +
    P.depositoSub +
    '" font-size="9" font-weight="800">Depósito · recirculación</text>';

  if (showCalentador) {
    const hx = tx + 16;
    tankLayer +=
      '<rect x="' +
      (hx - 5) +
      '" y="' +
      (tankTop + tankH - 34) +
      '" width="10" height="28" rx="5" fill="' +
      P.calFill +
      '" stroke="' +
      P.calStroke +
      '" stroke-width="1.2"/>';
    tankLayer += '<circle cx="' + hx + '" cy="' + (tankTop + tankH - 40) + '" r="3.5" fill="' + P.calGlow + '"/>';
    tankLayer +=
      '<text x="' +
      hx +
      '" y="' +
      (tankTop + tankH + 2) +
      '" text-anchor="middle" font-size="7" font-weight="800" fill="' +
      P.calTextSch +
      '">CAL</text>';
  }
  if (showDifusor) {
    const ax = tx + tankW - 20;
    const ay = tankTop + tankH - 14;
    tankLayer +=
      '<line x1="' +
      ax +
      '" y1="' +
      (tankTop - 4) +
      '" x2="' +
      ax +
      '" y2="' +
      (ay - 10) +
      '" stroke="' +
      P.line575 +
      '" stroke-width="1.4" stroke-dasharray="3 2"/>';
    tankLayer +=
      '<ellipse cx="' +
      ax +
      '" cy="' +
      ay +
      '" rx="12" ry="6" fill="' +
      P.airStoneSchFill +
      '" stroke="' +
      P.line575 +
      '" stroke-width="1.2"/>';
    for (let bi = 0; bi < 5; bi++) {
      const bx = ax + (bi % 3 - 1) * 4;
      tankLayer += '<circle cx="' + bx + '" cy="' + (ay - 6 - bi * 3) + '" r="1.6" fill="' + P.bubbleSch + '" opacity="0.85"/>';
    }
    tankLayer +=
      '<text x="' +
      ax +
      '" y="' +
      (tankTop + tankH + 2) +
      '" text-anchor="middle" font-size="7" font-weight="800" fill="' +
      P.line475 +
      '">AIR</text>';
  }

  let plumbing = '';
  plumbing +=
    '<circle cx="' +
    cx +
    '" cy="' +
    (tankTop - 10) +
    '" r="11" fill="' +
    P.pumpCircleFill +
    '" stroke="' +
    P.pumpCircleStroke +
    '" stroke-width="1"/>';
  plumbing +=
    '<text x="' +
    cx +
    '" y="' +
    (tankTop - 7) +
    '" text-anchor="middle" fill="' +
    P.pumpLetter +
    '" font-size="10" font-weight="900">B</text>';
  if (bomb) {
    const txB = cx + 15;
    const y1 = tankTop - 14;
    plumbing +=
      '<text x="' +
      txB +
      '" y="' +
      y1 +
      '" text-anchor="start" fill="' +
      P.ramalText +
      '" font-size="7" font-weight="800" font-family="system-ui,sans-serif">' +
      'Bomba 24 h · criterio en asistente</text>';
  }

  const riserY1 = tankTop;
  const riserY2 = yMan + 3;
  plumbing += '<line x1="' + cx + '" y1="' + riserY1 + '" x2="' + cx + '" y2="' + riserY2 + '" ' + pipeGrey + ' opacity="0.65"/>';
  plumbing += '<line x1="' + cx + '" y1="' + riserY1 + '" x2="' + cx + '" y2="' + riserY2 + '" ' + flowSt + ' stroke-width="2" opacity="0.92"/>';

  plumbing +=
    '<line x1="' +
    x0 +
    '" y1="' +
    yMan +
    '" x2="' +
    x1 +
    '" y2="' +
    yMan +
    '" stroke="' +
    P.manifoldPipe +
    '" stroke-width="5.5" stroke-linecap="round"/>';
  plumbing += '<line x1="' + x0 + '" y1="' + yMan + '" x2="' + x1 + '" y2="' + yMan + '" ' + flowSt + ' stroke-width="1.55" opacity="0.78"/>';
  plumbing +=
    '<text x="' +
    cx +
    '" y="' +
    (yMan - 8) +
    '" text-anchor="middle" fill="' +
    P.manifoldText +
    '" font-size="8" font-weight="800">Manifold · distribución</text>';

  const chParts = [];
  for (let i = 0; i < nCh; i++) {
    const xa = x0 + i * span + 1.5;
    const w = Math.max(span - 3, 12);
    const xtl = xa;
    const ytl = yTop;
    const xtr = xa + w;
    const ytr = yTop + sk;
    const xbr = xa + w + 5;
    const ybr = yBot;
    const xbl = xa + 5;
    const ybl = yBot - sk * 0.55;
    const dCh = 'M' + xtl + ' ' + ytl + ' L' + xtr + ' ' + ytr + ' L' + xbr + ' ' + ybr + ' L' + xbl + ' ' + ybl + 'Z';

    const ix = xtl + Math.min(w * 0.2, 12);
    const peNone = interactive ? ' pointer-events="none"' : '';
    chParts.push(
      '<line x1="' +
        ix +
        '" y1="' +
        yMan +
        '" x2="' +
        (xtl + 2) +
        '" y2="' +
        (ytl + 5) +
        '" stroke="' +
        P.line475 +
        '" stroke-width="1.8" stroke-linecap="round"' +
        peNone +
        '/>'
    );
    chParts.push('<line x1="' + ix + '" y1="' + yMan + '" x2="' + (xtl + 2) + '" y2="' + (ytl + 5) + '" ' + flowSt + ' stroke-width="1.15" opacity="0.9"' + peNone + '/>');

    chParts.push(
      '<path fill="url(#' + gidFilm + ')" stroke="' + P.filmStroke + '" stroke-width="1.15" opacity="0.97" d="' + dCh + '"' + peNone + '/>'
    );

    chParts.push(
      '<path d="M' + (xbl + 3) + ' ' + (ybl + 2) + ' L' + (xbr - 4) + ' ' + (ybr - 4) + '" fill="none" ' + flowSt + ' stroke-width="1.35" opacity="0.88"' + peNone + '/>'
    );

    const innerTopLen = Math.max(xtr - xtl - 5, 2);
    const hr = Math.max(1.85, Math.min(5.6, (innerTopLen / Math.max(huecosN - 1, 1)) * 0.52));
    const alongDx = (xtr - xtl - 5) / Math.max(1, huecosN - 1);
    const alongDy = (ytr - ytl - 3) / Math.max(1, huecosN - 1);
    const slotAlong = huecosN <= 1 ? Infinity : Math.hypot(alongDx, alongDy);
    for (let j = 0; j < huecosN; j++) {
      const t = huecosN <= 1 ? 0.5 : j / (huecosN - 1);
      const px = xtl + 2.5 + t * (xtr - xtl - 5);
      const py = ytl + 4 + t * (ytr - ytl - 3);
      if (interactive) {
        const dat = (state.torre[i] && state.torre[i][j]) ? state.torre[i][j] : { variedad: '', fecha: '' };
        const cult = dat.variedad ? getCultivoDB(dat.variedad) : null;
        const nomLista = dat.variedad ? cultivoNombreLista(cult, dat.variedad) : 'vacío';
        const col = torreListaColorCesta(i, j);
        const multiKey = i + ',' + j;
        const isMulti = torreInteraccionModo === 'asignar' && torreCestasMultiSel.has(multiKey);
        const isEd = !!(typeof editingCesta !== 'undefined' && editingCesta && editingCesta.nivel === i && editingCesta.cesta === j);
        const dias =
          dat.fecha && typeof torreDiasCicloVisual === 'function'
            ? torreDiasCicloVisual(dat)
            : dat.fecha
              ? Math.max(0, Math.floor((Date.now() - new Date(dat.fecha)) / 86400000))
              : null;
        let ariaTxt = 'Canal ' + (i + 1) + ', hueco ' + (j + 1) + ', ' + nomLista;
        if (dias !== null) ariaTxt += ', día ' + dias;
        ariaTxt += '. Pulsa para abrir ficha o asignar cultivo.';
        const ptrR = nftHuecoPointerRadius(hr, true, slotAlong);
        chParts.push(
          '<g class="hc-cesta hc-nft-hueco hc-cesta-clickable" data-n="' + i + '" data-c="' + j + '" role="button" tabindex="0" aria-label="' + escAriaAttr(ariaTxt) + '">'
        );
        chParts.push(
          '<circle cx="' + px.toFixed(2) + '" cy="' + py.toFixed(2) + '" r="' + hr.toFixed(2) + '" fill="' + col.bg + '" stroke="' + col.border + '" stroke-width="0.85"/>'
        );
        if (isMulti) {
          chParts.push(
            '<circle cx="' +
            px.toFixed(2) +
            '" cy="' +
            py.toFixed(2) +
            '" r="' +
            (hr + 4).toFixed(2) +
            '" fill="none" stroke="' +
            P.ringMulti +
            '" stroke-width="1.25" stroke-dasharray="3 2"/>'
          );
        }
        if (isEd) {
          chParts.push(
            '<circle cx="' +
            px.toFixed(2) +
            '" cy="' +
            py.toFixed(2) +
            '" r="' +
            (hr + 3.5).toFixed(2) +
            '" fill="none" stroke="' +
            P.ringEdit +
            '" stroke-width="1.35"/>'
          );
        }
        chParts.push(
          '<circle cx="' + px.toFixed(2) + '" cy="' + py.toFixed(2) + '" r="' + ptrR.toFixed(2) + '" fill="rgba(0,0,0,0.001)" pointer-events="all"/>'
        );
        chParts.push('</g>');
      } else {
        chParts.push(
          '<circle cx="' +
            px.toFixed(2) +
            '" cy="' +
            py.toFixed(2) +
            '" r="' +
            hr.toFixed(2) +
            '" fill="' +
            P.cultivoFill +
            '" stroke="' +
            P.cultivoStroke +
            '" stroke-width="0.5"/>' +
            '<circle cx="' +
            px.toFixed(2) +
            '" cy="' +
            py.toFixed(2) +
            '" r="' +
            Math.max(0.55, hr * 0.42).toFixed(2) +
            '" fill="' +
            P.cultivoInner +
            '" opacity="0.55"/>'
        );
      }
    }
    chParts.push(
      '<text x="' +
        (xtl - 1) +
        '" y="' +
        (ytl + 12) +
        '" text-anchor="end" font-size="7" font-weight="900" fill="' +
        P.nivelText +
        '"' +
        peNone +
        '>' +
        (i + 1) +
        '</text>'
    );
  }

  if (interactive) {
    back = '<g pointer-events="none">' + back + '</g>';
    tankLayer = '<g pointer-events="none">' + tankLayer + '</g>';
    plumbing = '<g pointer-events="none">' + plumbing + '</g>';
  }

  let footSub = nCh + ' canales · ' + huecosN + ' huecos/canal · ' + pend + '% pendiente';
  if (bomb) {
    footSub += ' · circulación 24 h · ver asistente / checklist';
    const minV = bomb.volMinDepositoSugeridoL;
    const recV = bomb.volDepositoRecomendadoL != null ? bomb.volDepositoRecomendadoL : minV;
    if (vol < minV) {
      footSub += ' · ⚠ revisar depósito (orientativo)';
    } else if (vol < recV) {
      footSub += ' · ⚠ margen depósito: ver panel';
    }
  }
  try {
    const recoTxt2 = nftRecomendacionCultivoTextoCorto(EO.cfgSnapshot || {});
    if (recoTxt2) footSub += ' · ' + recoTxt2;
  } catch (_) {}

  return (
    '<svg class="torre-svg-diagram nft-diagram--scroll svg-fit-block" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + Wsvg + ' ' + H + '" width="100%" ' +
      'preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="' +
      tid +
      '">' +
      '<title id="' + tid + '">NFT: circuito de agua desde el depósito a los canales y retorno; tubos con huecos de plantación</title>' +
      '<defs>' +
      '<linearGradient id="' +
      gidFilm +
      '" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0%" stop-color="' +
      P.filmGrad0 +
      '"/><stop offset="100%" stop-color="' +
      P.filmGrad1 +
      '"/></linearGradient>' +
      '<linearGradient id="' +
      gidTank +
      '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' +
      P.tankGrad0 +
      '"/><stop offset="100%" stop-color="' +
      P.tankGrad1 +
      '"/></linearGradient>' +
      '<linearGradient id="' +
      gidAqua +
      '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' +
      P.filmWater0 +
      '" stop-opacity="' +
      P.filmWaterOp0 +
      '"/><stop offset="100%" stop-color="' +
      P.filmWater1 +
      '" stop-opacity="' +
      P.filmWaterOp1 +
      '"/></linearGradient>' +
      '</defs>' +
      '<text x="' +
      cxTitle +
      '" y="22" text-anchor="middle" fill="' +
      P.schematicTitle +
      '" font-size="10.5" font-weight="800" font-family="system-ui,Segoe UI,sans-serif">' +
      'Bomba · subida → manifold → canales (pendiente) → retorno al depósito</text>' +
      back +
      tankLayer +
      chParts.join('') +
      plumbing +
      '<text x="' +
      cxTitle +
      '" y="' +
      (H - 6) +
      '" text-anchor="middle" fill="' +
      P.schematicFoot +
      '" font-size="8.5" font-weight="700" font-family="system-ui,sans-serif">' +
      footSub +
      '</text>' +
      '</svg>'
  );
}

/** Borrador de config NFT desde el asistente (paso 1) para cálculo y SVG. */
function buildNftDraftConfigFromSetupUi() {
  const mont = readNftMontajeFromSetupUi();
  const canalesSlider = parseInt(document.getElementById('sliderNftCanales')?.value || 4, 10);
  const huecos = parseInt(document.getElementById('sliderNftHuecos')?.value || 8, 10);
  const pend = parseInt(document.getElementById('sliderNftPendiente')?.value || 2, 10);
  const geom = readNftCanalGeomFromSetupUi();
  const draft = {
    tipoInstalacion: 'nft',
    nftNumCanales: Math.max(1, Math.min(24, canalesSlider)),
    nftHuecosPorCanal: huecos,
    nftPendientePct: pend,
    nftTuboInteriorMm: setupNftTuboMm,
    nftDisposicion: mont.disposicion,
    nftCanalForma: geom.forma,
    nftCanalDiamMm: geom.diamMm,
    nftCanalAnchoMm: geom.anchoMm,
    nftLaminaAguaMm: geom.laminaMm,
  };
  if (geom.longCanalM != null) draft.nftLongCanalM = geom.longCanalM;
  if (mont.alturaBombeoCm > 0) draft.nftAlturaBombeoCm = mont.alturaBombeoCm;
  if (mont.disposicion === 'mesa' && mont.mesaMultinivel) {
    const tiers = parseNftMesaTubosPorNivelStr(mont.mesaTubosStr);
    if (tiers.length >= 2) {
      draft.nftMesaMultinivel = true;
      draft.nftMesaTubosPorNivelStr = tiers.join(',');
      draft.nftNumCanales = tiers.reduce((a, b) => a + b, 0);
      if (mont.mesaSepCm > 0) draft.nftMesaSeparacionNivelesCm = mont.mesaSepCm;
    }
  }
  if (mont.disposicion === 'escalera') {
    draft.nftEscaleraCaras = mont.escaleraCaras;
    draft.nftEscaleraNivelesCara = Math.max(1, Math.min(12, canalesSlider));
    draft.nftNumCanales = draft.nftEscaleraNivelesCara * mont.escaleraCaras;
  }
  const pot = typeof readNftPotCestaFromSetupUi === 'function' ? readNftPotCestaFromSetupUi() : { rimMm: null, heightMm: null };
  if (pot.rimMm != null) draft.nftNetPotRimMm = pot.rimMm;
  if (pot.heightMm != null) draft.nftNetPotHeightMm = pot.heightMm;
  return draft;
}

function refrescarNftCanalesSliderEtiqueta() {
  const el = document.getElementById('nftCanalesLabelMain');
  if (!el) return;
  const mont = readNftMontajeFromSetupUi();
  if (mont.disposicion === 'escalera') {
    el.textContent = 'Peldaños por cara';
    return;
  }
  if (mont.disposicion === 'pared') {
    el.textContent = 'Tubos apilados (pared)';
    return;
  }
  if (mont.mesaMultinivel) {
    el.textContent = 'Tubos (si multinivel válido, el total lo fija la lista)';
    return;
  }
  el.textContent = 'Tubos en el circuito (mesa)';
}

function updateNftSetupPreview() {
  const canales = parseInt(document.getElementById('sliderNftCanales')?.value || 4, 10);
  const huecos  = parseInt(document.getElementById('sliderNftHuecos')?.value || 8, 10);
  const pend    = parseInt(document.getElementById('sliderNftPendiente')?.value || 2, 10);
  const vol     = parseInt(document.getElementById('sliderVol')?.value || 20, 10);
  const elC = document.getElementById('valNftCanales');
  const elH = document.getElementById('valNftHuecos');
  const elP = document.getElementById('valNftPendiente');
  const elV = document.getElementById('valVol');
  refrescarNftCanalesSliderEtiqueta();
  const draft = buildNftDraftConfigFromSetupUi();
  const hyd = getNftHidraulicaDesdeConfig(draft);
  if (elC) elC.textContent = String(hyd.nCh);
  if (elH) elH.textContent = String(huecos);
  if (elP) elP.innerHTML = pend + '<span class="setup-inline-unit-l">%</span>';
  if (elV) elV.innerHTML = vol + '<span class="setup-inline-unit-l">L</span>';
  const mmHueMirror = document.getElementById('nftMesaHuecosMirror');
  if (mmHueMirror) mmHueMirror.textContent = String(huecos);

  try {
    renderNftCultivoRecoStatus('setup');
  } catch (_) {}

  const preview = document.getElementById('nftPreview');
  if (!preview) return;
  const bNft = getNftBombaDesdeConfig(draft);
  pintarResultadoBombaNftUI(bNft, vol);
  refrescarUIMensajeBombaUsuarioNft('setup');
  const uLh = parseFloat(String(document.getElementById('nftBombaUsuarioLh')?.value || '').replace(',', '.'));
  const uW = parseFloat(String(document.getElementById('nftBombaUsuarioW')?.value || '').replace(',', '.'));
  const altShow = draft.nftAlturaBombeoCm != null && Number(draft.nftAlturaBombeoCm) > 0
    ? Math.round(Number(draft.nftAlturaBombeoCm))
    : getNftAlturaBombeoEfectivaCm(draft);
  preview.innerHTML =
    buildNftActiveDiagramSvg(hyd.nCh, huecos, pend, vol, '', {
      calentador: setupEquipamiento.has('calentador'),
      difusor: setupEquipamiento.has('difusor'),
      bombaInfo: bNft,
      userCaudalLh: Number.isFinite(uLh) && uLh > 0 ? Math.round(uLh) : null,
      userPotenciaW: Number.isFinite(uW) && uW > 0 ? Math.round(uW) : null,
      nftDisposicion: draft.nftDisposicion,
      nftAlturaBombeoCm: altShow > 0 ? altShow : null,
      cfgSnapshot: draft,
      mesaTiers: hyd.mesaTiers,
      escaleraNiveles: hyd.escaleraNiveles,
      escaleraCaras: hyd.escaleraCaras,
    });
  refrescarDocTuberiaNftSetup();
}

function renderSetupPage() {
  // Si es nueva torre y estamos en spage7 (¿más de una torre?), saltarlo
  if (setupEsNuevaTorre && setupPagina === 7) {
    // spage7 no tiene sentido para nueva torre — guardamos directamente
    guardarSetupYContinuar();
    return;
  }

  // Ocultar todas las páginas
  document.querySelectorAll('.setup-page').forEach(p => p.classList.remove('active'));

  // Mostrar página actual
  const curr = document.getElementById('spage' + setupPagina);
  if (curr) curr.classList.add('active');

  const nomWrap = document.getElementById('setupNombreInstalacionWrap');
  const nomInp = document.getElementById('setupNombreInstalacionInput');
  if (nomWrap && nomInp) {
    const showNom = setupEsNuevaTorre && setupPagina === 1;
    nomWrap.classList.toggle('setup-hidden', !showNom);
    if (showNom && document.activeElement !== nomInp) {
      nomInp.value = setupNombreNuevaTorre || '';
    }
  }

  // Acciones específicas por página (refrescar en p.1 incluye sync del gráfico Torre/NFT)
  if (setupPagina === 0 || setupPagina === 1) refrescarSetupTipoInstalacionUI();
  if (setupPagina === 2) {
    cargarSetupSensoresHwUI();
    refreshSetupCalentadorConsignaVis();
  }
  if (setupPagina === 3) setTimeout(() => seleccionarSustrato(setupData.sustrato), 0);
  if (setupPagina === 4) { renderNutrientesGrid(); setTimeout(renderDosisSetup, 100); }
  if (setupPagina === 5) setTimeout(syncWizardLuzUI, 0);
  if (setupPagina === 6) setTimeout(renderSetupPlantasGrid, 50);
  if (setupPagina === 7) setTimeout(actualizarResumenSetup, 50);

  // Dots de progreso
  for (let i = 0; i < SETUP_TOTAL_PAGES; i++) {
    const dot = document.getElementById('sdot' + i);
    if (!dot) continue;
    dot.className = 'setup-step-dot';
    if (i < setupPagina)      dot.classList.add('done');
    else if (i === setupPagina) dot.classList.add('active');
  }

  // Labels de cada paso
  const labels = [
    'Bienvenida',        // 0
    'Geometría',         // 1 (torre, NFT o DWC)
    'Equipamiento',      // 2
    'Agua y sustrato',   // 3
    'Nutrientes',        // 4
    'Ubicación',         // 5
    'Cultivos',          // 6
    'Resumen',           // 7
  ];
  const labelEl = document.getElementById('setupStepLabel');
  if (labelEl) {
    if (setupEsNuevaTorre) {
      const nomLbl = (setupNombreNuevaTorre || '').trim() || 'Nueva instalación';
      labelEl.textContent = setupPagina === 0
        ? '🌿 ' + nomLbl + ' — configuración'
        : nomLbl + ' · Paso ' + setupPagina + ' de ' + (SETUP_TOTAL_PAGES-2) + ' — ' + (labels[setupPagina] || '');
    } else {
      labelEl.textContent = setupPagina === 0
        ? 'Bienvenido'
        : 'Paso ' + setupPagina + ' de ' + (SETUP_TOTAL_PAGES-1) + ' — ' + (labels[setupPagina] || '');
    }
  }

  // Botones navegación
  const back = document.getElementById('setupBtnBack');
  const next = document.getElementById('setupBtnNext');
  if (back) back.style.display = setupPagina > 0 ? 'block' : 'none';
  const ultimoPaso = setupEsNuevaTorre ? SETUP_TOTAL_PAGES - 2 : SETUP_TOTAL_PAGES - 1;
  if (next) {
    if (setupPagina === 0) {
      next.style.display = 'none';
      next.setAttribute('aria-hidden', 'true');
      next.tabIndex = -1;
    } else {
      next.style.display = '';
      next.removeAttribute('aria-hidden');
      next.tabIndex = 0;
      if (setupPagina === ultimoPaso) {
        next.textContent = '✅ Guardar y empezar';
        next.setAttribute('aria-label', 'Guardar configuración y empezar');
      } else {
        next.textContent = 'Siguiente →';
        next.setAttribute('aria-label', 'Continuar al siguiente paso');
      }
    }
  }
}

function setupNext() {
  if (setupPagina === 0) {
    iniciarConfiguracionTorre();
    return;
  }
  if (setupEsNuevaTorre && setupPagina === 1) {
    const inpNom = document.getElementById('setupNombreInstalacionInput');
    if (inpNom) setupNombreNuevaTorre = (inpNom.value || '').trim().slice(0, 40);
    if (!setupNombreNuevaTorre) {
      showToast('Escribe un nombre para esta instalación', true);
      inpNom?.focus();
      return;
    }
  }
  const ultimoPaso = setupEsNuevaTorre ? SETUP_TOTAL_PAGES - 2 : SETUP_TOTAL_PAGES - 1;
  if (setupPagina < ultimoPaso) {
    setupPagina++;
    renderSetupPage();
  } else {
    guardarSetupYContinuar();
  }
}

function setupBack() {
  if (setupPagina > 1) {
    setupPagina--;
    renderSetupPage();
  } else if (setupPagina === 1) {
    setupPagina = 0;
    renderSetupPage();
  }
}

/** Preview asistente paso 1 — DWC: tapa vista superior con orificios en rejilla. */
function renderDwcLidSetupPreview(previewEl, filas, cols, volLitros) {
  previewEl.innerHTML = '';
  previewEl.style.position = 'relative';
  previewEl.style.height = 'auto';
  const wrap = document.createElement('div');
  wrap.className = 'dwc-setup-lid-wrap';
  wrap.setAttribute('role', 'img');
  wrap.setAttribute(
    'aria-label',
    'Vista superior de la tapa del cubo DWC: ' +
      filas +
      ' filas de orificios y ' +
      cols +
      ' cestas por fila.'
  );
  const side = Math.min(132, Math.max(84, Math.round(10.5 * Math.max(filas, cols, 4))));
  const plate = document.createElement('div');
  plate.className = 'dwc-setup-lid-plate';
  plate.style.width = side + 'px';
  plate.style.height = side + 'px';
  plate.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
  plate.style.gridTemplateRows = 'repeat(' + filas + ', 1fr)';
  for (let i = 0; i < filas * cols; i++) {
    const hole = document.createElement('div');
    hole.className = 'dwc-setup-lid-hole';
    plate.appendChild(hole);
  }
  const cap = document.createElement('div');
  cap.className = 'dwc-setup-lid-caption';
  cap.textContent = filas + ' filas × ' + cols + ' cestas · tapa';
  const tank = document.createElement('div');
  tank.className = 'dwc-setup-lid-tank';
  tank.title = 'Depósito · ~' + volLitros + ' L de solución';
  tank.style.width = Math.min(side + 8, 112) + 'px';
  wrap.appendChild(plate);
  wrap.appendChild(cap);
  wrap.appendChild(tank);
  previewEl.appendChild(wrap);
}

function updateTorreBuilder() {
  if (setupTipoInstalacion === 'nft') {
    updateNftSetupPreview();
    return;
  }
  const niveles = parseInt(document.getElementById('sliderNiveles')?.value || 5);
  const cestas  = parseInt(document.getElementById('sliderCestas')?.value  || 5);
  const volSlider = parseInt(document.getElementById('sliderVol')?.value || 20, 10);
  const dwcCap = getDwcCapacidadLitrosFromSetupInputs();
  const volDepDwc =
    dwcCap != null && dwcCap > 0 ? Math.round(dwcCap * 10) / 10 : volSlider;

  document.getElementById('valNiveles').textContent = niveles;
  document.getElementById('valCestas').textContent  = cestas;
  const elVol = document.getElementById('valVol');
  if (elVol) {
    if (setupTipoInstalacion === 'dwc' && dwcCap != null && dwcCap > 0) {
      elVol.innerHTML =
        volDepDwc + '<span class="setup-inline-unit-l">L</span>';
    } else if (setupTipoInstalacion === 'dwc') {
      elVol.innerHTML =
        volSlider +
        '<span class="setup-inline-unit-l">L</span>' +
        '<span class="setup-inline-approx"> (aprox.)</span>';
    } else {
      elVol.textContent = volSlider;
    }
  }

  const preview = document.getElementById('torrePreview');
  if (!preview) return;

  if (setupTipoInstalacion === 'dwc') {
    preview.classList.add('torre-preview--dwc');
    renderDwcLidSetupPreview(preview, niveles, cestas, volDepDwc);
    try {
      refreshDwcTapHintSetup();
    } catch (eHint) {}
    return;
  }
  preview.classList.remove('torre-preview--dwc');

  // Actualizar preview visual de la torre vertical
  preview.innerHTML = '';

  // Pipe central
  const pipe = document.createElement('div');
  pipe.className = 'torre-preview-pipe';
  pipe.style.height = (niveles * 18 + 20) + 'px';
  preview.appendChild(pipe);

  // Niveles (superpuestos sobre el pipe con position absolute)
  preview.style.position = 'relative';
  preview.style.height = (niveles * 22 + 40) + 'px';
  pipe.style.position = 'absolute';
  pipe.style.left = '50%';
  pipe.style.top = '0';
  pipe.style.transform = 'translateX(-50%)';

  for (let n = 0; n < niveles; n++) {
    const nivel = document.createElement('div');
    nivel.className = 'torre-preview-nivel';
    nivel.style.position = 'absolute';
    nivel.style.top = (n * 20) + 'px';
    nivel.style.left = '50%';
    nivel.style.transform = 'translateX(-50%)';
    nivel.style.width = Math.min(70, 30 + cestas * 8) + 'px';
    nivel.style.opacity = 0.6 + (n / niveles) * 0.4;
    preview.appendChild(nivel);
  }

  // Depósito
  const dep = document.createElement('div');
  dep.className = 'torre-preview-deposito';
  dep.style.position = 'absolute';
  dep.style.bottom = '0';
  dep.style.left = '50%';
  dep.style.transform = 'translateX(-50%)';
  dep.style.width = Math.min(70, 30 + volSlider * 0.5) + 'px';
  dep.title = volSlider + 'L';
  preview.appendChild(dep);
}

function toggleUbic(tipo) {
  setupUbicacion = tipo;
  setupData.ubicacion = tipo;
  document.getElementById('eqExterior').className = 'equip-card' + (tipo === 'exterior' ? ' selected' : '');
  document.getElementById('eqInterior').className = 'equip-card' + (tipo === 'interior' ? ' selected' : '');
}

function toggleEquip(id) {
  const card = document.getElementById('eq' + id.charAt(0).toUpperCase() + id.slice(1));
  if (setupEquipamiento.has(id)) {
    setupEquipamiento.delete(id);
    card.className = 'equip-card';
  } else {
    setupEquipamiento.add(id);
    card.className = 'equip-card selected';
  }
  refreshSetupCalentadorConsignaVis();
}

function refreshSetupCalentadorConsignaVis() {
  const wrap = document.getElementById('setupCalentadorConsignaWrap');
  if (!wrap) return;
  wrap.classList.toggle('setup-hidden', !setupEquipamiento.has('calentador'));
}

const SETUP_EQUIP_IDS = ['difusor', 'calentador', 'bomba', 'timer', 'medidorEC', 'toldo'];

function refreshSetupEquipamientoCardsDesdeSet() {
  for (let j = 0; j < SETUP_EQUIP_IDS.length; j++) {
    const eid = SETUP_EQUIP_IDS[j];
    const card = document.getElementById('eq' + eid.charAt(0).toUpperCase() + eid.slice(1));
    if (card) card.className = 'equip-card' + (setupEquipamiento.has(eid) ? ' selected' : '');
  }
}

function syncSetupEquipamientoDesdeConfig(cfg) {
  const c = cfg || {};
  setupEquipamiento = new Set();
  const eqSaved = Array.isArray(c.equipamiento) ? c.equipamiento : [];
  for (let i = 0; i < SETUP_EQUIP_IDS.length; i++) {
    if (eqSaved.includes(SETUP_EQUIP_IDS[i])) setupEquipamiento.add(SETUP_EQUIP_IDS[i]);
  }
  if (setupEquipamiento.size === 0) {
    setupEquipamiento = new Set(['difusor', 'calentador', 'bomba']);
  }
  refreshSetupEquipamientoCardsDesdeSet();
  const ccInp = document.getElementById('setupCalentadorConsignaC');
  if (ccInp) {
    const v = Number(c.calentadorConsignaC);
    ccInp.value =
      Number.isFinite(v) && v >= 10 && v <= 35 ? String(Math.round(v * 10) / 10) : '20';
  }
  refreshSetupCalentadorConsignaVis();
}

function ensureSetupSensoresHardware() {
  if (!setupData.sensoresHardware) {
    setupData.sensoresHardware = { ec: false, ph: false, humedad: false };
  }
  return setupData.sensoresHardware;
}

function cargarSetupSensoresHwUI() {
  const s = ensureSetupSensoresHardware();
  const e = document.getElementById('setupSensHwEC');
  const p = document.getElementById('setupSensHwPH');
  const h = document.getElementById('setupSensHwHum');
  if (e) e.checked = !!s.ec;
  if (p) p.checked = !!s.ph;
  if (h) h.checked = !!s.humedad;
}

function persistSetupSensoresHardware() {
  const s = ensureSetupSensoresHardware();
  s.ec = !!document.getElementById('setupSensHwEC')?.checked;
  s.ph = !!document.getElementById('setupSensHwPH')?.checked;
  s.humedad = !!document.getElementById('setupSensHwHum')?.checked;
}

function renderNutrientesGrid() {
  const grid = document.getElementById('nutrientesGrid');
  if (!grid) return;
  grid.innerHTML = NUTRIENTES_DB.map(n => `
    <button type="button" class="nutriente-card ${n.id === setupNutriente ? 'selected' : ''}"
      id="nut-${n.id}" onclick="selNutriente('${n.id}')" aria-pressed="${n.id === setupNutriente ? 'true' : 'false'}"
      aria-label="Nutriente ${n.nombre}${n.buffer ? ', con buffer de pH' : ''}">
      <span class="nutriente-bandera" aria-hidden="true">${n.bandera}</span>
      <span class="nutriente-info">
        <span class="nutriente-nombre">${n.nombre}</span>
        <span class="nutriente-detalle">${n.detalle}</span>
      </span>
      <span class="nutriente-buffer ${n.buffer ? 'si' : 'no'}" aria-hidden="true">
        ${n.buffer ? 'pH buffer' : 'Sin buffer'}
      </span>
    </button>
  `).join('');
}

