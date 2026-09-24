import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService {
  private keys: Map<string, Buffer>;
  private defaultKeyVersion: string;

  constructor() {
    this.keys = new Map();
    // Ideally this comes from config, but for now we read env directly or use a fallback
    // e.g. PII_ENCRYPTION_KEY=v1:32bytehexstring
    const envKeys =
      process.env.PII_ENCRYPTION_KEY || 'v1:' + crypto.randomBytes(32).toString('hex');

    envKeys.split(',').forEach((keyConfig) => {
      const [version, hexKey] = keyConfig.split(':');
      if (version && hexKey) {
        this.keys.set(version, Buffer.from(hexKey, 'hex'));
        if (!this.defaultKeyVersion) {
          this.defaultKeyVersion = version;
        }
      }
    });

    if (this.keys.size === 0) {
      throw new Error('No encryption keys configured');
    }
  }

  encrypt(plainText: string): string {
    const iv = crypto.randomBytes(12); // GCM standard IV size
    const key = this.keys.get(this.defaultKeyVersion)!;
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(plainText, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag().toString('base64');

    // Format: version:iv:authTag:encrypted
    return `${this.defaultKeyVersion}:${iv.toString('base64')}:${authTag}:${encrypted}`;
  }

  decrypt(cipherText: string): string {
    const parts = cipherText.split(':');
    if (parts.length !== 4) {
      throw new Error('Invalid cipherText format');
    }

    const [version, iv64, authTag64, encrypted64] = parts;
    const key = this.keys.get(version);

    if (!key) {
      throw new Error(`Encryption key version ${version} not found`);
    }

    const iv = Buffer.from(iv64, 'base64');
    const authTag = Buffer.from(authTag64, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted64, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
