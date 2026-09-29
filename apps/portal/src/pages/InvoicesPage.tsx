import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import {
  Badge,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  Money,
  PageHeader,
  formatDate,
} from '@gnk/ui';
import { api } from '@/lib/api';
import { keys } from '@/lib/query';
import { ApprovedGate } from '@/components/guards';

export function InvoicesPage() {
  const navigate = useNavigate();
  const q = useQuery({ queryKey: keys.invoices, queryFn: api.invoices.list });
  return (
    <ApprovedGate>
      <PageHeader
        title="Invoices"
        description="An invoice is issued automatically when a booking is confirmed."
      />
      <Card>
        {q.error ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : (
          <DataTable
            rows={q.data}
            loading={q.isLoading}
            rowKey={(i) => i.id}
            onRowClick={(i) => navigate(`/invoices/${i.id}`)}
            empty={
              <EmptyState
                icon={<FileText />}
                title="No invoices yet"
                description="Invoices appear here once bookings are confirmed."
              />
            }
            columns={[
              {
                key: 'n',
                header: 'Invoice',
                cell: (i) => <span className="font-semibold tabular">{i.number}</span>,
              },
              { key: 'd', header: 'Issued', cell: (i) => formatDate(i.issuedAt) },
              {
                key: 'b',
                header: 'Booking',
                cell: (i) => <span className="tabular">{i.bookingReference}</span>,
              },
              {
                key: 't',
                header: 'Total',
                align: 'right',
                cell: (i) => <Money value={i.total} className="font-medium" />,
              },
              {
                key: 's',
                header: 'Status',
                align: 'right',
                cell: (i) =>
                  i.voided ? (
                    <Badge tone="neutral">Void</Badge>
                  ) : (
                    <Badge tone="success">Issued</Badge>
                  ),
              },
            ]}
          />
        )}
      </Card>
    </ApprovedGate>
  );
}
