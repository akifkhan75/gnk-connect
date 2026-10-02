import { useState } from 'react';
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
  Pagination,
  SearchInput,
  Select,
  filterPage,
  formatDate,
  includesQ,
} from '@gnk/ui';
import { api } from '@/lib/api';
import { keys } from '@/lib/query';
import { ApprovedGate } from '@/components/guards';

export function InvoicesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const q = useQuery({ queryKey: keys.invoices, queryFn: api.invoices.list });
  const list = filterPage(q.data, {
    q: search,
    page,
    match: (i, s) => includesQ(i.number, i.bookingReference).includes(s),
    filter: (i) => status === 'all' || (status === 'void' ? i.voided : !i.voided),
  });
  return (
    <ApprovedGate>
      <PageHeader
        title="Invoices"
        description="An invoice is issued automatically when a booking is confirmed."
      />
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <SearchInput
            className="min-w-[16rem] flex-1"
            placeholder="Search invoice or booking"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <Select
            className="w-36"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            aria-label="Status"
          >
            <option value="all">All statuses</option>
            <option value="issued">Issued</option>
            <option value="void">Void</option>
          </Select>
        </div>
        {q.error ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : (
          <DataTable
            rows={list.items}
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
        <Pagination
          page={list.page}
          pageSize={list.pageSize}
          total={list.total}
          onChange={setPage}
        />
      </Card>
    </ApprovedGate>
  );
}
