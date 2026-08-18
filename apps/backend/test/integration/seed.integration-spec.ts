import { readFileSync } from 'node:fs';
import { join } from 'node:path';
// Reach deliberado fuera de apps/backend (tarea 18.3): `supabase/seed/seed.ts` es standalone a
// propósito (ver su comentario de cabecera) y no tiene su propio harness de test — este es el único
// sitio del monorepo con stack local de Supabase + pool de Auth + reset de tablas ya montado
// (`test/setup/`), así que el test del seed vive aquí en vez de duplicar esa infraestructura.
import { DEMO_ACCOUNT_EMAIL, runSeed } from '../../../../supabase/seed/seed';
import { resetDomainTables } from '../setup/reset-domain-tables';
import { createSupabaseAdminTestClient } from '../setup/supabase-admin-client';

const SEED_DIR = join(__dirname, '../../../../supabase/seed');
const SEED_SCRIPT_PATH = join(SEED_DIR, 'seed.ts');

// Tiempo de sobra para la Admin API de Auth + descarga/subida de 10 fotos + escrituras, dos veces
// seguidas dentro del mismo test (idempotencia) — bastante más que el timeout por defecto de Jest.
const SEED_TEST_TIMEOUT_MS = 120000;

function readSeedEmails(): string[] {
  const seedFile = JSON.parse(readFileSync(join(SEED_DIR, 'seed-users.json'), 'utf-8')) as {
    users: Array<{ email: string }>;
  };
  return [...seedFile.users.map((user) => user.email), DEMO_ACCOUNT_EMAIL];
}

/**
 * `resetDomainTables()` (`test/setup/`) nunca toca `auth.users` a propósito (reutiliza el pool de
 * `global-setup.ts` entre tests) — así que, a diferencia de las tablas de dominio, las cuentas de
 * Auth que este mismo test crea en una ejecución sobreviven a la siguiente. Sin esta limpieza, una
 * segunda ejecución de `npm run test:integration` contra el mismo stack local (sin
 * `npx supabase db reset` de por medio) encontraría las 11 cuentas ya creadas y `ensureAuthUser`
 * devolvería `created: false` correctamente — pero entonces este test, que sí espera partir de cero,
 * fallaría por un estado heredado de sí mismo, no por un fallo real de `seed.ts`. Se borran por
 * email antes del test para que sea repetible indefinidamente sin depender de un reset externo.
 */
async function deleteSeedAuthUsers(client: ReturnType<typeof createSupabaseAdminTestClient>) {
  const targetEmails = new Set(readSeedEmails());
  const { data, error } = await client.auth.admin.listUsers();
  if (error) {
    throw new Error(`No se pudieron listar las cuentas de Auth para limpiarlas: ${error.message}`);
  }
  const toDelete = data.users.filter((user) => user.email && targetEmails.has(user.email));
  await Promise.all(toDelete.map((user) => client.auth.admin.deleteUser(user.id)));
}

// ---- Formas mínimas leídas de vuelta, con el mismo patrón que el resto del proyecto (p. ej.
// chat.mapper.ts): el `as` vive siempre dentro de un `return`, nunca en una asignación local, para
// que `eslint --fix` no lo detecte como "innecesario" y lo elimine (visto de verdad en este mismo
// fichero: un `as` en una asignación local desapareció solo al lintear, dejando `any` sin avisar
// más que con el propio error de `no-unsafe-assignment`).

interface SeedUserProfileRow {
  photo_url: string | null;
  questionnaire_completed_at: string | null;
}
function asSeedUserProfileRow(row: unknown): SeedUserProfileRow | null {
  return row as SeedUserProfileRow | null;
}

interface SeedAnswerRow {
  questionId: number;
  question: string;
  answer: string;
}
interface QuestionnaireAnswersRow {
  answers: SeedAnswerRow[];
}
function asQuestionnaireAnswersRow(row: unknown): QuestionnaireAnswersRow | null {
  return row as QuestionnaireAnswersRow | null;
}

/**
 * Sección 18: `runSeed` contra el stack local real (nunca el proyecto real, design.md decisión 11).
 * Ejecuta el seed dos veces seguidas sobre el mismo estado para probar la idempotencia exigida por
 * la tarea 18.3 — la segunda ejecución no debe duplicar ni recrear nada.
 */
