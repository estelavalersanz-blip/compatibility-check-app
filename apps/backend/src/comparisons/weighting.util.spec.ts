import { ComparisonResult, Dimension, DIMENSIONS } from '@compatibility-check-app/shared-types';
import {
  blockIndexOf,
  BLOCK_WEIGHTS,
  computeAggregatedResult,
  DIMENSION_WEIGHTS,
  QuestionResultPair,
} from './weighting.util';

function buildResult(overrides: Partial<Record<Dimension, number>> = {}): ComparisonResult {
  return {
    pregunta: 'pregunta',
    id_usuario_1: 'user-1',
    respuesta_usuario_1: 'respuesta 1',
    id_usuario_2: 'user-2',
    respuesta_usuario_2: 'respuesta 2',
    compatibilidad: 5,
    emocional: 5,
    valores: 5,
    estilo: 5,
    intereses: 5,
    madurez: 5,
    apertura: 5,
    explicación: 'explicación',
    ...overrides,
  };
}

function buildPairs(
  scoreForQuestion: (questionId: number) => Partial<Record<Dimension, number>>,
): QuestionResultPair[] {
  return Array.from({ length: 36 }, (_, i) => {
    const questionId = i + 1;
    return { questionId, result: buildResult(scoreForQuestion(questionId)) };
  });
}

describe('blockIndexOf', () => {
  it('mapea questionId 1-36 al índice de bloque 0-5 correspondiente', () => {
    expect(blockIndexOf(1)).toBe(0);
    expect(blockIndexOf(6)).toBe(0);
    expect(blockIndexOf(7)).toBe(1);
    expect(blockIndexOf(12)).toBe(1);
    expect(blockIndexOf(13)).toBe(2);
    expect(blockIndexOf(18)).toBe(2);
    expect(blockIndexOf(19)).toBe(3);
    expect(blockIndexOf(24)).toBe(3);
    expect(blockIndexOf(25)).toBe(4);
    expect(blockIndexOf(30)).toBe(4);
    expect(blockIndexOf(31)).toBe(5);
    expect(blockIndexOf(36)).toBe(5);
  });
});

describe('computeAggregatedResult', () => {
  it('con la misma puntuación en las 36 preguntas, cada dimensión y el final son esa misma puntuación', () => {
    const pairs = buildPairs(() => ({}));

    const result = computeAggregatedResult(pairs);

    for (const dimension of DIMENSIONS) {
      expect(result[dimension]).toBe(5);
    }
    expect(result.compatibilidad_final).toBe(5);
  });

  it('pondera por bloque (5/5/15/20/25/30%) antes de combinar por dimensión, con datos de prueba conocidos', () => {
    const perBlockScore = [2, 4, 6, 8, 9, 10];
    const pairs = buildPairs((questionId) => {
      const value = perBlockScore[blockIndexOf(questionId)];
      return {
        emocional: value,
        valores: value,
        estilo: value,
        intereses: value,
        madurez: value,
        apertura: value,
      };
    });

    const result = computeAggregatedResult(pairs);

    // 2*.05 + 4*.05 + 6*.15 + 8*.20 + 9*.25 + 10*.30 = 8.05, igual en las 6 dimensiones porque
    // todas comparten el mismo patrón por bloque en este caso de prueba.
    for (const dimension of DIMENSIONS) {
      expect(result[dimension]).toBe(8.05);
    }
    // Los pesos por dimensión suman 1.00, así que el final coincide con la media común.
    expect(result.compatibilidad_final).toBe(8.05);
  });

  it('maneja correctamente los valores en los límites 1.00 y 10.00', () => {
    const pairs = buildPairs((questionId) => {
      const block = blockIndexOf(questionId);
      const emocional = block <= 2 ? 1 : 10; // bloques 1-3 en el mínimo, 4-6 en el máximo
      return { emocional };
    });

    const result = computeAggregatedResult(pairs);

    // emocional: 1*(0.05+0.05+0.15) + 10*(0.20+0.25+0.30) = 1*0.25 + 10*0.75 = 7.75
    expect(result.emocional).toBe(7.75);
    // El resto de dimensiones quedan en 5 (valor por defecto de buildResult) — final:
    // 7.75*0.20 + 5*(0.25+0.10+0.25+0.10+0.10) = 1.55 + 4.00 = 5.55
    expect(result.compatibilidad_final).toBe(5.55);
  });

  it('redondea tanto las medias por dimensión como compatibilidad_final a 2 decimales', () => {
    const pairs = buildPairs((questionId) => {
      const value = blockIndexOf(questionId) % 2 === 0 ? 3.333 : 7.777;
      return { emocional: value };
    });

    const result = computeAggregatedResult(pairs);

    expect(Number.isInteger(result.emocional * 100)).toBe(true);
    expect(Number.isInteger(result.compatibilidad_final * 100)).toBe(true);
  });

  /**
   * `ai-orchestrator.service.ts` ya no envía las 36 preguntas a la IA, solo 6 (1 al azar por
   * bloque, `selectSampledQuestionIds` — bug real de límite de tokens/minuto del proveedor,
   * 2026-08-19): `computeAggregatedResult` recibe entonces 6 `QuestionResultPair`, no 36. No hace
   * falta ningún cambio de código para esto — `weightedDimensionMean` ya promedia sobre lo que
   * haya en cada bloque (`average(inBlock...)`), y con 1 solo elemento la media es ese mismo valor
   * — pero conviene un test explícito que lo confirme y proteja, en vez de asumirlo solo por
   * lectura del código.
   */
  it('con 1 solo resultado por bloque (6 en total, no 36), pondera igual que con los 6 completos', () => {
    const perBlockScore = [2, 4, 6, 8, 9, 10];
    // Un único QuestionResultPair por bloque — el primero de cada uno (questionId 1, 7, 13...),
    // igual que si `selectSampledQuestionIds` hubiera elegido siempre esa pregunta.
    const onePerBlock: QuestionResultPair[] = perBlockScore.map((value, block) => ({
      questionId: block * 6 + 1,
      result: buildResult({
        emocional: value,
        valores: value,
        estilo: value,
        intereses: value,
        madurez: value,
        apertura: value,
      }),
    }));

    const result = computeAggregatedResult(onePerBlock);

    // Mismo cálculo exacto que el test de arriba con los 6 completos por bloque (2*.05 + 4*.05 +
    // 6*.15 + 8*.20 + 9*.25 + 10*.30 = 8.05) — la ponderación por bloque no depende de cuántas
    // preguntas representen a cada bloque, solo de su valor.
    for (const dimension of DIMENSIONS) {
      expect(result[dimension]).toBe(8.05);
    }
    expect(result.compatibilidad_final).toBe(8.05);
  });

  it('persiste ambos vectores de pesos exactos usados en el cálculo', () => {
    const pairs = buildPairs(() => ({}));

    const result = computeAggregatedResult(pairs);

    expect(result.weights.dimension).toEqual(DIMENSION_WEIGHTS);
    expect(result.weights.block).toEqual(BLOCK_WEIGHTS);
  });

  it('el campo informativo "compatibilidad" por pregunta nunca participa en el cálculo', () => {
    const withLowCompatibilidad = buildPairs(() => ({}));
    const withHighCompatibilidad = withLowCompatibilidad.map((pair) => ({
      ...pair,
      result: { ...pair.result, compatibilidad: 1 },
    }));

    const resultLow = computeAggregatedResult(withLowCompatibilidad);
    const resultHigh = computeAggregatedResult(withHighCompatibilidad);

    expect(resultLow).toEqual(resultHigh);
  });
});
