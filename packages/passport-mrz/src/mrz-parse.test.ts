import assert from 'node:assert/strict';
import test from 'node:test';

import { extractPassportFromOcrText, parseTd3Mrz, splitMrzNameField } from './index';
import { sanitizeGivenNames } from './name-sanitize';

test('parseTd3Mrz extracts fields from TD3 sample', () => {
  const line1 = 'P<PAKKHAN<<AKIF<<<<<<<<<<<<<<<<<<<<<<<<<<<';
  const line2 = 'AB1234567PAK8501011M3001012<<<<<<<<<<<<<<<6';

  const parsed = parseTd3Mrz(line1, line2);
  assert.ok(parsed);
  assert.equal(parsed.surname, 'KHAN');
  assert.equal(parsed.givenNames, 'AKIF');
  assert.equal(parsed.passportNumber, 'AB1234567');
  assert.equal(parsed.nationality, 'PAK');
  assert.equal(parsed.dateOfBirth, '1985-01-01');
  assert.equal(parsed.gender, 'M');
  assert.equal(parsed.passportExpiry, '2030-01-01');
  assert.ok(parsed.confidence >= 0.8);
});

test('splitMrzNameField handles compound surnames and multiple given names', () => {
  const compound = splitMrzNameField('AL<KHAN<<MUHAMMAD<AKIF');
  assert.equal(compound.surname, 'AL KHAN');
  assert.equal(compound.givenNames, 'MUHAMMAD AKIF');

  const singleChevron = splitMrzNameField('KHAN<AKIF');
  assert.equal(singleChevron.surname, 'KHAN');
  assert.equal(singleChevron.givenNames, 'AKIF');

  const ocrDroppedChevron = splitMrzNameField('KHAN<AKIF<<<<<<<<<<<<<<<<<<<<<<<<');
  assert.equal(ocrDroppedChevron.surname, 'KHAN');
  assert.equal(ocrDroppedChevron.givenNames, 'AKIF');
});

test('extractPassportFromOcrText parses date of issue from visual zone', () => {
  const ocrText = `
    DATE OF ISSUE 15/03/2018
    P<PAKKHAN<<AKIF<<<<<<<<<<<<<<<<<<<<<<<<<<<
    AB1234567PAK8501011M3001012<<<<<<<<<<<<<<<6
  `;

  const result = extractPassportFromOcrText(ocrText);
  assert.equal(result.dateOfIssue, '2018-03-15');
  assert.equal(result.firstName, 'AKIF');
});

test('extractPassportFromOcrText infers date of issue between MRZ DOB and expiry', () => {
  const ocrText = `
    15/03/2018
    P<PAKKHAN<<AKIF<<<<<<<<<<<<<<<<<<<<<<<<<<<
    AB1234567PAK8501011M3001012<<<<<<<<<<<<<<<6
  `;

  const result = extractPassportFromOcrText(ocrText);
  assert.equal(result.dateOfIssue, '2018-03-15');
});

test('extractPassportFromOcrText prefers visual given name when MRZ is wrong', () => {
  const ocrText = `
    SURNAME KHAN
    GIVEN NAMES MUHAMMAD AKIF
    P<PAKKHAN<<AKIF<<<<<<<<<<<<<<<<<<<<<<<<<<<
    AB1234567PAK8501011M3001012<<<<<<<<<<<<<<<6
  `;

  const result = extractPassportFromOcrText(ocrText);
  assert.equal(result.firstName, 'MUHAMMAD AKIF');
  assert.equal(result.lastName, 'KHAN');
});

test('parseTd3Mrz handles OCR line1 with single chevron between names', () => {
  const line1 = 'P<PAKKHAN<AKIF<<<<<<<<<<<<<<<<<<<<<<<<<<<<';
  const line2 = 'AB1234567PAK8501011M3001012<<<<<<<<<<<<<<<6';
  const parsed = parseTd3Mrz(line1, line2);
  assert.ok(parsed);
  assert.equal(parsed.surname, 'KHAN');
  assert.equal(parsed.givenNames, 'AKIF');
});

test('splitMrzNameField strips surname suffix glued to given (OCR bleed)', () => {
  const glued = splitMrzNameField('KHAN<AKIFKHAN<<<<<<<<<<<<<<<<<<<<<<<<');
  assert.equal(glued.surname, 'KHAN');
  assert.equal(glued.givenNames, 'AKIF');

  const doubleWithBleed = splitMrzNameField('KHAN<<AKIF KHAN<<<<<<<<<<<<<<<<<<<<<<');
  assert.equal(doubleWithBleed.surname, 'KHAN');
  assert.equal(doubleWithBleed.givenNames, 'AKIF');
});

test('sanitizeGivenNames removes MRZ filler misread as K/L clusters', () => {
  assert.equal(sanitizeGivenNames('TAUSEEF UR KLLLLLLLLLLLLLLLLLKL', 'MALIK'), 'TAUSEEF UR');
  assert.equal(sanitizeGivenNames('TAUSEEF URKLLLLLLLLLLLLLLLLLKL', 'MALIK'), 'TAUSEEF UR');
  assert.equal(
    splitMrzNameField('MALIK<<TAUSEEF<UR<<<<<<<<<<<<<<<<<<<<<<<<<<').givenNames,
    'TAUSEEF UR',
  );
});

test('extractPassportFromOcrText strips K/L filler noise from given names', () => {
  const ocrText = `
    GIVEN NAMES TAUSEEF UR KLLLLLLLLLLLLLLLLLKL
    SURNAME MALIK
    P<MALIK<<TAUSEEF<UR<<<<<<<<<<<<<<<<<<<<<<<<
    AB1234567PAK9001011M3001012<<<<<<<<<<<<<<<6
  `;

  const result = extractPassportFromOcrText(ocrText);
  assert.equal(result.firstName, 'TAUSEEF UR');
  assert.equal(result.lastName, 'MALIK');
});

test('extractPassportFromOcrText does not append surname to given name', () => {
  const ocrText = `
    GIVEN NAMES AKIF
    SURNAME KHAN
    P<PAKKHAN<<AKIF<<<<<<<<<<<<<<<<<<<<<<<<<<<
    AB1234567PAK8501011M3001012<<<<<<<<<<<<<<<6
  `;

  const result = extractPassportFromOcrText(ocrText);
  assert.equal(result.firstName, 'AKIF');
  assert.equal(result.lastName, 'KHAN');
});

test('extractPassportFromOcrText finds MRZ in noisy OCR blob', () => {
  const ocrText = `
    ISLAMIC REPUBLIC OF PAKISTAN
    P<PAKKHAN<<AKIF<<<<<<<<<<<<<<<<<<<<<<<<<<<
    AB1234567PAK8501011M3001012<<<<<<<<<<<<<<<6
  `;

  const result = extractPassportFromOcrText(ocrText);
  assert.equal(result.source, 'mrz');
  assert.equal(result.lastName, 'KHAN');
  assert.equal(result.firstName, 'AKIF');
  assert.equal(result.passportNumber, 'AB1234567');
  assert.equal(result.nationalityCode, 'PAK');
  assert.ok((result.confidence ?? 0) > 0.5);
});
