/**
 * `CHAT_ENCRYPTION_KEY` no la provee el stack local de Supabase (`supabase status -o env`) --
 * es un secreto propio de la aplicación, ortogonal a Supabase. Sin ella, cualquier test de
 * integración que envíe o lea un mensaje de chat de verdad fallaría por falta de esta variable, no
 * por lo que en realidad está probando. Mismo patrón que `e2e-env.ts`: 32 bytes exactos en base64
 * (AES-256), fija y sin ningún significado real -- nunca la clave de un entorno real.
 */
process.env.CHAT_ENCRYPTION_KEY ??= Buffer.alloc(32, 'integration-test-chat-key').toString(
  'base64',
);
