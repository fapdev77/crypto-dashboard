import { UnifiedFundingFee, ExchangeName, UnifiedInstrumentType } from '../../types';
import { hybridFetch } from '../../utils/proxyFetch';
import { LogManager } from '../logger';
import { getAssetMetadata, saveAssetMetadata } from '../historyCache';

export interface CurrentFundingRate {
  exchange: ExchangeName;
  symbol: string;
  instrumentType: 'USDT-M' | 'COIN-M';
  fundingRate: number;
  nextFundingTime: number;
}

export class FundingService {
  /**
   * Fetch current funding rates for all USDT-M and COIN-M symbols from an exchange.
   */
  static async fetchCurrentFundingRates(exchange: ExchangeName): Promise<CurrentFundingRate[]> {
    switch (exchange) {
      case 'bybit':
        return this.fetchBybitCurrentRates();
      case 'okx':
        return this.fetchOkxCurrentRates();
      case 'bitget':
        return this.fetchBitgetCurrentRates();
      default:
        return [];
    }
  }

  /**
   * Fetch historical funding rates for a specific symbol.
   */
  static async fetchFundingHistory(
    exchange: ExchangeName,
    symbol: string,
    instrumentType: 'USDT-M' | 'COIN-M',
    limit: number = 100
  ): Promise<UnifiedFundingFee[]> {
    try {
      switch (exchange) {
        case 'bybit':
          return this.fetchBybitFundingHistory(symbol, instrumentType, limit);
        case 'okx':
          return this.fetchOkxFundingHistory(symbol, instrumentType, limit);
        case 'bitget':
          return this.fetchBitgetFundingHistory(symbol, instrumentType, limit);
        default:
          return [];
      }
    } catch (error) {
      LogManager.error('FundingService', `Error fetching ${exchange} history for ${symbol}:`, error);
      return [];
    }
  }

  private static async fetchBybitCurrentRates(): Promise<CurrentFundingRate[]> {
    const results: CurrentFundingRate[] = [];
    
    for (const category of ['linear', 'inverse']) {
      try {
        const url = `https://api.bybit.com/v5/market/tickers?category=${category}`;
        const data = await hybridFetch(url, 'GET', {});
        
        if (data && data.retCode === 0 && data.result && data.result.list) {
          const instType = category === 'linear' ? 'USDT-M' : 'COIN-M';
          for (const item of data.result.list) {
            if (item.fundingRate && item.nextFundingTime) {
              results.push({
                exchange: 'bybit',
                symbol: item.symbol,
                instrumentType: instType,
                fundingRate: parseFloat(item.fundingRate),
                nextFundingTime: parseInt(item.nextFundingTime, 10),
              });
            }
          }
        }
      } catch (e) {
        LogManager.error('FundingService', `Bybit current rates error for ${category}:`, e);
      }
    }
    
    return results;
  }

  private static async fetchBybitFundingHistory(
    symbol: string,
    instrumentType: 'USDT-M' | 'COIN-M',
    limit: number
  ): Promise<UnifiedFundingFee[]> {
    const category = instrumentType === 'USDT-M' ? 'linear' : 'inverse';
    const url = `https://api.bybit.com/v5/market/funding/history?category=${category}&symbol=${symbol}&limit=${limit}`;
    const data = await hybridFetch(url, 'GET', {});
    
    if (data && data.retCode === 0 && data.result && data.result.list) {
      return data.result.list.map((item: any) => ({
        id: `bybit-${symbol}-${item.fundingRateTimestamp}`,
        exchange: 'bybit',
        symbol,
        instrumentType,
        timestamp: parseInt(item.fundingRateTimestamp, 10),
        fundingRate: parseFloat(item.fundingRate),
      }));
    }
    return [];
  }

  private static async fetchOkxCurrentRates(): Promise<CurrentFundingRate[]> {
    const results: CurrentFundingRate[] = [];
    try {
      const url = `https://www.okx.com/api/v5/public/funding-rate?instId=ANY`;
      const data = await hybridFetch(url, 'GET', {});
      
      if (data && data.code === '0' && data.data) {
        for (const item of data.data) {
          const isUsdt = item.instId.endsWith('-USDT-SWAP');
          const isCoin = item.instId.endsWith('-USD-SWAP');
          
          if ((isUsdt || isCoin) && item.fundingRate && item.fundingTime) {
            results.push({
              exchange: 'okx',
              symbol: item.instId,
              instrumentType: isUsdt ? 'USDT-M' : 'COIN-M',
              fundingRate: parseFloat(item.fundingRate),
              nextFundingTime: parseInt(item.fundingTime, 10),
            });
          }
        }
      }
    } catch (e) {
      LogManager.error('FundingService', 'OKX current rates error:', e);
    }
    return results;
  }

  private static async fetchOkxFundingHistory(
    symbol: string,
    instrumentType: 'USDT-M' | 'COIN-M',
    limit: number
  ): Promise<UnifiedFundingFee[]> {
    const url = `https://www.okx.com/api/v5/public/funding-rate-history?instId=${symbol}&limit=${limit > 100 ? 100 : limit}`;
    const data = await hybridFetch(url, 'GET', {});
    
    if (data && data.code === '0' && data.data) {
      return data.data.map((item: any) => ({
        id: `okx-${symbol}-${item.fundingTime}`,
        exchange: 'okx',
        symbol,
        instrumentType,
        timestamp: parseInt(item.fundingTime, 10),
        fundingRate: parseFloat(item.realizedRate || item.fundingRate),
        realizedRate: parseFloat(item.realizedRate),
      }));
    }
    return [];
  }

  private static async fetchBitgetCurrentRates(): Promise<CurrentFundingRate[]> {
    const results: CurrentFundingRate[] = [];
    for (const productType of ['USDT-FUTURES', 'COIN-FUTURES']) {
      try {
        const url = `https://api.bitget.com/api/v2/mix/market/current-fund-rate?productType=${productType}`;
        const data = await hybridFetch(url, 'GET', {});
        
        if (data && data.code === '00000' && data.data) {
          const instType = productType === 'USDT-FUTURES' ? 'USDT-M' : 'COIN-M';
          for (const item of data.data) {
            const nextTime = item.nextUpdate || item.nextFundingTime;
            if (item.fundingRate && nextTime) {
              results.push({
                exchange: 'bitget',
                symbol: item.symbol,
                instrumentType: instType,
                fundingRate: parseFloat(item.fundingRate),
                nextFundingTime: parseInt(nextTime, 10),
              });
            }
          }
        }
      } catch (e) {
        LogManager.error('FundingService', `Bitget current rates error for ${productType}:`, e);
      }
    }
    return results;
  }

  private static async fetchBitgetFundingHistory(
    symbol: string,
    instrumentType: 'USDT-M' | 'COIN-M',
    limit: number
  ): Promise<UnifiedFundingFee[]> {
    const productType = instrumentType === 'USDT-M' ? 'USDT-FUTURES' : 'COIN-FUTURES';
    const url = `https://api.bitget.com/api/v2/mix/market/history-fund-rate?symbol=${symbol}&productType=${productType}&pageSize=${limit > 100 ? 100 : limit}`;
    const data = await hybridFetch(url, 'GET', {});
    
    if (data && data.code === '00000' && data.data) {
      return data.data.map((item: any) => ({
        id: `bitget-${symbol}-${item.fundingTime || item.settleTime}`,
        exchange: 'bitget',
        symbol,
        instrumentType,
        timestamp: parseInt(item.fundingTime || item.settleTime, 10),
        fundingRate: parseFloat(item.fundingRate),
      }));
    }
    return [];
  }
}
