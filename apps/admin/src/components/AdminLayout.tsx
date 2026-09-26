import { useState, type FormEvent } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  Boxes,
  Building2,
  ChevronDown,
  CreditCard,
  FileClock,
  LayoutDashboard,
  LogOut,
  Percent,
  PlugZap,
  ScrollText,
  Settings,
  UserCog,
  UserRound,
} from 'lucide-react';
import type { Permission } from '@gnk/types';
import {
  AppShell,
  Avatar,
  Badge,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
  DropdownSeparator,
  DropdownTrigger,
  Logo,
  NotificationBell,
  SearchInput,
  ThemeToggle,
  titleCase,
  type NavGroup,
  type NavItem,
} from '@gnk/ui';
import { ENV_NAME, api, useAuth } from '@/lib/api';
import { useCan } from '@/lib/useCan';

type Item = NavItem & { perm: Permission };

export function AdminLayout() {
  const { session, logout } = useAuth();
  const can = useCan();
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const queues = useQuery({ queryKey: ['queues'], queryFn: api.queues, refetchInterval: 30_000 });
  const notifications = useQuery({
    queryKey: ['notifications'],
    queryFn: api.notifications.list,
    refetchInterval: 45_000,
  });

  const groups: { label?: string; items: Item[] }[] = [
    { items: [{ label: 'Dashboard', href: '/', icon: LayoutDashboard, perm: 'dashboard:view' }] },
    {
      label: 'Operations',
      items: [
        {
          label: 'Bookings',
          href: '/bookings',
          icon: BookOpen,
          perm: 'bookings:read',
          badge: queues.data?.bookings || null,
        },
        {
          label: 'Payments',
          href: '/payments',
          icon: CreditCard,
          perm: 'payments:read',
          badge: queues.data?.payments || null,
        },
        {
          label: 'Partners',
          href: '/partners',
          icon: Building2,
          perm: 'partners:read',
          badge: queues.data?.partners || null,
        },
      ],
    },
    {
      label: 'Catalog',
      items: [
        { label: 'Products', href: '/catalog', icon: Boxes, perm: 'catalog:read' },
        { label: 'Suppliers', href: '/suppliers', icon: PlugZap, perm: 'suppliers:read' },
      ],
    },
    {
      label: 'Commercial',
      items: [{ label: 'Pricing rules', href: '/pricing', icon: Percent, perm: 'pricing:read' }],
    },
    {
      label: 'Finance',
      items: [{ label: 'Ledger', href: '/ledger', icon: ScrollText, perm: 'ledger:read' }],
    },
    {
      label: 'System',
      items: [
        { label: 'Staff & roles', href: '/staff', icon: UserCog, perm: 'staff:manage' },
        { label: 'Audit log', href: '/audit', icon: FileClock, perm: 'audit:read' },
        { label: 'Settings', href: '/settings', icon: Settings, perm: 'settings:manage' },
      ],
    },
  ];
  const nav: NavGroup[] = groups
    .map((g) => ({ ...g, items: g.items.filter((i) => can(i.perm)) }))
    .filter((g) => g.items.length);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    if (search.trim()) navigate(`/bookings?q=${encodeURIComponent(search.trim())}`);
  };

  return (
    <AppShell
      pathname={location.pathname}
      nav={nav}
      brand={
        <Link to="/">
          <Logo onDark product="Admin Console" />
        </Link>
      }
      renderLink={(item, props) => (
        <NavLink
          to={item.href}
          end={item.href === '/'}
          className={props.className}
          aria-current={props['aria-current']}
        >
          {props.children}
        </NavLink>
      )}
      sidebarFooter={
        <div className="rounded-md bg-white/5 px-3 py-2.5 text-xs">
          <p className="truncate font-medium text-white">{session!.user.fullName}</p>
          <p className="mt-0.5 truncate text-sidebar-muted">
            {session!.roles.map((r) => titleCase(r)).join(', ')}
          </p>
        </div>
      }
      topbar={
        <>
          {ENV_NAME && (
            <Badge
              tone={ENV_NAME === 'PROD' ? 'danger' : ENV_NAME === 'STAGING' ? 'warning' : 'primary'}
              className="font-semibold tracking-wider"
            >
              {ENV_NAME}
            </Badge>
          )}
          {can('bookings:read') ? (
            <form onSubmit={onSearch} className="hidden max-w-sm flex-1 md:block">
              <SearchInput
                placeholder="Find booking, PNR, partner or passenger"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search bookings"
              />
            </form>
          ) : (
            <div className="flex-1" />
          )}
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <NotificationBell
              items={notifications.data?.items ?? []}
              unread={notifications.data?.unread ?? 0}
              onOpenItem={async (n) => {
                if (!n.readAt) await api.notifications.read(n.id);
                void qc.invalidateQueries({ queryKey: ['notifications'] });
                if (n.link) navigate(n.link);
              }}
              onReadAll={async () => {
                await api.notifications.readAll();
                void qc.invalidateQueries({ queryKey: ['notifications'] });
              }}
            />
            <ThemeToggle className="hidden sm:inline-flex" />
            <DropdownMenu>
              <DropdownTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-md py-1 pl-1 pr-1.5 hover:bg-muted"
                >
                  <Avatar name={session!.user.fullName} />
                  <ChevronDown className="size-4 text-muted-foreground" />
                </button>
              </DropdownTrigger>
              <DropdownContent className="w-56">
                <DropdownLabel>{session!.user.email}</DropdownLabel>
                <DropdownSeparator />
                <DropdownItem onSelect={() => navigate('/profile')}>
                  <UserRound /> My profile
                </DropdownItem>
                <div className="px-2.5 py-2 sm:hidden">
                  <ThemeToggle showLabels />
                </div>
                <DropdownSeparator />
                <DropdownItem
                  danger
                  onSelect={async () => {
                    await logout();
                    qc.clear();
                    navigate('/login');
                  }}
                >
                  <LogOut /> Sign out
                </DropdownItem>
              </DropdownContent>
            </DropdownMenu>
          </div>
        </>
      }
    >
      <Outlet />
    </AppShell>
  );
}
