import { randomUUID } from 'node:crypto';
import { SupabaseClient } from '@supabase/supabase-js';

export interface CreateTestUserOptions {
  /** Id de una cuenta `auth.users` ya existente (normalmente del pool, ver `test-account-pool.ts`). */
  authUserId: string;
  name?: string;
  alias?: string;
  photoUrl?: string;
  needsRecalculation?: boolean;
  questionnaireCompletedAt?: string | null;
}

/**
 * Inserta una fila de perfil (`users`) para una cuenta de Auth ya existente, con el cliente
 * `service_role` (autorizado a saltarse RLS porque está montando el escenario, no probándolo —
 * design.md, decisión 11). Columnas tomadas literalmente de `design.md`, decisión 3.2.
 */
export async function createTestUser(
  supabaseAdmin: SupabaseClient,
  options: CreateTestUserOptions,
): Promise<{ id: string; alias: string }> {
  const alias = options.alias ?? `test-user-${randomUUID().slice(0, 8)}`;

  const { data, error } = await supabaseAdmin
    .from('users')
    .insert({
      id: options.authUserId,
      name: options.name ?? 'Usuario de test',
      alias,
      photo_url: options.photoUrl ?? null,
      needs_recalculation: options.needsRecalculation ?? false,
      questionnaire_completed_at: options.questionnaireCompletedAt ?? null,
    })
    .select('id, alias')
    .single();

  if (error) {
    throw new Error(
      `No se pudo crear el perfil de test para "${options.authUserId}": ${error.message}`,
    );
  }

  return data;
}
