# 01 — Codebase Audit

Scope: the whole repo at `15bbf19` plus uncommitted working-tree changes (2026-09-24). Severity: **P0** = exploitable or loses data or money now · **P1** = serious defect, fix before production · **P2** = standards or maintainability · **P3** = polish.

---

## 1. Architecture

| ID | Sev | Finding | Evidence |
|----|-----|---------|----------|
| ARC-01 | P0 | **The B2B frontend has no real backend.** Agents, bookings, payments, ledger, team and notifications live in `localStorage` through a 1,485-line singleton store. Data is per-browser, editable in DevTools, and never shared between agents and admins. | `services/b2b/b2bStore.ts:561-619`, `context/B2BAuthContext.tsx:37-58` |
| ARC-02 | P0 | **The API is mostly in-memory.** `AuthService`, `AgentsService`, `BookingsService`, `PricingService`, `LedgerService` and `NotificationsService` hold hard-coded arrays. Restarting the API loses all data. Users seeded in `AuthService` and `AgentsService` are separate copies that drift apart. | `apps/api/src/modules/*/**.service.ts` |
| ARC-03 | P0 | **There is no booking-creation endpoint.** `BookingsService.bookings` starts empty, and `approve-push` can never find a booking. | `apps/api/src/modules/bookings/*` |
| ARC-04 | P1 | **The "multi-app" monorepo is a facade.** `apps/admin`, `apps/portal` and `apps/website` contain only a `package.json` and a `Dockerfile`. All three Dockerfiles copy the root and build the same SPA, so the website container also serves `/admin`. | `apps/*/Dockerfile` |
| ARC-05 | P1 | **Business logic is duplicated.** The pricing engine, AirDesk adapter and types each exist twice (`services/b2b/*` vs `packages/*`, and `types/b2b.ts` vs `packages/types/src/b2b.ts`), and the copies have already drifted (for example, `AdminRole` and `AgencyTeamMember` exist only in the root copy). | `diff types/b2b.ts packages/types/src/b2b.ts` |
| ARC-06 | P1 | `PrismaModule` is imported only by `SuppliersModule`. Other modules cannot use the database without re-importing it. | `apps/api/src/app.module.ts` |
| ARC-07 | P1 | **There are no Prisma migrations.** The schema cannot be deployed reproducibly. | `apps/api/prisma/` |
| ARC-08 | P1 | **`.gitignore` rule `uploads/` hides `apps/api/src/modules/uploads/`.** `AppModule` imports the module, but it is not committed, so a clean clone fails to build. | `.gitignore:25` |
| ARC-09 | P1 | The sync cron uses `setInterval` inside the API process. With more than one API replica, every replica syncs, and there is no lock. | `apps/api/src/modules/suppliers/inventory-sync.cron.ts:24` |
| ARC-10 | P2 | The mobile app (`apps/mobile`) is a standalone mock that embeds its own product data, including supplier net prices. It has no API integration. | `apps/mobile/App.tsx:16-30` |
| ARC-11 | P2 | Public website, portal and admin share one router and one bundle. Admin code ships to public visitors. | `App.tsx` |
| ARC-12 | P2 | `HashRouter` produces `/#/agent/...` URLs. This hurts SEO on the website and is unconventional for apps. | `App.tsx:2` |
| ARC-13 | P2 | Naming is inconsistent: "GNK Elite" appears in 32 files (package name `gnk-elite-monorepo`, DB `gnk_elite_db`, `admin@gnkelite.com`, log strings). | `grep -rl "GNK Elite"` |

## 2. Authentication

