import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  UploadCloud,
  Download,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Layers,
  MapPin,
  Lock,
  RefreshCw,
  ArrowRight,
  XCircle,
} from 'lucide-react';
import { Amostra, Avaliacao, Usuario } from '../types';
import { storageService } from '../services/storageService';
import { formatDateBR, getTodayBR } from '../utils/dateUtils';
import {
  CampoSistemaAmostragem,
  ColumnMappingCanteiro,
  FIELD_DEFINITIONS,
  ParsedExcelRow,
  buildParsedExcelPreview,
  extractSheetData,
  gerarPlanilhaModeloCanteiros,
  parseExcelWorkbookBuffer,
} from '../utils/excelImportUtils';

interface ImportarAmostrasExcelPanelProps {
  currentUser: Usuario;
  onCancel: () => void;
  onImportComplete: (result: {
    cadastrados: number;
    atualizados: number;
    ignorados: number;
    amostrasCriadas: Amostra[];
    amostrasAtualizadas: Amostra[];
  }) => void;
}

type PreviewFilter = 'TODOS' | 'NOVOS' | 'DUPLICADOS' | 'INVALIDOS';

export const ImportarAmostrasExcelPanel: React.FC<ImportarAmostrasExcelPanelProps> = ({
  currentUser,
  onCancel,
  onImportComplete,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [fileName, setFileName] = useState<string>('');
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [mapping, setMapping] = useState<ColumnMappingCanteiro>({});
  const [showMappingEditor, setShowMappingEditor] = useState<boolean>(false);

  const [defaultDataSemeadura, setDefaultDataSemeadura] = useState<string>(getTodayBR());
  const [previewRows, setPreviewRows] = useState<ParsedExcelRow[]>([]);
  const [previewFilter, setPreviewFilter] = useState<PreviewFilter>('TODOS');

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [importSummary, setImportSummary] = useState<{
    cadastrados: number;
    atualizados: number;
    ignorados: number;
  } | null>(null);

  const existingAmostras: Amostra[] = storageService.getAmostras();
  const existingAvaliacoes: Avaliacao[] = storageService.getAvaliacoes();
  const existingCanteiros: string[] = storageService.getUniqueCanteiros();

  const regeneratePreview = (
    nextRawRows: Record<string, any>[],
    nextMapping: ColumnMappingCanteiro,
    nextDefaultDate: string
  ) => {
    const parsed = buildParsedExcelPreview(
      nextRawRows,
      nextMapping,
      existingAmostras,
      existingAvaliacoes,
      {
        defaultDataSemeadura: nextDefaultDate,
        defaultResponsavel: currentUser.nome,
        existingCanteiros,
      }
    );
    setPreviewRows(parsed);
  };

  const loadSheetIntoState = (
    wb: XLSX.WorkBook,
    sheetName: string,
    nextDefaultDate: string = defaultDataSemeadura
  ) => {
    const extracted = extractSheetData(wb, sheetName);
    setSelectedSheet(sheetName);
    setHeaders(extracted.headers);
    setRawRows(extracted.rawRows);
    setMapping(extracted.mapping);
    setShowMappingEditor(!extracted.mapping.lote || !extracted.mapping.cultura);
    regeneratePreview(extracted.rawRows, extracted.mapping, nextDefaultDate);
  };

  const handleFile = async (file: File) => {
    setErrorMessage('');
    setImportSummary(null);
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls')) {
      setErrorMessage('Formato não suportado. Selecione uma planilha Excel (.xlsx ou .xls).');
      return;
    }

    setIsParsing(true);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseExcelWorkbookBuffer(buffer);
      if (!parsed.sheetNames.length) {
        setErrorMessage('Nenhuma aba encontrada na planilha selecionada.');
        return;
      }
      setFileName(file.name);
      setWorkbook(parsed.workbook);
      setSheetNames(parsed.sheetNames);
      loadSheetIntoState(parsed.workbook, parsed.sheetNames[0]);
    } catch (err) {
      setErrorMessage(
        `Não foi possível ler a planilha: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleMappingChange = (field: CampoSistemaAmostragem, colHeader: string) => {
    const nextMapping: ColumnMappingCanteiro = {
      ...mapping,
      [field]: colHeader || undefined,
    };
    setMapping(nextMapping);
    regeneratePreview(rawRows, nextMapping, defaultDataSemeadura);
  };

  const handleDefaultDateChange = (newDate: string) => {
    setDefaultDataSemeadura(newDate);
    if (rawRows.length > 0) {
      regeneratePreview(rawRows, mapping, newDate);
    }
  };

  const updateRowField = (
    rowIndex: number,
    patch: Partial<Pick<ParsedExcelRow, 'canteiro' | 'action' | 'autorizarAlterarVinculo'>>
  ) => {
    setPreviewRows((prev) =>
      prev.map((row) => (row.rowIndex === rowIndex ? { ...row, ...patch } : row))
    );
  };

  const stats = useMemo(() => {
    const total = previewRows.length;
    const novos = previewRows.filter((r) => r.duplicateStatus === 'NOVO').length;
    const duplicados = previewRows.filter(
      (r) =>
        r.duplicateStatus === 'DUPLICADO_COM_RESULTADOS' ||
        r.duplicateStatus === 'DUPLICADO_SEM_RESULTADOS' ||
        r.duplicateStatus === 'DUPLICADO_PLANILHA'
    ).length;
    const invalidos = previewRows.filter((r) => r.duplicateStatus === 'INVALIDO').length;
    const aImportar = previewRows.filter((r) => r.action === 'CADASTRAR').length;
    const aAtualizar = previewRows.filter((r) => r.action === 'ATUALIZAR_AUTORIZADO').length;
    return { total, novos, duplicados, invalidos, aImportar, aAtualizar };
  }, [previewRows]);

  const filteredPreviewRows = useMemo(() => {
    if (previewFilter === 'NOVOS') {
      return previewRows.filter((r) => r.duplicateStatus === 'NOVO');
    }
    if (previewFilter === 'DUPLICADOS') {
      return previewRows.filter(
        (r) =>
          r.duplicateStatus === 'DUPLICADO_COM_RESULTADOS' ||
          r.duplicateStatus === 'DUPLICADO_SEM_RESULTADOS' ||
          r.duplicateStatus === 'DUPLICADO_PLANILHA'
      );
    }
    if (previewFilter === 'INVALIDOS') {
      return previewRows.filter((r) => r.duplicateStatus === 'INVALIDO');
    }
    return previewRows;
  }, [previewRows, previewFilter]);

  const handleConfirmImport = async () => {
    if (stats.aImportar + stats.aAtualizar === 0) return;
    setIsImporting(true);
    setErrorMessage('');
    try {
      const result = await storageService.importarAmostrasCanteiroEmMassa(
        previewRows,
        currentUser.nome
      );
      setImportSummary({
        cadastrados: result.cadastrados,
        atualizados: result.atualizados,
        ignorados: result.ignorados,
      });
      onImportComplete(result);
    } catch (err) {
      setErrorMessage(
        `Falha ao importar lotes: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
      <datalist id="canteiros-sugeridos-excel">
        {existingCanteiros.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      {/* Cabeçalho informativo + botão de modelo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#f0f7f4] border border-[#b7e4c7] rounded-xl p-4">
        <div className="space-y-0.5">
          <p className="text-sm font-bold text-[#1b4332]">
            Importação Automática de Lotes Plantados (.xlsx / .xls)
          </p>
          <p className="text-xs text-gray-700">
            Os cabeçalhos e canteiros são identificados automaticamente. Novos lotes entram com a situação{' '}
            <strong className="text-[#1b4332]">PLANTADO – AGUARDANDO LEITURA</strong>.
          </p>
        </div>

        <button
          type="button"
          onClick={gerarPlanilhaModeloCanteiros}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-gray-50 text-[#1b4332] border border-[#74c69d] rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-colors"
        >
          <Download className="w-4 h-4 text-[#2d6a4f]" />
          <span>Baixar Planilha Modelo</span>
        </button>
      </div>

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {importSummary && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-950 space-y-0.5">
              <p className="font-bold text-sm">Importação concluída com rastreabilidade</p>
              <p>
                <span className="font-bold tabular-nums">{importSummary.cadastrados}</span> lote(s)
                cadastrado(s) como <strong>PLANTADO – AGUARDANDO LEITURA</strong> •{' '}
                <span className="font-bold tabular-nums">{importSummary.atualizados}</span>{' '}
                atualizado(s) •{' '}
                <span className="font-bold tabular-nums">{importSummary.ignorados}</span>{' '}
                ignorado(s)/protegido(s).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1b4332] hover:bg-[#2d6a4f] text-white text-xs font-bold rounded-xl cursor-pointer whitespace-nowrap"
          >
            <span>Ir para Canteiros / Leituras</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Dropzone de upload */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-[#2d6a4f] bg-[#f0f7f4]'
            : 'border-gray-300 bg-gray-50 hover:bg-gray-100/70'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-2">
          <div className="w-11 h-11 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-[#2d6a4f]">
            {isParsing ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <UploadCloud className="w-5 h-5" />
            )}
          </div>
          {fileName ? (
            <>
              <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-[#2d6a4f]" />
                <span>{fileName}</span>
              </p>
              <p className="text-xs text-gray-500">
                Clique ou arraste outro arquivo .xlsx ou .xls para substituir
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-gray-900">
                Anexar planilha Excel (.xlsx ou .xls)
              </p>
              <p className="text-xs text-gray-500 max-w-md">
                Arraste o arquivo da UBS para esta área ou clique para selecionar do computador.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Controles pós-leitura da planilha */}
      {workbook && (
        <>
          {/* Barra de configuração da aba + data padrão + editor de mapeamento */}
          <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
            <div className="p-3.5 flex flex-wrap items-center justify-between gap-3 bg-gray-50 border-b border-gray-200">
              <div className="flex flex-wrap items-center gap-3">
                {sheetNames.length > 1 && (
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-gray-500" />
                    <label className="text-xs font-bold text-gray-700">Aba:</label>
                    <select
                      value={selectedSheet}
                      onChange={(e) => loadSheetIntoState(workbook, e.target.value)}
                      className="bg-white border border-gray-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-gray-800"
                    >
                      {sheetNames.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-gray-700">
                    Data padrão (se ausente na linha):
                  </label>
                  <input
                    type="date"
                    value={defaultDataSemeadura}
                    onChange={(e) => handleDefaultDateChange(e.target.value)}
                    className="bg-white border border-gray-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-gray-800"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowMappingEditor((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1b4332] hover:underline cursor-pointer"
              >
                <span>
                  {showMappingEditor
                    ? 'Ocultar Mapeamento de Colunas'
                    : 'Conferir / Ajustar Colunas Reconhecidas'}
                </span>
                {showMappingEditor ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </div>

            {showMappingEditor && (
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 bg-white">
                {FIELD_DEFINITIONS.map((field) => (
                  <div key={field.key}>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      {field.label}
                      {field.required && <span className="text-rose-600"> *</span>}
                    </label>
                    <select
                      value={mapping[field.key] || ''}
                      onChange={(e) => handleMappingChange(field.key, e.target.value)}
                      className={`w-full rounded-lg px-2.5 py-1.5 text-xs border ${
                        mapping[field.key]
                          ? 'bg-[#f0f7f4] border-[#74c69d] font-semibold text-[#1b4332]'
                          : field.required
                          ? 'bg-rose-50 border-rose-300 text-rose-800'
                          : 'bg-gray-50 border-gray-300 text-gray-700'
                      }`}
                    >
                      <option value="">-- Não mapeado --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* KPIs da prévia */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="border border-gray-200 rounded-xl p-3 bg-white">
              <span className="text-[11px] font-semibold text-gray-500 uppercase">
                Total na Planilha
              </span>
              <p className="text-xl font-black text-gray-900 tabular-nums mt-0.5">{stats.total}</p>
            </div>
            <div className="border border-emerald-200 rounded-xl p-3 bg-emerald-50/50">
              <span className="text-[11px] font-semibold text-emerald-800 uppercase">
                Novos Lotes
              </span>
              <p className="text-xl font-black text-emerald-800 tabular-nums mt-0.5">
                {stats.novos}
              </p>
            </div>
            <div className="border border-amber-200 rounded-xl p-3 bg-amber-50/50">
              <span className="text-[11px] font-semibold text-amber-800 uppercase">
                Duplicados Protegidos
              </span>
              <p className="text-xl font-black text-amber-800 tabular-nums mt-0.5">
                {stats.duplicados}
              </p>
            </div>
            <div className="border border-rose-200 rounded-xl p-3 bg-rose-50/50">
              <span className="text-[11px] font-semibold text-rose-800 uppercase">
                Com Erro / Inválidos
              </span>
              <p className="text-xl font-black text-rose-800 tabular-nums mt-0.5">
                {stats.invalidos}
              </p>
            </div>
          </div>

          {/* Filtros da prévia */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'TODOS', label: `Todos (${stats.total})` },
                  { id: 'NOVOS', label: `Novos (${stats.novos})` },
                  { id: 'DUPLICADOS', label: `Duplicados (${stats.duplicados})` },
                  { id: 'INVALIDOS', label: `Inválidos (${stats.invalidos})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPreviewFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    previewFilter === tab.id
                      ? 'bg-[#1b4332] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {stats.duplicados > 0 && (
              <span className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-700" />
                Resultados já lançados e vínculos existentes ficam protegidos por padrão.
              </span>
            )}
          </div>

          {/* Tabela de Prévia */}
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
            <div className="overflow-x-auto max-h-[340px] overflow-y-auto">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-[#1b4332] text-white text-[11px] uppercase sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3">Linha</th>
                    <th className="py-2.5 px-3">Lote</th>
                    <th className="py-2.5 px-3">Cultura / Cultivar</th>
                    <th className="py-2.5 px-3">Cat / Safra</th>
                    <th className="py-2.5 px-3">Canteiro</th>
                    <th className="py-2.5 px-3">Plantio</th>
                    <th className="py-2.5 px-3">Status & Duplicidade</th>
                    <th className="py-2.5 px-3">Ação na Importação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPreviewRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-500">
                        Nenhum registro encontrado neste filtro.
                      </td>
                    </tr>
                  ) : (
                    filteredPreviewRows.map((row) => {
                      const isDupSystem =
                        row.duplicateStatus === 'DUPLICADO_COM_RESULTADOS' ||
                        row.duplicateStatus === 'DUPLICADO_SEM_RESULTADOS';

                      return (
                        <tr
                          key={row.rowIndex}
                          className={
                            row.duplicateStatus === 'INVALIDO'
                              ? 'bg-rose-50/40'
                              : isDupSystem || row.duplicateStatus === 'DUPLICADO_PLANILHA'
                              ? 'bg-amber-50/30'
                              : 'hover:bg-gray-50'
                          }
                        >
                          <td className="py-2.5 px-3 font-semibold text-gray-500 tabular-nums">
                            #{row.rowIndex}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-gray-900">{row.lote || '—'}</span>
                            {row.tsiMatriz && (
                              <span className="block text-[10px] text-gray-500">
                                TSI: {row.tsiMatriz}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-gray-900">{row.cultura || '—'}</span>
                            <span className="block text-[11px] text-gray-500">
                              {row.cultivar || '—'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-gray-800">{row.categoria}</span>
                            <span className="block text-[10px] text-gray-500">{row.safra}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-[#2d6a4f] shrink-0" />
                              <input
                                type="text"
                                list="canteiros-sugeridos-excel"
                                value={row.canteiro}
                                onChange={(e) =>
                                  updateRowField(row.rowIndex, { canteiro: e.target.value })
                                }
                                placeholder="Informar canteiro"
                                disabled={row.action === 'IGNORAR' && row.duplicateStatus !== 'NOVO'}
                                className="w-32 bg-white border border-gray-300 rounded px-2 py-1 text-xs font-medium text-gray-800 disabled:bg-gray-100 disabled:text-gray-400"
                              />
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-gray-700 tabular-nums">
                            {formatDateBR(row.dataSemeadura)}
                          </td>
                          <td className="py-2.5 px-3 space-y-1">
                            {row.duplicateStatus === 'NOVO' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                                <CheckCircle2 className="w-3 h-3" />
                                Novo • PLANTADO – AGUARDANDO LEITURA
                              </span>
                            )}
                            {row.duplicateStatus === 'DUPLICADO_COM_RESULTADOS' && (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                                  <ShieldAlert className="w-3 h-3" />
                                  Já cadastrado ({row.existingProtocolo})
                                </span>
                                <p className="text-[10px] text-gray-600">
                                  {row.existingCanteiro ? `${row.existingCanteiro} • ` : ''}
                                  {row.existingResultsSummary} (resultados protegidos)
                                </p>
                              </div>
                            )}
                            {row.duplicateStatus === 'DUPLICADO_SEM_RESULTADOS' && (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                                  <ShieldAlert className="w-3 h-3" />
                                  Já existe ({row.existingProtocolo})
                                </span>
                                {row.existingCanteiro && (
                                  <p className="text-[10px] text-gray-600">
                                    Vínculo atual: {row.existingCanteiro}
                                  </p>
                                )}
                              </div>
                            )}
                            {row.duplicateStatus === 'DUPLICADO_PLANILHA' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                                <AlertTriangle className="w-3 h-3" />
                                Repetido na planilha
                              </span>
                            )}
                            {row.duplicateStatus === 'INVALIDO' && (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded">
                                  <XCircle className="w-3 h-3" />
                                  Dados inválidos
                                </span>
                                <p className="text-[10px] text-rose-700">
                                  {row.errors.join(' • ')}
                                </p>
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            {row.duplicateStatus === 'NOVO' ? (
                              <select
                                value={row.action}
                                onChange={(e) =>
                                  updateRowField(row.rowIndex, {
                                    action: e.target.value as ParsedExcelRow['action'],
                                  })
                                }
                                className="bg-white border border-gray-300 rounded px-2 py-1 text-xs font-semibold text-gray-800"
                              >
                                <option value="CADASTRAR">Cadastrar Lote</option>
                                <option value="IGNORAR">Ignorar</option>
                              </select>
                            ) : isDupSystem ? (
                              <div className="space-y-1">
                                <select
                                  value={row.action}
                                  onChange={(e) =>
                                    updateRowField(row.rowIndex, {
                                      action: e.target.value as ParsedExcelRow['action'],
                                    })
                                  }
                                  className="bg-white border border-amber-300 rounded px-2 py-1 text-xs font-semibold text-gray-800"
                                >
                                  <option value="IGNORAR">Não duplicar (Ignorar)</option>
                                  <option value="ATUALIZAR_AUTORIZADO">
                                    Autorizar atualização cadastral
                                  </option>
                                </select>
                                {row.action === 'ATUALIZAR_AUTORIZADO' &&
                                  Boolean(row.existingCanteiro) && (
                                    <label className="flex items-center gap-1.5 text-[10px] text-gray-700 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={row.autorizarAlterarVinculo}
                                        onChange={(e) =>
                                          updateRowField(row.rowIndex, {
                                            autorizarAlterarVinculo: e.target.checked,
                                          })
                                        }
                                      />
                                      <span>Alterar vínculo de canteiro</span>
                                    </label>
                                  )}
                              </div>
                            ) : (
                              <span className="text-[11px] font-semibold text-gray-400">
                                Ignorado
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Rodapé de confirmação */}
      <div className="pt-3 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <span className="text-xs text-gray-600">
          {workbook ? (
            <>
              Pronto para confirmar:{' '}
              <strong className="text-[#1b4332] tabular-nums">{stats.aImportar}</strong> novo(s) +{' '}
              <strong className="text-amber-800 tabular-nums">{stats.aAtualizar}</strong>{' '}
              atualização(ões) autorizada(s).
            </>
          ) : (
            'Selecione uma planilha .xlsx ou .xls para visualizar a prévia dos lotes.'
          )}
        </span>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!workbook || isImporting || stats.aImportar + stats.aAtualizar === 0}
            onClick={handleConfirmImport}
            className={`px-5 py-2.5 text-sm font-bold rounded-xl flex items-center gap-2 transition-colors ${
              workbook && !isImporting && stats.aImportar + stats.aAtualizar > 0
                ? 'bg-[#1b4332] hover:bg-[#2d6a4f] text-white cursor-pointer'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isImporting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-[#74c69d]" />
            )}
            <span>
              {isImporting
                ? 'Importando Lotes...'
                : `Confirmar Importação (${stats.aImportar + stats.aAtualizar})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
