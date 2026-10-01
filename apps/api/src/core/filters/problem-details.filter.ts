import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { ErrorReporter } from '../../infra/monitoring/error-reporter.service';

const TITLES: Record<number, string> = {
  400: 'Bad request',
  401: 'Not signed in',
  403: 'Not allowed',
  404: 'Not found',
  409: 'Conflict',
  413: 'Payload too large',
  422: 'Validation failed',
  429: 'Too many requests',
  500: 'Something went wrong',
  502: 'Supplier error',
  503: 'Service unavailable',
};

/** Every error leaves the API as RFC 7807 problem details (plan 05). */
@Catch()
@Injectable()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger('HTTP');

  constructor(private readonly reporter: ErrorReporter) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let detail = 'An unexpected error occurred.';
    let code: string | undefined;
    let errors: unknown;

    if (exception instanceof ThrottlerException) {
      status = HttpStatus.TOO_MANY_REQUESTS;
      detail = 'Too many attempts. Please wait a few minutes and try again.';
      code = 'RATE_LIMITED';
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        detail = body;
      } else if (body && typeof body === 'object') {
        const b = body as Record<string, unknown>;
        detail = Array.isArray(b.message)
          ? b.message.join(', ')
          : String(b.message ?? exception.message);
        code = typeof b.code === 'string' ? b.code : undefined;
        errors = b.errors;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        detail = 'A record with these details already exists.';
        code = 'DUPLICATE';
      } else if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        detail = 'The record was not found or was changed by someone else. Refresh and try again.';
        code = 'NOT_FOUND';
      }
    }

    if (status >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
      this.reporter.report(exception, {
        status,
        method: request.method,
        route: request.route?.path ?? request.path,
        traceId: (request as any).id,
      });
      if (
        process.env.NODE_ENV !== 'production' &&
        exception instanceof Error &&
        !(exception instanceof HttpException)
      ) {
        detail = exception.message;
      }
    }

    response
      .status(status)
      .type('application/problem+json')
      .json({
        type: 'about:blank',
        title: TITLES[status] ?? 'Error',
        status,
        detail,
        ...(code ? { code } : {}),
        ...(errors ? { errors } : {}),
        instance: request.originalUrl,
        traceId: (request as any).id,
      });
  }
}
