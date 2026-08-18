import { AiOrchestratorService } from '../ai-orchestrator.service';
import { AnalyzeComparisonCommand } from './analyze-comparison.command';
import { AnalyzeComparisonHandler } from './analyze-comparison.handler';

/**
 * Mismo patrón que `recalculate-compatibility.handler.spec.ts` (matching/commands): construcción
 * directa con `new Handler(...)` y mocks a mano, sin Nest TestBed — el Handler solo tiene una
 * dependencia explícita en el constructor, no hace falta montar un módulo de Nest para probarlo.
 *
 * El mock de `AiOrchestratorService` implementa deliberadamente SOLO `analyzeComparison`: si el
 * Handler intentara comprobar el estado de la comparación por su cuenta antes de delegar (llamando
 * a cualquier otro método del orquestador o del repositorio), estos tests fallarían con "is not a
 * function" en vez de pasar.
 */

function buildHandler(): {
  handler: AnalyzeComparisonHandler;
  analyzeComparison: jest.Mock;
} {
  const analyzeComparison = jest.fn().mockResolvedValue(undefined);
  const aiOrchestratorService = { analyzeComparison } as unknown as AiOrchestratorService;

  return {
    handler: new AnalyzeComparisonHandler(aiOrchestratorService),
    analyzeComparison,
  };
}

describe('AnalyzeComparisonHandler', () => {
  it('éxito: delega en AiOrchestratorService.analyzeComparison con el id de la comparación del comando', async () => {
    const { handler, analyzeComparison } = buildHandler();

    await handler.execute(new AnalyzeComparisonCommand('cmp-1'));

    expect(analyzeComparison).toHaveBeenCalledTimes(1);
    expect(analyzeComparison).toHaveBeenCalledWith('cmp-1');
  });

  it(
    'no valida el estado de la comparación antes de delegar — leído en analyze-comparison.handler.ts: ' +
      'esa precondición ("solo si está en error") vive en comparisons.controller.ts, para el ' +
      'reintento manual; el análisis inicial despacha el mismo comando desde `pending`. El Handler ' +
      'reenvía cualquier id tal cual, sin comprobar nada por su cuenta',
    async () => {
      const { handler, analyzeComparison } = buildHandler();

      await handler.execute(new AnalyzeComparisonCommand('cmp-inexistente-o-en-cualquier-estado'));

      expect(analyzeComparison).toHaveBeenCalledTimes(1);
      expect(analyzeComparison).toHaveBeenCalledWith('cmp-inexistente-o-en-cualquier-estado');
    },
  );

  it('propaga el error si el orquestador falla, sin capturarlo (no hay try/catch en el Handler)', async () => {
    const { handler, analyzeComparison } = buildHandler();
    analyzeComparison.mockRejectedValue(new Error('fallo del orquestador'));

    await expect(handler.execute(new AnalyzeComparisonCommand('cmp-1'))).rejects.toThrow(
      'fallo del orquestador',
    );
  });
});
