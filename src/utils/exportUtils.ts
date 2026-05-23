import { UnifiedHistoryPosition } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

const formatCurrency = (val: number) => `$${Math.abs(val).toFixed(2)}${val < 0 ? '-' : ''}`; // simplified for export

const getExportData = (history: UnifiedHistoryPosition[]) => {
  return history.map(p => ({
    'Date': format(new Date(p.closeTime), 'yyyy-MM-dd HH:mm'),
    'Exchange': p.exchange,
    'Symbol': p.symbol,
    'Side': p.side.toUpperCase(),
    'Size': p.size || 0,
    'Entry Price': p.entryPrice || 0,
    'Close Price': p.closePrice || 0,
    'Trading Fee': p.tradingFee || 0,
    'Funding Fee': p.fundingFee || 0,
    'Net PnL': p.realizedPnl + (p.fundingFee || 0) + (p.tradingFee || 0)
  }));
};

export const exportToCSV = (history: UnifiedHistoryPosition[]) => {
  const data = getExportData(history);
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(obj => Object.values(obj).join(','));
  const csvContent = [headers, ...rows].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `trading_report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  link.click();
};

export const exportToExcel = (history: UnifiedHistoryPosition[]) => {
  const data = getExportData(history);
  if (data.length === 0) return;

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
  
  XLSX.writeFile(workbook, `trading_report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
};

export const exportToPDF = (history: UnifiedHistoryPosition[]) => {
  const data = getExportData(history);
  if (data.length === 0) return;

  const doc = new jsPDF();
  
  doc.text('Trading Performance Report', 14, 15);
  doc.setFontSize(10);
  doc.text(`Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, 14, 22);

  const headers = Object.keys(data[0]);
  const rows = data.map(obj => Object.values(obj).map(v => String(v)));

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 28,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [47, 107, 255] }
  });

  doc.save(`trading_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};
