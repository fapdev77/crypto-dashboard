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
import { useMarketSentiment } from '../../hooks/useMarketSentiment';

export const MarketSentiment: React.FC = () => {
  const { sentiment, isLoading, error, refetch, pollingIntervalMinutes } = useMarketSentiment();

  const { currentIndex, historical, trendSummary, change24h, change7d, lastUpdated } = sentiment;
  const score = currentIndex.value;

  // Color mapping based on score
  const getSentimentTheme = (val: number) => {
    if (val <= 24) {
      return {
        text: 'text-rose-400',
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/30',
        barColor: '#f43f5e',
      };
    }
    if (val <= 44) {
      return {
        text: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        barColor: '#f59e0b',
      };
    }
    if (val <= 55) {
      return {
        text: 'text-yellow-400',
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/30',
        barColor: '#eab308',
      };
    }
    if (val <= 75) {
      return {
        text: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        barColor: '#10b981',
      };
    }
    return {
      text: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/30',
      barColor: '#06b6d4',
    };
  };

  const theme = getSentimentTheme(score);

  // Angle for the speedometer needle: 0 = -90deg, 100 = 90deg
  const needleAngle = -90 + (score / 100) * 180;

  return (
    <div className="bg-[#151619] border border-[#2a2b30] rounded-xl overflow-hidden p-5 shadow-lg flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#2a2b30]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#2F6BFF]/10 text-[#2F6BFF] border border-[#2F6BFF]/20">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-white tracking-tight">
                Market Sentiment & Fear / Greed Index
              </h3>
              <span 
                className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.7)]" 
                title={`Live feed active • Auto-refreshes every ${pollingIntervalMinutes} minutes (synchronized with background cache interval)`}
              />
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-[#8E9299]">
                Live Fear & Greed Index score and macro market regime overview
              </p>
              <span className="text-[#8E9299]/50">•</span>
              {/* Discrete data source label */}
              <a
                href="https://alternative.me/crypto/fear-and-greed-index/"
                target="_blank"
                rel="noreferrer noopener"
                title="Data Source: Alternative.me Crypto Fear & Greed Index API"
                className="inline-flex items-center gap-1 text-[11px] text-[#8E9299] hover:text-[#2F6BFF] transition-colors"
              >
                <span>Source: Alternative.me API</span>
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span 
            className="text-[11px] text-[#8E9299] font-mono hidden sm:inline-block cursor-help"
            title={`Last updated at ${lastUpdated}. Periodic sync runs every ${pollingIntervalMinutes}m.`}
          >
            Updated: {lastUpdated} ({pollingIntervalMinutes}m auto-sync)
          </span>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isLoading}
            title="Manual refresh: Fetch latest sentiment from Alternative.me"
            className="p-1.5 rounded-lg bg-[#1a1b1e] hover:bg-[#2a2b30] border border-[#2a2b30] text-slate-300 hover:text-white transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#2F6BFF]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="space-y-4">
        {error && (
          <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Fallback mode active: {error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          {/* Gauge & Main Score (Col 1-5) */}
          <div 
            className="md:col-span-5 flex flex-col items-center justify-center p-4 rounded-xl bg-[#1a1b1e] border border-[#2a2b30]"
            title={`Current Fear & Greed Index: ${score}/100 (${currentIndex.valueClassification}). 0-24: Extreme Fear, 25-44: Fear, 45-55: Neutral, 56-75: Greed, 76-100: Extreme Greed.`}
          >
            {/* SVG Semicircle Dial */}
            <div className="relative w-48 h-26 flex items-end justify-center overflow-hidden pt-1">
              <svg viewBox="0 0 160 90" className="w-44 h-24 overflow-visible">
                <defs>
                  <linearGradient id="fngDialGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f43f5e" />
                    <stop offset="25%" stopColor="#f59e0b" />
                    <stop offset="50%" stopColor="#eab308" />
                    <stop offset="75%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>

                {/* Background Arc */}
                <path
                  d="M 15 80 A 65 65 0 0 1 145 80"
                  fill="none"
                  stroke="#2a2b30"
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
                <circle cx="80" cy="80" r="5" fill="#f8fafc" />

                {/* Needle */}
                <g transform={`rotate(${needleAngle}, 80, 80)`}>
                  <line
                    x1="80"
                    y1="80"
                    x2="80"
                    y2="24"
                    stroke="#ffffff"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <polygon points="80,18 76,26 84,26" fill="#ffffff" />
                </g>
              </svg>

              <span className="absolute left-2 bottom-0 text-[10px] font-mono font-semibold text-rose-400" title="0: Extreme Fear">0</span>
              <span className="absolute right-2 bottom-0 text-[10px] font-mono font-semibold text-cyan-400" title="100: Extreme Greed">100</span>
            </div>

            {/* Score & Classification */}
            <div className="text-center mt-2">
              <div className="flex items-baseline justify-center gap-1.5">
                <span className={`text-4xl font-extrabold font-mono tracking-tight ${theme.text}`}>
                  {score}
                </span>
                <span className="text-xs text-[#8E9299] font-mono font-medium">/ 100</span>
              </div>

              <div 
                className="mt-1.5 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border border-[#2a2b30] bg-[#151619] shadow-sm cursor-help"
                title={`Classification: ${currentIndex.valueClassification}`}
              >
                <span className={`w-2 h-2 rounded-full ${theme.bg.replace('/10', '')} animate-pulse`} />
                <span className={theme.text}>{currentIndex.valueClassification}</span>
              </div>

              {/* Variations */}
              <div className="flex items-center justify-center gap-4 mt-3 text-xs text-[#8E9299]">
                <span 
                  className="flex items-center gap-1 font-mono cursor-help"
                  title={`Net sentiment change over the last 24 hours: ${change24h >= 0 ? '+' : ''}${change24h} points`}
                >
                  <span className="text-[11px] text-[#8E9299]">24h:</span>
                  <span className={`font-semibold flex items-center ${change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {change24h >= 0 ? <TrendingUp className="w-3 h-3 inline mr-0.5" /> : <TrendingDown className="w-3 h-3 inline mr-0.5" />}
                    {change24h >= 0 ? `+${change24h}` : change24h}
                  </span>
                </span>
                <span className="w-1 h-1 rounded-full bg-[#2a2b30]" />
                <span 
                  className="flex items-center gap-1 font-mono cursor-help"
                  title={`Net sentiment change over the last 7 days: ${change7d >= 0 ? '+' : ''}${change7d} points`}
                >
                  <span className="text-[11px] text-[#8E9299]">7d:</span>
                  <span className={`font-semibold flex items-center ${change7d >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
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
                <span className="text-xs font-medium text-[#8E9299] uppercase tracking-wider">
                  7-Day Historical Trend
                </span>
                <span className="text-[11px] text-[#8E9299] font-mono">
                  Daily progression
                </span>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {historical.slice(0, 7).reverse().map((item, idx) => {
                  const dayTheme = getSentimentTheme(item.value);
                  const isCurrentDay = idx === 6;
                  const date = new Date(item.timestamp * 1000);
                  const dayLabel = isCurrentDay
                    ? 'Today'
                    : date.toLocaleDateString('en-US', { weekday: 'narrow' });
                  const fullDateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                  return (
                    <div
                      key={item.timestamp}
                      className={`p-2 rounded-lg flex flex-col items-center justify-between border transition-all cursor-help ${
                        isCurrentDay
                          ? 'bg-[#1a1b1e] border-[#2F6BFF]/40 ring-1 ring-[#2F6BFF]/30'
                          : 'bg-[#1a1b1e]/50 border-[#2a2b30] hover:border-[#3a3b42]'
                      }`}
                      title={`${fullDateStr}: Score ${item.value}/100 (${item.valueClassification})`}
                    >
                      <span className="text-[10px] text-[#8E9299] font-medium uppercase">{dayLabel}</span>
                      
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
                className="p-2.5 rounded-lg bg-[#1a1b1e] border border-[#2a2b30] flex flex-col cursor-help hover:border-[#3a3b42] transition-colors"
                title={`Macro Market Regime: ${trendSummary.regime}. Derived from Fear & Greed thresholds, trend momentum, and multi-day volatility.`}
              >
                <span className="text-[10px] font-medium text-[#8E9299] uppercase tracking-wider">
                  Regime
                </span>
                <span className="text-xs font-bold text-white mt-1 flex items-center gap-1 font-mono">
                  <Activity className="w-3 h-3 text-[#2F6BFF]" />
                  {trendSummary.regime}
                </span>
              </div>

              {/* Volatility */}
              <div 
                className="p-2.5 rounded-lg bg-[#1a1b1e] border border-[#2a2b30] flex flex-col cursor-help hover:border-[#3a3b42] transition-colors"
                title={`Expected Volatility Level: ${trendSummary.volatilityIndex}. Extreme levels indicate heightened risk of sudden liquidation flushes.`}
              >
                <span className="text-[10px] font-medium text-[#8E9299] uppercase tracking-wider">
                  Volatility
                </span>
                <span className="text-xs font-bold text-amber-400 mt-1 flex items-center gap-1 font-mono">
                  <Zap className="w-3 h-3 text-amber-400" />
                  {trendSummary.volatilityIndex}
                </span>
              </div>

              {/* Funding Bias */}
              <div 
                className="p-2.5 rounded-lg bg-[#1a1b1e] border border-[#2a2b30] flex flex-col cursor-help hover:border-[#3a3b42] transition-colors"
                title={`Market Funding Bias: ${trendSummary.fundingBias}. Evaluated using active perpetual position weights and current funding rates.`}
              >
                <span className="text-[10px] font-medium text-[#8E9299] uppercase tracking-wider">
                  Funding Bias
                </span>
                <span className="text-xs font-bold text-emerald-400 mt-1 flex items-center gap-1 font-mono">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  {trendSummary.fundingBias}
                </span>
              </div>

              {/* BTC Dominance */}
              <div 
                className="p-2.5 rounded-lg bg-[#1a1b1e] border border-[#2a2b30] flex flex-col cursor-help hover:border-[#3a3b42] transition-colors"
                title={`Estimated Bitcoin Market Dominance: ~${trendSummary.btcDominanceEstimate}%. Reflects capital allocation share in top crypto benchmark.`}
              >
                <span className="text-[10px] font-medium text-[#8E9299] uppercase tracking-wider">
                  BTC Dominance
                </span>
                <span className="text-xs font-bold text-white mt-1 font-mono">
                  ~{trendSummary.btcDominanceEstimate}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tactical Advice / Trader Note */}
        <div 
          className="p-3 rounded-lg bg-[#1a1b1e] border border-[#2F6BFF]/20 flex items-start gap-2.5 cursor-help"
          title="Contextual tactical recommendation calculated from market regime, sentiment momentum, and leverage risk."
        >
          <Info className="w-4 h-4 text-[#2F6BFF] shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300 leading-relaxed">
            <span className="font-semibold text-[#2F6BFF] mr-1.5">
              Tactical Market Outlook:
            </span>
            {trendSummary.traderAdvice.en}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketSentiment;
