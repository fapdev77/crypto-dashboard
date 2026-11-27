import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { useFormatCurrency } from '../hooks/useFormatCurrency';
import { PrivacyProvider, usePrivacy } from '../context/PrivacyContext';
import { useSettingsStore } from '../store/settingsStore';
import Big from 'big.js';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <PrivacyProvider>{children}</PrivacyProvider>
);

describe('useFormatCurrency Hook', () => {
  beforeEach(() => {
    localStorage.setItem('app_privacy_mode', 'false');
    act(() => {
      useSettingsStore.setState({
        fiatCurrency: 'USD',
        locale: 'en-US',
        fiatRates: { USD: 1.0, BRL: 5.0, EUR: 0.9, GBP: 0.8 },
      });
    });
  });

  it('formats standard USD values with $ symbol', () => {
    const { result } = renderHook(() => useFormatCurrency(), { wrapper });
    expect(result.current(100, 'usd')).toBe('$100.00');
    expect(result.current(-50.5, 'usd')).toBe('-$50.50');
  });

  it('converts to BRL with R$ symbol and pt-BR formatting when BRL is selected', () => {
    act(() => {
      useSettingsStore.setState({
        fiatCurrency: 'BRL',
        locale: 'pt-BR',
      });
    });

    const { result } = renderHook(() => useFormatCurrency(), { wrapper });
    // 100 USD * 5.0 = 500 BRL
    const formatted = result.current(100, 'usd');
    expect(formatted).toContain('R$');
    expect(formatted).toContain('500,00');
  });

  it('converts to EUR with € symbol when EUR is selected', () => {
    act(() => {
      useSettingsStore.setState({
        fiatCurrency: 'EUR',
        locale: 'it-IT',
      });
    });

    const { result } = renderHook(() => useFormatCurrency(), { wrapper });
    // 100 USD * 0.9 = 90 EUR
    const formatted = result.current(100, 'usd');
    expect(formatted).toContain('€');
    expect(formatted).toContain('90,00');
  });

  it('converts to GBP with £ symbol when GBP is selected', () => {
    act(() => {
      useSettingsStore.setState({
        fiatCurrency: 'GBP',
        locale: 'en-GB',
      });
    });

    const { result } = renderHook(() => useFormatCurrency(), { wrapper });
    // 100 USD * 0.8 = 80 GBP
    const formatted = result.current(100, 'usd');
    expect(formatted).toContain('£');
    expect(formatted).toContain('80.00');
  });

  it('masks sensitive amounts with proper currency symbol in privacy mode', () => {
    const { result } = renderHook(() => {
      const format = useFormatCurrency();
      const privacy = usePrivacy();
      return { format, privacy };
    }, { wrapper });

    // Enable privacy mode
    act(() => {
      result.current.privacy.togglePrivacyMode();
    });

    // When USD is selected
    expect(result.current.format(1000, 'usd')).toBe('$••••');

    // Switch to BRL
    act(() => {
      useSettingsStore.setState({ fiatCurrency: 'BRL' });
    });
    expect(result.current.format(1000, 'usd')).toContain('R$');
    expect(result.current.format(1000, 'usd')).toContain('••••');

    // Crypto mask
    expect(result.current.format(1.5, 'crypto')).toBe('••••');
  });

  it('handles Big.js instances seamlessly', () => {
    const { result } = renderHook(() => useFormatCurrency(), { wrapper });
    const bigVal = new Big('1234.5678');
    expect(result.current(bigVal, 'usd')).toBe('$1,234.57');
  });
});
