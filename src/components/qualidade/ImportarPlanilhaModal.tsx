import React, { useState, useRef } from 'react';
import { 
  X, 
  UploadCloud, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Layers, 
  Check, 
  FileCheck,
  RefreshCw,
  Info
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { storageService } from '../../services/storageService';

interface ImportarPlanilhaModalProps {
  onClose: () => void;
  onSuccess: (importadosCount: number) => void;
}

interface LinhaPlanilhaPreview {
  lote: string;
  cultura: string;
  cultivar: string;
  categoria?: string;
  safra?: string;
  quantidade?: string;
  peneira?: string;
  tsiTratamento?: string;
  dataAnalise?: string;
  dataValidade?: string;
  laboratorio?: string;
  numeroCertificadoLaudo?: string;
  responsavel?: string;
  germinacao?: number;
  vigor?: number;
  pureza?: number;
  umidade?: number;
  observacoes?: string;
  valido: boolean;
  motivoInvalido?: string;
}

export const ImportarPlanilhaModal: React.FC<ImportarPlanilhaModalProps> = ({
  onClose,
  onSuccess,
}) => {
  const [linhasPreview, setLinhasPreview] = useState<LinhaPlanilhaPreview[]>([]);
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  const [isCarregandoArquivo, setIsCarregandoArquivo] = useState(false);
  const [isImportando, setIsImportando] = useState(false);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [resultadoFinal, setResultadoFinal] = useState<{ importados: number; erros: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Download da Planilha Modelo em Excel (.xlsx)
  const handleBaixarModeloExcel = () => {
    const dadosModelo = [
      {
        'Lote': 'L-2026-SRG-115',
        'Cultura': 'Sorgo',
        'Cultivar': 'NUGRAIN 430',
        'Categoria': 'S2',
        'Safra': '2025/2026',
        'Quantidade': '25.000 kg',
        'Peneira': '4.0 mm',
        'TSI_Tratamento': 'TSI Premium Fungicida + Inseticida',
        'Data_Analise': '2026-07-20',
        'Data_Validade': '2027-01-20',
        'Laboratorio': 'Laboratório Central CQ',
        'Numero_Certificado_Laudo': 'LAUDO-SRG-088/2026',
        'Responsavel_Tecnico': 'Mariana Silva (Qualidade)',
        'Germinacao': 90.0,
        'Vigor': 85.0,
        'Pureza': 99.0,
        'Umidade': 11.0,
        'Observacoes': 'Lote com excelente vigor fisiológico.'
      },
      {
        'Lote': 'L-2026-SOJ-881',
        'Cultura': 'Soja',
        'Cultivar': 'M 8349 IPRO',
        'Categoria': 'C1',
        'Safra': '2025/2026',
        'Quantidade': '40.000 kg',
        'Peneira': '6.5 mm',
        'TSI_Tratamento': 'Inoculante + Fungicida',
        'Data_Analise': '2026-06-15',
        'Data_Validade': '2026-12-15',
        'Laboratorio': 'LAS Uberaba',
        'Numero_Certificado_Laudo': 'CERT-LAS-8812/2026',
        'Responsavel_Tecnico': 'Eng. Roberto Magalhães',
        'Germinacao': 92.0,
        'Vigor': 88.0,
        'Pureza': 99.4,
        'Umidade': 11.2,
        'Observacoes': 'Certificado homologado para comercialização.'
      },
      {
        'Lote': 'L-2026-ALG-088',
        'Cultura': 'Algodão',
        'Cultivar': 'FM 975 GLT',
        'Categoria': 'Básica',
        'Safra': '2025/2026',
        'Quantidade': '12.000 kg',
        'Peneira': '5.5 mm',
        'TSI_Tratamento': 'Deslintada Quimicamente',
        'Data_Analise': '2026-03-05',
        'Data_Validade': '2026-09-05',
        'Laboratorio': 'Lab Biotecnologia & Genética',
        'Numero_Certificado_Laudo': 'CERT-ALG-044/2026',
        'Responsavel_Tecnico': 'Mariana Silva (Qualidade)',
        'Germinacao': 82.0,
        'Vigor': 78.0,
        'Pureza': 98.8,
        'Umidade': 9.4,
        'Observacoes': 'Sementes básicas de alta pureza genética.'
      },
      {
        'Lote': 'L-2026-TRG-504',
        'Cultura': 'Trigo',
        'Cultivar': 'BRS PASTOREIO',
        'Categoria': 'C2',
        'Safra': '2025/2026',
        'Quantidade': '30.000 kg',
        'Peneira': 'Padrão',
        'TSI_Tratamento': 'Sem Tratamento Químico',
        'Data_Analise': '2026-02-01',
        'Data_Validade': '2026-08-01',
        'Laboratorio': 'Laboratório Regional Passo Fundo',
        'Numero_Certificado_Laudo': 'LAUDO-TRG-1190/2026',
        'Responsavel_Tecnico': 'João Pedro (Campo)',
        'Germinacao': 84.0,
        'Vigor': 78.0,
        'Pureza': 98.5,
        'Umidade': 12.1,
        'Observacoes': 'Trigo para produção de forragem e grãos.'
      },
      {
        'Lote': 'L-2026-MIL-402',
        'Cultura': 'Milho',
        'Cultivar': 'SYN 3939 VIP3',
        'Categoria': 'S1',
        'Safra': '2025/2026',
        'Quantidade': '18.000 kg',
        'Peneira': 'M20',
        'TSI_Tratamento': 'Fortenza Duo + Cruiser',
        'Data_Analise': '2026-07-15',
        'Data_Validade': '2027-01-15',
        'Laboratorio': 'Laboratório Central CQ',
        'Numero_Certificado_Laudo': 'CQ-MIL-001/2026-REAN',
        'Responsavel_Tecnico': 'Mariana Silva (Qualidade)',
        'Germinacao': 90.0,
        'Vigor': 85.0,
        'Pureza': 99.2,
        'Umidade': 11.2,
        'Observacoes': 'Lote com tratamento industrial completo.'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(dadosModelo);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Lotes_Qualidade');
    XLSX.writeFile(workbook, 'Modelo_Importacao_Qualidade_Lotes.xlsx');
  };

  // Processar arquivo Excel / CSV selecionado
  const processarArquivo = async (file: File) => {
    setIsCarregandoArquivo(true);
    setErroGeral(null);
    setNomeArquivo(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

      if (!rawData || rawData.length === 0) {
        setErroGeral('A planilha selecionada está vazia.');
        setLinhasPreview([]);
        setIsCarregandoArquivo(false);
        return;
      }

      // Função auxiliar para achar valor por chaves possíveis
      const acharCampo = (row: Record<string, any>, nomesPossiveis: string[]): any => {
        const rowKeys = Object.keys(row);
        for (const nome of nomesPossiveis) {
          const nomeNorm = nome.toLowerCase().replace(/[^a-z0-9]/g, '');
          const matchKey = rowKeys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === nomeNorm);
          if (matchKey && row[matchKey] !== undefined && row[matchKey] !== '') {
            return row[matchKey];
          }
        }
        return undefined;
      };

      const parseNumber = (val: any): number | undefined => {
        if (val === undefined || val === null || val === '') return undefined;
        if (typeof val === 'number') return val;
        const s = String(val).replace(',', '.').replace(/[^0-9.-]/g, '');
        const n = parseFloat(s);
        return isNaN(n) ? undefined : n;
      };

      const parseDate = (val: any): string | undefined => {
        if (!val) return undefined;
        if (val instanceof Date && !isNaN(val.getTime())) {
          return val.toISOString().split('T')[0];
        }
        const s = String(val).trim();
        // Se formato DD/MM/YYYY
        if (s.includes('/')) {
          const parts = s.split('/');
          if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            let year = parts[2];
            if (year.length === 2) year = `20${year}`;
            return `${year}-${month}-${day}`;
          }
        }
        // Se YYYY-MM-DD
        if (s.match(/^\d{4}-\d{2}-\d{2}$/)) {
          return s;
        }
        return s;
      };

      const parsedRows: LinhaPlanilhaPreview[] = rawData.map(row => {
        const lote = acharCampo(row, ['Lote', 'Codigo', 'Codigo_Lote', 'Identificacao_Lote', 'Numero_Lote']);
        const cultura = acharCampo(row, ['Cultura', 'Especie']);
        const cultivar = acharCampo(row, ['Cultivar', 'Variedade', 'Hibrido']);
        const categoria = acharCampo(row, ['Categoria', 'Cat']);
        const safra = acharCampo(row, ['Safra', 'Ano']);
        const quantidade = acharCampo(row, ['Quantidade', 'Qtd', 'Volume', 'Peso']);
        const peneira = acharCampo(row, ['Peneira', 'Classificacao']);
        const tsiTratamento = acharCampo(row, ['TSI_Tratamento', 'Tratamento', 'TSI', 'Tratamento_Sementes']);
        const dataAnalise = parseDate(acharCampo(row, ['Data_Analise', 'DataAnalise', 'Data']));
        const dataValidade = parseDate(acharCampo(row, ['Data_Validade', 'DataValidade', 'Validade', 'Validade_Legal']));
        const laboratorio = acharCampo(row, ['Laboratorio', 'Lab', 'LAS']);
        const numeroCertificadoLaudo = acharCampo(row, ['Numero_Certificado_Laudo', 'Certificado', 'Laudo', 'Numero_Documento']);
        const responsavel = acharCampo(row, ['Responsavel_Tecnico', 'Responsavel', 'RT', 'Agronomo']);
        const germinacao = parseNumber(acharCampo(row, ['Germinacao', 'Germ', 'G%']));
        const vigor = parseNumber(acharCampo(row, ['Vigor', 'V%']));
        const pureza = parseNumber(acharCampo(row, ['Pureza', 'Pureza_Fisica', 'P%']));
        const umidade = parseNumber(acharCampo(row, ['Umidade', 'Teor_Umidade', 'U%']));
        const observacoes = acharCampo(row, ['Observacoes', 'Obs', 'Notas']);

        let valido = true;
        let motivoInvalido: string | undefined = undefined;

        if (!lote || !String(lote).trim()) {
          valido = false;
          motivoInvalido = 'Código do lote ausente';
        } else if (!cultura || !String(cultura).trim()) {
          valido = false;
          motivoInvalido = 'Cultura ausente';
        }

        return {
          lote: String(lote || '').trim().toUpperCase(),
          cultura: String(cultura || '').trim(),
          cultivar: String(cultivar || 'Padrão').trim(),
          categoria: categoria ? String(categoria).trim() : 'S2',
          safra: safra ? String(safra).trim() : '2025/2026',
          quantidade: quantidade ? String(quantidade).trim() : '',
          peneira: peneira ? String(peneira).trim() : '',
          tsiTratamento: tsiTratamento ? String(tsiTratamento).trim() : '',
          dataAnalise,
          dataValidade,
          laboratorio: laboratorio ? String(laboratorio).trim() : undefined,
          numeroCertificadoLaudo: numeroCertificadoLaudo ? String(numeroCertificadoLaudo).trim() : undefined,
          responsavel: responsavel ? String(responsavel).trim() : undefined,
          germinacao,
          vigor,
          pureza,
          umidade,
          observacoes: observacoes ? String(observacoes).trim() : undefined,
          valido,
          motivoInvalido,
        };
      });

      setLinhasPreview(parsedRows);
    } catch (err: any) {
      console.error('Erro ao ler planilha:', err);
      setErroGeral(`Erro ao abrir planilha: ${err.message || 'Arquivo corrompido ou formato não suportado.'}`);
    } finally {
      setIsCarregandoArquivo(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processarArquivo(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processarArquivo(file);
    }
  };

  // Confirmar Importação
  const handleConfirmarImportacao = async () => {
    const validas = linhasPreview.filter(l => l.valido);
    if (validas.length === 0) {
      setErroGeral('Nenhuma linha válida encontrada para importação.');
      return;
    }

    setIsImportando(true);
    setErroGeral(null);

    try {
      const res = await storageService.importarLotesEmMassa(validas);
      setResultadoFinal(res);
      if (res.importados > 0) {
        onSuccess(res.importados);
      }
    } catch (err: any) {
      setErroGeral(`Falha na importação: ${err.message || 'Erro inesperado'}`);
    } finally {
      setIsImportando(false);
    }
  };

  const totalValidas = linhasPreview.filter(l => l.valido).length;
  const totalInvalidas = linhasPreview.filter(l => !l.valido).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-lg shadow-sm">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Importar e Anexar Planilha de Lotes & Análises
              </h3>
              <p className="text-xs text-gray-500">
                Importe planilhas (.xlsx, .xls, .csv) com lotes, culturas (Sorgo, Soja, Milho, Trigo, Algodão), laudos e testes de germinação/vigor.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleBaixarModeloExcel}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-lg hover:bg-emerald-100 transition shadow-sm"
              title="Baixar modelo em Excel com colunas e exemplos"
            >
              <Download className="w-4 h-4 mr-1.5" />
              Baixar Planilha Modelo (.xlsx)
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* Sucesso Final */}
          {resultadoFinal && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-center space-x-2 text-emerald-800 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>Importação Concluída com Sucesso!</span>
              </div>
              <p className="text-emerald-700 text-xs">
                Foram importados <strong>{resultadoFinal.importados}</strong> lote(s) e análises para o banco de dados.
              </p>
              {resultadoFinal.erros.length > 0 && (
                <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-200 text-amber-800 text-[11px]">
                  <strong>Avisos durante a importação:</strong>
                  <ul className="list-disc list-inside mt-1">
                    {resultadoFinal.erros.map((e, idx) => (
                      <li key={idx}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {erroGeral && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{erroGeral}</span>
            </div>
          )}

          {/* Área de Upload / Drag & Drop */}
          {!linhasPreview.length ? (
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 hover:border-emerald-500 bg-gray-50 hover:bg-emerald-50/40 p-10 rounded-xl text-center cursor-pointer transition flex flex-col items-center justify-center space-y-3"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="p-3 bg-emerald-100 text-emerald-800 rounded-full">
                <UploadCloud className="w-8 h-8" />
              </div>
              <div>
                <p className="font-bold text-gray-800 text-sm">
                  Arraste e solte sua planilha aqui ou clique para selecionar
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  Formatos aceitos: Excel (.xlsx, .xls) ou CSV (.csv)
                </p>
              </div>

              <div className="pt-2 flex items-center space-x-2 text-[11px] text-gray-400">
                <Info className="w-4 h-4 text-gray-400" />
                <span>Colunas reconhecidas automaticamente: Lote, Cultura, Cultivar, Categoria, Safra, Germinação, Vigor, Pureza, Umidade...</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Barra de Status do Arquivo Carregado */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gray-100 rounded-xl border border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-emerald-700 text-white rounded-lg">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-gray-900 text-xs block">{nomeArquivo}</span>
                    <span className="text-[11px] text-gray-500">
                      Total de linhas identificadas: <strong>{linhasPreview.length}</strong> (
                      <span className="text-emerald-700 font-semibold">{totalValidas} válidas</span>,{' '}
                      <span className="text-rose-600 font-semibold">{totalInvalidas} inválidas</span>)
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setLinhasPreview([]);
                      setNomeArquivo(null);
                      setResultadoFinal(null);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    Trocar Planilha
                  </button>
                  <button
                    onClick={handleConfirmarImportacao}
                    disabled={isImportando || totalValidas === 0}
                    className="inline-flex items-center px-4 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition shadow disabled:opacity-50"
                  >
                    <Check className="w-4 h-4 mr-1.5" />
                    {isImportando ? 'Importando Lotes...' : `Importar ${totalValidas} Lote(s)`}
                  </button>
                </div>
              </div>

              {/* Tabela de Pré-visualização */}
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="max-h-[350px] overflow-y-auto">
                  <table className="w-full text-left text-xs divide-y divide-gray-200">
                    <thead className="bg-gray-50 text-gray-700 font-semibold sticky top-0 z-10">
                      <tr>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5">Lote</th>
                        <th className="p-2.5">Cultura / Cultivar</th>
                        <th className="p-2.5 text-center">Cat.</th>
                        <th className="p-2.5 text-center">Safra</th>
                        <th className="p-2.5 text-center">Germ.</th>
                        <th className="p-2.5 text-center">Vigor</th>
                        <th className="p-2.5 text-center">Pureza</th>
                        <th className="p-2.5 text-center">Umid.</th>
                        <th className="p-2.5 text-center">Data Análise</th>
                        <th className="p-2.5 text-center">Validade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {linhasPreview.map((row, idx) => (
                        <tr
                          key={idx}
                          className={`hover:bg-gray-50/80 transition ${
                            !row.valido ? 'bg-rose-50/40 text-gray-400' : ''
                          }`}
                        >
                          <td className="p-2.5">
                            {row.valido ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Válido
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800"
                                title={row.motivoInvalido}
                              >
                                <XCircle className="w-3 h-3 mr-1" /> {row.motivoInvalido || 'Erro'}
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 font-bold font-mono text-gray-900">{row.lote || '-'}</td>
                          <td className="p-2.5">
                            <span className="font-semibold text-emerald-800">{row.cultura}</span> • {row.cultivar}
                          </td>
                          <td className="p-2.5 text-center">
                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded font-bold text-[10px]">
                              {row.categoria || 'S2'}
                            </span>
                          </td>
                          <td className="p-2.5 text-center text-gray-700">{row.safra || '-'}</td>
                          <td className="p-2.5 text-center font-bold text-emerald-900">
                            {row.germinacao !== undefined ? `${row.germinacao}%` : '-'}
                          </td>
                          <td className="p-2.5 text-center font-semibold text-gray-800">
                            {row.vigor !== undefined ? `${row.vigor}%` : '-'}
                          </td>
                          <td className="p-2.5 text-center text-gray-700">
                            {row.pureza !== undefined ? `${row.pureza}%` : '-'}
                          </td>
                          <td className="p-2.5 text-center text-gray-700">
                            {row.umidade !== undefined ? `${row.umidade}%` : '-'}
                          </td>
                          <td className="p-2.5 text-center text-gray-600">{row.dataAnalise || 'Hoje'}</td>
                          <td className="p-2.5 text-center text-gray-900 font-medium">
                            {row.dataValidade || 'Automática'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50 text-xs">
          <span className="text-gray-500 text-[11px]">
            A importação cria automaticamente o histórico de rastreabilidade e termos de conformidade para sementes S1/S2.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition shadow-sm"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
