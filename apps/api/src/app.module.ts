import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from './core/pipes/zod-validation.pipe';
import { ProblemDetailsFilter } from './core/filters/problem-details.filter';
import { RealmAuthGuard } from './modules/auth/guards/realm-auth.guard';
import { PermissionsGuard } from './modules/auth/guards/permissions.guard';
import { PartnerRolesGuard } from './modules/auth/guards/partner-roles.guard';
import { ApprovalGuard } from './modules/auth/guards/approval.guard';
import { AuthModule } from './modules/auth/auth.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { AgentsModule } from './modules/agents/agents.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { validateEnv } from './core/config/env.config';
import { PrismaModule } from './infra/prisma/prisma.module';
import { CryptoModule } from './infra/crypto/crypto.module';
import { v4 as uuidv4 } from 'uuid';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { RedisThrottlerStorage } from '@nestjs-redis/throttler-storage';
import { createClient } from 'redis';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        genReqId: (req: any, res: any) => {
          if (req.id) return req.id;
          let id = req.headers['x-request-id'];
          if (id) return id;
          id = uuidv4();
          res.setHeader('x-request-id', id);
          return id;
        },
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
      },
    }),
    PrismaModule,
    CryptoModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          { name: 'global-anon', ttl: 60000, limit: 60 },
          { name: 'global-auth', ttl: 60000, limit: 300 },
          { name: 'login-short', ttl: 15 * 60000, limit: 5 },
          { name: 'login-long', ttl: 60 * 60000, limit: 20 },
          { name: 'register', ttl: 60 * 60000, limit: 3 },
          { name: 'forgot-email', ttl: 60 * 60000, limit: 3 },
          { name: 'forgot-ip', ttl: 60 * 60000, limit: 10 },
          { name: 'refresh', ttl: 60000, limit: 30 },
          { name: 'totp', ttl: 5 * 60000, limit: 5 },
          { name: 'quote', ttl: 60000, limit: 60 },
          { name: 'booking-create-min', ttl: 60000, limit: 10 },
          { name: 'booking-create-day', ttl: 24 * 60 * 60000, limit: 100 },
          { name: 'upload', ttl: 60 * 60000, limit: 20 },
          { name: 'supplier-sync', ttl: 5 * 60000, limit: 1 },
          { name: 'export', ttl: 60 * 60000, limit: 10 },
        ],
        storage: new RedisThrottlerStorage(
          createClient({ url: config.get('REDIS_URL') as string }),
        ),
      }),
    }),
    AuthModule,
    SuppliersModule,
    PricingModule,
    AgentsModule,
    BookingsModule,
    UploadsModule,
    LedgerModule,
    NotificationsModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    {
      provide: APP_FILTER,
      useClass: ProblemDetailsFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RealmAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PartnerRolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ApprovalGuard,
    },
  ],
})
export class AppModule {}
