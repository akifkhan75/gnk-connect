# 07 — Admin Console (`apps/admin`)

**Goal:** a professional operations console for GNK staff, with a dense but calm layout, permission-driven navigation, fast queues for daily work, and full auditability.

## 1. Shell layout

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ GNK Connect · Admin  │ ⌘K Search partners, bookings, payments…     │ ENV:PROD │ 🔔 ☀/☾ 👤 │
├───────────────────┬──────────────────────────────────────────────────────────────────────┤
│ OVERVIEW          │  Bookings  ›  Pending approval                         [Export] [⋯]  │
│  Dashboard        │ ┌──────────────────────────────────────────────────────────────────┐ │
│ OPERATIONS        │ │ [Status ▾] [Partner ▾] [Departure ▾] [Supplier ▾]  🔍  Saved views│ │
│  Bookings     (7) │ ├──────────────────────────────────────────────────────────────────┤ │
│  Payments     (4) │ │ ☐ Ref            Partner       Group      Dep     Pax  Total  St │ │
│  Partners     (3) │ │ ☐ GNK-2026-00124 ABC Travels   LHE-DXB    15 Oct  4    780k   ● │ │
│ CATALOG           │ │ …                                                                │ │
│  Products         │ └──────────────────────────────────────────────────────────────────┘ │
│  Suppliers        │  Bulk: [Approve] [Reject]                         ‹ 1 2 3 … 13 ›     │
│ COMMERCIAL        │                                                                      │
│  Pricing rules    │   Row click → right-side detail drawer (keeps list context)          │
│  Pricing tiers    │                                                                      │
│ FINANCE           │                                                                      │
│  Ledger           │                                                                      │
│  Invoices         │                                                                      │
│ SYSTEM            │                                                                      │
│  Staff & roles    │                                                                      │
│  Audit log        │                                                                      │
│  Settings         │                                                                      │
└───────────────────┴──────────────────────────────────────────────────────────────────────┘
```

- Nav groups are shown or hidden **by permission**, not by role name. Badges count items waiting in the user's queues only.
- An environment ribbon (LOCAL / STAGING / PROD) prevents mistakes.
- The list + detail drawer pattern means approving 20 bookings never requires a full page navigation. Keyboard shortcuts: `j/k` to move, `a` to approve, `r` to reject, `Esc` to close.
- Saved views: per-user saved filters ("My Dubai departures this month").

## 2. Dashboard (`dashboard:view`)

```
Row 1  KPI tiles (range: Today / 7d / 30d / MTD / custom)
       Bookings created · Confirmed · Pending approval · Awaiting payment verification
       GMV (selling) · GNK margin · Avg margin % · Active partners
Row 2  [Bookings & GMV — line/bar combo, daily]        [Status funnel: Requested→Approved→Paid→Confirmed]
Row 3  [Top partners by GMV — table]                   [Seat utilisation by upcoming departure — bars]
Row 4  Work queues: Partners awaiting review · Bookings awaiting approval · Payments to verify ·
                    Supplier failures · Departures < 72h with unpaid bookings
