import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';

export interface ToastMessage {
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastNotificationProps {
  toast: ToastMessage | null;
  onClose: () => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-lg w-full px-4 animate-in slide-in-from-top-4 duration-300">
      <div className={`rounded-2xl p-4 shadow-2xl border flex items-center justify-between gap-3 ${
        isSuccess 
          ? 'bg-[#1b4332] text-white border-emerald-500 shadow-emerald-900/20' 
          : isError 
            ? 'bg-rose-900 text-white border-rose-600 shadow-rose-950/30' 
            : 'bg-gray-900 text-white border-gray-700 shadow-gray-950/20'
      }`}>
        <div className="flex items-center gap-3">
          {isSuccess && <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />}
          {isError && <AlertCircle className="w-6 h-6 text-rose-400 shrink-0" />}
          {!isSuccess && !isError && <Info className="w-6 h-6 text-blue-400 shrink-0" />}
          <span className="text-sm font-bold tracking-wide">{toast.message}</span>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white/80 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
