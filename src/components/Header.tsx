import React from 'react';
import { Usuario } from '../types';
import { storageService } from '../services/storageService';
import { QrCode, Wifi, WifiOff, RefreshCw, LogOut, UserCheck } from 'lucide-react';

interface HeaderProps {
  currentUser: Usuario;
  onUserChange: (user: Usuario) => void;
  onLogout: () => void;
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  pendingSyncCount: number;
  onOpenScanner: () => void;
  onTriggerSync: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onUserChange,
  onLogout,
  isOnline,
  setIsOnline,
  pendingSyncCount,
  onOpenScanner,
  onTriggerSync,
}) => {
  const users = storageService.getUsuarios();

  return (
    <header id="app-header" className="bg-[#1b4332] text-white shadow-md sticky top-0 z-30 border-b border-[#2d6a4f]/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Left: Brand Identity */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#2d6a4f] flex items-center justify-center shadow-inner border border-[#40916c]/40">
            <span className="text-xl font-black text-[#d8f3dc]">CQ</span>
          </div>
          <div>
            <h1 className="font-bold text-lg sm:text-xl tracking-tight leading-tight text-white flex items-center gap-2">
              SMART CANTEIRO
              <span className="text-xs bg-[#40916c] text-[#d8f3dc] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider hidden sm:inline-block">
                Sementes
              </span>
            </h1>
            <p className="text-xs text-[#b7e4c7] hidden sm:block">Controle de Qualidade em Campo</p>
          </div>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          
          {/* Quick QR Scanner Button */}
          <button
            id="header-scan-btn"
            onClick={onOpenScanner}
            className="flex items-center gap-1.5 bg-[#40916c] hover:bg-[#52b788] text-white px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all shadow-sm active:scale-95"
            title="Escanear QR Code de Canteiro"
          >
            <QrCode className="w-4 h-4 text-[#d8f3dc]" />
            <span className="hidden md:inline">Escanear Canteiro</span>
          </button>

          {/* Network Mode Toggle / Offline Badge */}
          <div className="flex items-center bg-[#081c15] bg-opacity-40 p-1 rounded-lg border border-[#2d6a4f]">
            <button
              onClick={() => setIsOnline(!isOnline)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                isOnline ? 'bg-[#2d6a4f] text-[#d8f3dc]' : 'bg-amber-600 text-white'
              }`}
              title={isOnline ? 'Modo Online (Clique para Simular Offline)' : 'Modo Offline Ativo'}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-[#52b788]" />
                  <span className="hidden sm:inline">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
                  <span>Offline</span>
                </>
              )}
            </button>

            {/* Sync Status Badge */}
            {pendingSyncCount > 0 && (
              <button
                onClick={onTriggerSync}
                className="ml-1.5 flex items-center gap-1 text-xs bg-amber-500/20 text-amber-200 px-2 py-1 rounded hover:bg-amber-500/30 transition-all"
                title={`${pendingSyncCount} alterações salvas localmente aguardando sincronização`}
              >
                <RefreshCw className="w-3 h-3 animate-spin text-amber-300" />
                <span className="font-bold">{pendingSyncCount}</span>
              </button>
            )}
          </div>

          {/* User Profile Selector & Logout */}
          <div className="relative flex items-center gap-2 bg-[#081c15] border border-[#2d6a4f] rounded-lg p-1">
            <select
              id="header-user-select"
              value={currentUser.id}
              onChange={(e) => {
                const found = users.find(u => u.id === e.target.value);
                if (found) {
                  onUserChange(found);
                  storageService.setCurrentUser(found);
                }
              }}
              className="bg-transparent text-[#d8f3dc] text-xs sm:text-sm font-semibold px-2 py-1 cursor-pointer focus:outline-none"
              title="Trocar perfil de usuário rápido"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id} className="bg-[#1b4332] text-white">
                  {u.nome} ({u.perfil})
                </option>
              ))}
            </select>

            <button
              onClick={onLogout}
              className="p-1.5 bg-rose-900/60 hover:bg-rose-800 text-rose-200 rounded-md transition-colors flex items-center gap-1 text-xs font-bold"
              title="Sair da Conta (Logout)"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Sair</span>
            </button>
          </div>

        </div>

      </div>
    </header>
  );
};