| ID | Sev | Finding | Evidence |
|----|-----|---------|----------|
| AUTH-01 | **P0** | **Password check is skipped when `password` is omitted.** `POST /auth/login {"email":"admin@gnkelite.com"}` returns an admin JWT. | `auth.service.ts:142` |
| AUTH-02 | **P0** | **Frontend login falls back to local users by email only**, with no password. Anyone can log in as admin when the API is down or rejects the credentials. | `B2BAuthContext.tsx:74-81` |
| AUTH-03 | **P0** | **A demo user switcher ships in production layouts** and lets any visitor impersonate any user or admin. The app also auto-logs visitors in as `user-abc-owner`. | `AgentLayout.tsx:60`, `AdminLayout.tsx:108`, `B2BAuthContext.tsx:51-56` |
| AUTH-04 | **P0** | **The JWT secret has a hard-coded fallback** (`gnk_jwt_super_secret_key_2026`), which is also committed in `.env.example` and `docker-compose.yml`. Anyone can forge tokens. | `auth.service.ts:19`, `docker-compose.yml` |
| AUTH-05 | P0 | Password hashing uses PBKDF2 with a **static global salt** and **1,000 iterations**, compared with `===` (not constant-time). | `auth.service.ts:88-93` |
| AUTH-06 | P1 | JWT signature comparison uses `!==` (a timing side-channel). The JWT implementation is hand-rolled, with no `alg`, `aud` or `iss` checks. | `auth.service.ts:119` |
| AUTH-07 | P1 | Default passwords: registration without a password gets `partner123`. The frontend sends `partner123` when the password is blank. | `auth.service.ts:214`, `B2BAuthContext.tsx:65` |
| AUTH-08 | P1 | `approvalStatus` and `role` are baked into a 24-hour JWT. Suspending or approving an agent has no effect until the token expires. There is no revocation, refresh or logout on the server. | `auth.service.ts:150-158` |
| AUTH-09 | P1 | The access token is stored in `localStorage`, so any XSS can exfiltrate it. | `services/apiClient.ts:31-46` |
| AUTH-10 | P1 | There is no email verification, password reset, account lockout, 2FA or session list. | — |
| AUTH-11 | P1 | Admins and agents share one user table and one token type. A `GNK_ADMIN` role is one enum value away from an agent. | `schema.prisma: AgentRole` |
| AUTH-12 | P2 | Login error messages are generic (good), but registration reveals whether an email exists. Needs a neutral response plus an email flow. | `auth.service.ts:188` |

## 3. Authorization / RBAC

| ID | Sev | Finding | Evidence |
|----|-----|---------|----------|
| RBAC-01 | **P0** | **`AgentsController` has no guards.** `PATCH /agents/:id/status {"status":"APPROVED"}` lets anyone self-approve. `GET /agents` leaks every agent's PII. | `agents.controller.ts` |
| RBAC-02 | **P0** | **`BookingsController` has no guards.** Anyone can list all bookings (passenger passport data) and trigger `approve-push` to AirDesk. | `bookings.controller.ts` |
| RBAC-03 | **P0** | **`PricingController` has no guards.** Anyone can read all margin rules, create rules (for example, a -100% markup for their own agency), and call the calculator with arbitrary net prices. | `pricing.controller.ts` |
| RBAC-04 | **P0** | **`LedgerController` IDOR:** `GET /ledger/agency/:agencyId` and `/ledger/statement/:agencyId` are unauthenticated, so any agency's financials are readable. | `ledger.controller.ts:11-24` |
| RBAC-05 | **P0** | **`UploadsController` has no auth.** Anyone can upload files and stream KYC documents and payment slips, which are served with `Cache-Control: public`. `agentId` comes from the request body. | `uploads.controller.ts` |
| RBAC-06 | P0 | `GET /notifications/history?email=` is unauthenticated and leaks any user's notifications. | `notifications.controller.ts:12` |
| RBAC-07 | P1 | `POST /suppliers/sync` is public. Anyone can trigger unlimited supplier API calls (cost and DoS). | `suppliers.controller.ts:13` |
| RBAC-08 | P1 | **There are no frontend route guards.** `/admin/*` renders for anyone. `AdminLayout` defaults to `SUPER_ADMIN` when the role is missing. | `AdminLayout.tsx:47`, `B2BAuthContext.tsx:126` |
| RBAC-09 | P1 | There is no tenant scoping anywhere: no query filters by the caller's agency. | all services |
| RBAC-10 | P2 | RBAC is role-string checks scattered in React (`canPushToAirDesk = ...`). There is no permission model shared with the API. | `B2BAuthContext.tsx:133-139` |

## 4. Business-logic integrity

