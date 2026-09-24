# GNK Connect — Platform Revamp Plan

> Status: **Draft for review** · Created 2026-09-24 · Branch baseline: `feat/b2b-wholesale-monorepo-airdesk` @ `15bbf19`
>
> Product name is **GNK Connect** (not "GNK Connect"). Every "GNK Connect" string, package name, DB name, container name and email domain is renamed as part of Phase 1.

## What this plan covers

| # | Document | Purpose |
|---|----------|---------|
| 01 | [Audit](./01-audit.md) | Findings from the current codebase: architecture, security, DB, standards. Severity-ranked with file references. |
| 02 | [Target architecture](./02-target-architecture.md) | Monorepo layout, apps, shared packages, backend modules, supplier layer. |
| 03 | [Database](./03-database.md) | Prisma schema v2: accounts, users, RBAC, products, pricing, bookings, payments, ledger, audit. |
| 04 | [Auth, RBAC & security](./04-auth-rbac-security.md) | Signup/signin flows, tokens, sessions, RBAC matrices, rate limiting, upload security, secrets, headers. |
| 05 | [API standards](./05-api-standards.md) | REST conventions, DTO validation, error envelope, pagination, idempotency, versioning, OpenAPI. |
| 06 | [Agent portal](./06-agent-portal.md) | AirDesk-style agent dashboard, screens, booking flow, portal RBAC. |
| 07 | [Admin console](./07-admin-console.md) | Professional admin layout, modules, admin RBAC, workflows. |
| 08 | [Design system & theming](./08-design-system-theming.md) | Shared UI package, tokens, light/dark mode for all apps. |
| 09 | [Forms, validation & input masking](./09-forms-validation-masking.md) | Shared Zod schemas, field rules, masks (CNIC, phone, NTN, passport, IBAN, money). |
| 10 | [Roadmap](./10-roadmap.md) | Phased delivery with tasks, exit criteria, and open questions. |

## Headline findings (details in 01)

1. **The B2B product is not actually wired to a backend.** Portal and admin run on `services/b2b/b2bStore.ts` (localStorage). The NestJS API keeps users, bookings and pricing in in-memory arrays; Prisma is only used by the inventory sync cron. There are no migrations.
2. **Authentication can be bypassed.** API login skips the password check if no password is sent. Frontend login falls back to "any matching email, no password" — including the admin account. A demo user switcher ships in both layouts.
3. **Most API endpoints have no auth guard.** Anyone can approve agents, read all bookings, push bookings to AirDesk, edit pricing rules, read every agency's ledger, and download KYC documents / payment slips.
4. **A failed live AirDesk booking is reported as a mock "confirmed" booking.**
5. **Agents can see supplier net prices** (dashboard, group detail), and pricing runs in the browser.
6. **`apps/admin`, `apps/portal` and `apps/website` are empty shells.** All three Dockerfiles build the same root SPA.
7. **No dark mode, no route guards, no shared form validation or input masking, no rate limiting.**

## Key decisions this plan makes (recommendations — challenge any of them)

| Area | Decision |
|------|----------|
| Backend | Keep **NestJS 11 + Prisma + PostgreSQL 16 + Redis 7**. Replace every in-memory service with Prisma-backed repositories. |
| Frontends | Three real Vite + React 19 apps: `website` (public, existing design kept), `portal` (agents), `admin` (GNK staff). Portal and admin use `BrowserRouter`, not `HashRouter`. |
| Shared code | `@gnk/ui` (components + theme), `@gnk/validation` (Zod schemas shared by API and UI), `@gnk/api-client` (typed client generated from OpenAPI), `@gnk/types`, `@gnk/config`. |
| Identity | **Two separate identity realms**: agent users (portal) and staff users (admin). Separate tables, separate JWT audiences, separate cookies. An agent token can never reach an admin route. |
| Accounts | Every agent belongs to a **Partner Account** of type `AGENCY` or `INDIVIDUAL`. An individual is an account with one member. That keeps multi-user agencies possible without special cases. |
| Tokens | 15-min access JWT (kept in memory) plus a rotating refresh token in an `httpOnly; Secure; SameSite=Strict` cookie, stored hashed with reuse detection. Password hashing uses **argon2id**. TOTP 2FA is mandatory for staff. |
| Authorization | Default-deny global guard, permission-based RBAC (`bookings:approve`), plus **tenant scoping**: every agent query is filtered by `partnerAccountId` on the server. |
| Money | `Decimal(14,2)` in PKR. No floats. Every price stores supplier net, markup, final price, and the rule snapshot. |
| Pricing | Server-side only. Agents receive a signed **price quote** (ID + expiry). Bookings reference the quote, so the client never sends a price. |
| Supplier calls | Go through a **BullMQ** queue with an idempotency key and retries. There is **no mock fallback in production**. |
| Rate limiting | `@nestjs/throttler` backed by Redis with per-route tiers, plus `limit_req` in nginx at the edge. |
| Forms | `react-hook-form` + Zod (shared schemas) + **Maskito** for input masks. |
| Theming | CSS-variable design tokens with a `light`/`dark`/`system` switcher in every app, persisted per user. |

## A conflict to resolve

The architecture doc says *"The dashboard should be GNK's own dashboard, not a copy of AirDesk"*, but the brief asks for the portal to be *"exactly like AirDesk agent dashboard"*. This plan follows the brief for **layout, information architecture and workflow**: sidebar, balance bar, group search table, booking flow and ledger. It uses **GNK Connect branding, code and assets**. It does not copy AirDesk's trademarks, logos, copy or proprietary assets. To match the layout closely, we need **screenshots or a demo login of the AirDesk agent dashboard**. See [Roadmap → Open questions](./10-roadmap.md#open-questions).
