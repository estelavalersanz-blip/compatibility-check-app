import { z } from 'zod';

/**
 * Cuenta los decimales de un número sin arrastrar el error de coma flotante habitual de
 * `(num % 1).toString()` (p. ej. `7.1 % 1` no da `0.1` exacto en JS).
 */
function decimalPlaces(value: number): number {
  const asString = value.toString();
  const dotIndex = asString.indexOf('.');
  return dotIndex === -1 ? 0 : asString.length - dotIndex - 1;
}

/**
 * Puntuación 1.00–10.00 con como mucho 2 decimales — rango exigido a cada campo numérico devuelto
 * por el LLM (ai-compatibility-analysis spec, "Validación y reintento ante salidas inválidas").
 */
const scoreSchema = z
  .number()
  .min(1)
  .max(10)
  .refine((value) => decimalPlaces(value) <= 2, {
    message: 'El valor no puede tener más de 2 decimales',
  });

/**
 * Resultado de comparar la respuesta de dos usuarios a una misma pregunta — claves exactas del
 * JSON pedido al LLM (design.md, decisión 5d / docs/plan.md): `pregunta, id_usuario_1,
 * respuesta_usuario_1, id_usuario_2, respuesta_usuario_2, compatibilidad, emocional, valores,
 * estilo, intereses, madurez, apertura, explicación`. Es el registro completo tal cual se
 * almacena — el filtrado de las respuestas de usuario para no exponerlas por API ocurre en la capa
 * de aplicación (`GET /comparisons/:id/detail`), no en este tipo.
 */
export const comparisonResultSchema = z
  .object({
    pregunta: z.string().min(1),
    id_usuario_1: z.string().min(1),
    respuesta_usuario_1: z.string().min(1),
    id_usuario_2: z.string().min(1),
    respuesta_usuario_2: z.string().min(1),
    // Informativo por pregunta; no participa en el cálculo del agregado (decisión 6c).
    compatibilidad: scoreSchema,
    emocional: scoreSchema,
    valores: scoreSchema,
    estilo: scoreSchema,
    intereses: scoreSchema,
    madurez: scoreSchema,
    apertura: scoreSchema,
    explicación: z.string().min(1),
  })
  .strict();

export type ComparisonResult = z.infer<typeof comparisonResultSchema>;

/** Las 6 dimensiones ponderadas del cálculo agregado (decisión 6c), en el orden de los pesos. */
export const DIMENSIONS = [
  'emocional',
  'valores',
  'estilo',
  'intereses',
  'madurez',
  'apertura',
] as const;

export type Dimension = (typeof DIMENSIONS)[number];
