import * as React from 'react';
import { Command, Menu, PanelLeft, Search, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { CommandPalette, type CommandItem } from '../components/command';

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

const COLLAPSE_KEY = 'gnk-sidebar-collapsed';
const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
};

/**
 * Application chrome shared by portal and admin: a quiet, translucent sidebar that
 * collapses to an icon rail, a frosted top bar, and a ⌘K command palette built from
 * the navigation plus any extra commands. Routing-agnostic via `renderLink`/`navigate`.
 */
export function AppShell({
  brand,
  brandCompact,
  nav,
  pathname,
  renderLink,
  navigate,
  commands = [],
  topbar,
  sidebarFooter,
  banner,
  children,
}: {
  brand: React.ReactNode;
  /** Mark shown when the sidebar is collapsed. */
  brandCompact?: React.ReactNode;
  nav: NavGroup[];
  pathname: string;
  renderLink: (
    item: NavItem,
    props: {
      className: string;
      onClick?: () => void;
      children: React.ReactNode;
      'aria-current'?: 'page';
      title?: string;
    },
  ) => React.ReactNode;
  /** Used by the command palette to open pages. */
  navigate?: (href: string) => void;
  commands?: CommandItem[];
  topbar?: React.ReactNode;
  sidebarFooter?: React.ReactNode;
  banner?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(readCollapsed);
  const [palette, setPalette] = React.useState(false);
  React.useEffect(() => setOpen(false), [pathname]);
  React.useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    } catch {
      /* private mode */
    }
  }, [collapsed]);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette((p) => !p);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        setCollapsed((c) => !c);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const isActive = (item: NavItem) =>
    item.exact || item.href === '/'
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`);

  const navCommands: CommandItem[] = nav.flatMap((g) =>
    g.items.map((i) => ({
      id: `nav:${i.href}`,
      label: i.label,
      group: 'Go to',
      icon: i.icon,
      keywords: g.label,
      onSelect: () => navigate?.(i.href),
    })),
  );

  const sidebar = (rail: boolean) => (
    <div className="flex h-full flex-col border-r border-sidebar-border bg-sidebar/85 text-sidebar-foreground backdrop-blur-2xl">
      <div
        className={cn(
          'flex h-[52px] shrink-0 items-center',
          rail ? 'justify-center px-2' : 'justify-between px-4',
        )}
      >
        {rail ? (brandCompact ?? brand) : brand}
      </div>
      {!rail && navigate && (
        <div className="px-3 pb-2">
          <button
            type="button"
            onClick={() => setPalette(true)}
            className="flex h-8 w-full items-center gap-2 rounded-lg bg-surface/70 px-2.5 text-[13px] text-sidebar-muted shadow-[0_0_0_0.5px_hsl(var(--sidebar-border))] transition-colors hover:text-sidebar-foreground"
          >
            <Search className="size-3.5" />
            <span className="flex-1 text-left">Search</span>
            <kbd className="inline-flex items-center gap-0.5 font-sans text-[11px]">
              <Command className="size-3" />K
            </kbd>
          </button>
        </div>
      )}
      <nav
        className={cn('flex-1 space-y-4 overflow-y-auto py-2', rail ? 'px-2' : 'px-3')}
        aria-label="Main"
      >
        {nav.map((group, gi) => (
          <div key={gi}>
            {group.label &&
              (rail ? (
                gi > 0 && <div className="mx-2 mb-2 h-px bg-sidebar-border" aria-hidden />
              ) : (
                <p className="mb-1 px-2.5 text-[11px] font-semibold text-sidebar-muted">
                  {group.label}
                </p>
              ))}
            <ul className="space-y-px">
              {group.items.map((item) => {
                const active = isActive(item);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    {renderLink(item, {
                      title: rail ? item.label : undefined,
                      className: cn(
                        'group relative flex items-center rounded-lg text-[13.5px] font-medium tracking-[-0.01em] transition-colors duration-150',
                        rail ? 'size-9 justify-center' : 'gap-2.5 px-2.5 py-[7px]',
                        active
                          ? 'bg-surface text-foreground shadow-[0_0_0_0.5px_hsl(var(--sidebar-border)),0_1px_2px_hsl(240_6%_10%/0.06)] dark:bg-sidebar-hover'
                          : 'text-sidebar-foreground/85 hover:bg-sidebar-hover hover:text-sidebar-foreground',
                      ),
                      'aria-current': active ? 'page' : undefined,
                      children: (
                        <>
                          <Icon
                            className={cn(
                              'size-[17px] shrink-0',
                              active
                                ? 'text-sidebar-active'
                                : 'text-sidebar-muted group-hover:text-sidebar-foreground',
                            )}
                          />
                          {!rail && <span className="flex-1 truncate">{item.label}</span>}
                          {item.badge ? (
                            <span
                              className={cn(
                                'tabular rounded-full bg-sidebar-active text-center font-semibold text-white',
                                rail
                                  ? 'absolute right-0.5 top-0.5 size-2 p-0 text-[0px]'
                                  : 'min-w-5 px-1.5 py-px text-[11px]',
                              )}
                            >
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
      <div className={cn('shrink-0 p-3', rail && 'flex justify-center px-2')}>
        {!rail && sidebarFooter}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            'hidden items-center gap-2 rounded-lg text-[12px] text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-foreground lg:flex',
            rail ? 'size-9 justify-center' : 'mt-2 h-8 w-full px-2.5',
          )}
          aria-label={rail ? 'Expand sidebar' : 'Collapse sidebar'}
          title="⌘\"
        >
          <PanelLeft className="size-4" />
          {!rail && 'Collapse'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-background">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden transition-[width] duration-300 ease-[var(--ease)] lg:block',
          collapsed ? 'w-[60px]' : 'w-[240px]',
        )}
      >
        {sidebar(collapsed)}
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-[hsl(240_6%_10%/0.3)] backdrop-blur-sm animate-[gnk-fade-in_180ms_ease-out]"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[272px] animate-[gnk-slide-in-left_280ms_var(--ease)]">
            {sidebar(false)}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground"
              aria-label="Close menu"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      <div
        className={cn(
          'transition-[padding] duration-300 ease-[var(--ease)]',
          collapsed ? 'lg:pl-[60px]' : 'lg:pl-[240px]',
        )}
      >
        <header className="sticky top-0 z-20 flex h-[52px] items-center gap-3 border-b border-border/70 bg-background/75 px-4 backdrop-blur-xl backdrop-saturate-150 sm:px-6">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="-ml-1 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          {topbar}
        </header>
        {banner}
        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-8 lg:py-8">{children}</main>
      </div>

      {navigate && (
        <CommandPalette
          open={palette}
          onOpenChange={setPalette}
          items={[...commands, ...navCommands]}
        />
      )}
    </div>
  );
}
