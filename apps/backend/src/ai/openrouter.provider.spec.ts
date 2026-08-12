import { PinoLogger } from 'nestjs-pino';
import { OpenRouterProvider } from './openrouter.provider';

// Mismos criterios de test que `groq.provider.spec.ts` (tarea 9.4) — misma interfaz, mismo
// comportamiento esperado, solo cambia el proveedor concreto.

function buildProvider(): {
  provider: OpenRouterProvider;
  logger: { info: jest.Mock; warn: jest.Mock; error: jest.Mock };
} {
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), setContext: jest.fn() };
  return { provider: new OpenRouterProvider(logger as unknown as PinoLogger), logger };
}

function fakeResponse(
  overrides: Partial<{ ok: boolean; status: number; json: () => Promise<unknown> }>,
): Response {
  return {
    ok: overrides.ok ?? true,
    status: overrides.status ?? 200,
    json: overrides.json ?? (() => Promise.resolve({})),
  } as unknown as Response;
}

describe('OpenRouterProvider', () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.OPENROUTER_API_KEY;

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.OPENROUTER_API_KEY = originalApiKey;
  });

  it('éxito: devuelve el contenido de la respuesta y loguea proveedor+duración, sin el contenido', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      fakeResponse({
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: '[{"foo":"la respuesta secreta"}]' } }],
          }),
      }),
    );
    const { provider, logger } = buildProvider();

    const result = await provider.complete({ systemPrompt: 'sistema', userPrompt: 'usuario' });

    expect(result).toBe('[{"foo":"la respuesta secreta"}]');
    expect(logger.info).toHaveBeenCalledTimes(1);
    const [fields] = logger.info.mock.calls[0] as [Record<string, unknown>];
    expect(fields).toMatchObject({ provider: 'openrouter' });
    expect(JSON.stringify(fields)).not.toContain('la respuesta secreta');
  });

  it('error de red: propaga un error claro y lo loguea', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const { provider, logger } = buildProvider();

    await expect(provider.complete({ systemPrompt: 's', userPrompt: 'u' })).rejects.toThrow(
      /ECONNREFUSED/,
    );
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('respuesta 429 (rate limit): propaga un error con el estado y lo loguea como warn', async () => {
    global.fetch = jest.fn().mockResolvedValue(fakeResponse({ ok: false, status: 429 }));
    const { provider, logger } = buildProvider();

    await expect(provider.complete({ systemPrompt: 's', userPrompt: 'u' })).rejects.toThrow(/429/);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('sin OPENROUTER_API_KEY definida, rechaza sin llegar a llamar a fetch', async () => {
    delete process.env.OPENROUTER_API_KEY;
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy;
    const { provider } = buildProvider();

    await expect(provider.complete({ systemPrompt: 's', userPrompt: 'u' })).rejects.toThrow(
      /OPENROUTER_API_KEY/,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
