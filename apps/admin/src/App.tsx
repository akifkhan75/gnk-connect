import { Suspense, lazy, useCallback } from 'react';
import { RouteError } from '@/components/RouteError';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, ToastProvider, type Theme } from '@gnk/ui';
import { AuthProvider, api, useAuth } from '@/lib/api';
import { queryClient } from '@/lib/query';
import { FullPageSpinner, GuestOnly, RequireAuth } from '@/components/guards';
import { AdminLayout } from '@/components/AdminLayout';
import { LoginPage } from '@/pages/auth/LoginPage';

const page = <K extends string>(load: () => Promise<Record<K, React.ComponentType>>, name: K) =>
  lazy(() => load().then((m) => ({ default: m[name] })));

const ForgotPasswordPage = page(
  () => import('@/pages/auth/ForgotPasswordPage'),
  'ForgotPasswordPage',
);
const ResetPasswordPage = page(() => import('@/pages/auth/ResetPasswordPage'), 'ResetPasswordPage');
const AcceptInvitePage = page(() => import('@/pages/auth/AcceptInvitePage'), 'AcceptInvitePage');
const DashboardPage = page(() => import('@/pages/DashboardPage'), 'DashboardPage');
const BookingsPage = page(() => import('@/pages/BookingsPage'), 'BookingsPage');
const InventoryGroupsPage = page(
  () => import('@/pages/InventoryGroupsPage'),
  'InventoryGroupsPage',
);
const InventoryGroupDetailPage = page(
  () => import('@/pages/InventoryGroupDetailPage'),
  'InventoryGroupDetailPage',
);
const PaymentsPage = page(() => import('@/pages/PaymentsPage'), 'PaymentsPage');
const PartnersPage = page(() => import('@/pages/PartnersPage'), 'PartnersPage');
const PartnerDetailPage = page(() => import('@/pages/PartnerDetailPage'), 'PartnerDetailPage');
const CatalogPage = page(() => import('@/pages/CatalogPage'), 'CatalogPage');
const SuppliersPage = page(() => import('@/pages/SuppliersPage'), 'SuppliersPage');
const PricingPage = page(() => import('@/pages/PricingPage'), 'PricingPage');
const LedgerPage = page(() => import('@/pages/LedgerPage'), 'LedgerPage');
const StatementPage = page(() => import('@/pages/LedgerPage'), 'StatementPage');
const StaffPage = page(() => import('@/pages/StaffPage'), 'StaffPage');
const AuditPage = page(() => import('@/pages/AuditPage'), 'AuditPage');
const SettingsPage = page(() => import('@/pages/SettingsPage'), 'SettingsPage');
const ProfilePage = page(() => import('@/pages/ProfilePage'), 'ProfilePage');
const InvoicePage = page(() => import('@/pages/InvoicePage'), 'InvoicePage');
const VouchersPage = page(() => import('@/pages/accounting/VouchersPage'), 'VouchersPage');
const VoucherEditorPage = page(
  () => import('@/pages/accounting/VoucherEditorPage'),
  'VoucherEditorPage',
);
const VoucherDetailPage = page(
  () => import('@/pages/accounting/VoucherDetailPage'),
  'VoucherDetailPage',
);
const VoucherPrintPage = page(
  () => import('@/pages/accounting/VoucherDetailPage'),
  'VoucherPrintPage',
);
const ChartOfAccountsPage = page(
  () => import('@/pages/accounting/ChartOfAccountsPage'),
  'ChartOfAccountsPage',
);
const ReportsPage = page(() => import('@/pages/accounting/ReportsPage'), 'ReportsPage');
const SetupPage = page(() => import('@/pages/accounting/SetupPage'), 'SetupPage');
const ReceiptPage = page(() => import('@/pages/ReceiptPage'), 'ReceiptPage');
const NotFoundPage = page(() => import('@/pages/NotFoundPage'), 'NotFoundPage');

const router = createBrowserRouter([
  {
    errorElement: <RouteError />,
    children: [
      {
        element: <GuestOnly />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/forgot-password', element: <ForgotPasswordPage /> },
          { path: '/reset-password', element: <ResetPasswordPage /> },
          { path: '/accept-invite', element: <AcceptInvitePage /> },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          { path: '/invoices/:id', element: <InvoicePage /> },
          { path: '/payments/:id/receipt', element: <ReceiptPage /> },
          { path: '/accounting/vouchers/:id/print', element: <VoucherPrintPage /> },
          {
            element: <AdminLayout />,
            children: [
              { index: true, element: <DashboardPage /> },
              { path: 'bookings', element: <BookingsPage /> },
              { path: 'bookings/:id', element: <BookingsPage /> },
              { path: 'inventory-groups', element: <InventoryGroupsPage /> },
              { path: 'inventory-groups/:groupId', element: <InventoryGroupDetailPage /> },
              { path: 'payments', element: <PaymentsPage /> },
              { path: 'partners', element: <PartnersPage /> },
              { path: 'partners/:id', element: <PartnerDetailPage /> },
              { path: 'catalog', element: <CatalogPage /> },
              { path: 'suppliers', element: <SuppliersPage /> },
              { path: 'pricing', element: <PricingPage /> },
              { path: 'ledger', element: <LedgerPage /> },
              { path: 'ledger/:accountId', element: <StatementPage /> },
              { path: 'accounting/vouchers', element: <VouchersPage /> },
              { path: 'accounting/vouchers/new', element: <VoucherEditorPage /> },
              { path: 'accounting/vouchers/:id', element: <VoucherDetailPage /> },
              { path: 'accounting/vouchers/:id/edit', element: <VoucherEditorPage /> },
              { path: 'accounting/accounts', element: <ChartOfAccountsPage /> },
              { path: 'accounting/reports', element: <ReportsPage /> },
              { path: 'accounting/setup', element: <SetupPage /> },
              { path: 'staff', element: <StaffPage /> },
              { path: 'audit', element: <AuditPage /> },
              { path: 'settings', element: <SettingsPage /> },
              { path: 'profile', element: <ProfilePage /> },
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
]);

function ThemedApp() {
  const { status } = useAuth();
  const onThemeChange = useCallback(
    (t: Theme) => {
      if (status === 'authenticated')
        void api.auth
          .setTheme({ theme: t.toUpperCase() as 'LIGHT' | 'DARK' | 'SYSTEM' })
          .catch(() => undefined);
    },
    [status],
  );
  return (
    <ThemeProvider storageKey="gnk-admin-theme" onChange={onThemeChange}>
      <ToastProvider>
        <Suspense fallback={<FullPageSpinner />}>
          <RouterProvider router={router} />
        </Suspense>
      </ToastProvider>
    </ThemeProvider>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemedApp />
      </AuthProvider>
    </QueryClientProvider>
  );
}
