import React from 'react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { FundingDashboard } from '../FundingDashboard';
import { renderTransactionUi } from '../../../transactions/__tests__/transactionTestFixtures';

// Mock useFundingData with correct 4-level relative path
vi.mock('../../../../hooks/useFundingData', () => ({
  useFundingData: vi.fn(() => ({
    aggregatedData: [
      {
        exchange: 'bybit',
        symbol: 'BTCUSDT',
        instrumentType: 'USDT-M',
        nextFundingRate: 0.0001,
        lastFundingRate: 0.0001,
        todaySum: 0.0003,
        currentMonthSum: 0.005,
        lastMonthSum: 0.008,
        last3MonthsSum: 0.024,
        last6MonthsSum: 0.048,
        yearSum: 0.096,
      },
    ],
    isLoading: false,
    summaries: [],
  })),
}));

// Mock useFundingSync with correct 4-level relative path
vi.mock('../../../../hooks/useFundingSync', () => ({
  useFundingSync: vi.fn(() => ({
    isSyncing: false,
    syncProgress: 100,
    syncStage: 'idle',
    lastSyncTime: Date.now(),
    syncFundingData: vi.fn(),
    forceSync: vi.fn(),
  })),
}));

describe('FundingDashboard Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders title, subtitle, and column headers', () => {
    renderTransactionUi(<FundingDashboard />);

    expect(screen.getByText('Funding Fees & Historical Cash Flow')).toBeInTheDocument();
    expect(
      screen.getByText(/Track upcoming and settled funding rates/)
    ).toBeInTheDocument();

    expect(screen.getByText('Coin / Contract')).toBeInTheDocument();
    expect(screen.getByText('Next Rate')).toBeInTheDocument();
    expect(screen.getByText('Last Settled')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Current Month')).toBeInTheDocument();
    expect(screen.getByText('Last Month')).toBeInTheDocument();
    expect(screen.getByText('Last 3 Months')).toBeInTheDocument();
    expect(screen.getByText('Last 6 Months')).toBeInTheDocument();
    expect(screen.getByText('1 Year')).toBeInTheDocument();
  });

  it('renders data rows for active coin', () => {
    renderTransactionUi(<FundingDashboard />);

    expect(screen.getByText('BTC')).toBeInTheDocument();
  });
});
