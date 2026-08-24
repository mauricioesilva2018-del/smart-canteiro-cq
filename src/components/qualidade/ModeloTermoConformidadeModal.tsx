import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  Download, 
  Save, 
  Building2, 
  CheckCircle2, 
  Eye, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { ConfiguracaoTermoConformidade } from '../../types';
import { storageService } from '../../services/storageService';
import { termoConformidadeService } from '../../services/termoConformidadeService';

interface ModeloTermoConformidadeModalProps {
  onClose: () => void;
  onSaved?: () => void;
}

export const ModeloTermoConformidadeModal: React.FC<ModeloTermoConformidadeModalProps> = ({
  onClose,
  onSaved,
}) => {
  const [config, setConfig] = useState<ConfiguracaoTermoConformidade>(
    storageService.getConfigTermoConformidade()
  );
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    setConfig(storageService.getConfigTermoConformidade());
  }, []);

  const handleSalvarConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await storageService.saveConfigTermoConformidade(config);
      setSucesso(true);
      setTimeout(() => setSucesso(false), 3000);
      if (onSaved) onSaved();
    } catch (e) {
      console.error(e);
    } finally {
      setSalvando(false);
    }
  };

  const handleBaixarModelo = () => {
    termoConformidadeService.baixarModeloExemploPDF(config);
  };

  const handleVisualizarModelo = () => {
    const doc = termoConformidadeService.gerarModeloExemploPDF(config);
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-lg shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-gray-900">
                  Modelo Oficial do Termo de Conformidade (MAPA)
                </h3>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full">
                  Lei 10.711/2003 • Decreto 10.586/2020
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Padrão regulamentar emitido pelo produtor/beneficiador para sementes S1 e S2, com validade legal e rastreabilidade.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleVisualizarModelo}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition shadow-sm"
              title="Abrir prévia em PDF"
            >
              <Eye className="w-4 h-4 mr-1 text-gray-600" />
              Visualizar PDF
            </button>
            <button
              onClick={handleBaixarModelo}
              className="inline-flex items-center px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition shadow-sm"
              title="Baixar Modelo em PDF"
            >
              <Download className="w-4 h-4 mr-1.5" />
              Baixar Modelo PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Tabs & Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {sucesso && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center space-x-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span className="font-semibold">Configurações e dados do Termo de Conformidade salvos com sucesso!</span>
            </div>
          )}

          {/* 1. VISÃO PRÉVIA E ESTRUTURA DO MODELO */}
          <div className="bg-gradient-to-r from-emerald-900 to-teal-950 text-white p-5 rounded-xl shadow-sm space-y-3">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h4 className="text-sm font-bold tracking-tight">Estrutura do Termo de Conformidade Oficial</h4>
            </div>
            <p className="text-xs text-emerald-100 leading-relaxed">
              O Termo de Conformidade é o documento formal expedido pelo produtor de sementes (RENASEM), sob responsabilidade técnica de Engenheiro Agrônomo credenciado, atestando que o lote foi submetido a rigorosos testes de qualidade física, pureza e germinação em conformidade com as regras MAPA.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 text-[11px]">
              <div className="bg-white/10 p-2.5 rounded-lg backdrop-blur-sm">
                <strong className="block text-emerald-300">1. Identificação</strong>
                <span>Produtor, CNPJ, RENASEM e Endereço</span>
              </div>
              <div className="bg-white/10 p-2.5 rounded-lg backdrop-blur-sm">
                <strong className="block text-emerald-300">2. Lote & Cultura</strong>
                <span>Espécie, Cultivar, Safra, Peneira e Categoria</span>
              </div>
              <div className="bg-white/10 p-2.5 rounded-lg backdrop-blur-sm">
                <strong className="block text-emerald-300">3. Resultados</strong>
                <span>Germinação, Vigor, Pureza, Umidade e Sanidade</span>
              </div>
              <div className="bg-white/10 p-2.5 rounded-lg backdrop-blur-sm">
                <strong className="block text-emerald-300">4. Validade & RT</strong>
                <span>Parecer legal, validade do teste e assinatura do RT</span>
              </div>
            </div>
          </div>

          {/* 2. FORMULÁRIO DE DADOS DA EMPRESA E RESPONSÁVEL TÉCNICO */}
          <form onSubmit={handleSalvarConfig} className="bg-gray-50/80 p-5 rounded-xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-gray-900 flex items-center space-x-2 text-xs">
                <Building2 className="w-4 h-4 text-emerald-700" />
                <span>Personalizar Dados do Produtor / Beneficiador e Responsável Técnico</span>
              </h4>
              <span className="text-[11px] text-gray-500">
                Estes dados serão automaticamente impressos em todos os Termos gerados pelo sistema.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-gray-700 font-semibold mb-1">Razão Social do Produtor / Beneficiador *</label>
                <input
                  type="text"
                  value={config.razaoSocial}
                  onChange={e => setConfig({ ...config, razaoSocial: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-emerald-500 bg-white font-medium"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">CNPJ / CPF *</label>
                <input
                  type="text"
                  value={config.cnpj}
                  onChange={e => setConfig({ ...config, cnpj: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-emerald-500 bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">RENASEM do Produtor *</label>
                <input
                  type="text"
                  value={config.renasem}
                  onChange={e => setConfig({ ...config, renasem: e.target.value })}
                  required
                  placeholder="Ex: MG-09876/2026"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-emerald-500 bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Endereço Completo</label>
                <input
                  type="text"
                  value={config.endereco}
                  onChange={e => setConfig({ ...config, endereco: e.target.value })}
                  placeholder="Ex: Rodovia Agrícola Km 45"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Município / UF</label>
                <input
                  type="text"
                  value={config.cidadeUf}
                  onChange={e => setConfig({ ...config, cidadeUf: e.target.value })}
                  placeholder="Ex: Uberaba - MG"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Responsável Técnico (Eng. Agrônomo) *</label>
                <input
                  type="text"
                  value={config.responsavelTecnico}
                  onChange={e => setConfig({ ...config, responsavelTecnico: e.target.value })}
                  required
                  placeholder="Ex: Dr. Roberto Magalhães"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-emerald-500 bg-white font-medium"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-gray-700 font-semibold mb-1">CREA e RENASEM do RT *</label>
                <input
                  type="text"
                  value={config.creaRenasem}
                  onChange={e => setConfig({ ...config, creaRenasem: e.target.value })}
                  required
                  placeholder="Ex: CREA 12345/D - RENASEM RT-54321"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-emerald-500 bg-white font-mono"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-gray-700 font-semibold mb-1">Texto da Declaração Legal Padrão</label>
                <textarea
                  rows={3}
                  value={config.declaracaoLegal || ''}
                  onChange={e => setConfig({ ...config, declaracaoLegal: e.target.value })}
                  placeholder="Texto oficial impresso no campo de declaração do termo..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-emerald-500 bg-white leading-relaxed"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-200">
              <button
                type="submit"
                disabled={salvando}
                className="inline-flex items-center px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition shadow disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-1.5" />
                {salvando ? 'Salvando Dados...' : 'Salvar Dados do Modelo'}
              </button>
            </div>
          </form>

          {/* 3. PRÉVIA VISUAL DO DOCUMENTO */}
          <div className="border border-gray-300 rounded-xl p-6 bg-white shadow-sm space-y-4">
            <div className="text-center border-b pb-4">
              <div className="inline-block bg-emerald-800 text-white px-4 py-1.5 rounded font-black text-xs uppercase tracking-wider mb-1">
                TERMO DE CONFORMIDADE DE SEMENTES
              </div>
              <p className="text-[10px] text-gray-500">
                EM CONFORMIDADE COM A LEI Nº 10.711/2003 E DECRETO Nº 10.586/2020 (MAPA)
              </p>
            </div>

            {/* Quadro Identificação */}
            <div className="grid grid-cols-2 gap-4 text-[11px] bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div>
                <span className="font-bold text-emerald-900 block mb-1">PRODUTOR / BENEFICIADOR:</span>
                <p><strong>{config.razaoSocial}</strong></p>
                <p className="text-gray-600">CNPJ: {config.cnpj} • RENASEM: {config.renasem}</p>
                <p className="text-gray-600">{config.endereco} - {config.cidadeUf}</p>
              </div>
              <div>
                <span className="font-bold text-emerald-900 block mb-1">RESPONSABILIDADE TÉCNICA:</span>
                <p><strong>{config.responsavelTecnico}</strong></p>
                <p className="text-gray-600 font-mono">{config.creaRenasem}</p>
                <p className="text-emerald-700 font-semibold mt-1">Status: Habilitado MAPA / CREA</p>
              </div>
            </div>

            {/* Quadro Exemplo de Testes */}
            <div className="border border-gray-200 rounded-lg overflow-hidden text-[11px]">
              <table className="w-full text-left">
                <thead className="bg-emerald-800 text-white font-bold text-[10px]">
                  <tr>
                    <th className="p-2">TESTE / PARÂMETRO</th>
                    <th className="p-2 text-center">EXIGÊNCIA LEGAL</th>
                    <th className="p-2 text-center">RESULTADO OBTIDO</th>
                    <th className="p-2 text-center">SITUAÇÃO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="bg-white">
                    <td className="p-2 font-semibold">Germinação</td>
                    <td className="p-2 text-center text-gray-500">Mín. 80.0%</td>
                    <td className="p-2 text-center font-black text-emerald-900">90.0%</td>
                    <td className="p-2 text-center"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded">CONFORME</span></td>
                  </tr>
                  <tr className="bg-gray-50/50">
                    <td className="p-2 font-semibold">Vigor (Envelhecimento Acelerado / Frio)</td>
                    <td className="p-2 text-center text-gray-500">Mín. 75.0%</td>
                    <td className="p-2 text-center font-black text-emerald-900">85.0%</td>
                    <td className="p-2 text-center"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded">CONFORME</span></td>
                  </tr>
                  <tr className="bg-white">
                    <td className="p-2 font-semibold">Pureza Física</td>
                    <td className="p-2 text-center text-gray-500">Mín. 98.0%</td>
                    <td className="p-2 text-center font-black text-emerald-900">99.2%</td>
                    <td className="p-2 text-center"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded">CONFORME</span></td>
                  </tr>
                  <tr className="bg-gray-50/50">
                    <td className="p-2 font-semibold">Teor de Umidade</td>
                    <td className="p-2 text-center text-gray-500">Máx. 12.5%</td>
                    <td className="p-2 text-center font-black text-emerald-900">11.2%</td>
                    <td className="p-2 text-center"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded">CONFORME</span></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Declaração Legal */}
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-[11px] text-gray-700 italic">
              "{config.declaracaoLegal || 'Declaro que o lote de sementes atende rigorosamente a todos os padrões de identidade e qualidade estabelecidos pelo Ministério da Agricultura e Pecuária (MAPA).'}"
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50 text-xs">
          <span className="text-gray-500 text-[11px]">
            O arquivo PDF segue o padrão oficial aceito em auditorias agropecuárias e fiscalizações do MAPA.
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
