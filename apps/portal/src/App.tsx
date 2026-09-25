import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell, ThemeProvider, ThemeToggle } from '@gnk/ui';
import { LayoutDashboard, Users, CreditCard, FileText, Settings, BookOpen } from 'lucide-react';
import { DashboardPage } from './pages/DashboardPage';
import { RegisterPage } from './pages/RegisterPage';
import { LoginPage } from './pages/LoginPage';
import { TeamPage } from './pages/TeamPage';
import { GroupsPage } from './pages/GroupsPage';
import { GroupDetailPage } from './pages/GroupDetailPage';
import { NewBookingPage } from './pages/NewBookingPage';

const queryClient = new QueryClient();

function PortalLayout() {
  const navItems = [
    { title: 'Dashboard', href: '/', icon: LayoutDashboard, isActive: true },
    { title: 'Catalog & Groups', href: '/groups', icon: BookOpen },
    { title: 'My Bookings', href: '/bookings', icon: FileText },
    { title: 'Ledger & Payments', href: '/payments', icon: CreditCard },
    { title: 'Team', href: '/team', icon: Users },
  ];

  const user = {
    name: 'Tariq Mansoor',
    email: 'agent@abctravels.com',
  };

  return (
    <AppShell
      navItems={navItems}
      user={user}
      logo={<div className="font-bold text-xl text-primary">GNK Connect</div>}
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
