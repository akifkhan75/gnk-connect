# 02 — Target Architecture

## 1. System view

```
                           GNK CONNECT
 ┌───────────────┐   ┌──────────────────┐   ┌──────────────────┐
 │ apps/website  │   │  apps/portal     │   │  apps/admin      │
 │ public site   │   │  Agent portal    │   │  GNK staff       │
 │ gnkconnect.pk │   │  agents.gnk…     │   │  admin.gnk…      │
 └──────┬────────┘   └────────┬─────────┘   └────────┬─────────┘
        │  public API         │ agent realm           │ staff realm (+2FA)
        └─────────────────────┼───────────────────────┘
                              ▼
                   ┌─────────────────────┐        ┌───────────┐
                   │  apps/api (NestJS)  │◀──────▶│ Redis     │ cache, rate-limit,
                   │  /api/v1            │        │           │ sessions, BullMQ
                   └──────────┬──────────┘        └───────────┘
                              │ Prisma                 ▲
                              ▼                        │ jobs
                   ┌─────────────────────┐   ┌─────────┴─────────┐
                   │ PostgreSQL 16       │   │ apps/worker       │ supplier sync,
                   └─────────────────────┘   │ (same codebase)   │ booking push, status
                                             └─────────┬─────────┘ poll, emails
                                                       ▼
                                      Supplier adapters (packages/suppliers)
                                      AirDesk │ Hotel API │ Umrah │ …
                              Object storage (S3-compatible, private): KYC, payment proofs, invoices
```

**Domains (subdomain per app is recommended):** `gnkconnect.pk` (website), `agents.gnkconnect.pk` (portal), `admin.gnkconnect.pk` (admin), `api.gnkconnect.pk`. With separate origins, cookies and CSP are scoped per app, and the admin can sit behind an IP allowlist or VPN later. If you need a single domain, use path-based routing (`/agent`, `/admin`) through nginx, with each served by its own build.

## 2. Monorepo layout

```
gnk-connect/
├── apps/
│   ├── website/            # public site (moved from repo root, design kept)
│   ├── portal/             # agent portal SPA (Vite + React 19)
│   ├── admin/              # admin console SPA (Vite + React 19)
│   ├── api/                # NestJS HTTP API
│   │   ├── prisma/         # schema.prisma, migrations/, seed.ts
│   │   └── src/
│   │       ├── main.ts / app.module.ts
│   │       ├── config/             # zod-validated env
│   │       ├── common/             # filters, interceptors, pipes, decorators, pagination
│   │       ├── infra/              # prisma, redis, queue, storage, mailer, crypto
│   │       └── modules/
│   │           ├── identity/       # agent-auth, staff-auth, sessions, 2FA, password reset
│   │           ├── access/         # roles, permissions, guards, policies
│   │           ├── partners/       # partner accounts, members, invites, KYC documents
│   │           ├── staff/          # staff users admin
│   │           ├── suppliers/      # supplier registry, credentials, sync orchestration
│   │           ├── catalog/        # products, departures, availability (supplier-agnostic)
│   │           ├── pricing/        # rules engine, quotes, audit
│   │           ├── bookings/       # booking engine, state machine, passengers
│   │           ├── payments/       # payment records, proofs, verification, methods
│   │           ├── ledger/         # double-entry ledger, statements, credit limits
│   │           ├── invoices/       # invoice/receipt PDF generation
│   │           ├── notifications/  # in-app + email (+ SMS/WhatsApp later)
│   │           ├── audit/          # audit log write/read
│   │           ├── dashboard/      # aggregated stats for portal & admin
│   │           └── health/
│   ├── worker/             # BullMQ processors (same Nest app, different entrypoint)
│   └── mobile/             # frozen (out of scope until portal API is stable)
├── packages/
│   ├── ui/                 # design system: tokens, theme provider, components
│   ├── validation/         # zod schemas + mask definitions (shared FE/BE)
│   ├── api-client/         # generated from OpenAPI (orval) + TanStack Query hooks
│   ├── types/              # enums & shared domain types (generated from Prisma where possible)
│   ├── suppliers/          # SupplierAdapter contract + AirDesk adapter + mock adapter (dev/test only)
│   ├── auth-client/        # shared FE auth: token store, refresh, <RequirePermission/>
│   └── config/             # tsconfig bases, eslint, prettier, tailwind preset
├── docs/plan/
├── docker/                 # nginx confs per app, compose files
└── turbo.json
```

The root-level `App.tsx`, `pages/`, `components/`, `services/`, `context/`, `types/` and `constants.ts` move into `apps/website`. The B2B pages are rebuilt in `apps/portal` and `apps/admin`, not moved. `services/b2b/*` and root `types/b2b.ts` are **deleted** once the API replaces them.

## 3. Frontend stack (portal and admin)

| Concern | Choice | Why |
|---------|--------|-----|
| Build | Vite 6, React 19, TypeScript strict | Already in use |
| Routing | React Router 7 (`createBrowserRouter`), route-level `loader` guards | Real URLs, guard before render |
| Server state | TanStack Query 5 | Caching, retries, invalidation, optimistic updates |
| Forms | react-hook-form + `@hookform/resolvers/zod` | Shared Zod schemas with the API |
| Masks | Maskito (`@maskito/react`) | Framework-agnostic, works with RHF, handles caret correctly |
| Tables | TanStack Table 8 | Server-side pagination, sorting, filtering, column visibility |
| UI | `@gnk/ui`, built on Radix primitives with shadcn-style composition and Tailwind v4 | Accessible and themeable |
| Charts | Recharts (admin dashboard) | Simple, SSR-free |
| Icons | lucide-react | Already in use |
| Dates | date-fns + `Asia/Karachi` display timezone | |
| Toasts | sonner | |
| i18n (later) | i18next (EN first, UR later) | |

