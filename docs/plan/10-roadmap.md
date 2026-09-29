# 10 — Roadmap

Phases map onto the architecture doc's Phases 1–7, with two added: a **Phase 0 hotfix** and a **Phase F foundation** (restructure, design system, auth) that everything else depends on. Each phase ships to staging and has explicit exit criteria.

```
P0 Hotfix ─▶ F1 Repo & tooling ─▶ F2 Design system & theming ─┐
                    └──▶ F3 DB v2 ─▶ F4 Auth & RBAC ───────────┼─▶ P1 Partner foundation ─▶ P2 Catalog/AirDesk ─▶ P3 Pricing
                                                                │                                                    │
                                                                └──────────── website re-skin (parallel) ◀──────────┘
P3 ─▶ P4 Booking engine ─▶ P5 Booking mgmt & status sync ─▶ P6 Payments/ledger/invoices ─▶ P7 Supplier layer hardening ─▶ H Go-live hardening
```

---

## P0 — Security hotfixes (on the current code)
Fixes the P0 issues in [01 §10](./01-audit.md#10-immediate-hotfixes-before-any-revamp-work-even-on-demo-deploys), so any demo deploy is safe while the revamp is underway.
- [ ] Make the password required and remove the `partner123` defaults (AUTH-01, AUTH-07).
- [ ] Remove the frontend local-login fallback, the auto-login and `DemoUserSwitcher` from production builds (`import.meta.env.DEV` only) (AUTH-02/03).
- [ ] Remove the JWT secret fallback and add boot validation. Rotate the committed secrets (AUTH-04, OPS-01).
- [ ] Guard agents, bookings, pricing, ledger, uploads, notifications and suppliers/sync (RBAC-01..07).
- [ ] Remove the mock fallback when live mode is on (BIZ-01). Strip net price from agent UI (BIZ-02).
- [ ] Fix `.gitignore` and commit the uploads module (ARC-08).

**Exit:** the hotfix-specific curl checks all return 401/403, and a clean clone builds.

## F1 — Repository restructure and tooling
- [ ] Rename to GNK Connect: root package `gnk-connect`, DB `gnk_connect`, containers, emails (`@gnkconnect.pk`), and strings in all 32 files.
- [ ] Move the public site into `apps/website`. Scaffold `apps/portal` and `apps/admin` (Vite, React 19, TS strict, React Router 7 data router, TanStack Query).
- [ ] Create the packages `config`, `types`, `validation`, `ui`, `api-client`, `auth-client` and `suppliers`. Delete the duplicated `services/b2b/*` and root `types/b2b.ts` once each is replaced.
- [ ] ESLint (flat config), Prettier, lint-staged + husky, commitlint, gitleaks.
- [ ] `turbo.json` pipelines: `lint`, `typecheck`, `test`, `build`, `openapi`, `generate`.
- [ ] Docker: per-app nginx configs with security headers and `limit_req`, an API/worker image with `npm ci` and a non-root user. Compose adds MinIO and Mailpit. Postgres and Redis get no host ports in the prod compose, and Redis gets a password.
- [ ] CI (GitHub Actions): install → lint → typecheck → unit → build → integration (Testcontainers) → e2e (on the main branch). Also Dependabot and CodeQL.

**Exit:** `turbo build` produces three separate SPAs and the API. CI is green. There's no root-level SPA.

## F2 — Design system and light/dark mode
- [ ] Tokens, Tailwind v4 theme, ThemeProvider, no-flash script, ThemeToggle ([08](./08-design-system-theming.md)).
- [ ] Core components: forms (with MaskedInput), DataTable, Dialog/Drawer, StatusBadge, StatCard, AppShell, AuthLayout, EmptyState, Skeleton, Stepper, Timeline, Toasts.
- [ ] Storybook with both themes and axe checks.
- [ ] **Website re-skin to tokens** (runs in parallel from here to P3): keeps the design, adds dark mode, and replaces the `VITE_GEMINI_API_KEY` usage with the API proxy.

**Exit:** all three apps toggle light/dark/system with no flash. Contrast checks pass. Storybook is published internally.

## F3 — Database v2
- [ ] Implement the Prisma schema from [03](./03-database.md), the `0001_init` migration, and the raw SQL (citext, ledger CHECK, booking sequence, partial indexes).
- [ ] `infra/crypto` (AES-GCM field encryption with key versioning), `infra/prisma`, repository base with tenant scoping.
- [ ] Seeds: `base` (roles, permissions, default rule, payment methods, AirDesk supplier) and `demo` (non-prod).

**Exit:** `prisma migrate deploy` runs on an empty DB. The seed is idempotent. Repository unit tests pass.

## F4 — Authentication and RBAC
- [ ] Config module with Zod env validation, `helmet`, CORS allowlist, pino, request ID, Problem Details filter, `ZodValidationPipe`.
- [ ] Throttler with Redis storage and the tier table from [04 §5](./04-auth-rbac-security.md#5-rate-limiting).
- [ ] Partner auth: register, verify email, login, refresh rotation with reuse detection, logout(-all), forgot/reset, lockout, sessions list.
- [ ] Staff auth: invite-only, login + mandatory TOTP, recovery codes.
- [ ] Global guards (`RealmAuthGuard`, `PermissionsGuard`), decorators (`@Public`, `@RequirePermission`, `@RequirePartnerRole`, `@RequireAccountStatus`, `@Actor`).
- [ ] Mailer port and templates (verify, reset, invite, lockout, new-login alert).
- [ ] `@gnk/auth-client`: in-memory token, silent refresh, `requireSession`/`requirePerm` loaders, `<Can>`.
- [ ] Portal and admin login and signup screens (Portal §2, Admin login + 2FA).

**Exit:** the full security checklist items for auth pass ([04 §10](./04-auth-rbac-security.md#10-security-test-checklist-gate-before-go-live)). The IDOR test harness is in place.

## P1 — Partner foundation (doc Phase 1)
- [ ] Registration wizard, KYC uploads (presigned + sniffing), submit for review, status tracker.
- [ ] Portal shell (AirDesk-style layout), dashboard (pending-state and approved-state variants), profile, security and preferences tabs.
- [ ] Team: invites, roles, removal (OWNER/MANAGER).
- [ ] Admin shell and dashboard skeleton. Partners module: queues, review, approve/reject/more-info, suspend/reactivate, credit limit, document verification.
- [ ] Notifications (in-app + email) for account status changes.
- [ ] Audit log writes plus the admin audit viewer.

**Exit:** a new agency can register, upload documents and be approved by a PARTNER_MGR. Suspension locks them out within 60 seconds. E2E covers it.

## P2 — Catalog and AirDesk groups (doc Phase 2)
- [ ] `packages/suppliers`: contract, typed errors, AirDesk adapter (real HTTP, fixtures), mock adapter (dev only).
- [ ] Worker app: repeatable `supplier.sync` job with a lock, per-supplier outbound rate limit, circuit breaker, `SupplierCallLog`.
- [ ] Catalog module: products/departures upsert, publish/feature/content overrides (admin).
- [ ] Portal Groups list and detail pages (prices hidden until P3 lands, then shown).
- [ ] Admin Suppliers module (settings, write-only credentials, test connection, sync history, call log).

**Exit:** a sandbox AirDesk sync populates the catalog. Staff publish products. Approved agents browse them.
**Blocked on:** AirDesk API docs and sandbox credentials.

## P3 — Pricing engine (doc Phase 3)
- [ ] Pure `pricing/domain` engine: scopes, precedence, stackable, min/max, rounding, validity. 100% branch coverage including the doc's worked examples.
- [ ] `PriceQuote` issuance endpoint. `/partner/groups` returns account-specific selling prices.
- [ ] Admin pricing rules CRUD, tiers, conflict warnings, simulator, impact preview.
- [ ] Public retail price rule for the website's `/groups`.

**Exit:** prices shown to agent A differ correctly from agent B per their rules. No partner response contains net or markup (automated assertion).

## P4 — Booking engine (doc Phase 4)
- [ ] State machine module, `BookingSequence` (GNK-YYYY-######), idempotency middleware, `If-Match` optimistic locking.
- [ ] `POST /partner/bookings` from a quote with passenger validation, seat hold (`FOR UPDATE`), hold expiry job.
- [ ] Portal new-booking flow (passengers → review → submit), with draft autosave.
- [ ] Admin bookings queue and detail drawer: approve/reject, price audit, repricing warning, live availability check.
- [ ] `supplier.push` job (requires APPROVED + PAID or credit), dual IDs stored, typed error handling to `SUPPLIER_FAILED`, retry.

**Exit:** the end-to-end request → approve → pay (manual flag for now) → push → AirDesk sandbox confirmation works. A double submit creates one booking and one supplier call.

## P5 — Booking management and status sync (doc Phase 5)
- [ ] Portal My Bookings tabs, filters and export. Booking detail with timeline, masked passports and voucher.
- [ ] `supplier.status-poll` job with adapter `mapStatus`, history events and notifications. Admin "sync now".
- [ ] Cancellation flows (agent request before approval; admin cancel with supplier cancel if supported).
- [ ] Departure reminder notifications and the auto-`COMPLETED` job.

**Exit:** an AirDesk status change reflects in the portal within one poll interval and triggers a notification.

## P6 — Payments, ledger and invoices (doc Phase 6)
- [ ] Payment methods config (manual bank transfer and cash enabled). GNK bank details shown to agents.
- [ ] Portal submit payment with proof upload. Admin verify/reject/refund with duplicate-reference detection.
- [ ] Double-entry ledger postings (booking confirmed → receivable; payment verified → bank/receivable), statements, ageing, credit limit enforcement.
- [ ] Invoice and receipt PDF generation (always light theme), portal Invoices page, statement PDF.
- [ ] Separation-of-duties and four-eyes settings.

**Exit:** a finance reconciliation test passes: Σ ledger entries balance, and partner balances match statements.

## P7 — Supplier layer hardening (doc Phase 7)
- [ ] Capability flags (HOLD, CANCEL, STATUS_WEBHOOK). Webhook ingestion endpoint with signature verification if AirDesk supports it.
- [ ] Adapter conformance test suite that every future supplier must pass.
- [ ] A second adapter stub (Hotels) to prove the abstraction, behind a feature flag.

**Exit:** adding a supplier touches only `packages/suppliers/<new>` and one settings row.

## H — Go-live hardening
- [ ] Full [04 §10 security checklist](./04-auth-rbac-security.md#10-security-test-checklist-gate-before-go-live), a ZAP baseline, and ideally an external pentest.
- [ ] Load test with k6: 200 concurrent agents browsing, 20 bookings/min, p95 < 300 ms on reads.
- [ ] Sentry (FE + BE), uptime checks, log retention, alerts from [04 §9](./04-auth-rbac-security.md#9-audit-and-monitoring).
- [ ] Backups: Postgres PITR with a restore drill, and object-storage versioning.
- [ ] Runbooks: supplier outage, stuck booking, refresh-reuse alert, key rotation.
- [ ] Privacy: T&Cs, privacy policy, and PII retention job.

---

## Testing strategy (applies to every phase)

| Layer | Tooling | Must cover |
|---|---|---|
| Domain | Vitest | pricing engine, state machine, validators, money math |
| API integration | Supertest + Testcontainers | every endpoint's happy path, authz (401/403/404-cross-tenant), validation 422, idempotency, rate-limit 429 |
| Supplier | Recorded fixtures + contract suite | mapping, error kinds, retries |
| UI | Vitest + Testing Library | forms (masks, errors), guards, `<Can>` |
| E2E | Playwright (light + dark project) | register→approve→book→pay→confirm; admin queues; axe accessibility |

The current `scripts/test-*.ts` files are retired in favour of the above.

## Open questions

These need answers from you or the business before the phases marked as blocked.

1. **AirDesk:** API documentation, sandbox credentials and rate limits. Does it support seat **hold/option** bookings, cancellations and status **webhooks**? (Blocks P2 and P4 design details.)
2. **AirDesk dashboard reference:** screenshots or a demo agent login, to match the portal layout closely (blocks the P1 portal design pass).
3. **Seat timing:** without supplier holds, seats can sell out between the agent request and GNK approval. Is a local hold plus a live check at approval acceptable, or should approved-and-paid bookings auto-push immediately?
4. **Payment before push:** always require PAID before pushing to AirDesk, or allow trusted partners to book on credit (credit limit)?
5. **Hosting:** where do the apps run (VPS + Docker, AWS, Vercel for SPAs + a VM for the API)? Which object storage (S3/R2)? Which email provider (Resend/SES/SMTP)?
6. **Domains:** confirm the subdomain plan (`agents.`, `admin.`, `api.`) vs path-based routing on one domain.
7. **Mobile app:** frozen until the portal is live (recommended), or in scope now?
8. **Currency:** PKR only, or do we need USD/SAR/AED pricing and FX?
9. **Staff roles:** does the proposed role set (SUPER_ADMIN, OPERATIONS, FINANCE, PARTNER_MGR, PRICING_MGR, SUPPORT) match how the GNK team actually works?
10. **Portal language:** English only at launch, or Urdu too?
