import React from 'react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { PnLBySymbol } from '../PnLBySymbol';
import { renderTransactionUi, setPrivacyMode } from '../../transactions/__tests__/transactionTestFixtures';
import Big from 'big.js';

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
    setPrivacyMode(false);
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
});
