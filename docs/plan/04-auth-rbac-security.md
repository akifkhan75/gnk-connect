# 04 — Authentication, Authorization and Security

## 1. Identity realms

| | Partner realm (portal) | Staff realm (admin) |
|--|--|--|
| Users table | `PartnerUser` (+ `PartnerMember` → `PartnerAccount`) | `StaffUser` (+ `StaffUserRole` → `Role` → `Permission`) |
| Signup | Self-service "Become a Partner" | **Invite only** (by SUPER_ADMIN). No public signup. |
| Login | email + password | email + password + **TOTP (mandatory)** |
| JWT `aud` | `gnk-portal` | `gnk-admin` |
| Refresh cookie | `gnk_prt_rt`, `Path=/api/v1/auth/partner`, `Domain=agents.…` | `gnk_stf_rt`, `Path=/api/v1/auth/staff`, `Domain=admin.…` |
| Access TTL / refresh TTL | 15 min / 30 days sliding (7 days idle) | 10 min / 12 h absolute (1 h idle) |
| API route prefix | `/api/v1/partner/**` | `/api/v1/admin/**` |

The `PartnerJwtGuard` accepts only `aud=gnk-portal`. The `StaffJwtGuard` accepts only `aud=gnk-admin`. The route prefix decides which guard applies, so partner tokens can never reach admin routes.

## 2. Token model

- **Access token:** a JWT (HS256 with a 256-bit secret, or EdDSA later) with claims `{ sub, aud, iss:'gnk-connect-api', sid, acc?, iat, exp }`. It carries **no role, status or permissions**. Those are loaded per request from Redis (a 60-second cache keyed by `sid`), backed by the DB, and the cache is invalidated when an admin changes status or roles. Suspension then takes effect within seconds (fixes AUTH-08).
- The frontend keeps the access token **in memory only** (fixes AUTH-09).
- **Refresh token:** 256-bit random, sent only as an `httpOnly; Secure; SameSite=Strict` cookie, and stored as a SHA-256 hash in `Session.refreshHash`.
  - Every refresh **rotates** the token (new token, same `familyId`).
  - Presenting an already-rotated token counts as **reuse**: the whole family is revoked, the user is emailed, and an audit entry is written.
- **CSRF:** the refresh and logout endpoints are the only cookie-authenticated routes. They require `SameSite=Strict`, an `Origin` header matching the allowlist, and a custom header `X-GNK-CSRF: 1`, which forces a preflight.
- **Logout** revokes the session. **"Log out everywhere"** revokes all of the user's sessions. Profile → Security lists active sessions (device, IP, last used) and lets the user revoke any of them.

## 3. Flows

### 3.1 Partner registration (doc §1, "Become a Partner")

```
Step 1  Account type      AGENCY | INDIVIDUAL
Step 2  Business info     AGENCY: legal name, trade name, DTS licence no., NTN, IATA (opt), city, address, office phone
                          INDIVIDUAL: full name, CNIC, city, address
Step 3  Primary contact   full name, mobile (+92), email, password (+ confirm), accept T&Cs
        → POST /auth/partner/register  → account DRAFT, user ACTIVE (email unverified)
        → email verification link (24 h, single use)
Step 4  Documents         AGENCY: DTS licence, NTN cert (req), IATA cert (opt)
                          INDIVIDUAL: CNIC front + back (req)
        → POST /partner/account/submit → status SUBMITTED
Step 5  Pending screen    status tracker; can edit & resubmit if MORE_INFO_REQUIRED
Admin   UNDER_REVIEW → APPROVED | REJECTED(reason) | MORE_INFO_REQUIRED(note)
```

- Registration always responds `202 Accepted` with the same message ("Check your email"), whether or not the email already exists. If the email is already registered, the existing owner receives a "someone tried to register with your email" email instead (fixes AUTH-12).
- The user can log in before verifying their email, but can't submit for review until the email is verified.
- **Until an account is APPROVED**, the portal shows only the Dashboard (status tracker), Profile and Documents. Group listings show destination and date but **no prices**, and booking is disabled. This matches the doc's "until approved, they shouldn't be able to submit bookings", and it's enforced by `@RequireAccountStatus('APPROVED')` on the API.

### 3.2 Login

