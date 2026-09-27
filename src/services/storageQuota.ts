import { LogManager } from './LogManager';

export interface StorageEstimateResult {
  usageBytes: number;
  quotaBytes: number;
  usageMB: number;
  quotaMB: number;
  percentageUsed: number;
  isWarning: boolean;
  isCritical: boolean;
  isSupported: boolean;
}

/**
 * Queries navigator.storage.estimate() to determine the client's storage quota
 * and current usage. Helps detect storage pressure before writes fail.
 */
export async function getStorageQuotaEstimate(): Promise<StorageEstimateResult> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const usageBytes = estimate.usage || 0;
      const quotaBytes = estimate.quota || 0;
      const usageMB = Number((usageBytes / (1024 * 1024)).toFixed(2));
      const quotaMB = Number((quotaBytes / (1024 * 1024)).toFixed(2));
      const percentageUsed = quotaBytes > 0 ? Number(((usageBytes / quotaBytes) * 100).toFixed(1)) : 0;

      const isWarning = percentageUsed >= 80;
      const isCritical = percentageUsed >= 95;

      if (isCritical) {
        LogManager.error(
          'StorageQuota',
          `Critical storage pressure: ${usageMB}MB of ${quotaMB}MB used (${percentageUsed}%). Writes may fail.`
        );
      } else if (isWarning) {
        LogManager.warn(
          'StorageQuota',
          `High storage usage: ${usageMB}MB of ${quotaMB}MB used (${percentageUsed}%). Consider pruning old data.`
        );
      }

      return {
        usageBytes,
        quotaBytes,
        usageMB,
        quotaMB,
        percentageUsed,
        isWarning,
        isCritical,
        isSupported: true,
      };
    } catch (err: any) {
      LogManager.warn('StorageQuota', 'Failed to retrieve storage estimate:', err?.message || err);
    }
  }

  return {
    usageBytes: 0,
    quotaBytes: 0,
    usageMB: 0,
    quotaMB: 0,
    percentageUsed: 0,
    isWarning: false,
    isCritical: false,
    isSupported: false,
  };
}
