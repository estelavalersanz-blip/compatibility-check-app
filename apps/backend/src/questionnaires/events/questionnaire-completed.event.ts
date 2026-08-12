import { IEvent } from '@nestjs/cqrs';

/**
 * Publicado por `CompleteQuestionnaireCommandHandler` justo después de persistir el cuestionario
 * completo (design.md, decisión 6b) — desacopla `questionnaires` de `matching`: este módulo no
 * conoce ni importa nada de `matching`, que reaccionará a este evento en la sección 8 registrando
 * su propio `@EventsHandler(QuestionnaireCompletedEvent)`.
 */
export class QuestionnaireCompletedEvent implements IEvent {
  constructor(public readonly userId: string) {}
}
