import { describe, it, expect, beforeEach } from 'vitest';
import { useConnectionStore, type ConnectionStatus } from '../connectionStore';
import { useBalancesStore, type BalanceItem } from '../balancesStore';
import { usePositionsStore } from '../positionsStore';
import type { UnifiedPosition } from '../../types';

// ───────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────

function makePos(overrides: Partial<UnifiedPosition> & { id: string; connectionId: string }): UnifiedPosition {
  return {
    exchange: 'bybit',
    label: 'test',
    symbol: 'BTCUSDT',
    baseCoin: 'BTC',
    quoteCoin: 'USDT',
    side: 'long',
    size: 1,
    entryPrice: 50000,
    markPrice: 51000,
    unrealizedPnl: 100,
    realizedPnl: 50,
    leverage: 10,
    ...overrides,
  };
}

// ───────────────────────────────────────────────
// Connection Store
// ───────────────────────────────────────────────

describe('connectionStore', () => {
  beforeEach(() => {
    useConnectionStore.setState({ statuses: {}, errors: {}, telemetry: {} });
  });

  it('should start with empty state', () => {
    const { statuses, errors, telemetry } = useConnectionStore.getState();
    expect(statuses).toEqual({});
    expect(errors).toEqual({});
    expect(telemetry).toEqual({});
  });

  describe('setConnectionStatus', () => {
    it('should set status for a connection', () => {
      useConnectionStore.getState().setConnectionStatus('conn-1', 'connected');
      expect(useConnectionStore.getState().statuses['conn-1']).toBe('connected');
    });

    it('should update existing status', () => {
      useConnectionStore.getState().setConnectionStatus('conn-1', 'connecting');
      useConnectionStore.getState().setConnectionStatus('conn-1', 'connected');
      expect(useConnectionStore.getState().statuses['conn-1']).toBe('connected');
    });

    it('should set error when provided', () => {
      useConnectionStore.getState().setConnectionStatus('conn-1', 'error', 'API timeout');
      expect(useConnectionStore.getState().statuses['conn-1']).toBe('error');
      expect(useConnectionStore.getState().errors['conn-1']).toBe('API timeout');
    });

    it('should not clear existing error when error param is omitted', () => {
      useConnectionStore.getState().setConnectionError('conn-1', 'previous error');
      useConnectionStore.getState().setConnectionStatus('conn-1', 'connecting');
      expect(useConnectionStore.getState().errors['conn-1']).toBe('previous error');
    });

    it('should clear error when explicitly set to null', () => {
      useConnectionStore.getState().setConnectionError('conn-1', 'some error');
      useConnectionStore.getState().setConnectionStatus('conn-1', 'connected', null);
      expect(useConnectionStore.getState().errors['conn-1']).toBeNull();
    });
  });

  describe('setConnectionError', () => {
    it('should set error for a connection', () => {
      useConnectionStore.getState().setConnectionError('conn-1', 'rate limited');
      expect(useConnectionStore.getState().errors['conn-1']).toBe('rate limited');
    });

    it('should clear error when null', () => {
      useConnectionStore.getState().setConnectionError('conn-1', 'some error');
      useConnectionStore.getState().setConnectionError('conn-1', null);
      expect(useConnectionStore.getState().errors['conn-1']).toBeNull();
    });

    it('should not affect other connections', () => {
      useConnectionStore.getState().setConnectionError('conn-1', 'error A');
      useConnectionStore.getState().setConnectionError('conn-2', 'error B');
      expect(useConnectionStore.getState().errors['conn-1']).toBe('error A');
      expect(useConnectionStore.getState().errors['conn-2']).toBe('error B');
    });
  });

  describe('updateLatency', () => {
    it('should record first latency measurement', () => {
      useConnectionStore.getState().updateLatency('conn-1', 150);
      const t = useConnectionStore.getState().telemetry['conn-1'];
      expect(t.lastPingMs).toBe(150);
      expect(t.latencyHistory).toEqual([150]);
    });

    it('should append to history up to 20 items', () => {
      for (let i = 0; i < 25; i++) {
        useConnectionStore.getState().updateLatency('conn-1', i);
      }
      const t = useConnectionStore.getState().telemetry['conn-1'];
      expect(t.latencyHistory.length).toBe(20);
      // Should keep the last 20 entries (indices 5..24)
      expect(t.latencyHistory[0]).toBe(5);
      expect(t.latencyHistory[19]).toBe(24);
    });

    it('should not affect other connections', () => {
      useConnectionStore.getState().updateLatency('conn-1', 100);
      useConnectionStore.getState().updateLatency('conn-2', 200);
      expect(useConnectionStore.getState().telemetry['conn-1'].lastPingMs).toBe(100);
      expect(useConnectionStore.getState().telemetry['conn-2'].lastPingMs).toBe(200);
    });
  });

  describe('addBytesReceived', () => {
    it('should accumulate bytes for a connection', () => {
      useConnectionStore.getState().addBytesReceived('conn-1', 1024);
      useConnectionStore.getState().addBytesReceived('conn-1', 2048);
      expect(useConnectionStore.getState().telemetry['conn-1'].accumulatingBytes).toBe(3072);
    });
  });

  describe('tickThroughput', () => {
    it('should calculate throughput when delta >= 1000ms', () => {
      // Create telemetry with a lastThroughputUpdate far in the past
      useConnectionStore.setState({
        telemetry: {
          'conn-1': {
            latencyHistory: [],
            throughputHistory: [],
            lastPingMs: 0,
            bytesPerSecond: 0,
            accumulatingBytes: 5000,
            lastThroughputUpdate: Date.now() - 2000, // 2 seconds ago
          },
        },
      });

      useConnectionStore.getState().tickThroughput();
      const t = useConnectionStore.getState().telemetry['conn-1'];

      // accumulatingBytes was 5000, now should be 0 (reset after tick)
      // The exact throughput depends on timing, so check bounds
      expect(t.bytesPerSecond).toBeGreaterThan(2000);
      expect(t.bytesPerSecond).toBeLessThan(3000);
      expect(t.throughputHistory.length).toBe(1);
      expect(t.accumulatingBytes).toBe(0);
      expect(t.lastThroughputUpdate).toBeGreaterThan(Date.now() - 100);
    });

    it('should NOT calculate throughput when delta < 1000ms', () => {
      useConnectionStore.setState({
        telemetry: {
          'conn-1': {
            latencyHistory: [],
            throughputHistory: [],
            lastPingMs: 0,
            bytesPerSecond: 0,
            accumulatingBytes: 5000,
            lastThroughputUpdate: Date.now(), // just now
          },
        },
      });

      useConnectionStore.getState().tickThroughput();
      const t = useConnectionStore.getState().telemetry['conn-1'];
      expect(t.accumulatingBytes).toBe(5000); // unchanged
    });

    it('should keep throughput history up to 20 items', () => {
      // Create telemetry that will trigger on each tick
      const base = {
        latencyHistory: [],
        throughputHistory: [] as number[],
        lastPingMs: 0,
        bytesPerSecond: 0,
        accumulatingBytes: 1000,
        lastThroughputUpdate: 0,
      };

      for (let i = 0; i < 25; i++) {
        useConnectionStore.setState({
          telemetry: {
            'conn-1': {
              ...base,
              throughputHistory: [...base.throughputHistory],
              lastThroughputUpdate: i > 0 ? Date.now() - 2000 : 0,
            },
          },
        });
        useConnectionStore.getState().tickThroughput();
        // Capture the new telemetry state for next iteration
        const updated = useConnectionStore.getState().telemetry['conn-1'];
        base.throughputHistory = updated.throughputHistory;
        base.lastThroughputUpdate = updated.lastThroughputUpdate;
      }

      expect(base.throughputHistory.length).toBe(20);
    });
  });

  describe('clearConnectionData', () => {
    it('should remove status, error, and telemetry for a connection', () => {
      useConnectionStore.getState().setConnectionStatus('conn-1', 'connected');
      useConnectionStore.getState().setConnectionError('conn-1', null);
      useConnectionStore.getState().updateLatency('conn-1', 100);

      useConnectionStore.getState().clearConnectionData('conn-1');

      expect(useConnectionStore.getState().statuses['conn-1']).toBeUndefined();
      expect(useConnectionStore.getState().errors['conn-1']).toBeUndefined();
      expect(useConnectionStore.getState().telemetry['conn-1']).toBeUndefined();
    });

    it('should not affect other connections', () => {
      useConnectionStore.getState().setConnectionStatus('conn-1', 'connected');
      useConnectionStore.getState().setConnectionStatus('conn-2', 'error');

      useConnectionStore.getState().clearConnectionData('conn-1');

      expect(useConnectionStore.getState().statuses['conn-2']).toBe('error');
    });
  });
});

