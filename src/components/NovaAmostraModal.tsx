import React, { useState } from 'react';
import { storageService } from '../services/storageService';
import { Amostra, Usuario } from '../types';
import { PlusCircle, QrCode, CheckCircle, X, Sparkles, Sprout, Edit3, Calendar, Clock } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { calculateLeituraDates, formatDateBR, getTodayBR } from '../utils/dateUtils';

interface NovaAmostraModalProps {
  currentUser: Usuario;
  editingAmostra?: Amostra | null;
  onClose: () => void;
  onSuccess: (savedAmostra: Amostra) => void;
}

export const NovaAmostraModal: React.FC<NovaAmostraModalProps> = ({
  currentUser,
  editingAmostra,
  onClose,
  onSuccess,
}) => {
  // Auto-gerar protocolo sugerido se for novo
  const existingAmostras = storageService.getAmostras();
  const nextNumber = existingAmostras.length + 1;
  const suggestedProtocolo = `PRT-2026-${String(nextNumber).padStart(3, '0')}`;

  const [protocolo, setProtocolo] = useState(editingAmostra ? editingAmostra.protocolo : suggestedProtocolo);
  const [cultura, setCultura] = useState(editingAmostra ? editingAmostra.cultura : 'Soja');
  const [cultivar, setCultivar] = useState(editingAmostra ? editingAmostra.cultivar : '');
  const [lote, setLote] = useState(editingAmostra ? editingAmostra.lote : '');
  const [peneira, setPeneira] = useState(editingAmostra ? editingAmostra.peneira : '6.5');
  const [categoria, setCategoria] = useState(editingAmostra ? editingAmostra.categoria : 'C1');
  const [safra, setSafra] = useState(editingAmostra ? editingAmostra.safra : '2025/2026');
  const [dataSemeadura, setDataSemeadura] = useState(
    editingAmostra ? editingAmostra.dataSemeadura : getTodayBR()
  );
  const [responsavel, setResponsavel] = useState(editingAmostra ? editingAmostra.responsavel : currentUser.nome);
  const [observacoes, setObservacoes] = useState(editingAmostra ? editingAmostra.observacoes : '');
  const [quantidadeSementes, setQuantidadeSementes] = useState(
    editingAmostra ? (editingAmostra.quantidadeSementes || 100) : 100
  );
  const [tsiMatriz, setTsiMatriz] = useState(editingAmostra?.tsiMatriz || 'Seedcorp / TSI Padrão');

  // Cálculo Automático Obrigatório: 7 dias e 10 dias a partir da data de lançamento
  const { dataLeitura7dias, dataLeitura10dias } = calculateLeituraDates(dataSemeadura);

  const [errorMsg, setErrorMsg] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!protocolo.trim() || !cultura.trim() || !cultivar.trim() || !lote.trim() || !categoria || !safra || !dataSemeadura) {
      setErrorMsg('Por favor, preencha todos os campos obrigatórios (*).');
      return;
    }

    try {
      const payload = {
        ...(editingAmostra ? { id: editingAmostra.id, status: editingAmostra.status } : {}),
        protocolo: protocolo.trim(),
        cultura: cultura.trim(),
        cultivar: cultivar.trim(),
        lote: lote.trim(),
        peneira: peneira.trim() || 'N/A',
        categoria,
        safra,
        dataSemeadura,
        responsavel: responsavel || currentUser?.nome || 'Operador',
        observacoes: observacoes ? observacoes.trim() : '',
        quantidadeSementes: quantidadeSementes || 100,
        tsiMatriz: tsiMatriz || '',
        dataLeitura7dias,
        dataLeitura10dias,
      };

      const saved = await storageService.saveAmostra(payload);
      onSuccess(saved);
    } catch (err: any) {
      console.error('Erro original retornado pelo Firebase ao salvar amostra:', {
        code: err?.code || 'NO_CODE',
        message: err?.message || String(err),
        errorObject: err,
      });
      const errCode = err?.code ? ` [${err.code}]` : '';
      setErrorMsg(`Erro ao salvar amostra${errCode}: ${err?.message || 'Falha na comunicação com o banco de dados.'}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-100 overflow-hidden my-8">
        
        {/* Header */}
        <div className="bg-[#1b4332] p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#2d6a4f] rounded-xl border border-[#40916c]">
              {editingAmostra ? <Edit3 className="w-6 h-6 text-[#d8f3dc]" /> : <Sprout className="w-6 h-6 text-[#d8f3dc]" />}
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {editingAmostra ? `Editar Amostra (${editingAmostra.protocolo})` : 'Cadastro de Nova Amostra'}
              </h2>
              <p className="text-xs text-[#b7e4c7]">
                {editingAmostra ? 'Altere as informações do registro existente' : 'Cadastre o lote e canteiro de sementes para avaliação'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#b7e4c7] hover:bg-[#2d6a4f] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-2.5 rounded-xl text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Protocolo */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Número do Protocolo *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={protocolo}
                  onChange={(e) => setProtocolo(e.target.value)}
                  placeholder="Ex: PRT-2026-001"
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
                />
                {!editingAmostra && (
                  <button
                    type="button"
                    onClick={() => setProtocolo(`PRT-2026-${String(Math.floor(Math.random() * 900) + 100)}`)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#2d6a4f] font-bold hover:underline"
                  >
                    Gerar
                  </button>
                )}
              </div>
            </div>

            {/* Cultura */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Cultura *
              </label>
              <select
                required
                value={cultura}
                onChange={(e) => setCultura(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
              >
                <option value="Soja">Soja</option>
                <option value="Milho">Milho</option>
                <option value="Sorgo">Sorgo</option>
                <option value="Algodão">Algodão</option>
                <option value="Feijão">Feijão</option>
                <option value="Trigo">Trigo</option>
                <option value="Girassol">Girassol</option>
                <option value="Milheto">Milheto</option>
              </select>
            </div>

            {/* Cultivar */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Cultivar / Variedade *
              </label>
              <input
                type="text"
                required
                value={cultivar}
                onChange={(e) => setCultivar(e.target.value)}
                placeholder="Ex: M 8349 IPRO, DKB 390"
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
              />
            </div>

            {/* Lote */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Número do Lote *
              </label>
              <input
                type="text"
                required
                value={lote}
                onChange={(e) => setLote(e.target.value)}
                placeholder="Ex: LOT-2026-092"
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
              />
            </div>

            {/* Peneira */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Peneira *
              </label>
              <input
                type="text"
                required
                value={peneira}
                onChange={(e) => setPeneira(e.target.value)}
                placeholder="Ex: 6.5, 7.0, R2L"
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
              />
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Categoria *
              </label>
              <select
                required
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
              >
                <option value="C1">C1 (Certificada 1ª)</option>
                <option value="C2">C2 (Certificada 2ª)</option>
                <option value="S1">S1 (Semente 1ª)</option>
                <option value="S2">S2 (Semente 2ª)</option>
                <option value="Básica">Básica</option>
                <option value="Genética">Genética</option>
              </select>
            </div>

            {/* Safra */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Safra *
              </label>
              <select
                required
                value={safra}
                onChange={(e) => setSafra(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
              >
                <option value="2025/2026">2025/2026</option>
                <option value="2026/2027">2026/2027</option>
                <option value="2024/2025">2024/2025</option>
              </select>
            </div>

            {/* Data de Lançamento da Amostra (Semeadura) */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Data de Lançamento da Amostra *
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={dataSemeadura}
                  onChange={(e) => setDataSemeadura(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
                />
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Data de semeadura/instalação do canteiro.
              </p>
            </div>

            {/* Responsável */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Responsável pelo Cadastro *
              </label>
              <input
                type="text"
                required
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
              />
            </div>

            {/* Quantidade Sementes */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Amostra de Sementes (Total)
              </label>
              <input
                type="number"
                value={quantidadeSementes}
                onChange={(e) => setQuantidadeSementes(Number(e.target.value) || 100)}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
              />
            </div>

            {/* Matriz / TSI Seedcorp */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Matriz / Tratamento TSI
              </label>
              <input
                type="text"
                value={tsiMatriz}
                onChange={(e) => setTsiMatriz(e.target.value)}
                placeholder="Ex: Seedcorp / TSI Fungicida + Inseticida"
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
              />
            </div>

          </div>

          {/* PAINEL DE CÁLCULO AUTOMÁTICO DAS DATAS DE LEITURA (7 E 10 DIAS) */}
          <div className="bg-[#f0f7f4] border border-[#b7e4c7] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#2d6a4f]" />
                <span className="text-xs font-bold text-[#1b4332] uppercase tracking-wide">
                  Datas de Leitura de Germinação (Cálculo Automático)
                </span>
              </div>
              <span className="bg-[#2d6a4f] text-[#d8f3dc] text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                AUTOMÁTICO
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              {/* Data de Lançamento */}
              <div className="bg-white p-3 rounded-xl border border-gray-200">
                <span className="text-[11px] font-semibold text-gray-500 block">Data de Lançamento:</span>
                <p className="text-sm font-black text-gray-900 mt-0.5">
                  {formatDateBR(dataSemeadura)}
                </p>
                <span className="text-[10px] text-gray-500 block mt-0.5">Dia 0 (Início)</span>
              </div>

              {/* Leitura de 7 dias */}
              <div className="bg-white p-3 rounded-xl border border-[#74c69d] shadow-2xs relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#2d6a4f] block">Leitura de 7 Dias:</span>
                  <span className="text-[10px] bg-[#d8f3dc] text-[#1b4332] font-extrabold px-1.5 py-0.2 rounded">
                    +7 dias
                  </span>
                </div>
                <p className="text-sm font-black text-[#1b4332] mt-0.5">
                  {formatDateBR(dataLeitura7dias)}
                </p>
                <span className="text-[10px] text-gray-500 block mt-0.5">1ª Contagem de plântulas</span>
              </div>

              {/* Leitura de 10 dias */}
              <div className="bg-white p-3 rounded-xl border border-[#74c69d] shadow-2xs relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#2d6a4f] block">Leitura de 10 Dias:</span>
                  <span className="text-[10px] bg-[#d8f3dc] text-[#1b4332] font-extrabold px-1.5 py-0.2 rounded">
                    +10 dias
                  </span>
                </div>
                <p className="text-sm font-black text-[#1b4332] mt-0.5">
                  {formatDateBR(dataLeitura10dias)}
                </p>
                <span className="text-[10px] text-gray-500 block mt-0.5">Contagem final de germinação</span>
              </div>

            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Observações Gerais (Opcional)
            </label>
            <textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Informações adicionais do lote, tratamento de semente, localização do canteiro..."
              className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-sm font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
            />
          </div>

          {/* Preview do QR Code Gerado */}
          <div className="bg-[#f0f7f4] border border-[#b7e4c7] rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white p-1.5 rounded-lg border border-gray-200">
                <QRCodeSVG value={protocolo} size={48} />
              </div>
              <div>
                <p className="text-xs font-bold text-[#1b4332]">QR Code do Canteiro</p>
                <p className="text-[11px] text-gray-600">
                  Permite leitura instantânea no campo via câmera mobile.
                </p>
              </div>
            </div>
            <span className="bg-[#2d6a4f] text-[#d8f3dc] text-[10px] font-bold px-2 py-1 rounded">
              AUTOMÁTICO
            </span>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#1b4332] hover:bg-[#2d6a4f] text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4 text-[#74c69d]" />
              <span>{editingAmostra ? 'Salvar Alterações' : 'Salvar Amostra'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
