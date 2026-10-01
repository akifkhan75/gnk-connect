/**
 * Error monitoring (PostHog error tracking). Off unless a project key is configured, and
 * privacy-first: no autocapture, no session recording, no user identification. Only
 * exceptions and page views, tagged with the app name.
 */
type PostHog = typeof import('posthog-js').default;

let client: PostHog | null = null;
const queued: [unknown, Record<string, unknown> | undefined][] = [];

export async function initMonitoring(opts: {
  app: 'portal' | 'admin' | 'website';
  key?: string;
  host?: string;
  release?: string;
}) {
  if (!opts.key || typeof window === 'undefined') return;
  const { default: posthog } = await import('posthog-js');
  posthog.init(opts.key, {
    api_host: opts.host || 'https://eu.i.posthog.com',
    autocapture: false,
    capture_pageview: 'history_change',
    capture_pageleave: false,
    capture_exceptions: true,
    disable_session_recording: true,
    person_profiles: 'identified_only',
    // Strip query strings: they can carry search terms, references or tokens.
    before_send: (event) => {
      if (event?.properties?.$current_url)
        event.properties.$current_url = String(event.properties.$current_url).split('?')[0];
      return event;
    },
  });
  posthog.register({ app: opts.app, ...(opts.release ? { release: opts.release } : {}) });
  client = posthog;
  for (const [e, ctx] of queued.splice(0)) client.captureException(e, ctx);
}

/** Report a handled error (error boundaries, failed background work). */
export function reportError(error: unknown, context?: Record<string, unknown>) {
  if (client) client.captureException(error, context);
  else if (queued.length < 20) queued.push([error, context]);
}
