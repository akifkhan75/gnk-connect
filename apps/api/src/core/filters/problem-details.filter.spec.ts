import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Prisma } from '@prisma/client';
import { ProblemDetailsFilter } from './problem-details.filter';

const host = (overrides: { exception?: unknown } = {}) => {
  const json = jest.fn();
  const type = jest.fn().mockReturnValue({ json });
  const status = jest.fn().mockReturnValue({ type });
  const response = { status };
  const request = { originalUrl: '/api/v1/partner/bookings', id: 'trace-1' };
  return {
    host: {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as never,
    status,
    type,
    json,
    ...overrides,
  };
};

describe('ProblemDetailsFilter', () => {
  const filter = new ProblemDetailsFilter();

  it('maps HttpException string bodies', () => {
    const ctx = host();
    filter.catch(new BadRequestException('Nope'), ctx.host);
    expect(ctx.status).toHaveBeenCalledWith(400);
    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Bad request',
        detail: 'Nope',
        instance: '/api/v1/partner/bookings',
        traceId: 'trace-1',
      }),
    );
  });

  it('maps object bodies with codes and field errors', () => {
    const ctx = host();
    filter.catch(
      new HttpException(
        { message: ['a', 'b'], code: 'VALIDATION_FAILED', errors: [{ path: 'x' }] },
        HttpStatus.UNPROCESSABLE_ENTITY,
      ),
      ctx.host,
    );
    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 422,
        detail: 'a, b',
        code: 'VALIDATION_FAILED',
        errors: [{ path: 'x' }],
      }),
    );
  });

  it('maps rate limits and Prisma unique/not-found', () => {
    const ctx = host();
    filter.catch(new ThrottlerException(), ctx.host);
    expect(ctx.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'RATE_LIMITED' }));

    const dup = new Prisma.PrismaClientKnownRequestError('x', {
      code: 'P2002',
      clientVersion: '5',
    });
    filter.catch(dup, host().host);
    const missing = new Prisma.PrismaClientKnownRequestError('x', {
      code: 'P2025',
      clientVersion: '5',
    });
    const ctx2 = host();
    filter.catch(missing, ctx2.host);
    expect(ctx2.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'NOT_FOUND' }));
  });

  it('exposes unexpected error messages outside production', () => {
    const ctx = host();
    filter.catch(new Error('boom'), ctx.host);
    expect(ctx.status).toHaveBeenCalledWith(500);
    expect(ctx.json).toHaveBeenCalledWith(expect.objectContaining({ detail: 'boom' }));
  });
});
