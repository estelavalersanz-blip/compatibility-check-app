# Tasks: Resiliencia ante el límite de tasa de Groq

## 1. Investigación

- [x] 1.1 Reproducir en vivo la llamada real a Groq con los datos exactos que fallaron en producción
      (script de un solo uso, fuera del repo) — confirmado 429 real, no un problema de formato
- [x] 1.2 Confirmar `reasoning_effort` como parámetro real y soportado (GroqDocs) y medir su impacto
      en tokens y calidad con los mismos datos reales (`low` vs `medium`)
- [x] 1.3 Probar el proveedor `OpenRouterProvider` ya existente — bloqueado: `OPENROUTER_API_KEY`
      vacía en `.env`, sin poder verificar de verdad; queda como opción futura (ver `design.md`)

## 2. Implementación (TDD)

- [x] 2.1 Test primero en `groq.provider.spec.ts`: la petición incluye `reasoning_effort: 'low'`
      (confirmado en rojo antes de tocar `groq.provider.ts`)
- [x] 2.2 `groq.provider.ts`: `reasoning_effort: 'low'` en el body de la petición
- [x] 2.3 `ai-orchestrator.service.ts`: token de inyección `AI_RETRY_BACKOFF_MS` +
      `PRODUCTION_RETRY_BACKOFF_MS` (10s/25s), valor ínfimo por defecto solo para tests directos
- [x] 2.4 `ai.module.ts`: vincula `AI_RETRY_BACKOFF_MS` a `PRODUCTION_RETRY_BACKOFF_MS`
- [x] 2.5 Tests nuevos en `ai-orchestrator.service.spec.ts`: el backoff inyectado se usa de verdad
      (sin temporizadores reales de producción) + `PRODUCTION_RETRY_BACKOFF_MS` tiene el valor
      esperado
- [x] 2.6 Suite completa del backend (unit 80/80, `src/ai` 34/34), `test:e2e` (83/83), `nest build` y
      lint sin errores

## 3. Documentación

- [x] 3.1 `proposal.md` + `design.md` (2 decisiones con alternativas: `reasoning_effort` vs. cambiar
      de modelo/proveedor; backoff inyectado vs. constante fija o backoff específico por código HTTP)
- [x] 3.2 `specs/ai-compatibility-analysis/spec.md` (delta): nueva Requirement "Uso eficiente de
      tokens y resiliencia ante límites de tasa del proveedor"
