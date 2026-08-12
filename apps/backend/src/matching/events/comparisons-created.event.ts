import { IEvent } from '@nestjs/cqrs';

/**
 * Publicado por `matching` (tanto al completar el cuestionario por primera vez como al recalcular,
 * design.md decisión 5b) tras crear una o más filas `comparisons` — nunca si la selección no
 * produjo ningún candidato. El módulo `ai` (sección 9) reacciona a este evento sin que `matching`
 * conozca su existencia, disparando el análisis para cada `comparisonId`.
 */
export class ComparisonsCreatedEvent implements IEvent {
  constructor(public readonly comparisonIds: string[]) {}
}
