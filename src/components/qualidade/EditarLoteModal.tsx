import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Edit3, 
  Calendar, 
  Building2, 
  Tag, 
  FlaskConical, 
  CheckCircle2, 
  AlertTriangle,
  FileText,
  User
} from 'lucide-react';
import { 
  LoteQualidade, 
  AnaliseQualidade, 
  CategoriaLote, 
  ItemResultadoAnalise 
} from '../../types';
import { storageService } from '../../services/storageService';
import { addDaysToDate, formatDateBR } from '../../utils/dateUtils';

interface EditarLoteModalProps {
  lote: LoteQualidade;
  analise?: AnaliseQualidade;
  onClose: () => void;
  onSuccess: (lote: LoteQualidade, analise: AnaliseQualidade) => void;
}

export const EditarLoteModal: React.FC<EditarLoteModalProps> = ({
  lote,
  analise: analiseProp,
  onClose,
  onSuccess,
}) => {
  const analise = analiseProp || 
    storageService.getAnaliseQualidadeById(lote.analiseAtualId) || 
    storageService.getAnalisesQualidade(lote.id)[0];

  // Dados do Lote
  const [codigoLote, setCodigoLote] = useState(lote.lote);
  const [cultura, setCultura] = useState(lote.cultura);
  const [cultivar, setCultivar] = useState(lote.cultivar);
  const [categoria, setCategoria] = useState<CategoriaLote>(lote.categoria);
  const [safra, setSafra] = useState(lote.safra);
  const [quantidade, setQuantidade] = useState(lote.quantidade || '');
  const [peneira, setPeneira] = useState(lote.peneira || '');
  const [tsiTratamento, setTsiTratamento] = useState(lote.tsiTratamento || '');
  const [emReanalise, setEmReanalise] = useState(Boolean(lote.emReanalise));

  // Dados da Análise
  const [dataAnalise, setDataAnalise] = useState(analise?.dataAnalise || lote.dataUltimaAnalise);
  const [dataValidade, setDataValidade] = useState(analise?.dataValidade || lote.dataValidadeAtual);
  const [laboratorio, setLaboratorio] = useState(analise?.laboratorio || 'Laboratório Central CQ');
  const [numeroCertificadoLaudo, setNumeroCertificadoLaudo] = useState(analise?.numeroCertificadoLaudo || '');
  const [responsavel, setResponsavel] = useState(analise?.responsavel || '');
  const [observacoes, setObservacoes] = useState(analise?.observacoes || '');

  // Resultados dos Testes
  const [resultados, setResultados] = useState<ItemResultadoAnalise[]>(
    analise?.resultados && analise.resultados.length > 0 
      ? analise.resultados.map(r => ({ ...r }))
      : [
          { testeId: 't-germ', nomeTeste: 'Germinação', unidade: '%', valorResultado: lote.germinacaoAtual ?? 85, valorMinimo: 80, valorMeta: 85, tipoComparacao: 'MIN', obrigatorio: true, situacao: 'CONFORME' },
          { testeId: 't-vig', nomeTeste: 'Vigor', unidade: '%', valorResultado: lote.vigorAtual ?? 80, valorMinimo: 75, valorMeta: 80, tipoComparacao: 'MIN', obrigatorio: true, situacao: 'CONFORME' },
          { testeId: 't-pur', nomeTeste: 'Pureza Física', unidade: '%', valorResultado: lote.purezaAtual ?? 99.0, valorMinimo: 98.0, valorMeta: 99.0, tipoComparacao: 'MIN', obrigatorio: true, situacao: 'CONFORME' },
          { testeId: 't-umi', nomeTeste: 'Umidade', unidade: '%', valorResultado: lote.umidadeAtual ?? 11.5, valorMaximo: 12.5, valorMeta: 11.5, tipoComparacao: 'MAX', obrigatorio: true, situacao: 'CONFORME' },
        ]
  );

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Recalcular situação de cada teste ao alterar valor
  const handleResultadoChange = (index: number, valStr: string) => {
    const novosResultados = [...resultados];
    const valNum = valStr === '' ? undefined : Number(valStr.replace(',', '.'));
    const item = { ...novosResultados[index], valorResultado: valNum };

    let conforme = true;
    if (valNum !== undefined) {
      if (item.tipoComparacao === 'MIN' && item.valorMinimo !== undefined) {
        if (valNum < item.valorMinimo) conforme = false;
      }
      if (item.tipoComparacao === 'MAX' && item.valorMaximo !== undefined) {
        if (valNum > item.valorMaximo) conforme = false;
      }
    }
    item.situacao = conforme ? 'CONFORME' : 'REPROVADO';
    novosResultados[index] = item;
    setResultados(novosResultados);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!codigoLote.trim()) {
      setErro('O código do lote é obrigatório.');
      return;
    }
    if (!cultivar.trim()) {
      setErro('A cultivar é obrigatória.');
      return;
    }

    try {
      setSalvando(true);
      const analiseId = analise?.id || lote.analiseAtualId || `anl-${Date.now()}`;

      const { lote: loteUpd, analise: analiseUpd } = await storageService.editarLoteEAnalise(
        lote.id,
        analiseId,
        {
          lote: codigoLote.trim().toUpperCase(),
          cultura: cultura.trim(),
          cultivar: cultivar.trim(),
          categoria,
          safra: safra.trim(),
          quantidade: quantidade.trim(),
          peneira: peneira.trim(),
          tsiTratamento: tsiTratamento.trim(),
          emReanalise,
          dataUltimaAnalise: dataAnalise,
          dataValidadeAtual: dataValidade,
        },
        {
          dataAnalise,
          dataValidade,
          laboratorio: laboratorio.trim(),
          numeroCertificadoLaudo: numeroCertificadoLaudo.trim(),
          responsavel: responsavel.trim(),
          observacoes: observacoes.trim(),
          resultados,
        }
      );

      onSuccess(loteUpd, analiseUpd);
    } catch (err: any) {
      console.error('Erro ao salvar edição:', err);
      setErro(err.message || 'Falha ao salvar as alterações do lote.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-100 text-blue-800 rounded-lg">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Editar Informações do Lote & Análise
              </h3>
              <p className="text-xs text-gray-500">
                Altere qualquer campo do lote ({lote.lote}), dados da análise e resultados dos testes.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSalvar} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {erro && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {/* 1. DADOS DE IDENTIFICAÇÃO DO LOTE */}
          <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200 space-y-4">
            <h4 className="font-bold text-gray-900 flex items-center space-x-2 text-xs">
              <Tag className="w-4 h-4 text-emerald-700" />
              <span>1. Identificação do Lote de Sementes</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Código do Lote *</label>
                <input
                  type="text"
                  value={codigoLote}
                  onChange={e => setCodigoLote(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Cultura *</label>
                <input
                  type="text"
                  value={cultura}
                  onChange={e => setCultura(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-emerald-500 bg-white font-semibold"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Cultivar / Híbrido *</label>
                <input
                  type="text"
                  value={cultivar}
                  onChange={e => setCultivar(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Categoria *</label>
                <select
                  value={categoria}
                  onChange={e => setCategoria(e.target.value as CategoriaLote)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-emerald-500 bg-white font-semibold"
                >
                  <option value="Básica">Básica (Certificado)</option>
                  <option value="C1">C1 (Certificado)</option>
                  <option value="C2">C2 (Certificado)</option>
                  <option value="S1">S1 (Termo Conformidade)</option>
                  <option value="S2">S2 (Termo Conformidade)</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Safra</label>
                <input
                  type="text"
                  value={safra}
                  onChange={e => setSafra(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Quantidade / Volume</label>
                <input
                  type="text"
                  value={quantidade}
                  onChange={e => setQuantidade(e.target.value)}
                  placeholder="Ex: 25.000 kg"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Peneira / Classificação</label>
                <input
                  type="text"
                  value={peneira}
                  onChange={e => setPeneira(e.target.value)}
                  placeholder="Ex: 4.0 mm / 6.5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Status Especial</label>
                <label className="flex items-center space-x-2 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emReanalise}
                    onChange={e => setEmReanalise(e.target.checked)}
                    className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                  />
                  <span className="font-semibold text-orange-800">Em Reanálise no Lab</span>
                </label>
              </div>

              <div className="sm:col-span-2 md:col-span-4">
                <label className="block text-gray-700 font-semibold mb-1">Tratamento de Sementes (TSI)</label>
                <input
                  type="text"
                  value={tsiTratamento}
                  onChange={e => setTsiTratamento(e.target.value)}
                  placeholder="Ex: Fungicida + Inseticida + Polímero"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>
            </div>
          </div>

          {/* 2. DADOS DA ANÁLISE E VALIDADE */}
          <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200 space-y-4">
            <h4 className="font-bold text-gray-900 flex items-center space-x-2 text-xs">
              <Calendar className="w-4 h-4 text-blue-700" />
              <span>2. Dados da Análise, Laboratório & Validade Legal</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Data da Análise *</label>
                <input
                  type="date"
                  value={dataAnalise}
                  onChange={e => setDataAnalise(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-emerald-500 bg-white font-medium"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Data de Validade Legal *</label>
                <input
                  type="date"
                  value={dataValidade}
                  onChange={e => setDataValidade(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-emerald-500 bg-white font-bold text-emerald-900"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Laboratório</label>
                <input
                  type="text"
                  value={laboratorio}
                  onChange={e => setLaboratorio(e.target.value)}
                  placeholder="Ex: LAS Uberaba"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Nº Laudo / Certificado</label>
                <input
                  type="text"
                  value={numeroCertificadoLaudo}
                  onChange={e => setNumeroCertificadoLaudo(e.target.value)}
                  placeholder="Ex: CERT-2026/099"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-emerald-500 bg-white font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-gray-700 font-semibold mb-1">Responsável Técnico / Analista</label>
                <input
                  type="text"
                  value={responsavel}
                  onChange={e => setResponsavel(e.target.value)}
                  placeholder="Ex: Eng. Agrônomo Responsável"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-gray-700 font-semibold mb-1">Observações da Análise</label>
                <input
                  type="text"
                  value={observacoes}
                  onChange={e => setObservacoes(e.target.value)}
                  placeholder="Anotações técnicas do laudo..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>
            </div>
          </div>

          {/* 3. RESULTADOS DOS TESTES DE QUALIDADE */}
          <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-gray-900 flex items-center space-x-2 text-xs">
                <FlaskConical className="w-4 h-4 text-purple-700" />
                <span>3. Resultados dos Testes Físicos e Fisiológicos</span>
              </h4>
              <span className="text-[11px] text-gray-500">
                A conformidade é calculada dinamicamente com base nos limites.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {resultados.map((res, idx) => {
                const isConforme = res.situacao === 'CONFORME';
                return (
                  <div 
                    key={res.testeId || idx}
                    className={`p-3 rounded-lg border transition ${
                      isConforme ? 'bg-white border-gray-200' : 'bg-rose-50/70 border-rose-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-gray-800 text-xs truncate" title={res.nomeTeste}>
                        {res.nomeTeste}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        isConforme ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {isConforme ? 'OK' : 'REPROV.'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <input
                        type="number"
                        step="0.01"
                        value={res.valorResultado !== undefined ? res.valorResultado : ''}
                        onChange={e => handleResultadoChange(idx, e.target.value)}
                        placeholder="-"
                        className="w-full px-2 py-1.5 border border-gray-300 rounded font-black text-sm text-gray-900 bg-white focus:ring-1 focus:ring-emerald-500"
                      />
                      <span className="text-gray-500 font-semibold text-xs whitespace-nowrap">
                        {res.unidade}
                      </span>
                    </div>

                    <div className="text-[10px] text-gray-500 mt-1 flex justify-between">
                      {res.valorMinimo !== undefined && <span>Mín: {res.valorMinimo}{res.unidade}</span>}
                      {res.valorMaximo !== undefined && <span>Máx: {res.valorMaximo}{res.unidade}</span>}
                      {res.valorMeta !== undefined && <span className="text-emerald-700 font-semibold">Meta: {res.valorMeta}{res.unidade}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="inline-flex items-center px-5 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition shadow disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-1.5" />
              {salvando ? 'Salvando Alterações...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
