import React, { useState } from 'react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { ConsolidatedNetChangeReport } from '../ConsolidatedTransactions/ConsolidatedNetChangeReport';
import { ConsolidatedTransactionFilters } from '../ConsolidatedTransactions/ConsolidatedTransactionFilters';
import { ConsolidatedTransactionDetailsModal } from '../ConsolidatedTransactions/ConsolidatedTransactionDetailsModal';
import { ConsolidatedTxFilters, defaultConsolidatedFilters, ConsolidatedStats } from '../../../hooks/useConsolidatedTransactions';
import { BybitTransactionLogEntry, BitgetTransactionLogEntry, OkxTransactionLogEntry } from '../../../types';
import { useApiKeysStore } from '../../../store/apiKeysStore';
import { renderTransactionUi, setPrivacyMode } from './transactionTestFixtures';

const sampleBybitEntry: BybitTransactionLogEntry = {
  id: 'conn-bybit-raw-1',
  connectionId: 'conn-bybit-1',
  exchange: 'bybit',
  label: 'Bybit Main',
  rawId: 'raw-1',
  symbol: 'BTCUSDT',
  category: 'linear',
  side: 'Buy',
  transactionTime: Date.UTC(2024, 0, 15, 10, 30, 0),
  type: 'TRADE',
  transSubType: 'trade',
  qty: '0.5',
  size: '0.5',
  currency: 'USDT',
  tradePrice: '42000',
  funding: '1.5',
  fee: '-5.2',
  cashFlow: '100',
  change: '96.3',
  cashBalance: '5000',
  feeRate: '0.0005',
  bonusChange: '0',
  tradeId: 'trade-1',
  orderId: 'order-1',
  orderLinkId: 'link-1',
  raw: {},
};

const sampleBitgetEntry: BitgetTransactionLogEntry = {
  id: 'conn-bitget-raw-1',
  connectionId: 'conn-bitget-1',
  exchange: 'bitget',
  label: 'Bitget Main',
  rawId: 'bg-1',
  symbol: 'BTCUSDT',
  category: 'usdt-futures',
  side: 'Buy',
  transactionTime: Date.UTC(2024, 0, 16, 12, 0, 0),
  type: 'ORDER_DEALT_IN',
  currency: 'USDT',
  fee: '2.1',
  cashFlow: '50',
  change: '47.9',
  cashBalance: '3500',
  raw: {},
};

const sampleOkxEntry: OkxTransactionLogEntry = {
  id: 'conn-okx-raw-1',
  connectionId: 'conn-okx-1',
  exchange: 'okx',
  label: 'OKX Main',
  rawId: 'okx-1',
  symbol: 'BTC-USDT-SWAP',
  category: 'SWAP',
  side: 'Buy',
  transactionTime: Date.UTC(2024, 0, 17, 14, 0, 0),
  type: 'Trade',
  currency: 'USDT',
  fee: '-1.8',
  cashFlow: '80',
  change: '78.2',
  cashBalance: '4200',
  raw: {},
};

const sampleExchangeStats = {
  bybit: {
    totalCount: 1,
    typeBreakdown: { TRADE: 1 },
    stable: {
      totalFunding: '1.5',
      totalFees: '5.2',
      totalCashFlow: '100',
      totalChange: '96.3',
      finalBalance: '5000',
      totalInflow: '0',
      totalOutflow: '0',
      initialBalance: '4903.7',
      percentageChange: 1.96,
    },
    perCurrency: {},
    aggregatedUsd: {
      totalFunding: '1.5',
      totalFees: '5.2',
      totalCashFlow: '100',
      totalChange: '96.3',
      finalBalance: '5000',
      totalInflow: '0',
      totalOutflow: '0',
      initialBalance: '4903.7',
      percentageChange: 1.96,
    },
  },
  bitget: {
    totalCount: 1,
    typeBreakdown: { TRADE: 1 },
    stable: {
      totalFunding: '0',
      totalFees: '2.1',
      totalCashFlow: '50',
      totalChange: '47.9',
      finalBalance: '3500',
      totalInflow: '0',
      totalOutflow: '0',
      initialBalance: '3452.1',
      percentageChange: 1.38,
    },
    perCurrency: {},
    aggregatedUsd: {
      totalFunding: '0',
      totalFees: '2.1',
      totalCashFlow: '50',
      totalChange: '47.9',
      finalBalance: '3500',
      totalInflow: '0',
      totalOutflow: '0',
      initialBalance: '3452.1',
      percentageChange: 1.38,
    },
  },
  okx: {
    totalCount: 1,
    typeBreakdown: { TRADE: 1 },
    stable: {
      totalFunding: '0',
      totalFees: '1.8',
      totalCashFlow: '80',
      totalChange: '78.2',
      finalBalance: '4200',
      totalInflow: '0',
      totalOutflow: '0',
      initialBalance: '4121.8',
      percentageChange: 1.89,
    },
    perCurrency: {},
    aggregatedUsd: {
      totalFunding: '0',
      totalFees: '1.8',
      totalCashFlow: '80',
      totalChange: '78.2',
      finalBalance: '4200',
      totalInflow: '0',
      totalOutflow: '0',
      initialBalance: '4121.8',
      percentageChange: 1.89,
    },
  },
};

