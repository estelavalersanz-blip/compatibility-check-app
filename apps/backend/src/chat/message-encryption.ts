import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Cifrado en reposo de `messages.body` (Postgres), pedido explícitamente tras revisar que
 * guardarlo en texto plano no era defendible de cara a la privacidad de los usuarios — sin tocar
 * el sondeo HTTP existente (internal-chat spec: "sin WebSockets, por sondeo"), esto es una cuestión
 * de backend/BD, ortogonal al transporte.
 *
 * AES-256-GCM: cifrado autenticado (confidencialidad + integridad en una sola primitiva) — la
 * elección estándar recomendada hoy frente a un modo sin autenticar como CBC solo. Cada mensaje usa
 * un IV propio de 96 bits (el tamaño recomendado para GCM, no los 128 bits de CBC) generado con
 * `randomBytes`, nunca reutilizado entre mensajes ni derivado de nada predecible.
 *
 * La clave vive solo en `CHAT_ENCRYPTION_KEY` (variable de entorno del backend, nunca en el propio
 * repositorio) — igual patrón que `SUPABASE_SERVICE_ROLE_KEY`/`GROQ_API_KEY`. Se resuelve en cada
 * llamada (no se cachea en un módulo con estado ni se exige en el constructor de `ChatService`)
 * para que el backend siga arrancando sin ella y solo falle, con un error claro, si de verdad se
 * intenta cifrar o descifrar un mensaje sin la clave configurada.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12;
const KEY_LENGTH_BYTES = 32;

export interface EncryptedMessage {
  ciphertext: string;
  iv: string;
  authTag: string;
}

function loadKey(): Buffer {
  const base64Key = process.env.CHAT_ENCRYPTION_KEY;
  if (!base64Key) {
    throw new Error(
      'Falta CHAT_ENCRYPTION_KEY: obligatoria para cifrar o descifrar mensajes de chat. Genera una ' +
        "con `node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"`.",
    );
  }
  const key = Buffer.from(base64Key, 'base64');
  if (key.length !== KEY_LENGTH_BYTES) {
    throw new Error(
      `CHAT_ENCRYPTION_KEY debe decodificar a ${KEY_LENGTH_BYTES} bytes (AES-256) en base64; ` +
        `decodificó a ${key.length}.`,
    );
  }
  return key;
}

export function encryptMessageBody(plainText: string): EncryptedMessage {
  const key = loadKey();
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

export function decryptMessageBody(encrypted: EncryptedMessage): string {
  const key = loadKey();
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(encrypted.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(encrypted.authTag, 'base64'));
  const plainText = Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, 'base64')),
    decipher.final(),
  ]);
  return plainText.toString('utf8');
}
