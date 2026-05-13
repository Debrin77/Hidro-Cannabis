# HidroCultivo — Paquete web PWA + checklist Bubblewrap (Google Play)

## Estructura de esta carpeta

```
HidroCultivo-web/
├── index.html          ← copia de HidroCultivo.html (actualizar cuando edites el original)
├── manifest.json
├── service-worker.js
├── icons/
│   ├── icon-192.png           (requerido)
│   ├── icon-512.png           (requerido)
│   └── icon-maskable-512.png  (recomendado Play / adaptive icon)
└── BUBBLEWRAP.md         ← este archivo
```

### Sincronizar con tu `HidroCultivo.html` principal

Si sigues editando `../HidroCultivo.html` en Descargas, vuelve a copiar:

```powershell
Copy-Item -Force ..\HidroCultivo.html .\index.html
```

---

## 1. Iconos (antes de Bubblewrap)

**Hecho en el repo:** `icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (hoja + gota, ver `icons/ORIGEN.txt`).

Para **regenerar** tras cambiar el diseño maestro:

```powershell
cd HidroCultivo-web
npm install
node scripts\resize-icons.js
```

(O genera otros con [PWABuilder](https://www.pwabuilder.com/) / [Maskable.app](https://maskable.app/) y sustituye los PNG.)

---

## 2. Publicar la web en HTTPS

Bubblewrap necesita una **URL pública** del `manifest.json` (y de la app).

Opciones típicas:

- **GitHub Pages** (repo público o Pages privado según plan)
- **Netlify / Cloudflare Pages / Vercel** (arrastra la carpeta `HidroCultivo-web`)

Comprueba en el móvil:

- `https://TU-DOMINIO/.../manifest.json` responde 200
- `https://TU-DOMINIO/.../index.html` carga
- En Chrome → Instalar app / Lighthouse PWA

**Importante:** en el manifest que use Bubblewrap, `start_url` y `scope` deben coincidir con la ruta real (si la app no está en la raíz del dominio, ajusta `start_url` y `scope`).

---

## 3. Prerrequisitos locales

- **JDK 17** (o el que pida la versión actual de `bubblewrap`)
- **Android SDK** + variable `ANDROID_HOME`
- **Node.js** (para instalar Bubblewrap CLI)

```bash
npm i -g @bubblewrap/cli
bubblewrap --version
```

---

## 4. Inicializar el proyecto Android (TWA)

```bash
mkdir cultiva-twa && cd cultiva-twa
bubblewrap init --manifest https://TU-DOMINIO/ruta/manifest.json
```

El asistente pedirá:

- Application ID (ej. `app.cultiva.hidro` — **único en Play**)
- Nombre, launcher, tema (puedes alinear con `#15803d`)
- **Signing key** (keystore): créalo y **guarda copia segura**; sin él no actualizarás la app en Play

---

## 5. Build del APK / App Bundle

```bash
bubblewrap build
```

Genera un **AAB** listo para subir a Play Console (preferido frente a APK suelto).

---

## 6. Digital Asset Links (obligatorio para TWA)

Para que el APK abra tu sitio **sin barra de URL** “de verdad”:

1. En el proyecto generado por Bubblewrap obtendrás el **package name** y **SHA-256** del certificado.
2. Sirve en tu dominio:

   `https://TU-DOMINIO/.well-known/assetlinks.json`

3. Bubblewrap suele ofrecer el JSON o un comando de verificación.

Sin esto, la “Trusted Web Activity” puede mostrar barra o fallback.

---

## 7. Google Play Console (resumen)

1. Cuenta de desarrollador (cuota única).
2. Crear aplicación → subir **AAB**.
3. **Política de privacidad** (URL obligatoria).
4. **Formulario de seguridad de datos** (qué datos, APIs de terceros, etc.).
5. **Target API level** según requisito vigente de Google (Bubblewrap actualizado ayuda).
6. Pruebas internas → cerrada → producción.

---

## 8. Checklist rápida

- [ ] `icons/` con 192, 512 y maskable 512
- [ ] Sitio en **HTTPS** y manifest accesible
- [ ] `start_url` / `scope` correctos para la URL final
- [ ] Probar instalación PWA en Chrome Android
- [ ] `bubblewrap init` + `bubblewrap build`
- [ ] **assetlinks.json** publicado y verificado
- [ ] Keystore **respaldado**
- [ ] Política de privacidad + Data safety en Play

---

## 9. Alternativa sin CLI

[PWABuilder](https://www.pwabuilder.com/) puede generar paquete Android desde tu URL; el flujo es parecido (también necesitas firma y Play Console).
