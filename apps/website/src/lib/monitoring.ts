/**
 * Error monitoring and page views (PostHog). Off unless VITE_POSTHOG_KEY is set at build time,
 * in which case the SDK is loaded lazily. No autocapture, no session recording, no cookies
 * banner needed for identification because visitors are never identified.
 */
type PostHog = typeof import('posthog-js').default;

const env = (import.meta as any).env ?? {};
let client: PostHog | null = null;

export async function initMonitoring() {
  const key: string | undefined = env.VITE_POSTHOG_KEY;
  if (!key) return;
  const { default: posthog } = await import('posthog-js');
  posthog.init(key, {
    api_host: env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com',
    autocapture: false,
    capture_pageview: 'history_change',
    capture_exceptions: true,
    disable_session_recording: true,
    person_profiles: 'identified_only',
    persistence: 'memory',
  });
  posthog.register({ app: 'website' });
  client = posthog;
}

export function reportError(error: unknown, context?: Record<string, unknown>) {
  client?.captureException(error, context);
}
