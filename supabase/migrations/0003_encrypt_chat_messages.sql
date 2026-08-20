-- Cifrado en reposo de messages.body (AES-256-GCM, ver apps/backend/src/chat/message-encryption.ts)
-- -- pedido explícitamente tras revisar que guardar el texto de los mensajes en claro no era
-- defendible de cara a la privacidad de los usuarios. `iv`/`auth_tag` nulos = fila anterior a este
-- cambio, sigue en texto plano por compatibilidad hacia atrás (sin backfill: no hay ningún dato real
-- de usuario que proteger retroactivamente en este proyecto todavía).
alter table public.messages
  add column iv text,
  add column auth_tag text;

-- A partir de aquí, el backend (service_role) es el ÚNICO camino de lectura/escritura de
-- conversations/messages -- mismo patrón "backend como gatekeeper" ya aplicado a `comparisons`
-- (design.md, decisión 3c). Necesario para que el cifrado sea una garantía real: si un cliente
-- pudiera insertar directamente por PostgREST con su propio JWT, insertaría en texto plano y
-- se saltaría el cifrado por completo. Nada del frontend actual dependía de estos GRANT/policy --
-- `apps/frontend` siempre ha hablado con el backend (`environment.apiBaseUrl`), nunca con Supabase
-- directamente para el chat.
revoke select, insert on public.messages from authenticated;
drop policy if exists "messages_select_participant" on public.messages;
drop policy if exists "messages_insert_participant" on public.messages;

revoke select on public.conversations from authenticated;
drop policy if exists "conversations_select_participant" on public.conversations;
