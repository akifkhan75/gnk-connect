import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { ApprovalGuard } from './guards/approval.guard';
import { Roles, RequireApprovedAgent, CurrentUser } from './decorators/roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { email: string; password?: string }) {
    return this.authService.login(body);
  }

  @Post('register')
  async register(@Body() body: any) {
    return this.authService.register(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@CurrentUser() user: any) {
    return this.authService.getProfile(user.sub);
  }

  // Example Admin-Only Endpoint
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('GNK_ADMIN')
  @Get('admin-check')
  async adminCheck(@CurrentUser() user: any) {
    return { status: 'OK', message: 'Authorized GNK Operations Admin', user };
  }

  // Example Approved-Partner Protected Endpoint
  @UseGuards(JwtAuthGuard, ApprovalGuard)
  @RequireApprovedAgent()
  @Get('wholesale-check')
  async wholesaleCheck(@CurrentUser() user: any) {
    return { status: 'OK', message: 'Authorized Active Partner Agent', user };
  }
}
