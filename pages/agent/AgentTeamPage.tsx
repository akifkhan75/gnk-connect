import React, { useState, useEffect } from 'react';
import { useB2BAuth } from '../../context/B2BAuthContext';
import { b2bStore } from '../../services/b2b/b2bStore';
import { AgencyTeamMember } from '../../types/b2b';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  CheckCircle2, 
  Crown, 
  Briefcase, 
  Ticket, 
  Check,
  X,
  Trash2
} from 'lucide-react';

export const AgentTeamPage: React.FC = () => {
  const { currentAgency, currentUser, isAgencyOwner } = useB2BAuth();
  const [teamMembers, setTeamMembers] = useState<AgencyTeamMember[]>([]);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<AgencyTeamMember | null>(null);

  // Invite Form State
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRole, setInviteRole] = useState<'AGENCY_OWNER' | 'AGENCY_MANAGER' | 'AGENCY_STAFF'>('AGENCY_STAFF');
  const [inviteSuccess, setInviteSuccess] = useState(false);

  useEffect(() => {
    const updateTeam = () => {
      if (currentAgency) {
        setTeamMembers(b2bStore.getTeamMembers(currentAgency.id));
      }
    };
    updateTeam();
    return b2bStore.subscribe(updateTeam);
  }, [currentAgency]);

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAgency) return;

    b2bStore.inviteTeamMember(currentAgency.id, {
      fullName: inviteName,
      email: inviteEmail,
      phone: invitePhone,
      role: inviteRole
    });

    setInviteSuccess(true);
    setTimeout(() => {
      setInviteSuccess(false);
      setInviteModalOpen(false);
      setInviteName('');
      setInviteEmail('');
      setInvitePhone('');
      setInviteRole('AGENCY_STAFF');
    }, 1500);
  };

  const handleRoleChange = (memberId: string, newRole: 'AGENCY_OWNER' | 'AGENCY_MANAGER' | 'AGENCY_STAFF') => {
    b2bStore.updateTeamMemberRole(memberId, newRole);
    setEditModalOpen(false);
    setSelectedMember(null);
  };

  const handleToggleStatus = (memberId: string) => {
    b2bStore.toggleTeamMemberStatus(memberId);
  };

  const handleRemoveMember = (memberId: string) => {
    if (confirm('Are you sure you want to remove this team member?')) {
      b2bStore.removeTeamMember(memberId);
    }
  };

  return (
    <div className="space-y-7">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 sm:p-7 rounded-3xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-extrabold tracking-widest text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-full">
              Agency RBAC & Team Management
            </span>
          </div>
          <h1 className="text-2xl font-black text-white">
            {currentAgency?.name || 'Agency'} Staff & Access Controls
          </h1>
          <p className="text-xs text-slate-400">
            Invite booking staff, assign roles (Owner, Manager, Ticketing Staff), and control who can view financial ledgers and make bookings.
          </p>
        </div>

        {isAgencyOwner && (
          <button
            type="button"
            onClick={() => setInviteModalOpen(true)}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-slate-950 font-black px-5 py-3 rounded-2xl text-xs transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <UserPlus size={16} />
            <span>Invite Team Member</span>
          </button>
        )}
      </div>

      {/* Team Roster Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl space-y-4 p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Users size={18} className="text-cyan-400" />
            <span>Active Team Members ({teamMembers.length})</span>
          </h2>
          <span className="text-xs text-slate-400">Agency Code: <strong className="font-mono text-cyan-400">ABC-TRV-2026</strong></span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Member Name & Email</th>
                <th className="py-3.5 px-4">Role & Permissions</th>
                <th className="py-3.5 px-4">Contact Phone</th>
                <th className="py-3.5 px-4">Bookings</th>
                <th className="py-3.5 px-4">Account Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {teamMembers.map((member) => (
                <tr key={member.id} className="hover:bg-slate-850/50 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={member.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.fullName)}`}
                        alt={member.fullName}
                        className="w-9 h-9 rounded-xl border border-slate-700 bg-slate-800 object-cover"
                      />
                      <div>
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{member.fullName}</span>
                          {member.email === currentUser?.email && (
                            <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800 px-1 rounded">You</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">{member.email}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    {member.role === 'AGENCY_OWNER' && (
                      <span className="bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 w-fit">
                        <Crown size={11} /> Agency Owner
                      </span>
                    )}
                    {member.role === 'AGENCY_MANAGER' && (
                      <span className="bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 w-fit">
                        <Briefcase size={11} /> Agency Manager
                      </span>
                    )}
                    {member.role === 'AGENCY_STAFF' && (
                      <span className="bg-purple-500/10 text-purple-300 border border-purple-500/30 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 w-fit">
                        <Ticket size={11} /> Ticketing Staff
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 font-mono text-slate-300">
                    {member.phone}
                  </td>

                  <td className="py-3.5 px-4 font-mono font-bold text-white">
                    {member.totalBookingsCount}
                  </td>

                  <td className="py-3.5 px-4">
                    {member.status === 'ACTIVE' && (
                      <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        Active
                      </span>
                    )}
                    {member.status === 'INVITED' && (
                      <span className="text-amber-400 bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        Invite Pending
                      </span>
                    )}
                    {member.status === 'SUSPENDED' && (
                      <span className="text-rose-400 bg-rose-500/10 border border-rose-500/20 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        Suspended
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    {isAgencyOwner && member.email !== currentUser?.email ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMember(member);
                            setEditModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:text-white transition-colors"
                        >
                          Change Role
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleStatus(member.id)}
                          className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-colors ${
                            member.status === 'ACTIVE'
                              ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                          }`}
                        >
                          {member.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                          title="Remove Member"
                        >
                          <Trash2 size={14} />
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

      {/* ROLE & PERMISSION MATRIX EXPLANATION */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-cyan-400" />
          <h2 className="text-base font-bold text-white">Agency Role-Based Access Control (RBAC) Matrix</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          
          {/* Owner Role Card */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-3">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
              <Crown size={16} /> Agency Owner
            </div>
            <p className="text-xs text-slate-400">
              Full administrative and financial authority over the agency account.
            </p>
            <ul className="text-xs space-y-1.5 text-slate-300 pt-1">
              <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-400" /> View wallet & credit lines</li>
              <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-400" /> View all agency bookings</li>
              <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-400" /> Invite & remove staff</li>
              <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-400" /> Manage banking & license KYC</li>
              <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-400" /> Download official SOA ledger</li>
            </ul>
          </div>

          {/* Manager Role Card */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-cyan-500/30 space-y-3">
            <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
              <Briefcase size={16} /> Agency Manager
            </div>
            <p className="text-xs text-slate-400">
              Supervises day-to-day group tour bookings and passenger manifests.
            </p>
            <ul className="text-xs space-y-1.5 text-slate-300 pt-1">
              <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-400" /> View wallet float balance</li>
              <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-400" /> View all agency bookings</li>
              <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-400" /> Create & confirm seat holds</li>
              <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-400" /> Issue official B2B vouchers</li>
              <li className="flex items-center gap-1.5"><X size={13} className="text-rose-400" /> Cannot edit banking/legal info</li>
            </ul>
          </div>

          {/* Staff Role Card */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-purple-500/30 space-y-3">
            <div className="flex items-center gap-2 text-purple-300 font-bold text-sm">
              <Ticket size={16} /> Ticketing Staff
            </div>
            <p className="text-xs text-slate-400">
              Sales and ticketing agents creating customer bookings.
            </p>
            <ul className="text-xs space-y-1.5 text-slate-300 pt-1">
              <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-400" /> Search AirDesk group series</li>
              <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-400" /> Create bookings & rosters</li>
              <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-400" /> View ONLY own bookings</li>
              <li className="flex items-center gap-1.5"><X size={13} className="text-rose-400" /> No access to agency ledger</li>
              <li className="flex items-center gap-1.5"><X size={13} className="text-rose-400" /> Cannot manage staff members</li>
            </ul>
          </div>

        </div>
      </div>

      {/* INVITE TEAM MEMBER MODAL */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus size={18} className="text-cyan-400" /> Invite Team Member
              </h3>
              <button onClick={() => setInviteModalOpen(false)} className="text-slate-500 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {inviteSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 size={18} /> Member invitation dispatched and registered!
              </div>
            ) : (
              <form onSubmit={handleInviteSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Full Name</label>
                  <input
                    type="text"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="e.g. Asad Siddiqui"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Email Address</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="asad@abctravels.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">WhatsApp / Mobile Phone</label>
                  <input
                    type="text"
                    value={invitePhone}
                    onChange={(e) => setInvitePhone(e.target.value)}
                    placeholder="+92 300 9988776"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Assign Role & Scope</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white"
                  >
                    <option value="AGENCY_STAFF">🎫 Ticketing Staff (Only their own bookings)</option>
                    <option value="AGENCY_MANAGER">💼 Agency Manager (All bookings & float view)</option>
                    <option value="AGENCY_OWNER">👑 Agency Owner (Full admin & finance control)</option>
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
                    className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-slate-950 py-2.5 rounded-xl text-xs font-black shadow-md"
                  >
                    Send Invitation
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* CHANGE ROLE MODAL */}
      {editModalOpen && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Modify Member Role</h3>
            <p className="text-xs text-slate-400">
              Update access tier for <strong>{selectedMember.fullName}</strong>
            </p>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handleRoleChange(selectedMember.id, 'AGENCY_OWNER')}
                className={`w-full p-3 rounded-xl border text-left text-xs font-bold flex items-center justify-between ${
                  selectedMember.role === 'AGENCY_OWNER'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>👑 Agency Owner</span>
                {selectedMember.role === 'AGENCY_OWNER' && <Check size={14} />}
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange(selectedMember.id, 'AGENCY_MANAGER')}
                className={`w-full p-3 rounded-xl border text-left text-xs font-bold flex items-center justify-between ${
                  selectedMember.role === 'AGENCY_MANAGER'
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>💼 Agency Manager</span>
                {selectedMember.role === 'AGENCY_MANAGER' && <Check size={14} />}
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange(selectedMember.id, 'AGENCY_STAFF')}
                className={`w-full p-3 rounded-xl border text-left text-xs font-bold flex items-center justify-between ${
                  selectedMember.role === 'AGENCY_STAFF'
                    ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>🎫 Ticketing Staff</span>
                {selectedMember.role === 'AGENCY_STAFF' && <Check size={14} />}
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

export default AgentTeamPage;
