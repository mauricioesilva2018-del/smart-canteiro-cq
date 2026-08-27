import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Amostra, Avaliacao, FotoAmostra } from '../types';
import { storageService } from './storageService';

export const exportService = {
  // --- EXCEL EXPORT ---
  exportToExcel(amostras: Amostra[], fileName: string = 'Relatorio_Controle_Qualidade_Sementes') {
    const avaliacoes = storageService.getAvaliacoes();

    const dataRows = amostras.map(amostra => {
      const avaliacao = avaliacoes.find(a => a.amostraId === amostra.id);
      const emerg7d = amostra.plantulasEmergidas7dias !== undefined 
        ? amostra.plantulasEmergidas7dias 
        : (avaliacao?.plantulasEmergidas7dias !== undefined ? avaliacao.plantulasEmergidas7dias : undefined);

      return {
        'Protocolo': amostra.protocolo,
        'Cultura': amostra.cultura,
        'Cultivar': amostra.cultivar,
        'Número do Lote': amostra.lote,
        'Peneira': amostra.peneira,
        'Categoria': amostra.categoria,
        'Safra': amostra.safra,
        'Data Lançamento': amostra.dataSemeadura,
        'Prev. Leitura 7d': amostra.dataLeitura7dias || '-',
        'Prev. Leitura 10d': amostra.dataLeitura10dias || '-',
        'Emergência 7 Dias (%)': emerg7d !== undefined ? `${emerg7d}%` : '-',
        'Fortes (10d)': avaliacao ? avaliacao.fortes : '-',
        'Intermediárias (10d)': avaliacao ? avaliacao.intermediarias : '-',
        'Fracas (10d)': avaliacao ? avaliacao.fracas : '-',
        'Anormais (10d)': avaliacao ? (avaliacao.anormais ?? 0) : '-',
        'Mortas (10d)': avaliacao ? avaliacao.mortas : '-',
        'Germinação Final (%)': avaliacao ? `${avaliacao.germinacao}%` : '-',
        'Anormais (%)': avaliacao ? `${avaliacao.percentualAnormais ?? avaliacao.anormais ?? 0}%` : '-',
        'Mortas (%)': avaliacao ? `${avaliacao.percentualMortas}%` : '-',
        'Resultado CQ': avaliacao ? avaliacao.resultadoAprovacao : 'Pendente',
        'Avaliador / Responsável': avaliacao ? avaliacao.usuarioAvaliador : amostra.responsavel,
        'Data da Avaliação': avaliacao ? `${avaliacao.dataAvaliacao} ${avaliacao.horaAvaliacao}` : '-',
        'Status Amostra': amostra.status,
        'Observações': avaliacao?.observacoes || amostra.obsLeitura7dias || amostra.observacoes || '',
      };
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

  // --- PDF REPORT FOR A SINGLE SAMPLE OR MULTIPLE ---
  generateSamplePDF(amostra: Amostra, avaliacao?: Avaliacao, fotos: FotoAmostra[] = []) {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const primaryColor = [27, 67, 50]; // #1b4332 Dark Green
    const accentColor = [45, 106, 79]; // #2d6a4f
    const lightBg = [240, 247, 244];

    // Header Banner
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 32, 'F');

    // Header Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('SMART CANTEIRO CQ', 14, 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Relatório Técnico de Controle de Qualidade de Sementes', 14, 23);

    // Data da emissão
    doc.setFontSize(9);
    doc.text(`Emissão: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, 196, 23, { align: 'right' });

    // Section 1: Dados da Amostra
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.rect(14, 38, 182, 42, 'F');
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.5);
    doc.rect(14, 38, 182, 42, 'D');

    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('1. DADOS DE IDENTIFICAÇÃO DA AMOSTRA', 18, 45);

    doc.setTextColor(40, 40, 40);
    doc.setFontSize(9.5);
    
    // Coluna 1
    doc.setFont('helvetica', 'bold'); doc.text('Protocolo:', 18, 52);
    doc.setFont('helvetica', 'normal'); doc.text(amostra.protocolo, 38, 52);

    doc.setFont('helvetica', 'bold'); doc.text('Cultura:', 18, 58);
    doc.setFont('helvetica', 'normal'); doc.text(amostra.cultura, 38, 58);

    doc.setFont('helvetica', 'bold'); doc.text('Cultivar:', 18, 64);
    doc.setFont('helvetica', 'normal'); doc.text(amostra.cultivar, 38, 64);

    doc.setFont('helvetica', 'bold'); doc.text('Nº Lote:', 18, 70);
    doc.setFont('helvetica', 'normal'); doc.text(amostra.lote, 38, 70);

    // Coluna 2
    doc.setFont('helvetica', 'bold'); doc.text('Peneira:', 105, 52);
    doc.setFont('helvetica', 'normal'); doc.text(amostra.peneira || 'N/A', 125, 52);

    doc.setFont('helvetica', 'bold'); doc.text('Categoria:', 105, 58);
    doc.setFont('helvetica', 'normal'); doc.text(amostra.categoria, 125, 58);

    doc.setFont('helvetica', 'bold'); doc.text('Safra:', 105, 64);
    doc.setFont('helvetica', 'normal'); doc.text(amostra.safra, 125, 64);

    doc.setFont('helvetica', 'bold'); doc.text('Semeadura:', 105, 70);
    doc.setFont('helvetica', 'normal'); doc.text(new Date(amostra.dataSemeadura + 'T00:00:00').toLocaleDateString('pt-BR'), 125, 70);

    // Section 2: Resultado da Avaliação
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.rect(14, 86, 182, 58, 'F');
    doc.rect(14, 86, 182, 58, 'D');

    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('2. RESULTADO DA AVALIAÇÃO DE CANTEIRO', 18, 93);

    if (avaliacao) {
      // Tabela de contagens
      const isApproved = avaliacao.resultadoAprovacao === 'Aprovado';
      
      // Stamp Aprovado / Reprovado
      doc.setFillColor(isApproved ? 46 : 220, isApproved ? 125 : 53, isApproved ? 50 : 69);
      doc.rect(150, 90, 42, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(avaliacao.resultadoAprovacao.toUpperCase(), 171, 96.5, { align: 'center' });

      // Dados de Contagem
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(9.5);

      doc.setFont('helvetica', 'bold'); doc.text('Plântulas Fortes:', 18, 102);
      doc.setFont('helvetica', 'normal'); doc.text(`${avaliacao.fortes}`, 68, 102);

      doc.setFont('helvetica', 'bold'); doc.text('Plântulas Intermediárias:', 18, 107);
      doc.setFont('helvetica', 'normal'); doc.text(`${avaliacao.intermediarias}`, 68, 107);

      doc.setFont('helvetica', 'bold'); doc.text('Plântulas Fracas:', 18, 112);
      doc.setFont('helvetica', 'normal'); doc.text(`${avaliacao.fracas}`, 68, 112);

      doc.setFont('helvetica', 'bold'); doc.text('Plântulas Anormais:', 18, 117);
      doc.setFont('helvetica', 'normal'); doc.text(`${avaliacao.anormais ?? 0}`, 68, 117);

      doc.setFont('helvetica', 'bold'); doc.text('Plântulas Mortas:', 18, 122);
      doc.setFont('helvetica', 'normal'); doc.text(`${avaliacao.mortas}`, 68, 122);

      // Germinação e Índices Destaque
      doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.rect(105, 100, 87, 24, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.text('GERMINAÇÃO FINAL (%):', 109, 106);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`${avaliacao.germinacao}%`, 109, 113);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Anormais: ${avaliacao.percentualAnormais ?? avaliacao.anormais ?? 0}%  |  Mortas: ${avaliacao.percentualMortas}%`, 109, 120);

      // Meta Info Avaliação
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Data Avaliação: ${new Date(avaliacao.dataAvaliacao + 'T00:00:00').toLocaleDateString('pt-BR')} às ${avaliacao.horaAvaliacao}`, 18, 131);
      doc.text(`Avaliador Responsável: ${avaliacao.usuarioAvaliador}`, 18, 136);

      if (avaliacao.observacoes) {
        doc.text(`Obs: ${avaliacao.observacoes}`, 18, 141);
      }
    } else {
      doc.setTextColor(150, 0, 0);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Esta amostra ainda encontra-se com status PENDENTE de avaliação.', 18, 110);
    }

    // Section 3: Registro Fotográfico
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    
    const totalFotos = fotos ? fotos.length : 0;
    doc.text(`3. REGISTRO FOTOGRÁFICO DO CANTEIRO ${totalFotos > 0 ? `(${totalFotos} Foto${totalFotos > 1 ? 's' : ''})` : ''}`, 18, 150);

    if (totalFotos > 0) {
      if (totalFotos === 1) {
        // 1 foto centralizada e destacada
        const foto = fotos[0];
        try {
          const imgFormat = foto.foto.startsWith('data:image/png') ? 'PNG' : 'JPEG';
          doc.addImage(foto.foto, imgFormat, 55, 154, 100, 62);
          doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          doc.setLineWidth(0.4);
          doc.rect(55, 154, 100, 62, 'D');

          doc.setFontSize(8);
          doc.setTextColor(50, 50, 50);
          doc.setFont('helvetica', 'bold');
          doc.text(foto.nome || 'Foto de Acompanhamento do Canteiro', 105, 221, { align: 'center' });
          if (foto.dataUpload) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(100, 100, 100);
            const dataStr = new Date(foto.dataUpload).toLocaleDateString('pt-BR');
            const horaStr = new Date(foto.dataUpload).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            doc.text(`Registrado em: ${dataStr} às ${horaStr}`, 105, 226, { align: 'center' });
          }
        } catch (err) {
          console.error('Erro ao renderizar foto única no PDF:', err);
        }
      } else {
        // 2 fotos lado a lado na Página 1
        const maxPage1 = Math.min(2, totalFotos);
        for (let i = 0; i < maxPage1; i++) {
          const foto = fotos[i];
          const xPos = i === 0 ? 16 : 108;
          try {
            const imgFormat = foto.foto.startsWith('data:image/png') ? 'PNG' : 'JPEG';
            doc.addImage(foto.foto, imgFormat, xPos, 154, 86, 56);
            doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.setLineWidth(0.4);
            doc.rect(xPos, 154, 86, 56, 'D');

            doc.setFontSize(8);
            doc.setTextColor(50, 50, 50);
            doc.setFont('helvetica', 'bold');
            const caption = foto.nome ? (foto.nome.length > 35 ? foto.nome.substring(0, 32) + '...' : foto.nome) : `Foto ${i + 1}`;
            doc.text(caption, xPos + 43, 214, { align: 'center' });

            if (foto.dataUpload) {
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(7);
              doc.setTextColor(110, 110, 110);
              const dataStr = new Date(foto.dataUpload).toLocaleDateString('pt-BR');
              doc.text(`Data: ${dataStr}`, xPos + 43, 218.5, { align: 'center' });
            }
          } catch (err) {
            console.error(`Erro ao renderizar foto ${i + 1} no PDF:`, err);
          }
        }

        if (totalFotos > 2) {
          doc.setFontSize(8);
          doc.setTextColor(45, 106, 79);
          doc.setFont('helvetica', 'bold');
          doc.text(`* Veja o registro fotográfico completo (${totalFotos} fotos) no Anexo Fotográfico na Página 2`, 105, 230, { align: 'center' });
        }
      }
    } else {
      doc.setFillColor(248, 249, 250);
      doc.rect(14, 154, 182, 40, 'F');
      doc.setDrawColor(220, 220, 220);
      doc.rect(14, 154, 182, 40, 'D');
      doc.setTextColor(120, 120, 120);
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'italic');
      doc.text('Nenhuma foto foi anexada a este canteiro até o momento.', 105, 175, { align: 'center' });
    }

    // Footer Signatures (Página 1)
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(20, 258, 90, 258);
    doc.line(120, 258, 190, 258);

    doc.setFontSize(8.5);
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'bold');
    doc.text(avaliacao?.usuarioAvaliador || amostra.responsavel || 'Avaliador de Qualidade', 55, 263, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text('Avaliador Técnico / Controle de Qualidade', 55, 267, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(60, 60, 60);
    doc.text('Responsável Técnico / Laboratório', 155, 263, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text('Supervisão e Controle de Qualidade CQ', 155, 267, { align: 'center' });

    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('Smart Canteiro CQ — Sistema Profissional de Controle de Qualidade de Sementes', 105, 285, { align: 'center' });

    // --- PÁGINA 2: ANEXO FOTOGRÁFICO COMPLETO (SE HOUVER MAIS DE 2 FOTOS) ---
    if (totalFotos > 2) {
      doc.addPage();

      // Header Banner Anexo
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 28, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('ANEXO FOTOGRÁFICO — REGISTRO DE CANTEIRO', 14, 14);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(`Protocolo: ${amostra.protocolo}  |  Cultura: ${amostra.cultura} (${amostra.cultivar})  |  Lote: ${amostra.lote}  |  Safra: ${amostra.safra}`, 14, 21);

      // Grid de Fotos no Anexo (2 colunas)
      let currentY = 36;
      for (let idx = 0; idx < fotos.length; idx++) {
        const foto = fotos[idx];
        const isLeft = idx % 2 === 0;
        const xPos = isLeft ? 16 : 108;

        if (idx > 0 && isLeft) {
          currentY += 76;
        }

        // Se passar da altura da página, cria nova página
        if (currentY + 68 > 275) {
          doc.addPage();
          currentY = 20;
        }

        try {
          const imgFormat = foto.foto.startsWith('data:image/png') ? 'PNG' : 'JPEG';
          doc.addImage(foto.foto, imgFormat, xPos, currentY, 86, 56);
          doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
          doc.setLineWidth(0.4);
          doc.rect(xPos, currentY, 86, 56, 'D');

          doc.setFontSize(8);
          doc.setTextColor(40, 40, 40);
          doc.setFont('helvetica', 'bold');
          doc.text(`Foto ${idx + 1}: ${foto.nome || 'Registro do Canteiro'}`, xPos, currentY + 61);

          if (foto.dataUpload) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(100, 100, 100);
            const dataStr = new Date(foto.dataUpload).toLocaleDateString('pt-BR');
            const horaStr = new Date(foto.dataUpload).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            doc.text(`Capturado em: ${dataStr} às ${horaStr}`, xPos, currentY + 65.5);
          }
        } catch (err) {
          console.error(`Erro ao adicionar foto ${idx + 1} no anexo do PDF:`, err);
        }
      }

      // Rodapé da Página do Anexo
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(`Smart Canteiro CQ — Anexo Fotográfico — Protocolo ${amostra.protocolo}`, 105, 287, { align: 'center' });
    }

    doc.save(`Laudo_CQ_${amostra.protocolo}_${amostra.cultura}.pdf`);
  }
};
