import * as React from 'react';
import { cn } from '../components/Button';
import { User } from 'lucide-react';

export interface AppShellProps extends React.HTMLAttributes<HTMLDivElement> {
  logo?: React.ReactNode;
  navItems: Array<{
    title: string;
    href: string;
    icon: React.ElementType;
    isActive?: boolean;
  }>;
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  onLogout?: () => void;
  onSettings?: () => void;
  onProfile?: () => void;
  sidebarFooter?: React.ReactNode;
}

export function AppShell({
  logo,
  navItems,
  user,
  onLogout,
  onSettings,
  onProfile,
  sidebarFooter,
  children,
  className,
  ...props
}: AppShellProps) {
  return (
    <div className={cn('flex min-h-screen w-full bg-background', className)} {...props}>
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r bg-sidebar text-sidebar-foreground sm:flex">
        <div className="flex h-14 items-center px-4 border-b border-border/10">
          {logo || <span className="text-xl font-bold">GNK Connect</span>}
        </div>
        <div className="flex-1 overflow-auto py-4">
          <nav className="grid gap-1 px-2">
            {navItems.map((item, index) => (
              <a
                key={index}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  item.isActive
                    ? 'bg-sidebar-active text-primary-foreground'
                    : 'hover:bg-sidebar-active/50 hover:text-primary-foreground',
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </a>
            ))}
          </nav>
        </div>
        {sidebarFooter && <div className="p-4 border-t border-border/10">{sidebarFooter}</div>}
      </aside>

      {/* Main Content */}
      <div className="flex flex-col sm:pl-64 flex-1 w-full">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-surface/95 px-4 backdrop-blur sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 sm:pt-4">
          <div className="flex flex-1 items-center justify-between">
            <h1 className="text-lg font-semibold md:text-2xl hidden sm:block">Dashboard</h1>
            <div className="flex items-center gap-4 ml-auto">
              {/* Topbar Actions could go here */}
              {user && (
                <div className="flex items-center gap-2">
                  <div className="text-sm text-right hidden md:block">
                    <p className="font-medium leading-none">{user.name}</p>
                    <p className="text-muted-foreground text-xs">{user.email}</p>
                  </div>
                  <button
                    onClick={onProfile}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-muted overflow-hidden"
                  >
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 w-full max-w-[1440px] mx-auto">{children}</main>
      </div>
    </div>
  );
}
