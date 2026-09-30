import { Injectable, NotFoundException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import type { Gender, PaxType, Prisma } from '@prisma/client';
import { isoDate } from '../../../core/money';
import { CryptoService } from '../../../infra/crypto/crypto.service';
import { PrismaService } from '../../../infra/prisma/prisma.service';

export type Airline = 'airblue' | 'airsial' | 'saudi';

const airlineInclude = {
  passengers: {
    orderBy: { id: 'asc' as const },
    include: { groupPnr: { select: { pnrCode: true } } },
  },
  groupPnr: { select: { pnrCode: true } },
  account: { select: { legalName: true, tradeName: true, code: true } },
} satisfies Prisma.BookingInclude;

type AirlineBooking = Prisma.BookingGetPayload<{ include: typeof airlineInclude }>;

interface Row {
  pnr: string;
  surname: string;
  givenName: string;
  type: PaxType;
  gender: Gender;
  passport: string;
  dob: string;
  doe: string;
  agent: string;
}

/** ADT/CHD/INF per IATA convention. */
function paxCode(type: PaxType): 'ADT' | 'CHD' | 'INF' {
  if (type === 'ADULT') return 'ADT';
  if (type === 'CHILD') return 'CHD';
  return 'INF';
}

/** AirBlue / AirSial style gender/title token. */
function genderLabel(type: PaxType, gender: Gender): string {
  if (type === 'INFANT') return gender === 'FEMALE' ? 'F' : 'M';
  if (type === 'CHILD') return gender === 'FEMALE' ? 'MISS' : 'MSTR';
  return gender === 'FEMALE' ? 'MS' : 'MR';
}

/** Saudia manifests use a title token embedded in the full name. */
function saudiTitle(type: PaxType, gender: Gender): string {
  if (type === 'INFANT') return 'INF';
  if (type === 'CHILD') return gender === 'FEMALE' ? 'MISS' : 'MSTR';
  return gender === 'FEMALE' ? 'MS' : 'MR';
}

function sheetName(raw: string): string {
  const cleaned = raw.replace(/[[\]:*?/\\]/g, '').trim();
  return (cleaned || 'Manifest').slice(0, 31);
}

/**
 * Airline check-in manifest exports (AirDesk port, simplified). Columns are pragmatic — the
 * airlines accept an .xlsx with these fields regardless of exact styling.
 */
@Injectable()
export class AirlineManifestExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  async export(bookingIds: string[], airline: Airline) {
    const bookings = await this.prisma.booking.findMany({
      where: { id: { in: bookingIds } },
      include: airlineInclude,
      orderBy: { createdAt: 'asc' },
    });
    if (!bookings.length) throw new NotFoundException('No bookings found');
    const rows = bookings.flatMap((b) => this.rowsFor(b));
    const groupLabel =
      bookings.length === 1 ? bookings[0].reference : `${bookings.length}-bookings`;

    const content =
      airline === 'airblue'
        ? await this.buildAirBlue(rows, groupLabel)
        : airline === 'airsial'
          ? await this.buildAirSial(rows, groupLabel)
          : await this.buildSaudi(rows, groupLabel);

    return {
      filename: `${airline}-manifest-${groupLabel}.xlsx`,
      content,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  private rowsFor(b: AirlineBooking): Row[] {
    const agent = b.account.tradeName || b.account.legalName;
    return b.passengers.map((p) => ({
      pnr: p.groupPnr?.pnrCode ?? b.groupPnr?.pnrCode ?? b.supplierPnr ?? '',
      surname: p.lastName.toUpperCase(),
      givenName: p.firstName.toUpperCase(),
      type: p.type,
      gender: p.gender,
      passport: this.crypto.decrypt(p.passportNumberEnc).toUpperCase(),
      dob: isoDate(p.dateOfBirth) ?? '',
      doe: isoDate(p.passportExpiry) ?? '',
      agent,
    }));
  }

  private async buildAirBlue(rows: Row[], label: string): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'GNK Connect';
    const ws = wb.addWorksheet(sheetName(label));
    ws.columns = [
      { header: 'SR #', key: 'sr', width: 6 },
      { header: 'A/L PNR', key: 'pnr', width: 12 },
      { header: 'SURNAME', key: 'surname', width: 18 },
      { header: 'GIVEN NAME', key: 'givenName', width: 18 },
      { header: 'PAX TYPE', key: 'paxType', width: 10 },
      { header: 'GENDER', key: 'gender', width: 10 },
      { header: 'PP NO', key: 'passport', width: 14 },
      { header: 'DOB', key: 'dob', width: 12 },
      { header: 'DOE', key: 'doe', width: 12 },
      { header: 'AGENT', key: 'agent', width: 22 },
    ];
    ws.getRow(1).font = { bold: true };
    rows.forEach((r, i) =>
      ws.addRow({
        sr: i + 1,
        pnr: r.pnr,
        surname: r.surname,
        givenName: r.givenName,
        paxType: paxCode(r.type),
        gender: genderLabel(r.type, r.gender),
        passport: r.passport,
        dob: r.dob,
        doe: r.doe,
        agent: r.agent,
      }),
    );
    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  private async buildAirSial(rows: Row[], label: string): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'GNK Connect';
    const ws = wb.addWorksheet(sheetName(label));
    ws.columns = [
      { header: 'SR #', key: 'sr', width: 6 },
      { header: 'A/L PNR', key: 'pnr', width: 12 },
      { header: 'FULL NAME', key: 'fullName', width: 28 },
      { header: 'PAX TYPE', key: 'paxType', width: 10 },
      { header: 'GENDER', key: 'gender', width: 10 },
      { header: 'PP NO', key: 'passport', width: 14 },
      { header: 'DOB', key: 'dob', width: 12 },
      { header: 'DOE', key: 'doe', width: 12 },
      { header: 'AGENT', key: 'agent', width: 22 },
    ];
    ws.getRow(1).font = { bold: true };
    rows.forEach((r, i) =>
      ws.addRow({
        sr: i + 1,
        pnr: r.pnr,
        fullName: `${r.givenName} ${r.surname}`.trim(),
        paxType: paxCode(r.type),
        gender: genderLabel(r.type, r.gender),
        passport: r.passport,
        dob: r.dob,
        doe: r.doe,
        agent: r.agent,
      }),
    );
    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  private async buildSaudi(rows: Row[], label: string): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'GNK Connect';
    const ws = wb.addWorksheet(sheetName(label));
    ws.columns = [
      { header: 'SR #', key: 'sr', width: 6 },
      { header: 'A/L PNR', key: 'pnr', width: 12 },
      { header: 'FULL NAME', key: 'fullName', width: 32 },
      { header: 'PP NO', key: 'passport', width: 14 },
      { header: 'DOB', key: 'dob', width: 12 },
      { header: 'DOE', key: 'doe', width: 12 },
      { header: 'AGENT', key: 'agent', width: 22 },
    ];
    ws.getRow(1).font = { bold: true };
    rows.forEach((r, i) =>
      ws.addRow({
        sr: i + 1,
        pnr: r.pnr,
        fullName: `${r.surname}/${r.givenName} ${saudiTitle(r.type, r.gender)}`.trim(),
        passport: r.passport,
        dob: r.dob,
        doe: r.doe,
        agent: r.agent,
      }),
    );
    return Buffer.from(await wb.xlsx.writeBuffer());
  }
}
