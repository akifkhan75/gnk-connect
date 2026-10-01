import { Injectable, NotFoundException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import type { Prisma } from '@prisma/client';
import { isoDate } from '../../core/money';
import { CryptoService } from '../../infra/crypto/crypto.service';
import { PrismaService } from '../../infra/prisma/prisma.service';

const manifestInclude = {
  passengers: {
    orderBy: { id: 'asc' as const },
    include: { groupPnr: { select: { pnrCode: true } } },
  },
  groupPnr: { select: { pnrCode: true } },
  account: { select: { legalName: true, tradeName: true, code: true } },
} satisfies Prisma.BookingInclude;

type ManifestBooking = Prisma.BookingGetPayload<{ include: typeof manifestInclude }>;

interface ManifestRow {
  pnr: string;
  title: string;
  surname: string;
  givenName: string;
  dob: string;
  gender: string;
  passport: string;
  nationality: string;
  ticketNo: string;
  type: string;
}

const COLS: { key: keyof ManifestRow; header: string; width: number }[] = [
  { key: 'pnr', header: 'PNR', width: 14 },
  { key: 'title', header: 'Title', width: 8 },
  { key: 'surname', header: 'Surname', width: 20 },
  { key: 'givenName', header: 'GivenName', width: 20 },
  { key: 'dob', header: 'DOB', width: 12 },
  { key: 'gender', header: 'Gender', width: 10 },
  { key: 'passport', header: 'Passport', width: 16 },
  { key: 'nationality', header: 'Nationality', width: 12 },
  { key: 'ticketNo', header: 'TicketNo', width: 16 },
  { key: 'type', header: 'Type', width: 10 },
];

/** Staff export of full (decrypted) passenger manifests for one or many bookings. */
@Injectable()
export class PassengerManifestExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  async exportManifest(bookingId: string, format: 'pdf' | 'xlsx') {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: manifestInclude,
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return this.build([booking], format, booking.reference);
  }

  async exportManifestList(bookingIds: string[], format: 'pdf' | 'xlsx') {
    const bookings = await this.prisma.booking.findMany({
      where: { id: { in: bookingIds } },
      include: manifestInclude,
      orderBy: { createdAt: 'asc' },
    });
    if (!bookings.length) throw new NotFoundException('No bookings found');
    return this.build(bookings, format, `manifest-${bookings.length}-bookings`);
  }

  private async build(bookings: ManifestBooking[], format: 'pdf' | 'xlsx', baseName: string) {
    const content =
      format === 'xlsx' ? await this.xlsxBuffer(bookings) : await this.pdfBuffer(bookings);
    return {
      filename: `${baseName}-passengers.${format}`,
      content,
      contentType:
        format === 'xlsx'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf',
    };
  }

  private rowsFor(b: ManifestBooking): ManifestRow[] {
    return b.passengers.map((p) => ({
      pnr: p.groupPnr?.pnrCode ?? b.groupPnr?.pnrCode ?? b.supplierPnr ?? '',
      title: p.title,
      surname: p.lastName.toUpperCase(),
      givenName: p.firstName.toUpperCase(),
      dob: isoDate(p.dateOfBirth) ?? '',
      gender: p.gender,
      passport: this.crypto.decrypt(p.passportNumberEnc).toUpperCase(),
      nationality: p.nationality,
      ticketNo: p.ticketNumber ?? '',
      type: p.type,
    }));
  }

  private async xlsxBuffer(bookings: ManifestBooking[]): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'GNK Connect';
    const ws = wb.addWorksheet('Passengers');
    ws.columns = COLS.map((c) => ({ header: c.header, key: c.key, width: c.width }));
    ws.getRow(1).font = { bold: true };
    for (const b of bookings) {
      if (bookings.length > 1) {
        const row = ws.addRow([`Booking ${b.reference}`]);
        row.font = { bold: true, italic: true };
      }
      for (const row of this.rowsFor(b)) ws.addRow(row);
    }
    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  private pdfBuffer(bookings: ManifestBooking[]): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    const left = 36;
    const right = doc.page.width - 36;
    const width = right - left;
    const widths = [0.1, 0.07, 0.15, 0.16, 0.09, 0.07, 0.13, 0.08, 0.09, 0.06];

    doc
      .font('Helvetica-Bold')
      .fontSize(15)
      .fillColor('#0B1A33')
      .text('Passenger manifest', left, 30);
    let y = 56;

    for (const b of bookings) {
      if (y > doc.page.height - 90) {
        doc.addPage();
        y = 36;
      }
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#0A5CE6')
        .text(`${b.reference} · ${b.account.tradeName || b.account.legalName}`, left, y);
      y += 16;
      let x = left;
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#5B6B82');
      COLS.forEach((c, i) => {
        doc.text(c.header, x, y, { width: width * widths[i] });
        x += width * widths[i];
      });
      y += 11;
      doc.moveTo(left, y).lineTo(right, y).strokeColor('#0B1A33').lineWidth(0.75).stroke();
      y += 4;
      doc.font('Helvetica').fontSize(8).fillColor('#0B1A33');
      for (const row of this.rowsFor(b)) {
        if (y > doc.page.height - 40) {
          doc.addPage();
          y = 36;
        }
        x = left;
        COLS.forEach((c, i) => {
          doc.text(String(row[c.key] ?? ''), x, y, { width: width * widths[i] });
          x += width * widths[i];
        });
        y += 13;
      }
      y += 14;
    }

    doc.end();
    return done;
  }
}
