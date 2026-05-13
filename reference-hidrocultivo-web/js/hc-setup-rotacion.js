/** Rotación escalonada. Tras hc-setup-calc-core.js. */
// ══════════════════════════════════════════════════
// ROTACIÓN ESCALONADA
// ══════════════════════════════════════════════════

/** Texto del paso de limpieza tras rotar, según tipo de instalación. */
function etiquetaLimpiezaTrasRotacion() {
  const t = tipoInstalacionNormalizado(state.configTorre);
  if (t === 'nft') return '🧹 Limpiar huecos y restos con agua oxigenada diluida';
  if (t === 'dwc') return '🧹 Limpiar macetas y zona de cultivo vacías con agua oxigenada diluida';
  return '🧹 Limpiar cestas vacías con agua oxigenada diluida';
}

function calcularRotacion() {
  const card = document.getElementById('rotacionCard');
  if (!card) return;

  const nivelesActivos = getNivelesActivos();

  // Solo mostrar en modo lechuga o mixto (3 niveles escalonados)
  if (nivelesActivos.length < 2) { card.style.display = 'none'; return; }

  // Detectar si es cultivo escalonado o único
  // Escalonado = diferencia de días media entre niveles > 10 días
  const edadesPorNivel = nivelesActivos.map(n => {
    const plantas = state.torre[n].filter(c => c.variedad && c.fecha);
    if (plantas.length === 0) return null;
    const diasMedia =
      plantas.reduce((sum, c) => {
        const d =
          typeof getDiasEfectivosCicloBiologico === 'function'
            ? getDiasEfectivosCicloBiologico(c, getCultivoDB(c.variedad), Date.now())
            : getDias(c.fecha);
        return sum + d;
      }, 0) / plantas.length;
    return { nivel: n, diasMedia, plantas };
  }).filter(Boolean);

  if (edadesPorNivel.length < 2) { card.style.display = 'none'; return; }

  // Ordenar por edad (más joven primero = nivel superior)
  edadesPorNivel.sort((a, b) => a.diasMedia - b.diasMedia);

  const diferenciaMax = edadesPorNivel[edadesPorNivel.length-1].diasMedia - edadesPorNivel[0].diasMedia;
  const esCultivoEscalonado = diferenciaMax > 8; // más de 8 días de diferencia entre niveles

  if (!esCultivoEscalonado) { card.style.display = 'none'; return; }

  // Calcular estado y alertas de cada nivel
  const alertas = [];
  let htmlNiveles = '';

  edadesPorNivel.forEach((info, idx) => {
    const esUltimo = idx === edadesPorNivel.length - 1;
    const esPrimero = idx === 0;

    // Calcular días a cosecha media del nivel
    const diasTotalMedia = info.plantas.reduce((sum, c) => {
      return sum + (DIAS_COSECHA[c.variedad] || 50);
    }, 0) / info.plantas.length;

    const diasRestantes = Math.round(diasTotalMedia - info.diasMedia);
    const pct = Math.min(100, Math.round((info.diasMedia / diasTotalMedia) * 100));

    // Determinar estado (marcador tipográfico · sin emoji decorativo)
    let estado, colorBg, colorText, colorBorder, faseMark;
    if (diasRestantes <= 0) {
      estado = 'Listo para cosechar'; colorBg = '#fee2e2'; colorText = '#7f1d1d'; colorBorder = '#b91c1c'; faseMark = 'C';
    } else if (diasRestantes <= 5) {
      estado = `Cosecha en ${diasRestantes} d`; colorBg = '#fef3c7'; colorText = '#78350f'; colorBorder = '#d97706'; faseMark = '!';
    } else if (pct >= 66) {
      estado = `Madurez · ${diasRestantes} d restantes`; colorBg = '#fffbeb'; colorText = '#92400e'; colorBorder = '#d97706'; faseMark = 'M';
    } else if (pct >= 33) {
      estado = `Crecimiento · ${diasRestantes} d restantes`; colorBg = '#f0fdf4'; colorText = '#14532d'; colorBorder = '#16a34a'; faseMark = 'V';
    } else {
      estado = `Plántula · ${diasRestantes} d restantes`; colorBg = '#eff6ff'; colorText = '#1e40af'; colorBorder = '#2563eb'; faseMark = 'P';
    }

    // Nombre legible del nivel
    const nombreNivel = esPrimero ? 'Nivel superior' : esUltimo ? 'Nivel inferior' : 'Nivel central';
    const numNivel = info.nivel + 1;

    htmlNiveles += `
      <div class="rotacion-nivel-row" style="--rot-num-bg:${colorBg};--rot-num-fg:${colorText};--rot-num-bd:${colorBorder}">
        <div class="rotacion-nivel-num">
          ${numNivel}
        </div>
        <div class="rotacion-nivel-info">
          <div class="rotacion-nivel-titulo">${nombreNivel} — ${Math.round(info.diasMedia)} días</div>
          <div class="rotacion-nivel-dias">${info.plantas.length} plantas · ${estado}</div>
        </div>
        <div class="rotacion-fase-mark">${faseMark}</div>
      </div>`;

    // Generar alerta si hay acción pendiente
    if (diasRestantes <= 0 && esUltimo) {
      alertas.push({ tipo: 'urgente', texto: `<strong>Cosecha · nivel ${numNivel}.</strong> Cosechar, rotar niveles y trasplantar plántulas nuevas en nivel superior.` });
    } else if (diasRestantes <= 5 && esUltimo) {
      alertas.push({ tipo: 'pronto', texto: `<strong>Cosecha en ${diasRestantes} d.</strong> Prepara plántulas nuevas para el nivel ${edadesPorNivel[0].nivel + 1}.` });
    }
  });

  // Calcular próxima rotación
  const nivelMasMaduro = edadesPorNivel[edadesPorNivel.length - 1];
  const diasTotalMaduro = nivelMasMaduro.plantas.reduce((sum, c) =>
    sum + (DIAS_COSECHA[c.variedad] || 50), 0) / nivelMasMaduro.plantas.length;
  const diasParaRotacion = Math.max(0, Math.round(diasTotalMaduro - nivelMasMaduro.diasMedia));

  if (alertas.length === 0) {
    if (diasParaRotacion <= 10) {
      alertas.push({ tipo: 'pronto', texto: `Rotación aprox. en <strong>${diasParaRotacion} d</strong>. Prepara plántulas nuevas.` });
    } else {
      alertas.push({ tipo: 'ok', texto: `Ritmo correcto. Próxima rotación aprox. en <strong>${diasParaRotacion} d</strong>.` });
    }
  }

  // Flecha entre niveles
  // Las flechas se añaden directamente en el template
  const htmlConFlechas = htmlNiveles;

  card.style.display = 'block';
  card.innerHTML = `
    <div class="rotacion-card">
      <div class="rotacion-title">
        Rotación escalonada · torre por niveles
      </div>
      ${htmlConFlechas}
      ${alertas.map(a => `
        <div class="rotacion-alerta ${a.tipo}">
          <span class="rotacion-alerta-text">${a.texto}</span>
        </div>`).join('')}
      ${diasParaRotacion <= 0 ? `
      <button type="button" class="btn btn-primary rotacion-iniciar-btn" onclick="iniciarRotacion()">
        Iniciar rotación de niveles
      </button>` : ''}
    </div>`;
}

