import React from 'react';
import {
  Compass,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertCircle,
  Zap,
  Info,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMarketSentiment } from '../../hooks/useMarketSentiment';

export const MarketSentiment: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { sentiment, isLoading, error, refetch, pollingIntervalMinutes } = useMarketSentiment();

  const { currentIndex, historical, trendSummary, change24h, change7d, lastUpdated } = sentiment;
  const score = currentIndex.value;

  // Helper for translating classification
  const getLevelLabel = (classification: string) => {
    return t(`sentiment.levels.${classification}`, classification);
  };

  // Helper for translating regime
  const getRegimeLabel = (regime: string) => {
    return t(`sentiment.regimes.${regime}`, regime);
  };

  // Helper for translating volatility
  const getVolatilityLabel = (volatility: string) => {
    return t(`sentiment.volatilities.${volatility}`, volatility);
  };

  // Helper for translating funding bias
  const getFundingBiasLabel = (bias: string) => {
    return t(`sentiment.fundingBiases.${bias}`, bias);
  };

  // Color mapping based on score
  const getSentimentTheme = (val: number) => {
    if (val <= 24) {
      return {
        text: 'text-danger',
        bg: 'bg-danger/10',
        border: 'border-danger/30',
        barColor: 'var(--danger)',
      };
    }
    if (val <= 44) {
      return {
        text: 'text-tone-amber',
        bg: 'bg-warning/10',
        border: 'border-warning/30',
        barColor: 'var(--warning)',
      };
    }
    if (val <= 55) {
      return {
        text: 'text-tone-yellow',
        bg: 'bg-tone-yellow/10',
        border: 'border-tone-yellow/30',
        barColor: 'var(--tone-yellow)',
      };
    }
    if (val <= 75) {
      return {
        text: 'text-success',
        bg: 'bg-success/10',
        border: 'border-success/30',
        barColor: 'var(--success)',
      };
    }
    return {
      text: 'text-tone-cyan',
      bg: 'bg-tone-cyan/10',
      border: 'border-tone-cyan/30',
      barColor: 'var(--tone-cyan)',
    };
  };

  const theme = getSentimentTheme(score);

  // Angle for the speedometer needle: 0 = -90deg, 100 = 90deg
  const needleAngle = -90 + (score / 100) * 180;

  return (
    <div className="bg-surface border border-line rounded-xl overflow-hidden p-5 shadow-lg flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-line">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent/10 text-accent border border-accent/20">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-fg tracking-tight">
                {t('sentiment.title', 'Market Sentiment & Fear / Greed Index')}
              </h3>
              <span 
                className="inline-block w-2 h-2 rounded-full bg-success animate-pulse shadow-sm" 
                title={t('sentiment.liveFeedActive', 'Live feed active • Auto-refreshes every {{minutes}} minutes', { minutes: pollingIntervalMinutes })}
              />
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-fg-muted">
                {t('sentiment.subtitle', 'Live Fear & Greed Index score and macro market regime overview')}
              </p>
              <span className="text-fg-muted/50">•</span>
              {/* Discrete data source label */}
              <a
                href="https://alternative.me/crypto/fear-and-greed-index/"
                target="_blank"
                rel="noreferrer noopener"
                title={t('sentiment.sourceTitle', 'Data Source: Alternative.me Crypto Fear & Greed Index API')}
                className="inline-flex items-center gap-1 text-[11px] text-fg-muted hover:text-accent transition-colors"
              >
                <span>{t('sentiment.source', 'Source: Alternative.me API')}</span>
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span 
            className="text-[11px] text-fg-muted font-mono hidden sm:inline-block cursor-help"
            title={t('sentiment.updatedAt', 'Updated: {{time}} ({{minutes}}m auto-sync)', { time: lastUpdated, minutes: pollingIntervalMinutes })}
          >
            {t('sentiment.updatedAt', 'Updated: {{time}} ({{minutes}}m auto-sync)', { time: lastUpdated, minutes: pollingIntervalMinutes })}
          </span>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isLoading}
            title={t('sentiment.manualRefreshTitle', 'Manual refresh: Fetch latest sentiment from Alternative.me')}
            className="p-1.5 rounded-lg bg-elevated hover:bg-line border border-line text-fg-muted hover:text-fg transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-accent' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="space-y-4">
        {error && (
          <div className="px-3 py-2 rounded-lg bg-warning/10 border border-warning/20 text-tone-amber text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{t('sentiment.fallbackActive', 'Fallback mode active: {{error}}', { error })}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          {/* Gauge & Main Score (Col 1-5) */}
          <div 
            className="md:col-span-5 flex flex-col items-center justify-center p-4 rounded-xl bg-elevated border border-line"
            title={t('sentiment.tooltips.currentIndex', 'Current Fear & Greed Index: {{score}}/100 ({{classification}})', { score, classification: getLevelLabel(currentIndex.valueClassification) })}
          >
            {/* SVG Semicircle Dial */}
            <div className="relative w-48 h-26 flex items-end justify-center overflow-hidden pt-1">
              <svg viewBox="0 0 160 90" className="w-44 h-24 overflow-visible">
                <defs>
                  <linearGradient id="fngDialGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="var(--danger)" />
                    <stop offset="25%" stopColor="var(--warning)" />
                    <stop offset="50%" stopColor="var(--tone-yellow)" />
                    <stop offset="75%" stopColor="var(--success)" />
                    <stop offset="100%" stopColor="var(--tone-cyan)" />
                  </linearGradient>
                </defs>

                {/* Background Arc */}
                <path
                  d="M 15 80 A 65 65 0 0 1 145 80"
                  fill="none"
                  stroke="var(--line)"
                  strokeWidth="12"
                  strokeLinecap="round"
                />

                {/* Gradient Progress Arc */}
                <path
                  d="M 15 80 A 65 65 0 0 1 145 80"
                  fill="none"
                  stroke="url(#fngDialGradient)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  opacity="0.9"
                />

                {/* Needle Pivot Center */}
                <circle cx="80" cy="80" r="5" fill="var(--fg)" />

                {/* Needle */}
                <g transform={`rotate(${needleAngle}, 80, 80)`}>
                  <line
                    x1="80"
                    y1="80"
                    x2="80"
                    y2="24"
                    stroke="var(--fg)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <polygon points="80,18 76,26 84,26" fill="var(--fg)" />
                </g>
              </svg>

              <span className="absolute left-2 bottom-0 text-[10px] font-mono font-semibold text-danger" title={`0: ${getLevelLabel('Extreme Fear')}`}>0</span>
              <span className="absolute right-2 bottom-0 text-[10px] font-mono font-semibold text-tone-cyan" title={`100: ${getLevelLabel('Extreme Greed')}`}>100</span>
            </div>

            {/* Score & Classification */}
            <div className="text-center mt-2">
              <div className="flex items-baseline justify-center gap-1.5">
                <span className={`text-4xl font-extrabold font-mono tracking-tight ${theme.text}`}>
                  {score}
                </span>
                <span className="text-xs text-fg-muted font-mono font-medium">/ 100</span>
              </div>

              <div 
                className="mt-1.5 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border border-line bg-surface shadow-sm cursor-help"
                title={getLevelLabel(currentIndex.valueClassification)}
              >
                <span className={`w-2 h-2 rounded-full ${theme.bg.replace('/10', '')} animate-pulse`} />
                <span className={theme.text}>{getLevelLabel(currentIndex.valueClassification)}</span>
              </div>

              {/* Variations */}
              <div className="flex items-center justify-center gap-4 mt-3 text-xs text-fg-muted">
                <span 
                  className="flex items-center gap-1 font-mono cursor-help"
                  title={t('sentiment.tooltips.change24h', 'Net sentiment change over the last 24 hours: {{change}} points', { change: change24h >= 0 ? `+${change24h}` : change24h })}
                >
                  <span className="text-[11px] text-fg-muted">24h:</span>
                  <span className={`font-semibold flex items-center ${change24h >= 0 ? 'text-success' : 'text-danger'}`}>
                    {change24h >= 0 ? <TrendingUp className="w-3 h-3 inline mr-0.5" /> : <TrendingDown className="w-3 h-3 inline mr-0.5" />}
                    {change24h >= 0 ? `+${change24h}` : change24h}
                  </span>
                </span>
                <span className="w-1 h-1 rounded-full bg-line" />
                <span 
                  className="flex items-center gap-1 font-mono cursor-help"
                  title={t('sentiment.tooltips.change7d', 'Net sentiment change over the last 7 days: {{change}} points', { change: change7d >= 0 ? `+${change7d}` : change7d })}
                >
                  <span className="text-[11px] text-fg-muted">7d:</span>
                  <span className={`font-semibold flex items-center ${change7d >= 0 ? 'text-success' : 'text-danger'}`}>
                    {change7d >= 0 ? <TrendingUp className="w-3 h-3 inline mr-0.5" /> : <TrendingDown className="w-3 h-3 inline mr-0.5" />}
                    {change7d >= 0 ? `+${change7d}` : change7d}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* 7-Day History Bars & Macro Indicators (Col 6-12) */}
          <div className="md:col-span-7 flex flex-col justify-between space-y-4">
            {/* 7-Day Historical Track */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-fg-muted uppercase tracking-wider">
                  {t('sentiment.historicalTrend', '7-Day Historical Trend')}
                </span>
                <span className="text-[11px] text-fg-muted font-mono">
                  {t('sentiment.dailyProgression', 'Daily progression')}
                </span>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {historical.slice(0, 7).reverse().map((item, idx) => {
                  const dayTheme = getSentimentTheme(item.value);
                  const isCurrentDay = idx === 6;
                  const date = new Date(item.timestamp * 1000);
                  const dayLabel = isCurrentDay
                    ? t('sentiment.today', 'Today')
                    : date.toLocaleDateString(i18n.language, { weekday: 'narrow' });
                  const fullDateStr = date.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric', year: 'numeric' });
                  const translatedClass = getLevelLabel(item.valueClassification);

                  return (
                    <div
                      key={item.timestamp}
                      className={`p-2 rounded-lg flex flex-col items-center justify-between border transition-all cursor-help ${
                        isCurrentDay
                          ? 'bg-elevated border-accent/40 ring-1 ring-accent/30'
                          : 'bg-elevated/50 border-line hover:border-line-strong'
                      }`}
                      title={t('sentiment.dayTooltip', '{{date}}: Score {{score}}/100 ({{classification}})', {
                        date: fullDateStr,
                        score: item.value,
                        classification: translatedClass,
                      })}
                    >
                      <span className="text-[10px] text-fg-muted font-medium uppercase">{dayLabel}</span>
                      
                      {/* Vertical mini bar */}
                      <div className="w-full h-10 flex items-end justify-center py-1">
                        <div
                          className="w-2.5 rounded-sm transition-all duration-300"
                          style={{
                            height: `${Math.max(15, (item.value / 100) * 100)}%`,
                            backgroundColor: dayTheme.barColor,
                          }}
                        />
                      </div>

                      <span className={`text-[11px] font-bold font-mono ${dayTheme.text}`}>
                        {item.value}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Macro Summary Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              {/* Market Regime */}
              <div 
                className="p-2.5 rounded-lg bg-elevated border border-line flex flex-col cursor-help hover:border-line-strong transition-colors"
                title={t('sentiment.tooltips.regime', 'Macro Market Regime: {{regime}}.', { regime: getRegimeLabel(trendSummary.regime) })}
              >
                <span className="text-[10px] font-medium text-fg-muted uppercase tracking-wider">
                  {t('sentiment.regime', 'Regime')}
                </span>
                <span className="text-xs font-bold text-fg mt-1 flex items-center gap-1 font-mono">
                  <Activity className="w-3 h-3 text-accent" />
                  {getRegimeLabel(trendSummary.regime)}
                </span>
              </div>

              {/* Volatility */}
              <div 
                className="p-2.5 rounded-lg bg-elevated border border-line flex flex-col cursor-help hover:border-line-strong transition-colors"
                title={t('sentiment.tooltips.volatility', 'Expected Volatility Level: {{volatility}}.', { volatility: getVolatilityLabel(trendSummary.volatilityIndex) })}
              >
                <span className="text-[10px] font-medium text-fg-muted uppercase tracking-wider">
                  {t('sentiment.volatility', 'Volatility')}
                </span>
                <span className="text-xs font-bold text-tone-amber mt-1 flex items-center gap-1 font-mono">
                  <Zap className="w-3 h-3 text-tone-amber" />
                  {getVolatilityLabel(trendSummary.volatilityIndex)}
                </span>
              </div>

              {/* Funding Bias */}
              <div 
                className="p-2.5 rounded-lg bg-elevated border border-line flex flex-col cursor-help hover:border-line-strong transition-colors"
                title={t('sentiment.tooltips.fundingBias', 'Market Funding Bias: {{bias}}.', { bias: getFundingBiasLabel(trendSummary.fundingBias) })}
              >
                <span className="text-[10px] font-medium text-fg-muted uppercase tracking-wider">
                  {t('sentiment.fundingBias', 'Funding Bias')}
                </span>
                <span className="text-xs font-bold text-success mt-1 flex items-center gap-1 font-mono">
                  <ShieldCheck className="w-3 h-3 text-success" />
                  {getFundingBiasLabel(trendSummary.fundingBias)}
                </span>
              </div>

              {/* BTC Dominance */}
              <div 
                className="p-2.5 rounded-lg bg-elevated border border-line flex flex-col cursor-help hover:border-line-strong transition-colors"
                title={t('sentiment.tooltips.btcDominance', 'Estimated Bitcoin Market Dominance: ~{{dominance}}%.', { dominance: trendSummary.btcDominanceEstimate })}
              >
                <span className="text-[10px] font-medium text-fg-muted uppercase tracking-wider">
                  {t('sentiment.btcDominance', 'BTC Dominance')}
                </span>
                <span className="text-xs font-bold text-fg mt-1 font-mono">
                  ~{trendSummary.btcDominanceEstimate}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tactical Advice / Trader Note */}
        <div 
          className="p-3 rounded-lg bg-elevated border border-accent/20 flex items-start gap-2.5 cursor-help"
          title={t('sentiment.tooltips.tacticalAdvice', 'Contextual tactical recommendation calculated from market regime, sentiment momentum, and leverage risk.')}
        >
          <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
          <div className="text-xs text-fg/90 leading-relaxed">
            <span className="font-semibold text-accent mr-1.5">
              {t('sentiment.tacticalOutlook', 'Tactical Market Outlook:')}
            </span>
            {trendSummary.adviceKey
              ? t(`sentiment.advice.${trendSummary.adviceKey}`, trendSummary.traderAdvice.en)
              : i18n.language.startsWith('pt')
              ? trendSummary.traderAdvice.pt
              : trendSummary.traderAdvice.en}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketSentiment;

