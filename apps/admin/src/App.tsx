import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell, ThemeProvider, ThemeToggle } from '@gnk/ui';
import { LayoutDashboard, ShieldCheck, FileCheck, Users, Settings } from 'lucide-react';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminPartnersPage } from './pages/AdminPartnersPage';

const queryClient = new QueryClient();

function AdminLayout() {
  const navItems = [
    { title: 'Overview', href: '/', icon: LayoutDashboard },
    { title: 'Partners & KYC', href: '/partners', icon: ShieldCheck, isActive: true },
    { title: 'Bookings', href: '/bookings', icon: FileCheck },
    { title: 'Staff Users', href: '/staff', icon: Users },
  ];

  const user = {
    name: 'Super Admin',
    email: 'admin@gnk.com',
  };

  return (
    <AppShell
      navItems={navItems}
      user={user}
      logo={<div className="font-bold text-xl text-primary">GNK Admin</div>}
      sidebarFooter={
        <div className="flex items-center justify-between">
          <ThemeToggle />
          <button className="p-2 hover:bg-muted rounded-full">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      }
    >
      <Outlet />
    </AppShell>
  );
}

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
