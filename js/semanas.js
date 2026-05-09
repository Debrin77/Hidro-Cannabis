// Semanas

function renderSemanas(){
  const sc=document.getElementById('semanasContent');
  if(!myGrow){
    sc.innerHTML=`<div class="alert info"><i class="ti ti-info-circle"></i><p>Activa un cultivo en <strong>Mi Cultivo</strong> para ver el calendario semanal.</p></div>`;
    return;
  }
  const s = myGrow.strain;
  const n = nutrients.find(x=>x.rank===myGrow.nutri)||nutrients[0];
  const totalW = s.vegW+s.flowerW+2;
  const rows = [];
  for(let w=1;w<=totalW;w++){
    let phase,phClass,ec,ph,light,hum,temp,accion,nutri;
    if(w===1){phase='Germinación';phClass='ph-germ';ec='0.3–0.5';ph='5.5–5.7';light='18/6';hum='70–90%';temp='22–26°C';accion='Germinar en papel húmedo o jiffy. Cúpula de humedad.';nutri=n.phases.germ;}
    else if(w<=s.vegW){
      phase='Vegetación';phClass='ph-veg';
      const p=(w-1)/(s.vegW-1);
      const ecLow=(s.ecVeg+p*0.4).toFixed(1);
      const ecHi=(s.ecVeg+0.1+p*0.5).toFixed(1);
      ec=ecLow+'–'+ecHi;ph=s.ph;light='18/6';hum='55–70%';temp='24–28°C';
      accion=w===2?'Trasplantar a sistema hidro. Iniciar nutrientes. Primeros LST.':
             w===3?'Topping (si procede). ScrOG: guiar ramas por la malla.':
             w<=5?'Continuar entrenamiento. Defoliar 20-30% hojas basales.':'Verificar que la malla ScrOG esté completa.';
      nutri=n.phases.veg;
    } else if(w<=s.vegW+2){
      phase='Prefloración';phClass='ph-pre';ec=((s.ecVeg+s.ecFlower)/2).toFixed(1)+'–'+((s.ecVeg+s.ecFlower)/2+0.2).toFixed(1);ph='5.8–6.2';light='12/12';hum='50–60%';temp='22–26°C';
      accion=w===s.vegW+1?'CAMBIAR FOTOPERIODO 12/12. Plantas se estirarán 50-100%. Subir EC gradualmente.':'Continuar stretch. Ajustar EC. Primeros pistilos visibles.';
      nutri=n.phases.veg+' (transición a bloom)';
    } else if(w<=s.vegW+s.flowerW-2){
      const fp=w-s.vegW-2;const ftotal=s.flowerW-2;
      phase='Floración S'+fp;phClass='ph-flower';
      const ecN=(s.ecFlower+Math.min(fp/ftotal,1)*0.2).toFixed(1);
      ec=ecN+'–'+(parseFloat(ecN)+0.2).toFixed(1);ph=s.phFlower;light='12/12';hum='40–55%';temp='20–26°C';
      accion=fp===1?'Cogollos formándose. No tocar técnica. Solo mantenimiento solución.':
             fp===3?'Defoliación floración si hay exceso de follaje.':
             fp>=ftotal-1?'Monitorear tricomas con lupa. PK Booster si corresponde.':
             'Mantenimiento rutinario. Revisar EC/pH diariamente.';
      nutri=n.phases.flower;
    } else if(w<=s.vegW+s.flowerW){
      phase='Engorde';phClass='ph-engorde';ec=s.ecPeak+'–'+(s.ecPeak-0.2).toFixed(1)+' (bajar)';ph=s.phFlower;light='12/12';hum='35–50%';temp='18–24°C';
      accion='Tricomas ámbar 10-20%. Preparar agua RO para flush. Última dosis nutrientes.';
      nutri='Últimas dosis de '+n.phases.flower;
    } else {
      phase='Flush';phClass='ph-flush';ec='0.1–0.3';ph='6.0–6.5';light='12/12';hum='35–45%';temp='18–22°C';
      accion='Solo agua RO. EC <0.3. Tricomas: 20-30% ámbar = COSECHAR. Oscuridad 48h opcional antes de cosecha.';
      nutri=n.phases.flush;
    }
    rows.push(`<tr>
      <td style="font-weight:600;color:var(--text);font-family:'DM Mono'">${w}</td>
      <td><span class="phase-pill ${phClass}">${phase}</span></td>
      <td><div class="ec-bar"><div class="ec-fill" style="width:${Math.min(100,parseFloat(ec)*35).toFixed(0)}px"></div><span class="ec-val">${ec}</span></div></td>
      <td style="font-family:'DM Mono';color:var(--b400)">${ph}</td>
      <td style="color:var(--a200)">${light}</td>
      <td style="color:var(--text2)">${hum}</td>
      <td style="color:var(--text2)">${temp}</td>
      <td style="color:var(--text2);font-size:11px;max-width:160px">${accion}</td>
    </tr>`);
  }
  sc.innerHTML=`
    <div class="card" style="overflow-x:auto">
      <div class="card-header"><div class="card-title"><i class="ti ti-calendar"></i>${s.name} — Calendario completo ${totalW} semanas · ${n.name.split(' ').slice(0,2).join(' ')}</div></div>
      <table class="week-table">
        <thead><tr><th>Sem</th><th>Fase</th><th>EC (mS/cm)</th><th>pH</th><th>Luz</th><th>Humedad</th><th>Temp.</th><th>Acción principal</th></tr></thead>
        <tbody>${rows.join('')}</tbody>
      </table>
    </div>
    <div class="alert info"><i class="ti ti-info-circle"></i><p>Dosis nutriente de referencia: <strong>${n.name}</strong>. Ajustar siempre por respuesta de la planta — estas son guías, no valores absolutos. Cada fenotipo es único.</p></div>
  `;
}
