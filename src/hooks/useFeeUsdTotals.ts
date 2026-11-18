import { useEffect, useMemo, useState } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { getUsdPricesForVenues, type PriceExchange } from '../services/pricing/usdPrice';
import { feesToUsd, needsTokenRate, type FeeCurrencyTotal } from '../utils/usdAggregation';

const PRICEABLE_VENUES: string[] = ['bybit', 'bitget', 'okx'];

export interface FeeCurrencyBucket extends FeeCurrencyTotal {
  /** Exchanges the fees came from, so the coin is priced on a venue that lists it. */
  venues: string[];
}

export interface FeeUsdTotals {
  totalFeesUsd: number;
  /** Currencies left out of the total because no USD price was found. */
  missingCurrencies: string[];
}

/**
 * Converts fees charged in different currencies to USD.
 *
 * Fees are grouped by the currency the exchange actually charged (`feeCurrency`),
 * because a fee paid in MNT, BGB or the base coin is not worth its face value in
 * dollars. `baseUsd` carries fees that are already in USD, such as inverse
 * contract fees (coin amount multiplied by price).
 */
export function useFeeUsdTotals(buckets: FeeCurrencyBucket[], baseUsd: number): FeeUsdTotals {
  const fiatRates = useSettingsStore(state => state.fiatRates);
  const [rates, setRates] = useState<Record<string, number>>({});
  // Which currency/venue combination the last lookup was for, so a total is not
  // reported as incomplete while its prices are still on the way.
  const [settledKey, setSettledKey] = useState<string | null>(null);

  // Venue-specific lookups are needed because exchange tokens (MNT, BGB) are not
  // listed on OKX, which is the generic fallback. Amounts do not affect pricing,
  // so only the currency/venue pairs drive the fetch.
  const pricingKey = buckets.map(b => `${b.currency}:${b.venues.join('|')}`).join(',');

  useEffect(() => {
    const byVenue: Partial<Record<PriceExchange, string[]>> = {};
    for (const bucket of buckets) {
      if (!needsTokenRate(bucket.currency, fiatRates)) continue;
      const venue = bucket.venues.find(v => PRICEABLE_VENUES.includes(v)) as PriceExchange | undefined;
      if (!venue) continue;
      (byVenue[venue] ||= []).push(bucket.currency);
    }

    if (Object.keys(byVenue).length === 0) {
      setSettledKey(pricingKey);
      return;
    }

    let cancelled = false;
    getUsdPricesForVenues(byVenue, fiatRates)
      .then(result => {
        if (cancelled || Object.keys(result.rates).length === 0) return;
        setRates(prev => ({ ...prev, ...result.rates }));
      })
      .catch(() => {
        // A failed lookup leaves the currency unpriced; the notice surfaces it.
      })
      .finally(() => {
        if (!cancelled) setSettledKey(pricingKey);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pricingKey, fiatRates]);

  const { totalFeesUsd, missing } = useMemo(() => {
    const converted = feesToUsd(buckets, rates, fiatRates);
    return { totalFeesUsd: (baseUsd || 0) + converted.totalUsd, missing: converted.missing };
  }, [buckets, baseUsd, rates, fiatRates]);

  return {
    totalFeesUsd,
    missingCurrencies: settledKey === pricingKey ? missing : [],
  };
}
