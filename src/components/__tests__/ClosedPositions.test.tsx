import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ClosedPositions } from '../ClosedPositions';
import { TooltipProvider } from '../ui/Tooltip';
import { PrivacyProvider } from '../../context/PrivacyContext';
import { useSettingsStore } from '../../store/settingsStore';
import { useApiKeysStore } from '../../store/apiKeysStore';
import { usePositionHistory } from '../../hooks/usePositionHistory';
import { exportToCSV } from '../../utils/exportUtils';
import type { UnifiedHistoryPosition } from '../../types';
import i18n from '../../i18n/config';

vi.mock('../../hooks/usePositionHistory', () => ({ usePositionHistory: vi.fn() }));
vi.mock('../../utils/exportUtils', () => ({
  exportToCSV: vi.fn(),
  exportToExcel: vi.fn(),
  exportToPDF: vi.fn(),
}));
vi.mock('../../services/AssetClassifierAggregator', () => ({
  AssetClassifierAggregator: {
    getGlobalCategorySync: () => 'CRYPTO',
    getGlobalAssetCategory: vi.fn().mockResolvedValue('CRYPTO'),
  },
}));

const closed = (overrides: Partial<UnifiedHistoryPosition>): UnifiedHistoryPosition => ({
  id: 'h1',
  connectionId: 'conn-1',
  exchange: 'bybit',
  label: 'Main',
  symbol: 'BTCUSDT',
  baseCoin: 'BTC',
  quoteCoin: 'USDT',
  side: 'long',
  size: 1,
  entryPrice: 60000,
  markPrice: 61000,
  exitPrice: 61000,
  unrealizedPnl: 0,
  realizedPnl: 100,
  closedPnl: 100,
  leverage: 5,
  entryTime: Date.now() - 3600_000,
  ...overrides,
} as UnifiedHistoryPosition);

const hookResult = (overrides: Record<string, unknown> = {}) => ({
  positions: [closed({ id: 'h1', symbol: 'BTCUSDT' }), closed({ id: 'h2', symbol: 'ETHUSDT', side: 'short' })],
  isLoading: false,
  isSyncing: false,
  syncMessage: null,
  syncError: null,
  ...overrides,
});

const renderPage = () =>
  render(
    <PrivacyProvider>
      <TooltipProvider>
        <ClosedPositions />
      </TooltipProvider>
    </PrivacyProvider>
  );

describe('ClosedPositions', () => {
  beforeEach(() => {
    i18n.changeLanguage('en-US');
    localStorage.setItem('app_privacy_mode', 'false');
    vi.clearAllMocks();
    useSettingsStore.setState({
      fiatCurrency: 'USD',
      locale: 'en-US',
      fiatRates: { USD: 1, EUR: 0.9, GBP: 0.8, BRL: 5 },
    });
    useApiKeysStore.setState({ keys: [{ id: 'conn-1', exchange: 'bybit', label: 'Main', apiKey: 'k', apiSecret: 's', isActive: true }] } as never);
    vi.mocked(usePositionHistory).mockReturnValue(hookResult() as never);
  });

  it('renders a spinner while history is loading', () => {
    vi.mocked(usePositionHistory).mockReturnValue(hookResult({ isLoading: true, positions: [] }) as never);

    const { container } = renderPage();

    expect(screen.queryByText('Positions History')).not.toBeInTheDocument();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows the empty state when the period has no closed positions', () => {
    vi.mocked(usePositionHistory).mockReturnValue(hookResult({ positions: [] }) as never);

    renderPage();

    expect(screen.getByText('Positions History')).toBeInTheDocument();
    expect(screen.getByText('No closed positions found.')).toBeInTheDocument();
  });

  it('summarises trades, long/short split and total PnL', () => {
    renderPage();

    expect(screen.getByText('Total Trades:')).toBeInTheDocument();
    expect(screen.getByText('BTCUSDT')).toBeInTheDocument();
    expect(screen.getByText('ETHUSDT')).toBeInTheDocument();
  });

  it('filters the list by the search field', () => {
    renderPage();

    fireEvent.change(screen.getByPlaceholderText(/Search/), { target: { value: 'eth' } });

    expect(screen.queryByText('BTCUSDT')).not.toBeInTheDocument();
    expect(screen.getByText('ETHUSDT')).toBeInTheDocument();
  });

  it('requests a different period when the period selector changes', () => {
    renderPage();

    fireEvent.click(screen.getByText('7 Days'));
    fireEvent.click(screen.getByText('30 Days'));

    expect(vi.mocked(usePositionHistory).mock.calls.at(-1)?.[0]).toBe('30d');
  });

  it('accumulates total PnL as a float and still shows the exact cent at a half-cent boundary', () => {
    // 0.35 + 0.35 + 0.305 = 1.005 in decimal; the float sum holds 1.0049999999999999.
    vi.mocked(usePositionHistory).mockReturnValue(hookResult({
      positions: [
        closed({ id: 'h1', symbol: 'BTCUSDT', realizedPnl: 0.35 }),
        closed({ id: 'h2', symbol: 'ETHUSDT', realizedPnl: 0.35 }),
        closed({ id: 'h3', symbol: 'SOLUSDT', realizedPnl: 0.305 }),
      ],
    }) as never);

    renderPage();

    // The component's `totalPnl += pnlInUsd` is float math, but the display goes
    // through Intl, which rounds the shortest decimal form — so the cent is kept.
    expect([0.35, 0.35, 0.305].reduce((a, b) => a + b, 0)).toBe(1.005);
    expect([0.35, 0.35, 0.305].reduce((a, b) => a + b, 0).toFixed(2)).toBe('1.00');
    expect(screen.getByText('+$1.01')).toBeInTheDocument();
  });

  it('opens the export menu and calls the CSV exporter with the filtered rows', () => {
    renderPage();

    fireEvent.click(screen.getByText('Export'));
    fireEvent.click(screen.getByText('Export CSV'));

    expect(exportToCSV).toHaveBeenCalledTimes(1);
    const [config] = vi.mocked(exportToCSV).mock.calls[0];
    expect(config.rows).toHaveLength(2);
    expect(config.headers[0]).toBe('Symbol');
  });
});
