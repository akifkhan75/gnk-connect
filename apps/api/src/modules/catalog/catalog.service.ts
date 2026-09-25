import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublishedGroups() {
    return this.prisma.product.findMany({
      where: {
        type: 'GROUP',
        isPublished: true,
      },
      include: {
        departures: {
          where: {
            status: 'OPEN',
            departureDate: { gte: new Date() },
          },
          orderBy: { departureDate: 'asc' },
        },
      },
    });
  }

  async getGroupDetails(id: string) {
    return this.prisma.product.findUnique({
      where: { id },
      include: {
        departures: {
          where: {
            status: { in: ['OPEN', 'WAITLIST'] },
            departureDate: { gte: new Date() },
          },
          orderBy: { departureDate: 'asc' },
        },
      },
    });
  }
}
