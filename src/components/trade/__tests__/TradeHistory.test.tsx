import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TradeHistory } from '../TradeHistory';
import { TooltipProvider } from '../../ui/Tooltip';
import { PrivacyProvider } from '../../../context/PrivacyContext';
import { useOrderReports } from '../../../hooks/useOrderReports';
import { useApiKeysStore } from '../../../store/apiKeysStore';
import { useSettingsStore } from '../../../store/settingsStore';
import { DEFAULT_TIME_PERIOD_MS } from '../../../utils/dateTimeHelper';
import i18n from '../../../i18n/config';

vi.mock('../../../hooks/useOrderReports', () => ({
  useOrderReports: vi.fn(),
}));

const sampleTrades = Array.from({ length: 8 }, (_, idx) => ({
  id: `trd-${idx}`,
  exchangeOrderId: `ex-trd-${idx}`,
  connectionId: 'conn-bitget',
  exchange: 'bitget',
  symbol: 'ETHUSDT',
  category: 'PERP',
  type: 'MARKET',
  side: idx % 2 === 0 ? 'buy' : 'sell',
  positionSide: 'long',
  price: 3000,
  avgPrice: 3000,
  qty: 1,
  filledQty: 1,
  value: 3000,
  fees: -1.8,
  feeCurrency: 'USDT',
  status: 'FILLED',
  createdTime: Date.now() - idx * 3600_000,
  updatedTime: Date.now() - idx * 3600_000,
}));

const renderTradeHistory = () =>
  render(
    <PrivacyProvider>
      <TooltipProvider>
        <TradeHistory />
      </TooltipProvider>
    </PrivacyProvider>
  );

describe('TradeHistory period & pagination integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    i18n.changeLanguage('en-US');
    useSettingsStore.setState({ useMockData: false, fiatCurrency: 'USD', locale: 'en-US', historyCacheInterval: 5 });
    useApiKeysStore.setState({
      keys: [
        { id: 'conn-bitget', exchange: 'bitget', label: 'Bitget Main', apiKey: 'k', apiSecret: 's', passphrase: 'p', isActive: true },
      ],
    } as never);
    vi.mocked(useOrderReports).mockReturnValue({
      fetchOrders: vi.fn(),
      orders: sampleTrades as never,
      loading: false,
      isSyncing: false,
      error: null,
      ordersSyncError: null,
    });
  });

  it('defaults to 7 Days and renders standardized 12 period options', () => {
    renderTradeHistory();

    expect(vi.mocked(useOrderReports).mock.calls[0]?.[0].timePeriod).toBe(DEFAULT_TIME_PERIOD_MS);
    fireEvent.click(screen.getByText('7 Days'));
    ['Today', '14 Days', 'MTD', 'YTD', 'Custom Range...', 'All Time'].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('shows HistoryLimitWarning for >90d Custom Range and triggers Pagination refreshKey', () => {
    renderTradeHistory();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('7 Days'));
    fireEvent.click(screen.getByText('Custom Range...'));
    fireEvent.change(screen.getByLabelText(/Start Date/i), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText(/End Date/i), { target: { value: '2026-05-01' } });
    fireEvent.click(screen.getByRole('button', { name: /Apply Range/i }));

    const lastFilters = vi.mocked(useOrderReports).mock.calls.at(-1)?.[0];
    expect(lastFilters?.timePeriod).toBe('custom');
    expect(lastFilters?.customStartDate).toBe('2026-01-01');
    expect(lastFilters?.customEndDate).toBe('2026-05-01');

    expect(screen.getByRole('status')).toHaveClass('history-limit-banner');
    expect(screen.getAllByText('Updating').length).toBeGreaterThan(0);
  });
});
