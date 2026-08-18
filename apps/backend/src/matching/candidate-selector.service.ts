import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { SupabaseService } from '../supabase/supabase.service';
import { writableTable } from '../supabase/writable-table';

/** Candidato ya persistido como fila `comparisons` en `pending`. */
export interface SelectedCandidate {
  comparisonId: string;
  candidateUserId: string;
  sharedQualitiesCount: number;
}

interface CandidateUserRow {
  id: string;
  questionnaire_completed_at: string | null;
}
function asCandidateUserRows(rows: unknown): CandidateUserRow[] {
  return (rows as CandidateUserRow[] | null) ?? [];
}

interface UserQualityRow {
  quality_id: string;
}
function asQualityIds(rows: unknown): string[] {
  return ((rows as UserQualityRow[] | null) ?? []).map((row) => row.quality_id);
}

interface CandidateQualityRow {
  user_id: string;
  quality_id: string;
}
function asCandidateQualityRows(rows: unknown): CandidateQualityRow[] {
  return (rows as CandidateQualityRow[] | null) ?? [];
}

interface InsertedComparisonRow {
  id: string;
  candidate_user_id: string;
  shared_qualities_count: number;
}
function asInsertedComparisonRows(rows: unknown): InsertedComparisonRow[] {
  return (rows as InsertedComparisonRow[] | null) ?? [];
}

/**
 * Selección de hasta 3 candidatos por cualidades compartidas (design.md, decisión 5): consulta los
 * usuarios con cuestionario ya completo (excluyendo al propio solicitante), cuenta cuántas de sus
 * cualidades coinciden con las 5 del solicitante, y crea las filas `comparisons` en `pending` para
 * los 3 con más coincidencias (desempate por antigüedad — `questionnaire_completed_at` más
 * temprano). `[]` sin crear nada si no hay ningún candidato disponible — nunca lanza por eso.
 *
 * Solo escribe filas con `requester_user_id` = el `userId` recibido: nunca consulta ni modifica
 * comparaciones de ningún otro usuario (regla de cálculo único, design.md decisión 5, tarea 8.3).
 */
@Injectable()
export class CandidateSelectorService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(CandidateSelectorService.name);
  }

  async selectCandidates(requesterUserId: string): Promise<SelectedCandidate[]> {
    const client = this.supabaseService.getClient();

    const { data: requesterQualityRows, error: requesterQualitiesError } = await client
      .from('user_qualities')
      .select('quality_id')
      .eq('user_id', requesterUserId);
    if (requesterQualitiesError) {
      throw new Error(
        `No se pudieron consultar las cualidades del solicitante: ${requesterQualitiesError.message}`,
      );
    }
    const requesterQualityIds = new Set(asQualityIds(requesterQualityRows));

    const { data: otherUserRows, error: usersError } = await client
      .from('users')
      .select('id, questionnaire_completed_at')
      .neq('id', requesterUserId);
    if (usersError) {
      throw new Error(`No se pudieron consultar los candidatos disponibles: ${usersError.message}`);
    }
    const completedCandidates = asCandidateUserRows(otherUserRows).filter(
      (row) => row.questionnaire_completed_at !== null,
    );

    if (completedCandidates.length === 0) {
      this.logger.info({ userId: requesterUserId, selected: [] }, 'No hay candidatos disponibles');
      return [];
    }

    const candidateIds = completedCandidates.map((row) => row.id);
    const { data: candidateQualityRows, error: candidateQualitiesError } = await client
      .from('user_qualities')
      .select('user_id, quality_id')
      .in('user_id', candidateIds);
    if (candidateQualitiesError) {
      throw new Error(
        `No se pudieron consultar las cualidades de los candidatos: ${candidateQualitiesError.message}`,
      );
    }

    const qualitiesByCandidate = new Map<string, Set<string>>();
    for (const row of asCandidateQualityRows(candidateQualityRows)) {
      const set = qualitiesByCandidate.get(row.user_id) ?? new Set<string>();
      set.add(row.quality_id);
      qualitiesByCandidate.set(row.user_id, set);
    }

    const ranked = completedCandidates
      .map((row) => ({
        candidateUserId: row.id,
        // No puede ser null aquí: ya se filtró arriba.
        questionnaireCompletedAt: row.questionnaire_completed_at as string,
        sharedQualitiesCount: countShared(
          requesterQualityIds,
          qualitiesByCandidate.get(row.id) ?? new Set<string>(),
        ),
      }))
      .sort((a, b) => {
        if (b.sharedQualitiesCount !== a.sharedQualitiesCount) {
          return b.sharedQualitiesCount - a.sharedQualitiesCount;
        }
        // Antigüedad: cuestionario completado antes gana el desempate (orden ascendente de fecha).
        return a.questionnaireCompletedAt.localeCompare(b.questionnaireCompletedAt);
      })
      .slice(0, 3);

    const { data: insertedRows, error: insertError } = await writableTable(client, 'comparisons')
      .insert(
        ranked.map((r) => ({
          requester_user_id: requesterUserId,
          candidate_user_id: r.candidateUserId,
          shared_qualities_count: r.sharedQualitiesCount,
        })),
      )
      .select('id, candidate_user_id, shared_qualities_count');
    if (insertError) {
      throw new Error(`No se pudieron crear las comparaciones: ${insertError.message}`);
    }

    const selected = asInsertedComparisonRows(insertedRows).map((row) => ({
      comparisonId: row.id,
      candidateUserId: row.candidate_user_id,
      sharedQualitiesCount: row.shared_qualities_count,
    }));

    this.logger.info(
      {
        userId: requesterUserId,
        selected: selected.map((s) => ({
          candidateUserId: s.candidateUserId,
          sharedQualitiesCount: s.sharedQualitiesCount,
        })),
      },
      'Candidatos seleccionados',
    );

    return selected;
  }
}

function countShared(a: Set<string>, b: Set<string>): number {
  let count = 0;
  for (const value of a) {
    if (b.has(value)) {
      count++;
    }
  }
  return count;
}
