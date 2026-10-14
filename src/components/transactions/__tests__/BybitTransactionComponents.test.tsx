import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { BybitTransactionRow } from '../BybitTransactions/BybitTransactionRow';
import { BybitTransactionFilters } from '../BybitTransactions/BybitTransactionFilters';
import { BybitTransactionDetailsModal, DetailsModalType } from '../BybitTransactions/BybitTransactionDetailsModal';
import { TxFilters } from '../../../hooks/useBybitTransactions';
import { BybitTransactionLogEntry } from '../../../types';
import { useApiKeysStore } from '../../../store/apiKeysStore';
import {
  makeTransactionStats,
  makeTxFilters,
  renderTransactionUi,
  setPrivacyMode,
} from './transactionTestFixtures';

// The row resolves live USD prices over the network; pin them so rendering stays deterministic.
vi.mock('../../../hooks/useTokenUsdPrice', () => ({
  useTokenUsdPrice: () => 60000,
}));

const BYBIT_KEY_ID = 'conn-bybit-1';

const entry: BybitTransactionLogEntry = {
  id: `${BYBIT_KEY_ID}-raw-1-1705314600000`,
  connectionId: BYBIT_KEY_ID,
  exchange: 'bybit',
  label: 'Main UTA',
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
  funding: '0.25',
  fee: '-21',
  cashFlow: '-21021',
  change: '-21042',
  cashBalance: '5000',
  feeRate: '0.0005',
  bonusChange: '0',
  tradeId: 'trade-1',
  orderId: 'order-1',
  orderLinkId: 'link-1',
  raw: {},
};

function BybitFiltersHarness() {
  const [filters, setFilters] = useState<TxFilters>(makeTxFilters());
  return (
    <>
      <BybitTransactionFilters
        filters={filters}
        setFilters={setFilters}
        availableCurrencies={[{ value: 'USDT', label: 'USDT' }]}
      />
      <span data-testid="filters-search">{filters.search}</span>
    </>
  );
}

function renderDetailsModal(detailsModalType: DetailsModalType) {
  const setDetailsModalType = vi.fn();
  renderTransactionUi(
    <BybitTransactionDetailsModal
      detailsModalType={detailsModalType}
      setDetailsModalType={setDetailsModalType}
      stats={makeTransactionStats()}
      filteredEntries={[entry]}
      tokenRates={{ BTC: 60000 }}
      maskVal={(val) => String(val)}
      isPrivateMode={false}
    />
  );
  return setDetailsModalType;
}

beforeEach(() => {
  setPrivacyMode(false);
  useApiKeysStore.setState({
    keys: [
      {
        id: BYBIT_KEY_ID,
        label: 'Bybit Active Key',
        exchange: 'bybit',
        apiKey: 'api-key',
        apiSecret: 'api-secret',
        isActive: true,
      },
    ],
  });
});

describe('Bybit transaction components (components/transactions/BybitTransactions)', () => {
  describe('BybitTransactionRow', () => {
    it('renders the collapsed row with side, account label and column headers', () => {
      renderTransactionUi(<BybitTransactionRow entry={entry} isExpanded={false} onToggle={() => {}} />);

      expect(screen.getByText('Main UTA')).toBeDefined();
      expect(screen.getByText('Buy')).toBeDefined();
      expect(screen.getByText('Currency & Symbol')).toBeDefined();
      expect(screen.getByText('Type & Category')).toBeDefined();
      expect(screen.getAllByText('USDT').length).toBeGreaterThan(0);
    });

    it('calls onToggle when the row is clicked', () => {
      const onToggle = vi.fn();
      renderTransactionUi(<BybitTransactionRow entry={entry} isExpanded={false} onToggle={onToggle} />);

      fireEvent.click(screen.getByText('Type & Category'));

      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('reveals the detail panel with trade ids and resolved account label when expanded', () => {
      renderTransactionUi(<BybitTransactionRow entry={entry} isExpanded={true} onToggle={() => {}} />);

      expect(screen.getByText('Trade ID')).toBeDefined();
      expect(screen.getByText('trade-1')).toBeDefined();
      expect(screen.getByText('Order ID')).toBeDefined();
      expect(screen.getByText('order-1')).toBeDefined();
      expect(screen.getByText('Fee Rate')).toBeDefined();
      expect(screen.getByText('0.0005')).toBeDefined();
      expect(screen.getByText('Account')).toBeDefined();
      expect(screen.getByText('Bybit Active Key')).toBeDefined();
    });

    it('masks rendered values when privacy mode is active', () => {
      setPrivacyMode(true);
      renderTransactionUi(<BybitTransactionRow entry={entry} isExpanded={false} onToggle={() => {}} />);

      expect(screen.getAllByText('****').length).toBeGreaterThan(0);
    });
  });

  describe('BybitTransactionFilters', () => {
    it('renders every filter control', () => {
      renderTransactionUi(<BybitFiltersHarness />);

      expect(screen.getByPlaceholderText('Search symbol...')).toBeDefined();
      expect(screen.getByText('All Categories')).toBeDefined();
      expect(screen.getByText('All Types')).toBeDefined();
      expect(screen.getByText('All Currencies')).toBeDefined();
      expect(screen.getByText('All Accounts')).toBeDefined();
    });

    it('propagates the typed search term through setFilters', () => {
      renderTransactionUi(<BybitFiltersHarness />);

      fireEvent.change(screen.getByPlaceholderText('Search symbol...'), { target: { value: 'BTC' } });

      expect(screen.getByTestId('filters-search').textContent).toBe('BTC');
    });
  });

  describe('BybitTransactionDetailsModal', () => {
    it('renders nothing while no modal type is selected', () => {
      renderDetailsModal(null);

      expect(screen.queryByText('Funding Breakdown')).toBeNull();
      expect(screen.queryByText('Total Transactions Breakdown')).toBeNull();
    });

    it('renders the funding breakdown and closes through setDetailsModalType', () => {
      const setDetailsModalType = renderDetailsModal('funding');

      expect(screen.getByText('Funding Breakdown')).toBeDefined();
      expect(screen.getByText('Total (USD Eq.)')).toBeDefined();

      fireEvent.click(screen.getByRole('button'));

      expect(setDetailsModalType).toHaveBeenCalledWith(null);
    });

    it('renders the transaction count breakdown', () => {
      renderDetailsModal('tx');

      expect(screen.getByText('Total Transactions Breakdown')).toBeDefined();
      expect(screen.getByText('Total Transactions')).toBeDefined();
    });

    it('renders the net change report', () => {
      renderDetailsModal('netchange');

      expect(screen.getByText('Net Change Report (USD)')).toBeDefined();
    });
  });
});
