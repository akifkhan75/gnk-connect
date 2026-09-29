import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface RequestMeta {
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
}

export function metaFrom(req: Request): RequestMeta {
  return {
    ip: (req.ip || '').replace(/^::ffff:/, '') || null,
    userAgent: req.headers['user-agent']?.slice(0, 300) ?? null,
    requestId: ((req as any).id as string) ?? null,
  };
}

/** Injects IP / user agent / request id for audit entries and session records. */
export const Meta = createParamDecorator((_: unknown, ctx: ExecutionContext): RequestMeta =>
  metaFrom(ctx.switchToHttp().getRequest<Request>()),
);
