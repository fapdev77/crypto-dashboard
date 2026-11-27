import { useTranslation } from 'react-i18next';
import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
} from 'recharts';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { useMarketAnalyticsStore } from '../../../store/marketAnalyticsStore';
import {
  TakerFlowMetricTooltip,
  CvdDivergenceTooltip,
  PeriodTakerDeltaTooltip,
  CvdNetBalanceTooltip,
} from './MarketAnalyticsTooltips';

export const TakerFlowCvdWidget: React.FC = () => {
  const { t } = useTranslation();
  const { snapshot } = useMarketAnalyticsStore();

  if (!snapshot) return null;

  const { takerFlowHistory, oiHistory } = snapshot;

  const formatUsd = (val: number): string => {
    const abs = Math.abs(val);
    const sign = val < 0 ? '-' : '';
    if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
    return `${sign}$${abs.toFixed(0)}`;
  };

  // Compute total aggregates over the series
  const totalBuy = takerFlowHistory.reduce((acc, p) => acc + p.buyVol, 0);
  const totalSell = takerFlowHistory.reduce((acc, p) => acc + p.sellVol, 0);
  const netDeltaTotal = totalBuy - totalSell;
  const latestCvd = takerFlowHistory.length > 0 ? takerFlowHistory[takerFlowHistory.length - 1].cvd : 0;

  // Check for CVD / Price Divergence
  const priceStart = oiHistory.length > 0 ? oiHistory[0].price : 0;
  const priceEnd = oiHistory.length > 0 ? oiHistory[oiHistory.length - 1].price : 0;
  const isPriceUp = priceEnd > priceStart;
  const isCvdUp = latestCvd > 0;

  let divergenceAlert: { title: string; desc: string; type: 'warning' | 'info' } | null = null;
  if (isPriceUp && !isCvdUp) {
    divergenceAlert = {
      title: t('analytics.market.takerFlow.bearishTitle', 'Bearish Absorption Warning'),
      desc: t('analytics.market.takerFlow.bearishDesc', 'Price is rising despite net negative Taker Flow (CVD falling). This suggests passive limit sellers or market exhaustion.'),
      type: 'warning',
    };
  } else if (!isPriceUp && isCvdUp) {
    divergenceAlert = {
      title: t('analytics.market.takerFlow.bullishTitle', 'Bullish Accumulation Divergence'),
      desc: t('analytics.market.takerFlow.bullishDesc', 'Price is declining while Taker Volume Delta is positive (CVD rising). Limit orders are absorbing aggressive selling pressure.'),
      type: 'info',
    };
  }

  return (
    <div className="bg-canvas border border-line rounded-xl p-5 shadow-lg space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-success/10 text-success rounded-lg border border-success/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <TakerFlowMetricTooltip>
                <h3 className="text-base font-bold text-fg tracking-tight cursor-help border-b border-dotted border-fg-muted/50 hover:text-success transition-colors">
                  {t('analytics.market.takerFlow.title', 'Order Flow & Cumulative Volume Delta (CVD)')}
                </h3>
              </TakerFlowMetricTooltip>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-elevated text-fg border border-line rounded">
                {t('analytics.market.takerFlow.badge', 'Taker Buy vs. Sell')}
              </span>
            </div>
            <p className="text-xs text-fg-muted">
              {t('analytics.market.takerFlow.subtitle', 'Measures aggressive market orders entering the book vs. passive limit absorption')}
            </p>
          </div>
        </div>

        {/* Aggregated Net Flow */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="text-right">
            <PeriodTakerDeltaTooltip>
              <span className="text-[11px] text-fg-muted block font-sans">{t('analytics.market.takerFlow.periodDelta', 'Period Taker Delta')}</span>
            </PeriodTakerDeltaTooltip>
            <div
              className={`text-base font-bold mt-0.5 ${
                netDeltaTotal >= 0 ? 'text-success' : 'text-danger'
              }`}
            >
              {netDeltaTotal >= 0 ? '+' : ''}{formatUsd(netDeltaTotal)}
            </div>
          </div>
          <div className="text-right">
            <CvdNetBalanceTooltip>
              <span className="text-[11px] text-fg-muted block font-sans">{t('analytics.market.takerFlow.cvdNetBalance', 'CVD Net Balance')}</span>
            </CvdNetBalanceTooltip>
            <div
              className={`text-base font-bold mt-0.5 ${
                latestCvd >= 0 ? 'text-tone-cyan' : 'text-warning'
              }`}
            >
              {latestCvd >= 0 ? '+' : ''}{formatUsd(latestCvd)}
            </div>
          </div>
        </div>
      </div>

      {/* Divergence Notification if present */}
      {divergenceAlert && (
        <CvdDivergenceTooltip type={divergenceAlert.title} desc={divergenceAlert.desc}>
          <div
            className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs cursor-help transition-opacity hover:opacity-90 ${
              divergenceAlert.type === 'warning'
                ? 'bg-warning/10 border-warning/30 text-warning'
                : 'bg-tone-cyan/10 border-tone-cyan/30 text-tone-cyan'
            }`}
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">{divergenceAlert.title}: </strong>
              <span className="text-fg">{divergenceAlert.desc}</span>
            </div>
          </div>
        </CvdDivergenceTooltip>
      )}

      {/* Volume Ratio Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-success font-semibold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> {t('analytics.market.takerFlow.takerBuy', 'Taker Buy:')} {formatUsd(totalBuy)} (
            {Math.round((totalBuy / (totalBuy + totalSell || 1)) * 100)}%)
          </span>
          <span className="text-danger font-semibold flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5" /> {t('analytics.market.takerFlow.takerSell', 'Taker Sell:')} {formatUsd(totalSell)} (
            {Math.round((totalSell / (totalBuy + totalSell || 1)) * 100)}%)
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-elevated overflow-hidden flex">
          <div
            style={{ width: `${(totalBuy / (totalBuy + totalSell || 1)) * 100}%` }}
            className="bg-success h-full transition-all"
          />
          <div
            style={{ width: `${(totalSell / (totalBuy + totalSell || 1)) * 100}%` }}
            className="bg-danger h-full transition-all"
          />
        </div>
      </div>

      {/* Recharts ComposedChart: Net Delta Bars + CVD Line */}
      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={takerFlowHistory} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <XAxis
              dataKey="timeLabel"
              stroke="var(--fg-muted)"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: 'var(--line)' }}
            />
            {/* Left Y-Axis: Net Delta Bar */}
            <YAxis
              yAxisId="delta"
              orientation="left"
              stroke="var(--fg-muted)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => formatUsd(val)}
            />
            {/* Right Y-Axis: CVD Line */}
            <YAxis
              yAxisId="cvd"
              orientation="right"
              stroke="var(--tone-cyan)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => formatUsd(val)}
            />
            <ReferenceLine yAxisId="delta" y={0} stroke="var(--line-strong)" strokeDasharray="3 3" />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-elevated border border-line rounded-lg p-3 shadow-xl text-xs space-y-1.5 font-mono">
                      <div className="text-fg-muted font-sans font-semibold border-b border-line pb-1">
                        {t('analytics.market.charts.timeLabel', 'Time:')} {data.timeLabel}
                      </div>
                      <div className="flex items-center justify-between gap-4 text-success">
                        <span className="font-sans">{t('analytics.market.takerFlow.takerBuy', 'Taker Buy:')}</span>
                        <span>{formatUsd(data.buyVol)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-danger">
                        <span className="font-sans">{t('analytics.market.takerFlow.takerSell', 'Taker Sell:')}</span>
                        <span>{formatUsd(data.sellVol)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 border-t border-line/60 pt-1 font-bold">
                        <span className="text-fg-muted font-sans">{t('analytics.market.charts.netDeltaLabel', 'Net Delta:')}</span>
                        <span className={data.netDelta >= 0 ? 'text-success' : 'text-danger'}>
                          {data.netDelta >= 0 ? '+' : ''}{formatUsd(data.netDelta)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-tone-cyan font-bold">
                        <span className="text-fg-muted font-sans">{t('analytics.market.charts.cumulativeCvdLabel', 'Cumulative (CVD):')}</span>
                        <span>{formatUsd(data.cvd)}</span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
              content={() => (
                <div className="flex items-center justify-end gap-5 pb-2.5 text-[11px] font-sans">
                  <div className="flex items-center gap-1.5 text-fg">
                    <span className="w-2.5 h-2.5 rounded-full bg-success inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-danger inline-block -ml-2" />
                    <span>{t('analytics.market.charts.netDeltaLegend', 'Net Delta per Candle (Buy / Sell)')}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-fg">
                    <span className="w-4 h-0.5 bg-tone-cyan inline-block rounded-full" />
                    <span>{t('analytics.market.charts.cvdLegend', 'Cumulative Volume Delta (CVD)')}</span>
                  </div>
                </div>
              )}
            />
            <Bar yAxisId="delta" dataKey="netDelta" name={t('analytics.market.charts.netDeltaSeries', 'Net Delta per Candle')} barSize={8}>
              {takerFlowHistory.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.netDelta >= 0 ? 'var(--success)' : 'var(--danger)'}
                />
              ))}
            </Bar>
            <Line
              yAxisId="cvd"
              type="monotone"
              dataKey="cvd"
              name={t('analytics.market.charts.cvdLegend', 'Cumulative Volume Delta (CVD)')}
              stroke="var(--tone-cyan)"
              strokeWidth={2.5}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
