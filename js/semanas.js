// Semanas + calendario de hitos y tareas

function addDays(d, n) {
  const x = new Date(d.getTime());
  x.setDate(x.getDate() + n);
  return x;
}

function localDateKey(d) {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

function monthAdd(y, m, delta) {
  const d = new Date(y, m + delta, 1);
  return { y: d.getFullYear(), m: d.getMonth() };
}

function escapeCalendarAttrText(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Mapa día (YYYY-MM-DD) → lista de eventos */
function collectGrowCalendarEvents(grow) {
  const s = grow.strain;
  const start = new Date(grow.startDate);
  const totalW = s.vegW + s.flowerW + 2;
  const byDay = {};
  const add = (dt, ev) => {
    const k = localDateKey(dt);
    if (!byDay[k]) byDay[k] = [];
    byDay[k].push(ev);
  };

  add(start, { type: 'milestone', label: 'Inicio / germinación', icon: 'plant' });

  const transplantD = grow.transplantDate ? new Date(grow.transplantDate) : addDays(start, 6);
  add(transplantD, { type: 'task', label: 'Trasplante al hidropónico', icon: 'bucket' });

  if (s.type !== 'auto') {
    const flip = addDays(start, s.vegW * 7);
    add(flip, { type: 'milestone', label: 'Cambio 12/12 (floración)', icon: 'sun' });
  } else {
    add(addDays(start, 18), { type: 'task', label: 'Auto: fotoperiodo largo (18–20 h)', icon: 'sun' });
  }

  const flushStart = addDays(start, (totalW - 2) * 7);
  add(flushStart, { type: 'task', label: 'Flush · agua RO baja EC', icon: 'droplet' });

  const harvest = addDays(start, totalW * 7);
  add(harvest, { type: 'milestone', label: 'Cosecha orientativa', icon: 'scissors' });

  for (let d = 10; d < totalW * 7; d += 10) {
    add(addDays(start, d), {
      type: 'maint',
      label: 'Renovación parcial de solución (~10 días) · revisar pH / EC',
      icon: 'refresh',
    });
  }

  for (let d = 7; d < totalW * 7; d += 7) {
    add(addDays(start, d), {
      type: 'maint',
      label: 'Calibrar o verificar medidores pH y EC (orientativo 7 días)',
      icon: 'gauge',
    });
  }

  if (s.type === 'auto') {
    add(addDays(start, 10), { type: 'task', label: 'Auto: LST suave (sin topping)', icon: 'line' });
    add(addDays(start, 35), { type: 'milestone', label: 'Auto: floración en curso — vigilar EC baja', icon: 'plant' });
  }

  const wk = Math.max(1, s.vegW + Math.floor(s.flowerW / 2));
  add(addDays(start, wk * 7), { type: 'task', label: 'PK / engorde según tabla', icon: 'flask' });

  return byDay;
}

function renderMonthGrid(year, month, eventMap) {
  const first = new Date(year, month, 1);
  const pad = (first.getDay() + 6) % 7;
  const dim = new Date(year, month + 1, 0).getDate();
  const title = first.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const heads = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  let cells = '';
  for (let i = 0; i < pad; i++) {
    cells += `<div class="cal-cell cal-cell--empty"></div>`;
  }
  for (let day = 1; day <= dim; day++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const evs = eventMap[key] || [];
    const isToday = (() => {
      const t = new Date();
      return t.getFullYear() === year && t.getMonth() === month && t.getDate() === day;
    })();
    const marks = evs
      .map((e) => `<span class="cal-dot cal-dot--${e.type}" title="${e.label.replace(/"/g, '&quot;')}"></span>`)
      .join('');
    const miniIcons = evs.length
      ? `<div class="cal-mini-icons">${evs
          .slice(0, 2)
          .map((e) => `<i class="ti ti-${e.icon}" title="${escapeCalendarAttrText(e.label)}"></i>`)
          .join('')}</div>`
      : '';
    const titleText = evs.length ? evs.map((e) => e.label).join(' · ') : `Día ${day}`;
    const dateObj = new Date(year, month, day);
    const dateLabel = dateObj.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const interactive = evs.length
      ? ` role="button" tabindex="0" onclick="openGrowCalendarDay('${key}','${escapeCalendarAttrText(dateLabel)}')" onkeydown="onGrowCalendarDayKey(event,'${key}','${escapeCalendarAttrText(dateLabel)}')"`
      : '';
    cells += `<div class="cal-cell ${isToday ? 'cal-cell--today' : ''} ${evs.length ? 'cal-cell--busy cal-cell--interactive' : ''}"${interactive}>
      <div class="cal-day-top"><span class="cal-day-num">${day}</span><span class="cal-dots">${marks}</span></div>
      <div class="cal-day-body" title="${escapeCalendarAttrText(titleText)}">${miniIcons}</div>
    </div>`;
  }
  return `
    <div class="cal-month">
      <div class="cal-month-title">${title}</div>
      <div class="cal-weekday-row">${heads.map((h) => `<div class="cal-wd">${h}</div>`).join('')}</div>
      <div class="cal-grid">${cells}</div>
    </div>`;
}

function renderGrowCalendarSection(grow) {
  const eventMap = collectGrowCalendarEvents(grow);
  window.__growCalendarEventMap = eventMap;
  const start = new Date(grow.startDate);
  let y = start.getFullYear();
  let m = start.getMonth();
  const today = new Date();
  if (today < start) {
    y = today.getFullYear();
    m = today.getMonth();
  }
  const months = [renderMonthGrid(y, m, eventMap)];
  const m1 = monthAdd(y, m, 1);
  months.push(renderMonthGrid(m1.y, m1.m, eventMap));
  const m2 = monthAdd(y, m, 2);
  months.push(renderMonthGrid(m2.y, m2.m, eventMap));
  return `
    <div class="card grow-calendar-card">
      <div class="card-header"><div class="card-title"><i class="ti ti-calendar-event"></i>Calendario de tareas e hitos</div></div>
      <p class="body-prose">Fechas desde el <strong>inicio del cultivo</strong> y la duración de <strong>${grow.strain.name}</strong>. Incluye renovación orientativa de solución (~10 días), revisión de medidores pH/EC (~7 días) y tareas. Leyenda: <span class="cal-dot cal-dot--milestone"></span> hito <span class="cal-dot cal-dot--task"></span> tarea <span class="cal-dot cal-dot--maint"></span> mantenimiento</p>
      <div class="cal-months-row">${months.join('')}</div>
      <div class="cal-day-modal" id="growCalDayModal" aria-hidden="true">
        <div class="cal-day-modal__scrim" onclick="closeGrowCalendarDay()"></div>
        <div class="cal-day-modal__panel" role="dialog" aria-labelledby="growCalDayTitle">
          <div class="cal-day-modal__head">
            <div id="growCalDayTitle" class="cal-day-modal__title">Detalle del día</div>
            <button type="button" class="cal-day-modal__close" onclick="closeGrowCalendarDay()" aria-label="Cerrar"><i class="ti ti-x"></i></button>
          </div>
          <div id="growCalDayBody" class="cal-day-modal__body"></div>
        </div>
      </div>
    </div>`;
}

function onGrowCalendarDayKey(ev, dayKey, dayLabel) {
  if (ev.key === 'Enter' || ev.key === ' ') {
    ev.preventDefault();
    openGrowCalendarDay(dayKey, dayLabel);
  }
}

function openGrowCalendarDay(dayKey, dayLabel) {
  const modal = document.getElementById('growCalDayModal');
  const title = document.getElementById('growCalDayTitle');
  const body = document.getElementById('growCalDayBody');
  if (!modal || !title || !body) return;
  const map = window.__growCalendarEventMap || {};
  const events = Array.isArray(map[dayKey]) ? map[dayKey] : [];
  title.textContent = dayLabel || 'Detalle del día';
  body.innerHTML = events.length
    ? `<ul class="cal-day-modal__list">${events
        .map((e) => `<li><i class="ti ti-${e.icon}"></i><span>${e.label}</span></li>`)
        .join('')}</ul>`
    : `<p class="text-muted">Sin tareas programadas.</p>`;
  modal.classList.add('cal-day-modal--open');
  modal.setAttribute('aria-hidden', 'false');
}

function closeGrowCalendarDay() {
  const modal = document.getElementById('growCalDayModal');
  if (!modal) return;
  modal.classList.remove('cal-day-modal--open');
  modal.setAttribute('aria-hidden', 'true');
}

function renderSemanas() {
  const sc = document.getElementById('semanasContent');
  if (!myGrow) {
    sc.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="ti ti-calendar-stats"></i></div><p>El calendario aparece cuando tengas un cultivo activo.</p><button type="button" class="btn btn-primary" onclick="navTo('cultivo')">Ir a Cultivo</button></div>`;
    return;
  }
  const s = myGrow.strain;
  const n = nutrients.find((x) => x.rank === myGrow.nutri) || nutrients[0];
  const totalW = s.vegW + s.flowerW + 2;
  const rows = [];
  for (let w = 1; w <= totalW; w++) {
    let phase,
      phClass,
      ec,
      ph,
      light,
      hum,
      temp,
      accion,
      nutri;
    if (w === 1) {
      phase = 'Germinación';
      phClass = 'ph-germ';
      ec = '0.3–0.5';
      ph = '5.5–5.7';
      light = '18/6';
      hum = '70–90%';
      temp = '22–26°C';
      accion = 'Germinar en papel húmedo o jiffy. Cúpula de humedad.';
      nutri = n.phases.germ;
    } else if (w <= s.vegW) {
      phase = 'Vegetación';
      phClass = 'ph-veg';
      const p = s.vegW <= 1 ? 1 : (w - 1) / (s.vegW - 1);
      const ecLow = (s.ecVeg + p * 0.4).toFixed(1);
      const ecHi = (s.ecVeg + 0.1 + p * 0.5).toFixed(1);
      ec = ecLow + '–' + ecHi;
      ph = s.ph;
      light = '18/6';
      hum = '55–70%';
      temp = '24–28°C';
      accion =
        w === 2
          ? 'Trasplantar a sistema hidro. Iniciar nutrientes. Primeros LST.'
          : w === 3
            ? 'Topping (si procede). ScrOG: guiar ramas por la malla.'
            : w <= 5
              ? 'Continuar entrenamiento. Defoliar 20-30% hojas basales.'
              : 'Verificar que la malla ScrOG esté completa.';
      nutri = n.phases.veg;
    } else if (w <= s.vegW + 2) {
      phase = 'Prefloración';
      phClass = 'ph-pre';
      ec = ((s.ecVeg + s.ecFlower) / 2).toFixed(1) + '–' + ((s.ecVeg + s.ecFlower) / 2 + 0.2).toFixed(1);
      ph = '5.8–6.2';
      light = '12/12';
      hum = '50–60%';
      temp = '22–26°C';
      accion =
        w === s.vegW + 1
          ? 'CAMBIAR FOTOPERIODO 12/12. Plantas se estirarán 50-100%. Subir EC gradualmente.'
          : 'Continuar stretch. Ajustar EC. Primeros pistilos visibles.';
      nutri = n.phases.veg + ' (transición a bloom)';
    } else if (w <= s.vegW + s.flowerW - 2) {
      const fp = w - s.vegW - 2;
      const ftotal = s.flowerW - 2;
      phase = 'Floración S' + fp;
      phClass = 'ph-flower';
      const ecN = (s.ecFlower + Math.min(fp / ftotal, 1) * 0.2).toFixed(1);
      ec = ecN + '–' + (parseFloat(ecN) + 0.2).toFixed(1);
      ph = s.phFlower;
      light = '12/12';
      hum = '40–55%';
      temp = '20–26°C';
      accion =
        fp === 1
          ? 'Cogollos formándose. No tocar técnica. Solo mantenimiento solución.'
          : fp === 3
            ? 'Defoliación floración si hay exceso de follaje.'
            : fp >= ftotal - 1
              ? 'Monitorear tricomas con lupa. PK Booster si corresponde.'
              : 'Mantenimiento rutinario. Revisar EC/pH diariamente.';
      nutri = n.phases.flower;
    } else if (w <= s.vegW + s.flowerW) {
      phase = 'Engorde';
      phClass = 'ph-engorde';
      ec = s.ecPeak + '–' + (s.ecPeak - 0.2).toFixed(1) + ' (bajar)';
      ph = s.phFlower;
      light = '12/12';
      hum = '35–50%';
      temp = '18–24°C';
      accion = 'Tricomas ámbar 10-20%. Preparar agua RO para flush. Última dosis nutrientes.';
      nutri = 'Últimas dosis de ' + n.phases.flower;
    } else {
      phase = 'Flush';
      phClass = 'ph-flush';
      ec = '0.1–0.3';
      ph = '6.0–6.5';
      light = '12/12';
      hum = '35–45%';
      temp = '18–22°C';
      accion = 'Solo agua RO. EC <0.3. Tricomas: 20-30% ámbar = COSECHAR. Oscuridad 48h opcional antes de cosecha.';
      nutri = n.phases.flush;
    }
    const ecPct = Math.min(100, Math.round(((parseFloat(ec) || 0) / 3) * 100));
    rows.push(`<tr>
      <td data-label="Sem" class="td-week-num">${w}</td>
      <td data-label="Fase"><span class="phase-pill ${phClass}">${phase}</span></td>
      <td data-label="EC (mS/cm)"><div class="ec-bar"><div class="ec-fill" style="--fill-pct:${ecPct}%"></div><span class="ec-val">${ec}</span></div></td>
      <td data-label="pH" class="td-ph">${ph}</td>
      <td data-label="Luz" class="td-light">${light}</td>
      <td data-label="Humedad" class="td-hum">${hum}</td>
      <td data-label="Temp." class="td-temp">${temp}</td>
      <td data-label="Acción" class="td-week-action">${accion}</td>
    </tr>`);
  }
  const sysProf = typeof getSystemProfile === 'function' ? getSystemProfile(myGrow.system) : null;
  const sysTitle =
    typeof getResolvedSystemDisplayName === 'function'
      ? getResolvedSystemDisplayName(myGrow, myGrow.system)
      : sysProf
        ? sysProf.label
        : myGrow.system;
  sc.innerHTML = `
    ${renderGrowCalendarSection(myGrow)}
    <div class="card card--table">
      <div class="card-header"><div class="card-title"><i class="ti ti-calendar"></i>${s.name} — Plan semanal (${totalW} sem) · ${n.name.split(' ').slice(0, 2).join(' ')}</div></div>
      ${
        sysProf
          ? `<div class="alert info alert--mt-sm"><i class="ti ti-bucket"></i><p><strong>${escapeCalendarAttrText(sysTitle)}:</strong> ${sysProf.optimalHint}</p></div>`
          : ''
      }
      <div class="table-scroll">
      <table class="week-table week-table--stack">
        <thead><tr><th>Sem</th><th>Fase</th><th>EC (mS/cm)</th><th>pH</th><th>Luz</th><th>Humedad</th><th>Temp.</th><th>Acción principal</th></tr></thead>
        <tbody>${rows.join('')}</tbody>
      </table>
      </div>
    </div>
    <div class="alert info"><i class="ti ti-info-circle"></i><p>Dosis nutriente de referencia: <strong>${n.name}</strong>. Rangos EC/pH de la tabla se cruzan con tu <strong>variedad</strong> en Medir y Consejos.</p></div>
  `;
}

window.openGrowCalendarDay = openGrowCalendarDay;
window.closeGrowCalendarDay = closeGrowCalendarDay;
window.onGrowCalendarDayKey = onGrowCalendarDayKey;
