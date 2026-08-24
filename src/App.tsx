import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar, TabType } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { NovaAmostraModal } from './components/NovaAmostraModal';
import { CanteirosListView } from './components/CanteirosListView';
import { AvaliacaoView } from './components/AvaliacaoView';
import { RelatoriosView } from './components/RelatoriosView';
import { QualidadeView } from './components/qualidade/QualidadeView';
import { UsuariosView } from './components/UsuariosView';
import { ConfiguracoesView } from './components/ConfiguracoesView';
import { QRCodeModal } from './components/QRCodeModal';
import { QRScannerModal } from './components/QRScannerModal';
import { LoginScreen } from './components/LoginScreen';
import { SyncStatusModal } from './components/SyncStatusModal';

import { storageService } from './services/storageService';
import { Amostra, Usuario } from './types';
import { Menu, Sprout, WifiOff, RefreshCw } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);

  // Estado do Usuário Logado
  const [currentUser, setCurrentUser] = useState<Usuario | null>(storageService.getCurrentUser());

  // Estado do Modo Offline e Fila de Sincronização
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(storageService.getPendingSyncCount());
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);

  // Modais e Seleções
  const [isNovaAmostraOpen, setIsNovaAmostraOpen] = useState(false);
  const [selectedAmostraForAvaliacaoId, setSelectedAmostraForAvaliacaoId] = useState<string | null>(null);
  const [selectedAmostraForQRCode, setSelectedAmostraForQRCode] = useState<Amostra | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const [canteiroFilterStatus, setCanteiroFilterStatus] = useState<string>('');

  // Sincronização de eventos de rede e storage
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      storageService.processSyncQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = storageService.subscribe(() => {
      setCurrentUser(storageService.getCurrentUser());
      setPendingSyncCount(storageService.getPendingSyncCount());
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  // Logout Handler
  const handleLogout = () => {
    storageService.logout();
    setCurrentUser(null);
  };

  // Se não estiver logado, exibe a Tela de Login
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={(u) => setCurrentUser(u)} />;
  }

  const handleTriggerSync = () => {
    setIsSyncModalOpen(true);
  };

  // Navegação para Avaliação
  const handleOpenAvaliacao = (amostraId: string) => {
    setSelectedAmostraForAvaliacaoId(amostraId);
    setActiveTab('avaliacoes');
  };

  return (
    <div id="smart-canteiro-app" className="min-h-screen bg-[#f8f9fa] text-gray-900 flex flex-col font-sans antialiased">
      
      {/* Top Header */}
      <Header
        currentUser={currentUser}
        onUserChange={setCurrentUser}
        onLogout={handleLogout}
        isOnline={isOnline}
        setIsOnline={setIsOnline}
        pendingSyncCount={pendingSyncCount}
        onOpenScanner={() => setIsScannerOpen(true)}
        onTriggerSync={handleTriggerSync}
      />

      {/* Bar Mobile Menu Trigger */}
      <div className="lg:hidden bg-[#1b4332] px-4 py-2 text-white flex items-center justify-between border-t border-[#2d6a4f]/50 text-xs">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex items-center gap-2 font-bold bg-[#2d6a4f] px-3 py-1.5 rounded-lg text-[#d8f3dc] cursor-pointer"
        >
          <Menu className="w-4 h-4" />
          <span>Menu de Opções</span>
        </button>

        <span className="font-semibold text-[#b7e4c7]">
          {activeTab.toUpperCase()}
        </span>
      </div>

      {/* Main Body with Sidebar + Main Workspace */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        
        {/* Sidebar Left Navigation */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            if (tab === 'nova-amostra') {
              setIsNovaAmostraOpen(true);
            } else {
              setActiveTab(tab);
              if (tab !== 'avaliacoes') {
                setSelectedAmostraForAvaliacaoId(null);
              }
            }
          }}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />

        {/* Main Workspace Area */}
        <main id="main-content" className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto min-w-0">
          
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <DashboardView
              onNewSample={() => setIsNovaAmostraOpen(true)}
              onNavigateToCanteiros={(statusFilter) => {
                setCanteiroFilterStatus(statusFilter || '');
                setActiveTab('canteiros');
              }}
              onNavigateToAvaliacao={handleOpenAvaliacao}
            />
          )}

          {/* TAB 2: CANTEIROS (LISTA DE AMOSTRAS) */}
          {activeTab === 'canteiros' && (
            <CanteirosListView
              currentUser={currentUser}
              onNewSample={() => setIsNovaAmostraOpen(true)}
              onOpenAvaliacao={handleOpenAvaliacao}
              onShowQRCode={(amostra) => setSelectedAmostraForQRCode(amostra)}
              initialStatusFilter={canteiroFilterStatus}
            />
          )}

          {/* TAB 3: AVALIAÇÃO DE CANTEIRO */}
          {activeTab === 'avaliacoes' && (
            selectedAmostraForAvaliacaoId ? (
              <AvaliacaoView
                amostraId={selectedAmostraForAvaliacaoId}
                currentUser={currentUser}
                onBack={() => {
                  setSelectedAmostraForAvaliacaoId(null);
                  setActiveTab('canteiros');
                }}
              />
            ) : (
              <CanteirosListView
                currentUser={currentUser}
                onNewSample={() => setIsNovaAmostraOpen(true)}
                onOpenAvaliacao={handleOpenAvaliacao}
                onShowQRCode={(amostra) => setSelectedAmostraForQRCode(amostra)}
                initialStatusFilter="Pendente"
              />
            )
          )}

          {/* TAB 4: RELATÓRIOS EXCEL E PDF */}
          {activeTab === 'relatorios' && (
            <RelatoriosView currentUser={currentUser} onOpenAvaliacao={handleOpenAvaliacao} />
          )}

          {/* TAB: CONTROLE DE QUALIDADE DE LOTES */}
          {activeTab === 'qualidade' && (
            <QualidadeView />
          )}

          {/* TAB 5: USUÁRIOS E PERMISSÕES */}
          {activeTab === 'usuarios' && (
            <UsuariosView
              currentUser={currentUser}
              onUserChange={setCurrentUser}
            />
          )}

          {/* TAB 6: CONFIGURAÇÕES E REGRAS */}
          {activeTab === 'configuracoes' && (
            <ConfiguracoesView />
          )}

        </main>

      </div>

      {/* MODAL: NOVA AMOSTRA */}
      {isNovaAmostraOpen && (
        <NovaAmostraModal
          currentUser={currentUser}
          onClose={() => setIsNovaAmostraOpen(false)}
          onSuccess={(newAmostra) => {
            setIsNovaAmostraOpen(false);
            handleOpenAvaliacao(newAmostra.id);
          }}
        />
      )}

      {/* MODAL: QR CODE ETIQUETA */}
      {selectedAmostraForQRCode && (
        <QRCodeModal
          amostra={selectedAmostraForQRCode}
          onClose={() => setSelectedAmostraForQRCode(null)}
          onOpenAvaliacao={() => {
            const id = selectedAmostraForQRCode.id;
            setSelectedAmostraForQRCode(null);
            handleOpenAvaliacao(id);
          }}
        />
      )}

      {/* MODAL: LEITOR DE QR CODE / CAMERA SCANNER */}
      {isScannerOpen && (
        <QRScannerModal
          onClose={() => setIsScannerOpen(false)}
          onSelectAmostra={(amostraId) => {
            setIsScannerOpen(false);
            handleOpenAvaliacao(amostraId);
          }}
        />
      )}

      {/* MODAL: CENTRAL DE SINCRONIZAÇÃO OFFLINE */}
      <SyncStatusModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        isOnline={isOnline}
      />

    </div>
  );
}
