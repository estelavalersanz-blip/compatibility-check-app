import { ComparisonResult, comparisonResultSchema } from '@compatibility-check-app/shared-types';

export type ComparisonResultBatch = ComparisonResult[];

type BatchParseResult =
  { success: true; data: ComparisonResultBatch } | { success: false; error: { message: string } };

/**
 * Valida la respuesta cruda de un lote del LLM (design.md, decisión 6): siempre exactamente 6
 * elementos (un lote = 6 preguntas), cada uno con la forma exacta de `ComparisonResult`
 * (`packages/shared-types`, sección 2, ya valida claves exactas y rango 1.00–10.00 con ≤2
 * decimales por campo numérico).
 *
 * Deliberadamente NO se construye envolviendo `comparisonResultSchema` en un `z.array(...)` propio
 * — el monorepo tiene DOS instancias de `zod` distintas (raíz hoisteada a v4 por otra dependencia
 * transitiva; `packages/shared-types` fija `^3.24.1` y por eso npm le anida su propia copia v3).
 * `comparisonResultSchema` se construyó con el `z` de esa copia v3 anidada; un `import { z } from
 * 'zod'` hecho aquí, en `apps/backend`, resolvería la copia v4 de la raíz (no hay ninguna copia
 * propia de zod bajo `apps/backend/node_modules`) — envolverlo con `z.array(...)` de v4 alrededor
 * de un schema construido con v3 rompe en tiempo de ejecución (`Cannot read properties of undefined
 * (reading 'run')`, confirmado al escribir este archivo). En su lugar, solo se llama al método
 * `.safeParse(...)` YA existente del propio objeto `comparisonResultSchema` — nunca se construye un
 * esquema Zod nuevo en el backend, así que nunca hace falta importar `zod` aquí.
 */
export function parseComparisonResultBatch(raw: unknown): BatchParseResult {
  if (!Array.isArray(raw)) {
    return { success: false, error: { message: 'Se esperaba un array de resultados' } };
  }
  if (raw.length !== 6) {
    return {
      success: false,
      error: { message: `Se esperaban exactamente 6 resultados, se recibieron ${raw.length}` },
    };
  }

  const data: ComparisonResultBatch = [];
  for (let index = 0; index < raw.length; index++) {
    const result = comparisonResultSchema.safeParse(raw[index]);
    if (!result.success) {
      return {
        success: false,
        error: { message: `Elemento en la posición ${index} inválido: ${result.error.message}` },
      };
    }
    data.push(result.data);
  }

  return { success: true, data };
}
