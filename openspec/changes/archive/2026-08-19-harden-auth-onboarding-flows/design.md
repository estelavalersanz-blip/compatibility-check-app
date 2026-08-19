## Context

Verificación manual en producción (no en local, donde `enable_confirmations = false` esconde estos
problemas) reveló una cadena de fallos en el flujo de registro/recuperación de contraseña: el SMTP por
defecto de Supabase Auth (free tier) tiene un límite de 2 emails/hora y además solo entrega a
direcciones del equipo del proyecto en Supabase — bloqueaba el registro para cualquier usuario real, no
solo bajo uso intenso. Una vez resuelto el envío, un segundo problema propio del código (no de
Supabase) apareció: ni `signUp()` ni `resetPasswordForEmail()` pasaban `emailRedirectTo`/`redirectTo`,
así que los enlaces de los emails caían al "Site URL" del Dashboard, que seguía en el
`localhost:3000` del scaffolding inicial. Además, tanto el registro como el reset de contraseña
mostraban un único mensaje de error genérico para cualquier fallo (límite de peticiones, contraseña
repetida, lo que fuera), sin registrar nada en consola — indiagnosticable a propósito, sin querer. Por
separado, dos hallazgos de UX en completar perfil y en el cuestionario (feedback directo de usuaria
real probando la app) se agrupan aquí por haberse arreglado en la misma sesión de verificación, no por
compartir causa técnica con lo anterior.

## Goals / Non-Goals

**Goals:**
- Que cualquier persona con un email válido pueda registrarse en producción, de principio a fin,
  incluyendo confirmar su cuenta por email.
- Que los enlaces de los emails de auth funcionen en cualquier origen donde corra la app (local,
  previews de Vercel, producción) sin mantener una constante por entorno.
- Que un fallo de auth no reconocido explícitamente dé al menos un rastro en consola, en vez de
  desaparecer en un mensaje genérico.
- Que completar perfil deje claro qué campos son obligatorios, y que el cuestionario no confunda una
  acción de "avanzar" con la de "enviar".

**Non-Goals:**
- Backend propio de envío de emails (nodemailer, Resend API, etc.) — se descartó activamente, ver
  Decisiones. Sigue siendo Supabase Auth quien envía, solo cambia su SMTP interno.
- Verificación de dominio propio para el proveedor de email — fuera de alcance de la v1 del TFM (exige
  comprar/gestionar un dominio); ver alternativa elegida en Decisiones.
- Rediseño visual completo del cuestionario más allá de la navegación de bloques — el resto de la
  pantalla (barra de progreso, tarjetas por bloque, gamificación) no cambia.

## Decisions

**1. SMTP propio: Gmail con cuenta ad hoc, no Resend, no una API de email transaccional dedicada.**
Alternativas consideradas: (a) Resend — requiere verificar un dominio propio para poder enviar a
destinatarios arbitrarios; sin dominio, se queda en el mismo problema de "solo entrega a direcciones
aprobadas" que el SMTP por defecto de Supabase, así que no resolvía el objetivo sin un coste adicional
(comprar/gestionar un dominio, fuera de alcance de la v1). (b) Gmail con la cuenta personal de la
desarrolladora — descartado por el riesgo de que Google marque/limite una cuenta personal por patrón de
envío automatizado, y porque el remitente de cada email quedaría con una dirección personal, no de
marca. (c) **Elegida: Gmail SMTP con una cuenta de Google ad hoc, dedicada solo a esto** — sin
restricción de destinatario (no depende de verificar ningún dominio), aísla el riesgo de la cuenta
personal, y con contraseña de aplicación (no la contraseña de la cuenta) configurada directamente en el
Dashboard de Supabase — el backend/repo nunca gestiona esta credencial.

**2. `emailRedirectTo`/`redirectTo` calculados con `window.location.origin`, no un valor fijo por
entorno.** Alternativa descartada: mantener el "Site URL" del Dashboard como única fuente y no tocar el
código — es justo la causa del bug (un solo valor fijo no sirve para local + previews + producción a la
vez). Con `window.location.origin`, el mismo código funciona en cualquier origen sin mantener constantes
por entorno, a cambio de depender de que la lista de "Redirect URLs" del Dashboard de Supabase incluya
todos los orígenes reales (ver Riesgos).

**3. Distinguir errores por `error.code`/`error.status`, nunca por texto del mensaje.** Mismo criterio
ya establecido en `auth.service.ts` para `user_already_exists` — se extiende aquí a
`over_email_send_rate_limit`/`429` (registro) y `same_password` (reset de contraseña). Se comprueba por
`status` en el caso del límite de peticiones, no por `code`, porque no se pudo confirmar en vivo cuál de
los dos códigos posibles (`over_email_send_rate_limit` u `over_request_rate_limit`) devolvía Supabase en
ese momento exacto — `status === 429` cubre ambos sin depender de acertarlo.

**4. Navegación de bloques del cuestionario: botones de icono junto a los puntos de pregunta, no el
botón compartido del footer.** El footer antes hacía dos trabajos a la vez ("Siguiente bloque" en los
bloques 1-5, envío final en el bloque 6), cambiando de función de golpe al llegar al último bloque —
confuso, sin ninguna pista visual de qué iba a pasar. Alternativa descartada: mantener el botón único
pero renombrarlo/reestilizarlo — no resuelve el problema de fondo (una misma posición visual con
comportamiento que cambia según el estado). Elegida: doble chevron (mismo lenguaje visual que la
navegación de preguntas ya existente, pero visualmente distinto — un nivel de navegación más "grande"),
deshabilitado en los extremos (bloque 1/6), con tooltip visible además del `aria-label` que ya existía.
El footer queda como una posición fija y predecible: solo aparece en el último bloque, solo para la
acción final.

## Risks / Trade-offs

- **Las "Redirect URLs" del Dashboard de Supabase deben mantenerse manualmente en sincronía con los
  orígenes reales de la app** (producción, y local/previews si se quieren probar estos flujos ahí) → sin
  esto, el código ya pide la URL correcta pero Supabase la ignora y cae al Site URL de todos modos.
  Mitigación: documentado en `README.md`/`auth.service.ts`, sin automatizar (fuera de alcance de la v1).
- **Los ficheros de `supabase/templates/` son una copia de referencia versionada, no algo que Supabase
  lea directamente** → pueden desincronizarse si se edita el contenido en el Dashboard sin volver a
  copiarlo aquí (ocurrió de verdad durante esta misma sesión: `recovery.html` no coincidía con la
  plantilla real configurada). Mitigación: nota explícita en cada fichero recordándolo: no hay
  verificación automática.
- **Cuenta de Gmail ad hoc sigue sujeta a los términos de uso de Google** para SMTP automatizado, aunque
  el riesgo de marcado/limitación por Google se traslade a una cuenta desechable en vez de la personal →
  aceptado como riesgo residual bajo, razonable para el volumen de una demo de TFM; no se evaluaron
  proveedores SMTP transaccionales alternativos sin requisito de dominio propio.
