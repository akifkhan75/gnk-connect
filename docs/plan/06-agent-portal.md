# 06 — Agent Portal (`apps/portal`)

**Goal:** an agent portal whose layout and workflow closely match the **AirDesk agent dashboard**, which agents already know, under GNK Connect branding. GNK owns the data (pricing, statuses, booking IDs), so the portal never exposes AirDesk net prices or AirDesk booking references.

> ⚠️ **Needed from you:** screenshots or a demo login of the AirDesk agent dashboard. Every screen in this spec follows the conventions used by AirDesk-style group-ticketing portals (sidebar + balance bar + sector/airline group table + booking form + ledger). The exact field order, column set and colours are finalised in a design pass against the real screens. We replicate the layout and UX, not AirDesk's logo, trademark, copy or assets.

## 1. Shell layout

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [≡] GNK Connect   │  Search booking / PNR…   │ Balance PKR 450,000 │ Credit 1.5M │ 🔔 ☀/☾ 👤 │  ← top bar (sticky)
├──────────────┬─────────────────────────────────────────────────────────────────────────┤
│ Dashboard    │  Breadcrumb / Page title                                  [Primary CTA] │
│ Groups ▸     │ ─────────────────────────────────────────────────────────────────────── │
│   All Groups │                                                                         │
│   Umrah      │                         page content                                    │
│   UAE / KSA  │                                                                         │
│ My Bookings  │                                                                         │
│ Payments     │                                                                         │
│ Ledger       │                                                                         │
│ Invoices     │                                                                         │
│ Team  (owner)│                                                                         │
│ Profile      │                                                                         │
│ ──────────── │                                                                         │
│ Support      │                                                                         │
│ Logout       │                                                                         │
└──────────────┴─────────────────────────────────────────────────────────────────────────┘
```

- Sidebar: 248 px, collapsible to a 72 px icon rail. On mobile (< 1024 px) it becomes an off-canvas drawer, and a bottom tab bar shows the four primary items.
- The top bar always shows the **account balance** and **available credit** (AirDesk-style). A pending account shows a status pill instead.
- Theme toggle (light/dark/system) sits in the top bar and the profile menu.
- The account switcher appears only if the user belongs to more than one account.
- Global search (`⌘K`) finds bookings by GNK reference or passenger surname, and groups by sector or date.

## 2. Auth screens

Auth screens use a split layout: brand panel on the left (hidden on mobile), form card on the right. They follow the theme.

| Route | Content |
|-------|---------|
| `/login` | Email, password (show/hide), "Remember this device" (extends refresh to 30 days), Forgot password, "Become a Partner" CTA. Shows lockout and verification states inline. |
| `/register` | 4-step wizard with a progress indicator (Account type → Business → Contact & password → Review). Autosaves the draft to sessionStorage (not the password). |
| `/verify-email?token=` | Result state, then continue |
| `/forgot`, `/reset?token=` | Standard. Strength meter on reset. |
| `/invite?token=` | Accept team invite: set name and password |
| `/onboarding/documents` | Upload KYC documents per account type, then submit for review |
| `/onboarding/status` | Timeline: Submitted → Under review → Approved / More info required (with admin note plus a fix-and-resubmit action) |

## 3. Pages

### 3.1 Dashboard `/`
Mirrors the doc wireframe and AirDesk's dashboard density:

```
Welcome back, ABC Travels                                   Account: ● Active   AGT-000123

┌ Pending ┐ ┌ Confirmed ┐ ┌ Total ┐ ┌ Awaiting payment ┐ ┌ Balance / Credit ┐
│    3    │ │    18     │ │  42   │ │  PKR 390,000     │ │ 450,000 / 1.5M   │
└─────────┘ └───────────┘ └───────┘ └──────────────────┘ └──────────────────┘

Available Groups (next 30 days)                                    [View all →]
┌──────────┬───────────────┬─────────┬─────────────┬────────┬──────────────┬────────┐
│ Sector   │ Airline       │ Dep     │ Return      │ Seats  │ Price/seat   │        │
│ LHE-DXB  │ Emirates EK623│ 15 Oct  │ 22 Oct      │ 4      │ PKR 195,000  │ [Book] │
│ ISB-JED  │ Saudia SV727  │ 20 Oct  │ 27 Oct      │ 12     │ PKR 225,000  │ [Book] │
└──────────┴───────────────┴─────────┴─────────────┴────────┴──────────────┴────────┘

