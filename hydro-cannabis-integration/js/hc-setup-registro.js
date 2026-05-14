/** Registro completo (mediciones, cosechas, recargas). Tras hc-setup-historial-delete.js. */
// ══════════════════════════════════════════════════
// REGISTRO COMPLETO — mediciones, cosechas, recargas
// ══════════════════════════════════════════════════

function initRegistro() {
  if (!state.registro) state.registro = [];
}

function addRegistro(tipo, datos, horaConSegundos) {
  initRegistro();
  const now  = new Date();
  const dia  = String(now.getDate()).padStart(2,'0');
  const mes  = String(now.getMonth()+1).padStart(2,'0');
  const fecha = dia + '/' + mes + '/' + now.getFullYear();
  const hora = horaConSegundos
    ? now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const tActiva = getTorreActiva();
  const d = datos && typeof datos === 'object' ? { ...datos } : {};
  let snap = d.tipoInstalSnap;
  delete d.tipoInstalSnap;
  let tidReg = d.torreId;
  delete d.torreId;
  const tipoSnap =
    snap === 'nft' || snap === 'dwc' || snap === 'torre'
      ? snap
      : tipoInstalacionNormalizado(state.configTorre || {});
  const torreIdReg =
    tidReg != null && tidReg !== ''
      ? tidReg
      : tActiva.id != null
        ? tActiva.id
        : state.torreActiva || 0;
  state.registro.unshift({
    tipo, fecha, hora,
    torreNombre: (tActiva.nombre || '').trim() || 'Instalación',
    torreEmoji:  tActiva.emoji  || '🌿',
    ...d,
    torreId: torreIdReg,
    tipoInstalSnap: tipoSnap,
  });
  if (state.registro.length > 200) state.registro = state.registro.slice(0, 200);
  saveState();
}

function abrirModalApunteRegistro() {
  const m = document.getElementById('modalApunteRegistro');
  if (!m) return;
  const ta = document.getElementById('apunteTexto');
  const ids = ['apunteEc', 'apuntePh', 'apunteTemp', 'apunteVol', 'apunteEtiqueta1', 'apunteValor1'];
  if (ta) ta.value = '';
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  m.classList.add('open');
  if (typeof a11yDialogOpened === 'function') a11yDialogOpened(m);
  setTimeout(() => ta && ta.focus(), 80);
}

function cerrarModalApunteRegistro(ev) {
  const m = document.getElementById('modalApunteRegistro');
  if (!m || !m.classList.contains('open')) return;
  if (ev && ev.currentTarget === m && ev.target !== m) return;
  m.classList.remove('open');
  if (typeof a11yDialogClosed === 'function') a11yDialogClosed(m);
}

function guardarApunteRegistro() {
  const texto = (document.getElementById('apunteTexto') && document.getElementById('apunteTexto').value.trim()) || '';
  const ec = (document.getElementById('apunteEc') && document.getElementById('apunteEc').value.trim()) || '';
  const ph = (document.getElementById('apuntePh') && document.getElementById('apuntePh').value.trim()) || '';
  const temp = (document.getElementById('apunteTemp') && document.getElementById('apunteTemp').value.trim()) || '';
  const vol = (document.getElementById('apunteVol') && document.getElementById('apunteVol').value.trim()) || '';
  const lab1 = (document.getElementById('apunteEtiqueta1') && document.getElementById('apunteEtiqueta1').value.trim()) || '';
  const val1 = (document.getElementById('apunteValor1') && document.getElementById('apunteValor1').value.trim()) || '';
  const tieneNum = !!(ec || ph || temp || vol || val1);
  if (!texto && !tieneNum) {
    if (typeof showToast === 'function') showToast('Escribe un texto o al menos un valor numérico', true);
    return;
  }
  if (lab1 && !val1) {
    if (typeof showToast === 'function') showToast('Si pones etiqueta al dato extra, indica también el valor', true);
    return;
  }
  if (!lab1 && val1) {
    if (typeof showToast === 'function') showToast('Indica una etiqueta para el dato extra (p. ej. «ml», «€», «días»)', true);
    return;
  }
  addRegistro(
    'apunte',
    {
      icono: '📝',
      apunteTexto: texto,
      ec,
      ph,
      temp,
      vol,
      apunteEtiqueta1: lab1,
      apunteValor1: val1,
    },
    true
  );
  cerrarModalApunteRegistro();
  if (typeof showToast === 'function') showToast('📝 Apunte guardado en el registro');
  const regPanel = document.getElementById('histRegistroPanel');
  if (
    regPanel &&
    !regPanel.classList.contains('setup-hidden') &&
    typeof renderRegistro === 'function'
  ) {
    renderRegistro();
  }
}

