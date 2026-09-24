import React, { useState } from 'react';
import { useB2BAuth } from '../../context/B2BAuthContext';
import { 
  Building2, 
  User, 
  FileCheck, 
  ShieldCheck, 
  AlertCircle,
  Eye 
} from 'lucide-react';
import { DocumentViewerModal } from '../../components/DocumentViewerModal';

export const AgentProfilePage: React.FC = () => {
  const { currentUser, currentAgency, isApprovedAgent } = useB2BAuth();

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

  if (!currentUser) return null;

  const docs = currentAgency?.verificationDocuments || [
    { 
      title: 'DTS Tourism Operating License', 
      status: 'VERIFIED' as const, 
      uploadedAt: '2026-08-15',
      fileUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=800&auto=format&fit=crop'
    },
    { 
      title: 'FBR NTN Certificate', 
      status: 'VERIFIED' as const, 
      uploadedAt: '2026-08-15',
      fileUrl: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?q=80&w=800&auto=format&fit=crop'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-4">
          <img
            src={currentUser.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.fullName}`}
            alt={currentUser.fullName}
            className="w-16 h-16 rounded-2xl border-2 border-cyan-500/40 bg-slate-800 object-cover shadow-lg"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white">{currentAgency?.name || currentUser.fullName}</h1>
              {isApprovedAgent ? (
                <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck size={11} /> Verified Partner
                </span>
              ) : (
                <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertCircle size={11} /> Pending Review
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Account Type: <strong>{currentUser.accountType}</strong> • Role: <strong>{currentUser.role.replace('_', ' ')}</strong>
            </p>
          </div>
        </div>

        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-right">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Agency Wallet Balance</span>
          <span className="text-xl font-black text-cyan-400">
            PKR {(currentAgency?.walletBalancePKR || 0).toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            Credit Line: PKR {(currentAgency?.creditLimitPKR || 0).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Agency & Contact Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Business Credentials */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Building2 size={18} className="text-cyan-400" />
            Agency Information
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-slate-800/80">
              <span className="text-slate-400">Business Name</span>
              <span className="font-bold text-white">{currentAgency?.name || 'Independent Agent'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800/80">
              <span className="text-slate-400">NTN / Tax Number</span>
              <span className="font-mono text-slate-300">{currentAgency?.ntnNumber || '7392810-4'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800/80">
              <span className="text-slate-400">DTS Tourism License</span>
              <span className="font-mono text-slate-300">{currentAgency?.tradeLicenseNumber || 'DTS-4920-KHI'}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-400">Head Office Location</span>
              <span className="text-right text-slate-300">{currentAgency?.officeAddress || 'Karachi, Pakistan'}</span>
            </div>
          </div>
        </div>

        {/* Primary Contact Person */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <User size={18} className="text-cyan-400" />
            Contact & Authorized Person
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-slate-800/80">
              <span className="text-slate-400">Full Name</span>
              <span className="font-bold text-white">{currentUser.fullName}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800/80">
              <span className="text-slate-400">Official Email</span>
              <span className="text-cyan-400">{currentUser.email}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800/80">
              <span className="text-slate-400">Phone / WhatsApp</span>
              <span className="text-white font-mono">{currentUser.phone}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-400">Registration Date</span>
              <span className="text-slate-400">{new Date(currentUser.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Verification Documents & KYC */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileCheck size={18} className="text-cyan-400" />
              Verification Documents & KYC
            </h2>
            <p className="text-xs text-slate-400">Required documentation for partner approval and direct booking authorization</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {docs.map((doc, idx) => (
            <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <h4 className="font-bold text-white">{doc.title}</h4>
                <span className="text-[10px] text-slate-500 block">Uploaded {doc.uploadedAt.slice(0, 10)}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveDoc({
                      isOpen: true,
                      title: doc.title,
                      subtitle: `Agency: ${currentAgency?.name || currentUser.fullName} • Status: ${doc.status}`,
                      url: doc.fileUrl,
                      category: 'DTS_LICENSE'
                    });
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-400 hover:text-cyan-300 font-bold text-[11px] flex items-center gap-1 transition-all"
                >
                  <Eye size={12} /> View
                </button>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold text-[10px]">
                  {doc.status}
                </span>
              </div>
            </div>
          ))}
        </div>
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
