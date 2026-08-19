import { Module } from '@nestjs/common';
import { AI_PROVIDER } from './ai-provider.interface';
import {
  AI_RETRY_BACKOFF_MS,
  AiOrchestratorService,
  PRODUCTION_RETRY_BACKOFF_MS,
} from './ai-orchestrator.service';
import { AnalyzeComparisonHandler } from './commands/analyze-comparison.handler';
import { ComparisonsCreatedHandler } from './handlers/comparisons-created.handler';
import { GroqProvider } from './groq.provider';
import { OpenRouterProvider } from './openrouter.provider';
import { CqrsLoggingModule } from '../cqrs/cqrs-logging.module';

/**
 * Groq como proveedor activo por defecto (design.md, decisión 4) — cambiar a OpenRouter es
 * cuestión de apuntar `AI_PROVIDER` a `OpenRouterProvider` aquí, sin tocar
 * `ai-orchestrator.service.ts`. Ambos providers se registran siempre (aunque solo uno esté
 * vinculado al token activo) para poder alternar sin reestructurar el módulo; ninguno valida su
 * API key en el constructor — solo al llamar a `complete()` — así que el módulo arranca sin
 * `GROQ_API_KEY`/`OPENROUTER_API_KEY` configuradas (no son necesarias fuera del flujo real de
 * análisis, a diferencia de las credenciales de Supabase).
 *
 * `AI_RETRY_BACKOFF_MS` vinculado a `PRODUCTION_RETRY_BACKOFF_MS` (10s/25s, no los 50/150ms que
 * usan los tests) — ver el comentario de esa constante en `ai-orchestrator.service.ts` para el bug
 * real que motivó este valor.
 */
@Module({
  imports: [CqrsLoggingModule],
  providers: [
    GroqProvider,
    OpenRouterProvider,
    { provide: AI_PROVIDER, useExisting: GroqProvider },
    { provide: AI_RETRY_BACKOFF_MS, useValue: PRODUCTION_RETRY_BACKOFF_MS },
    AiOrchestratorService,
    ComparisonsCreatedHandler,
    AnalyzeComparisonHandler,
  ],
})
export class AiModule {}
