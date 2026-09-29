# 05 — API Standards

## 1. Conventions

| Topic | Standard |
|-------|----------|
| Base | `https://api.gnkconnect.pk/api/v1` |
| Namespaces | `/auth/partner/*`, `/auth/staff/*`, `/partner/*` (partner realm), `/admin/*` (staff realm), `/public/*` (no auth) |
| Resources | Plural kebab-case nouns: `/partner/bookings`, `/admin/pricing-rules` |
| Actions | Sub-resource POST for state transitions: `POST /admin/bookings/:id/approve`, never `PATCH {status}` |
| IDs | UUIDs in paths. Human references (`GNK-2026-000124`) are searchable with `?q=`. |
| JSON | camelCase keys. ISO-8601 UTC timestamps. Dates `YYYY-MM-DD`. **Money as strings** (`"195000.00"`) with a `currency` field. |
| Versioning | URI major version (`/v1`). Additive changes are non-breaking. Removed fields go through `Deprecation` and `Sunset` headers first. |
| Status codes | 200 read/update · 201 create (+`Location`) · 202 async accepted · 204 no body · 400 malformed · 401 unauthenticated · 403 forbidden · 404 not found (also used for other tenants' resources) · 409 conflict/state · 412 version mismatch · 422 validation · 429 throttled · 5xx server |

## 2. Error envelope (RFC 9457 Problem Details)

```json
{
  "type": "https://docs.gnkconnect.pk/errors/validation",
  "title": "Validation failed",
  "status": 422,
  "code": "VALIDATION_FAILED",
  "detail": "2 fields are invalid",
  "requestId": "01J9…",
  "errors": [
    { "path": "passengers.0.passportExpiry", "code": "PASSPORT_EXPIRES_TOO_SOON", "message": "Passport must be valid 6 months after return date" },
    { "path": "contact.phone", "code": "INVALID_PHONE", "message": "Enter a valid Pakistani mobile number" }
  ]
}
```

- A global `AllExceptionsFilter` maps Zod, Prisma (`P2002`→409, `P2025`→404) and domain errors (`BookingStateError`→409) to this envelope.
- 5xx responses never include stack traces or internal messages. They return a `requestId` so support can look the error up.
- The error `code` catalogue lives in `@gnk/types/errors.ts` and is shared with the frontend, which maps codes to friendly messages and to field errors in react-hook-form.

## 3. Lists: pagination, filters, sorting

```
GET /admin/bookings?page=1&pageSize=25&sort=-createdAt&status=PENDING_APPROVAL,APPROVED
                   &accountId=…&departureFrom=2026-10-01&departureTo=2026-10-31&q=GNK-2026
```

```json
{ "data": [ … ], "meta": { "page": 1, "pageSize": 25, "total": 312, "totalPages": 13 } }
```

- `pageSize` defaults to 25, maximum 100. Large feeds (audit log, ledger) use cursor pagination (`?cursor=…&limit=50`, `meta.nextCursor`).
- Sort fields and filter fields are **allowlisted per endpoint** in the Zod query schema. Unknown fields return 422.
- Exports (`/export.csv`) run as an async job when there are more than 5,000 rows, and the user is notified when the download is ready.

## 4. Idempotency and concurrency

- `Idempotency-Key` (UUID) is **required** on `POST /partner/bookings`, `POST /partner/payments`, and `POST /admin/bookings/:id/push`.
  - Keys are stored for 24 hours with a hash of the request.
  - The same key with the same body replays the stored response. The same key with a different body returns 422 `IDEMPOTENCY_KEY_REUSED`.
- **Optimistic locking** on mutable aggregates: responses include `ETag: W/"<version>"`. `PATCH`/`POST` state changes require `If-Match` and return 412 on mismatch. This stops two admins from approving and rejecting the same booking at the same time.
- **Seat inventory:** booking creation runs in a transaction with `SELECT … FOR UPDATE` on the departure row and checks `supplierAvailable - heldSeats >= seats`.

## 5. Booking state machine

Encoded once, in `bookings/state-machine.ts`, and used by the API and the UI (which shows only the allowed actions):

```
DRAFT ─submit─▶ PENDING_APPROVAL ─approve─▶ APPROVED ─push─▶ SUBMITTED_TO_SUPPLIER
   │                  │  └─reject─▶ REJECTED        │             │
   │                  └─cancel(agent)─▶ CANCELLED   │             ├─ack─▶ SUPPLIER_PENDING ─confirm─▶ CONFIRMED ─travel date passed─▶ COMPLETED
   │                                                │             └─fail─▶ SUPPLIER_FAILED ─retry─▶ SUBMITTED_TO_SUPPLIER
   └─(hold expired)─▶ EXPIRED                       └─cancel─▶ CANCELLED           CONFIRMED ─request cancel─▶ CANCELLATION_REQUESTED ─▶ CANCELLED
```

| Transition guard | Rule |
|---|---|
| `push` | status `APPROVED` **and** (`paymentState = PAID` **or** the account has available credit ≥ total, when credit is enabled) |
| `approve` | seats still available. The quote price is still honoured, or the admin accepts a repricing. |
| `cancel` by agent | only while `PENDING_APPROVAL` |
| Every transition | writes a `BookingStatusEvent`, an `AuditLog` entry and a notification |

Supplier status mapping lives in each adapter (`mapStatus`). The AirDesk defaults are below. **Confirm them against the AirDesk API docs.**

| AirDesk | GNK |
|---|---|
| `PENDING`, `ON_REQUEST` | `SUPPLIER_PENDING` |
| `CONFIRMED`, `TICKETED` | `CONFIRMED` |
| `REJECTED`, `FAILED` | `SUPPLIER_FAILED` |
| `CANCELLED` | `CANCELLED` |
| anything else | `SUPPLIER_PENDING`, plus an alert to OPS |

## 6. Endpoint map (v1)

### Auth
```
POST /auth/partner/register | /login | /refresh | /logout | /logout-all | /forgot | /reset | /verify-email | /resend-verification
POST /auth/staff/login | /login/totp | /refresh | /logout | /forgot | /reset | /totp/enroll | /totp/confirm
GET  /auth/{realm}/me          GET/DELETE /auth/{realm}/sessions[/:id]
```

### Partner (portal)
```
GET/PATCH  /partner/account                 POST /partner/account/submit
GET/POST   /partner/account/documents       DELETE /partner/account/documents/:id (only while DRAFT/MORE_INFO)
GET/POST   /partner/team                    PATCH/DELETE /partner/team/:memberId     POST /partner/team/invites
GET        /partner/dashboard               (counts, balance, credit, upcoming departures, recent activity)
GET        /partner/groups                  GET /partner/groups/:productId           (selling prices only)
POST       /partner/pricing/quotes          (departureId, seats) → quote
GET/POST   /partner/bookings                GET /partner/bookings/:id                POST /partner/bookings/:id/cancel
GET        /partner/bookings/:id/voucher.pdf  (CONFIRMED only)
GET/POST   /partner/payments                GET /partner/payments/:id
GET        /partner/ledger                  GET /partner/ledger/statement.pdf?from&to
GET        /partner/invoices                GET /partner/invoices/:id.pdf
POST       /partner/files                   POST /partner/files/:id/complete         GET /partner/files/:id
GET        /partner/notifications           POST /partner/notifications/read
GET        /partner/payment-methods         (enabled methods + GNK bank details)
```

### Admin
```
GET  /admin/dashboard/summary | /timeseries?metric=bookings|revenue|margin&range=30d
GET  /admin/partners                        GET /admin/partners/:id
POST /admin/partners/:id/start-review | /approve | /reject | /request-info | /suspend | /reactivate
PATCH /admin/partners/:id/credit-limit | /pricing-tier
POST /admin/partners/:id/documents/:docId/verify | /reject
GET  /admin/bookings                        GET /admin/bookings/:id
POST /admin/bookings/:id/approve | /reject | /push | /retry-push | /cancel | /sync-status
PATCH /admin/bookings/:id/internal-notes
GET  /admin/payments                        POST /admin/payments/:id/verify | /reject | /refund
POST /admin/payments                        (record cash/bank payment on behalf of partner)
GET  /admin/ledger/accounts/:id             POST /admin/ledger/adjustments
GET/POST /admin/pricing-rules               GET/PATCH/DELETE /admin/pricing-rules/:id
POST /admin/pricing/simulate                (net, departure, account → full breakdown)
GET/POST /admin/pricing-tiers
GET  /admin/catalog/products                PATCH /admin/catalog/products/:id (publish, feature, content override)
GET  /admin/suppliers                       GET/PATCH /admin/suppliers/:id           POST /admin/suppliers/:id/sync | /test-connection
GET  /admin/suppliers/:id/calls             (SupplierCallLog)
GET/POST /admin/staff                       PATCH /admin/staff/:id                   POST /admin/staff/:id/reset-2fa | /disable
GET  /admin/roles                           PATCH /admin/roles/:id/permissions (SUPER_ADMIN)
GET  /admin/audit-log
GET/PATCH /admin/settings
```

### Public (website)
```
GET  /public/groups                (published products, retail "from" price computed by a public pricing rule)
POST /public/inquiries             (Turnstile-protected)
POST /public/ai/chat               (Gemini proxy, rate limited)
GET  /health/live | /health/ready  (ready = DB + Redis)
```

## 7. OpenAPI and typed client

- The OpenAPI 3.1 document is generated from controllers and Zod DTOs (`nestjs-zod` + `@nestjs/swagger`), written to `apps/api/openapi.json` on build, and checked into CI.
- `packages/api-client` is generated with **orval**: typed fetchers plus TanStack Query hooks. They share a fetch wrapper that injects the access token, retries once after refreshing on 401, and parses the problem-details envelope.
- CI fails if the generated client is out of date (`git diff --exit-code`).
- Swagger UI is only available in non-production environments, behind staff auth.

## 8. Code standards (API)

- `strict: true` in every tsconfig, including the API (fixes API-11).
- Module layout: `controller` (HTTP only) → `service` (use cases, transactions) → `repository` (Prisma, tenant scoping) → `domain` (pure functions: pricing, state machine).
- Pricing and the state machine are pure and fully unit-tested (target 100% branch coverage).
- ESLint (typescript-eslint strict and stylistic), Prettier, `eslint-plugin-security`, and a custom rule that bans `prisma.*` imports in controllers.
- Conventional Commits, PR template with a security checklist, CODEOWNERS for `auth/`, `access/`, `pricing/`, `ledger/`.
- Tests:
  - Unit tests with Vitest.
  - Integration tests with Supertest and Testcontainers (real Postgres and Redis).
  - Contract tests for the AirDesk adapter against recorded fixtures.
  - E2E tests with Playwright across portal and admin.
- Logging: pino JSON with `requestId`, `userId`, `accountId`. Redact `password`, `authorization`, `cookie`, `passport*`, `cnic`.
