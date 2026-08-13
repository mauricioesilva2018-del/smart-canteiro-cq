import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { storageService } from '../services/storageService';
import { Amostra } from '../types';
import { X, QrCode, Search, Camera, CheckCircle2, ArrowRight } from 'lucide-react';

interface QRScannerModalProps {
  onClose: () => void;
  onSelectAmostra: (amostraId: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  onClose,
  onSelectAmostra,
}) => {
  const [manualProtocol, setManualProtocol] = useState('');
  const [scanError, setScanError] = useState('');
  const [useCameraScanner, setUseCameraScanner] = useState(true);

  const amostras = storageService.getAmostras();

  useEffect(() => {
    if (!useCameraScanner) return;

    let scanner: Html5QrcodeScanner | null = null;

    try {
      scanner = new Html5QrcodeScanner(
        'qr-reader-container',
        { fps: 10, qrbox: { width: 220, height: 220 } },
        /* verbose= */ false
      );

      scanner.render(
        (decodedText) => {
          // Quando lê um QR Code
          const found = amostras.find(
            a => a.protocolo.toLowerCase() === decodedText.toLowerCase() || a.id === decodedText
          );

          if (found) {
            scanner?.clear();
            onSelectAmostra(found.id);
          } else {
            setScanError(`Protocolo "${decodedText}" não encontrado no sistema.`);
          }
        },
        (error) => {
          // Ignora erros normais de frame sem QR code
        }
      );
    } catch (err) {
      console.error('Erro ao iniciar câmera QR:', err);
      setUseCameraScanner(false);
    }

    return () => {
      try {
        scanner?.clear();
      } catch (e) {
        // cleanup
      }
    };
  }, [useCameraScanner]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualProtocol.trim()) return;

    const found = amostras.find(
      a => a.protocolo.toLowerCase() === manualProtocol.trim().toLowerCase() || a.id === manualProtocol.trim()
    );

    if (found) {
      onSelectAmostra(found.id);
    } else {
      setScanError(`Nenhuma amostra encontrada para "${manualProtocol}".`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-[#1b4332] p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#d8f3dc]" />
            <h3 className="font-bold text-base">Escanear Canteiro de Sementes</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-300 hover:bg-[#2d6a4f]">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          
          {scanError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs font-bold">
              {scanError}
            </div>
          )}

          {/* Camera View / Toggle */}
          {useCameraScanner ? (
            <div className="space-y-2">
              <div id="qr-reader-container" className="rounded-2xl overflow-hidden border-2 border-[#2d6a4f] bg-black" />
              <button
                type="button"
                onClick={() => setUseCameraScanner(false)}
                className="text-xs text-[#2d6a4f] font-bold hover:underline block mx-auto pt-1"
              >
                Alternar para busca manual por número
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setScanError('');
                setUseCameraScanner(true);
              }}
              className="w-full py-2.5 bg-[#2d6a4f] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" />
              <span>Ativar Câmera QR</span>
            </button>
          )}

          {/* Manual Input Form */}
          <form onSubmit={handleManualSubmit} className="pt-2 border-t border-gray-100 space-y-2">
            <label className="block text-xs font-bold text-gray-700">
              Digite o número do protocolo do canteiro
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={manualProtocol}
                onChange={(e) => setManualProtocol(e.target.value)}
                placeholder="Ex: PRT-2026-001"
                className="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-sm font-bold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
              />
              <button
                type="submit"
                className="bg-[#1b4332] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm"
              >
                <span>Abrir</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Atalho com lista rápida de amostras pendentes */}
          <div className="pt-3 border-t border-gray-100">
            <span className="text-xs font-bold text-gray-500 uppercase block mb-2">
              Amostras Recentes no Sistema (Toque para abrir)
            </span>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {amostras.slice(0, 5).map(a => (
                <div
                  key={a.id}
                  onClick={() => onSelectAmostra(a.id)}
                  className="p-2.5 bg-gray-50 hover:bg-[#d8f3dc]/50 border border-gray-200 rounded-xl cursor-pointer flex items-center justify-between text-xs transition-colors"
                >
                  <div>
                    <span className="font-extrabold text-gray-900">{a.protocolo}</span>
                    <span className="text-gray-500 ml-2 font-medium">{a.cultura} - {a.cultivar}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    a.status === 'Concluído' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {a.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
