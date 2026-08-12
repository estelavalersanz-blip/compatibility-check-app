import {
  AggregatedResult,
  ComparisonResult,
  Dimension,
  DIMENSIONS,
} from '@compatibility-check-app/shared-types';

/**
 * Ponderación compuesta (design.md, decisión 6c): función pura, sin acceso a datos — recibe los 36
 * resultados por pregunta ya calculados y devuelve el `AggregatedResult` a persistir. Adelantada
 * desde la sección 10 (tareas 10.1/10.2) porque `ai-orchestrator.service.ts` (sección 9) la necesita
 * para poder marcar una comparación como `completed` de verdad — sin ella, "completar el análisis"
 * quedaría a medias (36 resultados por pregunta sin ningún agregado que mostrar en el dashboard).
 */

/** `ComparisonResult` no incluye `questionId` (shared-types, decisión de diseño deliberada) — ese
 *  vínculo vive en la fila de BD, así que aquí se pasa emparejado explícitamente. */
export interface QuestionResultPair {
  questionId: number;
  result: ComparisonResult;
}

/** Bloques 1–6 (preguntas 1–6, 7–12, ..., 31–36) — mismo agrupamiento que los lotes de IA (decisión 6). */
export const BLOCK_WEIGHTS: [number, number, number, number, number, number] = [
  0.05, 0.05, 0.15, 0.2, 0.25, 0.3,
];

/** Pesos por dimensión sobre `compatibilidad_final` (design.md, decisión 6c). */
export const DIMENSION_WEIGHTS: Record<Dimension, number> = {
  emocional: 0.2,
  valores: 0.25,
  estilo: 0.1,
  intereses: 0.25,
  madurez: 0.1,
  apertura: 0.1,
};

/** `questionId` 1-36 → índice de bloque 0-5. */
export function blockIndexOf(questionId: number): number {
  return Math.floor((questionId - 1) / 6);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Media de una dimensión ponderada por bloque: la media simple de las 6 preguntas de cada bloque,
 * combinada con `BLOCK_WEIGHTS` — nunca una media simple directa sobre las 36 preguntas.
 */
function weightedDimensionMean(pairs: QuestionResultPair[], dimension: Dimension): number {
  const blockAverages = BLOCK_WEIGHTS.map((_, block) => {
    const inBlock = pairs.filter((pair) => blockIndexOf(pair.questionId) === block);
    return average(inBlock.map((pair) => pair.result[dimension]));
  });

  const weightedSum = blockAverages.reduce(
    (sum, blockAverage, block) => sum + blockAverage * BLOCK_WEIGHTS[block],
    0,
  );
  return round2(weightedSum);
}

/**
 * Calcula el `AggregatedResult` completo de una comparación a partir de sus 36 resultados por
 * pregunta ya validados. `compatibilidad` (campo informativo por pregunta) nunca participa aquí.
 */
export function computeAggregatedResult(pairs: QuestionResultPair[]): AggregatedResult {
  const dimensionMeans = {} as Record<Dimension, number>;
  for (const dimension of DIMENSIONS) {
    dimensionMeans[dimension] = weightedDimensionMean(pairs, dimension);
  }

  const compatibilidadFinal = round2(
    DIMENSIONS.reduce(
      (sum, dimension) => sum + dimensionMeans[dimension] * DIMENSION_WEIGHTS[dimension],
      0,
    ),
  );

  return {
    ...dimensionMeans,
    compatibilidad_final: compatibilidadFinal,
    weights: { dimension: DIMENSION_WEIGHTS, block: BLOCK_WEIGHTS },
  };
}
