import { Global, Inject, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type RedisClientType } from 'redis';
import type { EnvConfig } from '../../core/config/env.config';

export const REDIS = Symbol('REDIS');
export type RedisClient = RedisClientType;

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [ConfigService],
      useFactory: async (config: ConfigService<EnvConfig, true>) => {
        const logger = new Logger('Redis');
        const url = config.get('REDIS_URL', { infer: true });
        let connected = false;
        const client = createClient({
          url,
          socket: {
            connectTimeout: 5_000,
            // Fail fast at boot instead of retrying forever; reconnect with backoff once we've been up.
            reconnectStrategy: (retries) =>
              connected ? Math.min(retries * 200, 5_000) : new Error('Redis unreachable'),
          },
        }) as RedisClientType;
        client.on('error', (err: Error & { code?: string }) =>
          logger.error(`Redis error: ${err.message || err.code || err.name}`),
        );
        try {
          await client.connect();
        } catch (err) {
          throw new Error(
            `Cannot connect to Redis at ${url.replace(/\/\/[^@]*@/, '//***@')}. Is it running? (${(err as Error).message})`,
            { cause: err },
          );
        }
        connected = true;
        return client;
      },
    },
  ],
  exports: [REDIS],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS) private readonly client: RedisClient) {}

  async onApplicationShutdown() {
    if (this.client.isOpen) await this.client.quit();
  }
}
