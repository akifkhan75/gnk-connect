// Staff permission catalogue and system role grants (plan 04 §4.2).
// The API seeds these into Role/Permission tables; the admin app uses the keys
// to show or hide navigation and actions. The API is always the authority.

export const PERMISSIONS = {
  'dashboard:view': 'View the admin dashboard',
  'partners:read': 'View partner accounts',
  'partners:review': 'Approve, reject or request more info on partners',
  'partners:suspend': 'Suspend and reactivate partners',
  'partners:credit_limit': 'Set partner credit limits and pricing tiers',
  'bookings:read': 'View bookings',
  'bookings:approve': 'Approve or reject booking requests',
  'bookings:push_supplier': 'Push approved bookings to the supplier',
  'bookings:cancel': 'Cancel bookings',
  'bookings:view_supplier_net': 'See supplier net fares and margins',
  'bookings:reveal_pii': 'Reveal full passport numbers',
  'payments:read': 'View payments',
  'payments:verify': 'Verify, reject and record payments',
  'ledger:read': 'View ledgers, vouchers, statements and financial reports',
  'ledger:adjust': 'Post manual partner balance adjustments',
  'ledger:post': 'Post receipt and payment vouchers',
  'ledger:jv_prepare': 'Prepare journal vouchers',
  'ledger:jv_approve': 'Approve and post journal vouchers, reverse vouchers',
  'ledger:coa': 'Manage the chart of accounts, currencies and exchange rates',
  'ledger:periods': 'Close and reopen accounting periods',
  'pricing:read': 'View pricing rules',
  'pricing:write': 'Create and edit pricing rules',
  'catalog:read': 'View products and departures',
  'catalog:publish': 'Publish and feature products',
  'suppliers:read': 'View suppliers and call logs',
  'suppliers:sync': 'Run supplier inventory sync',
  'staff:manage': 'Add, invite, disable and assign roles to staff',
  'roles:manage': 'Create and edit custom staff roles',
  'partner_users:manage': 'Add, invite, disable and reset partner users',
  'audit:read': 'View the audit log',
  'settings:manage': 'Change platform settings',
} as const;

export type Permission = keyof typeof PERMISSIONS;
export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

export const STAFF_ROLES = {
  SUPER_ADMIN: { name: 'Super admin', permissions: ALL_PERMISSIONS },
  OPERATIONS: {
    name: 'Operations',
    permissions: [
      'dashboard:view',
      'partners:read',
      'bookings:read',
      'bookings:approve',
      'bookings:push_supplier',
      'bookings:cancel',
      'bookings:view_supplier_net',
      'bookings:reveal_pii',
      'payments:read',
      'pricing:read',
      'catalog:read',
      'catalog:publish',
      'suppliers:read',
      'suppliers:sync',
    ],
  },
  FINANCE: {
    name: 'Finance',
    permissions: [
      'dashboard:view',
      'partners:read',
      'partners:credit_limit',
      'bookings:read',
      'bookings:view_supplier_net',
      'payments:read',
      'payments:verify',
      'ledger:read',
      'ledger:adjust',
      'ledger:post',
      'ledger:jv_prepare',
      'ledger:jv_approve',
      'ledger:coa',
      'ledger:periods',
      'pricing:read',
      'audit:read',
    ],
  },
  PARTNER_MANAGER: {
    name: 'Partner manager',
    permissions: [
      'dashboard:view',
      'partners:read',
      'partners:review',
      'partners:suspend',
      'partner_users:manage',
      'bookings:read',
    ],
  },
  PRICING_MANAGER: {
    name: 'Pricing manager',
    permissions: [
      'dashboard:view',
      'partners:read',
      'bookings:view_supplier_net',
      'pricing:read',
      'pricing:write',
      'catalog:read',
    ],
  },
  SUPPORT: {
    name: 'Support (read only)',
    permissions: [
      'dashboard:view',
      'partners:read',
      'bookings:read',
      'payments:read',
      'catalog:read',
    ],
  },
} satisfies Record<string, { name: string; permissions: Permission[] }>;

export type StaffRoleKey = keyof typeof STAFF_ROLES;
export const STAFF_ROLE_KEYS = Object.keys(STAFF_ROLES) as StaffRoleKey[];

/** Groups for the role editor's permission matrix. */
export const PERMISSION_GROUPS: { label: string; prefix: string }[] = [
  { label: 'Dashboard', prefix: 'dashboard:' },
  { label: 'Partners', prefix: 'partners:' },
  { label: 'Partner users', prefix: 'partner_users:' },
  { label: 'Bookings', prefix: 'bookings:' },
  { label: 'Payments', prefix: 'payments:' },
  { label: 'Accounting', prefix: 'ledger:' },
  { label: 'Pricing', prefix: 'pricing:' },
  { label: 'Catalog', prefix: 'catalog:' },
  { label: 'Suppliers', prefix: 'suppliers:' },
  { label: 'Staff and roles', prefix: 'staff:' },
  { label: 'Staff and roles', prefix: 'roles:' },
  { label: 'System', prefix: 'audit:' },
  { label: 'System', prefix: 'settings:' },
];

// ---------- Partner (portal) capabilities ----------
// Partner roles are fixed; this map is the single source for what each role may do.
// The API guards routes with it and the portal hides what a role cannot use.

export const PARTNER_CAPABILITIES = {
  'bookings:create': 'Request quotes and bookings',
  'bookings:view_all': "See every booking in the account, not only one's own",
  'payments:submit': 'Submit payments with proof',
  'payments:view': 'See payments and receipts',
  'ledger:view': 'See the account statement',
  'invoices:view': 'See invoices',
  'team:manage': 'Add, invite and manage team members',
  'account:manage': 'Edit the company profile and KYC documents',
} as const;

export type PartnerCapability = keyof typeof PARTNER_CAPABILITIES;

export const PARTNER_ROLE_CAPABILITIES: Record<
  'OWNER' | 'MANAGER' | 'STAFF' | 'ACCOUNTANT',
  PartnerCapability[]
> = {
  OWNER: Object.keys(PARTNER_CAPABILITIES) as PartnerCapability[],
  MANAGER: [
    'bookings:create',
    'bookings:view_all',
    'payments:submit',
    'payments:view',
    'ledger:view',
    'invoices:view',
    'team:manage',
  ],
  STAFF: ['bookings:create', 'invoices:view'],
  ACCOUNTANT: [
    'bookings:view_all',
    'payments:submit',
    'payments:view',
    'ledger:view',
    'invoices:view',
  ],
};

export const partnerCan = (
  role: keyof typeof PARTNER_ROLE_CAPABILITIES,
  capability: PartnerCapability,
) => PARTNER_ROLE_CAPABILITIES[role].includes(capability);
