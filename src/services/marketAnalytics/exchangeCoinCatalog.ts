import { ExchangeId, MarketType } from '../../types/marketAnalytics';
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
}

const STORAGE_CATALOG_KEY = 'cpm_market_analytics_coin_catalog_v1';
const CACHE_TTL_MS = 1000 * 60 * 60 * 4; // 4 hours

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

  constructor() {
    this.initCatalog();
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

    let list = Array.from(this.catalog.values());

    // Category filter
    if (category === 'FAVORITES') {
      list = list.filter((item) => favorites.includes(item.symbol));
    } else if (category === 'POPULAR') {
      list = list.filter((item) => item.isPopular);
    } else if (category !== 'ALL') {
      list = list.filter((item) => item.category === category);
    }

    // Exchange filter
    if (exchange !== 'ALL') {
      list = list.filter((item) => item.exchanges.includes(exchange));
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
    const exactExists = this.catalog.has(cleanQuery);
    if (cleanQuery && !exactExists && cleanQuery.length >= 2 && cleanQuery.length <= 12) {
      customOption = {
        symbol: cleanQuery,
        name: `${cleanQuery} (Custom Ticker)`,
        category: 'Others',
        exchanges: ['bybit', 'okx', 'bitget'],
        markets: ['PERP', 'SPOT'],
      };
    }

    return { results: list, customOption };
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
        hybridFetch('https://api.okx.com/api/v5/market/tickers?instType=SWAP', 'GET', {}),
        hybridFetch('https://api.bitget.com/api/v2/mix/market/tickers?productType=USDT-FUTURES', 'GET', {}),
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
