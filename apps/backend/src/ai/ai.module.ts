import { Module } from '@nestjs/common';
import { AI_PROVIDER } from './ai-provider.interface';
import { AiOrchestratorService } from './ai-orchestrator.service';
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
 */
@Module({
  imports: [CqrsLoggingModule],
  providers: [
    GroqProvider,
    OpenRouterProvider,
    { provide: AI_PROVIDER, useExisting: GroqProvider },
    AiOrchestratorService,
    ComparisonsCreatedHandler,
    AnalyzeComparisonHandler,
  ],
})
export class AiModule {}
