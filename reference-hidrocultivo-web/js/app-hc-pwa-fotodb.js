/**
 * Service Worker / PWA, arranque PIN/biometría, IndexedDB fotos.
 * Tras app-hc-torres-badges-notifs.js.
 */
// ══════════════════════════════════════════════════
// SERVICE WORKER + ARRANQUE
// ══════════════════════════════════════════════════

// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js?v=2026-05-05-tab-active-icon-color')
      .then(reg => console.log('[HidroCultivo] SW registrado:', reg.scope))
      .catch(err => console.warn('[HidroCultivo] SW error:', err));
  });
}

/** Safari iOS / iPadOS no dispara beforeinstallprompt: la instalación es manual. */
function esPlataformaIOSWeb() {
  const ua = navigator.userAgent || '';
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return iOS;
}

// Instalar PWA manualmente (Chrome/Edge/Android) o indicar pasos en iOS
function instalarPWA() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(result => {
      if (result.outcome === 'accepted') {
        showToast('✅ Instalando HidroCultivo…');
      }
      deferredPrompt = null;
    });
    return;
  }
  if (esPlataformaIOSWeb()) {
    showToast(
      'En iPhone/iPad: Safari → icono compartir ↑ → «Añadir a la pantalla de inicio». Así tendrás icono propio como una app.',
      false
    );
    return;
  }
  showToast(
    'Si no aparece el instalador, usa el menú del navegador («Instalar app» o «Crear acceso directo»). En escritorio suele salir tras usar la página un rato.',
    false
  );
}

// Detectar instalación PWA
let deferredPrompt;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  // Mostrar botón de instalación si está disponible
  const installBtn = document.getElementById('installPWABtn');
  if (installBtn) installBtn.style.display = 'flex';
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  const installBtn = document.getElementById('installPWABtn');
  if (installBtn) installBtn.style.display = 'none';
  showToast('✅ HidroCultivo instalada correctamente');
});

const SPLASH_MIN_VISIBLE_MS = 2600;
const splashShownAtMs = Date.now();

const hideSplash = () => {
  const splash = document.getElementById('splashScreen');
  if (splash) splash.style.display = 'none';
};

async function waitSplashMinimumVisible() {
  const elapsed = Date.now() - splashShownAtMs;
  if (elapsed >= SPLASH_MIN_VISIBLE_MS) return;
  await new Promise(resolve => setTimeout(resolve, SPLASH_MIN_VISIBLE_MS - elapsed));
}

// Failsafe para WebView: evita splash infinito si window.onload no llega.
setTimeout(hideSplash, 6000);

window.onload = () => {
  gestionarCambioVersionEnArranque();

  // ── Registrar listeners del PIN (evitar onclick inline) ──────────────────
  document.querySelectorAll('.pin-key[data-digit]').forEach(key => {
    key.addEventListener('click', () => pinPress(key.dataset.digit));
  });
  document.getElementById('pinDelBtn')?.addEventListener('click', pinDel);

  // ── Soporte teclado físico para el PIN ────────────────────────────────────
  document.addEventListener('keydown', e => {
    const pinScr = document.getElementById('pinScreen');
    if (!pinScr || pinScr.style.display === 'none') return;
    if (e.key >= '0' && e.key <= '9') pinPress(e.key);
    if (e.key === 'Backspace') pinDel();
  });

  // Secuencia recomendada: splash de marca breve -> desbloqueo (biometría/PIN).
  (async () => {
    await waitSplashMinimumVisible();
    hideSplash();

    // Si el usuario autenticó antes de terminar el splash (p. ej. versión anterior con PIN visible encima),
    // no volver a lockAppWithPin: con «recordar 0 min» hasValidAuthSession es false y congelaría la app ya iniciada.
    if (appBootstrapped) return;

    // Arranque protegido: sesión configurable (si expira, biometría -> PIN).
    if (hasValidAuthSession()) {
      unlockAndInitApp();
      return;
    }
    lockAppWithPin();
    setTimeout(async () => {
      if (appBootstrapped) return;
      const statusEl = document.getElementById('pinAuthStatus');
      const ok = await tryBiometricUnlock();
      if (appBootstrapped) return;
      if (ok) {
        unlockAndInitApp();
      } else {
        const pinErr = document.getElementById('pinErr');
        if (pinErr) pinErr.textContent = '';
        if (statusEl) statusEl.textContent = 'Biometría no disponible. Introduce tu PIN.';
      }
    }, 150);
  })();
};