const consolidatedStats: ConsolidatedStats = {
  totalCount: 3,
  typeBreakdown: { TRADE: 3 },
  stable: {
    totalFunding: '1.5',
    totalFees: '9.1',
    totalCashFlow: '230',
    totalChange: '222.4',
    finalBalance: '12700',
    totalInflow: '0',
    totalOutflow: '0',
    initialBalance: '12477.6',
    percentageChange: 1.78,
  },
  perCurrency: {},
  aggregatedUsd: {
    totalFunding: '1.5',
    totalFees: '9.1',
    totalCashFlow: '230',
    totalChange: '222.4',
    finalBalance: '12700',
    totalInflow: '0',
    totalOutflow: '0',
    initialBalance: '12477.6',
    percentageChange: 1.78,
  },
  byExchange: sampleExchangeStats,
};

function FiltersHarness() {
  const [filters, setFilters] = useState<ConsolidatedTxFilters>(defaultConsolidatedFilters);
  return (
    <ConsolidatedTransactionFilters
      filters={filters}
      setFilters={setFilters}
      availableCurrencies={['USDT', 'BTC', 'ETH']}
    />
  );
}

describe('ConsolidatedTransactionComponents', () => {
  beforeEach(() => {
    setPrivacyMode(false);
    useApiKeysStore.setState({
      keys: [
        { id: 'conn-bybit-1', exchange: 'bybit', label: 'Bybit Main', apiKey: 'k1', apiSecret: 's1', isActive: true },
        { id: 'conn-bitget-1', exchange: 'bitget', label: 'Bitget Main', apiKey: 'k2', apiSecret: 's2', passphrase: 'p2', isActive: true },
        { id: 'conn-okx-1', exchange: 'okx', label: 'OKX Main', apiKey: 'k3', apiSecret: 's3', passphrase: 'p3', isActive: true },
      ],
    });
  });

  it('renders exchange groups and currency headers in ConsolidatedNetChangeReport', () => {
    renderTransactionUi(
      <ConsolidatedNetChangeReport
        filteredByExchange={{
          bybit: [sampleBybitEntry],
          bitget: [sampleBitgetEntry],
          okx: [sampleOkxEntry],
        }}
        exchangeStats={sampleExchangeStats}
        tokenRates={{ USDT: 1 }}
        isPrivateMode={false}
      />
    );

    // Should display exchange group titles
    expect(screen.getByText('Bybit')).toBeInTheDocument();
    expect(screen.getByText('Bitget')).toBeInTheDocument();
    expect(screen.getByText('OKX')).toBeInTheDocument();

    // Should display USDT asset tags
    const usdtLabels = screen.getAllByText('USDT');
    expect(usdtLabels.length).toBeGreaterThanOrEqual(3);
  });

  it('toggles currency details when clicked and responds to Expand All / Collapse All', () => {
    renderTransactionUi(
      <ConsolidatedNetChangeReport
        filteredByExchange={{
          bybit: [sampleBybitEntry],
          bitget: [],
          okx: [],
        }}
        exchangeStats={sampleExchangeStats}
        tokenRates={{ USDT: 1 }}
        isPrivateMode={false}
      />
    );

    expect(screen.queryByText('Primary Result')).not.toBeInTheDocument();

    // Click Expand All
    fireEvent.click(screen.getByRole('button', { name: /expand all/i }));
    expect(screen.getByText('Primary Result')).toBeInTheDocument();
    expect(screen.getByText('Operational Metrics')).toBeInTheDocument();

    // Click Collapse All
    fireEvent.click(screen.getByRole('button', { name: /collapse all/i }));
    expect(screen.queryByText('Primary Result')).not.toBeInTheDocument();
  });

  it('masks values when privacy mode is active', () => {
    renderTransactionUi(
      <ConsolidatedNetChangeReport
        filteredByExchange={{
          bybit: [sampleBybitEntry],
          bitget: [],
          okx: [],
        }}
        exchangeStats={sampleExchangeStats}
        tokenRates={{ USDT: 1 }}
        isPrivateMode={true}
      />
    );

    // Expand to see inner details
    fireEvent.click(screen.getByRole('button', { name: /expand all/i }));

    const maskedTokens = screen.getAllByText('****');
    expect(maskedTokens.length).toBeGreaterThan(0);
  });

  it('renders filter controls and exchange dropdown', () => {
    renderTransactionUi(<FiltersHarness />);

    // Search input
    expect(screen.getByPlaceholderText('Search symbol or asset...')).toBeInTheDocument();

    // Dropdowns
    expect(screen.getByRole('button', { name: /all exchanges/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /all accounts/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /all categories/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /all types/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /all currencies/i })).toBeInTheDocument();
  });

  it('renders ConsolidatedTransactionDetailsModal correctly for different types', () => {
    const setModalMock = vi.fn();

    // Test 'tx' breakdown modal
    const { unmount } = renderTransactionUi(
      <ConsolidatedTransactionDetailsModal
        detailsModalType="tx"
        setDetailsModalType={setModalMock}
        stats={consolidatedStats}
        tokenRates={{ USDT: 1 }}
        maskVal={(v) => `$${v}`}
        isPrivateMode={false}
      />
    );

    expect(screen.getByText('Total Transactions by Type')).toBeInTheDocument();
    expect(screen.getByText('Trade')).toBeInTheDocument();
    unmount();

    // Test 'funding' modal
    renderTransactionUi(
      <ConsolidatedTransactionDetailsModal
        detailsModalType="funding"
        setDetailsModalType={setModalMock}
        stats={consolidatedStats}
        tokenRates={{ USDT: 1 }}
        maskVal={(v) => `$${v}`}
        isPrivateMode={false}
      />
    );

    expect(screen.getByText('Consolidated Funding Breakdown (USD)')).toBeInTheDocument();
    expect(screen.getByText('Breakdown by Exchange Venue')).toBeInTheDocument();
    expect(screen.getByText('Grand Total (USD)')).toBeInTheDocument();
  });
});
