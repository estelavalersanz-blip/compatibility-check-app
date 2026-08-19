## 1. SMTP propio y plantillas de email

- [x] 1.1 Diagnosticar en vivo por qué fallaba el registro en producción (reproducido con un email
      nunca usado, para descartar que fuera un problema de una cuenta concreta) — encontrado: `429`
      del SMTP por defecto de Supabase Auth (free tier)
- [x] 1.2 Confirmar el límite exacto y la restricción de destinatario del SMTP por defecto contra la
      documentación oficial de Supabase (no asumido)
- [x] 1.3 Configurar SMTP propio de Gmail (cuenta ad hoc dedicada, contraseña de aplicación) en el
      Dashboard de Supabase — Authentication → Emails → SMTP Settings
- [x] 1.4 Plantilla con marca AfinIA para "Reset Password", configurada en el Dashboard y versionada
      en `supabase/templates/recovery.html`
- [x] 1.5 Plantilla con marca AfinIA para "Confirm signup", configurada en el Dashboard y versionada
      en `supabase/templates/confirm-signup.html`
- [x] 1.6 Plantilla con marca AfinIA para la notificación nativa "Password changed", configurada en el
      Dashboard y versionada en `supabase/templates/password-changed.html`
- [x] 1.7 Verificar en vivo, con emails reales recibidos, que las tres plantillas llegan con el
      remitente, asunto y formato esperados

## 2. Redirects de email calculados por origen

- [x] 2.1 Test: `auth.service.spec.ts` — `signUp()` fija `emailRedirectTo` a la raíz del origen actual
- [x] 2.2 Test: `auth.service.spec.ts` — `resetPasswordForEmail()` fija `redirectTo` a
      `/auth/reset-password` del origen actual
- [x] 2.3 Implementación: `auth.service.ts` — ambos redirects calculados con
      `window.location.origin`, no un valor fijo de un solo entorno
- [x] 2.4 Añadir el origen de producción a la lista de "Redirect URLs" del Dashboard de Supabase
      (Authentication → URL Configuration) — sin esto, Supabase ignora el `redirectTo` del código
- [x] 2.5 Verificar en vivo contra producción, con un email real, que el enlace de recuperación
      aterriza en `/auth/reset-password` de producción, no en `localhost`

## 3. Mensajes de error específicos en registro y reset de contraseña

- [x] 3.1 Test: `register.component.spec.ts` — un `status` 429 muestra un mensaje específico distinto
      del genérico
- [x] 3.2 Implementación: `register.component.ts` — `resolveSignUpErrorMessage()` distingue
      `user_already_exists` / `status === 429` / genérico; `console.error` siempre activo
- [x] 3.3 Reproducir en vivo el 422 `same_password` en el reset de contraseña (consola del navegador)
      para confirmar el código de error exacto antes de programar el fix
- [x] 3.4 Test: `reset-password.component.spec.ts` — `code` `same_password` muestra un mensaje
      específico distinto del genérico
- [x] 3.5 Implementación: `reset-password.component.ts` — `resolveUpdateErrorMessage()` distingue
      `same_password` / genérico; `console.error` siempre activo

## 4. Completar perfil: campos obligatorios y centrado

- [x] 4.1 Test: `registration.component.spec.ts` — nombre y alias muestran asterisco visible y llevan
      el atributo `required`
- [x] 4.2 Implementación: `registration.component.html` — asterisco (`aria-hidden`, decorativo) +
      atributo `required` nativo en ambos campos
- [x] 4.3 Diagnosticar por qué el círculo de la foto de perfil no quedaba centrado pese al
      `text-center` del contenedor (`display: flex` del propio botón rompe esa herencia)
- [x] 4.4 Implementación: `registration.component.scss` — `margin: 0 auto` en `.profile-photo-picker`
- [x] 4.5 Verificar el centrado con una captura real en local, no solo revisando el CSS

## 5. Cuestionario: rediseño de navegación de bloques

- [x] 5.1 Test: `questionnaire.component.spec.ts` — botón de bloque anterior deshabilitado en el
      bloque 1, botón de bloque siguiente deshabilitado en el bloque 6
- [x] 5.2 Test: `questionnaire.component.spec.ts` — el botón de bloque siguiente nunca se deshabilita
      por respuestas pendientes en los bloques 1-5, y cambia su `aria-label` a "Volver a donde
      estabas" al revisar un bloque ya superado
- [x] 5.3 Test: `questionnaire.component.spec.ts` — el `card-footer` no existe salvo en el último
      bloque
- [x] 5.4 Implementación: `questionnaire.component.ts` — `previousBlockNav()`/`nextBlockNav()`
      (misma lógica que el antiguo `nextBlock()` privado, incluida "volver a donde estabas");
      `footerButtonLabel()`/`footerButtonDisabled()`/`onFooterButtonClick()` simplificados a solo la
      acción final
- [x] 5.5 Implementación: `questionnaire.component.html` — doble chevron (`text-secondary`)
      flanqueando `<app-question-nav>`; `card-footer` envuelto en `@if (isLastBlock())`
- [x] 5.6 Implementación: `question-nav.component.html` — atributo `title` (tooltip visible) añadido
      junto al `aria-label` ya existente en los botones de pregunta anterior/siguiente
- [x] 5.7 Verificar la suite completa de tests tras el rediseño para descartar regresiones en los
      tests existentes que asumían el botón único del footer

## 6. Documentación

- [x] 6.1 Auditar `design-tokens.md`, `SKILL.md` y `page-template.md` (guía de diseño) contra el
      código real tras el rediseño del cuestionario y los fixes de completar perfil — corregidos los
      fragmentos de código ilustrativo y la prosa que describían el comportamiento antiguo
- [x] 6.2 Corregir `supabase/templates/recovery.html`, que no coincidía con la plantilla realmente
      configurada en el Dashboard; añadir `confirm-signup.html`/`password-changed.html`, que no
      estaban versionados
- [x] 6.3 Actualizar `README.md` (sección de límite de emails) para reflejar que ya está resuelto con
      SMTP propio, no solo documentado como riesgo aceptado
- [x] 6.4 Añadir notas "posteriores al archivado" (sin reescribir la decisión original) en el
      `design.md` ya archivado del change `build-compatibility-mvp`, donde la decisión original sobre
      el SMTP del free tier quedó superada por este trabajo
