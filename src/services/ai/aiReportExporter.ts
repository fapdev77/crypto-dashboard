import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

export interface ExportReportOptions {
  title?: string;
  markdownContent: string;
  modelName?: string;
  timestamp?: string;
  toolsInvoked?: string[];
}

/**
 * Clean markdown symbols for plain-text presentation in PDF
 */
function cleanMarkdownForPdf(text: string): string {
  return text
    .replace(/^#+\s+/gm, '') // Remove heading hashes
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.*?)\*/g, '$1') // Remove italics
    .replace(/`([^`]+)`/g, '$1') // Remove inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Replace links with title
    .replace(/^[-*+]\s+/gm, '• '); // Replace bullets
}

/**
 * Extract markdown tables from raw text to render using jspdf-autotable
 */
function extractMarkdownTables(markdown: string): { headers: string[]; rows: string[][] }[] {
  const tables: { headers: string[]; rows: string[][] }[] = [];
  const lines = markdown.split('\n');
  let currentTableLines: string[] = [];
  let inTable = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      inTable = true;
      currentTableLines.push(trimmed);
    } else {
      if (inTable && currentTableLines.length >= 2) {
        // Parse collected table
        const table = parseTableLines(currentTableLines);
        if (table) tables.push(table);
      }
      inTable = false;
      currentTableLines = [];
    }
  }

  if (inTable && currentTableLines.length >= 2) {
    const table = parseTableLines(currentTableLines);
    if (table) tables.push(table);
  }

  return tables;
}

function parseTableLines(lines: string[]): { headers: string[]; rows: string[][] } | null {
  if (lines.length < 2) return null;

  const parseRow = (line: string) =>
    line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim().replace(/\*\*/g, ''));

  const headers = parseRow(lines[0]);
  // Line 1 is the separator (|---|---|)
  const rows: string[][] = [];
  for (let i = 2; i < lines.length; i++) {
    const r = parseRow(lines[i]);
    if (r.length > 0) rows.push(r);
  }

  return { headers, rows };
}

/**
 * Generate a high-fidelity executive financial report PDF from AI analysis
 */
export async function exportAiAnalysisToPdf(options: ExportReportOptions): Promise<void> {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let cursorY = margin;

    // Header Band
    doc.setFillColor(15, 17, 23); // #0f1117
    doc.rect(0, 0, pageWidth, 28, 'F');

    // Title & Brand
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('PIKA PORTFOLIO INTELLIGENCE', margin, 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(142, 146, 153);
    doc.text('Quantitative Financial Audit & Executive Report', margin, 18);

    // Metadata Right-Aligned
    const reportDate = options.timestamp || new Date().toLocaleString('en-US');
    doc.setFontSize(7);
    doc.text(`Generated: ${reportDate}`, pageWidth - margin, 12, { align: 'right' });
    if (options.modelName) {
      doc.text(`Engine: ${options.modelName}`, pageWidth - margin, 17, { align: 'right' });
    }

    cursorY = 36;

    // Report Title
    doc.setTextColor(33, 37, 41);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(options.title || 'Executive Analysis & Audit Diagnostics', margin, cursorY);
    cursorY += 8;

    // Extract tables and narrative text
    const tables = extractMarkdownTables(options.markdownContent);

    // Strip table blocks from narrative to print clean text paragraphs
    const narrativeLines = options.markdownContent
      .split('\n')
      .filter((l) => !(l.trim().startsWith('|') && l.trim().endsWith('|')))
      .join('\n');

    const cleanNarrative = cleanMarkdownForPdf(narrativeLines);

    doc.setTextColor(55, 65, 81);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    const splitText = doc.splitTextToSize(cleanNarrative, pageWidth - margin * 2);

    for (let i = 0; i < splitText.length; i++) {
      if (cursorY > pageHeight - 20) {
        doc.addPage();
        cursorY = margin;
      }
      doc.text(splitText[i], margin, cursorY);
      cursorY += 4.5;
    }

    // Render Tables using autoTable if any exist
    if (tables.length > 0) {
      cursorY += 4;
      for (const table of tables) {
        if (cursorY > pageHeight - 35) {
          doc.addPage();
          cursorY = margin;
        }

        autoTable(doc, {
          startY: cursorY,
          head: [table.headers],
          body: table.rows,
          margin: { left: margin, right: margin },
          theme: 'striped',
          headStyles: {
            fillColor: [31, 35, 45],
            textColor: [255, 255, 255],
            fontSize: 8,
            fontStyle: 'bold',
          },
          bodyStyles: {
            fontSize: 8,
            textColor: [40, 40, 40],
          },
          alternateRowStyles: {
            fillColor: [245, 247, 250],
          },
        });

        const lastAutoTable = (doc as any).lastAutoTable;
        if (lastAutoTable && lastAutoTable.finalY) {
          cursorY = lastAutoTable.finalY + 8;
        }
      }
    }

    // Footer Disclaimer on All Pages
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFontSize(6.5);
      doc.setTextColor(140, 140, 140);
      doc.text(
        'CONFIDENTIAL & PROPRIETARY — PIKA CAPITAL ADVISORY. FOR AUDITING & DECISION SUPPORT ONLY. NOT INVESTMENT ADVICE.',
        margin,
        pageHeight - 8
      );
      doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
    }

    // Save PDF
    const fileName = `PIKA_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);

    toast.success('Executive PDF report downloaded (.pdf)', {
      id: 'pdf-export-success',
      duration: 3000,
      style: {
        background: '#151619',
        color: '#ffffff',
        border: '1px solid #2F6BFF',
        fontSize: '12px',
      },
    });
  } catch (err) {
    console.error('Failed to export PDF report', err);
    toast.error('Failed to generate PDF document');
  }
}
