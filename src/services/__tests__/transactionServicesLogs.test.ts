import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BybitTransactionService } from '../bybit/BybitTransactionService';
import { BitgetTransactionService } from '../bitget/BitgetTransactionService';
import { OkxTransactionService } from '../okx/OkxTransactionService';
import { ApiCredentials } from '../../store/apiKeysStore';
import { useLogStore } from '../../store/logStore';
import * as historyCacheModule from '../historyCache';

vi.mock('../../utils/retryHelper', () => ({
  executeWithRetry: vi.fn().mockImplementation((fn: () => any) => fn()),
}));

vi.mock('../historyCache', () => ({
  getBybitTxLogCache: vi.fn().mockResolvedValue([]),
  getBybitTxLogMeta: vi.fn().mockResolvedValue(null),
  saveBybitTxLogCache: vi.fn().mockResolvedValue(undefined),
  updateBybitTxLogMeta: vi.fn().mockResolvedValue(undefined),
  getBitgetTxLogCache: vi.fn().mockResolvedValue([]),
  getBitgetTxLogMeta: vi.fn().mockResolvedValue(null),
  saveBitgetTxLogCache: vi.fn().mockResolvedValue(undefined),
  updateBitgetTxLogMeta: vi.fn().mockResolvedValue(undefined),
  getOkxTxLogCache: vi.fn().mockResolvedValue([]),
  getOkxTxLogMeta: vi.fn().mockResolvedValue(null),
  saveOkxTxLogCache: vi.fn().mockResolvedValue(undefined),
  updateOkxTxLogMeta: vi.fn().mockResolvedValue(undefined),
}));

const mockBybitKey: ApiCredentials = {
  id: 'bybit-k1',
  label: 'Bybit Prod',
  exchange: 'bybit',
  apiKey: 'k',
  apiSecret: 's',
  isActive: true,
};

const mockBitgetKey: ApiCredentials = {
  id: 'bitget-k1',
  label: 'Bitget UTA Main',
  exchange: 'bitget',
  accountType: 'uta',
  apiKey: 'k',
  apiSecret: 's',
  passphrase: 'p',
  isActive: true,
};

const mockOkxKey: ApiCredentials = {
  id: 'okx-k1',
  label: 'OKX Alpha',
  exchange: 'okx',
  apiKey: 'k',
  apiSecret: 's',
  passphrase: 'p',
  isActive: true,
};

describe('Transaction Services - standardized logging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLogStore.setState({ entries: [] });
  });

  const getLogs = (tag: string = 'Sync.Transactions') => {
    return useLogStore.getState().entries.filter(e => e.source === tag);
  };

  it('Bybit: emits start, chunk warnings and completion with Sync.Transactions tag', async () => {
    const service = new BybitTransactionService();
    // Mock adapter getTransactionLog
    (service as any).adapter = {
      getTransactionLog: vi.fn().mockResolvedValue({ list: [], nextPageCursor: '' }),
    };

    const latest = Date.now() - 1000 * 60; // 1 minute ago
    await service.syncIncremental(mockBybitKey, latest);

    const logs = getLogs();
    const startLog = logs.find(l => l.level === 'INFO' && l.message.includes('Starting incremental transaction sync'));
    const completeLog = logs.find(l => l.level === 'INFO' && l.message.includes('Incremental sync complete'));

    expect(startLog).toBeDefined();
    expect(startLog!.message).toContain('[Bybit Prod]');
    expect(completeLog).toBeDefined();
    expect(completeLog!.message).toContain('[Bybit Prod]');
  });

  it('Bitget: emits start and completion with Sync.Transactions tag', async () => {
    const service = new BitgetTransactionService();
    (service as any).getAdapter = vi.fn().mockReturnValue({
      getTransactionLog: vi.fn().mockResolvedValue({ list: [], nextPageCursor: '' }),
    });

    const latest = Date.now() - 1000 * 60;
    await service.syncIncremental(mockBitgetKey, latest);

    const logs = getLogs();
    const startLog = logs.find(l => l.level === 'INFO' && l.message.includes('Starting incremental transaction sync'));
    const completeLog = logs.find(l => l.level === 'INFO' && l.message.includes('Incremental sync complete'));

    expect(startLog).toBeDefined();
    expect(startLog!.message).toContain('[Bitget UTA Main]');
    expect(completeLog).toBeDefined();
    expect(completeLog!.message).toContain('[Bitget UTA Main]');
  });

  it('OKX: emits start and completion with Sync.Transactions tag', async () => {
    const service = new OkxTransactionService();
    (service as any).adapter = {
      getTransactionLog: vi.fn().mockResolvedValue({ list: [], nextPageCursor: '' }),
    };

    const latest = Date.now() - 1000 * 60;
    await service.syncIncremental(mockOkxKey, latest);

    const logs = getLogs();
    const startLog = logs.find(l => l.level === 'INFO' && l.message.includes('Starting incremental transaction sync'));
    const completeLog = logs.find(l => l.level === 'INFO' && l.message.includes('Incremental sync complete'));

    expect(startLog).toBeDefined();
    expect(startLog!.message).toContain('[OKX Alpha]');
    expect(completeLog).toBeDefined();
    expect(completeLog!.message).toContain('[OKX Alpha]');
  });

  it('Bybit: emits WARN log on chunk failure with [Label] prefix', async () => {
    const service = new BybitTransactionService();
    (service as any).adapter = {
      getTransactionLog: vi.fn().mockRejectedValue(new Error('Rate limit exceeded')),
    };

    const latest = Date.now() - 1000 * 60;
    await expect(service.syncIncremental(mockBybitKey, latest)).rejects.toThrow();

    const warnLogs = getLogs().filter(l => l.level === 'WARN');
    expect(warnLogs.length).toBeGreaterThan(0);
    expect(warnLogs[0].message).toContain('[Bybit Prod]');
    expect(warnLogs[0].message).toContain('Incremental chunk error');
  });
});
