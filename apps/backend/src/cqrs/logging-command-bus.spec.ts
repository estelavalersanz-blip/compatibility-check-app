import { CommandBus } from '@nestjs/cqrs';
import { PinoLogger } from 'nestjs-pino';
import { LoggingCommandBus } from './logging-command-bus';

class FakeCommand {}

interface LogFields {
  correlationId: string;
  commandName: string;
  error?: string;
}

describe('LoggingCommandBus', () => {
  let rootLogger: {
    info: jest.Mock<void, [LogFields, string]>;
    error: jest.Mock<void, [LogFields, string]>;
  };
  let bus: LoggingCommandBus;
  let originalRoot: unknown;

  beforeEach(() => {
    originalRoot = (PinoLogger as unknown as { root: unknown }).root;
    rootLogger = {
      info: jest.fn<void, [LogFields, string]>(),
      error: jest.fn<void, [LogFields, string]>(),
    };
    (PinoLogger as unknown as { root: unknown }).root = rootLogger;
    // El `moduleRef` real no hace falta: `execute` se stubea a nivel de prototipo de `CommandBus`
    // en cada test, así que nunca se llega al código que sí lo usaría.
    bus = new LoggingCommandBus({} as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    (PinoLogger as unknown as { root: unknown }).root = originalRoot;
  });

  it('registra inicio y fin con el mismo identificador de correlación cuando el comando termina bien', async () => {
    jest.spyOn(CommandBus.prototype, 'execute').mockResolvedValue('ok');

    const result = await bus.execute(new FakeCommand());

    expect(result).toBe('ok');
    expect(rootLogger.info).toHaveBeenCalledTimes(2);
    expect(rootLogger.error).not.toHaveBeenCalled();

    const [startArgs] = rootLogger.info.mock.calls[0];
    const [endArgs] = rootLogger.info.mock.calls[1];
    expect(startArgs).toMatchObject({ commandName: 'FakeCommand' });
    expect(endArgs).toMatchObject({ commandName: 'FakeCommand' });
    expect(startArgs.correlationId).toBeTruthy();
    expect(startArgs.correlationId).toBe(endArgs.correlationId);
  });

  it('registra el error con el mismo identificador de correlación y relanza el error del handler', async () => {
    const failure = new Error('boom');
    jest.spyOn(CommandBus.prototype, 'execute').mockRejectedValue(failure);

    await expect(bus.execute(new FakeCommand())).rejects.toThrow('boom');

    expect(rootLogger.info).toHaveBeenCalledTimes(1); // solo el log de inicio
    expect(rootLogger.error).toHaveBeenCalledTimes(1);

    const [startArgs] = rootLogger.info.mock.calls[0];
    const [errorArgs] = rootLogger.error.mock.calls[0];
    expect(startArgs.correlationId).toBe(errorArgs.correlationId);
    expect(errorArgs).toMatchObject({
      commandName: 'FakeCommand',
      error: 'boom',
    });
  });

  it('usa un identificador de correlación distinto por cada comando despachado', async () => {
    jest.spyOn(CommandBus.prototype, 'execute').mockResolvedValue(undefined);

    await bus.execute(new FakeCommand());
    await bus.execute(new FakeCommand());

    const correlationIds = rootLogger.info.mock.calls
      .filter(([, message]) => message.includes('started'))
      .map(([args]) => args.correlationId);

    expect(new Set(correlationIds).size).toBe(2);
  });
});
