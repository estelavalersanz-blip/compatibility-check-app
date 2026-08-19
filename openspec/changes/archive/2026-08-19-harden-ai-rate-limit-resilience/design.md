# Design: Resiliencia ante el límite de tasa de Groq

## Decisión 1: `reasoning_effort: 'low'`, no cambiar de modelo ni de proveedor todavía

Groq soporta `reasoning_effort` (`'low' | 'medium' | 'high'`, por defecto `'medium'`) para
`openai/gpt-oss-120b`. Probado a mano con los mismos datos reales que habían fallado en producción:

| | `reasoning_tokens` | tokens totales/lote | Calidad observada |
|---|---|---|---|
| `medium` (implícito, sin fijar nada) | ~1.050-1.300 | ~3.400 | Buena |
| `low` | ~20-25 | ~2.100 | Igual de buena, explicaciones algo más concisas |

**Alternativas consideradas:**

- **Cambiar de modelo dentro de Groq.** Rechazado por ahora: no hay evidencia de que otro modelo
  disponible sea mejor para esta tarea concreta (comparación de texto en español + puntuación
  numérica), y cambiar de modelo sin necesidad añade una variable más a una investigación que ya
  tiene una causa raíz clara y un fix barato.
- **Activar OpenRouter (`OpenRouterProvider`, ya implementado) como proveedor activo.** Investigado
  pero no decidido: su `OPENROUTER_API_KEY` está vacía en `.env`, así que no se pudo probar de verdad
  contra la API real. Queda como opción futura si `reasoning_effort: 'low'` + backoff realista no
  bastara en la práctica — decisión explícitamente aplazada, no descartada.
- **Pasar Groq a un plan de pago.** Según el pricing publicado ($0.15/$0.60 por millón de tokens
  entrada/salida), un análisis completo de 3 comparaciones costaría unos pocos céntimos — pero
  requiere que la usuaria añada un método de pago a su cuenta de Groq, decisión suya, no de este
  change.

## Decisión 2: Backoff inyectado (`AI_RETRY_BACKOFF_MS`), no un valor fijo más alto

El backoff real (10s/25s en producción) se inyecta vía token (mismo patrón que `AI_PROVIDER`) en vez
de subir directamente la constante `BACKOFF_MS` que ya existía.

**Alternativas consideradas:**

- **Subir el valor de la constante directamente**, sin token de inyección. Rechazado: los tests de
  `ai-orchestrator.service.spec.ts` ejercitan de verdad la ruta de reintento con `sleep()` real (sin
  fake timers) — con un backoff de producción de 10s/25s, cada test que fuerza un reintento tardaría
  ese tiempo de verdad, haciendo la suite lenta sin motivo (el propio código ya advertía de esto en su
  comentario original). Inyectar el valor permite que los tests seguir usando un valor ínfimo por
  defecto sin tocar ni un solo test existente, y probar el valor real de producción como una simple
  comprobación de valor (`PRODUCTION_RETRY_BACKOFF_MS`), sin temporizadores reales de por medio.
- **Backoff específico solo para 429, corto para el resto de errores** (parsear el código de estado
  desde el mensaje de error que ya propaga `groq.provider.ts`). Rechazado por ahora: `AiProvider` es
  deliberadamente agnóstico de proveedor/HTTP (design.md original, decisión 4 — "el orquestador no
  debe depender de un SDK o cliente HTTP concreto"); distinguir el motivo exacto del fallo dentro del
  orquestador acoplaría esa capa a semántica HTTP de un proveedor concreto. Un backoff uniforme más
  largo es una pérdida de tiempo aceptable (la pantalla de `features/processing` ya tiene su propio
  spinner y sondeo, nadie espera esto de forma síncrona) a cambio de mantener la interfaz limpia.
