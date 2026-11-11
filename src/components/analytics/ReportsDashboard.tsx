import React, { useState } from 'react';
import { usePositionHistory, PositionHistoryPeriod } from '../../hooks/usePositionHistory';
import { exportToCSV, exportToExcel, exportToPDF, ExportConfig } from '../../utils/exportUtils';
import { Download, ChevronDown, FileText } from 'lucide-react';
import { formatIsoDateTime, formatDateTime } from '../../utils/formatters';
import { HistoryLimitWarning } from '../ui/HistoryLimitWarning';
import { useFormatCurrency } from '../../hooks/useFormatCurrency';
import { getHistoryInverseUsdValues } from '../../utils/inverseUtils';
import { FilterBar } from '../ui/FilterBar';
import { SimulationModeBadge } from '../ui/SimulationModeBadge';
import { useTranslation } from 'react-i18next';

export function ReportsDashboard() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<PositionHistoryPeriod>('7d');
  const [exchange, setExchange] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const { positions: history, isLoading } = usePositionHistory(period, exchange, searchTerm);
  const formatCurrency = useFormatCurrency();

  const getExportConfig = (): ExportConfig => {
    const headers = [
      t('analytics.reports.colDate', 'Date'),
      t('analytics.reports.colExchange', 'Exchange'),
      t('analytics.reports.colSymbol', 'Symbol'),
      t('analytics.reports.colSide', 'Side'),
      t('analytics.reports.colSize', 'Size'),
      t('analytics.reports.colEntryPrice', 'Entry Price'),
      t('analytics.reports.colClosePrice', 'Close Price'),
      t('analytics.reports.colTradingFee', 'Trading Fee'),
      t('analytics.reports.colFundingFee', 'Funding Fee'),
      t('analytics.reports.colNetPnl', 'Net PnL')
    ];
    const rows = history.map(pos => {
      const { realizedPnl, fundingFee, tradingFee } = getHistoryInverseUsdValues(pos);
      return [
        formatIsoDateTime(pos.closeUpdateTime, true, false),
        pos.exchange,
        pos.symbol,
        pos.side.toUpperCase(),
        pos.size || 0,
        pos.entryPrice || 0,
        pos.closePrice || 0,
        tradingFee || 0,
        fundingFee || 0,
        realizedPnl + (fundingFee || 0) + (tradingFee || 0)
      ];
    });
    return {
      title: t('analytics.reports.reportTitle', 'Trading Performance Report'),
      filename: `trading_report_${formatIsoDateTime(Date.now(), false)}`,
      headers,
      rows
    };
  };

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    setExportMenuOpen(false);
    if (format === 'csv') exportToCSV(getExportConfig());
    if (format === 'excel') exportToExcel(getExportConfig());
    if (format === 'pdf') exportToPDF(getExportConfig());
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start justify-between gap-4 py-2">
        <div className="flex flex-col space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2 text-fg">
              <FileText className="w-5 h-5 text-accent" />
              {t('analytics.reports.title', 'Reports & Exports')}
            </h2>
            <SimulationModeBadge />
          </div>
          <span className="text-xs text-fg-muted">
            {t('analytics.reports.subtitle', 'Values converted based on positions close price in your selected currency.')}
          </span>
        </div>
        <div className="relative">
          <button
            onClick={() => setExportMenuOpen(!exportMenuOpen)}
            className="px-3 py-2 bg-elevated border border-line text-fg flex items-center gap-2 rounded-lg hover:bg-line/50 transition-colors text-sm focus:outline-none disabled:opacity-50"
            disabled={isLoading || history.length === 0}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{t('analytics.reports.exportBtn', 'Export')}</span> <ChevronDown className="w-3 h-3" />
          </button>
          {exportMenuOpen && (
            <div className="absolute top-11 right-0 w-36 bg-elevated border border-line rounded-lg shadow-xl z-50 overflow-hidden text-sm text-fg">
              <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-2 hover:bg-line/50 transition-colors">
                {t('analytics.reports.exportCsv', 'Export CSV')}
              </button>
              <button onClick={() => handleExport('excel')} className="w-full text-left px-4 py-2 hover:bg-line/50 transition-colors">
                {t('analytics.reports.exportExcel', 'Export Excel')}
              </button>
              <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2 hover:bg-line/50 transition-colors">
                {t('analytics.reports.exportPdf', 'Export PDF')}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="px-0">
        <FilterBar
          exchange={{
            value: exchange,
            onChange: setExchange,
            labelAll: t('common.allExchanges', 'All Exchanges'),
          }}
          period={{
            value: period,
            onChange: setPeriod,
            options: [
              { value: 'today', label: t('common.customDateModal.last7Days', 'Last 7 Days').replace('7', '1') },
              { value: '7d', label: '7 Days' },
              { value: '14d', label: '14 Days' },
              { value: '30d', label: '30 Days' },
              { value: '90d', label: '90 Days' },
            ],
          }}
          search={{
            value: searchTerm,
            onChange: setSearchTerm,
            placeholder: t('common.search', 'Search...'),
          }}
        />
      </div>

      <HistoryLimitWarning period={period} />

      <div className="bg-surface border border-line rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-fg-muted bg-surface border-b border-line">
              <tr>
                <th className="px-4 py-3 font-medium">{t('analytics.reports.colDate', 'Date')}</th>
                <th className="px-4 py-3 font-medium">{t('analytics.reports.colExchange', 'Exchange')}</th>
                <th className="px-4 py-3 font-medium">{t('analytics.reports.colSymbol', 'Symbol')}</th>
                <th className="px-4 py-3 font-medium">{t('analytics.reports.colSide', 'Side')}</th>
                <th className="px-4 py-3 font-medium text-right">{t('analytics.reports.colNetPnl', 'Net PnL')}</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-fg-muted">
                    {isLoading ? t('analytics.reports.emptyLoading', 'Loading history...') : t('analytics.reports.emptyNoData', 'No historical data found for the selected filters.')}
                  </td>
                </tr>
              ) : (
                history.map((pos) => {
                  const { realizedPnl, fundingFee, tradingFee } = getHistoryInverseUsdValues(pos);
                  const net = realizedPnl + (fundingFee || 0) + (tradingFee || 0);
                  return (
                    <tr key={pos.id} className="border-b border-line/50 hover:bg-line/20 transition-colors">
                      <td className="px-4 py-3 text-fg-muted">
                        {formatDateTime(pos.closeUpdateTime).fullStr}
                      </td>
                      <td data-theme={pos.exchange.toLowerCase()} className="px-4 py-3 capitalize text-fg">{pos.exchange}</td>
                      <td className="px-4 py-3 font-medium text-fg">{pos.symbol}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs ${pos.side === 'long' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                          {pos.side.toUpperCase()}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${net >= 0 ? 'text-success' : 'text-danger'}`}>
                        {formatCurrency(net, 'fiat')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
