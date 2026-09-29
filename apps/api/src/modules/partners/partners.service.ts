import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { KycDocType, PartnerAccountStatus, PartnerRole, Prisma } from '@prisma/client';
import type {
  AdminPartnerDetailDto,
  AdminPartnerListItem,
  KycDocumentDto,
  Paginated,
  PartnerAccountDto,
  PartnerInviteDto,
  TeamDto,
  TeamMemberDto,
} from '@gnk/types';
import type { PartnerReviewAction } from '@gnk/validation';
import { pageArgs, paginated } from '../../core/http/pagination';
import type { RequestMeta } from '../../core/http/request-meta';
import { iso, num } from '../../core/money';
import { CryptoService } from '../../infra/crypto/crypto.service';
import { MailerService } from '../../infra/mailer/mailer.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { maskTail } from '@gnk/validation';
import { AuditService } from '../audit/audit.service';
import { AuthCacheService } from '../auth/auth-cache.service';
import type { PartnerActor, StaffActor } from '../auth/auth.types';
import { SessionService } from '../auth/session.service';
import { FilesService } from '../files/files.service';
import { LedgerService } from '../ledger/ledger.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BookingMapper } from '../bookings/booking.mapper';

export const REQUIRED_DOCUMENTS: Record<'AGENCY' | 'INDIVIDUAL', KycDocType[]> = {
  AGENCY: ['DTS_LICENSE', 'NTN_CERTIFICATE'],
  INDIVIDUAL: ['CNIC_FRONT', 'CNIC_BACK'],
};

const EDITABLE_DOC_STATUSES: PartnerAccountStatus[] = ['DRAFT', 'MORE_INFO_REQUIRED'];
const PENDING_STATUSES: PartnerAccountStatus[] = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'MORE_INFO_REQUIRED',
];

const accountInclude = {
  documents: { include: { file: true }, orderBy: { createdAt: 'asc' } },
  members: { include: { user: true }, orderBy: { createdAt: 'asc' } },
} satisfies Prisma.PartnerAccountInclude;
type AccountWithRelations = Prisma.PartnerAccountGetPayload<{ include: typeof accountInclude }>;

// Review transitions: action → allowed source statuses and resulting status.
const TRANSITIONS: Record<
  PartnerReviewAction,
  { from: PartnerAccountStatus[]; to: PartnerAccountStatus }
> = {
  start_review: { from: ['SUBMITTED'], to: 'UNDER_REVIEW' },
  approve: { from: ['SUBMITTED', 'UNDER_REVIEW'], to: 'APPROVED' },
  reject: { from: ['SUBMITTED', 'UNDER_REVIEW', 'MORE_INFO_REQUIRED'], to: 'REJECTED' },
  request_info: { from: ['SUBMITTED', 'UNDER_REVIEW'], to: 'MORE_INFO_REQUIRED' },
  suspend: { from: ['APPROVED'], to: 'SUSPENDED' },
  reactivate: { from: ['SUSPENDED'], to: 'APPROVED' },
};

