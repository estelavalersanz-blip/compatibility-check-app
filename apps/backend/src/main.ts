import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

/**
 * Orígenes permitidos para CORS. `CORS_ORIGIN` admite una lista separada por comas (pensada para la
 * tarea 19.4, cuando exista la URL real de Vercel); sin definir, cae al puerto por defecto de
 * `ng serve` en local (`environment.ts`, `apiBaseUrl: 'http://localhost:3000'` desde el frontend en
 * `4200`). Descubierto como gap real en la sección 13 (primera vez que el frontend hace una llamada
 * HTTP autenticada de verdad al backend desde el navegador — hasta ahora las secciones 11/11d/12 solo
 * llamaban a Supabase Auth directamente, nunca a este backend): sin `enableCors`, el preflight
 * `OPTIONS` de cualquier petición con cabecera `Authorization` (o `multipart/form-data`) responde 404
 * (Nest no registra un handler `OPTIONS` propio) y el navegador aborta la petición real antes de
 * enviarla.
 */
function corsOrigins(): string[] {
  const configured = process.env.CORS_ORIGIN?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  return configured && configured.length > 0 ? configured : ['http://localhost:4200'];
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.enableCors({ origin: corsOrigins() });
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
