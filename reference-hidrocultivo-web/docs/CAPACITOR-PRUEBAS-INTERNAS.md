# HidroCultivo — Capacitor: pruebas internas (sin publicar en tienda)

La web en `index.html` puede usarse como **PWA** (icono en pantalla de inicio en iPhone). Capacitor empaqueta la misma UI en **`www/`** para **Android APK/AAB** e **iOS** con **WKWebView**, útil para TestFlight interno o APK de depuración **sin** pasar por revisión pública de tienda.

## Requisitos

- Node.js 18+ y `npm install` en la raíz del repo.
- **Android:** Android Studio, SDK, variable `ANDROID_HOME` si hace falta.
- **iOS (solo macOS):** Xcode, cuenta Apple Developer para firmar y subir a **TestFlight** (puede ser **Internal Testing** solo con tu equipo, sin “publicar” al App Store).

## Scripts del proyecto

| Comando | Qué hace |
|--------|-----------|
| `npm run www:sync` | Copia `index.html`, `manifest.json`, `service-worker.js`, `css/`, `js/`, `icons/` → `www/` |
| `npm run cap:bundle` | Genera el JS nativo auxiliar si aplica (`scripts/bundle-capacitor.cjs`) |
| `npm run cap:prep` | `www:sync` + `cap:bundle` |
| `npm run cap:sync` | `cap:prep` + `npx cap sync` (actualiza proyectos Android/iOS) |
| `npm run cap:open:android` | Abre el proyecto en Android Studio |
| `npm run cap:open:ios` | Abre el workspace en Xcode |

`www/` está en `.gitignore`; hay que generarlo antes de `cap sync`.

## Primera vez o tras clonar

```bash
npm install
npm run cap:sync
```

Si **no existe** la carpeta `ios/`:

```bash
npx cap add ios
npm run cap:sync
```

Android ya suele venir en el repo; si no:

```bash
npx cap add android
npm run cap:sync
```

## Flujo habitual tras cambiar la web

```bash
npm run cap:sync
```

Luego abre la plataforma y compila:

- **Android:** `npm run cap:open:android` → *Build* → APK de debug o AAB firmado para prueba interna.
- **iOS:** `npm run cap:open:ios` → selecciona *team* → *Archive* → *Distribute App* → **App Store Connect** → subir a TestFlight. En App Store Connect, usa **Internal Testing** (hasta 100 testers del equipo) sin enviar la app a revisión pública.

## TestFlight “sin publicar”

- Subir un build a TestFlight **no** publica la app en la App Store.
- **Internal testing:** solo emails que invites en App Store Connect.
- **External testing** sí requiere revisión beta de Apple; evítalo si solo quieres validar tú o tu equipo.

## Comprobar funcionamiento

- Datos en **localStorage / IndexedDB** del WebView: al instalar como app nueva, el almacenamiento es **por instalación** (no es el mismo que la PWA del Safari si la tratas como app distinta).
- **Permisos** (cámara, ubicación, notificaciones): pueden comportarse distinto a la PWA; conviene probar en dispositivo real.
- **Origen de la app:** `capacitor.config.json` usa `webDir: "www"`; no sirve cargar `localhost` en producción salvo que configures `server.url` para desarrollo.

## Referencia

- [Capacitor — iOS](https://capacitorjs.com/docs/ios)
- [Capacitor — Android](https://capacitorjs.com/docs/android)
- [Apple — TestFlight](https://developer.apple.com/testflight/)
