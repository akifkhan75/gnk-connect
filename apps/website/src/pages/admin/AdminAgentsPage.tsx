import React, { useState, useEffect } from 'react';
import { b2bStore } from '@gnk/api-client';
import { AgentUser, Agency } from '@gnk/types';
import { 
  Users, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Mail, 
  Phone,
  FileCheck,
  FileText
} from 'lucide-react';
import { DocumentViewerModal } from '../../components/DocumentViewerModal';

export const AdminAgentsPage: React.FC = () => {
  const [users, setUsers] = useState<AgentUser[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'SUSPENDED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Document Viewer State
  const [activeDoc, setActiveDoc] = useState<{
    isOpen: boolean;
    title: string;
    url: string;
    category?: string;
    subtitle?: string;
  }>({
    isOpen: false,
    title: '',
    url: '',
  });

  useEffect(() => {
    const update = () => {
      setUsers(b2bStore.getUsers().filter(u => u.role !== 'GNK_ADMIN'));
      setAgencies(b2bStore.getAgencies());
    };
    update();
    return b2bStore.subscribe(update);
  }, []);

  const handleStatusChange = (userId: string, newStatus: 'APPROVED' | 'REJECTED' | 'SUSPENDED') => {
    b2bStore.updateAgentStatus(userId, newStatus);
  };

  const filteredUsers = users.filter(u => {
    if (filter === 'PENDING' && u.approvalStatus !== 'PENDING_VERIFICATION' && u.approvalStatus !== 'ADMIN_REVIEW') return false;
    if (filter === 'APPROVED' && u.approvalStatus !== 'APPROVED') return false;
    if (filter === 'SUSPENDED' && u.approvalStatus !== 'SUSPENDED') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const agency = agencies.find(a => a.id === u.agencyId);
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (agency && agency.name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Users className="text-amber-400" size={24} />
            Partner Agents & Agencies
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Verify travel agencies, review business licenses & NTN certificates, and control B2B access permissions
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search agent name, agency, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {[
            { label: 'All Partners', value: 'ALL' },
            { label: 'Pending Approvals', value: 'PENDING' },
            { label: 'Approved Active', value: 'APPROVED' },
            { label: 'Suspended', value: 'SUSPENDED' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filter === tab.value
                  ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Agent Grid / Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredUsers.map((agent) => {
          const agency = agencies.find(a => a.id === agent.agencyId);
          const isPending = agent.approvalStatus === 'PENDING_VERIFICATION' || agent.approvalStatus === 'ADMIN_REVIEW';

          return (
            <div
              key={agent.id}
              className={`bg-slate-900 border rounded-2xl p-5 space-y-4 shadow-xl transition-all ${
                isPending ? 'border-amber-500/50 bg-amber-950/10' : 'border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={agent.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${agent.fullName}`}
                    alt={agent.fullName}
                    className="w-12 h-12 rounded-xl bg-slate-800 object-cover border border-slate-700"
                  />
                  <div>
                    <h3 className="text-sm font-black text-white">{agency?.name || agent.fullName}</h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <span>{agent.fullName}</span> • <span className="font-mono">{agent.accountType}</span>
                    </p>
                  </div>
                </div>

                <div>
                  {agent.approvalStatus === 'APPROVED' ? (
                    <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 size={11} /> Approved
                    </span>
                  ) : isPending ? (
                    <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                      <AlertCircle size={11} /> Pending Review
                    </span>
                  ) : (
                    <span className="bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                      {agent.approvalStatus}
                    </span>
                  )}
                </div>
              </div>

              {/* Contact Info */}
              <div className="bg-slate-950 rounded-xl p-3 border border-slate-800/80 text-xs space-y-1.5 text-slate-300">
                <div className="flex items-center gap-2">
                  <Mail size={13} className="text-slate-500" />
                  <span>{agent.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={13} className="text-slate-500" />
                  <span className="font-mono">{agent.phone}</span>
                </div>
                {agency?.ntnNumber && (
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800 text-slate-400">
                    <span>NTN: <strong className="text-slate-300 font-mono">{agency.ntnNumber}</strong></span>
                    <span>License: <strong className="text-slate-300 font-mono">{agency.tradeLicenseNumber || 'DTS-REG'}</strong></span>
                  </div>
                )}
              </div>

              {/* Verification Documents & KYC Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const docUrl = agency?.verificationDocuments?.[0]?.fileUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=800&auto=format&fit=crop';
                    setActiveDoc({
                      isOpen: true,
                      title: `DTS Tourism License - ${agency?.name || agent.fullName}`,
                      url: docUrl,
                      category: 'DTS_LICENSE',
                      subtitle: `License #${agency?.tradeLicenseNumber || 'DTS-4920-KHI'} • Issued to ${agency?.name || agent.fullName}`
                    });
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 text-[11px] text-cyan-400 font-bold flex items-center gap-1.5 transition-all"
                >
                  <FileCheck size={13} /> Inspect DTS License
                </button>

                {agency?.ntnNumber && (
                  <button
                    type="button"
                    onClick={() => {
                      const docUrl = agency?.verificationDocuments?.[1]?.fileUrl || 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?q=80&w=800&auto=format&fit=crop';
                      setActiveDoc({
                        isOpen: true,
                        title: `FBR NTN Tax Certificate - ${agency?.name || agent.fullName}`,
                        url: docUrl,
                        category: 'NTN_CERTIFICATE',
                        subtitle: `NTN #${agency.ntnNumber}`
                      });
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 text-[11px] text-amber-400 font-bold flex items-center gap-1.5 transition-all"
                  >
                    <FileText size={13} /> Inspect NTN Doc
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                <span className="text-[11px] text-slate-500">
                  Registered: {new Date(agent.createdAt).toLocaleDateString()}
                </span>

                <div className="flex items-center gap-2">
                  {agent.approvalStatus !== 'APPROVED' ? (
                    <button
                      onClick={() => handleStatusChange(agent.id, 'APPROVED')}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-all shadow-md shadow-emerald-500/20"
                    >
                      <CheckCircle2 size={13} /> Approve Partner
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStatusChange(agent.id, 'SUSPENDED')}
                      className="bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 px-3 py-1.5 rounded-lg text-xs transition-all"
                    >
                      Suspend
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Lightbox Document Viewer */}
      <DocumentViewerModal
        isOpen={activeDoc.isOpen}
        onClose={() => setActiveDoc(prev => ({ ...prev, isOpen: false }))}
        title={activeDoc.title}
        subtitle={activeDoc.subtitle}
        documentUrl={activeDoc.url}
        category={activeDoc.category}
      />
    </div>
  );
};
