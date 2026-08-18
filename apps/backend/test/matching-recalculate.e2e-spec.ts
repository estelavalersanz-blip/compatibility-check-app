import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { SupabaseService } from '../src/supabase/supabase.service';

type RealSupabaseClient = ReturnType<SupabaseService['getClient']>;

function asSupabaseClient(fake: object): RealSupabaseClient {
  return fake as RealSupabaseClient;
}

interface FakeUserRow {
  id: string;
  questionnaire_completed_at: string | null;
  needs_recalculation: boolean;
}
interface FakeUserQualityRow {
  user_id: string;
  quality_id: string;
}
interface FakeComparisonRow {
  id: string;
  requester_user_id: string;
  candidate_user_id: string;
  shared_qualities_count: number;
}
interface FakeAuthUser {
  id: string;
  email: string;
}

type Row = Record<string, unknown>;

/** Mismo patrón que `questionnaires.e2e-spec.ts`: un fake compartido para todo el archivo. */
class FakeDatabase {
  users: FakeUserRow[] = [];
  userQualities: FakeUserQualityRow[] = [];
  comparisons: FakeComparisonRow[] = [];
}

function usersTable(db: FakeDatabase) {
  return {
    select: () => ({
      eq: (column: keyof FakeUserRow, value: unknown) => ({
        maybeSingle: () =>
          Promise.resolve({ data: db.users.find((u) => u[column] === value) ?? null, error: null }),
      }),
      neq: (column: keyof FakeUserRow, value: unknown) =>
        Promise.resolve({ data: db.users.filter((u) => u[column] !== value), error: null }),
    }),
    update: (patch: Row) => ({
      eq: (column: keyof FakeUserRow, value: unknown) => ({
        select: () => ({
          single: () => {
            const index = db.users.findIndex((u) => u[column] === value);
            if (index === -1) {
              return Promise.resolve({ data: null, error: { message: 'usuario no encontrado' } });
            }
            db.users[index] = { ...db.users[index], ...patch };
            return Promise.resolve({ data: { id: db.users[index].id }, error: null });
          },
        }),
      }),
    }),
  };
}

function userQualitiesTable(db: FakeDatabase) {
  return {
    select: () => ({
      eq: (column: keyof FakeUserQualityRow, value: unknown) =>
        Promise.resolve({ data: db.userQualities.filter((r) => r[column] === value), error: null }),
      in: (column: keyof FakeUserQualityRow, values: unknown[]) =>
        Promise.resolve({
          data: db.userQualities.filter((r) => values.includes(r[column])),
          error: null,
        }),
    }),
  };
}

let nextComparisonId = 1;

function comparisonsTable(db: FakeDatabase) {
  return {
    delete: () => ({
      eq: (column: keyof FakeComparisonRow, value: unknown) => {
        db.comparisons = db.comparisons.filter((c) => c[column] !== value);
        return Promise.resolve({ error: null });
      },
    }),
    insert: (rows: Row[]) => ({
      select: () => {
        const inserted = rows.map((row) => {
          const created: FakeComparisonRow = {
            id: `comparison-${nextComparisonId++}`,
            requester_user_id: row.requester_user_id as string,
            candidate_user_id: row.candidate_user_id as string,
            shared_qualities_count: row.shared_qualities_count as number,
          };
          db.comparisons.push(created);
          return created;
        });
        return Promise.resolve({ data: inserted, error: null });
      },
    }),
  };
}

function createFakeSupabaseService(
  db: FakeDatabase,
  authUsersByToken: Record<string, FakeAuthUser>,
): Pick<SupabaseService, 'getClient'> {
  return {
    getClient: () =>
      asSupabaseClient({
        from: (table: string) => {
          if (table === 'users') return usersTable(db);
          if (table === 'user_qualities') return userQualitiesTable(db);
          if (table === 'comparisons') return comparisonsTable(db);
          throw new Error(`Tabla inesperada en el fake de test: ${table}`);
        },
        auth: {
          getUser: (token: string) => {
            const user = authUsersByToken[token];
            if (!user) {
              return Promise.resolve({ data: { user: null }, error: { message: 'invalid JWT' } });
            }
            return Promise.resolve({ data: { user }, error: null });
          },
        },
      }),
  };
}

