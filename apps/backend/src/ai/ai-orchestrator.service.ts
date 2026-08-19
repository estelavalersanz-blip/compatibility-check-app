import { Inject, Injectable } from '@nestjs/common';
import { AnswerSet } from '@compatibility-check-app/shared-types';
import { PinoLogger } from 'nestjs-pino';
import { AI_PROVIDER } from './ai-provider.interface';
import type { AiProvider } from './ai-provider.interface';
import {
  buildCorrectionPrompt,
  buildSystemPrompt,
  buildUserPrompt,
  PromptQuestionPair,
} from './prompts/compatibility-prompt';
import { parseComparisonResultBatch } from './schemas/comparison-result.schema';
import {
  BLOCK_WEIGHTS,
  computeAggregatedResult,
  QuestionResultPair,
} from '../comparisons/weighting.util';
import { SupabaseService } from '../supabase/supabase.service';
import { writableTable } from '../supabase/writable-table';

const BATCH_SIZE = 6;
const MAX_CONCURRENT_BATCHES = 2;
const MAX_ATTEMPTS_PER_BATCH = 3;

/** Preguntas por bloque (design.md decisión 6c) — mismo tamaño que `BATCH_SIZE`, pero es un dato
 *  distinto (tamaño de cada bloque del cuestionario, no de un lote de llamada a la IA), nombrado
 *  aparte a propósito para no confundir ambos conceptos. */
const QUESTIONS_PER_BLOCK = 6;

/**
 * Token de inyección del backoff entre reintentos (mismo patrón que `AI_PROVIDER` en
 * `ai-provider.interface.ts`) — `ai.module.ts` lo vincula a `PRODUCTION_RETRY_BACKOFF_MS`; los
 * tests construyen la clase directamente (`new AiOrchestratorService(...)`, sin pasar por el
 * contenedor de Nest) y usan el valor por defecto del propio constructor, ínfimo a propósito.
 */
export const AI_RETRY_BACKOFF_MS = 'AI_RETRY_BACKOFF_MS';

/**
 * Bug real de producción (2026-08-19): con solo 50/150ms de espera (valor histórico, pensado
 * únicamente para no ralentizar los tests), los 3 reintentos se agotaban casi al instante contra el
 * límite gratuito de Groq de 8.000 tokens/minuto (`openai/gpt-oss-120b`) — Groq pide esperar 20-30s
 * reales tras un 429 ("Please try again in 26.1s", confirmado contra la API real con datos que
 * habían fallado en producción), así que ningún reintento llegaba a tener margen real antes de
 * volver a fallar, y la comparación quedaba en `error` para siempre. 10s/25s da ese margen sin
 * bloquear la UI (el usuario está en `features/processing`, con spinner y sondeo propio — nunca
 * esperando síncronamente esta llamada).
 */
export const PRODUCTION_RETRY_BACKOFF_MS: number[] = [10_000, 25_000];

/** Backoff por defecto SOLO para tests que construyen la clase directamente sin especificar uno —
 *  ínfimo a propósito, igual que el valor histórico: valores realistas harían la suite lenta sin
 *  aportar nada distinto a validar en esos tests (el valor real se prueba aparte, sin temporizadores
 *  reales, comprobando directamente `PRODUCTION_RETRY_BACKOFF_MS`). */
const TEST_DEFAULT_BACKOFF_MS = [50, 150];

interface ComparisonRow {
  id: string;
  requester_user_id: string;
  candidate_user_id: string;
}
function asComparisonRow(row: unknown): ComparisonRow | null {
  return row as ComparisonRow | null;
}

interface QuestionnaireAnswersRow {
  answers: AnswerSet;
}
function asQuestionnaireAnswersRow(row: unknown): QuestionnaireAnswersRow | null {
  return row as QuestionnaireAnswersRow | null;
}

type BatchOutcome = { success: true; pairs: QuestionResultPair[] } | { success: false };

