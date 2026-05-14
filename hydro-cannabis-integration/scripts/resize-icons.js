/**
 * Regenera icon-192.png, icon-512.png, icon-maskable-512.png
 * desde el PNG maestro (ajusta MASTER si cambias de sitio el archivo).
 */
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const ICONS = path.join(ROOT, 'icons');
const MASTER = path.join(
  process.env.USERPROFILE || '',
  '.cursor',
  'projects',
  'c-Users-carua-Downloads',
  'assets',
  'cultiva-icon-master.png'
);

async function main() {
  if (!fs.existsSync(MASTER)) {
    console.error('No existe el maestro:', MASTER);
    console.error('Genera un PNG cuadrado y pasa la ruta como argumento: node resize-icons.js "C:\\ruta\\icono.png"');
    const alt = process.argv[2];
    if (!alt || !fs.existsSync(alt)) process.exit(1);
  }
  const input = fs.existsSync(MASTER) ? MASTER : process.argv[2];
  await sharp(input).resize(192, 192).png().toFile(path.join(ICONS, 'icon-192.png'));
  await sharp(input).resize(512, 512).png().toFile(path.join(ICONS, 'icon-512.png'));
  await sharp(input).resize(512, 512).png().toFile(path.join(ICONS, 'icon-maskable-512.png'));
  console.log('Iconos escritos en', ICONS);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
