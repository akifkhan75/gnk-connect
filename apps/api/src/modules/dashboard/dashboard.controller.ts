import { Controller, Get } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AdminDashboardDto, AdminQueueCounts, PartnerDashboardDto } from '@gnk/types';
import { isoDate, num } from '../../core/money';
import { PrismaService } from '../../infra/prisma/prisma.service';
import type { PartnerActor, StaffActor } from '../auth/auth.types';
import { CurrentActor, RequirePermission } from '../auth/decorators';
import { BookingMapper } from '../bookings/booking.mapper';
import { BookingsService } from '../bookings/bookings.service';
import { CatalogService } from '../catalog/catalog.service';
import { LedgerService } from '../ledger/ledger.service';

@Controller('partner/dashboard')
export class PartnerDashboardController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly catalog: CatalogService,
    private readonly bookings: BookingsService,
    private readonly mapper: BookingMapper,
  ) {}

  @Get()
  async get(@CurrentActor() actor: PartnerActor): Promise<PartnerDashboardDto> {
    const scope = {
      accountId: actor.accountId,
      ...(actor.role === 'STAFF' ? { createdByUserId: actor.userId } : {}),
    };
    const today = new Date(new Date().toISOString().slice(0, 10));
    const [counts, upcoming, balance, groups, recent] = await Promise.all([
      this.bookings.partnerCounts(actor),
      this.prisma.booking.count({
        where: {
          ...scope,
          status: { in: ['CONFIRMED', 'APPROVED', 'PENDING_APPROVAL'] },
          departure: { departureDate: { gte: today, lte: new Date(Date.now() + 30 * 86_400_000) } },
        },
      }),
      this.ledger.balance(actor.accountId),
      this.catalog.search(actor, {
        page: 1,
        pageSize: 8,
        sort: 'date',
        to: new Date(Date.now() + 45 * 86_400_000).toISOString().slice(0, 10),
      }),
      this.prisma.booking.findMany({
        where: scope,
        include: BookingMapper.listInclude,
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
    ]);
    const names = await this.bookings.userNames(
      recent.map((r) => ({ realm: 'PARTNER' as const, id: r.createdByUserId })),
    );

    const actions: PartnerDashboardDto['actions'] = [];
    if (actor.accountStatus === 'APPROVED') {
      const approved = await this.prisma.booking.findMany({
        where: { ...scope, status: 'APPROVED' },
        select: { id: true, reference: true, totalPrice: true },
      });
      for (const b of approved.slice(0, 3)) {
        if (balance.availableFunds < num(b.totalPrice)) {
          actions.push({
            label: `Deposit funds so ${b.reference} can be issued (PKR ${num(b.totalPrice).toLocaleString('en-PK')})`,
            link: '/payments',
            tone: 'warning',
          });
        }
      }
      if (balance.balance < 0)
        actions.push({
          label: `Your account owes PKR ${Math.abs(balance.balance).toLocaleString('en-PK')} on credit`,
          link: '/ledger',
          tone: 'danger',
        });
      const rejected = await this.prisma.payment.count({
        where: {
          accountId: actor.accountId,
          status: 'REJECTED',
          createdAt: { gte: new Date(Date.now() - 14 * 86_400_000) },
        },
      });
      if (rejected)
        actions.push({
          label: `${rejected} payment${rejected > 1 ? 's were' : ' was'} rejected. Check and resubmit.`,
          link: '/payments',
          tone: 'danger',
        });
    }

    return {
      stats: {
        pendingApproval: counts.PENDING_APPROVAL,
        awaitingPayment: counts.APPROVED,
        confirmed: counts.CONFIRMED,
        total: counts.all,
        upcomingDepartures: upcoming,
      },
      balance,
      upcomingGroups: groups.items,
      recentBookings: recent.map((r) => this.mapper.toListItem(r, names)),
      actions,
    };
  }
}

@Controller('admin')
export class AdminDashboardController {
  constructor(private readonly prisma: PrismaService) {}

  /** Sidebar badge counts: items waiting in each queue. */
  @Get('queues')
  async queues(@CurrentActor() actor: StaffActor): Promise<AdminQueueCounts> {
    const has = (p: Parameters<StaffActor['permissions']['has']>[0]) => actor.permissions.has(p);
    const [partners, bookings, payments, vouchers] = await Promise.all([
      has('partners:review')
        ? this.prisma.partnerAccount.count({
            where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } },
          })
        : 0,
      has('bookings:approve') || has('bookings:push_supplier')
        ? this.prisma.booking.count({
            where: { status: { in: ['PENDING_APPROVAL', 'APPROVED', 'SUPPLIER_FAILED'] } },
          })
        : 0,
      has('payments:verify') ? this.prisma.payment.count({ where: { status: 'SUBMITTED' } }) : 0,
      has('ledger:jv_approve')
        ? this.prisma.ledgerTransaction.count({ where: { status: 'SUBMITTED', type: 'JOURNAL' } })
        : 0,
    ]);
    return { partners, bookings, payments, vouchers };
  }

  @Get('dashboard')
  @RequirePermission('dashboard:view')
  async dashboard(@CurrentActor() actor: StaffActor): Promise<AdminDashboardDto> {
    const since = new Date(Date.now() - 30 * 86_400_000);
    const sold = ['CONFIRMED', 'COMPLETED'] as const;
    const [
      created,
      confirmedAgg,
      activePartners,
      pendingPartners,
      pendingBookings,
      pendingPayments,
      daily,
      funnel,
      top,
      upcoming,
      supplier,
    ] = await Promise.all([
      this.prisma.booking.count({ where: { createdAt: { gte: since } } }),
      this.prisma.booking.aggregate({
        where: { createdAt: { gte: since }, status: { in: [...sold] } },
        _count: true,
        _sum: { totalPrice: true },
      }),
      this.prisma.partnerAccount.count({ where: { status: 'APPROVED', deletedAt: null } }),
      this.prisma.partnerAccount.count({
        where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } },
      }),
      this.prisma.booking.count({ where: { status: 'PENDING_APPROVAL' } }),
      this.prisma.payment.count({ where: { status: 'SUBMITTED' } }),
      this.prisma.$queryRaw<{ day: Date; bookings: bigint; gmv: Prisma.Decimal | null }[]>`
        SELECT date_trunc('day', "createdAt" AT TIME ZONE 'Asia/Karachi') AS day,
               COUNT(*) AS bookings,
               SUM(CASE WHEN status IN ('CONFIRMED','COMPLETED') THEN "totalPrice" ELSE 0 END) AS gmv
        FROM "Booking" WHERE "createdAt" >= ${since}
        GROUP BY 1 ORDER BY 1`,
      this.prisma.booking.groupBy({
        by: ['status'],
        where: { createdAt: { gte: since } },
        _count: true,
      }),
      this.prisma.booking.groupBy({
        by: ['accountId'],
        where: { createdAt: { gte: since }, status: { in: [...sold] } },
        _count: true,
        _sum: { totalPrice: true },
        orderBy: { _sum: { totalPrice: 'desc' } },
        take: 5,
      }),
      this.prisma.departure.findMany({
        where: {
          departureDate: { gte: new Date(), lte: new Date(Date.now() + 21 * 86_400_000) },
          bookings: { some: { status: { in: ['PENDING_APPROVAL', 'APPROVED', 'CONFIRMED'] } } },
        },
        include: {
          product: { select: { title: true, sector: true } },
          bookings: {
            where: { status: { in: ['PENDING_APPROVAL', 'APPROVED', 'CONFIRMED'] } },
            select: { seats: true },
          },
        },
        orderBy: { departureDate: 'asc' },
        take: 6,
      }),
      this.prisma.supplier.findFirst({ orderBy: { createdAt: 'asc' } }),
    ]);

    const margin = actor.permissions.has('bookings:view_supplier_net')
      ? num(
          (
            await this.prisma.$queryRaw<{ m: Prisma.Decimal | null }[]>`
          SELECT SUM("markupUnit" * seats) AS m FROM "Booking" WHERE "createdAt" >= ${since} AND status IN ('CONFIRMED','COMPLETED')`
          )[0]?.m,
        )
      : null;
    const accounts = await this.prisma.partnerAccount.findMany({
      where: { id: { in: top.map((t) => t.accountId) } },
      select: { id: true, code: true, legalName: true, tradeName: true },
    });
    const count = (s: string[]) =>
      funnel.filter((f) => s.includes(f.status)).reduce((n, f) => n + f._count, 0);

    // Fill missing days so the chart has a continuous 30-day axis.
    const byDay = new Map(daily.map((d) => [isoDate(d.day)!, d]));
    const series: AdminDashboardDto['daily'] = [];
    for (let i = 29; i >= 0; i--) {
      const key = new Date(Date.now() + 5 * 3600_000 - i * 86_400_000).toISOString().slice(0, 10);
      const row = byDay.get(key);
      series.push({
        date: key,
        bookings: row ? Number(row.bookings) : 0,
        gmv: row ? num(row.gmv) : 0,
      });
    }

    return {
      kpis: {
        bookings30d: created,
        confirmed30d: confirmedAgg._count,
        gmv30d: num(confirmedAgg._sum.totalPrice),
        margin30d: margin,
        activePartners,
        pendingPartners,
        pendingBookings,
        pendingPayments,
      },
      daily: series,
      funnel: {
        requested: created,
        approved: count([
          'APPROVED',
          'SUBMITTED_TO_SUPPLIER',
          'SUPPLIER_PENDING',
          'SUPPLIER_FAILED',
          'CONFIRMED',
          'COMPLETED',
        ]),
        confirmed: count(['CONFIRMED', 'COMPLETED']),
        rejected: count(['REJECTED', 'CANCELLED']),
      },
      topPartners: top.map((t) => {
        const a = accounts.find((x) => x.id === t.accountId);
        return {
          id: t.accountId,
          name: a ? a.tradeName || a.legalName : '—',
          code: a?.code ?? '',
          bookings: t._count,
          gmv: num(t._sum.totalPrice),
        };
      }),
      upcomingDepartures: upcoming.map((d) => ({
        departureId: d.id,
        title: d.product.sector ?? d.product.title,
        departureDate: isoDate(d.departureDate)!,
        bookings: d.bookings.length,
        seats: d.bookings.reduce((s, b) => s + b.seats, 0),
      })),
      supplier:
        supplier && actor.permissions.has('suppliers:read')
          ? {
              name: supplier.name,
              lastSyncAt: supplier.lastSyncAt?.toISOString() ?? null,
              lastSyncStatus: supplier.lastSyncStatus,
              failures24h: await this.prisma.supplierCallLog.count({
                where: {
                  supplierId: supplier.id,
                  errorKind: { not: null },
                  createdAt: { gte: new Date(Date.now() - 86_400_000) },
                },
              }),
            }
          : null,
    };
  }
}
