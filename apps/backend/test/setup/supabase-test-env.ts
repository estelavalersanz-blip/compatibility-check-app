/**
 * Resuelve la configuración del stack local de Supabase (CLI, `supabase start`) usado por los
 * tests de integración (design.md, decisión 11). Nunca apunta al proyecto real: `SUPABASE_URL`
 * por defecto es siempre `http://127.0.0.1:54321` (local), y las claves `anon`/`service_role` del
 * stack local no son secretas (son las mismas por defecto de la CLI para cualquier desarrollador) —
 * pero exigimos definirlas explícitamente en vez de hardcodear un JWT que podría desincronizarse
 * si el `JWT_SECRET` local cambia. En local, `npm run test:integration` las exporta automáticamente
 * (ver `scripts/with-local-supabase.js`); en CI, el workflow las exporta tras `supabase start`.
 */
export interface SupabaseTestEnv {
  supabaseUrl: string;
  serviceRoleKey: string;
  anonKey: string;
  dbUrl: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} no está definida. Antes de \`npm run test:integration\` hace falta el stack local ` +
        `de Supabase corriendo, con sus credenciales exportadas (\`set -a\` para que \`eval\` las ` +
        `exporte de verdad al proceso, no solo a variables locales del shell):\n` +
        `  npx supabase start\n` +
        `  set -a\n` +
        `  eval "$(npx supabase status -o env \\\n` +
        `    --override-name api.url=SUPABASE_URL \\\n` +
        `    --override-name auth.anon_key=SUPABASE_ANON_KEY \\\n` +
        `    --override-name auth.service_role_key=SUPABASE_SERVICE_ROLE_KEY \\\n` +
        `    --override-name db.url=SUPABASE_DB_URL)"\n` +
        `  set +a\n` +
        `(ver \`.github/workflows/ci.yml\` para el mismo procedimiento tal como corre en CI).`,
    );
  }
  return value;
}

export function getSupabaseTestEnv(): SupabaseTestEnv {
  return {
    supabaseUrl: process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321',
    serviceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    anonKey: requireEnv('SUPABASE_ANON_KEY'),
    // Puerto por defecto del Postgres del stack local de la Supabase CLI.
    dbUrl: process.env.SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  };
}
