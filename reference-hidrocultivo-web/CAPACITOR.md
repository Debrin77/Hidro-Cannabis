# HidroCultivo — Capacitor (Android / iOS)

La web/PWA sigue yendo en la **raíz del repo** (`index.html`, GitHub Pages, etc.). Para la **app nativa**, Capacitor sirve el contenido de la carpeta **`www/`**, generada en local (no está en git).

## Requisitos

- Node.js (npm)
- **Android:** Android Studio + SDK  
- **iOS:** Xcode (solo en macOS)

## Comandos

```bash
npm install
npm run cap:sync
```

Esto: copia `index.html`, `css/`, `js/`, `icons/`, `manifest.json`, `service-worker.js` a `www/`, sustituye `www/js/backup-capacitor.js` por el bundle con **Share** + **Filesystem**, y sincroniza con `android/` e `ios/`.

Abrir el IDE nativo:

```bash
npx cap open android
npx cap open ios
```

Compila y ejecuta ahí (emulador o dispositivo).

## Exportar copia en la app nativa

**Exportar estado** escribe el `.json` en caché y abre la **hoja de compartir** del sistema (guardar en Archivos, AirDrop, Drive, etc.). Si falla, se usa la descarga como en el navegador.

**Importar** sigue usando el selector de archivo del WebView (mismo flujo que la PWA).

## Publicar en tiendas

No es obligatorio ahora: puedes usar la app en modo **debug** o **TestFlight** sin Play Store. Cuando decidas publicar, necesitarás cuenta de desarrollador, iconos, textos de la ficha y revisión (sobre todo Apple).

## Primera vez: añadir plataformas

Si en el repo aún no existen las carpetas `android/` o `ios/`:

```bash
npm install
npx cap add android
npx cap add ios
npm run cap:sync
```

En Windows, `npx cap add ios` puede crear la carpeta pero **no podrás compilar iOS** hasta usar un Mac con Xcode.
