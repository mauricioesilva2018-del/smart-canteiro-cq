import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Plus, 
  Settings, 
  Search, 
  Filter, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  History, 
  Download, 
  Paperclip, 
  RefreshCw,
  Bell,
  SlidersHorizontal,
  ChevronRight,
  Layers,
  Trash2,
  Edit3,
  FileSpreadsheet,
  FileBadge
} from 'lucide-react';
import { 
  LoteQualidade, 
  AnaliseQualidade, 
  DocumentoAnexoQualidade, 
  StatusValidadeLote, 
  CategoriaLote 
} from '../../types';
import { storageService } from '../../services/storageService';
import { formatDateBR, getDaysDifference, getTodayBR } from '../../utils/dateUtils';
import { termoConformidadeService } from '../../services/termoConformidadeService';
import { NovaAnaliseModal } from './NovaAnaliseModal';
import { HistoricoLoteModal } from './HistoricoLoteModal';
import { ParametrosQualidadeModal } from './ParametrosQualidadeModal';
import { VisualizadorDocumentoModal } from './VisualizadorDocumentoModal';
import { EditarLoteModal } from './EditarLoteModal';
import { ModeloTermoConformidadeModal } from './ModeloTermoConformidadeModal';
import { ImportarPlanilhaModal } from './ImportarPlanilhaModal';

