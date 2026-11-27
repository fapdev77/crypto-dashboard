import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ClosedPositions } from '../ClosedPositions';
import { TooltipProvider } from '../ui/Tooltip';
import { PrivacyProvider } from '../../context/PrivacyContext';
import { useSettingsStore } from '../../store/settingsStore';
import { useApiKeysStore } from '../../store/apiKeysStore';
import { usePositionHistory } from '../../hooks/usePositionHistory';
import { exportToCSV } from '../../utils/exportUtils';
import type { UnifiedHistoryPosition } from '../../types';
import i18n from '../../i18n/config';

vi.mock('../../hooks/usePositionHistory', () => ({ usePositionHistory: vi.fn() }));
vi.mock('../../utils/exportUtils', () => ({
  exportToCSV: vi.fn(),
  exportToExcel: vi.fn(),
  exportToPDF: vi.fn(),
}));
vi.mock('../../services/AssetClassifierAggregator', () => ({
  AssetClassifierAggregator: {
    getGlobalCategorySync: () => 'CRYPTO',
    getGlobalAssetCategory: vi.fn().mockResolvedValue('CRYPTO'),
  },
}));

const closed = (overrides: Partial<UnifiedHistoryPosition>): UnifiedHistoryPosition => ({
  id: 'h1',
  connectionId: 'conn-1',
  exchange: 'bybit',
  label: 'Main',
  symbol: 'BTCUSDT',
  baseCoin: 'BTC',
  quoteCoin: 'USDT',
  side: 'long',
  size: 1,
  entryPrice: 60000,
  markPrice: 61000,
  exitPrice: 61000,
  unrealizedPnl: 0,
  realizedPnl: 100,
  closedPnl: 100,
  leverage: 5,
  entryTime: Date.now() - 3600_000,
  ...overrides,
} as UnifiedHistoryPosition);

const hookResult = (overrides: Record<string, unknown> = {}) => ({
  positions: [closed({ id: 'h1', symbol: 'BTCUSDT' }), closed({ id: 'h2', symbol: 'ETHUSDT', side: 'short' })],
  isLoading: false,
  isSyncing: false,
  syncMessage: null,
  syncError: null,
  ...overrides,
});

const renderPage = () =>
  render(
    <PrivacyProvider>
      <TooltipProvider>
        <ClosedPositions />
      </TooltipProvider>
    </PrivacyProvider>
  );

