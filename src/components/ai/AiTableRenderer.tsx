import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, Copy, Check, ArrowUpDown, FileSpreadsheet } from 'lucide-react';
import toast from 'react-hot-toast';

interface AiTableRendererProps {
  children: React.ReactNode;
}

export const AiTableRenderer: React.FC<AiTableRendererProps> = ({ children }) => {
  const [copied, setCopied] = useState(false);
  const [sortColIndex, setSortColIndex] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Extract tabular data from React children nodes
  const extractTableData = (): { headers: string[]; rows: string[][] } => {
    const headers: string[] = [];
    const rows: string[][] = [];

    const recurseFind = (node: any) => {
      if (!node) return;
      if (typeof node === 'string' || typeof node === 'number') {
        return String(node);
      }
      if (Array.isArray(node)) {
        return node.map(recurseFind).filter(Boolean).join(' ');
      }
      if (node.props && node.props.children) {
        return recurseFind(node.props.children);
      }
      return '';
    };

    // Traverse React elements structure of <table>
    React.Children.forEach(children, (child: any) => {
      if (!child || !child.props) return;

      // Find thead
      if (child.type === 'thead' || child.props.children) {
        const thead = child.type === 'thead' ? child : null;
        if (thead && thead.props.children) {
          const trs = React.Children.toArray(thead.props.children);
          trs.forEach((tr: any) => {
            if (tr?.props?.children) {
              const ths = React.Children.toArray(tr.props.children);
              ths.forEach((th: any) => {
                const text = recurseFind(th).trim();
                if (text) headers.push(text);
              });
            }
          });
        }
      }

      // Find tbody
      if (child.type === 'tbody' || child.props.children) {
        const tbody = child.type === 'tbody' ? child : null;
        if (tbody && tbody.props.children) {
          const trs = React.Children.toArray(tbody.props.children);
          trs.forEach((tr: any) => {
            if (tr?.props?.children) {
              const tds = React.Children.toArray(tr.props.children);
              const rowData: string[] = [];
              tds.forEach((td: any) => {
                const text = recurseFind(td).trim();
                rowData.push(text);
              });
              if (rowData.length > 0) rows.push(rowData);
            }
          });
        }
      }
    });

    return { headers, rows };
  };

  const handleExportExcel = () => {
    try {
      const { headers, rows } = extractTableData();
      if (headers.length === 0 && rows.length === 0) {
        toast.error('No table data to export');
        return;
      }

      const aoa: any[][] = [];
      if (headers.length > 0) aoa.push(headers);
      rows.forEach((r) => aoa.push(r));

      const worksheet = XLSX.utils.aoa_to_sheet(aoa);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'PIKA_Analysis');

      const fileName = `PIKA_Financial_Data_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast.success('Excel spreadsheet downloaded (.xlsx)', {
        id: 'table-excel-export',
        duration: 2500,
        style: {
          background: '#151619',
          color: '#ffffff',
          border: '1px solid #10B981',
          fontSize: '12px',
        },
      });
    } catch (err) {
      console.error('Failed to export Excel', err);
      toast.error('Failed to generate Excel file');
    }
  };

  const handleCopyForSheets = async () => {
    try {
      const { headers, rows } = extractTableData();
      if (headers.length === 0 && rows.length === 0) {
        toast.error('No table data to copy');
        return;
      }

      // Tab-Separated Values (TSV) format pastes natively into Google Sheets and Excel
      const lines: string[] = [];
      if (headers.length > 0) lines.push(headers.join('\t'));
      rows.forEach((r) => lines.push(r.join('\t')));
      const tsvContent = lines.join('\n');

      await navigator.clipboard.writeText(tsvContent);
      setCopied(true);
      toast.success('Copied for Google Sheets & Excel (paste directly with Ctrl+V)', {
        id: 'table-copy-sheets',
        duration: 3000,
        style: {
          background: '#151619',
          color: '#ffffff',
          border: '1px solid #2F6BFF',
          fontSize: '12px',
        },
      });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Failed to copy table data');
    }
  };

  return (
    <div className="my-3 rounded-xl border border-[#2a2b30] bg-[#0c0d11] overflow-hidden shadow-lg text-xs">
      {/* Top Table Toolbar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#14151a] border-b border-[#2a2b30] text-[11px] text-[#8E9299]">
        <div className="flex items-center gap-1.5 font-medium text-gray-300">
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
          <span>Financial Data Table</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Copy to Sheets / TSV */}
          <button
            type="button"
            onClick={handleCopyForSheets}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1d1f27] hover:bg-[#262833] text-gray-300 hover:text-white border border-[#2e303c] transition cursor-pointer text-[10px]"
            title="Copy as Tab-Separated Values to paste directly in Google Sheets or Excel"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-[#2F6BFF]" />
                <span>Copy for Sheets</span>
              </>
            )}
          </button>

          {/* Export .xlsx */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition cursor-pointer text-[10px] font-medium"
            title="Download formatted Excel spreadsheet (.xlsx)"
          >
            <Download className="w-3 h-3 text-emerald-400" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Actual Rendered Table */}
      <div className="overflow-x-auto max-w-full">
        <table className="w-full text-left text-[11px] border-collapse">{children}</table>
      </div>
    </div>
  );
};
