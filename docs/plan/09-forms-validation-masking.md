# 09 — Forms, Validation and Input Masking

## 1. Principles

1. **One schema, two runtimes.** Zod schemas live in `@gnk/validation`. The API uses them as DTOs through `nestjs-zod`, and the UI uses them through `zodResolver`. Messages and error codes match on both sides.
2. **The server is the authority.** Client validation is for UX only. Every rule is re-checked in the API, and cross-entity rules (seats available, quote ownership) run only on the server.
3. **Mask for input, normalise for storage.** The mask shows `0300-1234567`, and the value sent and stored is `+923001234567`. Schemas `transform` to the canonical form.
4. **Validate at the right time:** on blur for the first interaction, then on change. On submit, focus the first invalid field and show an error summary at the top for long forms.
5. **Accessibility:** errors are linked through `aria-describedby`, invalid fields get `aria-invalid`, required markers are visible and announced, and errors don't rely on colour alone.

## 2. Package layout

```
packages/validation/src/
├── primitives.ts     # email, password, phonePK, cnic, ntn, passport, iban, money, names, dates
├── masks.ts          # Maskito options per primitive
├── auth.ts           # login, register (per step), forgot, reset, invite-accept, totp
├── partner.ts        # account profile, documents, team invite
├── booking.ts        # quote request, passenger, booking create, cancel
├── payment.ts        # payment submit, verify, reject, refund
├── pricing.ts        # pricing rule (discriminated by scope), simulate
├── admin.ts          # partner review actions, staff invite, settings
├── query.ts          # list query schemas (pagination, sort allowlists)
└── errors.ts         # error codes → default messages (EN; UR later)
```

## 3. Field rules and masks

