import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Button, 
  DataTable, 
  StatCard, 
  Dialog,
  Input,
  Label,
  Badge
} from '@gnk/ui';
import { Download, Upload, Wallet, Plus, Calendar, Clock, CreditCard } from 'lucide-react';
import { ledgerApi, uploadsApi } from '@gnk/api-client';

export function WalletPage() {
  const [isTopupOpen, setIsTopupOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [bankName, setBankName] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  
  const queryClient = useQueryClient();
  const agencyId = 'agency-abc'; // Mock authenticated agency ID for now

  const { data: statement, isLoading } = useQuery({
    queryKey: ['ledger-statement', agencyId],
    queryFn: () => ledgerApi.getStatementOfAccount(agencyId)
  });

  const topupMutation = useMutation({
    mutationFn: async () => {
      if (!proofFile) throw new Error('Proof file is required');
      
      const uploadRes = await uploadsApi.uploadPaymentSlip(proofFile, undefined, agencyId);
      
      return ledgerApi.topUpWallet({
        accountId: agencyId,
        amountPKR: parseInt(amount, 10),
        reference,
        bankName,
        proofFileId: uploadRes.file.id,
        submittedById: 'user-agent-1'
      });
    },
    onSuccess: () => {
      setIsTopupOpen(false);
      setAmount('');
      setReference('');
      setBankName('');
      setProofFile(null);
      alert('Top-up request submitted for verification!');
      queryClient.invalidateQueries({ queryKey: ['ledger-statement'] });
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to submit top-up');
    }
  });

  if (isLoading) return <div className="p-8">Loading wallet...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ledger & Payments</h1>
          <p className="text-muted-foreground">Manage your wallet balance, top-ups, and statements.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Download SOA
          </Button>
          <Button onClick={() => setIsTopupOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Top Up Wallet
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Available Balance"
          value={`Rs ${statement?.availableCreditPKR?.toLocaleString()}`}
          icon={<Wallet className="w-4 h-4 text-green-500" />}
          trend={{ value: 5, label: 'vs last month' }}
        />
        <StatCard
          title="Wallet Balance"
          value={`Rs ${statement?.closingBalancePKR?.toLocaleString()}`}
          icon={<CreditCard className="w-4 h-4 text-primary" />}
        />
        <StatCard
          title="Total Top-ups"
          value={`Rs ${statement?.totalCreditsPKR?.toLocaleString()}`}
          icon={<Upload className="w-4 h-4 text-blue-500" />}
        />
        <StatCard
          title="Total Spent"
          value={`Rs ${statement?.totalDebitsPKR?.toLocaleString()}`}
          icon={<Download className="w-4 h-4 text-orange-500" />}
        />
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm p-6 mt-8">
        <h2 className="text-lg font-semibold mb-4">Transaction History</h2>
        <DataTable 
          data={statement?.transactions || []}
          columns={[
            {
              header: 'Date',
              accessorKey: 'createdAt',
              cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString()
            },
            {
              header: 'Reference',
              accessorKey: 'reference',
              cell: ({ row }) => (
                <div className="flex flex-col">
                  <span className="font-medium">{row.original.reference}</span>
                  <span className="text-xs text-muted-foreground">{row.original.description}</span>
                </div>
              )
            },
            {
              header: 'Type',
              accessorKey: 'type',
              cell: ({ row }) => (
                <Badge variant={row.original.type === 'CREDIT_DEPOSIT' ? 'default' : 'secondary'}>
                  {row.original.type.replace('_', ' ')}
                </Badge>
              )
            },
            {
              header: 'Amount',
              accessorKey: 'amountPKR',
              cell: ({ row }) => {
                const isCredit = row.original.type === 'CREDIT_DEPOSIT';
                return (
                  <span className={isCredit ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                    {isCredit ? '+' : '-'} Rs {row.original.amountPKR.toLocaleString()}
                  </span>
                )
              }
            },
            {
              header: 'Balance',
              accessorKey: 'balanceAfterPKR',
              cell: ({ row }) => `Rs ${row.original.balanceAfterPKR.toLocaleString()}`
            }
          ]}
        />
      </div>

      <Dialog
        open={isTopupOpen}
        onOpenChange={setIsTopupOpen}
        title="Top Up Wallet"
        description="Upload a bank deposit slip to credit your wallet."
      >
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="bankName">Bank Name</Label>
            <Input 
              id="bankName" 
              placeholder="e.g. Meezan Bank, HBL" 
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reference">Transaction Reference / Slip No</Label>
            <Input 
              id="reference" 
              placeholder="Enter reference number" 
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (PKR)</Label>
            <Input 
              id="amount" 
              type="number" 
              placeholder="Enter amount" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="proof">Upload Payment Slip</Label>
            <Input 
              id="proof" 
              type="file" 
              accept="image/*,.pdf"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setProofFile(e.target.files[0]);
                }
              }}
            />
          </div>

          <div className="bg-muted p-4 rounded-lg text-sm flex gap-3 mt-4">
            <Clock className="w-5 h-5 text-muted-foreground shrink-0" />
            <p className="text-muted-foreground">
              Top-ups are manually verified by GNK Connect finance team during business hours. 
              Please allow up to 2 hours for the funds to reflect in your wallet.
            </p>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setIsTopupOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => topupMutation.mutate()}
              disabled={!amount || !reference || !bankName || !proofFile || topupMutation.isPending}
            >
              {topupMutation.isPending ? 'Submitting...' : 'Submit Payment'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
