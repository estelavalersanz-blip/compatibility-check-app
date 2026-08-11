interface PinoTransportTarget {
  target: string;
  options: Record<string, unknown>;
  level?: string;
}

/**
 * Construye la lista de destinos ("targets") de Pino para el logger del backend.
 *
 * Siempre escribe a stdout (visible en el dashboard de Render en tiempo real). Añade además el
 * transport hacia Better Stack (Logtail) solo cuando `LOGTAIL_SOURCE_TOKEN` está definido en el
 * entorno (ver design.md, decisión 8b) — típicamente solo en Render. En tests/local, sin esa
 * variable, el logger no intenta conectar a Logtail en ningún caso.
 */
export function buildPinoTransportTargets(
  env: NodeJS.ProcessEnv = process.env,
): PinoTransportTarget[] {
  const targets: PinoTransportTarget[] = [
    {
      target: 'pino/file',
      options: { destination: 1 }, // 1 = stdout
    },
  ];

  const logtailSourceToken = env.LOGTAIL_SOURCE_TOKEN;
  if (logtailSourceToken) {
    targets.push({
      target: '@logtail/pino',
      options: { sourceToken: logtailSourceToken },
    });
  }

  return targets;
}
