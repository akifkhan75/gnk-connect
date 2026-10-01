/**
 * Heuristic parsers for human-readable passport fields (not in TD3 MRZ).
 */

import { sanitizeGivenNames, stripOcrNoiseFromNameString } from './name-sanitize';

const MONTH_MAP: Readonly<Record<string, string>> = {
  JAN: '01',
  FEB: '02',
  MAR: '03',
  APR: '04',
  MAY: '05',
  JUN: '06',
  JUL: '07',
  AUG: '08',
  SEP: '09',
  OCT: '10',
  NOV: '11',
  DEC: '12',
};

function formatNamePart(raw: string): string {
  return stripOcrNoiseFromNameString(
    raw
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^A-Za-z\s'-]/g, '')
      .trim(),
  );
}

function parseFlexibleDate(raw: string): string | undefined {
  const cleaned = raw.trim().replace(/\s+/g, ' ');
  const numeric = cleaned.replace(/\s+/g, '');
  const m = numeric.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (m) {
    const day = m[1].padStart(2, '0');
    const month = m[2].padStart(2, '0');
    let year = m[3];
    if (year.length === 2) {
      const yy = Number.parseInt(year, 10);
      const now = new Date();
      const century = Math.floor(now.getFullYear() / 100) * 100;
      const currentYy = now.getFullYear() % 100;
      year = String(yy > currentYy + 10 ? 1900 + yy : century + yy);
    }

    const iso = `${year}-${month}-${day}`;
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) {
      return iso;
    }
  }

  const mon = cleaned.match(/^(\d{1,2})[.\s/-]*([A-Z]{3})[.\s/-]*(\d{2,4})$/i);
  if (mon) {
    const monthKey = mon[2].toUpperCase();
    const monthNum = MONTH_MAP[monthKey];
    if (monthNum) {
      const day = mon[1].padStart(2, '0');
      let year = mon[3];
      if (year.length === 2) {
        const yy = Number.parseInt(year, 10);
        const now = new Date();
        const century = Math.floor(now.getFullYear() / 100) * 100;
        const currentYy = now.getFullYear() % 100;
        year = String(yy > currentYy + 10 ? 1900 + yy : century + yy);
      }
      const iso = `${year}-${monthNum}-${day}`;
      const d = new Date(iso);
      if (!Number.isNaN(d.getTime())) {
        return iso;
      }
    }
  }

  return undefined;
}

const ISSUE_DATE_PATTERNS: readonly RegExp[] = [
  /(?:DATE\s*OF\s*ISSUE|ISSUE\s*DATE|DATE\s*OF\s*LSSUE|D\.?\s*O\.?\s*I\.?|ISSU(?:ED)?)\s*[:\s-]*(\d{1,2}[./\s-][A-Z]{3}[./\s-]\d{2,4})/gi,
  /(?:DATE\s*OF\s*ISSUE|ISSUE\s*DATE|DATE\s*OF\s*LSSUE|D\.?\s*O\.?\s*I\.?|ISSU(?:ED)?)\s*[:\s-]*(\d{1,2}[./\s-]\d{1,2}[./\s-]\d{2,4})/gi,
  /(?:ISSUED?)\s*(?:ON)?\s*[:\s-]*(\d{1,2}[./\s-][A-Z]{3}[./\s-]\d{2,4})/gi,
  /(?:ISSUED?)\s*(?:ON)?\s*[:\s-]*(\d{1,2}[./\s-]\d{1,2}[./\s-]\d{2,4})/gi,
];

