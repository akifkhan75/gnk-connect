/** Amounts in words for receipts and vouchers (shared by the web apps and PDF receipts). */

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function below1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const rest = r < 20 ? ONES[r] : `${TENS[Math.floor(r / 10)]}${r % 10 ? ` ${ONES[r % 10]}` : ''}`;
  return [h ? `${ONES[h]} Hundred` : '', rest].filter(Boolean).join(' ');
}

/** "Rupees Seventy Thousand and Fifty Paisa Only", for receipts and vouchers. */
export function amountInWords(value: number, currency = 'Rupees') {
  const cents = Math.round(Math.abs(value) * 100);
  let whole = Math.floor(cents / 100);
  const paisa = cents % 100;
  if (!whole && !paisa) return `${currency} Zero Only`;
  const parts: string[] = [];
  for (const [size, name] of [
    [1_000_000_000, 'Billion'],
    [1_000_000, 'Million'],
    [1_000, 'Thousand'],
  ] as const) {
    if (whole >= size) {
      parts.push(`${below1000(Math.floor(whole / size))} ${name}`);
      whole %= size;
    }
  }
  if (whole) parts.push(below1000(whole));
  const words = parts.join(' ');
  return `${currency} ${words || 'Zero'}${paisa ? ` and ${below1000(paisa)} Paisa` : ''} Only`;
}
