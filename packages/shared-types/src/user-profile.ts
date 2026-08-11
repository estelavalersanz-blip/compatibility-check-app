/**
 * Perfil de usuario expuesto por la API y consumido por el frontend — no confundir con la
 * identidad de Supabase Auth (`auth.users`), de la que `id` es una foreign key 1:1 (design.md,
 * decisión 3c). Nunca incluye las 5 cualidades ni las respuestas del cuestionario aquí: viven en
 * sus propios tipos (`Quality`, `AnswerSet`).
 */
export interface UserProfile {
  id: string;
  name: string;
  alias: string;
  photoUrl: string | null;
  questionnaireCompletedAt: string | null;
}
