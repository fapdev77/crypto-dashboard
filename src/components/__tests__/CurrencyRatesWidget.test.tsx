import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CurrencyRatesWidget } from '../analytics/CurrencyRatesWidget';
import { TooltipProvider } from '../ui/Tooltip';
import { useSettingsStore } from '../../store/settingsStore';
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
      fiatRatesSource: 'open.er-api.com',
      fiatRatesStatus: 'live',
      fiatRatesTtlMinutes: 30,
    });
  });

  it('renders correctly with title and base reference rate', () => {
    renderWithTooltip(<CurrencyRatesWidget />);

    expect(screen.getByText('Global Currency Rates')).toBeInTheDocument();
    expect(screen.getByText(/Base: 1 USD/)).toBeInTheDocument();
    expect(screen.getByText(/open\.er-api\.com/)).toBeInTheDocument();
  });

  it('renders all 4 supported fiat currency cards', () => {
    renderWithTooltip(<CurrencyRatesWidget />);

    expect(screen.getAllByText('USD').length).toBeGreaterThan(0);
    expect(screen.getAllByText('BRL').length).toBeGreaterThan(0);
    expect(screen.getAllByText('EUR').length).toBeGreaterThan(0);
    expect(screen.getAllByText('GBP').length).toBeGreaterThan(0);

    // Check rate values
    expect(screen.getByText('5.6500')).toBeInTheDocument();
    expect(screen.getByText('0.9200')).toBeInTheDocument();
    expect(screen.getByText('0.7900')).toBeInTheDocument();
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
    });

    renderWithTooltip(<CurrencyRatesWidget />);

    expect(screen.getByText('Safety Mode')).toBeInTheDocument();
  });
});
