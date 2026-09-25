import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(RolesGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  getConnectedSuppliers() {
    return this.suppliersService.getConnectedSuppliers();
  }

  @Roles('GNK_ADMIN')
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
