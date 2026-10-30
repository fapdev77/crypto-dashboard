import React, { useState, useMemo } from 'react';
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
    toast.success('JSON copiado com sucesso!', { icon: '📋' });
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
      toast.success('Arquivo baixado!');
    } catch {
      toast.error('Erro ao baixar arquivo');
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
    <div className="bg-[#0e0f12] border border-[#232429] rounded-xl overflow-hidden font-mono text-[11px] shadow-md">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#15161a] border-b border-[#232429] gap-2">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-2 text-gray-300 hover:text-white transition cursor-pointer font-sans font-semibold text-xs text-left truncate"
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-[#8E9299]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#8E9299]" />}
          <span className="truncate">{title || 'Payload JSON'}</span>
          <span className="text-[10px] text-[#8E9299] font-normal font-mono bg-[#1f2026] px-1.5 py-0.5 rounded">
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
                className="w-28 focus:w-40 bg-[#0e0f12] border border-[#2a2b30] focus:border-[#2F6BFF] rounded-md px-2 py-0.5 text-[10px] text-gray-200 placeholder-[#8E9299] transition-all outline-none"
              />
              <Search className="w-2.5 h-2.5 text-[#8E9299] absolute right-2 top-2 pointer-events-none" />
            </div>
          )}

          <button
            onClick={handleCopy}
            title="Copiar JSON"
            className="flex items-center gap-1 px-2 py-1 bg-[#1e1f24] hover:bg-[#2a2b30] text-gray-300 hover:text-white rounded-md text-[10px] font-sans font-medium transition cursor-pointer border border-[#2a2b30]"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-[#2F6BFF]" />}
            <span>{copied ? 'Copiado' : 'Copiar'}</span>
          </button>

          <button
            onClick={handleDownload}
            title="Baixar arquivo JSON"
            className="p-1 bg-[#1e1f24] hover:bg-[#2a2b30] text-[#8E9299] hover:text-white rounded-md text-[10px] transition cursor-pointer border border-[#2a2b30]"
          >
            <Download className="w-3 h-3 text-[#8E9299]" />
          </button>
        </div>
      </div>

      {/* Code body */}
      {!isCollapsed && (
        <div className={`${maxHeight} overflow-auto p-3.5 bg-[#090a0d] leading-relaxed text-gray-300 select-text`}>
          <pre className="font-mono text-[11px] whitespace-pre">
            {highlightedLines.map((line, idx) => {
              const isMatch = searchTerm.trim() && line.toLowerCase().includes(searchTerm.toLowerCase());
              return (
                <div
                  key={idx}
                  className={`table-row ${isMatch ? 'bg-[#2F6BFF]/20 text-yellow-200 font-bold' : ''}`}
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
