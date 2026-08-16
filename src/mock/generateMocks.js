import fs from 'fs';
import path from 'path';

/**
 * Realistic Mock Data Generator for CriptoDashboard
 * Covers all features:
 *  - Dashboard & WorkSpace: realistic macro equity, asset allocation treemaps, cross-exchange summaries
 *  - Hedge Pro Dashboard: precise same-coin balance matching, inverse short hedges (100% and 50%),
 *    unhedged/overexposed longs, realistic entry/mark prices and contract notionals
 *  - Open Positions: PERP, INVERSE, SPOT, FUTURES, OPTION positions with accurate ROE, margin, liquidation
 *  - Closed Positions: 300+ trades spanning today, 7d, 14d, 30d, 90d, 180d, 365d with ~60% win rate
 *  - Order Reports & Trade History: open orders (NEW, PARTIALLY_FILLED) & closed orders (FILLED, CANCELLED)
 *  - Funding Fees Dashboard: realistic 8h, daily, monthly, 3M, 6M, 1Y rates across exchanges and coins
 *  - Bybit Transactions: TRADE, SETTLEMENT, TRANSFER, FEE logs with currency breakdowns
 *  - Bills History: deposit and withdrawal records over time
 */

const exchanges = ['bybit', 'bitget', 'okx'];
const ACCOUNTS_PER_EXCHANGE = 3;

// Base market price references
const PRICE_MAP = {
  BTC: 68450.0,
  ETH: 3420.0,
  SOL: 182.5,
  LINK: 18.4,
  AVAX: 32.8,
  DOGE: 0.158,
  XRP: 0.625,
  USDT: 1.0,
  USDC: 1.0
};

// Symbol definitions and configurations
const SYMBOL_CONFIGS = [
  { symbol: 'BTCUSDT', baseCoin: 'BTC', quoteCoin: 'USDT', ccy: 'USDT', instType: 'PERP', perpType: 'USDT-M', price: 68450.0 },
  { symbol: 'ETHUSDT', baseCoin: 'ETH', quoteCoin: 'USDT', ccy: 'USDT', instType: 'PERP', perpType: 'USDT-M', price: 3420.0 },
  { symbol: 'SOLUSDT', baseCoin: 'SOL', quoteCoin: 'USDT', ccy: 'USDT', instType: 'PERP', perpType: 'USDT-M', price: 182.5 },
  { symbol: 'LINKUSDT', baseCoin: 'LINK', quoteCoin: 'USDT', ccy: 'USDT', instType: 'PERP', perpType: 'USDT-M', price: 18.4 },
  { symbol: 'AVAXUSDT', baseCoin: 'AVAX', quoteCoin: 'USDT', ccy: 'USDT', instType: 'PERP', perpType: 'USDT-M', price: 32.8 },
  { symbol: 'DOGEUSDT', baseCoin: 'DOGE', quoteCoin: 'USDT', ccy: 'USDT', instType: 'PERP', perpType: 'USDT-M', price: 0.158 },
  { symbol: 'XRPUSDT', baseCoin: 'XRP', quoteCoin: 'USDT', ccy: 'USDT', instType: 'PERP', perpType: 'USDT-M', price: 0.625 },
  { symbol: 'BTCUSD', baseCoin: 'BTC', quoteCoin: 'USD', ccy: 'BTC', instType: 'INVERSE', perpType: 'COIN-M', price: 68450.0 },
  { symbol: 'ETHUSD', baseCoin: 'ETH', quoteCoin: 'USD', ccy: 'ETH', instType: 'INVERSE', perpType: 'COIN-M', price: 3420.0 },
  { symbol: 'SOLUSD', baseCoin: 'SOL', quoteCoin: 'USD', ccy: 'SOL', instType: 'INVERSE', perpType: 'COIN-M', price: 182.5 },
  { symbol: 'LINKUSD', baseCoin: 'LINK', quoteCoin: 'USD', ccy: 'LINK', instType: 'INVERSE', perpType: 'COIN-M', price: 18.4 },
  { symbol: 'BTCUSDC', baseCoin: 'BTC', quoteCoin: 'USDC', ccy: 'USDC', instType: 'PERP', perpType: 'USDC-M', price: 68450.0 },
  { symbol: 'ETHUSDC', baseCoin: 'ETH', quoteCoin: 'USDC', ccy: 'USDC', instType: 'PERP', perpType: 'USDC-M', price: 3420.0 },
  { symbol: 'SOLUSDC', baseCoin: 'SOL', quoteCoin: 'USDC', ccy: 'USDC', instType: 'PERP', perpType: 'USDC-M', price: 182.5 }
];

const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomNum = (min, max) => min + Math.random() * (max - min);
const randomInt = (min, max) => Math.floor(randomNum(min, max));
const round = (num, decimals = 4) => {
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
};

