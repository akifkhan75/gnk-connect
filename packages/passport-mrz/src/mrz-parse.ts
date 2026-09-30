import type { ParsedPassportMrz, PassportGender } from './types';
import { normalizeMrzFillerMisreads, sanitizeGivenNames } from './name-sanitize';

const TD3_LINE_LENGTH = 44;

function padMrzLine(line: string): string {
  const normalized = line.replace(/\s/g, '').toUpperCase();
  if (normalized.length >= TD3_LINE_LENGTH) {
    return normalized.slice(0, TD3_LINE_LENGTH);
  }
  return normalized.padEnd(TD3_LINE_LENGTH, '<');
}

function formatMrzNamePart(raw: string): string {
  const normalized = normalizeMrzFillerMisreads(raw);
  return normalized.replace(/</g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * ICAO 9303: surname(s) and given names separated by `<<`.
 * Single `<` within each part is a space (compound names).
 */
export function splitMrzNameField(namesField: string): { surname: string; givenNames: string } {
  const field = normalizeMrzFillerMisreads(namesField.replace(/\s/g, '').toUpperCase());
  const trimmed = field.replace(/<+$/, '');

  const sep = trimmed.indexOf('<<');
  if (sep >= 0) {
    const rawSurname = trimmed.slice(0, sep);
    const rawGiven = trimmed.slice(sep + 2).replace(/<+$/, '');
    if (rawSurname.length > 0 && rawGiven.length > 0) {
      const surname = formatMrzNamePart(rawSurname);
      const givenNames = sanitizeGivenNames(formatMrzNamePart(rawGiven), surname);
      return { surname, givenNames };
    }
  }

  // OCR often drops one chevron between surname and given (e.g. KHAN<AKIF).
  const angle = trimmed.indexOf('<');
  if (angle > 0) {
    const rawSurname = trimmed.slice(0, angle);
    let rawGiven = trimmed.slice(angle + 1).replace(/<+$/, '');
    const innerSep = rawGiven.indexOf('<<');
    if (innerSep >= 0) {
      rawGiven = rawGiven.slice(0, innerSep);
    }
    if (rawSurname.length > 0 && rawGiven.length > 0) {
      const surname = formatMrzNamePart(rawSurname);
      const givenNames = sanitizeGivenNames(formatMrzNamePart(rawGiven), surname);
      return { surname, givenNames };
    }
  }

  return {
    surname: formatMrzNamePart(trimmed),
    givenNames: '',
  };
}

/** Names field on TD3 line 1 starts after document code + issuing state (5 chars). */
export function extractNamesFieldFromLine1(line1: string): string {
  const l1 = padMrzLine(line1);
  if (!l1.startsWith('P<')) {
    return '';
  }

  const issuer = l1.slice(2, 5).replace(/</g, '');
  let names = l1.slice(5).replace(/^<+/, '');

  if (issuer.length === 3 && names.startsWith(issuer) && names.length > 3) {
    names = names.slice(3).replace(/^<+/, '');
  }

  return names;
}

function yyMmDdToIso(yymmdd: string): string | undefined {
  if (!/^\d{6}$/.test(yymmdd)) {
    return undefined;
  }
  const yy = Number.parseInt(yymmdd.slice(0, 2), 10);
  const mm = yymmdd.slice(2, 4);
  const dd = yymmdd.slice(4, 6);
  const now = new Date();
  const currentCentury = Math.floor(now.getFullYear() / 100) * 100;
  const currentTwoDigit = now.getFullYear() % 100;
  const year = yy > currentTwoDigit + 10 ? 1900 + yy : currentCentury + yy;
  const iso = `${year}-${mm}-${dd}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return undefined;
  }
  return iso;
}

function parseGender(raw: string): PassportGender {
  const g = raw.toUpperCase();
  if (g === 'M' || g === 'F' || g === 'X') {
    return g;
  }
  return 'U';
}

type Line2Layout = Readonly<{
  natStart: number;
  dobStart: number;
  sexAt: number;
  expStart: number;
  personalStart: number;
  shifted: boolean;
}>;

const LINE2_LAYOUTS: readonly Line2Layout[] = [
  { natStart: 10, dobStart: 13, sexAt: 20, expStart: 21, personalStart: 28, shifted: false },
  { natStart: 9, dobStart: 12, sexAt: 19, expStart: 20, personalStart: 27, shifted: true },
];

function isIso3Country(code: string): boolean {
  return /^[A-Z]{3}$/.test(code);
}

function parseLine2Fields(l2: string): {
  passportNumber: string;
  nationality: string;
  dobRaw: string;
  gender: PassportGender;
  expiryRaw: string;
  personalNumber: string;
  layout: Line2Layout;
} | null {
  const passportNumber = l2.slice(0, 9).replace(/</g, '').trim();
  if (passportNumber.length < 5) {
    return null;
  }

  for (const layout of LINE2_LAYOUTS) {
    const nationality = l2.slice(layout.natStart, layout.natStart + 3).replace(/</g, '');
    if (!isIso3Country(nationality)) {
      continue;
    }

    const dobRaw = l2.slice(layout.dobStart, layout.dobStart + 6);
    const gender = parseGender(l2.slice(layout.sexAt, layout.sexAt + 1));
    const expiryRaw = l2.slice(layout.expStart, layout.expStart + 6);
    const personalNumber = l2
      .slice(layout.personalStart, layout.personalStart + 14)
      .replace(/</g, '')
      .trim();

    if (!/^\d{6}$/.test(dobRaw) || !/^\d{6}$/.test(expiryRaw)) {
      continue;
    }

    return {
      passportNumber,
      nationality,
      dobRaw,
      gender,
      expiryRaw,
      personalNumber,
      layout,
    };
  }

  return null;
}

/**
 * Parse ICAO 9303 TD3 travel document MRZ (2×44 characters, passport bio page).
 */
export function parseTd3Mrz(line1: string, line2: string): ParsedPassportMrz | null {
  const l1 = padMrzLine(line1);
  const l2 = padMrzLine(line2);

  if (!l1.startsWith('P<') || l2.length < 28) {
    return null;
  }

  const documentCode = l1.slice(0, 2).replace(/</g, '');
  const issuingCountry = l1.slice(2, 5).replace(/</g, '');
  const { surname, givenNames } = splitMrzNameField(extractNamesFieldFromLine1(l1));

  const line2Fields = parseLine2Fields(l2);
  if (!line2Fields) {
    return null;
  }

  const dateOfBirth = yyMmDdToIso(line2Fields.dobRaw);
  const passportExpiry = yyMmDdToIso(line2Fields.expiryRaw);

  if (!dateOfBirth || !passportExpiry || !surname) {
    return null;
  }

  let confidence = line2Fields.layout.shifted ? 0.86 : 0.92;
  if (!givenNames) {
    confidence -= 0.08;
  }

  return {
    documentCode,
    issuingCountry,
    surname,
    givenNames,
    passportNumber: line2Fields.passportNumber,
    nationality: line2Fields.nationality,
    dateOfBirth,
    gender: line2Fields.gender,
    passportExpiry,
    personalNumber: line2Fields.personalNumber.length > 0 ? line2Fields.personalNumber : undefined,
    rawLine1: l1,
    rawLine2: l2,
    confidence: Math.max(0.55, Math.min(0.98, confidence)),
  };
}
