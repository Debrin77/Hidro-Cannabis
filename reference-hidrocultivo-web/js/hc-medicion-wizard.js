/**
 * Wizard de medición (Medir): guía 3 pasos y registra ajustes en Historial → Registro.
 * Depende de guardarMedicion() y addRegistro().
 */
(function () {
  let step = 1;
  let busy = false;

  function el(id) { return document.getElementById(id); }
  function txt(v) { return String(v == null ? '' : v); }

  function setDots() {
    ['wizDot1', 'wizDot2', 'wizDot3'].forEach((id, idx) => {
      const d = el(id);
      if (!d) return;
      d.classList.toggle('is-active', (idx + 1) === step);
    });
  }

  function showStep(n) {
    step = Math.max(1, Math.min(3, Number(n) || 1));
    const p1 = el('wizPage1');
    const p2 = el('wizPage2');
    const p3 = el('wizPage3');
    if (p1) p1.classList.toggle('setup-hidden', step !== 1);
    if (p2) p2.classList.toggle('setup-hidden', step !== 2);
    if (p3) p3.classList.toggle('setup-hidden', step !== 3);

    const back = el('wizBackBtn');
    const next = el('wizNextBtn');
    if (back) back.disabled = step === 1 || busy;
    if (next) next.textContent = step === 3 ? (busy ? 'Guardando…' : 'Guardar') : 'Siguiente';
    if (next) next.disabled = busy;
    setDots();

    try {
      const focusId = step === 1 ? 'wizEC' : step === 2 ? 'wizRecargaCompleta' : 'wizNotas';
      const f = el(focusId);
      if (f && typeof f.focus === 'function') setTimeout(() => f.focus(), 30);
    } catch (_) {}
  }

  function numFromAny(raw) {
    const s = txt(raw).trim().replace(',', '.');
    if (!s) return '';
    const n = Number(s);
    return Number.isFinite(n) ? String(n) : '';
  }

  function parseRangeFromText(raw) {
    const s = txt(raw).replace(/,/g, '.');

    // Caso principal: rango "A - B" o "A – B" (la fuente visual de Medir).
    const mRange = s.match(/(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)/);
    if (mRange) {
      const a = Number(mRange[1]);
      const b = Number(mRange[2]);
      if (Number.isFinite(a) && Number.isFinite(b)) {
        return { min: Math.min(a, b), max: Math.max(a, b) };
      }
    }

    // Fallback para formatos tipo "Objetivo 1700 ±100".
    const mTol = s.match(/(\d+(?:\.\d+)?)\s*±\s*(\d+(?:\.\d+)?)/);
    if (mTol) {
      const c = Number(mTol[1]);
      const tol = Number(mTol[2]);
      if (Number.isFinite(c) && Number.isFinite(tol)) {
        return { min: c - tol, max: c + tol };
      }
    }

    return null;
  }

  function getManualRangeText(id) {
    return txt(el(id)?.textContent || '').trim();
  }

  function syncWizardRangeLabels(t) {
    const ecText = getManualRangeText('paramRangeEC');
    const phText = getManualRangeText('paramRangePH');
    const ecOpt = el('wizEcOptRange');
    const phOpt = el('wizPhOptRange');
    if (ecOpt) ecOpt.textContent = ecText || ('Óptimo ' + t.ecMin + ' - ' + t.ecMax + ' µS/cm');
    if (phOpt) phOpt.textContent = phText || ('Óptimo ' + t.phMin + ' - ' + t.phMax);
  }

  function getTargets() {
    const cfg = (typeof state !== 'undefined' && state && state.configTorre) ? state.configTorre : {};
    const out = {
      ecMin: 1300,
      ecMax: 1400,
      phMin: 5.5,
      phMax: 6.5,
      tempMin: 18,
      tempMax: 22,
      volTarget: 18
    };
    try {
      const ecObj = typeof getEcObjetivoManualUs === 'function' ? getEcObjetivoManualUs(cfg) : null;
      if (Number.isFinite(ecObj)) {
        out.ecMin = Math.round(ecObj - 50);
        out.ecMax = Math.round(ecObj + 50);
      } else if (typeof getECOptimaTorre === 'function') {
        const ec = getECOptimaTorre();
        if (ec && Number.isFinite(Number(ec.min)) && Number.isFinite(Number(ec.max))) {
          out.ecMin = Number(ec.min);
          out.ecMax = Number(ec.max);
        }
      }
    } catch (_) {}
    try {
      if (typeof getPhOptimaTorre === 'function') {
        const nut = typeof getNutrienteTorre === 'function' ? getNutrienteTorre() : null;
        const ph = getPhOptimaTorre(nut, cfg);
        if (Array.isArray(ph) && Number.isFinite(Number(ph[0])) && Number.isFinite(Number(ph[1]))) {
          out.phMin = Number(ph[0]);
          out.phMax = Number(ph[1]);
        }
      }
    } catch (_) {}
    try {
      if (typeof getVolumenNutrientesLitros === 'function' || typeof getVolumenMezclaLitros === 'function') {
        const v = Number(
          typeof getVolumenNutrientesLitros === 'function'
            ? getVolumenNutrientesLitros(cfg)
            : getVolumenMezclaLitros(cfg)
        );
        if (Number.isFinite(v) && v > 0) out.volTarget = v;
      }
    } catch (_) {}

    // Prioridad final: usar exactamente los rangos mostrados en entrada manual de Medir.
    try {
      const ecFromManual = parseRangeFromText(getManualRangeText('paramRangeEC'));
      if (ecFromManual) {
        out.ecMin = ecFromManual.min;
        out.ecMax = ecFromManual.max;
      }
    } catch (_) {}
    try {
      const phFromManual = parseRangeFromText(getManualRangeText('paramRangePH'));
      if (phFromManual) {
        out.phMin = phFromManual.min;
        out.phMax = phFromManual.max;
      }
    } catch (_) {}
    return out;
  }

  function htmlToText(html) {
    const s = txt(html || '');
    return s
      .replace(/<br\s*\/?>/gi, ' · ')
      .replace(/<\/div>/gi, ' · ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function getManualCorrectionsSnapshot(ecRaw, phRaw, tempRaw, volRaw) {
    if (typeof evalEC !== 'function' || typeof evalPH !== 'function' || typeof evalTemp !== 'function' || typeof evalVol !== 'function') {
      return null;
    }
    const ec = Number.isFinite(Number(ecRaw)) ? Number(ecRaw) : NaN;
    const ph = Number.isFinite(Number(phRaw)) ? Number(phRaw) : NaN;
    const temp = Number.isFinite(Number(tempRaw)) ? Number(tempRaw) : NaN;
    const vol = Number.isFinite(Number(volRaw)) ? Number(volRaw) : NaN;

    const snap = {
      status: {},
      correccionHtml: {
        correccionEC: '',
        correccionPH: '',
        correccionTemp: '',
        correccionVol: ''
      }
    };

    const oldSetStatus = (typeof setStatus === 'function') ? setStatus : null;
    const oldSetCard = (typeof setCard === 'function') ? setCard : null;
    const oldShowCorreccion = (typeof showCorreccion === 'function') ? showCorreccion : null;

    try {
      // Capturar salida del motor de corrección real (Medir) sin tocar el DOM del wizard.
      window.setStatus = function (id, tipo, icono, texto) {
        snap.status[id] = { tipo, icono, texto };
      };
      window.setCard = function () {};
      window.showCorreccion = function (id, html) {
        if (id && Object.prototype.hasOwnProperty.call(snap.correccionHtml, id)) {
          snap.correccionHtml[id] = html || '';
        }
      };

      evalEC(ec, vol);
      evalPH(ph, vol);
      evalTemp(temp);
      evalVol(vol, ec, ph);
    } catch (_) {
      // si algo falla, devolvemos null y caemos al plan B
      return null;
    } finally {
      if (oldSetStatus) window.setStatus = oldSetStatus;
      else try { delete window.setStatus; } catch (_) {}
      if (oldSetCard) window.setCard = oldSetCard;
      else try { delete window.setCard; } catch (_) {}
      if (oldShowCorreccion) window.showCorreccion = oldShowCorreccion;
      else try { delete window.showCorreccion; } catch (_) {}
    }

    return snap;
  }

  function getCorrections() {
    const t = getTargets();
    const ec = valNum('wizEC');
    const ph = valNum('wizPH');
    const temp = valNum('wizTemp');
    const vol = valNum('wizVol');

    const manual = getManualCorrectionsSnapshot(
      ec ? Number(ec) : NaN,
      ph ? Number(ph) : NaN,
      temp ? Number(temp) : NaN,
      vol ? Number(vol) : NaN
    );

    if (manual) {
      const blocks = [
        manual.correccionHtml.correccionEC,
        manual.correccionHtml.correccionPH,
        manual.correccionHtml.correccionTemp,
        manual.correccionHtml.correccionVol
      ].filter(Boolean);
      const items = blocks.map(htmlToText).filter(Boolean);
      return { items, targets: t, manualBlocksHtml: blocks };
    }

    // Plan B: recomendaciones simples (por si la lógica de Medir no está cargada)
    const items = [];
    const ecN = Number(ec || NaN);
    const phN = Number(ph || NaN);
    const tempN = Number(temp || NaN);
    const volN = Number(vol || NaN);
    if (Number.isFinite(ecN)) {
      if (ecN < t.ecMin) items.push('EC baja (' + ecN + '): sube concentración de nutrientes en pequeños pasos y re-mide (meta ' + t.ecMin + '–' + t.ecMax + ').');
      else if (ecN > t.ecMax) items.push('EC alta (' + ecN + '): diluye la mezcla para volver a ' + t.ecMin + '–' + t.ecMax + '.');
    }
    if (Number.isFinite(phN)) {
      if (phN < t.phMin) items.push('pH bajo (' + phN + '): corrige con pH+ en dosis pequeñas hasta ' + t.phMin + '–' + t.phMax + '.');
      else if (phN > t.phMax) items.push('pH alto (' + phN + '): corrige con pH- en dosis pequeñas hasta ' + t.phMin + '–' + t.phMax + '.');
    }
    if (Number.isFinite(tempN)) {
      if (tempN < t.tempMin) items.push('Temperatura baja (' + tempN + '°C): intenta acercar el depósito a ' + t.tempMin + '–' + t.tempMax + '°C.');
      if (tempN > t.tempMax) items.push('Temperatura alta (' + tempN + '°C): enfría/aisla depósito y mejora oxigenación.');
    }
    if (Number.isFinite(volN)) {
      const low = Math.max(0.5, t.volTarget * 0.85);
      const high = t.volTarget * 1.1;
      if (volN < low) items.push('Volumen bajo (' + volN + ' L): repón hasta cerca de ' + t.volTarget + ' L para estabilizar EC/pH.');
      if (volN > high) items.push('Volumen alto (' + volN + ' L): revisa sobrellenado para mantener margen de seguridad.');
    }
    return { items, targets: t, manualBlocksHtml: [] };
  }

  function getActionNow(diag) {
    const items = (diag && Array.isArray(diag.items)) ? diag.items.filter(Boolean) : [];
    if (!items.length) return null;
    const txt0 = String(items[0] || '');
    const p = txt0.toLowerCase();
    let title = 'Acción recomendada ahora';
    if (p.indexOf('ph') >= 0) title = 'Ajusta pH primero';
    else if (p.indexOf('ec') >= 0 || p.indexOf('dilución') >= 0 || p.indexOf('diluir') >= 0) title = 'Ajusta EC primero';
    else if (p.indexOf('temperatura') >= 0 || p.indexOf('enfriar') >= 0) title = 'Corrige temperatura';
    else if (p.indexOf('volumen') >= 0 || p.indexOf('repón') >= 0) title = 'Corrige volumen';
    return { title, text: txt0 };
  }

  function renderActionNow(diag) {
    const box = el('wizActionNow');
    if (!box) return;
    const action = getActionNow(diag || getCorrections());
    if (!action) {
      box.classList.add('setup-hidden');
      box.innerHTML = '';
      return;
    }
    box.classList.remove('setup-hidden');
    box.innerHTML =
      '<div class="wiz-action-now-card">' +
        '<div class="wiz-action-now-kicker">🎯 ' + action.title + '</div>' +
        '<div class="wiz-action-now-body">' + action.text.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>' +
      '</div>';
  }

  function renderSystemHint() {
    const box = el('wizSystemHint');
    if (!box) return;
    const cfg = (typeof state !== 'undefined' && state && state.configTorre) ? state.configTorre : {};
    const tipo = String((cfg && cfg.tipoInstalacion) || 'torre').toLowerCase();
    if (tipo === 'dwc') {
      const esKratky = typeof esDwcKratky === 'function' && esDwcKratky(cfg);
      box.textContent = esKratky
        ? 'DWC Kratky: prioriza temperatura y volumen. Evita sobrellenar para mantener cámara de aire.'
        : 'DWC aireado: prioriza temperatura y pH estables; una deriva rápida suele pedir corrección hoy.';
      return;
    }
    if (tipo === 'nft') {
      box.textContent = 'NFT: además de EC/pH, vigila caudal y retorno continuo. Si sube mucho EC, suele tocar diluir.';
      return;
    }
    box.textContent = 'Torre vertical: prioriza estabilidad EC/pH y nivel mínimo seguro para bomba y reparto uniforme.';
  }

  function renderHero(diag) {
    const st = el('wizHeroStatus');
    const mode = el('wizHeroMode');
    const score = el('wizHeroScore');
    if (!st || !mode || !score) return;
    const cfg = (typeof state !== 'undefined' && state && state.configTorre) ? state.configTorre : {};
    const tipo = String((cfg && cfg.tipoInstalacion) || 'torre').toUpperCase();
    mode.textContent = tipo;

    const d = diag || getCorrections();
    const n = Array.isArray(d?.items) ? d.items.length : 0;
    score.textContent = n + (n === 1 ? ' alerta' : ' alertas');
    if (!n) st.textContent = 'Estable';
    else if (n <= 2) st.textContent = 'Vigilar';
    else st.textContent = 'Corregir';
  }

  function renderCultivosEnSistema() {
    const row = el('wizCultivosRow');
    if (!row) return;
    const cfg = (typeof state !== 'undefined' && state && state.configTorre) ? state.configTorre : {};
    const torre = (typeof state !== 'undefined' && state && Array.isArray(state.torre)) ? state.torre : [];
    const set = new Set();
    const chips = [];

    // 1) Prioridad: cultivos seleccionados explícitamente en la instalación activa (setup)
    try {
      const iniciales = Array.isArray(cfg.cultivosIniciales) ? cfg.cultivosIniciales : [];
      iniciales.forEach((vRaw) => {
        const v = String(vRaw || '').trim();
        if (!v || set.has(v)) return;
        set.add(v);
        let nombre = v;
        try {
          if (typeof getCultivoDB === 'function' && typeof cultivoNombreLista === 'function') {
            nombre = cultivoNombreLista(getCultivoDB(v), v) || v;
          }
        } catch (_) {}
        chips.push('🌱 ' + nombre);
      });
    } catch (_) {}

    // 2) Fallback: variedades realmente ocupadas en cestas de la instalación activa
    try {
      torre.forEach((nivel) => {
        (Array.isArray(nivel) ? nivel : []).forEach((c) => {
          const v = String(c?.variedad || '').trim();
          if (!v || set.has(v)) return;
          set.add(v);
          let nombre = v;
          try {
            if (typeof getCultivoDB === 'function' && typeof cultivoNombreLista === 'function') {
              nombre = cultivoNombreLista(getCultivoDB(v), v) || v;
            }
          } catch (_) {}
          chips.push('🌱 ' + nombre);
        });
      });
    } catch (_) {}

    if (!chips.length) {
      row.setAttribute('data-cols', '1');
      row.innerHTML = '<span class="wiz-cultivo-chip is-empty">🌿 Sin cultivos definidos</span>';
      return;
    }
    const list = chips.slice(0, 12);
    const n = list.length;
    let cols = 2;
    if (n === 1) cols = 1;
    else if (n === 2) cols = 2;
    else if (n === 3) cols = 3;
    else if (n === 4) cols = 2;
    else if (n <= 6) cols = 3;
    else if (n <= 8) cols = 4;
    else cols = 3;
    row.setAttribute('data-cols', String(cols));
    row.innerHTML = list.map((txt) => '<span class="wiz-cultivo-chip">' + txt.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span>').join('');
  }

  function open() {
    const m = el('modalWizardMedicion');
    if (!m) return;
    m.classList.add('open');
    m.setAttribute('aria-hidden', 'false');
    if (typeof a11yDialogOpened === 'function') a11yDialogOpened(m);
    busy = false;
    // precargar notas desde Medir (si el usuario ya escribió)
    try {
      if (typeof actualizarBadgesNutriente === 'function') actualizarBadgesNutriente();
      if (typeof evalParam === 'function') evalParam();
    } catch (_) {}
    try {
      const src = el('inputNotas');
      const dst = el('wizNotas');
      if (src && dst && !String(dst.value || '').trim()) dst.value = String(src.value || '');
    } catch (_) {}
    try { renderSystemHint(); } catch (_) {}
    try { renderCultivosEnSistema(); } catch (_) {}
    try { renderActionNow(null); } catch (_) {}
    try { syncAdjustmentFields(); } catch (_) {}
    try { renderInsights(); } catch (_) {}
    try { renderHero(); } catch (_) {}
    try { syncWizardRangeLabels(getTargets()); } catch (_) {}
    showStep(1);
  }

  function close(ev) {
    const m = el('modalWizardMedicion');
    if (!m || !m.classList.contains('open')) return;
    if (ev && ev.currentTarget === m && ev.target !== m) return;
    m.classList.remove('open');
    m.setAttribute('aria-hidden', 'true');
    if (typeof a11yDialogClosed === 'function') a11yDialogClosed(m);
  }

  function valNum(id) {
    const raw = String(el(id)?.value || '').trim().replace(',', '.');
    if (!raw) return '';
    const n = Number(raw);
    return Number.isFinite(n) ? String(n) : '';
  }

  function getLastMed() {
    try {
      // Se guarda desde app-hc-medicion-toast.js; en este proyecto suele existir state.ultimaMedicion
      const u = (typeof state !== 'undefined' && state && state.ultimaMedicion) ? state.ultimaMedicion : null;
      if (!u || typeof u !== 'object') return null;
      return {
        ec: numFromAny(u.ec),
        ph: numFromAny(u.ph),
        temp: numFromAny(u.temp),
        vol: numFromAny(u.vol)
      };
    } catch (_) {
      return null;
    }
  }

  function setVal(id, v) {
    const e = el(id);
    if (!e) return;
    e.value = txt(v);
  }

  function clearStep1() {
    ['wizQuick','wizEC','wizPH','wizTemp','wizVol'].forEach((id) => setVal(id, ''));
    renderInsights();
  }

  function useLast() {
    const u = getLastMed();
    if (!u) {
      if (typeof showToast === 'function') showToast('No hay una última medición para precargar', true);
      return;
    }
    // Solo rellenar los vacíos (no pisar lo que el usuario ya escribió)
    const map = { wizEC: u.ec, wizPH: u.ph, wizTemp: u.temp, wizVol: u.vol };
    Object.keys(map).forEach((id) => {
      const cur = txt(el(id)?.value || '').trim();
      if (!cur && map[id]) setVal(id, map[id]);
    });
    renderInsights();
  }

  function parseQuick() {
    const raw = txt(el('wizQuick')?.value || '').trim();
    if (!raw) return;
    // Acepta: "EC 1350 pH 6.0 T 20 V 18" o "1350 6.0 20 18" (en orden EC pH T V)
    const norm = raw
      .replace(/µS\/cm/gi, ' ')
      .replace(/[=;,]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const grab = (re) => {
      const m = norm.match(re);
      return m ? numFromAny(m[1]) : '';
    };

    const ec = grab(/\b(?:ec|ecs|conductividad)\s*([0-9]+(?:[.,][0-9]+)?)\b/i);
    const ph = grab(/\bph\s*([0-9]+(?:[.,][0-9]+)?)\b/i);
    const temp = grab(/\b(?:t|temp|temperatura)\s*([0-9]+(?:[.,][0-9]+)?)\b/i);
    const vol = grab(/\b(?:v|vol|volumen|litros|l)\s*([0-9]+(?:[.,][0-9]+)?)\b/i);

    // Fallback: 4 números en orden
    if (!ec && !ph && !temp && !vol) {
      const nums = norm.match(/[0-9]+(?:[.,][0-9]+)?/g) || [];
      if (nums[0]) setVal('wizEC', numFromAny(nums[0]));
      if (nums[1]) setVal('wizPH', numFromAny(nums[1]));
      if (nums[2]) setVal('wizTemp', numFromAny(nums[2]));
      if (nums[3]) setVal('wizVol', numFromAny(nums[3]));
      renderInsights();
      return;
    }

    if (ec) setVal('wizEC', ec);
    if (ph) setVal('wizPH', ph);
    if (temp) setVal('wizTemp', temp);
    if (vol) setVal('wizVol', vol);
    renderInsights();
  }

  function badge(kind, label, value) {
    const v = txt(value).trim();
    const cls = kind === 'ok' ? 'is-ok' : kind === 'warn' ? 'is-warn' : 'is-muted';
    return `<span class="wiz-badge ${cls}"><strong>${label}</strong>${v ? ` <span class="wiz-badge-val">${v}</span>` : ''}</span>`;
  }

  function renderInsights() {
    const box = el('wizInsights');
    if (!box) return;
    const ec = valNum('wizEC');
    const ph = valNum('wizPH');
    const temp = valNum('wizTemp');
    const vol = valNum('wizVol');

    const t = getTargets();
    try { syncWizardRangeLabels(t); } catch (_) {}
    const parts = [];
    if (ec) {
      const n = Number(ec);
      const ok = n >= t.ecMin && n <= t.ecMax;
      parts.push(badge(ok ? 'ok' : 'warn', 'EC', n > 0 ? ec : ''));
    } else parts.push(badge('muted', 'EC', '—'));

    if (ph) {
      const n = Number(ph);
      const ok = n >= t.phMin && n <= t.phMax;
      parts.push(badge(ok ? 'ok' : 'warn', 'pH', ph));
    } else parts.push(badge('muted', 'pH', '—'));

    if (temp) {
      const n = Number(temp);
      const ok = n >= t.tempMin && n <= t.tempMax;
      parts.push(badge(ok ? 'ok' : 'warn', 'Temp', temp + '°C'));
    } else parts.push(badge('muted', 'Temp', '—'));

    if (vol) {
      const n = Number(vol);
      const low = Math.max(0.5, t.volTarget * 0.85);
      const high = t.volTarget * 1.1;
      const ok = n >= low && n <= high;
      parts.push(badge(ok ? 'ok' : 'warn', 'Vol', vol + ' L'));
    } else parts.push(badge('muted', 'Vol', '—'));

    const diag = getCorrections();
    try { renderHero(diag); } catch (_) {}
    const corr = diag.items.length
      ? (diag.manualBlocksHtml && diag.manualBlocksHtml.length
        ? `<div class="wiz-corrections">${diag.manualBlocksHtml.map((h) => `<div class="wiz-correccion-block">${h}</div>`).join('')}</div>`
        : `<div class="wiz-corrections">${diag.items.map((x) => `<p>⚠️ ${x}</p>`).join('')}</div>`)
      : '<div class="wiz-corrections wiz-corrections--ok"><p>✅ Todo en rango recomendado para esta instalación.</p></div>';
    box.innerHTML = `<div class="wiz-badges">${parts.join('')}</div>${corr}`;
  }

  function buildReview() {
    const ec = valNum('wizEC');
    const ph = valNum('wizPH');
    const temp = valNum('wizTemp');
    const vol = valNum('wizVol');
    const notas = String(el('wizNotas')?.value || '').trim();

    const ajustes = [];
    if (el('wizRecargaCompleta')?.checked) ajustes.push('🔄 Recarga completa');
    if (el('wizReposicionAguaChk')?.checked) {
      const L = valNum('wizReposicionAguaL');
      ajustes.push('💧 Reposición solo agua' + (L ? ` (+${L} L)` : ''));
    }
    if (el('wizAjustePhChk')?.checked) {
      const pMas = valNum('wizPhMasMl');
      const pMen = valNum('wizPhMenosMl');
      const bits = [];
      if (pMas) bits.push(`pH+ ${pMas} ml`);
      if (pMen) bits.push(`pH− ${pMen} ml`);
      ajustes.push('🧪 Ajuste pH' + (bits.length ? ` (${bits.join(' · ')})` : ''));
    }
    if (el('wizNutrientesChk')?.checked) {
      const t = String(el('wizNutrientesTxt')?.value || '').trim();
      ajustes.push('🌿 Nutrientes' + (t ? ` (${t})` : ''));
    }

    const parts = [];
    parts.push(`<strong>Medición</strong>: EC ${ec || '—'} · pH ${ph || '—'} · °C ${temp || '—'} · L ${vol || '—'}`);
    const diag = getCorrections();
    renderActionNow(diag);
    if (diag.items.length) {
      if (diag.manualBlocksHtml && diag.manualBlocksHtml.length) {
        parts.push('<strong>Correcciones sugeridas</strong>:<br>' + diag.manualBlocksHtml.join('<br>'));
      } else {
        parts.push('<strong>Correcciones sugeridas</strong>:<br>• ' + diag.items.join('<br>• '));
      }
    }
    if (ajustes.length) parts.push('<strong>Ajustes</strong>: ' + ajustes.join(' · '));
    if (notas) parts.push('<strong>Nota</strong>: ' + notas.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
    return parts.join('<br>');
  }

  function syncAdjustmentFields() {
    const map = [
      ['wizReposicionAguaChk', 'wizReposicionFields'],
      ['wizAjustePhChk', 'wizPhFields'],
      ['wizNutrientesChk', 'wizNutrientesFields']
    ];
    map.forEach(([chkId, wrapId]) => {
      const chk = el(chkId);
      const wrap = el(wrapId);
      if (!wrap) return;
      const on = !!chk?.checked;
      wrap.classList.toggle('setup-hidden', !on);
    });
  }

  async function commit() {
    if (busy) return;
    const ec = valNum('wizEC');
    const ph = valNum('wizPH');
    const temp = valNum('wizTemp');
    const vol = valNum('wizVol');
    const notas = String(el('wizNotas')?.value || '').trim();
    const diag = getCorrections();

    if (!ec && !ph && !temp && !vol) {
      if (typeof showToast === 'function') showToast('⚠️ Introduce al menos un valor', true);
      showStep(1);
      return;
    }

    busy = true;
    showStep(step);

    // sincronizar con inputs reales y usar guardarMedicion() (mantiene comportamiento y UI)
    try { el('inputEC').value = ec; } catch (_) {}
    try { el('inputPH').value = ph; } catch (_) {}
    try { el('inputTemp').value = temp; } catch (_) {}
    try { el('inputVol').value = vol; } catch (_) {}
    try { el('inputNotas').value = notas; } catch (_) {}

    // si el usuario marca recarga completa, reutilizar switch existente
    try {
      const wantRecarga = !!el('wizRecargaCompleta')?.checked;
      if (wantRecarga && typeof toggleRecarga === 'function') {
        // toggleRecarga() cambia estado; forzar solo si no está ya activo
        const sw = el('recargaSwitch');
        const isOn = sw && sw.getAttribute('aria-checked') === 'true';
        if (!isOn) toggleRecarga();
      }
    } catch (_) {}

    try {
      await guardarMedicion();
    } catch (e) {
      busy = false;
      showStep(step);
      if (typeof showToast === 'function') showToast('No se pudo guardar la medición', true);
      return;
    }

    // Ajustes extra en registro (además de la medición ya registrada)
    try {
      if (typeof addRegistro === 'function') {
        if (diag && Array.isArray(diag.items) && diag.items.length) {
          const sugId = 'wizsug_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
          const action = getActionNow(diag);
          addRegistro('apunte', {
            icono: '🧭',
            apunteTipo: 'sugerencia_correccion',
            sugerenciaId: sugId,
            sugerenciaEstado: 'sugerido',
            sugerenciaTitulo: action ? action.title : 'Correcciones sugeridas',
            apunteTexto: 'Correcciones sugeridas (no automáticas): ' + diag.items.join(' | ')
          }, true);
        }
        if (el('wizReposicionAguaChk')?.checked) {
          const L = valNum('wizReposicionAguaL');
          if (L) {
            addRegistro('reposicion', { litros: Number(L), modo: 'solo_agua', icono: '💧' }, true);
          } else {
            addRegistro('apunte', { icono: '💧', apunteTexto: 'Reposición parcial: solo agua (sin litros indicados)' }, true);
          }
        }
        if (el('wizAjustePhChk')?.checked) {
          const pMas = valNum('wizPhMasMl');
          const pMen = valNum('wizPhMenosMl');
          const bits = [];
          if (pMas) bits.push('pH+ ' + pMas + ' ml');
          if (pMen) bits.push('pH− ' + pMen + ' ml');
          addRegistro('apunte', { icono: '🧪', apunteTexto: bits.length ? ('Ajuste de pH: ' + bits.join(' · ')) : 'Ajuste de pH' }, true);
        }
        if (el('wizNutrientesChk')?.checked) {
          const t = String(el('wizNutrientesTxt')?.value || '').trim();
          addRegistro('apunte', { icono: '🌿', apunteTexto: t ? ('Añadidos nutrientes: ' + t) : 'Añadidos nutrientes' }, true);
        }
      }
    } catch (_) {}

    busy = false;
    close();
    try {
      // limpiar wizard para próxima vez
      ['wizEC','wizPH','wizTemp','wizVol','wizNotas','wizReposicionAguaL','wizPhMasMl','wizPhMenosMl','wizNutrientesTxt'].forEach((id) => {
        const e = el(id);
        if (e) e.value = '';
      });
      ['wizRecargaCompleta','wizReposicionAguaChk','wizAjustePhChk','wizNutrientesChk'].forEach((id) => {
        const c = el(id);
        if (c) c.checked = false;
      });
    } catch (_) {}

    try {
      if (typeof renderRegistro === 'function' && typeof histTabActiva !== 'undefined' && histTabActiva === 'registro') {
        renderRegistro();
      }
    } catch (_) {}
  }

  window.abrirWizardMedicion = open;
  window.cerrarWizardMedicion = close;
  window.wizardMedQuickParse = parseQuick;
  window.wizardMedUseLast = useLast;
  window.wizardMedClearStep1 = clearStep1;
  window.wizardMedNext = function () {
    if (busy) return;
    if (step === 1) showStep(2);
    else if (step === 2) {
      const rv = el('wizReview');
      if (rv) rv.innerHTML = buildReview();
      showStep(3);
    } else {
      void commit();
    }
  };
  window.wizardMedPrev = function () {
    if (busy) return;
    if (step === 2) showStep(1);
    else if (step === 3) showStep(2);
  };

  // Live feedback
  try {
    ['wizEC','wizPH','wizTemp','wizVol'].forEach((id) => {
      const e = el(id);
      if (e) e.addEventListener('input', renderInsights, { passive: true });
    });
    ['wizRecargaCompleta','wizReposicionAguaChk','wizAjustePhChk','wizNutrientesChk'].forEach((id) => {
      const e = el(id);
      if (e) e.addEventListener('change', syncAdjustmentFields, { passive: true });
    });
  } catch (_) {}
})();

