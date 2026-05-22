import { expect, test, describe } from 'vitest';
import { BybitRestAdapter } from '../../../src/services/adapters/bybit/RestAdapter';

describe('BybitRestAdapter', () => {
  test('parses positions correctly', () => {
    const mockPositions = [{
      symbol: 'BTCUSDT',
      side: 'Sell',
      size: '0.1',
      entryPrice: '60000',
      markPrice: '59000',
      unrealisedPnl: '100',
      curRealisedPnl: '0',
      leverage: '10',
      tradeMode: 1,
      positionIM: '600',
      positionValue: '6000',
      liqPrice: '66000',
      breakEvenPrice: '59980',
    }];

    const parsed = BybitRestAdapter.parsePositions(mockPositions, 'conn1', 'Bybit Key');

    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      exchange: 'bybit',
      symbol: 'BTCUSDT',
      side: 'sell',
      size: 0.1,
      entryPrice: 60000,
      markPrice: 59000,
      unrealizedPnl: 100,
      marginMode: 'isolated',
      margin: 600,
      notionalUsd: 6000,
      liquidationPrice: 66000,
      breakEvenPrice: 59980,
    });
    // roe = unlRealized / margin * 100 = 100 / 600 * 100
    expect(parsed[0].roe).toBeCloseTo(16.66, 1);
  });
});
