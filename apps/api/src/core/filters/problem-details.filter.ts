import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let title = 'Internal Server Error';
    let detail = 'An unexpected error occurred.';
    const type = 'about:blank';
    const extensions: Record<string, any> = {};

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Check if it's our own custom structured error (like ZodValidationPipe)
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const res = exceptionResponse as any;
        title = res.error || res.message || 'Error';
        detail = Array.isArray(res.message) ? res.message.join(', ') : res.message || detail;

        if (res.errors) {
          extensions['errors'] = res.errors; // specific for Zod validation
        }
      } else {
        title = exception.message;
        detail = typeof exceptionResponse === 'string' ? exceptionResponse : exception.message;
      }
    } else if (exception instanceof Error) {
      // In production, do not expose internal error messages for 500s
      if (process.env.NODE_ENV !== 'production') {
        detail = exception.message;
        extensions['stack'] = exception.stack;
      }
    }

    const problemDetails = {
      type,
      title,
      status,
      detail,
      instance: request.url,
      traceId: request.id, // provided by pino-http
      ...extensions,
    };

    // Ensure content-type is application/problem+json
    response.setHeader('Content-Type', 'application/problem+json');
    response.status(status).json(problemDetails);
  }
}
