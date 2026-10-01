import { existsSync } from 'node:fs';
import { join } from 'node:path';
import PDFDocument from 'pdfkit';
import { amountInWords, type ReceiptDto } from '@gnk/types';

const INK = '#0B1A33';
const MUTED = '#5B6B82';
const LINE = '#E2E8F0';
const BRAND = '#0A5CE6';
const LOGO = join(process.cwd(), 'assets', 'logo.png');

const money = (n: number) =>
  `PKR ${n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = (iso: string | null) =>
  iso
    ? new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : '—';
const title = (s: string) =>
  s
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());

/** Renders a payment receipt as an A4 PDF, matching the printable receipt page. */
export function renderReceiptPdf(r: ReceiptDto): Promise<Buffer> {
  const p = r.payment;
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    info: {
      Title: `Receipt ${r.number}`,
      Author: r.company.name,
      Subject: `Payment ${p.reference}`,
    },
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
  const label = (
    text: string,
    x: number,
    y: number,
    w?: number,
    align: 'left' | 'right' = 'left',
  ) =>
    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor(MUTED)
      .text(text.toUpperCase(), x, y, { width: w, align, characterSpacing: 0.6 });

  // Header
  if (existsSync(LOGO)) doc.image(LOGO, left, 46, { height: 34 });
  else doc.font('Helvetica-Bold').fontSize(16).fillColor(INK).text(r.company.name, left, 52);
  doc
    .font('Helvetica-Bold')
    .fontSize(18)
    .fillColor(INK)
    .text('Payment receipt', left, 52, { width, align: 'right' });
  doc.moveTo(left, 96).lineTo(right, 96).lineWidth(2).strokeColor(BRAND).stroke();

  // Parties
  const col = width / 2;
  let y = 116;
  label('Issued by', left, y);
  label('Receipt', left + col, y, col, 'right');
  y += 12;
  doc
    .font('Helvetica-Bold')
    .fontSize(10.5)
    .fillColor(INK)
    .text(r.company.name, left, y, { width: col - 10 });
  doc.text(r.number, left + col, y, { width: col, align: 'right' });
  doc.font('Helvetica').fontSize(9).fillColor(MUTED);
  doc.text(
    [
      r.company.address,
      `${r.company.phone} · ${r.company.email}`,
      r.company.ntn ? `NTN ${r.company.ntn}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
    left,
    y + 15,
    { width: col - 10 },
  );
  doc.text(`Dated ${date(r.date)}\nPayment ${p.reference}`, left + col, y + 15, {
    width: col,
    align: 'right',
  });

  y = 200;
  label('Received from', left, y);
  doc
    .font('Helvetica-Bold')
    .fontSize(10.5)
    .fillColor(INK)
    .text(r.receivedFrom.name, left, y + 12);
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(MUTED)
    .text(
      [
        r.receivedFrom.code,
        [r.receivedFrom.address, r.receivedFrom.city].filter(Boolean).join(', '),
        r.receivedFrom.email,
      ]
        .filter(Boolean)
        .join('\n'),
      left,
      y + 27,
    );

  // Amount panel
  y = 285;
  doc.roundedRect(left, y, width, 82, 10).fill('#F4F7FB');
  label('Amount received', left + 18, y + 16);
  doc
    .font('Helvetica-Bold')
    .fontSize(24)
    .fillColor(INK)
    .text(money(p.amount), left + 18, y + 29);
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(MUTED)
    .text(amountInWords(p.amount), left + 18, y + 60, {
      width: width - 36,
    });

  // Details grid
  y = 392;
  const details: [string, string][] = [
    ['Method', title(p.method)],
    ['Bank', p.bankName ?? '—'],
    ['Transaction / slip no.', p.transactionRef ?? '—'],
    ['Paid on', date(p.paidAt)],
    ['Deposited to', r.depositAccount ?? '—'],
    ['Approved by', r.approvedBy ?? '—'],
  ];
  details.forEach(([k, v], i) => {
    const x = left + (i % 2) * col;
    const rowY = y + Math.floor(i / 2) * 34;
    label(k, x, rowY);
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(INK)
      .text(v, x, rowY + 11, { width: col - 12 });
  });
  y += Math.ceil(details.length / 2) * 34 + 12;

  // Allocations
  if (p.allocations.length) {
    label('Applied to booking', left, y);
    label('Amount', left, y, width, 'right');
    y += 13;
    doc.moveTo(left, y).lineTo(right, y).lineWidth(1.2).strokeColor(INK).stroke();
    for (const a of p.allocations) {
      y += 7;
      doc.font('Helvetica').fontSize(10).fillColor(INK).text(a.bookingReference, left, y);
      doc.text(money(a.amount), left, y, { width, align: 'right' });
      y += 16;
      doc.moveTo(left, y).lineTo(right, y).lineWidth(0.5).strokeColor(LINE).stroke();
    }
    y += 14;
  }
  if (p.notes) {
    doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(`Note: ${p.notes}`, left, y, { width });
  }

  doc
    .font('Helvetica')
    .fontSize(7.5)
    .fillColor('#94A3B8')
    .text(
      `This receipt is computer generated and valid without a signature. The amount has been credited to the account balance of ${r.receivedFrom.code}.`,
      left,
      doc.page.height - 90,
      { width, align: 'center' },
    );

  doc.end();
  return done;
}
