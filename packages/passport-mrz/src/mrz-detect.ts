import { parseTd3Mrz } from './mrz-parse';
import type { PassportOcrExtraction } from './types';
import { sanitizeGivenNames } from './name-sanitize';
import { extractDateOfIssue, extractVisualNames, shouldPreferVisualGiven } from './visual-zone';

function normalizeOcrLine(line: string): string {
  return line
    .toUpperCase()
    .replace(/\s/g, '')
    .replace(/[^A-Z0-9<]/g, '<');
}

/**
 * Find TD3 MRZ line pairs inside noisy OCR text.
 */
export function findTd3MrzPairs(ocrText: string): readonly (readonly [string, string])[] {
  const lines = ocrText
    .split(/\r?\n/)
    .map(normalizeOcrLine)
    .filter((line) => line.length >= 28);

  const pairs: (readonly [string, string])[] = [];

  for (let i = 0; i < lines.length - 1; i += 1) {
    const current = lines[i];
    const next = lines[i + 1];
    if (current.startsWith('P<') && /^[A-Z0-9<]{28,}$/.test(next)) {
      pairs.push([current, next]);
    }
  }

  // Single blob: try sliding 44-char windows
  const blob = lines.join('');
  if (pairs.length === 0 && blob.includes('P<')) {
    const start = blob.indexOf('P<');
    const slice = blob.slice(start);
    if (slice.length >= 88) {
      pairs.push([slice.slice(0, 44), slice.slice(44, 88)]);
    }
  }

  return pairs;
}

/** Booking forms use a single “Given name(s)” field — keep all MRZ given names together. */
function mapGivenNamesForForm(givenNames: string): { firstName: string; middleName?: string } {
  const normalized = givenNames.trim().replace(/\s+/g, ' ');
  if (!normalized) {
    return { firstName: '' };
  }
  const tokens = normalized.split(' ');
  if (tokens.length <= 1) {
    return { firstName: normalized };
  }
  return {
    firstName: normalized,
    middleName: undefined,
  };
}

function heuristicFromText(ocrText: string): PassportOcrExtraction | null {
  const upper = ocrText.toUpperCase();
  const passportMatch = upper.match(/\b[A-Z]{1,2}\d{6,8}\b/);
  if (!passportMatch) {
    return null;
  }

  return {
    passportNumber: passportMatch[0],
    confidence: 0.35,
    source: 'heuristic',
    warnings: ['MRZ not detected — passport number guessed from OCR text'],
  };
}

export function extractPassportFromOcrText(ocrText: string): PassportOcrExtraction {
  const warnings: string[] = [];
  const pairs = findTd3MrzPairs(ocrText);

  for (const [line1, line2] of pairs) {
    const parsed = parseTd3Mrz(line1, line2);
    if (!parsed) {
      continue;
    }

    const visual = extractVisualNames(ocrText);
    const mrzGivenClean = sanitizeGivenNames(parsed.givenNames, parsed.surname);
    const visualGivenClean = sanitizeGivenNames(visual.givenNames ?? '', parsed.surname);
    const mrzMapped = mapGivenNamesForForm(mrzGivenClean);
    const useVisualGiven = shouldPreferVisualGiven(mrzGivenClean, parsed.surname, visualGivenClean);
    const firstName = useVisualGiven
      ? mapGivenNamesForForm(visualGivenClean).firstName
      : mrzMapped.firstName;
    const middleName = useVisualGiven ? undefined : mrzMapped.middleName;
    const lastName = visual.surname && visual.surname.length >= 2 ? visual.surname : parsed.surname;

    const dateOfIssue = extractDateOfIssue(ocrText, {
      dateOfBirth: parsed.dateOfBirth,
      passportExpiry: parsed.passportExpiry,
    });

    return {
      firstName,
      middleName,
      lastName,
      passportNumber: parsed.passportNumber,
      dateOfBirth: parsed.dateOfBirth,
      passportExpiry: parsed.passportExpiry,
      dateOfIssue,
      nationalityCode: parsed.nationality,
      issuingCountryCode: parsed.issuingCountry,
      gender: parsed.gender,
      personalNumber: parsed.personalNumber,
      mrzLine1: parsed.rawLine1,
      mrzLine2: parsed.rawLine2,
      confidence: parsed.confidence,
      source: 'mrz',
      warnings,
    };
  }

  warnings.push('MRZ lines not found in OCR output');
  const heuristic = heuristicFromText(ocrText);
  if (heuristic) {
    return heuristic;
  }

  return {
    confidence: 0,
    source: 'none',
    warnings: [...warnings, 'Could not extract passport data — enter details manually'],
  };
}
