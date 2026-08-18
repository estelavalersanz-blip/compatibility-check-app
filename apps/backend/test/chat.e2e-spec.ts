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

interface FakeComparisonRow {
  id: string;
  requester_user_id: string;
  candidate_user_id: string;
}
interface FakeConversationRow {
  id: string;
  user_a_id: string;
  user_b_id: string;
  created_at: string;
}
interface FakeMessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}
interface FakeUserRow {
  id: string;
  name: string;
  alias: string;
  photo_url: string | null;
  questionnaire_completed_at: string | null;
}
interface FakeAuthUser {
  id: string;
  email: string;
}

/** Fake compartido por los cuatro endpoints de esta sección — mismo patrón que el resto de
 *  `*.e2e-spec.ts` de este proyecto (cada spec hand-rolla justo la superficie que necesita, sin un
 *  fake genérico compartido entre ficheros). */
class FakeDatabase {
  comparisons: FakeComparisonRow[] = [];
  conversations: FakeConversationRow[] = [];
  messages: FakeMessageRow[] = [];
  users: FakeUserRow[] = [];
  private nextId = 1;

  newId(prefix: string): string {
    return `${prefix}-${this.nextId++}`;
  }
}

/** Encadena `N` veces `.eq()` antes de resolver una sola fila — a diferencia del resto de fakes de
 *  este proyecto (una única `.eq()`), `POST /conversations` filtra por dos columnas a la vez. */
interface EqMaybeSingleChain<T> {
  eq: (column: keyof T, value: unknown) => EqMaybeSingleChain<T>;
  maybeSingle: () => Promise<{ data: T | null; error: null }>;
}

/** Como `EqMaybeSingleChain`, pero además awaitable directamente (sin `.maybeSingle()`) para las
 *  consultas de `GET /conversations`, que esperan un array. */
interface SelectChain<T> {
  eq: (column: keyof T, value: unknown) => SelectChain<T>;
  maybeSingle: () => Promise<{ data: T | null; error: null }>;
  then: (resolve: (result: { data: T[]; error: null }) => void) => void;
}

function comparisonsTable(db: FakeDatabase) {
  return {
    select: (): EqMaybeSingleChain<FakeComparisonRow> => {
      const predicates: Array<(row: FakeComparisonRow) => boolean> = [];
      const builder: EqMaybeSingleChain<FakeComparisonRow> = {
        eq: (column, value) => {
          predicates.push((row) => row[column] === value);
          return builder;
        },
        maybeSingle: () =>
          Promise.resolve({
            data: db.comparisons.find((row) => predicates.every((p) => p(row))) ?? null,
            error: null,
          }),
      };
      return builder;
    },
  };
}

function conversationsTable(db: FakeDatabase) {
  return {
    select: (): SelectChain<FakeConversationRow> => {
      const predicates: Array<(row: FakeConversationRow) => boolean> = [];
      const matches = () => db.conversations.filter((row) => predicates.every((p) => p(row)));
      const builder: SelectChain<FakeConversationRow> = {
        eq: (column, value) => {
          predicates.push((row) => row[column] === value);
          return builder;
        },
        maybeSingle: () => Promise.resolve({ data: matches()[0] ?? null, error: null }),
        then: (resolve) => resolve({ data: matches(), error: null }),
      };
      return builder;
    },
    insert: (values: Record<string, unknown>) => ({
      select: () => ({
        single: () => {
          const row: FakeConversationRow = {
            id: db.newId('conv'),
            user_a_id: values.user_a_id as string,
            user_b_id: values.user_b_id as string,
            created_at: new Date().toISOString(),
          };
          db.conversations.push(row);
          return Promise.resolve({ data: row, error: null });
        },
      }),
    }),
  };
}

function usersTable(db: FakeDatabase) {
  return {
    select: () => ({
      in: (column: keyof FakeUserRow, values: unknown[]) =>
        Promise.resolve({ data: db.users.filter((u) => values.includes(u[column])), error: null }),
    }),
  };
}

