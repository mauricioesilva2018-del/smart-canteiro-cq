import * as XLSX from 'xlsx';
import { Amostra, Avaliacao, SituacaoAmostra } from '../types';
import { getTodayBR } from './dateUtils';

export type CampoSistemaAmostragem =
  | 'lote'
  | 'cultura'
  | 'cultivar'
  | 'categoria'
  | 'safra'
  | 'canteiro'
  | 'protocolo'
  | 'peneira'
  | 'tsiMatriz'
  | 'dataSemeadura'
  | 'quantidadeSementes'
  | 'responsavel'
  | 'observacoes';

export type ColumnMappingCanteiro = Partial<Record<CampoSistemaAmostragem, string>>;

export type DuplicateStatusImport =
  | 'NOVO'
  | 'DUPLICADO_SEM_RESULTADOS'
  | 'DUPLICADO_COM_RESULTADOS'
  | 'DUPLICADO_PLANILHA'
  | 'INVALIDO';

export type ImportRowAction = 'CADASTRAR' | 'IGNORAR' | 'ATUALIZAR_AUTORIZADO';

export interface ParsedExcelRow {
  rowIndex: number; // 1-indexed line in spreadsheet
  lote: string;
  protocolo: string;
  cultura: string;
  cultivar: string;
  categoria: string;
  safra: string;
  canteiro: string;
  peneira: string;
  tsiMatriz: string;
  dataSemeadura: string;
  quantidadeSementes: number;
  responsavel: string;
  observacoes: string;
  situacaoInicial: SituacaoAmostra;
  duplicateStatus: DuplicateStatusImport;
  existingAmostraId?: string;
  existingProtocolo?: string;
  existingCanteiro?: string;
  existingHasResults: boolean;
  existingResultsSummary?: string;
  action: ImportRowAction;
  autorizarAlterarVinculo: boolean;
  errors: string[];
  warnings: string[];
  rawRow: Record<string, any>;
}

export interface SheetParseResult {
  sheetName: string;
  headerRowIndex: number;
  headers: string[];
  mapping: ColumnMappingCanteiro;
  rawRows: Record<string, any>[];
}

export const FIELD_DEFINITIONS: Array<{
  key: CampoSistemaAmostragem;
  label: string;
  required?: boolean;
}> = [
  { key: 'lote', label: 'Código do Lote', required: true },
  { key: 'cultura', label: 'Cultura', required: true },
  { key: 'cultivar', label: 'Cultivar / Variedade', required: true },
  { key: 'categoria', label: 'Categoria' },
  { key: 'safra', label: 'Safra' },
  { key: 'canteiro', label: 'Canteiro / Localização' },
  { key: 'protocolo', label: 'Protocolo' },
  { key: 'peneira', label: 'Peneira' },
  { key: 'tsiMatriz', label: 'Matriz / TSI' },
  { key: 'dataSemeadura', label: 'Data de Plantio / Semeadura' },
  { key: 'quantidadeSementes', label: 'Qtd. Sementes' },
  { key: 'responsavel', label: 'Responsável' },
  { key: 'observacoes', label: 'Observações' },
];

const HEADER_ALIASES: Record<CampoSistemaAmostragem, string[]> = {
  lote: [
    'lote',
    'numero do lote',
    'n do lote',
    'n lote',
    'no lote',
    'codigo do lote',
    'cod lote',
    'codigo lote',
    'id lote',
    'lote semente',
    'lot',
  ],
  cultura: ['cultura', 'especie', 'crop', 'tipo cultura'],
  cultivar: [
    'cultivar',
    'variedade',
    'cultivar / variedade',
    'cultivar variedade',
    'hibrido',
    'material',
  ],
  categoria: ['categoria', 'cat', 'classe', 'classificacao', 'category'],
  safra: ['safra', 'ano safra', 'colheita', 'harvest', 'season'],
  canteiro: [
    'canteiro',
    'nome do canteiro',
    'cod canteiro',
    'codigo canteiro',
    'canteiros',
    'leito',
    'bloco',
    'quadra',
    'localizacao',
    'local',
    'box',
    'parcela',
    'setor',
  ],
  protocolo: ['protocolo', 'numero do protocolo', 'n protocolo', 'cod protocolo'],
  peneira: ['peneira', 'pen', 'tamis', 'classificacao peneira'],
  tsiMatriz: [
    'matriz / tsi',
    'matriz/tsi',
    'matriz tsi',
    'tsi / matriz',
    'tsi matriz',
    'tsi',
    'tratamento',
    'tratamento tsi',
    'matriz',
  ],
  dataSemeadura: [
    'data semeadura',
    'data de semeadura',
    'data plantio',
    'data de plantio',
    'data lancamento',
    'data de lancamento',
    'lancamento',
    'semeadura',
    'plantio',
    'inicio teste',
    'inicio do teste',
    'data',
  ],
  quantidadeSementes: [
    'quantidade sementes',
    'qtd sementes',
    'qtde sementes',
    'amostra sementes',
    'sementes',
    'qtd',
  ],
  responsavel: ['responsavel', 'operador', 'avaliador', 'tecnico'],
  observacoes: ['observacoes', 'observacao', 'obs', 'notas', 'comentarios'],
};

