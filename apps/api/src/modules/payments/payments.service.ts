import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type PaymentMethod, type PaymentStatus } from '@prisma/client';
import type { AdminPaymentListItem, Paginated, PaymentDto, ReceiptDto } from '@gnk/types';
import { pageArgs, paginated } from '../../core/http/pagination';
import type { RequestMeta } from '../../core/http/request-meta';
import { isoDate, num } from '../../core/money';
import { SequencesService } from '../../core/sequences.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { PartnerActor, StaffActor } from '../auth/auth.types';
import { paymentDto } from '../bookings/booking.mapper';
import { FilesService } from '../files/files.service';
import { LedgerService } from '../ledger/ledger.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeService } from '../realtime/realtime.service';
import { SettingsService } from '../settings/settings.service';

const include = {
  Booking: { select: { reference: true } },
  account: {
    select: {
      id: true,
      code: true,
      legalName: true,
      tradeName: true,
      address: true,
      city: true,
      phone: true,
      email: true,
    },
  },
  attachments: true,
  allocations: { include: { booking: { select: { reference: true } } } },
} satisfies Prisma.PaymentInclude;
type PaymentRow = Prisma.PaymentGetPayload<{ include: typeof include }>;

const normaliseRef = (r: string) => r.replace(/[\s-]/g, '').toUpperCase();
const FINANCE_ROLES = ['OWNER', 'MANAGER', 'ACCOUNTANT'] as const;
const pkr = (n: number) => `PKR ${n.toLocaleString('en-PK')}`;