function sortedByCreatedAt(rows: FakeMessageRow[]): FakeMessageRow[] {
  return [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

/** Refleja `WritableUpdateFilterQuery` (`supabase/writable-table.ts`): encadena `.eq()`/`.neq()`/
 *  `.is()` y se resuelve al final, sin `.select()` (el `update` de "marcar como leídos" no necesita
 *  leer de vuelta ninguna fila). */
interface UpdateChain<T> {
  eq: (column: keyof T, value: unknown) => UpdateChain<T>;
  neq: (column: keyof T, value: unknown) => UpdateChain<T>;
  is: (column: keyof T, value: null) => UpdateChain<T>;
  then: (resolve: (result: { data: null; error: null }) => void) => void;
}

/** `.eq()`/`.gt()`/`.in()` encadenables en cualquier combinación antes de `.order()` — a diferencia
 *  del resto de tablas de este fake (ramas fijas de dos niveles), `getMessages` (tarea 17b, sondeo
 *  con cursor) necesita `.eq('conversation_id', ...).gt('created_at', after)` a la vez. */
interface MessagesSelectChain {
  eq: (column: keyof FakeMessageRow, value: unknown) => MessagesSelectChain;
  gt: (column: keyof FakeMessageRow, value: unknown) => MessagesSelectChain;
  in: (column: keyof FakeMessageRow, values: unknown[]) => MessagesSelectChain;
  order: () => Promise<{ data: FakeMessageRow[]; error: null }>;
}

function messagesSelectChain(
  db: FakeDatabase,
  predicates: Array<(row: FakeMessageRow) => boolean>,
): MessagesSelectChain {
  return {
    eq: (column, value) => messagesSelectChain(db, [...predicates, (m) => m[column] === value]),
    gt: (column, value) =>
      messagesSelectChain(db, [...predicates, (m) => (m[column] as string) > (value as string)]),
    in: (column, values) =>
      messagesSelectChain(db, [...predicates, (m) => values.includes(m[column])]),
    order: () =>
      Promise.resolve({
        data: sortedByCreatedAt(db.messages.filter((m) => predicates.every((p) => p(m)))),
        error: null,
      }),
  };
}

function messagesTable(db: FakeDatabase) {
  return {
    select: (): MessagesSelectChain => messagesSelectChain(db, []),
    insert: (values: Record<string, unknown>) => ({
      select: () => ({
        single: () => {
          const row: FakeMessageRow = {
            id: db.newId('msg'),
            conversation_id: values.conversation_id as string,
            sender_id: values.sender_id as string,
            body: values.body as string,
            created_at: new Date().toISOString(),
            read_at: null,
          };
          db.messages.push(row);
          return Promise.resolve({ data: row, error: null });
        },
      }),
    }),
    update: (values: Record<string, unknown>): UpdateChain<FakeMessageRow> => {
      const predicates: Array<(row: FakeMessageRow) => boolean> = [];
      const chain: UpdateChain<FakeMessageRow> = {
        eq: (column, value) => {
          predicates.push((row) => row[column] === value);
          return chain;
        },
        neq: (column, value) => {
          predicates.push((row) => row[column] !== value);
          return chain;
        },
        is: (column, value) => {
          predicates.push((row) => row[column] === value);
          return chain;
        },
        then: (resolve) => {
          db.messages
            .filter((row) => predicates.every((p) => p(row)))
            .forEach((row) => Object.assign(row, values));
          resolve({ data: null, error: null });
        },
      };
      return chain;
    },
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
          if (table === 'comparisons') return comparisonsTable(db);
          if (table === 'conversations') return conversationsTable(db);
          if (table === 'users') return usersTable(db);
          if (table === 'messages') return messagesTable(db);
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
const USER_B: FakeAuthUser = { id: 'auth-user-b', email: 'b@test.com' };
const USER_C: FakeAuthUser = { id: 'auth-user-c', email: 'c@test.com' };
const AUTH_TOKENS = { 'jwt-a': USER_A, 'jwt-b': USER_B, 'jwt-c': USER_C };

function fakeUserRow(overrides: Partial<FakeUserRow> & { id: string }): FakeUserRow {
  return {
    name: 'Nombre',
    alias: overrides.id,
    photo_url: null,
    questionnaire_completed_at: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('Chat interno (e2e)', () => {
  let app: INestApplication<App>;
  let db: FakeDatabase;

  beforeEach(() => {
    db = new FakeDatabase();
    db.users.push(
      fakeUserRow({ id: USER_A.id, name: 'Ada', alias: 'ada' }),
      fakeUserRow({ id: USER_B.id, name: 'Bea', alias: 'bea' }),
      fakeUserRow({ id: USER_C.id, name: 'Cleo', alias: 'cleo' }),
    );
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /conversations', () => {
    it('crea la conversación cuando el candidato sí aparece en las comparisons propias', async () => {
      db.comparisons.push({
        id: 'cmp-1',
        requester_user_id: USER_A.id,
        candidate_user_id: USER_B.id,
      });
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      const response = await request(app.getHttpServer())
        .post('/conversations')
        .set('Authorization', 'Bearer jwt-a')
        .send({ candidateUserId: USER_B.id })
        .expect(201);

      expect(typeof (response.body as { id: string }).id).toBe('string');
      expect(db.conversations).toHaveLength(1);
      expect(db.conversations[0]).toMatchObject({ user_a_id: USER_A.id, user_b_id: USER_B.id });
    });

    it('es idempotente: repetir la petición no duplica la conversación', async () => {
      db.comparisons.push({
        id: 'cmp-1',
        requester_user_id: USER_A.id,
        candidate_user_id: USER_B.id,
      });
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      const first = await request(app.getHttpServer())
        .post('/conversations')
        .set('Authorization', 'Bearer jwt-a')
        .send({ candidateUserId: USER_B.id })
        .expect(201);
      const second = await request(app.getHttpServer())
        .post('/conversations')
        .set('Authorization', 'Bearer jwt-a')
        .send({ candidateUserId: USER_B.id })
        .expect(201);

      expect((second.body as { id: string }).id).toBe((first.body as { id: string }).id);
      expect(db.conversations).toHaveLength(1);
    });

    it('rechaza con 4xx sin crear nada si el candidato no aparece entre las comparisons propias', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      const response = await request(app.getHttpServer())
        .post('/conversations')
        .set('Authorization', 'Bearer jwt-a')
        .send({ candidateUserId: USER_B.id });

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
      expect(db.conversations).toHaveLength(0);
    });

    it('rechaza con 401 sin sesión autenticada', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      await request(app.getHttpServer())
        .post('/conversations')
        .send({ candidateUserId: USER_B.id })
        .expect(401);
    });
  });

  describe('GET /conversations', () => {
    it('incluye conversaciones propias e iniciadas por otros, con el otro participante, último mensaje y no leídos', async () => {
      // A inició esta con B.
      db.conversations.push({
        id: 'conv-a-b',
        user_a_id: USER_A.id,
        user_b_id: USER_B.id,
        created_at: '2024-01-01T00:00:00.000Z',
      });
      db.messages.push(
        {
          id: 'msg-1',
          conversation_id: 'conv-a-b',
          sender_id: USER_A.id,
          body: 'Hola',
          created_at: '2024-01-01T00:00:01.000Z',
          read_at: '2024-01-01T00:00:02.000Z',
        },
        {
          id: 'msg-2',
          conversation_id: 'conv-a-b',
          sender_id: USER_B.id,
          body: 'Qué tal',
          created_at: '2024-01-02T00:00:00.000Z',
          read_at: null,
        },
      );
      // C inició esta con A (A nunca la inició) — debe aparecer igualmente.
      db.conversations.push({
        id: 'conv-c-a',
        user_a_id: USER_A.id,
        user_b_id: USER_C.id,
        created_at: '2024-01-03T00:00:00.000Z',
      });
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      const response = await request(app.getHttpServer())
        .get('/conversations')
        .set('Authorization', 'Bearer jwt-a')
        .expect(200);

      const body = response.body as Array<{
        id: string;
        otherParticipant: { id: string; alias: string };
        lastMessage: { body: string } | null;
        unreadCount: number;
      }>;
      expect(body).toHaveLength(2);
      // Más reciente primero: conv-c-a (creada 01-03, sin mensajes) antes que conv-a-b (último
      // mensaje 01-02).
      expect(body[0].id).toBe('conv-c-a');
      expect(body[0].otherParticipant).toMatchObject({ id: USER_C.id, alias: 'cleo' });
      expect(body[0].lastMessage).toBeNull();
      expect(body[0].unreadCount).toBe(0);

      expect(body[1].id).toBe('conv-a-b');
      expect(body[1].otherParticipant).toMatchObject({ id: USER_B.id, alias: 'bea' });
      expect(body[1].lastMessage).toMatchObject({ body: 'Qué tal' });
      expect(body[1].unreadCount).toBe(1);
    });

    it('sin ninguna conversación, devuelve un array vacío', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      const response = await request(app.getHttpServer())
        .get('/conversations')
        .set('Authorization', 'Bearer jwt-a')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('rechaza con 401 sin sesión autenticada', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      await request(app.getHttpServer()).get('/conversations').expect(401);
    });
  });

  describe('GET /conversations/:id/messages', () => {
    beforeEach(() => {
      db.conversations.push({
        id: 'conv-a-b',
        user_a_id: USER_A.id,
        user_b_id: USER_B.id,
        created_at: '2024-01-01T00:00:00.000Z',
      });
      // Insertados fuera de orden a propósito, para comprobar que la respuesta los ordena.
      db.messages.push(
        {
          id: 'msg-2',
          conversation_id: 'conv-a-b',
          sender_id: USER_B.id,
          body: 'Segundo',
          created_at: '2024-01-01T00:00:02.000Z',
          read_at: null,
        },
        {
          id: 'msg-1',
          conversation_id: 'conv-a-b',
          sender_id: USER_A.id,
          body: 'Primero',
          created_at: '2024-01-01T00:00:01.000Z',
          read_at: null,
        },
      );
    });

    it('devuelve los mensajes en orden cronológico y marca como leídos los dirigidos al usuario', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      const response = await request(app.getHttpServer())
        .get('/conversations/conv-a-b/messages')
        .set('Authorization', 'Bearer jwt-a')
        .expect(200);

      const body = response.body as Array<{
        body: string;
        senderId: string;
        readAt: string | null;
      }>;
      expect(body.map((m) => m.body)).toEqual(['Primero', 'Segundo']);

      // El mensaje de B dirigido a A queda marcado como leído (en la respuesta y en BD); el propio
      // mensaje de A no se toca.
      expect(body.find((m) => m.senderId === USER_B.id)?.readAt).not.toBeNull();
      expect(body.find((m) => m.senderId === USER_A.id)?.readAt).toBeNull();
      expect(db.messages.find((m) => m.id === 'msg-2')?.read_at).not.toBeNull();
      expect(db.messages.find((m) => m.id === 'msg-1')?.read_at).toBeNull();
    });

    it('con el parámetro "after", devuelve solo los mensajes posteriores a ese cursor (sondeo, tarea 17b.5/17b.6)', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      const response = await request(app.getHttpServer())
        .get('/conversations/conv-a-b/messages')
        .query({ after: '2024-01-01T00:00:01.000Z' }) // justo el created_at de "Primero"
        .set('Authorization', 'Bearer jwt-a')
        .expect(200);

      const body = response.body as Array<{ body: string }>;
      expect(body.map((m) => m.body)).toEqual(['Segundo']);
    });

    it('sin "after", devuelve el historial completo (comportamiento sin cambios respecto a antes de la 17b)', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      const response = await request(app.getHttpServer())
        .get('/conversations/conv-a-b/messages')
        .set('Authorization', 'Bearer jwt-a')
        .expect(200);

      const body = response.body as Array<{ body: string }>;
      expect(body.map((m) => m.body)).toEqual(['Primero', 'Segundo']);
    });

    it('no marca como leídos los mensajes de otras conversaciones', async () => {
      db.conversations.push({
        id: 'conv-a-c',
        user_a_id: USER_A.id,
        user_b_id: USER_C.id,
        created_at: '2024-01-01T00:00:00.000Z',
      });
      db.messages.push({
        id: 'msg-3',
        conversation_id: 'conv-a-c',
        sender_id: USER_C.id,
        body: 'De otra conversación',
        created_at: '2024-01-01T00:00:03.000Z',
        read_at: null,
      });
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      await request(app.getHttpServer())
        .get('/conversations/conv-a-b/messages')
        .set('Authorization', 'Bearer jwt-a')
        .expect(200);

      expect(db.messages.find((m) => m.id === 'msg-3')?.read_at).toBeNull();
    });

    it('rechaza con 4xx si el usuario autenticado no es participante de la conversación', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      const response = await request(app.getHttpServer())
        .get('/conversations/conv-a-b/messages')
        .set('Authorization', 'Bearer jwt-c');

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
    });

    it('rechaza con 4xx si la conversación no existe', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      const response = await request(app.getHttpServer())
        .get('/conversations/no-existe/messages')
        .set('Authorization', 'Bearer jwt-a');

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
    });

    it('rechaza con 401 sin sesión autenticada', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      await request(app.getHttpServer()).get('/conversations/conv-a-b/messages').expect(401);
    });
  });

  describe('POST /conversations/:id/messages', () => {
    beforeEach(() => {
      db.conversations.push({
        id: 'conv-a-b',
        user_a_id: USER_A.id,
        user_b_id: USER_B.id,
        created_at: '2024-01-01T00:00:00.000Z',
      });
    });

    it('con un body no vacío, persiste el mensaje y lo devuelve', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      const response = await request(app.getHttpServer())
        .post('/conversations/conv-a-b/messages')
        .set('Authorization', 'Bearer jwt-a')
        .send({ body: 'Hola Bea' })
        .expect(201);

      expect(response.body).toMatchObject({
        conversationId: 'conv-a-b',
        senderId: USER_A.id,
        body: 'Hola Bea',
      });
      expect(db.messages).toHaveLength(1);
      expect(db.messages[0]).toMatchObject({ conversation_id: 'conv-a-b', sender_id: USER_A.id });
    });

    it('con un body vacío, rechaza con 4xx sin persistir nada', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      const response = await request(app.getHttpServer())
        .post('/conversations/conv-a-b/messages')
        .set('Authorization', 'Bearer jwt-a')
        .send({ body: '   ' });

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
      expect(db.messages).toHaveLength(0);
    });

    it('con un usuario no participante, rechaza con 4xx sin persistir nada', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      const response = await request(app.getHttpServer())
        .post('/conversations/conv-a-b/messages')
        .set('Authorization', 'Bearer jwt-c')
        .send({ body: 'Intento ajeno' });

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
      expect(db.messages).toHaveLength(0);
    });

    it('rechaza con 401 sin sesión autenticada', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      await request(app.getHttpServer())
        .post('/conversations/conv-a-b/messages')
        .send({ body: 'Hola' })
        .expect(401);
    });
  });

  describe('Indicador de no leídos: leer una conversación lo actualiza (internal-chat spec)', () => {
    it('el no leídos de GET /conversations baja a 0 tras leer la conversación con GET .../messages', async () => {
      db.conversations.push({
        id: 'conv-a-b',
        user_a_id: USER_A.id,
        user_b_id: USER_B.id,
        created_at: '2024-01-01T00:00:00.000Z',
      });
      db.messages.push({
        id: 'msg-1',
        conversation_id: 'conv-a-b',
        sender_id: USER_B.id,
        body: 'Hola Ada',
        created_at: '2024-01-01T00:00:01.000Z',
        read_at: null,
      });
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      const before = await request(app.getHttpServer())
        .get('/conversations')
        .set('Authorization', 'Bearer jwt-a')
        .expect(200);
      expect((before.body as Array<{ unreadCount: number }>)[0].unreadCount).toBe(1);

      await request(app.getHttpServer())
        .get('/conversations/conv-a-b/messages')
        .set('Authorization', 'Bearer jwt-a')
        .expect(200);

      const after = await request(app.getHttpServer())
        .get('/conversations')
        .set('Authorization', 'Bearer jwt-a')
        .expect(200);
      expect((after.body as Array<{ unreadCount: number }>)[0].unreadCount).toBe(0);
    });
  });
});
