import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { BitgetTransactionRow } from '../BitgetTransactions/BitgetTransactionRow';
import { BitgetTransactionFilters } from '../BitgetTransactions/BitgetTransactionFilters';
import { BitgetTransactionDetailsModal, BitgetDetailsModalType } from '../BitgetTransactions/BitgetTransactionDetailsModal';
import { BitgetTxFilters } from '../../../hooks/useBitgetTransactions';
import { BitgetTransactionLogEntry } from '../../../types';
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

const BITGET_KEY_ID = 'conn-bitget-1';

const entry: BitgetTransactionLogEntry = {
  id: `${BITGET_KEY_ID}-raw-1-1705314600000`,
  connectionId: BITGET_KEY_ID,
  exchange: 'bitget',
  accountType: 'uta',
  label: 'Bitget UTA',
  rawId: 'raw-1',
  symbol: 'ETHUSDT',
  category: 'USDT-FUTURES',
  side: 'Buy',
  transactionTime: Date.UTC(2024, 0, 15, 10, 30, 0),
  type: 'ORDER_DEALT_IN',
  transSubType: 'open_long',
  groupType: 'futures',
  positionType: 'long',
  qty: '0.25',
  size: '0.25',
  amount: '0.25',
  currency: 'USDT',
  tradePrice: '2500',
  funding: '0.5',
  fee: '0.25',
  feeCurrency: 'USDT',
  cashFlow: '-625',
  change: '-624.5',
  cashBalance: '1000',
  balance: '1000',
  feeRate: '0.0004',
  bonusChange: '0',
  tradeId: 'bg-trade-1',
  orderId: 'bg-order-1',
  orderLinkId: 'bg-link-1',
  raw: {},
};

function BitgetFiltersHarness() {
  const [filters, setFilters] = useState<BitgetTxFilters>(makeTxFilters());
  return (
    <>
      <BitgetTransactionFilters
        filters={filters}
        setFilters={setFilters}
        availableCurrencies={[{ value: 'USDT', label: 'USDT' }]}
      />
      <span data-testid="filters-search">{filters.search}</span>
    </>
  );
}

function renderDetailsModal(detailsModalType: BitgetDetailsModalType) {
  const setDetailsModalType = vi.fn();
  renderTransactionUi(
    <BitgetTransactionDetailsModal
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
        id: BITGET_KEY_ID,
        label: 'Bitget Active Key',
        exchange: 'bitget',
        apiKey: 'api-key',
        apiSecret: 'api-secret',
        passphrase: 'passphrase',
        isActive: true,
      },
    ],
  });
});

describe('Bitget transaction components (components/transactions/BitgetTransactions)', () => {
  describe('BitgetTransactionRow', () => {
    it('renders the collapsed row with side and column headers', () => {
      renderTransactionUi(<BitgetTransactionRow entry={entry} isExpanded={false} onToggle={() => {}} />);

      expect(screen.getByText('Buy')).toBeDefined();
      expect(screen.getByText('Currency & Symbol')).toBeDefined();
      expect(screen.getByText('Type & Category')).toBeDefined();
      expect(screen.getAllByText('USDT').length).toBeGreaterThan(0);
    });

    it('calls onToggle when the row is clicked', () => {
      const onToggle = vi.fn();
      renderTransactionUi(<BitgetTransactionRow entry={entry} isExpanded={false} onToggle={onToggle} />);

      fireEvent.click(screen.getByText('Type & Category'));

      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('reveals the detail panel with resolved account label when expanded', () => {
      renderTransactionUi(<BitgetTransactionRow entry={entry} isExpanded={true} onToggle={() => {}} />);

      expect(screen.getByText('Trade ID')).toBeDefined();
      expect(screen.getByText('Order ID')).toBeDefined();
      expect(screen.getByText('Account')).toBeDefined();
      expect(screen.getAllByText('Bitget Active Key').length).toBeGreaterThan(0);
    });

    it('masks rendered values when privacy mode is active', () => {
      setPrivacyMode(true);
      renderTransactionUi(<BitgetTransactionRow entry={entry} isExpanded={false} onToggle={() => {}} />);

      expect(screen.getAllByText('****').length).toBeGreaterThan(0);
    });
  });

  describe('BitgetTransactionFilters', () => {
    it('renders every filter control', () => {
      renderTransactionUi(<BitgetFiltersHarness />);

      expect(screen.getByPlaceholderText('Search symbol (e.g. BTC, ETH)...')).toBeDefined();
      expect(screen.getByText('All Categories')).toBeDefined();
      expect(screen.getByText('All Types')).toBeDefined();
      expect(screen.getByText('All Currencies')).toBeDefined();
      expect(screen.getByText('All Bitget Accounts')).toBeDefined();
    });

    it('propagates the typed search term through setFilters', () => {
      renderTransactionUi(<BitgetFiltersHarness />);

      fireEvent.change(screen.getByPlaceholderText('Search symbol (e.g. BTC, ETH)...'), { target: { value: 'ETH' } });

      expect(screen.getByTestId('filters-search').textContent).toBe('ETH');
    });
  });

  describe('BitgetTransactionDetailsModal', () => {
    it('renders nothing while no modal type is selected', () => {
      renderDetailsModal(null);

      expect(screen.queryByText('Funding Breakdown')).toBeNull();
      expect(screen.queryByText('Total Transactions Breakdown')).toBeNull();
    });

    it('renders the funding breakdown and closes through setDetailsModalType', () => {
      const setDetailsModalType = renderDetailsModal('funding');

      expect(screen.getByText('Funding Breakdown')).toBeDefined();
      expect(screen.getByText('Total (Aggregated USD)')).toBeDefined();

      fireEvent.click(screen.getByRole('button'));

      expect(setDetailsModalType).toHaveBeenCalledWith(null);
    });

    it('renders the transaction count breakdown', () => {
      renderDetailsModal('tx');

      expect(screen.getByText('Total Transactions Breakdown')).toBeDefined();
      expect(screen.getByText('Count by Type')).toBeDefined();
    });

    it('renders the net change report', () => {
      renderDetailsModal('netchange');

      expect(screen.getByText('Net Change Report (USD)')).toBeDefined();
    });
  });
});
