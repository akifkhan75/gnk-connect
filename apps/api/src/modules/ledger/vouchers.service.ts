import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma, type VoucherStatus, type VoucherType } from '@prisma/client';
import type {
  Paginated,
  Permission,
  VoucherAction,
  VoucherCounts,
  VoucherDto,
  VoucherLineDto,
  VoucherListItem,
} from '@gnk/types';
import type { z } from 'zod';
import type { VoucherLine, voucherListSchema, voucherSchema } from '@gnk/validation';
import { pageArgs, paginated } from '../../core/http/pagination';
import type { RequestMeta } from '../../core/http/request-meta';
import { Decimal, iso, isoDate, num } from '../../core/money';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { StaffActor } from '../auth/auth.types';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeService } from '../realtime/realtime.service';
import { SettingsService } from '../settings/settings.service';
import { LedgerService, toDate } from './ledger.service';

type VoucherInput = z.output<typeof voucherSchema>;
type ListInput = z.output<typeof voucherListSchema>;
export type CreateAction = 'draft' | 'submit' | 'post';

const include = {
  entries: { include: { account: true }, orderBy: { id: 'asc' } },
  attachments: true,
  reversalOf: { select: { id: true, reference: true } },
  reversedBy: { select: { id: true, reference: true } },
} satisfies Prisma.LedgerTransactionInclude;
type VoucherRow = Prisma.LedgerTransactionGetPayload<{ include: typeof include }>;

const EDITABLE: VoucherStatus[] = ['DRAFT', 'REJECTED'];

/**
 * Manual vouchers: journal (JV, maker-checker), receipt (RV) and payment (PV).
 * Drafts keep their lines as JSON; nothing touches the ledger until posting.
 */
