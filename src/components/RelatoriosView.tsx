import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { exportService } from '../services/exportService';
import { Amostra, Usuario } from '../types';
import { FileSpreadsheet, FileText, Filter, Download, Sprout, CheckCircle2, Edit3, Trash2, ClipboardCheck } from 'lucide-react';
import { NovaAmostraModal } from './NovaAmostraModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { ToastNotification, ToastMessage } from './ToastNotification';

interface RelatoriosViewProps {
  currentUser?: Usuario;
  onOpenAvaliacao?: (amostraId: string) => void;
}

export const RelatoriosView: React.FC<RelatoriosViewProps> = ({ currentUser, onOpenAvaliacao }) => {
  const [amostras, setAmostras] = useState<Amostra[]>(() => storageService.getAmostras());
  const [avaliacoes, setAvaliacoes] = useState(() => storageService.getAvaliacoes());
  const [editingAmostra, setEditingAmostra] = useState<Amostra | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const refreshData = () => {
    setAmostras(storageService.getAmostras());
    setAvaliacoes(storageService.getAvaliacoes());
  };

  useEffect(() => {
    refreshData();
    const unsubscribe = storageService.subscribe(() => {
      refreshData();
    });
    return () => unsubscribe();
  }, []);

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const success = await storageService.deleteAmostra(itemToDelete.id);
      if (success) {
        setToast({ type: 'success', message: 'Registro excluído com sucesso.' });
        refreshData();
      } else {
        setToast({ type: 'error', message: 'Erro ao excluir: Registro não encontrado no banco de dados.' });
      }
    } catch (error) {
      setToast({ type: 'error', message: `Erro ao excluir registro: ${error instanceof Error ? error.message : String(error)}` });
    } finally {
      setItemToDelete(null);
    }
  };

  // Filtros
  const [cultura, setCultura] = useState('');
  const [lote, setLote] = useState('');
  const [cultivar, setCultivar] = useState('');
  const [categoria, setCategoria] = useState('');
  const [safra, setSafra] = useState('');
  const [status, setStatus] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const filteredAmostras = amostras.filter(a => {
    if (cultura && a.cultura !== cultura) return false;
    if (lote && !a.lote.toLowerCase().includes(lote.toLowerCase())) return false;
    if (cultivar && !a.cultivar.toLowerCase().includes(cultivar.toLowerCase())) return false;
    if (categoria && a.categoria !== categoria) return false;
    if (safra && a.safra !== safra) return false;
    if (status && a.status !== status) return false;
    if (responsavel && !a.responsavel.toLowerCase().includes(responsavel.toLowerCase())) return false;
    if (dataInicio && a.dataSemeadura < dataInicio) return false;
    if (dataFim && a.dataSemeadura > dataFim) return false;
    return true;
  });

  const handleExportExcel = () => {
    exportService.exportToExcel(filteredAmostras, `Relatorio_CQ_${cultura || 'Geral'}`);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
          <FileSpreadsheet className="w-7 h-7 text-[#2d6a4f]" />
          Emissão de Relatórios de Controle de Qualidade
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Gere arquivos consolidados em Excel ou laudos individuais em PDF com registro fotográfico.
        </p>
      </div>

      {/* Painel de Filtros de Exportação */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-2">
          <Filter className="w-4 h-4 text-[#2d6a4f]" />
          Filtros de Período e Parâmetros
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Cultura</label>
            <select
              value={cultura}
              onChange={(e) => setCultura(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-800"
            >
              <option value="">Todas as Culturas</option>
              <option value="Soja">Soja</option>
              <option value="Milho">Milho</option>
              <option value="Sorgo">Sorgo</option>
              <option value="Algodão">Algodão</option>
              <option value="Feijão">Feijão</option>
              <option value="Trigo">Trigo</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Número do Lote</label>
            <input
              type="text"
              value={lote}
              onChange={(e) => setLote(e.target.value)}
              placeholder="Ex: L-2026"
              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Cultivar</label>
            <input
              type="text"
              value={cultivar}
              onChange={(e) => setCultivar(e.target.value)}
              placeholder="Ex: M 8349"
              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-800"
            >
              <option value="">Todos os Status</option>
              <option value="Pendente">Pendente</option>
              <option value="Concluído">Concluído</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Semeadura De</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Semeadura Até</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Categoria</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-800"
            >
              <option value="">Todas</option>
              <option value="C1">C1</option>
              <option value="C2">C2</option>
              <option value="S1">S1</option>
              <option value="S2">S2</option>
              <option value="Básica">Básica</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Safra</label>
            <select
              value={safra}
              onChange={(e) => setSafra(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-800"
            >
              <option value="">Todas</option>
              <option value="2025/2026">2025/2026</option>
              <option value="2026/2027">2026/2027</option>
            </select>
          </div>

        </div>

        {/* Resumo e Botão Excel Principal */}
        <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs font-bold text-gray-600">
            {filteredAmostras.length} amostras selecionadas no filtro atual
          </span>

          <button
            onClick={handleExportExcel}
            className="w-full sm:w-auto px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            <span>Exportar Planilha Excel (.xlsx)</span>
          </button>
        </div>

      </div>

      {/* Seção Laudos PDF Individuais */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-bold text-gray-900">Laudos Técnicos em PDF</h3>
          <p className="text-xs text-gray-500">Selecione qualquer amostra para gerar o laudo individual completo com fotos e assinaturas.</p>
        </div>

        <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
          {filteredAmostras.map(amostra => {
            const avaliacao = avaliacoes.find(a => a.amostraId === amostra.id);

            return (
              <div key={amostra.id} className="p-3.5 bg-white hover:bg-gray-50/80 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-gray-900">{amostra.protocolo}</span>
                    <span className="text-xs font-bold text-[#2d6a4f]">{amostra.cultura} ({amostra.cultivar})</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Lote: {amostra.lote} | Semeadura: {new Date(amostra.dataSemeadura + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 justify-end">
                  {amostra.plantulasEmergidas7dias !== undefined && (
                    <span className="text-[11px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full" title="Contagem de Emergência aos 7 dias">
                      🌱 7d: {amostra.plantulasEmergidas7dias}%
                    </span>
                  )}

                  {avaliacao ? (
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      avaliacao.resultadoAprovacao === 'Aprovado' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      10d: {avaliacao.germinacao}% ({avaliacao.resultadoAprovacao})
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                      10D PENDENTE
                    </span>
                  )}

                  {/* Botão EDITAR */}
                  <button
                    onClick={() => setEditingAmostra(amostra)}
                    className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#1b4332] border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Editar Amostra"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#2d6a4f]" />
                    <span>EDITAR</span>
                  </button>

                  {/* Botão EXCLUIR */}
                  <button
                    onClick={() => setItemToDelete({ id: amostra.id, name: amostra.protocolo })}
                    className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Excluir Amostra"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>EXCLUIR</span>
                  </button>

                  {/* Botão PDF */}
                  <button
                    onClick={() => {
                      const fotos = storageService.getFotosByAmostra(amostra.id);
                      exportService.generateSamplePDF(amostra, avaliacao, fotos);
                    }}
                    className="px-3 py-1.5 bg-[#1b4332] hover:bg-[#2d6a4f] text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-rose-300" />
                    <span>Baixar PDF</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Edição de Amostra em Relatórios */}
      {editingAmostra && currentUser && (
        <NovaAmostraModal
          currentUser={currentUser}
          editingAmostra={editingAmostra}
          onClose={() => setEditingAmostra(null)}
          onSuccess={() => {
            setEditingAmostra(null);
            refreshData();
          }}
        />
      )}

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmDeleteModal
        isOpen={!!itemToDelete}
        itemName={itemToDelete?.name}
        title="Excluir Registro de Relatórios"
        message="Tem certeza que deseja excluir este registro?"
        onCancel={() => setItemToDelete(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* Toast Notification */}
      <ToastNotification
        toast={toast}
        onClose={() => setToast(null)}
      />

    </div>
  );
};
