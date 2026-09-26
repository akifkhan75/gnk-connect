import { useState, type FormEvent } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  Building2,
  ChevronDown,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  ScrollText,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react';
import {
  AppShell,
  Avatar,
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
  StatusBadge,
  ThemeToggle,
  formatMoney,
  type NavGroup,
} from '@gnk/ui';
import { api, useAuth } from '@/lib/api';
import { keys } from '@/lib/query';
import { useLiveUpdates } from '@/lib/live';
import { useServiceListings } from '@/lib/services';
import { ROLE_LABEL } from '@/lib/labels';
import { can } from './guards';

export function PortalLayout() {
  const { session, logout, switchAccount } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const account = session!.account;
  const approved = account.accountStatus === 'APPROVED';
  const role = account.role;

  const live = useLiveUpdates();
  const listings = useServiceListings();
  const fallback = live === 'live' ? false : 60_000;
  const balance = useQuery({
    queryKey: keys.balance,
    queryFn: api.ledger.balance,
    enabled: approved,
    refetchInterval: fallback,
  });
  const notifications = useQuery({
    queryKey: keys.notifications,
    queryFn: api.notifications.list,
    refetchInterval: fallback,
  });
  const counts = useQuery({
    queryKey: keys.bookingCounts,
    queryFn: api.bookings.counts,
    enabled: approved,
  });

  const nav: NavGroup[] = [
    { items: [{ label: 'Dashboard', href: '/', icon: LayoutDashboard }] },
    {
      label: 'Book',
      items: listings.map((l) => ({ label: l.title, href: `/book/${l.slug}`, icon: l.icon })),
    },
    ...(approved
      ? [
          {
            label: 'Bookings',
            items: [
              {
                label: 'My bookings',
                href: '/bookings',
                icon: BookOpen,
                badge: counts.data?.APPROVED || null,
              },
              { label: 'Invoices', href: '/invoices', icon: FileText },
              ...(can.money(role)
                ? [{ label: 'Payments & receipts', href: '/payments', icon: Wallet }]
                : []),
              ...(can.ledger(role)
                ? [{ label: 'Statement', href: '/ledger', icon: ScrollText }]
                : []),
            ],
          },
        ]
      : []),
    {
      label: 'Account',
      items: [
        ...(!approved ? [{ label: 'Application', href: '/onboarding', icon: ClipboardCheck }] : []),
        { label: 'Agency profile', href: '/account', icon: Building2 },
        ...(can.team(role) && account.accountType === 'AGENCY'
          ? [{ label: 'Team', href: '/team', icon: Users }]
          : []),
        { label: 'My profile', href: '/profile', icon: UserRound },
      ],
    },
  ];

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    if (search.trim()) navigate(`/bookings?q=${encodeURIComponent(search.trim())}`);
  };

  return (
    <AppShell
      pathname={location.pathname}
      nav={nav}
      navigate={navigate}
      commands={[
        ...(approved && can.book(role)
          ? listings.map((l) => ({
              id: `book-${l.slug}`,
              label: `Book ${l.title.toLowerCase()}`,
              group: 'Book',
              icon: l.icon,
              onSelect: () => navigate(`/book/${l.slug}`),
            }))
          : []),
        ...(approved && can.pay(role)
          ? [
              {
                id: 'pay',
                label: 'Submit a payment',
                group: 'Actions',
                icon: Wallet,
                onSelect: () => navigate('/payments?new=1'),
              },
            ]
          : []),
        ...(can.team(role) && account.accountType === 'AGENCY'
          ? [
              {
                id: 'team',
                label: 'Add a team member',
                group: 'Actions',
                icon: Users,
                onSelect: () => navigate('/team?add=1'),
              },
            ]
          : []),
      ]}
      brand={
        <Link to="/">
          <Logo product="Partner Portal" size={34} />
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
          onClick={props.onClick}
          aria-current={props['aria-current']}
          title={props.title}
        >
          {props.children}
        </NavLink>
      )}
      sidebarFooter={
        <div className="rounded-lg px-1.5 py-1 text-xs">
          <p className="truncate font-medium text-sidebar-foreground">{account.accountName}</p>
          <p className="mt-0.5 text-sidebar-muted">
            {account.accountCode} · {ROLE_LABEL[role]}
          </p>
        </div>
      }
      banner={
        !approved && location.pathname !== '/onboarding' ? (
          <div className="border-b border-warning/20 bg-warning-soft/80 px-4 py-2.5 text-[13px] backdrop-blur sm:px-8">
            <span className="font-medium">
              Your account is{' '}
              {account.accountStatus === 'DRAFT' ? 'not yet submitted' : 'awaiting approval'}.
            </span>{' '}
            <span className="text-foreground/75">
              Partner fares and booking unlock once GNK Connect approves it.
            </span>{' '}
            <Link to="/onboarding" className="font-medium text-link hover:underline">
              View application →
            </Link>
          </div>
        ) : null
      }
      topbar={
        <>
          {approved ? (
            <form onSubmit={onSearch} className="hidden w-full max-w-xs md:block">
              <SearchInput
                className="[&_input]:h-8 [&_input]:bg-muted/60 [&_input]:shadow-none"
                placeholder="Search bookings, PNR or passenger"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search bookings"
              />
            </form>
          ) : (
            <div className="flex-1" />
          )}
          <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
            <LiveIndicator status={live} className="mr-1.5" />
            {approved && balance.data && can.ledger(role) && (
              <Link
                to="/ledger"
                className="mr-1 hidden items-center gap-3 rounded-full bg-muted/70 px-3.5 py-1.5 text-xs transition-colors hover:bg-muted sm:flex"
                title="Balance and available credit"
              >
                <span>
                  <span className="text-muted-foreground">Balance </span>
                  <span
                    className={`tabular font-semibold ${balance.data.balance < 0 ? 'text-danger' : ''}`}
                  >
                    {formatMoney(balance.data.balance)}
                  </span>
                </span>
                <span className="h-4 w-px bg-border" />
                <span>
                  <span className="text-muted-foreground">Available </span>
                  <span className="tabular font-semibold text-highlight-strong">
                    {formatMoney(balance.data.availableFunds)}
                  </span>
                </span>
              </Link>
            )}
            {!approved && (
              <StatusBadge status={account.accountStatus} className="hidden sm:inline-flex" />
            )}
            <NotificationBell
              items={notifications.data?.items ?? []}
              unread={notifications.data?.unread ?? 0}
              onOpenItem={async (n) => {
                if (!n.readAt) await api.notifications.read(n.id);
                void qc.invalidateQueries({ queryKey: keys.notifications });
                if (n.link) navigate(n.link);
              }}
              onReadAll={async () => {
                await api.notifications.readAll();
                void qc.invalidateQueries({ queryKey: keys.notifications });
              }}
              onViewAll={() => navigate('/notifications')}
            />
            <ThemeToggle className="hidden sm:inline-flex" />
            <DropdownMenu>
              <DropdownTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-full py-0.5 pl-0.5 pr-1.5 transition-colors hover:bg-muted"
                >
                  <Avatar name={session!.user.fullName} className="size-7" />
                  <span className="hidden text-left leading-tight lg:block">
                    <span className="block max-w-36 truncate text-[13px] font-medium">
                      {session!.user.fullName}
                    </span>
                    <span className="block max-w-36 truncate text-[11px] text-muted-foreground">
                      {account.accountName}
                    </span>
                  </span>
                  <ChevronDown className="size-4 text-muted-foreground" />
                </button>
              </DropdownTrigger>
              <DropdownContent className="w-60">
                <DropdownLabel>{session!.user.email}</DropdownLabel>
                {session!.memberships.length > 1 && (
                  <>
                    <DropdownSeparator />
                    <DropdownLabel>Switch account</DropdownLabel>
                    {session!.memberships.map((m) => (
                      <DropdownItem
                        key={m.accountId}
                        onSelect={async () => {
                          if (m.accountId === account.accountId) return;
                          await switchAccount(m.accountId);
                          qc.clear();
                          navigate('/');
                        }}
                      >
                        <Building2 />
                        <span className="flex-1 truncate">{m.accountName}</span>
                        {m.accountId === account.accountId && (
                          <span className="text-xs text-link">Current</span>
                        )}
                      </DropdownItem>
                    ))}
                  </>
                )}
                <DropdownSeparator />
                <DropdownItem onSelect={() => navigate('/profile')}>
                  <UserRound /> My profile
                </DropdownItem>
                {approved && (
                  <DropdownItem onSelect={() => navigate('/invoices')}>
                    <ReceiptText /> Invoices
                  </DropdownItem>
                )}
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
