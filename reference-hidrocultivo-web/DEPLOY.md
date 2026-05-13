# Subir HidroCultivo a HTTPS (hosting gratuito)

Tu app debe servirse por **HTTPS** con `index.html` en la **raíz del sitio** (o en una subcarpeta; los enlaces del proyecto ya son relativos `./`).

---

## Opción A — Netlify (la más fácil, sin Git)

1. Entra en **https://app.netlify.com** y crea cuenta (email o GitHub).
2. En el panel: **Add new site** → **Deploy manually** (o arrastra la carpeta a la zona “Want to deploy a new site without connecting to Git?”).
3. Arrastra **toda la carpeta** `HidroCultivo-web` (o comprímela en ZIP y súbela).
4. Espera unos segundos. Te darán una URL tipo **`https://nombre-random-123.netlify.app`** — ya es **HTTPS**.
5. Abre esa URL en el móvil: debe cargar la app. En Chrome menú → **Instalar app** o **Añadir a pantalla de inicio**.

**Renombrar sitio (opcional):** Site settings → Change site name → ej. `hidrocultivo-demo`.

**Actualizar la web:** Vuelve a arrastrar la carpeta (o ZIP) en **Deploys** → **Deploy manually**.

---

## Opción B — Cloudflare Pages (sin Git, con cuenta Cloudflare)

1. **https://dash.cloudflare.com** → **Workers & Pages** → **Create** → **Pages** → **Upload assets**.
2. Sube un **ZIP** de `HidroCultivo-web` (contenido dentro del zip: `index.html`, `manifest.json`, `service-worker.js`, `icons/`, etc.).
3. Te asignan `https://xxxx.pages.dev` con HTTPS.

---

## Opción C — GitHub + GitHub Pages (repositorio y publicación)

### C.1 — Crear el repositorio en GitHub

1. Inicia sesión en **https://github.com**.
2. Arriba a la derecha **+** → **New repository**.
3. **Repository name:** por ejemplo `hidrocultivo` o `hidrocultivo-web` (solo letras, números, guiones).
4. **Description (opcional):** *HidroCultivo — PWA hidroponía*.
5. Elige **Public** (GitHub Pages gratuito para repos públicos) o **Private** (Pages en cuentas que lo permitan según tu plan).
6. **No marques** “Add a README” si vas a subir código local ya existente con Git (evita conflictos en el primer push). Si ya creaste el repo con README, en C.3 verás la nota del primer pull.
7. Pulsa **Create repository**. GitHub te mostrará la URL del repo, por ejemplo:  
   `https://github.com/TU-USUARIO/hidrocultivo.git`

### C.2 — Subir la carpeta `HidroCultivo-web` desde tu PC (Windows / PowerShell)

Abre **PowerShell** y ejecuta (ajusta la ruta si tu carpeta está en otro sitio):

```powershell
cd "C:\Users\carua\Downloads\HidroCultivo-web"
git init
git add .
git commit -m "HidroCultivo: sitio estático PWA (index, manifest, service worker, icons)"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/NOMBRE-REPO.git
git push -u origin main
```

Sustituye `TU-USUARIO` y `NOMBRE-REPO` por los tuyos. Si GitHub pide login, usa **HTTPS** con un **Personal Access Token** (Settings → Developer settings → Personal access tokens) como contraseña, o configura **Git Credential Manager** / **GitHub CLI** (`gh auth login`).

**Si el remoto ya existía con otro nombre o URL:** `git remote -v` para comprobar; `git remote set-url origin https://github.com/...` para corregir.

**Si al hacer `push` GitHub dice que el remoto tiene commits (p. ej. README creado en la web):**

```powershell
git pull origin main --allow-unrelated-histories
# resuelve conflictos si los hay, luego:
git push -u origin main
```

### C.3 — Qué debe quedar en la raíz del repositorio

En la vista del repo en GitHub deben verse en la **raíz** (no dentro de otra carpeta):

- `index.html`
- `manifest.json`
- `service-worker.js`
- carpeta `icons/`
- `DEPLOY.md`, `BUBBLEWRAP.md` (opcionales pero útiles)

No subas solo un ZIP sin descomprimir: GitHub Pages necesita esos archivos “sueltos” en la rama que publiques.

### C.4 — Activar GitHub Pages

1. En el repositorio: **Settings** (pestaña del repo).
2. Menú izquierdo: **Pages**.
3. **Build and deployment** → **Source:** **Deploy from a branch**.
4. **Branch:** `main`, carpeta **`/ (root)`** → **Save**.
5. Tras 1–2 minutos, la URL será:  
   `https://TU-USUARIO.github.io/NOMBRE-REPO/`

Comprueba también el recuadro verde/azul arriba del todo en **Settings → Pages** con el enlace definitivo.

### C.5 — Actualizar la web cuando cambies la app

1. Copia tu `HidroCultivo.html` actualizado a `HidroCultivo-web\index.html` (si trabajas así).
2. En la carpeta `HidroCultivo-web`:

```powershell
git add -A
git commit -m "Actualización HidroCultivo"
git push
```

GitHub Pages se actualiza solo en unos segundos tras el push.

### C.6 — Nota sobre la subruta (`/NOMBRE-REPO/`)

Con **usuario.github.io/NOMBRE-REPO/** el sitio no está en el dominio raíz. El proyecto ya usa rutas relativas (`./index.html`, `scope: ./` en el manifest), así que en la práctica suele funcionar bien. Si algo no carga (manifest o SW), abre la consola del navegador en esa URL exacta y revisa 404.

**Alternativa sin subruta:** crea un repo llamado **`TU-USUARIO.github.io`**, sube ahí el mismo contenido en `main` y la web quedará en `https://TU-USUARIO.github.io/` (sitio de usuario en la raíz).

---

## Comprobar que está bien

- Abre `https://TU-SITIO/manifest.json` → debe verse JSON, no error 404.
- En escritorio: Chrome → F12 → **Application** → **Manifest** (sin errores graves).
- **Importante:** no abras la app solo como `file://` en el PC; el service worker y la PWA necesitan **origen https** (o `localhost` en desarrollo local).

---

## Siguiente paso (Bubblewrap)

Cuando tengas la URL final, en `BUBBLEWRAP.md` usarás:

```text
https://TU-SITIO/manifest.json
```

Si el sitio está en **subcarpeta** (GitHub Pages), asegúrate de que `start_url` en `manifest.json` siga siendo correcto; con `./index.html` y `scope: ./` suele valer para la misma carpeta donde está el manifest.
