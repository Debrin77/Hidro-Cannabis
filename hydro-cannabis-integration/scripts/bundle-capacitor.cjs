/**
 * Sustituye www/js/backup-capacitor.js por el bundle nativo (Share + Filesystem).
 */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const root = path.join(__dirname, '..');
const out = path.join(root, 'www', 'js', 'backup-capacitor.js');
const entry = path.join(root, 'js', 'backup-capacitor.native.js');

if (!fs.existsSync(entry)) {
  console.error('Falta', entry);
  process.exit(1);
}

try {
  esbuild.buildSync({
    entryPoints: [entry],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    outfile: out,
    logLevel: 'info',
  });
  console.log('Bundle nativo:', out);
} catch (e) {
  console.error(e);
  process.exit(1);
}