// ══════════════════════════════════════════════════
// FOTODB — IndexedDB para fotos (sin límite de tamaño)
// ══════════════════════════════════════════════════
const FOTO_DB_NAME    = 'cultivaFotos';
const FOTO_DB_VERSION = 1;
const FOTO_STORE      = 'fotos';
let fotoDB = null;

function abrirFotoDB() {
  return new Promise((resolve, reject) => {
    if (fotoDB) { resolve(fotoDB); return; }
    const req = indexedDB.open(FOTO_DB_NAME, FOTO_DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(FOTO_STORE)) {
        db.createObjectStore(FOTO_STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess  = e => { fotoDB = e.target.result; resolve(fotoDB); };
    req.onerror    = e => reject(e.target.error);
  });
}

async function guardarFotoIDB(key, fotoObj) {
  const db = await abrirFotoDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FOTO_STORE, 'readwrite');
    tx.objectStore(FOTO_STORE).put({ key, ...fotoObj });
    tx.oncomplete = () => resolve(key);
    tx.onerror    = e => reject(e.target.error);
  });
}

async function leerFotoIDB(key) {
  const db = await abrirFotoDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(FOTO_STORE, 'readonly');
    const req = tx.objectStore(FOTO_STORE).get(key);
    req.onsuccess = e => resolve(e.target.result || null);
    req.onerror   = e => reject(e.target.error);
  });
}

async function leerFotosPorPrefijo(prefix) {
  const db = await abrirFotoDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(FOTO_STORE, 'readonly');
    const store = tx.objectStore(FOTO_STORE);
    const rango = IDBKeyRange.bound(prefix, prefix + '\uFFFF');
    const req   = store.getAll(rango);
    req.onsuccess = e => resolve(e.target.result || []);
    req.onerror   = e => reject(e.target.error);
  });
}

async function borrarFotoIDB(key) {
  const db = await abrirFotoDB();
  return new Promise((resolve) => {
    const tx = db.transaction(FOTO_STORE, 'readwrite');
    tx.objectStore(FOTO_STORE).delete(key);
    tx.oncomplete = resolve;
  });
}

// Migrar fotos antiguas que estaban en state.torre a IndexedDB
async function migrarFotosAIDB() {
  let migradas = 0;
  for (let n = 0; n < (state.torre || []).length; n++) {
    for (let c = 0; c < (state.torre[n] || []).length; c++) {
      const cesta = state.torre[n][c];
      if (!cesta || !cesta.fotos || cesta.fotos.length === 0) continue;
      for (let i = 0; i < cesta.fotos.length; i++) {
        const foto = cesta.fotos[i];
        if (!foto.data) continue; // ya migrada o sin data
        const key = 'foto_t0_n' + n + '_c' + c + '_' + (foto.isoDate || Date.now() + i).replace(/[:.]/g,'_');
        await guardarFotoIDB(key, foto);
        if (!cesta.fotoKeys) cesta.fotoKeys = [];
        cesta.fotoKeys.push(key);
        migradas++;
      }
      // Eliminar datos base64 del state (solo guardar keys)
      delete cesta.fotos;
    }
  }
  if (migradas > 0) {
    saveState();
    console.log('[HidroCultivo] Migradas', migradas, 'fotos a IndexedDB');
  }
  return migradas;
}

