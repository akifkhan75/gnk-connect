import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { EnvConfig } from '../../core/config/env.config';
import { SequencesService } from '../../core/sequences.service';
import { ActorResolverService } from './actor-resolver.service';
import { AuthCacheService } from './auth-cache.service';
import { PartnerAuthController } from './partner-auth.controller';
import { PartnerAuthService } from './partner-auth.service';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';
import { StaffAuthController } from './staff-auth.controller';
import { StaffAuthService } from './staff-auth.service';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvConfig, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: { algorithm: 'HS256' },
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
  ],
  controllers: [PartnerAuthController, StaffAuthController],
  providers: [
    ActorResolverService,
    AuthCacheService,
    PasswordService,
    SessionService,
    PartnerAuthService,
    StaffAuthService,
    SequencesService,
  ],
  exports: [
    ActorResolverService,
    AuthCacheService,
    PasswordService,
    SessionService,
    SequencesService,
    JwtModule,
  ],
})
export class AuthModule {}
