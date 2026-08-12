import { parseComparisonResultBatch } from './comparison-result.schema';

function buildValidItem(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    pregunta: '¿Pregunta?',
    id_usuario_1: 'user-1',
    respuesta_usuario_1: 'Respuesta 1',
    id_usuario_2: 'user-2',
    respuesta_usuario_2: 'Respuesta 2',
    compatibilidad: 7.5,
    emocional: 7.5,
    valores: 7.5,
    estilo: 7.5,
    intereses: 7.5,
    madurez: 7.5,
    apertura: 7.5,
    explicación: 'Justificación breve.',
    ...overrides,
  };
}

function buildValidBatch(
  overrides: Partial<Record<string, unknown>>[] = [],
): Record<string, unknown>[] {
  return Array.from({ length: 6 }, (_, i) => buildValidItem(overrides[i]));
}

describe('parseComparisonResultBatch', () => {
  it('acepta un array válido de 6 resultados (un lote completo)', () => {
    const result = parseComparisonResultBatch(buildValidBatch());

    expect(result.success).toBe(true);
  });

  it('rechaza un array con menos de 6 elementos', () => {
    const result = parseComparisonResultBatch(buildValidBatch().slice(0, 5));

    expect(result.success).toBe(false);
  });

  it('rechaza un array con más de 6 elementos', () => {
    const result = parseComparisonResultBatch([...buildValidBatch(), buildValidItem()]);

    expect(result.success).toBe(false);
  });

  it('rechaza un elemento al que le falta una clave', () => {
    const batch = buildValidBatch();
    delete (batch[2] as Partial<Record<string, unknown>>).explicación;

    const result = parseComparisonResultBatch(batch);

    expect(result.success).toBe(false);
  });

  it('rechaza un elemento con una clave adicional no esperada', () => {
    const batch = buildValidBatch([{}, {}, { claveExtra: 'no debería estar aquí' }]);

    const result = parseComparisonResultBatch(batch);

    expect(result.success).toBe(false);
  });

  it('rechaza un valor numérico fuera de rango (> 10.00)', () => {
    const batch = buildValidBatch([{}, { emocional: 10.5 }]);

    const result = parseComparisonResultBatch(batch);

    expect(result.success).toBe(false);
  });

  it('rechaza un valor numérico fuera de rango (< 1.00)', () => {
    const batch = buildValidBatch([{ valores: 0.5 }]);

    const result = parseComparisonResultBatch(batch);

    expect(result.success).toBe(false);
  });

  it('rechaza un valor numérico con más de 2 decimales', () => {
    const batch = buildValidBatch([{}, {}, {}, { compatibilidad: 7.123 }]);

    const result = parseComparisonResultBatch(batch);

    expect(result.success).toBe(false);
  });

  it('acepta valores en los límites exactos 1.00 y 10.00', () => {
    const batch = buildValidBatch([{ emocional: 1 }, { apertura: 10 }]);

    const result = parseComparisonResultBatch(batch);

    expect(result.success).toBe(true);
  });
});
