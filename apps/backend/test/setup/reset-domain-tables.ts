import { Client } from 'pg';
import { getSupabaseTestEnv } from './supabase-test-env';

/**
 * Tablas de dominio del esquema descrito en `design.md` (decisión 3.2) — nunca `auth.users`, cuyo
 * pool de cuentas de test se reutiliza entre tests (ver `global-setup.ts`). Se listan aquí, no se
 * descubren dinámicamente, para que el reset sea explícito y no arrastre tablas nuevas por error.
 */
const DOMAIN_TABLES = [
  'messages',
  'conversations',
  'comparison_aggregated_results',
  'comparison_question_results',
  'comparisons',
  'questionnaires',
  'user_qualities',
  'qualities',
  'users',
] as const;

/**
 * Limpia todas las tablas de dominio entre tests de integración con un único `TRUNCATE ... CASCADE`
 * (design.md, decisión 11) — conecta directamente a Postgres con el cliente `pg` porque
 * `TRUNCATE` no es una operación que el cliente de Supabase (PostgREST) exponga.
 *
 * Tolerante a que todavía no exista ninguna tabla de dominio (antes de que la tarea 3.2 aplique
 * `0001_init.sql`, o en un test como el de la tarea 1.13 que no necesita ninguna): consulta primero
 * qué tablas de `DOMAIN_TABLES` existen de verdad y solo trunca esas — evita que `TRUNCATE` falle
 * con "relation ... does not exist" y rompa tests que no dependen del esquema de dominio.
 */
export async function resetDomainTables(): Promise<void> {
  const env = getSupabaseTestEnv();
  const client = new Client({ connectionString: env.dbUrl });
  await client.connect();
  try {
    const { rows } = await client.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = ANY($1::text[]);`,
      [Array.from(DOMAIN_TABLES)],
    );
    if (rows.length === 0) {
      return;
    }

    const tableList = rows.map((row) => `public.${row.tablename}`).join(', ');
    await client.query(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE;`);
  } finally {
    await client.end();
  }
}

/**
 * Registrable en `setupFilesAfterEnv` de la config de `test:integration`: aplica el reset después
 * de cada test sin tener que repetir el `afterEach` en cada fichero `*.integration-spec.ts`.
 */
afterEach(async () => {
  await resetDomainTables();
});
