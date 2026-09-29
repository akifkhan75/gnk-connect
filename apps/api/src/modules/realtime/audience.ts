import type { Permission } from '@gnk/types';
import type { Actor } from '../auth/auth.types';

/** Who should receive a realtime event. */
export type Audience =
  | { realm: 'STAFF'; permission?: Permission }
  | { realm: 'PARTNER'; accountId: string }
  | { realm: 'STAFF' | 'PARTNER'; userIds: string[] };

export function matches(a: Audience, actor: Actor): boolean {
  if (a.realm !== actor.realm) return false;
  if ('userIds' in a) return a.userIds.includes(actor.userId);
  if (a.realm === 'PARTNER') return actor.realm === 'PARTNER' && actor.accountId === a.accountId;
  if (!a.permission) return true;
  return actor.realm === 'STAFF' && actor.permissions.has(a.permission);
}
