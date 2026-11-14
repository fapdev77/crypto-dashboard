import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PositionCard } from '../PositionCard';
import { TooltipProvider } from '../ui/Tooltip';
import { PrivacyProvider } from '../../context/PrivacyContext';
import { useSettingsStore } from '../../store/settingsStore';
import { useBalancesStore } from '../../store/balancesStore';
import { useApiKeysStore } from '../../store/apiKeysStore';
import type { UnifiedPosition } from '../../types';
import i18n from '../../i18n/config';

vi.mock('../../services/AssetClassifierAggregator', () => ({
  AssetClassifierAggregator: {
    getGlobalCategorySync: () => 'CRYPTO',
    getGlobalAssetCategory: vi.fn().mockResolvedValue('CRYPTO'),
  },
}));

const makePosition = (overrides: Partial<UnifiedPosition> = {}): UnifiedPosition => ({
  id: 'conn-1-bybit-BTCUSDT-long',
  connectionId: 'conn-1',
  exchange: 'bybit',
  label: 'Main Account',
  symbol: 'BTCUSDT',
  baseCoin: 'BTC',
  quoteCoin: 'USDT',
  ccy: 'USDT',
  side: 'long',
  size: 0.5,
  entryPrice: 60000,
  markPrice: 62000,
  unrealizedPnl: 1000,
  realizedPnl: 50,
  closedPnl: 25,
  leverage: 10,
  marginMode: 'cross',
  margin: 3000,
  liquidationPrice: 55000,
  breakEvenPrice: 60100,
  roe: 33.3,
  instrumentType: 'PERP',
  accumulatedFunding: '-1.5',
  accumulatedTradingFee: '-2.5',
  ...overrides,
});

const renderCard = (pos: UnifiedPosition, isExpanded = false, onToggle = vi.fn()) =>
  render(
    <PrivacyProvider>
      <TooltipProvider>
        <PositionCard pos={pos} isExpanded={isExpanded} onToggle={onToggle} />
      </TooltipProvider>
    </PrivacyProvider>
  );

describe('PositionCard', () => {
  beforeEach(() => {
    i18n.changeLanguage('en-US');
    localStorage.setItem('app_privacy_mode', 'false');
    useSettingsStore.setState({
      fiatCurrency: 'USD',
      locale: 'en-US',
      fiatRates: { USD: 1, EUR: 0.9, GBP: 0.8, BRL: 5 },
      hedgeExposedMode: 'gross',
    });
    useBalancesStore.setState({ balances: {} });
    useApiKeysStore.setState({ keys: [] });
  });

  it('renders the core position row: symbol, side, leverage, margin mode and account label', () => {
    renderCard(makePosition());

    expect(screen.getByText('BTCUSDT')).toBeInTheDocument();
    expect(screen.getByText(/Long/)).toBeInTheDocument();
    expect(screen.getByText(/10x/)).toBeInTheDocument();
    expect(screen.getByText(/Cross/)).toBeInTheDocument();
    expect(screen.getByText('Main Account')).toBeInTheDocument();
    expect(screen.getByText('PERP')).toBeInTheDocument();
  });

  it('shows TP and SL badges, marking a partial TP when tpMode is partial', () => {
    renderCard(makePosition({ tp: 65000, sl: 58000, tpMode: 'partial', slMode: 'full' }));

    expect(screen.getByText('TP')).toBeInTheDocument();
    expect(screen.getByText('SL')).toBeInTheDocument();
    expect(screen.getByText('(P)')).toBeInTheDocument();
  });

  it('does not render TP/SL badges when no targets are set', () => {
    renderCard(makePosition());

    expect(screen.queryByText('TP')).not.toBeInTheDocument();
    expect(screen.queryByText('SL')).not.toBeInTheDocument();
  });

  it('calls onToggle when the card is clicked', () => {
    const onToggle = vi.fn();
    renderCard(makePosition(), false, onToggle);

    fireEvent.click(screen.getByText('BTCUSDT'));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('renders the expanded detail grid only when isExpanded is true', () => {
    const { rerender } = renderCard(makePosition(), false);
    expect(screen.queryByText('Breakeven price')).not.toBeInTheDocument();

    rerender(
      <PrivacyProvider>
        <TooltipProvider>
          <PositionCard pos={makePosition()} isExpanded onToggle={vi.fn()} />
        </TooltipProvider>
      </PrivacyProvider>
    );

    expect(screen.getByText('Breakeven price')).toBeInTheDocument();
    expect(screen.getByText('Placed/ Max close')).toBeInTheDocument();
  });

  it('renders a short position with the Short label', () => {
    renderCard(makePosition({ id: 'p2', side: 'short', unrealizedPnl: -100, roe: -3.2 }));

    expect(screen.getByText(/Short/)).toBeInTheDocument();
  });

  it('renders the hedge/exposure block for inverse positions and toggles the exposed mode', () => {
    renderCard(makePosition({ instrumentType: 'INVERSE', exchange: 'okx', symbol: 'BTCUSD' }));

    expect(screen.getByText('Hedge / Exposure')).toBeInTheDocument();
    expect(screen.getByText('gross')).toBeInTheDocument();

    fireEvent.click(screen.getByText('gross'));

    expect(useSettingsStore.getState().hedgeExposedMode).toBe('net');
  });

  it('dispatches a navigation event to Hedge Pro when the hedge link is clicked', () => {
    const listener = vi.fn();
    window.addEventListener('navigate-to-tab', listener);

    renderCard(makePosition({ instrumentType: 'INVERSE', exchange: 'okx', symbol: 'BTCUSD' }));

    fireEvent.click(screen.getByText('Hedge / Exposure'));

    expect(listener).toHaveBeenCalledTimes(1);
    const detail = (listener.mock.calls[0][0] as CustomEvent).detail;
    expect(detail.tab).toBe('analytics-hedge-pro');
    expect(detail.targetId).toBe('hedge-row-conn-1:BTC');

    window.removeEventListener('navigate-to-tab', listener);
  });

  it('marks non-inverse positions as plain hedge/exposure without the mode toggle', () => {
    renderCard(makePosition({ instrumentType: 'PERP' }));

    expect(screen.getByText('Hedge / Exposure')).toBeInTheDocument();
    expect(screen.queryByText('gross')).not.toBeInTheDocument();
  });
});
