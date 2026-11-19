import React from 'react';
import { UnifiedPosition } from '../types';
import { formatValue } from '../utils/formatters';
import { ExchangeIcon } from './ui/ExchangeIcon';
import { useFormatCurrency } from '../hooks/useFormatCurrency';
import { AppTooltip } from './ui/Tooltip';
import { getInverseUsdValues, getOpenPositionSizeAndValue } from '../utils/inverseUtils';
import { useTranslation } from 'react-i18next';

/** Six-column template shared by the lite header and every lite card, so columns line up. */
export const LITE_COLUMNS =
  'xl:grid-cols-[minmax(0,1.5fr)_minmax(0,0.8fr)_minmax(0,1.25fr)_minmax(0,1.45fr)_minmax(0,1.25fr)_minmax(0,1.2fr)]';

const CELL_CLASS =
  'min-w-0 flex items-center justify-between gap-3 border-t border-line pt-2 xl:block xl:border-t-0 xl:border-l xl:border-line xl:pl-4';

const IDENTITY_CLASS = 'min-w-0 flex items-center gap-2';

const LABEL_CLASS = 'text-[10px] font-medium uppercase tracking-wider text-fg-muted leading-none shrink-0';
const VALUE_CLASS = 'min-w-0 font-mono text-[12px] leading-5 text-fg truncate text-right xl:text-left';
/** Punctuation around secondary values; the values themselves keep the same weight as the primary one. */
const AFFIX_CLASS = 'text-fg-muted';

const USD_PEGGED = new Set(['USD', 'USDT', 'USDC', 'BUSD', 'FDUSD', 'TUSD', 'USDE', 'USDD', 'PYUSD', 'USDP', 'GUSD']);

/** Column labels shown once above the lite list on wide screens. */
export function PositionsLiteHeader() {
  const { t } = useTranslation();
  const columns = [
    t('positions.lite.accountSymbol', 'Broker/Account/Symbol'),
    t('positions.lite.sideLeverage', 'Side/Leverage/Mode'),
    t('positions.lite.sizeValue', 'Position Size/Value'),
    t('positions.lite.realized', 'PnL Realized'),
    t('positions.lite.unrealized', 'PnL Unrealized'),
    t('positions.lite.prices', 'Entry/Mark/Liquidation'),
  ];

  return (
    <div
      className={`hidden xl:grid ${LITE_COLUMNS} gap-x-4 px-[17px] py-1 text-[9px] font-medium uppercase tracking-wider text-fg-muted`}
    >
      {columns.map((column, index) => (
        <span key={column} className={`min-w-0 truncate ${index === 0 ? '' : 'xl:pl-4'}`}>
          {column}
        </span>
      ))}
    </div>
  );
}

interface PositionCardLiteProps {
  pos: UnifiedPosition;
}

