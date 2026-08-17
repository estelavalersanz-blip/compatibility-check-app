/**
 * Semilla de datos sintéticos (tasks.md, sección 18; design.md, "Migration Plan" paso 2;
 * docs/plan.md, "Semilla de datos sintéticos").
 *
 * Standalone a propósito: NO importa nada de `apps/backend/src` ni de NestJS — usa directamente
 * `@supabase/supabase-js` con la `service_role` key, igual que `SupabaseService`, pero sin atravesar
 * el framework porque esto no es parte de la app en ejecución, es una operación de aprovisionamiento
 * puntual que se ejecuta a mano (nunca automáticamente). Sí importa
 * `@compatibility-check-app/shared-types` para validar el cuestionario contra el mismo esquema Zod
 * que usa el backend real (`answerSetSchema`) — es el contrato compartido, no un acoplamiento a la
 * app.
 *
 * Ejecución manual: `npm run seed` desde la raíz del monorepo, con `SUPABASE_URL` y
 * `SUPABASE_SERVICE_ROLE_KEY` exportadas en el entorno — mismo procedimiento que
 * `npm run test:integration` (ver README de la raíz) apuntando al stack local, o a las credenciales
 * del proyecto real si se ejecuta contra él (docs/plan.md, "Verificación").
 *
 * Idempotente por diseño (tarea 18.3): cada paso comprueba primero si el dato ya existe (por
 * `name`/`email`/`id`) y solo crea lo que falte — ejecutarlo varias veces nunca duplica filas ni
 * revienta contra una restricción UNIQUE. No dispara ningún análisis de IA: escribe directamente en
 * `questionnaires` con `service_role`, sin pasar por `CompleteQuestionnaireHandler` ni por el
 * `EventBus` de Nest, así que `QuestionnaireCompletedEvent` nunca se publica y el módulo `matching`
 * nunca se entera de que estos usuarios existen hasta que un usuario real completa su propio
 * cuestionario y los selecciona como candidatos (`candidate-selector.service.ts`).
 */
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { Answer, answerSetSchema } from '@compatibility-check-app/shared-types';

// Mismo motivo que `SupabaseService`/`chat.service.ts` (apps/backend/src/supabase/supabase.service.ts):
// el `SupabaseClient` bare exportado por el paquete no siempre coincide estructuralmente con el tipo
// inferido de `createClient(...)` entre versiones — se usa el inferido en todo este fichero.
type RealSupabaseClient = ReturnType<typeof createClient>;

const PHOTO_BUCKET = 'user-photos';
const DICEBEAR_STYLE = 'avataaars';

/**
 * Cuenta de demostración (tarea 18.5): deliberadamente fuera de `seed-users.json` porque no es un
 * perfil completo (nunca tiene fila en `users`). Solo el email es documentable aquí — su contraseña
 * se define y comunica fuera del repositorio (ver `ensureAuthUser`, más abajo).
 */
export const DEMO_ACCOUNT_EMAIL = 'demo@seed.compatibility-check.local';

// ---- Forma de supabase/seed/seed-users.json ----------------------------------------------------

interface SeedQuestion {
  id: number;
  block: number;
  text: string;
}

interface SeedAnswer {
  questionId: number;
  answer: string;
}

interface SeedUser {
  seedKey: string;
  name: string;
  alias: string;
  email: string;
  qualities: string[];
  answers: SeedAnswer[];
}

interface SeedFile {
  qualities: string[];
  questions: SeedQuestion[];
  users: SeedUser[];
}

function readSeedFile(): SeedFile {
  const raw = readFileSync(join(__dirname, 'seed-users.json'), 'utf-8');
  return JSON.parse(raw) as SeedFile;
}

// ---- Resultado -----------------------------------------------------------------------------

export interface SeedUserResult {
  id: string;
  email: string;
  alias: string;
  /** `false` si el perfil ya existía de una ejecución anterior (tarea 18.3, idempotencia). */
  created: boolean;
}

