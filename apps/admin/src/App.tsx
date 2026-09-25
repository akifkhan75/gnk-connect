import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell, ThemeProvider, ThemeToggle, NotificationBell } from '@gnk/ui';
import { LayoutDashboard, ShieldCheck, FileCheck, Users, Settings } from 'lucide-react';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminPartnersPage } from './pages/AdminPartnersPage';
import { AdminSuppliersPage } from './pages/AdminSuppliersPage';
import { AdminPricingPage } from './pages/AdminPricingPage';
import { AdminBookingsPage } from './pages/AdminBookingsPage';
import { AdminFinancialsPage } from './pages/AdminFinancialsPage';

const queryClient = new QueryClient();

import { AdminLayout } from './components/AdminLayout';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AdminLayout />,
    children: [
      {
        index: true,
        element: <AdminDashboardPage />,
      },
      {
        path: 'partners',
        element: <AdminPartnersPage />,
      },
      {
        path: 'suppliers',
        element: <AdminSuppliersPage />,
      },
      {
        path: 'pricing',
        element: <AdminPricingPage />,
      },
      {
        path: 'bookings',
        element: <AdminBookingsPage />,
      },
      {
        path: 'financials',
        element: <AdminFinancialsPage />,
      }
    ]
  },
]);

export function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="gnk-admin-theme">
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
