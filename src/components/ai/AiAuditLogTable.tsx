import React, { useState, useEffect } from 'react';
import { Eye, Download, Trash2, RefreshCw, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AiAuditLogEntry } from '../../types/aiTypes';
import { aiAuditLogger } from '../../services/ai/aiAuditLogger';
import { AiAuditDetailsModal } from './AiAuditDetailsModal';
import { AppTooltip } from '../ui/Tooltip';
import toast from 'react-hot-toast';

export const AiAuditLogTable: React.FC = () => {
  const [logs, setLogs] = useState<AiAuditLogEntry[]>([]);
  const [selectedLog, setSelectedLog] = useState<AiAuditLogEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await aiAuditLogger.getRecentLogs(50);
      setLogs(data);
    } catch {
      // Ignored
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleExportJson = async () => {
    try {
      const jsonStr = await aiAuditLogger.exportLogsAsJson();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pika-ai-audit-logs-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Logs exported in JSON format');
    } catch {
      toast.error('Error exporting logs');
    }
  };

  const handleExportCsv = async () => {
    try {
      const csvStr = await aiAuditLogger.exportLogsAsCsv();
      const blob = new Blob([csvStr], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pika-ai-audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Logs exported in CSV format');
    } catch {
      toast.error('Error exporting logs');
    }
  };

  const handleClear = async () => {
    await aiAuditLogger.clearLogs();
    setLogs([]);
    setShowClearConfirm(false);
    toast.success('Audit history cleared', { icon: '🧹' });
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="bg-[#151619] border border-[#2a2b30] rounded-xl overflow-hidden shadow-xl relative">
      {/* Clear Logs Confirmation Overlay */}
      {showClearConfirm && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-30 animate-in fade-in-0">
          <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-5 max-w-xs w-full text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Clear Audit Logs?</h3>
              <p className="text-xs text-[#8E9299] mt-1">
                Are you sure you want to delete all local execution logs? This cannot be undone.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2 bg-[#1e1f24] hover:bg-[#2a2b30] text-gray-300 rounded-lg text-xs font-semibold transition cursor-pointer border border-[#2a2b30]"
              >
                Cancel
              </button>
              <button
                onClick={handleClear}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-4 border-b border-[#2a2b30] bg-[#151619]">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#2F6BFF]" />
            Call History & Audit Trail
          </h3>
          <p className="text-xs text-[#8E9299]">
            Transparent register of all local inferences, triggered tools, and token consumption
          </p>
        </div>

        <div className="flex items-center gap-2">
          <AppTooltip description="Refresh log list" side="top">
            <button
              onClick={fetchLogs}
              disabled={isLoading}
              className="p-1.5 bg-[#1e1f24] hover:bg-[#2a2b30] text-[#8E9299] hover:text-white rounded-lg text-xs transition cursor-pointer border border-[#2a2b30]"
              aria-label="Refresh Logs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </AppTooltip>

          <AppTooltip description="Export history as JSON" side="top">
            <button
              onClick={handleExportJson}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#1e1f24] hover:bg-[#2a2b30] text-gray-200 border border-[#2a2b30] rounded-lg text-xs font-medium transition cursor-pointer"
            >
              <Download className="w-3 h-3 text-[#2F6BFF]" />
              JSON
            </button>
          </AppTooltip>

          <AppTooltip description="Export history as CSV" side="top">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#1e1f24] hover:bg-[#2a2b30] text-gray-200 border border-[#2a2b30] rounded-lg text-xs font-medium transition cursor-pointer"
            >
              <Download className="w-3 h-3 text-emerald-400" />
              CSV
            </button>
          </AppTooltip>

          {logs.length > 0 && (
            <AppTooltip description="Clear all audit log entries" side="top">
              <button
                onClick={() => setShowClearConfirm(true)}
                className="p-1.5 bg-[#1e1f24] hover:bg-rose-900/40 text-[#8E9299] hover:text-rose-400 border border-[#2a2b30] rounded-lg text-xs transition cursor-pointer"
                aria-label="Clear Logs"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </AppTooltip>
          )}
        </div>
      </div>

      <div className="overflow-x-auto bg-[#0b0c10]">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#2a2b30] bg-[#151619] text-[#8E9299] uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4">Date/Time</th>
              <th className="py-3 px-4">Model & Provider</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Query</th>
              <th className="py-3 px-4 text-right">Tokens</th>
              <th className="py-3 px-4 text-right">Duration</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2b30] text-gray-300">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-[#8E9299]">
                  No audit log entries recorded yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-[#151619]/80 transition">
                  <td className="py-3 px-4 font-mono text-[11px] text-[#8E9299]">
                    {formatTime(log.timestamp)}
                  </td>
                  <td className="py-3 px-4 font-medium text-white">
                    <div>{log.modelName}</div>
                    <div className="text-[10px] text-[#8E9299] font-mono">
                      {log.provider} {log.wasFallback && '• Fallback'}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#1e1f24] text-gray-300 border border-[#2a2b30]">
                      {log.type === 'chat_query' ? 'Chat' : 'Diagnostic'}
                    </span>
                  </td>
                  <td className="py-3 px-4 max-w-xs truncate text-gray-200" title={log.userMessage}>
                    {log.userMessage}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-400 font-medium">
                    {log.totalTokens}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-amber-400">
                    {log.durationMs}ms
                  </td>
                  <td className="py-3 px-4 text-center">
                    {log.status === 'success' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" /> Success
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                        <AlertCircle className="w-3 h-3" /> Error
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <AppTooltip description="View complete execution details" side="left">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 text-[#8E9299] hover:text-[#2F6BFF] rounded-lg hover:bg-[#1e1f24] transition cursor-pointer"
                        aria-label="View Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </AppTooltip>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AiAuditDetailsModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
};
