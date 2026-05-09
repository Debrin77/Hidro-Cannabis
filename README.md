# HydroGrow Pro

App web para planificar y monitorear cultivos de cannabis en sistemas hidropónicos.

## Estructura del proyecto

- `index.html`: layout principal y vistas.
- `css/base.css`: variables, layout base y utilidades.
- `css/components.css`: componentes UI (cards, tablas, alertas, etc.).
- `css/responsive.css`: comportamiento responsive.
- `js/data.js`: datos de variedades y nutrientes.
- `js/state.js`: estado global y persistencia en `localStorage`.
- `js/navigation.js`: navegación entre vistas.
- `js/strains.js`: listado y detalle de variedades.
- `js/nutrients.js`: ranking y detalles de nutrientes.
- `js/cultivo.js`: wizard de configuración y cultivo activo.
- `js/monitor.js`: monitor y bitácora.
- `js/semanas.js`: calendario semanal.
- `js/main.js`: inicialización de la app.
- `assets/icons/`: iconos y favicon.
- `assets/images/`: imágenes del proyecto.

## Desarrollo local

Al ser HTML/CSS/JS puro, puedes abrir `index.html` directamente en el navegador.

Si quieres recarga automática, usa una extensión tipo Live Server.

## Deploy en GitHub Pages

1. Sube cambios a `main`.
2. En GitHub: `Settings` -> `Pages`.
3. Source: `Deploy from a branch`.
4. Branch: `main` y carpeta `/(root)`.

## Flujo recomendado

1. Crea una mejora pequeña.
2. Prueba localmente.
3. Sube cambios:

```bash
git add .
git commit -m "feat: tu mejora"
git push
```

4. Espera 1-3 minutos y valida en GitHub Pages.