export const QualidadeView: React.FC = () => {
  const [lotes, setLotes] = useState<LoteQualidade[]>([]);
  const [stats, setStats] = useState(storageService.getDashboardQualidadeStats());

  // Filtros
  const [busca, setBusca] = useState('');
  const [filtroCultura, setFiltroCultura] = useState<string>('TODAS');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('TODAS');
  const [filtroSafra, setFiltroSafra] = useState<string>('TODAS');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');

  // Modais
  const [modalNovaAnaliseOpen, setModalNovaAnaliseOpen] = useState(false);
  const [loteParaReanalise, setLoteParaReanalise] = useState<LoteQualidade | undefined>(undefined);
  const [modalHistoricoLote, setModalHistoricoLote] = useState<LoteQualidade | null>(null);
  const [modalParametrosOpen, setModalParametrosOpen] = useState(false);
  const [modalModeloTermoOpen, setModalModeloTermoOpen] = useState(false);
  const [modalImportarPlanilhaOpen, setModalImportarPlanilhaOpen] = useState(false);

  // Edição e Exclusão
  const [loteParaEditar, setLoteParaEditar] = useState<LoteQualidade | null>(null);
  const [analiseParaEditar, setAnaliseParaEditar] = useState<AnaliseQualidade | undefined>(undefined);
  const [loteParaExcluir, setLoteParaExcluir] = useState<LoteQualidade | null>(null);
  const [excluindoLote, setExcluindoLote] = useState(false);

  // Visualizador de Documento
  const [viewerState, setViewerState] = useState<{
    isOpen: boolean;
    doc?: DocumentoAnexoQualidade;
    lote?: LoteQualidade;
    analise?: AnaliseQualidade;
  }>({ isOpen: false });

  // Carregar dados e escutar atualizações
  const carregarDados = () => {
    const todosLotes = storageService.getLotesQualidade();
    setLotes(todosLotes);
    setStats(storageService.getDashboardQualidadeStats());
  };

  useEffect(() => {
    carregarDados();
    const unsubscribe = storageService.subscribe(() => {
      carregarDados();
    });
    return () => unsubscribe();
  }, []);

  // Extrair listas únicas para filtros
  const culturasDisponiveis = Array.from(new Set(lotes.map(l => l.cultura))).filter(Boolean);
  const safrasDisponiveis = Array.from(new Set(lotes.map(l => l.safra))).filter(Boolean);

  // Filtragem dos lotes
  const lotesFiltrados = lotes.filter(lote => {
    // Busca por texto (lote, cultivar, tratamento)
    if (busca.trim()) {
      const termo = busca.toLowerCase();
      const matchLote = lote.lote.toLowerCase().includes(termo);
      const matchCultivar = lote.cultivar.toLowerCase().includes(termo);
      const matchCultura = lote.cultura.toLowerCase().includes(termo);
      if (!matchLote && !matchCultivar && !matchCultura) return false;
    }

    // Filtro Cultura
    if (filtroCultura !== 'TODAS' && lote.cultura !== filtroCultura) {
      return false;
    }

    // Filtro Categoria
    if (filtroCategoria !== 'TODAS' && lote.categoria !== filtroCategoria) {
      return false;
    }

    // Filtro Safra
    if (filtroSafra !== 'TODAS' && lote.safra !== filtroSafra) {
      return false;
    }

    // Filtro Status
    if (filtroStatus !== 'TODOS') {
      if (filtroStatus === 'VALIDO' && lote.statusValidade !== 'VALIDO') return false;
      if (filtroStatus === 'PROXIMO_VENCIMENTO' && lote.statusValidade !== 'PROXIMO_VENCIMENTO') return false;
      if (filtroStatus === 'VENCIDO' && lote.statusValidade !== 'VENCIDO') return false;
      if (filtroStatus === 'EM_REANALISE' && !lote.emReanalise) return false;
      if (filtroStatus === 'SEM_DOCUMENTO' && (lote.temDocumento && lote.statusValidade !== 'SEM_DOCUMENTO')) return false;
    }

    return true;
  });

  // Ação de Reanalisar Lote
  const handleAbrirReanalise = (lote: LoteQualidade) => {
    setLoteParaReanalise(lote);
    setModalNovaAnaliseOpen(true);
  };

  // Ação de Visualizar Documento / Termo
  const handleAbrirDocumento = (lote: LoteQualidade) => {
    const analiseAtual = storageService.getAnaliseQualidadeById(lote.analiseAtualId) ||
      storageService.getAnalisesQualidade(lote.id)[0];

    if (analiseAtual?.documentoAnexo) {
      setViewerState({
        isOpen: true,
        doc: analiseAtual.documentoAnexo,
        lote,
        analise: analiseAtual,
      });
    } else {
      // Abre Termo de Conformidade
      setViewerState({
        isOpen: true,
        lote,
        analise: analiseAtual,
      });
    }
  };

  // Alternar Status "Em Reanálise"
  const handleToggleEmReanalise = async (lote: LoteQualidade) => {
    await storageService.setLoteEmReanalise(lote.id, !lote.emReanalise);
  };

  // Exclusão de Lote
  const handleConfirmarExclusaoLote = async () => {
    if (!loteParaExcluir) return;
    try {
      setExcluindoLote(true);
      await storageService.excluirLoteQualidade(loteParaExcluir.id);
      setLoteParaExcluir(null);
      carregarDados();
    } catch (e) {
      console.error('Erro ao excluir lote:', e);
    } finally {
      setExcluindoLote(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. CABEÇALHO DO MÓDULO */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl shadow-sm">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight">
                Controle de Qualidade de Lotes
              </h1>
              <p className="text-xs text-gray-500">
                Gestão integrada de análises originais, laudos laboratoriais, validade legal, reanálises e termos de conformidade.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setModalImportarPlanilhaOpen(true)}
            className="inline-flex items-center px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-lg hover:bg-emerald-100 transition shadow-sm"
            title="Importar planilha com lotes e análises (.xlsx, .csv)"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-700" />
            Importar Planilha
          </button>

          <button
            onClick={() => setModalModeloTermoOpen(true)}
            className="inline-flex items-center px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition shadow-sm"
            title="Visualizar e configurar o Modelo do Termo de Conformidade MAPA"
          >
            <FileBadge className="w-4 h-4 mr-1.5 text-emerald-600" />
            Modelo Termo Conformidade
          </button>

          <button
            onClick={() => setModalParametrosOpen(true)}
            className="inline-flex items-center px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition shadow-sm"
          >
            <Settings className="w-4 h-4 mr-1.5 text-gray-500" />
            Parâmetros por Cultura
          </button>

          <button
            onClick={() => {
              setLoteParaReanalise(undefined);
              setModalNovaAnaliseOpen(true);
            }}
            className="inline-flex items-center px-4 py-2 text-xs font-bold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition shadow"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nova Análise de Lote
          </button>
        </div>
      </div>

      {/* 2. ALERTA DE VENCIMENTO / REANÁLISE (SE HOUVER LOTES CRÍTICOS) */}
      {(stats.proximosVencimento > 0 || stats.lotesVencidos > 0) && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between gap-4 shadow-sm animate-fade-in">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500 text-white rounded-lg">
              <Bell className="w-5 h-5" />
            </div>
            <div className="text-xs text-amber-900">
              <span className="font-bold block text-sm">
                Atenção ao Vencimento das Análises de Sementes
              </span>
              <span>
                Há <strong>{stats.lotesVencidos}</strong> lote(s) com validade vencida e{' '}
                <strong>{stats.proximosVencimento}</strong> lote(s) com vencimento próximo (menos de 30 dias).
                Providencie a reanálise para manter a conformidade legal para comercialização.
              </span>
            </div>
          </div>

          <button
            onClick={() => setFiltroStatus('PROXIMO_VENCIMENTO')}
            className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition"
          >
            Filtrar Lotes em Alerta
          </button>
        </div>
      )}

      {/* 3. DASHBOARD DE CARDS (8 CARDS DE STATUS) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Total de Lotes */}
        <button
          onClick={() => setFiltroStatus('TODOS')}
          className={`p-3 rounded-xl border text-left transition ${
            filtroStatus === 'TODOS'
              ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
          }`}
        >
          <span className="text-[11px] font-bold text-gray-500 block uppercase">Total Lotes</span>
          <span className="text-xl font-black text-gray-900 block mt-1">{stats.totalLotes}</span>
          <span className="text-[10px] text-gray-400">Cadastrados</span>
        </button>

        {/* Válidos */}
        <button
          onClick={() => setFiltroStatus('VALIDO')}
          className={`p-3 rounded-xl border text-left transition ${
            filtroStatus === 'VALIDO'
              ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
          }`}
        >
          <span className="text-[11px] font-bold text-emerald-700 block uppercase">🟢 Válidos</span>
          <span className="text-xl font-black text-emerald-800 block mt-1">{stats.lotesValidos}</span>
          <span className="text-[10px] text-emerald-600">Dentro do prazo</span>
        </button>

        {/* Próximos Vencimento */}
        <button
          onClick={() => setFiltroStatus('PROXIMO_VENCIMENTO')}
          className={`p-3 rounded-xl border text-left transition ${
            filtroStatus === 'PROXIMO_VENCIMENTO'
              ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20'
              : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
          }`}
        >
          <span className="text-[11px] font-bold text-amber-700 block uppercase">🟡 A Vencer</span>
          <span className="text-xl font-black text-amber-800 block mt-1">{stats.proximosVencimento}</span>
          <span className="text-[10px] text-amber-600">&lt; 30 dias</span>
        </button>

        {/* Vencidos */}
        <button
          onClick={() => setFiltroStatus('VENCIDO')}
          className={`p-3 rounded-xl border text-left transition ${
            filtroStatus === 'VENCIDO'
              ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-500/20'
              : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
          }`}
        >
          <span className="text-[11px] font-bold text-rose-700 block uppercase">🔴 Vencidos</span>
          <span className="text-xl font-black text-rose-800 block mt-1">{stats.lotesVencidos}</span>
          <span className="text-[10px] text-rose-600">Requer reanálise</span>
        </button>

        {/* Em Reanálise */}
        <button
          onClick={() => setFiltroStatus('EM_REANALISE')}
          className={`p-3 rounded-xl border text-left transition ${
            filtroStatus === 'EM_REANALISE'
              ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-500/20'
              : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
          }`}
        >
          <span className="text-[11px] font-bold text-orange-700 block uppercase">🟠 Em Reanálise</span>
          <span className="text-xl font-black text-orange-800 block mt-1">{stats.lotesEmReanalise}</span>
          <span className="text-[10px] text-orange-600">No laboratório</span>
        </button>

        {/* Sem Documento */}
        <button
          onClick={() => setFiltroStatus('SEM_DOCUMENTO')}
          className={`p-3 rounded-xl border text-left transition ${
            filtroStatus === 'SEM_DOCUMENTO'
              ? 'bg-gray-100 border-gray-500 ring-2 ring-gray-500/20'
              : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
          }`}
        >
          <span className="text-[11px] font-bold text-gray-600 block uppercase">⚪ Sem Doc</span>
          <span className="text-xl font-black text-gray-800 block mt-1">{stats.lotesSemDocumentacao}</span>
          <span className="text-[10px] text-gray-400">Pendente anexo</span>
        </button>

        {/* Com Certificado */}
        <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
          <span className="text-[11px] font-bold text-blue-700 block uppercase">📄 Certificado</span>
          <span className="text-xl font-black text-blue-800 block mt-1">{stats.lotesComCertificado}</span>
          <span className="text-[10px] text-blue-600">Básica / C1 / C2</span>
        </div>

        {/* Termo de Conformidade */}
        <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
          <span className="text-[11px] font-bold text-emerald-700 block uppercase">📜 Termo MAPA</span>
          <span className="text-xl font-black text-emerald-800 block mt-1">{stats.lotesComTermoConformidade}</span>
          <span className="text-[10px] text-emerald-600">S1 / S2</span>
        </div>
      </div>

      {/* 4. BARRA DE FILTROS E PESQUISA */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Busca Geral */}
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por lote, cultivar..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Filtro Cultura */}
          <div>
            <select
              value={filtroCultura}
              onChange={e => setFiltroCultura(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-emerald-500"
            >
              <option value="TODAS">Cultura: Todas</option>
              <option value="Sorgo">Sorgo</option>
              <option value="Trigo">Trigo</option>
              <option value="Algodão">Algodão</option>
              <option value="Soja">Soja</option>
              <option value="Milho">Milho</option>
              <option value="Feijão">Feijão</option>
              {culturasDisponiveis
                .filter(c => !['Sorgo', 'Trigo', 'Algodão', 'Soja', 'Milho', 'Feijão'].includes(c))
                .map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
            </select>
          </div>

          {/* Filtro Categoria */}
          <div>
            <select
              value={filtroCategoria}
              onChange={e => setFiltroCategoria(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-emerald-500"
            >
              <option value="TODAS">Categoria: Todas</option>
              <option value="Básica">Básica</option>
              <option value="C1">C1 (Certificada 1)</option>
              <option value="C2">C2 (Certificada 2)</option>
              <option value="S1">S1 (Salva 1)</option>
              <option value="S2">S2 (Salva 2)</option>
            </select>
          </div>

          {/* Filtro Safra */}
          <div>
            <select
              value={filtroSafra}
              onChange={e => setFiltroSafra(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-emerald-500"
            >
              <option value="TODAS">Safra: Todas</option>
              {safrasDisponiveis.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Status */}
          <div>
            <select
              value={filtroStatus}
              onChange={e => setFiltroStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="TODOS">Status: Todos</option>
              <option value="VALIDO">🟢 Válidos</option>
              <option value="PROXIMO_VENCIMENTO">🟡 Próximo Vencimento</option>
              <option value="VENCIDO">🔴 Vencidos</option>
              <option value="EM_REANALISE">🟠 Em Reanálise</option>
              <option value="SEM_DOCUMENTO">⚪ Sem Documentação</option>
            </select>
          </div>
        </div>

        {/* Contador de Registros */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
          <span>
            Exibindo <strong>{lotesFiltrados.length}</strong> de <strong>{lotes.length}</strong> lotes cadastrados
          </span>
          {(busca || filtroCultura !== 'TODAS' || filtroCategoria !== 'TODAS' || filtroSafra !== 'TODAS' || filtroStatus !== 'TODOS') && (
            <button
              onClick={() => {
                setBusca('');
                setFiltroCultura('TODAS');
                setFiltroCategoria('TODAS');
                setFiltroSafra('TODAS');
                setFiltroStatus('TODOS');
              }}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold underline"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* 5. TABELA DE LOTES DE QUALIDADE */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-gray-200">
            <thead className="bg-gray-50 text-gray-700 font-semibold">
              <tr>
                <th className="p-3.5">Lote / Cultura</th>
                <th className="p-3.5 text-center">Cat.</th>
                <th className="p-3.5">Safra / Qtd</th>
                <th className="p-3.5 text-center">Última Análise</th>
                <th className="p-3.5 text-center">Germ.</th>
                <th className="p-3.5 text-center">Vigor</th>
                <th className="p-3.5 text-center">Pureza</th>
                <th className="p-3.5 text-center">Umid.</th>
                <th className="p-3.5 text-center">Validade</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Reanálise</th>
                <th className="p-3.5 text-center">Documento</th>
                <th className="p-3.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {lotesFiltrados.length > 0 ? (
                lotesFiltrados.map(lote => {
                  const diasRestantes = getDaysDifference(lote.dataValidadeAtual, getTodayBR());
                  const isVencido = diasRestantes < 0;

                  return (
                    <tr key={lote.id} className="hover:bg-gray-50/80 transition group">
                      {/* Lote / Cultura */}
                      <td className="p-3.5">
                        <div className="font-bold text-gray-900 font-mono text-sm group-hover:text-emerald-700 transition">
                          {lote.lote}
                        </div>
                        <div className="text-gray-500 text-[11px] flex items-center space-x-1.5 mt-0.5">
                          <span className="font-semibold text-emerald-800">{lote.cultura}</span>
                          <span>•</span>
                          <span>{lote.cultivar}</span>
                          {lote.peneira && (
                            <>
                              <span>•</span>
                              <span className="text-gray-400 font-mono">P: {lote.peneira}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Categoria */}
                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            lote.categoria === 'Básica'
                              ? 'bg-purple-100 text-purple-800'
                              : lote.categoria.startsWith('C')
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {lote.categoria}
                        </span>
                      </td>

                      {/* Safra / Qtd */}
                      <td className="p-3.5">
                        <div className="font-medium text-gray-800">{lote.safra}</div>
                        <div className="text-gray-500 text-[11px]">{lote.quantidade || 'N/I'}</div>
                      </td>

                      {/* Data da Última Análise */}
                      <td className="p-3.5 text-center font-medium text-gray-700">
                        {formatDateBR(lote.dataUltimaAnalise)}
                      </td>

                      {/* Germinação */}
                      <td className="p-3.5 text-center">
                        <span className="font-black text-xs text-emerald-800">
                          {lote.germinacaoAtual !== undefined ? `${lote.germinacaoAtual}%` : '-'}
                        </span>
                      </td>

                      {/* Vigor */}
                      <td className="p-3.5 text-center">
                        <span className="font-bold text-xs text-gray-800">
                          {lote.vigorAtual !== undefined ? `${lote.vigorAtual}%` : '-'}
                        </span>
                      </td>

                      {/* Pureza */}
                      <td className="p-3.5 text-center">
                        <span className="font-medium text-xs text-gray-700">
                          {lote.purezaAtual !== undefined ? `${lote.purezaAtual}%` : '-'}
                        </span>
                      </td>

                      {/* Umidade */}
                      <td className="p-3.5 text-center">
                        <span className="font-medium text-xs text-gray-700">
                          {lote.umidadeAtual !== undefined ? `${lote.umidadeAtual}%` : '-'}
                        </span>
                      </td>

                      {/* Validade */}
                      <td className="p-3.5 text-center">
                        <div className="font-bold text-gray-900">
                          {formatDateBR(lote.dataValidadeAtual)}
                        </div>
                        <div
                          className={`text-[10px] font-semibold mt-0.5 ${
                            isVencido
                              ? 'text-rose-600'
                              : diasRestantes <= 30
                              ? 'text-amber-600'
                              : 'text-gray-400'
                          }`}
                        >
                          {isVencido
                            ? `Vencido há ${Math.abs(diasRestantes)}d`
                            : `Vence em ${diasRestantes}d`}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-3.5 text-center">
                        {lote.emReanalise ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800">
                            🟠 Em Reanálise
                          </span>
                        ) : lote.statusValidade === 'VALIDO' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            🟢 Válido
                          </span>
                        ) : lote.statusValidade === 'PROXIMO_VENCIMENTO' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            🟡 A Vencer
                          </span>
                        ) : lote.statusValidade === 'VENCIDO' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            🔴 Vencido
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
                            ⚪ Sem Doc
                          </span>
                        )}
                      </td>

                      {/* Reanálise */}
                      <td className="p-3.5 text-center">
                        <div className="flex flex-col items-center space-y-1">
                          <span className="text-[10px] text-gray-500">
                            {lote.totalReanalises ? `${lote.totalReanalises}x reanalisado` : 'Original'}
                          </span>
                          <button
                            onClick={() => handleAbrirReanalise(lote)}
                            className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded transition"
                            title="Registrar nova reanálise deste lote"
                          >
                            + Reanalisar
                          </button>
                        </div>
                      </td>

                      {/* Documento */}
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => handleAbrirDocumento(lote)}
                          className="inline-flex items-center px-2.5 py-1 text-[11px] font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition"
                          title="Visualizar documento ou termo legal"
                        >
                          <FileText className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                          {lote.tipoDocumentoPrincipal === 'TERMO_CONFORMIDADE' ||
                          lote.categoria === 'S1' ||
                          lote.categoria === 'S2'
                            ? 'Termo MAPA'
                            : 'Certificado'}
                        </button>
                      </td>

                      {/* Ações */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => {
                              setLoteParaEditar(lote);
                              setAnaliseParaEditar(undefined);
                            }}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                            title="Editar informações do lote ou análise"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setModalHistoricoLote(lote)}
                            className="p-1.5 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                            title="Histórico e Linha do Tempo"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleToggleEmReanalise(lote)}
                            className={`p-1.5 rounded-lg transition ${
                              lote.emReanalise
                                ? 'text-orange-600 bg-orange-50 hover:bg-orange-100'
                                : 'text-gray-400 hover:text-orange-600 hover:bg-orange-50'
                            }`}
                            title={
                              lote.emReanalise
                                ? 'Desmarcar "Em Reanálise"'
                                : 'Marcar lote como "Em Reanálise" no laboratório'
                            }
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setLoteParaExcluir(lote)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                            title="Excluir este lote e todas as suas análises"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={13} className="p-8 text-center text-gray-500">
                    <ShieldCheck className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                    <p className="font-semibold text-sm">Nenhum lote encontrado com os filtros aplicados.</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Tente alterar os termos de busca ou cadastrar uma nova análise de lote.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. MODAIS */}

      {/* Modal Nova Análise / Reanálise */}
      {modalNovaAnaliseOpen && (
        <NovaAnaliseModal
          loteParaReanalise={loteParaReanalise}
          onClose={() => {
            setModalNovaAnaliseOpen(false);
            setLoteParaReanalise(undefined);
          }}
          onSuccess={(lote, analise) => {
            setModalNovaAnaliseOpen(false);
            setLoteParaReanalise(undefined);
            carregarDados();
          }}
        />
      )}

      {/* Modal Histórico do Lote */}
      {modalHistoricoLote && (
        <HistoricoLoteModal
          lote={modalHistoricoLote}
          onClose={() => setModalHistoricoLote(null)}
          onNovaReanalise={lote => {
            setModalHistoricoLote(null);
            handleAbrirReanalise(lote);
          }}
          onVerDocumento={(doc, lote, analise) => {
            setViewerState({
              isOpen: true,
              doc,
              lote,
              analise,
            });
          }}
          onEditarLote={(lote, analise) => {
            setModalHistoricoLote(null);
            setLoteParaEditar(lote);
            setAnaliseParaEditar(analise);
          }}
        />
      )}

      {/* Modal Editar Lote & Análise */}
      {loteParaEditar && (
        <EditarLoteModal
          lote={loteParaEditar}
          analise={analiseParaEditar}
          onClose={() => {
            setLoteParaEditar(null);
            setAnaliseParaEditar(undefined);
          }}
          onSuccess={() => {
            setLoteParaEditar(null);
            setAnaliseParaEditar(undefined);
            carregarDados();
          }}
        />
      )}

      {/* Modal Modelo Termo de Conformidade */}
      {modalModeloTermoOpen && (
        <ModeloTermoConformidadeModal
          onClose={() => setModalModeloTermoOpen(false)}
          onSaved={() => carregarDados()}
        />
      )}

      {/* Modal Importar Planilha */}
      {modalImportarPlanilhaOpen && (
        <ImportarPlanilhaModal
          onClose={() => setModalImportarPlanilhaOpen(false)}
          onSuccess={() => {
            setModalImportarPlanilhaOpen(false);
            carregarDados();
          }}
        />
      )}

      {/* Modal de Confirmação de Exclusão de Lote */}
      {loteParaExcluir && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-6 max-w-md w-full space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-full">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">Excluir Lote de Qualidade?</h4>
                <p className="text-xs text-gray-500">Esta ação excluirá o lote e todo o histórico de análises.</p>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs space-y-1">
              <p><strong>Lote:</strong> {loteParaExcluir.lote}</p>
              <p><strong>Cultura:</strong> {loteParaExcluir.cultura} ({loteParaExcluir.cultivar})</p>
              <p><strong>Categoria:</strong> {loteParaExcluir.categoria} • Safra {loteParaExcluir.safra}</p>
              <p><strong>Reanálises:</strong> {loteParaExcluir.totalReanalises || 0} reanálise(s)</p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setLoteParaExcluir(null)}
                disabled={excluindoLote}
                className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarExclusaoLote}
                disabled={excluindoLote}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition shadow disabled:opacity-50 inline-flex items-center"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                {excluindoLote ? 'Excluindo...' : 'Sim, Excluir Lote'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Parâmetros por Cultura */}
      {modalParametrosOpen && (
        <ParametrosQualidadeModal
          onClose={() => setModalParametrosOpen(false)}
          onSaved={() => carregarDados()}
        />
      )}

      {/* Modal de Visualização de Documento / Termo */}
      {viewerState.isOpen && (
        <VisualizadorDocumentoModal
          documento={viewerState.doc}
          lote={viewerState.lote}
          analise={viewerState.analise}
          onClose={() => setViewerState({ isOpen: false })}
        />
      )}
    </div>
  );
};
