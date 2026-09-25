import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { TokenPayload } from '../auth.service';

export const IS_PUBLIC_KEY = 'isPublic';

@Injectable()
export class RealmAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('Missing authorization token');
    }

    const url = request.url;

    let expectedAud: string | null = null;

    if (url.startsWith('/api/v1/partner') || url.startsWith('/api/v1/auth/partner')) {
      expectedAud = 'gnk-portal';
    } else if (url.startsWith('/api/v1/admin') || url.startsWith('/api/v1/auth/staff')) {
      expectedAud = 'gnk-admin';
    }

    try {
      const payload = await this.jwtService.verifyAsync<TokenPayload>(token);

      if (expectedAud && payload.aud !== expectedAud) {
        throw new UnauthorizedException('Token audience does not match realm');
      }

      request['user'] = payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