1. `POST /auth/{realm}/login {email, password}` (staff realm also requires `totp`, or goes through a two-step challenge).
2. Always run argon2 verify, even when the user doesn't exist (against a dummy hash), so response timing doesn't reveal which emails exist.
3. After 5 failed attempts per account in 15 minutes, lock the account for 15 minutes with exponential growth and send an email. IP-level throttling is handled separately (§5).
4. On success, create a `Session`, set the refresh cookie, return `{ accessToken, user, memberships[] }`.
5. A partner user who belongs to more than one account picks one. The access token then carries `acc` (the active account ID).

### 3.3 Password reset

`POST /auth/{realm}/forgot` always returns 202. The reset token is valid for 30 minutes and single use. Resetting a password revokes all of the user's sessions.

### 3.4 Password policy

- Minimum 10 characters, maximum 128.
- Rejected if it appears in the top-100k breached list (bundled), or if it contains the email or name.
- No composition rules. A strength meter (zxcvbn-ts) runs on the frontend.

### 3.5 Staff 2FA

TOTP (RFC 6238) is enrolled on first login and can't be skipped. The user gets 10 single-use recovery codes, stored hashed. SUPER_ADMIN can reset another staff member's 2FA, and that action is audited.

## 4. RBAC

### 4.1 Portal: basic role set

Every partner account has exactly one OWNER. An individual agent is the OWNER of an INDIVIDUAL account.

| Permission | OWNER | MANAGER | STAFF | ACCOUNTANT |
|---|:-:|:-:|:-:|:-:|
| View dashboard | ✅ | ✅ | ✅ | ✅ |
| Browse groups & prices (account APPROVED) | ✅ | ✅ | ✅ | ✅ |
| Create booking request | ✅ | ✅ | ✅ | ❌ |
| View bookings | all | all | **own only** | all |
| Cancel booking request (before approval) | ✅ | ✅ | own | ❌ |
| Submit payment / upload proof | ✅ | ✅ | ❌ | ✅ |
| View ledger, invoices, statements | ✅ | ✅ | ❌ | ✅ |
| Manage team (invite, change role, remove) | ✅ | ✅ (not OWNER/MANAGER) | ❌ | ❌ |
| Edit account profile & KYC docs | ✅ | ❌ | ❌ | ❌ |
| Transfer ownership / close account | ✅ | ❌ | ❌ | ❌ |

INDIVIDUAL accounts can't invite members until upgraded to AGENCY. That keeps the model "capable of adding multiple users later", as the doc asks.

### 4.2 Admin: staff roles → permissions

| Permission key | SUPER_ADMIN | OPERATIONS | FINANCE | PARTNER_MGR | PRICING_MGR | SUPPORT (read) |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| `dashboard:view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `partners:read` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `partners:review` (approve/reject/more-info) | ✅ | | | ✅ | | |
| `partners:suspend` | ✅ | | | ✅ | | |
| `partners:credit_limit` | ✅ | | ✅ | | | |
| `bookings:read` | ✅ | ✅ | ✅ | ✅ | | ✅ |
| `bookings:approve` / `bookings:reject` | ✅ | ✅ | | | | |
| `bookings:push_supplier` | ✅ | ✅ | | | | |
| `bookings:cancel` | ✅ | ✅ | | | | |
| `bookings:view_supplier_net` | ✅ | ✅ | ✅ | | ✅ | |
| `payments:read` | ✅ | ✅ | ✅ | | | ✅ |
| `payments:verify` / `payments:refund` | ✅ | | ✅ | | | |
| `ledger:read` / `ledger:adjust` | ✅ / ✅ | | ✅ / ✅ | | | |
| `pricing:read` / `pricing:write` | ✅ / ✅ | ✅ / | ✅ / | | ✅ / ✅ | |
| `catalog:read` / `catalog:publish` | ✅ / ✅ | ✅ / ✅ | | | ✅ / | ✅ / |
| `suppliers:read` / `suppliers:manage` / `suppliers:sync` | ✅ / ✅ / ✅ | ✅ / / ✅ | | | | |
| `staff:manage` / `roles:manage` | ✅ | | | | | |
| `audit:read` | ✅ | | ✅ | | | |
| `settings:manage` | ✅ | | | | | |

- **Separation of duties:** the same staff user can't both approve a booking and verify its payment, when the `settings.enforce_sod` setting is on.
- **Four-eyes for money:** ledger adjustments above a threshold need a second approver.

### 4.3 Enforcement

```ts
// Global default-deny: every route requires auth unless @Public()
{ provide: APP_GUARD, useClass: RealmAuthGuard }     // picks partner/staff guard by route prefix
{ provide: APP_GUARD, useClass: PermissionsGuard }   // @RequirePermission('bookings:approve')
{ provide: APP_GUARD, useClass: ThrottlerGuard }

