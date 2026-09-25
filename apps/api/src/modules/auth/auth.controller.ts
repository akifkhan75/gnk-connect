import { Controller, Post, Body, Req, Res, Ip, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Request, Response } from 'express';
import { Public } from '../../core/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('partner/login')
  @HttpCode(200)
  async partnerLogin(
    @Body() body: { email: string; password?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
  ) {
    const userAgent = req.headers['user-agent'];
    const result = await this.authService.partnerLogin(body.email, body.password, userAgent, ip);

    res.cookie('gnk_prt_rt', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth/partner',
      // domain: process.env.PARTNER_DOMAIN // omitted for local dev
    });

    return {
      accessToken: result.tokens.accessToken,
      user: result.user,
      memberships: result.memberships,
    };
  }

  @Public()
  @Post('partner/register')
  @HttpCode(202)
  async partnerRegister(@Body() body: any) {
    // Return 202 accepted always. Registration logic will go here.
    return { message: 'Check your email for the verification link.' };
  }
}
