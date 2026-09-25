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
  'ledger:read': 'View partner ledgers and statements',
  'ledger:adjust': 'Post manual ledger adjustments',
  'pricing:read': 'View pricing rules',
  'pricing:write': 'Create and edit pricing rules',
  'catalog:read': 'View products and departures',
  'catalog:publish': 'Publish and feature products',
  'suppliers:read': 'View suppliers and call logs',
  'suppliers:sync': 'Run supplier inventory sync',
  'staff:manage': 'Invite, disable and assign roles to staff',
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
