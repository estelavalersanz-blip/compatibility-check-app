import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { buildPinoTransportTargets } from './pino-transport.config';

/**
 * Logger estructurado único del backend (design.md, decisiones 8 y 8b): JSON de fábrica vía Pino,
 * con contexto por módulo/request (child logger), reutilizable desde cualquier servicio en vez de
 * `console.log` sueltos o el `Logger` por defecto de Nest.
 */
@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        transport: {
          targets: buildPinoTransportTargets(),
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
