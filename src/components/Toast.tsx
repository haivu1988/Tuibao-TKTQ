import React from 'react';
import { ToastMessage } from '../types';
import { CheckCircle2, AlertOctagon, AlertCircle, Info, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div
      id="toast-portal-container"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 pointer-events-none space-y-2"
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          const bgClasses = {
            success: 'bg-emerald-600 text-white shadow-emerald-600/30',
            error: 'bg-rose-600 text-white shadow-rose-600/30',
            warning: 'bg-amber-500 text-white shadow-amber-500/30',
            info: 'bg-indigo-600 text-white shadow-indigo-600/30'
          }[toast.type];

          const IconComponent = {
            success: CheckCircle2,
            error: AlertOctagon,
            warning: AlertCircle,
            info: Info
          }[toast.type];

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl shadow-lg border border-white/10 ${bgClasses}`}
            >
              <div className="shrink-0 mt-0.5">
                <IconComponent className="w-5 h-5" />
              </div>
              <div className="flex-1 text-xs">
                <div className="font-bold text-sm leading-tight">{toast.title}</div>
                <div className="mt-1 opacity-90 leading-relaxed">{toast.message}</div>
              </div>
              <button
                onClick={() => onDismiss(toast.id)}
                className="shrink-0 p-1 hover:bg-white/20 rounded-md transition"
                aria-label="Đóng thông báo"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
