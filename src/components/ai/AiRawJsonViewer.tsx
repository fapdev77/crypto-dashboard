import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check, Search, ChevronDown, ChevronRight, Download } from 'lucide-react';
import toast from 'react-hot-toast';

interface AiRawJsonViewerProps {
  data: any;
  title?: string;
  defaultExpanded?: boolean;
  maxHeight?: string;
}

export const AiRawJsonViewer: React.FC<AiRawJsonViewerProps> = ({
  data,
  title,
  defaultExpanded = true,
  maxHeight = 'max-h-96',
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(!defaultExpanded);

  const formattedJson = useMemo(() => {
    try {
      if (typeof data === 'string') {
        try {
          return JSON.stringify(JSON.parse(data), null, 2);
        } catch {
          return data;
        }
      }
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }, [data]);

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedJson);
    setCopied(true);
    toast.success(t('toasts.jsonCopied', 'JSON copied successfully!'), { icon: '📋' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    try {
      const blob = new Blob([formattedJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `debug-payload-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t('toasts.fileDownloaded', 'File downloaded!'));
    } catch {
      toast.error(t('toasts.fileDownloadError', 'Error downloading file'));
    }
  };

  const lineCount = useMemo(() => {
    return formattedJson ? formattedJson.split('\n').length : 0;
  }, [formattedJson]);

  const byteSize = useMemo(() => {
    return new Blob([formattedJson]).size;
  }, [formattedJson]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  // Simple token highlight for JSON strings
  const highlightedLines = useMemo(() => {
    if (!formattedJson) return [];
    const lines = formattedJson.split('\n');
    if (!searchTerm.trim()) return lines;

    return lines;
  }, [formattedJson, searchTerm]);

  return (
    <div className="bg-[#0e0f12] border border-line rounded-xl overflow-hidden font-mono text-[11px] shadow-md">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#15161a] border-b border-line gap-2">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-2 text-fg hover:text-fg transition cursor-pointer font-sans font-semibold text-xs text-left truncate"
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-fg-muted" /> : <ChevronDown className="w-3.5 h-3.5 text-fg-muted" />}
          <span className="truncate">{title || 'Payload JSON'}</span>
          <span className="text-[10px] text-fg-muted font-normal font-mono bg-line px-1.5 py-0.5 rounded">
            {lineCount} linhas • {formatSize(byteSize)}
          </span>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          {!isCollapsed && (
            <div className="relative hidden sm:block">
              <input
                type="text"
                placeholder="Filtrar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-28 focus:w-40 bg-[#0e0f12] border border-line focus:border-accent rounded-md px-2 py-0.5 text-[10px] text-fg placeholder-fg-muted transition-all outline-none"
              />
              <Search className="w-2.5 h-2.5 text-fg-muted absolute right-2 top-2 pointer-events-none" />
            </div>
          )}

          <button
            onClick={handleCopy}
            title="Copiar JSON"
            className="flex items-center gap-1 px-2 py-1 bg-elevated hover:bg-line text-fg hover:text-fg rounded-md text-[10px] font-sans font-medium transition cursor-pointer border border-line"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-accent" />}
            <span>{copied ? 'Copiado' : 'Copiar'}</span>
          </button>

          <button
            onClick={handleDownload}
            title="Baixar arquivo JSON"
            className="p-1 bg-elevated hover:bg-line text-fg-muted hover:text-fg rounded-md text-[10px] transition cursor-pointer border border-line"
          >
            <Download className="w-3 h-3 text-fg-muted" />
          </button>
        </div>
      </div>

      {/* Code body */}
      {!isCollapsed && (
        <div className={`${maxHeight} overflow-auto p-3.5 bg-[#090a0d] leading-relaxed text-fg select-text`}>
          <pre className="font-mono text-[11px] whitespace-pre">
            {highlightedLines.map((line, idx) => {
              const isMatch = searchTerm.trim() && line.toLowerCase().includes(searchTerm.toLowerCase());
              return (
                <div
                  key={idx}
                  className={`table-row ${isMatch ? 'bg-accent/20 text-yellow-200 font-bold' : ''}`}
                >
                  <span className="table-cell select-none pr-3 text-[#4b4e57] text-[10px] text-right">
                    {idx + 1}
                  </span>
                  <span className="table-cell whitespace-pre">{line}</span>
                </div>
              );
            })}
          </pre>
        </div>
      )}
    </div>
  );
};