@Controller('admin/bookings')
export class AdminBookingsController {
  @Post(':id/approve')
  @RequirePermission('bookings:approve')
  approve(@Param('id', ParseUUIDPipe) id: string, @Actor() actor: StaffActor, @Body() dto: ApproveBookingDto) {}
}

@Controller('partner/bookings')
export class PartnerBookingsController {
  @Get(':id')
  @RequirePartnerRole('OWNER','MANAGER','STAFF','ACCOUNTANT')
  get(@Param('id', ParseUUIDPipe) id: string, @Actor() actor: PartnerActor) {
    return this.bookings.getForPartner(id, actor);   // WHERE id=? AND accountId = actor.accountId
  }                                                  //   (+ createdByUserId = actor.userId if STAFF)
}
```

- **Tenant scoping** lives in the repository layer. Partner-facing methods take a `PartnerActor` and always add the `accountId` filter. A lint rule and a unit test forbid calling `prisma.booking.findUnique` from partner controllers directly.
- **Response shaping:** partner DTOs are separate classes that **don't have** `supplierNet*`, `markup*`, `supplierBookingRef` or `internalNotes` fields. An e2e test asserts that no partner endpoint's JSON contains those keys (fixes BIZ-02).
- **Frontend:** a route `loader` checks the session and permission before rendering. `<Can permission="bookings:approve">` hides controls. Hiding is only UX: the API is the authority.

## 5. Rate limiting

Implemented with `@nestjs/throttler` using Redis storage, so limits are shared across replicas. The key is `ip` for anonymous routes and `userId`/`accountId` for authenticated routes.

| Tier | Routes | Limit | Key |
|------|--------|-------|-----|
| `global-anon` | all public | 60 req / min | IP |
| `global-auth` | all authenticated | 300 req / min | user |
| `login` | `POST /auth/*/login` | 5 / 15 min **and** 20 / hour | IP + email (both) |
| `register` | `POST /auth/partner/register` | 3 / hour | IP |
| `forgot` | `POST /auth/*/forgot`, resend-verification | 3 / hour | email, 10 / hour per IP |
| `refresh` | `POST /auth/*/refresh` | 30 / min | session |
| `totp` | 2FA verify | 5 / 5 min | user (then lock) |
| `quote` | `POST /partner/pricing/quotes` | 60 / min | account |
| `booking-create` | `POST /partner/bookings` | 10 / min, 100 / day | account |
| `upload` | file uploads | 20 / hour | user, max 15 MB each |
| `supplier-sync` | `POST /admin/suppliers/:id/sync` | 1 / 5 min | supplier (plus a queue lock) |
| `export` | CSV/PDF exports | 10 / hour | user |

- Throttled responses return `429` with a `Retry-After` header and the standard error envelope (code `RATE_LIMITED`).
- **Edge limiting in nginx:** `limit_req_zone $binary_remote_addr zone=api:10m rate=20r/s; burst=40 nodelay`, and a stricter zone for `/api/v1/auth/`.
- **Outbound limits** protect AirDesk: a token bucket per supplier in the worker (for example, 5 req/s), plus a circuit breaker that opens after 5 consecutive failures for 60 seconds.
- **Bot defence on public forms** (register, forgot, public inquiry): Cloudflare Turnstile, verified server-side.

## 6. Input and transport security

- Global `ZodValidationPipe`: strips unknown keys, validates everything, and returns `422` with field errors. Every path param is a UUID, parsed with `ParseUUIDPipe`.
- `helmet()` sets these headers:
  - CSP for the API: `default-src 'none'`.
  - HSTS: 1 year, `includeSubDomains`.
  - `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
- CORS: an explicit allowlist from `CORS_ORIGINS` with `credentials: true`, restricted to the needed methods and headers.
- Body limit: 100 kB JSON. Multipart is allowed only on upload routes, with multer `limits: { fileSize: 15MB, files: 1 }` enforced **while streaming**.
- The frontend nginx configs set a CSP per app. It's strict `script-src 'self'` plus the Turnstile and Sentry hosts. `frame-ancestors 'none'`, and the portal and admin send `X-Frame-Options DENY`.
- Prisma queries are parameterised. Any `$queryRaw` must use tagged templates, and ESLint enforces this.
- Output: React escapes output by default. `dangerouslySetInnerHTML` is banned by lint.

## 7. File uploads

1. The client asks the API for an upload slot: `POST /partner/files {purpose, filename, size, mime}`. The API checks role and quota, then returns a presigned PUT URL (5 min) and a `fileId`.
2. The client uploads directly to object storage.
3. The client calls `POST /partner/files/:id/complete`. The API fetches the head bytes, **sniffs the magic bytes** (`file-type`), checks the allowlist (PDF/JPEG/PNG/WEBP) and size, computes the SHA-256, and optionally queues a ClamAV scan. On failure the object is deleted.
4. Downloads go through `GET /partner/files/:id`: an authz check (same account, or staff with permission), then a 302 redirect to a 5-minute presigned GET URL with `Content-Disposition: attachment` for PDFs.
5. Uploaded files are never publicly listable or cacheable. The response carries `Cache-Control: private, no-store`.

Simpler fallback if object storage isn't available at first: stream through the API into a private volume, with the same sniffing and authz steps.

## 8. Secrets and configuration

- `config/env.ts` validates the environment with Zod at boot. The API **refuses to start** if `JWT_SECRET` is under 32 bytes, if any of `PII_ENCRYPTION_KEY`, `SUPPLIER_CREDENTIALS_KEY`, `DATABASE_URL` or `REDIS_URL` is missing, or if `SUPPLIER_MODE=mock` in production.
- There are no default secrets anywhere: not in `docker-compose.yml`, not in `.env.example` (placeholders only), not in code.
- Rotate the secrets that are already committed (the JWT secret and DB password in compose). Treat them as leaked.
- The Gemini key moves server-side (`POST /public/ai/chat` proxy with a rate limit), and `VITE_GEMINI_API_KEY` is removed (fixes FE-03).
- Secret scanning: gitleaks in pre-commit and CI.

## 9. Audit and monitoring

- Every state-changing admin action, every partner booking or payment action, every auth event (login success and failure, lockout, reset, 2FA change, session revoke) and every supplier push writes to `AuditLog` with the request ID, IP and user agent.
- Alerts (Sentry and log-based) fire on: refresh-token reuse, more than 20 login failures per minute globally, a supplier circuit opening, a ledger imbalance, and any 5xx rate above 1%.

## 10. Security test checklist (gate before go-live)

- [ ] Every route in the OpenAPI spec is either `@Public()` or has a permission. A CI script diffs the spec against an allowlist.
- [ ] IDOR suite: partner A can't read, update or download partner B's bookings, payments, files, ledger or team, for every `:id` route.
- [ ] Partner token → admin route returns 401. Staff token without the permission returns 403.
- [ ] No partner response contains the `supplierNet`, `markup` or `supplierBookingRef` keys.
- [ ] Brute force: the 6th login returns 429 or lockout. Refresh reuse revokes the family.
- [ ] Uploads: a renamed `.exe`→`.pdf` is rejected, a 16 MB file is rejected mid-stream, and path traversal in filenames is neutralised.
- [ ] Mass assignment: sending `status`, `accountId` or `creditLimit` in partner bodies is stripped or rejected.
- [ ] Booking tampering: a modified `totalPrice` is ignored, and an expired or foreign `quoteId` is rejected.
- [ ] Idempotency: the same `Idempotency-Key` returns the same booking, and a double push to the supplier makes one call.
- [ ] Headers: securityheaders.com grade A on all three apps.
- [ ] OWASP ZAP baseline scan is clean. Dependencies pass `npm audit --omit=dev` with no high-severity issues.
