import React from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { DemoUserSwitcher } from './DemoUserSwitcher';
import { B2BNotificationDropdown } from './B2BNotificationDropdown';
import { b2bStore } from '../../services/b2b/b2bStore';
import { 
  Shield, 
  LayoutDashboard, 
  Users, 
  Percent, 
  FileCheck2, 
  Receipt, 
  Radio, 
  ArrowLeft,
  DollarSign 
} from 'lucide-react';

export const AdminLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  const [counts, setCounts] = React.useState({
    pendingAgents: 0,
    pendingBookings: 0,
    pendingPayments: 0
  });

  React.useEffect(() => {
    const updateCounts = () => {
      const users = b2bStore.getUsers();
      const bookings = b2bStore.getBookings();
      const payments = b2bStore.getPayments();

      setCounts({
        pendingAgents: users.filter(u => u.approvalStatus === 'PENDING_VERIFICATION' || u.approvalStatus === 'ADMIN_REVIEW').length,
        pendingBookings: bookings.filter(b => b.status === 'PENDING_APPROVAL').length,
        pendingPayments: payments.filter(p => p.status === 'PENDING_VERIFICATION').length
      });
    };

    updateCounts();
    return b2bStore.subscribe(updateCounts);
  }, []);

  const navItems = [
    { name: 'Command Center', path: '/admin', icon: LayoutDashboard },
    { 
      name: 'Agent Approvals', 
      path: '/admin/agents', 
      icon: Users, 
      badge: counts.pendingAgents > 0 ? counts.pendingAgents : null 
    },
    { name: 'Pricing Rules Engine', path: '/admin/pricing', icon: Percent },
    { 
      name: 'Booking Operations', 
      path: '/admin/bookings', 
      icon: FileCheck2,
      badge: counts.pendingBookings > 0 ? counts.pendingBookings : null 
    },
    { 
      name: 'Payments & Receipts', 
      path: '/admin/payments', 
      icon: Receipt,
      badge: counts.pendingPayments > 0 ? counts.pendingPayments : null 
    },
    { name: 'Financial Ledger & SOA', path: '/admin/ledger', icon: DollarSign },
    { name: 'Suppliers & AirDesk', path: '/admin/suppliers', icon: Radio },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      <DemoUserSwitcher />

      {/* Admin Top Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link to="/admin" className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-lg font-black tracking-tight text-white">
                    GNK <span className="text-amber-400">ADMIN</span>
                  </span>
                  <span className="ml-2 text-[10px] uppercase font-bold tracking-widest bg-amber-950 text-amber-300 border border-amber-800/60 px-1.5 py-0.5 rounded">
                    Operations
                  </span>
                </div>
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <B2BNotificationDropdown />
              <Link
                to="/agent/dashboard"
                className="text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft size={14} /> Agent Portal
              </Link>
            </div>
          </div>
        </div>

        {/* Admin Navigation Bar */}
        <div className="bg-slate-900/90 border-t border-slate-800/80 px-4">
          <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto py-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon size={15} />
                  <span>{item.name}</span>
                  {item.badge && (
                    <span className="ml-1 bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
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
          <span>GNK Elite B2B Admin Console • Supplier Sync: <strong className="text-emerald-400">AirDesk Groups Active</strong></span>
          <Link to="/" className="text-slate-400 hover:text-white">Customer Front ↗</Link>
        </div>
      </footer>
    </div>
  );
};
