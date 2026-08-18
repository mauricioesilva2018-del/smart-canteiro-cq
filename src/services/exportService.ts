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
    doc.text('3. REGISTRO FOTOGRÁFICO DO CANTEIRO', 18, 152);

    if (fotos && fotos.length > 0) {
      let yOffset = 157;
      let xOffset = 18;
      
      fotos.slice(0, 4).forEach((foto, index) => {
        try {
          doc.addImage(foto.foto, 'JPEG', xOffset, yOffset, 80, 55);
          doc.setDrawColor(200, 200, 200);
          doc.rect(xOffset, yOffset, 80, 55, 'D');

          doc.setFontSize(7.5);
          doc.setTextColor(60, 60, 60);
          doc.text(foto.nome || `Foto ${index + 1}`, xOffset, yOffset + 58);

          if (index % 2 === 0) {
            xOffset = 112;
          } else {
            xOffset = 18;
            yOffset += 65;
          }
        } catch (err) {
          console.error('Erro ao adicionar foto ao PDF:', err);
        }
      });
    } else {
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'italic');
      doc.text('Nenhuma foto foi anexada a esta amostra.', 18, 160);
    }

    // Footer Signatures
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(20, 272, 90, 272);
    doc.line(120, 272, 190, 272);

    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'normal');
    doc.text('Avaliador de Qualidade', 55, 276, { align: 'center' });
    doc.text('Supervisão do Laboratório CQ', 155, 276, { align: 'center' });

    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('Smart Canteiro CQ - Sistema de Controle de Qualidade Agricola', 105, 287, { align: 'center' });

    doc.save(`Laudo_CQ_${amostra.protocolo}_${amostra.cultura}.pdf`);
  }
};
