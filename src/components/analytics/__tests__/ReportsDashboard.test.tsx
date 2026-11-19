import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportsDashboard } from '../ReportsDashboard';
import i18n from '../../../i18n/config';
import { PrivacyProvider } from '../../../context/PrivacyContext';
import { TooltipProvider } from '../../ui/Tooltip';
import { usePositionHistory } from '../../../hooks/usePositionHistory';
import { useApiKeysStore } from '../../../store/apiKeysStore';
import { DEFAULT_TIME_PERIOD_MS } from '../../../utils/dateTimeHelper';

// Mock hook
vi.mock('../../../hooks/usePositionHistory', () => ({
  usePositionHistory: vi.fn(() => ({
    positions: [],
    isLoading: false,
  })),
}));

const renderDashboard = () =>
  render(
    <TooltipProvider>
      <PrivacyProvider>
        <ReportsDashboard />
      </PrivacyProvider>
    </TooltipProvider>
  );

describe('ReportsDashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    i18n.changeLanguage('en-US');
    useApiKeysStore.setState({ keys: [] } as never);
  });

  it('renders the reports header and export dropdown button', () => {
    renderDashboard();

    expect(screen.getByText(/reports & exports|relatórios e exportações/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export|exportar/i })).toBeInTheDocument();
  });

  it('defaults to 7 Days and displays all 12 standardized time period options', () => {
    renderDashboard();

    expect(vi.mocked(usePositionHistory).mock.calls[0]?.[0]).toBe(DEFAULT_TIME_PERIOD_MS);

    fireEvent.click(screen.getByText('7 Days'));
    [
      'Today', '14 Days', '30 Days', '90 Days', '120 Days',
      '6 Months', '1 Year', 'MTD', 'YTD', 'Custom Range...', 'All Time',
    ].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('supports Custom Range selection and renders HistoryLimitWarning for Bitget >90d', () => {
    useApiKeysStore.setState({
      keys: [
        { id: 'conn-bitget', exchange: 'bitget', label: 'Bitget', apiKey: 'k', apiSecret: 's', passphrase: 'p', isActive: true },
      ],
    } as never);

    renderDashboard();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('7 Days'));
    fireEvent.click(screen.getByText('Custom Range...'));
    fireEvent.change(screen.getByLabelText(/Start Date/i), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText(/End Date/i), { target: { value: '2026-10-01' } });
    fireEvent.click(screen.getByRole('button', { name: /Apply Range/i }));

    const lastCall = vi.mocked(usePositionHistory).mock.calls.at(-1);
    expect(lastCall?.[0]).toBe('custom');
    expect(lastCall?.[3]).toBe('2026-01-01');
    expect(lastCall?.[4]).toBe('2026-10-01');

    const banner = screen.getByRole('status');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveClass('history-limit-banner');
    expect(banner.textContent?.toLowerCase()).toContain('bitget');
  });
});
