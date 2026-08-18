import { ICommand } from '@nestjs/cqrs';

/**
 * "Hacer (o repetir) el análisis de IA de esta comparación, ya" — sin precondición de estado propia:
 * quien la despacha decide si tiene sentido (el handler de `ComparisonsCreatedEvent` la usa para el
 * análisis inicial desde `pending`; `POST /comparisons/:id/reanalyze` la usa para repetir desde
 * `error`, tras comprobar ese estado él mismo). `AnalyzeComparisonCommandHandler` no distingue el
 * origen — mismo comando, mismo camino, sin duplicar la orquestación entre los dos triggers.
 */
export class AnalyzeComparisonCommand implements ICommand {
  constructor(public readonly comparisonId: string) {}
}
