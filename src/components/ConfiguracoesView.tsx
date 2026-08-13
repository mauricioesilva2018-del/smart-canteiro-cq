import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { ConfiguracaoAprovacao } from '../types';
import { Settings, Check, RefreshCw, Save, Award, Database, AlertCircle, Trash2 } from 'lucide-react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { ToastNotification, ToastMessage } from './ToastNotification';

export const ConfiguracoesView: React.FC = () => {
  const [configs, setConfigs] = useState<ConfiguracaoAprovacao[]>(storageService.getConfiguracoes());
  const [isSaved, setIsSaved] = useState(false);
  const [newCultura, setNewCultura] = useState('');
  const [newPercentual, setNewPercentual] = useState(80);

  const [configToDelete, setConfigToDelete] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    const unsubscribe = storageService.subscribe(() => {
      setConfigs(storageService.getConfiguracoes());
    });
    return () => unsubscribe();
  }, []);

  const handleUpdate = (index: number, newMin: number) => {
    const updated = [...configs];
    updated[index].percentualMinimo = Math.min(100, Math.max(0, newMin));
    setConfigs(updated);
  };

  const handleConfirmDelete = async () => {
    if (!configToDelete) return;
    try {
      const success = await storageService.deleteConfiguracao(configToDelete);
      if (success) {
        setToast({ type: 'success', message: 'Registro excluído com sucesso.' });
        setConfigs(storageService.getConfiguracoes());
      } else {
        setToast({ type: 'error', message: 'Erro ao excluir: Regra não encontrada no banco de dados.' });
      }
    } catch (error) {
      setToast({ type: 'error', message: `Erro ao excluir regra: ${error instanceof Error ? error.message : String(error)}` });
    } finally {
      setConfigToDelete(null);
    }
  };

  const handleConfirmReset = async () => {
    try {
      await storageService.resetToDefaultData();
      setConfigs(storageService.getConfiguracoes());
      setToast({ type: 'success', message: 'Banco de dados redefinido com sucesso!' });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      setToast({ type: 'error', message: `Erro ao redefinir banco: ${error instanceof Error ? error.message : String(error)}` });
    } finally {
      setShowResetModal(false);
    }
  };

  const handleSaveAll = async () => {
    await storageService.saveConfiguracoes(configs);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleAddCultura = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCultura.trim()) return;

    const exists = configs.some(c => c.cultura.toLowerCase() === newCultura.trim().toLowerCase());
    if (exists) {
      alert('Esta cultura já foi configurada.');
      return;
    }

    const updated = [...configs, { cultura: newCultura.trim(), percentualMinimo: newPercentual }];
    setConfigs(updated);
    await storageService.saveConfiguracoes(updated);
    setNewCultura('');
  };

  const handleResetData = () => {
    if (confirm('Atenção: Isso irá redefinir todas as amostras, avaliações e fotos para os dados iniciais de demonstração. Deseja continuar?')) {
      storageService.resetToDefaultData();
      setConfigs(storageService.getConfiguracoes());
      alert('Banco de dados redefinido com sucesso!');
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
          <Settings className="w-7 h-7 text-[#2d6a4f]" />
          Configurações e Parâmetros de Qualidade
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Configure as réguas mínimas de germinação para classificação automática de Aprovado / Reprovado.
        </p>
      </div>

      {isSaved && (
        <div className="bg-emerald-600 text-white p-3.5 rounded-xl shadow-md text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4 text-[#d8f3dc]" />
          <span>Configurações salvas com sucesso! As avaliações calcularão com base nestas regras.</span>
        </div>
      )}

      {/* Tabela de Regras Mínimas de Germinação por Cultura */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-[#2d6a4f]" />
              Percentuais Mínimos de Germinação por Cultura
            </h3>
            <p className="text-xs text-gray-500">
              O sistema compara a germinação calculada com esta régua para emitir a aprovação automática.
            </p>
          </div>

          <button
            onClick={handleSaveAll}
            className="px-5 py-2 bg-[#1b4332] hover:bg-[#2d6a4f] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4 text-[#74c69d]" />
            <span>Salvar Regras</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {configs.map((cfg, index) => (
            <div key={cfg.cultura} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm text-gray-900">{cfg.cultura}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#2d6a4f]">Mínimo Exigido</span>
                  <button
                    type="button"
                    onClick={() => setConfigToDelete(cfg.cultura)}
                    className="p-1 text-gray-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                    title="Excluir Regra"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={cfg.percentualMinimo}
                  onChange={(e) => handleUpdate(index, Number(e.target.value) || 0)}
                  className="w-full bg-white border-2 border-gray-300 rounded-xl px-3 py-1.5 text-lg font-black text-[#1b4332] focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
                />
                <span className="font-black text-gray-700">%</span>
              </div>
            </div>
          ))}
        </div>

        {/* Form Adicionar Nova Cultura */}
        <form onSubmit={handleAddCultura} className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row items-center gap-3">
          <input
            type="text"
            value={newCultura}
            onChange={(e) => setNewCultura(e.target.value)}
            placeholder="Nome da Nova Cultura (Ex: Girassol)"
            className="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900"
          />
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <span className="text-xs font-bold text-gray-600">Mínimo (%):</span>
            <input
              type="number"
              min={0}
              max={100}
              value={newPercentual}
              onChange={(e) => setNewPercentual(Number(e.target.value) || 80)}
              className="w-20 bg-gray-50 border border-gray-300 rounded-xl px-2 py-2 text-xs font-black"
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-4 py-2 bg-[#2d6a4f] text-white text-xs font-bold rounded-xl shadow-xs"
          >
            + Adicionar Cultura
          </button>
        </form>
      </div>

      {/* Ferramentas do Banco de Dados Local */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <Database className="w-5 h-5 text-gray-700" />
          Manutenção de Dados Locais
        </h3>
        <p className="text-xs text-gray-600">
          Se desejar restaurar os dados de fábrica com exemplos de amostras, avaliações e fotos iniciais.
        </p>

        <button
          onClick={() => setShowResetModal(true)}
          className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Restaurar Dados de Demonstração</span>
        </button>
      </div>

      {/* Modal de Confirmação de Exclusão de Regra */}
      <ConfirmDeleteModal
        isOpen={!!configToDelete}
        itemName={`Cultura: ${configToDelete}`}
        title="Excluir Parâmetro de Qualidade"
        message="Tem certeza que deseja excluir este registro?"
        onCancel={() => setConfigToDelete(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* Modal de Reset */}
      <ConfirmDeleteModal
        isOpen={showResetModal}
        title="Restaurar Dados de Demonstração"
        message="Atenção: Isso irá redefinir todas as amostras, avaliações e fotos para os dados iniciais. Deseja continuar?"
        onCancel={() => setShowResetModal(false)}
        onConfirm={handleConfirmReset}
      />

      {/* Toast Notification */}
      <ToastNotification
        toast={toast}
        onClose={() => setToast(null)}
      />

    </div>
  );
};
