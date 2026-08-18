# Arquitectura — notas de infraestructura

Complementa `design.md` (`openspec/changes/archive/2026-08-18-build-compatibility-mvp/`, cambio ya
archivado — 166/166 tareas) con el detalle concreto de
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
  local (`supabase start`).
- **En el proyecto real (tarea 19.1) esta plantilla personalizada NO se replicó**: el dashboard de
  Supabase, en el proyecto alojado, solo permite editar las plantillas de email si se habilita SMTP
  propio — algo que `design.md` (decisión 3b) descarta explícitamente para no añadir un proveedor de
  email adicional. Decisión: el proyecto real usa la plantilla genérica por defecto de Supabase para
  "Reset Password" (sin marca AfinIA); la funcionalidad de recuperación de contraseña no se ve
  afectada, solo el diseño de ese correo concreto. Diferencia conocida entre local (con marca) y
  producción (sin marca), aceptada como limitación del free tier.

## Supabase — proyecto real (tarea 19.1)

Pasos exactos seguidos para crear el proyecto en [supabase.com](https://supabase.com):

1. Dashboard → **New project**: nombre `compatibility-check-app` (coincide con el nombre del repo,
   no con la marca "AfinIA" — es solo una etiqueta interna de Supabase, sin efecto funcional),
   región **West EU (Ireland)**, plan Free.
2. **Integración de GitHub** (Project Settings → Integrations → GitHub) conectada al repo
   `estelavalersanz-blip/compatibility-check-app`, con "Deploy to production" activado apuntando a
   la rama `main` y "Working directory" = `.` (la carpeta `supabase/` está en la raíz del repo, así
   que no hace falta cambiar este valor). **Importante**: esta integración despliega migraciones
   nuevas automáticamente **solo cuando se mergea a `main`** — en el momento de escribir esto, todo
   el desarrollo vive en la rama `docs/openspec-mvp-planning` (PR #1 sin mergear), así que esta
   integración todavía no ha desplegado nada por sí sola; las migraciones se aplicaron a mano vía
   CLI (paso siguiente) sin esperar al merge.
3. **Migraciones aplicadas vía CLI**, no por la integración de GitHub (ver punto anterior):
   `npx supabase link --project-ref <ref>` + `npx supabase db push` desde la raíz del repo.
   **Gotcha real encontrado**: la primera vez, estos comandos se ejecutaron con la terminal en
   `C:\Windows\System32` (fuera del repo) — la CLI no vio `supabase/migrations/0001_init.sql`/
   `0002_rls_policies.sql` locales, pero aun así "aplicó" (registró en el historial remoto) una
   migración fantasma `<timestamp>_new-migration.sql` vacía (0 tablas creadas). Detectado
   comprobando Table Editor (`no hay tablas` pese a que el resumen del dashboard decía
   "LAST MIGRATION: new-migration") y confirmado con `supabase migration list` (columna "Local"
   vacía = CLI no encontraba los ficheros reales). Arreglado repitiendo desde la raíz del repo y
   reparando el historial de la migración fantasma antes de reintentar:
   ```bash
   npx supabase migration repair --status reverted <timestamp_de_la_fantasma>
   npx supabase db push   # ahora sí aplica 0001_init.sql y 0002_rls_policies.sql
   ```
   Verificado por Table Editor: las 9 tablas de `0001_init.sql` presentes tras el push correcto.
4. **Bucket `user-photos`** creado a mano en Storage → New bucket (public, 2MB, jpg/png/webp) — ver
   sección siguiente para la configuración exacta esperada.
5. **Claves**: Project Settings → **API Keys** (pestaña distinta de "Data API", que solo muestra la
   URL del endpoint REST) — Supabase ya no llama a las claves "anon"/"service_role" en proyectos
   nuevos, ahora son **Publishable key** (`sb_publishable_...`, equivalente a `SUPABASE_ANON_KEY`,
   no secreta) y **Secret key** (`sb_secret_...`, equivalente a `SUPABASE_SERVICE_ROLE_KEY`,
   secreta) — mismo uso exacto en `createClient(url, key, ...)`, `@supabase/supabase-js` no
   distingue el formato de la clave.

## Render — servicio del backend (tarea 19.2)

Pasos exactos seguidos para crear el Web Service en [render.com](https://render.com) (cuenta ya
vinculada a GitHub, sin uso previo):

1. **New → Web Service**, repo `compatibility-check-app` conectado vía la integración nativa de Git.
2. Configuración: name `compatibility-check-app`, **Language: Node** (no Docker/Elixir, que es el
   valor por defecto del formulario), branch `main`, region **Frankfurt** (la más cercana a la región
   del proyecto Supabase, West EU/Ireland), **Root Directory: `apps/backend`**, **Build Command:
   `npm install && npm run build`**, **Start Command: `node dist/main.js`**, plan **Free**.
   `PORT` no se configura a mano — Render la inyecta sola y `main.ts` ya la usa
   (`process.env.PORT ?? 3000`).
3. **Variables de entorno** introducidas directamente en el formulario de Render (nunca a través del
   chat de asistencia): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (la Secret key del proyecto real),
   `GROQ_API_KEY` (cuenta de Groq creada en este mismo momento, en console.groq.com).
   `OPENROUTER_API_KEY` y `CORS_ORIGIN` se dejan sin definir por ahora — la primera es opcional
   (design.md decisión 4), la segunda depende de la URL de Vercel, que se configura en la tarea 19.3
   (hasta entonces, el backend cae a su origen por defecto de desarrollo local).
4. **Primer deploy, fallido — esperado, no es un fallo real**: igual que con las migraciones de
   Supabase (sección anterior), `main` seguía vacío en el momento de crear este servicio (PR #1 sin
   mergear) — no había código real que Render pudiera desplegar todavía.
5. **Nota de seguridad real ocurrida durante esta tarea**: una captura de pantalla del formulario de
   variables de entorno compartida para verificación mostró, sin querer, los valores completos de
   `GROQ_API_KEY` y `SUPABASE_SERVICE_ROLE_KEY` en claro (el campo de Supabase no estaba enmascarado
   como se esperaba). Se recomendó regenerar ambas claves inmediatamente (Groq: borrar y crear una
   nueva en console.groq.com; Supabase: rotar la Secret key en Project Settings → API Keys) — la
   desarrolladora, informada del riesgo, decidió explícitamente conservar las claves ya emitidas sin
   regenerarlas. Documentado aquí como decisión consciente, no como omisión.
6. **PR #1 mergeado a `main` a petición explícita** (necesario también para que Vercel pudiera ver el
   árbol de carpetas del monorepo, ver sección "Vercel" más abajo) — CI en verde en los dos checks
   obligatorios antes de mergear. Tras el merge, Render desplegó de verdad por primera vez: logs en
   vivo confirman `Nest application successfully started` y `Your service is live` en
   `https://compatibility-check-app.onrender.com`.
7. **`CORS_ORIGIN` añadida tras conocer la URL real de Vercel** (ver sección "Vercel" más abajo):
   `https://compatibility-check-app.vercel.app` — Render redeploya solo al cambiar una variable de
   entorno, sin acción manual aparte.

## Vercel — proyecto del frontend (tarea 19.3)

Proyecto ya conectado a GitHub de una sesión anterior, pendiente de configuración fina:

- **Root Directory**: `apps/frontend` — el selector visual de Vercel (modal "Root Directory") solo
  ofrecía la raíz del repo hasta que `main` tuvo contenido real (ver tarea 19.2, punto 6); tras el
  merge y recargar la página, el mismo modal sí permitió navegar `apps` → `frontend`.
- **Build Command**: `npm run build`; **Output Directory**: `dist/frontend/browser` (no el
  `dist/frontend` que asumiría un proyecto Angular fuera de monorepo); **Install Command**: automático.
- **Sin variables de entorno**: a diferencia de Render, el frontend no necesita ninguna — `SUPABASE_URL`/
  `SUPABASE_ANON_KEY`/la URL del backend van committeados directamente en
  `apps/frontend/src/environments/environment.production.ts` (nuevo, tarea 19.3), activado en el build
  de producción vía `fileReplacements` en `angular.json` (configuración `production`, que ya era la
  `defaultConfiguration` del proyecto). No son secretos (ver el comentario de `environment.ts`), así
  que no hay ninguna razón para inyectarlos en tiempo de build vía Vercel en vez de commitearlos.
- **Primer deploy correcto a la primera** tras el merge a `main`: URL pública
  `https://compatibility-check-app.vercel.app`, landing real verificada visualmente (degradado, copy,
  botón "Iniciar sesión").

## Despliegue completo — verificación (tarea 19.4)

**CORS, verificado de verdad**: `fetch('https://compatibility-check-app.onrender.com/qualities')`
ejecutado en la consola del navegador con origen real `https://compatibility-check-app.vercel.app`
(no local) respondió `200` con cuerpo `[]` (vacío porque el seed real, sección 18, aún no se ha
ejecutado contra el proyecto de Supabase real — pendiente, no es parte de esta tarea) — sin el error de
red característico de un bloqueo CORS. Confirma que `CORS_ORIGIN` en Render está bien configurada para
aceptar peticiones del frontend real.

**Cold-start de Render (free tier)**: el servicio se "duerme" tras ~15 min de inactividad; la primera
petición tras dormir tarda entre 30 y 60 segundos en responder mientras el contenedor arranca de nuevo
(comportamiento documentado del free tier de Render, no reproducido a propósito en esta sesión de
aprovisionamiento). Mitigación ya prevista desde el diseño (`design.md`, Risks/Trade-offs): la pantalla
de "procesando" del frontend (`features/processing`) ya asume esperas de duración variable sin mostrar
un porcentaje falso, así que un cold-start ocasional no rompe la experiencia, solo la alarga.

**Sin Terraform, por qué** (ver `design.md` decisión 10 para el razonamiento completo): 3 recursos, un
solo entorno, sin equipo — el aprovisionamiento manual descrito en este documento (Supabase, Render,
Vercel) sustituye por completo a Terraform para este tamaño de proyecto.

**Dónde vive cada credencial**:

| Credencial | Dónde vive | Nunca en |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` (Secret key) | Variable de entorno en Render | Repositorio, Vercel, GitHub Actions |
| `GROQ_API_KEY` | Variable de entorno en Render | Repositorio, Vercel, GitHub Actions |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` (Publishable key) | Committeadas en `environment.production.ts` (frontend) y como variable en Render (backend) | — no son secretas, pueden estar en ambos sitios |
| Contraseña de la BD de Supabase | Solo la desarrolladora (gestor de contraseñas) | Cualquier fichero, chat o plataforma |
| `CORS_ORIGIN` | Variable de entorno en Render | — no es secreta, pero solo tiene sentido ahí |

**Dónde consultar los logs**: solo Render (pestaña **Logs** del servicio, tail en vivo) — sin
proveedor externo de persistencia en v1 (Better Stack/Logtail evaluado y descartado, tarea 19.1,
`design.md` decisión 8b revisada). Limitación aceptada: sin histórico más allá de la sesión reciente
de Render.

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
