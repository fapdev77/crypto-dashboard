import { extractBaseCoin, extractQuoteCoin } from './unifiers';

// Standard OKX contract values (ctVal) when public API metadata isn't cached yet
export const OKX_KNOWN_CONTRACT_VALUES: Record<string, { ctVal: number; ctType: 'linear' | 'inverse'; ctValCcy?: string }> = {
  // Major linear contracts (USDT / USDC margined swaps & futures)
  'BTC': { ctVal: 0.01, ctType: 'linear', ctValCcy: 'BTC' },
  'ETH': { ctVal: 0.1, ctType: 'linear', ctValCcy: 'ETH' },
  'BNB': { ctVal: 0.01, ctType: 'linear', ctValCcy: 'BNB' },
  'BCH': { ctVal: 0.1, ctType: 'linear', ctValCcy: 'BCH' },
  'FIL': { ctVal: 0.1, ctType: 'linear', ctValCcy: 'FIL' },
  'SOL': { ctVal: 1, ctType: 'linear', ctValCcy: 'SOL' },
  'LTC': { ctVal: 1, ctType: 'linear', ctValCcy: 'LTC' },
  'AVAX': { ctVal: 1, ctType: 'linear', ctValCcy: 'AVAX' },
  'LINK': { ctVal: 1, ctType: 'linear', ctValCcy: 'LINK' },
  'DOT': { ctVal: 1, ctType: 'linear', ctValCcy: 'DOT' },
  'APT': { ctVal: 1, ctType: 'linear', ctValCcy: 'APT' },
  'ETC': { ctVal: 1, ctType: 'linear', ctValCcy: 'ETC' },
  'TON': { ctVal: 1, ctType: 'linear', ctValCcy: 'TON' },
  'WIF': { ctVal: 1, ctType: 'linear', ctValCcy: 'WIF' },
  'NEAR': { ctVal: 10, ctType: 'linear', ctValCcy: 'NEAR' },
  'SUI': { ctVal: 10, ctType: 'linear', ctValCcy: 'SUI' },
  'ARB': { ctVal: 10, ctType: 'linear', ctValCcy: 'ARB' },
  'OP': { ctVal: 10, ctType: 'linear', ctValCcy: 'OP' },
  'POL': { ctVal: 10, ctType: 'linear', ctValCcy: 'POL' },
  'MATIC': { ctVal: 10, ctType: 'linear', ctValCcy: 'MATIC' },
  'ADA': { ctVal: 100, ctType: 'linear', ctValCcy: 'ADA' },
  'XRP': { ctVal: 100, ctType: 'linear', ctValCcy: 'XRP' },
  'KAS': { ctVal: 100, ctType: 'linear', ctValCcy: 'KAS' },
  'DOGE': { ctVal: 1000, ctType: 'linear', ctValCcy: 'DOGE' },
  'TRX': { ctVal: 1000, ctType: 'linear', ctValCcy: 'TRX' },
  'FLOKI': { ctVal: 100000, ctType: 'linear', ctValCcy: 'FLOKI' },
  'BONK': { ctVal: 100000, ctType: 'linear', ctValCcy: 'BONK' },
  'SHIB': { ctVal: 1000000, ctType: 'linear', ctValCcy: 'SHIB' },
  'PEPE': { ctVal: 10000000, ctType: 'linear', ctValCcy: 'PEPE' },
};

/**
 * Returns the contract multiplier and type for an OKX instrument.
 */
