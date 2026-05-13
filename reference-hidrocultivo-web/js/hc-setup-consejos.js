/** Consejos — datos y render. Tras hc-setup-historial-tabs.js. */
// ══════════════════════════════════════════════════
// CONSEJOS — LÓGICA
// ══════════════════════════════════════════════════

const CONSEJOS_DATA = {
  cultivo: {
    nombre: '🌿 Cultivo', color: '#15803d', bg: 'rgba(22,163,74,0.1)',
    consejos: [
      { icono:'🌱', titulo:'Plántulas — primeros días',
        texto:'Las primeras 48h son críticas. Mantén la esponja siempre húmeda pero no encharcada. El sistema de cascada debe estar activo desde el primer momento. <strong>No expongas las raíces al aire.</strong>',
        alerta:{ tipo:'info', txt:'ℹ️ Las plántulas nuevas pueden necesitar 2-3 días para adaptarse al sistema hidropónico si vienen de semillero en tierra.' } },
      { icono:'🏪', titulo:'Origen en ficha: plántula de vivero',
        texto:'Si compras en vivero o garden center, suele venir sustrato (coco, turba, plug de semillero) en el pan de raíces. En hidroponía conviene <strong>retirar con suavidad lo suelto</strong> o seguir las indicaciones del proveedor, para no arrastrar tierra o materia orgánica al depósito. En la ficha elige <strong>Plántula de vivero</strong> y la <strong>fecha en que entra al sistema</strong> (NFT, DWC o torre).',
        alerta:{ tipo:'info', txt:'ℹ️ Con «vivero» la app suma una <strong>media de días en plug</strong> por cultivo (referencia comercial) a los días en hidro para <strong>EC/pH automáticos</strong>, riego y cosecha. Los recordatorios de <strong>pH diario en plántula nueva</strong> siguen contando solo desde la entrada al sistema (raíz nueva en la solución).' } },
      { icono:'🫘', titulo:'Origen en ficha: germinación propia',
        texto:'Desde semilla en sustrato hidropónico: bandeja a <strong>oscuras</strong> hasta que asome la radícula (suelen ser unos 2–4 días según especie y temperatura), luego <strong>luz de crecimiento</strong> (14–18 h/día, suave al inicio) hasta 2–3 hojas reales y buen desarrollo radicular; entonces <strong>trasplanta al circuito</strong>. En la ficha marca <strong>Germinación propia</strong> y usa como fecha el <strong>día del traslado al sistema</strong> (no el de la siembra), para que el progreso y el riego coincidan con la planta en hidroponía.',
        alerta:{ tipo:'ok', txt:'✅ En modo «Asignar cultivo» verás los mismos pasos al elegir germinación propia; los tiempos exactos dependen de la variedad y del sobre del semillero.' } },
      { icono:'⚗️', titulo:'pH inestable tras trasplantar plántulas',
        texto:'Es completamente normal que el pH suba 1-2 unidades en las primeras 24-72h tras añadir plántulas nuevas al sistema. Las raíces jóvenes absorben más aniones (nitratos) que cationes y liberan OH⁻ al agua, subiendo el pH. Con agua destilada este efecto es más pronunciado porque no hay carbonatos que amortigüen. <strong>No es un problema — es fisiología normal.</strong>',
        alerta:{ tipo:'warn', txt:'⚠️ Primera semana con plántulas nuevas: mide el pH cada 6-8h y ajusta con pH- si supera 7.0. A partir del día 4-5 el pH se estabiliza solo. Si el pH sube DE NOCHE también, puede indicar actividad bacteriana — revisar raíces.' } },
      { icono:'🥬', titulo:'Señales de lechuga sana',
        texto:'Hojas turgentes y brillantes, color verde intenso o rojizo según variedad, crecimiento visible día a día. Las raíces deben ser blancas o ligeramente crema, nunca marrones o con mal olor.',
        alerta:{ tipo:'ok', txt:'✅ Una lechuga sana puede crecer 2-3 cm al día en condiciones óptimas.' } },
      { icono:'✂️', titulo:'Cuándo y cómo cosechar',
        texto:'Cosecha cuando la lechuga tenga 15-20cm de diámetro o empiece a compactar el centro. <strong>Corta a 2cm de la base</strong> — muchas variedades rebrotan. Cosechar por la mañana temprano cuando están más hidratadas.',
        alerta:{ tipo:'warn', txt:'⚠️ Si aparece un tallo central alargado (espigado) la lechuga está a punto de florecer y se volverá amarga. Cosechar inmediatamente.' } },
      { icono:'🔃', titulo:'Rotación escalonada (torre por niveles)',
        texto:'Sobre todo en <strong>torre vertical</strong> con varios niveles: rota cada 12-15 días (cosecha abajo → subes plantas → plántulas arriba). Así mantienes producción continua con un solo depósito. En NFT/DWC el ritmo es distinto; usa fechas en fichas y calendario.',
        alerta:{ tipo:'info', txt:'ℹ️ Al rotar, ajusta la EC del depósito al estado del cultivo predominante.' } },
      { icono:'⏱️', titulo:'NFT vs torre: ¿mismos días de cultivo?',
        texto:'En estudios y guías técnicas (p. ej. comparativas NFT / DWC / torre con lechuga) lo que más se documenta son <strong>rendimiento, biomasa y uso de agua</strong>, no un calendario fijo distinto “por sistema”. Los <strong>días hasta cosecha</strong> los marcan sobre todo la <strong>variedad</strong>, la <strong>luz</strong>, <strong>temperatura</strong>, <strong>EC/pH</strong> y la calidad de la plántula. Un NFT con película inestable o una torre con sombra desigual puede alargar el ciclo; no es que NFT o torre tengan por sí solos otro “cronómetro” en webs serias.',
        alerta:{ tipo:'info', txt:'ℹ️ Usa las fechas en la app y la ficha de la variedad; el tipo de montaje cambia la ingeniería del agua, no el genotipo.' } },
      { icono:'📅', titulo:'Fecha de trasplante en la ficha',
        texto:'Cada hueco, maceta o cesta debe llevar <strong>variedad + fecha</strong> desde que plantas o trasplantas. Sin fecha, el riego automático, las medias de edad y el calendario no reflejan lo que hay en la instalación activa: puedes regar como si fueran plántulas cuando ya van por la mitad del ciclo (o al revés).',
        alerta:{ tipo:'ok', txt:'✅ Un momento al trasplantar: abre la ficha, elige cultivo y fecha. Así fotos, registro y cálculo de riego quedan alineados con tus plantas reales.' } },
      { icono:'🧩', titulo:'Cultivos compatibles o no (y por qué)',
        texto:'En un sistema con <strong>un solo depósito</strong> (torre, NFT o DWC) todas las plantas comparten la <strong>misma agua</strong>: misma EC y mismo pH. Por eso solo conviene mezclar grupos con necesidades parecidas. <strong>Lechugas entre sí</strong> y con muchas <strong>asiáticas</strong> de hoja (p. ej. mizuna, komatsuna) suele funcionar si ajustas la EC con cuidado. Las <strong>hojas verdes</strong> más exigentes (espinaca, acelga) suelen pedir <strong>más nutrientes</strong> que un circuito solo lechuga. Los <strong>frutos</strong> (tomate, pepino, pimiento…) y varias <strong>hierbas de EC alta</strong> (menta, orégano, cebollino) descompensan a las lechugas: mejor <strong>otra instalación u otro depósito</strong>. Además del agua, piensa en la <strong>luz</strong>: una planta muy grande puede dejar a las demás a la sombra.',
        alerta:{ tipo:'info', txt:'ℹ️ En <strong>Cultivo e instalación → Compatibilidad de cultivos</strong> la app te avisa si mezclas grupos poco recomendables en el mismo depósito.' } },
    ]
  },
  agua: {
    nombre: '💧 Agua y EC', color: '#1d4ed8', bg: 'rgba(37,99,235,0.1)',
    consejos: [
      { icono:'⚡', titulo:'Entender la EC',
        texto:'La EC mide la concentración de nutrientes. El rango objetivo depende del <strong>cultivo</strong> y de la <strong>marca</strong> que tengas en la <strong>instalación activa</strong> (véase checklist y medición). Si baja mucho hay hambre de nutrientes; si sube demasiado, estrés osmótico.',
        alerta:{ tipo:'info', txt:'ℹ️ La EC sube cuando las plantas transpiran más agua que nutrientes. En verano controla más a menudo.' } },
      { icono:'🟤', titulo:'Agua coloreada en el depósito',
        texto:'Tonos ámbar o rojizos suelen venir de la oxidación del <strong>hierro quelado</strong> u otros compuestos de la solución — es habitual en muchas líneas <strong>A+B</strong>. Suele ser normal tras varios días e indica que conviene plantear <strong>recarga</strong>. Cubrir el depósito opaco a la luz reduce algas.',
        alerta:{ tipo:'warn', txt:'⚠️ El depósito debe estar opaco a la luz; filtraciones de luz aceleran algas y degradación.' } },
    ]
  },
  ecph: {
    nombre: '📊 EC / pH', color: '#6366f1', bg: 'rgba(99,102,241,0.1)',
    soloTabla: true,
    consejos: []
  },
  nft: {
    nombre: '🪴 NFT', color: '#0d9488', bg: 'rgba(13,148,136,0.1)',
    consejos: [],
    soloNftDoc: true,
  },
  dwc: {
    nombre: '🫧 DWC', color: '#0891b2', bg: 'rgba(8,145,178,0.12)',
    consejos: [],
    soloDwcDoc: true,
  },
  rdwc: {
    nombre: '🧿 RDWC', color: '#475569', bg: 'rgba(71,85,105,0.12)',
    consejos: [],
    soloRdwcDoc: true,
  },
  clima: {
    nombre: '🌡️ Clima', color: '#b45309', bg: 'rgba(217,119,6,0.1)',
    consejos: [
      { icono:'☀️', titulo:'Ola de calor (> 30°C)',
        texto:'Despliega el toldo antes de las 10h. Aumenta la frecuencia de riego — el atajo lo calcula automáticamente con VPD alto. <strong>Riesgo de espigado</strong> en lechugas con temperaturas sostenidas > 28°C.',
        alerta:{ tipo:'warn', txt:'⚠️ Si las lechugas se ponen lacias a mediodía y no se recuperan al atardecer, hay estrés hídrico real. Añadir ciclo extra de riego.' } },
      { icono:'🥶', titulo:'Noches frías (< 5°C)',
        texto:'El calentador del depósito es esencial. Por debajo de 14°C en el agua el crecimiento casi se detiene. <strong>Objetivo siempre 20°C</strong> en el agua del depósito.',
        alerta:{ tipo:'info', txt:'ℹ️ En Castelló las heladas son raras pero en enero-febrero pueden darse temperaturas de 2-4°C por las noches.' } },
      { icono:'💨', titulo:'Viento fuerte (> 30 km/h)',
        texto:'El viento aumenta la transpiración y el estrés hídrico. El sistema calcula esto automáticamente aumentando el riego. <strong>Protege las plántulas</strong> del nivel superior si el viento es muy fuerte.',
        alerta:{ tipo:'ok', txt:'✅ El viento moderado (10-25 km/h) es beneficioso — aumenta la transpiración y reduce el riesgo de tipburn por mejor circulación de calcio.' } },
      { icono:'🌧️', titulo:'Días de lluvia',
        texto:'La lluvia suele mojar el follaje pero <strong>no sustituye</strong> la solución del depósito ni el riego del circuito. Sigue haciendo falta tu programa. Con alta humedad ambiental la app puede <strong>reducir ciclos</strong> automáticamente.',
        alerta:{ tipo:'info', txt:'ℹ️ Con probabilidad de lluvia > 50% el VPD baja y el atajo reduce el riego automáticamente. No es necesario ajuste manual.' } },
    ]
  },
  problemas: {
    nombre: '🔍 Problemas', color: '#dc2626', bg: 'rgba(220,38,38,0.08)',
    consejos: [
      { icono:'🟡', titulo:'Hojas amarillas',
        texto:'Amarillo uniforme en hojas viejas: deficiencia de nitrógeno — subir EC ligeramente. Amarillo entre nervios en hojas jóvenes: deficiencia de hierro o manganeso — bajar pH a 5.8-6.0. Amarillo con manchas: puede ser enfermedad fúngica.',
        alerta:{ tipo:'warn', txt:'⚠️ El pH fuera de 5.5-6.5 bloquea la absorción de micronutrientes aunque estén presentes en la solución.' } },
      { icono:'🟤', titulo:'Puntas marrones (tipburn)',
        texto:'Deficiencia de calcio en las hojas jóvenes por baja transpiración. <strong>Causas:</strong> humedad muy alta, poco viento, EC muy alta o temperatura agua baja. Aplicar spray foliar de calcio 2 veces por semana.',
        alerta:{ tipo:'ok', txt:'✅ El tipburn es estético — no afecta al sabor ni a la salud de la planta. Pero indica que hay que mejorar la circulación de aire.' } },
      { icono:'🐛', titulo:'Plagas comunes',
        texto:'<strong>Pulgones:</strong> chorro de agua a presión + jabón potásico diluido. <strong>Mosca blanca:</strong> trampas amarillas adhesivas + neem. <strong>Orugas:</strong> retirar manualmente. La <strong>albahaca</strong> como compañera repele pulgones de forma natural.',
        alerta:{ tipo:'warn', txt:'⚠️ Inspecciona el envés de las hojas semanalmente. Los pulgones se multiplican muy rápido en primavera.' } },
      { icono:'🦠', titulo:'Raíces marrones o con mal olor',
        texto:'Señal de Pythium u otra infección fúngica. <strong>Causas principales:</strong> agua > 24°C, falta de oxígeno, EC muy alta. Solución: vaciar y limpiar depósito con agua oxigenada, bajar temperatura agua, aumentar aireación.',
        alerta:{ tipo:'warn', txt:'⚠️ El difusor de aire encendido 24h es la mejor prevención contra Pythium. El oxígeno disuelto es esencial.' } },
    ]
  },
  variedades: {
    nombre: '🌱 Variedades', color: '#047857', bg: 'rgba(5,150,105,0.08)',
    consejos: [
      { icono:'🥬', titulo:'Mejores lechugas para Castelló',
        texto:'<strong>Primavera/Otoño:</strong> Romana, Trocadero, Batavia — crecimiento rápido y sabor excelente. <strong>Verano:</strong> Lolo Rosso, Hoja Roble Rojo — más resistentes al calor. <strong>Invierno:</strong> Maravilla, Mantecosa — toleran temperaturas bajas.',
        alerta:{ tipo:'ok', txt:'✅ La Romana es la más productiva y versátil para hidropónica — buena elección para empezar.' } },
      { icono:'🌿', titulo:'Mizuna — la más fácil',
        texto:'La Mizuna es la variedad asiática más recomendada para principiantes en hidropónica. Crece en 35-40 días, tolera tanto el calor como el frío moderado, y produce hojas delicadas de sabor suave-picante. <strong>Muy productiva.</strong>',
        alerta:{ tipo:'info', txt:'ℹ️ La Komatsuna es similar pero con hojas más grandes y sabor más suave. Ambas son perfectas mezcladas con lechugas.' } },
      { icono:'🌿', titulo:'Albahaca — compañera perfecta',
        texto:'Aunque necesita más calor (mínimo 18°C), la albahaca bien situada tiene una función extra: <strong>repele pulgones y mosca blanca</strong>. Ponla donde reciba más sol (arriba en torre, borde soleado en NFT/DWC). EC compatible con lechugas.',
        alerta:{ tipo:'warn', txt:'⚠️ La albahaca no tolera temperaturas < 10°C. Solo usarla de mayo a octubre en Castelló.' } },
      { icono:'❌', titulo:'Qué NO mezclar en el mismo depósito',
        texto:'<strong>Tomates, pepinos, pimientos:</strong> necesitan EC 1800-2500 y soporte físico — mal compañeros de lechuga en un solo tanque. <strong>Fresas:</strong> pueden funcionar pero compiten por EC. <strong>Plantas muy altas:</strong> sombrean al resto (en torre, sobre todo niveles bajos).',
        alerta:{ tipo:'warn', txt:'⚠️ Mezclar frutales con lechugas en el mismo depósito provoca deficiencias en unas u otras inevitablemente.' } },
    ]
  },
};

