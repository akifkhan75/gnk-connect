import { DataTable, StatusBadge, Button } from '@gnk/ui';
import { Search } from 'lucide-react';

export function AdminPartnersPage() {
  const partners = [
    {
      id: 'acc-1',
      name: 'ABC Travels',
      type: 'AGENCY',
      city: 'Karachi',
      status: 'PENDING_APPROVAL',
      submittedAt: '2023-10-24T10:00:00Z',
    },
    {
      id: 'acc-2',
      name: 'XYZ Tours',
      type: 'AGENCY',
      city: 'Lahore',
      status: 'APPROVED',
      submittedAt: '2023-10-20T10:00:00Z',
    }
  ];

  const columns = [
    { key: 'name', title: 'Agency Name' },
    { key: 'city', title: 'City' },
    { key: 'status', title: 'Status', render: (row: any) => <StatusBadge status={row.status} className="text-xs" /> },
    { key: 'submittedAt', title: 'Submitted', render: (row: any) => new Date(row.submittedAt).toLocaleDateString() },
    { 
      key: 'actions', 
      title: '', 
      align: 'right' as const, 
      render: (row: any) => (
        <Button variant="outline" size="sm">Review</Button>
      )
    },
  ];

  return (
    <div className="space-y-6 flex flex-col w-full">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Partner Agencies</h2>
          <p className="text-muted-foreground mt-1">
            Review incoming agency registrations and manage existing accounts.
          </p>
        </div>
        <div className="flex items-center gap-3 relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search agencies by name or DTS..." 
            className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
      </div>

      <div className="bg-surface border rounded-xl shadow-card overflow-hidden">
        <DataTable
          data={partners}
          columns={columns}
          keyExtractor={(row) => row.id}
          className="border-0 rounded-none"
        />
      </div>
    </div>
  );
}
