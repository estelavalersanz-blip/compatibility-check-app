import { BadRequestException, Injectable } from '@nestjs/common';
import { Answer } from '@compatibility-check-app/shared-types';
import { SupabaseService } from '../supabase/supabase.service';
import { writableTable } from '../supabase/writable-table';
import { parseCompleteAnswerSet, parseDraftAnswerSet } from './answer-set.validation';

interface UserCompletionRow {
  questionnaire_completed_at: string | null;
}
function asUserCompletionRow(row: unknown): UserCompletionRow | null {
  return row as UserCompletionRow | null;
}

interface QuestionnaireAnswersRow {
  answers: Answer[];
}
function asQuestionnaireAnswersRow(row: unknown): QuestionnaireAnswersRow | null {
  return row as QuestionnaireAnswersRow | null;
}

/**
 * Servicio normal, sin Command (design.md, decisión 5c/6b): a diferencia del envío inicial
 * (`CompleteQuestionnaireCommand`, que publica `QuestionnaireCompletedEvent`), la edición no tiene
 * ningún efecto de dominio que otro módulo necesite escuchar aquí — el recálculo sigue siendo la
 * acción explícita aparte (`RecalculateCompatibilityCommand`, sección 8), igual que
 * `UsersService.updateProfile` tampoco es un Command.
 */
@Injectable()
export class QuestionnairesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Edición desde el perfil (personal-questionnaire spec, "Edición del cuestionario ya
   * completado"): exige que el usuario ya hubiera completado el cuestionario antes — un borrador
   * guardado no basta — y marca `needs_recalculation` para el flujo de recálculo de la sección 8.
   */
  async replaceAnswers(userId: string, rawAnswers: unknown): Promise<Answer[]> {
    const answers = parseCompleteAnswerSet(rawAnswers);
    const client = this.supabaseService.getClient();

    const { data: userRow, error: userError } = await client
      .from('users')
      .select('questionnaire_completed_at')
      .eq('id', userId)
      .maybeSingle();
    if (userError) {
      throw new Error(`No se pudo comprobar el estado del cuestionario: ${userError.message}`);
    }
    if (!asUserCompletionRow(userRow)?.questionnaire_completed_at) {
      throw new BadRequestException(
        'Todavía no has completado tu cuestionario; envíalo antes de poder editarlo',
      );
    }

    const { error: updateError } = await writableTable(client, 'questionnaires')
      .update({ answers })
      .eq('user_id', userId)
      .select('id')
      .single();
    if (updateError) {
      throw new Error(`No se pudo actualizar el cuestionario: ${updateError.message}`);
    }

    const { error: recalculationError } = await writableTable(client, 'users')
      .update({ needs_recalculation: true })
      .eq('id', userId)
      .select('id')
      .single();
    if (recalculationError) {
      throw new Error(`No se pudo marcar el perfil para recalcular: ${recalculationError.message}`);
    }

    return answers;
  }

  /**
   * Borrador (design.md, decisión 5c): entre 0 y 36 respuestas en cualquier momento, sin exigir el
   * conjunto completo — nunca toca `questionnaire_completed_at` ni `needs_recalculation`. `upsert`
   * evita decidir a mano entre `insert`/`update` según exista ya una fila previa (borrador anterior
   * o incluso el cuestionario ya completo, si el modo edición también autoguarda por bloque).
   */
  async saveDraft(userId: string, rawAnswers: unknown): Promise<Answer[]> {
    const answers = parseDraftAnswerSet(rawAnswers);
    const client = this.supabaseService.getClient();

    const { error } = await writableTable(client, 'questionnaires')
      .upsert({ user_id: userId, answers }, { onConflict: 'user_id' })
      .select('id')
      .single();
    if (error) {
      throw new Error(`No se pudo guardar el borrador: ${error.message}`);
    }

    return answers;
  }

  /**
   * `[]` si el usuario todavía no ha guardado ningún borrador ni cuestionario — nunca lanza 404: a
   * diferencia de `GET /users/me`, un cuestionario vacío es un estado normal, no "recurso ausente".
   */
  async findAnswers(userId: string): Promise<Answer[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('questionnaires')
      .select('answers')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      throw new Error(`No se pudo consultar el cuestionario: ${error.message}`);
    }

    return asQuestionnaireAnswersRow(data)?.answers ?? [];
  }
}
