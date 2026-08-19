import { PinoLogger } from 'nestjs-pino';
import { GroqProvider } from './groq.provider';

function buildProvider(): {
  provider: GroqProvider;
  logger: { info: jest.Mock; warn: jest.Mock; error: jest.Mock };
} {
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), setContext: jest.fn() };
  return { provider: new GroqProvider(logger as unknown as PinoLogger), logger };
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

describe('GroqProvider', () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.GROQ_API_KEY;

  beforeEach(() => {
    process.env.GROQ_API_KEY = 'test-groq-key';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.GROQ_API_KEY = originalApiKey;
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
    expect(fields).toMatchObject({ provider: 'groq' });
    expect(typeof fields.durationMs).toBe('number');
    expect(JSON.stringify(fields)).not.toContain('la respuesta secreta');
  });

  /**
   * Bug real de producción (2026-08-19): el modelo `openai/gpt-oss-120b` gasta de media
   * ~1.000-1.300 tokens ocultos "razonando" antes de responder (`usage.reasoning_tokens`,
   * confirmado contra la API real de Groq con datos reales que habían fallado en producción) — eso
   * por sí solo bastaba para agotar el límite gratuito de 8.000 tokens/minuto con una sola
   * comparación (6 lotes). `reasoning_effort: 'low'` (parámetro real y soportado por este modelo,
   * confirmado en la documentación de Groq) reduce esos tokens ocultos a ~20 sin perder calidad de
   * puntuación/explicación (comparado a mano, mismo prompt, `low` vs `medium`).
   */
  it('incluye reasoning_effort: low en la petición, para no agotar el límite de tokens/minuto de Groq con tokens de razonamiento ocultos', async () => {
    const fetchSpy = jest.fn().mockResolvedValue(
      fakeResponse({
        json: () => Promise.resolve({ choices: [{ message: { content: '[]' } }] }),
      }),
    );
    global.fetch = fetchSpy;
    const { provider } = buildProvider();

    await provider.complete({ systemPrompt: 's', userPrompt: 'u' });

    const [, requestInit] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(requestInit.body as string) as { reasoning_effort?: string };
    expect(body.reasoning_effort).toBe('low');
  });

  it('error de red: propaga un error claro y lo loguea sin colgarse', async () => {
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
    const [fields] = logger.warn.mock.calls[0] as [Record<string, unknown>];
    expect(fields).toMatchObject({ provider: 'groq', status: 429 });
  });

  it('sin GROQ_API_KEY definida, rechaza sin llegar a llamar a fetch', async () => {
    delete process.env.GROQ_API_KEY;
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy;
    const { provider } = buildProvider();

    await expect(provider.complete({ systemPrompt: 's', userPrompt: 'u' })).rejects.toThrow(
      /GROQ_API_KEY/,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
