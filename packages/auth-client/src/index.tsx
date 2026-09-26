import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { HttpClient } from '@gnk/api-client';
import type { AuthResponse, PartnerSession, StaffSession } from '@gnk/types';

type Realm = 'partner' | 'staff';
type SessionFor<R extends Realm> = R extends 'partner' ? PartnerSession : StaffSession;
export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export interface AuthState<S> {
  status: AuthStatus;
  session: S | null;
  login: (email: string, password: string) => Promise<S>;
  logout: () => Promise<void>;
  /** Store a session returned by another flow (e.g. accepting an invite). */
  acceptAuth: (auth: AuthResponse<S>) => void;
  /** Replace the cached session after a profile change. */
  setSession: (session: S) => void;
  /** Partner only: act in the context of another account the user belongs to. */
  switchAccount: (accountId: string) => Promise<void>;
}

/**
 * Creates the HTTP client and React auth provider for one realm (plan 04 §2):
 * the access token lives only in memory, the refresh token in an httpOnly cookie.
 * On load the provider restores the session via /refresh; a 401 triggers one
 * refresh and a retry; tokens are refreshed shortly before they expire.
 */
export function createAuthClient<R extends Realm>(realm: R, baseUrl: string) {
  type S = SessionFor<R>;
  let accessToken: string | null = null;
  let activeAccountId: string | null = null;
  let inflight: Promise<AuthResponse<S> | null> | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<(auth: AuthResponse<S> | null) => void>();
  const channel =
    typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(`gnk-auth-${realm}`) : null;

  const apply = (auth: AuthResponse<S> | null) => {
    clearTimeout(timer);
    accessToken = auth?.accessToken ?? null;
    if (auth && 'account' in auth.session)
      activeAccountId = (auth.session as PartnerSession).account.accountId;
    if (auth) timer = setTimeout(() => void refresh(), Math.max(30, auth.expiresIn - 60) * 1000);
    listeners.forEach((l) => l(auth));
  };

  const call = (path: string, body?: unknown): Promise<Response> =>
    fetch(`${baseUrl.replace(/\/+$/, '')}/auth/${realm}/${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-GNK-CSRF': '1',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  /** Single-flight refresh: concurrent 401s share one /refresh call. */
  const refresh = (): Promise<AuthResponse<S> | null> => {
    inflight ??= (async () => {
      try {
        const res = await call(
          'refresh',
          realm === 'partner' && activeAccountId ? { accountId: activeAccountId } : {},
        );
        const auth = res.ok ? ((await res.json()) as AuthResponse<S>) : null;
        apply(auth);
        return auth;
      } catch {
        apply(null);
        return null;
      } finally {
        inflight = null;
      }
    })();
    return inflight;
  };

  const http = new HttpClient({
    baseUrl,
    getToken: () => accessToken,
    refresh: async () => (await refresh())?.accessToken ?? null,
    extraHeaders: (): Record<string, string> =>
      realm === 'partner' && activeAccountId ? { 'X-GNK-Account': activeAccountId } : {},
  });

  const Context = createContext<AuthState<S> | null>(null);

  function AuthProvider({ children }: { children: ReactNode }) {
    const [status, setStatus] = useState<AuthStatus>('loading');
    const [session, setSessionState] = useState<S | null>(null);

    useEffect(() => {
      const onChange = (auth: AuthResponse<S> | null) => {
        setSessionState(auth?.session ?? null);
        setStatus(auth ? 'authenticated' : 'anonymous');
      };
      listeners.add(onChange);
      void refresh();
      const onMessage = (e: MessageEvent) => {
        if (e.data === 'logout') apply(null);
        if (e.data === 'login' && !accessToken) void refresh();
      };
      channel?.addEventListener('message', onMessage);
      return () => {
        listeners.delete(onChange);
        channel?.removeEventListener('message', onMessage);
      };
    }, []);

    const login = useCallback(async (email: string, password: string) => {
      const auth = await http.post<AuthResponse<S>>(`auth/${realm}/login`, { email, password });
      apply(auth);
      channel?.postMessage('login');
      return auth.session;
    }, []);

    const logout = useCallback(async () => {
      try {
        await call('logout');
      } finally {
        apply(null);
        channel?.postMessage('logout');
      }
    }, []);

    const acceptAuth = useCallback((auth: AuthResponse<S>) => apply(auth), []);
    const setSession = useCallback((s: S) => setSessionState(s), []);
    const switchAccount = useCallback(async (accountId: string) => {
      apply(await http.post<AuthResponse<S>>(`auth/${realm}/switch-account`, { accountId }));
    }, []);

    const value = useMemo(
      () => ({ status, session, login, logout, acceptAuth, setSession, switchAccount }),
      [status, session, login, logout, acceptAuth, setSession, switchAccount],
    );
    return <Context.Provider value={value}>{children}</Context.Provider>;
  }

  function useAuth(): AuthState<S> {
    const ctx = useContext(Context);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
  }

  return { http, AuthProvider, useAuth };
}
