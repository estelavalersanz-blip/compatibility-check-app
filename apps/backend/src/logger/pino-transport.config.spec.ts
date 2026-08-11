import { buildPinoTransportTargets } from './pino-transport.config';

describe('buildPinoTransportTargets', () => {
  it('escribe solo a stdout cuando LOGTAIL_SOURCE_TOKEN no está definido', () => {
    const targets = buildPinoTransportTargets({});

    expect(targets).toHaveLength(1);
    expect(targets[0].target).toBe('pino/file');
    expect(targets.some((t) => t.target === '@logtail/pino')).toBe(false);
  });

  it('añade el transport de Better Stack (Logtail) además de stdout cuando el token está definido', () => {
    const targets = buildPinoTransportTargets({
      LOGTAIL_SOURCE_TOKEN: 'test-token-123',
    });

    expect(targets).toHaveLength(2);
    expect(targets.some((t) => t.target === 'pino/file')).toBe(true);

    const logtailTarget = targets.find((t) => t.target === '@logtail/pino');
    expect(logtailTarget).toBeDefined();
    expect(logtailTarget?.options).toEqual({ sourceToken: 'test-token-123' });
  });

  it('no falla ni intenta construir el transport de Logtail con un token vacío', () => {
    const targets = buildPinoTransportTargets({ LOGTAIL_SOURCE_TOKEN: '' });

    expect(targets).toHaveLength(1);
    expect(targets.some((t) => t.target === '@logtail/pino')).toBe(false);
  });
});
