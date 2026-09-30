import { Injectable, NotFoundException } from '@nestjs/common';
import { extractPassportFromOcrText, type PassportOcrExtraction } from '@gnk/passport-mrz';
import { PrismaService } from '../../infra/prisma/prisma.service';
import type { PartnerActor } from '../auth/auth.types';
import { FilesService } from '../files/files.service';

/** Passport MRZ/OCR extraction for prefilling passenger forms, and attaching a scanned copy. */
@Injectable()
export class PassportOcrService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FilesService,
  ) {}

  extractFromText(ocrText: string): PassportOcrExtraction {
    return extractPassportFromOcrText(ocrText);
  }

  /** Attaches an already-uploaded PASSPORT_COPY file to a passenger for staff reference. */
  async attachScan(actor: PartnerActor, bookingId: string, passengerId: string, fileId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, accountId: actor.accountId },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    const passenger = await this.prisma.passenger.findFirst({
      where: { id: passengerId, bookingId },
    });
    if (!passenger) throw new NotFoundException('Passenger not found');
    await this.files.assertPartnerFile(actor.accountId, fileId, 'PASSPORT_COPY');
    await this.prisma.passenger.update({
      where: { id: passengerId },
      data: { passportScanFileId: fileId },
    });
    return { passportScanFileId: fileId };
  }
}