export function PositionCardLite({ pos }: PositionCardLiteProps) {
  const { t } = useTranslation();
  const formatCurrency = useFormatCurrency();

  const isLong = pos.side === 'long';
  const isShort = pos.side === 'short';
  const sideLabel = isLong
    ? t('positions.long', 'Long')
    : isShort
      ? t('positions.short', 'Short')
      : t('positions.net', 'Net');
  const sideColor = isLong ? 'text-success' : isShort ? 'text-danger' : 'text-fg-muted';
  const marginModeLabel = pos.marginMode === 'isolated'
    ? t('positions.isolated', 'Isolated')
    : t('positions.cross', 'Cross');

  const uplColor = pos.unrealizedPnl >= 0 ? 'text-success' : 'text-danger';
  const roeColor = (pos.roe || 0) >= 0 ? 'text-success' : 'text-danger';
  const realizedPnlColor = pos.realizedPnl >= 0 ? 'text-success' : 'text-danger';

  // Inverse PnL is reported in contracts; these are the normalized USD values.
  const inverseVals = getInverseUsdValues(pos);
  const { positionValueUsd } = getOpenPositionSizeAndValue(pos);

  const posCcy = pos.ccy || pos.baseCoin || 'USDT';
  const baseCoinClean = pos.baseCoin || pos.symbol.replace(/USDT|USDC|USD|EUR|BUSD|BTC$/i, '');
  const isFiatPair = /USD|EUR|BRL/.test(pos.symbol.toUpperCase());
  const isUsdPegged = USD_PEGGED.has(posCcy.toUpperCase());
  const formatCcy = (v: number | undefined | null) => formatCurrency(v, 'crypto', isUsdPegged ? 2 : 8);

  // Only render a fiat equivalent when the source value is known to be in USD.
  const canApproximate = inverseVals.isInverse || isUsdPegged;
  const toUsd = (value: number) => (inverseVals.isInverse ? value * inverseVals.conversionRate : value);

  const sizeText = formatCurrency(Math.abs(pos.size), 'crypto');
  const sizeApprox = formatCurrency(positionValueUsd, 'usd', 2);
  const realizedText = `${pos.realizedPnl > 0 ? '+' : ''}${formatCcy(pos.realizedPnl)}`;
  const unrealizedText = `${pos.unrealizedPnl > 0 ? '+' : ''}${formatCcy(pos.unrealizedPnl)}`;
  const realizedApprox = canApproximate ? formatCurrency(toUsd(pos.realizedPnl), 'usd', 2) : null;
  const unrealizedApprox = canApproximate ? formatCurrency(toUsd(pos.unrealizedPnl), 'usd', 2) : null;
  const roeText = pos.roe !== undefined ? `${pos.roe > 0 ? '+' : ''}${formatValue(pos.roe, 2)}%` : null;

  // Prices are quoted in the contract currency; show them in the active display currency.
  const formatPrice = (v: number | undefined | null) => formatCurrency(v, 'priceFiat', isFiatPair);
  const entryText = formatPrice(pos.entryPrice);
  const markText = formatPrice(pos.markPrice);
  const liqText = pos.liquidationPrice && pos.liquidationPrice > 0
    ? formatPrice(pos.liquidationPrice)
    : '-';

  return (
    <div id={`pos-card-${pos.id}`} className="bg-surface border border-line rounded-xl cursor-default">
      <div className={`grid grid-cols-1 ${LITE_COLUMNS} items-baseline gap-x-4 px-4 py-2.5`}>

        {/* Broker / account / symbol */}
        <div className={IDENTITY_CLASS} data-lite-column="identity">
          <ExchangeIcon exchange={pos.exchange} className="w-4 h-4 shrink-0" />
          <span className="text-[12px] text-fg truncate" title={pos.label}>{pos.label}</span>
          <span className="text-[12px] font-semibold text-fg truncate" title={`${pos.symbol} ${pos.instrumentType || ''}`.trim()}>
            {pos.symbol}
          </span>
          {pos.instrumentType && (
            <span className="text-[8px] font-bold tracking-wider px-1 py-0.5 rounded bg-line border border-line-strong text-fg-muted uppercase shrink-0">
              {pos.instrumentType}
            </span>
          )}
        </div>

        {/* Side / leverage / margin mode */}
        <div className={CELL_CLASS} data-lite-column="side">
          <span className={`${LABEL_CLASS} xl:hidden`}>{t('positions.lite.sideLeverage', 'Side/Leverage/Mode')}</span>
          <div className={`${VALUE_CLASS} flex items-baseline gap-1 whitespace-nowrap justify-end xl:justify-start`}>
            <span className={`font-sans text-[12px] font-semibold uppercase ${sideColor}`}>{sideLabel}</span>
            <span className="text-fg-muted">/</span>
            <span>{pos.leverage}x</span>
            <span className="text-fg-muted">/</span>
            <span className="font-sans text-[12px] text-fg truncate">{marginModeLabel}</span>
          </div>
        </div>

        {/* Position size / value */}
        <div className={CELL_CLASS} data-lite-column="size">
          <span className={`${LABEL_CLASS} xl:hidden`}>{t('positions.lite.sizeValue', 'Position Size/Value')}</span>
          <AppTooltip
            rows={[
              {
                label: t('positions.positionSize', 'Position Size'),
                value: `${sizeText} ${baseCoinClean}`,
                labelClassName: 'text-[12px] text-fg-muted',
                valueClassName: 'text-[12px] font-mono text-fg',
              },
              {
                label: t('positions.positionValue', 'Position Value'),
                value: sizeApprox,
                labelClassName: 'text-[12px] text-fg-muted',
                valueClassName: 'text-[12px] font-mono text-fg',
              },
            ]}
          >
            <div className={`${VALUE_CLASS} cursor-help focus:outline-none`}>
              {sizeText}
              {canApproximate && (
                <>
                  <span className={AFFIX_CLASS}> (≈ </span>
                  {sizeApprox}
                  <span className={AFFIX_CLASS}>)</span>
                </>
              )}
            </div>
          </AppTooltip>
        </div>

        {/* Realized PnL */}
        <div className={CELL_CLASS} data-lite-column="realized">
          <span className={`${LABEL_CLASS} xl:hidden`}>{t('positions.lite.realized', 'PnL Realized')}</span>
          <AppTooltip
            rows={[
              {
                label: t('positions.realizedPnl', 'Realized PnL'),
                value: `${realizedText} ${posCcy}`,
                labelClassName: 'text-[12px] text-fg-muted',
                valueClassName: 'text-[12px] font-mono text-fg',
              },
            ]}
          >
            <div className={`${VALUE_CLASS} cursor-help focus:outline-none`}>
              <span className={realizedPnlColor}>{realizedText}</span>
              {realizedApprox && (
                <>
                  <span className={AFFIX_CLASS}> (≈ </span>
                  {realizedApprox}
                  <span className={AFFIX_CLASS}>)</span>
                </>
              )}
            </div>
          </AppTooltip>
        </div>

        {/* Unrealized PnL */}
        <div className={CELL_CLASS} data-lite-column="unrealized">
          <span className={`${LABEL_CLASS} xl:hidden`}>{t('positions.lite.unrealized', 'PnL Unrealized')}</span>
          <AppTooltip
            rows={[
              {
                label: t('positions.unrealizedPnl', 'Unrealized PnL'),
                value: `${unrealizedText} ${posCcy}`,
                labelClassName: 'text-[12px] text-fg-muted',
                valueClassName: `text-[12px] font-mono ${uplColor}`,
              },
              ...(roeText
                ? [{
                    label: t('positions.roe', 'ROE'),
                    value: roeText,
                    labelClassName: 'text-[12px] text-fg-muted',
                    valueClassName: `text-[12px] font-mono ${roeColor}`,
                  }]
                : []),
            ]}
          >
            <div className={`${VALUE_CLASS} cursor-help focus:outline-none`}>
              <span className={uplColor}>{unrealizedText}</span>
              {(unrealizedApprox || roeText) && (
                <>
                  <span className={AFFIX_CLASS}> (</span>
                  {unrealizedApprox && <><span className={AFFIX_CLASS}>≈ </span>{unrealizedApprox}</>}
                  {unrealizedApprox && roeText && <span className={AFFIX_CLASS}>/</span>}
                  {roeText && <span className={roeColor}>{roeText}</span>}
                  <span className={AFFIX_CLASS}>)</span>
                </>
              )}
            </div>
          </AppTooltip>
        </div>

        {/* Entry / mark / liquidation price */}
        <div className={CELL_CLASS} data-lite-column="prices">
          <span className={`${LABEL_CLASS} xl:hidden`}>{t('positions.lite.prices', 'Entry/Mark/Liquidation')}</span>
          <AppTooltip
            rows={[
              {
                label: t('positions.entryPrice', 'Entry Price'),
                value: entryText,
                labelClassName: 'text-[12px] text-fg-muted',
                valueClassName: 'text-[12px] font-mono text-fg',
              },
              {
                label: t('positions.markPrice', 'Mark Price'),
                value: markText,
                labelClassName: 'text-[12px] text-fg-muted',
                valueClassName: 'text-[12px] font-mono text-fg',
              },
              {
                label: t('positions.liqPrice', 'Liq. Price'),
                value: liqText,
                labelClassName: 'text-[12px] text-fg-muted',
                valueClassName: 'text-[12px] font-mono text-warning',
              },
            ]}
          >
            <div className={`${VALUE_CLASS} cursor-help focus:outline-none whitespace-nowrap overflow-hidden`}>
              <span className="text-fg">{entryText}</span>
              <span className="text-fg-muted"> / </span>
              <span className="text-fg">{markText}</span>
              <span className="text-fg-muted"> / </span>
              <span className={liqText === '-' ? 'text-fg-muted' : 'text-warning'}>{liqText}</span>
            </div>
          </AppTooltip>
        </div>

      </div>
    </div>
  );
}
