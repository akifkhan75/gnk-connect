import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { SettingsDto } from '@gnk/types';
import type { SettingsInput } from '@gnk/validation';
import { PrismaService } from '../../infra/prisma/prisma.service';

const DEFAULTS: SettingsDto = {
  company: {
    name: 'GNK Connect',
    address: 'Islamabad, Pakistan',
    phone: '',
    email: 'partners@gnkconnect.pk',
  },
  bankAccounts: [],
  booking: { quoteTtlMinutes: 30, paymentTermsNote: '' },
};

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<SettingsDto> {
    const rows = await this.prisma.setting.findMany({
      where: { key: { in: Object.keys(DEFAULTS) } },
    });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      company: { ...DEFAULTS.company, ...(map.company as object) },
      bankAccounts: (map.bankAccounts as unknown as SettingsDto['bankAccounts']) ?? [],
      booking: { ...DEFAULTS.booking, ...(map.booking as object) },
    };
  }

  async update(input: SettingsInput, updatedById: string): Promise<SettingsDto> {
    await this.prisma.$transaction(
      (Object.keys(DEFAULTS) as (keyof SettingsDto)[]).map((key) =>
        this.prisma.setting.upsert({
          where: { key },
          update: { value: input[key] as Prisma.InputJsonValue, updatedById },
          create: { key, value: input[key] as Prisma.InputJsonValue, updatedById },
        }),
      ),
    );
    return this.get();
  }
}
