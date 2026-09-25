import { DataTable, StatusBadge, Button, Input } from '@gnk/ui';
import { Search, Plus, Calculator } from 'lucide-react';
import { useState } from 'react';

export function AdminPricingPage() {
  const [isSimulating, setIsSimulating] = useState(false);

  const rules = [
    {
      id: 'rule-agent-prod-01',
      name: 'ABC Travels Dubai Group VIP Override',
      scope: 'PARTNER_PRODUCT',
      priority: 1,
      markupType: 'FIXED',
      markupValue: '12000',
      isActive: true,
      updatedAt: '2023-10-24T10:15:00Z',
    },
    {
      id: 'rule-agent-02',
      name: 'ABC Travels Preferred Partner Margin (5%)',
      scope: 'PARTNER',
      priority: 2,
      markupType: 'PERCENTAGE',
      markupValue: '5',
      isActive: true,
      updatedAt: '2023-10-24T10:15:00Z',
    },
    {
      id: 'rule-default-07',
      name: 'GNK Connect Global Default Markup',
      scope: 'DEFAULT',
      priority: 0,
      markupType: 'FIXED',
      markupValue: '10000',
      isActive: true,
      updatedAt: '2023-10-24T10:15:00Z',
    },
  ];

  const columns = [
    { key: 'name', title: 'Rule Name' },
    { key: 'scope', title: 'Scope', render: (row: any) => <span className="text-xs font-mono bg-muted px-2 py-1 rounded">{row.scope}</span> },
    { key: 'priority', title: 'Priority' },
    { key: 'markup', title: 'Markup', render: (row: any) => row.markupType === 'FIXED' ? `Rs. ${row.markupValue}` : `${row.markupValue}%` },
    { key: 'status', title: 'Status', render: (row: any) => <StatusBadge status={row.isActive ? 'ACTIVE' : 'INACTIVE'} className="text-xs" /> },
    { key: 'actions', title: '', align: 'right' as const, render: () => <Button variant="outline" size="sm">Edit</Button> },
  ];

  return (
    <div className="space-y-6 flex flex-col w-full pb-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pricing Engine</h2>
          <p className="text-muted-foreground mt-1">
            Manage dynamic pricing rules, margins, and tier assignments.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setIsSimulating(!isSimulating)}>
            <Calculator className="mr-2 h-4 w-4" />
            Simulator
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Rule
          </Button>
        </div>
      </div>

      {isSimulating && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold mb-4 flex items-center">
            <Calculator className="mr-2 h-5 w-5 text-primary" />
            Pricing Simulator
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Partner</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option>ABC Travels</option>
                <option>XYZ Tours</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Product / Departure</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option>Dubai Luxury 7-Day</option>
                <option>Saudi Umrah 15-Day</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Base Net Price</label>
              <Input type="number" defaultValue={185000} />
            </div>
            <Button className="w-full">Calculate Price</Button>
          </div>
          
          <div className="mt-6 p-4 bg-background border rounded-lg">
            <div className="text-sm text-muted-foreground mb-2">Evaluated Rules:</div>
            <ul className="space-y-1 mb-4 font-mono text-sm">
              <li className="text-green-600">✓ PARTNER_PRODUCT +12,000 (Applied - Rank 1)</li>
              <li className="text-muted-foreground line-through">✗ PARTNER 5% (Skipped - Lower Rank)</li>
              <li className="text-muted-foreground line-through">✗ DEFAULT +10,000 (Skipped - Lower Rank)</li>
            </ul>
            <div className="flex justify-between items-center border-t pt-4">
              <span className="font-medium">Final Selling Price (PKR)</span>
              <span className="text-2xl font-bold text-primary">197,000</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 relative max-w-md w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input 
          type="text" 
          placeholder="Search rules by name, partner, or scope..." 
          className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      <div className="bg-surface border rounded-xl shadow-card overflow-hidden">
        <DataTable
          data={rules}
          columns={columns}
          keyExtractor={(row) => row.id}
          className="border-0 rounded-none"
        />
      </div>
    </div>
  );
}