function isSuccessOutcome(
  outcome: BatchOutcome,
): outcome is { success: true; pairs: QuestionResultPair[] } {
  return outcome.success;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/** Combina las respuestas de ambos usuarios pregunta por pregunta, ordenadas por `questionId` — no
 *  se asume que el array almacenado ya viene en ese orden, se ordena explícitamente. */
function buildQuestionPairs(
  user1Answers: AnswerSet,
  user2Answers: AnswerSet,
): PromptQuestionPair[] {
  const byQuestionId = new Map(user2Answers.map((answer) => [answer.questionId, answer]));

  return [...user1Answers]
    .sort((a, b) => a.questionId - b.questionId)
    .map((answer1) => {
      const answer2 = byQuestionId.get(answer1.questionId);
      if (!answer2) {
        throw new Error(
          `Falta la respuesta a la pregunta ${answer1.questionId} del segundo usuario`,
        );
      }
      return {
        questionId: answer1.questionId,
        question: answer1.question,
        answerUser1: answer1.answer,
        answerUser2: answer2.answer,
      };
    });
}

/**
 * Selecciona 1 pregunta al azar de cada uno de los 6 bloques (design.md decisión 6d) — nunca las 36
 * completas. Mantiene la representación proporcional de los 6 pesos de bloque
 * (`BLOCK_WEIGHTS`, 5/5/15/20/25/30%) en vez de un muestreo puramente aleatorio sobre las 36, que
 * podría dejar fuera por completo el bloque de mayor peso (o sobrerrepresentar el de menor peso) —
 * sesgo real detectado antes de implementar esto, no solo teórico. Reduce el análisis de 36 a 6
 * preguntas por comparación para mantenerse dentro del presupuesto de tokens/minuto del proveedor de
 * IA (bug real de producción, 2026-08-19 — ver `PRODUCTION_RETRY_BACKOFF_MS`): medido contra la API
 * real de Groq, 6 preguntas caben con margen en el límite gratuito incluso con las 3 comparaciones
 * de una tacada, cosa que 36 no permitían ni con `reasoning_effort: 'low'`.
 *
 * `randomFn` inyectable solo para tests deterministas (por defecto `Math.random` — a diferencia de
 * los scripts de Workflow, el código de la aplicación en ejecución no tiene esa restricción).
 */
export function selectSampledQuestionIds(randomFn: () => number = Math.random): number[] {
  return BLOCK_WEIGHTS.map((_, block) => {
    const firstIdInBlock = block * QUESTIONS_PER_BLOCK + 1;
    const offsetWithinBlock = Math.floor(randomFn() * QUESTIONS_PER_BLOCK);
    return firstIdInBlock + offsetWithinBlock;
  });
}

/** Como máximo `limit` llamadas de `worker` en curso a la vez — ejecuta las `items.length` tareas
 *  hasta completarlas todas, nunca más de `limit` simultáneas (design.md, decisión 6). Exportada
 *  para poder probar el mecanismo de concurrencia en aislamiento (`analyzeComparison` ya no genera
 *  más de un lote con la configuración actual de 6 preguntas muestreadas — ver
 *  `selectSampledQuestionIds` —, así que ya no lo ejercita indirectamente con varios lotes reales). */
export async function runWithConcurrencyLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function runNext(): Promise<void> {
    const index = cursor++;
    if (index >= items.length) {
      return;
    }
    results[index] = await worker(items[index], index);
    await runNext();
  }

  const workerCount = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => runNext()));
  return results;
}

/**
 * Orquesta el análisis de IA de una comparación completa (design.md, decisiones 4, 6 y 6d): en vez
 * de las 36 preguntas, selecciona 6 (1 al azar por bloque, `selectSampledQuestionIds`) y las envía
 * en un único lote a la IA, valida la respuesta, reintenta hasta 3 veces con backoff ante una
 * respuesta inválida, y al terminar deja la comparación en `completed` (con los 6 resultados
 * muestreados y el agregado persistidos) o en `error` (sin persistir nada nuevo) — nunca a medias.
 * Reutilizable tanto para el primer análisis como para un reintento manual
 * (`AnalyzeComparisonCommand`, tarea 9.13): siempre repite desde cero, borrando cualquier resultado
 * previo de esa comparación antes de empezar, y volviendo a muestrear 6 preguntas nuevas al azar
 * (no necesariamente las mismas que la vez anterior).
 */
@Injectable()
export class AiOrchestratorService {
  constructor(
    @Inject(AI_PROVIDER) private readonly aiProvider: AiProvider,
    private readonly supabaseService: SupabaseService,
    private readonly logger: PinoLogger,
    @Inject(AI_RETRY_BACKOFF_MS)
    private readonly retryBackoffMs: number[] = TEST_DEFAULT_BACKOFF_MS,
  ) {
    this.logger.setContext(AiOrchestratorService.name);
  }

  async analyzeComparison(comparisonId: string): Promise<void> {
    const comparison = await this.fetchComparison(comparisonId);
    const [requesterAnswers, candidateAnswers] = await Promise.all([
      this.fetchAnswers(comparison.requester_user_id),
      this.fetchAnswers(comparison.candidate_user_id),
    ]);

    await this.updateStatus(comparisonId, 'analyzing');
    await this.clearPreviousResults(comparisonId);

    const pairs = buildQuestionPairs(requesterAnswers, candidateAnswers);
    const sampledQuestionIds = new Set(selectSampledQuestionIds());
    const sampledPairs = pairs.filter((pair) => sampledQuestionIds.has(pair.questionId));
    const batches = chunk(sampledPairs, BATCH_SIZE);

    const outcomes = await runWithConcurrencyLimit(batches, MAX_CONCURRENT_BATCHES, (batch) =>
      this.processBatch(
        comparisonId,
        comparison.requester_user_id,
        comparison.candidate_user_id,
        batch,
      ),
    );

    const failed = outcomes.some((outcome) => !outcome.success);
    if (failed) {
      await this.updateStatus(comparisonId, 'error');
      this.logger.error(
        { comparisonId },
        'Análisis fallido: al menos un lote no pasó validación tras los reintentos',
      );
      return;
    }

    // `failed` ya confirmó que ningún outcome tiene `success: false` — el filtro es solo para que
    // TypeScript estreche el tipo antes de leer `.pairs`, no porque pueda quedar alguno fuera.
    const allResults = outcomes.filter(isSuccessOutcome).flatMap((outcome) => outcome.pairs);
    await this.persistResults(comparisonId, allResults);
    await this.updateStatus(comparisonId, 'completed');
    this.logger.info({ comparisonId }, 'Análisis de compatibilidad completado');
  }

