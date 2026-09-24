# 08 — Design System and Light/Dark Theming

Applies to **all apps**: website, portal and admin. Mobile follows once it's back in scope.

## 1. `@gnk/ui` package

```
packages/ui/
├── src/
│   ├── styles/
│   │   ├── tokens.css        # CSS variables: light + dark
│   │   ├── theme.css         # Tailwind v4 @theme mapping tokens → utilities
│   │   └── base.css
│   ├── theme/
│   │   ├── ThemeProvider.tsx # light | dark | system, persisted, syncs to server pref
│   │   ├── ThemeToggle.tsx
│   │   └── no-flash.ts       # inline script string for index.html <head>
│   ├── components/           # Button, Input, MaskedInput, Select, Combobox, DatePicker, Checkbox,
│   │                         # Radio, Switch, Textarea, FileDropzone, Form*, Dialog, Drawer, Sheet,
│   │                         # DropdownMenu, Tooltip, Popover, Tabs, Badge, StatusBadge, Card, StatCard,
│   │                         # DataTable, Pagination, EmptyState, Skeleton, Alert, Toast, Stepper,
│   │                         # Timeline, Avatar, Breadcrumbs, CommandMenu, Money, DateText
│   ├── layouts/              # AppShell (sidebar+topbar), AuthLayout, PageHeader
│   └── charts/               # themed Recharts wrappers (admin)
└── package.json
```

- Built on **Radix UI primitives** with shadcn-style source components (owned in-repo, not a black-box dependency), styled with Tailwind v4.
- Each app imports `@gnk/ui/styles.css` once. It has no app-specific colours.
- Storybook (or Ladle) documents every component in both themes and runs visual regression tests.

## 2. Tokens

Brand colours are kept from the current site (navy `#00205B`, cyan `#00A3E0`, gold `#F59E0B`). **Components only use semantic tokens**, never raw `navy-900` or `gray-50`.

```css
/* tokens.css */
:root {
  --background: 0 0% 100%;        --foreground: 222 84% 9%;
  --surface: 210 40% 98%;         --surface-raised: 0 0% 100%;
  --muted: 210 40% 96%;           --muted-foreground: 215 16% 42%;
  --border: 214 32% 91%;          --input: 214 32% 91%;       --ring: 197 100% 44%;
  --primary: 218 100% 18%;        --primary-foreground: 0 0% 100%;      /* navy */
  --accent: 197 100% 44%;         --accent-foreground: 0 0% 100%;      /* cyan */
  --highlight: 38 92% 50%;        --highlight-foreground: 222 84% 9%;  /* gold */
  --success: 142 71% 35%;  --warning: 38 92% 45%;  --danger: 0 72% 50%;  --info: 199 89% 45%;
  --sidebar: 218 100% 18%;        --sidebar-foreground: 210 40% 96%;   --sidebar-active: 197 100% 44%;
  --radius: 0.625rem;
  --shadow-card: 0 1px 2px hsl(222 47% 11% / .06), 0 1px 3px hsl(222 47% 11% / .08);
}
.dark {
  --background: 222 47% 6%;       --foreground: 210 40% 96%;
  --surface: 222 40% 9%;          --surface-raised: 222 35% 12%;
  --muted: 217 33% 15%;           --muted-foreground: 215 20% 65%;
  --border: 217 30% 20%;          --input: 217 30% 22%;       --ring: 197 100% 55%;
  --primary: 197 100% 50%;        --primary-foreground: 222 84% 9%;    /* cyan becomes primary on dark */
  --accent: 197 90% 60%;          --accent-foreground: 222 84% 9%;
  --highlight: 38 92% 55%;        --highlight-foreground: 222 84% 9%;
  --success: 142 60% 45%;  --warning: 38 92% 55%;  --danger: 0 80% 62%;  --info: 199 89% 60%;
  --sidebar: 222 47% 8%;          --sidebar-foreground: 210 40% 90%;   --sidebar-active: 197 100% 55%;
  --shadow-card: 0 0 0 1px hsl(217 30% 20%);
}
```

```css
/* theme.css — Tailwind v4 */
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));
@theme inline {
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-surface: hsl(var(--surface));
  --color-primary: hsl(var(--primary));
  /* … one line per token … */
  --font-sans: 'Outfit', ui-sans-serif, system-ui, sans-serif;
  --font-display: 'Playfair Display', Georgia, serif;   /* website headings only */
}
```

The final hex values are tuned in the design pass. Every foreground/background pair must meet **WCAG AA (4.5:1 text, 3:1 UI)** in both themes. CI checks this with a token contrast script.

## 3. Theme behaviour

- **Modes:** `light`, `dark`, `system` (default), with a three-state toggle in the top bar and in profile preferences.
- **Persistence:** the choice is saved in `localStorage` (`gnk-theme`). For signed-in users it's also saved to `themePreference` on the server, so it follows them across devices.
- **No flash of the wrong theme:** a tiny inline script in each app's `<head>` reads storage or `prefers-color-scheme` and sets `class="dark"` and `color-scheme` on `<html>` before the first paint.
- `system` mode listens for `matchMedia('(prefers-color-scheme: dark)')` changes live.
- `<meta name="theme-color">` is updated per theme so mobile browser chrome matches.
- Charts, the PDF viewer, the map, and third-party widgets (Turnstile) get theme-aware configs.
- Printed invoices, statements and vouchers are **always rendered light**.

## 4. Per-app application

| App | Work |
|-----|------|
| Website | Replace hard-coded `bg-gray-50`/`text-navy-900`/`bg-white` with tokens throughout ~30 pages and components. Hero images get a dark overlay token. Keep the design language: this is a re-skin for dark mode, not a redesign. |
| Portal | Built on tokens from day one. The sidebar is navy in light mode and near-black in dark mode. |
| Admin | Built on tokens from day one. Dense table variant (`size="sm"`) and a zebra option. Status colours come only from `StatusBadge`. |

### Status badge mapping (shared)

| Status | Tone |
|---|---|
| PENDING_APPROVAL, SUBMITTED, UNDER_REVIEW | warning |
| APPROVED, SUBMITTED_TO_SUPPLIER, SUPPLIER_PENDING | info |
| CONFIRMED, VERIFIED, PAID, COMPLETED | success |
| REJECTED, SUPPLIER_FAILED, FAILED | danger |
| CANCELLED, EXPIRED, SUSPENDED | muted |

## 5. Layout and density

- 4 px spacing scale. Content max width is 1440 px in the portal and fluid in the admin.
- Type scale: 12/13 (table), 14 (body app), 16 (body website), 20/24/30 (headings).
- Tables: sticky header, 40 px rows in admin (`sm`) and 48 px in portal. Numeric columns are right-aligned with `tabular-nums`.
- Breakpoints: `sm 640 · md 768 · lg 1024 (sidebar docks) · xl 1280 · 2xl 1536`.
- Motion: 150–200 ms ease-out, disabled under `prefers-reduced-motion`. framer-motion is used only on the website.
