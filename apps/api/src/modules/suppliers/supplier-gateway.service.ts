import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { MockAirDeskAdapter, SupplierError, type SupplierAdapter } from '@gnk/suppliers';
import { PrismaService } from '../../infra/prisma/prisma.service';

/**
 * Single entry point for supplier calls. Resolves the adapter for a Supplier row
 * and records every call (redacted) in SupplierCallLog for the admin call log.
 */
@Injectable()
export class SupplierGatewayService {
  private readonly logger = new Logger(SupplierGatewayService.name);
  // SUPPLIER_MODE=mock is the only mode until AirDesk sandbox access exists (see env.config.ts).
  private readonly adapters = new Map<string, SupplierAdapter>([
    ['airdesk', new MockAirDeskAdapter()],
  ]);

  constructor(private readonly prisma: PrismaService) {}

  mode(): 'mock' | 'live' {
    return 'mock';
  }

  async adapterFor(supplierId: string): Promise<SupplierAdapter> {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: supplierId } });
    const adapter = supplier && this.adapters.get(supplier.adapterKey);
    if (!adapter) throw new NotFoundException('No adapter is configured for this supplier');
    return adapter;
  }

  async call<T>(
    supplierId: string,
    operation: 'LIST' | 'AVAIL' | 'CREATE' | 'STATUS' | 'CANCEL',
    request: Prisma.InputJsonValue,
    fn: (adapter: SupplierAdapter) => Promise<T>,
    options: {
      bookingId?: string;
      idempotencyKey?: string;
      logResponse?: (r: T) => Prisma.InputJsonValue;
    } = {},
  ): Promise<T> {
    const adapter = await this.adapterFor(supplierId);
    const started = Date.now();
    try {
      const result = await fn(adapter);
      await this.log(supplierId, operation, request, started, {
        bookingId: options.bookingId,
        idempotencyKey: options.idempotencyKey,
        responseCode: 200,
        responseBody: options.logResponse
          ? options.logResponse(result)
          : (result as unknown as Prisma.InputJsonValue),
      });
      return result;
    } catch (err) {
      const kind = err instanceof SupplierError ? err.kind : 'UNAVAILABLE';
      await this.log(supplierId, operation, request, started, {
        bookingId: options.bookingId,
        idempotencyKey: options.idempotencyKey,
        responseCode: null,
        responseBody: { error: (err as Error).message },
        errorKind: kind,
      });
      if (err instanceof SupplierError) throw err;
      this.logger.error(`Supplier ${operation} failed: ${(err as Error).message}`);
      throw new SupplierError('UNAVAILABLE', 'The supplier could not be reached');
    }
  }

  private async log(
    supplierId: string,
    operation: string,
    requestBody: Prisma.InputJsonValue,
    started: number,
    extra: {
      bookingId?: string;
      idempotencyKey?: string;
      responseCode: number | null;
      responseBody: Prisma.InputJsonValue;
      errorKind?: string;
    },
  ) {
    try {
      await this.prisma.supplierCallLog.create({
        data: {
          supplierId,
          operation,
          requestBody,
          durationMs: Date.now() - started,
          bookingId: extra.bookingId,
          idempotencyKey: extra.idempotencyKey,
          responseCode: extra.responseCode,
          responseBody: extra.responseBody,
          errorKind: extra.errorKind,
        },
      });
    } catch (err) {
      this.logger.warn(`Could not write supplier call log: ${(err as Error).message}`);
    }
  }
}
