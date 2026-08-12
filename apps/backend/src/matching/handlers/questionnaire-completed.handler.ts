import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { QuestionnaireCompletedEvent } from '../../questionnaires/events/questionnaire-completed.event';
import { CandidateSelectorService } from '../candidate-selector.service';
import { ComparisonsCreatedEvent } from '../events/comparisons-created.event';

/**
 * Reacciona a `QuestionnaireCompletedEvent` (publicado por `questionnaires`, sección 7) invocando
 * `candidate-selector.service.ts` con el `userId` del evento (design.md, decisión 6b) — este
 * archivo no importa nada más de `questionnaires` que el propio tipo del evento, ni `matching`
 * conoce la existencia del futuro módulo `ai` (sección 9): si se crean una o más comparaciones,
 * publica `ComparisonsCreatedEvent`, y ese módulo se suscribirá a él sin que este handler lo sepa.
 */
@EventsHandler(QuestionnaireCompletedEvent)
export class QuestionnaireCompletedHandler implements IEventHandler<QuestionnaireCompletedEvent> {
  constructor(
    private readonly candidateSelectorService: CandidateSelectorService,
    private readonly eventBus: EventBus,
  ) {}

  async handle(event: QuestionnaireCompletedEvent): Promise<void> {
    const selected = await this.candidateSelectorService.selectCandidates(event.userId);

    if (selected.length === 0) {
      return;
    }

    this.eventBus.publish(new ComparisonsCreatedEvent(selected.map((s) => s.comparisonId)));
  }
}