@Injectable()
export class PartnersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly mailer: MailerService,
    private readonly audit: AuditService,
    private readonly cache: AuthCacheService,
    private readonly sessions: SessionService,
    private readonly files: FilesService,
    private readonly ledger: LedgerService,
    private readonly notifications: NotificationsService,
    private readonly bookings: BookingMapper,
  ) {}

  // =============== Partner: own account ===============

  async getAccount(accountId: string): Promise<PartnerAccountDto> {
    const account = await this.prisma.partnerAccount.findUnique({
      where: { id: accountId },
      include: accountInclude,
    });
    if (!account) throw new NotFoundException('Account not found');
    return this.toAccountDto(account);
  }

  async updateProfile(
    actor: PartnerActor,
    dto: { tradeName?: string; iataCode?: string; city: string; address: string; phone: string },
    meta: RequestMeta,
  ) {
    const before = await this.prisma.partnerAccount.findUniqueOrThrow({
      where: { id: actor.accountId },
    });
    await this.prisma.partnerAccount.update({
      where: { id: actor.accountId },
      data: {
        tradeName: dto.tradeName ?? null,
        iataCode: dto.iataCode ?? null,
        city: dto.city,
        address: dto.address,
        phone: dto.phone,
      },
    });
    this.cache.invalidateAccount(actor.accountId);
    await this.audit.log({
      actor: { realm: 'PARTNER', userId: actor.userId },
      action: 'partner.profile_update',
      entityType: 'PartnerAccount',
      entityId: actor.accountId,
      before: {
        tradeName: before.tradeName,
        iataCode: before.iataCode,
        city: before.city,
        address: before.address,
        phone: before.phone,
      },
      after: dto,
      meta,
    });
    return this.getAccount(actor.accountId);
  }

  async addDocument(actor: PartnerActor, type: KycDocType, fileId: string) {
    const account = await this.prisma.partnerAccount.findUniqueOrThrow({
      where: { id: actor.accountId },
    });
    if (!EDITABLE_DOC_STATUSES.includes(account.status)) {
      throw new BadRequestException(
        'Documents can only be changed before submission or when GNK asks for more information',
      );
    }
    await this.files.assertPartnerFile(actor.accountId, fileId, 'KYC');
    // One current document per type: replace anything not yet verified.
    await this.prisma.kycDocument.deleteMany({
      where: { accountId: actor.accountId, type, status: { not: 'VERIFIED' } },
    });
    await this.prisma.kycDocument.create({ data: { accountId: actor.accountId, type, fileId } });
    return this.getAccount(actor.accountId);
  }

  async removeDocument(actor: PartnerActor, documentId: string) {
    const account = await this.prisma.partnerAccount.findUniqueOrThrow({
      where: { id: actor.accountId },
    });
    if (!EDITABLE_DOC_STATUSES.includes(account.status))
      throw new BadRequestException('Documents are locked while your account is under review');
    const { count } = await this.prisma.kycDocument.deleteMany({
      where: { id: documentId, accountId: actor.accountId, status: { not: 'VERIFIED' } },
    });
    if (!count) throw new NotFoundException('Document not found');
    return this.getAccount(actor.accountId);
  }

  async submit(actor: PartnerActor, meta: RequestMeta) {
    const account = await this.prisma.partnerAccount.findUniqueOrThrow({
      where: { id: actor.accountId },
      include: accountInclude,
    });
    if (!EDITABLE_DOC_STATUSES.includes(account.status))
      throw new ConflictException('Your account has already been submitted');

    const owner = account.members.find((m) => m.role === 'OWNER');
    if (!owner?.user.emailVerifiedAt) {
      throw new BadRequestException({
        message: 'Verify your email address before submitting',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }
    const missing = REQUIRED_DOCUMENTS[account.type].filter(
      (t) => !account.documents.some((d) => d.type === t && d.status !== 'REJECTED'),
    );
    if (missing.length) {
      throw new BadRequestException({
        message: `Upload the required documents first: ${missing.map(docLabel).join(', ')}`,
        code: 'DOCUMENTS_MISSING',
      });
    }

    await this.prisma.partnerAccount.update({
      where: { id: account.id },
      data: { status: 'SUBMITTED', reviewNote: null },
    });
    this.cache.invalidateAccount(account.id);
    await this.audit.log({
      actor: { realm: 'PARTNER', userId: actor.userId },
      action: 'partner.submit',
      entityType: 'PartnerAccount',
      entityId: account.id,
      before: { status: account.status },
      after: { status: 'SUBMITTED' },
      meta,
    });
    await this.notifications.notifyStaff('partners:review', {
      type: 'PARTNER_SUBMITTED',
      title:
        account.status === 'MORE_INFO_REQUIRED'
          ? 'Partner resubmitted documents'
          : 'New partner awaiting review',
      body: `${account.tradeName || account.legalName} (${account.code}) submitted their account for review.`,
      link: `/partners/${account.id}`,
    });
    return this.getAccount(account.id);
  }

  // =============== Partner: team ===============

  async getTeam(actor: PartnerActor): Promise<TeamDto> {
    const [members, invites] = await Promise.all([
      this.prisma.partnerMember.findMany({
        where: { accountId: actor.accountId },
        include: { user: true },
        orderBy: { createdAt: 'asc' },
      }),
      actor.role === 'OWNER' || actor.role === 'MANAGER'
        ? this.prisma.partnerInvite.findMany({
            where: {
              accountId: actor.accountId,
              acceptedAt: null,
              revokedAt: null,
              expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve([]),
    ]);
    return {
      members: members.map((m) => this.toMemberDto(m, actor.userId)),
      invites: invites.map<PartnerInviteDto>((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        expiresAt: iso(i.expiresAt)!,
        createdAt: iso(i.createdAt)!,
      })),
    };
  }

  async invite(actor: PartnerActor, email: string, role: PartnerRole, meta: RequestMeta) {
    if (actor.accountType !== 'AGENCY')
      throw new BadRequestException('Individual accounts cannot add team members');
    this.assertCanAssign(actor, role);
    const existing = await this.prisma.partnerMember.findFirst({
      where: { accountId: actor.accountId, user: { email } },
    });
    if (existing) throw new ConflictException('This person is already a member of your team');

    await this.prisma.partnerInvite.updateMany({
      where: { accountId: actor.accountId, email, acceptedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    const { token, hash } = CryptoService.newToken();
    const invite = await this.prisma.partnerInvite.create({
      data: {
        accountId: actor.accountId,
        email,
        role,
        tokenHash: hash,
        expiresAt: new Date(Date.now() + 7 * 86_400_000),
        createdById: actor.userId,
      },
    });
    await this.mailer.partnerInvite(email, actor.accountName, actor.fullName, token);
    await this.audit.log({
      actor: { realm: 'PARTNER', userId: actor.userId },
      action: 'partner.invite',
      entityType: 'PartnerAccount',
      entityId: actor.accountId,
      after: { email, role },
      meta,
    });
    return {
      id: invite.id,
      email,
      role,
      expiresAt: iso(invite.expiresAt)!,
      createdAt: iso(invite.createdAt)!,
    } satisfies PartnerInviteDto;
  }

  async revokeInvite(actor: PartnerActor, inviteId: string) {
    const { count } = await this.prisma.partnerInvite.updateMany({
      where: { id: inviteId, accountId: actor.accountId, acceptedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (!count) throw new NotFoundException('Invite not found');
  }

  async updateRole(actor: PartnerActor, userId: string, role: PartnerRole, meta: RequestMeta) {
    const member = await this.memberFor(actor, userId);
    this.assertCanManage(actor, member.role);
    this.assertCanAssign(actor, role);
    await this.prisma.partnerMember.update({ where: { id: member.id }, data: { role } });
    this.cache.invalidateUser(userId);
    await this.audit.log({
      actor: { realm: 'PARTNER', userId: actor.userId },
      action: 'partner.member_role',
      entityType: 'PartnerMember',
      entityId: member.id,
      before: { role: member.role },
      after: { role },
      meta,
    });
    return this.getTeam(actor);
  }

  async removeMember(actor: PartnerActor, userId: string, meta: RequestMeta) {
    const member = await this.memberFor(actor, userId);
    this.assertCanManage(actor, member.role);
    await this.prisma.partnerMember.delete({ where: { id: member.id } });
    this.cache.invalidateUser(userId);
    // A user with no remaining accounts has nothing to sign in to.
    const remaining = await this.prisma.partnerMember.count({ where: { userId } });
    if (!remaining) await this.sessions.revokeAllForUser('PARTNER', userId, 'removed_from_account');
    await this.audit.log({
      actor: { realm: 'PARTNER', userId: actor.userId },
      action: 'partner.member_remove',
      entityType: 'PartnerMember',
      entityId: member.id,
      before: { userId, role: member.role },
      meta,
    });
    return this.getTeam(actor);
  }

  // =============== Admin ===============

  async adminList(q: {
    page: number;
    pageSize: number;
    q?: string;
    status: string;
  }): Promise<Paginated<AdminPartnerListItem>> {
    const where: Prisma.PartnerAccountWhereInput = {
      deletedAt: null,
      ...(q.status === 'PENDING'
        ? { status: { in: PENDING_STATUSES } }
        : q.status !== 'all'
          ? { status: q.status as PartnerAccountStatus }
          : {}),
      ...(q.q
        ? {
            OR: [
              { legalName: { contains: q.q, mode: 'insensitive' } },
              { tradeName: { contains: q.q, mode: 'insensitive' } },
              { code: { contains: q.q, mode: 'insensitive' } },
              { email: { contains: q.q, mode: 'insensitive' } },
              { city: { contains: q.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.partnerAccount.findMany({
        where,
        include: {
          members: { where: { role: 'OWNER' }, include: { user: true } },
          _count: { select: { bookings: true } },
        },
        orderBy: { createdAt: 'desc' },
        ...pageArgs(q),
      }),
      this.prisma.partnerAccount.count({ where }),
    ]);
    const balances = await this.ledger.balances(rows.map((r) => r.id));
    return paginated(
      rows.map((a) => ({
        id: a.id,
        code: a.code,
        type: a.type,
        status: a.status,
        legalName: a.tradeName || a.legalName,
        city: a.city,
        email: a.email,
        phone: a.phone,
        ownerName: a.members[0]?.user.fullName ?? null,
        bookingsCount: a._count.bookings,
        balance: balances.get(a.id) ?? 0,
        creditLimit: num(a.creditLimit),
        createdAt: iso(a.createdAt)!,
      })),
      total,
      q,
    );
  }

  async adminCounts() {
    const groups = await this.prisma.partnerAccount.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: true,
    });
    const counts: Record<string, number> = { all: 0, PENDING: 0 };
    for (const g of groups) {
      counts[g.status] = g._count;
      counts.all += g._count;
      if (PENDING_STATUSES.includes(g.status)) counts.PENDING += g._count;
    }
    return counts;
  }

  async adminDetail(id: string, actor: StaffActor): Promise<AdminPartnerDetailDto> {
    const account = await this.prisma.partnerAccount.findUnique({
      where: { id },
      include: accountInclude,
    });
    if (!account) throw new NotFoundException('Partner not found');
    const [balance, tier, reviewer, bookingStats, recent] = await Promise.all([
      this.ledger.balance(id),
      account.pricingTierId
        ? this.prisma.pricingTier.findUnique({ where: { id: account.pricingTierId } })
        : null,
      account.reviewedById
        ? this.prisma.staffUser.findUnique({ where: { id: account.reviewedById } })
        : null,
      this.prisma.booking.groupBy({
        by: ['status'],
        where: { accountId: id },
        _count: true,
        _sum: { totalPrice: true },
      }),
      this.prisma.booking.findMany({
        where: { accountId: id },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: BookingMapper.listInclude,
      }),
    ]);
    const confirmedStatuses = ['CONFIRMED', 'COMPLETED'];
    return {
      ...this.toAccountDto(account),
      members: account.members.map((m) => this.toMemberDto(m, '')),
      balance,
      pricingTier: tier ? { id: tier.id, name: tier.name } : null,
      stats: {
        bookings: bookingStats.reduce((s, g) => s + g._count, 0),
        confirmed: bookingStats
          .filter((g) => confirmedStatuses.includes(g.status))
          .reduce((s, g) => s + g._count, 0),
        gmv: bookingStats
          .filter((g) => confirmedStatuses.includes(g.status))
          .reduce((s, g) => s + num(g._sum.totalPrice), 0),
      },
      recentBookings: recent.map((b) => this.bookings.toListItem(b)),
      reviewedBy: reviewer?.fullName ?? null,
      reviewedAt: iso(account.reviewedAt),
      // Staff with PII access see the full CNIC; others see the masked form.
      cnicMasked: account.cnic
        ? actor.permissions.has('bookings:reveal_pii')
          ? this.crypto.decrypt(account.cnic)
          : maskTail(this.crypto.decrypt(account.cnic))
        : null,
    };
  }

  async review(
    actor: StaffActor,
    id: string,
    action: PartnerReviewAction,
    note: string | undefined,
    meta: RequestMeta,
  ) {
    const needs =
      action === 'suspend' || action === 'reactivate' ? 'partners:suspend' : 'partners:review';
    if (!actor.permissions.has(needs))
      throw new ForbiddenException({
        message: 'You do not have permission to do this',
        code: 'MISSING_PERMISSION',
      });

    const account = await this.prisma.partnerAccount.findUnique({
      where: { id },
      include: { members: { include: { user: true } } },
    });
    if (!account) throw new NotFoundException('Partner not found');
    const t = TRANSITIONS[action];
    if (!t.from.includes(account.status)) {
      throw new ConflictException(
        `A partner that is ${account.status.replace(/_/g, ' ').toLowerCase()} cannot be moved with "${action.replace('_', ' ')}"`,
      );
    }

    const data: Prisma.PartnerAccountUpdateInput = {
      status: t.to,
      reviewedById: actor.userId,
      reviewedAt: new Date(),
    };
    if (action === 'approve')
      Object.assign(data, {
        approvedAt: account.approvedAt ?? new Date(),
        reviewNote: null,
        rejectionReason: null,
      });
    if (action === 'reject') data.rejectionReason = note;
    if (action === 'request_info') data.reviewNote = note;
    if (action === 'suspend') data.suspendedReason = note;
    if (action === 'reactivate') data.suspendedReason = null;

    await this.prisma.partnerAccount.update({ where: { id }, data });
    this.cache.invalidateAccount(id);
    await this.audit.log({
      actor: { realm: 'STAFF', userId: actor.userId },
      action: `partner.${action}`,
      entityType: 'PartnerAccount',
      entityId: id,
      before: { status: account.status },
      after: { status: t.to, note: note ?? null },
      meta,
    });

    const name = account.tradeName || account.legalName;
    const message: Partial<Record<PartnerReviewAction, { title: string; body: string }>> = {
      approve: {
        title: 'Your account is approved',
        body: `${name} is approved on GNK Connect. You can now see partner rates and request bookings.`,
      },
      reject: {
        title: 'Your application was not approved',
        body: `We could not approve ${name}. Reason: ${note}`,
      },
      request_info: {
        title: 'GNK Connect needs more information',
        body: `Please update your application: ${note}`,
      },
      suspend: {
        title: 'Your account is suspended',
        body: `${name} has been suspended. Reason: ${note}. Contact GNK Connect for help.`,
      },
      reactivate: { title: 'Your account is active again', body: `${name} has been reactivated.` },
    };
    const msg = message[action];
    if (msg) {
      await this.notifications.notifyAccount(
        id,
        { type: `ACCOUNT_${t.to}`, ...msg, link: '/', email: true },
        action === 'suspend' || action === 'reactivate' ? undefined : ['OWNER'],
      );
    }
    return this.adminDetail(id, actor);
  }

  async setCredit(
    actor: StaffActor,
    id: string,
    creditLimit: number,
    pricingTierId: string | null | undefined,
    meta: RequestMeta,
  ) {
    const account = await this.prisma.partnerAccount.findUnique({ where: { id } });
    if (!account) throw new NotFoundException('Partner not found');
    if (pricingTierId)
      await this.prisma.pricingTier.findUniqueOrThrow({ where: { id: pricingTierId } });
    await this.prisma.partnerAccount.update({
      where: { id },
      data: { creditLimit, ...(pricingTierId !== undefined ? { pricingTierId } : {}) },
    });
    this.cache.invalidateAccount(id);
    await this.audit.log({
      actor: { realm: 'STAFF', userId: actor.userId },
      action: 'partner.credit_limit',
      entityType: 'PartnerAccount',
      entityId: id,
      before: { creditLimit: num(account.creditLimit), pricingTierId: account.pricingTierId },
      after: { creditLimit, pricingTierId: pricingTierId ?? account.pricingTierId },
      meta,
    });
    return this.adminDetail(id, actor);
  }

  async reviewDocument(
    actor: StaffActor,
    documentId: string,
    status: 'VERIFIED' | 'REJECTED',
    note: string | undefined,
    meta: RequestMeta,
  ) {
    const doc = await this.prisma.kycDocument.findUnique({ where: { id: documentId } });
    if (!doc) throw new NotFoundException('Document not found');
    await this.prisma.kycDocument.update({
      where: { id: documentId },
      data: {
        status,
        reviewNote: note ?? null,
        reviewedById: actor.userId,
        reviewedAt: new Date(),
      },
    });
    await this.audit.log({
      actor: { realm: 'STAFF', userId: actor.userId },
      action: `kyc.${status.toLowerCase()}`,
      entityType: 'KycDocument',
      entityId: documentId,
      before: { status: doc.status },
      after: { status, note: note ?? null },
      meta,
    });
    return this.adminDetail(doc.accountId, actor);
  }

  // =============== helpers ===============

  private async memberFor(actor: PartnerActor, userId: string) {
    if (userId === actor.userId)
      throw new BadRequestException('You cannot change your own membership');
    const member = await this.prisma.partnerMember.findUnique({
      where: { accountId_userId: { accountId: actor.accountId, userId } },
    });
    if (!member) throw new NotFoundException('Team member not found');
    return member;
  }

  /** Owners manage everyone except other owners; managers only manage staff and accountants. */
  private assertCanManage(actor: PartnerActor, targetRole: PartnerRole) {
    if (targetRole === 'OWNER')
      throw new ForbiddenException('The account owner cannot be changed or removed here');
    if (actor.role === 'MANAGER' && targetRole === 'MANAGER')
      throw new ForbiddenException('Managers cannot change other managers');
  }

  private assertCanAssign(actor: PartnerActor, role: PartnerRole) {
    if (role === 'OWNER') throw new ForbiddenException('Ownership cannot be granted by invite');
    if (actor.role === 'MANAGER' && role === 'MANAGER')
      throw new ForbiddenException('Managers can add staff and accountants only');
  }

  private toMemberDto(
    m: {
      userId: string;
      role: PartnerRole;
      createdAt: Date;
      user: {
        fullName: string;
        email: string;
        phone: string;
        status: any;
        lastLoginAt: Date | null;
      };
    },
    you: string,
  ): TeamMemberDto {
    return {
      userId: m.userId,
      fullName: m.user.fullName,
      email: m.user.email,
      phone: m.user.phone,
      role: m.role,
      status: m.user.status,
      lastLoginAt: iso(m.user.lastLoginAt),
      joinedAt: iso(m.createdAt)!,
      isYou: m.userId === you,
    };
  }

  private toAccountDto(a: AccountWithRelations): PartnerAccountDto {
    const owner = a.members.find((m) => m.role === 'OWNER');
    return {
      id: a.id,
      code: a.code,
      type: a.type,
      status: a.status,
      legalName: a.legalName,
      tradeName: a.tradeName,
      dtsLicenseNo: a.dtsLicenseNo,
      iataCode: a.iataCode,
      ntn: a.ntn,
      cnicMasked: a.cnic ? maskTail(this.crypto.decrypt(a.cnic)) : null,
      city: a.city,
      address: a.address,
      phone: a.phone,
      email: a.email,
      creditLimit: num(a.creditLimit),
      reviewNote: a.reviewNote,
      rejectionReason: a.rejectionReason,
      suspendedReason: a.suspendedReason,
      approvedAt: iso(a.approvedAt),
      createdAt: iso(a.createdAt)!,
      documents: a.documents.map<KycDocumentDto>((d) => ({
        id: d.id,
        type: d.type,
        status: d.status,
        fileId: d.fileId,
        fileName: d.file.originalName,
        mimeType: d.file.mimeType,
        reviewNote: d.reviewNote,
        createdAt: iso(d.createdAt)!,
      })),
      requiredDocuments: REQUIRED_DOCUMENTS[a.type],
      ownerEmailVerified: !!owner?.user.emailVerifiedAt,
    };
  }
}

function docLabel(t: KycDocType) {
  return (
    {
      DTS_LICENSE: 'DTS licence',
      NTN_CERTIFICATE: 'NTN certificate',
      CNIC_FRONT: 'CNIC (front)',
      CNIC_BACK: 'CNIC (back)',
      IATA_CERTIFICATE: 'IATA certificate',
      BANK_LETTER: 'Bank letter',
      OTHER: 'Other document',
    } as Record<KycDocType, string>
  )[t];
}
