import React, { useState } from 'react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, render } from '@testing-library/react';
import { PrimaryResultSection } from '../PrimaryResultSection';
import { OperationsAndFeesSection } from '../OperationsAndFeesSection';
import { AdvancedPerformanceSection } from '../AdvancedPerformanceSection';
import { TemporalPerformanceSection } from '../TemporalPerformanceSection';
import { PriceMilestoneSection } from '../PriceMilestoneSection';
import { PortfolioPerformanceFilters } from '../PortfolioPerformanceFilters';
import { PortfolioPerformance } from '../PortfolioPerformance';
import {
  PrimaryResultMetrics,
  OperationsResultMetrics,
  AdvancedPerformanceMetrics,
  defaultPerformanceFilters,
  PortfolioPerformanceFilters as FilterType,
} from '../../../../hooks/usePortfolioPerformance';
import { renderTransactionUi, setPrivacyMode } from '../../../transactions/__tests__/transactionTestFixtures';

// Mock Recharts ResponsiveContainer to avoid 0x0 container size issues in JSDOM
vi.mock('recharts', async () => {
  const original = await vi.importActual<any>('recharts');
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => <div data-testid="recharts-container">{children}</div>,
  };
});

describe('PortfolioPerformance Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    setPrivacyMode(false);
  });

  const samplePrimaryMetrics: PrimaryResultMetrics = {
    percentageGain: 18.25,
    absoluteGain: '0.0450',
    absoluteGainUsd: '3082.50',
    initialBalance: '0.2465',
    finalBalance: '0.2915',
    dailyAverageRoi: 0.629,
    depositsInPeriod: '0.0000',
    durationDays: 29,
    earliestDate: '2024-01-01',
    latestDate: '2024-01-29',
  };

  const sampleOperationsMetrics: OperationsResultMetrics = {
    grossCashFlow: '0.0520',
    feesPaid: '-0.0035',
    netTradingPnl: '0.0485',
    fundingReceived: '0.0042',
    fundingPaid: '-0.0012',
    netFunding: '0.0030',
    fundingRatio: '3.50x',
    totalTrades: 120,
    buysCount: 65,
    sellsCount: 55,
    buysPct: 54,
    sellsPct: 46,
    tradesPerDay: 4.1,
    feeCostPct: 6.73,
    feeStatus: 'Excellent',
    feeInterpretation: 'Trading fees are well under control (< 10% of gross returns).',
    feeAction: 'Maintain current execution and tier settings.',
  };

  const sampleAdvancedMetrics: AdvancedPerformanceMetrics = {
    winRate: 75.86,
    positiveDaysCount: 22,
    totalDaysEvaluated: 29,
    profitFactor: 2.30,
    profitFactorRating: 'Excellent',
    totalGains: '0.0381',
    totalLosses: '0.0165',
    consistencyIndexCv: 42.5,
    consistencyRating: 'Highly Consistent',
  };

  const sampleDayOfWeek = {
    list: [
      { dayName: 'Monday', dayIndex: 1, trades: 20, tradingGain: 0.008, fundingGain: 0.001, totalGain: 0.009 },
      { dayName: 'Tuesday', dayIndex: 2, trades: 25, tradingGain: 0.012, fundingGain: 0.001, totalGain: 0.013 },
      { dayName: 'Wednesday', dayIndex: 3, trades: 18, tradingGain: 0.006, fundingGain: 0.001, totalGain: 0.007 },
      { dayName: 'Thursday', dayIndex: 4, trades: 15, tradingGain: 0.004, fundingGain: 0.001, totalGain: 0.005 },
      { dayName: 'Friday', dayIndex: 5, trades: 22, tradingGain: 0.009, fundingGain: 0.001, totalGain: 0.010 },
      { dayName: 'Saturday', dayIndex: 6, trades: 10, tradingGain: 0.002, fundingGain: 0.0005, totalGain: 0.0025 },
      { dayName: 'Sunday', dayIndex: 0, trades: 10, tradingGain: 0.001, fundingGain: 0.0005, totalGain: 0.0015 },
    ],
    bestDay: { name: 'Tuesday', gain: 0.013 },
    worstDay: { name: 'Sunday', gain: 0.0015 },
  };

  const sampleTimeOfDay = {
    list: [
      { periodLabel: '00h - 04h', trades: 15, tradingGain: 0.004, fundingGain: 0.001, totalGain: 0.005 },
      { periodLabel: '04h - 08h', trades: 12, tradingGain: 0.003, fundingGain: 0.0005, totalGain: 0.0035 },
      { periodLabel: '08h - 12h', trades: 28, tradingGain: 0.011, fundingGain: 0.0015, totalGain: 0.0125 },
      { periodLabel: '12h - 16h', trades: 35, tradingGain: 0.015, fundingGain: 0.002, totalGain: 0.017 },
      { periodLabel: '16h - 20h', trades: 20, tradingGain: 0.006, fundingGain: 0.0008, totalGain: 0.0068 },
      { periodLabel: '20h - 24h', trades: 10, tradingGain: 0.003, fundingGain: 0.0002, totalGain: 0.0032 },
    ],
    bestTime: { period: '12h - 16h', gain: 0.017 },
    worstTime: { period: '20h - 24h', gain: 0.0032 },
  };

  const sampleMilestones = [
    {
      milestonePrice: 65000,
      formattedMilestone: '$65,000',
      passages: 7,
      firstPassageEquity: 0.2500,
      lastPassageEquity: 0.2650,
      gainLoss: 0.0150,
      gainLossFormatted: '+0.0150',
      gainLossPct: 6.00,
    },
    {
      milestonePrice: 67500,
      formattedMilestone: '$67,500',
      passages: 4,
      firstPassageEquity: 0.2600,
      lastPassageEquity: 0.2720,
      gainLoss: 0.0120,
      gainLossFormatted: '+0.0120',
      gainLossPct: 4.62,
    },
  ];

  it('renders PrimaryResultSection with ROI and sub-cards', () => {
    renderTransactionUi(
      <PrimaryResultSection
        metrics={samplePrimaryMetrics}
        denomination="BTC"
        isPrivateMode={false}
      />
    );

    expect(screen.getByText('Primary Result')).toBeInTheDocument();
    expect(screen.getByText('+18.25%')).toBeInTheDocument();
    expect(screen.getByText('+0.0450 BTC')).toBeInTheDocument();
    expect(screen.getByText('0.2465')).toBeInTheDocument();
    expect(screen.getByText('0.2915')).toBeInTheDocument();
    expect(screen.getByText('per operating day')).toBeInTheDocument();
  });

  it('masks PrimaryResultSection values when isPrivateMode is true', () => {
    renderTransactionUi(
      <PrimaryResultSection
        metrics={samplePrimaryMetrics}
        denomination="BTC"
        isPrivateMode={true}
      />
    );

    expect(screen.getAllByText('****').length).toBeGreaterThanOrEqual(4);
  });

  it('renders OperationsAndFeesSection with trade breakdown, funding, and fee diagnostics', () => {
    renderTransactionUi(
      <OperationsAndFeesSection
        operations={sampleOperationsMetrics}
        denomination="BTC"
        isPrivateMode={false}
      />
    );

    expect(screen.getByText('Operations Result & Fee Efficiency')).toBeInTheDocument();
    expect(screen.getByText('0.0520 BTC')).toBeInTheDocument();
    expect(screen.getByText('-0.0035 BTC')).toBeInTheDocument();
    expect(screen.getByText('3.50x')).toBeInTheDocument();
    expect(screen.getByText('Trade Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Fee Analysis')).toBeInTheDocument();
    expect(screen.getByText('6.73%')).toBeInTheDocument();
    expect(screen.getByText('Excellent')).toBeInTheDocument();
  });

  it('renders AdvancedPerformanceSection with Win Rate, Profit Factor, and Consistency CV', () => {
    renderTransactionUi(
      <AdvancedPerformanceSection
        metrics={sampleAdvancedMetrics}
        denomination="BTC"
        isPrivateMode={false}
      />
    );

    expect(screen.getByText('Advanced Performance Metrics')).toBeInTheDocument();
    expect(screen.getByText('75.9%')).toBeInTheDocument();
    expect(screen.getByText('22 positive')).toBeInTheDocument();
    expect(screen.getByText('2.30')).toBeInTheDocument();
    expect(screen.getByText('42.5%')).toBeInTheDocument();
    expect(screen.getByText('Highly Consistent')).toBeInTheDocument();
  });

  it('renders TemporalPerformanceSection and toggles between Day of Week and Time of Day', () => {
    renderTransactionUi(
      <TemporalPerformanceSection
        dayOfWeek={sampleDayOfWeek}
        timeOfDay={sampleTimeOfDay}
        denomination="BTC"
        isPrivateMode={false}
      />
    );

    expect(screen.getByText('Temporal Performance Analysis')).toBeInTheDocument();
    expect(screen.getAllByText('Tuesday').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Sunday').length).toBeGreaterThanOrEqual(1);

    // Toggle to Time of Day tab
    const timeTab = screen.getByRole('button', { name: /Time of Day/i });
    fireEvent.click(timeTab);

    expect(screen.getAllByText('12h - 16h').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('20h - 24h').length).toBeGreaterThanOrEqual(1);
  });

  it('renders PriceMilestoneSection with passages and custom step inputs', () => {
    const handleStepChange = vi.fn();

    renderTransactionUi(
      <PriceMilestoneSection
        milestones={sampleMilestones}
        denomination="BTC"
        milestoneStep={2500}
        onStepChange={handleStepChange}
        isPrivateMode={false}
      />
    );

    expect(screen.getByText('Price Milestone & Range Passage Analysis')).toBeInTheDocument();
    expect(screen.getByText('$65,000')).toBeInTheDocument();
    expect(screen.getByText('7x')).toBeInTheDocument();
    expect(screen.getByText('$67,500')).toBeInTheDocument();
    expect(screen.getByText('4x')).toBeInTheDocument();

    // Click preset button
    const presetBtn = screen.getByRole('button', { name: '$5k' });
    fireEvent.click(presetBtn);
    expect(handleStepChange).toHaveBeenCalledWith(5000);
  });

  it('renders PortfolioPerformanceFilters and updates selections', () => {
    const TestFilterWrapper = () => {
      const [f, setF] = useState<FilterType>(defaultPerformanceFilters);
      return (
        <PortfolioPerformanceFilters
          filters={f}
          onFilterChange={setF}
          availableCurrencies={['BTC', 'ETH', 'SOL', 'USDT']}
        />
      );
    };

    renderTransactionUi(<TestFilterWrapper />);

    expect(screen.getByText('All Exchanges')).toBeInTheDocument();
    expect(screen.getByText('All Accounts')).toBeInTheDocument();
    expect(screen.getByText('7 Days')).toBeInTheDocument();
    expect(screen.getByText('BTC Native')).toBeInTheDocument();
  });

  it('renders main PortfolioPerformance view with export button', () => {
    renderTransactionUi(<PortfolioPerformance />);

    expect(screen.getByText('Portfolio Performance')).toBeInTheDocument();
    expect(screen.getByText('Export Report')).toBeInTheDocument();
  });
});
