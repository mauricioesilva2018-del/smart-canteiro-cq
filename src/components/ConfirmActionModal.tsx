import React from 'react';
import { AlertTriangle, CheckCircle, HelpCircle, X, LogOut, ClipboardCheck } from 'lucide-react';

interface ConfirmActionModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  subMessage?: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger' | 'warning' | 'emerald';
  iconType?: 'warning' | 'success' | 'question' | 'danger' | 'finish';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({
  isOpen,
  title,
  message,
  subMessage,
  confirmText = 'Confirmar',
  cancelText = 'Voltar',
  confirmVariant = 'primary',
  iconType = 'warning',
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (iconType) {
      case 'finish':
        return <ClipboardCheck className="w-6 h-6 text-emerald-600" />;
      case 'danger':
        return <AlertTriangle className="w-6 h-6 text-rose-600" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-amber-600" />;
      case 'success':
        return <CheckCircle className="w-6 h-6 text-emerald-600" />;
      case 'question':
      default:
        return <HelpCircle className="w-6 h-6 text-blue-600" />;
    }
  };

  const getIconBg = () => {
    switch (iconType) {
      case 'finish':
      case 'success':
        return 'bg-emerald-100';
      case 'danger':
        return 'bg-rose-100';
      case 'warning':
        return 'bg-amber-100';
      case 'question':
      default:
        return 'bg-blue-100';
    }
  };

  const getConfirmBtnClass = () => {
    switch (confirmVariant) {
      case 'danger':
        return 'bg-rose-600 hover:bg-rose-700 text-white';
      case 'emerald':
        return 'bg-[#1b4332] hover:bg-[#2d6a4f] text-white';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700 text-white';
      case 'primary':
      default:
        return 'bg-[#2d6a4f] hover:bg-[#1b4332] text-white';
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onCancel();
        }
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-100 space-y-5 relative">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl ${getIconBg()} flex items-center justify-center shrink-0`}>
            {getIcon()}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-500 font-medium">Smart Canteiro CQ</p>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-1">
          <p className="text-sm font-bold text-gray-900 leading-relaxed">
            {message}
          </p>
          {subMessage && (
            <p className="text-xs font-medium text-gray-600 mt-1">
              {subMessage}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-xs sm:text-sm transition-colors cursor-pointer"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95 ${getConfirmBtnClass()}`}
          >
            <span>{isLoading ? 'Processando...' : confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
