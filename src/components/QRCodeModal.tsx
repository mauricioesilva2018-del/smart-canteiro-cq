import React from 'react';
import { Amostra } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer, QrCode } from 'lucide-react';

interface QRCodeModalProps {
  amostra: Amostra;
  onClose: () => void;
  onOpenAvaliacao: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  amostra,
  onClose,
  onOpenAvaliacao,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden border border-gray-100">
        
        {/* Header */}
        <div className="bg-[#1b4332] p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-[#d8f3dc]" />
            <h3 className="font-bold text-sm">Etiqueta QR Code - Canteiro</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-300 hover:bg-[#2d6a4f]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Label Section */}
        <div id="printable-qr-label" className="p-6 flex flex-col items-center text-center space-y-4">
          
          <div className="bg-white p-4 rounded-2xl border-2 border-[#1b4332] shadow-inner">
            <QRCodeSVG value={amostra.protocolo} size={180} level="H" />
          </div>

          <div>
            <span className="text-xl font-black text-gray-900 block">{amostra.protocolo}</span>
            <p className="font-bold text-sm text-[#2d6a4f] mt-0.5">{amostra.cultura} - {amostra.cultivar}</p>
            <p className="text-xs text-gray-600 mt-1">Lote: {amostra.lote} | Peneira: {amostra.peneira}</p>
            <p className="text-xs text-gray-500">Semeadura: {new Date(amostra.dataSemeadura + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
          </div>

          <div className="bg-[#f0f7f4] border border-[#b7e4c7] rounded-xl p-2.5 w-full text-[11px] text-[#1b4332] font-semibold">
            Fixar no canteiro para leitura rápida no campo
          </div>

        </div>

        {/* Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Etiqueta</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenAvaliacao();
            }}
            className="flex-1 py-2.5 bg-[#1b4332] hover:bg-[#2d6a4f] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-colors"
          >
            <span>Iniciar Leitura</span>
          </button>
        </div>

      </div>
    </div>
  );
};
