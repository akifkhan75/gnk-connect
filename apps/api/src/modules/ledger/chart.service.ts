import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type LedgerAccount } from '@prisma/client';
import type { AccountBalanceDto, AccountOption, ChartAccountDto } from '@gnk/types';
import type { z } from 'zod';
import type { accountCreateSchema, accountUpdateSchema } from '@gnk/validation';
import { Decimal, num } from '../../core/money';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { BASE, toDate } from './ledger.service';

type CreateInput = z.output<typeof accountCreateSchema>;
type UpdateInput = z.output<typeof accountUpdateSchema>;
interface Sums {
  balance: Prisma.Decimal;
  fc: Prisma.Decimal | null;
}

/** Chart of accounts: tree, pickers, balances, and maintenance. */
@Injectable()
export class ChartService {
  constructor(private readonly prisma: PrismaService) {}

  /** Every account in code order, with balances rolled up into groups. */
  async list(asOf?: string): Promise<ChartAccountDto[]> {
    const [accounts, sums] = await Promise.all([
      this.prisma.ledgerAccount.findMany({ orderBy: { code: 'asc' } }),
      this.sums(asOf),
    ]);
    const children = new Map<string | null, LedgerAccount[]>();
    for (const a of accounts) children.set(a.parentId, [...(children.get(a.parentId) ?? []), a]);
    const rolled = new Map<string, Prisma.Decimal>();
    const roll = (a: LedgerAccount): Prisma.Decimal => {
      const own = sums.get(a.id)?.balance ?? new Decimal(0);
      const total = (children.get(a.id) ?? []).reduce((s, c) => s.plus(roll(c)), own);
      rolled.set(a.id, total);
      return total;
    };
    for (const root of children.get(null) ?? []) roll(root);
    return accounts.map((a) =>
      this.toDto(a, rolled.get(a.id) ?? new Decimal(0), sums.get(a.id)?.fc),
    );
  }

  /** Postable, active accounts for voucher line pickers. */
  async options(): Promise<AccountOption[]> {
    const accounts = await this.prisma.ledgerAccount.findMany({ orderBy: { code: 'asc' } });
    const byId = new Map(accounts.map((a) => [a.id, a]));
    const path = (a: LedgerAccount) => {
      const names: string[] = [];
      for (
        let p = a.parentId ? byId.get(a.parentId) : undefined;
        p;
        p = p.parentId ? byId.get(p.parentId) : undefined
      )
        names.unshift(p.name);
      return names.join(' › ');
    };
    return accounts
      .filter((a) => !a.isGroup && a.isActive)
      .map((a) => ({
        id: a.id,
        code: a.code,
        name: a.name,
        class: a.class,
        currency: a.currency,
        systemKey: a.systemKey,
        path: path(a),
      }));
  }

  async get(id: string): Promise<ChartAccountDto> {
    const account = await this.prisma.ledgerAccount.findUnique({ where: { id } });
    if (!account) throw new NotFoundException('Account not found');
    const balance = await this.balance(id);
    return this.toDto(
      account,
      new Decimal(balance.balance),
      balance.fcBalance == null ? null : new Decimal(balance.fcBalance),
    );
  }

  /** Current balance; for foreign accounts also the rate the open balance is carried at. */
  async balance(id: string): Promise<AccountBalanceDto> {
    const account = await this.prisma.ledgerAccount.findUnique({ where: { id } });
    if (!account) throw new NotFoundException('Account not found');
    const s = (await this.sums(undefined, [id])).get(id);
    const balance = s?.balance ?? new Decimal(0);
    const fc = account.currency === BASE ? null : (s?.fc ?? new Decimal(0));
    return {
      accountId: id,
      currency: account.currency,
      balance: num(balance),
      fcBalance: fc == null ? null : num(fc),
      carryingRate: fc && !fc.isZero() ? num(balance.div(fc).toDecimalPlaces(6)) : null,
    };
  }