interface SubmitInput {
  method: string;
  amount: number;
  bankName?: string;
  transactionRef: string;
  paidAt: string;
  bookingId?: string;
  allocations: { bookingId: string; amount: number }[];
  proofFileId?: string;
  attachmentIds: string[];
  notes?: string;
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequences: SequencesService,
    private readonly ledger: LedgerService,
    private readonly files: FilesService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
    private readonly settings: SettingsService,
  ) {}

  // =============== Partner ===============

  async partnerList(actor: PartnerActor): Promise<PaymentDto[]> {
    const rows = await this.prisma.payment.findMany({
      where: { accountId: actor.accountId },
      include,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return this.hydrate(rows);
  }

  async submit(actor: PartnerActor, dto: SubmitInput, meta: RequestMeta): Promise<PaymentDto> {
    const fileIds = [
      ...new Set([...(dto.proofFileId ? [dto.proofFileId] : []), ...dto.attachmentIds]),
    ];
    for (const id of fileIds)
      await this.files.assertPartnerFile(actor.accountId, id, 'PAYMENT_PROOF');
    const allocations = this.allocationsOf(dto);
    await this.assertBookings(actor.accountId, allocations);

    const payment = await this.create({
      ...dto,
      allocations,
      attachmentIds: fileIds,
      accountId: actor.accountId,
      submittedById: actor.userId,
      status: 'SUBMITTED',
    });
    await this.audit.log({
      actor: { realm: 'PARTNER', userId: actor.userId },
      action: 'payment.submit',
      entityType: 'Payment',
      entityId: payment.id,
      after: { reference: payment.reference, amount: dto.amount, allocations },
      meta,
    });
    await this.notifications.notifyStaff('payments:verify', {
      type: 'PAYMENT_SUBMITTED',
      title: `Payment to verify: ${pkr(dto.amount)}`,
      body: `${actor.accountName} submitted ${payment.reference} (${dto.bankName ?? dto.method}, ref ${dto.transactionRef}).`,
      link: `/payments?id=${payment.id}`,
    });
    this.changed(payment.accountId, payment.id);
    return (await this.hydrate([payment]))[0];
  }

  /** Printable receipt for an approved payment (partner: own account only). */
  async receipt(paymentId: string, accountId?: string): Promise<ReceiptDto> {
    const p = await this.prisma.payment.findUnique({ where: { id: paymentId }, include });
    if (!p || (accountId && p.accountId !== accountId))
      throw new NotFoundException('Receipt not found');
    const voucher = await this.prisma.ledgerTransaction.findFirst({
      where: { paymentId, type: 'RECEIPT', status: 'POSTED' },
      include: { entries: { include: { account: true } } },
      orderBy: { postedAt: 'asc' },
    });
    if (!voucher || p.status !== 'VERIFIED')
      throw new NotFoundException('A receipt is issued once the payment is approved');
    const [{ company }, approver] = await Promise.all([
      this.settings.get(),
      p.verifiedById
        ? this.prisma.staffUser.findUnique({
            where: { id: p.verifiedById },
            select: { fullName: true },
          })
        : null,
    ]);
    const deposit = voucher.entries.find((e) => e.debit.gt(0));
    return {
      number: voucher.reference,
      date: isoDate(voucher.date)!,
      payment: (await this.hydrate([p]))[0],
      company,
      receivedFrom: {
        name: p.account.legalName,
        code: p.account.code,
        address: p.account.address,
        city: p.account.city,
        phone: p.account.phone,
        email: p.account.email,
      },
      depositAccount: deposit ? `${deposit.account.code} ${deposit.account.name}` : null,
      approvedBy: approver?.fullName ?? null,
    };
  }

  // =============== Admin ===============

  async adminList(q: {
    page: number;
    pageSize: number;
    q?: string;
    status: string;
    accountId?: string;
  }): Promise<Paginated<AdminPaymentListItem>> {
    const where: Prisma.PaymentWhereInput = {
      ...(q.status !== 'all' ? { status: q.status as PaymentStatus } : {}),
      ...(q.accountId ? { accountId: q.accountId } : {}),
      ...(q.q
        ? {
            OR: [
              { reference: { contains: q.q, mode: 'insensitive' } },
              { transactionRef: { contains: q.q, mode: 'insensitive' } },
              { account: { legalName: { contains: q.q, mode: 'insensitive' } } },
              { account: { code: { contains: q.q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include,
        orderBy: { createdAt: q.status === 'SUBMITTED' ? 'asc' : 'desc' },
        ...pageArgs(q),
      }),
      this.prisma.payment.count({ where }),
    ]);
    return paginated(await this.adminItems(rows, true), total, q);
  }

  async adminCounts() {
    const groups = await this.prisma.payment.groupBy({ by: ['status'], _count: true });
    const counts: Record<string, number> = { all: 0 };
    for (const g of groups) {
      counts[g.status] = g._count;
      counts.all += g._count;
    }
    return counts;
  }

  async adminGet(id: string): Promise<AdminPaymentListItem> {
    const p = await this.prisma.payment.findUnique({ where: { id }, include });
    if (!p) throw new NotFoundException('Payment not found');
    return (await this.adminItems([p], true))[0];
  }

  /** Approves a submitted payment and posts its receipt voucher (Dr bank/cash, Cr partner). */
  async verify(
    actor: StaffActor,
    id: string,
    depositAccountId: string | undefined,
    meta: RequestMeta,
  ) {
    const { payment, voucher } = await this.prisma.$transaction(async (tx) => {
      const p = await tx.payment.findUnique({ where: { id } });
      if (!p) throw new NotFoundException('Payment not found');
      const deposit = depositAccountId
        ? await this.ledger.cashOrBankAccount(tx, depositAccountId)
        : await this.ledger.systemAccount(tx, p.method === 'CASH' ? 'CASH' : 'BANK');
      const updated = await tx.payment.updateMany({
        where: { id, status: 'SUBMITTED' },
        data: {
          status: 'VERIFIED',
          verifiedById: actor.userId,
          verifiedAt: new Date(),
          depositAccountId: deposit.id,
        },
      });
      if (!updated.count) throw new ConflictException('Only submitted payments can be verified');
      const v = await this.ledger.postPayment(tx, p, actor.userId, deposit.id);
      return { payment: p, voucher: v };
    });
    await this.audit.log({
      actor: { realm: 'STAFF', userId: actor.userId },
      action: 'payment.verify',
      entityType: 'Payment',
      entityId: id,
      before: { status: 'SUBMITTED' },
      after: { status: 'VERIFIED', receipt: voucher.reference },
      meta,
    });
    await this.notifications.notifyAccount(
      payment.accountId,
      {
        type: 'PAYMENT_VERIFIED',
        title: `Payment received — receipt ${voucher.reference}`,
        body: `${pkr(num(payment.amount))} (${payment.reference}) was approved and added to your account balance.`,
        link: `/payments/${payment.id}/receipt`,
        email: true,
      },
      [...FINANCE_ROLES],
    );
    this.changed(payment.accountId, id);
    return this.adminGet(id);
  }

  async reject(actor: StaffActor, id: string, reason: string, meta: RequestMeta) {
    const p = await this.prisma.payment.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Payment not found');
    const updated = await this.prisma.payment.updateMany({
      where: { id, status: 'SUBMITTED' },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
        verifiedById: actor.userId,
        verifiedAt: new Date(),
      },
    });
    if (!updated.count) throw new ConflictException('Only submitted payments can be rejected');
    await this.audit.log({
      actor: { realm: 'STAFF', userId: actor.userId },
      action: 'payment.reject',
      entityType: 'Payment',
      entityId: id,
      before: { status: p.status },
      after: { status: 'REJECTED', reason },
      meta,
    });
    await this.notifications.notifyAccount(
      p.accountId,
      {
        type: 'PAYMENT_REJECTED',
        title: `Payment ${p.reference} could not be verified`,
        body: `Reason: ${reason}. Please check the details and submit it again.`,
        link: '/payments',
        email: true,
      },
      [...FINANCE_ROLES],
    );
    this.changed(p.accountId, id);
    return this.adminGet(id);
  }

  /** Staff record money received from a partner; it is approved and receipted immediately. */
  async record(
    actor: StaffActor,
    dto: SubmitInput & { accountId: string; depositAccountId: string },
    meta: RequestMeta,
  ) {
    const account = await this.prisma.partnerAccount.findUnique({ where: { id: dto.accountId } });
    if (!account) throw new NotFoundException('Partner not found');
    const allocations = this.allocationsOf(dto);
    await this.assertBookings(dto.accountId, allocations);
    await this.assertStaffFiles(dto.attachmentIds);
    const { payment, voucher } = await this.prisma.$transaction(async (tx) => {
      const deposit = await this.ledger.cashOrBankAccount(tx, dto.depositAccountId);
      const p = await this.create(
        {
          ...dto,
          allocations,
          submittedById: actor.userId,
          status: 'VERIFIED',
          verifiedById: actor.userId,
          depositAccountId: deposit.id,
        },
        tx,
      );
      const v = await this.ledger.postPayment(tx, p, actor.userId, deposit.id);
      return { payment: p, voucher: v };
    });
    await this.audit.log({
      actor: { realm: 'STAFF', userId: actor.userId },
      action: 'payment.record',
      entityType: 'Payment',
      entityId: payment.id,
      after: {
        reference: payment.reference,
        amount: dto.amount,
        accountId: dto.accountId,
        receipt: voucher.reference,
      },
      meta,
    });
    await this.notifications.notifyAccount(
      dto.accountId,
      {
        type: 'PAYMENT_VERIFIED',
        title: `Payment received — receipt ${voucher.reference}`,
        body: `GNK Connect recorded ${pkr(dto.amount)} (${payment.reference}) on your account.`,
        link: `/payments/${payment.id}/receipt`,
        email: true,
      },
      [...FINANCE_ROLES],
    );
    this.changed(dto.accountId, payment.id);
    return this.adminGet(payment.id);
  }

  // =============== internals ===============

  /** Legacy single bookingId becomes one allocation of the full amount. */
  private allocationsOf(dto: SubmitInput) {
    if (dto.allocations.length) return dto.allocations;
    return dto.bookingId ? [{ bookingId: dto.bookingId, amount: dto.amount }] : [];
  }

  private async assertBookings(accountId: string, allocations: { bookingId: string }[]) {
    if (!allocations.length) return;
    const ids = allocations.map((a) => a.bookingId);
    const found = await this.prisma.booking.count({ where: { id: { in: ids }, accountId } });
    if (found !== ids.length)
      throw new BadRequestException({
        message: 'A booking in the allocation was not found on this account',
        code: 'VALIDATION_FAILED',
        errors: [{ path: 'allocations', message: 'Booking not found' }],
      });
  }

  private async assertStaffFiles(ids: string[]) {
    if (!ids.length) return;
    const n = await this.prisma.storedFile.count({
      where: { id: { in: ids }, ownerRealm: 'STAFF', purpose: 'PAYMENT_PROOF' },
    });
    if (n !== new Set(ids).size)
      throw new BadRequestException('An attachment could not be used. Upload it again.');
  }

  private async create(
    dto: SubmitInput & {
      accountId: string;
      submittedById: string;
      status: PaymentStatus;
      verifiedById?: string;
      depositAccountId?: string;
    },
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    try {
      return await tx.payment.create({
        data: {
          reference: await this.sequences.next('PAYMENT', tx),
          accountId: dto.accountId,
          // Kept for older clients: the single booking when exactly one is allocated.
          bookingId: dto.allocations.length === 1 ? dto.allocations[0].bookingId : null,
          method: dto.method as PaymentMethod,
          status: dto.status,
          amount: dto.amount,
          bankName: dto.bankName ?? null,
          transactionRef: dto.transactionRef.trim(),
          paidAt: new Date(`${dto.paidAt}T00:00:00Z`),
          proofFileId: dto.attachmentIds[0] ?? dto.proofFileId ?? null,
          notes: dto.notes ?? null,
          submittedById: dto.submittedById,
          verifiedById: dto.verifiedById ?? null,
          verifiedAt: dto.verifiedById ? new Date() : null,
          depositAccountId: dto.depositAccountId ?? null,
          attachments: { create: dto.attachmentIds.map((fileId) => ({ fileId })) },
          allocations: {
            create: dto.allocations.map((a) => ({ bookingId: a.bookingId, amount: a.amount })),
          },
        },
        include,
      });
    } catch (e) {
      const target =
        e instanceof Prisma.PrismaClientKnownRequestError ? String(e.meta?.target ?? '') : '';
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002' &&
        target.includes('transactionRef')
      ) {
        throw new ConflictException({
          message: 'A payment with this transaction reference was already submitted',
          code: 'VALIDATION_FAILED',
          errors: [{ path: 'transactionRef', message: 'Already used on another payment' }],
        });
      }
      throw e;
    }
  }

  /** Adds attachments, allocations and receipt numbers to payment rows. */
  private async hydrate(rows: PaymentRow[]): Promise<PaymentDto[]> {
    const fileIds = rows.flatMap((r) => r.attachments.map((a) => a.fileId));
    const [files, receipts] = await Promise.all([
      this.prisma.storedFile.findMany({ where: { id: { in: fileIds } } }),
      this.prisma.ledgerTransaction.findMany({
        where: { paymentId: { in: rows.map((r) => r.id) }, type: 'RECEIPT', status: 'POSTED' },
        select: { id: true, reference: true, paymentId: true },
      }),
    ]);
    const fileById = new Map(files.map((f) => [f.id, f]));
    const receiptBy = new Map(
      receipts.map((r) => [r.paymentId!, { id: r.id, number: r.reference }]),
    );
    return rows.map((p) => ({
      ...paymentDto(p),
      attachments: p.attachments
        .map((a) => fileById.get(a.fileId))
        .filter((f) => !!f)
        .map((f) => ({
          id: f.id,
          originalName: f.originalName,
          mimeType: f.mimeType,
          sizeBytes: f.sizeBytes,
        })),
      allocations: p.allocations.map((a) => ({
        bookingId: a.bookingId,
        bookingReference: a.booking.reference,
        amount: num(a.amount),
      })),
      receipt: receiptBy.get(p.id) ?? null,
    }));
  }

  private async adminItems(
    rows: PaymentRow[],
    findDuplicates: boolean,
  ): Promise<AdminPaymentListItem[]> {
    // Same bank reference used on another payment (ignoring spacing/case) is a likely duplicate.
    const others =
      findDuplicates && rows.some((r) => r.transactionRef)
        ? await this.prisma.payment.findMany({
            where: { transactionRef: { not: null }, status: { in: ['SUBMITTED', 'VERIFIED'] } },
            select: { id: true, reference: true, transactionRef: true },
          })
        : [];
    const [dtos, names, deposits] = await Promise.all([
      this.hydrate(rows),
      this.names([
        ...rows.map((r) => r.submittedById),
        ...(rows.map((r) => r.verifiedById).filter(Boolean) as string[]),
      ]),
      this.prisma.ledgerAccount.findMany({
        where: { id: { in: rows.map((r) => r.depositAccountId).filter(Boolean) as string[] } },
        select: { id: true, code: true, name: true },
      }),
    ]);
    const depositById = new Map(deposits.map((d) => [d.id, d]));
    return rows.map((p, i) => ({
      ...dtos[i],
      accountId: p.account.id,
      accountName: p.account.tradeName || p.account.legalName,
      accountCode: p.account.code,
      submittedByName: names.get(p.submittedById) ?? null,
      verifiedByName: p.verifiedById ? (names.get(p.verifiedById) ?? null) : null,
      duplicateOf: p.transactionRef
        ? (others.find(
            (o) =>
              o.id !== p.id && normaliseRef(o.transactionRef!) === normaliseRef(p.transactionRef!),
          )?.reference ?? null)
        : null,
      depositAccount: p.depositAccountId ? (depositById.get(p.depositAccountId) ?? null) : null,
    }));
  }

  private async names(ids: string[]) {
    const unique = [...new Set(ids)];
    const [partners, staff] = await Promise.all([
      this.prisma.partnerUser.findMany({
        where: { id: { in: unique } },
        select: { id: true, fullName: true },
      }),
      this.prisma.staffUser.findMany({
        where: { id: { in: unique } },
        select: { id: true, fullName: true },
      }),
    ]);
    return new Map(
      [...partners, ...staff.map((s) => ({ ...s, fullName: `${s.fullName} (GNK)` }))].map((u) => [
        u.id,
        u.fullName,
      ]),
    );
  }

  private changed(accountId: string, id: string) {
    this.realtime.publish({ topic: 'payment', id }, { realm: 'PARTNER', accountId });
    this.realtime.publish(
      { topic: 'payment', id },
      { realm: 'STAFF', permission: 'payments:read' },
    );
    this.realtime.publish({ topic: 'queues' }, { realm: 'STAFF' });
  }
}
