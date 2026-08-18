import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AiOrchestratorService } from '../ai-orchestrator.service';
import { AnalyzeComparisonCommand } from './analyze-comparison.command';

/**
 * Delgado a propósito: toda la orquestación real vive en `AiOrchestratorService`, que ya deja la
 * comparación en `completed` o `error` y siempre repite desde cero (borra resultados/agregado
 * previos antes de recalcular) — no hay nada más que este Handler necesite decidir.
 */
@CommandHandler(AnalyzeComparisonCommand)
export class AnalyzeComparisonHandler implements ICommandHandler<AnalyzeComparisonCommand, void> {
  constructor(private readonly aiOrchestratorService: AiOrchestratorService) {}

  async execute(command: AnalyzeComparisonCommand): Promise<void> {
    await this.aiOrchestratorService.analyzeComparison(command.comparisonId);
  }
}
