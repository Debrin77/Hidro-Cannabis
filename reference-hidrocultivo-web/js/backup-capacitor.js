/**
 * Web / PWA: sin runtime Capacitor. En la app nativa, este archivo se reemplaza
 * por el bundle generado en npm run cap:prep (ver backup-capacitor.native.js).
 */
window.hcCapacitorBackup = {
  isNative: async function () {
    return false;
  },
  exportAndShare: async function () {
    throw new Error('Copia nativa no disponible en el navegador');
  },
};