| ID | Sev | Finding | Evidence |
|----|-----|---------|----------|
| BIZ-01 | **P0** | **Silent mock fallback on live booking.** If AirDesk returns non-2xx or throws, `submitBooking` returns `airDeskAdapter.createBooking()` (a mock success). A real failed booking gets marked as confirmed. `fetchGroups` and `fetchBookingStatus` have the same pattern. | `airdesk-http.client.ts:64,118,125` |
| BIZ-02 | **P0** | **Supplier net price is exposed to agents** in the dashboard price widget and the group detail page. This contradicts the core rule "agents never see AirDesk net". | `AgentDashboardPage.tsx:261,340`, `AgentGroupDetailsPage.tsx:119,389` |
| BIZ-03 | P0 | **Pricing is calculated in the browser** and the result is trusted. An agent can tamper with the selling price. | `services/b2b/pricingEngine.ts`, `AgentGroupDetailsPage.tsx` |
| BIZ-04 | P1 | `approveAndPushToSupplier` sets `paymentStatus = PAYMENT_VERIFIED` automatically, which bypasses finance. | `bookings.service.ts:36` |
| BIZ-05 | P1 | There is no seat-hold or overbooking protection. `availableSeats` is not decremented transactionally, and nothing reserves seats between the request and GNK approval. | — |
| BIZ-06 | P1 | Server-side pricing skips priorities 3 (product) and 4 (supplier). A rule with no `agencyId` matches an agent with no agency (`undefined === undefined`). The fallback is `rules[last]`, which is arbitrary. | `pricing.service.ts:77-90` |
| BIZ-07 | P1 | Booking IDs are not generated atomically (`Date.now()`-style IDs). Two requests in the same millisecond collide. | `auth.service.ts:192` pattern, `b2bStore.ts` |
| BIZ-08 | P1 | There is no idempotency on booking submission or supplier push. Double-clicks or retries create duplicate AirDesk bookings. | — |
| BIZ-09 | P1 | There is no booking state machine. Any status can be set from any status. | `types/b2b.ts`, `b2bStore.ts` |
| BIZ-10 | P2 | The ledger's opening and closing balance math depends on array order and hard-coded seed balances. | `ledger.service.ts:90,143` |
| BIZ-11 | P2 | The public groups page computes retail as `supplierNet + 15000`, hard-coded in the UI. | `PublicGroupsPage.tsx:160` |

## 5. Database (`apps/api/prisma/schema.prisma`)

| ID | Sev | Finding |
|----|-----|---------|
| DB-01 | P0 | **Money stored as `Float`** (`creditLimitPKR`, `walletBalancePKR`, `supplierNetPricePKR`, all booking totals, `amountPKR`). Rounding errors land in financial records. |
| DB-02 | P1 | `walletBalancePKR` is a mutable column instead of being derived from an append-only ledger. There is no `LedgerEntry` model even though a ledger UI exists. |
| DB-03 | P1 | `GNK_ADMIN` sits in `AgentRole`, which mixes staff and partners. There is no permission, role or session table. |
| DB-04 | P1 | Status fields are free-text `String` (`VerificationDocument.status`, `Departure.status`, `PaymentTransaction.status`, `Passenger.gender/passengerType`, `title`). |
| DB-05 | P1 | Dates are stored as `String` (`Passenger.dob`, `passportExpiry`). |
| DB-06 | P1 | `Booking.supplierId` and `supplierProductId` are not foreign keys. `PricingRule.productId` is not an FK. `Agency.pricingProfileId` is dangling. |
| DB-07 | P1 | No indexes on hot filters: `Booking(agencyId,status)`, `Booking(status,createdAt)`, `Departure(productId,departureDate)`, `PricingRule(isActive,priority)`. |
| DB-08 | P1 | There is no audit log table, no soft-delete, and no `createdBy`/`updatedBy`. |
| DB-09 | P1 | `Supplier.apiKeyEncrypted` has no encryption scheme defined. There is no key management. |
| DB-10 | P2 | `Booking` has no concurrency control (`version` column) and no `idempotencyKey`. The status-history `changedBy` is a free string. |
| DB-11 | P2 | PII (passport numbers) is not encrypted at rest and has no retention policy. |
| DB-12 | P2 | `VerificationDocument` belongs only to `Agency`, so individual agents can't upload KYC documents. |

## 6. API standards

| ID | Sev | Finding | Evidence |
|----|-----|---------|----------|
| API-01 | P0 | **There is no input validation.** Bodies are typed `any` or inline objects. `class-validator` is installed, but no DTOs exist and there is no global `ValidationPipe`. | all controllers |
| API-02 | P1 | `app.enableCors()` with no options allows any origin. | `main.ts:6` |
| API-03 | P1 | No `helmet`, no body-size limit, no multer `limits`. Upload size is checked **after** the whole file is buffered in memory. | `main.ts`, `uploads.service.ts` |
| API-04 | P1 | **No rate limiting anywhere.** Login, registration, uploads and sync are unthrottled. | — |
| API-05 | P1 | Upload MIME type comes from the client `Content-Type` header, with no magic-byte check. Files are stored on local disk inside the container, so a redeploy loses them. | `uploads.service.ts:41-52` |
| API-06 | P1 | Errors are inconsistent. Services `throw new Error()`, which becomes a 500. Messages leak internal state (for example, the ForbiddenException text lists roles). | `bookings.service.ts:17`, `roles.guard.ts:30` |
| API-07 | P2 | There is no pagination, filtering or sorting contract. Lists return everything. | all `GET` lists |
| API-08 | P2 | `@nestjs/swagger` is installed but not configured. There is no OpenAPI spec, so the frontend client is hand-typed `any`. | `main.ts` |
| API-09 | P2 | There is no health or readiness endpoint for the DB and Redis, no structured logging (uses `console.log` with emoji), and no request IDs. | `main.ts`, `prisma.service.ts` |
| API-10 | P2 | Prisma connection failure is swallowed ("offline/mock mode"). The API starts healthy with no database. | `prisma.service.ts:9-11` |
| API-11 | P2 | `apps/api/tsconfig.json` sets `strictNullChecks: false` and `noImplicitAny: false`. | `apps/api/tsconfig.json` |

