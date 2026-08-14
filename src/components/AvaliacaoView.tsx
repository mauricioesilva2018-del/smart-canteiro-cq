import React, { useState, useEffect } from 'react';
import { Amostra, Avaliacao, Usuario } from '../types';
import { storageService } from '../services/storageService';
import { exportService } from '../services/exportService';
import { FotoManager } from './FotoManager';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { ConfirmActionModal } from './ConfirmActionModal';
import { ToastNotification, ToastMessage } from './ToastNotification';
import { 
  ArrowLeft, CheckCircle2, AlertTriangle, Save, FileText, 
  Plus, Minus, Clock, ShieldCheck, ShieldAlert, Award, Camera, Sprout, Trash2,
  CheckCheck, X
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
  const [amostra, setAmostra] = useState<Amostra | undefined>(() => storageService.getAmostraById(amostraId));
  const [existingAvaliacao, setExistingAvaliacao] = useState<Avaliacao | undefined>(() => storageService.getAvaliacaoByAmostraId(amostraId));

  // Valores Iniciais
  const initialFortes = existingAvaliacao ? existingAvaliacao.fortes : 70;
  const initialIntermediarias = existingAvaliacao ? existingAvaliacao.intermediarias : 12;
  const initialFracas = existingAvaliacao ? existingAvaliacao.fracas : 6;
  const initialAnormais = existingAvaliacao ? (existingAvaliacao.anormais ?? 4) : 4;
  const initialMortas = existingAvaliacao ? existingAvaliacao.mortas : 8;
  const initialObservacoes = existingAvaliacao ? existingAvaliacao.observacoes : '';

  // Estados dos Campos de Contagem
  const [fortes, setFortes] = useState<number>(initialFortes);
  const [intermediarias, setIntermediarias] = useState<number>(initialIntermediarias);
  const [fracas, setFracas] = useState<number>(initialFracas);
  const [anormais, setAnormais] = useState<number>(initialAnormais);
  const [mortas, setMortas] = useState<number>(initialMortas);
  const [observacoes, setObservacoes] = useState<string>(initialObservacoes);

  // Estados de UI e Controle
  const [activeTab, setActiveTab] = useState<'contagem' | 'fotos'>('contagem');
  const [isSaving, setIsSaving] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modais de Confirmação
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);
  const [showFinalizeConfirmModal, setShowFinalizeConfirmModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Notificações Toast
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Sincronizar com mudanças de dados externos
  useEffect(() => {
    const unsub = storageService.subscribe(() => {
      const updatedAmostra = storageService.getAmostraById(amostraId);
      if (updatedAmostra) setAmostra(updatedAmostra);
      const updatedAval = storageService.getAvaliacaoByAmostraId(amostraId);
      if (updatedAval) setExistingAvaliacao(updatedAval);
    });
    return () => unsub();
  }, [amostraId]);

  if (!amostra) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
        <p className="text-gray-700 font-bold text-base">Amostra de Canteiro não encontrada.</p>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onBack();
          }}
          className="mt-4 px-5 py-2.5 bg-[#1b4332] hover:bg-[#2d6a4f] text-white font-bold text-sm rounded-xl transition-all shadow-sm"
        >
          Voltar para Lista
        </button>
      </div>
    );
  }

  // Verificação de Alterações / Dados Preenchidos
  const hasChanges = (
    fortes !== initialFortes ||
    intermediarias !== initialIntermediarias ||
    fracas !== initialFracas ||
    anormais !== initialAnormais ||
    mortas !== initialMortas ||
    observacoes !== initialObservacoes
  );

  const hasAnyData = (fortes > 0 || intermediarias > 0 || fracas > 0 || anormais > 0 || mortas > 0 || observacoes.trim().length > 0);

  // Cálculos Automáticos de Germinação
  const totalContado = fortes + intermediarias + fracas + anormais + mortas;
  const isExact100 = totalContado === 100;

  const totalGerminado = fortes + intermediarias + fracas;
  const percentualGerminacao = totalGerminado;
  const percentualAnormais = anormais;
  const percentualMortas = mortas;

  // Aprovação Automática com Base na Cultura
  const minGermina = storageService.getMinGerminationForCultura(amostra.cultura);
  const isAprovado = percentualGerminacao >= minGermina;

  // Manipulador de Incremento/Decremento Seguro
  const updateCount = (
    setter: React.Dispatch<React.SetStateAction<number>>,
    delta: number
  ) => {
    setter(prev => Math.max(0, (Number(prev) || 0) + delta));
  };

  // Tratar Clique em Cancelar / Voltar com Confirmação
  const handleBackRequest = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (hasChanges && hasAnyData) {
      setShowCancelConfirmModal(true);
    } else {
      onBack();
    }
  };

  // Salvar Avaliação no Firestore (sem sair da tela)
  const handleSaveDraft = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!isExact100) {
      if (totalContado > 100) {
        setToast({
          type: 'error',
          message: `Total excede 100 sementes (${totalContado}/100). Ajuste os valores antes de salvar.`
        });
      } else {
        setToast({
          type: 'error',
          message: `Faltam ${100 - totalContado} sementes para completar 100. A soma das 5 categorias deve ser 100.`
        });
      }
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date();
      const dataAvaliacao = now.toISOString().split('T')[0];
      const horaAvaliacao = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      const saved = await storageService.saveAvaliacao({
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

      setExistingAvaliacao(saved);
      setToast({
        type: 'success',
        message: 'Avaliação salva com sucesso no Cloud Firestore!'
      });
    } catch (error) {
      setToast({
        type: 'error',
        message: `Erro ao salvar avaliação no Firestore: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Finalizar Avaliação (com Modal de Confirmação Obrigatório)
  const handleOpenFinalizeModal = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!isExact100) {
      setToast({
        type: 'error',
        message: `Não é possível finalizar: o total deve ser exatamente 100 sementes (atual: ${totalContado}/100).`
      });
      return;
    }

    setShowFinalizeConfirmModal(true);
  };

  const handleConfirmFinalize = async () => {
    setIsFinalizing(true);
    try {
      const now = new Date();
      const dataAvaliacao = now.toISOString().split('T')[0];
      const horaAvaliacao = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      const saved = await storageService.saveAvaliacao({
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

      setExistingAvaliacao(saved);
      setShowFinalizeConfirmModal(false);
      setToast({
        type: 'success',
        message: 'Avaliação finalizada com sucesso! Registro marcado como Concluído.'
      });

      // Retornar suavemente após feedback
      setTimeout(() => {
        onBack();
      }, 1000);
    } catch (error) {
      setToast({
        type: 'error',
        message: `Erro ao finalizar avaliação: ${error instanceof Error ? error.message : String(error)}`
      });
      setIsFinalizing(false);
      setShowFinalizeConfirmModal(false);
    }
  };

  // Excluir Avaliação
  const handleConfirmDelete = async () => {
    if (!existingAvaliacao) return;
    setIsDeleting(true);
    try {
      const success = await storageService.deleteAvaliacao(existingAvaliacao.id);
      if (success) {
        setToast({ type: 'success', message: 'Avaliação excluída com sucesso.' });
        setTimeout(() => {
          onBack();
        }, 800);
      } else {
        setToast({ type: 'error', message: 'Erro ao excluir: Registro não encontrado no Firestore.' });
      }
    } catch (error) {
      setToast({ type: 'error', message: `Erro ao excluir registro: ${error instanceof Error ? error.message : String(error)}` });
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <form 
      id="form-avaliacao-canteiro"
      onSubmit={(e) => {
        e.preventDefault();
      }}
      noValidate
      className="space-y-6 max-w-4xl mx-auto"
    >
      
      {/* Top Nav & Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleBackRequest}
          className="flex items-center gap-2 text-xs font-bold text-[#1b4332] hover:text-[#2d6a4f] bg-white px-3.5 py-2.5 rounded-xl border border-gray-200 shadow-xs transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Lista</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {existingAvaliacao && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                const fotos = storageService.getFotosByAmostra(amostra.id);
                exportService.generateSamplePDF(amostra, existingAvaliacao, fotos);
              }}
              className="flex items-center gap-1.5 bg-gray-800 hover:bg-black text-white px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <FileText className="w-4 h-4 text-rose-400" />
              <span>Laudo PDF</span>
            </button>
          )}

          {/* Botão Salvar (Mantém na tela) */}
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={!isExact100 || isSaving}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold shadow-md transition-all ${
              isExact100 && !isSaving
                ? 'bg-emerald-700 hover:bg-emerald-800 text-white active:scale-95 cursor-pointer'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-70'
            }`}
            title={!isExact100 ? 'A soma das 5 categorias deve ser exatamente 100 sementes.' : 'Salvar dados no Firestore'}
          >
            <Save className="w-4 h-4 text-emerald-200" />
            <span>{isSaving ? 'Salvando...' : 'Salvar'}</span>
          </button>

          {/* Botão Finalizar Avaliação (Com Confirmação) */}
          <button
            type="button"
            onClick={handleOpenFinalizeModal}
            disabled={!isExact100 || isFinalizing}
            className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold shadow-md transition-all ${
              isExact100 && !isFinalizing
                ? 'bg-[#1b4332] hover:bg-[#2d6a4f] text-white active:scale-95 cursor-pointer'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
            }`}
            title={!isExact100 ? 'A soma das 5 categorias deve ser exatamente 100 sementes.' : 'Finalizar e Concluir Avaliação'}
          >
            <CheckCheck className="w-4 h-4 text-[#d8f3dc]" />
            <span>Finalizar Avaliação</span>
          </button>
        </div>
      </div>

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
          <div><span className="text-gray-500 font-medium">Germinação Atual:</span> <p className="font-bold text-[#1b4332]">{percentualGerminacao}%</p></div>
        </div>
      </div>

      {/* Tab Selector: Contagem x Fotos */}
      <div className="flex bg-gray-200 p-1 rounded-xl">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('contagem');
          }}
          className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'contagem' ? 'bg-[#1b4332] text-white shadow-sm' : 'text-gray-700 hover:text-black'
          }`}
        >
          <Sprout className="w-4 h-4" />
          <span>Contagem de Plântulas</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('fotos');
          }}
          className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
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
                  Salvar Desabilitado
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
                  <label className="font-extrabold text-sm text-emerald-950">P. FORTES</label>
                  <span className="text-xs font-bold text-emerald-800">Vigorosas</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      updateCount(setFortes, -1);
                    }}
                    className="w-11 h-11 bg-white border border-emerald-300 rounded-xl font-black text-lg text-emerald-900 hover:bg-emerald-100 active:scale-95 transition-all shadow-xs cursor-pointer"
                  >
                    -
                  </button>

                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={fortes}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                    onChange={(e) => setFortes(Math.max(0, Number(e.target.value) || 0))}
                    className="flex-1 bg-white border-2 border-emerald-400 rounded-xl py-2 text-center text-2xl font-black text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />

                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      updateCount(setFortes, 1);
                    }}
                    className="w-11 h-11 bg-emerald-700 text-white rounded-xl font-black text-lg hover:bg-emerald-800 active:scale-95 transition-all shadow-xs cursor-pointer"
                  >
                    +
                  </button>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-[11px] pt-1">
                  <button 
                    type="button" 
                    onClick={(e) => { e.preventDefault(); updateCount(setFortes, 5); }} 
                    className="px-2.5 py-1 bg-emerald-200 hover:bg-emerald-300 text-emerald-900 rounded-lg font-bold transition-colors cursor-pointer"
                  >
                    +5
                  </button>
                  <button 
                    type="button" 
                    onClick={(e) => { e.preventDefault(); updateCount(setFortes, 10); }} 
                    className="px-2.5 py-1 bg-emerald-200 hover:bg-emerald-300 text-emerald-900 rounded-lg font-bold transition-colors cursor-pointer"
                  >
                    +10
                  </button>
                </div>
              </div>

              {/* 2. Plantas Intermediárias */}
              <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-sm text-amber-950">P. INTERMEDIÁRIAS</label>
                  <span className="text-xs font-bold text-amber-800">Médio Vigor</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      updateCount(setIntermediarias, -1);
                    }}
                    className="w-11 h-11 bg-white border border-amber-300 rounded-xl font-black text-lg text-amber-900 hover:bg-amber-100 active:scale-95 transition-all shadow-xs cursor-pointer"
                  >
                    -
                  </button>

                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={intermediarias}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                    onChange={(e) => setIntermediarias(Math.max(0, Number(e.target.value) || 0))}
                    className="flex-1 bg-white border-2 border-amber-400 rounded-xl py-2 text-center text-2xl font-black text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-600"
                  />

                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      updateCount(setIntermediarias, 1);
                    }}
                    className="w-11 h-11 bg-amber-600 text-white rounded-xl font-black text-lg hover:bg-amber-700 active:scale-95 transition-all shadow-xs cursor-pointer"
                  >
                    +
                  </button>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-[11px] pt-1">
                  <button 
                    type="button" 
                    onClick={(e) => { e.preventDefault(); updateCount(setIntermediarias, 5); }} 
                    className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-lg font-bold transition-colors cursor-pointer"
                  >
                    +5
                  </button>
                  <button 
                    type="button" 
                    onClick={(e) => { e.preventDefault(); updateCount(setIntermediarias, 10); }} 
                    className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-lg font-bold transition-colors cursor-pointer"
                  >
                    +10
                  </button>
                </div>
              </div>

              {/* 3. Plantas Fracas */}
              <div className="p-4 bg-orange-50/60 border border-orange-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-sm text-orange-950">P. FRACAS</label>
                  <span className="text-xs font-bold text-orange-800">Anãs / Tardias</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      updateCount(setFracas, -1);
                    }}
                    className="w-11 h-11 bg-white border border-orange-300 rounded-xl font-black text-lg text-orange-900 hover:bg-orange-100 active:scale-95 transition-all shadow-xs cursor-pointer"
                  >
                    -
                  </button>

                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={fracas}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                    onChange={(e) => setFracas(Math.max(0, Number(e.target.value) || 0))}
                    className="flex-1 bg-white border-2 border-orange-400 rounded-xl py-2 text-center text-2xl font-black text-orange-950 focus:outline-none focus:ring-2 focus:ring-orange-600"
                  />

                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      updateCount(setFracas, 1);
                    }}
                    className="w-11 h-11 bg-orange-600 text-white rounded-xl font-black text-lg hover:bg-orange-700 active:scale-95 transition-all shadow-xs cursor-pointer"
                  >
                    +
                  </button>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-[11px] pt-1">
                  <button 
                    type="button" 
                    onClick={(e) => { e.preventDefault(); updateCount(setFracas, 5); }} 
                    className="px-2.5 py-1 bg-orange-200 hover:bg-orange-300 text-orange-900 rounded-lg font-bold transition-colors cursor-pointer"
                  >
                    +5
                  </button>
                  <button 
                    type="button" 
                    onClick={(e) => { e.preventDefault(); updateCount(setFracas, 10); }} 
                    className="px-2.5 py-1 bg-orange-200 hover:bg-orange-300 text-orange-900 rounded-lg font-bold transition-colors cursor-pointer"
                  >
                    +10
                  </button>
                </div>
              </div>

              {/* 4. Plantas Anormais */}
              <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-sm text-purple-950">P. ANOMALIAS</label>
                  <span className="text-xs font-bold text-purple-800">Deformadas / Lesionadas</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      updateCount(setAnormais, -1);
                    }}
                    className="w-11 h-11 bg-white border border-purple-300 rounded-xl font-black text-lg text-purple-900 hover:bg-purple-100 active:scale-95 transition-all shadow-xs cursor-pointer"
                  >
                    -
                  </button>

                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={anormais}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                    onChange={(e) => setAnormais(Math.max(0, Number(e.target.value) || 0))}
                    className="flex-1 bg-white border-2 border-purple-400 rounded-xl py-2 text-center text-2xl font-black text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />

                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      updateCount(setAnormais, 1);
                    }}
                    className="w-11 h-11 bg-purple-700 text-white rounded-xl font-black text-lg hover:bg-purple-800 active:scale-95 transition-all shadow-xs cursor-pointer"
                  >
                    +
                  </button>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-[11px] pt-1">
                  <button 
                    type="button" 
                    onClick={(e) => { e.preventDefault(); updateCount(setAnormais, 5); }} 
                    className="px-2.5 py-1 bg-purple-200 hover:bg-purple-300 text-purple-900 rounded-lg font-bold transition-colors cursor-pointer"
                  >
                    +5
                  </button>
                  <button 
                    type="button" 
                    onClick={(e) => { e.preventDefault(); updateCount(setAnormais, 10); }} 
                    className="px-2.5 py-1 bg-purple-200 hover:bg-purple-300 text-purple-900 rounded-lg font-bold transition-colors cursor-pointer"
                  >
                    +10
                  </button>
                </div>
              </div>

              {/* 5. Plantas / Sementes Mortas */}
              <div className="p-4 bg-rose-50/60 border border-rose-200 rounded-2xl space-y-2 sm:col-span-2 lg:col-span-1">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-sm text-rose-950">P. MORTAS</label>
                  <span className="text-xs font-bold text-rose-800">Duras / Apodrecidas</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      updateCount(setMortas, -1);
                    }}
                    className="w-11 h-11 bg-white border border-rose-300 rounded-xl font-black text-lg text-rose-900 hover:bg-rose-100 active:scale-95 transition-all shadow-xs cursor-pointer"
                  >
                    -
                  </button>

                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={mortas}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                    onChange={(e) => setMortas(Math.max(0, Number(e.target.value) || 0))}
                    className="flex-1 bg-white border-2 border-rose-400 rounded-xl py-2 text-center text-2xl font-black text-rose-950 focus:outline-none focus:ring-2 focus:ring-rose-600"
                  />

                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      updateCount(setMortas, 1);
                    }}
                    className="w-11 h-11 bg-rose-600 text-white rounded-xl font-black text-lg hover:bg-rose-700 active:scale-95 transition-all shadow-xs cursor-pointer"
                  >
                    +
                  </button>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-[11px] pt-1">
                  <button 
                    type="button" 
                    onClick={(e) => { e.preventDefault(); updateCount(setMortas, 5); }} 
                    className="px-2.5 py-1 bg-rose-200 hover:bg-rose-300 text-rose-900 rounded-lg font-bold transition-colors cursor-pointer"
                  >
                    +5
                  </button>
                  <button 
                    type="button" 
                    onClick={(e) => { e.preventDefault(); updateCount(setMortas, 10); }} 
                    className="px-2.5 py-1 bg-rose-200 hover:bg-rose-300 text-rose-900 rounded-lg font-bold transition-colors cursor-pointer"
                  >
                    +10
                  </button>
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

            {/* Barra de Ações no Rodapé do Form */}
            <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className={`text-xs font-extrabold ${isExact100 ? 'text-emerald-800' : 'text-rose-700'}`}>
                {isExact100 
                  ? '✅ Total de 100 sementes contabilizado! Pronto para salvar ou finalizar.' 
                  : `⚠️ ${totalContado > 100 ? 'Total excede 100 sementes.' : `Faltam ${100 - totalContado} sementes.`} Ajuste a soma para habilitar.`}
              </span>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                {existingAvaliacao && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowDeleteModal(true);
                    }}
                    className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Excluir esta avaliação"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>Excluir</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={!isExact100 || isSaving}
                  className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold shadow-md transition-all flex items-center justify-center gap-2 ${
                    isExact100 && !isSaving
                      ? 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer active:scale-95'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-70'
                  }`}
                >
                  <Save className="w-4 h-4 text-emerald-200" />
                  <span>{isSaving ? 'Salvando...' : 'Salvar'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenFinalizeModal}
                  disabled={!isExact100 || isFinalizing}
                  className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold shadow-md transition-all flex items-center justify-center gap-2 ${
                    isExact100 && !isFinalizing
                      ? 'bg-[#1b4332] hover:bg-[#2d6a4f] text-white cursor-pointer active:scale-95'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
                  }`}
                >
                  <CheckCheck className="w-4 h-4 text-[#d8f3dc]" />
                  <span>Finalizar Avaliação</span>
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

      {/* Modal de Confirmação: Finalizar Avaliação */}
      <ConfirmActionModal
        isOpen={showFinalizeConfirmModal}
        title="Finalizar Avaliação"
        message="Deseja realmente finalizar esta avaliação? Depois de finalizada, os dados poderão ser alterados somente pela opção Editar."
        confirmText="Finalizar e Concluir"
        cancelText="Continuar Editando"
        confirmVariant="emerald"
        iconType="finish"
        isLoading={isFinalizing}
        onConfirm={handleConfirmFinalize}
        onCancel={() => setShowFinalizeConfirmModal(false)}
      />

      {/* Modal de Confirmação: Cancelar / Sair sem Salvar */}
      <ConfirmActionModal
        isOpen={showCancelConfirmModal}
        title="Sair da Avaliação"
        message="Existem dados preenchidos. Deseja realmente sair sem salvar?"
        subMessage="Ao sair sem salvar, todas as alterações não gravadas nesta tela serão perdidas."
        confirmText="Sair sem Salvar"
        cancelText="Continuar Preenchendo"
        confirmVariant="danger"
        iconType="warning"
        onConfirm={() => {
          setShowCancelConfirmModal(false);
          onBack();
        }}
        onCancel={() => setShowCancelConfirmModal(false)}
      />

      {/* Modal de Confirmação: Exclusão de Registro */}
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

    </form>
  );
};
