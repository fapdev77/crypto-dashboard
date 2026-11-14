import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OpenPositions } from '../OpenPositions';
import { TooltipProvider } from '../ui/Tooltip';
import { PrivacyProvider } from '../../context/PrivacyContext';
import { usePositionsStore } from '../../store/positionsStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useApiKeysStore } from '../../store/apiKeysStore';
import { useBalancesStore } from '../../store/balancesStore';
import type { UnifiedPosition } from '../../types';
import i18n from '../../i18n/config';

vi.mock('../../services/AssetClassifierAggregator', () => ({
  AssetClassifierAggregator: {
    getGlobalCategorySync: () => 'CRYPTO',
    getGlobalAssetCategory: vi.fn().mockResolvedValue('CRYPTO'),
  },
}));

const position = (overrides: Partial<UnifiedPosition>): UnifiedPosition => ({
  id: 'pos-1',
  connectionId: 'conn-1',
  exchange: 'bybit',
  label: 'Main',
  symbol: 'BTCUSDT',
  baseCoin: 'BTC',
  quoteCoin: 'USDT',
  side: 'long',
  size: 1,
  entryPrice: 60000,
  markPrice: 62000,
  unrealizedPnl: 100,
  realizedPnl: 10,
  leverage: 5,
  marginMode: 'cross',
  instrumentType: 'PERP',
  ...overrides,
});

const renderPage = () =>
  render(
    <PrivacyProvider>
      <TooltipProvider>
        <OpenPositions />
      </TooltipProvider>
    </PrivacyProvider>
  );

const activeKey = {
  id: 'conn-1',
  exchange: 'bybit' as const,
  label: 'Main',
  apiKey: 'key',
  apiSecret: 'secret',
  isActive: true,
};

describe('OpenPositions', () => {
  beforeEach(() => {
    i18n.changeLanguage('en-US');
    localStorage.setItem('app_privacy_mode', 'false');
    useSettingsStore.setState({
      fiatCurrency: 'USD',
      locale: 'en-US',
      fiatRates: { USD: 1, EUR: 0.9, GBP: 0.8, BRL: 5 },
      useMockData: false,
      hedgeExposedMode: 'gross',
    });
    useBalancesStore.setState({ balances: {} });
    useApiKeysStore.setState({ keys: [] });
    usePositionsStore.setState({ positions: {} });
  });

  it('shows the empty state when there is no active API connection', () => {
    usePositionsStore.setState({ positions: { 'pos-1': position({}) } });

    renderPage();

    expect(screen.getByText('Open Positions')).toBeInTheDocument();
    expect(screen.getByText(/No open positions found/)).toBeInTheDocument();
  });

  it('aggregates totals and long/short split for active positions', () => {
    useApiKeysStore.setState({ keys: [activeKey] });
    usePositionsStore.setState({
      positions: {
        a: position({ id: 'a', side: 'long', unrealizedPnl: 100 }),
        b: position({ id: 'b', side: 'short', unrealizedPnl: -40 }),
      },
    });

    renderPage();

    expect(screen.getByText('Total Positions:')).toBeInTheDocument();
    expect(screen.getByText(/1 Longs \(50%\)/)).toBeInTheDocument();
    expect(screen.getByText(/1 Shorts \(50%\)/)).toBeInTheDocument();
  });

  it('ignores positions whose connection is not an active key', () => {
    useApiKeysStore.setState({ keys: [activeKey] });
    usePositionsStore.setState({
      positions: {
        a: position({ id: 'a', connectionId: 'conn-1' }),
        b: position({ id: 'b', connectionId: 'conn-2', symbol: 'ETHUSDT' }),
      },
    });

    renderPage();

    expect(screen.getByText('BTCUSDT')).toBeInTheDocument();
    expect(screen.queryByText('ETHUSDT')).not.toBeInTheDocument();
  });

  it('filters positions by the search field', () => {
    useApiKeysStore.setState({ keys: [activeKey] });
    usePositionsStore.setState({
      positions: {
        a: position({ id: 'a', symbol: 'BTCUSDT' }),
        b: position({ id: 'b', symbol: 'ETHUSDT', baseCoin: 'ETH' }),
      },
    });

    renderPage();

    fireEvent.change(screen.getByPlaceholderText(/Search/), { target: { value: 'eth' } });

    expect(screen.queryByText('BTCUSDT')).not.toBeInTheDocument();
    expect(screen.getByText('ETHUSDT')).toBeInTheDocument();
  });

  it('uses mocked positions when simulation mode is enabled', () => {
    useSettingsStore.setState({ useMockData: true });
    usePositionsStore.setState({
      positions: {
        mocked: position({ id: 'mocked', connectionId: 'mocked-data-1', symbol: 'SOLUSDT', baseCoin: 'SOL' }),
        real: position({ id: 'real', connectionId: 'conn-1', symbol: 'BTCUSDT' }),
      },
    });

    renderPage();

    expect(screen.getByText('SOLUSDT')).toBeInTheDocument();
    expect(screen.queryByText('BTCUSDT')).not.toBeInTheDocument();
  });

  it('expands a position row to reveal the detail grid', () => {
    useApiKeysStore.setState({ keys: [activeKey] });
    usePositionsStore.setState({ positions: { a: position({ id: 'a' }) } });

    renderPage();

    expect(screen.queryByText('Breakeven price')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('BTCUSDT'));
    expect(screen.getByText('Breakeven price')).toBeInTheDocument();
  });

  it('switches the hedge exposed mode from the header controls', () => {
    useApiKeysStore.setState({ keys: [activeKey] });
    usePositionsStore.setState({ positions: { a: position({ id: 'a' }) } });

    renderPage();

    fireEvent.click(screen.getByText('Net'));

    expect(useSettingsStore.getState().hedgeExposedMode).toBe('net');
  });
});
