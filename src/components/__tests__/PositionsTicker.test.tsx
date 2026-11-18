import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PositionsTicker } from '../PositionsTicker';
import { TooltipProvider } from '../ui/Tooltip';
import { PrivacyProvider } from '../../context/PrivacyContext';
import { usePositionsStore } from '../../store/positionsStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useApiKeysStore } from '../../store/apiKeysStore';
import type { UnifiedPosition } from '../../types';
import i18n from '../../i18n/config';

const position = (overrides: Partial<UnifiedPosition>): UnifiedPosition => ({
  id: 'pos-1',
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
  unrealizedPnl: 100,
  realizedPnl: 10,
  leverage: 5,
  marginMode: 'cross',
  instrumentType: 'PERP',
  ...overrides,
});

const renderTicker = () =>
  render(
    <PrivacyProvider>
      <TooltipProvider>
        <PositionsTicker />
      </TooltipProvider>
    </PrivacyProvider>
  );

describe('PositionsTicker', () => {
  beforeEach(() => {
    i18n.changeLanguage('en-US');
    localStorage.setItem('app_privacy_mode', 'false');
    useSettingsStore.setState({
      fiatCurrency: 'USD',
      locale: 'en-US',
      fiatRates: { USD: 1, EUR: 0.9, GBP: 0.8, BRL: 5 },
      useMockData: false,
    });
    useApiKeysStore.setState({
      keys: [{ id: 'conn-1', exchange: 'bybit', label: 'Main', apiKey: 'k', apiSecret: 's', isActive: true }],
    } as never);
    usePositionsStore.setState({ positions: {} });
  });

  it('shows the mark price in the active currency instead of a fixed dollar sign', () => {
    useSettingsStore.setState({ fiatCurrency: 'BRL', locale: 'pt-BR' });
    usePositionsStore.setState({ positions: { 'pos-1': position({ markPrice: 61000 }) } });

    const { container } = renderTicker();

    // 61,000 USD × 5 (BRL rate) → R$ 305.000,00, with the active symbol and locale.
    expect(screen.getAllByText(/R\$\s*305\.000,00/).length).toBeGreaterThan(0);
    expect(container.textContent).not.toContain('$305');
  });
});
