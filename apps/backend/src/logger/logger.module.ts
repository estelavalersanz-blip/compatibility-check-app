import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

/**
 * Logger estructurado único del backend (design.md, decisiones 8 y 8b): JSON de fábrica vía Pino,
 * con contexto por módulo/request (child logger), reutilizable desde cualquier servicio en vez de
 * `console.log` sueltos o el `Logger` por defecto de Nest.
 *
 * Único destino: stdout (visible en el dashboard de Render en tiempo real) — decisión 8b revisada
 * durante la tarea 19.1: se descartó un transport adicional a un proveedor externo de persistencia
 * de logs (Better Stack/Logtail, evaluado y descartado en ese momento) para no depender de una
 * cuenta/servicio de terceros más; ver `design.md` para el razonamiento completo.
 */
@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        transport: {
          targets: [
            {
              target: 'pino/file',
              options: { destination: 1 }, // 1 = stdout
            },
          ],
        },
        level: process.env.LOG_LEVEL ?? 'info',
        // Nunca loguear el contenido íntegro de datos sensibles (respuestas del cuestionario,
        // cabeceras de autenticación) — ver design.md, decisión 8.
        redact: ['req.headers.authorization', 'req.headers.cookie'],
      },
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
