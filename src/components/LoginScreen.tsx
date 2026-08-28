import React, { useState } from 'react';
import { storageService } from '../services/storageService';
import { Usuario } from '../types';
import { Sprout, Lock, User, ArrowRight, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: Usuario) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [identificador, setIdentificador] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!identificador.trim() || !senha) {
      setError('Por favor, informe seu Usuário ou E-mail e a Senha.');
      return;
    }

    setLoading(true);
    try {
      const res = await storageService.login(identificador, senha);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setError(res.message || 'Falha ao realizar login no sistema.');
      }
    } catch (err: any) {
      setError('Erro na autenticação: ' + (err?.message || 'Falha de comunicação com o servidor.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#081c15] via-[#1b4332] to-[#2d6a4f] flex items-center justify-center p-4 font-sans text-gray-900">
      
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-[#40916c]/30 my-8">
        
        {/* Brand Header */}
        <div className="bg-[#1b4332] p-8 text-center text-white space-y-3 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#2d6a4f]/40 rounded-full blur-2xl pointer-events-none" />
          
          <div className="w-16 h-16 bg-[#2d6a4f] rounded-2xl mx-auto flex items-center justify-center border-2 border-[#52b788]/40 shadow-inner">
            <Sprout className="w-9 h-9 text-[#d8f3dc]" />
          </div>

          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
              SMART CANTEIRO CQ
            </h1>
            <p className="text-xs font-semibold text-[#b7e4c7] uppercase tracking-wider mt-1">
              Controle de Qualidade de Sementes
            </p>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="p-7 space-y-5">
          
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#2d6a4f]" />
              Autenticação de Acesso
            </h2>
            <p className="text-xs text-gray-500">
              Acesse sua conta para visualizar relatórios, canteiros e avaliações.
            </p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Campo: Usuário / E-mail */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Usuário ou E-mail *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={identificador}
                onChange={(e) => setIdentificador(e.target.value)}
                placeholder="Ex: admin ou seu.email@empresa.com"
                autoComplete="username"
                className="w-full bg-gray-50 border border-gray-300 rounded-xl pl-9 pr-3 py-2.5 text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
              />
            </div>
          </div>

          {/* Campo: Senha */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Senha *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full bg-gray-50 border border-gray-300 rounded-xl pl-9 pr-3 py-2.5 text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1b4332] hover:bg-[#2d6a4f] text-white py-3 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group active:scale-98 cursor-pointer disabled:opacity-75"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 text-[#74c69d] animate-spin" />
                <span>Autenticando...</span>
              </>
            ) : (
              <>
                <span>Entrar no Sistema</span>
                <ArrowRight className="w-4 h-4 text-[#74c69d] group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>

          <div className="pt-2 text-center text-xs text-gray-400">
            Acesso restrito e monitorado via Firebase Authentication
          </div>

        </form>

        <div className="bg-gray-50 py-3 text-center text-[11px] text-gray-500 font-medium border-t border-gray-100">
          Smart Canteiro CQ &copy; {new Date().getFullYear()} — Controle de Qualidade
        </div>

      </div>

    </div>
  );
};
