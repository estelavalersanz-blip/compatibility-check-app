-- Row Level Security (design.md, decisión 11): cada usuario autenticado solo puede leer/escribir
-- su propia fila (o las conversaciones/mensajes de las que participa) a través del cliente
-- directo de Supabase. `service_role` (usado por el backend) siempre la salta (BYPASSRLS) —
-- estas políticas son la defensa contra un cliente que hable directamente con la API de Supabase
-- usando el JWT de un usuario real, no la única puerta de acceso (design.md, decisión 3c).

-- ============================================================================================
-- qualities — catálogo público de solo lectura, igual para cualquier usuario autenticado
-- ============================================================================================
alter table public.qualities enable row level security;

create policy "qualities_select_any_authenticated"
  on public.qualities
  for select
  to authenticated
  using (true);

-- ============================================================================================
-- users
-- ============================================================================================
alter table public.users enable row level security;

create policy "users_select_own"
  on public.users
  for select
  to authenticated
  using (auth.uid() = id);

create policy "users_insert_own"
  on public.users
  for insert
  to authenticated
  with check (auth.uid() = id);

create policy "users_update_own"
  on public.users
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ============================================================================================
-- user_qualities
-- ============================================================================================
alter table public.user_qualities enable row level security;

create policy "user_qualities_select_own"
  on public.user_qualities
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "user_qualities_insert_own"
  on public.user_qualities
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "user_qualities_delete_own"
  on public.user_qualities
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================================================
-- questionnaires
-- ============================================================================================
alter table public.questionnaires enable row level security;

create policy "questionnaires_select_own"
  on public.questionnaires
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "questionnaires_insert_own"
  on public.questionnaires
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "questionnaires_update_own"
  on public.questionnaires
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================================
-- comparisons / comparison_question_results / comparison_aggregated_results
-- ============================================================================================
-- RLS habilitada pero sin políticas a propósito: estas tres tablas no tienen ningún GRANT hacia
-- `authenticated`/`anon` (ver 0001_init.sql), así que ya son inalcanzables por esa vía; habilitar
-- RLS sin políticas es una segunda barrera explícita (si algún día se concediera acceso por error,
-- seguiría sin devolver ninguna fila a un usuario normal) — nunca formaron parte de la tarea 3.4.
alter table public.comparisons enable row level security;
alter table public.comparison_question_results enable row level security;
alter table public.comparison_aggregated_results enable row level security;

-- ============================================================================================
-- conversations — solo lectura directa (la creación exige el backend, ver 0001_init.sql)
-- ============================================================================================
alter table public.conversations enable row level security;

create policy "conversations_select_participant"
  on public.conversations
  for select
  to authenticated
  using (auth.uid() = user_a_id or auth.uid() = user_b_id);

-- ============================================================================================
-- messages
-- ============================================================================================
alter table public.messages enable row level security;

create policy "messages_select_participant"
  on public.messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.conversations c
      where c.id = messages.conversation_id
        and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())
    )
  );

create policy "messages_insert_participant"
  on public.messages
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1
      from public.conversations c
      where c.id = messages.conversation_id
        and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())
    )
  );
