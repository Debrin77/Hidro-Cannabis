/**
 * Calendario de cultivo: eventos, navegación mensual.
 * Carga después del bloque principal (state, tipoInstalacionNormalizado, …).
 */

// ══════════════════════════════════════════════════
// CALENDARIO — LÓGICA
// ══════════════════════════════════════════════════

let calFecha = new Date();
/** null = lista «próximos eventos»; Date = detalle de ese día en la tarjeta. */
let calDiaSeleccionado = null;

const MESES_LARGO = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS_CAL = ['L','M','X','J','V','S','D'];
/** Días consecutivos desde el trasplante en que se sugiere medir pH a diario (plántulas nuevas). */
const DIAS_MUESTRA_PH_TRASPLANTE = 5;

function parseFechaCalendarioLocal(fechaStr) {
  if (!fechaStr || typeof fechaStr !== 'string') return null;
  const p = fechaStr.split('/');
  if (p.length < 3) return null;
  const d = parseInt(p[0], 10);
  const m = parseInt(p[1], 10) - 1;
  const y = parseInt(p[2], 10);
  if (!Number.isFinite(d) || !Number.isFinite(m) || !Number.isFinite(y)) return null;
  const fecha = new Date(y, m, d, 0, 0, 0, 0);
  return Number.isFinite(fecha.getTime()) ? fecha : null;
}

function getUltimaMedicionCalendarioFecha() {
  const arr = Array.isArray(state.mediciones) ? state.mediciones : [];
  for (let i = 0; i < arr.length; i++) {
    const m = arr[i];
    const fecha = parseFechaCalendarioLocal(m && m.fecha);
    if (fecha) return fecha;
  }
  return parseFechaCalendarioLocal(state.ultimaMedicion && state.ultimaMedicion.fecha);
}

function getRecordatorioMedicionDiariaCalendario() {
  if (typeof sistemaEstaOperativa === 'function' && !sistemaEstaOperativa()) return null;
  const nPlantas =
    typeof contarPlantasTorreConVariedad === 'function' ? contarPlantasTorreConVariedad() : 0;
  const hayContexto = nPlantas > 0 || !!state.ultimaRecarga || !!getUltimaMedicionCalendarioFecha();
  if (!hayContexto) return null;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const ultimaFecha = getUltimaMedicionCalendarioFecha();
  const diasSinMedir = ultimaFecha ? Math.max(0, Math.round((hoy - ultimaFecha) / 86400000)) : null;
  const medidoHoy = !!(ultimaFecha && ultimaFecha.getTime() === hoy.getTime());
  const fechaObjetivo = new Date(hoy.getTime() + (medidoHoy ? 86400000 : 0));
  const titulo = medidoHoy ? 'Rutina diaria de medición' : 'Medición diaria pendiente';

  let desc = medidoHoy
    ? 'Hoy ya registraste una medición. Mañana vuelve a medir EC, pH y temperatura del agua para mantener el seguimiento al día.'
    : 'Conviene registrar al menos una medición hoy: EC, pH y temperatura del agua.';

  if (!medidoHoy && diasSinMedir != null) {
    if (diasSinMedir >= 2) {
      desc =
        'Llevas ' +
        diasSinMedir +
        ' días sin registrar mediciones. Toca medir hoy EC, pH y temperatura del agua.';
    } else if (diasSinMedir === 1) {
      desc = 'Ayer fue la última medición. Mantén la rutina y registra hoy EC, pH y temperatura del agua.';
    }
  } else if (!medidoHoy && diasSinMedir == null) {
    desc = 'Aún no hay mediciones guardadas en esta instalación. Empieza hoy con una toma de EC, pH y temperatura del agua.';
  }

  return {
    fecha: fechaObjetivo,
    evento: {
      tipo: 'medicion',
      icono: '📊',
      color: '#0369a1',
      label: '📊 ' + titulo,
      titulo,
      desc,
      action: 'medicion',
    },
  };
}