export function normalizeHeaderText(val: string): string {
  return String(val || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[º°ª]/g, '')
    .replace(/[^a-z0-9/\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeLoteCode(lote: string): string {
  return String(lote || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

export function normalizeCanteiroName(
  rawCanteiro: string,
  existingCanteiros: string[] = []
): string {
  const clean = String(rawCanteiro || '').trim().replace(/\s+/g, ' ');
  if (!clean) return '';

  const targetNorm = normalizeHeaderText(clean);
  const existingExact = existingCanteiros.find(
    (c) => normalizeHeaderText(c) === targetNorm
  );
  if (existingExact) return existingExact;

  // Match short numeric/code forms like "A-01" or "1" against existing "Canteiro A-01"
  const existingPrefixed = existingCanteiros.find((c) => {
    const cNorm = normalizeHeaderText(c).replace(/^canteiro\s+/, '');
    const tNorm = targetNorm.replace(/^canteiro\s+/, '');
    return cNorm === tNorm;
  });
  if (existingPrefixed) return existingPrefixed;

  return clean;
}

export function normalizeCategoria(rawCat: string): string {
  const clean = String(rawCat || '').trim();
  if (!clean) return 'C1';
  const norm = normalizeHeaderText(clean);
  if (norm === 'c1' || norm.includes('certificada 1')) return 'C1';
  if (norm === 'c2' || norm.includes('certificada 2')) return 'C2';
  if (norm === 's1' || norm.includes('semente 1')) return 'S1';
  if (norm === 's2' || norm.includes('semente 2')) return 'S2';
  if (norm.includes('basic')) return 'Básica';
  if (norm.includes('genet')) return 'Genética';
  return clean;
}

export function normalizeCultura(rawCultura: string): string {
  const clean = String(rawCultura || '').trim();
  if (!clean) return '';
  const norm = normalizeHeaderText(clean);
  if (norm === 'soja' || norm === 'soybean') return 'Soja';
  if (norm === 'milho' || norm === 'corn') return 'Milho';
  if (norm === 'sorgo' || norm === 'sorghum') return 'Sorgo';
  if (norm === 'algodao' || norm === 'cotton') return 'Algodão';
  if (norm === 'feijao' || norm === 'bean') return 'Feijão';
  if (norm === 'trigo' || norm === 'wheat') return 'Trigo';
  if (norm === 'girassol') return 'Girassol';
  if (norm === 'milheto') return 'Milheto';
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * Converte valores de data vindos do Excel (Date, Serial Excel, DD/MM/YYYY, YYYY-MM-DD)
 * para o formato padrão YYYY-MM-DD.
 */
export function parseExcelDateToISO(value: any, fallbackDate: string = getTodayBR()): string {
  if (value === undefined || value === null || value === '') return fallbackDate;

  if (value instanceof Date && !isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  if (typeof value === 'number' && value > 20000 && value < 90000) {
    // Excel serial date (epoch 1899-12-30)
    const utcDays = Math.floor(value - 25569);
    const utcValue = utcDays * 86400 * 1000;
    const dateInfo = new Date(utcValue);
    if (!isNaN(dateInfo.getTime())) {
      const year = dateInfo.getUTCFullYear();
      const month = String(dateInfo.getUTCMonth() + 1).padStart(2, '0');
      const day = String(dateInfo.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  const str = String(value).trim();
  if (!str) return fallbackDate;

  // YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const brMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (brMatch) {
    const [, d, m, yRaw] = brMatch;
    const y = yRaw.length === 2 ? `20${yRaw}` : yRaw;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return fallbackDate;
}

/**
 * Detecta automaticamente a linha de cabeçalho dentre as 10 primeiras linhas da planilha
 * e mapeia os cabeçalhos para os campos do sistema.
 */
export function autoMapColumns(headers: string[]): ColumnMappingCanteiro {
  const mapping: ColumnMappingCanteiro = {};
  const usedHeaders = new Set<string>();

  // 1. Exact alias match pass
  (Object.keys(HEADER_ALIASES) as CampoSistemaAmostragem[]).forEach((field) => {
    const aliases = HEADER_ALIASES[field];
    const match = headers.find((header) => {
      if (usedHeaders.has(header)) return false;
      const norm = normalizeHeaderText(header);
      return aliases.includes(norm);
    });
    if (match) {
      mapping[field] = match;
      usedHeaders.add(match);
    }
  });

  // 2. Partial contains match pass for remaining unmapped fields
  (Object.keys(HEADER_ALIASES) as CampoSistemaAmostragem[]).forEach((field) => {
    if (mapping[field]) return;
    const aliases = HEADER_ALIASES[field];
    const match = headers.find((header) => {
      if (usedHeaders.has(header)) return false;
      const norm = normalizeHeaderText(header);
      if (!norm) return false;
      return aliases.some((alias) => norm.includes(alias) || (alias.length >= 4 && alias.includes(norm)));
    });
    if (match) {
      mapping[field] = match;
      usedHeaders.add(match);
    }
  });

  return mapping;
}

function detectHeaderRowAndExtract(sheet: XLSX.WorkSheet): {
  headerRowIndex: number;
  headers: string[];
  rawRows: Record<string, any>[];
} {
  const matrix = XLSX.utils.sheet_to_json<any[]>(sheet, {
    header: 1,
    defval: '',
    raw: true,
  });

  if (!matrix || matrix.length === 0) {
    return { headerRowIndex: 0, headers: [], rawRows: [] };
  }

  let bestRowIndex = 0;
  let bestScore = -1;
  const maxScan = Math.min(matrix.length, 10);

  for (let r = 0; r < maxScan; r++) {
    const row = matrix[r];
    if (!Array.isArray(row)) continue;
    const cells = row.map((c) => String(c ?? '').trim()).filter(Boolean);
    if (cells.length === 0) continue;

    const mapping = autoMapColumns(cells);
    let score = Object.keys(mapping).length * 3;
    if (mapping.lote) score += 5;
    if (mapping.cultura) score += 3;
    if (mapping.cultivar) score += 3;
    if (mapping.canteiro) score += 3;

    if (score > bestScore) {
      bestScore = score;
      bestRowIndex = r;
    }
  }

  const headerRow = matrix[bestRowIndex] || [];
  const headers: string[] = [];
  const seenHeaders = new Map<string, number>();

  headerRow.forEach((cell, idx) => {
    let label = String(cell ?? '').trim();
    if (!label) label = `Coluna_${idx + 1}`;
    const count = seenHeaders.get(label) || 0;
    seenHeaders.set(label, count + 1);
    headers.push(count > 0 ? `${label} (${count + 1})` : label);
  });

  const rawRows: Record<string, any>[] = [];
  for (let r = bestRowIndex + 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!Array.isArray(row)) continue;
    const hasContent = row.some((c) => c !== undefined && c !== null && String(c).trim() !== '');
    if (!hasContent) continue;

    const obj: Record<string, any> = {};
    headers.forEach((h, cIdx) => {
      obj[h] = row[cIdx];
    });
    obj.__excelRowNumber = r + 1;
    rawRows.push(obj);
  }

  // Filter out placeholder unnamed empty headers if no row has data under them
  const activeHeaders = headers.filter((h) => {
    if (!h.startsWith('Coluna_')) return true;
    return rawRows.some((row) => String(row[h] ?? '').trim() !== '');
  });

  return {
    headerRowIndex: bestRowIndex,
    headers: activeHeaders,
    rawRows,
  };
}

export function parseExcelWorkbookBuffer(buffer: ArrayBuffer): {
  sheetNames: string[];
  workbook: XLSX.WorkBook;
} {
  const data = new Uint8Array(buffer);
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });
  return {
    sheetNames: workbook.SheetNames || [],
    workbook,
  };
}

export function extractSheetData(
  workbook: XLSX.WorkBook,
  sheetName: string
): SheetParseResult {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    return {
      sheetName,
      headerRowIndex: 0,
      headers: [],
      mapping: {},
      rawRows: [],
    };
  }

  const { headerRowIndex, headers, rawRows } = detectHeaderRowAndExtract(sheet);
  const mapping = autoMapColumns(headers);

  return {
    sheetName,
    headerRowIndex,
    headers,
    mapping,
    rawRows,
  };
}

export function buildParsedExcelPreview(
  rawRows: Record<string, any>[],
  mapping: ColumnMappingCanteiro,
  existingAmostras: Amostra[],
  existingAvaliacoes: Avaliacao[],
  options: {
    defaultDataSemeadura?: string;
    defaultResponsavel?: string;
    existingCanteiros?: string[];
  } = {}
): ParsedExcelRow[] {
  const defaultDate = options.defaultDataSemeadura || getTodayBR();
  const defaultResp = options.defaultResponsavel || 'Operador';
  const existingCanteiros =
    options.existingCanteiros ||
    Array.from(
      new Set(
        existingAmostras
          .map((a) => (a.canteiro || '').trim())
          .filter(Boolean)
      )
    );

  // Build quick lookup of existing lots
  const existingByLote = new Map<string, Amostra>();
  existingAmostras.forEach((a) => {
    const key = normalizeLoteCode(a.lote);
    if (key && !existingByLote.has(key)) {
      existingByLote.set(key, a);
    }
  });

  const seenInSheet = new Set<string>();

  return rawRows.map((rawRow, idx) => {
    const rowIndex = Number(rawRow.__excelRowNumber || idx + 2);
    const getVal = (field: CampoSistemaAmostragem): any => {
      const colName = mapping[field];
      return colName ? rawRow[colName] : undefined;
    };

    const lote = String(getVal('lote') ?? '').trim();
    const loteNorm = normalizeLoteCode(lote);
    const cultura = normalizeCultura(String(getVal('cultura') ?? ''));
    const cultivar = String(getVal('cultivar') ?? '').trim();
    const categoria = normalizeCategoria(String(getVal('categoria') ?? 'C1'));
    const safra = String(getVal('safra') ?? '').trim() || '2025/2026';
    const rawCanteiro = String(getVal('canteiro') ?? '').trim();
    const canteiro = normalizeCanteiroName(rawCanteiro, existingCanteiros);
    const protocolo = String(getVal('protocolo') ?? '').trim();
    const peneira = String(getVal('peneira') ?? '').trim() || 'N/A';
    const tsiMatriz = String(getVal('tsiMatriz') ?? '').trim();
    const dataSemeadura = parseExcelDateToISO(getVal('dataSemeadura'), defaultDate);
    const rawQtd = Number(getVal('quantidadeSementes'));
    const quantidadeSementes = !isNaN(rawQtd) && rawQtd > 0 ? Math.round(rawQtd) : 100;
    const responsavel = String(getVal('responsavel') ?? '').trim() || defaultResp;
    const observacoes = String(getVal('observacoes') ?? '').trim();

    const errors: string[] = [];
    const warnings: string[] = [];

    if (!lote) errors.push('Código do lote obrigatório');
    if (!cultura) errors.push('Cultura não identificada');
    if (!cultivar) errors.push('Cultivar não identificada');
    if (!canteiro) warnings.push('Canteiro não informado (pode ser vinculado antes de importar)');

    let duplicateStatus: DuplicateStatusImport = 'NOVO';
    let existingAmostraId: string | undefined;
    let existingProtocolo: string | undefined;
    let existingCanteiro: string | undefined;
    let existingHasResults = false;
    let existingResultsSummary: string | undefined;
    let action: ImportRowAction = 'CADASTRAR';

    if (errors.length > 0) {
      duplicateStatus = 'INVALIDO';
      action = 'IGNORAR';
    } else if (loteNorm && seenInSheet.has(loteNorm)) {
      duplicateStatus = 'DUPLICADO_PLANILHA';
      action = 'IGNORAR';
      warnings.push('Lote repetido dentro desta planilha (será ignorado para evitar duplicidade)');
    } else if (loteNorm && existingByLote.has(loteNorm)) {
      const existing = existingByLote.get(loteNorm)!;
      existingAmostraId = existing.id;
      existingProtocolo = existing.protocolo;
      existingCanteiro = existing.canteiro || '';

      const avaliacoesLote = existingAvaliacoes.filter(
        (av) =>
          av.amostraId === existing.id ||
          (av.loteId && normalizeLoteCode(av.loteId) === loteNorm)
      );

      const hasLeitura7d = Boolean(
        existing.leitura7diasRealizada || existing.plantulasEmergidas7dias !== undefined
      );
      const hasAvaliacaoResults = avaliacoesLote.some(
        (av) =>
          av.statusTeste === 'concluido' ||
          av.germinacao > 0 ||
          av.fortes > 0 ||
          av.mortas > 0
      );

      existingHasResults = hasLeitura7d || hasAvaliacaoResults || existing.status === 'Concluído';

      if (existingHasResults) {
        const latestAv = avaliacoesLote[avaliacoesLote.length - 1];
        const parts: string[] = [];
        if (existing.plantulasEmergidas7dias !== undefined) {
          parts.push(`7d: ${existing.plantulasEmergidas7dias}%`);
        }
        if (latestAv) {
          parts.push(`Germ: ${latestAv.germinacao}% (${latestAv.resultadoAprovacao})`);
        }
        existingResultsSummary = parts.length > 0 ? parts.join(' • ') : 'Leitura registrada';
        duplicateStatus = 'DUPLICADO_COM_RESULTADOS';
        warnings.push('Lote já possui resultados lançados (resultados serão preservados)');
      } else {
        duplicateStatus = 'DUPLICADO_SEM_RESULTADOS';
        warnings.push('Lote já cadastrado no sistema');
      }

      // Controle de duplicidade: por padrão não duplica nem altera vínculos sem autorização
      action = 'IGNORAR';
    }

    if (loteNorm && errors.length === 0) {
      seenInSheet.add(loteNorm);
    }

    return {
      rowIndex,
      lote,
      protocolo,
      cultura,
      cultivar,
      categoria,
      safra,
      canteiro,
      peneira,
      tsiMatriz,
      dataSemeadura,
      quantidadeSementes,
      responsavel,
      observacoes,
      situacaoInicial: 'PLANTADO – AGUARDANDO LEITURA',
      duplicateStatus,
      existingAmostraId,
      existingProtocolo,
      existingCanteiro,
      existingHasResults,
      existingResultsSummary,
      action,
      autorizarAlterarVinculo: false,
      errors,
      warnings,
      rawRow,
    };
  });
}

export function gerarPlanilhaModeloCanteiros() {
  const modeloRows = [
    {
      Lote: 'L-2026-SOJ-950',
      Cultura: 'Soja',
      Cultivar: 'BRASMAX FIBRA IPRO',
      Categoria: 'C1',
      Safra: '2025/2026',
      Canteiro: 'Canteiro A-01',
      Peneira: '6.5',
      'Matriz / TSI': 'Seedcorp / TSI Maxim Advanced',
      'Data de Plantio': getTodayBR(),
      'Qtd Sementes': 100,
      Responsável: 'Operador UBS',
      Observações: 'Lote plantado para leitura de emergência 7d/10d',
    },
    {
      Lote: 'L-2026-MIL-512',
      Cultura: 'Milho',
      Cultivar: 'DKB 390 PRO3',
      Categoria: 'S1',
      Safra: '2025/2026',
      Canteiro: 'Canteiro B-03',
      Peneira: 'R2L',
      'Matriz / TSI': 'TSI Fortenza Duo',
      'Data de Plantio': getTodayBR(),
      'Qtd Sementes': 100,
      Responsável: 'Operador UBS',
      Observações: '',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(modeloRows);
  ws['!cols'] = [
    { wch: 18 },
    { wch: 12 },
    { wch: 24 },
    { wch: 12 },
    { wch: 14 },
    { wch: 18 },
    { wch: 10 },
    { wch: 28 },
    { wch: 16 },
    { wch: 14 },
    { wch: 18 },
    { wch: 36 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Lotes_Canteiros');
  XLSX.writeFile(wb, 'Modelo_Importacao_Amostragens_Canteiro.xlsx');
}
