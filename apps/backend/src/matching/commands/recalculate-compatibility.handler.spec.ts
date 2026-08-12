import { BadRequestException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { CandidateSelectorService, SelectedCandidate } from '../candidate-selector.service';
import { ComparisonsCreatedEvent } from '../events/comparisons-created.event';
import { SupabaseService } from '../../supabase/supabase.service';
import { RecalculateCompatibilityCommand } from './recalculate-compatibility.command';
import { RecalculateCompatibilityHandler } from './recalculate-compatibility.handler';

interface BuildOptions {
  needsRecalculation: boolean;
  selectedCandidates?: SelectedCandidate[];
}

function buildHandler(options: BuildOptions): {
  handler: RecalculateCompatibilityHandler;
  eventBus: { publish: jest.Mock };
  selectCandidates: jest.Mock;
  deleteEq: jest.Mock;
  userUpdateSingle: jest.Mock;
} {
  const selectCandidates = jest.fn().mockResolvedValue(options.selectedCandidates ?? []);
  const deleteEq = jest.fn().mockResolvedValue({ error: null });
  const userUpdateSingle = jest.fn().mockResolvedValue({ data: { id: 'user-1' }, error: null });

  const supabaseService = {
    getClient: () => ({
      from: (table: string) => {
        if (table === 'users') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: { needs_recalculation: options.needsRecalculation },
                    error: null,
                  }),
              }),
            }),
            update: () => ({
              eq: () => ({ select: () => ({ single: userUpdateSingle }) }),
            }),
          };
        }
        if (table === 'comparisons') {
          return {
            delete: () => ({ eq: deleteEq }),
          };
        }
        throw new Error(`Tabla inesperada en el fake de test: ${table}`);
      },
    }),
  };

  const candidateSelectorService = { selectCandidates } as unknown as CandidateSelectorService;
  const eventBus = { publish: jest.fn() };

  return {
    handler: new RecalculateCompatibilityHandler(
      supabaseService as unknown as SupabaseService,
      candidateSelectorService,
      eventBus as unknown as EventBus,
    ),
    eventBus,
    selectCandidates,
    deleteEq,
    userUpdateSingle,
  };
}

describe('RecalculateCompatibilityHandler', () => {
  it('rechaza con 400 si needs_recalculation es false, sin tocar nada', async () => {
    const { handler, eventBus, selectCandidates, deleteEq, userUpdateSingle } = buildHandler({
      needsRecalculation: false,
    });

    await expect(handler.execute(new RecalculateCompatibilityCommand('user-1'))).rejects.toThrow(
      BadRequestException,
    );
    expect(selectCandidates).not.toHaveBeenCalled();
    expect(deleteEq).not.toHaveBeenCalled();
    expect(userUpdateSingle).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('con needs_recalculation=true: elimina las comparaciones anteriores, reutiliza candidate-selector, publica ComparisonsCreatedEvent y desmarca needs_recalculation', async () => {
    const selected: SelectedCandidate[] = [
      { comparisonId: 'cmp-1', candidateUserId: 'user-a', sharedQualitiesCount: 3 },
    ];
    const { handler, eventBus, selectCandidates, deleteEq, userUpdateSingle } = buildHandler({
      needsRecalculation: true,
      selectedCandidates: selected,
    });

    const result = await handler.execute(new RecalculateCompatibilityCommand('user-1'));

    expect(result).toEqual(selected);
    expect(deleteEq).toHaveBeenCalledWith('requester_user_id', 'user-1');
    expect(selectCandidates).toHaveBeenCalledWith('user-1');
    expect(userUpdateSingle).toHaveBeenCalledTimes(1);
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    const [publishedEvent] = eventBus.publish.mock.calls[0] as [ComparisonsCreatedEvent];
    expect(publishedEvent).toBeInstanceOf(ComparisonsCreatedEvent);
    expect(publishedEvent.comparisonIds).toEqual(['cmp-1']);
  });

  it('elimina primero las comparaciones anteriores y solo después selecciona las nuevas (evita chocar con UNIQUE)', async () => {
    const order: string[] = [];
    const { handler, deleteEq, selectCandidates } = buildHandler({
      needsRecalculation: true,
      selectedCandidates: [],
    });
    deleteEq.mockImplementation(() => {
      order.push('delete');
      return Promise.resolve({ error: null });
    });
    selectCandidates.mockImplementation(() => {
      order.push('select');
      return Promise.resolve([]);
    });

    await handler.execute(new RecalculateCompatibilityCommand('user-1'));

    expect(order).toEqual(['delete', 'select']);
  });

  it('desmarca needs_recalculation aunque la nueva selección no encuentre ningún candidato, sin publicar nada', async () => {
    const { handler, eventBus, userUpdateSingle } = buildHandler({
      needsRecalculation: true,
      selectedCandidates: [],
    });

    const result = await handler.execute(new RecalculateCompatibilityCommand('user-1'));

    expect(result).toEqual([]);
    expect(userUpdateSingle).toHaveBeenCalledTimes(1);
    expect(eventBus.publish).not.toHaveBeenCalled();
  });
});
