import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getStorageQuotaEstimate } from '../storageQuota';

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
});
