import { comparisonResultSchema } from './comparison-result';

function buildValid(overrides: Record<string, unknown> = {}) {
  return {
    pregunta: '¿Cuál es tu recuerdo más preciado?',
    id_usuario_1: 'user-1',
    respuesta_usuario_1: 'Un verano con mi familia.',
    id_usuario_2: 'user-2',
    respuesta_usuario_2: 'El día que adopté a mi perro.',
    compatibilidad: 7.5,
    emocional: 8.25,
    valores: 6.0,
    estilo: 5.5,
    intereses: 9.0,
    madurez: 7.0,
    apertura: 8.0,
    explicación: 'Ambas respuestas reflejan un fuerte apego emocional a momentos compartidos.',
    ...overrides,
  };
}

const dimensionKeys = [
  'compatibilidad',
  'emocional',
  'valores',
  'estilo',
  'intereses',
  'madurez',
  'apertura',
];

describe('comparisonResultSchema', () => {
  it('acepta un resultado válido con las 13 claves exactas del JSON pedido a la IA', () => {
    const result = comparisonResultSchema.safeParse(buildValid());

    expect(result.success).toBe(true);
  });

  it.each([
    'pregunta',
    'id_usuario_1',
    'respuesta_usuario_1',
    'id_usuario_2',
    'respuesta_usuario_2',
    'explicación',
  ])('rechaza si falta la clave de texto "%s"', (key) => {
    const invalid = buildValid();
    delete invalid[key as keyof typeof invalid];

    const result = comparisonResultSchema.safeParse(invalid);

    expect(result.success).toBe(false);
  });

  it.each(dimensionKeys)('rechaza si falta la clave numérica "%s"', (key) => {
    const invalid = buildValid();
    delete invalid[key as keyof typeof invalid];

    const result = comparisonResultSchema.safeParse(invalid);

    expect(result.success).toBe(false);
  });

  it.each(dimensionKeys)('rechaza "%s" por debajo de 1.00', (key) => {
    const invalid = buildValid({ [key]: 0.99 });

    const result = comparisonResultSchema.safeParse(invalid);

    expect(result.success).toBe(false);
  });

  it.each(dimensionKeys)('rechaza "%s" por encima de 10.00', (key) => {
    const invalid = buildValid({ [key]: 10.01 });

    const result = comparisonResultSchema.safeParse(invalid);

    expect(result.success).toBe(false);
  });

  it.each(dimensionKeys)('rechaza "%s" con más de 2 decimales', (key) => {
    const invalid = buildValid({ [key]: 7.256 });

    const result = comparisonResultSchema.safeParse(invalid);

    expect(result.success).toBe(false);
  });

  it.each(dimensionKeys)('acepta "%s" en los límites exactos 1.00 y 10.00', (key) => {
    expect(comparisonResultSchema.safeParse(buildValid({ [key]: 1.0 })).success).toBe(true);
    expect(comparisonResultSchema.safeParse(buildValid({ [key]: 10.0 })).success).toBe(true);
  });

  it('rechaza claves adicionales no contempladas en el esquema', () => {
    const invalid = buildValid({ campo_inventado: 'no debería estar aquí' });

    const result = comparisonResultSchema.safeParse(invalid);

    expect(result.success).toBe(false);
  });
});