export function getOkxContractInfo(
  symbol?: string,
  category?: string,
  cachedInsts?: Record<string, any>
): { ctVal: number; ctType: 'linear' | 'inverse'; isDerivative: boolean } {
  if (!symbol) {
    return { ctVal: 1, ctType: 'linear', isDerivative: false };
  }

  const s = symbol.toUpperCase();
  const cat = (category || '').toUpperCase();
  const isDerivative =
    cat === 'SWAP' ||
    cat === 'FUTURES' ||
    cat === 'OPTION' ||
    s.includes('-SWAP') ||
    s.split('-').length >= 3;

  if (!isDerivative) {
    return { ctVal: 1, ctType: 'linear', isDerivative: false };
  }

  // Check cached instrument from OKX public API if provided
  if (cachedInsts && cachedInsts[symbol]) {
    const inst = cachedInsts[symbol];
    const ctVal = parseFloat(inst.ctVal || '1');
    const ctType = (inst.ctType || 'linear').toLowerCase() === 'inverse' ? 'inverse' : 'linear';
    return { ctVal: isNaN(ctVal) || ctVal <= 0 ? 1 : ctVal, ctType, isDerivative: true };
  }

  // Check if Inverse (e.g. BTC-USD-SWAP, ETH-USD-SWAP, BTC-USD-241227)
  const isInverse = s.endsWith('-USD-SWAP') || (s.includes('-USD-') && !s.includes('-USDT-') && !s.includes('-USDC-'));
  if (isInverse) {
    if (s.startsWith('BTC')) {
      return { ctVal: 100, ctType: 'inverse', isDerivative: true };
    }
    return { ctVal: 10, ctType: 'inverse', isDerivative: true };
  }

  // Linear contracts: extract base coin (e.g. "BTC" from "BTC-USDT-SWAP")
  const base = extractBaseCoin('okx', symbol);
  if (base && OKX_KNOWN_CONTRACT_VALUES[base]) {
    return {
      ctVal: OKX_KNOWN_CONTRACT_VALUES[base].ctVal,
      ctType: 'linear',
      isDerivative: true,
    };
  }

  return { ctVal: 1, ctType: 'linear', isDerivative: true };
}

/**
 * Calculates accurate trade details for an OKX transaction or bill:
 * - Number of contracts (sz in OKX)
 * - Contract value (ctVal)
 * - Actual crypto amount in base currency (e.g. 0.0012 BTC)
 * - Total trade / position notional value in USDT/USD (e.g. 93.85 USDT)
 */
export function calculateOkxTradeDetails(params: {
  symbol?: string;
  category?: string;
  sz?: string | number;
  qty?: string | number;
  tradePrice?: string | number;
  currency?: string;
  raw?: any;
  cachedInsts?: Record<string, any>;
}) {
  const { symbol = '', category = '', currency = '', raw, cachedInsts } = params;
  
  // OKX raw.sz is the number of contracts for derivatives
  const rawSz = raw?.sz !== undefined && raw?.sz !== ''
    ? parseFloat(String(raw.sz))
    : (params.sz !== undefined && params.sz !== '' ? parseFloat(String(params.sz)) : parseFloat(String(params.qty || '0')));
  
  const px = parseFloat(String(params.tradePrice || raw?.px || raw?.price || '0'));
  
  const { ctVal, ctType, isDerivative } = getOkxContractInfo(symbol, category, cachedInsts);
  const baseCoin = extractBaseCoin('okx', symbol) || currency;
  const quoteCoin = extractQuoteCoin('okx', symbol) || currency || 'USDT';

  if (!isDerivative) {
    // SPOT or non-derivative: sz is already in base crypto quantity
    const cryptoQty = isNaN(rawSz) ? 0 : rawSz;
    const totalValueUsd = px > 0 ? cryptoQty * px : 0;
    return {
      isDerivative: false,
      contracts: 0,
      ctVal: 1,
      ctType: 'linear' as const,
      cryptoQty,
      totalValueUsd,
      baseCoin,
      quoteCoin,
      isInverse: false,
    };
  }

  // For SWAP / FUTURES / OPTION:
  const contracts = isNaN(rawSz) ? 0 : rawSz;
  let cryptoQty = 0;
  let totalValueUsd = 0;

  if (ctType === 'inverse') {
    // Inverse: 1 contract = ctVal USD (e.g. 100 USD for BTC, 10 USD for ETH)
    totalValueUsd = contracts * ctVal;
    cryptoQty = px > 0 ? totalValueUsd / px : 0;
  } else {
    // Linear: 1 contract = ctVal base coins (e.g. 0.01 BTC for BTC-USDT-SWAP)
    cryptoQty = contracts * ctVal;
    totalValueUsd = px > 0 ? cryptoQty * px : 0;
  }

  return {
    isDerivative: true,
    contracts,
    ctVal,
    ctType,
    cryptoQty,
    totalValueUsd,
    baseCoin,
    quoteCoin,
    isInverse: ctType === 'inverse',
  };
}
