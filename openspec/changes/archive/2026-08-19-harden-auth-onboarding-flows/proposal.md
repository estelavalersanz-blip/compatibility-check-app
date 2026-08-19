## Why

Verificación en producción (creación de cuentas reales, reset de contraseña, recorrido completo de
completar perfil y cuestionario) encontró varios problemas reales que bloqueaban o confundían a
cualquier usuario nuevo: el registro estaba completamente bloqueado por los límites del proveedor de
email por defecto de Supabase, los enlaces de confirmación/recuperación redirigían a `localhost` en
vez de a producción, los mensajes de error de fallos frecuentes (límite de peticiones, misma
contraseña) no daban ninguna pista accionable, la pantalla de completar perfil no indicaba qué campos
eran obligatorios y tenía un elemento descentrado, y la navegación del cuestionario confundía porque
un mismo botón hacía de "avanzar de bloque" y de "enviar cuestionario" a la vez. Este change documenta
retroactivamente ese trabajo de endurecimiento (v1 del TFM, alcance acotado) para que quede como
registro trazable, no solo como commits sueltos.

## What Changes

- **SMTP propio (infraestructura, fuera del repo)**: configurado un SMTP de Gmail (cuenta ad hoc
  dedicada) en el Dashboard de Supabase (Authentication → Emails → SMTP Settings), sustituyendo el
  incluido en el free tier — resuelve tanto su límite bajo (2 emails/hora) como su restricción de
  solo entregar a direcciones del equipo del proyecto.
- Tres plantillas de email con marca AfinIA, versionadas en `supabase/templates/`: Reset Password
  (ya existía, corregida para coincidir con la real), Confirm signup y la notificación nativa
  "Password changed" (ambas nuevas).
- `emailRedirectTo`/`redirectTo` explícitos en `signUp()`/`resetPasswordForEmail()`
  (`auth.service.ts`), calculados con `window.location.origin` en vez de depender del "Site URL" del
  Dashboard — antes, los enlaces de los emails llevaban a `localhost:3000` en producción.
- Mensajes de error específicos y `console.error` siempre activo en `register.component.ts`
  (distingue email ya en uso / límite de peticiones (429) / genérico) y en
  `reset-password.component.ts` (distingue misma contraseña que la actual / genérico) — antes,
  cualquier fallo caía en el mismo mensaje genérico sin dejar rastro en consola.
- Asterisco visible + atributo HTML `required` en los campos obligatorios de completar perfil
  (`registration.component.html`), y corrección del centrado de la foto de perfil
  (`registration.component.scss`).
- Rediseño de la navegación del cuestionario (`questionnaire.component.ts`/`.html`,
  `question-nav.component.html`): avanzar/retroceder de bloque pasa del botón compartido del footer
  a dos botones de icono dedicados junto a los puntos de pregunta; el footer queda solo para la
  acción final de envío/guardado; tooltips visibles añadidos a los 4 botones de navegación.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `authentication`: mensajes de error específicos para registro (límite de peticiones) y
  restablecimiento de contraseña (misma contraseña que la actual); redirect de los enlaces de email
  calculado dinámicamente en vez de depender de un valor fijo del Dashboard.
- `user-registration`: indicación visible + accesible de qué campos de completar perfil son
  obligatorios.
- `personal-questionnaire`: la navegación entre bloques deja de compartir control con la acción de
  envío final; nueva ubicación y estilo visual para avanzar/retroceder de bloque.

## Impact

- `apps/frontend/src/app/core/auth.service.ts`
- `apps/frontend/src/app/features/auth/register/register.component.ts` (+ `.spec.ts`)
- `apps/frontend/src/app/features/auth/reset-password/reset-password.component.ts` (+ `.spec.ts`)
- `apps/frontend/src/app/features/registration/registration.component.html`, `.scss` (+ `.spec.ts`)
- `apps/frontend/src/app/features/questionnaire/questionnaire.component.ts`, `.html` (+ `.spec.ts`)
- `apps/frontend/src/app/features/questionnaire/question-nav.component.html`
- `supabase/templates/recovery.html`, `confirm-signup.html` (nuevo), `password-changed.html` (nuevo)
- `README.md`, `.claude/skills/ui-design-consistency/SKILL.md` y `references/*.md` (documentación
  actualizada para que coincida con el código real)
- Configuración externa: Dashboard de Supabase (SMTP, plantillas de email, Redirect URLs) — no versionada
  en este repo salvo la copia de referencia en `supabase/templates/`