export interface SeedSummary {
  qualityIdsByName: Record<string, string>;
  users: SeedUserResult[];
  demoAccount: { id: string; email: string; created: boolean };
}

// ---- Escape de tipos para .insert() ---------------------------------------------------------

/**
 * Igual que `writable-table.ts` del backend (design.md, decisión 7), en miniatura: sin un
 * `Database` genérico real, `.insert()` de `@supabase/postgrest-js` resuelve su parámetro a `never`.
 * Este fichero no importa el helper real de `apps/backend/src` a propósito (ver comentario de
 * cabecera), así que replica aquí solo lo que necesita (`insert` con `.select()` encadenable).
 */
interface InsertResult extends PromiseLike<{ data: unknown; error: { message: string } | null }> {
  select: (columns: string) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
}
interface InsertableTable {
  insert: (values: Record<string, unknown> | Record<string, unknown>[]) => InsertResult;
}
function insertable(client: RealSupabaseClient, table: string): InsertableTable {
  return client.from(table) as unknown as InsertableTable;
}

// ---- Cualidades (tarea 18.1) ------------------------------------------------------------------

interface QualityRow {
  id: string;
  name: string;
}
function asQualityRows(rows: unknown): QualityRow[] {
  return (rows as QualityRow[] | null) ?? [];
}

/** Inserta solo las cualidades del catálogo que todavía no existan (por `name`, UNIQUE en BD). */
async function seedQualities(
  client: RealSupabaseClient,
  names: string[],
): Promise<Record<string, string>> {
  const { data: existingRows, error: selectError } = await client
    .from('qualities')
    .select('id, name');
  if (selectError) {
    throw new Error(`No se pudo consultar el catálogo de cualidades: ${selectError.message}`);
  }

  const idByName = new Map(asQualityRows(existingRows).map((row) => [row.name, row.id]));
  const missingNames = names.filter((name) => !idByName.has(name));

  if (missingNames.length > 0) {
    const { data: insertedRows, error: insertError } = await insertable(client, 'qualities')
      .insert(missingNames.map((name) => ({ name })))
      .select('id, name');
    if (insertError) {
      throw new Error(`No se pudo poblar el catálogo de cualidades: ${insertError.message}`);
    }
    for (const row of asQualityRows(insertedRows)) {
      idByName.set(row.name, row.id);
    }
  }

  return Object.fromEntries(idByName);
}

// ---- Cuentas de Auth --------------------------------------------------------------------------

function randomPassword(): string {
  return `Seed-${randomUUID()}`;
}

async function findAuthUserByEmail(
  client: RealSupabaseClient,
  email: string,
): Promise<{ id: string } | null> {
  const { data, error } = await client.auth.admin.listUsers();
  if (error) {
    throw new Error(`No se pudo listar las cuentas de Auth: ${error.message}`);
  }
  return data.users.find((user) => user.email === email) ?? null;
}

/**
 * Crea la cuenta de Auth si no existe todavía (design.md, "Usuarios seed necesitan una fila real en
 * auth.users"). A diferencia del pool de cuentas de test (`apps/backend/test/setup/global-setup.ts`,
 * que SÍ resetea la contraseña en cada ejecución porque los tests necesitan conocerla), aquí NUNCA
 * se toca la contraseña de una cuenta que ya existe: para los 10 usuarios sintéticos da igual
 * (nadie inicia sesión con ellos, tarea 18.4), y para la cuenta de demostración (`seedDemoAccount`)
 * sería destructivo — resetearía en cada re-seed la contraseña "conocida" que el desarrollador haya
 * definido a mano fuera del repositorio para la presentación (tarea 18.5). Contraseña siempre
 * aleatoria al crear: nunca se imprime ni se guarda en ningún sitio.
 */
async function ensureAuthUser(
  client: RealSupabaseClient,
  email: string,
): Promise<{ id: string; created: boolean }> {
  const existing = await findAuthUserByEmail(client, email);
  if (existing) {
    return { id: existing.id, created: false };
  }

  const { data, error } = await client.auth.admin.createUser({
    email,
    password: randomPassword(),
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`No se pudo crear la cuenta de Auth "${email}": ${error?.message}`);
  }
  return { id: data.user.id, created: true };
}

