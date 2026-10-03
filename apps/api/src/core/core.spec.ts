import { BadRequestException, UnprocessableEntityException } from '@nestjs/common';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { num, numOrNull, iso, isoDate } from './money';
import { pageArgs, paginated } from './http/pagination';
import { metaFrom } from './http/request-meta';
import { ZodPipe } from './http/zod.pipe';
import { UUID } from './http/parse-uuid';
import { validateEnv } from './config/env.config';
import { SequencesService } from './sequences.service';
import { mockPrisma } from '../test/helpers';

describe('money', () => {
  it('converts decimals and dates', () => {
    expect(num(null)).toBe(0);
    expect(num(12.5)).toBe(12.5);
    expect(num(new Prisma.Decimal('19.20'))).toBe(19.2);
    expect(numOrNull(null)).toBeNull();
    expect(numOrNull(3)).toBe(3);
    expect(iso(null)).toBeNull();
    expect(isoDate(null)).toBeNull();
    const d = new Date('2026-10-01T12:00:00.000Z');
    expect(iso(d)).toBe('2026-10-01T12:00:00.000Z');
    expect(isoDate(d)).toBe('2026-10-01');
  });
});

describe('pagination', () => {
  it('pages and wraps results', () => {
    expect(pageArgs({ page: 3, pageSize: 10 })).toEqual({ skip: 20, take: 10 });
    expect(paginated(['a'], 11, { page: 2, pageSize: 10 })).toEqual({
      items: ['a'],
      total: 11,
      page: 2,
      pageSize: 10,
    });
  });
});

describe('request meta', () => {
  it('strips ipv4-mapped addresses', () => {
    expect(
      metaFrom({
        ip: '::ffff:10.0.0.8',
        headers: { 'user-agent': 'Chrome'.repeat(80) },
        id: 'abc',
      } as never),
    ).toEqual({
      ip: '10.0.0.8',
      userAgent: 'Chrome'.repeat(80).slice(0, 300),
      requestId: 'abc',
    });
    expect(metaFrom({ ip: '', headers: {} } as never)).toEqual({
      ip: null,
      userAgent: null,
      requestId: null,
    });
  });
});

describe('ZodPipe', () => {
  const pipe = new ZodPipe(z.object({ name: z.string().min(1) }));
  it('rejects a missing body', () => {
    expect(() => pipe.transform(undefined)).toThrow(BadRequestException);
  });
  it('allows an optional missing body', () => {
    const optional = new ZodPipe(z.object({ q: z.string().optional() }).optional(), {
      optional: true,
    });
    expect(optional.transform(undefined)).toBeUndefined();
  });
  it('maps zod issues to 422', () => {
    try {
      pipe.transform({ name: '' });
      throw new Error('expected');
    } catch (e) {
      expect(e).toBeInstanceOf(UnprocessableEntityException);
      expect((e as UnprocessableEntityException).getResponse()).toMatchObject({
        code: 'VALIDATION_FAILED',
      });
    }
  });
  it('returns parsed data', () => {
    expect(pipe.transform({ name: 'GNK' })).toEqual({ name: 'GNK' });
  });
});

describe('UUID pipe', () => {
  it('is a ParseUUIDPipe', () => {
    expect(UUID).toBeDefined();
  });
});

describe('validateEnv', () => {
  const base = {
    DATABASE_URL: 'postgresql://gnk:gnk@localhost:5432/gnk',
    REDIS_URL: 'redis://localhost:6379',
    JWT_SECRET: 'ci-only-secret-that-is-at-least-32-characters-long',
    PII_ENCRYPTION_KEY: 'v1:' + '0'.repeat(64),
  };

  it('accepts a valid test config', () => {
    const env = validateEnv({ ...base, NODE_ENV: 'test', SUPPLIER_MODE: 'mock' });
    expect(env.PORT).toBe(4000);
    expect(env.SUPPLIER_MODE).toBe('mock');
  });

  it('rejects a short JWT secret', () => {
    expect(() => validateEnv({ ...base, JWT_SECRET: 'short' })).toThrow(
      'Invalid environment configuration',
    );
  });

  it('rejects live supplier mode', () => {
    expect(() => validateEnv({ ...base, SUPPLIER_MODE: 'live' })).toThrow(
      'Invalid environment configuration',
    );
  });

  it('warns when mock mode is used in production', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation();
    validateEnv({ ...base, NODE_ENV: 'production', SUPPLIER_MODE: 'mock' });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('SequencesService', () => {
  it('formats booking and partner numbers', async () => {
    const prisma = mockPrisma();
    prisma.$queryRaw.mockResolvedValueOnce([{ last: 7 }]).mockResolvedValueOnce([{ last: 3 }]);
    const seq = new SequencesService(prisma as never);
    const year = new Date().getFullYear();
    await expect(seq.next('BOOKING')).resolves.toBe(`GNK-${year}-000007`);
    await expect(seq.next('PARTNER')).resolves.toBe('AGT-000003');
  });

  it('maps PAYMENT vouchers onto the PAYMENT_VOUCHER series', async () => {
    const prisma = mockPrisma();
    prisma.$queryRaw.mockResolvedValue([{ last: 1 }]);
    const seq = new SequencesService(prisma as never);
    const year = new Date().getFullYear();
    await expect(seq.voucher('PAYMENT')).resolves.toBe(`PV-${year}-000001`);
    await expect(seq.voucher('JOURNAL')).resolves.toBe(`JV-${year}-000001`);
  });
});
