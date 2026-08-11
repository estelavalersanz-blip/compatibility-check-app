import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseTestEnv } from './supabase-test-env';
import { poolFilePath, type TestAccount } from './test-account-pool';

// Crear una cuenta de Auth es la operación más lenta del ciclo de test de integración (design.md,
// decisión 11) — un pool pequeño y fijo, creado una sola vez al arrancar toda la suite, evita
// recrearlas por test o por archivo.
const POOL_SIZE = 4;
const EMAIL_DOMAIN = 'integration-test.afinia.local';

/**
 * `globalSetup` de Jest para `test:integration`: crea (o reutiliza, si ya existían de una
 * ejecución anterior contra el mismo stack local) un pool fijo de cuentas `auth.users` contra el
 * stack local de Supabase, y expone sus credenciales a los tests vía fichero (ver
 * `test-account-pool.ts`) — nunca contra el proyecto real.
 */
export default async function globalSetup(): Promise<void> {
  const env = getSupabaseTestEnv();
  const admin = createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const accounts: TestAccount[] = [];

  for (let i = 0; i < POOL_SIZE; i++) {
    const email = `pool-${i}@${EMAIL_DOMAIN}`;
    const password = `TestPool-${randomUUID()}`;

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (!createError && created.user) {
      accounts.push({ id: created.user.id, email, password });
      continue;
    }

    // Ya existe de una ejecución anterior contra el mismo stack local: la reutilizamos en vez de
    // fallar, pero necesitamos resetear su contraseña porque no conocemos la que se usó antes.
    const { data: listed, error: listError } = await admin.auth.admin.listUsers();
    if (listError) {
      throw new Error(
        `No se pudo crear ni recuperar la cuenta de pool "${email}": ${listError.message}`,
      );
    }

    const existing = listed.users.find((user) => user.email === email);
    if (!existing) {
      throw new Error(`No se pudo crear la cuenta de pool "${email}": ${createError?.message}`);
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(existing.id, { password });
    if (updateError) {
      throw new Error(`No se pudo restablecer la contraseña de "${email}": ${updateError.message}`);
    }

    accounts.push({ id: existing.id, email, password });
  }

  writeFileSync(poolFilePath(), JSON.stringify(accounts, null, 2), 'utf-8');
}
