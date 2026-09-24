import React, { useState, useEffect } from 'react';
import { useB2BAuth } from '../../context/B2BAuthContext';
import { b2bStore } from '../../services/b2b/b2bStore';
import { AdminUser, AdminRole } from '../../types/b2b';
import { 
  Shield, 
  UserPlus, 
  ShieldCheck, 
  Crown, 
  Briefcase, 
  DollarSign, 
  Users, 
  Check, 
  X, 
  CheckCircle2, 
  FileCheck2,
  Receipt
} from 'lucide-react';

export const AdminTeamPage: React.FC = () => {
  const { currentUser } = useB2BAuth();
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<AdminRole>('OPS_ADMIN');
  const [inviteSuccess, setInviteSuccess] = useState(false);

  useEffect(() => {
    const updateAdmins = () => {
      setAdminUsers(b2bStore.getAdminUsers());
    };
    updateAdmins();
    return b2bStore.subscribe(updateAdmins);
  }, []);

  const handleCreateAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    b2bStore.inviteAdminUser({
      fullName: name,
      email,
      phone,
      role
    });

    setInviteSuccess(true);
    setTimeout(() => {
      setInviteSuccess(false);
      setInviteModalOpen(false);
      setName('');
      setEmail('');
      setPhone('');
      setRole('OPS_ADMIN');
    }, 1500);
  };

  const handleRoleChange = (adminId: string, newRole: AdminRole) => {
    b2bStore.updateAdminUserRole(adminId, newRole);
    setEditModalOpen(false);
    setSelectedAdmin(null);
  };

  const handleToggleStatus = (adminId: string) => {
    b2bStore.toggleAdminUserStatus(adminId);
  };

  return (
    <div className="space-y-7">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 sm:p-7 rounded-3xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-extrabold tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
              GNK Operations Staff & RBAC
            </span>
          </div>
          <h1 className="text-2xl font-black text-white">
            Administrative Access & Security Roles
          </h1>
          <p className="text-xs text-slate-400">
            Enforce granular operational permissions across booking dispatch, payment verification, and KYC approvals.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setInviteModalOpen(true)}
          className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black px-5 py-3 rounded-2xl text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <UserPlus size={16} />
          <span>Provision Admin User</span>
        </button>
      </div>

      {/* Admin Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl space-y-4 p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Shield className="text-amber-400" size={18} />
            <span>Active Operations Staff ({adminUsers.length})</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">Authentication Realm: GNK_INTERNAL</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Staff Member</th>
                <th className="py-3.5 px-4">Role Assignment</th>
                <th className="py-3.5 px-4">Contact Phone</th>
                <th className="py-3.5 px-4">Last Activity</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {adminUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-850/50 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.fullName)}`}
                        alt={user.fullName}
                        className="w-9 h-9 rounded-xl border border-slate-700 bg-slate-800 object-cover"
                      />
                      <div>
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{user.fullName}</span>
                          {user.email === currentUser?.email && (
                            <span className="text-[10px] bg-amber-950 text-amber-400 border border-amber-800 px-1 rounded">Current</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">{user.email}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    {user.role === 'SUPER_ADMIN' && (
                      <span className="bg-rose-500/10 text-rose-300 border border-rose-500/30 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 w-fit">
                        <Crown size={11} /> Super Admin
                      </span>
                    )}
                    {user.role === 'OPS_ADMIN' && (
                      <span className="bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 w-fit">
                        <Briefcase size={11} /> Operations Admin
                      </span>
                    )}
                    {user.role === 'FINANCE_ADMIN' && (
                      <span className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 w-fit">
                        <DollarSign size={11} /> Finance Admin
                      </span>
                    )}
                    {user.role === 'AGENT_MANAGER' && (
                      <span className="bg-purple-500/10 text-purple-300 border border-purple-500/30 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 w-fit">
                        <Users size={11} /> Agent Relationship
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 font-mono text-slate-300">
                    {user.phone}
                  </td>

                  <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                    {user.lastLoginAt}
                  </td>

                  <td className="py-3.5 px-4">
                    {user.status === 'ACTIVE' ? (
                      <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        Active
                      </span>
                    ) : (
                      <span className="text-rose-400 bg-rose-500/10 border border-rose-500/20 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        Suspended
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    {user.email !== currentUser?.email ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAdmin(user);
                            setEditModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:text-white transition-colors"
                        >
                          Modify Role
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleStatus(user.id)}
                          className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-colors ${
                            user.status === 'ACTIVE'
                              ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                          }`}
                        >
                          {user.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-500 text-[11px]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADMIN RBAC PERMISSION MATRIX */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-amber-400" />
          <h2 className="text-base font-bold text-white">Operations Center Role Matrix</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          
          <div className="p-4 rounded-2xl bg-slate-950 border border-rose-500/30 space-y-2">
            <div className="flex items-center gap-1.5 text-rose-300 font-bold text-xs">
              <Crown size={14} /> Super Admin
            </div>
            <p className="text-[11px] text-slate-400">
              Unrestricted access to all operations, pricing engine, supplier sync, finance clearance, and staff RBAC.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-cyan-500/30 space-y-2">
            <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-xs">
              <FileCheck2 size={14} /> Ops Admin
            </div>
            <p className="text-[11px] text-slate-400">
              Booking review queue, 1-Click Push to AirDesk API, manual PNR adjustments, voucher generation, and flight sync.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-2">
            <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-xs">
              <Receipt size={14} /> Finance Admin
            </div>
            <p className="text-[11px] text-slate-400">
              Bank transfer receipt audits, credit wallet deposits, credit line limits, and formal Statements of Account (SOA).
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-purple-500/30 space-y-2">
            <div className="flex items-center gap-1.5 text-purple-300 font-bold text-xs">
              <Users size={14} /> Agent Relationship
            </div>
            <p className="text-[11px] text-slate-400">
              KYC & DTS license verification queues, agency tier approvals, and partner-specific pricing rules margin assignment.
            </p>
          </div>

        </div>
      </div>

      {/* PROVISION ADMIN MODAL */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus size={18} className="text-amber-400" /> Provision Admin Staff
              </h3>
              <button onClick={() => setInviteModalOpen(false)} className="text-slate-500 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {inviteSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 size={18} /> Admin account provisioned and credentials dispatched!
              </div>
            ) : (
              <form onSubmit={handleCreateAdmin} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Staff Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Imran Hashmi"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Corporate Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="imran@gnkelite.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Direct Contact Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+92 300 0000005"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Admin Role Designation</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as AdminRole)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white"
                  >
                    <option value="OPS_ADMIN">💼 Operations Admin (Bookings & AirDesk Push)</option>
                    <option value="FINANCE_ADMIN">💵 Finance Admin (Payment receipts & Wallet float)</option>
                    <option value="AGENT_MANAGER">👥 Agent Relationship Manager (KYC & Margins)</option>
                    <option value="SUPER_ADMIN">👑 Super Admin (Full Command Authority)</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setInviteModalOpen(false)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 py-2.5 rounded-xl text-xs font-black shadow-md"
                  >
                    Provision Access
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODIFY ADMIN ROLE MODAL */}
      {editModalOpen && selectedAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Update Staff Role</h3>
            <p className="text-xs text-slate-400">
              Change privileges for <strong>{selectedAdmin.fullName}</strong>
            </p>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handleRoleChange(selectedAdmin.id, 'SUPER_ADMIN')}
                className={`w-full p-3 rounded-xl border text-left text-xs font-bold flex items-center justify-between ${
                  selectedAdmin.role === 'SUPER_ADMIN'
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>👑 Super Admin</span>
                {selectedAdmin.role === 'SUPER_ADMIN' && <Check size={14} />}
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange(selectedAdmin.id, 'OPS_ADMIN')}
                className={`w-full p-3 rounded-xl border text-left text-xs font-bold flex items-center justify-between ${
                  selectedAdmin.role === 'OPS_ADMIN'
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>💼 Operations Admin</span>
                {selectedAdmin.role === 'OPS_ADMIN' && <Check size={14} />}
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange(selectedAdmin.id, 'FINANCE_ADMIN')}
                className={`w-full p-3 rounded-xl border text-left text-xs font-bold flex items-center justify-between ${
                  selectedAdmin.role === 'FINANCE_ADMIN'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>💵 Finance Admin</span>
                {selectedAdmin.role === 'FINANCE_ADMIN' && <Check size={14} />}
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange(selectedAdmin.id, 'AGENT_MANAGER')}
                className={`w-full p-3 rounded-xl border text-left text-xs font-bold flex items-center justify-between ${
                  selectedAdmin.role === 'AGENT_MANAGER'
                    ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>👥 Agent Relationship Manager</span>
                {selectedAdmin.role === 'AGENT_MANAGER' && <Check size={14} />}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-xs font-bold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTeamPage;
