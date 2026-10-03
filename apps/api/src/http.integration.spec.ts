import { PublicController } from './modules/public/public.controller';
import {
  AdminSettingsController,
  PartnerPaymentInstructionsController,
} from './modules/settings/settings.controller';
import { ZodPipe } from './core/http/zod.pipe';
import {
  adminConcessionListSchema,
  extendHoldSchema,
  requestConcessionSchema,
  reviewConcessionSchema,
} from '@gnk/validation';
import { z } from 'zod';
import { mockPrisma, staff } from './test/helpers';

describe('HTTP integration', () => {
  it('health returns ok when the database answers', async () => {
    const prisma = mockPrisma();
    const ctrl = new PublicController(
      prisma as never,
      { get: () => undefined } as never,
      { publicRates: async () => ({ base: 'PKR', currencies: [] }) } as never,
    );
    await expect(ctrl.health()).resolves.toEqual({ status: 'ok' });
  });

  it('settings get/update through the controller', async () => {
    const settings = {
      get: jest.fn().mockResolvedValue({
        company: { name: 'GNK' },
        bankAccounts: [],
        booking: { quoteTtlMinutes: 30, paymentTermsNote: 'Net 7' },
        accounting: { requireJvApproval: true },
      }),
      update: jest.fn().mockImplementation(async (dto) => dto),
    };
    const audit = { log: jest.fn() };
    const admin = new AdminSettingsController(settings as never, audit as never);
    expect(await admin.get()).toMatchObject({ company: { name: 'GNK' } });
    await admin.update(
      staff(),
      {
        company: { name: 'GNK', address: 'x', phone: '1', email: 'a@b.c' },
        bankAccounts: [],
        booking: { quoteTtlMinutes: 15, paymentTermsNote: '' },
        accounting: { requireJvApproval: false },
      } as never,
      { ip: null, userAgent: null, requestId: null },
    );
    expect(settings.update).toHaveBeenCalled();
    const partner = new PartnerPaymentInstructionsController(settings as never);
    expect(await partner.get()).toMatchObject({ note: 'Net 7' });
  });

  it('ZodPipe integration with a real schema', () => {
    const pipe = new ZodPipe(z.object({ seats: z.number().int().min(1) }));
    expect(pipe.transform({ seats: 2 })).toEqual({ seats: 2 });
    expect(() => pipe.transform({ seats: 0 })).toThrow();
  });

  it('validates AirDesk per-seat discount requests', () => {
    const request = new ZodPipe(requestConcessionSchema);
    expect(request.transform({ type: 'DISCOUNT', adultAmount: 10000, childAmount: 3000 })).toEqual({
      type: 'DISCOUNT',
      adultAmount: 10000,
      childAmount: 3000,
      infantAmount: 0,
    });
    expect(() => request.transform({ type: 'DISCOUNT', adultAmount: 0, childAmount: 0 })).toThrow();
    const review = new ZodPipe(reviewConcessionSchema);
    expect(review.transform({ decision: 'GRANT', amount: 2500 })).toMatchObject({
      decision: 'GRANT',
      amount: 2500,
    });
    expect(
      review.transform({
        decision: 'GRANT',
        seats: 2,
        pnr: 'abc123',
        adultAmount: 8000,
        childAmount: 0,
        infantAmount: 0,
      }),
    ).toMatchObject({
      decision: 'GRANT',
      seats: 2,
      pnr: 'ABC123',
      adultAmount: 8000,
    });
    const hold = new ZodPipe(extendHoldSchema);
    expect(hold.transform({ holdExpiresAt: '2026-10-10T12:00:00.000Z' })).toEqual({
      holdExpiresAt: '2026-10-10T12:00:00.000Z',
    });
    expect(() => hold.transform({ holdExpiresAt: 'not-a-date' })).toThrow();
    const concessions = new ZodPipe(adminConcessionListSchema);
    expect(concessions.transform({})).toEqual({ page: 1, pageSize: 25, status: 'PENDING' });
    expect(concessions.transform({ status: 'GRANTED', page: '2' })).toMatchObject({
      status: 'GRANTED',
      page: 2,
    });
  });
});
