import { ConflictException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Answer } from '@compatibility-check-app/shared-types';
import { CompleteQuestionnaireCommand } from './complete-questionnaire.command';
import { parseCompleteAnswerSet } from '../answer-set.validation';
import { QuestionnaireCompletedEvent } from '../events/questionnaire-completed.event';
import { SupabaseService } from '../../supabase/supabase.service';
import { writableTable } from '../../supabase/writable-table';

/** Forma mínima que este handler necesita leer de `users` — no el `UserRow` completo de `users/`. */
interface UserCompletionRow {
  questionnaire_completed_at: string | null;
}

/** Mismo patrón que `asUserRow` (`user-profile.mapper.ts`): el `as` vive en un `return`, nunca en
 *  una asignación local, para que `eslint --fix` no lo detecte como "innecesario" y lo elimine. */
function asUserCompletionRow(row: unknown): UserCompletionRow | null {
  return row as UserCompletionRow | null;
}

/**
 * Envío final del cuestionario (design.md, decisiones 5 y 6b): valida las 36 respuestas, rechaza si
 * el usuario ya lo había completado antes por este mismo canal (personal-questionnaire spec,
 * "Reenvío de un cuestionario ya completado"), persiste y publica `QuestionnaireCompletedEvent` —
 * sin importar ni invocar nada del futuro módulo `matching` (sección 8): ese desacoplamiento no es
 * una promesa en un comentario, es un hecho verificable en la lista de imports de este archivo.
 */
@CommandHandler(CompleteQuestionnaireCommand)
export class CompleteQuestionnaireHandler implements ICommandHandler<
  CompleteQuestionnaireCommand,
  Answer[]
> {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CompleteQuestionnaireCommand): Promise<Answer[]> {
    const answers = parseCompleteAnswerSet(command.answers);
    const client = this.supabaseService.getClient();

    const { data: userRow, error: userError } = await client
      .from('users')
      .select('questionnaire_completed_at')
      .eq('id', command.userId)
      .maybeSingle();
    if (userError) {
      throw new Error(`No se pudo comprobar el estado del cuestionario: ${userError.message}`);
    }
    if (asUserCompletionRow(userRow)?.questionnaire_completed_at) {
      throw new ConflictException(
        'Ya completaste tu cuestionario; edítalo desde tu página de perfil',
      );
    }

    // `upsert` en vez de `insert`: si el usuario ya autoguardó un borrador parcial (`PUT
    // .../draft`, tarea 7.8), la fila de `questionnaires` ya existe — un `insert` chocaría con
    // `UNIQUE(user_id)` aunque el cuestionario nunca se hubiera completado antes.
    const { error: questionnaireError } = await writableTable(client, 'questionnaires')
      .upsert({ user_id: command.userId, answers }, { onConflict: 'user_id' })
      .select('id')
      .single();
    if (questionnaireError) {
      throw new Error(`No se pudo guardar el cuestionario: ${questionnaireError.message}`);
    }

    const { error: completeError } = await writableTable(client, 'users')
      .update({ questionnaire_completed_at: new Date().toISOString() })
      .eq('id', command.userId)
      .select('id')
      .single();
    if (completeError) {
      throw new Error(
        `No se pudo marcar el cuestionario como completado: ${completeError.message}`,
      );
    }

    this.eventBus.publish(new QuestionnaireCompletedEvent(command.userId));

    return answers;
  }
}
