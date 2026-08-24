import React, { useState } from 'react';
import { X, Plus, Trash2, Save, Settings, ShieldCheck, HelpCircle, Check, AlertCircle } from 'lucide-react';
import { ParametroQualidadeCultura, TipoTesteQualidade } from '../../types';
import { storageService } from '../../services/storageService';

interface ParametrosQualidadeModalProps {
  onClose: () => void;
  onSaved?: () => void;
}

export const ParametrosQualidadeModal: React.FC<ParametrosQualidadeModalProps> = ({
  onClose,
  onSaved,
}) => {
  const [parametrosList, setParametrosList] = useState<ParametroQualidadeCultura[]>(
    storageService.getAllParametrosQualidadeCultura()
  );
  const [selectedCulturaId, setSelectedCulturaId] = useState<string>(
    parametrosList[0]?.id || 'sorgo'
  );
  const [novaCulturaNome, setNovaCulturaNome] = useState('');
  const [showNovaCulturaInput, setShowNovaCulturaInput] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState('');

  const currentParam = parametrosList.find(p => p.id === selectedCulturaId) || parametrosList[0];

  // Adicionar teste à cultura selecionada
  const handleAddTeste = () => {
    if (!currentParam) return;
    const novoTeste: TipoTesteQualidade = {
      id: `t-${currentParam.id}-${Date.now()}`,
      nome: 'Novo Parâmetro / Teste',
      unidade: '%',
      valorMinimo: 80,
      valorMeta: 85,
      tipoComparacao: 'MIN',
      obrigatorio: false,
      ordem: currentParam.testes.length + 1,
    };

    const updated = parametrosList.map(p => {
      if (p.id === currentParam.id) {
        return {
          ...p,
          testes: [...p.testes, novoTeste],
        };
      }
      return p;
    });

    setParametrosList(updated);
  };

  // Remover teste
  const handleRemoveTeste = (testeId: string) => {
    if (!currentParam) return;
    const updated = parametrosList.map(p => {
      if (p.id === currentParam.id) {
        return {
          ...p,
          testes: p.testes.filter(t => t.id !== testeId),
        };
      }
      return p;
    });
    setParametrosList(updated);
  };

  // Atualizar campo de um teste
  const handleUpdateTeste = (testeId: string, campo: keyof TipoTesteQualidade, valor: any) => {
    if (!currentParam) return;
    const updated = parametrosList.map(p => {
      if (p.id === currentParam.id) {
        return {
          ...p,
          testes: p.testes.map(t => {
            if (t.id === testeId) {
              return { ...t, [campo]: valor };
            }
            return t;
          }),
        };
      }
      return p;
    });
    setParametrosList(updated);
  };

  // Atualizar dias de validade ou alerta da cultura
  const handleUpdateCulturaConfig = (campo: 'diasValidadePadrao' | 'diasAlertaVencimentoPadrao', valor: number) => {
    if (!currentParam) return;
    const updated = parametrosList.map(p => {
      if (p.id === currentParam.id) {
        return { ...p, [campo]: valor };
      }
      return p;
    });
    setParametrosList(updated);
  };

  // Adicionar nova cultura
  const handleCriarNovaCultura = () => {
    if (!novaCulturaNome.trim()) return;
    const id = novaCulturaNome.trim().toLowerCase().replace(/\s+/g, '-');
    const existing = parametrosList.find(p => p.id === id);
    if (existing) {
      setSelectedCulturaId(id);
      setShowNovaCulturaInput(false);
      setNovaCulturaNome('');
      return;
    }

    const novaCultura: ParametroQualidadeCultura = {
      id,
      cultura: novaCulturaNome.trim(),
      diasValidadePadrao: 180,
      diasAlertaVencimentoPadrao: 30,
      testes: [
        { id: `t-${id}-1`, nome: 'Germinação Padrão', unidade: '%', valorMinimo: 80, valorMeta: 85, tipoComparacao: 'MIN', obrigatorio: true, ordem: 1 },
        { id: `t-${id}-2`, nome: 'Vigor Fisiológico', unidade: '%', valorMinimo: 75, valorMeta: 80, tipoComparacao: 'MIN', obrigatorio: true, ordem: 2 },
        { id: `t-${id}-3`, nome: 'Pureza Física', unidade: '%', valorMinimo: 98.0, valorMeta: 99.0, tipoComparacao: 'MIN', obrigatorio: true, ordem: 3 },
        { id: `t-${id}-4`, nome: 'Umidade', unidade: '%', valorMaximo: 12.0, valorMeta: 11.0, tipoComparacao: 'MAX', obrigatorio: true, ordem: 4 },
      ],
    };

    setParametrosList([...parametrosList, novaCultura]);
    setSelectedCulturaId(id);
    setNovaCulturaNome('');
    setShowNovaCulturaInput(false);
  };

  // Salvar alterações no banco
  const handleSalvar = async () => {
    if (!currentParam) return;
    setSalvando(true);
    try {
      await storageService.saveParametroQualidadeCultura(currentParam);
      setMensagemSucesso(`Parâmetros de ${currentParam.cultura} salvos com sucesso!`);
      setTimeout(() => setMensagemSucesso(''), 3500);
      if (onSaved) onSaved();
    } catch (e) {
      console.error('Erro ao salvar parâmetros:', e);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Parâmetros e Testes de Qualidade por Cultura
              </h3>
              <p className="text-xs text-gray-500">
                Configure os limites mínimos, máximos e metas para cada cultura cadastrada (Sorgo, Trigo, Algodão, Soja, etc.)
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

        {/* Feedback de sucesso */}
        {mensagemSucesso && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2 flex items-center text-xs font-semibold text-emerald-800">
            <Check className="w-4 h-4 mr-2 text-emerald-600" />
            {mensagemSucesso}
          </div>
        )}

        {/* Content Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar de Culturas */}
          <div className="w-64 border-r border-gray-200 bg-gray-50 p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">
                Culturas
              </span>
              <button
                onClick={() => setShowNovaCulturaInput(true)}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center"
                title="Cadastrar nova cultura"
              >
                <Plus className="w-3.5 h-3.5 mr-0.5" /> Nova
              </button>
            </div>

            {showNovaCulturaInput && (
              <div className="mb-3 p-2 bg-white rounded-lg border border-emerald-300 shadow-sm space-y-2">
                <input
                  type="text"
                  placeholder="Nome da cultura..."
                  value={novaCulturaNome}
                  onChange={e => setNovaCulturaNome(e.target.value)}
                  className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500"
                  autoFocus
                />
                <div className="flex items-center justify-end space-x-1">
                  <button
                    onClick={() => setShowNovaCulturaInput(false)}
                    className="px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-100 rounded"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCriarNovaCultura}
                    className="px-2 py-1 text-[11px] bg-emerald-700 text-white rounded font-medium hover:bg-emerald-800"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-1">
              {parametrosList.map(param => {
                const isSelected = param.id === selectedCulturaId;
                return (
                  <button
                    key={param.id}
                    onClick={() => setSelectedCulturaId(param.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition ${
                      isSelected
                        ? 'bg-emerald-700 text-white shadow-sm'
                        : 'text-gray-700 hover:bg-gray-200/70'
                    }`}
                  >
                    <span>{param.cultura}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        isSelected ? 'bg-emerald-800 text-emerald-100' : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {param.testes.length} testes
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-gray-200 text-[11px] text-gray-500 space-y-1">
              <div className="flex items-center text-gray-600 font-semibold">
                <HelpCircle className="w-3.5 h-3.5 mr-1" /> Dica de Padrões
              </div>
              <p>
                Os testes configurados aqui são carregados automaticamente ao criar uma nova análise para essa cultura.
              </p>
            </div>
          </div>

          {/* Painel de Configuração da Cultura Selecionada */}
          <div className="flex-1 flex flex-col p-6 overflow-y-auto bg-white">
            {currentParam ? (
              <div className="space-y-6">
                {/* Cabeçalho da Cultura + Prazos Padrões */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-200">
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 flex items-center">
                      <ShieldCheck className="w-5 h-5 mr-2 text-emerald-700" />
                      {currentParam.cultura}
                    </h4>
                    <p className="text-xs text-gray-500">
                      Definição de testes físicos, sanitários e fisiológicos
                    </p>
                  </div>

                  <div className="flex items-center space-x-4 text-xs bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                        Validade Padrão
                      </label>
                      <div className="flex items-center space-x-1">
                        <input
                          type="number"
                          value={currentParam.diasValidadePadrao || 180}
                          onChange={e =>
                            handleUpdateCulturaConfig('diasValidadePadrao', parseInt(e.target.value) || 180)
                          }
                          className="w-16 px-2 py-1 border border-gray-300 rounded font-semibold text-center"
                        />
                        <span className="text-gray-500 text-xs">dias</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                        Alerta de Vencimento
                      </label>
                      <div className="flex items-center space-x-1">
                        <input
                          type="number"
                          value={currentParam.diasAlertaVencimentoPadrao || 30}
                          onChange={e =>
                            handleUpdateCulturaConfig('diasAlertaVencimentoPadrao', parseInt(e.target.value) || 30)
                          }
                          className="w-16 px-2 py-1 border border-gray-300 rounded font-semibold text-center"
                        />
                        <span className="text-gray-500 text-xs">dias antes</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabela de Testes Configuráveis */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-xs font-bold uppercase text-gray-600 tracking-wider">
                      Testes e Critérios Avaliados ({currentParam.testes.length})
                    </h5>
                    <button
                      onClick={handleAddTeste}
                      className="inline-flex items-center px-3 py-1 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Teste
                    </button>
                  </div>

                  <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
                        <tr>
                          <th className="p-3 w-1/3">Nome do Teste / Parâmetro</th>
                          <th className="p-3 w-20 text-center">Unidade</th>
                          <th className="p-3 w-28 text-center">Tipo Regra</th>
                          <th className="p-3 w-24 text-center">Mínimo</th>
                          <th className="p-3 w-24 text-center">Máximo</th>
                          <th className="p-3 w-24 text-center">Meta</th>
                          <th className="p-3 w-20 text-center">Obrigatório</th>
                          <th className="p-3 w-12 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {currentParam.testes.map((teste, idx) => (
                          <tr key={teste.id} className="hover:bg-gray-50/80">
                            {/* Nome */}
                            <td className="p-2">
                              <input
                                type="text"
                                value={teste.nome}
                                onChange={e => handleUpdateTeste(teste.id, 'nome', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded font-medium focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>

                            {/* Unidade */}
                            <td className="p-2 text-center">
                              <input
                                type="text"
                                value={teste.unidade}
                                onChange={e => handleUpdateTeste(teste.id, 'unidade', e.target.value)}
                                className="w-16 px-1.5 py-1 border border-gray-300 rounded text-center font-mono focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>

                            {/* Tipo Comparação */}
                            <td className="p-2 text-center">
                              <select
                                value={teste.tipoComparacao || 'MIN'}
                                onChange={e => handleUpdateTeste(teste.id, 'tipoComparacao', e.target.value)}
                                className="w-full px-1.5 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-emerald-500"
                              >
                                <option value="MIN">Mínimo Exigido</option>
                                <option value="MAX">Máximo Permitido</option>
                                <option value="INFORMATIVO">Apenas Informativo</option>
                              </select>
                            </td>

                            {/* Valor Mínimo */}
                            <td className="p-2 text-center">
                              <input
                                type="number"
                                step="any"
                                placeholder="-"
                                value={teste.valorMinimo !== undefined ? teste.valorMinimo : ''}
                                onChange={e =>
                                  handleUpdateTeste(
                                    teste.id,
                                    'valorMinimo',
                                    e.target.value === '' ? undefined : parseFloat(e.target.value)
                                  )
                                }
                                disabled={teste.tipoComparacao === 'MAX' || teste.tipoComparacao === 'INFORMATIVO'}
                                className="w-20 px-1.5 py-1 border border-gray-300 rounded text-center disabled:bg-gray-100 disabled:text-gray-400"
                              />
                            </td>

                            {/* Valor Máximo */}
                            <td className="p-2 text-center">
                              <input
                                type="number"
                                step="any"
                                placeholder="-"
                                value={teste.valorMaximo !== undefined ? teste.valorMaximo : ''}
                                onChange={e =>
                                  handleUpdateTeste(
                                    teste.id,
                                    'valorMaximo',
                                    e.target.value === '' ? undefined : parseFloat(e.target.value)
                                  )
                                }
                                disabled={teste.tipoComparacao === 'MIN' || teste.tipoComparacao === 'INFORMATIVO'}
                                className="w-20 px-1.5 py-1 border border-gray-300 rounded text-center disabled:bg-gray-100 disabled:text-gray-400"
                              />
                            </td>

                            {/* Valor Meta */}
                            <td className="p-2 text-center">
                              <input
                                type="number"
                                step="any"
                                placeholder="-"
                                value={teste.valorMeta !== undefined ? teste.valorMeta : ''}
                                onChange={e =>
                                  handleUpdateTeste(
                                    teste.id,
                                    'valorMeta',
                                    e.target.value === '' ? undefined : parseFloat(e.target.value)
                                  )
                                }
                                className="w-20 px-1.5 py-1 border border-emerald-200 rounded text-center text-emerald-900 bg-emerald-50/30"
                              />
                            </td>

                            {/* Obrigatório */}
                            <td className="p-2 text-center">
                              <input
                                type="checkbox"
                                checked={teste.obrigatorio}
                                onChange={e => handleUpdateTeste(teste.id, 'obrigatorio', e.target.checked)}
                                className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                              />
                            </td>

                            {/* Ações */}
                            <td className="p-2 text-center">
                              <button
                                onClick={() => handleRemoveTeste(teste.id)}
                                className="p-1 text-gray-400 hover:text-rose-600 rounded transition"
                                title="Remover este teste"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Selecione uma cultura na lista lateral.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <span className="text-xs text-gray-500">
            {currentParam ? `Configurações aplicadas à cultura ${currentParam.cultura}` : ''}
          </span>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition"
            >
              Fechar
            </button>
            <button
              onClick={handleSalvar}
              disabled={salvando || !currentParam}
              className="inline-flex items-center px-4 py-2 text-xs font-bold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition disabled:opacity-50 shadow"
            >
              <Save className="w-4 h-4 mr-1.5" />
              {salvando ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
