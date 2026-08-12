import {
  AggregatedResult,
  ComparisonQuestionDetail,
  ComparisonResult,
  ComparisonSummary,
  UserProfile,
} from '@compatibility-check-app/shared-types';

/** Forma de una fila de `comparisons` tal como la devuelve Supabase (snake_case). */
export interface ComparisonRow {
  id: string;
  requester_user_id: string;
  candidate_user_id: string;
  status: 'pending' | 'analyzing' | 'completed' | 'error';
  shared_qualities_count: number;
}
export function asComparisonRows(rows: unknown): ComparisonRow[] {
  return (rows as ComparisonRow[] | null) ?? [];
}

/** Solo las columnas que necesita la comprobación de propiedad de `GET /comparisons/:id/detail`. */
export interface ComparisonOwnershipRow {
  id: string;
  requester_user_id: string;
  status: 'pending' | 'analyzing' | 'completed' | 'error';
}
export function asComparisonOwnershipRow(row: unknown): ComparisonOwnershipRow | null {
  return row as ComparisonOwnershipRow | null;
}

/** Mismas columnas que `user-profile.mapper.ts` necesita para `UserProfile` — reutilizada aquí para
 *  no volver a declarar una forma casi idéntica. */
export interface CandidateUserRow {
  id: string;
  name: string;
  alias: string;
  photo_url: string | null;
  questionnaire_completed_at: string | null;
}
export function asCandidateUserRows(rows: unknown): CandidateUserRow[] {
  return (rows as CandidateUserRow[] | null) ?? [];
}

export function toUserProfile(row: CandidateUserRow): UserProfile {
  return {
    id: row.id,
    name: row.name,
    alias: row.alias,
    photoUrl: row.photo_url,
    questionnaireCompletedAt: row.questionnaire_completed_at,
  };
}

export interface AggregatedResultRow {
  comparison_id: string;
  result: AggregatedResult;
}
export function asAggregatedResultRows(rows: unknown): AggregatedResultRow[] {
  return (rows as AggregatedResultRow[] | null) ?? [];
}

export function toComparisonSummary(
  row: ComparisonRow,
  candidate: UserProfile,
  result: AggregatedResult | null,
): ComparisonSummary {
  return {
    id: row.id,
    status: row.status,
    candidate,
    sharedQualitiesCount: row.shared_qualities_count,
    result,
  };
}

export interface QuestionResultRow {
  comparison_id: string;
  question_id: number;
  result: ComparisonResult;
}
export function asQuestionResultRows(rows: unknown): QuestionResultRow[] {
  return (rows as QuestionResultRow[] | null) ?? [];
}

/**
 * Lista explícita de campos a incluir (no una exclusión de `id_usuario_1/2`/`respuesta_usuario_1/2`)
 * — así, si `ComparisonResult` ganara algún día un campo sensible nuevo, este mapeo no lo expone por
 * omisión (design.md, decisión 5d: "el filtrado se hace en la propia capa de aplicación").
 */
export function toComparisonQuestionDetail(row: QuestionResultRow): ComparisonQuestionDetail {
  const { result } = row;
  return {
    questionId: row.question_id,
    pregunta: result.pregunta,
    compatibilidad: result.compatibilidad,
    emocional: result.emocional,
    valores: result.valores,
    estilo: result.estilo,
    intereses: result.intereses,
    madurez: result.madurez,
    apertura: result.apertura,
    explicación: result.explicación,
  };
}