## 4. Backend stack

| Concern | Choice |
|---------|--------|
| Framework | NestJS 11 (Express adapter) |
| ORM | Prisma 5 → 6, migrations committed |
| Validation | `nestjs-zod` (Zod DTOs from `@gnk/validation`), global `ZodValidationPipe` |
| Auth | `@nestjs/jwt` (jose-backed), argon2 (`argon2` package), `otplib` for TOTP |
| Rate limit | `@nestjs/throttler` + `@nest-lab/throttler-storage-redis` |
| Queue | BullMQ (`@nestjs/bullmq`) |
| Scheduler | BullMQ repeatable jobs (not `setInterval`), so exactly one runs across replicas |
| Storage | S3-compatible (AWS S3 / Cloudflare R2 / MinIO locally), private buckets, presigned URLs |
| Mail | Resend or SES via a `Mailer` port, templated with React Email |
| Logging | `nestjs-pino`, JSON logs, request ID, PII redaction |
| Docs | `@nestjs/swagger` + OpenAPI 3.1 exported at build, which drives `@gnk/api-client` |
| Security | `helmet`, strict CORS allowlist, `hpp`, body limits |
| Errors | Sentry (FE + BE) |
| Tests | Vitest (packages, FE), Jest/Vitest + Supertest + Testcontainers (API), Playwright (E2E) |

## 5. Supplier layer (doc §10–12)

The rest of the app only uses GNK-side concepts: `Supplier → Product → Departure → Availability → Price → Booking → Status`.

```ts
// packages/suppliers/src/contract.ts
export interface SupplierAdapter {
  readonly code: string;                                // 'airdesk'
  readonly capabilities: SupplierCapability[];          // ['GROUPS','HOLD','CANCEL','STATUS_POLL']
  listProducts(q: ListProductsQuery): Promise<SupplierProduct[]>;
  getAvailability(ref: DepartureRef, seats: number): Promise<Availability>;
  hold?(req: HoldRequest): Promise<HoldResult>;         // if supplier supports option/hold
  createBooking(req: SupplierBookingRequest, idempotencyKey: string): Promise<SupplierBookingResult>;
  getBookingStatus(supplierBookingId: string): Promise<SupplierStatusResult>;
  cancelBooking?(supplierBookingId: string): Promise<SupplierCancelResult>;
  mapStatus(raw: string): GnkBookingStatus;             // AirDesk 'CONFIRMED' → CONFIRMED
}
```

Rules:
- Each adapter returns **typed results or typed errors** (`SupplierError{kind:'TIMEOUT'|'REJECTED'|'SOLD_OUT'|'AUTH'|'UNKNOWN', retriable}`). It never returns a fake success.
- The mock adapter is registered only when `SUPPLIER_MODE=mock` and `NODE_ENV!=='production'`. Boot fails otherwise.
- All raw supplier requests and responses are stored in `SupplierCallLog` (redacted) for dispute resolution.
- Supplier credentials are encrypted with AES-256-GCM using a key from `SUPPLIER_CREDENTIALS_KEY` (KMS later).
- The worker handles sync, booking push and status polling. HTTP handlers only enqueue jobs.

## 6. Core flows

### Booking (doc §5)
```
Agent picks departure ─▶ POST /pricing/quotes  (server computes price; returns quoteId, expires 15m)
                     ─▶ POST /bookings {quoteId, passengers[], Idempotency-Key}
                          • validates quote belongs to caller's account & not expired
                          • locks departure row, checks seats, creates Booking PENDING_APPROVAL
                          • creates SeatHold (local) + optional supplier hold
                          • snapshots pricing breakdown
Admin (OPS) reviews ─▶ POST /admin/bookings/:id/approve   → APPROVED
Finance verifies pay ─▶ POST /admin/payments/:id/verify   → paymentStatus PAID
Auto/Manual push     ─▶ job supplier.push (requires APPROVED && PAID, unless account has credit)
                          → SUBMITTED_TO_SUPPLIER → SUPPLIER_PENDING → CONFIRMED | SUPPLIER_FAILED
Status poll job      ─▶ maps supplier status → GNK status, writes history, notifies agent
```

### Agent onboarding (doc §1)
```
Register (account type, business info, contact) ─▶ verify email ─▶ upload KYC docs
   ─▶ status SUBMITTED ─▶ admin review ─▶ APPROVED | REJECTED (reason) | MORE_INFO_REQUIRED
   ─▶ approved: can browse net-free prices & book; before: dashboard + profile + docs only
```

## 7. Environments

| Env | Supplier mode | Data | Notes |
|-----|---------------|------|-------|
| local | mock | seed | docker compose: pg, redis, minio, mailpit |
| staging | airdesk sandbox | anonymised seed | same infra shape as prod |
| production | airdesk live | real | no mock adapter, no demo users, no seed |

## 8. Deployment

- One Docker image per app. Portal, admin and website are static builds served by nginx with per-app configs. API and worker share an image with different `CMD`s.
- Images build with `npm ci`, use a non-root user, and have a read-only root filesystem where possible.
- DB migrations run as a one-off job (`prisma migrate deploy`) before the API rolls out.
- Postgres and Redis are not published to the public network in production. Redis requires a password (`requirepass`).
