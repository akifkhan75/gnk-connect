import { Injectable } from '@nestjs/common';
import type { Actor } from './auth.types';

const TTL_MS = 30_000;

/**
 * Short-lived cache of resolved actors keyed by session + account, so the guard
 * doesn't hit the DB on every request. Status/role changes call invalidate*,
 * and the TTL bounds staleness to 30 s on any other instance (plan 04 §2).
 */
@Injectable()
export class AuthCacheService {
  private readonly entries = new Map<string, { actor: Actor; expires: number }>();

  get(key: string): Actor | undefined {
    const hit = this.entries.get(key);
    if (!hit) return undefined;
    if (hit.expires < Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return hit.actor;
  }

  set(key: string, actor: Actor) {
    if (this.entries.size > 5000) this.entries.clear();
    this.entries.set(key, { actor, expires: Date.now() + TTL_MS });
  }

  invalidateUser(userId: string) {
    for (const [key, { actor }] of this.entries)
      if (actor.userId === userId) this.entries.delete(key);
  }

  invalidateAccount(accountId: string) {
    for (const [key, { actor }] of this.entries) {
      if (actor.realm === 'PARTNER' && actor.accountId === accountId) this.entries.delete(key);
    }
  }

  invalidateSession(sessionId: string) {
    for (const [key, { actor }] of this.entries)
      if (actor.sessionId === sessionId) this.entries.delete(key);
  }

  clear() {
    this.entries.clear();
  }
}
