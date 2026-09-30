/**
 * Removes surname bleed and MRZ filler misreads (K/L/I clusters) from given names.
 */

const VOWELS = /[AEIOUY]/i;

/** OCR often reads MRZ `<` fillers as K, L, or I repeated. */
const MRZ_FILLER_RUN = /[KLIXO]{4,}/gi;

function normalizeToken(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
}

/**
 * Collapse OCR misread chevron runs in MRZ name fields before parsing.
 */
export function normalizeMrzFillerMisreads(field: string): string {
  return field.replace(/[KL]{3,}/gi, '<').replace(/[IXO]{4,}/gi, '<');
}

/**
 * Remove MRZ filler noise from a name string (tokens and glued suffixes).
 */
export function stripOcrNoiseFromNameString(raw: string): string {
  let text = raw.trim().replace(/\s+/g, ' ');

  text = text.replace(/\b[KLIXO]{4,}\b/gi, ' ');
  text = text.replace(/([A-Za-z]{2,})(?:[KLIXO]{4,})+/gi, '$1');
  text = text.replace(/(?:[KLIXO]{4,})+$/gi, ' ');
  text = text.replace(MRZ_FILLER_RUN, ' ');

  return text.replace(/\s+/g, ' ').trim();
}

function isOcrMrzNoiseToken(token: string): boolean {
  const t = normalizeToken(token);
  if (t.length < 4) {
    return false;
  }

  if (VOWELS.test(t)) {
    const withoutTrailingFiller = t.replace(/[KLIXO]{4,}$/g, '');
    if (withoutTrailingFiller.length >= 2 && withoutTrailingFiller.length < t.length) {
      return false;
    }
    return false;
  }

  if (/^[KLIXO]+$/.test(t)) {
    return true;
  }

  if (t.length >= 4 && !VOWELS.test(t)) {
    return true;
  }

  const counts = new Map<string, number>();
  for (const c of t) {
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  const max = Math.max(...counts.values());
  if (max / t.length >= 0.85 && t.length >= 4) {
    return true;
  }

  return false;
}

function cleanNameToken(token: string): string {
  let t = token.trim();
  if (!t) {
    return '';
  }

  t = t.replace(/([A-Za-z]+?)[KLIXO]{4,}$/gi, '$1');
  t = t.replace(/^[KLIXO]{4,}/gi, '');

  if (isOcrMrzNoiseToken(t)) {
    return '';
  }

  return t.trim();
}

/**
 * Strip trailing/leading surname tokens and glued suffixes (e.g. AKIFKHAN → AKIF when surname is KHAN).
 */
export function sanitizeGivenNames(givenNames: string, surname: string): string {
  const cleanedInput = stripOcrNoiseFromNameString(givenNames);
  const sNorm = normalizeToken(surname);

  let tokens = cleanedInput
    .split(' ')
    .map(cleanNameToken)
    .filter((t) => t.length > 0);

  if (tokens.length === 0) {
    return '';
  }

  if (!sNorm) {
    return tokens.join(' ');
  }

  while (tokens.length > 1 && normalizeToken(tokens[0] ?? '') === sNorm) {
    tokens.shift();
  }

  while (tokens.length > 1 && normalizeToken(tokens[tokens.length - 1] ?? '') === sNorm) {
    tokens.pop();
  }

  tokens = tokens.filter((t) => !isOcrMrzNoiseToken(t));

  let joined = tokens.join(' ');
  if (!joined) {
    return '';
  }

  const joinedNorm = joined.toUpperCase().replace(/[^A-Z\s]/g, '');
  if (joinedNorm === sNorm) {
    return '';
  }

  if (sNorm.length >= 2 && joinedNorm.endsWith(sNorm) && joinedNorm.length > sNorm.length) {
    const glued = joined.slice(0, joined.length - surname.trim().length).trim();
    if (glued.length >= 2) {
      joined = glued;
    }
  }

  return stripOcrNoiseFromNameString(joined);
}
