import { decryptMessageBody, encryptMessageBody } from './message-encryption';

/** Clave de 32 bytes (AES-256) válida, fija, solo para este archivo — nunca la del entorno real. */
const TEST_KEY_BASE64 = Buffer.alloc(32, 'unit-test-key').toString('base64');

describe('message-encryption (cifrado en reposo de messages.body)', () => {
  const originalKey = process.env.CHAT_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.CHAT_ENCRYPTION_KEY = TEST_KEY_BASE64;
  });

  afterEach(() => {
    process.env.CHAT_ENCRYPTION_KEY = originalKey;
  });

  it('descifra exactamente el mismo texto que se cifró (ida y vuelta)', () => {
    const plainText = 'Hola, tu perfil me ha parecido muy compatible 😊 — ¿qué tal si hablamos?';

    const encrypted = encryptMessageBody(plainText);
    const decrypted = decryptMessageBody(encrypted);

    expect(decrypted).toBe(plainText);
  });

  it('el ciphertext no contiene el texto en claro', () => {
    const plainText = 'un secreto que no debería verse tal cual en la base de datos';

    const encrypted = encryptMessageBody(plainText);

    expect(encrypted.ciphertext).not.toContain(plainText);
    expect(Buffer.from(encrypted.ciphertext, 'base64').toString('utf8')).not.toBe(plainText);
  });

  it('nunca reutiliza el mismo IV entre dos cifrados, aunque el texto sea idéntico', () => {
    const plainText = 'el mismo mensaje repetido';

    const first = encryptMessageBody(plainText);
    const second = encryptMessageBody(plainText);

    expect(first.iv).not.toBe(second.iv);
    // Con IV distinto, el ciphertext también difiere aunque el texto en claro sea el mismo.
    expect(first.ciphertext).not.toBe(second.ciphertext);
  });

  it('rechaza el descifrado si el ciphertext fue manipulado (autenticidad del auth tag)', () => {
    const encrypted = encryptMessageBody('mensaje original');
    const tamperedCiphertext = Buffer.from(encrypted.ciphertext, 'base64');
    tamperedCiphertext[0] ^= 0xff; // Voltea el primer byte del ciphertext real.

    expect(() =>
      decryptMessageBody({ ...encrypted, ciphertext: tamperedCiphertext.toString('base64') }),
    ).toThrow();
  });

  it('rechaza el descifrado si el auth tag fue manipulado', () => {
    const encrypted = encryptMessageBody('mensaje original');
    const tamperedTag = Buffer.from(encrypted.authTag, 'base64');
    tamperedTag[0] ^= 0xff;

    expect(() =>
      decryptMessageBody({ ...encrypted, authTag: tamperedTag.toString('base64') }),
    ).toThrow();
  });

  it('rechaza el descifrado con el IV equivocado', () => {
    const encryptedA = encryptMessageBody('mensaje A');
    const encryptedB = encryptMessageBody('mensaje B');

    expect(() => decryptMessageBody({ ...encryptedA, iv: encryptedB.iv })).toThrow();
  });

  it('lanza un error claro si falta CHAT_ENCRYPTION_KEY', () => {
    delete process.env.CHAT_ENCRYPTION_KEY;

    expect(() => encryptMessageBody('cualquier texto')).toThrow(/CHAT_ENCRYPTION_KEY/);
  });

  it('lanza un error claro si CHAT_ENCRYPTION_KEY no decodifica a 32 bytes', () => {
    process.env.CHAT_ENCRYPTION_KEY = Buffer.alloc(16, 'demasiado-corta').toString('base64');

    expect(() => encryptMessageBody('cualquier texto')).toThrow(/32 bytes/);
  });

  it('admite texto vacío (aunque chat.service.ts nunca cifre un body vacío)', () => {
    const encrypted = encryptMessageBody('');

    expect(decryptMessageBody(encrypted)).toBe('');
  });
});
