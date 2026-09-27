import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import toast from 'react-hot-toast';
import { getStorageQuotaEstimate, checkAndWarnStorageQuota } from '../storageQuota';

vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), {
    error: vi.fn(),
    success: vi.fn(),
  }),
}));

describe('storageQuota service', () => {
  const originalNavigator = global.navigator;

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
    });
  });

  it('returns supported=false when navigator.storage is unavailable', async () => {
    Object.defineProperty(global, 'navigator', {
      value: {},
      writable: true,
    });

    const res = await getStorageQuotaEstimate();
    expect(res.isSupported).toBe(false);
    expect(res.usageBytes).toBe(0);
  });

  it('correctly calculates MB and percentage when storage estimate is available', async () => {
    const mockEstimate = vi.fn().mockResolvedValue({
      usage: 50 * 1024 * 1024,      // 50 MB
      quota: 1000 * 1024 * 1024,    // 1000 MB
    });

    Object.defineProperty(global, 'navigator', {
      value: {
        storage: {
          estimate: mockEstimate,
        },
      },
      writable: true,
    });

    const res = await getStorageQuotaEstimate();
    expect(res.isSupported).toBe(true);
    expect(res.usageMB).toBe(50);
    expect(res.quotaMB).toBe(1000);
    expect(res.percentageUsed).toBe(5);
    expect(res.isWarning).toBe(false);
    expect(res.isCritical).toBe(false);
  });

  it('flags warning when usage exceeds 80%', async () => {
    const mockEstimate = vi.fn().mockResolvedValue({
      usage: 850 * 1024 * 1024,
      quota: 1000 * 1024 * 1024,
    });

    Object.defineProperty(global, 'navigator', {
      value: {
        storage: {
          estimate: mockEstimate,
        },
      },
      writable: true,
    });

    const res = await getStorageQuotaEstimate();
    expect(res.isWarning).toBe(true);
    expect(res.isCritical).toBe(false);
  });

  describe('checkAndWarnStorageQuota', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('triggers warning toast when storage reaches warning threshold (>= 80%)', async () => {
      const mockEstimate = vi.fn().mockResolvedValue({
        usage: 850 * 1024 * 1024,
        quota: 1000 * 1024 * 1024,
      });

      Object.defineProperty(global, 'navigator', {
        value: { storage: { estimate: mockEstimate } },
        writable: true,
      });

      const res = await checkAndWarnStorageQuota('Test');
      expect(res.isWarning).toBe(true);
      expect(toast).toHaveBeenCalledWith(
        expect.stringContaining('High browser storage usage'),
        expect.objectContaining({ id: 'storage-quota-warning' })
      );
    });

    it('triggers critical error toast when storage reaches critical threshold (>= 95%)', async () => {
      const mockEstimate = vi.fn().mockResolvedValue({
        usage: 960 * 1024 * 1024,
        quota: 1000 * 1024 * 1024,
      });

      Object.defineProperty(global, 'navigator', {
        value: { storage: { estimate: mockEstimate } },
        writable: true,
      });

      const res = await checkAndWarnStorageQuota('Test');
      expect(res.isCritical).toBe(true);
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('Critical browser storage'),
        expect.objectContaining({ id: 'storage-quota-warning' })
      );
    });

    it('does not trigger toast when storage is healthy (< 80%)', async () => {
      const mockEstimate = vi.fn().mockResolvedValue({
        usage: 200 * 1024 * 1024,
        quota: 1000 * 1024 * 1024,
      });

      Object.defineProperty(global, 'navigator', {
        value: { storage: { estimate: mockEstimate } },
        writable: true,
      });

      const res = await checkAndWarnStorageQuota('Test');
      expect(res.isWarning).toBe(false);
      expect(res.isCritical).toBe(false);
      expect(toast).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
    });
  });
});
