import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ComparisonQuestionDetail, ComparisonSummary } from '@compatibility-check-app/shared-types';
import {
  asAggregatedResultRows,
  asCandidateUserRows,
  asComparisonOwnershipRow,
  asComparisonRows,
  asQuestionResultRows,
  toComparisonQuestionDetail,
  toComparisonSummary,
  toUserProfile,
} from './comparison.mapper';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * Servicio normal, sin Command (design.md, decisión 6b): lecturas simples, igual que
 * `QualitiesService`/`UsersService.getOwnProfile`.
 */
@Injectable()
export class ComparisonsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /** Las comparaciones del propio usuario autenticado — nunca las de otro (siempre filtradas por
   *  `requester_user_id`, nunca a partir de un id de comparación recibido del cliente). */
  async findMyComparisons(userId: string): Promise<ComparisonSummary[]> {
    const client = this.supabaseService.getClient();

    const { data: comparisonRows, error: comparisonsError } = await client
      .from('comparisons')
      .select('id, requester_user_id, candidate_user_id, status, shared_qualities_count')
      .eq('requester_user_id', userId);
    if (comparisonsError) {
      throw new Error(`No se pudieron consultar las comparaciones: ${comparisonsError.message}`);
    }
    const comparisons = asComparisonRows(comparisonRows);
    if (comparisons.length === 0) {
      return [];
    }

    const candidateIds = comparisons.map((c) => c.candidate_user_id);
    const { data: candidateRows, error: candidatesError } = await client
      .from('users')
      .select('id, name, alias, photo_url, questionnaire_completed_at')
      .in('id', candidateIds);
    if (candidatesError) {
      throw new Error(`No se pudieron consultar los candidatos: ${candidatesError.message}`);
    }
    const candidatesById = new Map(asCandidateUserRows(candidateRows).map((row) => [row.id, row]));

    const completedIds = comparisons.filter((c) => c.status === 'completed').map((c) => c.id);
    const resultsByComparisonId = new Map<string, ComparisonSummary['result']>();
    if (completedIds.length > 0) {
      const { data: aggregatedRows, error: aggregatedError } = await client
        .from('comparison_aggregated_results')
        .select('comparison_id, result')
        .in('comparison_id', completedIds);
      if (aggregatedError) {
        throw new Error(
          `No se pudieron consultar los resultados agregados: ${aggregatedError.message}`,
        );
      }
      for (const row of asAggregatedResultRows(aggregatedRows)) {
        resultsByComparisonId.set(row.comparison_id, row.result);
      }
    }

    return comparisons.map((row) => {
      const candidateRow = candidatesById.get(row.candidate_user_id);
      if (!candidateRow) {
        throw new Error(`No se encontró el perfil del candidato "${row.candidate_user_id}"`);
      }
      return toComparisonSummary(
        row,
        toUserProfile(candidateRow),
        resultsByComparisonId.get(row.id) ?? null,
      );
    });
  }

  /**
   * Detalle de las 36 comparaciones por pregunta — exige que la comparación sea del usuario
   * autenticado (`comparisons` no tiene RLS/GRANT a `authenticated`, design.md decisión 3c: el
   * backend es el único punto que puede impedir que cualquier usuario lea cualquier comparación
   * ajena por id) y que ya esté `completed` (si no, no hay nada que detallar todavía).
   */
  async findDetail(comparisonId: string, userId: string): Promise<ComparisonQuestionDetail[]> {
    const client = this.supabaseService.getClient();

    const { data: comparisonRow, error: comparisonError } = await client
      .from('comparisons')
      .select('id, requester_user_id, status')
      .eq('id', comparisonId)
      .maybeSingle();
    if (comparisonError) {
      throw new Error(`No se pudo consultar la comparación: ${comparisonError.message}`);
    }
    const comparison = asComparisonOwnershipRow(comparisonRow);
    // Mismo 404 tanto si no existe como si existe pero no es del usuario autenticado — no revela
    // cuál de los dos casos es (minimización de información, no solo prevención de acceso).
    if (!comparison || comparison.requester_user_id !== userId) {
      throw new NotFoundException('No existe esa comparación');
    }
    if (comparison.status !== 'completed') {
      throw new BadRequestException('Esa comparación todavía no tiene un análisis completado');
    }

    const { data: resultRows, error: resultsError } = await client
      .from('comparison_question_results')
      .select('comparison_id, question_id, result')
      .eq('comparison_id', comparisonId);
    if (resultsError) {
      throw new Error(
        `No se pudieron consultar los resultados por pregunta: ${resultsError.message}`,
      );
    }

    return asQuestionResultRows(resultRows)
      .sort((a, b) => a.question_id - b.question_id)
      .map(toComparisonQuestionDetail);
  }
}
