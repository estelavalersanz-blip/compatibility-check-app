import { ICommand } from '@nestjs/cqrs';

/**
 * Envío final del cuestionario (design.md, decisión 6b) — `answers` llega sin validar todavía
 * (`unknown`): es `CompleteQuestionnaireCommandHandler` quien decide si tiene la forma de un
 * `AnswerSet` completo, igual que la violación de `UNIQUE(alias)` se traduce dentro de
 * `CreateUserProfileHandler` y no en el controller (sección 6).
 */
export class CompleteQuestionnaireCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly answers: unknown,
  ) {}
}
