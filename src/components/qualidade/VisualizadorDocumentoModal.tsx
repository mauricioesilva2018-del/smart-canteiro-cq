import React from 'react';
import { X, Download, FileText, Printer, ShieldCheck } from 'lucide-react';
import { DocumentoAnexoQualidade, LoteQualidade, AnaliseQualidade } from '../../types';
import { termoConformidadeService } from '../../services/termoConformidadeService';
import { formatDateBR } from '../../utils/dateUtils';

interface VisualizadorDocumentoModalProps {
  documento?: DocumentoAnexoQualidade;
  lote?: LoteQualidade;
  analise?: AnaliseQualidade;
  onClose: () => void;
}

export const VisualizadorDocumentoModal: React.FC<VisualizadorDocumentoModalProps> = ({
  documento,
  lote,
  analise,
  onClose,
}) => {
  const isTermo = !documento && lote && analise;

  const handleDownload = () => {
    if (documento && documento.arquivoBase64) {
      const link = document.createElement('a');
      link.href = documento.arquivoBase64;
      link.download = documento.nomeArquivo || `documento-${documento.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (lote && analise) {
      termoConformidadeService.baixarTermoConformidadePDF(lote, analise);
    }
  };

  const handlePrintOrNewTab = () => {
    if (lote && analise) {
      termoConformidadeService.visualizarTermoConformidadePDF(lote, analise);
    } else if (documento?.arquivoBase64) {
      const win = window.open();
      if (win) {
        win.document.write(
          `<iframe src="${documento.arquivoBase64}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
        );
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                {isTermo
                  ? `Termo de Conformidade Oficial — Lote ${lote?.lote}`
                  : documento?.nomeArquivo || 'Documento do Lote'}
              </h3>
              <p className="text-xs text-gray-500">
                {isTermo
                  ? `Emissão em conformidade com as normas do MAPA | Categoria ${lote?.categoria}`
                  : `Tipo: ${documento?.tipo || 'Certificado'} | Upload em: ${formatDateBR(documento?.dataUpload?.split('T')[0])}`}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrintOrNewTab}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              title="Abrir em nova aba / Imprimir"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              Imprimir / Nova Aba
            </button>
            <button
              onClick={handleDownload}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Baixar Documento
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 p-6 overflow-y-auto bg-gray-100 flex items-center justify-center min-h-[400px]">
          {isTermo ? (
            <div className="w-full max-w-2xl bg-white p-8 rounded-lg shadow-md border border-gray-300 text-gray-800 space-y-4">
              <div className="text-center border-b pb-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 mb-2">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Documento Oficial MAPA
                </span>
                <h2 className="text-lg font-bold text-gray-900">TERMO DE CONFORMIDADE DE SEMENTES</h2>
                <p className="text-xs text-gray-500">Lei nº 10.711/2003 e Decreto nº 10.586/2020</p>
                <p className="text-xs font-mono font-bold text-emerald-800 mt-1">
                  {analise?.termoConformidadeNumeroDoc || `TC-${lote?.lote}-ORIG`}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div>
                  <span className="text-gray-500">Lote:</span>{' '}
                  <strong className="text-rose-700 font-mono">{lote?.lote}</strong>
                </div>
                <div>
                  <span className="text-gray-500">Cultura:</span>{' '}
                  <strong>{lote?.cultura}</strong>
                </div>
                <div>
                  <span className="text-gray-500">Cultivar:</span>{' '}
                  <strong>{lote?.cultivar}</strong>
                </div>
                <div>
                  <span className="text-gray-500">Categoria:</span>{' '}
                  <strong className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-bold">
                    {lote?.categoria}
                  </strong>
                </div>
                <div>
                  <span className="text-gray-500">Safra:</span> <strong>{lote?.safra}</strong>
                </div>
                <div>
                  <span className="text-gray-500">Quantidade:</span>{' '}
                  <strong>{lote?.quantidade}</strong>
                </div>
                <div>
                  <span className="text-gray-500">Data da Análise:</span>{' '}
                  <strong>{formatDateBR(analise?.dataAnalise)}</strong>
                </div>
                <div>
                  <span className="text-gray-500">Validade da Germinação:</span>{' '}
                  <strong className="text-emerald-700">{formatDateBR(analise?.dataValidade)}</strong>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-emerald-800 text-white">
                    <tr>
                      <th className="p-2">Teste Avaliado</th>
                      <th className="p-2 text-center">Resultado</th>
                      <th className="p-2 text-center">Padrão Mín/Máx</th>
                      <th className="p-2 text-center">Situação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {analise?.resultados.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="p-2 font-medium">{r.nomeTeste}</td>
                        <td className="p-2 text-center font-bold">
                          {r.valorResultado} {r.unidade}
                        </td>
                        <td className="p-2 text-center text-gray-500">
                          {r.valorMinimo ? `Mín ${r.valorMinimo}${r.unidade}` : ''}{' '}
                          {r.valorMaximo ? `Máx ${r.valorMaximo}${r.unidade}` : ''}
                        </td>
                        <td className="p-2 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.situacao === 'CONFORME'
                                ? 'bg-emerald-100 text-emerald-800'
                                : r.situacao === 'NAO_CONFORME'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {r.situacao}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-center pt-4">
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-emerald-700 text-white text-xs font-bold rounded-lg hover:bg-emerald-800 shadow transition"
                >
                  📥 Baixar Termo de Conformidade em PDF Oficial
                </button>
              </div>
            </div>
          ) : documento?.arquivoBase64 ? (
            documento.tipoMime?.includes('image') || documento.arquivoBase64.startsWith('data:image') ? (
              <img
                src={documento.arquivoBase64}
                alt={documento.nomeArquivo}
                className="max-h-[70vh] max-w-full rounded border border-gray-300 shadow-md object-contain bg-white"
              />
            ) : (
              <iframe
                src={documento.arquivoBase64}
                title={documento.nomeArquivo}
                className="w-full h-[70vh] rounded border border-gray-300 shadow-md bg-white"
              />
            )
          ) : (
            <div className="text-center text-gray-500 p-8">
              <FileText className="w-12 h-12 mx-auto text-gray-400 mb-2" />
              <p className="text-sm font-medium">Nenhum arquivo digital anexado a este registro.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