function iniciarRotacion() {
  // Modal de confirmación con pasos de rotación
  const nivelesActivos = getNivelesActivos();
  const pasos = [
    `✂️ Cosechar todas las plantas del nivel ${nivelesActivos[nivelesActivos.length-1] + 1}`,
    `🔽 Mover plantas del nivel ${nivelesActivos[1] + 1} → nivel ${nivelesActivos[nivelesActivos.length-1] + 1}`,
    `🔽 Mover plantas del nivel ${nivelesActivos[0] + 1} → nivel ${nivelesActivos[1] + 1}`,
    `🌱 Trasplantar plántulas nuevas en nivel ${nivelesActivos[0] + 1}`,
    etiquetaLimpiezaTrasRotacion(),
  ];

  const lista = pasos.map((p, i) => (i+1) + '. ' + p).join('\n');

  if (confirm('ROTACIÓN DE NIVELES\n\n' + lista + '\n\n¿Confirmar rotación?\n\nEsto actualizará las fechas de plantas en la instalación activa (vista Cultivo e instalación).')) {
    ejecutarRotacion();
  }
}

function ejecutarRotacion() {
  const nivelesActivos = [...getNivelesActivos()];
  // Ordenar por edad (mayor a menor — el más maduro primero)
  const edadesPorNivel = nivelesActivos.map(n => {
    const plantas = state.torre[n].filter(c => c.variedad && c.fecha);
    if (plantas.length === 0) return { nivel: n, diasMedia: 0 };
    return {
      nivel: n,
      diasMedia:
        plantas.reduce((s, c) => {
          const d =
            typeof getDiasEfectivosCicloBiologico === 'function'
              ? getDiasEfectivosCicloBiologico(c, getCultivoDB(c.variedad), Date.now())
              : getDias(c.fecha);
          return s + d;
        }, 0) / plantas.length,
    };
  }).sort((a, b) => b.diasMedia - a.diasMedia); // más maduro primero

  // El más maduro se cosecha (vaciar)
  const nivelCosecha = edadesPorNivel[0].nivel;
  state.torre[nivelCosecha] = Array(NUM_CESTAS).fill(null).map(() => ({ variedad: '', fecha: '', notas: '', origenPlanta: '', fotos: [], fotoKeys: [] }));

  // Los demás se mueven al nivel siguiente (más maduro)
  for (let i = 1; i < edadesPorNivel.length; i++) {
    const nivelOrigen = edadesPorNivel[i].nivel;
    const nivelDestino = edadesPorNivel[i-1].nivel;
    state.torre[nivelDestino] = JSON.parse(JSON.stringify(state.torre[nivelOrigen]));
    state.torre[nivelOrigen] = Array(NUM_CESTAS).fill(null).map(() => ({ variedad: '', fecha: '', notas: '', origenPlanta: '', fotos: [], fotoKeys: [] }));
  }

  saveState();
  renderTorre();
  updateTorreStats();
  calcularRotacion();
  showToast('✅ Rotación completada en esta instalación — añade plántulas al nivel superior');
}


