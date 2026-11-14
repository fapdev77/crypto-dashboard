import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  bootload,
  BOOTLOAD_INITIAL_DELAY_MS,
  BOOTLOAD_MAX_RETRIES,
} from '../useMultiExchangeWS';
import { ExchangeAggregator } from '../../services/adapters/ExchangeAggregator';
import { useApiKeysStore, ApiCredentials } from '../../store/apiKeysStore';
import { useConnectionStore } from '../../store/connectionStore';
import { useSettingsStore } from '../../store/settingsStore';

vi.mock('../../services/adapters/ExchangeAggregator');
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useMultiExchangeWS bootload lifecycle and backoff retry', () => {
  const mockConfig: ApiCredentials = {
    id: 'conn-1',
    exchange: 'bybit',
    apiKey: 'test-api-key',
    apiSecret: 'test-secret',
    label: 'Main Bybit',
    isActive: true,
  };

  let intervals: Record<string, NodeJS.Timeout | null>;
  let retryAttempts: Record<string, number>;
  let setStatusSpy: any;
  let setErrorSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    intervals = {};
    retryAttempts = {};
    setStatusSpy = vi.fn();
    setErrorSpy = vi.fn();

    useApiKeysStore.setState({
      keys: [mockConfig],
    });
    useSettingsStore.setState({
      useMockData: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('connects successfully and clears retry attempts', async () => {
    vi.mocked(ExchangeAggregator.bootloadConnection).mockResolvedValue(undefined as any);
    const mockAdapter = {
      getBalance: vi.fn().mockResolvedValue([]),
      getOpenPositions: vi.fn().mockResolvedValue([]),
      getOpenOrders: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(ExchangeAggregator.getAdapter).mockReturnValue(mockAdapter as any);

    retryAttempts['conn-1'] = 2; // Simulate prior failed attempts

    await bootload(mockConfig, intervals, retryAttempts, setStatusSpy, setErrorSpy);

    expect(setStatusSpy).toHaveBeenCalledWith('conn-1', 'connected', null);
    expect(retryAttempts['conn-1']).toBeUndefined();
    expect(intervals['conn-1-poll']).toBeDefined(); // Polling started
  });

  it('aborts retries immediately on authentication failure (fail-fast to prevent IP bans)', async () => {
    const authError = new Error('API key is invalid');
    (authError as any).retCode = 10003;

    vi.mocked(ExchangeAggregator.bootloadConnection).mockRejectedValue(authError);

    await bootload(mockConfig, intervals, retryAttempts, setStatusSpy, setErrorSpy);

    expect(setStatusSpy).toHaveBeenCalledWith(
      'conn-1',
      'error',
      expect.stringContaining('Authentication Error: API key is invalid')
    );
    expect(setErrorSpy).toHaveBeenCalledWith(
      'conn-1',
      expect.stringContaining('Authentication Error: API key is invalid')
    );
    // Crucial: no retry timeout must be scheduled!
    expect(intervals['conn-1-poll']).toBeUndefined();
    expect(retryAttempts['conn-1']).toBeUndefined();
  });

  it('aborts retries immediately on HTTP 401 Unauthorized', async () => {
    const httpAuthError: any = new Error('Request failed with status code 401');
    httpAuthError.status = 401;

    vi.mocked(ExchangeAggregator.bootloadConnection).mockRejectedValue(httpAuthError);

    await bootload(mockConfig, intervals, retryAttempts, setStatusSpy, setErrorSpy);

    expect(setStatusSpy).toHaveBeenCalledWith('conn-1', 'error', expect.stringContaining('Authentication Error'));
    expect(intervals['conn-1-poll']).toBeUndefined();
  });

  it('schedules exponential backoff retry on transient network failures', async () => {
    const networkError = new Error('ETIMEDOUT: Connection timed out');
    vi.mocked(ExchangeAggregator.bootloadConnection).mockRejectedValue(networkError);

    await bootload(mockConfig, intervals, retryAttempts, setStatusSpy, setErrorSpy);

    expect(retryAttempts['conn-1']).toBe(1);
    expect(intervals['conn-1-poll']).toBeDefined();
    expect(setStatusSpy).toHaveBeenCalledWith(
      'conn-1',
      'error',
      expect.stringContaining('Retrying 1/5')
    );
  });

  it('stops scheduling retries after exceeding BOOTLOAD_MAX_RETRIES', async () => {
    const networkError = new Error('502 Bad Gateway');
    (networkError as any).status = 502;
    vi.mocked(ExchangeAggregator.bootloadConnection).mockRejectedValue(networkError);

    retryAttempts['conn-1'] = BOOTLOAD_MAX_RETRIES; // Already at max

    await bootload(mockConfig, intervals, retryAttempts, setStatusSpy, setErrorSpy);

    expect(retryAttempts['conn-1']).toBe(BOOTLOAD_MAX_RETRIES + 1);
    expect(intervals['conn-1-poll']).toBeUndefined(); // No retry scheduled!
    expect(setStatusSpy).toHaveBeenCalledWith(
      'conn-1',
      'error',
      expect.stringContaining(`Connection failed after ${BOOTLOAD_MAX_RETRIES} attempts`)
    );
  });
});
