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
import { Amostra, Avaliacao, FotoAmostra, Usuario, ConfiguracaoAprovacao, SyncOperation } from '../types';
import { calculateLeituraDates, addDaysToDate } from '../utils/dateUtils';

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

class StorageService {
  private amostras: Amostra[] = INITIAL_AMOSTRAS;
  private avaliacoes: Avaliacao[] = INITIAL_AVALIACOES;
  private fotos: FotoAmostra[] = [];
  private configuracoes: ConfiguracaoAprovacao[] = DEFAULT_CONFIGS;
  private usuarios: Usuario[] = DEFAULT_USERS;

  private isInitialized = false;
  private listeners: Set<() => void> = new Set();
  private firebaseUser: FirebaseUser | null = null;

  constructor() {
    this.initFirebase();
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
          },
          {
            id: 'ft-102-1',
            amostraId: 'ams-102',
            foto: generateSeedlingPlaceholder('Canteiro Milho - PRT-2026-002', '#1b4332'),
            dataUpload: '2026-07-25T10:18:00Z',
            nome: 'Emergência Milho 7 Dias',
            descricao: 'Plântulas fortes e cor coleóptilo normal.',
          }
        ];
        await this.seedCollection('fotos', initialFotos);
      } else {
        this.fotos = snapshot.docs.map(doc => doc.data() as FotoAmostra);
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
    const firebaseUser = await this.ensureFirebaseAuth();
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
      const newId = 'ams-' + Date.now();
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

    const payloadToSave = this.sanitizeForFirestore(targetAmostra);

    try {
      // Persistir no Firestore
      await setDoc(doc(db, 'amostras', targetAmostra.id), payloadToSave);

      // Atualização otimista local
      const idx = this.amostras.findIndex(a => a.id === targetAmostra.id);
      if (idx !== -1) {
        this.amostras[idx] = targetAmostra;
      } else {
        this.amostras.unshift(targetAmostra);
      }
      this.notify();

      return targetAmostra;
    } catch (error: any) {
      console.error('Erro retornado pelo Firebase Firestore ao salvar amostra:', {
        code: error?.code,
        message: error?.message,
        docId: targetAmostra.id,
        authUid: firebaseUser?.uid,
        payload: payloadToSave,
        errorOriginal: error,
      });
      throw error;
    }
  }

  async deleteAmostra(id: string): Promise<boolean> {
    if (!id) return false;
    const target = this.getAmostraById(id);
    const targetId = target ? target.id : id;

    try {
      // 1. Excluir documento de amostra no Firestore
      await deleteDoc(doc(db, 'amostras', targetId));

      // 2. Excluir avaliações vinculadas no Firestore
      const linkedAvaliacoes = this.avaliacoes.filter(a => a.amostraId === targetId || a.amostraId === id);
      for (const avl of linkedAvaliacoes) {
        await deleteDoc(doc(db, 'avaliacoes', avl.id));
      }

      // 3. Excluir fotos vinculadas no Firestore
      const linkedFotos = this.fotos.filter(f => f.amostraId === targetId || f.amostraId === id);
      for (const ft of linkedFotos) {
        await deleteDoc(doc(db, 'fotos', ft.id));
      }

      // Atualizar cache local
      this.amostras = this.amostras.filter(a => a.id !== targetId && a.protocolo !== id);
      this.avaliacoes = this.avaliacoes.filter(a => a.amostraId !== targetId && a.amostraId !== id);
      this.fotos = this.fotos.filter(f => f.amostraId !== targetId && f.amostraId !== id);

      this.notify();
      return true;
    } catch (error) {
      console.error('Erro ao excluir amostra no Firestore:', error);
      throw error;
    }
  }

  // --- AVALIAÇÕES ---
  getAvaliacoes(): Avaliacao[] {
    return this.avaliacoes;
  }

  getAvaliacaoByAmostraId(amostraId: string): Avaliacao | undefined {
    return this.avaliacoes.find(a => a.amostraId === amostraId);
  }

  async saveAvaliacao(avaliacaoData: Omit<Avaliacao, 'id' | 'germinacao' | 'percentualMortas' | 'percentualAnormais' | 'resultadoAprovacao'>): Promise<Avaliacao> {
    await this.ensureFirebaseAuth();
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
    const id = existing ? existing.id : 'avl-' + Date.now();

    const newAvaliacao: Avaliacao = {
      ...avaliacaoData,
      id,
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

    const sanitizedAvaliacao = this.sanitizeForFirestore(newAvaliacao);

    // Salvar no Firestore
    await setDoc(doc(db, 'avaliacoes', id), sanitizedAvaliacao);

    // Se amostra existir, atualizar status e flags de leitura
    if (amostra) {
      const is7d = avaliacaoData.tipoLeitura === '7_dias';
      const updatedAmostra: Amostra = {
        ...amostra,
        status: is7d ? 'Pendente' : 'Concluído',
        leitura7diasRealizada: true,
        dataRealizacao7dias: is7d ? (avaliacaoData.dataAvaliacao || new Date().toISOString()) : (amostra.dataRealizacao7dias || avaliacaoData.dataAvaliacao),
        leitura10diasRealizada: !is7d,
        dataRealizacao10dias: !is7d ? (avaliacaoData.dataAvaliacao || new Date().toISOString()) : amostra.dataRealizacao10dias,
        dataAtualizacao: new Date().toISOString(),
      };
      await setDoc(doc(db, 'amostras', amostra.id), this.sanitizeForFirestore(updatedAmostra));

      const aIdx = this.amostras.findIndex(a => a.id === amostra.id);
      if (aIdx !== -1) {
        this.amostras[aIdx] = updatedAmostra;
      }
    }

    this.notify();
    return newAvaliacao;
  }

  async deleteAvaliacao(id: string): Promise<boolean> {
    if (!id) return false;
    const target = this.avaliacoes.find(a => a.id === id || a.amostraId === id);
    if (!target) return false;

    try {
      await deleteDoc(doc(db, 'avaliacoes', target.id));

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
            await setDoc(doc(db, 'amostras', amostra.id), updatedAmostra);
          }
        }
      }

      this.avaliacoes = this.avaliacoes.filter(a => a.id !== target.id);
      this.notify();
      return true;
    } catch (error) {
      console.error('Erro ao excluir avaliação no Firestore:', error);
      throw error;
    }
  }

  // --- FOTOS ---
  getFotos(): FotoAmostra[] {
    return this.fotos;
  }

  getFotosByAmostra(amostraId: string): FotoAmostra[] {
    return this.fotos.filter(f => f.amostraId === amostraId);
  }

  async addFoto(amostraId: string, fotoBase64: string, nome?: string, descricao?: string): Promise<FotoAmostra> {
    await this.ensureFirebaseAuth();
    const id = 'ft-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    const newFoto: FotoAmostra = {
      id,
      amostraId,
      foto: fotoBase64,
      dataUpload: new Date().toISOString(),
      nome: nome || `Foto - ${new Date().toLocaleDateString('pt-BR')}`,
      descricao: descricao || '',
    };

    const sanitized = this.sanitizeForFirestore(newFoto);
    await setDoc(doc(db, 'fotos', id), sanitized);
    this.fotos.unshift(newFoto);
    this.notify();
    return newFoto;
  }

  async deleteFoto(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, 'fotos', id));
      this.fotos = this.fotos.filter(f => f.id !== id);
      this.notify();
      return true;
    } catch (error) {
      console.error('Erro ao excluir foto no Firestore:', error);
      throw error;
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

  // --- FILA DE SINCRONIZAÇÃO DA INTERFACE (MANTIDA PARA REGRAS DE REDE) ---
  getSyncQueue(): SyncOperation[] {
    return [];
  }

  clearSyncQueue() {
    //
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

  async resetToDefaultData() {
    await this.seedCollection('amostras', INITIAL_AMOSTRAS);
    await this.seedCollection('avaliacoes', INITIAL_AVALIACOES);
    await this.seedCollection('usuarios', DEFAULT_USERS);
    await this.seedCollection('configuracoes', DEFAULT_CONFIGS.map(c => ({ id: c.cultura.toLowerCase(), ...c })));
  }
}

export const storageService = new StorageService();
