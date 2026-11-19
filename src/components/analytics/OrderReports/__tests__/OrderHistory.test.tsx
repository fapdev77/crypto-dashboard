import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderHistory } from '../OrderHistory';
import { TooltipProvider } from '../../../ui/Tooltip';
import { PrivacyProvider } from '../../../../context/PrivacyContext';
import { useOrderReports } from '../../../../hooks/useOrderReports';
import { useApiKeysStore } from '../../../../store/apiKeysStore';
import { useSettingsStore } from '../../../../store/settingsStore';
import { DEFAULT_TIME_PERIOD_MS, parseDateStartOfDay, parseDateEndOfDay } from '../../../../utils/dateTimeHelper';
import i18n from '../../../../i18n/config';

const mockFetchBills = vi.fn().mockResolvedValue([]);

vi.mock('../../../../hooks/useOrderReports', () => ({
  useOrderReports: vi.fn(),
}));

vi.mock('../../../../services/bills/BillsHistoryService', () => ({
  BillsHistoryService: class {
    fetchBills = mockFetchBills;
  },
}));

vi.mock('../../../../services/pricing/usdPrice', () => ({
  getUsdPrice: vi.fn().mockResolvedValue(1),
}));

const sampleOrders = Array.from({ length: 8 }, (_, idx) => ({
  id: `ord-${idx}`,
  exchangeOrderId: `ex-ord-${idx}`,
  connectionId: 'conn-okx',
  exchange: 'okx',
  symbol: 'BTC-USDT-SWAP',
  category: 'PERP',
  type: 'LIMIT',
  side: idx % 2 === 0 ? 'buy' : 'sell',
  positionSide: 'long',
  price: 60000,
  avgPrice: 60000,
  qty: 0.1,
  filledQty: 0.1,
  value: 6000,
  fees: -1.5,
  feeCurrency: 'USDT',
  status: 'FILLED',
  createdTime: Date.now() - idx * 3600_000,
  updatedTime: Date.now() - idx * 3600_000,
}));

const renderOrderHistory = () =>
  render(
    <PrivacyProvider>
      <TooltipProvider>
        <OrderHistory />
      </TooltipProvider>
    </PrivacyProvider>
  );

describe('OrderHistory period & funding integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    i18n.changeLanguage('en-US');
    useSettingsStore.setState({ useMockData: false, fiatCurrency: 'USD', locale: 'en-US', historyCacheInterval: 5 });
    useApiKeysStore.setState({
      keys: [
        { id: 'conn-okx', exchange: 'okx', label: 'OKX Main', apiKey: 'k', apiSecret: 's', passphrase: 'p', isActive: true },
      ],
    } as never);
    vi.mocked(useOrderReports).mockReturnValue({
      fetchOrders: vi.fn(),
      orders: sampleOrders as never,
      loading: false,
      isSyncing: false,
      error: null,
      ordersSyncError: null,
    });
  });

  it('defaults to 7 Days and passes DEFAULT_TIME_PERIOD_MS to useOrderReports', async () => {
    renderOrderHistory();

    expect(vi.mocked(useOrderReports).mock.calls[0]?.[0].timePeriod).toBe(DEFAULT_TIME_PERIOD_MS);
    expect(screen.getByText('7 Days')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockFetchBills).toHaveBeenCalledTimes(1);
    });
  });

  it('recalculates funding bills when Custom Range changes and avoids 7d fallback on All Time', async () => {
    renderOrderHistory();

    await waitFor(() => {
      expect(mockFetchBills).toHaveBeenCalledTimes(1);
    });
    const [, initialStart, initialEnd] = mockFetchBills.mock.calls[0];
    expect(typeof initialStart).toBe('number');
    expect(typeof initialEnd).toBe('number');

    // Select Custom Range
    fireEvent.click(screen.getByText('7 Days'));
    fireEvent.click(screen.getByText('Custom Range...'));
    fireEvent.change(screen.getByLabelText(/Start Date/i), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText(/End Date/i), { target: { value: '2026-06-01' } });
    fireEvent.click(screen.getByRole('button', { name: /Apply Range/i }));

    await waitFor(() => {
      expect(mockFetchBills).toHaveBeenCalledTimes(2);
    });
    const [, customStart, customEnd] = mockFetchBills.mock.calls[1];
    expect(customStart).toBe(parseDateStartOfDay('2026-01-01'));
    expect(customEnd).toBe(parseDateEndOfDay('2026-06-01'));

    // Pagination refresh indicator triggers when Custom Range updates refreshKey
    expect(screen.getAllByText('Updating').length).toBeGreaterThan(0);

    // HistoryLimitWarning appears because 2026-01-01 -> 2026-06-01 (>90 days) with active OKX key
    expect(screen.getByRole('status')).toHaveClass('history-limit-banner');

    // Switch to All Time -> fetchBills receives undefined bounds (not a 7-day fallback)
    fireEvent.click(screen.getByText(/2026-01-01 ~ 2026-06-01/));
    fireEvent.click(screen.getByText('All Time'));

    await waitFor(() => {
      expect(mockFetchBills).toHaveBeenCalledTimes(3);
    });
    const [, allStart, allEnd] = mockFetchBills.mock.calls[2];
    expect(allStart).toBeUndefined();
    expect(allEnd).toBeUndefined();
  });
});
