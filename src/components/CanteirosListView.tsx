import React, { useState, useEffect } from 'react';
import { Amostra, Usuario } from '../types';
import { storageService } from '../services/storageService';
import { exportService } from '../services/exportService';
import { 
  Search, Filter, Plus, FileSpreadsheet, FileText, QrCode, 
  Trash2, ClipboardCheck, ArrowUpDown, Calendar, Sprout, RefreshCw, Edit3
} from 'lucide-react';
import { NovaAmostraModal } from './NovaAmostraModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { ToastNotification, ToastMessage } from './ToastNotification';

interface CanteirosListViewProps {
  currentUser: Usuario;
  onNewSample: () => void;
  onOpenAvaliacao: (amostraId: string) => void;
  onShowQRCode: (amostra: Amostra) => void;
  initialStatusFilter?: string;
}

export const CanteirosListView: React.FC<CanteirosListViewProps> = ({
  currentUser,
  onNewSample,
  onOpenAvaliacao,
  onShowQRCode,
  initialStatusFilter = '',
}) => {
  const [amostras, setAmostras] = useState<Amostra[]>(storageService.getAmostras());
  const [avaliacoes, setAvaliacoes] = useState(storageService.getAvaliacoes());

  // Filtro de Busca Global
  const [searchQuery, setSearchQuery] = useState('');

  // Filtros Específicos
  const [filterProtocolo, setFilterProtocolo] = useState('');
  const [filterLote, setFilterLote] = useState('');
  const [filterCultivar, setFilterCultivar] = useState('');
  const [filterCultura, setFilterCultura] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterSafra, setFilterSafra] = useState('');
  const [filterStatus, setFilterStatus] = useState(initialStatusFilter);
  const [filterDataInicio, setFilterDataInicio] = useState('');
  const [filterDataFim, setFilterDataFim] = useState('');

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [editingAmostra, setEditingAmostra] = useState<Amostra | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const canEditOrDelete = true; // Permite ação com confirmação para papéis operacionais
  const isAdmin = currentUser.perfil === 'Administrador';

  const refreshList = () => {
    setAmostras(storageService.getAmostras());
    setAvaliacoes(storageService.getAvaliacoes());
  };

  useEffect(() => {
    refreshList();
    const unsubscribe = storageService.subscribe(() => {
      refreshList();
    });
    return () => unsubscribe();
  }, []);

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const success = await storageService.deleteAmostra(itemToDelete.id);
      if (success) {
        setToast({ type: 'success', message: 'Registro excluído com sucesso.' });
        refreshList();
      } else {
        setToast({ type: 'error', message: 'Erro ao excluir: Registro não encontrado no banco de dados.' });
      }
    } catch (error) {
      setToast({ type: 'error', message: `Erro ao excluir registro: ${error instanceof Error ? error.message : String(error)}` });
    } finally {
      setItemToDelete(null);
    }
  };

  // Lógica de Filtragem Multi-Critério
  const filteredAmostras = amostras.filter(a => {
    // Search Global
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchGlobal = 
        a.protocolo.toLowerCase().includes(query) ||
        a.cultura.toLowerCase().includes(query) ||
        a.cultivar.toLowerCase().includes(query) ||
        a.lote.toLowerCase().includes(query) ||
        a.responsavel.toLowerCase().includes(query);
      if (!matchGlobal) return false;
    }

    if (filterProtocolo && !a.protocolo.toLowerCase().includes(filterProtocolo.toLowerCase())) return false;
    if (filterLote && !a.lote.toLowerCase().includes(filterLote.toLowerCase())) return false;
    if (filterCultivar && !a.cultivar.toLowerCase().includes(filterCultivar.toLowerCase())) return false;
    if (filterCultura && a.cultura !== filterCultura) return false;
    if (filterCategoria && a.categoria !== filterCategoria) return false;
    if (filterSafra && a.safra !== filterSafra) return false;
    if (filterStatus && a.status !== filterStatus) return false;

    if (filterDataInicio && a.dataSemeadura < filterDataInicio) return false;
    if (filterDataFim && a.dataSemeadura > filterDataFim) return false;

    return true;
  });

  const resetFilters = () => {
    setSearchQuery('');
    setFilterProtocolo('');
    setFilterLote('');
    setFilterCultivar('');
    setFilterCultura('');
    setFilterCategoria('');
    setFilterSafra('');
    setFilterStatus('');
    setFilterDataInicio('');
    setFilterDataFim('');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <Sprout className="w-7 h-7 text-[#2d6a4f]" />
            Canteiros e Amostras de Sementes
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Gerencie todas as amostras registradas para avaliação de germinação
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportService.exportToExcel(filteredAmostras)}
            className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-sm transition-all"
            title="Exportar para Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar Excel</span>
          </button>

          <button
            onClick={onNewSample}
            className="flex items-center gap-1.5 bg-[#1b4332] hover:bg-[#2d6a4f] text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nova Amostra</span>
          </button>
        </div>
      </div>

      {/* Bar de Busca Rápida e Toggle de Filtros Avançados */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          
          {/* Busca Global */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Busca rápida por protocolo, lote, cultura ou cultivar..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Toggle Filtros Avançados */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${
              showAdvancedFilters || filterStatus || filterCultura
                ? 'bg-[#2d6a4f] text-white border-[#1b4332]'
                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filtros Avançados</span>
          </button>

          {(searchQuery || filterProtocolo || filterLote || filterCultivar || filterCultura || filterCategoria || filterSafra || filterStatus || filterDataInicio) && (
            <button
              onClick={resetFilters}
              className="text-xs font-semibold text-rose-600 hover:underline px-2 py-1"
            >
              Limpar Filtros
            </button>
          )}

        </div>

        {/* Painel de Filtros Detalhados */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            
            {/* Filtro Protocolo */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1">Protocolo</label>
              <input
                type="text"
                value={filterProtocolo}
                onChange={(e) => setFilterProtocolo(e.target.value)}
                placeholder="Ex: PRT-2026"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800"
              />
            </div>

            {/* Filtro Lote */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1">Lote</label>
              <input
                type="text"
                value={filterLote}
                onChange={(e) => setFilterLote(e.target.value)}
                placeholder="Ex: L-2026"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800"
              />
            </div>

            {/* Filtro Cultura */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1">Cultura</label>
              <select
                value={filterCultura}
                onChange={(e) => setFilterCultura(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800"
              >
                <option value="">Todas</option>
                <option value="Soja">Soja</option>
                <option value="Milho">Milho</option>
                <option value="Sorgo">Sorgo</option>
                <option value="Algodão">Algodão</option>
                <option value="Feijão">Feijão</option>
                <option value="Trigo">Trigo</option>
              </select>
            </div>

            {/* Filtro Status */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800"
              >
                <option value="">Todos</option>
                <option value="Pendente">Pendente</option>
                <option value="Concluído">Concluído</option>
              </select>
            </div>

            {/* Filtro Safra */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1">Safra</label>
              <select
                value={filterSafra}
                onChange={(e) => setFilterSafra(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800"
              >
                <option value="">Todas</option>
                <option value="2025/2026">2025/2026</option>
                <option value="2026/2027">2026/2027</option>
              </select>
            </div>

            {/* Data Inicial */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1">Semeadura De</label>
              <input
                type="date"
                value={filterDataInicio}
                onChange={(e) => setFilterDataInicio(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-800"
              />
            </div>

            {/* Data Final */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1">Semeadura Até</label>
              <input
                type="date"
                value={filterDataFim}
                onChange={(e) => setFilterDataFim(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-800"
              />
            </div>

          </div>
        )}
      </div>

      {/* Contagem de Resultados */}
      <div className="flex items-center justify-between text-xs font-semibold text-gray-500 px-1">
        <span>Exibindo {filteredAmostras.length} de {amostras.length} amostras</span>
        <button onClick={refreshList} className="flex items-center gap-1 hover:text-gray-800">
          <RefreshCw className="w-3 h-3" /> Atualizar Tabela
        </button>
      </div>

      {/* Tabela de Amostras (Desktop) e Cards (Mobile) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        
        {filteredAmostras.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Sprout className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-base font-bold text-gray-700">Nenhuma amostra encontrada</p>
            <p className="text-xs text-gray-500 mt-1">Ajuste seus filtros de busca ou cadastre uma nova amostra.</p>
          </div>
        ) : (
          <>
            {/* Tabela Desktop */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-[#1b4332] text-white uppercase text-[11px] tracking-wider font-bold">
                  <tr>
                    <th className="py-3.5 px-4">Protocolo</th>
                    <th className="py-3.5 px-3">Cultura / Cultivar</th>
                    <th className="py-3.5 px-3">Lote</th>
                    <th className="py-3.5 px-2">Peneira</th>
                    <th className="py-3.5 px-2">Categoria</th>
                    <th className="py-3.5 px-2">Safra</th>
                    <th className="py-3.5 px-3">Semeadura</th>
                    <th className="py-3.5 px-3">Status CQ</th>
                    <th className="py-3.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAmostras.map((amostra) => {
                    const avaliacao = avaliacoes.find(v => v.amostraId === amostra.id);
                    const isConcluido = amostra.status === 'Concluído';

                    return (
                      <tr key={amostra.id} className="hover:bg-gray-50/80 transition-colors">
                        
                        <td className="py-3.5 px-4 font-extrabold text-gray-900">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onShowQRCode(amostra)}
                              className="p-1 rounded bg-gray-100 hover:bg-[#2d6a4f] hover:text-white text-gray-700 transition-colors"
                              title="Ver QR Code do Canteiro"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </button>
                            <span>{amostra.protocolo}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <p className="font-bold text-gray-900">{amostra.cultura}</p>
                          <p className="text-[11px] text-gray-500">{amostra.cultivar}</p>
                        </td>

                        <td className="py-3.5 px-3 font-semibold text-gray-800">{amostra.lote}</td>
                        <td className="py-3.5 px-2 font-medium">{amostra.peneira}</td>
                        <td className="py-3.5 px-2">
                          <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-[10px] font-bold">
                            {amostra.categoria}
                          </span>
                        </td>
                        <td className="py-3.5 px-2 font-medium">{amostra.safra}</td>
                        <td className="py-3.5 px-3 font-medium text-gray-600">
                          {new Date(amostra.dataSemeadura + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </td>

                        <td className="py-3.5 px-3">
                          {isConcluido && avaliacao ? (
                            <div className="flex flex-col">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full w-fit ${
                                avaliacao.resultadoAprovacao === 'Aprovado' 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : 'bg-rose-100 text-rose-800'
                              }`}>
                                {avaliacao.resultadoAprovacao.toUpperCase()} ({avaliacao.germinacao}%)
                              </span>
                            </div>
                          ) : (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              PENDENTE
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            
                            {/* Botão Editar Amostra */}
                            <button
                              onClick={() => setEditingAmostra(amostra)}
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#1b4332] border border-emerald-200 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                              title="Editar Amostra"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-[#2d6a4f]" />
                              <span>EDITAR</span>
                            </button>

                            {/* Botão Avaliar */}
                            <button
                              onClick={() => onOpenAvaliacao(amostra.id)}
                              className="px-2.5 py-1.5 bg-[#2d6a4f] hover:bg-[#1b4332] text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                              title="Abrir Tela de Avaliação"
                            >
                              <ClipboardCheck className="w-3.5 h-3.5" />
                              <span>{isConcluido ? 'AVALIAR' : 'AVALIAR'}</span>
                            </button>

                            {/* Botão Laudo PDF */}
                            <button
                              onClick={() => {
                                const fotos = storageService.getFotosByAmostra(amostra.id);
                                exportService.generateSamplePDF(amostra, avaliacao, fotos);
                              }}
                              className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors cursor-pointer"
                              title="Baixar Laudo em PDF"
                            >
                              <FileText className="w-3.5 h-3.5 text-gray-700" />
                            </button>

                            {/* Botão Excluir */}
                            <button
                              onClick={() => setItemToDelete({ id: amostra.id, name: amostra.protocolo })}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                              title="Excluir Amostra"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              <span>EXCLUIR</span>
                            </button>

                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Layout Cards (Mobile e Tablet) */}
            <div className="block lg:hidden divide-y divide-gray-100">
              {filteredAmostras.map((amostra) => {
                const avaliacao = avaliacoes.find(v => v.amostraId === amostra.id);
                const isConcluido = amostra.status === 'Concluído';

                return (
                  <div key={amostra.id} className="p-4 space-y-3">
                    
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-gray-900 text-base">{amostra.protocolo}</span>
                          <button
                            onClick={() => onShowQRCode(amostra)}
                            className="p-1 bg-gray-100 rounded text-gray-600"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="font-bold text-[#2d6a4f] text-sm mt-0.5">
                          {amostra.cultura} - {amostra.cultivar}
                        </p>
                      </div>

                      <div>
                        {isConcluido && avaliacao ? (
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            avaliacao.resultadoAprovacao === 'Aprovado' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {avaliacao.germinacao}% - {avaliacao.resultadoAprovacao}
                          </span>
                        ) : (
                          <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full">
                            PENDENTE
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl">
                      <div><span className="font-semibold text-gray-800">Lote:</span> {amostra.lote}</div>
                      <div><span className="font-semibold text-gray-800">Peneira:</span> {amostra.peneira}</div>
                      <div><span className="font-semibold text-gray-800">Categoria:</span> {amostra.categoria}</div>
                      <div><span className="font-semibold text-gray-800">Safra:</span> {amostra.safra}</div>
                      <div className="col-span-2">
                        <span className="font-semibold text-gray-800">Semeadura:</span> {new Date(amostra.dataSemeadura + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const fotos = storageService.getFotosByAmostra(amostra.id);
                            exportService.generateSamplePDF(amostra, avaliacao, fotos);
                          }}
                          className="text-xs font-bold text-gray-600 flex items-center gap-1 hover:underline"
                        >
                          <FileText className="w-4 h-4 text-rose-600" />
                          Laudo PDF
                        </button>

                        <button
                          onClick={() => setEditingAmostra(amostra)}
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#1b4332] border border-emerald-200 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#2d6a4f]" />
                          <span>EDITAR</span>
                        </button>

                        <button
                          onClick={() => setItemToDelete({ id: amostra.id, name: amostra.protocolo })}
                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>EXCLUIR</span>
                        </button>
                      </div>

                      <button
                        onClick={() => onOpenAvaliacao(amostra.id)}
                        className="bg-[#2d6a4f] hover:bg-[#1b4332] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                      >
                        <ClipboardCheck className="w-4 h-4 text-[#d8f3dc]" />
                        <span>{isConcluido ? 'Ver Avaliação' : 'Iniciar Avaliação'}</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          </>
        )}

      </div>

      {/* Modal de Edição de Amostra */}
      {editingAmostra && (
        <NovaAmostraModal
          currentUser={currentUser}
          editingAmostra={editingAmostra}
          onClose={() => setEditingAmostra(null)}
          onSuccess={() => {
            setEditingAmostra(null);
            refreshList();
          }}
        />
      )}

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmDeleteModal
        isOpen={!!itemToDelete}
        itemName={itemToDelete?.name}
        title="Excluir Registro de Canteiro"
        message="Tem certeza que deseja excluir este registro?"
        onCancel={() => setItemToDelete(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* Notificação Toast */}
      <ToastNotification
        toast={toast}
        onClose={() => setToast(null)}
      />

    </div>
  );
};
