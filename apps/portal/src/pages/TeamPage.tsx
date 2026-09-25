import * as React from 'react';
import { DataTable, Button, StatusBadge, Input, Label } from '@gnk/ui';
import { Plus, MoreHorizontal } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partnerTeamApi } from '@gnk/api-client';

export function TeamPage() {
  const [isInviteOpen, setIsInviteOpen] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteRole, setInviteRole] = React.useState('STAFF');
  const queryClient = useQueryClient();

  const { data: teamMembers = [], isLoading } = useQuery({
    queryKey: ['partnerTeam'],
    queryFn: () => partnerTeamApi.getTeam(),
  });

  const inviteMutation = useMutation({
    mutationFn: () => partnerTeamApi.inviteMember({ email: inviteEmail, role: inviteRole }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerTeam'] });
      setIsInviteOpen(false);
      setInviteEmail('');
      setInviteRole('STAFF');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => partnerTeamApi.removeMember(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerTeam'] });
    }
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteEmail) {
      inviteMutation.mutate();
    }
  };

  const columns = [
    {
      key: 'name',
      title: 'Name',
      render: (row: any) => (
        <span className="font-medium">
          {row.user?.fullName || row.user?.email.split('@')[0]}
        </span>
      ),
    },
    {
      key: 'email',
      title: 'Email',
      render: (row: any) => row.user?.email,
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
        <StatusBadge status={row.user?.status || 'PENDING'} className="text-xs px-2 py-0.5" />
      ),
    },
    {
      key: 'actions',
      title: '',
      align: 'right' as const,
      render: (row: any) => (
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={() => {
            if (window.confirm('Are you sure you want to remove this member?')) {
              removeMutation.mutate(row.userId);
            }
          }}
        >
          Remove
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
          data={teamMembers}
          columns={columns}
          isLoading={isLoading}
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
            
            <form onSubmit={handleInvite}>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="inviteEmail">Email Address</Label>
                  <Input 
                    id="inviteEmail" 
                    type="email" 
                    placeholder="colleague@agency.com" 
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="inviteRole">Role</Label>
                  <select 
                    id="inviteRole" 
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="MANAGER">Manager</option>
                    <option value="STAFF">Staff</option>
                    <option value="ACCOUNTANT">Accountant</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <Button type="button" variant="outline" onClick={() => setIsInviteOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={inviteMutation.isPending}>
                  {inviteMutation.isPending ? 'Sending...' : 'Send Invite'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
