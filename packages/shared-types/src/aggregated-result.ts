import type { Dimension } from './comparison-result';

/**
 * Pesos usados en el cálculo ponderado compuesto de una comparación (design.md, decisión 6c),
 * persistidos junto al resultado agregado para que el cálculo quede auditable.
 */
export interface AggregatedWeights {
  /** Peso de cada una de las 6 dimensiones sobre `compatibilidad_final` (20/25/10/25/10/10%). */
  dimension: Record<Dimension, number>;
  /**
   * Peso de cada uno de los 6 bloques de preguntas (1–6, 7–12, ..., 31–36) dentro de la media de
   * cada dimensión (5/5/15/20/25/30%), en orden de bloque.
   */
  block: [number, number, number, number, number, number];
}

/**
 * Resultado agregado de una comparación completada: la media ya ponderada por bloques de cada una
 * de las 6 dimensiones, y `compatibilidad_final` combinando esas 6 medias con los pesos por
 * dimensión (design.md, decisión 6c).
 */
export interface AggregatedResult {
  emocional: number;
  valores: number;
  estilo: number;
  intereses: number;
  madurez: number;
  apertura: number;
  compatibilidad_final: number;
  weights: AggregatedWeights;
}
