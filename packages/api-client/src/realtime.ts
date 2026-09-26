import type { RealtimeEvent } from '@gnk/types';
import type { HttpClient } from './http';

export type LiveStatus = 'connecting' | 'live' | 'offline';

/**
 * Keeps a live-updates stream open, reconnecting with backoff. The server ends streams
 * every 15 minutes ("reauth") so a fresh access token is used; that reconnects at once.
 * Returns a function that closes the stream for good.
 */
export function subscribeEvents(
  http: HttpClient,
  path: string,
  onEvent: (e: RealtimeEvent) => void,
  onStatus?: (s: LiveStatus) => void,
): () => void {
  let stopped = false;
  let controller: AbortController | null = null;
  let delay = 1000;

  const loop = async () => {
    while (!stopped) {
      controller = new AbortController();
      onStatus?.('connecting');
      let reauth = false;
      try {
        await http.stream(
          path,
          (event, data) => {
            if (event === 'ready') {
              delay = 1000;
              onStatus?.('live');
            } else if (event === 'reauth') reauth = true;
            else if (event === 'change') {
              try {
                onEvent(JSON.parse(data) as RealtimeEvent);
              } catch {
                /* ignore malformed events */
              }
            }
          },
          controller.signal,
        );
      } catch {
        /* network drop or auth failure: retry below */
      }
      if (stopped) break;
      if (!reauth) {
        onStatus?.('offline');
        await new Promise((r) => setTimeout(r, delay));
        delay = Math.min(delay * 2, 30_000);
      }
    }
  };
  void loop();
  return () => {
    stopped = true;
    controller?.abort();
  };
}
