import React, { useState, useRef, useEffect } from 'react';
import { FotoAmostra } from '../types';
import { storageService } from '../services/storageService';
import { Camera, Image as ImageIcon, Trash2, ZoomIn, X, Plus } from 'lucide-react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { ToastNotification, ToastMessage } from './ToastNotification';

interface FotoManagerProps {
  amostraId: string;
  readOnly?: boolean;
}

export const FotoManager: React.FC<FotoManagerProps> = ({ amostraId, readOnly = false }) => {
  const [fotos, setFotos] = useState<FotoAmostra[]>(storageService.getFotosByAmostra(amostraId));
  const [activeZoomFoto, setActiveZoomFoto] = useState<FotoAmostra | null>(null);
  const [fotoToDelete, setFotoToDelete] = useState<FotoAmostra | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const refreshFotos = () => {
    setFotos(storageService.getFotosByAmostra(amostraId));
  };

  useEffect(() => {
    refreshFotos();
    const unsubscribe = storageService.subscribe(() => {
      refreshFotos();
    });
    return () => unsubscribe();
  }, [amostraId]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    (Array.from(files) as File[]).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          await storageService.addFoto(
            amostraId,
            base64,
            file.name,
            `Foto anexada em ${new Date().toLocaleTimeString('pt-BR')}`
          );
          refreshFotos();
        }
      };
      reader.readAsDataURL(file);
    });

    if (e.target) e.target.value = '';
  };

  const handleConfirmDeleteFoto = async () => {
    if (!fotoToDelete) return;
    try {
      const success = await storageService.deleteFoto(fotoToDelete.id);
      if (success) {
        setToast({ type: 'success', message: 'Registro excluído com sucesso.' });
        refreshFotos();
        if (activeZoomFoto?.id === fotoToDelete.id) {
          setActiveZoomFoto(null);
        }
      } else {
        setToast({ type: 'error', message: 'Erro ao excluir foto.' });
      }
    } catch (error) {
      setToast({ type: 'error', message: `Erro ao excluir foto: ${error instanceof Error ? error.message : String(error)}` });
    } finally {
      setFotoToDelete(null);
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Action Buttons: Camera & Gallery */}
      {!readOnly && (
        <div className="flex items-center gap-3">
          
          {/* Camera Trigger */}
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 bg-[#1b4332] hover:bg-[#2d6a4f] text-white py-3 px-4 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95"
          >
            <Camera className="w-5 h-5 text-[#d8f3dc]" />
            <span>Tirar Foto (Câmera)</span>
          </button>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileUpload}
          />

          {/* Gallery Trigger */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all border border-gray-200"
          >
            <ImageIcon className="w-5 h-5 text-[#2d6a4f]" />
            <span>Galeria</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileUpload}
          />

        </div>
      )}

      {/* Grid de Miniaturas */}
      {fotos.length === 0 ? (
        <div className="p-6 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
          <Camera className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-xs font-semibold text-gray-600">Nenhuma foto do canteiro anexada</p>
          <p className="text-[11px] text-gray-400">Tire fotos pelo celular para registrar o estado das plântulas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {fotos.map((foto) => (
            <div
              key={foto.id}
              className="group relative bg-gray-900 rounded-xl overflow-hidden border border-gray-200 aspect-4/3 shadow-xs hover:shadow-md transition-all"
            >
              <img
                src={foto.foto}
                alt={foto.nome || 'Foto canteiro'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />

              {/* Overlay Controls */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                <div className="flex items-center justify-end gap-1">
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setFotoToDelete(foto);
                      }}
                      className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors shadow-sm cursor-pointer"
                      title="Excluir Foto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div 
                  onClick={() => setActiveZoomFoto(foto)}
                  className="cursor-pointer flex items-center justify-between text-white"
                >
                  <span className="text-[10px] font-bold truncate max-w-[80%]">
                    {foto.nome || 'Foto'}
                  </span>
                  <ZoomIn className="w-4 h-4 text-[#d8f3dc]" />
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Modal Zoom Ampliado */}
      {activeZoomFoto && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
            
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setActiveZoomFoto(null);
              }}
              className="absolute -top-12 right-0 p-2 text-white bg-white/20 hover:bg-white/40 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <img
              src={activeZoomFoto.foto}
              alt="Foto Ampliada"
              className="max-h-[80vh] w-auto object-contain rounded-xl shadow-2xl border border-white/20"
            />

            <div className="mt-4 text-center text-white">
              <p className="font-bold text-sm">{activeZoomFoto.nome}</p>
              <p className="text-xs text-gray-300 mt-0.5">
                Enviado em {new Date(activeZoomFoto.dataUpload).toLocaleString('pt-BR')}
              </p>
            </div>

          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão de Foto */}
      <ConfirmDeleteModal
        isOpen={!!fotoToDelete}
        itemName={fotoToDelete?.nome || 'Foto'}
        title="Excluir Foto"
        message="Tem certeza que deseja excluir este registro?"
        onCancel={() => setFotoToDelete(null)}
        onConfirm={handleConfirmDeleteFoto}
      />

      {/* Toast Notification */}
      <ToastNotification
        toast={toast}
        onClose={() => setToast(null)}
      />

    </div>
  );
};
