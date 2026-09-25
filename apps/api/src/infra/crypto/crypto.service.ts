import { Inject, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

export const PII_KEYS = Symbol('PII_KEYS');

/**
 * AES-256-GCM field encryption with key versioning (plan 03).
 * Ciphertext format: `<version>:<iv b64>:<authTag b64>:<data b64>`.
 * Keys come from PII_ENCRYPTION_KEY ("v2:<hex>,v1:<hex>"); the first key encrypts,
 * all listed keys can decrypt, which allows rotation.
 */
@Injectable()
export class CryptoService {
  private readonly keys = new Map<string, Buffer>();
  private readonly currentVersion: string;

  constructor(@Inject(PII_KEYS) keyConfig: string) {
    const entries = keyConfig.split(',');
    for (const entry of entries) {
      const [version, hex] = entry.split(':');
      this.keys.set(version, Buffer.from(hex, 'hex'));
    }
    this.currentVersion = entries[0].split(':')[0];
  }

  encrypt(plainText: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.keys.get(this.currentVersion)!, iv);
    const data = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    return [
      this.currentVersion,
      iv.toString('base64'),
      cipher.getAuthTag().toString('base64'),
      data.toString('base64'),
    ].join(':');
  }

  decrypt(cipherText: string): string {
    const [version, iv, tag, data] = cipherText.split(':');
    const key = this.keys.get(version);
    if (!key || !data) throw new Error('Unreadable ciphertext');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString(
      'utf8',
    );
  }

  /** Random URL-safe token and its SHA-256 hash (only the hash is stored). */
  static newToken(): { token: string; hash: string } {
    const token = crypto.randomBytes(32).toString('base64url');
    return { token, hash: CryptoService.hash(token) };
  }

  static hash(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }
}
