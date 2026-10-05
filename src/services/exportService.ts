import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Amostra, Avaliacao, FotoAmostra } from '../types';
import { storageService } from './storageService';
import { formatDateBR } from '../utils/dateUtils';

export const exportService = {
  // --- EXCEL EXPORT (MULTI-TESTES POR LOTE) ---
  exportToExcel(amostras: Amostra[], fileName: string = 'Relatorio_Controle_Qualidade_Sementes') {
    const dataRows: any[] = [];

    amostras.forEach(amostra => {
      // Busca todos os testes cadastrados para este lote/amostra
      const testes = storageService.getAvaliacoesByAmostraId(amostra.id);

      if (testes.length === 0) {
        // Amostra cadastrada ainda sem avaliações
        const emerg7d = amostra.plantulasEmergidas7dias;
        dataRows.push({
          'Identificação do Teste': 'Teste 1 (Pendente)',
          'Nº Teste': 1,
          'Protocolo': amostra.protocolo,
          'Número do Lote': amostra.lote,
          'Cultura': amostra.cultura,
          'Cultivar': amostra.cultivar,
          'Peneira': amostra.peneira || 'N/A',
          'Categoria': amostra.categoria,
          'Safra': amostra.safra,
          'Data Lançamento / Semeadura': amostra.dataSemeadura,
          'Início do Teste': amostra.dataInicioTeste || amostra.dataSemeadura,
          'Prev. Leitura 7d': amostra.dataLeitura7Dias || amostra.dataLeitura7dias || '-',
          'Prev. Leitura 10d': amostra.dataLeitura10Dias || amostra.dataLeitura10dias || '-',
          'Emergência 7 Dias (%)': emerg7d !== undefined ? `${emerg7d}%` : '-',
          'Fortes (10d)': '-',
          'Intermediárias (10d)': '-',
          'Fracas (10d)': '-',
          'Anormais (10d)': '-',
          'Mortas (10d)': '-',
          'Germinação Final (%)': '-',
          'Anormais (%)': '-',
          'Mortas (%)': '-',
          'Resultado CQ': 'Pendente',
          'Avaliador / Responsável': amostra.responsavel,
          'Data do Teste': '-',
          'Hora do Teste': '-',
          'Status do Teste': amostra.status,
          'Total Testes Lote': 0,
          'Rastreabilidade': 'Sem testes adicionais',
          'Observações': amostra.obsLeitura7dias || amostra.observacoes || '',
        });
      } else {
        // UMA LINHA PARA CADA TESTE DO LOTE (Lote 1 -> Teste 1, Lote 1 -> Teste 2, ...)
        testes.forEach((teste, idx) => {
          const numTeste = teste.testeNumero ?? (idx + 1);
          const emerg7d = teste.plantulasEmergidas7dias !== undefined 
            ? teste.plantulasEmergidas7dias 
            : amostra.plantulasEmergidas7dias;

          const dataHoraTeste = teste.dataHora || (teste.dataAvaliacao ? `${teste.dataAvaliacao}T${teste.horaAvaliacao || '00:00'}:00` : '');
          const dataTesteFormatada = teste.dataAvaliacao || (dataHoraTeste ? dataHoraTeste.split('T')[0] : '-');
          const horaTesteFormatada = teste.horaAvaliacao || (dataHoraTeste && dataHoraTeste.includes('T') ? dataHoraTeste.split('T')[1].substring(0, 5) : '-');

          dataRows.push({
            'Identificação do Teste': `Teste ${numTeste}`,
            'Nº Teste': numTeste,
            'Protocolo': amostra.protocolo,
            'Número do Lote': amostra.lote,
            'Cultura': amostra.cultura,
            'Cultivar': amostra.cultivar,
            'Peneira': amostra.peneira || 'N/A',
            'Categoria': amostra.categoria,
            'Safra': amostra.safra,
            'Data Lançamento / Semeadura': amostra.dataSemeadura,
            'Início do Teste': teste.dataInicioTeste || amostra.dataInicioTeste || amostra.dataSemeadura,
            'Prev. Leitura 7d': teste.dataLeitura7Dias || amostra.dataLeitura7Dias || amostra.dataLeitura7dias || '-',
            'Prev. Leitura 10d': teste.dataLeitura10Dias || amostra.dataLeitura10Dias || amostra.dataLeitura10dias || '-',
            'Emergência 7 Dias (%)': emerg7d !== undefined ? `${emerg7d}%` : '-',
            'Fortes (10d)': teste.fortes ?? 0,
            'Intermediárias (10d)': teste.intermediarias ?? 0,
            'Fracas (10d)': teste.fracas ?? 0,
            'Anormais (10d)': teste.anormais ?? 0,
            'Mortas (10d)': teste.mortas ?? 0,
            'Germinação Final (%)': `${teste.germinacao ?? 0}%`,
            'Anormais (%)': `${teste.percentualAnormais ?? teste.anormais ?? 0}%`,
            'Mortas (%)': `${teste.percentualMortas ?? 0}%`,
            'Resultado CQ': teste.resultado || teste.resultadoAprovacao || 'Pendente',
            'Avaliador / Responsável': teste.usuario || teste.usuarioAvaliador || amostra.responsavel,
            'Data do Teste': dataTesteFormatada,
            'Hora do Teste': horaTesteFormatada,
            'Status do Teste': teste.statusTeste === 'concluido' ? 'Concluído' : (teste.statusTeste === 'rascunho' ? 'Rascunho' : 'Concluído'),
            'Total Testes Lote': testes.length,
            'Rastreabilidade': teste.testeAnteriorId ? `Vinculado ao Teste ${numTeste - 1}` : (numTeste > 1 ? `Teste anterior #${numTeste - 1}` : 'Teste Inicial'),
            'Observações': teste.observacoes || amostra.observacoes || '',
          });
        });
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(dataRows);
    
    // Auto-width columns
    const max_widths = Object.keys(dataRows[0] || {}).map(key => ({
      wch: Math.max(key.length + 3, 15)
    }));
    worksheet['!cols'] = max_widths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório CQ Canteiros');

    const formattedDate = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `${fileName}_${formattedDate}.xlsx`);
  },

  // --- LAUDO TÉCNICO PDF (CONSIDERA TODOS OS TESTES DO LOTE COM SUAS RESPECTIVAS FOTOS) ---
  generateSamplePDF(
    amostra: Amostra, 
    avaliacaoOuTestes?: Avaliacao | Avaliacao[], 
    fotosParam?: FotoAmostra[]
  ) {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // 1. Resolução de Testes do Lote (Ordem cronológica crescente: Teste 1, Teste 2...)
    let testes: Avaliacao[] = [];
    if (Array.isArray(avaliacaoOuTestes) && avaliacaoOuTestes.length > 0) {
      testes = avaliacaoOuTestes;
    } else {
      const dbTestes = storageService.getAvaliacoesByAmostraId(amostra.id);
      if (dbTestes.length > 0) {
        testes = dbTestes;
      } else if (avaliacaoOuTestes && !Array.isArray(avaliacaoOuTestes)) {
        testes = [avaliacaoOuTestes];
      }
    }

    testes = testes.sort((a, b) => (a.testeNumero ?? 1) - (b.testeNumero ?? 1));

    // 2. Resolução de Fotos do Lote
    const allFotos: FotoAmostra[] = (fotosParam && fotosParam.length > 0)
      ? fotosParam
      : storageService.getFotosByAmostra(amostra.id);

    const primaryColor = [27, 67, 50]; // #1b4332 Dark Green
    const accentColor = [45, 106, 79]; // #2d6a4f
    const lightBg = [240, 247, 244];

    // Helper: desenha cabeçalho padrão
    const renderHeaderBanner = (isContinuation: boolean = false) => {
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, isContinuation ? 22 : 30, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(isContinuation ? 14 : 18);
      doc.text(
        isContinuation ? `SMART CANTEIRO CQ — CONTINUAÇÃO (LOTE: ${amostra.lote})` : 'SMART CANTEIRO CQ', 
        14, 
        isContinuation ? 14 : 14
      );

      if (!isContinuation) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.text('Relatório Técnico de Controle de Qualidade de Sementes — Laudo de Emergência e Germinação', 14, 22);

        // Data de emissão
        doc.setFontSize(8.5);
        const agora = new Date();
        doc.text(
          `Emissão: ${agora.toLocaleDateString('pt-BR')} ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, 
          196, 
          22, 
          { align: 'right' }
        );
      }
    };

    // Helper: controle de espaço e quebra de página dinâmica
    let currentY = 36;
    const ensureSpace = (neededHeight: number): void => {
      if (currentY + neededHeight > 252) {
        doc.addPage();
        renderHeaderBanner(true);
        currentY = 28;
      }
    };

    // Página 1: Cabeçalho Inicial
    renderHeaderBanner(false);

    // --- SEÇÃO 1: DADOS DE IDENTIFICAÇÃO DA AMOSTRA E LOTE ---
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.rect(14, currentY, 182, 38, 'F');
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.4);
    doc.rect(14, currentY, 182, 38, 'D');

    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('1. DADOS DE IDENTIFICAÇÃO DO LOTE E AMOSTRA', 18, currentY + 6.5);

    // Badge com Total de Testes
    const totalTestesRealizados = testes.length;
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(138, currentY + 2.5, 54, 6.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL DE TESTES: ${totalTestesRealizados}`, 165, currentY + 6.8, { align: 'center' });

    doc.setTextColor(40, 40, 40);
    doc.setFontSize(9);

    // Coluna 1
    doc.setFont('helvetica', 'bold'); doc.text('Protocolo:', 18, currentY + 14);
    doc.setFont('helvetica', 'normal'); doc.text(amostra.protocolo, 40, currentY + 14);

    doc.setFont('helvetica', 'bold'); doc.text('Cultura:', 18, currentY + 20);
    doc.setFont('helvetica', 'normal'); doc.text(amostra.cultura, 40, currentY + 20);

    doc.setFont('helvetica', 'bold'); doc.text('Cultivar:', 18, currentY + 26);
    doc.setFont('helvetica', 'normal'); doc.text(amostra.cultivar, 40, currentY + 26);

    doc.setFont('helvetica', 'bold'); doc.text('Nº do Lote:', 18, currentY + 32);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(amostra.lote, 40, currentY + 32);
    doc.setTextColor(40, 40, 40);

    // Coluna 2
    doc.setFont('helvetica', 'bold'); doc.text('Peneira:', 105, currentY + 14);
    doc.setFont('helvetica', 'normal'); doc.text(amostra.peneira || 'N/A', 126, currentY + 14);

    doc.setFont('helvetica', 'bold'); doc.text('Categoria:', 105, currentY + 20);
    doc.setFont('helvetica', 'normal'); doc.text(amostra.categoria, 126, currentY + 20);

    doc.setFont('helvetica', 'bold'); doc.text('Safra:', 105, currentY + 26);
    doc.setFont('helvetica', 'normal'); doc.text(amostra.safra, 126, currentY + 26);

    doc.setFont('helvetica', 'bold'); doc.text('Semeadura:', 105, currentY + 32);
    const semeaduraFormatada = amostra.dataSemeadura ? formatDateBR(amostra.dataSemeadura) : '-';
    doc.setFont('helvetica', 'normal'); doc.text(semeaduraFormatada, 126, currentY + 32);

    currentY += 44;

    // --- SEÇÃO 2: RESULTADOS DOS TESTES & FOTOS VINCULADAS ---
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('2. AVALIAÇÕES REALIZADAS E REGISTROS FOTOGRÁFICOS', 14, currentY);
    currentY += 5;

    const extraFotosAnexo: { foto: FotoAmostra; testeNum: number }[] = [];

    if (testes.length === 0) {
      // Caso não haja testes
      doc.setFillColor(248, 249, 250);
      doc.rect(14, currentY, 182, 35, 'F');
      doc.setDrawColor(220, 220, 220);
      doc.rect(14, currentY, 182, 35, 'D');
      doc.setTextColor(150, 0, 0);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Este lote ainda encontra-se com status PENDENTE de avaliação.', 105, currentY + 18, { align: 'center' });
      currentY += 42;
    } else {
      // Itera por cada teste na sequência: Teste 1, Teste 2, Teste 3...
      testes.forEach((teste, idx) => {
        const numTeste = teste.testeNumero ?? (idx + 1);
        const isApproved = (teste.resultado || teste.resultadoAprovacao) === 'Aprovado';
        
        // Fotos deste teste específico
        const fotosDoTeste = allFotos.filter(f => (f.testeNumero ?? 1) === numTeste);
        const fotoPrincipal = fotosDoTeste.length > 0 ? fotosDoTeste[0] : null;

        if (fotosDoTeste.length > 1) {
          fotosDoTeste.slice(1).forEach(ef => {
            extraFotosAnexo.push({ foto: ef, testeNum: numTeste });
          });
        }

        const blockHeight = 65;
        ensureSpace(blockHeight);

        // Bloco Container do Teste
        doc.setFillColor(255, 255, 255);
        doc.rect(14, currentY, 182, blockHeight, 'F');
        doc.setDrawColor(210, 215, 212);
        doc.setLineWidth(0.4);
        doc.rect(14, currentY, 182, blockHeight, 'D');

        // Faixa de Título do Teste
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(14, currentY, 182, 9, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(`TESTE ${numTeste}`, 18, currentY + 6.2);

        // Stamp Aprovado / Reprovado
        doc.setFillColor(isApproved ? 46 : 220, isApproved ? 125 : 53, isApproved ? 50 : 69);
        doc.rect(42, currentY + 1.5, 30, 6, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(
          (teste.resultado || teste.resultadoAprovacao || 'CONCLUÍDO').toUpperCase(), 
          57, 
          currentY + 5.7, 
          { align: 'center' }
        );

        // Info da Data / Avaliador no Header do Teste
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(230, 245, 235);
        const dataTeste = teste.dataAvaliacao ? formatDateBR(teste.dataAvaliacao) : (teste.dataHora ? teste.dataHora.split('T')[0] : '-');
        const horaTeste = teste.horaAvaliacao || '';
        const avaliadorNome = teste.usuario || teste.usuarioAvaliador || amostra.responsavel;
        doc.text(`Realizado em: ${dataTeste} ${horaTeste ? 'às ' + horaTeste : ''} | Avaliador: ${avaliadorNome}`, 192, currentY + 6, { align: 'right' });

        // --- SUB-BLOCO ESQUERDO: RESULTADOS DO TESTE (X: 18 a 115) ---
        const leftBoxY = currentY + 12;

        // Cronograma do Teste
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        const dtInicio = teste.dataInicioTeste ? formatDateBR(teste.dataInicioTeste) : semeaduraFormatada;
        const dt7d = teste.dataLeitura7Dias ? formatDateBR(teste.dataLeitura7Dias) : (amostra.dataLeitura7dias ? formatDateBR(amostra.dataLeitura7dias) : '-');
        const dt10d = teste.dataLeitura10Dias ? formatDateBR(teste.dataLeitura10Dias) : (amostra.dataLeitura10dias ? formatDateBR(amostra.dataLeitura10dias) : '-');
        doc.text(`Início: ${dtInicio}  |  7 Dias: ${dt7d}  |  10 Dias: ${dt10d}`, 18, leftBoxY);

        // Grade de Contagens do Teste
        doc.setFontSize(8);
        doc.setTextColor(40, 40, 40);

        doc.setFont('helvetica', 'bold'); doc.text('• Plântulas Fortes:', 18, leftBoxY + 7);
        doc.setFont('helvetica', 'normal'); doc.text(`${teste.fortes}`, 68, leftBoxY + 7);

        doc.setFont('helvetica', 'bold'); doc.text('• Plântulas Intermediárias:', 18, leftBoxY + 12);
        doc.setFont('helvetica', 'normal'); doc.text(`${teste.intermediarias}`, 68, leftBoxY + 12);

        doc.setFont('helvetica', 'bold'); doc.text('• Plântulas Fracas:', 18, leftBoxY + 17);
        doc.setFont('helvetica', 'normal'); doc.text(`${teste.fracas}`, 68, leftBoxY + 17);

        doc.setFont('helvetica', 'bold'); doc.text('• Plântulas Anormais:', 18, leftBoxY + 22);
        doc.setFont('helvetica', 'normal'); doc.text(`${teste.anormais ?? 0}`, 68, leftBoxY + 22);

        doc.setFont('helvetica', 'bold'); doc.text('• Plântulas Mortas:', 18, leftBoxY + 27);
        doc.setFont('helvetica', 'normal'); doc.text(`${teste.mortas}`, 68, leftBoxY + 27);

        // Caixa de Destaque Germinação Final %
        doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.rect(78, leftBoxY + 4, 38, 25, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.text('GERMINAÇÃO:', 82, leftBoxY + 10);
        doc.setFontSize(13);
        doc.text(`${teste.germinacao}%`, 82, leftBoxY + 18);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(`Anorm: ${teste.percentualAnormais ?? teste.anormais ?? 0}% | Mort: ${teste.percentualMortas}%`, 82, leftBoxY + 25);

        // Emergência aos 7 dias e Observações
        const emerg7dVal = teste.plantulasEmergidas7dias !== undefined 
          ? teste.plantulasEmergidas7dias 
          : amostra.plantulasEmergidas7dias;
        if (emerg7dVal !== undefined) {
          doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'bold');
          doc.text(`Emergência aos 7 dias: ${emerg7dVal}%`, 18, leftBoxY + 34);
        }

        if (teste.observacoes) {
          doc.setTextColor(80, 80, 80);
          doc.setFontSize(7);
          doc.setFont('helvetica', 'italic');
          const obsTrunk = teste.observacoes.length > 70 ? teste.observacoes.substring(0, 67) + '...' : teste.observacoes;
          doc.text(`Obs: "${obsTrunk}"`, 18, leftBoxY + 40);
        }

        // --- SUB-BLOCO DIREITO: FOTO DO RESPECTIVO TESTE (X: 122 a 192) ---
        const photoX = 122;
        const photoY = currentY + 11.5;
        const photoW = 70;
        const photoH = 43;

        if (fotoPrincipal && fotoPrincipal.foto) {
          try {
            const imgFormat = fotoPrincipal.foto.startsWith('data:image/png') ? 'PNG' : 'JPEG';
            doc.addImage(fotoPrincipal.foto, imgFormat, photoX, photoY, photoW, photoH);
            doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
            doc.setLineWidth(0.4);
            doc.rect(photoX, photoY, photoW, photoH, 'D');

            // Legenda da Foto vinculada ao Teste
            doc.setFillColor(255, 255, 255);
            doc.rect(photoX, photoY + photoH - 6.5, photoW, 6.5, 'F');
            doc.setFontSize(7);
            doc.setTextColor(30, 30, 30);
            doc.setFont('helvetica', 'bold');
            doc.text(`Foto do Teste ${numTeste}`, photoX + (photoW / 2), photoY + photoH - 2, { align: 'center' });
          } catch (err) {
            console.error(`Erro ao adicionar foto do Teste ${numTeste} ao PDF:`, err);
            doc.setFillColor(245, 245, 245);
            doc.rect(photoX, photoY, photoW, photoH, 'F');
            doc.setTextColor(140, 140, 140);
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'italic');
            doc.text(`Foto do Teste ${numTeste}`, photoX + (photoW / 2), photoY + 22, { align: 'center' });
          }
        } else {
          // Sem foto para este teste
          doc.setFillColor(248, 249, 250);
          doc.rect(photoX, photoY, photoW, photoH, 'F');
          doc.setDrawColor(220, 220, 220);
          doc.rect(photoX, photoY, photoW, photoH, 'D');
          doc.setTextColor(140, 140, 140);
          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'italic');
          doc.text(`Nenhuma foto anexada`, photoX + (photoW / 2), photoY + 20, { align: 'center' });
          doc.text(`ao Teste ${numTeste}`, photoX + (photoW / 2), photoY + 25, { align: 'center' });
        }

        currentY += blockHeight + 5;
      });
    }

    // --- ASSINATURAS E RODAPÉ TÉCNICO ---
    ensureSpace(34);
    currentY = Math.max(currentY + 2, 252);

    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(20, currentY + 12, 90, currentY + 12);
    doc.line(120, currentY + 12, 190, currentY + 12);

    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);
    doc.setFont('helvetica', 'bold');
    const respTecnico1 = testes[testes.length - 1]?.usuario || testes[testes.length - 1]?.usuarioAvaliador || amostra.responsavel || 'Avaliador CQ';
    doc.text(respTecnico1, 55, currentY + 16, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text('Avaliador Técnico / Controle de Qualidade', 55, currentY + 20, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);
    doc.text('Responsável Técnico / Laboratório', 155, currentY + 16, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text('Supervisão e Controle de Qualidade CQ', 155, currentY + 20, { align: 'center' });

    doc.setFontSize(6.5);
    doc.setTextColor(150, 150, 150);
    doc.text('Smart Canteiro CQ — Sistema Profissional de Controle de Qualidade de Sementes • Laudo Multitestes Integrado', 105, 287, { align: 'center' });

    // --- ANEXO FOTOGRÁFICO COMPLEMENTAR (SE HOUVER MAIS DE 1 FOTO POR TESTE) ---
    if (extraFotosAnexo.length > 0) {
      doc.addPage();
      renderHeaderBanner(true);

      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('ANEXO FOTOGRÁFICO COMPLEMENTAR DO LOTE', 14, 30);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text(`Registros adicionais vinculados aos respectivos testes do lote ${amostra.lote}:`, 14, 35);

      let gridY = 40;
      for (let idx = 0; idx < extraFotosAnexo.length; idx++) {
        const item = extraFotosAnexo[idx];
        const isLeft = idx % 2 === 0;
        const xPos = isLeft ? 16 : 108;

        if (idx > 0 && isLeft) {
          gridY += 76;
        }

        if (gridY + 68 > 275) {
          doc.addPage();
          renderHeaderBanner(true);
          gridY = 30;
        }

        try {
          const imgFormat = item.foto.foto.startsWith('data:image/png') ? 'PNG' : 'JPEG';
          doc.addImage(item.foto.foto, imgFormat, xPos, gridY, 86, 56);
          doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
          doc.setLineWidth(0.4);
          doc.rect(xPos, gridY, 86, 56, 'D');

          doc.setFontSize(8);
          doc.setTextColor(40, 40, 40);
          doc.setFont('helvetica', 'bold');
          doc.text(`Foto Complementar — Teste ${item.testeNum}`, xPos, gridY + 61);

          if (item.foto.dataUpload) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(100, 100, 100);
            const dt = new Date(item.foto.dataUpload);
            doc.text(`Capturada em: ${dt.toLocaleDateString('pt-BR')} às ${dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, xPos, gridY + 65.5);
          }
        } catch (err) {
          console.error(`Erro ao adicionar foto complementar no anexo:`, err);
        }
      }
    }

    doc.save(`Laudo_CQ_${amostra.lote}_${amostra.protocolo}.pdf`);
  }
};