// ── Diagnóstico por síntomas — árbol de decisión ─────────────────────────────
const DIAGNOSTICO = [
  {
    sintoma: '🟡 Hojas amarillas uniformes en hojas viejas',
    causa: 'Deficiencia de Nitrógeno',
    solucion: 'EC demasiado baja. Añadir nutrientes A+B hasta llegar a 1300-1400 µS/cm.',
    urgencia: 'warn'
  },
  {
    sintoma: '🟡 Amarillo entre nervios en hojas jóvenes',
    causa: 'Deficiencia de Hierro o Manganeso',
    solucion: 'pH fuera de rango. Bajar pH a 5.8-6.0 para mejorar absorción de micronutrientes.',
    urgencia: 'warn'
  },
  {
    sintoma: '🟤 Puntas y bordes marrones (tipburn)',
    causa: 'Deficiencia de Calcio en tejidos jóvenes',
    solucion: 'Aumentar ventilación y circulación de aire. Reducir EC ligeramente. El CalMag ayuda.',
    urgencia: 'warn'
  },
  {
    sintoma: '🔴 Raíces marrones y blandas con mal olor',
    causa: 'Pythium — infección fúngica',
    solucion: 'Vaciar depósito urgente. Limpiar con H₂O₂ 3% (15ml/5L). Bajar temperatura agua a <22°C. Añadir difusor 24h.',
    urgencia: 'bad'
  },
  {
    sintoma: '🌿 Tallo central alargado y hojas más pequeñas',
    causa: 'Bolting — espigado por calor',
    solucion: 'Temperatura > 24°C. Cosechar inmediatamente — la lechuga estará amarga. Instalar toldo.',
    urgencia: 'bad'
  },
  {
    sintoma: '💧 Plantas lacias al mediodía pero se recuperan por la tarde',
    causa: 'Estrés hídrico puntual — VPD alto',
    solucion: 'Normal en días muy calurosos. Añadir ciclo extra de riego a las 13h. Verificar que la bomba funciona.',
    urgencia: 'warn'
  },
  {
    sintoma: '💧 Plantas lacias sin recuperarse por la tarde',
    causa: 'Estrés hídrico severo o EC demasiado alta',
    solucion: 'Verificar bomba y caudal. Si EC > 1600 diluir con agua destilada. Temperatura agua < 22°C.',
    urgencia: 'bad'
  },
  {
    sintoma: '🟤 Manchas marrones con halo amarillo en hojas',
    causa: 'Botritis o mildiu — hongos foliares',
    solucion: 'Humedad > 85%. Mejorar ventilación urgente. Retirar hojas afectadas. Reducir ciclos nocturnos.',
    urgencia: 'bad'
  },
  {
    sintoma: '🐛 Puntitos blancos en el envés de las hojas',
    causa: 'Araña roja — ácaro',
    solucion: 'Humedad muy baja + calor. Lavar con jabón potásico diluido. Aumentar humedad ambiental.',
    urgencia: 'warn'
  },
  {
    sintoma: '🐛 Colonias verdes o negras en tallos y hojas',
    causa: 'Pulgones',
    solucion: 'Chorro de agua a presión + jabón potásico. Revisar plantas semanalmente. La albahaca los repele.',
    urgencia: 'warn'
  },
  {
    sintoma: '🫧 Espuma en el depósito',
    causa: 'Materia orgánica en descomposición o primera vez con CalMag',
    solucion: 'Añadir 5-8ml H₂O₂ 3%. Revisar raíces — si están blancas no es Pythium. Cosechar plantas maduras.',
    urgencia: 'warn'
  },
  {
    sintoma: '📈 pH sube constantemente',
    causa: 'Plántulas nuevas absorbiendo nitratos (normal) o actividad bacteriana',
    solucion: 'Primeros 5 días: normal. No intervenir si pH < 7.0. Si hay espuma también → revisar raíces.',
    urgencia: 'info'
  },
];

let diagnosticoFiltro = '';

function renderDiagnostico() {
  const el = document.getElementById('diagnosticoLista');
  if (!el) return;
  const filtro = diagnosticoFiltro.toLowerCase();
  const filtrados = filtro
    ? DIAGNOSTICO.filter(d => d.sintoma.toLowerCase().includes(filtro) || d.causa.toLowerCase().includes(filtro))
    : DIAGNOSTICO;

  const colores = {
    bad:  { bg:'#fff5f5', border:'#fca5a5', color:'#b91c1c' },
    warn: { bg:'#fffbeb', border:'#fcd34d', color:'#92400e' },
    info: { bg:'#eff6ff', border:'#93c5fd', color:'#1d4ed8' },
  };

  el.innerHTML = filtrados.map(d => {
    const c = colores[d.urgencia] || colores.info;
    return `<div class="diag-card" style="--diag-bg:${c.bg};--diag-bd:${c.border};--diag-fg:${c.color}">
      <div class="diag-card-title">${d.sintoma}</div>
      <div class="diag-card-cause">
        📌 ${d.causa}
      </div>
      <div class="diag-card-sol">
        💊 ${d.solucion}
      </div>
    </div>`;
  }).join('');
}

let consejoCatActiva = 'cultivo';
const CONSEJOS_CAT_ORDEN_UI = ['cultivo', 'problemas', 'agua', 'clima', 'ecph', 'nft', 'dwc', 'rdwc', 'variedades'];

function getConsejosModoUi(cfg) {
  const c = cfg || state.configTorre || {};
  return c.consejosModoUi === 'avanzado' ? 'avanzado' : 'principiante';
}

function setConsejosModoUi(modo) {
  if (!state.configTorre) state.configTorre = {};
  state.configTorre.consejosModoUi = modo === 'avanzado' ? 'avanzado' : 'principiante';
  try { guardarEstadoTorreActual(); } catch (_) {}
  try { saveState(); } catch (_) {}
  renderConsejos();
}

/** µS/cm y pH orientativos (bibliografía / manuales de hidroponía) — ajustar por nutriente, agua y fase */
const REF_CULTIVOS_EC_PH = [
  { cultivo: 'Lechuga / lechuguinas', ec: '900–1600', ph: '5,5–6,5', nota: 'Rango app lechuga ~1300–1400' },
  { cultivo: 'Espinaca / acelga / kale', ec: '1200–2000', ph: '5,5–6,5', nota: 'Mayor necesidad nitro' },
  { cultivo: 'Rúcula / canónigos / mostaza', ec: '1000–1600', ph: '5,5–6,4', nota: 'Similar lechuga' },
  { cultivo: 'Albahaca / menta / perejil', ec: '1000–1800', ph: '5,5–6,5', nota: 'Albahaca algo más EC en pleno sol' },
  { cultivo: 'Cilantro / eneldo', ec: '1200–1800', ph: '5,5–6,2', nota: '' },
  { cultivo: 'Tomate — vegetativo', ec: '1400–2400', ph: '5,5–6,5', nota: '' },
  { cultivo: 'Tomate — floración / fruto', ec: '2200–3200', ph: '5,5–6,2', nota: 'Subir EC de forma gradual' },
  { cultivo: 'Pimiento / berenjena', ec: '1600–2600', ph: '5,5–6,5', nota: '' },
  { cultivo: 'Pepino', ec: '1400–2200', ph: '5,5–6,2', nota: '' },
  { cultivo: 'Judía verde / guisante (brotes)', ec: '1400–2400', ph: '6,0–6,5', nota: '' },
  { cultivo: 'Fresa / fresón', ec: '1200–2000', ph: '5,5–6,2', nota: 'Plántulas más bajo EC' },
  { cultivo: 'Brócoli / coliflor', ec: '1700–2600', ph: '6,0–6,8', nota: '' },
  { cultivo: 'Zanahoria (hojas) / microverduras', ec: '1200–2000', ph: '5,5–6,5', nota: '' },
  { cultivo: 'Melón / sandía', ec: '1600–3000', ph: '5,5–6,2', nota: 'Fructificación arriba del rango' },
  { cultivo: 'Flores de corte (p. ej. rosa)', ec: '1200–2200', ph: '5,5–6,2', nota: '' },
];

/** Nombre instalación + NFT | DWC | Torre vertical (para títulos de tablas EC/pH). */
function consejosTituloInstalacionSistemaLinea() {
  const cfg = state.configTorre || {};
  const sys =
    typeof etiquetaSistemaHidroponicoBreve === 'function' ? etiquetaSistemaHidroponicoBreve(cfg) : 'Torre vertical';
  let nombre = '';
  try {
    const ta = typeof getTorreActiva === 'function' ? getTorreActiva() : null;
    if (ta && ta.nombre) nombre = String(ta.nombre).trim();
  } catch (e) {}
  return nombre !== '' ? meteoEscHtml(nombre) + ' · ' + meteoEscHtml(sys) : meteoEscHtml(sys);
}

