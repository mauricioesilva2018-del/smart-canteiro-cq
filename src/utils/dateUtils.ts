/**
 * Utilitários para cálculo e formatação de datas locais (Brasil)
 * e regras de leituras de germinação (7 dias e 10 dias).
 */

import { Amostra, Avaliacao } from '../types';

/**
 * Retorna a data atual no formato YYYY-MM-DD considerando fuso local do Brasil.
 */
export function getTodayBR(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Adiciona um número específico de dias a uma data YYYY-MM-DD de forma segura.
 */
export function addDaysToDate(dateStr: string, days: number): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return '';

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const d = new Date(year, month, day);
  d.setDate(d.getDate() + days);

  const resYear = d.getFullYear();
  const resMonth = String(d.getMonth() + 1).padStart(2, '0');
  const resDay = String(d.getDate()).padStart(2, '0');

  return `${resYear}-${resMonth}-${resDay}`;
}

/**
 * Formata data YYYY-MM-DD para DD/MM/YYYY.
 */
export function formatDateBR(dateStr?: string): string {
  if (!dateStr) return 'N/A';
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Calcula automaticamente as datas de 7 e 10 dias a partir da data de lançamento.
 */
export function calculateLeituraDates(dataLancamento: string): {
  dataLeitura7dias: string;
  dataLeitura10dias: string;
} {
  if (!dataLancamento) {
    return { dataLeitura7dias: '', dataLeitura10dias: '' };
  }
  return {
    dataLeitura7dias: addDaysToDate(dataLancamento, 7),
    dataLeitura10dias: addDaysToDate(dataLancamento, 10),
  };
}

/**
 * Calcula a diferença em dias entre a data alvo e a data base (padrão: hoje).
 * > 0: Faltam X dias (futuro)
 * = 0: Hoje
 * < 0: Atrasada em X dias (passado)
 */
export function getDaysDifference(targetDateStr: string, baseDateStr: string = getTodayBR()): number {
  if (!targetDateStr) return 0;
  const tParts = targetDateStr.split('-');
  const bParts = baseDateStr.split('-');

  if (tParts.length !== 3 || bParts.length !== 3) return 0;

  const targetDate = new Date(parseInt(tParts[0], 10), parseInt(tParts[1], 10) - 1, parseInt(tParts[2], 10));
  const baseDate = new Date(parseInt(bParts[0], 10), parseInt(bParts[1], 10) - 1, parseInt(bParts[2], 10));

  const diffTime = targetDate.getTime() - baseDate.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export type StatusLeituraType = 
  | 'PENDENTE_HOJE'
  | 'LEITURA_7D_REALIZADA'
  | 'LEITURA_10D_REALIZADA'
  | 'ATRASADA'
  | 'FUTURA';

export interface LeituraInfo {
  data7d: string;
  data10d: string;
  diffDays7d: number;
  diffDays10d: number;
  is7dHoje: boolean;
  is10dHoje: boolean;
  is7dAtrasada: boolean;
  is10dAtrasada: boolean;
  leitura7dRealizada: boolean;
  leitura10dRealizada: boolean;
  statusGeral: StatusLeituraType;
  statusLabel: string;
  statusBadgeColor: string;
  proximaLeituraTipo: '7_dias' | '10_dias' | 'concluida';
  proximaLeituraData: string;
  diasParaProximaLeitura: number;
  alertaHoje: string | null;
}

/**
 * Analisa e retorna o status detalhado de leituras de uma amostra.
 */
export function getAmostraLeituraInfo(amostra: Amostra, avaliacao?: Avaliacao): LeituraInfo {
  const dataLancamento = amostra.dataSemeadura;
  const data7d = amostra.dataLeitura7dias || addDaysToDate(dataLancamento, 7);
  const data10d = amostra.dataLeitura10dias || addDaysToDate(dataLancamento, 10);

  const today = getTodayBR();
  const diffDays7d = getDaysDifference(data7d, today);
  const diffDays10d = getDaysDifference(data10d, today);

  const is7dHoje = diffDays7d === 0;
  const is10dHoje = diffDays10d === 0;
  const is7dAtrasada = diffDays7d < 0;
  const is10dAtrasada = diffDays10d < 0;

  // Determinar se leitura de 7d ou 10d foi realizada
  const isConcluido = amostra.status === 'Concluído' || !!avaliacao || !!amostra.leitura10diasRealizada;
  const leitura7dRealizada = Boolean(
    amostra.leitura7diasRealizada || 
    amostra.plantulasEmergidas7dias !== undefined || 
    isConcluido
  );
  const leitura10dRealizada = Boolean(
    amostra.leitura10diasRealizada || 
    isConcluido
  );

  let statusGeral: StatusLeituraType = 'FUTURA';
  let statusLabel = `Faltam ${diffDays7d} dias`;
  let statusBadgeColor = 'bg-blue-100 text-blue-800 border-blue-200';
  let proximaLeituraTipo: '7_dias' | '10_dias' | 'concluida' = '7_dias';
  let proximaLeituraData = data7d;
  let diasParaProximaLeitura = diffDays7d;
  let alertaHoje: string | null = null;

  if (leitura10dRealizada) {
    statusGeral = 'LEITURA_10D_REALIZADA';
    statusLabel = 'LEITURA DE 10 DIAS REALIZADA';
    statusBadgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
    proximaLeituraTipo = 'concluida';
    proximaLeituraData = data10d;
    diasParaProximaLeitura = 0;
  } else if (leitura7dRealizada) {
    // 7 dias feita, aguardando 10 dias
    proximaLeituraTipo = '10_dias';
    proximaLeituraData = data10d;
    diasParaProximaLeitura = diffDays10d;

    if (is10dHoje) {
      statusGeral = 'PENDENTE_HOJE';
      statusLabel = 'LEITURA PENDENTE (10 DIAS)';
      statusBadgeColor = 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse';
      alertaHoje = `LEITURA DE 10 DIAS: A amostra ${amostra.protocolo} está pronta para leitura hoje.`;
    } else if (is10dAtrasada) {
      statusGeral = 'ATRASADA';
      statusLabel = 'LEITURA ATRASADA (10 DIAS)';
      statusBadgeColor = 'bg-rose-100 text-rose-800 border-rose-300';
    } else {
      statusGeral = 'LEITURA_7D_REALIZADA';
      statusLabel = 'LEITURA DE 7 DIAS REALIZADA';
      statusBadgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }
  } else {
    // 7 dias ainda não realizada
    proximaLeituraTipo = '7_dias';
    proximaLeituraData = data7d;
    diasParaProximaLeitura = diffDays7d;

    if (is7dHoje) {
      statusGeral = 'PENDENTE_HOJE';
      statusLabel = 'LEITURA PENDENTE';
      statusBadgeColor = 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse';
      alertaHoje = `LEITURA DE 7 DIAS: A amostra ${amostra.protocolo} está pronta para leitura hoje.`;
    } else if (is7dAtrasada) {
      statusGeral = 'ATRASADA';
      statusLabel = 'LEITURA ATRASADA';
      statusBadgeColor = 'bg-rose-100 text-rose-800 border-rose-300';
    } else {
      statusGeral = 'FUTURA';
      statusLabel = `Leitura 7d em ${diffDays7d} ${diffDays7d === 1 ? 'dia' : 'dias'}`;
      statusBadgeColor = 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  return {
    data7d,
    data10d,
    diffDays7d,
    diffDays10d,
    is7dHoje,
    is10dHoje,
    is7dAtrasada,
    is10dAtrasada,
    leitura7dRealizada,
    leitura10dRealizada,
    statusGeral,
    statusLabel,
    statusBadgeColor,
    proximaLeituraTipo,
    proximaLeituraData,
    diasParaProximaLeitura,
    alertaHoje,
  };
}
