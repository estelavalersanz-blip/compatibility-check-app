import { createClient } from '@supabase/supabase-js';
import { getSupabaseTestEnv } from './supabase-test-env';

/**
 * Cliente `service_role` para montar fixtures de test (factories) — autorizado a saltarse RLS
 * porque está preparando el escenario, no probándolo (design.md, decisión 11).
 *
 * Sin tipo de retorno anotado a propósito: `createClient(...)` y el tipo `SupabaseClient`
 * exportado por `@supabase/supabase-js` no siempre coinciden estructuralmente en sus parámetros
 * de tipo genérico entre versiones — dejar que TypeScript infiera el tipo real evita ese desajuste.
 */
export function createSupabaseAdminTestClient() {
  const env = getSupabaseTestEnv();
  return createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Cliente autenticado con el JWT real de una cuenta del pool (`signInWithPassword`, nunca
 * `service_role`) — para ejercitar `auth.uid()`/RLS de verdad en los tests que lo necesiten.
 */
export async function createSupabaseUserTestClient(email: string, password: string) {
  const env = getSupabaseTestEnv();
  const client = createClient(env.supabaseUrl, env.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(`No se pudo autenticar con la cuenta de pool "${email}": ${error.message}`);
  }

  return client;
}