Row 5  Supplier health: last sync, success rate 24h, circuit state, avg latency
```

Tiles show only the metrics the user has permission for. For example, SUPPORT doesn't see margin and FINANCE doesn't see supplier health. Data comes from `/admin/dashboard/*`, cached for 60 seconds.

## 3. Modules

### 3.1 Partners (doc §13 "Agents")
- Tabs: **Pending review · Under review · More info · Approved · Rejected · Suspended · All**.
- Detail page:
  - Profile, members, and KYC documents with an inline viewer and a verify/reject control per document.
  - Credit limit, pricing tier, and partner-specific pricing rules.
  - Bookings, payments, ledger balance, and the audit trail.
- Actions:
  - Start review, which assigns the partner to the reviewer.
  - Approve.
  - Reject (reason required; templates available).
  - Request more info (note is emailed to the partner).
  - Suspend (reason; immediately invalidates their session cache) / Reactivate.
  - Set credit limit (`partners:credit_limit`).

### 3.2 Bookings (doc §13 "Bookings")
- Tabs: **Pending approval · Approved (awaiting payment) · Ready to push · Supplier pending · Confirmed · Failed · Cancelled · Completed**.
- The detail drawer or page shows:
  - Both IDs: `GNK-2026-000124` and **Supplier: AirDesk · AD-849302**.
  - Price audit: supplier net, applied rule(s), markup, selling price, and the quote timestamp. Visible only with `bookings:view_supplier_net`.
  - Passengers (full passport number revealed on click, and each reveal is audited).
  - Payment state, status timeline, the supplier call log (request/response, redacted), and internal notes.
- Actions follow the state machine:
  - Approve / Reject (reason).
  - Push to supplier. This queues a job, and the UI shows live progress by polling job status.
  - Retry push, Sync status now, Cancel.
- Pre-approval checks: seats still available at the supplier (live check) and passport validity. If the supplier's net price changed since the quote, the drawer shows a **repricing warning**: honour the quote (GNK absorbs the difference) or reject.

### 3.3 Payments (doc §13 "Payments")
- Tabs: **Submitted · Verified · Rejected · Refunded · All**.
- Verify screen: proof image or PDF side by side with the payment fields, the booking or account balance, and a duplicate-transaction-reference warning.
- Verify posts ledger entries and marks the booking paid (or partially paid). Reject needs a reason and notifies the partner.
- "Record payment": staff can record cash or bank deposits on a partner's behalf.
- The Payment Methods settings page enables or disables BANK_TRANSFER, CASH, CARD, GATEWAY and CREDIT, and manages the GNK bank accounts shown to partners.

### 3.4 Ledger and invoices
- Per-partner statement with running balance, manual adjustment (four-eyes above the threshold), and PDF/CSV export.
- The receivables-ageing report (0–30, 31–60, 61–90, 90+) lists overdue partners.
- Invoices are generated automatically on CONFIRMED and can be regenerated or voided with an audit entry.

### 3.5 Catalog: products and departures
- Filterable by type (Groups / Hotels / Umrah / Ziarat / Other), supplier, destination and date.
- Products synced from suppliers are **unpublished by default**. Staff publish, feature, and can override content (title, images, description) without touching supplier data.
- The departure grid shows supplier availability, GNK holds, net price (permissioned) and the computed default selling price.

### 3.6 Suppliers (doc §13 "Suppliers")
- A card per supplier: status, adapter, last sync, sync success rate, circuit breaker state.
- Detail tabs: Settings (base URL, timeouts, sync interval), Credentials (write-only; shows "configured ✓" and never reveals the value), Sync history, Call log, and a Test connection button.
- Manual sync (rate-limited, queue-locked) and a maintenance toggle (hides that supplier's products from partners).

### 3.7 Staff and roles
- Invite staff (email + roles). Disable, reset 2FA, force logout.
- Roles screen: a permission matrix (checkboxes). System roles are read-only except for SUPER_ADMIN, and custom roles are supported later.

### 3.8 Audit log
Filters: actor, action, entity, and date range. The JSON before/after diff viewer highlights changed fields. Export requires `audit:read`.

### 3.9 Settings
Booking ID prefix, quote TTL, hold TTL, separation-of-duties toggle, ledger adjustment threshold, notification templates, business info on invoices, PII retention period.

## 4. Pricing engine (doc §4, §12)

### 4.1 Scopes and precedence (most specific wins)

| Rank | Scope | Matches when |
|:-:|---|---|
| 1 | `PARTNER_PRODUCT` | `accountId` **and** (`productId` or `departureId`) match |
| 2 | `PARTNER` | `accountId` matches (optionally narrowed by `productType`/`supplierId`) |
| 3 | `TIER` *(via `pricingTierId`)* | the partner's tier matches |
| 4 | `DEPARTURE` | `departureId` matches |
| 5 | `PRODUCT` | `productId` matches |
| 6 | `PRODUCT_TYPE` | `productType` matches (optionally narrowed by supplier) |
| 7 | `SUPPLIER` | `supplierId` matches |
| 8 | `DEFAULT` | always (exactly one active DEFAULT required, enforced) |

### 4.2 Algorithm

```
candidates = active rules where validFrom ≤ now ≤ validTo and all non-null selectors match
sort candidates by (rank asc, priority desc, updatedAt desc)
base  = first candidate                                   // the "winning" rule
extra = candidates after base where stackable = true      // explicit add-ons only, e.g. seasonal +2,000
markup = Σ apply(rule, net) for rule in [base, ...extra]
    apply(FIXED v)      = v
    apply(PERCENTAGE p) = clamp(net × p/100, minMarkup, maxMarkup)
price = round(net + markup, base.rounding)
guard: price ≥ net (no negative markup unless setting allow_below_net = true & permission)
return { net, markup, price, applied: [...ids], evaluated: [...ids with reason skipped] }
```

Worked example, using the doc's numbers:

| Case | Rules matching | Result |
|---|---|---|
| XYZ Travels, Dubai | DEFAULT +10,000 | 185,000 + 10,000 = **195,000** |
| ABC Travels, any product | PARTNER 5% (rank 2) beats DEFAULT | 185,000 × 1.05 = **194,250** |
| ABC Travels, Dubai Group | PARTNER_PRODUCT +12,000 (rank 1) beats all | **197,000** |
| Any partner, Dubai Group | PRODUCT +10,000 (rank 5) beats DEFAULT | **195,000** |

### 4.3 Admin UX
- The rules table is grouped by scope and shows conflict warnings when two rules share the same scope, selectors and priority.
- The rule editor picks the scope first, then shows only the relevant selectors (searchable partner, product and departure pickers). It includes a markup type toggle, value, min/max, rounding, validity window and a stackable checkbox.
- **Simulator** (`/admin/pricing/simulate`): pick a partner, departure and seats, and see every rule evaluated with why it was skipped or applied, plus the final price. The editor offers the same "preview impact" before saving: *"This change affects 3 partners and 12 departures; average price +2.1%"*.
- Every change is versioned and audited. Existing quotes and bookings keep their snapshot; there's no retroactive repricing.

## 5. Admin route guards

```ts
{ element: <AdminShell/>, loader: requireStaffSession /* + 2FA complete */, children: [
  { index: true,            element: <Dashboard/>,  loader: requirePerm('dashboard:view') },
  { path: 'partners/*',     element: <Partners/>,   loader: requirePerm('partners:read') },
  { path: 'bookings/*',     element: <Bookings/>,   loader: requirePerm('bookings:read') },
  { path: 'payments/*',     element: <Payments/>,   loader: requirePerm('payments:read') },
  { path: 'pricing/*',      element: <Pricing/>,    loader: requirePerm('pricing:read') },
  { path: 'catalog/*',      element: <Catalog/>,    loader: requirePerm('catalog:read') },
  { path: 'suppliers/*',    element: <Suppliers/>,  loader: requirePerm('suppliers:read') },
  { path: 'ledger/*',       element: <Ledger/>,     loader: requirePerm('ledger:read') },
  { path: 'staff/*',        element: <Staff/>,      loader: requirePerm('staff:manage') },
  { path: 'audit',          element: <Audit/>,      loader: requirePerm('audit:read') },
  { path: 'settings',       element: <Settings/>,   loader: requirePerm('settings:manage') },
]}
```

A missing permission renders a 403 page, never a silent redirect. There is **no fallback to SUPER_ADMIN** (fixes RBAC-08).
