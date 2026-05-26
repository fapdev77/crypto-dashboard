import { expect, test, describe, vi } from 'vitest';
import { BitgetWsAdapter } from '../../../src/services/adapters/bitget/WsAdapter';
import { useDashboardStore } from '../../../src/store/dashboardStore';

describe('BitgetWsAdapter', () => {
  test('parses positions correctly', () => {
    const updatePositionsDeltaMock = vi.fn();
    useDashboardStore.setState({
      updatePositionsDelta: updatePositionsDeltaMock
    } as any);

    const mockPayload = {
      action: 'update',
      arg: { channel: 'positions' },
      data: [{
        instId: 'SOLUSDT',
        holdSide: 'long',
        total: '100',
        openPriceAvg: '150',
        markPrice: '160',
        unrealizedPL: '1000',
        achievedProfits: '0',
        leverage: '5',
        marginMode: 'cross',
        marginSize: '3000',
        liquidationPrice: '120',
        breakEvenPrice: '151',
      }]
    };

    BitgetWsAdapter.parse('conn-bitget', 'bitget', 'My Bitget', mockPayload);

    expect(updatePositionsDeltaMock).toHaveBeenCalledTimes(1);
    const parsedData = updatePositionsDeltaMock.mock.calls[0][1];
    
    expect(parsedData[0]).toMatchObject({
      exchange: 'bitget',
      symbol: 'SOLUSDT',
      side: 'long',
      size: 100,
      entryPrice: 150,
      markPrice: 160,
      unrealizedPnl: 1000,
      marginMode: 'cross',
      margin: 3000,
      liquidationPrice: 120,
      breakEvenPrice: 151,
    });
    // check roe calculated correctly (1000 / 3000 * 100)
    expect(parsedData[0].roe).toBeCloseTo(33.33, 2);
  });
});
