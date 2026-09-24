import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  showToast: (title: string, message?: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((title: string, message?: string, type: ToastType = 'success') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, title, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Notification Container */}
      <div className="fixed top-20 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-2 sm:px-0">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-auto bg-navy-900/95 backdrop-blur-xl border border-navy-700/80 text-white p-4 rounded-2xl shadow-2xl flex items-start gap-3 relative overflow-hidden"
            >
              {/* Type Accent Strip */}
              <div 
                className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                  toast.type === 'success' ? 'bg-cyan-400' : toast.type === 'error' ? 'bg-red-400' : 'bg-blue-400'
                }`}
              />

              {/* Icon */}
              <div className="mt-0.5 shrink-0 pl-1">
                {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-cyan-400" />}
                {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400" />}
                {toast.type === 'info' && <Info className="w-5 h-5 text-blue-400" />}
              </div>

              {/* Text */}
              <div className="flex-1 pr-2">
                <h4 className="font-bold text-sm text-white">{toast.title}</h4>
                {toast.message && (
                  <p className="text-xs text-gray-300 mt-0.5 leading-relaxed">{toast.message}</p>
                )}
              </div>

              {/* Close button */}
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                aria-label="Dismiss notification"
                className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