function generate() {
  const accounts = [];
  const balances = [];
  const positions = [];
  const history = [];
  const orders = [];
  const fundingSummaries = [];
  const bybitTransactions = [];
  const bills = [];

  let posIdCounter = 1;
  let histIdCounter = 1;
  let orderIdCounter = 1;
  let billIdCounter = 1;
  let txIdCounter = 1;

  // Build 9 accounts across 3 exchanges
  exchanges.forEach(exchange => {
    for (let i = 1; i <= ACCOUNTS_PER_EXCHANGE; i++) {
      const connectionId = `mocked-data-${exchange}-${i}`;
      const label = `Mock ${exchange.toUpperCase()} ${i}`;
      accounts.push({ connectionId, exchange, label });
    }
  });

  // 1. GENERATE BALANCES
  // Specific allocation per account to ensure diverse portfolio analytics and exact Hedge Pro scenarios
  const accountBalanceProfiles = {
    'mocked-data-bybit-1': { USDT: 25000, USDC: 5000, BTC: 1.0, ETH: 3.5, SOL: 25.0, LINK: 200.0 }, // 100% BTC hedge demo
    'mocked-data-bybit-2': { USDT: 42000, USDC: 12000, BTC: 0.65, ETH: 6.0, SOL: 60.0, LINK: 450.0 },
    'mocked-data-bybit-3': { USDT: 15000, USDC: 2000, BTC: 0.35, ETH: 2.0, SOL: 30.0, LINK: 150.0 },
    'mocked-data-bitget-1': { USDT: 18000, USDC: 4000, BTC: 0.5, ETH: 4.0, SOL: 45.0, LINK: 300.0 }, // 50% ETH hedge demo
    'mocked-data-bitget-2': { USDT: 32000, USDC: 8000, BTC: 0.8, ETH: 5.5, SOL: 70.0, LINK: 500.0 },
    'mocked-data-bitget-3': { USDT: 12000, USDC: 3000, BTC: 0.25, ETH: 1.5, SOL: 20.0, LINK: 100.0 },
    'mocked-data-okx-1': { USDT: 28000, USDC: 6000, BTC: 0.5, ETH: 3.0, SOL: 40.0, LINK: 250.0 }, // SOL long overexposed demo + BTC 50% hedge
    'mocked-data-okx-2': { USDT: 50000, USDC: 15000, BTC: 1.2, ETH: 8.0, SOL: 85.0, LINK: 600.0 },
    'mocked-data-okx-3': { USDT: 16000, USDC: 3500, BTC: 0.3, ETH: 2.5, SOL: 35.0, LINK: 180.0 }
  };

  accounts.forEach(acc => {
    const profile = accountBalanceProfiles[acc.connectionId] || { USDT: 20000, USDC: 5000, BTC: 0.5, ETH: 3.0, SOL: 30.0, LINK: 200.0 };
    Object.entries(profile).forEach(([ccy, amount]) => {
      const price = PRICE_MAP[ccy] || 1.0;
      const usdValue = round(amount * price, 2);
      balances.push({
        id: `${acc.connectionId}-${ccy}`,
        connectionId: acc.connectionId,
        exchange: acc.exchange,
        label: acc.label,
        ccy,
        amount: round(amount, 6),
        usdValue,
        walletBalance: round(amount, 6),
        totalEquity: usdValue,
        availableMargin: round(usdValue * 0.85, 2),
        unrealizedPnl: 0,
        raw: { mockData: true, ccy, equity: usdValue }
      });
    });
  });

  // 2. GENERATE OPEN POSITIONS
  // Designated showcase positions for Hedge Pro
  // Bybit 1: 100% BTC hedge (1.0 BTC balance @ 68,450 => Short $68,450 on BTCUSD)
  positions.push({
    id: `pos-${posIdCounter++}`,
    connectionId: 'mocked-data-bybit-1',
    exchange: 'bybit',
    label: 'Mock BYBIT 1',
    symbol: 'BTCUSD',
    baseCoin: 'BTC',
    quoteCoin: 'USD',
    ccy: 'BTC',
    side: 'short',
    size: 68450, // 68,450 contracts = $68,450 USD
    notionalUsd: 68450,
    entryPrice: 68000,
    markPrice: 68450,
    unrealizedPnl: round(68450 * (1 / 68450 - 1 / 68000), 6), // in BTC
    realizedPnl: 0.0012,
    closedPnl: 0.001,
    leverage: 10,
    marginMode: 'cross',
    positionMode: 'hedge',
    margin: round(68450 / (68450 * 10), 4), // 0.10 BTC margin
    maintenanceMargin: round(68450 * 0.005 / 68450, 6),
    marginRatio: 0.5,
    liquidationPrice: 74800,
    breakEvenPrice: 67950,
    roe: -0.66,
    tp: 62000,
    sl: 73000,
    instrumentType: 'INVERSE',
    accumulatedFunding: '0.00045',
    accumulatedTradingFee: '-0.00015',
    raw: { mockData: true, instType: 'inverse' }
  });

  // Bybit 1: Additional PERP position
  positions.push({
    id: `pos-${posIdCounter++}`,
    connectionId: 'mocked-data-bybit-1',
    exchange: 'bybit',
    label: 'Mock BYBIT 1',
    symbol: 'ETHUSDT',
    baseCoin: 'ETH',
    quoteCoin: 'USDT',
    ccy: 'USDT',
    side: 'long',
    size: 5.0,
    notionalUsd: round(5.0 * 3420.0, 2),
    entryPrice: 3350.0,
    markPrice: 3420.0,
    unrealizedPnl: round((3420.0 - 3350.0) * 5.0, 2), // +$350
    realizedPnl: 12.5,
    closedPnl: 10.0,
    leverage: 10,
    marginMode: 'cross',
    positionMode: 'one_way',
    margin: round((3420.0 * 5.0) / 10, 2),
    maintenanceMargin: round(3420.0 * 5.0 * 0.01, 2),
    marginRatio: 1.0,
    liquidationPrice: 3045.0,
    breakEvenPrice: 3352.0,
    roe: round((350.0 / 1710.0) * 100, 2),
    tp: 3600.0,
    sl: 3200.0,
    instrumentType: 'PERP',
    accumulatedFunding: '2.40',
    accumulatedTradingFee: '-1.85',
    raw: { mockData: true, instType: 'linear' }
  });

  // Bitget 1: 50% ETH hedge (4.0 ETH balance => Short 2.0 ETH @ 3,420 => $6,840 protected)
  positions.push({
    id: `pos-${posIdCounter++}`,
    connectionId: 'mocked-data-bitget-1',
    exchange: 'bitget',
    label: 'Mock BITGET 1',
    symbol: 'ETHUSD',
    baseCoin: 'ETH',
    quoteCoin: 'USD',
    ccy: 'ETH',
    side: 'short',
    size: 2.0, // 2.0 ETH in Bitget coin-m
    notionalUsd: round(2.0 * 3420.0, 2),
    entryPrice: 3400.0,
    markPrice: 3420.0,
    unrealizedPnl: round(2.0 * (3400.0 - 3420.0) / 3420.0, 6), // in ETH
    realizedPnl: 0.005,
    closedPnl: 0.004,
    leverage: 5,
    marginMode: 'cross',
    positionMode: 'hedge',
    margin: round(2.0 / 5, 4), // 0.4 ETH
    maintenanceMargin: 0.02,
    marginRatio: 1.0,
    liquidationPrice: 4080.0,
    breakEvenPrice: 3395.0,
    roe: -1.47,
    tp: 3100.0,
    sl: 3700.0,
    instrumentType: 'INVERSE',
    accumulatedFunding: '0.0012',
    accumulatedTradingFee: '-0.0008',
    raw: { mockData: true, instType: 'COIN-FUTURES' }
  });

  // Bitget 1: Additional SOL PERP
  positions.push({
    id: `pos-${posIdCounter++}`,
    connectionId: 'mocked-data-bitget-1',
    exchange: 'bitget',
    label: 'Mock BITGET 1',
    symbol: 'SOLUSDT',
    baseCoin: 'SOL',
    quoteCoin: 'USDT',
    ccy: 'USDT',
    side: 'long',
    size: 40.0,
    notionalUsd: round(40.0 * 182.5, 2),
    entryPrice: 176.0,
    markPrice: 182.5,
    unrealizedPnl: round((182.5 - 176.0) * 40.0, 2), // +$260
    realizedPnl: 8.0,
    closedPnl: 6.5,
    leverage: 10,
    marginMode: 'isolated',
    positionMode: 'one_way',
    margin: round((182.5 * 40.0) / 10, 2),
    maintenanceMargin: round(182.5 * 40.0 * 0.015, 2),
    marginRatio: 1.5,
    liquidationPrice: 160.0,
    breakEvenPrice: 176.2,
    roe: round((260.0 / 730.0) * 100, 2),
    tp: 200.0,
    sl: 168.0,
    instrumentType: 'PERP',
    accumulatedFunding: '1.20',
    accumulatedTradingFee: '-0.95',
    raw: { mockData: true, instType: 'USDT-FUTURES' }
  });

  // OKX 1: Unhedged / Leveraged SOL Long (40 SOL balance => Long $7,300 on SOLUSD => Overexposed!)
  positions.push({
    id: `pos-${posIdCounter++}`,
    connectionId: 'mocked-data-okx-1',
    exchange: 'okx',
    label: 'Mock OKX 1',
    symbol: 'SOLUSD',
    baseCoin: 'SOL',
    quoteCoin: 'USD',
    ccy: 'SOL',
    side: 'long',
    size: 7300, // $7,300 contracts
    notionalUsd: 7300,
    entryPrice: 178.0,
    markPrice: 182.5,
    unrealizedPnl: round(7300 * (1 / 178.0 - 1 / 182.5), 6), // in SOL
    realizedPnl: 0.15,
    closedPnl: 0.12,
    leverage: 5,
    marginMode: 'cross',
    positionMode: 'hedge',
    margin: round(7300 / (182.5 * 5), 4), // ~8 SOL margin
    maintenanceMargin: 0.4,
    marginRatio: 1.2,
    liquidationPrice: 145.0,
    breakEvenPrice: 178.3,
    roe: 6.32,
    tp: 210.0,
    sl: 165.0,
    instrumentType: 'INVERSE',
    accumulatedFunding: '0.045',
    accumulatedTradingFee: '-0.025',
    raw: { mockData: true, instType: 'SWAP' }
  });

  // OKX 1: 50% BTC Hedge (0.5 BTC balance @ 68,450 => Short $17,112.5 on BTCUSD)
  positions.push({
    id: `pos-${posIdCounter++}`,
    connectionId: 'mocked-data-okx-1',
    exchange: 'okx',
    label: 'Mock OKX 1',
    symbol: 'BTCUSD',
    baseCoin: 'BTC',
    quoteCoin: 'USD',
    ccy: 'BTC',
    side: 'short',
    size: 17112,
    notionalUsd: 17112,
    entryPrice: 68800,
    markPrice: 68450,
    unrealizedPnl: round(17112 * (1 / 68450 - 1 / 68800), 6), // in BTC
    realizedPnl: 0.002,
    closedPnl: 0.0018,
    leverage: 10,
    marginMode: 'cross',
    positionMode: 'hedge',
    margin: round(17112 / (68450 * 10), 4),
    maintenanceMargin: 0.0015,
    marginRatio: 0.6,
    liquidationPrice: 75200,
    breakEvenPrice: 68750,
    roe: 2.54,
    tp: 63000,
    sl: 72000,
    instrumentType: 'INVERSE',
    accumulatedFunding: '0.0002',
    accumulatedTradingFee: '-0.0001',
    raw: { mockData: true, instType: 'SWAP' }
  });

  // Additional realistic positions across all accounts
  const openPositionsPool = [
    { symbol: 'BTCUSDT', side: 'long', sizeRange: [0.2, 1.5], lev: 20 },
    { symbol: 'BTCUSDT', side: 'short', sizeRange: [0.1, 0.8], lev: 15 },
    { symbol: 'ETHUSDT', side: 'long', sizeRange: [3.0, 15.0], lev: 10 },
    { symbol: 'ETHUSDT', side: 'short', sizeRange: [2.0, 10.0], lev: 10 },
    { symbol: 'SOLUSDT', side: 'long', sizeRange: [25.0, 120.0], lev: 10 },
    { symbol: 'SOLUSDT', side: 'short', sizeRange: [15.0, 80.0], lev: 10 },
    { symbol: 'LINKUSDT', side: 'long', sizeRange: [150.0, 800.0], lev: 5 },
    { symbol: 'AVAXUSDT', side: 'long', sizeRange: [80.0, 400.0], lev: 5 },
    { symbol: 'DOGEUSDT', side: 'long', sizeRange: [10000, 50000], lev: 10 },
    { symbol: 'XRPUSDT', side: 'short', sizeRange: [2000, 10000], lev: 10 },
    { symbol: 'BTCUSD', side: 'short', sizeRange: [10000, 40000], lev: 10 }, // INVERSE
    { symbol: 'ETHUSD', side: 'short', sizeRange: [5000, 20000], lev: 10 },  // INVERSE
    { symbol: 'LINKUSD', side: 'short', sizeRange: [2000, 8000], lev: 5 },   // INVERSE
    { symbol: 'BTCUSDC', side: 'long', sizeRange: [0.1, 0.5], lev: 10 },
    { symbol: 'ETHUSDC', side: 'long', sizeRange: [1.0, 5.0], lev: 10 }
  ];

  accounts.forEach(acc => {
    const numPositions = randomInt(4, 8);
    for (let j = 0; j < numPositions; j++) {
      const template = randomItem(openPositionsPool);
      const conf = SYMBOL_CONFIGS.find(s => s.symbol === template.symbol) || SYMBOL_CONFIGS[0];
      const basePrice = conf.price;
      const priceVariation = randomNum(0.97, 1.03);
      const entryPrice = round(basePrice * priceVariation, conf.price < 1 ? 4 : 2);
      const markPrice = basePrice;
      const side = template.side;
      const leverage = template.lev;
      
      const rawSize = randomNum(template.sizeRange[0], template.sizeRange[1]);
      const size = conf.price < 1 ? Math.round(rawSize) : round(rawSize, conf.price > 1000 ? 3 : 2);
      
      let notionalUsd = 0;
      let unrealizedPnl = 0;
      let margin = 0;

      if (conf.instType === 'INVERSE') {
        // Size is in USD contracts (Bybit/OKX) or coin (Bitget)
        if (acc.exchange === 'bitget') {
          const coinSize = round(rawSize / basePrice, 4);
          notionalUsd = round(coinSize * markPrice, 2);
          margin = round(coinSize / leverage, 4);
          unrealizedPnl = side === 'long' 
            ? round(coinSize * (markPrice - entryPrice) / markPrice, 6)
            : round(coinSize * (entryPrice - markPrice) / markPrice, 6);
        } else {
          notionalUsd = Math.round(rawSize);
          margin = round(notionalUsd / (markPrice * leverage), 6);
          unrealizedPnl = side === 'long'
            ? round(notionalUsd * (1 / entryPrice - 1 / markPrice), 6)
            : round(notionalUsd * (1 / markPrice - 1 / entryPrice), 6);
        }
      } else {
        notionalUsd = round(size * markPrice, 2);
        margin = round(notionalUsd / leverage, 2);
        unrealizedPnl = side === 'long'
          ? round((markPrice - entryPrice) * size, 2)
          : round((entryPrice - markPrice) * size, 2);
      }

      const pnlUsd = conf.instType === 'INVERSE' ? unrealizedPnl * markPrice : unrealizedPnl;
      const marginUsd = conf.instType === 'INVERSE' ? margin * markPrice : margin;
      const roe = marginUsd > 0 ? round((pnlUsd / marginUsd) * 100, 2) : 0;

      const liqMultiplier = side === 'long' ? (1 - 0.9 / leverage) : (1 + 0.9 / leverage);
      const liquidationPrice = round(entryPrice * liqMultiplier, conf.price < 1 ? 4 : 2);
      const breakEvenPrice = round(entryPrice * (side === 'long' ? 1.0006 : 0.9994), conf.price < 1 ? 4 : 2);

      let rawInstType = 'USDT-FUTURES';
      if (acc.exchange === 'bitget') rawInstType = conf.instType === 'INVERSE' ? 'COIN-FUTURES' : 'USDT-FUTURES';
      else if (acc.exchange === 'okx') rawInstType = conf.instType === 'INVERSE' ? 'SWAP' : 'MARGIN';
      else if (acc.exchange === 'bybit') rawInstType = conf.instType === 'INVERSE' ? 'inverse' : 'linear';

      positions.push({
        id: `pos-${posIdCounter++}`,
        connectionId: acc.connectionId,
        exchange: acc.exchange,
        label: acc.label,
        symbol: conf.symbol,
        baseCoin: conf.baseCoin,
        quoteCoin: conf.quoteCoin,
        ccy: conf.ccy,
        side,
        size,
        notionalUsd,
        entryPrice,
        markPrice,
        unrealizedPnl,
        realizedPnl: round(randomNum(-10, 40), 2),
        closedPnl: round(randomNum(-12, 38), 2),
        leverage,
        marginMode: randomItem(['cross', 'isolated']),
        positionMode: randomItem(['hedge', 'one_way']),
        margin,
        maintenanceMargin: round(margin * 0.1, 4),
        marginRatio: round(randomNum(0.5, 3.5), 2),
        liquidationPrice,
        breakEvenPrice,
        roe,
        tp: side === 'long' ? round(entryPrice * 1.15, 2) : round(entryPrice * 0.85, 2),
        sl: side === 'long' ? round(entryPrice * 0.92, 2) : round(entryPrice * 1.08, 2),
        instrumentType: conf.instType,
        accumulatedFunding: round(randomNum(-2, 5), 4).toString(),
        accumulatedTradingFee: round(randomNum(-3, -0.2), 4).toString(),
        raw: { mockData: true, instType: rawInstType }
      });
    }
  });

  // 3. GENERATE CLOSED POSITIONS HISTORY (history.json)
  // Need 35-45 trades per account (~350 trades total) covering the entire time range
  const now = Date.now();
  const timeBuckets = [
    { weight: 0.10, minAge: 0, maxAge: 24 * 60 * 60 * 1000 },                      // Today
    { weight: 0.15, minAge: 24 * 60 * 60 * 1000, maxAge: 7 * 24 * 60 * 60 * 1000 }, // 7d
    { weight: 0.15, minAge: 7 * 24 * 60 * 60 * 1000, maxAge: 14 * 24 * 60 * 60 * 1000 }, // 14d
    { weight: 0.20, minAge: 14 * 24 * 60 * 60 * 1000, maxAge: 30 * 24 * 60 * 60 * 1000 }, // 30d
    { weight: 0.15, minAge: 30 * 24 * 60 * 60 * 1000, maxAge: 90 * 24 * 60 * 60 * 1000 }, // 90d
    { weight: 0.15, minAge: 90 * 24 * 60 * 60 * 1000, maxAge: 180 * 24 * 60 * 60 * 1000 }, // 180d
    { weight: 0.10, minAge: 180 * 24 * 60 * 60 * 1000, maxAge: 360 * 24 * 60 * 60 * 1000 } // 365d
  ];

  accounts.forEach(acc => {
    const numHistory = randomInt(35, 45);
    for (let j = 0; j < numHistory; j++) {
      const conf = randomItem(SYMBOL_CONFIGS);
      const side = randomItem(['long', 'short']);
      const isWin = Math.random() < 0.62; // 62% win rate
      const leverage = randomItem([5, 10, 15, 20, 25]);
      
      const basePrice = conf.price;
      const entryPrice = round(basePrice * randomNum(0.92, 1.08), conf.price < 1 ? 4 : 2);
      
      // Close price based on win/loss
      const pnlPct = isWin ? randomNum(0.015, 0.09) : -randomNum(0.01, 0.05);
      const closePrice = side === 'long'
        ? round(entryPrice * (1 + pnlPct), conf.price < 1 ? 4 : 2)
        : round(entryPrice * (1 - pnlPct), conf.price < 1 ? 4 : 2);

      const sizeRaw = conf.price > 1000 ? randomNum(0.05, 1.5) : (conf.price > 50 ? randomNum(5, 50) : randomNum(50, 2000));
      const size = round(sizeRaw, conf.price > 1000 ? 4 : 2);
      const notionalUsd = round(size * entryPrice, 2);

      let realizedPnl = 0;
      if (conf.instType === 'INVERSE') {
        realizedPnl = side === 'long'
          ? round(size * (closePrice - entryPrice) / closePrice, 6)
          : round(size * (entryPrice - closePrice) / closePrice, 6);
      } else {
        realizedPnl = side === 'long'
          ? round((closePrice - entryPrice) * size, 2)
          : round((entryPrice - closePrice) * size, 2);
      }

      const fundingFee = round(randomNum(-1.5, 4.0), 2);
      const tradingFee = round(-notionalUsd * 0.0006 * 2, 2); // ~0.06% open + close
      const closedPnl = round(realizedPnl + fundingFee + tradingFee, 2);
      const roi = round((realizedPnl / (notionalUsd / leverage)) * 100, 2);

      // Select timestamp bucket
      const bucket = randomItem(timeBuckets);
      const closeUpdateTime = now - randomNum(bucket.minAge, bucket.maxAge);
      const durationMs = randomNum(15 * 60 * 1000, 5 * 24 * 60 * 60 * 1000); // 15m to 5d duration
      const createdTime = closeUpdateTime - durationMs;

      history.push({
        id: `hist-${histIdCounter++}`,
        connectionId: acc.connectionId,
        exchange: acc.exchange,
        label: acc.label,
        symbol: conf.symbol,
        baseCoin: conf.baseCoin,
        quoteCoin: conf.quoteCoin,
        ccy: conf.ccy,
        side,
        realizedPnl,
        closedPnl,
        closeUpdateTime,
        createdTime,
        entryPrice,
        closePrice,
        size,
        notionalUsd,
        fundingFee,
        tradingFee,
        leverage,
        marginMode: randomItem(['cross', 'isolated']),
        positionMode: 'hedge',
        roi,
        instrumentType: conf.instType,
        raw: {
          mockData: true,
          leverage,
          marginMode: 'cross',
          instType: conf.perpType
        }
      });
    }
  });

  // 4. GENERATE ORDERS (orders.json)
  // Combination of Open Orders (NEW, PARTIALLY_FILLED) and Closed Orders (FILLED, CANCELLED)
  accounts.forEach(acc => {
    const numOrders = randomInt(30, 40);
    for (let j = 0; j < numOrders; j++) {
      const conf = randomItem(SYMBOL_CONFIGS);
      const side = randomItem(['buy', 'sell']);
      const type = randomItem(['LIMIT', 'LIMIT', 'MARKET', 'TP', 'SL', 'CONDITIONAL']);
      
      const isOpen = j < 6; // First 6 per account are open orders
      const status = isOpen 
        ? (Math.random() < 0.25 ? 'PARTIALLY_FILLED' : 'NEW')
        : (Math.random() < 0.75 ? 'FILLED' : 'CANCELLED');

      const basePrice = conf.price;
      const priceOffset = isOpen ? (side === 'buy' ? 0.98 : 1.02) : randomNum(0.99, 1.01);
      const price = round(basePrice * priceOffset, conf.price < 1 ? 4 : 2);
      const avgPrice = status === 'FILLED' || status === 'PARTIALLY_FILLED' ? price : 0;

      const qtyRaw = conf.price > 1000 ? randomNum(0.05, 1.5) : (conf.price > 50 ? randomNum(5, 50) : randomNum(50, 2000));
      const qty = round(qtyRaw, conf.price > 1000 ? 4 : 2);
      const filledQty = status === 'FILLED' 
        ? qty 
        : (status === 'PARTIALLY_FILLED' ? round(qty * randomNum(0.2, 0.7), conf.price > 1000 ? 4 : 2) : 0);

      const value = round(price * (filledQty > 0 ? filledQty : qty), 2);
      const fees = filledQty > 0 ? round(-value * 0.0005, 4) : 0;

      const orderAge = isOpen ? randomNum(10 * 60 * 1000, 5 * 24 * 60 * 60 * 1000) : randomNum(24 * 60 * 60 * 1000, 60 * 24 * 60 * 60 * 1000);
      const updatedTime = now - orderAge;
      const createdTime = updatedTime - randomNum(5000, 3600 * 1000);

      orders.push({
        id: `ord-${orderIdCounter++}`,
        exchangeOrderId: `ext-ord-${orderIdCounter}`,
        connectionId: acc.connectionId,
        exchange: acc.exchange,
        label: acc.label,
        symbol: conf.symbol,
        category: conf.instType,
        side,
        positionSide: randomItem(['long', 'short', 'net']),
        type,
        status,
        price,
        avgPrice,
        qty,
        filledQty,
        value,
        triggerPrice: type === 'TP' || type === 'SL' ? round(price * (type === 'TP' ? 1.05 : 0.95), 2) : undefined,
        reduceOnly: type === 'TP' || type === 'SL',
        timeInForce: randomItem(['GTC', 'GTC', 'IOC', 'FOK']),
        createdTime,
        updatedTime,
        fees,
        leverage: randomItem([5, 10, 20]),
        marginMode: 'cross',
        raw: { mockData: true, instType: conf.perpType }
      });
    }
  });

  // 5. GENERATE FUNDING SUMMARIES (funding.json)
  // Covers all symbols across all 3 exchanges with realistic funding rates
  const fundingCoins = [
    { symbol: 'BTCUSDT', instrumentType: 'USDT-M', baseRate: 0.00012 }, // +0.012% per 8h
    { symbol: 'ETHUSDT', instrumentType: 'USDT-M', baseRate: 0.00015 }, // +0.015% per 8h
    { symbol: 'SOLUSDT', instrumentType: 'USDT-M', baseRate: 0.00022 }, // +0.022% per 8h
    { symbol: 'LINKUSDT', instrumentType: 'USDT-M', baseRate: 0.00010 },
    { symbol: 'AVAXUSDT', instrumentType: 'USDT-M', baseRate: 0.00018 },
    { symbol: 'DOGEUSDT', instrumentType: 'USDT-M', baseRate: 0.00030 },
    { symbol: 'XRPUSDT', instrumentType: 'USDT-M', baseRate: -0.00005 }, // negative rate
    { symbol: 'BTCUSD', instrumentType: 'COIN-M', baseRate: 0.00011 },
    { symbol: 'ETHUSD', instrumentType: 'COIN-M', baseRate: 0.00014 },
    { symbol: 'SOLUSD', instrumentType: 'COIN-M', baseRate: 0.00019 },
    { symbol: 'LINKUSD', instrumentType: 'COIN-M', baseRate: 0.00008 },
    { symbol: 'BTCUSDC', instrumentType: 'USDC-M', baseRate: 0.00010 },
    { symbol: 'ETHUSDC', instrumentType: 'USDC-M', baseRate: 0.00012 },
    { symbol: 'SOLUSDC', instrumentType: 'USDC-M', baseRate: 0.00018 }
  ];

  exchanges.forEach(exchange => {
    fundingCoins.forEach(fc => {
      // Rates in percentage (e.g. 0.012% -> "0.01200000")
      const rateMultiplier = exchange === 'bybit' ? 1.0 : (exchange === 'bitget' ? 1.05 : 0.95);
      const eightHourRatePct = fc.baseRate * 100 * rateMultiplier; // ~0.012%
      
      const lastRate = eightHourRatePct * randomNum(0.85, 1.15);
      const todaySum = lastRate * 3 * randomNum(0.9, 1.1); // ~3 settlements per day
      const currentMonthSum = todaySum * 22 * randomNum(0.8, 1.2); // ~22 days so far
      const lastMonthSum = todaySum * 30 * randomNum(0.85, 1.15);
      const last3MonthsSum = lastMonthSum * 3 * randomNum(0.9, 1.1);
      const last6MonthsSum = last3MonthsSum * 2 * randomNum(0.85, 1.15);
      const last12MonthsSum = last6MonthsSum * 2 * randomNum(0.85, 1.15);

      fundingSummaries.push({
        id: `${exchange}-${fc.symbol}`,
        exchange,
        symbol: fc.symbol,
        instrumentType: fc.instrumentType,
        last12MonthsFundingRate: exchange !== 'okx' ? last12MonthsSum.toFixed(8) : undefined,
        last6MonthsFundingRate: exchange !== 'okx' ? last6MonthsSum.toFixed(8) : undefined,
        last3MonthsFundingRate: last3MonthsSum.toFixed(8),
        lastMonthFundingRate: lastMonthSum.toFixed(8),
        currentMonthFundingRate: currentMonthSum.toFixed(8),
        todayFundingRate: todaySum.toFixed(8),
        lastFundingRate: lastRate.toFixed(8),
        lastFundingTime: String(now - randomNum(10 * 60 * 1000, 7 * 60 * 60 * 1000)),
        updatedAt: now
      });
    });
  });

  // 6. GENERATE BYBIT TRANSACTIONS (bybit-transactions.json)
  const bybitAccounts = accounts.filter(a => a.exchange === 'bybit');
  const txTypes = ['TRADE', 'SETTLEMENT', 'TRANSFER', 'FEE'];
  const txCategories = ['linear', 'inverse', 'spot'];

  bybitAccounts.forEach(acc => {
    for (let j = 0; j < 25; j++) {
      const conf = randomItem(SYMBOL_CONFIGS);
      const type = randomItem(txTypes);
      const category = conf.instType === 'INVERSE' ? 'inverse' : (Math.random() < 0.2 ? 'spot' : 'linear');
      const side = type === 'TRADE' ? randomItem(['Buy', 'Sell']) : 'None';
      const ccy = conf.ccy;
      const transTime = now - randomNum(0, 90 * 24 * 60 * 60 * 1000);

      const tradePrice = type === 'TRADE' ? String(round(conf.price * randomNum(0.95, 1.05), 2)) : '0';
      const qty = String(round(conf.price > 1000 ? randomNum(0.05, 1.5) : randomNum(5, 50), 4));
      const funding = type === 'SETTLEMENT' ? String(round(randomNum(-8, 15), 4)) : '0';
      const fee = type === 'TRADE' || type === 'FEE' ? String(round(-randomNum(0.5, 4.5), 4)) : '0';
      const cashFlow = type === 'TRANSFER' ? String(round(randomNum(-5000, 10000), 2)) : String(round(randomNum(-150, 350), 2));
      const change = String(round(parseFloat(cashFlow) + parseFloat(funding) + parseFloat(fee), 2));
      const cashBalance = String(round(randomNum(15000, 65000), 2));

      bybitTransactions.push({
        id: `${acc.connectionId}-raw-${txIdCounter}-${transTime}`,
        connectionId: acc.connectionId,
        exchange: 'bybit',
        label: acc.label,
        rawId: `raw-${txIdCounter}`,
        symbol: conf.symbol,
        category,
        side,
        transactionTime: transTime,
        type,
        transSubType: type === 'TRADE' ? 'Order' : (type === 'SETTLEMENT' ? 'Funding' : ''),
        qty,
        size: qty,
        currency: ccy,
        tradePrice,
        funding,
        fee,
        cashFlow,
        change,
        cashBalance,
        feeRate: '0.0006',
        bonusChange: '0',
        tradeId: `trade-${txIdCounter}`,
        orderId: `order-${txIdCounter}`,
        orderLinkId: `link-order-${txIdCounter}`,
        raw: { mockData: true }
      });
      txIdCounter++;
    }
  });

  // 7. GENERATE BILLS (bills.json)
  accounts.forEach(acc => {
    const numBills = randomInt(4, 8);
    for (let j = 0; j < numBills; j++) {
      const type = randomItem(['deposit', 'deposit', 'withdrawal']);
      const ccy = randomItem(['USDT', 'USDC', 'BTC', 'ETH', 'SOL']);
      const price = PRICE_MAP[ccy] || 1.0;
      
      let amount = 0;
      if (ccy === 'USDT' || ccy === 'USDC') {
        amount = type === 'deposit' ? round(randomNum(1000, 25000), 2) : round(-randomNum(500, 10000), 2);
      } else {
        const usdTarget = type === 'deposit' ? randomNum(1500, 20000) : randomNum(500, 8000);
        amount = type === 'deposit' ? round(usdTarget / price, 4) : round(-usdTarget / price, 4);
      }

      const timestamp = now - randomNum(0, 90 * 24 * 60 * 60 * 1000);

      bills.push({
        id: `bill-${billIdCounter++}`,
        connectionId: acc.connectionId,
        exchange: acc.exchange,
        label: acc.label,
        type,
        amount,
        ccy,
        timestamp,
        raw: { mockData: true }
      });
    }
  });

  // Output all JSON files
  const outDir = path.join(process.cwd(), 'src', 'mock');
  fs.writeFileSync(path.join(outDir, 'accounts.json'), JSON.stringify(accounts, null, 2));
  fs.writeFileSync(path.join(outDir, 'balances.json'), JSON.stringify(balances, null, 2));
  fs.writeFileSync(path.join(outDir, 'positions.json'), JSON.stringify(positions, null, 2));
  fs.writeFileSync(path.join(outDir, 'history.json'), JSON.stringify(history, null, 2));
  fs.writeFileSync(path.join(outDir, 'orders.json'), JSON.stringify(orders, null, 2));
  fs.writeFileSync(path.join(outDir, 'bills.json'), JSON.stringify(bills, null, 2));
  fs.writeFileSync(path.join(outDir, 'funding.json'), JSON.stringify(fundingSummaries, null, 2));
  fs.writeFileSync(path.join(outDir, 'bybit-transactions.json'), JSON.stringify(bybitTransactions, null, 2));

  console.log('All mock data generated successfully:');
  console.log(`- Accounts: ${accounts.length}`);
  console.log(`- Balances: ${balances.length}`);
  console.log(`- Positions: ${positions.length}`);
  console.log(`- History Positions: ${history.length}`);
  console.log(`- Orders: ${orders.length}`);
  console.log(`- Funding Summaries: ${fundingSummaries.length}`);
  console.log(`- Bybit Transactions: ${bybitTransactions.length}`);
  console.log(`- Bills: ${bills.length}`);
}

generate();
