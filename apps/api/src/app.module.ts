import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { RedisThrottlerStorage } from '@nestjs-redis/throttler-storage';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import { validateEnv, type EnvConfig } from './core/config/env.config';
import { ProblemDetailsFilter } from './core/filters/problem-details.filter';
import { CryptoModule } from './infra/crypto/crypto.module';
import { MailerModule } from './infra/mailer/mailer.module';
import { PrismaModule } from './infra/prisma/prisma.module';
import { REDIS, RedisModule, type RedisClient } from './infra/redis/redis.module';
import { StorageModule } from './infra/storage/storage.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { PlatformModule } from './modules/platform.module';
import { AccessGuard } from './modules/auth/guards/access.guard';
import { RealmAuthGuard } from './modules/auth/guards/realm-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: ['../../.env', '.env'],
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvConfig, true>) => {
        const dev = config.get('NODE_ENV', { infer: true }) !== 'production';
        return {
          pinoHttp: {
            level: dev ? 'info' : 'info',
            genReqId: (req, res) => {
              const id = (req.headers['x-request-id'] as string) || randomUUID();
              res.setHeader('x-request-id', id);
              return id;
            },
            // Never log credentials or tokens.
            redact: [
              'req.headers.authorization',
              'req.headers.cookie',
              'res.headers["set-cookie"]',
            ],
            autoLogging: { ignore: (req) => req.url === '/api/v1/health' },
            transport: dev
              ? { target: 'pino-pretty', options: { singleLine: true, colorize: true } }
              : undefined,
          },
        };
      },
    }),
    RedisModule,
    ThrottlerModule.forRootAsync({
      inject: [REDIS, ConfigService],
      useFactory: (redis: RedisClient, config: ConfigService<EnvConfig, true>) => ({
        // One default tier; sensitive routes override it with @Throttle (plan 04 §5).
        throttlers: [{ name: 'default', ttl: 60_000, limit: 300 }],
        storage: new RedisThrottlerStorage(redis),
        skipIf: () => config.get('NODE_ENV', { infer: true }) === 'test',
      }),
    }),
    PrismaModule,
    CryptoModule,
    MailerModule,
    StorageModule,
    AuditModule,
    AuthModule,
    PlatformModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: ProblemDetailsFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: RealmAuthGuard },
    { provide: APP_GUARD, useClass: AccessGuard },
  ],
})
export class AppModule {}
