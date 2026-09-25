import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable, Button, Badge } from '@gnk/ui';
import { ledgerApi, uploadsApi } from '@gnk/api-client';
import { CheckCircle, Eye, ExternalLink } from 'lucide-react';

export function AdminFinancialsPage() {
  const queryClient = useQueryClient();

  const { data: pendingTopups, isLoading } = useQuery({
    queryKey: ['admin-pending-topups'],
    queryFn: () => ledgerApi.getPendingTopups()
  });

  const verifyMutation = useMutation({
    mutationFn: (paymentId: string) => ledgerApi.verifyTopup(paymentId, 'admin-123'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-topups'] });
    }
  });

  if (isLoading) return <div className="p-8">Loading financials...</div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Financials & Ledger</h1>
        <p className="text-muted-foreground">Verify agency top-ups and monitor system-wide ledger balances.</p>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Pending Wallet Top-ups</h2>
        <DataTable 
          data={pendingTopups || []}
          columns={[
            {
              header: 'Date Submitted',
              accessorKey: 'createdAt',
              cell: ({ row }) => new Date(row.original.createdAt).toLocaleString()
            },
            {
              header: 'Agency',
              accessorKey: 'account.legalName',
              cell: ({ row }) => (
                <div className="font-medium text-primary">
                  {row.original.account?.legalName || row.original.accountId.slice(0, 8)}
                </div>
              )
            },
            {
              header: 'Amount',
              accessorKey: 'amount',
              cell: ({ row }) => (
                <span className="font-semibold text-green-600">
                  Rs {row.original.amount.toLocaleString()}
                </span>
              )
            },
            {
              header: 'Bank & Ref',
              accessorKey: 'reference',
              cell: ({ row }) => (
                <div className="flex flex-col">
                  <span className="font-medium">{row.original.bankName}</span>
                  <span className="text-xs text-muted-foreground">Ref: {row.original.reference}</span>
                </div>
              )
            },
            {
              header: 'Proof',
              accessorKey: 'proofFileId',
              cell: ({ row }) => (
                <a 
                  href={uploadsApi.resolveUrl(row.original.proofFileId)} 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                  <Eye className="w-3 h-3" /> View Slip
                </a>
              )
            },
            {
              header: 'Actions',
              accessorKey: 'id',
              cell: ({ row }) => (
                <Button 
                  size="sm"
                  className="gap-1 h-8"
                  onClick={() => {
                    if (window.confirm('Verify this payment? This will credit the agency wallet immediately.')) {
                      verifyMutation.mutate(row.original.id);
                    }
                  }}
                  disabled={verifyMutation.isPending}
                >
                  <CheckCircle className="w-4 h-4" />
                  Verify & Credit
                </Button>
              )
            }
          ]}
        />
        {pendingTopups?.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No pending top-ups require verification.
          </div>
        )}
      </div>
    </div>
  );
}