function buildHtmlTablaEcPh(opts) {
  const omitId = opts && opts.omitAnchorId;
  const wrapAttr = omitId ? 'class="consejo-ecph-wrap"' : 'class="consejo-ecph-wrap" id="consejos-resumen-ec-ph"';
  const rows = REF_CULTIVOS_EC_PH.map(r => `
    <tr>
      <td class="consejo-ecph-icon-cell" aria-hidden="true">${refEcPhRowEmojiHtml(r)}</td>
      <td>${meteoEscHtml(r.cultivo)}</td>
      <td>${meteoEscHtml(r.ec)}</td>
      <td>${meteoEscHtml(r.ph)}</td>
      <td class="consejo-ecph-nota-cell">${meteoEscHtml(r.nota || '—')}</td>
    </tr>
  `).join('');
  return `
    <div ${wrapAttr}>
      <div class="consejo-titulo consejo-titulo--mb8">Referencia rápida hidroponía</div>
      <div class="consejo-ecph-note">
        Valores medios habituales en bibliografía y tablas de cultivos (EC en <strong>µS/cm</strong> como en esta app; pH de la solución).
        Varía según <strong>marca de abono</strong>, agua base, temperatura y fase (plántula → vegetativo → flor/fruto). Úsalo como guía, no como dogma.
      </div>
      <table class="consejo-ecph-table">
        <thead><tr>
          <th class="consejo-ecph-icon-cell" scope="col"><span class="visually-hidden">Icono tipo</span></th>
          <th>Cultivo</th>
          <th>EC µS/cm</th>
          <th>pH</th>
          <th>Nota</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

/** Consejos EC/pH: referencia por fabricante (ml/L → totales al volumen). CalMag en blanda escala desde dosis 18 L de la app. */
const REF_DOSIS_LITROS_TABLA = VOL_OBJETIVO;

/**
 * REF dosis: cada valor es ml/L (o g/L en polvo) de **esa botella/parte**.
 * Líneas A+B habituales en Europa: la ficha da la **misma ml/L para A y para B** (no son “ml/L totales” a repartir 50/50 salvo que el envase lo indique así).
 */
const REF_DOSIS_FABRICANTE = {
  canna_aqua: {
    fuente: 'Canna Aqua Vega: **2 ml/L de botella A y 2 ml/L de botella B** en referencia vegetativo (misma dosis en cada parte; no sumar como una sola cifra para partir). Rango fabricante hasta ~4 ml/L c/u en otros contextos.',
    mlPorLitro: [2, 2],
    calmagGrifoNota: 'CalMag: de 0 ml hasta la dosis blanda según dureza; medir conductividad del grifo antes de mezclar.',
  },
  canna_substra_soft: {
    fuente: 'Canna Substra Vega Soft Water: tabla suele ir de ~2,5 a 4 ml/L **de A** y la **misma ml/L de B** (ej. 25–40 ml de cada una en 10 L). La app usa **2,5 ml/L** por parte como dosis media veg; subir hasta 4 ml/L c/u en plena vegetación si la EC lo pide.',
    mlPorLitro: [2.5, 2.5],
    calmagGrifoNota: 'Línea SOFT para agua blanda/ósmosis. Grifo muy duro: valorar la gama Hard del fabricante.',
  },
  advanced_ph_perfect: {
    fuente: 'Advanced Nutrients pH Perfect GMB: vegetativo típico ~4 ml/L Micro, Grow y Bloom cada uno.',
    mlPorLitro: [4, 4, 4],
    calmagGrifoNota: 'Sin CalMag extra (Ca/Mg en Micro). Ajustar solo si el fabricante lo indica para tu agua.',
  },
  ghe_flora: {
    fuente: 'GHE Flora Series: proporción lechuga vegetativo de esta app — Micro 2,6 + Gro 1,3 + Bloom 1,3 ml/L.',
    mlPorLitro: [2.6, 1.3, 1.3],
    calmagGrifoNota: 'CalMag: reducir u omitir si el grifo aporta minerales; medir tras mezclar.',
  },
  plagron_hydro: {
    fuente: 'Plagron Hydro A+B: **2,5 ml/L de Hydro A y 2,5 ml/L de Hydro B** (partes iguales; dilución 1:400). No es “2,5 ml/L total” repartidos: son **2,5 + 2,5** por litro de agua de riego.',
    mlPorLitro: [2.5, 2.5],
    calmagGrifoNota: 'CalMag: menos o ninguno si el agua es dura; contrastar con EC base.',
  },
  hesi_tnt: {
    fuente: 'Hesi TNT Complex: plena vegetación orientativa ~5 ml/L (plántulas menos).',
    mlPorLitro: [5],
    calmagGrifoNota: 'CalMag: suele reducirse con grifo duro; parte siempre de la EC del agua base.',
  },
  biobizz: {
    fuente: 'BioBizz Fish·Mix + Alg·A·Mic: **dos botellas distintas** — no es A=B. Referencia veg suave **2 ml/L Fish·Mix + 1 ml/L Alg·A·Mic** (subir Fish hasta ~4 ml/L y Alg hasta ~2 ml/L según fase y envase).',
    mlPorLitro: [2, 1],
    calmagGrifoNota: 'Orgánico: EC baja; CalMag solo si hay carencias y según etiqueta.',
  },
  campeador: {
    fuente: 'Campeador Solución Hoja (ficha tienda): ~1 ml/L de cada parte A y B (madres diluidas).',
    mlPorLitro: [1, 1],
    calmagGrifoNota: 'CalMag: como con cualquier base — menos si el grifo aporta dureza.',
  },
  canna_hydro_vega: {
    fuente: 'Canna Hydro Vega (run-to-waste): orientación 4–5 ml/L por parte; tabla app 4 ml/L A y B.',
    mlPorLitro: [4, 4],
    calmagGrifoNota: 'Grifo: a menos CalMag; subir A+B según EC base.',
  },
  atami_bcuzz_hydro: {
    fuente: "Atami B'cuzz Hydro A+B: 1–3 ml/L por parte; referencia media 2 ml/L.",
    mlPorLitro: [2, 2],
    calmagGrifoNota: 'CalMag según conductividad del grifo.',
  },
  hypro_hydro_ab: {
    fuente: 'Hy-Pro Hydro A+B: referencia vegetativo ~2,5 ml/L por parte (ajustar por EC).',
    mlPorLitro: [2.5, 2.5],
    calmagGrifoNota: 'Reducir suplemento Ca/Mg con agua dura.',
  },
  vitalink_hydro_max: {
    fuente: 'VitaLink Hydro Max Grow: vegetativo ~3 ml/L A y B (tablas tienda).',
    mlPorLitro: [3, 3],
    calmagGrifoNota: 'CalMag opcional según dureza.',
  },
  mills_basis_ab: {
    fuente: 'Mills Basis A/B: **misma cantidad en A y en B**. Carta Mills — las 2 primeras semanas **1 ml/L de A y 1 ml/L de B**; después en veg típico **2 ml/L de cada parte**. La app usa **2 ml/L** como referencia de vegetativo ya iniciado; en plantas muy jóvenes bajar a 1 ml/L c/u.',
    mlPorLitro: [2, 2],
    calmagGrifoNota: 'Seguir carta fabricante en floración (más ml/L).',
  },
  green_planet_hydro_fuel: {
    fuente: 'Green Planet Hydro Fuel Grow A+B: fabricante indica **1–3 ml/L por parte** (añadir A, remover, luego B; misma banda en cada botella). Referencia veg media **2 ml/L A y 2 ml/L B**.',
    mlPorLitro: [2, 2],
    calmagGrifoNota: 'Medir tras mezcla; grifo duro = menos CalMag.',
  },
  ionic_grow_hydro: {
    fuente: 'Ionic Grow (una botella): orientación ~4 ml/L en blanda.',
    mlPorLitro: [4],
    calmagGrifoNota: 'Una parte; ajustar por EC del grifo.',
  },
  biobizz_bio_grow: {
    fuente: 'BioBizz Bio-Grow orgánico: ~3 ml/L referencia media.',
    mlPorLitro: [3],
    calmagGrifoNota: 'Orgánico — EC más baja; CalMag prudente.',
  },
  hesi_hidro: {
    fuente: 'Hesi Hidro Crecimiento: orientación ~4,5 ml/L (línea hidro, no TNT).',
    mlPorLitro: [4.5],
    calmagGrifoNota: 'CalMag proporcional a dureza.',
  },
  hortalan: {
    fuente: 'Hortalan: orientativa ~4 ml/L; confirmar envase.',
    mlPorLitro: [4],
    calmagGrifoNota: 'Medir EC base del grifo.',
  },
  fox_farm_grow_big: {
    fuente: 'Fox Farm Grow Big: orientación ~3 ml/L (trío / solo Grow Big).',
    mlPorLitro: [3],
    calmagGrifoNota: 'Muy concentrado; subir con cuidado.',
  },
  campeador_hidro: {
    fuente: 'Campeador Hidro A+B (web fabricante): 1–3 ml/L por parte; ejemplo 18 L con EC 1100–1200 µS ≈ 18 ml A + 18 ml B (~1 ml/L). La app usa 1 ml/L como base checklist (subir hasta 3 ml/L si EC queda baja).',
    mlPorLitro: [1, 1],
    calmagGrifoNota: 'Distinto de línea Hoja; grifo: misma ml/L tras medir EC base.',
  },
  masterblend_41838: {
    fuente: 'Masterblend 4-18-38 + receta típica Ca(NO₃)₂ + MgSO₄: gramos/L orient. 1,9 g/L total sales disueltas (no ml).',
    mlPorLitro: [1.9],
    calmagGrifoNota: 'Polvo: no usar tabla ml; grifo = ajustar sales y medir.',
  },
  otro: {
    fuente: 'Referencia genérica A+B 2 ml/L por parte hasta consultar el envase.',
    mlPorLitro: [2, 2],
    calmagGrifoNota: 'Seguir siempre la etiqueta y la EC del agua base.',
  },
};

function getRefDosisFabricante(nutId) {
  return REF_DOSIS_FABRICANTE[nutId] || REF_DOSIS_FABRICANTE.otro;
}

function dosisSufijoNutriente(nut) {
  return nut && nut.tipoDosis === 'polvo' ? ' g' : ' ml';
}

/** ml (o g si tipoDosis polvo) de la parte `partIndex` según tabla fabricante y volumen. */
function mlNutrientePorParte(nutId, partIndex, volLitros) {
  const ref = getRefDosisFabricante(nutId);
  const arr = ref.mlPorLitro;
  const idx = Math.min(Math.max(0, partIndex), arr.length - 1);
  const v = volLitros > 0 ? volLitros : VOL_OBJETIVO;
  return Math.max(0.1, Math.round(arr[idx] * v * 10) / 10);
}

/**
 * EC (µS/cm) que ya lleva el agua o la solución **antes** del abono principal (CalMag en blanda, o EC del grifo).
 */
function getEcBaseAguaPreAbonoMicroS(volLitros, nut, modoSoft, usarCalMag) {
  if (modoSoft && nut.calmagNecesario && usarCalMag) {
    const mlCM = mlCalMagParaAguaBlanda(volLitros);
    return mlCM > 0 ? estimarEcCalMagMicroS(mlCM, volLitros) : 0;
  }
  if (!modoSoft) {
    const g = Number(state.configAguaEC);
    if (Number.isFinite(g) && g >= 0) return Math.round(g);
    return Math.round(CONFIG_AGUA.grifo?.ecBase || 0);
  }
  return 0;
}

/**
 * ml (o g) por parte: **misma regla** en checklist y Consejos (A+B simétricos y 1 parte = dinámico por EC meta;
 * resto = tabla fabricante × volumen). `ctx`: { modoSoft, usarCalMag }.
 */
function mlAbonoParteDinamica(nut, partIndex, volLitros, ecMetaMicroS, ctx) {
  if (!nut) return 0.1;
  const modoSoft = ctx.modoSoft !== false;
  const usarCalMag = !!ctx.usarCalMag;
  const mlTab = mlNutrientePorParte(nut.id, partIndex, volLitros);
  const ref = getRefDosisFabricante(nut.id);
  const arr = ref.mlPorLitro || [];

  if (nut.tipoDosis === 'polvo' || nut.partes === 3) return mlTab;

  const ecBase = getEcBaseAguaPreAbonoMicroS(volLitros, nut, modoSoft, usarCalMag);
  let pendiente = ecMetaMicroS - ecBase;
  if (!Number.isFinite(pendiente)) pendiente = ecMetaMicroS;
  pendiente = Math.max(50, pendiente);

  if (nut.partes === 2 && arr.length >= 2 && Math.abs(arr[0] - arr[1]) < 1e-6) {
    const slope = ecSubePorMlParABEnVolumen(nut, volLitros);
    if (slope > 0) {
      let mlEc = pendiente / slope;
      mlEc = Math.round(mlEc * 10) / 10;
      const tope = Math.max(mlTab * 1.55, mlTab + 5);
      return Math.min(tope, Math.max(0.5, mlEc));
    }
  }

  if (nut.partes === 1 && arr.length >= 1) {
    const slope = ecSubePorMlParABEnVolumen(nut, volLitros);
    if (slope > 0) {
      let mlEc = pendiente / slope;
      mlEc = Math.round(mlEc * 10) / 10;
      const tope = Math.max(mlTab * 1.55, mlTab + 5);
      return Math.min(tope, Math.max(0.5, mlEc));
    }
  }

  return mlTab;
}

function calcularMlParteNutriente(partIndex) {
  let nut = getNutrienteTorre();
  if (
    !nut &&
    typeof clRutaChecklist !== 'undefined' &&
    clRutaChecklist === 'primer_llenado' &&
    Array.isArray(NUTRIENTES_DB) &&
    NUTRIENTES_DB.length
  ) {
    nut = NUTRIENTES_DB.find(n => n && n.id === 'canna_aqua') || NUTRIENTES_DB[0];
  }
  if (!nut) return 0;
  const cfg = state.configTorre || {};
  let volObj =
    typeof getVolumenNutrientesLitros === 'function' ? getVolumenNutrientesLitros(cfg) : getVolumenMezclaLitros(cfg);
  if (
    (volObj == null || !Number.isFinite(volObj) || volObj <= 0) &&
    typeof clRutaChecklist !== 'undefined' &&
    clRutaChecklist === 'primer_llenado'
  ) {
    volObj = typeof VOL_OBJETIVO === 'number' ? VOL_OBJETIVO : 18;
  }
  if (volObj == null || !Number.isFinite(volObj) || volObj <= 0) return 0;
  const aguaGrifo = (cfg.agua || state.configAgua || 'destilada') === 'grifo';
  return mlAbonoParteDinamica(nut, partIndex, volObj, getRecargaEcMetaMicroS(), {
    modoSoft: !aguaGrifo,
    usarCalMag: !!(nut.calmagNecesario && usarCalMagEnRecarga()),
  });
}

/** Compatibilidad: primera parte; el checklist usa calcularMlParteNutriente por índice. */
function calcularMlAB() {
  return calcularMlParteNutriente(0);
}

/** EC (µS/cm) aportada por CalMag a volumen V, calibrado como CALMAG_POR_ML en 18 L. */
function estimarEcCalMagMicroS(mlCM, volLitros) {
  if (!mlCM || mlCM <= 0) return 0;
  const v = volLitros > 0 ? volLitros : VOL_OBJETIVO;
  return Math.round(CALMAG_POR_ML * mlCM * (VOL_OBJETIVO / v));
}

/**
 * Pendiente EC del abono tras CalMag y pendiente «meta de recarga», para pendientes de corrección.
 * Para 2 partes / 1 parte: µS/cm por ml de esa parte (asumiendo proporción fabricante).
 * Para 3 partes: µS/cm por «1 ml en cada botella» a la vez (aprox.).
 */
function ecSubePorMlCorreccion(nut, volLitros) {
  const v = volLitros > 0 ? volLitros : VOL_OBJETIVO;
  const ref = getRefDosisFabricante(nut.id);
  const ecMeta = getRecargaEcMetaMicroS();
  const mlCM = nut.calmagNecesario && usarCalMagEnRecarga() ? calcularMlCalMag() : 0;
  const ecCal = estimarEcCalMagMicroS(mlCM, v);
  const ecN = Math.max(60, ecMeta - ecCal);
  const p = nut.partes || 2;
  const sumMl = ref.mlPorLitro.reduce((s, x) => s + x * v, 0);
  if (sumMl <= 0 || ecN <= 0) return nut.ecPorMl || 25;
  if (p === 1) return ecN / (ref.mlPorLitro[0] * v);
  if (p === 2) return ecN / (ref.mlPorLitro[0] * v);
  return (ecN * 3) / sumMl;
}

function mlCorreccionEcBaja(nut, volLitros, deficitMicroS) {
  const slope = ecSubePorMlCorreccion(nut, volLitros);
  if (!slope || slope <= 0) return 1;
  return Math.max(1, Math.ceil(deficitMicroS / slope));
}

function fmtMlConsejo(v) {
  if (v == null || isNaN(v)) return '0';
  const r = Math.round(v * 10) / 10;
  return Math.abs(r - Math.round(r)) < 1e-6 ? String(Math.round(r)) : r.toFixed(1);
}

/**
 * @param {'soft'|'grifo'} modo — soft = destilada u ósmosis (EC ~0). Mismas reglas dinámicas que el checklist (volumen, EC meta, CalMag / base grifo).
 */
function buildLineasCeldaDosis(ref, nut, volL, modo) {
  const lines = [];
  const orden = nut.orden || [];
  const nPartes = ref.mlPorLitro.length;
  const ecMeta = getRecargaEcMetaMicroS();
  const usarCMFila = modo === 'soft' && usarCalMagConsejosFilaBlanda(nut);

  if (modo === 'soft') {
    if (nut.calmagNecesario) {
      if (usarCMFila) {
        const cmSoft = mlCalMagParaAguaBlanda(volL);
        lines.push(`<span class="consejo-dosis18-k">CalMag</span> ${fmtMlConsejo(cmSoft)} ml → ~${EC_CALMAG_BASE} µS/cm`);
      } else {
        lines.push(`<span class="consejo-dosis18-k">CalMag</span> <span class="consejo-calmag-muted82">omitido (pref. checklist / agua blanda sin CalMag)</span>`);
      }
    } else {
      lines.push(`<span class="consejo-dosis18-k">CalMag</span> <span class="consejo-calmag-muted72">no necesario</span>`);
    }
  } else {
    lines.push(`<span class="consejo-dosis18-k">CalMag</span> <span class="consejo-calmag-nota-grifo">${meteoEscHtml(ref.calmagGrifoNota)}</span>`);
  }

  const suf = dosisSufijoNutriente(nut);
  const usarCM = modo === 'soft' && usarCMFila;
  for (let i = 0; i < nPartes; i++) {
    const label = orden[i] || ('Parte ' + String.fromCharCode(65 + i));
    const mlVal = mlAbonoParteDinamica(nut, i, volL, ecMeta, {
      modoSoft: modo === 'soft',
      usarCalMag: usarCM,
    });
    lines.push(`<span class="consejo-dosis18-k">${meteoEscHtml(label)}</span> ${fmtMlConsejo(mlVal)}${suf}`);
  }

  return lines.join('<br>');
}

function buildHtmlTablaPreparacionFabricante18L() {
  const cfg = state.configTorre || {};
  const Vraw =
    typeof getVolumenNutrientesLitros === 'function' ? getVolumenNutrientesLitros(cfg) : getVolumenMezclaLitros(cfg);
  if (Vraw == null || !Number.isFinite(Vraw) || Vraw <= 0) {
    return (
      '<p class="consejo-dosis18-vacio">Indica litros de depósito o mezcla y el nutriente en <strong>Torre</strong> o <strong>Cultivo e instalación</strong> para ver esta tabla con tus litros reales.</p>'
    );
  }
  const V = Math.round(Vraw * 10) / 10;
  const vCap = getVolumenDepositoMaxLitros(cfg);
  const esRdwcTabla =
    (typeof tipoInstalacionNormalizado === 'function' ? tipoInstalacionNormalizado(cfg) : cfg.tipoInstalacion) === 'rdwc';
  const capNota =
    esRdwcTabla
      ? ' En RDWC la tabla suma el <strong>reservorio de control</strong> y los <strong>cubos útiles</strong> configurados.'
      : (vCap != null && Number.isFinite(vCap) && vCap > 0 && V < vCap - 0.05
      ? ' Capacidad máx. del depósito: <strong>' + vCap + ' L</strong> (esta tabla usa <strong>' + V + ' L</strong> de mezcla).'
      : '');
  const ecUsada = getRecargaEcMetaMicroS();
  const aguaK = cfg.agua || state.configAgua || 'destilada';
  const aguaNom = aguaK === 'grifo' ? 'Grifo' : aguaK === 'osmosis' ? 'Ósmosis' : 'Destilada';
  const ecManual = typeof getEcObjetivoManualUs === 'function'
    ? getEcObjetivoManualUs(cfg, { includeChecklistFallback: true })
    : cfg.checklistEcObjetivoUs;
  const ecOrigen = (Number.isFinite(ecManual) && ecManual >= 200 && ecManual <= 6000)
    ? 'objetivo manual (checklist paso 6)'
    : 'óptimo automático (cultivos / nutriente activo)';
  const prefCM = usarPreferenciaCalMagRecargaGlobal();
  const leyendaBlanda = aguaK === 'grifo'
    ? `Columnas destilada/ósmosis = guía si mezclas con <strong>agua blanca</strong> (con CalMag en filas que lo requieren). Tu tipo de agua en Mediciones: <strong>${aguaNom}</strong>.`
    : `Tipo de agua (instalación activa / Mediciones): <strong>${aguaNom}</strong>. CalMag en esas columnas: <strong>${prefCM ? 'sí' : 'no'}</strong> (pref. checklist).`;

  const nutActivo = getNutrienteTorre();
  if (!nutActivo) {
    return (
      '<p class="consejo-dosis18-vacio">Elige un nutriente en <strong>Cultivo e instalación</strong> o <strong>Medir</strong> para mostrar dosis orientativas del fabricante.</p>'
    );
  }
  const ref = getRefDosisFabricante(nutActivo.id);
  const cSoft = buildLineasCeldaDosis(ref, nutActivo, V, 'soft');
  const cGrifo = buildLineasCeldaDosis(ref, nutActivo, V, 'grifo');
  const rows = `
      <tr>
        <td>${meteoEscHtml(nutActivo.bandera || '')} ${meteoEscHtml(nutActivo.nombre)}
          <div class="consejo-dosis18-fuente">${meteoEscHtml(ref.fuente)}</div>
        </td>
        <td class="consejo-dosis18-cell">${cSoft}</td>
        <td class="consejo-dosis18-cell">${cSoft}</td>
        <td class="consejo-dosis18-cell">${cGrifo}</td>
      </tr>`;

  return `
    <div class="consejo-dosis18-wrap" id="consejos-tabla-dosis-18l">
      <div class="consejo-titulo consejo-titulo--mb8">Mezcla dinámica · <strong>${meteoEscHtml(nutActivo.nombre)}</strong> · <strong>${V} L</strong> · EC <strong>${ecUsada} µS/cm</strong> <span class="consejo-ec-meta">(${ecOrigen})</span></div>
      <div class="consejo-ecph-note consejo-ecph-note--mb">
        Solo el <strong>nutriente activo</strong> de la instalación (cámbialo en la pestaña Cultivo e instalación o en la configuración). Misma regla que el checklist: litros de mezcla (o capacidad máx. si no indicas margen), EC objetivo y <code>ecPorMl</code>.${capNota} ${leyendaBlanda}
        Columna <strong>grifo</strong>: pendiente hacia la misma EC restando la <strong>EC base</strong> del agua (Mediciones). La ficha bajo el nombre resume la orientación del fabricante.
        <strong>A+B simétricos</strong> y <strong>1 parte</strong>: cálculo EC. <strong>3 botellas</strong> y <strong>A+B distintas</strong>: tabla × volumen. Comprueba con el <strong>medidor</strong>.
      </div>
      <table class="consejo-dosis18-table">
        <thead>
          <tr>
            <th>Nutriente</th>
            <th>Destilada<br>${V} L</th>
            <th>Ósmosis<br>${V} L</th>
            <th>Grifo<br>${V} L</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="consejo-ecph-note consejo-ecph-note--mt0">
        Líneas <strong>3 partes</strong>: totales = tabla × volumen (orden <strong>${meteoEscHtml('Micro → Grow → Bloom')}</strong> o equivalente). <strong>1 parte</strong> líquido: dinámico como en checklist si aplica modelo EC; polvo = gramos tabla.
      </div>
    </div>
  `;
}

function buildHtmlTablaConsejosPersonal() {
  const t = state.consejosTablaPersonal;
  if (!t || t.volL == null || !t.nutrienteId) {
    return `
      <div class="consejo-dosis18-wrap consejo-dosis18-miTorre consejo-dosis18-wrap--mt">
        <div class="consejo-titulo consejo-titulo--mb6">Tu tabla (volumen a medida)</div>
        <div class="consejo-ecph-note">
          Al <strong>completar el checklist de recarga</strong> (no es la primera configuración), puedes guardar aquí el nutriente y los litros del depósito.
          Verás la <strong>misma tabla</strong> que arriba (solo tu marca) pero <strong>escalada</strong> a ese volumen, para el <strong>sistema activo</strong> (Torre, NFT o DWC) en la pestaña Cultivo e instalación.
        </div>
      </div>`;
  }
  const nut = NUTRIENTES_DB.find(n => n.id === t.nutrienteId);
  if (!nut) return '';
  const ref = getRefDosisFabricante(t.nutrienteId);
  const vol = Number(t.volL);
  const cSoft = buildLineasCeldaDosis(ref, nut, vol, 'soft');
  const cGrifo = buildLineasCeldaDosis(ref, nut, vol, 'grifo');
  let fecha = '';
  try {
    fecha = t.updated ? new Date(t.updated).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : '';
  } catch (e) { fecha = ''; }

  return `
    <div class="consejo-dosis18-wrap consejo-dosis18-miTorre consejo-dosis18-wrap--mt" id="consejos-tabla-personal">
      <div class="consejo-titulo consejo-titulo--mb8">${consejosTituloInstalacionSistemaLinea()} · ${meteoEscHtml(nut.nombre)} · ${fmtMlConsejo(vol)} L</div>
      <div class="consejo-ecph-note consejo-ecph-note--mb">
        Misma lógica dinámica que la tabla general (EC objetivo recarga, CalMag/blanca, grifo con EC base). Actualizado: ${meteoEscHtml(fecha || '—')}
      </div>
      <table class="consejo-dosis18-table">
        <thead><tr><th>Agua base</th><th>Preparación (ml)</th></tr></thead>
        <tbody>
          <tr><td>Destilada (EC ≈ 0)</td><td class="consejo-dosis18-cell">${cSoft}</td></tr>
          <tr><td>Ósmosis (EC ≈ 0)</td><td class="consejo-dosis18-cell">${cSoft}</td></tr>
          <tr><td>Grifo</td><td class="consejo-dosis18-cell">${cGrifo}</td></tr>
        </tbody>
      </table>
      <button type="button" class="btn btn-ghost consejo-quitar-tabla-btn" onclick="borrarConsejosTablaPersonal()">Quitar tabla guardada</button>
    </div>`;
}

function ensureCtpNutrienteOptions() {
  const sel = document.getElementById('ctpNutrienteId');
  if (!sel || sel.dataset.filled === '1') return;
  sel.dataset.filled = '1';
  sel.innerHTML = NUTRIENTES_DB.map(n =>
    `<option value="${n.id}">${meteoEscHtml(n.nombre)}</option>`
  ).join('');
}

function abrirModalConsejosTablaPersonal(volSugerido) {
  const m = document.getElementById('modalConsejosTablaPersonal');
  if (!m) return;
  ensureCtpNutrienteOptions();
  const cfg = state.configTorre || {};
  const vIn = document.getElementById('ctpVolLitros');
  const sel = document.getElementById('ctpNutrienteId');
  const vs = parseFloat(volSugerido);
  if (vIn) {
    const defL = getVolumenMezclaLitros(cfg);
    vIn.value =
      !isNaN(vs) && vs > 0
        ? String(vs)
        : defL != null && Number.isFinite(defL) && defL > 0
          ? String(defL)
          : '';
  }
  if (sel) {
    try {
      const nut = getNutrienteTorre();
      sel.value = nut && nut.id ? nut.id : (NUTRIENTES_DB[0] && NUTRIENTES_DB[0].id) || '';
    } catch (e) {
      sel.selectedIndex = 0;
    }
  }
  m.classList.add('open');
  a11yDialogOpened(m);
}

function cerrarModalConsejosTablaPersonal(ev) {
  const m = document.getElementById('modalConsejosTablaPersonal');
  if (!m || !m.classList.contains('open')) return;
  if (ev && ev.currentTarget === m && ev.target !== m) return;
  m.classList.remove('open');
  a11yDialogClosed(m);
}

function guardarConsejosTablaPersonal() {
  const vIn = document.getElementById('ctpVolLitros');
  const sel = document.getElementById('ctpNutrienteId');
  const vol = parseFloat(vIn && vIn.value);
  if (!vol || isNaN(vol) || vol < 1 || vol > 500) {
    showToast('Indica un volumen válido (1–500 L)', true);
    return;
  }
  const nid = sel && sel.value;
  if (!nid) {
    showToast('Elige un nutriente', true);
    return;
  }
  state.consejosTablaPersonal = {
    volL: Math.round(vol * 10) / 10,
    nutrienteId: nid,
    updated: new Date().toISOString(),
  };
  saveState();
  cerrarModalConsejosTablaPersonal();
  showToast('📋 Tabla guardada en Consejos (EC / pH)');
  if (typeof consejoCatActiva !== 'undefined' && consejoCatActiva === 'ecph') renderConsejosLista();
}

function borrarConsejosTablaPersonal() {
  delete state.consejosTablaPersonal;
  saveState();
  showToast('Tabla personal eliminada');
  if (typeof consejoCatActiva !== 'undefined' && consejoCatActiva === 'ecph') renderConsejosLista();
}

function mostrarTabConsejos(tab) {
  const panelC = document.getElementById('panelConsejos');
  const panelD = document.getElementById('panelDiagnostico');
  const btnC   = document.getElementById('btnTabConsejos');
  const btnD   = document.getElementById('btnTabDiag');
  if (tab === 'consejos') {
    panelC.style.display = 'block';
    panelD.style.display = 'none';
    btnC.style.background = '#f0fdf4'; btnC.style.borderColor = '#16a34a'; btnC.style.color = '#15803d';
    btnD.style.background = '#fff';    btnD.style.borderColor = '#e5e7eb'; btnD.style.color = '#374151';
  } else {
    panelC.style.display = 'none';
    panelD.style.display = 'block';
    btnD.style.background = '#f0fdf4'; btnD.style.borderColor = '#16a34a'; btnD.style.color = '#15803d';
    btnC.style.background = '#fff';    btnC.style.borderColor = '#e5e7eb'; btnC.style.color = '#374151';
    renderDiagnostico();
  }
}

function a11yConsejosTablistKeydown(ev) {
  const tabs = [...document.querySelectorAll('#consejosCats [role="tab"]')];
  if (!tabs.length) return;
  const i = tabs.indexOf(document.activeElement);
  if (i < 0 && (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft' || ev.key === 'Home' || ev.key === 'End')) {
    tabs[0].focus();
    ev.preventDefault();
    return;
  }
  if (i < 0) return;
  if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') {
    ev.preventDefault();
    tabs[(i + 1) % tabs.length].focus();
  } else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') {
    ev.preventDefault();
    tabs[(i - 1 + tabs.length) % tabs.length].focus();
  } else if (ev.key === 'Home') {
    ev.preventDefault();
    tabs[0].focus();
  } else if (ev.key === 'End') {
    ev.preventDefault();
    tabs[tabs.length - 1].focus();
  }
}

/** Refresca la pestaña Consejos si está visible (EC, volumen, agua, checklist). */
function refreshConsejosSiVisible() {
  const p = document.getElementById('tab-consejos');
  if (p && p.classList.contains('active')) renderConsejos();
}

function renderConsejos() {
  const modoRow = document.getElementById('consejosModoRow');
  const cats = document.getElementById('consejosCats');
  const lista = document.getElementById('consejosLista');
  if (!cats || !lista) return;
  const cfg = state.configTorre || {};
  const tipoInst = cfg.tipoInstalacion || 'torre';
  const modoUi = getConsejosModoUi(cfg);
  cats.setAttribute('role', 'tablist');
  cats.setAttribute('aria-label', 'Categorías de consejos');

  if (!cats.dataset.a11yKeyNavBound) {
    cats.dataset.a11yKeyNavBound = '1';
    cats.addEventListener('keydown', a11yConsejosTablistKeydown);
  }

  const ordenadas = CONSEJOS_CAT_ORDEN_UI
    .filter(key => !!CONSEJOS_DATA[key])
    .map(key => [key, CONSEJOS_DATA[key]]);
  const resto = Object.entries(CONSEJOS_DATA).filter(([key]) => !CONSEJOS_CAT_ORDEN_UI.includes(key));
  let catEntries = ordenadas.concat(resto);
  if (modoUi !== 'avanzado') {
    catEntries = catEntries.filter(([key]) => {
      if (key === 'ecph') return false;
      if (key === 'nft') return tipoInst === 'nft';
      if (key === 'dwc') return tipoInst === 'dwc';
      if (key === 'rdwc') return tipoInst === 'rdwc';
      return true;
    });
  }
  if (!catEntries.some(([k]) => k === consejoCatActiva)) {
    consejoCatActiva = catEntries.length ? catEntries[0][0] : 'cultivo';
  }
  const tabsHtml = catEntries.map(([key, cat]) => `
    <button type="button" class="consejo-cat-btn ${key === consejoCatActiva ? 'active' : ''}"
      role="tab"
      aria-selected="${key === consejoCatActiva ? 'true' : 'false'}"
      id="catBtn-${key}"
      onclick="selConsejoCat('${key}')"
      aria-label="Consejos: ${cat.nombre}"
      ${key === consejoCatActiva ? `style="--consejo-tab-accent:${cat.color}"` : ''}>
      ${cat.nombre}
    </button>
  `).join('');
  const modoHtml =
    '<div class="consejos-modo-segment" role="radiogroup" aria-label="Nivel de detalle">' +
    '<button type="button" role="radio" aria-checked="' + (modoUi === 'principiante' ? 'true' : 'false') + '" ' +
    'class="consejos-modo-btn' + (modoUi === 'principiante' ? ' is-active' : '') + '" ' +
    'onclick="setConsejosModoUi(\'principiante\')">Principiante</button>' +
    '<button type="button" role="radio" aria-checked="' + (modoUi === 'avanzado' ? 'true' : 'false') + '" ' +
    'class="consejos-modo-btn' + (modoUi === 'avanzado' ? ' is-active' : '') + '" ' +
    'onclick="setConsejosModoUi(\'avanzado\')">Avanzado</button>' +
    '</div>';
  if (modoRow) modoRow.innerHTML = modoHtml;
  cats.innerHTML = tabsHtml;

  lista.setAttribute('role', 'tabpanel');
  lista.setAttribute('aria-labelledby', 'catBtn-' + consejoCatActiva);

  renderConsejosLista();
}

function selConsejoCat(key) {
  consejoCatActiva = key;
  renderConsejos();
  document.getElementById('consejosLista').scrollTop = 0;
}

const CONSEJO_TEXTO_PREVIEW_CHARS = 220;

function consejoPlainTextLen(html) {
  if (!html) return 0;
  return String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .length;
}

/** Tablas / desplegables: no aplicar line-clamp al bloque (rompe la consulta al expandir). */
function consejoTextoHasRichBlocks(html) {
  const s = String(html || '');
  return (
    /<table\b/i.test(s) ||
    /<details\b/i.test(s) ||
    /hc-details-tech/i.test(s) ||
    /hc-germ-table/i.test(s) ||
    /consejo-dosis18-wrap/i.test(s) ||
    /consejo-ecph-wrap/i.test(s) ||
    /consejo-ecph-table/i.test(s) ||
    /consejo-dosis18-table/i.test(s)
  );
}

function toggleConsejoExpand(btn) {
  const card = btn && btn.closest ? btn.closest('.consejo-card') : null;
  if (!card || !card.classList.contains('consejo-card--expandable')) return;
  const open = card.classList.toggle('is-text-expanded');
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  const lab = btn.querySelector('.consejo-text-toggle-label');
  const ico = btn.querySelector('.consejo-text-toggle-ico');
  if (lab) lab.textContent = open ? 'Ver menos' : 'Ver más';
  if (ico) ico.textContent = open ? '▲' : '▼';
}

window.toggleConsejoExpand = toggleConsejoExpand;

function htmlConsejoCard(cat, c) {
  const expandable =
    consejoPlainTextLen(c.texto) > CONSEJO_TEXTO_PREVIEW_CHARS &&
    !consejoTextoHasRichBlocks(c.texto);
  const cardMod = expandable ? ' consejo-card--expandable' : '';
  const textCls = expandable ? 'consejo-texto consejo-texto--collapsible' : 'consejo-texto';
  const toggle = expandable
    ? '<button type="button" class="consejo-text-toggle" onclick="toggleConsejoExpand(this)" aria-expanded="false">' +
      '<span class="consejo-text-toggle-label">Ver más</span>' +
      '<span class="consejo-text-toggle-ico" aria-hidden="true">▼</span>' +
      '</button>'
    : '';
  return `
    <div class="consejo-card${cardMod}">
      <div class="consejo-header">
        <div class="consejo-icon" style="--consejo-icon-bg:${cat.bg}">
          ${c.icono}
        </div>
        <div>
          <div class="consejo-titulo">${c.titulo}</div>
        </div>
      </div>
      <div class="consejo-body-stack">
        <div class="${textCls}">${c.texto}</div>
        ${toggle}
      </div>
      ${c.alerta ? `
        <div class="consejo-alerta ${c.alerta.tipo}">
          <span>${c.alerta.txt}</span>
        </div>
      ` : ''}
    </div>
  `;
}

/** Bloque visible: mismos criterios que el checklist de recarga para la instalación activa. */
function buildConsejosNutrienteChecklistResumenHtml(nut, cfg) {
  const t = typeof tipoInstalacionNormalizado === 'function' ? tipoInstalacionNormalizado(cfg) : 'torre';
  const sysLargo =
    t === 'nft' ? 'NFT — canales en recirculación' : t === 'dwc' ? 'DWC — raíces en el depósito' : 'Torre vertical';
  const sysBreve =
    typeof etiquetaSistemaHidroponicoBreve === 'function' ? etiquetaSistemaHidroponicoBreve(cfg) : t === 'nft' ? 'NFT' : t === 'dwc' ? 'DWC' : 'Torre';

  let nombreInst = '';
  try {
    const ta = typeof getTorreActiva === 'function' ? getTorreActiva() : null;
    if (ta && ta.nombre) nombreInst = String(ta.nombre).trim();
  } catch (e) {}

  let objTxt = '—';
  try {
    if (t === 'dwc' && typeof dwcGetObjetivoSpec === 'function' && typeof dwcGetObjetivoCultivo === 'function') {
      const s = dwcGetObjetivoSpec(dwcGetObjetivoCultivo(cfg));
      objTxt = meteoEscHtml(s.label) + ' · ' + meteoEscHtml(s.densidadTxt);
    } else if (t === 'nft' && typeof nftGetObjetivoSpec === 'function' && typeof nftGetObjetivoCultivo === 'function') {
      const s = nftGetObjetivoSpec(nftGetObjetivoCultivo(cfg));
      objTxt = meteoEscHtml(s.label) + ' · ' + meteoEscHtml(s.densidadTxt);
    } else if (t === 'torre' && typeof torreGetObjetivoSpec === 'function' && typeof torreGetObjetivoCultivo === 'function') {
      const s = torreGetObjetivoSpec(torreGetObjetivoCultivo(cfg));
      objTxt = meteoEscHtml(s.label) + ' · ' + meteoEscHtml(s.densidadTxt);
    }
  } catch (e) {}

  const ecOpt = typeof getECOptimaTorre === 'function' ? getECOptimaTorre() : { min: 900, max: 1400 };
  const ecMeta = typeof getRecargaEcMetaMicroS === 'function' ? getRecargaEcMetaMicroS() : 1100;
  const pHR =
    nut && typeof torreGetPhRangoObjetivo === 'function'
      ? torreGetPhRangoObjetivo(nut, cfg)
      : nut && nut.pHRango
        ? nut.pHRango
        : [5.5, 6.5];
  const phTxt = meteoEscHtml(String(pHR[0])) + ' – ' + meteoEscHtml(String(pHR[1]));

  const volMax = typeof getVolumenDepositoMaxLitros === 'function' ? getVolumenDepositoMaxLitros(cfg) : 0;
  const volObj =
    typeof getVolumenNutrientesLitros === 'function' ? getVolumenNutrientesLitros(cfg) : getVolumenMezclaLitros(cfg);
  let volTxt = '';
  if (volObj != null && Number.isFinite(volObj) && volObj > 0) {
    const esRdwcVol =
      (typeof tipoInstalacionNormalizado === 'function' ? tipoInstalacionNormalizado(cfg) : cfg.tipoInstalacion) === 'rdwc';
    volTxt =
      esRdwcVol
        ? '<strong>' + meteoEscHtml(String(volObj)) + ' L</strong> de solución total (reservorio + cubos útiles)'
        : (volMax != null &&
          Number.isFinite(volMax) &&
          volMax > 0 &&
          volObj < volMax - 0.05
            ? '<strong>' + meteoEscHtml(String(volObj)) + ' L</strong> de mezcla (depósito hasta <strong>' + meteoEscHtml(String(volMax)) + ' L</strong>)'
            : '<strong>' + meteoEscHtml(String(volObj)) + ' L</strong>');
  } else {
    volTxt = 'Configura capacidad y litros de mezcla en la pestaña <strong>Cultivo e instalación</strong>.';
  }

  const manualEc = typeof getEcObjetivoManualUs === 'function'
    ? getEcObjetivoManualUs(cfg, { includeChecklistFallback: true })
    : (cfg && cfg.checklistEcObjetivoUs);
  const metaFuente =
    Number.isFinite(manualEc) && manualEc >= 200 && manualEc <= 6000
      ? '<span class="consejo-checklist-resumen-note">Meta EC <strong>fijada a mano</strong> en el checklist.</span>'
      : '<span class="consejo-checklist-resumen-note">Meta EC = centro del rango orientativo' +
        (t === 'torre' || t === 'dwc' ? ' (ajustado por <strong>objetivo de cultivo</strong> en ' + meteoEscHtml(sysBreve) + ')' : '') +
        '; en las ~2 primeras semanas en hidro se acerca hacia el <strong>mínimo</strong> del rango, <strong>sin salir</strong> del intervalo mostrado arriba.</span>';

  const fa = typeof getFactorArranquePlantulaHidro === 'function' ? getFactorArranquePlantulaHidro() : 1;
  const plantulaExtra =
    fa < 1 && !(Number.isFinite(manualEc) && manualEc >= 200 && manualEc <= 6000)
      ? '<p class="consejo-checklist-resumen-foot">Arranque en hidro (~' +
        Math.round((1 - fa) * 100) +
        '% hacia el piso del rango): la meta del checklist sigue dentro del mismo rango EC que Medir / Cultivo e instalación.</p>'
      : '';

  const instLine =
    nombreInst !== ''
      ? '<p class="consejo-checklist-resumen-inst"><strong>' + meteoEscHtml(nombreInst) + '</strong> · ' + meteoEscHtml(sysBreve) + '</p>'
      : '<p class="consejo-checklist-resumen-inst">Instalación activa · <strong>' + meteoEscHtml(sysBreve) + '</strong></p>';

  return (
    '<div class="consejo-checklist-resumen" role="region" aria-label="Valores para el checklist según la instalación seleccionada">' +
    '<div class="consejo-checklist-resumen-kicker">📋 Valores para el checklist (recarga)</div>' +
    instLine +
    '<p class="consejo-checklist-resumen-decl"><strong>Instalación configurada:</strong> ' +
    meteoEscHtml(sysLargo) +
    '. Lo siguiente es lo que usa la app en el <strong>checklist de recarga</strong> para <em>esta</em> instalación y nutriente seleccionado.</p>' +
    '<dl class="consejo-checklist-resumen-dl">' +
    '<dt>Objetivo de cultivo</dt><dd>' +
    objTxt +
    '</dd>' +
    '<dt>Rango EC orientativo</dt><dd><strong>' +
    ecOpt.min +
    ' – ' +
    ecOpt.max +
    '</strong> µS/cm</dd>' +
    '<dt>EC meta (checklist)</dt><dd><strong>' +
    ecMeta +
    '</strong> µS/cm · ' +
    metaFuente +
    '</dd>' +
    '<dt>pH orientativo</dt><dd><strong>' +
    phTxt +
    '</strong></dd>' +
    '<dt>Volumen de mezcla</dt><dd>' +
    volTxt +
    '</dd>' +
    '</dl>' +
    plantulaExtra +
    '</div>'
  );
}

/** Protocolo y reposición en Consejos → Agua y EC: según nutriente de la instalación activa. */
function buildConsejosAguaNutrienteDinamico() {
  const nut = getNutrienteTorre();
  const cfg = state.configTorre || {};
  if (!nut) {
    return htmlConsejoCard({ nombre: '💧 Agua y EC', color: '#1d4ed8', bg: 'rgba(37,99,235,0.1)' }, {
      icono: '🧪',
      titulo: 'Nutriente y depósito',
      texto:
        '<p class="consejo-p">Para ver protocolo, dosis y rangos concretos, elige una <strong>marca de nutriente</strong> en Cultivo e instalación o Medir e indica los <strong>litros del depósito</strong> en Torre o en el asistente.</p>',
    });
  }
  const volMax = getVolumenDepositoMaxLitros(cfg);
  const volObj =
    typeof getVolumenNutrientesLitros === 'function' ? getVolumenNutrientesLitros(cfg) : getVolumenMezclaLitros(cfg);
  const ecOpt = getECOptimaTorre();
  const ecMin = ecOpt.min;
  const bloqueChecklist = buildConsejosNutrienteChecklistResumenHtml(nut, cfg);
  const pasos = (nut.protocolo || []).map(p =>
    '<li class="consejo-proto-li">' + meteoEscHtml(p) + '</li>'
  ).join('');
  const listaProto = pasos
    ? '<ol class="consejo-proto-ol">' + pasos + '</ol>'
    : '<p class="consejo-proto-fallback">Consulta el envase y el checklist de recarga de la app.</p>';

  let ordenWarn = '';
  if (nut.partes === 2 && nut.orden && nut.orden.length >= 2) {
    ordenWarn = '<strong>No mezclar concentrados</strong>: añade <strong>' + meteoEscHtml(nut.orden[0]) +
      '</strong> y <strong>' + meteoEscHtml(nut.orden[1]) + '</strong> en el orden del fabricante, bien diluidos.';
  } else if (nut.partes === 3 && nut.orden && nut.orden.length >= 3) {
    ordenWarn = 'Respeta el orden del fabricante: ' + nut.orden.map(o => '<strong>' + meteoEscHtml(o) + '</strong>').join(' → ') +
      '. No mezcles los concentrados entre sí.';
  } else if (nut.partes === 1 && nut.orden && nut.orden[0]) {
    ordenWarn = 'Una sola base: <strong>' + meteoEscHtml(nut.orden[0]) + '</strong>.';
  }

  const calmagOk = nut.calmagNecesario
    ? 'Con agua blanda / destilada suele necesitarse <strong>CalMag</strong> (o el suplemento Ca/Mg que indique la marca).'
    : 'Esta línea suele llevar Ca/Mg integrado: <strong>no añadas CalMag</strong> salvo que el fabricante lo indique.';

  const phOk = nut.pHBuffer
    ? 'Esta marca tiene <strong>buffers de pH</strong>: al mezclar, sigue las mismas precauciones que en el checklist (no exceder corrector al inicio).'
    : 'Ajusta el pH al rango <strong>' + nut.pHRango[0] + '–' + nut.pHRango[1] + '</strong> indicado para ' + meteoEscHtml(nut.nombre) + '.';

  const mlCM = calcularMlCalMag();
  const ref = getRefDosisFabricante(nut.id);
  const cmPL = volObj != null && Number.isFinite(volObj) && volObj > 0 ? mlCM / volObj : 0;
  const rnd = x => Math.round(x * 100) / 100;

  const partesRepos = [];
  if (usarCalMagEnRecarga() && cmPL > 0) {
    partesRepos.push(rnd(cmPL) + ' ml CalMag');
  }
  if (nut.partes === 1 && nut.orden && nut.orden[0]) {
    partesRepos.push(rnd(ref.mlPorLitro[0]) + ' ml ' + nut.orden[0]);
  } else if (nut.partes === 2 && nut.orden && nut.orden.length >= 2) {
    partesRepos.push(rnd(ref.mlPorLitro[0]) + ' ml ' + nut.orden[0]);
    partesRepos.push(rnd(ref.mlPorLitro[1]) + ' ml ' + nut.orden[1]);
  } else if (nut.partes >= 3 && nut.orden) {
    nut.orden.slice(0, nut.partes).forEach((o, i) => {
      partesRepos.push(rnd(ref.mlPorLitro[i] || 0) + ' ml ' + o);
    });
  }

  const bloqueDosis = partesRepos.length
    ? 'Si la <strong>EC ha bajado</strong> respecto al objetivo del cultivo, como guía <strong>por cada litro</strong> repuesto: ' +
      partesRepos.map(p => meteoEscHtml(p)).join(' + ') + '. Remueve, espera unos minutos con difusor o bomba y mide de nuevo EC y pH.'
    : 'Si la EC ha bajado, usa la misma proporción que en tu última recarga completa o el checklist de la app.';

  const volRefHtml =
    volObj != null &&
    volMax != null &&
    Number.isFinite(volObj) &&
    Number.isFinite(volMax) &&
    volObj > 0 &&
    volMax > 0 &&
    volObj < volMax - 0.05
      ? 'mezcla de <strong>' + volObj + ' L</strong> (depósito hasta <strong>' + volMax + ' L</strong>)'
      : volObj != null && Number.isFinite(volObj) && volObj > 0
        ? '<strong>' + volObj + ' L</strong>'
        : 'indica litros en Torre o Cultivo e instalación';
  const textoRepos =
    'Volumen de referencia en la app: ' + volRefHtml + '. Repone con la <strong>misma calidad de agua</strong> que usas en recargas (según tu configuración). ' +
    '<strong>Si la EC sigue en rango</strong> para tus plantas, añade solo agua. ' + bloqueDosis;

  const detalleProtocoloHtml =
    bloqueChecklist +
    '<p class="consejo-p consejo-p--tight">Pasos orientativos del fabricante para <strong>' +
    meteoEscHtml(nut.nombre) +
    '</strong>. El orden coincide con el checklist de recarga.</p>' +
    listaProto +
    (ordenWarn ? '<p class="consejo-orden-warn">' + ordenWarn + '</p>' : '');
  const detalleProtocoloWrap =
    typeof hcWrapOrigenDetails === 'function'
      ? hcWrapOrigenDetails(detalleProtocoloHtml, 'Ver checklist y protocolo completo', false)
      : detalleProtocoloHtml;
  const resumenProtocolo =
    '<p class="consejo-p consejo-p--tight"><strong>Resumen:</strong> para ' +
    meteoEscHtml(nut.nombre) +
    ' respeta orden de mezcla, verifica EC objetivo y ajusta pH al rango recomendado.</p>';

  return htmlConsejoCard({
    nombre: '💧 Agua y EC', color: '#1d4ed8', bg: 'rgba(37,99,235,0.1)'
  }, {
    icono:'🧪',
    titulo:'Protocolo de nutrientes — ' + meteoEscHtml(nut.nombre),
    texto:
      resumenProtocolo + detalleProtocoloWrap,
    alerta:{ tipo:'ok', txt:'✅ ' + calmagOk + ' ' + phOk }
  }) + htmlConsejoCard({
    nombre: '💧 Agua y EC', color: '#1d4ed8', bg: 'rgba(37,99,235,0.1)'
  }, {
    icono:'💧',
    titulo:'Reposición de agua — ' + meteoEscHtml(nut.nombre),
    texto: textoRepos,
    alerta:{ tipo:'info', txt:'ℹ️ EC orientativa para valorar si hace falta nutriente: por debajo del rango (~' + ecMin +
      ' µS/cm como referencia baja del sistema). En verano el nivel puede bajar más rápido; revisa cada 2–3 días.' }
  });
}

function cultivoEstadoChipHtml(estado) {
  const k = estado === 'bad' ? 'bad' : estado === 'warn' ? 'warn' : 'ok';
  const txt = k === 'ok' ? 'OK' : k === 'warn' ? 'Ajustar' : 'No recomendado';
  return '<span class="cultivo-status-chip cultivo-status-chip--' + k + '">' + txt + '</span>';
}

function buildConsejoCambioNutrientePorFase() {
  const cfg = state.configTorre || {};
  const nut = typeof getNutrienteTorre === 'function' ? getNutrienteTorre() : null;
  const uso = nut && typeof hcNutrienteFaseUso === 'function' ? hcNutrienteFaseUso(nut) : 'unknown';
  const usoTxtMap = { veg: 'VEG (crecimiento/hoja)', bloom: 'BLOOM (floración/fruto)', both: 'BOTH (todo el ciclo)', unknown: 'Sin clasificar' };
  const usoTxt = usoTxtMap[uso] || usoTxtMap.unknown;
  const agua = cfg.agua || state.configAgua || 'destilada';
  const aguaBlanda = agua !== 'grifo';

  const pares = [
    ['Canna Aqua Vega A+B', 'Canna Aqua Flores A+B'],
    ['Canna Hydro Vega A+B', 'Canna Hydro Flores A+B'],
    ['Campeador Hoja A+B', 'Campeador Fruto A+B'],
    ['VitaLink Hydro Max Grow A+B', 'VitaLink Hydro Max Bloom A+B'],
    ['Green Planet Hydro Fuel Grow A/B', 'Green Planet Hydro Fuel Bloom A/B'],
    ['Ionic Grow Hydro', 'Ionic Hydro Bloom'],
    ['Hesi Hidro Crecimiento', 'Hesi Hydro Bloom'],
    ['BioBizz Bio-Grow', 'BioBizz Bio-Bloom'],
    ['Fox Farm Grow Big', 'Fox Farm Tiger Bloom'],
  ];
  const both = [
    'Plagron Hydro A+B',
    'Hy-Pro Hydro A+B',
    'Mills Basis A/B',
    "Atami B'cuzz Hydro A+B",
    'GHE / Terra Aquatica Flora Series (3 partes)',
    'Advanced Nutrients pH Perfect GMB (3 partes)',
  ];

  const paresRows = pares.map(p =>
    '<tr><td>' + meteoEscHtml(p[0]) + '</td><td>→</td><td>' + meteoEscHtml(p[1]) + '</td></tr>'
  ).join('');
  const bothRows = both.map(n =>
    '<tr><td colspan="3">' + meteoEscHtml(n) + '</td></tr>'
  ).join('');

  const guiaHtml =
    '<p class="consejo-p consejo-p--mb10"><strong>Regla rápida:</strong> con cultivos de fruto, si empiezas con línea VEG cambia a BLOOM al entrar en <strong>prefloración</strong> (idealmente en la siguiente recarga completa). Con cultivos de hoja, prioriza base VEG.</p>' +
    '<div class="consejo-ecph-wrap">' +
      '<div class="consejo-titulo consejo-titulo--mb8">Marcas con par VEG → BLOOM</div>' +
      '<table class="consejo-ecph-table"><thead><tr><th>Base VEG</th><th></th><th>Base BLOOM</th></tr></thead><tbody>' +
        paresRows +
      '</tbody></table>' +
      '<div class="consejo-titulo consejo-titulo--mb8" style="margin-top:10px;">Marcas base para todo el ciclo (BOTH)</div>' +
      '<table class="consejo-ecph-table"><tbody>' + bothRows + '</tbody></table>' +
    '</div>' +
    '<p class="consejo-p consejo-p--tight"><strong>CalMag en agua blanda:</strong> ' +
      (aguaBlanda
        ? 'con destilada/ósmosis, mantén CalMag en veg y bloom; orientativo de base ~0,4 mS/cm (≈400 µS/cm) antes de añadir nutrientes.'
        : 'con grifo, normalmente se reduce u omite salvo indicación del fabricante o carencias.') +
    '</p>';

  const guiaWrap =
    typeof hcWrapOrigenDetails === 'function'
      ? hcWrapOrigenDetails(guiaHtml, 'Ver guía por fase y marca', false)
      : guiaHtml;

  return htmlConsejoCard(CONSEJOS_DATA.cultivo, {
    icono: '🧴',
    titulo: 'Cambio de nutriente por fase (veg/bloom)',
    texto:
      '<p class="consejo-p">Nutriente activo: <strong>' + meteoEscHtml(nut ? nut.nombre : 'Sin seleccionar') + '</strong> · tipo <strong>' + meteoEscHtml(usoTxt) + '</strong>. Esta guía te ayuda a mantener coherencia por cultivo, fase y composición.</p>' +
      guiaWrap,
    alerta: {
      tipo: 'info',
      txt: 'ℹ️ Si dos variedades comparten depósito y una entra antes en prefloración, conviene cambiar en la primera recarga de esa transición y apuntar a EC en zona media del rango.'
    },
  });
}

function buildConsejoObjetivoTorreCultivo() {
  const cfg = state.configTorre || {};
  if (cfg.tipoInstalacion !== 'torre') return '';
  if (typeof torreGetObjetivoSpec !== 'function' || typeof torreGetObjetivoCultivo !== 'function') return '';
  const sp = torreGetObjetivoSpec(torreGetObjetivoCultivo(cfg));
  return htmlConsejoCard(CONSEJOS_DATA.cultivo, {
    icono: '🧭',
    titulo: 'Objetivo de cosecha en torre vertical',
    texto:
      'Objetivo activo: <strong>' +
      meteoEscHtml(sp.label) +
      '</strong>. Densidad orientativa <strong>' +
      meteoEscHtml(sp.densidadTxt) +
      '</strong> · ' +
      meteoEscHtml(sp.cicloTxt) +
      '.',
    alerta: { tipo: 'info', txt: 'ℹ️ Puedes cambiarlo en Cultivo e instalación → Objetivo en torre vertical.' },
  });
}

/** Tabla de tiempos orientativos de germinación por cada cultivo del catálogo. */
function buildConsejoTablaGerminacionCultivos() {
  if (typeof getGerminacionSpecPorVariedad !== 'function' || typeof CULTIVOS_DB === 'undefined') return '';
  const grupoOrder = {
    lechugas: 0,
    hojas: 1,
    asiaticas: 2,
    hierbas: 3,
    frutos: 4,
    fresas: 5,
    raices: 6,
    microgreens: 7,
  };
  const sorted = CULTIVOS_DB.slice().sort((a, b) => {
    const ga = grupoOrder[a.grupo] != null ? grupoOrder[a.grupo] : 9;
    const gb = grupoOrder[b.grupo] != null ? grupoOrder[b.grupo] : 9;
    if (ga !== gb) return ga - gb;
    return String(a.nombre).localeCompare(b.nombre, 'es');
  });
  const rows = sorted
    .map(c => {
      const s = getGerminacionSpecPorVariedad(c.nombre);
      return (
        '<tr><td>' +
        cultivoEmojiHtml(c, 1) +
        ' ' +
        meteoEscHtml(c.nombre) +
        '</td><td>' +
        meteoEscHtml(s.osc) +
        '</td><td>' +
        meteoEscHtml(s.emerg) +
        '</td><td>' +
        meteoEscHtml(s.planton) +
        '</td></tr>'
      );
    })
    .join('');
  const tableInner =
    '<div class="hc-germ-table-scroll">' +
    '<table class="hc-germ-table">' +
    '<thead><tr><th scope="col">Cultivo</th><th scope="col">Oscuro / uniformidad</th><th scope="col">Hasta emergencia</th><th scope="col">Hasta plantón</th></tr></thead>' +
    '<tbody>' +
    rows +
    '</tbody></table></div>';
  const tableBlock =
    typeof hcWrapOrigenDetails === 'function'
      ? hcWrapOrigenDetails(tableInner, 'Tabla completa por cultivo (desplegar)', false)
      : tableInner;
  return htmlConsejoCard(CONSEJOS_DATA.cultivo, {
    icono: '📆',
    titulo: 'Germinación en semillero — tabla por cultivo',
    texto:
      '<p class="consejo-germ-intro">Rangos <strong>orientativos</strong> (bandeja, Tª moderada). El sobre del semillero y tu invernadero marcan el ritmo real.</p>' +
      tableBlock +
      '<p class="consejo-germ-foot">En <strong>Torre → Asignar cultivo</strong>, si eliges <strong>Germinación propia</strong>, la guía va en un <strong>desplegable</strong> y se actualiza al cambiar la variedad.</p>',
    alerta: {
      tipo: 'info',
      txt: 'ℹ️ “Hasta plantón” es cuando suele irse al NFT/DWC/torre; la fecha en la ficha debe ser el <strong>traslado al sistema</strong>.',
    },
  });
}

function consejoFaseCultivoLabel(k) {
  const m = {
    germinacion: 'Germinación',
    plantula: 'Plántula',
    vegetativo: 'Vegetativo',
    prefloracion: 'Prefloración',
    floracion: 'Floración',
    fructificacion: 'Fructificación',
    crecimiento: 'Crecimiento',
    madurez: 'Madurez',
    cosecha: 'Cosecha',
    general: 'General',
  };
  return m[k] || k;
}

function consejoPerfilLuzPorCultivo(cultivo) {
  const c = cultivo || {};
  if (c.grupo === 'frutos' || c.fructificacion) {
    return {
      exterior: {
        plantula: '0,5–1,5 h de sol suave (mañana) + malla 50–60% al mediodía',
        vegetativo: '2–4 h de sol directo progresivo + malla 35–50% en horas centrales',
        floracion: '4–6 h de sol directo; con calor fuerte usar malla 30–40%',
        fructificacion: '6–8 h de sol directo; prioriza malla 30–40% antes que subir riego a ciegas',
      },
      interior: {
        plantula: 'PPFD 150–250 · 14–16 h · LED a 35–55 cm',
        vegetativo: 'PPFD 250–450 · 14–18 h · LED a 30–45 cm',
        floracion: 'PPFD 450–700 · 12–16 h · LED a 25–40 cm',
        fructificacion: 'PPFD 550–850 · 12–16 h · LED a 25–35 cm',
      },
    };
  }
  if (c.grupo === 'hierbas') {
    return {
      exterior: {
        plantula: '0,5–1 h de sol suave + malla 50–60% en mediodía',
        vegetativo: '2–4 h de sol directo progresivo; malla 40–50% si UV alto',
        floracion: '3–5 h de sol directo con ventilación; malla 35–45% en ola de calor',
        fructificacion: '3–5 h de sol directo; proteger picos térmicos con malla',
      },
      interior: {
        plantula: 'PPFD 120–220 · 14–16 h · LED a 35–55 cm',
        vegetativo: 'PPFD 220–420 · 14–18 h · LED a 30–45 cm',
        floracion: 'PPFD 320–550 · 12–16 h · LED a 25–40 cm',
        fructificacion: 'PPFD 320–550 · 12–16 h · LED a 25–40 cm',
      },
    };
  }
  return {
    exterior: {
      plantula: '0,5–1 h de sol suave + malla 50–60% en mediodía',
      vegetativo: '1,5–3 h de sol directo progresivo + malla 40–50%',
      floracion: '2–4 h de sol directo; malla 35–45% con calor/UV alto',
      fructificacion: '2–4 h de sol directo; prioriza malla antes que exposición brusca',
    },
    interior: {
      plantula: 'PPFD 120–220 · 14–16 h · LED a 35–55 cm',
      vegetativo: 'PPFD 200–380 · 14–18 h · LED a 30–45 cm',
      floracion: 'PPFD 280–500 · 12–16 h · LED a 25–40 cm',
      fructificacion: 'PPFD 280–500 · 12–16 h · LED a 25–40 cm',
    },
  };
}

function consejoFaseDesdeFicha(cultivo, cesta) {
  if (!cultivo) return 'general';
  if (typeof cultivoFaseDesdeDias === 'function' && cesta && cesta.fecha) {
    const ms = new Date(cesta.fecha).getTime();
    if (Number.isFinite(ms)) {
      const dias =
        typeof getDiasEfectivosCicloBiologico === 'function'
          ? getDiasEfectivosCicloBiologico(cesta, cultivo, Date.now())
          : Math.max(0, Math.floor((Date.now() - ms) / 86400000));
      const f = cultivoFaseDesdeDias(cultivo, dias, { desdeTrasplante: true });
      if (f && f.key) return f.key;
    }
  }
  if (cesta && cesta.fecha && typeof getEstado === 'function') {
    const dias =
      typeof getDiasEfectivosCicloBiologico === 'function'
        ? getDiasEfectivosCicloBiologico(cesta, cultivo, Date.now())
        : Math.max(0, Math.floor((Date.now() - new Date(cesta.fecha)) / 86400000));
    const est = getEstado(cultivo.id || cultivo.nombre, dias);
    if (est === 'plantula') return 'plantula';
    if (est === 'crecimiento') return 'vegetativo';
    if (est === 'madurez' || est === 'cosecha') return cultivo.fructificacion ? 'fructificacion' : 'floracion';
  }
  return cultivo.fructificacion ? 'vegetativo' : 'plantula';
}

function consejoAjusteClimaUbicacion(baseTxt, ubicacion, temp, uv) {
  let txt = String(baseTxt || '');
  if (ubicacion === 'exterior') {
    if (Number.isFinite(temp) && temp >= 32) {
      txt += ' · ola de calor: malla 60% y evita sol directo 12:00–18:00';
    } else if (Number.isFinite(temp) && temp >= 28) {
      txt += ' · calor alto: malla 50% en mediodía';
    } else if (Number.isFinite(temp) && temp <= 12) {
      txt += ' · frío: prioriza franja central (11:00–16:00) y evita amanecer';
    }
    if (Number.isFinite(uv) && uv >= 8) {
      txt += ' · UV muy alto: añade malla 50–60%';
    } else if (Number.isFinite(uv) && uv >= 6) {
      txt += ' · UV alto: malla 35–50%';
    }
    return txt;
  }
  if (Number.isFinite(temp) && temp >= 30) {
    txt += ' · interior cálido: separa LED +5–10 cm y mejora ventilación';
  } else if (Number.isFinite(temp) && temp <= 16) {
    txt += ' · interior frío: acerca LED 3–5 cm (sin quemar ápice)';
  }
  if (Number.isFinite(uv) && uv >= 7) {
    txt += ' · si entra sol directo por ventana, usa visillo o malla ligera';
  }
  return txt;
}

function consejoRecomendacionMalla(ubicacion, temp, uv) {
  if (ubicacion !== 'exterior') {
    return {
      titulo: 'Interior',
      txt: 'En interior no se usa malla como control principal: regula altura LED, fotoperiodo y ventilación. Si entra sol directo por ventana, usa visillo o malla ligera 20–30%.',
    };
  }
  const t = Number(temp);
  const u = Number(uv);
  if ((Number.isFinite(t) && t >= 32) || (Number.isFinite(u) && u >= 8)) {
    return {
      titulo: 'Exterior — estrés alto',
      txt: 'Malla recomendada: blanca 50–60% (prioritaria por menor calentamiento) o negra 50% si no hay alternativa. Mantén sombra 12:00–18:00.',
    };
  }
  if ((Number.isFinite(t) && t >= 28) || (Number.isFinite(u) && u >= 6)) {
    return {
      titulo: 'Exterior — calor/UV alto',
      txt: 'Malla recomendada: blanca 35–50% (o negra 40%). Sombrea horas centrales y deja sol suave de mañana.',
    };
  }
  if (Number.isFinite(t) && t <= 14) {
    return {
      titulo: 'Exterior — fresco/frío',
      txt: 'Malla solo puntual: 20–30% si hay viento seco o radiación intensa puntual. Prioriza exposición de 11:00–16:00.',
    };
  }
  return {
    titulo: 'Exterior — condiciones medias',
    txt: 'Malla orientativa: 30–40% en aclimatación de plántulas; retirar progresivamente cuando no haya estrés.',
  };
}

function consejoMallaQuickTableHtml() {
  return (
    '<div class="hc-germ-table-scroll"><table class="hc-germ-table"><thead><tr><th>Escenario</th><th>Malla recomendada</th><th>Acción</th></tr></thead><tbody>' +
    '<tr><td>UV ≥ 8 o Tª ≥ 32°C</td><td>Blanca 50–60%</td><td>Sombra 12:00–18:00 + ventilación</td></tr>' +
    '<tr><td>UV 6–7 o Tª 28–31°C</td><td>Blanca 35–50% / Negra 40%</td><td>Sol suave mañana, proteger mediodía</td></tr>' +
    '<tr><td>UV 3–5 y Tª 18–27°C</td><td>30–40%</td><td>Aclimatación progresiva</td></tr>' +
    '<tr><td>Tª &lt; 14°C</td><td>20–30% puntual</td><td>Priorizar franja central del día</td></tr>' +
    '</tbody></table></div>'
  );
}

function buildConsejoLuzExposicionCultivo() {
  const cat = CONSEJOS_DATA.cultivo;
  const cfg = state.configTorre || {};
  const ub = cfg.ubicacion || 'exterior';
  const m = state.meteoActual || {};
  const temp = Number(m.temp);
  const uv = Number.isFinite(Number(m.uvMaxHoy)) ? Number(m.uvMaxHoy) : Number(m.uv);
  const filas = [];
  const seen = {};
  const niv = (cfg.numNiveles || (state.torre || []).length || 0);
  for (let n = 0; n < niv; n++) {
    (state.torre[n] || []).forEach(c => {
      if (!c || !c.variedad) return;
      const cult = getCultivoDB(c.variedad);
      if (!cult) return;
      const key = cult.id || cult.nombre;
      if (seen[key]) return;
      seen[key] = true;
      const fase = consejoFaseDesdeFicha(cult, c);
      const p = consejoPerfilLuzPorCultivo(cult);
      const extBase = p.exterior[fase] || p.exterior.vegetativo;
      const intBase = p.interior[fase] || p.interior.vegetativo;
      const ext = consejoAjusteClimaUbicacion(extBase, 'exterior', temp, uv);
      const intR = consejoAjusteClimaUbicacion(intBase, 'interior', temp, uv);
      filas.push({
        nombre: cultivoNombreLista(cult, c.variedad),
        fase,
        ext,
        intR,
      });
    });
  }

  const climaAviso =
    Number.isFinite(temp) || Number.isFinite(uv)
      ? '<p class="consejo-p consejo-p--tight"><strong>Ahora mismo:</strong> ' +
        (Number.isFinite(temp) ? 'Tª ' + temp + '°C' : 'Tª —') +
        ' · ' +
        (Number.isFinite(uv) ? 'UV ' + uv : 'UV —') +
        '. Con calor o UV alto, prioriza <strong>malla de sombreo</strong> y ventilación antes que exponer más horas de golpe.</p>'
      : '';
  const luzCfg = String(cfg.luz || '').trim().toLowerCase();
  const horasLuzCfg = Number(cfg.horasLuz);
  const ubicTxt = ub === 'interior'
    ? 'Interior' + (luzCfg ? ' · luz ' + meteoEscHtml(luzCfg) : '') + (Number.isFinite(horasLuzCfg) ? ' · ' + horasLuzCfg + ' h' : '')
    : 'Exterior';
  const ubicacionAviso = '<p class="consejo-p consejo-p--tight"><strong>Ubicación configurada:</strong> ' + ubicTxt + '.</p>';
  const mallaRec = consejoRecomendacionMalla(ub, temp, uv);

  let tabla = '';
  if (filas.length) {
    const rows = filas
      .map(r =>
        '<tr><td>' +
        meteoEscHtml(r.nombre) +
        '</td><td>' +
        meteoEscHtml(consejoFaseCultivoLabel(r.fase)) +
        '</td><td>' +
        meteoEscHtml(r.ext) +
        '</td><td>' +
        meteoEscHtml(r.intR) +
        '</td></tr>'
      )
      .join('');
    tabla =
      '<div class="hc-germ-table-scroll"><table class="hc-germ-table"><thead><tr><th>Cultivo</th><th>Fase detectada</th><th>Exterior (aclimatación controlable)</th><th>Interior (LED / apoyo natural)</th></tr></thead><tbody>' +
      rows +
      '</tbody></table></div>';
  } else {
    tabla =
      '<p class="consejo-p consejo-p--tight">Asigna variedad y fecha en las fichas para generar la recomendación por fase de cada cultivo.</p>';
  }

  const planExt =
    '<ol class="consejo-proto-ol">' +
    '<li class="consejo-proto-li"><strong>Día 1–2:</strong> sombra luminosa + malla 50–60% en horas centrales.</li>' +
    '<li class="consejo-proto-li"><strong>Día 3–4:</strong> 30–90 min de sol suave (mañana) + malla al mediodía.</li>' +
    '<li class="consejo-proto-li"><strong>Día 5–7:</strong> 2–3 h de sol directo progresivo; evita golpe de 12:00–17:00 sin malla.</li>' +
    '<li class="consejo-proto-li"><strong>Día 8+:</strong> ajusta según cultivo/fase y clima; para frutos, sube exposición poco a poco.</li>' +
    '</ol>';

  let planInt =
    '<p class="consejo-p consejo-p--tight">En interior, si no tienes medidor PAR, usa <strong>distancia LED</strong> + respuesta de hoja (sin blanqueo ni estiramiento excesivo). Con ventana o sol lateral, añade LED como <strong>apoyo</strong> para completar fotoperiodo estable.</p>';
  if (ub === 'interior' && Number.isFinite(horasLuzCfg)) {
    if (horasLuzCfg < 13) {
      planInt += '<p class="consejo-p consejo-p--tight">Fotoperiodo actual corto (' + horasLuzCfg + ' h): para crecimiento vegetativo suele funcionar mejor subir a 14–16 h.</p>';
    } else if (horasLuzCfg > 18) {
      planInt += '<p class="consejo-p consejo-p--tight">Fotoperiodo alto (' + horasLuzCfg + ' h): vigila estrés y temperatura foliar; en frutos puedes trabajar con 12–16 h por fase.</p>';
    }
  }

  const detalleLuzHtml =
    climaAviso +
    tabla +
    '<p class="consejo-p consejo-p--tight"><strong>' +
    meteoEscHtml(mallaRec.titulo) +
    ':</strong> ' +
    meteoEscHtml(mallaRec.txt) +
    '</p>' +
    consejoMallaQuickTableHtml() +
    '<p class="consejo-p consejo-p--tight"><strong>Protocolo exterior de aclimatación:</strong></p>' +
    planExt +
    planInt;
  const detalleLuzWrap =
    typeof hcWrapOrigenDetails === 'function'
      ? hcWrapOrigenDetails(detalleLuzHtml, 'Ver detalle de luz, malla y aclimatación', false)
      : detalleLuzHtml;
  const resumenCorto =
    ub === 'interior'
      ? 'Resumen: prioriza <strong>distancia LED + fotoperiodo + ventilación</strong>. Si entra sol directo por ventana, usa visillo o malla ligera.'
      : 'Resumen: prioriza <strong>malla de sombreo</strong> y progresión de exposición por días; evita cambios bruscos de sol directo.';

  return htmlConsejoCard(cat, {
    icono: ub === 'interior' ? '💡' : '☀️',
    titulo: 'Luz y exposición por cultivo y etapa',
    texto:
      '<p class="consejo-p">Recomendación práctica con variables controlables por usuario: <strong>malla de sombreo</strong>, ubicación de la planta y <strong>distancia LED</strong> (en vez de “reducir luz X%”).</p>' +
      ubicacionAviso +
      '<p class="consejo-p consejo-p--tight">' + resumenCorto + '</p>' +
      detalleLuzWrap,
    alerta: {
      tipo: 'info',
      txt:
        'ℹ️ Si aparece estrés (hoja decaída al mediodía, bordes secos o blanqueo), añade malla de sombreo y retrocede un paso 24–48 h.',
    },
  });
}

function buildConsejosNftHidraulica() {
  const cat = CONSEJOS_DATA.nft;
  const cfg = state.configTorre || {};
  const resumenTxt = cfg.tipoInstalacion === 'nft' ? nftTextoResumenInstalacion(cfg) : '';
  const recoNft = cfg.tipoInstalacion === 'nft' && typeof nftRecomendacionCultivoDesdeConfig === 'function'
    ? nftRecomendacionCultivoDesdeConfig(cfg)
    : null;
  const b = cfg.tipoInstalacion === 'nft' ? getNftBombaDesdeConfig(cfg) : null;
  let dyn;
  if (b) {
    const vDepCfg = parseFloat(String(cfg.volDeposito ?? '').replace(',', '.'));
    const vDepAct = Number.isFinite(vDepCfg) && vDepCfg > 0 ? Math.round(vDepCfg) : null;
    const dynDetalle =
      (resumenTxt
        ? '<p class="consejo-p consejo-p--lead">' + escHtmlUi(resumenTxt) + '</p>'
        : '') +
      '<p class="consejo-p consejo-p--mb10">Lo importante aquí es si el <strong>depósito</strong> y la <strong>bomba</strong> encajan con un criterio práctico (24 h, película fina, pérdidas típicas). Los números detallados van en el desplegable. Contrasta siempre con la <strong>curva Q–H</strong> del fabricante.</p>' +
      nftDepositoVeredictoBloqueHtml(b, vDepAct) +
      nftWrapDetalleTecnicoSummary(nftBombaDetalleTecnicoHtml(b), 'Bomba, caudal y geometría (detalle)');
    const dynWrap =
      typeof hcWrapOrigenDetails === 'function'
        ? hcWrapOrigenDetails(dynDetalle, 'Ver veredicto y cálculo hidráulico completo', false)
        : dynDetalle;
    dyn = htmlInnerConsejoCard(cat, {
      icono: '⚡',
      titulo: 'Tu instalación NFT — cumplimiento orientativo',
      html:
        '<p class="consejo-p consejo-p--tight"><strong>Resumen:</strong> valida depósito y bomba frente a tu geometría real antes de afinar riego.</p>' +
        dynWrap,
    });
  } else {
    dyn = htmlInnerConsejoCard(cat, {
      icono: 'ℹ️',
      titulo: 'Configuración NFT',
      html:
        '<p class="consejo-p consejo-p--flush">Elige en <strong>Cultivo e instalación</strong> instalación <strong>NFT</strong> y completa canal, lámina y longitud en el checklist (N·ref) o en el asistente para ver aquí el criterio orientativo de tu caso.</p>',
    });
  }
  const formulaDetalle =
    'Se aproxima el <strong>área</strong> de la lámina en el fondo del canal: en tubo redondo, una <em>cuerda</em> del arco inundado; en perfil rectangular, <strong>ancho útil × altura de lámina</strong>. Con velocidad de película ~0,08–0,12 m/s (según pendiente) se obtiene L/h por canal. La app <strong>combina</strong> este resultado con un modelo empírico y adopta el caudal más exigente. No sustituye medición in situ ni el catálogo de la bomba.';
  const formulaWrap =
    typeof hcWrapOrigenDetails === 'function'
      ? hcWrapOrigenDetails(formulaDetalle, 'Ver método de cálculo NFT', false)
      : formulaDetalle;
  const formula = htmlConsejoCard(cat, {
    icono: '📐',
    titulo: 'Cómo se estima el caudal (orientativo)',
    texto:
      '<p class="consejo-p consejo-p--tight"><strong>Resumen:</strong> caudal orientativo por geometría + pendiente, siempre verificado con fabricante y observación real.</p>' +
      formulaWrap,
    alerta: { tipo: 'info', txt: 'ℹ️ Lámina habitual ~2–4 mm (~3 mm); si sube mucho, suele haber exceso de caudal o pendiente insuficiente.' },
  });
  const cultivo = recoNft
    ? htmlConsejoCard(cat, {
        icono: '🧭',
        titulo: 'Diseño del canal según cultivo objetivo',
        // Modo compacto: conservar decisión principal sin saturar texto.
        texto:
          '<strong>' +
          meteoEscHtml(recoNft.perfil.etiqueta) +
          '</strong> · canal <strong>Ø' +
          recoNft.perfil.canalMinMm +
          '–' +
          recoNft.perfil.canalMaxMm +
          ' mm</strong> · cesta <strong>' +
          meteoEscHtml(recoNft.perfil.cestaTxt) +
          '</strong> · separación <strong>' +
          meteoEscHtml(recoNft.perfil.sepTxt) +
          '</strong>.<br>Canal (Ø actual): <strong>' +
          (recoNft.diamActualMm != null ? 'Ø' + recoNft.diamActualMm + ' mm' : '—') +
          '</strong> · ' +
          cultivoEstadoChipHtml(recoNft.estado) +
          '.',
        alerta: {
          tipo: recoNft.estado === 'bad' ? 'warn' : recoNft.estado === 'warn' ? 'warn' : 'ok',
          txt:
            recoNft.estado === 'bad'
              ? '⚠️ Mejor otro sistema o NFT de frutos dedicado.'
              : recoNft.estado === 'warn'
                ? '⚠️ Ajusta diámetro de canal para mejorar el encaje.'
                : '✅ Configuración alineada con el cultivo objetivo.',
        },
      })
    : '';
  const docWrap =
    '<div class="consejo-card"><div class="consejo-texto consejo-texto--flush">' +
    nftTuberiaReferenciaDocHtml({ forChecklist: true }) +
    '</div></div>';
  return dyn + cultivo + formula + docWrap;
}

function buildConsejosDwcNetPotRefTabla(catForCard) {
  const cat = catForCard || CONSEJOS_DATA.dwc;
  const html =
    '<p class="consejo-p consejo-p--tight">El <strong>Ø</strong> es el <strong>aro exterior del net pot</strong> (encaje en tapa). La <strong>altura del cuerpo</strong> es lo que suele figurar en catálogo o embalaje (profundidad del plástico del macetero). No es la <strong>columna de agua útil</strong> bajo la cesta en el cubo (RDWC/DWC).</p>' +
    '<div class="consejo-dwc-netpot-ref-scroll">' +
    '<table class="consejo-dwc-netpot-ref-table" role="grid" aria-label="Referencia orientativa Ø net pot y altura comercial">' +
    '<thead><tr><th scope="col">Ø aro (mm)</th><th scope="col">Altura cuerpo típica (mm)</th><th scope="col">Nota</th></tr></thead>' +
    '<tbody>' +
    '<tr><td>50</td><td>45–60</td><td>Plántulas, albahaca en maceta pequeña</td></tr>' +
    '<tr><td>80</td><td>55–75</td><td>Hojas compactas, clones</td></tr>' +
    '<tr><td>100</td><td>60–85</td><td>Lechuga / asiáticas en cubo medio</td></tr>' +
    '<tr><td>125</td><td>70–100</td><td>DWC «5 pulg» habitual; mucha lechuga</td></tr>' +
    '<tr><td>150</td><td>75–110</td><td>Tomate/pepino joven en cubo grande</td></tr>' +
    '<tr><td>200</td><td>85–130</td><td>Fruto adulto, raíz gruesa</td></tr>' +
    '</tbody></table></div>' +
    '<p class="consejo-footnote">Rangos orientativos entre fabricantes y líneas de distribución. Si tu modelo trae cifras, úsalas en <strong>Cultivo e instalación</strong> (Ø y altura opcional en RDWC).</p>';
  return htmlInnerConsejoCard(cat, {
    icono: '🔖',
    titulo: 'Net pot: Ø ↔ altura comercial (referencia)',
    html: html,
    alerta: {
      tipo: 'info',
      txt: 'ℹ️ Solo ayuda visual al elegir pieza; no entra en cálculos de nutrientes ni volumen.',
    },
  });
}

function buildConsejosDwcDifusorBloque() {
  const cat = CONSEJOS_DATA.dwc;
  const rec =
    (state.configTorre || {}).tipoInstalacion === 'dwc'
      ? dwcRecomendacionDifusorCompletaDesdeConfig(state.configTorre)
      : null;
  let dyn = '';
  if (rec) {
    dyn =
      '<div class="consejo-dwc-rec-box">' +
      '<div class="consejo-dwc-rec-kicker">Según litros de mezcla y cestas (mismo criterio que checklist y Cultivo e instalación)</div>' +
      dwcFormatHtmlRecomendacionDifusorCore(rec) +
      '</div>';
  } else {
    dyn =
      '<p class="consejo-p consejo-p--tight">Activa una instalación <strong>DWC</strong> y revisa volumen y rejilla en <strong>Cultivo e instalación</strong> para ver aquí la recomendación de bomba y difusores.</p>';
  }
  return htmlInnerConsejoCard(cat, {
    icono: '💨',
    titulo: 'Bomba de aire y difusor según litros',
    html:
      '<p class="consejo-p">La solución nutritiva se oxigena con <strong>bomba de aire</strong> + <strong>difusor</strong> en el fondo. En webs y tiendas de hidroponía lo habitual son <strong>piedras porosas planas</strong> o barras (burbujeo repartido en horizontal), <strong>discos</strong>, <strong>bolas</strong> y cilindros microporosos: elige según el fondo de tu cubo y que el aire <strong>no quede solo en un rincón</strong>.</p>' +
      '<p class="consejo-p consejo-p--tight">Burbujas <strong>más finas</strong> suelen intercambiar mejor oxígeno con el agua, pero tapan antes el poro; la bomba debe ser capaz de <strong>vencer la profundidad</strong> del líquido (altura de agua / manguera).</p>' +
      dyn +
      '<p class="consejo-footnote">Orientativo; temperatura, número de plantas y forma del depósito cambian lo que necesitas. Si huele mal o las raíces se ablandan, sube aeración o limpia/sustituye el difusor.</p>',
    alerta: {
      tipo: 'warn',
      txt: '⚠️ No sustituye el dato del fabricante de la bomba ni un medidor de oxígeno disuelto.',
    },
  });
}

function buildConsejosRdwc() {
  const cat = CONSEJOS_DATA.rdwc;
  const intro = htmlConsejoCard(cat, {
    icono: '🧿',
    titulo: 'RDWC en esta app',
    texto:
      '<p class="consejo-p consejo-p--tight"><strong>Resumen:</strong> la solución recircula de forma continua entre el depósito de control y los cubos; <strong>misma EC y mismo pH</strong> en todo el anillo.</p>' +
      '<p class="consejo-p consejo-p--tight">Para dosis, la app usa el <strong>volumen útil del reservorio de control</strong> más los <strong>litros útiles</strong> de cada cubo (Cultivo e instalación).</p>',
    alerta: {
      tipo: 'info',
      txt: 'ℹ️ Solo mezcla cultivos compatibles en el mismo circuito (como en un DWC compartido).',
    },
  });
  const tres = htmlConsejoCard(cat, {
    icono: '✅',
    titulo: 'Montaje: 3 comprobaciones rápidas',
    texto:
      '<p class="consejo-p consejo-p--mb10">Antes de plantar o tras ampliar el circuito:</p>' +
      '<ol class="consejo-proto-ol">' +
      '<li class="consejo-proto-li"><strong>Bomba de aire</strong> por encima del nivel máximo de la solución (evita reflujo por sifón).</li>' +
      '<li class="consejo-proto-li"><strong>Racores a presión (push-fit):</strong> lubrica junta y tubo; inserta empujando con ligero giro, como indique el manual del kit.</li>' +
      '<li class="consejo-proto-li"><strong>Tubos entre cubos:</strong> si separas módulos, conserva al menos unos <strong>3 cm</strong> de tubo dentro del lateral; tras el <strong>primer llenado</strong>, repasa fugas en juntas y tapones.</li>' +
      '</ol>' +
      '<p class="consejo-footnote">Buenas prácticas habituales en manuales de kits RDWC comerciales; adapta siempre a tu pieza y fabricante.</p>',
    alerta: {
      tipo: 'ok',
      txt: '✅ En el esquema, toca el icono del anillo para repasar impulsión (verde), retorno (azul) y medición en depósito de control.',
    },
  });
  const netPot = buildConsejosDwcNetPotRefTabla(CONSEJOS_DATA.rdwc);
  return intro + tres + netPot;
}

function buildConsejosDwc() {
  const cat = CONSEJOS_DATA.dwc;
  const cfg = state.configTorre || {};
  const objKey =
    typeof dwcGetObjetivoCultivo === 'function' ? dwcGetObjetivoCultivo(cfg) : 'final';
  const objSpec =
    typeof dwcGetObjetivoSpec === 'function'
      ? dwcGetObjetivoSpec(objKey)
      : { label: 'Planta adulta (tamaño completo)', litrosTxt: '3–5 L/planta', ccTxt: '15–25 cm' };
  const recoCultivo =
    cfg.tipoInstalacion === 'dwc' && typeof dwcRecomendacionCultivoDesdeConfig === 'function'
      ? dwcRecomendacionCultivoDesdeConfig(cfg)
      : null;
  const introDetalle =
    'En <strong>Deep Water Culture</strong> las raíces cuelgan en un depósito con la <strong>misma solución</strong> para todas las plantas. La tapa se modela con rejilla <strong>filas × cestas</strong> (prismático o cilíndrico en planta); el diagrama usa esa cuadrícula. Las medidas del depósito sirven para <strong>capacidad en litros</strong>, difusión y el contexto visual.';
  const introWrap =
    typeof hcWrapOrigenDetails === 'function'
      ? hcWrapOrigenDetails(introDetalle, 'Ver explicación completa DWC', false)
      : introDetalle;
  const intro = htmlConsejoCard(cat, {
    icono: '🫧',
    titulo: 'DWC en esta app',
    texto:
      '<p class="consejo-p consejo-p--tight"><strong>Resumen:</strong> en DWC todas las plantas comparten el mismo depósito (EC/pH comunes).</p>' +
      introWrap,
    alerta: {
      tipo: 'info',
      txt: 'ℹ️ Misma EC y mismo pH en todo el depósito: mezcla solo cultivos compatibles (véase compatibilidad de cultivos en torre).',
    },
  });
  const vol = htmlConsejoCard(cat, {
    icono: '💧',
    titulo: 'Litros y dosis',
    texto:
      'Según la forma del depósito: <strong>prismático</strong> L×A×P; <strong>cilíndrico</strong> Ø interior × profundidad/altura útil del líquido; <strong>troncopiramidal</strong> litros útiles medidos. Si indicas <strong>litros de mezcla</strong> por debajo del máximo, checklist y <strong>Consejos → Agua y EC</strong> escalan nutrientes con ese volumen. Si lo dejas vacío, la app usa la capacidad calculada o un valor orientativo interno.',
    alerta: {
      tipo: 'ok',
      txt: '✅ En Cultivo e instalación y asistente verás litros útiles al completar las medidas del depósito (o el volumen manual en tronco).',
    },
  });
  const densidad = htmlConsejoCard(cat, {
    icono: '🧭',
    titulo: 'Objetivo de densidad activo',
    texto:
      'En esta instalación está activo <strong>' +
      meteoEscHtml(objSpec.label) +
      '</strong>. Como referencia de diseño: <strong>' +
      meteoEscHtml(objSpec.litrosTxt) +
      '</strong> y separación <strong>' +
      meteoEscHtml(objSpec.ccTxt) +
      '</strong> centro a centro.' +
      (recoCultivo
        ? '<br>Grupo detectado: <strong>' +
          meteoEscHtml(recoCultivo.perfil.etiqueta) +
          '</strong> · cesta recomendada <strong>' +
          meteoEscHtml(recoCultivo.perfil.cestaTxt) +
          '</strong> · actual <strong>' +
          (recoCultivo.rimActualMm != null ? recoCultivo.rimActualMm + ' mm' : '—') +
          '</strong> · ' +
          cultivoEstadoChipHtml(recoCultivo.estado) +
          '.'
        : ''),
    alerta: {
      tipo:
        recoCultivo && recoCultivo.estado === 'bad'
          ? 'warn'
          : recoCultivo && recoCultivo.estado === 'warn'
            ? 'warn'
            : 'info',
      txt:
        recoCultivo
          ? (recoCultivo.estado === 'ok'
              ? '✅ Configuración alineada con el cultivo objetivo.'
              : recoCultivo.estado === 'warn'
                ? '⚠️ Ajusta diámetro de cesta u objetivo para mejorar el encaje.'
                : '⚠️ Grupo poco recomendable en DWC estándar; mejor sistema dedicado.')
          : 'ℹ️ Puedes cambiarlo en Cultivo e instalación o en el asistente DWC.',
    },
  });
  const panelLlenDw =
    typeof dwcHtmlDistanciaLlenadoTiempoReal === 'function'
      ? dwcHtmlDistanciaLlenadoTiempoReal(state.configTorre)
      : '';
  const nivelDep = htmlConsejoCard(cat, {
    icono: '📏',
    titulo: 'Llenado: distancia al sustrato (DWC)',
    texto:
      panelLlenDw +
      '<p style="margin:12px 0 0;line-height:1.45;font-size:12px">Modelo para <strong>cultivos de hoja</strong> (lechuga, asiáticas, hojas, hierbas). EC, pH y volumen en <strong>Mediciones</strong> y recargas.</p>',
    alerta: {
      tipo: 'info',
      txt: 'ℹ️ Cálculo en vivo desde sustrato en Cultivo e instalación + variedad y fecha en cada cesta. Ajusta según observación y temperatura.',
    },
  });
  const difusor = buildConsejosDwcDifusorBloque();
  const netPotRef = buildConsejosDwcNetPotRefTabla();
  const medDetalle =
    '<strong>Prismático:</strong> L, A y P (profundidad/altura <em>útil</em> del líquido, cm) → volumen ≈ L×A×P÷1000. <strong>Cilíndrico:</strong> Ø interior y misma P → volumen ≈ π×(Ø/2)²×P÷1000. <strong>Troncopiramidal:</strong> litros útiles medidos (sin P en el cálculo). <strong>Diám. cesta</strong> = aro en la tapa (mm); <strong>alt. cesta</strong> para el llenado seguro bajo el sustrato. <strong>Marco</strong> y <strong>hueco</strong> entre cestas en el <strong>asistente DWC</strong>; si no los guardaste, el aviso de rejilla usa marco 0 y 4 mm.';
  const medWrap =
    typeof hcWrapOrigenDetails === 'function'
      ? hcWrapOrigenDetails(medDetalle, 'Ver guía completa de medidas DWC', false)
      : medDetalle;
  const med = htmlConsejoCard(cat, {
    icono: '📐',
    titulo: 'Qué es cada medida en Cultivo e instalación',
    texto:
      '<p class="consejo-p consejo-p--tight"><strong>Resumen:</strong> define bien forma, litros útiles y diámetro de cesta; el resto del cálculo depende de eso.</p>' +
      medWrap,
    alerta: { tipo: 'warn', txt: '⚠️ Comprobación orientativa: contrasta con tu tapa real y el diámetro nominal del fabricante.' },
  });
  const extras = htmlConsejoCard(cat, {
    icono: '🫧',
    titulo: 'Cúpulas y entrada de aire',
    texto:
      'Las casillas <strong>cúpulas / humedad</strong> y <strong>entrada de aire</strong> documentan tu montaje para el registro; no sustituyen el cálculo hidráulico detallado (como en NFT).',
    alerta: null,
  });
  const tabla =
    '<div class="consejo-card">' +
    '<div class="consejo-header">' +
    '<div class="consejo-icon" style="--consejo-icon-bg:' +
    cat.bg +
    '">📋</div>' +
    '<div><div class="consejo-titulo">Tamaños de cesta (referencia)</div></div>' +
    '</div>' +
    '<div class="consejo-texto consejo-texto--pt4">' +
    '<div id="mountDwcCestasGuiaConsejos"></div>' +
    '</div>' +
    '</div>';
  return intro + vol + densidad + nivelDep + difusor + med + netPotRef + extras + tabla;
}

/** Tarjeta de consejo con cuerpo HTML controlado (no escapar dos veces). */
function htmlInnerConsejoCard(cat, c) {
  const expandable =
    consejoPlainTextLen(c.html) > CONSEJO_TEXTO_PREVIEW_CHARS &&
    !consejoTextoHasRichBlocks(c.html);
  const cardMod = expandable ? ' consejo-card--expandable' : '';
  const textCls = expandable ? 'consejo-texto consejo-texto--collapsible' : 'consejo-texto';
  const toggle = expandable
    ? '<button type="button" class="consejo-text-toggle" onclick="toggleConsejoExpand(this)" aria-expanded="false">' +
      '<span class="consejo-text-toggle-label">Ver más</span>' +
      '<span class="consejo-text-toggle-ico" aria-hidden="true">▼</span>' +
      '</button>'
    : '';
  return `
    <div class="consejo-card${cardMod}">
      <div class="consejo-header">
        <div class="consejo-icon" style="--consejo-icon-bg:${cat.bg}">
          ${c.icono}
        </div>
        <div>
          <div class="consejo-titulo">${c.titulo}</div>
        </div>
      </div>
      <div class="consejo-body-stack">
        <div class="${textCls}">${c.html}</div>
        ${toggle}
      </div>
      ${c.alerta ? `
        <div class="consejo-alerta ${c.alerta.tipo}">
          <span>${c.alerta.txt}</span>
        </div>
      ` : ''}
    </div>
  `;
}

function buildConsejoProblemasCompacto(cat, c) {
  const txt = String(c.texto || '');
  const i = txt.indexOf('.');
  const resumen = i > 0 ? txt.slice(0, i + 1) : txt;
  const detalle = i > 0 ? txt.slice(i + 1).trim() : '';
  const detalleWrap =
    detalle && typeof hcWrapOrigenDetails === 'function'
      ? hcWrapOrigenDetails('<p class="consejo-p consejo-p--tight">' + detalle + '</p>', 'Ver causas y detalle', false)
      : (detalle ? '<p class="consejo-p consejo-p--tight">' + detalle + '</p>' : '');
  return `
    <div class="consejo-card">
      <div class="consejo-header">
        <div class="consejo-icon" style="--consejo-icon-bg:${cat.bg}">
          ${c.icono}
        </div>
        <div>
          <div class="consejo-titulo">${c.titulo}</div>
        </div>
      </div>
      <div class="consejo-texto"><p class="consejo-p consejo-p--tight"><strong>Acción rápida:</strong> ${resumen}</p>${detalleWrap}</div>
      ${c.alerta ? `
        <div class="consejo-alerta ${c.alerta.tipo}">
          <span>${c.alerta.txt}</span>
        </div>
      ` : ''}
    </div>
  `;
}

/** Tras pintar la lista: todo &lt;details&gt; cerrado y tarjetas «Ver más» colapsadas (entrada a pestaña / cambio de categoría). */
function plegarTodosDesplegablesConsejosLista(lista) {
  if (!lista) return;
  lista.querySelectorAll('details').forEach(function (d) {
    d.open = false;
  });
  lista.querySelectorAll('.consejo-card--expandable.is-text-expanded').forEach(function (card) {
    card.classList.remove('is-text-expanded');
    const btn = card.querySelector('.consejo-text-toggle');
    if (!btn) return;
    btn.setAttribute('aria-expanded', 'false');
    const lab = btn.querySelector('.consejo-text-toggle-label');
    const ico = btn.querySelector('.consejo-text-toggle-ico');
    if (lab) lab.textContent = 'Ver más';
    if (ico) ico.textContent = '▼';
  });
}

function renderConsejosLista() {
  const cat = CONSEJOS_DATA[consejoCatActiva];
  const lista = document.getElementById('consejosLista');
  if (!lista || !cat) return;

  if (cat.soloTabla) {
    lista.innerHTML = buildHtmlTablaEcPh() + buildHtmlTablaPreparacionFabricante18L() + buildHtmlTablaConsejosPersonal();
    plegarTodosDesplegablesConsejosLista(lista);
    return;
  }

  if (consejoCatActiva === 'nft') {
    lista.innerHTML = buildConsejosNftHidraulica();
    plegarTodosDesplegablesConsejosLista(lista);
    return;
  }

  if (consejoCatActiva === 'dwc') {
    lista.innerHTML = buildConsejosDwc();
    mountDwcCestasGuiaEnPanelConsejos();
    plegarTodosDesplegablesConsejosLista(lista);
    return;
  }

  if (consejoCatActiva === 'rdwc') {
    lista.innerHTML = buildConsejosRdwc();
    plegarTodosDesplegablesConsejosLista(lista);
    return;
  }

  if (consejoCatActiva === 'agua') {
    const [cEc, cColor] = cat.consejos;
    lista.innerHTML = htmlConsejoCard(cat, cEc) + buildConsejosAguaNutrienteDinamico() + htmlConsejoCard(cat, cColor);
    plegarTodosDesplegablesConsejosLista(lista);
    return;
  }

  if (consejoCatActiva === 'cultivo') {
    lista.innerHTML =
      cat.consejos.map(c => htmlConsejoCard(cat, c)).join('') +
      buildConsejoCambioNutrientePorFase() +
      buildConsejoObjetivoTorreCultivo() +
      buildConsejoTablaGerminacionCultivos() +
      buildConsejoLuzExposicionCultivo();
    plegarTodosDesplegablesConsejosLista(lista);
    return;
  }

  if (consejoCatActiva === 'problemas') {
    lista.innerHTML = cat.consejos.map(c => buildConsejoProblemasCompacto(cat, c)).join('');
    plegarTodosDesplegablesConsejosLista(lista);
    return;
  }

  lista.innerHTML = cat.consejos.map(c => htmlConsejoCard(cat, c)).join('');
  plegarTodosDesplegablesConsejosLista(lista);
}


