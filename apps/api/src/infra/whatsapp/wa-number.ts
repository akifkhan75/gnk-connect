/** "+92 300 1234567" / "03001234567" → "923001234567"; null when it isn't a mobile number. */
export function toWaNumber(phone: string): string | null {
  let d = phone.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('03') && d.length === 11) d = `92${d.slice(1)}`; // Pakistani local format
  return /^[1-9]\d{9,14}$/.test(d) ? d : null;
}
