import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LoteQualidade, AnaliseQualidade, ConfiguracaoTermoConformidade } from '../types';
import { formatDateBR } from '../utils/dateUtils';
import { storageService } from './storageService';

export const termoConformidadeService = {
  /**
   * Gera o Termo de Conformidade Oficial (PDF) para S1 / S2 ou Laudo Técnico Oficial.
   */
  gerarTermoConformidadePDF(
    lote: LoteQualidade,
    analise: AnaliseQualidade,
    empresaParam?: ConfiguracaoTermoConformidade
  ): jsPDF {
    const empresa = empresaParam || storageService.getConfigTermoConformidade();
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const primaryColor = [27, 67, 50]; // #1b4332
    const secondaryColor = [45, 106, 79]; // #2d6a4f
    const accentColor = [116, 198, 157]; // #74c69d

    const docNumber = analise.termoConformidadeNumeroDoc || 
      `TC-${lote.lote}-${analise.numeroAnalise === 1 ? 'ORIG' : 'REAN' + analise.numeroAnalise}-${new Date().getFullYear()}`;

    // --- CABEÇALHO ---
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(14, 12, 182, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('TERMO DE CONFORMIDADE DE SEMENTES', 105, 21, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('EM CONFORMIDADE COM A LEI Nº 10.711/2003 E DECRETO Nº 10.586/2020 (MAPA)', 105, 27, { align: 'center' });
    doc.text(`DOCUMENTO Nº: ${docNumber} | EMISSÃO: ${formatDateBR(new Date().toISOString().split('T')[0])}`, 105, 32, { align: 'center' });

    // --- DADOS DA EMPRESA PRODUTORA ---
    let currentY = 41;
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(14, currentY, 182, 22, 2, 2, 'FD');

    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('1. IDENTIFICAÇÃO DO PRODUTOR / BENEFICIADOR', 18, currentY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);
    doc.text(`Razão Social: ${empresa.razaoSocial}`, 18, currentY + 11);
    doc.text(`CNPJ: ${empresa.cnpj}  |  RENASEM Produtor: ${empresa.renasem}`, 18, currentY + 16);
    doc.text(`Endereço: ${empresa.endereco} - ${empresa.cidadeUf}`, 18, currentY + 20);

    // --- IDENTIFICAÇÃO DO LOTE ---
    currentY += 25;
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(14, currentY, 182, 38, 2, 2, 'FD');

    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('2. IDENTIFICAÇÃO DO LOTE DE SEMENTES', 18, currentY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 30, 30);

    // Coluna 1
    doc.text(`Cultura / Espécie:`, 18, currentY + 12);
    doc.setFont('helvetica', 'bold');
    doc.text(`${lote.cultura.toUpperCase()}`, 52, currentY + 12);

    doc.setFont('helvetica', 'normal');
    doc.text(`Cultivar / Híbrido:`, 18, currentY + 18);
    doc.setFont('helvetica', 'bold');
    doc.text(`${lote.cultivar}`, 52, currentY + 18);

    doc.setFont('helvetica', 'normal');
    doc.text(`Identificação do Lote:`, 18, currentY + 24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 40, 40);
    doc.text(`${lote.lote}`, 52, currentY + 24);
    doc.setTextColor(30, 30, 30);

    doc.setFont('helvetica', 'normal');
    doc.text(`Categoria de Semente:`, 18, currentY + 30);
    doc.setFont('helvetica', 'bold');
    doc.text(`${lote.categoria}`, 52, currentY + 30);

    // Coluna 2
    doc.setFont('helvetica', 'normal');
    doc.text(`Safra de Produção:`, 110, currentY + 12);
    doc.setFont('helvetica', 'bold');
    doc.text(`${lote.safra}`, 148, currentY + 12);

    doc.setFont('helvetica', 'normal');
    doc.text(`Quantidade do Lote:`, 110, currentY + 18);
    doc.setFont('helvetica', 'bold');
    doc.text(`${lote.quantidade || 'N/I'}`, 148, currentY + 18);

    doc.setFont('helvetica', 'normal');
    doc.text(`Peneira / Classificação:`, 110, currentY + 24);
    doc.setFont('helvetica', 'bold');
    doc.text(`${lote.peneira || 'Padrão'}`, 148, currentY + 24);

    doc.setFont('helvetica', 'normal');
    doc.text(`Tipo de Análise:`, 110, currentY + 30);
    doc.setFont('helvetica', 'bold');
    doc.text(
      analise.tipo === 'ORIGINAL' ? 'Análise Original' : `Reanálise #${analise.numeroAnalise - 1}`,
      148,
      currentY + 30
    );

    // --- RESULTADOS DOS TESTES DE QUALIDADE ---
    currentY += 41;
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('3. RESULTADOS DOS TESTES DE QUALIDADE FÍSICA E FISIOLÓGICA', 14, currentY + 4);

    const tableRows = analise.resultados.map(r => {
      let faixa = '-';
      if (r.valorMinimo !== undefined && r.valorMaximo !== undefined) {
        faixa = `${r.valorMinimo} a ${r.valorMaximo} ${r.unidade}`;
      } else if (r.valorMinimo !== undefined) {
        faixa = `Mín. ${r.valorMinimo} ${r.unidade}`;
      } else if (r.valorMaximo !== undefined) {
        faixa = `Máx. ${r.valorMaximo} ${r.unidade}`;
      }

      const sitLabel = r.situacao === 'CONFORME' 
        ? 'CONFORME' 
        : r.situacao === 'NAO_CONFORME' 
        ? 'NÃO CONFORME' 
        : 'ATENÇÃO';

      return [
        r.nomeTeste,
        `${r.valorResultado} ${r.unidade}`,
        faixa,
        r.valorMeta !== undefined ? `${r.valorMeta} ${r.unidade}` : '-',
        sitLabel,
      ];
    });

    autoTable(doc, {
      startY: currentY + 6,
      head: [['Parâmetro / Teste Avaliado', 'Resultado Obtido', 'Padrão Exigido (Norma)', 'Meta', 'Situação']],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [45, 106, 79],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [30, 30, 30],
      },
      columnStyles: {
        0: { fontStyle: 'bold', halign: 'left', cellWidth: 55 },
        1: { halign: 'center', fontStyle: 'bold', cellWidth: 32 },
        2: { halign: 'center', cellWidth: 38 },
        3: { halign: 'center', cellWidth: 25 },
        4: { halign: 'center', fontStyle: 'bold', cellWidth: 32 },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          const val = String(data.cell.raw);
          if (val === 'CONFORME') {
            data.cell.styles.textColor = [27, 100, 60];
          } else if (val === 'NÃO CONFORME') {
            data.cell.styles.textColor = [200, 30, 30];
          } else {
            data.cell.styles.textColor = [180, 120, 20];
          }
        }
      },
      margin: { left: 14, right: 14 },
    });

    // @ts-ignore
    const finalY = doc.lastAutoTable?.finalY || currentY + 60;

    // --- PARECER TÉCNICO E VALIDADE ---
    let afterTableY = finalY + 5;
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(14, afterTableY, 182, 28, 2, 2, 'FD');

    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('4. PARECER TÉCNICO, VALIDADE E DECLARAÇÃO LEGAL', 18, afterTableY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(40, 40, 40);

    const parecerTxt = analise.resultadoGeralConforme
      ? (empresa.declaracaoLegal || `DECLARO que o lote de sementes acima especificado ATENDE rigorosamente a todos os padrões de identidade e qualidade estabelecidos pelas normas do Ministério da Agricultura e Pecuária (MAPA) para a categoria ${lote.categoria}.`)
      : `ATENÇÃO: O lote de sementes acima especificado NÃO ATINGIU integralmente os padrões mínimos exigidos para comercialização direta.`;

    const splitParecer = doc.splitTextToSize(parecerTxt, 174);
    doc.text(splitParecer, 18, afterTableY + 11);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(`Data da Análise: ${formatDateBR(analise.dataAnalise)}`, 18, afterTableY + 22);
    doc.setTextColor(analise.resultadoGeralConforme ? 27 : 200, analise.resultadoGeralConforme ? 100 : 40, 50);
    doc.text(`VALIDADE DO TESTE DE GERMINAÇÃO: ${formatDateBR(analise.dataValidade)}`, 85, afterTableY + 22);

    // --- ASSINATURAS ---
    const sigY = afterTableY + 36;
    doc.setDrawColor(150, 150, 150);
    doc.line(25, sigY, 90, sigY);
    doc.line(110, sigY, 175, sigY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(60, 60, 60);

    doc.text('Responsável pelo Controle de Qualidade', 57.5, sigY + 4, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(analise.responsavel || 'Analista de CQ', 57.5, sigY + 8, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.text('Responsável Técnico / Engenheiro Agrônomo', 142.5, sigY + 4, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(empresa.responsavelTecnico, 142.5, sigY + 8, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(empresa.creaRenasem, 142.5, sigY + 12, { align: 'center' });

    // Rodapé de segurança
    doc.setFontSize(6.5);
    doc.setTextColor(130, 130, 130);
    doc.text(
      'Documento emitido eletronicamente via Sistema Smart Canteiro CQ. Válido sem emendas ou rasuras.',
      105,
      287,
      { align: 'center' }
    );

    return doc;
  },

  /**
   * Gera o Modelo Padrão Oficial do Termo de Conformidade para visualização / impressão.
   */
  gerarModeloExemploPDF(empresaParam?: ConfiguracaoTermoConformidade): jsPDF {
    const mockLote: LoteQualidade = {
      id: 'mock-lote-modelo',
      lote: 'L-2026-MODELO-001',
      cultura: 'Sorgo / Soja / Milho / Trigo / Algodão',
      cultivar: 'CULTIVAR MODELO',
      categoria: 'S2',
      safra: '2025/2026',
      quantidade: '20.000 kg (500 sacas de 40kg)',
      peneira: '4.0 mm',
      tsiTratamento: 'Tratamento Industrial Padrão TSI',
      analiseOriginalId: 'mock-anl-modelo',
      analiseAtualId: 'mock-anl-modelo',
      totalReanalises: 0,
      dataUltimaAnalise: new Date().toISOString().split('T')[0],
      dataValidadeAtual: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      statusValidade: 'VALIDO',
      germinacaoAtual: 90,
      vigorAtual: 85,
      purezaAtual: 99.0,
      umidadeAtual: 11.5,
      temDocumento: true,
      tipoDocumentoPrincipal: 'TERMO_CONFORMIDADE',
      dataCadastro: new Date().toISOString(),
      dataAtualizacao: new Date().toISOString(),
    };

    const mockAnalise: AnaliseQualidade = {
      id: 'mock-anl-modelo',
      loteId: 'mock-lote-modelo',
      numeroAnalise: 1,
      tipo: 'ORIGINAL',
      dataAnalise: new Date().toISOString().split('T')[0],
      dataValidade: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      laboratorio: 'Laboratório Oficial de Análise de Sementes (LAS)',
      numeroCertificadoLaudo: 'TC-MOD-2026/001',
      responsavel: 'Analista Responsável pelo CQ',
      usuarioRegistro: 'Sistema CQ',
      dataRegistro: new Date().toISOString(),
      parametrosSnapshot: [],
      resultados: [
        { testeId: 't-1', nomeTeste: 'Germinação', unidade: '%', valorResultado: 90, valorMinimo: 80, valorMeta: 85, tipoComparacao: 'MIN', obrigatorio: true, situacao: 'CONFORME' },
        { testeId: 't-2', nomeTeste: 'Vigor (Envelhecimento / Frio)', unidade: '%', valorResultado: 85, valorMinimo: 75, valorMeta: 80, tipoComparacao: 'MIN', obrigatorio: true, situacao: 'CONFORME' },
        { testeId: 't-3', nomeTeste: 'Pureza Física', unidade: '%', valorResultado: 99.2, valorMinimo: 98.0, valorMeta: 99.0, tipoComparacao: 'MIN', obrigatorio: true, situacao: 'CONFORME' },
        { testeId: 't-4', nomeTeste: 'Umidade', unidade: '%', valorResultado: 11.2, valorMaximo: 12.5, valorMeta: 11.5, tipoComparacao: 'MAX', obrigatorio: true, situacao: 'CONFORME' },
        { testeId: 't-5', nomeTeste: 'Outras Cultivares', unidade: '%', valorResultado: 0.0, valorMaximo: 0.1, valorMeta: 0.0, tipoComparacao: 'MAX', obrigatorio: false, situacao: 'CONFORME' },
        { testeId: 't-6', nomeTeste: 'Sementes Nocivas Toleradas', unidade: 'nº/kg', valorResultado: 0, valorMaximo: 2, valorMeta: 0, tipoComparacao: 'MAX', obrigatorio: false, situacao: 'CONFORME' },
      ],
      resultadoGeralConforme: true,
      termoConformidadeGerado: true,
      termoConformidadeNumeroDoc: 'TC-MODELO-MAPA-2026',
    };

    return this.gerarTermoConformidadePDF(mockLote, mockAnalise, empresaParam);
  },

  baixarModeloExemploPDF(empresaParam?: ConfiguracaoTermoConformidade) {
    const doc = this.gerarModeloExemploPDF(empresaParam);
    doc.save('Modelo_Termo_de_Conformidade_MAPA.pdf');
  },

  /**
   * Faz o download direto do Termo de Conformidade em PDF.
   */
  baixarTermoConformidadePDF(lote: LoteQualidade, analise: AnaliseQualidade) {
    const doc = this.gerarTermoConformidadePDF(lote, analise);
    const fileName = `Termo_Conformidade_${lote.lote}_${analise.tipo === 'ORIGINAL' ? 'Original' : 'Reanalise'}.pdf`;
    doc.save(fileName);
  },

  /**
   * Abre o Termo de Conformidade em nova aba para visualização / impressão.
   */
  visualizarTermoConformidadePDF(lote: LoteQualidade, analise: AnaliseQualidade) {
    const doc = this.gerarTermoConformidadePDF(lote, analise);
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }
};
