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

interface FakeAnswer {
  questionId: number;
  question: string;
  answer: string;
}

interface FakeQuestionnaireRow {
  user_id: string;
  answers: FakeAnswer[];
}

interface FakeAuthUser {
  id: string;
  email: string;
}

type Row = Record<string, unknown>;

/**
 * "Base de datos" en memoria compartida por los cuatro endpoints de esta sección (POST/PATCH/PUT
 * draft/GET sobre `/users/me/questionnaire...`) — mismo patrón que `users-profile.e2e-spec.ts`: un
 * solo fake reutilizado entre bloques `describe`, en vez de repetirlo cuatro veces.
 */
class FakeDatabase {
  users: FakeUserRow[] = [];
  questionnaires: FakeQuestionnaireRow[] = [];
}

function usersTable(db: FakeDatabase) {
  return {
    select: () => {
      const filters: Array<{ column: string; value: unknown }> = [];
      const builder = {
        eq: (column: string, value: unknown) => {
          filters.push({ column, value });
          return builder;
        },
        maybeSingle: () => {
          const found = db.users.find((u) =>
            filters.every((f) => (u as Row)[f.column] === f.value),
          );
          return Promise.resolve({ data: found ? { ...found } : null, error: null });
        },
      };
      return builder;
    },
    update: (patch: Row) => {
      const filters: Array<{ column: string; value: unknown }> = [];
      const builder = {
        eq: (column: string, value: unknown) => {
          filters.push({ column, value });
          return builder;
        },
        select: () => ({
          single: () => {
            const index = db.users.findIndex((u) =>
              filters.every((f) => (u as Row)[f.column] === f.value),
            );
            if (index === -1) {
              return Promise.resolve({ data: null, error: { message: 'usuario no encontrado' } });
            }
            db.users[index] = { ...db.users[index], ...patch };
            return Promise.resolve({ data: { id: db.users[index].id }, error: null });
          },
        }),
      };
      return builder;
    },
  };
}

