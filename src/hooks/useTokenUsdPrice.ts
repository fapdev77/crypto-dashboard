import { useState, useEffect } from 'react';
import { getUsdPrice } from '../services/pricing/usdPrice';
import { needsTokenRate } from '../utils/usdAggregation';

/**
 * Backwards-compatible wrapper around the shared USD price cascade
 * (exchange ticker -> OKX, with retry, success cache and negative cache).
 *
 * Returns null for codes that are already USD-denominated for callers
 * (USD-pegged stablecoins and fiat proxies) and for anything the cascade
 * cannot price. It never invents a 1:1 rate for symbols that merely contain
 * "USD" (e.g. USDS, USD1).
 */
export async function fetchTokenUsdPrice(ccy: string): Promise<number | null> {
  if (!ccy) return null;

  const code = ccy.toUpperCase().trim();
  if (!needsTokenRate(code)) return null;

  return getUsdPrice(code);
}

/**
 * Fetch the current USD price for a given currency.
 *
 * @param ccy The currency code to look up (e.g. 'BTC', 'ETH').
 * @returns The current price in USD, or null if unavailable.
 */
export function useTokenUsdPrice(ccy: string) {
  const [price, setPrice] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchTokenUsdPrice(ccy).then((p) => {
      if (isMounted) setPrice(p);
    });
    return () => { isMounted = false; };
  }, [ccy]);

  return price;
}