// Cosechar una cesta y guardar trazabilidad completa
function cosecharCesta() {
  if (!editingCesta) return;
  const { nivel, cesta } = editingCesta;
  const data = state.torre[nivel][cesta];
  if (!data.variedad) { closeModal(); return; }

  const diasCultivo = data.fecha
    ? Math.floor((Date.now() - new Date(data.fecha)) / 86400000)
    : null;

  // Guardar en registro con trazabilidad completa
  addRegistro('cosecha', {
    variedad:    data.variedad,
    nivel:       nivel + 1,
    cesta:       cesta + 1,
    fechaSiembra: data.fecha || '',
    diasCultivo: diasCultivo,
    notas:       data.notas || '',
    origenPlanta: typeof normalizarOrigenPlanta === 'function'
      ? normalizarOrigenPlanta(data.origenPlanta)
      : (data.origenPlanta || ''),
    icono:       '✂️'
  });

  // También guardar en state.mediciones para el historial
  if (!state.mediciones) state.mediciones = [];
  const nomCosechaUi = cultivoNombreLista(getCultivoDB(data.variedad), data.variedad);
  const tCose = tipoInstalacionNormalizado(state.configTorre || {});
  const ubiCose = formatoUbicacionEnRegistro(tCose, nivel + 1, cesta + 1);
  const orPl =
    typeof normalizarOrigenPlanta === 'function'
      ? normalizarOrigenPlanta(data.origenPlanta)
      : '';
  const orTxt = typeof etiquetaOrigenPlantaBreve === 'function' ? etiquetaOrigenPlantaBreve(orPl) : '';
  state.mediciones.unshift({
    fecha: state.registro[0].fecha,
    hora:  state.registro[0].hora,
    tipo:  'cosecha',
    ec: '', ph: '', temp: '', vol: '',
    origenPlanta: orPl,
    notas: '✂️ Cosecha: ' + nomCosechaUi +
           (ubiCose ? ' · ' + ubiCose : '') +
           (orTxt ? ' · ' + orTxt : '') +
           (diasCultivo ? ' · ' + diasCultivo + ' días' : '') +
           (data.notas ? ' · ' + data.notas : '')
  });

  // Vaciar la cesta
  state.torre[nivel][cesta] = { variedad: '', fecha: '', notas: '', origenPlanta: '', fotos: [], fotoKeys: [] };
  saveState();
  renderTorre();
  updateTorreStats();
  closeModal();
  showToast('✂️ ' + nomCosechaUi + ' cosechada y registrada · ' + (diasCultivo || '?') + ' días');
}

function saveCesta() {
  if (!editingCesta) return;
  const { nivel, cesta } = editingCesta;
  const prev = state.torre[nivel][cesta] || {};
  const orEl = document.getElementById('editOrigenPlanta');
  const orVal =
    typeof normalizarOrigenPlanta === 'function' && orEl
      ? normalizarOrigenPlanta(orEl.value)
      : '';
  state.torre[nivel][cesta] = {
    variedad: document.getElementById('editVariedad').value,
    fecha: document.getElementById('editFecha').value,
    notas: document.getElementById('editNotas').value,
    origenPlanta: orVal,
    fotos: Array.isArray(prev.fotos) ? prev.fotos : [],
    fotoKeys: Array.isArray(prev.fotoKeys) ? prev.fotoKeys : [],
  };
  saveState();
  renderTorre();
  updateTorreStats();
  closeModal();
  try {
    if (typeof hcNotificarCambioCultivoSistema === 'function') hcNotificarCambioCultivoSistema();
  } catch (_) {}
}

function clearCesta() {
  if (!editingCesta) return;
  const { nivel, cesta } = editingCesta;
  state.torre[nivel][cesta] = { variedad: '', fecha: '', notas: '', origenPlanta: '', fotos: [], fotoKeys: [] };
  saveState();
  renderTorre();
  updateTorreStats();
  closeModal();
  try {
    if (typeof hcNotificarCambioCultivoSistema === 'function') hcNotificarCambioCultivoSistema();
  } catch (_) {}
}


