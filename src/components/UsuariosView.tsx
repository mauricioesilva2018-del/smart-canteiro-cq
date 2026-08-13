import React, { useState, useEffect } from 'react';
import { Usuario, PerfilUsuario } from '../types';
import { storageService } from '../services/storageService';
import { Users, UserPlus, Shield, CheckCircle, Trash2, Edit3, KeyRound, AlertTriangle, X } from 'lucide-react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { ToastNotification, ToastMessage } from './ToastNotification';

interface UsuariosViewProps {
  currentUser: Usuario;
  onUserChange: (user: Usuario) => void;
}

export const UsuariosView: React.FC<UsuariosViewProps> = ({
  currentUser,
  onUserChange,
}) => {
  const [usuarios, setUsuarios] = useState<Usuario[]>(storageService.getUsuarios());
  const [editingUser, setEditingUser] = useState<Partial<Usuario> | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const isAdmin = currentUser.perfil === 'Administrador';

  const refreshList = () => {
    setUsuarios(storageService.getUsuarios());
  };

  useEffect(() => {
    refreshList();
    const unsubscribe = storageService.subscribe(() => {
      refreshList();
    });
    return () => unsubscribe();
  }, []);

  const handleOpenNew = () => {
    setEditingUser({
      nome: '',
      senha: '123',
      perfil: 'Operador',
      ativo: true,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (usr: Usuario) => {
    setEditingUser({ ...usr });
    setShowModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser?.nome || !editingUser?.perfil) return;

    const userToSave: Usuario = {
      id: editingUser.id || 'usr-' + Date.now(),
      nome: editingUser.nome.trim(),
      senha: editingUser.senha || '123',
      email: editingUser.email || `${editingUser.nome.toLowerCase().replace(/\s+/g, '.')}@sementes.com.br`,
      perfil: editingUser.perfil,
      ativo: editingUser.ativo !== undefined ? editingUser.ativo : true,
    };

    await storageService.saveUsuario(userToSave);
    refreshList();
    setShowModal(false);

    // Se o usuário editado é o atual, atualiza state global
    if (userToSave.id === currentUser.id) {
      onUserChange(userToSave);
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    if (userToDelete.id === currentUser.id) {
      setToast({ type: 'error', message: 'Você não pode excluir o usuário que está atualmente logado.' });
      setUserToDelete(null);
      return;
    }
    try {
      const success = await storageService.deleteUsuario(userToDelete.id);
      if (success) {
        setToast({ type: 'success', message: 'Registro excluído com sucesso.' });
        refreshList();
      } else {
        setToast({ type: 'error', message: 'Erro ao excluir: Usuário não encontrado no banco de dados.' });
      }
    } catch (error) {
      setToast({ type: 'error', message: `Erro ao excluir usuário: ${error instanceof Error ? error.message : String(error)}` });
    } finally {
      setUserToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-[#2d6a4f]" />
            Módulo de Usuários e Permissões
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Cadastre e gerencie usuários com acesso por Nome e Senha
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenNew}
            className="flex items-center gap-1.5 bg-[#1b4332] hover:bg-[#2d6a4f] text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-[#74c69d]" />
            <span>+ Novo Usuário</span>
          </button>
        )}
      </div>

      {/* Explanação de Perfis */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-sm space-y-1">
          <div className="flex items-center gap-2 text-purple-700 font-extrabold text-sm">
            <Shield className="w-4 h-4" />
            <span>Administrador</span>
          </div>
          <p className="text-xs text-gray-600">
            Acesso total ao sistema: cadastro, edição, exclusão de registros e gestão de usuários.
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm space-y-1">
          <div className="flex items-center gap-2 text-[#2d6a4f] font-extrabold text-sm">
            <Shield className="w-4 h-4" />
            <span>Operador</span>
          </div>
          <p className="text-xs text-gray-600">
            Acesso operacional para cadastrar amostras, realizar avaliações e anexar registros.
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm space-y-1">
          <div className="flex items-center gap-2 text-blue-700 font-extrabold text-sm">
            <Shield className="w-4 h-4" />
            <span>Qualidade</span>
          </div>
          <p className="text-xs text-gray-600">
            Especialista CQ: responsável pela conferência de parâmetros de germinação e laudos.
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-1">
          <div className="flex items-center gap-2 text-slate-700 font-extrabold text-sm">
            <Shield className="w-4 h-4" />
            <span>Visualizador</span>
          </div>
          <p className="text-xs text-gray-600">
            Apenas consulta e leitura de dados, dashboards e relatórios, sem permissão de alteração.
          </p>
        </div>

      </div>

      {/* Tabela de Usuários */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-[#1b4332] text-white uppercase text-[11px] font-bold tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Nome de Usuário</th>
                <th className="py-3.5 px-3">Senha</th>
                <th className="py-3.5 px-3">Perfil de Acesso</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-4 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {usuarios.map((u) => {
                const isSelf = u.id === currentUser.id;

                return (
                  <tr key={u.id} className="hover:bg-gray-50/80 transition-colors">
                    
                    <td className="py-3.5 px-4 font-bold text-gray-900">
                      <div className="flex items-center gap-2">
                        <span>{u.nome}</span>
                        {isSelf && (
                          <span className="bg-[#b7e4c7] text-[#1b4332] text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                            LOGADO AGORA
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 font-mono text-gray-600">
                      <div className="flex items-center gap-1">
                        <KeyRound className="w-3 h-3 text-gray-400" />
                        <span>{u.senha || '••••••'}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                        u.perfil === 'Administrador' 
                          ? 'bg-purple-100 text-purple-900' 
                          : u.perfil === 'Operador' || u.perfil === 'Qualidade'
                          ? 'bg-emerald-100 text-emerald-900' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {u.perfil}
                      </span>
                    </td>

                    <td className="py-3.5 px-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        u.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        
                        {/* Simular Login */}
                        <button
                          onClick={() => {
                            onUserChange(u);
                            storageService.setCurrentUser(u);
                          }}
                          className="px-2.5 py-1 bg-[#2d6a4f] hover:bg-[#1b4332] text-white rounded-lg text-[10px] font-bold transition-all shadow-xs"
                          title="Trocar para este perfil de usuário"
                        >
                          Usar Perfil
                        </button>

                        {/* Botão EDITAR */}
                        {isAdmin && (
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#1b4332] border border-emerald-200 rounded-lg transition-colors flex items-center gap-1 font-bold text-[11px] cursor-pointer"
                            title="Editar Usuário"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-[#2d6a4f]" />
                            <span>EDITAR</span>
                          </button>
                        )}

                        {/* Botão EXCLUIR */}
                        {isAdmin && (
                          <button
                            onClick={() => setUserToDelete({ id: u.id, name: u.nome })}
                            disabled={isSelf}
                            className={`px-2.5 py-1.5 border rounded-lg transition-colors flex items-center gap-1 font-bold text-[11px] ${
                              isSelf 
                                ? 'bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed' 
                                : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 cursor-pointer'
                            }`}
                            title={isSelf ? 'Você não pode excluir a si mesmo' : 'Excluir Usuário'}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>EXCLUIR</span>
                          </button>
                        )}

                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Criar/Editar Usuário */}
      {showModal && editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100">
            
            <div className="bg-[#1b4332] p-4 text-white flex items-center justify-between">
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-[#d8f3dc]" />
                <span>{editingUser.id ? 'Editar Cadastro de Usuário' : 'Novo Usuário de Acesso'}</span>
              </h3>
              <button onClick={() => setShowModal(false)} className="text-[#b7e4c7] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-5 space-y-4">
              
              {/* Nome do Usuário */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nome do Usuário *
                </label>
                <input
                  type="text"
                  required
                  value={editingUser.nome || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, nome: e.target.value })}
                  placeholder="Ex: Carlos Admin, Mariana Silva"
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-[#2d6a4f]"
                />
              </div>

              {/* Senha */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Senha de Acesso *
                </label>
                <input
                  type="text"
                  required
                  value={editingUser.senha || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, senha: e.target.value })}
                  placeholder="Ex: 123456"
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-[#2d6a4f]"
                />
              </div>

              {/* Perfil de Permissão */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Perfil de Acesso e Permissão *
                </label>
                <select
                  value={editingUser.perfil || 'Operador'}
                  onChange={(e) => setEditingUser({ ...editingUser, perfil: e.target.value as PerfilUsuario })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-[#2d6a4f]"
                >
                  <option value="Administrador">Administrador (Acesso Total + Gestão de Usuários)</option>
                  <option value="Operador">Operador (Cadastro, Edição e Avaliações)</option>
                  <option value="Qualidade">Qualidade (Avaliações e Emissão de Laudos)</option>
                  <option value="Visualizador">Visualizador (Apenas Leitura e Consultas)</option>
                </select>
              </div>

              {/* Status Ativo */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="usr-ativo"
                  checked={editingUser.ativo !== false}
                  onChange={(e) => setEditingUser({ ...editingUser, ativo: e.target.checked })}
                  className="w-4 h-4 text-[#2d6a4f] rounded border-gray-300 focus:ring-[#2d6a4f]"
                />
                <label htmlFor="usr-ativo" className="text-xs font-bold text-gray-700 cursor-pointer">
                  Usuário Ativo no Sistema
                </label>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1b4332] hover:bg-[#2d6a4f] text-white text-xs font-bold rounded-xl shadow-md transition-all"
                >
                  Salvar Usuário
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmDeleteModal
        isOpen={!!userToDelete}
        itemName={userToDelete?.name}
        title="Excluir Usuário"
        message="Tem certeza que deseja excluir este registro?"
        onCancel={() => setUserToDelete(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* Toast Notification */}
      <ToastNotification
        toast={toast}
        onClose={() => setToast(null)}
      />

    </div>
  );
};
