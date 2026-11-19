import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CurrencyApiDiagnostics } from '../currency/CurrencyApiDiagnostics';
import { useSettingsStore } from '../../store/settingsStore';
import { CurrencyService } from '../../services/currency/CurrencyService';
import i18n from '../../i18n/config';

describe('CurrencyApiDiagnostics', () => {
  beforeEach(() => {
    i18n.changeLanguage('en-US');
    useSettingsStore.setState({
      usdtRate: 0.9995,
      apiDiagnostics: {
        frankfurter: {
          status: 'connected',
          lastUpdated: 1730930000000,
          latencyMs: 145,
          endpoint: 'https://api.frankfurter.dev/v2/rates',
        },
        coingecko: {
          status: 'connected',
          lastUpdated: 1730930000000,
          latencyMs: 230,
          endpoint: 'https://api.coingecko.com/api/v3/simple/price',
        },
      },
    });
  });

  it('renders both Frankfurter and CoinGecko diagnostic panels', () => {
    render(<CurrencyApiDiagnostics />);

    expect(screen.getByText('Currency API Diagnostics')).toBeInTheDocument();
    expect(screen.getByText('Frankfurter v2')).toBeInTheDocument();
    expect(screen.getByText('CoinGecko v3')).toBeInTheDocument();

    expect(screen.getByText('https://api.frankfurter.dev/v2/rates')).toBeInTheDocument();
    expect(screen.getByText('https://api.coingecko.com/api/v3/simple/price')).toBeInTheDocument();

    expect(screen.getByText('145 ms')).toBeInTheDocument();
    expect(screen.getByText(/1 USDT ≈ \$0\.9995/)).toBeInTheDocument();
  });

  it('triggers test connection when clicking the test button', async () => {
    const fetchSpy = vi.spyOn(CurrencyService, 'fetchFiatRates').mockResolvedValue({
      USD: 1.0,
      EUR: 0.9,
      GBP: 0.8,
      BRL: 5.5,
    });

    render(<CurrencyApiDiagnostics />);

    const testBtn = screen.getByRole('button', { name: /Test Connection/i });
    await act(async () => {
      fireEvent.click(testBtn);
    });

    expect(fetchSpy).toHaveBeenCalledWith(0);
  });

  it('renders error badges and error descriptions when an API fails', () => {
    useSettingsStore.setState({
      apiDiagnostics: {
        frankfurter: {
          status: 'error',
          lastUpdated: null,
          latencyMs: 0,
          error: 'Frankfurter upstream timed out',
          endpoint: 'https://api.frankfurter.dev/v2/rates',
        },
        coingecko: {
          status: 'error',
          lastUpdated: null,
          latencyMs: 0,
          error: 'Rate limit exceeded on CoinGecko',
          endpoint: 'https://api.coingecko.com/api/v3/simple/price',
        },
      },
    });

    render(<CurrencyApiDiagnostics />);

    expect(screen.getAllByText('Offline').length).toBe(2);
    expect(screen.getByText('Frankfurter upstream timed out')).toBeInTheDocument();
    expect(screen.getByText('Rate limit exceeded on CoinGecko')).toBeInTheDocument();
  });
});
