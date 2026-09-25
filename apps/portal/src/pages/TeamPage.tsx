import * as React from 'react';
import { DataTable, Button, StatusBadge, Dialog, Input, Label } from '@gnk/ui';
import { Plus, MoreHorizontal } from 'lucide-react';

export function TeamPage() {
  const [isInviteOpen, setIsInviteOpen] = React.useState(false);

  const teamData = [
    {
      id: 'usr-1',
      name: 'Tariq Mansoor',
      email: 'tariq@abctravels.com',
      role: 'OWNER',
      status: 'ACTIVE',
    },
    {
      id: 'usr-2',
      name: 'Ali Raza',
      email: 'ali@abctravels.com',
      role: 'MANAGER',
      status: 'ACTIVE',
    },
    {
      id: 'usr-3',
      name: 'Sara Khan',
      email: 'sara@abctravels.com',
      role: 'STAFF',
      status: 'PENDING_APPROVAL',
    }
  ];

  const columns = [
    {
      key: 'name',
      title: 'Name',
    },
    {
      key: 'email',
      title: 'Email',
    },
    {
      key: 'role',
      title: 'Role',
      render: (row: any) => (
        <span className="font-medium text-xs bg-muted px-2 py-1 rounded">
          {row.role}
        </span>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (row: any) => (
        <StatusBadge status={row.status} className="text-xs px-2 py-0.5" />
      ),
    },
    {
      key: 'actions',
      title: '',
      align: 'right' as const,
      render: (row: any) => (
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 flex flex-col w-full">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Team Management</h2>
          <p className="text-muted-foreground mt-1">
            Manage your agency staff, invite new members, and control access permissions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setIsInviteOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        </div>
      </div>

      <div className="bg-surface border rounded-xl shadow-card overflow-hidden">
        <DataTable
          data={teamData}
          columns={columns}
          keyExtractor={(row) => row.id}
          className="border-0 rounded-none"
        />
      </div>

      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface w-full max-w-md rounded-xl p-6 shadow-xl border">
            <h3 className="text-lg font-semibold">Invite Team Member</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-6">
              Send an invitation to join your agency on GNK Connect.
            </p>
            
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="inviteEmail">Email Address</Label>
                <Input id="inviteEmail" type="email" placeholder="colleague@agency.com" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="inviteRole">Role</Label>
                <select id="inviteRole" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                  <option value="MANAGER">Manager</option>
                  <option value="STAFF">Staff</option>
                  <option value="ACCOUNTANT">Accountant</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <Button variant="outline" onClick={() => setIsInviteOpen(false)}>Cancel</Button>
              <Button onClick={() => setIsInviteOpen(false)}>Send Invite</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
