import React from 'react';
import { Avaliacao, Amostra } from '../types';
import { 
  History, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Plus, 
  Calendar, 
  User, 
  FileText, 
  Layers, 
  ArrowRight,
  Eye,
  ShieldCheck,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { formatDateBR } from '../utils/dateUtils';
import { exportService } from '../services/exportService';
import { storageService } from '../services/storageService';

interface HistoricoTestesCanteiroCardProps {
  amostra: Amostra;
  allTestes: Avaliacao[];
  selectedTesteId?: string;
  onSelectTeste: (teste: Avaliacao) => void;
  onRequestDeleteTeste?: (teste: Avaliacao) => void;
  onFazerNovoTeste: () => void;
  isCreatingNovoTeste?: boolean;
  canCreateNovoTeste: boolean;
}

export const HistoricoTestesCanteiroCard: React.FC<HistoricoTestesCanteiroCardProps> = ({
  amostra,
  allTestes,
  selectedTesteId,
  onSelectTeste,
  onRequestDeleteTeste,
  onFazerNovoTeste,
  isCreatingNovoTeste = false,
  canCreateNovoTeste,
}) => {
  const totalTestes = allTestes.length;

  return (
    <div 
      id="card-historico-testes-lote" 
      className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4"
    >
      {/* Header do Histórico */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#1b4332]/10 text-[#1b4332] rounded-xl">
            <History className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black text-gray-900">
                Histórico de Testes do Lote: <span className="text-[#1b4332]">{amostra.lote}</span>
              </h3>
              <span 
                id="indicador-total-testes"
                className="px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 text-[#1b4332] font-black text-xs rounded-full"
              >
                Total de testes realizados: {totalTestes}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Cultivar: <strong>{amostra.cultivar}</strong> • Categoria: <strong>{amostra.categoria}</strong> • Safra: <strong>{amostra.safra}</strong> • Cultura: <strong>{amostra.cultura}</strong>
            </p>
          </div>
        </div>

        {/* Botão FAZER NOVO TESTE / REPETIR TESTE */}
        {canCreateNovoTeste && (
          <button
            type="button"
            id="btn-fazer-novo-teste"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onFazerNovoTeste();
            }}
            disabled={isCreatingNovoTeste}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1b4332] hover:bg-[#2d6a4f] active:scale-95 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer whitespace-nowrap"
            title="Iniciar novo teste do zero mantendo o anterior intacto"
          >
            <Plus className="w-4 h-4 text-[#d8f3dc]" />
            <span>{isCreatingNovoTeste ? 'Iniciando...' : 'FAZER NOVO TESTE'}</span>
          </button>
        )}
      </div>

      {/* Lista / Timeline de Testes */}
      <div className="space-y-3">
        {allTestes.map((teste, idx) => {
          const num = teste.testeNumero ?? (idx + 1);
          const isSelected = selectedTesteId === teste.id;
          const isAprovado = (teste.resultado || teste.resultadoAprovacao) === 'Aprovado';
          const isDraft = teste.statusTeste === 'rascunho';
          const dataExibicao = teste.dataAvaliacao || (teste.dataHora ? teste.dataHora.split('T')[0] : '');

          return (
            <div
              key={teste.id || idx}
              id={`item-teste-${num}`}
              onClick={() => onSelectTeste(teste)}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                isSelected 
                  ? 'border-[#1b4332] bg-[#f4f9f6] shadow-xs ring-1 ring-[#1b4332]/20' 
                  : 'border-gray-200 bg-gray-50/70 hover:bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-start sm:items-center gap-3">
                  <div className={`p-2 rounded-lg font-black text-xs flex items-center justify-center min-w-[70px] ${
                    isDraft 
                      ? 'bg-amber-100 text-amber-900 border border-amber-200'
                      : isAprovado 
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' 
                        : 'bg-rose-100 text-rose-900 border border-rose-200'
                  }`}>
                    TESTE {num}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        Data: <strong className="text-gray-900">{formatDateBR(dataExibicao) || 'Não informada'}</strong>
                        {teste.horaAvaliacao && <span className="text-gray-500"> às {teste.horaAvaliacao}</span>}
                      </span>

                      <span className="text-gray-300">•</span>

                      <span className="text-xs font-bold flex items-center gap-1">
                        Resultado:{' '}
                        {isDraft ? (
                          <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-bold text-[11px] border border-amber-200">
                            EM ANDAMENTO
                          </span>
                        ) : isAprovado ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-black text-[11px] border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            APROVADO
                          </span>
                        ) : (
                          <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-black text-[11px] border border-rose-200 flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            REPROVADO
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Resumo Numérico das Plântulas */}
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-gray-600">
                      <span>Germinação Final: <strong className="text-gray-900">{teste.germinacao}%</strong></span>
                      <span className="text-gray-300">|</span>
                      <span>Fortes: <strong>{teste.fortes}%</strong></span>
                      <span>Interm: <strong>{teste.intermediarias}%</strong></span>
                      <span>Fracas: <strong>{teste.fracas}%</strong></span>
                      <span>Anormais: <strong>{teste.anormais ?? 0}%</strong></span>
                      <span>Mortas: <strong>{teste.mortas}%</strong></span>
                      {teste.plantulasEmergidas7dias !== undefined && (
                        <>
                          <span className="text-gray-300">|</span>
                          <span>Emergência (7d): <strong>{teste.plantulasEmergidas7dias}%</strong></span>
                        </>
                      )}
                    </div>

                    {/* Rastreabilidade e Usuário Responsável */}
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-gray-400" />
                        Avaliador: <strong className="text-gray-700">{teste.usuario || teste.usuarioAvaliador || amostra.responsavel}</strong>
                      </span>
                      {teste.testeAnteriorId && (
                        <span className="text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded text-[10px] font-medium border border-emerald-100">
                          Rastreabilidade: Vínculo Teste #{num - 1}
                        </span>
                      )}
                      {teste.observacoes && (
                        <span className="italic truncate max-w-xs text-gray-500" title={teste.observacoes}>
                          &ldquo;{teste.observacoes}&rdquo;
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Ações do Teste */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  {isSelected ? (
                    <span className="px-2.5 py-1 bg-[#1b4332] text-white text-[11px] font-bold rounded-lg flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      Visualizando
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTeste(teste);
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-gray-500" />
                      Ver Detalhes
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const fotos = storageService.getFotosByAmostra(amostra.id);
                      exportService.generateSamplePDF(amostra, teste, fotos);
                    }}
                    className="p-1.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg transition-colors cursor-pointer"
                    title={`Baixar Laudo PDF do Teste ${num}`}
                  >
                    <FileText className="w-3.5 h-3.5 text-rose-500" />
                  </button>

                  {onRequestDeleteTeste && (
                    <button
                      type="button"
                      id={`btn-excluir-teste-${teste.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRequestDeleteTeste(teste);
                      }}
                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                      title={`Excluir Teste ${num}`}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>EXCLUIR TESTE</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
