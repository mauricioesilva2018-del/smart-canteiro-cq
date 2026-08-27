import { 
  signInAnonymously, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  onSnapshot, 
  query, 
  writeBatch 
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { 
  Amostra, 
  Avaliacao, 
  FotoAmostra, 
  Usuario, 
  ConfiguracaoAprovacao, 
  SyncOperation,
  SyncQueueItem,
  SyncItemStatus,
  LoteQualidade,
  AnaliseQualidade,
  ParametroQualidadeCultura,
  DocumentoAnexoQualidade,
  AuditoriaQualidade,
  DashboardQualidadeStats,
  ConfiguracaoAlertasQualidade,
  ConfiguracaoTermoConformidade,
  StatusValidadeLote,
  ItemResultadoAnalise
} from '../types';
import { indexedDbService } from './indexedDbService';
import { calculateLeituraDates, addDaysToDate, getTodayBR, getDaysDifference } from '../utils/dateUtils';
import { compressBase64Image } from '../utils/imageUtils';


const STORAGE_KEYS = {
  CURRENT_USER: 'smart_canteiro_current_user_v2',
};

// Configurações padrão de aprovação por cultura
export const DEFAULT_CONFIGS: ConfiguracaoAprovacao[] = [
  { cultura: 'Soja', percentualMinimo: 80 },
  { cultura: 'Milho', percentualMinimo: 85 },
  { cultura: 'Sorgo', percentualMinimo: 80 },
  { cultura: 'Algodão', percentualMinimo: 75 },
  { cultura: 'Feijão', percentualMinimo: 80 },
  { cultura: 'Trigo', percentualMinimo: 80 },
];

// Usuários padrão
export const DEFAULT_USERS: Usuario[] = [
  { id: 'usr-1', nome: 'admin', senha: '123', email: 'admin@sementes.com.br', perfil: 'Administrador', ativo: true },
  { id: 'usr-2', nome: 'Carlos Eduardo', senha: '123', email: 'carlos.admin@sementes.com.br', perfil: 'Administrador', ativo: true },
  { id: 'usr-3', nome: 'Mariana Silva', senha: '123', email: 'mariana.cq@sementas.com.br', perfil: 'Operador', ativo: true },
  { id: 'usr-4', nome: 'João Pedro', senha: '123', email: 'joao.campo@sementas.com.br', perfil: 'Operador', ativo: true },
  { id: 'usr-5', nome: 'Ana Paula', senha: '123', email: 'ana.consultoria@sementes.com.br', perfil: 'Visualizador', ativo: true },
];

// Gerador de foto placeholder de canteiro
const generateSeedlingPlaceholder = (title: string, color: string = '#2d6a4f') => {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 300;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#3d2b1f';
    ctx.fillRect(0, 0, 400, 300);

    ctx.strokeStyle = '#5c4033';
    ctx.lineWidth = 2;
    for (let i = 40; i < 400; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 300);
      ctx.stroke();
    }

    for (let x = 30; x < 380; x += 35) {
      for (let y = 40; y < 280; y += 45) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.rect(x, y + 10, 3, 15);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x - 4, y + 8, 8, 4, -0.4, 0, Math.PI * 2);
        ctx.ellipse(x + 6, y + 8, 8, 4, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 240, 400, 60);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(title, 15, 265);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#b7e4c7';
    ctx.fillText('CQ Smart Canteiro - Registro Fotográfico', 15, 285);
  }
  return canvas.toDataURL('image/jpeg', 0.85);
};

// Amostras Iniciais
const INITIAL_AMOSTRAS: Amostra[] = [
  {
    id: 'ams-101',
    protocolo: 'PRT-2026-001',
    cultura: 'Soja',
    cultivar: 'M 8349 IPRO',
    lote: 'L-2026-SOJ-881',
    peneira: '6.5',
    categoria: 'C1',
    safra: '2025/2026',
    dataSemeadura: '2026-07-15',
    responsavel: 'Mariana Silva (Qualidade)',
    observacoes: 'Amostra referente ao recebimento da Unidade Beneficiadora Uberaba.',
    status: 'Concluído',
    qrCode: 'PRT-2026-001',
    dataCadastro: '2026-07-15T08:30:00Z',
    dataAtualizacao: '2026-07-22T14:10:00Z',
    quantidadeSementes: 100,
  },
  {
    id: 'ams-102',
    protocolo: 'PRT-2026-002',
    cultura: 'Milho',
    cultivar: 'DKB 390 PRO3',
    lote: 'L-2026-MIL-402',
    peneira: 'R2L',
    categoria: 'S1',
    safra: '2025/2026',
    dataSemeadura: '2026-07-18',
    responsavel: 'João Pedro (Campo)',
    observacoes: 'Tratamento industrial de sementes (TIS) aplicado com fungicida e inseticida.',
    status: 'Concluído',
    qrCode: 'PRT-2026-002',
    dataCadastro: '2026-07-18T09:00:00Z',
    dataAtualizacao: '2026-07-25T10:15:00Z',
    quantidadeSementes: 100,
  },
  {
    id: 'ams-103',
    protocolo: 'PRT-2026-003',
    cultura: 'Soja',
    cultivar: 'BRASMAX DESAFIO',
    lote: 'L-2026-SOJ-904',
    peneira: '7.0',
    categoria: 'C2',
    safra: '2025/2026',
    dataSemeadura: '2026-07-21',
    responsavel: 'Mariana Silva (Qualidade)',
    observacoes: 'Teste de emergência em canteiro com areia fina lavada.',
    status: 'Pendente',
    qrCode: 'PRT-2026-003',
    dataCadastro: '2026-07-21T11:20:00Z',
    dataAtualizacao: '2026-07-21T11:20:00Z',
    quantidadeSementes: 100,
  },
  {
    id: 'ams-104',
    protocolo: 'PRT-2026-004',
    cultura: 'Sorgo',
    cultivar: 'NUGRAIN 430',
    lote: 'L-2026-SRG-115',
    peneira: '4.0',
    categoria: 'S2',
    safra: '2025/2026',
    dataSemeadura: '2026-07-22',
    responsavel: 'João Pedro (Campo)',
    observacoes: 'Canteiro estufado a 25°C com umidade controlada a 70%.',
    status: 'Pendente',
    qrCode: 'PRT-2026-004',
    dataCadastro: '2026-07-22T14:00:00Z',
    dataAtualizacao: '2026-07-22T14:00:00Z',
    quantidadeSementes: 100,
  },
  {
    id: 'ams-105',
    protocolo: 'PRT-2026-005',
    cultura: 'Algodão',
    cultivar: 'FM 975 GLT',
    lote: 'L-2026-ALG-088',
    peneira: '5.5',
    categoria: 'Básica',
    safra: '2025/2026',
    dataSemeadura: '2026-07-10',
    responsavel: 'Mariana Silva (Qualidade)',
    observacoes: 'Lote de alta linhagem genética. Sementes deslintadas.',
    status: 'Concluído',
    qrCode: 'PRT-2026-005',
    dataCadastro: '2026-07-10T10:00:00Z',
    dataAtualizacao: '2026-07-17T16:00:00Z',
    quantidadeSementes: 100,
  },
  {
    id: 'ams-106',
    protocolo: 'PRT-2026-006',
    cultura: 'Feijão',
    cultivar: 'BRS ESTILO',
    lote: 'L-2026-FEJ-332',
    peneira: '14/64',
    categoria: 'C1',
    safra: '2025/2026',
    dataSemeadura: '2026-07-24',
    responsavel: 'Carlos Eduardo (Admin)',
    observacoes: 'Sementes comerciais de feijão carioca.',
    status: 'Pendente',
    qrCode: 'PRT-2026-006',
    dataCadastro: '2026-07-24T09:15:00Z',
    dataAtualizacao: '2026-07-24T09:15:00Z',
    quantidadeSementes: 100,
  }
];

const INITIAL_AVALIACOES: Avaliacao[] = [
  {
    id: 'avl-101',
    amostraId: 'ams-101',
    fortes: 80,
    intermediarias: 7,
    fracas: 3,
    anormais: 2,
    mortas: 8,
    germinacao: 90,
    percentualAnormais: 2,
    percentualMortas: 8,
    resultadoAprovacao: 'Aprovado',
    observacoes: 'Vigor excelente nas plântulas fortes. Sistema radicular bem desenvolvido.',
    dataAvaliacao: '2026-07-22',
    horaAvaliacao: '14:10',
    usuarioAvaliador: 'Mariana Silva (Qualidade)',
  },
  {
    id: 'avl-102',
    amostraId: 'ams-102',
    fortes: 74,
    intermediarias: 8,
    fracas: 6,
    anormais: 4,
    mortas: 8,
    germinacao: 88,
    percentualAnormais: 4,
    percentualMortas: 8,
    resultadoAprovacao: 'Aprovado',
    observacoes: 'Germinação homogênea. Plântulas sem sintomas de tombamento.',
    dataAvaliacao: '2026-07-25',
    horaAvaliacao: '10:15',
    usuarioAvaliador: 'João Pedro (Campo)',
  },
  {
    id: 'avl-105',
    amostraId: 'ams-105',
    fortes: 58,
    intermediarias: 8,
    fracas: 5,
    anormais: 4,
    mortas: 25,
    germinacao: 71,
    percentualAnormais: 4,
    percentualMortas: 25,
    resultadoAprovacao: 'Reprovado',
    observacoes: 'Lote apresentou ataque de fungos de solo e cotilédones deformados.',
    dataAvaliacao: '2026-07-17',
    horaAvaliacao: '16:00',
    usuarioAvaliador: 'Mariana Silva (Qualidade)',
  }
];

// --- PARÂMETROS DE QUALIDADE POR CULTURA (CONFIGURÁVEIS E EXTENSÍVEIS) ---
export const DEFAULT_PARAMETROS_CULTURA: ParametroQualidadeCultura[] = [
  {
    id: 'sorgo',
    cultura: 'Sorgo',
    diasValidadePadrao: 180,
    diasAlertaVencimentoPadrao: 30,
    testes: [
      { id: 't-srg-1', nome: 'Germinação', unidade: '%', valorMinimo: 80, valorMeta: 85, tipoComparacao: 'MIN', obrigatorio: true, ordem: 1 },
      { id: 't-srg-2', nome: 'Vigor (Envelhecimento Acelerado)', unidade: '%', valorMinimo: 75, valorMeta: 80, tipoComparacao: 'MIN', obrigatorio: true, ordem: 2 },
      { id: 't-srg-3', nome: 'Pureza Física', unidade: '%', valorMinimo: 98.0, valorMeta: 99.0, tipoComparacao: 'MIN', obrigatorio: true, ordem: 3 },
      { id: 't-srg-4', nome: 'Umidade', unidade: '%', valorMaximo: 12.0, valorMeta: 11.0, tipoComparacao: 'MAX', obrigatorio: true, ordem: 4 },
      { id: 't-srg-5', nome: 'Antracnose (Colletotrichum)', unidade: '%', valorMaximo: 0.0, valorMeta: 0.0, tipoComparacao: 'MAX', obrigatorio: true, ordem: 5 },
      { id: 't-srg-6', nome: 'Sementes Ardidas', unidade: '%', valorMaximo: 2.0, valorMeta: 0.5, tipoComparacao: 'MAX', obrigatorio: false, ordem: 6 },
      { id: 't-srg-7', nome: 'Sementes com Gluma', unidade: '%', valorMaximo: 3.0, valorMeta: 1.0, tipoComparacao: 'MAX', obrigatorio: false, ordem: 7 },
      { id: 't-srg-8', nome: 'Sementes Germinadas na Panícula', unidade: '%', valorMaximo: 1.0, valorMeta: 0.0, tipoComparacao: 'MAX', obrigatorio: false, ordem: 8 },
      { id: 't-srg-9', nome: 'Material Inerte', unidade: '%', valorMaximo: 2.0, valorMeta: 1.0, tipoComparacao: 'MAX', obrigatorio: false, ordem: 9 },
    ]
  },
  {
    id: 'trigo',
    cultura: 'Trigo',
    diasValidadePadrao: 180,
    diasAlertaVencimentoPadrao: 30,
    testes: [
      { id: 't-trg-1', nome: 'Germinação', unidade: '%', valorMinimo: 80, valorMeta: 85, tipoComparacao: 'MIN', obrigatorio: true, ordem: 1 },
      { id: 't-trg-2', nome: 'Vigor (Primeira Contagem / Frio)', unidade: '%', valorMinimo: 75, valorMeta: 80, tipoComparacao: 'MIN', obrigatorio: true, ordem: 2 },
      { id: 't-trg-3', nome: 'Pureza Física', unidade: '%', valorMinimo: 98.0, valorMeta: 99.0, tipoComparacao: 'MIN', obrigatorio: true, ordem: 3 },
      { id: 't-trg-4', nome: 'Umidade', unidade: '%', valorMaximo: 13.0, valorMeta: 12.0, tipoComparacao: 'MAX', obrigatorio: true, ordem: 4 },
      { id: 't-trg-5', nome: 'Outras Cultivares', unidade: '%', valorMaximo: 0.5, valorMeta: 0.1, tipoComparacao: 'MAX', obrigatorio: false, ordem: 5 },
      { id: 't-trg-6', nome: 'Material Inerte', unidade: '%', valorMaximo: 2.0, valorMeta: 1.0, tipoComparacao: 'MAX', obrigatorio: false, ordem: 6 },
    ]
  },
  {
    id: 'algodao',
    cultura: 'Algodão',
    diasValidadePadrao: 180,
    diasAlertaVencimentoPadrao: 30,
    testes: [
      { id: 't-alg-1', nome: 'Germinação', unidade: '%', valorMinimo: 75, valorMeta: 80, tipoComparacao: 'MIN', obrigatorio: true, ordem: 1 },
      { id: 't-alg-2', nome: 'Vigor (Tetrazólio / Frio)', unidade: '%', valorMinimo: 70, valorMeta: 75, tipoComparacao: 'MIN', obrigatorio: true, ordem: 2 },
      { id: 't-alg-3', nome: 'Pureza Física', unidade: '%', valorMinimo: 98.0, valorMeta: 99.0, tipoComparacao: 'MIN', obrigatorio: true, ordem: 3 },
      { id: 't-alg-4', nome: 'Umidade', unidade: '%', valorMaximo: 10.0, valorMeta: 9.0, tipoComparacao: 'MAX', obrigatorio: true, ordem: 4 },
      { id: 't-alg-5', nome: 'Danos Mecânicos / Corte', unidade: '%', valorMaximo: 5.0, valorMeta: 2.0, tipoComparacao: 'MAX', obrigatorio: false, ordem: 5 },
      { id: 't-alg-6', nome: 'Sementes com Línter Residual', unidade: '%', valorMaximo: 2.0, valorMeta: 0.5, tipoComparacao: 'MAX', obrigatorio: false, ordem: 6 },
    ]
  },
  {
    id: 'soja',
    cultura: 'Soja',
    diasValidadePadrao: 180,
    diasAlertaVencimentoPadrao: 30,
    testes: [
      { id: 't-soj-1', nome: 'Germinação', unidade: '%', valorMinimo: 80, valorMeta: 85, tipoComparacao: 'MIN', obrigatorio: true, ordem: 1 },
      { id: 't-soj-2', nome: 'Vigor (Tetrazólio 1-3)', unidade: '%', valorMinimo: 75, valorMeta: 80, tipoComparacao: 'MIN', obrigatorio: true, ordem: 2 },
      { id: 't-soj-3', nome: 'Pureza Física', unidade: '%', valorMinimo: 98.0, valorMeta: 99.0, tipoComparacao: 'MIN', obrigatorio: true, ordem: 3 },
      { id: 't-soj-4', nome: 'Umidade', unidade: '%', valorMaximo: 12.0, valorMeta: 11.5, tipoComparacao: 'MAX', obrigatorio: true, ordem: 4 },
      { id: 't-soj-5', nome: 'Dano Mecânico (TZ)', unidade: '%', valorMaximo: 6.0, valorMeta: 3.0, tipoComparacao: 'MAX', obrigatorio: false, ordem: 5 },
      { id: 't-soj-6', nome: 'Dano por Percevejo (TZ)', unidade: '%', valorMaximo: 4.0, valorMeta: 1.5, tipoComparacao: 'MAX', obrigatorio: false, ordem: 6 },
      { id: 't-soj-7', nome: 'Dano por Umidade / Deterioração', unidade: '%', valorMaximo: 4.0, valorMeta: 1.5, tipoComparacao: 'MAX', obrigatorio: false, ordem: 7 },
    ]
  },
  {
    id: 'milho',
    cultura: 'Milho',
    diasValidadePadrao: 180,
    diasAlertaVencimentoPadrao: 30,
    testes: [
      { id: 't-mil-1', nome: 'Germinação', unidade: '%', valorMinimo: 85, valorMeta: 90, tipoComparacao: 'MIN', obrigatorio: true, ordem: 1 },
      { id: 't-mil-2', nome: 'Vigor (Teste de Frio)', unidade: '%', valorMinimo: 80, valorMeta: 85, tipoComparacao: 'MIN', obrigatorio: true, ordem: 2 },
      { id: 't-mil-3', nome: 'Pureza Física', unidade: '%', valorMinimo: 98.0, valorMeta: 99.0, tipoComparacao: 'MIN', obrigatorio: true, ordem: 3 },
      { id: 't-mil-4', nome: 'Umidade', unidade: '%', valorMaximo: 12.5, valorMeta: 11.5, tipoComparacao: 'MAX', obrigatorio: true, ordem: 4 },
      { id: 't-mil-5', nome: 'Sementes Quebradas / Rachadas', unidade: '%', valorMaximo: 2.0, valorMeta: 0.5, tipoComparacao: 'MAX', obrigatorio: false, ordem: 5 },
    ]
  },
  {
    id: 'feijao',
    cultura: 'Feijão',
    diasValidadePadrao: 180,
    diasAlertaVencimentoPadrao: 30,
    testes: [
      { id: 't-fej-1', nome: 'Germinação', unidade: '%', valorMinimo: 80, valorMeta: 85, tipoComparacao: 'MIN', obrigatorio: true, ordem: 1 },
      { id: 't-fej-2', nome: 'Vigor (Primeira Contagem)', unidade: '%', valorMinimo: 75, valorMeta: 80, tipoComparacao: 'MIN', obrigatorio: true, ordem: 2 },
      { id: 't-fej-3', nome: 'Pureza Física', unidade: '%', valorMinimo: 98.0, valorMeta: 99.0, tipoComparacao: 'MIN', obrigatorio: true, ordem: 3 },
      { id: 't-fej-4', nome: 'Umidade', unidade: '%', valorMaximo: 12.0, valorMeta: 11.0, tipoComparacao: 'MAX', obrigatorio: true, ordem: 4 },
    ]
  }
];

