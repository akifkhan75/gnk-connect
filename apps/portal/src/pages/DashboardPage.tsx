import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  Hourglass,
  Plane,
  Wallet,
} from 'lucide-react';
import {
  Alert,
  Button,
  Card,
  CardHeader,
  ErrorState,
  PageHeader,
  StatCard,
  StatusBadge,
  formatDate,
  formatMoney,
} from '@gnk/ui';
import { api, useAuth } from '@/lib/api';
import { keys } from '@/lib/query';
import { ApplicationTracker } from '@/components/ApplicationTracker';
import { GroupsTable } from '@/components/GroupsTable';
import { can } from '@/components/guards';

export function DashboardPage() {
  const { session } = useAuth();
  const account = session!.account;
  const approved = account.accountStatus === 'APPROVED';
  const q = useQuery({ queryKey: keys.dashboard, queryFn: api.dashboard });
  const firstName = session!.user.fullName.split(' ')[0];

  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const d = q.data;

  return (
    <>
      <PageHeader
        title={`Assalam-o-Alaikum, ${firstName}`}
        description={`${account.accountName} · ${account.accountCode}`}
        actions={
          <Button asChild>
            <Link to="/groups">
              <Plane /> Search groups
            </Link>
          </Button>
        }
      />

      {!approved ? (
        <Card className="mb-6">
          <CardHeader
            title="Your partner application"
            description="Complete these steps to unlock partner fares and booking."
            actions={
              <Button asChild size="sm">
                <Link to="/onboarding">Continue application</Link>
              </Button>
            }
          />
          <div className="p-5">
            <ApplicationTracker status={account.accountStatus} />
          </div>
        </Card>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <StatCard
              label="Pending approval"
              value={d?.stats.pendingApproval ?? '–'}
              icon={<Hourglass />}
              tone="warning"
            />
            <StatCard
              label="Awaiting funds"
              value={d?.stats.awaitingPayment ?? '–'}
              icon={<Clock />}
              tone="primary"
              hint="Approved, not yet issued"
            />
            <StatCard
              label="Confirmed"
              value={d?.stats.confirmed ?? '–'}
              icon={<CheckCircle2 />}
              tone="success"
            />
            <StatCard
              label="Departing in 30 days"
              value={d?.stats.upcomingDepartures ?? '–'}
              icon={<CalendarClock />}
            />
            {can.money(account.role) && (
              <StatCard
                label="Available to book"
                value={d ? formatMoney(d.balance.availableFunds) : '–'}
                hint={
                  d &&
                  `Balance ${formatMoney(d.balance.balance)} · Credit ${formatMoney(d.balance.creditLimit)}`
                }
                icon={<Wallet />}
                tone="gold"
                className="col-span-2 md:col-span-1"
              />
            )}
          </div>
          {d?.actions.length ? (
            <div className="mb-6 space-y-2">
              {d.actions.map((a) => (
                <Alert
                  key={a.label}
                  tone={a.tone === 'danger' ? 'danger' : a.tone === 'warning' ? 'warning' : 'info'}
                  action={
                    <Button asChild size="sm" variant="secondary">
                      <Link to={a.link}>Open</Link>
                    </Button>
                  }
                >
                  {a.label}
                </Alert>
              ))}
            </div>
          ) : null}
        </>
      )}

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_400px]">
        <Card>
          <CardHeader
            title="Upcoming departures"
            description={
              approved
                ? 'Your partner fares, per seat'
                : 'Fares are shown once your account is approved'
            }
            actions={
              <Button asChild variant="ghost" size="sm">
                <Link to="/groups">
                  View all <ArrowRight />
                </Link>
              </Button>
            }
          />
          <GroupsTable
            rows={d?.upcomingGroups}
            loading={q.isLoading}
            canBook={approved && can.book(account.role)}
            compact
          />
        </Card>
        <Card>
          <CardHeader
            title="Recent bookings"
            actions={
              approved && (
                <Button asChild variant="ghost" size="sm">
                  <Link to="/bookings">
                    All bookings <ArrowRight />
                  </Link>
                </Button>
              )
            }
          />
          {approved ? (
            <ul className="divide-y">
              {q.isLoading && <li className="p-5 text-sm text-muted-foreground">Loading…</li>}
              {d && !d.recentBookings.length && (
                <li className="p-5 text-sm text-muted-foreground">
                  No bookings yet. Pick a group to make your first request.
                </li>
              )}
              {d?.recentBookings.map((b) => (
                <li key={b.id}>
                  <Link
                    to={`/bookings/${b.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/60"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold tabular">{b.reference}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {b.sector ?? b.title} · {formatDate(b.departureDate)} · {b.seats} pax
                      </p>
                    </div>
                    <StatusBadge status={b.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-start gap-3 p-5 text-sm text-muted-foreground">
              <AlertTriangle className="size-4 shrink-0 text-warning" />
              Booking opens after approval.
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
