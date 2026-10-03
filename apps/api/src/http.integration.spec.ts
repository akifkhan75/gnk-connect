import { PublicController } from './modules/public/public.controller';
import {
  AdminSettingsController,
  PartnerPaymentInstructionsController,
} from './modules/settings/settings.controller';
import { ZodPipe } from './core/http/zod.pipe';
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
});
