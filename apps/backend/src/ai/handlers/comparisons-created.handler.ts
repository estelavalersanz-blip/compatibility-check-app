import { CommandBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { PinoLogger } from 'nestjs-pino';
import { ComparisonsCreatedEvent } from '../../matching/events/comparisons-created.event';
import { AnalyzeComparisonCommand } from '../commands/analyze-comparison.command';

/**
 * Reacciona a `ComparisonsCreatedEvent` (publicado por `matching`, sección 8) despachando
 * `AnalyzeComparisonCommand` para cada `comparisonId` recibido — el mismo Command que usa
 * `POST /comparisons/:id/reanalyze` (tarea 9.13), para no duplicar la orquestación entre el
 * análisis inicial y el reintento manual. Este archivo no importa nada más de `matching` que el
 * propio tipo del evento, y `matching` no conoce la existencia de este módulo.
 *
 * Las comparaciones se procesan de una en una, NUNCA concurrentemente entre sí (docs/plan.md: "1
 * comparación a la vez, 2 batches en paralelo dentro de cada una") — la concurrencia limitada ya
 * vive dentro de `AiOrchestratorService` (2 lotes por comparación); apilar además varias
 * comparaciones en paralelo multiplicaría el riesgo de agotar el rate limit del free tier de Groq
 * durante una demo (design.md, Riesgos/Trade-offs). Un fallo inesperado en una comparación se
 * registra pero no detiene el análisis del resto de la lista.
 */
@EventsHandler(ComparisonsCreatedEvent)
export class ComparisonsCreatedHandler implements IEventHandler<ComparisonsCreatedEvent> {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ComparisonsCreatedHandler.name);
  }

  async handle(event: ComparisonsCreatedEvent): Promise<void> {
    for (const comparisonId of event.comparisonIds) {
      try {
        await this.commandBus.execute(new AnalyzeComparisonCommand(comparisonId));
      } catch (error) {
        this.logger.error(
          { comparisonId, error: error instanceof Error ? error.message : String(error) },
          'Fallo inesperado analizando la comparación, se continúa con el resto',
        );
      }
    }
  }
}
