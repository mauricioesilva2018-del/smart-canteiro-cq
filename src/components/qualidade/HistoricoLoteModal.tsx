import React, { useState } from 'react';
import { 
  X, 
  History, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Plus, 
  Download, 
  ExternalLink,
  ShieldCheck,
  Tag,
  Building2,
  User,
  Paperclip,
  Trash2,
  Edit3
} from 'lucide-react';
import { LoteQualidade, AnaliseQualidade, DocumentoAnexoQualidade } from '../../types';
import { storageService } from '../../services/storageService';
import { formatDateBR, getDaysDifference, getTodayBR } from '../../utils/dateUtils';
import { termoConformidadeService } from '../../services/termoConformidadeService';

interface HistoricoLoteModalProps {
  lote: LoteQualidade;
  onClose: () => void;
  onNovaReanalise: (lote: LoteQualidade) => void;
  onVerDocumento: (doc?: DocumentoAnexoQualidade, lote?: LoteQualidade, analise?: AnaliseQualidade) => void;
  onEditarLote?: (lote: LoteQualidade, analise?: AnaliseQualidade) => void;
}

export const HistoricoLoteModal: React.FC<HistoricoLoteModalProps> = ({
  lote,
  onClose,
  onNovaReanalise,
  onVerDocumento,
  onEditarLote,
}) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'auditoria'>('timeline');
  const [analiseParaExcluir, setAnaliseParaExcluir] = useState<AnaliseQualidade | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  const analises = storageService.getAnalisesQualidade(lote.id);
  const auditorias = storageService.getAuditoriaQualidade(lote.id);

  const diasRestantes = getDaysDifference(lote.dataValidadeAtual, getTodayBR());
  const isVencido = diasRestantes < 0;

  const handleConfirmarExclusaoAnalise = async () => {
    if (!analiseParaExcluir) return;
    try {
      setExcluindo(true);
      await storageService.excluirAnaliseQualidade(lote.id, analiseParaExcluir.id);
      setAnaliseParaExcluir(null);
      // Se não restou nenhuma análise ou se o lote foi excluído
      const restantes = storageService.getAnalisesQualidade(lote.id);
      if (restantes.length === 0) {
        onClose();
      }
    } catch (e) {
      console.error('Erro ao excluir análise:', e);
    } finally {
      setExcluindo(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-gray-900">
                  Histórico e Rastreabilidade — Lote {lote.lote}
                </h3>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full">
                  {lote.cultura}
                </span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold text-[10px] rounded-full">
                  {lote.categoria}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Cultivar: <strong>{lote.cultivar}</strong> • Safra: {lote.safra} • Total de análises:{' '}
                <strong>{analises.length}</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                onClose();
                onNovaReanalise(lote);
              }}
              className="inline-flex items-center px-3 py-1.5 text-xs font-bold text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> + Nova Reanálise
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Resumo do Lote Card */}
        <div className="px-6 py-3 bg-emerald-900 text-white flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1">
            <div>
              <span className="text-emerald-300 text-[10px] block">Germinação Atual:</span>
              <strong className="text-sm font-bold">{lote.germinacaoAtual ?? '-'}%</strong>
            </div>
            <div>
              <span className="text-emerald-300 text-[10px] block">Vigor Atual:</span>
              <strong className="text-sm font-bold">{lote.vigorAtual ?? '-'}%</strong>
            </div>
            <div>
              <span className="text-emerald-300 text-[10px] block">Pureza Física:</span>
              <strong className="text-sm font-bold">{lote.purezaAtual ?? '-'}%</strong>
            </div>
            <div>
              <span className="text-emerald-300 text-[10px] block">Umidade:</span>
              <strong className="text-sm font-bold">{lote.umidadeAtual ?? '-'}%</strong>
            </div>
          </div>

          <div className="flex items-center space-x-3 bg-emerald-800/80 px-3 py-1.5 rounded-lg border border-emerald-700">
            <div>
              <span className="text-emerald-200 text-[10px] block">Validade Vigente:</span>
              <span className="font-bold text-xs">{formatDateBR(lote.dataValidadeAtual)}</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                isVencido
                  ? 'bg-rose-500 text-white'
                  : diasRestantes <= 30
                  ? 'bg-amber-400 text-amber-950'
                  : 'bg-emerald-500 text-white'
              }`}
            >
              {isVencido ? `Vencido (${Math.abs(diasRestantes)}d)` : `Vence em ${diasRestantes}d`}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6 bg-gray-50 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`py-3 px-4 border-b-2 transition ${
              activeTab === 'timeline'
                ? 'border-emerald-700 text-emerald-800 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Linha do Tempo de Análises ({analises.length})
          </button>
          <button
            onClick={() => setActiveTab('auditoria')}
            className={`py-3 px-4 border-b-2 transition ${
              activeTab === 'auditoria'
                ? 'border-emerald-700 text-emerald-800 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Registro de Auditoria ({auditorias.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {activeTab === 'timeline' ? (
            <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-emerald-200">
              {analises.map((analise, index) => {
                const isOriginal = analise.tipo === 'ORIGINAL' || analise.numeroAnalise === 1;
                const isLatest = index === analises.length - 1;

                return (
                  <div key={analise.id} className="relative group">
                    {/* Marcador na linha vertical */}
                    <div
                      className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow ${
                        isOriginal ? 'bg-emerald-600' : 'bg-amber-600'
                      }`}
                    >
                      {analise.numeroAnalise}
                    </div>

                    {/* Card da Análise */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4 hover:border-emerald-300 transition">
                      {/* Top Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              isOriginal
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isOriginal ? 'ANÁLISE ORIGINAL (#1)' : `REANÁLISE #${analise.numeroAnalise - 1}`}
                          </span>
                          {isLatest && analises.length > 1 && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded">
                              ● Vigente
                            </span>
                          )}
                          <span className="text-xs text-gray-500 flex items-center">
                            <Calendar className="w-3.5 h-3.5 mr-1" />
                            Data da Análise: <strong className="ml-1 text-gray-800">{formatDateBR(analise.dataAnalise)}</strong>
                          </span>
                        </div>

                        <div className="flex items-center space-x-2 text-xs">
                          <span className="text-gray-500">Validade:</span>
                          <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {formatDateBR(analise.dataValidade)}
                          </span>
                        </div>
                      </div>

                      {/* Info Meta */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-gray-50 p-3 rounded-lg border border-gray-200/70">
                        <div>
                          <span className="text-gray-500 block text-[10px]">Laboratório / Laudo:</span>
                          <span className="font-semibold text-gray-800">{analise.laboratorio}</span>
                          <span className="text-[11px] font-mono text-gray-500 block">
                            Nº: {analise.numeroCertificadoLaudo || 'N/I'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 block text-[10px]">Responsável Técnico:</span>
                          <span className="font-semibold text-gray-800">{analise.responsavel}</span>
                          <span className="text-[10px] text-gray-500 block">
                            Cadastrado por: {analise.usuarioRegistro || 'Sistema'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 block text-[10px]">Resultado Geral:</span>
                          <span
                            className={`inline-flex items-center font-bold px-2 py-0.5 rounded text-[11px] ${
                              analise.resultadoGeralConforme
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {analise.resultadoGeralConforme ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Lote Conforme
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Não Conforme
                              </>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Tabela de Resultados dos Testes */}
                      <div>
                        <table className="w-full text-left text-xs border border-gray-200 rounded-lg overflow-hidden">
                          <thead className="bg-gray-100 text-gray-700">
                            <tr>
                              <th className="p-2.5">Teste / Parâmetro</th>
                              <th className="p-2.5 text-center">Resultado Obtido</th>
                              <th className="p-2.5 text-center">Padrão Norma</th>
                              <th className="p-2.5 text-center">Meta</th>
                              <th className="p-2.5 text-center">Situação</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {analise.resultados.map((res, i) => (
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="p-2 font-medium text-gray-800">{res.nomeTeste}</td>
                                <td className="p-2 text-center font-bold text-gray-900">
                                  {res.valorResultado} {res.unidade}
                                </td>
                                <td className="p-2 text-center text-gray-500 font-mono text-[11px]">
                                  {res.valorMinimo ? `Mín ${res.valorMinimo}${res.unidade}` : ''}{' '}
                                  {res.valorMaximo ? `Máx ${res.valorMaximo}${res.unidade}` : ''}
                                </td>
                                <td className="p-2 text-center text-emerald-800 font-mono text-[11px]">
                                  {res.valorMeta !== undefined ? `${res.valorMeta}${res.unidade}` : '-'}
                                </td>
                                <td className="p-2 text-center">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      res.situacao === 'CONFORME'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : res.situacao === 'NAO_CONFORME'
                                        ? 'bg-rose-100 text-rose-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    {res.situacao === 'CONFORME' && '🟢 Conforme'}
                                    {res.situacao === 'NAO_CONFORME' && '🔴 Não Conforme'}
                                    {res.situacao === 'ATENCAO' && '🟡 Atenção'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Observações */}
                      {analise.observacoes && (
                        <div className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded border border-gray-200">
                          <span className="font-semibold text-gray-700">Observações:</span> {analise.observacoes}
                        </div>
                      )}

                      {/* Documentos e Ações */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          {analise.termoConformidadeGerado && (
                            <button
                              onClick={() => onVerDocumento(undefined, lote, analise)}
                              className="inline-flex items-center px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg hover:bg-emerald-100 transition font-semibold"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                              Termo de Conformidade Oficial (PDF)
                            </button>
                          )}

                          {analise.documentoAnexo && (
                            <button
                              onClick={() => onVerDocumento(analise.documentoAnexo, lote, analise)}
                              className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-800 border border-blue-300 rounded-lg hover:bg-blue-100 transition font-semibold"
                            >
                              <Paperclip className="w-3.5 h-3.5 mr-1 text-blue-700" />
                              {analise.documentoAnexo.nomeArquivo}
                            </button>
                          )}

                          {onEditarLote && (
                            <button
                              onClick={() => onEditarLote(lote, analise)}
                              className="inline-flex items-center px-2.5 py-1 text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-lg transition font-medium border border-blue-200"
                              title="Editar informações desta análise"
                            >
                              <Edit3 className="w-3.5 h-3.5 mr-1" /> Editar Análise
                            </button>
                          )}

                          <button
                            onClick={() => setAnaliseParaExcluir(analise)}
                            className="inline-flex items-center px-2.5 py-1 text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 rounded-lg transition font-medium border border-rose-200"
                            title="Excluir esta análise do histórico"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir
                          </button>
                        </div>

                        <button
                          onClick={() => termoConformidadeService.baixarTermoConformidadePDF(lote, analise)}
                          className="inline-flex items-center text-xs text-gray-600 hover:text-emerald-700 font-medium"
                        >
                          <Download className="w-3.5 h-3.5 mr-1" /> Baixar Laudo Completo
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Aba de Auditoria */
            <div className="space-y-3">
              {auditorias.length > 0 ? (
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-100 text-gray-700">
                      <tr>
                        <th className="p-3">Data e Hora</th>
                        <th className="p-3">Usuário</th>
                        <th className="p-3">Ação</th>
                        <th className="p-3">Detalhes do Evento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {auditorias.map(aud => (
                        <tr key={aud.id} className="hover:bg-gray-50">
                          <td className="p-3 font-mono text-gray-500">
                            {new Date(aud.dataHora).toLocaleString('pt-BR')}
                          </td>
                          <td className="p-3 font-semibold text-gray-800">{aud.usuario}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-[10px] font-bold">
                              {aud.acao}
                            </span>
                          </td>
                          <td className="p-3 text-gray-600">{aud.detalhes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center p-8 text-gray-500 bg-white rounded-xl border border-gray-200">
                  <Clock className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm">Nenhum evento adicional registrado para este lote.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <span className="text-xs text-gray-500">
            Smart Canteiro • Módulo Oficial de Qualidade de Sementes
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition"
          >
            Fechar Histórico
          </button>
        </div>

        {/* Modal de Confirmação de Exclusão de Análise */}
        {analiseParaExcluir && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-6 max-w-md w-full space-y-4">
              <div className="flex items-center space-x-3 text-rose-600">
                <div className="p-3 bg-rose-100 rounded-full">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">Excluir Análise do Histórico?</h4>
                  <p className="text-xs text-gray-500">Esta ação registrará um evento de auditoria.</p>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs space-y-1">
                <p><strong>Lote:</strong> {lote.lote}</p>
                <p><strong>Análise:</strong> #{analiseParaExcluir.numeroAnalise} ({analiseParaExcluir.tipo})</p>
                <p><strong>Data:</strong> {formatDateBR(analiseParaExcluir.dataAnalise)}</p>
                <p><strong>Laboratório:</strong> {analiseParaExcluir.laboratorio}</p>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAnaliseParaExcluir(null)}
                  disabled={excluindo}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarExclusaoAnalise}
                  disabled={excluindo}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition shadow disabled:opacity-50 inline-flex items-center"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  {excluindo ? 'Excluindo...' : 'Sim, Excluir Análise'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
