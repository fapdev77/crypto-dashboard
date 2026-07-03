import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { usePagination } from '../usePagination';
import { useFormatCurrency } from '../useFormatCurrency';
import { PrivacyProvider } from '../../context/PrivacyContext';
import Big from 'big.js';

// ─────────────────────────────────────────────
// usePagination
// ─────────────────────────────────────────────

describe('usePagination', () => {
  const ITEMS = Array.from({ length: 100 }, (_, i) => `item-${i + 1}`);

  it('should start on page 1 with first slice', () => {
    const { result } = renderHook(() => usePagination(ITEMS, 10));

    expect(result.current.page).toBe(1);
    expect(result.current.paginated).toHaveLength(10);
    expect(result.current.paginated[0]).toBe('item-1');
    expect(result.current.paginated[9]).toBe('item-10');
    expect(result.current.totalPages).toBe(10);
    expect(result.current.totalItems).toBe(100);
    expect(result.current.startItem).toBe(1);
    expect(result.current.endItem).toBe(10);
  });

  it('should change page via setPage', () => {
    const { result } = renderHook(() => usePagination(ITEMS, 10));

    act(() => {
      result.current.setPage(3);
    });

    expect(result.current.page).toBe(3);
    expect(result.current.paginated[0]).toBe('item-21');
    expect(result.current.paginated[9]).toBe('item-30');
    expect(result.current.startItem).toBe(21);
    expect(result.current.endItem).toBe(30);
  });

  it('should reset to page 1 when resetDeps change', () => {
    const { result, rerender } = renderHook(
      ({ data, deps }) => usePagination(data, 10, deps),
      { initialProps: { data: ITEMS, deps: ['initial'] } },
    );

    // Move to page 3
    act(() => {
      result.current.setPage(3);
    });
    expect(result.current.page).toBe(3);

    // Trigger resetDeps change by re-rendering with new deps
    rerender({ data: ITEMS, deps: ['changed'] });

    expect(result.current.page).toBe(1);
  });

  it('should auto-clamp when data shrinks below current page', () => {
    const { result, rerender } = renderHook(
      ({ data }) => usePagination(data, 10),
      { initialProps: { data: ITEMS } },
    );

    // Go to last page
    act(() => {
      result.current.setPage(10);
    });
    expect(result.current.page).toBe(10);

    // Shrink data to 45 items (5 pages)
    rerender({ data: Array.from({ length: 45 }, (_, i) => `item-${i + 1}`) });

    // Should auto-clamp to page 5
    expect(result.current.page).toBe(5);
    expect(result.current.totalPages).toBe(5);
  });

  it('should handle empty data', () => {
    const { result } = renderHook(() => usePagination([], 10));

    expect(result.current.page).toBe(1);
    expect(result.current.paginated).toHaveLength(0);
    expect(result.current.totalPages).toBe(1);
    expect(result.current.startItem).toBe(0);
    expect(result.current.endItem).toBe(0);
    expect(result.current.totalItems).toBe(0);
  });

  it('should handle data smaller than itemsPerPage', () => {
    const { result } = renderHook(() => usePagination(['a', 'b', 'c'], 10));

    expect(result.current.totalPages).toBe(1);
    expect(result.current.paginated).toHaveLength(3);
    expect(result.current.startItem).toBe(1);
    expect(result.current.endItem).toBe(3);
  });

  it('should handle exact multiple of itemsPerPage', () => {
    const { result } = renderHook(() => usePagination(['a', 'b', 'c', 'd'], 2));

    expect(result.current.totalPages).toBe(2);
    expect(result.current.paginated).toHaveLength(2);

    act(() => {
      result.current.setPage(2);
    });

    expect(result.current.paginated).toEqual(['c', 'd']);
    expect(result.current.startItem).toBe(3);
    expect(result.current.endItem).toBe(4);
  });

  it('should use default itemsPerPage of 50', () => {
    const items = Array.from({ length: 120 }, (_, i) => `item-${i + 1}`);
    const { result } = renderHook(() => usePagination(items));

    expect(result.current.totalPages).toBe(3);
    expect(result.current.paginated).toHaveLength(50);
    expect(result.current.totalItems).toBe(120);
  });

  it('should not go below page 1 on clamp', () => {
    const { result, rerender } = renderHook(
      ({ data }) => usePagination(data, 10),
      { initialProps: { data: ITEMS } },
    );

    // Shrink to empty
    rerender({ data: [] });

    // Should stay at page 1
    expect(result.current.page).toBe(1);
    expect(result.current.totalPages).toBe(1);
  });

  it('setPage should clamp to totalPages when data is smaller', () => {
    const small = Array.from({ length: 5 }, (_, i) => `item-${i + 1}`);
    const { result } = renderHook(() => usePagination(small, 10));

    act(() => {
      result.current.setPage(5);
    });

    // Data has 5 items = 1 page, so clamp effect clamps to page 1
    expect(result.current.page).toBe(1);
    expect(result.current.totalPages).toBe(1);
  });
});

// ─────────────────────────────────────────────
// useFormatCurrency
// ─────────────────────────────────────────────

