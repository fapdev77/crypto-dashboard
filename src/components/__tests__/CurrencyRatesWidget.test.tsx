import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CurrencyRatesWidget } from '../analytics/CurrencyRatesWidget';
import { TooltipProvider } from '../ui/Tooltip';
import { useSettingsStore } from '../../store/settingsStore';
import { CurrencyService } from '../../services/currency/CurrencyService';
import i18n from '../../i18n/config';

const renderWithTooltip = (ui: React.ReactElement) => {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
};

describe('CurrencyRatesWidget', () => {
  beforeEach(() => {
    i18n.changeLanguage('en-US');
    useSettingsStore.setState({
      fiatCurrency: 'USD',
      fiatRates: { USD: 1.0, EUR: 0.92, GBP: 0.79, BRL: 5.65 },
      fiatRatesLastUpdated: Date.now(),
      fiatRatesSource: 'api.frankfurter.dev',
      fiatRatesStatus: 'live',
      fiatRatesTtlMinutes: 30,
      usdtRate: 0.9995,
      usdtRateStatus: 'live',
    });
  });

  it('renders correctly with title, base reference rate, and live provider badges', () => {
    renderWithTooltip(<CurrencyRatesWidget />);

    expect(screen.getByText('Global Currency Rates')).toBeInTheDocument();
    expect(screen.getByText(/Base: 1 USD/)).toBeInTheDocument();
    expect(screen.getByText(/Frankfurter & CoinGecko/)).toBeInTheDocument();
  });

  it('renders all 4 supported fiat currency cards plus USDT stablecoin card', () => {
    renderWithTooltip(<CurrencyRatesWidget />);

    expect(screen.getAllByText('USD').length).toBeGreaterThan(0);
    expect(screen.getAllByText('BRL').length).toBeGreaterThan(0);
    expect(screen.getAllByText('EUR').length).toBeGreaterThan(0);
    expect(screen.getAllByText('GBP').length).toBeGreaterThan(0);
    expect(screen.getByTestId('currency-card-usdt')).toBeInTheDocument();

    // Check rate values
    expect(screen.getByText('5.6500')).toBeInTheDocument();
    expect(screen.getByText('0.9200')).toBeInTheDocument();
    expect(screen.getByText('0.7900')).toBeInTheDocument();
    expect(screen.getAllByText('USDT').length).toBeGreaterThan(0);
    expect(screen.getByText('₮')).toBeInTheDocument();
    expect(screen.getByText('CoinGecko')).toBeInTheDocument();
  });

  it('allows clicking another currency card to switch active currency', () => {
    renderWithTooltip(<CurrencyRatesWidget />);

    const brlElements = screen.getAllByText('BRL');
    const brlCard = brlElements[0].closest('div[class*="cursor-pointer"]');
    expect(brlCard).toBeInTheDocument();

    if (brlCard) {
      fireEvent.click(brlCard);
    }

    expect(useSettingsStore.getState().fiatCurrency).toBe('BRL');
  });

  it('displays cached status badge when rates are cached', () => {
    useSettingsStore.setState({
      fiatRatesStatus: 'cached',
      fiatRatesTtlMinutes: 15,
    });

    renderWithTooltip(<CurrencyRatesWidget />);

    expect(screen.getByText(/Cached/)).toBeInTheDocument();
    expect(screen.getByText(/15m TTL/)).toBeInTheDocument();
  });

  it('displays safety mode badge when fallback rates are active', () => {
    useSettingsStore.setState({
      fiatRatesStatus: 'fallback',
      usdtRateStatus: 'fallback',
    });

    renderWithTooltip(<CurrencyRatesWidget />);

    expect(screen.getByText('Safety Mode')).toBeInTheDocument();
  });

  it('refreshes rates when clicking refresh button', async () => {
    const fetchSpy = vi.spyOn(CurrencyService, 'fetchFiatRates').mockResolvedValue({
      USD: 1.0,
      EUR: 0.9,
      GBP: 0.8,
      BRL: 5.5,
    });

    renderWithTooltip(<CurrencyRatesWidget />);

    const refreshBtn = screen.getByRole('button', { name: /Refresh rates/i });
    await act(async () => {
      fireEvent.click(refreshBtn);
    });

    expect(fetchSpy).toHaveBeenCalledWith(0);
  });
});
