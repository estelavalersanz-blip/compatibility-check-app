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
  name: string;
  alias: string;
  photo_url: string | null;
  questionnaire_completed_at: string | null;
  needs_recalculation: boolean;
}

interface FakeAuthUser {
  id: string;
  email: string;
}

interface FakeComparisonRow {
  id: string;
  requester_user_id: string;
  candidate_user_id: string;
  shared_qualities_count: number;
  status: string;
}

type Row = Record<string, unknown>;

/**
 * "Base de datos" en memoria compartida por los tres bloques de este spec (POST/GET/PATCH sobre el
 * mismo recurso `/users/me...`) — evita repetir el mismo fake de Supabase tres veces. Solo modela
 * exactamente las llamadas que hacen `UsersService`/`CreateUserProfileHandler`/`PhotoUploadService`,
 * no un emulador genérico de PostgREST.
 *
 * `comparisons` es una excepción deliberada: se puebla para el test de "no propaga a otros usuarios"
 * de abajo, pero a propósito NO tiene una tabla asociada en `createFakeSupabaseService` — si
 * `PATCH /users/me` alguna vez intentara leer o escribir `comparisons` (no debería, ver
 * `specs/candidate-matching/spec.md`), `from('comparisons')` lanzaría "Tabla inesperada" y ese test
 * fallaría de inmediato, en vez de fallar en silencio con un fake que lo tolerase sin más.
 */
class FakeDatabase {
  users: FakeUserRow[] = [];
  userQualities: Array<{ user_id: string; quality_id: string }> = [];
  comparisons: FakeComparisonRow[] = [];
}

const UNIQUE_VIOLATION = {
  code: '23505',
  message: 'duplicate key value violates unique constraint "users_alias_key"',
};

function usersTable(db: FakeDatabase) {
  return {
    insert: (row: Row) => {
      const newRow: FakeUserRow = {
        id: row.id as string,
        name: row.name as string,
        alias: row.alias as string,
        photo_url: (row.photo_url as string | null) ?? null,
        questionnaire_completed_at: null,
        needs_recalculation: false,
      };
      return {
        select: () => ({
          single: () => {
            if (db.users.some((u) => u.alias === newRow.alias)) {
              return Promise.resolve({ data: null, error: UNIQUE_VIOLATION });
            }
            db.users.push(newRow);
            return Promise.resolve({ data: { ...newRow }, error: null });
          },
        }),
      };
    },
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
              return Promise.resolve({ data: null, error: { message: 'no encontrado' } });
            }
            const nextAlias = patch.alias as string | undefined;
            const takenByOther =
              nextAlias && db.users.some((u, i) => i !== index && u.alias === nextAlias);
            if (takenByOther) {
              return Promise.resolve({ data: null, error: UNIQUE_VIOLATION });
            }
            db.users[index] = { ...db.users[index], ...patch };
            return Promise.resolve({ data: { ...db.users[index] }, error: null });
          },
        }),
      };
      return builder;
    },
  };
}