Recent bookings (5)                     Action needed
GNK-2026-000124 · Dubai · Pending       • Upload payment proof for GNK-2026-000119
…                                       • Passport expiring for 1 pax in GNK-2026-000101
```

**Not-yet-approved state:** the KPI cards are replaced by the onboarding status tracker and a "What happens next" panel. The group table shows no prices and a "Prices visible after approval" chip.

### 3.2 Groups `/groups`
- A filter bar that looks like AirDesk: **Sector/From → To**, **Airline**, **Departure month/date range**, **Product type** (Group/Umrah/…), **Min seats**, and sort (Date, Price, Seats).
- Dense table view by default with a card-view toggle. Server-side pagination. The URL holds the filter state, so it's shareable.
- Each row: sector, airline + flight numbers, dep/return dates, days, baggage, seats left (red when ≤ 5), **GNK selling price per seat** (from `/partner/groups`, already priced for this account), and a Book action.
- The Sold out / Closed state disables the row.

### 3.3 Group detail `/groups/:id`
- Header: title, sector, airline, dates, duration, baggage, seats-left meter.
- Tabs: Overview · Itinerary · Inclusions/Exclusions · Terms.
- A sticky right panel for booking: departure selector, seat stepper (1..min(9, available)), and a live quote from `POST /partner/pricing/quotes` showing unit price, total and quote expiry countdown. It's **"Request booking"** when the account is approved and disabled otherwise.

### 3.4 New booking `/bookings/new?quote=…`
A three-step flow on one page with an anchored stepper:
1. **Passengers:** one card per seat. Title, first/last name (as on passport), gender, DOB, nationality, passport no., passport expiry, optional CNIC. Masks and validation per [09](./09-forms-validation-masking.md). "Copy surname from pax 1" helper. Optional passport-scan upload per passenger.
2. **Review:** group summary, passenger table, price summary (unit × seats = total), payment method notice ("Pay GNK by bank transfer after approval"), agent notes, and a T&C checkbox.
3. **Submit:** sends with an `Idempotency-Key` and goes to the booking detail page with a success toast.

The draft autosaves to IndexedDB so a refresh doesn't lose passenger data. The quote expiry is shown, and a re-quote happens automatically if it expires.

### 3.5 My bookings `/bookings`
- Tabs with counts: **All · Pending approval · Approved (awaiting payment) · Processing · Confirmed · Cancelled/Rejected**.
- Table columns: GNK ref, created, group/sector, departure, pax, total, payment state, status badge, created by (owner/manager only).
- Filters: date range, departure range, status, payment state, search (ref or passenger surname).
- Exports to CSV.

### 3.6 Booking detail `/bookings/:id`
- Header: `Booking #GNK-2026-000124`, status badge, and the actions allowed by the state machine and the user's role (Cancel request, Pay now, Download voucher/invoice).
- **Status timeline** from `BookingStatusEvent`, using the GNK-standard status labels only.
- Passenger list with masked passport numbers (`••••4821`).
- Payment panel: amount due, paid, and history, plus "Submit payment" (method, amount, bank, transaction ref, date, proof upload).
- Documents: e-ticket/voucher (after CONFIRMED) and invoice.

### 3.7 Payments `/payments`
A list of submitted payments with status (Submitted / Verified / Rejected with reason). A "Record payment" button opens the payment form, and GNK's bank account details are shown with copy buttons.

### 3.8 Ledger `/ledger`
An AirDesk-style statement: date, reference, description, debit, credit, running balance. Date-range filter, opening and closing balance, PDF/CSV download.

### 3.9 Invoices `/invoices`
A list of invoices and receipts with PDF download.

### 3.10 Team `/team` (OWNER, MANAGER)
Members table (name, email, role, status, last login), an invite dialog (email + role), a role-change dropdown, remove, and resend or revoke for pending invites.

### 3.11 Profile `/profile`
Tabs:
- **Account** (agency info; editable by the owner, and some fields lock after approval so changes go through a "request change" flow).
- **Documents.**
- **My profile** (name, phone).
- **Security** (change password, active sessions, log out everywhere).
- **Preferences** (theme, email notifications).

### 3.12 Notifications
A bell dropdown plus an `/notifications` page. Events: account status changes, booking status changes, payment verified or rejected, team invites, and upcoming departure reminders (72 h).

## 4. Route guards

```ts
const router = createBrowserRouter([
  { path: '/login', element: <Login/>, loader: redirectIfAuthed },
  { path: '/register', … },
  { element: <PortalShell/>, loader: requireSession, children: [
      { index: true, element: <Dashboard/> },
      { path: 'groups', element: <Groups/> },                                   // prices hidden unless APPROVED
      { path: 'bookings/new', element: <NewBooking/>, loader: requireAccountApproved },
      { path: 'bookings', element: <Bookings/> },
      { path: 'payments', element: <Payments/>, loader: requireRole('OWNER','MANAGER','ACCOUNTANT') },
      { path: 'ledger',   element: <Ledger/>,   loader: requireRole('OWNER','MANAGER','ACCOUNTANT') },
      { path: 'team',     element: <Team/>,     loader: requireRole('OWNER','MANAGER') },
      { path: 'onboarding/*', element: <Onboarding/> },
  ]},
  { path: '*', element: <NotFound/> },
]);
```

On load, the portal restores the session by calling `POST /auth/partner/refresh`, which uses the cookie. Until that returns, a skeleton renders. There's no flash of protected content.

## 5. UX standards

- Every list has loading skeletons, an empty state with a CTA, and an error state with retry.
- Every destructive action has a confirm dialog. Async buttons show pending state and are disabled while in flight.
- Currency is formatted `PKR 195,000` (`Intl.NumberFormat('en-PK')`). Dates use `15 Oct 2026` and times `Asia/Karachi`.
- Keyboard: every action is reachable, focus rings are visible, and dialogs trap focus.
- Performance budget: under 200 kB JS gzip for the initial route, LCP under 2.5 s on 4G. Routes are code-split.
- Accessibility: WCAG 2.2 AA contrast in **both** themes, verified with axe in Playwright.
