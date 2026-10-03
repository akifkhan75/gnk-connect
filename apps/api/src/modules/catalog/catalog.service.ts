import { Injectable, NotFoundException } from '@nestjs/common';
import type { Departure, Prisma, Product, ProductType } from '@prisma/client';
import type {
  AdminProductDetailDto,
  AdminProductListItem,
  FlightLegDto,
  GroupDetailDto,
  GroupFilters,
  GroupListItem,
  Paginated,
  ProductContentDto,
} from '@gnk/types';
import type { z } from 'zod';
import type { groupSearchSchema } from '@gnk/validation';
import { pageArgs, paginated } from '../../core/http/pagination';
import { iso, isoDate, num } from '../../core/money';
import { PrismaService } from '../../infra/prisma/prisma.service';
import type { PartnerActor, StaffActor } from '../auth/auth.types';
import { PricingService, seatsLeft } from '../pricing/pricing.service';

type DepartureWithProduct = Departure & { product: Product };
type Search = z.output<typeof groupSearchSchema>;

const todayUtc = () => new Date(new Date().toISOString().slice(0, 10));
const content = (p: Product) => p.content as unknown as ProductContentDto;

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
  ) {}

  // =============== Partner ===============

  async search(actor: PartnerActor | null, q: Search): Promise<Paginated<GroupListItem>> {
    const where: Prisma.DepartureWhereInput = {
      departureDate: {
        gte: q.from ? new Date(`${q.from}T00:00:00Z`) : todayUtc(),
        ...(q.to ? { lte: new Date(`${q.to}T00:00:00Z`) } : {}),
      },
      status: { in: ['OPEN', 'FILLING_FAST', 'SOLD_OUT'] },
      product: {
        isPublished: true,
        deletedAt: null,
        supplier: { status: 'ACTIVE' },
        ...(q.sector ? { sector: q.sector } : {}),
        ...(q.airline ? { airline: q.airline } : {}),
        ...(q.type ? { type: q.type as ProductType } : {}),
        ...(q.q
          ? {
              OR: [
                { title: { contains: q.q, mode: 'insensitive' } },
                { destination: { contains: q.q, mode: 'insensitive' } },
                { sector: { contains: q.q, mode: 'insensitive' } },
                { airline: { contains: q.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
    };
    let rows = await this.prisma.departure.findMany({
      where,
      include: { product: true },
      orderBy: { departureDate: 'asc' },
    });
    if (q.minSeats) rows = rows.filter((d) => seatsLeft(d) >= q.minSeats!);
    if (q.days) rows = rows.filter((d) => d.product.durationDays === q.days);

    const prices = await this.partnerPrices(actor, rows);
    let items = rows.map((d) => this.toGroupItem(d, prices.get(d.id) ?? null));
    if (q.sort === 'price' && actor) items = items.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    if (q.sort === 'seats') items = items.sort((a, b) => b.seatsAvailable - a.seatsAvailable);

    const start = (q.page - 1) * q.pageSize;
    return paginated(items.slice(start, start + q.pageSize), items.length, q);
  }

  async filters(): Promise<GroupFilters> {
    const products = await this.prisma.product.findMany({
      where: { isPublished: true, deletedAt: null },
      select: { sector: true, airline: true, type: true, durationDays: true },
    });
    const uniq = <T>(v: (T | null)[]) => [...new Set(v.filter(Boolean) as T[])].sort();
    return {
      sectors: uniq(products.map((p) => p.sector)),
      airlines: uniq(products.map((p) => p.airline)),
      types: uniq(products.map((p) => p.type)),
      durations: uniq(products.map((p) => p.durationDays)).sort((a, b) => a - b),
    };
  }

  async detail(actor: PartnerActor | null, productId: string): Promise<GroupDetailDto> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, isPublished: true, deletedAt: null },
      include: {
        departures: {
          where: { departureDate: { gte: todayUtc() }, status: { not: 'CANCELLED' } },
          orderBy: { departureDate: 'asc' },
        },
      },
    });
    if (!product) throw new NotFoundException('This group is not available');
    const departures = product.departures.map((d) => ({ ...d, product }));
    const prices = await this.partnerPrices(actor, departures);
    return {
      id: product.id,
      type: product.type,
      title: product.title,
      sector: product.sector,
      airline: product.airline,
      destination: product.destination,
      country: product.country,
      durationDays: product.durationDays,
      content: content(product),
      departures: departures.map((d) => ({
        id: d.id,
        departureDate: isoDate(d.departureDate)!,
        returnDate: isoDate(d.returnDate),
        seatsAvailable: seatsLeft(d),
        baggage: d.baggage,
        status: d.status,
        price: prices.get(d.id) ?? null,
      })),
    };
  }

  /** Prices only for approved partners (plan 04 §3.1). */
  private async partnerPrices(actor: PartnerActor | null, departures: DepartureWithProduct[]) {
    if (!actor || actor.accountStatus !== 'APPROVED' || !departures.length)
      return new Map<string, number>();
    const account = await this.prisma.partnerAccount.findUniqueOrThrow({
      where: { id: actor.accountId },
      select: { id: true, pricingTierId: true },
    });
    const results = await this.pricing.priceMany(departures, account);
    return new Map([...results].map(([id, r]) => [id, r.calculatedSellingPricePKR]));
  }

  toGroupItem(d: DepartureWithProduct, price: number | null): GroupListItem {
    const c = content(d.product);
    return {
      productId: d.productId,
      departureId: d.id,
      type: d.product.type,
      title: d.product.title,
      sector: d.product.sector,
      airline: d.product.airline,
      destination: d.product.destination,
      country: d.product.country,
      departureDate: isoDate(d.departureDate)!,
      returnDate: isoDate(d.returnDate),
      durationDays: d.product.durationDays,
      baggage: d.baggage,
      seatsAvailable: seatsLeft(d),
      status: d.status,
      price,
      outbound: (c.outbound as FlightLegDto) ?? null,
      inbound: (c.inbound as FlightLegDto) ?? null,
    };
  }

  // =============== Admin ===============

  async adminList(
    actor: StaffActor,
    q: { page: number; pageSize: number; q?: string; type: string; published: string },
  ): Promise<Paginated<AdminProductListItem>> {
    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      ...(q.type !== 'all' ? { type: q.type as ProductType } : {}),
      ...(q.published !== 'all' ? { isPublished: q.published === 'yes' } : {}),
      ...(q.q
        ? {
            OR: [
              { title: { contains: q.q, mode: 'insensitive' } },
              { sector: { contains: q.q, mode: 'insensitive' } },
              { airline: { contains: q.q, mode: 'insensitive' } },
              { destination: { contains: q.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          supplier: true,
          departures: {
            where: { departureDate: { gte: todayUtc() } },
            orderBy: { departureDate: 'asc' },
          },
        },
        orderBy: [{ isFeatured: 'desc' }, { title: 'asc' }],
        ...pageArgs(q),
      }),
      this.prisma.product.count({ where }),
    ]);
    return paginated(
      rows.map((p) => this.toAdminItem(p)),
      total,
      q,
    );
  }

  async adminDetail(actor: StaffActor, id: string): Promise<AdminProductDetailDto> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { supplier: true, departures: { orderBy: { departureDate: 'asc' } } },
    });
    if (!product) throw new NotFoundException('Product not found');
    const showNet = actor.permissions.has('bookings:view_supplier_net');
    const prices = await this.pricing.priceMany(product.departures.map((d) => ({ ...d, product })));
    return {
      ...this.toAdminItem({
        ...product,
        departures: product.departures.filter((d) => d.departureDate >= todayUtc()),
      }),
      country: product.country,
      durationDays: product.durationDays,
      content: content(product),
      departures: product.departures.map((d) => ({
        id: d.id,
        departureDate: isoDate(d.departureDate)!,
        returnDate: isoDate(d.returnDate),
        totalSeats: d.totalSeats,
        supplierAvailable: d.supplierAvailable,
        heldSeats: d.heldSeats,
        status: d.status,
        baggage: d.baggage,
        supplierNet: showNet ? num(d.supplierNet) : null,
        defaultPrice: prices.get(d.id)?.calculatedSellingPricePKR ?? null,
      })),
    };
  }

  async setVisibility(id: string, data: { isPublished?: boolean; isFeatured?: boolean }) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product || product.deletedAt) throw new NotFoundException('Product not found');
    await this.prisma.product.update({ where: { id }, data });
    return product;
  }

  /** Lightweight pickers for pricing rules and simulator. */
  async adminOptions() {
    const [partners, products, suppliers, departures] = await Promise.all([
      this.prisma.partnerAccount.findMany({
        where: {
          deletedAt: null,
          status: { in: ['APPROVED', 'SUSPENDED', 'UNDER_REVIEW', 'SUBMITTED'] },
        },
        select: { id: true, code: true, legalName: true, tradeName: true },
        orderBy: { legalName: 'asc' },
      }),
      this.prisma.product.findMany({
        where: { deletedAt: null },
        select: { id: true, title: true, type: true },
        orderBy: { title: 'asc' },
      }),
      this.prisma.supplier.findMany({ select: { id: true, name: true } }),
      this.prisma.departure.findMany({
        where: { departureDate: { gte: todayUtc() }, product: { deletedAt: null } },
        include: { product: { select: { title: true, sector: true } } },
        orderBy: { departureDate: 'asc' },
      }),
    ]);
    return {
      partners: partners.map((p) => ({
        id: p.id,
        label: `${p.tradeName || p.legalName} (${p.code})`,
      })),
      products: products.map((p) => ({ id: p.id, label: p.title, type: p.type })),
      suppliers: suppliers.map((s) => ({ id: s.id, label: s.name })),
      departures: departures.map((d) => ({
        id: d.id,
        productId: d.productId,
        label: `${d.product.sector ?? d.product.title} · ${isoDate(d.departureDate)}`,
      })),
    };
  }

  private toAdminItem(
    p: Product & { supplier: { name: string }; departures: Departure[] },
  ): AdminProductListItem {
    const upcoming = p.departures.filter((d) => d.departureDate >= todayUtc());
    return {
      id: p.id,
      type: p.type,
      title: p.title,
      sector: p.sector,
      airline: p.airline,
      destination: p.destination,
      supplierName: p.supplier.name,
      isPublished: p.isPublished,
      isFeatured: p.isFeatured,
      departuresCount: upcoming.length,
      nextDeparture: isoDate(upcoming[0]?.departureDate),
      seatsAvailable: upcoming.reduce((s, d) => s + seatsLeft(d), 0),
      syncedAt: iso(p.syncedAt)!,
    };
  }
}
