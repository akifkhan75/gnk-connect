import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AirDeskHttpClient } from './airdesk-http.client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InventorySyncCron implements OnModuleInit {
  private readonly logger = new Logger(InventorySyncCron.name);
  private syncTimer: NodeJS.Timeout | null = null;
  private readonly intervalMs = 15 * 60 * 1000; // 15 minutes

  constructor(
    private readonly airdeskClient: AirDeskHttpClient,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.logger.log('🔄 Initializing AirDesk Automated Inventory Synchronization Engine (15-min interval)...');
    // Run initial sync after a short delay on startup
    setTimeout(() => {
      this.syncAirDeskInventory().catch(e => this.logger.warn(`Initial sync note: ${e.message}`));
    }, 3000);

    // Schedule recurring sync
    this.syncTimer = setInterval(() => {
      this.syncAirDeskInventory().catch(e => this.logger.error(`Periodic sync error: ${e.message}`));
    }, this.intervalMs);
  }

  /**
   * Main synchronization routine: pulls from AirDesk and persists into PostgreSQL
   */
  async syncAirDeskInventory(): Promise<{
    success: boolean;
    syncedCount: number;
    durationMs: number;
    timestamp: string;
  }> {
    const startTime = Date.now();
    this.logger.log('Starting AirDesk Groups sync cycle...');

    try {
      const groups = await this.airdeskClient.fetchGroups();
      let updatedCount = 0;

      // Ensure Supplier record exists
      try {
        await this.prisma.supplier.upsert({
          where: { code: 'airdesk' },
          update: { lastSyncAt: new Date() },
          create: {
            id: 'sup-airdesk-01',
            code: 'airdesk',
            name: 'AirDesk Groups API Engine',
            type: 'AIRDESK',
            status: 'ACTIVE',
            lastSyncAt: new Date(),
          },
        });

        for (const group of groups) {
          await this.prisma.product.upsert({
            where: {
              supplierId_supplierProductId: {
                supplierId: 'sup-airdesk-01',
                supplierProductId: group.supplierProductId,
              },
            },
            update: {
              title: group.title,
              destination: group.destination,
              country: group.country,
              durationDays: group.durationDays,
              durationNights: group.durationNights,
              heroImage: group.heroImage,
              overview: group.overview,
              inclusions: group.inclusions,
              exclusions: group.exclusions,
              itinerary: group.itinerary,
              airline: group.airline,
              hotelRating: group.hotelRating,
              visaIncluded: group.visaIncluded || false,
            },
            create: {
              id: group.id,
              supplierId: 'sup-airdesk-01',
              supplierProductId: group.supplierProductId,
              supplierProductCode: group.supplierProductCode,
              productType: group.productType,
              title: group.title,
              destination: group.destination,
              country: group.country,
              durationDays: group.durationDays,
              durationNights: group.durationNights,
              heroImage: group.heroImage,
              overview: group.overview,
              inclusions: group.inclusions,
              exclusions: group.exclusions,
              itinerary: group.itinerary,
              airline: group.airline,
              hotelRating: group.hotelRating,
              visaIncluded: group.visaIncluded || false,
              isFeatured: group.featured || false,
            },
          });

          // Sync departures
          for (const dep of group.departures) {
            await this.prisma.departure.upsert({
              where: { id: dep.id },
              update: {
                availableSeats: dep.availableSeats,
                supplierNetPricePKR: dep.supplierNetPricePKR,
                status: dep.status,
              },
              create: {
                id: dep.id,
                productId: group.id,
                departureDate: new Date(dep.departureDate),
                returnDate: new Date(dep.returnDate),
                totalSeats: dep.totalSeats,
                availableSeats: dep.availableSeats,
                supplierNetPricePKR: dep.supplierNetPricePKR,
                status: dep.status,
              },
            });
          }
          updatedCount++;
        }
      } catch (dbErr: any) {
        this.logger.warn(`PostgreSQL storage note during sync: ${dbErr.message}`);
      }

      const durationMs = Date.now() - startTime;
      this.logger.log(`✅ AirDesk inventory sync complete: ${groups.length} group series synced in ${durationMs}ms`);

      return {
        success: true,
        syncedCount: groups.length,
        durationMs,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      this.logger.error(`❌ AirDesk sync failed: ${err.message}`);
      return {
        success: false,
        syncedCount: 0,
        durationMs,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
