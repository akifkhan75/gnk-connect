import type { PublicGroupDto } from '@gnk/types';

const API_URL: string = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api/v1';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL.replace(/\/+$/, '')}/${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  if (!res.ok) {
    const problem = await res.json().catch(() => ({}));
    throw new Error(problem.detail || 'Request failed');
  }
  return res.json();
}

/** Public endpoints only: the website never sees prices or supplier data. */
export const publicApi = {
  groups: () => request<{ items: PublicGroupDto[]; total: number }>('public/groups?pageSize=50'),
  chat: (messages: { role: 'user' | 'model'; text: string }[]) =>
    request<{ text: string }>('public/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ messages }),
    }),
};
