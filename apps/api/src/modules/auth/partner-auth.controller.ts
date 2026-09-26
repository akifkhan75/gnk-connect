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
import { z } from 'zod';
import {
  acceptInviteSchema,
  changePasswordSchema,
  forcedPasswordChangeSchema,
  forgotPasswordSchema,
  loginSchema,
  partnerRegisterSchema,
  resetPasswordSchema,
  themePreferenceSchema,
  updateMyProfileSchema,
  verifyEmailSchema,
} from '@gnk/validation';
import type { PartnerRegisterData } from '@gnk/validation';
import { ZodPipe } from '../../core/http/zod.pipe';
import { UUID } from '../../core/http/parse-uuid';
import { Meta, metaFrom, type RequestMeta } from '../../core/http/request-meta';
import { CurrentActor, Public } from './decorators';
import type { PartnerActor } from './auth.types';
import { PartnerAuthService } from './partner-auth.service';
import { SessionService } from './session.service';

const MIN = 60_000;
const accountSwitchSchema = z.object({ accountId: z.uuid().optional() });
const existingUserAcceptSchema = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(1).max(128),
});

@Controller('auth/partner')
export class PartnerAuthController {
  constructor(
    private readonly auth: PartnerAuthService,
    private readonly sessions: SessionService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60 * MIN } })
  @Post('register')
  @HttpCode(202)
  register(
    @Body(new ZodPipe(partnerRegisterSchema)) dto: PartnerRegisterData,
    @Meta() meta: RequestMeta,
  ) {
    return this.auth.register(dto, meta);
  }

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
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body(new ZodPipe(accountSwitchSchema)) body: { accountId?: string },
  ) {
    const { userId, tokens } = await this.sessions.refresh(
      'PARTNER',
      req,
      res,
      metaFrom(req),
      body.accountId,
    );
    const session = await this.auth.buildSession(userId, body.accountId);
    // Re-issue with the resolved account so the token's `acc` matches the session we return.
    const access = this.sessions.reissueAccess(
      'PARTNER',
      userId,
      tokens.sessionId,
      session.account.accountId,
    );
    return { accessToken: access.accessToken, expiresIn: access.expiresIn, session };
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.sessions.logout('PARTNER', req, res);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60 * MIN } })
  @Post('verify-email')
  @HttpCode(200)
  verifyEmail(@Body(new ZodPipe(verifyEmailSchema)) dto: { token: string }) {
    return this.auth.verifyEmail(dto.token);
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
    @Body() body: unknown,
    @Meta() meta: RequestMeta,
    @Res({ passthrough: true }) res: Response,
  ) {
    // New users set name + password; existing users confirm with their current password.
    const full = acceptInviteSchema.safeParse(body);
    const dto = full.success ? full.data : new ZodPipe(existingUserAcceptSchema).transform(body);
    return this.auth.acceptInvite(dto, meta, res);
  }

  // ---- Authenticated (partner token) ----

  @Get('me')
  me(@CurrentActor() actor: PartnerActor) {
    return this.auth.buildSession(actor.userId, actor.accountId);
  }

  @Patch('me')
  updateMe(
    @CurrentActor() actor: PartnerActor,
    @Body(new ZodPipe(updateMyProfileSchema)) dto: z.output<typeof updateMyProfileSchema>,
  ) {
    return this.auth.updateMe(actor, dto);
  }

  @Post('switch-account')
  @HttpCode(200)
  async switchAccount(
    @CurrentActor() actor: PartnerActor,
    @Body(new ZodPipe(accountSwitchSchema)) body: { accountId?: string },
  ) {
    const session = await this.auth.buildSession(actor.userId, body.accountId);
    const access = this.sessions.reissueAccess(
      'PARTNER',
      actor.userId,
      actor.sessionId,
      session.account.accountId,
    );
    return { accessToken: access.accessToken, expiresIn: access.expiresIn, session };
  }

  @Throttle({ default: { limit: 3, ttl: 60 * MIN } })
  @Post('resend-verification')
  @HttpCode(200)
  resend(@CurrentActor() actor: PartnerActor) {
    return this.auth.resendVerification(actor);
  }

  @Throttle({ default: { limit: 10, ttl: 60 * MIN } })
  @Post('change-password')
  @HttpCode(200)
  changePassword(
    @CurrentActor() actor: PartnerActor,
    @Body(new ZodPipe(changePasswordSchema)) dto: z.output<typeof changePasswordSchema>,
    @Meta() meta: RequestMeta,
  ) {
    return this.auth.changePassword(actor, dto, meta);
  }

  @Throttle({ default: { limit: 10, ttl: 60 * MIN } })
  @Post('set-password')
  @HttpCode(200)
  setPassword(
    @CurrentActor() actor: PartnerActor,
    @Body(new ZodPipe(forcedPasswordChangeSchema)) dto: z.output<typeof forcedPasswordChangeSchema>,
    @Meta() meta: RequestMeta,
  ) {
    return this.auth.setInitialPassword(actor, dto, meta);
  }

  @Patch('preferences')
  preferences(
    @CurrentActor() actor: PartnerActor,
    @Body(new ZodPipe(themePreferenceSchema)) dto: z.output<typeof themePreferenceSchema>,
  ) {
    return this.auth.setTheme(actor, dto.theme);
  }

  @Get('sessions')
  listSessions(@CurrentActor() actor: PartnerActor) {
    return this.sessions.list('PARTNER', actor.userId, actor.sessionId);
  }

  @Delete('sessions/:id')
  @HttpCode(204)
  async revokeSession(@CurrentActor() actor: PartnerActor, @Param('id', UUID) id: string) {
    await this.sessions.revokeOne('PARTNER', actor.userId, id);
  }

  @Post('logout-all')
  @HttpCode(204)
  async logoutAll(
    @CurrentActor() actor: PartnerActor,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    await this.sessions.revokeAllForUser('PARTNER', actor.userId, 'logout_all');
    await this.sessions.logout('PARTNER', req, res).catch(() => undefined);
  }
}
