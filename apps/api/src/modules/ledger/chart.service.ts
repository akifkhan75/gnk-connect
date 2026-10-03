import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type LedgerAccount } from '@prisma/client';
import type { AccountBalanceDto, AccountOption, ChartAccountDto } from '@gnk/types';
import type { z } from 'zod';
import {
  nextAccountCode,
  todayPk,
  type accountCreateSchema,
  type accountUpdateSchema,
} from '@gnk/validation';
import { Decimal, num } from '../../core/money';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { BASE, LedgerService, toDate, type Tx } from './ledger.service';

type CreateInput = z.output<typeof accountCreateSchema>;
type UpdateInput = z.output<typeof accountUpdateSchema>;
interface Sums {
  balance: Prisma.Decimal;
  fc: Prisma.Decimal | null;
}

/** Chart of accounts: tree, pickers, balances, and maintenance. */
@Injectable()
export class ChartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) {}

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
      .filter((a) => !a.isGroup && a.isActive && !a.isLocked)
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

  async create(dto: CreateInput, actorId?: string) {
    const parent = await this.prisma.ledgerAccount.findUnique({ where: { id: dto.parentId } });
    if (!parent) throw new NotFoundException('Parent account not found');
    if (!parent.isGroup) throw this.fieldError('parentId', 'The parent must be a group account');
    if (parent.class !== dto.class)
      throw this.fieldError(
        'class',
        `Accounts under ${parent.code} must be ${parent.class.toLowerCase()}`,
      );
    await this.assertCurrency(dto.currency);
    if (dto.isGroup && dto.currency !== BASE)
      throw this.fieldError('currency', 'Group accounts are kept in PKR');
    if (dto.openingBalance) {
      if (dto.isGroup)
        throw this.fieldError('openingBalance', 'Opening balance is only for postable accounts');
      if (dto.currency !== BASE)
        throw this.fieldError('openingBalance', 'Opening balance is only for PKR accounts');
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        const rows = await tx.ledgerAccount.findMany({ select: { code: true, parentId: true } });
        const code = nextAccountCode(
          parent.code,
          rows.map((r) => r.code),
          rows.filter((r) => r.parentId === parent.id).map((r) => r.code),
        );
        const account = await tx.ledgerAccount.create({
          data: {
            code,
            name: dto.name,
            class: dto.class,
            parentId: parent.id,
            isGroup: dto.isGroup,
            currency: dto.currency,
            description: dto.description ?? null,
          },
        });
        if (dto.openingBalance) await this.postOpening(tx, account, dto.openingBalance, actorId);
        return account;
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
          ...(dto.isLocked !== undefined ? { isLocked: dto.isLocked } : {}),
          ...(dto.description !== undefined ? { description: dto.description ?? null } : {}),
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')
        throw this.fieldError('code', 'This code is already used');
      throw e;
    }
  }

  /** Posts an opening-balance journal against Opening Balance Equity. */
  async setOpening(id: string, amount: number, actorId?: string) {
    const account = await this.prisma.ledgerAccount.findUnique({ where: { id } });
    if (!account) throw new NotFoundException('Account not found');
    if (account.isGroup)
      throw this.fieldError('amount', 'Opening balance is only for postable accounts');
    if (account.currency !== BASE)
      throw this.fieldError('amount', 'Opening balance is only for PKR accounts');
    if (account.isLocked) throw this.fieldError('amount', `${account.code} is locked`);
    if (
      await this.prisma.ledgerEntry.findFirst({
        where: { ledgerAccountId: id, narration: 'Opening balance' },
      })
    )
      throw this.fieldError('amount', 'Opening balance is already set on this account');
    await this.prisma.$transaction((tx) => this.postOpening(tx, account, amount, actorId));
    return this.get(id);
  }

  /** Delete a custom account only when it has no postings and no children. */
  async remove(id: string) {
    const account = await this.prisma.ledgerAccount.findUnique({ where: { id } });
    if (!account) throw new NotFoundException('Account not found');
    if (account.systemKey) throw this.fieldError('id', 'System accounts cannot be deleted');
    if (account.accountId)
      throw this.fieldError('id', 'Partner receivable accounts cannot be deleted');
    if (await this.prisma.ledgerEntry.findFirst({ where: { ledgerAccountId: id } }))
      throw this.fieldError('id', 'Accounts with transactions cannot be deleted');
    if (await this.prisma.ledgerAccount.count({ where: { parentId: id } }))
      throw this.fieldError('id', 'Remove the accounts under this group first');
    await this.prisma.ledgerAccount.delete({ where: { id } });
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
      isLocked: a.isLocked,
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

  private async postOpening(tx: Tx, account: LedgerAccount, amount: number, actorId?: string) {
    const equity = await this.ledger.systemAccount(tx, 'OPENING_BALANCE');
    const debitNormal = account.class === 'ASSET' || account.class === 'EXPENSE';
    await this.ledger.post(tx, {
      type: 'JOURNAL',
      date: todayPk(),
      description: `Opening balance · ${account.code} ${account.name}`,
      createdById: actorId ?? null,
      approvedById: actorId ?? null,
      lines: debitNormal
        ? [
            { ledgerAccountId: account.id, debit: amount, narration: 'Opening balance' },
            {
              ledgerAccountId: equity.id,
              credit: amount,
              narration: `${account.code} ${account.name}`,
            },
          ]
        : [
            {
              ledgerAccountId: equity.id,
              debit: amount,
              narration: `${account.code} ${account.name}`,
            },
            { ledgerAccountId: account.id, credit: amount, narration: 'Opening balance' },
          ],
    });
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
