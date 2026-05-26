import { expect, test, describe, vi } from 'vitest';
import { BybitWsAdapter } from '../../../src/services/adapters/bybit/WsAdapter';
import { useDashboardStore } from '../../../src/store/dashboardStore';

describe('BybitWsAdapter', () => {
  test('parses positions correctly', () => {
    const updatePositionsDeltaMock = vi.fn();
    useDashboardStore.setState({
      updatePositionsDelta: updatePositionsDeltaMock
    } as any);

    const mockPayload = {
      topic: 'position',
      data: [{
        symbol: 'ETHUSDT',
        side: 'Buy',
        size: '2.5',
        entryPrice: '3000',
        markPrice: '3100',
        unrealisedPnl: '250',
        curRealisedPnl: '0',
        leverage: '10',
        tradeMode: 1,
        positionIM: '750',
        positionValue: '7500',
        liqPrice: '2800',
        breakEvenPrice: '3005',
      }]
    };

    BybitWsAdapter.parse('conn-bybit', 'bybit', 'My Bybit', mockPayload);

    expect(updatePositionsDeltaMock).toHaveBeenCalledTimes(1);
    const parsedData = updatePositionsDeltaMock.mock.calls[0][1];
    
    expect(parsedData[0]).toMatchObject({
      exchange: 'bybit',
      symbol: 'ETHUSDT',
      side: 'buy',
      size: 2.5,
      entryPrice: 3000,
      markPrice: 3100,
      unrealizedPnl: 250,
      marginMode: 'isolated',
      margin: 750,
      notionalUsd: 7500,
      liquidationPrice: 2800,
      breakEvenPrice: 3005,
    });
    // check roe calculated correctly (250 / 750 * 100)
    expect(parsedData[0].roe).toBeCloseTo(33.33, 2);
  });
});
