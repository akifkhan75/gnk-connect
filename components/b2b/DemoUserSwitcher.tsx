import React from 'react';
import { useB2BAuth } from '../../context/B2BAuthContext';
import { Shield, UserCheck, AlertTriangle, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

export const DemoUserSwitcher: React.FC = () => {
  const { currentUser, switchUser, availableUsers } = useB2BAuth();

  return (
    <div className="bg-slate-900 border-b border-slate-800 text-xs px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-slate-300">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-semibold border border-cyan-500/30">
          <Users size={12} /> B2B Role Switcher
        </span>
        <span className="hidden sm:inline text-slate-400">Current Simulation:</span>
        <span className="font-bold text-white flex items-center gap-1">
          {currentUser?.role === 'GNK_ADMIN' ? (
            <span className="text-amber-400 flex items-center gap-1"><Shield size={12} /> GNK Operations Admin</span>
          ) : currentUser?.approvalStatus === 'APPROVED' ? (
            <span className="text-emerald-400 flex items-center gap-1"><UserCheck size={12} /> Approved Partner ({currentUser?.fullName})</span>
          ) : (
            <span className="text-amber-400 flex items-center gap-1"><AlertTriangle size={12} /> Pending Agent ({currentUser?.fullName})</span>
          )}
        </span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto">
        <span className="text-slate-400 hidden md:inline">Quick Switch:</span>
        {availableUsers.map((user) => {
          const isSelected = currentUser?.id === user.id;
          return (
            <button
              key={user.id}
              onClick={() => switchUser(user.id)}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all whitespace-nowrap ${
                isSelected
                  ? 'bg-cyan-500 text-slate-950 shadow-sm font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
              }`}
            >
              {user.role === 'GNK_ADMIN' ? '🛡️ Admin' : user.approvalStatus === 'APPROVED' ? `🏢 ${user.fullName.split(' ')[0]}` : `⏳ ${user.fullName.split(' ')[0]} (Pending)`}
            </button>
          );
        })}

        <div className="h-4 w-px bg-slate-700 mx-1 hidden sm:block" />
        <Link 
          to="/admin" 
          className="text-amber-400 hover:text-amber-300 font-bold px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-all flex items-center gap-1"
        >
          <Shield size={12} /> Admin Console
        </Link>
        <Link 
          to="/" 
          className="text-slate-400 hover:text-white transition-colors"
        >
          Customer Site ↗
        </Link>
      </div>
    </div>
  );
};
