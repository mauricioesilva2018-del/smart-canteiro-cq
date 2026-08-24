import { FotoAmostra, Avaliacao, Amostra, SyncQueueItem, SyncItemStatus } from '../types';

const DB_NAME = 'SmartCanteiroCQ_IndexedDB_v1';
const DB_VERSION = 1;

export class IndexedDbService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        console.warn('IndexedDB não suportado neste ambiente.');
        reject(new Error('IndexedDB não suportado'));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 1. Store de Fotos (guarda fotos completas em base64 e metadados)
        if (!db.objectStoreNames.contains('fotos')) {
          const fotoStore = db.createObjectStore('fotos', { keyPath: 'id' });
          fotoStore.createIndex('amostraId', 'amostraId', { unique: false });
          fotoStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        }

        // 2. Store de Avaliações
        if (!db.objectStoreNames.contains('avaliacoes')) {
          const avlStore = db.createObjectStore('avaliacoes', { keyPath: 'id' });
          avlStore.createIndex('amostraId', 'amostraId', { unique: false });
        }

        // 3. Store de Amostras / Canteiros
        if (!db.objectStoreNames.contains('amostras')) {
          db.createObjectStore('amostras', { keyPath: 'id' });
        }

        // 4. Fila Persistente de Sincronização
        if (!db.objectStoreNames.contains('sync_queue')) {
          const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
          syncStore.createIndex('status', 'status', { unique: false });
          syncStore.createIndex('dataCriacao', 'dataCriacao', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        resolve(db);
      };

      request.onerror = (event) => {
        console.error('Erro ao abrir IndexedDB:', (event.target as IDBOpenDBRequest).error);
        reject((event.target as IDBOpenDBRequest).error);
      };
    });

    return this.dbPromise;
  }

  // ==========================================
  // FOTOS (OFFLINE-FIRST)
  // ==========================================

  async saveFotoLocal(foto: FotoAmostra): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('fotos', 'readwrite');
        const store = tx.objectStore('fotos');
        const req = store.put(foto);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Falha ao salvar foto no IndexedDB:', e);
    }
  }

  async getFotosByAmostraLocal(amostraId: string): Promise<FotoAmostra[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('fotos', 'readonly');
        const store = tx.objectStore('fotos');
        const index = store.index('amostraId');
        const req = index.getAll(amostraId);
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Falha ao buscar fotos no IndexedDB:', e);
      return [];
    }
  }

  async getAllFotosLocal(): Promise<FotoAmostra[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('fotos', 'readonly');
        const store = tx.objectStore('fotos');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Falha ao buscar todas as fotos no IndexedDB:', e);
      return [];
    }
  }

  async deleteFotoLocal(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('fotos', 'readwrite');
        const store = tx.objectStore('fotos');
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Falha ao excluir foto no IndexedDB:', e);
    }
  }

  // ==========================================
  // AVALIAÇÕES (OFFLINE-FIRST)
  // ==========================================

  async saveAvaliacaoLocal(avaliacao: Avaliacao): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('avaliacoes', 'readwrite');
        const store = tx.objectStore('avaliacoes');
        const req = store.put(avaliacao);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Falha ao salvar avaliação no IndexedDB:', e);
    }
  }

  async getAllAvaliacoesLocal(): Promise<Avaliacao[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('avaliacoes', 'readonly');
        const store = tx.objectStore('avaliacoes');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Falha ao buscar avaliações no IndexedDB:', e);
      return [];
    }
  }

  async deleteAvaliacaoLocal(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('avaliacoes', 'readwrite');
        const store = tx.objectStore('avaliacoes');
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Falha ao deletar avaliação no IndexedDB:', e);
    }
  }

  // ==========================================
  // AMOSTRAS / CANTEIROS (OFFLINE-FIRST)
  // ==========================================

  async saveAmostraLocal(amostra: Amostra): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('amostras', 'readwrite');
        const store = tx.objectStore('amostras');
        const req = store.put(amostra);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Falha ao salvar amostra no IndexedDB:', e);
    }
  }

  async getAllAmostrasLocal(): Promise<Amostra[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('amostras', 'readonly');
        const store = tx.objectStore('amostras');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Falha ao buscar amostras no IndexedDB:', e);
      return [];
    }
  }

  async deleteAmostraLocal(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('amostras', 'readwrite');
        const store = tx.objectStore('amostras');
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Falha ao excluir amostra no IndexedDB:', e);
    }
  }

  // ==========================================
  // FILA DE SINCRONIZAÇÃO (SYNC QUEUE)
  // ==========================================

  async enqueueSyncItem(item: SyncQueueItem): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('sync_queue', 'readwrite');
        const store = tx.objectStore('sync_queue');
        const req = store.put(item);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Falha ao enfileirar sync item no IndexedDB:', e);
    }
  }

  async getAllSyncItems(): Promise<SyncQueueItem[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('sync_queue', 'readonly');
        const store = tx.objectStore('sync_queue');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Falha ao buscar fila de sync no IndexedDB:', e);
      return [];
    }
  }

  async getPendingSyncItems(): Promise<SyncQueueItem[]> {
    const all = await this.getAllSyncItems();
    return all.filter(item => item.status === 'pendente' || item.status === 'erro');
  }

  async updateSyncItemStatus(
    id: string, 
    status: SyncItemStatus, 
    mensagemErro?: string
  ): Promise<void> {
    try {
      const db = await this.getDB();
      const all = await this.getAllSyncItems();
      const item = all.find(i => i.id === id);
      if (!item) return;

      item.status = status;
      item.ultimaTentativa = new Date().toISOString();
      item.tentativas = (item.tentativas || 0) + 1;
      if (mensagemErro) {
        item.mensagemErro = mensagemErro;
      }

      return new Promise((resolve, reject) => {
        const tx = db.transaction('sync_queue', 'readwrite');
        const store = tx.objectStore('sync_queue');
        const req = store.put(item);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Falha ao atualizar item de sync no IndexedDB:', e);
    }
  }

  async removeSyncItem(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('sync_queue', 'readwrite');
        const store = tx.objectStore('sync_queue');
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Falha ao remover item de sync no IndexedDB:', e);
    }
  }

  async clearAllSyncQueue(): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('sync_queue', 'readwrite');
        const store = tx.objectStore('sync_queue');
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Falha ao limpar sync queue no IndexedDB:', e);
    }
  }
}

export const indexedDbService = new IndexedDbService();
