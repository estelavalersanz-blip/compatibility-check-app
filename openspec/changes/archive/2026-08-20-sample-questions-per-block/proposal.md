# Muestreo de 6 preguntas (1 por bloque) en vez de las 36 completas

## Why

`harden-ai-rate-limit-resilience` (archivado, 2026-08-19) redujo el consumo de tokens por lote
(`reasoning_effort: 'low'`) y alargó el backoff entre reintentos, pero verificado en producción con
datos reales: **1 de cada 3 comparaciones sigue completándose, las otras 2 siguen en `error`** —
Groq (`openai/gpt-oss-120b`, plan gratuito) limita a 8.000 tokens/minuto, y analizar las 36 preguntas
de una sola comparación (6 lotes) ya consume la mayor parte de ese presupuesto; con 3 comparaciones
seguidas, no hay margen real para las 2 últimas por mucho que se alargue el backoff.

Medido con datos reales contra la API de Groq (`reasoning_effort: 'low'`): el coste ajusta casi
exactamente a `tokens ≈ 600 + 292 × N` preguntas. Con N=6 (una sola llamada, no 6 lotes), 3
comparaciones seguidas caben en ~7.100 tokens — dentro del presupuesto con margen — frente a los
~14.000+ que exigían las 36 preguntas completas incluso ya con `reasoning_effort: 'low'`.

Reducir el número de preguntas analizadas por la IA (36 → 6) resuelve la causa raíz de capacidad sin
depender de ningún proveedor de pago ni de la disponibilidad, cambiante y compartida, del catálogo
gratuito de OpenRouter (investigado en la misma sesión: varios modelos `:free` devolvieron 429 por
saturación de demanda compartida entre todos los usuarios de OpenRouter, fuera de nuestro control).

## What Changes

- `ai-orchestrator.service.ts`: en vez de analizar las 36 preguntas de una comparación (agrupadas en
  6 lotes de 6), selecciona **6 preguntas — 1 al azar de cada uno de los 6 bloques** — y las envía
  en un único lote. Selección aleatoria **estratificada por bloque**, no pura sobre las 36: preserva
  la representación proporcional de los 6 pesos de bloque (5/5/15/20/25/30%) en vez de arriesgarse a
  dejar fuera por completo el bloque de mayor peso.
- `weighting.util.ts`: **sin cambios de código** — `computeAggregatedResult` ya promedia sobre lo que
  haya en cada bloque (nunca asumió exactamente 6 por bloque), así que 1 resultado por bloque pondera
  exactamente igual que 6. Se añade un test que lo confirma explícitamente.
- **MODIFIED** `ai-compatibility-analysis`: la Requirement de orquestación por lotes y la de cálculo
  del agregado pasan de "las 36 preguntas" a "6 preguntas muestreadas, 1 por bloque".
- **MODIFIED** `results-dashboard`: el escenario de detalle expandible pasa de "las 36 preguntas" a
  "las preguntas analizadas" (ya no son 36).
- Cada análisis (inicial o reintento manual) vuelve a muestrear 6 preguntas nuevas al azar — no
  necesariamente las mismas que la vez anterior.

## Impact

- Affected specs: `ai-compatibility-analysis` (MODIFIED), `results-dashboard` (MODIFIED)
- Affected code: `apps/backend/src/ai/ai-orchestrator.service.ts`,
  `apps/backend/src/ai/ai-orchestrator.service.spec.ts`,
  `apps/backend/src/comparisons/weighting.util.spec.ts`,
  `apps/frontend/src/app/features/results-dashboard/results-dashboard.component.spec.ts`
- Sin cambios de esquema de base de datos, sin cambios de API pública (mismas formas de
  `ComparisonQuestionDetail`/`AggregatedResult`, solo menos filas por comparación)
- **Trade-off explícito, no oculto**: el score de compatibilidad ahora se basa en una muestra de 6
  de las 36 respuestas, no en el cuestionario completo — ver `design.md` para las alternativas
  consideradas y por qué se descartó el muestreo puramente aleatorio sin estratificar.
