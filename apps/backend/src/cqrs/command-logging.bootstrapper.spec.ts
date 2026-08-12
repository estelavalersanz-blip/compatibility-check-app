import { CommandBus } from '@nestjs/cqrs';
import { PinoLogger } from 'nestjs-pino';
import { CommandLoggingBootstrapper } from './command-logging.bootstrapper';

class FakeCommand {}

describe('CommandLoggingBootstrapper', () => {
  let commandBus: { execute: jest.Mock };
  let logger: { info: jest.Mock; error: jest.Mock; setContext: jest.Mock };
  let bootstrapper: CommandLoggingBootstrapper;

  beforeEach(() => {
    commandBus = { execute: jest.fn() };
    logger = { info: jest.fn(), error: jest.fn(), setContext: jest.fn() };
    bootstrapper = new CommandLoggingBootstrapper(
      commandBus as unknown as CommandBus,
      logger as unknown as PinoLogger,
    );
  });

  it('fija su propio contexto de logger al construirse', () => {
    expect(logger.setContext).toHaveBeenCalledWith('CommandLoggingBootstrapper');
  });

  it('registra inicio y fin con el mismo identificador de correlación cuando el comando termina bien', async () => {
    commandBus.execute = jest.fn().mockResolvedValue('ok');
    bootstrapper.onApplicationBootstrap();

    const result: unknown = await commandBus.execute(new FakeCommand());

    expect(result).toBe('ok');
    expect(logger.info).toHaveBeenCalledTimes(2);
    expect(logger.error).not.toHaveBeenCalled();

    const [startArgs] = logger.info.mock.calls[0] as [Record<string, unknown>];
    const [endArgs] = logger.info.mock.calls[1] as [Record<string, unknown>];
    expect(startArgs).toMatchObject({ commandName: 'FakeCommand' });
    expect(endArgs).toMatchObject({ commandName: 'FakeCommand' });
    expect(startArgs.correlationId).toBeTruthy();
    expect(startArgs.correlationId).toBe(endArgs.correlationId);
  });

  it('registra el error con el mismo identificador de correlación y relanza el error del handler', async () => {
    const failure = new Error('boom');
    commandBus.execute = jest.fn().mockRejectedValue(failure);
    bootstrapper.onApplicationBootstrap();

    await expect(commandBus.execute(new FakeCommand())).rejects.toThrow('boom');

    expect(logger.info).toHaveBeenCalledTimes(1); // solo el log de inicio
    expect(logger.error).toHaveBeenCalledTimes(1);

    const [startArgs] = logger.info.mock.calls[0] as [Record<string, unknown>];
    const [errorArgs] = logger.error.mock.calls[0] as [Record<string, unknown>];
    expect(startArgs.correlationId).toBe(errorArgs.correlationId);
    expect(errorArgs).toMatchObject({ commandName: 'FakeCommand', error: 'boom' });
  });

  it('usa un identificador de correlación distinto por cada comando despachado', async () => {
    commandBus.execute = jest.fn().mockResolvedValue(undefined);
    bootstrapper.onApplicationBootstrap();

    await commandBus.execute(new FakeCommand());
    await commandBus.execute(new FakeCommand());

    const correlationIds = logger.info.mock.calls
      .filter(([, message]: [unknown, string]) => message.includes('started'))
      .map(([args]: [Record<string, unknown>]) => args.correlationId);

    expect(new Set(correlationIds).size).toBe(2);
  });

  it('sigue llamando al execute original de CommandBus con el comando recibido', async () => {
    const originalExecute = jest.fn().mockResolvedValue('ok');
    commandBus.execute = originalExecute;
    bootstrapper.onApplicationBootstrap();
    const command = new FakeCommand();

    await commandBus.execute(command);

    expect(originalExecute).toHaveBeenCalledWith(command);
  });
});