function getFechaSugeridaCambioNutriente() {
  try {
    const ctxNut = typeof hcGetRecomendacionNutrienteContexto === 'function'
      ? hcGetRecomendacionNutrienteContexto()
      : null;
    const msCtx = ctxNut && Number.isFinite(Number(ctxNut.fechaCambioMs))
      ? Number(ctxNut.fechaCambioMs)
      : null;
    const msFn = typeof hcGetFechaSugeridaCambioVegABloomMs === 'function'
      ? hcGetFechaSugeridaCambioVegABloomMs()
      : null;
    const ms = Number.isFinite(msCtx) ? msCtx : msFn;
    if (!Number.isFinite(ms)) return null;
    const d0 = new Date(ms);
    // Fecha local estable (sin sesgos de zona horaria en medianoche UTC).
    return new Date(d0.getFullYear(), d0.getMonth(), d0.getDate(), 0, 0, 0, 0);
  } catch (_) {
    return null;
  }
}

// Eventos del calendario basados en estado real del sistema
function generarEventos(fecha) {
  const eventos = [];
  const hoy = new Date();
  hoy.setHours(0,0,0,0);
  const d = new Date(fecha);
  d.setHours(0,0,0,0);
  const diffDias = Math.round((d - hoy) / 86400000);
  const tCal = tipoInstalacionNormalizado(state.configTorre || {});
  const sisLab =
    typeof etiquetaSistemaHidroponicoBreve === 'function'
      ? etiquetaSistemaHidroponicoBreve(state.configTorre || {})
      : '';
  const evalRecCal =
    typeof evaluarFatigaRecargaOculta === 'function' ? evaluarFatigaRecargaOculta() : null;
  const diObjRec =
    evalRecCal && Number.isFinite(evalRecCal.diasObjetivo)
      ? Math.max(9, Math.min(28, Math.round(evalRecCal.diasObjetivo)))
      : 15;
  const margenRec = Math.max(2, Math.min(4, Math.round(diObjRec * 0.14)));
  const fmtUbicPlantaCal = (n, ci) => formatoUbicacionEnRegistro(tCal, n + 1, ci + 1);
  const recMed = getRecordatorioMedicionDiariaCalendario();

  if (recMed && recMed.fecha.getTime() === d.getTime()) {
    eventos.push(recMed.evento);
  }

  // ── Control diario EC y pH ────────────────────────────────────────────
  eventos.push({
    tipo: 'control',
    icono: '📊',
    titulo: 'Control diario',
    desc: 'Medir EC (objetivo 1300-1400 µS/cm), pH (5.7-6.4) y temperatura del agua (18-22°C).'
  });

  // ── Recarga del depósito (intervalo ~diasObjetivo: volumen, tipo NFT/torre/DWC/RDWC, mediciones, reposición) ──
  if (state.ultimaRecarga) {
    const diasDesdeRecarga = Math.round((d - new Date(state.ultimaRecarga)) / 86400000);
    if (
      diasDesdeRecarga >= diObjRec - margenRec &&
      diasDesdeRecarga <= diObjRec + margenRec &&
      diasDesdeRecarga > 0
    ) {
      let descRec =
        `Día ${diasDesdeRecarga} desde la última recarga completa en ${sisLab || 'la instalación activa'} (vaciado + mezcla). ` +
        `Referencia ~${diObjRec} d (volumen, mediciones y reposiciones). Preparar checklist: agua, CalMag, A+B…`;
      try {
        const av =
          typeof getRecargaVolumenAvisoCfg === 'function'
            ? getRecargaVolumenAvisoCfg()
            : { activo: true, mult: 1, consejoDesdePct: 85 };
        if (
          av.activo &&
          typeof sumatorioReposicionLitrosDesdeRecargaCompleta === 'function' &&
          typeof getRecargaVolumenReferenciaLitros === 'function'
        ) {
          const ac = sumatorioReposicionLitrosDesdeRecargaCompleta();
          const volRef = getRecargaVolumenReferenciaLitros();
          if (ac && volRef && av.mult > 0 && ac.totalLitros >= volRef * av.mult * 0.75) {
            descRec +=
              ' En Medir verás también la reposición acumulada frente al umbral × volumen que tengas configurado.';
          }
        }
      } catch (_) {}
      eventos.push({
        tipo: 'recarga',
        icono: '🔄',
        titulo:
          (diasDesdeRecarga >= diObjRec ? '¡Recarga completa del depósito!' : 'Recarga completa próxima') +
          (sisLab ? ' · ' + sisLab : ''),
        desc: descRec,
      });
    }
  } else {
    const drift =
      evalRecCal && Number.isFinite(evalRecCal.diasRestantes)
        ? Math.max(1, evalRecCal.diasRestantes)
        : diObjRec;
    const target = new Date(hoy.getTime() + drift * 86400000);
    target.setHours(0, 0, 0, 0);
    const diffTarget = Math.round((d - target) / 86400000);
    if (diffTarget >= -margenRec && diffTarget <= margenRec) {
      eventos.push({
        tipo: 'recarga',
        icono: '🔄',
        titulo: 'Recarga completa estimada' + (sisLab ? ' · ' + sisLab : ''),
        desc:
          'Fecha orientativa según volumen de la instalación y tus mediciones recientes (misma lógica que la barra de recarga en Medir). ' +
          'Registra la última recarga real (interruptor o checklist) para fijar el ciclo al día. Preparar checklist: agua, CalMag, A+B…',
      });
    } else if (diffDias === 0) {
      eventos.push({
        tipo: 'recarga',
        icono: '🔄',
        titulo: 'Registra tu última recarga completa' + (sisLab ? ' · ' + sisLab : ''),
        desc:
          'En Mediciones: checklist de recarga o interruptor «Recarga completa» al guardar medición. Las reposiciones parciales no cuentan para este recordatorio' +
          (sisLab ? ' del ' + sisLab + '.' : '.'),
      });
    }
  }

  // ── Cambio de nutriente sugerido (veg -> bloom) ────────────────────────
  const fechaCambioNut = getFechaSugeridaCambioNutriente();
  const ctxNut = typeof hcGetRecomendacionNutrienteContexto === 'function'
    ? hcGetRecomendacionNutrienteContexto()
    : null;
  if (ctxNut && ctxNut.hayFruto && ctxNut.actual === 'veg') {
    if (fechaCambioNut) {
      const fx = new Date(fechaCambioNut);
      fx.setHours(0, 0, 0, 0);
      const diffCambio = Math.round((d - fx) / 86400000);
      if (diffCambio >= -10 && diffCambio <= 14) {
        const diasRec = state.ultimaRecarga ? Math.round((d - new Date(state.ultimaRecarga)) / 86400000) : null;
        const recargaCerca =
          Number.isFinite(diasRec) &&
          diasRec >= diObjRec - margenRec &&
          diasRec <= diObjRec + margenRec;
        const hintRecarga = recargaCerca
          ? 'Aprovecha la recarga completa de estos días para hacer el cambio.'
          : 'Si no coincide con recarga, programa una recarga anticipada o cambio controlado en cuanto puedas.';
        const titulo =
          diffCambio > 0
            ? '⚠️ Cambio de nutriente retrasado'
            : diffCambio === 0
              ? '🧪 Cambio de nutriente recomendado hoy'
              : '🧪 Cambio de nutriente próximo';
        const desc =
          diffCambio > 0
            ? 'Ya estás en ventana floral con línea vegetativa. ' + hintRecarga
            : diffCambio === 0
              ? 'Inicio de fase floral en cultivos de fruto. Cambia de nutriente vegetativo a floración/fruto. ' + hintRecarga
              : ('Faltan ' + Math.abs(diffCambio) + ' días para el cambio sugerido a nutriente de floración/fruto. Prepara la recarga. ' + hintRecarga);
        eventos.push({
          tipo: 'nutriente',
          icono: '🧪',
          titulo,
          desc,
        });
      }
    } else if (diffDias === 0) {
      eventos.push({
        tipo: 'nutriente',
        icono: '🧪',
        titulo: 'Cambio de nutriente pendiente de fecha',
        desc: 'Hay cultivos de fruto con nutriente vegetativo, pero faltan fechas en alguna ficha para calcular el día exacto del cambio. Completa fechas en Cultivo e instalación.',
      });
    }
  }

  // ── Mantenimiento específico RDWC ───────────────────────────────────────
  if (tCal === 'rdwc') {
    if (diffDias >= 0 && diffDias % 7 === 0) {
      eventos.push({
        tipo: 'control',
        icono: '🔁',
        titulo: 'Revisión semanal de recirculación RDWC',
        desc: 'Comprobar retorno por todos los módulos, limpiar prefiltro si aplica y verificar ausencia de fugas en racores/codos.',
      });
    }
    if (diffDias >= 0 && diffDias % 14 === 0) {
      eventos.push({
        tipo: 'control',
        icono: '💨',
        titulo: 'Aireación RDWC',
        desc: 'Inspeccionar difusores y mangueras de aire: burbujeo homogéneo, sin obstrucciones ni caída de caudal.',
      });
    }
    if (diffDias >= 0 && diffDias % 28 === 0) {
      eventos.push({
        tipo: 'recarga',
        icono: '🧪',
        titulo: 'RDWC — valorar recambio parcial o total',
        desc: 'Con 4 semanas de uso, revisar estabilidad EC/pH y decidir recambio parcial o recarga completa según deriva y carga radicular.',
      });
    }
  }

  // ── Cosechas y rotación ───────────────────────────────────────────────
  const nivelesActivos = getNivelesActivos();
  nivelesActivos.forEach(n => {
    (state.torre[n] || []).forEach((c, ci) => {
      if (!c || !c.variedad || !c.fecha) return;
      const diasEnHidro = Math.round((d - new Date(c.fecha)) / 86400000);
      const cultCal = typeof getCultivoDB === 'function' ? getCultivoDB(c.variedad) : null;
      const diasCicloBio =
        typeof getDiasEfectivosCicloBiologico === 'function'
          ? getDiasEfectivosCicloBiologico(c, cultCal, d.getTime())
          : diasEnHidro;
      const diasTotal = DIAS_COSECHA[c.variedad] || 50;
      const diasParaCosecha = diasTotal - diasCicloBio;

      if (diasParaCosecha >= 0 && diasParaCosecha <= 3) {
        eventos.push({
          tipo: 'cosecha',
          icono: '✂️',
          titulo: diasParaCosecha === 0 ? `¡Cosechar ${c.variedad}!` : `Cosecha próxima — ${c.variedad}`,
          desc: `${fmtUbicPlantaCal(n, ci)}. ${diasParaCosecha === 0 ? 'Lista para cosechar hoy.' : `En ${diasParaCosecha} días aproximadamente.`}`
        });
      }

      if (diasEnHidro >= 0 && diasEnHidro < DIAS_MUESTRA_PH_TRASPLANTE) {
        const nomC = cultivoNombreLista(getCultivoDB(c.variedad), c.variedad);
        eventos.push({
          tipo: 'plantula-ph',
          icono: '🧪',
          titulo:
            'Muestra diaria pH — plántula nueva (día ' +
            (diasEnHidro + 1) +
            '/' +
            DIAS_MUESTRA_PH_TRASPLANTE +
            ')',
          desc:
            fmtUbicPlantaCal(n, ci) +
            ' · ' +
            nomC +
            '. En los primeros días la raíz joven puede variar el pH de la solución: anota al menos una medición al día en Mediciones (pH y EC).'
        });
      }

      // Rotación escalonada — recordatorio si una planta supera los días
      if (diasParaCosecha < -3 && diasParaCosecha > -10) {
        eventos.push({
          tipo: 'rotacion',
          icono: '🔃',
          titulo: `Rotación pendiente — ${c.variedad}`,
          desc: `${fmtUbicPlantaCal(n, ci)}. Planta lista desde hace ${Math.abs(diasParaCosecha)} días. Trasplantar nuevas plántulas.`
        });
      }
    });
  });

  // ── Alertas estacionales Castelló ────────────────────────────────────
  const mes = d.getMonth() + 1;
  const dia = d.getDate();

  // Riesgo de bolting en lechugas (verano)
  if (mes >= 6 && mes <= 9) {
    eventos.push({
      tipo: 'clima',
      icono: '☀️',
      titulo: 'Temporada de calor — riesgo de espigado',
      desc: 'Las lechugas pueden espigarse con temperaturas > 28°C. Usar toldo en horas centrales y aumentar frecuencia de riego.'
    });
  }

  // Mejores meses para lechugas en Castelló
  if (mes === 3 || mes === 4 || mes === 9 || mes === 10) {
    eventos.push({
      tipo: 'clima',
      icono: '🌱',
      titulo: 'Época óptima para lechugas',
      desc: 'Temperaturas ideales para el cultivo de lechugas en Castelló. Máximo crecimiento y calidad.'
    });
  }

  // Riesgo de heladas
  if (mes === 12 || mes === 1 || mes === 2) {
    eventos.push({
      tipo: 'clima',
      icono: '🥶',
      titulo: 'Riesgo de noches frías',
      desc: 'Verificar que el calentador del depósito funciona correctamente. Temperatura mínima del agua: 18°C.'
    });
  }

  // Spray calcio preventivo (primavera-verano)
  if (mes >= 4 && mes <= 8 && dia % 3 === 0) {
    eventos.push({
      tipo: 'control',
      icono: '🧪',
      titulo: 'Spray foliar de calcio preventivo',
      desc: 'Aplicar spray de calcio por la mañana temprano antes del sol. Previene el tipburn en hojas jóvenes.'
    });
  }

  return eventos;
}

