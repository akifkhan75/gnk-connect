import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { PricingEngine, PriceCalculationResult } from './pricing.domain';
import { PricingRule } from '@prisma/client';

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getRules() {
    return this.prisma.pricingRule.findMany({
      orderBy: [
        { scope: 'asc' },
        { priority: 'desc' },
      ]
    });
  }

  async saveRule(data: any) {
    if (data.id) {
      return this.prisma.pricingRule.update({
        where: { id: data.id },
        data: {
          ...data,
          updatedById: 'system', // TODO: extract from token
        }
      });
    } else {
      return this.prisma.pricingRule.create({
        data: {
          ...data,
          createdById: 'system', // TODO: extract from token
        }
      });
    }
  }

  async calculatePrice(params: {
    supplierNetPricePKR: number;
    supplierId?: string;
    productId?: string;
    productType?: string;
    departureId?: string;
    accountId?: string;
    tierId?: string;
  }): Promise<PriceCalculationResult> {
    const rules = await this.prisma.pricingRule.findMany({
      where: {
        isActive: true,
      }
    });

    return PricingEngine.calculate(params.supplierNetPricePKR, rules, {
      accountId: params.accountId,
      tierId: params.tierId,
      departureId: params.departureId,
      productId: params.productId,
      productType: params.productType,
      supplierId: params.supplierId,
    });
  }

  async quoteGroupDeparture(accountId: string, departureId: string) {
    // 1. Fetch Departure & Product & Partner
    const departure = await this.prisma.departure.findUnique({
      where: { id: departureId },
      include: {
        product: true
      }
    });
    if (!departure) throw new Error('Departure not found');

    const partner = await this.prisma.partnerAccount.findUnique({
      where: { id: accountId }
    });
    if (!partner) throw new Error('Partner not found');

    // 2. Compute price
    const rules = await this.prisma.pricingRule.findMany({ where: { isActive: true } });
    const result = PricingEngine.calculate(Number(departure.supplierNet), rules, {
      accountId,
      tierId: partner.pricingTierId || undefined,
      departureId,
      productId: departure.productId,
      productType: departure.product.type,
      supplierId: departure.product.supplierId,
    });

    return result;
  }
}