// Documento demonstrativo de certificado (PNG placeholder em base64)
const generateCertificatePlaceholder = (numeroCert: string, lote: string, cultura: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#fbfbfa';
    ctx.fillRect(0, 0, 600, 800);

    ctx.strokeStyle = '#1b4332';
    ctx.lineWidth = 6;
    ctx.strokeRect(20, 20, 560, 760);
    ctx.strokeStyle = '#74c69d';
    ctx.lineWidth = 2;
    ctx.strokeRect(26, 26, 548, 748);

    ctx.fillStyle = '#1b4332';
    ctx.fillRect(30, 30, 540, 70);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('CERTIFICADO OFICIAL DE ANÁLISE DE SEMENTES', 60, 65);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#d8f3dc';
    ctx.fillText('LABORATÓRIO CREDENCIADO NO MAPA / RENASEM', 150, 85);

    ctx.fillStyle = '#1b4332';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`CERTIFICADO Nº: ${numeroCert}`, 50, 150);

    ctx.fillStyle = '#333333';
    ctx.font = '14px sans-serif';
    ctx.fillText(`Lote: ${lote}`, 50, 190);
    ctx.fillText(`Cultura: ${cultura}`, 50, 220);
    ctx.fillText(`Emitido em: 2026-07-20`, 50, 250);
    ctx.fillText(`Validade Legal: 180 dias`, 50, 280);

    ctx.fillStyle = '#2d6a4f';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('RESULTADOS LABORATORIAIS HOMOLOGADOS', 50, 340);
    ctx.fillStyle = '#444444';
    ctx.font = '13px sans-serif';
    ctx.fillText('• Germinação Padrão: 92%', 70, 375);
    ctx.fillText('• Vigor Fisiológico: 88%', 70, 405);
    ctx.fillText('• Pureza Física: 99.2%', 70, 435);
    ctx.fillText('• Grau de Umidade: 11.2%', 70, 465);

    ctx.fillStyle = '#081c15';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('PARECER: LOTE APROVADO PARA COMERCIALIZAÇÃO', 50, 530);

    // Carimbo e Assinatura
    ctx.strokeStyle = '#2b7a78';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(450, 660, 60, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#2b7a78';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('LABORATÓRIO LAS', 400, 650);
    ctx.fillText('HOMOLOGADO MAPA', 390, 670);

    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(70, 700);
    ctx.lineTo(300, 700);
    ctx.stroke();
    ctx.fillStyle = '#555';
    ctx.font = '12px sans-serif';
    ctx.fillText('Dr. Fernando Castro - Resp. Técnico (CRQ)', 70, 720);
  }
  return canvas.toDataURL('image/png');
};

// --- ANÁLISES INICIAIS DE QUALIDADE ---
export const INITIAL_ANALISES_QUALIDADE: AnaliseQualidade[] = [
  // 1. SORGO (S2) - Análise Original
  {
    id: 'anl-srg-101',
    loteId: 'lot-srg-101',
    numeroAnalise: 1,
    tipo: 'ORIGINAL',
    dataAnalise: '2026-07-20',
    dataValidade: '2027-01-20',
    laboratorio: 'Laboratório Central CQ Sementes',
    numeroCertificadoLaudo: 'LAUDO-CQ-2026/0891',
    responsavel: 'Mariana Silva (Qualidade)',
    usuarioRegistro: 'Mariana Silva',
    dataRegistro: '2026-07-20T10:00:00Z',
    parametrosSnapshot: DEFAULT_PARAMETROS_CULTURA.find(p => p.id === 'sorgo')!.testes,
    resultados: [
      { testeId: 't-srg-1', nomeTeste: 'Germinação', unidade: '%', valorResultado: 90, valorMinimo: 80, valorMeta: 85, situacao: 'CONFORME' },
      { testeId: 't-srg-2', nomeTeste: 'Vigor (Envelhecimento Acelerado)', unidade: '%', valorResultado: 85, valorMinimo: 75, valorMeta: 80, situacao: 'CONFORME' },
      { testeId: 't-srg-3', nomeTeste: 'Pureza Física', unidade: '%', valorResultado: 99.0, valorMinimo: 98.0, valorMeta: 99.0, situacao: 'CONFORME' },
      { testeId: 't-srg-4', nomeTeste: 'Umidade', unidade: '%', valorResultado: 11.0, valorMaximo: 12.0, valorMeta: 11.0, situacao: 'CONFORME' },
      { testeId: 't-srg-5', nomeTeste: 'Antracnose (Colletotrichum)', unidade: '%', valorResultado: 0.0, valorMaximo: 0.0, valorMeta: 0.0, situacao: 'CONFORME' },
      { testeId: 't-srg-6', nomeTeste: 'Sementes Ardidas', unidade: '%', valorResultado: 0.5, valorMaximo: 2.0, valorMeta: 0.5, situacao: 'CONFORME' },
      { testeId: 't-srg-7', nomeTeste: 'Sementes com Gluma', unidade: '%', valorResultado: 1.2, valorMaximo: 3.0, valorMeta: 1.0, situacao: 'CONFORME' },
      { testeId: 't-srg-8', nomeTeste: 'Sementes Germinadas na Panícula', unidade: '%', valorResultado: 0.0, valorMaximo: 1.0, valorMeta: 0.0, situacao: 'CONFORME' },
      { testeId: 't-srg-9', nomeTeste: 'Material Inerte', unidade: '%', valorResultado: 0.8, valorMaximo: 2.0, valorMeta: 1.0, situacao: 'CONFORME' },
    ],
    resultadoGeralConforme: true,
    termoConformidadeGerado: true,
    termoConformidadeDataEmissao: '2026-07-20',
    termoConformidadeNumeroDoc: 'TC-L-2026-SRG-115-ORIG-2026',
    observacoes: 'Lote de sorgo com excelente qualidade física e sanitária. Pronto para comercialização.'
  },

  // 2. SOJA (C1) - Análise Original com Certificado LAS
  {
    id: 'anl-soj-101',
    loteId: 'lot-soj-101',
    numeroAnalise: 1,
    tipo: 'ORIGINAL',
    dataAnalise: '2026-06-15',
    dataValidade: '2026-12-15',
    laboratorio: 'LAS - Laboratório de Análise de Sementes Uberaba (RENASEM MG-012/2026)',
    numeroCertificadoLaudo: 'CERT-LAS-8812/2026',
    responsavel: 'Carlos Eduardo (Admin)',
    usuarioRegistro: 'Carlos Eduardo',
    dataRegistro: '2026-06-15T14:30:00Z',
    parametrosSnapshot: DEFAULT_PARAMETROS_CULTURA.find(p => p.id === 'soja')!.testes,
    resultados: [
      { testeId: 't-soj-1', nomeTeste: 'Germinação', unidade: '%', valorResultado: 92, valorMinimo: 80, valorMeta: 85, situacao: 'CONFORME' },
      { testeId: 't-soj-2', nomeTeste: 'Vigor (Tetrazólio 1-3)', unidade: '%', valorResultado: 88, valorMinimo: 75, valorMeta: 80, situacao: 'CONFORME' },
      { testeId: 't-soj-3', nomeTeste: 'Pureza Física', unidade: '%', valorResultado: 99.4, valorMinimo: 98.0, valorMeta: 99.0, situacao: 'CONFORME' },
      { testeId: 't-soj-4', nomeTeste: 'Umidade', unidade: '%', valorResultado: 11.2, valorMaximo: 12.0, valorMeta: 11.5, situacao: 'CONFORME' },
      { testeId: 't-soj-5', nomeTeste: 'Dano Mecânico (TZ)', unidade: '%', valorResultado: 2.5, valorMaximo: 6.0, valorMeta: 3.0, situacao: 'CONFORME' },
      { testeId: 't-soj-6', nomeTeste: 'Dano por Percevejo (TZ)', unidade: '%', valorResultado: 1.0, valorMaximo: 4.0, valorMeta: 1.5, situacao: 'CONFORME' },
      { testeId: 't-soj-7', nomeTeste: 'Dano por Umidade / Deterioração', unidade: '%', valorResultado: 0.8, valorMaximo: 4.0, valorMeta: 1.5, situacao: 'CONFORME' },
    ],
    resultadoGeralConforme: true,
    documentoAnexo: {
      id: 'doc-soj-881',
      loteId: 'lot-soj-101',
      analiseId: 'anl-soj-101',
      tipo: 'CERTIFICADO',
      nomeArquivo: 'Certificado_Oficial_L2026_SOJ_881.png',
      dataUpload: '2026-06-15T15:00:00Z',
      arquivoBase64: generateCertificatePlaceholder('CERT-LAS-8812/2026', 'L-2026-SOJ-881', 'Soja M 8349 IPRO'),
      tipoMime: 'image/png',
      numeroDocumento: 'CERT-LAS-8812/2026',
      emitidoPor: 'LAS Uberaba'
    },
    observacoes: 'Certificado oficial homologado pelo MAPA.'
  },

  // 3. ALGODÃO (Básica) - Próximo do vencimento (Alerta < 30 dias)
  {
    id: 'anl-alg-101',
    loteId: 'lot-alg-101',
    numeroAnalise: 1,
    tipo: 'ORIGINAL',
    dataAnalise: '2026-03-05',
    dataValidade: '2026-09-05', // Faltam ~17 dias do 2026-08-19
    laboratorio: 'Lab Biotecnologia & Genética',
    numeroCertificadoLaudo: 'CERT-ALG-044/2026',
    responsavel: 'Mariana Silva (Qualidade)',
    usuarioRegistro: 'Mariana Silva',
    dataRegistro: '2026-03-05T09:00:00Z',
    parametrosSnapshot: DEFAULT_PARAMETROS_CULTURA.find(p => p.id === 'algodao')!.testes,
    resultados: [
      { testeId: 't-alg-1', nomeTeste: 'Germinação', unidade: '%', valorResultado: 82, valorMinimo: 75, valorMeta: 80, situacao: 'CONFORME' },
      { testeId: 't-alg-2', nomeTeste: 'Vigor (Tetrazólio / Frio)', unidade: '%', valorMinimo: 70, valorMeta: 75, valorResultado: 78, situacao: 'CONFORME' },
      { testeId: 't-alg-3', nomeTeste: 'Pureza Física', unidade: '%', valorResultado: 98.8, valorMinimo: 98.0, valorMeta: 99.0, situacao: 'CONFORME' },
      { testeId: 't-alg-4', nomeTeste: 'Umidade', unidade: '%', valorResultado: 9.4, valorMaximo: 10.0, valorMeta: 9.0, situacao: 'CONFORME' },
      { testeId: 't-alg-5', nomeTeste: 'Danos Mecânicos / Corte', unidade: '%', valorResultado: 2.1, valorMaximo: 5.0, valorMeta: 2.0, situacao: 'CONFORME' },
      { testeId: 't-alg-6', nomeTeste: 'Sementes com Línter Residual', unidade: '%', valorResultado: 0.4, valorMaximo: 2.0, valorMeta: 0.5, situacao: 'CONFORME' },
    ],
    resultadoGeralConforme: true,
    documentoAnexo: {
      id: 'doc-alg-088',
      loteId: 'lot-alg-101',
      analiseId: 'anl-alg-101',
      tipo: 'CERTIFICADO',
      nomeArquivo: 'Certificado_Genetica_ALG088.png',
      dataUpload: '2026-03-05T09:30:00Z',
      arquivoBase64: generateCertificatePlaceholder('CERT-ALG-044/2026', 'L-2026-ALG-088', 'Algodão FM 975 GLT'),
      tipoMime: 'image/png',
      numeroDocumento: 'CERT-ALG-044/2026'
    },
    observacoes: 'Lote de sementes básicas. Necessita de reanálise programada para renovação do certificado.'
  },

  // 4. TRIGO (C2) - Vencido (Validade 2026-08-01 < 2026-08-19)
  {
    id: 'anl-trg-101',
    loteId: 'lot-trg-101',
    numeroAnalise: 1,
    tipo: 'ORIGINAL',
    dataAnalise: '2026-02-01',
    dataValidade: '2026-08-01',
    laboratorio: 'Laboratório Regional Passo Fundo',
    numeroCertificadoLaudo: 'LAUDO-TRG-1190/2026',
    responsavel: 'João Pedro (Campo)',
    usuarioRegistro: 'João Pedro',
    dataRegistro: '2026-02-01T11:00:00Z',
    parametrosSnapshot: DEFAULT_PARAMETROS_CULTURA.find(p => p.id === 'trigo')!.testes,
    resultados: [
      { testeId: 't-trg-1', nomeTeste: 'Germinação', unidade: '%', valorResultado: 84, valorMinimo: 80, valorMeta: 85, situacao: 'CONFORME' },
      { testeId: 't-trg-2', nomeTeste: 'Vigor (Primeira Contagem / Frio)', unidade: '%', valorResultado: 78, valorMinimo: 75, valorMeta: 80, situacao: 'CONFORME' },
      { testeId: 't-trg-3', nomeTeste: 'Pureza Física', unidade: '%', valorResultado: 98.5, valorMinimo: 98.0, valorMeta: 99.0, situacao: 'CONFORME' },
      { testeId: 't-trg-4', nomeTeste: 'Umidade', unidade: '%', valorResultado: 12.1, valorMaximo: 13.0, valorMeta: 12.0, situacao: 'CONFORME' },
    ],
    resultadoGeralConforme: true,
    observacoes: 'Validade da análise expirada. Lote retido para processo de reanálise física e fisiológica.'
  },

  // 5. MILHO (S1) - Análise Original + Reanálise #01
  {
    id: 'anl-mil-orig',
    loteId: 'lot-mil-101',
    numeroAnalise: 1,
    tipo: 'ORIGINAL',
    dataAnalise: '2026-01-10',
    dataValidade: '2026-07-10',
    laboratorio: 'Laboratório Central CQ',
    numeroCertificadoLaudo: 'CQ-MIL-001/2026',
    responsavel: 'Mariana Silva (Qualidade)',
    usuarioRegistro: 'Mariana Silva',
    dataRegistro: '2026-01-10T14:00:00Z',
    parametrosSnapshot: DEFAULT_PARAMETROS_CULTURA.find(p => p.id === 'milho')!.testes,
    resultados: [
      { testeId: 't-mil-1', nomeTeste: 'Germinação', unidade: '%', valorResultado: 91, valorMinimo: 85, valorMeta: 90, situacao: 'CONFORME' },
      { testeId: 't-mil-2', nomeTeste: 'Vigor (Teste de Frio)', unidade: '%', valorResultado: 86, valorMinimo: 80, valorMeta: 85, situacao: 'CONFORME' },
      { testeId: 't-mil-3', nomeTeste: 'Pureza Física', unidade: '%', valorResultado: 99.1, valorMinimo: 98.0, valorMeta: 99.0, situacao: 'CONFORME' },
      { testeId: 't-mil-4', nomeTeste: 'Umidade', unidade: '%', valorResultado: 11.3, valorMaximo: 12.5, valorMeta: 11.5, situacao: 'CONFORME' },
    ],
    resultadoGeralConforme: true,
    termoConformidadeGerado: true,
    termoConformidadeDataEmissao: '2026-01-10',
    termoConformidadeNumeroDoc: 'TC-L-2026-MIL-402-ORIG-2026',
    observacoes: 'Análise original de recebimento.'
  },
  {
    id: 'anl-mil-rean1',
    loteId: 'lot-mil-101',
    numeroAnalise: 2,
    tipo: 'REANALISE',
    reanaliseDeId: 'anl-mil-orig',
    dataAnalise: '2026-07-08',
    dataValidade: '2027-01-08',
    laboratorio: 'Laboratório Central CQ',
    numeroCertificadoLaudo: 'CQ-MIL-REAN-082/2026',
    responsavel: 'Mariana Silva (Qualidade)',
    usuarioRegistro: 'Mariana Silva',
    dataRegistro: '2026-07-08T16:00:00Z',
    parametrosSnapshot: DEFAULT_PARAMETROS_CULTURA.find(p => p.id === 'milho')!.testes, // Critérios copiados da original
    resultados: [
      { testeId: 't-mil-1', nomeTeste: 'Germinação', unidade: '%', valorResultado: 89, valorMinimo: 85, valorMeta: 90, situacao: 'CONFORME' },
      { testeId: 't-mil-2', nomeTeste: 'Vigor (Teste de Frio)', unidade: '%', valorResultado: 84, valorMinimo: 80, valorMeta: 85, situacao: 'CONFORME' },
      { testeId: 't-mil-3', nomeTeste: 'Pureza Física', unidade: '%', valorResultado: 99.1, valorMinimo: 98.0, valorMeta: 99.0, situacao: 'CONFORME' },
      { testeId: 't-mil-4', nomeTeste: 'Umidade', unidade: '%', valorResultado: 11.4, valorMaximo: 12.5, valorMeta: 11.5, situacao: 'CONFORME' },
    ],
    resultadoGeralConforme: true,
    termoConformidadeGerado: true,
    termoConformidadeDataEmissao: '2026-07-08',
    termoConformidadeNumeroDoc: 'TC-L-2026-MIL-402-REAN1-2026',
    observacoes: 'Reanálise semestral com manutenção satisfatória do vigor e germinação.'
  },

  // 6. FEIJÃO (C1) - Sem Documentação Anexada
  {
    id: 'anl-fej-101',
    loteId: 'lot-fej-101',
    numeroAnalise: 1,
    tipo: 'ORIGINAL',
    dataAnalise: '2026-07-25',
    dataValidade: '2027-01-25',
    laboratorio: 'Lab Interno CQ',
    numeroCertificadoLaudo: 'LAUDO-FEJ-332/2026',
    responsavel: 'Carlos Eduardo (Admin)',
    usuarioRegistro: 'Carlos Eduardo',
    dataRegistro: '2026-07-25T11:20:00Z',
    parametrosSnapshot: DEFAULT_PARAMETROS_CULTURA.find(p => p.id === 'feijao')!.testes,
    resultados: [
      { testeId: 't-fej-1', nomeTeste: 'Germinação', unidade: '%', valorResultado: 88, valorMinimo: 80, valorMeta: 85, situacao: 'CONFORME' },
      { testeId: 't-fej-2', nomeTeste: 'Vigor (Primeira Contagem)', unidade: '%', valorResultado: 82, valorMinimo: 75, valorMeta: 80, situacao: 'CONFORME' },
      { testeId: 't-fej-3', nomeTeste: 'Pureza Física', unidade: '%', valorResultado: 98.9, valorMinimo: 98.0, valorMeta: 99.0, situacao: 'CONFORME' },
      { testeId: 't-fej-4', nomeTeste: 'Umidade', unidade: '%', valorResultado: 11.5, valorMaximo: 12.0, valorMeta: 11.0, situacao: 'CONFORME' },
    ],
    resultadoGeralConforme: true,
    observacoes: 'Aguardando upload do certificado definitivo do laboratório credenciado.'
  }
];