  private async processBatch(
    comparisonId: string,
    user1Id: string,
    user2Id: string,
    batch: PromptQuestionPair[],
  ): Promise<BatchOutcome> {
    const questionIds = batch.map((pair) => pair.questionId);
    let lastErrorReason = 'sin detalle';

    for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_BATCH; attempt++) {
      this.logger.info({ comparisonId, questionIds, attempt }, 'Enviando lote al proveedor de IA');

      try {
        const userPrompt =
          attempt === 1
            ? buildUserPrompt(batch, user1Id, user2Id)
            : buildCorrectionPrompt(batch, user1Id, user2Id, lastErrorReason);

        const rawContent = await this.aiProvider.complete({
          systemPrompt: buildSystemPrompt(),
          userPrompt,
        });

        const parsedJson: unknown = JSON.parse(rawContent);
        const validated = parseComparisonResultBatch(parsedJson);

        if (!validated.success) {
          lastErrorReason = validated.error.message;
          throw new Error(lastErrorReason);
        }

        this.logger.info({ comparisonId, questionIds, attempt }, 'Lote válido recibido');
        return {
          success: true,
          pairs: batch.map((pair, index) => ({
            questionId: pair.questionId,
            result: validated.data[index],
          })),
        };
      } catch (error) {
        lastErrorReason = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          { comparisonId, questionIds, attempt, reason: lastErrorReason },
          'Lote inválido o fallido, se reintentará si quedan intentos',
        );
        if (attempt < MAX_ATTEMPTS_PER_BATCH) {
          await sleep(this.retryBackoffMs[attempt - 1]);
        }
      }
    }

    this.logger.error({ comparisonId, questionIds }, 'Lote fallido tras agotar los reintentos');
    return { success: false };
  }

  private async fetchComparison(comparisonId: string): Promise<ComparisonRow> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('comparisons')
      .select('id, requester_user_id, candidate_user_id')
      .eq('id', comparisonId)
      .maybeSingle();
    if (error) {
      throw new Error(`No se pudo consultar la comparación: ${error.message}`);
    }
    const row = asComparisonRow(data);
    if (!row) {
      throw new Error(`No existe la comparación "${comparisonId}"`);
    }
    return row;
  }

  private async fetchAnswers(userId: string): Promise<AnswerSet> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('questionnaires')
      .select('answers')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      throw new Error(`No se pudo consultar el cuestionario de "${userId}": ${error.message}`);
    }
    const row = asQuestionnaireAnswersRow(data);
    if (!row) {
      throw new Error(`El usuario "${userId}" no tiene cuestionario guardado`);
    }
    return row.answers;
  }

  private async updateStatus(
    comparisonId: string,
    status: 'analyzing' | 'completed' | 'error',
  ): Promise<void> {
    const { error } = await writableTable(this.supabaseService.getClient(), 'comparisons')
      .update({ status })
      .eq('id', comparisonId)
      .select('id')
      .single();
    if (error) {
      throw new Error(`No se pudo actualizar el estado de la comparación: ${error.message}`);
    }
  }

  private async clearPreviousResults(comparisonId: string): Promise<void> {
    const client = this.supabaseService.getClient();

    const { error: questionResultsError } = await client
      .from('comparison_question_results')
      .delete()
      .eq('comparison_id', comparisonId);
    if (questionResultsError) {
      throw new Error(
        `No se pudieron limpiar los resultados anteriores: ${questionResultsError.message}`,
      );
    }

    const { error: aggregatedError } = await client
      .from('comparison_aggregated_results')
      .delete()
      .eq('comparison_id', comparisonId);
    if (aggregatedError) {
      throw new Error(`No se pudo limpiar el agregado anterior: ${aggregatedError.message}`);
    }
  }

  private async persistResults(comparisonId: string, results: QuestionResultPair[]): Promise<void> {
    const client = this.supabaseService.getClient();

    const { error: insertError } = await writableTable(client, 'comparison_question_results')
      .insert(
        results.map((pair) => ({
          comparison_id: comparisonId,
          question_id: pair.questionId,
          result: pair.result,
        })),
      )
      .select('id');
    if (insertError) {
      throw new Error(`No se pudieron guardar los resultados por pregunta: ${insertError.message}`);
    }

    const aggregated = computeAggregatedResult(results);
    const { error: aggregatedError } = await writableTable(client, 'comparison_aggregated_results')
      .insert({ comparison_id: comparisonId, result: aggregated })
      .select('id');
    if (aggregatedError) {
      throw new Error(`No se pudo guardar el resultado agregado: ${aggregatedError.message}`);
    }
  }
}
