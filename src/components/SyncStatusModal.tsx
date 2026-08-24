import React, { useState, useEffect } from 'react';
import { SyncQueueItem } from '../types';
import { storageService } from '../services/storageService';
import { 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  X, 
  Wifi, 
  WifiOff, 
  HardDrive, 
  Image as ImageIcon,
  CheckCircle,
  Database,
  ArrowUpRight
} from 'lucide-react';

interface SyncStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
}

export const SyncStatusModal: React.FC<SyncStatusModalProps> = ({
  isOpen,
  onClose,
  isOnline
}) => {
  const [syncItems, setSyncItems] = useState<SyncQueueItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<string | null>(null);

  const refreshSyncItems = async () => {
    const items = await storageService.getSyncQueueItems();
    setSyncItems(items);
  };

  useEffect(() => {
    if (isOpen) {
      refreshSyncItems();
      const unsubscribe = storageService.subscribe(() => {
        refreshSyncItems();
      });
      return () => unsubscribe();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const pendingItems = syncItems.filter(i => i.status === 'pendente' || i.status === 'sincronizando');
  const errorItems = syncItems.filter(i => i.status === 'erro');
  const syncedItems = syncItems.filter(i => i.status === 'sincronizado');

  const pendingPhotos = pendingItems.filter(i => i.tipo === 'FOTO_ADD');
  const pendingAvaliacoes = pendingItems.filter(i => i.tipo === 'AVALIACAO_SAVE' || i.tipo === 'LEITURA_7DIAS');
  const pendingCanteiros = pendingItems.filter(i => i.tipo === 'AMOSTRA_SAVE');

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setLastSyncResult(null);
    try {
      const res = await storageService.syncNow();
      if (res.errorsCount === 0 && res.syncedCount > 0) {
        setLastSyncResult(`Sucesso! ${res.syncedCount} itens sincronizados com o servidor.`);
      } else if (res.errorsCount > 0) {
        setLastSyncResult(`${res.syncedCount} itens sincronizados. ${res.errorsCount} ainda com erro de conexão.`);
      } else if (res.syncedCount === 0) {
        setLastSyncResult('Tudo já está 100% atualizado e sincronizado!');
      }
      await refreshSyncItems();
    } catch (e: any) {
      setLastSyncResult(`Erro ao tentar sincronizar: ${e.message || String(e)}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusBadge = (status: SyncQueueItem['status']) => {
    switch (status) {
      case 'sincronizado':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Sincronizado
          </span>
        );
      case 'sincronizando':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 animate-pulse">
            <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
            Sincronizando...
          </span>
        );
      case 'erro':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            Erro
          </span>
        );
      case 'pendente':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
            <Clock className="w-3 h-3 text-amber-600" />
            Aguardando sincronização
          </span>
        );
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSyncing) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-gray-100 space-y-5 relative max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2d6a4f]/10 flex items-center justify-center text-[#2d6a4f]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                Central de Sincronização Offline
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                  isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                  {isOnline ? 'Conectado' : 'Offline'}
                </span>
              </h3>
              <p className="text-xs text-gray-500">
                Armazenamento local seguro no dispositivo via IndexedDB
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSyncing}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative Banner */}
        <div className="bg-[#d8f3dc]/30 border border-[#b7e4c7] rounded-xl p-3.5 flex items-start gap-3">
          <HardDrive className="w-5 h-5 text-[#1b4332] shrink-0 mt-0.5" />
          <div className="text-xs text-gray-700 space-y-1">
            <p className="font-semibold text-gray-900">
              Suas fotos e avaliações estão 100% protegidas no dispositivo.
            </p>
            <p className="text-gray-600">
              Mesmo sem internet ou se você fechar o aplicativo, todas as fotos tiradas e avaliações finalizadas ficam guardadas localmente no IndexedDB e serão enviadas automaticamente assim que a conexão retornar.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Fotos Pendentes</span>
            <span className="text-xl font-black text-gray-900 mt-1 flex items-center justify-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-amber-600" />
              {pendingPhotos.length}
            </span>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Avaliações Pendentes</span>
            <span className="text-xl font-black text-gray-900 mt-1 flex items-center justify-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              {pendingAvaliacoes.length + pendingCanteiros.length}
            </span>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Status Geral</span>
            <div className="mt-1 flex items-center justify-center">
              {pendingItems.length === 0 && errorItems.length === 0 ? (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  100% Sincronizado
                </span>
              ) : errorItems.length > 0 ? (
                <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  {errorItems.length} com Erro
                </span>
              ) : (
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  {pendingItems.length} Pendentes
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Sync Result Banner */}
        {lastSyncResult && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs font-semibold text-blue-900 flex items-center justify-between">
            <span>{lastSyncResult}</span>
            <button 
              type="button" 
              onClick={() => setLastSyncResult(null)}
              className="text-blue-700 hover:text-blue-900 font-bold"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Items List */}
        <div className="flex-1 overflow-y-auto min-h-[160px] max-h-[260px] border border-gray-200 rounded-xl bg-gray-50/50 p-2 space-y-2">
          {syncItems.length === 0 ? (
            <div className="p-8 text-center text-gray-400 space-y-1">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
              <p className="text-sm font-bold text-gray-700">Fila de sincronização limpa!</p>
              <p className="text-xs text-gray-500">Todos os dados e fotos locais já estão atualizados no servidor.</p>
            </div>
          ) : (
            syncItems.map((item) => (
              <div 
                key={item.id}
                className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between gap-3 shadow-2xs hover:border-gray-300 transition-all"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900 truncate">
                      {item.titulo || item.tipo}
                    </span>
                    {getStatusBadge(item.status)}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-1">
                    <span>Criado em: {new Date(item.dataCriacao).toLocaleTimeString('pt-BR')}</span>
                    {item.tentativas > 0 && <span>Tentativas: {item.tentativas}</span>}
                    {item.mensagemErro && (
                      <span className="text-rose-600 font-medium truncate max-w-[200px]" title={item.mensagemErro}>
                        {item.mensagemErro}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSyncing}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs sm:text-sm transition-colors cursor-pointer"
          >
            Fechar
          </button>

          <button
            type="button"
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="px-5 py-2.5 bg-[#1b4332] hover:bg-[#2d6a4f] text-white rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-[#d8f3dc] ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Sincronizando Agora...' : 'Sincronizar Agora'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
