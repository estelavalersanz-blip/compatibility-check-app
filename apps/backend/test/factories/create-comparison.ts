import { SupabaseClient } from '@supabase/supabase-js';

export interface CreateComparisonOptions {
  requesterUserId: string;
  candidateUserId: string;
  status?: 'pending' | 'analyzing' | 'completed' | 'error';
}

/**
 * Inserta una fila de `comparisons` entre dos usuarios de test.
 *
 * ⚠️ Columnas provisionales: `requester_user_id`/`candidate_user_id`/`status` están confirmadas
 * literalmente por `design.md` (decisión 9 y el flujo de `matching`), pero el resto del esquema de
 * `comparisons` se termina de fijar en la migración de la tarea 3.2 — revisa esta factory contra
 * `supabase/migrations/0001_init.sql` en cuanto exista.
 */
export async function createComparison(
  supabaseAdmin: SupabaseClient,
  options: CreateComparisonOptions,
): Promise<{ id: string }> {
  const { data, error } = await supabaseAdmin
    .from('comparisons')
    .insert({
      requester_user_id: options.requesterUserId,
      candidate_user_id: options.candidateUserId,
      status: options.status ?? 'pending',
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(
      `No se pudo crear la comparación de test entre "${options.requesterUserId}" y ` +
        `"${options.candidateUserId}": ${error.message}`,
    );
  }

  return data;
}
