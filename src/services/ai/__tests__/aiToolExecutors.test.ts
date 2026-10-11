import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { aiToolExecutors } from '../aiToolExecutors';
import { useBalancesStore } from '../../../store/balancesStore';
import { usePositionsStore } from '../../../store/positionsStore';

describe('aiToolExecutors', () => {
  beforeEach(() => {
    // Reset stores
    useBalancesStore.setState({ balances: {} });
    usePositionsStore.setState({ positions: {} });
  });

  it('aiGetPortfolioBalances returns aggregated equity and sanitized asset balances', async () => {
    useBalancesStore.setState({
      balances: {
        'b-1': {
          id: 'b-1',
          connectionId: 'conn-okx',
          exchange: 'okx',
          label: 'OKX Main',
          ccy: 'USDT',
          amount: 5000,
          usdValue: 5000,
          totalEquity: 5000,
          walletBalance: 5000,
          availableMargin: 4500,
          unrealizedPnl: 150,
          raw: {} as any,
        },
        'b-2': {
          id: 'b-2',
          connectionId: 'conn-bybit',
          exchange: 'bybit',
          label: 'Bybit UTA',
          ccy: 'BTC',
          amount: 0.5,
          usdValue: 30000,
          totalEquity: 30000,
          walletBalance: 30000,
          availableMargin: 25000,
          unrealizedPnl: -200,
          raw: {} as any,
        },
      },
    });

    const result = await aiToolExecutors.aiGetPortfolioBalances();

    expect(result.totalEquityUsd).toBe(35000);
    expect(result.totalAvailableMarginUsd).toBe(29500);
    expect(result.totalUnrealizedPnlUsd).toBe(-50);
    expect(result.exchanges).toHaveLength(2);
    // Crucial: No secret API keys or credentials
    expect(JSON.stringify(result)).not.toContain('apiKey');
    expect(JSON.stringify(result)).not.toContain('apiSecret');
  });

  it('aiGetOpenPositions returns filtered and normalized open positions', async () => {
    usePositionsStore.setState({
      positions: {
        'pos-1': {
          id: 'pos-1',
          connectionId: 'conn-okx',
          exchange: 'okx',
          label: 'OKX Test',
          symbol: 'BTC-USDT-SWAP',
          baseCoin: 'BTC',
          quoteCoin: 'USDT',
          side: 'long',
          size: 0.5,
          entryPrice: 60000,
          markPrice: 61000,
          unrealizedPnl: 500,
          realizedPnl: 0,
          liquidationPrice: 45000,
          leverage: 10,
          marginMode: 'cross',
          margin: 3000,
          notionalUsd: 30500,
          raw: {} as any,
        },
        'pos-2': {
          id: 'pos-2',
          connectionId: 'conn-bybit',
          exchange: 'bybit',
          label: 'Bybit Test',
          symbol: 'SOLUSDT',
          baseCoin: 'SOL',
          quoteCoin: 'USDT',
          side: 'short',
          size: 50,
          entryPrice: 150,
          markPrice: 155,
          unrealizedPnl: -250,
          realizedPnl: 0,
          liquidationPrice: 180,
          leverage: 5,
          marginMode: 'isolated',
          margin: 1500,
          notionalUsd: 7750,
          raw: {} as any,
        },
      },
    });

    // Test without filter
    const all = await aiToolExecutors.aiGetOpenPositions({});
    expect(all.totalOpenPositions).toBe(2);

    // Test filter by exchange
    const okxOnly = await aiToolExecutors.aiGetOpenPositions({ exchange: 'okx' });
    expect(okxOnly.totalOpenPositions).toBe(1);
    expect(okxOnly.positions[0].symbol).toBe('BTC-USDT-SWAP');

    // Test filter by side
    const shortOnly = await aiToolExecutors.aiGetOpenPositions({ side: 'short' });
    expect(shortOnly.totalOpenPositions).toBe(1);
    expect(shortOnly.positions[0].symbol).toBe('SOLUSDT');
  });

  it('aiGetHedgeCorrelationSummary detects cross-exchange hedges and net delta', async () => {
    usePositionsStore.setState({
      positions: {
        'pos-btc-bybit': {
          id: 'pos-btc-bybit',
          connectionId: 'conn-bybit',
          exchange: 'bybit',
          label: 'Bybit Test',
          symbol: 'BTCUSDT',
          baseCoin: 'BTC',
          quoteCoin: 'USDT',
          side: 'long',
          size: 0.5,
          entryPrice: 60000,
          markPrice: 60000,
          unrealizedPnl: 0,
          realizedPnl: 0,
          liquidationPrice: 40000,
          leverage: 10,
          marginMode: 'cross',
          margin: 3000,
          notionalUsd: 30000,
          raw: {} as any,
        },
        'pos-btc-okx': {
          id: 'pos-btc-okx',
          connectionId: 'conn-okx',
          exchange: 'okx',
          label: 'OKX Test',
          symbol: 'BTC-USDT-SWAP',
          baseCoin: 'BTC',
          quoteCoin: 'USDT',
          side: 'short',
          size: 0.4,
          entryPrice: 60000,
          markPrice: 60000,
          unrealizedPnl: 0,
          realizedPnl: 0,
          liquidationPrice: 80000,
          leverage: 10,
          marginMode: 'cross',
          margin: 2400,
          notionalUsd: 24000,
          raw: {} as any,
        },
      },
    });

    const hedgeSummary = await aiToolExecutors.aiGetHedgeCorrelationSummary();
    expect(hedgeSummary.hedgedCoins).toContain('BTC');
    expect(hedgeSummary.coinsBreakdown['BTC']).toBeDefined();
    // Long 30k vs Short 24k -> Net Long $6k
    expect(hedgeSummary.coinsBreakdown['BTC'].netExposureUsd).toBe(6000);
    expect(hedgeSummary.coinsBreakdown['BTC'].longExposureUsd).toBe(30000);
    expect(hedgeSummary.coinsBreakdown['BTC'].shortExposureUsd).toBe(24000);
  });

  describe('Sync Intelligence & Warnings', () => {
    it('returns condition (a) "No local data found." when no data and no sync running', async () => {
      useBalancesStore.setState({ balances: {} });
      const result = await aiToolExecutors.aiGetPortfolioBalances();
      expect(result.syncStatus).toBe('NO_DATA');
      expect(result.syncNotice).toBe('No local data found.');
    });

    it('returns condition (b) warning when no data and a sync is in progress', async () => {
      const { useSyncCoordinatorStore } = await import('../../../store/syncCoordinatorStore');
      useBalancesStore.setState({ balances: {} });
      useSyncCoordinatorStore.setState({ isBybitTxSyncing: true });

      const result = await aiToolExecutors.aiGetPortfolioBalances();
      expect(result.syncStatus).toBe('NO_DATA_SYNCING');
      expect(result.syncNotice).toContain('No local data found, but synchronization is currently in progress');

      useSyncCoordinatorStore.setState({ isBybitTxSyncing: false });
    });

    it('returns condition (c) warning when data exists and a sync is in progress', async () => {
      const { useSyncCoordinatorStore } = await import('../../../store/syncCoordinatorStore');
      useBalancesStore.setState({
        balances: {
          'b-1': {
            id: 'b-1',
            connectionId: 'conn-okx',
            exchange: 'okx',
            label: 'OKX Main',
            ccy: 'USDT',
            amount: 5000,
            usdValue: 5000,
            totalEquity: 5000,
            walletBalance: 5000,
            availableMargin: 4500,
            unrealizedPnl: 150,
            raw: {} as any,
          },
        },
      });
      useSyncCoordinatorStore.setState({ isBybitTxSyncing: true });

      const result = await aiToolExecutors.aiGetPortfolioBalances();
      expect(result.syncStatus).toBe('DATA_SYNCING');
      expect(result.syncNotice).toBe(
        'Synchronization is currently in progress. Data may be outdated and results may not be accurate. Do you want to proceed anyway?'
      );

      useSyncCoordinatorStore.setState({ isBybitTxSyncing: false });
    });
  });

  describe('Privacy Mode Automatic Obfuscation', () => {
    beforeEach(() => {
      localStorage.setItem('app_privacy_mode', 'true');
    });

    afterEach(() => {
      localStorage.removeItem('app_privacy_mode');
    });

    it('obfuscates nominal balances and computes percentage allocations in aiGetPortfolioBalances', async () => {
      useBalancesStore.setState({
        balances: {
          'b-1': {
            id: 'b-1',
            connectionId: 'conn-okx',
            exchange: 'okx',
            label: 'OKX Main',
            ccy: 'USDT',
            amount: 10000,
            usdValue: 10000,
            totalEquity: 10000,
            walletBalance: 10000,
            availableMargin: 8000,
            unrealizedPnl: 200,
            raw: {} as any,
          },
        },
      });

      const result = await aiToolExecutors.aiGetPortfolioBalances();
      expect(result.privacyModeActive).toBe(true);
      expect(result.totalEquityUsd).toBe('[OBFUSCATED - Privacy Mode Active]');
      expect(result.exchanges[0].equityUsd).toBe('[OBFUSCATED - Privacy Mode Active]');
      expect(result.exchanges[0].equitySharePct).toBe('100.0%');
      expect(result.exchanges[0].assets[0].amount).toBe('[OBFUSCATED]');
      expect(result.exchanges[0].assets[0].portfolioSharePct).toBe('100.0%');
    });

    it('obfuscates position notional and provides ROI % in aiGetOpenPositions', async () => {
      usePositionsStore.setState({
        positions: {
          'pos-1': {
            id: 'pos-1',
            connectionId: 'conn-okx',
            exchange: 'okx',
            label: 'OKX Test',
            symbol: 'BTCUSDT',
            baseCoin: 'BTC',
            quoteCoin: 'USDT',
            side: 'long',
            size: 1.0,
            entryPrice: 60000,
            markPrice: 66000,
            unrealizedPnl: 6000,
            realizedPnl: 0,
            liquidationPrice: 40000,
            leverage: 10,
            marginMode: 'cross',
            margin: 6000,
            notionalUsd: 66000,
            raw: {} as any,
          },
        },
      });

      const result = await aiToolExecutors.aiGetOpenPositions({});
      expect(result.privacyModeActive).toBe(true);
      expect(result.totalLongNotionalUsd).toBe('[OBFUSCATED - Privacy Mode Active]');
      expect(result.positions[0].size).toBe('[OBFUSCATED]');
      expect(result.positions[0].notionalUsd).toBe('[OBFUSCATED]');
      expect(result.positions[0].unrealizedRoiPct).toBe('+100.00%');
    });
  });

  describe('High-Precision Decimals & Funding Rate Horizons', () => {
    it('formatRate8 formats rates strictly into pure 8-decimal strings without percent or rounding collapse', async () => {
      const { formatRate8 } = await import('../aiToolExecutors');
      expect(formatRate8(0.0001)).toBe('0.00010000');
      expect(formatRate8('0.00005234')).toBe('0.00005234');
      expect(formatRate8(-0.000215)).toBe('-0.00021500');
      expect(formatRate8(0)).toBe('0.00000000');
      expect(formatRate8(null)).toBe('0.00000000');
      expect(formatRate8('invalid')).toBe('0.00000000');
    });

    it('aiGetFundingFeesHistory returns pure 8-decimal rates and multi-horizon periods', async () => {
      const { useFundingStore } = await import('../../../store/fundingStore');
      useFundingStore.setState({
        currentRates: [
          {
            exchange: 'bybit',
            symbol: 'BTCUSDT',
            instrumentType: 'USDT-M',
            fundingRate: 0.0001,
            nextFundingTime: 1700000000000,
          },
          {
            exchange: 'okx',
            symbol: 'ETH-USDT-SWAP',
            instrumentType: 'USDT-M',
            fundingRate: 0.00006543,
            nextFundingTime: 1700000000000,
          },
        ],
      });

      const result = await aiToolExecutors.aiGetFundingFeesHistory({ days: 30 });
      expect(result.totalSymbolsFound).toBe(2);
      expect(result.exchangeCoverage.bybit).toContain('2 years');
      expect(result.exchangeCoverage.okx).toContain('90 days');

      const bybitBtc = result.symbols.find((s) => s.exchange === 'bybit' && s.symbol === 'BTCUSDT');
      expect(bybitBtc).toBeDefined();
      expect(bybitBtc?.fundingRate).toBe('0.00010000');
      expect(bybitBtc?.fundingRateDecimal).toBe(0.0001);
      expect(bybitBtc?.cumulativeRates.today).toBe('0.00000000');
      expect(bybitBtc?.cumulativeRates.last3Months).toBe('0.00000000');
      expect(bybitBtc?.cumulativeRates.last6Months).toBe('0.00000000');
      expect(bybitBtc?.cumulativeRates.last12Months).toBe('0.00000000');
      expect(bybitBtc?.cumulativeRates.exchangeMaxCoverage).toContain('2 years');

      const okxEth = result.symbols.find((s) => s.exchange === 'okx' && s.symbol === 'ETH-USDT-SWAP');
      expect(okxEth).toBeDefined();
      expect(okxEth?.fundingRate).toBe('0.00006543');
      expect(okxEth?.cumulativeRates.exchangeMaxCoverage).toContain('90 days');
    });

    it('preserves full decimal precision for micro-prices and fractional asset amounts', async () => {
      usePositionsStore.setState({
        positions: {
          'pos-pepe': {
            id: 'pos-pepe',
            connectionId: 'conn-bybit',
            exchange: 'bybit',
            label: 'Bybit UTA',
            symbol: '1000PEPEUSDT',
            baseCoin: '1000PEPE',
            quoteCoin: 'USDT',
            side: 'long',
            size: 500000,
            entryPrice: 0.00000845,
            markPrice: 0.00000912,
            unrealizedPnl: 33.5,
            realizedPnl: 0,
            liquidationPrice: 0.0000042,
            leverage: 3,
            marginMode: 'cross',
            margin: 1400,
            notionalUsd: 4560,
            raw: {} as any,
          },
        },
      });

      const result = await aiToolExecutors.aiGetOpenPositions({});
      expect(result.positions).toHaveLength(1);
      const pos = result.positions[0];
      // Micro-prices must not be rounded away to 0
      expect(pos.entryPrice).toBe(0.00000845);
      expect(pos.entryPriceRaw).toBe('0.00000845');
      expect(pos.markPrice).toBe(0.00000912);
      expect(pos.markPriceRaw).toBe('0.00000912');
      expect(pos.liquidationPrice).toBe(0.0000042);
      expect(pos.liquidationPriceRaw).toBe('0.0000042');
    });
  });
});
