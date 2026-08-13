import React, { useState, useEffect } from 'react';
import { Amostra, Avaliacao, Usuario } from '../types';
import { storageService } from '../services/storageService';
import { exportService } from '../services/exportService';
import { FotoManager } from './FotoManager';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { ToastNotification, ToastMessage } from './ToastNotification';
import { 
  ArrowLeft, CheckCircle2, AlertTriangle, Save, FileText, 
  Plus, Minus, Clock, ShieldCheck, ShieldAlert, Award, Camera, Sprout, Trash2 
} from 'lucide-react';

interface AvaliacaoViewProps {
  amostraId: string;
  currentUser: Usuario;
  onBack: () => void;
}

export const AvaliacaoView: React.FC<AvaliacaoViewProps> = ({
  amostraId,
  currentUser,
  onBack,
}) => {
  const amostra = storageService.getAmostraById(amostraId);
  const existingAvaliacao = storageService.getAvaliacaoByAmostraId(amostraId);

  // Se já existe avaliação, inicializa com ela
  const [fortes, setFortes] = useState<number>(existingAvaliacao ? existingAvaliacao.fortes : 70);
  const [intermediarias, setIntermediarias] = useState<number>(existingAvaliacao ? existingAvaliacao.intermediarias : 12);
  const [fracas, setFracas] = useState<number>(existingAvaliacao ? existingAvaliacao.fracas : 6);
  const [anormais, setAnormais] = useState<number>(existingAvaliacao ? (existingAvaliacao.anormais ?? 4) : 4);
  const [mortas, setMortas] = useState<number>(existingAvaliacao ? existingAvaliacao.mortas : 8);
  const [observacoes, setObservacoes] = useState<string>(existingAvaliacao ? existingAvaliacao.observacoes : '');

  const [isSaved, setIsSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'contagem' | 'fotos'>('contagem');

  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  if (!amostra) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600 font-bold">Amostra não encontrada.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-[#1b4332] text-white rounded-xl">
          Voltar
        </button>
      </div>
    );
  }

  // Cálculos Automáticos
  const totalContado = fortes + intermediarias + fracas + anormais + mortas;
  const isExact100 = totalContado === 100;

  const totalGerminado = fortes + intermediarias + fracas;
  const percentualGerminacao = totalGerminado; // 100 sementes por amostra -> soma = % direto
  const percentualAnormais = anormais;
  const percentualMortas = mortas;

  // Aprovação Automática
  const minGermina = storageService.getMinGerminationForCultura(amostra.cultura);
  const isAprovado = percentualGerminacao >= minGermina;

  const handleSave = async () => {
    if (totalContado !== 100) {
      if (totalContado > 100) {
        alert('Total excede 100 sementes. Ajuste os valores antes de salvar.\nA soma de Fortes, Intermediárias, Fracas, Anormais e Mortas deve ser exatamente 100 sementes.');
      } else {
        alert(`Faltam ${100 - totalContado} sementes para completar a avaliação.\nA soma de Fortes, Intermediárias, Fracas, Anormais e Mortas deve ser exatamente 100 sementes.`);
      }
      return;
    }

    const now = new Date();
    const dataAvaliacao = now.toISOString().split('T')[0];
    const horaAvaliacao = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    await storageService.saveAvaliacao({
      amostraId: amostra.id,
      fortes,
      intermediarias,
      fracas,
      anormais,
      mortas,
      observacoes,
      dataAvaliacao,
      horaAvaliacao,
      usuarioAvaliador: currentUser.nome,
    });

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleConfirmDelete = async () => {
    if (!existingAvaliacao) return;
    setIsDeleting(true);
    try {
      const success = await storageService.deleteAvaliacao(existingAvaliacao.id);
      if (success) {
        setToast({ type: 'success', message: 'Registro excluído com sucesso.' });
        setTimeout(() => {
          onBack();
        }, 800);
      } else {
        setToast({ type: 'error', message: 'Erro ao excluir: Registro não encontrado no banco de dados.' });
      }
    } catch (error) {
      setToast({ type: 'error', message: `Erro ao excluir registro: ${error instanceof Error ? error.message : String(error)}` });
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  // Funções Auxiliares de Incremento/Decremento para Agilidade no Campo
  const updateCount = (
    setter: React.Dispatch<React.SetStateAction<number>>,
    delta: number
  ) => {
    setter(prev => Math.max(0, prev + delta));
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Top Nav & Action Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-bold text-[#1b4332] hover:text-[#2d6a4f] bg-white px-3.5 py-2 rounded-xl border border-gray-200 shadow-xs transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Lista</span>
        </button>

        <div className="flex items-center gap-2">
          {existingAvaliacao && (
            <button
              onClick={() => {
                const fotos = storageService.getFotosByAmostra(amostra.id);
                exportService.generateSamplePDF(amostra, existingAvaliacao, fotos);
              }}
              className="flex items-center gap-1.5 bg-gray-800 hover:bg-black text-white px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <FileText className="w-4 h-4 text-rose-400" />
              <span>Laudo PDF</span>
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={totalContado !== 100}
            className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs sm:text-sm font-extrabold shadow-md transition-all ${
              totalContado === 100
                ? 'bg-[#1b4332] hover:bg-[#2d6a4f] text-white active:scale-95 cursor-pointer'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
            }`}
            title={totalContado !== 100 ? 'A soma de Fortes, Intermediárias, Fracas, Anormais e Mortas deve ser exatamente 100 sementes.' : 'Salvar Avaliação'}
          >
            <Save className="w-4 h-4 text-[#74c69d]" />
            <span>Salvar Avaliação</span>
          </button>
        </div>
      </div>

      {/* Alerta de Sucesso */}
      {isSaved && (
        <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between animate-bounce">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-[#d8f3dc]" />
            <span className="font-bold text-sm">Avaliação de Canteiro Salva com Sucesso! Status = Concluído.</span>
          </div>
        </div>
      )}

      {/* Cartão de Identificação do Canteiro */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-gray-900">{amostra.protocolo}</span>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                amostra.status === 'Concluído' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {amostra.status.toUpperCase()}
              </span>
            </div>
            <p className="text-sm font-bold text-[#2d6a4f] mt-0.5">
              Cultura: {amostra.cultura} | Cultivar: {amostra.cultivar}
            </p>
          </div>

          <div className="text-left sm:text-right text-xs text-gray-500">
            <p><span className="font-semibold text-gray-700">Semeadura:</span> {new Date(amostra.dataSemeadura + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
            <p><span className="font-semibold text-gray-700">Responsável:</span> {amostra.responsavel}</p>
          </div>
        </div>

        {/* Tabela de Metadados em Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-gray-50 p-3 rounded-xl border border-gray-100">
          <div><span className="text-gray-500 font-medium">Nº do Lote:</span> <p className="font-bold text-gray-900">{amostra.lote}</p></div>
          <div><span className="text-gray-500 font-medium">Peneira:</span> <p className="font-bold text-gray-900">{amostra.peneira}</p></div>
          <div><span className="text-gray-500 font-medium">Categoria:</span> <p className="font-bold text-gray-900">{amostra.categoria}</p></div>
          <div><span className="text-gray-500 font-medium">Safra:</span> <p className="font-bold text-gray-900">{amostra.safra}</p></div>
          <div><span className="text-gray-500 font-medium">Matriz / TSI:</span> <p className="font-bold text-gray-900">{amostra.tsiMatriz || 'Padrão TSI'}</p></div>
          <div><span className="text-gray-500 font-medium">Leitura 7 dias:</span> <p className="font-bold text-gray-900">{amostra.dataLeitura7dias ? new Date(amostra.dataLeitura7dias + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}</p></div>
          <div><span className="text-gray-500 font-medium">Leitura 10 dias:</span> <p className="font-bold text-gray-900">{amostra.dataLeitura10dias ? new Date(amostra.dataLeitura10dias + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}</p></div>
          <div><span className="text-gray-500 font-medium">Germinação:</span> <p className="font-bold text-[#1b4332]">{percentualGerminacao}%</p></div>
        </div>
      </div>

      {/* Tab Selector: Contagem x Fotos */}
      <div className="flex bg-gray-200 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('contagem')}
          className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'contagem' ? 'bg-[#1b4332] text-white shadow-sm' : 'text-gray-700 hover:text-black'
          }`}
        >
          <Sprout className="w-4 h-4" />
          <span>Contagem de Plântulas</span>
        </button>

        <button
          onClick={() => setActiveTab('fotos')}
          className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'fotos' ? 'bg-[#1b4332] text-white shadow-sm' : 'text-gray-700 hover:text-black'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Registro Fotográfico</span>
        </button>
      </div>

      {/* CONTEÚDO TAB 1: LEITURA DE GERMINAÇÃO */}
      {activeTab === 'contagem' && (
        <div className="space-y-6">
          
          {/* BANNER DE VALIDAÇÃO E CONTADOR EM TEMPO REAL (REGRA 100 SEMENTES) */}
          <div className={`p-4 rounded-2xl border-2 transition-all shadow-sm ${
            isExact100
              ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
              : totalContado > 100
              ? 'bg-rose-50 border-rose-400 text-rose-950'
              : 'bg-amber-50 border-amber-400 text-amber-950'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-2xl shrink-0 shadow-xs ${
                  isExact100 ? 'bg-emerald-600 text-white' : totalContado > 100 ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
                }`}>
                  {isExact100 ? '✅' : '❌'}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-gray-700">Contador em Tempo Real</span>
                    <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${
                      isExact100
                        ? 'bg-emerald-200 border-emerald-300 text-emerald-900'
                        : totalContado > 100
                        ? 'bg-rose-200 border-rose-300 text-rose-900'
                        : 'bg-amber-200 border-amber-300 text-amber-900'
                    }`}>
                      Total Contabilizado: {totalContado} / 100
                    </span>
                  </div>

                  <p className="text-sm font-black mt-1">
                    {isExact100 && `Total: 100/100 ✅ — Germinação = ${percentualGerminacao}% | Anormais = ${percentualAnormais}% | Mortas = ${percentualMortas}%`}
                    {totalContado > 100 && `Total excede 100 sementes. Ajuste os valores antes de salvar.`}
                    {totalContado < 100 && `Faltam ${100 - totalContado} sementes para completar a avaliação.`}
                  </p>
                  
                  {!isExact100 && (
                    <p className="text-xs font-semibold text-gray-600 mt-0.5">
                      A soma de Fortes, Intermediárias, Fracas, Anormais e Mortas deve ser exatamente 100 sementes.
                    </p>
                  )}
                </div>
              </div>

              {!isExact100 && (
                <div className="text-xs font-bold text-rose-700 bg-white/90 border border-rose-200 px-3 py-1.5 rounded-xl shrink-0">
                  Salvar Deshabilitado
                </div>
              )}
            </div>
          </div>

          {/* PAINEL DE CÁLCULO E RESULTADO EM TEMPO REAL */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            
            {/* Germinação % */}
            <div className="bg-[#1b4332] text-white p-3.5 rounded-2xl shadow-md text-center flex flex-col justify-between">
              <span className="text-[11px] font-bold text-[#b7e4c7] uppercase tracking-wider block">Germinação</span>
              <p className="text-3xl font-black text-[#d8f3dc] my-0.5">{percentualGerminacao}%</p>
              <span className="text-[10px] text-[#b7e4c7] block">Fortes ({fortes}) + Interm. ({intermediarias}) + Fracas ({fracas})</span>
            </div>

            {/* Anormais % */}
            <div className="bg-purple-900 text-white p-3.5 rounded-2xl shadow-md text-center flex flex-col justify-between">
              <span className="text-[11px] font-bold text-purple-200 uppercase tracking-wider block">Anormais</span>
              <p className="text-3xl font-black text-purple-100 my-0.5">{percentualAnormais}%</p>
              <span className="text-[10px] text-purple-200 block">Plântulas Anormais ({anormais})</span>
            </div>

            {/* Mortas % */}
            <div className="bg-rose-950 text-white p-3.5 rounded-2xl shadow-md text-center flex flex-col justify-between">
              <span className="text-[11px] font-bold text-rose-200 uppercase tracking-wider block">Mortas</span>
              <p className="text-3xl font-black text-rose-100 my-0.5">{percentualMortas}%</p>
              <span className="text-[10px] text-rose-200 block">Sementes / Plântulas Mortas ({mortas})</span>
            </div>

            {/* Status Aprovação Automática */}
            <div className={`p-3.5 rounded-2xl border shadow-sm flex flex-col items-center justify-between text-center ${
              isAprovado 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                : 'bg-rose-50 border-rose-300 text-rose-950'
            }`}>
              <span className="text-[11px] font-extrabold uppercase tracking-wider block">Resultado CQ</span>
              <div className="flex items-center gap-1 font-black text-lg my-0.5">
                {isAprovado ? (
                  <>
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <span>APROVADO</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-5 h-5 text-rose-600" />
                    <span>REPROVADO</span>
                  </>
                )}
              </div>
              <span className="text-[10px] font-semibold text-gray-600 block">Mínimo ({amostra.cultura}): {minGermina}%</span>
            </div>

          </div>

          {/* CAMPOS NUMÉRICOS DE LEITURA (CAMPO RÁPIDO) */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-5">
            <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-2">
              Leitura de Canteiro (5 Categorias)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* 1. Plantas Fortes */}
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-sm text-emerald-950">Fortes</label>
                  <span className="text-xs font-bold text-emerald-800">Vigorosas</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateCount(setFortes, -1)}
                    className="w-11 h-11 bg-white border border-emerald-300 rounded-xl font-black text-lg text-emerald-900 hover:bg-emerald-100 active:scale-95 transition-all shadow-xs"
                  >
                    -
                  </button>

                  <input
                    type="number"
                    value={fortes}
                    onChange={(e) => setFortes(Math.max(0, Number(e.target.value) || 0))}
                    className="flex-1 bg-white border-2 border-emerald-400 rounded-xl py-2 text-center text-2xl font-black text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />

                  <button
                    type="button"
                    onClick={() => updateCount(setFortes, 1)}
                    className="w-11 h-11 bg-emerald-700 text-white rounded-xl font-black text-lg hover:bg-emerald-800 active:scale-95 transition-all shadow-xs"
                  >
                    +
                  </button>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-[11px] pt-1">
                  <button type="button" onClick={() => updateCount(setFortes, 5)} className="px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded font-bold">+5</button>
                  <button type="button" onClick={() => updateCount(setFortes, 10)} className="px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded font-bold">+10</button>
                </div>
              </div>

              {/* 2. Plantas Intermediárias */}
              <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-sm text-amber-950">Intermediárias</label>
                  <span className="text-xs font-bold text-amber-800">Desenvolvimento Médio</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateCount(setIntermediarias, -1)}
                    className="w-11 h-11 bg-white border border-amber-300 rounded-xl font-black text-lg text-amber-900 hover:bg-amber-100 active:scale-95 transition-all shadow-xs"
                  >
                    -
                  </button>

                  <input
                    type="number"
                    value={intermediarias}
                    onChange={(e) => setIntermediarias(Math.max(0, Number(e.target.value) || 0))}
                    className="flex-1 bg-white border-2 border-amber-400 rounded-xl py-2 text-center text-2xl font-black text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-600"
                  />

                  <button
                    type="button"
                    onClick={() => updateCount(setIntermediarias, 1)}
                    className="w-11 h-11 bg-amber-600 text-white rounded-xl font-black text-lg hover:bg-amber-700 active:scale-95 transition-all shadow-xs"
                  >
                    +
                  </button>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-[11px] pt-1">
                  <button type="button" onClick={() => updateCount(setIntermediarias, 5)} className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded font-bold">+5</button>
                </div>
              </div>

              {/* 3. Plantas Fracas */}
              <div className="p-4 bg-orange-50/60 border border-orange-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-sm text-orange-950">Fracas</label>
                  <span className="text-xs font-bold text-orange-800">Anãs / Tardias</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateCount(setFracas, -1)}
                    className="w-11 h-11 bg-white border border-orange-300 rounded-xl font-black text-lg text-orange-900 hover:bg-orange-100 active:scale-95 transition-all shadow-xs"
                  >
                    -
                  </button>

                  <input
                    type="number"
                    value={fracas}
                    onChange={(e) => setFracas(Math.max(0, Number(e.target.value) || 0))}
                    className="flex-1 bg-white border-2 border-orange-400 rounded-xl py-2 text-center text-2xl font-black text-orange-950 focus:outline-none focus:ring-2 focus:ring-orange-600"
                  />

                  <button
                    type="button"
                    onClick={() => updateCount(setFracas, 1)}
                    className="w-11 h-11 bg-orange-600 text-white rounded-xl font-black text-lg hover:bg-orange-700 active:scale-95 transition-all shadow-xs"
                  >
                    +
                  </button>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-[11px] pt-1">
                  <button type="button" onClick={() => updateCount(setFracas, 5)} className="px-2 py-0.5 bg-orange-200 text-orange-900 rounded font-bold">+5</button>
                </div>
              </div>

              {/* 4. Plantas Anormais */}
              <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-sm text-purple-950">Anormais</label>
                  <span className="text-xs font-bold text-purple-800">Deformadas / Lesionadas</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateCount(setAnormais, -1)}
                    className="w-11 h-11 bg-white border border-purple-300 rounded-xl font-black text-lg text-purple-900 hover:bg-purple-100 active:scale-95 transition-all shadow-xs"
                  >
                    -
                  </button>

                  <input
                    type="number"
                    value={anormais}
                    onChange={(e) => setAnormais(Math.max(0, Number(e.target.value) || 0))}
                    className="flex-1 bg-white border-2 border-purple-400 rounded-xl py-2 text-center text-2xl font-black text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />

                  <button
                    type="button"
                    onClick={() => updateCount(setAnormais, 1)}
                    className="w-11 h-11 bg-purple-700 text-white rounded-xl font-black text-lg hover:bg-purple-800 active:scale-95 transition-all shadow-xs"
                  >
                    +
                  </button>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-[11px] pt-1">
                  <button type="button" onClick={() => updateCount(setAnormais, 5)} className="px-2 py-0.5 bg-purple-200 text-purple-900 rounded font-bold">+5</button>
                </div>
              </div>

              {/* 5. Plantas / Sementes Mortas */}
              <div className="p-4 bg-rose-50/60 border border-rose-200 rounded-2xl space-y-2 sm:col-span-2 lg:col-span-1">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-sm text-rose-950">Mortas</label>
                  <span className="text-xs font-bold text-rose-800">Duras / Apodrecidas</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateCount(setMortas, -1)}
                    className="w-11 h-11 bg-white border border-rose-300 rounded-xl font-black text-lg text-rose-900 hover:bg-rose-100 active:scale-95 transition-all shadow-xs"
                  >
                    -
                  </button>

                  <input
                    type="number"
                    value={mortas}
                    onChange={(e) => setMortas(Math.max(0, Number(e.target.value) || 0))}
                    className="flex-1 bg-white border-2 border-rose-400 rounded-xl py-2 text-center text-2xl font-black text-rose-950 focus:outline-none focus:ring-2 focus:ring-rose-600"
                  />

                  <button
                    type="button"
                    onClick={() => updateCount(setMortas, 1)}
                    className="w-11 h-11 bg-rose-600 text-white rounded-xl font-black text-lg hover:bg-rose-700 active:scale-95 transition-all shadow-xs"
                  >
                    +
                  </button>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-[11px] pt-1">
                  <button type="button" onClick={() => updateCount(setMortas, 5)} className="px-2 py-0.5 bg-rose-200 text-rose-900 rounded font-bold">+5</button>
                </div>
              </div>

            </div>

            {/* Observações da Avaliação */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Observações Técnicas do Avaliador
              </label>
              <textarea
                rows={3}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Descreva sintomas visuais (ex: lesões por fungos, torções radiculares, umidade da areia)..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
              />
            </div>

            {/* Metadados Automáticos de Auditoria */}
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex flex-wrap items-center justify-between text-xs text-gray-600 gap-2">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>Registro automático: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="font-semibold text-gray-800">
                Avaliador: {currentUser.nome}
              </div>
            </div>

            {/* Botão de Ação Salvar Avaliação no Rodapé do Form */}
            <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className={`text-xs font-extrabold ${isExact100 ? 'text-emerald-800' : 'text-rose-700'}`}>
                {isExact100 
                  ? '✅ Total de 100 sementes contabilizado! Pronto para salvar.' 
                  : `⚠️ ${totalContado > 100 ? 'Total excede 100 sementes.' : `Faltam ${100 - totalContado} sementes.`} Ajuste a soma para habilitar o salvamento.`}
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {existingAvaliacao && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Excluir esta avaliação"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>Excluir Avaliação</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!isExact100}
                  className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold shadow-md transition-all flex items-center justify-center gap-2 ${
                    isExact100
                      ? 'bg-[#1b4332] hover:bg-[#2d6a4f] text-white cursor-pointer active:scale-95'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
                  }`}
                >
                  <Save className="w-4 h-4 text-[#74c69d]" />
                  <span>Salvar Avaliação</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* CONTEÚDO TAB 2: REGISTRO DE FOTOS */}
      {activeTab === 'fotos' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">Fotos Anexadas ao Canteiro</h3>
            <p className="text-xs text-gray-500">Tire fotos diretamente do celular ou selecione da galeria para comprovação do laudo.</p>
          </div>

          <FotoManager amostraId={amostra.id} />
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        itemName={`Avaliação de ${amostra.protocolo}`}
        title="Excluir Avaliação de Canteiro"
        message="Tem certeza que deseja excluir este registro?"
        isDeleting={isDeleting}
        onCancel={() => setShowDeleteModal(false)}
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
