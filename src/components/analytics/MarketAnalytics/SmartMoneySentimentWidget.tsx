import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Compass,
  Users,
  Briefcase,
  AlertTriangle,
  Zap,
  TrendingUp,
  TrendingDown,
  Info,
} from 'lucide-react';
import { useMarketAnalyticsStore } from '../../../store/marketAnalyticsStore';
import {
  SentimentTitleTooltip,
  FearAndGreedTooltip,
  SentimentDivergenceTooltip,
  RetailRatioTooltip,
  TopTraderRatioTooltip
} from './MarketAnalyticsTooltips';

export const SmartMoneySentimentWidget: React.FC = () => {
  const { t } = useTranslation();
  const { snapshot } = useMarketAnalyticsStore();

  if (!snapshot) return null;

  const { sentiment } = snapshot;
  const {
    retailLongRatio,
    retailShortRatio,
    topTraderLongRatio,
    topTraderShortRatio,
    divergenceDetected,
    divergenceMessage,
    greedFearScore,
    greedFearLabel,
  } = sentiment;

  const getScoreTheme = (score: number) => {
    if (score >= 75) {
      return {
        color: 'text-tone-cyan',
        bg: 'bg-tone-cyan/10',
        border: 'border-tone-cyan/30',
        meterBg: 'bg-tone-cyan',
      };
    }
    if (score >= 56) {
      return {
        color: 'text-success',
        bg: 'bg-success/10',
        border: 'border-success/30',
        meterBg: 'bg-success',
      };
    }
    if (score >= 45) {
      return {
        color: 'text-tone-yellow',
        bg: 'bg-tone-yellow/10',
        border: 'border-tone-yellow/30',
        meterBg: 'bg-tone-yellow',
      };
    }
    if (score >= 25) {
      return {
        color: 'text-tone-amber',
        bg: 'bg-tone-amber/10',
        border: 'border-tone-amber/30',
        meterBg: 'bg-tone-amber',
      };
    }
    return {
      color: 'text-danger',
      bg: 'bg-danger/10',
      border: 'border-danger/30',
      meterBg: 'bg-danger',
    };
  };

  const theme = getScoreTheme(greedFearScore);

  return (
    <div className="bg-canvas border border-line rounded-xl p-5 shadow-lg space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-tone-purple/10 text-tone-purple rounded-lg border border-tone-purple/20">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <SentimentTitleTooltip>
                <h3 className="text-base font-bold text-fg tracking-tight cursor-help border-b border-dotted border-fg-muted/50 hover:text-tone-purple transition-colors">
                  {t('analytics.market.sentiment.title', 'Smart Money vs. Retail Sentiment')}
                </h3>
              </SentimentTitleTooltip>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-elevated text-fg border border-line rounded">
                {t('analytics.market.sentiment.badge', 'Positioning Divergence')}
              </span>
            </div>
            <p className="text-xs text-fg-muted">
              {t('analytics.market.sentiment.subtitle', 'Compares retail trader account counts against top whale volume positioning')}
            </p>
          </div>
        </div>

        {/* Fear & Greed Score Badge */}
        <FearAndGreedTooltip>
          <div className={`flex items-center gap-3 px-3.5 py-1.5 rounded-xl border ${theme.bg} ${theme.border} transition-opacity hover:opacity-90`}>
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider font-bold text-fg-muted block">
                {t('analytics.market.sentiment.marketEmotion', 'Market Emotion')}
              </span>
              <span className={`text-sm font-bold ${theme.color}`}>{greedFearLabel}</span>
            </div>
            <div className={`text-2xl font-black font-mono ${theme.color}`}>
              {greedFearScore}
              <span className="text-xs font-normal text-fg-muted">/100</span>
            </div>
          </div>
        </FearAndGreedTooltip>
      </div>

      {/* Divergence Alert Banner */}
      {divergenceDetected && (
        <SentimentDivergenceTooltip>
          <div className="bg-tone-purple/10 border border-tone-purple/30 rounded-xl p-3.5 flex items-start gap-3">
            <div className="p-1.5 bg-tone-purple/20 rounded-lg text-tone-purple shrink-0 mt-0.5">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-tone-purple">
                {t('analytics.market.sentiment.divergenceDetected', 'Institutional Positioning Divergence Detected:')}
              </span>
              <p className="text-xs text-fg mt-0.5 leading-relaxed">
                {divergenceMessage}
              </p>
            </div>
          </div>
        </SentimentDivergenceTooltip>
      )}

      {/* Retail vs Smart Money Comparative Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Retail Traders Card */}
        <div className="bg-elevated border border-line rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-tone-blue" />
              <RetailRatioTooltip>
                <span className="text-xs font-bold text-fg uppercase tracking-wide cursor-help border-b border-dotted border-fg-muted/50 hover:text-tone-blue transition-colors">
                  {t('analytics.market.sentiment.retailTitle', 'Retail Accounts Ratio')}
                </span>
              </RetailRatioTooltip>
            </div>
            <span className="text-[10px] text-fg-muted">{t('analytics.market.sentiment.retailSource', 'Bybit & OKX Accounts')}</span>
          </div>

          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-success font-bold">{t('analytics.market.sentiment.longLabel', 'Long:')} {retailLongRatio}%</span>
            <span className="text-danger font-bold">{t('analytics.market.sentiment.shortLabel', 'Short:')} {retailShortRatio}%</span>
          </div>

          {/* Segmented bar */}
          <div className="w-full h-2.5 rounded-full bg-canvas overflow-hidden flex border border-line">
            <div
              style={{ width: `${retailLongRatio}%` }}
              className="bg-success h-full transition-all"
            />
            <div
              style={{ width: `${retailShortRatio}%` }}
              className="bg-danger h-full transition-all"
            />
          </div>

          <p className="text-[11px] text-fg-muted leading-tight">
            {t('analytics.market.sentiment.retailDesc', 'Percentage of total active trader accounts holding open long versus short positions.')}
          </p>
        </div>

        {/* Top Traders (Smart Money) Card */}
        <div className="bg-elevated border border-line rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-tone-amber" />
              <TopTraderRatioTooltip>
                <span className="text-xs font-bold text-fg uppercase tracking-wide cursor-help border-b border-dotted border-fg-muted/50 hover:text-tone-amber transition-colors">
                  {t('analytics.market.sentiment.topTradersTitle', 'Top Traders (Smart Money)')}
                </span>
              </TopTraderRatioTooltip>
            </div>
            <span className="text-[10px] text-fg-muted">{t('analytics.market.sentiment.topTradersSource', 'Volume-Weighted Elite')}</span>
          </div>

          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-success font-bold">{t('analytics.market.sentiment.longLabel', 'Long:')} {topTraderLongRatio}%</span>
            <span className="text-danger font-bold">{t('analytics.market.sentiment.shortLabel', 'Short:')} {topTraderShortRatio}%</span>
          </div>

          {/* Segmented bar */}
          <div className="w-full h-2.5 rounded-full bg-canvas overflow-hidden flex border border-line">
            <div
              style={{ width: `${topTraderLongRatio}%` }}
              className="bg-success h-full transition-all"
            />
            <div
              style={{ width: `${topTraderShortRatio}%` }}
              className="bg-danger h-full transition-all"
            />
          </div>

          <p className="text-[11px] text-fg-muted leading-tight">
            {t('analytics.market.sentiment.topTradersDesc', 'Notional positioning of the top 20% most profitable and high-volume accounts on OKX/Bitget.')}
          </p>
        </div>
      </div>

      {/* Fear and Greed Meter Visual Bar */}
      <div className="bg-elevated border border-line rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-fg-muted">
          <span className="font-semibold text-fg">{t('analytics.market.sentiment.spectrumTitle', 'Market Sentiment Spectrum')}</span>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-danger">{t('analytics.market.sentiment.extremeFear', 'Extreme Fear')}</span>
            <span>•</span>
            <span className="text-tone-yellow">{t('analytics.market.sentiment.neutral', 'Neutral')}</span>
            <span>•</span>
            <span className="text-tone-cyan">{t('analytics.market.sentiment.extremeGreed', 'Extreme Greed')}</span>
          </div>
        </div>

        {/* Multi-gradient spectrum with marker */}
        <div className="relative pt-2 pb-1">
          <div className="w-full h-3 rounded-full bg-gradient-to-r from-danger via-warning via-tone-yellow via-success to-tone-cyan shadow-inner" />
          <div
            style={{ left: `${Math.max(2, Math.min(98, greedFearScore))}%` }}
            className="absolute top-0 transform -translate-x-1/2 flex flex-col items-center"
          >
            <div className="w-4 h-4 bg-fg rounded-full border-2 border-canvas shadow-lg" />
            <span className="text-[10px] font-mono font-bold text-fg mt-1 bg-canvas px-1 rounded border border-line">
              {greedFearScore}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
