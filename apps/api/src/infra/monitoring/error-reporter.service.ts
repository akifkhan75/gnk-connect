import { Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PostHog } from 'posthog-node';
import type { EnvConfig } from '../../core/config/env.config';

/**
 * Sends unexpected server errors (5xx, crashes) to PostHog error tracking when POSTHOG_KEY is
 * set; otherwise does nothing. Only the error, route and trace id are sent — never bodies.
 */
@Injectable()
export class ErrorReporter implements OnApplicationShutdown {
  private readonly logger = new Logger(ErrorReporter.name);
  private readonly client: PostHog | null;

  constructor(config: ConfigService<EnvConfig, true>) {
    const key = config.get('POSTHOG_KEY', { infer: true });
    this.client = key
      ? new PostHog(key, {
          host: config.get('POSTHOG_HOST', { infer: true }),
          flushAt: 1,
          flushInterval: 5_000,
        })
      : null;
    if (this.client) {
      process.on('unhandledRejection', (e) => this.report(e, { source: 'unhandledRejection' }));
      this.logger.log('Error reporting to PostHog is on');
    }
  }

  report(error: unknown, context: Record<string, unknown> = {}) {
    if (!this.client) return;
    try {
      this.client.captureException(error, 'gnk-api', { app: 'api', ...context });
    } catch (e) {
      this.logger.warn(`Could not report error: ${(e as Error).message}`);
    }
  }

  async onApplicationShutdown() {
    await this.client?.shutdown();
  }
}