describe('supabase/seed/seed.ts — runSeed (tarea 18)', () => {
  const admin = createSupabaseAdminTestClient();

  // `beforeAll`, no `beforeEach`: de los dos `it()` de este fichero, solo el primero toca la BD —
  // limpiar antes de cada uno haría que el segundo (una comprobación estática del código fuente)
  // borrase de en medio las cuentas de Auth que el primero acababa de crear, sin necesidad.
  beforeAll(async () => {
    // Precondición explícita del enunciado de la tarea 18.3 ("sobre una base de datos vacía"): no
    // depender del orden en que Jest ejecute los demás ficheros de `test:integration`, NI de si este
    // mismo test ya se ejecutó antes contra el mismo stack local (ver `deleteSeedAuthUsers`).
    await resetDomainTables();
    await deleteSeedAuthUsers(admin);
  });

  it(
    'puebla las 15 cualidades, los 10 usuarios sintéticos y la cuenta de demostración, y una segunda ejecución es idéntica',
    async () => {
      const first = await runSeed(admin);

      expect(Object.keys(first.qualityIdsByName)).toHaveLength(15);
      expect(first.users).toHaveLength(10);
      expect(first.users.every((user) => user.created)).toBe(true);
      expect(new Set(first.users.map((user) => user.alias)).size).toBe(10); // alias únicos
      expect(first.demoAccount.created).toBe(true);

      for (const user of first.users) {
        const { data: profile, error: profileError } = await admin
          .from('users')
          .select('name, alias, photo_url, questionnaire_completed_at')
          .eq('id', user.id)
          .maybeSingle();
        expect(profileError).toBeNull();
        const profileRow = asSeedUserProfileRow(profile);
        expect(profileRow?.photo_url).toMatch(/^https?:\/\//);
        expect(profileRow?.questionnaire_completed_at).not.toBeNull();

        const { data: qualityRows } = await admin
          .from('user_qualities')
          .select('quality_id')
          .eq('user_id', user.id);
        expect(qualityRows).toHaveLength(5);

        const { data: questionnaireRow } = await admin
          .from('questionnaires')
          .select('answers')
          .eq('user_id', user.id)
          .maybeSingle();
        const answers = asQuestionnaireAnswersRow(questionnaireRow)?.answers ?? [];
        expect(answers).toHaveLength(36);
        expect(
          answers.every(
            (answer) =>
              typeof answer.questionId === 'number' &&
              answer.question.length > 0 &&
              answer.answer.length > 0,
          ),
        ).toBe(true);

        // Cada perfil sintético tiene su cuenta de auth.users correspondiente (18.3).
        const { data: authUser, error: authError } = await admin.auth.admin.getUserById(user.id);
        expect(authError).toBeNull();
        expect(authUser.user?.email).toBe(user.email);
      }

      // Cuenta de demostración: existe en Auth pero sin fila en `users` (tarea 18.5).
      const { data: demoAuthUser, error: demoAuthError } = await admin.auth.admin.getUserById(
        first.demoAccount.id,
      );
      expect(demoAuthError).toBeNull();
      expect(demoAuthUser.user?.email).toBe(DEMO_ACCOUNT_EMAIL);
      const { data: demoProfile } = await admin
        .from('users')
        .select('id')
        .eq('id', first.demoAccount.id)
        .maybeSingle();
      expect(demoProfile).toBeNull();

      // Ningún análisis de compatibilidad se disparó al seedear (nunca se publica
      // QuestionnaireCompletedEvent) — prueba indirecta pero arquitectónicamente sólida de que no se
      // llamó al proveedor de IA: sin evento, `matching`/`ai` nunca se enteran de estos usuarios.
      const { data: comparisons } = await admin.from('comparisons').select('id');
      expect(comparisons).toHaveLength(0);

      // Segunda ejecución sobre el mismo estado (sin resetear entre medias): idempotente.
      const second = await runSeed(admin);

      expect(second.qualityIdsByName).toEqual(first.qualityIdsByName);
      expect(second.users.every((user) => !user.created)).toBe(true);
      expect(second.users.map((user) => user.id)).toEqual(first.users.map((user) => user.id));
      expect(second.demoAccount.created).toBe(false);
      expect(second.demoAccount.id).toBe(first.demoAccount.id);

      const { data: qualitiesAfterSecondRun } = await admin.from('qualities').select('id');
      expect(qualitiesAfterSecondRun).toHaveLength(15);
      const { data: usersAfterSecondRun } = await admin.from('users').select('id');
      expect(usersAfterSecondRun).toHaveLength(10);
    },
    SEED_TEST_TIMEOUT_MS,
  );

  it('no importa nada de apps/backend/src ni menciona Groq/OpenRouter fuera de sus comentarios', () => {
    const source = readFileSync(SEED_SCRIPT_PATH, 'utf-8');
    // Busca solo en líneas de `import`/`require` reales, no en los comentarios que explican esta
    // misma regla (que sí mencionan "apps/backend/src" en prosa).
    const importLines = source.split('\n').filter((line) => /^\s*(import |.*require\()/.test(line));

    expect(importLines.some((line) => /groq|openrouter/i.test(line))).toBe(false);
    expect(importLines.some((line) => /from ['"]\.\./.test(line))).toBe(false);
  });
});
