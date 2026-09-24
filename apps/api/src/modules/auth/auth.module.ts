import { Global, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { ApprovalGuard } from './guards/approval.guard';

@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, RolesGuard, ApprovalGuard],
  exports: [AuthService, JwtAuthGuard, RolesGuard, ApprovalGuard],
})
export class AuthModule {}
