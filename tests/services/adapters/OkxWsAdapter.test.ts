import { expect, test, describe, vi } from 'vitest';
import { OkxWsAdapter } from '../../../src/services/adapters/okx/WsAdapter';
import { useDashboardStore } from '../../../src/store/dashboardStore';

describe('OkxWsAdapter', () => {
  test('parses positions correctly', () => {
    // Mock the Zustand store action
    const updatePositionsDeltaMock = vi.fn();
    useDashboardStore.setState({
      updatePositionsDelta: updatePositionsDeltaMock
    } as any);

    const mockPayload = {
      arg: { channel: 'positions' },
      data: [{
        posId: '12345',
        instId: 'BTC-USDT-SWAP',
        ccy: 'USDT',
        posSide: 'long',
        pos: '1.5',
        avgPx: '60000',
        markPx: '61000',
        upl: '1500',
        realizedPnl: '0',
        lever: '10',
        mgnMode: 'isolated',
        margin: '150',
        notionalUsd: '91500',
        liqPx: '55000',
        bePx: '60050',
        uplRatio: '1.0'
      }]
    };

    OkxWsAdapter.parse('conn-1', 'okx', 'My OKX', mockPayload);

    expect(updatePositionsDeltaMock).toHaveBeenCalledTimes(1);
    const parsedData = updatePositionsDeltaMock.mock.calls[0][1];
    
    expect(parsedData[0]).toMatchObject({
      id: 'conn-1-12345',
      connectionId: 'conn-1',
      exchange: 'okx',
      symbol: 'BTC-USDT-SWAP',
      ccy: 'USDT',
      side: 'long',
      size: 1.5,
      entryPrice: 60000,
      markPrice: 61000,
      unrealizedPnl: 1500,
      realizedPnl: 0,
      leverage: 10,
      marginMode: 'isolated',
      margin: 150,
      notionalUsd: 91500,
      liquidationPrice: 55000,
      breakEvenPrice: 60050,
      roe: 100 // 1.0 * 100
    });
  });
});
