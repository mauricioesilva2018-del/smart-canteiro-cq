export type PerfilUsuario = 'Administrador' | 'Operador' | 'Qualidade' | 'Visualizador';

export type StatusAmostra = 'Pendente' | 'Concluído';

export type ResultadoAprovacao = 'Aprovado' | 'Reprovado';

export interface Amostra {
  id: string;
  protocolo: string;
  cultura: string;
  cultivar: string;
  lote: string;
  peneira: string;
  categoria: string;
  safra: string;
  dataSemeadura: string; // Data de lançamento da amostra
  responsavel: string;
  observacoes: string;
  status: StatusAmostra;
  qrCode: string;
  dataCadastro: string;
  dataAtualizacao: string;
  quantidadeSementes?: number; // Padrão: 100
  tsiMatriz?: string;
  dataLeitura7dias?: string;  // Calculado: dataSemeadura + 7 dias
  dataLeitura10dias?: string; // Calculado: dataSemeadura + 10 dias
  leitura7diasRealizada?: boolean;
  dataRealizacao7dias?: string;
  plantulasEmergidas7dias?: number; // Quantidade de plântulas emergidas registradas na leitura de 7 dias
  usuarioLeitura7dias?: string;
  obsLeitura7dias?: string;
  leitura10diasRealizada?: boolean;
  dataRealizacao10dias?: string;
}

export interface Avaliacao {
  id: string;
  amostraId: string;
  tipoLeitura?: '7_dias' | '10_dias' | 'final';
  plantulasEmergidas7dias?: number; // Referência da leitura de 7 dias
  fortes: number;
  intermediarias: number;
  fracas: number;
  anormais: number;
  mortas: number;
  germinacao: number; // Percentual calculated: fortes + intermediarias + fracas
  percentualAnormais?: number; // Percentual calculated: anormais
  percentualMortas: number; // Percentual calculated: mortas
  resultadoAprovacao: ResultadoAprovacao;
  observacoes: string;
  dataAvaliacao: string;
  horaAvaliacao: string;
  usuarioAvaliador: string;
}

export interface FotoAmostra {
  id: string;
  amostraId: string;
  foto: string; // Base64 data URL
  dataUpload: string;
  nome?: string;
  descricao?: string;
  syncStatus?: SyncItemStatus;
}

export interface Usuario {
  id: string;
  nome: string;
  senha?: string;
  email?: string;
  perfil: PerfilUsuario;
  ativo: boolean;
}

export interface ConfiguracaoAprovacao {
  cultura: string;
  percentualMinimo: number;
}

export type SyncItemStatus = 'pendente' | 'sincronizando' | 'sincronizado' | 'erro';

export interface SyncQueueItem {
  id: string;
  entidadeId: string;
  tipo: 'FOTO_ADD' | 'FOTO_DELETE' | 'AVALIACAO_SAVE' | 'AVALIACAO_DELETE' | 'AMOSTRA_SAVE' | 'AMOSTRA_DELETE' | 'LEITURA_7DIAS';
  titulo: string;
  payload: any;
  dataCriacao: string;
  status: SyncItemStatus;
  tentativas: number;
  mensagemErro?: string;
  ultimaTentativa?: string;
}

export interface SyncOperation {
  id: string;
  type: 'AMOSTRA_CREATE' | 'AMOSTRA_UPDATE' | 'AMOSTRA_DELETE' | 'AVALIACAO_CREATE' | 'AVALIACAO_DELETE' | 'FOTO_ADD' | 'FOTO_DELETE';
  payload: any;
  timestamp: string;
}

export interface DashboardStats {
  totalAmostras: number;
  amostrasPendentes: number;
  amostrasConcluidas: number;
  germinacaoMedia: number;
  mediaPlantasFortes: number;
  mediaPlantasMortas: number;
  avaliacoesPeriodo: number;
}

// ==========================================
// MÓDULO: QUALIDADE DE LOTES
// ==========================================

export type CategoriaLote = 'Básica' | 'C1' | 'C2' | 'S1' | 'S2';

export type StatusValidadeLote = 
  | 'VALIDO' 
  | 'PROXIMO_VENCIMENTO' 
  | 'VENCIDO' 
  | 'EM_REANALISE' 
  | 'SEM_DOCUMENTO';

export type SituacaoResultadoItem = 'CONFORME' | 'NAO_CONFORME' | 'ATENCAO' | 'REPROVADO';

export type TipoDocumentoQualidade = 'CERTIFICADO' | 'TERMO_CONFORMIDADE' | 'LAUDO_LABORATORIAL' | 'OUTROS';

