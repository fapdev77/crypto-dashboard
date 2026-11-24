import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import { HistoryLimitWarning } from '../HistoryLimitWarning';
import { useApiKeysStore } from '../../../store/apiKeysStore';
import { DEFAULT_TIME_PERIOD_MS, ONE_DAY_MS } from '../../../utils/dateTimeHelper';
import i18n from '../../../i18n/config';

describe('HistoryLimitWarning', () => {
  beforeEach(() => {
    i18n.changeLanguage('en-US');
    useApiKeysStore.setState({
      keys: [
        { id: 'k-bybit', exchange: 'bybit', label: 'Bybit', apiKey: 'a', apiSecret: 'b', isActive: true },
        { id: 'k-okx', exchange: 'okx', label: 'OKX', apiKey: 'c', apiSecret: 'd', passphrase: 'p', isActive: true },
        { id: 'k-bitget', exchange: 'bitget', label: 'Bitget', apiKey: 'e', apiSecret: 'f', passphrase: 'p', isActive: true },
      ],
    } as never);
  });

  it('does not render for periods within 90 days (e.g. 7 Days or 90 Days)', () => {
    const { container, rerender } = render(<HistoryLimitWarning period={DEFAULT_TIME_PERIOD_MS} />);
    expect(container).toBeEmptyDOMElement();

    rerender(<HistoryLimitWarning period={90 * ONE_DAY_MS} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders warning banner for OKX and Bitget on >90d, YTD, and All Time', () => {
    const { rerender } = render(<HistoryLimitWarning period={120 * ONE_DAY_MS} />);

    const banner = screen.getByRole('status');
    expect(banner).toHaveClass('history-limit-banner');
    expect(banner.textContent?.toLowerCase()).toContain('okx');
    expect(banner.textContent?.toLowerCase()).toContain('bitget');
    expect(banner.textContent?.toLowerCase()).not.toContain('bybit');

    rerender(<HistoryLimitWarning period="0" />);
    expect(screen.getByRole('status').textContent?.toLowerCase()).toContain('okx');
    expect(screen.getByRole('status').textContent?.toLowerCase()).toContain('bybit');
  });

  it('evaluates custom date ranges by actual lookback days', () => {
    const today = new Date();
    const recentStart = new Date(today.getTime() - 5 * ONE_DAY_MS).toISOString().slice(0, 10);
    const recentEnd = today.toISOString().slice(0, 10);

    const { container, rerender } = render(
      <HistoryLimitWarning period="custom" customStartDate={recentStart} customEndDate={recentEnd} />
    );
    expect(container).toBeEmptyDOMElement();

    rerender(
      <HistoryLimitWarning period="custom" customStartDate="2020-01-01" customEndDate="2020-01-31" />
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('ignores inactive keys and respects exchangeFilter scoping', () => {
    useApiKeysStore.setState({
      keys: [
        { id: 'k-okx', exchange: 'okx', label: 'OKX', apiKey: 'c', apiSecret: 'd', passphrase: 'p', isActive: false },
        { id: 'k-bitget', exchange: 'bitget', label: 'Bitget', apiKey: 'e', apiSecret: 'f', passphrase: 'p', isActive: true },
      ],
    } as never);

    const { container, rerender } = render(
      <HistoryLimitWarning period={120 * ONE_DAY_MS} exchangeFilter="okx" />
    );
    expect(container).toBeEmptyDOMElement();

    rerender(<HistoryLimitWarning period={120 * ONE_DAY_MS} exchangeFilter="bitget" />);
    const banner = screen.getByRole('status');
    expect(banner.textContent?.toLowerCase()).toContain('bitget');
    expect(banner.textContent?.toLowerCase()).not.toContain('okx');
  });

  it('renders localized text in pt-BR', () => {
    i18n.changeLanguage('pt-BR');
    render(<HistoryLimitWarning period={120 * ONE_DAY_MS} />);

    expect(screen.getByText(/Limites de Histórico das Corretoras:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Máximo de 3 meses \(90 dias\)/i)).toHaveLength(2);
  });
});
