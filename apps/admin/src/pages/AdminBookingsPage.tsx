import { DataTable, StatusBadge, Button, Badge } from '@gnk/ui';
import { Search, Eye, Filter, CheckCircle2, XCircle } from 'lucide-react';
import { useState } from 'react';

export function AdminBookingsPage() {
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);

  const bookings = [
    {
      id: 'GNK-2026-00124',
      supplierId: 'AD-849302',
      agency: 'ABC Travels',
      product: 'Dubai Luxury 7-Day',
      departure: '15 Oct 2026',
      passengers: 4,
      totalSelling: 788000,
      totalNet: 740000,
      status: 'PENDING_APPROVAL',
      createdAt: '2026-10-01T10:00:00Z',
    },
    {
      id: 'GNK-2026-00125',
      supplierId: 'AD-849303',
      agency: 'XYZ Tours',
      product: 'Saudi Umrah 15-Day',
      departure: '20 Oct 2026',
      passengers: 2,
      totalSelling: 550000,
      totalNet: 500000,
      status: 'CONFIRMED',
      createdAt: '2026-10-01T11:00:00Z',
    },
  ];

  const columns = [
    { key: 'id', title: 'Reference', render: (row: any) => <span className="font-medium font-mono">{row.id}</span> },
    { key: 'agency', title: 'Partner' },
    { key: 'product', title: 'Product' },
    { key: 'departure', title: 'Departure' },
    { key: 'passengers', title: 'Pax', align: 'center' as const },
    { key: 'totalSelling', title: 'Total Price', render: (row: any) => `Rs. ${row.totalSelling.toLocaleString()}`, align: 'right' as const },
    { key: 'status', title: 'Status', render: (row: any) => <StatusBadge status={row.status} className="text-xs" /> },
    { 
      key: 'actions', 
      title: '', 
      align: 'right' as const, 
      render: (row: any) => (
        <Button variant="ghost" size="sm" onClick={() => setSelectedBooking(row)}>
          <Eye className="w-4 h-4 mr-2" /> View
        </Button>
      ) 
    },
  ];

  return (
    <div className="space-y-6 flex flex-col w-full pb-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Bookings Queue</h2>
          <p className="text-muted-foreground mt-1">
            Review, approve, and manage partner bookings.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Saved Views
          </Button>
          <Button>Export CSV</Button>
        </div>
      </div>

      <div className="flex gap-2 pb-2 border-b overflow-x-auto">
        <button className="px-4 py-2 text-sm font-medium border-b-2 border-primary text-primary whitespace-nowrap">Pending Approval (1)</button>
        <button className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground whitespace-nowrap">Approved (0)</button>
        <button className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground whitespace-nowrap">Supplier Pending (0)</button>
        <button className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground whitespace-nowrap">Confirmed (1)</button>
      </div>

      <div className="flex items-center gap-3 relative max-w-md w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input 
          type="text" 
          placeholder="Search by GNK ID, Supplier ID, or Partner..." 
          className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      <div className="bg-surface border rounded-xl shadow-card overflow-hidden flex">
        <div className={`flex-1 transition-all ${selectedBooking ? 'md:pr-[400px]' : ''}`}>
          <DataTable
            data={bookings}
            columns={columns}
            keyExtractor={(row) => row.id}
            className="border-0 rounded-none"
          />
        </div>
        
        {/* Detail Drawer - Inline for desktop */}
        {selectedBooking && (
          <div className="hidden md:block w-[400px] border-l bg-surface absolute right-0 top-[180px] bottom-0 min-h-[600px] shadow-xl overflow-y-auto p-6 z-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg">{selectedBooking.id}</h3>
              <Button variant="ghost" size="sm" onClick={() => setSelectedBooking(null)}>✕</Button>
            </div>
            
            <div className="space-y-6">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Status</div>
                <StatusBadge status={selectedBooking.status} />
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Supplier ID</div>
                  <div className="font-mono">{selectedBooking.supplierId}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Partner</div>
                  <div className="font-medium">{selectedBooking.agency}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Product</div>
                  <div className="font-medium">{selectedBooking.product}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Departure</div>
                  <div className="font-medium">{selectedBooking.departure}</div>
                </div>
              </div>

              {selectedBooking.status === 'PENDING_APPROVAL' && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-4 rounded-lg space-y-3">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-medium">
                    <CheckCircle2 className="w-5 h-5" /> Live Availability Check
                  </div>
                  <div className="text-sm">Seats available at supplier: <span className="font-bold">12</span> (Requested: {selectedBooking.passengers})</div>
                  <div className="text-sm">Net price unchanged.</div>
                </div>
              )}

              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted px-4 py-2 font-medium text-sm flex justify-between">
                  <span>Price Audit (Staff Only)</span>
                </div>
                <div className="p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Supplier Net</span>
                    <span>Rs. {selectedBooking.totalNet.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Markup Applied</span>
                    <span>Rs. {(selectedBooking.totalSelling - selectedBooking.totalNet).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-2 mt-2">
                    <span>Agent Selling Price</span>
                    <span className="text-primary">Rs. {selectedBooking.totalSelling.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                {selectedBooking.status === 'PENDING_APPROVAL' ? (
                  <>
                    <Button className="flex-1 bg-green-600 hover:bg-green-700">Approve & Push</Button>
                    <Button variant="outline" className="flex-1 text-destructive border-destructive">Reject</Button>
                  </>
                ) : (
                  <Button className="flex-1">Sync Status</Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
