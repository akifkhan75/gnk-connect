export type PassportGender = 'M' | 'F' | 'X' | 'U';

export interface ParsedPassportMrz {
  readonly documentCode: string;
  readonly issuingCountry: string;
  readonly surname: string;
  readonly givenNames: string;
  readonly passportNumber: string;
  readonly nationality: string;
  readonly dateOfBirth: string;
  readonly gender: PassportGender;
  readonly passportExpiry: string;
  readonly personalNumber?: string;
  readonly rawLine1: string;
  readonly rawLine2: string;
  readonly confidence: number;
}

export interface PassportOcrExtraction {
  readonly firstName?: string;
  readonly middleName?: string;
  readonly lastName?: string;
  readonly passportNumber?: string;
  readonly dateOfBirth?: string;
  readonly passportExpiry?: string;
  readonly dateOfIssue?: string;
  readonly nationalityCode?: string;
  readonly issuingCountryCode?: string;
  readonly gender?: PassportGender;
  readonly personalNumber?: string;
  readonly mrzLine1?: string;
  readonly mrzLine2?: string;
  readonly confidence: number;
  readonly source: 'mrz' | 'heuristic' | 'none';
  readonly warnings: readonly string[];
}
