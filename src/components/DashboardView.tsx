import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { PlusCircle, Sprout, Clock, CheckCircle2, Award, HeartPulse, AlertOctagon, TrendingUp, Filter } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend 
} from 'recharts';

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
      // Formata data YYYY-MM-DD para DD/MM
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
            Painel Geral CQ
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight">
            Controle de Qualidade em Tempo Real
          </h2>
          <p className="text-[#b7e4c7] text-sm mt-1 max-w-xl">
            Acompanhe o desempenho de germinação dos canteiros de sementes e realize contagens em segundos.
          </p>
        </div>

        <button
          id="dash-btn-nova-amostra"
          onClick={onNewSample}
          className="flex items-center gap-2 bg-[#d8f3dc] hover:bg-white text-[#1b4332] font-bold px-5 py-3 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-sm sm:text-base whitespace-nowrap"
        >
          <PlusCircle className="w-5 h-5 text-[#2d6a4f]" />
          <span>+ Nova Amostra</span>
        </button>
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

      {/* Amostras Pendentes de Avaliação (Campo Rápido) */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">Amostras Aguardando Avaliação</h3>
            <p className="text-xs text-gray-500">Acesse diretamente para iniciar a leitura no canteiro</p>
          </div>
          <button 
            onClick={() => onNavigateToCanteiros('Pendente')}
            className="text-xs font-semibold text-[#2d6a4f] hover:underline"
          >
            Ver todas pendentes ({stats.amostrasPendentes})
          </button>
        </div>

        {amostras.filter(a => a.status === 'Pendente').length === 0 ? (
          <div className="p-8 text-center bg-gray-50 rounded-xl">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-700">Todas as amostras foram avaliadas!</p>
            <p className="text-xs text-gray-500 mt-0.5">Cadastre uma nova amostra para continuar o controle.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {amostras.filter(a => a.status === 'Pendente').slice(0, 3).map(amostra => (
              <div 
                key={amostra.id}
                onClick={() => onNavigateToAvaliacao(amostra.id)}
                className="p-4 border border-amber-200 bg-amber-50/50 rounded-xl hover:border-amber-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-gray-900">{amostra.protocolo}</span>
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      PENDENTE
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-[#2d6a4f] mt-1">{amostra.cultura} - {amostra.cultivar}</p>
                  <p className="text-xs text-gray-600 mt-0.5">Lote: {amostra.lote} | Peneira: {amostra.peneira}</p>
                </div>
                
                <div className="mt-3 pt-2 border-t border-amber-200/60 flex items-center justify-between text-xs font-bold text-amber-900">
                  <span>Avaliar Canteiro</span>
                  <span>→</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
