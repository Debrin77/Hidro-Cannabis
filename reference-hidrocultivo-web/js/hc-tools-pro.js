/**
 * Herramientas Pro (Medir): calculadoras rápidas conectadas al asistente.
 */
(function () {
  function el(id) { return document.getElementById(id); }
  function num(id) {
    const raw = String(el(id)?.value || '').trim().replace(',', '.');
    const n = Number(raw);
    return Number.isFinite(n) ? n : NaN;
  }
  function fmt(n, d) {
    if (!Number.isFinite(n)) return '—';
    return (Math.round(n * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
  }
  function esc(v) {
    return String(v || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function open() {
    const m = el('modalHerramientasPro');
    if (!m) return;
    m.classList.add('open');
    m.setAttribute('aria-hidden', 'false');
    if (typeof a11yDialogOpened === 'function') a11yDialogOpened(m);
    prefll();
  }
  function close(ev) {
    const m = el('modalHerramientasPro');
    if (!m || !m.classList.contains('open')) return;
    if (ev && ev.currentTarget === m && ev.target !== m) return;
    m.classList.remove('open');
    m.setAttribute('aria-hidden', 'true');
    if (typeof a11yDialogClosed === 'function') a11yDialogClosed(m);
  }

  function prefll() {
    const ph = String(el('inputPH')?.value || '').trim();
    const vol = String(el('inputVol')?.value || '').trim();
    const cfg = (typeof state !== 'undefined' && state && state.configTorre) ? state.configTorre : {};
    const esRdwc =
      (typeof tipoInstalacionNormalizado === 'function' ? tipoInstalacionNormalizado(cfg) : cfg.tipoInstalacion) === 'rdwc';
    if (!el('toolPhActual')?.value && ph) el('toolPhActual').value = ph;
    if (!el('toolDilVol')?.value && vol && !esRdwc) el('toolDilVol').value = vol;
    if (!el('toolPhVol')?.value && vol && !esRdwc) el('toolPhVol').value = vol;
    try {
      const vObj =
        typeof getVolumenNutrientesLitros === 'function'
          ? getVolumenNutrientesLitros(cfg)
          : (typeof getVolumenMezclaLitros === 'function' ? getVolumenMezclaLitros(cfg) : NaN);
      if ((!el('toolDilVol')?.value || esRdwc) && Number.isFinite(vObj)) el('toolDilVol').value = String(vObj);
      if ((!el('toolPhVol')?.value || esRdwc) && Number.isFinite(vObj)) el('toolPhVol').value = String(vObj);
      const ecObj = (typeof getEcObjetivoManualUs === 'function') ? getEcObjetivoManualUs(cfg) : null;
      if (!el('toolDilEcObjetivo')?.value && Number.isFinite(ecObj)) el('toolDilEcObjetivo').value = String(Math.round(ecObj));
    } catch (_) {}
    populateNutrientes();
  }

  function getNutrientesList() {
    // En este proyecto NUTRIENTES_DB está declarado global con `const`, no siempre en window.
    const list = (typeof NUTRIENTES_DB !== 'undefined' && Array.isArray(NUTRIENTES_DB))
      ? NUTRIENTES_DB
      : (Array.isArray(window.NUTRIENTES_DB) ? window.NUTRIENTES_DB : []);
    return list.filter((n) => n && n.id && n.id !== 'otro');
  }

  function getNutById(id) {
    const list = getNutrientesList();
    const hit = list.find((n) => String(n.id) === String(id));
    return hit || null;
  }

  function getNutActivoId() {
    try {
      const cfg = (typeof state !== 'undefined' && state && state.configTorre) ? state.configTorre : {};
      if (cfg.nutriente) return String(cfg.nutriente);
    } catch (_) {}
    try {
      if (typeof getNutrienteTorre === 'function') {
        const n = getNutrienteTorre();
        if (n && n.id) return String(n.id);
      }
    } catch (_) {}
    return '';
  }

  function populateNutrientes() {
    const selA = el('toolNutrienteA');
    const selB = el('toolNutrienteB');
    if (!selA || !selB) return;
    const list = getNutrientesList();
    if (!list.length) return;
    const act = getNutActivoId();
    const html = list.map((n) => {
      const activeTag = String(n.id) === act ? ' (activo)' : '';
      return '<option value="' + String(n.id).replace(/"/g, '&quot;') + '">' +
        String(n.nombre || n.id).replace(/</g, '&lt;').replace(/>/g, '&gt;') + activeTag +
        '</option>';
    }).join('');
    selA.innerHTML = html;
    selB.innerHTML = html;
    if (act && list.some((n) => String(n.id) === act)) selA.value = act;
    if (list.length > 1) {
      const alt = list.find((n) => String(n.id) !== String(selA.value));
      if (alt) selB.value = String(alt.id);
    } else {
      selB.value = selA.value;
    }
  }

  function ecUpPerMlInVol(nut, vol) {
    const base = (nut && Number.isFinite(Number(nut.ecPorMl)) && Number(nut.ecPorMl) > 0) ? Number(nut.ecPorMl) : 33;
    return base * (18 / vol);
  }

  function doseForDeficitUs(deficit, vol, nut) {
    if (!(deficit > 0) || !(vol > 0)) return 0;
    const slope = ecUpPerMlInVol(nut, vol);
    if (!(slope > 0)) return 0;
    return deficit / slope;
  }

  function calcDoseBreakdown(ecActual, ecObjetivo, vol, nut) {
    const deficit = Math.max(0, ecObjetivo - ecActual);
    const porParte = doseForDeficitUs(deficit, vol, nut);
    const partes = Math.max(1, Number(nut?.partes || 2));
    const total = porParte * partes;
    return { deficit, porParte, partes, total };
  }

  function ecFromUs() {
    const us = num('toolEcUs');
    if (!Number.isFinite(us)) return;
    el('toolEcMs').value = fmt(us / 1000, 3);
  }
  function ecFromMs() {
    const ms = num('toolEcMs');
    if (!Number.isFinite(ms)) return;
    el('toolEcUs').value = String(Math.round(ms * 1000));
  }

  function calcDilution() {
    const ecO = num('toolDilEcObjetivo');
    const ecBaseRaw = num('toolDilEcBase');
    const vol = num('toolDilVol');
    const out = el('toolDilResult');
    if (!out) return;
    if (!Number.isFinite(ecO) || !Number.isFinite(vol) || vol <= 0) {
      out.textContent = 'Introduce EC objetivo final y volumen del depósito.';
      return;
    }
    const nutId = String(el('toolNutrienteA')?.value || '');
    const nut = getNutById(nutId) || (typeof getNutrienteTorre === 'function' ? getNutrienteTorre() : null);
    const ecBase = Number.isFinite(ecBaseRaw) && ecBaseRaw >= 0 ? ecBaseRaw : 0;
    const ecNutr = Math.max(0, ecO - ecBase);
    const dose = calcDoseBreakdown(0, ecNutr, vol, nut);
    const ml = dose.porParte;
    const partes = dose.partes;
    const nombre = String(nut?.nombre || 'nutriente');

    if (!Number.isFinite(ml) || ml <= 0) { out.textContent = 'No se pudo estimar dosis.'; return; }
    out.textContent = (partes <= 1)
      ? ('Objetivo ' + Math.round(ecO) + ' µS/cm con ' + nombre + ': ~' + fmt(ml, 1) + ' ml total.')
      : ('Objetivo ' + Math.round(ecO) + ' µS/cm con ' + nombre + ': ~' + fmt(ml, 1) + ' ml por parte (' + partes + ' partes · total ~' + fmt(dose.total, 1) + ' ml).');
  }

  function compareNutrients() {
    const out = el('toolDilResult');
    const box = el('toolNutCompareCards');
    const altBtn = el('toolUseAltBtn');
    if (!out) return;
    const ecO = num('toolDilEcObjetivo');
    const vol = num('toolDilVol');
    if (!Number.isFinite(ecO) || !Number.isFinite(vol) || vol <= 0) {
      out.textContent = 'Para comparar nutrientes, completa EC objetivo y volumen.';
      if (box) { box.classList.add('setup-hidden'); box.innerHTML = ''; }
      return;
    }
    const ecBaseRaw = num('toolDilEcBase');
    const ecBase = Number.isFinite(ecBaseRaw) && ecBaseRaw >= 0 ? ecBaseRaw : 0;
    const ecNetObjetivo = Math.max(0, ecO - ecBase);
    const idA = String(el('toolNutrienteA')?.value || '');
    const idB = String(el('toolNutrienteB')?.value || '');
    const na = getNutById(idA) || (typeof getNutrienteTorre === 'function' ? getNutrienteTorre() : null);
    const ns = getNutById(idB) || na;
    if (!na || !ns) {
      out.textContent = 'No hay nutrientes disponibles para comparar.';
      if (box) { box.classList.add('setup-hidden'); box.innerHTML = ''; }
      if (altBtn) altBtn.style.display = 'none';
      return;
    }
    const da = calcDoseBreakdown(0, ecNetObjetivo, vol, na);
    const ds = calcDoseBreakdown(0, ecNetObjetivo, vol, ns);
    const mla = da.porParte;
    const mls = ds.porParte;
    const txtA = (na ? na.nombre : 'activo') + ': ~' + fmt(mla, 1) + ' ml/parte (total ~' + fmt(da.total, 1) + ' ml)';
    const txtS = (ns ? ns.nombre : 'seleccionado') + ': ~' + fmt(mls, 1) + ' ml/parte (total ~' + fmt(ds.total, 1) + ' ml)';
    const diff = Number.isFinite(da.total) && Number.isFinite(ds.total) ? Math.abs(ds.total - da.total) : NaN;
    const selBetter = Number.isFinite(da.total) && Number.isFinite(ds.total) && ds.total < da.total;
    const actBetter = Number.isFinite(da.total) && Number.isFinite(ds.total) && da.total < ds.total;
    const same = Number.isFinite(da.total) && Number.isFinite(ds.total) && Math.abs(da.total - ds.total) < 0.1;
    const ahorroTxt = Number.isFinite(diff) ? ('Ahorro estimado: ' + fmt(diff, 1) + ' ml/parte.') : '';
    const better = same
      ? 'Dosis similar entre ambos.'
      : (selBetter ? ('Recomendado: seleccionado. ' + ahorroTxt) : (actBetter ? ('Recomendado: activo. ' + ahorroTxt) : ''));
    const recomendacion = same ? 'Empate técnico' : (selBetter ? 'Usar seleccionado' : 'Mantener activo');
    out.innerHTML =
      '<div class="tools-pro-result-head">' +
        '<span class="tools-pro-result-title">Comparativa lista</span>' +
        '<span class="tools-pro-result-pill">' + esc(recomendacion) + '</span>' +
      '</div>' +
      '<div class="tools-pro-result-body">' + esc(better || (txtA + ' | ' + txtS)) + '</div>';

    if (box) {
      box.classList.remove('setup-hidden');
      box.innerHTML =
        '<div class="tools-pro-compare-card ' + (actBetter ? 'is-better' : '') + '">' +
          '<h5>Activo</h5>' +
          (actBetter ? '<span class="tools-pro-badge-best">Mejor opción</span>' : '') +
          '<strong>' + esc(na ? na.nombre : 'Activo') + '</strong>' +
          '<div class="tools-pro-kpi-row">' +
            '<div class="tools-pro-kpi"><span>ml/parte</span><b>' + fmt(mla, 1) + '</b></div>' +
            '<div class="tools-pro-kpi"><span>total ml</span><b>' + fmt(da.total, 1) + '</b></div>' +
          '</div>' +
        '</div>' +
        '<div class="tools-pro-compare-card ' + (selBetter ? 'is-better' : '') + '">' +
          '<h5>Seleccionado</h5>' +
          (selBetter ? '<span class="tools-pro-badge-best">Mejor opción</span>' : '') +
          '<strong>' + esc(ns ? ns.nombre : 'Seleccionado') + '</strong>' +
          '<div class="tools-pro-kpi-row">' +
            '<div class="tools-pro-kpi"><span>ml/parte</span><b>' + fmt(mls, 1) + '</b></div>' +
            '<div class="tools-pro-kpi"><span>total ml</span><b>' + fmt(ds.total, 1) + '</b></div>' +
          '</div>' +
        '</div>';
      _altNutId = selBetter ? String(ns?.id || '') : '';
    }
    if (altBtn) altBtn.style.display = selBetter ? 'inline-flex' : 'none';
  }

  function calcPh() {
    const pA = num('toolPhActual');
    const pO = num('toolPhObjetivo');
    const vol = num('toolPhVol');
    const out = el('toolPhResult');
    if (!out) return;
    if (!Number.isFinite(pA) || !Number.isFinite(pO) || !Number.isFinite(vol) || vol <= 0) {
      out.textContent = 'Introduce pH actual, objetivo y volumen.';
      return;
    }
    const delta = Math.abs(pO - pA);
    const factor = vol / 18;
    const plus = (typeof PH_PLUS_POR_ML !== 'undefined' ? PH_PLUS_POR_ML : 0.34);
    const minus = (typeof PH_MINUS_POR_ML !== 'undefined' ? PH_MINUS_POR_ML : 0.40);
    if (pA < pO) {
      const ml = Math.max(0.5, (delta / plus) * factor);
      out.textContent = 'pH+ estimado: +' + fmt(ml, 1) + ' ml (en microdosis y re-medir).';
    } else if (pA > pO) {
      const ml = Math.max(0.5, (delta / minus) * factor);
      out.textContent = 'pH- estimado: -' + fmt(ml, 1) + ' ml (en microdosis y re-medir).';
    } else {
      out.textContent = 'Ya está en el objetivo.';
    }
  }

  function calcLed() {
    const etapa = String(el('toolLedEtapa')?.value || 'semilla');
    const tipo = String(el('toolLedTipo')?.value || 'panel');
    const wmax = num('toolLedWmax');
    const area = num('toolLedArea');
    const out = el('toolLedResult');
    if (!out) return;
    if (!Number.isFinite(wmax) || wmax <= 0) {
      out.textContent = 'Introduce la potencia maxima de tu luminaria LED.';
      return;
    }

    const baseByStage = {
      semilla: { distMin: 40, distMax: 55, powerPct: 28, hours: '16 h', ppfd: '90-140' },
      emergencia: { distMin: 35, distMax: 45, powerPct: 38, hours: '16-18 h', ppfd: '120-180' },
      plantula_temprana: { distMin: 30, distMax: 38, powerPct: 50, hours: '16-18 h', ppfd: '170-230' },
      plantula_avanzada: { distMin: 24, distMax: 32, powerPct: 62, hours: '14-16 h', ppfd: '220-320' }
    };
    const typeAdj = {
      barra: { dist: -2, pct: -4 },
      panel: { dist: 0, pct: 0 },
      foco: { dist: 5, pct: -8 },
      quantum: { dist: 3, pct: -10 }
    };
    const stage = baseByStage[etapa] || baseByStage.semilla;
    const tAdj = typeAdj[tipo] || typeAdj.panel;
    let pct = Math.max(18, Math.min(90, stage.powerPct + tAdj.pct));
    let distMin = Math.max(16, stage.distMin + tAdj.dist);
    let distMax = Math.max(distMin + 4, stage.distMax + tAdj.dist);

    if (Number.isFinite(area) && area > 0) {
      const densidad = wmax / area;
      if (densidad > 280) { pct = Math.max(18, pct - 8); distMin += 4; distMax += 5; }
      else if (densidad < 120) { pct = Math.min(90, pct + 6); distMin = Math.max(14, distMin - 2); distMax = Math.max(distMin + 4, distMax - 2); }
    }

    const wattsWork = wmax * (pct / 100);
    const etapaLabel = {
      semilla: 'Semilla',
      emergencia: 'Emergencia',
      plantula_temprana: 'Plantula temprana',
      plantula_avanzada: 'Plantula avanzada'
    }[etapa] || 'Semilla';
    out.innerHTML =
      '<div class="tools-pro-result-head">' +
        '<span class="tools-pro-result-title">Plan de luz LED</span>' +
        '<span class="tools-pro-result-pill">' + esc(etapaLabel) + '</span>' +
      '</div>' +
      '<div class="tools-pro-led-grid">' +
        '<div class="tools-pro-kpi"><span>Altura</span><b>' + fmt(distMin, 0) + '-' + fmt(distMax, 0) + ' cm</b></div>' +
        '<div class="tools-pro-kpi"><span>Potencia</span><b>' + fmt(pct, 0) + '%</b></div>' +
        '<div class="tools-pro-kpi"><span>W estimados</span><b>' + fmt(wattsWork, 0) + ' W</b></div>' +
        '<div class="tools-pro-kpi"><span>Fotoperiodo</span><b>' + esc(stage.hours) + '</b></div>' +
      '</div>' +
      '<div class="tools-pro-result-body">Objetivo PPFD orientativo: ' + esc(stage.ppfd) + ' umol/m2/s. Ajusta en pasos de 5% cada 24 h.</div>';
  }

  function useCurrent() { prefll(); }

  function applyToWizard(type) {
    const openWizard = typeof abrirWizardMedicion === 'function';
    if (openWizard) abrirWizardMedicion();
    if (type === 'dilution' || type === 'dilution_alt') {
      const ecO = num('toolDilEcObjetivo');
      const vol = num('toolDilVol');
      if (Number.isFinite(ecO) && el('wizEC')) el('wizEC').value = String(Math.round(ecO));
      if (Number.isFinite(vol) && el('wizVol')) el('wizVol').value = fmt(vol, 1);
      if (el('wizReposicionAguaChk')) el('wizReposicionAguaChk').checked = true;
      if (type === 'dilution_alt') {
        const alt = String(el('toolNutrienteB')?.value || '');
        const aplicarGlobal = typeof confirm === 'function'
          ? confirm('¿Quieres dejar este nutriente como activo en la instalación?\n\nAceptar = cambiar nutriente activo global.\nCancelar = usar solo en este cálculo/asistente.')
          : true;
        if (aplicarGlobal && alt && typeof state !== 'undefined' && state && state.configTorre) {
          state.configTorre.nutriente = alt;
          if (typeof saveState === 'function') saveState();
          if (typeof updateDashboard === 'function') updateDashboard();
        }
      }
    } else if (type === 'ph') {
      const pA = num('toolPhActual');
      if (Number.isFinite(pA) && el('wizPH')) el('wizPH').value = fmt(pA, 1);
      if (el('wizAjustePhChk')) el('wizAjustePhChk').checked = true;
    }
    close();
    if (typeof showToast === 'function') showToast('✅ Datos aplicados al Asistente de mediciones');
  }

  window.abrirHerramientasPro = open;
  window.cerrarHerramientasPro = close;
  window.toolsProUseCurrent = useCurrent;
  window.toolsProEcConvertFromUs = ecFromUs;
  window.toolsProEcConvertFromMs = ecFromMs;
  window.toolsProCalcDilution = calcDilution;
  window.toolsProCalcPh = calcPh;
  window.toolsProCalcLed = calcLed;
  window.toolsProApplyToWizard = applyToWizard;
  window.toolsProCompareNutrients = compareNutrients;
})();

