# Hoja de ruta PWA → app nativa (Hydro Cannabis integración)

Objetivo: app usable instalada, copias de seguridad claras y menos fricción en móvil (sobre todo iPhone).

---

## Fase 1 — PWA + backup en navegador (en curso / hecho en repo)

| Ítem | Estado |
|------|--------|
| `manifest.json` | Presente (nombre, iconos, `standalone`, tema). |
| `service-worker.js` | Precache ligero del shell; HTML red primero, fallback offline. Caché versionada (`hydro-cannabis-embed-shell-v1`…). |
| Registro del SW | Al cargar la página. |
| Botón **Instalar** | Visible cuando el navegador emite `beforeinstallprompt` (p. ej. Chrome/Android). |
| iPhone sin ese evento | Toast al pulsar Instalar: Safari → Compartir → **Añadir a la pantalla de inicio**. |
| Exportar / importar | JSON local; import con `<label>` + input a tamaño del botón para Safari iOS. |

**Medir fricción en iPhone:** hace falta abrir la app en **Safari** desde una **URL HTTPS** (no basta con “tener el repo en GitHub Desktop”). Opciones típicas:

1. **GitHub Pages** (si el repo es público o Pages en plan que lo permita): Settings → Pages → rama + carpeta → la web queda en `https://<usuario>.github.io/<repo>/` (o dominio custom).
2. Otro hosting estático (Netlify, Cloudflare Pages, Vercel, etc.) con el mismo resultado: **misma origen HTTPS** que sirva `index.html`, `manifest.json`, `service-worker.js` y `css/` / `js/` / `icons/`.

**GitHub Desktop** solo **empuja commits** a GitHub. Para probar en el móvil:

1. Sube los cambios con Desktop (o `git push`).
2. Activa Pages o tu hosting para que exista la URL.
3. En el iPhone: Safari → esa URL → usar **Exportar/Importar** y **Añadir a la pantalla de inicio** → anotar qué pasos molestan.

Checklist rápido de prueba en iPhone:

- [ ] La URL carga sin error y el icono / tema se ven bien.
- [ ] **Añadir a inicio** abre la app en pantalla casi completa.
- [ ] **Exportar estado** deja un `.json` localizable (Archivos / Descargas).
- [ ] **Importar estado** permite elegir ese `.json` y restaura tras confirmar.
- [ ] Tras una actualización del sitio, recargar (o cerrar pestañas) si el SW muestra caché vieja.

---

## Fase 2 — Capacitor (iOS / Android) — cuando la fase 1 no baste

Cuando quieras:

- Guardar / elegir archivos con el **selector nativo** y rutas más predecibles.
- **Compartir** la copia (AirDrop, Drive, correo) desde la app.
- Opcional: publicar en **App Store** / **Google Play** (cuentas de desarrollador, revisión en Apple).

Pasos en este repo (ver **`CAPACITOR.md`**):

1. **`npm run cap:sync`** — genera `www/`, bundle nativo de exportación (Share + Filesystem) y sincroniza Android/iOS.
2. Plugins: **@capacitor/filesystem**, **@capacitor/share**. Export en nativo abre la hoja de compartir; import sigue con file input.
3. La **web y Pages** siguen sirviendo la raíz (`js/backup-capacitor.js` es un stub que no hace nada en navegador).
4. Validación/aplicación del backup: misma lógica `onImportEstadoFileSelected` / `localStorage` en web y nativo.

---

## Notas

- Los datos siguen siendo **locales** salvo que tú exportes y copies el archivo tú mismo; ninguna fase sustituye tus propias copias de seguridad.
- Para decidir **Fase 2**, usa el checklist de fricción de la Fase 1 en un **iPhone real** con la URL publicada.
