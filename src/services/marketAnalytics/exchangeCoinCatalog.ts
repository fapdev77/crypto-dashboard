import { AssetKind, ExchangeId, MarketType, SpecificMarketType, SymbolEntry } from '../../types/marketAnalytics';
import { hybridFetch } from '../../utils/proxyFetch';
import { LogManager } from '../logger';

export type CoinCategory =
  | 'Layer 1'
  | 'Layer 2'
  | 'DeFi'
  | 'Meme'
  | 'AI & Data'
  | 'Infrastructure'
  | 'Gaming'
  | 'Others';

export interface CoinCatalogItem {
  symbol: string; // e.g. 'BTC', 'ETH'
  name: string;   // e.g. 'Bitcoin', 'Ethereum'
  category: CoinCategory;
  exchanges: ExchangeId[];
  markets: MarketType[];
  isPopular?: boolean;
  kind?: AssetKind;
}

/**
 * Full symbol catalog keyed by exchange and market type.
 * Populated from exchange instrument listings (Spot / USDT Perp / Inverse).
 */
export type SymbolRegistry = Record<ExchangeId, Record<SpecificMarketType, SymbolEntry[]>>;

/** Reverse index for a single base asset: where it trades and in which markets. */
export interface SymbolAvailability {
  symbol: string;
  name: string;
  kind: AssetKind;
  exchanges: ExchangeId[];
  markets: SpecificMarketType[];
}

const STORAGE_CATALOG_KEY = 'cpm_market_analytics_coin_catalog_v1';
const STORAGE_REGISTRY_KEY = 'cpm_market_analytics_symbol_registry_v1';
const CACHE_TTL_MS = 1000 * 60 * 60 * 4; // 4 hours

const EXCHANGES: ExchangeId[] = ['bybit', 'okx', 'bitget'];
const MARKET_TYPES: SpecificMarketType[] = ['SPOT', 'PERP', 'INVERSE'];

/** Public instrument-listing endpoints per exchange and market type. */
const INSTRUMENT_ENDPOINTS: Record<ExchangeId, Record<SpecificMarketType, string>> = {
  bybit: {
    SPOT: 'https://api.bybit.com/v5/market/instruments-info?category=spot&limit=1000',
    PERP: 'https://api.bybit.com/v5/market/instruments-info?category=linear&limit=1000',
    INVERSE: 'https://api.bybit.com/v5/market/instruments-info?category=inverse&limit=1000',
  },
  okx: {
    SPOT: 'https://www.okx.com/api/v5/public/instruments?instType=SPOT',
    PERP: 'https://www.okx.com/api/v5/public/instruments?instType=SWAP',
    INVERSE: 'https://www.okx.com/api/v5/public/instruments?instType=SWAP',
  },
  bitget: {
    SPOT: 'https://api.bitget.com/api/v2/spot/public/symbols',
    PERP: 'https://api.bitget.com/api/v2/mix/market/contracts?productType=USDT-FUTURES',
    INVERSE: 'https://api.bitget.com/api/v2/mix/market/contracts?productType=COIN-FUTURES',
  },
};

/** Creates an empty registry with every exchange/market bucket present. */
export function createEmptyRegistry(): SymbolRegistry {
  const buckets = (): Record<SpecificMarketType, SymbolEntry[]> => ({ SPOT: [], PERP: [], INVERSE: [] });
  return { bybit: buckets(), okx: buckets(), bitget: buckets() };
}