## 7. Frontend

| ID | Sev | Finding |
|----|-----|---------|
| FE-01 | P1 | There is no light/dark theme. There are 0 `dark:` classes, colours are hard-coded (`bg-gray-50 text-navy-900`), and there are no semantic tokens. |
| FE-02 | P1 | Forms rely on HTML `required` only. No schema validation, no masks for phone, CNIC, NTN, passport or IBAN, and no date-range checks (for example, passport expiry vs travel date). |
| FE-03 | P1 | `VITE_GEMINI_API_KEY` is bundled into client JS, so the key is public. AI calls must go through the API. |
| FE-04 | P1 | `uploadsApi.resolveUrl` hard-codes `http://localhost:4000`. |
| FE-05 | P2 | There is no data-fetching layer (no caching or retries). Pages call `b2bStore` synchronously. |
| FE-06 | P2 | Pages are very large (400–750 lines) and mix data, logic and presentation. There is no shared component library. |
| FE-07 | P2 | Accessibility: icon-only buttons have no labels, and colour contrast hasn't been checked for dark backgrounds. |
| FE-08 | P3 | Images are hot-linked from Unsplash and dicebear, with no CSP. |

## 8. Infrastructure, DevOps and testing

| ID | Sev | Finding |
|----|-----|---------|
| OPS-01 | P0 | Default credentials in `docker-compose.yml` (`gnk_secret_password`, JWT secret). Postgres and Redis ports are published to the host. Redis has no password. |
| OPS-02 | P1 | nginx: no security headers, no `limit_req`, no gzip/brotli, no cache headers for hashed assets. `/api/` proxies with `Connection 'upgrade'` on every request. |
| OPS-03 | P1 | The API Docker image runs `npm install` (not `npm ci`), copies all `node_modules`, and runs as root. |
| OPS-04 | P1 | No CI pipeline: no lint, typecheck, test or build gates. There is no ESLint or Prettier config. |
| OPS-05 | P1 | The "tests" are custom `tsx` scripts with a hand-rolled `assert` against a live container. There is no unit-test framework, no DB isolation, and no API tests for authz. |
| OPS-06 | P2 | Build artefacts are sitting in the tree (`dist/`, `apps/api/dist/`, `coverage/`, `tsconfig.tsbuildinfo`). They're git-ignored, but stale `dist` in `apps/api` contains old code. |
| OPS-07 | P2 | No observability: no error tracking, metrics or uptime checks. |

## 9. What's worth keeping

- The **domain model direction** is right: supplier → product → departure, dual booking IDs, pricing rule priorities, and a status-history table. Schema v2 in [03](./03-database.md) builds on it.
- The `SupplierAdapter` interface in `packages/supplier-adapters` is a good seam. It becomes the production adapter contract.
- The public website pages and visual identity (navy/cyan/gold, Outfit/Playfair) stay. The doc explicitly says not to redesign the public site.
- The upload service's filename sanitisation and path-traversal guard (`path.basename`) are correct in intent.

## 10. Immediate hotfixes (before any revamp work, even on demo deploys)

1. Remove the optional-password branch (AUTH-01). Remove the frontend local-login fallback and the demo switcher from production builds (AUTH-02/03).
2. Remove the JWT secret fallback, and fail on boot if `JWT_SECRET` is missing or shorter than 32 bytes (AUTH-04).
3. Add `JwtAuthGuard` and role guards to agents, bookings, pricing, ledger, uploads, notifications and suppliers/sync (RBAC-01..07).
4. Remove the mock fallback from `submitBooking` and `fetchBookingStatus` when `AIRDESK_LIVE_ENABLED=true` (BIZ-01).
5. Stop sending `supplierNetPricePKR` to agent-facing responses and UI (BIZ-02).
6. Fix `.gitignore` to `/uploads/` and `apps/api/uploads/`, then commit the uploads module (ARC-08).
