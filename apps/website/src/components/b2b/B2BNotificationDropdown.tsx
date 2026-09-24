import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Wallet, 
  Check 
} from 'lucide-react';
import { useB2BAuth } from '../../context/B2BAuthContext';
import { b2bStore } from '../../services/b2b/b2bStore';
import { B2BNotification } from '../../types/b2b';

export const B2BNotificationDropdown: React.FC = () => {
  const { currentUser } = useB2BAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<B2BNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      const email = currentUser?.role === 'GNK_ADMIN' ? undefined : currentUser?.email;
      const list = b2bStore.getNotifications(email);
      setNotifications(list);
    };

    update();
    return b2bStore.subscribe(update);
  }, [currentUser]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

  const markAllAsRead = () => {
    const all = new Set(notifications.map(n => n.id));
    setReadIds(all);
  };

  const getIcon = (type: B2BNotification['type']) => {
    switch (type) {
      case 'BOOKING_CONFIRMED':
        return <CheckCircle2 size={16} className="text-emerald-400" />;
      case 'AGENT_APPROVED':
        return <CheckCircle2 size={16} className="text-cyan-400" />;
      case 'LEDGER_CREDIT':
        return <Wallet size={16} className="text-amber-400" />;
      case 'BOOKING_REQUEST_RECEIVED':
        return <Clock size={16} className="text-blue-400" />;
      default:
        return <FileText size={16} className="text-purple-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700/80 focus:outline-none"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-cyan-500 text-slate-950 text-[10px] font-black flex items-center justify-center animate-pulse shadow-md shadow-cyan-500/50">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fadeIn">
          {/* Header */}
          <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-black text-white uppercase tracking-wider">
                Notifications Dispatch Log
              </h4>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold text-[10px]">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] text-slate-400 hover:text-cyan-400 font-semibold transition-colors flex items-center gap-1"
              >
                <Check size={12} /> Mark read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/80">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                No notifications logged yet
              </div>
            ) : (
              notifications.map((n) => {
                const isUnread = !readIds.has(n.id);
                return (
                  <div
                    key={n.id}
                    className={`p-3.5 hover:bg-slate-800/40 transition-colors flex items-start gap-3 text-xs ${
                      isUnread ? 'bg-cyan-950/15' : ''
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-slate-800 border border-slate-700/80 shrink-0 mt-0.5">
                      {getIcon(n.type)}
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-white text-[12px] line-clamp-1">
                          {n.title}
                        </span>
                        <span className="text-[10px] text-slate-500 shrink-0">
                          {new Date(n.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <p className="text-slate-400 text-[11px] leading-relaxed line-clamp-2">
                        {n.body}
                      </p>

                      <div className="pt-1 flex items-center gap-2 text-[10px]">
                        <span className="font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/50 px-1.5 py-0.2 rounded">
                          {n.channel}
                        </span>
                        <span className="text-slate-500">
                          To: {n.recipientName}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 text-center text-[10px] text-slate-500">
            Simulated Email, SMS & WhatsApp Delivery Service Active
          </div>
        </div>
      )}
    </div>
  );
};
