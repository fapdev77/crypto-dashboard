/**
 * Direction of a trade as a cash-flow event: buying or selling the base asset.
 *
 * Venues label the same execution differently: Bybit uses Buy/Sell, while
 * Bitget and OKX also expose position actions such as "Open Long", "Close Long",
 * "Open Short" and "Close Short". A substring test on "long"/"short" gets those
 * backwards, because closing a long is a sale and closing a short is a purchase.
 */
export type TradeDirection = 'buy' | 'sell' | null;

function normalize(side: string | undefined | null): string {
  return (side || '')
    .toLowerCase()
    .replace(/[_\-\/()]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function classifyTradeSide(side: string | undefined | null): TradeDirection {
  const s = normalize(side);
  if (!s || s === 'none' || s === 'net') return null;

  const isClose = /\b(close|closing|reduce|reducing)\b/.test(s);
  const isOpen = /\b(open|opening)\b/.test(s);
  const isLong = s.includes('long');
  const isShort = s.includes('short');

  // Position actions first: the closing direction is the opposite of the position.
  if (isClose && isLong) return 'sell';
  if (isClose && isShort) return 'buy';
  if (isOpen && isLong) return 'buy';
  if (isOpen && isShort) return 'sell';

  // A bare position side (no open/close information) is the entry direction.
  if (isLong) return 'buy';
  if (isShort) return 'sell';

  if (s.includes('buy') || s === 'in') return 'buy';
  if (s.includes('sell') || s === 'out') return 'sell';

  return null;
}
