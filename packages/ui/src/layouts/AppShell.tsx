import * as React from 'react';
import { Menu, X } from 'lucide-react';
import { cn } from '../lib/cn';

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string | null;
  /** Match nested routes (e.g. /bookings/123 highlights Bookings). */
  exact?: boolean;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

/**
 * Application chrome shared by portal and admin: navy sidebar with grouped
 * navigation, sticky top bar, off-canvas drawer below lg.
 * Routing-agnostic: pass `renderLink` to use the app's router links.
 */
export function AppShell({
  brand,
  nav,
  pathname,
  renderLink,
  topbar,
  sidebarFooter,
  banner,
  children,
}: {
  brand: React.ReactNode;
  nav: NavGroup[];
  pathname: string;
  renderLink: (
    item: NavItem,
    props: {
      className: string;
      onClick?: () => void;
      children: React.ReactNode;
      'aria-current'?: 'page';
    },
  ) => React.ReactNode;
  topbar?: React.ReactNode;
  sidebarFooter?: React.ReactNode;
  banner?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => setOpen(false), [pathname]);

  const isActive = (item: NavItem) =>
    item.exact || item.href === '/'
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`);

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 shrink-0 items-center border-b border-sidebar-border px-4">
        {brand}
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Main">
        {nav.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="mb-1.5 px-2.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-sidebar-muted">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    {renderLink(item, {
                      className: cn(
                        'group relative flex items-center gap-3 rounded-md px-2.5 py-2 text-[13.5px] font-medium transition-colors',
                        active
                          ? 'bg-white/10 text-white'
                          : 'text-sidebar-foreground/80 hover:bg-sidebar-hover hover:text-white',
                      ),
                      'aria-current': active ? 'page' : undefined,
                      children: (
                        <>
                          {active && (
                            <span
                              className="absolute inset-y-1.5 left-0 w-[3px] rounded-r bg-sidebar-active"
                              aria-hidden
                            />
                          )}
                          <Icon
                            className={cn(
                              'size-[18px] shrink-0',
                              active
                                ? 'text-sidebar-active'
                                : 'text-sidebar-muted group-hover:text-sidebar-foreground',
                            )}
                          />
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.badge ? (
                            <span className="tabular min-w-5 rounded-full bg-highlight px-1.5 py-px text-center text-[11px] font-bold text-[hsl(222_60%_10%)]">
                              {item.badge}
                            </span>
                          ) : null}
                        </>
                      ),
                    })}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      {sidebarFooter && (
        <div className="shrink-0 border-t border-sidebar-border p-3">{sidebarFooter}</div>
      )}
    </div>
  );

  return (
    <div className="min-h-dvh bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] lg:block">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-[hsl(222_47%_6%/0.5)]"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[272px] animate-[gnk-slide-in-left_180ms_ease-out]">
            {sidebar}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-2 top-3 rounded p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      )}

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-surface/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-surface/80 sm:px-6">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="-ml-1 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          {topbar}
        </header>
        {banner}
        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:py-7">{children}</main>
      </div>
    </div>
  );
}
