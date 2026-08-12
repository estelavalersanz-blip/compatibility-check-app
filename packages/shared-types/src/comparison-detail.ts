/**
 * Una fila de `GET /comparisons/:id/detail` — mismas claves que `ComparisonResult`
 * (`comparison-result.ts`) salvo `id_usuario_1`/`respuesta_usuario_1`/`id_usuario_2`/
 * `respuesta_usuario_2`, que se filtran deliberadamente antes de responder (design.md, decisión
 * 5d): las respuestas de texto de ningún usuario, ni siquiera la propia, se expone por esta vía.
 * `questionId` no vive en `ComparisonResult` (esa columna es de la fila de BD, no del JSON del
 * LLM) — aquí sí se incluye, es lo que permite ordenar/identificar cada fila del detalle.
 */
export interface ComparisonQuestionDetail {
  questionId: number;
  pregunta: string;
  compatibilidad: number;
  emocional: number;
  valores: number;
  estilo: number;
  intereses: number;
  madurez: number;
  apertura: number;
  explicación: string;
}
