import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  getConnectedSuppliers() {
    return this.suppliersService.getConnectedSuppliers();
  }

  @Post('sync')
  triggerSync() {
    return this.suppliersService.triggerManualSync();
  }

  @Get('products')
  getProducts(@Query() query: any) {
    return this.suppliersService.getAllProducts(query);
  }

  @Get(':supplierId/products/:productId')
  getProductDetails(
    @Param('supplierId') supplierId: string,
    @Param('productId') productId: string,
  ) {
    return this.suppliersService.getProductDetails(supplierId, productId);
  }
}
