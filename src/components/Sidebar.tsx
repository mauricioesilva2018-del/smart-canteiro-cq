import React from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Sprout, 
  ClipboardCheck, 
  FileSpreadsheet, 
  Users, 
  Settings,
  X
} from 'lucide-react';

export type TabType = 'dashboard' | 'nova-amostra' | 'canteiros' | 'avaliacoes' | 'relatorios' | 'usuarios' | 'configuracoes';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  mobileOpen,
  setMobileOpen,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'nova-amostra', label: '+ Nova Amostra', icon: PlusCircle, highlight: true },
    { id: 'canteiros', label: 'Canteiros', icon: Sprout },
    { id: 'avaliacoes', label: 'Avaliações', icon: ClipboardCheck },
    { id: 'relatorios', label: 'Relatórios', icon: FileSpreadsheet },
    { id: 'usuarios', label: 'Usuários', icon: Users },
    { id: 'configuracoes', label: 'Configurações', icon: Settings },
  ] as const;

  const handleSelect = (id: TabType) => {
    setActiveTab(id);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Navigation Container */}
      <aside
        id="app-sidebar"
        className={`fixed lg:static top-0 left-0 h-full w-64 bg-[#1b4332] text-white z-50 transform transition-transform duration-200 ease-in-out lg:transform-none flex flex-col border-r border-[#2d6a4f]/40 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Mobile Header */}
        <div className="p-4 flex items-center justify-between lg:hidden border-b border-[#2d6a4f]">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-lg text-[#d8f3dc]">Navegação CQ</span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1 rounded-lg text-[#b7e4c7] hover:bg-[#2d6a4f] transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isHighlight = 'highlight' in item && Boolean(item.highlight);

            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => handleSelect(item.id as TabType)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                  isHighlight
                    ? 'bg-[#40916c] hover:bg-[#52b788] text-white font-semibold shadow-md my-2'
                    : isActive
                    ? 'bg-[#2d6a4f] text-[#d8f3dc] shadow-sm font-semibold'
                    : 'text-[#b7e4c7] hover:bg-[#2d6a4f]/50 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 ${isHighlight ? 'text-[#d8f3dc]' : isActive ? 'text-[#d8f3dc]' : 'text-[#74c69d]'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer info in sidebar */}
        <div className="p-4 border-t border-[#2d6a4f]/60 bg-[#081c15]/40 text-xs text-[#b7e4c7]/80">
          <p className="font-semibold text-white">Smart Canteiro CQ v2.4</p>
          <p className="mt-0.5">Sementes & Biotecnologia</p>
        </div>
      </aside>
    </>
  );
};
