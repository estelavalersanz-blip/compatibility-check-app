import { OwnUserProfile } from '@compatibility-check-app/shared-types';

/** Forma de la fila de `public.users` tal como la devuelve Supabase (snake_case). */
export interface UserRow {
  id: string;
  name: string;
  alias: string;
  photo_url: string | null;
  questionnaire_completed_at: string | null;
  needs_recalculation: boolean;
}

/** Columnas exactas a pedir en `.select(...)` para poder mapear con `toOwnUserProfile`. */
export const USER_ROW_COLUMNS =
  'id, name, alias, photo_url, questionnaire_completed_at, needs_recalculation';

/**
 * El cliente de Supabase sin tipar devuelve `any` en `data` — envolver el cast en una función con
 * tipo de retorno declarado evita que `eslint --fix` lo detecte como "innecesario" y lo quite (a
 * diferencia de un `as` suelto en una asignación o en un argumento, que sí se elimina y reintroduce
 * el error de lint la siguiente vez que se corre `--fix`).
 */
export function asUserRow(row: unknown): UserRow {
  return row as UserRow;
}

/** Traduce una fila de `users` (snake_case) + sus cualidades ya cargadas a `OwnUserProfile`. */
export function toOwnUserProfile(row: UserRow, qualityIds: string[]): OwnUserProfile {
  return {
    id: row.id,
    name: row.name,
    alias: row.alias,
    photoUrl: row.photo_url,
    questionnaireCompletedAt: row.questionnaire_completed_at,
    needsRecalculation: row.needs_recalculation,
    qualityIds,
  };
}
