import React from 'react';
import { useB2BAuth } from '../../context/B2BAuthContext';
import { Sparkles } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export const DemoUserSwitcher: React.FC = () => {
  const { currentUser, switchUser, adminRole } = useB2BAuth();
  const location = useLocation();

  const getRoleLabel = () => {
    if (currentUser?.role === 'GNK_ADMIN') {
      return `🛡️ Admin (${adminRole || 'SUPER_ADMIN'})`;
    }
    if (currentUser?.role === 'AGENCY_OWNER') {
      return `👑 Agency Owner (${currentUser.fullName})`;
    }
    if (currentUser?.role === 'AGENCY_MANAGER') {
      return `💼 Agency Manager (${currentUser.fullName})`;
    }
    if (currentUser?.role === 'AGENCY_STAFF') {
      return `🎫 Ticketing Staff (${currentUser.fullName})`;
    }
    if (currentUser?.role === 'INDIVIDUAL_AGENT') {
      return currentUser.approvalStatus === 'APPROVED' 
        ? `👤 Solo Consultant (${currentUser.fullName})` 
        : `⏳ Pending Agent (${currentUser.fullName})`;
    }
    return currentUser?.fullName || 'Guest';
  };

  const agentProfiles = [
    { id: 'user-abc-owner', label: '👑 Owner (ABC)' },
    { id: 'user-abc-manager', label: '💼 Manager (ABC)' },
    { id: 'user-abc-staff', label: '🎫 Staff (ABC)' },
    { id: 'user-solo-consultant', label: '👤 Solo (Zubair)' },
    { id: 'user-muhammad-ali', label: '⏳ Pending (M. Ali)' },
  ];

  const adminProfiles = [
    { id: 'user-gnk-admin', label: '🛡️ Super Admin' },
    { id: 'user-gnk-ops-admin', label: '💼 Ops Admin' },
    { id: 'user-gnk-finance-admin', label: '💵 Finance Admin' },
    { id: 'user-gnk-agent-mgr', label: '👥 Agent Mgr' },
  ];

  return (
    <div className="bg-slate-900/95 border-b border-slate-800 text-xs px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-slate-300 backdrop-blur-md">
      {/* Current Active Simulation Indicator */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/30 text-[10px] uppercase tracking-wider">
          <Sparkles size={11} /> Role Switcher
        </span>
        <span className="text-slate-400 hidden sm:inline text-[11px]">Active Session:</span>
        <span className="font-bold text-white text-xs bg-slate-950 px-2.5 py-0.5 rounded-lg border border-slate-800">
          {getRoleLabel()}
        </span>
      </div>

      {/* Quick Profile Buttons */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
        
        {/* Agent Role Presets */}
        <span className="text-[10px] text-slate-500 uppercase font-bold pl-1">Agents:</span>
        {agentProfiles.map((p) => {
          const isSelected = currentUser?.id === p.id;
          return (
            <button
              key={p.id}
              onClick={() => switchUser(p.id)}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap border ${
                isSelected
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm font-black'
                  : 'bg-slate-950 text-slate-300 hover:bg-slate-800 hover:text-white border-slate-800'
              }`}
            >
              {p.label}
            </button>
          );
        })}

        {/* Admin Role Presets */}
        <span className="text-[10px] text-slate-500 uppercase font-bold pl-2 border-l border-slate-800">Ops:</span>
        {adminProfiles.map((p) => {
          const isSelected = currentUser?.id === p.id;
          return (
            <button
              key={p.id}
              onClick={() => switchUser(p.id)}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap border ${
                isSelected
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm font-black'
                  : 'bg-slate-950 text-amber-400/90 hover:bg-slate-800 hover:text-amber-300 border-slate-800'
              }`}
            >
              {p.label}
            </button>
          );
        })}

        <div className="h-4 w-px bg-slate-800 mx-1 hidden lg:block" />

        {/* Navigation Gateways */}
        {location.pathname.startsWith('/admin') ? (
          <Link 
            to="/agent/dashboard" 
            className="text-cyan-400 hover:text-cyan-300 font-bold px-2 py-0.5 rounded-md bg-cyan-950/80 border border-cyan-800/60 hover:bg-cyan-900 transition-all text-[11px] whitespace-nowrap"
          >
            ← Agent Portal
          </Link>
        ) : (
          <Link 
            to="/admin" 
            className="text-amber-400 hover:text-amber-300 font-bold px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-800/60 hover:bg-amber-900 transition-all text-[11px] whitespace-nowrap"
          >
            Admin Console →
          </Link>
        )}

        <Link 
          to="/" 
          className="text-slate-400 hover:text-white transition-colors text-[11px] whitespace-nowrap pl-1"
        >
          Customer Site ↗
        </Link>
      </div>
    </div>
  );
};

export default DemoUserSwitcher;
