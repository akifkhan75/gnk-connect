import * as React from 'react';
import { DataTable, StatusBadge, Button } from '@gnk/ui';
import { Search } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminPartnersApi } from '@gnk/api-client';

export function AdminPartnersPage() {
  const queryClient = useQueryClient();

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ['adminPartners'],
    queryFn: () => adminPartnersApi.getAllPartners(),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'MORE_INFO_REQUIRED'; reason?: string }) => 
      adminPartnersApi.updateStatus(id, status, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPartners'] });
    }
  });

  const columns = [
    { key: 'name', title: 'Agency Name', render: (row: any) => row.agencyName || row.name },
    { key: 'city', title: 'City', render: (row: any) => row.city || 'N/A' },
    { key: 'status', title: 'Status', render: (row: any) => <StatusBadge status={row.status} className="text-xs" /> },
    { key: 'createdAt', title: 'Submitted', render: (row: any) => new Date(row.createdAt).toLocaleDateString() },
    { 
      key: 'actions', 
      title: '', 
      align: 'right' as const, 
      render: (row: any) => (
        <div className="flex gap-2 justify-end">
          {row.status === 'PENDING_APPROVAL' && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={() => {
                  if (window.confirm(`Approve ${row.agencyName}?`)) {
                    updateStatusMutation.mutate({ id: row.id, status: 'APPROVED' });
                  }
                }}
              >
                Approve
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => {
                  const reason = window.prompt(`Reason for rejecting ${row.agencyName}?`);
                  if (reason !== null) {
                    updateStatusMutation.mutate({ id: row.id, status: 'REJECTED', reason });
                  }
                }}
              >
                Reject
              </Button>
            </>
          )}
          {row.status === 'APPROVED' && (
            <Button 
              variant="outline" 
              size="sm" 
              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
              onClick={() => {
                const reason = window.prompt(`Reason for suspending ${row.agencyName}?`);
                if (reason !== null) {
                  updateStatusMutation.mutate({ id: row.id, status: 'SUSPENDED', reason });
                }
              }}
            >
              Suspend
            </Button>
          )}
        </div>
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
          isLoading={isLoading}
          keyExtractor={(row) => row.id}
          className="border-0 rounded-none"
        />
      </div>
    </div>
  );
}
