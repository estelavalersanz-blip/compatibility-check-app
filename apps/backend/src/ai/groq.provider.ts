import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { AiCompletionRequest, AiProvider } from './ai-provider.interface';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
// Modelo open-weight de Groq (docs/plan.md, "IA" en la tabla de stack) — configurable a futuro sin
// tocar el contrato de AiProvider si se necesitara, no hay ninguna tarea que lo pida todavía.
const GROQ_MODEL = 'llama-3.3-70b-versatile';

interface GroqChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

/**
 * Implementación de `AiProvider` contra la API de Groq (design.md, decisión 4 — proveedor principal
 * por defecto). Usa `fetch` global (Node ≥18, ya exigido por NestJS 11) en vez de añadir un cliente
 * HTTP como dependencia nueva del monorepo — cada `complete()` es una llamada independiente, sin
 * estado propio entre llamadas.
 */
@Injectable()
export class GroqProvider implements AiProvider {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(GroqProvider.name);
  }

  async complete(request: AiCompletionRequest): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY no está definida — revisa apps/backend/.env.example');
    }

    const startedAt = Date.now();
    let response: Response;
    try {
      response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: request.systemPrompt },
            { role: 'user', content: request.userPrompt },
          ],
        }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error({ provider: 'groq', error: message }, 'Fallo de red al llamar a Groq');
      throw new Error(`No se pudo contactar con Groq: ${message}`);
    }

    const durationMs = Date.now() - startedAt;

    if (!response.ok) {
      this.logger.warn(
        { provider: 'groq', status: response.status, durationMs },
        'Groq devolvió una respuesta de error',
      );
      throw new Error(`Groq respondió con estado ${response.status}`);
    }

    const body = (await response.json()) as GroqChatCompletionResponse;
    const content = body.choices?.[0]?.message?.content;
    if (!content) {
      this.logger.warn(
        { provider: 'groq', durationMs },
        'Groq devolvió una respuesta sin contenido',
      );
      throw new Error('Groq devolvió una respuesta sin contenido');
    }

    // Nunca se loguea `content` (la respuesta del modelo, construida a partir de datos de usuario) —
    // solo metadatos (design.md, decisión 8).
    this.logger.info({ provider: 'groq', durationMs }, 'Respuesta recibida del proveedor de IA');
    return content;
  }
}
