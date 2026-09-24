import { Injectable } from '@nestjs/common';
import { ISupplierAdapter, airDeskAdapter } from '@gnk/supplier-adapters';
import { StandardGroupProduct } from '@gnk/types';
import { AirDeskHttpClient } from './airdesk-http.client';
import { InventorySyncCron } from './inventory-sync.cron';

@Injectable()
export class SuppliersService {
  private adapters: Map<string, ISupplierAdapter> = new Map();

  constructor(
    private readonly airdeskClient: AirDeskHttpClient,
    private readonly syncCron: InventorySyncCron,
  ) {
    // Register AirDesk as primary supplier
    this.adapters.set(airDeskAdapter.supplierId, airDeskAdapter);
  }

  getAdapter(supplierId: string): ISupplierAdapter {
    const adapter = this.adapters.get(supplierId.toLowerCase());
    if (!adapter) {
      throw new Error(`Supplier adapter not found for: ${supplierId}`);
    }
    return adapter;
  }

  async getAllProducts(filter?: any): Promise<StandardGroupProduct[]> {
    return this.airdeskClient.fetchGroups(filter);
  }

  async getProductDetails(supplierId: string, productId: string): Promise<StandardGroupProduct | null> {
    const adapter = this.getAdapter(supplierId);
    return adapter.getProductDetails(productId);
  }

  async triggerManualSync() {
    return this.syncCron.syncAirDeskInventory();
  }

  getConnectedSuppliers() {
    return Array.from(this.adapters.values()).map(a => ({
      supplierId: a.supplierId,
      supplierName: a.supplierName,
      supportedTypes: a.supportedTypes,
      status: 'ACTIVE'
    }));
  }
}
