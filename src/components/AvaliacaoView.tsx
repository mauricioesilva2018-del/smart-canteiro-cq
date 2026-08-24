import React, { useState, useEffect } from 'react';
import { Amostra, Avaliacao, Usuario } from '../types';
import { storageService } from '../services/storageService';
import { exportService } from '../services/exportService';
import { FotoManager } from './FotoManager';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { ConfirmActionModal } from './ConfirmActionModal';
import { ToastNotification, ToastMessage } from './ToastNotification';
import { 
  ArrowLeft, Save, FileText, 
  Clock, ShieldCheck, ShieldAlert, Camera, Sprout, Trash2,
  CheckCheck, Calendar, Bell, CheckCircle2, AlertCircle, Info, Sparkles
} from 'lucide-react';
import { getAmostraLeituraInfo, formatDateBR, addDaysToDate } from '../utils/dateUtils';

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

  // Determinar Etapa Ativa de Leitura (7 dias = Contagem de Emergência; 10 dias = Avaliação Final)
  const [etapaLeitura, setEtapaLeitura] = useState<'7_dias' | '10_dias'>(() => {
    if (existingAvaliacao) return '10_dias';
    if (amostra) {
      if (amostra.leitura10diasRealizada) return '10_dias';
      if (amostra.leitura7diasRealizada || amostra.plantulasEmergidas7dias !== undefined) return '10_dias';
      const leInfo = getAmostraLeituraInfo(amostra);
      if (leInfo.proximaLeituraTipo === '10_dias') return '10_dias';
      return '7_dias';
    }
    return '7_dias';
  });

  // --- ESTADO: LEITURA DE 7 DIAS (CONTAGEM DE EMERGÊNCIA EXCLUSIVA) ---
  const initialEmergidas7d = amostra?.plantulasEmergidas7dias !== undefined 
    ? String(amostra.plantulasEmergidas7dias) 
    : (existingAvaliacao?.plantulasEmergidas7dias !== undefined ? String(existingAvaliacao.plantulasEmergidas7dias) : '85');
  const [strEmergidas7d, setStrEmergidas7d] = useState<string>(initialEmergidas7d);
  const [obs7d, setObs7d] = useState<string>(() => amostra?.obsLeitura7dias || '');

  // --- ESTADO: LEITURA DE 10 DIAS (AVALIAÇÃO FINAL COMPLETA) ---
  const initialFortes = existingAvaliacao ? existingAvaliacao.fortes : 70;
  const initialIntermediarias = existingAvaliacao ? existingAvaliacao.intermediarias : 12;
  const initialFracas = existingAvaliacao ? existingAvaliacao.fracas : 6;
  const initialAnormais = existingAvaliacao ? (existingAvaliacao.anormais ?? 4) : 4;
  const initialMortas = existingAvaliacao ? existingAvaliacao.mortas : 8;
  const initialObservacoes10d = existingAvaliacao ? existingAvaliacao.observacoes : '';

  const [strFortes, setStrFortes] = useState<string>(() => String(initialFortes));
  const [strIntermediarias, setStrIntermediarias] = useState<string>(() => String(initialIntermediarias));
  const [strFracas, setStrFracas] = useState<string>(() => String(initialFracas));
  const [strAnormais, setStrAnormais] = useState<string>(() => String(initialAnormais));
  const [strMortas, setStrMortas] = useState<string>(() => String(initialMortas));
  const [observacoes10d, setObservacoes10d] = useState<string>(initialObservacoes10d);

  // Estados de UI e Controle
  const [activeTab, setActiveTab] = useState<'contagem' | 'fotos'>('contagem');
  const [isSaving7d, setIsSaving7d] = useState(false);
  const [isSaving10d, setIsSaving10d] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modais de Confirmação
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);
  const [showFinalizeConfirmModal, setShowFinalizeConfirmModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Notificações Toast
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Sincronizar com Firestore em tempo real
  useEffect(() => {
    const unsub = storageService.subscribe(() => {
      const updatedAmostra = storageService.getAmostraById(amostraId);
      if (updatedAmostra) {
        setAmostra(updatedAmostra);
        if (updatedAmostra.plantulasEmergidas7dias !== undefined) {
          setStrEmergidas7d(String(updatedAmostra.plantulasEmergidas7dias));
        }
        if (updatedAmostra.obsLeitura7dias) {
          setObs7d(updatedAmostra.obsLeitura7dias);
        }
      }
      const updatedAval = storageService.getAvaliacaoByAmostraId(amostraId);
      if (updatedAval) {
        setExistingAvaliacao(updatedAval);
      }
    });
    return () => unsub();
  }, [amostraId]);

  // Carregar valores de avaliação inicial se existir
  useEffect(() => {
    if (existingAvaliacao) {
      setStrFortes(String(existingAvaliacao.fortes));
      setStrIntermediarias(String(existingAvaliacao.intermediarias));
      setStrFracas(String(existingAvaliacao.fracas));
      setStrAnormais(String(existingAvaliacao.anormais ?? 4));
      setStrMortas(String(existingAvaliacao.mortas));
      setObservacoes10d(existingAvaliacao.observacoes || '');
      if (existingAvaliacao.plantulasEmergidas7dias !== undefined) {
        setStrEmergidas7d(String(existingAvaliacao.plantulasEmergidas7dias));
      }
    }
  }, [existingAvaliacao?.id]);

  if (!amostra) {
    return (
      <div id="view-amostra-nao-encontrada" className="p-8 text-center bg-white rounded-2xl border border-gray-100 shadow-sm max-w-xl mx-auto my-8">
        <p className="text-gray-700 font-bold text-base">Amostra de Canteiro não encontrada.</p>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onBack();
          }}
          className="mt-4 px-5 py-2.5 bg-[#1b4332] hover:bg-[#2d6a4f] text-white font-bold text-sm rounded-xl transition-all shadow-sm cursor-pointer"
        >
          Voltar para Lista
        </button>
      </div>
    );
  }

  // --- CÁLCULOS: 7 DIAS (CONTAGEM DE EMERGÊNCIA) ---
  const emergidas7d = strEmergidas7d === '' ? 0 : (parseInt(strEmergidas7d, 10) || 0);
  const percentualEmergencia7d = emergidas7d; // Base 100 sementes

  // --- CÁLCULOS: 10 DIAS (AVALIAÇÃO FINAL - 5 CATEGORIAS) ---
  const fortes = strFortes === '' ? 0 : (parseInt(strFortes, 10) || 0);
  const intermediarias = strIntermediarias === '' ? 0 : (parseInt(strIntermediarias, 10) || 0);
  const fracas = strFracas === '' ? 0 : (parseInt(strFracas, 10) || 0);
  const anormais = strAnormais === '' ? 0 : (parseInt(strAnormais, 10) || 0);
  const mortas = strMortas === '' ? 0 : (parseInt(strMortas, 10) || 0);

  const totalContado10d = fortes + intermediarias + fracas + anormais + mortas;
  const isExact100 = totalContado10d === 100;
  const totalGerminado = fortes + intermediarias + fracas;
  const percentualGerminacao = totalGerminado;
  const percentualAnormais = anormais;
  const percentualMortas = mortas;

  // Aprovação CQ
  const minGermina = storageService.getMinGerminationForCultura(amostra.cultura);
  const isAprovado = percentualGerminacao >= minGermina;

  // Helper de Incremento/Decremento Seguro (0 a 100)
  const updateCount = (
    setter: React.Dispatch<React.SetStateAction<string>>,
    currentStr: string,
    delta: number
  ) => {
    const cur = currentStr === '' ? 0 : (parseInt(currentStr, 10) || 0);
    const nextVal = Math.max(0, Math.min(100, cur + delta));
    setter(String(nextVal));
  };

  // Helper de Digitação Segura nos Campos de Contagem
  const handleInputChange = (
    raw: string,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    if (raw === '') {
      setter('');
      return;
    }
    const clean = raw.replace(/\D/g, '');
    if (clean === '') {
      setter('');
      return;
    }
    const val = parseInt(clean, 10);
    if (!isNaN(val)) {
      const clamped = Math.max(0, Math.min(100, val));
      setter(String(clamped));
    }
  };

  // Tratar Clique em Cancelar / Voltar
  const handleBackRequest = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onBack();
  };

  // --- AÇÃO: SALVAR LEITURA DE 7 DIAS (CONTAGEM DE EMERGÊNCIA) ---
  const handleSave7Dias = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    setIsSaving7d(true);
    try {
      const now = new Date();
      const dataLeitura = now.toISOString().split('T')[0];
      const horaLeitura = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      const updated = await storageService.saveLeitura7Dias(amostra.id, {
        plantulasEmergidas: emergidas7d,
        observacoes: obs7d,
        dataLeitura,
        horaLeitura,
        usuario: currentUser.nome,
      });

      setAmostra(updated);
      setToast({
        type: 'success',
        message: `Contagem de Emergência (7 dias) salva com sucesso! (${emergidas7d} plântulas emergidas)`
      });
    } catch (error) {
      setToast({
        type: 'error',
        message: `Erro ao salvar contagem de 7 dias: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsSaving7d(false);
    }
  };

  // --- AÇÃO: SALVAR RASCUNHO LEITURA DE 10 DIAS ---
  const handleSaveDraft10Dias = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!isExact100) {
      if (totalContado10d > 100) {
        setToast({
          type: 'error',
          message: `Total excede 100 sementes (${totalContado10d}/100). Ajuste a soma antes de salvar.`
        });
      } else {
        setToast({
          type: 'error',
          message: `Faltam ${100 - totalContado10d} sementes para completar 100 na Avaliação Final.`
        });
      }
      return;
    }

    setIsSaving10d(true);
    try {
      const now = new Date();
      const dataAvaliacao = now.toISOString().split('T')[0];
      const horaAvaliacao = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      const saved = await storageService.saveAvaliacao({
        amostraId: amostra.id,
        tipoLeitura: '10_dias',
        plantulasEmergidas7dias: amostra.plantulasEmergidas7dias !== undefined ? amostra.plantulasEmergidas7dias : emergidas7d,
        fortes,
        intermediarias,
        fracas,
        anormais,
        mortas,
        observacoes: observacoes10d,
        dataAvaliacao,
        horaAvaliacao,
        usuarioAvaliador: currentUser.nome,
      });

      setExistingAvaliacao(saved);
      const isOnline = typeof window !== 'undefined' && navigator.onLine;
      setToast({
        type: 'success',
        message: isOnline 
          ? 'Avaliação Final (10 dias) salva com sucesso!' 
          : 'Salvo no dispositivo com segurança. Aguardando conexão para envio.'
      });
    } catch (error) {
      setToast({
        type: 'error',
        message: `Erro ao salvar avaliação: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsSaving10d(false);
    }
  };

  // --- AÇÃO: FINALIZAR AVALIAÇÃO DE 10 DIAS (100% OFFLINE-FIRST) ---
  const handleOpenFinalizeModal = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!isExact100) {
      setToast({
        type: 'error',
        message: `Não é possível finalizar: o total deve ser exatamente 100 sementes (atual: ${totalContado10d}/100).`
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

      // Salva localmente via IndexedDB instantaneamente (sem dependência de rede)
      const saved = await storageService.saveAvaliacao({
        amostraId: amostra.id,
        tipoLeitura: '10_dias',
        plantulasEmergidas7dias: amostra.plantulasEmergidas7dias !== undefined ? amostra.plantulasEmergidas7dias : emergidas7d,
        fortes,
        intermediarias,
        fracas,
        anormais,
        mortas,
        observacoes: observacoes10d,
        dataAvaliacao,
        horaAvaliacao,
        usuarioAvaliador: currentUser.nome,
      });

      setExistingAvaliacao(saved);
      setShowFinalizeConfirmModal(false);
      setIsFinalizing(false);

      const isOnline = typeof window !== 'undefined' && navigator.onLine;
      setToast({
        type: 'success',
        message: isOnline
          ? 'Avaliação Final concluída com sucesso! Registro marcado como CONCLUÍDO.'
          : 'Salvo no dispositivo. Canteiro finalizado localmente com sucesso!'
      });

      setTimeout(() => {
        onBack();
      }, 700);
    } catch (error) {
      setToast({
        type: 'error',
        message: `Erro ao finalizar avaliação: ${error instanceof Error ? error.message : String(error)}`
      });
      setIsFinalizing(false);
      setShowFinalizeConfirmModal(false);
    }
  };

  // --- AÇÃO: EXCLUIR AVALIAÇÃO ---
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
        setToast({ type: 'error', message: 'Erro ao excluir registro.' });
      }
    } catch (error) {
      setToast({ type: 'error', message: `Erro ao excluir: ${error instanceof Error ? error.message : String(error)}` });
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <div 
      id="view-avaliacao-canteiro"
      className="space-y-6 max-w-4xl mx-auto pb-12"
      onClick={(e) => e.stopPropagation()}
    >
      
      {/* Top Nav & Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          id="btn-voltar-avaliacao-lista"
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
              id="btn-gerar-laudo-pdf"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const fotos = storageService.getFotosByAmostra(amostra.id);
                exportService.generateSamplePDF(amostra, existingAvaliacao, fotos);
              }}
              className="flex items-center gap-1.5 bg-gray-800 hover:bg-black text-white px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <FileText className="w-4 h-4 text-rose-400" />
              <span>Laudo PDF</span>
            </button>
          )}

          {etapaLeitura === '7_dias' ? (
            /* Botão Salvar Leitura de 7 Dias */
            <button
              type="button"
              id="btn-salvar-7dias"
              onClick={handleSave7Dias}
              disabled={isSaving7d}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold shadow-md bg-[#1b4332] hover:bg-[#2d6a4f] text-white active:scale-95 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4 text-[#d8f3dc]" />
              <span>{isSaving7d ? 'Salvando...' : 'Salvar Contagem de 7 Dias'}</span>
            </button>
          ) : (
            /* Botões da Leitura de 10 Dias */
            <>
              <button
                type="button"
                id="btn-salvar-avaliacao-draft"
                onClick={handleSaveDraft10Dias}
                disabled={!isExact100 || isSaving10d}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold shadow-md transition-all ${
                  isExact100 && !isSaving10d
                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white active:scale-95 cursor-pointer'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-70'
                }`}
                title={!isExact100 ? 'A soma das 5 categorias deve ser exatamente 100 sementes.' : 'Salvar dados no Firestore'}
              >
                <Save className="w-4 h-4 text-emerald-200" />
                <span>{isSaving10d ? 'Salvando...' : 'Salvar Rascunho'}</span>
              </button>

              <button
                type="button"
                id="btn-finalizar-avaliacao-abrir-modal"
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
            </>
          )}
        </div>
      </div>

      {/* Cartão de Identificação do Canteiro & Metadados */}
      <div id="card-identificacao-canteiro" className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
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
            <p><span className="font-semibold text-gray-700">Semeadura:</span> {formatDateBR(amostra.dataSemeadura)}</p>
            <p><span className="font-semibold text-gray-700">Responsável:</span> {amostra.responsavel}</p>
          </div>
        </div>

        {/* Tabela de Metadados em Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-gray-50 p-3.5 rounded-xl border border-gray-100">
          <div><span className="text-gray-500 font-medium">Nº do Lote:</span> <p className="font-bold text-gray-900">{amostra.lote}</p></div>
          <div><span className="text-gray-500 font-medium">Peneira / Cat:</span> <p className="font-bold text-gray-900">{amostra.peneira} • {amostra.categoria}</p></div>
          <div><span className="text-gray-500 font-medium">Safra:</span> <p className="font-bold text-gray-900">{amostra.safra}</p></div>
          <div><span className="text-gray-500 font-medium">Qtd. Sementes:</span> <p className="font-bold text-[#1b4332]">100 sementes</p></div>
          <div><span className="text-gray-500 font-medium">Data Lançamento:</span> <p className="font-bold text-gray-800">{formatDateBR(amostra.dataSemeadura)}</p></div>
          <div>
            <span className="text-gray-500 font-medium">Prev. 7 Dias (+7d):</span> 
            <p className="font-black text-[#1b4332] flex items-center gap-1">
              <span>{formatDateBR(amostra.dataLeitura7dias || addDaysToDate(amostra.dataSemeadura, 7))}</span>
              {(amostra.leitura7diasRealizada || amostra.plantulasEmergidas7dias !== undefined) && (
                <span title="Leitura de 7 dias realizada"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /></span>
              )}
            </p>
          </div>
          <div>
            <span className="text-gray-500 font-medium">Prev. 10 Dias (+10d):</span> 
            <p className="font-black text-[#1b4332] flex items-center gap-1">
              <span>{formatDateBR(amostra.dataLeitura10dias || addDaysToDate(amostra.dataSemeadura, 10))}</span>
              {amostra.leitura10diasRealizada && (
                <span title="Leitura de 10 dias realizada"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /></span>
              )}
            </p>
          </div>
          <div><span className="text-gray-500 font-medium">Matriz / TSI:</span> <p className="font-bold text-gray-900">{amostra.tsiMatriz || 'Padrão TSI'}</p></div>
        </div>

        {/* SELETOR CLARO DA ETAPA DE LEITURA (7 DIAS vs 10 DIAS) */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <span className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-[#2d6a4f]" />
              Selecione a Etapa de Leitura:
            </span>

            <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1.5 rounded-2xl w-full sm:w-auto">
              
              {/* Opção 7 Dias */}
              <button
                type="button"
                id="btn-switch-etapa-7dias"
                onClick={() => setEtapaLeitura('7_dias')}
                className={`px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  etapaLeitura === '7_dias'
                    ? 'bg-[#1b4332] text-white shadow-md'
                    : 'text-gray-700 hover:text-black hover:bg-gray-200'
                }`}
              >
                <Sprout className="w-4 h-4" />
                <span>7 DIAS: Contagem Emergência</span>
                {(amostra.leitura7diasRealizada || amostra.plantulasEmergidas7dias !== undefined) && (
                  <span className="bg-emerald-400 text-emerald-950 px-1.5 py-0.2 text-[10px] font-black rounded-md">
                    {amostra.plantulasEmergidas7dias ?? emergidas7d} emg
                  </span>
                )}
              </button>

              {/* Opção 10 Dias */}
              <button
                type="button"
                id="btn-switch-etapa-10dias"
                onClick={() => setEtapaLeitura('10_dias')}
                className={`px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  etapaLeitura === '10_dias'
                    ? 'bg-[#1b4332] text-white shadow-md'
                    : 'text-gray-700 hover:text-black hover:bg-gray-200'
                }`}
              >
                <CheckCheck className="w-4 h-4" />
                <span>10 DIAS: Avaliação Final</span>
                {existingAvaliacao && (
                  <span className="bg-emerald-400 text-emerald-950 px-1.5 py-0.2 text-[10px] font-black rounded-md">
                    {existingAvaliacao.germinacao}%
                  </span>
                )}
              </button>

            </div>
          </div>
        </div>

      </div>

      {/* Tab Selector: Avaliação x Fotos */}
      <div className="flex bg-gray-200 p-1 rounded-xl">
        <button
          type="button"
          id="btn-tab-contagem"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setActiveTab('contagem');
          }}
          className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'contagem' ? 'bg-[#1b4332] text-white shadow-sm' : 'text-gray-700 hover:text-black'
          }`}
        >
          <Sprout className="w-4 h-4" />
          <span>{etapaLeitura === '7_dias' ? 'Contagem de Emergência (7 Dias)' : 'Avaliação Morfológica (10 Dias)'}</span>
        </button>

        <button
          type="button"
          id="btn-tab-fotos"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setActiveTab('fotos');
          }}
          className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'fotos' ? 'bg-[#1b4332] text-white shadow-sm' : 'text-gray-700 hover:text-black'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Registro Fotográfico</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* CASO 1: ETAPA DE 7 DIAS (EXCLUSIVAMENTE CONTAGEM DE PLÂNTULAS EMERGIDAS)  */}
      {/* ========================================================================= */}
      {activeTab === 'contagem' && etapaLeitura === '7_dias' && (
        <div id="painel-leitura-7-dias" className="space-y-6">
          
          {/* Banner Informativo da Regra dos 7 Dias */}
          <div className="bg-emerald-50 border-2 border-emerald-400 p-4.5 rounded-2xl shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1b4332] text-white flex items-center justify-center font-black shrink-0 shadow-xs">
                🌱
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm sm:text-base font-black text-emerald-950 uppercase tracking-tight">
                    CONTAGEM DE EMERGÊNCIA (7 DIAS)
                  </h3>
                  <span className="bg-emerald-200 text-emerald-900 border border-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                    Etapa 1 de 2
                  </span>
                </div>
                <p className="text-xs font-semibold text-emerald-900 leading-relaxed">
                  A leitura de 7 dias é utilizada <strong>EXCLUSIVAMENTE para registrar a quantidade de plântulas que emergiram</strong> até o 7º dia.
                  Nesta etapa, <strong>NÃO</strong> devem ser avaliados nem preenchidos os grupos de vigor (Fortes, Intermediárias, Fracas, Anomalias ou Mortas). A avaliação morfológica completa será realizada aos 10 dias.
                </p>
              </div>
            </div>
          </div>

          {/* Painel Central de Contagem de Emergência */}
          <div className="bg-white rounded-2xl border border-emerald-200 p-6 shadow-sm space-y-6">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <label 
                  htmlFor="input-emergidas-7dias"
                  className="text-base sm:text-lg font-black text-gray-900 block"
                >
                  PLÂNTULAS EMERGIDAS – 7 DIAS
                </label>
                <p className="text-xs text-gray-500 mt-0.5">
                  Informe o número total de plântulas visivelmente emergidas no canteiro (0 a 100)
                </p>
              </div>

              {/* Indicador de Percentual de Emergência */}
              <div className="bg-[#1b4332] text-white px-4 py-2.5 rounded-2xl shadow-xs text-center md:text-right shrink-0">
                <span className="text-[10px] font-bold text-[#b7e4c7] uppercase tracking-wider block">Taxa de Emergência (7d)</span>
                <p className="text-2xl font-black text-[#d8f3dc]">{percentualEmergencia7d}%</p>
                <span className="text-[10px] text-[#b7e4c7] block">{emergidas7d} de 100 sementes</span>
              </div>
            </div>

            {/* Grande Campo de Digitação e Controles Rápidos */}
            <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-6 space-y-4">
              
              <div className="flex items-center justify-center gap-3 max-w-md mx-auto">
                <button
                  type="button"
                  id="btn-decrement-emergidas"
                  onClick={() => updateCount(setStrEmergidas7d, strEmergidas7d, -1)}
                  className="w-14 h-14 bg-white border-2 border-emerald-400 rounded-2xl font-black text-2xl text-emerald-950 hover:bg-emerald-100 active:scale-95 transition-all shadow-xs cursor-pointer select-none flex items-center justify-center"
                  title="Diminuir 1"
                >
                  -
                </button>

                <div className="flex-1 relative">
                  <input
                    id="input-emergidas-7dias"
                    name="plantulasEmergidas7dias"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                    value={strEmergidas7d}
                    onFocus={(e) => e.target.select()}
                    onBlur={() => {
                      if (strEmergidas7d === '') setStrEmergidas7d('0');
                    }}
                    onChange={(e) => handleInputChange(e.target.value, setStrEmergidas7d)}
                    className="w-full bg-white border-3 border-emerald-500 rounded-2xl py-3 text-center text-4xl font-black text-emerald-950 focus:outline-none focus:ring-4 focus:ring-emerald-300 shadow-inner"
                  />
                  <span className="block text-[11px] font-bold text-center text-emerald-800 mt-1">
                    Plântulas Emergidas (0 – 100)
                  </span>
                </div>

                <button
                  type="button"
                  id="btn-increment-emergidas"
                  onClick={() => updateCount(setStrEmergidas7d, strEmergidas7d, 1)}
                  className="w-14 h-14 bg-emerald-700 text-white rounded-2xl font-black text-2xl hover:bg-emerald-800 active:scale-95 transition-all shadow-xs cursor-pointer select-none flex items-center justify-center"
                  title="Aumentar 1"
                >
                  +
                </button>
              </div>

              {/* Botões Rápidos de Ajuste */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <span className="text-xs font-bold text-gray-500 mr-1">Atalhos:</span>
                <button
                  type="button"
                  onClick={() => updateCount(setStrEmergidas7d, strEmergidas7d, 5)}
                  className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-xl font-extrabold text-xs transition-all cursor-pointer"
                >
                  +5
                </button>
                <button
                  type="button"
                  onClick={() => updateCount(setStrEmergidas7d, strEmergidas7d, 10)}
                  className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-xl font-extrabold text-xs transition-all cursor-pointer"
                >
                  +10
                </button>
                <button
                  type="button"
                  onClick={() => setStrEmergidas7d('80')}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-xs transition-all cursor-pointer"
                >
                  80
                </button>
                <button
                  type="button"
                  onClick={() => setStrEmergidas7d('85')}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-xs transition-all cursor-pointer"
                >
                  85
                </button>
                <button
                  type="button"
                  onClick={() => setStrEmergidas7d('90')}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-xs transition-all cursor-pointer"
                >
                  90
                </button>
                <button
                  type="button"
                  onClick={() => setStrEmergidas7d('100')}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-xs transition-all cursor-pointer"
                >
                  100 (Total)
                </button>
              </div>

            </div>

            {/* Observações da Leitura de 7 Dias */}
            <div>
              <label htmlFor="textarea-obs-7d" className="block text-xs font-bold text-gray-700 mb-1">
                Observações da Emergência (Opcional)
              </label>
              <textarea
                id="textarea-obs-7d"
                rows={2}
                value={obs7d}
                onChange={(e) => setObs7d(e.target.value)}
                placeholder="Ex: Emergência uniforme, velocidade rápida, substrato com boa umidade..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs sm:text-sm font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
              />
            </div>

            {/* Auditoria da Leitura */}
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex flex-wrap items-center justify-between text-xs text-gray-600 gap-2">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>
                  {amostra.dataRealizacao7dias ? (
                    <>Data registrada: <strong>{formatDateBR(amostra.dataRealizacao7dias)}</strong></>
                  ) : (
                    <>Registro automático ao salvar</>
                  )}
                </span>
              </div>
              <div className="font-semibold text-gray-800">
                Avaliador: {currentUser.nome}
              </div>
            </div>

            {/* Botão de Gravação 7 Dias */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 font-medium">
                Após registrar a contagem de 7 dias, a amostra continuará aguardando a <strong>Avaliação Final aos 10 dias</strong>.
              </p>

              <button
                type="button"
                id="btn-salvar-contagem-7dias-footer"
                onClick={handleSave7Dias}
                disabled={isSaving7d}
                className="w-full sm:w-auto px-6 py-3 bg-[#1b4332] hover:bg-[#2d6a4f] text-white font-extrabold text-sm rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4 text-[#d8f3dc]" />
                <span>{isSaving7d ? 'Salvando Contagem...' : 'Salvar Contagem de Emergência (7 Dias)'}</span>
              </button>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* CASO 2: ETAPA DE 10 DIAS (AVALIAÇÃO FINAL COMPLETA DAS 5 CATEGORIAS)      */}
      {/* ========================================================================= */}
      {activeTab === 'contagem' && etapaLeitura === '10_dias' && (
        <div id="painel-avaliacao-10-dias" className="space-y-6">
          
          {/* Banner Informativo da Regra dos 10 Dias */}
          <div className="bg-gray-900 text-white p-4.5 rounded-2xl shadow-sm space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center font-black text-lg shrink-0">
                  🔬
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-tight">
                    AVALIAÇÃO FINAL (10 DIAS)
                  </h3>
                  <p className="text-xs text-gray-300">
                    Avaliação morfológica completa das 100 sementes nas 5 categorias oficiais.
                  </p>
                </div>
              </div>

              {/* Chip da Leitura de 7 dias se existir */}
              {(amostra.plantulasEmergidas7dias !== undefined || amostra.leitura7diasRealizada) && (
                <div className="bg-emerald-950/90 border border-emerald-600 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-300 shrink-0 flex items-center gap-1.5">
                  <Sprout className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    Emergência aos 7d: <strong>{amostra.plantulasEmergidas7dias ?? emergidas7d} plântulas ({amostra.plantulasEmergidas7dias ?? emergidas7d}%)</strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* VALIDADOR DE 100 SEMENTES (OBRIGATÓRIO NOS 10 DIAS) */}
          <div className={`p-4 rounded-2xl border-2 transition-all shadow-sm ${
            isExact100
              ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
              : totalContado10d > 100
              ? 'bg-rose-50 border-rose-400 text-rose-950'
              : 'bg-amber-50 border-amber-400 text-amber-950'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-2xl shrink-0 shadow-xs ${
                  isExact100 ? 'bg-emerald-600 text-white' : totalContado10d > 100 ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
                }`}>
                  {isExact100 ? '✅' : '❌'}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-gray-700">Contador em Tempo Real</span>
                    <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${
                      isExact100
                        ? 'bg-emerald-200 border-emerald-300 text-emerald-900'
                        : totalContado10d > 100
                        ? 'bg-rose-200 border-rose-300 text-rose-900'
                        : 'bg-amber-200 border-amber-300 text-amber-900'
                    }`}>
                      Total: {totalContado10d} / 100 sementes
                    </span>
                  </div>

                  <p className="text-sm font-black mt-1">
                    {isExact100 && `Total: 100/100 ✅ — Germinação Final = ${percentualGerminacao}% | Anormais = ${percentualAnormais}% | Mortas = ${percentualMortas}%`}
                    {totalContado10d > 100 && `Total excede 100 sementes (${totalContado10d}/100). Ajuste os valores.`}
                    {totalContado10d < 100 && `Faltam ${100 - totalContado10d} sementes para completar 100.`}
                  </p>
                  
                  {!isExact100 && (
                    <p className="text-xs font-semibold text-gray-600 mt-0.5">
                      A soma das 5 categorias (Fortes + Interm. + Fracas + Anormais + Mortas) deve ser exatamente 100.
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

          {/* PAINEL DE RESULTADOS CALCULADOS (10 DIAS) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            
            {/* Germinação % */}
            <div className="bg-[#1b4332] text-white p-3.5 rounded-2xl shadow-md text-center flex flex-col justify-between">
              <span className="text-[11px] font-bold text-[#b7e4c7] uppercase tracking-wider block">Germinação Final</span>
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

          {/* CAMPOS NUMÉRICOS DAS 5 CATEGORIAS DE AVALIAÇÃO FINAL (10 DIAS) */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-5">
            <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-2">
              Classificação das 100 Sementes (5 Categorias)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* 1. Plantas Fortes */}
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="input-contagem-fortes" className="font-extrabold text-sm text-emerald-950 cursor-pointer">
                    P. FORTES
                  </label>
                  <span className="text-xs font-bold text-emerald-800">Vigorosas</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateCount(setStrFortes, strFortes, -1)}
                    className="w-11 h-11 bg-white border border-emerald-300 rounded-xl font-black text-lg text-emerald-900 hover:bg-emerald-100 active:scale-95 transition-all shadow-xs cursor-pointer select-none"
                  >
                    -
                  </button>

                  <input
                    id="input-contagem-fortes"
                    name="fortes"
                    type="text"
                    inputMode="numeric"
                    value={strFortes}
                    onFocus={(e) => e.target.select()}
                    onBlur={() => { if (strFortes === '') setStrFortes('0'); }}
                    onChange={(e) => handleInputChange(e.target.value, setStrFortes)}
                    className="flex-1 bg-white border-2 border-emerald-400 rounded-xl py-2 text-center text-2xl font-black text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-inner"
                  />

                  <button
                    type="button"
                    onClick={() => updateCount(setStrFortes, strFortes, 1)}
                    className="w-11 h-11 bg-emerald-700 text-white rounded-xl font-black text-lg hover:bg-emerald-800 active:scale-95 transition-all shadow-xs cursor-pointer select-none"
                  >
                    +
                  </button>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-[11px] pt-1">
                  <button 
                    type="button" 
                    onClick={() => updateCount(setStrFortes, strFortes, 5)} 
                    className="px-2.5 py-1 bg-emerald-200 hover:bg-emerald-300 text-emerald-900 rounded-lg font-bold transition-colors cursor-pointer"
                  >
                    +5
                  </button>
                  <button 
                    type="button" 
                    onClick={() => updateCount(setStrFortes, strFortes, 10)} 
                    className="px-2.5 py-1 bg-emerald-200 hover:bg-emerald-300 text-emerald-900 rounded-lg font-bold transition-colors cursor-pointer"
                  >
                    +10
                  </button>
                </div>
              </div>

              {/* 2. Plantas Intermediárias */}
              <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="input-contagem-intermediarias" className="font-extrabold text-sm text-amber-950 cursor-pointer">
                    P. INTERMEDIÁRIAS
                  </label>
                  <span className="text-xs font-bold text-amber-800">Médio Vigor</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateCount(setStrIntermediarias, strIntermediarias, -1)}
                    className="w-11 h-11 bg-white border border-amber-300 rounded-xl font-black text-lg text-amber-900 hover:bg-amber-100 active:scale-95 transition-all shadow-xs cursor-pointer select-none"
                  >
                    -
                  </button>

                  <input
                    id="input-contagem-intermediarias"
                    name="intermediarias"
                    type="text"
                    inputMode="numeric"
                    value={strIntermediarias}
                    onFocus={(e) => e.target.select()}
                    onBlur={() => { if (strIntermediarias === '') setStrIntermediarias('0'); }}
                    onChange={(e) => handleInputChange(e.target.value, setStrIntermediarias)}
                    className="flex-1 bg-white border-2 border-amber-400 rounded-xl py-2 text-center text-2xl font-black text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-600 shadow-inner"
                  />

                  <button
                    type="button"
                    onClick={() => updateCount(setStrIntermediarias, strIntermediarias, 1)}
                    className="w-11 h-11 bg-amber-600 text-white rounded-xl font-black text-lg hover:bg-amber-700 active:scale-95 transition-all shadow-xs cursor-pointer select-none"
                  >
                    +
                  </button>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-[11px] pt-1">
                  <button 
                    type="button" 
                    onClick={() => updateCount(setStrIntermediarias, strIntermediarias, 5)} 
                    className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-lg font-bold transition-colors cursor-pointer"
                  >
                    +5
                  </button>
                  <button 
                    type="button" 
                    onClick={() => updateCount(setStrIntermediarias, strIntermediarias, 10)} 
                    className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-lg font-bold transition-colors cursor-pointer"
                  >
                    +10
                  </button>
                </div>
              </div>

              {/* 3. Plantas Fracas */}
              <div className="p-4 bg-orange-50/60 border border-orange-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="input-contagem-fracas" className="font-extrabold text-sm text-orange-950 cursor-pointer">
                    P. FRACAS
                  </label>
                  <span className="text-xs font-bold text-orange-800">Anãs / Tardias</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateCount(setStrFracas, strFracas, -1)}
                    className="w-11 h-11 bg-white border border-orange-300 rounded-xl font-black text-lg text-orange-900 hover:bg-orange-100 active:scale-95 transition-all shadow-xs cursor-pointer select-none"
                  >
                    -
                  </button>

                  <input
                    id="input-contagem-fracas"
                    name="fracas"
                    type="text"
                    inputMode="numeric"
                    value={strFracas}
                    onFocus={(e) => e.target.select()}
                    onBlur={() => { if (strFracas === '') setStrFracas('0'); }}
                    onChange={(e) => handleInputChange(e.target.value, setStrFracas)}
                    className="flex-1 bg-white border-2 border-orange-400 rounded-xl py-2 text-center text-2xl font-black text-orange-950 focus:outline-none focus:ring-2 focus:ring-orange-600 shadow-inner"
                  />

                  <button
                    type="button"
                    onClick={() => updateCount(setStrFracas, strFracas, 1)}
                    className="w-11 h-11 bg-orange-600 text-white rounded-xl font-black text-lg hover:bg-orange-700 active:scale-95 transition-all shadow-xs cursor-pointer select-none"
                  >
                    +
                  </button>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-[11px] pt-1">
                  <button 
                    type="button" 
                    onClick={() => updateCount(setStrFracas, strFracas, 5)} 
                    className="px-2.5 py-1 bg-orange-200 hover:bg-orange-300 text-orange-900 rounded-lg font-bold transition-colors cursor-pointer"
                  >
                    +5
                  </button>
                  <button 
                    type="button" 
                    onClick={() => updateCount(setStrFracas, strFracas, 10)} 
                    className="px-2.5 py-1 bg-orange-200 hover:bg-orange-300 text-orange-900 rounded-lg font-bold transition-colors cursor-pointer"
                  >
                    +10
                  </button>
                </div>
              </div>

              {/* 4. Plantas Anormais */}
              <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="input-contagem-anormais" className="font-extrabold text-sm text-purple-950 cursor-pointer">
                    P. ANOMALIAS
                  </label>
                  <span className="text-xs font-bold text-purple-800">Deformadas</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateCount(setStrAnormais, strAnormais, -1)}
                    className="w-11 h-11 bg-white border border-purple-300 rounded-xl font-black text-lg text-purple-900 hover:bg-purple-100 active:scale-95 transition-all shadow-xs cursor-pointer select-none"
                  >
                    -
                  </button>

                  <input
                    id="input-contagem-anormais"
                    name="anormais"
                    type="text"
                    inputMode="numeric"
                    value={strAnormais}
                    onFocus={(e) => e.target.select()}
                    onBlur={() => { if (strAnormais === '') setStrAnormais('0'); }}
                    onChange={(e) => handleInputChange(e.target.value, setStrAnormais)}
                    className="flex-1 bg-white border-2 border-purple-400 rounded-xl py-2 text-center text-2xl font-black text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-600 shadow-inner"
                  />

                  <button
                    type="button"
                    onClick={() => updateCount(setStrAnormais, strAnormais, 1)}
                    className="w-11 h-11 bg-purple-700 text-white rounded-xl font-black text-lg hover:bg-purple-800 active:scale-95 transition-all shadow-xs cursor-pointer select-none"
                  >
                    +
                  </button>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-[11px] pt-1">
                  <button 
                    type="button" 
                    onClick={() => updateCount(setStrAnormais, strAnormais, 5)} 
                    className="px-2.5 py-1 bg-purple-200 hover:bg-purple-300 text-purple-900 rounded-lg font-bold transition-colors cursor-pointer"
                  >
                    +5
                  </button>
                  <button 
                    type="button" 
                    onClick={() => updateCount(setStrAnormais, strAnormais, 10)} 
                    className="px-2.5 py-1 bg-purple-200 hover:bg-purple-300 text-purple-900 rounded-lg font-bold transition-colors cursor-pointer"
                  >
                    +10
                  </button>
                </div>
              </div>

              {/* 5. Plantas / Sementes Mortas */}
              <div className="p-4 bg-rose-50/60 border border-rose-200 rounded-2xl space-y-2 sm:col-span-2 lg:col-span-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="input-contagem-mortas" className="font-extrabold text-sm text-rose-950 cursor-pointer">
                    P. MORTAS
                  </label>
                  <span className="text-xs font-bold text-rose-800">Duras / Apodrecidas</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateCount(setStrMortas, strMortas, -1)}
                    className="w-11 h-11 bg-white border border-rose-300 rounded-xl font-black text-lg text-rose-900 hover:bg-rose-100 active:scale-95 transition-all shadow-xs cursor-pointer select-none"
                  >
                    -
                  </button>

                  <input
                    id="input-contagem-mortas"
                    name="mortas"
                    type="text"
                    inputMode="numeric"
                    value={strMortas}
                    onFocus={(e) => e.target.select()}
                    onBlur={() => { if (strMortas === '') setStrMortas('0'); }}
                    onChange={(e) => handleInputChange(e.target.value, setStrMortas)}
                    className="flex-1 bg-white border-2 border-rose-400 rounded-xl py-2 text-center text-2xl font-black text-rose-950 focus:outline-none focus:ring-2 focus:ring-rose-600 shadow-inner"
                  />

                  <button
                    type="button"
                    onClick={() => updateCount(setStrMortas, strMortas, 1)}
                    className="w-11 h-11 bg-rose-600 text-white rounded-xl font-black text-lg hover:bg-rose-700 active:scale-95 transition-all shadow-xs cursor-pointer select-none"
                  >
                    +
                  </button>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-[11px] pt-1">
                  <button 
                    type="button" 
                    onClick={() => updateCount(setStrMortas, strMortas, 5)} 
                    className="px-2.5 py-1 bg-rose-200 hover:bg-rose-300 text-rose-900 rounded-lg font-bold transition-colors cursor-pointer"
                  >
                    +5
                  </button>
                  <button 
                    type="button" 
                    onClick={() => updateCount(setStrMortas, strMortas, 10)} 
                    className="px-2.5 py-1 bg-rose-200 hover:bg-rose-300 text-rose-900 rounded-lg font-bold transition-colors cursor-pointer"
                  >
                    +10
                  </button>
                </div>
              </div>

            </div>

            {/* Observações da Avaliação Final */}
            <div className="pt-2">
              <label htmlFor="textarea-observacoes-10d" className="block text-xs font-bold text-gray-700 mb-1">
                Observações Técnicas do Avaliador (Laudo Final)
              </label>
              <textarea
                id="textarea-observacoes-10d"
                rows={3}
                value={observacoes10d}
                onChange={(e) => setObservacoes10d(e.target.value)}
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

            {/* Barra de Ações no Rodapé do Painel de 10 Dias */}
            <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className={`text-xs font-extrabold ${isExact100 ? 'text-emerald-800' : 'text-rose-700'}`}>
                {isExact100 
                  ? '✅ Total de 100 sementes contabilizado! Pronto para salvar ou finalizar.' 
                  : `⚠️ ${totalContado10d > 100 ? 'Total excede 100 sementes.' : `Faltam ${100 - totalContado10d} sementes.`} Ajuste a soma para habilitar.`}
              </span>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                {existingAvaliacao && (
                  <button
                    type="button"
                    id="btn-excluir-avaliacao"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
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
                  id="btn-salvar-avaliacao-rodape"
                  onClick={handleSaveDraft10Dias}
                  disabled={!isExact100 || isSaving10d}
                  className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold shadow-md transition-all flex items-center justify-center gap-2 ${
                    isExact100 && !isSaving10d
                      ? 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer active:scale-95'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-70'
                  }`}
                >
                  <Save className="w-4 h-4 text-emerald-200" />
                  <span>{isSaving10d ? 'Salvando...' : 'Salvar Rascunho'}</span>
                </button>

                <button
                  type="button"
                  id="btn-finalizar-avaliacao-rodape"
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
        <div id="painel-registro-fotos" className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
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
        message="Deseja realmente finalizar esta avaliação? Depois de finalizada, o registro será marcado como Concluído."
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

    </div>
  );
};
