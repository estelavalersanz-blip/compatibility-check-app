# Resiliencia ante el límite de tasa de Groq (`openai/gpt-oss-120b`)

## Why

Reportado en producción (2026-08-19, verificación en vivo del fix de navegación tras completar el
cuestionario): las 3 comparaciones creadas para una cuenta de prueba real terminaron en
`status = 'error'` ("No se pudo completar este análisis").

Investigado reproduciendo la llamada real a Groq con los mismos datos que habían fallado
(`apps/backend/src/ai/groq.provider.ts`, mismo modelo/shape de petición): la causa no es un problema
de formato — cuando la llamada tiene éxito, el JSON devuelto es siempre válido. La causa es un **429
por límite de tasa**: `openai/gpt-oss-120b` en el plan gratuito de Groq está limitado a **8.000
tokens/minuto**, y el modelo gasta de media ~1.000-1.300 tokens ocultos "razonando"
(`usage.reasoning_tokens`) antes de cada respuesta — una sola comparación (6 lotes) puede agotar ese
límite ella sola, y completar el cuestionario crea hasta 3 comparaciones de golpe. El backoff actual
entre reintentos (50/150ms) es muchísimo más corto que el margen real que Groq pide tras un 429
(20-30s observados: "Please try again in 26.1s"), así que los 3 reintentos se agotan casi al instante
contra el mismo límite, y la comparación queda en `error` para siempre.

Probado a mano contra la API real: `reasoning_effort: 'low'` (parámetro real y documentado de Groq
para este modelo) reduce esos tokens ocultos de ~1.300 a ~20, sin pérdida apreciable de calidad de
puntuación ni de explicación (comparado con los mismos datos, `low` vs `medium` — el valor por
defecto que se estaba usando implícitamente al no fijar nada).

## What Changes

- `groq.provider.ts` envía `reasoning_effort: 'low'` en cada petición — ~38% menos tokens totales por
  lote en la comparación real hecha, misma calidad observada.
- `ai-orchestrator.service.ts`: el backoff entre reintentos pasa de un valor fijo de 50/150ms a un
  valor inyectado (`AI_RETRY_BACKOFF_MS`) — 10s/25s en producción (`ai.module.ts`), manteniendo un
  valor ínfimo por defecto solo para los tests que construyen la clase directamente.
- **MODIFIED** `ai-compatibility-analysis`: nueva Requirement "Uso eficiente de tokens y resiliencia
  ante límites de tasa del proveedor".
- Fuera de alcance de este change (investigado pero no decidido todavía, ver `design.md`): activar
  OpenRouter como proveedor alternativo (el código ya existe, pero su API key está sin configurar) y
  pasar Groq a un plan de pago — ambas opciones quedaron sobre la mesa, pendientes de decisión.

## Impact

- Affected specs: `ai-compatibility-analysis` (MODIFIED)
- Affected code: `apps/backend/src/ai/groq.provider.ts`, `apps/backend/src/ai/ai-orchestrator.service.ts`,
  `apps/backend/src/ai/ai.module.ts`, y sus tests (`groq.provider.spec.ts`,
  `ai-orchestrator.service.spec.ts`)
- Sin cambios de esquema de base de datos, sin cambios de API pública
