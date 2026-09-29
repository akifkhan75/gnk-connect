import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { z } from 'zod';
import {
  acceptInviteSchema,
  changePasswordSchema,
  forcedPasswordChangeSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  themePreferenceSchema,
} from '@gnk/validation';
import { ZodPipe } from '../../core/http/zod.pipe';
import { UUID } from '../../core/http/parse-uuid';
import { Meta, metaFrom, type RequestMeta } from '../../core/http/request-meta';
import { CurrentActor, Public } from './decorators';
import type { StaffActor } from './auth.types';
import { SessionService } from './session.service';
import { StaffAuthService } from './staff-auth.service';

const MIN = 60_000;

@Controller('auth/staff')
export class StaffAuthController {
  constructor(
    private readonly auth: StaffAuthService,
    private readonly sessions: SessionService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 15 * MIN } })
  @Post('login')
  @HttpCode(200)
  login(
    @Body(new ZodPipe(loginSchema)) dto: z.output<typeof loginSchema>,
    @Meta() meta: RequestMeta,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.login(dto.email, dto.password, meta, res);
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: MIN } })
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { userId, tokens } = await this.sessions.refresh('STAFF', req, res, metaFrom(req));
    return {
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
      session: await this.auth.buildSession(userId),
    };
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.sessions.logout('STAFF', req, res);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60 * MIN } })
  @Post('forgot-password')
  @HttpCode(202)
  forgot(@Body(new ZodPipe(forgotPasswordSchema)) dto: { email: string }) {
    return this.auth.forgotPassword(dto.email);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60 * MIN } })
  @Post('reset-password')
  @HttpCode(200)
  reset(
    @Body(new ZodPipe(resetPasswordSchema)) dto: z.output<typeof resetPasswordSchema>,
    @Meta() meta: RequestMeta,
  ) {
    return this.auth.resetPassword(dto, meta);
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60 * MIN } })
  @Get('invites/:token')
  lookupInvite(@Param('token') token: string) {
    return this.auth.lookupInvite(token);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60 * MIN } })
  @Post('accept-invite')
  @HttpCode(200)
  acceptInvite(
    @Body(new ZodPipe(acceptInviteSchema)) dto: z.output<typeof acceptInviteSchema>,
    @Meta() meta: RequestMeta,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.acceptInvite(dto, meta, res);
  }

  // ---- Authenticated (staff token) ----

  @Get('me')
  me(@CurrentActor() actor: StaffActor) {
    return this.auth.buildSession(actor.userId);
  }

  @Throttle({ default: { limit: 10, ttl: 60 * MIN } })
  @Post('change-password')
  @HttpCode(200)
  changePassword(
    @CurrentActor() actor: StaffActor,
    @Body(new ZodPipe(changePasswordSchema)) dto: z.output<typeof changePasswordSchema>,
    @Meta() meta: RequestMeta,
  ) {
    return this.auth.changePassword(actor, dto, meta);
  }

  @Throttle({ default: { limit: 10, ttl: 60 * MIN } })
  @Post('set-password')
  @HttpCode(200)
  setPassword(
    @CurrentActor() actor: StaffActor,
    @Body(new ZodPipe(forcedPasswordChangeSchema)) dto: z.output<typeof forcedPasswordChangeSchema>,
    @Meta() meta: RequestMeta,
  ) {
    return this.auth.setInitialPassword(actor, dto, meta);
  }

  @Patch('preferences')
  preferences(
    @CurrentActor() actor: StaffActor,
    @Body(new ZodPipe(themePreferenceSchema)) dto: z.output<typeof themePreferenceSchema>,
  ) {
    return this.auth.setTheme(actor, dto.theme);
  }

  @Get('sessions')
  listSessions(@CurrentActor() actor: StaffActor) {
    return this.sessions.list('STAFF', actor.userId, actor.sessionId);
  }

  @Delete('sessions/:id')
  @HttpCode(204)
  async revokeSession(@CurrentActor() actor: StaffActor, @Param('id', UUID) id: string) {
    await this.sessions.revokeOne('STAFF', actor.userId, id);
  }

  @Post('logout-all')
  @HttpCode(204)
  async logoutAll(
    @CurrentActor() actor: StaffActor,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    await this.sessions.revokeAllForUser('STAFF', actor.userId, 'logout_all');
    await this.sessions.logout('STAFF', req, res).catch(() => undefined);
  }
}
