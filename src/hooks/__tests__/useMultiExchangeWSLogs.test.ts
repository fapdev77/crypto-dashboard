import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bootload } from '../useMultiExchangeWS';
import { ApiCredentials } from '../../store/apiKeysStore';
import { useLogStore } from '../../store/logStore';
import { ExchangeAggregator } from '../../services/adapters/ExchangeAggregator';

vi.mock('../../services/adapters/ExchangeAggregator', () => ({
  ExchangeAggregator: {
    getAdapter: vi.fn(),
    bootloadConnection: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockKey: ApiCredentials = {
  id: 'key-test-conn',
  label: 'Bybit Mainnet',
  exchange: 'bybit',
  apiKey: 'k',
  apiSecret: 's',
  isActive: true,
};

describe('useMultiExchangeWS - logging standardization', () => {
  let intervals: Record<string, any>;
  let retryAttempts: Record<string, number>;
  let setStatus: any;
  let setError: any;

  beforeEach(() => {
    vi.clearAllMocks();
    useLogStore.setState({ entries: [] });
    intervals = {};
    retryAttempts = {};
    setStatus = vi.fn();
    setError = vi.fn();
  });

  const getLogs = (tag?: string) => {
    const entries = useLogStore.getState().entries;
    return tag ? entries.filter(e => e.source === tag) : entries;
  };

  it('emits standard INFO logs on successful bootload with [Label] prefix', async () => {
    vi.mocked(ExchangeAggregator.bootloadConnection).mockResolvedValue(undefined);
    vi.mocked(ExchangeAggregator.getAdapter).mockReturnValue({
      getBalance: vi.fn().mockResolvedValue([]),
      getOpenPositions: vi.fn().mockResolvedValue([]),
      getOpenOrders: vi.fn().mockResolvedValue([]),
    } as any);

    await bootload(mockKey, intervals, retryAttempts, setStatus, setError);

    const logs = getLogs('Connection.REST');
    const startLog = logs.find(l => l.level === 'INFO' && l.message.includes('Bootloading initial balances'));
    const completeLog = logs.find(l => l.level === 'INFO' && l.message.includes('REST Bootload completed'));

    expect(startLog).toBeDefined();
    expect(startLog!.message).toContain('[Bybit Mainnet]');
    expect(completeLog).toBeDefined();
    expect(completeLog!.message).toContain('[Bybit Mainnet]');
  });

  it('emits standard ERROR log on bootload failure', async () => {
    vi.mocked(ExchangeAggregator.bootloadConnection).mockRejectedValue(new Error('Network timeout'));

    await bootload(mockKey, intervals, retryAttempts, setStatus, setError);

    const errorLogs = getLogs('Connection.REST').filter(l => l.level === 'ERROR');
    expect(errorLogs.length).toBeGreaterThan(0);
    expect(errorLogs[0].message).toContain('[Bybit Mainnet]');
    expect(errorLogs[0].message).toContain('REST Bootload failed');
  });

  it('emits standard ERROR log on authentication failure and halts retries', async () => {
    const authErr = new Error('10003: Invalid api key or bad signature');
    vi.mocked(ExchangeAggregator.bootloadConnection).mockRejectedValue(authErr);

    await bootload(mockKey, intervals, retryAttempts, setStatus, setError);

    const authLogs = getLogs('Connection.REST').filter(
      l => l.level === 'ERROR' && l.message.includes('Authentication failure')
    );
    expect(authLogs.length).toBe(1);
    expect(authLogs[0].message).toContain('[Bybit Mainnet]');
    expect(authLogs[0].message).toContain('Automatic retries aborted');
    expect(retryAttempts['key-test-conn']).toBeUndefined();
  });

  it('emits standard WARN log when max bootload retries is reached', async () => {
    retryAttempts['key-test-conn'] = 5; // Next attempt will be 6 (> 5)
    vi.mocked(ExchangeAggregator.bootloadConnection).mockRejectedValue(new Error('Persistent 500 error'));

    await bootload(mockKey, intervals, retryAttempts, setStatus, setError);

    const warnLogs = getLogs('Connection.REST').filter(
      l => l.level === 'WARN' && l.message.includes('Max bootload retries')
    );
    expect(warnLogs.length).toBe(1);
    expect(warnLogs[0].message).toContain('[Bybit Mainnet]');
    expect(warnLogs[0].message).toContain('Halting automatic retries');
  });
});