// ───────────────────────────────────────────────
// Balances Store
// ───────────────────────────────────────────────

describe('balancesStore', () => {
  beforeEach(() => {
    useBalancesStore.setState({ balances: {} });
  });

  const makeBalance = (overrides: Partial<BalanceItem> & { id: string; connectionId: string }): BalanceItem => ({
    exchange: 'bybit',
    label: 'test',
    ccy: 'USDT',
    amount: 100,
    usdValue: 100,
    ...overrides,
  });

  it('should start with empty state', () => {
    expect(useBalancesStore.getState().balances).toEqual({});
  });

  describe('updateBalances', () => {
    it('should add new balances for a connection', () => {
      const b1 = makeBalance({ id: 'c1-USDT', connectionId: 'c1', ccy: 'USDT', amount: 100 });
      const b2 = makeBalance({ id: 'c1-BTC', connectionId: 'c1', ccy: 'BTC', amount: 0.5 });

      useBalancesStore.getState().updateBalances('c1', [b1, b2]);

      expect(useBalancesStore.getState().balances['c1-USDT']).toEqual(b1);
      expect(useBalancesStore.getState().balances['c1-BTC']).toEqual(b2);
    });

    it('should skip entries with amount <= 0', () => {
      const b1 = makeBalance({ id: 'c1-USDT', connectionId: 'c1', amount: 0, usdValue: 0 });
      useBalancesStore.getState().updateBalances('c1', [b1]);

      expect(useBalancesStore.getState().balances['c1-USDT']).toBeUndefined();
    });

    it('should remove stale balances for the same connection', () => {
      useBalancesStore.setState({
        balances: {
          'c1-USDT': makeBalance({ id: 'c1-USDT', connectionId: 'c1', ccy: 'USDT', amount: 100 }),
          'c1-BTC': makeBalance({ id: 'c1-BTC', connectionId: 'c1', ccy: 'BTC', amount: 0.5 }),
          'c2-USDT': makeBalance({ id: 'c2-USDT', connectionId: 'c2', ccy: 'USDT', amount: 200 }),
        },
      });

      // Update only USDT for c1 — BTC should be removed
      useBalancesStore.getState().updateBalances('c1', [
        makeBalance({ id: 'c1-USDT', connectionId: 'c1', ccy: 'USDT', amount: 150 }),
      ]);

      expect(useBalancesStore.getState().balances['c1-USDT']?.amount).toBe(150);
      expect(useBalancesStore.getState().balances['c1-BTC']).toBeUndefined();
      // c2 should be untouched
      expect(useBalancesStore.getState().balances['c2-USDT']?.amount).toBe(200);
    });

    it('should update existing balance in-place', () => {
      useBalancesStore.setState({
        balances: {
          'c1-USDT': makeBalance({ id: 'c1-USDT', connectionId: 'c1', amount: 100 }),
        },
      });

      useBalancesStore.getState().updateBalances('c1', [
        makeBalance({ id: 'c1-USDT', connectionId: 'c1', amount: 200 }),
      ]);

      expect(useBalancesStore.getState().balances['c1-USDT']?.amount).toBe(200);
    });
  });

  describe('updateBalancesDelta', () => {
    it('should update existing balance with partial data', () => {
      useBalancesStore.setState({
        balances: {
          'c1-USDT': makeBalance({ id: 'c1-USDT', connectionId: 'c1', ccy: 'USDT', amount: 100, usdValue: 100 }),
        },
      });

      useBalancesStore.getState().updateBalancesDelta('c1', [
        { id: 'c1-USDT', amount: 150 },
      ]);

      expect(useBalancesStore.getState().balances['c1-USDT']?.amount).toBe(150);
      expect(useBalancesStore.getState().balances['c1-USDT']?.usdValue).toBe(100); // unchanged
    });

    it('should create new entry when id does not exist', () => {
      useBalancesStore.getState().updateBalancesDelta('c1', [
        { id: 'c1-NEW', connectionId: 'c1', exchange: 'bybit', label: 'test', ccy: 'NEW', amount: 50, usdValue: 50 },
      ]);

      expect(useBalancesStore.getState().balances['c1-NEW']?.amount).toBe(50);
    });

    it('should remove entry when amount drops to 0', () => {
      useBalancesStore.setState({
        balances: {
          'c1-USDT': makeBalance({ id: 'c1-USDT', connectionId: 'c1', ccy: 'USDT', amount: 100 }),
        },
      });

      useBalancesStore.getState().updateBalancesDelta('c1', [
        { id: 'c1-USDT', amount: 0 },
      ]);

      expect(useBalancesStore.getState().balances['c1-USDT']).toBeUndefined();
    });

    it('should skip entries without an id', () => {
      useBalancesStore.getState().updateBalancesDelta('c1', [
        { connectionId: 'c1' } as Partial<BalanceItem>,
      ]);
      expect(Object.keys(useBalancesStore.getState().balances)).toHaveLength(0);
    });
  });

  describe('clearConnectionData', () => {
    it('should remove all balances for a connection', () => {
      useBalancesStore.setState({
        balances: {
          'c1-USDT': makeBalance({ id: 'c1-USDT', connectionId: 'c1' }),
          'c1-BTC': makeBalance({ id: 'c1-BTC', connectionId: 'c1' }),
          'c2-USDT': makeBalance({ id: 'c2-USDT', connectionId: 'c2' }),
        },
      });

      useBalancesStore.getState().clearConnectionData('c1');

      expect(useBalancesStore.getState().balances['c1-USDT']).toBeUndefined();
      expect(useBalancesStore.getState().balances['c1-BTC']).toBeUndefined();
      expect(useBalancesStore.getState().balances['c2-USDT']).toBeDefined();
    });
  });
});

