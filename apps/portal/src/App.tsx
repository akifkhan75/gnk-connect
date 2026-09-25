import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell, ThemeProvider, ThemeToggle, NotificationBell } from '@gnk/ui';
import { LayoutDashboard, Users, CreditCard, FileText, Settings, BookOpen } from 'lucide-react';
import { DashboardPage } from './pages/DashboardPage';
import { RegisterPage } from './pages/RegisterPage';
import { LoginPage } from './pages/LoginPage';
import { TeamPage } from './pages/TeamPage';
import { GroupsPage } from './pages/GroupsPage';
import { GroupDetailPage } from './pages/GroupDetailPage';
import { NewBookingPage } from './pages/NewBookingPage';
import { WalletPage } from './pages/WalletPage';
import { VoucherPage } from './pages/VoucherPage';
import { BookingDetailPage } from './pages/BookingDetailPage';

const queryClient = new QueryClient();

import { PortalLayout } from './components/PortalLayout';

const router = createBrowserRouter([
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <PortalLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'groups',
        element: <GroupsPage />,
      },
      {
        path: 'groups/:id',
        element: <GroupDetailPage />,
      },
      {
        path: 'groups/book/:quoteId',
        element: <NewBookingPage />,
      },
      {
        path: 'bookings',
        element: <div className="p-4">Bookings Placeholder</div>,
      },
      {
        path: 'bookings/:id',
        element: <BookingDetailPage />,
      },
      {
        path: 'bookings/:id/voucher',
        element: <VoucherPage />,
      },
      {
        path: 'payments',
        element: <WalletPage />,
      },
      {
        path: 'team',
        element: <TeamPage />,
      }
    ]
  },
]);

export function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="gnk-theme">
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
