import React from 'react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { PnLBySymbol } from '../PnLBySymbol';
import { renderTransactionUi, setPrivacyMode } from '../../transactions/__tests__/transactionTestFixtures';
import Big from 'big.js';
import { usePnLBySymbol } from '../../../hooks/usePnLBySymbol';
import { useApiKeysStore } from '../../../store/apiKeysStore';
import { DEFAULT_TIME_PERIOD_MS } from '../../../utils/dateTimeHelper';
import i18n from '../../../i18n/config';

// Mock usePnLBySymbol
const mockPnlData = [
  {
    exchange: 'bybit',
    symbol: 'BTCUSDT',
    instrument: 'Linear',
    totalPnL: new Big('1250.50'),
    longPnL: new Big('1500.00'),
    shortPnL: new Big('-249.50'),
    ccy: 'USDT',
  },
  {
    exchange: 'bitget',
    symbol: 'ETHUSDT',
    instrument: 'USDT-M',
    totalPnL: new Big('-320.10'),
    longPnL: new Big('100.00'),
    shortPnL: new Big('-420.10'),
    ccy: 'USDT',
  },
];

vi.mock('../../../hooks/usePnLBySymbol', () => ({
  usePnLBySymbol: vi.fn(() => ({
    pnlData: mockPnlData,
    isLoading: false,
    isSyncing: false,
    syncMessage: '',
    syncError: null,
    isRealPnLSyncing: false,
  })),
}));

describe('PnLBySymbol Component', () => {
  beforeEach(() => {
    localStorage.clear();
    i18n.changeLanguage('en-US');
    setPrivacyMode(false);
    vi.clearAllMocks();
    useApiKeysStore.setState({
      keys: [
        { id: 'conn-bybit', exchange: 'bybit', label: 'Bybit Main', apiKey: 'k1', apiSecret: 's1', isActive: true },
        { id: 'conn-okx', exchange: 'okx', label: 'OKX Main', apiKey: 'k2', apiSecret: 's2', passphrase: 'p2', isActive: true },
      ],
    } as never);
  });

  it('renders title, subtitle, and export report button', () => {
    renderTransactionUi(<PnLBySymbol />);

    expect(screen.getByText('PnL by Symbol')).toBeInTheDocument();
    expect(screen.getByText(/To represent the actual PnL/)).toBeInTheDocument();
    expect(screen.getByText('Export Report')).toBeInTheDocument();
  });

  it('renders table headers and rows with symbols', () => {
    renderTransactionUi(<PnLBySymbol />);

    expect(screen.getByText('Exchange')).toBeInTheDocument();
    expect(screen.getByText('Symbol')).toBeInTheDocument();
    expect(screen.getByText('Instrument')).toBeInTheDocument();
    expect(screen.getByText('Total Realized PnL')).toBeInTheDocument();
    expect(screen.getByText('Long Realized PnL')).toBeInTheDocument();
    expect(screen.getByText('Short Realized PnL')).toBeInTheDocument();

    expect(screen.getByText('BTCUSDT')).toBeInTheDocument();
    expect(screen.getByText('ETHUSDT')).toBeInTheDocument();
  });

  it('masks values when privacy mode is active', () => {
    setPrivacyMode(true);
    renderTransactionUi(<PnLBySymbol />);

    // Values should be masked with dots or hidden
    const maskedElements = screen.getAllByText(/••••/);
    expect(maskedElements.length).toBeGreaterThan(0);
  });

  it('defaults to 7 Days and keeps all 12 period options visible when switching exchange to OKX', () => {
    renderTransactionUi(<PnLBySymbol />);

    expect(vi.mocked(usePnLBySymbol).mock.calls[0]?.[0]).toBe(DEFAULT_TIME_PERIOD_MS);

    // Select 120 Days first
    fireEvent.click(screen.getByText('7 Days'));
    fireEvent.click(screen.getByText('120 Days'));
    expect(vi.mocked(usePnLBySymbol).mock.calls.at(-1)?.[0]).toBe(String(120 * 24 * 60 * 60 * 1000));

    // Switch exchange to OKX — period should NOT be reset and all 12 options stay available
    fireEvent.click(screen.getByText('All Exchanges'));
    fireEvent.click(screen.getByRole('button', { name: /okx/i }));

    expect(vi.mocked(usePnLBySymbol).mock.calls.at(-1)?.[0]).toBe(String(120 * 24 * 60 * 60 * 1000));
    expect(screen.getByRole('status')).toHaveClass('history-limit-banner');

    fireEvent.click(screen.getByText('120 Days'));
    ['Today', 'MTD', 'YTD', 'Custom Range...', 'All Time'].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('opens CustomDateRangeModal and forwards custom bounds to usePnLBySymbol', () => {
    renderTransactionUi(<PnLBySymbol />);

    fireEvent.click(screen.getByText('7 Days'));
    fireEvent.click(screen.getByText('Custom Range...'));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Start Date/i), { target: { value: '2026-02-01' } });
    fireEvent.change(screen.getByLabelText(/End Date/i), { target: { value: '2026-02-14' } });
    fireEvent.click(screen.getByRole('button', { name: /Apply Range/i }));

    const lastCall = vi.mocked(usePnLBySymbol).mock.calls.at(-1);
    expect(lastCall?.[0]).toBe('custom');
    expect(lastCall?.[3]).toBe('2026-02-01');
    expect(lastCall?.[4]).toBe('2026-02-14');
  });
});