// --- LOTES INICIAIS DE QUALIDADE ---
export const INITIAL_LOTES_QUALIDADE: LoteQualidade[] = [
  {
    id: 'lot-srg-101',
    lote: 'L-2026-SRG-115',
    cultura: 'Sorgo',
    cultivar: 'NUGRAIN 430',
    categoria: 'S2',
    safra: '2025/2026',
    quantidade: '25.000 kg',
    peneira: '4.0',
    tsiTratamento: 'TSI Premium Fungicida + Inseticida',
    analiseOriginalId: 'anl-srg-101',
    analiseAtualId: 'anl-srg-101',
    totalReanalises: 0,
    emReanalise: false,
    dataUltimaAnalise: '2026-07-20',
    dataValidadeAtual: '2027-01-20',
    statusValidade: 'VALIDO',
    germinacaoAtual: 90,
    vigorAtual: 85,
    purezaAtual: 99.0,
    umidadeAtual: 11.0,
    temDocumento: true,
    tipoDocumentoPrincipal: 'TERMO_CONFORMIDADE',
    dataCadastro: '2026-07-20T10:00:00Z',
    dataAtualizacao: '2026-07-20T10:00:00Z',
  },
  {
    id: 'lot-soj-101',
    lote: 'L-2026-SOJ-881',
    cultura: 'Soja',
    cultivar: 'M 8349 IPRO',
    categoria: 'C1',
    safra: '2025/2026',
    quantidade: '40.000 kg',
    peneira: '6.5',
    tsiTratamento: 'Inoculante + Fungicida',
    analiseOriginalId: 'anl-soj-101',
    analiseAtualId: 'anl-soj-101',
    totalReanalises: 0,
    emReanalise: false,
    dataUltimaAnalise: '2026-06-15',
    dataValidadeAtual: '2026-12-15',
    statusValidade: 'VALIDO',
    germinacaoAtual: 92,
    vigorAtual: 88,
    purezaAtual: 99.4,
    umidadeAtual: 11.2,
    temDocumento: true,
    tipoDocumentoPrincipal: 'CERTIFICADO',
    dataCadastro: '2026-06-15T14:30:00Z',
    dataAtualizacao: '2026-06-15T14:30:00Z',
  },
  {
    id: 'lot-alg-101',
    lote: 'L-2026-ALG-088',
    cultura: 'Algodão',
    cultivar: 'FM 975 GLT',
    categoria: 'Básica',
    safra: '2025/2026',
    quantidade: '12.000 kg',
    peneira: '5.5',
    tsiTratamento: 'Deslintada Quimicamente',
    analiseOriginalId: 'anl-alg-101',
    analiseAtualId: 'anl-alg-101',
    totalReanalises: 0,
    emReanalise: false,
    dataUltimaAnalise: '2026-03-05',
    dataValidadeAtual: '2026-09-05',
    statusValidade: 'PROXIMO_VENCIMENTO',
    germinacaoAtual: 82,
    vigorAtual: 78,
    purezaAtual: 98.8,
    umidadeAtual: 9.4,
    temDocumento: true,
    tipoDocumentoPrincipal: 'CERTIFICADO',
    dataCadastro: '2026-03-05T09:00:00Z',
    dataAtualizacao: '2026-03-05T09:00:00Z',
  },
  {
    id: 'lot-trg-101',
    lote: 'L-2026-TRG-504',
    cultura: 'Trigo',
    cultivar: 'BRS PASTOREIO',
    categoria: 'C2',
    safra: '2025/2026',
    quantidade: '30.000 kg',
    peneira: 'Padrão',
    tsiTratamento: 'Sem Tratamento Químico',
    analiseOriginalId: 'anl-trg-101',
    analiseAtualId: 'anl-trg-101',
    totalReanalises: 0,
    emReanalise: false,
    dataUltimaAnalise: '2026-02-01',
    dataValidadeAtual: '2026-08-01',
    statusValidade: 'VENCIDO',
    germinacaoAtual: 84,
    vigorAtual: 78,
    purezaAtual: 98.5,
    umidadeAtual: 12.1,
    temDocumento: false,
    tipoDocumentoPrincipal: 'CERTIFICADO',
    dataCadastro: '2026-02-01T11:00:00Z',
    dataAtualizacao: '2026-02-01T11:00:00Z',
  },
  {
    id: 'lot-mil-101',
    lote: 'L-2026-MIL-402',
    cultura: 'Milho',
    cultivar: 'DKB 390 PRO3',
    categoria: 'S1',
    safra: '2025/2026',
    quantidade: '800 sc (40.000 kg)',
    peneira: 'R2L',
    tsiTratamento: 'Tratamento Industrial Maxim Quattro + Cruiser',
    analiseOriginalId: 'anl-mil-orig',
    analiseAtualId: 'anl-mil-rean1',
    totalReanalises: 1,
    emReanalise: false,
    dataUltimaAnalise: '2026-07-08',
    dataValidadeAtual: '2027-01-08',
    statusValidade: 'VALIDO',
    germinacaoAtual: 89,
    vigorAtual: 84,
    purezaAtual: 99.1,
    umidadeAtual: 11.4,
    temDocumento: true,
    tipoDocumentoPrincipal: 'TERMO_CONFORMIDADE',
    dataCadastro: '2026-01-10T14:00:00Z',
    dataAtualizacao: '2026-07-08T16:00:00Z',
  },
  {
    id: 'lot-fej-101',
    lote: 'L-2026-FEJ-332',
    cultura: 'Feijão',
    cultivar: 'BRS ESTILO',
    categoria: 'C1',
    safra: '2025/2026',
    quantidade: '15.000 kg',
    peneira: '14/64',
    tsiTratamento: 'Padrão Comercial',
    analiseOriginalId: 'anl-fej-101',
    analiseAtualId: 'anl-fej-101',
    totalReanalises: 0,
    emReanalise: false,
    dataUltimaAnalise: '2026-07-25',
    dataValidadeAtual: '2027-01-25',
    statusValidade: 'SEM_DOCUMENTO',
    germinacaoAtual: 88,
    vigorAtual: 82,
    purezaAtual: 98.9,
    umidadeAtual: 11.5,
    temDocumento: false,
    tipoDocumentoPrincipal: 'CERTIFICADO',
    dataCadastro: '2026-07-25T11:20:00Z',
    dataAtualizacao: '2026-07-25T11:20:00Z',
  }
];

class StorageService {
  private amostras: Amostra[] = INITIAL_AMOSTRAS;
  private avaliacoes: Avaliacao[] = INITIAL_AVALIACOES;
  private fotos: FotoAmostra[] = [];
  private configuracoes: ConfiguracaoAprovacao[] = DEFAULT_CONFIGS;
  private usuarios: Usuario[] = DEFAULT_USERS;

  // Coleções do Módulo de Qualidade de Lotes
  private lotesQualidade: LoteQualidade[] = INITIAL_LOTES_QUALIDADE;
  private analisesQualidade: AnaliseQualidade[] = INITIAL_ANALISES_QUALIDADE;
  private parametrosQualidadeCultura: ParametroQualidadeCultura[] = DEFAULT_PARAMETROS_CULTURA;
  private auditoriasQualidade: AuditoriaQualidade[] = [];
  private configAlertasQualidade: ConfiguracaoAlertasQualidade = { diasAlertaAntecedencia: 30 };
  private configTermoConformidade: ConfiguracaoTermoConformidade = {
    razaoSocial: 'SMART SEMENTES & BIOTECNOLOGIA LTDA.',
    cnpj: '12.345.678/0001-90',
    renasem: 'SP-09876/2026',
    endereco: 'Rodovia Agrícola Km 45 - Distrito Agroindustrial',
    cidadeUf: 'Uberaba - MG',
    responsavelTecnico: 'Dr. Roberto Magalhães - Eng. Agrônomo',
    creaRenasem: 'CREA 12345/D - RENASEM RT-54321',
    declaracaoLegal: 'Declaro, para os devidos fins de direito e sob as penas da lei, que o lote de sementes acima identificado foi produzido, beneficiado, amostrado e analisado em estrita conformidade com os padrões e normas estabelecidos pelo Ministério da Agricultura e Pecuária (MAPA), atendendo plenamente aos índices mínimos legais de germinação, pureza e sanidade vigentes.',
    observacoesPadrao: 'Sementes acondicionadas em embalagens invioláveis. Conservar em local seco, ventilado e sobre estrados.',
  };


  private isInitialized = false;
  private listeners: Set<() => void> = new Set();
  private firebaseUser: FirebaseUser | null = null;
  private syncRunning = false;
  private pendingSyncCount = 0;