const DATE_TOKEN_PATTERNS: readonly RegExp[] = [
  /\b(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\b/g,
  /\b(\d{1,2}\s+[A-Z]{3}\s+\d{2,4})\b/gi,
];

function collectIsoDates(ocrText: string): string[] {
  const found = new Set<string>();

  for (const pattern of DATE_TOKEN_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null = pattern.exec(ocrText);
    while (match !== null) {
      const iso = parseFlexibleDate(match[1] ?? '');
      if (iso) {
        found.add(iso);
      }
      match = pattern.exec(ocrText);
    }
  }

  return [...found];
}

function isBetweenExclusive(iso: string, after?: string, before?: string): boolean {
  const t = new Date(iso).getTime();
  if (after) {
    const a = new Date(after).getTime();
    if (t <= a) {
      return false;
    }
  }
  if (before) {
    const b = new Date(before).getTime();
    if (t >= b) {
      return false;
    }
  }
  return true;
}

function inferDateOfIssueFromCandidates(
  ocrText: string,
  knownDates?: Readonly<{ dateOfBirth?: string; passportExpiry?: string }>,
): string | undefined {
  const exclude = new Set(
    [knownDates?.dateOfBirth, knownDates?.passportExpiry].filter(
      (d): d is string => typeof d === 'string' && d.length > 0,
    ),
  );

  const between = collectIsoDates(ocrText).filter(
    (iso) =>
      !exclude.has(iso) &&
      isBetweenExclusive(iso, knownDates?.dateOfBirth, knownDates?.passportExpiry),
  );

  if (between.length === 1) {
    return between[0];
  }

  if (between.length > 1) {
    between.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    return between[between.length - 1];
  }

  return undefined;
}

/**
 * Extract passport issue date from OCR text above the MRZ.
 * Excludes dates that match known DOB or expiry from MRZ when provided.
 */
export function extractDateOfIssue(
  ocrText: string,
  knownDates?: Readonly<{ dateOfBirth?: string; passportExpiry?: string }>,
): string | undefined {
  const exclude = new Set(
    [knownDates?.dateOfBirth, knownDates?.passportExpiry].filter(
      (d): d is string => typeof d === 'string' && d.length > 0,
    ),
  );

  for (const pattern of ISSUE_DATE_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null = pattern.exec(ocrText);
    while (match !== null) {
      const iso = parseFlexibleDate(match[1] ?? '');
      if (iso && !exclude.has(iso)) {
        const issue = new Date(iso);
        const dob = knownDates?.dateOfBirth ? new Date(knownDates.dateOfBirth) : null;
        const exp = knownDates?.passportExpiry ? new Date(knownDates.passportExpiry) : null;
        if (dob && issue <= dob) {
          match = pattern.exec(ocrText);
          continue;
        }
        if (exp && issue >= exp) {
          match = pattern.exec(ocrText);
          continue;
        }
        return iso;
      }
      match = pattern.exec(ocrText);
    }
  }

  return inferDateOfIssueFromCandidates(ocrText, knownDates);
}

const VISUAL_SURNAME_PATTERNS: readonly RegExp[] = [
  /(?:SURNAME|LAST\s*NAME|FAMILY\s*NAME)\s*[:\s]+([A-Z][A-Z\s'-]{0,48})/i,
];

const VISUAL_GIVEN_PATTERNS: readonly RegExp[] = [
  /(?:GIVEN\s*NAME(?:S)?|FORENAME(?:S)?|FIRST\s*NAME(?:S)?)\s*[:\s]+([A-Z][A-Z\s'-]{1,48}?)(?=\s+(?:SURNAME|PASSPORT|NATIONALITY|DATE|P<)|\n|$)/i,
];

function trimAtNextLabel(value: string): string {
  const stop = value.search(
    /\s+(?:SURNAME|LAST(?:\s+NAME)?|GIVEN|FORENAME|PASSPORT|NATIONALITY|NATL|DATE|SEX|GENDER|FATHER|MOTHER|HUSBAND|WIFE|GUARDIAN|CNIC|NATIONAL|IDENTITY|IDENTIFICATION|PLACE|BIRTH|COUNTRY|ISSUING|ISSUE|AUTHORITY|DOB|EXPIRY|EXPIR|TYPE|TRACKING|BOOKLET|PREVIOUS|FILE|P<)/i,
  );
  let trimmed = stop > 0 ? value.slice(0, stop) : value;
  trimmed = trimmed.replace(/\s+P\s*$/i, '').trim();
  return trimmed;
}

export interface VisualZoneNames {
  readonly surname?: string;
  readonly givenNames?: string;
}

/**
 * Read surname / given names from the visual (non-MRZ) zone when labels are present.
 */
export function extractVisualNames(ocrText: string): VisualZoneNames {
  const upper = ocrText.toUpperCase();
  let surname: string | undefined;
  let givenNames: string | undefined;

  for (const pattern of VISUAL_SURNAME_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(upper);
    if (match?.[1]) {
      const part = formatNamePart(trimAtNextLabel(match[1]));
      if (part.length >= 2) {
        surname = part;
        break;
      }
    }
  }

  for (const pattern of VISUAL_GIVEN_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(upper);
    if (match?.[1]) {
      const part = formatNamePart(trimAtNextLabel(match[1]));
      if (part.length >= 2) {
        givenNames = part;
        break;
      }
    }
  }

  if (givenNames && surname) {
    givenNames = sanitizeGivenNames(givenNames, surname);
  }

  return { surname, givenNames };
}

export function shouldPreferVisualGiven(
  mrzGiven: string,
  mrzSurname: string,
  visualGiven?: string,
): boolean {
  if (!visualGiven?.trim()) {
    return false;
  }

  const g = mrzGiven.trim().toUpperCase();
  const s = mrzSurname.trim().toUpperCase();

  if (!g) {
    return true;
  }
  if (g === s) {
    return true;
  }
  if (s.startsWith(g) && s.length > g.length) {
    return true;
  }
  const vClean = sanitizeGivenNames(visualGiven, mrzSurname);
  const vNorm = vClean.trim().toUpperCase();
  if (!vNorm || vNorm === s) {
    return false;
  }

  if (vNorm !== g && vNorm.includes(g) && vNorm.length > g.length) {
    const extraTokens = vNorm.split(/\s+/).length - g.split(/\s+/).filter(Boolean).length;
    if (extraTokens > 0) {
      return true;
    }
  }

  return false;
}
