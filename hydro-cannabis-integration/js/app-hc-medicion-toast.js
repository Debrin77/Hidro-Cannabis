/**
 * Medición rápida (guardarMedicion) y showToast global.
 * Último bloque de la app; carga tras meteo-alarm-app.js. Siguiente: app-hc-setup-onboarding.js.
 */
async function guardarMedicion() {
  if (typeof sistemaEstaOperativa === 'function' && !sistemaEstaOperativa()) {
    showToast(typeof getMensajeStandbyContinuar === 'function'
      ? getMensajeStandbyContinuar()
      : '⏸ Instalación en stand-by / descanso. Reactiva modo operativa para continuar.', true);
    return;
  }
  const ec    = document.getElementById('inputEC').value.trim();
  const ph    = document.getElementById('inputPH').value.trim();
  const temp  = document.getElementById('inputTemp').value.trim();
  const vol   = document.getElementById('inputVol').value.trim();
  const humS  = '';
  const notas = document.getElementById('inputNotas').value.trim();

  if (!ec && !ph && !temp && !vol) {
    showToast('⚠️ Introduce al menos un valor', true);
    const firstInput = document.getElementById('inputEC');
    if (firstInput) {
      firstInput.focus();
      firstInput.setAttribute('aria-invalid', 'true');
    }
    return;
  }

  const now   = new Date();
  const dia   = String(now.getDate()).padStart(2,'0');
  const mes   = String(now.getMonth()+1).padStart(2,'0');
  const anyo  = now.getFullYear();
  const fecha = dia + '/' + mes + '/' + anyo;
  const hora  = now.toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' });

  // ── 1. GUARDAR SIEMPRE EN LOCAL PRIMERO ───────────────────────────────────
  state.ultimaMedicion = { fecha, hora, ec, ph, temp, vol, humSustrato: humS };
  if (!state.mediciones) state.mediciones = [];
  state.mediciones.unshift({ fecha, hora, tipo:'medicion', ec, ph, temp, vol, humSustrato: humS, notas });
  if (state.mediciones.length > 200)
    state.mediciones = state.mediciones.slice(0, 200);

  if (
    vol &&
    state.configTorre &&
    typeof getVolumenDepositoMaxLitros === 'function'
  ) {
    const volN = parseFloat(String(vol).trim().replace(',', '.'));
    const vmax = getVolumenDepositoMaxLitros(state.configTorre);
    if (Number.isFinite(volN) && volN >= 0.5 && vmax != null && Number.isFinite(vmax) && vmax > 0) {
      const capped = Math.min(vmax, Math.max(0.5, Math.round(volN * 10) / 10));
      if (capped < vmax - 0.05) state.configTorre.volMezclaLitros = capped;
      else delete state.configTorre.volMezclaLitros;
      try {
        if (typeof guardarEstadoTorreActual === 'function') guardarEstadoTorreActual();
      } catch (_) {}
    }
  }

  try {
    if (typeof intentarLimpiarEcAvisoTrasMedicion === 'function') intentarLimpiarEcAvisoTrasMedicion(ec);
  } catch (_) {}

  // Línea única en el registro unificado (Historial → Registro)
  addRegistro('medicion', { ec, ph, temp, vol, humSustrato: humS, notas, icono: '📊' });

  // Si es una recarga marcada
  if (esRecarga) {
    state.ultimaRecarga = now.toISOString().split('T')[0];
    state.recargaSnoozeHasta = null;
    esRecarga = false;
    const rsw = document.getElementById('recargaSwitch');
    rsw.className = 'toggle-switch';
    rsw.setAttribute('aria-checked', 'false');
    if (!state.recargasLocal) state.recargasLocal = [];
    const _nr = getNutrienteTorre();
    state.recargasLocal.unshift({
      fecha, hora, ecFinal: ec, phFinal: ph, tempFinal: temp, volFinal: vol,
      torreId: getTorreActiva().id != null ? getTorreActiva().id : (state.torreActiva || 0),
      torreNombre: (getTorreActiva().nombre || '').trim() || 'Instalación',
      torreEmoji: getTorreActiva().emoji || '🌿',
      calmagMl: '',
      vegaAMl: String(calcularMlParteNutriente(0)),
      vegaBMl: _nr && _nr.partes >= 2 ? String(calcularMlParteNutriente(1)) : '',
      vegaCMl: _nr && _nr.partes >= 3 ? String(calcularMlParteNutriente(2)) : '',
      phMasMl: '', phMenosMl: '', notas
    });
  }

  saveState(); // Guardar en localStorage SIEMPRE

  // Refrescar historial si está visible
  if (document.getElementById('tab-historial').classList.contains('active')) {
    cargarHistorial();
  }

  // ── 2. ACTUALIZAR UI ──────────────────────────────────────────────────────
  // Limpiar campos
  ['inputEC','inputPH','inputTemp','inputVol','inputNotas'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.value = '';
      if (id !== 'inputNotas') el.removeAttribute('aria-invalid');
    }
  });
  ['statusEC','statusPH','statusTemp','statusVol'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.className = 'param-status'; el.innerHTML = ''; }
  });
  ['cardEC','cardPH','cardTemp','cardVol'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.className = 'param-card';
  });
  ['correccionEC','correccionPH','correccionTemp','correccionVol'].forEach(id => {
    showCorreccion(id, '');
  });

  updateDashboard();
  updateRecargaBar();
  try {
    if (vol && typeof actualizarBadgesNutriente === 'function') actualizarBadgesNutriente();
  } catch (_) {}
  try {
    if (vol) {
      const panSis = document.getElementById('tab-sistema');
      if (panSis && panSis.classList.contains('active') && typeof renderTorre === 'function') renderTorre();
      else if (typeof updateTorreStats === 'function') updateTorreStats();
    }
  } catch (_) {}
  showToast('✅ Medición guardada · EC:' + (ec||'—') + ' pH:' + (ph||'—'));

  // ── 3. INTENTAR ENVIAR A GOOGLE SHEETS (opcional) ────────────────────────
  const alertas = [];
  const ecNumSheets = ec ? parseFloat(String(ec).replace(',', '.')) : NaN;
  if (ec && Number.isFinite(ecNumSheets)) {
    const cfgS = state.configTorre || {};
    const mObj = cfgS.checklistEcObjetivoUs;
    if (Number.isFinite(mObj) && mObj >= 200 && mObj <= 6000) {
      const o = Math.round(mObj);
      const t = EC_MEDICION_TOLERANCIA_OBJETIVO_US;
      if (ecNumSheets < o - t || ecNumSheets > o + t) {
        alertas.push('EC ' + ec + ' µS/cm fuera del margen del objetivo (' + o + ' ±' + t + ')');
      }
    } else {
      const eo = getECOptimaTorre();
      if (ecNumSheets < eo.min || ecNumSheets > eo.max) {
        alertas.push('EC ' + ec + ' µS/cm fuera del rango cultivo (' + eo.min + '–' + eo.max + ')');
      }
    }
  }
  if (ph && (parseFloat(ph) < 5.7  || parseFloat(ph) > 6.4))  alertas.push('pH ' + ph + ' fuera de rango');
  if (temp && (parseFloat(temp) < 18 || parseFloat(temp) > 22)) alertas.push('Temp ' + temp + '°C fuera de rango');
  if (vol && parseFloat(vol) < 16) alertas.push('Vol ' + vol + 'L bajo');

  await hcPostSheets({
    action: 'medicion', fecha, hora, ec, ph, temp, volumen: vol,
    humSustrato: humS || null,
    notas, alertas: alertas.join(' | ')
  });
}


function showToast(msg, error=false) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'hc-toast';
    t.setAttribute('role', 'status');
    t.setAttribute('aria-live', 'polite');
    t.setAttribute('aria-atomic', 'true');
    document.body.appendChild(t);
  } else if (!t.classList.contains('hc-toast')) {
    t.classList.add('hc-toast');
  }
  t.style.removeProperty('top');
  t.textContent = msg;
  t.setAttribute('aria-live', error ? 'assertive' : 'polite');
  t.style.background = error ? 'var(--red)' : 'var(--green)';
  t.style.color = error ? 'white' : 'var(--bg)';
  t.style.opacity = '0';
  t.style.transform = 'translateX(-50%) translateY(14px)';
  void t.offsetWidth;
  t.style.opacity = '1';
  t.style.transform = 'translateX(-50%) translateY(0)';
  if (t._toastHideId) clearTimeout(t._toastHideId);
  t._toastHideId = setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(-50%) translateY(14px)';
    t._toastHideId = 0;
  }, 3500);
}

