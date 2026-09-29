import {
  ConflictException,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SyncResultDto } from '@gnk/types';
import type { EnvConfig } from '../../core/config/env.config';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { importSupplierProducts } from '../catalog/catalog-import';
import { SupplierGatewayService } from './supplier-gateway.service';

/** Pulls supplier inventory into the catalogue on an interval and on demand. */
@Injectable()
export class SupplierSyncService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(SupplierSyncService.name);
  private readonly running = new Set<string>();
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: SupplierGatewayService,
    private readonly config: ConfigService<EnvConfig, true>,
  ) {}

  onApplicationBootstrap() {
    const minutes = this.config.get('SUPPLIER_SYNC_INTERVAL_MINUTES', { infer: true });
    if (!minutes || this.config.get('NODE_ENV', { infer: true }) === 'test') return;
    const run = () =>
      this.syncAll().catch((e) => this.logger.error(`Scheduled sync failed: ${e.message}`));
    setTimeout(run, 5_000);
    this.timer = setInterval(run, minutes * 60_000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async syncAll() {
    const suppliers = await this.prisma.supplier.findMany({ where: { status: 'ACTIVE' } });
    for (const s of suppliers)
      await this.sync(s.id).catch((e) => this.logger.warn(`Sync ${s.code}: ${e.message}`));
  }

  async sync(supplierId: string): Promise<SyncResultDto> {
    if (this.running.has(supplierId))
      throw new ConflictException('A sync for this supplier is already running');
    this.running.add(supplierId);
    const started = Date.now();
    try {
      const products = await this.gateway.call(supplierId, 'LIST', {}, (a) => a.listProducts(), {
        logResponse: (r) => ({
          products: r.length,
          departures: r.reduce((n, p) => n + p.departures.length, 0),
        }),
      });
      const result = await importSupplierProducts(this.prisma, supplierId, products);
      await this.prisma.supplier.update({
        where: { id: supplierId },
        data: { lastSyncAt: new Date(), lastSyncStatus: 'OK' },
      });
      this.logger.log(
        `Synced ${result.products} products / ${result.departures} departures in ${Date.now() - started} ms`,
      );
      return { ...result, durationMs: Date.now() - started };
    } catch (err) {
      await this.prisma.supplier.update({
        where: { id: supplierId },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: `FAILED: ${(err as Error).message}`.slice(0, 200),
        },
      });
      throw err;
    } finally {
      this.running.delete(supplierId);
    }
  }
}
