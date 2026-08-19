import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { AiCompletionRequest, AiProvider } from './ai-provider.interface';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
// Modelo open-weight de Groq (docs/plan.md, "IA" en la tabla de stack) — configurable a futuro sin
// tocar el contrato de AiProvider si se necesitara, no hay ninguna tarea que lo pida todavía.
//
// Gap real encontrado en la tarea 20.2 (verificación end-to-end con IA real, no simulada): el
// modelo original de esta constante, `llama-3.3-70b-versatile`, respondía 404 — Groq había
// retirado ya ese modelo de su catálogo (`GET /openai/v1/models`, confirmado en el momento:
// ninguna variante de Llama seguía disponible). `openai/gpt-oss-120b` es la alternativa open-weight
// de mayor capacidad que sí aparece en el catálogo actual — mismo espíritu de la decisión 4 de
// design.md (modelo abierto, no un proveedor cerrado), solo cambia de familia de modelo.
const GROQ_MODEL = 'openai/gpt-oss-120b';

// Bug real de producción (2026-08-19, ver apps/backend/src/ai/ai-orchestrator.service.ts —
// PRODUCTION_RETRY_BACKOFF_MS): sin fijar esto, el modelo gasta de media ~1.000-1.300 tokens
// ocultos "razonando" (`usage.reasoning_tokens`) antes de cada respuesta — solo eso ya agotaba el
// límite gratuito de Groq de 8.000 tokens/minuto con una única comparación (6 lotes). `'low'`
// (valor real soportado por este modelo, ver GroqDocs "Reasoning") reduce esos tokens ocultos a
// ~20 sin pérdida apreciable de calidad de puntuación/explicación — comprobado a mano con los
// mismos datos reales que habían fallado, 'low' vs 'medium' (el valor por defecto de Groq).
const GROQ_REASONING_EFFORT = 'low';

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
          reasoning_effort: GROQ_REASONING_EFFORT,
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
