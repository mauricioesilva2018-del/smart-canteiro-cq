import React, { useState, useEffect, useMemo } from 'react';
import { Amostra, Usuario } from '../types';
import { storageService } from '../services/storageService';
import { exportService } from '../services/exportService';
import { 
  Search, Filter, Plus, FileSpreadsheet, FileText, QrCode, 
  Trash2, ClipboardCheck, Sprout, RefreshCw, Edit3, CheckCircle2,
  AlertCircle, Database, UploadCloud, Clock, PlayCircle, AlertTriangle, MapPin
} from 'lucide-react';
import { NovaAmostraModal } from './NovaAmostraModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { ToastNotification, ToastMessage } from './ToastNotification';
import { getAmostraLeituraInfo, getAmostraAcompanhamentoInfo, formatDateBR } from '../utils/dateUtils';

type SituacaoFiltro = 'todos' | 'aguardando' | 'iniciada' | 'concluida' | 'pendencias';

interface CanteirosListViewProps {
  currentUser: Usuario;
  onNewSample: () => void;
  onImportExcel?: () => void;
  onOpenAvaliacao: (amostraId: string) => void;
  onShowQRCode: (amostra: Amostra) => void;
  initialStatusFilter?: string;
}

export const CanteirosListView: React.FC<CanteirosListViewProps> = ({
  currentUser,
  onNewSample,
  onImportExcel,
  onOpenAvaliacao,
  onShowQRCode,
  initialStatusFilter = '',
}) => {
  const [amostras, setAmostras] = useState<Amostra[]>(storageService.getAmostras());
  const [avaliacoes, setAvaliacoes] = useState(storageService.getAvaliacoes());
  const [syncState, setSyncState] = useState(storageService.getSyncState());

  // Filtro de Busca Global
  const [searchQuery, setSearchQuery] = useState('');

  // Filtro de Acompanhamento por Indicadores
  const [situacaoFilter, setSituacaoFilter] = useState<SituacaoFiltro>(
    initialStatusFilter === 'aguardando'
      ? 'aguardando'
      : initialStatusFilter === 'Concluído'
      ? 'concluida'
      : 'todos'
  );

  // Filtros Específicos
  const [filterProtocolo, setFilterProtocolo] = useState('');
  const [filterLote, setFilterLote] = useState('');
  const [filterCultivar, setFilterCultivar] = useState('');
  const [filterCultura, setFilterCultura] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterSafra, setFilterSafra] = useState('');
  const [filterCanteiro, setFilterCanteiro] = useState('');
  const [filterStatus, setFilterStatus] = useState(
    initialStatusFilter === 'Pendente' || initialStatusFilter === 'Concluído'
      ? initialStatusFilter
      : ''
  );
  const [filterDataInicio, setFilterDataInicio] = useState('');
  const [filterDataFim, setFilterDataFim] = useState('');

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [editingAmostra, setEditingAmostra] = useState<Amostra | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    if (initialStatusFilter === 'aguardando') {
      setSituacaoFilter('aguardando');
      setFilterStatus('');
    } else if (initialStatusFilter === 'Concluído') {
      setSituacaoFilter('concluida');
      setFilterStatus('Concluído');
    } else if (initialStatusFilter === 'Pendente') {
      setSituacaoFilter('todos');
      setFilterStatus('Pendente');
    } else {
      setSituacaoFilter('todos');
      setFilterStatus('');
    }
  }, [initialStatusFilter]);

  const refreshList = () => {
    setAmostras(storageService.getAmostras());
    setAvaliacoes(storageService.getAvaliacoes());
    setSyncState(storageService.getSyncState());
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

  // Enriquecimento das amostras com estado operacional de acompanhamento
  const amostrasComInfo = useMemo(() => {
    return amostras.map((a) => {
      const avaliacoesAmostra = avaliacoes.filter((v) => v.amostraId === a.id);
      const avaliacao = avaliacoesAmostra[avaliacoesAmostra.length - 1];
      const acompanhamento = getAmostraAcompanhamentoInfo(a, avaliacao);
      return {
        amostra: a,
        avaliacao,
        leituraInfo: acompanhamento.leituraInfo,
        acompanhamento,
      };
    });
  }, [amostras, avaliacoes]);

  // Indicadores de Acompanhamento
  const indicadores = useMemo(() => {
    const totalPlantados = amostrasComInfo.length;
    const aguardandoLeitura = amostrasComInfo.filter(
      (i) => i.acompanhamento.isAguardandoLeitura
    ).length;
    const leituraIniciada = amostrasComInfo.filter(
      (i) => i.acompanhamento.isLeituraIniciada
    ).length;
    const leituraConcluida = amostrasComInfo.filter(
      (i) => i.acompanhamento.isLeituraConcluida
    ).length;
    const comPendencias = amostrasComInfo.filter(
      (i) => i.acompanhamento.temPendencia
    ).length;
    return {
      totalPlantados,
      aguardandoLeitura,
      leituraIniciada,
      leituraConcluida,
      comPendencias,
    };
  }, [amostrasComInfo]);

  // Opções dinâmicas de filtro (Canteiro, Cultura, Categoria, Safra)
  const canteirosDisponiveis = useMemo(() => {
    return Array.from(
      new Set(amostras.map((a) => (a.canteiro || '').trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [amostras]);

  const categoriasDisponiveis = useMemo(() => {
    return Array.from(
      new Set(amostras.map((a) => (a.categoria || '').trim()).filter(Boolean))
    ).sort();
  }, [amostras]);

  const safrasDisponiveis = useMemo(() => {
    return Array.from(
      new Set(amostras.map((a) => (a.safra || '').trim()).filter(Boolean))
    ).sort();
  }, [amostras]);

  const culturasDisponiveis = useMemo(() => {
    return Array.from(
      new Set(['Soja', 'Milho', 'Sorgo', 'Algodão', 'Feijão', 'Trigo', ...amostras.map((a) => a.cultura).filter(Boolean)])
    ).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [amostras]);

  // Lógica de Filtragem Multi-Critério
  const filteredItems = useMemo(() => {
    return amostrasComInfo.filter(({ amostra: a, acompanhamento }) => {
      if (situacaoFilter === 'aguardando' && !acompanhamento.isAguardandoLeitura) return false;
      if (situacaoFilter === 'iniciada' && !acompanhamento.isLeituraIniciada) return false;
      if (situacaoFilter === 'concluida' && !acompanhamento.isLeituraConcluida) return false;
      if (situacaoFilter === 'pendencias' && !acompanhamento.temPendencia) return false;

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchGlobal =
          a.protocolo.toLowerCase().includes(query) ||
          a.cultura.toLowerCase().includes(query) ||
          a.cultivar.toLowerCase().includes(query) ||
          a.lote.toLowerCase().includes(query) ||
          a.categoria.toLowerCase().includes(query) ||
          a.safra.toLowerCase().includes(query) ||
          (a.canteiro || '').toLowerCase().includes(query) ||
          a.responsavel.toLowerCase().includes(query);
        if (!matchGlobal) return false;
      }

      if (filterProtocolo && !a.protocolo.toLowerCase().includes(filterProtocolo.toLowerCase())) return false;
      if (filterLote && !a.lote.toLowerCase().includes(filterLote.toLowerCase())) return false;
      if (filterCultivar && !a.cultivar.toLowerCase().includes(filterCultivar.toLowerCase())) return false;
      if (filterCultura && a.cultura !== filterCultura) return false;
      if (filterCategoria && a.categoria !== filterCategoria) return false;
      if (filterSafra && a.safra !== filterSafra) return false;
      if (filterCanteiro && (a.canteiro || '') !== filterCanteiro) return false;
      if (filterStatus && a.status !== filterStatus) return false;

      if (filterDataInicio && a.dataSemeadura < filterDataInicio) return false;
      if (filterDataFim && a.dataSemeadura > filterDataFim) return false;

      return true;
    });
  }, [
    amostrasComInfo,
    situacaoFilter,
    searchQuery,
    filterProtocolo,
    filterLote,
    filterCultivar,
    filterCultura,
    filterCategoria,
    filterSafra,
    filterCanteiro,
    filterStatus,
    filterDataInicio,
    filterDataFim,
  ]);

  const filteredAmostras = useMemo(
    () => filteredItems.map((i) => i.amostra),
    [filteredItems]
  );

  const resetFilters = () => {
    setSearchQuery('');
    setSituacaoFilter('todos');
    setFilterProtocolo('');
    setFilterLote('');
    setFilterCultivar('');
    setFilterCultura('');
    setFilterCategoria('');
    setFilterSafra('');
    setFilterCanteiro('');
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

        <div className="flex flex-wrap items-center gap-2">
          {onImportExcel && (
            <button
              type="button"
              id="btn-canteiros-importar-excel"
              onClick={onImportExcel}
              className="flex items-center gap-1.5 bg-white hover:bg-gray-50 text-[#1b4332] border border-[#74c69d] px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              title="Importar Lotes via Planilha Excel (.xlsx / .xls)"
            >
              <UploadCloud className="w-4 h-4 text-[#2d6a4f]" />
              <span>Importar Excel</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => exportService.exportToExcel(filteredAmostras)}
            className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            title="Exportar para Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar Excel</span>
          </button>

          <button
            type="button"
            onClick={onNewSample}
            className="flex items-center gap-1.5 bg-[#1b4332] hover:bg-[#2d6a4f] text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Amostragem</span>
          </button>
        </div>
      </div>

      {/* Indicadores de Acompanhamento Interativos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => {
            setSituacaoFilter('todos');
            setFilterStatus('');
          }}
          className={`text-left p-3.5 rounded-xl border transition-colors cursor-pointer ${
            situacaoFilter === 'todos' && !filterStatus
              ? 'bg-[#f0f7f4] border-[#2d6a4f]'
              : 'bg-white border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-gray-600">
            <span>Total Plantados</span>
            <Sprout className="w-4 h-4 text-[#2d6a4f]" />
          </div>
          <p className="text-2xl font-black text-gray-900 tabular-nums mt-1">
            {indicadores.totalPlantados}
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            setSituacaoFilter('aguardando');
            setFilterStatus('');
          }}
          className={`text-left p-3.5 rounded-xl border transition-colors cursor-pointer ${
            situacaoFilter === 'aguardando'
              ? 'bg-sky-50 border-sky-600'
              : 'bg-white border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-gray-600">
            <span>Aguardando Leitura</span>
            <Clock className="w-4 h-4 text-sky-700" />
          </div>
          <p className="text-2xl font-black text-sky-900 tabular-nums mt-1">
            {indicadores.aguardandoLeitura}
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            setSituacaoFilter('iniciada');
            setFilterStatus('');
          }}
          className={`text-left p-3.5 rounded-xl border transition-colors cursor-pointer ${
            situacaoFilter === 'iniciada'
              ? 'bg-amber-50 border-amber-600'
              : 'bg-white border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-gray-600">
            <span>Leitura Iniciada</span>
            <PlayCircle className="w-4 h-4 text-amber-700" />
          </div>
          <p className="text-2xl font-black text-amber-900 tabular-nums mt-1">
            {indicadores.leituraIniciada}
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            setSituacaoFilter('concluida');
            setFilterStatus('');
          }}
          className={`text-left p-3.5 rounded-xl border transition-colors cursor-pointer ${
            situacaoFilter === 'concluida'
              ? 'bg-emerald-50 border-emerald-700'
              : 'bg-white border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-gray-600">
            <span>Leitura Concluída</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="text-2xl font-black text-emerald-900 tabular-nums mt-1">
            {indicadores.leituraConcluida}
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            setSituacaoFilter('pendencias');
            setFilterStatus('');
          }}
          className={`text-left p-3.5 rounded-xl border transition-colors cursor-pointer col-span-2 sm:col-span-1 ${
            situacaoFilter === 'pendencias'
              ? 'bg-rose-50 border-rose-600'
              : 'bg-white border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-gray-600">
            <span>Com Pendências</span>
            <AlertTriangle className="w-4 h-4 text-rose-700" />
          </div>
          <p className="text-2xl font-black text-rose-800 tabular-nums mt-1">
            {indicadores.comPendencias}
          </p>
        </button>
      </div>

      {/* Bar de Busca Rápida e Toggle de Filtros Avançados */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          
          {/* Busca Global */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar por lote, cultura, cultivar, categoria, safra, canteiro ou protocolo..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
            />
            {searchQuery && (
              <button 
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Toggle Filtros Avançados */}
          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors whitespace-nowrap cursor-pointer ${
              showAdvancedFilters || filterStatus || filterCultura || filterCanteiro || filterCategoria || filterCultivar
                ? 'bg-[#2d6a4f] text-white border-[#1b4332]'
                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filtros Avançados</span>
          </button>

          {(searchQuery || situacaoFilter !== 'todos' || filterProtocolo || filterLote || filterCultivar || filterCultura || filterCategoria || filterSafra || filterCanteiro || filterStatus || filterDataInicio) && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-semibold text-rose-600 hover:underline px-2 py-1 cursor-pointer whitespace-nowrap"
            >
              Limpar Filtros
            </button>
          )}

        </div>

        {/* Painel de Filtros Detalhados */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            
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
                {culturasDisponiveis.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Filtro Cultivar */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1">Cultivar</label>
              <input
                type="text"
                value={filterCultivar}
                onChange={(e) => setFilterCultivar(e.target.value)}
                placeholder="Ex: M 8349"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800"
              />
            </div>

            {/* Filtro Categoria */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1">Categoria</label>
              <select
                value={filterCategoria}
                onChange={(e) => setFilterCategoria(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800"
              >
                <option value="">Todas</option>
                {categoriasDisponiveis.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
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
                {safrasDisponiveis.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Filtro Canteiro */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1">Canteiro</label>
              <select
                value={filterCanteiro}
                onChange={(e) => setFilterCanteiro(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800"
              >
                <option value="">Todos</option>
                {canteirosDisponiveis.map((cant) => (
                  <option key={cant} value={cant}>{cant}</option>
                ))}
              </select>
            </div>

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

            {/* Filtro Situação / Status */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1">Situação</label>
              <select
                value={situacaoFilter}
                onChange={(e) => setSituacaoFilter(e.target.value as SituacaoFiltro)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800"
              >
                <option value="todos">Todas</option>
                <option value="aguardando">Plantado – Aguardando Leitura</option>
                <option value="iniciada">Leitura Iniciada</option>
                <option value="concluida">Leitura Concluída</option>
                <option value="pendencias">Com Pendências</option>
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

      {/* Alerta de Cota ou Sincronização Indisponível */}
      {syncState.isQuotaExceeded && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-amber-900 shadow-sm">
          <Database className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-sm text-amber-950">
              Modo Offline / Cota do Servidor Firestore: Dados Preservados
            </p>
            <p className="text-amber-800">
              A cota diária de leituras do Firestore no plano gratuito foi temporariamente atingida.
              <strong> Seus registros estão seguros e continuam acessíveis no cache local deste dispositivo.</strong>
              {' '}Nenhum dado foi perdido ou apagado.
            </p>
          </div>
        </div>
      )}

      {/* Contagem de Resultados */}
      <div className="flex items-center justify-between text-xs font-semibold text-gray-500 px-1">
        <span>Exibindo {filteredAmostras.length} de {amostras.length} amostras</span>
        <button onClick={refreshList} className="flex items-center gap-1 hover:text-gray-800 cursor-pointer">
          <RefreshCw className="w-3 h-3" /> Atualizar Tabela
        </button>
      </div>

      {/* Tabela de Amostras (Desktop) e Cards (Mobile) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        
        {filteredAmostras.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            {syncState.isQuotaExceeded && amostras.length === 0 ? (
              <>
                <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
                <p className="text-base font-bold text-gray-800">Não foi possível carregar os dados do servidor no momento</p>
                <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                  A conexão com o servidor atingiu o limite de requisições temporário. Assim que a cota reiniciar ou for ampliada no Firebase Console, todos os registros remotos serão carregados automaticamente.
                </p>
              </>
            ) : (
              <>
                <Sprout className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-base font-bold text-gray-700">Nenhuma amostra encontrada</p>
                <p className="text-xs text-gray-500 mt-1">Ajuste seus filtros de busca ou cadastre uma nova amostra.</p>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Tabela Desktop */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-[#1b4332] text-white uppercase text-[11px] tracking-wider font-bold">
                  <tr>
                    <th className="py-3.5 px-4">Protocolo / Canteiro</th>
                    <th className="py-3.5 px-3">Cultura / Cultivar</th>
                    <th className="py-3.5 px-3">Lote</th>
                    <th className="py-3.5 px-2">Safra</th>
                    <th className="py-3.5 px-3">Lançamento</th>
                    <th className="py-3.5 px-3">Leitura 7d</th>
                    <th className="py-3.5 px-3">Leitura 10d</th>
                    <th className="py-3.5 px-3">Situação / Leitura</th>
                    <th className="py-3.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredItems.map(({ amostra, avaliacao, leituraInfo, acompanhamento }) => {
                    const totalTestes = storageService.getAvaliacoesByAmostraId(amostra.id);

                    return (
                      <tr key={amostra.id} className="hover:bg-gray-50/80 transition-colors">
                        
                        <td className="py-3.5 px-4 font-extrabold text-gray-900">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onShowQRCode(amostra)}
                              className="p-1 rounded bg-gray-100 hover:bg-[#2d6a4f] hover:text-white text-gray-700 transition-colors cursor-pointer"
                              title="Ver QR Code do Canteiro"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </button>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span>{amostra.protocolo}</span>
                                {totalTestes.length > 1 && (
                                  <span 
                                    className="px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 tabular-nums"
                                    title={`Lote com ${totalTestes.length} testes realizados no histórico`}
                                  >
                                    {totalTestes.length} testes
                                  </span>
                                )}
                              </div>
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2d6a4f] mt-0.5">
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span>{amostra.canteiro?.trim() || 'Canteiro não vinculado'}</span>
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <p className="font-bold text-gray-900">{amostra.cultura}</p>
                          <p className="text-[11px] text-gray-500">{amostra.cultivar}</p>
                        </td>

                        <td className="py-3.5 px-3 font-semibold text-gray-800">
                          {amostra.lote}
                          <span className="block text-[10px] text-gray-400 font-normal">
                            Pen: {amostra.peneira} • {amostra.categoria}
                            {amostra.tsiMatriz ? ` • TSI: ${amostra.tsiMatriz}` : ''}
                          </span>
                        </td>

                        <td className="py-3.5 px-2 font-medium tabular-nums">{amostra.safra}</td>

                        <td className="py-3.5 px-3 font-medium text-gray-700 tabular-nums">
                          {formatDateBR(amostra.dataSemeadura)}
                        </td>

                        <td className="py-3.5 px-3 font-bold text-[#1b4332] tabular-nums">
                          <div className="flex items-center gap-1">
                            <span>{formatDateBR(leituraInfo.data7d)}</span>
                            {leituraInfo.leitura7dRealizada && (
                              <span title="Leitura de 7 dias realizada"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /></span>
                            )}
                          </div>
                          {amostra.plantulasEmergidas7dias !== undefined && (
                            <span className="text-[10px] text-emerald-800 font-extrabold bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded mt-0.5 inline-block tabular-nums">
                              {amostra.plantulasEmergidas7dias} emergidas
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 font-bold text-[#1b4332] tabular-nums">
                          <div className="flex items-center gap-1">
                            <span>{formatDateBR(leituraInfo.data10d)}</span>
                            {leituraInfo.leitura10dRealizada && (
                              <span title="Leitura de 10 dias realizada"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /></span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-3 space-y-1">
                          {acompanhamento.isLeituraConcluida ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded font-bold text-[10px] uppercase">
                              <CheckCircle2 className="w-3 h-3" />
                              LEITURA CONCLUÍDA
                            </span>
                          ) : acompanhamento.isLeituraIniciada ? (
                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold text-[10px] uppercase">
                              <PlayCircle className="w-3 h-3" />
                              LEITURA INICIADA
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-sky-100 text-sky-900 px-2 py-0.5 rounded font-bold text-[10px] uppercase">
                              <Clock className="w-3 h-3" />
                              PLANTADO – AGUARDANDO LEITURA
                            </span>
                          )}

                          {acompanhamento.temPendencia && (
                            <span className="block text-[10px] font-semibold text-rose-700">
                              {acompanhamento.motivosPendencia[0]}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            
                            {/* Botão Editar Amostra */}
                            <button
                              type="button"
                              onClick={() => setEditingAmostra(amostra)}
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#1b4332] border border-emerald-200 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                              title="Editar Amostra"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-[#2d6a4f]" />
                              <span>EDITAR</span>
                            </button>

                            {/* Botão Avaliar */}
                            <button
                              type="button"
                              onClick={() => onOpenAvaliacao(amostra.id)}
                              className="px-2.5 py-1.5 bg-[#2d6a4f] hover:bg-[#1b4332] text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                              title="Abrir Tela de Avaliação"
                            >
                              <ClipboardCheck className="w-3.5 h-3.5" />
                              <span>AVALIAR</span>
                            </button>

                            {/* Botão Laudo PDF */}
                            <button
                              type="button"
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
                              type="button"
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
              {filteredItems.map(({ amostra, avaliacao, leituraInfo, acompanhamento }) => {
                const totalTestes = storageService.getAvaliacoesByAmostraId(amostra.id);

                return (
                  <div key={amostra.id} className="p-4 space-y-3">
                    
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-gray-900 text-base">{amostra.protocolo}</span>
                          {totalTestes.length > 1 && (
                            <span 
                              className="px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 tabular-nums"
                              title={`Lote com ${totalTestes.length} testes realizados`}
                            >
                              {totalTestes.length} testes
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => onShowQRCode(amostra)}
                            className="p-1 bg-gray-100 rounded text-gray-600 cursor-pointer"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="font-bold text-[#2d6a4f] text-sm mt-0.5">
                          {amostra.cultura} - {amostra.cultivar}
                        </p>
                        <p className="text-[11px] font-semibold text-gray-600 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-[#2d6a4f]" />
                          <span>{amostra.canteiro?.trim() || 'Canteiro não vinculado'}</span>
                        </p>
                      </div>

                      <div className="text-right">
                        {acompanhamento.isLeituraConcluida ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 font-bold text-[10px] px-2 py-1 rounded uppercase">
                            <CheckCircle2 className="w-3 h-3" />
                            CONCLUÍDA
                          </span>
                        ) : acompanhamento.isLeituraIniciada ? (
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 font-bold text-[10px] px-2 py-1 rounded uppercase">
                            <PlayCircle className="w-3 h-3" />
                            INICIADA
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-sky-100 text-sky-900 font-bold text-[10px] px-2 py-1 rounded uppercase">
                            <Clock className="w-3 h-3" />
                            AGUARDANDO LEITURA
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl">
                      <div><span className="font-semibold text-gray-800">Lote:</span> {amostra.lote}</div>
                      <div><span className="font-semibold text-gray-800">Safra:</span> {amostra.safra}</div>
                      <div><span className="font-semibold text-gray-800">Categoria:</span> {amostra.categoria}</div>
                      <div><span className="font-semibold text-gray-800">Lançamento:</span> {formatDateBR(amostra.dataSemeadura)}</div>
                      {amostra.tsiMatriz && (
                        <div className="col-span-2 text-[11px] text-[#1b4332] bg-emerald-50 px-2 py-1 rounded-md font-semibold border border-emerald-200">
                          <span className="font-bold">Matriz / TSI:</span> {amostra.tsiMatriz}
                        </div>
                      )}
                      <div><span className="font-semibold text-[#1b4332]">Leitura 7d:</span> {formatDateBR(leituraInfo.data7d)}</div>
                      <div><span className="font-semibold text-[#1b4332]">Leitura 10d:</span> {formatDateBR(leituraInfo.data10d)}</div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const fotos = storageService.getFotosByAmostra(amostra.id);
                            exportService.generateSamplePDF(amostra, avaliacao, fotos);
                          }}
                          className="text-xs font-bold text-gray-600 flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <FileText className="w-4 h-4 text-rose-600" />
                          Laudo PDF
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingAmostra(amostra)}
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#1b4332] border border-emerald-200 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#2d6a4f]" />
                          <span>EDITAR</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const fotos = storageService.getFotosByAmostra(amostra.id);
                            exportService.generateSamplePDF(amostra, avaliacao, fotos);
                          }}
                          className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                          title="Baixar Laudo PDF"
                        >
                          <FileText className="w-3.5 h-3.5 text-gray-700" />
                          <span>PDF</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setItemToDelete({ id: amostra.id, name: amostra.protocolo })}
                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>EXCLUIR</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onOpenAvaliacao(amostra.id)}
                        className="bg-[#2d6a4f] hover:bg-[#1b4332] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <ClipboardCheck className="w-4 h-4 text-[#d8f3dc]" />
                        <span>Avaliar</span>
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
