import React from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { 
  Shield, 
  LayoutDashboard, 
  Users, 
  Percent, 
  FileCheck2, 
  Receipt, 
  Radio, 
  ArrowLeft,
  DollarSign,
  UserCheck,
  Bell
} from 'lucide-react';
import { ThemeToggle } from '@gnk/ui';

export function AdminLayout({ children }: { children?: React.ReactNode }) {
  const location = useLocation();
  const role = 'SUPER_ADMIN'; // TODO: Get from auth context/store

  const counts = {
    pendingAgents: 1,
    pendingBookings: 1,
    pendingPayments: 0
  };

  const allNavItems = [
    { name: 'Command Center', path: '/', icon: LayoutDashboard },
    { name: 'Agent Approvals', path: '/partners', icon: Users, badge: counts.pendingAgents > 0 ? counts.pendingAgents : null },
    { name: 'Pricing Rules Engine', path: '/pricing', icon: Percent },
    { name: 'Booking Operations', path: '/bookings', icon: FileCheck2, badge: counts.pendingBookings > 0 ? counts.pendingBookings : null },
    { name: 'Financial Ledger & SOA', path: '/financials', icon: DollarSign },
    { name: 'Suppliers & AirDesk', path: '/suppliers', icon: Radio },
    { name: 'Admin Staff & RBAC', path: '/staff', icon: UserCheck, badge: 'RBAC' }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950 font-sans">
      
      {/* Admin Top Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg font-black tracking-tight text-white">
                      GNK <span className="text-amber-400">ADMIN</span>
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-widest bg-amber-950 text-amber-300 border border-amber-800/60 px-1.5 py-0.5 rounded">
                      Command Center
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Role: <strong className="text-amber-400">{role.replace('_', ' ')}</strong>
                  </div>
                </div>
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="text-slate-300">AirDesk Sync: <strong>Active</strong></span>
              </div>

              <button className="relative p-2 text-slate-400 hover:text-amber-400 transition-colors">
                <Bell size={20} />
                <span className="absolute top-1 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-slate-900"></span>
              </button>

              <ThemeToggle />

              <a
                href="http://localhost:3001"
                className="text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft size={14} /> Agent Portal
              </a>
            </div>
          </div>
        </div>

        {/* Admin Navigation Bar */}
        <div className="bg-slate-900/90 border-t border-slate-800/80 px-4">
          <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto py-1 hide-scrollbar">
            {allNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (location.pathname.startsWith(item.path) && item.path !== '/');
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon size={14} />
                  <span>{item.name}</span>
                  {item.badge && (
                    <span className="ml-1 bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children || <Outlet />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <span>GNK Connect Operations Console • Role: <strong className="text-amber-400">{role}</strong></span>
          <a href="http://localhost:3000" className="text-slate-400 hover:text-white">Customer Front ↗</a>
        </div>
      </footer>
    </div>
  );
}
