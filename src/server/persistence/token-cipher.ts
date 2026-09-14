import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const VERSION = 'v1';
const ALGORITHM = 'aes-256-gcm';

export class TokenCipher {
  readonly #key: Buffer;

  constructor(secret: string) {
    this.#key = scryptSync(secret, 'lucio:spotify:tokens:v1', 32);
  }

  encrypt(value: string): string {
    const initializationVector = randomBytes(12);
    const cipher = createCipheriv(ALGORITHM, this.#key, initializationVector);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return [
      VERSION,
      initializationVector.toString('base64url'),
      cipher.getAuthTag().toString('base64url'),
      encrypted.toString('base64url'),
    ].join('.');
  }

  decrypt(value: string): string {
    const [version, initializationVector, authenticationTag, encrypted] = value.split('.');
    if (
      version !== VERSION ||
      !initializationVector ||
      !authenticationTag ||
      encrypted === undefined
    ) {
      throw new Error('El token cifrado no tiene un formato válido.');
    }
    const decipher = createDecipheriv(
      ALGORITHM,
      this.#key,
      Buffer.from(initializationVector, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(authenticationTag, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }
}
