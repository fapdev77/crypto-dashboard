import React from 'react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { MarketAnalyticsDashboard } from '../MarketAnalyticsDashboard';
import { renderTransactionUi } from '../../../transactions/__tests__/transactionTestFixtures';

// Mock Recharts ResponsiveContainer to avoid size errors
vi.mock('recharts', async () => {
  const original = await vi.importActual<any>('recharts');
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => <div data-testid="recharts-container">{children}</div>,
  };
});

vi.mock('../../../../services/marketAnalytics/InverseMarketService', () => ({
  InverseMarketService: {
    fetchInverseMarketOverview: vi.fn().mockResolvedValue([]),
  },
}));

describe('MarketAnalyticsDashboard Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders title, subtitle, and primary tabs', () => {
    renderTransactionUi(<MarketAnalyticsDashboard />);

    expect(screen.getByText('Market Analytics')).toBeInTheDocument();
    expect(
      screen.getByText(/Quantitative cross-exchange derivatives intelligence/)
    ).toBeInTheDocument();
    expect(screen.getByText('Multi-Market Intelligence')).toBeInTheDocument();
    expect(screen.getByText('Inverse (Coin-M) Contracts')).toBeInTheDocument();
  });

  it('toggles to Inverse Coin-M Contracts tab and renders inverse section', () => {
    renderTransactionUi(<MarketAnalyticsDashboard />);

    const inverseTabButton = screen.getByText('Inverse (Coin-M) Contracts');
    fireEvent.click(inverseTabButton);

    expect(screen.getByText('Inverse (Coin-M) Derivative Analytics')).toBeInTheDocument();
  });
});
