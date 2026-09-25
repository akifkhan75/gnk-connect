import { DataTable, StatusBadge, Button, Input, Label } from '@gnk/ui';
import { RefreshCw, Play, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

export function AdminSuppliersPage() {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'SUCCESS' | 'ERROR' | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const suppliers = [
    {
      id: 'sup-1',
      name: 'AirDesk Groups API',
      code: 'airdesk',
      status: 'ACTIVE',
      lastSyncAt: '2023-10-24T10:15:00Z',
    },
    {
      id: 'sup-2',
      name: 'Hotels Stub (Development)',
      code: 'hotels-stub',
      status: 'INACTIVE',
      lastSyncAt: null,
    }
  ];

  const syncLogs = [
    { id: 'log-1', timestamp: '2023-10-24T10:15:00Z', status: 'SUCCESS', details: 'Synced 4 group series, 8 departures' },
    { id: 'log-2', timestamp: '2023-10-24T10:00:00Z', status: 'SUCCESS', details: 'Synced 4 group series, 8 departures' },
    { id: 'log-3', timestamp: '2023-10-24T09:45:00Z', status: 'ERROR', details: 'AirDesk API timeout (504 Gateway Timeout)' },
  ];

  const columns = [
    { key: 'name', title: 'Supplier Name' },
    { key: 'code', title: 'Code' },
    { key: 'status', title: 'Status', render: (row: any) => <StatusBadge status={row.status} className="text-xs" /> },
    { key: 'lastSyncAt', title: 'Last Sync', render: (row: any) => row.lastSyncAt ? new Date(row.lastSyncAt).toLocaleString() : 'Never' },
  ];

  const logColumns = [
    { key: 'timestamp', title: 'Time', render: (row: any) => new Date(row.timestamp).toLocaleTimeString() },
    { key: 'status', title: 'Result', render: (row: any) => <StatusBadge status={row.status} className="text-xs" /> },
    { key: 'details', title: 'Details' },
  ];

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    await new Promise(r => setTimeout(r, 1000));
    setTestResult('SUCCESS');
    setIsTesting(false);
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    await new Promise(r => setTimeout(r, 2000));
    setIsSyncing(false);
  };

  return (
    <div className="space-y-8 flex flex-col w-full pb-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Suppliers & Sync</h2>
          <p className="text-muted-foreground mt-1">
            Manage upstream B2B supplier connections, API keys, and inventory sync schedules.
          </p>
        </div>
      </div>

      <div className="bg-surface border rounded-xl shadow-card overflow-hidden">
        <DataTable
          data={suppliers}
          columns={columns}
          keyExtractor={(row) => row.id}
          className="border-0 rounded-none"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-surface border rounded-xl p-6 shadow-card">
            <h3 className="text-lg font-bold mb-4">AirDesk Configuration</h3>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input id="apiKey" type="password" value="************************" readOnly />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="apiSecret">API Secret</Label>
                <Input id="apiSecret" type="password" value="************************" readOnly />
              </div>
              
              <div className="pt-4 border-t flex items-center justify-between">
                <div>
                  <Button variant="outline" onClick={handleTestConnection} disabled={isTesting}>
                    {isTesting ? 'Testing...' : 'Test Connection'}
                  </Button>
                </div>
                {testResult === 'SUCCESS' && (
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                    Connection Successful
                  </div>
                )}
                {testResult === 'ERROR' && (
                  <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 font-medium">
                    <ShieldAlert className="h-4 w-4" />
                    Connection Failed
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-surface border rounded-xl shadow-card overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold">Sync History (AirDesk)</h3>
              <Button size="sm" onClick={handleSyncNow} disabled={isSyncing}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                Sync Now
              </Button>
            </div>
            <DataTable
              data={syncLogs}
              columns={logColumns}
              keyExtractor={(row) => row.id}
              className="border-0 rounded-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