function normalizeBase(raw: string): string {
  return (raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

const QUOTE_SUFFIXES = ['USDT', 'USDC', 'USD', 'BTC', 'ETH', 'EUR', 'BRL', 'TRY'];

/** Derives the base asset, preferring the API `baseCoin` and falling back to stripping the quote suffix. */
function deriveBase(symbol: string, baseCoin?: string): string {
  if (baseCoin) {
    const fromApi = normalizeBase(baseCoin);
    if (fromApi) return fromApi;
  }
  const s = normalizeBase(symbol);
  for (const q of QUOTE_SUFFIXES) {
    if (s.length > q.length && s.endsWith(q)) return s.slice(0, -q.length);
  }
  return s;
}

/** Bybit symbolType enum: stock/xstocks → STOCK, commodity → COMMODITY. */
function bybitKind(symbolType?: string): AssetKind {
  const t = (symbolType || '').toLowerCase();
  if (t === 'stock' || t === 'xstocks') return 'STOCK';
  if (t === 'commodity') return 'COMMODITY';
  return 'CRYPTO';
}

/** OKX instCategory: 1 Crypto, 3 Stocks, 4 Commodities, 5 Forex, 6 Bonds. */
function okxKind(instCategory?: string): AssetKind {
  if (instCategory === '3') return 'STOCK';
  if (instCategory === '4') return 'COMMODITY';
  if (instCategory === '5' || instCategory === '6') return 'OTHER';
  return 'CRYPTO';
}

/** Bitget UTA symbolType: crypto/metal/stock/commodity (classic mix reports perpetual/delivery). */
function bitgetKind(symbolType?: string): AssetKind {
  switch ((symbolType || '').toLowerCase()) {
    case 'stock': return 'STOCK';
    case 'commodity': return 'COMMODITY';
    case 'metal': return 'METAL';
    default: return 'CRYPTO';
  }
}

/** Keeps one entry per base asset, preferring a specific kind over the CRYPTO default. */
function dedupeEntries(entries: Array<SymbolEntry | null>): SymbolEntry[] {
  const map = new Map<string, SymbolEntry>();
  for (const entry of entries) {
    if (!entry || !entry.symbol) continue;
    const current = map.get(entry.symbol);
    if (!current || (current.kind === 'CRYPTO' && entry.kind !== 'CRYPTO')) {
      map.set(entry.symbol, entry);
    }
  }
  return Array.from(map.values());
}

/** Pure parser for an instrument-listing payload (exported for unit tests). */
export function parseExchangeInstruments(
  exchange: ExchangeId,
  market: SpecificMarketType,
  payload: any
): SymbolEntry[] {
  if (!payload) return [];

  if (exchange === 'bybit') {
    const list = payload?.result?.list;
    if (!Array.isArray(list)) return [];
    return dedupeEntries(
      list.map((it: any) => {
        const symbol = normalizeBase(it?.baseCoin || '');
        return symbol ? { symbol, name: symbol, kind: bybitKind(it?.symbolType) } : null;
      })
    );
  }

  if (exchange === 'okx') {
    const data = payload?.data;
    if (!Array.isArray(data)) return [];
    return dedupeEntries(
      data.map((it: any) => {
        const instId = String(it?.instId || '');
        if (market === 'SPOT') {
          const symbol = normalizeBase(it?.baseCcy || '');
          return symbol ? { symbol, name: symbol, kind: okxKind(it?.instCategory) } : null;
        }
        if (market === 'PERP' && !instId.endsWith('-USDT-SWAP')) return null;
        if (market === 'INVERSE' && !instId.endsWith('-USD-SWAP')) return null;
        const symbol = normalizeBase(instId.split('-')[0] || '');
        return symbol ? { symbol, name: symbol, kind: okxKind(it?.instCategory) } : null;
      })
    );
  }

  // bitget
  const data = payload?.data;
  if (!Array.isArray(data)) return [];
  return dedupeEntries(
    data.map((it: any) => {
      const symbol = deriveBase(String(it?.symbol || ''), it?.baseCoin);
      return symbol ? { symbol, name: symbol, kind: bitgetKind(it?.symbolType) } : null;
    })
  );
}

/** Builds the reverse `symbol → availability` index from a registry (exported for unit tests). */
export function buildAvailabilityIndex(byExchange: SymbolRegistry): Map<string, SymbolAvailability> {
  const index = new Map<string, SymbolAvailability>();
  for (const ex of EXCHANGES) {
    for (const market of MARKET_TYPES) {
      for (const entry of byExchange?.[ex]?.[market] || []) {
        const current = index.get(entry.symbol);
        if (current) {
          if (!current.exchanges.includes(ex)) current.exchanges.push(ex);
          if (!current.markets.includes(market)) current.markets.push(market);
          if (current.kind === 'CRYPTO' && entry.kind !== 'CRYPTO') current.kind = entry.kind;
        } else {
          index.set(entry.symbol, {
            symbol: entry.symbol,
            name: entry.name || entry.symbol,
            kind: entry.kind,
            exchanges: [ex],
            markets: [market],
          });
        }
      }
    }
  }
  return index;
}

// Top coins catalog covering 120+ assets with verified availability across Bybit, OKX and Bitget
const SEED_CATALOG: CoinCatalogItem[] = [
  // Major & Layer 1
  { symbol: 'BTC', name: 'Bitcoin', category: 'Layer 1', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'INVERSE', 'SPOT'], isPopular: true },
  { symbol: 'ETH', name: 'Ethereum', category: 'Layer 1', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'INVERSE', 'SPOT'], isPopular: true },
  { symbol: 'SOL', name: 'Solana', category: 'Layer 1', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'INVERSE', 'SPOT'], isPopular: true },
  { symbol: 'BNB', name: 'BNB', category: 'Layer 1', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'], isPopular: true },
  { symbol: 'XRP', name: 'XRP', category: 'Layer 1', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'INVERSE', 'SPOT'], isPopular: true },
  { symbol: 'ADA', name: 'Cardano', category: 'Layer 1', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'INVERSE', 'SPOT'], isPopular: true },
  { symbol: 'AVAX', name: 'Avalanche', category: 'Layer 1', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'], isPopular: true },
  { symbol: 'SUI', name: 'Sui Network', category: 'Layer 1', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'], isPopular: true },
  { symbol: 'TON', name: 'Toncoin', category: 'Layer 1', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'], isPopular: true },
  { symbol: 'NEAR', name: 'Near Protocol', category: 'Layer 1', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'], isPopular: true },
  { symbol: 'DOT', name: 'Polkadot', category: 'Layer 1', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'INVERSE', 'SPOT'], isPopular: true },
  { symbol: 'APT', name: 'Aptos', category: 'Layer 1', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'], isPopular: true },
  { symbol: 'SEI', name: 'Sei Network', category: 'Layer 1', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'KAS', name: 'Kaspa', category: 'Layer 1', exchanges: ['bybit', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'TRX', name: 'Tron', category: 'Layer 1', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'ICP', name: 'Internet Computer', category: 'Layer 1', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'ATOM', name: 'Cosmos', category: 'Layer 1', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'HBAR', name: 'Hedera', category: 'Layer 1', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'ALGO', name: 'Algorand', category: 'Layer 1', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'EGLD', name: 'MultiversX', category: 'Layer 1', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'FLOW', name: 'Flow', category: 'Layer 1', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'FTM', name: 'Fantom / Sonic', category: 'Layer 1', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'KAVA', name: 'Kava', category: 'Layer 1', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'LTC', name: 'Litecoin', category: 'Layer 1', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'INVERSE', 'SPOT'] },
  { symbol: 'BCH', name: 'Bitcoin Cash', category: 'Layer 1', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'INVERSE', 'SPOT'] },
  { symbol: 'ETC', name: 'Ethereum Classic', category: 'Layer 1', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'XLM', name: 'Stellar Lumens', category: 'Layer 1', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'NEO', name: 'Neo', category: 'Layer 1', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'IOTA', name: 'IOTA', category: 'Layer 1', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'MINA', name: 'Mina Protocol', category: 'Layer 1', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },

  // Layer 2
  { symbol: 'ARB', name: 'Arbitrum', category: 'Layer 2', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'], isPopular: true },
  { symbol: 'OP', name: 'Optimism', category: 'Layer 2', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'], isPopular: true },
  { symbol: 'POL', name: 'Polygon', category: 'Layer 2', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'], isPopular: true },
  { symbol: 'MATIC', name: 'Polygon (Old)', category: 'Layer 2', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'STRK', name: 'Starknet', category: 'Layer 2', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'MNT', name: 'Mantle', category: 'Layer 2', exchanges: ['bybit'], markets: ['PERP', 'SPOT'] },
  { symbol: 'METIS', name: 'Metis', category: 'Layer 2', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'BLAST', name: 'Blast', category: 'Layer 2', exchanges: ['bybit', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'ZK', name: 'ZKsync', category: 'Layer 2', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'MANTA', name: 'Manta Network', category: 'Layer 2', exchanges: ['bybit', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'TIA', name: 'Celestia (DA)', category: 'Layer 2', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'], isPopular: true },

  // DeFi
  { symbol: 'AAVE', name: 'Aave', category: 'DeFi', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'], isPopular: true },
  { symbol: 'UNI', name: 'Uniswap', category: 'DeFi', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'], isPopular: true },
  { symbol: 'MKR', name: 'Maker', category: 'DeFi', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'PENDLE', name: 'Pendle', category: 'DeFi', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'], isPopular: true },
  { symbol: 'ONDO', name: 'Ondo Finance (RWA)', category: 'DeFi', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'], isPopular: true },
  { symbol: 'LDO', name: 'Lido DAO', category: 'DeFi', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'CRV', name: 'Curve DAO', category: 'DeFi', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'SNX', name: 'Synthetix', category: 'DeFi', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'DYDX', name: 'dYdX', category: 'DeFi', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'INJ', name: 'Injective', category: 'DeFi', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'], isPopular: true },
  { symbol: 'RUNE', name: 'THORChain', category: 'DeFi', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'JUP', name: 'Jupiter', category: 'DeFi', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'], isPopular: true },
  { symbol: 'RAY', name: 'Raydium', category: 'DeFi', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'ENA', name: 'Ethena', category: 'DeFi', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'], isPopular: true },
  { symbol: 'COMP', name: 'Compound', category: 'DeFi', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'SUSHI', name: 'SushiSwap', category: 'DeFi', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'CAKE', name: 'PancakeSwap', category: 'DeFi', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: '1INCH', name: '1inch Network', category: 'DeFi', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'GMX', name: 'GMX', category: 'DeFi', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'CVX', name: 'Convex Finance', category: 'DeFi', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },

  // Meme Coins
  { symbol: 'DOGE', name: 'Dogecoin', category: 'Meme', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'INVERSE', 'SPOT'], isPopular: true },
  { symbol: 'SHIB', name: 'Shiba Inu', category: 'Meme', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'], isPopular: true },
  { symbol: 'PEPE', name: 'Pepe', category: 'Meme', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'], isPopular: true },
  { symbol: 'WIF', name: 'dogwifhat', category: 'Meme', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'], isPopular: true },
  { symbol: 'BONK', name: 'Bonk', category: 'Meme', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'], isPopular: true },
  { symbol: 'FLOKI', name: 'Floki', category: 'Meme', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'BOME', name: 'Book of Meme', category: 'Meme', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'POPCAT', name: 'Popcat', category: 'Meme', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'BRETT', name: 'Brett (Based)', category: 'Meme', exchanges: ['bybit', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'MEW', name: 'cat in a dogs world', category: 'Meme', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'TURBO', name: 'Turbo', category: 'Meme', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'ORDI', name: 'Ordinals', category: 'Meme', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'SATS', name: '1000SATS', category: 'Meme', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'NEIRO', name: 'First Neiro', category: 'Meme', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },

  // AI & Data
  { symbol: 'TAO', name: 'Bittensor', category: 'AI & Data', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'], isPopular: true },
  { symbol: 'RENDER', name: 'Render Network', category: 'AI & Data', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'], isPopular: true },
  { symbol: 'FET', name: 'Artificial Superintelligence', category: 'AI & Data', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'], isPopular: true },
  { symbol: 'WLD', name: 'Worldcoin', category: 'AI & Data', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'], isPopular: true },
  { symbol: 'GRT', name: 'The Graph', category: 'AI & Data', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'AKT', name: 'Akash Network', category: 'AI & Data', exchanges: ['bybit', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'AR', name: 'Arweave', category: 'AI & Data', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'FIL', name: 'Filecoin', category: 'AI & Data', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'THETA', name: 'Theta Network', category: 'AI & Data', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'JASMY', name: 'JasmyCoin', category: 'AI & Data', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'GLM', name: 'Golem', category: 'AI & Data', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },

  // Infrastructure & Oracles
  { symbol: 'LINK', name: 'Chainlink', category: 'Infrastructure', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'], isPopular: true },
  { symbol: 'PYTH', name: 'Pyth Network', category: 'Infrastructure', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'BAND', name: 'Band Protocol', category: 'Infrastructure', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'UMA', name: 'UMA', category: 'Infrastructure', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'TRB', name: 'Tellor', category: 'Infrastructure', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'API3', name: 'API3', category: 'Infrastructure', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },

  // Gaming & Metaverse
  { symbol: 'GALA', name: 'Gala Games', category: 'Gaming', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'SAND', name: 'The Sandbox', category: 'Gaming', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'MANA', name: 'Decentraland', category: 'Gaming', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'AXS', name: 'Axie Infinity', category: 'Gaming', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'BEAM', name: 'Beam (Merit Circle)', category: 'Gaming', exchanges: ['bybit', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'RON', name: 'Ronin', category: 'Gaming', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'IMX', name: 'ImmutableX', category: 'Gaming', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'ENJ', name: 'Enjin Coin', category: 'Gaming', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'ILV', name: 'Illuvium', category: 'Gaming', exchanges: ['bybit', 'okx', 'bitget'], markets: ['PERP', 'SPOT'] },
  { symbol: 'PRIME', name: 'Echelon Prime', category: 'Gaming', exchanges: ['bybit', 'bitget'], markets: ['PERP', 'SPOT'] },
];

class ExchangeCoinCatalogService {
  private catalog: Map<string, CoinCatalogItem> = new Map();
  private isDynamicFetchDone = false;
  private isFetching = false;

  /** Symbol registry keyed by exchange → market → base assets. */
  private registry: SymbolRegistry = createEmptyRegistry();
  /** Reverse index `symbol → availability` derived from the registry. */
  private availabilityIndex: Map<string, SymbolAvailability> = new Map();
  private registryUpdatedAt: number | null = null;
  private staleExchanges: ExchangeId[] = [];
  private isRefreshing = false;

  constructor() {
    this.initCatalog();
    this.loadRegistry();
    this.rebuildIndex();
  }

  private initCatalog() {
    // 1. Load seed
    for (const item of SEED_CATALOG) {
      this.catalog.set(item.symbol.toUpperCase(), { ...item });
    }

    // 2. Attempt loading cached items from localStorage
    try {
      const saved = localStorage.getItem(STORAGE_CATALOG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.timestamp && Date.now() - parsed.timestamp < CACHE_TTL_MS && Array.isArray(parsed?.items)) {
          for (const item of parsed.items) {
            const existing = this.catalog.get(item.symbol);
            if (existing) {
              existing.exchanges = Array.from(new Set([...existing.exchanges, ...item.exchanges]));
            } else {
              this.catalog.set(item.symbol, item);
            }
          }
        }
      }
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Returns all coins currently in catalog
   */
  public getAllCoins(): CoinCatalogItem[] {
    return Array.from(this.catalog.values());
  }

  // ── Symbol registry (exchange × market) ────────────────────────────────

  /**
   * Fetches all instrument listings (3 exchanges × Spot/Perp/Inverse), merges them into the
   * registry and persists the result. On partial failure, the previous list of the affected
   * exchange is preserved and the exchange is flagged as stale.
   */
  public async refresh(): Promise<void> {
    if (this.isRefreshing) return;
    this.isRefreshing = true;

    try {
      // De-duplicate identical URLs within a cycle (OKX Spot/Perp/Inverse share one listing URL).
      const rawRequests = new Map<string, Promise<any>>();
      const fetchOnce = (url: string): Promise<any> => {
        if (!rawRequests.has(url)) {
          rawRequests.set(
            url,
            hybridFetch(url, 'GET', {}).catch((err) => {
              LogManager.warn('ExchangeCoinCatalog', `Instrument listing failed: ${url}`, err);
              return null;
            })
          );
        }
        return rawRequests.get(url)!;
      };

      const previous = this.registry;
      const next = createEmptyRegistry();
      const staleExchanges: ExchangeId[] = [];

      for (const exchange of EXCHANGES) {
        const results = await Promise.all(
          MARKET_TYPES.map(async (market) => {
            const payload = await fetchOnce(INSTRUMENT_ENDPOINTS[exchange][market]);
            return { market, entries: payload ? parseExchangeInstruments(exchange, market, payload) : null };
          })
        );

        let stale = false;
        for (const { market, entries } of results) {
          if (entries === null) {
            next[exchange][market] = previous[exchange][market];
            stale = true;
          } else {
            next[exchange][market] = entries;
          }
        }
        if (stale) staleExchanges.push(exchange);
      }

      this.registry = next;
      this.registryUpdatedAt = Date.now();
      this.staleExchanges = staleExchanges;
      this.rebuildIndex();
      this.persistRegistry();
    } catch (err) {
      LogManager.warn('ExchangeCoinCatalog', 'Symbol registry refresh failed', err);
    } finally {
      this.isRefreshing = false;
    }
  }

  /** Reverse index lookup for a base asset; `null` when the symbol was not discovered. */
  public getAvailability(symbol: string): SymbolAvailability | null {
    return this.availabilityIndex.get(normalizeBase(symbol)) || null;
  }

  /** All discovered symbols with their exchange/market availability. */
  public getAllAvailability(): SymbolAvailability[] {
    return Array.from(this.availabilityIndex.values());
  }

  /** Symbols listed by a given exchange for a given market type. */
  public getSymbolsFor(exchange: ExchangeId, market: SpecificMarketType): SymbolEntry[] {
    return this.registry[exchange]?.[market] || [];
  }

  /** Timestamp of the last successful registry refresh, or `null` if never fetched. */
  public getRegistryUpdatedAt(): number | null {
    return this.registryUpdatedAt;
  }

  /** Exchanges whose latest refresh partially failed (their previous lists were kept). */
  public getStaleExchanges(): ExchangeId[] {
    return [...this.staleExchanges];
  }

  /** True when the registry has never been fetched or is older than `hours`. */
  public isStale(hours: number): boolean {
    if (!this.registryUpdatedAt) return true;
    return Date.now() - this.registryUpdatedAt > hours * 60 * 60 * 1000;
  }

  /** True when at least one symbol has been indexed. */
  public hasRegistry(): boolean {
    return this.availabilityIndex.size > 0;
  }

  /** Wipes the persisted registry and re-fetches everything from the exchanges. */
  public async clearAndSync(): Promise<void> {
    this.registry = createEmptyRegistry();
    this.availabilityIndex = new Map();
    this.registryUpdatedAt = null;
    this.staleExchanges = [];
    try {
      localStorage.removeItem(STORAGE_REGISTRY_KEY);
    } catch {
      // Ignore storage errors
    }
    await this.refresh();
  }

  private loadRegistry(): void {
    try {
      const saved = localStorage.getItem(STORAGE_REGISTRY_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      const byExchange = parsed?.byExchange;
      if (!byExchange) return;

      const next = createEmptyRegistry();
      let hasAny = false;
      for (const exchange of EXCHANGES) {
        for (const market of MARKET_TYPES) {
          const list = byExchange?.[exchange]?.[market];
          if (Array.isArray(list)) {
            next[exchange][market] = list.filter(
              (entry: any) => entry && typeof entry.symbol === 'string'
            );
            if (next[exchange][market].length) hasAny = true;
          }
        }
      }
      if (!hasAny) return;

      this.registry = next;
      this.registryUpdatedAt = typeof parsed?.updatedAt === 'number' ? parsed.updatedAt : null;
      this.staleExchanges = Array.isArray(parsed?.staleExchanges) ? parsed.staleExchanges : [];
    } catch {
      // Ignore storage errors
    }
  }

  private persistRegistry(): void {
    try {
      localStorage.setItem(
        STORAGE_REGISTRY_KEY,
        JSON.stringify({
          updatedAt: this.registryUpdatedAt,
          staleExchanges: this.staleExchanges,
          byExchange: this.registry,
        })
      );
    } catch {
      // Ignore storage errors
    }
  }

  private rebuildIndex(): void {
    this.availabilityIndex = buildAvailabilityIndex(this.registry);
  }

  /**
   * Search coins matching query, category and exchange filters
   */
  public searchCoins(options: {
    query?: string;
    category?: string;
    exchange?: ExchangeId | 'ALL';
    favorites?: string[];
  }): {
    results: CoinCatalogItem[];
    customOption: CoinCatalogItem | null;
  } {
    const { query = '', category = 'ALL', exchange = 'ALL', favorites = [] } = options;
    const cleanQuery = query.trim().toUpperCase().replace(/USDT$|USD$|-SWAP$/, '');

    // Merge static catalog items with any symbols discovered in the live registry
    const registeredExtra: CoinCatalogItem[] = [];
    for (const [sym, av] of this.availabilityIndex.entries()) {
      if (!this.catalog.has(sym)) {
        registeredExtra.push({
          symbol: av.symbol,
          name: av.name || av.symbol,
          category: (av.kind === 'CRYPTO' ? 'Others' : av.kind) as CoinCategory,
          exchanges: av.exchanges,
          markets: av.markets,
          kind: av.kind,
        });
      }
    }
    let list: CoinCatalogItem[] = [...Array.from(this.catalog.values()), ...registeredExtra];

    // Category / Kind filter
    if (category === 'FAVORITES') {
      list = list.filter((item) => favorites.includes(item.symbol));
    } else if (category === 'POPULAR') {
      list = list.filter((item) => item.isPopular);
    } else if (category === 'CRYPTO') {
      list = list.filter((item) => (this.availabilityIndex.get(item.symbol)?.kind || item.kind || 'CRYPTO') === 'CRYPTO');
    } else if (category === 'STOCK') {
      list = list.filter((item) => (this.availabilityIndex.get(item.symbol)?.kind || item.kind) === 'STOCK');
    } else if (category === 'COMMODITY') {
      list = list.filter((item) => (this.availabilityIndex.get(item.symbol)?.kind || item.kind) === 'COMMODITY');
    } else if (category === 'METAL') {
      list = list.filter((item) => (this.availabilityIndex.get(item.symbol)?.kind || item.kind) === 'METAL');
    } else if (category === 'TRADFI') {
      list = list.filter((item) => {
        const k = this.availabilityIndex.get(item.symbol)?.kind || item.kind;
        return k === 'STOCK' || k === 'COMMODITY' || k === 'METAL';
      });
    } else if (category !== 'ALL') {
      list = list.filter((item) => item.category === category);
    }

    // Exchange filter — prefers live registry availability over the static seed
    if (exchange !== 'ALL') {
      list = list.filter((item) => this.effectiveAvailability(item).exchanges.includes(exchange));
    }

    // Text search query
    if (cleanQuery) {
      list = list.filter(
        (item) =>
          item.symbol.includes(cleanQuery) ||
          item.name.toUpperCase().includes(cleanQuery)
      );
    }

    // Sort: exact matches first, then popular, then alphabetically
    list.sort((a, b) => {
      if (a.symbol === cleanQuery) return -1;
      if (b.symbol === cleanQuery) return 1;
      if (a.symbol.startsWith(cleanQuery) && !b.symbol.startsWith(cleanQuery)) return -1;
      if (!a.symbol.startsWith(cleanQuery) && b.symbol.startsWith(cleanQuery)) return 1;
      if (a.isPopular && !b.isPopular) return -1;
      if (!a.isPopular && b.isPopular) return 1;
      return a.symbol.localeCompare(b.symbol);
    });

    // If user searched for something not in current results, provide a custom ticker option
    let customOption: CoinCatalogItem | null = null;
    const exactExists = this.catalog.has(cleanQuery) || this.availabilityIndex.has(cleanQuery);
    if (cleanQuery && !exactExists && cleanQuery.length >= 2 && cleanQuery.length <= 12) {
      customOption = {
        symbol: cleanQuery,
        name: `${cleanQuery} (Custom Ticker)`,
        category: 'Others',
        exchanges: ['bybit', 'okx', 'bitget'],
        markets: ['PERP', 'SPOT'],
        kind: 'OTHER',
      };
    }

    return {
      results: list.map((item) => {
        const av = this.availabilityIndex.get(item.symbol);
        return av
          ? { ...item, exchanges: av.exchanges, markets: av.markets, kind: av.kind }
          : { ...item, kind: item.kind || 'CRYPTO' };
      }),
      customOption,
    };
  }

  /**
   * Effective availability: live registry when the symbol was discovered, otherwise the static seed.
   */
  private effectiveAvailability(item: CoinCatalogItem): { exchanges: ExchangeId[]; markets: MarketType[] } {
    const av = this.availabilityIndex.get(item.symbol);
    return av ? { exchanges: av.exchanges, markets: av.markets } : { exchanges: item.exchanges, markets: item.markets };
  }

  /**
   * Fetch live instruments in background across Bybit, OKX, and Bitget
   */
  public async loadLiveExchanges(): Promise<void> {
    if (this.isDynamicFetchDone || this.isFetching) return;
    this.isFetching = true;

    try {
      // Parallel fetch tickers to discover all live pairs without locking UI
      const [bybitRes, okxRes, bitgetRes] = await Promise.allSettled([
        hybridFetch('https://api.bybit.com/v5/market/tickers?category=linear', 'GET', {}),
        hybridFetch('https://www.okx.com/api/v5/market/tickers?instType=SWAP', 'GET', {}),
        hybridFetch('https://api.bitget.com/api/v3/market/tickers?category=USDT-FUTURES', 'GET', {}),
      ]);

      // Process Bybit
      if (bybitRes.status === 'fulfilled' && bybitRes.value?.result?.list) {
        for (const item of bybitRes.value.result.list) {
          const rawSym: string = item.symbol || '';
          if (rawSym.endsWith('USDT')) {
            const sym = rawSym.replace(/USDT$/, '').replace(/^1000/, '');
            if (sym && sym.length >= 2) {
              this.addOrUpdateCoin(sym, 'bybit', 'PERP');
            }
          }
        }
      }

      // Process OKX
      if (okxRes.status === 'fulfilled' && okxRes.value?.data) {
        for (const item of okxRes.value.data) {
          const instId: string = item.instId || '';
          if (instId.includes('-USDT-SWAP')) {
            const sym = instId.split('-')[0];
            if (sym && sym.length >= 2) {
              this.addOrUpdateCoin(sym, 'okx', 'PERP');
            }
          }
        }
      }

      // Process Bitget
      if (bitgetRes.status === 'fulfilled' && bitgetRes.value?.data) {
        for (const item of bitgetRes.value.data) {
          const rawSym: string = item.symbol || '';
          if (rawSym.endsWith('USDT')) {
            const sym = rawSym.replace(/USDT$/, '');
            if (sym && sym.length >= 2) {
              this.addOrUpdateCoin(sym, 'bitget', 'PERP');
            }
          }
        }
      }

      this.isDynamicFetchDone = true;
      this.persistCatalog();
    } catch (err) {
      LogManager.warn('ExchangeCoinCatalog', 'Background live instruments discovery had an error', err);
    } finally {
      this.isFetching = false;
    }
  }

  private addOrUpdateCoin(symbol: string, exchange: ExchangeId, market: MarketType) {
    const cleanSym = symbol.toUpperCase().trim();
    if (!cleanSym || cleanSym.length < 2 || cleanSym.length > 12) return;

    const existing = this.catalog.get(cleanSym);
    if (existing) {
      if (!existing.exchanges.includes(exchange)) {
        existing.exchanges.push(exchange);
      }
      if (!existing.markets.includes(market)) {
        existing.markets.push(market);
      }
    } else {
      this.catalog.set(cleanSym, {
        symbol: cleanSym,
        name: cleanSym,
        category: 'Others',
        exchanges: [exchange],
        markets: [market],
      });
    }
  }

  private persistCatalog() {
    try {
      const items = Array.from(this.catalog.values());
      localStorage.setItem(
        STORAGE_CATALOG_KEY,
        JSON.stringify({
          timestamp: Date.now(),
          items,
        })
      );
    } catch {
      // Ignore
    }
  }
}

export const exchangeCoinCatalog = new ExchangeCoinCatalogService();
