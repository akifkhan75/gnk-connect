import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { iso, isoDate, num } from '../../core/money';
import { PrismaService } from '../../infra/prisma/prisma.service';

const INK = '#0B1A33';
const MUTED = '#5B6B82';
const BRAND = '#0A5CE6';
const LOGO = join(process.cwd(), 'assets', 'logo.png');

const money = (n: number, currency = 'PKR') =>
  `${currency} ${n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const documentInclude = {
  passengers: { orderBy: { id: 'asc' as const } },
  account: { select: { legalName: true, tradeName: true, code: true } },
  inventoryLot: {
    include: {
      flightSegment: true,
      sellingGroup: true,
    },
  },
  groupPnr: { select: { pnrCode: true } },
};

type BookingDocRow = NonNullable<Awaited<ReturnType<BookingDocumentsService['loadRow']>>>;

/**
 * Thin PDF stubs for pre-ticket documents (AirDesk port). Not the full e-ticket itinerary —
 * just enough for the agent to have something printable at each stage.
 */
@Injectable()
export class BookingDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  private loadRow(bookingId: string, accountId?: string) {
    return this.prisma.booking.findFirst({
      where: { id: bookingId, ...(accountId ? { accountId } : {}) },
      include: documentInclude,
    });
  }

  async reservationPdf(bookingId: string, accountId?: string) {
    const b = await this.loadRow(bookingId, accountId);
    if (!b) throw new NotFoundException('Booking not found');
    const content = await this.render(b, 'reservation');
    return { filename: `${b.reference}-reservation.pdf`, content };
  }

  async confirmationPdf(bookingId: string, accountId?: string) {
    const b = await this.loadRow(bookingId, accountId);
    if (!b) throw new NotFoundException('Booking not found');
    if (!['CONFIRMED', 'TICKETED'].includes(b.status))
      throw new NotFoundException('Booking is not confirmed yet');
    const content = await this.render(b, 'confirmation');
    return { filename: `${b.reference}-confirmation.pdf`, content };
  }

  async ticketPdf(bookingId: string, accountId?: string) {
    const b = await this.loadRow(bookingId, accountId);
    if (!b) throw new NotFoundException('Booking not found');
    if (b.status !== 'TICKETED') throw new NotFoundException('Booking is not ticketed yet');
    const content = await this.render(b, 'ticket');
    return { filename: `${b.reference}-eticket.pdf`, content };
  }

  private render(
    b: BookingDocRow,
    kind: 'reservation' | 'confirmation' | 'ticket',
  ): Promise<Buffer> {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: { Title: `${b.reference} ${kind}`, Subject: b.reference },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    const left = 50;
    const right = doc.page.width - 50;
    const width = right - left;
    const group = b.inventoryLot?.sellingGroup;
    const segment = b.inventoryLot?.flightSegment;
    const heading =
      kind === 'reservation'
        ? 'Reservation slip'
        : kind === 'ticket'
          ? 'Electronic ticket'
          : 'Booking confirmation';
    const onHold = kind === 'reservation' && !['CONFIRMED', 'TICKETED'].includes(b.status);

    if (existsSync(LOGO)) doc.image(LOGO, left, 46, { height: 34 });
    else doc.font('Helvetica-Bold').fontSize(16).fillColor(INK).text('GNK Connect', left, 52);
    doc
      .font('Helvetica-Bold')
      .fontSize(18)
      .fillColor(INK)
      .text(heading, left, 52, { width, align: 'right' });
    doc.moveTo(left, 96).lineTo(right, 96).lineWidth(2).strokeColor(BRAND).stroke();

    let y = 116;
    doc.font('Helvetica').fontSize(8).fillColor(MUTED).text('BOOKING REFERENCE', left, y);
    doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .fillColor(INK)
      .text(b.reference + (onHold ? ' [ON HOLD]' : ''), left, y + 11);
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(MUTED)
      .text('AGENCY', left + width / 2, y, { width: width / 2, align: 'right' });
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(INK)
      .text(b.account.tradeName || b.account.legalName, left + width / 2, y + 11, {
        width: width / 2,
        align: 'right',
      });

    y = 168;
    doc.roundedRect(left, y, width, 74, 8).fill('#F4F7FB');
    const grid: [string, string][] = [
      ['Group', group?.name ?? group?.code ?? '—'],
      ['Sector', group?.sector ?? '—'],
      ['Airline', group?.airline ?? '—'],
      [
        'Flight',
        segment
          ? `${segment.marketingFlightNumber} · ${segment.departureAirport}-${segment.arrivalAirport}`
          : '—',
      ],
      ['Departure', segment ? new Date(segment.departureTimeUtc).toUTCString().slice(0, 22) : '—'],
      ['PNR', b.groupPnr?.pnrCode ?? (onHold ? 'Issued on confirmation' : '—')],
    ];
    grid.forEach(([k, v], i) => {
      const col = width / 3;
      const x = left + 16 + (i % 3) * col;
      const rowY = y + 12 + Math.floor(i / 3) * 34;
      doc.font('Helvetica').fontSize(7.5).fillColor(MUTED).text(k.toUpperCase(), x, rowY);
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(INK)
        .text(v, x, rowY + 11, { width: col - 20 });
    });

    y = 264;
    const seatLine = [
      b.bookedAdults ? `${b.bookedAdults} adult${b.bookedAdults > 1 ? 's' : ''}` : null,
      b.bookedChildren ? `${b.bookedChildren} child${b.bookedChildren > 1 ? 'ren' : ''}` : null,
      b.bookedInfants ? `${b.bookedInfants} infant${b.bookedInfants > 1 ? 's' : ''}` : null,
    ]
      .filter(Boolean)
      .join(' · ');
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(MUTED)
      .text(`Seats booked: ${seatLine || b.seats}`, left, y);
    y += 16;
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(INK)
      .text('Passenger', left, y)
      .text('Type', left + width * 0.5, y)
      .text(kind === 'confirmation' ? 'Ticket no.' : 'Passport', left + width * 0.68, y);
    y += 12;
    doc.moveTo(left, y).lineTo(right, y).lineWidth(1).strokeColor(INK).stroke();
    y += 6;
    if (b.passengers.length === 0) {
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(MUTED)
        .text('Passenger details pending.', left, y);
      y += 16;
    }
    for (const p of b.passengers) {
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(INK)
        .text(`${p.title} ${p.firstName} ${p.lastName}`, left, y, { width: width * 0.48 })
        .text(p.type, left + width * 0.5, y)
        .text(
          kind === 'ticket' || kind === 'confirmation'
            ? (p.ticketNumber ?? `••••${p.passportLast4}`)
            : `••••${p.passportLast4}`,
          left + width * 0.68,
          y,
        );
      y += 15;
    }

    y += 12;
    doc.roundedRect(left, y, width, 60, 8).fill('#F4F7FB');
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(MUTED)
      .text('TOTAL FARE', left + 16, y + 12);
    doc
      .font('Helvetica-Bold')
      .fontSize(18)
      .fillColor(INK)
      .text(money(num(b.totalPrice), b.currency), left + 16, y + 24);
    const dueLabel = onHold
      ? `Hold expires ${iso(b.heldUntil) ? new Date(b.heldUntil!).toUTCString().slice(0, 22) : '—'}`
      : kind === 'ticket'
        ? `Ticketed · PNR ${b.groupPnr?.pnrCode ?? b.supplierPnr ?? '—'}`
        : `Confirmed ${isoDate(b.confirmedAt) ?? ''}`;
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(MUTED)
      .text(dueLabel, left, y + 24, { width: width - 32, align: 'right' });

    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor('#94A3B8')
      .text(
        onHold
          ? 'This is a provisional reservation. Seats are held pending payment and are not confirmed.'
          : kind === 'ticket'
            ? 'This is your electronic ticket itinerary. Present it with a valid passport at check-in.'
            : 'This document confirms the seats above. It is computer generated and valid without a signature.',
        left,
        doc.page.height - 80,
        { width, align: 'center' },
      );

    doc.end();
    return done;
  }
}