export interface TipoTesteQualidade {
  id: string;
  nome: string;
  unidade: string;
  valorMinimo?: number;
  valorMaximo?: number;
  valorMeta?: number;
  tipoComparacao: 'MIN' | 'MAX' | 'RANGE' | 'INFORMATIVO';
  obrigatorio: boolean;
  ordem?: number;
  descricao?: string;
}

export interface ParametroQualidadeCultura {
  id: string;
  cultura: string;
  testes: TipoTesteQualidade[];
  diasValidadePadrao: number; // Padrão: 180 dias
  diasAlertaVencimentoPadrao: number; // Padrão: 30 dias
}

export interface ItemResultadoAnalise {
  testeId: string;
  nomeTeste: string;
  unidade: string;
  valorResultado: number | string;
  valorMinimo?: number;
  valorMaximo?: number;
  valorMeta?: number;
  tipoComparacao?: 'MIN' | 'MAX' | 'RANGE' | 'INFORMATIVO';
  obrigatorio?: boolean;
  situacao: SituacaoResultadoItem;
  observacoes?: string;
}

export interface DocumentoAnexoQualidade {
  id: string;
  loteId: string;
  analiseId: string;
  tipo: TipoDocumentoQualidade;
  nomeArquivo: string;
  dataUpload: string;
  arquivoBase64?: string;
  tipoMime?: string;
  tamanhoBytes?: number;
  emitidoPor?: string;
  numeroDocumento?: string;
}

export interface AnaliseQualidade {
  id: string;
  loteId: string;
  numeroAnalise: number; // 1 para Original, 2 para Reanálise #01, 3 para Reanálise #02...
  tipo: 'ORIGINAL' | 'REANALISE';
  reanaliseDeId?: string; // ID da análise anterior se for reanálise
  dataAnalise: string; // YYYY-MM-DD
  dataValidade: string; // YYYY-MM-DD
  laboratorio: string;
  numeroCertificadoLaudo: string;
  responsavel: string;
  usuarioRegistro: string;
  dataRegistro: string;
  parametrosSnapshot: TipoTesteQualidade[]; // Snapshot histórico dos critérios utilizados nesta análise
  resultados: ItemResultadoAnalise[];
  resultadoGeralConforme: boolean;
  documentoAnexo?: DocumentoAnexoQualidade;
  termoConformidadeGerado?: boolean;
  termoConformidadeDataEmissao?: string;
  termoConformidadeNumeroDoc?: string;
  observacoes?: string;
}

export interface LoteQualidade {
  id: string;
  lote: string; // Ex: 'L-2026-SRG-115'
  cultura: string;
  cultivar: string;
  categoria: CategoriaLote;
  safra: string;
  quantidade: string; // Ex: '25.000 kg' ou '500 sc'
  peneira?: string;
  tsiTratamento?: string;
  analiseOriginalId: string;
  analiseAtualId: string;
  totalReanalises: number;
  emReanalise?: boolean;
  dataUltimaAnalise: string;
  dataValidadeAtual: string;
  statusValidade: StatusValidadeLote;
  germinacaoAtual?: number;
  vigorAtual?: number;
  purezaAtual?: number;
  umidadeAtual?: number;
  temDocumento: boolean;
  tipoDocumentoPrincipal?: TipoDocumentoQualidade;
  dataCadastro: string;
  dataAtualizacao: string;
}

export interface AuditoriaQualidade {
  id: string;
  loteId: string;
  analiseId?: string;
  usuario: string;
  dataHora: string;
  acao: 'CRIACAO_ANALISE' | 'REANALISE' | 'ANEXO_DOCUMENTO' | 'GERACAO_TERMO' | 'ALTERACAO_PARAMETROS' | 'EDICAO_RESULTADOS' | 'EDICAO_LOTE' | 'EXCLUSAO_LOTE' | 'EXCLUSAO_ANALISE' | 'IMPORTACAO_PLANILHA';
  detalhes: string;
}

export interface ConfiguracaoAlertasQualidade {
  diasAlertaAntecedencia: number; // Ex: 30, 15, 7, 1
}

export interface ConfiguracaoTermoConformidade {
  razaoSocial: string;
  cnpj: string;
  renasem: string;
  endereco: string;
  cidadeUf: string;
  responsavelTecnico: string;
  creaRenasem: string;
  declaracaoLegal?: string;
  observacoesPadrao?: string;
}

export interface DashboardQualidadeStats {
  totalLotes: number;
  lotesValidos: number;
  proximosVencimento: number;
  lotesVencidos: number;
  lotesEmReanalise: number;
  lotesSemDocumentacao: number;
  lotesComCertificado: number;
  lotesComTermoConformidade: number;
  totalReanalises: number;
}

