import { SupabaseClient } from '@supabase/supabase-js';

export interface AnswerSetLike {
  questionId: number;
  question: string;
  answer: string;
}

export interface CreateTestQuestionnaireOptions {
  userId: string;
  answers: AnswerSetLike[];
  completed?: boolean;
}

/**
 * Inserta un cuestionario de test para un usuario ya existente.
 *
 * ⚠️ Columnas provisionales: `design.md` (decisión 3.2) fija el nombre de la tabla `questionnaires`
 * y confirma que existe `users.questionnaire_completed_at`, pero no detalla aún las columnas
 * propias de `questionnaires` — ajusta `user_id`/`answers`/`completed_at` si la migración de la
 * tarea 3.2 las nombra de otra forma.
 */
export async function createTestQuestionnaire(
  supabaseAdmin: SupabaseClient,
  options: CreateTestQuestionnaireOptions,
): Promise<{ id: string }> {
  const { data, error } = await supabaseAdmin
    .from('questionnaires')
    .insert({
      user_id: options.userId,
      answers: options.answers,
      completed_at: options.completed === false ? null : new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(
      `No se pudo crear el cuestionario de test para "${options.userId}": ${error.message}`,
    );
  }

  return data;
}