async function buildApp(
  fakeSupabaseService: Pick<SupabaseService, 'getClient'>,
): Promise<INestApplication<App>> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(SupabaseService)
    .useValue(fakeSupabaseService)
    .compile();

  const app = moduleFixture.createNestApplication();
  await app.init();
  return app;
}

const USER_A: FakeAuthUser = { id: 'auth-user-a', email: 'a@test.com' };
const AUTH_TOKENS = { 'jwt-a': USER_A };

describe('POST /users/me/recalculate (e2e)', () => {
  let app: INestApplication<App>;
  let db: FakeDatabase;

  beforeEach(() => {
    db = new FakeDatabase();
  });

  afterEach(async () => {
    await app.close();
  });

  it('con needs_recalculation=true, recalcula: reemplaza las comparaciones y desmarca el flag', async () => {
    db.users.push({
      id: USER_A.id,
      questionnaire_completed_at: '2024-01-01T00:00:00.000Z',
      needs_recalculation: true,
    });
    db.userQualities.push(
      { user_id: USER_A.id, quality_id: 'q1' },
      { user_id: USER_A.id, quality_id: 'q2' },
    );
    // Comparación anterior, que debe desaparecer tras el recálculo.
    db.comparisons.push({
      id: 'stale-comparison',
      requester_user_id: USER_A.id,
      candidate_user_id: 'stale-candidate',
      shared_qualities_count: 1,
    });
    // Nuevo candidato disponible (no es el que tenía la comparación anterior).
    db.users.push({
      id: 'candidate-1',
      questionnaire_completed_at: '2024-01-02T00:00:00.000Z',
      needs_recalculation: false,
    });
    db.userQualities.push({ user_id: 'candidate-1', quality_id: 'q1' });
    app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

    const response = await request(app.getHttpServer())
      .post('/users/me/recalculate')
      .set('Authorization', 'Bearer jwt-a')
      .expect(201);

    const body = response.body as Array<{
      comparisonId: string;
      candidateUserId: string;
      sharedQualitiesCount: number;
    }>;
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({ candidateUserId: 'candidate-1', sharedQualitiesCount: 1 });
    expect(typeof body[0].comparisonId).toBe('string');
    expect(db.comparisons.find((c) => c.id === 'stale-comparison')).toBeUndefined();
    expect(db.comparisons.some((c) => c.candidate_user_id === 'candidate-1')).toBe(true);
    expect(db.users.find((u) => u.id === USER_A.id)?.needs_recalculation).toBe(false);
  });

  it('rechaza con 4xx si no había ningún recálculo pendiente, sin tocar nada', async () => {
    db.users.push({
      id: USER_A.id,
      questionnaire_completed_at: '2024-01-01T00:00:00.000Z',
      needs_recalculation: false,
    });
    db.comparisons.push({
      id: 'existing-comparison',
      requester_user_id: USER_A.id,
      candidate_user_id: 'candidate-1',
      shared_qualities_count: 1,
    });
    app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

    const response = await request(app.getHttpServer())
      .post('/users/me/recalculate')
      .set('Authorization', 'Bearer jwt-a');

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
    expect(db.comparisons).toHaveLength(1); // sigue existiendo, no se tocó
  });

  it('rechaza con 401 sin sesión autenticada, sin tocar nada', async () => {
    db.users.push({
      id: USER_A.id,
      questionnaire_completed_at: '2024-01-01T00:00:00.000Z',
      needs_recalculation: true,
    });
    app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

    await request(app.getHttpServer()).post('/users/me/recalculate').expect(401);
    expect(db.users.find((u) => u.id === USER_A.id)?.needs_recalculation).toBe(true);
  });
});
