import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { 
  PlusCircle, Sprout, Clock, CheckCircle2, Award, HeartPulse, 
  AlertOctagon, TrendingUp, Filter, Bell, Calendar, ChevronRight, 
  ClipboardCheck, AlertTriangle, CheckCircle
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend 
} from 'recharts';
import { 
  getAmostraLeituraInfo, 
  formatDateBR, 
  getTodayBR, 
  addDaysToDate 
} from '../utils/dateUtils';
import { Amostra, Avaliacao } from '../types';

interface DashboardViewProps {
  onNewSample: () => void;
  onNavigateToCanteiros: (filterStatus?: string) => void;
  onNavigateToAvaliacao: (amostraId: string) => void;
}

const CULTURA_COLORS = ['#2d6a4f', '#52b788', '#1b4332', '#74c69d', '#b7e4c7', '#d8f3dc'];

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNewSample,
  onNavigateToCanteiros,
  onNavigateToAvaliacao,
}) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsubscribe = storageService.subscribe(() => {
      setTick(t => t + 1);
    });
    return () => unsubscribe();
  }, []);

  const stats = storageService.getDashboardStats();
  const amostras = storageService.getAmostras();
  const avaliacoes = storageService.getAvaliacoes();
  const configs = storageService.getConfiguracoes();

  // Processar informações de leituras (7 e 10 dias) para todas as amostras
  const amostrasComLeitura = amostras.map(amostra => {
    const avaliacao = avaliacoes.find(a => a.amostraId === amostra.id);
    const leituraInfo = getAmostraLeituraInfo(amostra, avaliacao);
    return {
      amostra,
      avaliacao,
      leituraInfo,
    };
  });

  // Amostras com Leituras de Hoje (7 dias ou 10 dias prontas hoje)
  const leiturasDeHoje = amostrasComLeitura.filter(item => {
    const { leituraInfo } = item;
    // Se hoje é data de 7 dias e 7 dias não realizada OU hoje é 10 dias e 10 dias não realizada
    return (leituraInfo.is7dHoje && !leituraInfo.leitura7dRealizada) ||
           (leituraInfo.is10dHoje && !leituraInfo.leitura10dRealizada);
  });

  // Amostras Atrasadas
  const leiturasAtrasadas = amostrasComLeitura.filter(item => {
    const { leituraInfo } = item;
    return (leituraInfo.is7dAtrasada && !leituraInfo.leitura7dRealizada) ||
           (leituraInfo.is10dAtrasada && !leituraInfo.leitura10dRealizada);
  });

  // Próximas Leituras (todas as amostras ordenadas por prioridade/proximidade de leitura)
  const proximasLeituras = [...amostrasComLeitura].sort((a, b) => {
    // Primeiro as de hoje, depois atrasadas, depois futuras mais próximas
    const scoreA = a.leituraInfo.statusGeral === 'PENDENTE_HOJE' ? 0 : 
                   a.leituraInfo.statusGeral === 'ATRASADA' ? 1 : 
                   a.leituraInfo.statusGeral === 'FUTURA' ? 2 : 3;
    const scoreB = b.leituraInfo.statusGeral === 'PENDENTE_HOJE' ? 0 : 
                   b.leituraInfo.statusGeral === 'ATRASADA' ? 1 : 
                   b.leituraInfo.statusGeral === 'FUTURA' ? 2 : 3;
    if (scoreA !== scoreB) return scoreA - scoreB;
    return a.leituraInfo.diasParaProximaLeitura - b.leituraInfo.diasParaProximaLeitura;
  });

  // Dados para Gráfico por Cultura
  const culturaCounts = amostras.reduce((acc, curr) => {
    acc[curr.cultura] = (acc[curr.cultura] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieDataCultura = Object.entries(culturaCounts).map(([name, value]) => ({
    name,
    value,
  }));

  // Dados para Gráfico de Germinação Média por Cultura vs Mínimo
  const culturaGerminationMap: Record<string, { totalGerm: number; count: number }> = {};
  avaliacoes.forEach(a => {
    const ams = amostras.find(s => s.id === a.amostraId);
    if (ams) {
      if (!culturaGerminationMap[ams.cultura]) {
        culturaGerminationMap[ams.cultura] = { totalGerm: 0, count: 0 };
      }
      culturaGerminationMap[ams.cultura].totalGerm += a.germinacao;
      culturaGerminationMap[ams.cultura].count += 1;
    }
  });

  const barDataGerminacao = Object.keys(culturaCounts).map(cultura => {
    const data = culturaGerminationMap[cultura];
    const avg = data && data.count > 0 ? Math.round((data.totalGerm / data.count) * 10) / 10 : 0;
    const cfg = configs.find(c => c.cultura.toLowerCase() === cultura.toLowerCase());
    const minConfigured = cfg ? cfg.percentualMinimo : 80;

    return {
      cultura,
      'Germinação Média (%)': avg,
      'Mínimo Exigido (%)': minConfigured,
    };
  });

  // Dados para Gráfico de Evolução das Avaliações por Data
  const evalTimelineMap: Record<string, number> = {};
  avaliacoes.forEach(a => {
    const dt = a.dataAvaliacao || 'Recent';
    evalTimelineMap[dt] = (evalTimelineMap[dt] || 0) + 1;
  });

  const lineDataEvolucao = Object.entries(evalTimelineMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => {
      const parts = date.split('-');
      const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}` : date;
      return {
        data: formattedDate,
        'Avaliações Realizadas': count,
      };
    });

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Quick Action */}
      <div className="bg-gradient-to-r from-[#1b4332] via-[#2d6a4f] to-[#40916c] rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider bg-[#52b788]/30 text-[#d8f3dc] px-3 py-1 rounded-full font-bold border border-[#74c69d]/30">
            Painel Geral CQ • Germinação de Canteiros
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight">
            Controle de Qualidade em Tempo Real
          </h2>
          <p className="text-[#b7e4c7] text-sm mt-1 max-w-xl">
            Cálculo automático de leituras de 7 e 10 dias com alertas automáticos para o operador.
          </p>
        </div>

        <button
          id="dash-btn-nova-amostra"
          onClick={onNewSample}
          className="flex items-center gap-2 bg-[#d8f3dc] hover:bg-white text-[#1b4332] font-bold px-5 py-3 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-sm sm:text-base whitespace-nowrap cursor-pointer"
        >
          <PlusCircle className="w-5 h-5 text-[#2d6a4f]" />
          <span>+ Nova Amostra</span>
        </button>
      </div>

      {/* ALERTAS AUTOMÁTICOS DE LEITURA (QUANDO CHEGAR O DIA OU ATRASADAS) */}
      {(leiturasDeHoje.length > 0 || leiturasAtrasadas.length > 0) && (
        <div className="space-y-3">
          {leiturasDeHoje.map(({ amostra, leituraInfo }) => (
            <div 
              key={`alert-today-${amostra.id}`}
              className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-300"
            >
              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-amber-500 text-white rounded-xl shadow-xs">
                  <Bell className="w-6 h-6 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-500 text-white text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full">
                      {leituraInfo.is10dHoje ? '🔔 LEITURA DE 10 DIAS' : '🔔 LEITURA DE 7 DIAS'}
                    </span>
                    <span className="text-xs font-bold text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded-md">
                      HOJE
                    </span>
                  </div>
                  <p className="text-base sm:text-lg font-black text-gray-900 mt-1">
                    A amostra <span className="text-[#1b4332] underline">{amostra.protocolo}</span> está pronta para leitura hoje.
                  </p>
                  <p className="text-xs text-gray-700 mt-0.5">
                    Cultura: <strong className="text-gray-900">{amostra.cultura} ({amostra.cultivar})</strong> • Lote: <strong>{amostra.lote}</strong> • Lançamento: <strong>{formatDateBR(amostra.dataSemeadura)}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigateToAvaliacao(amostra.id)}
                className="w-full sm:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <ClipboardCheck className="w-4 h-4" />
                <span>Realizar Leitura Agora</span>
              </button>
            </div>
          ))}

          {leiturasAtrasadas.map(({ amostra, leituraInfo }) => (
            <div 
              key={`alert-overdue-${amostra.id}`}
              className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-rose-600 text-white rounded-xl shadow-xs">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-rose-600 text-white text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full">
                      🔴 LEITURA ATRASADA
                    </span>
                    <span className="text-xs font-bold text-rose-800 bg-rose-200 px-2 py-0.5 rounded-md">
                      {leituraInfo.diasParaProximaLeitura < 0 ? `Atrasada há ${Math.abs(leituraInfo.diasParaProximaLeitura)} dias` : 'Atrasada'}
                    </span>
                  </div>
                  <p className="text-base sm:text-lg font-black text-gray-900 mt-1">
                    A amostra <span className="text-rose-900 underline">{amostra.protocolo}</span> possui leitura de canteiro pendente e atrasada.
                  </p>
                  <p className="text-xs text-gray-700 mt-0.5">
                    Cultura: <strong>{amostra.cultura} ({amostra.cultivar})</strong> • Lote: <strong>{amostra.lote}</strong> • Data prevista: <strong>{formatDateBR(leituraInfo.proximaLeituraData)}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigateToAvaliacao(amostra.id)}
                className="w-full sm:w-auto px-5 py-2.5 bg-rose-700 hover:bg-rose-800 active:scale-95 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <ClipboardCheck className="w-4 h-4" />
                <span>Regularizar Leitura</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* SEÇÃO 1: LEITURAS DE HOJE */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                LEITURAS DE HOJE
                {leiturasDeHoje.length > 0 && (
                  <span className="bg-amber-500 text-white text-xs font-black px-2.5 py-0.5 rounded-full">
                    {leiturasDeHoje.length}
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-500">
                Amostras que atingiram o ciclo de 7 ou 10 dias e precisam ser avaliadas hoje ({formatDateBR(getTodayBR())})
              </p>
            </div>
          </div>

          <button 
            onClick={() => onNavigateToCanteiros('Pendente')}
            className="text-xs font-bold text-[#2d6a4f] hover:text-[#1b4332] hover:underline"
          >
            Ver todos canteiros →
          </button>
        </div>

        {leiturasDeHoje.length === 0 ? (
          <div className="p-8 text-center bg-gray-50/80 rounded-xl border border-dashed border-gray-200">
            <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
            <p className="text-sm font-extrabold text-gray-800">Nenhuma leitura pendente para hoje</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Todas as leituras de 7 e 10 dias previstas para a data atual estão em dia ou foram realizadas.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leiturasDeHoje.map(({ amostra, leituraInfo }) => (
              <div 
                key={amostra.id}
                className="bg-amber-50/60 border border-amber-300 rounded-xl p-4 flex flex-col justify-between hover:shadow-md transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-gray-900">{amostra.protocolo}</span>
                    <span className="bg-amber-400 text-amber-950 font-black text-[10px] uppercase px-2 py-0.5 rounded-full tracking-wide">
                      🟡 LEITURA PENDENTE
                    </span>
                  </div>

                  <div className="mt-2 space-y-1">
                    <p className="text-xs font-bold text-[#1b4332]">
                      {amostra.cultura} - {amostra.cultivar}
                    </p>
                    <p className="text-xs text-gray-600">
                      Lote: <strong className="text-gray-800">{amostra.lote}</strong> • Peneira: {amostra.peneira}
                    </p>
                    <div className="pt-1 text-[11px] text-gray-600 flex flex-col gap-0.5">
                      <span>Lançamento: <strong>{formatDateBR(amostra.dataSemeadura)}</strong></span>
                      <span className="text-amber-900 font-bold">
                        {leituraInfo.is10dHoje ? 'Meta: Leitura de 10 Dias (Hoje)' : 'Meta: Leitura de 7 Dias (Hoje)'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-amber-200 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => onNavigateToAvaliacao(amostra.id)}
                    className="w-full bg-[#1b4332] hover:bg-[#2d6a4f] text-white py-2 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    <span>Realizar Leitura Agora</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SEÇÃO 2: PRÓXIMAS LEITURAS */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#2d6a4f]" />
              PRÓXIMAS LEITURAS
            </h3>
            <p className="text-xs text-gray-500">
              Cronograma automático de leituras de 7 e 10 dias calculado a partir do lançamento
            </p>
          </div>
          
          <span className="text-xs font-semibold text-gray-500">
            Total monitorado: {proximasLeituras.length} amostras
          </span>
        </div>

        {proximasLeituras.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Sprout className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-gray-700">Nenhuma amostra registrada</p>
            <p className="text-xs text-gray-500 mt-1">Cadastre uma nova amostra para iniciar o acompanhamento.</p>
          </div>
        ) : (
          <>
            {/* Tabela de Próximas Leituras (Desktop) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-[#1b4332] text-white uppercase text-[11px] tracking-wider font-bold">
                  <tr>
                    <th className="py-3 px-3">Protocolo</th>
                    <th className="py-3 px-3">Cultura</th>
                    <th className="py-3 px-3">Lote</th>
                    <th className="py-3 px-3">Data de Lançamento</th>
                    <th className="py-3 px-3">Leitura 7 Dias</th>
                    <th className="py-3 px-3">Leitura 10 Dias</th>
                    <th className="py-3 px-3">Previsão / Prazo</th>
                    <th className="py-3 px-3">Status da Leitura</th>
                    <th className="py-3 px-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {proximasLeituras.slice(0, 10).map(({ amostra, avaliacao, leituraInfo }) => {
                    return (
                      <tr key={amostra.id} className="hover:bg-gray-50 transition-colors">
                        
                        <td className="py-3 px-3 font-extrabold text-gray-900">
                          {amostra.protocolo}
                        </td>

                        <td className="py-3 px-3">
                          <p className="font-bold text-gray-900">{amostra.cultura}</p>
                          <p className="text-[10px] text-gray-500">{amostra.cultivar}</p>
                        </td>

                        <td className="py-3 px-3 font-semibold text-gray-800">
                          {amostra.lote}
                        </td>

                        <td className="py-3 px-3 font-medium text-gray-700">
                          {formatDateBR(amostra.dataSemeadura)}
                        </td>

                        <td className="py-3 px-3 font-semibold text-[#1b4332]">
                          <div className="flex items-center gap-1">
                            <span>{formatDateBR(leituraInfo.data7d)}</span>
                            {leituraInfo.leitura7dRealizada && (
                              <span title="Leitura de 7 dias realizada"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /></span>
                            )}
                          </div>
                          {amostra.plantulasEmergidas7dias !== undefined && (
                            <span className="text-[10px] text-emerald-800 font-extrabold bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                              {amostra.plantulasEmergidas7dias} emergidas
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 font-semibold text-[#1b4332]">
                          <div className="flex items-center gap-1">
                            <span>{formatDateBR(leituraInfo.data10d)}</span>
                            {leituraInfo.leitura10dRealizada && (
                              <span title="Leitura de 10 dias realizada"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /></span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          {leituraInfo.statusGeral === 'LEITURA_10D_REALIZADA' ? (
                            <span className="text-emerald-700 font-bold text-[11px]">Finalizado</span>
                          ) : leituraInfo.statusGeral === 'PENDENTE_HOJE' ? (
                            <span className="text-amber-800 font-black text-[11px] bg-amber-100 px-2 py-0.5 rounded">Hoje!</span>
                          ) : leituraInfo.statusGeral === 'ATRASADA' ? (
                            <span className="text-rose-700 font-black text-[11px] bg-rose-100 px-2 py-0.5 rounded">
                              {Math.abs(leituraInfo.diasParaProximaLeitura)}d atrasada
                            </span>
                          ) : (
                            <span className="text-gray-700 font-semibold text-[11px]">
                              Faltam {leituraInfo.diasParaProximaLeitura} {leituraInfo.diasParaProximaLeitura === 1 ? 'dia' : 'dias'}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          {leituraInfo.statusGeral === 'PENDENTE_HOJE' ? (
                            <span className="inline-flex items-center gap-1 bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full font-black text-[10px] uppercase">
                              🟡 LEITURA PENDENTE
                            </span>
                          ) : leituraInfo.statusGeral === 'LEITURA_10D_REALIZADA' ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold text-[10px] uppercase">
                              🟢 LEITURA DE 10 DIAS REALIZADA
                            </span>
                          ) : leituraInfo.statusGeral === 'LEITURA_7D_REALIZADA' ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold text-[10px] uppercase">
                              🟢 LEITURA DE 7 DIAS REALIZADA
                            </span>
                          ) : leituraInfo.statusGeral === 'ATRASADA' ? (
                            <span className="inline-flex items-center gap-1 bg-rose-600 text-white px-2 py-0.5 rounded-full font-black text-[10px] uppercase">
                              🔴 LEITURA ATRASADA
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-medium text-[10px]">
                              AGUARDANDO ({leituraInfo.diasParaProximaLeitura}d)
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => onNavigateToAvaliacao(amostra.id)}
                            className="px-2.5 py-1 bg-[#1b4332] hover:bg-[#2d6a4f] text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                          >
                            Avaliar
                          </button>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Visualização em Cards (Mobile) */}
            <div className="md:hidden space-y-3">
              {proximasLeituras.slice(0, 8).map(({ amostra, leituraInfo }) => (
                <div key={amostra.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-gray-900">{amostra.protocolo}</span>
                    {leituraInfo.statusGeral === 'PENDENTE_HOJE' ? (
                      <span className="bg-amber-400 text-amber-950 font-black text-[10px] px-2 py-0.5 rounded-full">
                        🟡 LEITURA PENDENTE
                      </span>
                    ) : leituraInfo.statusGeral === 'LEITURA_10D_REALIZADA' ? (
                      <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2 py-0.5 rounded-full">
                        🟢 LEITURA 10D REALIZADA
                      </span>
                    ) : leituraInfo.statusGeral === 'LEITURA_7D_REALIZADA' ? (
                      <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2 py-0.5 rounded-full">
                        🟢 LEITURA 7D REALIZADA
                      </span>
                    ) : leituraInfo.statusGeral === 'ATRASADA' ? (
                      <span className="bg-rose-600 text-white font-black text-[10px] px-2 py-0.5 rounded-full">
                        🔴 LEITURA ATRASADA
                      </span>
                    ) : (
                      <span className="bg-gray-200 text-gray-700 font-medium text-[10px] px-2 py-0.5 rounded-full">
                        Faltam {leituraInfo.diasParaProximaLeitura} dias
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-bold text-[#2d6a4f]">{amostra.cultura} - {amostra.cultivar} (Lote: {amostra.lote})</p>
                  
                  <div className="grid grid-cols-3 gap-1 text-[11px] bg-white p-2 rounded-lg border border-gray-100">
                    <div>
                      <span className="text-gray-400 block text-[10px]">Lançamento:</span>
                      <strong className="text-gray-800">{formatDateBR(amostra.dataSemeadura)}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Leitura 7d:</span>
                      <strong className="text-[#1b4332]">{formatDateBR(leituraInfo.data7d)}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Leitura 10d:</span>
                      <strong className="text-[#1b4332]">{formatDateBR(leituraInfo.data10d)}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onNavigateToAvaliacao(amostra.id)}
                    className="w-full bg-[#1b4332] text-white py-1.5 rounded-lg text-xs font-bold text-center"
                  >
                    Avaliar Amostra
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Realtime KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total de Amostras */}
        <div 
          onClick={() => onNavigateToCanteiros()}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Total Amostras</span>
            <div className="p-2.5 rounded-xl bg-[#d8f3dc] text-[#1b4332] group-hover:scale-110 transition-transform">
              <Sprout className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2">{stats.totalAmostras}</p>
          <span className="text-xs text-[#2d6a4f] font-medium flex items-center gap-1 mt-1">
            Ver todas as amostras →
          </span>
        </div>

        {/* Amostras Pendentes */}
        <div 
          onClick={() => onNavigateToCanteiros('Pendente')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Amostras Pendentes</span>
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700 group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-amber-600 mt-2">{stats.amostrasPendentes}</p>
          <span className="text-xs text-amber-700 font-medium flex items-center gap-1 mt-1">
            Agilização em campo →
          </span>
        </div>

        {/* Amostras Concluídas */}
        <div 
          onClick={() => onNavigateToCanteiros('Concluído')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Amostras Concluídas</span>
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-700 mt-2">{stats.amostrasConcluidas}</p>
          <span className="text-xs text-emerald-700 font-medium flex items-center gap-1 mt-1">
            Laudos prontos →
          </span>
        </div>

        {/* Germinação Média (%) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Germinação Média</span>
            <div className="p-2.5 rounded-xl bg-[#2d6a4f]/10 text-[#2d6a4f]">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#1b4332] mt-2">{stats.germinacaoMedia}%</p>
          <span className="text-xs text-gray-500 font-medium mt-1 block">
            Média de todos canteiros
          </span>
        </div>

      </div>

      {/* Secondary Metrics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex items-center space-x-3">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Média de Germinação</p>
            <p className="text-lg font-bold text-emerald-800">{stats.germinacaoMedia}%</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex items-center space-x-3">
          <div className="p-3 bg-purple-50 text-purple-700 rounded-lg">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Média de Plantas Anormais</p>
            <p className="text-lg font-bold text-purple-900">{stats.mediaPlantasAnormais}%</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex items-center space-x-3">
          <div className="p-3 bg-rose-50 text-rose-700 rounded-lg">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Média de Plantas Mortas</p>
            <p className="text-lg font-bold text-rose-900">{stats.mediaPlantasMortas}%</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex items-center space-x-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Média de Plantas Fortes</p>
            <p className="text-lg font-bold text-gray-800">{stats.mediaPlantasFortes}%</p>
          </div>
        </div>

      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gráfico 1: Germinação por Cultura vs Exigido */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <Sprout className="w-5 h-5 text-[#2d6a4f]" />
              Germinação Média x Mínimo por Cultura
            </h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barDataGerminacao}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="cultura" stroke="#6b7280" fontSize={12} />
                <YAxis domain={[0, 100]} stroke="#6b7280" fontSize={12} unit="%" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  formatter={(val: any) => [`${val}%`]}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Bar dataKey="Germinação Média (%)" fill="#2d6a4f" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Mínimo Exigido (%)" fill="#94a3b8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Distribuição por Cultura */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <Filter className="w-5 h-5 text-[#2d6a4f]" />
              Distribuição de Amostras por Cultura
            </h3>
          </div>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieDataCultura}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {pieDataCultura.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CULTURA_COLORS[index % CULTURA_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [`${value} amostras`, 'Amostras']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Gráfico 3: Evolução das Avaliações */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#2d6a4f]" />
          Evolução do Volume de Avaliações no Período
        </h3>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineDataEvolucao}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="data" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
              <Line 
                type="monotone" 
                dataKey="Avaliações Realizadas" 
                stroke="#2d6a4f" 
                strokeWidth={3} 
                dot={{ fill: '#1b4332', r: 5 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};