// ---- Foto genérica (Storage) ------------------------------------------------------------------

/**
 * DiceBear (https://www.dicebear.com) también renderiza cada avatar en PNG server-side (no solo
 * SVG) bajo la misma seed determinista — se usa PNG en vez de SVG porque el bucket `user-photos`
 * (supabase/config.toml, `allowed_mime_types`) solo admite jpg/png/webp, igual que
 * `photo-upload.service.ts` valida para las fotos subidas por usuarios reales.
 */
async function fetchGenericPhoto(seedKey: string): Promise<Buffer> {
  const url = `https://api.dicebear.com/7.x/${DICEBEAR_STYLE}/png?seed=${encodeURIComponent(seedKey)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `No se pudo descargar el avatar genérico de "${seedKey}" (${url}): HTTP ${response.status}`,
    );
  }
  return Buffer.from(await response.arrayBuffer());
}

async function uploadGenericPhoto(
  client: RealSupabaseClient,
  userId: string,
  seedKey: string,
): Promise<string> {
  const buffer = await fetchGenericPhoto(seedKey);
  const path = `${userId}/photo.png`;

  const { error } = await client.storage
    .from(PHOTO_BUCKET)
    .upload(path, buffer, { contentType: 'image/png', upsert: true });
  if (error) {
    throw new Error(`No se pudo subir la foto genérica de "${seedKey}": ${error.message}`);
  }

  const { data } = client.storage.from(PHOTO_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// ---- Perfil sintético completo (tarea 18.2/18.4) -----------------------------------------------

async function seedUser(
  client: RealSupabaseClient,
  user: SeedUser,
  qualityIdsByName: Record<string, string>,
  questionTextById: Map<number, string>,
): Promise<SeedUserResult> {
  const { id: userId } = await ensureAuthUser(client, user.email);

  const { data: existingProfile, error: profileCheckError } = await client
    .from('users')
    .select('id')
    .eq('id', userId)
    .maybeSingle();
  if (profileCheckError) {
    throw new Error(
      `No se pudo comprobar si "${user.alias}" ya estaba seedeado: ${profileCheckError.message}`,
    );
  }
  if (existingProfile) {
    // Ya seedeado en una ejecución anterior: ni se re-crea el perfil/cualidades/cuestionario ni se
    // vuelve a descargar/subir la foto (tarea 18.3, idempotencia sin llamadas de red de sobra).
    return { id: userId, email: user.email, alias: user.alias, created: false };
  }

  const photoUrl = await uploadGenericPhoto(client, userId, user.seedKey);

  const { error: userInsertError } = await insertable(client, 'users').insert({
    id: userId,
    name: user.name,
    alias: user.alias,
    photo_url: photoUrl,
    questionnaire_completed_at: new Date().toISOString(),
  });
  if (userInsertError) {
    throw new Error(`No se pudo crear el perfil de "${user.alias}": ${userInsertError.message}`);
  }

  const qualityIds = user.qualities.map((name) => {
    const id = qualityIdsByName[name];
    if (!id) {
      throw new Error(`La cualidad "${name}" de "${user.alias}" no está en el catálogo cargado`);
    }
    return id;
  });
  const { error: qualitiesInsertError } = await insertable(client, 'user_qualities').insert(
    qualityIds.map((qualityId) => ({ user_id: userId, quality_id: qualityId })),
  );
  if (qualitiesInsertError) {
    throw new Error(
      `No se pudieron guardar las cualidades de "${user.alias}": ${qualitiesInsertError.message}`,
    );
  }

  const answers: Answer[] = user.answers.map(({ questionId, answer }) => {
    const question = questionTextById.get(questionId);
    if (!question) {
      throw new Error(
        `La pregunta ${questionId} de "${user.alias}" no está en el catálogo de preguntas`,
      );
    }
    return { questionId, question, answer };
  });
  // Misma forma exacta que exige el backend real (`answerSetSchema`, packages/shared-types) — si
  // `seed-users.json` alguna vez queda con menos/más de 36 respuestas o alguna mal formada, falla
  // aquí con un mensaje claro en vez de dejar una fila inválida en `questionnaires`.
  answerSetSchema.parse(answers);
  if (new Set(answers.map((a) => a.questionId)).size !== answers.length) {
    throw new Error(`El cuestionario de "${user.alias}" tiene una pregunta repetida`);
  }

  const { error: questionnaireInsertError } = await insertable(client, 'questionnaires').insert({
    user_id: userId,
    answers,
  });
  if (questionnaireInsertError) {
    throw new Error(
      `No se pudo guardar el cuestionario de "${user.alias}": ${questionnaireInsertError.message}`,
    );
  }

  return { id: userId, email: user.email, alias: user.alias, created: true };
}

// ---- Cuenta de demostración (tarea 18.5) -------------------------------------------------------

async function seedDemoAccount(
  client: RealSupabaseClient,
): Promise<{ id: string; email: string; created: boolean }> {
  const { id, created } = await ensureAuthUser(client, DEMO_ACCOUNT_EMAIL);
  // Sin fila en `users` a propósito: al iniciar sesión con esta cuenta debe aterrizar en completar
  // perfil paso 1, igual que cualquier cuenta autenticada sin perfil (spec `user-registration`).
  return { id, email: DEMO_ACCOUNT_EMAIL, created };
}

// ---- Orquestación -------------------------------------------------------------------------------

export async function runSeed(client: RealSupabaseClient): Promise<SeedSummary> {
  const seedFile = readSeedFile();
  const questionTextById = new Map(seedFile.questions.map((q) => [q.id, q.text]));

  const qualityIdsByName = await seedQualities(client, seedFile.qualities);

  const users: SeedUserResult[] = [];
  for (const user of seedFile.users) {
    // Secuencial a propósito, no `Promise.all`: son solo 10 usuarios, y tanto la Admin API de
    // Supabase Auth como la subida a Storage no están pensadas para un aluvión de peticiones
    // concurrentes desde un script batch — la simplicidad de un bucle no cuesta nada aquí.
    users.push(await seedUser(client, user, qualityIdsByName, questionTextById));
  }

  const demoAccount = await seedDemoAccount(client);

  return { qualityIdsByName, users, demoAccount };
}

// ---- CLI ------------------------------------------------------------------------------------

function buildClientFromEnv(): RealSupabaseClient {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      'SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorias — mismo procedimiento que ' +
        '`npm run test:integration` (ver README de la raíz) si es contra el stack local, o las ' +
        'credenciales del proyecto real si es contra él.',
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// `require.main === module`: el seed solo se ejecuta de verdad al invocar este fichero directamente
// (`npm run seed`), nunca cuando `seed.integration-spec.ts` importa `runSeed` para probarlo con su
// propio cliente de test.
if (require.main === module) {
  // Sin logger de Nest disponible aquí (script standalone, no la app en ejecución) — `console` es
  // la salida correcta para un CLI, a diferencia de `apps/backend/src` (que sí exige `nestjs-pino`).
  runSeed(buildClientFromEnv())
    .then((summary) => {
      console.log(`Cualidades en catálogo: ${Object.keys(summary.qualityIdsByName).length}`);
      console.log(
        `Usuarios sintéticos: ${summary.users.length} ` +
          `(${summary.users.filter((u) => u.created).length} nuevos, ` +
          `${summary.users.filter((u) => !u.created).length} ya existían)`,
      );
      console.log(
        `Cuenta de demostración: ${summary.demoAccount.email} ` +
          `(${summary.demoAccount.created ? 'nueva, contraseña aleatoria no comunicada' : 'ya existía'})`,
      );
    })
    .catch((error: unknown) => {
      console.error('Fallo al ejecutar el seed:', error);
      process.exitCode = 1;
    });
}
