import { UnifiedHistoryPosition } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { format } from 'date-fns';

const formatCurrency = (val: number) => `$${Math.abs(val).toFixed(2)}${val < 0 ? '-' : ''}`; // simplified for export

const getExportData = (history: UnifiedHistoryPosition[]) => {
  return history.map(pos => ({
    'Date': format(new Date(pos.closeUpdateTime), 'yyyy-MM-dd HH:mm'),
    'Exchange': pos.exchange,
    'Symbol': pos.symbol,
    'Side': pos.side.toUpperCase(),
    'Size': pos.size || 0,
    'Entry Price': pos.entryPrice || 0,
    'Close Price': pos.closePrice || 0,
    'Trading Fee': pos.tradingFee || 0,
    'Funding Fee': pos.fundingFee || 0,
    'Net PnL': pos.realizedPnl + (pos.fundingFee || 0) + (pos.tradingFee || 0)
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

export const exportToExcel = async (history: UnifiedHistoryPosition[]) => {
  const data = getExportData(history);
  if (data.length === 0) return;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Report');

  const headers = Object.keys(data[0]);
  worksheet.addRow(headers);

  data.forEach((obj) => {
    worksheet.addRow(Object.values(obj));
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `trading_report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  link.click();
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
