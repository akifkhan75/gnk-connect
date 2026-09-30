import type { PassportOcrExtraction } from '@gnk/types';
import { api } from './api';

/**
 * Extracts passport fields (name, passport number, DOB, expiry, nationality, gender) from OCR
 * text by sending it to the API, which parses ICAO 9303 MRZ lines (falling back to heuristics
 * for non-MRZ text).
 *
 * `tesseract.js` isn't a portal dependency yet, so there's no in-browser image-to-text step —
 * callers collect OCR text first (e.g. pasted from another scanner/app) via a "paste text"
 * dialog and pass it here. See `loadTesseract` below for how to add client-side scanning later
 * without changing this function's contract.
 */
export async function extractPassportFromPastedText(
  ocrText: string,
): Promise<PassportOcrExtraction> {
  return api.bookings.passportOcrExtractText(ocrText);
}

/**
 * Attempts to load `tesseract.js` at runtime for client-side image OCR; returns `null` if it
 * isn't installed. `@vite-ignore` stops Rollup from trying to statically resolve/bundle an
 * optional dependency that may not exist in `node_modules`.
 *
 * Not currently used — kept so a future "scan from photo" flow can call this first and fall
 * back to the paste-text dialog when it resolves to `null`.
 */
export async function loadTesseract(): Promise<unknown | null> {
  try {
    // Built from parts (not a literal) so TS doesn't try to resolve types for a package that
    // may not be installed, and so Vite/Rollup doesn't try to statically bundle it.
    const moduleId = ['tesseract', 'js'].join('.');
    return await import(/* @vite-ignore */ moduleId);
  } catch {
    return null;
  }
}
