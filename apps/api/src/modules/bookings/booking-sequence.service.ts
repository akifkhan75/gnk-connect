import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class BookingSequenceService {
  constructor(private readonly prisma: PrismaService) {}

  async getNextReference(): Promise<string> {
    const year = new Date().getFullYear();
    
    // Use raw query for atomic increment
    const res = await this.prisma.$queryRaw<
      { year: number; last: number }[]
    >`
      INSERT INTO "BookingSequence" (year, last)
      VALUES (${year}, 1)
      ON CONFLICT (year)
      DO UPDATE SET last = "BookingSequence".last + 1
      RETURNING year, last;
    `;

    const seq = res[0];
    const padded = String(seq.last).padStart(6, '0');
    return `GNK-${seq.year}-${padded}`;
  }
}
