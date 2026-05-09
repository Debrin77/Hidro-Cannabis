# Hydro Cannabis

App web para planificar y monitorizar cultivos de **cannabis en hidrocultivo** (RDWC/DWC y referencias NFT), con checklist guiado, clima, nutrientes y registro diario.

## Estructura del proyecto

- `index.html`: layout principal, splash e vistas.
- `css/base.css`: variables, layout base y utilidades.
- `css/components.css`: componentes UI (cards, tablas, splash, inicio, monitor, etc.).
- `css/responsive.css`: comportamiento responsive.
- `js/data.js`: datos de variedades, nutrientes y perfiles de agua.
- `js/state.js`: estado global y persistencia en `localStorage` (claves internas `hydrogrow-pro.v1.*` por compatibilidad).
- `js/navigation.js`: navegación entre vistas.
- `js/home.js`: pantalla **Inicio** y checklist de buenas prácticas.
- `js/strains.js`: listado y detalle de variedades.
- `js/nutrients.js`: ranking y detalles de nutrientes.
- `js/cultivo.js`: checklist operativo, wizard y cultivo activo.
- `js/monitor.js`: monitor, mediciones y gráficas por planta.
- `js/semanas.js`: calendario semanal.
- `js/main.js`: inicialización de la app.
- `assets/icons/`: iconos, favicon y logo splash.

## Desarrollo local

Abre `index.html` en el navegador o usa Live Server.

Atajos útiles en la URL:

- `?nosplash=1` — oculta la pantalla de inicio.
- `?dev=1` o `?skipWelcome=1` — salta la bienvenida larga y va al asistente clásico en **Checklist y cultivo**.

## Deploy en GitHub Pages

1. Sube cambios a `main`.
2. En GitHub: **Settings** → **Pages**.
3. Source: **Deploy from a branch**; branch `main`, carpeta `/(root)`.
4. Espera 1–3 minutos y recarga el sitio (mejor recarga forzada).

## Flujo recomendado

1. Cambio pequeño → prueba local → `git add`, `commit`, `push`.
2. Valida en la URL de Pages.
