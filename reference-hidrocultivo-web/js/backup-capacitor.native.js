import { Share } from '@capacitor/share';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

async function isNative() {
  try {
    return window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function'
      ? window.Capacitor.isNativePlatform()
      : false;
  } catch (_) {
    return false;
  }
}

function safeName(name) {
  const base = (name || 'hidrocultivo-backup.json').split(/[/\\]/).pop();
  return base.replace(/[^a-zA-Z0-9._-]/g, '_') || 'hidrocultivo-backup.json';
}

/**
 * Escribe el JSON en caché de la app y abre la hoja de compartir del sistema.
 */
async function exportAndShare(jsonString, filename) {
  const pathOnly = safeName(filename);
  await Filesystem.writeFile({
    path: pathOnly,
    data: jsonString,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  });
  const { uri } = await Filesystem.getUri({
    path: pathOnly,
    directory: Directory.Cache,
  });
  await Share.share({
    title: 'Copia HidroCultivo',
    text: 'Copia de seguridad (.json)',
    url: uri,
    dialogTitle: 'Compartir copia',
  });
}

window.hcCapacitorBackup = { isNative, exportAndShare };
