# Arquitectura — notas de infraestructura

Complementa `design.md` (`openspec/changes/build-compatibility-mvp/`) con el detalle concreto de
cómo queda configurada cada pieza de infraestructura a medida que se implementa. `design.md` es la
fuente de las *decisiones*; este documento recoge la *configuración resultante*.

## Supabase — Auth (tarea 3.1)

- **Email/contraseña** habilitado por defecto (`[auth]`/`[auth.email]` en `supabase/config.toml`).
  `enable_confirmations = false`: un usuario puede iniciar sesión inmediatamente tras registrarse,
  sin confirmar su email antes (decisión explícita, ver `design.md` Non-Goals — no bloquear la demo
  del TFM con un paso de verificación obligatorio).
- **Plantilla de recuperación de contraseña**: personalizada con la marca AfinIA en
  `supabase/templates/recovery.html`, referenciada desde
  `[auth.email.template.recovery]` en `config.toml` (`content_path` relativo a la raíz del repo,
  no a `supabase/` — a diferencia de lo que sugiere el comentario de ejemplo generado por
  `supabase init`, que es incorrecto para esa clave). Verificado de extremo a extremo contra
  Mailpit (`supabase.auth.resetPasswordForEmail` → el correo capturado localmente usa el asunto y
  el HTML personalizados, no la plantilla genérica de Supabase).
- Esta configuración vive en `supabase/config.toml`, así que se aplica automáticamente al stack
  local (`supabase start`); al crear el proyecto real (tarea 19.1), replicar la plantilla a mano en
  el dashboard (Authentication → Email Templates → Reset Password) hasta que el proyecto esté
  enlazado con `supabase link` y se pueda hacer `supabase config push`.

## Supabase — Storage (tarea 3.5)

- Bucket **`user-photos`**, público, límite de 2 MiB por archivo, solo `image/jpeg`, `image/png` y
  `image/webp` — declarado en `supabase/config.toml` (`[storage.buckets.user-photos]`), se crea
  automáticamente al arrancar el stack local.
- El límite de tamaño/formato del bucket es una segunda barrera, no la única: la validación real
  (con logging del resultado) vive en `apps/backend/.../photo-upload.service.ts` (tarea 6.1) — nunca
  confiar solo en la configuración del bucket.
- Al crear el proyecto real (tarea 19.1), replicar este mismo bucket a mano en el dashboard
  (Storage → New bucket) con la misma configuración, o usar `supabase storage` de la CLI apuntando
  al proyecto enlazado.

## Gotcha de la Supabase CLI: `stop`/`start` restaura desde backup por defecto

`supabase stop` (sin flags) deja un backup de los datos; el siguiente `supabase start` restaura
**ese backup** en vez de re-provisionar desde cero — lo que significa que cambios nuevos en
`config.toml` (como declarar un bucket) **no se aplican** hasta que se arranca de verdad desde
limpio. Para forzar un arranque limpio tras tocar `config.toml`:

```bash
npx supabase stop --no-backup
npx supabase start
```

(`npx supabase db reset` sí reaplica migraciones/seed sobre la BD, pero no re-ejecuta el
aprovisionamiento de buckets de Storage — para eso hace falta el `stop --no-backup` + `start`.)
