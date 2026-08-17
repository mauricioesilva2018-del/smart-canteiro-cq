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
  leitura10diasRealizada?: boolean;
  dataRealizacao10dias?: string;
}

export interface Avaliacao {
  id: string;
  amostraId: string;
  tipoLeitura?: '7_dias' | '10_dias' | 'final';
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
