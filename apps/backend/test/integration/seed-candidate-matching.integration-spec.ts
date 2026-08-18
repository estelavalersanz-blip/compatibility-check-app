import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PinoLogger } from 'nestjs-pino';
import { CandidateSelectorService } from '../../src/matching/candidate-selector.service';
import { SupabaseService } from '../../src/supabase/supabase.service';
// Reach deliberado fuera de apps/backend (mismo motivo que seed.integration-spec.ts): `runSeed` es
// el único productor real de los 10 usuarios sintéticos que este test necesita como candidatos.
import { runSeed } from '../../../../supabase/seed/seed';
import { createTestQuestionnaire, createTestUser } from '../factories';
import { resetDomainTables } from '../setup/reset-domain-tables';
import { createSupabaseAdminTestClient } from '../setup/supabase-admin-client';
import { getTestAccountPool } from '../setup/test-account-pool';

const SEED_DIR = join(__dirname, '../../../../supabase/seed');

// Mismo motivo que seed.integration-spec.ts: `runSeed` real hace Admin API de Auth + descarga/sube
// 10 fotos — bastante más que el timeout por defecto de Jest.
const TEST_TIMEOUT_MS = 120000;

// Cualidad elegida por inspección de seed-users.json: la comparten exactamente 3 de los 10
// arquetipos (elena_luna, laura_generosa, pablo_honesto) — ni todos ni ninguno, así que sirve para
// comprobar que el matching real distingue candidatos de no-candidatos, no solo que "algo" salga.
const SHARED_QUALITY_NAME = 'Empatía';

interface SeedUserFixture {
  alias: string;
  qualities: string[];
}

/**
 * Alias de los usuarios sembrados que tienen `qualityName` entre sus 5 cualidades, leído del propio
 * fixture (`seed-users.json`) en vez de hardcodeado a mano: si algún día se regenera el fichero con
 * otro reparto, este test lo detecta solo (falla el `expect` de la premisa, más abajo, con un
 * mensaje claro) en vez de comparar en silencio contra una lista ya obsoleta.
 */
function readOverlapAliases(qualityName: string): Set<string> {
  const seedFile = JSON.parse(readFileSync(join(SEED_DIR, 'seed-users.json'), 'utf-8')) as {
    users: SeedUserFixture[];
  };
  return new Set(
    seedFile.users.filter((user) => user.qualities.includes(qualityName)).map((user) => user.alias),
  );
}

// Mismo patrón que ai-orchestrator.integration-spec.ts: un logger silencioso basta, lo que importa
// aquí es la escritura en BD real, no qué se loguea.
function buildSilentLogger(): PinoLogger {
  return {
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
    setContext: () => undefined,
  } as unknown as PinoLogger;
}

function buildCompletedAnswers(): Array<{ questionId: number; question: string; answer: string }> {
  return Array.from({ length: 36 }, (_, i) => ({
    questionId: i + 1,
    question: `Pregunta ${i + 1}`,
    answer: `Respuesta ${i + 1}`,
  }));
}

interface ComparisonRow {
  candidate_user_id: string;
  status: string;
}
// Mismo motivo que `asSeedUserProfileRow` (seed.integration-spec.ts): el `as` vive en un `return`,
// nunca en una asignación local, para que `eslint --fix` no lo detecte como "innecesario" y lo
// elimine dejando `any` sin avisar.
function asComparisonRows(rows: unknown): ComparisonRow[] {
  return (rows as ComparisonRow[] | null) ?? [];
}

/**
 * Hueco real de cobertura (spec `seed-data`, escenario "Ejecución del seed de usuarios": los 10
 * sembrados deben quedar "disponibles como candidatos para nuevos usuarios"). Hasta ahora nadie lo
 * comprobaba de verdad: `candidate-selector.service.spec.ts` prueba `selectCandidates` contra un
 * fake en memoria con datos inventados, y `seed.integration-spec.ts` prueba que `runSeed` puebla
 * bien las tablas — pero nunca los dos a la vez. Aquí se ejecuta el seed real y, sobre esos mismos
 * 10 usuarios reales, el servicio de matching real (sin fakes de ningún tipo, mismo cliente
 * `service_role` que el resto de tests de integración) para confirmar que de verdad salen
 * seleccionados como candidatos, end-to-end.
 */
