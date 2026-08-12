/** Una llamada al LLM: instrucciones fijas de rol/formato + el lote concreto a analizar. */
export interface AiCompletionRequest {
  systemPrompt: string;
  userPrompt: string;
}

/**
 * Contrato común de cualquier proveedor de IA (design.md, decisión 4) — `ai-orchestrator.service.ts`
 * depende únicamente de esto, nunca de un SDK o cliente HTTP concreto: `groq.provider.ts` y
 * `openrouter.provider.ts` lo implementan por igual, y un proveedor futuro (p. ej. Anthropic Claude,
 * ver `docs/plan.md` "de free tier a proveedor de pago") solo necesita implementar este método, sin
 * tocar el orquestador. Devuelve el texto crudo de la respuesta del modelo — el parseo JSON y la
 * validación Zod son responsabilidad del orquestador, no del proveedor, para que añadir uno nuevo
 * nunca implique duplicar esa lógica.
 */
export interface AiProvider {
  complete(request: AiCompletionRequest): Promise<string>;
}

/**
 * Token de inyección para el `AiProvider` activo — un string en vez de la clase concreta como
 * token, porque `AiOrchestratorService` no debe depender de `GroqProvider` ni de `OpenRouterProvider`
 * por nombre (`ai.module.ts` decide cuál implementación se vincula a este token).
 */
export const AI_PROVIDER = 'AI_PROVIDER';
