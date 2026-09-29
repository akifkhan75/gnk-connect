// Input masks for Pakistani identifiers. Pure functions so both the UI
// (as-you-type formatting) and the API (normalisation) use the same rules.

export const digitsOnly = (value: string) => value.replace(/\D/g, '');

/** 3520112345671 → 35201-1234567-1 */
export function formatCnic(value: string): string {
  const d = digitsOnly(value).slice(0, 13);
  if (d.length <= 5) return d;
  if (d.length <= 12) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
}

/** 12345678 → 1234567-8 */
export function formatNtn(value: string): string {
  const d = digitsOnly(value).slice(0, 8);
  return d.length <= 7 ? d : `${d.slice(0, 7)}-${d.slice(7)}`;
}

/** Accepts 03001234567, 3001234567 or +923001234567 and returns "+92 300 1234567". */
export function formatPhonePk(value: string): string {
  let d = digitsOnly(value);
  if (d.startsWith('92')) d = d.slice(2);
  else if (d.startsWith('0')) d = d.slice(1);
  d = d.slice(0, 10);
  if (!d) return value.trim().startsWith('+') ? '+92 ' : '';
  if (d.length <= 3) return `+92 ${d}`;
  return `+92 ${d.slice(0, 3)} ${d.slice(3)}`;
}

/** Normalises any accepted phone form to E.164 (+923001234567). */
export function toE164Pk(value: string): string {
  let d = digitsOnly(value);
  if (d.startsWith('92')) d = d.slice(2);
  else if (d.startsWith('0')) d = d.slice(1);
  return `+92${d}`;
}

export const formatPassport = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 9);

export function maskTail(value: string | null | undefined, visible = 4): string {
  if (!value) return '';
  return `•••• ${value.slice(-visible)}`;
}
