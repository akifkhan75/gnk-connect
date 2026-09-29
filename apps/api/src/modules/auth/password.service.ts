import { Injectable, OnModuleInit } from '@nestjs/common';
import * as argon2 from 'argon2';

export const MAX_FAILED_LOGINS = 5;
export const LOCK_MINUTES = 15;

/** argon2id hashing. Verification always runs, even for unknown users, so timing doesn't leak which emails exist. */
@Injectable()
export class PasswordService implements OnModuleInit {
  private dummyHash = '';

  async onModuleInit() {
    this.dummyHash = await argon2.hash('gnk-timing-equaliser', { type: argon2.argon2id });
  }

  hash(password: string) {
    return argon2.hash(password, { type: argon2.argon2id });
  }

  async verify(hash: string | null | undefined, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash || this.dummyHash, password);
    } catch {
      return false;
    }
  }

  /** Rejects passwords that contain the user's email name or full name (plan 04 §3.4). */
  isWeakFor(password: string, email: string, fullName?: string): boolean {
    const p = password.toLowerCase();
    const local = email.split('@')[0].toLowerCase();
    if (local.length >= 4 && p.includes(local)) return true;
    return (fullName ?? '')
      .toLowerCase()
      .split(/\s+/)
      .some((part) => part.length >= 4 && p.includes(part));
  }
}
