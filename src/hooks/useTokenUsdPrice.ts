import { useState, useEffect } from 'react';

const cache: Record<string, { price: number; timestamp: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 min

export function useTokenUsdPrice(ccy: string) {
  const [price, setPrice] = useState<number | null>(null);

  useEffect(() => {
    if (!ccy || ccy.includes('USD') || ccy === 'EUR') {
      setPrice(null);
      return;
    }

    const cleanCcy = ccy.toUpperCase();
    const now = Date.now();
    if (cache[cleanCcy] && now - cache[cleanCcy].timestamp < CACHE_TTL) {
      setPrice(cache[cleanCcy].price);
      return;
    }

    const fetchPrice = async () => {
      try {
        const symbol = `${cleanCcy}USDT`;
        const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
        if (res.ok) {
          const data = await res.json();
          const p = parseFloat(data.price);
          cache[cleanCcy] = { price: p, timestamp: Date.now() };
          setPrice(p);
        }
      } catch (err) {
        console.warn(`[useTokenUsdPrice] Failed to fetch price for ${cleanCcy}`, err);
      }
    };

    fetchPrice();
  }, [ccy]);

  return price;
}
