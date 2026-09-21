import React, { useState, useEffect } from 'react';
import { Amostra, Avaliacao, Usuario } from '../types';
import { storageService } from '../services/storageService';
import { exportService } from '../services/exportService';
import { ConfirmActionModal } from './ConfirmActionModal';
import { 
  X, 
  History, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  FileText, 
  User, 
  ExternalLink,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import { formatDateBR } from '../utils/dateUtils';

interface HistoricoTestesModalProps {
  amostra: Amostra;
  currentUser: Usuario;
  onClose: () => void;
  onOpenAvaliacaoTeste: (amostraId: string, testeNumero?: number) => void;
  onFazerNovoTeste: (amostra: Amostra) => void;
}

export const HistoricoTestesModal: React.FC<HistoricoTestesModalProps> = ({
  amostra,
  currentUser,
  onClose,
  onOpenAvaliacaoTeste,
  onFazerNovoTeste,
}) => {
  const [testesList, setTestesList] = useState<Avaliacao[]>(() => storageService.getAvaliacoesByAmostraId(amostra.id));
  const [testeParaExcluir, setTesteParaExcluir] = useState<Avaliacao | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const unsub = storageService.subscribe(() => {
      setTestesList(storageService.getAvaliacoesByAmostraId(amostra.id));
    });
    return () => unsub();
  }, [amostra.id]);

  const allTestes = testesList;
  const totalTestes = allTestes.length;

  const ultimoTeste = allTestes.length > 0 ? allTestes[allTestes.length - 1] : undefined;
  const canCreateNovo = ultimoTeste && ultimoTeste.statusTeste !== 'rascunho';

  const handleConfirmDelete = async () => {
    if (!testeParaExcluir) return;
    setIsDeleting(true);
    try {
      await storageService.deleteAvaliacao(testeParaExcluir.id);
    } finally {
      setIsDeleting(false);
      setTesteParaExcluir(null);
    }
  };

  return (
    <div 
      id="modal-historico-testes-lote" 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#1b4332]/10 text-[#1b4332] rounded-xl">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-gray-900">
                  Histórico de Testes — Lote {amostra.lote}
                </h3>
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-900 font-bold text-[10px] rounded-full">
                  Total de testes realizados: {totalTestes}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Cultura: <strong>{amostra.cultura}</strong> • Cultivar: <strong>{amostra.cultivar}</strong> • Safra: {amostra.safra}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content / Lista de Testes */}
        <div className="p-6 overflow-y-auto space-y-4 max-h-[60vh]">
          {allTestes.length === 0 ? (
            <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-xl border border-gray-100">
              <History className="w-8 h-8 mx-auto text-gray-300 mb-2" />
              <p className="font-bold text-sm">Nenhum teste de germinação concluído ainda.</p>
              <p className="text-xs text-gray-400 mt-1">Realize a primeira avaliação para iniciar o histórico de testes do lote.</p>
            </div>
          ) : (
            allTestes.map((teste, index) => {
              const num = teste.testeNumero ?? (index + 1);
              const isAprovado = (teste.resultado || teste.resultadoAprovacao) === 'Aprovado';
              const isDraft = teste.statusTeste === 'rascunho';
              const dataExibicao = teste.dataAvaliacao || (teste.dataHora ? teste.dataHora.split('T')[0] : '');

              return (
                <div 
                  key={teste.id || index}
                  className="p-4 rounded-xl border border-gray-200 bg-white hover:border-[#1b4332]/40 transition-all shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-gray-900 text-white font-black text-xs rounded-lg">
                        TESTE {num}
                      </span>
                      {teste.dataInicioTeste ? (
                        <span className="text-xs text-gray-700 flex items-center gap-1.5 flex-wrap font-medium">
                          <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Início: <strong>{formatDateBR(teste.dataInicioTeste)}</strong></span>
                          <span>•</span>
                          <span>7d: <strong className="text-emerald-900">{formatDateBR(teste.dataLeitura7Dias)}</strong></span>
                          <span>•</span>
                          <span>10d: <strong className="text-teal-900">{formatDateBR(teste.dataLeitura10Dias)}</strong></span>
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500 flex items-center gap-1 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          Data: <strong>{formatDateBR(dataExibicao) || 'Não informada'}</strong>
                          {teste.horaAvaliacao && <span> às {teste.horaAvaliacao}</span>}
                        </span>
                      )}
                    </div>

                    <div>
                      {isDraft ? (
                        <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 font-bold text-xs rounded-full">
                          EM ANDAMENTO
                        </span>
                      ) : isAprovado ? (
                        <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 font-black text-xs rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          APROVADO
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 bg-rose-50 text-rose-800 border border-rose-200 font-black text-xs rounded-full flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          REPROVADO
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Grid de Métricas */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    <div><span className="text-gray-500">Germinação:</span> <p className="font-bold text-gray-900">{teste.germinacao}%</p></div>
                    <div><span className="text-gray-500">Plântulas Fortes:</span> <p className="font-bold text-gray-900">{teste.fortes}%</p></div>
                    <div><span className="text-gray-500">Intermediárias:</span> <p className="font-bold text-gray-900">{teste.intermediarias}%</p></div>
                    <div><span className="text-gray-500">Fracas:</span> <p className="font-bold text-gray-900">{teste.fracas}%</p></div>
                    <div><span className="text-gray-500">Anormais:</span> <p className="font-bold text-gray-900">{teste.anormais ?? 0}%</p></div>
                    <div><span className="text-gray-500">Mortas:</span> <p className="font-bold text-gray-900">{teste.mortas}%</p></div>
                    <div><span className="text-gray-500">Emergência (7d):</span> <p className="font-bold text-[#1b4332]">{teste.plantulasEmergidas7dias !== undefined ? `${teste.plantulasEmergidas7dias}%` : '-'}</p></div>
                    <div><span className="text-gray-500">Avaliador:</span> <p className="font-bold text-gray-900 truncate">{teste.usuario || teste.usuarioAvaliador || amostra.responsavel}</p></div>
                  </div>

                  {teste.observacoes && (
                    <p className="text-xs text-gray-600 bg-amber-50/60 p-2 rounded border border-amber-100 italic">
                      &ldquo;{teste.observacoes}&rdquo;
                    </p>
                  )}

                  {/* Ações por Teste */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-gray-400">
                      {teste.testeAnteriorId ? `Vinculado ao teste anterior (${teste.testeAnteriorId.slice(-8)})` : 'Teste Inicial'}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const fotos = storageService.getFotosByAmostra(amostra.id);
                          exportService.generateSamplePDF(amostra, teste, fotos);
                        }}
                        className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                        title="Baixar Laudo PDF"
                      >
                        <FileText className="w-3.5 h-3.5 text-rose-500" />
                        <span>Laudo PDF</span>
                      </button>

                      <button
                        type="button"
                        id={`btn-modal-excluir-teste-${teste.id}`}
                        onClick={() => setTesteParaExcluir(teste)}
                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                        title={`Excluir Teste ${num}`}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>EXCLUIR TESTE</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenAvaliacaoTeste(amostra.id, num);
                        }}
                        className="px-3 py-1 bg-[#1b4332] hover:bg-[#2d6a4f] text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Abrir Avaliação</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer com Botão FAZER NOVO TESTE */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 font-bold text-xs rounded-xl border border-gray-300 cursor-pointer"
          >
            Fechar
          </button>

          {canCreateNovo && (
            <button
              type="button"
              id="btn-modal-fazer-novo-teste"
              onClick={() => {
                onClose();
                onFazerNovoTeste(amostra);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#1b4332] hover:bg-[#2d6a4f] active:scale-95 text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#d8f3dc]" />
              <span>FAZER NOVO TESTE</span>
            </button>
          )}
        </div>
      </div>

      {/* Modal de Confirmação: Excluir Teste */}
      <ConfirmActionModal
        isOpen={!!testeParaExcluir}
        title="Excluir Teste"
        message="Tem certeza que deseja excluir este teste? Esta ação não poderá ser desfeita."
        confirmText="EXCLUIR TESTE"
        cancelText="CANCELAR"
        confirmVariant="danger"
        iconType="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setTesteParaExcluir(null)}
      />
    </div>
  );
};
