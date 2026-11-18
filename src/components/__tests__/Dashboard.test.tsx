import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Dashboard } from '../Dashboard';
import { TooltipProvider } from '../ui/Tooltip';
import { PrivacyProvider } from '../../context/PrivacyContext';
import { useBalancesStore } from '../../store/balancesStore';
import { usePositionsStore } from '../../store/positionsStore';
import { useApiKeysStore } from '../../store/apiKeysStore';
import { useSettingsStore } from '../../store/settingsStore';
import type { UnifiedPosition } from '../../types';
import i18n from '../../i18n/config';

vi.mock('../analytics/MacroCapitalChart', () => ({ MacroCapitalChart: () => <div data-testid="macro-chart" /> }));
vi.mock('../analytics/CrossExchangeAssetsChart', () => ({ CrossExchangeAssetsChart: () => <div data-testid="cross-exchange" /> }));
vi.mock('../analytics/MarketSentiment', () => ({ MarketSentiment: () => <div data-testid="market-sentiment" /> }));
vi.mock('../analytics/CurrencyRatesWidget', () => ({ CurrencyRatesWidget: () => <div data-testid="currency-widget" /> }));
vi.mock('../ExchangeHierarchyTable', () => ({ ExchangeHierarchyTable: () => <div data-testid="hierarchy-table" /> }));

const position = (id: string, overrides: Partial<UnifiedPosition> = {}): UnifiedPosition => ({
  id,
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
  unrealizedPnl: 500,
  realizedPnl: 20,
  leverage: 5,
  instrumentType: 'PERP',
  ...overrides,
});

const renderPage = () =>
  render(
    <PrivacyProvider>
      <TooltipProvider>
        <Dashboard />
      </TooltipProvider>
    </PrivacyProvider>
  );

describe('Dashboard', () => {
  beforeEach(() => {
    i18n.changeLanguage('en-US');
    localStorage.setItem('app_privacy_mode', 'false');
    useSettingsStore.setState({
      fiatCurrency: 'USD',
      locale: 'en-US',
      fiatRates: { USD: 1, EUR: 0.9, GBP: 0.8, BRL: 5 },
      useMockData: false,
    });
    useApiKeysStore.setState({ keys: [{ id: 'conn-1', exchange: 'bybit', label: 'Main', apiKey: 'k', apiSecret: 's', isActive: true }] } as never);
    useBalancesStore.setState({ balances: {} } as never);
    usePositionsStore.setState({ positions: {} });
  });

  it('renders the equity and P&L cards with the connected account data', () => {
    usePositionsStore.setState({ positions: { p1: position('p1') } });

    renderPage();

    expect(screen.getByText('Total Equity (USD)')).toBeInTheDocument();
    expect(screen.getByText('Net balance across all connected exchanges')).toBeInTheDocument();
    expect(screen.getByText('Open Positions P&L')).toBeInTheDocument();
    expect(screen.getAllByText('Active Positions').length).toBeGreaterThan(0);
    expect(screen.getByText('Unrealized P&L')).toBeInTheDocument();
    expect(screen.getByText('Realized P&L')).toBeInTheDocument();
  });

  it('counts only positions from active connections, ignoring mocked ones', () => {
    usePositionsStore.setState({
      positions: {
        p1: position('p1'),
        p2: position('p2', { connectionId: 'mocked-data-1', id: 'p2' }),
        p3: position('p3', { connectionId: 'conn-offline', id: 'p3' }),
      },
    });

    renderPage();

    // "1" appears as the active count next to the Active label.
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows the simulation banner when mock data is enabled', () => {
    useSettingsStore.setState({ useMockData: true });

    renderPage();

    expect(screen.getByText('Simulation Mode Active - Displaying Mock Data')).toBeInTheDocument();
  });

  it('hides the simulation banner in live mode', () => {
    renderPage();

    expect(screen.queryByText('Simulation Mode Active - Displaying Mock Data')).not.toBeInTheDocument();
  });

  it('navigates to open positions when the positions cards are clicked', () => {
    const listener = vi.fn();
    window.addEventListener('navigate-to-tab', listener);

    renderPage();
    fireEvent.click(screen.getByText('Open Positions P&L'));

    expect(listener).toHaveBeenCalledTimes(1);
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toBe('positions-open');

    window.removeEventListener('navigate-to-tab', listener);
  });

  it('masks P&L values in private mode', () => {
    localStorage.setItem('app_privacy_mode', 'true');
    usePositionsStore.setState({ positions: { p1: position('p1') } });

    renderPage();

    expect(screen.getAllByText('$••••').length).toBeGreaterThan(0);
  });

  it('renders the analytics sections', () => {
    useBalancesStore.setState({
      balances: {
        'conn-1-USDT': {
          id: 'conn-1-USDT',
          connectionId: 'conn-1',
          exchange: 'bybit',
          label: 'Main',
          ccy: 'USDT',
          amount: 1000,
          usdValue: 1000,
        },
      },
    } as never);
    renderPage();

    expect(screen.getByTestId('macro-chart')).toBeInTheDocument();
    expect(screen.getByTestId('cross-exchange')).toBeInTheDocument();
    expect(screen.getByTestId('market-sentiment')).toBeInTheDocument();
    expect(screen.getByTestId('currency-widget')).toBeInTheDocument();
    expect(screen.getByTestId('hierarchy-table')).toBeInTheDocument();
  });
});
