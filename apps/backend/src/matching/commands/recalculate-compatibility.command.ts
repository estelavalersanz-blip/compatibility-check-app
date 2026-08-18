import { ICommand } from '@nestjs/cqrs';

/**
 * Recálculo manual bajo demanda (design.md, decisión 5b) — excepción controlada a la regla de
 * cálculo único: solo actúa sobre las propias comparaciones de `userId`, nunca sobre las de nadie
 * más, y solo si su perfil está marcado `needs_recalculation = true`
 * (`RecalculateCompatibilityCommandHandler` decide el resto, no el controller).
 */
export class RecalculateCompatibilityCommand implements ICommand {
  constructor(public readonly userId: string) {}
}
