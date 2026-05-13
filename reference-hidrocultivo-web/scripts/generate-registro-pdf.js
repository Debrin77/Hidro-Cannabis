const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const outputPath = path.resolve(
  __dirname,
  '..',
  'docs',
  'memoria_tecnica_registro_propiedad_intelectual_hidrocultivo_v1_0.pdf'
);

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 54, bottom: 54, left: 54, right: 54 },
  info: {
    Title: 'Memoria Tecnica - HidroCultivo v1.0',
    Author: 'Jose Caruana Reina',
    Subject: 'Registro de la Propiedad Intelectual',
    Keywords: 'HidroCultivo, software, propiedad intelectual',
  },
});

doc.pipe(fs.createWriteStream(outputPath));

function h1(text) {
  doc.moveDown(0.2);
  doc.font('Helvetica-Bold').fontSize(16).fillColor('#111827').text(text);
  doc.moveDown(0.4);
}

function h2(text) {
  doc.moveDown(0.15);
  doc.font('Helvetica-Bold').fontSize(12.5).fillColor('#111827').text(text);
  doc.moveDown(0.2);
}

function p(text) {
  doc.font('Helvetica').fontSize(10.8).fillColor('#1f2937').text(text, {
    align: 'left',
    lineGap: 2,
  });
  doc.moveDown(0.35);
}

function kv(k, v) {
  doc.font('Helvetica-Bold').fontSize(10.8).text(`${k}: `, { continued: true });
  doc.font('Helvetica').fontSize(10.8).text(v);
  doc.moveDown(0.1);
}

function bullet(text) {
  doc.font('Helvetica').fontSize(10.8).text(`- ${text}`, { lineGap: 2 });
}

h1('MEMORIA TECNICA DE OBRA SOFTWARE');
p('Registro de la Propiedad Intelectual - Ministerio de Cultura (Espana)');

h2('1. Identificacion de la obra');
kv('Titulo', 'HidroCultivo');
kv('Tipo de obra', 'Programa de ordenador');
kv('Version depositada', '1.0');
kv('Autor y titular', 'Jose Caruana Reina');
kv('NIF', '19002112H');
kv('Fecha de deposito', '[completar dd/mm/aaaa]');

h2('2. Objeto y finalidad');
p('HidroCultivo es una aplicacion software orientada a la gestion integral de cultivos hidroponicos, con foco en el seguimiento tecnico del sistema, la toma de decisiones operativas y la trazabilidad de tareas de mantenimiento.');
p('Su finalidad es asistir al usuario en la configuracion del sistema de cultivo, control de parametros de solucion nutritiva, planificacion de recargas, seguimiento de fases de cultivo y consulta tecnica contextualizada.');

h2('3. Descripcion funcional');
bullet('Configuracion de instalaciones (torre, NFT y DWC), con parametros de operacion y contexto.');
bullet('Gestion de cultivos por posicion (cesta/maceta/hueco), con variedad, fecha y estado.');
bullet('Registro de mediciones (EC, pH, temperatura y volumen) con historico local.');
bullet('Checklist guiado de recarga completa y registro asociado.');
bullet('Historial y calendario de eventos de operacion.');
bullet('Motor de recomendaciones por cultivo, fase y nutriente (veg/bloom, cambios sugeridos, coherencia por fase).');
bullet('Seccion de consejos tecnicos por categorias, con tablas y ayudas operativas.');
doc.moveDown(0.35);

h2('4. Tecnologias empleadas');
bullet('JavaScript (logica de negocio y reglas de recomendacion).');
bullet('HTML (estructura de interfaz).');
bullet('CSS (presentacion y diseno visual).');
bullet('PWA / Service Worker (comportamiento de aplicacion web progresiva).');
doc.moveDown(0.35);

h2('5. Arquitectura general');
p('La aplicacion sigue una arquitectura frontend modular, con separacion funcional por areas (sistema, mediciones, historial, calendario, consejos y checklist). El estado de trabajo y los datos operativos del usuario se gestionan de forma local, con sincronizacion interna entre modulos para mantener consistencia de informacion y recomendaciones.');

h2('6. Elementos de originalidad y aportacion');
p('La originalidad de la obra se fundamenta en la integracion de reglas agronomicas y operativas en flujos de uso practico, y en la coordinacion entre modulos de configuracion, medicion, calendario y checklist.');
p('Su aportacion propia se materializa en avisos contextuales segun la combinacion de cultivo, fase y nutriente, incluyendo trazabilidad explicativa en interfaz (estado actual, recomendacion, fuente y motivo).');

h2('7. Alcance del deposito');
bullet('Codigo fuente de la aplicacion (version 1.0).');
bullet('Estructura de interfaz y estilos.');
bullet('Logica funcional y reglas de recomendacion integradas.');
bullet('Documentacion tecnica y material de apoyo aportado por el autor.');
doc.moveDown(0.35);

h2('8. Declaracion de autoria');
p('Yo, Jose Caruana Reina, con NIF 19002112H, manifiesto ser autor y titular de los derechos de explotacion de la obra software "HidroCultivo", version 1.0, aportada a efectos de su inscripcion en el Registro de la Propiedad Intelectual.');

h2('9. Lugar, fecha y firma');
kv('Lugar', 'Castellón de la Plana');
kv('Fecha', '08/05/2026');
doc.moveDown(1.1);
doc.font('Helvetica-Bold').fontSize(10.8).text('Firma del autor:');
doc.moveDown(2.0);
doc.font('Helvetica').fontSize(10.8).text('_______________________________');
doc.font('Helvetica').fontSize(10.8).text('Jose Caruana Reina');
doc.font('Helvetica').fontSize(10.8).text('NIF 19002112H');
doc.moveDown(0.4);

h2('Anexo breve para formulario (descripcion resumida)');
p('Programa de ordenador denominado HidroCultivo (version 1.0), desarrollado por Jose Caruana Reina (NIF 19002112H) en JavaScript, HTML y CSS, con funcionalidad de gestion hidroponica: configuracion de sistemas, registro de mediciones, checklist de recarga, historial, calendario y recomendaciones contextuales por fase/cultivo/nutriente.');

doc.end();

doc.on('end', () => {
  // eslint-disable-next-line no-console
  console.log(outputPath);
});