| Field | Mask (display) | Canonical value | Rules |
|---|---|---|---|
| **Email** | none | lowercase, trimmed | RFC 5322 practical subset, ≤ 254 chars. Disposable domains blocked on partner register. |
| **Password** | none (show/hide toggle) | as-is | 10–128 chars, not in breached list, not containing email/name. Confirm must match. Strength meter shown. |
| **Mobile (PK)** | `0300-1234567` or `+92 300 1234567` | `+923001234567` (E.164) | Must start with `3`, 10 digits after `+92`, valid operator prefix `30x–34x`. |
| **Landline (PK)** | `(021) 3456 7890` | `+922134567890` | Area code 2–4 digits. Total length validated. |
| **International phone** | libphonenumber-js "as you type" | E.164 | `isValidPhoneNumber` |
| **CNIC** | `#####-#######-#` | `3520212345671` (13 digits) | 13 digits. First digit 1–7 (province code). Last digit parity allowed by gender (odd = male, even = female) as a **soft** warning only. |
| **NTN** | `#######-#` | `73928104` | 7 digits + check digit (8 total). Also accepts the 13-digit CNIC-as-NTN for individuals. |
| **DTS licence no.** | free, uppercased | trimmed | `^[A-Z0-9\-/]{3,30}$` |
| **IATA code** | `########` | 8 digits | optional, exactly 8 digits |
| **Passport no.** | uppercase, no spaces | `AB1234567` | `^[A-Z0-9]{6,9}$`. PK passports: `^[A-Z]{2}\d{7}$` (warning if nationality=PK and it doesn't match). |
| **Passport expiry** | date picker `DD/MM/YYYY` | `YYYY-MM-DD` | future date, and **≥ return date + 6 months** (KSA/UAE rule, configurable) |
| **Date of birth** | date picker | `YYYY-MM-DD` | past date. ADULT ≥ 12y, CHILD 2–11y, INFANT < 2y **on the departure date**. Pax type is derived from DOB, with a mismatch error. |
| **Names (as on passport)** | uppercase transform | trimmed, single spaces | `^[A-Z][A-Z' \-]{0,48}$` (Latin letters only, matching the passport MRZ), 1–50 chars |
| **Nationality** | combobox (ISO 3166) | `PK` | ISO alpha-2 |
| **IBAN (PK)** | `PK## #### #### #### #### ####` | `PK36SCBL0000001123456702` | 24 chars, `^PK\d{2}[A-Z]{4}\d{16}$`, mod-97 checksum |
| **Money (PKR)** | `195,000` with thousands separators, no decimals by default | `"195000.00"` string | ≥ 0, ≤ 99,999,999.99, max 2 decimals. Payment amount ≤ outstanding balance (server). |
| **Percentage** | `5.25 %` | `"5.2500"` | 0–100 (pricing), max 4 decimals |
| **Seats** | stepper | int | 1 ≤ n ≤ min(9, available) |
| **Bank transaction ref** | uppercase | trimmed | 4–40 chars, `^[A-Z0-9\-/]+$`, unique per method (server) |
| **Postal code** | `#####` | 5 digits | optional |
| **OTP / TOTP** | `### ###` 6 boxes, auto-advance, paste support | 6 digits | `^\d{6}$` |
| **File upload** | dropzone | fileId | PDF/JPG/PNG/WEBP, ≤ 15 MB (client pre-check + server sniff). Images compressed client-side to ≤ 2 MB. |
| **Free text** (notes, reasons) | none | trimmed | 0–1000 chars (notes) or 10–500 (reject reasons), with a live counter. Control characters stripped. |

Masking library: **Maskito** (`@maskito/core`, `@maskito/react`, `@maskito/kit` for number and date masks, `@maskito/phone` for international numbers). `<MaskedInput>` in `@gnk/ui` wraps it with RHF `Controller`, so the form state receives the *unmasked* value.

## 4. Example schemas

```ts
// primitives.ts
export const phonePK = z.string()
  .transform(v => v.replace(/[^\d+]/g, ''))
  .transform(v => v.startsWith('03') ? '+92' + v.slice(1) : v.startsWith('92') ? '+' + v : v)
  .refine(v => /^\+923[0-4]\d{8}$/.test(v), { message: 'Enter a valid Pakistani mobile number', params: { code: 'INVALID_PHONE' } });

export const cnic = z.string()
  .transform(v => v.replace(/\D/g, ''))
  .refine(v => /^[1-7]\d{12}$/.test(v), { message: 'CNIC must be 13 digits (e.g. 35202-1234567-1)', params: { code: 'INVALID_CNIC' } });

export const money = z.union([z.string(), z.number()])
  .transform(v => String(v).replace(/,/g, ''))
  .refine(v => /^\d{1,8}(\.\d{1,2})?$/.test(v), { message: 'Enter a valid amount', params: { code: 'INVALID_AMOUNT' } });

// booking.ts
export const passengerSchema = (ctx: { departureDate: Date; returnDate: Date }) => z.object({
  title: z.enum(['MR','MRS','MS','MISS','MSTR']),
  firstName: passportName, lastName: passportName,
  gender: z.enum(['MALE','FEMALE']),
  dateOfBirth: isoDate.refine(d => d < today(), 'Date of birth must be in the past'),
  nationality: iso2,
  passportNumber: passportNo,
  passportExpiry: isoDate,
  type: z.enum(['ADULT','CHILD','INFANT']),
}).superRefine((p, c) => {
  if (p.passportExpiry < addMonths(ctx.returnDate, 6))
    c.addIssue({ path: ['passportExpiry'], code: 'custom', message: 'Passport must be valid for 6 months after return', params: { code: 'PASSPORT_EXPIRES_TOO_SOON' } });
  const derived = paxTypeFromDob(p.dateOfBirth, ctx.departureDate);
  if (derived !== p.type)
    c.addIssue({ path: ['type'], code: 'custom', message: `Passenger is ${derived} on departure date`, params: { code: 'PAX_TYPE_MISMATCH' } });
  if (p.title === 'MSTR' && p.type === 'ADULT')
    c.addIssue({ path: ['title'], code: 'custom', message: 'MSTR is for male children only' });
});

export const createBookingSchema = z.object({
  quoteId: z.string().uuid(),
  passengers: z.array(z.unknown()).min(1).max(9),   // refined per-departure on server
  agentNotes: z.string().trim().max(1000).optional(),
  acceptTerms: z.literal(true),
}).strict();                                         // rejects price/status/accountId injection

// pricing.ts — discriminated union keeps selectors consistent with scope
export const pricingRuleSchema = z.discriminatedUnion('scope', [
  base.extend({ scope: z.literal('DEFAULT') }),
  base.extend({ scope: z.literal('SUPPLIER'), supplierId: uuid }),
  base.extend({ scope: z.literal('PRODUCT'), productId: uuid }),
  base.extend({ scope: z.literal('PARTNER'), accountId: uuid, productType: productType.optional() }),
  base.extend({ scope: z.literal('PARTNER_PRODUCT'), accountId: uuid, productId: uuid }),
  // …
]).superRefine((r, c) => {
  if (r.markupType === 'PERCENTAGE' && Number(r.markupValue) > 100) c.addIssue({ path: ['markupValue'], code: 'custom', message: 'Max 100%' });
  if (r.validFrom && r.validTo && r.validTo <= r.validFrom) c.addIssue({ path: ['validTo'], code: 'custom', message: 'End must be after start' });
});
```

## 5. Form UX components

| Component | Behaviour |
|---|---|
| `<Form>` | RHF provider + zodResolver. `mode: 'onTouched'`. Maps server `422.errors[]` to fields with `setError`. |
| `<FormErrorSummary>` | Appears on submit when there are 2 or more errors, links to each field, and is announced through `role="alert"`. |
| `<SubmitButton>` | Disabled while submitting, shows a spinner, and prevents double submission. It shares the same `Idempotency-Key` across retries of the same attempt. |
| `<Stepper>` | For multi-step forms, each step validates its own sub-schema before advancing. Steps are saved to session or IndexedDB drafts. |
| `<UnsavedChangesGuard>` | Router `useBlocker` prompt when the form is dirty. |
| `<MaskedInput>` | Maskito + RHF, with an optional `inputMode` (numeric/tel/email) for mobile keyboards. |
| `<DateField>` | Typed `DD/MM/YYYY` with a calendar popover, and min/max from the schema context. |
| `<MoneyInput>` | Right-aligned, grouping separators, `PKR` prefix adornment. |
| `<FileDropzone>` | Drag/drop and click, preview, progress bar (presigned upload), retry, remove. Shows allowed types and size. |

## 6. Form inventory (all forms that need this treatment)

**Portal:**
- Login, the 4-step Register wizard, Forgot, Reset, Accept invite, Verify email (resend).
- Onboarding documents.
- Account profile, My profile, Change password.
- Team invite and role change.
- Group filters, Quote (seats), Passenger details (×n), Booking review, Cancel booking (reason).
- Submit payment.
- Ledger date range.

**Admin:**
- Login, TOTP enroll/verify, recovery code.
- Partner review actions (approve/reject/more-info/suspend, each with a reason), Credit limit, Tier assignment, Document verify/reject.
- Booking approve/reject/cancel, Internal notes.
- Payment verify/reject/refund, Record payment.
- Pricing rule create/edit, Simulator, Pricing tier.
- Product publish/content override.
- Supplier settings and credentials.
- Staff invite/edit, Role permissions.
- Settings, Ledger adjustment.

**Website:**
- Inquiry modal, Contact, Corporate RFP, Newsletter, Public group booking inquiry, Visa tracking lookup.
- All of these get the same Zod + masks + Turnstile treatment.
