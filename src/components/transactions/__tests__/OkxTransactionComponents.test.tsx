import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { OkxTransactionRow } from '../OkxTransactions/OkxTransactionRow';
import { OkxTransactionFilters } from '../OkxTransactions/OkxTransactionFilters';
import { OkxTransactionDetailsModal, OkxDetailsModalType } from '../OkxTransactions/OkxTransactionDetailsModal';
import { OkxTxFilters } from '../../../hooks/useOkxTransactions';
import { OkxTransactionLogEntry } from '../../../types';
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

const OKX_KEY_ID = 'conn-okx-1';

const entry: OkxTransactionLogEntry = {
  id: `${OKX_KEY_ID}-raw-1-1705314600000`,
  connectionId: OKX_KEY_ID,
  exchange: 'okx',
  label: 'OKX Main',
  rawId: 'raw-1',
  billId: 'bill-1',
  symbol: 'BTC-USDT-SWAP',
  category: 'SWAP',
  side: 'Buy',
  transactionTime: Date.UTC(2024, 0, 15, 10, 30, 0),
  type: 'Trade',
  transSubType: 'Buy',
  subType: '1',
  typeCode: '2',
  subTypeCode: '1',
  qty: '0.25',
  size: '0.25',
  contracts: '1',
  cryptoQty: '0.01',
  totalValueUsd: '600',
  amount: '0.25',
  currency: 'USDT',
  tradePrice: '60000',
  funding: '0.4',
  fee: '-0.6',
  feeCurrency: 'USDT',
  cashFlow: '-600',
  change: '-600.6',
  cashBalance: '2500',
  balance: '2500',
  feeRate: '0.0005',
  bonusChange: '0',
  tradeId: 'okx-trade-1',
  orderId: 'okx-order-1',
  orderLinkId: 'okx-link-1',
  pnl: '0',
  raw: {},
};

function OkxFiltersHarness() {
  const [filters, setFilters] = useState<OkxTxFilters>(makeTxFilters());
  return (
    <>
      <OkxTransactionFilters
        filters={filters}
        setFilters={setFilters}
        availableCurrencies={[{ value: 'USDT', label: 'USDT' }]}
      />
      <span data-testid="filters-search">{filters.search}</span>
    </>
  );
}

function renderDetailsModal(detailsModalType: OkxDetailsModalType) {
  const setDetailsModalType = vi.fn();
  renderTransactionUi(
    <OkxTransactionDetailsModal
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
        id: OKX_KEY_ID,
        label: 'OKX Active Key',
        exchange: 'okx',
        apiKey: 'api-key',
        apiSecret: 'api-secret',
        passphrase: 'passphrase',
        isActive: true,
      },
    ],
  });
});

describe('OKX transaction components (components/transactions/OkxTransactions)', () => {
  describe('OkxTransactionRow', () => {
    it('renders the collapsed row with side and column headers', () => {
      renderTransactionUi(<OkxTransactionRow entry={entry} isExpanded={false} onToggle={() => {}} />);

      expect(screen.getByText('Buy')).toBeDefined();
      expect(screen.getByText('Currency & Symbol')).toBeDefined();
      expect(screen.getByText('Type & Category')).toBeDefined();
      expect(screen.getAllByText('USDT').length).toBeGreaterThan(0);
    });

    it('calls onToggle when the row is clicked', () => {
      const onToggle = vi.fn();
      renderTransactionUi(<OkxTransactionRow entry={entry} isExpanded={false} onToggle={onToggle} />);

      fireEvent.click(screen.getByText('Type & Category'));

      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('reveals the detail panel with resolved account label when expanded', () => {
      renderTransactionUi(<OkxTransactionRow entry={entry} isExpanded={true} onToggle={() => {}} />);

      expect(screen.getByText('Trade ID')).toBeDefined();
      expect(screen.getByText('Order ID')).toBeDefined();
      expect(screen.getByText('Account')).toBeDefined();
      expect(screen.getAllByText('OKX Active Key').length).toBeGreaterThan(0);
    });

    it('masks rendered values when privacy mode is active', () => {
      setPrivacyMode(true);
      renderTransactionUi(<OkxTransactionRow entry={entry} isExpanded={false} onToggle={() => {}} />);

      expect(screen.getAllByText('****').length).toBeGreaterThan(0);
    });
  });

  describe('OkxTransactionFilters', () => {
    it('renders every filter control', () => {
      renderTransactionUi(<OkxFiltersHarness />);

      expect(screen.getByPlaceholderText('Search symbol (e.g. BTC, ETH)...')).toBeDefined();
      expect(screen.getByText('All Categories')).toBeDefined();
      expect(screen.getByText('All Types')).toBeDefined();
      expect(screen.getByText('All Currencies')).toBeDefined();
      expect(screen.getByText('All OKX Accounts')).toBeDefined();
    });

    it('propagates the typed search term through setFilters', () => {
      renderTransactionUi(<OkxFiltersHarness />);

      fireEvent.change(screen.getByPlaceholderText('Search symbol (e.g. BTC, ETH)...'), { target: { value: 'BTC' } });

      expect(screen.getByTestId('filters-search').textContent).toBe('BTC');
    });
  });

  describe('OkxTransactionDetailsModal', () => {
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
