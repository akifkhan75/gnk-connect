import { Global, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PermissionsGuard } from './guards/permissions.guard';
import { PartnerRolesGuard } from './guards/partner-roles.guard';
import { ApprovalGuard } from './guards/approval.guard';

import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PermissionsGuard, PartnerRolesGuard, ApprovalGuard],
  exports: [AuthService, PermissionsGuard, PartnerRolesGuard, ApprovalGuard, JwtModule],
})
export class AuthModule {}