function tieneEventos(fecha) {
  const eventos = generarEventos(fecha);
  return eventos.some(e => e.tipo !== 'control');
}

function escAriaAttr(str) {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function renderCalendario() {
  try {
  const calMesLabel = document.getElementById('calMesLabel');
  if (!calMesLabel) return; // pestaña no activa
  const hoy  = new Date();
  const año  = calFecha.getFullYear();
  const mes  = calFecha.getMonth();
  const sisCal =
    typeof etiquetaSistemaHidroponicoBreve === 'function'
      ? etiquetaSistemaHidroponicoBreve(state.configTorre || {})
      : '';
  calMesLabel.textContent = MESES_LARGO[mes] + ' ' + año;

  // ── Construir mapa de eventos ────────────────────────────────────────────
  const eventos = {};

  const addEvento = (dia, tipo, color, label) => {
    eventos[dia] = eventos[dia] || [];
    eventos[dia].push({ tipo, color, label });
  };

  // Mediciones locales guardadas
  (state.mediciones || []).forEach(m => {
    if (!m.fecha) return;
    const parts = m.fecha.split('/');
    if (parts.length < 3) return;
    const d = parseInt(parts[0]), mo = parseInt(parts[1])-1, a = parseInt(parts[2]);
    if (mo === mes && a === año) addEvento(d, 'medicion', '#0369a1', '📊 Medición EC:' + (m.ec||'—') + ' pH:' + (m.ph||'—'));
  });

  const recMed = getRecordatorioMedicionDiariaCalendario();
  if (recMed) {
    const fechaRec = recMed.fecha;
    if (fechaRec.getMonth() === mes && fechaRec.getFullYear() === año) {
      addEvento(fechaRec.getDate(), recMed.evento.tipo, recMed.evento.color, recMed.evento.label);
    }
  }

  // Recargas: intervalo adaptativo (misma base que Medir / evaluarFatigaRecargaOculta)
  const evalRecGrid =
    typeof evaluarFatigaRecargaOculta === 'function' ? evaluarFatigaRecargaOculta() : null;
  const diObjGrid =
    evalRecGrid && Number.isFinite(evalRecGrid.diasObjetivo)
      ? Math.max(9, Math.min(28, Math.round(evalRecGrid.diasObjetivo)))
      : 15;
  const hoyGrid = new Date();
  hoyGrid.setHours(0, 0, 0, 0);
  const baseMs =
    typeof parseUltimaRecargaCompletaDayMs === 'function' ? parseUltimaRecargaCompletaDayMs() : null;

  if (baseMs != null) {
    const base = new Date(baseMs);
    base.setHours(0, 0, 0, 0);
    for (let n = 1; n <= 24; n++) {
      const rec = new Date(base.getTime() + n * diObjGrid * 86400000);
      if (rec.getMonth() === mes && rec.getFullYear() === año) {
        addEvento(
          rec.getDate(),
          'recarga',
          '#16a34a',
          '💧 Recarga · ~' + diObjGrid + ' d' + (sisCal ? ' · ' + sisCal : '')
        );
      }
    }
  } else {
    const hayCtxRecargaCal =
      (typeof contarPlantasTorreConVariedad === 'function' && contarPlantasTorreConVariedad() > 0) ||
      !!getUltimaMedicionCalendarioFecha() ||
      (typeof getVolumenDepositoMaxLitros === 'function' &&
        getVolumenDepositoMaxLitros(state.configTorre || {}) != null);
    if (hayCtxRecargaCal) {
      const drift =
        evalRecGrid && Number.isFinite(evalRecGrid.diasRestantes)
          ? Math.max(1, evalRecGrid.diasRestantes)
          : diObjGrid;
      const first = new Date(hoyGrid.getTime() + drift * 86400000);
      first.setHours(0, 0, 0, 0);
      for (let k = 0; k < 12; k++) {
        const rec = new Date(first.getTime() + k * diObjGrid * 86400000);
        if (rec.getMonth() === mes && rec.getFullYear() === año) {
          addEvento(
            rec.getDate(),
            'recarga',
            '#ca8a04',
            '💧 Recarga (estim.) · ~' + diObjGrid + ' d' + (sisCal ? ' · ' + sisCal : '')
          );
        }
      }
    }
  }

  // Marca de calendario: cambio de nutriente (fecha objetivo + ventana activa)
  const fechaCambioNut = getFechaSugeridaCambioNutriente();
  const ctxNut = typeof hcGetRecomendacionNutrienteContexto === 'function'
    ? hcGetRecomendacionNutrienteContexto()
    : null;
  if (ctxNut && ctxNut.hayFruto && ctxNut.actual === 'veg' && fechaCambioNut) {
    const objetivo0 = new Date(fechaCambioNut);
    objetivo0.setHours(0, 0, 0, 0);

    // Marcar la ventana visible completa (10 días antes y 14 después),
    // incluyendo el día objetivo exacto.
    for (let off = -10; off <= 14; off++) {
      const diaMarca = new Date(objetivo0.getTime() + off * 86400000);
      if (diaMarca.getMonth() !== mes || diaMarca.getFullYear() !== año) continue;
      const etiqueta =
        off > 0
          ? '⚠️ Cambio de nutriente retrasado'
          : off === 0
            ? '🧪 Día recomendado: cambio a floración/fruto'
            : '🧪 Cambio de nutriente próximo';
      addEvento(diaMarca.getDate(), 'nutriente', '#7c3aed', etiqueta);
    }
  }
  if (ctxNut && ctxNut.hayFruto && ctxNut.actual === 'veg' && !fechaCambioNut) {
    const hoy0 = new Date();
    if (hoy0.getMonth() === mes && hoy0.getFullYear() === año) {
      addEvento(
        hoy0.getDate(),
        'nutriente',
        '#7c3aed',
        '🧪 Cambio de nutriente pendiente (faltan fechas en fichas)'
      );
    }
  }
  if (ctxNut && ctxNut.hayFruto && ctxNut.actual === 'veg' && ctxNut.recomendado === 'bloom') {
    const hoy0 = new Date();
    if (hoy0.getMonth() === mes && hoy0.getFullYear() === año) {
      addEvento(
        hoy0.getDate(),
        'nutriente',
        '#7c3aed',
        '⚠️ Ya corresponde cambio a nutriente de floración/fruto'
      );
    }
  }

  // Limpieza — cada 30 días
  if (state.ultimaRecarga) {
    let base = new Date(state.ultimaRecarga);
    for (let i = 1; i <= 4; i++) {
      const lim = new Date(base.getTime() + i * 30 * 86400000);
      if (lim.getMonth() === mes && lim.getFullYear() === año)
        addEvento(lim.getDate(), 'limpieza', '#d97706', '🧹 Limpieza torre y cestas');
    }
  }

  // Cosechas estimadas por planta
  const nivelesActivos = getNivelesActivos();
  nivelesActivos.forEach(n => {
    (state.torre[n] || []).forEach((cesta, c) => {
      if (!cesta.variedad || !cesta.fecha) return;
      const diasTotal = DIAS_COSECHA[cesta.variedad] || 50;
      const siembra   = new Date(cesta.fecha);
      const cosecha   = new Date(siembra.getTime() + diasTotal * 86400000);
      if (cosecha.getMonth() === mes && cosecha.getFullYear() === año)
        addEvento(cosecha.getDate(), 'cosecha', '#dc2626', '✂️ Cosecha N' + (n+1) + ' C' + (c+1) + ' (' + cultivoNombreLista(getCultivoDB(cesta.variedad), cesta.variedad) + ')');
      const siembraPh = new Date(cesta.fecha);
      siembraPh.setHours(0, 0, 0, 0);
      for (let k = 0; k < DIAS_MUESTRA_PH_TRASPLANTE; k++) {
        const diaPh = new Date(siembraPh.getTime() + k * 86400000);
        if (diaPh.getMonth() === mes && diaPh.getFullYear() === año) {
          addEvento(
            diaPh.getDate(),
            'plantula-ph',
            '#7c3aed',
            '🧪 pH plántula N' +
              (n + 1) +
              ' C' +
              (c + 1) +
              ' · día ' +
              (k + 1) +
              '/' +
              DIAS_MUESTRA_PH_TRASPLANTE
          );
        }
      }
    });
  });

  // ── Renderizar grid ──────────────────────────────────────────────────────
  const grid = document.getElementById('calGrid');
  grid.innerHTML = '';
  const diasMes   = new Date(año, mes + 1, 0).getDate();
  const primerDia = new Date(año, mes, 1).getDay();
  const offset    = primerDia === 0 ? 6 : primerDia - 1;

  for (let i = 0; i < offset; i++) grid.innerHTML += '<div></div>';

  for (let d = 1; d <= diasMes; d++) {
    const esHoy = (d === hoy.getDate() && mes === hoy.getMonth() && año === hoy.getFullYear());
    const evs   = eventos[d] || [];
    const esSel =
      calDiaSeleccionado != null &&
      d === calDiaSeleccionado.getDate() &&
      mes === calDiaSeleccionado.getMonth() &&
      año === calDiaSeleccionado.getFullYear();
    const dots  = evs.slice(0,3).map(e =>
      '<div class="cal-ev-dot" style="--cal-dot-bg:' + e.color + '"></div>'
    ).join('');

    let cellClass = 'cal-cell';
    if (esHoy) cellClass += ' cal-cell--today';
    else if (evs.length > 0) cellClass += ' cal-cell--marked';
    if (esSel) cellClass += ' cal-cell--selected';
    const numInner =
      '<div class="cal-cell-num">' + d + '</div>' +
      '<div class="cal-cell-dots">' + dots + '</div>';
    const ariaToday = esHoy ? ' aria-current="date"' : '';

    if (evs.length > 0) {
      const ariaLbl = escAriaAttr(
        d + ' de ' + MESES_LARGO[mes] + ' ' + año + '. ' + evs.map(e => e.label).join('. ')
      );
      grid.innerHTML +=
        '<button type="button" class="cal-day-btn ' + cellClass + '" aria-label="' + ariaLbl + '"' + ariaToday +
        ' onclick="mostrarEventosDiaHC(' + d + ',' + mes + ',' + año + ')">' + numInner + '</button>';
    } else {
      grid.innerHTML += '<div class="' + cellClass + '"' + ariaToday + '>' + numInner + '</div>';
    }
  }

  // ── Tarjeta: detalle del día elegido o lista de próximos ─────────────────
  const diaHoy = (mes === hoy.getMonth() && año === hoy.getFullYear()) ? hoy.getDate() : 1;
  const proximos = [];
  Object.entries(eventos).forEach(([dia, evs]) => {
    if (parseInt(dia) >= diaHoy) {
      evs.forEach(e => proximos.push({ dia: parseInt(dia), ...e }));
    }
  });
  proximos.sort((a, b) => a.dia - b.dia);

  const mesCorto = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][mes];
  const eventosDiaEl = document.getElementById('eventosDia');
  const calDiaLabelEl = document.getElementById('calDiaLabel');

  const sel = calDiaSeleccionado;
  const selEnMes =
    sel != null &&
    sel.getFullYear() === año &&
    sel.getMonth() === mes;

  if (selEnMes) {
    mostrarEventosDia(sel);
  } else {
    if (calDiaLabelEl) calDiaLabelEl.textContent = '';
    if (proximos.length === 0) {
      eventosDiaEl.innerHTML = '<div class="cal-list-empty">No hay eventos próximos este mes</div>';
    } else {
      eventosDiaEl.innerHTML = proximos.slice(0, 8).map(e =>
        '<div class="cal-prox-row"' +
        (e.tipo === 'nutriente'
          ? ' role="button" tabindex="0" onclick="irChecklistDesdeCalendario()" onkeydown="a11yKeyActivate(event, irChecklistDesdeCalendario)" aria-label="Ir a Historial y abrir checklist"'
          : e.action === 'medicion'
            ? ' role="button" tabindex="0" onclick="irAMedicionesDesdeCalendario()" onkeydown="a11yKeyActivate(event, irAMedicionesDesdeCalendario)" aria-label="Ir a Mediciones"'
            : '') +
        '>' +
        '<div class="cal-prox-badge" style="--ev:' + e.color + '">' +
        '<div class="cal-prox-badge-dia">' + e.dia + '</div>' +
        '<div class="cal-prox-badge-mes">' + mesCorto + '</div>' +
        '</div>' +
        '<div class="cal-prox-label">' + e.label + '</div>' +
        '</div>'
      ).join('');
    }
  }

  } catch(e) { console.error("renderCalendario error:", e); }
}