describe('candidate-selector — matching real contra los usuarios del seed (spec seed-data)', () => {
  const admin = createSupabaseAdminTestClient();

  beforeAll(async () => {
    // A diferencia de seed.integration-spec.ts, aquí no hace falta borrar antes las cuentas de
    // Auth de los sembrados (su `deleteSeedAuthUsers`): aquel test exige que las 10 cuentas se
    // creen de cero (`created: true`) para probar la idempotencia de `runSeed`, algo que este test
    // no comprueba. Aquí solo importa que las tablas de dominio partan vacías — `runSeed` reutiliza
    // sin problema cualquier cuenta de Auth que ya exista de una ejecución anterior
    // (`ensureAuthUser`) y repuebla igual sus filas de dominio desde cero tras el truncate.
    await resetDomainTables();
  });

  it(
    'selectCandidates() selecciona, entre los 10 usuarios reales del seed, justo a los que comparten cualidad con el nuevo usuario',
    async () => {
      const seedSummary = await runSeed(admin);

      const overlapAliases = readOverlapAliases(SHARED_QUALITY_NAME);
      // Confirma la premisa del test contra el fixture real antes de seguir.
      expect(overlapAliases.size).toBeGreaterThan(0);
      // selectCandidates() nunca devuelve más de 3 (tope de diseño, design.md decisión 5): si esto
      // fallara, la cualidad elegida ya no serviría para la igualdad exacta de más abajo
      // (`result.length === overlapAliases.size`) y habría que elegir otra en su lugar.
      expect(overlapAliases.size).toBeLessThanOrEqual(3);

      const sharedQualityId = seedSummary.qualityIdsByName[SHARED_QUALITY_NAME];
      if (!sharedQualityId) {
        throw new Error(
          `"${SHARED_QUALITY_NAME}" no está en el catálogo que acaba de sembrar runSeed`,
        );
      }

      // Usuario nuevo, real (fila `users` + `auth.users` del pool de test), con cuestionario
      // completo y una única cualidad en común con el subconjunto de sembrados de arriba — así el
      // recuento de coincidencias es inequívoco: 1 para esos, 0 para el resto.
      const [account] = getTestAccountPool();
      const newUser = await createTestUser(admin, { authUserId: account.id });
      await createTestQuestionnaire(admin, {
        userId: newUser.id,
        answers: buildCompletedAnswers(),
      });
      const { error: qualityInsertError } = await admin
        .from('user_qualities')
        .insert({ user_id: newUser.id, quality_id: sharedQualityId });
      expect(qualityInsertError).toBeNull();

      // Servicio real, sin overrides ni fakes — misma `SupabaseService` real que usa la app en
      // producción, mismo patrón que questionnaires.integration-spec.ts/ai-orchestrator.
      // integration-spec.ts.
      const candidateSelectorService = new CandidateSelectorService(
        new SupabaseService(),
        buildSilentLogger(),
      );

      const result = await candidateSelectorService.selectCandidates(newUser.id);

      // El hueco que cierra este test es justo este: candidatos reales del seed, no una lista
      // vacía por un desajuste de nombres de tabla/columna entre el servicio real y los datos
      // reales, que solo aparecería contra Postgres/PostgREST de verdad, nunca contra un fake.
      expect(result.length).toBe(overlapAliases.size);

      const seededIdByAlias = new Map(seedSummary.users.map((user) => [user.alias, user.id]));
      const expectedCandidateIds = new Set(
        [...overlapAliases].map((alias) => {
          const id = seededIdByAlias.get(alias);
          if (!id) {
            throw new Error(`Alias "${alias}" no encontrado entre los usuarios que sembró runSeed`);
          }
          return id;
        }),
      );

      for (const candidate of result) {
        expect(expectedCandidateIds.has(candidate.candidateUserId)).toBe(true);
        expect(candidate.sharedQualitiesCount).toBe(1);
      }

      // Confirma también el efecto persistido en BD real (filas `comparisons` en `pending`), no
      // solo el array devuelto en memoria — mismo estilo de doble comprobación que el resto de
      // tests de integración (p. ej. questionnaires.integration-spec.ts).
      const { data: comparisonRows, error: comparisonsError } = await admin
        .from('comparisons')
        .select('candidate_user_id, status')
        .eq('requester_user_id', newUser.id);
      expect(comparisonsError).toBeNull();
      const persistedComparisons = asComparisonRows(comparisonRows);
      expect(persistedComparisons).toHaveLength(result.length);
      expect(persistedComparisons.every((row) => row.status === 'pending')).toBe(true);
      expect(new Set(persistedComparisons.map((row) => row.candidate_user_id))).toEqual(
        new Set(result.map((r) => r.candidateUserId)),
      );
    },
    TEST_TIMEOUT_MS,
  );
});