function questionnairesTable(db: FakeDatabase) {
  return {
    select: () => {
      const filters: Array<{ column: string; value: unknown }> = [];
      const builder = {
        eq: (column: string, value: unknown) => {
          filters.push({ column, value });
          return builder;
        },
        maybeSingle: () => {
          const found = db.questionnaires.find((q) =>
            filters.every((f) => (q as Row)[f.column] === f.value),
          );
          return Promise.resolve({ data: found ? { ...found } : null, error: null });
        },
      };
      return builder;
    },
    update: (patch: Row) => {
      const filters: Array<{ column: string; value: unknown }> = [];
      const builder = {
        eq: (column: string, value: unknown) => {
          filters.push({ column, value });
          return builder;
        },
        select: () => ({
          single: () => {
            const index = db.questionnaires.findIndex((q) =>
              filters.every((f) => (q as Row)[f.column] === f.value),
            );
            if (index === -1) {
              return Promise.resolve({
                data: null,
                error: { message: 'cuestionario no encontrado' },
              });
            }
            db.questionnaires[index] = { ...db.questionnaires[index], ...patch };
            return Promise.resolve({
              data: { user_id: db.questionnaires[index].user_id },
              error: null,
            });
          },
        }),
      };
      return builder;
    },
    upsert: (row: Row) => ({
      select: () => ({
        single: () => {
          const userId = row.user_id as string;
          const answers = row.answers as FakeAnswer[];
          const index = db.questionnaires.findIndex((q) => q.user_id === userId);
          if (index === -1) {
            db.questionnaires.push({ user_id: userId, answers });
          } else {
            db.questionnaires[index] = { ...db.questionnaires[index], answers };
          }
          return Promise.resolve({ data: { user_id: userId }, error: null });
        },
      }),
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
          if (table === 'questionnaires') return questionnairesTable(db);
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

function buildAnswers(count = 36): FakeAnswer[] {
  return Array.from({ length: count }, (_, i) => ({
    questionId: i + 1,
    question: `Pregunta ${i + 1}`,
    answer: `Respuesta ${i + 1}`,
  }));
}

describe('/users/me/questionnaire (e2e)', () => {
  let app: INestApplication<App>;
  let db: FakeDatabase;

  beforeEach(() => {
    db = new FakeDatabase();
    db.users.push({ id: USER_A.id, questionnaire_completed_at: null, needs_recalculation: false });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /users/me/questionnaire', () => {
    it('guarda las 36 respuestas y devuelve 201', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));
      const answers = buildAnswers();

      const response = await request(app.getHttpServer())
        .post('/users/me/questionnaire')
        .set('Authorization', 'Bearer jwt-a')
        .send(answers)
        .expect(201);

      expect(response.body).toEqual(answers);
      expect(db.questionnaires).toEqual([{ user_id: USER_A.id, answers }]);
      expect(db.users[0].questionnaire_completed_at).not.toBeNull();
    });

    it('rechaza con 400 si envía menos de 36 respuestas', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      await request(app.getHttpServer())
        .post('/users/me/questionnaire')
        .set('Authorization', 'Bearer jwt-a')
        .send(buildAnswers(35))
        .expect(400);
      expect(db.questionnaires).toHaveLength(0);
    });

    it('rechaza con 400 si hay preguntas duplicadas', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));
      const answers = buildAnswers();
      answers[1] = { ...answers[1], questionId: answers[0].questionId };

      await request(app.getHttpServer())
        .post('/users/me/questionnaire')
        .set('Authorization', 'Bearer jwt-a')
        .send(answers)
        .expect(400);
      expect(db.questionnaires).toHaveLength(0);
    });

    it('rechaza con 409 si el usuario ya había completado el cuestionario antes', async () => {
      db.users[0].questionnaire_completed_at = '2024-01-01T00:00:00.000Z';
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      await request(app.getHttpServer())
        .post('/users/me/questionnaire')
        .set('Authorization', 'Bearer jwt-a')
        .send(buildAnswers())
        .expect(409);
      expect(db.questionnaires).toHaveLength(0);
    });

    it('upsertea sobre un borrador ya guardado en vez de chocar con UNIQUE(user_id)', async () => {
      db.questionnaires.push({ user_id: USER_A.id, answers: buildAnswers(10) });
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));
      const answers = buildAnswers();

      await request(app.getHttpServer())
        .post('/users/me/questionnaire')
        .set('Authorization', 'Bearer jwt-a')
        .send(answers)
        .expect(201);

      expect(db.questionnaires).toEqual([{ user_id: USER_A.id, answers }]);
    });

    it('rechaza con 401 sin sesión autenticada, sin guardar nada', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      await request(app.getHttpServer())
        .post('/users/me/questionnaire')
        .send(buildAnswers())
        .expect(401);
      expect(db.questionnaires).toHaveLength(0);
    });
  });

  describe('PATCH /users/me/questionnaire', () => {
    beforeEach(() => {
      db.users[0].questionnaire_completed_at = '2024-01-01T00:00:00.000Z';
      db.questionnaires.push({ user_id: USER_A.id, answers: buildAnswers() });
    });

    it('sustituye las 36 respuestas y marca needs_recalculation=true', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));
      const editedAnswers = buildAnswers().map((a) =>
        a.questionId === 1 ? { ...a, answer: 'Respuesta editada' } : a,
      );

      const response = await request(app.getHttpServer())
        .patch('/users/me/questionnaire')
        .set('Authorization', 'Bearer jwt-a')
        .send(editedAnswers)
        .expect(200);

      expect(response.body).toEqual(editedAnswers);
      expect(db.questionnaires).toEqual([{ user_id: USER_A.id, answers: editedAnswers }]);
      expect(db.users[0].needs_recalculation).toBe(true);
    });

    it('rechaza con 4xx si el usuario no tiene un cuestionario completado previo', async () => {
      db.users[0].questionnaire_completed_at = null;
      db.questionnaires = [];
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      const response = await request(app.getHttpServer())
        .patch('/users/me/questionnaire')
        .set('Authorization', 'Bearer jwt-a')
        .send(buildAnswers());

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
      expect(db.questionnaires).toHaveLength(0);
    });

    it('rechaza con 4xx un envío incompleto, conservando las respuestas anteriores', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));
      const original = db.questionnaires[0].answers;

      const response = await request(app.getHttpServer())
        .patch('/users/me/questionnaire')
        .set('Authorization', 'Bearer jwt-a')
        .send(buildAnswers(35));

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
      expect(db.questionnaires[0].answers).toEqual(original);
      expect(db.users[0].needs_recalculation).toBe(false);
    });

    it('rechaza con 401 sin sesión autenticada, sin modificar nada', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));
      const original = db.questionnaires[0].answers;

      await request(app.getHttpServer())
        .patch('/users/me/questionnaire')
        .send(buildAnswers())
        .expect(401);
      expect(db.questionnaires[0].answers).toEqual(original);
    });
  });

  describe('PUT /users/me/questionnaire/draft y GET /users/me/questionnaire', () => {
    it('guarda un borrador parcial sin completar el cuestionario ni disparar el evento', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));
      const partial = buildAnswers(10);

      const response = await request(app.getHttpServer())
        .put('/users/me/questionnaire/draft')
        .set('Authorization', 'Bearer jwt-a')
        .send(partial)
        .expect(200);

      expect(response.body).toEqual(partial);
      expect(db.questionnaires).toEqual([{ user_id: USER_A.id, answers: partial }]);
      expect(db.users[0].questionnaire_completed_at).toBeNull();
    });

    it('acepta un borrador vacío (0 respuestas)', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      const response = await request(app.getHttpServer())
        .put('/users/me/questionnaire/draft')
        .set('Authorization', 'Bearer jwt-a')
        .send([])
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('acepta un borrador con las 36 respuestas sin marcarlo como completado', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));
      const full = buildAnswers();

      await request(app.getHttpServer())
        .put('/users/me/questionnaire/draft')
        .set('Authorization', 'Bearer jwt-a')
        .send(full)
        .expect(200);

      expect(db.users[0].questionnaire_completed_at).toBeNull();
    });

    it('un guardado de borrador posterior sobrescribe el anterior (upsert, no acumula)', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));
      await request(app.getHttpServer())
        .put('/users/me/questionnaire/draft')
        .set('Authorization', 'Bearer jwt-a')
        .send(buildAnswers(5))
        .expect(200);

      const secondDraft = buildAnswers(15);
      await request(app.getHttpServer())
        .put('/users/me/questionnaire/draft')
        .set('Authorization', 'Bearer jwt-a')
        .send(secondDraft)
        .expect(200);

      expect(db.questionnaires).toEqual([{ user_id: USER_A.id, answers: secondDraft }]);
    });

    it('rechaza con 400 un borrador con preguntas duplicadas', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));
      const duplicated = buildAnswers(5);
      duplicated[1] = { ...duplicated[1], questionId: duplicated[0].questionId };

      await request(app.getHttpServer())
        .put('/users/me/questionnaire/draft')
        .set('Authorization', 'Bearer jwt-a')
        .send(duplicated)
        .expect(400);
      expect(db.questionnaires).toHaveLength(0);
    });

    it('rechaza con 401 sin sesión autenticada, sin guardar nada', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      await request(app.getHttpServer())
        .put('/users/me/questionnaire/draft')
        .send(buildAnswers(5))
        .expect(401);
      expect(db.questionnaires).toHaveLength(0);
    });

    it('GET devuelve [] cuando el usuario no ha guardado nada todavía', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      const response = await request(app.getHttpServer())
        .get('/users/me/questionnaire')
        .set('Authorization', 'Bearer jwt-a')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('GET devuelve el borrador parcial ya guardado', async () => {
      const partial = buildAnswers(20);
      db.questionnaires.push({ user_id: USER_A.id, answers: partial });
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      const response = await request(app.getHttpServer())
        .get('/users/me/questionnaire')
        .set('Authorization', 'Bearer jwt-a')
        .expect(200);

      expect(response.body).toEqual(partial);
    });

    it('GET devuelve el cuestionario completo ya guardado', async () => {
      const full = buildAnswers();
      db.questionnaires.push({ user_id: USER_A.id, answers: full });
      db.users[0].questionnaire_completed_at = '2024-01-01T00:00:00.000Z';
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      const response = await request(app.getHttpServer())
        .get('/users/me/questionnaire')
        .set('Authorization', 'Bearer jwt-a')
        .expect(200);

      expect(response.body).toEqual(full);
    });

    it('GET rechaza con 401 sin sesión autenticada', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      await request(app.getHttpServer()).get('/users/me/questionnaire').expect(401);
    });
  });
});
