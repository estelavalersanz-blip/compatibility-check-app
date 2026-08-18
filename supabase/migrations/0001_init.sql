-- Esquema inicial de AfinIA (design.md, decisiones 3, 3c, 6c, 9).
--
-- Deliberadamente SIN Row Level Security todavía: las tablas se crean y se conceden permisos
-- amplios al rol `authenticated` para que el test de integración de la tarea 3.3 pueda demostrar,
-- en rojo, que sin RLS un usuario autenticado puede leer/escribir filas de otro usuario. La
-- migración 0002_rls_policies.sql cierra ese hueco.

-- ============================================================================================
-- qualities — catálogo fijo de 15 cualidades personales (design.md, "Catálogo de cualidades")
-- ============================================================================================
create table public.qualities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

grant select on public.qualities to authenticated;
grant select, insert, update, delete on public.qualities to service_role;

-- ============================================================================================
-- users — perfil de la aplicación, 1:1 con auth.users (design.md, decisión 3c)
-- ============================================================================================
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  alias text not null unique,
  photo_url text,
  questionnaire_completed_at timestamptz,
  needs_recalculation boolean not null default false,
  created_at timestamptz not null default now()
);

create index users_questionnaire_completed_at_idx on public.users (questionnaire_completed_at);

grant select, insert, update on public.users to authenticated;
grant select, insert, update, delete on public.users to service_role;

-- ============================================================================================
-- user_qualities — las 5 cualidades elegidas por cada usuario (tabla puente)
-- ============================================================================================
create table public.user_qualities (
  user_id uuid not null references public.users (id) on delete cascade,
  quality_id uuid not null references public.qualities (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, quality_id)
);

create index user_qualities_quality_id_idx on public.user_qualities (quality_id);

grant select, insert, delete on public.user_qualities to authenticated;
grant select, insert, update, delete on public.user_qualities to service_role;

-- ============================================================================================
-- questionnaires — respuestas al cuestionario de 36 preguntas (borrador o completo)
-- ============================================================================================
-- `answers` guarda un AnswerSet (packages/shared-types): entre 0 y 36 elementos
-- {questionId, question, answer}. Si el cuestionario está completo o solo es un borrador se sabe
-- por `users.questionnaire_completed_at`, no por una columna propia aquí (decisión 5c).
create table public.questionnaires (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users (id) on delete cascade,
  answers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update on public.questionnaires to authenticated;
grant select, insert, update, delete on public.questionnaires to service_role;

-- ============================================================================================
-- comparisons — selección de candidatos y estado del análisis de IA (decisiones 5, 5b, 6)
-- ============================================================================================
-- Sin GRANT a `authenticated`: se accede exclusivamente a través del backend con `service_role`
-- (decisión 3c) — nunca directamente desde el cliente, ni siquiera con RLS de por medio.
create table public.comparisons (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references public.users (id) on delete cascade,
  candidate_user_id uuid not null references public.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'analyzing', 'completed', 'error')),
  -- Cualidades compartidas en el momento de la selección (tarea 8.2) — instantánea, no se
  -- recalcula sola si cualquiera de los dos usuarios edita después sus cualidades.
  shared_qualities_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (requester_user_id, candidate_user_id)
);

create index comparisons_requester_user_id_idx on public.comparisons (requester_user_id);
create index comparisons_candidate_user_id_idx on public.comparisons (candidate_user_id);

grant select, insert, update, delete on public.comparisons to service_role;

-- ============================================================================================
-- comparison_question_results — detalle por pregunta de una comparación (decisión 6)
-- ============================================================================================
-- `result` guarda un ComparisonResult completo (packages/shared-types): las 13 claves exactas del
-- JSON pedido al LLM, incluidas respuesta_usuario_1/2 — el filtrado antes de exponerlo por API
-- ocurre en la capa de aplicación (GET /comparisons/:id/detail), no en este esquema.
create table public.comparison_question_results (
  id uuid primary key default gen_random_uuid(),
  comparison_id uuid not null references public.comparisons (id) on delete cascade,
  question_id integer not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  unique (comparison_id, question_id)
);

grant select, insert, update, delete on public.comparison_question_results to service_role;

-- ============================================================================================
-- comparison_aggregated_results — resultado ponderado final de una comparación (decisión 6c)
-- ============================================================================================
-- `result` guarda un AggregatedResult completo (packages/shared-types): las 6 dimensiones,
-- compatibilidad_final y ambos vectores de pesos usados.
create table public.comparison_aggregated_results (
  id uuid primary key default gen_random_uuid(),
  comparison_id uuid not null unique references public.comparisons (id) on delete cascade,
  result jsonb not null,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.comparison_aggregated_results to service_role;

-- ============================================================================================
-- conversations — chat interno, sin relación con comparisons (decisión 9)
-- ============================================================================================
-- user_a_id/user_b_id normalizados (user_a_id < user_b_id) para que UNIQUE evite duplicados sin
-- importar quién inició la conversación — lo aplica la capa de aplicación (chat.service.ts) antes
-- de insertar, reforzado aquí con un CHECK. Solo se concede SELECT a `authenticated`: la creación
-- exige validar elegibilidad contra `comparisons` y siempre pasa por el backend con
-- `service_role` (decisión 9), nunca se inserta directamente desde el cliente.
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references public.users (id) on delete cascade,
  user_b_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (user_a_id < user_b_id),
  unique (user_a_id, user_b_id)
);

create index conversations_user_a_id_idx on public.conversations (user_a_id);
create index conversations_user_b_id_idx on public.conversations (user_b_id);

grant select on public.conversations to authenticated;
grant select, insert, update, delete on public.conversations to service_role;

-- ============================================================================================
-- messages — mensajería simple dentro de una conversación (decisión 9)
-- ============================================================================================
-- A diferencia de `conversations`, el envío de mensajes sí se concede a `authenticated`: la
-- elegibilidad ("soy participante de esta conversación") es suficiente y RLS puede exigirla
-- directamente (decisión 9), sin necesitar el chequeo contra `comparisons` que sí exige backend.
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.users (id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index messages_conversation_id_created_at_idx on public.messages (conversation_id, created_at);

grant select, insert on public.messages to authenticated;
grant select, insert, update, delete on public.messages to service_role;
