import type { DepartureStatus, Prisma, PrismaClient, ProductType } from '@prisma/client';
import type { SupplierDeparture, SupplierProduct } from '@gnk/suppliers';

const TYPE_MAP: Record<SupplierProduct['type'], ProductType> = {
  GROUP: 'GROUP',
  UMRAH: 'UMRAH',
  HOTEL: 'HOTEL',
  ZIARAT: 'ZIARAT',
  OTHER: 'OTHER',
};

export function departureStatus(
  d: Pick<SupplierDeparture, 'availableSeats' | 'totalSeats'>,
): DepartureStatus {
  if (d.availableSeats <= 0) return 'SOLD_OUT';
  if (d.availableSeats <= Math.max(5, Math.ceil(d.totalSeats * 0.2))) return 'FILLING_FAST';
  return 'OPEN';
}

/**
 * Upserts a supplier feed into Product/Departure. New products are unpublished
 * (GNK staff decide what partners see) unless `publishNew` is set. Products and
 * departures that disappeared from the feed are hidden, never deleted, because
 * bookings reference them.
 */
export async function importSupplierProducts(
  prisma: PrismaClient | Prisma.TransactionClient,
  supplierId: string,
  products: SupplierProduct[],
  options: { publishNew?: boolean } = {},
) {
  const now = new Date();
  const seenProducts: string[] = [];
  let departures = 0;

  for (const p of products) {
    const product = await prisma.product.upsert({
      where: {
        supplierId_supplierProductId: { supplierId, supplierProductId: p.supplierProductId },
      },
      create: {
        supplierId,
        supplierProductId: p.supplierProductId,
        type: TYPE_MAP[p.type],
        title: p.title,
        sector: p.sector,
        airline: p.airline,
        destination: p.destination,
        country: p.country,
        durationDays: p.durationDays,
        content: p.content as unknown as Prisma.InputJsonValue,
        rawSnapshot: p as unknown as Prisma.InputJsonValue,
        isPublished: !!options.publishNew,
        syncedAt: now,
      },
      update: {
        type: TYPE_MAP[p.type],
        sector: p.sector,
        airline: p.airline,
        destination: p.destination,
        country: p.country,
        durationDays: p.durationDays,
        rawSnapshot: p as unknown as Prisma.InputJsonValue,
        syncedAt: now,
        deletedAt: null,
      },
    });
    seenProducts.push(product.id);

    const seenDepartures: string[] = [];
    for (const d of p.departures) {
      const row = await prisma.departure.upsert({
        where: {
          productId_supplierDepartureId: {
            productId: product.id,
            supplierDepartureId: d.supplierDepartureId,
          },
        },
        create: {
          productId: product.id,
          supplierDepartureId: d.supplierDepartureId,
          departureDate: new Date(`${d.departureDate}T00:00:00Z`),
          returnDate: d.returnDate ? new Date(`${d.returnDate}T00:00:00Z`) : null,
          totalSeats: d.totalSeats,
          supplierAvailable: d.availableSeats,
          supplierNet: d.netFare,
          baggage: d.baggage,
          status: departureStatus(d),
          syncedAt: now,
        },
        update: {
          departureDate: new Date(`${d.departureDate}T00:00:00Z`),
          returnDate: d.returnDate ? new Date(`${d.returnDate}T00:00:00Z`) : null,
          totalSeats: d.totalSeats,
          supplierAvailable: d.availableSeats,
          supplierNet: d.netFare,
          baggage: d.baggage,
          status: departureStatus(d),
          syncedAt: now,
          version: { increment: 1 },
        },
      });
      seenDepartures.push(row.id);
      departures++;
    }

    // Departures the supplier no longer lists (and aren't already past) are closed.
    await prisma.departure.updateMany({
      where: {
        productId: product.id,
        id: { notIn: seenDepartures },
        status: { in: ['OPEN', 'FILLING_FAST'] },
      },
      data: { status: 'CLOSED' },
    });
  }

  await prisma.product.updateMany({
    where: { supplierId, id: { notIn: seenProducts }, deletedAt: null },
    data: { deletedAt: now, isPublished: false },
  });

  return { products: products.length, departures };
}
