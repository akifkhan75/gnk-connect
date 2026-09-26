import { adminApi } from '@gnk/api-client';
import { createAuthClient } from '@gnk/auth-client';

export const API_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';
/** Shown as a ribbon so staff always know which environment they're changing. */
export const ENV_NAME: string =
  import.meta.env.VITE_ENV_NAME || (import.meta.env.DEV ? 'LOCAL' : '');

export const { http, AuthProvider, useAuth, useEvents } = createAuthClient('staff', API_URL);
export const api = adminApi(http);
