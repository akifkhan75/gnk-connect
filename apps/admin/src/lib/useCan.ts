import type { Permission } from '@gnk/types';
import { useAuth } from './api';

/** UX-only permission check; the API enforces the same permissions. */
export function useCan() {
  const { session } = useAuth();
  const perms = new Set(session?.permissions ?? []);
  return (...required: Permission[]) => required.every((p) => perms.has(p));
}