  async create(dto: CreateInput) {
    const parent = dto.parentId
      ? await this.prisma.ledgerAccount.findUnique({ where: { id: dto.parentId } })
      : null;
    if (dto.parentId && !parent) throw new NotFoundException('Parent account not found');
    if (parent && !parent.isGroup)
      throw this.fieldError('parentId', 'The parent must be a group account');
    if (parent && parent.class !== dto.class)
      throw this.fieldError(
        'class',
        `Accounts under ${parent.code} must be ${parent.class.toLowerCase()}`,
      );
    if (!parent && !dto.isGroup)
      throw this.fieldError('parentId', 'Choose where this account sits in the chart');
    await this.assertCurrency(dto.currency);
    if (dto.isGroup && dto.currency !== BASE)
      throw this.fieldError('currency', 'Group accounts are kept in PKR');
    try {
      return await this.prisma.ledgerAccount.create({
        data: {
          code: dto.code,
          name: dto.name,
          class: dto.class,
          parentId: parent?.id ?? null,
          isGroup: dto.isGroup,
          currency: dto.currency,
          description: dto.description ?? null,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')
        throw this.fieldError('code', 'This code is already used');
      throw e;
    }
  }

  async update(id: string, dto: UpdateInput) {
    const account = await this.prisma.ledgerAccount.findUnique({ where: { id } });
    if (!account) throw new NotFoundException('Account not found');
    const hasEntries = !!(await this.prisma.ledgerEntry.findFirst({
      where: { ledgerAccountId: id },
    }));
    const managed = !!account.systemKey || !!account.accountId;

    if (dto.code && dto.code !== account.code) {
      if (managed) throw this.fieldError('code', 'System and partner account codes are fixed');
      if (hasEntries)
        throw this.fieldError('code', 'The code cannot change once the account has postings');
    }
    if (dto.parentId !== undefined && dto.parentId !== account.parentId) {
      if (managed) throw this.fieldError('parentId', 'System and partner accounts cannot be moved');
      const parent = dto.parentId
        ? await this.prisma.ledgerAccount.findUnique({ where: { id: dto.parentId } })
        : null;
      if (!parent?.isGroup) throw this.fieldError('parentId', 'The parent must be a group account');
      if (parent.class !== account.class)
        throw this.fieldError('parentId', 'The parent must be of the same class');
      if (await this.isDescendant(parent.id, id))
        throw this.fieldError('parentId', 'An account cannot sit under itself');
    }
    if (dto.isActive === false && account.isActive) {
      if (account.systemKey)
        throw this.fieldError('isActive', 'System accounts cannot be deactivated');
      const { balance, fcBalance } = await this.balance(id);
      if (balance !== 0 || (fcBalance ?? 0) !== 0)
        throw this.fieldError('isActive', 'Only accounts with a zero balance can be deactivated');
      if (
        account.isGroup &&
        (await this.prisma.ledgerAccount.count({ where: { parentId: id, isActive: true } }))
      )
        throw this.fieldError('isActive', 'Deactivate the accounts under this group first');
    }
    try {
      return await this.prisma.ledgerAccount.update({
        where: { id },
        data: {
          ...(dto.name ? { name: dto.name } : {}),
          ...(dto.code ? { code: dto.code } : {}),
          ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(dto.description !== undefined ? { description: dto.description ?? null } : {}),
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')
        throw this.fieldError('code', 'This code is already used');
      throw e;
    }
  }

  /** Debit-positive PKR balance and signed foreign balance per account. */
  async sums(asOf?: string, ids?: string[]): Promise<Map<string, Sums>> {
    const rows = await this.prisma.$queryRaw<
      { id: string; balance: Prisma.Decimal; fc: Prisma.Decimal | null }[]
    >`
      SELECT le."ledgerAccountId" AS id,
             SUM(le.debit - le.credit) AS balance,
             SUM(CASE WHEN le.currency <> 'PKR'
                      THEN CASE WHEN le.debit > 0 THEN le."fcAmount" ELSE -le."fcAmount" END END) AS fc
        FROM "LedgerEntry" le
        JOIN "LedgerTransaction" t ON t.id = le."transactionId"
       WHERE (${asOf ?? null}::date IS NULL OR t.date <= ${asOf ? toDate(asOf) : null}::date)
         AND (${ids ?? null}::uuid[] IS NULL OR le."ledgerAccountId" = ANY(${ids ?? null}::uuid[]))
       GROUP BY le."ledgerAccountId"`;
    return new Map(
      rows.map((r) => [
        r.id,
        { balance: new Decimal(r.balance ?? 0), fc: r.fc == null ? null : new Decimal(r.fc) },
      ]),
    );
  }

  toDto(a: LedgerAccount, balance: Prisma.Decimal, fc?: Prisma.Decimal | null): ChartAccountDto {
    return {
      id: a.id,
      code: a.code,
      name: a.name,
      class: a.class,
      parentId: a.parentId,
      isGroup: a.isGroup,
      isActive: a.isActive,
      systemKey: a.systemKey,
      currency: a.currency,
      description: a.description,
      partnerAccountId: a.accountId,
      balance: num(balance),
      fcBalance: a.currency === BASE ? null : num(fc ?? 0),
    };
  }

  private async isDescendant(candidateId: string, ancestorId: string) {
    for (let id: string | null = candidateId; id;) {
      if (id === ancestorId) return true;
      const row: { parentId: string | null } | null = await this.prisma.ledgerAccount.findUnique({
        where: { id },
        select: { parentId: true },
      });
      id = row?.parentId ?? null;
    }
    return false;
  }

  private async assertCurrency(code: string) {
    const c = await this.prisma.currency.findUnique({ where: { code } });
    if (!c?.isActive) throw this.fieldError('currency', `${code} is not an active currency`);
  }

  private fieldError(path: string, message: string) {
    return new BadRequestException({
      message,
      code: 'VALIDATION_FAILED',
      errors: [{ path, message }],
    });
  }
}
