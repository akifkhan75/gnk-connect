import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type PaymentMethod, type PaymentStatus } from '@prisma/client';
import type { AdminPaymentListItem, Paginated, PaymentDto } from '@gnk/types';
import { pageArgs, paginated } from '../../core/http/pagination';
import type { RequestMeta } from '../../core/http/request-meta';
import { num } from '../../core/money';
import { SequencesService } from '../../core/sequences.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { PartnerActor, StaffActor } from '../auth/auth.types';
import { paymentDto } from '../bookings/booking.mapper';
import { FilesService } from '../files/files.service';
import { LedgerService } from '../ledger/ledger.service';
import { NotificationsService } from '../notifications/notifications.service';

const include = {
  Booking: { select: { reference: true } },
  account: { select: { id: true, code: true, legalName: true, tradeName: true } },
} satisfies Prisma.PaymentInclude;
const normaliseRef = (r: string) => r.replace(/[\s-]/g, '').toUpperCase();

interface SubmitInput {
  method: string;
  amount: number;
  bankName?: string;
  transactionRef: string;
  paidAt: string;
  bookingId?: string;
  proofFileId?: string;
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
  ) {}

  // =============== Partner ===============

  async partnerList(actor: PartnerActor): Promise<PaymentDto[]> {
    const rows = await this.prisma.payment.findMany({
      where: { accountId: actor.accountId },
      include,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return rows.map(paymentDto);
  }

  async submit(actor: PartnerActor, dto: SubmitInput, meta: RequestMeta): Promise<PaymentDto> {
    await this.files.assertPartnerFile(actor.accountId, dto.proofFileId!, 'PAYMENT_PROOF');
    if (dto.bookingId) {
      const booking = await this.prisma.booking.findFirst({
        where: { id: dto.bookingId, accountId: actor.accountId },
      });
      if (!booking) throw new NotFoundException('Booking not found');
    }
    const payment = await this.create({
      ...dto,
      accountId: actor.accountId,
      submittedById: actor.userId,
      status: 'SUBMITTED',
    });
    await this.audit.log({
      actor: { realm: 'PARTNER', userId: actor.userId },
      action: 'payment.submit',
      entityType: 'Payment',
      entityId: payment.id,
      after: { reference: payment.reference, amount: dto.amount },
      meta,
    });
    await this.notifications.notifyStaff('payments:verify', {
      type: 'PAYMENT_SUBMITTED',
      title: `Payment to verify: PKR ${dto.amount.toLocaleString('en-PK')}`,
      body: `${actor.accountName} submitted ${payment.reference} (${dto.bankName ?? dto.method}, ref ${dto.transactionRef}).`,
      link: `/payments?id=${payment.id}`,
    });
    return paymentDto(payment);
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

    // Same bank reference used on another payment (ignoring spacing/case) is a likely duplicate.
    const refs = rows.map((r) => r.transactionRef).filter(Boolean) as string[];
    const others = refs.length
      ? await this.prisma.payment.findMany({
          where: { transactionRef: { not: null }, status: { in: ['SUBMITTED', 'VERIFIED'] } },
          select: { id: true, reference: true, transactionRef: true },
        })
      : [];
    const names = await this.names([
      ...rows.map((r) => r.submittedById),
      ...(rows.map((r) => r.verifiedById).filter(Boolean) as string[]),
    ]);

    return paginated(
      rows.map((p) => ({
        ...paymentDto(p),
        accountId: p.account.id,
        accountName: p.account.tradeName || p.account.legalName,
        accountCode: p.account.code,
        submittedByName: names.get(p.submittedById) ?? null,
        verifiedByName: p.verifiedById ? (names.get(p.verifiedById) ?? null) : null,
        duplicateOf: p.transactionRef
          ? (others.find(
              (o) =>
                o.id !== p.id &&
                normaliseRef(o.transactionRef!) === normaliseRef(p.transactionRef!),
            )?.reference ?? null)
          : null,
      })),
      total,
      q,
    );
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

  async verify(actor: StaffActor, id: string, meta: RequestMeta) {
    const payment = await this.prisma.$transaction(async (tx) => {
      const p = await tx.payment.findUnique({ where: { id } });
      if (!p) throw new NotFoundException('Payment not found');
      const updated = await tx.payment.updateMany({
        where: { id, status: 'SUBMITTED' },
        data: { status: 'VERIFIED', verifiedById: actor.userId, verifiedAt: new Date() },
      });
      if (!updated.count) throw new ConflictException('Only submitted payments can be verified');
      await this.ledger.postPayment(tx, p, actor.userId);
      return p;
    });
    await this.audit.log({
      actor: { realm: 'STAFF', userId: actor.userId },
      action: 'payment.verify',
      entityType: 'Payment',
      entityId: id,
      before: { status: 'SUBMITTED' },
      after: { status: 'VERIFIED' },
      meta,
    });
    await this.notifications.notifyAccount(
      payment.accountId,
      {
        type: 'PAYMENT_VERIFIED',
        title: 'Payment received',
        body: `PKR ${num(payment.amount).toLocaleString('en-PK')} (${payment.reference}) was verified and added to your account balance.`,
        link: '/payments',
        email: true,
      },
      ['OWNER', 'MANAGER', 'ACCOUNTANT'],
    );
    return this.one(id);
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
      ['OWNER', 'MANAGER', 'ACCOUNTANT'],
    );
    return this.one(id);
  }

  /** Staff record a cash or bank deposit on a partner's behalf; it is verified immediately. */
  async record(actor: StaffActor, dto: SubmitInput & { accountId: string }, meta: RequestMeta) {
    const account = await this.prisma.partnerAccount.findUnique({ where: { id: dto.accountId } });
    if (!account) throw new NotFoundException('Partner not found');
    const payment = await this.prisma.$transaction(async (tx) => {
      const p = await this.create(
        { ...dto, submittedById: actor.userId, status: 'VERIFIED', verifiedById: actor.userId },
        tx,
      );
      await this.ledger.postPayment(tx, p, actor.userId);
      return p;
    });
    await this.audit.log({
      actor: { realm: 'STAFF', userId: actor.userId },
      action: 'payment.record',
      entityType: 'Payment',
      entityId: payment.id,
      after: { reference: payment.reference, amount: dto.amount, accountId: dto.accountId },
      meta,
    });
    await this.notifications.notifyAccount(
      dto.accountId,
      {
        type: 'PAYMENT_VERIFIED',
        title: 'Payment received',
        body: `GNK Connect recorded PKR ${dto.amount.toLocaleString('en-PK')} (${payment.reference}) on your account.`,
        link: '/payments',
        email: true,
      },
      ['OWNER', 'MANAGER', 'ACCOUNTANT'],
    );
    return this.one(payment.id);
  }

  private async create(
    dto: SubmitInput & {
      accountId: string;
      submittedById: string;
      status: PaymentStatus;
      verifiedById?: string;
    },
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    try {
      return await tx.payment.create({
        data: {
          reference: await this.sequences.next('PAYMENT', tx),
          accountId: dto.accountId,
          bookingId: dto.bookingId ?? null,
          method: dto.method as PaymentMethod,
          status: dto.status,
          amount: dto.amount,
          bankName: dto.bankName ?? null,
          transactionRef: dto.transactionRef.trim(),
          paidAt: new Date(`${dto.paidAt}T00:00:00Z`),
          proofFileId: dto.proofFileId ?? null,
          submittedById: dto.submittedById,
          verifiedById: dto.verifiedById ?? null,
          verifiedAt: dto.verifiedById ? new Date() : null,
        },
        include,
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException({
          message: 'A payment with this transaction reference was already submitted',
          code: 'VALIDATION_FAILED',
          errors: [{ path: 'transactionRef', message: 'Already used on another payment' }],
        });
      }
      throw e;
    }
  }

  private async one(id: string): Promise<AdminPaymentListItem> {
    const p = await this.prisma.payment.findUniqueOrThrow({ where: { id }, include });
    const names = await this.names([p.submittedById, ...(p.verifiedById ? [p.verifiedById] : [])]);
    return {
      ...paymentDto(p),
      accountId: p.account.id,
      accountName: p.account.tradeName || p.account.legalName,
      accountCode: p.account.code,
      submittedByName: names.get(p.submittedById) ?? null,
      verifiedByName: p.verifiedById ? (names.get(p.verifiedById) ?? null) : null,
      duplicateOf: null,
    };
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
}
