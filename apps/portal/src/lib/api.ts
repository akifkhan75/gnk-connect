import { partnerApi, publicApi } from '@gnk/api-client';
import { createAuthClient } from '@gnk/auth-client';

export const API_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

export const { http, AuthProvider, useAuth, useEvents } = createAuthClient('partner', API_URL);
export const api = partnerApi(http);
export const pub = publicApi(http);
