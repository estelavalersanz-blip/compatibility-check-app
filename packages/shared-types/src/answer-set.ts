import { z } from 'zod';

/**
 * Una respuesta individual del cuestionario de compatibilidad (personal-questionnaire spec,
 * "Persistencia en estructura JSON prefijada").
 */
export const answerSchema = z.object({
  questionId: z.number().int().positive(),
  question: z.string().min(1),
  answer: z.string().min(1),
});

export type Answer = z.infer<typeof answerSchema>;

/**
 * El cuestionario completo: exactamente 36 respuestas, ni más ni menos (personal-questionnaire
 * spec, "Cumplimentación del cuestionario de las 36 preguntas de compatibilidad").
 */
export const answerSetSchema = z.array(answerSchema).length(36);

export type AnswerSet = z.infer<typeof answerSetSchema>;