function userQualitiesTable(db: FakeDatabase) {
  return {
    insert: (rows: Array<{ user_id: string; quality_id: string }>) => {
      db.userQualities.push(...rows);
      return Promise.resolve({ data: null, error: null });
    },
    select: () => ({
      eq: (column: string, value: unknown) =>
        Promise.resolve({
          data: db.userQualities.filter((row) => (row as Row)[column] === value),
          error: null,
        }),
    }),
    delete: () => ({
      eq: (column: string, value: unknown) => {
        db.userQualities = db.userQualities.filter((row) => (row as Row)[column] !== value);
        return Promise.resolve({ data: null, error: null });
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
          throw new Error(`Tabla inesperada en el fake de test: ${table}`);
        },
        storage: {
          from: () => ({
            upload: () => Promise.resolve({ error: null }),
            getPublicUrl: (path: string) => ({
              data: { publicUrl: `https://storage.test/${path}` },
            }),
          }),
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
const USER_B: FakeAuthUser = { id: 'auth-user-b', email: 'b@test.com' };
const AUTH_TOKENS = { 'jwt-a': USER_A, 'jwt-b': USER_B };
const FIVE_QUALITIES = ['q1', 'q2', 'q3', 'q4', 'q5'];

function attachValidPhoto(req: request.Test): request.Test {
  return req.attach('photo', Buffer.from('fake-image-bytes'), {
    filename: 'photo.png',
    contentType: 'image/png',
  });
}

describe('/users/me profile (e2e)', () => {
  let app: INestApplication<App>;
  let db: FakeDatabase;

  beforeEach(() => {
    db = new FakeDatabase();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /users/me/profile', () => {
    it('crea el perfil con nombre, alias, foto y 5 cualidades, devolviendo 201', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      let req = request(app.getHttpServer())
        .post('/users/me/profile')
        .set('Authorization', 'Bearer jwt-a')
        .field('name', 'Ada Lovelace')
        .field('alias', 'ada');
      FIVE_QUALITIES.forEach((id) => {
        req = req.field('qualityIds', id);
      });
      const response = await attachValidPhoto(req).expect(201);

      expect(response.body).toEqual({
        id: USER_A.id,
        name: 'Ada Lovelace',
        alias: 'ada',
        photoUrl: expect.stringContaining('https://storage.test/') as unknown,
        questionnaireCompletedAt: null,
        needsRecalculation: false,
        qualityIds: FIVE_QUALITIES,
      });
      expect(db.users).toHaveLength(1);
      expect(db.userQualities).toHaveLength(5);
    });

    it('rechaza con 409 si el alias ya existe', async () => {
      db.users.push({
        id: 'existing-user',
        name: 'Otro',
        alias: 'ada',
        photo_url: null,
        questionnaire_completed_at: null,
        needs_recalculation: false,
      });
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      let req = request(app.getHttpServer())
        .post('/users/me/profile')
        .set('Authorization', 'Bearer jwt-a')
        .field('name', 'Ada Lovelace')
        .field('alias', 'ada');
      FIVE_QUALITIES.forEach((id) => {
        req = req.field('qualityIds', id);
      });
      await attachValidPhoto(req).expect(409);
    });

    it('rechaza con 400 si no se envían exactamente 5 cualidades', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      const req = request(app.getHttpServer())
        .post('/users/me/profile')
        .set('Authorization', 'Bearer jwt-a')
        .field('name', 'Ada Lovelace')
        .field('alias', 'ada')
        .field('qualityIds', 'q1')
        .field('qualityIds', 'q2');
      await attachValidPhoto(req).expect(400);
    });

    // Cubre el lado ">5" de `qualityIds.length !== 5` (el test anterior ya cubre "<5"):
    // sin este caso, enviar de más quedaba sin verificar en todo el repo.
    it('rechaza con 400 si se envían más de 5 cualidades', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      const req = request(app.getHttpServer())
        .post('/users/me/profile')
        .set('Authorization', 'Bearer jwt-a')
        .field('name', 'Ada Lovelace')
        .field('alias', 'ada')
        .field('qualityIds', 'q1')
        .field('qualityIds', 'q2')
        .field('qualityIds', 'q3')
        .field('qualityIds', 'q4')
        .field('qualityIds', 'q5')
        .field('qualityIds', 'q6');
      await attachValidPhoto(req).expect(400);
    });

    it('rechaza con 400 una foto con formato no soportado', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      let req = request(app.getHttpServer())
        .post('/users/me/profile')
        .set('Authorization', 'Bearer jwt-a')
        .field('name', 'Ada Lovelace')
        .field('alias', 'ada');
      FIVE_QUALITIES.forEach((id) => {
        req = req.field('qualityIds', id);
      });
      await req
        .attach('photo', Buffer.from('fake-gif-bytes'), {
          filename: 'photo.gif',
          contentType: 'image/gif',
        })
        .expect(400);
    });

    it('rechaza con 400 una foto que supera los 2MB', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      let req = request(app.getHttpServer())
        .post('/users/me/profile')
        .set('Authorization', 'Bearer jwt-a')
        .field('name', 'Ada Lovelace')
        .field('alias', 'ada');
      FIVE_QUALITIES.forEach((id) => {
        req = req.field('qualityIds', id);
      });
      const tooBig = Buffer.alloc(2 * 1024 * 1024 + 1);
      await req
        .attach('photo', tooBig, { filename: 'photo.png', contentType: 'image/png' })
        .expect(400);
    });

    it('rechaza con 400 si faltan campos (sin foto)', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      let req = request(app.getHttpServer())
        .post('/users/me/profile')
        .set('Authorization', 'Bearer jwt-a')
        .field('name', 'Ada Lovelace')
        .field('alias', 'ada');
      FIVE_QUALITIES.forEach((id) => {
        req = req.field('qualityIds', id);
      });
      await req.expect(400); // sin .attach('photo', ...)
    });

    it('rechaza con 401 sin sesión autenticada, sin crear ningún perfil', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      let req = request(app.getHttpServer())
        .post('/users/me/profile')
        .field('name', 'Ada Lovelace')
        .field('alias', 'ada');
      FIVE_QUALITIES.forEach((id) => {
        req = req.field('qualityIds', id);
      });
      await attachValidPhoto(req).expect(401);
      expect(db.users).toHaveLength(0);
    });
  });

  describe('GET /users/me', () => {
    it('devuelve el perfil del usuario autenticado, incluyendo needsRecalculation', async () => {
      db.users.push({
        id: USER_A.id,
        name: 'Ada Lovelace',
        alias: 'ada',
        photo_url: 'https://storage.test/ada.png',
        questionnaire_completed_at: null,
        needs_recalculation: true,
      });
      db.userQualities.push({ user_id: USER_A.id, quality_id: 'q1' });
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      const response = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer jwt-a')
        .expect(200);

      expect(response.body).toEqual({
        id: USER_A.id,
        name: 'Ada Lovelace',
        alias: 'ada',
        photoUrl: 'https://storage.test/ada.png',
        questionnaireCompletedAt: null,
        needsRecalculation: true,
        qualityIds: ['q1'],
      });
    });

    it('devuelve 404 si el usuario autenticado todavía no tiene perfil', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer jwt-a')
        .expect(404);
    });

    it('devuelve 401 sin sesión autenticada', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      await request(app.getHttpServer()).get('/users/me').expect(401);
    });
  });

  describe('PATCH /users/me', () => {
    beforeEach(() => {
      db.users.push({
        id: USER_A.id,
        name: 'Ada Lovelace',
        alias: 'ada',
        photo_url: 'https://storage.test/ada-original.png',
        questionnaire_completed_at: null,
        needs_recalculation: false,
      });
      FIVE_QUALITIES.forEach((id) => db.userQualities.push({ user_id: USER_A.id, quality_id: id }));
    });

    it('actualiza nombre/alias sin tocar la foto ni marcar needsRecalculation si las cualidades no cambian', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      let req = request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', 'Bearer jwt-a')
        .field('name', 'Ada L.')
        .field('alias', 'ada-l');
      FIVE_QUALITIES.forEach((id) => {
        req = req.field('qualityIds', id);
      });
      const response = await req.expect(200);

      expect(response.body).toMatchObject({
        name: 'Ada L.',
        alias: 'ada-l',
        photoUrl: 'https://storage.test/ada-original.png',
        needsRecalculation: false,
      });
    });

    it('marca needsRecalculation=true cuando la selección de cualidades enviada difiere de la guardada', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      let req = request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', 'Bearer jwt-a')
        .field('name', 'Ada Lovelace')
        .field('alias', 'ada');
      ['q1', 'q2', 'q3', 'q4', 'q6'].forEach((id) => {
        req = req.field('qualityIds', id);
      });
      const response = await req.expect(200);

      expect(response.body).toMatchObject({
        needsRecalculation: true,
        qualityIds: ['q1', 'q2', 'q3', 'q4', 'q6'],
      });
      expect(
        db.userQualities
          .filter((q) => q.user_id === USER_A.id)
          .map((q) => q.quality_id)
          .sort(),
      ).toEqual(['q1', 'q2', 'q3', 'q4', 'q6'].sort());
    });

    it('reemplaza la foto cuando se reenvía una nueva', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      let req = request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', 'Bearer jwt-a')
        .field('name', 'Ada Lovelace')
        .field('alias', 'ada');
      FIVE_QUALITIES.forEach((id) => {
        req = req.field('qualityIds', id);
      });
      const response = await attachValidPhoto(req).expect(200);
      const body: unknown = response.body;

      expect((body as { photoUrl: string }).photoUrl).not.toBe(
        'https://storage.test/ada-original.png',
      );
    });

    it('rechaza con 409 si el alias ya lo tiene otro usuario', async () => {
      db.users.push({
        id: 'other-user',
        name: 'Otro',
        alias: 'tomado',
        photo_url: null,
        questionnaire_completed_at: null,
        needs_recalculation: false,
      });
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      let req = request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', 'Bearer jwt-a')
        .field('name', 'Ada Lovelace')
        .field('alias', 'tomado');
      FIVE_QUALITIES.forEach((id) => {
        req = req.field('qualityIds', id);
      });
      await req.expect(409);
    });

    it('rechaza con 400 si no son exactamente 5 cualidades', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      const req = request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', 'Bearer jwt-a')
        .field('name', 'Ada Lovelace')
        .field('alias', 'ada')
        .field('qualityIds', 'q1');
      await req.expect(400);
    });

    it('rechaza con 401 sin sesión autenticada', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      let req = request(app.getHttpServer())
        .patch('/users/me')
        .field('name', 'Ada Lovelace')
        .field('alias', 'ada');
      FIVE_QUALITIES.forEach((id) => {
        req = req.field('qualityIds', id);
      });
      await req.expect(401);
    });

    /**
     * Cierra el segundo escenario, todavía sin test, del Requirement "Cálculo único automático, sin
     * recálculo retroactivo para otros usuarios" (`specs/candidate-matching/spec.md`): "La edición de
     * un usuario no afecta a quienes lo eligieron como candidato". El hueco hermano ("alta de un
     * usuario nuevo no afecta a comparaciones existentes") ya lo cierra
     * `matching-no-propagation.e2e-spec.ts`, pero ese test edita/da de alta al usuario que INICIA la
     * comparación, nunca a uno que sea CANDIDATO de otro — dirección distinta, sin cubrir todavía.
     */
    it('editar las cualidades de A no toca la comparación de otro usuario que ya lo tenía como candidato', async () => {
      // "requester-x" nunca se autentica en este test — solo existe como fila, con A ya calculado
      // como uno de sus 3 candidatos.
      db.comparisons.push({
        id: 'existing-cmp-requester-x-a',
        requester_user_id: 'requester-x',
        candidate_user_id: USER_A.id,
        shared_qualities_count: 4,
        status: 'completed',
      });
      const comparisonsBefore = db.comparisons.map((row) => ({ ...row }));

      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));
      let req = request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', 'Bearer jwt-a')
        .field('name', 'Ada Lovelace')
        .field('alias', 'ada');
      ['q1', 'q2', 'q3', 'q4', 'q6'].forEach((id) => {
        req = req.field('qualityIds', id);
      });
      const response = await req.expect(200);

      // A queda marcado como pendiente de recalcular SUS PROPIAS comparaciones (comportamiento ya
      // cubierto arriba) — lo nuevo aquí es que la comparación de requester-x, donde A es el
      // candidato, no el que edita, queda exactamente igual: PATCH /users/me nunca lee ni escribe
      // `comparisons` (comprobado con una instantánea completa, no solo con el conteo — y con el
      // propio fake, que lanzaría "Tabla inesperada" si el código intentara tocarla).
      expect(response.body).toMatchObject({ needsRecalculation: true });
      expect(db.comparisons).toEqual(comparisonsBefore);
    });
  });
});
