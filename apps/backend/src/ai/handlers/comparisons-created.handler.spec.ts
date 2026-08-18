import { CommandBus } from '@nestjs/cqrs';
import { PinoLogger } from 'nestjs-pino';
import { AnalyzeComparisonCommand } from '../commands/analyze-comparison.command';
import { ComparisonsCreatedEvent } from '../../matching/events/comparisons-created.event';
import { ComparisonsCreatedHandler } from './comparisons-created.handler';

// Sección 9: `ai` reacciona a `ComparisonsCreatedEvent` (publicado por `matching`, sección 8) sin
// que ninguno de los dos módulos importe nada del otro salvo el propio tipo del evento — este
// archivo no importa nada más de `matching` que ese evento. Despacha `AnalyzeComparisonCommand` vía
// `CommandBus` (tarea 9.13) en vez de llamar a `AiOrchestratorService` directamente, para reusar el
// mismo camino que `POST /comparisons/:id/reanalyze`.

function buildHandler(execute: jest.Mock): {
  handler: ComparisonsCreatedHandler;
  logger: { info: jest.Mock; error: jest.Mock };
} {
  const commandBus = { execute } as unknown as CommandBus;
  const logger = { info: jest.fn(), error: jest.fn(), setContext: jest.fn() };

  return {
    handler: new ComparisonsCreatedHandler(commandBus, logger as unknown as PinoLogger),
    logger,
  };
}

describe('ComparisonsCreatedHandler (ai)', () => {
  it('despacha AnalyzeComparisonCommand para cada comparison_id recibido en el evento', async () => {
    const execute = jest.fn().mockResolvedValue(undefined);
    const { handler } = buildHandler(execute);

    await handler.handle(new ComparisonsCreatedEvent(['cmp-1', 'cmp-2', 'cmp-3']));

    expect(execute).toHaveBeenCalledTimes(3);
    const dispatched = execute.mock.calls.map(([command]) => command as AnalyzeComparisonCommand);
    expect(dispatched.every((command) => command instanceof AnalyzeComparisonCommand)).toBe(true);
    expect(dispatched.map((command) => command.comparisonId)).toEqual(['cmp-1', 'cmp-2', 'cmp-3']);
  });

  it('procesa las comparaciones de una en una, no concurrentemente (rate limit del free tier)', async () => {
    const order: string[] = [];
    const execute = jest.fn().mockImplementation(async (command: AnalyzeComparisonCommand) => {
      order.push(`start:${command.comparisonId}`);
      await new Promise((resolve) => setTimeout(resolve, 10));
      order.push(`end:${command.comparisonId}`);
    });
    const { handler } = buildHandler(execute);

    await handler.handle(new ComparisonsCreatedEvent(['cmp-1', 'cmp-2']));

    expect(order).toEqual(['start:cmp-1', 'end:cmp-1', 'start:cmp-2', 'end:cmp-2']);
  });

  it('si una comparación falla inesperadamente, sigue procesando el resto sin detenerse', async () => {
    const execute = jest
      .fn()
      .mockRejectedValueOnce(new Error('fallo inesperado'))
      .mockResolvedValueOnce(undefined);
    const { handler, logger } = buildHandler(execute);

    await handler.handle(new ComparisonsCreatedEvent(['cmp-1', 'cmp-2']));

    expect(execute).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('con una lista vacía de comparison_id, no hace nada', async () => {
    const execute = jest.fn();
    const { handler } = buildHandler(execute);

    await handler.handle(new ComparisonsCreatedEvent([]));

    expect(execute).not.toHaveBeenCalled();
  });
});
