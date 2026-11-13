import { describe, it, expect, vi, beforeEach } from 'vitest';

interface Captured {
  blob: Blob | null;
  sheet: unknown[][] | null;
  pdfTexts: Array<{ text: string; y: number }>;
  pdfStartY: number | null;
}

const captured = vi.hoisted<Captured>(() => ({
  blob: null,
  sheet: null,
  pdfTexts: [],
  pdfStartY: null,
}));

vi.mock('xlsx', () => ({
  utils: {
    aoa_to_sheet: (data: unknown[][]) => {
      captured.sheet = data;
      return {};
    },
    book_new: () => ({}),
    book_append_sheet: () => {},
  },
  writeFile: () => {},
}));

vi.mock('jspdf', () => ({
  default: class FakeJsPdf {
    text(text: string, _x: number, y: number) {
      captured.pdfTexts.push({ text, y });
    }
    setFontSize() {}
    splitTextToSize(text: string) {
      return [text];
    }
    save() {}
  },
}));

vi.mock('jspdf-autotable', () => ({
  default: (_doc: unknown, options: { startY: number }) => {
    captured.pdfStartY = options.startY;
  },
}));

const { exportToCSV, exportToExcel, exportToPDF } = await import('../exportUtils');

const headers = ['Exchange', 'Asset', 'Total Trades'];
const rows = [['Bybit', 'USDT', 12]];
const note = 'Incomplete USD totals: No USD price found for XYZ — these assets are excluded from the totals.';

beforeEach(() => {
  captured.blob = null;
  captured.sheet = null;
  captured.pdfTexts = [];
  captured.pdfStartY = null;
  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob: Blob | MediaSource) => {
    captured.blob = blob as Blob;
    return 'blob:test';
  });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});

describe('exportUtils notes', () => {
  it('puts the note above the CSV header as a comment instead of a data row', async () => {
    exportToCSV({ title: 'Report', filename: 'test', headers, rows, notes: [note] });

    const lines = (await captured.blob!.text()).split('\n');
    expect(lines[0]).toBe(`"# ${note}"`);
    expect(lines[1]).toBe('');
    expect(lines[2]).toBe('Exchange,Asset,Total Trades');
    expect(lines[3]).toBe('"Bybit","USDT","12"');
  });

  it('keeps the CSV unchanged when there is no note', async () => {
    exportToCSV({ title: 'Report', filename: 'test', headers, rows });

    const lines = (await captured.blob!.text()).split('\n');
    expect(lines[0]).toBe('Exchange,Asset,Total Trades');
    expect(lines).toHaveLength(2);
  });

  it('writes the note into the Excel sheet above the header row', async () => {
    await exportToExcel({ title: 'Report', filename: 'test', headers, rows, notes: [note] });

    expect(captured.sheet).toEqual([[note], [], headers, ...rows]);
  });

  it('prints the note on the PDF and starts the table below it', async () => {
    await exportToPDF({ title: 'Report', filename: 'test', headers, rows, notes: [note] });

    expect(captured.pdfTexts.map(t => t.text)).toContain(note);
    expect(captured.pdfStartY).toBeGreaterThan(28);
  });

  it('starts the PDF table at the default position without notes', async () => {
    await exportToPDF({ title: 'Report', filename: 'test', headers, rows });

    expect(captured.pdfStartY).toBe(28);
  });
});
