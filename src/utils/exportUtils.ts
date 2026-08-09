import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { formatIsoDateTime } from './dateTimeHelper';

export interface ExportConfig {
  title: string;
  filename: string;
  headers: string[];
  rows: (string | number)[][];
}

export const exportToCSV = (config: ExportConfig) => {
  const { filename, headers, rows } = config;
  if (rows.length === 0) return;
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
};

export const exportToExcel = async (config: ExportConfig) => {
  const { filename, headers, rows } = config;
  if (rows.length === 0) return;

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
  
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const exportToPDF = (config: ExportConfig) => {
  const { title, filename, headers, rows } = config;
  if (rows.length === 0) return;

  const doc = new jsPDF();
  
  doc.text(title, 14, 15);
  doc.setFontSize(10);
  doc.text(`Generated: ${formatIsoDateTime(Date.now(), true, false)}`, 14, 22);

  autoTable(doc, {
    head: [headers],
    body: rows.map(r => r.map(String)),
    startY: 28,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [47, 107, 255] }
  });

  doc.save(`${filename}.pdf`);
};
