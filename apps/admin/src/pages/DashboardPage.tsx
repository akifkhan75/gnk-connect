import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  BookOpen,
  Building2,
  CheckCircle2,
  CreditCard,
  PlugZap,
  TicketPercent,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  BarChart,
  Button,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  ErrorState,
  Money,
  PageHeader,
  StatCard,
  StatusBadge,
  formatDate,
  formatMoney,
  formatMoneyCompact,
  formatRelative,
} from '@gnk/ui';
import { api, useAuth } from '@/lib/api';
import { useCan } from '@/lib/useCan';

export function DashboardPage() {
  const { session } = useAuth();
  const can = useCan();
  const navigate = useNavigate();
  const q = useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard });
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const d = q.data;
  const k = d?.kpis;

  const queues = [
    {
      label: 'Partners awaiting review',
      value: k?.pendingPartners,
      href: '/partners?status=PENDING',
      perm: can('partners:review'),
      icon: Building2,
    },
    {
      label: 'Bookings awaiting approval',
      value: k?.pendingBookings,
      href: '/bookings?tab=PENDING_APPROVAL',
      perm: can('bookings:approve'),
      icon: BookOpen,
    },
    {
      label: 'Payments to verify',
      value: k?.pendingPayments,
      href: '/payments',
      perm: can('payments:verify'),
      icon: CreditCard,
    },
    {
      label: 'Concession requests',
      value: k?.pendingConcessions,
      href: '/concessions',
      perm: can('bookings:approve'),
      icon: TicketPercent,
    },
  ].filter((x) => x.perm);

  return (
    <>
      <PageHeader
        title={`Good day, ${session!.user.fullName.split(' ')[0]}`}
        description="Last 30 days across all partners."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Bookings"
          value={k?.bookings30d ?? '–'}
          hint="Requested, last 30 days"
          icon={<BookOpen />}
          tone="primary"
        />
        <StatCard
          label="Confirmed"
          value={k?.confirmed30d ?? '–'}
          icon={<CheckCircle2 />}
          tone="success"
        />
        <StatCard
          label="GMV (confirmed)"
          value={formatMoneyCompact(k?.gmv30d)}
          icon={<TrendingUp />}
          tone="gold"
        />
        {k?.margin30d != null && (
          <StatCard
            label="GNK margin"
            value={formatMoneyCompact(k.margin30d)}
            hint={k.gmv30d ? `${((k.margin30d / k.gmv30d) * 100).toFixed(1)}% of GMV` : undefined}
            icon={<TrendingUp />}
          />
        )}
        <StatCard label="Active partners" value={k?.activePartners ?? '–'} icon={<Users />} />
      </div>

      {queues.length > 0 && (
        <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {queues.map((w) => (
            <Link
              key={w.label}
              to={w.href}
              className="flex items-center gap-4 rounded-lg border bg-surface p-4 shadow-card transition-colors hover:border-border-strong"
            >
              <span
                className={`flex size-10 items-center justify-center rounded-md ${w.value ? 'bg-warning-soft text-warning' : 'bg-muted text-muted-foreground'}`}
              >
                <w.icon className="size-5" />
              </span>
              <span className="flex-1">
                <span className="block text-2xl font-semibold tabular">{w.value ?? '–'}</span>
                <span className="block text-[13px] text-muted-foreground">{w.label}</span>
              </span>
              <ArrowRight className="size-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Daily bookings" description="Requests per day (hover a bar for GMV)" />
          <CardBody>
            {d && (
              <BarChart
                data={d.daily.map((x) => ({
                  label: x.date,
                  value: x.bookings,
                  secondary: formatMoney(x.gmv),
                }))}
                format={(v) => `${v} booking${v === 1 ? '' : 's'}`}
              />
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Booking funnel" description="Last 30 days" />
          <CardBody className="space-y-3">
            {d &&
              [
                ['Requested', d.funnel.requested, 'bg-info'],
                ['Approved', d.funnel.approved, 'bg-accent'],
                ['Confirmed', d.funnel.confirmed, 'bg-success'],
                ['Rejected / cancelled', d.funnel.rejected, 'bg-danger'],
              ].map(([label, value, color]) => (
                <div key={label as string}>
                  <div className="mb-1 flex justify-between text-[13px]">
                    <span>{label}</span>
                    <span className="font-semibold tabular">{value}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${color}`}
                      style={{
                        width: `${d.funnel.requested ? ((value as number) / d.funnel.requested) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Top partners" description="By confirmed GMV" />
          <DataTable
            dense
            rows={d?.topPartners}
            loading={q.isLoading}
            rowKey={(p) => p.id}
            onRowClick={(p) => navigate(`/partners/${p.id}`)}
            empty={
              <p className="text-center text-sm text-muted-foreground">
                No confirmed bookings yet.
              </p>
            }
            columns={[
              {
                key: 'n',
                header: 'Partner',
                cell: (p) => (
                  <span className="font-medium">
                    {p.name} <span className="text-xs text-muted-foreground">{p.code}</span>
                  </span>
                ),
              },
              { key: 'b', header: 'Bookings', align: 'right', cell: (p) => p.bookings },
              { key: 'g', header: 'GMV', align: 'right', cell: (p) => <Money value={p.gmv} /> },
            ]}
          />
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Departing in the next 3 weeks"
              description="Departures with active bookings"
            />
            <DataTable
              dense
              rows={d?.upcomingDepartures}
              loading={q.isLoading}
              rowKey={(x) => x.departureId}
              empty={
                <p className="text-center text-sm text-muted-foreground">Nothing departing soon.</p>
              }
              columns={[
                {
                  key: 't',
                  header: 'Sector',
                  cell: (x) => <span className="font-medium">{x.title}</span>,
                },
                { key: 'd', header: 'Date', cell: (x) => formatDate(x.departureDate) },
                {
                  key: 's',
                  header: 'Seats',
                  align: 'right',
                  cell: (x) => `${x.seats} (${x.bookings})`,
                },
              ]}
            />
          </Card>
          {d?.supplier && (
            <Card>
              <CardHeader
                title="Supplier health"
                icon={<PlugZap className="size-4" />}
                actions={
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/suppliers">Open</Link>
                  </Button>
                }
              />
              <CardBody className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{d.supplier.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Last sync {formatRelative(d.supplier.lastSyncAt)}
                  </p>
                </div>
                <div className="text-right">
                  <StatusBadge
                    status={d.supplier.lastSyncStatus === 'OK' ? 'ACTIVE' : 'FAILED'}
                    label={d.supplier.lastSyncStatus === 'OK' ? 'Syncing' : 'Sync failing'}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {d.supplier.failures24h} failed calls (24h)
                  </p>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
