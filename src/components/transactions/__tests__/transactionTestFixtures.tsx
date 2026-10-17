import React, { ReactElement } from 'react';
import { render, RenderResult } from '@testing-library/react';
import { PrivacyProvider } from '../../../context/PrivacyContext';
import { TooltipProvider } from '../../ui/Tooltip';

/**
 * Fixtures shared by the transaction component render tests. The three exchange groups expose
 * structurally identical stats and filter shapes, so a single builder feeds all of them.
 */
export interface TestCurrencyStats {
  totalFunding: string;
  totalFees: string;
  totalCashFlow: string;
  totalChange: string;
  finalBalance: string;
  totalInflow: string;
  totalOutflow: string;
  initialBalance: string;
  percentageChange: number;
}

export interface TestTransactionStats {
  totalCount: number;
  typeBreakdown: Record<string, number>;
  stable: TestCurrencyStats;
  perCurrency: Record<string, TestCurrencyStats>;
  aggregatedUsd: TestCurrencyStats;
}

export interface TestTxFilters {
  search: string;
  category: string;
  type: string;
  currency: string;
  accountId: string;
  timePeriod: number;
}

export function makeCurrencyStats(overrides: Partial<TestCurrencyStats> = {}): TestCurrencyStats {
  return {
    totalFunding: '0',
    totalFees: '0',
    totalCashFlow: '0',
    totalChange: '0',
    finalBalance: '0',
    totalInflow: '0',
    totalOutflow: '0',
    initialBalance: '0',
    percentageChange: 0,
    ...overrides,
  };
}

export function makeTransactionStats(overrides: Partial<TestTransactionStats> = {}): TestTransactionStats {
  return {
    totalCount: 3,
    typeBreakdown: { TRADE: 2, SETTLEMENT: 1 },
    stable: makeCurrencyStats({
      totalFunding: '12.5',
      totalFees: '-1.25',
      totalCashFlow: '-600',
      totalChange: '11.25',
      finalBalance: '1500',
      initialBalance: '1488.75',
      percentageChange: 0.76,
    }),
    perCurrency: { BTC: makeCurrencyStats({ totalChange: '0.5' }) },
    aggregatedUsd: makeCurrencyStats({
      totalFunding: '12.5',
      totalFees: '-1.25',
      totalChange: '11.25',
      finalBalance: '1500',
    }),
    ...overrides,
  };
}

export function makeTxFilters(overrides: Partial<TestTxFilters> = {}): TestTxFilters {
  return {
    search: '',
    category: 'All',
    type: 'All',
    currency: 'All',
    accountId: 'All',
    timePeriod: 0,
    ...overrides,
  };
}

/** Renders transaction UI with the providers these components require (privacy + tooltips). */
export function renderTransactionUi(ui: ReactElement): RenderResult {
  return render(
    <PrivacyProvider>
      <TooltipProvider>{ui}</TooltipProvider>
    </PrivacyProvider>
  );
}

/** Privacy mode defaults to on when nothing is stored, which masks every rendered value. */
export function setPrivacyMode(active: boolean): void {
  localStorage.setItem('app_privacy_mode', String(active));
}