// ───────────────────────────────────────────────
// Positions Store
// ───────────────────────────────────────────────

describe('positionsStore', () => {
  beforeEach(() => {
    usePositionsStore.setState({ positions: {} });
  });

  it('should start with empty state', () => {
    expect(usePositionsStore.getState().positions).toEqual({});
  });

  describe('updatePositions', () => {
    it('should add new positions for a connection', () => {
      const p1 = makePos({ id: 'c1-BTC', connectionId: 'c1', symbol: 'BTCUSDT', size: 1 });
      const p2 = makePos({ id: 'c1-ETH', connectionId: 'c1', symbol: 'ETHUSDT', size: 10 });

      usePositionsStore.getState().updatePositions('c1', [p1, p2]);

      expect(usePositionsStore.getState().positions['c1-BTC']).toEqual(p1);
      expect(usePositionsStore.getState().positions['c1-ETH']).toEqual(p2);
    });

    it('should skip positions with size <= 0', () => {
      const p1 = makePos({ id: 'c1-BTC', connectionId: 'c1', size: 0 });
      usePositionsStore.getState().updatePositions('c1', [p1]);

      expect(usePositionsStore.getState().positions['c1-BTC']).toBeUndefined();
    });

    it('should keep positions with negative size (abs > 0)', () => {
      const p1 = makePos({ id: 'c1-BTC', connectionId: 'c1', size: -0.5 });
      usePositionsStore.getState().updatePositions('c1', [p1]);

      // Store uses Math.abs(pos.size) > 0, so negative sizes are valid (short positions)
      expect(usePositionsStore.getState().positions['c1-BTC']).toBeDefined();
      expect(usePositionsStore.getState().positions['c1-BTC']?.size).toBe(-0.5);
    });

    it('should remove stale positions for the same connection', () => {
      usePositionsStore.setState({
        positions: {
          'c1-BTC': makePos({ id: 'c1-BTC', connectionId: 'c1', symbol: 'BTCUSDT', size: 1 }),
          'c1-ETH': makePos({ id: 'c1-ETH', connectionId: 'c1', symbol: 'ETHUSDT', size: 10 }),
          'c2-BTC': makePos({ id: 'c2-BTC', connectionId: 'c2', symbol: 'BTCUSDT', size: 2 }),
        },
      });

      usePositionsStore.getState().updatePositions('c1', [
        makePos({ id: 'c1-BTC', connectionId: 'c1', symbol: 'BTCUSDT', size: 1.5 }),
      ]);

      expect(usePositionsStore.getState().positions['c1-BTC']?.size).toBe(1.5);
      expect(usePositionsStore.getState().positions['c1-ETH']).toBeUndefined();
      expect(usePositionsStore.getState().positions['c2-BTC']).toBeDefined();
    });
  });

  describe('updatePositionsDelta', () => {
    it('should update existing position with partial data', () => {
      usePositionsStore.setState({
        positions: {
          'c1-BTC': makePos({ id: 'c1-BTC', connectionId: 'c1', symbol: 'BTCUSDT', size: 1, unrealizedPnl: 100 }),
        },
      });

      usePositionsStore.getState().updatePositionsDelta('c1', [
        { id: 'c1-BTC', unrealizedPnl: 200 },
      ]);

      expect(usePositionsStore.getState().positions['c1-BTC']?.unrealizedPnl).toBe(200);
      expect(usePositionsStore.getState().positions['c1-BTC']?.size).toBe(1); // unchanged
    });

    it('should create new entry when id does not exist', () => {
      usePositionsStore.getState().updatePositionsDelta('c1', [
        makePos({ id: 'c1-NEW', connectionId: 'c1', symbol: 'NEWUSDT', size: 5 }),
      ]);

      expect(usePositionsStore.getState().positions['c1-NEW']?.symbol).toBe('NEWUSDT');
    });

    it('should remove entry when size drops to 0', () => {
      usePositionsStore.setState({
        positions: {
          'c1-BTC': makePos({ id: 'c1-BTC', connectionId: 'c1', size: 1 }),
        },
      });

      usePositionsStore.getState().updatePositionsDelta('c1', [
        { id: 'c1-BTC', size: 0 },
      ]);

      expect(usePositionsStore.getState().positions['c1-BTC']).toBeUndefined();
    });

    it('should skip entries without an id', () => {
      usePositionsStore.getState().updatePositionsDelta('c1', [
        { symbol: 'BTCUSDT' } as Partial<UnifiedPosition>,
      ]);
      expect(Object.keys(usePositionsStore.getState().positions)).toHaveLength(0);
    });
  });

  describe('clearConnectionData', () => {
    it('should remove all positions for a connection', () => {
      usePositionsStore.setState({
        positions: {
          'c1-BTC': makePos({ id: 'c1-BTC', connectionId: 'c1' }),
          'c1-ETH': makePos({ id: 'c1-ETH', connectionId: 'c1' }),
          'c2-BTC': makePos({ id: 'c2-BTC', connectionId: 'c2' }),
        },
      });

      usePositionsStore.getState().clearConnectionData('c1');

      expect(usePositionsStore.getState().positions['c1-BTC']).toBeUndefined();
      expect(usePositionsStore.getState().positions['c1-ETH']).toBeUndefined();
      expect(usePositionsStore.getState().positions['c2-BTC']).toBeDefined();
    });
  });
});
