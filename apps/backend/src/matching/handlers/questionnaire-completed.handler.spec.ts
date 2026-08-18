import { EventBus } from '@nestjs/cqrs';
import { QuestionnaireCompletedEvent } from '../../questionnaires/events/questionnaire-completed.event';
import { CandidateSelectorService, SelectedCandidate } from '../candidate-selector.service';
import { ComparisonsCreatedEvent } from '../events/comparisons-created.event';
import { QuestionnaireCompletedHandler } from './questionnaire-completed.handler';

// Sección 8: `matching` reacciona a `QuestionnaireCompletedEvent` (publicado por `questionnaires`
// en la sección 7) sin que ninguno de los dos módulos importe nada del otro salvo el propio tipo
// del evento — este archivo no importa nada de `questionnaires` salvo exactamente ese evento.

function buildHandler(selectCandidates: jest.Mock): {
  handler: QuestionnaireCompletedHandler;
  eventBus: { publish: jest.Mock };
} {
  const candidateSelectorService = { selectCandidates } as unknown as CandidateSelectorService;
  const eventBus = { publish: jest.fn() };

  return {
    handler: new QuestionnaireCompletedHandler(
      candidateSelectorService,
      eventBus as unknown as EventBus,
    ),
    eventBus,
  };
}

const SELECTED: SelectedCandidate[] = [
  { comparisonId: 'cmp-1', candidateUserId: 'user-a', sharedQualitiesCount: 3 },
  { comparisonId: 'cmp-2', candidateUserId: 'user-b', sharedQualitiesCount: 2 },
];

describe('QuestionnaireCompletedHandler (matching)', () => {
  it('invoca a candidate-selector.service.ts con el user_id del evento', async () => {
    const selectCandidates = jest.fn().mockResolvedValue(SELECTED);
    const { handler } = buildHandler(selectCandidates);

    await handler.handle(new QuestionnaireCompletedEvent('user-x'));

    expect(selectCandidates).toHaveBeenCalledWith('user-x');
    expect(selectCandidates).toHaveBeenCalledTimes(1);
  });

  it('si se crean comparaciones, publica ComparisonsCreatedEvent con sus comparison_id', async () => {
    const selectCandidates = jest.fn().mockResolvedValue(SELECTED);
    const { handler, eventBus } = buildHandler(selectCandidates);

    await handler.handle(new QuestionnaireCompletedEvent('user-x'));

    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    const [publishedEvent] = eventBus.publish.mock.calls[0] as [ComparisonsCreatedEvent];
    expect(publishedEvent).toBeInstanceOf(ComparisonsCreatedEvent);
    expect(publishedEvent.comparisonIds).toEqual(['cmp-1', 'cmp-2']);
  });

  it('si no hay candidatos disponibles, no publica nada', async () => {
    const selectCandidates = jest.fn().mockResolvedValue([]);
    const { handler, eventBus } = buildHandler(selectCandidates);

    await handler.handle(new QuestionnaireCompletedEvent('user-x'));

    expect(eventBus.publish).not.toHaveBeenCalled();
  });
});