@Injectable()
export class VouchersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly settings: SettingsService,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeService,
    private readonly audit: AuditService,
  ) {}

  // ---------- Reading ----------

  async list(q: ListInput): Promise<Paginated<VoucherListItem>> {
    const where: Prisma.LedgerTransactionWhereInput = {
      ...(q.type !== 'all' ? { type: q.type as VoucherType } : {}),
      ...(q.status !== 'all' ? { status: q.status as VoucherStatus } : {}),
      ...(q.from || q.to
        ? {
            date: {
              ...(q.from ? { gte: toDate(q.from) } : {}),
              ...(q.to ? { lte: toDate(q.to) } : {}),
            },
          }
        : {}),
      ...(q.accountId ? { entries: { some: { ledgerAccountId: q.accountId } } } : {}),
      ...(q.q
        ? {
            OR: [
              { reference: { contains: q.q, mode: 'insensitive' } },
              { description: { contains: q.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.ledgerTransaction.findMany({
        where,
        include,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        ...pageArgs(q),
      }),
      this.prisma.ledgerTransaction.count({ where }),
    ]);
    const ctx = await this.context(rows);
    return paginated(
      rows.map((r) => this.listItem(r, ctx)),
      total,
      q,
    );
  }

  async counts(type: string = 'all'): Promise<VoucherCounts> {
    const groups = await this.prisma.ledgerTransaction.groupBy({
      by: ['status'],
      _count: true,
      ...(type !== 'all' ? { where: { type: type as VoucherType } } : {}),
    });
    const counts: VoucherCounts = { all: 0, DRAFT: 0, SUBMITTED: 0, POSTED: 0, REJECTED: 0 };
    for (const g of groups) {
      counts[g.status] = g._count;
      counts.all += g._count;
    }
    return counts;
  }

  async get(actor: StaffActor, id: string): Promise<VoucherDto> {
    const row = await this.prisma.ledgerTransaction.findUnique({ where: { id }, include });
    if (!row) throw new NotFoundException('Voucher not found');
    const ctx = await this.context([row]);
    const lines = row.status === 'POSTED' ? this.postedLines(row) : await this.draftLines(row);
    const [booking, payment, files] = await Promise.all([
      row.bookingId
        ? this.prisma.booking.findUnique({
            where: { id: row.bookingId },
            select: { reference: true },
          })
        : null,
      row.paymentId
        ? this.prisma.payment.findUnique({
            where: { id: row.paymentId },
            select: { reference: true },
          })
        : null,
      this.prisma.storedFile.findMany({
        where: { id: { in: row.attachments.map((a) => a.fileId) } },
      }),
    ]);
    const settings = await this.settings.get();
    return {
      ...this.listItem(row, ctx),
      partnerAccountId: row.partnerAccountId,
      bookingId: row.bookingId,
      bookingReference: booking?.reference ?? null,
      paymentId: row.paymentId,
      paymentReference: payment?.reference ?? null,
      submittedAt: iso(row.submittedAt),
      approvedAt: iso(row.approvedAt),
      postedAt: iso(row.postedAt),
      rejectionReason: row.rejectionReason,
      reversalOf: row.reversalOf,
      reversedBy: row.reversedBy,
      lines,
      totalDebit: lines.reduce((s, l) => s + l.debit, 0),
      totalCredit: lines.reduce((s, l) => s + l.credit, 0),
      attachments: files.map((f) => ({
        id: f.id,
        originalName: f.originalName,
        mimeType: f.mimeType,
        sizeBytes: f.sizeBytes,
      })),
      allowedActions: this.actions(actor, row, settings.accounting.requireJvApproval),
    };
  }

  // ---------- Lifecycle ----------

  async create(actor: StaffActor, dto: VoucherInput, action: CreateAction, meta: RequestMeta) {
    this.assertCanPrepare(actor, dto.type);
    await this.assertAttachments(dto.attachmentIds);
    const resolved = await this.ledger.resolveLines(this.prisma, dto.lines); // accounts exist
    const draft = await this.prisma.ledgerTransaction.create({
      data: {
        reference: `DRAFT-${randomUUID().slice(0, 8).toUpperCase()}`,
        type: dto.type,
        status: 'DRAFT',
        date: toDate(dto.date),
        description: dto.description,
        partnerAccountId:
          dto.partnerAccountId ?? (await this.ledger.partnerOf(this.prisma, resolved)),
        draftLines: dto.lines as unknown as Prisma.InputJsonValue,
        createdById: actor.userId,
        attachments: { create: dto.attachmentIds.map((fileId) => ({ fileId })) },
      },
    });
    await this.log(
      actor,
      'voucher.create',
      draft.id,
      { type: dto.type, reference: draft.reference },
      meta,
    );
    if (action === 'submit') return this.submit(actor, draft.id, meta);
    if (action === 'post') return this.post(actor, draft.id, meta);
    this.changed(draft.id);
    return this.get(actor, draft.id);
  }

  async update(actor: StaffActor, id: string, dto: VoucherInput, meta: RequestMeta) {
    const v = await this.editable(actor, id);
    if (v.type !== dto.type) throw new BadRequestException('The voucher type cannot change');
    await this.assertAttachments(dto.attachmentIds);
    const resolved = await this.ledger.resolveLines(this.prisma, dto.lines);
    const partnerAccountId =
      dto.partnerAccountId ?? (await this.ledger.partnerOf(this.prisma, resolved));
    await this.prisma.$transaction([
      this.prisma.voucherAttachment.deleteMany({ where: { voucherId: id } }),
      this.prisma.ledgerTransaction.update({
        where: { id },
        data: {
          date: toDate(dto.date),
          description: dto.description,
          partnerAccountId,
          draftLines: dto.lines as unknown as Prisma.InputJsonValue,
          status: 'DRAFT',
          rejectionReason: null,
          attachments: { create: dto.attachmentIds.map((fileId) => ({ fileId })) },
        },
      }),
    ]);
    await this.log(actor, 'voucher.update', id, { reference: v.reference }, meta);
    this.changed(id);
    return this.get(actor, id);
  }

  /** Maker hands a journal voucher to a checker. The lines must balance first. */
  async submit(actor: StaffActor, id: string, meta: RequestMeta) {
    const v = await this.editable(actor, id);
    if (v.type !== 'JOURNAL') throw new BadRequestException('Only journal vouchers need approval');
    await this.ledger.checkLines(
      this.prisma,
      await this.ledger.resolveLines(this.prisma, this.linesOf(v)),
    );
    const updated = await this.prisma.ledgerTransaction.updateMany({
      where: { id, status: v.status },
      data: { status: 'SUBMITTED', submittedAt: new Date(), rejectionReason: null },
    });
    if (!updated.count) throw this.stale();
    await this.log(actor, 'voucher.submit', id, { reference: v.reference }, meta);
    await this.notifications.notifyStaff(
      'ledger:jv_approve',
      {
        type: 'VOUCHER_SUBMITTED',
        title: 'Journal voucher to approve',
        body: `${actor.fullName} submitted "${v.description}" for approval.`,
        link: `/accounting/vouchers/${id}`,
        email: true,
      },
      actor.userId,
    );
    this.changed(id);
    return this.get(actor, id);
  }

  /** Checker approves and posts a submitted journal voucher. */
  async approve(
    actor: StaffActor,
    id: string,
    selfApprovalReason: string | undefined,
    meta: RequestMeta,
  ) {
    this.require(actor, 'ledger:jv_approve');
    const v = await this.find(id);
    if (v.status !== 'SUBMITTED')
      throw new ConflictException('Only submitted vouchers can be approved');
    const self = v.createdById === actor.userId;
    if (self) {
      if (!actor.roles.includes('SUPER_ADMIN'))
        throw new ForbiddenException({
          message: 'Someone other than the preparer must approve this voucher',
          code: 'MAKER_CHECKER',
        });
      if (!selfApprovalReason)
        throw new BadRequestException({
          message: 'Explain why you are approving your own voucher',
          code: 'VALIDATION_FAILED',
          errors: [
            { path: 'selfApprovalReason', message: 'Required when approving your own voucher' },
          ],
        });
    }
    const posted = await this.prisma.$transaction(async (tx) =>
      this.ledger.postDraft(
        tx,
        v,
        await this.ledger.resolveLines(tx, this.linesOf(v)),
        actor.userId,
      ),
    );
    await this.log(
      actor,
      'voucher.approve',
      id,
      { reference: posted.reference, selfApprovalReason },
      meta,
    );
    if (v.createdById && !self)
      await this.notifications.notifyStaffUser(v.createdById, {
        type: 'VOUCHER_APPROVED',
        title: `${posted.reference} approved and posted`,
        body: `${actor.fullName} approved "${v.description}".`,
        link: `/accounting/vouchers/${id}`,
      });
    this.changed(id);
    return this.get(actor, id);
  }

  /** Direct posting: receipt/payment vouchers, and journals when approval is switched off. */
  async post(actor: StaffActor, id: string, meta: RequestMeta) {
    const v = await this.editable(actor, id);
    if (v.type === 'JOURNAL') {
      const { accounting } = await this.settings.get();
      if (accounting.requireJvApproval)
        throw new ConflictException({
          message: 'Journal vouchers need approval. Submit it instead.',
          code: 'MAKER_CHECKER',
        });
    } else this.require(actor, 'ledger:post');
    const posted = await this.prisma.$transaction(async (tx) =>
      this.ledger.postDraft(
        tx,
        v,
        await this.ledger.resolveLines(tx, this.linesOf(v)),
        actor.userId,
      ),
    );
    await this.log(actor, 'voucher.post', id, { reference: posted.reference }, meta);
    this.changed(id);
    return this.get(actor, id);
  }

  async reject(actor: StaffActor, id: string, reason: string, meta: RequestMeta) {
    this.require(actor, 'ledger:jv_approve');
    const v = await this.find(id);
    const updated = await this.prisma.ledgerTransaction.updateMany({
      where: { id, status: 'SUBMITTED' },
      data: { status: 'REJECTED', rejectionReason: reason, approvedById: actor.userId },
    });
    if (!updated.count) throw new ConflictException('Only submitted vouchers can be rejected');
    await this.log(actor, 'voucher.reject', id, { reference: v.reference, reason }, meta);
    if (v.createdById)
      await this.notifications.notifyStaffUser(v.createdById, {
        type: 'VOUCHER_REJECTED',
        title: 'Journal voucher returned',
        body: `${actor.fullName} returned "${v.description}": ${reason}`,
        link: `/accounting/vouchers/${id}`,
        email: true,
      });
    this.changed(id);
    return this.get(actor, id);
  }

  async remove(actor: StaffActor, id: string, meta: RequestMeta) {
    const v = await this.editable(actor, id);
    const { count } = await this.prisma.ledgerTransaction.deleteMany({
      where: { id, status: { in: EDITABLE } },
    });
    if (!count) throw this.stale();
    await this.log(
      actor,
      'voucher.delete',
      id,
      { reference: v.reference, description: v.description },
      meta,
    );
    this.changed(id);
  }

  async reverse(
    actor: StaffActor,
    id: string,
    dto: { date: string; reason: string },
    meta: RequestMeta,
  ) {
    this.require(actor, 'ledger:jv_approve');
    const original = await this.find(id);
    const reversal = await this.prisma.$transaction((tx) =>
      this.ledger.reverse(tx, id, {
        date: dto.date,
        description: `Reversal of ${original.reference}: ${dto.reason}`,
        createdById: actor.userId,
      }),
    );
    await this.log(
      actor,
      'voucher.reverse',
      id,
      { reference: original.reference, reversal: reversal.reference, reason: dto.reason },
      meta,
    );
    this.changed(id);
    this.changed(reversal.id);
    return this.get(actor, reversal.id);
  }

  // ---------- internals ----------

  private actions(actor: StaffActor, v: VoucherRow, requireApproval: boolean): VoucherAction[] {
    const can = (p: Permission) => actor.permissions.has(p);
    const prepare = v.type === 'JOURNAL' ? can('ledger:jv_prepare') : can('ledger:post');
    const mine = v.createdById === actor.userId;
    const out: VoucherAction[] = [];
    if (EDITABLE.includes(v.status) && prepare && (mine || can('ledger:jv_approve'))) {
      out.push('edit', 'delete');
      if (v.type === 'JOURNAL' && requireApproval) out.push('submit');
      else out.push('post');
    }
    if (
      v.status === 'SUBMITTED' &&
      can('ledger:jv_approve') &&
      (!mine || actor.roles.includes('SUPER_ADMIN'))
    )
      out.push('approve', 'reject');
    if (v.status === 'POSTED' && can('ledger:jv_approve') && !v.reversedBy && v.type !== 'REVERSAL')
      out.push('reverse');
    return out;
  }

  private assertCanPrepare(actor: StaffActor, type: VoucherType) {
    this.require(actor, type === 'JOURNAL' ? 'ledger:jv_prepare' : 'ledger:post');
  }

  private require(actor: StaffActor, permission: Permission) {
    if (!actor.permissions.has(permission))
      throw new ForbiddenException({
        message: 'You do not have permission to do this',
        code: 'MISSING_PERMISSION',
      });
  }

  private async find(id: string) {
    const v = await this.prisma.ledgerTransaction.findUnique({ where: { id } });
    if (!v) throw new NotFoundException('Voucher not found');
    return v;
  }

  /** A draft or returned voucher the actor may change: their own, or any with approval rights. */
  private async editable(actor: StaffActor, id: string) {
    const v = await this.find(id);
    if (!EDITABLE.includes(v.status))
      throw new ConflictException('Only draft or returned vouchers can be changed');
    this.assertCanPrepare(actor, v.type);
    if (v.createdById !== actor.userId && !actor.permissions.has('ledger:jv_approve'))
      throw new ForbiddenException('Only the preparer can change this voucher');
    return v;
  }

  private linesOf(v: { draftLines: Prisma.JsonValue }): VoucherLine[] {
    return (v.draftLines ?? []) as unknown as VoucherLine[];
  }

  private async assertAttachments(ids: string[]) {
    if (!ids.length) return;
    const files = await this.prisma.storedFile.count({
      where: {
        id: { in: ids },
        ownerRealm: 'STAFF',
        purpose: { in: ['VOUCHER', 'PAYMENT_PROOF'] },
      },
    });
    if (files !== new Set(ids).size)
      throw new BadRequestException('An attachment could not be used. Upload it again.');
  }

  private postedLines(v: VoucherRow): VoucherLineDto[] {
    return v.entries.map((e) => ({
      accountId: e.ledgerAccountId,
      accountCode: e.account.code,
      accountName: e.account.name,
      currency: e.currency,
      debit: num(e.debit),
      credit: num(e.credit),
      fcAmount: e.fcAmount == null ? null : num(e.fcAmount),
      rate: e.rate == null ? null : num(e.rate),
      narration: e.narration,
    }));
  }

  /** Draft lines shown with their calculated PKR amounts. */
  private async draftLines(v: VoucherRow): Promise<VoucherLineDto[]> {
    const raw = this.linesOf(v);
    const resolved = await this.ledger.resolveLines(this.prisma, raw);
    const accounts = await this.prisma.ledgerAccount.findMany({
      where: { id: { in: resolved.map((l) => l.ledgerAccountId) } },
    });
    const byId = new Map(accounts.map((a) => [a.id, a]));
    return resolved.map((l) => ({
      accountId: l.ledgerAccountId,
      accountCode: byId.get(l.ledgerAccountId)?.code ?? '',
      accountName: byId.get(l.ledgerAccountId)?.name ?? '',
      currency: l.currency ?? 'PKR',
      debit: num(new Decimal(l.debit ?? 0)),
      credit: num(new Decimal(l.credit ?? 0)),
      fcAmount: l.fcAmount == null ? null : num(new Decimal(l.fcAmount)),
      rate: l.rate == null ? null : num(new Decimal(l.rate)),
      narration: l.narration ?? null,
    }));
  }

  private async context(rows: VoucherRow[]) {
    const staffIds = [
      ...new Set(rows.flatMap((r) => [r.createdById, r.approvedById]).filter(Boolean) as string[]),
    ];
    const partnerIds = [
      ...new Set(rows.map((r) => r.partnerAccountId).filter(Boolean) as string[]),
    ];
    const [staff, partners] = await Promise.all([
      this.prisma.staffUser.findMany({
        where: { id: { in: staffIds } },
        select: { id: true, fullName: true },
      }),
      this.prisma.partnerAccount.findMany({
        where: { id: { in: partnerIds } },
        select: { id: true, legalName: true, tradeName: true },
      }),
    ]);
    return {
      staff: new Map(staff.map((s) => [s.id, s.fullName])),
      partners: new Map(partners.map((p) => [p.id, p.tradeName || p.legalName])),
    };
  }

  private listItem(
    r: VoucherRow,
    ctx: Awaited<ReturnType<VouchersService['context']>>,
  ): VoucherListItem {
    const ref = (id: string | null) => (id ? { id, name: ctx.staff.get(id) ?? 'System' } : null);
    const draftTotal = this.linesOf(r)
      .filter((l) => l.side === 'DEBIT')
      .reduce((s, l) => s + (l.amount ?? (l.fcAmount ?? 0) * (l.rate ?? 0)), 0);
    return {
      id: r.id,
      reference: r.reference,
      type: r.type,
      status: r.status,
      date: isoDate(r.date)!,
      description: r.description,
      total:
        r.status === 'POSTED'
          ? r.entries.reduce((s, e) => s + num(e.debit), 0)
          : Math.round(draftTotal * 100) / 100,
      partnerName: r.partnerAccountId ? (ctx.partners.get(r.partnerAccountId) ?? null) : null,
      createdBy: ref(r.createdById),
      approvedBy: ref(r.approvedById),
      reversed: !!r.reversedBy,
    };
  }

  private changed(id: string) {
    this.realtime.publish({ topic: 'voucher', id }, { realm: 'STAFF', permission: 'ledger:read' });
    this.realtime.publish({ topic: 'queues' }, { realm: 'STAFF' });
  }

  private stale() {
    return new ConflictException(
      'This voucher was changed by someone else. Refresh and try again.',
    );
  }

  private log(actor: StaffActor, action: string, id: string, after: unknown, meta: RequestMeta) {
    return this.audit.log({
      actor: { realm: 'STAFF', userId: actor.userId },
      action,
      entityType: 'Voucher',
      entityId: id,
      after,
      meta,
    });
  }
}
