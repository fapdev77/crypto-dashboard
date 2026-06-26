import { useState, useEffect } from 'react';
import mockBillsData from '../mock/bills.json';
import { useApiKeysStore } from '../store/apiKeysStore';
import { UnifiedBillRecord } from '../types';
import { useSettingsStore } from '../store/settingsStore';
import { BillsHistoryService } from '../services/bills/BillsHistoryService';
export function useBillsHistory(period: '1w' | '2w' | '1m' | 'custom', customStart: string, customEnd: string, triggerSearch: boolean) {
  const keys = useApiKeysStore(state => state.keys);
  const useMockData = useSettingsStore(state => state.useMockData);
  const [bills, setBills] = useState<UnifiedBillRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchBills = async () => {
      let start: number | undefined;
      let end: number | undefined;
      const now = Date.now();

      if (period === 'custom' && customStart && customEnd) {
        start = new Date(customStart).setHours(0, 0, 0, 0);
        end = new Date(customEnd).setHours(23, 59, 59, 999);
      } else if (period === '1w') {
        start = now - 7 * 24 * 60 * 60 * 1000;
        end = now;
      } else if (period === '2w') {
        start = now - 14 * 24 * 60 * 60 * 1000;
        end = now;
      } else if (period === '1m') {
        start = now - 30 * 24 * 60 * 60 * 1000;
        end = now;
      }

      if (useMockData) {
        let sortedBills = [...mockBillsData].sort((a: any, b: any) => b.timestamp - a.timestamp) as UnifiedBillRecord[];
        if (start !== undefined && end !== undefined) {
          sortedBills = sortedBills.filter(b => b.timestamp >= start! && b.timestamp <= end!);
        }
        setBills(sortedBills);
        return;
      }

      const activeKeys = keys.filter(k => k.isActive);
      if (activeKeys.length === 0) {
        setBills([]);
        return;
      }
      setIsLoading(true);

      // LIVE API LOGIC
      const service = new BillsHistoryService();
      let allBills: UnifiedBillRecord[] = [];

      const promises = activeKeys.map(apiKey => {
        return service.fetchBills(apiKey, start, end);
      });
      const results = await Promise.all(promises);
      for (const result of results) {
        allBills = [...allBills, ...result];
      }

      if (start !== undefined && end !== undefined) {
        allBills = allBills.filter(b => b.timestamp >= start! && b.timestamp <= end!);
      }
      allBills.sort((a, b) => b.timestamp - a.timestamp);

      if (isMounted) {
        setBills(allBills);
        setIsLoading(false);
      }
    };

    fetchBills();

    return () => {
      isMounted = false;
    };
  }, [keys, period, customStart, customEnd, triggerSearch, useMockData]);

  return { bills, setBills, isLoading };
}