describe('useFormatCurrency', () => {
  beforeEach(() => {
    localStorage.setItem('app_privacy_mode', 'false');
  });

  function renderFormatHook() {
    return renderHook(() => useFormatCurrency(), {
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(PrivacyProvider, null, children),
    });
  }

  describe('USD formatting', () => {
    it('should format positive number as USD', () => {
      const { result } = renderFormatHook();
      expect(result.current(1234.56, 'usd')).toBe('$1,234.56');
    });

    it('should format negative number as USD', () => {
      const { result } = renderFormatHook();
      expect(result.current(-500, 'usd')).toBe('-$500.00');
    });

    it('should format zero as USD', () => {
      const { result } = renderFormatHook();
      expect(result.current(0, 'usd')).toBe('$0.00');
    });

    it('should format large numbers with custom decimals', () => {
      const { result } = renderFormatHook();
      expect(result.current(1234.5678, 'usd', 4)).toBe('$1,234.5678');
    });
  });

  describe('Crypto formatting', () => {
    it('should format as crypto with 8 decimal places by default', () => {
      const { result } = renderFormatHook();
      expect(result.current(0.00123456, 'crypto')).toBe('0.00123456');
    });

    it('should format as crypto with custom decimals', () => {
      const { result } = renderFormatHook();
      expect(result.current(0.001, 'crypto', 4)).toBe('0.0010');
    });

    it('should handle large crypto values', () => {
      const { result } = renderFormatHook();
      // formatCrypto uses minDecimals=2 for decimals > 4, so 100.5 → '100.50'
      expect(result.current(100.5, 'crypto')).toBe('100.50');
    });
  });

  describe('Price formatting', () => {
    it('should format fiat pair price', () => {
      const { result } = renderFormatHook();
      const val = result.current(50000, 'price');
      expect(val.replace(/,/g, '')).toMatch(/50000\.\d+/);
    });

    it('should format crypto pair price with more decimals', () => {
      const { result } = renderFormatHook();
      // Passing decimalsOrSymbol = 'false' means isFiatPair = false
      const val = result.current(0.00001234, 'price', 'false');
      expect(val).toMatch(/0\.00001\d+/);
    });
  });

  describe('Compact formatting', () => {
    it('should format as compact USD', () => {
      const { result } = renderFormatHook();
      expect(result.current(1500, 'compact')).toBe('$1.50k');
    });

    it('should format millions as M', () => {
      const { result } = renderFormatHook();
      expect(result.current(2500000, 'compact')).toBe('$2.50M');
    });

    it('should format small values normally', () => {
      const { result } = renderFormatHook();
      expect(result.current(500, 'compact')).toBe('$500.00');
    });
  });

  describe('Null / Undefined / NaN handling', () => {
    it('should return 0.00 for null USD (no $ prefix, raw fallback)', () => {
      const { result } = renderFormatHook();
      expect(result.current(null, 'usd')).toBe('0.00');
    });

    it('should return 0.00 for undefined USD', () => {
      const { result } = renderFormatHook();
      expect(result.current(undefined, 'usd')).toBe('0.00');
    });

    it('should return 0.00000000 for null crypto', () => {
      const { result } = renderFormatHook();
      expect(result.current(null, 'crypto')).toBe('0.00000000');
    });

    it('should return 0.00 for NaN', () => {
      const { result } = renderFormatHook();
      expect(result.current(NaN, 'usd')).toBe('0.00');
    });
  });

  describe('Big.js value handling', () => {
    it('should format Big.js number as USD', () => {
      const { result } = renderFormatHook();
      expect(result.current(new Big(1234.56), 'usd')).toBe('$1,234.56');
    });

    it('should format Big.js zero', () => {
      const { result } = renderFormatHook();
      expect(result.current(new Big(0), 'usd')).toBe('$0.00');
    });

    it('should format Big.js negative value', () => {
      const { result } = renderFormatHook();
      expect(result.current(new Big(-100.50), 'usd')).toBe('-$100.50');
    });
  });

  describe('Negative values', () => {
    it('should return negative USD with minus sign before $', () => {
      const { result } = renderFormatHook();
      const val = result.current(-1234.56, 'usd');
      expect(val).toBe('-$1,234.56');
    });

    it('should format negative crypto', () => {
      const { result } = renderFormatHook();
      const val = result.current(-0.001, 'crypto');
      // formatCrypto with decimals=8 shows max 8 digits: -0.00100000... actually minDecimals=2
      // for -0.001 with max decimals 8: at least 2, at most 8 decimals
      expect(val).toMatch(/-0\.001/);
    });
  });

  describe('Privacy mode masking', () => {
    beforeEach(() => {
      localStorage.setItem('app_privacy_mode', 'true');
    });

    it('should mask USD values in privacy mode', () => {
      const { result } = renderFormatHook();
      expect(result.current(1234.56, 'usd')).toBe('$••••');
    });

    it('should mask compact values in privacy mode', () => {
      const { result } = renderFormatHook();
      expect(result.current(1500, 'compact')).toBe('$••••');
    });

    it('should mask crypto values in privacy mode', () => {
      const { result } = renderFormatHook();
      expect(result.current(0.001, 'crypto')).toBe('••••');
    });

    it('should mask price values in privacy mode', () => {
      const { result } = renderFormatHook();
      expect(result.current(50000, 'price')).toBe('••••');
    });
  });
});
