import { Suspense, lazy, useCallback } from 'react';
import { RouteError } from '@/components/RouteError';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, ToastProvider, type Theme } from '@gnk/ui';
import { AuthProvider, api, useAuth } from '@/lib/api';
import { queryClient } from '@/lib/query';
import { FullPageSpinner, GuestOnly, RequireAuth } from '@/components/guards';
import { PortalLayout } from '@/components/PortalLayout';
import { LoginPage } from '@/pages/auth/LoginPage';

const RegisterPage = lazy(() =>
  import('@/pages/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })),
);
const ForgotPasswordPage = lazy(() =>
  import('@/pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })),
);
const ResetPasswordPage = lazy(() =>
  import('@/pages/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
);
const VerifyEmailPage = lazy(() =>
  import('@/pages/auth/VerifyEmailPage').then((m) => ({ default: m.VerifyEmailPage })),
);
const AcceptInvitePage = lazy(() =>
  import('@/pages/auth/AcceptInvitePage').then((m) => ({ default: m.AcceptInvitePage })),
);
const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const OnboardingPage = lazy(() =>
  import('@/pages/OnboardingPage').then((m) => ({ default: m.OnboardingPage })),
);
const GroupsPage = lazy(() =>
  import('@/pages/GroupsPage').then((m) => ({ default: m.GroupsPage })),
);
const GroupsRedirect = lazy(() =>
  import('@/pages/GroupsPage').then((m) => ({ default: m.GroupsRedirect })),
);
const GroupDetailPage = lazy(() =>
  import('@/pages/GroupDetailPage').then((m) => ({ default: m.GroupDetailPage })),
);
const InventoryGroupDetailPage = lazy(() =>
  import('@/pages/InventoryGroupDetailPage').then((m) => ({ default: m.InventoryGroupDetailPage })),
);
const NewBookingPage = lazy(() =>
  import('@/pages/NewBookingPage').then((m) => ({ default: m.NewBookingPage })),
);
const BookingsPage = lazy(() =>
  import('@/pages/BookingsPage').then((m) => ({ default: m.BookingsPage })),
);
const BookingDetailPage = lazy(() =>
  import('@/pages/BookingDetailPage').then((m) => ({ default: m.BookingDetailPage })),
);
const VoucherPage = lazy(() =>
  import('@/pages/VoucherPage').then((m) => ({ default: m.VoucherPage })),
);
const InvoicesPage = lazy(() =>
  import('@/pages/InvoicesPage').then((m) => ({ default: m.InvoicesPage })),
);
const ReceiptPage = lazy(() =>
  import('@/pages/ReceiptPage').then((m) => ({ default: m.ReceiptPage })),
);
const InvoicePage = lazy(() =>
  import('@/pages/InvoicePage').then((m) => ({ default: m.InvoicePage })),
);
const PaymentsPage = lazy(() =>
  import('@/pages/PaymentsPage').then((m) => ({ default: m.PaymentsPage })),
);
const LedgerPage = lazy(() =>
  import('@/pages/LedgerPage').then((m) => ({ default: m.LedgerPage })),
);
const TeamPage = lazy(() => import('@/pages/TeamPage').then((m) => ({ default: m.TeamPage })));
const AccountPage = lazy(() =>
  import('@/pages/AccountPage').then((m) => ({ default: m.AccountPage })),
);
const ProfilePage = lazy(() =>
  import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })),
);
const NotificationsPage = lazy(() =>
  import('@/pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })),
);
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
);

const router = createBrowserRouter([
  {
    errorElement: <RouteError />,
    children: [
      {
        element: <GuestOnly />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
          { path: '/forgot-password', element: <ForgotPasswordPage /> },
          { path: '/reset-password', element: <ResetPasswordPage /> },
        ],
      },
      // Reachable signed in or out.
      { path: '/verify-email', element: <VerifyEmailPage /> },
      { path: '/accept-invite', element: <AcceptInvitePage /> },
      {
        element: <RequireAuth />,
        children: [
          // Printable documents render without the app chrome.
          { path: '/bookings/:id/voucher', element: <VoucherPage /> },
          { path: '/invoices/:id', element: <InvoicePage /> },
          { path: '/payments/:id/receipt', element: <ReceiptPage /> },
          {
            element: <PortalLayout />,
            children: [
              { index: true, element: <DashboardPage /> },
              { path: 'onboarding', element: <OnboardingPage /> },
              { path: 'book/:service', element: <GroupsPage /> },
              { path: 'groups', element: <GroupsRedirect /> },
              { path: 'groups/:productId', element: <GroupDetailPage /> },
              { path: 'inventory/groups/:groupId', element: <InventoryGroupDetailPage /> },
              { path: 'bookings', element: <BookingsPage /> },
              { path: 'bookings/new', element: <NewBookingPage /> },
              { path: 'bookings/:id', element: <BookingDetailPage /> },
              { path: 'invoices', element: <InvoicesPage /> },
              { path: 'payments', element: <PaymentsPage /> },
              { path: 'ledger', element: <LedgerPage /> },
              { path: 'team', element: <TeamPage /> },
              { path: 'account', element: <AccountPage /> },
              { path: 'profile', element: <ProfilePage /> },
              { path: 'notifications', element: <NotificationsPage /> },
              { path: 'dashboard', element: <Navigate to="/" replace /> },
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
  // Save the choice on the user's profile so it follows them across devices.
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
    <ThemeProvider storageKey="gnk-portal-theme" onChange={onThemeChange}>
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
