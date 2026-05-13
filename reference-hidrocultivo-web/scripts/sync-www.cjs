/**
 * Copia el sitio estático a www/ para Capacitor (no incluye node_modules).
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const www = path.join(root, 'www');

const files = ['index.html', 'manifest.json', 'service-worker.js'];
const dirs = ['css', 'js', 'icons', 'data'];

function ensureDir(dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
}

function statSafe(p) {
  try {
    return fs.statSync(p);
  } catch (_) {
    return null;
  }
}

function copyFileIfChanged(src, dest) {
  const s = statSafe(src);
  if (!s || !s.isFile()) return false;
  const d = statSafe(dest);
  if (d && d.isFile() && d.size === s.size && d.mtimeMs >= s.mtimeMs) {
    return false;
  }
  ensureDir(dest);
  fs.copyFileSync(src, dest);
  return true;
}

function listFilesRec(base) {
  const out = [];
  function walk(cur) {
    if (!fs.existsSync(cur)) return;
    const ents = fs.readdirSync(cur, { withFileTypes: true });
    for (const ent of ents) {
      const p = path.join(cur, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (ent.isFile()) out.push(path.relative(base, p));
    }
  }
  walk(base);
  return out;
}

function pruneRemoved(srcBase, destBase) {
  if (!fs.existsSync(destBase)) return 0;
  const srcSet = new Set(listFilesRec(srcBase));
  let removed = 0;
  const destFiles = listFilesRec(destBase);
  for (const rel of destFiles) {
    if (srcSet.has(rel)) continue;
    const abs = path.join(destBase, rel);
    fs.rmSync(abs, { force: true });
    removed++;
  }
  return removed;
}

function syncDirIncremental(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return { copied: 0, removed: 0 };
  const srcFiles = listFilesRec(srcDir);
  let copied = 0;
  for (const rel of srcFiles) {
    if (copyFileIfChanged(path.join(srcDir, rel), path.join(destDir, rel))) copied++;
  }
  const removed = pruneRemoved(srcDir, destDir);
  return { copied, removed };
}

const t0 = Date.now();
fs.mkdirSync(www, { recursive: true });
let copiedCount = 0;
let removedCount = 0;

for (const f of files) {
  if (copyFileIfChanged(path.join(root, f), path.join(www, f))) copiedCount++;
}
for (const d of dirs) {
  const src = path.join(root, d);
  const dst = path.join(www, d);
  const r = syncDirIncremental(src, dst);
  copiedCount += r.copied;
  removedCount += r.removed;
}

console.log(
  'www/ sincronizado (incremental): ' +
    copiedCount +
    ' actualizado(s), ' +
    removedCount +
    ' eliminado(s) · ' +
    (Date.now() - t0) +
    ' ms'
);
