import { formatIsoDateTime } from './dateTimeHelper';

export interface ExportConfig {
  title: string;
  filename: string;
  /** Header notes (e.g. assets missing a price). Printed above the table, never as data rows. */
  notes?: string[];
  headers: string[];
  rows: (string | number)[][];
}

const normalizeNotes = (notes?: string[]) =>
  (notes || []).map(note => String(note).replace(/\r?\n/g, ' ').trim()).filter(Boolean);

export const exportToCSV = (config: ExportConfig) => {
  const { filename, headers, rows } = config;
  if (rows.length === 0) return;

  const quote = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const notes = normalizeNotes(config.notes);

  const csvContent = [
    ...(notes.length > 0 ? [...notes.map(note => quote(`# ${note}`)), ''] : []),
    headers.join(','),
    ...rows.map(row => row.map(quote).join(','))
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

  // Loaded on demand: keeps the ~900 kB SheetJS parser out of the initial bundle.
  const XLSX = await import('xlsx');

  const notes = normalizeNotes(config.notes);
  const headerRows: (string | number)[][] = notes.length > 0 ? [...notes.map(note => [note]), [], headers] : [headers];
  const worksheet = XLSX.utils.aoa_to_sheet([...headerRows, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
  
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const exportToPDF = async (config: ExportConfig) => {
  const { title, filename, headers, rows } = config;
  if (rows.length === 0) return;

  // Loaded on demand: jsPDF + autotable are only needed when the user actually exports.
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF();
  
  doc.text(title, 14, 15);
  doc.setFontSize(10);
  doc.text(`Generated: ${formatIsoDateTime(Date.now(), true, false)}`, 14, 22);

  let cursorY = 22;
  normalizeNotes(config.notes).forEach(note => {
    const lines = doc.splitTextToSize(note, 180) as string[];
    lines.forEach(line => {
      cursorY += 5;
      doc.text(line, 14, cursorY);
    });
  });

  autoTable(doc, {
    head: [headers],
    body: rows.map(r => r.map(String)),
    startY: cursorY + 6,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [47, 107, 255] }
  });

  doc.save(`${filename}.pdf`);
};
