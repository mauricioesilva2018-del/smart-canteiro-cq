import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Upload, 
  FileText, 
  ShieldCheck, 
  Calendar, 
  Building2, 
  UserCheck, 
  AlertTriangle, 
  CheckCircle2, 
  FileCheck,
  Search,
  Sparkles
} from 'lucide-react';
import { 
  LoteQualidade, 
  AnaliseQualidade, 
  CategoriaLote, 
  TipoTesteQualidade, 
  DocumentoAnexoQualidade 
} from '../../types';
import { storageService } from '../../services/storageService';
import { getTodayBR, addDaysToDate, formatDateBR } from '../../utils/dateUtils';

interface NovaAnaliseModalProps {
  onClose: () => void;
  onSuccess: (lote: LoteQualidade, analise: AnaliseQualidade) => void;
  loteParaReanalise?: LoteQualidade;
}

export const NovaAnaliseModal: React.FC<NovaAnaliseModalProps> = ({
  onClose,
  onSuccess,
  loteParaReanalise,
}) => {
  const isReanalise = Boolean(loteParaReanalise);
  const currentUser = storageService.getCurrentUser();

  // Dados do Lote
  const [lote, setLote] = useState(loteParaReanalise?.lote || '');
  const [cultura, setCultura] = useState(loteParaReanalise?.cultura || 'Sorgo');
  const [cultivar, setCultivar] = useState(loteParaReanalise?.cultivar || '');
  const [categoria, setCategoria] = useState<CategoriaLote>(loteParaReanalise?.categoria || 'S2');
  const [safra, setSafra] = useState(loteParaReanalise?.safra || '2025/2026');
  const [quantidade, setQuantidade] = useState(loteParaReanalise?.quantidade || '');
  const [peneira, setPeneira] = useState(loteParaReanalise?.peneira || '');
  const [tsiTratamento, setTsiTratamento] = useState(loteParaReanalise?.tsiTratamento || '');

  // Dados da Análise
  const [dataAnalise, setDataAnalise] = useState(getTodayBR());
  const [dataValidade, setDataValidade] = useState('');
  const [laboratorio, setLaboratorio] = useState('Laboratório Central CQ Sementes');
  const [numeroCertificadoLaudo, setNumeroCertificadoLaudo] = useState('');
  const [responsavel, setResponsavel] = useState(currentUser?.nome || 'Mariana Silva (Qualidade)');
  const [observacoes, setObservacoes] = useState('');

  // Testes e Resultados
  const [testesDefinidos, setTestesDefinidos] = useState<TipoTesteQualidade[]>([]);
  const [valoresResultados, setValoresResultados] = useState<Record<string, number | string>>({});

  // Documentos e Termo
  const [gerarTermoAutomatico, setGerarTermoAutomatico] = useState(true);
  const [documentoAnexo, setDocumentoAnexo] = useState<DocumentoAnexoQualidade | undefined>(undefined);
  const [nomeArquivoAnexo, setNomeArquivoAnexo] = useState<string>('');

  // Sugestões de autocomplete
  const [sugestoesLote, setSugestoesLote] = useState<any[]>([]);
  const [showSugestoes, setShowSugestoes] = useState(false);

  // Erro / Validação / Salvando
  const [salvando, setSalvando] = useState(false);
  const [erroMsg, setErroMsg] = useState('');

  // Carregar parâmetros e critérios
  useEffect(() => {
    if (isReanalise && loteParaReanalise) {
      // REGRA CRÍTICA: Buscar a análise original para copiar seu snapshot de parâmetros históricos
      const analiseOriginal = storageService
        .getAnalisesQualidade(loteParaReanalise.id)
        .find(a => a.numeroAnalise === 1 || a.id === loteParaReanalise.analiseOriginalId);

      const snapshot = analiseOriginal?.parametrosSnapshot || 
        storageService.getParametrosQualidadePorCultura(loteParaReanalise.cultura).testes;

      setTestesDefinidos(snapshot);

      // Preencher valores anteriores como placeholder ou padrão
      const valoresIniciais: Record<string, number | string> = {};
      snapshot.forEach(t => {
        const prevRes = analiseOriginal?.resultados.find(r => r.testeId === t.id);
        if (prevRes) {
          valoresIniciais[t.id] = prevRes.valorResultado;
        } else if (t.valorMinimo !== undefined) {
          valoresIniciais[t.id] = t.valorMinimo;
        } else if (t.valorMaximo !== undefined) {
          valoresIniciais[t.id] = 0;
        }
      });
      setValoresResultados(valoresIniciais);

      const diasValidade = storageService.getParametrosQualidadePorCultura(loteParaReanalise.cultura).diasValidadePadrao || 180;
      setDataValidade(addDaysToDate(getTodayBR(), diasValidade));
      setNumeroCertificadoLaudo(`REAN-${loteParaReanalise.lote}-${(loteParaReanalise.totalReanalises || 0) + 1}`);
    } else {
      // Nova Análise: Carrega parâmetros atuais da cultura
      const paramCultura = storageService.getParametrosQualidadePorCultura(cultura);
      setTestesDefinidos(paramCultura.testes);

      const valoresIniciais: Record<string, number | string> = {};
      paramCultura.testes.forEach(t => {
        if (t.valorMeta !== undefined) {
          valoresIniciais[t.id] = t.valorMeta;
        } else if (t.valorMinimo !== undefined) {
          valoresIniciais[t.id] = t.valorMinimo;
        } else if (t.valorMaximo !== undefined) {
          valoresIniciais[t.id] = 0;
        } else {
          valoresIniciais[t.id] = '';
        }
      });
      setValoresResultados(valoresIniciais);

      const diasValidade = paramCultura.diasValidadePadrao || 180;
      setDataValidade(addDaysToDate(dataAnalise, diasValidade));
    }
  }, [cultura, isReanalise, loteParaReanalise]);

  // Atualizar data de validade ao alterar a data da análise
  const handleDataAnaliseChange = (novaData: string) => {
    setDataAnalise(novaData);
    const paramCultura = storageService.getParametrosQualidadePorCultura(cultura);
    const diasValidade = paramCultura.diasValidadePadrao || 180;
    setDataValidade(addDaysToDate(novaData, diasValidade));
  };

  // Autocomplete de lotes existentes
  const handleLoteInput = (valor: string) => {
    setLote(valor);
    if (valor.length >= 2) {
      const sugestoes = storageService.buscarSugestaoLote(valor);
      setSugestoesLote(sugestoes);
      setShowSugestoes(sugestoes.length > 0);
    } else {
      setShowSugestoes(false);
    }
  };

  const handleSelecionarSugestao = (item: any) => {
    setLote(item.lote);
    if (item.cultura) setCultura(item.cultura);
    if (item.cultivar) setCultivar(item.cultivar);
    if (item.categoria) setCategoria(item.categoria as CategoriaLote);
    if (item.safra) setSafra(item.safra);
    if (item.peneira) setPeneira(item.peneira);
    setShowSugestoes(false);
  };

  // Upload de Documento (Certificado / Laudo)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNomeArquivoAnexo(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const isPdf = file.type === 'application/pdf';
      const isImg = file.type.startsWith('image/');

      setDocumentoAnexo({
        id: `doc-${Date.now()}`,
        loteId: loteParaReanalise?.id || '',
        analiseId: '',
        tipo: (categoria === 'S1' || categoria === 'S2') ? 'TERMO_CONFORMIDADE' : 'CERTIFICADO',
        nomeArquivo: file.name,
        dataUpload: new Date().toISOString(),
        arquivoBase64: base64,
        tipoMime: file.type,
        tamanhoBytes: file.size,
        emitidoPor: laboratorio,
        numeroDocumento: numeroCertificadoLaudo,
      });
    };
    reader.readAsDataURL(file);
  };

  // Submissão do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroMsg('');

    if (!lote.trim()) {
      setErroMsg('Por favor, informe a identificação do lote.');
      return;
    }
    if (!cultivar.trim()) {
      setErroMsg('Por favor, informe a cultivar ou híbrido.');
      return;
    }
    if (!dataAnalise) {
      setErroMsg('Por favor, informe a data da análise.');
      return;
    }

    setSalvando(true);

    try {
      // Montar resultados com valores digitados
      const resultadosFormatados = testesDefinidos.map(t => {
        const val = valoresResultados[t.id] !== undefined ? valoresResultados[t.id] : 0;
        return {
          testeId: t.id,
          nomeTeste: t.nome,
          unidade: t.unidade,
          valorResultado: val,
          valorMinimo: t.valorMinimo,
          valorMaximo: t.valorMaximo,
          valorMeta: t.valorMeta,
        };
      });

      if (isReanalise && loteParaReanalise) {
        // Registrar Reanálise com cópia de snapshot de critérios
        const res = await storageService.salvarReanaliseQualidade({
          loteId: loteParaReanalise.id,
          dataAnalise,
          dataValidade,
          laboratorio,
          numeroCertificadoLaudo,
          responsavel,
          resultados: resultadosFormatados,
          documentoAnexo,
          observacoes,
          gerarTermoConformidadeAutomatico: gerarTermoAutomatico,
        });
        onSuccess(res.lote, res.analise);
      } else {
        // Registrar Nova Análise Original
        const res = await storageService.salvarNovaAnaliseQualidade({
          lote,
          cultura,
          cultivar,
          categoria,
          safra,
          quantidade,
          peneira,
          tsiTratamento,
          dataAnalise,
          dataValidade,
          laboratorio,
          numeroCertificadoLaudo,
          responsavel,
          resultados: resultadosFormatados,
          documentoAnexo,
          observacoes,
          gerarTermoConformidadeAutomatico: gerarTermoAutomatico,
        });
        onSuccess(res.lote, res.analise);
      }
    } catch (err: any) {
      console.error('Erro ao salvar análise:', err);
      setErroMsg(err?.message || 'Erro ao registrar análise de qualidade.');
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
            <div className={`p-2 rounded-lg ${isReanalise ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                {isReanalise
                  ? `Registrar Reanálise de Lote — ${loteParaReanalise?.lote}`
                  : 'Cadastrar Nova Análise de Qualidade de Lote'}
              </h3>
              <p className="text-xs text-gray-500">
                {isReanalise
                  ? 'Os critérios e testes da análise original foram copiados para manter o padrão comparativo.'
                  : 'Preencha os dados do lote e os resultados dos testes laboratoriais.'}
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

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {erroMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-700 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2 shrink-0" />
              {erroMsg}
            </div>
          )}

          {/* 1. IDENTIFICAÇÃO DO LOTE */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 pb-1 border-b border-gray-200">
              <span className="w-5 h-5 rounded-full bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center">
                1
              </span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Identificação do Lote e Cultura
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Cultura */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Cultura <span className="text-rose-500">*</span>
                </label>
                <select
                  value={cultura}
                  onChange={e => setCultura(e.target.value)}
                  disabled={isReanalise}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
                >
                  <option value="Sorgo">Sorgo</option>
                  <option value="Trigo">Trigo</option>
                  <option value="Algodão">Algodão</option>
                  <option value="Soja">Soja</option>
                  <option value="Milho">Milho</option>
                  <option value="Feijão">Feijão</option>
                  {storageService
                    .getAllParametrosQualidadeCultura()
                    .filter(p => !['sorgo', 'trigo', 'algodao', 'soja', 'milho', 'feijao'].includes(p.id))
                    .map(p => (
                      <option key={p.id} value={p.cultura}>
                        {p.cultura}
                      </option>
                    ))}
                </select>
              </div>

              {/* Lote com Autocomplete */}
              <div className="relative">
                <label className="block font-semibold text-gray-700 mb-1">
                  Identificação do Lote <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ex: L-2026-SRG-115"
                    value={lote}
                    onChange={e => handleLoteInput(e.target.value)}
                    disabled={isReanalise}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
                    required
                  />
                  {!isReanalise && (
                    <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2.5 pointer-events-none" />
                  )}
                </div>

                {/* Sugestões Dropdown */}
                {showSugestoes && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto divide-y divide-gray-100">
                    <div className="p-1.5 bg-gray-50 text-[10px] font-bold text-gray-500 uppercase flex items-center">
                      <Sparkles className="w-3 h-3 mr-1 text-emerald-600" /> Lotes Encontrados no Sistema:
                    </div>
                    {sugestoesLote.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelecionarSugestao(item)}
                        className="w-full text-left p-2 hover:bg-emerald-50 text-xs flex items-center justify-between transition"
                      >
                        <span className="font-bold text-emerald-900 font-mono">{item.lote}</span>
                        <span className="text-gray-500 text-[11px]">
                          {item.cultura} • {item.cultivar} ({item.categoria})
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Cultivar */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Cultivar / Híbrido <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: NUGRAIN 430, M 8349 IPRO"
                  value={cultivar}
                  onChange={e => setCultivar(e.target.value)}
                  disabled={isReanalise}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-medium focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
                  required
                />
              </div>

              {/* Categoria */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Categoria de Semente <span className="text-rose-500">*</span>
                </label>
                <select
                  value={categoria}
                  onChange={e => setCategoria(e.target.value as CategoriaLote)}
                  disabled={isReanalise}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
                >
                  <option value="Básica">Básica (Certificado)</option>
                  <option value="C1">C1 - Certificada 1 (Certificado)</option>
                  <option value="C2">C2 - Certificada 2 (Certificado)</option>
                  <option value="S1">S1 - Salva / Própria (Termo de Conformidade)</option>
                  <option value="S2">S2 - Salva / Própria (Termo de Conformidade)</option>
                </select>
              </div>

              {/* Safra */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Safra de Produção</label>
                <input
                  type="text"
                  placeholder="Ex: 2025/2026"
                  value={safra}
                  onChange={e => setSafra(e.target.value)}
                  disabled={isReanalise}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-medium focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
                />
              </div>

              {/* Quantidade */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Quantidade do Lote</label>
                <input
                  type="text"
                  placeholder="Ex: 25.000 kg ou 500 sc"
                  value={quantidade}
                  onChange={e => setQuantidade(e.target.value)}
                  disabled={isReanalise}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-medium focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
                />
              </div>

              {/* Peneira / Classificação */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Peneira / Classificação</label>
                <input
                  type="text"
                  placeholder="Ex: 4.0, 6.5, R2L, Padrão"
                  value={peneira}
                  onChange={e => setPeneira(e.target.value)}
                  disabled={isReanalise}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-medium focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
                />
              </div>

              {/* TSI Tratamento */}
              <div className="md:col-span-2">
                <label className="block font-semibold text-gray-700 mb-1">Tratamento de Sementes (TSI)</label>
                <input
                  type="text"
                  placeholder="Ex: Fungicida + Inseticida + Polímero Grafite"
                  value={tsiTratamento}
                  onChange={e => setTsiTratamento(e.target.value)}
                  disabled={isReanalise}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-medium focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
                />
              </div>
            </div>
          </div>

          {/* 2. DADOS DA ANÁLISE / REANÁLISE */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 pb-1 border-b border-gray-200">
              <span className="w-5 h-5 rounded-full bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center">
                2
              </span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Dados da Análise e Validade
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              {/* Data da Análise */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Data da Análise <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={dataAnalise}
                  onChange={e => handleDataAnaliseChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-semibold text-gray-900 focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* Validade do Teste */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Validade da Germinação <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={dataValidade}
                  onChange={e => setDataValidade(e.target.value)}
                  className="w-full px-3 py-2 border border-emerald-300 bg-emerald-50/50 rounded-lg font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* Laboratório */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Laboratório Responsável</label>
                <input
                  type="text"
                  placeholder="Ex: Laboratório Central CQ / LAS"
                  value={laboratorio}
                  onChange={e => setLaboratorio(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Número do Certificado / Laudo */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Nº do Certificado / Laudo</label>
                <input
                  type="text"
                  placeholder="Ex: LAUDO-2026/0891"
                  value={numeroCertificadoLaudo}
                  onChange={e => setNumeroCertificadoLaudo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* 3. RESULTADOS DOS TESTES ESPECÍFICOS DA CULTURA */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center">
                  3
                </span>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Resultados dos Testes de Qualidade — {cultura} ({testesDefinidos.length} testes)
                </h4>
              </div>
              <span className="text-[11px] text-gray-500">
                Situação calculada em tempo real conforme as normas
              </span>
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="p-3 w-1/3">Parâmetro / Teste</th>
                    <th className="p-3 w-28 text-center">Resultado Obtido</th>
                    <th className="p-3 w-28 text-center">Padrão Norma</th>
                    <th className="p-3 w-24 text-center">Meta</th>
                    <th className="p-3 w-28 text-center">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {testesDefinidos.map(teste => {
                    const val = valoresResultados[teste.id] ?? '';
                    const situacao = storageService.avaliarItemResultado({
                      valorResultado: val,
                      valorMinimo: teste.valorMinimo,
                      valorMaximo: teste.valorMaximo,
                      valorMeta: teste.valorMeta,
                    });

                    let padraoStr = '-';
                    if (teste.valorMinimo !== undefined) padraoStr = `Mín ${teste.valorMinimo} ${teste.unidade}`;
                    else if (teste.valorMaximo !== undefined) padraoStr = `Máx ${teste.valorMaximo} ${teste.unidade}`;

                    return (
                      <tr key={teste.id} className="hover:bg-gray-50">
                        <td className="p-3">
                          <div className="font-semibold text-gray-900">{teste.nome}</div>
                          {teste.obrigatorio && (
                            <span className="text-[10px] text-amber-700 font-medium">● Obrigatório</span>
                          )}
                        </td>

                        {/* Input do Resultado */}
                        <td className="p-3 text-center">
                          <div className="inline-flex items-center space-x-1">
                            <input
                              type="number"
                              step="any"
                              value={val}
                              onChange={e =>
                                setValoresResultados({
                                  ...valoresResultados,
                                  [teste.id]: e.target.value === '' ? '' : parseFloat(e.target.value),
                                })
                              }
                              className="w-20 px-2 py-1 border border-gray-300 rounded font-bold text-center text-gray-900 focus:ring-1 focus:ring-emerald-500"
                              placeholder="0.0"
                            />
                            <span className="text-gray-500 font-mono text-[11px]">{teste.unidade}</span>
                          </div>
                        </td>

                        <td className="p-3 text-center text-gray-500 font-mono">{padraoStr}</td>

                        <td className="p-3 text-center text-emerald-800 font-mono">
                          {teste.valorMeta !== undefined ? `${teste.valorMeta} ${teste.unidade}` : '-'}
                        </td>

                        {/* Situação em tempo real */}
                        <td className="p-3 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              situacao === 'CONFORME'
                                ? 'bg-emerald-100 text-emerald-800'
                                : situacao === 'NAO_CONFORME'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {situacao === 'CONFORME' && '🟢 Conforme'}
                            {situacao === 'NAO_CONFORME' && '🔴 Não Conforme'}
                            {situacao === 'ATENCAO' && '🟡 Atenção'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. DOCUMENTAÇÃO E TERMO */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 pb-1 border-b border-gray-200">
              <span className="w-5 h-5 rounded-full bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center">
                4
              </span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Documentação do Lote & Laudo
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Opção de Termo de Conformidade para S1/S2 */}
              {(categoria === 'S1' || categoria === 'S2') ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="chkTermo"
                      checked={gerarTermoAutomatico}
                      onChange={e => setGerarTermoAutomatico(e.target.checked)}
                      className="w-4 h-4 text-emerald-700 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                    />
                    <label htmlFor="chkTermo" className="font-bold text-emerald-950 cursor-pointer">
                      Gerar Termo de Conformidade Oficial (MAPA)
                    </label>
                  </div>
                  <p className="text-[11px] text-emerald-800 pl-6">
                    Emissão instantânea do documento legal de conformidade para sementes de categoria {categoria}.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
                  <div className="font-bold text-blue-900 flex items-center">
                    <FileCheck className="w-4 h-4 mr-1 text-blue-700" /> Certificado de Análise Obrigatório
                  </div>
                  <p className="text-[11px] text-blue-800">
                    Para categorias Básica, C1 e C2, anexe o Certificado emitido pelo Laboratório de Análise de Sementes (LAS).
                  </p>
                </div>
              )}

              {/* Upload de Arquivo / Certificado */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                <label className="block font-bold text-gray-800">
                  Anexar Arquivo Digital (PDF, JPG, PNG)
                </label>
                <div className="flex items-center space-x-2">
                  <label className="flex-1 cursor-pointer flex items-center justify-center px-3 py-2 border border-gray-300 border-dashed rounded-lg bg-white hover:bg-gray-100 transition">
                    <Upload className="w-4 h-4 text-gray-500 mr-2" />
                    <span className="text-xs font-semibold text-gray-700 truncate">
                      {nomeArquivoAnexo || 'Selecionar Laudo/Certificado...'}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,image/png,image/jpeg,image/jpg"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  {documentoAnexo && (
                    <button
                      type="button"
                      onClick={() => {
                        setDocumentoAnexo(undefined);
                        setNomeArquivoAnexo('');
                      }}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"
                      title="Remover anexo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Observações */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Observações Técnicas / Parecer do Lote
              </label>
              <textarea
                rows={2}
                placeholder="Insira detalhes adicionais sobre as condições do lote ou análise..."
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-500">
            Responsável: <strong className="text-gray-800">{responsavel}</strong>
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={salvando}
              className="inline-flex items-center px-5 py-2 text-xs font-bold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition disabled:opacity-50 shadow"
            >
              <Save className="w-4 h-4 mr-1.5" />
              {salvando
                ? 'Salvando...'
                : isReanalise
                ? 'Salvar Reanálise de Lote'
                : 'Salvar Análise de Qualidade'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
