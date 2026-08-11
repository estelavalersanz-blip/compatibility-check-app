import { SupabaseClient } from '@supabase/supabase-js';

export interface AnswerSetLike {
  questionId: number;
  question: string;
  answer: string;
}

export interface CreateTestQuestionnaireOptions {
  userId: string;
  answers: AnswerSetLike[];
  /**
   * Por defecto `true`: además de guardar `answers`, marca `users.questionnaire_completed_at`
   * (fuente única de "cuestionario completo", ver `supabase/migrations/0001_init.sql`) — pasa
   * `false` para simular un borrador parcial sin completar.
   */
  completed?: boolean;
}

/**
 * Inserta un cuestionario de test (borrador o completo) para un usuario ya existente.
 */
export async function createTestQuestionnaire(
  supabaseAdmin: SupabaseClient,
  options: CreateTestQuestionnaireOptions,
): Promise<{ id: string }> {
  const { data, error } = await supabaseAdmin
    .from('questionnaires')
    .insert({ user_id: options.userId, answers: options.answers })
    .select('id')
    .single();

  if (error) {
    throw new Error(
      `No se pudo crear el cuestionario de test para "${options.userId}": ${error.message}`,
    );
  }

  if (options.completed !== false) {
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ questionnaire_completed_at: new Date().toISOString() })
      .eq('id', options.userId);

    if (updateError) {
      throw new Error(
        `No se pudo marcar el cuestionario como completado para "${options.userId}": ${updateError.message}`,
      );
    }
  }

  return data;
}
