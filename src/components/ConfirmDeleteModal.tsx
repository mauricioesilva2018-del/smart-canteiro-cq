import React from 'react';
import { Trash2, X } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  itemName?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  title = "Excluir Registro",
  message = "Tem certeza que deseja excluir este registro?",
  itemName,
  onConfirm,
  onCancel,
  isDeleting = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-100 space-y-5 relative">
        <button
          type="button"
          onClick={onCancel}
          disabled={isDeleting}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 font-medium">Confirmação do Módulo Canteiro</p>
          </div>
        </div>

        <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-4 space-y-1">
          <p className="text-sm font-bold text-rose-900">
            {message}
          </p>
          {itemName && (
            <p className="text-xs font-semibold text-rose-700">
              Item selecionado: <span className="font-bold underline">{itemName}</span>
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-xs sm:text-sm transition-colors cursor-pointer"
          >
            CANCELAR
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isDeleting ? 'EXCLUINDO...' : 'EXCLUIR'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