describe('ClosedPositions', () => {
  beforeEach(() => {
    i18n.changeLanguage('en-US');
    localStorage.setItem('app_privacy_mode', 'false');
    vi.clearAllMocks();
    useSettingsStore.setState({
      fiatCurrency: 'USD',
      locale: 'en-US',
      fiatRates: { USD: 1, EUR: 0.9, GBP: 0.8, BRL: 5 },
    });
    useApiKeysStore.setState({ keys: [{ id: 'conn-1', exchange: 'bybit', label: 'Main', apiKey: 'k', apiSecret: 's', isActive: true }] } as never);
    vi.mocked(usePositionHistory).mockReturnValue(hookResult() as never);
  });

  it('renders a spinner while history is loading', () => {
    vi.mocked(usePositionHistory).mockReturnValue(hookResult({ isLoading: true, positions: [] }) as never);

    const { container } = renderPage();

    expect(screen.queryByText('Closed Positions')).not.toBeInTheDocument();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows the empty state when the period has no closed positions', () => {
    vi.mocked(usePositionHistory).mockReturnValue(hookResult({ positions: [] }) as never);

    renderPage();

    expect(screen.getByText('Closed Positions')).toBeInTheDocument();
    expect(screen.queryByText('Positions History')).not.toBeInTheDocument();
    expect(screen.getByText('No closed positions found.')).toBeInTheDocument();
  });

  it('summarises 4 analytical cards: 24px titles, no Card 3 donut, full-width Edge bar, colored bias, and tooltips', () => {
    renderPage();

    const grid = screen.getByTestId('closed-positions-summary-grid');
    expect(grid).toBeInTheDocument();
    expect(grid).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'xl:grid-cols-4');

    const titles = [
      screen.getByText('Net Profit (Total PnL)'),
      screen.getByText('Operational Costs'),
      screen.getByText('Trade Volume'),
      screen.getByText('Win Rate & Stats'),
    ];
    titles.forEach((titleEl) => {
      expect(titleEl).toBeInTheDocument();
      expect(titleEl).toHaveClass('text-2xl', 'text-fg-muted');
      expect(titleEl).not.toHaveClass('uppercase', 'truncate');
    });

    // Card 3: Donut chart removed, horizontal Long/Short bar kept, balanced bias styled muted
    expect(grid.querySelector('.recharts-wrapper')).not.toBeInTheDocument();
    expect(screen.queryByText(/executions/i)).not.toBeInTheDocument();
    expect(screen.getByTestId('closed-positions-volume-bar')).toBeInTheDocument();
    expect(screen.getByTestId('closed-positions-side-bias')).toHaveClass('text-fg-muted');

    // Card 4: Full-width horizontal Edge bar with semantic positive styling
    const edgeBar = screen.getByTestId('closed-positions-edge-bar');
    expect(edgeBar).toBeInTheDocument();
    expect(edgeBar).toHaveClass('w-full', 'bg-success/10', 'border-success/30');
    expect(screen.getByText('Edge')).toBeInTheDocument();
    expect(screen.getByText('Win Rate Long')).toBeInTheDocument();
    expect(screen.getByText('Win Rate Short')).toBeInTheDocument();
    expect(screen.getByText('Extremes')).toBeInTheDocument();

    // Key metrics expose discreet tooltip triggers
    expect(grid.querySelectorAll('.cursor-help').length).toBeGreaterThanOrEqual(14);

    // Ensure no dark-only hardcoded colors leak into the summary cards
    expect(grid.innerHTML).not.toMatch(/#161b22|#2a2b30|#00C853|#FF4444/i);

    expect(screen.getByText('BTCUSDT')).toBeInTheDocument();
    expect(screen.getByText('ETHUSDT')).toBeInTheDocument();
  });

  it('colors directional bias green for buyer dominance and red for seller dominance or negative edge', () => {
    vi.mocked(usePositionHistory).mockReturnValue(hookResult({
      positions: [
        closed({ id: 'h1', symbol: 'BTCUSDT', side: 'long', realizedPnl: 100 }),
        closed({ id: 'h2', symbol: 'ETHUSDT', side: 'long', realizedPnl: 50 }),
        closed({ id: 'h3', symbol: 'SOLUSDT', side: 'short', realizedPnl: -20 }),
      ],
    }) as never);

    const { rerender } = renderPage();
    expect(screen.getByTestId('closed-positions-side-bias')).toHaveClass('text-success');
    expect(screen.getByTestId('closed-positions-edge-bar')).toHaveClass('bg-success/10');

    vi.mocked(usePositionHistory).mockReturnValue(hookResult({
      positions: [
        closed({ id: 'h1', symbol: 'BTCUSDT', side: 'short', realizedPnl: -120 }),
        closed({ id: 'h2', symbol: 'ETHUSDT', side: 'short', realizedPnl: -80 }),
        closed({ id: 'h3', symbol: 'SOLUSDT', side: 'long', realizedPnl: 20 }),
      ],
    }) as never);

    rerender(
      <PrivacyProvider>
        <TooltipProvider>
          <ClosedPositions />
        </TooltipProvider>
      </PrivacyProvider>
    );
    expect(screen.getByTestId('closed-positions-side-bias')).toHaveClass('text-danger');
    expect(screen.getByTestId('closed-positions-edge-bar')).toHaveClass('bg-danger/10', 'border-danger/30');
  });

  it('masks monetary figures and hides sparkline in Privacy Mode while keeping counts and percentages visible', () => {
    localStorage.setItem('app_privacy_mode', 'true');
    vi.mocked(usePositionHistory).mockReturnValue(hookResult({
      positions: [
        closed({ id: 'h1', symbol: 'BTCUSDT', side: 'long', realizedPnl: 120, tradingFee: -2, fundingFee: -1 }),
        closed({ id: 'h2', symbol: 'ETHUSDT', side: 'short', realizedPnl: -40, tradingFee: -1, fundingFee: 0 }),
      ],
    }) as never);

    renderPage();

    expect(screen.getByTestId('privacy-sparkline-placeholder')).toBeInTheDocument();
    expect(screen.queryByTestId('closed-positions-sparkline')).not.toBeInTheDocument();
    expect(screen.getAllByText('$••••').length).toBeGreaterThanOrEqual(4);

    // Non-monetary counts and percentages stay visible
    expect(screen.getByText('50.00%')).toBeInTheDocument();
    expect(screen.getByText('1 Wins')).toBeInTheDocument();
    expect(screen.getByText('1 Losses')).toBeInTheDocument();
    expect(screen.getByText(/3\.00 PF/)).toBeInTheDocument();
  });

  it('filters the list by the search field', () => {
    renderPage();

    fireEvent.change(screen.getByPlaceholderText(/Search/), { target: { value: 'eth' } });

    expect(screen.queryByText('BTCUSDT')).not.toBeInTheDocument();
    expect(screen.getByText('ETHUSDT')).toBeInTheDocument();
  });

  it('requests a different period when the period selector changes', () => {
    renderPage();

    fireEvent.click(screen.getByText('7 Days'));
    fireEvent.click(screen.getByText('30 Days'));

    expect(vi.mocked(usePositionHistory).mock.calls.at(-1)?.[0]).toBe(String(30 * 24 * 60 * 60 * 1000));
  });

  it('defaults to 7 Days and displays all 12 standardized period options', () => {
    renderPage();

    expect(vi.mocked(usePositionHistory).mock.calls[0]?.[0]).toBe(7 * 24 * 60 * 60 * 1000);

    fireEvent.click(screen.getByText('7 Days'));
    [
      'Today', '14 Days', '30 Days', '90 Days', '120 Days',
      '6 Months', '1 Year', 'MTD', 'YTD', 'Custom Range...', 'All Time',
    ].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('opens CustomDateRangeModal and passes custom range dates to usePositionHistory', () => {
    renderPage();

    fireEvent.click(screen.getByText('7 Days'));
    fireEvent.click(screen.getByText('Custom Range...'));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Start Date/i), { target: { value: '2026-01-05' } });
    fireEvent.change(screen.getByLabelText(/End Date/i), { target: { value: '2026-01-25' } });
    fireEvent.click(screen.getByRole('button', { name: /Apply Range/i }));

    const lastCall = vi.mocked(usePositionHistory).mock.calls.at(-1);
    expect(lastCall?.[0]).toBe('custom');
    expect(lastCall?.[3]).toBe('2026-01-05');
    expect(lastCall?.[4]).toBe('2026-01-25');
  });

  it('shows HistoryLimitWarning when an active OKX or Bitget key exists and >90d is selected', () => {
    useApiKeysStore.setState({
      keys: [
        { id: 'conn-okx', exchange: 'okx', label: 'OKX', apiKey: 'k', apiSecret: 's', passphrase: 'p', isActive: true },
      ],
    } as never);

    renderPage();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('7 Days'));
    fireEvent.click(screen.getByText('120 Days'));

    const banner = screen.getByRole('status');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveClass('history-limit-banner');
    expect(banner.textContent?.toLowerCase()).toContain('okx');
  });

  it('accumulates total PnL as a float and still shows the exact cent at a half-cent boundary', () => {
    // 0.35 + 0.35 + 0.305 = 1.005 in decimal; the float sum holds 1.0049999999999999.
    vi.mocked(usePositionHistory).mockReturnValue(hookResult({
      positions: [
        closed({ id: 'h1', symbol: 'BTCUSDT', realizedPnl: 0.35 }),
        closed({ id: 'h2', symbol: 'ETHUSDT', realizedPnl: 0.35 }),
        closed({ id: 'h3', symbol: 'SOLUSDT', realizedPnl: 0.305 }),
      ],
    }) as never);

    renderPage();

    // The component's `totalPnl += pnlInUsd` is float math, but the display goes
    // through Intl, which rounds the shortest decimal form — so the cent is kept.
    expect([0.35, 0.35, 0.305].reduce((a, b) => a + b, 0)).toBe(1.005);
    expect([0.35, 0.35, 0.305].reduce((a, b) => a + b, 0).toFixed(2)).toBe('1.00');
    expect(screen.getAllByText('+$1.01').length).toBeGreaterThanOrEqual(1);
  });

  it('renders the position value and the entry/exit prices in the active currency', () => {
    useSettingsStore.setState({ fiatCurrency: 'BRL', locale: 'pt-BR' });
    vi.mocked(usePositionHistory).mockReturnValue(hookResult({
      // Bybit linear: position value = size × entry price = 60,000 USD → 300,000 BRL.
      positions: [closed({ id: 'h1', symbol: 'BTCUSDT', size: 1, entryPrice: 60000, closePrice: 61000 })],
    }) as never);

    const { container } = renderPage();

    // Value column carries the active symbol instead of a fixed "USD" suffix,
    // and the entry price is converted too (BRL rate 5).
    expect(screen.getAllByText(/R\$\s*300\.000,00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/R\$\s*305\.000,00/).length).toBeGreaterThan(0);
    expect(container.textContent).not.toMatch(/\bUSD\b/);
  });

  it('opens the export menu and calls the CSV exporter with the filtered rows', () => {
    renderPage();

    fireEvent.click(screen.getByText('Export'));
    fireEvent.click(screen.getByText('Export CSV'));

    expect(exportToCSV).toHaveBeenCalledTimes(1);
    const [config] = vi.mocked(exportToCSV).mock.calls[0];
    expect(config.title).toBe('Closed Positions Report');
    expect(config.filename).toMatch(/^Closed_Positions_/);
    expect(config.rows).toHaveLength(2);
    expect(config.headers[0]).toBe('Symbol');
  });

  it('localizes title, 4 summary cards, and pagination label in pt-BR without trailing colons on wins/losses', async () => {
    await i18n.changeLanguage('pt-BR');
    useSettingsStore.setState({ locale: 'pt-BR' });
    vi.mocked(usePositionHistory).mockReturnValue(hookResult({
      positions: [
        closed({ id: 'h1', symbol: 'BTCUSDT', realizedPnl: 120 }),
        closed({ id: 'h2', symbol: 'ETHUSDT', side: 'short', realizedPnl: -40 }),
        closed({ id: 'h3', symbol: 'SOLUSDT', realizedPnl: 50 }),
        closed({ id: 'h4', symbol: 'XRPUSDT', realizedPnl: 10 }),
        closed({ id: 'h5', symbol: 'ADAUSDT', realizedPnl: 20 }),
        closed({ id: 'h6', symbol: 'AVAXUSDT', realizedPnl: 30 }),
      ],
    }) as never);

    renderPage();

    expect(screen.getByText('Posições Fechadas')).toBeInTheDocument();
    expect(screen.getByText('Lucro Líquido (Total PnL)')).toBeInTheDocument();
    expect(screen.getByText('Custos Operacionais')).toBeInTheDocument();
    expect(screen.getByText('Volume de Operações')).toBeInTheDocument();
    expect(screen.getByText('Taxa de Acerto & Estatísticas')).toBeInTheDocument();
    expect(screen.getByText('Média G/P')).toBeInTheDocument();
    expect(screen.getByText('Maior G/P')).toBeInTheDocument();
    expect(screen.getByText('5 Ganhos')).toBeInTheDocument();
    expect(screen.getByText('1 Perdas')).toBeInTheDocument();
    expect(screen.queryByText(/Ganhos:/)).not.toBeInTheDocument();
  });
});