  constructor() {
    this.initLocalStorageAndIndexedDB();
    this.initFirebase();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.syncAllPendingFotos();
        this.processSyncQueue();
      });

      // Background heartbeat sync worker a cada 10 segundos
      setInterval(() => {
        if (navigator.onLine) {
          this.syncAllPendingFotos();
          this.processSyncQueue();
        }
      }, 10000);
    }
  }

  private async initLocalStorageAndIndexedDB() {
    try {
      const localAmostras = await indexedDbService.getAllAmostrasLocal();
      if (localAmostras && localAmostras.length > 0) {
        this.amostras = localAmostras;
      }
      const localAvaliacoes = await indexedDbService.getAllAvaliacoesLocal();
      if (localAvaliacoes && localAvaliacoes.length > 0) {
        this.avaliacoes = localAvaliacoes;
      }
      const localFotos = await indexedDbService.getAllFotosLocal();
      if (localFotos && localFotos.length > 0) {
        this.fotos = localFotos;
      }
      const pendingItems = await indexedDbService.getPendingSyncItems();
      this.pendingSyncCount = pendingItems.length;
      this.notify();

      if (typeof window !== 'undefined' && navigator.onLine) {
        setTimeout(() => this.processSyncQueue(), 500);
      }
    } catch (e) {
      console.warn('Erro ao carregar dados do IndexedDB local:', e);
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(fn => {
      try {
        fn();
      } catch (e) {
        console.error('Erro em listener do storage:', e);
      }
    });
  }

  private authAttempted = false;

  private async ensureFirebaseAuth() {
    if (auth.currentUser) return auth.currentUser;
    if (this.authAttempted) return null;
    this.authAttempted = true;

    try {
      const res = await signInAnonymously(auth);
      return res.user;
    } catch (e: any) {
      // Se autenticação anônima não estiver habilitada no projeto Firebase,
      // as operações do Firestore continuam funcionando perfeitamente sem gerar erros 400.
      return null;
    }
  }

  private sanitizeForFirestore<T extends Record<string, any>>(obj: T): T {
    const result: Record<string, any> = {};
    Object.keys(obj).forEach((key) => {
      const val = obj[key];
      if (val !== undefined) {
        result[key] = val;
      } else {
        result[key] = '';
      }
    });
    return result as T;
  }

  private async initFirebase() {
    // Iniciar imediatamente os listeners em tempo real do Firestore
    this.setupRealtimeListeners();

    // Escutar estado do Firebase Auth para associar usuário logado se disponível
    onAuthStateChanged(auth, async (user) => {
      this.firebaseUser = user;
      if (!user && !this.authAttempted) {
        try {
          await this.ensureFirebaseAuth();
        } catch {
          // fallback silencioso
        }
      }
    });
  }

  private setupRealtimeListeners() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // --- COLLECTION: AMOSTRAS ---
    onSnapshot(collection(db, 'amostras'), async (snapshot) => {
      if (snapshot.empty) {
        // Se a coleção estiver vazia no Firestore, migra dados iniciais/locais
        await this.seedCollection('amostras', INITIAL_AMOSTRAS);
      } else {
        this.amostras = snapshot.docs.map(doc => doc.data() as Amostra);
        this.notify();
      }
    }, (err) => console.error('Erro em snapshot amostras:', err));

    // --- COLLECTION: AVALIACOES ---
    onSnapshot(collection(db, 'avaliacoes'), async (snapshot) => {
      if (snapshot.empty) {
        await this.seedCollection('avaliacoes', INITIAL_AVALIACOES);
      } else {
        this.avaliacoes = snapshot.docs.map(doc => doc.data() as Avaliacao);
        this.notify();
      }
    }, (err) => console.error('Erro em snapshot avaliacoes:', err));

    // --- COLLECTION: FOTOS ---
    onSnapshot(collection(db, 'fotos'), async (snapshot) => {
      if (snapshot.empty) {
        const initialFotos: FotoAmostra[] = [
          {
            id: 'ft-101-1',
            amostraId: 'ams-101',
            foto: generateSeedlingPlaceholder('Plântulas Soja - PRT-2026-001', '#2d6a4f'),
            dataUpload: '2026-07-22T14:12:00Z',
            nome: 'Avaliação 7º Dia - Vista Superior',
            descricao: 'Desenvolvimento uniforme das plântulas em areia.',
            syncStatus: 'sincronizado',
          },
          {
            id: 'ft-102-1',
            amostraId: 'ams-102',
            foto: generateSeedlingPlaceholder('Canteiro Milho - PRT-2026-002', '#1b4332'),
            dataUpload: '2026-07-25T10:18:00Z',
            nome: 'Emergência Milho 7 Dias',
            descricao: 'Plântulas fortes e cor coleóptilo normal.',
            syncStatus: 'sincronizado',
          }
        ];
        await this.seedCollection('fotos', initialFotos);
      } else {
        const remoteFotos = snapshot.docs.map(doc => {
          const data = doc.data() as FotoAmostra;
          return { ...data, syncStatus: 'sincronizado' as const };
        });

        // Preserva fotos locais pendentes que ainda não foram sincronizadas
        const fotosMap = new Map<string, FotoAmostra>();
        
        // 1. Adiciona fotos remotas do Firestore
        remoteFotos.forEach(rf => {
          fotosMap.set(rf.id, rf);
        });

        // 2. Mantém quaisquer fotos locais pendentes de sincronização
        this.fotos.forEach(lf => {
          if (!fotosMap.has(lf.id) || lf.syncStatus === 'pendente' || lf.syncStatus === 'sincronizando') {
            fotosMap.set(lf.id, lf);
          }
        });

        this.fotos = Array.from(fotosMap.values()).sort((a, b) => 
          new Date(b.dataUpload).getTime() - new Date(a.dataUpload).getTime()
        );

        // Cacheia localmente no IndexedDB para disponibilidade 100% offline
        for (const f of this.fotos) {
          await indexedDbService.saveFotoLocal(f);
        }

        this.notify();
      }
    }, (err) => console.error('Erro em snapshot fotos:', err));

    // --- COLLECTION: CONFIGURAÇÕES ---
    onSnapshot(collection(db, 'configuracoes'), async (snapshot) => {
      if (snapshot.empty) {
        await this.seedCollection('configuracoes', DEFAULT_CONFIGS.map(c => ({ id: c.cultura.toLowerCase(), ...c })));
      } else {
        this.configuracoes = snapshot.docs.map(doc => doc.data() as ConfiguracaoAprovacao);
        this.notify();
      }
    }, (err) => console.error('Erro em snapshot configuracoes:', err));

    // --- COLLECTION: USUÁRIOS ---
    onSnapshot(collection(db, 'usuarios'), async (snapshot) => {
      if (snapshot.empty) {
        await this.seedCollection('usuarios', DEFAULT_USERS);
      } else {
        this.usuarios = snapshot.docs.map(doc => doc.data() as Usuario);
        this.notify();
      }
    }, (err) => console.error('Erro em snapshot usuarios:', err));

    // --- COLLECTION: PARÂMETROS QUALIDADE POR CULTURA ---
    onSnapshot(collection(db, 'parametros_qualidade_cultura'), async (snapshot) => {
      if (snapshot.empty) {
        await this.seedCollection('parametros_qualidade_cultura', DEFAULT_PARAMETROS_CULTURA);
      } else {
        this.parametrosQualidadeCultura = snapshot.docs.map(doc => doc.data() as ParametroQualidadeCultura);
        this.notify();
      }
    }, (err) => console.error('Erro em snapshot parametros_qualidade_cultura:', err));

    // --- COLLECTION: LOTES QUALIDADE ---
    onSnapshot(collection(db, 'qualidade_lotes'), async (snapshot) => {
      if (snapshot.empty) {
        await this.seedCollection('qualidade_lotes', INITIAL_LOTES_QUALIDADE);
      } else {
        this.lotesQualidade = snapshot.docs.map(doc => doc.data() as LoteQualidade);
        this.notify();
      }
    }, (err) => console.error('Erro em snapshot qualidade_lotes:', err));

    // --- COLLECTION: ANÁLISES QUALIDADE ---
    onSnapshot(collection(db, 'analises_qualidade'), async (snapshot) => {
      if (snapshot.empty) {
        await this.seedCollection('analises_qualidade', INITIAL_ANALISES_QUALIDADE);
      } else {
        this.analisesQualidade = snapshot.docs.map(doc => doc.data() as AnaliseQualidade);
        this.notify();
      }
    }, (err) => console.error('Erro em snapshot analises_qualidade:', err));

    // --- COLLECTION: AUDITORIA QUALIDADE ---
    onSnapshot(collection(db, 'auditoria_qualidade'), async (snapshot) => {
      if (!snapshot.empty) {
        this.auditoriasQualidade = snapshot.docs.map(doc => doc.data() as AuditoriaQualidade);
        this.notify();
      }
    }, (err) => console.error('Erro em snapshot auditoria_qualidade:', err));

    // --- COLLECTION: CONFIG TERMO CONFORMIDADE ---
    onSnapshot(collection(db, 'config_termo_conformidade'), async (snapshot) => {
      if (!snapshot.empty) {
        const docData = snapshot.docs[0]?.data() as ConfiguracaoTermoConformidade;
        if (docData && docData.razaoSocial) {
          this.configTermoConformidade = docData;
          this.notify();
        }
      }
    }, (err) => console.error('Erro em snapshot config_termo_conformidade:', err));
  }

  private async seedCollection(colName: string, items: any[]) {
    try {
      const batch = writeBatch(db);
      items.forEach((item) => {
        const id = item.id || item.cultura?.toLowerCase() || String(Date.now());
        const docRef = doc(db, colName, id);
        batch.set(docRef, item);
      });
      await batch.commit();
    } catch (e) {
      console.error(`Erro ao semear coleção ${colName} no Firestore:`, e);
    }
  }

  // --- AMOSTRAS ---
  getAmostras(): Amostra[] {
    return this.amostras;
  }

  getAmostraById(id: string): Amostra | undefined {
    return this.amostras.find(a => a.id === id || a.protocolo === id);
  }

  async saveAmostra(amostraData: Omit<Amostra, 'id' | 'dataCadastro' | 'dataAtualizacao' | 'qrCode' | 'status'> & { id?: string; status?: Amostra['status'] }): Promise<Amostra> {
    const now = new Date().toISOString();
    let targetAmostra: Amostra;

    // Cálculo automático obrigatório das leituras de 7 e 10 dias
    const { dataLeitura7dias, dataLeitura10dias } = calculateLeituraDates(amostraData.dataSemeadura);

    if (amostraData.id) {
      const existing = this.getAmostraById(amostraData.id);
      targetAmostra = {
        ...(existing || {} as Amostra),
        ...amostraData,
        dataLeitura7dias: amostraData.dataLeitura7dias || dataLeitura7dias,
        dataLeitura10dias: amostraData.dataLeitura10dias || dataLeitura10dias,
        dataAtualizacao: now,
      } as Amostra;
    } else {
      const newId = 'ams-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
      targetAmostra = {
        ...amostraData,
        id: newId,
        status: 'Pendente',
        qrCode: amostraData.protocolo,
        dataCadastro: now,
        dataAtualizacao: now,
        quantidadeSementes: amostraData.quantidadeSementes || 100,
        dataLeitura7dias: amostraData.dataLeitura7dias || dataLeitura7dias,
        dataLeitura10dias: amostraData.dataLeitura10dias || dataLeitura10dias,
        leitura7diasRealizada: false,
        leitura10diasRealizada: false,
      };
    }

    // 1. Salva IMEDIATAMENTE no IndexedDB local (100% seguro contra falhas de rede)
    await indexedDbService.saveAmostraLocal(targetAmostra);

    // 2. Enfileira na fila de sincronização persistente
    await indexedDbService.enqueueSyncItem({
      id: 'sync-ams-' + targetAmostra.id,
      entidadeId: targetAmostra.id,
      tipo: 'AMOSTRA_SAVE',
      titulo: `Canteiro: ${targetAmostra.protocolo}`,
      payload: targetAmostra,
      dataCriacao: now,
      status: 'pendente',
      tentativas: 0,
    });

    // 3. Atualização no cache de memória e disparo de listeners da UI
    const idx = this.amostras.findIndex(a => a.id === targetAmostra.id);
    if (idx !== -1) {
      this.amostras[idx] = targetAmostra;
    } else {
      this.amostras.unshift(targetAmostra);
    }
    this.notify();

    // 4. Se houver conexão, sincroniza em segundo plano sem travar a interface
    if (typeof window !== 'undefined' && navigator.onLine) {
      setTimeout(() => this.processSyncQueue(), 50);
    }

    return targetAmostra;
  }

  async deleteAmostra(id: string): Promise<boolean> {
    if (!id) return false;
    const target = this.getAmostraById(id);
    const targetId = target ? target.id : id;

    try {
      // 1. Exclui do IndexedDB local imediatamente
      await indexedDbService.deleteAmostraLocal(targetId);

      // 2. Enfileira exclusão para sincronização futura
      await indexedDbService.enqueueSyncItem({
        id: 'sync-del-ams-' + targetId,
        entidadeId: targetId,
        tipo: 'AMOSTRA_DELETE',
        titulo: `Exclusão canteiro (${target?.protocolo || targetId})`,
        payload: { id: targetId },
        dataCriacao: new Date().toISOString(),
        status: 'pendente',
        tentativas: 0,
      });

      // 3. Atualizar cache local
      this.amostras = this.amostras.filter(a => a.id !== targetId && a.protocolo !== id);
      this.avaliacoes = this.avaliacoes.filter(a => a.amostraId !== targetId && a.amostraId !== id);
      this.fotos = this.fotos.filter(f => f.amostraId !== targetId && f.amostraId !== id);
      this.notify();

      // 4. Sync background
      if (typeof window !== 'undefined' && navigator.onLine) {
        setTimeout(() => this.processSyncQueue(), 50);
      }
      return true;
    } catch (error) {
      console.error('Erro ao excluir amostra localmente:', error);
      return false;
    }
  }

  // --- AVALIAÇÕES ---
  getAvaliacoes(): Avaliacao[] {
    return this.avaliacoes;
  }

  getAvaliacaoByAmostraId(amostraId: string): Avaliacao | undefined {
    return this.avaliacoes.find(a => a.amostraId === amostraId);
  }

  /**
   * Salva exclusivamente a Contagem de Emergência (Leitura de 7 dias).
   * Registra a quantidade de plântulas emergidas sem exigir classificação de vigor.
   * 100% Offline-First via IndexedDB.
   */
  async saveLeitura7Dias(amostraId: string, data: {
    plantulasEmergidas: number;
    observacoes?: string;
    dataLeitura?: string;
    horaLeitura?: string;
    usuario?: string;
  }): Promise<Amostra> {
    const amostra = this.getAmostraById(amostraId);
    if (!amostra) throw new Error('Amostra não encontrada no sistema');

    const now = new Date();
    const dataLeitura = data.dataLeitura || now.toISOString().split('T')[0];

    const updatedAmostra: Amostra = {
      ...amostra,
      plantulasEmergidas7dias: data.plantulasEmergidas,
      leitura7diasRealizada: true,
      dataRealizacao7dias: dataLeitura,
      usuarioLeitura7dias: data.usuario || amostra.responsavel,
      obsLeitura7dias: data.observacoes || '',
      dataAtualizacao: now.toISOString(),
    };

    // 1. Salva Imediatamente no IndexedDB local
    await indexedDbService.saveAmostraLocal(updatedAmostra);

    // 2. Enfileira na fila persistente de sincronização
    await indexedDbService.enqueueSyncItem({
      id: 'sync-7d-' + amostra.id,
      entidadeId: amostra.id,
      tipo: 'LEITURA_7DIAS',
      titulo: `Leitura 7 Dias: ${amostra.protocolo}`,
      payload: { amostraId: amostra.id, data, updatedAmostra },
      dataCriacao: now.toISOString(),
      status: 'pendente',
      tentativas: 0,
    });

    // 3. Atualiza estado em memória e notifica
    const aIdx = this.amostras.findIndex(a => a.id === amostra.id);
    if (aIdx !== -1) {
      this.amostras[aIdx] = updatedAmostra;
    }
    this.notify();

    // 4. Background sync
    if (typeof window !== 'undefined' && navigator.onLine) {
      setTimeout(() => this.processSyncQueue(), 50);
    }

    return updatedAmostra;
  }

  /**
   * Salva avaliação de canteiro com suporte total Offline-First.
   * Não trava a interface, persiste foto e dados no IndexedDB e enfileira sincronização.
   */
  async saveAvaliacao(avaliacaoData: Omit<Avaliacao, 'id' | 'germinacao' | 'percentualMortas' | 'percentualAnormais' | 'resultadoAprovacao'>): Promise<Avaliacao> {
    const amostra = this.getAmostraById(avaliacaoData.amostraId);

    const fortes = avaliacaoData.fortes || 0;
    const intermediarias = avaliacaoData.intermediarias || 0;
    const fracas = avaliacaoData.fracas || 0;
    const anormais = avaliacaoData.anormais || 0;
    const mortas = avaliacaoData.mortas || 0;

    const germinacao = fortes + intermediarias + fracas;
    const percentualAnormais = anormais;
    const percentualMortas = mortas;

    const cultura = amostra?.cultura || 'Geral';
    const minGerm = this.getMinGerminationForCultura(cultura);
    const resultadoAprovacao = germinacao >= minGerm ? 'Aprovado' : 'Reprovado';

    const existing = this.getAvaliacaoByAmostraId(avaliacaoData.amostraId);
    const id = existing ? existing.id : 'avl-' + avaliacaoData.amostraId;

    const plantulasEmergidas7dias = avaliacaoData.plantulasEmergidas7dias !== undefined 
      ? avaliacaoData.plantulasEmergidas7dias 
      : amostra?.plantulasEmergidas7dias;

    const newAvaliacao: Avaliacao = {
      ...avaliacaoData,
      id,
      plantulasEmergidas7dias,
      fortes,
      intermediarias,
      fracas,
      anormais,
      mortas,
      germinacao,
      percentualAnormais,
      percentualMortas,
      resultadoAprovacao,
    };

    const is7d = avaliacaoData.tipoLeitura === '7_dias';
    let updatedAmostra: Amostra | undefined;

    if (amostra) {
      updatedAmostra = {
        ...amostra,
        status: is7d ? 'Pendente' : 'Concluído',
        leitura7diasRealizada: amostra.leitura7diasRealizada || is7d,
        dataRealizacao7dias: amostra.dataRealizacao7dias || (is7d ? (avaliacaoData.dataAvaliacao || new Date().toISOString()) : undefined),
        plantulasEmergidas7dias: plantulasEmergidas7dias !== undefined ? plantulasEmergidas7dias : amostra.plantulasEmergidas7dias,
        leitura10diasRealizada: !is7d,
        dataRealizacao10dias: !is7d ? (avaliacaoData.dataAvaliacao || new Date().toISOString()) : amostra.dataRealizacao10dias,
        dataAtualizacao: new Date().toISOString(),
      };
    }

    // 1. Salva Imediatamente no IndexedDB local (100% Offline-First)
    await indexedDbService.saveAvaliacaoLocal(newAvaliacao);
    if (updatedAmostra) {
      await indexedDbService.saveAmostraLocal(updatedAmostra);
    }

    // 2. Enfileira na fila de sincronização persistente com ID idempotente
    await indexedDbService.enqueueSyncItem({
      id: 'sync-avl-' + newAvaliacao.id,
      entidadeId: newAvaliacao.id,
      tipo: 'AVALIACAO_SAVE',
      titulo: `Avaliação Final (${amostra?.protocolo || newAvaliacao.amostraId})`,
      payload: {
        avaliacao: newAvaliacao,
        amostra: updatedAmostra,
      },
      dataCriacao: new Date().toISOString(),
      status: 'pendente',
      tentativas: 0,
    });

    // 3. Atualiza estado em memória e notifica a interface IMEDIATAMENTE
    const avlIdx = this.avaliacoes.findIndex(a => a.id === id);
    if (avlIdx !== -1) {
      this.avaliacoes[avlIdx] = newAvaliacao;
    } else {
      this.avaliacoes.unshift(newAvaliacao);
    }

    if (updatedAmostra) {
      const aIdx = this.amostras.findIndex(a => a.id === updatedAmostra.id);
      if (aIdx !== -1) {
        this.amostras[aIdx] = updatedAmostra;
      }
    }

    this.pendingSyncCount++;
    this.notify();

    // 4. Dispara sincronização em segundo plano sem bloquear a resposta do usuário
    if (typeof window !== 'undefined' && navigator.onLine) {
      setTimeout(() => this.processSyncQueue(), 50);
    }

    return newAvaliacao;
  }

  async deleteAvaliacao(id: string): Promise<boolean> {
    if (!id) return false;
    const target = this.avaliacoes.find(a => a.id === id || a.amostraId === id);
    if (!target) return false;

    try {
      // 1. Remove do IndexedDB local
      await indexedDbService.deleteAvaliacaoLocal(target.id);

      // 2. Enfileira na sincronização
      await indexedDbService.enqueueSyncItem({
        id: 'sync-del-avl-' + target.id,
        entidadeId: target.id,
        tipo: 'AVALIACAO_DELETE',
        titulo: `Exclusão avaliação (${target.id})`,
        payload: { id: target.id, amostraId: target.amostraId },
        dataCriacao: new Date().toISOString(),
        status: 'pendente',
        tentativas: 0,
      });

      if (target.amostraId) {
        const remaining = this.avaliacoes.filter(a => a.amostraId === target.amostraId && a.id !== target.id);
        if (remaining.length === 0) {
          const amostra = this.getAmostraById(target.amostraId);
          if (amostra) {
            const updatedAmostra: Amostra = {
              ...amostra,
              status: 'Pendente',
              dataAtualizacao: new Date().toISOString(),
            };
            await indexedDbService.saveAmostraLocal(updatedAmostra);
            const aIdx = this.amostras.findIndex(a => a.id === amostra.id);
            if (aIdx !== -1) {
              this.amostras[aIdx] = updatedAmostra;
            }
          }
        }
      }

      this.avaliacoes = this.avaliacoes.filter(a => a.id !== target.id);
      this.notify();

      // 3. Sincroniza em segundo plano
      if (typeof window !== 'undefined' && navigator.onLine) {
        setTimeout(() => this.processSyncQueue(), 50);
      }
      return true;
    } catch (error) {
      console.error('Erro ao excluir avaliação localmente:', error);
      return false;
    }
  }

  // --- FOTOS (100% OFFLINE-FIRST VIA INDEXEDDB) ---
  getFotos(): FotoAmostra[] {
    return this.fotos;
  }

  getFotosByAmostra(amostraId: string): FotoAmostra[] {
    if (!amostraId) return [];
    const amostra = this.getAmostraById(amostraId);
    const targetIds = new Set<string>();
    targetIds.add(amostraId);
    if (amostra?.id) targetIds.add(amostra.id);
    if (amostra?.protocolo) targetIds.add(amostra.protocolo);

    return this.fotos.filter(f => targetIds.has(f.amostraId));
  }

  async addFoto(amostraId: string, fotoBase64: string, nome?: string, descricao?: string): Promise<FotoAmostra> {
    const id = 'ft-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();
    const newFoto: FotoAmostra = {
      id,
      amostraId,
      foto: fotoBase64,
      dataUpload: now,
      nome: nome || `Foto Canteiro - ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      descricao: descricao || '',
      syncStatus: 'pendente',
    };

    // 1. Salva IMEDIATAMENTE no IndexedDB local antes de qualquer tentativa remota
    await indexedDbService.saveFotoLocal(newFoto);

    // 2. Enfileira na fila de sincronização persistente
    await indexedDbService.enqueueSyncItem({
      id: 'sync-foto-' + id,
      entidadeId: id,
      tipo: 'FOTO_ADD',
      titulo: `Foto: ${nome || 'Canteiro'}`,
      payload: newFoto,
      dataCriacao: now,
      status: 'pendente',
      tentativas: 0,
    });

    // 3. Atualiza estado em memória e notifica a UI instantaneamente
    const existingIdx = this.fotos.findIndex(f => f.id === id);
    if (existingIdx >= 0) {
      this.fotos[existingIdx] = newFoto;
    } else {
      this.fotos.unshift(newFoto);
    }
    this.pendingSyncCount++;
    this.notify();

    // 4. Dispara sincronização em segundo plano sem travar a thread
    if (typeof window !== 'undefined' && navigator.onLine) {
      setTimeout(() => this.processSyncQueue(), 50);
    }

    return newFoto;
  }

  async deleteFoto(id: string): Promise<boolean> {
    try {
      // 1. Exclui do IndexedDB local
      await indexedDbService.deleteFotoLocal(id);

      // 2. Enfileira na sincronização
      await indexedDbService.enqueueSyncItem({
        id: 'sync-del-foto-' + id,
        entidadeId: id,
        tipo: 'FOTO_DELETE',
        titulo: `Exclusão de foto (${id})`,
        payload: { id },
        dataCriacao: new Date().toISOString(),
        status: 'pendente',
        tentativas: 0,
      });

      // 3. Atualiza memória e interface
      this.fotos = this.fotos.filter(f => f.id !== id);
      this.notify();

      // 4. Sincroniza em background
      if (typeof window !== 'undefined' && navigator.onLine) {
        setTimeout(() => this.processSyncQueue(), 50);
      }
      return true;
    } catch (error) {
      console.error('Erro ao excluir foto localmente:', error);
      return false;
    }
  }

  // --- CONFIGURAÇÕES DE APROVAÇÃO ---
  getConfiguracoes(): ConfiguracaoAprovacao[] {
    return this.configuracoes.length > 0 ? this.configuracoes : DEFAULT_CONFIGS;
  }

  getMinGerminationForCultura(cultura: string): number {
    const configs = this.getConfiguracoes();
    const match = configs.find(c => c.cultura.toLowerCase() === cultura.toLowerCase());
    return match ? match.percentualMinimo : 80;
  }

  async saveConfiguracoes(configs: ConfiguracaoAprovacao[]): Promise<void> {
    await this.ensureFirebaseAuth();
    for (const cfg of configs) {
      const docId = cfg.cultura.toLowerCase();
      const payload = this.sanitizeForFirestore({
        id: docId,
        cultura: cfg.cultura,
        percentualMinimo: cfg.percentualMinimo,
      });
      await setDoc(doc(db, 'configuracoes', docId), payload);
    }
    this.configuracoes = configs;
    this.notify();
  }

  async deleteConfiguracao(cultura: string): Promise<boolean> {
    if (!cultura) return false;
    const docId = cultura.toLowerCase();
    try {
      await deleteDoc(doc(db, 'configuracoes', docId));
      this.configuracoes = this.configuracoes.filter(c => c.cultura.toLowerCase() !== docId);
      this.notify();
      return true;
    } catch (error) {
      console.error('Erro ao excluir configuração no Firestore:', error);
      throw error;
    }
  }

  // --- USUÁRIOS & AUTENTICAÇÃO ---
  getUsuarios(): Usuario[] {
    return this.usuarios.length > 0 ? this.usuarios : DEFAULT_USERS;
  }

  getCurrentUser(): Usuario | null {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  setCurrentUser(usuario: Usuario | null) {
    if (usuario) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(usuario));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
    this.notify();
  }

  async login(nomeOuEmail: string, senha: string): Promise<{ success: boolean; user?: Usuario; message?: string }> {
    const cleanQuery = nomeOuEmail.trim().toLowerCase();
    const allUsers = this.getUsuarios();

    const user = allUsers.find(
      u => u.nome.trim().toLowerCase() === cleanQuery || (u.email && u.email.trim().toLowerCase() === cleanQuery)
    );

    if (!user) {
      return { success: false, message: 'Usuário não encontrado. Verifique o nome ou e-mail informado.' };
    }

    if (!user.ativo) {
      return { success: false, message: 'Este usuário está inativo no sistema. Fale com o administrador.' };
    }

    if (user.senha && user.senha !== senha) {
      return { success: false, message: 'Senha incorreta. Tente novamente.' };
    }

    // Tentar autenticar via Firebase Auth se for e-mail válido
    if (user.email) {
      try {
        await signInWithEmailAndPassword(auth, user.email, senha || '123456');
      } catch (err: any) {
        // Se usuário ainda não existe no Firebase Auth, cria automaticamente para vincular
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          try {
            await createUserWithEmailAndPassword(auth, user.email, senha.length >= 6 ? senha : '123456');
          } catch (createErr) {
            // Se falhar criação, continua com login anonimo ativo
          }
        }
      }
    }

    this.setCurrentUser(user);
    return { success: true, user };
  }

  async logout() {
    this.setCurrentUser(null);
    try {
      await signOut(auth);
    } catch (e) {
      // safe fallback
    }
  }

  async saveUsuario(usr: Usuario): Promise<Usuario> {
    await this.ensureFirebaseAuth();
    const sanitized = this.sanitizeForFirestore(usr);
    await setDoc(doc(db, 'usuarios', usr.id), sanitized);
    const idx = this.usuarios.findIndex(u => u.id === usr.id);
    if (idx !== -1) {
      this.usuarios[idx] = usr;
    } else {
      this.usuarios.push(usr);
    }
    this.notify();
    return usr;
  }

  async deleteUsuario(id: string): Promise<boolean> {
    if (!id) return false;
    try {
      await deleteDoc(doc(db, 'usuarios', id));
      this.usuarios = this.usuarios.filter(u => u.id !== id);
      this.notify();
      return true;
    } catch (error) {
      console.error('Erro ao excluir usuário no Firestore:', error);
      throw error;
    }
  }

  // --- FILA DE SINCRONIZAÇÃO DA INTERFACE (OFFLINE-FIRST VIA INDEXEDDB) ---
  getSyncQueue(): SyncOperation[] {
    return [];
  }

  clearSyncQueue() {
    //
  }

  getPendingSyncCount(): number {
    return this.pendingSyncCount;
  }

  async getSyncQueueItems(): Promise<SyncQueueItem[]> {
    return await indexedDbService.getAllSyncItems();
  }

  /**
   * Sincroniza especificamente todas as fotos com status pendente (🟠) do IndexedDB para o Firestore.
   * Garante que nenhuma foto seja perdida ou excluída antes da confirmação do upload.
   * Não duplica fotos (mantém exatamente o mesmo ID e vinculação com amostra/canteiro/avaliação).
   */
  async syncAllPendingFotos(): Promise<{ total: number; synced: number; failed: number }> {
    if (typeof window !== 'undefined' && !navigator.onLine) {
      return { total: 0, synced: 0, failed: 0 };
    }

    try {
      // 1. Obtém todas as fotos do IndexedDB
      const allLocalFotos = await indexedDbService.getAllFotosLocal();
      const pendingFotos = allLocalFotos.filter(
        f => f.syncStatus === 'pendente' || f.syncStatus === 'sincronizando' || f.syncStatus === 'erro' || !f.syncStatus
      );

      if (pendingFotos.length === 0) {
        return { total: 0, synced: 0, failed: 0 };
      }

      // 2. Garante autenticação
      try {
        await Promise.race([
          this.ensureFirebaseAuth(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Auth timeout')), 3000))
        ]);
      } catch (authErr) {
        console.warn('Aviso auth durante sincronização de fotos:', authErr);
      }

      let syncedCount = 0;
      let failedCount = 0;

      for (const foto of pendingFotos) {
        try {
          // Atualiza status transitório em memória e no IndexedDB
          foto.syncStatus = 'sincronizando';
          await indexedDbService.saveFotoLocal(foto);
          const fIdx = this.fotos.findIndex(f => f.id === foto.id);
          if (fIdx >= 0) {
            this.fotos[fIdx].syncStatus = 'sincronizando';
          }
          this.notify();

          // Comprime a foto se necessário para garantir limite < 1MB do Firestore
          let finalBase64 = foto.foto;
          if (foto.foto && foto.foto.startsWith('data:image')) {
            const compressed = await compressBase64Image(foto.foto, 1280, 1280, 0.82);
            if (compressed) finalBase64 = compressed;
          }

          const fotoToSave: FotoAmostra = {
            ...foto,
            foto: finalBase64,
            syncStatus: 'sincronizado',
          };

          const sanitized = this.sanitizeForFirestore(fotoToSave);
          // Grava no Firestore na coleção 'fotos' com o mesmo ID
          await setDoc(doc(db, 'fotos', foto.id), sanitized);

          // SÓ APÓS CONFIRMAÇÃO DO FIRESTORE:
          foto.syncStatus = 'sincronizado';
          foto.foto = finalBase64;
          await indexedDbService.saveFotoLocal(foto);

          if (fIdx >= 0) {
            this.fotos[fIdx] = { ...foto };
          } else {
            this.fotos.unshift({ ...foto });
          }

          // Remove item da fila de sync se existir
          await indexedDbService.removeSyncItem('sync-foto-' + foto.id);
          syncedCount++;
        } catch (fotoErr) {
          console.error(`Falha ao sincronizar foto ${foto.id}:`, fotoErr);
          // NUNCA exclui a foto local. Mantém como 'pendente' para tentar novamente
          foto.syncStatus = 'pendente';
          await indexedDbService.saveFotoLocal(foto);
          const fIdx = this.fotos.findIndex(f => f.id === foto.id);
          if (fIdx >= 0) {
            this.fotos[fIdx].syncStatus = 'pendente';
          }
          failedCount++;
        }
      }

      // Atualiza contadores e notifica listeners
      const remainingPending = await indexedDbService.getPendingSyncItems();
      this.pendingSyncCount = remainingPending.length;
      this.notify();

      return { total: pendingFotos.length, synced: syncedCount, failed: failedCount };
    } catch (globalErr) {
      console.error('Erro global ao sincronizar fotos pendentes:', globalErr);
      return { total: 0, synced: 0, failed: 0 };
    }
  }

  /**
   * Processa a fila de sincronização em segundo plano.
   * Conecta com Firestore de forma segura com timeout e tratamento de erros.
   */
  async processSyncQueue(): Promise<void> {
    if (this.syncRunning) return;
    if (typeof window !== 'undefined' && !navigator.onLine) return;

    this.syncRunning = true;

    try {
      // 1. Sincroniza fotos pendentes do IndexedDB primeiro
      await this.syncAllPendingFotos();

      const pendingItems = await indexedDbService.getPendingSyncItems();
      if (pendingItems.length === 0) {
        const localFotos = await indexedDbService.getAllFotosLocal();
        const pendingFotos = localFotos.filter(f => f.syncStatus === 'pendente' || f.syncStatus === 'sincronizando' || f.syncStatus === 'erro');
        this.pendingSyncCount = pendingFotos.length;
        this.notify();
        this.syncRunning = false;
        return;
      }

      // Tenta autenticar no Firebase com timeout curto de 3s para nunca travar
      try {
        await Promise.race([
          this.ensureFirebaseAuth(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Auth Timeout')), 3000))
        ]);
      } catch {
        // Prossegue mesmo em falha de auth
      }

      for (const item of pendingItems) {
        try {
          await indexedDbService.updateSyncItemStatus(item.id, 'sincronizando');
          this.notify();

          if (item.tipo === 'FOTO_ADD') {
            const fotoData = item.payload as FotoAmostra;
            let finalBase64 = fotoData.foto;
            if (fotoData.foto && fotoData.foto.startsWith('data:image')) {
              const compressed = await compressBase64Image(fotoData.foto, 1280, 1280, 0.82);
              if (compressed) finalBase64 = compressed;
            }
            const fotoToSave = { ...fotoData, foto: finalBase64, syncStatus: 'sincronizado' as const };
            const sanitized = this.sanitizeForFirestore(fotoToSave);
            await setDoc(doc(db, 'fotos', fotoData.id), sanitized);
            
            // Marca a foto localmente como sincronizada (🟢)
            fotoData.syncStatus = 'sincronizado';
            fotoData.foto = finalBase64;
            await indexedDbService.saveFotoLocal(fotoData);
            const fIdx = this.fotos.findIndex(f => f.id === fotoData.id);
            if (fIdx >= 0) {
              this.fotos[fIdx].syncStatus = 'sincronizado';
            }
          } else if (item.tipo === 'FOTO_DELETE') {
            const { id } = item.payload;
            await deleteDoc(doc(db, 'fotos', id));
          } else if (item.tipo === 'AVALIACAO_SAVE') {
            const { avaliacao, amostra } = item.payload;
            if (avaliacao) {
              const sanitizedAvl = this.sanitizeForFirestore(avaliacao);
              await setDoc(doc(db, 'avaliacoes', avaliacao.id), sanitizedAvl);
            }
            if (amostra) {
              const sanitizedAms = this.sanitizeForFirestore(amostra);
              await setDoc(doc(db, 'amostras', amostra.id), sanitizedAms);
            }
          } else if (item.tipo === 'AVALIACAO_DELETE') {
            const { id, amostraId } = item.payload;
            await deleteDoc(doc(db, 'avaliacoes', id));
            if (amostraId) {
              const amostra = this.getAmostraById(amostraId);
              if (amostra) {
                const updatedAmostra = { ...amostra, status: 'Pendente' as const, dataAtualizacao: new Date().toISOString() };
                await setDoc(doc(db, 'amostras', amostra.id), this.sanitizeForFirestore(updatedAmostra));
              }
            }
          } else if (item.tipo === 'LEITURA_7DIAS') {
            const { updatedAmostra } = item.payload;
            if (updatedAmostra) {
              await setDoc(doc(db, 'amostras', updatedAmostra.id), this.sanitizeForFirestore(updatedAmostra));
            }
          } else if (item.tipo === 'AMOSTRA_SAVE') {
            const amostra = item.payload as Amostra;
            await setDoc(doc(db, 'amostras', amostra.id), this.sanitizeForFirestore(amostra));
          } else if (item.tipo === 'AMOSTRA_DELETE') {
            const { id } = item.payload;
            await deleteDoc(doc(db, 'amostras', id));
          }

          // Concluído com sucesso: remove da fila persistente
          await indexedDbService.removeSyncItem(item.id);
        } catch (err: any) {
          console.warn(`Erro ao sincronizar item ${item.id}:`, err);
          await indexedDbService.updateSyncItemStatus(
            item.id, 
            'erro', 
            err?.message || 'Erro de conexão'
          );
        }
      }

      const remaining = await indexedDbService.getPendingSyncItems();
      const localFotos = await indexedDbService.getAllFotosLocal();
      const pendingFotos = localFotos.filter(f => f.syncStatus === 'pendente' || f.syncStatus === 'sincronizando' || f.syncStatus === 'erro');
      this.pendingSyncCount = remaining.length + pendingFotos.length;
      this.notify();
    } catch (globalErr) {
      console.error('Erro no ciclo de sincronização:', globalErr);
    } finally {
      this.syncRunning = false;
    }
  }

  /**
   * Força sincronização manual de todos os itens pendentes e fotos.
   */
  async syncNow(): Promise<{ success: boolean; syncedCount: number; errorsCount: number }> {
    const fotoSyncRes = await this.syncAllPendingFotos();
    await this.processSyncQueue();
    const all = await indexedDbService.getAllSyncItems();
    const errors = all.filter(i => i.status === 'erro');
    const remainingPending = all.filter(i => i.status === 'pendente' || i.status === 'sincronizando');
    const localFotos = await indexedDbService.getAllFotosLocal();
    const pendingFotos = localFotos.filter(f => f.syncStatus === 'pendente' || f.syncStatus === 'sincronizando' || f.syncStatus === 'erro');
    
    return {
      success: errors.length === 0 && remainingPending.length === 0 && pendingFotos.length === 0,
      syncedCount: (all.length - errors.length - remainingPending.length) + fotoSyncRes.synced,
      errorsCount: errors.length + remainingPending.length + pendingFotos.length,
    };
  }

  // --- ESTATÍSTICAS DO DASHBOARD ---
  getDashboardStats() {
    const amostras = this.getAmostras();
    const avaliacoes = this.getAvaliacoes();

    const totalAmostras = amostras.length;
    const amostrasPendentes = amostras.filter(a => a.status === 'Pendente').length;
    const amostrasConcluidas = amostras.filter(a => a.status === 'Concluído').length;

    let germinacaoMedia = 0;
    let mediaPlantasFortes = 0;
    let mediaPlantasAnormais = 0;
    let mediaPlantasMortas = 0;

    if (avaliacoes.length > 0) {
      const sumGerm = avaliacoes.reduce((acc, curr) => acc + curr.germinacao, 0);
      const sumFortes = avaliacoes.reduce((acc, curr) => acc + curr.fortes, 0);
      const sumAnormais = avaliacoes.reduce((acc, curr) => acc + (curr.anormais ?? 0), 0);
      const sumMortas = avaliacoes.reduce((acc, curr) => acc + curr.mortas, 0);

      germinacaoMedia = Math.round((sumGerm / avaliacoes.length) * 10) / 10;
      mediaPlantasFortes = Math.round((sumFortes / avaliacoes.length) * 10) / 10;
      mediaPlantasAnormais = Math.round((sumAnormais / avaliacoes.length) * 10) / 10;
      mediaPlantasMortas = Math.round((sumMortas / avaliacoes.length) * 10) / 10;
    }

    return {
      totalAmostras,
      amostrasPendentes,
      amostrasConcluidas,
      germinacaoMedia,
      mediaPlantasFortes,
      mediaPlantasAnormais,
      mediaPlantasMortas,
      avaliacoesPeriodo: avaliacoes.length,
    };
  }

  // ==========================================
  // MÓDULO DE QUALIDADE DE LOTES - MÉTODOS
  // ==========================================

  getConfigAlertasQualidade(): ConfiguracaoAlertasQualidade {
    return this.configAlertasQualidade;
  }

  async saveConfigAlertasQualidade(diasAlerta: number) {
    this.configAlertasQualidade = { diasAlertaAntecedencia: diasAlerta };
    this.notify();
    try {
      await setDoc(doc(db, 'config_alertas_qualidade', 'padrao'), this.configAlertasQualidade);
    } catch (e) {
      console.warn('Erro ao salvar config alertas no Firestore:', e);
    }
  }

  getAllParametrosQualidadeCultura(): ParametroQualidadeCultura[] {
    return [...this.parametrosQualidadeCultura];
  }

  getParametrosQualidadePorCultura(culturaNome: string): ParametroQualidadeCultura {
    const nomeNorm = (culturaNome || '').trim().toLowerCase();
    const found = this.parametrosQualidadeCultura.find(
      p => p.cultura.toLowerCase() === nomeNorm || p.id.toLowerCase() === nomeNorm
    );
    if (found) return found;

    // Fallback dinâmico com testes padrões para nova cultura
    return {
      id: nomeNorm || 'outra',
      cultura: culturaNome || 'Nova Cultura',
      diasValidadePadrao: 180,
      diasAlertaVencimentoPadrao: 30,
      testes: [
        { id: `t-${nomeNorm}-1`, nome: 'Germinação', unidade: '%', valorMinimo: 80, valorMeta: 85, tipoComparacao: 'MIN', obrigatorio: true, ordem: 1 },
        { id: `t-${nomeNorm}-2`, nome: 'Vigor', unidade: '%', valorMinimo: 75, valorMeta: 80, tipoComparacao: 'MIN', obrigatorio: true, ordem: 2 },
        { id: `t-${nomeNorm}-3`, nome: 'Pureza Física', unidade: '%', valorMinimo: 98.0, valorMeta: 99.0, tipoComparacao: 'MIN', obrigatorio: true, ordem: 3 },
        { id: `t-${nomeNorm}-4`, nome: 'Umidade', unidade: '%', valorMaximo: 12.5, valorMeta: 11.5, tipoComparacao: 'MAX', obrigatorio: true, ordem: 4 },
      ]
    };
  }

  async saveParametroQualidadeCultura(param: ParametroQualidadeCultura) {
    const sanitized = this.sanitizeForFirestore(param);
    const idx = this.parametrosQualidadeCultura.findIndex(p => p.id === param.id);
    if (idx >= 0) {
      this.parametrosQualidadeCultura[idx] = param;
    } else {
      this.parametrosQualidadeCultura.push(param);
    }
    this.notify();

    try {
      await setDoc(doc(db, 'parametros_qualidade_cultura', param.id), sanitized);
      await this.registrarAuditoriaQualidade(
        param.id,
        undefined,
        'ALTERACAO_PARAMETROS',
        `Parâmetros de qualidade da cultura ${param.cultura} atualizados.`
      );
    } catch (e) {
      console.error('Erro ao salvar parâmetros da cultura:', e);
    }
  }

  async deleteParametroQualidadeCultura(id: string) {
    this.parametrosQualidadeCultura = this.parametrosQualidadeCultura.filter(p => p.id !== id);
    this.notify();
    try {
      await deleteDoc(doc(db, 'parametros_qualidade_cultura', id));
    } catch (e) {
      console.error('Erro ao excluir parâmetros da cultura:', e);
    }
  }

  // --- LOTES QUALIDADE ---
  getLotesQualidade(): LoteQualidade[] {
    const today = getTodayBR();
    const diasAlerta = this.configAlertasQualidade.diasAlertaAntecedencia || 30;

    return this.lotesQualidade.map(lote => {
      let status: StatusValidadeLote = 'VALIDO';
      const diff = getDaysDifference(lote.dataValidadeAtual, today);

      if (lote.emReanalise) {
        status = 'EM_REANALISE';
      } else if (diff < 0) {
        status = 'VENCIDO';
      } else if (diff <= diasAlerta) {
        status = 'PROXIMO_VENCIMENTO';
      } else if (!lote.temDocumento) {
        status = 'SEM_DOCUMENTO';
      } else {
        status = 'VALIDO';
      }

      return {
        ...lote,
        statusValidade: status,
      };
    });
  }

  getLoteQualidadeById(id: string): LoteQualidade | undefined {
    const lotes = this.getLotesQualidade();
    return lotes.find(l => l.id === id);
  }

  getAnalisesQualidade(loteId?: string): AnaliseQualidade[] {
    if (loteId) {
      return this.analisesQualidade
        .filter(a => a.loteId === loteId)
        .sort((a, b) => a.numeroAnalise - b.numeroAnalise);
    }
    return [...this.analisesQualidade].sort((a, b) => b.dataAnalise.localeCompare(a.dataAnalise));
  }

  getAnaliseQualidadeById(id: string): AnaliseQualidade | undefined {
    return this.analisesQualidade.find(a => a.id === id);
  }

  // --- AUTOCOMPLETAR DADOS DE LOTES EXISTENTES ---
  buscarSugestaoLote(termo: string): Array<{
    lote: string;
    cultura: string;
    cultivar: string;
    categoria: string;
    safra: string;
    peneira?: string;
  }> {
    if (!termo || termo.trim().length < 2) return [];
    const t = termo.trim().toLowerCase();
    const mapa = new Map<string, {
      lote: string;
      cultura: string;
      cultivar: string;
      categoria: string;
      safra: string;
      peneira?: string;
    }>();

    // 1. Dos lotes de qualidade
    this.lotesQualidade.forEach(l => {
      if (l.lote.toLowerCase().includes(t)) {
        mapa.set(l.lote.toUpperCase(), {
          lote: l.lote,
          cultura: l.cultura,
          cultivar: l.cultivar,
          categoria: l.categoria,
          safra: l.safra,
          peneira: l.peneira,
        });
      }
    });

    // 2. Das amostras de canteiro
    this.amostras.forEach(a => {
      if (a.lote && a.lote.toLowerCase().includes(t) && !mapa.has(a.lote.toUpperCase())) {
        mapa.set(a.lote.toUpperCase(), {
          lote: a.lote,
          cultura: a.cultura,
          cultivar: a.cultivar,
          categoria: a.categoria || 'S2',
          safra: a.safra || '2025/2026',
          peneira: a.peneira,
        });
      }
    });

    return Array.from(mapa.values());
  }

  // --- CALCULA CONFORMIDADE DE RESULTADOS ---
  avaliarItemResultado(item: {
    valorResultado: number | string;
    valorMinimo?: number;
    valorMaximo?: number;
    valorMeta?: number;
    tipoComparacao?: 'MIN' | 'MAX' | 'RANGE' | 'INFORMATIVO';
  }): 'CONFORME' | 'NAO_CONFORME' | 'ATENCAO' {
    const num = typeof item.valorResultado === 'number' 
      ? item.valorResultado 
      : parseFloat(String(item.valorResultado).replace(',', '.'));

    if (isNaN(num)) return 'CONFORME';

    // Comparação MIN
    if (item.valorMinimo !== undefined) {
      if (num < item.valorMinimo) return 'NAO_CONFORME';
      if (item.valorMeta !== undefined && num < item.valorMeta) return 'ATENCAO';
    }

    // Comparação MAX
    if (item.valorMaximo !== undefined) {
      if (num > item.valorMaximo) return 'NAO_CONFORME';
      if (item.valorMeta !== undefined && num > item.valorMeta) return 'ATENCAO';
    }

    return 'CONFORME';
  }

  // --- SALVAR NOVA ANÁLISE ORIGINAL ---
  async salvarNovaAnaliseQualidade(dados: {
    lote: string;
    cultura: string;
    cultivar: string;
    categoria: any;
    safra: string;
    quantidade: string;
    peneira?: string;
    tsiTratamento?: string;
    dataAnalise: string;
    dataValidade?: string;
    laboratorio: string;
    numeroCertificadoLaudo: string;
    responsavel: string;
    resultados: Array<{
      testeId: string;
      nomeTeste: string;
      unidade: string;
      valorResultado: number | string;
      valorMinimo?: number;
      valorMaximo?: number;
      valorMeta?: number;
      observacoes?: string;
    }>;
    documentoAnexo?: DocumentoAnexoQualidade;
    observacoes?: string;
    gerarTermoConformidadeAutomatico?: boolean;
  }): Promise<{ lote: LoteQualidade; analise: AnaliseQualidade }> {
    const paramsCultura = this.getParametrosQualidadePorCultura(dados.cultura);
    const diasValidade = paramsCultura.diasValidadePadrao || 180;
    const dataValidade = dados.dataValidade || addDaysToDate(dados.dataAnalise, diasValidade);

    // Avaliar conformidade de cada teste
    let todosConformes = true;
    const resultadosProcessados: ItemResultadoAnalise[] = dados.resultados.map(r => {
      const situacao = this.avaliarItemResultado(r);
      const paramDef = paramsCultura.testes.find(t => t.id === r.testeId);
      if (paramDef?.obrigatorio && situacao === 'NAO_CONFORME') {
        todosConformes = false;
      }
      return {
        ...r,
        situacao,
      };
    });

    // Buscar valores de Germinação, Vigor, Pureza, Umidade
    let germ: number | undefined;
    let vig: number | undefined;
    let pur: number | undefined;
    let umi: number | undefined;

    resultadosProcessados.forEach(r => {
      const n = r.nomeTeste.toLowerCase();
      const valNum = parseFloat(String(r.valorResultado).replace(',', '.'));
      if (!isNaN(valNum)) {
        if (n.includes('germina')) germ = valNum;
        else if (n.includes('vigor')) vig = valNum;
        else if (n.includes('pureza')) pur = valNum;
        else if (n.includes('umidade')) umi = valNum;
      }
    });

    // Criar IDs
    const loteId = `lot-${Date.now()}`;
    const analiseId = `anl-${Date.now()}`;

    // Determinar se termo ou certificado
    const isS1S2 = dados.categoria === 'S1' || dados.categoria === 'S2';
    const gerarTermo = isS1S2 || dados.gerarTermoConformidadeAutomatico;
    const termoNumero = gerarTermo ? `TC-${dados.lote}-ORIG-${new Date().getFullYear()}` : undefined;

    const temDoc = Boolean(dados.documentoAnexo || gerarTermo);

    const novaAnalise: AnaliseQualidade = {
      id: analiseId,
      loteId: loteId,
      numeroAnalise: 1,
      tipo: 'ORIGINAL',
      dataAnalise: dados.dataAnalise,
      dataValidade: dataValidade,
      laboratorio: dados.laboratorio || 'Laboratório de Qualidade',
      numeroCertificadoLaudo: dados.numeroCertificadoLaudo || termoNumero || `LAUDO-${Date.now()}`,
      responsavel: dados.responsavel || (this.getCurrentUser()?.nome ?? 'Analista de CQ'),
      usuarioRegistro: this.getCurrentUser()?.nome ?? 'Usuário do Sistema',
      dataRegistro: new Date().toISOString(),
      parametrosSnapshot: paramsCultura.testes, // Snapshot dos critérios históricos
      resultados: resultadosProcessados,
      resultadoGeralConforme: todosConformes,
      documentoAnexo: dados.documentoAnexo,
      termoConformidadeGerado: Boolean(gerarTermo),
      termoConformidadeDataEmissao: gerarTermo ? dados.dataAnalise : undefined,
      termoConformidadeNumeroDoc: termoNumero,
      observacoes: dados.observacoes,
    };

    const novoLote: LoteQualidade = {
      id: loteId,
      lote: dados.lote.trim(),
      cultura: dados.cultura.trim(),
      cultivar: dados.cultivar.trim(),
      categoria: dados.categoria,
      safra: dados.safra.trim(),
      quantidade: dados.quantidade?.trim() || 'N/I',
      peneira: dados.peneira?.trim(),
      tsiTratamento: dados.tsiTratamento?.trim(),
      analiseOriginalId: analiseId,
      analiseAtualId: analiseId,
      totalReanalises: 0,
      emReanalise: false,
      dataUltimaAnalise: dados.dataAnalise,
      dataValidadeAtual: dataValidade,
      statusValidade: 'VALIDO',
      germinacaoAtual: germ,
      vigorAtual: vig,
      purezaAtual: pur,
      umidadeAtual: umi,
      temDocumento: temDoc,
      tipoDocumentoPrincipal: isS1S2 ? 'TERMO_CONFORMIDADE' : (dados.documentoAnexo?.tipo || 'CERTIFICADO'),
      dataCadastro: new Date().toISOString(),
      dataAtualizacao: new Date().toISOString(),
    };

    // Atualiza estado local
    this.lotesQualidade.unshift(novoLote);
    this.analisesQualidade.unshift(novaAnalise);
    this.notify();

    // Salva no Firestore
    try {
      await setDoc(doc(db, 'qualidade_lotes', loteId), this.sanitizeForFirestore(novoLote));
      await setDoc(doc(db, 'analises_qualidade', analiseId), this.sanitizeForFirestore(novaAnalise));
      await this.registrarAuditoriaQualidade(
        loteId,
        analiseId,
        'CRIACAO_ANALISE',
        `Análise original cadastrada para o lote ${dados.lote} (${dados.cultura}). Validade: ${dataValidade}.`
      );
    } catch (e) {
      console.error('Erro ao persistir nova análise de qualidade no Firestore:', e);
    }

    return { lote: novoLote, analise: novaAnalise };
  }

  // --- SALVAR REANÁLISE (+ REANÁLISE) ---
  // REGRA CRÍTICA: Copia automaticamente os parâmetros e critérios utilizados na análise original
  async salvarReanaliseQualidade(dados: {
    loteId: string;
    dataAnalise: string;
    dataValidade?: string;
    laboratorio: string;
    numeroCertificadoLaudo: string;
    responsavel: string;
    resultados: Array<{
      testeId: string;
      nomeTeste: string;
      unidade: string;
      valorResultado: number | string;
      valorMinimo?: number;
      valorMaximo?: number;
      valorMeta?: number;
      observacoes?: string;
    }>;
    documentoAnexo?: DocumentoAnexoQualidade;
    observacoes?: string;
    gerarTermoConformidadeAutomatico?: boolean;
  }): Promise<{ lote: LoteQualidade; analise: AnaliseQualidade }> {
    const lote = this.lotesQualidade.find(l => l.id === dados.loteId);
    if (!lote) throw new Error('Lote não encontrado para reanálise');

    // Buscar análise original para obter snapshot histórico de parâmetros
    const analiseOriginal = this.analisesQualidade.find(a => a.id === lote.analiseOriginalId) 
      || this.analisesQualidade.find(a => a.loteId === lote.id && a.numeroAnalise === 1);

    const snapshotCriterios = analiseOriginal?.parametrosSnapshot 
      || this.getParametrosQualidadePorCultura(lote.cultura).testes;

    const diasValidade = this.getParametrosQualidadePorCultura(lote.cultura).diasValidadePadrao || 180;
    const dataValidade = dados.dataValidade || addDaysToDate(dados.dataAnalise, diasValidade);

    // Avaliar conformidade de cada teste com base no snapshot histórico
    let todosConformes = true;
    const resultadosProcessados: ItemResultadoAnalise[] = dados.resultados.map(r => {
      const situacao = this.avaliarItemResultado(r);
      const paramDef = snapshotCriterios.find(t => t.id === r.testeId);
      if (paramDef?.obrigatorio && situacao === 'NAO_CONFORME') {
        todosConformes = false;
      }
      return {
        ...r,
        situacao,
      };
    });

    let germ: number | undefined;
    let vig: number | undefined;
    let pur: number | undefined;
    let umi: number | undefined;

    resultadosProcessados.forEach(r => {
      const n = r.nomeTeste.toLowerCase();
      const valNum = parseFloat(String(r.valorResultado).replace(',', '.'));
      if (!isNaN(valNum)) {
        if (n.includes('germina')) germ = valNum;
        else if (n.includes('vigor')) vig = valNum;
        else if (n.includes('pureza')) pur = valNum;
        else if (n.includes('umidade')) umi = valNum;
      }
    });

    const novoNumeroAnalise = (lote.totalReanalises || 0) + 2; // Original = 1, Reanálise #1 = 2...
    const analiseId = `anl-rean-${Date.now()}`;
    const isS1S2 = lote.categoria === 'S1' || lote.categoria === 'S2';
    const gerarTermo = isS1S2 || dados.gerarTermoConformidadeAutomatico;
    const termoNumero = gerarTermo ? `TC-${lote.lote}-REAN${novoNumeroAnalise - 1}-${new Date().getFullYear()}` : undefined;

    const novaAnalise: AnaliseQualidade = {
      id: analiseId,
      loteId: lote.id,
      numeroAnalise: novoNumeroAnalise,
      tipo: 'REANALISE',
      reanaliseDeId: lote.analiseAtualId,
      dataAnalise: dados.dataAnalise,
      dataValidade: dataValidade,
      laboratorio: dados.laboratorio || 'Laboratório de Qualidade',
      numeroCertificadoLaudo: dados.numeroCertificadoLaudo || termoNumero || `LAUDO-REAN-${Date.now()}`,
      responsavel: dados.responsavel || (this.getCurrentUser()?.nome ?? 'Analista de CQ'),
      usuarioRegistro: this.getCurrentUser()?.nome ?? 'Usuário do Sistema',
      dataRegistro: new Date().toISOString(),
      parametrosSnapshot: snapshotCriterios, // Preserva exatamente os critérios da análise original
      resultados: resultadosProcessados,
      resultadoGeralConforme: todosConformes,
      documentoAnexo: dados.documentoAnexo,
      termoConformidadeGerado: Boolean(gerarTermo),
      termoConformidadeDataEmissao: gerarTermo ? dados.dataAnalise : undefined,
      termoConformidadeNumeroDoc: termoNumero,
      observacoes: dados.observacoes,
    };

    const loteAtualizado: LoteQualidade = {
      ...lote,
      analiseAtualId: analiseId,
      totalReanalises: (lote.totalReanalises || 0) + 1,
      emReanalise: false,
      dataUltimaAnalise: dados.dataAnalise,
      dataValidadeAtual: dataValidade,
      germinacaoAtual: germ ?? lote.germinacaoAtual,
      vigorAtual: vig ?? lote.vigorAtual,
      purezaAtual: pur ?? lote.purezaAtual,
      umidadeAtual: umi ?? lote.umidadeAtual,
      temDocumento: dados.documentoAnexo ? true : (gerarTermo ? true : lote.temDocumento),
      dataAtualizacao: new Date().toISOString(),
    };

    // Atualiza estado local
    const loteIdx = this.lotesQualidade.findIndex(l => l.id === lote.id);
    if (loteIdx >= 0) {
      this.lotesQualidade[loteIdx] = loteAtualizado;
    }
    this.analisesQualidade.unshift(novaAnalise);
    this.notify();

    // Persiste no Firestore
    try {
      await setDoc(doc(db, 'qualidade_lotes', lote.id), this.sanitizeForFirestore(loteAtualizado));
      await setDoc(doc(db, 'analises_qualidade', analiseId), this.sanitizeForFirestore(novaAnalise));
      await this.registrarAuditoriaQualidade(
        lote.id,
        analiseId,
        'REANALISE',
        `Reanálise #${novoNumeroAnalise - 1} registrada para o lote ${lote.lote}. Nova validade: ${dataValidade}.`
      );
    } catch (e) {
      console.error('Erro ao persistir reanálise no Firestore:', e);
    }

    return { lote: loteAtualizado, analise: novaAnalise };
  }

  // --- MARCAR LOTE EM REANÁLISE ---
  async setLoteEmReanalise(loteId: string, emReanalise: boolean) {
    const lote = this.lotesQualidade.find(l => l.id === loteId);
    if (!lote) return;
    lote.emReanalise = emReanalise;
    lote.dataAtualizacao = new Date().toISOString();
    this.notify();

    try {
      await setDoc(doc(db, 'qualidade_lotes', loteId), this.sanitizeForFirestore(lote));
      await this.registrarAuditoriaQualidade(
        loteId,
        undefined,
        'REANALISE',
        emReanalise ? `Lote ${lote.lote} marcado como 'Em Reanálise'.` : `Lote ${lote.lote} retirado de 'Em Reanálise'.`
      );
    } catch (e) {
      console.error('Erro ao atualizar status de reanálise:', e);
    }
  }

  // --- ANEXAR DOCUMENTO A UMA ANÁLISE ---
  async anexarDocumentoQualidade(loteId: string, analiseId: string, docAnexo: DocumentoAnexoQualidade) {
    const analise = this.analisesQualidade.find(a => a.id === analiseId);
    const lote = this.lotesQualidade.find(l => l.id === loteId);
    if (analise) {
      analise.documentoAnexo = docAnexo;
    }
    if (lote) {
      lote.temDocumento = true;
      lote.tipoDocumentoPrincipal = docAnexo.tipo;
      lote.dataAtualizacao = new Date().toISOString();
    }
    this.notify();

    try {
      if (analise) {
        await setDoc(doc(db, 'analises_qualidade', analiseId), this.sanitizeForFirestore(analise));
      }
      if (lote) {
        await setDoc(doc(db, 'qualidade_lotes', loteId), this.sanitizeForFirestore(lote));
      }
      await this.registrarAuditoriaQualidade(
        loteId,
        analiseId,
        'ANEXO_DOCUMENTO',
        `Documento '${docAnexo.nomeArquivo}' (${docAnexo.tipo}) anexado à análise.`
      );
    } catch (e) {
      console.error('Erro ao anexar documento:', e);
    }
  }

  // --- CONFIGURAÇÃO DO TERMO DE CONFORMIDADE (MAPA) ---
  getConfigTermoConformidade(): ConfiguracaoTermoConformidade {
    return { ...this.configTermoConformidade };
  }

  async saveConfigTermoConformidade(config: ConfiguracaoTermoConformidade) {
    this.configTermoConformidade = { ...config };
    this.notify();
    try {
      await setDoc(doc(db, 'config_termo_conformidade', 'padrao'), this.sanitizeForFirestore(config));
      await this.registrarAuditoriaQualidade(
        'config-termo',
        undefined,
        'ALTERACAO_PARAMETROS',
        `Configurações do Termo de Conformidade atualizadas para ${config.razaoSocial}.`
      );
    } catch (e) {
      console.error('Erro ao salvar config do termo no Firestore:', e);
    }
  }

  // --- EDITAR LOTE E ANÁLISE COMPLETA (QUALQUER INFORMAÇÃO) ---
  async editarLoteEAnalise(
    loteId: string,
    analiseId: string,
    dadosLote: Partial<LoteQualidade>,
    dadosAnalise: Partial<AnaliseQualidade>
  ): Promise<{ lote: LoteQualidade; analise: AnaliseQualidade }> {
    const loteIdx = this.lotesQualidade.findIndex(l => l.id === loteId);
    const analiseIdx = this.analisesQualidade.findIndex(a => a.id === analiseId);

    if (loteIdx < 0) {
      throw new Error(`Lote ${loteId} não encontrado para edição.`);
    }

    const loteAtual = this.lotesQualidade[loteIdx];
    const analiseAtual = analiseIdx >= 0 ? this.analisesQualidade[analiseIdx] : undefined;

    // Processar resultados da análise se fornecidos
    let resultadosAtualizados = dadosAnalise.resultados || analiseAtual?.resultados || [];
    let todosConformes = true;

    resultadosAtualizados = resultadosAtualizados.map(res => {
      let conforme = true;
      const numVal = typeof res.valorResultado === 'number' 
        ? res.valorResultado 
        : (res.valorResultado !== undefined ? parseFloat(String(res.valorResultado).replace(',', '.')) : undefined);

      if (res.tipoComparacao === 'MIN' && res.valorMinimo !== undefined) {
        if (numVal !== undefined && !isNaN(numVal) && numVal < res.valorMinimo) conforme = false;
      }
      if (res.tipoComparacao === 'MAX' && res.valorMaximo !== undefined) {
        if (numVal !== undefined && !isNaN(numVal) && numVal > res.valorMaximo) conforme = false;
      }
      if (res.obrigatorio && !conforme) todosConformes = false;
      return {
        ...res,
        situacao: (conforme ? 'CONFORME' : 'REPROVADO') as 'CONFORME' | 'REPROVADO'
      };
    });

    const parseNum = (val: any): number | undefined => {
      if (val === undefined || val === null || val === '') return undefined;
      const parsed = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
      return isNaN(parsed) ? undefined : parsed;
    };

    const rawGerm = resultadosAtualizados.find(r => r.nomeTeste.toLowerCase().includes('germina'))?.valorResultado;
    const rawVig = resultadosAtualizados.find(r => r.nomeTeste.toLowerCase().includes('vigor'))?.valorResultado;
    const rawPur = resultadosAtualizados.find(r => r.nomeTeste.toLowerCase().includes('pureza'))?.valorResultado;
    const rawUmi = resultadosAtualizados.find(r => r.nomeTeste.toLowerCase().includes('umidade'))?.valorResultado;

    const germ = parseNum(rawGerm);
    const vig = parseNum(rawVig);
    const pur = parseNum(rawPur);
    const umi = parseNum(rawUmi);

    const dataValidadeFinal = dadosAnalise.dataValidade || dadosLote.dataValidadeAtual || loteAtual.dataValidadeAtual;
    const dataUltimaAnaliseFinal = dadosAnalise.dataAnalise || dadosLote.dataUltimaAnalise || loteAtual.dataUltimaAnalise;

    const loteAtualizado: LoteQualidade = {
      ...loteAtual,
      ...dadosLote,
      dataUltimaAnalise: dataUltimaAnaliseFinal,
      dataValidadeAtual: dataValidadeFinal,
      germinacaoAtual: germ !== undefined ? germ : (dadosLote.germinacaoAtual ?? loteAtual.germinacaoAtual),
      vigorAtual: vig !== undefined ? vig : (dadosLote.vigorAtual ?? loteAtual.vigorAtual),
      purezaAtual: pur !== undefined ? pur : (dadosLote.purezaAtual ?? loteAtual.purezaAtual),
      umidadeAtual: umi !== undefined ? umi : (dadosLote.umidadeAtual ?? loteAtual.umidadeAtual),
      dataAtualizacao: new Date().toISOString(),
    };

    let analiseAtualizada: AnaliseQualidade;
    if (analiseAtual) {
      analiseAtualizada = {
        ...analiseAtual,
        ...dadosAnalise,
        dataAnalise: dataUltimaAnaliseFinal,
        dataValidade: dataValidadeFinal,
        resultados: resultadosAtualizados,
        resultadoGeralConforme: todosConformes,
      };
    } else {
      analiseAtualizada = {
        id: analiseId,
        loteId,
        numeroAnalise: 1,
        tipo: 'ORIGINAL',
        dataAnalise: dataUltimaAnaliseFinal,
        dataValidade: dataValidadeFinal,
        laboratorio: dadosAnalise.laboratorio || 'Laboratório Central',
        numeroCertificadoLaudo: dadosAnalise.numeroCertificadoLaudo || '',
        responsavel: dadosAnalise.responsavel || (this.getCurrentUser()?.nome ?? 'Responsável Técnico'),
        usuarioRegistro: this.getCurrentUser()?.nome ?? 'Sistema',
        dataRegistro: new Date().toISOString(),
        parametrosSnapshot: [],
        resultados: resultadosAtualizados,
        resultadoGeralConforme: todosConformes,
        observacoes: dadosAnalise.observacoes,
      };
    }

    this.lotesQualidade[loteIdx] = loteAtualizado;
    if (analiseIdx >= 0) {
      this.analisesQualidade[analiseIdx] = analiseAtualizada;
    } else {
      this.analisesQualidade.unshift(analiseAtualizada);
    }
    this.notify();

    try {
      await setDoc(doc(db, 'qualidade_lotes', loteId), this.sanitizeForFirestore(loteAtualizado));
      await setDoc(doc(db, 'analises_qualidade', analiseId), this.sanitizeForFirestore(analiseAtualizada));
      await this.registrarAuditoriaQualidade(
        loteId,
        analiseId,
        'EDICAO_LOTE',
        `Lote ${loteAtualizado.lote} e análise atualizados com sucesso.`
      );
    } catch (e) {
      console.error('Erro ao atualizar lote e análise no Firestore:', e);
    }

    return { lote: loteAtualizado, analise: analiseAtualizada };
  }

  // --- EXCLUIR LOTE COMPLETO E TODAS AS SUAS ANÁLISES ---
  async excluirLoteQualidade(loteId: string): Promise<void> {
    const lote = this.lotesQualidade.find(l => l.id === loteId);
    if (!lote) return;

    const analisesDoLote = this.analisesQualidade.filter(a => a.loteId === loteId);

    // Remove do estado em memória
    this.lotesQualidade = this.lotesQualidade.filter(l => l.id !== loteId);
    this.analisesQualidade = this.analisesQualidade.filter(a => a.loteId !== loteId);
    this.notify();

    // Persiste exclusão no Firestore
    try {
      await deleteDoc(doc(db, 'qualidade_lotes', loteId));
      for (const anl of analisesDoLote) {
        await deleteDoc(doc(db, 'analises_qualidade', anl.id));
      }
      await this.registrarAuditoriaQualidade(
        loteId,
        undefined,
        'EXCLUSAO_LOTE',
        `Lote ${lote.lote} (${lote.cultura} - ${lote.cultivar}) e suas ${analisesDoLote.length} análises foram excluídos permanentemente.`
      );
    } catch (e) {
      console.error('Erro ao excluir lote do Firestore:', e);
    }
  }

  // --- EXCLUIR UMA ANÁLISE ESPECÍFICA DE UM LOTE ---
  async excluirAnaliseQualidade(loteId: string, analiseId: string): Promise<void> {
    const analisesDoLote = this.analisesQualidade.filter(a => a.loteId === loteId);
    const analise = this.analisesQualidade.find(a => a.id === analiseId);
    const lote = this.lotesQualidade.find(l => l.id === loteId);

    if (!lote || !analise) return;

    // Se for a única análise, exclui o lote inteiro
    if (analisesDoLote.length <= 1) {
      await this.excluirLoteQualidade(loteId);
      return;
    }

    // Se tiver mais de uma, exclui a análise e retrocede o lote para a análise mais recente restante
    this.analisesQualidade = this.analisesQualidade.filter(a => a.id !== analiseId);
    const analisesRestantes = this.analisesQualidade
      .filter(a => a.loteId === loteId)
      .sort((a, b) => b.numeroAnalise - a.numeroAnalise);

    const analiseRecente = analisesRestantes[0];
    const parseNum = (val: any): number | undefined => {
      if (val === undefined || val === null || val === '') return undefined;
      const parsed = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
      return isNaN(parsed) ? undefined : parsed;
    };

    const rawGerm = analiseRecente.resultados.find(r => r.nomeTeste.toLowerCase().includes('germina'))?.valorResultado;
    const rawVig = analiseRecente.resultados.find(r => r.nomeTeste.toLowerCase().includes('vigor'))?.valorResultado;
    const rawPur = analiseRecente.resultados.find(r => r.nomeTeste.toLowerCase().includes('pureza'))?.valorResultado;
    const rawUmi = analiseRecente.resultados.find(r => r.nomeTeste.toLowerCase().includes('umidade'))?.valorResultado;

    const germ = parseNum(rawGerm);
    const vig = parseNum(rawVig);
    const pur = parseNum(rawPur);
    const umi = parseNum(rawUmi);

    const loteAtualizado: LoteQualidade = {
      ...lote,
      analiseAtualId: analiseRecente.id,
      totalReanalises: Math.max(0, analisesRestantes.length - 1),
      dataUltimaAnalise: analiseRecente.dataAnalise,
      dataValidadeAtual: analiseRecente.dataValidade,
      germinacaoAtual: germ ?? lote.germinacaoAtual,
      vigorAtual: vig ?? lote.vigorAtual,
      purezaAtual: pur ?? lote.purezaAtual,
      umidadeAtual: umi ?? lote.umidadeAtual,
      dataAtualizacao: new Date().toISOString(),
    };

    const loteIdx = this.lotesQualidade.findIndex(l => l.id === loteId);
    if (loteIdx >= 0) {
      this.lotesQualidade[loteIdx] = loteAtualizado;
    }
    this.notify();

    try {
      await deleteDoc(doc(db, 'analises_qualidade', analiseId));
      await setDoc(doc(db, 'qualidade_lotes', loteId), this.sanitizeForFirestore(loteAtualizado));
      await this.registrarAuditoriaQualidade(
        loteId,
        analiseId,
        'EXCLUSAO_ANALISE',
        `Análise #${analise.numeroAnalise} excluída do lote ${lote.lote}. Lote restaurado para análise #${analiseRecente.numeroAnalise}.`
      );
    } catch (e) {
      console.error('Erro ao excluir análise:', e);
    }
  }

  // --- IMPORTAÇÃO DE LOTES EM MASSA VIA PLANILHA ---
  async importarLotesEmMassa(
    linhas: Array<{
      lote: string;
      cultura: string;
      cultivar: string;
      categoria?: string;
      safra?: string;
      quantidade?: string;
      peneira?: string;
      tsiTratamento?: string;
      dataAnalise?: string;
      dataValidade?: string;
      laboratorio?: string;
      numeroCertificadoLaudo?: string;
      responsavel?: string;
      germinacao?: number;
      vigor?: number;
      pureza?: number;
      umidade?: number;
      observacoes?: string;
      documentoAnexoNome?: string;
    }>
  ): Promise<{ importados: number; erros: string[] }> {
    let importados = 0;
    const erros: string[] = [];

    for (let i = 0; i < linhas.length; i++) {
      const row = linhas[i];
      const linhaNum = i + 2; // Cabeçalho é linha 1

      if (!row.lote || !row.lote.trim()) {
        erros.push(`Linha ${linhaNum}: Código do lote não informado.`);
        continue;
      }
      if (!row.cultura || !row.cultura.trim()) {
        erros.push(`Linha ${linhaNum} (Lote ${row.lote}): Cultura não informada.`);
        continue;
      }

      try {
        const culturaConfig = this.getParametrosQualidadePorCultura(row.cultura);
        const dataAnalise = row.dataAnalise && row.dataAnalise.trim() ? row.dataAnalise.trim() : getTodayBR();
        const diasValidade = culturaConfig.diasValidadePadrao || 180;
        const dataValidade = row.dataValidade && row.dataValidade.trim() ? row.dataValidade.trim() : addDaysToDate(dataAnalise, diasValidade);

        const resultados: ItemResultadoAnalise[] = [];

        // Montar testes baseados nos parâmetros da cultura
        culturaConfig.testes.forEach(t => {
          let valor: number | undefined = undefined;
          const nomeLow = t.nome.toLowerCase();
          if (nomeLow.includes('germina')) valor = row.germinacao;
          else if (nomeLow.includes('vigor')) valor = row.vigor;
          else if (nomeLow.includes('pureza')) valor = row.pureza;
          else if (nomeLow.includes('umidade')) valor = row.umidade;

          let situacao: 'CONFORME' | 'REPROVADO' = 'CONFORME';
          if (valor !== undefined) {
            if (t.tipoComparacao === 'MIN' && t.valorMinimo !== undefined && valor < t.valorMinimo) {
              situacao = 'REPROVADO';
            }
            if (t.tipoComparacao === 'MAX' && t.valorMaximo !== undefined && valor > t.valorMaximo) {
              situacao = 'REPROVADO';
            }
          }

          resultados.push({
            testeId: t.id,
            nomeTeste: t.nome,
            unidade: t.unidade,
            valorResultado: valor,
            valorMinimo: t.valorMinimo,
            valorMaximo: t.valorMaximo,
            valorMeta: t.valorMeta,
            tipoComparacao: t.tipoComparacao,
            obrigatorio: t.obrigatorio,
            situacao,
          });
        });

        // Adicionar testes se não estavam nos testes configurados
        if (row.germinacao !== undefined && !resultados.some(r => r.nomeTeste.toLowerCase().includes('germina'))) {
          resultados.unshift({
            testeId: 't-germ',
            nomeTeste: 'Germinação',
            unidade: '%',
            valorResultado: row.germinacao,
            valorMinimo: 80,
            valorMeta: 85,
            tipoComparacao: 'MIN',
            obrigatorio: true,
            situacao: row.germinacao >= 80 ? 'CONFORME' : 'REPROVADO'
          });
        }
        if (row.vigor !== undefined && !resultados.some(r => r.nomeTeste.toLowerCase().includes('vigor'))) {
          resultados.push({
            testeId: 't-vig',
            nomeTeste: 'Vigor',
            unidade: '%',
            valorResultado: row.vigor,
            valorMinimo: 75,
            valorMeta: 80,
            tipoComparacao: 'MIN',
            obrigatorio: true,
            situacao: row.vigor >= 75 ? 'CONFORME' : 'REPROVADO'
          });
        }
        if (row.pureza !== undefined && !resultados.some(r => r.nomeTeste.toLowerCase().includes('pureza'))) {
          resultados.push({
            testeId: 't-pur',
            nomeTeste: 'Pureza Física',
            unidade: '%',
            valorResultado: row.pureza,
            valorMinimo: 98.0,
            valorMeta: 99.0,
            tipoComparacao: 'MIN',
            obrigatorio: true,
            situacao: row.pureza >= 98.0 ? 'CONFORME' : 'REPROVADO'
          });
        }
        if (row.umidade !== undefined && !resultados.some(r => r.nomeTeste.toLowerCase().includes('umidade'))) {
          resultados.push({
            testeId: 't-umi',
            nomeTeste: 'Umidade',
            unidade: '%',
            valorResultado: row.umidade,
            valorMaximo: 13.0,
            valorMeta: 12.0,
            tipoComparacao: 'MAX',
            obrigatorio: true,
            situacao: row.umidade <= 13.0 ? 'CONFORME' : 'REPROVADO'
          });
        }

        const categoriaValida = (['Básica', 'C1', 'C2', 'S1', 'S2'].includes(row.categoria || '') 
          ? row.categoria 
          : 'S2') as any;

        const isTermo = categoriaValida === 'S1' || categoriaValida === 'S2';

        await this.salvarNovaAnaliseQualidade({
          lote: row.lote.trim().toUpperCase(),
          cultura: row.cultura.trim(),
          cultivar: row.cultivar ? row.cultivar.trim() : 'Padrão',
          categoria: categoriaValida,
          safra: row.safra ? row.safra.trim() : '2025/2026',
          quantidade: row.quantidade || '',
          peneira: row.peneira || '',
          tsiTratamento: row.tsiTratamento || '',
          dataAnalise,
          dataValidade,
          laboratorio: row.laboratorio || 'Laboratório de Controle de Qualidade',
          numeroCertificadoLaudo: row.numeroCertificadoLaudo || `IMP-${Date.now().toString().slice(-6)}`,
          responsavel: row.responsavel || (this.getCurrentUser()?.nome ?? 'Técnico Responsável'),
          resultados,
          gerarTermoConformidadeAutomatico: isTermo,
          observacoes: row.observacoes ? `${row.observacoes} (Importado via Planilha)` : 'Importado via Planilha.',
        });

        importados++;
      } catch (err: any) {
        erros.push(`Linha ${linhaNum} (Lote ${row.lote}): ${err.message || 'Erro ao processar linha'}`);
      }
    }

    if (importados > 0) {
      await this.registrarAuditoriaQualidade(
        'importacao-massa',
        undefined,
        'IMPORTACAO_PLANILHA',
        `Importação em massa concluída: ${importados} lote(s) importado(s) com sucesso.`
      );
    }

    return { importados, erros };
  }
  async registrarAuditoriaQualidade(
    loteId: string,
    analiseId: string | undefined,
    acao: AuditoriaQualidade['acao'],
    detalhes: string
  ) {
    const audId = `aud-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const audit: AuditoriaQualidade = {
      id: audId,
      loteId,
      analiseId,
      usuario: this.getCurrentUser()?.nome ?? 'Sistema',
      dataHora: new Date().toISOString(),
      acao,
      detalhes,
    };
    this.auditoriasQualidade.unshift(audit);

    try {
      await setDoc(doc(db, 'auditoria_qualidade', audId), this.sanitizeForFirestore(audit));
    } catch (e) {
      //
    }
  }

  getAuditoriaQualidade(loteId?: string): AuditoriaQualidade[] {
    if (loteId) {
      return this.auditoriasQualidade.filter(a => a.loteId === loteId);
    }
    return [...this.auditoriasQualidade];
  }

  // --- DASHBOARD DE QUALIDADE STATS ---
  getDashboardQualidadeStats(): DashboardQualidadeStats {
    const lotes = this.getLotesQualidade();
    const totalLotes = lotes.length;
    const lotesValidos = lotes.filter(l => l.statusValidade === 'VALIDO').length;
    const proximosVencimento = lotes.filter(l => l.statusValidade === 'PROXIMO_VENCIMENTO').length;
    const lotesVencidos = lotes.filter(l => l.statusValidade === 'VENCIDO').length;
    const lotesEmReanalise = lotes.filter(l => l.statusValidade === 'EM_REANALISE').length;
    const lotesSemDocumentacao = lotes.filter(l => !l.temDocumento || l.statusValidade === 'SEM_DOCUMENTO').length;
    const lotesComCertificado = lotes.filter(l => l.temDocumento && (l.tipoDocumentoPrincipal === 'CERTIFICADO' || l.categoria === 'Básica' || l.categoria === 'C1' || l.categoria === 'C2')).length;
    const lotesComTermoConformidade = lotes.filter(l => l.tipoDocumentoPrincipal === 'TERMO_CONFORMIDADE' || l.categoria === 'S1' || l.categoria === 'S2').length;
    const totalReanalises = lotes.reduce((acc, curr) => acc + (curr.totalReanalises || 0), 0);

    return {
      totalLotes,
      lotesValidos,
      proximosVencimento,
      lotesVencidos,
      lotesEmReanalise,
      lotesSemDocumentacao,
      lotesComCertificado,
      lotesComTermoConformidade,
      totalReanalises,
    };
  }

  async resetToDefaultData() {
    await this.seedCollection('amostras', INITIAL_AMOSTRAS);
    await this.seedCollection('avaliacoes', INITIAL_AVALIACOES);
    await this.seedCollection('usuarios', DEFAULT_USERS);
    await this.seedCollection('configuracoes', DEFAULT_CONFIGS.map(c => ({ id: c.cultura.toLowerCase(), ...c })));
    await this.seedCollection('parametros_qualidade_cultura', DEFAULT_PARAMETROS_CULTURA);
    await this.seedCollection('qualidade_lotes', INITIAL_LOTES_QUALIDADE);
    await this.seedCollection('analises_qualidade', INITIAL_ANALISES_QUALIDADE);
  }

}

export const storageService = new StorageService();
