import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { AiCompletionRequest, AiProvider } from './ai-provider.interface';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
// Modelo open-weight equivalente al de `groq.provider.ts` (docs/plan.md: "OpenRouter mencionado
// como alternativa/comparativa") — mismo formato de mensajes OpenAI-compatible que Groq.
const OPENROUTER_MODEL = 'meta-llama/llama-3.3-70b-instruct';

interface OpenRouterChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

/**
 * Segunda implementación de `AiProvider` (design.md, decisión 4): mismos criterios de test y de
 * logging que `groq.provider.ts` — la interfaz común es precisamente lo que permite que
 * `ai-orchestrator.service.ts` no distinga entre ambas.
 */
@Injectable()
export class OpenRouterProvider implements AiProvider {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(OpenRouterProvider.name);
  }

  async complete(request: AiCompletionRequest): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY no está definida — revisa apps/backend/.env.example');
    }

    const startedAt = Date.now();
    let response: Response;
    try {
      response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [
            { role: 'system', content: request.systemPrompt },
            { role: 'user', content: request.userPrompt },
          ],
        }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        { provider: 'openrouter', error: message },
        'Fallo de red al llamar a OpenRouter',
      );
      throw new Error(`No se pudo contactar con OpenRouter: ${message}`);
    }

    const durationMs = Date.now() - startedAt;

    if (!response.ok) {
      this.logger.warn(
        { provider: 'openrouter', status: response.status, durationMs },
        'OpenRouter devolvió una respuesta de error',
      );
      throw new Error(`OpenRouter respondió con estado ${response.status}`);
    }

    const body = (await response.json()) as OpenRouterChatCompletionResponse;
    const content = body.choices?.[0]?.message?.content;
    if (!content) {
      this.logger.warn(
        { provider: 'openrouter', durationMs },
        'OpenRouter devolvió una respuesta sin contenido',
      );
      throw new Error('OpenRouter devolvió una respuesta sin contenido');
    }

    this.logger.info(
      { provider: 'openrouter', durationMs },
      'Respuesta recibida del proveedor de IA',
    );
    return content;
  }
}
