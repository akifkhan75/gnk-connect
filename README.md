# GNK Connect

B2B wholesale travel platform for Pakistani travel agents: group air tickets and Umrah packages sourced from AirDesk, sold at GNK partner fares.

| App                                        | Path           | Dev URL                      | Who           |
| ------------------------------------------ | -------------- | ---------------------------- | ------------- |
| API (NestJS + Prisma + PostgreSQL + Redis) | `apps/api`     | http://localhost:4000/api/v1 | —             |
| Partner portal                             | `apps/portal`  | http://localhost:3001        | Travel agents |
| Admin console                              | `apps/admin`   | http://localhost:3002        | GNK staff     |
| Public website                             | `apps/website` | http://localhost:3000        | Travellers    |

Shared packages: `@gnk/ui` (design system + light/dark theme), `@gnk/types` (DTOs, enums, permissions), `@gnk/validation` (Zod schemas used by API and forms), `@gnk/api-client`, `@gnk/auth-client`, `@gnk/suppliers` (supplier contract + mock AirDesk adapter). `apps/mobile` is on hold and outside the npm workspace.

## Run locally

Prerequisites: Node 22+, Docker.

```bash
cp .env.example .env            # then fill JWT_SECRET and PII_ENCRYPTION_KEY (commands are in the file)
docker compose up -d postgres redis
npm install
npm run db:migrate              # prisma migrate deploy
npm run db:seed                 # roles, default pricing rule, demo partners/staff, mock AirDesk catalogue
npm run dev:local               # API + portal + admin + website in one terminal
```

`npm run dev` uses Turborepo; `dev:local` does the same without it (Turbo's native binary doesn't run on every macOS build).

The seed prints the super-admin password once (or set `SEED_ADMIN_PASSWORD`) and a shared password for demo users (or set `SEED_DEMO_PASSWORD`). Demo users: `owner@alnoor.demo` (approved agency owner), `agent@alnoor.demo` (booking staff), `imran@pending.demo` (application awaiting review), and staff `ops@`, `finance@`, `partners@gnkconnect.pk`.

**Email:** no provider is configured yet. Verification, password-reset and invite emails are printed to the API log with their links (`infra/mailer/mailer.service.ts` is the single place to plug in Resend/SES/SMTP).

**Supplier:** `SUPPLIER_MODE=mock` uses a deterministic mock AirDesk adapter (`packages/suppliers`). Bookings "confirm" against the mock; the admin shows a "Mock API" badge.

## Checks

```bash
npm run lint && npm run typecheck
npm test -w @gnk/api                        # unit tests (pricing engine, crypto)
node apps/api/test/smoke.mjs                # end-to-end flow against a running API (see header for env vars)
```

CI (`.github/workflows/ci.yml`) runs all of the above, builds every app, migrates and seeds a fresh Postgres, and runs the smoke test.

## How it works

- **Two identity realms.** Partners sign in to the portal, staff to the admin (invite-only). Access tokens live in memory; a rotating refresh token sits in an httpOnly SameSite=Strict cookie with reuse detection. Every API route is authenticated by default; `/partner/**` only accepts portal tokens and `/admin/**` only staff tokens.
- **Authorization.** Staff permissions come from roles (`packages/types/src/permissions.ts`). Partners have OWNER / MANAGER / STAFF / ACCOUNTANT roles, and booking and fares unlock only for APPROVED accounts.
- **Booking flow.** Partner picks a departure → server issues a price quote (prices are never computed or accepted from the browser) → booking request holds seats → staff approve (live availability check) → push to supplier once balance + credit covers it → confirmed booking is charged to the partner's ledger and invoiced. Cancelling a confirmed booking refunds the ledger and voids the invoice.
- **Money.** Double-entry ledger; partner balance = deposits − confirmed bookings; available to book = balance + credit limit. Payments are submitted with a slip and verified by finance.
- **Audit.** Every auth event and state change is written to `AuditLog` (admin → Audit log).

## Not done yet

- Staff TOTP 2FA (schema ready; deferred by decision).
- Live AirDesk adapter (waiting for API docs and sandbox credentials).
- Email delivery provider; queues (BullMQ) for supplier push and status polling. These run inline today, with idempotency keys.
- PDF generation (invoices, vouchers and statements print to PDF from the browser).
- Website dark mode and the logo artwork (`Logo` in `@gnk/ui` is a placeholder mark; swap the SVG when the file is available).
