import { SupabaseService } from './supabase.service';

type RealSupabaseClient = ReturnType<SupabaseService['getClient']>;

export interface PostgrestErrorLike {
  message: string;
  code?: string;
}

/**
 * Como el `PostgrestFilterBuilder` real: awaitable directamente (para inserts/upserts en bloque,
 * `data` llega como array) y, además, con `.single()` para cuando se sabe que hay una sola fila —
 * mismo objeto, dos formas de consumirlo, igual que el cliente real de Supabase.
 */
export interface WritableSelectResult extends PromiseLike<{
  data: unknown;
  error: PostgrestErrorLike | null;
}> {
  single: () => Promise<{ data: unknown; error: PostgrestErrorLike | null }>;
}

export interface WritableFilteredQuery extends PromiseLike<{
  data: unknown;
  error: PostgrestErrorLike | null;
}> {
  select: (columns: string) => WritableSelectResult;
}

export interface WritableTable {
  insert: (values: Record<string, unknown> | Record<string, unknown>[]) => WritableFilteredQuery;
  update: (values: Record<string, unknown>) => {
    eq: (column: string, value: unknown) => WritableFilteredQuery;
  };
  /**
   * Inserta o actualiza en una sola llamada atómica según la restricción `UNIQUE` indicada en
   * `onConflict` — usada por `questionnaires` (`UNIQUE(user_id)`) para no tener que decidir a mano
   * entre `insert`/`update` según exista ya un borrador guardado o no (evita la condición de carrera
   * de comprobar primero con un `select` y escribir después).
   */
  upsert: (
    values: Record<string, unknown> | Record<string, unknown>[],
    options: { onConflict: string },
  ) => WritableFilteredQuery;
}

/**
 * `.insert()`/`.update()` de `@supabase/postgrest-js` resuelven su parámetro a `never` cuando el
 * cliente no tiene un `Database` genérico real — su firma es
 * `Row extends Relation['Insert'] ? ... : never`, y sin un schema real `Relation['Insert']` no
 * existe (a diferencia de `.select()`/`.eq()`/`.delete()`, que no tienen esta restricción sobre la
 * forma del payload). `SupabaseService` no genera tipos desde el esquema real (`supabase gen types
 * typescript` sobre el schema real sería la solución completa — mejora futura, no aplicada en esta
 * sección) — mientras tanto, esta es la vía de escape estándar: relajar el tipo justo antes de
 * insert/update a una forma que sí declaramos a mano, sin perder el chequeo del resto del código.
 * El resultado sigue siendo `{data, error}` sin tipar, igual que ya lo es hoy con `.select()` en
 * este cliente — se narrowea después con `asUserRow` o similar en el punto de uso.
 */
export function writableTable(client: RealSupabaseClient, table: string): WritableTable {
  return client.from(table) as unknown as WritableTable;
}
