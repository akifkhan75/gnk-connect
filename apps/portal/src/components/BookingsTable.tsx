import { useNavigate } from 'react-router-dom';
import type { BookingListItem } from '@gnk/types';
import { DataTable, Money, StatusBadge, formatDate, type Column } from '@gnk/ui';

export function BookingsTable({
  rows,
  loading,
  empty,
  showCreator,
}: {
  rows?: BookingListItem[];
  loading?: boolean;
  empty?: React.ReactNode;
  showCreator?: boolean;
}) {
  const navigate = useNavigate();
  const columns: Column<BookingListItem>[] = [
    {
      key: 'ref',
      header: 'Booking',
      cell: (b) => (
        <div>
          <p className="font-semibold tabular">{b.reference}</p>
          <p className="text-xs text-muted-foreground">{formatDate(b.createdAt)}</p>
        </div>
      ),
    },
    {
      key: 'trip',
      header: 'Trip',
      cell: (b) => (
        <div>
          <p className="font-medium">{b.sector ?? b.title}</p>
          <p className="text-xs text-muted-foreground">{b.airline}</p>
        </div>
      ),
    },
    {
      key: 'dep',
      header: 'Departure',
      cell: (b) => <span className="whitespace-nowrap">{formatDate(b.departureDate)}</span>,
    },
    {
      key: 'pax',
      header: 'Passengers',
      hideBelow: 'lg',
      cell: (b) => (
        <div>
          <p className="truncate">{b.leadPassenger}</p>
          {b.seats > 1 && <p className="text-xs text-muted-foreground">+{b.seats - 1} more</p>}
        </div>
      ),
    },
    ...(showCreator
      ? [
          {
            key: 'by',
            header: 'Booked by',
            hideBelow: 'xl' as const,
            cell: (b: BookingListItem) => b.createdByName,
          },
        ]
      : []),
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      cell: (b) => <Money value={b.totalPrice} className="font-medium" />,
    },
    {
      key: 'status',
      header: 'Status',
      align: 'right',
      cell: (b) => <StatusBadge status={b.status} />,
    },
  ];
  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(b) => b.id}
      loading={loading}
      empty={empty}
      onRowClick={(b) => navigate(`/bookings/${b.id}`)}
    />
  );
}
