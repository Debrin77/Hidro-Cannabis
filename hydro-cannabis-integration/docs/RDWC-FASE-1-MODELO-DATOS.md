# RDWC — Fase 1 (Modelo de datos y compatibilidad núcleo)

## Objetivo

Dejar `RDWC` integrado en el núcleo de estado y normalización para que el tipo de instalación exista de forma estable antes de construir UI/SVG/checklist específico.

---

## 1) Estado base aprobado (`state.configTorre`)

Campos RDWC v1 definidos:

- `tipoInstalacion: 'rdwc'`
- `rdwcSites` (int, default `4`)
- `rdwcRows` (int, default `1`)
- `rdwcBucketVolL` (float/int, default `20`)
- `rdwcControlVolL` (float/int, default `40`)
- `rdwcNetPotMm` (int, default `125`)
- `rdwcCenterSpacingCm` (float/int, default `45`)
- `rdwcRecirculationLh` (float/int, default `1200`)
- `rdwcAirLpm` (float/int, default `20`)
- `rdwcTempObjetivoC` (float/int, default `19`)
- `rdwcTempWarnHighC` (float/int, default `22`)
- `rdwcTempWarnLowC` (float/int, default `17`)
- `rdwcFlowMode` (enum, default `'continuous'`)
- `rdwcTopFeedEnabled` (bool, default `false`)
- `rdwcReturnMode` (enum `'gravity'|'forced'`, default `'gravity'`)
- `rdwcLayout` (enum `'line'|'double_row'|'u_shape'`, default `'line'`)

---

## 2) Saneado/normalización

Se aplica `rdwcEnsureConfigDefaults(cfg)` desde el núcleo para:

- completar campos faltantes,
- corregir tipos inválidos,
- forzar rangos mínimos de seguridad.

Esto evita configs rotas tras migraciones, importaciones o estados antiguos.

---

## 3) Compatibilidad de tipo

`tipoInstalacionNormalizado` ahora reconoce:

- `torre`
- `nft`
- `dwc`
- `rdwc`

`etiquetaSistemaHidroponicoBreve` ahora devuelve `RDWC` cuando corresponde.

---

## 4) Compatibilidad transversal inicial

Para no romper flujos actuales:

- validaciones de tipo en checklist/arranque aceptan `rdwc`,
- migración de emoji por tipo incluye `rdwc`.

Nota: la UI específica de RDWC y su checklist técnico detallado se desarrollan en Fase 2+.

---

## 5) Criterio de cierre de Fase 1

Fase 1 se considera completada cuando:

1. El tipo `rdwc` persiste sin degradarse a `torre`.
2. Defaults se autocompletan al cargar configuración.
3. No hay errores de linter/regresión por reconocimiento de nuevo tipo.
4. El proyecto queda listo para Fase 2 (UI sistema + setup RDWC).