function mostrarEventosDiaHC(d, mes, año) {
  calDiaSeleccionado = new Date(año, mes, d);
  calDiaSeleccionado.setHours(0, 0, 0, 0);
  renderCalendario();
  const host = document.getElementById('eventosDia');
  const card = host && host.closest('.card');
  if (card) requestAnimationFrame(function () {
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

function irChecklistDesdeCalendario() {
  try {
    if (typeof goTab === 'function') goTab('historial');
    setTimeout(() => {
      const btn = document.querySelector('.hist-checklist-btn');
      if (!btn) return;
      btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      btn.classList.add('pulse');
      setTimeout(() => btn.classList.remove('pulse'), 1300);
    }, 120);
  } catch (_) {}
}

function irAMedicionesDesdeCalendario() {
  try {
    if (typeof goTab === 'function') goTab('mediciones');
    setTimeout(() => {
      const host = document.getElementById('ultimaMedicionCard') || document.getElementById('inputEC');
      if (!host) return;
      host.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (host instanceof HTMLInputElement) host.focus();
    }, 120);
  } catch (_) {}
}


function seleccionarDiaCal(fecha) {
  calDiaSeleccionado = fecha;
  renderCalendario();
}

function mostrarEventosDia(fecha) {
  const hoy = new Date();
  hoy.setHours(0,0,0,0);
  const diffDias = Math.round((fecha - hoy) / 86400000);
  const labelDia = diffDias === 0 ? 'Hoy' : diffDias === 1 ? 'Mañana' :
    diffDias === -1 ? 'Ayer' :
    `${fecha.getDate()} de ${MESES_LARGO[fecha.getMonth()]}`;

  const calLbl = document.getElementById('calDiaLabel');
  if (calLbl) calLbl.textContent = labelDia;

  const eventos = generarEventos(fecha);
  const lista = document.getElementById('eventosDia');

  if (eventos.length === 0) {
    lista.innerHTML = '<div class="cal-day-empty">Sin eventos especiales este día</div>';
    return;
  }

  lista.innerHTML = eventos.map(e => `
    <div class="evento-item evento-tipo-${e.tipo}">
      <div class="evento-icono">${e.icono}</div>
      <div class="evento-body">
        <div class="evento-titulo">${e.titulo}</div>
        <div class="evento-desc">${e.desc}</div>
        ${e.tipo === 'nutriente'
          ? '<button type="button" class="btn btn-primary evento-cta-checklist" onclick="irChecklistDesdeCalendario()">Ir a Historial → Checklist</button>'
          : e.action === 'medicion'
            ? '<button type="button" class="btn btn-primary evento-cta-checklist" onclick="irAMedicionesDesdeCalendario()">Ir a Mediciones</button>'
          : ''}
      </div>
    </div>
  `).join('');
}

function calNavMes(dir) {
  calFecha.setMonth(calFecha.getMonth() + dir);
  renderCalendario();
}
