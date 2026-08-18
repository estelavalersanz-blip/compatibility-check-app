import { BadRequestException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { CandidateSelectorService, SelectedCandidate } from '../candidate-selector.service';
import { ComparisonsCreatedEvent } from '../events/comparisons-created.event';
import { RecalculateCompatibilityCommand } from './recalculate-compatibility.command';
import { SupabaseService } from '../../supabase/supabase.service';
import { writableTable } from '../../supabase/writable-table';

interface UserRecalculationRow {
  needs_recalculation: boolean;
}
function asUserRecalculationRow(row: unknown): UserRecalculationRow | null {
  return row as UserRecalculationRow | null;
}

/**
 * Recálculo manual (design.md, decisión 5b) — excepción controlada y acotada a la regla de cálculo
 * único: solo actúa si `users.needs_recalculation = true`, reutiliza `candidate-selector.service.ts`
 * (misma lógica que el alta inicial, sin duplicarla), y nunca se propaga a otros usuarios.
 *
 * Orden importante: elimina las comparaciones anteriores del usuario ANTES de seleccionar las
 * nuevas — `comparisons` tiene `UNIQUE(requester_user_id, candidate_user_id)`, así que si un mismo
 * candidato vuelve a salir elegido, insertarlo mientras la fila vieja todavía existe violaría esa
 * restricción. El `on delete cascade` del esquema (tarea 3.2) limpia sola los resultados por
 * pregunta y el agregado de las comparaciones borradas.
 */
@CommandHandler(RecalculateCompatibilityCommand)
export class RecalculateCompatibilityHandler implements ICommandHandler<
  RecalculateCompatibilityCommand,
  SelectedCandidate[]
> {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly candidateSelectorService: CandidateSelectorService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: RecalculateCompatibilityCommand): Promise<SelectedCandidate[]> {
    const client = this.supabaseService.getClient();

    const { data: userRow, error: userError } = await client
      .from('users')
      .select('needs_recalculation')
      .eq('id', command.userId)
      .maybeSingle();
    if (userError) {
      throw new Error(`No se pudo comprobar el estado de recálculo: ${userError.message}`);
    }
    if (!asUserRecalculationRow(userRow)?.needs_recalculation) {
      throw new BadRequestException('No hay ningún recálculo de compatibilidad pendiente');
    }

    const { error: deleteError } = await client
      .from('comparisons')
      .delete()
      .eq('requester_user_id', command.userId);
    if (deleteError) {
      throw new Error(
        `No se pudieron eliminar las comparaciones anteriores: ${deleteError.message}`,
      );
    }

    const selected = await this.candidateSelectorService.selectCandidates(command.userId);

    const { error: updateError } = await writableTable(client, 'users')
      .update({ needs_recalculation: false })
      .eq('id', command.userId)
      .select('id')
      .single();
    if (updateError) {
      throw new Error(`No se pudo desmarcar el recálculo pendiente: ${updateError.message}`);
    }

    if (selected.length > 0) {
      this.eventBus.publish(new ComparisonsCreatedEvent(selected.map((s) => s.comparisonId)));
    }

    return selected;
  }
}
