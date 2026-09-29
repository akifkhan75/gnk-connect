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
  FilePlus2,
  FileSpreadsheet,
  Landmark,
  LayoutDashboard,
  LogOut,
  Network,
  Percent,
  PlugZap,
  ReceiptText,
  ScrollText,
  Settings,
  UserCog,
  UserRound,
  Wallet,
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
  LiveIndicator,
  Logo,
  NotificationBell,
  SearchInput,
  ThemeToggle,
  titleCase,
  type CommandItem,
  type NavGroup,
  type NavItem,
} from '@gnk/ui';
import { ENV_NAME, api, useAuth } from '@/lib/api';
import { useLiveUpdates } from '@/lib/live';
import { useCan } from '@/lib/useCan';

type Item = NavItem & { perm: Permission };

export function AdminLayout() {
  const { session, logout } = useAuth();
  const can = useCan();
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const live = useLiveUpdates();
  const [search, setSearch] = useState('');
  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    if (search.trim()) navigate(`/bookings?q=${encodeURIComponent(search.trim())}`);
  };
  // Live events keep these fresh; the slow interval only covers a dropped connection.
  const fallback = live === 'live' ? false : 60_000;
  const queues = useQuery({ queryKey: ['queues'], queryFn: api.queues, refetchInterval: fallback });
  const notifications = useQuery({
    queryKey: ['notifications'],
    queryFn: api.notifications.list,
    refetchInterval: fallback,
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
      label: 'Accounting',
      items: [
        {
          label: 'Vouchers',
          href: '/accounting/vouchers',
          icon: ReceiptText,
          perm: 'ledger:read',
          badge: queues.data?.vouchers || null,
        },
        {
          label: 'Chart of accounts',
          href: '/accounting/accounts',
          icon: Network,
          perm: 'ledger:read',
        },
        { label: 'Partner balances', href: '/ledger', icon: ScrollText, perm: 'ledger:read' },
        {
          label: 'Reports',
          href: '/accounting/reports',
          icon: FileSpreadsheet,
          perm: 'ledger:read',
        },
        {
          label: 'Currencies & periods',
          href: '/accounting/setup',
          icon: Landmark,
          perm: 'ledger:read',
        },
      ],
    },
    {
      label: 'Catalog',
      items: [
        { label: 'Products', href: '/catalog', icon: Boxes, perm: 'catalog:read' },
        { label: 'Suppliers', href: '/suppliers', icon: PlugZap, perm: 'suppliers:read' },
        { label: 'Pricing rules', href: '/pricing', icon: Percent, perm: 'pricing:read' },
      ],
    },
    {
      label: 'System',
      items: [
        { label: 'Users & roles', href: '/staff', icon: UserCog, perm: 'staff:manage' },
        { label: 'Audit log', href: '/audit', icon: FileClock, perm: 'audit:read' },
        { label: 'Settings', href: '/settings', icon: Settings, perm: 'settings:manage' },
      ],
    },
  ];
  const nav: NavGroup[] = groups
    .map((g) => ({ ...g, items: g.items.filter((i) => can(i.perm)) }))
    .filter((g) => g.items.length);

  const commands: CommandItem[] = [
    ...(can('ledger:jv_prepare')
      ? [
          {
            id: 'new-jv',
            label: 'New journal voucher',
            group: 'Create',
            icon: FilePlus2,
            onSelect: () => navigate('/accounting/vouchers/new?type=JOURNAL'),
          },
        ]
      : []),
    ...(can('ledger:post')
      ? [
          {
            id: 'new-pv',
            label: 'New payment voucher',
            group: 'Create',
            icon: Wallet,
            onSelect: () => navigate('/accounting/vouchers/new?type=PAYMENT'),
          },
          {
            id: 'new-rv',
            label: 'New receipt voucher',
            group: 'Create',
            icon: ReceiptText,
            onSelect: () => navigate('/accounting/vouchers/new?type=RECEIPT'),
          },
        ]
      : []),
    ...(can('payments:verify')
      ? [
          {
            id: 'record-payment',
            label: 'Record a partner payment',
            group: 'Create',
            icon: CreditCard,
            onSelect: () => navigate('/payments?record=1'),
          },
        ]
      : []),
    ...(can('staff:manage')
      ? [
          {
            id: 'add-user',
            label: 'Add a staff user',
            group: 'Create',
            icon: UserCog,
            onSelect: () => navigate('/staff?add=1'),
          },
        ]
      : []),
  ];

  return (
    <AppShell
      pathname={location.pathname}
      nav={nav}
      navigate={navigate}
      commands={commands}
      brand={
        <Link to="/">
          <Logo product="Admin" size={34} />
        </Link>
      }
      brandCompact={
        <Link to="/" aria-label="Dashboard">
          <Logo compact size={28} />
        </Link>
      }
      renderLink={(item, props) => (
        <NavLink
          to={item.href}
          end={item.href === '/'}
          className={props.className}
          aria-current={props['aria-current']}
          title={props.title}
        >
          {props.children}
        </NavLink>
      )}
      sidebarFooter={
        <div className="flex items-center gap-2.5 rounded-lg px-1.5 py-1">
          <Avatar name={session!.user.fullName} className="size-7" />
          <div className="min-w-0 text-[12px] leading-tight">
            <p className="truncate font-medium text-sidebar-foreground">{session!.user.fullName}</p>
            <p className="truncate text-sidebar-muted">
              {session!.roles.map((r) => titleCase(r.replace(/^CUSTOM_/, ''))).join(', ')}
            </p>
          </div>
        </div>
      }
      topbar={
        <>
          {ENV_NAME && (
            <Badge
              tone={ENV_NAME === 'PROD' ? 'danger' : ENV_NAME === 'STAGING' ? 'warning' : 'neutral'}
              className="font-semibold tracking-wider"
            >
              {ENV_NAME}
            </Badge>
          )}
          {can('bookings:read') && (
            <form onSubmit={onSearch} className="hidden w-full max-w-xs md:block">
              <SearchInput
                placeholder="Booking, PNR, partner or passenger"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search bookings"
                className="[&_input]:h-8 [&_input]:bg-muted/60 [&_input]:shadow-none"
              />
            </form>
          )}
          <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
            <LiveIndicator status={live} className="mr-1.5" />
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
                  className="flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-1.5 transition-colors hover:bg-muted"
                >
                  <Avatar name={session!.user.fullName} className="size-7" />
                  <ChevronDown className="size-3.5 text-muted-foreground" />
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
