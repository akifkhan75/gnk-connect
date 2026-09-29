import type { ProblemDetails } from '@gnk/types';

/** Error thrown for any non-2xx response, carrying the API's problem details. */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly fieldErrors: Record<string, string>;

  constructor(problem: Partial<ProblemDetails> & { status: number }) {
    super(problem.detail || problem.title || 'Something went wrong');
    this.name = 'ApiError';
    this.status = problem.status;
    this.code = problem.code;
    this.fieldErrors = Object.fromEntries((problem.errors ?? []).map((e) => [e.path, e.message]));
  }
}

export interface HttpClientOptions {
  baseUrl: string;
  /** Current access token (kept in memory by the auth client). */
  getToken: () => string | null;
  /** Called once on a 401 to get a fresh token; return null if the session is gone. */
  refresh: () => Promise<string | null>;
  /** Optional headers added to every request (e.g. active partner account). */
  extraHeaders?: () => Record<string, string>;
}

type Query = Record<string, string | number | boolean | undefined | null>;

/** Strips trailing '/' characters in linear time (a `/\/+$/` regex backtracks quadratically). */
export function trimTrailingSlashes(url: string) {
  let end = url.length;
  while (end > 0 && url.charCodeAt(end - 1) === 47 /* '/' */) end--;
  return url.slice(0, end);
}

export class HttpClient {
  constructor(private readonly options: HttpClientOptions) {}

  get baseUrl() {
    return trimTrailingSlashes(this.options.baseUrl);
  }

  url(path: string, query?: Query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query ?? {}))
      if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
    const qs = params.toString();
    return `${this.baseUrl}/${path.replace(/^\/+/, '')}${qs ? `?${qs}` : ''}`;
  }

  get<T>(path: string, query?: Query) {
    return this.request<T>('GET', path, { query });
  }
  post<T>(path: string, body?: unknown, headers?: Record<string, string>) {
    return this.request<T>('POST', path, { body, headers });
  }
  put<T>(path: string, body?: unknown) {
    return this.request<T>('PUT', path, { body });
  }
  patch<T>(path: string, body?: unknown) {
    return this.request<T>('PATCH', path, { body });
  }
  delete<T>(path: string) {
    return this.request<T>('DELETE', path);
  }

  upload<T>(path: string, file: File, query?: Query) {
    const form = new FormData();
    form.append('file', file);
    return this.request<T>('POST', path, { query, form });
  }

  /**
   * Opens a Server-Sent Events stream with the bearer token (EventSource can't send headers)
   * and calls onMessage for each event until the stream ends or the signal aborts.
   */
  async stream(
    path: string,
    onMessage: (event: string, data: string) => void,
    signal: AbortSignal,
  ): Promise<void> {
    const res = await this.raw('GET', path, { headers: { Accept: 'text/event-stream' }, signal });
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return;
      buffer += decoder.decode(value, { stream: true });
      let end: number;
      while ((end = buffer.indexOf('\n\n')) >= 0) {
        const block = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        let event = 'message';
        const data: string[] = [];
        for (const line of block.split('\n')) {
          if (line.startsWith('event:')) event = line.slice(6).trim();
          else if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
        }
        if (data.length) onMessage(event, data.join('\n'));
      }
    }
  }

  /** Fetches a protected file as a Blob (images/PDFs can't send bearer tokens via <img src>). */
  async blob(path: string): Promise<Blob> {
    const res = await this.raw('GET', path, {});
    return res.blob();
  }

  async request<T>(
    method: string,
    path: string,
    init: { query?: Query; body?: unknown; form?: FormData; headers?: Record<string, string> } = {},
  ): Promise<T> {
    const res = await this.raw(method, path, init);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  private async raw(
    method: string,
    path: string,
    init: {
      query?: Query;
      body?: unknown;
      form?: FormData;
      headers?: Record<string, string>;
      signal?: AbortSignal;
    },
    retried = false,
  ): Promise<Response> {
    const token = this.options.getToken();
    let res: Response;
    try {
      res = await fetch(this.url(path, init.query), {
        method,
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(this.options.extraHeaders?.() ?? {}),
          ...(init.headers ?? {}),
        },
        body: init.form ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
        signal: init.signal,
      });
    } catch (e) {
      if (init.signal?.aborted) throw e;
      throw new ApiError({
        status: 0,
        detail: 'Cannot reach GNK Connect. Check your internet connection and try again.',
      });
    }

    if (res.status === 401 && !retried && token) {
      const fresh = await this.options.refresh();
      if (fresh) return this.raw(method, path, init, true);
    }
    if (!res.ok) {
      let problem: Partial<ProblemDetails> = {};
      try {
        problem = await res.json();
      } catch {
        /* non-JSON error body */
      }
      throw new ApiError({ ...problem, status: res.status });
    }
    return res;
  }
}
