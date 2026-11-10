import React from 'react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { MissingRatesNotice } from '../MissingRatesNotice';
import { ConsolidatedTransactions } from '../ConsolidatedTransactions/ConsolidatedTransactions';
import { makeTransactionStats, renderTransactionUi, setPrivacyMode } from './transactionTestFixtures';
import type { ConsolidatedStats } from '../../../hooks/useConsolidatedTransactions';
import { useSettingsStore } from '../../../store/settingsStore';
import { useApiKeysStore } from '../../../store/apiKeysStore';

const mockHookState = vi.hoisted(() => ({
  missingRates: [] as string[],
}));

vi.mock('../../../hooks/useConsolidatedTransactions', async importOriginal => {
  const actual = await importOriginal<typeof import('../../../hooks/useConsolidatedTransactions')>();
  return {
    ...actual,
    useConsolidatedTransactions: () => {
      const block = () => makeTransactionStats({ totalCount: 0, missingRates: [] });
      const stats = {
        ...makeTransactionStats({ totalCount: 2, missingRates: mockHookState.missingRates }),
        byExchange: { bybit: block(), bitget: block(), okx: block() },
      } as ConsolidatedStats;

      return {
        bybitEntries: [],
        bitgetEntries: [],
        okxEntries: [],
        filteredByExchange: { bybit: [], bitget: [], okx: [] },
        isLoading: false,
        isSyncing: false,
        isCalculatingUsd: false,
        error: null,
        stats,
        tokenRates: {},
        activeExchanges: [],
      };
    },
  };
});

describe('MissingRatesNotice', () => {
  beforeEach(() => {
    setPrivacyMode(false);
    useApiKeysStore.setState({ keys: [] });
    useSettingsStore.setState({
      fiatCurrency: 'USD',
      locale: 'en-US',
      fiatRates: { USD: 1, EUR: 0.92, GBP: 0.79, BRL: 5.5 },
    });
  });

  it('renders nothing when every currency has a price', () => {
    const { container } = renderTransactionUi(<MissingRatesNotice currencies={[]} />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('lists a single currency that was left out of the USD totals', () => {
    renderTransactionUi(<MissingRatesNotice currencies={['XYZ']} />);

    const notice = screen.getByRole('status');
    expect(notice).toHaveTextContent('Incomplete USD totals');
    expect(notice).toHaveTextContent('No USD price found for XYZ');
    expect(notice).toHaveTextContent('excluded from the totals');
  });

  it('joins several currencies into one readable list', () => {
    renderTransactionUi(<MissingRatesNotice currencies={['XYZ', 'ABC']} />);

    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('No USD price found for XYZ, ABC');
  });

  it('surfaces the notice on the consolidated page when a rate is missing', () => {
    mockHookState.missingRates = ['XYZ', 'ABC'];
    renderTransactionUi(<ConsolidatedTransactions />);

    expect(screen.getByRole('status')).toHaveTextContent('No USD price found for XYZ, ABC — these assets are excluded from the totals.');
  });

  it('stays hidden on the consolidated page when every currency converted', () => {
    mockHookState.missingRates = [];
    renderTransactionUi(<ConsolidatedTransactions />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByText('Incomplete USD totals')).not.toBeInTheDocument();
  });
});
