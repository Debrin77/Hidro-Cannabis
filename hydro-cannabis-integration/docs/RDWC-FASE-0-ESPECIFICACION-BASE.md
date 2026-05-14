# RDWC — Fase 0 (Investigación y Especificación Base)

## 1) Objetivo de esta fase

Definir una base técnica sólida para incorporar `RDWC` en la vista de integración sin romper la metodología actual de `Torre`, `NFT` y `DWC`.

Esta fase **no incluye implementación**. Su salida es un contrato funcional/técnico para las siguientes fases.

---

## 2) Alcance funcional de RDWC (v1)

Se define `RDWC` como sistema de:

- Múltiples cubos/módulos de cultivo conectados hidráulicamente.
- Depósito de control común (epicentro).
- Recirculación de solución nutritiva entre módulos y depósito.
- Aireación activa de la solución (bomba de aire/difusores o equivalente).

### 2.1 Variantes contempladas

- **RDWC Base (obligatoria en v1):**
  - Recirculación continua 24/7.
  - Aireación activa.
  - Gestión de retorno al depósito.

- **RDWC + Top Feed (opcional, no bloqueante para v1):**
  - Apoyo por goteo superior en arranque o estrategia avanzada.
  - Debe quedar como opción avanzada, no predeterminada.

---

## 3) Decisiones de producto (congeladas en Fase 0)

1. La app seguirá siendo **una sola app multi-sistema**.
2. `RDWC` será un **tipo de instalación nuevo**, no una variación interna de `DWC`.
3. La operación por defecto será **continua**, no por impulsos.
4. La UX y checklist mantendrán la misma metodología actual:
   - Configuración -> validación -> checklist -> historial -> calendario.
5. `Raft/Floating` se abordará después de estabilizar `RDWC`.

---

## 4) Modelo operativo RDWC (reglas base)

## 4.1 Hidráulica

- Debe existir circuito de ida/retorno entre módulos y depósito.
- Debe existir validación de coherencia básica:
  - volumen total,
  - número de módulos,
  - caudal de recirculación,
  - retorno efectivo.

## 4.2 Oxigenación

- RDWC v1 requiere aireación activa declarada en configuración.
- Debe haber control en checklist para verificar oxigenación homogénea.

## 4.3 Temperatura de solución

- Parámetro crítico en RDWC.
- Objetivo operativo recomendado de referencia (v1): **18–20 °C** (con tolerancias y alertas configurables).
- Debe generarse aviso por riesgo térmico sostenido.

## 4.4 Mantenimiento de solución

- Soporte para top-off y recambios planificados.
- Registro de recambios y ajustes (EC/pH/volumen/temperatura).
- Limpieza periódica de líneas, depósitos y difusores.

---

## 5) Requisitos de UX/UI por sistema

## 5.1 Sistema (pantalla)

`RDWC` tendrá bloque propio con:

- Layout del sistema (línea, dos filas, U, etc. en fases posteriores).
- Nº de cubos/módulos.
- Volumen por módulo y volumen del depósito.
- Diámetro de cesta.
- Datos de bomba de recirculación y aireación.
- Parámetros de temperatura objetivo.

## 5.2 SVG dinámico

El SVG deberá reflejar configuración real:

- módulos de cultivo,
- depósito de control,
- líneas de ida/retorno,
- dirección de flujo,
- estado de operación.

## 5.3 Checklist específico RDWC

Debe incluir pasos exclusivos:

- cebado/purga,
- verificación de retorno por módulo,
- verificación de aireación,
- estabilización térmica,
- cierre de recarga con registro completo.

---

## 6) Compatibilidad cultivo ↔ geometría (objetivo de calidad)

RDWC debe informar compatibilidad según:

- volumen por cubo/planta,
- diámetro de cesta,
- separación entre centros.

Salida esperada en fases de implementación:

- estado por cultivo (`OK`, `Ajustar`, `No recomendado`),
- motivo técnico visible,
- recomendación accionable.

---

## 7) No-objetivos de v1 (para evitar sobrealcance)

- Control automático hardware IoT en tiempo real.
- Modelado hidráulico avanzado CFD.
- Prescripciones agronómicas hiper-específicas por variedad comercial.

---

## 8) Riesgos principales y mitigación

1. **Confusión DWC vs RDWC**
   - Mitigación: separar claramente tipología y checklist.

2. **Complejidad excesiva inicial**
   - Mitigación: núcleo RDWC base; top-feed como opcional posterior.

3. **Regresiones en sistemas existentes**
   - Mitigación: gates por `tipoInstalacion` + pruebas de regresión obligatorias.

---

## 9) Criterios de salida de Fase 0

Fase 0 se considera completada cuando:

1. Existe esta especificación base aprobada.
2. Están definidas decisiones congeladas de v1.
3. Está acordado el alcance de Fase 1 (modelo de datos RDWC).
4. No hay dudas abiertas críticas sobre:
   - operación continua,
   - aireación obligatoria,
   - control térmico,
   - checklist diferencial.

---

## 10) Próximo paso inmediato (Fase 1)

Diseñar y documentar el esquema de datos `RDWC` en `state.configTorre`:

- campos mínimos obligatorios,
- defaults seguros,
- validaciones,
- estrategia de migración sin romper instalaciones existentes.

