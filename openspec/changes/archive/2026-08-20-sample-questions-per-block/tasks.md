# Tasks: Muestreo de 6 preguntas (1 por bloque) en vez de las 36 completas

## 1. Medición (evidencia antes de decidir)

- [x] 1.1 Medir contra la API real de Groq (`reasoning_effort: 'low'`) el coste en tokens para
      distintos N de preguntas (3, 6, 12, 18) — ajusta a `tokens ≈ 600 + 292 × N`
- [x] 1.2 Calcular con ese modelo qué N permite que las 3 comparaciones de una tacada quepan en el
      presupuesto de 8.000 tokens/minuto — N=6 (una por bloque) con margen (~7.113 de 8.000)

## 2. Implementación (TDD)

- [x] 2.1 Tests primero en `ai-orchestrator.service.spec.ts` (rojo confirmado): selección de 6 ids
      (1 por bloque), uso de `randomFn` inyectable, `runWithConcurrencyLimit` exportado y probado en
      aislamiento
- [x] 2.2 `ai-orchestrator.service.ts`: `selectSampledQuestionIds()` (1 al azar por bloque) + filtro
      de `pairs` antes de `chunk()` — sin tocar `chunk`/`runWithConcurrencyLimit`/`processBatch`
- [x] 2.3 Reescritos los tests existentes que asumían 36 preguntas/6 lotes (ya no aplican: ahora es
      1 lote combinado) — retry/error/logging adaptados al nuevo modelo de un único lote
- [x] 2.4 Test nuevo en `weighting.util.spec.ts`: confirma que 1 resultado por bloque pondera igual
      que 6 (sin cambio de código en `weighting.util.ts`, ya generalizaba correctamente)
- [x] 2.5 Descripción de test corregida en `results-dashboard.component.spec.ts` ("las 36 preguntas"
      → "las preguntas analizadas") — la aserción no dependía de un conteo real
- [x] 2.6 Suite completa backend (unit + `nest build`) y frontend en verde

## 3. Documentación

- [x] 3.1 `proposal.md` + `design.md` (4 decisiones: estratificado por bloque vs. aleatorio puro;
      N=6 vs. N mayor; muestreo fresco por comparación vs. compartido por ronda; sin cambios en
      `weighting.util.ts`)
- [x] 3.2 `specs/ai-compatibility-analysis` (delta MODIFIED): orquestación por lotes y ponderación
      compuesta actualizadas a "6 muestreadas, 1 por bloque"
- [x] 3.3 `specs/results-dashboard` (delta MODIFIED): escenario de detalle expandible actualizado
- [x] 3.4 `docs/plan.md`: tabla de stack IA (nota 2), sección "Orquestación de las llamadas a IA"
      reescrita, párrafo de ponderación, punto 5 del flujo de pantallas (dashboard), riesgos y
      limitaciones, corrección sobre el paso 3 de la tabla "Camino de mejora", y el resto de
      menciones sueltas a "las 36 preguntas" que describían el análisis de IA (no el cuestionario
      en sí, que sigue siendo de 36 preguntas sin cambios)
- [x] 3.5 `README.md`: sección "Limitaciones de las herramientas gratuitas" — el punto de Groq
      reescrito con la causa medida y las 3 mitigaciones aplicadas
